'use strict';

(function () {

    bulkResultsService.$inject = ['$compile', '$rootScope', 'StateService', 'TimePhasedDataService', '$injector'];

    angular.module('serviceExpert').factory('bulkResultsService', bulkResultsService);

    function bulkResultsService($compile, $rootScope, StateService, TimePhasedDataService, $injector) {

        var servicesService = null;

        var $scope = null,
            minutes = [];

        for (var m = 0; m < 60; m++) {
            minutes.push(m);
        }
        //RTL support
        var isRtlDirection = StateService.isRtlDirection();

        // open the UI
        function open(results, labels) {

            servicesService = $injector.get('servicesService');

            // create new isolated scope
            $scope = $rootScope.$new(true);

            $scope.getServiceName = getServiceName;
            $scope.results = { success: [], failed: Object.keys(results.failedResults).length > 0 ? results.failedResults : null };
            $scope.labels = labels;
            $scope.toggleFlag = toggleFlag;
            $scope.isFlagged = isFlagged;

            for (var i = 0; i < results.services.length; i++) {
                if (!results.failedResults[results.services[i].Id]) {
                    $scope.results.success.push(results.services[i].Id);
                }
            }

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

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

        // toggle flag
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

        // close lightbox
        function closeLightbox() {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
        }

        // DOM element
        function generateTemplate() {

            return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer" id="BulkActionsLightbox" ng-class="{\'rtlDirection\': ' + isRtlDirection + ' }">\n\n                        <div class="lightboxHeaderContainer" id="UnschduleLightboxHeader">\n                            <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                <use xlink:href="' + lsdIcons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header">' + customLabels.BulkActionResults + '</h1>\n                        </div>\n\n                        <div class="resultsContainerOverflow">\n                            <div ng-show="results.success && results.success.length" class="lightboxResultContainer">\n    \n                                <div class="unscheduleTableTitle">{{labels.success}}</div>\n    \n                                <div ng-repeat="id in results.success" class="lightboxTableRow">\n                                    {{ getServiceName(id) }}\n                                    <div ng-click="toggleFlag(id)" class="bulkActionLightboxFlag">\n                                        <span ng-show="isFlagged(id)" title="' + customLabels.Unflag + '">' + customLabels.Unflag + '</span>\n                                        <span ng-show="!isFlagged(id)" title="' + customLabels.Flag + '">' + customLabels.Flag + '</span>\n                                    </div>\n                                </div>\n                            </div>\n    \n                            <div ng-show="results.failed && results.failed" class="lightboxResultContainer">\n                                <div class="unscheduleTableTitle">{{labels.fail}}</div>\n                                <div ng-repeat="(id, failedReason) in results.failed" class="lightboxTableRow">\n                                    <span class="BulkLightboxServiceName">{{ getServiceName(id) }}</span>\n                                    <span class="BulkResultLine">{{ failedReason.errorMessage }}</span>\n    \n                                    <div ng-click="toggleFlag(id)" class="bulkActionLightboxFlag">\n                                        <span ng-show="isFlagged(id)" title="' + customLabels.Unflag + '">' + customLabels.Unflag + '</span>\n                                        <span ng-show="!isFlagged(id)" title="' + customLabels.Flag + '">' + customLabels.Flag + '</span>\n                                    </div>\n    \n                                </div>\n                            </div>\n                        </div>\n                    </div>\n\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();