'use strict';

(function () {

    rdOptimizeLightboxService.$inject = ['$compile', '$rootScope', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'StateService', 'servicesService', 'utils', 'sfdcService'];

    angular.module('serviceExpert').factory('rdOptimizeLightboxService', rdOptimizeLightboxService);

    function rdOptimizeLightboxService($compile, $rootScope, ResourcesAndTerritoriesService, userSettingsManager, StateService, servicesService, utils, sfdcService) {
        var $scope = null;

        // open the UI
        function open(resourceId) {
            // create new isolated scope
            $scope = $rootScope.$new(true);

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            $scope.resource = ResourcesAndTerritoriesService.getResources()[resourceId];

            //get params from local storage
            var rsoLocalParams = JSON.parse(localStorage.getItem(sfdcUser + '_RSO')) || {};
            var selectedPoilicyId = StateService.selectedPolicyId;

            if (rsoLocalParams.selectedPolicy) {
                selectedPoilicyId = rsoLocalParams.selectedPolicy.Id;
            }

            // some settings and initializations
            setDatesAndStuff();
            $scope.dateSelectFinishWidget = dateSelectFinishWidget;
            $scope.dateSelectStartWidget = dateSelectStartWidget;
            $scope.validateDatesStart = validateDatesStart;
            $scope.validateDatesEnd = validateDatesEnd;

            //support old local storage (changed to checkbox - didnt change var name - notice)
            if (rsoLocalParams.optimizeAllServices === 'all') rsoLocalParams.optimizeOnlyUnscheduledServices = false;else if (rsoLocalParams.optimizeAllServices === 'unscheduled') rsoLocalParams.optimizeOnlyUnscheduledServices = true;

            $scope.optimizeOnlyUnscheduledServices = rsoLocalParams.optimizeOnlyUnscheduledServices || false;
            $scope.runOptimizion = runOptimizion;
            $scope.checkBoxFields = utils.checkBoxFields();
            $scope.optimizeSelectedFilter = rsoLocalParams.optimizeSelectedFilter || Object.keys($scope.checkBoxFields)[0];
            $scope.optimizeCalloutSelectedFilter = rsoLocalParams.optimizeCalloutSelectedFilter || Object.keys($scope.checkBoxFields)[0];
            $scope.scheduleOnlyResourceFutureJobs = rsoLocalParams.scheduleOnlyResourceFutureJobs != undefined ? rsoLocalParams.scheduleOnlyResourceFutureJobs : true;

            // set policies
            $scope.policyOptions = StateService.policies;

            //default to gantt selected policy
            for (var i = 0; i < StateService.policies.length; i++) {
                if (StateService.policies[i].Id === selectedPoilicyId) {
                    $scope.selectedPolicy = StateService.policies[i];
                    break;
                }
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
            // for In-Day view set the same date
            $scope.actionFinish = new Date(scheduler.getState().max_date.getFullYear(), scheduler.getState().max_date.getMonth(), scheduler.getState().min_date.getDate() === scheduler.getState().max_date.getDate() ? scheduler.getState().max_date.getDate() : scheduler.getState().max_date.getDate() - 1, 0, 0, 0);
            $scope.startHour = '0';
            $scope.endHour = '0';
            $scope.startMinutes = '0';
            $scope.endMinutes = '0';
        }

        // run unschedule
        function runOptimizion() {
            var startDate = void 0,
                finishDate = void 0,
                calloutFilterField = void 0,
                candidateFilterField = void 0,
                optimizeAll = void 0;

            // set dates - make a copy of the original dates so their value won't change
            startDate = new Date($scope.actionStart);
            finishDate = new Date($scope.actionFinish);
            finishDate.setDate(finishDate.getDate() + 1);

            // set filter by boolean
            candidateFilterField = $scope.optimizeSelectedFilter;
            calloutFilterField = $scope.optimizeCalloutSelectedFilter;

            // optimize all
            optimizeAll = !$scope.optimizeOnlyUnscheduledServices; // === 'all';

            //save params to local storage
            saveParamsToLocalStorage();
            StateService.setBulkActionRunning();

            // run optimization
            sfdcService.callRemoteAction(RemoteActions.runRDOptimization, $scope.resource.id, startDate, finishDate, optimizeAll, $scope.scheduleOnlyResourceFutureJobs, $scope.selectedPolicy.Id, candidateFilterField, calloutFilterField).then(function (req_id) {
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

        function saveParamsToLocalStorage() {
            var rsoParams = {
                optimizeOnlyUnscheduledServices: $scope.optimizeOnlyUnscheduledServices,
                scheduleOnlyResourceFutureJobs: $scope.scheduleOnlyResourceFutureJobs,
                selectedPolicy: $scope.selectedPolicy,
                optimizeSelectedFilter: $scope.optimizeSelectedFilter,
                optimizeCalloutSelectedFilter: $scope.optimizeCalloutSelectedFilter
            };

            localStorage.setItem(sfdcUser + '_RSO', JSON.stringify(rsoParams));
        }

        // DOM element
        function generateTemplate() {

            //      let datePickersDOM = customLabels.starting_from_x_until_y_including_z_services
            //          .replace('$0', `<u id="bulkStartOptimize" class="bulkDatePicker" ng-click="dateSelectStartWidget('bulkStartOptimize')" ng-bind="actionStart | amDateFormat:'ll'"></u>`)
            //          .replace('$1', `<u id="bulkFinishOptimize" class="bulkDatePicker" ng-click="dateSelectFinishWidget('bulkFinishOptimize')" ng-bind="actionFinish | amDateFormat:'ll'"></u>`)
            //          .replace('$2', `<select class="bulkStatusWidth RightArrowForSelect" ng-model="optimizeAllServices">
            // 	<option value="all">${customLabels.All}</option>
            // 	<option value="unscheduled">${customLabels.UnscheduledCapital}</option>
            // </select>`);

            var resourceOptimizationOptions = '<div id="ResourceToOptimize">' + customLabels.OptimizeTheFollowingResourceDay.replace('$0', '<span class="rdoResourceName">{{resource.name}}</span>').replace('$1', '<button id="bulkStartOptimize" class="bulkDatePicker" ng-click="dateSelectStartWidget(\'bulkStartOptimize\')" ng-bind="actionStart | amDateFormat:\'ll\'"></button>').replace('$2', '<button id="bulkFinishOptimize" class="bulkDatePicker" ng-click="dateSelectFinishWidget(\'bulkFinishOptimize\')" ng-bind="actionFinish | amDateFormat:\'ll\'"></button>') + '</div>';

            var onlySAsassignedTo = customLabels.OptimizeOnlySAsAssignedTo.replace('$0', '<span class="rdoResourceName" ng-class="{disabledonlyAssignTo: !scheduleOnlyResourceFutureJobs}">{{resource.name}}</span>');

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer rso-lb" id="BulkActionsLightbox">\n\n                        <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                            <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n                            <h1 class="light-box-header">' + customLabels.RDOptimize + '</h1>\n                        </div>\n\n\n                        <div class="lightboxContentContainer">\n\n                            <div class="bulkOptimizeOptions">\n                                ' + resourceOptimizationOptions + '\n                            </div>\n   \n                            <div class="bulkOptimizeOptionsContainer">\n                                <div class="bulkOptimizeOptions">\n                                    <div class="settingLabel">\n                                        ' + customLabels.Only_optimize_unscheduled_appointments + '\n                                        <cs-tooltip>' + customLabels.Only_optimize_unscheduled_appointments_tooltip + '</cs-tooltip>\n                                    </div>\n\n                                    <div class="optimizationOptionValue">\n                                        <input ng-model="optimizeOnlyUnscheduledServices" type="checkbox" name="optimizeAllServices" id="optimizeAllServices" />\n                                    </div>\n                                </div>\n\n                                <div class="bulkOptimizeOptions">\n                                    <div class="settingLabel">\n                                        ' + customLabels.SchedulingPolicyName + '\n                                        <cs-tooltip>' + customLabels.rso_scheduling_policy_tooltip + '</cs-tooltip>\n\n                                    </div>\n\n                                    <div class="optimizationOptionValue">\n                                        <select class="bulkStatusWidth RightArrowForSelect" ng-model="selectedPolicy" ng-change="changePolicy()" ng-options="policy.Name for policy in policyOptions">\n                                        </select>\n                                    </div>\n                                </div>\n\n                                <div class="bulkOptimizeOptions">\n                                    <div class="settingLabel">\n                                        ' + customLabels.OptimizeFilterText + '\n                                        <cs-tooltip>' + customLabels.rso_filter_services_by_tooltip + '</cs-tooltip>\n\n                                    </div>\n\n                                    <div class="optimizationOptionValue">\n                                        <select ng-model="optimizeSelectedFilter" class="bulkStatusWidth RightArrowForSelect">\n                                            <option ng-repeat="(fieldName, fieldLbl) in checkBoxFields" value="{{fieldName}}" ng-bind="fieldLbl"></option>\n                                        </select>\n                                    </div>\n                                </div>\n\n                                <div class="bulkOptimizeOptions">\n                                    <div class="settingLabel">\n                                        ' + customLabels.OptimizeKeepTheFollowingSAsScheduled + '\n                                        <cs-tooltip>' + customLabels.OptimizeKeepTheFollowingSAsScheduled_tooltip + '</cs-tooltip>\n                                    </div>\n\n                                    <div class="optimizationOptionValue">\n                                        <select ng-model="optimizeCalloutSelectedFilter" class="bulkStatusWidth RightArrowForSelect">\n                                            <option ng-repeat="(fieldName, fieldLbl) in checkBoxFields" value="{{fieldName}}" ng-bind="fieldLbl"></option>\n                                         </select>\n                                    </div>\n                                </div>\n\n                                <div class="bulkOptimizeOptions">\n                                    <div class="settingLabel" ng-class="{disabledonlyAssignTo: !scheduleOnlyResourceFutureJobs}">\n                                        ' + onlySAsassignedTo + '\n                                        <cs-tooltip>' + customLabels.OptimizeOnlySAsAssignedTo_tooltip + '</cs-tooltip>\n                                    </div>\n\n                                    <div class="optimizationOptionValue">\n                                        <input ng-model="scheduleOnlyResourceFutureJobs" type="checkbox" name="scheduleOnlyResourceFutureSa" id="scheduleOnlyResourceFutureSa" />\n                                    </div>\n                                </div>\n\n                            </div>\n\n                        </div>\n\n                        <div class="lightboxControllers">\n                            <button class="lightboxSaveButton" ng-click="runOptimizion()">' + customLabels.Optimize + '</button>\n                        </div>\n\n\n                    </div>\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();