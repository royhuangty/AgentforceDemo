'use strict';

(function () {

    BundleService.$inject = ['$q', 'sfdcService', 'DeltaService', 'utils', '$timeout', 'TimePhasedDataService', '$rootScope', 'ServiceAppointmentLightboxService'];

    angular.module('serviceExpert').factory('BundleService', BundleService);

    function BundleService($q, sfdcService, DeltaService, utils, $timeout, TimePhasedDataService, $rootScope, ServiceAppointmentLightboxService) {

        function isActive() {
            if (isSchedulingBundlingEnabled === '0') return false;
            return isSchedulingBundlingEnabled ? true : false;
        }

        function isBundleMember(obj) {

            return obj.isBundleMember;
        }

        function isBundle(obj) {

            return obj.isBundle;
        }

        function bundleServiceAppointments(ids, electedPolicyId, fullSa) {

            var deffered = $q.defer();

            var saName = false;

            var idsArr = Array.isArray(ids) ? ids : [ids];

            if (idsArr.length === 0) {

                // will never get here ( stoped in popup )

                var toastObj = {
                    message: customLabels.BundleNotSelected,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                deffered.reject();
                return deffered.promise;
            }

            if (fullSa.length === 1) {

                saName = fullSa[0].name;
            }

            var queryString = window.location.search;
            var urlParams = new URLSearchParams(queryString);
            var urlToken = urlParams.get('token');

            sfdcService.callRemoteAction(RemoteActions.createBundleManually, idsArr, electedPolicyId, urlToken).then(function (res) {

                //  DeltaService.getDeltaPromise().then( deltaData => { 
                var resBundle = '';
                var resStatus = res.bundleStatus;

                var alertMsg = void 0;
                var notifyMsgUrl = void 0;

                if (res && res.error_msg && res.error_msg.indexOf('Setup->Security->Remote site settings') > -1) {
                    //  && res.STATUS_CODE == ''

                    try {

                        var urlArr = res.error_msg.split("/bundleflow");
                        alertMsg = urlArr[0] + ' or ask your Salesforce admin for help.';
                        notifyMsgUrl = urlArr[0].split('endpoint =')[1];
                    } catch (e) {

                        alertMsg = 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings';
                        notifyMsgUrl = 'the URL';
                    }

                    alert(alertMsg);

                    utils.addNotification(customLabels.BundleCreatedFailedNTitle, 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings to ' + notifyMsgUrl, function () {});

                    var _toastObj = {
                        message: customLabels.BundleCreationFailedM,
                        status: 'ERROR'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj);

                    deffered.resolve(resBundledMembers);
                    return;
                }

                if (res && res.debugMode) {
                    console.log('--createBundleManually--');
                    console.log(res);
                    for (var property in res) {
                        console.log(property + ': ' + res[property]);
                    }
                }

                if (res.bundle) {
                    // apex mode
                    resBundle = res.bundle;
                } else {
                    var bundleId = res.bundleId;
                    var AppointmentNumber = res.AppointmentNumber;
                    resBundle = { 'AppointmentNumber': AppointmentNumber, 'Id': bundleId };
                }

                var resBundledMembers = res.bundledMembers;

                if (resStatus == 'COMPLETE_BUNDLE') {

                    var contentMsg = String.format(customLabels.BundleSuccessfullyCreated, resBundle.AppointmentNumber);

                    utils.addNotification(customLabels.BundleCreatedNTitle, String.format(customLabels.BundleSuccessfullyCreated, resBundle.AppointmentNumber), function () {
                        ServiceAppointmentLightboxService.open(resBundle.Id);
                    });

                    var _toastObj2 = {
                        message: contentMsg,
                        status: 'SUCCESS',
                        f: function f(id) {
                            ServiceAppointmentLightboxService.open(id);
                        },
                        p: resBundle.Id
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj2);

                    deffered.resolve(resBundledMembers);
                    return;
                }

                var msg = '';

                if (saName) {

                    msg = String.format(customLabels.BundleCreationFailedSingle, saName);
                } else {

                    msg = customLabels.BundleCreationFailedM;
                }

                var toastMsg = msg;

                if (res.shortMsg && res.shortMsg != '') {
                    toastMsg = res.shortMsg;
                }

                var toastObj = {
                    message: toastMsg,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                var notificationsMsg = msg;

                if (res.longMsg && res.longMsg != '') {
                    notificationsMsg = res.longMsg;
                }

                utils.addNotification(customLabels.BundleCreatedFailedNTitle, notificationsMsg, function () {});

                deffered.reject(res.bundleStatus);

                return;
            }).catch(function (err) {

                var msg = '';
                if (saName) {

                    msg = String.format(customLabels.BundleCreationFailedSingle, saName);
                } else {

                    msg = customLabels.BundleCreationFailedM;
                }

                var toastMsg = msg;

                // if(res.shortMsg && res.shortMsg != '') {
                //     toastMsg = res.shortMsg;
                // }


                var toastObj = {
                    message: toastMsg,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                utils.addNotification(customLabels.BundleCreatedFailedNTitle, msg, function () {});

                console.warn(err);
                deffered.reject(err);
            });

            return deffered.promise;
        }

        ////
        function updateBundleServiceAppointments(ids, electedPolicyId, bId, bName) {

            var idsArr = Array.isArray(ids) ? ids : [ids];

            var deffered = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.updateBundleManually, idsArr, electedPolicyId, bId).then(function (res) {

                var alertMsg = void 0;
                var notifyMsgUrl = void 0;

                if (res && res.error_msg && res.error_msg.indexOf('Setup->Security->Remote site settings') > -1) {
                    //  && res.STATUS_CODE == ''

                    try {

                        var urlArr = res.error_msg.split("/bundleflow");
                        alertMsg = urlArr[0] + ' or ask your Salesforce admin for help.';
                        notifyMsgUrl = urlArr[0].split('endpoint =')[1];
                    } catch (e) {

                        alertMsg = 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings';
                        notifyMsgUrl = 'the URL';
                    }

                    alert(alertMsg);

                    utils.addNotification(customLabels.BundleUpdateFailedNT, 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings to ' + notifyMsgUrl, function () {});

                    var _toastObj3 = {
                        message: customLabels.BundleUpdateFailedNT,
                        status: 'ERROR'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj3);

                    deffered.resolve(resBundledMembers);
                    return;
                }

                if (res && res.debugMode) {

                    console.log('+++');
                    console.log(res);

                    for (var property in res) {
                        console.log(property + ': ' + res[property]);
                    }
                }

                //  DeltaService.getDeltaPromise().then( deltaData => { 

                // updatedGanttServices sould have resBundle.Id

                var resStatus = res.bundleStatus;
                var resBundle = void 0;

                if (res.bundle) {
                    // apex mode
                    resBundle = res.bundle;
                } else {
                    var bundleId = res.bundleId;
                    var AppointmentNumber = res.AppointmentNumber;
                    resBundle = { 'AppointmentNumber': AppointmentNumber, 'Id': bundleId };
                }

                var resBundledMembers = res.bundledMembers;

                if (resStatus == 'COMPLETE_BUNDLE') {

                    var contentMsg = String.format(customLabels.BundleUpdateSuccessfully, bName);
                    var headerMsg = customLabels.BundleUpdateSuccessfullyNT;

                    utils.addNotification(headerMsg, contentMsg, function () {
                        ServiceAppointmentLightboxService.open(bId);
                    });

                    var _toastObj4 = {
                        message: contentMsg,
                        status: 'SUCCESS',
                        f: function f(id) {
                            ServiceAppointmentLightboxService.open(id);
                        },
                        p: resBundle.Id
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj4);

                    deffered.resolve(resBundledMembers);
                    return;
                }

                // not COMPLETE_BUNDLE or PARTIAL_BUNDLE ==> error

                var toastMsg = String.format(customLabels.BundleUpdateFailed, bName);

                if (res.shortMsg && res.shortMsg != '') {
                    toastMsg = res.shortMsg;
                }

                var toastObj = {
                    message: toastMsg,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                var notificationsMsg = String.format(customLabels.BundleUpdateFailed, bName);

                if (res.longMsg && res.longMsg != '') {
                    notificationsMsg = res.longMsg;
                }

                utils.addNotification(customLabels.BundleUpdateFailedNT, notificationsMsg, function () {});

                deffered.reject(res.bundleStatus);

                return;
            }).catch(function (err) {

                var toastObj = {
                    message: String.format(customLabels.BundleUpdateFailed, bName),
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                utils.addNotification(customLabels.BundleUpdateFailedNT, String.format(customLabels.BundleUpdateFailed, bName), function () {});

                deffered.reject(err);
            });

            return deffered.promise;
        }

        function unBundleServiceAppointment(ids, saList, electedPolicyId) {

            var deffered = $q.defer();

            var idsArr = Array.isArray(ids) ? ids : [ids];

            if (idsArr.length === 0) {

                var toastObj = {
                    message: customLabels.UnbundledNotSelected,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                utils.addNotification(customLabels.FailedUnbundledNT, customLabels.UnbundledNotSelected, function () {});

                deffered.reject();
                return deffered.promise;
            }

            var ubName = false;

            if (saList.length === 1) {

                ubName = saList[0].name;
            }

            var namesArr = [];
            var contentMsg = '';
            var nameStr = '';

            sfdcService.callRemoteAction(RemoteActions.unbundleManually, idsArr, electedPolicyId).then(function (res) {

                var alertMsg = void 0;
                var notifyMsgUrl = void 0;

                if (res && res.error_msg && res.error_msg.indexOf('Setup->Security->Remote site settings') > -1) {
                    //  && res.STATUS_CODE == ''

                    try {

                        var urlArr = res.error_msg.split("/bundleflow");
                        alertMsg = urlArr[0] + ' or ask your Salesforce admin for help.';
                        notifyMsgUrl = urlArr[0].split('endpoint =')[1];
                    } catch (e) {

                        alertMsg = 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings';
                        notifyMsgUrl = 'the URL';
                    }

                    alert(alertMsg);

                    utils.addNotification(customLabels.FailedUnbundledM, 'Ask your Salesforce admin to update the URL in Setup > Security > Remote Site Settings to ' + notifyMsgUrl, function () {});

                    var _toastObj5 = {
                        message: customLabels.FailedUnbundledM,
                        status: 'ERROR'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj5);

                    deffered.resolve(resBundledMembers);
                    return;
                }

                if (res && res.debugMode) {
                    console.log('--unbundle---');
                    console.log(res);
                    for (var property in res) {
                        console.log(property + ': ' + res[property]);
                    }
                }

                // check rules if not "on demand" mode
                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.getDelta(shouldCheckRules);

                var resStatus = res.unbundleStatus;
                var resUnBundle = res.unbundle;

                // multi
                if (resStatus == 'STATUS_MULTI_UNBUNDLE_COMPLETE') {

                    var _toastMsg = customLabels.SuccessfullyUnbundledM;

                    var _toastObj6 = {
                        message: _toastMsg,
                        status: 'SUCCESS'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj6);

                    var _notificationsMsg = customLabels.SuccessfullyUnbundledM; //customLabels.FailedUnbundledM;

                    utils.addNotification(customLabels.SuccessfullyUnbundledNT, _notificationsMsg, function () {});

                    deffered.reject(res.bundleStatus);

                    return;
                }
                if (resStatus == 'STATUS_MULTI_UNBUNDLE_FAILED') {

                    var _toastMsg2 = customLabels.FailedUnbundledM;

                    var _toastObj7 = {
                        message: _toastMsg2,
                        status: 'ERROR'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj7);

                    var _notificationsMsg2 = customLabels.FailedUnbundledM;

                    utils.addNotification(customLabels.FailedUnbundledNTM, _notificationsMsg2, function () {});

                    deffered.reject(res.bundleStatus);

                    return;
                }
                if (resStatus == 'STATUS_MULTI_UNBUNDLE_PARTIAL') {

                    var _toastMsg3 = customLabels.PartialUnbundledM;

                    var _toastObj8 = {
                        message: _toastMsg3,
                        status: 'ERROR'
                    };

                    $rootScope.$broadcast('showServiceExpertToast', _toastObj8);

                    var _notificationsMsg3 = customLabels.PartialUnbundledM;

                    utils.addNotification(customLabels.FailedUnbundledNT, _notificationsMsg3, function () {});

                    deffered.reject(res.bundleStatus);

                    return;
                }
                // multi

                if (resStatus == 'COMPLETE_UNBUNDLE') {

                    if (res.AppointmentNumber) {
                        // falcon mode

                        namesArr.push(res.AppointmentNumber);
                    } else {

                        Object.keys(resUnBundle).map(function (k) {
                            if (resUnBundle[k] && resUnBundle[k].AppointmentNumber) {
                                namesArr.push(resUnBundle[k].AppointmentNumber);
                            }
                        });
                    }

                    if (namesArr.length > 1) {
                        contentMsg = customLabels.SuccessfullyUnbundledM;
                    } else {
                        nameStr = namesArr[0];
                        contentMsg = String.format(customLabels.SuccessfullyUnbundled, nameStr);
                    }

                    var _toastObj9 = {
                        message: contentMsg,
                        status: 'SUCCESS'
                    };
                    $rootScope.$broadcast('showServiceExpertToast', _toastObj9);

                    utils.addNotification(customLabels.SuccessfullyUnbundledNT, contentMsg, function () {});

                    deffered.resolve(resUnBundle);
                    return;
                }

                // FAILED
                // getting the names from the the request

                // Object.keys(saList).map(k => {
                //     if (saList[k] && saList[k].AppointmentNumber) {
                //         namesArr.push(saList[k].AppointmentNumber);
                //     }
                // });

                // if(namesArr.length > 1) {
                //     contentMsg =  customLabels.FailedUnbundledM;
                // } else {
                //     nameStr = namesArr[0];
                //     contentMsg = String.format(customLabels.FailedUnbundled, nameStr);
                // }

                // let toastObj = {
                //     message: contentMsg,
                //     status: 'ERROR'
                // }


                var toastMsg = '';

                if (res.shortMsg && res.shortMsg != '') {
                    toastMsg = res.shortMsg;
                }

                var toastObj = {
                    message: toastMsg,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                var notificationsMsg = '';

                if (res.longMsg && res.longMsg != '') {
                    notificationsMsg = res.longMsg;
                }

                utils.addNotification(customLabels.FailedUnbundledNT, notificationsMsg, function () {});

                // $rootScope.$broadcast('showServiceExpertToast', toastObj);

                // utils.addNotification(customLabels.FailedUnbundledNT, contentMsg, function () {});

                deffered.reject(resUnBundle);

                return;
            }).catch(function (err) {

                console.warn(err);

                Object.keys(saList).map(function (k) {
                    if (saList[k] && saList[k].AppointmentNumber) {
                        namesArr.push(saList[k].AppointmentNumber);
                    }
                });

                if (namesArr.length > 1) {
                    contentMsg = customLabels.FailedUnbundledM, nameStr;
                } else {
                    nameStr = namesArr[0];
                    contentMsg = String.format(customLabels.FailedUnbundled, nameStr);
                }

                var toastObj = {
                    message: contentMsg,
                    status: 'ERROR'
                };

                $rootScope.$broadcast('showServiceExpertToast', toastObj);

                utils.addNotification(customLabels.FailedUnbundledNT, contentMsg, function () {});

                deffered.reject(err);
            });

            return deffered.promise;
        }

        /// In case the given SA is bundel member- the method returns its parent bundle SA.
        function verifyShowSaOnGantt(originalSa) {
            if (!isActive() || !originalSa) return originalSa;
            var retrievedSa = originalSa; //TimePhasedDataService.serviceAppointments()[originalId];
            if (isActive() && isBundleMember(retrievedSa)) {
                retrievedSa = TimePhasedDataService.serviceAppointments()[retrievedSa.RelatedBundle];
            }
            return retrievedSa;
        }

        function checkFieldAndRetrieveBoolean(objectName, fieldName) {
            var deferred = $q.defer();

            if (!objectName || !fieldName) {
                deferred.reject("Object or Field name not provided.");
                return deferred.promise;
            }

            sfdcService.callRemoteAction(RemoteActions.checkFieldExistsAndGetValue, objectName, fieldName).then(function (res) {
                if (res.fieldExists) {
                    var fieldValue = res.fieldValue;
                    deferred.resolve(fieldValue);
                } else {
                    var errorMsg = res.errorMessage || "Field does not exist on the object.";
                    deferred.reject(errorMsg);
                }
            }).catch(function (err) {
                console.error("Error in Remote Action:", err);
                deferred.reject(err);
            });

            return deferred.promise;
        }

        // This will be our factory
        return {
            isBundleMember: isBundleMember,
            isBundle: isBundle,
            isActive: isActive,
            bundleServiceAppointments: bundleServiceAppointments,
            updateBundleServiceAppointments: updateBundleServiceAppointments,
            unBundleServiceAppointment: unBundleServiceAppointment,
            verifyShowSaOnGantt: verifyShowSaOnGantt,
            checkFieldAndRetrieveBoolean: checkFieldAndRetrieveBoolean
        };
    }
})();