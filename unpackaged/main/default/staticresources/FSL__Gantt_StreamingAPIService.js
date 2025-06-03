'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    StreamingAPIService.$inject = ['$q', 'sfdcService', '$interval', 'TimePhasedDataService', 'LastKnownPositionService', 'StateService', 'utils', 'kpiCalculationsService'];

    angular.module('serviceExpert').factory('StreamingAPIService', StreamingAPIService);

    function StreamingAPIService($q, sfdcService, $interval, TimePhasedDataService, LastKnownPositionService, StateService, utils, kpiCalculationsService) {

        var registeredFunctions = {
            services: [],
            absences: [],
            capacities: [],
            positions: [],
            optimizationRequests: [],
            rules: []
        };

        var gotPushNotification = false;

        var deletedAbsencesSet = new Set();
        var updatedAbsencesSet = new Set();
        var deletedGanttServicesSet = new Set();
        var updatedGanttServicesSet = new Set();
        var deletedCapacitiesSet = new Set();
        var updatedCapacitiesSet = new Set();
        var resourcesIdsSet = new Set();
        var updatedAssignResourceSet = new Set();
        var updatedOptimizationRequestSet = new Set();
        var deletedTimeDependencySet = new Set();

        function HandleNotification(message) {

            if (!gotPushNotification) {
                gotPushNotification = true;

                setTimeout(function () {
                    var currentTransactionData = copyNotificationData();
                    resetPushData();
                    HandlePushTopicEvent(currentTransactionData);
                }, 0);
            }

            if (message.channel.indexOf('AbsencesTopic') > -1) {
                try {
                    if (message.data.event.type == 'deleted') {
                        deletedAbsencesSet.add(message.data.sobject.Id);
                        // console.log('Received Absence Delete Notification');
                        // HandleDeleteAbsencesEvent(message);
                    } else {
                        updatedAbsencesSet.add(message.data.sobject.Id);
                        // console.log('Received Absence Create/Update Notification');
                        // HandleCreateUpdateAbsencesEvent(message);
                    }
                    return;
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('ServicesTopic') > -1) {
                try {
                    if (message.data.event.type == 'deleted') {
                        deletedGanttServicesSet.add(message.data.sobject);
                        // console.log('Received Services Delete Notification');
                        // HandleServicesDeleteEvent(message);
                    } else {
                        updatedGanttServicesSet.add(message.data.sobject.Id);
                        // console.log('Received Services Create/Update Notification');
                        // HandleServicesCreateUpdateEvent(message);
                    }
                    return;
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('CapacitiesTopic') > -1) {
                try {
                    if (message.data.event.type == 'deleted') {
                        deletedCapacitiesSet.add(message.data.sobject);
                        // console.log('Received Capacities Delete Notification');
                        // HandleCapacitiesDeleteUpdateEvent(message);
                    } else {
                        updatedCapacitiesSet.add(message.data.sobject.Id);
                        // console.log('Received Capacities Create/Update Notification');
                        // HandleCapacitiesUpdateEvent(message);
                    }
                    return;
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('LivePositionsTopic') > -1) {
                try {
                    resourcesIdsSet.add(message.data.sobject.Id);
                    return;
                    // console.log('Received Live Positions Update Notification');
                    // HandleLivePositionUpdateEvent(message);
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('AssignedResourcesTopic') > -1) {
                try {
                    updatedAssignResourceSet.add(message.data.sobject.Id);
                    return;
                    // console.log('Received Assigned Resource Create/Update Notification');
                    // HandleAssignResourceUpdateEvent(message);
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('OptReqTopic') > -1) {
                try {
                    updatedOptimizationRequestSet.add(message.data.sobject.Id);
                    return;
                    // console.log('Received Opt Req Create/Update Notification');
                    // HandleOptimizationRequestUpdateEvent(message);
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }

            if (message.channel.indexOf('TimeDependencyTopic') > -1) {
                try {

                    if (message.data.event.type == 'deleted') {
                        deletedTimeDependencySet.add(message.data.sobject.Id);
                    } else {
                        updatedGanttServicesSet.add(message.data.sobject[fieldNames.TimeDependency.ServiceAppointment1]);
                        updatedGanttServicesSet.add(message.data.sobject[fieldNames.TimeDependency.ServiceAppointment2]);
                    }

                    return;
                } catch (err) {
                    console.log('Streaming API failure : ' + err);
                }
            }
        }

        function copyNotificationData() {
            var currentTransactionData = {};

            currentTransactionData['deletedAbsencesArray'] = Array.from(deletedAbsencesSet);
            currentTransactionData['updatedAbsencesArray'] = Array.from(updatedAbsencesSet);
            currentTransactionData['deletedGanttServicesArray'] = Array.from(deletedGanttServicesSet);
            currentTransactionData['updatedGanttServicesArray'] = Array.from(updatedGanttServicesSet);
            currentTransactionData['deletedCapacitiesArray'] = Array.from(deletedCapacitiesSet);
            currentTransactionData['updatedCapacitiesArray'] = Array.from(updatedCapacitiesSet);
            currentTransactionData['resourcesIdsArray'] = Array.from(resourcesIdsSet);
            currentTransactionData['updatedAssignResourceArray'] = Array.from(updatedAssignResourceSet);
            currentTransactionData['updatedOptimizationRequestArray'] = Array.from(updatedOptimizationRequestSet);
            currentTransactionData['deletedTimeDependencyArray'] = Array.from(deletedTimeDependencySet);

            return currentTransactionData;
        }

        function HandlePushTopicEvent(currentTransactionData) {

            var promisesFunctionsArray = [];

            if (currentTransactionData['updatedOptimizationRequestArray'].length != 0) {
                promisesFunctionsArray.push(HandleOptimizationRequestUpdateEvent(currentTransactionData['updatedOptimizationRequestArray']));
            }

            if (currentTransactionData['updatedAssignResourceArray'].length != 0) {
                promisesFunctionsArray.push(HandleAssignResourceUpdateEvent(currentTransactionData['updatedAssignResourceArray']));
            }

            if (currentTransactionData['resourcesIdsArray'].length != 0) {
                promisesFunctionsArray.push(HandleLivePositionUpdateEvent(currentTransactionData['resourcesIdsArray']));
            }

            if (currentTransactionData['updatedCapacitiesArray'].length != 0) {
                promisesFunctionsArray.push(HandleCapacitiesUpdateEvent(currentTransactionData['updatedCapacitiesArray']));
            }

            if (currentTransactionData['updatedGanttServicesArray'].length != 0 || currentTransactionData['deletedTimeDependencyArray'].length != 0) {
                promisesFunctionsArray.push(HandleServicesCreateUpdateEvent(currentTransactionData['updatedGanttServicesArray'], currentTransactionData['deletedTimeDependencyArray']));
            }

            if (currentTransactionData['updatedAbsencesArray'].length != 0) {
                promisesFunctionsArray.push(HandleCreateUpdateAbsencesEvent(currentTransactionData['updatedAbsencesArray']));
            }

            if (currentTransactionData['deletedAbsencesArray'].length != 0) {
                promisesFunctionsArray.push(HandleDeleteAbsencesEvent(currentTransactionData['deletedAbsencesArray']));
            }

            if (currentTransactionData['deletedGanttServicesArray'].length != 0) {
                HandleServicesDeleteEvent(currentTransactionData['deletedGanttServicesArray']);
            }

            if (currentTransactionData['deletedCapacitiesArray'].length != 0) {
                HandleCapacitiesDeleteUpdateEvent(currentTransactionData['deletedCapacitiesArray']);
            }

            if (promisesFunctionsArray.length != 0) {
                $q.all(promisesFunctionsArray).then(function (servicesIdsToCheckRulesArray) {
                    servicesIdsToCheckRulesArray.forEach(function (servicesIdsToCheckRules) {
                        HandleServicesToCheckRules(servicesIdsToCheckRules);
                    });
                });
            }
        }

        function resetPushData() {
            gotPushNotification = false;

            deletedAbsencesSet.clear();
            updatedAbsencesSet.clear();
            deletedGanttServicesSet.clear();
            updatedGanttServicesSet.clear();
            deletedCapacitiesSet.clear();
            updatedCapacitiesSet.clear();
            resourcesIdsSet.clear();
            updatedAssignResourceSet.clear();
            updatedOptimizationRequestSet.clear();
            deletedTimeDependencySet.clear();
        }

        function HandleServicesToCheckRules(servicesIdsToCheckRules) {

            // check if we need to check rules 
            if (servicesIdsToCheckRules && servicesIdsToCheckRules.length > 0) {
                registeredFunctions.rules.forEach(function (posFunction) {
                    return posFunction(servicesIdsToCheckRules, window.__gantt.checkRulesAfterDelta);
                });
            }
        }

        function HandleOptimizationRequestUpdateEvent(updatedOptimizationRequestArray) {
            var deferred = $q.defer();

            // var updatedOptimizationRequestArray = [];
            // updatedOptimizationRequestSet.add(message.data.sobject.Id);

            sfdcService.getOptimiztionRequestsUpdate(updatedOptimizationRequestArray).then(function (optimizationRequests) {

                // check if got optimization requests
                if (StateService.isOptimizationEnabled && optimizationRequests && optimizationRequests.length > 0) {
                    registeredFunctions.optimizationRequests.forEach(function (requestFunction) {
                        return requestFunction(optimizationRequests);
                    });
                }

                deferred.resolve();
            });

            return deferred.promise;
        }

        function HandleAssignResourceUpdateEvent(updatedAssignResourceArray) {
            var deferred = $q.defer();
            // var updatedAssignResourceArray = [];
            // updatedAssignResourceSet.add(message.data.sobject.Id);

            sfdcService.getGanttServiceOnAssignedResourceUpdate(updatedAssignResourceArray).then(function (updatedGanttServices) {

                var servicesIdsToCheckRules = [];

                // check if got services
                if (updatedGanttServices && updatedGanttServices.length > 0) {

                    var services = {};

                    if (updatedGanttServices.length > 0) {
                        services.updated = TimePhasedDataService.updateTimePhaseData(updatedGanttServices, 'service').services;
                        servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(utils.getIdsOfSObjects(services.updated))));
                    }

                    // run registered function (only if something was really updated)
                    if (services.updated) {
                        registeredFunctions.services.forEach(function (serviceFunction) {
                            return serviceFunction(services);
                        });
                    }

                    // // check if we need to check rules {
                    // if (servicesIdsToCheckRules.length > 0) {
                    //     registeredFunctions.rules.forEach(posFunction => posFunction(servicesIdsToCheckRules));
                    // }
                }

                deferred.resolve(servicesIdsToCheckRules);
            });

            return deferred.promise;
        }

        function HandleCapacitiesDeleteUpdateEvent(deletedCapacitiesArray) {

            // var deletedCapacities = [];
            // deletedCapacities.add(message.data.sobject);

            if (deletedCapacitiesArray && deletedCapacitiesArray.length > 0) {

                var capacities = {};
                capacities.deleted = TimePhasedDataService.deleteTimePhaseData(deletedCapacitiesArray, 'capacity').capacities;

                // run registered function (only if something was really updated)
                if (capacities.deleted) {
                    registeredFunctions.capacities.forEach(function (capacityFunction) {
                        return capacityFunction(capacities);
                    });
                }
            }
        }

        function HandleCapacitiesUpdateEvent(updatedCapacitiesArray) {
            var deferred = $q.defer();
            // var updatedCapacitiesArray = [];
            // capacitiesIdsSet.add(message.data.sobject.Id);

            sfdcService.getUpdatedResourceCapacities(updatedCapacitiesArray).then(function (updatedCapacities) {

                if (updatedCapacities && updatedCapacities.length > 0) {

                    var capacities = {};

                    capacities.updated = TimePhasedDataService.updateTimePhaseData(updatedCapacities, 'capacity').capacities;

                    // run registered function (only if something was really updated)
                    if (capacities.updated) {
                        registeredFunctions.capacities.forEach(function (capacityFunction) {
                            return capacityFunction(capacities);
                        });
                    }
                }

                deferred.resolve();
            });

            return deferred.promise;
        }

        function HandleLivePositionUpdateEvent(resourcesIdsArray) {
            var deferred = $q.defer();

            sfdcService.getLivePositionsStreaming(resourcesIdsArray).then(function (LivePositionUpdate) {

                var updateRes = LastKnownPositionService.updatePositions(LivePositionUpdate);

                if (updateRes.isUpdated) {
                    registeredFunctions.positions.forEach(function (posFunction) {
                        return posFunction(updateRes.dic);
                    });
                }

                deferred.resolve();
            });

            return deferred.promise;
        }

        function HandleServicesDeleteEvent(deletedGanttServicesArray) {
            var servicesIdsToCheckRules = [];
            // var deletedGanttServices = [];
            // deletedGanttServices.add(message.data.sobject);

            if (deletedGanttServicesArray && deletedGanttServicesArray.length > 0) {

                var services = {};

                services.deleted = TimePhasedDataService.deleteTimePhaseData(deletedGanttServicesArray, 'service').services;
                servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(services.deleted)));

                if (services.deleted) {
                    registeredFunctions.services.forEach(function (serviceFunction) {
                        return serviceFunction(services);
                    });
                }

                // check if we need to check rules {
                if (servicesIdsToCheckRules.length > 0) {
                    registeredFunctions.rules.forEach(function (posFunction) {
                        return posFunction(servicesIdsToCheckRules);
                    });
                }
            }
        }

        function HandleServicesCreateUpdateEvent(updatedGanttServicesArray, deletedTimeDependencyArray) {
            var deferred = $q.defer();
            // var updatedGanttServicesArray = [];
            // updatedGanttServicesSet.add(message.data.sobject.Id);

            sfdcService.getUpdatedServices(updatedGanttServicesArray, deletedTimeDependencyArray).then(function (updatedGanttServices) {

                var servicesIdsToCheckRules = [];

                // check if got services
                if (updatedGanttServices && updatedGanttServices.length > 0) {

                    var services = {};

                    if (updatedGanttServices.length > 0) {
                        services.updated = TimePhasedDataService.updateTimePhaseData(updatedGanttServices, 'service').services;
                        servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(utils.getIdsOfSObjects(services.updated))));
                    }

                    // run registered function (only if something was really updated)
                    if (services.updated) {
                        registeredFunctions.services.forEach(function (serviceFunction) {
                            return serviceFunction(services);
                        });
                    }

                    // // check if we need to check rules {
                    // if (servicesIdsToCheckRules.length > 0) {
                    //     registeredFunctions.rules.forEach(posFunction => posFunction(servicesIdsToCheckRules));
                    // }
                    // Calculate KPIs after the services data has been updated
                    kpiCalculationsService.calculateKpis();
                }

                deferred.resolve(servicesIdsToCheckRules);
            });

            return deferred.promise;
        }

        function HandleCreateUpdateAbsencesEvent(updatedAbsencesArray) {
            var deferred = $q.defer();
            // var absencesUpdateArray = [];
            // absencesUpdateSet.add(message.data.sobject.Id);

            sfdcService.getUpdatedAbsences(updatedAbsencesArray).then(function (updatedAbsence) {

                var servicesIdsToCheckRules = [];
                var absences = {};

                if (updatedAbsence.length > 0) {
                    var absencesUpdateRes = TimePhasedDataService.updateTimePhaseData(updatedAbsence, 'na');
                    absences.updated = absencesUpdateRes.absences;
                    absences.deleted = absencesUpdateRes.notApprovedAbsencesIds;

                    var resourceIds = absences.updated.map(function (v) {
                        return v.resource;
                    }).join(',');
                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(utils.getIdsOfSObjects(absences.updated), resourceIds)));
                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(absences.deleted)));

                    // run registered function (only if something was really updated)
                    if (absences.updated || absences.deleted) {
                        registeredFunctions.absences.forEach(function (absenceFunction) {
                            return absenceFunction(absences);
                        });
                    }

                    // // check if we need to check rules {
                    // if (servicesIdsToCheckRules.length > 0) {
                    //     registeredFunctions.rules.forEach(posFunction => posFunction(servicesIdsToCheckRules));
                    // }
                }

                deferred.resolve(servicesIdsToCheckRules);
            });

            return deferred.promise;
        }

        function HandleDeleteAbsencesEvent(deletedAbsencesArray) {
            var deferred = $q.defer();
            // var absencesDeleteArray = [];
            // absencesDeleteSet.add(message.data.sobject.Id);

            sfdcService.getDeletedAbsences(deletedAbsencesArray).then(function (deletedAbsences) {

                var servicesIdsToCheckRules = [];
                var absences = {};

                if (deletedAbsences.length > 0) {
                    absences.deleted = TimePhasedDataService.deleteTimePhaseData(deletedAbsences, 'na').absences;
                    servicesIdsToCheckRules.push.apply(servicesIdsToCheckRules, _toConsumableArray(utils.getRelatedServices(absences.deleted)));

                    // run registered function (only if something was really updated)
                    if (absences.updated || absences.deleted) {
                        registeredFunctions.absences.forEach(function (absenceFunction) {
                            return absenceFunction(absences);
                        });
                    }

                    // // check if we need to check rules {
                    // if (servicesIdsToCheckRules.length > 0) {
                    //     registeredFunctions.rules.forEach(posFunction => posFunction(servicesIdsToCheckRules));
                    // }
                }

                deferred.resolve(servicesIdsToCheckRules);
            });

            return deferred.promise;
        }

        // register for updates  |  TYPES: absences, services, capacities
        function register(type, callback) {
            return registeredFunctions[type] && registeredFunctions[type].push(callback);
        }

        function unRegister(type, callback) {
            registeredFunctions[type].splice(registeredFunctions[type].indexOf(callback), 1);
        }

        return {
            HandleNotification: HandleNotification,
            register: register,
            unRegister: unRegister
        };
    }
})();