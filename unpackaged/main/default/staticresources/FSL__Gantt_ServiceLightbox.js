'use strict';

(function () {

    ServiceAppointmentLightboxService.$inject = ['$rootScope', 'TimePhasedDataService', '$sce', '$compile', 'utils', 'PARENT_RECORD_TYPE', 'StateService', '$timeout', '$interval', 'FieldSetFieldsService', 'LastKnownPositionService', 'ResourcesAndTerritoriesService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'DeltaService'];

    angular.module('serviceExpert').factory('ServiceAppointmentLightboxService', ServiceAppointmentLightboxService);

    function ServiceAppointmentLightboxService($rootScope, TimePhasedDataService, $sce, $compile, utils, PARENT_RECORD_TYPE, StateService, $timeout, $interval, FieldSetFieldsService, LastKnownPositionService, ResourcesAndTerritoriesService, SERVICE_STATUS, SERVICE_CATEGORY, DeltaService) {

        // create a new scope
        var $scope = null;

        function open(id) {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // set needed parameters
            $scope.lightboxService = TimePhasedDataService.serviceAppointments()[id];
            $scope.selectedTab = 'service';

            // add isdtp param to URL to open related list W-14217545
            // needed because of W-12276153
            var isdtpUrlAddon = '&isdtp=p1';

            // page urls
            $scope.urls = {
                service: $sce.trustAsResourceUrl(customLightboxPage + '?id=' + id).toString()
            };

            if (!$scope.lightboxService) {
                // no sa found
                return;
            }

            // set url for account if available
            if ($scope.lightboxService.accountId) {
                $scope.urls.account = $sce.trustAsResourceUrl(customAccountLightbox + '?id=' + $scope.lightboxService.accountId + isdtpUrlAddon).toString();
            }

            // set url for WO
            $scope.urls.service_chatter = $sce.trustAsResourceUrl(customServiceChatterLightbox + '?id=' + $scope.lightboxService.id).toString();

            // Parent = Workorder
            if ($scope.lightboxService.parentRecordType === PARENT_RECORD_TYPE.WORKORDER) {
                $scope.urls.wo = $sce.trustAsResourceUrl(customWoLightbox + '?id=' + $scope.lightboxService.parentRecord).toString();
                $scope.urls.wo_chatter = $sce.trustAsResourceUrl(customWoChatterLightbox + '?id=' + $scope.lightboxService.parentRecord).toString();
                $scope.urls.related = $sce.trustAsResourceUrl(customWoRelatedLightbox + '?id=' + $scope.lightboxService.parentRecord + isdtpUrlAddon).toString();

                if ($scope.lightboxService.isBundle || $scope.lightboxService.isBundleMember) {
                    $scope.urls.bundle = $sce.trustAsResourceUrl(customWoLightboxBundlerDetails + '?id=' + $scope.lightboxService.id).toString();
                }
            }

            // Parent = WOLI
            else if ($scope.lightboxService.parentRecordType === PARENT_RECORD_TYPE.LINEITEM) {
                    $scope.urls.wo = $sce.trustAsResourceUrl(customWoliLightbox + '?id=' + $scope.lightboxService.parentRecord).toString();
                    $scope.urls.wo_chatter = $sce.trustAsResourceUrl(customWoliChatterLightbox + '?id=' + $scope.lightboxService.parentRecord).toString();
                    $scope.urls.related = $sce.trustAsResourceUrl(customWoliRelatedLightbox + '?id=' + $scope.lightboxService.parentRecord + isdtpUrlAddon).toString();
                }

                // Parent = Account
                else if ($scope.lightboxService.parentRecordType === PARENT_RECORD_TYPE.ACCOUNT) {
                        $scope.urls.related = null;
                        $scope.urls.account = $sce.trustAsResourceUrl(customAccountLightbox + '?id=' + $scope.lightboxService.parentRecord + isdtpUrlAddon).toString();
                    }

                    // Parent = Something else
                    else {
                            $scope.urls.related = null;
                        }

            // custom tabs
            $scope.urls.custom1 = CustomServiceTab1 ? $sce.trustAsResourceUrl(CustomServiceTab1 + '?id=' + $scope.lightboxService.id).toString() : null;
            $scope.urls.custom2 = CustomServiceTab2 ? $sce.trustAsResourceUrl(CustomServiceTab2 + '?id=' + $scope.lightboxService.id).toString() : null;

            $scope.changeTab = changeTab;
            $scope.isChatterAvailable = isChatterAvailable;
            $scope.closeLightbox = closeLightbox;
            $scope.chatterAvailable = fieldTrackingEnabled.service;
            $scope.openConsoleTab = utils.openConsoleTab;
            $scope.isMapEnabled = StateService.isMapEnabled();
            $scope.selectedSubTabWo = 'details';
            $scope.selectedSubTabService = 'details';
            $scope.showWOTab = showWOTab;
            $scope.getIdOfObjectInActiveTab = getIdOfObjectInActiveTab;

            if ($scope.isMapEnabled) {
                setStuffForMap();
            }

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

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#ServiceLightbox').draggable({ containment: 'document', handle: '#ServiceLightboxHeader' });
            //angular.element('body').append(lightboxDomElement);

            StateService.setLightBoxStatus();

            // should we update the gantt after closing?
            window.__updateGantt = updateGantt;

            // compile
            $compile(lightboxDomElement)($scope);

            utils.safeApply($scope, function () {
                angular.element('body').append(lightboxDomElement);
            });
        }

        function updateGantt() {

            // run only if streaming is disabled
            if (!StateService.getStreamingActiveState()) {

                // check rules if not "on demand" mode
                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.getDelta(shouldCheckRules);
            }
        }

        function getIdOfObjectInActiveTab() {
            switch ($scope.selectedTab) {
                case 'account':
                    return $scope.lightboxService.accountId ? $scope.lightboxService.accountId : $scope.lightboxService.id;
                case 'wo':
                    return $scope.lightboxService.parentRecord ? $scope.lightboxService.parentRecord : $scope.lightboxService.id;
                default:
                    return $scope.lightboxService.id;
            }
        }

        function isChatterAvailable(objType) {

            if (objType === 'wo' && $scope.lightboxService.parentRecordType === 'WorkOrder' && fieldTrackingEnabled.workorder) {
                return true;
            } else if (objType === 'wo' && $scope.lightboxService.parentRecordType === 'WorkOrderLineItem' && fieldTrackingEnabled.woli) {
                return true;
            } else if (objType === 'service' && fieldTrackingEnabled.service) {
                return true;
            }

            return false;
        }

        function showWOTab(parentType) {
            return parentType === PARENT_RECORD_TYPE.LINEITEM || parentType === PARENT_RECORD_TYPE.WORKORDER;
        }

        function setStuffForMap() {
            // labels & icons
            $scope.serviceIcon = staticResources.wo_icon_png;
            $scope.resourceIcon = lsdIcons.user;
            $scope.lastSeenLabel = customLabels['Last_seen'];

            // general
            $scope.getServiceInfoRowClass = utils.getServiceInfoRowClass;
            $scope.currentMarker = {};
            $scope.map = null;
            $scope.mapControl = { zoom: 19, center: { latitude: 0, longitude: 0 } };
            $scope.allMarkersArray = [];

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

            // info window
            $scope.infoWindowOptions = {
                service: {
                    pixelOffset: new google.maps.Size(0, -38)
                },
                livePos: {
                    pixelOffset: new google.maps.Size(0, -38)
                }
            };

            $scope.serviceInfoWindow = { show: false };
            $scope.livePosInfoWindow = { show: false };

            // init

            FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
                $scope.serviceFields = fieldsSetFieldsObject.MapInfo;
            });

            if ($scope.lightboxService.latitude != null && $scope.lightboxService.longitude != null) {

                var killInterval = $interval(function () {

                    // map control not initialized yet
                    if ($scope.mapControl && !$scope.mapControl.getGMap) {
                        return;
                    }

                    $interval.cancel(killInterval);

                    $scope.map = $scope.mapControl.getGMap();
                    var serviceIcon = staticResources.service_png;

                    if ($scope.lightboxService.statusCategory == SERVICE_CATEGORY.COMPLETED) {
                        serviceIcon = staticResources.service_completed_png;
                    }

                    $scope.allMarkersArray.push({
                        id: $scope.lightboxService.id,
                        icon: serviceIcon,
                        type: 'service',
                        coords: {
                            latitude: $scope.lightboxService.latitude,
                            longitude: $scope.lightboxService.longitude
                        },
                        item: $scope.lightboxService
                    });

                    drawLivePositions();

                    var centerLatLng = new google.maps.LatLng($scope.lightboxService.latitude, $scope.lightboxService.longitude);
                    $scope.map.setCenter(centerLatLng);
                }, 500);
            }

            // general

            $scope.openLink = function (service, field) {
                utils.openLink(service, field);
            };

            // info window

            function openInfoWindow(marker) {
                var itemType = marker.type;

                //close all InfoWins
                $scope.serviceInfoWindow.show = false;
                $scope.livePosInfoWindow.show = false;

                $scope.currentMarker = marker;

                switch (itemType) {
                    case 'service':
                        $scope.serviceInfoWindow.show = true;
                        break;

                    case 'lastKnownPosition':
                        $scope.livePosInfoWindow.show = true;
                        break;
                }

                $timeout(function () {
                    $scope.$apply();

                    utils.setMapCloseButtonPosition();
                }, 0);
            }

            // markers

            $scope.markerCloseClicked = function () {
                $scope.serviceInfoWindow.show = false;
                $scope.livePosInfoWindow.show = false;
                $scope.$apply();
            };

            function drawLivePositions() {
                var lastPositions = LastKnownPositionService.lastKnownPositions();

                for (var resourceId in lastPositions) {
                    createLivePositionMarker(lastPositions[resourceId]);
                }
            }

            function createLivePositionMarker(lastKnowLocation) {
                var resource = ResourcesAndTerritoriesService.getResources()[lastKnowLocation.id];

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

                if (!(window.customPermissions.Hide_Live_Locations_Resource_Map_Layer || isLastKnownFieldsNotAllowed)) {
                    $scope.allMarkersArray.push(marker);
                }
            }

            //call when marker clicked
            $scope.markerClicked = function (gmpasMarker, eventName, marker) {
                openInfoWindow(marker);
            };

            $scope.killWatch = $scope.$watch('selectedTab', function (val) {
                if (val == 'map') {
                    $timeout(function () {
                        google.maps.event.trigger($scope.map, 'resize');
                    }, 0);
                }
            });
        }

        function closeLightbox() {
            window.__updateGantt = null;
            StateService.setLightBoxStatus(false);
            $scope.killWatch && $scope.killWatch();
            $scope.$destroy();
        }

        function changeTab(tab) {
            if (tab !== $scope.selectedTab) {
                $scope.selectedTab = tab;
            }
        }

        function generateTemplate() {
            return angular.element('<div class="LightboxBlackContainer">\n                <div class="LightboxContainer" id="ServiceLightbox">\n\n                    <div class="lightboxHeaderContainer" id="ServiceLightboxHeader">\n\n                        <svg fsl-key-press tabindex="0" ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n                                \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                            \u2028</svg>\n\n                        <h1 class="lightboxHeader">{{lightboxService.name}}</h1>\n\n                        <button fsl-tab-switch role="tab" ng-click="changeTab(\'service\')" ng-class="{lightboxSelectedTab: selectedTab == \'service\'}">\n                            ' + customLabels.Service + '\n                        </button>\n\n                        <button fsl-tab-switch role="tab" ng-show="urls.bundle" ng-click="changeTab(\'bundle\')" ng-class="{lightboxSelectedTab: selectedTab == \'bundle\'}">\n                            ' + customLabels.Bundle + '\n                        </button>\n\n                        <button fsl-tab-switch role="tab" ng-if="lightboxService.parentRecord && showWOTab(lightboxService.parentRecordType)" ng-click="changeTab(\'wo\')" ng-class="{lightboxSelectedTab: selectedTab == \'wo\'}">\n                            <div ng-show="lightboxService.parentRecordType === \'WorkOrder\'">' + customLabels.WorkOrder + '</div>\n                            <div ng-show="lightboxService.parentRecordType === \'WorkOrderLineItem\'">' + customLabels.Woli + '</div>\n                        </button>\n\n                        <button fsl-tab-switch role="tab" ng-show="urls.related" ng-click="changeTab(\'relatedList\')" ng-class="{lightboxSelectedTab: selectedTab == \'relatedList\'}">\n                            ' + customLabels.Related + '\n                        </button>\n\n                        <button fsl-tab-switch role="tab" ng-if="isMapEnabled" ng-show="lightboxService.latitude && lightboxService.longitude" ng-click="changeTab(\'map\')" ng-class="{lightboxSelectedTab: selectedTab == \'map\'}">\n                            ' + customLabels.Map + '\n                        </button>\n\n                        <button fsl-tab-switch role="tab" ng-show="urls.account" ng-click="changeTab(\'account\')" ng-class="{lightboxSelectedTab: selectedTab == \'account\'}">\n                            ' + customLabels.Account + '\n                        </button>\n                        \n                        <button fsl-tab-switch role="tab" ng-show="urls.custom1" ng-click="changeTab(\'customTab1\')" ng-class="{lightboxSelectedTab: selectedTab == \'customTab1\'}">\n                            ' + customLabels.CustomServiceTab1 + '\n                        </button>\n                        \n                        <button fsl-tab-switch role="tab" ng-show="urls.custom2" ng-click="changeTab(\'customTab2\')" ng-class="{lightboxSelectedTab: selectedTab == \'customTab2\'}">\n                            ' + customLabels.CustomServiceTab2 + '\n                        </button>\n\n                        <div class="ExtendedForm">\n                            <a ng-click="openConsoleTab($event,getIdOfObjectInActiveTab())" target="_blank" href="../{{ getIdOfObjectInActiveTab() }}" title="' + customLabels.ExtandedForm + '">\n                                <svg aria-hidden="true" class="slds-icon openExternalIcon">\n                                    \u2028<use xlink:href="' + lsdIcons.external + '"></use>\n                                \u2028</svg>\n                            </a>\n                        </div>\n\n                    </div>\n                   \n                    <div class="InnerWoTabs" ng-show="isChatterAvailable(\'service\') && selectedTab == \'service\'">\n                        <button class="InnerLightboxTab" fsl-tab-switch role="tab" ng-class="{\'selected\': selectedSubTabService == \'details\'}" ng-click="selectedSubTabService=\'details\'"}">' + customLabels.Details + '</button>\n                        <button class="InnerLightboxTab" fsl-tab-switch role="tab" ng-class="{\'selected\': selectedSubTabService == \'feed\'}" ng-click="selectedSubTabService=\'feed\'">' + customLabels.Feed + '</button>\n                        <div class="InnerLightboxHr"></div>\n                    </div>\n                    \n                    <div class="InnerWoTabs" ng-show="isChatterAvailable(\'wo\') && selectedTab == \'wo\'">\n                        <button class="InnerLightboxTab" fsl-tab-switch role="tab" ng-class="{\'selected\': selectedSubTabWo == \'details\'}" ng-click="selectedSubTabWo=\'details\'"}">' + customLabels.Details + '</button>\n                        <button class="InnerLightboxTab" fsl-tab-switch role="tab" ng-class="{\'selected\': selectedSubTabWo == \'feed\'}" ng-click="selectedSubTabWo=\'feed\'">' + customLabels.Feed + '</button>\n                        <div class="InnerLightboxHr"></div>\n                    </div>\n                    \n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'wo\' && selectedSubTabWo == \'details\'" ng-class="{\'SubTabsIframe\' : isChatterAvailable(\'wo\')}" ng-if="lightboxService.parentRecord && showWOTab(lightboxService.parentRecordType)" ng-src="{{ urls.wo }}"></iframe>\n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'wo\' && selectedSubTabWo == \'feed\'" ng-class="{\'SubTabsIframe\' : isChatterAvailable(\'wo\')}" ng-if="lightboxService.parentRecord && showWOTab(lightboxService.parentRecordType)" ng-src="{{ urls.wo_chatter }}"></iframe>\n                    \n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'service\' && selectedSubTabService == \'details\'" ng-class="{\'SubTabsIframe\' : isChatterAvailable(\'service\')}"  ng-src="{{ urls.service }}"></iframe>\n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'service\' && selectedSubTabService == \'feed\'" ng-class="{\'SubTabsIframe\' : isChatterAvailable(\'service\')}"  ng-src="{{ urls.service_chatter }}"></iframe>\n                    \n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'relatedList\' && urls.related" ng-src="{{ urls.related }}"></iframe>  \n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'account\' && urls.account" ng-src="{{ urls.account }}"></iframe>\n                    \n                    <iframe onLoad="removeLightboxLoading()" ng-show="selectedTab == \'bundle\' && urls.bundle" ng-src="{{ urls.bundle }}"></iframe>\n\n\n                    <iframe onLoad="removeLightboxLoading()" ng-if="urls.custom1" ng-show="selectedTab == \'customTab1\'" ng-src="{{ urls.custom1 }}"></iframe>\n                    <iframe onLoad="removeLightboxLoading()" ng-if="urls.custom2" ng-show="selectedTab == \'customTab2\'" ng-src="{{ urls.custom2 }}"></iframe>\n                    \n                    \n                    \n                    <div id="lightbox-loading-cover">\n                        <img src="' + lsdIcons.spinnerGif + '" />\n                        ' + customLabels.loading + '\n                    </div>\n                    \n                 \n                    <section ng-if="isMapEnabled" id="serviceLightboxMap" ng-show ="selectedTab == \'map\'">\n                        <ui-gmap-google-map pan="false" control="mapControl" center="mapControl.center" options="mapOptions" zoom="mapControl.zoom" class="map-canvas">\n                            <ui-gmap-markers click="markerClicked" models="allMarkersArray" idKey="id" coords="\'coords\'" icon="\'icon\'">\n                            </ui-gmap-markers>\n\n                            <ui-gmap-window show="serviceInfoWindow.show" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.service" >\n                                    <div class="googleMapInfoWindowService">\n                                        <img class="mapTooltipIcon" ng-src="{{serviceIcon}}"/>\n                                        <h1 class="truncate mapTooltipTitle">{{currentMarker.item | displayFieldSetField : serviceFields[0] }}</h1>\n\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[1] || serviceFields[1]">{{serviceFields[1].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[1])" ng-class="getServiceInfoRowClass(serviceFields[1])">{{currentMarker.item | displayFieldSetField : serviceFields[1]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[2] || serviceFields[2]">{{serviceFields[2].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[2])" ng-class="getServiceInfoRowClass(serviceFields[2])">{{currentMarker.item | displayFieldSetField : serviceFields[2]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[3] || serviceFields[3]">{{serviceFields[3].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[3])" ng-class="getServiceInfoRowClass(serviceFields[3])">{{currentMarker.item | displayFieldSetField : serviceFields[3]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[4] || serviceFields[4]">{{serviceFields[4].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[4])" ng-class="getServiceInfoRowClass(serviceFields[4])">{{currentMarker.item | displayFieldSetField : serviceFields[4]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[5] || serviceFields[5]">{{serviceFields[5].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[5])" ng-class="getServiceInfoRowClass(serviceFields[5])">{{currentMarker.item | displayFieldSetField : serviceFields[5]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[6] || serviceFields[6]">{{serviceFields[6].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[6])" ng-class="getServiceInfoRowClass(serviceFields[6])">{{currentMarker.item | displayFieldSetField : serviceFields[6]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[7] || serviceFields[7]">{{serviceFields[7].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[7])" ng-class="getServiceInfoRowClass(serviceFields[7])">{{currentMarker.item | displayFieldSetField : serviceFields[7]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[8] || serviceFields[8]">{{serviceFields[8].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[8])" ng-class="getServiceInfoRowClass(serviceFields[8])">{{currentMarker.item | displayFieldSetField : serviceFields[8]}}</span></div>\n                                        <div ng-show="$parent.$parent.$parent.serviceFields[9] || serviceFields[9]">{{serviceFields[9].Label}}: <span ng-click="$parent.$parent.$parent.openLink($parent.$parent.$parent.currentMarker.item, $parent.$parent.$parent.serviceFields[9])" ng-class="getServiceInfoRowClass(serviceFields[9])">{{currentMarker.item | displayFieldSetField : serviceFields[9]}}</span></div>\n\n                                    </div>\n                            </ui-gmap-window>\n\n                            <ui-gmap-window show="livePosInfoWindow.show" closeClick="markerCloseClicked()" coords="currentMarker.coords" options="infoWindowOptions.livePos">\n                                <div class="googleMapInfoWindowLivePos">\n                                    <svg aria-hidden="true" class="slds-icon livePosTooltipIcon">\n                                    \u2028\t<use xlink:href="{{resourceIcon}}"></use>\n                                \u2028\t</svg>\n                                    <h1 class="truncate mapTooltipTitle" ng-bind="$parent.$parent.$parent.currentMarker.item.resourceName"></h1>\n                                    <div>{{lastSeenLabel}} {{ currentMarker.item.lastModifiedDate | amDateFormat:\'lll\' }}</div>\n                                </div>\n                            </ui-gmap-window>\n                        </ui-gmap-google-map>\n                    </section>\n\n                </div>\n            </div>');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();