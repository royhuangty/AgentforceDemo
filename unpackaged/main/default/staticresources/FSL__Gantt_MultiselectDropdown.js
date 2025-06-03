'use strict';

(function () {

    angular.module('serviceExpert').directive('multiDropdown', multiDropdown);

    multiDropdown.$inject = [];

    function multiDropdown() {

        controllerFunction.$inject = ['$scope', '$timeout', '$document'];

        function controllerFunction($scope, $timeout, $document) {
            $scope.open = false;
            $scope.selected = {};
            $scope.numOfSelected = 0;
            $scope.selectButtonMessage = customLabels.SelectFromTheFilteredTerritories;
            $scope.servicesWithoutTerritory = false;

            $scope.toggleDropdown = function () {
                $scope.open = !$scope.open;
            };

            $document.on('click', function (event) {
                var isClickedElementChildOfPopup = event.target.closest('.multiselect-component-container');
                if ($scope.open) {
                    if (!isClickedElementChildOfPopup) {
                        $scope.$apply(function () {
                            $scope.toggleDropdown();
                        });
                    }
                }
            });

            $scope.updateCheckbox = function (option) {
                if (option === 'orphan') {
                    $scope.servicesWithoutTerritory = !$scope.servicesWithoutTerritory;
                } else {
                    if (!$scope.selected[option]) {
                        $scope.selected[option] = true;
                    } else {
                        $scope.selected[option] = !$scope.selected[option];
                    }
                    $scope.numOfSelected = Object.values($scope.selected).filter(function (value) {
                        return value;
                    }).length;
                    if ($scope.numOfSelected === 1) {
                        $scope.selectButtonMessage = customLabels.OneTerritorySelected;
                    } else {
                        $scope.selectButtonMessage = $scope.numOfSelected > 0 ? $scope.numOfSelected + ' ' + customLabels.XTerritoriesSelected : customLabels.SelectFromTheFilteredTerritories;
                    }
                }

                //figuring out the digest cycle problem
                $timeout(function () {
                    if ($scope.type === 'territories') {
                        if (option === 'orphan') {
                            $scope.$parent.orphanServices = $scope.servicesWithoutTerritory;
                        } else {
                            $scope.$parent.selectedLocations = $scope.selected;
                        }
                        $scope.$parent.onSelectTerritory();
                    }
                });
            };
        }

        var template = '\n        <div class="multiselect-component-container" ng-show="selected">\n            <div>\n                <div class="multi-dropdown-button" ng-click="toggleDropdown()">\n                    <label>{{selectButtonMessage}}</label>\n                    <svg>\n                        <use xlink:href="' + lsdIcons.down + '"></use>\n                    </svg>\n                </div>\n                <ul class="multi-dropdown" ng-show="open">\n                    <li class="multiselect-li-item" ng-repeat="o in options track by $index" id="filteredTerritory{{$index}}" ng-click="updateCheckbox(o.id)">\n                        <svg ng-show="selected[o.id]" class="multi-select-icon">\n                            <use xlink:href="' + lsdIcons.check + '"></use>\n                        </svg>\n                        <svg ng-hide="selected[o.id]" class="multi-select-icon">\n                            <use xlink:href=""></use>\n                        </svg>\n                        <label>{{o.name}}</label>\n                    </li>\n                    <li class="multiselect-li-item" id="filteredTerritoryOrphan" ng-click="updateCheckbox(\'orphan\')">\n                        <svg ng-show="servicesWithoutTerritory" class="multi-select-icon">\n                            <use xlink:href="' + lsdIcons.check + '"></use>\n                        </svg>\n                        <svg ng-hide="servicesWithoutTerritory" class="multi-select-icon">\n                            <use xlink:href=""></use>\n                        </svg>\n                        <label>' + customLabels.IncludeServicesNoLocations + '</label>\n                    </li>\n                </ul>\n            </div>\n        </div>';

        return {
            restrict: 'E',
            scope: {
                options: '=',
                type: '@'
            },
            controller: controllerFunction,
            template: template
        };
    }
})();