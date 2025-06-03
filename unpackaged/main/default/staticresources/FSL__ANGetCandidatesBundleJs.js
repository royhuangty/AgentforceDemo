'use strict';

(function () {

    angular.module('GetCandidates', ['ChatterAction', 'MstResolver', 'angularMoment']).config(['MstResolverProvider', function (MstResolverProvider) {

        // set MST configs
        MstResolverProvider.setConfig({
            fslOperationRemoteAction: RemoteActions.getFslOperation,
            getAsyncApexJobRemoteAction: RemoteActions.getAsyncApexJob,
            apiVersion: '41.0',
            fieldNames: FslOperationFieldNames,
            autoConnect: true
        });
    }]).controller('MainCtrl', ['$scope', '$q', 'CommunicationService', 'GetCandidatesUtils', 'chatterActionUtils', '$sce', 'MstResolver', '$filter', function ($scope, $q, CommunicationService, GetCandidatesUtils, chatterActionUtils, $sce, MstResolver, $filter) {

        var fslOperationId = null;

        $scope.fieldsTypes = {
            DateTime: 'DATETIME',
            Double: 'DOUBLE',
            Date: 'DATE',
            String: 'STRING',
            TextArea: 'TEXTAREA',
            Picklist: 'PICKLIST',
            Reference: 'REFERENCE',
            Currency: 'CURRENCY',
            Id: 'ID',
            Url: 'URL',
            Boolean: 'BOOLEAN'
        };
        // *-------------------RTL support---------------*/ 
        $scope.isRtlDirection = chatterActionUtils.isRtlDirection();

        $scope.userHasAdminPermissions = userHasAdminPermissions;
        $scope.showPartialData = false;
        $scope.partialResults = [];
        $scope.mstTree = {};
        $scope.resourceCandidateFieldSetIsNotEmpty = true;
        $scope.service = null;
        $scope.chatterActionUtils = chatterActionUtils;
        $scope.formClass = {};

        $scope.policyUsed = { id: window.defaultPolicy };
        var policyDerived = null;

        $scope.getPolicyLabel = function (id) {

            if (id === policyDerived) {
                return '(' + Labels.DerivedPolicy + ')';
            }

            if (id === window.defaultPolicy) {
                return '(' + Labels.Default + ')';
            }

            return '';
        };

        $scope.getComplexWorkO2Note = function () {
            return $scope.relatedSACounter > 1 ? Labels.MultipleRelatedServicesSentence.replace('$0', $scope.relatedSACounter) : Labels.SingleRelatedServicesSentence;
        };

        $scope.generateConfirmationMsgComplexO2 = function () {
            return Labels.ConfirmationMsgRelatedSAO2.replace('$0', $scope.relatedSACounter);
        };

        $scope.runAgain = function (policyId) {
            $scope.controlServiceForm.doFirstStage({ PolicyOverrideId: policyId }, null, true); //fix for W-11572336
        };

        CommunicationService.getPolicies().then(function (policies) {
            return $scope.policies = policies;
        });

        $scope.generatePartialResult = function (p) {
            return Labels.partialResults[p.Operation].replaceAll(p.Processed, p.Total);
        };

        CommunicationService.getGetCandidatesData().then(function (getCandidatesData) {
            $scope.getCandidatesData = getCandidatesData;

            $scope.GRADES = {
                STAR: getCandidatesData.IdealThreshold,
                EXCELLENT: getCandidatesData.IdealThreshold,
                GOOD: getCandidatesData.RecommendedThreshold
            };
        });

        $scope.safeHtml = function (str) {
            return $sce.trustAsHtml(str);
        };

        $scope.controlServiceForm = {};

        $scope.onFirstStageCompleted = function (result) {
            resetState();
            $scope.currentResourceName = result.firstStageResult.Data.ResourceName;
            $scope.ResourceId = result.firstStageResult.Data.ResourceId;
            $scope.currentStart = result.firstStageResult.Data.Start;
            $scope.currentFinish = result.firstStageResult.Data.Finish;
            $scope.service = result.firstStageResult.Service;
            $scope.slots = result.firstStageResult.Data.Slots;
            $scope.relatedSACounter = $scope.slots.relatedSACounter;

            $scope.partialResults = $scope.slots.PartialResults || [];

            policyDerived = result.firstStageResult.Data.DerivedPolicy || null;
            $scope.policyUsed.id = result.firstStageResult.Data.PolicyUsed;
            fslOperationId = $scope.slots.FSLOperationId;

            // check if this is mst
            if (fslOperationId) {

                if (window.noMstPushTopic) {
                    $scope.state = 'error';
                    return;
                }

                if (result.firstStageResult.Data.mstTree) {

                    $scope.mstTree = result.firstStageResult.Data.mstTree.reduce(function (tree, service) {
                        tree[service.ServiceId] = service.AppointmentNumber;
                        return tree;
                    }, {});
                }

                console.log('get candidates with MST - fslOp:  ' + fslOperationId);

                var mstDeferred = $q.defer();

                MstResolver.getUpdates(fslOperationId).then(function (fslOpResults) {
                    console.log('fsl op returned');
                    console.log(fslOpResults);
                    $scope.slots = fslOpResults.fslOperation.result;
                    $scope.partialResults = $scope.slots.PartialResults || [];
                    $scope.photos = fslOpResults.Photos;
                    $scope.ResourcesInfo = fslOpResults.ResourcesInfo;
                    $scope.GetCandidatesFieldsSet = fslOpResults.GetCandidatesFieldsSet;
                    gotSlots();
                    mstDeferred.resolve();
                }).catch(function (ex) {
                    var rejectObject = typeof ex === 'string' ? { message: ex } : ex;
                    mstDeferred.reject(rejectObject);
                });

                return mstDeferred.promise;
            }

            if (result.firstStageResult.Data.mstTree) {

                $scope.mstTree = result.firstStageResult.Data.mstTree.reduce(function (tree, service) {
                    tree[service.ServiceId] = service.AppointmentNumber;
                    return tree;
                }, {});
            }

            $scope.ResourcesInfo = result.firstStageResult.Data.ResourcesInfo;
            $scope.photos = result.firstStageResult.Data.Photos;
            $scope.GetCandidatesFieldsSet = result.firstStageResult.Data.GetCandidatesFieldsSet;

            gotSlots();
        };

        $scope.formatGrade = function (grade) {
            return grade < 1 ? 1 : Math.floor(grade);
        };

        // reset state to original
        function resetState() {
            $scope.state = 'loading';
            $scope.candidates = [];
            $scope.selectedSlot = null;
            $scope.updatedService = null;
            $scope.loadingText = Labels.FindingCandidates;
        }

        // select a slot
        $scope.setSelectedSlot = function (slot, $event) {

            $event.stopPropagation();
            $event.stopImmediatePropagation();

            if (!slot.current) {
                $scope.selectedSlot = slot;
                $scope.formClass['AN-with-button'] = true;
            }
        };

        // is this the currently scheduled slot
        $scope.isCurrentSlot = function (slot) {
            if ($scope.service.ResourceId === slot.ResourceId && $scope.service.Start === slot.Interval.Start) {
                return true;
            }

            return false;
        };

        // return highest grade
        $scope.getHighGrade = function (slots) {

            var biggest = slots[0].Grade;

            for (var i = 1; i < slots.length; i++) {
                if (slots[i].Grade > biggest) biggest = slots[i].Grade;
            }

            return biggest;
        };

        // format day for display
        $scope.formatDate = function (date) {
            return chatterActionUtils.changeDateToTerritoryTZ(moment(date)).format('llll');
        };

        // format finish day for display
        $scope.formatFinishDate = function (start, finish) {

            var startDate = new Date(start),
                finishDate = new Date(finish);

            if (startDate.getDate() !== finishDate.getDate()) {
                return chatterActionUtils.changeDateToTerritoryTZ(moment(finish)).format('llll');
            }

            return chatterActionUtils.changeDateToTerritoryTZ(moment(finish)).format('LT');
        };

        // get candidates
        function gotSlots() {

            var slots = $scope.slots;
            var gotSlots = false,
                realCandidates = [];

            for (var key in slots.ResourceIDToScheduleData) {
                if (slots.ResourceIDToScheduleData[key].SchedulingOptions.length > 0) {
                    var resourceData = slots.ResourceIDToScheduleData[key];
                    gotSlots = true;
                    realCandidates.push(resourceData);

                    resourceData.ResourceId = key;
                    for (var i = 0; i < resourceData.SchedulingOptions.length; i++) {
                        resourceData.SchedulingOptions[i].ResourceId = key;
                    }
                }
            }

            // we might got candidates but with no scheduling options
            if (!gotSlots) {
                $scope.state = 'no-candidates';
                return;
            }

            realCandidates.map(function (candidate) {

                var res = null,
                    name = null;

                candidate.highestGrade = candidate.SchedulingOptions[0].Grade;
                candidate.resourceData = [];

                if (_.isEmpty($scope.GetCandidatesFieldsSet) === false) {

                    for (var key in $scope.GetCandidatesFieldsSet) {

                        var FullAPIName = $scope.GetCandidatesFieldsSet[key].FullAPIName;
                        var APIName = $scope.GetCandidatesFieldsSet[key].APIName;

                        if ($scope.ResourcesInfo[candidate.ResourceId] === undefined || $scope.ResourcesInfo[candidate.ResourceId][FullAPIName] === undefined) {
                            candidate.resourceData.push({ key: [key], value: '-', name: '-' });
                        } else {

                            switch ($scope.GetCandidatesFieldsSet[key].Type) {
                                case $scope.fieldsTypes.DateTime:
                                    res = $filter('amDateFormat')($scope.ResourcesInfo[candidate.ResourceId][FullAPIName], 'lll');
                                    candidate.resourceData.push({ key: [key], value: res, name: '-' });
                                    break;

                                case $scope.fieldsTypes.Date:
                                    res = $filter('amDateFormat')($scope.ResourcesInfo[candidate.ResourceId][FullAPIName], 'L');
                                    candidate.resourceData.push({ key: [key], value: res, name: '-' });
                                    break;

                                case $scope.fieldsTypes.Reference:
                                    name = '-';
                                    if ($scope.ResourcesInfo[candidate.ResourceId][APIName]['Name'] !== undefined) {
                                        name = $scope.ResourcesInfo[candidate.ResourceId][APIName]['Name'];
                                    }

                                    candidate.resourceData.push({ key: [key], value: $scope.ResourcesInfo[candidate.ResourceId][APIName], name: name });
                                    break;

                                default:
                                    name = '-';
                                    if ($scope.ResourcesInfo[candidate.ResourceId][FullAPIName]['Name'] !== undefined) {
                                        name = $scope.ResourcesInfo[candidate.ResourceId][FullAPIName]['Name'];
                                    }
                                    candidate.resourceData.push({ key: [key], value: $scope.ResourcesInfo[candidate.ResourceId][FullAPIName], name: name });
                            }
                        }
                    }
                } else {
                    $scope.resourceCandidateFieldSetIsNotEmpty = false;
                }

                for (var _i = 1; _i < candidate.SchedulingOptions.length; _i++) {
                    if (candidate.SchedulingOptions[_i].Grade > candidate.highestGrade) candidate.highestGrade = candidate.SchedulingOptions[_i].Grade;
                }
            });

            $scope.candidates = realCandidates.sort(function (a, b) {
                if (a.highestGrade > b.highestGrade) return -1;
                if (a.highestGrade < b.highestGrade) return 1;
                return 0;
            });

            $scope.state = 'candidates';
        }

        $scope.getPictureLink = function (candidate) {
            var user = $scope.photos[candidate.ResourceId] ? $scope.photos[candidate.ResourceId].RelatedRecord : null,
                link = null;

            if (user) link = user.SmallPhotoUrl;

            if (link && link.endsWith('profilephoto/005/T')) link = null;

            if ($scope.photos[candidate.ResourceId].Picture_Link__c) link = $scope.photos[candidate.ResourceId].Picture_Link__c;

            return link;
        };

        $scope.isServiceCrew = function (candidate) {
            return candidate.Resource.Resource.ResourceType === 'C' && $scope.photos[candidate.ResourceId].Picture_Link__c == undefined;
        };

        $scope.formatMstScheduling = function (mstOption, key) {
            return Labels.mstGetCandidateLabel.replaceAll($scope.mstTree[key], $scope.formatDate(mstOption.Interval.Start), mstOption.Resource.Resource.Name);
        };

        $scope.navigateToReference = function (Id) {
            chatterActionUtils.openService(Id, undefined, true);
        };

        // schedule with selected slot
        $scope.scheduleService = function (slot) {

            var duration = $scope.service.Duration;

            // calculate service duration
            switch ($scope.service.DurationType) {
                case 'Minutes':
                    duration *= 60 * 1000;
                    break;

                case 'Hours':
                    duration *= 60 * 60 * 1000;
                    break;

                case 'Days':
                    duration *= 24 * 60 * 60 * 1000;
                    break;
            }

            $scope.service.Start = slot.Interval.Start;
            $scope.service.Finish = slot.Interval.Start + duration;
            $scope.service.ResourceId = slot.ResourceId;

            var prevService = $scope.service,
                mstOptions = [],
                isMst = false;

            if (slot.MSTOptions) {

                for (var key in slot.MSTOptions) {

                    isMst = true;

                    mstOptions.push({
                        service: key,
                        start: moment(slot.MSTOptions[key].Interval.Start).unix() * 1000,
                        finish: moment(slot.MSTOptions[key].Interval.Finish).unix() * 1000,
                        resource: slot.MSTOptions[key].Resource.Resource.Id
                    });
                }
            }

            $scope.controlServiceForm.doSecondStage({
                Start: $scope.service.Start,
                Finish: $scope.service.Finish,
                ResourceId: $scope.service.ResourceId,
                MstOptions: JSON.stringify(mstOptions),
                IsMst: isMst,
                PolicyOverrideId: $scope.policyUsed.id
            }).then(function (result) {
                $scope.newResourceName = result.secondStageResult.Data.ResourceName;
                $scope.service = result.secondStageResult.Service;
                $scope.service.Start = prevService.Start;
                $scope.state = 'results';
            });
        };
    }]).directive('labelElement', ['$compile', 'GetCandidatesUtils', function ($compile, GetCandidatesUtils) {
        return {
            restrict: 'AEC',
            scope: {
                currentResourceName: '=',
                format: '='
            },
            link: function link(scope, elem, attr) {
                var dynamicElement = angular.element(('<span>' + Labels.Scheduled_to_scheduled_str + '</span>').replaceAll('{{ currentResourceName }}', '{{ format }}'));
                $compile(dynamicElement)(scope);
                elem.append(dynamicElement);
            }
        };
    }]);
})();
'use strict';

(function () {

    angular.module('GetCandidates').factory('CommunicationService', ['$q', function ($q) {

        // get photos of resources that have slots
        function getPicturesOf(idsArray) {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(RemoteActions.getPicturesOf, idsArray, function (pictures, ev) {
                ev.status ? deferred.resolve(pictures) : deferred.reject(ev);
            }, { buffer: true, escape: false, timeout: 30000 });

            return deferred.promise;
        }

        // schedule service with slot
        function scheduleService(updatedObject) {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(RemoteActions.updateService, updatedObject, function (updatedService, ev) {
                ev.status ? deferred.resolve(updatedService) : deferred.reject(ev);
            }, { buffer: true, escape: false, timeout: 30000 });

            return deferred.promise;
        }

        // get initial data
        function getGetCandidatesData() {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(RemoteActions.getGetCandidatesData, function (data, ev) {
                ev.status ? deferred.resolve(data) : deferred.reject(ev);
            }, { buffer: true, escape: false, timeout: 30000 });

            return deferred.promise;
        }

        // get policy list
        function getPolicies() {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(RemoteActions.getPolicies, function (policies, ev) {
                ev.status ? deferred.resolve(policies) : deferred.reject(ev);
            }, { buffer: true, escape: false, timeout: 30000 });

            return deferred.promise;
        }

        // return factory
        return {
            getPicturesOf: getPicturesOf,
            scheduleService: scheduleService,
            getGetCandidatesData: getGetCandidatesData,
            getPolicies: getPolicies
        };
    }]);

    angular.module('GetCandidates').factory('GetCandidatesUtils', ['$q', function ($q) {
        var fac = {};

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

        return fac;
    }]);
})();