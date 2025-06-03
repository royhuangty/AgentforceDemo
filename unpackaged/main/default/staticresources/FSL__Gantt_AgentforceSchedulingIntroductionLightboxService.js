'use strict';

(function () {

    AgentforceSchedulingIntroLightboxService.$inject = ['$q', '$compile', '$rootScope', 'userSettingsManager', 'StateService'];

    angular.module('serviceExpert').factory('AgentforceSchedulingIntroLightboxService', AgentforceSchedulingIntroLightboxService);

    function AgentforceSchedulingIntroLightboxService($q, $compile, $rootScope, userSettingsManager, StateService) {

        var $scope = null;
        var df = void 0;
        // open the UI
        function open() {

            // create new isolated scope
            $scope = $rootScope.$new(true);
            $scope.deffered = $q.defer();
            df = $scope.deffered;
            $scope.hideIntroModal = userSettingsManager.GetUserSettingsProperty('HideSchedulingAgentIntro__c');
            if ($scope.hideIntroModal) return;

            $scope.einstein = staticResources.ASAIntro_astro_png;
            $scope.applyIntroClicked = applyIntroClicked;
            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                    df.reject('closed');
                }
            });

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#ASALightbox').draggable({ containment: 'document', handle: '#HideIntroModalLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

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

            return $scope.deffered.promise;
        }
        // close lightbox
        function closeLightbox(applied) {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
        }
        function applyIntroClicked() {
            console.log("Entered applyIntroClicked. hideIntroModal is: " + $scope.hideIntroModal);
            userSettingsManager.SetUserSettingsProperty('HideSchedulingAgentIntro__c', $scope.hideIntroModal);
            closeLightbox(true);
        }
        // DOM element
        function generateTemplate() {
            return angular.element('\n            <div class="LightboxBlackContainer" id="ASAIntroPopup" >\n                <div id="ASALightbox" class="LightboxContainer introModalWindow " >\n                    <div class="lightboxHeaderContainer introHeaderContainer" id="HideIntroModalLightboxHeader">\n                        <svg ng-click="closeLightbox(false)" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                            <use xlink:href="' + lsdIcons.close + '"></use>\n                        </svg>\n                            <!-- Icon on the left side -->\n                         <svg aria-hidden="true" class="slds-icon introHeaderIcon">\n                            <use xlink:href="' + lsdIcons.sparkles + '"></use>\n                          </svg>\n                        <h1 class="introHeaderText">' + customLabels.ASAIntroModalTitle + '</h1>\n                    </div>\n                    \n                    \n                     <div class="lightboxContentContainer">\n                        <!-- First Row: The ASAIntroModalBodyText1 -->\n                        <div>\n                            <label class="onboardingText" >\n                                ' + customLabels.ASAIntroModalBodyText1 + '\n                            </label>\n                        </div>\n\n                    \n                        <!-- Second Row: Image on the left and Text (list) on the right -->\n                        <div class="slds-grid slds-m-top_large" style="display: flex;">\n                            <!-- Image on the left side -->\n                            <div class="slds-col slds-size_1-of-3 slds-p-right_large slds-flex slds-align-top">\n                                <img  class="einstein-dd-onboarding-image"  src={{einstein}} alt="' + customLabels.ASAIntroModalImageAlt + '" />\n                            </div>\n                    \n                            <!-- Text content on the right side -->\n                            <div class="slds-col slds-size_2-of-3 slds-text-align_left slds-p-left_large slds-flex slds-flex_column"  style="margin-top: 16px;">\n                                <span>\n                                    <label class="onboardingBoldText" >\n                                    ' + customLabels.ASAIntroModalBodyText2 + '</label>\n                                </span>\n                                <!--style="list-style-type: decimal; padding-left: 20px; line-height: 20px;"-->\n                                <ol class="onboardingText" >\n                                    <li>' + customLabels.ASAIntroModalBodyOl1 + '</li>\n                                    <li>' + customLabels.ASAIntroModalBodyOl2 + '</li>\n                                    <li>' + customLabels.ASAIntroModalBodyOl3 + '</li>\n                                </ol>\n                            </div>\n                        </div>\n                    </div>\n                    \n                     <div class="introFooterControllers ">\n                        <div class="hideIntroCheckbox">\n                              <input type="checkbox" ng-model="hideIntroModal">\n                               <label>' + customLabels.ASAIntroModalBodyCheckbox + '\n                            </label>\n                        </div>\n                        <div class="buttonContainer">\n                            <button class="introBtnCancel introBtnCancelText introButtonsText" ng-click="closeLightbox(false)">' + customLabels.ASAIntroModalCancel + '</button>\n                            <button class="introApplyBtn introButtonsText"  ng-click="applyIntroClicked()" ng-disabled="errorMode == 3" >\n                            <svg aria-hidden="true" class="introApplyBtnIcon">\n                                <use xlink:href="' + lsdIcons.sparkles + '"></use>\n                            </svg>\n    \n                            ' + customLabels.ASAIntroModalGetStarted + '</button> <!-- ng-disabled="nonSelected()"-->\n                        </div>\n                     </div>   \n            </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();