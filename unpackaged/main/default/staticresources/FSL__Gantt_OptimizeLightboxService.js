'use strict';

(function () {

    optimizeLightboxService.$inject = ['$compile', '$rootScope', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'StateService', 'servicesService', 'utils', 'sfdcService'];

    angular.module('serviceExpert').factory('optimizeLightboxService', optimizeLightboxService);

    function optimizeLightboxService($compile, $rootScope, ResourcesAndTerritoriesService, userSettingsManager, StateService, servicesService, utils, sfdcService) {
        var $scope = null,
            minutes = [];

        for (var m = 0; m < 60; m++) {
            minutes.push(m);
        }

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

            // get filtered locations
            var filteredLocationsIds = userSettingsManager.GetUserSettingsProperty('locations');
            $scope.filteredLocations = filteredLocationsIds.map(function (id) {
                return ResourcesAndTerritoriesService.territories()[id];
            }).sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });;
            $scope.o2LocationsIds = $scope.filteredLocations.filter(function (location) {
                return location.o2Enabled;
            }).map(function (location) {
                return location.id;
            });
            $scope.displayStayScheduled = window.customPermissions.Keep_Scheduled && $scope.o2LocationsIds.length > 0;
            $scope.disableStayScheduled = $scope.o2LocationsIds.length !== $scope.filteredLocations.length;

            // some settings and initializations
            setDatesAndStuff();
            $scope.dateSelectFinishWidget = dateSelectFinishWidget;
            $scope.dateSelectStartWidget = dateSelectStartWidget;
            $scope.validateDatesStart = validateDatesStart;
            $scope.validateDatesEnd = validateDatesEnd;
            $scope.optimizeAllServices = 'all';
            $scope.runOptimizion = runOptimizion;
            $scope.selectedLocations = {};
            $scope.checkBoxFields = utils.checkBoxFields;
            $scope.optimizeSelectedFilter = userSettingsManager.GetUserSettingsProperty('Optimization_Request_Filter_Field__c') ? userSettingsManager.GetUserSettingsProperty('Optimization_Request_Filter_Field__c') : 'noFilter';
            $scope.optimizeSelectedBoolean = __gantt.bgo.stayScheduled === '' ? 'noFilter' : __gantt.bgo.stayScheduled;
            $scope.orphanServices = false;
            $scope.isInDayPolicy = isInDayPolicy;

            sfdcService.callRemoteAction(RemoteActions.getBooleanFieldsForOptimization, 'filter').then(function (result) {
                var arr = Object.entries(result);
                arr = arr.map(function (option) {
                    return { value: option[0], label: option[1] };
                });
                arr.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                $scope.booleanFieldsForSAFiltering = arr;
                var isOptimizeSelectedFilterInArray = $scope.booleanFieldsForSAFiltering.find(function (item) {
                    return item.value === $scope.optimizeSelectedFilter;
                }) !== undefined;
                if (!isOptimizeSelectedFilterInArray) {
                    $scope.optimizeSelectedFilter = 'noFilter';
                }
            }).catch(function (err) {
                console.log(err);
                $scope.booleanFieldsForSAFiltering = [{ value: 'noFilter', label: 'None' }];
            });

            sfdcService.callRemoteAction(RemoteActions.getBooleanFieldsForOptimization, 'stayScheduled').then(function (result) {
                var arr = Object.entries(result);
                arr = arr.map(function (option) {
                    return { value: option[0], label: option[1] };
                });
                arr.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                $scope.booleanFieldsForSAStayScheduled = arr;
            }).catch(function (err) {
                console.log(err);
                $scope.booleanFieldsForSAStayScheduled = [{ value: 'noFilter', label: 'None' }];
            });

            $scope.changePolicy = function () {
                if ($scope.selectedPolicy[fieldNames.SchedulingPolicy.DailyOptimization]) {
                    $scope.optimizeSelectedBoolean = __gantt.inday.stayScheduled === '' ? 'noFilter' : __gantt.inday.stayScheduled;
                } else {
                    $scope.optimizeSelectedBoolean = __gantt.bgo.stayScheduled === '' ? 'noFilter' : __gantt.bgo.stayScheduled;
                }
            };

            $scope.onSelectTerritory = function () {
                var selectedLocationsArr = [];
                for (var id in $scope.selectedLocations) {
                    if ($scope.selectedLocations[id]) {
                        selectedLocationsArr.push(id);
                    }
                }
                var o2SelectedLocations = selectedLocationsArr.filter(function (id) {
                    return $scope.o2LocationsIds.includes(id);
                });
                var oprhanServicesAndO2Services = $scope.orphanServices && o2SelectedLocations.length === selectedLocationsArr.length; //if orphan services? so the selected services are only o2
                if (oprhanServicesAndO2Services || selectedLocationsArr.length > 0 && o2SelectedLocations.length === selectedLocationsArr.length) {
                    // all the selected territories are o2
                    $scope.disableStayScheduled = false;
                } else {
                    $scope.disableStayScheduled = true;
                }
            };

            // set policies
            $scope.policyOptions = StateService.policies;
            $scope.selectedPolicy = $scope.policyOptions[0];
            $scope.changePolicy();

            for (var i = 0; i < StateService.policies.length; i++) {
                if (StateService.policies[i].Id === StateService.selectedPolicyId) {
                    $scope.selectedPolicy = StateService.policies[i];
                    break;
                }
            }

            if ($scope.selectedPolicy[fieldNames.SchedulingPolicy.DailyOptimization]) {
                $scope.optimizeSelectedBoolean = __gantt.inday.stayScheduled === '' ? 'noFilter' : __gantt.inday.stayScheduled;
            }

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
            lightboxDomElement.children().find('input[type=checkbox]').focus();
        }

        // close lightbox
        function closeLightbox() {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
        }

        // select date widget (finish date)
        function dateSelectFinishWidget(position) {

            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {

                scheduler.renderCalendar({
                    position: position,
                    date: new Date($scope.actionFinish),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        var newDate = new Date(date);
                        newDate.setMinutes(parseInt($scope.endMinutes));
                        newDate.setHours(parseInt($scope.endHour));

                        if (newDate < $scope.actionStart) {
                            alert(customLabels.finishAfterStart);
                        } else {
                            $scope.actionFinish = newDate;
                        }

                        scheduler.destroyCalendar();
                        $scope.$apply();
                    }
                });
            }
        }

        // select date widget (start date)
        function dateSelectStartWidget(position) {

            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {

                scheduler.renderCalendar({
                    position: position,
                    date: new Date($scope.actionStart),
                    navigation: true,
                    handler: function handler(date, calendar) {
                        var newDate = new Date(date);
                        newDate.setMinutes(parseInt($scope.startMinutes));
                        newDate.setHours(parseInt($scope.startHour));

                        if (newDate > $scope.actionFinish) {
                            alert(customLabels.startBeforeEnd);
                        } else {
                            $scope.actionStart = newDate;
                        }

                        scheduler.destroyCalendar();
                        $scope.$apply();
                    }
                });
            }
        }

        // validate start date
        function validateDatesStart() {
            var newDate = new Date($scope.actionStart);
            newDate.setMinutes(parseInt($scope.startMinutes));
            newDate.setHours(parseInt($scope.startHour));

            if (newDate >= $scope.actionFinish) {
                alert(customLabels.startBeforeEnd);
                $scope.startMinutes = $scope.actionStart.getMinutes();
                $scope.startHour = $scope.actionStart.getHours().toString();
            } else {
                $scope.actionStart = newDate;
            }
        }

        // validate end date
        function validateDatesEnd() {
            var newDate = new Date($scope.actionFinish);
            newDate.setMinutes(parseInt($scope.endMinutes));
            newDate.setHours(parseInt($scope.endHour));

            if (newDate <= $scope.actionStart) {
                alert(customLabels.finishAfterStart);
                $scope.endMinutes = $scope.actionFinish.getMinutes().toString();
                $scope.endHour = $scope.actionFinish.getHours().toString();
            } else {
                $scope.actionFinish = newDate;
            }
        }

        // set dates
        function setDatesAndStuff() {

            $scope.actionStart = new Date(scheduler.getState().min_date.getFullYear(), scheduler.getState().min_date.getMonth(), scheduler.getState().min_date.getDate(), 0, 0, 0);
            $scope.actionFinish = new Date(scheduler.getState().max_date.getFullYear(), scheduler.getState().max_date.getMonth(), scheduler.getState().max_date.getDate() - 1, 0, 0, 0);
            $scope.startHour = '0';
            $scope.endHour = '0';
            $scope.startMinutes = '0';
            $scope.endMinutes = '0';
        }

        // run unschedule
        function runOptimizion() {

            var ids = [],
                startDate = void 0,
                finishDate = void 0,
                filterField = void 0,
                optimizeAll = void 0,
                stayScheduledBooleanField = void 0;

            for (var id in $scope.selectedLocations) {
                $scope.selectedLocations[id] && ids.push(id);
            }

            if (ids.length === 0) {
                alert(customLabels.noLocationWasSelected);
                return;
            }

            // set dates
            startDate = $scope.actionStart;
            finishDate = $scope.actionFinish;
            finishDate.setDate(finishDate.getDate() + 1);

            // set filter by boolean
            filterField = $scope.optimizeSelectedFilter === 'noFilter' ? null : $scope.optimizeSelectedFilter;
            userSettingsManager.SetUserSettingsProperty('Optimization_Request_Filter_Field__c', filterField);

            // set stayscheduled by boolean
            stayScheduledBooleanField = $scope.optimizeSelectedBoolean === 'noFilter' ? __gantt.KeepAppointmentsScheduledNoneSelectValue : $scope.optimizeSelectedBoolean;

            // optimize all
            optimizeAll = $scope.optimizeAllServices === 'all';

            StateService.setBulkActionRunning();

            // run optimization
            sfdcService.callRemoteAction(RemoteActions.runOptimization, startDate, finishDate, ids, optimizeAll, $scope.orphanServices, $scope.selectedPolicy.Id, filterField, stayScheduledBooleanField).then(function (req_id) {
                if (!req_id) {
                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, customLabels.user_is_not_allowed_to_perform_action);
                } else {

                    sfdcService.callRemoteAction(RemoteActions.getRequestObject, req_id).then(function (req_obj) {
                        if (req_obj[fieldNames.Optimization_Request.Status__c] != customLabels.failed) {
                            utils.addNotification(customLabels.Optimization_Request_Sent, customLabels.Optimization_sent_details, function (id) {
                                utils.openSObjectLink('../' + id);
                            }, req_obj.Id);
                        } else {
                            utils.addNotification(customLabels.Optimization_Failed, customLabels.error_in_opt, function (id) {
                                utils.openSObjectLink('../' + id);
                            }, req_obj.Id);
                        }
                    });
                }
            }).catch(function (err) {
                console.warn('runOptimization failed :(');
                console.log(err);

                utils.addNotification(customLabels.Optimization_Failed, err.message);
            }).finally(function () {
                StateService.setBulkActionRunning(false);
            });

            $scope.closeLightbox();
        }

        function isInDayPolicy() {
            return $scope.selectedPolicy[fieldNames.SchedulingPolicy.DailyOptimization];
        }
        // DOM element
        function generateTemplate() {

            var dateIcon = '<svg aria-hidden="true" class="date-icon">\n                                <use xlink:href="' + lsdIcons.calendar + '"></use>\n                              </svg>';

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div id="BulkActionsLightbox" class="LightboxContainer OptimizationLightbox">\n\n                        <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                            <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n                            <h1 class="light-box-header optimization-light-box-header">' + customLabels.Optimize + '</h1>\n                        </div>\n\n                        <div class="lightboxContentContainerOptimization">\n\n                            <div class="field-container territories-field-container">\n                                    <label>\n                                    ' + customLabels.ServiceTerritoriesLabel + '\n                                    <cs-tooltip>' + customLabels.ServiceTerritoryTooltip + '</cs-tooltip>\n                                    </label> \n                                    <multi-dropdown options="filteredLocations" type="territories"></multi-select-dropdown>\n                            </div>\n\n                            <div class="bulkOptimizeOptions bulkOptimizeOptionsOptimization">\n                                <div class="dates-container">\n                                    <div class="field-container">\n                                        <label>' + customLabels.StartDate + '</label>\n                                        <label id="bulkStartOptimize" class="bulkDatePickerOptimization" ng-click="dateSelectStartWidget(\'bulkStartOptimize\')" ng-bind="actionStart | amDateFormat:\'ll\'"></label>\n                                        ' + dateIcon + '\n                                    </div>\n                                    <div class="field-container">\n                                        <label>' + customLabels.EndDateOptimization + '</label>\n                                        <label id="bulkFinishOptimize" class="bulkDatePickerOptimization" ng-click="dateSelectFinishWidget(\'bulkFinishOptimize\')" ng-bind="actionFinish | amDateFormat:\'ll\'"></label>\n                                        ' + dateIcon + '\n                                    </div>\n                                </div>\n\n                                <div class="field-container">\n                                    <label>' + customLabels.SAIncludedForOptimization + '</label>\n                                    <label>\n                                        <input type="radio" ng-model="optimizeAllServices" name="serviceOption" value="unscheduled">\n                                        ' + customLabels.OnlyUnscheduled + '\n                                    </label>\n                                    <label>\n                                        <input type="radio" ng-model="optimizeAllServices" name="serviceOption" value="all">\n                                        ' + customLabels.BothScheduledAndUnscheduled + '\n                                    </label>\n                                </div>\n\n                                <div class="field-container">\n                                    <label>' + customLabels.SelectOptimizationPolicy + '</label>\n                                    <select class="select-optimization-input" ng-model="selectedPolicy" title="{{selectedPolicy.Name}}" ng-change="changePolicy()" ng-options="policy.Name for policy in policyOptions"></select>\n                                </div>\n\n                                <div class="field-container">\n                                    <label>\n                                        ' + customLabels.FilterSABy + '\n                                        <cs-tooltip>' + customLabels.FilterTooltip + '</cs-tooltip>\n                                    </label>\n                                    <select ng-model="optimizeSelectedFilter" class="select-optimization-input">\n                                        <option ng-repeat="option in booleanFieldsForSAFiltering" value="{{option.value}}" ng-bind="option.label"></option>\n                                        <option value="noFilter">' + customLabels.IncludeAllTypes + '</option>\n\t\t\t\t\t\t\t\t    </select>\n                                </div>\n\n                                <div class="field-container" ng-show="displayStayScheduled">\n                                    <label>\n                                        ' + customLabels.KeepTheseAppointmentsScheduled + '\n                                        <cs-tooltip>' + customLabels.KeepScheduledTootltip + '</cs-tooltip>\n                                    </label>\n                                    <select ng-disabled="disableStayScheduled" ng-model="optimizeSelectedBoolean" ng-class="{\'select-optimization-input-disabled\': disableStayScheduled === true}" class="select-optimization-input">\n                                        <option ng-repeat="option in booleanFieldsForSAStayScheduled" value="{{option.value}}" ng-bind="option.label"></option>\n                                        <option value="noFilter">' + customLabels.None + '</option>\n\t\t\t\t\t\t\t\t    </select>\n                                </div>\n\n\n                                <div class="inday-policy-selected" ng-show="isInDayPolicy()">' + customLabels.In_Day_Policy_Selected + '</div>\n                            </div>\n\n                        </div>\n\n                        <div class="lightboxControllers">\n                            <button class="lightboxSaveButton" ng-click="runOptimizion()">' + customLabels.Optimize + '</button>\n                        </div>\n\n\n                    </div>\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();