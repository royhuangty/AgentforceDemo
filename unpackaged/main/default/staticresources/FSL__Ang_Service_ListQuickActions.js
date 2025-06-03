'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('serviceExpert').factory('listQuickActionsService', ['BundleActions', 'BundleService', 'utils', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'StateService', function (BundleActions, BundleService, utils, SERVICE_STATUS, SERVICE_CATEGORY, StateService) {

        var customActions = [];
        utils.customActionsPromise.then(function () {
            var customServiceActions = utils.getCustomActions('list');
            customActions.push.apply(customActions, _toConsumableArray(customServiceActions));
        });

        function isPinnedStatus(status) {
            var pinnedStatusArray = CustomSettings.pinnedStatusesSF.split(',');
            for (var i = 0; i < pinnedStatusArray.length; i++) {
                if (status === pinnedStatusArray[i]) return true;
            }

            return false;
        };
        var quickActionsOrderAndVisibility = {
            'flagUnflag': function flagUnflag(service) {
                return true;
            },
            'schedule': function schedule(service) {
                return !service.pinned && service.status != SERVICE_STATUS.COMPLETED && service.statusCategory != SERVICE_CATEGORY.CANCELED && !isPinnedStatus(service.status) && utils.hasCustomPermission('Schedule') && (!BundleService.isActive() || !BundleService.isBundleMember(service));
            },
            'getCandidates': function getCandidates(service) {
                return !!(!window.__gantt.ignoreReadonlyGantt226 && window.customPermissions.Show_Get_Candidates || window.__gantt.ignoreReadonlyGantt226) && !service.pinned && service.status != SERVICE_STATUS.COMPLETED && service.statusCategory != SERVICE_CATEGORY.CANCELED && !isPinnedStatus(service.status) && (!BundleService.isActive() || !BundleService.isBundleMember(service));
            },
            'edit': function edit(service) {
                return true;
            },
            'reshuffle': function reshuffle(service) {
                return !service.pinned && utils.hasCustomPermission('Reshuffle') && (!BundleService.isActive() || !BundleService.isBundleMember(service));
            },
            'groupNearby': function groupNearby(service) {
                return service.isScheduled() && service.latitude && service.longitude && utils.hasCustomPermission('Group_Nearby') && (!BundleService.isActive() || !BundleService.isBundleMember(service));
            },
            'dispatch': function dispatch(service) {
                return !service.pinned && service.status == SERVICE_STATUS.SCHEDULED && (!BundleService.isActive() || !BundleService.isBundleMember(service));
            },
            'gantt': function gantt(service) {
                service = BundleService.verifyShowSaOnGantt(service);
                if (!service) return false;
                return service.isScheduled();
            },
            'map': function map(service) {
                return StateService.isMapEnabled() && service.latitude && service.longitude;
            },
            'bundle': function bundle(service) {
                return utils.hasCustomPermission('Bundle_Unbundle') && BundleActions.Bundle.canInvoke([service]);
            },
            'unbundle': function unbundle(service) {
                return utils.hasCustomPermission('Bundle_Unbundle') && BundleActions.Unbundle.canInvoke([service]);
            }
        };

        var listQuickActionsService = {};

        listQuickActionsService.shouldShowQuickActionBtn = function (actionName, service) {
            if (!service || !quickActionsOrderAndVisibility[actionName]) return false;
            return quickActionsOrderAndVisibility[actionName](service);
        };

        listQuickActionsService.isLastVisibleQuickAction = function (actionName, service) {
            if (customActions.length > 0) return false;
            var found = false;
            for (var act in quickActionsOrderAndVisibility) {
                if (!found) {
                    if (actionName == act) {
                        if (!this.shouldShowQuickActionBtn(actionName, service)) return false;
                        found = true;
                        continue;
                    }
                } else if (this.shouldShowQuickActionBtn(act, service)) return false;
            }
            return found;
        };

        return listQuickActionsService;
    }]);
})();