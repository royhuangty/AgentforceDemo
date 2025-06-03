'use strict';

(function () {

    angular.module('serviceExpert').directive('csColorPicker', csColorPicker);

    csColorPicker.$inject = [];

    function csColorPicker() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {
            $scope.colors = [{ Name: 'Red', Hex: '#E53935' }, { Name: 'Pink', Hex: '#D81B60' }, { Name: 'Purple', Hex: '#8E24AA' }, { Name: 'Indigo', Hex: '#3949AB' }, { Name: 'Blue', Hex: '#1E88E5' }, { Name: 'Cyan', Hex: '#00ACC1' }, { Name: 'Teal', Hex: '#00897B' }, { Name: 'Green', Hex: '#43A047' }, { Name: 'Lime', Hex: '#C0CA33' }, { Name: 'Yellow', Hex: '#FDD835' }, { Name: 'Amber', Hex: '#FFB300' }, { Name: 'Orange', Hex: '#FB8C00' }, { Name: 'Brown', Hex: '#6D4C41' }, { Name: 'Grey', Hex: '#757575' }, { Name: 'Blue Grey', Hex: '#546E7A' }, { Name: 'Black', Hex: '#000' }];

            $scope.selectColor = function (color) {
                $scope.selectedColor = color.Hex;
                $scope.setSelectedShapeColor(color.Hex);
                $scope.showColorMenu = false;
            };

            $scope.showMenuClick = function (e) {
                if ($scope.drawState != $scope.drawingStates.EDIT && $scope.drawState != $scope.drawingStates.DRAW) return;

                $scope.showColorMenu = !$scope.showColorMenu;
            };

            $scope.selectedColor = '#546E7A';

            $scope.showColorMenu = false;

            angular.element('#mapOptionsContainer').on('click', function (e) {
                var classNames = ["color-square", "color-button"];

                for (var i = 0; i < classNames.length; i++) {
                    if (e.target.classList.contains(classNames[i]) || e.target.parentNode && e.target.parentNode.classList.contains(classNames[i])) return;
                }

                if ($scope.showColorMenu) $scope.showColorMenu = false;
            });
        }

        var template = '<div id="select-color-btn" title="' + customLabels.Select_color + '" class="color-button truncate"  ng-click="showMenuClick()" ng-class="{disabledButton: drawState != drawingStates.EDIT && drawState != drawingStates.DRAW}">\n                            <span class="color-square" ng-style="{\'background-color\': selectedColor}"></span><span>' + customLabels.Select_color + '</span>\n                        </div>\n                        <div class="color-menu" id="colorMenu" ng-show="showColorMenu == true">\n                            <span class="color-box" ng-repeat="color in colors" ng-click="selectColor(color)" ng-style="{\'background-color\': color.Hex}"></span>\n                        </div>';

        return {
            restrict: 'E',
            template: template,
            scope: false,
            controller: controllerFunction
        };
    }
})();