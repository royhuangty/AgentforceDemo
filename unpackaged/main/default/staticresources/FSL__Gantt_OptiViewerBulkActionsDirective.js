'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('serviceExpert').directive('bulkActionsButtonOptiViewer', bulkActionsButtonOptiViewer);

    bulkActionsButtonOptiViewer.$inject = [];

    function bulkActionsButtonOptiViewer() {

        controllerFunction.$inject = ['$scope', 'servicesService', 'utils', 'bulkDispatchService', 'bulkUnscheduleService', 'ServiceSelectorService', 'optimizeLightboxService', 'bulkScheduleService', 'rdOptimizeLightboxService', 'sfdcService', 'GeneralLightbox', 'TimePhasedDataService', 'BundleActions', 'BundleService', 'LoadOptiViewerDataService'];

        function controllerFunction($scope, servicesService, utils, bulkDispatchService, bulkUnscheduleService, ServiceSelectorService, optimizeLightboxService, bulkScheduleService, rdOptimizeLightboxService, sfdcService, GeneralLightbox, TimePhasedDataService, BundleActions, BundleService, LoadOptiViewerDataService) {
            $scope.bulkActionsOrder = bulkActionsOrder;
            $scope.customActions = [];
            $scope.isOptimizationLoaded = LoadOptiViewerDataService.isOptimizationLoaded;
            $scope.isShowingOutputJson = LoadOptiViewerDataService.isShowingOutputJson;

            $scope.actionNames = {
                'Select Optimization Request': { name: 'Select Optimization Request', nameLabel: 'Select OR', icon: lsdIcons.calendar },
                'Show Optimization Results': { name: 'Show Optimization Results', nameLabel: 'Show Results', icon: lsdIcons.calendar },
                'Show Gantt Before Optimization': { name: 'Show Gantt Before Optimization', nameLabel: 'Show Before', icon: lsdIcons.calendar },
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

                        sfdcService.callRemoteAction(RemoteActions.getServicesById, servicesIds).then(function (fetchedServcices) {
                            var updatesServices = TimePhasedDataService.updateTimePhaseData(fetchedServcices, 'service').services;
                            servicesService.drawServicesAndAbsences(updatesServices, [], [], []);

                            if (res) {
                                utils.addNotification(action.name, res, null, null);
                            }
                        });
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
                    case 'Select Optimization Request':
                        LoadOptiViewerDataService.open();
                        break;
                    case 'Show Optimization Results':
                        LoadOptiViewerDataService.loadOptimizationResponseOutput();
                        break;

                    case 'Show Gantt Before Optimization':
                        LoadOptiViewerDataService.loadOptimizationRequestInput(LoadOptiViewerDataService.i_OptimizationRequestName());
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

        var template = '<div id="quickActionsButtons">\n\t\t\t                    <div fsl-key-press tabindex="0" id="actionQuickFirst" \n                                    class="truncate quickActionBtn" \n                                    ng-click="openBulkAction(actionNames[\'Select Optimization Request\'].name)" \n                                    title="{{actionNames[\'Select Optimization Request\'].nameLabel}}">\n                                        {{actionNames[\'Select Optimization Request\'].nameLabel}}\n\t\t\t\t\t\t\t\t</div>\n                                <div fsl-key-press tabindex="0" id="actionQuickSecond" \n                                    class="truncate quickActionBtn"\n                                    ng-show="isOptimizationLoaded() && !isShowingOutputJson()" \n                                    ng-click="openBulkAction(actionNames[\'Show Optimization Results\'].name)" \n                                    title="{{actionNames[\'Show Optimization Results\'].nameLabel}}">\n                                        {{actionNames[\'Show Optimization Results\'].nameLabel}}\n\t\t\t\t\t\t\t\t</div>\n                                <div fsl-key-press tabindex="0" id="actionQuickSecond" \n                                    class="truncate quickActionBtn"\n                                    ng-show="isOptimizationLoaded() && isShowingOutputJson()"  \n                                    ng-click="openBulkAction(actionNames[\'Show Gantt Before Optimization\'].name)" \n                                    title="{{actionNames[\'Show Gantt Before Optimization\'].nameLabel}}">\n                                        {{actionNames[\'Show Gantt Before Optimization\'].nameLabel}}\n\t\t\t\t\t\t\t\t</div>\n\t                    </div>';

        return {
            restrict: 'E',
            template: template,
            scope: {},
            controller: controllerFunction
        };
    }
})();