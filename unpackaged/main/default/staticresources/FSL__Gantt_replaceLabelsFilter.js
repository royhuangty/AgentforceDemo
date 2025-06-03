'use strict';

(function () {

    angular.module('serviceExpert').filter('replaceLabels', function () {
        return function (label) {
            var target = label;

            for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                params[_key - 1] = arguments[_key];
            }

            for (var i = 0; i < params.length; i++) {
                target = target.replace('$' + i, params[i]);
            }

            return target;
        };
    });
})();