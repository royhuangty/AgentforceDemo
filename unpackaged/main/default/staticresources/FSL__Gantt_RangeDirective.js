'use strict';

/*

  Name:   csRange
  Author: Shai Ziv

*/

(function () {
    angular.module('serviceExpert').directive('csRange', ['$filter', 'utils', function ($filter, utils) {

        function linkFunc(scope, element, attrs) {

            var hoursSpan = $($(element[0]).find('.showingDates')),
                hourType = isAMPM ? 'ampm' : '24',
                sliderElement = $($(element[0]).find('.sliderSelector'));

            scope.$watchCollection(attrs.ngModel, function (newValue, oldValue) {

                if (sliderElement.slider('instance') && (newValue.start !== oldValue.start || newValue.end !== oldValue.end)) {
                    sliderElement.slider('values', [newValue.start, newValue.end]);
                    hoursSpan.text(attrs.showingText.replace('{1}', $filter('ampmOr24')(parseInt(newValue.start), hourType, true)).replace('{2}', $filter('ampmOr24')(parseInt(newValue.end), hourType, true)));
                }
            });

            sliderElement.slider({
                range: true,
                min: parseInt(attrs.min),
                max: parseInt(attrs.max),
                values: [parseInt(attrs.defaultStart), parseInt(attrs.defaultEnd)],

                slide: function slide(event, ui) {
                    event.stopPropagation();
                    hoursSpan.text(attrs.showingText.replace('{1}', $filter('ampmOr24')(parseInt(ui.values[0]), hourType, true)).replace('{2}', $filter('ampmOr24')(parseInt(ui.values[1]), hourType, true)));
                },

                stop: function stop(event, ui) {
                    event.stopPropagation();
                    utils.safeApply(scope, function () {
                        scope[attrs.ngModel].start = ui.values[0];
                        scope[attrs.ngModel].end = ui.values[1];
                    });
                }
            });

            hoursSpan.text(attrs.showingText.replace('{1}', $filter('ampmOr24')(parseInt(attrs.defaultStart), hourType, true)).replace('{2}', $filter('ampmOr24')(parseInt(attrs.defaultEnd), hourType, true)));
        }

        return {
            restrict: 'CAE',
            link: linkFunc,
            scope: true,
            template: '<div class="sliderSelector"></div><span class="showingDates"></span>'
        };
    }]);
})();