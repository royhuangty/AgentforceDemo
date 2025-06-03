'use strict';

(function () {

    angular.module('serviceExpert').controller('serviceExpertToastCtrl', ['$scope', '$timeout', function ($scope, $timeout) {

        $scope.modes = ['SUCCESS', 'ERROR', 'INFO'];

        var SHOW_TIME = 3000;

        $scope.showTast = false;
        $scope.message;
        $scope.mode = 'SUCCESS';

        $scope.data = {};

        $scope.data.renderToast = false;

        $scope.getStatusCssClass = function () {

            switch ($scope.mode) {
                case 'SUCCESS':
                    return 'slds-theme_success';
                    break;
                case 'ERROR':
                    return 'slds-theme_error';
                    break;
                case 'INFO':
                    return 'slds-theme_info';
                    break;

            }
            return 'slds-theme_info';
        };

        $scope.startAnimation = function () {

            $timeout(function () {
                $scope.showTast = true;
            }, 10);
        };

        $scope.stopAnimation = function () {

            $timeout(function () {
                $scope.showTast = false;
            }, SHOW_TIME);
        };

        $scope.removeToast = function () {

            $timeout(function () {
                $scope.data.renderToast = false;
            }, SHOW_TIME + 1000);
        };

        $scope.render = function () {

            $scope.data.renderToast = true; // render div

            $scope.startAnimation(); // show toast ( opacity )

            $scope.stopAnimation(); // hide toast animation after 3 sec ( opacity )

            $scope.removeToast(); // remove div after 4 sec
        };

        $scope.calFunc = function () {

            $timeout(function () {
                if ($scope.f && $scope.p) {
                    $scope.f($scope.p);
                    $scope.f = null; // stop from double click
                }
            }, 1500);
        };

        $scope.$on('showServiceExpertToast', function (event, e) {

            $scope.message = e && e.message ? e.message : '';

            $scope.mode = e.status && $scope.modes.indexOf(e.status) != -1 ? e.status : 'INFO';

            $scope.f = e.f || false;

            $scope.p = e.p || false;

            $scope.render();
        });
    }]);
})();