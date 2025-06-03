'use strict';

/* Wrapping DHTMLX scheduler */

(function () {

    angular.module('serviceExpert').directive('dhxSchedulerOptiViewer', ['$rootScope', '$timeout', 'userSettingsManager', '$q', 'sfdcService', 'ResourcesAndTerritoriesService', 'FieldSetFieldsService', 'TimePhasedDataService', function ($rootScope, $timeout, userSettingsManager, $q, sfdcService, ResourcesAndTerritoriesService, FieldSetFieldsService, TimePhasedDataService) {
        return {

            restrict: 'C',
            transclude: true,
            template: '<div class="dhx_cal_navline" ng-transclude></div><div class="dhx_cal_header"></div><div class="dhx_cal_data"></div>',

            link: function link($scope, $element, $attrs) {

                // set global utils for gantt js
                window.utils = angular.element('#serviceExpertApp').injector().get('utils');

                var updateCollectionDebounced = _.debounce(function (collection) {
                    scheduler.updateCollection('resources', collection);
                }, 500);

                // watch for employees/resources
                $scope.$watch($attrs.resources, function (collection) {

                    if (folderJustToggled) {
                        folderJustToggled = false;
                        return;
                    }

                    updateCollectionDebounced(collection);
                    // scheduler.updateCollection('resources', collection);
                }, true);

                //styling for dhtmlx scheduler
                $element.addClass('dhx_cal_container');

                // config timeline views
                schedulerConfig.configTimelines();

                // scheduler configurations
                schedulerConfig.setConfigurations();

                // custom daily hours
                var GanttHourStart = userSettingsManager.GetUserSettingsProperty('Gantt_View_Start_Hour__c'),
                    GanttHourFinish = userSettingsManager.GetUserSettingsProperty('Gantt_View_Finish_Hour__c'),
                    RowHeight = userSettingsManager.GetUserSettingsProperty('Resource_Row_Height__c'),
                    CapacityType = userSettingsManager.GetUserSettingsProperty('View_Capacity_Type__c'),
                    includeWeekends = userSettingsManager.GetUserSettingsProperty('Include_Weekends__c'),
                    loadOnToday = userSettingsManager.GetUserSettingsProperty('Load_On_Today__c'),
                    absenceHeight = userSettingsManager.GetUserSettingsProperty('Absence_Overlap_Height__c');
                //     lockGantt = userSettingsManager.GetUserSettingsProperty('Lock_Gantt__c');


                // if ((!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Gantt_Locker) || window.__gantt.ignoreReadonlyGantt226) {
                //     lockGantt = true;
                // }


                // if (lockGantt !== null) {
                //     schedulerConfig.setReadOnly(lockGantt);
                // }

                if (RowHeight !== null) {
                    schedulerConfig.setRowHeights(RowHeight, false);
                }

                if (CapacityType !== null) {
                    setCapacityFilter(CapacityType);
                }

                if (GanttHourStart !== null && GanttHourFinish !== null) {
                    setHoursToDisplay(GanttHourStart, GanttHourFinish, includeWeekends);
                }

                $rootScope.policy = defaultPolicy;

                var readyToLoadCalendar = $q.all([ResourcesAndTerritoriesService.promises.territories(), ResourcesAndTerritoriesService.promises.resources(), FieldSetFieldsService.fieldsSetFields()]);
                //let readyToLoadCalendar = $q.all([ResourcesAndTerritoriesService.promises.territories(), ResourcesAndTerritoriesService.promises.resources()]);

                readyToLoadCalendar.then(function () {

                    // init scheduler
                    scheduler.init($element[0], new Date(), 'ZoomLevel3');

                    // save scope
                    $scope.scheduler = scheduler;

                    // attach events that doesn't require any data from the controller
                    $scope.datalessMethods = attchDatalessSchedulerEvents();

                    $timeout(function () {

                        if (loadOnToday) {
                            scheduler.setCurrentView(new Date());
                        }

                        $('#FirstTimeLoading').remove();
                        TimePhasedDataService.promises.initialStmsPhasedData.then(function () {
                            $('#FirstTimeLoading').remove();
                        });

                        $scope.getTimePhasedObjects().then(function () {
                            // $('#FirstTimeLoading').remove();
                        }).catch(function (ex) {
                            bootstrap.handleError(ex);
                        });

                        $rootScope.$broadcast('initCompleted');
                    }, 20);
                }).catch(function (err) {
                    console.log('err:' + err);
                });
            }
        };
    }]);
})();