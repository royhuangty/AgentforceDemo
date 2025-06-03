'use strict';

(function () {

    angular.module('serviceExpert').controller('ctrlRightSide', ['$q', '$scope', '$rootScope', '$filter', '$sce', '$injector', 'sfdcService', 'MapService', 'utils', 'servicesService', 'kpiCalculationsService', 'StateService', 'DeltaService', 'TimePhasedDataService', 'StreamingAPIService', 'RegisterService', 'OptimizationRequestsService', 'LeftSideLocationFilteringService', 'FieldSetFieldsService', function ($q, $scope, $rootScope, $filter, $sce, $injector, sfdcService, MapService, utils, servicesService, kpiCalculationsService, StateService, DeltaService, TimePhasedDataService, StreamingAPIService, RegisterService, OptimizationRequestsService, LeftSideLocationFilteringService, FieldSetFieldsService) {

        var floatingMapSettings = {
            opacity: 1,
            left: null,
            top: null,
            height: 400,
            width: 600
        };

        $scope.isMapEnabled = StateService.isMapEnabled();
        $scope.startLoadMap = true;
        $scope.servicesObjects = servicesService.servicesObjects;
        $scope.servicesScheduledToCapacity = {};
        $scope.notifications = utils.butlerNotifications;
        $scope.unreadNotifications = 0;
        $scope.showServiceList = utils.showServiceList;
        $scope.workingState = 'gantt';
        $scope.openConsoleTab = utils.openConsoleTab;
        $scope.openSObjectLink = utils.openSObjectLink;
        $scope.activeRequests = sfdcService.activeRequests;
        $scope.activeRuleCheckRequests = sfdcService.activeRuleCheckRequests;
        $scope.kpi = kpiCalculationsService.kpis;
        $scope.marginLeftForBox = 0;
        $scope.mapAvailable = mapMode;
        $scope.optimizationRequests = OptimizationRequestsService.optimizationRequests;
        $scope.floatingMapOn = false;
        $scope.optRequestPercentage = 0;
        $scope.OptimizationRequestsProgressStatus = OptimizationRequestsService.OptimizationRequestsProgressStatus;
        $scope.generateRequestResultText = OptimizationRequestsService.generateRequestResultText;
        $scope.canAbortOR = OptimizationRequestsService.canAbortOR;
        $scope.abortOptRequest = OptimizationRequestsService.abortOptRequest;
        $scope.isUseEdge = utils.isUseEdge;
        $scope.isNoTerritoryLoadded = LeftSideLocationFilteringService.isNoTerritoryLoadded;
        $scope.reachedMaxRows = TimePhasedDataService.reachedMaxRows;
        $scope.maxResourceRowsOnGantt = window.__gantt.maxResourceRowsOnGantt;
        $scope.isLoadingNewLocations = function () {
            return StateService.isLoadingNewLocations;
        };

        if (window.isOptimizationViewer) {
            var LoadOptiViewerDataService = $injector.get('LoadOptiViewerDataService');
            $scope.isOptimizationLoaded = LoadOptiViewerDataService.isOptimizationLoaded;
            $scope.isShowingOutputJson = LoadOptiViewerDataService.isShowingOutputJson;
        }

        $scope.$watch('workingState', function (newValue) {
            if (newValue === 'gantt') {
                setTimeout(function () {
                    scheduler._is_initialized() && updateViewDebounced();
                }, 0);
            }
        });

        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            $scope.serviceFields = fieldsSetFieldsObject.MapInfo;;
        });

        $scope.getServiceInfoRowClass = utils.getServiceInfoRowClass;
        $scope.openLink = utils.openLink;

        $scope.order = function (predicate, reverse) {
            $scope.orderByField = predicate;
            $scope.reverse = reverse;
        };

        $scope.$on('changeWorkingState', function (event, workingState) {

            $scope.workingState = workingState;

            if (workingState === 'gantt') {
                setTimeout(function () {
                    updateViewDebounced();
                }, 100);
            } else {
                $('.dhtmlXTooltip').remove();
            }
        });

        // $scope.getRequestCss = status => {
        //     switch (status) {
        //         case 'In Progress': return 'smart_in_progress';
        //         case 'Completed': return 'smart_completed';
        //         case 'Failed': return 'smart_failed';
        //         case 'Open': return 'smart_open';
        //         case 'Queued': return 'smart_queued';
        //     }
        // };

        $scope.showNotifications = function () {
            $scope.unreadNotifications = 0;
            utils.butlerNotifications().forEach(function (notification) {
                return notification.unread = false;
            });
        };

        $scope.calcUnreadNotifications = function () {

            $scope.unreadNotifications = 0;

            utils.butlerNotifications().forEach(function (notification) {
                notification.unread && $scope.unreadNotifications++;
            });

            return $scope.unreadNotifications;
        };

        $scope.numOfNotifications = function () {

            var s = 0;

            utils.butlerNotifications().forEach(function (n) {
                if (n.show) {
                    s++;
                }
            });

            return s;
        };

        $scope.formatTravel = function (time) {
            var travelH = Math.floor(time / 60 / 60),
                travelM = Math.floor(time / 60 % 60);

            return travelH + customLabels.kpi_h + ' ' + travelM + customLabels.kpi_m;
        };

        $scope.toggleServiceList = function () {
            $scope.showServiceList.show = true;

            setTimeout(function () {
                updateViewDebounced();
                $rootScope.$broadcast('resizeMap', {});
            }, 830);
        };

        $scope.isEmpty = function (o) {
            return Object.keys(o).length;
        };

        $scope.getRequestCss = function (status) {
            switch (status) {
                case 'Hold':
                case 'Post Processing':
                case 'In Progress':
                    return 'smart_in_progress';
                case 'Completed':
                    return 'smart_completed';
                case 'Completed First Optimization Day':
                    return 'smart_completed_first_day';
                case 'Finalizing':
                    return 'smart_finalizing';
                case 'Failed':
                    return 'smart_failed';
                case 'Open':
                    return 'smart_open';
                case 'Queued':
                    return 'smart_queued';
                case 'Aborting':
                    return 'smart_in_progress';
                case 'Aborted':
                    return 'smart_failed';
            }
        };

        $scope.moveLocalDtToUserTimezoneDt = function (dt) {
            var newDt = new Date(dt);
            return utils.convertDateBetweenTimeZones(newDt, 'GMT', userTimeZone);
        };

        // register to delta - optimization requests - 13/2/19 commented out - this was moved a while ago to s different service
        // RegisterService.register('optimizationRequests', requests => {
        //     requests.forEach(req => {

        //         let newRequest = new OptimizationRequest(req);

        //         // check if exist
        //         if ($scope.optimizationRequests[req.Id] && $scope.optimizationRequests[req.Id].timespan) {
        //             scheduler.deleteMarkedTimespan($scope.optimizationRequests[req.Id].timespan);
        //         }

        //         $scope.optimizationRequests[req.Id] = newRequest;
        //         addSmartActionTimespan(newRequest);

        //     });

        //     updateViewDebounced();
        // });


        // // add timespan for smart action
        // function addSmartActionTimespan(request) {
        //
        //     if (request.status !== 'Failed' && request.status !== 'Completed'
        //         && request.type !== 'Global Optimization'
        //         && request.start && request.finish) {
        //
        //         request.timespan = markSmartActionOnResource(request);
        //     }
        //
        // }
        //
        //
        // // put running effect on gantt
        // function markSmartActionOnResource(request) {
        //
        //     if (!request.resource)
        //         return new Date().getTime();
        //
        //     let resourceId,
        //         resourceByDate = TimePhasedDataService.getResoruceGanttIdByDate(request.resource, request.start),
        //         cssType = 'reshufle-on-gantt',
        //         actionLabel = '';
        //
        //     if (resourceByDate)
        //         resourceId = resourceByDate.split(',');
        //     else
        //         return new Date().getTime();
        //
        //      switch (request.type) {
        //          case 'Fix Overlaps':
        //             cssType = 'fix-overlaps-on-gantt';
        //             actionLabel = customLabels.FixOverlaps;
        //             break;
        //          case 'SA Reshuffle':
        //             cssType = 'reshufle-on-gantt';
        //             actionLabel = customLabels.Reshuffle;
        //             break;
        //          case 'Fill-In Schedule':
        //             cssType = 'fillin-on-gantt';
        //             actionLabel = customLabels.Fill_in_Schedule;
        //             break;
        //          case 'Group Nearby SAs':
        //             cssType = 'group-near-on-gantt';
        //             actionLabel = customLabels.GroupNearby;
        //             break;
        //          case 'Resource Schedule Optimization':
        //             cssType = 'resource-day-on-gantt';
        //             actionLabel = customLabels.RDOptimize;
        //             break;
        //          default: cssType = 'reshufle-on-gantt';
        //      }
        //
        //        return scheduler.addMarkedTimespan({

        //            start_date: request.start,

        //            end_date: request.finish,

        //            sections: { ZoomLevel2: resourceId, ZoomLevel3: resourceId, ZoomLevel4: resourceId, ZoomLevel5: resourceId, ZoomLevel6: resourceId, ZoomLevel7: resourceId},
        //            css: 'smart-on-gantt ' + cssType,
        //            html: `<div><span>${actionLabel}</span></div>`
        //        });
        // }

        $scope.getNumOfRunningRequests = function () {
            return OptimizationRequestsService.getNumOfActiveOptimizationRequests();
        };

        $scope.openSomethingBox = function ($event, whatBox) {
            if (whatBox === 'smart') $scope.marginLeftForBox = $event.target.offsetLeft - 227;else $scope.marginLeftForBox = $event.target.offsetLeft - 200;
        };

        $scope.shouldShowLongTermError = function () {
            return scheduler._mode === 'LongView' && $scope.workingState === 'gantt' && (window.__gantt.reachedMaxNumberOfServicesInLongView || window.__gantt.reachedMaxNumberOfAbsencesInLongView);
        };
        window.__gantt.shouldShowLongTermError = $scope.shouldShowLongTermError;

        $scope.showFloatingMap = function ($event) {

            $event.stopPropagation();
            $scope.floatingMapOn = true;

            var mapElement = $('#MapContainer');

            mapElement.css('opacity', floatingMapSettings.opacity);

            mapElement.css('height', floatingMapSettings.height + 'px');
            mapElement.css('width', floatingMapSettings.width + 'px');

            if (floatingMapSettings.left) {
                mapElement.css('left', floatingMapSettings.left + 'px');
                mapElement.css('top', floatingMapSettings.top + 'px');
                mapElement.css('bottom', 'auto');
            }
        };

        $scope.changeWorkingState = function (newState) {

            if (newState === $scope.workingState) {
                return;
            }

            $scope.workingState = newState;
            $scope.floatingMapOn = false;

            // $("#FloatingMapOpacity" ).slider({
            //     range: 'min',
            //     min: 40,
            //     max: 100,
            //     value: floatingMapSettings.opacity * 100,
            //     slide: (ev,ui) => {
            //         $('#MapContainer').css('opacity',ui.value / 100);
            //     }
            // });

            if (newState === 'map') {
                $("#MapContainer").removeAttr('style').resizable('disable');
            } else {
                $("#MapContainer").removeAttr('style').resizable('enable');
            }
        };

        $scope.closeFloatingMap = function () {
            $scope.floatingMapOn = false;
            $("#MapContainer").removeAttr('style').resizable('disable');
        };

        setTimeout(function () {

            $('#MapContainer').draggable({
                handle: '#FloatingMapControls',
                containment: 'document',
                start: function start() {/*$('#FloatingMapOverlay').show();*/},
                stop: function stop(ev, ui) {
                    floatingMapSettings.left = ui.position.left;
                    floatingMapSettings.top = ui.position.top;
                }
            }).resizable({
                maxHeight: window.innerHeight - 75,
                maxWidth: window.innerWidth - 75,
                minHeight: 300,
                minWidth: 450,
                handles: 'all',
                containment: 'document',
                distance: 10,
                start: function start() {/*$('#FloatingMapOverlay').show();*/},
                stop: function stop(ev, ui) {
                    //$('#FloatingMapOverlay').hide();
                    floatingMapSettings.width = ui.size.width;
                    floatingMapSettings.height = ui.size.height;
                    floatingMapSettings.left = ui.position.left;
                    floatingMapSettings.top = ui.position.top;
                }
            });

            $("#FloatingMapOpacity").slider({
                range: 'min',
                min: 40,
                max: 100,
                value: 100,
                slide: function slide(ev, ui) {
                    $('#MapContainer').css('opacity', ui.value / 100);
                    floatingMapSettings.opacity = ui.value / 100;
                }
            });
        }, 2000);
    }]);
})();