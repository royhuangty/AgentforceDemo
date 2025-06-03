'use strict';

(function () {
    angular.module('serviceExpert').directive('serviceListPreview', ['utils', 'FieldSetFieldsService', 'StateService', function (utils, FieldSetFieldsService, StateService) {

        var fields = [];
        var isRtlDirection = StateService.isRtlDirection();

        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            fields = fieldsSetFieldsObject.servicePreview;
        });

        function linkFunc(scope, element, attrs) {

            var shouldRun = true;

            scope.fields = function () {
                return fields;
            };

            scope.handleOver = function (e) {

                e.stopPropagation();

                var bodyRect = document.body.getBoundingClientRect(),
                    elemRect = $(element).find('.service-quick-view')[0].getBoundingClientRect(),
                    offset_x = elemRect.x - bodyRect.x + 37,
                    offset_y = elemRect.top - bodyRect.top,
                    offset_right = bodyRect.right - elemRect.right + 37,
                    previewElement = $(element).find('.service-preview')[0],
                    clientY = e.clientY;

                previewElement.style.display = 'inline-block';

                if (document.body.clientHeight < previewElement.clientHeight + clientY) {
                    offset_y = document.body.clientHeight - previewElement.clientHeight - 26;
                }
                //RTL support
                if (isRtlDirection) {
                    previewElement.style.right = offset_right + 'px';
                } else {
                    previewElement.style.left = offset_x + 'px';
                }
                previewElement.style.top = offset_y + 'px';

                shouldRun = false;
            };

            scope.handleOut = function (e) {
                $(element).find('.service-preview')[0].style.display = 'none';
            };

            scope.getPreviewPosition = function () {

                if (isRtlDirection) {
                    return { left: scope.position.x };
                }

                return { right: scope.position.x };
            };
        }

        return {
            restrict: 'E',
            link: linkFunc,
            scope: {
                service: '=',
                position: '='
            },
            template: '\n            \n            <div>\n                <div class="service-quick-view" ng-mouseenter="handleOver($event)" ng-mouseleave="handleOut($event)" ng-style="getPreviewPosition()">\n                    <svg aria-hidden="true" class="slds-icon">\n                        <use xlink:href="' + window.lsdIcons.info + '"></use>\n                    </svg>\n                </div>\n\n                <div class="service-preview"> \n                    <div class="preview-field-container" ng-repeat="field in fields() track by $index">\n                        <b class="label-preview">{{field.Label}}</b>: <span ng-if="!service[field.APIName] && field.Type !== \'BOOLEAN\'">-</span> <service-list-column service="service" field="field"></service-list-column>\n                    </div>                    \n                </div>\n\n                \n            </div>    \n            '
        };
    }]);
})();