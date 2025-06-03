'use strict';

(function () {
    angular.module('serviceExpert').directive('safeBinder', [function () {

        function linkFunc(scope, element, attrs) {
            $(element[0]).html(scope.safeBinder);
        }

        return {
            restrict: 'A',
            scope: {
                safeBinder: '='
            },
            link: linkFunc
        };
    }]);
})();