'use strict';

(function () {

    optimizationIndicator.$inject = ['DeltaService', 'utils', 'RegisterService'];

    angular.module('serviceExpert').directive('optimizationIndicator', optimizationIndicator);

    function optimizationIndicator(DeltaService, utils, RegisterService) {

        function linkFunc(scope) {

            scope.optimizationRequests = {};
            scope.optRunning = 0;
            scope.optQueued = 0;

            scope.replaceText = function (labelName, string) {
                var label = customLabels[labelName];
                return label.replaceAll(string.toString());
            };

            RegisterService.register('optimizationRequests', function (optimizationRequests) {

                var runningOps = 0,
                    queuedOps = 0;

                for (var i = 0; i < optimizationRequests.length; i++) {
                    var parsedOp = new OptimizationRequest(optimizationRequests[i]);

                    if (parsedOp.status == 'Queued') queuedOps++;

                    if (parsedOp.status == 'In Progress') runningOps++;

                    if (scope.optimizationRequests[parsedOp.id] && parsedOp.status == 'Completed' && scope.optimizationRequests[parsedOp.id].status != 'Completed') {
                        utils.addNotification(customLabels.Optimization_Completed, customLabels.x_services_were_sched_out_of.replaceAll(parsedOp.scheduledAmount, parsedOp.objectToScheduled) + '.', function (id) {
                            utils.openSObjectLink('../' + id);
                        }, parsedOp.id);
                    }

                    if (scope.optimizationRequests[parsedOp.id] && parsedOp.status == 'Failed' && scope.optimizationRequests[parsedOp.id].status != 'Failed') {
                        utils.addNotification(customLabels.Optimization_Failed, customLabels.error_in_opt, function (id) {
                            utils.openSObjectLink('../' + id);
                        }, parsedOp.id);
                    }

                    scope.optimizationRequests[parsedOp.id] = parsedOp;
                }

                scope.optQueued = queuedOps;
                scope.optRunning = runningOps;
            });

            // DeltaService.register('optimizationRequests', optimizationRequests  => {

            //     let runningOps = 0,
            //         queuedOps = 0;

            //     for (let i = 0; i < optimizationRequests.length; i++) {
            //         var parsedOp = new OptimizationRequest(optimizationRequests[i]);

            //         if (parsedOp.status == 'Queued')
            //             queuedOps++;

            //         if (parsedOp.status == 'In Progress')
            //             runningOps++;

            //         if ((scope.optimizationRequests[parsedOp.id]) && (parsedOp.status == 'Completed') && (scope.optimizationRequests[parsedOp.id].status != 'Completed')) {
            //             utils.addNotification(customLabels.Optimization_Completed, customLabels.x_services_were_sched_out_of.replaceAll(parsedOp.scheduledAmount, parsedOp.objectToScheduled) + '.',
            //                 function (id) {
            //                     utils.openSObjectLink('../' + id);
            //                 }, parsedOp.id
            //             );
            //         }

            //         if ((scope.optimizationRequests[parsedOp.id]) && (parsedOp.status == 'Failed') && (scope.optimizationRequests[parsedOp.id].status != 'Failed')) {
            //             utils.addNotification(customLabels.Optimization_Failed,
            //                 customLabels.error_in_opt,
            //                 function (id) {
            //                     utils.openSObjectLink('../' + id);
            //                 }, parsedOp.id
            //             );
            //         }

            //         scope.optimizationRequests[parsedOp.id] = parsedOp;
            //     }

            //     scope.optQueued = queuedOps;
            //     scope.optRunning = runningOps;
            // });
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {},
            template: '\n                <div id="optInProgress" ng-show="optRunning">\n                    ' + customLabels.Optimization_in_progress + '\n\t            \t<span ng-show="optRunning > 1">{{ replaceText(\'XoptimizationRunning\',optRunning) }}</span>\n\t            \t<span ng-show="optQueued">{{ replaceText(\'XoptimizationQueued\',optQueued) }}</span>\n        \t\t</div>'
        };
    }
})();