(function() {
  'use strict';

  angular.module("SkillsSelectorApp")
    .directive('datetimepicker', [
      '$timeout',
      function($timeout) {
        return {
          require: '?ngModel',
          restrict: 'EA',
          scope: {
            datetimepickerOptions: '@',
            onDateChangeFunction: '&',
            onDateClickFunction: '&'
          },
          link: function($scope, $element, $attrs, controller) {
            $element.on('dp.change', function() {
              $timeout(function() {
                var dtp = $element.data('DateTimePicker');
                controller.$setViewValue(dtp.date());
                $scope.onDateChangeFunction();
              });
            });

            $element.on('click', function() {
              $scope.onDateClickFunction();
            });

            controller.$render = function() {
              if (!!controller && !!controller.$viewValue) {
                var result = controller.$viewValue;
                $element.data('DateTimePicker').date(result);
              }
            };

            $element.datetimepicker($scope.$eval($attrs.datetimepickerOptions));
          }
        };
      }
    ]);
    
})();