'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    utils.$inject = ['$q', '$sce', 'sfdcService', '$rootScope', '$timeout', 'userSettingsManager', 'StateService', 'kpiCalculationsService', 'ResourcesAndTerritoriesService', '$injector', 'SERVICE_CATEGORY'];

    angular.module('serviceExpert').factory('utils', utils);

    function utils($q, $sce, sfdcService, $rootScope, $timeout, userSettingsManager, StateService, kpiCalculationsService, ResourcesAndTerritoriesService, $injector, SERVICE_CATEGORY) {

        var _checkBoxFields = void 0,
            woPriorities = [],
            reports = [],
            polygons = [],
            _butlerNotifications = [],
            ganttSettings = {},
            statusFlow = {},
            statusTranslations = {},
            statuses = {},
            statusesWithCategories = {},
            fieldsTypes = {
            DateTime: 'DATETIME',
            Date: 'DATE',
            String: 'STRING',
            TextArea: 'TEXTAREA',
            Picklist: 'PICKLIST',
            Reference: 'REFERENCE',
            Currency: 'CURRENCY',
            Phone: 'PHONE',
            Double: 'DOUBLE'
        },
            showServiceList = {
            show: true
        },
            durationTypes = {
            minutes: 'Minutes',
            hours: 'Hours',
            days: 'Days'
        },


        // Hardcoded status categories names, mapped to ther CSS class
        STATUS_CATEGORIES_TO_CSS_CLASSES = {
            'None': 'serviceList_new',
            'Scheduled': 'serviceList_assigned',
            'Dispatched': 'serviceList_dispatched',
            'In Progress': 'serviceList_travel',
            'Cannot Complete': 'serviceList_couldnt_complete',
            'Completed': 'serviceList_completed',
            'Canceled': 'serviceList_cancelled'
        },
            customActions = [],
            customActionsPromise = $q.defer(),
            crewsFilter = false,
            cssClassesForStatuses = {};

        var domParser = new DOMParser();
        String.prototype.decodeHTML = function () {
            var input = this;
            var doc = domParser.parseFromString(input, "text/html");
            return doc.documentElement.textContent !== '' ? doc.documentElement.textContent : input;
        };

        String.prototype.encodeHTML = function () {
            var input = this;
            input = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            return input;
        };

        function generateIconUrl(_ref) {
            var _ref2 = _slicedToArray(_ref, 2),
                sprite = _ref2[0],
                icon = _ref2[1];

            return window.lsdIcons.globalIcon + '/' + sprite + '-sprite/svg/symbols.svg#' + icon;
        }

        function customAction(a) {
            this.name = a[fieldNames.CustomGanttAction.Label];
            this.className = a[fieldNames.CustomGanttAction.Class];
            this.order = a[fieldNames.CustomGanttAction.Order];
            this.permission = a[fieldNames.CustomGanttAction.Permission];
            this.section = a[fieldNames.CustomGanttAction.Section];
            this.visualforce = a[fieldNames.CustomGanttAction.Visualforce];

            if (a[fieldNames.CustomGanttAction.Icon]) {
                var icon = a[fieldNames.CustomGanttAction.Icon].encodeHTML();
                this.icon = generateIconUrl(icon.split(','));
            }
        }

        sfdcService.callRemoteAction(RemoteActions.getCustomActions).then(function (actions) {

            actions.forEach(function (a) {

                var requiredPermission = a[fieldNames.CustomGanttAction.Permission];

                if (window.customPermissions[requiredPermission]) {
                    customActions.push(new customAction(a));
                }
            });

            customActionsPromise.resolve(customActions);
        });

        // generate resource ids
        function generateResourceId(resourceIds, territoryIds) {

            // resources is array and territories string -> all resources will have the territory ID attached to them
            // EX: res001_ter1,res002_ter1,res003_ter1,
            if (Array.isArray(resourceIds) && !Array.isArray(territoryIds)) {
                return resourceIds.map(function (value) {
                    return value + '_' + territoryIds;
                }).join(',');
            }

            // resources is array and territories is array -> attaching res[i] with ter[i]
            // EX: res001_ter1,res002_ter2,res003_ter3,
            if (Array.isArray(resourceIds) && Array.isArray(territoryIds)) {
                return resourceIds.map(function (value, index) {
                    return value + '_' + territoryIds[index];
                }).join(',');
            }

            // resources and territories string | EX: res001_ter1
            if (!Array.isArray(resourceIds) && !Array.isArray(territoryIds)) {
                return resourceIds + '_' + territoryIds;
            }

            // resource and territories array
            if (!Array.isArray(resourceIds) && Array.isArray(territoryIds)) {
                return territoryIds.map(function (value) {
                    return resourceIds + '_' + value;
                }).join(',');
            }
        }

        sfdcService.callRemoteAction(RemoteActions.getAllFormulaFields).then(function (result) {
            _checkBoxFields = result;
        });

        // get WO priority picklist
        sfdcService.callRemoteAction(RemoteActions.getWorkOrderPriority).then(function (woPrioritiesSf) {
            woPriorities.push.apply(woPriorities, _toConsumableArray(woPrioritiesSf));
        });

        //load reports with geolocation columns
        function getReports() {

            var deferred = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.getReportsWithGeolocationCols).then(function (reportsSf) {

                if (!reportsSf) {
                    deferred.resolve(null);
                    return;
                }

                for (var i = 0; i < reportsSf.length; i++) {
                    reports.push(reportsSf[i]);
                }

                deferred.resolve(reports);
            }).catch(function (ex) {
                return deferred.reject(ex);
            });

            return deferred.promise;
        }

        function getPolygons() {

            var deferred = $q.defer();

            if (!hasCustomPermission('Polygons_view')) {
                deferred.resolve(null);
                return;
            }

            sfdcService.getPolygons().then(function (polygonsResult) {

                if (!polygonsResult) {
                    deferred.resolve(null);
                    return;
                }

                for (var i = 0; i < polygonsResult.length; i++) {
                    polygons.push(polygonsResult[i]);
                }

                deferred.resolve(polygons);
            });

            return deferred.promise;
        }

        function showOnGantt(id) {

            // monthly view - not supported
            if (scheduler._mode === 'MonthlyView') {
                alert(customLabels.serviceCantDisplayMonthlyMsg);
                return;
            }

            var ev = scheduler._events[id],
                currentBusinessHours = getMinAndMaxHoursToDisplay(),
                eventStartTime = ev.start_date.getHours(),
                eventEndTime = ev.end_date.getHours();

            // check if event is NOT in current view
            if (scheduler._min_date > ev.start || ev.start > scheduler._max_date) {
                scheduler.setCurrentView(new Date(ev.start));
            }

            // checking if business hour filter is filtering our service
            if (ev.end_date.getHours() === 0 && ev.end_date.getDate() > ev.start_date.getDate()) {
                eventEndTime = 24;
            }

            if (scheduler._mode !== 'ZoomLevel2' && (currentBusinessHours.min > eventEndTime || currentBusinessHours.max <= eventStartTime)) {
                alert(customLabels.serviceCantDisplayMsg);
                return;
            }

            var resourceFiltered = true,
                resources = scheduler.serverList('resources');

            for (var i = 0; i < resources.length; i++) {
                for (var j = 0; j < resources[i].children.length; j++) {
                    if (ev.resourceId.indexOf(resources[i].children[j].key) > -1) {
                        resourceFiltered = false;
                        break;
                    }
                }
            }

            if (resourceFiltered) {
                alert(customLabels.resource_filtered_out);
                return;
            }

            // if service is assigned to contractor, show effect on capacity event.
            if (StateService.areContractorsSupported()) {

                var capacityDurationFiltered = true;

                if (ev.resourceContractor) {

                    var collidingEvents = scheduler.getEvents(ev.start, ev.finish);

                    for (var _i = 0; _i < collidingEvents.length; _i++) {

                        if (collidingEvents[_i].resourceId === ev.resourceId && collidingEvents[_i].type === 'contractorcapacity' && collidingEvents[_i].timePeriod === userSettingsManager.GetUserSettingsProperty('View_Capacity_Type__c')) {

                            ev = collidingEvents[_i];
                            id = collidingEvents[_i].id;
                            capacityDurationFiltered = false;
                            break;
                        }
                    }

                    if (capacityDurationFiltered) {
                        alert(customLabels.is_assigned_to_contractor.replaceAll(ev.name, ev.resourceName) + '.\n' + customLabels.This_capacity_duration_is_filtered_out + '.\n' + customLabels.To_change_the_capacity_duration);
                        return;
                    }
                }
            }

            try {
                scheduler._els.dhx_cal_data[0].scrollTop = 0;
                ev.showEventPopupEffect = true;
                scheduler.showEvent(id);
            } catch (ex) {
                scheduler.callEvent("onAfterEventDisplay", [ev, scheduler._mode]);
            }
        }

        function addDaysToDate(date, days) {
            var msToAdd = 1000 * 60 * 60 * 24 * days;
            return new Date(date.getTime() + msToAdd);
        }

        function setDatesByStartAndMode(start) {

            var end = new Date(start);
            switch (scheduler._mode) {
                case 'ZoomLevel2':
                    end = addDaysToDate(end, 1);
                    break;

                case 'ZoomLevel3':
                    end = addDaysToDate(end, 1);
                    break;

                case 'ZoomLevel4':
                    end = addDaysToDate(end, 2);
                    break;

                case 'ZoomLevel5':
                    end = addDaysToDate(end, 3);
                    break;

                case 'ZoomLevel6':
                    end = addDaysToDate(end, 7);
                    break;

                case 'ZoomLevel7':
                    end = addDaysToDate(end, 14);
                    break;

                case 'MonthlyView':
                    end = addDaysToDate(end, 30);
                    break;

                case 'MTDView':
                    end = addDaysToDate(end, 35);
                    break;

                case 'LongView':
                    end = addDaysToDate(end, scheduler.matrix.LongView.x_size);
                    break;
            }

            return {
                start: new Date(start),
                end: end };
        }

        function addNotification(title, text, func, p) {
            var hideAfter = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;


            if (typeof p === 'undefined') {
                p = null;
            }

            var now = new Date();

            _butlerNotifications.push({
                title: title,
                text: text,
                action: function action() {
                    func(p);
                    this.show = !hideAfter;
                },
                when: new Date(now.getTime().valueOf() + now.getTimezoneOffset() * 60 * 1000),
                unread: true,
                param: p,
                show: true
            });
        }

        // get relevant CSS class for service (by status)
        function getCssClassForContextBasedOnStatus(status) {
            return cssClassesForStatuses[status];
        }

        // get relevant CSS class for service (by status), used on the service list
        function getCSSClassByStatusCategory(statusCategory, statusOrCategoryConst) {

            switch (statusCategory) {
                case statusOrCategoryConst.NONE:
                    return 'serviceList_new';

                case statusOrCategoryConst.SCHEDULED:
                    return 'serviceList_assigned';

                case statusOrCategoryConst.DISPATCHED:
                    return 'serviceList_dispatched';

                case statusOrCategoryConst.IN_PROGRESS:
                    return 'serviceList_travel';

                case statusOrCategoryConst.COMPLETED:
                    return 'serviceList_completed';

                case statusOrCategoryConst.COULD_NOT_COMPLETE:
                    return 'serviceList_couldnt_complete';

                case statusOrCategoryConst.CANCELED:
                    return 'serviceList_cancelled';

                default:
                    return 'serviceList_other';
            }
        }

        // set gantt settings from user Settings Manager
        (function setGanttSettingsAndStuff() {

            ganttSettings.startHour = userSettingsManager.GetUserSettingsProperty('Gantt_View_Start_Hour__c');
            if (ganttSettings.startHour === null) ganttSettings.startHour = 0;

            ganttSettings.finishHour = userSettingsManager.GetUserSettingsProperty('Gantt_View_Finish_Hour__c');
            if (ganttSettings.finishHour === null) ganttSettings.finishHour = 24;

            ganttSettings.filterCandidates = userSettingsManager.GetUserSettingsProperty('Filter_Candidates__c');
            if (ganttSettings.filterCandidates === null) ganttSettings.filterCandidates = true;

            ganttSettings.servicesPerPage = userSettingsManager.GetUserSettingsProperty('Services_Per_Page__c');
            if (ganttSettings.servicesPerPage === null) ganttSettings.servicesPerPage = "75";
            ganttSettings.resourceRowHeight = userSettingsManager.GetUserSettingsProperty('Resource_Row_Height__c');
            if (ganttSettings.resourceRowHeight === null) ganttSettings.resourceRowHeight = "medium";

            ganttSettings.capacityDuration = userSettingsManager.GetUserSettingsProperty('View_Capacity_Type__c');
            if (ganttSettings.capacityDuration === null) ganttSettings.capacityDuration = "Day";

            ganttSettings.backHorizon = userSettingsManager.GetUserSettingsProperty('Scheduling_horizon_limit__c');
            if (ganttSettings.backHorizon === null) ganttSettings.backHorizon = 14;

            ganttSettings.loadOnToday = userSettingsManager.GetUserSettingsProperty('Load_On_Today__c');
            if (ganttSettings.loadOnToday === null) ganttSettings.loadOnToday = true;

            ganttSettings.absenceOverlapHeight = userSettingsManager.GetUserSettingsProperty('Absence_Overlap_Height__c');
            if (!ganttSettings.absenceOverlapHeight) ganttSettings.absenceOverlapHeight = "partial";

            ganttSettings.leftPanel = userSettingsManager.GetUserSettingsProperty('DefaultLeftPanel__c') || 'salist';

            ganttSettings.serviceColoring = userSettingsManager.GetUserSettingsProperty('ServiceListColoring__c') || 'default';
        })();

        // get custom CSS file and load it
        sfdcService.callRemoteAction(RemoteActions.getCustomizationFiles).then(function (files) {

            var siteUrl = '';

            if (__gantt.communityNetworkId && window.location.href.includes('apex')) {
                var urlToAppend = window.location.href.split('apex');
                siteUrl = urlToAppend[0];
            }

            if (files && files.CSS) {

                var css = jQuery("<link>");

                css.attr({
                    rel: "stylesheet",
                    type: "text/css",
                    href: siteUrl + files.CSS
                });

                $("head").append(css);
            }

            if (files && files.JSPWR) {

                var scriptElement = document.createElement('script');
                scriptElement.src = files.JSPWR;
                scriptElement.type = "text/javascript";
                document.head.appendChild(scriptElement);
            } else if (files && files.JS) {
                $.ajax({
                    url: siteUrl + files.JS,
                    dataType: "script"
                });
            }
        });

        function sortByTime(o1, o2) {
            if (o1.start > o2.start) return 1;else if (o1.start.getTime() == o2.start.getTime()) return 0;
            return -1;
        }

        function intersectDates(interval1, interval2) {

            var result = {};
            var remainderFrom1 = [];

            if (interval1.start >= interval2.start && interval1.start < interval2.finish) {
                result.start = interval1.start;

                if (interval1.finish < interval2.finish) {
                    result.finish = interval1.finish;
                } else {
                    result.finish = interval2.finish;
                    remainderFrom1.push({
                        start: interval2.finish,
                        finish: interval1.finish,
                        isStart: false
                    });
                }
            } else if (interval1.finish > interval2.start && interval1.finish <= interval2.finish) {
                if (interval1.start > interval2.start) {
                    result.start = interval1.start;
                } else {
                    result.start = interval2.start;
                    remainderFrom1.push({
                        start: interval1.start,
                        finish: interval2.start,
                        isStart: true
                    });
                }

                result.finish = interval1.finish;
            } else if (interval1.start < interval2.start && interval1.finish > interval2.finish) {
                result = angular.copy(interval2);

                remainderFrom1.push({
                    start: interval1.start,
                    finish: interval2.start,
                    isStart: true
                });

                remainderFrom1.push({
                    start: interval2.finish,
                    finish: interval1.finish,
                    isStart: false
                });
            } else {
                result = null;
            }

            var filteredRemainders = [];

            for (var i = 0; i < remainderFrom1.length; i++) {
                var remainder = remainderFrom1[i];
                if (remainder.start.getTime() != remainder.finish.getTime()) filteredRemainders.push(remainder);
            }

            return {
                intersection: result,
                remainderFrom1: filteredRemainders
            };
        }

        function isEmpty(o) {
            return !Object.keys(o).length;
        }

        function getServiceInfoRowClass(field) {
            if (!field) return;

            var obj = {};

            if (field.Type == fieldsTypes.Reference) obj.resourceOnServiceTT = true;

            return obj;
        }

        function openLink(service, field) {
            if (field.Type != fieldsTypes.Reference) return;

            var fieldName = field.JsAPIName.replace('__r', '__c');
            openSObjectLink(service[fieldName]);
        }

        function openSObjectLink(objectId) {
            var isConsole = openConsoleTab(null, objectId);

            if (!isConsole) window.open('../' + objectId, '_blank');
        }

        // make string trustable as HTML
        function trust(str) {
            if (typeof str == 'string') return $sce.trustAsHtml(str);

            return null;
        }

        // open url in console (if not in console, do nothing)
        function openConsoleTab(e, id) {

            if (StateService.isInConsole()) {

                if (e) e.preventDefault();

                sforce.console.generateConsoleUrl(['/' + id], function (result) {
                    if (result.success) sforce.console.openConsoleUrl(null, result.consoleUrl, true);else openLightningPrimaryTab(id);
                });

                return true;
            }

            return false;
        }

        function openLightningSubtab(id) {
            sforce.console.getEnclosingPrimaryTabId(function (result) {

                //Now that we have the primary tab ID, we can open a new subtab in it
                var primaryTabId = result.id;
                sforce.console.openSubtab(primaryTabId, '/' + id, true);
            });
        };

        function openLightningPrimaryTab(id) {
            sforce.console.openPrimaryTab(null, '/' + id, true);
        }

        window.openConsoleTabFromModal = function (url) {
            if (StateService.isInConsole()) {
                sforce.console.generateConsoleUrl([url], function (result) {
                    if (result.success) sforce.console.openConsoleUrl(null, result.consoleUrl, true);else openLightningPrimaryTab(url);
                });
            }
        };

        String.prototype.replaceAll = function () {

            var target = this;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            for (var i = 0; i < args.length; i++) {
                target = target.replace('$' + i, args[i]);
            }

            return target;
        };

        function escapeResourceName(name) {

            var newName = name.encodeHTML();

            newName = newName.split("'").join("&lsquo;");
            newName = newName.split('"').join("&ldquo;");

            return newName;
        }

        function formatDayToString(date) {
            return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
        }

        function formatDateWithDayOfWeek(date) {
            var options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
            var newDate = new Date(date);
            newDate.setHours(12);
            try {
                return newDate.toLocaleDateString(userLocale.replace('_', '-'), options);
            } catch (e) {
                return null;
            }
        }

        function convertDateBetweenTimeZones(dt, sourceTz, destTz) {
            var momentDt = convertDtToMomentDt(dt, sourceTz);

            return convertMomentDtToDt(momentDt.tz(destTz));
        }

        function getUserOffset(dt) {
            return -moment.tz.zone(userTimeZone).utcOffset(convertDtToMomentDt(dt, userTimeZone).valueOf());
        }

        function getLocationOffset(dt, locationId) {

            if (!locationId) {
                return null;
            }

            var location = ResourcesAndTerritoriesService.territories()[locationId],
                tz = ResourcesAndTerritoriesService.getOperatingHours()[location.operatingHours].timezone;

            return -moment.tz.zone(tz).utcOffset(convertDtToMomentDt(dt, tz).valueOf());
        }

        function convertDtToMomentDt(dt, tz) {
            return moment.tz({
                year: dt.getFullYear(),
                month: dt.getMonth(),
                date: dt.getDate(),
                hours: dt.getHours(),
                minutes: dt.getMinutes()

            }, tz);
        }

        function convertMomentDtToDt(dt) {
            return new Date(dt.year(), dt.month(), dt.date(), dt.hours(), dt.minutes());
        }

        function getIdsOfSObjects(arr) {

            var ids = [];

            for (var i = 0; i < arr.length; i++) {
                ids.push(arr[i].id);
            }

            return ids;
        }

        function getIdsOfSObjectsAbsence(arr) {

            var ids = [];

            for (var i = 0; i < arr.length; i++) {
                ids.push(arr[i]);
            }

            return ids;
        }

        function safeApply(scope, fn) {

            var phase = scope.$root.$$phase;

            if (phase === '$apply' || phase === '$digest') {
                if (fn && typeof fn === 'function') {
                    fn();
                }
            } else {
                scope.$apply(fn);
            }
        }

        function getServiceDuration(service) {

            var duration = 0;

            // we need this to the monthly view capacity calculation
            service.resourceBeforeDrag = service.resourceId;
            service.eventBeforeDrag = angular.copy(service);

            // if scheduled
            if (service.isScheduled()) {
                duration = service.finish.getTime() - service.start.getTime();
            } else {

                switch (service.durationType) {

                    case durationTypes.minutes:
                        duration = service.estDuration * 60 * 1000;
                        break;

                    case durationTypes.hours:
                        duration = service.estDuration * 60 * 60 * 1000;
                        break;

                    case durationTypes.days:
                        duration = service.estDuration * 24 * 60 * 60 * 1000;
                        break;

                    default:
                        duration = 60 * 1000;
                        break;
                }
            }

            return duration;
        }

        function getServiceDurationInTheory(service) {

            switch (service.durationType) {

                case durationTypes.minutes:
                    return service.estDuration * 60 * 1000;

                case durationTypes.hours:
                    return service.estDuration * 60 * 60 * 1000;

                case durationTypes.days:
                    return service.estDuration * 24 * 60 * 60 * 1000;

                default:
                    return 60 * 1000;
            }
        }

        function getMinMaxDatesRelatedServices(ids) {
            var minStartDate = Number.MAX_VALUE;
            var maxEndDate = Number.MIN_VALUE;
            var numberOfDays = 7;
            var daysOffset = numberOfDays * 24 * 60 * 60 * 1000;

            ids.forEach(function (id) {
                var event = scheduler._events[id];
                if (event) {
                    var startDate = event.start_date;
                    var endDate = event.end_date;

                    if (startDate < minStartDate) {
                        minStartDate = startDate;
                    }

                    if (endDate > maxEndDate) {
                        maxEndDate = endDate;
                    }
                }
            });

            maxEndDate = new Date(Date.parse(maxEndDate) + daysOffset);

            minStartDate = new Date(Date.parse(minStartDate) - daysOffset);

            return { minStartDate: minStartDate, maxEndDate: maxEndDate };
        }

        // get all services related to (used for rule violations! not related services - MST)
        function getRelatedServices(m_ids, resourceIds) {

            var ids = Array.isArray(m_ids) ? m_ids.concat() : [m_ids];

            var dates = getMinMaxDatesRelatedServices(ids);

            resourceIds += ids.reduce(function (prev, currentId) {

                if (scheduler._events[currentId]) {
                    return prev + ',' + scheduler._events[currentId].resource;
                }

                return prev;
            }, '');

            for (var key in scheduler._events) {
                var schedulerEvent = scheduler._events[key];

                if (schedulerEvent.type === 'service' && resourceIds.indexOf(schedulerEvent.resource) != -1 || schedulerEvent.relatedService1 && m_ids.indexOf(schedulerEvent.relatedService1) != -1 || schedulerEvent.relatedService2 && m_ids.indexOf(schedulerEvent.relatedService2) != -1) {

                    var eventStartDate = schedulerEvent.start_date;
                    var eventEndDate = schedulerEvent.end_date;

                    if (isIntersect(eventStartDate, eventEndDate, dates.minStartDate, dates.maxEndDate)) {
                        ids.push(schedulerEvent.id);

                        // add related service if available
                        schedulerEvent.relatedTo && ids.push(schedulerEvent.relatedTo);
                        schedulerEvent.relatedFather && ids.push(schedulerEvent.relatedFather);

                        // add closest brother in chain
                        schedulerEvent.relatedService2 && ids.push(schedulerEvent.relatedService2);
                        schedulerEvent.relatedService1 && ids.push(schedulerEvent.relatedService1);
                    }
                }
            }

            return ids;
        }

        //ori - not really needed. leaving it here because i like the recursion.
        /*        function getRelatedChainArray(ids, rootService, dependencyField) {
                    if (rootService && rootService[dependencyField] && !ids[rootService[dependencyField]]) {
                        ids[rootService[dependencyField]] = true;
                        return getRelatedChainArray(ids, scheduler._events[rootService[dependencyField]], dependencyField);
                    }
        
                    return Object.keys(ids);
                }*/

        // get services of locations between dates
        function getServicesOfLocations(ids, start, finish) {

            var servicesIds = [];

            ids = Array.isArray(ids) ? ids : [ids];

            // get all relevant resourceIds
            var locationsIds = ids.join(',');

            for (var key in scheduler._events) {
                var schedulerEvent = scheduler._events[key];

                if (schedulerEvent.type === 'service' && locationsIds.indexOf(schedulerEvent.serviceTerritory) && isIntersect(schedulerEvent.start_date, schedulerEvent.end_date, start, finish)) {
                    servicesIds.push(schedulerEvent.id);

                    // add related service if available
                    schedulerEvent.relatedTo && servicesIds.push(schedulerEvent.relatedTo);
                    schedulerEvent.relatedFather && servicesIds.push(schedulerEvent.relatedFather);

                    // add closest brother in chain
                    schedulerEvent.relatedService2 && servicesIds.push(schedulerEvent.relatedService2);
                    schedulerEvent.relatedService1 && servicesIds.push(schedulerEvent.relatedService1);
                }
            }

            return servicesIds;
        }

        // get services between dates
        function getServicesBetweenDates(start, finish) {

            var servicesIds = [];

            for (var key in scheduler._events) {
                var schedulerEvent = scheduler._events[key];

                if (schedulerEvent.type === 'service' && isIntersect(schedulerEvent.start_date, schedulerEvent.end_date, start, finish)) {
                    servicesIds.push(schedulerEvent.id);

                    // add related service if available
                    schedulerEvent.relatedTo && servicesIds.push(schedulerEvent.relatedTo);
                    schedulerEvent.relatedFather && servicesIds.push(schedulerEvent.relatedFather);

                    // add closest brother in chain
                    schedulerEvent.relatedService2 && servicesIds.push(schedulerEvent.relatedService2);
                    schedulerEvent.relatedService1 && servicesIds.push(schedulerEvent.relatedService1);
                }
            }

            return servicesIds;
        }

        function setMapCloseButtonPosition() {
            $timeout(function () {
                // Reference to the DIV which receives the contents of the infowindow using jQuery
                var infoWindowOuter = $('.gm-style-iw');
                var closeBtn = $($('.gm-ui-hover-effect')[0]);

                closeBtn.css({
                    right: '0px', // make it always on the right even when maps are rtl
                    top: '0px',
                    opacity: 1
                });

                // catch the close btn with jQuery
                var infoWindowClose = infoWindowOuter.next();
                infoWindowClose.css({
                    right: '12px', // make it always on the right even when maps are rtl
                    left: '',
                    opacity: 1
                });
            }, 0);
        }

        // get status flow
        sfdcService.callRemoteAction(RemoteActions.getStatusFlow).then(function (flow) {

            if (flow) {
                angular.merge(statusFlow, flow);

                for (var key in statusFlow) {
                    statusFlow[key] = statusFlow[key].sort();
                }
            }
        }).catch(function (err) {
            console.warn('could not get status flow :(');
            console.log(err);
        });

        // get status translations
        sfdcService.callRemoteAction(RemoteActions.getStatusTranslations).then(function (sfSstatusTranslations) {
            angular.merge(statusTranslations, sfSstatusTranslations);
            window.statusTranslations = statusTranslations;
        }).catch(function (err) {
            console.warn('could not get status translations :(');
            console.log(err);
        });

        // get status with categories
        sfdcService.callRemoteAction(RemoteActions.getStatusesWithCategories).then(function (statusMap) {

            angular.merge(statusesWithCategories, statusMap);

            // set for each status its CSS class based on its category
            for (var status in statusesWithCategories) {
                var statusCategory = statusesWithCategories[status];
                cssClassesForStatuses[status] = STATUS_CATEGORIES_TO_CSS_CLASSES[statusCategory] || 'serviceList_other';
            }
        }).catch(function (err) {
            console.warn('could not get status with categories :(');
            console.log(err);
        });

        // get status
        sfdcService.callRemoteAction(RemoteActions.getStatuses).then(function (sFstatuses) {
            angular.merge(statuses, sFstatuses);
        }).catch(function (err) {
            console.warn('could not get status :(');
            console.log(err);
        });

        // get svg icon url
        function getSVGIconHTML(iconName) {
            var additionalClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            return '<svg aria-hidden="true" class="slds-icon contextMenuIcon ' + additionalClass + '"><use xlink:href="' + iconName + '"></use></svg>';
        }

        // get svg icon url
        function getSVGIconHTMLCustom(iconName) {
            return '<svg aria-hidden="true" class="slds-icon contextMenuIcon"><use width="17px" height="17px" xlink:href="' + iconName + '"></use></svg>';
        }

        function getFilteredLocations() {
            var locations = userSettingsManager.GetUserSettingsProperty('locations');

            if (locations) return locations;

            return [];
        }

        function hoursMinutes(timeInMinutes, labelWithBoth, labelOnlyHours, labelOnlyMinutes) {

            if (timeInMinutes < 60) {
                return labelOnlyMinutes.replaceAll([timeInMinutes]);
            }

            //label should have $1 for minutes and $0 for hours
            var mins = timeInMinutes % 60,
                hours = Math.round(timeInMinutes / 60);

            if (mins === 0) {
                return labelOnlyHours.replaceAll([hours]);
            }

            return labelWithBoth.replace('$0', hours).replace('$1', mins);
        }

        function hasCustomPermission(name) {
            return customPermissions[name];
        }

        function isLightning() {
            return typeof sforce != 'undefined' && sforce && !!sforce.one;
        }

        function removeFSLNamespace(value) {
            if (value.indexOf('FSL__') === 0) {
                return value.substr(5, value.length);
            } else {
                return value;
            }
        }

        function generateDateKey(date) {
            return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
        }

        function isUseEdge(optimizationType) {
            return __gantt[optimizationType].useEdge;
        }

        function getColorHexByCategory(statusCategory) {

            switch (statusCategory) {

                case SERVICE_CATEGORY.NONE:
                    return '#a5e2d6';

                case SERVICE_CATEGORY.SCHEDULED:
                    return '#F9D058';

                case SERVICE_CATEGORY.DISPATCHED:
                    return '#8DD8FA';

                case SERVICE_CATEGORY.IN_PROGRESS:
                    return '#D68EF9';

                case SERVICE_CATEGORY.COMPLETED:
                    return '#95d155';

                case SERVICE_CATEGORY.COULD_NOT_COMPLETE:
                    return '#f58556';

                case SERVICE_CATEGORY.CANCELED:
                    return '#BEBCBA';

                default:
                    return '#B7C9EA';

            }
        }

        function getRelevantDataForDraggingService(service) {

            var info = {};

            // set draggble service ghost text
            info.label = service.ganttLabel ? service.ganttLabel : service.name;
            info.estimatedDurationText = service.estDuration + ' ' + service.durationType;

            // viewable hours on the gantt, after filtering them
            var availableHours = getMinAndMaxHoursToDisplay();

            // calculate size of event
            var startTime = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60),
                endDate = new Date(scheduler._min_date.getTime() + availableHours.min * 1000 * 60 * 60);

            if (service.durationType) {
                if (service.durationType === durationTypes.minutes) endDate.setMinutes(endDate.getMinutes() + service.estDuration);else if (service.durationType === durationTypes.hours) endDate.setMinutes(endDate.getMinutes() + Math.floor(service.estDuration * 60));else if (service.durationType === durationTypes.days) endDate.setMinutes(endDate.getMinutes() + Math.floor(service.estDuration * 60 * 24));
            } else {
                endDate.setMinutes(endDate.getMinutes() + 60);
            }

            var startPoint = getXPositionOfEvent({ start_date: startTime, end_date: endDate }, false, scheduler.matrix[scheduler._mode]),
                endPoint = getXPositionOfEvent({ start_date: startTime, end_date: endDate }, true, scheduler.matrix[scheduler._mode]);

            info.meetingLengthInPx = endPoint - startPoint + 4;

            return info;
        }

        function getSchedulingPolicyObject(policyId) {
            for (var i = 0; i < StateService.policies.length; i++) {
                if (StateService.policies[i].Id === policyId) {
                    return StateService.policies[i];
                }
            }
        }

        function isUrlImg(url) {
            return validURL(url) && url.match(/\.(jpeg|jpg|gif|png|svg)$/) !== null;
        }

        function isFormulaForImage(element) {
            if (element && element.startsWith('<img')) {

                var url = element.split(' ')[1];

                if (url.includes('src=')) {
                    return url.substr(5, url.length - 6);
                } else {
                    return null;
                }
            }

            return null;
        }

        function validURL(str) {
            var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
            return !!pattern.test(str);
        }

        function shouldFilterServiceFromList(service, loadedTerritories, showOrphan) {

            // don't show unscheduled services that are not related to the territory
            if (!service.isScheduled()) {

                // not showing orphans and no territory defined, continue
                if (!showOrphan && !service.ServiceTerritoryId) {
                    return true;
                }

                // territory defined on service but not loaded to gantt
                if (service.ServiceTerritoryId && !loadedTerritories.includes(service.ServiceTerritoryId)) {
                    return true;
                }
            }

            return false;
        }

        return {
            getFilteredLocations: getFilteredLocations,
            getSVGIconHTMLCustom: getSVGIconHTMLCustom,
            getSVGIconHTML: getSVGIconHTML,
            getRelatedServices: getRelatedServices,
            getServicesOfLocations: getServicesOfLocations,
            getServicesBetweenDates: getServicesBetweenDates,
            getServiceDuration: getServiceDuration,
            safeApply: safeApply,
            formatDayToString: formatDayToString,
            showOnGantt: showOnGantt,
            openConsoleTab: openConsoleTab,
            trust: trust,
            openLink: openLink,
            openSObjectLink: openSObjectLink,
            openLightningSubtab: openLightningSubtab,
            openLightningPrimaryTab: openLightningPrimaryTab,
            getServiceInfoRowClass: getServiceInfoRowClass,
            isEmpty: isEmpty,
            generateResourceId: generateResourceId,
            addNotification: addNotification,
            addDaysToDate: addDaysToDate,
            setDatesByStartAndMode: setDatesByStartAndMode,
            sortByTime: sortByTime,
            getReports: getReports,
            getPolygons: getPolygons,
            intersectDates: intersectDates,
            getCSSClassByStatusCategory: getCSSClassByStatusCategory,
            getCssClassForContextBasedOnStatus: getCssClassForContextBasedOnStatus,
            fieldsTypes: fieldsTypes,
            ganttSettings: ganttSettings,
            butlerNotifications: function butlerNotifications() {
                return _butlerNotifications;
            },
            getIdsOfSObjectsAbsence: getIdsOfSObjectsAbsence,
            showServiceList: showServiceList,
            checkBoxFields: function checkBoxFields() {
                return _checkBoxFields;
            },
            woPriorities: woPriorities,
            durationTypes: durationTypes,
            statusFlow: statusFlow,
            statusTranslations: statusTranslations,
            statuses: statuses,
            statusesWithCategories: statusesWithCategories,
            convertDateBetweenTimeZones: convertDateBetweenTimeZones,
            convertDtToMomentDt: convertDtToMomentDt,
            convertMomentDtToDt: convertMomentDtToDt,
            getUserOffset: getUserOffset,
            getLocationOffset: getLocationOffset,
            setMapCloseButtonPosition: setMapCloseButtonPosition,
            getIdsOfSObjects: getIdsOfSObjects,
            hoursMinutes: hoursMinutes,
            hasCustomPermission: hasCustomPermission,
            formatDateWithDayOfWeek: formatDateWithDayOfWeek,
            isLightning: isLightning,
            getCustomActions: function getCustomActions(section) {
                return customActions.filter(function (action) {
                    return action.section === section;
                });
            },
            customActionsPromise: customActionsPromise.promise,
            removeFSLNamespace: removeFSLNamespace,
            crewsFilter: crewsFilter,
            generateDateKey: generateDateKey,
            isUseEdge: isUseEdge,
            getColorHexByCategory: getColorHexByCategory,
            getRelevantDataForDraggingService: getRelevantDataForDraggingService,
            getSchedulingPolicyObject: getSchedulingPolicyObject,
            getServiceDurationInTheory: getServiceDurationInTheory,
            isUrlImg: isUrlImg,
            isFormulaForImage: isFormulaForImage,
            escapeResourceName: escapeResourceName,
            shouldFilterServiceFromList: shouldFilterServiceFromList
        };
    }
})();