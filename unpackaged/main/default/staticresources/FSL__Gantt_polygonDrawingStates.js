'use strict';

(function () {

    angular.module('serviceExpert').constant('DRAWING_STATES', {
        NONE: 0,
        EDIT: 1,
        DRAW: 2,
        SELECTED: 3,
        INTERSECT: 4
    });
})();