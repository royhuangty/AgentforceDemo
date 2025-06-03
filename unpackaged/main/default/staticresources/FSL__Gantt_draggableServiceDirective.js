'use strict';

/*

 draggableService & dragTarget directives

 */

(function () {

    angular.module('serviceExpert').directive('draggableService', ['utils', 'servicesService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'StateService', function (utils, servicesService, SERVICE_STATUS, SERVICE_CATEGORY, StateService) {
        return {
            restrict: 'CAE',
            scope: { dragService: '=' },
            link: function link(scope, element, attributes, ctlr) {

                // While dragging, not needed for now
                //element.bind("drag", function(eventObject) {
                //    console.log(scheduler.getActionData(eventObject.originalEvent));
                //});

                // set cached elements
                if (!cachedDomElements.draggedEvent) cachedDomElements.draggedEvent = $('#draggedEvent');

                if (!cachedDomElements.draggedEventDiv) cachedDomElements.draggedEventDiv = $('#draggedEvent div');

                element.bind('dragstart', function (eventObject) {

                    // set service as json for datatransfer
                    eventObject.originalEvent.dataTransfer.setData('text', scope.dragService.id); // service id... explorer is crap so naming it "text"

                    // set draggble service ghost text
                    var ghostServiceName = scope.dragService.ganttLabel ? scope.dragService.ganttLabel : scope.dragService.name;
                    var ghostHtml = '<b>' + ghostServiceName + '</b><br/>' + scope.dragService.estDuration + ' ' + scope.dragService.durationType;
                    cachedDomElements.draggedEventDiv.html(ghostHtml);

                    // viewable hours on the gantt, after filtering them
                    var availableHours = getMinAndMaxHoursToDisplay();

                    // calculate size of event
                    var startTime = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60);
                    var endDate = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60);

                    var duration = 60; // minutes, default value

                    if (scope.dragService.durationType) {

                        if (scope.dragService.durationType === utils.durationTypes.minutes) endDate.setMinutes(endDate.getMinutes() + scope.dragService.estDuration);else if (scope.dragService.durationType === utils.durationTypes.hours) endDate.setMinutes(endDate.getMinutes() + Math.floor(scope.dragService.estDuration * 60));else if (scope.dragService.durationType === utils.durationTypes.days) endDate.setMinutes(endDate.getMinutes() + Math.floor(scope.dragService.estDuration * 60 * 24));
                    } else {
                        scope.dragService.setMinutes(endDate.getMinutes() + 60);
                    }

                    var startPoint = getXPositionOfEvent({
                        start_date: startTime,
                        end_date: endDate
                    }, false, scheduler.matrix[scheduler._mode]);
                    var endPoint = getXPositionOfEvent({
                        start_date: startTime,
                        end_date: endDate
                    }, true, scheduler.matrix[scheduler._mode]);
                    var meetingLength = endPoint - startPoint + 4;

                    // set class by status
                    var cssClass = '';

                    // add classes based on statuses
                    switch (scope.dragService.statusCategory) {
                        case SERVICE_CATEGORY.NONE:
                            cssClass = ' eventStatusNew';
                            break;
                        case SERVICE_CATEGORY.SCHEDULED:
                            cssClass = ' eventStatusAssigned';
                            break;
                        case SERVICE_CATEGORY.DISPATCHED:
                            cssClass = 'eventStatusDispatched';
                            break;
                        case SERVICE_CATEGORY.IN_PROGRESS:
                            cssClass = ' eventStatusTravel';
                            break;
                        /*case SERVICE_CATEGORY.ONSITE:
                            cssClass = ' eventStatusOnSite';
                            break;*/
                        case SERVICE_CATEGORY.COMPLETED:
                            cssClass = ' eventStatusCompleted';
                            break;
                        case SERVICE_CATEGORY.COULD_NOT_COMPLETE:
                            cssClass = ' eventStatusCouldntComplete';
                            break;
                        case SERVICE_CATEGORY.CANCELED:
                            cssClass = ' eventStatusCancelled';
                            break;
                        default:
                            cssClass = ' eventCustomStatus';
                            break;
                    }

                    // set draggble service ghost width
                    cachedDomElements.draggedEvent.css('width', meetingLength + 'px');
                    cachedDomElements.draggedEvent.removeClass();
                    cachedDomElements.draggedEvent.addClass(cssClass);

                    if (scope.dragService.ganttColor) {
                        cachedDomElements.draggedEvent.css('background', scope.dragService.ganttColor);
                    } else {
                        cachedDomElements.draggedEvent.css('background', '');
                    }

                    var crt = document.getElementById('draggedEvent').cloneNode(true);

                    //crt.style.position = "absolute";  crt.style.zIndex = "-2";

                    document.body.appendChild(crt);
                    var testDataTransfer = window.DataTransfer;
                    if ('setDragImage' in testDataTransfer.prototype)
                        // *-------------------RTL support---------------*/ 
                        var positionY = StateService.isRtlDirection() ? meetingLength : 0;
                    eventObject.originalEvent.dataTransfer.setDragImage(crt, positionY, 28);
                    //  eventObject.originalEvent.dataTransfer.setDragImage(crt, 0, 28);
                });
            }
        };
    }])

    /* dragTarget */

    .directive('dragTarget', ['$rootScope', '$filter', 'utils', 'servicesService', 'sfdcService', 'kpiCalculationsService', 'ResourcesAndTerritoriesService', 'AbsencesService', 'TimePhasedDataService', 'SERVICE_CATEGORY', 'StateService', 'OptimizationRequestsService', function ($rootScope, $filter, utils, servicesService, sfdcService, kpiCalculationsService, ResourcesAndTerritoriesService, AbsencesService, TimePhasedDataService, SERVICE_CATEGORY, StateService, OptimizationRequestsService) {
        return {
            restrict: 'CAE',
            link: function link(scope, element, attributes, ctlr) {
                var lastTimeUpdatedDragMsg = Date.now();

                // dragging over the gantt
                element.bind('dragover', function (eventObject) {

                    if (!cachedDomElements.timesDragFix) cachedDomElements.timesDragFix = $('#timesDragFix');

                    eventObject.preventDefault();

                    // scheduler is locked
                    if (scheduler.config.readonly) return;

                    var now = Date.now();
                    if (now - lastTimeUpdatedDragMsg < 500) {
                        // Prevent too frequent updates (slows UI)
                        return;
                    }

                    lastTimeUpdatedDragMsg = Date.now();

                    var schedulerData = scheduler.getActionData(eventObject.originalEvent);
                    var resource = ResourcesAndTerritoriesService.getResources()[schedulerData.section.split('_')[0]];
                    var territoryId = schedulerData.section.split('_')[1];

                    if (!resource || !territoryId) return;

                    // calculate time in territory
                    var offsetRealTime = utils.getLocationOffset(schedulerData.date, territoryId) - utils.getUserOffset(schedulerData.date);
                    var territoryStartTime = new Date(schedulerData.date);
                    territoryStartTime.setMinutes(territoryStartTime.getMinutes() + offsetRealTime);

                    // check if valid row (only resorces row are allowed)
                    if (resource.name && (!resource.isCapacityBased || resource.isCapacityBased && !contractorSupport)) {

                        var startTraveless = new Date(schedulerData.date),
                            currentMinutes = schedulerData.date.getMinutes(),
                            nearDown = currentMinutes % serviceJumpsOnGantt,
                            nearUp = serviceJumpsOnGantt - currentMinutes % serviceJumpsOnGantt;

                        if (nearDown > nearUp) {
                            startTraveless = new Date(startTraveless.getTime() + nearUp * 60 * 1000);
                        } else {
                            startTraveless = new Date(startTraveless.getTime() - nearDown * 60 * 1000);
                        }

                        var startTime = moment(startTraveless).format('lll');

                        var terTimeForBugFix = new Date(startTraveless);
                        terTimeForBugFix.setMinutes(terTimeForBugFix.getMinutes() + offsetRealTime);

                        var realStartTime = moment(terTimeForBugFix).format('lll');

                        if (eventObject.originalEvent.ctrlKey) {
                            cachedDomElements.timesDragFix.html('<b>' + resource.name.encodeHTML() + '</b> ' + customLabels.SnapOn + ' ' + startTime + '<br/> ' + (!useLocationTimezone ? customLabels.Location_time + ' ' + realStartTime : ''));
                        } else {
                            cachedDomElements.timesDragFix.html('<b>' + resource.name.encodeHTML() + '</b> ' + customLabels.on + ' ' + startTime + '<br/> ' + (!useLocationTimezone ? customLabels.Location_time + ' ' + realStartTime : ''));
                        }

                        cachedDomElements.timesDragFix.show();
                    } else {
                        //$('#timesWhileDragging').hide();
                        cachedDomElements.timesDragFix.hide();
                    }
                });

                // leaving drag area, no need to display tooltip
                element.bind('dragleave', function (eventObject) {
                    //$('#timesWhileDragging').hide();
                    cachedDomElements.timesDragFix.hide();
                    eventObject.preventDefault();
                });

                element.bind('drop', function (eventObject) {

                    // cancel actual UI element from dropping, since the angular will recreate a the UI element
                    eventObject.preventDefault();

                    if (cachedDomElements.draggedEvent !== undefined) cachedDomElements.draggedEvent.removeClass();

                    //$('#timesWhileDragging').hide();
                    cachedDomElements.timesDragFix.hide();

                    // scheduler is locked
                    if (scheduler.config.readonly) return;

                    var schedulerData = scheduler.getActionData(eventObject.originalEvent);

                    var startTraveless = new Date(schedulerData.date),
                        currentMinutes = schedulerData.date.getMinutes(),
                        nearDown = currentMinutes % serviceJumpsOnGantt,
                        nearUp = serviceJumpsOnGantt - currentMinutes % serviceJumpsOnGantt,
                        ganttResourceId = schedulerData.section;

                    if (nearDown > nearUp) {
                        startTraveless = new Date(startTraveless.getTime() + nearUp * 60 * 1000);
                    } else {
                        startTraveless = new Date(startTraveless.getTime() - nearDown * 60 * 1000);
                    }

                    schedulerData.date = startTraveless;

                    var resourceObj = ResourcesAndTerritoriesService.getResources()[schedulerData.section.split('_')[0]];
                    var territoryObj = ResourcesAndTerritoriesService.territories()[schedulerData.section.split('_')[1]];
                    //var optHoursTimezone = ResourcesAndTerritoriesService.operatingHours[territoryObj.operatingHours].timezone;

                    // not valid resource, do nothing
                    if (!resourceObj || !resourceObj.name) return;

                    var objectId = eventObject.originalEvent.dataTransfer.getData('text'); // service id... explorer is crap so naming it "text", if equals break then create a break


                    //var resourceLocationOffset = -(moment.tz.zone(optHoursTimezone).offset(new Date()));

                    // NA - create and save to sfdc
                    if (objectId.indexOf('absenceNA_') > -1) {

                        $('#naOptionsContainer').hide();

                        //ten minutes
                        var naDuration = objectId.substr(10, objectId.length - 10);
                        naDuration = parseInt(naDuration);

                        var naEndDate = new Date(schedulerData.date);
                        naEndDate.setMinutes(naEndDate.getMinutes() + naDuration);

                        var draggedAbsence = {
                            'end_date': naEndDate,
                            'resource': resourceObj.id,
                            'start_date': schedulerData.date,
                            'start': schedulerData.date,
                            'absenceType': scope.defaultDragNa.selectedNaType == "None" ? null : scope.defaultDragNa.selectedNaType,
                            'ganttLabel': scope.defaultDragNa.selectedNaLabel,
                            'resourceId': ganttResourceId
                        };

                        utils.safeApply(scope, function () {

                            servicesService.handleSnap(draggedAbsence, eventObject);

                            AbsencesService.saveNewAbsence(draggedAbsence, StateService.selectedPolicyId).then(function (parsedObjects) {
                                //servicesService.drawServicesAndAbsences(parsedObjects.services || [], parsedObjects.absences || []);
                            }).catch(function (err) {
                                console.warn('Couldn\'t update absence');

                                if (err.error) {
                                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.error);
                                } else {
                                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message || customLabels.user_is_not_allowed_to_perform_action);
                                }

                                // scheduler.parse([err[1]], 'json');
                            });
                        });

                        return;
                    }

                    var service = TimePhasedDataService.serviceAppointments()[objectId];
                    if (!service) return;

                    var endDate = new Date(schedulerData.date);
                    var duration = 60; // minutes, default value

                    if (service.durationType) {

                        if (service.durationType == utils.durationTypes.minutes) endDate.setMinutes(endDate.getMinutes() + service.estDuration);else if (service.durationType == utils.durationTypes.hours) endDate.setMinutes(endDate.getMinutes() + Math.floor(service.estDuration * 60));else if (service.durationType == utils.durationTypes.days) endDate.setDate(endDate.getDate() + Math.floor(service.estDuration));
                    } else {
                        endDate.setMinutes(endDate.getMinutes() + duration);
                    }

                    if (OptimizationRequestsService.isTerritoryHasInDayOptimizationInProgress(schedulerData.date, endDate, schedulerData.section.split('_')[1])) {
                        if (confirm(customLabels.In_Day_Optimization_In_Progress_Confirm) === false) {
                            return;
                        }
                    }

                    //dont allow dropping service on contractor with no capacity
                    if (contractorSupport) {
                        if (resourceObj.isCapacityBased) {
                            var capacityFound = false;
                            var capacityFiltered = true;
                            var allCollidingEvents = scheduler.getEvents(schedulerData.date, endDate);
                            for (var i = 0; i < allCollidingEvents.length; i++) {
                                if (allCollidingEvents[i].resourceId.indexOf(schedulerData.section) > -1 && allCollidingEvents[i].type == 'contractorcapacity') {
                                    capacityFound = true;
                                    if (allCollidingEvents[i].timePeriod == utils.ganttSettings.capacityDuration) {
                                        capacityFiltered = false;
                                    }
                                }
                            }

                            if (!capacityFound) {
                                alert(customLabels.serviceCantBeAssignedWithoutCapacity);
                                return;
                            }

                            if (capacityFiltered) alert(customLabels.is_assigned_to_contractor.replaceAll(service.name, resourceObj.name) + '.\n' + customLabels.This_capacity_duration_is_filtered_out + '.\n' + customLabels.To_change_the_capacity_duration);
                        }
                    }

                    // Crew feature canceled for dragging a service on SCM
                    // var resourceCrewMembers = TimePhasedDataService.resourceToServiceCrewMembers()[resourceObj.id];

                    // for(let member in resourceCrewMembers){
                    //     let res = utils.intersectDates({ start: resourceCrewMembers[member].startDate, finish: resourceCrewMembers[member].endDate}, {start: schedulerData.date, finish: endDate}).intersection;

                    //     if(res !== null){
                    //         alert('Cannot schedule service to resource that is assign to a crew'); // TODO OMRI CREWS _ ADD LABEL
                    //         return;
                    //     }
                    // }


                    var draggedService = angular.copy(service);
                    draggedService.end_date = endDate;
                    draggedService.resourceId = schedulerData.section;
                    draggedService.start_date = new Date(schedulerData.date);
                    draggedService.assignedResource = null;

                    //create dummy service
                    var dummyEventProps = {
                        statusCategory: SERVICE_CATEGORY.SCHEDULED,
                        isDummy: true,
                        id: draggedService.id + '_dummy'
                    };

                    //let draggedDummyService = scheduler.addEvent(Object.assign(angular.copy(draggedService), dummyEventProps));


                    var draggedDummyService = void 0,
                        draggedServiceCopy = angular.copy(draggedService);

                    for (var key in dummyEventProps) {
                        draggedServiceCopy[key] = dummyEventProps[key];
                    }

                    draggedDummyService = scheduler.addEvent(draggedServiceCopy);

                    utils.safeApply(scope, function () {

                        servicesService.handleSnap(draggedService, eventObject.originalEvent);

                        // save to sfdc
                        servicesService.saveChangesToServiceAppointment(service, draggedService).then(function (parsedUpdatedObjects) {

                            // scheduler.deleteEvent(draggedDummyService);
                            kpiCalculationsService.calculateKpis();
                        }).catch(function (err) {
                            console.warn('Couldn\'t update service. ' + err[2]);
                            utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err[2] || err[0].message || customLabels.user_is_not_allowed_to_perform_action);

                            scheduler.deleteEvent(draggedDummyService) && scheduler.parse([err[1]], 'json');
                        });
                    });
                });
            }
        };
    }]);
})();