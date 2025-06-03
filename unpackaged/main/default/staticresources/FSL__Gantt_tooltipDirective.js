'use strict';

(function () {
    angular.module('serviceExpert').directive('csTooltip', [function () {

        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="gantt-tooltip-info-button">\n                                    <svg aria-hidden="true" class="slds-icon info-tooltip-icon">\n                                        \u2028<use xlink:href="' + lsdIcons.info + '"></use>\n                                    \u2028</svg>\n                                </div>\n                                <span class="gantt-tooltip-wrapper" ng-transclude></span>',

            link: function link($scope, element, attrs) {

                var firstTime = true;

                element.find('.gantt-tooltip-info-button').bind('mouseenter mouseleave', function () {

                    var tooltipElement = element.find('.gantt-tooltip-wrapper'),
                        tooltipHeight = tooltipElement.outerHeight(),
                        iconOffset = element.offset();

                    tooltipElement.toggleClass('active-tooltip');

                    // CFSL-1173
                    if (firstTime) {

                        firstTime = false;
                        tooltipElement.css('top', iconOffset.top - tooltipHeight - 10 + 'px');
                        tooltipElement.css('position', 'fixed');
                        tooltipElement.css('bottom', 'initial');
                    }
                });
            }
        };
    }]);
})();