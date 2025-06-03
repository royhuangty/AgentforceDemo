'use strict';

(function () {

    angular.module('serviceExpert').controller('ctrlMap', ['$scope', 'sfdcService', '$rootScope', '$q', 'userSettingsManager', 'servicesService', 'bulkScheduleService', '$timeout', '$filter', 'utils', 'ServiceAppointmentLightboxService', 'ResourceLightboxService', 'TimePhasedDataService', 'FieldSetFieldsService', 'ResourcesAndTerritoriesService', 'LastKnownPositionService', 'DeltaService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'DRAWING_STATES', 'StreamingAPIService', 'RegisterService', 'GeneralLightbox', function ($scope, sfdcService, $rootScope, $q, userSettingsManager, servicesService, bulkScheduleService, $timeout, $filter, utils, ServiceAppointmentLightboxService, ResourceLightboxService, TimePhasedDataService, FieldSetFieldsService, ResourcesAndTerritoriesService, LastKnownPositionService, DeltaService, SERVICE_STATUS, SERVICE_CATEGORY, DRAWING_STATES, StreamingAPIService, RegisterService, GeneralLightbox) {

        $scope.SERVICE_STATUS = SERVICE_STATUS;
        $scope.invokedActions = {};

        // markers
        $scope.allMarkersArray = [];

        // reports
        $scope.reports = {};
        $scope.reportsData = {};

        // ui
        $scope.map = null;
        $scope.markersControl = {};
        $scope.territoriesMarkers = [];
        $scope.firstMapShow = true;
        $scope.trafficLayerEnabled = false;

        $scope.mapControl = {
            center: { latitude: 0, longitude: 0 },
            zoom: 19
        };

        $scope.mapOptions = {
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            },
            streetViewControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            },
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            }
        };

        // map layers pop up
        var defaultMapMarkers = {
            services: true,
            resources: true,
            positions: true,
            territories: true
        };
        var userSettingsMapMarkers = JSON.parse(userSettingsManager.GetUserSettingsProperty('Map_Object_Markers__c')) || defaultMapMarkers;

        $scope.showServices = userSettingsMapMarkers.services;
        $scope.showResources = userSettingsMapMarkers.resources;
        $scope.showLivePositions = userSettingsMapMarkers.positions;
        $scope.showTerritories = userSettingsMapMarkers.territories;
        $scope.showOnMap = false;

        $scope.setMapMarkerUserSettings = function () {
            userSettingsManager.SetUserSettingsProperty('Map_Object_Markers__c', JSON.stringify({
                services: $scope.showServices,
                resources: $scope.showResources,
                positions: $scope.showLivePositions,
                territories: $scope.showTerritories
            }));
        };

        $scope.showTooManyReportsAlert = false;

        $scope.resourcesFilterList = [];
        $scope.filterResourceInputValue = '';
        $scope.filteredResources = {};

        $scope.selectedReport = 'null';

        // info window
        $scope.infoWindowOptions = {
            service: {
                pixelOffset: new google.maps.Size(0, -38)
            },
            resource: {
                pixelOffset: new google.maps.Size(0, -38)
            },
            report: {
                pixelOffset: new google.maps.Size(0, -38)
            },
            livePos: {
                pixelOffset: new google.maps.Size(0, -38)
            }
        };

        $scope.serviceInfoWindow = { show: false, control: {} };
        $scope.resourceInfoWindow = { show: false, control: {} };
        $scope.territoryInfoWindow = { show: false, control: {} };
        $scope.reportInfoWindow = { show: false, control: {} };
        $scope.livePosInfoWindow = { show: false, control: {} };

        // services
        $scope.filteredServices = servicesService.filteredServices;
        $scope.filter = servicesService.filter;
        $scope.currentShowOnMapServiceId = null;

        //polygons stuff
        $scope.drawingStates = DRAWING_STATES;
        $scope.drawState = DRAWING_STATES.NONE;
        $scope.selectedShape = null;
        $scope.selectedShapeColor = $scope.selectedColor;
        $scope.drawingManager;
        $scope.setSelectedShapeColor = setSelectedShapeColor;
        $scope.polygons = {};
        $scope.polygonName = '';
        $scope.polygonTerritory = 'null';
        $scope.territories = {};
        $scope.selectedIntersectingPolygons = {};
        $scope.shouldBound = true;
        $scope.cancelDrawingShape = false;
        $scope.InvisiblePolygons = getInvisiblePolygonsFromStorage();
        $scope.hasCustomPermission = utils.hasCustomPermission;

        // general
        $scope.getServiceInfoRowClass = utils.getServiceInfoRowClass;
        $scope.pinnedStatusesSF = CustomSettings.pinnedStatusesSF;
        $scope.getReportsError = function () {
            return $scope.reportsError;
        };

        // init
        utils.getReports().then(function (reports) {
            if (!reports) return;

            for (var i = 0; i < reports.length; i++) {
                $scope.reports[reports[i].Id] = reports[i];
            }
        }).catch(function (ex) {
            $scope.reportsError = true;
        });

        // when we draw, we will get the latest date from the service, no need to save it
        LastKnownPositionService.getLastKnownPositions();

        // functions

        $scope.redrawAllMarkers = redrawAllMarkers;

        function redrawAllMarkers(showTooManyReportsAlertIfNeeded) {
            $scope.allMarkersArray = [];

            $scope.showResources && drawResources();
            $scope.showServices && drawServices();
            $scope.showLivePositions && drawLivePositions();
            $scope.showTerritories && createTerritoryMarkers();

            drawReports(showTooManyReportsAlertIfNeeded);
        }

        //event for toggle markers.
        $scope.$watch('workingState', function (newValue) {
            if (newValue == 'map') {
                $scope.map = $scope.mapControl.getGMap();
                $timeout(function () {
                    buildResourcesAutoCompleteObjects();
                    redrawAllMarkers();

                    google.maps.event.trigger($scope.mapControl.getGMap(), 'resize');
                    if ($scope.firstMapShow) {
                        if (!$scope.showOnMap) setCenterOfMap();

                        var panorama = $scope.map.getStreetView();
                        var panoramaOptions = {
                            fullscreenControl: false,
                            addressControlOptions: {
                                position: google.maps.ControlPosition.BOTTOM_CENTER
                            }
                        };
                        panorama.setOptions(panoramaOptions);

                        var polyOpts = {
                            fillOpacity: 0.5,
                            strokeWeight: 1,
                            editable: true,
                            draggable: true,
                            fillColor: $scope.selectedColor
                        };

                        $scope.drawingManager = new google.maps.drawing.DrawingManager({
                            drawingMode: null,
                            drawingControl: false,
                            drawingControlOptions: {
                                position: google.maps.ControlPosition.BOTTOM_CENTER,
                                drawingModes: ['polygon']
                            },
                            polygonOptions: polyOpts,
                            rectangleOptions: polyOpts
                        });
                        $scope.drawingManager.setMap($scope.map);

                        setOverlayCompleteListener();
                        drawPolygonsOnMap();
                        //google.maps.event.addListener($scope.map, 'click', clearSelection);
                        // Hide context menu on several events
                        google.maps.event.addListener($scope.map, 'click', function () {
                            $scope.map.setOptions({ draggableCursor: 'grab' });
                            contextMenu.hide();
                        });
                        contextMenu = new ContextMenu($scope.map, options);

                        $scope.firstMapShow = false;
                        $scope.showOnMap = false;
                    }
                }, 0);
            } else {
                $scope.currentShowOnMapServiceId = null;
            }
        });

        $scope.$on('resizeMap', function (event, serviceId) {
            google.maps.event.trigger($scope.mapControl.getGMap(), 'resize');
        });

        $scope.$on('showServiceOnMap', function (event, serviceId) {
            $scope.currentShowOnMapServiceId = serviceId;
            $rootScope.$broadcast('changeWorkingState', 'map');
            $scope.map = $scope.mapControl.getGMap();
            // in order not to set center of other services
            $scope.showOnMap = true;

            $timeout(function () {
                google.maps.event.trigger($scope.mapControl.getGMap(), 'resize');
                var service = TimePhasedDataService.serviceAppointments()[serviceId];
                var centerLatLng = new google.maps.LatLng(service.latitude, service.longitude);
                $scope.map.setCenter(centerLatLng);
                $scope.map.setZoom(20);

                $timeout(function () {

                    if ($scope.markersControl.getPlurals().get(serviceId)) {
                        $scope.markersControl.getPlurals().get(serviceId).gObject.setAnimation(google.maps.Animation.BOUNCE);
                    }

                    $timeout(function () {
                        var marker = $scope.markersControl.getPlurals().get(serviceId);
                        if (marker) marker.gObject.setAnimation(null);
                    }, 3500);
                }, 150);
            }, 0);
        });

        // get stuff
        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            $scope.serviceFields = fieldsSetFieldsObject.MapInfo;
        });

        // general

        $scope.isEmpty = function (o) {
            if (!o) return true;

            return _.isEmpty(o);
        };

        $scope.markerCloseClicked = function () {
            $scope.serviceInfoWindow.show = false;
            $scope.resourceInfoWindow.show = false;
            $scope.territoryInfoWindow.show = false;
            $scope.reportInfoWindow.show = false;
            $scope.livePosInfoWindow.show = false;
            $scope.$apply();
        };

        $scope.openLink = function (service, field) {
            if (field.APIName == 'Resource__r') {
                $scope.openLightbox(service.resourceId, 'resource');
                return;
            }

            utils.openLink(service, field);
        };

        $scope.openReportLink = function (reportLink) {
            if (!reportLink.isReference) return;

            if (reportLink.APIName == 'ServiceResource') {
                $scope.openLightbox(reportLink.Value, 'resource');
                return;
            }

            if (reportLink.APIName == 'ServiceAppointment') {
                $scope.openLightbox(reportLink.Value, 'service');
                return;
            }

            var isConsole = utils.openConsoleTab(null, reportLink.Value);

            if (!isConsole) window.open('../' + reportLink.Value, '_blank');
        };

        function openInfoWindow(marker) {
            var itemType = marker.type;

            //close all InfoWins
            $scope.serviceInfoWindow.show = false;
            $scope.resourceInfoWindow.show = false;
            $scope.territoryInfoWindow.show = false;
            $scope.reportInfoWindow.show = false;
            $scope.livePosInfoWindow.show = false;

            $scope.currentMarker = marker;

            switch (itemType) {
                case 'service':
                    $scope.serviceInfoWindow.show = true;
                    $scope.currentMarker.item = TimePhasedDataService.serviceAppointments()[marker.id];
                    break;

                case 'lastKnownPosition':
                    $scope.livePosInfoWindow.show = true;
                    break;

                case 'resource':
                    $scope.resourceInfoWindow.show = true;
                    break;

                case 'territory':
                    $scope.territoryInfoWindow.show = true;
                    break;

                case 'report':
                    {
                        //$scope.reportFields.push(...marker.item.otherProperties);
                        $scope.reportFields = [];
                        $scope.reportFields.push.apply($scope.reportFields, marker.item.otherProperties);
                        $scope.reportInfoWindow.show = true;
                        break;
                    }
            }

            $timeout(function () {
                $scope.$apply();
                utils.setMapCloseButtonPosition();
            }, 0);
        }

        //call when marker clicked
        $scope.markerClicked = function (gmpasMarker, eventName, marker) {
            openInfoWindow(marker);
        };

        $scope.openLightbox = function (id, mode, resourceLocation) {
            var sectionId = null;
            if (resourceLocation) sectionId = utils.generateResourceId(id, resourceLocation);

            switch (mode) {
                case 'service':
                    // set recently used
                    servicesService.recentlyUsed[id] = true;
                    ServiceAppointmentLightboxService.open(id);
                    break;
                case 'resource':
                    ResourceLightboxService.open(id, sectionId);
                    break;
                case 'homeBase':
                    $scope.$emit('showResourceLightbox', $scope.resources[id]);
                    break;
            }
        };

        $scope.$watch('filter', function (newVal, oldVal) {
            if ($scope.workingState === 'map') {
                redrawAllMarkers();
            }
        }, true);

        // filter pop-up

        $scope.clearResource = function (resourceId) {
            delete $scope.filteredResources[resourceId];
            redrawAllMarkers();
        };

        $scope.clearAllResources = function () {
            $scope.filteredResources = {};
            redrawAllMarkers();
        };

        $scope.addResourceToFilterList = function () {
            var resources = ResourcesAndTerritoriesService.getResources();

            if ($scope.filterResourceInputValue == '' || !resources[$scope.filterResourceInputValue.value]) return;

            $scope.filteredResources[$scope.filterResourceInputValue.value] = resources[$scope.filterResourceInputValue.value];
            $scope.filterResourceInputValue = '';

            redrawAllMarkers();
        };

        function buildResourcesAutoCompleteObjects() {
            $scope.resourcesFilterList = [];

            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date;

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesAndTerritories();
            var resources = ResourcesAndTerritoriesService.getResources();

            for (var resourceId in resources) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];
                var resource = resources[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];

                    if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                        $scope.resourcesFilterList.push({
                            label: resource.name,
                            value: resource.id
                        });
                        break;
                    }
                }
            }
        }

        // reports

        $scope.toggleReportMarkers = function (reportKey) {
            var reportsWrapper = $scope.reportsData[reportKey];
            reportsWrapper.show = !reportsWrapper.show;

            redrawAllMarkers();
        };

        $scope.removeReportFromMap = function (reportKey) {
            delete $scope.reportsData[reportKey];
            redrawAllMarkers();
        };

        $scope.removeAllReportsFromMap = function () {
            $scope.reportsData = {};
            redrawAllMarkers();
        };

        $scope.showReportOnMap = function () {
            if ($scope.selectedReport == "null") return;

            sfdcService.callRemoteAction(RemoteActions.getReportRowsForMap, $scope.selectedReport).then(function (reportRows) {
                $scope.reportsData[$scope.selectedReport] = {
                    show: true,
                    data: reportRows,
                    displayCount: 0
                };

                var showTooManyReportsAlertIfNeeded = true;
                redrawAllMarkers(showTooManyReportsAlertIfNeeded);
            });
        };

        function drawReports(showTooManyReportsAlertIfNeeded) {
            var maxRows = maxReportMarkers;

            for (var reportId in $scope.reportsData) {
                var report = $scope.reportsData[reportId];

                if (!report.show) continue;

                report.displayCount = 0;

                for (var i = 0; i < report.data.length; i++) {
                    var dataRow = report.data[i];
                    if (maxRows == 0) {
                        if (showTooManyReportsAlertIfNeeded) $scope.showTooManyReportsAlert = true;
                        break;
                    }

                    var result = createReportRawMarker(dataRow, reportId + report.displayCount);

                    if (result) {
                        report.displayCount++;
                        maxRows--;
                    }
                }
            }
        }

        function createReportRawMarker(reportRow, rowId) {
            if (!reportRow.latitude) return;

            var rowIcon = staticResources.report;

            if (reportRow.sObjectType === 'ServiceAppointment') rowIcon = staticResources.service_png;else if (staticResources[reportRow.sObjectType.toLowerCase().replace(/ /g, "_")] !== undefined) rowIcon = staticResources[reportRow.sObjectType.toLowerCase().replace(/ /g, "_")];

            var marker = {
                id: rowId,
                icon: rowIcon,
                type: 'report',
                coords: {
                    latitude: reportRow.latitude,
                    longitude: reportRow.longitude
                },
                item: reportRow
            };

            $scope.allMarkersArray.push(marker);

            return true;
        }

        // live positions

        RegisterService.register('positions', function (updatedPositions) {
            redrawAllMarkers();
        });

        // DeltaService.register('positions', function(updatedPositions) {
        //     redrawAllMarkers();
        // });


        // StreamingAPIService.register('positions', function(updatedPositions) {
        //     redrawAllMarkers();
        // });


        function drawLivePositions() {
            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date;

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesAndTerritories();
            var lastPositions = LastKnownPositionService.lastKnownPositions();

            for (var resourceId in lastPositions) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];

                    if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                        createLivePositionMarker(lastPositions[resourceId]);
                        break;
                    }
                }
            }
        }

        function createLivePositionMarker(lastKnowLocation) {
            var resource = ResourcesAndTerritoriesService.getResources()[lastKnowLocation.id];

            if (!$scope.isEmpty($scope.filteredResources) && !$scope.filteredResources[resource.id]) return;

            var marker = {
                id: lastKnowLocation.id + '_position',
                icon: staticResources.livepos_png,
                type: 'lastKnownPosition',
                resourceId: lastKnowLocation.id,
                coords: {
                    latitude: lastKnowLocation.latitude,
                    longitude: lastKnowLocation.longitude
                },
                item: angular.extend(angular.copy(lastKnowLocation), { resourceName: resource.name })
            };

            // convert to user tz
            marker.item.lastModifiedDate = utils.convertDateBetweenTimeZones(marker.item.lastModifiedDate, 'UTC', userTimeZone);

            $scope.allMarkersArray.push(marker);
        }

        // resources

        function drawResources() {
            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date;

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesByPrimariesAndRelocations();

            for (var resourceId in resourcesToTimePhasedLocations) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];

                    if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                        createResourceMarker(timePhasedLoc);
                    }
                }
            }
        }

        function createResourceMarker(timePhasedLoc) {

            if (!timePhasedLoc.latitude) return;

            var resource = ResourcesAndTerritoriesService.getResources()[timePhasedLoc.serviceResource];

            if (!resource) {
                return;
            }

            if (!$scope.isEmpty($scope.filteredResources) && !$scope.filteredResources[resource.id]) return;

            var marker = {
                id: timePhasedLoc.id,
                icon: staticResources.homebase_png,
                type: 'resource',
                resourceId: resource.id,
                serviceTerritory: timePhasedLoc.serviceTerritory,
                coords: {
                    latitude: timePhasedLoc.latitude,
                    longitude: timePhasedLoc.longitude
                },
                item: angular.extend(angular.copy(timePhasedLoc), { resourceName: resource.name })
            };

            $scope.allMarkersArray.push(marker);
        }

        // services

        // actions

        $scope.isPinnedStatus = function () {
            if (!$scope.currentMarker) return;

            var pinnedStatusArray = $scope.pinnedStatusesSF.split(',');
            for (var i = 0; i < pinnedStatusArray.length; i++) {
                if ($scope.currentMarker.item.status === pinnedStatusArray[i]) return true;
            }

            return false;
        };

        $scope.needToShowScheduleButton = function () {
            return $scope.currentMarker && $scope.currentMarker.type == 'service' && !$scope.currentMarker.item.pinned && !$scope.isPinnedStatus() && $scope.hasCustomPermission('Schedule');
        };

        $scope.needToShowDispatchButton = function () {
            return $scope.currentMarker && $scope.currentMarker.type == 'service' && $scope.currentMarker.item.statusCategory != SERVICE_CATEGORY.DISPATCHED && $scope.currentMarker.item.statusCategory == SERVICE_CATEGORY.SCHEDULED;
        };

        $scope.isServiceCurrentlyDispatching = function () {
            return $scope.currentMarker && $scope.invokedActions[$scope.currentMarker.id] == 'dispatched';
        };

        $scope.changeStatusToDispatch = function (serviceId) {
            if ($scope.invokedActions[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            $scope.invokedActions[$scope.currentMarker.id] = 'dispatched';
            servicesService.changeStatus([serviceId], SERVICE_STATUS.DISPATCHED).then(function (changeStatusResult) {
                if (changeStatusResult.services.length > 0) $scope.currentMarker.item = changeStatusResult.services[0];
            }).finally(function () {
                delete $scope.invokedActions[$scope.currentMarker.id];
            });
        };

        $scope.isServiceCurrentlyScheduling = function () {
            return $scope.currentMarker && $scope.invokedActions[$scope.currentMarker.id] == 'schedule';
        };

        $scope.autoScheduleService = function (serviceId) {
            var serviceId = $scope.currentMarker.id;
            if ($scope.invokedActions[serviceId]) {
                alert(customLabels.another_operation_running);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;
            $scope.invokedActions[serviceId] = 'schedule';

            servicesService.autoScheduleService(serviceId).then(function (updatedObjects) {
                servicesService.drawServicesAndAbsences(updatedObjects.services, updatedObjects.absences);
                delete $scope.invokedActions[serviceId];
            });
        };

        // drawing

        function drawServices() {
            var services = $scope.filteredServices.servicesArray;

            for (var i = 0; i < services.length; i++) {
                var service = services[i];
                if (service.id != $scope.currentShowOnMapServiceId) createServiceMarker(service);
            }

            if ($scope.currentShowOnMapServiceId) createServiceMarker(TimePhasedDataService.serviceAppointments()[$scope.currentShowOnMapServiceId]);
        };

        function getCenterOfObjects(objects, hasCoordsProp) {
            var bounds = new google.maps.LatLngBounds();

            for (var i = 0; i < objects.length; i++) {

                var lat = hasCoordsProp ? objects[i].coords.latitude : objects[i].latitude;
                var lng = hasCoordsProp ? objects[i].coords.longitude : objects[i].longitude;

                if (lat && lng) {
                    var serviceLongLat = new google.maps.LatLng(lat, lng);
                    bounds.extend(serviceLongLat);
                }
            }

            return bounds;
        }

        function setCenterByMarkers(markers) {
            var hasCoordsProp = true;
            var bounds = getCenterOfObjects(services, hasCoordsProp);

            if (!bounds.isEmpty()) {
                $scope.map.fitBounds(bounds);
            }
        }

        function setCenterOfMap() {
            // 1st Market st. SF
            var centerLatLng = new google.maps.LatLng(37.794024, -122.394837);
            var services = $scope.filteredServices.servicesArray;
            var bounds = getCenterOfObjects(services);

            if (bounds.isEmpty()) bounds = getCenterOfObjects(_.values(TimePhasedDataService.serviceAppointments()));

            if (!bounds.isEmpty()) {
                $scope.map.fitBounds(bounds);
            } else {
                $scope.map.setCenter(centerLatLng);
            }
        }

        //show set service on map and add marker to servicesMarkers array.
        function createServiceMarker(service) {
            if (!service.latitude) return false;
            if (!$scope.showServices) return false;

            var resourceId = service.getGanttResource();

            if (!$scope.isEmpty($scope.filteredResources) && (resourceId == null || !$scope.filteredResources[resourceId])) return false;

            var serviceIcon = staticResources.service_png;

            if (service.statusCategory == SERVICE_CATEGORY.COMPLETED) {
                serviceIcon = staticResources.service_completed_png;
            }

            var marker = {
                id: service.id,
                icon: serviceIcon,
                type: 'service',
                animation: 2,
                coords: {
                    latitude: service.latitude,
                    longitude: service.longitude
                },
                item: service
            };

            $scope.allMarkersArray.push(marker);
        };

        // create territory markers
        function createTerritoryMarkers() {

            var territories = ResourcesAndTerritoriesService.territories();

            for (var id in territories) {
                if (territories[id].latitude) {
                    $scope.allMarkersArray.push({
                        id: id,
                        icon: staticResources.territory_map_icon,
                        type: 'territory',
                        animation: 2,
                        coords: {
                            latitude: territories[id].latitude,
                            longitude: territories[id].longitude
                        },
                        item: territories[id]
                    });
                }
            }
        }

        $scope.myTreeView = {};
        $scope.lastSelectedLeafId = null;
        $q.all([utils.getPolygons(), ResourcesAndTerritoriesService.promises.territories()]).then(function (results) {
            parsePolygonsResult(results[0]);

            for (var id in ResourcesAndTerritoriesService.territories()) {
                if (utils.getFilteredLocations().indexOf(id) == -1) continue;

                $scope.territories[id] = ResourcesAndTerritoriesService.territories()[id];
            }

            createTerritoryMarkers();

            buildTerritoriesPolygonsTree().then(function (treeData) {
                $scope.locationsTree = treeData;

                $scope.myTreeView = new dhtmlXTreeView({
                    parent: "polygonsByTerritoriesTree",
                    iconset: "font_awesome",
                    checkboxes: true,
                    items: $scope.locationsTree
                });

                $scope.myTreeView.attachEvent("onSelect", function (id, mode) {
                    if ($scope.drawState != DRAWING_STATES.NONE && $scope.drawState != DRAWING_STATES.SELECTED) return false;

                    if (!$scope.lastSelectedLeafId) $scope.lastSelectedLeafId = id;

                    if (!$scope.polygons[id] || $scope.lastSelectedLeafId == undefined || $scope.lastSelectedLeafId == id && $scope.polygons[id] == undefined) {
                        clearSelection();
                        return;
                    }

                    if (mode) {
                        setSelection($scope.polygons[id].polygon);
                        if ($scope.shouldBound && $scope.selectedShape.getVisible()) $scope.map.fitBounds($scope.selectedShape.bounds);

                        $scope.shouldBound = true;
                    }

                    $scope.lastSelectedLeafId = $scope.polygons[id].Id;
                });

                $scope.myTreeView.attachEvent("onCheck", setVisibilityToPolygon);
            });
        });

        /*******************************************************************************************************************
         POLYGONS
         *******************************************************************************************************************/

        function setVisibilityToPolygon(id, state) {
            // if polygon - set visibility to single polygon
            if ($scope.polygons[id]) {
                $scope.polygons[id].polygon.setVisible(state);

                addOrRemoveVisiblePolygon(id, state);
            }

            //if territory - set visibility to all children
            else if (ResourcesAndTerritoriesService.territories()[id] || id == 'NoTerritoryPolygon') {
                    addOrRemoveVisiblePolygon(id);
                    var subItems = $scope.myTreeView.getSubItems(id);
                    for (var i = 0; i < subItems.length; i++) {
                        //setVisibilityToPolygon(subItems[i], state);
                        checkUncheck(subItems[i], state);
                    }
                }

            saveVisiblePolygonToStorage();
        }

        function checkUncheck(id, state) {
            if (!state) $scope.myTreeView.uncheckItem(id);else $scope.myTreeView.checkItem(id);
        }

        function getInvisiblePolygonsFromStorage() {
            var InvisiblePolygons = userSettingsManager.GetUserSettingsProperty('Invisible_Polygons__c');
            if (InvisiblePolygons == undefined) return [];else return JSON.parse(userSettingsManager.GetUserSettingsProperty('Invisible_Polygons__c'));
        }

        function saveVisiblePolygonToStorage() {
            return userSettingsManager.SetUserSettingsProperty('Invisible_Polygons__c', JSON.stringify($scope.InvisiblePolygons));
        }

        function addOrRemoveVisiblePolygon(id, state) {
            for (var i = 0; i < $scope.InvisiblePolygons.length; i++) {
                if ($scope.InvisiblePolygons[i] == id) {
                    $scope.InvisiblePolygons.splice(i, 1);
                    return;
                }
            }

            if (!state) $scope.InvisiblePolygons.push(id);
        }

        function parsePolygonsResult(polys) {
            if (!polys) return;

            for (var i = 0; i < polys.length; i++) {
                if (!polys[i][fieldNames.Polygon.KML__c]) continue;

                $scope.polygons[polys[i].Id] = polys[i];
            }
        }

        function buildTerritoriesPolygonsTree() {

            var deferred = $q.defer();

            var territories = ResourcesAndTerritoriesService.territories();

            var treeData = {},
                m_locationTreeDataUnflatten = [],
                userSettingLocations = utils.getFilteredLocations();

            var noTerr = { 'NoTerritoryPolygon': { id: 'NoTerritoryPolygon' } };

            // add polygons to tree data
            for (var key in $scope.polygons) {
                treeData[key] = {
                    id: key,
                    parent: $scope.polygons[key][fieldNames.Polygon.Service_Territory__c] ? territories[$scope.polygons[key][fieldNames.Polygon.Service_Territory__c]] : noTerr['NoTerritoryPolygon'],
                    text: $scope.polygons[key].Name,
                    icons: { file: "fa-square" },
                    icon_color: $scope.polygons[key][fieldNames.Polygon.Color__c],
                    checked: $scope.InvisiblePolygons.indexOf(key) == -1 ? 1 : 0,
                    items: []
                };
            }

            // start build tree for polygon filtering hierarchy
            for (var id in territories) {
                // if (userSettingLocations.indexOf(id) == -1)
                //     continue;

                treeData[id] = {
                    id: id,
                    parent: ResourcesAndTerritoriesService.territories()[id].parentTerritory ? ResourcesAndTerritoriesService.territories()[id].parentTerritory : 0,
                    text: ResourcesAndTerritoriesService.territories()[id].name,
                    icons: { file: "fa-building-o" },
                    checked: $scope.InvisiblePolygons.indexOf(id) == -1 ? 1 : 0,
                    items: []
                };
            }

            treeData['NoTerritoryPolygon'] = {
                id: 'NoTerritoryPolygon',
                parent: 0,
                text: customLabels.Polygons_without_Service_Territory,
                icons: { file: "fa-building-o" },
                checked: $scope.InvisiblePolygons.indexOf('NoTerritoryPolygon') == -1 ? 1 : 0,
                items: []
            };

            for (var _key in treeData) {

                var node = treeData[_key];
                var activeParent = getFirstActiveParent(node);

                if (node.parent !== 0 && activeParent) {
                    treeData[activeParent.id].items.push(node);
                } else {
                    m_locationTreeDataUnflatten.push(node);
                }
            }

            function getFirstActiveParent(node) {
                if (!node.id || !node.parent) return;

                if (treeData[node.parent.id]) return node.parent;else {

                    //check if territory is even available for user
                    var parentNode = {};
                    if (ResourcesAndTerritoriesService.allTerritories[node.parent.id]) parentNode = {
                        id: ResourcesAndTerritoriesService.allTerritories[node.parent.id].id,
                        parent: ResourcesAndTerritoriesService.allTerritories[node.parent.id].parentTerritory ? ResourcesAndTerritoriesService.allTerritories[node.parent.id].parentTerritory : 0
                    };

                    return getFirstActiveParent(parentNode);
                }
            }

            deferred.resolve(m_locationTreeDataUnflatten);
            //$scope.locationsTree = m_locationTreeDataUnflatten;

            return deferred.promise;
        }

        function addPolygon(polygonObject, coords) {
            // Construct the polygon.
            var polygon = new google.maps.Polygon({
                name: polygonObject.Name,
                id: polygonObject.Id,
                paths: coords,
                strokeColor: '#000',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: polygonObject[fieldNames.Polygon.Color__c],
                fillOpacity: 0.50,
                editable: false,
                draggable: false,
                clickable: true,
                visible: true
            });

            //polygon.addListener('click', setSelection);

            return polygon;
        }

        function drawPolygonsOnMap() {
            $scope.geoXmlParser = new geoXML3.parser({ map: $scope.map, suppressInfoWindows: true, zoom: false });

            if ($scope.isEmpty($scope.polygons)) return;

            var i = 0;
            try {
                for (var key in $scope.polygons) {
                    $scope.geoXmlParser.parseKmlString($scope.polygons[key][fieldNames.Polygon.KML__c]);

                    for (var j = 0; j < $scope.geoXmlParser.docs[i].placemarks.length; j++) {
                        if (!$scope.geoXmlParser.docs[i].placemarks[j].polygon) continue;

                        $scope.geoXmlParser.docs[i].placemarks[j].id = $scope.polygons[key].Id;
                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.id = $scope.polygons[key].Id;
                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.name = $scope.polygons[key].Name;
                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.territory = $scope.polygons[key][fieldNames.Polygon.Service_Territory__c];

                        var isVisible = $scope.InvisiblePolygons.indexOf(key) == -1 ? true : false;
                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.setVisible(isVisible);

                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.addListener('click', function () {
                            $scope.shouldBound = false;
                            contextMenu.hide();
                            setSelection(this);
                        });
                        $scope.geoXmlParser.docs[i].placemarks[j].polygon.addListener('rightclick', rightClickPolygon);

                        $scope.polygons[key].polygon = $scope.geoXmlParser.docs[i].placemarks[j].polygon;
                    }

                    i++;
                }
            } catch (ex) {
                alert('Problem parsing KML string');
                console.error(ex);
            }
        }

        function setOverlayCompleteListener() {
            google.maps.event.addListener($scope.drawingManager, 'overlaycomplete', function (e) {
                var newShape = e.overlay;

                if ($scope.cancelDrawingShape) {
                    $scope.cancelDrawingShape = false;
                    newShape.setMap(null); // Remove drawn but unwanted shape
                    return;
                }

                newShape.type = e.type;
                newShape.set('fillColor', $scope.selectedColor);
                newShape.set('name', $scope.polygonName);
                newShape.set('territory', $scope.polygonTerritory);

                // Switch back to non-drawing mode after drawing a shape.
                $scope.drawingManager.setDrawingMode(null);

                // Add an event listener that selects the newly-drawn shape when the user
                // mouses down on it.
                google.maps.event.addListener(newShape, 'click', function (e) {
                    if (e.vertex !== undefined) {
                        if (newShape.type === google.maps.drawing.OverlayType.POLYGON) {
                            var path = newShape.getPaths().getAt(e.path);
                            path.removeAt(e.vertex);
                            if (path.length < 3) {
                                newShape.setMap(null);
                            }
                        }
                    }

                    setSelection(newShape);
                });

                setSelection(newShape);
            });

            if (typeof google.maps.Polygon.prototype.ToWKT !== 'function') {
                google.maps.Polygon.prototype.ToWKT = function () {
                    var poly = this;

                    // Start the Polygon Well Known Text (WKT) expression
                    var wkt = "POLYGON(";

                    var paths = poly.getPaths();
                    for (var i = 0; i < paths.getLength(); i++) {
                        var path = paths.getAt(i);

                        // Open a ring grouping in the Polygon Well Known Text
                        wkt += "(";
                        for (var j = 0; j < path.getLength(); j++) {
                            // add each vertice, automatically anticipating another vertice (trailing comma)
                            wkt += path.getAt(j).lng().toString() + " " + path.getAt(j).lat().toString() + ",";
                        }

                        // Google's approach assumes the closing point is the same as the opening
                        // point for any given ring, so we have to refer back to the initial point
                        // and append it to the end of our polygon wkt, properly closing it.
                        //
                        // Additionally, close the ring grouping and anticipate another ring (trailing comma)
                        wkt += path.getAt(0).lng().toString() + " " + path.getAt(0).lat().toString() + "),";
                    }

                    // resolve the last trailing "," and close the Polygon
                    wkt = wkt.substring(0, wkt.length - 1) + ")";

                    return wkt;
                };
            }
        }

        function clearSelection() {
            if ($scope.selectedShape) {
                if ($scope.selectedShape.type !== 'marker') {
                    $scope.selectedShape.setEditable(false);
                }

                $scope.selectedShape.set('strokeWeight', 1);
                //$scope.selectedShape.infoWindow.close();

                $scope.selectedShape = null;
                $scope.currentEditPolygon = null;
                $scope.polygonName = '';
                $scope.polygonTerritory = 'null';
            }

            $scope.drawState = $scope.drawState == DRAWING_STATES.DRAW ? DRAWING_STATES.EDIT : DRAWING_STATES.NONE;
        }

        function setSelection(shape) {
            if (this) shape = this;

            if ($scope.drawState == DRAWING_STATES.INTERSECT) {
                if ($scope.currentIntersectingId == shape.id) return;

                if (!$scope.selectedIntersectingPolygons[shape.id]) $scope.selectedIntersectingPolygons[shape.id] = true;else delete $scope.selectedIntersectingPolygons[shape.id];

                $scope.$apply();
                return;
            }

            if (shape.type !== 'marker') {
                clearSelection();
                //shape.setEditable(true);
                $scope.selectedColor = $scope.selectedShapeColor = shape.get('fillColor');

                if ($scope.drawState != DRAWING_STATES.EDIT) $scope.drawState = DRAWING_STATES.SELECTED;
            }

            $scope.polygonName = shape.name;
            $scope.polygonTerritory = shape.territory || 'null';
            $scope.selectedShape = shape;
            setSelectedStroke();

            if (shape.id != $scope.myTreeView.getSelectedId()) {
                $scope.shouldBound = false;
                $scope.myTreeView.selectItem(shape.id);
            }

            $scope.$apply();
        }

        function setSelectedShapeColor(color) {
            if ($scope.selectedShape) {
                $scope.selectedShape.set('fillColor', color);
                $scope.selectedShapeColor = color;
            }

            $scope.selectedColor = color;
        }

        function setSelectedStroke() {
            if ($scope.selectedShape) {
                $scope.selectedShape.set('strokeWeight', 3);
            }
        }

        function deleteSelectedShape() {
            if ($scope.selectedShape) {
                $scope.selectedShape.setMap(null);

                $timeout(function () {
                    if ($scope.currentEditPolygon) {
                        parseKmlStringAndUpdatePolygon($scope.currentEditPolygon);
                    }
                    $scope.polygonName = '';
                    $scope.polygonTerritory = 'null';
                }, 0);
            }
        }

        $scope.toggleDrawMode = function () {
            if ($scope.drawState == DRAWING_STATES.INTERSECT) return;

            $scope.drawingManager.setDrawingMode('polygon');
            clearSelection();
            setColor($scope.selectedColor);
            $scope.drawState = DRAWING_STATES.DRAW;
        };

        $scope.cancelPolygon = function () {
            if ($scope.drawingManager.getDrawingMode() != null) {
                $scope.cancelDrawingShape = true;
                $scope.drawingManager.setDrawingMode(null);
            }

            //remove changes and set old polygon back
            if ($scope.drawState == DRAWING_STATES.EDIT) deleteSelectedShape();

            $scope.drawState = DRAWING_STATES.NONE;
            $scope.selectedIntersectingPolygons = {};
        };

        $scope.editPolygon = function () {
            if ($scope.drawState != DRAWING_STATES.SELECTED || !$scope.selectedShape.getVisible()) return;

            $scope.currentEditPolygon = $scope.polygons[$scope.selectedShape.id];
            $scope.drawState = DRAWING_STATES.EDIT;

            $scope.selectedShape.setEditable(true);
            $scope.selectedShape.setDraggable(true);
        };

        function setColor(color) {
            var polygonOptions = $scope.drawingManager.get('polygonOptions');
            polygonOptions.fillColor = color;
            $scope.drawingManager.set('polygonOptions', polygonOptions);
        }

        $scope.savePolygon = function () {
            if (!$scope.selectedShape) {
                //$scope.drawState = DRAWING_STATES.NONE;
                return;
            }

            var path = [];
            $scope.selectedShape.getPath().forEach(function (element, index) {
                path.push({ "lat": element.lat(), "lng": element.lng() });
            });

            var polygonId = $scope.selectedShape.id || null;
            var polyTerritory = $scope.polygonTerritory != 'null' ? $scope.polygonTerritory : null;

            if (!$scope.polygonName) {
                alert(customLabels.Polygon_name_field_is_empty);
                return;
            }

            // $scope.selectedShape.setEditable(false);
            // $scope.selectedShape.setDraggable(false);

            sfdcService.callRemoteAction(RemoteActions.savePolygon, getKML(path, $scope.selectedShapeColor, $scope.polygonName), $scope.polygonName, $scope.selectedShapeColor, polyTerritory, polygonId).then(function (result) {
                $scope.selectedShape.setMap(null);
                parseKmlStringAndUpdatePolygon(result);

                addItemToPolygonTree(result, polygonId);

                $scope.selectedShape = $scope.polygons[result.Id].polygon;
            });

            $scope.drawState = DRAWING_STATES.NONE;
        };

        $scope.deletePolygon = function () {
            if (!$scope.selectedShape) {
                $scope.drawState = DRAWING_STATES.NONE;
                return;
            }

            if (!confirm(customLabels.This_will_delete_the_selected_polygon.replaceAll($scope.selectedShape.name))) return;

            var polygonId = $scope.selectedShape.id || null;

            sfdcService.callRemoteAction(RemoteActions.deletePolygon, polygonId).then(function (isDeleted) {
                //$scope.selectedShape.infoWindow.close();
                $scope.selectedShape.setMap(null);
                $scope.myTreeView.deleteItem(polygonId);

                clearSelection();
            });

            $scope.drawState = DRAWING_STATES.NONE;
        };

        function addItemToPolygonTree(item, polygonId) {
            if (polygonId) $scope.myTreeView.deleteItem(polygonId);

            var parent = item[fieldNames.Polygon.Service_Territory__c] ? item[fieldNames.Polygon.Service_Territory__c] : 'NoTerritoryPolygon';
            $scope.myTreeView.addItem(item.Id, item.Name, parent); // id, text, parentId


            $scope.myTreeView.checkItem(item.Id);
            $scope.myTreeView.setItemIcons(item.Id, {
                file: "fa-square"
            });
            $scope.myTreeView.setIconColor(item.Id, item[fieldNames.Polygon.Color__c]);
        }

        // KML STUFF
        function convertColorHexToKml(color, alpha) {
            return alpha + color.substring(5, 7) + color.substring(3, 5) + color.substring(1, 3);
        }

        function converPathtoKmlCoordinates(path) {
            var coordsString = '';

            for (var i = 0; i < path.length; i++) {
                coordsString += path[i].lng + ',' + path[i].lat + ',0\n';
            }

            coordsString += path[0].lng + ',' + path[0].lat + ',0';

            return coordsString;
        }

        function getKML(path, color, name) {
            return '<?xml version="1.0" encoding="UTF-8"?> \n                            <kml xmlns="http://www.opengis.net/kml/2.2">\n                                <Style id="' + name.replace(' ', '') + 'Style"> \n                                    <LineStyle> \n                                        <width>1</width> \n                                    </LineStyle> \n                                    <PolyStyle> \n                                        <color>' + convertColorHexToKml(color, 80) + '</color> \n                                    </PolyStyle> \n                                </Style> \n                                <Placemark> \n                                    <name>' + name.replace(' ', '') + '</name> \n                                    <styleUrl>#' + name.replace(' ', '') + 'Style</styleUrl> \n                                    <Polygon> \n                                        <outerBoundaryIs> \n                                            <LinearRing>\n                                                <coordinates>' + converPathtoKmlCoordinates(path) + '</coordinates> \n                                            </LinearRing> \n                                        </outerBoundaryIs> \n                                    </Polygon> \n                                </Placemark> \n                            </kml>';
        }

        function parseKmlStringAndUpdatePolygon(polyObj) {
            $scope.geoXmlParser.parseKmlString(polyObj[fieldNames.Polygon.KML__c]);

            var lastPolyIndex = $scope.geoXmlParser.docs.length - 1;
            for (var j = 0; j < $scope.geoXmlParser.docs[lastPolyIndex].placemarks.length; j++) {
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].id = polyObj.Id;
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon.id = polyObj.Id;
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon.name = polyObj.Name;
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon.territory = polyObj[fieldNames.Polygon.Service_Territory__c];
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon.addListener('click', function () {
                    $scope.shouldBound = false;
                    contextMenu.hide();
                    setSelection(this);
                });
                $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon.addListener('rightclick', rightClickPolygon);

                $scope.polygons[polyObj.Id] = polyObj;
                $scope.polygons[polyObj.Id].polygon = $scope.geoXmlParser.docs[lastPolyIndex].placemarks[j].polygon;
            }
        }

        /*******************************************************************************************************************
         POLYGONS - CONTEXT MENU (copy paste <3)
         *******************************************************************************************************************/
        var options = {};
        var menuItems = [];
        var contextMenu = void 0;

        ContextMenu.prototype = new google.maps.OverlayView();

        /**
         * onAdd is called when the map's panes are ready and the overlay has been
         * added to the map.
         */
        ContextMenu.prototype.onAdd = function () {

            $("<div id='cMenu' class='context-menu-polygon'></div>").appendTo($('#map'));
            var divOuter = $("#cMenu").get(0);

            for (var i = 0; i < this.menuItems.length; i++) {
                var mItem = this.menuItems[i];
                $('<div id="' + mItem.id + '" class="truncate context-menu-polygon-item" title="' + mItem.name + '">' + mItem.label + '</div>').appendTo(divOuter);
            }

            this.div_ = divOuter;

            // Add the element to the "overlayLayer" pane.
            var panes = this.getPanes();
            //panes.overlayLayer.appendChild();
            panes.overlayMouseTarget.appendChild(this.div_);

            var me = this;

            for (var i = 0; i < this.menuItems.length; i++) {
                var mItem = this.menuItems[i];

                var func = function func() {
                    me.clickedItem = this.id;
                    google.maps.event.trigger(me, 'click');
                };

                google.maps.event.addDomListener($("#" + mItem.id).get(0), 'click', $.proxy(func, mItem));
            }

            google.maps.event.addListener(me, 'click', function () {
                callBulkPolygonAction(me.clickedItem);
                event.stopPropagation();
                contextMenu.hide();
            });
        };

        ContextMenu.prototype.draw = function () {

            // BUG: FSL-1520 - commenting out...
            // var div = this.div_;
            // div.style.left = '0px';
            // div.style.top = '0px';
            // div.style.width = '140px';
        };

        // The onRemove() method will be called automatically from the API if
        // we ever set the overlay's map property to 'null'.
        ContextMenu.prototype.onRemove = function () {
            this.div_.parentNode.removeChild(this.div_);
            this.div_ = null;
        };

        // Set the visibility to 'hidden' or 'visible'.
        ContextMenu.prototype.hide = function () {
            if (this.div_) {
                // The visibility property must be a string enclosed in quotes.
                this.div_.style.visibility = 'hidden';
            }
        };

        ContextMenu.prototype.show = function (cpx) {
            if (this.div_) {
                var div = this.div_;
                div.style.left = cpx.x + 5 + 'px';
                div.style.top = cpx.y + 10 + 'px';

                this.div_.style.visibility = 'visible';
            }
        };

        function ContextMenu(map, options) {
            options = options || {}; //in case no options are passed to the constructor
            this.setMap(map); //tells the overlay which map it needs to draw on
            this.mapDiv = map.getDiv(); //Div container that the map exists in
            this.menuItems = options.menuItems || {}; //specific to context menus
            this.isVisible = false; //used to hide or show the context menu
        }

        function rightClickPolygon(mouseEvent) {
            contextMenu.hide();
            this.clickedPolygon_ = this;
            setSelection(this);
            var overlayProjection = contextMenu.getProjection();
            var cpx = overlayProjection.fromLatLngToDivPixel(mouseEvent.latLng);
            contextMenu.show(cpx);

            $scope.map.setOptions({ draggableCursor: 'pointer' });
        }

        //menuItems.push({id:"menu-edit-polygon", className:'context_menu_item', eventName:'edit', label:utils.getSVGIconHTML(lsdIcons.edit) + 'Edit Polygon'});
        if ($scope.hasCustomPermission('Polygons_create_update')) menuItems.push({ id: "menu-intersect-polygon", className: 'context_menu_item', eventName: 'intersect', label: utils.getSVGIconHTML(lsdIcons.cut) + customLabels.Cut_Intersections, name: customLabels.Cut_Intersections });

        if ($scope.hasCustomPermission('Bulk_Schedule')) menuItems.push({ id: "menu-schedule-polygon", className: 'context_menu_item', eventName: 'schedule', label: utils.getSVGIconHTML(lsdIcons.calendar) + customLabels.Schedule, name: customLabels.Schedule });

        if ($scope.hasCustomPermission('Bulk_Unschedule')) menuItems.push({ id: "menu-unschedule-polygon", className: 'context_menu_item', eventName: 'unschedule', label: utils.getSVGIconHTML(lsdIcons.na) + customLabels.Unschedule, name: customLabels.Unschedule });

        if ($scope.hasCustomPermission('Bulk_Dispatch')) menuItems.push({ id: "menu-dispatch-polygon", className: 'context_menu_item', eventName: 'dispatch', label: utils.getSVGIconHTML(lsdIcons.dispatch) + customLabels.Dispatch, name: customLabels.Dispatch });

        menuItems.push({ id: "menu-joepardy-polygon", className: 'context_menu_item', eventName: 'joepardy', label: utils.getSVGIconHTML(lsdIcons.jeopardy) + customLabels.In_Jeopardy, name: customLabels.In_Jeopardy });

        if ($scope.hasCustomPermission('Polygons_create_update')) menuItems.push({ id: "menu-delete-polygon", className: 'context_menu_item', eventName: 'delete', label: utils.getSVGIconHTML(lsdIcons.delete) + customLabels.Delete_polygon, name: customLabels.Delete_polygon });

        options.menuItems = menuItems;

        // custom actions
        utils.customActionsPromise.then(function () {

            var customServiceActions = utils.getCustomActions('map');

            customServiceActions.forEach(function (action, i) {
                menuItems.push({
                    id: 'custom_' + i,
                    className: 'context_menu_item',
                    eventName: 'custom_' + i,
                    label: action.icon ? utils.getSVGIconHTML(action.icon) + action.name : action.name,
                    name: action.name
                });
            });
        });

        function callBulkPolygonAction(clickId) {
            switch (clickId) {
                case "menu-edit-polygon":
                    $scope.mapOptionsToggle = true;
                    $('.polygonsTab').click();
                    $scope.editPolygon();
                    break;
                case "menu-intersect-polygon":
                    $scope.mapOptionsToggle = true;
                    $('.polygonsTab').click();
                    $scope.currentIntersectingId = angular.copy($scope.selectedShape.id);
                    $scope.drawState = DRAWING_STATES.INTERSECT;
                    $scope.$apply();
                    break;
                case "menu-delete-polygon":
                    $scope.deletePolygon();
                    break;
                case "menu-schedule-polygon":
                    bulkScheduleService.schedule(getServicesInPolygon($scope.selectedShape));
                    $scope.$apply();
                    break;
                case "menu-unschedule-polygon":
                    servicesService.unscheduleServices(getServicesInPolygon($scope.selectedShape));
                    break;
                case "menu-dispatch-polygon":
                    //servicesService.changeStatus(getServicesInPolygon($scope.selectedShape), SERVICE_STATUS.DISPATCHED);
                    servicesService.changeStatus(getServicesInPolygon($scope.selectedShape), SERVICE_STATUS.DISPATCHED).then(function (resultObjects) {
                        servicesService.drawServicesAndAbsences(resultObjects.services);
                    }).catch(function (err) {
                        utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message || customLabels.user_is_not_allowed_to_perform_action);
                    });
                    break;
                case "menu-joepardy-polygon":
                    servicesService.setInJeopardy(getServicesInPolygon($scope.selectedShape));
                    break;

                default:

                    if (clickId.indexOf('custom_') === 0) {

                        var actionIndex = parseInt(clickId.split('_')[1]),
                            servicesIds = getServicesInPolygon($scope.selectedShape),
                            action = utils.getCustomActions('map')[actionIndex];

                        if (action.visualforce) {

                            var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                                endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                            //GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&id=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);

                            if (servicesIds.length === 1) {
                                GeneralLightbox.open(action.name, action.visualforce + '?id=' + servicesIds[0] + '&start=' + startDateStr + '&end=' + endDateStr);
                            } else {
                                GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);
                            }

                            break;
                        }

                        sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, getServicesInPolygon($scope.selectedShape), scheduler._min_date, scheduler._max_date).then(function (res) {
                            DeltaService.updateGantt();
                            if (res) {
                                utils.addNotification(action.name, res, null, null);
                            }
                        }).catch(function (ev) {
                            return utils.addNotification(action.name, ev.message, null, null);
                        });

                        break;
                    }
            }
        }

        function getServicesInPolygon(poly) {
            var servicesInside = [];
            for (var i = 0; i < $scope.filteredServices.servicesArray.length; i++) {
                var serviceAppt = $scope.filteredServices.servicesArray[i];

                if (serviceAppt.latitude == null || serviceAppt.longitude == null) continue;

                var saLatlng = new google.maps.LatLng(serviceAppt.latitude, serviceAppt.longitude);
                if (google.maps.geometry.poly.containsLocation(saLatlng, poly)) servicesInside.push(serviceAppt.id);
            }

            return servicesInside;
        }

        $scope.getIntersectionsForPolygons = function () {
            if ($scope.isEmpty($scope.selectedIntersectingPolygons)) return;

            try {
                // Instantiate JSTS WKTReader and get JSTS geometry object
                var wktReader = new jsts.io.WKTReader();
                var selectedGeom = wktReader.read($scope.selectedShape.ToWKT());

                for (var key in $scope.selectedIntersectingPolygons) {

                    // get geometry object for each of selected intersecting polygons
                    var geom2 = wktReader.read($scope.polygons[key].polygon.ToWKT());

                    // In JSTS, Difference of A and B
                    selectedGeom = selectedGeom.difference(geom2);
                }

                // Instantiate JSTS WKTWriter and get new geometry's WKT
                var wktWriter = new jsts.io.WKTWriter();
                var wkt = wktWriter.write(selectedGeom);

                wktToPath(wkt);
            } catch (ex) {
                alert('Problem finding intersections in given polygons.');
                console.error(ex);
            }
        };

        function wktToPath(wkt) {
            var coords = wkt.slice(9, wkt.length - 2).split(',');

            var newPath = [];
            for (var i = 0; i < coords.length; i++) {
                var latLng = coords[i].split(' ');
                newPath.push(new google.maps.LatLng({ lat: parseFloat(latLng[1]), lng: parseFloat(latLng[0]) }));
            }

            $scope.selectedShape.setPath(newPath);
            $scope.savePolygon();

            $scope.selectedIntersectingPolygons = {};
        }
    }]);
})();