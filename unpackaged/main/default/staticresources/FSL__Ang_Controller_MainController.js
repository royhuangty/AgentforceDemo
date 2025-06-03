'use strict';

(function () {

    angular.module('serviceExpert').controller('mainController', ['$scope', 'StateService', function ($scope, StateService) {

        $scope.isOSX = StateService.isOSX;
        $scope.lang = StateService.lang;
        $scope.isRtlDirection = StateService.isRtlDirection();
        $scope.isUserIdle = StateService.isUserIdle;

        $scope.refreshPage = function () {
            location.reload();
        };

        $scope.focusOnInactiveButton = function () {
            document.getElementById('ReloadButtonFsl').focus();
        };
    }]);
})();