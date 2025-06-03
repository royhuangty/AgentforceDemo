'use strict';

(function () {

    AbsenceLightboxService.$inject = ['$rootScope', 'TimePhasedDataService', '$sce', '$compile', 'utils', 'StateService', 'DeltaService'];

    angular.module('serviceExpert').factory('AbsenceLightboxService', AbsenceLightboxService);

    function AbsenceLightboxService($rootScope, TimePhasedDataService, $sce, $compile, utils, StateService, DeltaService) {

        // create a new scope
        var $scope = null;

        function open(id) {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // set needed parameters
            $scope.lightboxAbsence = TimePhasedDataService.resourceAbsences()[id];
            $scope.selectedTab = 'details';

            // page urls
            $scope.urls = {
                chatter: $sce.trustAsResourceUrl(customAbsenceChatterPage + '?id=' + id + '&isdtp=p1').toString(),
                details: $sce.trustAsResourceUrl(customAbsencePage + '?id=' + id).toString()
            };

            $scope.changeTab = changeTab;
            $scope.closeLightbox = closeLightbox;
            $scope.chatterAvailable = fieldTrackingEnabled.absence;
            $scope.openConsoleTab = utils.openConsoleTab;

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#AbsenceLightbox').draggable({ containment: 'document', handle: '#AbsenceLightboxHeader' });
            //angular.element('body').append(lightboxDomElement);

            // set lightbox to open
            StateService.setLightBoxStatus();

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            window.__updateGantt = updateGantt;

            // compile
            $compile(lightboxDomElement)($scope);

            utils.safeApply($scope, function () {
                angular.element('body').append(lightboxDomElement);
            });
        }

        function updateGantt() {

            // run only if streaming is disabled
            if (!StateService.getStreamingActiveState()) {

                // check rules if not "on demand" mode
                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.getDelta(shouldCheckRules);
            }
        }

        function closeLightbox() {
            window.__updateGantt = null;
            StateService.setLightBoxStatus(false);
            $scope.$destroy();
        }

        // change tabs on the absence lightbox
        function changeTab(tab) {
            if (tab !== $scope.selectedTab) {
                $scope.selectedTab = tab;
            }
        }

        function generateTemplate() {
            return angular.element('<div class="LightboxBlackContainer">\n                    <div class="LightboxContainer" id="AbsenceLightbox">\n\n                        <div class="lightboxHeaderContainer" id="AbsenceLightboxHeader">\n\n                            <svg fsl-key-press tabindex="0" ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n\n                            <h1 class="lightboxHeader">\n                                <i ng-show="lightboxAbsence.type == \'na\'">' + customLabels.NA + ':</i>\n                                <i ng-show="lightboxAbsence.type == \'break\'">' + customLabels.Break + ':</i>\n                                {{ lightboxAbsence.name }}\n                            </h1>\n\n                            <button fsl-tab-switch role="tab" ng-click="changeTab(\'details\')" ng-class="{lightboxSelectedTab: selectedTab == \'details\'}">\n                                ' + customLabels.Details + '\n                            </button>\n\n                            <button fsl-tab-switch role="tab" ng-show="chatterAvailable" ng-click="changeTab(\'chatter\')" ng-class="{lightboxSelectedTab: selectedTab == \'chatter\'}">\n                                ' + customLabels.Chatter + '\n                            </button>\n\n                            <div class="ExtendedForm">\n                                <a ng-click="openConsoleTab($event,lightboxAbsence.id)" target="_blank" href="../{{ lightboxAbsence.id }}" title="' + customLabels.ExtandedForm + '">\n                                    <svg aria-hidden="true" class="slds-icon openExternalIcon">\n                                        \u2028<use xlink:href="' + lsdIcons.external + '"></use>\n                                    \u2028</svg>\n                                </a>\n                            </div>\n                        </div>\n\n                        <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'details\'" ng-src="{{ urls.details }}"></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'chatter\'" ng-src="{{ urls.chatter }}" ng-if="chatterAvailable"></iframe>\n                        \n                        <div id="lightbox-loading-cover">\n                            <img src="' + lsdIcons.spinnerGif + '" />\n                            ' + customLabels.loading + '\n                        </div>\n\n                    </div>\n                </div>');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();