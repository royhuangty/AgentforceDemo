'use strict';

(function () {

    angular.module('serviceExpert').factory('sfdcService', ['$q', '$rootScope', 'userSettingsManager', '$injector', function ($q, $rootScope, userSettingsManager, $injector) {

        var sfdc = {
            servicesArray: [],
            servicesObjs: {},
            activeRequests: { active: 0 },
            activeRuleCheckRequests: { active: 0 },
            serviceChangesQueue: [],
            resourceOperationsCounter: {}
        };

        window.__isCheckingRules = function () {
            return !!sfdc.activeRuleCheckRequests.active;
        };
        // W-12578949
        window.Visualforce.remoting.timeout = 120000;

        // these are remote action that requires the escape to be true
        var remoteActionsWithTrueEscape = {};
        // remoteActionsWithTrueEscape[RemoteActions.getGanttFilters] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getStatuses] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getStatusTranslations] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getCustomizationFiles] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getPolygons] = true;
        // remoteActionsWithTrueEscape[RemoteActions.savePolygon] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getCustomActions] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getGanttPalettes] = true;
        // remoteActionsWithTrueEscape[RemoteActions.getFilterById] = true;


        var remoteActionsWithFalseBuffer = {};
        remoteActionsWithFalseBuffer[RemoteActions.GetTimePhasedObjects] = true;
        remoteActionsWithFalseBuffer[RemoteActions.GetResourcesAndTerritories] = true;
        remoteActionsWithFalseBuffer[RemoteActions.getDelta] = true;
        remoteActionsWithFalseBuffer[RemoteActions.getReportsWithGeolocationCols] = true;
        remoteActionsWithFalseBuffer[RemoteActions.collectMetricsForSplunk] = true;
        remoteActionsWithFalseBuffer[RemoteActions.collectViewsForSplunk] = true;
        remoteActionsWithFalseBuffer[RemoteActions.getOptimizationRequests] = true;

        sfdc.callRemoteAction = function callRemoteAction(remoteActionName) {
            for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                params[_key - 1] = arguments[_key];
            }

            var isDelta = remoteActionName === RemoteActions.getDelta,
                escape = remoteActionName in remoteActionsWithTrueEscape,
                buffer = !(remoteActionName in remoteActionsWithFalseBuffer),
                deferred = $q.defer(),
                remoteActionsParams = [remoteActionName].concat(params).concat(function (data, ev) {
                !isDelta && sfdc.activeRequests.active--;
                ev.status ? deferred.resolve(data) : deferred.reject(ev);
            }).concat({ buffer: buffer, escape: escape, timeout: 120000 });

            var remoteActionsParamsNew = remoteActionsParams.map(function (v) {
                return v === undefined ? null : v;
            });

            !isDelta && sfdc.activeRequests.active++;
            window.Visualforce.remoting.Manager.invokeAction.apply(window.Visualforce.remoting.Manager, remoteActionsParamsNew);

            return deferred.promise;
        };

        // check rule violations
        sfdc.checkRules = function (servicesIds, policyId) {

            var deferred = $q.defer();

            sfdc.activeRuleCheckRequests.active++;

            if (!$rootScope.policy) {
                $rootScope.policy = null;
            }

            if (!policyId) {
                policyId = $rootScope.policy;
            }

            window.Visualforce.remoting.Manager.invokeAction(RemoteActions.checkRules, servicesIds, policyId, function (violations, ev) {

                sfdc.activeRuleCheckRequests.active--;
                ev.status ? deferred.resolve(violations) : deferred.reject(ev);
            }, { buffer: false, escape: false, timeout: 120000 });

            return deferred.promise;
        };

        sfdc.getOptimiztionRequestsUpdate = function (updatedOptimiztionRequestsIds) {
            return sfdc.callRemoteAction(RemoteActions.getOptimiztionRequestsUpdate, updatedOptimiztionRequestsIds, getFilteredLocations());
        };

        sfdc.getGanttServiceOnAssignedResourceUpdate = function (updatedAssignedResourceIds) {
            return sfdc.callRemoteAction(RemoteActions.getGanttServiceOnAssignedResourceUpdate, updatedAssignedResourceIds, getFilteredLocations());
        };

        sfdc.getUpdatedAbsences = function (updatedAbsencesIds) {
            return sfdc.callRemoteAction(RemoteActions.getUpdatedAbsences, updatedAbsencesIds, getFilteredLocations());
        };

        sfdc.getDeletedAbsences = function (deletedAbsencesIds) {
            return sfdc.callRemoteAction(RemoteActions.getDeletedAbsences, deletedAbsencesIds, getFilteredLocations());
        };

        sfdc.getUpdatedServices = function (updatedServicesIds, deletedTimeDependencyIds) {
            return sfdc.callRemoteAction(RemoteActions.getUpdatedServices, updatedServicesIds, deletedTimeDependencyIds, getFilteredLocations());
        };

        sfdc.getUpdatedResourceCapacities = function (capacitiesIds) {
            return sfdc.callRemoteAction(RemoteActions.getUpdatedResourceCapacities, capacitiesIds, getFilteredLocations());
        };

        sfdc.getLivePositionsStreaming = function (resourcesIds) {
            return sfdc.callRemoteAction(RemoteActions.getLivePositionsStreaming, resourcesIds, getFilteredLocations());
        };

        sfdc.getLivePositions = function () {
            return sfdc.callRemoteAction(RemoteActions.getLivePositions, getFilteredLocations());
        };

        sfdc.getDelta = function (lastModifiedDate, minDate, maxDate) {
            if ($rootScope.isOptimizationViewer) {
                var deffered = $q.defer();
                deffered.resolve({
                    updateTime: new Date().getTime() - 15000,
                    oldTime: null,
                    updatedAbsence: [],
                    deletedAbsence: [],
                    updatedCapacities: [],
                    deletedCapacities: [],
                    updatedGanttServices: [],
                    deletedGanttServices: [],
                    updatedLivePositions: [],
                    optimizationRequests: []
                });
                return deffered.promise;
            } else return sfdc.callRemoteAction(RemoteActions.getDelta, lastModifiedDate, getFilteredLocations(), minDate, maxDate);
        };

        function getFilteredLocations() {
            return userSettingsManager.GetUserSettingsProperty('locations') || [];
        }

        function getOrphanServices() {
            return JSON.parse(userSettingsManager.GetUserSettingsProperty('Show_Orphan_Services__c'));
        }

        sfdc.getSlots = function (serviceId, policyId) {

            var deferred = $q.defer();
            sfdc.activeRequests.active += 1;

            Visualforce.remoting.Manager.invokeAction(RemoteActions.getSlots, serviceId, policyId, function (slots, event) {

                var result = {};
                result.value = slots;
                result.eventType = event.type;

                if (event.type === 'exception') {
                    result.event = event;
                    deferred.resolve(result);
                    sfdc.activeRequests.active -= 1;
                }

                if (event.status) {
                    deferred.resolve(result);
                    sfdc.activeRequests.active -= 1;
                } else {
                    deferred.reject(event);
                    sfdc.activeRequests.active -= 1;
                }
            }, { buffer: true, escape: true, timeout: 120000 });

            return deferred.promise;
        };

        sfdc.getPolygons = function () {
            return sfdc.callRemoteAction(RemoteActions.getPolygons, getFilteredLocations());
        };

        sfdc.autoScheduleService = function (serviceId, policyId) {
            return sfdc.callRemoteAction(RemoteActions.autoScheduleService, serviceId, policyId, getFilteredLocations());
        };

        sfdc.unscheduleServicesByServicesId = function (ids, schedulingPolicyId) {
            schedulingPolicyId = schedulingPolicyId || userSettingsManager.GetUserSettingsProperty('Gantt_Policy__c');
            return sfdc.callRemoteAction(RemoteActions.unscheduleServicesByServicesId, ids, schedulingPolicyId, false);
        };

        sfdc.unscheduleServicesByLocationsId = function (ids, schedulingPolicyId, start, finish) {
            schedulingPolicyId = schedulingPolicyId || userSettingsManager.GetUserSettingsProperty('Gantt_Policy__c');
            return sfdc.callRemoteAction(RemoteActions.unscheduleServicesByLocationsId, ids, schedulingPolicyId, start, finish);
        };

        sfdc.GetResourcesAndTerritories = function (territoriesIds) {
            return sfdc.callRemoteAction(RemoteActions.GetResourcesAndTerritories, territoriesIds || getFilteredLocations(), true, false);
        };

        sfdc.GetTimePhasedObjects = function (startDateStr, finishDateStr) {
            var onlyServices = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            var onlyAbsences = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
            var serviceOffset = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
            var absenceOffset = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
            var shiftOffset = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
            var minimumServiceDuration = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : null;
            var minimumAbsenceDuration = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : null;
            var showOnlyMDT = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : false;

            if ($rootScope.isOptimizationViewer) {
                var deffered = $q.defer();
                deffered.resolve({
                    services: [],
                    resourceAbsences: [],
                    resourceCapacities: [],
                    serviceCrewMembers: [],
                    shifts: [],
                    holidays: [],
                    resourcesAndTerritories: []
                });
                return deffered.promise;
            } else return sfdc.callRemoteAction(RemoteActions.GetTimePhasedObjects, startDateStr, finishDateStr, getFilteredLocations(), onlyServices, onlyAbsences, serviceOffset, absenceOffset, shiftOffset, maxServicesToLoadEachBulkInGantt, maxAbsencesToLoadEachBulkInGantt, maxShiftsToLoadEachBulkInGantt, minimumServiceDuration, minimumAbsenceDuration, showOnlyMDT);
        };

        sfdc.loadServicesInBulk = function (end, numOfDays, toLoad, inRange, offsetId, selectedFilter, isCustomFilter) {
            if ($rootScope.isOptimizationViewer) {
                var deffered = $q.defer();
                deffered.resolve({
                    ganttServiceAppointments: [],
                    stms: [],
                    remainingCount: 0
                });
                return deffered.promise;
            } else return sfdc.callRemoteAction(RemoteActions.loadServicesInBulk, end, getFilteredLocations(), getOrphanServices(), numOfDays, toLoad, inRange, offsetId, selectedFilter, isCustomFilter);
        };

        sfdc.saveChangesToAbsence = function (id, resourceId, schedulingPolicyId, startDateStr, finishDateStr, type) {
            var label = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
            var snapToId = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : null;
            var snapToType = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : null;
            var snapDirection = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : null;

            return sfdc.callRemoteAction(RemoteActions.saveChangesToAbsence, id, resourceId, schedulingPolicyId, startDateStr, finishDateStr, type, label, snapToId, snapToType, snapDirection, getFilteredLocations());
        };

        sfdc.saveChangesToServiceAppointment = function (serviceAppointmentId, newResourceId, currentResourceId, currentAssignedResourceId, strStartDate, strFinishDate, usedPolicyId, scheduleMode, snapToId, snapToType, snapDirection, calcTravelToLatitude, calcTravelToLongitude) {
            var isFirstServiceOfConsecutive = arguments.length > 13 && arguments[13] !== undefined ? arguments[13] : false;
            var isResizingService = arguments.length > 14 && arguments[14] !== undefined ? arguments[14] : false;


            // init counters - newly assigned resource
            sfdc.resourceOperationsCounter[newResourceId] = sfdc.resourceOperationsCounter[newResourceId] || 0;

            // service is scheduled?
            if (currentResourceId) {
                sfdc.resourceOperationsCounter[currentResourceId] = sfdc.resourceOperationsCounter[currentResourceId] || 0;
            }

            var userDeferred = $q.defer(),
                remoteDeffered = $q.defer();

            // there is NO operation running for for NEW resource
            if (!sfdc.resourceOperationsCounter[newResourceId]) {

                // if service is SCHEDULED and there is NO operation for the CURRENTLY assigned resource
                if (currentResourceId && !sfdc.resourceOperationsCounter[currentResourceId]) {
                    sfdc.resourceOperationsCounter[newResourceId]++;
                    sfdc.resourceOperationsCounter[currentResourceId]++;
                    remoteDeffered.resolve();
                }

                // W-11539088 - if service is SCHEDULED and there IS operation for the CURRENTLY assigned resource
                else if (currentResourceId && sfdc.resourceOperationsCounter[currentResourceId]) {

                        // add to queue, run later
                        sfdc.serviceChangesQueue.push({
                            deferred: remoteDeffered,
                            srcResource: currentResourceId,
                            destResource: newResourceId,
                            valid: true
                        });
                    }

                    // service is NOT scheduled
                    else if (!currentResourceId) {
                            sfdc.resourceOperationsCounter[newResourceId]++;
                            remoteDeffered.resolve();
                        }
            }

            // there IS operation for the newly assigned resource, don't run just yet
            else {

                    // add to queue, run later
                    sfdc.serviceChangesQueue.push({
                        deferred: remoteDeffered,
                        srcResource: currentResourceId,
                        destResource: newResourceId,
                        valid: true
                    });
                }

            var TimePhasedDataService = $injector.get('TimePhasedDataService'),
                changedService = TimePhasedDataService.serviceAppointments()[serviceAppointmentId],
                fromGetCandidateFlow = false;

            if (changedService) {
                fromGetCandidateFlow = !!changedService.fromGetCandidateFlow;
            }

            // let fromGetCandidateFlow = !!scheduler._events[serviceAppointmentId] && !!scheduler._events[serviceAppointmentId].fromGetCandidateFlow;

            remoteDeffered.promise.then(function () {

                sfdc.activeRequests.active++;

                Visualforce.remoting.Manager.invokeAction(RemoteActions.saveChangesToServiceAppointment, serviceAppointmentId, newResourceId, currentAssignedResourceId, strStartDate, strFinishDate, usedPolicyId, scheduleMode, snapToId, snapToType, snapDirection, calcTravelToLatitude, calcTravelToLongitude, getFilteredLocations(), isFirstServiceOfConsecutive, fromGetCandidateFlow, isResizingService, function (result, ev) {

                    sfdc.activeRequests.active--;
                    currentResourceId && sfdc.resourceOperationsCounter[currentResourceId]--;
                    sfdc.resourceOperationsCounter[newResourceId]--;

                    // run next operation
                    activateServiceChangesPromise();

                    if (ev.status) {
                        userDeferred.resolve(result);
                    } else {
                        userDeferred.reject(ev);
                    }
                }, { buffer: false, escape: false, timeout: 120000 });
            });

            return userDeferred.promise;
        };

        function activateServiceChangesPromise() {

            sfdc.serviceChangesQueue.forEach(function (operation) {

                if (operation.valid && !sfdc.resourceOperationsCounter[operation.destResource] && (operation.srcResource && !sfdc.resourceOperationsCounter[operation.srcResource] || !operation.srcResource)) {
                    sfdc.resourceOperationsCounter[operation.srcResource]++;
                    sfdc.resourceOperationsCounter[operation.destResource]++;
                    operation.valid = false;
                    operation.deferred.resolve();
                }
            });
        }

        // dispatch by service id
        sfdc.changeStatusServicesByServicesId = function (ids, status) {
            return sfdc.callRemoteAction(RemoteActions.changeStatusServicesByServicesId, ids, status, false);
        };

        // dispatch by location id
        sfdc.changeStatusServicesByLocationsId = function (ids, status, start, finish) {
            return sfdc.callRemoteAction(RemoteActions.changeStatusServicesByLocationsId, ids, status, start, finish);
        };

        sfdc.getOptimizationRequests = function () {
            return sfdc.callRemoteAction(RemoteActions.getOptimizationRequests, getFilteredLocations(), getOrphanServices());
        };

        sfdc.runFillInSchedule = function (start, resourceId, policyId) {
            return sfdc.callRemoteAction(RemoteActions.runFillInSchedule, start, resourceId, policyId);
        };

        sfdc.runFixOverlaps = function (start, resourceId, policyId) {
            return sfdc.callRemoteAction(RemoteActions.runFixOverlaps, start, resourceId, policyId);
        };

        sfdc.getFslOperation = function (id) {
            return sfdc.callRemoteAction(RemoteActions.getFslOperation, id, resourceId, policyId);
        };

        sfdc.isOptimizationViewer = function () {
            return $rootScope.isOptimizationViewer;
        };

        return sfdc;
    }]);
})();