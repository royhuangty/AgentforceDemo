'use strict';

(function () {

    bulkScheduleResultsService.$inject = ['$compile', '$rootScope', 'StateService', 'TimePhasedDataService', '$injector'];

    angular.module('serviceExpert').factory('bulkScheduleResultsService', bulkScheduleResultsService);

    function bulkScheduleResultsService($compile, $rootScope, StateService, TimePhasedDataService, $injector) {

        var servicesService = null;
        //RTL support
        var isRtlDirection = StateService.isRtlDirection();

        // open the UI
        function open(results) {
            var $scope = null;

            servicesService = $injector.get('servicesService');

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // stuff
            $scope.isAdmin = false;

            if (window.userHasAdminPermissions == undefined) {

                sfdcService.callRemoteAction(RemoteActions.userHasAdminPermissions).then(function (res) {
                    if (res) window.userHasAdminPermissions = $scope.isAdmin = true;else window.userHasAdminPermissions = false;
                });
            } else {
                $scope.isAdmin = window.userHasAdminPermissions;
            }

            $scope.toggleFlag = toggleFlag;
            $scope.isFlagged = isFlagged;
            $scope.results = results;
            $scope.getService = getService;
            $scope.isError = isError;
            $scope.successfullyScheduled = 0;
            $scope.globalSelectedCount = Object.keys(results).length;
            $scope.generatePartialResult = function (p) {
                return customLabels.partialResults[p.Operation].replaceAll(p.Processed, p.Total);
            };

            $scope.replaceLabelsForSebas = function () {
                return customLabels.x_services_scheduled_of_y_here_are_results.replaceAll($scope.successfullyScheduled, $scope.globalSelectedCount);
            };

            // calculate scheduled and failures
            for (var key in results) {
                if (results[key].textResult === "scheduled") {
                    $scope.successfullyScheduled++;
                }
            };

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            // close the UI
            $scope.closeLightbox = closeLightbox;

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#BulkActionsLightbox').draggable({ containment: 'document', handle: '#UnschduleLightboxHeader' });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            angular.element('body').append(lightboxDomElement);
            lightboxDomElement.show();
            StateService.setLightBoxStatus(); // set lightbox state to open
        }

        function isError(o) {
            return angular.isObject(o);
        }

        // get service object
        function getService(id) {
            return TimePhasedDataService.serviceAppointments()[id];
        }

        // toggle flag
        function toggleFlag(id) {
            servicesService.flagged[id] = !servicesService.flagged[id];
        }

        // is flagged
        function isFlagged(id) {
            return servicesService.flagged[id];
        }

        // close lightbox
        function closeLightbox(scope) {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            scope.$destroy();
        }

        // DOM element
        function generateTemplate() {

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer" id="BulkActionsLightbox" ng-class="{\'rtlDirection\': ' + isRtlDirection + ' }">\n\n                        <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                            <svg ng-click="closeLightbox(this)" aria-hidden="true" class="slds-icon CloseLightbox">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n                            <h1 class="light-box-header">' + customLabels.BulkScheduleResults + '</h1>\n                        </div>\n\n                        <div style="padding:0 15px">\n                        \n                            <p>{{ replaceLabelsForSebas() }}</p>\n            \n                            <div id="ResultTableHeader">\n                                <span>' + customLabels.ID + '</span>\n                                <span id="ResultHeaderStart">' + customLabels.Start + '</span>\n                                <span>' + customLabels.Finish + '</span>\n                                <span id="ResultResourceHeader">' + customLabels.Resource + '</span>\n                            </div>\n            \n                            <div id="ScheduledResultsTable">\n                                <div ng-repeat="(id,res) in results" class="ScheduleResultRow">\n                                \n                                    <span class="scheduledResultColName">{{ getService(id).name }}</span>\n                                    <span class="scheduledResultDate" ng-if="res.textResult == \'scheduled\'">{{getService(id).start | amDateFormat:\'lll\'}}</span>\n                                    <span class="scheduledResultDate" ng-if="res.textResult == \'scheduled\'">{{getService(id).finish | amDateFormat:\'lll\'}}</span>\n                                    <span class="scheduledResultDate" ng-if="res.textResult == \'scheduled\'">{{getService(id).resourceName}}</span>\n                                    <span class="ScheduleResultUnscheduled" ng-if="isError(res)">{{ res.msg }}</span>\n                                    <!--<span class="ScheduleResultUnscheduled" ng-if="isError(res)">' + customLabels.NoCandidates + '</span>-->\n                                    <span class="ScheduleResultUnscheduled" ng-if="res.textResult == \'no candidates\'">' + customLabels.NoCandidates + '</span>\n                                    \n                                    <div ng-click="toggleFlag(id)" class="bulkActionLightboxFlag">\n                                        <span ng-show="isFlagged(id)" title="' + customLabels.Unflag + '">' + customLabels.Unflag + '</span>\n                                        <span ng-show="!isFlagged(id)" title="' + customLabels.Flag + '">' + customLabels.Flag + '</span>\n                                    </div>\n                                    \n                                    <div class="PartialResultsBulk" ng-show="res.partialResults.length > 0" ng-init="res.showDetails = false;">\n                                        <div>' + customLabels.particalCouldntProcessAll + ' <u ng-show="isAdmin" ng-click="res.showDetails = !res.showDetails">' + customLabels.ShowDetails + '</u></div>\n            \n                                        <div ng-show="res.showDetails">\n                                            <ul>\n                                                <li ng-repeat="partial in res.partialResults">\n                                                    {{ generatePartialResult(partial) }}\n                                                </li>\n                                            </ul>\n                                        </div>\n                                    </div>\n                                    \n                                </div>\n                            </div>\n                            \n                        </div>\n                    </div>\n\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();