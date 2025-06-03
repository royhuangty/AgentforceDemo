'use strict';

(function () {

    angular.module('serviceExpert').filter('ampmOr24', function () {

        return function (hour, hourType, includeMinutes) {

            var hourNum = parseInt(hour);
            var minutes = includeMinutes ? ':00' : '';

            if (hourType == 'ampm') {

                if (hour === 12) return '12PM';

                if (hour === 0 || hour === 24) return '12AM';

                if (hourNum > 12) return hourNum - 12 + 'PM';else return hourNum + 'AM';
            } else if (hourType == '24') {
                if (hourNum < 10) return '0' + hourNum + minutes;else return hourNum + minutes;
            }

            return hour;
        };
    });
})();