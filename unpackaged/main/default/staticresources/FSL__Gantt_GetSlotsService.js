'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    GetSlotsService.$inject = ['$rootScope', '$timeout', 'TimePhasedDataService', 'sfdcService', '$compile', 'utils', 'StateService', 'ResourcesAndTerritoriesService', 'ServiceAppointmentLightboxService', 'servicesService', 'kpiCalculationsService', 'MstResolver', 'DeltaService', '$q'];

    angular.module('serviceExpert').factory('GetSlotsService', GetSlotsService);

    function GetSlotsService($rootScope, $timeout, TimePhasedDataService, sfdcService, $compile, utils, StateService, ResourcesAndTerritoriesService, ServiceAppointmentLightboxService, servicesService, kpiCalculationsService, MstResolver, DeltaService, $q) {

        var MST_SCHEDULING_LONG_TINE = 2; // in seconds

        // create a new scope
        var $scope = null,
            candidatesIds = null,
            openedWithSlots = false;

        var GRADES = {
            STAR: candidatesGrades.ideal,
            EXCELLENT: candidatesGrades.ideal,
            GOOD: candidatesGrades.reecommended
        };

        var isRTL = StateService.isRtlDirection();

        // will be used to invoke get slots
        function get(serviceId) {

            if ($scope) {
                closePanel();
            }

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // turn off gantt highlighting
            if (window.__servicesInFilter) {
                window.__servicesInFilter.applied = false;
                updateViewDebounced();
            }

            // stuff
            candidatesIds = null;
            $scope.StateService = StateService;
            $scope.wereSlotsAlreadyDrawnOnGantt = false;
            $scope.gettingSlots = true;
            $scope.closePanel = closePanel;
            $scope.hideSlots = hideSlots;
            $scope.getResourceField = getResourceField;
            $scope.generateMstText = generateMstText;
            $scope.formatDateIntervalFinish = formatDateIntervalFinish;
            $scope.formatDateInterval = formatDateInterval;
            $scope.service = TimePhasedDataService.serviceAppointments()[serviceId];
            $scope.generateResultText = generateResultText;
            $scope.allSlotsArray = null;
            $scope.slotsTimespansIds = [];
            $scope.trustHtml = utils.trust;
            $scope.jumpToDate = jumpToDate;
            $scope.GRADES = GRADES;
            $scope.scheduleToSlot = scheduleToSlot;
            $scope.replaceLabels = replaceLabels;
            $scope.openLightbox = openLightbox;
            $scope.showOnGantt = showOnGantt;
            $scope.formatDateHeader = formatDateHeader;
            $scope.notifyWhenDoneGettingSlots = notifyWhenDoneGettingSlots;
            $scope.shouldNotify = false;
            $scope.scheduledActionInvoked = false;
            $scope.groupSlotsBy = 'Resource';
            $scope.roundGrade = roundGrade;
            $scope.bestSlot = null;
            $scope.gotSlots = true;
            $scope.exception = null;
            $scope.isMst = false;
            $scope.mstPromise = null;
            $scope.schedulingTakesLong = false;
            $scope.rawTimespans = [];
            $scope.partialResults = [];
            $scope.showPartialData = false;
            $scope.generateAsyncLabel = generateAsyncLabel;
            $scope.getAriaLabel = getAriaLabel;
            $scope.formatTooltipHeader = formatTooltipHeader;
            $scope.formatAsapObjective = formatAsapObjective;
            $scope.isRelatedSALength = 0;
            $scope.generateRelatedSAO2Text = generateRelatedSAO2Text;
            $scope.hideSlotsWasClicked = false;
            $scope.handleSortByChanged = handleSortByChanged;
            $scope.handleGroupByChanged = handleGroupByChanged;
            $scope.sortBy = 'name';
            $scope.sortOrder = 1;
            $scope.lastSortBy = 'date';
            $scope.lastSortOrder = 1;
            $scope.compareByName = compareByName;
            $scope.compareByDate = compareByDate;
            $scope.sortGradeButtonClassName = isRTL ? 'sort-button-grade rtl-button-sort-locator' : 'sort-button-grade';

            $scope.isAdmin = false;

            if (window.userHasAdminPermissions === undefined) {
                sfdcService.callRemoteAction(RemoteActions.userHasAdminPermissions).then(function (res) {
                    if (res) window.userHasAdminPermissions = $scope.isAdmin = true;else window.userHasAdminPermissions = false;
                });
            } else {
                $scope.isAdmin = window.userHasAdminPermissions;
            }

            $scope.generatePartialResult = function (p) {
                return customLabels.partialResults[p.Operation].replaceAll(p.Processed, p.Total);
            };

            // get slots
            if (!openedWithSlots) {
                getSlots(serviceId);
            }

            // add to body
            var getSlotsPanel = generateTemplate();
            angular.element('#LeftSideContainer').prepend(getSlotsPanel);

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return getSlotsPanel.remove();
            });

            // if territories are open, close it
            window.__closeLeftSideTerritories && window.__closeLeftSideTerritories();

            // compile
            $compile(getSlotsPanel)($scope);

            utils.safeApply($scope);
        }

        // open the panel with a predefined result, used for MST scheduling that takes long (will be opened from the notification menu)
        function openWithSlots(slots) {

            openedWithSlots = true;
            get(slots.fslOperation.result.Service.Id);

            if (slots.eventType === 'exception') {
                handleReplyFromGetSlots(slots); // slots contain exception
            }

            handleReplyFromGetSlots({ value: slots.fslOperation.result }, true);
            openedWithSlots = false;
        }

        // hide slots
        function hideSlots() {
            $scope.hideSlotsWasClicked = true;
            closePanel();
        }

        // close the get slots left side panel
        function closePanel() {
            var shouldDestroy = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;


            if (!$scope) {
                return;
            }

            // clear candidates
            candidatesIds = null;

            if (shouldDestroy) {
                $rootScope.$broadcast('GotSlotsEnded');
            }

            // reset globals (for GanttScrips)
            showCandidates.on = false;
            showCandidates.id = null;

            // delete timespans from gantt
            deleteCurrentSlots();

            updateViewDebounced();

            if (shouldDestroy) {
                $scope.$destroy();
            }
        }

        function roundGrade(grade) {
            return Math.round(grade);
        }

        // delete current slots from the gantt (UI)
        function deleteCurrentSlots() {
            for (var i = 0; i < $scope.slotsTimespansIds.length; i++) {
                scheduler.deleteMarkedTimespan($scope.slotsTimespansIds[i]);
            }
        }

        // get a field of the resource object
        function getResourceField(id, field) {
            if (id && ResourcesAndTerritoriesService.getResources()[id]) {
                return ResourcesAndTerritoriesService.getResources()[id][field];
            } else {
                return null;
            }
        }

        // format interval
        function formatDateInterval(interval) {
            var onlyMinutes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;


            var tzOffset = new Date(interval).getTimezoneOffset() * 60 * 1000,
                date = new Date(interval + tzOffset);

            return onlyMinutes ? moment(date).format('LT') : moment(date).format('llll');
        }

        // format interval
        function formatDateIntervalFinish(interval, IntervalStart) {

            var tzOffset = new Date(interval).getTimezoneOffset() * 60 * 1000,
                date = new Date(interval + tzOffset),
                dateStart = new Date(IntervalStart + tzOffset);

            if (dateStart.getDate() !== date.getDate()) {
                return moment(date).format('llll');
            }

            return moment(date).format('LT');
        }

        // format header of dates
        function formatDateHeader(dateString) {

            var dateBreak = dateString.split('_'),
                date = new Date(dateBreak[2], dateBreak[1], dateBreak[0], 0, 0, 0, 0);

            return moment(date).format('LL');
        }

        // results text (on top)
        function generateResultText(slots) {

            if (!slots) {
                return;
            }

            var numOfCandidates = 0,
                numOfSlots = 0;

            slots.forEach(function (slot) {
                numOfCandidates++;
                numOfSlots += slot.SchedulingOptions.length;
            });

            return customLabels.getSlotsExpText.replaceAll('<b>' + numOfCandidates + '</b>', '<b>' + numOfSlots + '</b>', '<b>' + $scope.service.name + '</b>', '<b>' + formatDateInterval($scope.bestSlot.Interval.Start) + '</b>', '<b>' + $scope.bestSlot.Resource.Resource.Name + '</b>', '<b>' + Math.round($scope.bestSlot.Grade) + '</b>');
        }

        // get slots from server
        function getSlots(serviceId) {

            sfdcService.getSlots(serviceId, StateService.selectedPolicyId).then(function (slots) {

                // check if the user clicked hide slots before we got a response from getSlots
                // in this case we won't need to display the slots
                if ($scope.hideSlotsWasClicked) {
                    return;
                }

                if (slots && slots.value && slots.value.FSLOperationId) {

                    $scope.isMst = true;
                    $timeout(function () {
                        return $scope.schedulingTakesLong = true;
                    }, MST_SCHEDULING_LONG_TINE * 1000);

                    $scope.mstPromise = MstResolver.getUpdates(slots.value.FSLOperationId).then(function (result) {

                        if (!$scope.shouldNotify) {
                            handleReplyFromGetSlots({ value: result.fslOperation.result }, true);
                        }

                        return result;
                    }).catch(function (ex) {
                        console.error(ex);

                        var event = { message: ex.message || ex };

                        if (!$scope.shouldNotify) {
                            handleReplyFromGetSlots({ eventType: 'exception', event: event });
                        }

                        return $q.reject({ eventType: 'exception', event: event });
                    });

                    return;
                }

                handleReplyFromGetSlots(slots);
            }).catch(function (err) {

                var event = { message: err.message || err };

                console.warn('could not get candidates');
                console.log(err);
                if (!$scope.shouldNotify) {
                    handleReplyFromGetSlots({ eventType: 'exception', event: event });
                }
            });
        }

        // notiy when done gettings slots
        function notifyWhenDoneGettingSlots() {

            $scope.shouldNotify = true;

            $scope.mstPromise.then(function (results) {

                utils.addNotification(customLabels.MstFinishedGettingSlots.replace('$0', $scope.service.AppointmentNumber), customLabels.MstFinishedGettingSlotsMessage, function () {
                    openWithSlots(results);
                }, null, true);
            }).catch(function (ex) {

                console.error(ex);

                utils.addNotification(customLabels.MstFinishedGettingSlots.replace('$0', $scope.service.AppointmentNumber), ex, function () {});
            });

            closePanel(true);
        }

        // handle reply of get slots
        function handleReplyFromGetSlots(slots) {
            $scope.gettingSlots = false;

            if (slots.eventType === 'exception') {
                $scope.gotSlots = false;
                $scope.exception = slots.event;
                return;
            }

            $scope.partialResults = slots.value.PartialResults || [];
            drawSlotsOnGantt(slots.value);

            // no slots, stop here
            if (!$scope.gotSlots) {
                return;
            }

            $scope.allSlotsArray = [];
            $scope.slotsByDateObject = {};

            $scope.dateKeysArray = [];
            var datesArray = [];
            var intervalsArray = [];

            candidatesIds = {};

            for (var resourceId in slots.value.ResourceIDToScheduleData) {

                var resourceSlots = slots.value.ResourceIDToScheduleData[resourceId];

                if (!resourceSlots.Resource.Resource) {
                    continue;
                }

                $scope.allSlotsArray.push(resourceSlots);

                // this is for the group by date option
                for (var i = 0; i < resourceSlots.SchedulingOptions.length; i++) {

                    var intervalStart = new Date(resourceSlots.SchedulingOptions[i].Interval.Start),
                        tzOffset = new Date(resourceSlots.SchedulingOptions[i].Interval.Start).getTimezoneOffset() * 60 * 1000;

                    candidatesIds[resourceId] = true;

                    intervalStart.setMilliseconds(intervalStart.getMilliseconds() + tzOffset);
                    var date = intervalStart.getFullYear() + ' ' + intervalStart.getMonth() + ' ' + intervalStart.getDate();
                    if (!datesArray.includes(date)) {
                        datesArray.push(date);
                        intervalsArray.push(intervalStart);
                    }

                    var dateKey = generateDateKey(intervalStart);
                    $scope.slotsByDateObject[dateKey] = $scope.slotsByDateObject[dateKey] || [];
                    resourceSlots.SchedulingOptions[i].Resource = slots.value.ResourceIDToScheduleData[resourceId].Resource;
                    $scope.slotsByDateObject[dateKey].push(resourceSlots.SchedulingOptions[i]);
                }
            }

            intervalsArray.sort(function (date1, date2) {
                return date1 - date2;
            });
            for (var _i = 0; _i < intervalsArray.length; _i++) {
                $scope.dateKeysArray[_i] = generateDateKey(intervalsArray[_i]);
            }

            // sort by resource name
            $scope.allSlotsArray.sort(function (res1, res2) {
                if (res1.Resource.Resource.Name > res2.Resource.Resource.Name) return 1;
                if (res1.Resource.Resource.Name < res2.Resource.Resource.Name) return -1;
                return 0;
            });

            // get highest ranked slot for each resource
            for (var _i2 = 0; _i2 < $scope.allSlotsArray.length; _i2++) {
                $scope.allSlotsArray[_i2].highest = getHighestRankedSlot($scope.allSlotsArray[_i2].SchedulingOptions);
            }

            // sort dates grouoping and get highest
            for (var _dateKey in $scope.slotsByDateObject) {

                var datesSlotsArray = $scope.slotsByDateObject[_dateKey];

                // sort by interval start
                datesSlotsArray.sort(function (slot1, slot2) {
                    if (slot1.Interval.Start > slot2.Interval.Start) return 1;
                    if (slot1.Interval.Start < slot2.Interval.Start) return -1;
                    return 0;
                });

                datesSlotsArray.highest = getHighestRankedSlot(datesSlotsArray);

                // get best slot
                if (!$scope.bestSlot) {
                    $scope.bestSlot = datesSlotsArray.highest;
                } else if ($scope.bestSlot.Grade < datesSlotsArray.highest.Grade) {
                    $scope.bestSlot = datesSlotsArray.highest;
                }
            }

            $scope.isRelatedSALength = slots.value.relatedSACounter;

            setTimeout(function () {
                return angular.element('#slotsSentence').html(generateResultText($scope.allSlotsArray));
            }, 100);
        }

        // get highest ranked slot
        function getHighestRankedSlot(schedulingOptions) {

            var highestRankedIndex = 0,
                slots = schedulingOptions,
                highestSlot = slots[0];

            for (var j = 0; j < slots.length; j++) {
                if (slots[highestRankedIndex].Grade < slots[j].Grade) {
                    highestRankedIndex = j;
                    highestSlot = slots[j];
                }
            }

            return highestSlot;
        }

        // set interval object
        function getIntervalDates(interval) {

            var tz_start = new Date(interval.Start).getTimezoneOffset() * 60 * 1000,
                tz_finish = new Date(interval.Finish).getTimezoneOffset() * 60 * 1000;

            return {
                startDate: new Date(interval.Start + tz_start),
                endDate: new Date(interval.Finish + tz_finish)
            };
        }

        // draw on gantt
        function drawSlotsOnGantt(slots) {

            var resourcesNames = '',
                minDateOfCandidate = null,
                gotSlots = false;

            for (var resourceKey in slots.ResourceIDToScheduleData) {

                if (slots.ResourceIDToScheduleData[resourceKey].SchedulingOptions) {

                    var schedulingOptions = slots.ResourceIDToScheduleData[resourceKey].SchedulingOptions;

                    var _loop = function _loop(i) {

                        var intervals = getIntervalDates(schedulingOptions[i].Interval),
                            resourceIdOnGantt = TimePhasedDataService.getResoruceGanttIdByDate(resourceKey, intervals.startDate);

                        if (showSecondarySTMs && $scope.service.ServiceTerritoryId) resourceIdOnGantt = TimePhasedDataService.getResoruceGanttIdByDateAndTerritory(resourceKey, intervals.startDate, $scope.service.ServiceTerritoryId);

                        // resource is not on the gantt
                        if (!resourceIdOnGantt) {
                            return 'continue';
                        }

                        if (i === 0) {
                            resourcesNames += slots.ResourceIDToScheduleData[resourceKey].Resource.Resource.Name + ', ';
                            gotSlots = true;
                        }

                        if (intervals.startDate < minDateOfCandidate || minDateOfCandidate === null) {
                            minDateOfCandidate = new Date(intervals.startDate);
                        }

                        var _loop2 = function _loop2(key) {

                            var sectionsToDraw = {};
                            sectionsToDraw[key] = resourceIdOnGantt.indexOf(',') > -1 ? resourceIdOnGantt.split(',') : [resourceIdOnGantt];

                            var mstId = '';

                            if (schedulingOptions[i].MSTOptions) {
                                mstId = new Date().getTime() + Math.floor(Math.random() * 100000);
                                window.mstOptions = window.mstOptions || {};
                                window.mstOptions[mstId] = schedulingOptions[i].MSTOptions;
                            }

                            var opacity = 0.11 + parseInt(schedulingOptions[i].Grade) / 100 * 0.64,
                                cssGrade = getCssGradeForColoring(schedulingOptions[i].Grade, opacity),
                                slotText = schedulingOptions[i].Grade < 0 ? '' : Math.round(schedulingOptions[i].Grade),
                                slotTooltip = customLabels.CandidateGradeGantt.replaceAll(moment(intervals.startDate).format('dddd LT'), moment(intervals.endDate).format('dddd LT'), slotText),
                                timespan = {
                                start_date: intervals.startDate,
                                end_date: intervals.endDate,
                                sections: sectionsToDraw,
                                html: getHtmlForSlots(),
                                css: getCssForColoring(schedulingOptions[i].Grade)
                            };

                            function getHtmlForSlots() {
                                if (key === 'ZoomLevel6' || key === 'ZoomLevel7') {
                                    return '<div oncontextmenu=\'scheduleSlot(event, "' + $scope.service.id + '", "' + intervals.startDate.getTime() + '", "' + resourceIdOnGantt + '", "' + StateService.selectedPolicyId + '", "' + mstId + '")\', title=\'' + slotTooltip + '\' style=\'' + cssGrade + '\'><span class=\'slotText\'>' + slotText + '</span></div>';
                                } else {
                                    return '<div oncontextmenu=\'scheduleSlot(event, "' + $scope.service.id + '", "' + intervals.startDate.getTime() + '", "' + resourceIdOnGantt + '", "' + StateService.selectedPolicyId + '", "' + mstId + '")\', title=\'' + slotTooltip + '\' style=\'' + cssGrade + '\'><span class=\'slotText\'><span>' + slotText + '</span><span style="font-size: 8px">/100</span></span></div>';
                                }
                            }

                            // we are going to draw the timespans twice, one before the call to getTimePhasedObjects and one after
                            // this will eliminate the delay in drawing them while the candidates list is already displayed
                            $scope.slotsTimespansIds.push(scheduler.addMarkedTimespan(timespan));
                            $scope.rawTimespans.push(timespan);
                        };

                        for (var key in scheduler.matrix) {
                            _loop2(key);
                        }
                    };

                    for (var i = 0; i < schedulingOptions.length; i++) {
                        var _ret = _loop(i);

                        if (_ret === 'continue') continue;
                    }
                }
            }

            if (gotSlots) {

                var datesInterval = utils.setDatesByStartAndMode(minDateOfCandidate);

                datesInterval.start.setDate(datesInterval.start.getDate() - 1);
                datesInterval.end.setDate(datesInterval.end.getDate() + 1);

                TimePhasedDataService.getTimePhasedObjects(datesInterval.start, datesInterval.end).then(function () {

                    // check if the user clicked hide slots before we got a response from getTimePhasedObjects
                    // in this case we won't need to display the slots
                    if ($scope.hideSlotsWasClicked) {
                        return;
                    }

                    // delete timespans from gantt before drawing them again
                    deleteCurrentSlots();

                    for (var i = 0; i < $scope.rawTimespans.length; i++) {
                        //draw slots
                        $scope.slotsTimespansIds.push(scheduler.addMarkedTimespan($scope.rawTimespans[i]));
                    }

                    // set global showCandidates to understand who we shouldn't fade out
                    showCandidates.on = true;
                    showCandidates.id = $scope.service.id;

                    if (utils.ganttSettings && utils.ganttSettings.filterCandidates) {

                        // add current resource if he's not a candidate
                        if ($scope.service.resourceId && resourcesNames.indexOf($scope.service.resourceName) === -1) {
                            resourcesNames += $scope.service.resourceName + ', ';
                        }

                        resourcesNames = resourcesNames.substr(0, resourcesNames.length - 2);
                    }

                    scheduler.setCurrentView(minDateOfCandidate);

                    $rootScope.$broadcast('GotSlots', { resourceToFilter: resourcesNames, minDateOfCandidate: minDateOfCandidate });
                    //scheduler.setCurrentView(minDateOfCandidate);
                }).finally(function () {
                    return $scope.wereSlotsAlreadyDrawnOnGantt = true;
                });
            } else {
                $scope.gotSlots = false;
            }
        }

        function getCssForColoring(grade) {
            return 'slot-mark ' + (parseInt(grade) >= $scope.GRADES.EXCELLENT ? 'slot-mark-green' : parseInt(grade) >= $scope.GRADES.GOOD ? 'slot-mark-yellow' : 'slot-mark-orange');
        }

        function getCssGradeForColoring(grade, opacity) {
            return parseInt(grade) >= $scope.GRADES.EXCELLENT ? 'background-color: rgba(135, 220, 122,' + opacity + ');' : parseInt(grade) >= $scope.GRADES.GOOD ? 'background-color: rgba(255, 214, 76,' + opacity + ');' : 'background-color: rgba(255, 108, 69,' + opacity + ');';
        }

        // jump to date on the gantt
        function jumpToDate(interval) {
            $rootScope.$broadcast('JumpToDate', new Date(interval));
        }

        function replaceLabels(label, arr) {
            var _customLabels$label;

            return (_customLabels$label = customLabels[label]).replaceAll.apply(_customLabels$label, _toConsumableArray(arr));
        }

        function openLightbox() {
            ServiceAppointmentLightboxService.open($scope.service.id);
        }

        function showOnGantt() {
            utils.showOnGantt($scope.service.id);
        }

        function handleGroupByChanged() {
            var _ref = [$scope.lastSortBy, $scope.sortBy];
            $scope.sortBy = _ref[0];
            $scope.lastSortBy = _ref[1];
            var _ref2 = [$scope.lastSortOrder, $scope.sortOrder];
            $scope.sortOrder = _ref2[0];
            $scope.lastSortOrder = _ref2[1];
        }

        function handleSortByChanged(field) {
            $scope.sortBy = field;
            if (!$scope.sortOrder) {
                $scope.sortOrder = 1;
            } else {
                $scope.sortOrder *= -1;
            }
        }

        function compareByName(first, second) {
            if ($scope.sortOrder) {
                var resource1 = first.value;
                var resource2 = second.value;
                if ($scope.sortBy === 'name') {
                    return $scope.sortOrder * (resource1.Resource.Resource.Name <= resource2.Resource.Resource.Name ? -1 : 1);
                } else {
                    return $scope.sortOrder * (roundGrade(resource1.highest.Grade) <= roundGrade(resource2.highest.Grade) ? -1 : 1);
                }
            }
        }

        function compareByDate(first, second) {
            if ($scope.sortOrder) {
                var date1 = first.value;
                var date2 = second.value;
                if ($scope.sortBy === 'date') {
                    return $scope.sortOrder * (new Date(formatDateHeader(date1)) <= new Date(formatDateHeader(date2)) ? -1 : 1);
                } else {
                    return $scope.sortOrder * (roundGrade($scope.slotsByDateObject[date1].highest.Grade) <= roundGrade($scope.slotsByDateObject[date2].highest.Grade) ? -1 : 1);
                }
            }
        }

        function formatTooltipHeader() {
            var str1 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;


            var totalSlots = 0;

            $scope.allSlotsArray.forEach(function (slot) {
                return totalSlots += slot.SchedulingOptions.length;
            });

            return customLabels['AB_Explanation_Header'].replace('{0}', str1).replace('{1}', totalSlots);
        }

        function formatAsapObjective(date) {
            var dateVar = parseInt(date);
            return moment.tz(dateVar, userTimeZone).format('llll');
        }

        function generateAsyncLabel() {
            return $scope.service.Use_Async_Logic ? customLabels.ServiceUsingAsync : customLabels.MstTakingLongTime;
        }

        //W-8390164
        function getAriaLabel(grade) {
            if (grade >= $scope.GRADES.EXCELLENT) {
                return customLabels.Ideal;
            } else if (grade >= $scope.GRADES.GOOD && grade < $scope.GRADES.EXCELLENT) {
                return customLabels.Recommended;
            }
            return 'Not recommended';
        };

        // generate left side panel
        function generateTemplate() {
            var serviceCrewGanttColor = 'getResourceField( candidate.Resource.Resource.Id, \'serviceCrew__r\').' + fieldNames.ServiceCrew.GanttColor__c;

            var template = '\n                <div id="GetSlotsPanel" xmlns="http://www.w3.org/1999/html">\n\n                    <div class="slots-panel-title-head">\n                        <div class="slots-panel-title">\n                            {{ replaceLabels(\'ShowingCandidatesTo\', [service.name] ) }}\n                        </div>\n                        <div class="clear-slots truncate" ng-click="hideSlots()" title="' + customLabels.HideSlots + '">' + customLabels.HideSlots + '</div>\n                    </div>\n\n\n                    <div ng-show="gettingSlots && !wereSlotsAlreadyDrawnOnGantt" class="getting-slots">\n                        <img src="' + lsdIcons.spinnerGif + '" />\n                        ' + customLabels.FindingCandidates + '\n                        \n                        <div class="get-slots-mst" ng-show="isMst && schedulingTakesLong">\n                            {{ generateAsyncLabel() }}\n                            <div class="get-slots-mst-button" ng-click="notifyWhenDoneGettingSlots()">' + customLabels.MstNotifyMeWhenDone + '</div>\n                        </div>\n                    </div>\n                    \n                    \n                    <div ng-show="exception" class="get-slots-error">\n                        <svg aria-hidden="true" class="slds-icon">\n                          \u2028<use xlink:href=\'' + lsdIcons.violation + '\'></use>\n                        \u2028</svg>\n                        {{ exception.message }}\n                        \n                        <div>' + customLabels.ContactSysAdmin + '</div>\n                    </div>\n                    \n                    <div ng-show="!gotSlots && !exception" class="get-slots-error">\n                        <i class="fa fa-frown-o"></i>\n                        \n                        <div>' + customLabels.noCandidatesMessageGantt + '</div>\n                        \n                        <div id="AN-PartialResults" ng-show="partialResults.length > 0">\n                            <div>' + customLabels.particalCouldntProcessAll + ' <u ng-show="isAdmin" ng-click="showPartialData = !showPartialData">' + customLabels.ShowDetails + '</u></div>\n\n                            <div ng-show="showPartialData">\n                                <ul>\n                                    <li ng-repeat="partial in partialResults">\n                                        {{ generatePartialResult(partial) }}\n                                    </li>\n\n                                </ul>\n                            </div>\n                        </div>\n                        \n                    </div>\n\n\n\n\n                    <div class="slots-results-recommendations" ng-if="allSlotsArray" ng-show="gotSlots">\n                        <span id="slotsSentence"></span>\n                        <div class="assign-to-recommended" ng-click="scheduleToSlot(bestSlot.Interval.Start, bestSlot.Resource.Resource.Id, StateService.selectedPolicyId,bestSlot)">' + customLabels.AssignToRecommended + '</div>\n                    </div>\n\n\n\n                    <div class="slots-grouping" ng-show="allSlotsArray" ng-show="gotSlots">\n                        <span class="truncate groupSlotsBy" title="' + customLabels.GroupSlotsBy + '">' + customLabels.GroupSlotsBy + '</span>\n                        <input type="radio" id="groupByResource" name="groupBy" ng-model="groupSlotsBy" value="Resource" checked="checked" ng-change="handleGroupByChanged()">\n                        <label class="groupSlotsBy slots-groupByResource truncate" for="groupByResource" title="' + customLabels.Resource + '">' + customLabels.Resource + '</label>\n                        <input type="radio" id="groupByName" name="groupBy" ng-model="groupSlotsBy" value="Date" ng-change="handleGroupByChanged()">\n                        <label class="groupSlotsBy truncate slots-groupByName" for="groupByName" title="' + customLabels.Date + '">' + customLabels.Date + '</label>\n\n                        <div class="button-on-grouping" ng-show="service.isScheduled()" ng-click="showOnGantt()" title="' + customLabels.Show_on_gantt + '">\n                            <svg aria-hidden="true" class="slds-icon quickActionIcon">\n                                \u2028<use xlink:href="' + lsdIcons.table + '"></use>\n                            \u2028</svg>\n                        </div>\n\n                        <div class="button-on-grouping" ng-click="openLightbox()" title="' + customLabels.OpenDetailsWindow + '">\n                            <svg aria-hidden="true" class="slds-icon quickActionIcon">\n                                \u2028<use xlink:href="' + lsdIcons.info + '"></use>\n                            \u2028</svg>\n                        </div>\n                    </div>\n                    \n                    <div class="slots-grouping sort-container" ng-show="allSlotsArray" ng-show="gotSlots">\n                        <span class="sort-button" ng-click="handleSortByChanged(\'name\')" ng-if="groupSlotsBy == \'Resource\'">\n                            ' + customLabels.Name + '\n                                <span ng-if="sortBy == \'name\'">\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == 1">\n                                        <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                    </svg>\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == -1">\n                                        <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                    </svg>\n                                </span>\n                        </span>\n                        \n                        <span class="sort-button" ng-click="handleSortByChanged(\'date\')" ng-if="groupSlotsBy == \'Date\'">\n                            ' + customLabels.Date + '\n                                <span ng-if="sortBy == \'date\'">\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == 1">\n                                        <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                    </svg>\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == -1">\n                                        <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                    </svg>\n                                </span>\n                        </span>\n                  \n                        <span class="{{sortGradeButtonClassName}}" ng-click="handleSortByChanged(\'grade\')">\n                            ' + customLabels.Grade + '\n                                <span ng-if="sortBy == \'grade\'">\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == 1">\n                                        <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                    </svg>\n                                    <svg aria-hidden="true" class="slds-icon sort-arrow" ng-if="sortOrder == -1">\n                                    <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                    </svg>\n                                </span>\n                        </span>\n                    </div>\n\n                    <div id="Slots-List-In-Panel" ng-show="gotSlots">\n                    \n                        <div id="AN-PartialResults" ng-show="partialResults.length > 0">\n                            <div>' + customLabels.particalCouldntProcessAll + ' <u ng-show="isAdmin" ng-click="showPartialData = !showPartialData">' + customLabels.ShowDetails + '</u></div>\n\n                            <div ng-show="showPartialData">\n                                <ul>\n                                    <li ng-repeat="partial in partialResults">\n                                        {{ generatePartialResult(partial) }}\n                                    </li>\n\n                                </ul>\n                            </div>\n                        </div>\n                        \n                        \n                        \n                    \n                        <div ng-repeat="candidate in allSlotsArray| orderBy: candidate:false:compareByName" class="resource-slot-row" ng-init="candidate.showSlots = false" ng-show="groupSlotsBy == \'Resource\'">\n    \n                            <div ng-show="getResourceField(candidate.Resource.Resource.Id, \'name\')" class="candidates-container-row" ng-click="candidate.showSlots = !candidate.showSlots">\n                                <div ng-show="getResourceField(candidate.Resource.Resource.Id, \'pictureLink\') == null && getResourceField(candidate.Resource.Resource.Id, \'serviceCrew\') == undefined" class="ResourcePhotoIcon"></div>\n                                <div ng-show="getResourceField(candidate.Resource.Resource.Id, \'serviceCrew\') != undefined && getResourceField(candidate.Resource.Resource.Id, \'pictureLink\') == null" ng-style="{\'background-color\': ' + serviceCrewGanttColor + ' ? ' + serviceCrewGanttColor + ' : \'#a99be8\'}" class="ResourcePhotoIcon CrewPhotoIcon"></div>\n                                <img ng-show="getResourceField(candidate.Resource.Resource.Id, \'pictureLink\') != null" ng-src="{{getResourceField(candidate.Resource.Resource.Id, \'pictureLink\')}}" class="ResourcePhotoIcon" />\n                                <h1>{{ getResourceField(candidate.Resource.Resource.Id, \'name\') }}</h1>\n                                {{ replaceLabels(\'Xoptions\', [candidate.SchedulingOptions.length] ) }}\n                                \n                                <div ng-show="candidate.highest.Grade > -1" class="slot-grade slots-highest-grade" ng-class=\'{\n                                                "GS-grade-excellent": candidate.highest.Grade >= GRADES.EXCELLENT,\n                                                "GS-grade-good": candidate.highest.Grade >= GRADES.GOOD && candidate.highest.Grade < GRADES.EXCELLENT,\n                                                "GS-grade-ok": candidate.highest.Grade < GRADES.GOOD}\'>\n    \n                                                {{roundGrade(candidate.highest.Grade)}}/100\n                                </div>\n                            </div>\n    \n                            <div ng-repeat="intervalItem in candidate.SchedulingOptions" class="time-interval" ng-init="intervalItem.showExplain[\'Resource\'] = false; intervalItem.showExplain[\'Date\'] = false;" ng-show="candidate.showSlots">\n                               \n                                <svg class="AN-InfoIcon slds-icon" aria-hidden="true" aria-label="{{roundGrade(intervalItem.Grade)}}/100" ng-show="intervalItem.Grades && intervalItem.Grades.length > 0" ng-click="intervalItem.showExplain[groupSlotsBy] = !intervalItem.showExplain[groupSlotsBy]; $event.stopPropagation();">\n                                    <use xlink:href="' + lsdIcons.info + '"></use>\n                                </svg>\n                               \n                                <span class="jump-to-date" title="Jump to date" ng-click="jumpToDate(intervalItem.Interval.Start)">{{ formatDateInterval(intervalItem.Interval.Start) }}</span>\n    \n                                <div class="slot-grade" ng-show="intervalItem.Grade > -1" ng-class=\'{\n                                                "GS-grade-excellent": intervalItem.Grade >= GRADES.EXCELLENT,\n                                                "GS-grade-good": intervalItem.Grade >= GRADES.GOOD && intervalItem.Grade < GRADES.EXCELLENT,\n                                                "GS-grade-ok": intervalItem.Grade < GRADES.GOOD}\'>\n    \n                                                {{roundGrade(intervalItem.Grade)}}/100\n                                </div>\n    \n                                <div ng-click="scheduleToSlot(intervalItem.Interval.Start, candidate.Resource.Resource.Id, StateService.selectedPolicyId, intervalItem)" class="schedule-to-slot">' + customLabels.Schedule + '</div>\n                                \n                                \n                                <div class="mst-interval-for-tapuhi truncate" ng-show="intervalItem.MSTOptions" title="{{generateMstText(intervalItem.MSTOptions)}}">\n                                    {{generateMstText(intervalItem.MSTOptions)}}\n                                </div>\n                                <div class="mst-interval-for-tapuhi truncate" ng-show="isRelatedSALength" title="{{generateRelatedSAO2Text()}}">\n                                    {{generateRelatedSAO2Text()}}\n                                </div>\n                                \n                                \n                                \n                                <div class="gs-explain-container" ng-show="intervalItem.showExplain[groupSlotsBy] && intervalItem.Grades && intervalItem.Grades.length > 0" >\n                                    <div class="AN-SlotSingleInfo" ng-repeat="info in intervalItem.Grades" ng-if="info.Text" role="region" aria-label="{{roundGrade(intervalItem.Grade)}}" >\n                                        <div class="AN-ObjectGrade" aria-live="polite" \n                                             aria-label="{{ getAriaLabel(info.Grade) }}"\n                                             ng-class="{\n                                            \'AN-ObjectGradeGood\': info.Grade >= GRADES.EXCELLENT,\n                                            \'AN-ObjectGradeAverage\': info.Grade >= GRADES.GOOD && info.Grade < GRADES.EXCELLENT,\n                                            \'AN-ObjectGradeBad\': info.Grade <= GRADES.GOOD,\n                                        }"></div>\n                                        <b>{{info.HeaderText}}</b><br/>\n                                        <span ng-if="info.ObjectiveRecordTypeName !== \'Objective_Asap\'">{{ info.Text }}</span>\n                                        <span ng-if="info.ObjectiveRecordTypeName === \'Objective_Asap\'">{{ formatAsapObjective(info.Text) }}</span>\n                                    </div>\n                                </div>\n                                \n                               \n                            </div>\n    \n                        </div>\n                        \n                       \n                       \n                        <div ng-repeat="date in dateKeysArray | orderBy: date:false:compareByDate" class="resource-slot-row" ng-init="candidate.showSlots = false" ng-show="groupSlotsBy == \'Date\'">\n                            <div class="candidates-container-row date-title-container" ng-click="slotsByDateObject[date].showDatesSlots = !slotsByDateObject[date].showDatesSlots">\n                                <h1>{{ formatDateHeader(date) }}</h1>\n                                {{ replaceLabels(\'Xoptions\', [slotsByDateObject[date].length] ) }}\n                                \n                                        <div class="slot-grade slots-highest-grade" ng-show="slotsByDateObject[date].highest.Grade > -1" ng-class=\'{\n                                                "GS-grade-excellent": slotsByDateObject[date].highest.Grade >= GRADES.EXCELLENT,\n                                                "GS-grade-good": slotsByDateObject[date].highest.Grade >= GRADES.GOOD && slotsByDateObject[date].highest.Grade < GRADES.EXCELLENT,\n                                                "GS-grade-ok": slotsByDateObject[date].highest.Grade < GRADES.GOOD}\'>\n    \n                                                {{roundGrade(slotsByDateObject[date].highest.Grade)}}/100\n                                        </div>\n                            </div>\n    \n                            <div ng-repeat="intervalItem in slotsByDateObject[date]" class="time-interval" ng-show="slotsByDateObject[date].showDatesSlots">\n                            \n                                <svg class="AN-InfoIcon slds-icon" aria-hidden="true" aria-label="{{roundGrade(intervalItem.Grade)}}/100" ng-show="intervalItem.Grades && intervalItem.Grades.length > 0" ng-click="intervalItem.showExplain[groupSlotsBy] = !intervalItem.showExplain[groupSlotsBy]; $event.stopPropagation();">\n                                    <use xlink:href="' + lsdIcons.info + '"></use>\n                                </svg>\n                            \n                                <span class="jump-to-date" title="Jump to date" ng-click="jumpToDate(intervalItem.Interval.Start)">{{ formatDateInterval(intervalItem.Interval.Start, true)}}</span>\n                                <span> ({{intervalItem.Resource.Resource.Name}})</span>\n    \n                                <div class="slot-grade" ng-show="intervalItem.Grade > -1" ng-class=\'{\n                                                "GS-grade-excellent": intervalItem.Grade >= GRADES.EXCELLENT,\n                                                "GS-grade-good": intervalItem.Grade >= GRADES.GOOD && intervalItem.Grade < GRADES.EXCELLENT,\n                                                "GS-grade-ok": intervalItem.Grade < GRADES.GOOD}\'>\n    \n                                                {{roundGrade(intervalItem.Grade)}}/100\n                                </div>\n    \n                                <div ng-click="scheduleToSlot(intervalItem.Interval.Start, intervalItem.Resource.Resource.Id, StateService.selectedPolicyId, intervalItem)" class="schedule-to-slot">' + customLabels.Schedule + '</div>\n                                \n                                <div class="mst-interval-for-tapuhi truncate" ng-show="intervalItem.MSTOptions">\n                                    {{generateMstText(intervalItem.MSTOptions)}}\n                                </div>\n                                \n                                \n                                \n                                <div class="gs-explain-container" ng-show="intervalItem.showExplain[groupSlotsBy] && intervalItem.Grades && intervalItem.Grades.length > 0" >\n                                    <div class="AN-SlotSingleInfo" ng-repeat="info in intervalItem.Grades" ng-if="info.Text" role="region" aria-label="{{roundGrade(intervalItem.Grade)}}">\n                                        <div class="AN-ObjectGrade 1111" aria-live="polite" \n                                             aria-label="{{ getAriaLabel(info.Grade) }}""\n                                             ng-class="{\n                                            \'AN-ObjectGradeGood\': info.Grade >= GRADES.EXCELLENT,\n                                            \'AN-ObjectGradeAverage\': info.Grade >= GRADES.GOOD && info.Grade < GRADES.EXCELLENT,\n                                            \'AN-ObjectGradeBad\': info.Grade <= GRADES.GOOD,\n                                        }"></div>\n                                        <b>{{info.HeaderText}}</b><br/>\n                                        <span ng-if="info.ObjectiveRecordTypeName !== \'Objective_Asap\'">{{ info.Text }}</span>\n                                        <span ng-if="info.ObjectiveRecordTypeName === \'Objective_Asap\'">{{ formatAsapObjective(info.Text) }}</span>\n                                    </div>\n                                </div>\n                                \n                                \n                                \n                            </div>\n    \n                        </div>\n\n                </div>\n            ';

            return angular.element(template);
        }

        function generateMstText(mstOption) {

            var res = '';

            for (var serviceId in mstOption) {

                // res = customLabels.MstCandidatesGanttLine
                //         .replace('$0',TimePhasedDataService.serviceAppointments()[serviceId].name)
                //         .replace('$1',formatDateInterval(mstOption[serviceId].Interval.Start))
                //         .replace('$2',mstOption[serviceId].Resource.Resource.Name);

                // CFSL-1968
                res = customLabels.RelatedServiceSchedulingSentence.replace('$0', formatDateInterval(mstOption[serviceId].Interval.Start)).replace('$1', mstOption[serviceId].Resource.Resource.Name);
            }

            return res;
        }

        function generateRelatedSAO2Text() {
            return $scope.isRelatedSALength > 1 ? customLabels.MultipleRelatedServicesSentence.replace('$0', $scope.isRelatedSALength) : customLabels.SingleRelatedServicesSentence;
        }

        function scheduleRelatedSlot(intervalItem, serviceId, policyId) {

            var startDate = intervalItem.Interval.Start,
                finishDate = intervalItem.Interval.Finish,
                resourceKey = intervalItem.Resource.Resource.Id,
                service = TimePhasedDataService.serviceAppointments()[serviceId],
                tz_start = new Date(startDate).getTimezoneOffset() * 60 * 1000,
                ganttResrouceId = TimePhasedDataService.getResoruceGanttIdByDate(resourceKey, startDate);

            startDate += tz_start;
            finishDate += tz_start;

            // service not on gantt
            if (!service) {

                startDate = new Date(startDate);
                finishDate = new Date(finishDate);

                sfdcService.saveChangesToServiceAppointment(serviceId, resourceKey, null, null, startDate, finishDate, StateService.selectedPolicyId, 'AutomaticGetSlots');
                DeltaService.getDelta();

                return;
            }

            updateService(service, startDate, ganttResrouceId || resourceKey, policyId);

            servicesService.saveChangesToServiceAppointment(service, service).then(function (parsedUpdatedObjects) {

                // parsedUpdatedObjects.absences.forEach(absence => {
                //     absence.isScheduled() && absence.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                // });
                //
                // parsedUpdatedObjects.services.forEach(service => {
                //     service.isScheduled() && service.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                // });
                //
                // servicesService.drawServicesAndAbsences(parsedUpdatedObjects.services || [], parsedUpdatedObjects.absences || []);

                // update kpis, muse be after the events are added to the gantt
                kpiCalculationsService.calculateKpis();
            });
        }

        function scheduleToSlot(startDate, resourceKey, policyId, intervalItem) {

            // allow scheduling only once
            if ($scope.scheduledActionInvoked) {
                return;
            } else {
                $scope.scheduledActionInvoked = true;
            }

            $scope.hideSlotsWasClicked = true;

            // check if mst
            if (!$scope.service.isImmidietlyFollow && intervalItem.MSTOptions && Object.keys(intervalItem.MSTOptions).length > 0) {

                for (var relatedKey in intervalItem.MSTOptions) {
                    scheduleRelatedSlot(intervalItem.MSTOptions[relatedKey], relatedKey, policyId);
                }
            }

            var service = $scope.service,
                tz_start = new Date(startDate).getTimezoneOffset() * 60 * 1000;

            startDate += tz_start;

            // we need this to the monthly view capacity calculation
            service.resourceBeforeDrag = service.resourceId;
            service.eventBeforeDrag = angular.copy(service);

            // flag get candidate flow, will be sent to server
            service.fromGetCandidateFlow = true;

            var ganttResrouceId = TimePhasedDataService.getResoruceGanttIdByDate(resourceKey, startDate);
            updateService(service, startDate, ganttResrouceId || resourceKey, policyId);

            if (scheduler._events[service.id]) {
                scheduler.updateEvent(service.id);

                scheduler.callEvent("onEventChanged", [service.id, scheduler.getEvent(service.id)]);

                setTimeout(function () {
                    scheduler.callEvent("onDragEnd");
                }, 1200);

                // close slots panel
                closePanel();
            } else {

                servicesService.saveChangesToServiceAppointment(service, service).then(function (parsedUpdatedObjects) {

                    // parsedUpdatedObjects.absences.forEach(absence => {
                    //     absence.isScheduled() && absence.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                    // });
                    //
                    // parsedUpdatedObjects.services.forEach(service => {
                    //     service.isScheduled() && service.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                    // });
                    //
                    // servicesService.drawServicesAndAbsences(parsedUpdatedObjects.services || [], parsedUpdatedObjects.absences || []);

                    // update kpis, muse be after the events are added to the gantt
                    kpiCalculationsService.calculateKpis();

                    $rootScope.$broadcast('JumpToDate', new Date(parseInt(startDate)));
                }).catch(function (err) {
                    console.warn('Couldn\'t update service. ' + err[0] + ' ' + err[2]);
                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err[2]);
                    //scheduler.parse([err[1]], 'json');
                }).finally(function () {
                    // jump to date
                    $rootScope.$broadcast('JumpToDate', new Date(parseInt(startDate)));

                    closePanel();
                });
            }

            // close slots panel
            closePanel();
        }

        function updateService(service, startDate, resourceKey, policyUsed) {

            var duration = utils.getServiceDuration(service);

            // set dates
            service.start = new Date(startDate);
            service.finish = new Date(startDate + duration);
            service.start_date = new Date(startDate);
            service.end_date = new Date(startDate + duration);

            service.travelTo = 0;
            service.travelFrom = 0;

            if (resourceKey) {
                service.resourceId = resourceKey;
            }

            service.policyUsed = policyUsed;
            service.scheduleMode = 'AutomaticGetSlots';

            service.savedFromScheduleHereAndConsecutive = !service.isInO2Territory && service.isImmidietlyFollow && service.relatedService2;
        }

        // used in "right click" on slot and "schedule "here"
        window.scheduleSlot = function (ev, serviceId, startDate, resourceKey, policyId, mstOptions) {

            ev.preventDefault();

            $('#ScheduleOnSlot').remove();

            $('<div id="ScheduleOnSlot">' + customLabels.ScheduleHere + '</div>').css('left', ev.clientX - 30 + 'px').css('top', ev.clientY + 5 + 'px').on('click', function () {

                var service = $scope.service;

                if (!service) {
                    return;
                }

                $scope.hideSlotsWasClicked = true;

                // flag get candidate flow, will be sent to server
                service.fromGetCandidateFlow = true;

                if (mstOptions && !service.isImmidietlyFollow) {
                    handleMstOptions(mstOptions, policyId);
                }

                // we need this to the monthly view capacity calculation
                service.resourceBeforeDrag = service.resourceId;
                service.eventBeforeDrag = angular.copy(service);

                if (service.start && (service.start.getTime() !== parseInt(startDate) || service.resourceId !== resourceKey)) {
                    updateService(service, parseInt(startDate), resourceKey || resourceKey, policyId);
                } else if (!service.start) {
                    updateService(service, parseInt(startDate), resourceKey || resourceKey, policyId);
                }

                $('#ScheduleOnSlot').remove();

                if (scheduler._events[service.id]) {

                    scheduler.updateEvent(service.id);

                    scheduler.callEvent("onEventChanged", [service.id, scheduler.getEvent(service.id)]);

                    setTimeout(function () {
                        scheduler.callEvent("onDragEnd");
                    }, 1200);

                    // close slots panel
                    closePanel();
                } else {

                    servicesService.saveChangesToServiceAppointment(service, service).then(function (parsedUpdatedObjects) {

                        // parsedUpdatedObjects.absences.forEach(absence => {
                        //     absence.isScheduled() && absence.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                        // });
                        //
                        // parsedUpdatedObjects.services.forEach(service => {
                        //     service.isScheduled() && service.setGanttResource(TimePhasedDataService.resourcesAndTerritories(), utils.generateResourceId);
                        // });
                        //
                        // servicesService.drawServicesAndAbsences(parsedUpdatedObjects.services || [], parsedUpdatedObjects.absences || []);


                        // update kpis, muse be after the events are added to the gantt
                        kpiCalculationsService.calculateKpis();

                        $rootScope.$broadcast('JumpToDate', new Date(parseInt(startDate)));
                    }).catch(function (err) {
                        console.warn('Couldn\'t update service. ' + err[0] + ' ' + err[2]);
                        utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err[2]);
                        //scheduler.parse([err[1]], 'json');
                    }).finally(function () {
                        $rootScope.$broadcast('JumpToDate', new Date(parseInt(startDate)));
                        closePanel();
                    });
                }
            }).appendTo('body');
        };

        $('body').on('click', function () {
            $('#ScheduleOnSlot').remove();
        });

        function handleMstOptions(key, policyId) {

            for (var relatedKey in mstOptions[key]) {
                scheduleRelatedSlot(mstOptions[key][relatedKey], relatedKey, policyId);
            }
        }

        // generate a date-key from date
        function generateDateKey(date) {
            return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
        }

        // get ids of candidates, used for filtering on the gantt
        function getCandidatesIds() {
            return candidatesIds;
        }

        // This will be our factory
        return {
            get: get,
            close: closePanel,
            getCandidatesIds: getCandidatesIds
        };
    }
})();