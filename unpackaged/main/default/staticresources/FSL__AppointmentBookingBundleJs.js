'use strict';

// appointment booking angular app
(function () {
    angular.module('BookAppointment', ['ChatterAction', 'MstResolver']).config(['MstResolverProvider', function (MstResolverProvider) {

        // set MST configs
        MstResolverProvider.setConfig({
            fslOperationRemoteAction: appBooking.remoteActions.getFslOperation,
            getAsyncApexJobRemoteAction: appBooking.remoteActions.getAsyncApexJob,
            apiVersion: '41.0',
            fieldNames: appBooking.fieldNames.FslOperationFieldNames,
            autoConnect: true
        });
    }]);
})();
'use strict';

(function () {

    angular.module('BookAppointment').controller('mainController', mainController);

    // injections
    mainController.$inject = ['APP_STATES', 'StateAndSettings', 'appState', 'stageType', 'chatterActionUtils'];

    // controller function
    function mainController(APP_STATES, StateAndSettings, appState, stageType, chatterActionUtils) {

        this.APP_STATES = APP_STATES;
        this.getState = function () {
            return StateAndSettings.state;
        };
        this.controlServiceForm = {};
        StateAndSettings.controlServiceForm = this.controlServiceForm;

        this.isInForm = function () {
            return appState && appState.getStage() == stageType.Form;
        };
        /*-------------------RTL support---------------*/
        this.isRtlDirection = chatterActionUtils.isRtlDirection();

        this.onFirstStageCompleted = function (results) {
            return StateAndSettings.onFirstStageComplete(results, this.controlServiceForm);
        };
    }
})();
'use strict';

(function () {

    // service definition
    angular.module('BookAppointment').service('datesService', datesService);

    // actual service c'tor
    function datesService() {

        this.newUtcDate = function (date) {
            var newDate = new Date(date),
                offset = newDate.getTimezoneOffset();

            newDate.setMinutes(newDate.getMinutes() + offset);

            return newDate;
        };

        // add offset of timezone to date
        this.locationBasedDate = function (date, timezone) {

            var offsetInMinutes = moment(date).tz(timezone)._offset,
                newDate = new Date(date);

            // minus here because moment returns the offset with + and not -
            newDate.setMinutes(newDate.getMinutes() - offsetInMinutes);

            return newDate;
        };
    }
})();
'use strict';

(function () {

    // service definition
    angular.module('BookAppointment').service('Labels', labels);

    // actual service c'tor
    function labels() {
        this.getLabel = function (label) {
            return customLabels[label];
        };
    }
})();
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    angular.module('BookAppointment').service('StateAndSettings', StateAndSettings);

    // inject
    StateAndSettings.$inject = ['APP_STATES', 'datesService', '$q', 'MstResolver', '$rootScope'];

    // actual service c'tor
    function StateAndSettings(APP_STATES, datesService, $q, MstResolver, $rootScope) {
        var _this = this;

        this.slots = {};
        this.schedulingResults = null;
        this.scheduledService = null;
        this.splitSlotsWorking = false;
        this.state = APP_STATES.BOOKING_FORM;
        this.fslOpId = null;
        this.PartialResults = [];
        this.getPartialResults = function () {
            return _this.PartialResults;
        };
        this.minMaxDates = [];
        this.isRelatedChainLength = 0;

        var minMaxSlotsDates = {
            min: null,
            max: null
        };

        this.policies = [];
        this.STTimezone = null;

        // get policies
        (function (statePolicies) {

            Visualforce.remoting.Manager.invokeAction(window.appBooking.remoteActions.getPolicies, function (policies, ev) {
                statePolicies.push.apply(statePolicies, _toConsumableArray(policies));
            }, { buffer: true, escape: false, timeout: 120000 });
        })(this.policies);

        this.getMinMaxDates = function () {
            return minMaxSlotsDates;
        };

        this.extendDates = function (policyId) {

            var defer = $q.defer(),
                numberOfSlots = _this.numberOfSlots;

            _this.service.DueDate += 1000 * 60 * 60 * 24;

            var firstStageObjectConfig = {
                secondCall: true,
                DueDate: _this.service.DueDate
            };

            if (policyId) {
                firstStageObjectConfig.PolicyOverrideId = policyId;
            }

            _this.controlServiceForm.doFirstStage(firstStageObjectConfig, true).then(function (results) {

                handleFirstStage.call(_this, results);

                // no slots found? reject
                if (numberOfSlots === _this.numberOfSlots) {
                    defer.reject();
                }

                defer.resolve();
            }).catch(function () {
                defer.reject();
            });

            return defer.promise;
        };

        this.runAgainWhenPolicyChanged = function (policyId) {
            _this.policyUsed.id = policyId;
            _this.controlServiceForm.doFirstStage({ PolicyOverrideId: policyId }, false, true).then(function (results) {
                if (results) {
                    _this.onFirstStageComplete(results);
                }
            });
        };

        this.policyUsed = { id: null };
        this.derivedPolicy = null;
        this.getPolicyUsed = function () {
            return _this.policyUsed;
        };
        this.getDerivedPolicy = function () {
            return _this.derivedPolicy;
        };

        var firstTimeDerived = true;

        this.onFirstStageComplete = function (results) {

            _this.policyUsed.id = results.firstStageResult.Data.policyId;

            if (firstTimeDerived) {
                _this.derivedPolicy = results.firstStageResult.Data.DerivedPolicy;
                firstTimeDerived = false;
            }

            var mstDefer = $q.defer();

            // check if mst
            if (results.firstStageResult.Data.Slots.FSLOperationId) {
                _this.fslOpId = results.firstStageResult.Data.Slots.FSLOperationId;
            }

            var slottkeys = Object.keys(_this.slots);
            slottkeys.forEach(function (val) {
                return delete _this.slots[val];
            });

            if (!_this.fslOpId) {
                handleFirstStage.call(_this, results);
            } else {

                // mst :(
                if (!window.noMstPushTopic) {
                    MstResolver.getUpdates(_this.fslOpId).then(function (resultsMst) {

                        console.log(resultsMst);

                        mstDefer.resolve();
                        results.firstStageResult.Data.Slots = resultsMst.fslOperation.result;

                        handleFirstStage.call(_this, results);
                    }).catch(function (ex) {
                        var rejectObject = typeof ex === 'string' ? { message: ex } : ex;
                        mstDefer.reject(rejectObject);
                    });
                } else {
                    mstDefer.reject({ message: window.customLabels.NoMstPushTopic });
                }

                return mstDefer.promise;
            }

            // check if we need to lazy load more stuff
            if (results.firstStageResult.Data.NeedAnotherCall) {
                _this.splitSlotsWorking = true;

                var firstStageObjectConfig = { secondCall: true, PolicyOverrideId: results.firstStageResult.Data.policyId };

                // this.controlServiceForm is set on MainController.js
                _this.controlServiceForm.doFirstStage(firstStageObjectConfig, true).then(function (results2ndStage) {
                    handleFirstStage.call(_this, results2ndStage);
                });
            }
        };

        function handleFirstStage(results) {

            this.splitSlotsWorking = false;

            // this is the service that we currently scheduling (new or existing)
            this.service = results.firstStageResult.Service;

            //this is service territory timezone for service;(if SA without ST, we use user timezone)
            this.STTimezone = results.firstStageResult.Data.STTimezone;

            // the slots for the scheduling service
            var ABResponseObject = results.firstStageResult.Data.Slots;

            // only 1 related was scheduled
            this.failedToScheduleRelated = ABResponseObject.IsFallback;

            // actual slots
            var virtualSlots = ABResponseObject.Slots;

            // partial results
            this.PartialResults = ABResponseObject.PartialResults;

            // our slots, saved locally
            this.slots = this.slots || {};

            // (re)init
            for (var k in this.slots) {
                this.slots[k] = [];
            }

            minMaxSlotsDates.min = null;
            minMaxSlotsDates.max = null;
            this.minMaxDates.length = 0;

            // format slots and stuff
            for (var i = 0; i < virtualSlots.length; i++) {

                var dateKey = datesService.newUtcDate(virtualSlots[i].Interval.Start);

                // calc min/max dates before making date_key
                if (!minMaxSlotsDates.min) {
                    minMaxSlotsDates.min = dateKey;
                }

                if (!minMaxSlotsDates.max) {
                    minMaxSlotsDates.max = dateKey;
                }

                if (minMaxSlotsDates.min && minMaxSlotsDates.min > dateKey) {
                    minMaxSlotsDates.min = dateKey;
                }

                if (minMaxSlotsDates.max && minMaxSlotsDates.max < dateKey) {
                    minMaxSlotsDates.max = dateKey;
                }

                // generate date key
                dateKey = dateKey.getDate() + '_' + dateKey.getMonth() + '_' + dateKey.getFullYear();

                this.slots[dateKey] = this.slots[dateKey] || [];
                this.slots[dateKey].push(virtualSlots[i]);
            }

            var dateAvailable = {};
            // W-14432586, W-14964167
            for (var min = new Date(minMaxSlotsDates.min); min < minMaxSlotsDates.max; min.setDate(min.getDate() + 1)) {

                var key = min.getDate() + '_' + min.getMonth() + '_' + min.getFullYear();

                if (!dateAvailable[key]) {
                    this.minMaxDates.push({ date: new Date(min), dateKey: key });
                    dateAvailable[key] = true;
                }
            }

            this.numberOfSlots = ABResponseObject.Slots.length;

            // change to slots view
            this.state = APP_STATES.SLOTS;

            this.service.isRelated = results.firstStageResult.Data.isRelated;
            this.numberOfServices = ABResponseObject.NumberOfServices;
            this.isRelatedChainLength = results.firstStageResult.Data.relatedSACounter;
        }
    }
})();
'use strict';

(function () {

    angular.module('BookAppointment').directive('schedulingResults', function () {

        return {
            restrict: 'E',
            template: resultsTemplate,
            controller: resultsCtrl,
            controllerAs: 'resultsCtrl',
            link: function link(scope, element, attributes) {
                scope.resultsCtrl.icon = attributes.icon;
                scope.resultsCtrl.iconError = attributes.iconerror;
            }
        };
    });

    resultsCtrl.$inject = ['StateAndSettings', 'Labels', 'chatterActionUtils'];

    function resultsCtrl(StateAndSettings, Labels, chatterActionUtils) {
        var _this = this;

        // label service
        this.getLabel = Labels.getLabel;
        this.isRelatedChainLength = StateAndSettings.isRelatedChainLength;

        this.scheduledSuccessfully = function () {
            return StateAndSettings.schedulingResults.schedulingResult.Results && StateAndSettings.schedulingResults.schedulingResult.Results.length > 0 ? true : false;
        };

        this.viewService = function () {
            chatterActionUtils.openService(StateAndSettings.scheduledService.Id);
        };

        function generateResultDate(isFinish) {

            var dateType = isFinish ? 'ArrivalWindowEndTime' : 'ArrivalWindowStartTime',
                date = StateAndSettings.scheduledService[dateType];

            return chatterActionUtils.changeDateToTerritoryTZ(moment(date)).format('llll');
        }

        this.generateBookingResults = function () {
            if (_this.scheduledSuccessfully()) {
                return Labels.getLabel('AppBookingResults').replace('{0}', generateResultDate()).replace('{1}', generateResultDate(1));
            } else {
                return customLabels.SlotTaken;
            }
        };

        this.generateConfirmationMsgComplexO2 = function () {
            return Labels.getLabel('ConfirmationMsgRelatedSAO2').replace('$0', _this.isRelatedChainLength);
        };
    }

    var resultsTemplate = '<div id="AN-ResultsContainer">\n\n        <svg aria-hidden="true" class="slds-icon">\n            <use ng-if="resultsCtrl.scheduledSuccessfully()" xlink:href="{{resultsCtrl.icon}}"></use>\n            <use ng-if="!resultsCtrl.scheduledSuccessfully()" xlink:href="{{resultsCtrl.iconError}}"></use>\n        </svg>\n\n        <div id="ResultTextLine" aria-live="assertive">{{ resultsCtrl.generateBookingResults() }}</div>\n        <div ng-show="resultsCtrl.isRelatedChainLength && resultsCtrl.scheduledSuccessfully()" aria-live="polite">{{resultsCtrl.generateConfirmationMsgComplexO2()}}</div>\n\n        <button class="AN-WhiteButton AN-full-width-button" ng-click="resultsCtrl.viewService()">{{ :: resultsCtrl.getLabel(\'View_Service\') }}</button>\n\n\n    </div>';
})();
'use strict';

(function () {

    angular.module('BookAppointment').directive('slots', function () {

        return {
            restrict: 'E',
            template: slotsTemplate,
            controller: slotsCtrl,
            controllerAs: 'slotsCtrl',
            scope: true,
            link: function link(scope, element, attribues) {
                scope.slotsCtrl.infoIcon = attribues.infoicon;
                scope.slotsCtrl.noSlotsIcon = attribues.noslotsicon;
                scope.slotsCtrl.spinner = attribues.spinner;
                scope.slotsCtrl.related = attribues.related;
            }
        };
    });

    slotsCtrl.$inject = ['$scope', '$q', 'StateAndSettings', 'APP_STATES', 'Labels', '$timeout', 'chatterActionUtils', 'MstResolver'];

    function slotsCtrl($scope, $q, StateAndSettings, APP_STATES, Labels, $timeout, chatterActionUtils, MstResolver) {
        var _this = this;

        String.prototype.replaceAll = function () {

            var target = this;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            for (var i = 0; i < args.length; i++) {
                target = target.replace('$' + i, args[i]);
            }

            return target;
        };

        this.minSlotGrade = appBooking.appBookingSettings[appBooking.fieldNames.settings.Minimum_Grade__c] || 0;
        this.showGoldenSlots = appBooking.appBookingSettings[appBooking.fieldNames.settings.ShowGoldenSlots__c] || false;
        this.dailySlotsAvailable = {};

        this.generatePartialResult = function (p) {
            return customLabels.partialResults[p.Operation].replaceAll(p.Processed, p.Total);
        };

        this.selectedDay = 'all';
        this.ShowExtendMessage = false;
        this.showingTooltip = false;
        this.displayTooltipId = null;
        this.ShowNoMoreSlots = false;
        this.slots = StateAndSettings.slots;
        this.partialResults = StateAndSettings.getPartialResults;
        this.isRelatedChainLength = StateAndSettings.isRelatedChainLength;
        this.grading = {
            recommended: appBooking.appBookingSettings[appBooking.fieldNames.settings.Recommended_Threshold__c],
            ideal: appBooking.appBookingSettings[appBooking.fieldNames.settings.Ideal_Threshold__c]
        };

        this.getMinMaxDates = function () {
            return StateAndSettings.minMaxDates;
        };

        this.showFilterByDate = true;

        this.shouldShowExp = function () {
            return appBooking.appBookingSettings[appBooking.fieldNames.settings.Show_Grade_Explanation__c];
        };

        this.getGoldenSlots = function () {

            var goldenArray = [];

            for (var k in _this.slots) {
                _this.slots[k].forEach(function (slot) {
                    if (slot.Grade >= _this.minSlotGrade) {
                        goldenArray.push(slot);
                    }
                });
            }

            goldenArray.sort(function (a, b) {
                if (a.Grade > b.Grade) {
                    return -1;
                }
                if (a.Grade < b.Grade) {
                    return 1;
                }
                if (a.Grade === b.Grade) {
                    return 0;
                }
            });

            goldenArray = goldenArray.slice(0, 3);

            return goldenArray;
        };

        // label service
        this.getLabel = Labels.getLabel;

        this.formatTooltipHeader = function (str1) {

            var totalSlots = 0;

            for (var day in _this.slots) {
                totalSlots += _this.slots[day].length;
            }return Labels.getLabel('AB_Explanation_Header').replace('{0}', str1).replace('{1}', totalSlots);
        };

        this.getIcon = function (name) {
            return appBooking.icons[name];
        };

        this.schedule = function (slot) {

            // don't allow clicking on a slot until finished running (or extending)
            if (StateAndSettings.splitSlotsWorking || _this.ShowExtendMessage) {
                return;
            }

            var mstPromise = $q.defer();

            StateAndSettings.controlServiceForm.doSecondStage({
                Start: slot.Interval.Start,
                Finish: slot.Interval.Finish,
                Grade: null || slot.Grade,
                DueDate: StateAndSettings.service.DueDate,
                NumberOfServices: StateAndSettings.numberOfServices,
                PolicyOverrideId: _this.selectedPolicy.id
            }, mstPromise.promise).then(function (results) {

                // check if mst
                if (results.secondStageResult.Data.schedulingResult.Results && results.secondStageResult.Data.schedulingResult.Results[0] && results.secondStageResult.Data.schedulingResult.Results[0].LongOperationId) {

                    var fslOpScheduling = results.secondStageResult.Data.schedulingResult.Results[0].LongOperationId;

                    MstResolver.getUpdates(fslOpScheduling).then(function (mstSchedResult) {

                        console.log('MST results of getUpdates:');
                        console.log(mstSchedResult);

                        // need to check which of the two is our service
                        var resService = null;

                        if (mstSchedResult.fslOperation.result && mstSchedResult.fslOperation.result[0] && mstSchedResult.fslOperation.result[0].Service.Id === results.secondStageResult.Service.Id) {
                            resService = mstSchedResult.fslOperation.result[0].Service;
                        } else if (mstSchedResult.fslOperation.result && mstSchedResult.fslOperation.result[1] && mstSchedResult.fslOperation.result[0].Service.Id === results.secondStageResult.Service.Id) {
                            resService = mstSchedResult.fslOperation.result[1].Service;
                        } else {
                            mstPromise.reject({ message: 'Error while scheduling MSW.' });
                            return;
                        }

                        StateAndSettings.state = APP_STATES.RESULTS;
                        StateAndSettings.schedulingResults = results.secondStageResult.Data;
                        StateAndSettings.scheduledService = resService; //results.secondStageResult.Data.service;

                        mstPromise.resolve();
                    }).catch(function (ex) {
                        var rejectObject = typeof ex === 'string' ? { message: ex } : ex;
                        mstPromise.reject(rejectObject);
                    });
                } else {
                    StateAndSettings.state = APP_STATES.RESULTS;
                    StateAndSettings.schedulingResults = results.secondStageResult.Data;
                    StateAndSettings.scheduledService = results.secondStageResult.Data.service;
                    mstPromise.resolve();
                }
            }).catch(function (ex) {
                console.warn(ex);
            });
        };

        this.extendDate = function () {

            // don't allow clicking on a extend button until finished running (or extending)
            if (StateAndSettings.splitSlotsWorking || _this.ShowExtendMessage) {
                return;
            }

            _this.ShowExtendMessage = true;

            StateAndSettings.extendDates(_this.selectedPolicy.id).then(function () {

                //this.selectedDay = this.selectedDay;

            }).catch(function () {

                // if we are here, no more slots were found

                _this.ShowNoMoreSlots = true;

                $timeout(function () {
                    _this.ShowNoMoreSlots = false;
                }, 3000);
            }).finally(function () {
                _this.ShowExtendMessage = false;
            });
        };

        this.explainIconClicked = function ($event, id) {
            $event.stopPropagation();

            if (_this.displayTooltipId !== id) {
                _this.showingTooltip = true;
                _this.displayTooltipId = id;
            } else {
                _this.showingTooltip = false;
                _this.displayTooltipId = null;
            }
        };

        this.isCommunitiesPage = function () {
            return isCommunitiesPage;
        };

        this.formatDueDate = function () {
            return _this.getLabel('DueDateExtendTo').replace('$0', moment(StateAndSettings.service.DueDate).format('lll'));
        };

        this.noSlots = function () {

            if (Object.keys(_this.slots).length === 0 || StateAndSettings.numberOfSlots === 0) {
                return true;
            }

            var foundValidSlot = false;

            for (var k in _this.slots) {

                _this.dailySlotsAvailable[k] = false;

                for (var i = 0; i < _this.slots[k].length; i++) {
                    if (_this.slots[k][i].Grade >= _this.minSlotGrade || _this.slots[k][i].Grade === -1) {
                        _this.dailySlotsAvailable[k] = true;
                        foundValidSlot = true;
                    }
                }
            }

            return !foundValidSlot;
        };

        this.isMobile = function () {
            return typeof sforce !== 'undefined' && sforce.one;
        };

        this.formatAsapObjective = function (date) {
            return chatterActionUtils.changeDateToTerritoryTZ(moment(parseInt(date))).format('lll');
        };

        this.isDateSplitStillRunning = function () {
            return StateAndSettings.splitSlotsWorking;
        };

        this.isRelatedService = function () {
            return StateAndSettings.service.isRelated;
        };

        this.getExtendButtonText = function () {
            return _this.ShowExtendMessage ? _this.getLabel('SearchingAppointments') : _this.getLabel('Extend_dates');
        };

        this.relatedSchedulingFailed = function () {
            return StateAndSettings.failedToScheduleRelated;
        };

        this.generateRelatedFailText = function () {
            return Labels.getLabel('UnableToScheduleRelated').replace('$0', StateAndSettings.service.RelatedServiceLabel);
        };

        this.generateNotificationIsRelatedO2 = function () {
            return Labels.getLabel('ABNotificationIsComplexWorkO2').replace('$0', _this.isRelatedChainLength);
        };

        this.userHasAdminPermissions = userHasAdminPermissions;

        this.formatFilterDate = function (d) {
            return moment(d).format('D MMM, ddd');
        };

        this.setSelectedDay = function (d) {

            if (_this.dailySlotsAvailable[d]) {
                _this.selectedDay = d;
            }
        };

        this.splitSlotsWorking = function () {
            return StateAndSettings.splitSlotsWorking;
        };

        this.getRelevantSlots = function () {

            if (_this.selectedDay === 'all') {
                return _this.slots;
            }

            if (_this.selectedDay === 'gold') {
                return {};
            }

            var slots = {};
            slots[_this.selectedDay] = _this.slots[_this.selectedDay];

            return slots;
        };

        this.getPolicyLabel = function (id) {

            if (id === StateAndSettings.getDerivedPolicy()) {
                return '(' + Labels.getLabel('DerivedPolicy') + ')';
            }

            if (id === window.appBooking.appBookingSettings[window.appBooking.fieldNames.settings.SchedulingPolicyId__c]) {
                return '(' + Labels.getLabel('Default') + ')';
            }

            return '';
        };

        this.policies = StateAndSettings.policies;
        this.selectedPolicy = StateAndSettings.getPolicyUsed();

        this.runAgainWhenPolicyChanged = function (policyId) {
            StateAndSettings.runAgainWhenPolicyChanged(policyId);
        };

        this.isPolicyPickerEnabled = function () {
            return window.appBooking.policyPickerEnabled;
        };
    }

    var slotsTemplate = '\n    <div id="AN-SlotsContainer" ng-class="{\'AddMarginToBody\': !slotsCtrl.showFilterByDate}">\n    \n        <div id="PolicyChanger" ng-class="{\'remove-margin-picker\': !slotsCtrl.showFilterByDate}" ng-if="slotsCtrl.isPolicyPickerEnabled()">\n            <span>{{ :: slotsCtrl.getLabel(\'ChangePolicy\') }}</span>\n            <select ng-model="slotsCtrl.selectedPolicy.id" ng-change="slotsCtrl.runAgainWhenPolicyChanged(slotsCtrl.selectedPolicy.id)">\n                <option ng-repeat="policy in slotsCtrl.policies" value="{{policy.Id}}">{{policy.Name}} {{ slotsCtrl.getPolicyLabel(policy.Id) }}</option>\n            </select>\n        </div>\n    \n        <div id="JumpToSlots" role="tablist" ng-show="!slotsCtrl.splitSlotsWorking() && slotsCtrl.showFilterByDate">\n        \n            <button title="{{ :: slotsCtrl.getLabel(\'show_all\') }}" aria-selected="true" fsl-tab-switch role="tab" class="JumpToDate" ng-click="slotsCtrl.selectedDay = \'all\'" ng-class="{\'selectedDayFilter\': \'all\' === slotsCtrl.selectedDay}">\n                {{ :: slotsCtrl.getLabel(\'show_all\') }}\n            </button>\n        \n            <button title="{{ :: slotsCtrl.getLabel(\'GoldenSlots\') }}" role="tab"  fsl-tab-switch class="JumpToDate" ng-click="slotsCtrl.selectedDay = \'gold\'" ng-if="slotsCtrl.showGoldenSlots && slotsCtrl.getGoldenSlots().length > 0"\n                ng-class="{\'selectedDayFilter\': \'gold\' === slotsCtrl.selectedDay}">\n                    {{ :: slotsCtrl.getLabel(\'GoldenSlots\') }}\n            </button>\n        \n            <button title="{{ slotsCtrl.formatFilterDate(dateObj.date) }}" role="tab" fsl-tab-switch class="JumpToDate" ng-repeat="dateObj in slotsCtrl.getMinMaxDates()" ng-click="slotsCtrl.setSelectedDay(dateObj.dateKey)" \n                ng-class="{\'SlotsAvailableInDate\': !slotsCtrl.dailySlotsAvailable[dateObj.dateKey] , \'selectedDayFilter\': dateObj.dateKey === slotsCtrl.selectedDay}">\n                    {{ slotsCtrl.formatFilterDate(dateObj.date) }}\n            </button>\n                  \n        </div>\n        \n        \n        <button id="toggleDateFilter" \n            ng-class="{\'showDateFilter\': !slotsCtrl.showFilterByDate}" ng-click="slotsCtrl.showFilterByDate = !slotsCtrl.showFilterByDate" \n            title="{{ :: slotsCtrl.getLabel(\'ToggleFilterByDate\') }}"\n            ng-show="!slotsCtrl.splitSlotsWorking()">\n        </button>\n     \n    \n  \n\n        <div id="AN-PartialResults" ng-show="slotsCtrl.partialResults().length > 0">\n            <div>\n                {{ slotsCtrl.getLabel(\'particalCouldntProcessAll\') }}\n                <u ng-show="slotsCtrl.userHasAdminPermissions" ng-click="showPartialData = !showPartialData">{{ slotsCtrl.getLabel(\'ShowDetails\') }}</u>\n            </div>\n\n            <div ng-show="showPartialData">\n                <ul>\n                    <li ng-repeat="partial in slotsCtrl.partialResults()">\n                        {{ slotsCtrl.generatePartialResult(partial) }}\n                    </li>\n                </ul>\n            </div>\n        </div>\n\n\n        <div id="AN-RelatedFailed" ng-if="slotsCtrl.relatedSchedulingFailed()">\n            {{ slotsCtrl.generateRelatedFailText() }}\n        </div>\n\n        <div id="AN-StillGettingSlots" ng-show="slotsCtrl.isDateSplitStillRunning()">\n            <img ng-src="{{ slotsCtrl.getIcon(\'spinner\') }}">\n            {{ :: slotsCtrl.getLabel(\'StillGettingSlots\') }}\n        </div>\n\n\n\n        <div id="AN-NoSlots" ng-show="slotsCtrl.noSlots() && !slotsCtrl.isDateSplitStillRunning()">\n            <svg class="slds-icon" aria-hidden="true" aria-label="{{ slotsCtrl.getLabel(\'NoSlotsFound\') }}" >\n                <use xlink:href="{{ slotsCtrl.noSlotsIcon }}"></use>\n            </svg>\n            {{ :: slotsCtrl.getLabel(\'NoSlotsFound\') }}\n        </div>\n        \n        <div class="related-sa-notification" ng-show="!slotsCtrl.noSlots() && !slotsCtrl.isDateSplitStillRunning() && slotsCtrl.isRelatedChainLength > 0"> \n            <svg aria-hidden="true" aria-label="{{slotsCtrl.generateNotificationIsRelatedO2()}}" class="AN-RelatedIcon slds-icon"><use xlink:href="{{ slotsCtrl.related }}"></use></svg>\n            {{ slotsCtrl.generateNotificationIsRelatedO2() }}\n        </div>\n        <div id="GoldenSlots" ng-show="slotsCtrl.showGoldenSlots && slotsCtrl.getGoldenSlots().length > 0 && (slotsCtrl.selectedDay === \'gold\' || slotsCtrl.selectedDay === \'all\')">\n            <div id="GoldenHeader">{{ :: slotsCtrl.getLabel(\'GoldenSlots\') }}</div>\n            \n            \n            <div fsl-key-press tabindex="0" ng-repeat="slot in slotsCtrl.getGoldenSlots()" class="AN-Interval" ng-click="slotsCtrl.schedule(slot)" ng-show="slot.Grade >= slotsCtrl.minSlotGrade || slot.Grade === -1"\n                ng-class="{\'AN-NoSlotsExplain\': $parent.slotsCtrl.isRelatedService() || $parent.slotsCtrl.isDateSplitStillRunning() || slotsCtrl.isCommunitiesPage() || !slot.BestSlotGrades || !slotsCtrl.shouldShowExp(), \'AN-NoPointerCursor\': $parent.slotsCtrl.isDateSplitStillRunning() || $parent.slotsCtrl.ShowExtendMessage}">\n                \n                <div class="GoldenSlotDate">{{ slot.Interval.Start | date2:\'day\'}}</div>\n                \n                {{ slot.Interval.Start | date2:\'hour\'}}\n                <span ng-show="slot.Interval.Finish !== slot.Interval.Start">- {{ slot.Interval.Finish | date2:\'hour\'}}</span>\n                <div class="AN-Recommended" ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.Grade >= slotsCtrl.grading.recommended && slot.Grade < slotsCtrl.grading.ideal">\n                    {{ :: slotsCtrl.getLabel(\'Recommended\') }}\n                </div>\n                <div class="AN-Ideal" ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.Grade >= slotsCtrl.grading.ideal">\n                    {{ :: slotsCtrl.getLabel(\'Ideal\') }}\n                </div>\n\n                <svg tabindex="0" class="AN-InfoIcon slds-icon" aria-hidden="true"\n                     aria-label="{{ slotsCtrl.getLabel(\'ShowDetails\') }}" \n                     ng-click="slotsCtrl.explainIconClicked($event,$id)" \n                     ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.BestSlotGrades && slot.BestSlotGrades.length > 0 && slotsCtrl.shouldShowExp() && !slotsCtrl.isRelatedService()">\n                    <use xlink:href="{{ slotsCtrl.infoIcon }}"></use>\n                </svg>\n\n                <div class="AN-TooltipMobile" ng-show="slotsCtrl.displayTooltipId === $id" ng-click="$event.stopPropagation()">\n                    <div class="AN-SlotSingleInfo" ng-repeat="info in slot.BestSlotGrades" ng-if="info.Text || info.HeaderText" role="region" aria-label="{{ slotsCtrl.getLabel(\'ShowDetails\') }}" >\n                        <div class="AN-ObjectGrade" aria-live="polite" \n                            aria-label="{{ info.Grade >= slotsCtrl.grading.ideal ? slotsCtrl.getLabel(\'Ideal\') : (info.Grade >= slotsCtrl.grading.recommended ?  slotsCtrl.getLabel(\'Recommended\') : \'Not recommended\') }}"\n                            ng-class="{\n                            \'AN-ObjectGradeGood\': info.Grade >= slotsCtrl.grading.ideal,\n                            \'AN-ObjectGradeAverage\': info.Grade >= slotsCtrl.grading.recommended && info.Grade < slotsCtrl.grading.ideal,\n                            \'AN-ObjectGradeBad\': info.Grade <= slotsCtrl.grading.recommended,\n                        }"></div>\n                        <b>{{info.HeaderText}}</b> <span ng-hide="info.IsYesOrNoObjective">{{ slotsCtrl.formatTooltipHeader(info.RankInAppointments) }}</span><br/>\n                        <span ng-if="info.ObjectiveRecordTypeName !== \'Objective_Asap\'">{{ info.Text }}</span>\n                        <span ng-if="info.ObjectiveRecordTypeName === \'Objective_Asap\'">{{ slotsCtrl.formatAsapObjective(info.Text) }}</span>\n                    </div>\n                </div>\n\n            </div>\n            \n            \n            \n        </div>\n        \n        \n        \n        \n\n        <div ng-hide="$parent.slotsCtrl.noSlots() && !$parent.slotsCtrl.dailySlotsAvailable[dateKey]" ng-repeat="(dateKey, dailySlots) in slotsCtrl.getRelevantSlots()" class="AN-SlotContainer">\n\n            <div class="AN-SlotTitle">{{ dailySlots[0].Interval.Start | date2:\'day\'}}</div>\n           \n\n            <div ng-repeat="slot in dailySlots" class="AN-Interval" fsl-key-press ng-click="slotsCtrl.schedule(slot)" ng-show="slot.Grade >= slotsCtrl.minSlotGrade || slot.Grade === -1"\n            ng-class="{\'AN-NoSlotsExplain\': $parent.slotsCtrl.isRelatedService() || $parent.slotsCtrl.isDateSplitStillRunning() || slotsCtrl.isCommunitiesPage() || !slot.BestSlotGrades || !slotsCtrl.shouldShowExp(), \'AN-NoPointerCursor\': $parent.slotsCtrl.isDateSplitStillRunning() || $parent.slotsCtrl.ShowExtendMessage}">\n                \n                <svg tabindex="0" class="AN-InfoIcon slds-icon" aria-hidden="true"\n                    aria-label="{{ slotsCtrl.getLabel(\'ShowDetails\') }}" \n                    ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.BestSlotGrades && slot.BestSlotGrades.length > 0 && slotsCtrl.shouldShowExp() && !slotsCtrl.isRelatedService()"\n                    ng-click="slotsCtrl.explainIconClicked($event,$id)">\n                    <use xlink:href="{{ slotsCtrl.infoIcon }}"></use>\n                </svg>\n\n                <div tabindex="0">\n                    {{ slot.Interval.Start | date2:\'hour\'}}\n                    <span ng-show="slot.Interval.Finish !== slot.Interval.Start">- {{ slot.Interval.Finish | date2:\'hour\'}}</span>\n                    <div class="AN-Recommended" ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.Grade >= slotsCtrl.grading.recommended && slot.Grade < slotsCtrl.grading.ideal">\n                        {{ :: slotsCtrl.getLabel(\'Recommended\') }}\n                    </div>\n                    <div class="AN-Ideal" ng-show="!slotsCtrl.isDateSplitStillRunning() && !slotsCtrl.isCommunitiesPage() && slot.Grade >= slotsCtrl.grading.ideal">\n                        {{ :: slotsCtrl.getLabel(\'Ideal\') }}\n                    </div>\n\n\n                    <div class="AN-TooltipMobile" ng-show="slotsCtrl.displayTooltipId === $id" ng-click="$event.stopPropagation()">\n                        <div class="AN-SlotSingleInfo" ng-repeat="info in slot.BestSlotGrades" ng-if="info.Text || info.HeaderText" role="region" aria-label="{{ slotsCtrl.getLabel(\'ShowDetails\') }}">\n                            <div class="AN-ObjectGrade" aria-live="polite" \n                            aria-label="{{ info.Grade >= slotsCtrl.grading.ideal ? slotsCtrl.getLabel(\'Ideal\') : (info.Grade >= slotsCtrl.grading.recommended ?  slotsCtrl.getLabel(\'Recommended\') : \'Not recommended\') }}"\n                            ng-class="{\n                                \'AN-ObjectGradeGood\': info.Grade >= slotsCtrl.grading.ideal,\n                                \'AN-ObjectGradeAverage\': info.Grade >= slotsCtrl.grading.recommended && info.Grade < slotsCtrl.grading.ideal,\n                                \'AN-ObjectGradeBad\': info.Grade <= slotsCtrl.grading.recommended,\n                            }"></div>\n                            <b>{{info.HeaderText}}</b> <span ng-hide="info.IsYesOrNoObjective">{{ slotsCtrl.formatTooltipHeader(info.RankInAppointments) }}</span><br/>\n                            <span ng-if="info.ObjectiveRecordTypeName !== \'Objective_Asap\'">{{ info.Text || \' \'}}</span>\n                            <span ng-if="info.ObjectiveRecordTypeName === \'Objective_Asap\'">{{ slotsCtrl.formatAsapObjective(info.Text) }}</span>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n        </div>\n\n        <!--<div\n            id="AN-TooltipBackgroundForMobile"\n            ng-if="slotsCtrl.showingTooltip"\n            ng-click="$event.stopPropagation(); slotsCtrl.displayTooltipId = null; slotsCtrl.showingTooltip = false;">\n        </div>-->\n\n        <div id="AN-DueDateExtendMessage" ng-show="slotsCtrl.ShowExtendMessage">{{ slotsCtrl.formatDueDate() }}</div>\n        <div id="AN-NoMoreSlots" ng-show="slotsCtrl.ShowNoMoreSlots && !slotsCtrl.ShowExtendMessage">{{ :: slotsCtrl.getLabel(\'NoMoreSlots\') }}</div>\n\n        <button class="AN-BlueButton AN-full-width-button" ng-class="{\'AN-ExtendInProgress\': slotsCtrl.ShowExtendMessage }" ng-hide="slotsCtrl.isDateSplitStillRunning()" ng-click="slotsCtrl.extendDate()">\n            <img ng-show="slotsCtrl.ShowExtendMessage" ng-src="{{ slotsCtrl.spinner }}" />\n            {{ slotsCtrl.getExtendButtonText() }}\n        </button>\n\n    </div>';
})();
'use strict';

(function () {

    angular.module('BookAppointment').filter('date2', dateFilter);

    dateFilter.$inject = ['$filter', 'datesService'];

    function dateFilter($filter, datesService) {

        return function (interval, type) {
            var date = datesService.newUtcDate(interval);

            if (type === 'hour') {
                if (appBooking.isAMPM) return $filter('date')(date, 'h:mma');else return $filter('date')(date, 'HH:mm');
            } else if (type === 'day') return moment(date).format("dddd, MMMM Do YYYY");
        };
    }
})();
'use strict';

(function () {

    angular.module('BookAppointment')

    // app states
    .constant('APP_STATES', {
        FATAL: -1,
        ERROR: 0,
        LOADING: 1,
        BOOKING_FORM: 2,
        SLOTS: 3,
        NO_SLOTS: 4,
        RESULTS: 5
    });
})();