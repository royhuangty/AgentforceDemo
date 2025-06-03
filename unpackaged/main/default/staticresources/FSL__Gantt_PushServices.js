'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    PushServices.$inject = ['$q', 'sfdcService', '$injector', 'StateService', '$rootScope', 'FieldSetFieldsService', 'userSettingsManager'];

    angular.module('serviceExpert').factory('PushServices', PushServices);

    function PushServices($q, sfdcService, $injector, StateService, $rootScope, FieldSetFieldsService, userSettingsManager) {
        var _updatedObjects;

        var MESSAGE_OPERATIONS = { RESET: 'RESET', UPDATE: 'UPDATE' };
        var CONNECTION_TYPE = { CREATE: '1', UPDATE: '2' };
        var BULK_SIZE = window.__gantt.pushService.bulkSizeOfServicesToUpdate;

        var socket = void 0,
            territories = void 0,
            webSocketUrl = void 0,
            servicesService = void 0,
            TimePhasedDataService = void 0,
            LastKnownPositionService = void 0,
            messageCounter = 0,
            reconnectionTries = 2,
            pushServiceIsActive = false,
            firstTimeInit = true,
            updatesInProgress = false,
            fieldsSetFields = [],
            serviceIdsToCheckRules = new Set(),
            cachedServices = [],
            cachedAbsences = [],
            namespace = window.fslNamespace,
            pushSessionTime = null,
            IdsToCheckRulesObject = {
            ServiceAppointment: new Set(),
            ResourceAbsence: new Set()
        },
            resourceAbsenceFields = new Set(['Latitude', 'Longitude', 'AbsenceNumber', 'Gantt_Color__c', 'EstTravelTime__c', 'EstTravelTimeFrom__c', 'Start', 'End', 'Resource.Name', 'Type', 'TypeLabel', 'GanttLabel__c', 'Approved__c', 'isDeleted']),
            livePositionFields = new Set(['LastKnownLocationDate', 'LastKnownLatitude', 'LastKnownLongitude']),
            assignedResourceFields = new Set(['ServiceResourceId', 'EstimatedTravelTime', 'EstimatedTravelTimeFrom__c']),
            timeParametersForCheckRules = {
            ServiceAppointment: ['SchedStartTime', 'SchedEndTime'],
            ResourceAbsence: ['Start', 'End', 'ResourceId', namespace + '__EstTravelTime__c', namespace + '__EstTravelTimeFrom__c'],
            AssignedResource: [].concat(_toConsumableArray(assignedResourceFields))
        },
            updatesArray = [],
            debugMessages = [],
            TimeDependency = namespace + '__Time_Dependency__c',
            OptimizationRequest = namespace + '__Optimization_Request__c',
            registeredFunctions = {
            positions: [],
            optimizationRequests: [],
            rules: []
        },
            updatedObjects = (_updatedObjects = {
            ServiceAppointment: [],
            ResourceAbsence: [],
            ServiceResource: [],
            AssignedResource: [],
            ServiceResourceCapacity: []
        }, _defineProperty(_updatedObjects, TimeDependency, []), _defineProperty(_updatedObjects, OptimizationRequest, []), _updatedObjects),
            deletedObjects = _defineProperty({
            ServiceAppointment: [],
            ResourceAbsence: [],
            ServiceResourceCapacity: [],
            AssignedResource: []
        }, TimeDependency, []);

        async function setPushServiceSettings() {
            // injector
            servicesService = $injector.get('servicesService');
            TimePhasedDataService = $injector.get('TimePhasedDataService');
            LastKnownPositionService = $injector.get('LastKnownPositionService');

            sfdcService.callRemoteAction(RemoteActions.getBaseQueriedFieldsForServiceAppointment).then(function (fields) {
                fieldsSetFields = new Set([].concat(_toConsumableArray(fieldsSetFields), _toConsumableArray(fields)));
                FieldSetFieldsService.serviceAppointmentFields().then(function (fields) {
                    fieldsSetFields = new Set([].concat(_toConsumableArray(fieldsSetFields), _toConsumableArray(fields)));
                    fieldsSetFields.delete('LastModifiedDate');
                }).catch(function (err) {
                    console.log(err);
                });
            }).catch(function (err) {
                console.log(err);
            });

            firstTimeInit = false;
        }

        async function connectToWebSocket(params) {
            try {
                if (firstTimeInit) {
                    await setPushServiceSettings();
                }

                var restResult = await getPushServiceTicketId(CONNECTION_TYPE.CREATE);
                if (restResult.result === 'SUCCESS') {
                    // store ticketId in the client
                    window.ticketId = restResult.ticketID;
                    // construct web socket url
                    webSocketUrl = generateWebsocketUrl([restResult.ticketID, restResult.serverUrl, 'wss']);
                } else {
                    throw restResult.message;
                }

                // open web socket
                socket = new WebSocket(webSocketUrl);

                // on open event
                socket.onopen = function () {
                    pushServiceIsActive = true;
                    pushSessionTime = new Date().getTime();
                    updateSession(params);
                };

                // on message event
                socket.onmessage = function (msg) {
                    newMessageReceived(msg);
                };

                // on error event
                socket.onerror = function (err) {
                    console.log('error: ' + err);
                    writeErrorToSplunk('ON_ERROR_EVENT', err);
                };

                // on close event
                socket.onclose = function () {
                    console.log('socket is closed');
                    pushServiceIsActive = false;
                    writeErrorToSplunk('ON_CLOSE_EVENT', '');
                };
            } catch (err) {
                if (window.debugMode) {
                    console.log(err);
                }
                if (reconnectionTries-- > 0 && err != 'c2c failure') {
                    connectToWebSocket(params);
                }
            }
        }

        async function newMessageReceived(msg) {
            // remove the first character that represents the message type 
            var data = msg.data[0] === 'a' ? JSON.parse(msg.data.replace(/^[A-z]/, '')) : msg.data;
            if (window.debugMode) {
                console.log(data);
            }
            if (Array.isArray(data)) {
                // all arrays are composed of elements of the same message type
                switch (data[0].messageType) {
                    case 'DEBUG_MESSAGE':
                        // store debug message
                        debugMessages.push({ message: data[0].data.message, timestamp: new Date() });
                        break;
                    case 'GANTT_METADATA_CHANGED':
                        // replies on our GANTT_METADATA_CHANGED messages with the messageId specified
                        break;
                    case 'FALLBACK_TO_DELTA':
                        closeSession();
                        pushSessionTime = new Date().getTime() - pushSessionTime;
                        writeErrorToSplunk('FALLBACK_TO_DELTA', 'SESSION_TIME: ' + pushSessionTime + ' | ERROR: ' + data[0].data.message);
                        break;
                    case 'REFRESH_SESSION':
                        try {

                            writeErrorToSplunk('REFRESH_SESSION', '');

                            var restResult = await getPushServiceTicketId(CONNECTION_TYPE.UPDATE);
                            // can't update the new c2c token
                            if (restResult.result === 'FAILED') {
                                writeErrorToSplunk('REFRESH_SESSION - failed to get ticket', restResult.message);
                                throw restResult.message;
                            }
                        } catch (err) {
                            closeSession();
                        }
                        break;
                    case 'CHANGE_EVENT':
                        handleChangeEvent(data);
                        return;
                }
            }
        }

        async function handleChangeEvent(data) {
            if (updatesInProgress) {
                updatesArray.push(data);
                return;
            }
            updatesInProgress = true;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var notification = _step.value;
                    var _notification$data = notification.data,
                        entityIDs = _notification$data.entityIDs,
                        entityName = _notification$data.entityName,
                        changeType = _notification$data.changeType,
                        changedFields = _notification$data.changedFields;
                    // delete

                    if (changeType === 'DELETE') {
                        deletedObjects[entityName] = [].concat(_toConsumableArray(deletedObjects[entityName]), _toConsumableArray(entityIDs));
                    }
                    // update or create
                    else {
                            // skip if only lastModify has changed on SA and RA
                            if (['ServiceAppointment', 'ResourceAbsence'].includes(entityName) && changedFields.length === 1 && changedFields[0] === 'LastModifiedDate') {
                                continue;
                            }
                            // skip if fields are not included in mandatory fields - only for UPDATE event
                            if (changeType === 'UPDATE' && changedFieldsAreNotIncludedInFieldsSets(entityName, changedFields)) {
                                continue;
                            }
                            // add object to updated objects
                            updatedObjects[entityName] = [].concat(_toConsumableArray(updatedObjects[entityName]), _toConsumableArray(entityIDs));
                            // update services for check rules
                            if (entityName in timeParametersForCheckRules) {
                                handleServicesToCheckRules(entityName, entityIDs, changedFields);
                            }
                        }
                }

                // merge assignedResource array in serviceAppointment array
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            await mergeServicesArrays();

            var promiseUpdatesArray = [removeFromGantt(deletedObjects), handleServiceAppointmentChange(updatedObjects.ServiceAppointment), handleResourceAbsenceChange(updatedObjects.ResourceAbsence), handleServiceResourceChange(updatedObjects.ServiceResource), handleServiceResourceCapacityChange(updatedObjects.ServiceResourceCapacity), handleTimeDependencyChange(updatedObjects[TimeDependency], true), handleOptimizationRequestChange(updatedObjects[OptimizationRequest])];

            // when all promises resolve check rules, reset variables and execute the next batch
            Promise.all(promiseUpdatesArray).then(function () {
                if (serviceIdsToCheckRules.size) {
                    checkRules();
                    serviceIdsToCheckRules.clear();
                }

                clearObjectArrays();
                updatesInProgress = false;

                // handle the next change event if exists
                data = updatesArray.shift();
                if (data) {
                    handleChangeEvent(data);
                }
            });
        }

        async function handleServiceAppointmentChange(serviceAppointmentIds) {
            return new Promise(function (resolve) {

                if (serviceAppointmentIds.length === 0) {
                    return resolve();
                }

                // store services will if the bulk size is exceeded 
                updatedObjects.ServiceAppointment = [].concat(_toConsumableArray(serviceAppointmentIds.slice(BULK_SIZE)));
                // execute in bulks
                serviceAppointmentIds = serviceAppointmentIds.slice(0, BULK_SIZE);
                // update id there are services left to update after filtering pending services
                sfdcService.callRemoteAction(RemoteActions.getServicesById, serviceAppointmentIds).then(async function (res) {

                    var services = TimePhasedDataService.updateTimePhaseData(res, 'service').services;
                    servicesService.drawServicesAndAbsences(services);

                    // execute the next batch if exist
                    if (updatedObjects.ServiceAppointment.size) {
                        serviceAppointmentIds = updatedObjects.ServiceAppointment;
                        await handleServiceAppointmentChange([].concat(_toConsumableArray(serviceAppointmentIds)));
                    }
                }).catch(function (err) {
                    console.log(err);
                }).finally(function () {

                    // arrange check rules set
                    serviceIdsToCheckRules = new Set([].concat(_toConsumableArray(serviceIdsToCheckRules), _toConsumableArray(utils.getRelatedServices([].concat(_toConsumableArray(IdsToCheckRulesObject.ServiceAppointment))))));

                    resolve();
                });
            });
        }

        function handleResourceAbsenceChange(resourceAbsenceIds) {
            return new Promise(function (resolve) {

                if (resourceAbsenceIds.length === 0) {
                    return resolve();
                }

                var absences = void 0;

                sfdcService.callRemoteAction(RemoteActions.getUpdatedAbsences, resourceAbsenceIds, territories).then(function (res) {
                    absences = TimePhasedDataService.updateTimePhaseData(res, 'na').absences;

                    // remove absences from the gantt when assigned to a resource from the territories that are not loaded
                    var absenceIds = res.map(function (absence) {
                        return absence.Id;
                    });
                    var absencesToRemove = resourceAbsenceIds.filter(function (absenceId) {
                        return !absenceIds.includes(absenceId);
                    });

                    servicesService.drawServicesAndAbsences([], absences, absencesToRemove);
                }).catch(function (err) {
                    console.log(err);
                }).finally(function () {

                    // arrange check rules set
                    var resourceIds = absences.filter(function (absence) {
                        return IdsToCheckRulesObject.ResourceAbsence.has(absence.id);
                    }).map(function (absence) {
                        return absence.resource;
                    }).join(',');
                    serviceIdsToCheckRules = new Set([].concat(_toConsumableArray(serviceIdsToCheckRules), _toConsumableArray(utils.getRelatedServices([].concat(_toConsumableArray(IdsToCheckRulesObject.ResourceAbsence)), resourceIds))));

                    resolve();
                });
            });
        }

        function handleServiceResourceChange(serviceResourceIds) {

            return new Promise(function (resolve) {
                if (serviceResourceIds.length === 0) {
                    return resolve();
                }

                sfdcService.getLivePositionsStreaming(serviceResourceIds).then(function (res) {
                    var updateRes = LastKnownPositionService.updatePositions(res);
                    if (updateRes.isUpdated) {
                        registeredFunctions.positions.forEach(function (func) {
                            func(updateRes.dic);
                        });
                    }
                }).finally(function () {
                    resolve();
                });
            });
        }

        function handleServiceResourceCapacityChange(capacityIds) {
            return new Promise(function (resolve) {

                if (capacityIds.length === 0) {
                    return resolve();
                }

                sfdcService.getUpdatedResourceCapacities(capacityIds).then(function (res) {
                    var capacities = TimePhasedDataService.updateTimePhaseData(res, 'capacity').capacities;
                    if (capacities) {
                        servicesService.drawServicesAndAbsences([], [], [], capacities);
                    }
                }).catch(function (err) {
                    console.log(err);
                }).finally(function () {
                    resolve();
                });
            });
        }

        async function handleTimeDependencyChange(timeDependencyIds, isChained) {
            return new Promise(async function (resolve) {

                if (timeDependencyIds.length === 0) {
                    return resolve();
                }

                await updateTimeDependency(timeDependencyIds, isChained).then(function () {}).finally(function () {
                    resolve();
                });
            });
        }

        function updateTimeDependency(timeDependencyIds, isChained) {
            return new Promise(function (resolve) {
                sfdcService.callRemoteAction(RemoteActions.getServiceAppointmentIdByTimeDependencyId, timeDependencyIds).then(function (res) {
                    var services = [];
                    res.forEach(function (serviceId) {
                        var service = TimePhasedDataService.serviceAppointments()[serviceId];
                        if (service) {
                            service.isServiceInChain = isChained;
                            services.push(service);
                        }
                    });
                    servicesService.drawServicesAndAbsences(services);
                }).catch(function (err) {
                    console.log(err);
                }).finally(function () {
                    resolve();
                });
            });
        }

        function handleOptimizationRequestChange(optimizationRequestIds) {
            return new Promise(function (resolve) {

                if (optimizationRequestIds.length === 0) {
                    return resolve();
                }

                sfdcService.getOptimiztionRequestsUpdate(optimizationRequestIds).then(function (res) {
                    registeredFunctions.optimizationRequests.forEach(function (func) {
                        func(res);
                    });
                }).catch(function (err) {
                    console.log(err);
                }).finally(function () {
                    resolve();
                });
            });
        }

        async function removeFromGantt(deletedObjects) {
            return new Promise(async function (resolve) {

                if (!thereAreObjectsToDelete()) {
                    return resolve();
                }

                var ServiceAppointment = deletedObjects.ServiceAppointment,
                    ResourceAbsence = deletedObjects.ResourceAbsence,
                    ServiceResourceCapacity = deletedObjects.ServiceResourceCapacity;

                var idsToRemove = [].concat(_toConsumableArray(ServiceAppointment), _toConsumableArray(ResourceAbsence), _toConsumableArray(ServiceResourceCapacity));
                // remove services, absences and capacities from gantt
                servicesService.drawServicesAndAbsences([], [], idsToRemove);

                // remove services from TimePhasedDataService
                ServiceAppointment.forEach(function (id) {
                    delete TimePhasedDataService.serviceAppointments()[id];
                });

                // remove absences from TimePhasedDataService
                ResourceAbsence.forEach(function (id) {
                    delete TimePhasedDataService.resourceAbsences()[id];
                });

                // remove capacities from TimePhasedDataService
                ServiceResourceCapacity.forEach(function (id) {
                    delete TimePhasedDataService.resourceCapacities()[id];
                });

                // remove time dependencies
                var timeDependencyIds = deletedObjects[TimeDependency];
                if (timeDependencyIds.length) {
                    await handleTimeDependencyChange(timeDependencyIds, false);
                }

                // update services to check rules
                serviceIdsToCheckRules = new Set([].concat(_toConsumableArray(serviceIdsToCheckRules), _toConsumableArray(utils.getRelatedServices([].concat(_toConsumableArray(IdsToCheckRulesObject.ServiceAppointment)))), _toConsumableArray(utils.getRelatedServices([].concat(_toConsumableArray(IdsToCheckRulesObject.ResourceAbsence))))));
                IdsToCheckRulesObject.ServiceAppointment.clear();
                IdsToCheckRulesObject.ResourceAbsence.clear();

                resolve();
            });
        }

        function updateSession(params) {
            // update territories if needed
            territories = params.territories ? params.territories : territories;

            // construct services for cached data
            var services = params.services ? [].concat(_toConsumableArray(cachedServices), _toConsumableArray(params.services)) : cachedServices;

            // construct absences for cached data
            var absences = params.absences ? [].concat(_toConsumableArray(cachedAbsences), _toConsumableArray(params.absences)) : cachedAbsences;

            socket.send(JSON.stringify([{

                messageType: 'GANTT_METADATA_CHANGED',
                messageID: messageCounter++,

                data: {
                    operation: params.operation,
                    serviceTerritories: territories,
                    viewStartTime: StateService.getDeltaDates().minDate,
                    viewEndTime: StateService.getDeltaDates().maxDate,
                    serviceResources: params.resources,
                    serviceAppointments: services,
                    resourceAbsences: absences,
                    shouldGetSAUpdatesOnEmptyTerritories: userSettingsManager.GetUserSettingsProperty('Show_Orphan_Services__c'),
                    shouldGetUpdatesOnServiceResource: !window.isLastKnownFieldsNotAllowed
                }

            }]));
            // clear cached services and absences
            cachedServices = [];
            cachedAbsences = [];
        }

        function isPushServiceActive() {
            return pushServiceIsActive;
        }

        function closeSession() {
            socket.close();
        }

        // close session if user is idle
        $rootScope.$on('UserIsIdle', function () {
            if (pushServiceIsActive) {
                writeErrorToSplunk('USER_IS_IDLE', '');
                closeSession();
            }
        });

        function setConnection() {
            return new Promise(function (resolve, reject) {
                sfdcService.callRemoteAction(RemoteActions.setConnection).then(function (res) {
                    resolve(res);
                }).catch(function (err) {
                    reject(err);
                });
            });
        }

        function getPushServiceTicketId(operation) {
            return new Promise(async function (resolve, reject) {

                // this call must be separated due to platform limit 
                var upsertResult = await setConnection();
                if (!upsertResult) {
                    reject('connection failure');
                }

                // generate ticketId
                sfdcService.callRemoteAction(RemoteActions.getPushServiceTicketId, operation).then(function (res) {
                    resolve(res);
                }).catch(function (err) {
                    reject(err);
                });
            });
        }

        function handleServicesToCheckRules(entityName, entityIDs, changedFields) {
            // if time field changed add to check rules object
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = changedFields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var fields = _step2.value;

                    if (timeParametersForCheckRules[entityName].includes(fields)) {
                        if (entityName === 'AssignedResource') {

                            // add service id by its assignedResource id
                            var serviceIdsFromARIds = entityIDs.map(function (id) {
                                return TimePhasedDataService.assignedResourceIdToServiceIdMap[id];
                            }).filter(function (item) {
                                return item;
                            });
                            IdsToCheckRulesObject.ServiceAppointment = new Set([].concat(_toConsumableArray(IdsToCheckRulesObject.ServiceAppointment), _toConsumableArray(serviceIdsFromARIds)));
                        } else {
                            IdsToCheckRulesObject[entityName] = new Set([].concat(_toConsumableArray(IdsToCheckRulesObject[entityName]), _toConsumableArray(entityIDs)));
                        }
                        break;
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }

        function checkRules() {
            registeredFunctions.rules.forEach(function (func) {
                func([].concat(_toConsumableArray(serviceIdsToCheckRules)), window.__gantt.checkRulesAfterDelta);
            });
        }

        function changedFieldsAreNotIncludedInFieldsSets(entityName, changedFields) {
            if (entityName === 'ServiceAppointment' && !changedFieldsIncludedInFieldSetFields(changedFields, fieldsSetFields)) {
                return true;
            }
            if (entityName === 'ResourceAbsence' && !changedFieldsIncludedInFieldSetFields(changedFields, resourceAbsenceFields)) {
                return true;
            }
            if (entityName === 'ServiceResource' && !changedFieldsIncludedInFieldSetFields(changedFields, livePositionFields)) {
                return true;
            }
            if (entityName === 'AssignedResource' && !changedFieldsIncludedInFieldSetFields(changedFields, assignedResourceFields)) {
                return true;
            }
            return false;
        }

        function generateWebsocketUrl(replaceToArray) {
            var webSocketUrl = '{URL}topic/ObjectsChanges/1/ticketId/websocket';
            var replaceFromArray = ['ticketId', '{URL}', 'https'];

            replaceFromArray.forEach(function (item, index) {
                webSocketUrl = webSocketUrl.replace(replaceFromArray[index], replaceToArray[index]);
            });
            return webSocketUrl;
        };

        function changedFieldsIncludedInFieldSetFields(changedFields, fields) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = changedFields[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var field = _step3.value;

                    if (fields.has(field.replace(namespace + '__', ''))) {
                        return true;
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            return false;
        }

        function mergeServicesArrays() {
            return new Promise(function (resolve) {

                // all AR ids that not in the cache
                var missingIds = [];

                var _arr = [updatedObjects, deletedObjects];

                var _loop = function _loop() {
                    var object = _arr[_i];

                    // get SA ids from AR ids (from cache memory) and add to missingIds array if not in cache
                    var serviceIdsFromARIds = [];
                    object.AssignedResource.forEach(function (id) {
                        var serviceId = TimePhasedDataService.assignedResourceIdToServiceIdMap()[id];
                        serviceId ? serviceIdsFromARIds.push(serviceId) : missingIds.push(id);
                    });

                    // merge and make sure all ids are unique
                    object.ServiceAppointment = [].concat(_toConsumableArray(new Set([].concat(_toConsumableArray(object.ServiceAppointment), serviceIdsFromARIds))));
                };

                for (var _i = 0; _i < _arr.length; _i++) {
                    _loop();
                }

                if (missingIds.length > 0) {
                    // get all SA ids by AR ids that are not in the cache
                    sfdcService.callRemoteAction(RemoteActions.getServiceAppointmentIdByAssignedResourceId, missingIds).then(function (res) {

                        Object.entries(res).forEach(function (_ref) {
                            var _ref2 = _slicedToArray(_ref, 2),
                                arId = _ref2[0],
                                saId = _ref2[1];

                            // add saId to the relevant object by its arId
                            if (updatedObjects.AssignedResource.includes(arId)) {
                                updatedObjects.ServiceAppointment.push(saId);
                            }
                            if (deletedObjects.AssignedResource.includes(arId)) {
                                deletedObjects.ServiceAppointment.push(saId);
                            }

                            // update cache
                            TimePhasedDataService.setAssignedResourceIdToServiceIdMap(arId, saId);
                        });
                        updateSession({ services: Object.values(res), operation: MESSAGE_OPERATIONS.UPDATE });
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }

        function thereAreObjectsToDelete() {
            for (var object in deletedObjects) {
                if (deletedObjects[object].length) {
                    return true;
                }
            }
            return false;
        }

        function clearObjectArrays() {
            // clear update arrays
            for (var key in updatedObjects) {
                updatedObjects[key] = [];
            }
            // clear delete arrays
            for (var _key in deletedObjects) {
                deletedObjects[_key] = [];
            }
            // clear check rules object
            for (var _key2 in IdsToCheckRulesObject) {
                IdsToCheckRulesObject[_key2].clear();
            }
        }

        function register(type, callback) {
            return registeredFunctions[type] && registeredFunctions[type].push(callback);
        }

        function unRegister(type, callback) {
            registeredFunctions[type].splice(registeredFunctions[type].indexOf(callback), 1);
        }

        function setCachedServices(services) {
            cachedServices = [].concat(_toConsumableArray(cachedServices), _toConsumableArray(services));
        }

        function setCachedAbsences(absences) {
            cachedAbsences = [].concat(_toConsumableArray(cachedAbsences), _toConsumableArray(absences));
        }

        function writeErrorToSplunk(subject, err) {
            sfdcService.callRemoteAction(RemoteActions.WriteErrorToSplunk, subject, err);
        }

        return {
            connectToWebSocket: connectToWebSocket,
            updateSession: updateSession,
            isPushServiceActive: isPushServiceActive,
            MESSAGE_OPERATIONS: MESSAGE_OPERATIONS,
            register: register,
            unRegister: unRegister,
            setCachedServices: setCachedServices,
            setCachedAbsences: setCachedAbsences
        };
    }
})();