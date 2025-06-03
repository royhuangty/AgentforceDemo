'use strict';

(function () {

    angular.module('serviceExpert').directive('csClickToDial', csClickToDial);

    csClickToDial.$inject = [];

    function csClickToDial() {

        controllerFunction.$inject = ['$scope'];

        function controllerFunction($scope) {

            $scope.callMe = function (num, userId, userFName, userLName) {
                var userName = userFName + ' ' + userLName;

                //this should hopefully do the trick
                sendCTIMessage('/CLICK_TO_DIAL?DN=' + encodeURIComponent(num) + '&amp;ID=' + userId + '&amp;ENTITY_NAME=User&amp;OBJECT_NAME=' + encodeURIComponent(userName) + '&amp;DISPLAY_NAME=' + encodeURIComponent('User'));return false;
            };
        }

        var template = '<span class="tel" style="display: none;">\n                                <img src="/img/s.gif" alt="" width="1" height="1" title="" onload="if (self.registerClickToDial) registerClickToDial(this.parentNode, false);"></img>{{number}}\n                                <img src="/img/btn_nodial_inline.gif" alt="Click to dial disabled" width="16" height="10" title="Click to dial disabled"></img>\n                            </span> \n                            <span style="display: block;">\n                                <img src="/img/s.gif" alt="" width="1" height="1" title="" onload="if (self.registerClickToDial) registerClickToDial(this.parentNode, true);"></img>\n                                <a href="javascript:void(0);" onclick="disableClicked(this, \'Click to dial disabled\');" ng-click="callMe(number, userId, userFirstName, userLastName)" title="">{{number}}\n                                    <img src="/img/btn_dial_inline.gif" alt="Click to dial" width="16" height="10" title="Click to dial" style="display: inline;"></img>\n                                    <img src="/img/btn_nodial_inline.gif" alt="Click to dial disabled" width="16" height="10" style="display: none;" title="Click to dial disabled"></img>\n                                </a>\n                            </span>';

        return {
            restrict: 'E',
            template: template,
            scope: {
                number: '@',
                userId: '@',
                userFirstName: '@',
                userLastName: '@'
            },
            controller: controllerFunction
        };
    }
})();