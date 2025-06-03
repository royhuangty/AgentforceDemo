'use strict';

(function () {

    BundleActions.$inject = ['BundleService', 'BundlerAddCreateLightboxService', '$q', '$rootScope', 'utils'];

    angular.module('serviceExpert').factory('BundleActions', BundleActions);

    function BundleActions(BundleService, BundlerAddCreateLightboxService, $q, $rootScope) {

        var actions = {

            'Bundle': { label: customLabels.Bundle, icon: lsdIcons.bundleIcons + '#ad_set', canInvoke: Bundle_CanInvoke, invoke: Bundle_Invoke },
            'Unbundle': { label: customLabels.UnBundle, icon: lsdIcons.bundleIcons + '#archive', canInvoke: Unbundle_CanInvoke, invoke: Unbundle_Invoke },
            'UpdateBundle': { label: customLabels.Bundle, icon: lsdIcons.bundleIcons + '#ad_set', canInvoke: Update_Bundle_CanInvoke, invoke: Update_Bundle_Invoke }
            /// ******* Bundle Service Appointment Action ********** ///
        };function Update_Bundle_CanInvoke(saList) {
            return true;
        }

        function Update_Bundle_Invoke(saList, selectedPolicyId, bId) {
            // if (Bundle_CanInvoke(saList)){
            var saIdsList = saList.map(function (saItem) {
                return saItem.id;
            });

            return BundleService.updateBundleServiceAppointments(saIdsList, selectedPolicyId, bId);
            //}
        }

        function Bundle_CanInvoke(saList) {
            if (!BundleService.isActive() || !saList || saList.length === 0) return false;
            /// Supporting existing logic in actions: no check for action on multiple SAs
            if (saList.length > 1) return true;

            var res = true;
            for (var i = 0; i < saList.length; i++) {

                if (saList[i] && saList[i].id.indexOf('_dummy') > -1) {
                    res = false;
                    break;
                }

                var saItem = saList[i];
                if (!saItem || saItem.pinned || saItem.isBundle || saItem.isBundleMember) {
                    res = false;
                    break;
                }
            }
            return res;
        }
        function Bundle_Invoke(saList, selectedPolicyId) {

            var deffered = $q.defer();

            if (saList.length === 0) {

                var toastObj = {
                    message: customLabels.BundleNotSelected,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                utils.addNotification(customLabels.BundleCreatedFailedNTitle, customLabels.BundleNotSelected, function () {});

                deffered.reject();
                return deffered.promise;
            }

            //  if (Bundle_CanInvoke(saList)){

            return BundlerAddCreateLightboxService.open(saList, selectedPolicyId);

            //const saIdsList = saList.map(saItem=>saItem.id);
            //return BundleService.bundleServiceAppointments(saIdsList,selectedPolicyId);
            // }
        }

        /// ******* UnBundle Service Appointment Action ********** ///
        function Unbundle_CanInvoke(saList) {
            if (!BundleService.isActive() || !saList || saList.length === 0) return false;
            /// Supporting existing logic in actions: no check for action on multiple SAs
            if (saList.length > 1) return true;

            var res = true;
            for (var i = 0; i < saList.length; i++) {

                if (saList[i] && saList[i].id.indexOf('_dummy') > -1) {
                    res = false;
                    break;
                }

                var saItem = saList[i];
                if (!saItem || saItem.pinned || !saItem.isBundle) {
                    res = false;
                    break;
                }
            }
            return res;
        }
        function Unbundle_Invoke(saList, electedPolicyId) {
            //  if (Unbundle_CanInvoke(saList)){

            var doesDeleteEmptyBundles = void 0;
            var confirmText = void 0;

            BundleService.checkFieldAndRetrieveBoolean('ApptBundleConfig', 'DoesDeleteEmptyBundles').then(function (fieldValue) {
                doesDeleteEmptyBundles = fieldValue;
                confirmText = saList.length > 1 ? doesDeleteEmptyBundles ? customLabels.VerifyUnBundleActionMulti : 'Unbundling these service appointments removes all bundle members from the bundles and empty bundle service appointments remain. Do you want to continue?' :
                // : customLabels.VerifyUnBundleActionMultiEmpty)
                doesDeleteEmptyBundles ? customLabels.VerifyUnBundleAction : 'Unbundling this service appointment removes all bundle members from the bundle and an empty bundle service appointment remains. Do you want to continue?';
                // : customLabels.VerifyUnBundleActionEmpty);

                if (window.confirm(confirmText)) {
                    // bug chrome 92 W-9651771
                    var saIdsList = saList.map(function (saItem) {
                        return saItem.id;
                    });
                    return BundleService.unBundleServiceAppointment(saIdsList, saList, electedPolicyId);
                }
            });
            //  }
            var deffered = $q.defer();
            deffered.reject(null);
            return deffered.promise;
        }

        // This will be our factory
        return actions;
    }
})();