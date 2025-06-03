'use strict';

(function () {

    GeneralLightbox.$inject = ['$rootScope', '$sce', '$compile', 'utils', 'StateService', 'DeltaService'];

    angular.module('serviceExpert').factory('GeneralLightbox', GeneralLightbox);

    function GeneralLightbox($rootScope, $sce, $compile, utils, StateService, DeltaService) {

        // create a new scope
        var $scope = null;

        // close lightbox from outside
        function closeLightboxFromOutside() {
            return $scope.closeLightbox();
        }

        var isValidOrigin = function isValidOrigin(eventUrl) {
            var windowArr = window.location.origin.split('.');
            var eventArr = eventUrl.split('.');

            return windowArr.at(-1) === eventArr.at(-1) && windowArr.at(-2) === eventArr.at(-2);
        };

        window.addEventListener("message", function (ev) {
            if (ev.data === 'closeLightbox' && isValidOrigin(ev.origin)) closeLightboxFromOutside();
        }, false);

        function open(title, url) {
            if ($scope) {
                return;
            }

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // page urls
            $scope.url = $sce.trustAsResourceUrl(url).toString();

            // support communities url
            if (__gantt.communityNetworkId) {
                $scope.url = $scope.url.replace('/apex/', '');
            }

            // custom namespace
            if (url.includes('SFSPWR')) {
                url = window.orgUrl + url.replace('c__SFSPWR.', 'SFSPWR__');
                $scope.url = $sce.trustAsResourceUrl(url);
            }

            $scope.title = title;
            $scope.closeLightbox = closeLightbox;

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#ResourceLightbox').draggable({ containment: 'document', handle: '#ResourceLightboxHeader' });
            lightboxDomElement.find('#ResourceLightbox').resizable({ minHeight: 560, minWidth: 940, maxWidth: 940, handles: "s" });
            angular.element('body').append(lightboxDomElement);

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

            // compile
            $compile(lightboxDomElement)($scope);

            utils.safeApply($scope);
        }

        function closeLightbox() {
            $scope.killWatch && $scope.killWatch();
            StateService.setLightBoxStatus(false);
            DeltaService.updateGantt();
            $scope.$destroy();
            $scope = null;
        }

        function generateTemplate() {
            return angular.element('<div class="LightboxBlackContainer ng-cloack">\n                    <div class="LightboxContainer ng-cloak" id="ResourceLightbox">\n\n                        <div class="lightboxHeaderContainer lightbox-general" id="ResourceLightboxHeader">\n                            <svg ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n                            \n                            <h1 class="light-box-header" ng-bind="title"></h1>\n                        </div>\n                        \n                        <iframe onLoad="removeLightboxLoading()" ng-src="{{ url }}" class="resourceLightboxIframe"></iframe>\n                        \n                        <div id="lightbox-loading-cover">\n                            <img src="' + lsdIcons.spinnerGif + '" />\n                            ' + customLabels.loading + '\n                        </div>\n\n                    </div>\n                </div>');
        }

        // This will be our factory
        return {
            open: open,
            closeLightboxFromOutside: closeLightboxFromOutside
        };
    }
})();