'use strict';

/*

  Name:   csToggle
  Author: Shai Ziv

  Togggle on and off a div without calling digest()
  Where you put the directive will be bound with a click event that will toggle the "ID" of element you provide
  The element you click and the one you toggle must have ID tag set

  Example:
  <button id="toggleBox" cs-toggle="Box" />
  <div id="Box"> ... </div>

*/

(function () {
    angular.module('serviceExpert').directive('csToggle', [function () {

        function linkFunc(scope, element, attrs) {

            var targetElement = $('#' + attrs.csToggle);
            var toggles = $('[cs-toggle]');
            var cachedTargets = {};

            // caching all elements
            for (var i = 0; i < toggles.length; i++) {
                var tmpElement = $(toggles[i]);
                cachedTargets[tmpElement.attr('id')] = $('#' + tmpElement.attr('cs-toggle'));
            }

            if (targetElement.length === 1) {

                // click on actual element
                angular.element(element[0]).on('click', function (e) {

                    e.stopPropagation();

                    $('.moreQuickActionsContainer').hide();
                    if (scheduler.isCalendarVisible()) scheduler.destroyCalendar();

                    for (var toggle in cachedTargets) {
                        if (toggle !== e.currentTarget.id) {
                            cachedTargets[toggle].hide();
                            $('.dhx_mini_calendar').hide();
                        } else {
                            targetElement.toggle();
                        }
                    }
                });

                angular.element(element[0]).on('keyup', function (e) {
                    if (e.keyCode === 13) targetElement.children()[0].focus();
                });

                // click on body, closing all csToggle elements (need to bound only one time!)
                // var bodyEvents = $._data( $("body")[0], "events" );
                // var isAlreadyBound = null;

                // if (bodyEvents && bodyEvents.click) {
                //   isAlreadyBound = bodyEvents.click.find(function(el) {
                //     if (el.handler.name === 'csToggleBodyCloseAll')
                //       return true;
                //     else
                //       return false;
                //   });
                // }

                // if (!isAlreadyBound) {
                angular.element('body').on('click', function csToggleBodyCloseAll(e) {
                    for (var toggle in cachedTargets) {
                        cachedTargets[toggle].hide();
                    }
                });

                targetElement.children().on('keydown', function csToggleBodyCloseAll(e) {
                    if (e.keyCode === 27) {
                        for (var toggle in cachedTargets) {
                            cachedTargets[toggle].hide();
                        }
                    }
                });
                // }
            }
        }

        return {
            restrict: 'A',
            link: linkFunc
        };
    }]);
})();