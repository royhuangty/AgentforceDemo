'use strict';

/*

 OptimizationRequestsService

 */

(function () {

    OptimizationRequestsService.$inject = ['$q', 'sfdcService', 'utils', 'RegisterService', 'TimePhasedDataService', 'StateService', 'ResourcesAndTerritoriesService'];

    angular.module('serviceExpert').factory('OptimizationRequestsService', OptimizationRequestsService);

    function OptimizationRequestsService($q, sfdcService, utils, RegisterService, TimePhasedDataService, StateService, ResourcesAndTerritoriesService) {

        var _optimizationRequests = {},
            inDayOptimizationsIntervals = {},
            policies = {},
            OptimizationsRequestTypes = {},
            OptimizationRequestsProgressStatus = {};

        $q.all([TimePhasedDataService.promises.initialPhasedData, StateService.promises.policies(), sfdcService.getOptimizationRequests(), sfdcService.callRemoteAction(RemoteActions.getOptimizationsRequestTypes)]).then(function (requests) {
            requests[1].forEach(function (policy) {
                policies[policy.Id] = policy;
            });

            OptimizationsRequestTypes = requests[3];

            requests[2].forEach(function (req) {
                _optimizationRequests[req.Id] = new OptimizationRequest(req);

                OptimizationRequestsProgressStatus[req.Id] = { 'canAbort': canAbortOR(_optimizationRequests[req.Id]),
                    'status': _optimizationRequests[req.Id].status,
                    'objectToScheduled': _optimizationRequests[req.Id].objectToScheduled,
                    'aborting': false,
                    'progressInterval': null };

                addSmartActionTimespan(_optimizationRequests[req.Id]);
            });
        });

        // register to delta - optimization requests
        RegisterService.register('optimizationRequests', function (requests) {
            requests.forEach(function (req) {

                var newRequest = new OptimizationRequest(req);

                // check if exist
                if (_optimizationRequests[req.Id] && _optimizationRequests[req.Id].timespan) {
                    for (var i = 0; i < _optimizationRequests[req.Id].timespan.length; i++) {
                        scheduler.deleteMarkedTimespan(_optimizationRequests[req.Id].timespan[i]);
                    }
                }

                // dont re-write over existing request - just update the fields
                if (_optimizationRequests[req.Id] && _optimizationRequests[req.Id].type === 'Global Optimization') {
                    for (var key in newRequest) {
                        _optimizationRequests[req.Id][key] = newRequest[key];
                    }
                } else {
                    _optimizationRequests[req.Id] = newRequest;
                }

                if (OptimizationRequestsProgressStatus[req.Id]) OptimizationRequestsProgressStatus[req.Id]['canAbort'] = canAbortOR(newRequest);else {
                    OptimizationRequestsProgressStatus[req.Id] = { 'canAbort': canAbortOR(newRequest),
                        'status': newRequest.status,
                        'objectToScheduled': newRequest.objectToScheduled,
                        'aborting': false,
                        'progressInterval': null };
                }

                addSmartActionTimespan(newRequest);
            });

            updateViewDebounced();
        });

        // add timespan for smart action
        function addSmartActionTimespan(request) {

            if (request.type === OptimizationsRequestTypes['IN_DAY']) {
                if (request.status === 'In Progress' || request.status === 'Completed' && OptimizationRequestsProgressStatus[request.id] && OptimizationRequestsProgressStatus[request.id].status !== 'Completed' || request.status === 'In Progress' && OptimizationRequestsProgressStatus[request.id] && OptimizationRequestsProgressStatus[request.id].status !== 'Aborted') {
                    request.timespan = markSmartActionOnTerritory(request);
                } else if (request.status === 'Completed' || request.status === 'Failed' || request.status === 'Aborted') {
                    for (var i = 0; i < request.territories.length; i++) {
                        if (inDayOptimizationsIntervals[request.territories[i].serviceTerritory] && inDayOptimizationsIntervals[request.territories[i].serviceTerritory][request.id]) {
                            delete inDayOptimizationsIntervals[request.territories[i].serviceTerritory][request.id];
                        }
                    }
                }
            } else if (request.status !== 'Failed' && request.status !== 'Aborted' && request.status !== 'Completed' && request.type !== 'Global Optimization' && request.start && request.finish) {
                request.timespan = [markSmartActionOnResource(request)];
            }
        }

        function markSmartActionOnTerritory(request) {

            var timespans = [];

            if (request.territories) {

                var optimizationTerritoriesIdsMap = {};

                for (var i = 0; i < request.territories.length; i++) {
                    optimizationTerritoriesIdsMap[request.territories[i].serviceTerritory] = true;
                }

                var ganttTerritoriesSections = TimePhasedDataService.getGanttSectionsIdsByTerritory(optimizationTerritoriesIdsMap, request.start);

                for (var territoryId in ganttTerritoriesSections) {

                    var inDayInterval = { start: request.start, end: request.finish };

                    if (!useLocationTimezone) {
                        inDayInterval.start = utils.convertDateBetweenTimeZones(request.start, userTimeZone, ganttTerritoriesSections[territoryId].tz);
                        inDayInterval.end = utils.convertDateBetweenTimeZones(request.finish, userTimeZone, ganttTerritoriesSections[territoryId].tz);
                    }

                    if (!inDayOptimizationsIntervals[territoryId]) {
                        inDayOptimizationsIntervals[territoryId] = {};
                    }

                    inDayOptimizationsIntervals[territoryId][request.id] = inDayInterval;

                    for (var resourceId in ganttTerritoriesSections[territoryId].resources) {

                        var timespan = scheduler.addMarkedTimespan({

                            start_date: inDayInterval.start,
                            end_date: inDayInterval.end,

                            sections: { ZoomLevel2: resourceId + '_' + territoryId,
                                ZoomLevel3: resourceId + '_' + territoryId,
                                ZoomLevel4: resourceId + '_' + territoryId,
                                ZoomLevel5: resourceId + '_' + territoryId,
                                ZoomLevel6: resourceId + '_' + territoryId,
                                ZoomLevel7: resourceId + '_' + territoryId
                            },
                            css: 'smart-on-gantt-inday-body'
                        });

                        timespans.push(timespan);
                    }
                }
            }

            return timespans;
        }

        // put running effect on gantt
        function markSmartActionOnResource(request) {
            if (!request.resource) return new Date().getTime();

            var resourceId = void 0,
                resourceByDate = TimePhasedDataService.getResoruceGanttIdByDate(request.resource, request.start),
                cssType = 'reshufle-on-gantt',
                actionLabel = '';

            if (resourceByDate) {
                resourceId = resourceByDate.split(',');
            } else {
                return new Date().getTime();
            }

            switch (request.type) {
                case 'Fix Overlaps':
                    cssType = 'fix-overlaps-on-gantt';
                    actionLabel = customLabels.FixOverlaps;
                    break;
                case 'SA Reshuffle':
                    cssType = 'reshufle-on-gantt';
                    actionLabel = customLabels.Reshuffle;
                    break;
                case 'Fill-In Schedule':
                    cssType = 'fillin-on-gantt';
                    actionLabel = customLabels.Fill_in_Schedule;
                    break;
                case 'Group Nearby SAs':
                    cssType = 'group-near-on-gantt';
                    actionLabel = customLabels.GroupNearby;
                    break;
                case 'Resource Schedule Optimization':
                    cssType = 'resource-day-on-gantt';
                    actionLabel = customLabels.RDOptimize;
                    break;
                default:
                    cssType = 'reshufle-on-gantt';
            }

            // convert times if using territory timezone
            if (window.useLocationTimezone && request.territories && request.territories[0] && request.type !== 'Resource Schedule Optimization') {
                var requestStartDiffInMinutes = utils.getLocationOffset(request.start, request.territories[0].serviceTerritory),
                    requestFinishDiffInMinutes = utils.getLocationOffset(request.finish, request.territories[0].serviceTerritory);

                request.start.setMinutes(request.start.getMinutes() + requestStartDiffInMinutes);
                request.finish.setMinutes(request.finish.getMinutes() + requestFinishDiffInMinutes);
            }

            //support USER TZ + TERRITORY TZ for RSO (no diff)
            else if (request.territories && request.territories[0] && request.type === 'Resource Schedule Optimization') {

                    var _requestStartDiffInMinutes = utils.getLocationOffset(request.start, request.territories[0].serviceTerritory),
                        _requestFinishDiffInMinutes = utils.getLocationOffset(request.finish, request.territories[0].serviceTerritory);

                    //if (window.useLocationTimezone) {
                    request.start = new Date(request.start.getTime() - _requestStartDiffInMinutes * 60 * 1000 + utils.getUserOffset(request.start) * 60 * 1000);
                    request.finish = new Date(request.finish.getTime() - _requestFinishDiffInMinutes * 60 * 1000 + utils.getUserOffset(request.finish) * 60 * 1000);
                    //}
                    // else {
                    //     request.start = new Date(request.start.getTime() - (requestStartDiffInMinutes * 60 * 1000) + utils.getUserOffset(request.start)* 60 * 1000);
                    //     request.finish = new Date(request.finish.getTime() - (requestFinishDiffInMinutes * 60 * 1000) + utils.getUserOffset(request.start)* 60 * 1000);
                    // }
                }

            return scheduler.addMarkedTimespan({

                start_date: request.start,

                end_date: request.finish,

                sections: { ZoomLevel2: resourceId, ZoomLevel3: resourceId, ZoomLevel4: resourceId, ZoomLevel5: resourceId, ZoomLevel6: resourceId, ZoomLevel7: resourceId },
                css: 'smart-on-gantt ' + cssType,
                html: '<div><span>' + actionLabel + '</span></div>'
            });
        }

        function getNumOfActiveOptimizationRequests() {

            var sum = 0;

            for (var key in _optimizationRequests) {
                if (_optimizationRequests[key].status !== 'Completed' && _optimizationRequests[key].status !== 'Failed' && _optimizationRequests[key].status !== 'Aborted') {
                    sum++;
                }
            }

            return sum;
        }

        function isTerritoryHasInDayOptimizationInProgress(start, end, territoryId) {
            if (inDayOptimizationsIntervals[territoryId]) {
                for (var inDayRequestId in inDayOptimizationsIntervals[territoryId]) {
                    if (isIntersect(inDayOptimizationsIntervals[territoryId][inDayRequestId].start, inDayOptimizationsIntervals[territoryId][inDayRequestId].end, start, end)) {
                        return _optimizationRequests[inDayRequestId];
                    }
                }
            }

            return false;
        }

        function generateRequestResultText(request) {

            if (request.failureReason && request.failureReason.length > 0) {

                if (request.failureReason === 'User Aborted') return request.failureDetails;

                return request.failureReason;
            }

            if (request.type == OptimizationsRequestTypes['RSO'] && ResourcesAndTerritoriesService.getResources()[request.resource]) {

                // CFSL-1270
                //return customLabels.rso_optimization_request_for_name.replaceAll(ResourcesAndTerritoriesService.getResources()[request.resource].name);

                return customLabels.rso_optimization_request_for_name.replaceAll(request.resourceName);
            }

            if (request.type == OptimizationsRequestTypes['IN_DAY'] || request.type == OptimizationsRequestTypes['BGO']) {

                var terrNames = [];
                request.territories.forEach(function (ter) {

                    // CFSL-1270
                    // terrNames.push(ResourcesAndTerritoriesService.territories()[ter.serviceTerritory].name);

                    terrNames.push(ter.serviceTerritoryName);
                });

                if (terrNames.length > 3) terrNames = terrNames.length + ' ' + customLabels.UTterr;else terrNames = terrNames.join(', ');

                if (request.status == 'In Progress') {
                    return customLabels.optimization_for_terr_in_progress.replaceAll(request.type, terrNames);
                }

                if (request.status == 'Completed') {
                    var resultLabel = request.scheduledAmount || request.scheduledAmount === 0 ? customLabels.optimization_for_terr_completed : customLabels.o2_optimization_for_terr_completed;
                    return resultLabel.replaceAll(request.type, terrNames, request.scheduledAmount);
                }
            }

            return request.result;
        }

        function canAbortOR(request) {

            // if has custom permission
            if (!utils.hasCustomPermission('Abort_Optimization_Request')) return false;

            // if already aborting
            if (OptimizationRequestsProgressStatus[request.id] && OptimizationRequestsProgressStatus[request.id].aborting) return false;

            // if OR is open, queued, in progress ( W-10307127 - new status - Finalizing )
            if (request.status === 'Completed' || request.status === 'Aborted' || request.status === 'Failed' || request.status === 'Finalizing') return false;

            // if OR is of optimization type
            for (var key in OptimizationsRequestTypes) {
                if (request.type == OptimizationsRequestTypes[key]) return true;
            }

            return false;
        }

        function abortOptRequest(request) {
            if (!confirm(customLabels.confirm_abort_current_optimization)) return;

            request.status = 'Aborting';

            if (OptimizationRequestsProgressStatus[request.id]) {
                OptimizationRequestsProgressStatus[request.id].aborting = true;
                OptimizationRequestsProgressStatus[request.id].canAbort = false;
            } else {
                OptimizationRequestsProgressStatus[request.id] = { aborting: true, canAbort: false };
            }

            sfdcService.callRemoteAction(RemoteActions.abortOptimizationRequest, request.id).then().catch(function (err) {
                console.warn(err);
            });

            // sfdcService.abortOptimizationRequest(request.id).then()
            // .catch( err => {
            //     console.warn(err);
            // });
        }

        function updateProgressStatus(id, status) {
            if (OptimizationRequestsProgressStatus[id]) OptimizationRequestsProgressStatus[id].status = status;else OptimizationRequestsProgressStatus[id] = { status: status };
        }

        function calculateIndayProgress(request) {
            var returnText = void 0;

            if (request.status == 'Completed') {
                OptimizationRequestsProgressStatus[request.id].status = 'Completed';

                //show 100% and remove progress bar and marked timespan
                setTimeout(function () {
                    if (_optimizationRequests[request.id] && _optimizationRequests[request.id].timespan) {
                        for (var i = 0; i < _optimizationRequests[request.id].timespan.length; i++) {
                            scheduler.deleteMarkedTimespan(_optimizationRequests[request.id].timespan[i]);
                        }
                    }

                    for (var _i = 0; _i < request.territories.length; _i++) {
                        if (inDayOptimizationsIntervals[request.territories[_i].serviceTerritory] && inDayOptimizationsIntervals[request.territories[_i].serviceTerritory][request.id]) {
                            delete inDayOptimizationsIntervals[request.territories[_i].serviceTerritory][request.id];
                        }
                    }
                }, 2000);

                return { percent: 100,
                    text: customLabels.In_Day_Optimization_Completed };
            }

            if (request.status == 'In Progress' && OptimizationRequestsProgressStatus[request.id] && OptimizationRequestsProgressStatus[request.id].status == 'Aborted') {
                returnText = customLabels.In_Day_Optimization_Aborting;
            } else {
                returnText = customLabels.In_Day_Optimization_In_Progress;
                OptimizationRequestsProgressStatus[request.id].status = 'In Progress';
            }

            var optimizationSettings = __gantt['inday'];
            var finalObjectsToSchedule = request.objectToScheduled;
            var totalTime = optimizationSettings.maxRunTimeSingleService * finalObjectsToSchedule;
            var secondsElapsed = request.requestProgressStart != null ? new moment().diff(moment(request.requestProgressStart), 'seconds') : 0;

            //if our total runtime is bigger than maximum runtime for optimization - set the variables accordingly. 
            if (totalTime >= optimizationSettings.maxRuntimeOverall) {
                finalObjectsToSchedule = optimizationSettings.maxRuntimeOverall / optimizationSettings.maxRunTimeSingleService;
                totalTime = optimizationSettings.maxRuntimeOverall;
            }

            var current_progress = totalTime !== 0 ? secondsElapsed / totalTime * 100 : 0,
                //percenage time passed since in progress started
            second_progress = 7,
                //trial and error got me to this number
            progress = 0,
                secondStep = 0.1; //second stage steps 

            // gantt was loaded when progress bar was already larger than 90%
            if (secondsElapsed >= totalTime && request.status == 'In Progress') {
                second_progress = 7 + (secondsElapsed - totalTime) / optimizationSettings.maxRunTimeSingleService * secondStep;
                progress = 90;
            }

            if (progress < 90) {
                progress = current_progress;
            }

            //cover edge case
            if (progress >= 100 && current_progress >= 100) {
                progress = 100;
            }

            //never finish until status is completed.
            else if (progress >= 90) {
                    second_progress += secondStep;
                    progress = Math.round(Math.atan(second_progress) / (Math.PI / 2) * 100 * 1000) / 1000;
                }

            return { percent: progress !== 100 ? progress.toFixed(1) : progress,
                text: returnText };
        }

        return {
            getNumOfActiveOptimizationRequests: getNumOfActiveOptimizationRequests,
            optimizationRequests: function optimizationRequests() {
                return _optimizationRequests;
            },
            isTerritoryHasInDayOptimizationInProgress: isTerritoryHasInDayOptimizationInProgress,
            policies: policies,
            OptimizationRequestsProgressStatus: OptimizationRequestsProgressStatus,
            generateRequestResultText: generateRequestResultText,
            calculateIndayProgress: calculateIndayProgress,
            updateProgressStatus: updateProgressStatus,
            canAbortOR: canAbortOR,
            abortOptRequest: abortOptRequest
        };
    }
})();