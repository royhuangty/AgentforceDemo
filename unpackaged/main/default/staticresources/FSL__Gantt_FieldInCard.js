'use strict';

(function () {
    angular.module('serviceExpert').directive('fieldInCard', ['$filter', 'utils', function ($filter, utils) {

        function linkFunc(scope, element, attrs) {

            scope.fieldsTypes = utils.fieldsTypes;

            scope.isFieldEmpty = function (service, field) {
                return typeof $filter('displayFieldSetField')(scope.service, scope.field) === 'undefined';
            };

            scope.getRefFieldID = function (service, field) {
                return service[field.JsAPIName.replace('__r', '__c')];
            };

            scope.openConsoleTab = utils.openConsoleTab;
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {
                service: '=',
                field: '='
            },
            template: '\n            \n                <span>\n                \n                    <div class="extra-info-title" title="{{field.Label}}">{{field.Label}}</div>\n                    <span class="extra-info-content" ng-show="field.Type != fieldsTypes.Reference && field.Type != fieldsTypes.Phone" title="{{service | displayFieldSetField : field}}"><service-list-column service="service" field="field"></service-list-column></span>\n                    <span ng-show="isFieldEmpty(service, field)">-</span>\n                    <a draggable="false" ng-show="field.Type == fieldsTypes.Reference" ng-click="openConsoleTab($event, getRefFieldID(service, field))" target="_blank" href="../{{ getRefFieldID(service, field) }}" title="{{service | displayFieldSetField : field}}">{{service | displayFieldSetField : field}}</a>\n                    <span ng-if="field.Type == fieldsTypes.Phone && !isFieldEmpty(service, field)">\n                        <cs-click-to-dial number="{{service[field.APIName]}}" user-id="\'{!$User.Id}\'" user-first-name="\'{!JSENCODE($User.FirstName)}\'" user-last-name="\'{!JSENCODE($User.LastName)}\'"></cs-click-to-dial>\n                    </span>\n\n                </span>\n            '
        };
    }]);
})();