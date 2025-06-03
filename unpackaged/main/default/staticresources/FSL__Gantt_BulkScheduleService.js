'use strict';

(function () {

    bulkScheduleService.$inject = ['$q', '$compile', '$rootScope', 'servicesService', 'TimePhasedDataService', 'StateService', 'bulkScheduleResultsService', 'utils'];

    angular.module('serviceExpert').factory('bulkScheduleService', bulkScheduleService);

    function bulkScheduleService($q, $compile, $rootScope, servicesService, TimePhasedDataService, StateService, bulkScheduleResultsService, utils) {

        var $scope = null;

        // open the UI
        function init() {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // stuff
            $scope.isInConsole = StateService.isInConsole();
            $scope.actionName = 'Schedule';
            $scope.currentSchedulingIndex = 0;
            $scope.successfullyScheduled = 0;
            $scope.afterSchedulingServiceObjects = {};
            $scope.close = close;
            $scope.showResults = showResults;
            $scope.progressBarStyle = progressBarStyle;

            $scope.getLabel = function (label) {
                return customLabels[label];
            };

            // add to body
            var lightboxDomElement = generateTemplate();
            angular.element('body').append(lightboxDomElement);

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            lightboxDomElement.show();
        }

        function close() {
            $scope.$destroy();
        }

        function showResults() {
            bulkScheduleResultsService.open($scope.afterSchedulingServiceObjects);
            $scope.$destroy();
        }

        function progressBarStyle() {
            return { width: ($scope.currentSchedulingIndex + 1) / $scope.globalSelectedCount * 100 + '%' };
        };

        function schedule(servicesIds) {

            if (servicesIds.length === 0 || StateService.isScheduleRunning) {
                return;
            }

            // filter for 2nd service in immidietly follow (LS)
            servicesIds = servicesIds.filter(function (id) {
                var service = TimePhasedDataService.serviceAppointments()[id];
                return !(service.relatedService1 && service.isImmidietlyFollow && !service.isInO2Territory);
            });

            if (servicesIds.length === 0) {
                alert(window.customLabels.AllServicesAreFollowing);
                return;
            }

            if ($scope) {
                $scope.$destroy();
            }

            init();

            StateService.isScheduleRunning = true;

            $scope.globalSelectedCount = servicesIds.length;

            servicesService.sortServicesByPriority(servicesIds).then(function (sortedWrappers) {
                var promises = [];
                var servicesObjects = [];

                sortedWrappers.forEach(function (wrapper) {
                    servicesObjects.push(TimePhasedDataService.serviceAppointments()[wrapper.ServiceId]);
                });

                $scope.globalSelectedServiceObjects = servicesObjects;

                // creating promises
                for (var i = 0; i < $scope.globalSelectedCount; i++) {
                    var def = $q.defer();
                    def.promise.then(scheduleOneService);

                    promises.push(def);
                }

                promises[0].resolve(0);

                function scheduleOneService(index) {

                    StateService.schedulingRunningFor[servicesObjects[index].id] = true;

                    servicesService.autoScheduleService(servicesObjects[index].id, true).then(function (updatedObjects) {

                        // draw updates services/breaks
                        // servicesService.drawServicesAndAbsences(updatedObjects.services, updatedObjects.absences);

                        // old scheduled sum check
                        // if (TimePhasedDataService.serviceAppointments()[servicesObjects[index].id].isScheduled() && !TimePhasedDataService.serviceAppointments()[servicesObjects[index].id].violations) {
                        //     $scope.successfullyScheduled++;
                        // }


                        // CFSL-1581
                        servicesService.drawServicesAndAbsences(updatedObjects.services, updatedObjects.absences);

                        $scope.afterSchedulingServiceObjects[servicesObjects[index].id] = {};
                        $scope.afterSchedulingServiceObjects[servicesObjects[index].id].partialResults = updatedObjects.partialResults;

                        $scope.afterSchedulingServiceObjects[servicesObjects[index].id].textResult = 'no candidates';

                        updatedObjects.services.forEach(function (service) {
                            if (service.id === servicesObjects[index].id) {
                                $scope.afterSchedulingServiceObjects[servicesObjects[index].id].textResult = 'scheduled';
                                $scope.successfullyScheduled++;
                            }
                        });
                    }).catch(function (err) {
                        var exceptionObj = {};
                        exceptionObj.msg = err.message;
                        $scope.afterSchedulingServiceObjects[servicesObjects[index].id] = exceptionObj;
                    }).finally(function () {
                        $scope.currentSchedulingIndex++;
                        StateService.schedulingRunningFor[servicesObjects[index].id] = false;

                        if (index + 1 < $scope.globalSelectedCount) {
                            promises[index + 1].resolve(index + 1);
                        }

                        // check rules on everything, need to check performance
                        if (index + 1 === $scope.globalSelectedCount) {

                            var ids = [];
                            for (var key in scheduler._events) {
                                scheduler._events[key].type === 'service' && ids.push(key);
                            }

                            // check rules only if not "On Demand"
                            if (ids.length > 0) {
                                window.__gantt.checkRulesMode !== 'On Demand' && servicesService.checkRules(ids).then(servicesService.drawViolationsOnGantt);
                            }

                            StateService.isScheduleRunning = false;
                        }
                    });
                }
            });
        }

        // DOM element
        function generateTemplate() {

            return angular.element('\n            <div id="SchedulingInProgress" class="slideInProgressBox" ng-class="{SchedulingInProgressConsole: isInConsole}">\n\n\t\t\t\t<div ng-show="currentSchedulingIndex != globalSelectedCount">\n\t\t\t\t\t<i class="fa fa-spinner fa-spin"></i> ' + customLabels.Scheduling_Services + '\n\t\t\t\t\t<div class="ProgressBar">\n\t\t\t\t\t\t<div ng-style="progressBarStyle()"></div>\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<div ng-cloak class="ProgressBarLabel">{{ getLabel(\'Scheduling_service\') | replaceLabels : (currentSchedulingIndex+1) : globalSelectedCount }}</div>\n\t\t\t\t</div>\n\n\t\t\t\t<div ng-show="currentSchedulingIndex == globalSelectedCount">\n\t\t\t\t\t<i class="fa fa-check"></i> ' + customLabels.Scheduling_Complete + '\n\t\t\t\t\t<div ng-cloak class="HowManyWereScheduled">{{  getLabel(\'Scheduled_x_out_of_y\') | replaceLabels : successfullyScheduled : globalSelectedCount }}</div>\n\t\t\t\t\t<span ng-cloak class="InProgressAction" ng-click="close()">' + customLabels.Close + '</span>\n\t\t\t\t\t<span ng-cloak class="InProgressAction" ng-click="showResults()">' + customLabels.View_services + '</span>\n\t\t\t\t</div>\n\n\t\t\t</div>');
        }

        return {
            schedule: schedule
        };
    }
})();