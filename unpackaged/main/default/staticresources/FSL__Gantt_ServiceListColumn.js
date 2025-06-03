'use strict';

(function () {
    angular.module('serviceExpert').directive('serviceListColumn', ['utils', '$filter', function (utils, $filter) {

        function linkFunc(scope, element, attrs) {

            scope.isFormulaForImage = utils.isFormulaForImage;

            scope.getType = function () {

                var el = element,
                    localScope = scope;

                if (scope.field.FullAPIName === window.fieldNames.Service_Appointment.GanttIcon__c) {
                    return 'gantt-icons';
                }

                // REMOVING SUPPORT FOR STRING AS URL - CAUSE PERFORMANCE ISSUES WITH LARGE AMOUNT OF DATA
                // if ( (scope.field.Type === 'STRING' || scope.field.Type === 'TEXTAREA') && utils.isUrlImg(scope.service[scope.field.FullAPIName])) {
                //     return 'url-icon';
                // }

                if ((scope.field.Type === 'STRING' || scope.field.Type === 'TEXTAREA') && utils.isFormulaForImage(scope.service[scope.field.FullAPIName])) {

                    if (!el[0].innerHTML.includes('<img')) {

                        el[0].innerHTML = '<span>\n                                               <img class="img-on-service-list" src="' + utils.isFormulaForImage(scope.service[scope.field.FullAPIName]) + '" />\n                                           </span>';
                    }

                    return;
                }

                if (scope.field.Type === 'BOOLEAN') {
                    return 'normal';
                }

                var value = $filter('displayFieldSetField')(scope.service, scope.field);

                // W-14479079
                if (value === undefined || value === null) {
                    el[0].innerText = '';
                    return 'normal';
                }

                value = value.toString();

                // W-14522658
                if (localScope.pattern === '') {

                    el[0].innerText = value;
                    return 'normal';
                }

                // run search/pattern matching only if pattern is not empty
                var pattern = localScope.pattern,
                    patternLowerCase = localScope.pattern ? localScope.pattern.toLowerCase() : null,
                    valueLowerCase = value ? value.toLowerCase() : null,
                    firstAppearence = valueLowerCase ? valueLowerCase.indexOf(patternLowerCase) : -1;

                if (patternLowerCase && firstAppearence > -1) {

                    var htmlElement = value.substring(0, firstAppearence).encodeHTML();;

                    // W-14522658
                    htmlElement += '<span class="resource-highlight-on-search">' + value.substr(firstAppearence, pattern.length).encodeHTML() + '</span>';
                    htmlElement += value.substring(firstAppearence + pattern.length).encodeHTML();

                    el[0].innerHTML = htmlElement;
                } else {

                    el[0].innerText = value;
                }

                return 'normal';
            };
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {
                service: '=',
                field: '=',
                pattern: '='
            },
            template: '\n            \n            <span>\n                <input type="checkbox" class="checkbox-on-service-list" ng-if="getType() == \'normal\' && \'BOOLEAN\' == field.Type" ng-checked="service | displayFieldSetField : field" disabled></input>\n                <span ng-if="getType() == \'normal\' && \'BOOLEAN\' != field.Type"></span>\n                <img ng-if="getType() == \'gantt-icons\'" class="img-on-service-list" ng-repeat="img in service.icons track by $index" ng-src="{{img}}" track by $index/>\n                <img ng-if="getType() == \'url-icon\'" class="img-on-service-list" ng-src="{{service[field.FullAPIName]}}" />\n            </span>    \n            '
        };
    }]);
})();