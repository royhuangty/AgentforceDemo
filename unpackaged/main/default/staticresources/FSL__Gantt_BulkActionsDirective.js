'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('serviceExpert').directive('bulkActionsButton', BulkActionsButton);

    BulkActionsButton.$inject = [];

    function BulkActionsButton() {

        controllerFunction.$inject = ['$scope', 'servicesService', 'utils', 'bulkDispatchService', 'bulkUnscheduleService', 'ServiceSelectorService', 'optimizeLightboxService', 'bulkScheduleService', 'rdOptimizeLightboxService', 'sfdcService', 'GeneralLightbox', 'TimePhasedDataService', 'BundleActions', 'BundleService', 'DeltaService'];

        function controllerFunction($scope, servicesService, utils, bulkDispatchService, bulkUnscheduleService, ServiceSelectorService, optimizeLightboxService, bulkScheduleService, rdOptimizeLightboxService, sfdcService, GeneralLightbox, TimePhasedDataService, BundleActions, BundleService, DeltaService) {
            $scope.bulkActionsOrder = bulkActionsOrder;
            $scope.customActions = [];

            $scope.actionNames = {
                'Schedule': { name: 'Schedule', nameLabel: customLabels.Schedule, icon: lsdIcons.calendar },
                'Dispatch': { name: 'Dispatch', nameLabel: customLabels.Dispatch, icon: lsdIcons.dispatch },
                'Optimize': { name: 'Optimize', nameLabel: customLabels.Optimize, icon: lsdIcons.magicwand },
                'Flag-Unflag': { name: 'Flag-Unflag', nameLabel: customLabels.Flag_Unflag, icon: lsdIcons.flag },
                'Unschedule': { name: 'Unschedule', nameLabel: customLabels.Unschedule, icon: lsdIcons.na },
                'Check Rules': { name: 'Check Rules', nameLabel: customLabels.check_rules_action_label, icon: lsdIcons.violation, isAvailable: function isAvailable() {
                        return window.customPermissions.Enable_Bulk_Check_Rules;
                    } },
                'Bundle': { name: 'Bundle', nameLabel: BundleActions.Bundle.label, icon: BundleActions.Bundle.icon, isAvailable: function isAvailable() {
                        return BundleService.isActive();
                    } },
                'Unbundle': { name: 'Unbundle', nameLabel: BundleActions.Unbundle.label, icon: BundleActions.Unbundle.icon, isAvailable: function isAvailable() {
                        return BundleService.isActive();
                    } }
            };

            // custom actions
            utils.customActionsPromise.then(function () {
                var _$scope$customActions;

                var customServiceActions = utils.getCustomActions('bulk');
                (_$scope$customActions = $scope.customActions).push.apply(_$scope$customActions, _toConsumableArray(customServiceActions));
            });

            $scope.runCustomServiceAction = function (action) {

                var servicesIds = ServiceSelectorService.getSelected();

                if (action.visualforce) {

                    var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                        endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                    //GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&id=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);

                    if (servicesIds.length === 1) {
                        GeneralLightbox.open(action.name, action.visualforce + '?id=' + servicesIds[0] + '&start=' + startDateStr + '&end=' + endDateStr);
                    } else {
                        GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);
                    }
                } else {

                    if (servicesIds.length === 0) {
                        return;
                    }

                    sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, servicesIds, scheduler._min_date, scheduler._max_date).then(function (res) {
                        DeltaService.updateGantt();
                        if (res) {
                            utils.addNotification(action.name, res, null, null);
                        }
                    }).catch(function (ev) {
                        return utils.addNotification(action.name, ev.message, null, null);
                    });
                }
            };

            $scope.isActionAvailable = function (actionName) {
                if ($scope.actionNames[actionName] && $scope.actionNames[actionName].isAvailable) {
                    return $scope.actionNames[actionName].isAvailable();
                }
                return true;
            };

            $scope.checkHasCustomPermission = function (actionName) {
                if (utils.hasCustomPermission('Bulk_' + actionName) == undefined) return true;

                return utils.hasCustomPermission('Bulk_' + actionName);
            };

            $scope.openBulkAction = function (title) {
                switch (title) {
                    case 'Schedule':
                        bulkScheduleService.schedule(ServiceSelectorService.getSelected());
                        break;

                    case 'Dispatch':
                        bulkDispatchService.open();
                        break;

                    case 'Unschedule':
                        bulkUnscheduleService.open();
                        break;

                    case 'Optimize':
                        optimizeLightboxService.open();
                        break;

                    case 'Flag-Unflag':

                        var selected = ServiceSelectorService.getSelected();

                        for (var i = 0; i < selected.length; i++) {
                            servicesService.flagged[selected[i]] = !servicesService.flagged[selected[i]];
                        }
                        sfdcService.callRemoteAction(RemoteActions.collectMetricsForSplunk, { feature: 'bulkAction', value: 'bulkFlagUnflag', count: selected.length }); //Send flag/unflag to splunk
                        updateViewDebounced();

                        break;

                    case 'Check Rules':

                        var servicesIds = ServiceSelectorService.getSelected();

                        if (servicesIds.length > 0) {
                            servicesService.checkRules(servicesIds).then(servicesService.drawViolationsOnGantt);
                        }

                        break;

                    case 'Bundle':
                        var selIds = ServiceSelectorService.getSelected();
                        var sel = selIds.map(function (sid) {
                            return TimePhasedDataService.serviceAppointments()[sid];
                        });
                        BundleActions.Bundle.invoke(sel).then(function () {}).catch(function (ex) {});
                        break;

                    case 'Unbundle':
                        var selcIds = ServiceSelectorService.getSelected();
                        var selc = selcIds.map(function (sid) {
                            return TimePhasedDataService.serviceAppointments()[sid];
                        });
                        BundleActions.Unbundle.invoke(selc).then(function () {}).catch(function (ex) {});
                        break;
                }
            };
        }

        var template = '<div id="quickActionsButtons">\n\t\t\t                    <div fsl-key-press tabindex="0" id="actionQuickFirst" class="truncate quickActionBtn" ng-show="bulkActionsOrder.first.length && checkHasCustomPermission(actionNames[bulkActionsOrder.first[0].title].name) && isActionAvailable(actionNames[bulkActionsOrder.first[0].title].name)" ng-click="openBulkAction(bulkActionsOrder.first[0].title)" title="{{actionNames[bulkActionsOrder.first[0].title].nameLabel}}">\n\t\t\t\t\t\t\t\t\t{{actionNames[bulkActionsOrder.first[0].title].nameLabel}}\n\t\t\t\t\t\t\t\t</div>\n\t                        \t<div fsl-key-press tabindex="0" id="actionQuickSecond"\n\t\t\t\t\t\t\t\t\t class="truncate quickActionBtn"\n\t\t\t\t\t\t\t\t\t ng-show="bulkActionsOrder.second.length && checkHasCustomPermission(actionNames[bulkActionsOrder.second[0].title].name) && isActionAvailable(actionNames[bulkActionsOrder.second[0].title].name)"\n\t\t\t\t\t\t\t\t\t ng-click="openBulkAction(bulkActionsOrder.second[0].title)"\n                                     title="{{actionNames[bulkActionsOrder.second[0].title].nameLabel}}">\n                                     {{actionNames[bulkActionsOrder.second[0].title].nameLabel}}\n                                </div>\n\t\t                    \t<div fsl-key-press tabindex="0" class="truncate" id="ActionButton" ng-show="bulkActionsOrder.dropdown.length || customActions.length" cs-toggle="MainActionContainer">\n                                    <span ng-show="(!bulkActionsOrder.first.length &&\n                                                   !bulkActionsOrder.second.length) ||\n                                                   ( (!checkHasCustomPermission(actionNames[bulkActionsOrder.first[0].title].name)  || !isActionAvailable(actionNames[bulkActionsOrder.first[0].title].name )) &&\n                                                     (!checkHasCustomPermission(actionNames[bulkActionsOrder.second[0].title].name) || !isActionAvailable(actionNames[bulkActionsOrder.second[0].title].name)) )">\n                                           ' + customLabels.Actions + '\n                                    </span>\n                                    <i class="fa fa-caret-down"></i>\n\t\t                    \t</div>\n\t                    \t</div>\n\t                    \t\n\t                        <div id="MainActionContainer">\n\t\t\t                    <div class="truncate BulkActionMenuItem" tabindex="0" role="select" fsl-tab-switch fsl-key-press ng-repeat="action in bulkActionsOrder.dropdown" ng-show="checkHasCustomPermission(actionNames[action.title].name) && isActionAvailable(actionNames[action.title].name)" ng-click="openBulkAction(action.title)">\n\t\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon mainActionIcon">\n\t\t\t\t\t\t\t\t\t\t<use xlink:href="{{actionNames[action.title].icon}}"></use>\n\t\t\t\t\t\t\t\t\t</svg>\n\t\t\t\t\t\t\t\t\t{{actionNames[action.title].nameLabel}}\n                                </div>\n                                \n                                \n                                <div class="truncate BulkActionMenuItem" tabindex="0" role="select" fsl-tab-switch fsl-key-press ng-repeat="action in customActions" ng-click="runCustomServiceAction(action)">\n                                \n                                    <svg aria-hidden="true" class="slds-icon mainCustomActionIcon">\n\t\t\t\t\t\t\t\t\t\t<use xlink:href="{{action.icon}}"></use>\n\t\t\t\t\t\t\t\t\t</svg>\n                                \n\t\t\t\t\t\t\t\t\t{{action.name}}\n                                </div>\n                                                               \n                                \n\t                        </div>';

        return {
            restrict: 'E',
            template: template,
            scope: {},
            controller: controllerFunction
        };
    }
})();