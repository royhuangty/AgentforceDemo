'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    ResourceLightboxService.$inject = ['$rootScope', 'ResourcesAndTerritoriesService', '$sce', '$compile', 'utils', 'StateService', 'TimePhasedDataService', '$timeout', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'LastKnownPositionService', 'FieldSetFieldsService', 'sfdcService', 'uiGmapIsReady'];

    angular.module('serviceExpert').factory('ResourceLightboxService', ResourceLightboxService);

    function ResourceLightboxService($rootScope, ResourcesAndTerritoriesService, $sce, $compile, utils, StateService, TimePhasedDataService, $timeout, SERVICE_STATUS, SERVICE_CATEGORY, LastKnownPositionService, FieldSetFieldsService, sfdcService, uiGmapIsReady) {

        // create a new scope
        var $scope = null;

        function open(id, sectionId) {

            if ($scope) {
                return;
            }

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // set needed parameters
            $scope.lightboxResource = ResourcesAndTerritoriesService.getResources()[id];
            $scope.terMemberKey = sectionId || TimePhasedDataService.getResoruceGanttIdByDate(id, scheduler.getState().min_date);
            $scope.selectedTab = 'details';

            // add isdtp param to URL to open related list W-14217545
            // needed because of W-12276153
            var isdtpUrlAddon = '&isdtp=p1';

            // page urls
            var resourceCalendarURL = 'vf079_ResourceCalendar?id=';
            if (__gantt.communityNetworkId && __gantt.communityNetworkId !== '' && fslNamespace && fslNamespace !== '') {
                resourceCalendarURL = fslNamespace + '__' + 'vf079_ResourceCalendar?id=';
            }
            $scope.urls = {
                related: $sce.trustAsResourceUrl(customResourceRelatedListLightboxPage + '?id=' + id + isdtpUrlAddon).toString(),
                chatter: $sce.trustAsResourceUrl(customResourceChatter + '?id=' + id).toString(),
                details: $sce.trustAsResourceUrl(customResourceLightboxPage + '?id=' + id).toString(),
                calendar: $sce.trustAsResourceUrl(resourceCalendarURL + id).toString()
            };

            // custom tabs
            $scope.urls.custom1 = CustomResourceTab1 ? $sce.trustAsResourceUrl(CustomResourceTab1 + '?id=' + id).toString() : null;
            $scope.urls.custom2 = CustomResourceTab2 ? $sce.trustAsResourceUrl(CustomResourceTab2 + '?id=' + id).toString() : null;

            // set stuff on scope
            $scope.changeTab = changeTab;
            $scope.closeLightbox = closeLightbox;
            $scope.chatterAvailable = fieldTrackingEnabled.resource;
            $scope.formatTravel = formatTravel;
            $scope.openConsoleTab = utils.openConsoleTab;
            $scope.formatKpitText = formatKpitText;
            $scope.formatDateToTime = formatDateToTime;
            $scope.formatCapacityKpitText = formatCapacityKpitText;
            $scope.getContractorCapacityStatus = getContractorCapacityStatus;
            $scope.isMapEnabled = StateService.isMapEnabled();
            $scope.contractorSupport = StateService.areContractorsSupported();
            $scope.isDaily = scheduler._mode == 'ZoomLevel3' ? true : false;
            $scope.actualRoute = null;
            $scope.showActual = true;
            $scope.toggleShowRoute = toggleShowRoute;
            $scope.toggleActualVisibilityWhenMapTabClicked = toggleActualVisibilityWhenMapTabClicked;
            $scope.boundOnCaruselItem = boundOnCaruselItem;
            $scope.showSideRoute = true;
            $scope.zoomOutToFitAll = zoomOutToFitAll;
            $scope.slideToggle = slideToggle;
            $scope.currentlyShowingOnMap = null;
            $scope.changeDate = changeDate;
            $scope.getColorByStatus = getColorByStatus;
            $scope.showAbsencesOnMap = window.showAbsencesOnMap;
            $scope.hideActulRoute = window.customPermissions.Hide_Actual_Routes_in_Service_Resource_Map;
            $scope.O2PolyLineArray = [];
            $scope.calloutFailures = 0;
            $scope.allowStreetLevelRouting = window.allowStreetLevelRouting;

            $scope.drivingProfile = {
                image: '',
                type: '',
                tolls: '',
                hazmat: ''
            };
            $scope.transportTypeToStaticResource = {
                'Car': staticResources.car_svg,
                'Light Truck': staticResources.light_truck_svg,
                'Heavy Truck': staticResources.heavy_truck_svg,
                'Bicycle': staticResources.bicycle_svg,
                'Walking': staticResources.pedestrian_svg
            };
            $scope.O2Parameters = {
                resourceMap: null,
                resourceServicesMap: null,
                googlePolylineProp: null
            };
            $scope.hideActulRoute = window.customPermissions.Hide_Actual_Routes_in_Service_Resource_Map || isLastKnownFieldsNotAllowed;

            Chart.defaults.global.colours = ['#16325c', // blue
            '#DCDCDC', // light grey
            '#F7464A', // red
            '#46BFBD', // green
            '#FDB45C', // yellow
            '#949FB1', // grey
            '#4D5360' // dark grey
            ];
            $scope.donutCharts = null;
            $scope.isLastKnownFieldsAllowedPermission = function () {
                return !(window.customPermissions.Hide_Actual_Routes_in_Service_Resource_Map || isLastKnownFieldsNotAllowed);
            };

            $scope.haveItemsToShowOnSideRoute = function (markers) {

                for (var i = 0; i < markers.length; i++) {

                    if (markers[i].type === 'na' || markers[i].type === 'service') {
                        return true;
                    }
                }

                return false;
            };

            if ($scope.isMapEnabled) {
                setStuffForMap();
            }

            // calculate KPIs
            calculateKpisForResource(id);
            getContractorCapacityStatus(id);

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#ResourceLightbox').draggable({ containment: 'document', handle: '#ResourceLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            // set lightbox to open
            StateService.setLightBoxStatus();

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            // compile
            $compile(lightboxDomElement)($scope);

            utils.safeApply($scope);

            // get actual route only if user has permissions
            if (!$scope.hideActulRoute) {

                sfdcService.callRemoteAction(RemoteActions.getResourceActualRoute, $scope.lightboxResource.id, scheduler.getState().min_date).then(function (acutalRoute) {

                    uiGmapIsReady.promise(1).then(function () {
                        $scope.map = $scope.mapControl.getGMap();
                        handleActualRoute(acutalRoute);
                    });
                });
            }
        }

        function closeLightbox() {
            $scope.killWatch && $scope.killWatch();
            StateService.setLightBoxStatus(false);
            $scope.$destroy();
            $scope = null;
        }

        function getColorByStatus(item) {

            if (item.ganttColor) {
                return item.ganttColor;
            }

            switch (item.statusCategory) {

                case SERVICE_CATEGORY.NONE:
                    return '#a5e2d6';

                case SERVICE_CATEGORY.SCHEDULED:
                    return '#F9D058';

                case SERVICE_CATEGORY.DISPATCHED:
                    return '#8DD8FA';

                case SERVICE_CATEGORY.IN_PROGRESS:
                    return '#D68EF9';

                case SERVICE_CATEGORY.COMPLETED:
                    return '#95D055';

                case SERVICE_CATEGORY.COULD_NOT_COMPLETE:
                    return '#f58556';

                case SERVICE_CATEGORY.CANCELED:
                    return '#BEBCBA';

                default:
                    return '#B7C9EA';
            }
        }

        function changeTab(tab) {
            if (tab !== $scope.selectedTab) {
                $scope.selectedTab = tab;
            }
        }

        function calculateKpisForResource(resourceId) {

            var allVisibleEvents = scheduler.getEvents(scheduler.getState().min_date, scheduler.getState().max_date);

            $scope.resourceKpi = {
                total: 0,
                completed: 0,
                violations: 0,
                jeopardy: 0,
                avgTravelTime: 0,
                totalScheduledDuration: 0
            };

            for (var i = 0; i < allVisibleEvents.length; i++) {

                if (allVisibleEvents[i].resource != resourceId) {
                    continue;
                }

                if (allVisibleEvents[i].type === 'na') {
                    $scope.resourceKpi.avgTravelTime += allVisibleEvents[i].travelTo + allVisibleEvents[i].travelFrom;
                }

                if (allVisibleEvents[i].type !== 'service') {
                    continue;
                }

                $scope.resourceKpi.total++;

                if (allVisibleEvents[i].statusCategory == SERVICE_CATEGORY.COMPLETED) $scope.resourceKpi.completed++;

                if (allVisibleEvents[i].violations) $scope.resourceKpi.violations++;

                if (allVisibleEvents[i].jeopardy) $scope.resourceKpi.jeopardy++;

                $scope.resourceKpi.avgTravelTime += allVisibleEvents[i].travelTo + allVisibleEvents[i].travelFrom;

                // convert from millisecond to second.
                if (allVisibleEvents[i].start_date && allVisibleEvents[i].end_date) {
                    $scope.resourceKpi.totalScheduledDuration += (allVisibleEvents[i].finish - allVisibleEvents[i].start) / 1000;
                }
            }

            if (allVisibleEvents.length > 0 && $scope.resourceKpi.total > 0) $scope.resourceKpi.avgTravelTime = Math.floor($scope.resourceKpi.avgTravelTime / 60 / $scope.resourceKpi.total);else $scope.resourceKpi.avgTravelTime = 0;
        }

        function boundOnCaruselItem(marker) {
            $scope.currentlyShowingOnMap = marker.id;
            var centerLatLng = new google.maps.LatLng(marker.coords.latitude, marker.coords.longitude);
            $scope.map.setCenter(centerLatLng);
            $scope.map.setZoom(13);
        }

        function zoomOutToFitAll() {
            if (!$scope.bounds.isEmpty()) {
                $scope.map.fitBounds($scope.bounds);
            }

            $scope.currentlyShowingOnMap = null;
        }

        function slideToggle() {
            // $('#toggleResourceMapServiceCarousel .fa').toggleClass('rotatedown');
            $("#mapCarouselWrapper").slideToggle("slow", function () {});
            $scope.showSideRoute = !$scope.showSideRoute;
        }

        function formatTravel(time) {
            var travelH = Math.floor(time / 60 / 60),
                travelM = Math.floor(time / 60 % 60);

            return travelH + customLabels.kpi_h + ' ' + travelM + customLabels.kpi_m;
        }

        function formatKpitText() {
            if ($scope.isDaily) {
                return customLabels.KPIsAreCalculatedFrom.replaceAll(moment(scheduler._min_date).format('ll'), moment(scheduler._max_date).format('ll'));
            } else {
                return customLabels.KPIsAreCalculatedFromTo.replaceAll(moment(scheduler._min_date).format('ll'), moment(scheduler._max_date).format('ll'));
            }
        }

        function formatDateToTime(date) {
            return date ? moment(date).format('LT') : null;
        }

        function formatCapacityKpitText(start, end) {
            if (start === "" || end === "") return "";

            return customLabels.Between_x_and_y.replaceAll(moment(start).format('ll'), moment(end).format('ll'));
        };

        function setStuffForMap() {
            // general
            $scope.getServiceInfoRowClass = utils.getServiceInfoRowClass;
            $scope.firstMapShow = true;
            $scope.showRoute = true;
            $scope.showTrafficLayer = false;
            $scope.showServices = true;

            $scope.mapControl = {};
            $scope.mapOptions = {
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM
                },
                streetViewControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                mapTypeControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER
                },
                fullscreenControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM
                }
            };

            // info window
            $scope.serviceInfoWindow = { show: false };
            $scope.livePosInfoWindow = { show: false };
            $scope.resourceInfoWindow = { show: false };
            $scope.absenceInfoWindow = { show: false };

            $scope.infoWindowOptions = {
                service: {
                    pixelOffset: new google.maps.Size(0, -38)
                },
                livePos: {
                    pixelOffset: new google.maps.Size(0, -38)
                },
                resource: {
                    pixelOffset: new google.maps.Size(0, -38)
                },
                absence: {
                    pixelOffset: new google.maps.Size(0, -38)
                }
            };

            $scope.resourceServicesDate = scheduler.getState().min_date;
            $scope.markersArray = [];

            FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
                $scope.serviceFields = fieldsSetFieldsObject.MapInfo;
            });

            $scope.killWatch = $scope.$watch('selectedTab', function (val) {
                if (val == 'map') {
                    $timeout(function () {
                        $scope.map = $scope.mapControl.getGMap();
                        google.maps.event.trigger($scope.map, 'resize');
                        if ($scope.firstMapShow) {
                            $scope.firstMapShow = false;

                            var panorama = $scope.map.getStreetView();
                            var panoramaOptions = {
                                fullscreenControl: false,
                                addressControlOptions: {
                                    position: google.maps.ControlPosition.BOTTOM_CENTER
                                }
                            };
                            panorama.setOptions(panoramaOptions);
                            $scope.firstMapShow = false;

                            $scope.generateMarkersAndRoute();
                        }
                    }, 0);
                }
            });

            $scope.generateMarkersAndRoute = generateMarkersAndRoute;
            $scope.openDatePicker = openDatePicker;
            $scope.routeToggled = function () {
                $scope.generateMarkersAndRoute();
                var mapObj = $scope.showRoute ? $scope.map : null;

                if ($scope.polyLineGoogleObj) $scope.polyLineGoogleObj.setMap(mapObj);
                if ($scope.directionsDisplay) $scope.directionsDisplay.setMap(mapObj);
            };

            $scope.markerClicked = function (gmpasMarker, eventName, marker) {
                openInfoWindow(marker);
            };

            $scope.markerCloseClicked = function () {
                $scope.serviceInfoWindow.show = false;
                $scope.livePosInfoWindow.show = false;
                $scope.absenceInfoWindow = { show: false };
                $scope.resourceInfoWindow.show = false;
                $scope.$apply();
            };

            $scope.openFieldSetLink = function (service, field) {
                utils.openLink(service, field);
            };

            $scope.openLink = function (objId) {
                utils.openSObjectLink(objId);
            };
        }

        function openInfoWindow(marker) {
            var itemType = marker.type;

            //close all InfoWins
            $scope.serviceInfoWindow.show = false;
            $scope.absenceInfoWindow.show = false;
            $scope.livePosInfoWindow.show = false;
            $scope.resourceInfoWindow.show = false;

            $scope.currentMarker = marker;

            switch (itemType) {
                case 'service':
                    $scope.serviceInfoWindow.show = true;
                    break;

                case 'lastKnownPosition':
                    $scope.livePosInfoWindow.show = true;
                    break;
                case 'resource':
                    $scope.resourceInfoWindow.show = true;
                    break;

                case 'na':
                case 'break':
                    $scope.absenceInfoWindow.show = true;
                    break;
            }

            $timeout(function () {
                $scope.$apply();

                utils.setMapCloseButtonPosition();
            }, 0);
        }

        function generateMarkersAndRoute(dontRedrawRoute) {

            var terMember = getTerMemberObject(),
                isO2EngineOn = __gantt.isO2EngineOn,
                serviceTerritoryId = terMember.serviceTerritory,


            // defualt to O2forAllTerritories, we will change it if needed
            serviceTerritoryO2Enabled = __gantt.isO2ForAllTerritoriesOn;

            if (serviceTerritoryId && !serviceTerritoryO2Enabled) {
                serviceTerritoryO2Enabled = ResourcesAndTerritoriesService.territories()[serviceTerritoryId].o2Enabled;
            }

            $scope.resourceSLRPath = {
                stroke: {
                    weight: 2,
                    color: '#16325C'
                },
                path: [],
                geodesic: true,
                toggle: true
            };

            $scope.polyLinePath = {
                path: [],
                geodesic: $scope.resourceSLRPath.geodesic,
                strokeColor: $scope.resourceSLRPath.stroke.color,
                strokeWeight: $scope.resourceSLRPath.stroke.weight,
                strokeOpacity: 1.0
            };

            $scope.markersArray = [];
            $scope.bounds = new google.maps.LatLngBounds();

            $scope.resourceServices = filterEventsBySectionAndTime();

            // home base
            var homeBaseCords = {};

            if (terMember) {
                if (terMember.latitude) {
                    homeBaseCords = {
                        latitude: terMember.latitude,
                        longitude: terMember.longitude
                    };
                } else {
                    var resourceTer = ResourcesAndTerritoriesService.territories()[terMember.serviceTerritory];

                    if (resourceTer.latitude) {
                        homeBaseCords = {
                            latitude: resourceTer.latitude,
                            longitude: resourceTer.longitude
                        };
                    }
                }
            }

            var homeBaseObj = null;

            if (homeBaseCords.latitude) {
                $scope.markersArray.push({
                    id: terMember.serviceResource,
                    type: 'resource',
                    coords: homeBaseCords,
                    markerOptions: {
                        icon: staticResources.homebase_png
                    },
                    resourceName: $scope.lightboxResource.name
                });

                homeBaseObj = new google.maps.LatLng(homeBaseCords.latitude, homeBaseCords.longitude);
                $scope.polyLinePath.path.push(homeBaseObj);
                $scope.bounds.extend(homeBaseObj);
            } else {
                $scope.noHomeBase = true;
            }

            for (var i = 0; i < $scope.resourceServices.length; i++) {
                var ganttService = $scope.resourceServices[i];
                if (ganttService.latitude) {
                    if ($scope.showServices) {
                        var serviceIcon = ganttService.type === 'service' ? staticResources.service_png : staticResources.resource_absence_icon;

                        var marker = {
                            id: ganttService.id,
                            type: ganttService.type,
                            coords: {
                                latitude: ganttService.latitude,
                                longitude: ganttService.longitude
                            },
                            markerOptions: {
                                icon: serviceIcon,
                                labelContent: '<span>' + (i + 1) + '</span>' + moment(ganttService.start).format('LT'),
                                labelClass: 'ResourceMapServiceMarkerLabel',
                                zIndex: 200
                            },

                            item: ganttService
                        };

                        $scope.markersArray.push(marker);
                    }

                    var serviceLatLng = new google.maps.LatLng(ganttService.latitude, ganttService.longitude);
                    $scope.bounds.extend(serviceLatLng);

                    $scope.resourceSLRPath.path.push({ location: serviceLatLng, stopover: true });
                    $scope.polyLinePath.path.push(serviceLatLng);
                }
            }

            if (homeBaseCords.latitude) {
                $scope.polyLinePath.path.push(homeBaseObj);
            }

            if (!dontRedrawRoute) {
                if ($scope.showRoute) {
                    if (allowStreetLevelRouting && $scope.resourceSLRPath.path.length > 0) {
                        var resourceMap = {};
                        var resourceServicesMap = {};

                        resourceMap[terMember.serviceResource] = terMember;

                        // filter offsite appointment
                        resourceServicesMap[terMember.serviceResource] = $scope.resourceServices.filter(function (sa) {
                            return !sa.isOffsiteAppointment;
                        });

                        var googlePolylineProp = {
                            origin: homeBaseObj ? homeBaseObj : $scope.resourceSLRPath.path[0].location,
                            destination: homeBaseObj ? homeBaseObj : $scope.resourceSLRPath.path[$scope.resourceSLRPath.path.length - 1].location,
                            waypoints: $scope.resourceSLRPath.path
                        };
                        $scope.calloutFailures = 0;

                        getO2Polylines(resourceMap, resourceServicesMap, googlePolylineProp);
                    } else {
                        drawPolyLine();
                    }
                } else {
                    if ($scope.polyLineGoogleObj) $scope.polyLineGoogleObj.setMap(null);else if ($scope.directionsDisplay) $scope.directionsDisplay.setMap(null);

                    for (var _i = 0; _i < $scope.O2PolyLineArray.length; _i++) {
                        $scope.O2PolyLineArray[_i].setMap(null);
                    }
                    $scope.O2PolyLineArray = [];
                }

                // 1st Market st. SF
                var centerLatLng = new google.maps.LatLng(37.794024, -122.394837);

                if (!$scope.bounds.isEmpty()) {
                    $scope.map.fitBounds($scope.bounds);
                } else {
                    $scope.map.setCenter(centerLatLng);
                }
            }

            drawLivePositions($scope.lightboxResource.id);
        }

        function drawPolyLine() {
            if ($scope.directionsDisplay) {
                $scope.directionsDisplay.setMap(null);
                $scope.directionsDisplay = null;
            }
            if ($scope.polyLineGoogleObj) $scope.polyLineGoogleObj.setMap(null);

            $scope.polyLineGoogleObj = new google.maps.Polyline($scope.polyLinePath);
            $scope.polyLineGoogleObj.setMap($scope.map);
        }

        function getO2Polylines(resourceMap, resourceServicesMap, googlePolylineProp) {
            var isO2EngineOn = __gantt.isO2EngineOn;
            var serviceTerritoryId = getTerMemberObject().serviceTerritory;
            var serviceTerritoryO2Enabled = __gantt.isO2ForAllTerritoriesOn;

            if (serviceTerritoryId && !serviceTerritoryO2Enabled) {
                serviceTerritoryO2Enabled = ResourcesAndTerritoriesService.territories()[serviceTerritoryId].o2Enabled;
            }

            // only do O2 callout if O2 is enabled on settings + territory OR available for all territories
            if (isO2EngineOn && serviceTerritoryO2Enabled) {

                // function used for error handling
                var calloutErrorHandler = function calloutErrorHandler(errorMessage, message, transportType) {
                    if (errorMessage != null) {
                        console.log('ERROR -> ' + errorMessage);
                    }

                    $scope.calloutFailures++;
                    if ($scope.calloutFailures == 1) {
                        getO2Polylines($scope.O2Parameters.resourceMap, $scope.O2Parameters.resourceServicesMap, $scope.O2Parameters.googlePolylineProp);
                    } else {
                        var showDefault = false;
                        if (message != null && message != undefined) {
                            if (message === 'Route request with unsupported region') {
                                window.alert(customLabels.O2UnsupportedRegionMessage);
                            } else if (message === 'NoRoute') {
                                var transportTypeVar = '';
                                if (transportType != null && transportType != undefined) {
                                    transportTypeVar = transportType;
                                }
                                window.alert(customLabels.O2LocationsIsNotAccessible + ' ' + transportTypeVar);
                            } else {
                                showDefault = true;
                            }
                        }

                        if (showDefault) {
                            window.alert(customLabels.O2Failed);
                        }
                    }
                };

                // function used to build locations


                var buildLocations = function buildLocations() {
                    for (var property in resourceServicesMap) {
                        var originLat = null;
                        var originLng = null;
                        var destinationLat = null;
                        var destinationLng = null;

                        if (resourceMap[property].latitude) {
                            originLat = resourceMap[property].latitude;
                            originLng = resourceMap[property].longitude;
                            destinationLat = resourceMap[property].latitude;
                            destinationLng = resourceMap[property].longitude;
                        } else {
                            var resourceTer = ResourcesAndTerritoriesService.territories()[resourceMap[property].serviceTerritory];
                            if (resourceTer.latitude) {
                                originLat = resourceTer.latitude;
                                originLng = resourceTer.longitude;
                                destinationLat = resourceTer.latitude;
                                destinationLng = resourceTer.longitude;
                            }
                        }

                        if (originLat == null && originLng == null) {
                            originLat = resourceServicesMap[property][0].latitude;
                            originLng = resourceServicesMap[property][0].longitude;
                        }

                        if (destinationLat == null && destinationLng == null) {
                            destinationLat = resourceServicesMap[property][resourceServicesMap[property].length - 1].latitude;
                            destinationLng = resourceServicesMap[property][resourceServicesMap[property].length - 1].longitude;
                        }

                        buildLocation(originLat, originLng);
                        for (var _i4 = 0; _i4 < resourceServicesMap[property].length; _i4++) {
                            var serviceAptLatitude = resourceServicesMap[property][_i4].latitude;
                            var serviceAptLongitude = resourceServicesMap[property][_i4].longitude;
                            buildLocation(serviceAptLatitude, serviceAptLongitude);
                        }
                        buildLocation(destinationLat, destinationLng);
                    }

                    function buildLocation(lat, lng) {
                        locations.push({
                            lat: lat,
                            lng: lng
                        });
                    }
                };

                // function used to build vehicle


                var buildVehicle = function buildVehicle() {
                    // array will only ever contain 1 element
                    for (var property in resourceServicesMap) {
                        return {
                            travel_profile: 'car',
                            vehicle_id: property
                        };
                    }
                };

                $scope.O2Parameters.resourceMap = resourceMap;
                $scope.O2Parameters.resourceServicesMap = resourceServicesMap;
                $scope.O2Parameters.googlePolylineProp = googlePolylineProp;

                // reset travel profile
                $scope.drivingProfile = {
                    image: '',
                    type: '',
                    tolls: '',
                    hazmat: ''
                };

                // setup variables
                var routeList = [];
                var locations = [];
                var tempLocationsArray = [];
                var count = 0;

                // populate data
                buildLocations();
                // iterate over locations
                for (var i = 0; i < locations.length; i++) {
                    // add location to temp array
                    tempLocationsArray.push(locations[i]);

                    // if end of array or count equals 1
                    if (i === locations.length - 1 || count === 1) {
                        // if end of array and temp array only has 1 loc
                        if (i === locations.length - 1 && tempLocationsArray.length === 1) {
                            tempLocationsArray.push(locations[i]);
                        }

                        // create route using temp location array
                        routeList.push({
                            locations: [].concat(_toConsumableArray(tempLocationsArray)),
                            overview: 'full',
                            vehicle: buildVehicle()
                        });

                        // clear the temp array and reset count
                        tempLocationsArray = [];
                        count = 0;

                        // if not the end of the array
                        if (i !== locations.length - 1) {
                            // insert the most recent location into temp array
                            tempLocationsArray.push(locations[i]);
                            count++;
                        }
                    } else {
                        count++;
                    }
                }

                // build request
                var request = {
                    routes: routeList
                };

                // call apex remote action to connect to O2
                Visualforce.remoting.Manager.invokeAction(RemoteActions.getO2Polyline, JSON.stringify(request), moment($scope.resourceServicesDate).format(), function (response, event) {
                    if ($scope.showRoute) {
                        if (event.statusCode == 200 && event.type != 'exception') {
                            if (response.results != null) {
                                var results = response.results.results;

                                if (results != null) {
                                    for (var _i2 = 0; _i2 < $scope.O2PolyLineArray.length; _i2++) {
                                        $scope.O2PolyLineArray[_i2].setMap(null);
                                    }

                                    $scope.O2PolyLineArray = [];

                                    for (var resultsElement = 0; resultsElement < results.length; resultsElement++) {
                                        if (results[resultsElement].code == 'Ok') {
                                            for (var _i3 = 0; _i3 < results[resultsElement].routes.length; _i3++) {
                                                var currentRoute = results[resultsElement].routes[_i3];
                                                var path = [];

                                                var jsonData = {
                                                    "overview_polyline": {
                                                        "points": currentRoute.geometry
                                                    }
                                                };

                                                if (google.maps.geometry != undefined) {
                                                    path.push.apply(path, _toConsumableArray(google.maps.geometry.encoding.decodePath(jsonData.overview_polyline.points)));
                                                } else {
                                                    // google maps error try again
                                                    calloutErrorHandler();
                                                }

                                                for (var j = 0; j < path.length; j++) {
                                                    $scope.bounds.extend(path[j]);
                                                }

                                                // define properties of polyline
                                                var newPolyline = new google.maps.Polyline({
                                                    path: path,
                                                    strokeColor: '#0088FF',
                                                    strokeOpacity: 0.55,
                                                    strokeWeight: 6,
                                                    fillColor: '#0088FF',
                                                    map: $scope.map
                                                });

                                                $scope.O2PolyLineArray.push(newPolyline);

                                                // assign variable to map
                                                for (var _j = 0; _j < $scope.O2PolyLineArray.length; _j++) {
                                                    $scope.O2PolyLineArray[_j].setMap($scope.map);
                                                }

                                                $scope.map.fitBounds($scope.bounds);

                                                // match resources and populate travel mode fields
                                                for (var _j2 = 0; _j2 < response.travelProfiles.length; _j2++) {
                                                    var currentTravelProfile = response.travelProfiles[_j2];

                                                    var transportType = currentTravelProfile.transportType;

                                                    $scope.drivingProfile.type = transportType;

                                                    // set the type equal to label if label is defined. If label is not defiend and type = car then set to custom label
                                                    if (currentTravelProfile.transportTypeLabel != null && currentTravelProfile.transportTypeLabel != undefined) {
                                                        $scope.drivingProfile.type = currentTravelProfile.transportTypeLabel;
                                                    } else if (transportType == 'Car') {
                                                        $scope.drivingProfile.type = customLabels.Travel_Profile_Type_Car;
                                                    }

                                                    $scope.drivingProfile.image = $scope.transportTypeToStaticResource[transportType];
                                                    $scope.drivingProfile.tolls = currentTravelProfile.canUseTollRoads == true ? customLabels.Travel_Profile_Allowed_Value : customLabels.Travel_Profile_Not_Allowed_Value;
                                                    $scope.drivingProfile.hazmat = currentTravelProfile.isTransportingHazmat == true ? customLabels.Travel_Profile_Allowed_Value : customLabels.Travel_Profile_Not_Allowed_Value;
                                                }
                                            }
                                        } else {
                                            // message received from endpoint different than Ok (this should not happen)
                                            var errorMessage = null;
                                            if (results[resultsElement].code != 'Ok') {
                                                errorMessage = results[resultsElement].code;
                                            }

                                            if (results[resultsElement].code == 'NoRoute') {
                                                var _transportType = null;
                                                if (response.travelProfiles[0] != null && response.travelProfiles[0].transportType != null) {
                                                    _transportType = response.travelProfiles[0].transportTypeLabel != null && response.travelProfiles[0].transportTypeLabel != undefined ? response.travelProfiles[0].transportTypeLabel : response.travelProfiles[0].transportType;
                                                }

                                                calloutErrorHandler(errorMessage, results[resultsElement].code, _transportType);
                                            } else {
                                                calloutErrorHandler(errorMessage);
                                            }
                                        }
                                    }
                                } else {
                                    // error message received from endpoint
                                    var _errorMessage = null;
                                    if (response.results.message != undefined) {
                                        _errorMessage = response.results.message;
                                    }

                                    // check for unsupported region
                                    if (response.results.message == 'Route request with unsupported region') {
                                        calloutErrorHandler(_errorMessage, response.results.message);
                                    } else {
                                        calloutErrorHandler(_errorMessage);
                                    }
                                }
                            } else {
                                var _errorMessage2 = null;
                                if (response.results.message != undefined) {
                                    _errorMessage2 = response.results.message;
                                }
                                calloutErrorHandler(_errorMessage2);
                            }
                        } else {
                            // visualforce remoting error
                            var _errorMessage3 = null;
                            if (event.message != undefined) {
                                _errorMessage3 = event.message;
                            }
                            calloutErrorHandler(_errorMessage3);
                        }
                    }
                });
            } else {
                getGooglePolyline(googlePolylineProp);
            }
        }

        // function used to get polyline from google
        function getGooglePolyline(googlePolylineProp) {
            // get p2p status
            var p2pIsEnabled = null;
            if (__gantt != null && __gantt != undefined) {
                if (__gantt.CustomSettingsGeocode != null && __gantt.CustomSettingsGeocode != undefined) {
                    if (__gantt.CustomSettingsGeocode.p2pEnabled != null && __gantt.CustomSettingsGeocode.p2pEnabled != undefined) {
                        p2pIsEnabled = __gantt.CustomSettingsGeocode.p2pEnabled;
                    }
                }
            }

            // default to avoid tolls and show not allowed
            var avoidTollsValue = true;
            var drivingProfileTollsValue = customLabels.Travel_Profile_Not_Allowed_Value;

            // if p2p is on then tolls allows and should not be avoided
            if (p2pIsEnabled == true) {
                drivingProfileTollsValue = customLabels.Travel_Profile_Allowed_Value;
                avoidTollsValue = false;
            }

            // show default Google travel profile
            $scope.drivingProfile.type = customLabels.Travel_Profile_Type_Car;
            $scope.drivingProfile.image = staticResources.car_svg;
            $scope.drivingProfile.tolls = drivingProfileTollsValue;
            $scope.drivingProfile.hazmat = customLabels.Travel_Profile_Not_Allowed_Value;

            var directionsService = new google.maps.DirectionsService();

            directionsService.route({
                origin: googlePolylineProp.origin,
                destination: googlePolylineProp.destination,
                waypoints: googlePolylineProp.waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidTolls: avoidTollsValue
            }, function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    if ($scope.polyLineGoogleObj) {
                        $scope.polyLineGoogleObj.setMap(null);
                        $scope.polyLineGoogleObj = null;
                    }

                    if (!$scope.directionsDisplay) {
                        $scope.directionsDisplay = new google.maps.DirectionsRenderer({ suppressMarkers: true });
                    }

                    $scope.directionsDisplay.setMap($scope.map);
                    $scope.directionsDisplay.setDirections(response);
                } else {
                    window.alert('Directions request failed due to ' + status);
                    drawPolyLine();
                }
            });
        }

        function drawLivePositions(lightboxResourceId) {
            var lastPositions = LastKnownPositionService.lastKnownPositions();

            for (var resourceId in lastPositions) {
                if (lightboxResourceId === resourceId) createLivePositionMarker(lastPositions[resourceId]);
            }
        }

        function createLivePositionMarker(lastKnowLocation) {
            var resource = ResourcesAndTerritoriesService.getResources()[lastKnowLocation.id];

            var marker = {
                id: lastKnowLocation.id + '_position',
                markerOptions: {
                    icon: staticResources.livepos_png
                },
                type: 'lastKnownPosition',
                resourceId: lastKnowLocation.id,
                coords: {
                    latitude: lastKnowLocation.latitude,
                    longitude: lastKnowLocation.longitude
                },
                item: angular.extend(angular.copy(lastKnowLocation), { resourceName: resource.name })
            };

            // convert to user tz - update - commented out because this is taken care of in apex
            //marker.item.lastModifiedDate = utils.convertDateBetweenTimeZones(marker.item.lastModifiedDate, 'UTC', userTimeZone);


            // add marker if it's not live position
            if (marker && marker.type !== 'lastKnownPosition') {
                $scope.markersArray.push(marker);
            }

            // add last known position only if has permissions
            else if (!(window.customPermissions.Hide_Live_Locations_Resource_Map_Layer || isLastKnownFieldsNotAllowed)) {
                    $scope.markersArray.push(marker);
                }
        }

        function getTerMemberObject(requestType) {
            var returnElement = null;
            var start = $scope.resourceServicesDate;
            var finish = new Date(start);
            finish.setHours(24, 0, 0, 0);

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesAndTerritories();

            for (var resourceId in resourcesToTimePhasedLocations) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];
                    if (requestType == 'multi-route') {
                        if (returnElement == null) {
                            returnElement = {};
                        }

                        if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                            returnElement[resourceId] = timePhasedLoc;
                        }
                    } else {
                        if ($scope.terMemberKey.indexOf(utils.generateResourceId(timePhasedLoc.serviceResource, timePhasedLoc.serviceTerritory)) > -1 && isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                            return timePhasedLoc;
                        }
                    }
                }
            }

            return returnElement;
        }

        function filterEventsBySectionAndTime(requestType, resourceMap) {
            var start = $scope.resourceServicesDate;
            var finish = new Date(start);
            finish.setHours(24, 0, 0, 0);

            var allEvents = scheduler.getEvents(start, finish);

            if (requestType == 'multi-route' && resourceMap != null) {
                var resourceServicesMap = {};

                var _loop = function _loop(property) {
                    filteredEvents = allEvents.filter(function (event) {
                        return event.resourceId.indexOf(property) > -1 && event.latitude && (event.type === 'service' || $scope.showAbsencesOnMap && event.type === 'na');
                    }).sort(function (e1, e2) {
                        return e1.start.getTime() - e2.start.getTime();
                    });


                    resourceServicesMap[property] = filteredEvents;
                };

                for (var property in resourceMap) {
                    var filteredEvents;

                    _loop(property);
                }

                return resourceServicesMap;
            } else {
                var filteredEvents = allEvents.filter(function (event) {
                    return event.resourceId.indexOf($scope.terMemberKey) > -1 && event.latitude && (event.type === 'service' || $scope.showAbsencesOnMap && event.type === 'na');
                }).sort(function (e1, e2) {
                    return e1.start.getTime() - e2.start.getTime();
                });

                return filteredEvents;
            }
        }

        function openDatePicker() {
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: 'resourceServicesDateStart',
                    date: new Date($scope.resourceServicesDate),
                    navigation: true,
                    handler: function handler(date, calendar) {

                        $scope.$apply(function () {
                            $scope.resourceServicesDate = date;
                            $scope.generateMarkersAndRoute();

                            if ($scope.isLastKnownFieldsAllowedPermission()) {
                                sfdcService.callRemoteAction(RemoteActions.getResourceActualRoute, $scope.lightboxResource.id, date).then(handleActualRoute);
                            }
                        });

                        scheduler.destroyCalendar();
                    }
                });
            }
        }

        function changeDate(days) {
            $scope.resourceServicesDate.setDate($scope.resourceServicesDate.getDate() + days);
            $scope.generateMarkersAndRoute();

            if ($scope.isLastKnownFieldsAllowedPermission()) {
                sfdcService.callRemoteAction(RemoteActions.getResourceActualRoute, $scope.lightboxResource.id, $scope.resourceServicesDate).then(handleActualRoute);
            }
        }

        function handleActualRoute(actualRoute) {

            if ($scope.actualRoute) {
                $scope.actualRoute.visible = false;
                $scope.actualRoute.setMap($scope.map);
            }

            var actualRouteCordsObj = {},
                actualRouteCords = [];

            actualRoute.forEach(function (o) {
                if (o.Field === 'LastKnownLatitude' || o.Field === 'LastKnownLongitude') {
                    actualRouteCordsObj[o.CreatedDate] = actualRouteCordsObj[o.CreatedDate] || {};
                    actualRouteCordsObj[o.CreatedDate][o.Field.indexOf('Long') > -1 ? 'lng' : 'lat'] = o.NewValue;
                    actualRouteCordsObj[o.CreatedDate].date = o.CreatedDate;
                }
            });

            for (var k in actualRouteCordsObj) {
                if (actualRouteCordsObj[k].lng && actualRouteCordsObj[k].lat) {
                    actualRouteCords.push(actualRouteCordsObj[k]);
                }
            }

            $scope.actualRoute = new google.maps.Polyline({
                path: actualRouteCords,
                geodesic: true,
                strokeColor: '#ff73bf',
                strokeOpacity: 1,
                strokeWeight: 3
            });

            if (showActual()) {
                $scope.actualRoute.setMap($scope.map);
            }
        }

        function toggleShowRoute() {

            if (!$scope.isLastKnownFieldsAllowedPermission()) {
                return;
            }

            if ($scope.actualRoute) {
                $scope.actualRoute.visible = $scope.showActual;
                $scope.actualRoute.setMap($scope.map);
            }
        }

        function showActual() {

            if (!$scope.isLastKnownFieldsAllowedPermission()) {
                return false;
            }

            return $scope.showActual;
        }

        function getContractorCapacityStatus(resourceId) {
            var allVisibleEvents = scheduler.getEvents(scheduler.getState().min_date, scheduler.getState().max_date);
            var weekCapacities = [],
                monthCapacities = [];

            for (var i = 0; i < allVisibleEvents.length; i++) {

                if (allVisibleEvents[i].resource != resourceId) continue;

                if (allVisibleEvents[i].type != 'contractorcapacity') {
                    continue;
                }

                if (allVisibleEvents[i].timePeriod == 'Week') {
                    weekCapacities.push(allVisibleEvents[i]);
                }

                if (allVisibleEvents[i].timePeriod == 'Month') {
                    monthCapacities.push(allVisibleEvents[i]);
                }
            }

            $scope.donutCharts = initDonutCharts();
            setTimeout(function () {
                createCapacityDonutCharts(weekCapacities[0], monthCapacities[0]);
            }, 1000);
        };

        function initDonutCharts() {
            var options = {
                segmentShowStroke: false,
                segmentStrokeColor: '#fff',
                segmentStrokeWidth: 2,
                percentageInnerCutout: 75,
                animation: true,
                animationSteps: 100,
                animationEasing: 'easeOutSine',
                animateRotate: true,
                animateScale: false,
                showTooltips: true
            };

            return {
                labels: [customLabels.Hours_Used, customLabels.Hours_Available],
                weekly: {
                    data: [],
                    percentage: '',
                    start: '',
                    end: '',
                    show: false,
                    options: options
                },
                monthly: {
                    data: [],
                    percentage: '',
                    start: '',
                    end: '',
                    show: false,
                    options: options
                }
            };
        }

        function createCapacityDonutCharts(weekCapacity, monthCapacity) {

            var hoursAvailable;

            if (weekCapacity) {
                hoursAvailable = weekCapacity.hoursPerTimePeriod - weekCapacity.hoursInUse;
                if (hoursAvailable < 0) hoursAvailable = 0;
                $scope.donutCharts.weekly.data = [weekCapacity.hoursInUse, hoursAvailable];
                $scope.donutCharts.weekly.percentage = calcCapacityPercentage(weekCapacity.hoursInUse, weekCapacity.hoursPerTimePeriod) + '%';
                $scope.donutCharts.weekly.start = weekCapacity.start_date;
                $scope.donutCharts.weekly.end = weekCapacity.end_date;
                $scope.donutCharts.weekly.show = true;
            } else {
                $scope.donutCharts.weekly.data = [0, 10];
                $scope.donutCharts.weekly.show = false;
                $scope.donutCharts.weekly.options.showTooltips = false;
                $scope.donutCharts.weekly.start = $scope.kpiStart;
                $scope.donutCharts.weekly.end = $scope.kpiEnd;
            }

            if (monthCapacity) {
                hoursAvailable = monthCapacity.hoursPerTimePeriod - monthCapacity.hoursInUse;
                if (hoursAvailable < 0) hoursAvailable = 0;
                $scope.donutCharts.monthly.data = [monthCapacity.hoursInUse, hoursAvailable];
                $scope.donutCharts.monthly.percentage = calcCapacityPercentage(monthCapacity.hoursInUse, monthCapacity.hoursPerTimePeriod) + '%';
                $scope.donutCharts.monthly.start = monthCapacity.start_date;
                $scope.donutCharts.monthly.end = monthCapacity.end_date;
                $scope.donutCharts.monthly.show = true;
            } else {
                $scope.donutCharts.monthly.data = [0, 10];
                $scope.donutCharts.monthly.show = false;
                $scope.donutCharts.monthly.options.showTooltips = false;
                $scope.donutCharts.monthly.start = scheduler.getState().min_date;
                $scope.donutCharts.monthly.end = scheduler.getState().max_date;
            }
        }

        function calcCapacityPercentage(nom, denom) {
            return parseFloat((nom / denom * 100).toFixed(2));
        }

        function toggleActualVisibilityWhenMapTabClicked() {
            $timeout(function () {
                $scope.actualRoute && $scope.actualRoute.setMap($scope.map);
            }, 500);
        }

        function generateTemplate() {
            return angular.element('<div class="LightboxBlackContainer ng-cloack">\n                    <div class="LightboxContainer ng-cloak" id="ResourceLightbox">\n\n                        <div class="lightboxHeaderContainer" id="ResourceLightboxHeader">\n                            <svg fsl-key-press tabindex="0" ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                <use xlink:href="' + lsdIcons.close + '"></use>\n                            </svg>\n                            <img ng-show="lightboxResource.pictureLink" class="resourcePhotoLightbox" ng-src="{{ lightboxResource.pictureLink }}" alt="{{ lightboxResource.name }}" />\n                            <div ng-show="!lightboxResource.pictureLink" alt="{{ lightboxResource.name }}" class="ResourcePhotoIcon resourcePhotoLightbox"></div>\n\n                            <h1 class="lightboxHeader" id="resourceName" ng-bind="lightboxResource.name"></h1>\n                            <button fsl-tab-switch role="tab" ng-click="changeTab(\'details\')" ng-class="{lightboxSelectedTab: selectedTab == \'details\'}">\n                                ' + customLabels.Details + '\n                            </button>\n\n                            <button fsl-tab-switch role="tab" ng-click="changeTab(\'relatedLists\')" ng-class="{lightboxSelectedTab: selectedTab == \'relatedLists\'}">\n                                ' + customLabels.Related + '\n                            </button>\n\n                            <button ng-show="chatterAvailable" fsl-tab-switch role="tab" ng-click="changeTab(\'chatter\')" ng-class="{lightboxSelectedTab: selectedTab == \'chatter\'}">\n                                ' + customLabels.Chatter + '\n                            </button>\n\n                            <button ng-if="isMapEnabled" fsl-tab-switch role="tab" ng-click="changeTab(\'map\'); " ng-class="{lightboxSelectedTab: selectedTab == \'map\'}">\n                                ' + customLabels.Map + '\n                            </button>\n\n                            <button fsl-tab-switch role="tab" ng-click="changeTab(\'calendar\')" ng-class="{lightboxSelectedTab: selectedTab == \'calendar\'}">\n                                ' + customLabels.Calendar + '\n                            </button>\n                            \n                            <button ng-show="urls.custom1" fsl-tab-switch role="tab" ng-click="changeTab(\'customTab1\')" ng-class="{lightboxSelectedTab: selectedTab == \'customTab1\'}">\n                                ' + customLabels.CustomResourceTab1 + '\n                            </button>\n                            \n                            <button ng-show="urls.custom2" fsl-tab-switch role="tab" ng-click="changeTab(\'customTab2\')" ng-class="{lightboxSelectedTab: selectedTab == \'customTab2\'}">\n                                ' + customLabels.CustomResourceTab2 + '\n                            </button>\n\n                            <div class="ExtendedForm">\n                                <a ng-click="openConsoleTab($event,lightboxResource.id)" target="_blank" href="../{{ lightboxResource.id }}" title="' + customLabels.ExtandedForm + '">\n                                    <svg aria-hidden="true" class="slds-icon openExternalIcon">\n                                        <use xlink:href="' + lsdIcons.external + '"></use>\n                                    </svg>\n                                </a>\n                            </div>\n                        </div>\n\n                        <section ng-if="isMapEnabled" id="resourceLightboxMap" ng-show ="selectedTab == \'map\'">\n                            <ui-gmap-google-map pan="false" control="mapControl" center="{latitude: 0 ,longitude: 0}" options="mapOptions" zoom="16" class="map-canvas">\n                                <ui-gmap-markers click="markerClicked" models="markersArray" idKey="id" coords="\'coords\'" options="\'markerOptions\'"">\n                                </ui-gmap-markers>\n\n                                <ui-gmap-window show="serviceInfoWindow.show" ng-show="currentMarket.type === \'service\'" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.service" >\n                                    <div class="googleMapInfoWindowService">\n                                        <img class="mapTooltipIcon" src="' + staticResources.wo_icon_png + '"/>\n                                        <h1 class="truncate mapTooltipTitle">{{currentMarker.item | displayFieldSetField : serviceFields[0] }}</h1>\n\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[1] || serviceFields[1]">{{serviceFields[1].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[1])" ng-class="getServiceInfoRowClass(serviceFields[1])">{{currentMarker.item | displayFieldSetField : serviceFields[1]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[2] || serviceFields[2]">{{serviceFields[2].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[2])" ng-class="getServiceInfoRowClass(serviceFields[2])">{{currentMarker.item | displayFieldSetField : serviceFields[2]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[3] || serviceFields[3]">{{serviceFields[3].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[3])" ng-class="getServiceInfoRowClass(serviceFields[3])">{{currentMarker.item | displayFieldSetField : serviceFields[3]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[4] || serviceFields[4]">{{serviceFields[4].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[4])" ng-class="getServiceInfoRowClass(serviceFields[4])">{{currentMarker.item | displayFieldSetField : serviceFields[4]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[5] || serviceFields[5]">{{serviceFields[5].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[5])" ng-class="getServiceInfoRowClass(serviceFields[5])">{{currentMarker.item | displayFieldSetField : serviceFields[5]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[6] || serviceFields[6]">{{serviceFields[6].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[6])" ng-class="getServiceInfoRowClass(serviceFields[6])">{{currentMarker.item | displayFieldSetField : serviceFields[6]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[7] || serviceFields[7]">{{serviceFields[7].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[7])" ng-class="getServiceInfoRowClass(serviceFields[7])">{{currentMarker.item | displayFieldSetField : serviceFields[7]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[8] || serviceFields[8]">{{serviceFields[8].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[8])" ng-class="getServiceInfoRowClass(serviceFields[8])">{{currentMarker.item | displayFieldSetField : serviceFields[8]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[9] || serviceFields[9]">{{serviceFields[9].Label}}: <span ng-click="$parent.$parent.$parent.openFieldSetLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[9])" ng-class="getServiceInfoRowClass(serviceFields[9])">{{currentMarker.item | displayFieldSetField : serviceFields[9]}}</span></div>\n\n                                    </div>\n                                </ui-gmap-window>\n\n                                <ui-gmap-window show="resourceInfoWindow.show" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.resource">\n                                    <div class="googleMapInfoWindowHomebase">\n                                        <svg aria-hidden="true" class="slds-icon homebaseTooltipIcon">\n                                            <use xlink:href="' + lsdIcons.home + '"></use>\n                                        </svg>\n                                        <h1 class="truncate mapTooltipTitle"><span class="homebaseLabel">{{ "' + customLabels['homebase_of'] + '" | replaceLabels : currentMarker.resourceName }}</span></h1>\n                                        <div class="buttonOnMap"  ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.id)">' + customLabels['viewDetails'] + '</div>\n                                    </div>\n                                </ui-gmap-window>\n                                \n                                \n                                \n                                \n                                <ui-gmap-window show="absenceInfoWindow.show && showAbsencesOnMap" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.absence">\n                                    <div class="googleMapInfoWindowAbsence">\n                                        <svg aria-hidden="true" class="slds-icon absenceeTooltipIcon">\n                                            <use xlink:href="' + lsdIcons.absence + '"></use>\n                                        </svg>\n                                        <h1 class="truncate mapTooltipTitle"><span class="homebaseLabel">{{ $parent.$parent.currentMarker.item.name }}</span></h1>\n                                        <div>' + customLabels['Start_time'] + ': {{ $parent.$parent.currentMarker.item.start | amDateFormat:\'lll\' }}</div>\n                                        <div>' + customLabels['Finish_time'] + ': {{ $parent.$parent.currentMarker.item.end | amDateFormat:\'lll\' }}</div>\n                                        <div>' + customLabels['Reason'] + ': {{ $parent.$parent.currentMarker.item.reason }}</div>\n                                        <div class="buttonOnMap"  ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.id)">' + customLabels['viewDetails'] + '</div>\n                                    </div>\n                                </ui-gmap-window>\n                                \n                               \n                                <ui-gmap-window show="livePosInfoWindow.show" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.livePos">\n                                    <div class="googleMapInfoWindowLivePos">\n                                        <svg aria-hidden="true" class="slds-icon livePosTooltipIcon">\n                                        \t<use xlink:href="' + lsdIcons.user + '"></use>\n                                    \t</svg>\n                                        <h1 class="truncate mapTooltipTitle" ng-bind="$parent.$parent.$parent.currentMarker.item.resourceName"></h1>\n                                        <div>' + customLabels['Last_seen'] + ' {{ currentMarker.item.lastModifiedDate | amDateFormat:\'lll\' }}</div>\n                                        <div class="buttonOnMap"  ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.resourceId)">' + customLabels['viewDetails'] + '</div>\n                                    </div>\n                                </ui-gmap-window>\n\n                                <ui-gmap-layer type="TrafficLayer" show=\'showTrafficLayer\'></ui-gmap-layer>\n                                \n                            </ui-gmap-google-map>\n                            <div id="ResourceMapOptions">\n                                <div id="ResourceMapOptionsWrapper">\n                                    <input ng-model="$parent.showServices" ng-change="generateMarkersAndRoute(true)" type="checkbox" id="ResourceServicesFilter"></input>\n                                    <label for="ResourceServicesFilter">' + customLabels.Show_services_for + '</label>\n                                    <div class="resourceMapDateArrow" fsl-key-press tabindex="0" ng-click="changeDate(-1)">\n                                        <svg aria-hidden="true" class="slds-icon resourceMapChevronIcon">\n                                           <use xlink:href="' + lsdIcons.chevronleft + '"></use>\n                                       </svg>\n                                    </div>\n                                    <u id="resourceServicesDateStart" class="bulkDatePicker" fsl-key-press tabindex="0" ng-click ="openDatePicker()" >{{resourceServicesDate | amDateFormat:\'L\'}}</u>\n                                    <div class="resourceMapDateArrow" fsl-key-press tabindex="0" ng-click="changeDate(1)">\n                                        <svg aria-hidden="true" class="slds-icon resourceMapChevronIcon">\n                                           <use xlink:href="' + lsdIcons.chevronright + '"></use>\n                                       </svg>\n                                    </div>\n                                    <input ng-hide="lightboxResource.isCapacityBased && contractorSupport" ng-model="$parent.showRoute" ng-change="routeToggled()" type="checkbox" id="RouteFilter"></input>\n                                    <label class="truncate resource-map-option-label" ng-hide="lightboxResource.isCapacityBased && contractorSupport" for="RouteFilter">' + customLabels.Route + '</label>\n                                    <input ng-hide="hideActulRoute || (lightboxResource.isCapacityBased && contractorSupport)" ng-model="$parent.showActual" ng-change="toggleShowRoute()" type="checkbox" id="actualToggle"></input>\n                                    <label class="truncate resource-map-option-label" ng-hide="hideActulRoute || (lightboxResource.isCapacityBased && contractorSupport)" for="actualToggle">' + customLabels.ActualRoute + '</label>\n                                    <input ng-hide="lightboxResource.isCapacityBased && contractorSupport" ng-model="showTrafficLayer" type="checkbox" id="trafficToggle"></input>\n                                    <label class="truncate resource-map-option-label" ng-hide="lightboxResource.isCapacityBased && contractorSupport" for="trafficToggle">' + customLabels.Traffic + '</label>\n                                    <div fsl-key-press tabindex="0" class="truncate" id="toggleResourceMapServiceCarousel" ng-click="slideToggle()">\n                                        {{showSideRoute ? "' + customLabels.HideDetailedRoute + '" : "' + customLabels.ToggleDetailedRoute + '"}}\n                                    </div>\n                                </div>\n                            </div>\n                            <div id="ResourceMapCarousel" ng-show="resourceServices.length > 0">\n\n                                <div id="mapCarouselWrapper">\n                                    <div class="carouselArrow crouselLeft">\n                                        <svg aria-hidden="true" class="slds-icon arrowIcon"><use xlink:href="' + lsdIcons.chevronleft + '"></use></svg>\n                                    </div>\n                                    <div class="carouselArrow crouselRight">\n                                        <svg aria-hidden="true" class="slds-icon arrowIcon"><use xlink:href="' + lsdIcons.chevronright + '"></use></svg>                                \n                                    </div>\n                                    \n                                    \n                                    <div class="resource-map-no-route" ng-hide="haveItemsToShowOnSideRoute(markersArray)">\n                                        There are no services or absences to show\n                                    </div>\n\n                                    <div class="carouselItem" ng-if="allowStreetLevelRouting && drivingProfile.type == \'\' && showRoute == true && calloutFailures != 2">\n                                        <img style="display: block; margin-left: auto; margin-right: auto; width: 20%; padding: 10px;" src="' + lsdIcons.spinnerGif + '" />\n                                    </div>\n                                    <div class="carouselItem" ng-if=" drivingProfile.type != \'\' && showRoute == true">\n                                        <span>\n                                            <div style="background-color: #8DB9F9; display: inline-flex; width: 32px; height: 32px;">\n                                                <object style="width: 75%; height: 75%; margin: auto;" data="{{drivingProfile.image}}"></object>\n                                            </div>\n                                        </span>\n                                        <!-- <span>\n                                            <img style="max-height: 24px;" src="{{drivingProfile.image}}"/>\n                                        </span> -->\n                                        <div style="display: inline-block;margin-left: 9px">\n                                            <span class="appointment-times">' + customLabels.Travel_Profile + '</span>\n                                            <span class="appointment-number">{{drivingProfile.type}}</span>\n                                        </div>\n                                        <div class="appointment-rows">\n                                            <div>' + customLabels.Use_Tollways + ': {{drivingProfile.tolls}}</div>\n                                            <div>' + customLabels.Hazardous_Materials + ': {{drivingProfile.hazmat}}</div>\n                                        </div>\n                                    </div>\n                                    <div ng-repeat="marker in markersArray" class="carouselItem" ng-if=" marker.type === \'na\' || marker.type == \'service\'">\n                                    \n                                        <div ng-if="marker.type === \'na\'">\n                                            <span class="numberingOnMapRouteSide numberingOnMapRouteSideNA" fsl-key-press tabindex="0" title="' + customLabels.CenterOnMapp + '" ng-click="boundOnCaruselItem(marker)">{{noHomeBase && $index+1 || $index}}</span>\n                                            <span class="appointment-times">{{formatDateToTime(marker.item.start)}} - {{formatDateToTime(marker.item.finish)}}</span>\n                                            <span class="appointment-number">{{marker.item.name}}</span>\n  \n                                            <div class="appointment-rows">\n                                                <div>' + customLabels.Start_time + ': {{ marker.item.start | amDateFormat:\'lll\' }}</div>\n                                                <div>' + customLabels.Finish_time + ': {{ marker.item.end | amDateFormat:\'lll\' }}</div>\n                                                <div>' + customLabels.Reason + ': {{ marker.item.reason }}</div>\n                                            </div>\n                                        </div>\n                                    \n                                    \n                                        <div ng-if="marker.type == \'service\'">\n                                            <span class="numberingOnMapRouteSide" title="' + customLabels.CenterOnMapp + '" fsl-key-press tabindex="0" ng-click="boundOnCaruselItem(marker)" ng-style="{\'background-color\': getColorByStatus(marker.item)}">{{ noHomeBase && $index+1 || $index}}</span>\n                                            <span class="appointment-times">{{formatDateToTime(marker.item.start)}} - {{formatDateToTime(marker.item.finish)}}</span>\n                                            <span class="appointment-number">\n                                                {{marker.item.AppointmentNumber}}\n                                                <span ng-if="marker.item.isOffsiteAppointment">(' + customLabels.Offsite + ')</span>\n                                            </span>\n                                            <!-- <div class="boundOnMarker globalBlueButton" ng-click="boundOnCaruselItem(marker)" ng-hide="currentlyShowingOnMap == marker.id">\n                                                 <svg aria-hidden="true" class="slds-icon boundIcon"><use xlink:href="' + lsdIcons.checkin + '"></use></svg>                                            \n                                            </div>\n                                            <div class="boundOnMarker globalBlueButton" ng-click="zoomOutToFitAll()" ng-show="currentlyShowingOnMap == marker.id">\n                                                 <svg aria-hidden="true" class="slds-icon boundIcon"><use xlink:href="' + lsdIcons.location + '"></use></svg>                                            \n                                            </div>-->\n                                            <div class="appointment-rows">\n                                                <span ng-repeat="field in serviceFields" class="">\n                                                    <div ng-show="marker.item[field.JsAPIName]">{{field.Label}}: <span ng-click="openFieldSetLink(marker.item, field)" ng-class="getServiceInfoRowClass(field)">{{marker.item | displayFieldSetField : field}}</span></div>                                            \n                                                </span>\n                                            </div>\n                                        </div>\n                                    </div>\n                                </div>\n                            </div>\n                        </section>\n\n                        <div class="capacitiesDonuts" ng-show="selectedTab == \'details\' && lightboxResource.isCapacityBased && contractorSupport">\n                            <div id="weeklyCapacity">\n                                <div id="weeklyDonutPercentage" class="donutPercentage">\n                                    <div ng-show="donutCharts.weekly.show" ng-bind="donutCharts.weekly.percentage"></div>\n                                    <div class="noCapacity" ng-show="!donutCharts.weekly.show">' + customLabels.No_Weekly_Capacity + '</div>\n                                    <div class="capacityTimeFrameLabel truncate" ng-show="donutCharts.weekly.show" title="' + customLabels.Weekly_Capacity + '">' + customLabels.Weekly_Capacity + '</div>\n                                </div>\n                                <canvas id="weeklyDoughnutChart"\n                                        class="chart chart-doughnut"\n                                        chart-options="donutCharts.weekly.options"\n                                        chart-data="donutCharts.weekly.data"\n                                        chart-labels="donutCharts.labels">\n                                </canvas>\n                                <div class="capacityRange">{{formatCapacityKpitText(donutCharts.weekly.start, donutCharts.weekly.end)}}</div>\n                            </div>\n\n                            <div id="monthlyCapacity">\n                                <div id="monthlyDonutPercentage" class="donutPercentage">\n                                    <div ng-show="donutCharts.monthly.show" ng-bind="donutCharts.monthly.percentage"></div>\n                                    <div class="noCapacity" ng-show="!donutCharts.monthly.show">' + customLabels.No_Monthly_Capacity + '</div>\n                                    <div class="capacityTimeFrameLabel truncate" ng-show="donutCharts.monthly.show" title="' + customLabels.Monthly_Capacity + '">' + customLabels.Monthly_Capacity + '</div> \n                                </div>\n                                <canvas id="monthlyDoughnutChart"\n                                        class="chart chart-doughnut"\n                                        chart-options="donutCharts.monthly.options"\n                                        chart-data="donutCharts.monthly.data"\n                                        chart-labels="donutCharts.labels">\n                                </canvas>\n                                <div class="capacityRange">{{formatCapacityKpitText(donutCharts.monthly.start, donutCharts.monthly.end)}}</div>\n                            </div>\n                        </div>\n\n                        <div id="KPIforResource" ng-show="selectedTab == \'details\'" ng-class="{KPIforResourceWithCapacity: (lightboxResource.isCapacityBased && contractorSupport)}">\n                            <div class="kpiIndicator" ng-show="!lightboxResource.isCapacityBased || (lightboxResource.isCapacityBased && !contractorSupport)">\n                                <div class="kpiResourceValue" >\n                                    <svg aria-hidden="true" class="slds-icon kpiResourceIcon"><use xlink:href="' + lsdIcons.clock + '"></use></svg>\n                                    {{ formatTravel(resourceKpi.totalScheduledDuration) }}\n                                </div>\n\n                                ' + customLabels.Total_Scheduled + '\n                            </div>\n\n                            <div class="kpiIndicator" ng-show="isMapEnabled && (!lightboxResource.isCapacityBased || (lightboxResource.isCapacityBased && !contractorSupport))">\n                                <div class="kpiResourceValue">\n                                    <svg aria-hidden="true" class="slds-icon kpiResourceIconTravel"><use xlink:href="' + lsdIcons.car + '"></use></svg>\n                                    {{ formatTravel(resourceKpi.avgTravelTime * 60) }}\n                                </div>\n\n                                ' + customLabels.Average_Travel + '\n                            </div>\n\n                            <div class="kpiIndicator">\n                                <div class="kpiResourceValue">\n                                    <svg aria-hidden="true" class="slds-icon kpiResourceIcon"><use xlink:href="' + lsdIcons.violation + '"></use></svg>\n                                    {{ resourceKpi.violations }}\n                                </div>\n\n                                ' + customLabels.Violations + '\n                            </div>\n\n                            <div class="kpiIndicator">\n                                <div class="kpiResourceValue">\n                                    <svg aria-hidden="true" class="slds-icon kpiResourceIcon"><use xlink:href="' + lsdIcons.jeopardy + '"></use></svg>\n                                    {{ resourceKpi.jeopardy }}\n                                </div>\n                                 ' + customLabels.In_Jeopardy + '\n                            </div>\n\n                            <div class="kpiIndicator">\n                                <div class="kpiResourceValue">\n                                    <svg aria-hidden="true" class="slds-icon kpiResourceIcon"><use xlink:href="' + lsdIcons.completed + '"></use></svg>\n                                    {{ resourceKpi.completed }}/{{ resourceKpi.total }}\n                                </div>\n\n                                ' + customLabels.Completed + '\n                            </div>\n\n                            <div class="KpiRange">{{formatKpitText()}}</div>\n                        </div>\n\n                        <iframe onLoad="removeLightboxLoading()" ng-src="{{ urls.details }}" id="detailsIframeResource" ng-class="{detailsIframeResourceContractor: lightboxResource.isCapacityBased && contractorSupport}" ng-show="selectedTab == \'details\'"></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-src="{{ urls.related }}" id="relatedListIframeResource" ng-show="selectedTab == \'relatedLists\'" ></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-src="{{ urls.chatter }}" ng-if="chatterAvailable" id="chatterIframeResource" ng-show="selectedTab == \'chatter\'" ></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-src="{{ urls.calendar }}" id="calendarIframeResource" ng-show="selectedTab == \'calendar\'" ></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-if="urls.custom1" ng-show="selectedTab == \'customTab1\'" ng-src="{{ urls.custom1 }}" class="resourceLightboxIframe"></iframe>\n                        <iframe onLoad="removeLightboxLoading()" ng-if="urls.custom2" ng-show="selectedTab == \'customTab2\'" ng-src="{{ urls.custom2 }}" class="resourceLightboxIframe"></iframe>\n                        \n                        <div id="lightbox-loading-cover">\n                            <img src="' + lsdIcons.spinnerGif + '" />\n                            ' + customLabels.loading + '\n                        </div>\n\n                    </div>\n                </div>');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();