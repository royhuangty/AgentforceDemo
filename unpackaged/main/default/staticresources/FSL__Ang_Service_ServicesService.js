'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('serviceExpert').factory('servicesService', ['$q', '$rootScope', '$timeout', 'BundleService', 'sfdcService', 'utils', 'userSettingsManager', 'monthlyViewHelperService', 'TimePhasedDataService', 'ServiceAppointmentLightboxService', 'kpiCalculationsService', 'bulkResultsService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'StateService', 'MstResolver', 'DeltaService', 'PushServices', function ($q, $rootScope, $timeout, BundleService, sfdcService, utils, userSettingsManager, monthlyViewHelperService, TimePhasedDataService, ServiceAppointmentLightboxService, kpiCalculationsService, bulkResultsService, SERVICE_STATUS, SERVICE_CATEGORY, StateService, MstResolver, DeltaService, PushServices) {

        var horizionEndDate = new Date();
        horizionEndDate.setDate(horizionEndDate.getDate() + 3);

        window.globalStatuses = SERVICE_STATUS;
        window.globalCategories = SERVICE_CATEGORY;

        var servicesService = {
            servicesObjects: {},
            recentlyUsed: {},
            flagged: flaggedServices,
            filteredServices: { servicesArray: [] },
            filter: {
                searchOnServer: null,
                advancedFilter: {
                    statusCheckboxs: {
                        New: true,
                        Assigned: true,
                        Dispatched: true,
                        Travel: true,
                        'On Site': true,
                        Incomplete: true
                    },

                    selectedDates: {
                        dueDate: true,
                        appEnd: true,
                        end_date: true

                    },

                    minDate: new Date(Date.now() - 7 * 86400000), // day in milisceound 86400000
                    maxDate: new Date(Date.now() + 7 * 86400000),
                    servicePriority: 10,
                    jeopardies: true,
                    violations: true,
                    unScheduled: true
                },

                selectedFiled: {
                    appEnd: true,
                    appStart: true,
                    dueDate: true,
                    earlyStart: true,
                    finish: true,
                    start: true,
                    display: true
                },

                selectedFilter: userSettingsManager.GetUserSettingsProperty('Selected_List_View__c') || (customPermissions.Service_List_Todo ? 'Todo' : 'All'),
                orderByField: 'start',
                reverse: false,
                SearchText: '',
                endDate: horizionEndDate,
                currentPage: 1,
                servicesPerPage: 200,
                totalServices: 0,
                totalPages: 1
            }
        };

        // sticky settings from user settings
        if (userSettingsManager.GetUserSettingsProperty('Date_Horizon_Properties__c')) {
            var dateHorizonFields = JSON.parse(userSettingsManager.GetUserSettingsProperty('Date_Horizon_Properties__c'));

            for (var key in dateHorizonFields) {
                servicesService.filter.selectedFiled[key] = dateHorizonFields[key];
            }
        }

        // set default services per page, default 200
        if (utils.ganttSettings) {
            servicesService.filter.servicesPerPage = parseInt(utils.ganttSettings.servicesPerPage);
        }

        // generate a date-key from date
        function generateDateKey(date) {
            return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
        }

        // sort ids for checkrules
        function sortServicesForCheckRules(servicesIds) {

            var RESOURCE_CHUNK_SIZE = window.__gantt.maxResourcesForCheckRules,
                MAX_DAYS_DIFF = window.__gantt.dayRangeForCheckRules,
                MAX_SERVICES_IN_CHUNK = window.__gantt.maxServicesForCheckRules; // Actual max will be 190 + (max_services_in_particular_resource_day)

            var servicesOfResources = {},
                servicesByChunks = [],
                minDate = null,
                maxDate = null,
                currentResourcesInChunk = {},
                currentResourcesInChunkCount = 0,
                currentNumberOfServices = 0,
                currentChunk = 0,
                dayDiff = 0;

            servicesIds.forEach(function (id) {
                var service = TimePhasedDataService.serviceAppointments()[id],
                    dateKey = generateDateKey(service.start);

                if (!minDate) {
                    minDate = service.start;
                } else if (minDate > service.start) {
                    minDate = service.start;
                }

                if (!maxDate) {
                    maxDate = service.start;
                } else if (maxDate < service.start) {
                    maxDate = service.start;
                }

                servicesOfResources[service.resource] = servicesOfResources[service.resource] || {};
                servicesOfResources[service.resource][dateKey] = servicesOfResources[service.resource][dateKey] || [];
                servicesOfResources[service.resource][dateKey].push(id);
            });

            maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate() + 1);

            for (var currentDate = new Date(minDate); currentDate < maxDate; currentDate.setDate(currentDate.getDate() + 1)) {

                var dateKey = generateDateKey(currentDate);

                dayDiff++;

                // check that we didn't get to max diff between min and max start dates
                if (dayDiff === MAX_DAYS_DIFF) {

                    //console.log('chunk ' + currentChunk + ': resources=' + currentResourcesInChunkCount + ' , services=' + currentNumberOfServices + ', dayDiff= ' + dayDiff);

                    currentChunk++;
                    currentNumberOfServices = 0;
                    currentResourcesInChunkCount = 0;
                    dayDiff = 0;
                    currentResourcesInChunk = {};
                }

                for (var resourceId in servicesOfResources) {

                    if (servicesOfResources[resourceId][dateKey]) {
                        var _servicesByChunks$cur;

                        servicesByChunks[currentChunk] = servicesByChunks[currentChunk] || [];

                        // push current day of resource
                        (_servicesByChunks$cur = servicesByChunks[currentChunk]).push.apply(_servicesByChunks$cur, _toConsumableArray(servicesOfResources[resourceId][dateKey]));

                        currentNumberOfServices += servicesOfResources[resourceId][dateKey].length;

                        // check we don't exceed max services in chunk
                        if (currentNumberOfServices >= MAX_SERVICES_IN_CHUNK) {

                            //console.log('chunk ' + currentChunk + ': resources=' + currentResourcesInChunkCount + ' , services=' + currentNumberOfServices + ', dayDiff= ' + dayDiff);

                            currentChunk++;
                            currentNumberOfServices = 0;
                            currentResourcesInChunkCount = 0;
                            dayDiff = 0;
                            currentResourcesInChunk = {};
                        }

                        // add resource to chunk
                        if (!currentResourcesInChunk[resourceId]) {

                            currentResourcesInChunk[resourceId] = true;
                            currentResourcesInChunkCount++;

                            // check we don't exceed max resources in chunk
                            if (currentResourcesInChunkCount === RESOURCE_CHUNK_SIZE) {

                                //console.log('chunk BEFORE PADDING:' + currentChunk + ': resources=' + currentResourcesInChunkCount + ' , services=' + currentNumberOfServices + ', dayDiff= ' + dayDiff);

                                // ************* PADDING THE CHUNK CODE *************

                                // we can add services to this chunk!
                                if (currentNumberOfServices <= MAX_SERVICES_IN_CHUNK) {

                                    // start to check after next day
                                    var minDateInChunk = new Date(currentDate);
                                    minDateInChunk.setDate(minDateInChunk.getDate() + 1);

                                    var maxDateInChunk = new Date(minDateInChunk);
                                    maxDateInChunk.setDate(maxDateInChunk.getDate() + MAX_DAYS_DIFF - dayDiff + 1);

                                    for (var currentDateInChunk = minDateInChunk; currentDateInChunk < maxDateInChunk; currentDateInChunk.setDate(currentDateInChunk.getDate() + 1)) {

                                        var chunkDateKey = generateDateKey(currentDateInChunk);

                                        for (var resourceIdInChunk in currentResourcesInChunk) {

                                            // push current day of resource
                                            if (servicesOfResources[resourceIdInChunk][chunkDateKey]) {
                                                var _servicesByChunks$cur2;

                                                (_servicesByChunks$cur2 = servicesByChunks[currentChunk]).push.apply(_servicesByChunks$cur2, _toConsumableArray(servicesOfResources[resourceIdInChunk][chunkDateKey]));
                                                currentNumberOfServices += servicesOfResources[resourceIdInChunk][chunkDateKey].length;
                                            }

                                            delete servicesOfResources[resourceIdInChunk][chunkDateKey];

                                            if (currentNumberOfServices >= MAX_SERVICES_IN_CHUNK) {
                                                break;
                                            }
                                        }

                                        if (currentNumberOfServices >= MAX_SERVICES_IN_CHUNK) {
                                            break;
                                        }
                                    }
                                }

                                //console.log('chunk:' + currentChunk + ': resources=' + currentResourcesInChunkCount + ' , services=' + currentNumberOfServices + ', dayDiff= ' + dayDiff);


                                currentChunk++;
                                currentNumberOfServices = 0;
                                currentResourcesInChunkCount = 0;
                                dayDiff = 0;
                                currentResourcesInChunk = {};
                            }
                        }
                    }

                    // finished with that resource's daily services
                    delete servicesOfResources[resourceId][dateKey];
                }
            }

            // we could have empty chunks because of day diff, need to remove them
            servicesByChunks = servicesByChunks.filter(function (chunk) {
                return chunk;
            });

            return servicesByChunks;
        }

        servicesService.checkRules = function (servicesIds) {
            var violatingKeys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            var remainingCheckRulesCalls = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : -1;


            // if our remainig calls are -1, this mean we need to init it with default
            // if it's other than -1, that means we are running on services that weren't check and we use that limit
            if (remainingCheckRulesCalls === -1) {
                remainingCheckRulesCalls = window.__gantt.maxIterationsOfCheckRules;
            }

            // check only serices that are scheduled and not in the queue
            servicesIds = servicesIds.filter(function (id) {
                return TimePhasedDataService.serviceAppointments()[id] && TimePhasedDataService.serviceAppointments()[id].isScheduled();
            });

            // empty array of services, do nothing
            if (servicesIds.length === 0) {
                var r = $q.defer();
                r.resolve([]);
                return r.promise;
            }

            // initialize data
            var chunks = sortServicesForCheckRules(servicesIds),
                promises = [],
                servicesThatWereNotChecked = {},
                userPromise = $q.defer();

            // check rules for each chunk
            for (var i = 0; i < chunks.length; i++) {

                promises.push($q.defer());

                // set resolved function for each chunk
                promises[i].promise.then(function (index) {

                    // api call
                    sfdcService.checkRules(chunks[index], StateService.selectedPolicyId).then(function (violations) {

                        var foundCapacityLimitRule = false;
                        remainingCheckRulesCalls--;

                        // assume all services were not checked
                        chunks[index].forEach(function (id) {
                            return servicesThatWereNotChecked[id] = true;
                        });

                        var RuleViolationAggregationList = {};

                        for (var serviceId in violations) {

                            // if service is in the returned violations object, remove it from the not checked list
                            delete servicesThatWereNotChecked[serviceId];

                            var service = TimePhasedDataService.serviceAppointments()[serviceId];

                            // update service's violations array
                            if (violations[serviceId].length > 0 && service) {
                                // service.violations = violations[serviceId];
                                //  violatingKeys.push(serviceId);

                                var foundNotCapacityLimitRule = false;
                                var v = violations[serviceId].length;
                                while (v--) {

                                    var violationsItem = violations[serviceId][v].ViolationString || '';
                                    if (violationsItem && violationsItem.indexOf('__WORK-CAPACITY__') > -1) {
                                        // __WORK-CAPACITY__

                                        violationsItem = violationsItem.replace('__WORK-CAPACITY__', '');

                                        // Work Capacity violations have Aggregation and Notification 

                                        if (violationsItem.indexOf('PAST_TIME') > -1) {
                                            // violations happend in the past, dont show notification
                                            violations[serviceId].splice(v, 1);
                                            continue;
                                        }

                                        var _violationsItem$split = violationsItem.split('__DATA__'),
                                            _violationsItem$split2 = _slicedToArray(_violationsItem$split, 2),
                                            violationsStringData = _violationsItem$split2[0],
                                            violationsStringKey = _violationsItem$split2[1]; // Work Capacity have Aggregation key 


                                        var _violationsStringData = violationsStringData.split('XXX'),
                                            _violationsStringData2 = _slicedToArray(_violationsStringData, 3),
                                            violationsStringHeader = _violationsStringData2[0],
                                            violationsStringBodyTitle = _violationsStringData2[1],
                                            violationsStringBody = _violationsStringData2[2]; //Notification header , Aggregation Notification title ,Notification body

                                        if (RuleViolationAggregationList[violationsStringKey]) {

                                            RuleViolationAggregationList[violationsStringKey].body = RuleViolationAggregationList[violationsStringKey].body + '<div> ' + violationsStringBody + '</div>';
                                            violations[serviceId].splice(v, 1);
                                            continue;
                                        }

                                        RuleViolationAggregationList[violationsStringKey] = { header: violationsStringHeader, body: '<div>' + violationsStringBodyTitle + '</div><div>' + violationsStringBody + '</div>' };

                                        foundCapacityLimitRule = true;
                                        violations[serviceId].splice(v, 1);
                                    } else {
                                        if (violations[serviceId] && violations[serviceId][v] && violations[serviceId][v]['RuleName'] && violations[serviceId][v]['RuleName'] != undefined) foundNotCapacityLimitRule = true;
                                    }
                                }

                                if (foundNotCapacityLimitRule) {
                                    service.violations = violations[serviceId];
                                    violatingKeys.push(serviceId);
                                }
                            } else if (service) {
                                service.violations = null;
                            }
                        }

                        // add Work Capacity Aggregation Notification
                        for (var e in RuleViolationAggregationList) {
                            utils.addNotification(RuleViolationAggregationList[e].header, RuleViolationAggregationList[e].body, function () {});
                        }

                        // check that we didn't exceed number of allowed API calls 
                        if (remainingCheckRulesCalls === 0) {

                            kpiCalculationsService.calculateKpis();
                            userPromise.resolve(violatingKeys);

                            if (promises[index + 1]) {
                                utils.addNotification(window.customLabels.ValidateRulesApiExceededTitle, window.customLabels.ValidateRulesApiExceededMessage);
                            }

                            return;
                        }

                        // init next chunk
                        if (promises[index + 1]) {
                            promises[index + 1].resolve(index + 1);
                        } else {

                            // if all services were checked or we don't have more iterations allowed
                            if (Object.keys(servicesThatWereNotChecked).length === 0) {

                                kpiCalculationsService.calculateKpis();
                                userPromise.resolve(violatingKeys);
                            } else {

                                servicesService.checkRules(Object.keys(servicesThatWereNotChecked), violatingKeys, remainingCheckRulesCalls).then(function (v) {
                                    kpiCalculationsService.calculateKpis();
                                    userPromise.resolve([].concat(_toConsumableArray(v), _toConsumableArray(violatingKeys)));
                                });
                            }
                        }
                    }).catch(function (err) {
                        utils.addNotification(customLabels.Rule_validation_failed, err.message);
                        userPromise.reject(err);
                        console.warn('rule checking failed');
                        console.log(err);
                    });
                });
            }

            promises[0].resolve(0);

            return userPromise.promise;
        };

        // post to chatter
        servicesService.postToChatter = function (servicesIdsArray, sayWhat) {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.postToChatter, servicesIdsArray, sayWhat).then(function (numOfMentions) {
                deferred.resolve(numOfMentions);
            });

            return deferred.promise;
        };

        servicesService.sortServicesByPriority = function (servicesIds) {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.sortServicesByPriority, servicesIds).then(function (sortedIds) {
                deferred.resolve(sortedIds);
            });

            return deferred.promise;
        };

        servicesService.autoScheduleService = function (serviceId) {
            var partOfBulk = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;


            var deffered = $q.defer();

            if (window.userHasAdminPermissions == undefined) {
                sfdcService.callRemoteAction(RemoteActions.userHasAdminPermissions).then(function (res) {
                    window.userHasAdminPermissions = res;
                });
            }

            // this for FSL-978 (catch part)
            sfdcService.autoScheduleService(serviceId, StateService.selectedPolicyId).then(function (updatedObjects) {
                if (updatedObjects.schedulingResult && Array.isArray(updatedObjects.schedulingResult) && updatedObjects.schedulingResult[0]) {
                    var partialResults = updatedObjects.schedulingResult[0].PartialResults || [],
                        message = '';

                    if (partialResults.length > 0) {
                        if (window.userHasAdminPermissions) {
                            partialResults.forEach(function (p) {
                                message += customLabels.partialResults[p.Operation].replaceAll(p.Processed, p.Total) + '<br/>';
                            });
                        } else {
                            message += customLabels.ContactSysAdmin;
                        }

                        if (message !== '') {
                            utils.addNotification(customLabels.NotAllResult.replace('$0', updatedObjects.schedulingResult[0].Service.AppointmentNumber), message);
                        }
                    }
                }

                // MST scheduling
                if (updatedObjects.schedulingResult && Array.isArray(updatedObjects.schedulingResult) && updatedObjects.schedulingResult[0] && updatedObjects.schedulingResult[0].LongOperationId) {

                    MstResolver.getUpdates(updatedObjects.schedulingResult[0].LongOperationId).then(function (result) {

                        if (result.services) {
                            result.mst = true;

                            if (!partOfBulk) {
                                deffered.resolve(result);
                            } else {

                                DeltaService.getDeltaPromise(false).then(function (deltaResult) {

                                    var parsedUpdatedObjects = { services: [], absences: [] };

                                    deltaResult.updatedGanttServices.forEach(function (srv) {

                                        var service = TimePhasedDataService.serviceAppointments()[srv.Id];
                                        if (service) {
                                            parsedUpdatedObjects.services.push(service);
                                        }
                                    });

                                    deltaResult.updatedAbsence.forEach(function (abs) {

                                        var absence = TimePhasedDataService.resourceAbsences()[abs.Id];
                                        if (absence) {
                                            parsedUpdatedObjects.absences.push(absence);
                                        }
                                    });

                                    deffered.resolve(parsedUpdatedObjects);
                                });
                            }
                        }
                    }).catch(function (ex) {
                        console.error(ex);
                        var rejectObject = typeof ex === 'string' ? { eventType: 'exception', message: ex } : ex;
                        deffered.reject(rejectObject);
                    });
                    return;
                }

                updatedObjects.services = updatedObjects.deltaResult.updatedGanttServices;
                updatedObjects.na = updatedObjects.deltaResult.updatedAbsence;

                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.handleDeltaResponse(updatedObjects.deltaResult, shouldCheckRules);

                if (updatedObjects.schedulingResult && Array.isArray(updatedObjects.schedulingResult) && updatedObjects.schedulingResult[0]) {
                    var _partialResults = updatedObjects.schedulingResult[0].PartialResults || [],
                        _message = '';

                    if (_partialResults.length > 0) {
                        if (window.userHasAdminPermissions) {
                            _partialResults.forEach(function (p) {
                                _message += customLabels.partialResults[p.Operation].replaceAll(p.Processed, p.Total) + '<br/>';
                            });
                        } else {
                            _message += customLabels.ContactSysAdmin;
                        }

                        if (_message !== '') {
                            utils.addNotification(customLabels.NotAllResult.replace('$0', updatedObjects.schedulingResult[0].Service.AppointmentNumber), _message);
                        }
                    }
                }

                // regular scheduling
                parseUpdates(updatedObjects, deffered, serviceId);
            }).catch(function (err) {

                // fsl1934
                if (err.message && (err.message.includes('Too many SOQL queries') || err.message.includes('Apex CPU time limit'))) {

                    // check rules if not "on demand" mode
                    var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                    DeltaService.getDelta(shouldCheckRules);
                } else {
                    console.log(err);
                }

                deffered.reject(err);
            });

            return deffered.promise;
        };

        function parseUpdates(updatedObjects, deffered, serviceId) {
            var dontRedrawBecauseOfAsync = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            var parsedUpdatedObjects = {};

            if (updatedObjects.schedulingResult && Array.isArray(updatedObjects.schedulingResult) && updatedObjects.schedulingResult[0]) {

                // handle partial results
                parsedUpdatedObjects.partialResults = updatedObjects.schedulingResult[0].PartialResults || [];

                // handle a scenario where the service is not scheduled to a territory that is currently on the gantt
                if (updatedObjects.services.length === 0) {

                    // need to bring this specific service from the server
                    sfdcService.callRemoteAction(RemoteActions.getServicesById, [serviceId]).then(function (fetchedServcices) {
                        var _parsedUpdatedObjects;

                        parsedUpdatedObjects.absences = TimePhasedDataService.updateTimePhaseData(updatedObjects.na, 'na', !dontRedrawBecauseOfAsync).absences;
                        parsedUpdatedObjects.services = TimePhasedDataService.updateTimePhaseData(updatedObjects.services, 'service', !dontRedrawBecauseOfAsync).services;
                        (_parsedUpdatedObjects = parsedUpdatedObjects.services).push.apply(_parsedUpdatedObjects, _toConsumableArray(TimePhasedDataService.updateTimePhaseData(fetchedServcices, 'service', !dontRedrawBecauseOfAsync).services));

                        var filteredLocations = userSettingsManager.GetUserSettingsProperty('locations');

                        if (fetchedServcices.length === 1 && filteredLocations.indexOf(parsedUpdatedObjects.services[parsedUpdatedObjects.services.length - 1].ServiceTerritoryId) === -1) {
                            utils.addNotification(customLabels.SchedulingResult, customLabels.WasScheduledToFilteredTeritory.replace('$0', parsedUpdatedObjects.services[parsedUpdatedObjects.services.length - 1].AppointmentNumber));
                        }

                        deffered.resolve(parsedUpdatedObjects);

                        // check rules only if we are not on "On Demand" ( the parseUpdates() is only called from autoScheduleService() )
                        window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(utils.getRelatedServices(serviceId)).then(servicesService.drawViolationsOnGantt);
                    });
                } else {

                    parsedUpdatedObjects.absences = TimePhasedDataService.updateTimePhaseData(updatedObjects.na, 'na', !dontRedrawBecauseOfAsync).absences;
                    parsedUpdatedObjects.services = TimePhasedDataService.updateTimePhaseData(updatedObjects.services, 'service', !dontRedrawBecauseOfAsync).services;

                    deffered.resolve(parsedUpdatedObjects);

                    window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(utils.getRelatedServices(serviceId)).then(servicesService.drawViolationsOnGantt);
                }
            } else {

                parsedUpdatedObjects.absences = TimePhasedDataService.updateTimePhaseData(updatedObjects.na, 'na', !dontRedrawBecauseOfAsync).absences;
                parsedUpdatedObjects.services = TimePhasedDataService.updateTimePhaseData(updatedObjects.services, 'service', !dontRedrawBecauseOfAsync).services;

                deffered.resolve(parsedUpdatedObjects);

                window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(utils.getRelatedServices(serviceId)).then(servicesService.drawViolationsOnGantt);
            }
        }

        // ************************************************************************************************************
        // ************************************************************************************************************
        // *********************************** NEW STUFF FOR NEW DATA MODEL STUFF *************************************
        // ************************************************************************************************************
        // ************************************************************************************************************


        // saving changes to service appiontment and returns the updated object or the original one if there was an error
        servicesService.saveChangesToServiceAppointment = function (originalService, changedService) {
            var isResizingService = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;


            var deffered = $q.defer(),
                start = new Date(changedService.start_date.getTime() + changedService.travelTo * 1000),
                end = new Date(changedService.end_date.getTime() - changedService.travelFrom * 1000),


            // scheduling from "SCHEDULE HERE"
            isFirstServiceOfConsecutive = !!changedService.savedFromScheduleHereAndConsecutive;

            if (useLocationTimezone) {
                //get territory offset by SRST
                var resourceTerritoryOffset = TimePhasedDataService.getIntersectingSrstOffset(changedService, changedService.getGanttResource());

                //set times accordingly

                var userStartOffset = utils.getUserOffset(start),
                    userEndOffset = utils.getUserOffset(end);

                start.setMinutes(start.getMinutes() + userStartOffset - resourceTerritoryOffset);
                end.setMinutes(end.getMinutes() + userEndOffset - resourceTerritoryOffset);
            }

            servicesService.recentlyUsed[originalService.id] = true;

            if (changedService.snapToId) {
                changedService.ServiceAppointmentLastModifiedDate--;
            }

            // check the service we need to calculate travel to
            var calcTravelToLatitude = null,
                calcTravelToLongitude = null;

            if (changedService.snapToId) {

                var resourceServices = [],
                    maxDate = scheduler._events[changedService.snapToId].end || scheduler._events[changedService.snapToId].finish;

                for (var id in scheduler._events) {

                    if (id === changedService.id) {
                        continue;
                    }

                    var ev = scheduler._events[id];

                    if (ev.resourceId === changedService.resourceId && ev.type !== 'break' && ev.latitude && isIntersect(ev.start_date, ev.end_date, scheduler._min_date, maxDate)) {
                        resourceServices.push(id);
                    }
                }

                resourceServices.sort(function (a, b) {

                    // sort by times
                    if (scheduler._events[a].start > scheduler._events[b].start) {
                        return -1;
                    } else if (scheduler._events[a].start < scheduler._events[b].start) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                if (resourceServices.length > 0) {
                    calcTravelToLatitude = scheduler._events[resourceServices[0]].latitude;
                    calcTravelToLongitude = scheduler._events[resourceServices[0]].longitude;
                }
            }

            var relatedServiceId = null;

            // lock 2nd SA in immediately follow chain (only if not in o2)
            if (!changedService.isInO2Territory && changedService.isImmidietlyFollow && !window.__lockedServicesIds[changedService.id]) {

                window.__lockedServicesIds[changedService.id] = true;

                relatedServiceId = {
                    id: changedService.relatedService1 || changedService.relatedService2,
                    isFirst: !!changedService.relatedService1
                };

                if (TimePhasedDataService.serviceAppointments()[relatedServiceId.id]) {
                    window.__lockedServicesIds[relatedServiceId.id] = true;
                }
            }

            sfdcService.saveChangesToServiceAppointment(changedService.id, changedService.getGanttResource(showSecondarySTMs), changedService.resource, changedService.assignedResource, start, end, StateService.selectedPolicyId, changedService.scheduleMode, changedService.snapToId || null, changedService.snapToType || null, changedService.snapDirection || null, calcTravelToLatitude, calcTravelToLongitude, isFirstServiceOfConsecutive, isResizingService).then(function (updatedObjects) {

                if (scheduler._events[changedService.id + '_dummy']) {
                    scheduler.deleteEvent(changedService.id + '_dummy');
                }

                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.handleDeltaResponse(updatedObjects, shouldCheckRules);

                if (updatedObjects.ValidationError) {

                    window.__lockedServicesIds[changedService.id] = false;
                    if (_.isEmpty(originalService)) {
                        deffered.reject(['', changedService.eventBeforeDrag, updatedObjects.ValidationError]);
                    } else {
                        deffered.reject(['', originalService, updatedObjects.ValidationError]);
                    }
                } else {

                    // time to schedule 2nd service in immediately follow chain
                    if (relatedServiceId && relatedServiceId.id) {

                        var relatedServiceOnGantt = TimePhasedDataService.serviceAppointments()[relatedServiceId.id] || { id: relatedServiceId.id, scheduleMode: changedService.scheduleMode },
                            relatedServiceTemp = angular.copy(relatedServiceOnGantt),
                            justScheduledService = scheduler._events[changedService.id],
                            direction = relatedServiceId.isFirst ? 'left' : 'right',
                            relatedDurationInMinutes = utils.getServiceDurationInTheory(relatedServiceOnGantt) / 1000 / 60;

                        relatedServiceTemp.start_date = new Date(relatedServiceOnGantt.start);
                        relatedServiceTemp.end_date = new Date(relatedServiceOnGantt.start);
                        relatedServiceTemp.start_date.setMinutes(justScheduledService.start.getMinutes() + 1);
                        relatedServiceTemp.end_date.setMinutes(justScheduledService.start.getMinutes() + relatedDurationInMinutes + 1);

                        end = new Date(start);
                        end.setMinutes(end.getMinutes() + relatedDurationInMinutes);

                        sfdcService.saveChangesToServiceAppointment(relatedServiceTemp.id, changedService.getGanttResource(showSecondarySTMs), changedService.resource, null, start, end, StateService.selectedPolicyId, relatedServiceTemp.scheduleMode, changedService.id, 'service', direction, null, null).then(function () {
                            window.__lockedServicesIds[changedService.id] = false;
                            window.__lockedServicesIds[relatedServiceTemp.id] = false;

                            var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                            DeltaService.handleDeltaResponse(updatedObjects, shouldCheckRules);

                            deffered.resolve({});
                        });
                    } else {
                        deffered.resolve({});
                    }
                }
            }).catch(function (err) {

                window.__lockedServicesIds[changedService.id] = false;

                if (changedService.relatedService1) {
                    window.__lockedServicesIds[changedService.relatedService1] = false;
                }

                if (changedService.relatedService2) {
                    window.__lockedServicesIds[changedService.relatedService2] = false;
                }

                if (_.isEmpty(originalService)) {
                    deffered.reject([err, changedService.eventBeforeDrag, '' || err.message]);
                } else {
                    deffered.reject([err, originalService, '' || err.message]);
                }

                console.warn(err);
            });

            return deffered.promise;
        };

        // handle snapping
        servicesService.handleSnap = function (ev, e) {
            var isUnscheduled = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            // snap top
            if (e.ctrlKey) {

                var intersectingEvents = [];

                // get all intersecting objects
                for (var id in scheduler._events) {

                    var currentEvent = scheduler._events[id];

                    // only SA and NAs
                    if (currentEvent.type !== 'service' && currentEvent.type !== 'na') {
                        continue;
                    }

                    // not same obj or different resource
                    if (currentEvent.id.indexOf('dummy') > -1 || currentEvent.id === ev.id || ev.resourceId && currentEvent.resourceId.indexOf(ev.resourceId) === -1) {
                        continue;
                    }

                    if (isIntersect(currentEvent.start_date, currentEvent.end_date, ev.start_date, ev.end_date)) {
                        intersectingEvents.push(currentEvent);
                    }
                }

                intersectingEvents.sort(function (a, b) {
                    if (a.start > b.start) {
                        return 1;
                    }
                    if (a.start < b.start) {
                        return -1;
                    }
                    return 0;
                });

                var minimumLength = isUnscheduled ? 1 : 0;

                if (intersectingEvents.length > minimumLength) {

                    var startOfDragged = new Date(ev.start_date);

                    if (ev.travelTo) {
                        startOfDragged = startOfDragged.setSeconds(startOfDragged.getSeconds() + ev.travelTo);
                    }

                    var direction = 'right',
                        chooseIndex = intersectingEvents[0].isDummy ? 1 : 0;

                    if (startOfDragged < intersectingEvents[chooseIndex].start) {
                        direction = 'left';
                    }

                    var chooseI = 0;
                    if (intersectingEvents[0].isDummy) {
                        chooseI = 1;
                    }

                    if (intersectingEvents[chooseI]) {
                        ev.snapToId = intersectingEvents[chooseI].id;
                        ev.snapToType = intersectingEvents[chooseI].type;
                        ev.snapDirection = direction;
                    } else {
                        ev.snapToId = null;
                        ev.snapToType = null;
                        ev.snapDirection = null;
                    }
                } else {
                    ev.snapToId = null;
                    ev.snapToType = null;
                    ev.snapDirection = null;
                }
            }
        };

        // unschedule services by ids or locations (if ids are locations, specify start & finish)
        servicesService.unscheduleServices = function (ids, selectedPolicyId, start, finish) {

            var deferred = $q.defer(),
                functionToUnschedule = finish ? sfdcService.unscheduleServicesByLocationsId : sfdcService.unscheduleServicesByServicesId,
                servicesToCheckRules = null;

            // unscheduling by ids, need to get related now
            if (!finish) {
                servicesToCheckRules = utils.getRelatedServices(ids);
            }

            // Salesforce remote action
            functionToUnschedule(ids, selectedPolicyId, start, finish).then(function (unscheduleResult) {

                var parsedUpdatedObjects = {};

                // check if there is nothing to schedule
                if (unscheduleResult.nothingToUnschedule) {
                    deferred.resolve(unscheduleResult);
                    return;
                }

                var fslOpPromise = $q.defer();

                // check if big bulk of services
                if (unscheduleResult.fslOperation) {

                    MstResolver.getUpdates(unscheduleResult.fslOperation).then(function (fslOpResults) {

                        console.log(fslOpResults);
                        var servicesIdsToFetch = fslOpResults.fslOperation.result.services ? fslOpResults.fslOperation.result.services : ids;

                        sfdcService.callRemoteAction(RemoteActions.getServicesById, servicesIdsToFetch).then(function (fetchedServcices) {

                            TimePhasedDataService.updateTimePhaseData(fetchedServcices, 'service').services;

                            fslOpPromise.resolve({
                                services: fetchedServcices,
                                resourceAbsences: [],
                                resourceCapacities: [],
                                failedResults: fslOpResults.fslOperation.result.failedResults ? fslOpResults.fslOperation.result.failedResults : {}
                            });
                        });
                    }).catch(function (ex) {
                        var rejectObject = typeof ex === 'string' ? { eventType: 'exception', message: ex } : ex;
                        fslOpPromise.reject(rejectObject);
                    });
                } else {
                    fslOpPromise.resolve(unscheduleResult);
                }

                fslOpPromise.promise.then(function (unscheduleResult) {

                    // parse reply
                    parsedUpdatedObjects.absences = TimePhasedDataService.updateTimePhaseData(unscheduleResult.resourceAbsences, 'na', true).absences;
                    parsedUpdatedObjects.services = TimePhasedDataService.updateTimePhaseData(unscheduleResult.services, 'service', true).services;
                    parsedUpdatedObjects.capacities = TimePhasedDataService.updateTimePhaseData(unscheduleResult.resourceCapacities, 'capacity').capacities;
                    parsedUpdatedObjects.failedResults = unscheduleResult.failedResults;

                    servicesService.drawServicesAndAbsences(parsedUpdatedObjects.services, parsedUpdatedObjects.absences);

                    // check rules (if ids) - checking only if mode is not "On Demand"
                    !finish && window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(servicesToCheckRules).then(servicesService.drawViolationsOnGantt);

                    // check rules (if locations) - checking only if mode is not "On Demand"
                    finish && window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(utils.getServicesOfLocations(ids, start, finish)).then(servicesService.drawViolationsOnGantt);

                    var title = void 0,
                        message = void 0;

                    // add notification (only 1 service was unscheduled)
                    if (ids.length === 1 && !finish) {

                        var name = TimePhasedDataService.serviceAppointments()[ids[0]].name;

                        if (!TimePhasedDataService.serviceAppointments()[ids[0]].isScheduled()) {
                            title = customLabels.was_unscheduled.replaceAll(name);
                            message = customLabels.was_unscheduled_successfully.replaceAll(name);
                        } else {
                            title = customLabels.Couldnt_unschedule.replaceAll(name);
                            message = customLabels.Couldnt_unschedule.replaceAll(name) + '. ' + unscheduleResult.failedResults[ids[0]].errorMessage;
                        }

                        utils.addNotification(title, message, function () {
                            servicesService.recentlyUsed[ids[0]] = true;
                            ServiceAppointmentLightboxService.open(ids[0]);
                        });
                    }

                    // multiple services were unscheduled
                    else {

                            var unscheduledIds = [],
                                stillScheduledIds = [];

                            // by location: check what was scheduled and what wasn't
                            if (finish) {

                                unscheduleResult.services.forEach(function (service) {
                                    if (unscheduleResult.failedResults[service.Id] && TimePhasedDataService.serviceAppointments()[service.Id].isScheduled()) {
                                        stillScheduledIds.push(service.Id);
                                    } else {
                                        unscheduledIds.push(service.Id);
                                    }
                                });
                            }

                            // by ids
                            else {

                                    ids.forEach(function (id) {
                                        if (TimePhasedDataService.serviceAppointments()[id].isScheduled()) {
                                            stillScheduledIds.push(id);
                                        } else {
                                            unscheduledIds.push(id);
                                        }
                                    });
                                }

                            title = customLabels.x_services_were_unscheduled.replaceAll(unscheduledIds.length);

                            // by ids
                            if (!finish) {
                                message = customLabels.x_services_were_unscheduled_out_of_y.replaceAll(unscheduledIds.length, unscheduledIds.length, ids.length);
                            }
                            // by locations
                            else {
                                    message = customLabels.x_services_were_unscheduled_out_of_y.replaceAll(unscheduledIds.length, unscheduledIds.length, stillScheduledIds.length + unscheduledIds.length);
                                }

                            // if some services failed to unschedule
                            if (stillScheduledIds.length > 0) {
                                var failedTooltip = stillScheduledIds.map(function (id) {
                                    return TimePhasedDataService.serviceAppointments()[id].name;
                                }).join(', ');
                                message += '<div title=\'' + failedTooltip + '\' class=\'dashedBorder\' style=\'display:inline-block;\'> ' + customLabels.failed_to_unschedule.replaceAll(stillScheduledIds.length) + '. ' + customLabels.View_services + '</div>';
                            }

                            var butlerUnscheduleResult = angular.copy(unscheduleResult),
                                newUnscheduledServices = [];
                            butlerUnscheduleResult.services.forEach(function (obj) {

                                if (!finish) {
                                    for (var i = 0; i < ids.length; i++) {
                                        if (obj.Id === ids[i]) {
                                            newUnscheduledServices.push(obj);
                                        }
                                    }
                                }

                                // by location
                                else {
                                        if (!obj.Fields.SchedStartTime) {
                                            newUnscheduledServices.push(obj);
                                        }
                                    }
                            });

                            butlerUnscheduleResult.services = newUnscheduledServices;

                            // add notification
                            utils.addNotification(title, message, function () {
                                var labelsForResults = { success: customLabels.SuccessfullyUnscheduled, fail: customLabels.FailToUnschedule };
                                bulkResultsService.open(butlerUnscheduleResult, labelsForResults);
                            });
                        }

                    deferred.resolve(parsedUpdatedObjects);
                });
            }).catch(function (err) {
                deferred.reject(err);
                console.warn(err);
            });

            return deferred.promise;
        };

        servicesService.drawServicesAndAbsences = function () {
            var services = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
            var absences = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            var deletedIds = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
            var capacities = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];


            // don't do a thing if arrays are empty
            if (services.length === 0 && absences.length === 0 && deletedIds.length === 0 && capacities.length === 0) {
                return;
            }

            var mergedGanttObjects = void 0,
                servicesMap = {},
                absencesMap = {},
                capacitiesMap = {},
                returnObject = {
                scheduledServices: [],
                unscheduledServices: [],
                deletedIds: deletedIds
            };

            // make a map if services/absences/capacities is array
            if (Array.isArray(services)) {
                services.forEach(function (ganttEvent) {
                    return servicesMap[ganttEvent.id || ganttEvent.Id] = ganttEvent instanceof GanttService ? ganttEvent : new GanttService(ganttEvent);
                });
            } else {
                servicesMap = services;
            }

            if (Array.isArray(absences)) {
                absences.forEach(function (ganttEvent) {
                    return absencesMap[ganttEvent.id || ganttEvent.Id] = ganttEvent;
                });
            } else {
                absencesMap = absences;
            }

            if (Array.isArray(capacities)) {
                capacities.forEach(function (ganttEvent) {
                    return capacitiesMap[ganttEvent.id || ganttEvent.Id] = ganttEvent;
                });
            } else {
                capacitiesMap = capacities;
            }

            mergedGanttObjects = angular.extend({}, servicesMap, absencesMap, capacitiesMap);

            // set gantt resourceId based on timephase objects
            for (var id in mergedGanttObjects) {

                var ganttEvent = mergedGanttObjects[id];

                if (setObjectOnGantt(ganttEvent)) {
                    returnObject.scheduledServices.push(ganttEvent);
                } else {
                    returnObject.unscheduledServices.push(ganttEvent);
                }
            }

            // delete if needed
            deletedIds.forEach(function (id) {
                return delete scheduler._events[id];
            });

            // draw
            if (returnObject.scheduledServices.length > 0) {
                scheduler.parse(returnObject.scheduledServices, 'json');
            } else {

                // update view only if something changes
                for (var _key in returnObject) {
                    if (Array.isArray(returnObject[_key]) && returnObject[_key].length > 0) {
                        updateViewDebounced();
                        break;
                    }
                }
            }

            return returnObject;
        };

        // updates object to display on gantt. returns false if unscheduled and true if scheduled
        function setObjectOnGantt(ganttObject) {

            // hide bundleMember from gantt

            if (BundleService.isActive() && BundleService.isBundleMember(ganttObject)) {

                if (scheduler._events[ganttObject.id]) {
                    delete scheduler._events[ganttObject.id];
                }

                return false;
            }

            // check if scheduled (must be a service... absences must have a resource)
            if (!ganttObject.isScheduled()) {

                // service got unscheduled
                if (scheduler._events[ganttObject.id]) {
                    delete scheduler._events[ganttObject.id];
                }

                return false;
            }

            // set the GANTT resource id based on timephase
            ganttObject.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);

            return true;
        }

        // change the dispatch status to dispatched or canceled
        servicesService.changeStatus = function (ids, status, start, finish) {
            var force = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;


            var deferred = $q.defer(),
                functionToChangeStatus = finish ? sfdcService.changeStatusServicesByLocationsId : sfdcService.changeStatusServicesByServicesId;

            functionToChangeStatus(ids, status, start, finish).then(function (changeStatusResult) {

                var parsedUpdatedObjects = {};

                // check if there is nothing to schedule
                if (changeStatusResult.nothingToDispatch) {
                    deferred.resolve(changeStatusResult);
                    return;
                }

                var fslOpPromise = $q.defer();

                // check if big bulk of services
                if (changeStatusResult.fslOperation) {
                    MstResolver.getUpdates(changeStatusResult.fslOperation).then(function (fslOpResults) {

                        console.log(fslOpResults);
                        var servicesIdsToFetch = fslOpResults.fslOperation.result.services ? fslOpResults.fslOperation.result.services : ids;

                        sfdcService.callRemoteAction(RemoteActions.getServicesById, servicesIdsToFetch).then(function (fetchedServcices) {

                            // TimePhasedDataService.updateTimePhaseData(fetchedServcices, 'service', force).services;

                            fslOpPromise.resolve({
                                services: fetchedServcices,
                                failedResults: fslOpResults.fslOperation.result.failedResults ? fslOpResults.fslOperation.result.failedResults : {}
                            });
                        });
                    }).catch(function (ex) {
                        var rejectObject = typeof ex === 'string' ? { eventType: 'exception', message: ex } : ex;
                        fslOpPromise.reject(rejectObject);
                    });
                } else {
                    fslOpPromise.resolve(changeStatusResult);
                }

                fslOpPromise.promise.then(function (changeStatusResult) {

                    // parse reply
                    parsedUpdatedObjects.services = TimePhasedDataService.updateTimePhaseData(changeStatusResult.services, 'service', force).services;
                    parsedUpdatedObjects.failedResults = changeStatusResult.failedResults;

                    var title = void 0,
                        message = void 0;

                    // add notification (only 1 service was dispatched)
                    if (ids.length === 1 && !finish) {

                        var name = TimePhasedDataService.serviceAppointments()[ids[0]].name;

                        if (TimePhasedDataService.serviceAppointments()[ids[0]].status !== status && changeStatusResult.failedResults && !utils.isEmpty(changeStatusResult.failedResults)) {
                            title = customLabels.could_not_change_title.replaceAll(name);
                            message = customLabels.could_not_change_status.replaceAll(name, utils.statusTranslations[status], changeStatusResult.failedResults[ids[0]].errorMessage);
                            utils.addNotification(title, message, function () {
                                ServiceAppointmentLightboxService.open(ids[0]);
                            });
                        }

                        servicesService.recentlyUsed[ids[0]] = true;
                    }

                    // multiple services were dispatched
                    else {

                            var notDispatchedIds = [],
                                gotDispatchedIds = [];

                            // by location: check what was changed and what wasn't
                            if (finish) {

                                changeStatusResult.services.forEach(function (service) {
                                    if (TimePhasedDataService.serviceAppointments()[service.Id].status !== status) {
                                        notDispatchedIds.push(service.Id);
                                    } else {
                                        gotDispatchedIds.push(service.Id);
                                    }
                                });
                            }

                            // by ids
                            else {

                                    ids.forEach(function (id) {
                                        if (TimePhasedDataService.serviceAppointments()[id].status === status) {
                                            gotDispatchedIds.push(id);
                                        } else {
                                            notDispatchedIds.push(id);
                                        }
                                    });
                                }

                            title = customLabels.x_services_were_changed.replaceAll(gotDispatchedIds.length, utils.statusTranslations[status] || status);
                            message = customLabels.x_services_were_changed_out_of_y.replaceAll(gotDispatchedIds.length, gotDispatchedIds.length, gotDispatchedIds.length + notDispatchedIds.length, utils.statusTranslations[status] || status);

                            // if some services failed
                            if (notDispatchedIds.length > 0) {
                                var failedTooltip = notDispatchedIds.map(function (id) {
                                    return TimePhasedDataService.serviceAppointments()[id].name;
                                }).join(', '),
                                    failedLabel = customLabels.failed_to_change_status.replaceAll(notDispatchedIds.length);

                                message += '<div title=\'' + failedTooltip + '\' class=\'dashedBorder\' style=\'display:inline-block;\'> ' + failedLabel + '. ' + customLabels.View_services + '</div>';
                            }

                            // add notification
                            utils.addNotification(title, message, function () {
                                var labelsForResults = { success: customLabels.SuccessfullyDispatched, fail: customLabels.FailToDispatch };
                                bulkResultsService.open(changeStatusResult, labelsForResults);
                            });
                        }

                    deferred.resolve(parsedUpdatedObjects);
                });
            }).catch(function (err) {
                deferred.reject(err);
                console.warn(err);
            });

            return deferred.promise;
        };

        // change pin
        servicesService.changePin = function (ids, newPin) {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.changePins, ids, newPin).then(function (pinnedServices) {
                var pinnedField = fieldNames.Service_Appointment.pinned;
                pinnedServices.forEach(function (service) {
                    return TimePhasedDataService.serviceAppointments()[service.Id].pinned = service[pinnedField];
                });
                deferred.resolve();
            }).catch(function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message, null, null);
                deferred.reject(err);
                console.warn(err);
            });

            return deferred.promise;
        };

        // set service appointments as in jeopardy
        servicesService.setInJeopardy = function (ids) {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.setServiceAppointmentsInJeopardy, ids).then(function (jeopardyServices) {

                jeopardyServices.forEach(function (service) {
                    return TimePhasedDataService.serviceAppointments()[service.Id].jeopardy = service[fieldNames.Service_Appointment.InJeopardy__c];
                });

                // add notification
                utils.addNotification(customLabels.Update_for_service, customLabels.Appointments_marked.replace('$0', customLabels.In_Jeopardy).replace('$1', jeopardyServices.length));
                deferred.resolve();
            }).catch(function (err) {
                deferred.reject(err);
                console.warn(err);
            });

            return deferred.promise;
        };

        // update violation UI only if needed
        servicesService.drawViolationsOnGantt = function (violations) {
            updateViewDebounced();
        };

        servicesService.searchServiceByIdOrName = function (str) {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.searchServiceByIdOrName, str).then(function (service) {

                if (service === null) {
                    deferred.resolve(null);
                } else {

                    var parsedServices = TimePhasedDataService.updateTimePhaseData(service, 'service');

                    if (parsedServices.services && parsedServices.services.length > 0) {
                        servicesService.drawServicesAndAbsences(parsedServices.services);
                    }
                    deferred.resolve(service[0].Id);
                }
            }).catch(function (err) {
                deferred.reject(err);
                console.warn(err);
            });

            return deferred.promise;
        };

        var splitServicesToBulks = function splitServicesToBulks(servicesIds) {
            var result = [];
            for (var i = 0; i < servicesIds.length; i += numberOfServicesToLoadInEachBulk) {
                result.push(servicesIds.slice(i, i + numberOfServicesToLoadInEachBulk));
            }
            return result;
        };

        servicesService.getServicesById = async function (servicesIdsToFetch) {
            var deferred = $q.defer();

            var servicesIdsToReturn = [];

            var uniqueServicesArray = [].concat(_toConsumableArray(new Set(servicesIdsToFetch)));

            var servicesIdsInBulks = splitServicesToBulks(uniqueServicesArray);

            try {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = servicesIdsInBulks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var servicesBulk = _step.value;


                        var fetchedServices = await sfdcService.callRemoteAction(RemoteActions.getServicesById, servicesBulk);
                        var parsedServices = TimePhasedDataService.updateTimePhaseData(fetchedServices, 'service');

                        if (parsedServices.services && parsedServices.services.length > 0) {
                            servicesService.drawServicesAndAbsences(parsedServices.services);
                        }

                        var serviceIdsFromServer = fetchedServices.map(function (s) {
                            return s.Id;
                        });

                        servicesIdsToReturn = [].concat(_toConsumableArray(servicesIdsToReturn), _toConsumableArray(serviceIdsFromServer));

                        // update push service cache
                        if (PushServices.isPushServiceActive()) {
                            PushServices.updateSession({ services: serviceIdsFromServer, operation: PushServices.MESSAGE_OPERATIONS.UPDATE });
                        }

                        servicesIdsToReturn = [].concat(_toConsumableArray(servicesIdsToReturn), _toConsumableArray(fetchedServices.map(function (s) {
                            return s.Id;
                        })));
                    }
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

                deferred.resolve(servicesIdsToReturn);
            } catch (err) {
                console.warn(err);
                deferred.reject(err);
            }

            return deferred.promise;
        };

        return servicesService;
    }]);
})();