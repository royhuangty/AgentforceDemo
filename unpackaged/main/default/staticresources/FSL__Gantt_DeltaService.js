'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    DeltaService.$inject = ['$q', 'sfdcService', '$interval', 'TimePhasedDataService', 'LastKnownPositionService', 'StateService', 'utils', 'MstResolver', '$timeout', 'kpiCalculationsService', 'PushServices'];

    angular.module('serviceExpert').factory('DeltaService', DeltaService);

    function DeltaService($q, sfdcService, $interval, TimePhasedDataService, LastKnownPositionService, StateService, utils, MstResolver, $timeout, kpiCalculationsService, PushServices) {

        var lastModifiedDate = null,
            deltaIntervalRateInSeconds = deltaInterval || 10,
            deltaTimeoudPromise = null,
            registeredFunctions = {
            services: [],
            absences: [],
            capacities: [],
            positions: [],
            optimizationRequests: [],
            rules: []
        };

        /* This is the for expilict delta calls we do from various places in FSL. 
         * when the delta returns, there is no need to start a new timeout.
         */
        function getDelta() {
            var shouldCheckRules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;


            if (StateService.getStreamingActiveState() === false && !PushServices.isPushServiceActive()) {

                var deltaDates = StateService.getDeltaDates();

                sfdcService.getDelta(lastModifiedDate, deltaDates.minDate, deltaDates.maxDate).then(function (result) {
                    handleDeltaResponse(result, shouldCheckRules);
                }).catch(function (ex) {
                    console.warn(ex);
                });
            }
        }

        function updateGantt() {
            // run only if streaming is disabled
            if (!StateService.getStreamingActiveState() && !PushServices.isPushServiceActive()) {
                // check rules if not "on demand" mode
                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                getDelta(shouldCheckRules);
            }
        }

        /* same as getDelta but return a promis */
        function getDeltaPromise() {
            var shouldCheckRules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;


            var deffered = $q.defer();

            if (StateService.getStreamingActiveState() === false && !PushServices.isPushServiceActive()) {

                var deltaDates = StateService.getDeltaDates();

                sfdcService.getDelta(lastModifiedDate, deltaDates.minDate, deltaDates.maxDate).then(function (deltaResult) {
                    handleDeltaResponse(deltaResult, shouldCheckRules);
                    deffered.resolve(deltaResult);
                }).catch(function (ex) {
                    console.warn(ex);
                    deffered.reject(res.ex);
                });
            } else {
                deffered.resolve();
            }

            return deffered.promise;
        }

        // This is the running delta call every X seconds. 
        // when the delta returns, we need to start a new timeout        
        function getRunningDelta() {
            var runCheckRules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

            var deltaStart = new Date();

            if (StateService.getStreamingActiveState() === false && !PushServices.isPushServiceActive()) {

                var deltaDates = StateService.getDeltaDates();

                // we are adding the margins in the apex class
                // console.log('(debug only - remove before V7) Get delta between: ' + moment(deltaDates.minDate).add(-deltaBackDaysMargin, 'days').format('L') + ' and ' + moment(deltaDates.maxDate).add(deltaForwardDaysMargin, 'days').format('L'));

                sfdcService.getDelta(lastModifiedDate, deltaDates.minDate, deltaDates.maxDate).then(function (deltaResult) {

                    //get ready to call next delta
                    var deltaDiff = deltaIntervalRateInSeconds * 1000 - getElapsedDeltaTime(deltaStart);
                    deltaTimeoudPromise = $timeout(timeoutDeltaFunction, deltaDiff < 0 ? 0 : deltaDiff);

                    handleDeltaResponse(deltaResult, runCheckRules);
                }).catch(function (ex) {
                    utils.addNotification(customLabels.DeltaFailureTitle, customLabels.DeltaFailureMessage, null, null);
                    console.warn(ex);
                });
            }

            //streaming is on but need to turn on delta interval so it falls back to delta in case streaming fails
            else {
                    deltaTimeoudPromise = $timeout(timeoutDeltaFunction, deltaIntervalRateInSeconds * 1000);
                }
        }

        function getElapsedDeltaTime(deltaStart) {
            return new Date() - deltaStart; //in ms
        }

        // - ori-4/10/18 change from interval to timeout to prevent long delta calls which can cause a delta queue and lead to slow UI.
        //  22/12/20 - run delta only if setting allows it
        //window.__gantt.checkRulesAfterDelta && $timeout(getRunningDelta, deltaIntervalRateInSeconds * 1000);
        deltaTimeoudPromise = $timeout(timeoutDeltaFunction, deltaIntervalRateInSeconds * 1000);

        function timeoutDeltaFunction() {

            // run only if the session is active
            if (!StateService.isUserIdle()) {
                getRunningDelta(window.__gantt.checkRulesAfterDelta);
            }
        }

        function updateOptimizationRequest(req) {
            registeredFunctions.optimizationRequests.forEach(function (requestFunction) {
                return requestFunction([req]);
            });
        }

        // register for updates  |  TYPES: absences, services, capacities
        function register(type, callback) {
            return registeredFunctions[type] && registeredFunctions[type].push(callback);
        }

        function unRegister(type, callback) {
            registeredFunctions[type].splice(registeredFunctions[type].indexOf(callback), 1);
        }

        function handleDeltaResponse(delta) {
            var shouldCheckRules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;


            lastModifiedDate = delta.updateTime;

            var servicesIdsToCheckRules = [];

            // check if got absences
            if (delta.deletedAbsence && delta.deletedAbsence.length > 0 || delta.updatedAbsence && delta.updatedAbsence.length > 0) {

                var absences = {};

                // W-14202782 we want to check rules only for services that the absence might have affected them (only if absence schedule was changed)

                var scheduleChangedResourceAbsences = {};

                // filter out absences without a record type
                delta.updatedAbsence = delta.updatedAbsence.filter(function (absence) {
                    return absence.RecordType;
                });

                if (delta.updatedAbsence.length > 0) {

                    delta.updatedAbsence.forEach(function (updatedAbsence) {

                        // Only NA
                        if (updatedAbsence.RecordType && updatedAbsence.RecordType.DeveloperName === 'Non_Availability') {

                            var existingAbsence = TimePhasedDataService.resourceAbsences()[updatedAbsence.Id];

                            // NA wasn't loaded to the gantt or scheduling changed
                            if (!existingAbsence || existingAbsence.wasSchedulingChanged(updatedAbsence)) {
                                scheduleChangedResourceAbsences[updatedAbsence.Id] = true;
                            }
                        }
                    });

                    var absencesUpdateRes = TimePhasedDataService.updateTimePhaseData(delta.updatedAbsence, 'na');

                    absences.updated = absencesUpdateRes.absences;
                    absences.deleted = absencesUpdateRes.notApprovedAbsencesIds;

                    if (Object.keys(scheduleChangedResourceAbsences).length > 0) {

                        var resourceIds = [];

                        absences.updated.forEach(function (absence) {
                            if (scheduleChangedResourceAbsences[absence.id]) {
                                resourceIds.push(absence.resource);
                            }
                        });

                        resourceIds.join(',');
                        servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(Object.keys(scheduleChangedResourceAbsences), resourceIds)));
                    }
                }

                if (delta.deletedAbsence.length > 0) {
                    if (absences.deleted) {
                        absences.deleted = absences.deleted.concat(TimePhasedDataService.deleteTimePhaseData(delta.deletedAbsence, 'na').absences);
                    } else {
                        absences.deleted = TimePhasedDataService.deleteTimePhaseData(delta.deletedAbsence, 'na').absences;
                    }

                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(absences.deleted)));
                }

                // run registered function (only if something was really updated)
                if (absences.updated || absences.deleted) {
                    registeredFunctions.absences.forEach(function (absenceFunction) {
                        return absenceFunction(absences);
                    });
                }
            }

            // check if got services
            if (delta.updatedGanttServices && delta.updatedGanttServices.length > 0 || delta.deletedGanttServices && delta.deletedGanttServices.length > 0) {

                var services = {};

                if (delta.deletedGanttServices.length > 0) {
                    services.deleted = TimePhasedDataService.deleteTimePhaseData(delta.deletedGanttServices, 'service').services;
                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(services.deleted)));
                }

                if (delta.updatedGanttServices.length > 0) {

                    // W-14202782 we want to check rules only for services that their scheduling was changed

                    var serviceIdsWithChangedSchedule = [];

                    delta.updatedGanttServices.forEach(function (updatedService) {

                        var existingGanttService = TimePhasedDataService.serviceAppointments()[updatedService.Id];

                        // service wasn't loaded or scheduling changed
                        if (!existingGanttService || existingGanttService.wasSchedulingChanged(updatedService)) {
                            serviceIdsWithChangedSchedule.push(updatedService.Id);
                        }
                    });

                    // update in timephased service
                    services.updated = TimePhasedDataService.updateTimePhaseData(delta.updatedGanttServices, 'service').services;

                    // check rules if we got scheduling changes
                    if (serviceIdsWithChangedSchedule.length > 0) {

                        // remove duplicates
                        var serviceIdsWithChangedScheduleSet = new Set(utils.getRelatedServices(serviceIdsWithChangedSchedule));
                        serviceIdsWithChangedSchedule = Array.from(serviceIdsWithChangedScheduleSet);

                        servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(serviceIdsWithChangedSchedule));
                    }
                }

                // run registered function (only if something was really updated)
                if (services.updated || services.deleted) {
                    registeredFunctions.services.forEach(function (serviceFunction) {
                        return serviceFunction(services);
                    });
                }

                kpiCalculationsService.calculateKpis();
            }

            // check for live position
            if (delta.updatedLivePositions) {

                var updateRes = LastKnownPositionService.updatePositions(delta.updatedLivePositions);

                if (updateRes.isUpdated) {
                    registeredFunctions.positions.forEach(function (posFunction) {
                        return posFunction(updateRes.dic);
                    });
                }
            }

            // check if we need to check rules {
            if (servicesIdsToCheckRules.length > 0) {

                var servicesIdsToCheckRulesWithNoDuplicates = Array.from(new Set(servicesIdsToCheckRules));
                registeredFunctions.rules.forEach(function (posFunction) {
                    return posFunction(servicesIdsToCheckRulesWithNoDuplicates, shouldCheckRules);
                });
            }

            // check if got capacities
            if (StateService.areContractorsSupported) {
                if (delta.deletedCapacities && delta.deletedCapacities.length > 0 || delta.updatedCapacities && delta.updatedCapacities.length > 0) {

                    var capacities = {};

                    if (delta.deletedCapacities.length > 0) {
                        capacities.deleted = TimePhasedDataService.deleteTimePhaseData(delta.deletedCapacities, 'capacity').capacities;
                    }

                    if (delta.updatedCapacities.length > 0) {
                        capacities.updated = TimePhasedDataService.updateTimePhaseData(delta.updatedCapacities, 'capacity').capacities;
                    }

                    // run registered function (only if something was really updated)
                    if (capacities.updated || capacities.deleted) {
                        registeredFunctions.capacities.forEach(function (capacityFunction) {
                            return capacityFunction(capacities);
                        });
                    }
                }
            }

            // check if got optimization requests
            if (StateService.isOptimizationEnabled && delta.optimizationRequests && delta.optimizationRequests.length > 0) {
                registeredFunctions.optimizationRequests.forEach(function (requestFunction) {
                    return requestFunction(delta.optimizationRequests);
                });
            }
        }

        // monitor user activity and increase delta frequency if not active
        (function setDeltaFrequency() {

            // no need to this mechanism 
            if (StateService.getStreamingActiveState()) {
                console.log('using streaming');
                return;
            }
            if (PushServices.isPushServiceActive()) {
                console.log('using push service');
                return;
            }

            var totalIdleTime = 0;

            document.addEventListener('mousemove', function () {

                // reset interval
                deltaIntervalRateInSeconds = deltaInterval || 10;

                // user is back from being idle, need to run the delta with the new interval (and not wait another minute)
                if (totalIdleTime > 300 && deltaInterval < 60 && !StateService.isUserIdle()) {
                    $timeout.cancel(deltaTimeoudPromise);
                    deltaTimeoudPromise = $timeout(timeoutDeltaFunction, deltaIntervalRateInSeconds * 1000);
                    console.warn('Delta interval back to normal.');
                }

                totalIdleTime = 0;
            });

            if (window.Worker) {

                var inactivityMonitorWorker = new Worker(window.__gantt.InactivityMonitorWorker);

                // handle message from the worker
                inactivityMonitorWorker.onmessage = function (e) {

                    totalIdleTime += 10;

                    // 5 minutes of idle -> set delta to 1 minutes (unless it's already bigger)
                    if (totalIdleTime >= 300 && deltaInterval < 60 && deltaIntervalRateInSeconds < 60) {
                        deltaIntervalRateInSeconds = 60;
                        console.warn('Delta interval decreased.');
                    }

                    if (StateService.isUserIdle()) {
                        inactivityMonitorWorker.terminate();
                    }
                };
            }

            // run every 60 seconds
            var increateDeltaInterval = setInterval(function () {

                // 5 minutes of idle -> set delta to 1 minutes (unless it's already bigger)
                if (totalIdleTime >= 300 && deltaInterval < 60 && deltaIntervalRateInSeconds !== 60) {
                    deltaIntervalRateInSeconds = 60;
                    console.warn('Delta interval decreased.');
                }

                // no need to run anymore, need to refresh page
                if (totalIdleTime >= window.__gantt.maxSecondsOfInactivity) {
                    clearInterval(increateDeltaInterval);
                }
            }, 30010);
        })();

        // This will be our factory
        return {
            register: register,
            unRegister: unRegister,
            getDelta: getDelta,
            getDeltaPromise: getDeltaPromise,
            updateOptimizationRequest: updateOptimizationRequest,
            handleDeltaResponse: handleDeltaResponse,
            updateGantt: updateGantt
        };
    }
})();