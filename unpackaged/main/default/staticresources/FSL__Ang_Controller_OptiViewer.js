'use strict';

(function () {
    angular.module('serviceExpert').controller('ctrlGanttOptiViewer', ['$scope', '$rootScope', '$q', 'BundleService', 'BundleActions', 'sfdcService', 'servicesService', 'utils', 'calendarsService', 'userSettingsManager', 'resourceFilterHelper', 'monthlyViewHelperService', 'ResourcesAndTerritoriesService', 'TimePhasedDataService', 'StateService', 'CapacityLightboxService', 'ResourceSmallMenu', 'AbsencesService', 'SkillsService', 'AbsenceLightboxService', 'ResourceLightboxService', 'ServiceAppointmentLightboxService', 'kpiCalculationsService', 'ResourceCapacitiesService', 'ResourceCrewsService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'GetSlotsService', 'bulkScheduleService', 'GeneralLightbox', 'StreamingClientResolverService', 'StreamingAPIService', 'OptimizationRequestsService', 'GanttPalettesService', function ($scope, $rootScope, $q, BundleService, BundleActions, sfdcService, servicesService, utils, calendarsService, userSettingsManager, resourceFilterHelper, monthlyViewHelperService, ResourcesAndTerritoriesService, TimePhasedDataService, StateService, CapacityLightboxService, ResourceSmallMenu, AbsencesService, SkillsService, AbsenceLightboxService, ResourceLightboxService, ServiceAppointmentLightboxService, kpiCalculationsService, ResourceCapacitiesService, ResourceCrewsService, SERVICE_STATUS, SERVICE_CATEGORY, GetSlotsService, bulkScheduleService, GeneralLightbox, StreamingClientResolverService, StreamingAPIService, OptimizationRequestsService, GanttPalettesService) {

        var __lastEventRightClicked = '',
            __lastBreakRightClicked = '',
            __lastModifiedEvent = {},
            __firstTimeLoad = true,
            __serviceContextMenu = new dhtmlXMenuObject({
            parent: 'contextZone_A',
            context: true
        }),
            __multiServicesContextMenu = new dhtmlXMenuObject({
            parent: 'contextZone_A',
            context: true
        });

        __serviceContextMenu.setOverflowHeight(15);
        __multiServicesContextMenu.setOverflowHeight(15);

        $scope.selectedGanttServices = {};
        $scope.resourceFilterHelper = resourceFilterHelper;
        $scope.StateService = StateService;
        $scope.resources = [];
        $scope.searchEmployee = '';
        $scope.resourceFieldToSortyBy = 'Name';
        $scope.successfullyScheduled = 0;
        $scope.currentSchedulingIndex = 0;
        $scope.timelineName = '';
        $scope.nowTimespans = [];
        $scope.selectedSkills = {};
        $scope.pinnedStatusesSF = CustomSettings.pinnedStatusesSF.split(',');
        $scope.hasCustomPermission = utils.hasCustomPermission;
        $scope.crewViewActive = false;
        $scope.crewsFilter = utils.crewsFilter;
        $scope.useResourceSkillFilter = useResourceSkillFilter;
        $scope.numberOfDaysInUtilizationView = 14;
        $scope.skillsLogicOperator = userSettingsManager.GetUserSettingsProperty('Skills_Logic_Operator__c') || 'and';
        $scope.locations = userSettingsManager.GetUserSettingsProperty('locations') || [];
        $scope.isOptimizationViewer = true;
        $rootScope.isOptimizationViewer = true;

        $scope.editPalette = utils.hasCustomPermission('Gantt_Palettes_Edit');
        $scope.viewPalette = utils.hasCustomPermission('Gantt_Palettes_View');

        scheduler.attachEvent("onTemplatesReady", function () {
            if (scheduler.matrix.MonthlyView) {
                scheduler.matrix.MonthlyView.x_size = userSettingsManager.GetUserSettingsProperty('DaysInUtilizationView__c') || 14;
                $scope.numberOfDaysInUtilizationView = scheduler.matrix.MonthlyView.x_size;
            }

            updateLongtermView();
        });

        // if we are not ignoring CPs
        if (!__gantt.ignoreReadonlyGantt226) {

            // user does NOT have permissions, lock gantt
            if (!window.customPermissions.Enable_Gantt_Locker) {
                $scope.ganttLocked = true;
                scheduler.config.readonly = true;
            } else {

                // user has permissions, get value from user settings
                $scope.ganttLocked = userSettingsManager.GetUserSettingsProperty('Lock_Gantt__c') || false;
            }
        } else {

            // we ARE ignoring CPs, get values from user settings
            $scope.ganttLocked = userSettingsManager.GetUserSettingsProperty('Lock_Gantt__c') || false;
        }

        scheduler.config.readonly = $scope.ganttLocked;

        // All stuff related to weekends highlighting
        $scope.currentViewOptions = {
            highlightWeekeneds: userSettingsManager.GetUserSettingsProperty('Highlight_Weekeneds__c') || false,
            minServiceDuration: userSettingsManager.GetUserSettingsProperty('Longterm_Min_Service_Duration__c') === undefined ? 8 : userSettingsManager.GetUserSettingsProperty('Longterm_Min_Service_Duration__c'),
            minNaDuration: userSettingsManager.GetUserSettingsProperty('Longterm_Min_Absence_Duration__c') === undefined ? 8 : userSettingsManager.GetUserSettingsProperty('Longterm_Min_Absence_Duration__c'),
            numOfMonths: userSettingsManager.GetUserSettingsProperty('Longterm_Num_Of_Months__c') || 1,
            showMdt: userSettingsManager.GetUserSettingsProperty('Show_Only_MDT_In_Longterm__c') || false
        };

        window.__currentViewOptions = $scope.currentViewOptions;

        $scope.saveMdtFilterSa = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Show_Only_MDT_In_Longterm__c', $scope.currentViewOptions.showMdt);
            scheduler._mode === 'LongView' && scheduler.setCurrentView();

            if (scheduler._mode === 'LongView') {
                $scope.updateGanttDates();
            }
        }, 400);

        $scope.saveHighlightWeekends = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Highlight_Weekeneds__c', $scope.currentViewOptions.highlightWeekeneds);
            updateViewDebounced();
        }, 400);

        $scope.saveMinimumLongtermServiceDuration = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Longterm_Min_Service_Duration__c', $scope.currentViewOptions.minServiceDuration);
            scheduler._mode === 'LongView' && scheduler.setCurrentView();

            if (scheduler._mode === 'LongView') {
                $scope.updateGanttDates();
            }
        }, 400);

        $scope.saveMinimumLongtermAbsenceDuration = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Longterm_Min_Absence_Duration__c', $scope.currentViewOptions.minNaDuration);
            scheduler._mode === 'LongView' && scheduler.setCurrentView();

            if (scheduler._mode === 'LongView') {
                $scope.updateGanttDates();
            }
        }, 400);

        $scope.handleLongTermViewSizeChange = _.debounce(function () {

            var oldValue = userSettingsManager.GetUserSettingsProperty('Longterm_Num_Of_Months__c');

            if (!$scope.currentViewOptions.numOfMonths) {
                $scope.currentViewOptions.numOfMonths = 1;
            }

            userSettingsManager.SetUserSettingsProperty('Longterm_Num_Of_Months__c', $scope.currentViewOptions.numOfMonths);

            updateLongtermView();
            scheduler._mode === 'LongView' && scheduler.setCurrentView();

            if (oldValue < $scope.currentViewOptions.numOfMonths) {
                $scope.updateGanttDates();
            }
        }, 200);

        function updateLongtermView() {
            if ($scope.currentViewOptions.numOfMonths <= 2) {
                scheduler.matrix.LongView.x_unit = 'day';
                scheduler.matrix.LongView.x_length = 7;
                scheduler.matrix.LongView.x_size = $scope.currentViewOptions.numOfMonths * 30;
            } else {
                scheduler.matrix.LongView.x_unit = 'week';
                scheduler.matrix.LongView.x_size = Math.ceil($scope.currentViewOptions.numOfMonths * 4.5);
                scheduler.matrix.LongView.x_length = 1;
            }
        }

        $scope.shouldShowSkill = function (fieldName, filter) {
            return fieldName.toUpperCase().includes(filter.toUpperCase());
        };

        $scope.saveUserPropSkillsLogic = function () {
            userSettingsManager.SetUserSettingsProperty('Skills_Logic_Operator__c', $scope.skillsLogicOperator);
        };

        $scope.paletteViewActive = false;

        $scope.showPaletteView = function () {
            window.paletteViewActive = true;
            $scope.paletteViewActive = true;
            updateViewDebounced();
        };

        $scope.hidePaletteView = function () {
            window.paletteViewActive = false;
            $scope.paletteViewActive = false;
            updateViewDebounced();
        };

        $scope.$watch('StateService.isLoadingNewLocations', function (newVal, oldVal) {
            if ((oldVal === undefined || oldVal === false) && newVal == true) {
                $scope.paletteViewActive = false;
            }
        });

        $rootScope.statusTranslations = utils.statusTranslations;

        $rootScope.$on('moveToCrewView', function () {
            $rootScope.crewViewActive = true;
            $scope.crewViewActive = true;
            TimePhasedDataService.isCrewViewActive = true;
        });

        $scope.$watch('resourceFilterHelper', function (newVal, oldVal) {
            $('#resourceExplainCrap').html($scope.resourceFilterHelper.generateFilterExplanation($scope.resourceFilters.showWorkingResource));

            // save to user settings
            if (!angular.equals(newVal, oldVal)) {
                userSettingsManager.SetUserSettingsProperty('Resource_Filter__c', JSON.stringify({
                    sortBy: $scope.resourceFilterHelper.resourceFieldToSortyBy,
                    asc: $scope.resourceFilterHelper.descending,
                    showWorkingResource: $scope.resourceFilters.showWorkingResource,
                    booleanFields: $scope.resourceFilterHelper.selectionInfo.resourceFilteringOptions,
                    picklistField: $scope.resourceFilterHelper.selectionInfo.selectedPicklist,
                    picklistOptions: $scope.resourceFilterHelper.selectionInfo.picklistOptions,
                    picklistOptionsModel: $scope.resourceFilterHelper.selectionInfo.picklistOptionsModel,
                    picklistNullValues: $scope.resourceFilterHelper.selectionInfo.picklistNullValues,
                    crewsOption: $scope.resourceFilterHelper.selectionInfo.crewsSelectionOptions.selectedPicklist
                }));
            }
        }, true);

        $scope.absencesTypeLoaded = false;
        $scope.defaultDragNa = {
            selectedNaDuration: JSON.parse(userSettingsManager.GetUserSettingsProperty('Drag_Na_Duration__c')) || 60,
            selectedNaType: userSettingsManager.GetUserSettingsProperty('Drag_Na_Type__c'),
            selectedNaLabel: userSettingsManager.GetUserSettingsProperty('Drag_Na_Label__c')
        };

        // absence types
        $scope.getEmployeeAbsenceTypes = function () {

            !$scope.absencesTypeLoaded && AbsencesService.getEmployeeAbsenceTypes().then(function (types) {
                $scope.absencesTypeLoaded = true;
                $scope.nonAvailabilityTypes = types;
                $scope.defaultDragNa.selectedNaType = userSettingsManager.GetUserSettingsProperty('Drag_Na_Type__c') || $scope.nonAvailabilityTypes[Object.keys($scope.nonAvailabilityTypes)[0]];
            });
        };

        $scope.businessHoursRange = {
            start: utils.ganttSettings.startHour,
            end: utils.ganttSettings.finishHour,
            includeWeekends: userSettingsManager.GetUserSettingsProperty('Include_Weekends__c')
        };

        $scope.resourceFilters = {
            showWorkingResource: JSON.parse(userSettingsManager.GetUserSettingsProperty('Resource_Filter__c')) ? JSON.parse(userSettingsManager.GetUserSettingsProperty('Resource_Filter__c')).showWorkingResource : false,
            resourcesWorkingInRange: {}
        };

        $scope.isInConsole = StateService.isInConsole;
        $scope.openConsoleTab = utils.openConsoleTab;
        $scope.capacityFields = monthlyViewHelperService.capacityCalculationFields;

        // get selected objects
        Object.defineProperty($scope.selectedGanttServices, 'getSelected', {
            enumrable: false,
            value: function value() {
                var selected = [];
                for (var id in this) {
                    this[id] && selected.push(id);
                }

                return selected;
            }
        });

        // is gantt filter applied?
        $scope.isGanttFilterApplied = function () {
            return utils.crewsFilter || $scope.skillsFilter || resourceFilterHelper.isResourceFilterApplied() || $scope.resourceFilters.showWorkingResource;
        };

        // set cached dom elements
        if (!cachedDomElements.timesDragFix) cachedDomElements.timesDragFix = $('#timesDragFix');

        var busHoursFirstWatch = true;

        $scope.$watchCollection('businessHoursRange', watchBusinessHours);

        function watchBusinessHours() {
            if (busHoursFirstWatch) {
                busHoursFirstWatch = false;
                return;
            }

            setHoursToDisplay($scope.businessHoursRange.start, $scope.businessHoursRange.end, $scope.businessHoursRange.includeWeekends);

            // we need gantts events to run, that's why we are not using updateView()
            scheduler.setCurrentView();

            utils.ganttSettings.startHour = $scope.businessHoursRange.start;
            utils.ganttSettings.finishHour = $scope.businessHoursRange.end;

            // save to local storage
            var propAndValues = {};
            propAndValues['Gantt_View_Start_Hour__c'] = utils.ganttSettings.startHour;
            propAndValues['Gantt_View_Finish_Hour__c'] = utils.ganttSettings.finishHour;
            propAndValues['Include_Weekends__c'] = $scope.businessHoursRange.includeWeekends;
            userSettingsManager.SetUserSettingProperties(propAndValues);
        }

        // get resources
        ResourcesAndTerritoriesService.promises.resources().then(function () {
            $scope.resources = ResourcesAndTerritoriesService.getResources;
        });

        $scope.saveDragNaDefaults = function (field) {
            switch (field) {
                case 'duration':
                    userSettingsManager.SetUserSettingsProperty('Drag_Na_Duration__c', $scope.defaultDragNa.selectedNaDuration);
                    break;
                case 'type':
                    userSettingsManager.SetUserSettingsProperty('Drag_Na_Type__c', $scope.defaultDragNa.selectedNaType);
                    break;
                case 'label':
                    userSettingsManager.SetUserSettingsProperty('Drag_Na_Label__c', $scope.defaultDragNa.selectedNaLabel);
                    break;
            }
        };

        $scope.getTimePhasedObjects = function (fromArrows) {

            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date,
                dayInTicks = 1000 * 60 * 60 * 24;

            if (scheduler._mode === 'LongView') {
                dayInTicks *= scheduler.matrix.LongView.x_length;
            }

            // need to reduce day here because scheduler is still not updated (with old dates)
            if (fromArrows === 'left') {

                start.setTime(start.getTime() - dayInTicks);
                finish.setTime(finish.getTime() - dayInTicks);
            } else if (fromArrows === 'right') {

                start.setTime(start.getTime() + dayInTicks);
                finish.setTime(finish.getTime() + dayInTicks);
            }

            return TimePhasedDataService.getTimePhasedObjects(start, finish).then(function (data) {

                $rootScope.$broadcast('ganttFinishedLoadingServices');
                updateViewDebounced();

                if (__firstTimeLoad) {

                    if (window.__gantt.checkRulesMode !== 'Always') kpiCalculationsService.calculateKpis();
                    __firstTimeLoad = false;
                    updateViewDebounced();

                    var idToShow = null;

                    if (document.URL.indexOf('service=') > -1) {
                        idToShow = document.URL.substr(document.URL.indexOf('service=') + 8, 18);
                    }

                    if (scheduler._events[idToShow]) {

                        scheduler._select_id = idToShow;
                        scheduler.select(idToShow);

                        setTimeout(function () {
                            utils.showOnGantt(idToShow);
                        }, 0);
                    } else if (idToShow) {
                        alert(customLabels.cant_display_service);
                    }
                }
            });
        };

        $scope.updateGanttDates = function (fromArrows) {

            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date,
                dayInTicks = 1000 * 60 * 60 * 24;

            if (scheduler._mode === 'LongView') {
                dayInTicks *= scheduler.matrix.LongView.x_length;
            }

            // need to reduce day here because scheduler is still not updated (with old dates)
            if (fromArrows === 'left') {

                start.setTime(start.getTime() - dayInTicks);
                finish.setTime(finish.getTime() - dayInTicks);
            } else if (fromArrows === 'right') {

                start.setTime(start.getTime() + dayInTicks);
                finish.setTime(finish.getTime() + dayInTicks);
            }

            return function (data) {

                $rootScope.$broadcast('ganttFinishedLoadingServices');
                updateViewDebounced();

                if (__firstTimeLoad) {

                    if (window.__gantt.checkRulesMode !== 'Always') kpiCalculationsService.calculateKpis();
                    __firstTimeLoad = false;
                    updateViewDebounced();

                    var idToShow = null;

                    if (document.URL.indexOf('service=') > -1) {
                        idToShow = document.URL.substr(document.URL.indexOf('service=') + 8, 18);
                    }

                    if (scheduler._events[idToShow]) {

                        scheduler._select_id = idToShow;
                        scheduler.select(idToShow);

                        setTimeout(function () {
                            utils.showOnGantt(idToShow);
                        }, 0);
                    } else if (idToShow) {
                        alert(customLabels.cant_display_service);
                    }
                }
            };
        };

        // post to chatter - if getting an array, send it. if getting true then send the selected array
        function postToChatter(servicesIdsArray, sayWhat) {

            if (sayWhat === '') sayWhat = prompt(customLabels.msg_to_post_to_chatter, '');

            if (sayWhat === null) {
                return;
            }

            if (sayWhat === '') {
                alert(customLabels.no_empty_msg_to_chatter);
                return;
            }

            if (servicesIdsArray.length === 1) servicesService.recentlyUsed[servicesIdsArray[0]] = true;

            servicesService.postToChatter(servicesIdsArray, sayWhat).then(function (numOfMentions) {});
        }

        // this will be called when the user click on the left/right arrows on the top of the gantt
        $scope.changeDatesByArrows = function (direction) {
            updateViewDebounced();
            $scope.updateGanttDates(direction);
        };

        // double clicking an event will open the lightbox
        scheduler.attachEvent('onDblClick', function (id, e) {

            utils.safeApply($scope, function () {
                if (scheduler.getEvent(id).type === 'service') {
                    servicesService.recentlyUsed[id] = true;
                    ServiceAppointmentLightboxService.open(id);
                } else if (scheduler.getEvent(id).type === 'contractorcapacity') {
                    CapacityLightboxService.open(id);
                } else {
                    AbsenceLightboxService.open(id);
                }
            });
        });

        // folder click
        scheduler.attachEvent("onBeforeFolderToggle", function (section, isOpen) {

            folderJustToggled = true;

            utils.safeApply($scope, function () {
                StateService.ganttOpenedTerritories[section.key] = isOpen;
                saveToggleTerritoriesDebounced();
            });

            return true;
        });

        var saveToggleTerritoriesDebounced = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Toggled_Territories__c', JSON.stringify(StateService.ganttOpenedTerritories));
        }, 800);

        scheduler.attachEvent('onBeforeViewChange', function (old_mode, old_date, new_mode, newStartDate) {

            // if we were sorting by utilizaion in utilizaion view and now on normal mode, change sorting to by name
            if (old_mode === 'MonthlyView' && new_mode !== 'MonthlyView' && resourceFilterHelper.resourceFieldToSortyBy === '__Utilization__') {
                resourceFilterHelper.resourceFieldToSortyBy = 'Name';
            }
            return true;
        });

        scheduler.attachEvent('onViewChange', function (new_mode, new_date) {
            removeAllHolidayPopovers();

            utils.safeApply($scope, function () {

                // set name on timeline selector
                switch (scheduler._mode) {
                    case 'ZoomLevel2':
                        $scope.timelineName = customLabels.In_Day;
                        break;

                    case 'ZoomLevel3':
                        $scope.timelineName = customLabels.Daily;
                        break;

                    case 'ZoomLevel4':
                        $scope.timelineName = customLabels.X2_Days;
                        break;

                    case 'ZoomLevel5':
                        $scope.timelineName = customLabels.X3_Days;
                        break;

                    case 'ZoomLevel6':
                        $scope.timelineName = customLabels.Weekly;
                        break;

                    case 'ZoomLevel7':
                        $scope.timelineName = customLabels.TwoWeeks;
                        break;

                    case 'MonthlyView':
                        $scope.timelineName = customLabels.Utilization;
                        break;

                    case 'MTDView':
                        $scope.timelineName = customLabels.MDTVIEW;
                        break;

                    case 'LongView':
                        $scope.timelineName = customLabels.LongView;
                        break;
                }

                $('#MonthlyLocationViewTooltip').remove();
                drawTimeNow();
                updateViewDebounced();

                if (scheduler._old.mode !== new_mode || scheduler._old.date !== new_date) {
                    kpiCalculationsService.calculateKpis();
                }
            });
        });

        // select services
        scheduler.attachEvent('onBeforeDrag', function (id, mode, e) {

            //don't allow drag if dummy event or locked
            if (id && (scheduler._events[id].isDummy || window.__lockedServicesIds[id])) {
                return;
            }

            var key = void 0,
                ctrlOrCommandPressed = e.ctrlKey || e.metaKey;

            // allow dragging shifts but not create them
            if (!id || mode === 'create') {

                // unselect all other services
                if (!ctrlOrCommandPressed) {
                    for (key in $scope.selectedGanttServices) {
                        $scope.selectedGanttServices[key] = false;
                        if (scheduler.getRenderedEvent(key)) scheduler.updateEvent(key);
                    }
                }

                return false;
            }

            //enable multi select with ctrl key - only for services
            if (id && scheduler.getEvent(id).type === 'service') {

                if (ctrlOrCommandPressed) {
                    __multiServicesContextMenu.hide();

                    if (!$scope.selectedGanttServices[id]) {
                        $scope.selectedGanttServices[id] = true;

                        // scheduler.getEvent(id).selected = true;
                        scheduler.updateEvent(id);
                    } else {
                        $scope.selectedGanttServices[id] = false;
                        scheduler.updateEvent(id);
                    }

                    return false;
                } else {
                    //catch first event
                    $scope.selectedGanttServices[id] = true;

                    //unselect all other services
                    for (key in $scope.selectedGanttServices) {
                        if (key !== id) {
                            $scope.selectedGanttServices[key] = false;

                            // scheduler.getEvent(key).selected = false;
                            if (scheduler.getEvent(key) && scheduler.getSection(scheduler.getEvent(key).resourceId)) scheduler.updateEvent(key);
                        }
                    }
                }
            } else {

                // unselect all other services
                if (!ctrlOrCommandPressed) {
                    if ($scope.selectedGanttServices.getSelected().length >= 1) {
                        for (key in $scope.selectedGanttServices) {
                            $scope.selectedGanttServices[key] = false;
                            if (scheduler.getRenderedEvent(key)) scheduler.updateEvent(key);
                        }
                    }
                }
            }

            // W-8630685: if we do NOT ignore CPs and user has no D&D cp, disable dragging
            if (!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Drag_And_Drop && scheduler._events[id]) {
                return;
            }

            // allow dragging only for services (new - drag NA also)
            if (scheduler.getEvent(id).type !== 'service' && scheduler.getEvent(id).type !== 'na') return;

            // don't allow dragging pinned services
            if (id && scheduler.getEvent(id).type === 'service' && scheduler.getEvent(id).pinned && preventUpdateOfPinned) return;

            return true;
        });

        // Unselect all other services
        function unselectMultiSelected() {
            for (var key in $scope.selectedGanttServices) {
                delete $scope.selectedGanttServices[key];
            }
        }

        // used to be $watch with true
        $scope.$watchCollection('selectedGanttServices', function (newVal, oldVal) {
            globalSelectedGanttServices = $scope.selectedGanttServices;
        });

        // jump to date with DHTMLX mini calendar
        $scope.jumpToDate = function () {
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'JumpToDate',
                    date: scheduler._date,
                    navigation: true,
                    handler: function handler(date, calendar) {
                        scheduler.setCurrentView(date);
                        scheduler.destroyCalendar();
                        $scope.changeDatesByArrows();
                    }
                });
            }
        };

        // ------------------------------ context menu break ------------------------------


        var breakContextMenu = new dhtmlXMenuObject({
            parent: 'contextZone_A',
            context: true
        });

        breakContextMenu.setOverflowHeight(15);

        breakContextMenu.addNewChild(breakContextMenu.topId, 0, 'details', utils.getSVGIconHTML(lsdIcons.info) + customLabels.Details, false);

        breakContextMenu.attachEvent('onClick', function (id, zoneId, cas) {

            switch (id) {

                case 'details':
                    utils.safeApply($scope, function () {
                        AbsenceLightboxService.open(__lastBreakRightClicked);
                    });

                    break;

                case 'delete':
                    utils.safeApply($scope, function () {

                        if (!confirm(customLabels.naDeleteConfirm)) return;

                        AbsencesService.deleteAbsence(__lastBreakRightClicked).then(function (isDeleted) {
                            if (isDeleted) {
                                //delete $scope.absences[__lastBreakRightClicked];
                                scheduler.deleteEvent(__lastBreakRightClicked);
                            } else {
                                alert(customLabels.Failed_To_Delete_Break);
                            }
                        });
                    });
                    break;

                default:

                    if (id.indexOf('custom_') === 0) {

                        var actionType = scheduler._events[__lastBreakRightClicked].type,
                            actionIndex = parseInt(id.split('_')[1]),
                            action = utils.getCustomActions(actionType)[actionIndex];

                        if (action.visualforce) {

                            var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                                endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                            GeneralLightbox.open(action.name, action.visualforce + '?id=' + __lastBreakRightClicked + '&type=' + actionType + '&start=' + startDateStr + '&end=' + endDateStr);

                            break;
                        }

                        sfdcService.callRemoteAction(RemoteActions.runCustomAbsenceAction, action.className, __lastBreakRightClicked, actionType, scheduler._min_date, scheduler._max_date).then(function (res) {

                            if (res) {
                                utils.addNotification(action.name, res, null, null);
                            }
                        }).catch(function (ev) {
                            return utils.addNotification(action.name, ev.message, null, null);
                        });

                        break;
                    }
            }
        });

        // ------------------------------ context menu ------------------------------


        // init the service context menu (for single service clicked)
        (function initSingleServiceContextMenu() {

            __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 0, 'details', utils.getSVGIconHTML(lsdIcons.info) + customLabels.Details, false);
            __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 3, 'reschedule', utils.getSVGIconHTML(lsdIcons.calendar) + customLabels.Reschedule, false);

            // add support for rule checking
            if (window.customPermissions.Enable_Check_Rules) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 12, 'validate', utils.getSVGIconHTML(lsdIcons.violation) + customLabels.check_rules_action_label, false);
            }

            if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Get_Candidates || window.__gantt.ignoreReadonlyGantt226) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 4, 'candidates', utils.getSVGIconHTML(lsdIcons.candidates) + customLabels.Get_Candidates, false);
            }

            __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 10, 'reshuffle', utils.getSVGIconHTML(lsdIcons.retweet) + customLabels.Reshuffle, false);
            __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 11, 'groupNearby', utils.getSVGIconHTML(lsdIcons.groupNearby) + customLabels.GroupNearby, false);

            if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 5, 'status', utils.getSVGIconHTML(lsdIcons.replace) + customLabels.Change_status + "<i class='fa fa-caret-right status-change-carret'></i>", false);
            }

            __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 6, 'map', utils.getSVGIconHTML(lsdIcons.world) + customLabels.Map, false);

            if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Unschedule || window.__gantt.ignoreReadonlyGantt226) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 8, 'unschedule', utils.getSVGIconHTML(lsdIcons.na) + customLabels.Unschedule, false);
            }

            // show the post to chatter action only if chatter is enabled for service
            if (fieldTrackingEnabled.service) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 7, 'chatter', utils.getSVGIconHTML(lsdIcons.chat) + customLabels.Chatter + "<i id='chatterArrowContext' class='fa fa-caret-right chatter-carret'></i>", false);
                __serviceContextMenu.addNewChild('chatter', 0, 'chatter_welldone', utils.getSVGIconHTML(lsdIcons.like) + customLabels.well_done, false);
                __serviceContextMenu.addNewChild('chatter', 1, 'chatter_hurryup', utils.getSVGIconHTML(lsdIcons.hurry) + customLabels.Hurry_up, false);
                __serviceContextMenu.addNewChild('chatter', 2, 'chatter_requestupdate', utils.getSVGIconHTML(lsdIcons.help) + customLabels.Request_update, false);
                __serviceContextMenu.addNewChild('chatter', 3, 'chatter_custom', utils.getSVGIconHTML(lsdIcons.threedots) + customLabels.Custom_message, false);
            }

            // add custom service actions

            utils.customActionsPromise.then(function () {

                var customServiceActions = utils.getCustomActions('gantt');

                customServiceActions.forEach(function (customAction, i) {

                    if (customAction.icon) {
                        __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 12 + i, 'custom_' + i, utils.getSVGIconHTML(customAction.icon) + customAction.name.encodeHTML(), false);
                    } else {
                        __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 12 + i, 'custom_' + i, customAction.name.encodeHTML(), false);
                    }
                });
            });

            if (BundleService.isActive() && utils.hasCustomPermission('Bundle_Unbundle')) {

                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 41, 'bundler', utils.getSVGIconHTML(BundleActions.Bundle.icon) + BundleActions.Bundle.label, false);
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 42, 'unbundler', utils.getSVGIconHTML(BundleActions.Unbundle.icon) + BundleActions.Unbundle.label, false);
            }
        })();

        function addContextMenuItems(event_id) {

            var isPinnedStatus = false;
            for (var i = 0; i < $scope.pinnedStatusesSF.length; i++) {
                if (scheduler._events[event_id].status === $scope.pinnedStatusesSF[i]) isPinnedStatus = true;
            }

            if (BundleService.isActive() && utils.hasCustomPermission('Bundle_Unbundle')) {

                // we can't see on gantt member 
                if (BundleActions.Bundle.canInvoke([scheduler._events[event_id]])) {
                    __serviceContextMenu.showItem('bundler');
                } else {
                    __serviceContextMenu.hideItem('bundler');
                }
                if (BundleActions.Unbundle.canInvoke([scheduler._events[event_id]])) {
                    __serviceContextMenu.showItem('unbundler');
                } else {
                    __serviceContextMenu.hideItem('unbundler');
                }
            }

            //is pinned or pinned SF status? remove schedule and cands
            if (scheduler._events[event_id].pinned || isPinnedStatus) {
                __serviceContextMenu.hideItem('reschedule');
                __serviceContextMenu.hideItem('candidates');
                __serviceContextMenu.hideItem('unschedule');
                __serviceContextMenu.hideItem('status');
                __serviceContextMenu.hideItem('reshuffle');
                __serviceContextMenu.hideItem('groupNearby');
            } else {
                __serviceContextMenu.showItem('reschedule');

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Get_Candidates || window.__gantt.ignoreReadonlyGantt226) {
                    __serviceContextMenu.showItem('candidates');
                }

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Unschedule || window.__gantt.ignoreReadonlyGantt226) {
                    __serviceContextMenu.showItem('unschedule');
                }

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {
                    __serviceContextMenu.showItem('status');
                }

                __serviceContextMenu.showItem('reshuffle');
                __serviceContextMenu.showItem('groupNearby');
            }

            // if pinned, cant change status
            if (scheduler._events[event_id].pinned) {
                __serviceContextMenu.hideItem('status');
            } else {

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {
                    __serviceContextMenu.showItem('status');
                }
            }

            // if no geolocation - cant group near by
            if (!scheduler._events[event_id].latitude || !scheduler._events[event_id].longitude || !utils.hasCustomPermission('Group_Nearby')) {
                __serviceContextMenu.hideItem('groupNearby');
            } else {
                __serviceContextMenu.showItem('groupNearby');
            }

            //check custom permission for reschedule
            if (!utils.hasCustomPermission('Schedule')) {
                __serviceContextMenu.hideItem('reschedule');
            } else if (scheduler._events[event_id].relatedService1 && scheduler._events[event_id].isImmidietlyFollow) {
                __serviceContextMenu.hideItem('reschedule');
                __serviceContextMenu.hideItem('candidates');
            } else if (!scheduler._events[event_id].isImmidietlyFollow) {
                __serviceContextMenu.showItem('reschedule');
            }

            //check custom permission for reshuffle
            if (!utils.hasCustomPermission('Reshuffle')) {
                __serviceContextMenu.hideItem('reshuffle');
            } else {
                __serviceContextMenu.showItem('reshuffle');
            }

            // need to add "show related" ?
            __serviceContextMenu.removeItem('showRelated');
            if (scheduler._events[event_id].isServiceInChain || scheduler._events[event_id].relatedTo || scheduler._events[event_id].relatedFather) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 5, 'showRelated', utils.getSVGIconHTML(lsdIcons.related) + customLabels.Show_related, false);
            }

            // remove map from contextMenu.
            if (!StateService.isMapEnabled() || scheduler._events[event_id].latitude === null) {
                __serviceContextMenu.hideItem('map');
            } else {
                __serviceContextMenu.showItem('map');
            }

            // check if unflagged or flagged
            __serviceContextMenu.removeItem('flag');
            if (servicesService.flagged[event_id]) __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 1, 'flag', "<span class='emptyFlag'>" + utils.getSVGIconHTML(lsdIcons.flag) + "</span>" + customLabels.Unflag, false);else __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 1, 'flag', "<span class='fullFlag'>" + utils.getSVGIconHTML(lsdIcons.flag) + "</span>" + customLabels.Flag, false);

            // check if pinned
            __serviceContextMenu.removeItem('pin');

            if (scheduler._events[event_id].pinned) {

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Pin_Service || window.__gantt.ignoreReadonlyGantt226) {
                    __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 9, 'pin', "<span class='emptyFlag'>" + utils.getSVGIconHTML(lsdIcons.unpin) + "</span>" + customLabels.Unpin, false);
                }
            } else if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Pin_Service || window.__gantt.ignoreReadonlyGantt226) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 9, 'pin', "<span class='fullFlag'>" + utils.getSVGIconHTML(lsdIcons.pin) + "</span>" + customLabels.Pin, false);
            }

            __serviceContextMenu.removeItem('consoleTab');
            if ($scope.isInConsole()) {
                __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 1, 'consoleTab', utils.getSVGIconHTML(lsdIcons.external) + customLabels.Open_Tab, false);
            }
        }

        var menuItemsIdsToStatuses = {};

        // update context menu to consider the status flow
        function updateContextMenuStatusFlow(from) {

            var cssStatusName = void 0,
                i = 0;

            if (!_.isEmpty(utils.statusFlow)) {

                if (utils.statusFlow[from] && utils.statusFlow[from].length > 0) {
                    __serviceContextMenu.removeItem('status');

                    if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {
                        __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 5, 'status', utils.getSVGIconHTML(lsdIcons.replace) + customLabels.Change_status + "<i class='fa fa-caret-right status-change-carret'></i>", false);
                    }
                } else {
                    __serviceContextMenu.removeItem('status');
                    return;
                }
            } else {

                __serviceContextMenu.removeItem('status');

                if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {

                    __serviceContextMenu.addNewChild(__serviceContextMenu.topId, 5, 'status', utils.getSVGIconHTML(lsdIcons.replace) + customLabels.Change_status + "<i class='fa fa-caret-right status-change-carret'></i>", false);

                    for (var st in utils.statuses) {
                        cssStatusName = 'ContextMenu_' + utils.statusTranslations[utils.statuses[st]].split(' ').join('');
                        __serviceContextMenu.addNewChild('status', i, 'status_change_' + i, "<span class='StatusColorChanger " + cssStatusName + ' ' + utils.getCSSClassForContext(utils.statusTranslations[utils.statuses[st]], SERVICE_STATUS) + "'></span>" + utils.statusTranslations[utils.statuses[st]], false);
                        menuItemsIdsToStatuses['status_change_' + i++] = utils.statuses[st];
                    }
                }

                return; // using default, all statuses allowed
            }

            menuItemsIdsToStatuses = {};

            for (i = 0; i < utils.statusFlow[from].length; i++) {
                cssStatusName = 'ContextMenu_' + utils.statusFlow[from][i].split(' ').join('');
                __serviceContextMenu.addNewChild('status', i, 'status_change_' + i, "<span class='StatusColorChanger " + cssStatusName + ' ' + utils.getCSSClassForContext(utils.statusFlow[from][i], SERVICE_STATUS) + "'></span>" + utils.statusTranslations[utils.statusFlow[from][i]], false);
                menuItemsIdsToStatuses['status_change_' + i] = utils.statusFlow[from][i];
            }
        }

        scheduler.attachEvent('onContextMenu', function (event_id, native_event_object) {

            // scheduler is locked
            if (scheduler.config.readonly) return true;

            if (event_id && scheduler.getEvent(event_id).type !== 'service' && scheduler.getEvent(event_id).type !== 'break' && scheduler.getEvent(event_id).type !== 'na') return false;

            if (BundleService.isActive()) {

                var selected = $scope.selectedGanttServices.getSelected();

                var sa = [];
                selected.map(function (item) {
                    sa.push(scheduler._events[item]);
                });

                if (utils.hasCustomPermission('Bulk_Bundle')) {
                    __multiServicesContextMenu.hideItem('bundler');
                    if (BundleActions.Bundle.canInvoke(sa)) {
                        __multiServicesContextMenu.showItem('bundler');
                    }
                }
                if (utils.hasCustomPermission('Bulk_Unundle')) {
                    __multiServicesContextMenu.hideItem('unbundler');
                    if (BundleActions.Unbundle.canInvoke(sa)) {
                        __multiServicesContextMenu.showItem('unbundler');
                    }
                }
            } // BundleService.isActive


            if (event_id) {

                __serviceContextMenu.hide();
                __multiServicesContextMenu.hide();
                breakContextMenu.hide();

                scheduler.dhtmlXTooltip.hide();

                var posx = 0,
                    posy = 0;

                if (native_event_object.pageX || native_event_object.pageY) {
                    posx = native_event_object.pageX;
                    posy = native_event_object.pageY;
                } else if (native_event_object.clientX || native_event_object.clientY) {
                    posx = native_event_object.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                    posy = native_event_object.clientY + document.body.scrollTop + document.documentElement.scrollTop;
                }

                if ($scope.selectedGanttServices.getSelected().length < 2) {

                    if (scheduler._events[event_id].type === 'break') {
                        breakContextMenu.removeItem('delete');

                        // remove all custom actions actions
                        utils.getCustomActions('na').forEach(function (customAction, i) {
                            breakContextMenu.removeItem('custom_' + i);
                        });

                        utils.getCustomActions('break').forEach(function (customAction, i) {
                            breakContextMenu.removeItem('custom_' + i);
                        });

                        // add break actions
                        utils.getCustomActions('break').forEach(function (customAction, i) {
                            breakContextMenu.addNewChild(__serviceContextMenu.topId, i + 10, 'custom_' + i, utils.getSVGIconHTML(customAction.icon) + customAction.name.encodeHTML(), false);
                        });

                        breakContextMenu.showContextMenu(posx, posy);
                        __lastBreakRightClicked = event_id;

                        return false; // prevent default action and propagation
                    }

                    if (scheduler._events[event_id].type === 'na') {
                        breakContextMenu.removeItem('delete');
                        breakContextMenu.addNewChild(breakContextMenu.topId, 1, 'delete', utils.getSVGIconHTML(lsdIcons.delete) + customLabels.Delete, false);

                        // remove all custom actions actions
                        utils.getCustomActions('na').forEach(function (customAction, i) {
                            breakContextMenu.removeItem('custom_' + i);
                        });

                        utils.getCustomActions('break').forEach(function (customAction, i) {
                            breakContextMenu.removeItem('custom_' + i);
                        });

                        // add na actions
                        utils.getCustomActions('na').forEach(function (customAction, i) {
                            breakContextMenu.addNewChild(__serviceContextMenu.topId, 12 + i, 'custom_' + i, utils.getSVGIconHTML(customAction.icon) + customAction.name.encodeHTML(), false);
                        });

                        breakContextMenu.showContextMenu(posx, posy);
                        __lastBreakRightClicked = event_id;
                        return false; // prevent default action and propagation
                    }

                    addContextMenuItems(event_id);

                    if (!scheduler.getEvent(event_id).pinned) {
                        updateContextMenuStatusFlow(scheduler.getEvent(event_id).status);
                    }

                    __serviceContextMenu.showContextMenu(posx, posy);
                    __lastEventRightClicked = event_id;

                    return false;
                } else {

                    __multiServicesContextMenu.removeItem('selectedNumber');
                    __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 0, 'selectedNumber', "<i class='fa fa-check-square-o'></i> " + customLabels.x_services_selected.replaceAll($scope.selectedGanttServices.getSelected().length), true);
                    __multiServicesContextMenu.removeItem('status');

                    if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Change_Status || window.__gantt.ignoreReadonlyGantt226) {

                        __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 4, 'status', utils.getSVGIconHTML(lsdIcons.replace) + customLabels.Change_status + "<i class='fa fa-caret-right status-change-carret'></i>", false);

                        menuItemsIdsToStatuses = {};
                        var i = 0;

                        for (var st in utils.statuses) {
                            var cssStatusName = 'ContextMenu_' + utils.statusTranslations[utils.statuses[st]].split(' ').join('');
                            __multiServicesContextMenu.addNewChild('status', i, 'status_change_' + i, "<span class='StatusColorChanger " + cssStatusName + ' ' + utils.getCSSClassForContext(utils.statusTranslations[utils.statuses[st]], SERVICE_STATUS) + "'></span>" + utils.statusTranslations[utils.statuses[st]], false);
                            menuItemsIdsToStatuses['status_change_' + i++] = utils.statuses[st];
                        }
                    }

                    __multiServicesContextMenu.showContextMenu(posx, posy);

                    return false;
                }
            }

            __lastEventRightClicked = '';
            __lastBreakRightClicked = '';

            return true;
        });

        __serviceContextMenu.attachEvent('onShow', function (id) {
            contextShown = true;
        });

        __serviceContextMenu.attachEvent('onHide', function (id) {
            contextShown = false;
        });

        breakContextMenu.attachEvent('onShow', function (id) {
            contextShown = true;
        });

        breakContextMenu.attachEvent('onHide', function (id) {
            contextShown = false;
        });

        __serviceContextMenu.attachEvent('onClick', function (id, zoneId, cas) {

            $scope.$evalAsync(function () {
                switch (id) {

                    case 'bundler':

                        BundleActions.Bundle.invoke([scheduler._events[__lastEventRightClicked]], StateService.selectedPolicyId).then(function (res) {

                            unselectMultiSelected();
                        }, function (err) {});

                        break;

                    case 'unbundler':

                        BundleActions.Unbundle.invoke([scheduler._events[__lastEventRightClicked]], StateService.selectedPolicyId).then(function () {

                            unselectMultiSelected();
                            //    scheduler.deleteEvent(__lastEventRightClicked);
                        }, function () {
                            unselectMultiSelected();
                        });
                        break;

                    case 'details':
                        utils.safeApply($scope, function () {
                            ServiceAppointmentLightboxService.open(__lastEventRightClicked);
                        });

                        break;

                    case 'consoleTab':
                        $scope.openConsoleTab(null, __lastEventRightClicked);
                        break;

                    case 'flag':
                        $scope.$evalAsync(function () {
                            servicesService.flagged[__lastEventRightClicked] = !servicesService.flagged[__lastEventRightClicked];
                            scheduler.updateEvent(__lastEventRightClicked);
                        });

                        break;

                    case 'pin':

                        servicesService.changePin([scheduler._events[__lastEventRightClicked].id], !scheduler._events[__lastEventRightClicked].pinned).then(function () {
                            return updateViewDebounced();
                        });
                        break;

                    case 'reschedule':

                        $scope.$evalAsync(function () {

                            servicesService.autoScheduleService(__lastEventRightClicked).then(function (updatedObjects) {

                                if (updatedObjects.services.length === 0) {
                                    alert(customLabels.NoCandidates);
                                }

                                servicesService.drawServicesAndAbsences(updatedObjects.services, updatedObjects.absences);
                            }).catch(function (err) {
                                var name = TimePhasedDataService.serviceAppointments()[__lastEventRightClicked].name;
                                utils.addNotification(name + ' - ' + customLabels.Action_Could_Not_Be_Performed, err.message, function () {
                                    ServiceAppointmentLightboxService.open(__lastEventRightClicked);
                                });
                            });
                        });

                        break;

                    case 'reshuffle':
                        $scope.$evalAsync(function () {

                            sfdcService.callRemoteAction(RemoteActions.runReshuffle, __lastEventRightClicked, StateService.selectedPolicyId).then(function (optReq) {
                                // DeltaService.updateOptimizationRequest(optReq);
                            }, function (err) {
                                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message);
                            });
                        });
                        break;
                    case 'groupNearby':
                        $scope.$evalAsync(function () {
                            sfdcService.callRemoteAction(RemoteActions.runGroupNearby, __lastEventRightClicked, StateService.selectedPolicyId).then(function (optReq) {
                                // DeltaService.updateOptimizationRequest(optReq);
                            }, function (err) {
                                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message);
                            });
                        });
                        break;

                    case 'candidates':
                        GetSlotsService.get(__lastEventRightClicked);
                        break;

                    case 'chatter_welldone':
                        postToChatter([__lastEventRightClicked], customLabels.Well_done_mate);
                        break;

                    case 'chatter_hurryup':
                        postToChatter([__lastEventRightClicked], customLabels.hurry_up_with_this_service);
                        break;

                    case 'chatter_requestupdate':
                        postToChatter([__lastEventRightClicked], customLabels.please_update_service);
                        break;

                    case 'chatter_custom':
                        postToChatter([__lastEventRightClicked], '');
                        break;

                    case 'unschedule':
                        $scope.$evalAsync(function () {
                            unscheduleServices([__lastEventRightClicked]);
                        });
                        break;

                    case 'map':
                        $scope.showOnMap(__lastEventRightClicked);
                        break;

                    case 'showRelated':

                        if (usingNewMstModel || scheduler._events[__lastEventRightClicked].isServiceInChain) {
                            GeneralLightbox.open(customLabels.ComplexRelatedServicesForGanttLB + ' ' + scheduler._events[__lastEventRightClicked].name, mstPage + '?ingantt=true&id=' + __lastEventRightClicked);
                            return;
                        }

                        if (scheduler._events[scheduler._events[__lastEventRightClicked].relatedFather]) {
                            utils.showOnGantt(scheduler._events[__lastEventRightClicked].relatedFather);
                            return;
                        } else if (scheduler._events[scheduler._events[__lastEventRightClicked].relatedTo]) {
                            utils.showOnGantt(scheduler._events[__lastEventRightClicked].relatedTo);
                            return;
                        }

                        if (scheduler._events[__lastEventRightClicked].relatedFather) alert(customLabels.related_x_not_scheduled_no_display.replaceAll(TimePhasedDataService.serviceAppointments()[scheduler._events[__lastEventRightClicked].relatedFather].name));else alert(customLabels.related_x_not_scheduled_no_display.replaceAll(TimePhasedDataService.serviceAppointments()[scheduler._events[__lastEventRightClicked].relatedTo].name));

                        break;

                    case 'validate':
                        servicesService.checkRules([__lastEventRightClicked]).then(servicesService.drawViolationsOnGantt);
                        break;

                    default:

                        if (id.indexOf('custom_') === 0) {

                            var actionIndex = parseInt(id.split('_')[1]),
                                servicesIds = [__lastEventRightClicked],
                                action = utils.getCustomActions('gantt')[actionIndex];

                            if (action.visualforce) {

                                var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                                    endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                                GeneralLightbox.open(action.name, action.visualforce + '?id=' + __lastEventRightClicked + '&start=' + startDateStr + '&end=' + endDateStr);

                                break;
                            }

                            sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, servicesIds, scheduler._min_date, scheduler._max_date).then(function (res) {
                                if (res) {
                                    utils.addNotification(action.name, res, null, null);
                                }
                            }).catch(function (ev) {
                                return utils.addNotification(action.name, ev.message, null, null);
                            });

                            break;
                        }

                        $scope.$evalAsync(function () {
                            changeStatus([__lastEventRightClicked], menuItemsIdsToStatuses[id]);
                        });
                        break;
                }
            });
        });

        $('.dhtmlxMenu_dhx_skyblue_SubLevelArea_Polygon').mouseover(function () {
            scheduler.dhtmlXTooltip.hide();
        });

        // ------------------------------ context menu end ------------------------------

        // ------------------------------ Multi Select Context Menu ---------------------


        __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 1, 'flag', utils.getSVGIconHTML(lsdIcons.flag) + customLabels.Flag, false);
        __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 2, 'unflag', "<span class='emptyFlag'>" + utils.getSVGIconHTML(lsdIcons.flag) + "</span>" + customLabels.Unflag, false);
        __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 3, 'reschedule', utils.getSVGIconHTML(lsdIcons.calendar) + customLabels.Reschedule, false);

        // add support for rule checking (multi services selected)
        if (window.customPermissions.Enable_Check_Rules) {
            __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 12, 'validate', utils.getSVGIconHTML(lsdIcons.violation) + customLabels.check_rules_action_label, false);
        }

        if (!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Unschedule || window.__gantt.ignoreReadonlyGantt226) {
            __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 5, 'unschedule', utils.getSVGIconHTML(lsdIcons.na) + customLabels.Unschedule, false);
        }

        if (!window.customPermissions.ignoreReadonlyGantt226 && window.customPermissions.Show_Pin_Service || window.customPermissions.ignoreReadonlyGantt226) {
            __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 7, 'pin', utils.getSVGIconHTML(lsdIcons.pin) + customLabels.Pin, false);
            __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 8, 'unpin', "<span class='emptyFlag'>" + utils.getSVGIconHTML(lsdIcons.unpin) + "</span>" + customLabels.Unpin, false);
        }

        // add custom service actions
        utils.customActionsPromise.then(function () {

            var customServiceActions = utils.getCustomActions('gantt');

            customServiceActions.forEach(function (customAction, i) {

                if (customAction.icon) {
                    __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, i + 12, 'custom_' + i, utils.getSVGIconHTML(customAction.icon) + customAction.name.encodeHTML(), false);
                } else {
                    __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, i + 12, 'custom_' + i, customAction.name.encodeHTML(), false);
                }
            });
        });

        if (BundleService.isActive()) {

            if (utils.hasCustomPermission('Bulk_Bundle')) {
                __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 41, 'bundler', utils.getSVGIconHTML(BundleActions.Bundle.icon) + BundleActions.Bundle.label, false);
            }
            if (utils.hasCustomPermission('Bulk_Unbundle')) {
                __multiServicesContextMenu.addNewChild(__multiServicesContextMenu.topId, 42, 'unbundler', utils.getSVGIconHTML(BundleActions.Unbundle.icon) + BundleActions.Unbundle.label, false);
            }
        }

        __multiServicesContextMenu.attachEvent('onShow', function (id) {
            contextShown = true;
        });

        __multiServicesContextMenu.attachEvent('onHide', function (id) {
            contextShown = false;
        });

        __multiServicesContextMenu.attachEvent('onClick', function (id, zoneId, cas) {

            $scope.$evalAsync(function () {
                switch (id) {

                    case 'flag':
                        utils.safeApply($scope, function () {
                            MultiServiceSetFlag(true);
                        });

                        break;

                    case 'unflag':
                        utils.safeApply($scope, function () {
                            MultiServiceSetFlag(false);
                        });

                        break;

                    case 'bundler':
                        var bundleSelIds = $scope.selectedGanttServices.getSelected() || [];
                        var bundleSel = bundleSelIds.map(function (id) {
                            return scheduler._events[id];
                        });

                        BundleActions.Bundle.invoke(bundleSel, StateService.selectedPolicyId).then(function (res) {

                            unselectMultiSelected();
                        }, function (err) {});

                        break;

                    case 'unbundler':
                        var unbundleSelIds = $scope.selectedGanttServices.getSelected() || [];
                        var unbundleSel = unbundleSelIds.map(function (id) {
                            return scheduler._events[id];
                        });
                        BundleActions.Unbundle.invoke(unbundleSel, StateService.selectedPolicyId).then(function (res) {
                            unselectMultiSelected();
                        }, function (err) {});
                        break;

                    case 'reschedule':
                        bulkScheduleService.schedule($scope.selectedGanttServices.getSelected());
                        break;

                    case 'pin':

                        servicesService.changePin($scope.selectedGanttServices.getSelected(), true).then(function () {
                            return updateViewDebounced();
                        });
                        break;

                    case 'unpin':

                        servicesService.changePin($scope.selectedGanttServices.getSelected(), false).then(function () {
                            return updateViewDebounced();
                        });
                        break;

                    case 'unschedule':
                        unscheduleServices($scope.selectedGanttServices.getSelected());
                        break;

                    case 'validate':
                        servicesService.checkRules($scope.selectedGanttServices.getSelected()).then(servicesService.drawViolationsOnGantt);
                        break;

                    default:

                        if (id.indexOf('custom_') === 0) {

                            var actionIndex = parseInt(id.split('_')[1]),
                                servicesIds = $scope.selectedGanttServices.getSelected(),
                                action = utils.getCustomActions('gantt')[actionIndex];

                            if (action.visualforce) {

                                var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                                    endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                                GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);

                                break;
                            }

                            sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, $scope.selectedGanttServices.getSelected(), scheduler._min_date, scheduler._max_date).then(function (res) {

                                if (res) {
                                    utils.addNotification(action.name, res, null, null);
                                }
                            }).catch(function (ev) {
                                return utils.addNotification(action.name, ev.message, null, null);
                            });

                            break;
                        }

                        changeStatus($scope.selectedGanttServices.getSelected(), menuItemsIdsToStatuses[id]);
                        break;
                }
            });
        });

        function MultiServiceSetFlag(val) {
            for (var id in $scope.selectedGanttServices) {

                if (!$scope.selectedGanttServices[id]) continue;

                servicesService.flagged[id] = val;
            }

            updateViewDebounced();
        }

        // ------------------------------ Multi Select Context Menu End -----------------


        scheduler.config.readonly = true;
        $scope.ganttLocked = scheduler.config.readonly;
        $scope.lockGanttToggle = function () {

            // we are NOT ignoring CPs and user has NO permissions to lock the gantt, do nothing
            if (!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Gantt_Locker) {
                return;
            }

            scheduler.config.readonly = !scheduler.config.readonly;
            $scope.ganttLocked = scheduler.config.readonly;

            userSettingsManager.SetUserSettingsProperty('Lock_Gantt__c', $scope.ganttLocked);
        };

        $scope.unSelecteAllSkills = function () {
            for (var key in $scope.selectedSkills) {
                $scope.selectedSkills[key] = false;
            }
        };

        $scope.selectAllSkills = function () {
            for (var key in $scope.selectedSkills) {
                $scope.selectedSkills[key] = true;
            }
        };

        // get skills
        // SkillsService.promises.skills().then( skills => {
        //     $scope.skills = skills;
        // });

        $scope.getSkills = SkillsService.getSkills;

        scheduler.attachEvent('onYScaleClick', function (index, section, e) {

            e.stopPropagation();
            e.preventDefault();

            window.__lastResourceClicked = section;

            var classNames = ["resourceMenuBtn", "resourceMenuIcon"];
            for (var i = 0; i < classNames.length; i++) {
                if (e.target.classList && e.target.classList.contains(classNames[i]) || e.target.parentNode && e.target.parentNode.classList.contains(classNames[i])) {

                    ResourceSmallMenu.open(section.resourceId, section.key, e.target);
                    return;
                }
            }

            if (!section.children) {
                ResourceLightboxService.open(section.resourceId, section.key);
            }
        });

        scheduler.attachEvent("onBeforeTooltip", function (id) {

            setTimeout(function () {

                var dhtmlxTooltip = $('.dhtmlXTooltip');

                if (dhtmlxTooltip.length === 0) {
                    return;
                }

                if (dhtmlxTooltip.position().top < 0) {
                    dhtmlxTooltip.css('height', dhtmlxTooltip.height() + dhtmlxTooltip.position().top - 15 + 'px');
                } else if (dhtmlxTooltip.position().top > 15) {
                    dhtmlxTooltip.css('height', 'initial');
                }
            }, 400);

            return true;
        });

        // move entire gantt left or right by amount of current days displayed
        // e.g: current: 1/1 weekly -> move to 8/1 weekly
        // move direction: 1 - right, -1 left
        function moveEntireGantt() {
            var moveDirectoion = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;


            var daysDiff = Math.abs(scheduler._max_date.getTime() - scheduler._min_date.getTime());
            daysDiff = Math.ceil(daysDiff / (1000 * 3600 * 24)) * moveDirectoion;

            var newDate = new Date(scheduler._min_date);
            newDate.setDate(newDate.getDate() + daysDiff);

            scheduler.setCurrentView(newDate, scheduler._mode);
        }

        // key press events
        $scope.$on('keypress', function (event, e) {

            $('#MonthlyViewTooltip').remove();

            if (StateService.isLightboxOpened()) return;

            // check if there is an input in focus
            if ($('*:focus').is('textarea, input')) return;

            switch (e.which) {

                // ENTER - open service (if selected)
                case 13:
                    if (scheduler._select_id !== '' && scheduler._select_id && scheduler.getEvent(scheduler._select_id).type === 'service') {
                        servicesService.recentlyUsed[scheduler._selected_id] = true;
                        ServiceAppointmentLightboxService.open(scheduler._select_id);
                    }
                    break;

                // left arrow
                case 37:

                    if (e.shiftKey) {
                        moveEntireGantt(-1);
                        $scope.changeDatesByArrows();
                    } else {
                        $('.dhx_cal_prev_button').click();
                    }

                    break;

                // up arrow:
                case 38:
                    var topScroll = $('.dhx_cal_data').scrollTop();
                    $('.dhx_cal_data').scrollTop(topScroll - 30);
                    break;

                // right arrow
                case 39:

                    if (e.shiftKey) {
                        moveEntireGantt();
                        $scope.changeDatesByArrows();
                    } else {
                        $('.dhx_cal_next_button').click();
                    }

                    break;

                // down arrow:
                case 40:
                    topScroll = $('.dhx_cal_data').scrollTop();
                    $('.dhx_cal_data').scrollTop(topScroll + 30);
                    break;

                // W - open external (work order / woli)
                case 87:
                    if (scheduler._select_id !== '' && scheduler._select_id && scheduler.getEvent(scheduler._select_id).type === 'service' && scheduler.getEvent(scheduler._select_id).parentRecord) {

                        if ($scope.isInConsole()) {
                            sforce.console.generateConsoleUrl(['/' + scheduler._events[scheduler._select_id].parentRecord], function (result) {
                                if (result.success) sforce.console.openConsoleUrl(null, result.consoleUrl, true);else {
                                    utils.openLightningPrimaryTab(scheduler._events[scheduler._select_id].parentRecord);
                                }
                            });
                        } else {
                            window.open('../' + scheduler._events[scheduler._select_id].parentRecord);
                        }
                    }

                    break;

                // S - open external (service appointment)
                case 83:
                    if (scheduler._select_id !== '' && scheduler._select_id && scheduler.getEvent(scheduler._select_id).type === 'service' && !scheduler.getEvent(scheduler._select_id).isDummy) {

                        if ($scope.isInConsole()) {
                            sforce.console.generateConsoleUrl(['/' + scheduler._select_id], function (result) {
                                if (result.success) sforce.console.openConsoleUrl(null, result.consoleUrl, true);else {
                                    utils.openLightningPrimaryTab(scheduler._select_id);
                                }
                            });
                        } else {
                            window.open('../' + scheduler._select_id);
                        }
                    }

                    break;

                // T - jump to today
                case 84:
                    $scope.jumpToToday();
                    break;

                // F - Flag/unflag selected
                case 70:
                    if ($scope.selectedGanttServices.getSelected().length === 1) {
                        if (scheduler._select_id !== '' && scheduler._select_id && scheduler.getEvent(scheduler._select_id).type === 'service') {
                            if (servicesService.flagged[scheduler._select_id]) {
                                servicesService.flagged[scheduler._select_id] = false;
                                scheduler.updateEvent(scheduler._select_id);
                            } else {
                                servicesService.flagged[scheduler._select_id] = true;
                                scheduler.updateEvent(scheduler._select_id);
                            }
                        }
                    }

                    break;

                // 0 - In Day timeline
                case 48:
                    $scope.changeTimeline(0);
                    break;

                // 0NUMPAD - daily timeline
                case 96:
                    $scope.changeTimeline(0);
                    break;

                // 1 - daily timeline
                case 49:
                    $scope.changeTimeline(1);
                    break;

                // 1NUMPAD - daily timeline
                case 97:
                    $scope.changeTimeline(1);
                    break;

                // 2 - 2days timeline
                case 50:
                    $scope.changeTimeline(2);
                    break;

                // 2NUMPAD - 2days timeline
                case 98:
                    $scope.changeTimeline(2);
                    break;

                // 3 - 3days timeline
                case 51:
                    $scope.changeTimeline(3);
                    break;

                // 3NUMPAD - 3days timeline
                case 99:
                    $scope.changeTimeline(3);
                    break;

                // 7 - weekly timeline
                case 55:
                    $scope.changeTimeline(7);
                    break;

                // mdt
                case 77:
                    utils.hasCustomPermission('MDT_View') && !utils.hasCustomPermission('Longterm_View') && $scope.changeTimeline(35);
                    break;

                // Utilization
                case 85:
                    utils.hasCustomPermission('Monthly_Utilization') && monthlyViewSettings.isMonthlyAvailable && $scope.changeTimeline(30);
                    break;

                // 7NUMPAD - weekly timeline
                case 103:
                    $scope.changeTimeline(7);
                    break;
            }
        });

        $scope.changeTimeline = function (timeline) {

            var currentDate = scheduler._min_date,
                oldDate = scheduler._max_date,
                newView = void 0;

            switch (timeline) {

                case 0:
                    newView = 'ZoomLevel2';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.In_Day;
                    break;

                case 1:
                    newView = 'ZoomLevel3';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.Daily;
                    break;

                case 2:
                    newView = 'ZoomLevel4';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.X2_Days;
                    break;

                case 3:
                    newView = 'ZoomLevel5';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.X3_Days;
                    break;

                case 7:
                    newView = 'ZoomLevel6';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.Weekly;
                    break;

                case 14:
                    newView = 'ZoomLevel7';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.TwoWeeks;
                    break;

                case 30:
                    newView = 'MonthlyView';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.Utilization;
                    break;

                case 35:
                    newView = 'MTDView';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.MDTVIEW;
                    break;

                case 180:
                    newView = 'LongView';
                    if (newView === scheduler._mode) return;

                    $scope.timelineName = customLabels.LongView;
                    break;

            }

            scheduler.setCurrentView(currentDate, newView);
            $scope.changeDatesByArrows(oldDate);
        };

        function drawTimeNow() {

            // if the scheduler wasn't initalized yet, don't try to draw anything
            if (!scheduler._is_initialized() || !$scope.datalessMethods) return;

            for (var i = 0; i < $scope.nowTimespans.length; i++) {
                scheduler.deleteMarkedTimespan($scope.nowTimespans[i]);
            }

            //updateViewDebounced();
            $scope.nowTimespans.length = 0;

            var currentLocations = scheduler.serverList('resources'),
                businessHours = getMinAndMaxHoursToDisplay();

            for (var _i = 0; _i < currentLocations.length; _i++) {

                var nowLocal = new Date(),
                    now = new Date(nowLocal.valueOf() + nowLocal.getTimezoneOffset() * 60000);

                if (useLocationTimezone) {
                    now.setMinutes(now.getMinutes() + utils.getLocationOffset(now, currentLocations[_i].key));
                } else {
                    now = utils.convertDateBetweenTimeZones(now, "GMT", userTimeZone);
                }

                if (!(businessHours.min <= now.getHours() && now.getHours() < businessHours.max) || $scope.datalessMethods.isDateInsideWeekend(now) || scheduler._mode === 'MonthlyView') continue;

                var section = {};
                section[scheduler.getState().mode] = [];

                for (var j = 0; j < currentLocations[_i].children.length; j++) {
                    section[scheduler.getState().mode].push(currentLocations[_i].children[j].key);
                }

                $scope.nowTimespans.push(scheduler.addMarkedTimespan({
                    start_date: now,
                    end_date: scheduler.date.add(now, 1, 'minute'),
                    css: 'dhx_now_time dhx_matrix_now_time',
                    sections: section
                }));
            }
        }

        // draw red lines of  "now"
        setInterval(drawTimeNow, 1000 * 60 * 10);

        $scope.jumpToToday = function () {

            var today = new Date();
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0);
            today.setMilliseconds(0);

            scheduler.setCurrentView(today);

            $scope.changeDatesByArrows();
        };

        $rootScope.$on('afterShowEvent', function () {
            setTimeout(function () {
                $scope.changeDatesByArrows();
                drawTimeNow();
                updateViewDebounced();
            }, 800);
        });

        $scope.showOnMap = function (serviceId) {
            $rootScope.$broadcast('showServiceOnMap', serviceId);
            utils.safeApply($scope);
        };

        scheduler.attachEvent('onBeforeEventChanged', function (ev, e, is_new, original) {

            var sections = ev.resourceId.split('_');

            var optRequset = OptimizationRequestsService.isTerritoryHasInDayOptimizationInProgress(ev.start_date, ev.end_date, sections[1]);
            if (optRequset) {
                if (confirm(customLabels.In_Day_Optimization_In_Progress_Confirm) === false) {
                    return false;
                } else {

                    //check if policy has rollback
                    if (utils.getSchedulingPolicyObject(optRequset.policy)[fieldNames.SchedulingPolicy.Commit_Mode__c] === 'Rollback') {
                        OptimizationRequestsService.updateProgressStatus(optRequset.id, 'Aborted');
                    }
                }
            }

            var newstart = void 0,
                newend = void 0,
                oldstart = void 0,
                oldend = void 0;

            if (e.ctrlKey && !ev.isImmidietlyFollow) {
                servicesService.handleSnap(ev, e);
            }

            //if resource wasn't changed in drag - check if dragged minutes is above minimum drag setting
            if (ev.resourceId === original.resourceId) {
                newstart = ev.start_date.getTime(), newend = ev.end_date.getTime(), oldstart = original.start_date.getTime(), oldend = original.end_date.getTime();

                if (Math.abs((newstart - oldstart) / 1000 / 60) < minDragMinutes || Math.abs((newend - oldend) / 1000 / 60) < minDragMinutes) {
                    cachedDomElements.timesDragFix.hide();
                    return false;
                }
            } else {
                //resource was changed - cancel absence drag
                if (ev.type === 'na') return false;
            }

            if (StateService.areContractorsSupported()) {

                if (ev.type === 'service' && ResourcesAndTerritoriesService.getResources()[ev.getGanttResource()].isCapacityBased) {

                    for (var key in TimePhasedDataService.resourceCapacities()) {
                        var capacityObj = TimePhasedDataService.resourceCapacities()[key];
                        if (capacityObj.resource !== ResourcesAndTerritoriesService.getResources()[ev.getGanttResource()].id) continue;

                        if (ev.start.getTime() >= capacityObj.start_date.getTime() && ev.start.getTime() <= capacityObj.end_date.getTime()) {
                            ev.resourceBeforeDrag = original.resourceId;
                            ev.eventBeforeDrag = original;

                            // set gantt jumps
                            setMinutesForEventChanges(ev);

                            return true;
                        }
                    }

                    cachedDomElements.timesDragFix.hide();
                    alert(customLabels.serviceCantBeAssignedWithoutCapacity);
                    return false;
                }
            }

            __lastModifiedEvent = GanttService.copy(original);
            snapTo = e.ctrlKey;

            // set gantt jumps
            setMinutesForEventChanges(ev);

            // this is used to reduce the capacity of the right resource
            ev.resourceBeforeDrag = original.resourceId;
            ev.eventBeforeDrag = original;

            return true;
        });

        $scope.updateMonthlyKpi = function () {
            scheduler._mode === 'MonthlyView' && updateViewDebounced();
            saveUtilizationPropertiesDebounced();
        };

        var saveUtilizationPropertiesDebounced = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('Utilization_Properties__c', JSON.stringify($scope.capacityFields));
        }, 800);

        $scope.cancelCrewView = function () {
            $rootScope.crewViewActive = false;
            $scope.crewViewActive = false;
            TimePhasedDataService.isCrewViewActive = false;
        };

        // ************************************************************************************************************
        // ************************************************************************************************************
        // *********************************** NEW STUFF FOR NEW DATA MODEL STUFF *************************************
        // ************************************************************************************************************
        // ************************************************************************************************************

        // this will handle service appointments and absences to draw on the gantt when first loading and when moving between dates
        $rootScope.$on('gotNewTimePhasedObjects', function (broadcastEvent, timePhasedObjects) {
            servicesService.drawServicesAndAbsences(timePhasedObjects.serviceAppointments, timePhasedObjects.resourceAbsences, [], timePhasedObjects.resourceCapacities);
        });

        $rootScope.$on('timePhasedObjectsCheckRules', function (broadcastEvent, servicesIdsRetrivedFromServer) {

            // we are checking the check rules mode on the broadcast itself
            servicesService.checkRules(servicesIdsRetrivedFromServer).then(servicesService.drawViolationsOnGantt);
        });

        // unschedule services - if getting an array, send it. if getting true then send the selected array
        function unscheduleServices(servicesIdsArray) {

            if (!confirm(customLabels.are_you_sure_unschedule)) {
                return true;
            }

            // we will need this to check rules later on
            var resourcesIds = [],
                servicesToUnschedule = [];

            servicesIdsArray.forEach(function (id) {
                servicesToUnschedule.push(TimePhasedDataService.serviceAppointments()[id]);
                resourcesIds.push(TimePhasedDataService.serviceAppointments()[id].resource);
                servicesService.recentlyUsed[id] = true;
            });

            servicesService.unscheduleServices(servicesIdsArray, StateService.selectedPolicyId).then(function (resultObjects) {
                unselectMultiSelected();
                servicesService.drawServicesAndAbsences(resultObjects.services, resultObjects.absences);
                kpiCalculationsService.calculateKpis();
            }).catch(function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message || customLabels.user_is_not_allowed_to_perform_action);
            });
        }

        // dispatch services - if getting an array, send it. if getting true then send the selected array
        function changeStatus(servicesIdsArray, status) {

            if (status === SERVICE_STATUS.CANCELED && !confirm(customLabels.AreYouSureYouWantToCancel)) {
                return true;
            }

            // we will need this to check rules later on
            var resourcesIds = [],
                servicesToUnschedule = [];

            servicesIdsArray.forEach(function (id) {
                servicesToUnschedule.push(TimePhasedDataService.serviceAppointments()[id]);
                resourcesIds.push(TimePhasedDataService.serviceAppointments()[id].resource);
                servicesService.recentlyUsed[id] = true;
            });

            servicesService.changeStatus(servicesIdsArray, status).then(function (resultObjects) {
                unselectMultiSelected();
                servicesService.drawServicesAndAbsences(resultObjects.services);
            }).catch(function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message || customLabels.user_is_not_allowed_to_perform_action);
            });
        }

        function setMinutesForEventChanges(ev) {

            var currentMinutes = (ev.start_date.getMinutes() + ev.travelTo / 60) % 60,
                serviceLengthInMs = ev.type === 'na' ? ev.end - ev.start : ev.schedEndTime - ev.schedStartTime,
                nearDown = currentMinutes % serviceJumpsOnGantt,
                nearUp = serviceJumpsOnGantt - currentMinutes % serviceJumpsOnGantt;

            if (nearDown === 0) {
                return;
            }

            if (nearDown > nearUp) {
                ev.start_date = new Date(ev.start_date.getTime() + nearUp * 60 * 1000);
            } else {
                ev.start_date = new Date(ev.start_date.getTime() - nearDown * 60 * 1000);
            }

            // set end date (add travel from)
            ev.end_date = new Date(ev.start_date.getTime() + serviceLengthInMs + ev.travelFrom * 1000 + ev.travelTo * 1000);
            ev.schedStartTime = ev.start_date.getTime() + ev.travelTo * 1000;
            ev.schedEndTime = ev.end_date.getTime() - ev.travelFrom * 1000;
        }

        // dragging event (na/service) on the gantt
        scheduler.attachEvent('onEventChanged', function (id, ev) {

            // we can only drag services and NAs
            if (ev.type !== 'service' && ev.type !== 'na') {
                return;
            }

            utils.safeApply($scope, function () {

                // NA was moved
                if (ev.type === 'na') {

                    AbsencesService.saveChangesToAbsence(__lastModifiedEvent, ev, StateService.selectedPolicyId).then(function (parsedObjects) {
                        //servicesService.drawServicesAndAbsences(parsedObjects.services || [], parsedObjects.absences || []);
                    }).catch(function (err) {
                        console.warn('Couldn\'t update absence');
                        if (err[0].message) {
                            utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err[0].message);
                        } else {
                            utils.addNotification(customLabels.Action_Could_Not_Be_Performed, customLabels.user_is_not_allowed_to_perform_action);
                        }
                        scheduler.parse([err[1]], 'json');
                    });

                    return;
                }

                // update service
                servicesService.saveChangesToServiceAppointment(__lastModifiedEvent, ev).then(function (result) {
                    scheduler._select_id = ev.id;
                }).catch(function (err) {
                    console.warn('Couldn\'t update service. ' + err[2]);
                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err[2] || err[0].message.substr(err[0].message.indexOf(',') + 1) || customLabels.user_is_not_allowed_to_perform_action);
                    scheduler.parse([err[1]], 'json');
                });
            });
        });

        // finished with the slots panel
        // $scope.$on('GotSlotsEnded', function() {
        //     //$scope.searchEmployee = '';
        // });

        // jump to date from slots panel
        $scope.$on('JumpToDate', function (e, date) {
            scheduler.setCurrentView(date);
            $scope.changeDatesByArrows();
        });

        // when getting slots from the GetSlotsService
        $scope.$on('GotSlots', function (e, data) {

            var currentBusinessHours = getMinAndMaxHoursToDisplay();

            // filter business hours
            if (data.minDateOfCandidate.getHours() < currentBusinessHours.min || data.minDateOfCandidate.getHours() >= currentBusinessHours.max) {

                if (confirm(customLabels.confirmChangeBusinessHours)) {

                    if (data.minDateOfCandidate.getHours() < currentBusinessHours.min) $scope.businessHoursRange.start = data.minDateOfCandidate.getHours();else $scope.businessHoursRange.end = 24;

                    watchBusinessHours();
                }
            }
        });

        $scope.changeUtilizaionDays = function (add) {

            if (add === -1 && $scope.numberOfDaysInUtilizationView === 1) {
                return;
            }

            if (add === 1 && $scope.numberOfDaysInUtilizationView === 30) {
                return;
            }

            $scope.numberOfDaysInUtilizationView += add;

            $scope.daysInUtilizationChanged();
        };

        // number of days in utilization view changes
        $scope.daysInUtilizationChanged = function () {

            scheduler.matrix.MonthlyView.x_size = $scope.numberOfDaysInUtilizationView;

            // no need to debounce as the ng-model-option is debounced
            userSettingsManager.SetUserSettingsProperty('DaysInUtilizationView__c', $scope.numberOfDaysInUtilizationView);

            if (scheduler._mode === 'MonthlyView') {
                scheduler.updateView();
                $scope.updateGanttDates();
            }
        };

        $scope.getRowSizeClass = function () {
            return utils.ganttSettings.resourceRowHeight + '-css';
        };

        // controls the visibility of the gantt filter box
        $scope.filterVisibility = {
            hours: true,
            resources: false,
            skills: false,
            utilization: false,
            palettes: false
        };

        $scope.needToLoadSkills = true;
        $scope.needToLoadPalettes = true;
        $scope.werePalettesLoaded = GanttPalettesService.werePalettesLoaded;

        $scope.changeGanttFilterTab = function (tab) {

            if (tab === 'skills' && $scope.needToLoadSkills) {
                SkillsService.getSkillsFromSfdc().then(function () {
                    return $scope.needToLoadSkills = false;
                });
            }

            if (tab === 'palettes' && $scope.needToLoadPalettes && !GanttPalettesService.werePalettesLoaded()) {
                GanttPalettesService.getGanttPalettes(true).then(function () {
                    return $scope.needToLoadPalettes = false;
                });
            }

            for (var key in $scope.filterVisibility) {
                $scope.filterVisibility[key] = key === tab;
            }
        };

        // add popup effect to events after ShowOnGantt
        scheduler.attachEvent("onAfterEventDisplay", function (ev) {
            setTimeout(function () {
                ev.showEventPopupEffect = false;
                kpiCalculationsService.calculateKpis();
                $rootScope.$broadcast('afterShowEvent');
            }, 2500);
        });

        $scope.updateWorkingReosourcesFilter = _.debounce(function () {
            $scope.resourceFilterHelper.showWorkingResource = $scope.resourceFilters.showWorkingResource;
        }, 300);

        $rootScope.$on('flagService', function (event, id) {
            if (servicesService.flagged[id]) {
                servicesService.flagged[id] = !servicesService.flagged[id];
                scheduler.updateEvent(id);
            } else {
                servicesService.flagged[id] = true;
                scheduler.updateEvent(id);
            }
        });
    }]);
})();