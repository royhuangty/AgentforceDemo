'use strict';

/*

  Name:   csStopPropagation
  Author: Shai Ziv

  stopPropagation for a specified event without digesting

  Example:
  <input type="text" cs-stop-propagation="keydown" />

*/

(function () {
  angular.module('serviceExpert').directive('csStopPropagation', [function () {

    function linkFunc(scope, element, attrs) {
      angular.element(element[0]).on(attrs.csStopPropagation, function (e) {
        e.stopPropagation();
      });
    }

    return {
      restrict: 'A',
      link: linkFunc
    };
  }]);
})();