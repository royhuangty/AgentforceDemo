'use strict';

(function () {

    angular.module('serviceExpert').directive('csOptimizationProgress', csOptimizationProgress);

    csOptimizationProgress.$inject = [];

    function csOptimizationProgress() {

        return {
            restrict: 'E', // element
            scope: {
                request: '=',
                apptCount: '@',
                progressStatus: '='
            },
            template: '<div class="opt-progress">\n                            <span class="opt-progress-preparing"></span>\n\n                            <div class="opt-progress-bar smart_in_progress">\n                                <span class="opt-progress-text"></span>\n                            </div>\n\n                        </div>',

            link: function link($scope, element, attrs) {

                if ($scope.request.type !== 'Global Optimization') return;

                var progressBarElement = angular.element(element[0].querySelector('.opt-progress-bar')),
                    progressBarText = angular.element(element[0].querySelector('.opt-progress-text')),
                    progressBarPrep = angular.element(element[0].querySelector('.opt-progress-preparing')),
                    optimizationSettings = __gantt[attrs.optType];

                if (!$scope.progressStatus[$scope.request.id]) {
                    $scope.progressStatus[$scope.request.id] = { 'status': $scope.request.status,
                        'objectToScheduled': $scope.request.objectToScheduled };
                }

                if (!$scope.progressStatus[$scope.request.id].objectToScheduled) initProgressBar();

                var requestWatch = $scope.$watchCollection('[request.objectToScheduled, request.status]', function (newVal, oldVal) {

                    //objects to schedule was just updated - start new progress bar
                    if (newVal[0] != "" && newVal[0] != null && newVal[0] != $scope.progressStatus[$scope.request.id].objectToScheduled) {

                        progressBarPrep.text('');

                        $scope.progressStatus[$scope.request.id].objectToScheduled = newVal[0];
                        updateProgress();
                    }

                    // gantt loaded now and opt request is in progress
                    else if (newVal[1] == 'In Progress' && newVal[0] != null && $scope.progressStatus[$scope.request.id].status == 'In Progress') {
                            progressBarPrep.text('');
                            updateProgress();
                        }

                    // completed
                    if (newVal[1] !== 'In Progress' && $scope.progressStatus[$scope.request.id].status == 'In Progress') {
                        $scope.progressStatus[$scope.request.id].status = newVal[1];

                        completeProgress();

                        //un register watch
                        requestWatch();
                    } else if ($scope.progressStatus[$scope.request.id].status == 'Completed') {
                        angular.element(element[0].querySelector('.opt-progress')).remove();

                        //un register watch
                        requestWatch();
                    }
                });

                function initProgressBar() {
                    progressBarElement.css('width', 0 + '%');
                    progressBarPrep.text(customLabels.PreparingData);
                }

                // set the progress-bar width when called
                function updateProgress() {

                    if (!$scope.progressStatus[$scope.request.id]['progressInterval']) {

                        var finalObjectsToSchedule = $scope.request.objectToScheduled;
                        var totalTime = optimizationSettings.maxRunTimeSingleService * finalObjectsToSchedule;
                        var secondsElapsed = new moment().diff(moment($scope.request.requestProgressStart), 'seconds');

                        //if our total runtime is bigger than maximum runtime for optimization - set the variables accordingly. 
                        if (totalTime >= optimizationSettings.maxRuntimeOverall) {
                            finalObjectsToSchedule = optimizationSettings.maxRuntimeOverall / optimizationSettings.maxRunTimeSingleService;
                            totalTime = optimizationSettings.maxRuntimeOverall;
                        }

                        var current_progress = secondsElapsed / totalTime * 100,
                            //percenage time passed since in progress started
                        second_progress = 7,
                            //trial and error got me to this number
                        progress = 0,
                            step = 90 / finalObjectsToSchedule,
                            //last 10% will never end until result returns from optimization
                        secondStep = 0.1; //second stage steps 


                        // gantt was loaded when progress par was already larger than 90%
                        if (secondsElapsed >= totalTime && $scope.request.status == 'In Progress') {
                            second_progress = 7 + (secondsElapsed - totalTime) / optimizationSettings.maxRunTimeSingleService * secondStep;
                            progress = 90;
                        }

                        $scope.progressStatus[$scope.request.id]['progressInterval'] = setInterval(function () {

                            if ($scope.request.status === 'Aborted' || $scope.request.status === 'Aborting') completeProgress();

                            current_progress += step;

                            if (current_progress > 90) current_progress = 90;

                            if (progress < 90) {
                                progress = current_progress;
                            } else if (progress >= 100) {
                                progress = 100;
                                clearInterval($scope.progressStatus[$scope.request.id]['progressInterval']);
                                delete $scope.progressStatus[$scope.request.id]['progressInterval'];
                            } else if (progress >= 90) {
                                second_progress += secondStep;
                                progress = Math.round(Math.atan(second_progress) / (Math.PI / 2) * 100 * 1000) / 1000;
                            }

                            // set the bar's width
                            progressBarElement.css('width', progress + '%');
                            progressBarText.text(progress.toFixed(2) + "%");;
                        }, optimizationSettings.maxRunTimeSingleService * 1000);
                    }
                }

                function completeProgress() {
                    clearInterval($scope.progressStatus[$scope.request.id]['progressInterval']);
                    delete $scope.progressStatus[$scope.request.id]['progressInterval'];
                }
            }
        };
    }
})();