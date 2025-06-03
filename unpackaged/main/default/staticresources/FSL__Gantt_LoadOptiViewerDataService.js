'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

(function () {

    LoadOptiViewerDataService.$inject = ['$compile', '$rootScope', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'StateService', 'TimePhasedDataService', 'SERVICE_STATUS', 'sfdcService', 'utils', '$injector', 'calendarsService', 'ResourceCrewsService', 'ResourceCapacitiesService', 'HolidayService', '$http'];

    angular.module('serviceExpert').factory('LoadOptiViewerDataService', LoadOptiViewerDataService);

    function LoadOptiViewerDataService($compile, $rootScope, ResourcesAndTerritoriesService, userSettingsManager, StateService, TimePhasedDataService, SERVICE_STATUS, sfdcService, utils, $injector, calendarsService, ResourceCrewsService, ResourceCapacitiesService, HolidayService, $http) {

        var $scope = null,
            resourcesAndTerritories = {},
            resourcesAndShifts = {},
            resourceToServiceCrewMembers = {},
            crewToServiceCrewMembers = {},
            serviceCrewMembers = {},
            currentCrewToShow = {},
            _i_OptimizationRequestName = void 0,
            i_OptimizationRequestId = void 0,
            i_OptReqTransactionId = void 0,
            isO2Request = function isO2Request() {
            return i_OptReqTransactionId != null;
        },
            _isOptimizationLoaded = false,
            _isShowingOutputJson = false,
            fetchDataFileName = 'fetchData.json',
            sfsResponseFileName = 'sfsResponse.json';
        var objectsToBroadcast = {
            resourcesAndTerritories: resourcesAndTerritories,
            resourcesByPrimariesAndRelocations: {},
            resourceOperatingHours: {},
            serviceAppointments: {},
            resourceAbsences: {},
            resourceCapacities: {},
            resourcesAndShifts: resourcesAndShifts,
            serviceCrewMembers: serviceCrewMembers,
            operatingHoursAndHolidays: {},
            start: {},
            finish: {},
            resourceToServiceCrewMembers: resourceToServiceCrewMembers,
            crewToServiceCrewMembers: crewToServiceCrewMembers,
            currentCrewToShow: currentCrewToShow
        };

        //RTL support
        var isRtlDirection = StateService.isRtlDirection();

        // open the UI
        function open() {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            $scope.loadOptimizationRequestInput = loadOptimizationRequestInput;
            $scope.selectedOptimizationRequest = "";
            $scope.currentResults = [];

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#BulkActionsLightbox').draggable({ containment: 'document', handle: '#UnschduleLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            // close the UI
            $scope.closeLightbox = closeLightbox;

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            lightboxDomElement.show();
            StateService.setLightBoxStatus(); // set lightbox state to open
            $scope.ShowAllRelevantOptimizationRequests = function ShowAllRelevantOptimizationRequests(searchText) {
                sfdcService.callRemoteAction(RemoteActions.ShowAllRelevantOptimizationRequests, searchText).then(function (data) {
                    if (data) {
                        $scope.currentResults = data;
                        $scope.Errors = [];
                    }
                });
            };
            $scope.ShowAllRelevantOptimizationRequests('last 20');
            $scope.updateSearchText = function (text) {
                $scope.selectedOptimizationRequest = text;
                $scope.currentResults = [];
            };
            var $timeout = $injector.get('$timeout');
            $scope.loseFocusWithDelay = function () {
                $timeout(function () {
                    $scope.SearchBoxInFocus = false;
                }, 200);
            };
            $scope.SearchBoxInFocus = false;
            $scope.Errors = [];

            $scope.GetO2FilesFromAWS = function GetO2FilesFromAWS(isCustomerFacingRequest) {
                sfdcService.callRemoteAction(RemoteActions.O2FetchFiles, i_OptimizationRequestId, isCustomerFacingRequest).then(function (data) {
                    console.log('O2FetchFiles results:');
                    console.log(data);
                });
            };
        }

        // close lightbox
        function closeLightbox() {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
        }

        //used to fix the dates in the Input Json to new Date(jsonDateString).getTime()
        //sobjectType could be one of the following: 'ServiceAppointment', 'ResourceAbsence', 'Shift'
        function fixJSONdateTimeStrings(sobject, sobjectType) {
            var ServiceAppointmentDateTimeFields = ['ArrivalWindowStartTime', 'ArrivalWindowEndTime', 'EarliestStartTime', 'DueDate', 'SchedStartTime', 'SchedEndTime', 'Gantt_Display_Date__c'],
                resourceAbsenceDateTimeFields = ['Start', 'End'],
                shiftDateTimeFields = ['StartTime', 'EndTime'],
                ServiceResourceCapacityDateFields = ['EndDate', 'StartDate'],
                ServiceCrewMemberDateFields = ['StartDate', 'EndDate'],
                arrayToIterate = void 0;

            switch (sobjectType) {
                case 'ServiceAppointment':
                    arrayToIterate = ServiceAppointmentDateTimeFields;
                    break;
                case 'ResourceAbsence':
                    arrayToIterate = resourceAbsenceDateTimeFields;
                    break;
                case 'Shift':
                    arrayToIterate = shiftDateTimeFields;
                    break;
                case 'ServiceResourceCapacity':
                    arrayToIterate = ServiceResourceCapacityDateFields;
                    break;
                case 'ServiceCrewMember':
                    arrayToIterate = ServiceCrewMemberDateFields;
                    break;
                default:
                    return;
            }

            arrayToIterate.forEach(function (field) {
                if (!sobject[field]) return; //return statement is acting like a continue statement since this is a callback function
                sobject[field] = fixDateTimeString(sobject[field]);
            });

            function fixDateTimeString(jsonDateString) {
                if (!jsonDateString) return null;
                return new Date(jsonDateString).getTime();
            }
        }

        function getTimezoneStringBySRST(start, finish, defaultTerritoryTz, srstList) {
            if (!start || !finish || !srstList) return defaultTerritoryTz;

            var srst = getIntersectingSRST(start, finish, srstList);

            if (srst) {
                return srst.serviceTerritory__r.OperatingHours.TimeZone;
            }

            return null;
        }

        function getIntersectingSRST(start, finish, srstList) {
            var srstToReturn = void 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = Object.entries(srstList)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _step$value = _slicedToArray(_step.value, 2),
                        key = _step$value[0],
                        srst = _step$value[1];

                    if (isIntersect(changeDatesAccordingToTimezone(start, srst.timezone), changeDatesAccordingToTimezone(finish, srst.timezone), srst.effectiveStartDate, srst.effectiveEndDate)) {
                        srstToReturn = srst;
                    }
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

            ;
            return srstToReturn;
        }

        function changeDatesAccordingToTimezone(date, timezone) {
            if (!date || useLocationTimezone && !timezone) {
                return date;
            }
            var offset = useLocationTimezone ? -moment.tz.zone(timezone).utcOffset(utils.convertDtToMomentDt(new Date(date), timezone).valueOf()) : utils.getUserOffset(new Date(date));
            return date + offset * 60 * 1000; //+ utils.getUserOffset(new Date(date))*60*1000
        }

        function changeSObjectDateAccordingToTimeZone(sobject, sobjectName, timezone) {
            var ServiceAppointmentDateTimeFields = ['ArrivalWindowStartTime', 'ArrivalWindowEndTime', 'EarliestStartTime', 'DueDate', 'SchedStartTime', 'SchedEndTime', 'Gantt_Display_Date__c'],
                resourceAbsenceDateTimeFields = ['Start', 'End'],
                shiftDateTimeFields = ['StartTime', 'EndTime'],
                ServiceResourceCapacityDateFields = ['EndDate', 'StartDate'],
                arrayToIterate = void 0;

            switch (sobjectName) {
                case 'ServiceAppointment':
                    arrayToIterate = ServiceAppointmentDateTimeFields;
                    break;
                case 'ResourceAbsence':
                    arrayToIterate = resourceAbsenceDateTimeFields;
                    break;
                case 'Shift':
                    arrayToIterate = shiftDateTimeFields;
                    break;
                case 'ServiceResourceCapacity':
                    arrayToIterate = ServiceResourceCapacityDateFields;
                    break;
                default:
                    return;
            }

            arrayToIterate.forEach(function (field) {
                if (!sobject[field]) return; //return statement is acting like a continue statement since this is a callback function
                sobject[field] = changeDatesAccordingToTimezone(sobject[field], timezone);
            });
        }

        function findTimeZoneForResourceAbsence(ResourceAbsence) {
            var serviceResourceToSTM = resourcesAndTerritories[ResourceAbsence.ResourceId],
                srst = getIntersectingSRST(ResourceAbsence.Start, ResourceAbsence.End, serviceResourceToSTM);

            if (srst) {
                return srst.serviceTerritory__r.OperatingHours.TimeZone;
            }

            return null;
        }

        function handleServiceConversion(service) {

            fixJSONdateTimeStrings(service, 'ServiceAppointment');
            service.AppointmentNumber = service.Id;

            var assignedResources = service.ServiceResources ? service.ServiceResources.records : false;
            if (assignedResources) {
                var serviceResourceToSTM = resourcesAndTerritories[assignedResources[0].ServiceResourceId],
                    IsAssignToCrew = false;

                if (assignedResources.length > 1) {
                    assignedResources.forEach(function (ar) {
                        if (ar.ServiceResource.ResourceType === 'C') {
                            IsAssignToCrew = true;
                            serviceResourceToSTM = resourcesAndTerritories[ar.ServiceResourceId];
                        }
                    });
                }

                service.IsAssignToCrew = IsAssignToCrew;
                service.ResourceContractor = serviceResourceToSTM && serviceResourceToSTM[Object.keys(serviceResourceToSTM)[0]].IsCapacityBased;

                var timezone = getTimezoneStringBySRST(service.SchedStartTime, service.SchedEndTime, service.ServiceTerritory ? service.ServiceTerritory.OperatingHours.TimeZone : null, serviceResourceToSTM);
                changeSObjectDateAccordingToTimeZone(service, 'ServiceAppointment', timezone);
            } else if (service.ServiceTerritory) {
                changeSObjectDateAccordingToTimeZone(service, 'ServiceAppointment', service.ServiceTerritory.OperatingHours.TimeZone);
            } else {
                changeSObjectDateAccordingToTimeZone(service, 'ServiceAppointment', null);
            }

            objectsToBroadcast.serviceAppointments[service.Id] = new GanttServiceOptiViewer(service);
        }

        function handleAbsenceConversion(Absence, isLunchBreak) {
            fixJSONdateTimeStrings(Absence, 'ResourceAbsence');
            Absence['RecordType'] = isLunchBreak ? { DeveloperName: 'Break' } : { DeveloperName: 'Non_Availability' };
            var timezone = findTimeZoneForResourceAbsence(Absence);
            changeSObjectDateAccordingToTimeZone(Absence, 'ResourceAbsence', timezone);
            objectsToBroadcast.resourceAbsences[Absence.Id] = new ResourceAbsence(Absence);
        }

        // run unschedule
        function loadOptimizationRequestInput(OptimizationRequestName) {
            sfdcService.callRemoteAction(RemoteActions.LoadInputDataToOptimizationViewer, OptimizationRequestName).then(async function (data) {
                //reset objectsToBroadcast before we reload the 'before optimization' gantt
                objectsToBroadcast = {
                    resourcesAndTerritories: resourcesAndTerritories,
                    resourcesByPrimariesAndRelocations: {},
                    resourceOperatingHours: {},
                    serviceAppointments: {},
                    resourceAbsences: {},
                    resourceCapacities: {},
                    resourcesAndShifts: resourcesAndShifts,
                    serviceCrewMembers: serviceCrewMembers,
                    operatingHoursAndHolidays: {},
                    start: {},
                    finish: {},
                    resourceToServiceCrewMembers: resourceToServiceCrewMembers,
                    crewToServiceCrewMembers: crewToServiceCrewMembers,
                    currentCrewToShow: currentCrewToShow
                };
                $scope.Errors = [];
                _i_OptimizationRequestName = OptimizationRequestName;
                i_OptimizationRequestId = data && data['id'];
                i_OptReqTransactionId = null;
                if (!data || !data.Territories) {
                    //check if this is an O2 request and return fetchData.json if exist.
                    if (data['transaction-id'] != null) {
                        i_OptReqTransactionId = data['transaction-id'];
                        if (data['hasAttachments'] == 'Yes') {
                            $scope.showO2FetchFilesButton = false;
                            var queryURL = window.location.origin + '/services/data/v56.0/query?q=SELECT+body+from+attachment+where+parentId=\'' + i_OptimizationRequestId + '\'+AND+name=\'' + fetchDataFileName + '\'';
                            var GetRequestconfig = { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionId } };
                            var queryResponse = await $http.get(queryURL, GetRequestconfig);
                            var AttachmentBody = await $http.get('' + window.location.origin + queryResponse.data.records[0].Body, GetRequestconfig);
                            parseInputJson(AttachmentBody.data, data);
                            return;
                        } else {
                            $scope.showO2FetchFilesButton = true;
                            return;
                        }
                    }
                    !$scope.showO2FetchFilesButton && $scope.Errors.push("no data!");
                    return;
                } else {
                    parseInputJson(data);
                }
            }).then(function () {
                if ($scope.Errors.length > 0) return;
                $rootScope.$broadcast('gotNewTimePhasedSTMsAndShifts', objectsToBroadcast);
            }).then(function () {
                if ($scope.Errors.length > 0) return;
                $rootScope.$broadcast('gotNewTimePhasedObjects', objectsToBroadcast);
            }).then(function () {
                if ($scope.Errors.length > 0) return;
                // monthlyViewHelperService.updateMonthlyCapacity();//need to handle this for all relevant gantt objects
                var start = objectsToBroadcast.start;
                start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0);
                scheduler.setCurrentView(start);
                _isOptimizationLoaded = true;
                _isShowingOutputJson = false;
            }).then(function () {
                if ($scope.Errors.length == 0) closeLightbox();
            });
        }

        function parseInputJson(data, remoteActionResponse) {
            var monthlyViewHelperService = $injector.get('monthlyViewHelperService');
            var territoriesToTimezones = {};
            data.Territories.forEach(function (territory) {
                territoriesToTimezones[territory.Id] = territory;
            });

            data.Resources && data.Resources.forEach(function (resource) {
                resourcesAndTerritories[resource.Id] = resourcesAndTerritories[resource.Id] || {};
                resource.ServiceTerritories.records.forEach(function (stm) {
                    var resAndTerrOptiViewer = new ResourcesAndTerritoriesOptiViewer(resource, stm, territoriesToTimezones);
                    resourcesAndTerritories[resource.Id][stm.Id] = resAndTerrOptiViewer;
                    if (resAndTerrOptiViewer.serviceTerritoryType !== 'S') {
                        objectsToBroadcast.resourcesByPrimariesAndRelocations[resource.Id] = objectsToBroadcast.resourcesByPrimariesAndRelocations[resource.Id] || {};
                        objectsToBroadcast.resourcesByPrimariesAndRelocations[resource.Id][stm.Id] = resAndTerrOptiViewer;
                    }
                });
                resource.ShiftServiceResources && resource.ShiftServiceResources.records.forEach(function (shift) {
                    fixJSONdateTimeStrings(shift, 'Shift');
                    var timezone = territoriesToTimezones[shift.ServiceTerritoryId] || getTimezoneStringBySRST(shift.StartTime, shift.EndTime, null, resourcesAndTerritories[shift.ServiceResourceId]);
                    changeSObjectDateAccordingToTimeZone(shift, 'Shift', timezone);
                    var parsedShift = new Shift(shift);

                    if (!resourcesAndShifts[shift.ServiceResourceId]) {
                        resourcesAndShifts[shift.ServiceResourceId] = {};
                    }

                    if (!resourcesAndShifts[shift.ServiceResourceId][utils.formatDayToString(parsedShift.startTime)]) resourcesAndShifts[shift.ServiceResourceId][utils.formatDayToString(parsedShift.startTime)] = [];

                    resourcesAndShifts[shift.ServiceResourceId][utils.formatDayToString(parsedShift.startTime)].push(parsedShift);
                });

                resource.ServiceCrewMembers && resource.ServiceCrewMembers.records.forEach(function (scm) {

                    //     // object not modified // TODO OMRI CREWS - add last modified field
                    //     // if (serviceCrewMembers[scm.Id] && scm.LastModifiedDate === serviceCrewMembers[scm.Id].lastModifiedDate) {
                    //     //     return;
                    //     // }
                    fixJSONdateTimeStrings(scm, 'ServiceCrewMember');
                    serviceCrewMembers[scm.Id] = new ServiceCrewMember(scm);

                    if (!resourceToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceResource]) {
                        resourceToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceResource] = {};
                    }

                    if (!crewToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceCrew]) {
                        crewToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceCrew] = {};
                    }

                    crewToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceCrew][scm.Id] = serviceCrewMembers[scm.Id];
                    resourceToServiceCrewMembers[serviceCrewMembers[scm.Id].serviceResource][scm.Id] = serviceCrewMembers[scm.Id];
                    if ($rootScope.crewViewActive) {

                        var crewId;
                        currentCrewToShow = $rootScope.currentCrewToShow;
                        for (var resourceId in currentCrewToShow) {
                            if (currentCrewToShow[resourceId].serviceCrew) {
                                crewId = currentCrewToShow[resourceId].serviceCrew;
                                break;
                            }
                        }
                        if (scm.ServiceCrewId === crewId) {

                            if (!currentCrewToShow[scm.ServiceResourceId]) {

                                currentCrewToShow[scm.ServiceResourceId] = ResourcesAndTerritoriesService.getResources()[scm.ServiceResourceId];
                            }
                            if (currentCrewToShow[scm.ServiceResourceId].members === undefined) {
                                currentCrewToShow[scm.ServiceResourceId].members = {};
                            }
                            currentCrewToShow[scm.ServiceResourceId].members[scm.Id] = serviceCrewMembers[scm.Id];
                        }
                    }
                });
            });
            data.Services && data.Services.forEach(function (service) {
                handleServiceConversion(service);
            });

            data.Breaks && data.Breaks.forEach(function (lunchBreak) {
                handleAbsenceConversion(lunchBreak, true);
            });
            data.NonAvailabilities && data.NonAvailabilities.forEach(function (nonAvailability) {
                handleAbsenceConversion(nonAvailability, false);
            });
            data.Capacities && data.Capacities.forEach(function (capacity) {
                fixJSONdateTimeStrings(capacity, 'ServiceResourceCapacity');
                // let relevantSTM = getIntersectingSRST(capacity.StartDate,capacity.EndDate,resourcesAndTerritories[capacity.ServiceResourceId]);
                // let timezone =  relevantSTM ? relevantSTM.serviceTerritory__r.OperatingHours.TimeZone : null;
                // changeSObjectDateAccordingToTimeZone(capacity,'ServiceResourceCapacity',timezone);
                objectsToBroadcast.resourceCapacities[capacity.Id] = new ResourceCapacity(capacity);
                // //set capacity times according to user tz
                // if (!useLocationTimezone) {
                //     TimePhasedDataService.setResourceCapacityOffset(objectsToBroadcast.resourceCapacities[capacity.Id]);
                // }
            });

            var start = new Date(data['start'] || remoteActionResponse['start']),
                finish = new Date(data['finish'] || remoteActionResponse['finish']);

            objectsToBroadcast.start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 0, 0);
            objectsToBroadcast.finish = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate() + 1, 23, 59);
            TimePhasedDataService.updateObjectsForOptimizationViewer(objectsToBroadcast);
            ResourcesAndTerritoriesService.getResourceAndTerritoriesFromJson(data, function resetObjects() {

                // reset monthly
                monthlyViewHelperService.reset();

                // reset resource and territories
                ResourcesAndTerritoriesService.reset();

                // reset all gantt events
                scheduler._events = {};
                // delete all calendars, relocations...
                scheduler.deleteMarkedTimespan();

                // calendars, relocations... crew members... capacity white markings...
                calendarsService.reset();
                ResourceCrewsService.reset();
                ResourceCapacitiesService.reset();
                HolidayService.reset();
            });
        }

        function loadOptimizationResponseOutput() {
            sfdcService.callRemoteAction(RemoteActions.LoadOutputDataToOptimizationViewer, _i_OptimizationRequestName).then(async function (data) {
                // console.log('Output Json Data...');
                // console.log(data);
                if (!data || data.length == 0) {
                    if (isO2Request) {
                        var queryURL = window.location.origin + '/services/data/v56.0/query?q=SELECT+body+from+attachment+where+parentId=\'' + i_OptimizationRequestId + '\'+AND+name=\'' + sfsResponseFileName + '\'';
                        var GetRequestconfig = { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionId } };
                        var queryResponse = await $http.get(queryURL, GetRequestconfig);
                        var AttachmentBody = await $http.get('' + window.location.origin + queryResponse.data.records[0].Body, GetRequestconfig);
                        data = [];
                        for (var key in AttachmentBody.data) {
                            switch (key) {
                                case 'serviceAppointments':
                                    AttachmentBody.data['Services'] = AttachmentBody.data[key];
                                    delete AttachmentBody.data[key];
                                    break;
                                case 'assignedResourcesToDelete':
                                    AttachmentBody.data['AssignedResourcesToDelete'] = AttachmentBody.data[key];
                                    delete AttachmentBody.data[key];
                                    break;
                                case 'lunchBreaksToDelete':
                                    AttachmentBody.data['BreaksToDelete'] = AttachmentBody.data[key];
                                    delete AttachmentBody.data[key];
                                    break;
                            }
                        }
                        data.push(AttachmentBody.data);
                    } else {
                        utils.addNotification("No Output Data!", "There is no data for the optimization response. </br> It might be that this optimization request has failed.", function () {
                            utils.openSObjectLink(i_OptimizationRequestId);
                        });
                        return;
                    }
                }
                var countNewAbsences = 1;

                data.forEach(function (json) {
                    json.Services && json.Services.forEach(function (service) {
                        isO2Request && fixJSONdateTimeStrings(service, 'ServiceAppointment');
                        var territoryTimeZoneValue = objectsToBroadcast.serviceAppointments[service.Id].ServiceTerritory ? objectsToBroadcast.serviceAppointments[service.Id].ServiceTerritory.OperatingHours.TimeZone : null;
                        objectsToBroadcast.serviceAppointments[service.Id].schedEndTime = changeDatesAccordingToTimezone(service.SchedEndTime, territoryTimeZoneValue);
                        objectsToBroadcast.serviceAppointments[service.Id].schedStartTime = changeDatesAccordingToTimezone(service.SchedStartTime, territoryTimeZoneValue);
                        objectsToBroadcast.serviceAppointments[service.Id].setSchedulerPropertiesAfterOutputJson('service');
                    });
                    json.AssignedResourcesToCreate && json.AssignedResourcesToCreate.forEach(function (ar) {
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resource = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resourceName = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].assignedResource = 'Created By Optimizer';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeFrom = ar.EstimatedTravelTimeFrom__c || ar.FSL__EstimatedTravelTimeFrom__c;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeTo = ar.EstimatedTravelTime;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].status = serviceStatuses.SCHEDULED;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].statusCategory = 'Scheduled';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].setSchedulerPropertiesAfterOutputJson('assignedResource');
                    });
                    json.AssignedResourcesToUpdate && json.AssignedResourcesToUpdate.forEach(function (ar) {
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resource = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resourceName = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].assignedResource = 'Updated By Optimizer';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeFrom = ar.EstimatedTravelTimeFrom__c || ar.FSL__EstimatedTravelTimeFrom__c;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeTo = ar.EstimatedTravelTime;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].setSchedulerPropertiesAfterOutputJson('assignedResource');
                    });
                    json.AssignedResourcesToDelete && json.AssignedResourcesToDelete.forEach(function (ar) {
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resource = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].schedEndTime = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].schedStartTime = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resourceName = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].assignedResource = 'Deleted By Optimizer';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeFrom = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeTo = null;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].status = serviceStatuses.NONE;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].statusCategory = 'None';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].setSchedulerPropertiesAfterOutputJson('assignedResource');
                    });
                    json.Absences && json.Absences.forEach(function (absence) {
                        var timezone = findTimeZoneForResourceAbsence(absence);
                        changeSObjectDateAccordingToTimeZone(absence, 'ResourceAbsence', timezone);
                        objectsToBroadcast.resourceAbsences[absence.Id].start = absence.Start;
                        objectsToBroadcast.resourceAbsences[absence.Id].end = absence.End;
                        objectsToBroadcast.resourceAbsences[absence.Id].travelTo = absence.EstTravelTime__c ? absence.EstTravelTime__c * 60 : 0;
                        objectsToBroadcast.resourceAbsences[absence.Id].travelFrom = absence.EstTravelTimeFrom__c ? absence.EstTravelTimeFrom__c * 60 : 0;
                        objectsToBroadcast.resourceAbsences[absence.Id].setSchedulerProperties();
                    });
                    json.BreaksToDelete && json.BreaksToDelete.forEach(function (absence) {
                        scheduler.deleteEvent(objectsToBroadcast.resourceAbsences[absence.Id].id);
                        delete objectsToBroadcast.resourceAbsences[absence.Id];
                    });
                    json.BreaksToCreate && json.BreaksToCreate.forEach(function (absence) {
                        absence.Id = countNewAbsences;
                        handleAbsenceConversion(absence, true);
                        countNewAbsences++;
                    });
                    json.assignedResourcesToUpsert && json.assignedResourcesToUpsert.forEach(function (ar) {
                        if (ar.ServiceResourceId) objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resource = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].resourceName = ar.ServiceResourceId;
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].assignedResource = ar.Id ? 'Updated By Optimizer' : 'Created By Optimizer';
                        if (!ar.FSL__EstimatedTravelTimeFrom__c) objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeFrom = ar.EstimatedTravelTimeFrom__c || ar.FSL__EstimatedTravelTimeFrom__c;
                        if (!ar.EstimatedTravelTime) objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].travelTimeTo = ar.EstimatedTravelTime;
                        if (!ar.Id) objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].status = serviceStatuses.SCHEDULED;
                        if (!ar.Id) objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].statusCategory = 'Scheduled';
                        objectsToBroadcast.serviceAppointments[ar.ServiceAppointmentId].setSchedulerPropertiesAfterOutputJson('assignedResource');
                    });
                    json.lunchBreaksToUpsert && json.lunchBreaksToUpsert.forEach(function (absence) {
                        fixJSONdateTimeStrings(absence, 'ResourceAbsence');
                        if (!absence.Id) {
                            absence.Id = countNewAbsences;
                            handleAbsenceConversion(absence, true);
                            countNewAbsences++;
                        } else {
                            var timezone = findTimeZoneForResourceAbsence(absence);
                            changeSObjectDateAccordingToTimeZone(absence, 'ResourceAbsence', timezone);
                            objectsToBroadcast.resourceAbsences[absence.Id].start = absence.Start;
                            objectsToBroadcast.resourceAbsences[absence.Id].end = absence.End;
                        }
                    });
                    json.resourceAbsencesToUpsert && json.resourceAbsencesToUpsert.forEach(function (absence) {
                        fixJSONdateTimeStrings(absence, 'ResourceAbsence');
                        var timezone = findTimeZoneForResourceAbsence(absence);
                        changeSObjectDateAccordingToTimeZone(absence, 'ResourceAbsence', timezone);
                        objectsToBroadcast.resourceAbsences[absence.Id].start = absence.Start;
                        objectsToBroadcast.resourceAbsences[absence.Id].end = absence.End;
                        objectsToBroadcast.resourceAbsences[absence.Id].travelTo = absence.EstTravelTime__c ? absence.EstTravelTime__c * 60 : 0;
                        objectsToBroadcast.resourceAbsences[absence.Id].travelFrom = absence.EstTravelTimeFrom__c ? absence.EstTravelTimeFrom__c * 60 : 0;
                        objectsToBroadcast.resourceAbsences[absence.Id].setSchedulerProperties();
                    });
                    json.resourceAbsencesToDelete && json.resourceAbsencesToDelete.forEach(function (absence) {});
                });
                TimePhasedDataService.updateObjectsForOptimizationViewer(objectsToBroadcast);
                //$rootScope.$broadcast('gotNewTimePhasedSTMsAndShifts',objectsToBroadcast)
                $rootScope.$broadcast('gotNewTimePhasedObjects', objectsToBroadcast);
                var start = objectsToBroadcast.start;
                start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0);
                scheduler.setCurrentView(start);
                _isShowingOutputJson = true;
            });
        }

        // DOM element
        function generateTemplate() {
            return angular.element('\n            <div class="LightboxBlackContainer">\n                <div class="LightboxContainer" id="BulkActionsLightbox" ng-class="{\'rtlDirection\': ' + isRtlDirection + ' }" >\n\n                    <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                        <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox" id="CloseDispatchLightbox" fsl-key-press tabindex="0">\n                            <use xlink:href="' + lsdIcons.close + '"></use>\n                        </svg>\n                        <h1 class="light-box-header">Load New Optimization Request</h1>\n                    </div>\n\n                    <div>\n\n                        <div class="lightboxContentContainer">\n\n                            <p>Select Optimization Request to load</p>\n\n                            \n                            <div>\n                                <!-- <label for="searchOptReqs">Search for Optimization Request to view </label> -->\n                                <input class="OptiViewerSearch" type="text" placeholder="Search Optimiztion Request..." \n                                    ng-model="selectedOptimizationRequest"\n                                    ng-model-options="{debounce: 300}"\n                                    ng-change="ShowAllRelevantOptimizationRequests(selectedOptimizationRequest)"\n                                    name="searchOptReqs" \n                                    id="searchOptReqs" \n                                    ng-focus = "SearchBoxInFocus = true"\n                                    ng-blur = "loseFocusWithDelay()"/> \n                            </div>\n                            <div>\n                                <div class="OptiViewerListDiv" style="box-shadow: 0 2px 3px 0 rgb(0 0 0 / 16%);" ng-if="currentResults.length != 0 && SearchBoxInFocus">\n                                    <ul class="list-unstyled-optiViewer" role="presentation">\n                                        <li role="presentation" class="optiviewer-listbox__item" ng-repeat="optimization in currentResults" ng-click="updateSearchText(optimization.Name)">\n                                            <div onmouseover="this.style.backgroundColor = \'#f3f3f3\'" onmouseout="this.style.backgroundColor = \'#ffffff\'">\n                                                \n                                                    <svg class="slds-icon-optiViewer">\n                                                        <use class="slds-icon-use-optiViewer" xlink:href="' + lsdIcons.optimizationRequests + '"></use>\n                                                    </svg>\n                                            \n                                                <span>\n                                                        {{optimization.Name}}\n                                                        </br> \n                                                        {{optimization.Status__c || optimization.FSL__Status__c}} \u2022 {{optimization.Type__c || optimization.FSL__Type__c}}\n                                                </span>\n                                            </div>\n                                        </li>\n                                    </ul>\n                                </div>\n                                <div ng-if="Errors.length > 0 && (currentResults.length == 0 || !SearchBoxInFocus)">\n                                    <p class="optiViewerErrorMessage">This LS Optimization Request has no saved data. </br>\n                                        In order to save optimization data please login to the org via License Management App and open the Custom Settings --> Field Service Optimization Settings (Manage button) --> Edit button next to the relevant Optimization type --> tick the checkbox "Save Optimization Data After OAAS Finish".</br>\n                                        Now when your optimization finishes, its data would be saved as an attachment on the related Optimization Data Object. </br>\n                                        <b>If this is a customer\'s org remember to turn this setting back off when you done working.</b> \n\n                                    </p>\n                                </div>\n                                <div ng-if="showO2FetchFilesButton && (currentResults.length == 0 || !SearchBoxInFocus)">\n                                    <p class="optiViewerErrorMessage">This ES&O Optimization Request has no saved data. \n                                    </br>\n                                    Before you click the \'Fetch Files From S3\' you need to enable the custom settings as mentioned <a href="https://salesforce.quip.com/i0GlAyC5MLjb">here</a>\n                                     </br>\n                                    <button class="truncate quickActionBtn" ng-click="GetO2FilesFromAWS(false)">Fetch ALL Files From S3</button>\n                                    <button class="truncate quickActionBtn" ng-click="GetO2FilesFromAWS(true)">Fetch Request & Response Files From S3</button>\n                                    </p>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class="lightboxControllers">\n                            <button class="lightboxSaveButton" ng-click="loadOptimizationRequestInput(selectedOptimizationRequest)">Load</button>\n                        </div>\n\n                    </div>\n                </div>\n\n            </div>\n            ');
        }

        // This will be our factory
        return {
            open: open,
            isOptimizationLoaded: function isOptimizationLoaded() {
                return _isOptimizationLoaded;
            },
            isShowingOutputJson: function isShowingOutputJson() {
                return _isShowingOutputJson;
            },
            loadOptimizationResponseOutput: loadOptimizationResponseOutput,
            loadOptimizationRequestInput: loadOptimizationRequestInput,
            i_OptimizationRequestName: function i_OptimizationRequestName() {
                return _i_OptimizationRequestName;
            }
        };
    }
})();