'use strict';

(function () {

    monthlyViewHelperService.$inject = ['calendarsService', '$rootScope', 'AbsenceLightboxService', 'ServiceAppointmentLightboxService', 'TimePhasedDataService', 'utils', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'StateService'];

    angular.module('serviceExpert').factory('monthlyViewHelperService', monthlyViewHelperService);

    function monthlyViewHelperService(calendarsService, $rootScope, AbsenceLightboxService, ServiceAppointmentLightboxService, TimePhasedDataService, utils, ResourcesAndTerritoriesService, userSettingsManager, StateService) {

        var __noCapacityDefaultObject = { regular: 0, overtime: 0 },
            __workingTimesByResource = {},
            __workingTimesByLocation = {},
            __capacityCalculationFields = {
            services: true,
            na: true,
            travel: true,
            breaks: true,
            overtime: true
        };
        //RTL support
        var isRtlDirection = StateService.isRtlDirection();

        // sticky settings from user settings
        if (userSettingsManager.GetUserSettingsProperty('Utilization_Properties__c')) {
            var capacityFields = JSON.parse(userSettingsManager.GetUserSettingsProperty('Utilization_Properties__c'));

            for (var key in capacityFields) {
                __capacityCalculationFields[key] = capacityFields[key];
            }
        }

        function updateMonthlyCapacity(ev) {

            if (!ev) {
                return;
            }

            ev.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);

            var schedulerEvent = scheduler._events[ev.id],
                resourceToReduce = null;

            // not scheduled and didn't exist before
            if (!ev.resourceId && !schedulerEvent) {
                return;
            }

            // MDT with no mdt times
            if (ev.isMDT && !ev.mdtTimes) {
                return;
            }

            // object exist and scheduled, need to reduce from current resource
            if (schedulerEvent) {

                var reduceSums = generateCapacityCapacity(schedulerEvent.eventBeforeDrag || schedulerEvent);

                if (schedulerEvent.eventBeforeDrag) {
                    schedulerEvent.eventBeforeDrag = null;
                }

                // this will check if the event was changed by drag and drop (not external!)
                if (ev.type === 'service' || ev.type === 'na') {
                    resourceToReduce = schedulerEvent.resourceName === ev.resourceName ? ev.resourceId : schedulerEvent.resourceBeforeDrag || schedulerEvent.resourceId;
                    schedulerEvent.resourceBeforeDrag = null;
                }

                // break was added or deleted
                else if (ev.type === 'break') {
                        resourceToReduce = schedulerEvent.resourceId;
                    }

                updateCapacityToResource(schedulerEvent.id, resourceToReduce, reduceSums.travelBeforeSum, 'travel', false);
                updateCapacityToResource(schedulerEvent.id, resourceToReduce, reduceSums.scheduledObjectSum, schedulerEvent.type, false);
                updateCapacityToResource(schedulerEvent.id, resourceToReduce, reduceSums.travelAfterSum, 'travel', false);
            }

            // object was unscheduld or deleted, no need to add nothing
            if (!ev.resourceId || ev.isDeleted || ev.locationRemovedMe) {

                // removed by location filtering
                if (ev.locationRemovedMe) {
                    ev.locationRemovedMe = false;
                }

                return;
            }

            // now, add
            var addSums = generateCapacityCapacity(ev);

            updateCapacityToResource(ev.id, ev.resourceId, addSums.travelBeforeSum, 'travel');
            updateCapacityToResource(ev.id, ev.resourceId, addSums.scheduledObjectSum, ev.type);
            updateCapacityToResource(ev.id, ev.resourceId, addSums.travelAfterSum, 'travel');
        }

        function generateCapacityCapacity(ev) {

            // set capacity object
            if (ev.resourceId.indexOf(',') > -1) {
                var resIds = ev.resourceId.split(',');
                for (var i = 0; i < resIds.length; i++) {
                    __workingTimesByResource[resIds[i]] = __workingTimesByResource[resIds[i]] || {};
                }
            } else {
                __workingTimesByResource[ev.resourceId] = __workingTimesByResource[ev.resourceId] || {};
            }

            var travelBefore = {
                start: new Date(ev.start_date),
                finish: new Date(ev.start)
            },
                scheduledEvent = {
                start: new Date(ev.start),
                finish: new Date(ev.finish)
            },
                travelAfter = {
                start: new Date(ev.finish),
                finish: new Date(ev.end_date)
            };

            //console.log(calculateTimeSpan(scheduledEvent.start, scheduledEvent.finish));

            return {
                travelBeforeSum: ev.isMDT ? calculateTimeSpan(ev.mdtTimes.travel) : calculateTimeSpan(travelBefore.start, travelBefore.finish),
                scheduledObjectSum: ev.isMDT ? calculateTimeSpan(ev.mdtTimes.working) : calculateTimeSpan(scheduledEvent.start, scheduledEvent.finish),
                travelAfterSum: ev.isMDT ? {} : calculateTimeSpan(travelAfter.start, travelAfter.finish)
            };
        }

        function calculateTimeSpan(dateStart, dateFinish) {

            var sum = {};

            // mdt calculation (dateStart is actually our mdt times object
            if (!dateFinish) {

                dateStart.forEach(function (times) {

                    dateFinish = new Date(times.Finish);

                    for (var currentTimeSpan = new Date(times.Start); currentTimeSpan < dateFinish; currentTimeSpan = getEndOfDay(currentTimeSpan)) {

                        var endOfCurrent = getEndOfDay(currentTimeSpan);

                        endOfCurrent = endOfCurrent > dateFinish ? dateFinish : endOfCurrent;

                        if (sum[generateDateKey(currentTimeSpan)]) {
                            sum[generateDateKey(currentTimeSpan)] += Math.round((endOfCurrent.getTime() - currentTimeSpan.getTime()) / 1000 / 60);
                        } else {
                            sum[generateDateKey(currentTimeSpan)] = Math.round((endOfCurrent.getTime() - currentTimeSpan.getTime()) / 1000 / 60);
                        }
                    }
                });

                return sum;
            }

            // regular services calculations
            for (var currentTimeSpan = new Date(dateStart); currentTimeSpan < dateFinish; currentTimeSpan = getEndOfDay(currentTimeSpan)) {

                var endOfCurrent = getEndOfDay(currentTimeSpan);

                endOfCurrent = endOfCurrent > dateFinish ? dateFinish : endOfCurrent;

                sum[generateDateKey(currentTimeSpan)] = Math.round((endOfCurrent.getTime() - currentTimeSpan.getTime()) / 1000 / 60);
            }

            return sum;
        }

        // generate a date-key from date
        function generateDateKey(date) {
            return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
        }

        // generate key based on date
        function getEndOfDay(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
        }

        // update the summaryObject of a resource. sumType should be na, service or travel
        function updateCapacityToResource(eventId, resourceId, dateKeyObject, sumType) {
            var addSums = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;


            // split resourceId in case of multi section (show secondary)
            var resIds = resourceId.split(',');

            for (var i = 0; i < resIds.length; i++) {

                resourceId = resIds[i];

                for (var dateKey in dateKeyObject) {

                    __workingTimesByResource[resourceId] = __workingTimesByResource[resourceId] || {};

                    if (__workingTimesByResource[resourceId][dateKey] === undefined) __workingTimesByResource[resourceId][dateKey] = new summaryObject();

                    if (addSums) {
                        __workingTimesByResource[resourceId][dateKey][sumType] += dateKeyObject[dateKey];

                        if (__workingTimesByResource[resourceId][dateKey].events.indexOf(eventId) === -1) {
                            __workingTimesByResource[resourceId][dateKey].events.push(eventId);
                        }
                    } else {
                        __workingTimesByResource[resourceId][dateKey][sumType] -= dateKeyObject[dateKey];

                        var indexOfEvent = __workingTimesByResource[resourceId][dateKey].events.indexOf(eventId);

                        // remove event from list

                        if (indexOfEvent > -1) {
                            __workingTimesByResource[resourceId][dateKey].events.splice(indexOfEvent, 1);
                        }
                    }
                }
            }
        }

        function summaryObject() {
            this.break = 0;
            this.na = 0;
            this.service = 0;
            this.travel = 0;
            this.capacity = -1; // not available yet, need to be calculated
            this.overtime = 0;
            this.events = [];
        }

        // attach events to scheduler
        scheduler.attachEvent("onSchedulerReady", function () {

            // drill-in to day when clicking a day cell title
            scheduler.attachEvent("onXScaleClick", function (index, date, e) {

                if (scheduler._mode !== 'MonthlyView') {
                    return;
                }

                scheduler.setCurrentView(date, 'ZoomLevel3');
            });

            scheduler.templates.MonthlyView_scalex_class = function (date) {
                return 'monthlyXScale';
            };

            scheduler.templates.MonthlyView_cell_value = function (date, section) {

                var resourceId = section.key;

                // contractor capacity, not interesting in monthly view
                if (contractorSupport && section.contractor) {
                    return;
                }

                if (section.children) {
                    var locationCapacity = calculateLocation(section.children, date);

                    if (!__workingTimesByLocation[section.key]) {
                        __workingTimesByLocation[section.key] = {};
                    }

                    __workingTimesByLocation[section.key][generateDateKey(date)] = locationCapacity;

                    return generateLocationCellHtml(locationCapacity, section.key, section.name, generateDateKey(date));
                }

                if (__workingTimesByResource[resourceId] && __workingTimesByResource[section.key][generateDateKey(date)]) {
                    var timeInMinute = 0,
                        capacityObject = __workingTimesByResource[resourceId][generateDateKey(date)],
                        calendarCapacity = __noCapacityDefaultObject;

                    if (calendarsService.resourceToWorkingDates[resourceId]) {
                        calendarCapacity = calendarsService.resourceToWorkingDates[resourceId][generateDateKey(date)] || __noCapacityDefaultObject;
                    }

                    // only add fields that are selected in the UI
                    if (__capacityCalculationFields.services) {
                        timeInMinute += capacityObject.service;
                    }

                    if (__capacityCalculationFields.breaks) {
                        timeInMinute += capacityObject.break;
                    }

                    if (__capacityCalculationFields.na) {

                        var naToAdd = capacityObject.na;

                        // na can't be bigger than the capacity of that day
                        if (capacityObject.na > calendarCapacity.regular) {
                            naToAdd = calendarCapacity.regular;
                        }

                        timeInMinute += naToAdd;
                    }

                    if (__capacityCalculationFields.travel) {
                        timeInMinute += capacityObject.travel;
                    }

                    // no work, draw nothing
                    if (timeInMinute === 0) return;

                    var backgroundColor = void 0,
                        percent = void 0,
                        capacity = __capacityCalculationFields.overtime ? calendarCapacity.regular + calendarCapacity.overtime : calendarCapacity.regular;

                    if (capacity > 0) {
                        percent = timeInMinute / capacity;
                        percent = Math.round(percent * 100);
                        var travelError = '';

                        if (capacityObject.travel / capacity > monthlyViewSettings.highTravel / 100) {
                            travelError = '<svg aria-hidden="true" class="tooMuchTravel slds-icon"><use xlink:href="' + lsdIcons.travel + '"></use></svg>';
                        }

                        backgroundColor = '';

                        if (percent <= monthlyViewSettings.high) backgroundColor = 'rgba(125, 195, 125, ' + percent / 100 + ')';else if (percent > monthlyViewSettings.high && percent <= monthlyViewSettings.critical) {
                            backgroundColor = 'rgba(242, 207, 91, ' + (0.11 + percent / 100 * 0.65) + ')';
                        } else {
                            backgroundColor = 'rgba(239, 110, 100, ' + (0.11 + percent / 100 * 0.65) + ')';
                        }

                        return '<div class="utilz-container" onclick="createMonthlyTooltip(event, \'' + resourceId + '\', \'' + generateDateKey(date) + '\')" style="background: ' + backgroundColor + '">' + travelError + '<div class="monthlyViewHoursContainer">' + percent + '%</div></div>';
                    } else {
                        backgroundColor = 'rgba(239, 110, 100, 1)';
                        return '<div class="utilz-container" onclick="createMonthlyTooltip(event, \'' + resourceId + '\', \'' + generateDateKey(date) + '\')" style="background: ' + backgroundColor + '"><div class="monthlyViewHoursContainer"><i class="fa fa-ban"></i></div></div>';
                    }
                }
            };
        });

        window.createLocationMonthlyTooltip = function (ev, locationId, locationName, dateKey) {

            $('#MonthlyLocationViewTooltip').remove();
            $('#MonthlyViewTooltip').remove();

            var capacityObject = __workingTimesByLocation[locationId][dateKey],
                capacityDataHtml = '';
            //calendarCapacity = calendarsService.resourceToWorkingDates[resourceId][generateDateKey(date)];

            capacityDataHtml = generateTooltipHtml(capacityObject, capacityDataHtml, { regular: capacityObject.capacity, overtime: capacityObject.overtime });

            var dateTitle = dateKey.split('_');
            dateTitle = new Date(dateTitle[2], dateTitle[1], dateTitle[0], 0, 0, 0, 0);
            dateTitle = moment(dateTitle).format('ll');

            var windowHeight = window.innerHeight,
                windowWidth = window.innerWidth;

            var tooltipX = ev.clientX + 340 <= windowWidth ? ev.clientX : ev.clientX - 340;

            // add HTML to body
            $('<div id="MonthlyLocationViewTooltip">\n                    <h1>' + _.escape(locationName) + ' - ' + _.escape(dateTitle) + '</h1>\n                    <div id="CapacityIconsContainer">' + capacityDataHtml + '</div>\n               </div>').css('left', tooltipX + 'px').css('top', ev.clientY + 5 + 'px').appendTo('body');

            var tooltipElement = $('#MonthlyViewTooltip'),
                tooltipHeight = tooltipElement.height();

            if (tooltipHeight + ev.clientY > windowHeight) {
                tooltipElement.css('top', ev.clientY - tooltipHeight - 20 + 'px');
            }
            //RTL support
            if (isRtlDirection) {
                $('#MonthlyLocationViewTooltip').addClass('rtlDirection');
            }
        };

        // remove the location tooltip
        window.removeMonthlyLocationTooltip = function () {
            $('#MonthlyLocationViewTooltip').remove();
        };

        // create a monthly tooltip of a resource (when clicking on a resource)
        window.createMonthlyTooltip = function (ev, resourceId, dateKey) {

            ev.stopPropagation();
            $('#MonthlyViewTooltip').remove();
            $('#MonthlyLocationViewTooltip').remove();

            var resourceName = ResourcesAndTerritoriesService.getResources()[resourceId.split('_')[0]].name;

            var capacityObject = __workingTimesByResource[resourceId][dateKey],
                capacityDataHtml = '',
                workingCapacity = __noCapacityDefaultObject;

            if (calendarsService.resourceToWorkingDates[resourceId] && calendarsService.resourceToWorkingDates[resourceId][dateKey]) {
                workingCapacity = calendarsService.resourceToWorkingDates[resourceId][dateKey];
            }

            capacityDataHtml = generateTooltipHtml(capacityObject, capacityDataHtml, workingCapacity);

            var schedulerEvents = capacityObject.events

            // sort by start date
            .sort(function (a, b) {

                if (scheduler._events[a].start_date.getTime() > scheduler._events[b].start_date.getTime()) {
                    return -1;
                }

                if (scheduler._events[a].start_date.getTime() < scheduler._events[b].start_date.getTime()) {
                    return 1;
                }

                return 0;
            })

            // produce HTML
            .map(function (eventId) {

                var openLightboxHtml = '',
                    flagButton = '';

                if (scheduler._events[eventId] && scheduler._events[eventId].type === 'service') {

                    var flagText = flaggedServices[eventId] ? customLabels.Unflag : customLabels.Flag;

                    openLightboxHtml = '__monthlyViewFunctions.service(\'' + eventId + '\')';
                    flagButton = '<div onclick="__monthlyViewFunctions.flag(event, \'' + eventId + '\')" class="monthlyViewFlag truncate">' + flagText + '</div>';
                } else {
                    openLightboxHtml = '__monthlyViewFunctions.absence(\'' + eventId + '\')';
                }

                var extraClasses = ' ';

                extraClasses += scheduler._events[eventId] && scheduler._events[eventId].jeopardy ? 'monthlyView_JeopardyTooltip' : '';
                extraClasses += scheduler._events[eventId] && scheduler._events[eventId].violations && !scheduler._events[eventId].jeopardy ? 'monthlyView_ViolationsTooltip' : '';

                var travelDuration = '';

                if (scheduler._events[eventId] && scheduler._events[eventId].type !== 'break') {
                    travelDuration = Math.floor((scheduler._events[eventId].travelTo + scheduler._events[eventId].travelFrom) / 60);
                    travelDuration = '' + generateTimeText(generateHoursMinutes(travelDuration));
                    travelDuration = '<svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.travel + '"></use></svg> ' + travelDuration;
                }

                var serviceDuration = Math.floor((scheduler._events[eventId].finish - scheduler._events[eventId].start) / 1000 / 60);
                serviceDuration = '' + generateTimeText(generateHoursMinutes(serviceDuration));
                serviceDuration = '<svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.clock + '"></use></svg> ' + serviceDuration;

                var breakClass = travelDuration === '' ? 'mytooltip_breakfix' : '';

                return '\n                        <div class="' + extraClasses + ' monthlyView_TooltipEventRow" title="' + formatServiceTooltip(scheduler._events[eventId]) + '">\n                            <div class="monthlyView_EventName" onclick="' + openLightboxHtml + '">' + scheduler._events[eventId].name + '</div>\n                            <div class="monthlyView_EventDate"><span class="mytooltip_duration ' + breakClass + '">' + serviceDuration + '</span><span class="mytooltip_travel">' + travelDuration + '</span>' + flagButton + '</div>\n                        </div>';
            });

            var dateTitle = dateKey.split('_');
            dateTitle = new Date(dateTitle[2], dateTitle[1], dateTitle[0], 0, 0, 0, 0);
            dateTitle = moment(dateTitle).format('ll');

            var windowHeight = window.innerHeight,
                windowWidth = window.innerWidth;

            var tooltipX = ev.clientX + 340 <= windowWidth ? ev.clientX : ev.clientX - 340;

            // add HTML to body
            $('<div id="MonthlyViewTooltip">\n                    <h1>\n                        ' + _.escape(resourceName) + ' - ' + dateTitle + '\n                        <svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.close + '"></use></svg>\n                    </h1>\n                    <div id="CapacityIconsContainer">' + capacityDataHtml + '</div>\n                    <div id="MonthlyTooltipListContainer">' + schedulerEvents.join('') + '</div>\n               </div>').css('left', tooltipX + 'px').css('top', ev.clientY + 5 + 'px').appendTo('body');

            var tooltipElement = $('#MonthlyViewTooltip'),
                tooltipHeight = tooltipElement.height();

            if (tooltipHeight + ev.clientY > windowHeight) {
                tooltipElement.css('top', ev.clientY - tooltipHeight - 20 + 'px');
            }
            //RTL support
            if (isRtlDirection) {
                $('#MonthlyViewTooltip').addClass('rtlDirection');
            }
        };

        $('body').on('click', function () {
            $('#MonthlyViewTooltip').remove();
        });

        window.__monthlyViewFunctions = {
            service: function service(serviceId) {
                //servicesService.recentlyUsed[serviceId] = true;
                ServiceAppointmentLightboxService.open(serviceId);
            },

            absence: function absence(absenceId) {
                AbsenceLightboxService.open(absenceId);
            },

            flag: function flag(e, id) {
                e.currentTarget.innerHTML = e.currentTarget.innerHTML === customLabels.Flag ? customLabels.Unflag : customLabels.Flag;
                e.stopPropagation();
                $rootScope.$broadcast('flagService', id);
                $rootScope.$apply();
            }
        };

        function calculateDailyResourceCapacity(resource, date) {

            var totalCapacity = new summaryObject(),
                resourceCapacity = null,
                dateKey = generateDateKey(date),
                resourceId = resource.key;

            totalCapacity.capacity = 0;

            // contractor capacity, not interesting in monthly view
            if (contractorSupport && resource.contractor) {
                return totalCapacity;
            }

            if (TimePhasedDataService.isResourceRelocated(resourceId, date)) {
                return totalCapacity;
            }

            if (TimePhasedDataService.isResourceCrewMembers(resourceId, date)) {
                return totalCapacity;
            }

            if (TimePhasedDataService.isResourceSecondary(resourceId, date)) {
                return totalCapacity;
            }

            // no capacities objects, create new entry
            if (!__workingTimesByResource[resourceId]) {
                __workingTimesByResource[resourceId] = {};
            }

            // get relevant date obj
            if (__workingTimesByResource[resourceId][dateKey]) {
                resourceCapacity = __workingTimesByResource[resourceId][dateKey];
            }

            // no date obj? create it
            if (!resourceCapacity) {
                __workingTimesByResource[resourceId][dateKey] = new summaryObject();
                resourceCapacity = __workingTimesByResource[resourceId][dateKey];
            }

            var dailyCapacity = __noCapacityDefaultObject;

            if (calendarsService.resourceToWorkingDates[resourceId] && calendarsService.resourceToWorkingDates[resourceId][dateKey]) {
                dailyCapacity = calendarsService.resourceToWorkingDates[resourceId][dateKey];
            }

            if (resourceCapacity) {
                totalCapacity.break += resourceCapacity.break;
                totalCapacity.na += resourceCapacity.na > dailyCapacity.regular ? dailyCapacity.regular : resourceCapacity.na;
                totalCapacity.service += resourceCapacity.service;
                totalCapacity.travel += resourceCapacity.travel;
                totalCapacity.capacity += dailyCapacity.regular > -1 ? dailyCapacity.regular : 0;
                totalCapacity.overtime += dailyCapacity.overtime;
            }

            return totalCapacity;
        }

        // get a section.children and sum it up, not used for now
        function calculateLocation(location, date) {

            var totalCapacity = new summaryObject(),
                dateKey = generateDateKey(date);

            totalCapacity.capacity = 0;

            for (var i = 0; i < location.length; i++) {

                var resourceCapacity = null,
                    resourceId = location[i].key;

                // contractor capacity, not interesting in monthly view
                if (contractorSupport && location[i].contractor) {
                    continue;
                }

                if (TimePhasedDataService.isResourceRelocated(resourceId, date)) {
                    //console.log('have member')
                    continue;
                }

                if (TimePhasedDataService.isResourceCrewMembers(resourceId, date)) {
                    continue;
                }

                if (TimePhasedDataService.isResourceSecondary(resourceId, date)) {
                    continue;
                }

                // no capacities objects, create new entry
                if (!__workingTimesByResource[resourceId]) {
                    __workingTimesByResource[resourceId] = {};
                }

                // get relevant date obj
                if (__workingTimesByResource[resourceId][dateKey]) {
                    resourceCapacity = __workingTimesByResource[resourceId][dateKey];
                }

                // no date obj? create it
                if (!resourceCapacity) {
                    __workingTimesByResource[resourceId][dateKey] = new summaryObject();
                    resourceCapacity = __workingTimesByResource[resourceId][dateKey];
                }

                if (resourceCapacity.capacity === -1) {
                    //__workingTimesByResource[resourceId][dateKey].capacity = calendarsHelperService.getWorkingTimeByDay(resourceId, date, 'working');
                    //__workingTimesByResource[resourceId][dateKey].overtime = calendarsHelperService.getWorkingTimeByDay(resourceId, date, 'overtime');
                    //__workingTimesByResource[resourceId][dateKey].capacity = calendarsService.resourceToWorkingDates[resourceId][dateKey].regular;
                    //__workingTimesByResource[resourceId][dateKey].overtime = calendarsService.resourceToWorkingDates[resourceId][dateKey].overtime;
                }

                var dailyCapacity = __noCapacityDefaultObject;

                if (calendarsService.resourceToWorkingDates[resourceId] && calendarsService.resourceToWorkingDates[resourceId][dateKey]) {
                    dailyCapacity = calendarsService.resourceToWorkingDates[resourceId][dateKey];
                }

                if (resourceCapacity) {
                    totalCapacity.break += resourceCapacity.break;
                    totalCapacity.na += resourceCapacity.na > dailyCapacity.regular ? dailyCapacity.regular : resourceCapacity.na;
                    totalCapacity.service += resourceCapacity.service;
                    totalCapacity.travel += resourceCapacity.travel;
                    totalCapacity.capacity += dailyCapacity.regular > -1 ? dailyCapacity.regular : 0;
                    totalCapacity.overtime += dailyCapacity.overtime;
                }
            }

            return totalCapacity;
        }

        // calculate location utilization
        function calculateLocationUtilization(locationDailyCapacity) {

            var timeInMinute = 0;

            // only add fields that are selected in the UI
            if (__capacityCalculationFields.services) {
                timeInMinute += locationDailyCapacity.service;
            }

            if (__capacityCalculationFields.breaks) {
                timeInMinute += locationDailyCapacity.break;
            }

            if (__capacityCalculationFields.na) {
                timeInMinute += locationDailyCapacity.na;
            }

            if (__capacityCalculationFields.travel) {
                timeInMinute += locationDailyCapacity.travel;
            }

            var capacity = __capacityCalculationFields.overtime ? locationDailyCapacity.capacity + locationDailyCapacity.overtime : locationDailyCapacity.capacity;

            if (capacity > 0) {
                var percent = timeInMinute / capacity;
                percent = Math.round(percent * 100);

                return percent;
            }

            return null;
        }

        // location cell html
        function generateLocationCellHtml(locationDailyCapacity, locationId, locationName, dateKey) {

            var timeInMinute = 0;

            // only add fields that are selected in the UI
            if (__capacityCalculationFields.services) {
                timeInMinute += locationDailyCapacity.service;
            }

            if (__capacityCalculationFields.breaks) {
                timeInMinute += locationDailyCapacity.break;
            }

            if (__capacityCalculationFields.na) {
                timeInMinute += locationDailyCapacity.na;
            }

            if (__capacityCalculationFields.travel) {
                timeInMinute += locationDailyCapacity.travel;
            }

            var capacity = __capacityCalculationFields.overtime ? locationDailyCapacity.capacity + locationDailyCapacity.overtime : locationDailyCapacity.capacity;

            if (capacity > 0) {
                var percent = timeInMinute / capacity;
                percent = Math.round(percent * 100);

                var shadowStyle = '';

                if (percent <= monthlyViewSettings.high) shadowStyle = 'style=\'box-shadow: inset 0 -2px 0 rgb(24, 165, 146)\'';else if (percent > monthlyViewSettings.high && percent <= monthlyViewSettings.critical) {
                    shadowStyle = 'style=\'box-shadow: inset 0 -2px 0 #FFEB3B\'';
                } else {
                    shadowStyle = 'style=\'box-shadow: inset 0 -2px 0 rgb(236, 95, 84)\'';
                }

                var travelError = '';
                if (locationDailyCapacity.travel / capacity > monthlyViewSettings.highTravel / 100) {
                    travelError = '<svg aria-hidden="true" class="tooMuchTravel slds-icon"><use xlink:href="' + lsdIcons.travel + '"></use></svg>';
                }

                return '<div ' + shadowStyle + ' onmouseout="removeMonthlyLocationTooltip()" onmouseover="createLocationMonthlyTooltip(event,\'' + locationId + '\', \'' + locationName.encodeHTML() + '\', \'' + dateKey + '\')">' + travelError + '<div class="monthlyViewHoursContainer">' + percent + '%</div></div>';
            }

            return '';
        }

        // get a time in minutes and generate h/m object, example: input 630, output: { h: 10, m: 30 }
        function generateHoursMinutes(timeInMinute) {

            var hours = Math.floor(timeInMinute / 60),
                minutes = timeInMinute % 60;

            if (minutes < 10) minutes = '0' + minutes;

            return {
                hours: hours,
                minutes: minutes
            };
        }

        // generate XXh XXm string (gets an input from generateHoursMinutes function)
        function generateTimeText(timeObject) {
            return timeObject.hours + 'h ' + timeObject.minutes + 'm';
        }

        // tooltip of event in the resource box (when clicking on a cell)
        function formatServiceTooltip(ev) {
            return customLabels.Start + ': ' + moment(ev.start).format('llll') + '\n' + (customLabels.Finish + ': ' + moment(ev.finish).format('llll'));
        }

        // get a capacity summary object and generate HTML
        function generateTooltipHtml(capacityObject, capacityDataHtml) {
            var calendarCapacity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : __noCapacityDefaultObject;


            if (capacityObject.service) {

                var totalServiceTime = generateHoursMinutes(capacityObject.service);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.clock + '"></use></svg>\n                        ' + generateTimeText(totalServiceTime) + '\n                        <div>' + customLabels.TotalScheduled + '</div>\n                    </div>';
            }

            if (capacityObject.travel) {

                var totalTravel = generateHoursMinutes(capacityObject.travel);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon monthly_travel_icon"><use xlink:href="' + lsdIcons.travel + '"></use></svg>\n                        ' + generateTimeText(totalTravel) + '\n                        <div>' + customLabels.TotalTravel + '</div>\n                    </div>';
            }

            if (capacityObject.na) {

                var totalNAs = generateHoursMinutes(capacityObject.na);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.na + '"></use></svg>\n                        ' + generateTimeText(totalNAs) + '\n                        <div>' + customLabels.TotalNAs + '</div>\n                    </div>';
            }

            if (capacityObject.break) {

                var totalBreaks = generateHoursMinutes(capacityObject.break);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon monthly_travel_icon"><use xlink:href="' + lsdIcons.coffee + '"></use></svg>\n                        ' + generateTimeText(totalBreaks) + '\n                        <div>' + customLabels.TotalBreaks + '</div>\n                    </div>';
            }

            var totalCapacity = capacityObject.capacity,
                totalOvertime = capacityObject.overtime;

            if (calendarCapacity.regular) {

                var _totalCapacity = generateHoursMinutes(calendarCapacity.regular);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon"><use xlink:href="' + lsdIcons.bucket + '"></use></svg>\n                        ' + generateTimeText(_totalCapacity) + '\n                        <div>' + customLabels.TotalCapacity + '</div>\n                    </div>';
            }

            if (calendarCapacity.overtime) {

                var _totalOvertime = generateHoursMinutes(calendarCapacity.overtime);

                capacityDataHtml += '\n                    <div class="monthlyView_tooltipKpi">\n                        <svg aria-hidden="true" class="slds-icon monthly_overtime_icon"><use xlink:href="' + lsdIcons.overtime + '"></use></svg>\n                        ' + generateTimeText(_totalOvertime) + '\n                        <div>' + customLabels.TotalOvertime + '</div>\n                    </div>';
            }

            return capacityDataHtml;
        }

        function reset() {
            __workingTimesByResource = {};
            __workingTimesByLocation = {};
        }

        // our factory
        return {
            updateMonthlyCapacity: updateMonthlyCapacity,
            capacityCalculationFields: __capacityCalculationFields,
            workingTimesByLocation: __workingTimesByLocation,
            calculateLocation: calculateLocation,
            calculateLocationUtilization: calculateLocationUtilization,
            calculateDailyResourceCapacity: calculateDailyResourceCapacity,
            reset: reset
        };
    }
})();