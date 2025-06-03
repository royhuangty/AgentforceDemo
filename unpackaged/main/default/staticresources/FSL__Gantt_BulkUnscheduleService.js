'use strict';

(function () {

    bulkUnscheduleService.$inject = ['$compile', '$rootScope', 'ResourcesAndTerritoriesService', 'ServiceSelectorService', 'userSettingsManager', 'StateService', 'servicesService', 'TimePhasedDataService', 'kpiCalculationsService'];

    angular.module('serviceExpert').factory('bulkUnscheduleService', bulkUnscheduleService);

    function bulkUnscheduleService($compile, $rootScope, ResourcesAndTerritoriesService, ServiceSelectorService, userSettingsManager, StateService, servicesService, TimePhasedDataService, kpiCalculationsService) {

        var $scope = null,
            minutes = [];

        for (var m = 0; m < 60; m++) {
            minutes.push(m);
        }
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

            // get filtered locations
            var filteredLocationsIds = userSettingsManager.GetUserSettingsProperty('locations');
            $scope.filteredLocations = filteredLocationsIds.map(function (id) {
                return ResourcesAndTerritoriesService.territories()[id];
            });

            // count selected services
            $scope.selectedCount = ServiceSelectorService.countSelectedServices();

            // contractor support
            $scope.contractorSupport = StateService.areContractorsSupported();

            // some settings and initializations
            setDatesAndStuff();
            $scope.dateSelectFinishWidget = dateSelectFinishWidget;
            $scope.dateSelectStartWidget = dateSelectStartWidget;
            $scope.validateDatesStart = validateDatesStart;
            $scope.validateDatesEnd = validateDatesEnd;
            $scope.targetServices = $scope.selectedCount == 0 ? 'locations' : 'selectedServices';
            $scope.bulkState = 'form';
            $scope.bulkUnschedule = bulkUnschedule;
            $scope.results = {};
            $scope.toggleFlag = toggleFlag;
            $scope.isFlagged = isFlagged;
            $scope.getServiceName = getServiceName;
            $scope.selectedLocations = {};
            $scope.nothingToUnschedule = false;
            $scope.isAmpm = isAMPM ? 'ampm' : '24';
            $scope.exception = null;

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#UnschduleLightbox').draggable({ containment: 'document', handle: '#UnschduleLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            // close the UI
            $scope.closeLightbox = closeLightbox;

            $scope.getCustomLabel = function (label) {
                return customLabels[label];
            };

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

            if ($scope.bulkState === 'running') {
                return;
            }

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
            $scope.minutes = minutes;
            $scope.hours24 = [24, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
            $scope.actionStart = new Date(scheduler.getState().min_date.getFullYear(), scheduler.getState().min_date.getMonth(), scheduler.getState().min_date.getDate(), 0, 0, 0);
            $scope.actionFinish = new Date(scheduler.getState().max_date.getFullYear(), scheduler.getState().max_date.getMonth(), scheduler.getState().max_date.getDate(), 0, 0, 0);
            $scope.startHour = '0';
            $scope.endHour = '0';
            $scope.startMinutes = '0';
            $scope.endMinutes = '0';
        }

        // flag
        function toggleFlag(id) {
            servicesService.flagged[id] = !servicesService.flagged[id];
        }

        // is flagged
        function isFlagged(id) {
            return servicesService.flagged[id];
        }

        // get service name
        function getServiceName(id) {
            return TimePhasedDataService.serviceAppointments()[id].name;
        }

        // run unschedule
        function bulkUnschedule() {

            var ids = [],
                startDate = void 0,
                finishDate = void 0;

            // by locations
            if ($scope.targetServices === 'locations') {
                startDate = $scope.actionStart;
                finishDate = $scope.actionFinish;

                startDate.setHours($scope.startHour);
                startDate.setMinutes($scope.startMinutes);

                finishDate.setHours($scope.endHour);
                finishDate.setMinutes($scope.endMinutes);

                for (var id in $scope.selectedLocations) {
                    $scope.selectedLocations[id] && ids.push(id);
                }

                if (ids.length === 0) {
                    alert(customLabels.noLocationWasSelected);
                    return;
                }
            }

            // by services ids
            else {
                    ids = ServiceSelectorService.getSelected();
                }

            StateService.setBulkActionRunning();
            $scope.bulkState = 'running';

            // if start and finish are defined, we will unschedule by service ids, otherwise location ids + range
            servicesService.unscheduleServices(ids, StateService.selectedPolicyId, startDate, finishDate).then(function (resultObjects) {

                if (resultObjects.nothingToUnschedule) {
                    $scope.nothingToUnschedule = true;
                    return;
                }

                servicesService.drawServicesAndAbsences(resultObjects.services, resultObjects.absences, [], resultObjects.capacities);

                $scope.results.unscheduled = [];

                ids = $scope.targetServices === 'locations' ? resultObjects.services.map(function (s) {
                    return s.id;
                }) : ids;

                for (var i = 0; i < ids.length; i++) {
                    if (!TimePhasedDataService.serviceAppointments()[ids[i]].isScheduled()) $scope.results.unscheduled.push(TimePhasedDataService.serviceAppointments()[ids[i]]);
                }

                $scope.results.failed = Object.keys(resultObjects.failedResults).length > 0 ? resultObjects.failedResults : null;
            }).catch(function (err) {
                console.warn('bulk unschedule failed :(');
                console.log(err);
                $scope.exception = err;
            }).finally(function () {
                StateService.setBulkActionRunning(false);
                $scope.bulkState = 'finished';
                kpiCalculationsService.calculateKpis();
            });
        }

        // DOM element
        function generateTemplate() {

            var datePickersDOM = customLabels.starting_from_x_until_y.replace('$0', '<u id="bulkStartUnschedule" class="bulkDatePicker" ng-click="dateSelectStartWidget(\'bulkStartUnschedule\')" ng-bind="actionStart | amDateFormat:\'ll\'"></u>\n\t\t\t\t\t\t\t<select class="selectOnBulk RightArrowForSelect bulkActionSelectLb" ng-change="validateDatesStart()" ng-model="startHour">\n\t\t\t\t\t\t\t    <option ng-if="h != 24" ng-repeat="h in hours24" value="{{h}}">{{ h | ampmOr24:isAmpm }}</option>\n                            </select>\n\t\t\t\t\t\t\t<select class="minutesSelect selectOnBulk RightArrowForSelect bulkActionSelectLb" ng-change="validateDatesStart()" ng-model="startMinutes">\n\t\t\t\t\t\t\t    <option ng-repeat="m in minutes" value="{{m}}" ng-bind="m"></option>\n\t\t\t\t\t\t\t</select>').replace('$1', '<u id="bulkFinishUnschedule" class="bulkDatePicker" ng-click="dateSelectFinishWidget(\'bulkFinishUnschedule\')" ng-bind="actionFinish | amDateFormat:\'ll\'"></u>\n\t\t\t\t\t\t\t<select class="selectOnBulk RightArrowForSelect bulkActionSelectLb bulkActionSelectLb" ng-change="validateDatesEnd()" ng-model="endHour">\n\t\t\t\t\t\t\t    <option ng-if="h != 24" ng-repeat="h in hours24" value="{{h}}">{{ h | ampmOr24:isAmpm }}</option>\n\t\t\t\t\t\t\t</select>\n\t\t\t\t\t\t\t<select class="minutesSelect selectOnBulk RightArrowForSelect bulkActionSelectLb" ng-change="validateDatesEnd()" ng-model="endMinutes">\n\t\t\t\t\t\t\t    <option ng-repeat="m in minutes" value="{{m}}" ng-bind="m"></option>\n\t\t\t\t\t\t\t</select>');

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer" id="UnschduleLightbox" ng-class="{\'rtlDirection\': ' + isRtlDirection + ' }">\n\n                    <div ng-show="bulkState != \'running\'" class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                        <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                            <use xlink:href="' + lsdIcons.close + '"></use>\n                        </svg>\n                        <h1 class="light-box-header">' + customLabels.BulkUnschedule + '</h1>\n                    </div>\n\n                    <div ng-show="bulkState == \'finished\'">\n\n\n                        <div ng-show="nothingToUnschedule" class="BulkLightNotFound">' + customLabels.NothingToUnschduleLightbox + '</div>\n\n                        <div class="resultsContainerOverflow class="unschedule_res_thingy_qa_halash">\n                        \n                            <div class="bulk-exception" ng-show="exception">\n                                <svg aria-hidden="true" class="slds-icon kpiIcon">\n                                    <use xlink:href="' + lsdIcons.violation + '"></use>\n                                </svg>\n                                {{ exception.message }} \n                            </div>\n                        \n                            <div ng-show="results.unscheduled.length" class="lightboxResultContainer">\n    \n                                <div class="unscheduleTableTitle">' + customLabels.SuccessfullyUnscheduled + '</div>\n    \n                                <div ng-repeat="unscheduled in results.unscheduled track by $index" class="lightboxTableRow">\n                                    {{ unscheduled.name }}\n                                    <div fsl-key-press tabindex="0" ng-click="toggleFlag(unscheduled.id)" class="bulkActionLightboxFlag">\n                                        <span ng-show="isFlagged(unscheduled.id)" title="' + customLabels.Unflag + '">' + customLabels.Unflag + '</span>\n                                        <span ng-show="!isFlagged(unscheduled.id)" title="' + customLabels.Flag + '">' + customLabels.Flag + '</span>\n                                    </div>\n                                </div>\n                            </div>\n    \n                            <div ng-show="results.failed" class="lightboxResultContainer">\n                                <div class="unscheduleTableTitle">' + customLabels.FailToUnschedule + '</div>\n                                <div ng-repeat="(id, failedReason) in results.failed track by $index" class="lightboxTableRow">\n                                    <span class="BulkLightboxServiceName">{{ getServiceName(id) }}</span>\n                                    <span class="BulkLightboxExplainCell">{{ failedReason.errorMessage }}</span>\n    \n                                    <div fsl-key-press tabindex="0" ng-click="toggleFlag(id)" class="bulkActionLightboxFlag">\n                                        <span ng-show="isFlagged(id)" title="' + customLabels.Unflag + '">' + customLabels.Unflag + '</span>\n                                        <span ng-show="!isFlagged(id)" title="' + customLabels.Flag + '">' + customLabels.Flag + '</span>\n                                    </div>\n    \n                                </div>\n                            </div>\n                        </div>\n\n                    </div>\n\n                    <div ng-show="bulkState == \'running\'" class="bulkActionRunningContainer">\n                        <img src="' + lsdIcons.spinnerGif + '" />\n                        ' + customLabels.UnschedulingPleaseWait + '\n                    </div>\n\n                    <div ng-show="bulkState == \'form\'">\n\n                        <div class="lightboxContentContainer">\n\n                                <p>' + customLabels.UnscheduleLightboxText + '</p>\n\n                                <div class="selectedTargetServices" ng-class="{ disabledBulkSection: selectedCount == 0 }">\n                                    <input ng-model="targetServices" type="radio" ng-disabled="selectedCount == 0" name="bulkUnscheduleRadio" id="bulkUnschduleBySelectedRadio" value="selectedServices" />\n                                    <label for="bulkUnschduleBySelectedRadio">' + customLabels.Selected_services + ' <span ng-show="selectedCount > 0">({{ getCustomLabel(\'x_selected\') | replaceLabels : selectedCount }})</span></label>\n                                </div>\n\n                                <div class="selectedTargetLocations">\n                                    <input ng-model="targetServices" type="radio" name="bulkUnscheduleRadio" id="bulkUnschduleByLocationRadio" value="locations" />\n                                    <label for="bulkUnschduleByLocationRadio">' + customLabels.ChooseLocationsLB + '</label>\n                                </div>\n\n                                <div id="bulkLocationNames">\n                                    <div ng-repeat="location in filteredLocations track by $index" class="BulkActionLocationName">\n                                        <input ng-model="selectedLocations[location.id]" type="checkbox" ng-disabled="targetServices != \'locations\'" id="bulkLocationUnschedule_{{ location.id }}"/>\n                                        <label title="{{ location.name }}" for="bulkLocationUnschedule_{{ location.id }}">{{location.name}}</label>\n                                    </div>\n                                </div>\n\n                                <div style="margin-top: 10px;" ng-show="!contractorSupport">\n                                    <input ng-model="includeContractorServices" ng-disabled="targetServices != \'locations\'" type="checkbox" id="BulkUnscheduleContractorServices" name="BulkUnscheduleContractorServices" />\n                                    <label for="BulkUnscheduleContractorServices">' + customLabels.Include_services_assigned_to_contractors + '</label>\n                                </div>\n\n                                <div class="bulkOptimizeOptions">\n                                    ' + datePickersDOM + '\n                                </div>\n                            </div>\n\n                            <div class="lightboxControllers">\n                                <button class="lightboxSaveButton" ng-click="bulkUnschedule()">' + customLabels.Unschedule + '</button>\n                            </div>\n\n                        </div>\n                    </div>\n\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();