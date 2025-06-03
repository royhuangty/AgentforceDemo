'use strict';

(function () {

    BundlerAddCreateLightboxService.$inject = ['$q', '$timeout', '$filter', '$compile', 'ServiceAppointmentLightboxService', 'BundleService', '$rootScope', 'TimePhasedDataService', 'userSettingsManager', 'StateService', 'utils', 'sfdcService'];

    angular.module('serviceExpert').factory('BundlerAddCreateLightboxService', BundlerAddCreateLightboxService);

    function BundlerAddCreateLightboxService($q, $timeout, $filter, $compile, ServiceAppointmentLightboxService, BundleService, $rootScope, TimePhasedDataService, userSettingsManager, StateService, utils, sfdcService) {

        var $scope = null;
        var df = void 0;
        var MAX_SA = 200; // 200

        var ERROR_NO_POLICY_SELECTED = 1;
        var ERROR_NO_BUNDLE_SELECTED = 2;
        var ERROR_NO_POLICY = 3;
        var ERROR_MAX_SA_SELECTED = 4;
        var ERROR_NO_SA_SELECTED = 5;
        var ERROR_NO_BUNDLE_EXIST = 6;

        // used for bundle server search
        function getWorkTypeData() {

            sfdcService.callRemoteAction(RemoteActions.getWorkTypes, $scope.WorkTypeIds).then(function (res) {

                res.forEach(function (w) {
                    $scope.workTypes[w['Id']] = w['Name'];
                });
                $scope.bundlersView.forEach(function (e) {
                    e.workTypesText = $scope.workTypes[e.Fields.WorkTypeId];
                });
            });
        }

        // used for bundle server search
        function getSkill() {

            sfdcService.callRemoteAction(RemoteActions.getWorkOrders, $scope.WorkOrderIds).then(function (res) {

                res.forEach(function (w) {
                    if (w && w.SkillRequirements) {
                        $scope.skills[w.Id] = [];
                        for (var i = 0; i < w.SkillRequirements.length; i++) {
                            $scope.skills[w.Id] = $scope.skills[w.Id] || [];
                            $scope.skills[w.Id].push(w.SkillRequirements[i].Skill.MasterLabel);
                        }
                    }
                });

                $scope.bundlersView.forEach(function (e) {
                    if ($scope.skills && $scope.skills[e.parentRecord]) {
                        e.SkillText = $scope.skills[e.parentRecord].join(',');
                    }
                });
            });
        }

        // open the UI
        function open(sa, selectedPolicyId) {

            // create new isolated scope
            $scope = $rootScope.$new(true);
            $scope.deffered = $q.defer();
            df = $scope.deffered;

            $scope.lightboxServices = sa;
            $scope.mode = 'NEW';
            $scope.serverSearchDisabled = false;
            $scope.errorMode = 0;
            $scope.showErrorPopupVar = 0;
            $scope.errorMsg = customLabels.ReviewBundleErrors;
            $scope.errorMsgMissing = '';

            $scope.isNativeMode = true;
            $scope.workTypes = {};
            $scope.fullSaAll = {};

            $scope.openTableMode1 = 3;
            $scope.openTableMode2 = 1;

            $scope.selectedAddSa = undefined;
            $scope.data = {};
            $scope.data.searchText = '';

            $scope.skills = {};

            $scope.WorkTypeIds = [];
            $scope.WorkOrderIds = [];

            sa.forEach(function (s) {
                s.earlyStartView = $filter('amDateFormat')(s.earlyStart, 'l LT');
                s.dueDateView = $filter('amDateFormat')(s.dueDate, 'l LT');
                $scope.WorkTypeIds.push(s['fields'].WorkTypeId);
                $scope.WorkOrderIds.push(s.ParentRecordId);
            });

            for (var _sa in TimePhasedDataService.serviceAppointments()) {

                var currentSA = TimePhasedDataService.serviceAppointments()[_sa];

                if (currentSA && currentSA.isBundle && currentSA['fields'] && currentSA['fields'].WorkTypeId) {
                    $scope.WorkTypeIds.push(currentSA['fields'].WorkTypeId);
                };

                if (currentSA && currentSA.isBundle && currentSA['fields'] && currentSA['fields'].ParentRecordId) {
                    $scope.WorkOrderIds.push(currentSA['fields'].ParentRecordId);
                };
            }

            sfdcService.callRemoteAction(RemoteActions.getWorkTypes, $scope.WorkTypeIds).then(function (res) {

                res.forEach(function (w) {

                    $scope.workTypes[w['Id']] = w['Name'];
                });

                $scope.showData2 = true;

                ///
                $scope.lightboxServices.forEach(function (e) {
                    e.workTypesText = $scope.workTypes[e.fields.WorkTypeId];
                });

                $scope.lightboxServices.forEach(function (e) {
                    e.addrText = e.City + ' ' + e.Street;
                });
            });

            sfdcService.callRemoteAction(RemoteActions.getWorkOrders, $scope.WorkOrderIds).then(function (res) {

                res.forEach(function (w) {
                    if (w && w.SkillRequirements) {

                        for (var i = 0; i < w.SkillRequirements.length; i++) {
                            $scope.skills[w.Id] = $scope.skills[w.Id] || [];
                            $scope.skills[w.Id].push(w.SkillRequirements[i].Skill.MasterLabel);
                        }
                    }
                });

                $scope.lightboxServices.forEach(function (e) {
                    if ($scope.skills && $scope.skills[e.parentRecord]) {
                        e.SkillText = $scope.skills[e.parentRecord].join(',');
                    }
                });

                $scope.bundlersView.forEach(function (e) {
                    if ($scope.skills && $scope.skills[e.parentRecord]) {
                        e.SkillText = $scope.skills[e.parentRecord].join(',');
                    }
                });
                $scope.showData = true;
            });

            function setOrderreverse(newOrder, table) {

                if (table == 1) {
                    if ($scope.tabe1order == newOrder) {
                        $scope.table1reverse = !$scope.table1reverse;
                    } else {
                        $scope.table1reverse = false;
                        $scope.tabe1order = newOrder;
                    }
                    return;
                }

                if ($scope.tabe2order == newOrder) {
                    $scope.table2reverse = !$scope.table2reverse;
                } else {
                    $scope.table2reverse = false;
                    $scope.tabe2order = newOrder;
                }
            }

            function showErrorPopup() {
                $scope.showErrorPopupVar = !$scope.showErrorPopupVar;
            }

            // removed checkBundleConfig. Dispatcher user cant see checkBundleConfig
            // sfdcService.callRemoteAction(RemoteActions.checkBundleConfig).then(res => {

            //     if(res == false) {

            //         $scope.errorMode = ERROR_NO_POLICY;
            //         $scope.errorMsgMissing = customLabels.NoBundleConfig;

            //         $timeout(() => {
            //             $scope.showErrorPopupVar = 1;
            //         }, 500);
            //     }

            // });


            sfdcService.callRemoteAction(RemoteActions.getBundleApexMode).then(function (res) {

                $scope.isNativeMode = res;

                if (!res) {

                    sfdcService.callRemoteAction(RemoteActions.getBundlePolicy).then(function (res) {

                        $scope.bundlerPolicyArr = [];
                        $scope.bundlerPolicyMap = {};

                        if (res.length == 0 && $scope.errorMode != ERROR_NO_POLICY) {

                            $scope.errorMode = ERROR_NO_POLICY;
                            $scope.errorMsgMissing = customLabels.NoBundlePolicies;
                            $timeout(function () {
                                $scope.showErrorPopupVar = 1;
                            }, 500);
                            // $scope.bundlerPolicyArr.push( 'No Bundle Policies. Please create a Bundle Policy.'  );
                        }

                        res.forEach(function (w) {

                            shortPolicyName = w['Name'].length > 36 ? w['Name'].substring(0, 33) + '...' : w['Name'];

                            $scope.bundlerPolicyNamesMapLookup[shortPolicyName] = w['Name'];

                            $scope.bundlerPolicyArr.push(shortPolicyName);
                            $scope.bundlerPolicyMapLookup[shortPolicyName] = w['Id'];
                            $scope.bundlerPolicyMap[w['Id']] = shortPolicyName;
                        }, function (err) {
                            console.error(err);
                        });
                    });
                }
            });

            $scope.selectedValue = 'cleared';
            $scope.cleared = false;
            $scope.fraudulent = false;
            $scope.reviewed = false;
            $scope.selectedPolicyId = selectedPolicyId;
            $scope.selectedSa = {};
            $scope.lightboxServices.forEach(function (e) {
                $scope.selectedSa[e.id] = true;
                $scope.fullSaAll[e.id] = e;
            });

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                    df.reject('closed');
                }
            });

            $scope.bundlers = [];
            $scope.bundlersView = [];
            $scope.bundlersIds = [];

            $scope.bundlerPolicyMap = {};
            $scope.bundlerPolicyMapLookup = {};
            $scope.bundlerPolicyNamesMapLookup = {};
            $scope.bundlerPolicyArr = [];

            $scope.bundledMap = {};
            var shortPolicyName = '';

            $scope.tabe1order = 'name';
            $scope.table1reverse = false;
            $scope.tabe2order = 'name';
            $scope.table2reverse = false;

            // Get the bundled sa 
            for (var _sa2 in TimePhasedDataService.serviceAppointments()) {

                var _currentSA = TimePhasedDataService.serviceAppointments()[_sa2];

                if (_currentSA.isBundle) {
                    $scope.bundledMap[_currentSA.id] = _currentSA;
                };
            }

            // for (let sa2 in TimePhasedDataService.serviceAppointments()) { 

            //     const currentSA = TimePhasedDataService.serviceAppointments()[sa2]; 

            //     if (currentSA.IsBundleMember) { 

            //         $scope.bundledMap[currentSA.RelatedBundle] = $scope.bundledMap[currentSA.RelatedBundle] || {};

            //     }; 
            // }

            for (var b in $scope.bundledMap) {
                $scope.bundledMap[b].earlyStartView = $filter('amDateFormat')($scope.bundledMap[b].earlyStart, 'l LT');
                $scope.bundledMap[b].dueDateView = $filter('amDateFormat')($scope.bundledMap[b].dueDate, 'l LT');
            };

            $scope.bundlers = [];
            for (var _b in $scope.bundledMap) {
                $scope.bundlers.push($scope.bundledMap[_b]);
                $scope.bundlersIds.push(_b);
            }

            $scope.bundlers.forEach(function (elem) {
                if (elem && elem.AppointmentNumber) $scope.bundlersView.push(elem);
            });

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#BundlerLightbox').draggable({ containment: 'document', handle: '#BundlerLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            $scope.closeLightbox = closeLightbox;
            $scope.setMode = setMode;
            $scope.apply = apply;
            $scope.clearError = clearError;
            $scope.toggleSelection = toggleSelection;
            $scope.toggleAddSelection = toggleAddSelection;
            $scope.search = search;
            $scope.serverSearch = serverSearch;
            $scope.clearSearch = clearSearch;
            $scope.allSelection = allSelection;
            $scope.nonSelected = nonSelected;
            $scope.getAllSelected = getAllSelected;
            $scope.editSa = editSa;
            $scope.checkMax = checkMax;
            $scope.selectedCount = selectedCount;
            $scope.setOrderreverse = setOrderreverse;
            $scope.showErrorPopup = showErrorPopup;
            $scope.closeOpenTable = closeOpenTable;

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // compile
            $compile(lightboxDomElement)($scope);

            // show lightbox
            lightboxDomElement.show();
            StateService.setLightBoxStatus(); // set lightbox state to open

            checkMax();

            return $scope.deffered.promise;
        }

        function closeOpenTable(elem) {

            if (elem == 1) {
                $scope.openTableMode1 = $scope.openTableMode1 + 2;
                if ($scope.openTableMode1 > 3) {
                    $scope.openTableMode1 = 1;
                }
                $scope.openTableMode2 = 4 - $scope.openTableMode1;
            }
            if (elem == 2) {
                $scope.openTableMode2 = $scope.openTableMode2 + 2;
                if ($scope.openTableMode2 > 3) {
                    $scope.openTableMode2 = 1;
                }
                $scope.openTableMode1 = 4 - $scope.openTableMode2;
            }
        }

        // close lightbox
        function closeLightbox(applied) {
            StateService.setLightBoxStatus(false); // set lightbox state to close
            $scope.$destroy();
            if (!applied) {
                $scope.deffered.reject('closed');
            }

            //   df.reject('closed'); // this will remove the loading animation when the popup is closed but the btn will be active again.
        }

        function selectedCount() {

            var count = 0;
            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    count++;
                }
            });
            return count;
        }

        function checkMax() {

            if ($scope.errorMode == ERROR_MAX_SA_SELECTED) {
                $scope.errorMode = 0;
                $scope.showErrorPopupVar = 0;
            }

            if ($scope.errorMode) {
                return;
            }

            var count = selectedCount();

            if (count > MAX_SA) {
                // MAX_SA

                $scope.errorMode = ERROR_MAX_SA_SELECTED;
                $timeout(function () {
                    $scope.showErrorPopupVar = 1;
                }, 500);
                var str = customLabels.SelectedServiceAppointmentMax;
                str = str.replace("(0)", MAX_SA);
                $scope.errorMsg = str.replace("(1)", count - MAX_SA);
            }
        }

        function setMode(mode) {
            $scope.mode = mode;
        }

        function editSa(id) {
            ServiceAppointmentLightboxService.open(id);
        }

        function toggleAddSelection(saId, apNumber) {

            $scope.selectedAddSa = saId;
            $scope.apNumber = apNumber;

            $scope.clearError();
        }

        function toggleSelection(saId) {

            $scope.selectedSa[saId] = !$scope.selectedSa[saId];

            checkMax();
        }

        function getAllSelected() {

            var allSelected = true;

            Object.keys($scope.selectedSa).map(function (key) {
                if (!$scope.selectedSa[key]) {
                    allSelected = false;
                }
            });
            return allSelected;
        }

        function clearSearch() {

            $scope.data.searchText = '';
            $scope.bundlersView = [];

            $scope.bundlers.forEach(function (elem) {
                if (elem && elem.AppointmentNumber) $scope.bundlersView.push(elem);
            });
        }

        function serverSearch() {

            var s = $scope.data.searchText || '';
            $scope.serverSearchDisabled = true;

            if (s == '') {

                $timeout(function () {
                    $scope.serverSearchDisabled = false;
                }, 500);

                return;
            }

            sfdcService.callRemoteAction(RemoteActions.bundleServerSearch, s).then(function (res) {

                $scope.serverSearchDisabled = false;
                var date = void 0;

                if (res && res.length > 0) {

                    res.forEach(function (s) {

                        if (s['fields'] == undefined && s['Fields'] != undefined) {
                            s['fields'] = {};
                            for (var f in s['Fields']) {
                                s['fields'][f] = s['Fields'][f];
                            };
                        }

                        if (s['Fields'] == undefined && s['fields'] != undefined) {
                            s['Fields'] = {};
                            for (var _f in s['fields']) {
                                s['Fields'][_f] = s['fields'][_f];
                            };
                        }

                        date = new Date(s['Fields'].DueDate);
                        var dueDate = date.toLocaleString(undefined, { timeZone: 'UTC' });

                        date = new Date(s['Fields'].EarliestStartTime);
                        var early = date.toLocaleString(undefined, { timeZone: 'UTC' });
                        s.id = s.Id;
                        s.parentRecord = s['Fields'].ParentRecordId;
                        s.DurationInMinutes = s['Fields'].DurationInMinutes;
                        s.earlyStartView = $filter('amDateFormat')(early, 'l LT');
                        s.dueDateView = $filter('amDateFormat')(dueDate, 'l LT');
                        s.AppointmentNumber = s.name = s['Fields'].AppointmentNumber;

                        s.City = s['Fields'].City;
                        s.Street = s['Fields'].Street;
                        s.accountName = s['Fields']['Account.Name'];

                        if (s['Fields'] && s['Fields'].WorkTypeId) $scope.WorkTypeIds.push(s['Fields'].WorkTypeId);

                        if (s['Fields'] && s['Fields'].ParentRecordId) $scope.WorkOrderIds.push(s['Fields'].ParentRecordId);
                    });

                    $scope.bundlersView = [res[0]];

                    getSkill();
                    getWorkTypeData();
                }
            });
        }

        function search() {

            var s = $scope.data.searchText || '';
            $scope.bundlersView = [];
            $scope.bundlers.forEach(function (elem) {
                if (s == '' || s == undefined || elem['name'] == undefined || elem['name'].indexOf(s) > -1) {
                    // elem['SchedStartTime'].indexOf(s) > -1 ) { 
                    // elem['nunOfMembers'] == s  ) {
                    if (elem && elem.AppointmentNumber) $scope.bundlersView.push(elem);
                }
            });
        }

        function nonSelected() {

            var nonSelected = true;

            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    nonSelected = false;
                }
            });

            if ((!$scope.data.selectedBundlePolicy || !$scope.bundlerPolicyMapLookup[$scope.data.selectedBundlePolicy]) && $scope.mode === 'NEW') {
                nonSelected = true;
            }

            if ($scope.isNativeMode && $scope.mode === 'NEW') {
                nonSelected = false;
            }

            return nonSelected;
        }

        function allSelection() {

            if ($scope.getAllSelected()) {

                $scope.lightboxServices.forEach(function (e) {
                    $scope.selectedSa[e.id] = false;
                });
            } else {

                $scope.lightboxServices.forEach(function (e) {
                    $scope.selectedSa[e.id] = true;
                });
            }

            checkMax();
        }

        // $scope.$watch('searchText', function (newVal, oldVal) { 
        //     if(newVal != oldVal) {
        //         $scope.search();
        //     }
        // });

        // function search() {
        //     let s = $scope.data.searchText || '';
        //     console.log(s);
        //     $scope.bundlersView = [];
        //     $scope.bundlers.forEach( elem => {
        //         if(s == '' || 
        //         s == undefined || 
        //         elem['name'].indexOf(s) > -1 ||
        //         elem['SchedStartTime'].indexOf(s) > -1 ||
        //         elem['nunOfMembers'] == s  ) {
        //             $scope.bundlersView.push(elem);
        //         }

        //     });

        // }
        function clearError() {

            if ($scope.errorMode == ERROR_NO_POLICY) {
                return;
            }

            $scope.errorMode = 0;
            $scope.showErrorPopupVar = 0;

            checkMax();
        }

        function apply() {

            if ($scope.errorMode == ERROR_NO_POLICY || $scope.errorMode == ERROR_MAX_SA_SELECTED) {
                return;
            }

            if (selectedCount() == 0) {

                $scope.errorMode = ERROR_NO_SA_SELECTED;
                $scope.errorMsg = customLabels.ReviewBundleErrors; //customLabels.BundleNotSelected;
                $timeout(function () {
                    $scope.showErrorPopupVar = 1;
                }, 500);
                return;
            }

            $scope.errorMsg = customLabels.ReviewBundleErrors;

            $scope.errorMode = 0;
            $scope.showErrorPopupVar = 0;

            var policyId = $scope.isNativeMode ? $scope.selectedPolicyId : $scope.bundlerPolicyMapLookup[$scope.data.selectedBundlePolicy]; // if demo policy from opened , else from dropdown

            var existingSelectedBundler = $scope.selectedAddSa;
            var existingBundler = $scope.bundlers.length != 0 || $scope.bundlersView.length != 0;
            var apNumber = $scope.apNumber;

            var saIdsList = [];
            var fullSa = [];

            Object.keys($scope.selectedSa).map(function (key) {
                if ($scope.selectedSa[key]) {
                    saIdsList.push(key);
                    fullSa.push($scope.fullSaAll[key]);
                }
            });

            if ($scope.mode == 'NEW') {

                if (policyId == undefined && $scope.isNativeMode == false) {
                    $scope.errorMode = ERROR_NO_POLICY_SELECTED;
                    $timeout(function () {
                        $scope.showErrorPopupVar = 1;
                    }, 500);
                    return;
                }

                BundleService.bundleServiceAppointments(saIdsList, policyId, fullSa).then(function (res) {

                    console.log(res);
                    df.resolve(res);
                }, function () {

                    df.reject('closed');
                });
            } else {
                // update mode

                if (!existingBundler) {
                    $scope.errorMode = ERROR_NO_BUNDLE_EXIST;
                    $timeout(function () {
                        $scope.showErrorPopupVar = 1;
                    }, 500);
                    return;
                }

                if (existingSelectedBundler == undefined) {
                    $scope.errorMode = ERROR_NO_BUNDLE_SELECTED;
                    $timeout(function () {
                        $scope.showErrorPopupVar = 1;
                    }, 500);
                    return;
                }

                BundleService.updateBundleServiceAppointments(saIdsList, null, existingSelectedBundler, apNumber).then(function (res) {

                    df.resolve(res);
                }, function () {

                    df.reject('closed');
                });
            }

            closeLightbox(true);
        }

        // DOM element
        function generateTemplate() {

            return angular.element('\n            <style>\n                .searchServerBtn:hover {\n                    background: #f4f6f9 !important;\n                }\n            </style>\n                <div class="LightboxBlackContainer" id="createUpdateBundlePopup" >\n                    <div id="BundlerLightbox" class="LightboxContainer">\n\n                        <div class="lightboxHeaderContainer" id="BundlerLightboxHeader">\n                            <svg ng-click="closeLightbox(false)" aria-hidden="true" class="slds-icon CloseLightbox" fsl-key-press tabindex="0">\n                                <use xlink:href="' + lsdIcons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header">' + customLabels.BundleCaption + '</h1>\n                        </div>\n\n                        <div class="lightboxContentContainer">\n\n                       <div  ng-show="false" class=\'slds-theme_error bundle-error\'> \n                            <svg aria-hidden="true" class="slds-icon bundler-error-icon">\n                                        <use xlink:href="' + lsdIcons.violation + '"></use>\n                                    </svg>\n                         {{errorMsg}}\n                        </div> \n                       \n\n                            <p class="saHeader">{{selectedCount()}} ' + customLabels.SelectedServiceAppointment + '    <span  ng-class="{\'tableDivIconOpen\': openTableMode1==3}" class="openCloseTable fa fa-angle-left"  ng-click="closeOpenTable(1)" ></span></p>\n                            <div  ng-if="errorMode == 5" class="field-required-lable"> ' + customLabels.BundleNotSelected + '</div>\n                            <div class="tableDiv slds"  ng-class="{\'tableDivClose\': openTableMode1==1, \'tableDivBig\': openTableMode1==3}">\n                                \n                                <table id="saTable" class="slds slds-table slds-table_cell-buffer slds-table_bordered" >\n                                        <thead>\n                                        <tr class="slds slds-line-height_reset">\n                                        <th><input ng-checked="getAllSelected()" ng-click="allSelection()" type="checkbox" > </th>\n                                        <th ng-click="setOrderreverse(\'name\',1);">' + customLabels.SANumberHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'name\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'name\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>\n                                        </th>\n                                        <th ng-click="setOrderreverse(\'DurationInMinutes\',1)">' + customLabels.DurationHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'DurationInMinutes\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'DurationInMinutes\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>    \n                                        </th>\n                                        <th ng-click="setOrderreverse(\'addrText\',1)">' + customLabels.AddressHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'addrText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'addrText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>    \n                                        </th>\n\n\n                                        <th ng-click="setOrderreverse(\'earlyStartView\',1)">' + customLabels.EarlyStartHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'earlyStartView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'earlyStartView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>\n                                        </th>\n\n                                        <th ng-click="setOrderreverse(\'dueDateView\',1)">' + customLabels.DueDateHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'dueDateView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'dueDateView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>\n\n                                        </th>\n\n                                        <th ng-click="setOrderreverse(\'workTypesText\',1)">' + customLabels.WorkTypeHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'workTypesText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'workTypesText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>\n                                        </th>\n\n                                        <th ng-click="setOrderreverse(\'accountName\',1)">' + customLabels.AccountHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'accountName\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'accountName\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                             </div>   \n                                        </th>\n\n                                        <th ng-click="setOrderreverse(\'SkillText\',1)">' + customLabels.RequiredSkillsHeader + '\n                                            <div class="bundleArrowSpace">\n                                                <svg ng-show ="table1reverse && tabe1order == \'SkillText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                                </svg>\n                                                <svg ng-show ="!table1reverse && tabe1order == \'SkillText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                    <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                                </svg>\n                                            </div>\n                                        </th>\n\n                                        </tr>\n\n                                        </thead>\n                                        <tbody class=\'slds slds-tbody\'> \n                                        <tr class="slds slds-hint-parent dataRow maxHight30" ng-repeat="sa in lightboxServices | orderBy:tabe1order:table1reverse " >   \n                                        <td class="Width20">\n                                        <input ng-checked="showData && showData2 && selectedSa[sa.id]" ng-click="toggleSelection(sa.id)" type="checkbox" value="{{sa.id}}">\n                                        </td> \n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.name}}">\n                                                <a class="saLink ng-click="" target="_blank" href="../{{ sa.id }}" title="{{sa.name}}">{{showData && showData2 ? sa.name : \'\'}}</a>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.DurationInMinutes}}">\n                                                <span class="">{{showData && showData2 ? sa.DurationInMinutes : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.City + \' \' + sa.Street}}">\n                                                <span class="">{{showData && showData2 ? sa.City + \' \' + sa.Street : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.earlyStartView}}" ng-bind="showData && showData2 ? sa.earlyStartView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.dueDateView}}" ng-bind="showData && showData2 ? sa.dueDateView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}">\n                                                <span class="">{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.accountName}}">\n                                                <span class="">{{showData && showData2 ? sa.accountName : \'\'}}</span>\n                                            </td>\n\n                                            <td class="slds slds-truncate Width100 " ng-attr-title="{{ skills[sa.parentRecord].join(\',\') }}" >\n                                            <span class=""> {{ showData && showData2 ? skills[sa.parentRecord].join(\',\') : \'\' }}</span>\n                                        </td>\n                                           \n                                        </tr>\n                                        </tbody>\n                                </table>\n                                </div>\n                                \n                                \n                                <div class="bundleButtonsContainer" >\n                                    <div class="bundleButtons" ng-click="mode = \'NEW\' " ng-class="mode == \'NEW\'  ? \'bundle_settings-tab-selected\' : \'bundle_settings-tab\' "  class="modeRadioButton" > <!-- ng-change="clearError()" -->\n                                        <label class="radioLables" >' + customLabels.CreateNewBundle + '</label>\n                                    </div>   \n                                    \n                                    <div class="bundleButtons"   ng-click="mode = \'UPDATE\' " ng-class="mode == \'UPDATE\'  ? \'bundle_settings-tab-selected\' : \'bundle_settings-tab\' " class="modeRadioButton"   > <!-- ng-change="clearError()" -->\n                                        <label class="radioLables" >' + customLabels.AddToExistingBundle + '</label>\n                                    </div>   \n                                    <span ng-class="{\'tableDivIconOpen\': openTableMode2==3}" class="openCloseTable fa fa-angle-left"  ng-click="closeOpenTable(2)" ></span>\n                                </div>\n\n                                 \n\n                                    <div ng-if="mode !== \'UPDATE\'" class="newB">\n                                        <div class="selectBundler" ng-hide="isNativeMode == true">\n                                            <div><span class="required">*</span><span>' + customLabels.BundlePolicy + '</span></div>\n                                            \n                                            <div >\n                                                <input type="text" ng-class="errorMode == 1  ? \'error-field\' : \'\' " list="bundlerPolicyList" ng-change="clearError()" placeholder="' + customLabels.SelectBundlePolicyDrop + '" ng-model="data.selectedBundlePolicy"  title="{{bundlerPolicyNamesMapLookup[ data.selectedBundlePolicy ]}}" class="bundlerInput" ng-disabled="mode === \'UPDATE\' || errorMode == 3">\n                                                \n                                                <datalist id="bundlerPolicyList" ng-model="bundlerPolicyList" >\n                                                    <option ng-repeat="(key, value) in bundlerPolicyMap"  [key]="{{value}}">{{value}}</option>\n                                                </datalist>\n                                            </div>\n\n                                            <div ng-class="errorMode == 1 ? \'field-required-lable\' : \'error-hide\' ">' + customLabels.SelectAPolicy + '</div>\n                                            <div ng-class="errorMode == 3 ? \'field-required-lable\' : \'error-hide\'"> {{errorMsgMissing}}</div>\n                                        </div>\n                                    </div>\n                                <div>\n                                </div>\n                            <div class="tableDiv slds"   ng-class="{\'tableDivClose\': openTableMode2==1, \'tableDivBig\': openTableMode2==3}">\n                                <table ng-if="mode === \'UPDATE\'" id="addSaTable" class="slds slds-table slds-table_cell-buffer slds-table_bordered" >\n                                        <thead>\n                                        <tr class="slds slds-line-height_reset">\n                                        <th ng-click="openTableMode2 = !openTableMode2"  ></th>\n                                        <th ng-click="setOrderreverse(\'name\',2);">' + customLabels.SANumberHeader + '\n                                        <div class="bundleArrowSpace">\n                                        <svg ng-show ="table2reverse && tabe2order == \'name\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                        <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                        </svg>\n                                        <svg ng-show ="!table2reverse && tabe2order == \'name\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                        <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                        </svg>\n                                    </div>\n                                        </th>\n                                        <th ng-click="setOrderreverse(\'DurationInMinutes\',2)">' + customLabels.DurationHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'DurationInMinutes\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'DurationInMinutes\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>    \n                                    </th>\n                                    <th ng-click="setOrderreverse(\'addrText\',2)">' + customLabels.AddressHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'addrText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'addrText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>    \n                                    </th>\n\n\n                                    <th ng-click="setOrderreverse(\'earlyStartView\',2)">' + customLabels.EarlyStartHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'earlyStartView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'earlyStartView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                            <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>\n                                    </th>\n\n                                    <th ng-click="setOrderreverse(\'dueDateView\',2)">' + customLabels.DueDateHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'dueDateView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'dueDateView\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>\n\n                                    </th>\n\n                                    <th ng-click="setOrderreverse(\'workTypesText\',2)">' + customLabels.WorkTypeHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'workTypesText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'workTypesText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>\n                                    </th>\n\n                                    <th ng-click="setOrderreverse(\'accountName\',2)">' + customLabels.AccountHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'accountName\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'accountName\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                         </div>   \n                                    </th>\n\n                                    <th ng-click="setOrderreverse(\'SkillText\',2)">' + customLabels.RequiredSkillsHeader + '\n                                        <div class="bundleArrowSpace">\n                                            <svg ng-show ="table2reverse && tabe2order == \'SkillText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="!table2reverse && tabe2order == \'SkillText\'" aria-hidden="true" class="slds-icon arrowIcon bundleArrowIcon">\n                                                <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </div>\n                                    </th>\n                                        </tr>\n\n                                        </thead>\n                                        <input ng-if="mode === \'UPDATE\'" class="searchBundleSa" placeholder="' + customLabels.SearchAnExistingBundle + '" ng-model="data.searchText" ng-change="search()"  type="text" >\n\n                                       \n                                        <button ng-disabled="serverSearchDisabled == true" ng-if="mode === \'UPDATE\'" style="height:29px;\n                                        padding: 0px 19px 1px 24px;position: relative;top: 1px;" class="btn cancelButton searchServerBtn" ng-click="serverSearch(false)">' + customLabels.SearchAllRecords + '</button>\n\n                                        <button ng-disabled="serverSearchDisabled == true" ng-if="mode === \'UPDATE\'" style="height: 29px;\n                                        padding: 0px 19px 1px 24px;position: relative;top: 1px;" class="btn cancelButton searchServerBtn" ng-click="clearSearch(false)">' + customLabels.ClearField + ' </button>\n                                       \n                                        <tbody class=\'slds slds-tbody\'> \n                                        <tr class="slds slds-hint-parent dataRow maxHight30" ng-repeat="sa in bundlersView | orderBy:tabe2order:table2reverse " >   <!-- in bundlersView -->\n                                        <td class="Width20">\n                                        <input  name="addToBundle"  ng-checked="selectedAddSa == sa.id" ng-click="toggleAddSelection(sa.id,sa.name)" type="radio" value="{{sa.id}}">\n                                        </td> \n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.name}}">\n                                                <a class="saLink ng-click="" target="_blank" href="../{{ sa.id }}" title="{{sa.name}}">{{showData && showData2 ? sa.name : \'\'}}</a>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.DurationInMinutes}}">\n                                                <span class="">{{showData && showData2 ?  sa.DurationInMinutes : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width80" ng-attr-title="{{sa.City + \' \' + sa.Street}}">\n                                                <span class="">{{showData && showData2 ? sa.City + \' \' + sa.Street : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.earlyStartView}}" ng-bind="showData && showData2 ? sa.earlyStartView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width150" ng-attr-title="{{sa.dueDateView}}" ng-bind="showData && showData2 ? sa.dueDateView  : \'\' "> \n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}">\n                                                <span class="">{{sa.fields[\'WorkTypeId\'] ? workTypes[sa.fields[\'WorkTypeId\']] : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width100" ng-attr-title="{{sa.accountName}}">\n                                                <span class="">{{showData && showData2 ? sa.accountName : \'\'}}</span>\n                                            </td>\n                                            <td class="slds slds-truncate Width100 " ng-attr-title="{{ skills[sa.parentRecord].join(\',\') }}" >\n                                                <span class=""> {{ showData && showData2 ? skills[sa.parentRecord].join(\',\') : \'\' }}</span>\n                                            </td>\n                                         \n                                           \n                                        </tr>\n                                        </tbody>\n                                </table>\n                                \n                            </div>\n\n                            <div class="updateB">\n                            <div class="selectBundler">\n                          \n                                <div ng-class="errorMode == 2 ? \'field-required-lable\' : \'error-hide\' ">' + customLabels.SelectAnExistingBundle + '</div>\n                                <div ng-class="errorMode == 6 ? \'field-required-lable\' : \'error-hide\'"> ' + customLabels.NoBundle + '</div>\n                            </div>\n                        </div>    \n                        </div>\n\n                        <div class="lightboxControllers">\n                          \n\n                            <div class="errorPopupShowcontainer" >\n                             <div  ng-click="showErrorPopup()" ng-show="errorMode != 0" class=\'\' style="cursor: pointer;"> \n                             <svg aria-hidden="true" class="slds-icon bundler-error-icon-btn" style="fill:red;">\n                                <use xlink:href="' + lsdIcons.na + '"></use>\n                            </svg>\n                                   \n                              </div> \n                              <div ng-class="showErrorPopupVar != 0  ? \'errorPopupShow\' : \'\' "  class="errorPopupShowStart" >\n                                  <div class="errorHeader errorHeaderPopupShow" >\n                                  <p class="errorHeaderPopupShowP" style="font-size: 18px;" >\n                                    <svg aria-hidden="true" class="slds-icon bundler-error-icon-btn-header" style="fill:white;height: 15px;vertical-align: middle;">\n                                    <use xlink:href="' + lsdIcons.na + '"></use>\n                                    </svg>\n                                    ' + customLabels.WeHitAsnag + '\n                                    <svg ng-click="showErrorPopup()" aria-hidden="true" class="slds-icon CloseErrorBundleBox" fsl-key-press tabindex="0">\n                                        <use xlink:href="' + lsdIcons.close + '"></use>\n                                    </svg>\n                                  </p>\n                                  </div>\n                                  <p class="errorHeaderPopupShowText" >{{errorMsg}} </p>\n                              </div>\n                            </div>\n                            <button class="btn cancelButton" ng-click="closeLightbox(false)">' + customLabels.CancelButton + '</button>\n                            <button class="btn apllyButton"  ng-click="apply()" ng-disabled="errorMode == 3" >' + customLabels.SaveButton + '</button> <!-- ng-disabled="nonSelected()"-->\n                        </div>\n\n                    </div>\n                </div>\n            ');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();