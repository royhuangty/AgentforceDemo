'use strict';

(function () {

    angular.module('serviceExpert').filter('orderObjectBy', function () {
        return function (items, orderByField, reverse) {
            var filtered = [];
            angular.forEach(items, function (item) {
                filtered.push(item);
            });

            filtered.sort(function (a, b) {
                return a[orderByField] > b[orderByField] ? 1 : -1;
            });

            if (reverse) filtered.reverse();

            return filtered;
        };
    });
})();