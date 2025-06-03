"use strict";

window.quickActionUtils = {
    refreshParentFrame: function refreshParentFrame(objectId, specificPage) {

        if (typeof Sfdc != "undefined" && Sfdc.canvas) {
            Sfdc.canvas.publisher.publish({ name: "publisher.close", payload: { refresh: "true" } });
        }
        if (typeof sforce != "undefined" && sforce.console && sforce.console.isInConsole()) {

            sforce.console.generateConsoleUrl(['/' + objectId], function (result) {
                sforce.console.openConsoleUrl(null, result.consoleUrl, true);
            });

            sforce.console.getEnclosingTabId(function (tab) {
                if (tab.success) {
                    sforce.console.refreshSubtabById(tab.id);
                } else {
                    sforce.console.getFocusedSubtabId(function (tab) {
                        sforce.console.refreshSubtabById(tab.id);
                    });
                }
            });
        } else if (typeof sforce != 'undefined' && sforce.one) {
            sforce.one.navigateToSObject(objectId, specificPage);
        } else {

            try {
                window.parent.location.reload(); // In case we are in scheduler (gantt view)
            } catch (ex) {
                window.parent.location = '/' + objectId;
            }
        }
    }
};
'use strict';

(function () {
    //check if angular_google_maps script existed, only if google maps is allowed
    var scriptsCollection = Array.from(document.getElementsByTagName('script'));
    var angularMapScriptExist = scriptsCollection.some(function (script) {
        return script.src.includes('angular_google_maps');
    });

    if (angularMapScriptExist) {
        angular.module('emergencyApp', ['uiGmapgoogle-maps', 'ChatterAction', 'angularMoment']).config(function (uiGmapGoogleMapApiProvider) {
            uiGmapGoogleMapApiProvider.configure({
                key: 'AIzaSyAFpyM4POFic2MmCW00oA2E66JZY5SaH2o',
                v: '3.58',
                libraries: 'geometry,visualization',
                channel: 'FSL'
            });
        });
    } else {
        angular.module('emergencyApp', ['ChatterAction', 'angularMoment']);
    }
})();
'use strict';

(function () {

    angular.module('emergencyApp').filter('displayEmergencyFieldSetField', ['$filter', function ($filter) {
        return function (object, field) {

            if (!object || !field) return;

            var res = object[field.APIName] || object[field.FullAPIName];

            if (res) {
                switch (field.Type) {
                    case "DATETIME":
                        res = $filter('amDateFormat')(res, 'l LT');
                        break;
                    case "DATE":
                        res = $filter('amDateFormat')(res, 'L');
                        break;
                    case 'REFERENCE':
                        if (res.Name) {
                            res = res.Name;
                        }
                        break;
                }
            }

            if (res == null) res = undefined;

            return res;
        };
    }]);
})();
'use strict';

(function () {

    // https://developers.google.com/maps/documentation/javascript/examples/marker-remove


    // service definition
    angular.module('emergencyApp').service('genericEmergencyHelper', genericEmergencyHelper);

    // actual service c'tor
    function genericEmergencyHelper() {

        var __sonarInterval = null,
            __sonarLoops = 0;

        var SONAR_LOOPS = 4;

        // calculate distance (aerial)
        this.calculateDistance = function (lat1, lon1, lat2, lon2) {
            var rLatitutde1 = Math.PI * lat1 / 180,
                rLatitutde2 = Math.PI * lat2 / 180,
                theta = lon1 - lon2,
                radTheta = Math.PI * theta / 180,
                distance = Math.sin(rLatitutde1) * Math.sin(rLatitutde2) + Math.cos(rLatitutde1) * Math.cos(rLatitutde2) * Math.cos(radTheta);

            distance = Math.acos(distance);
            distance = distance * 180 / Math.PI;
            distance = distance * 60 * 1.1515;

            //return unit === 'K' ?  distance * 1.609344 : distance * 0.8684;
            return distance * 1.609344;
        };

        // calculate service duration
        this.calculateDurationInMs = function (service) {

            switch (service.DurationType) {
                case 'Minutes':
                    service.durationInMs = service.Duration * 60 * 1000;
                    break;
                case 'Hours':
                    service.durationInMs = service.Duration * 60 * 60 * 1000;
                    break;
                case 'Days':
                    service.durationInMs = service.Duration * 24 * 60 * 60 * 1000;
                    break;
            }

            return service.durationInMs;
        };

        // add sonar effect
        this.sonarEffect = function (googleMap, center) {

            var marker = new google.maps.Marker({ zIndex: 0,
                map: googleMap,
                position: {
                    lat: center.latitude,
                    lng: center.longitude
                }
            });

            marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 50, fillOpacity: 1,
                fillColor: 'rgba(241, 106, 63,0.2)',
                strokeWeight: 2,
                strokeColor: 'rgba(208, 75, 33,0.9)'
            });

            __sonarLoops = SONAR_LOOPS;

            __sonarInterval = function animateCircle() {
                var opacity = 0,
                    scale = 10;

                return window.setInterval(function () {

                    scale = (scale + 1) % 150;
                    opacity = 1 - scale / 150;

                    if (scale === 149) {
                        __sonarLoops--;
                        if (__sonarLoops === 0) {
                            clearInterval(__sonarInterval);
                            marker.setMap(null);
                        }
                    }

                    marker.setIcon({ path: google.maps.SymbolPath.CIRCLE, scale: scale, fillOpacity: 1, fillColor: 'rgba(241, 106, 63,' + opacity + ')', strokeWeight: 2, strokeColor: 'rgba(208, 75, 33,' + opacity + ')' });
                }, 15);
            }();

            return __sonarInterval;
        };
    }
})();
'use strict';

(function () {

    angular.module('emergencyApp').controller('mainController', mainController);

    mainController.$inject = ['sfdcCommunication', '$q', '$filter', 'chatterActionUtils', '$scope', 'genericEmergencyHelper', 'appState', 'stageType', '$sce', '$injector'];

    function mainController(sfdcCommunication, $q, $filter, chatterActionUtils, $scope, genericEmergencyHelper, appState, stageType, $sce, $injector) {
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

        var MAX_CANDIDATES = 25,
            MARKER_SIZE = {
            width: 32,
            height: 32
        },
            MINUTES_INDEX = {
            BEST: emergency.goodGrade,
            GOOD: emergency.medicoreGrade
        };

        this.activityText = emergency.labels.FindingCandidates;
        var uiGmapIsReady = null;

        this.map = {
            zoom: 13
        };
        //boolean: org has access to goole maps
        this.shouldShowMapOrgSetting = window.shouldShowMapOrgSetting;
        //add google maps support if access to google maps enabled
        if (this.shouldShowMapOrgSetting) {
            uiGmapIsReady = $injector.get('uiGmapIsReady');
        }

        // google map controller
        this.partialResults = [];
        this.googleMap = {};
        this.controlServiceForm = {};
        this.address = '';
        this.breadcrumbs = {};
        this.candidates = {};
        this.showCandidates = false;
        this.areCandidatesAvailable = false;
        this.currentOpenedInfoBox = null;
        this.showPartialData = false;
        this.currentPath = [];
        this.showConfirmBox = false;
        this.scheduleToThisResource = null;
        this.scheduleWhen = 'asap';
        this.selectedPolicy = emergency.policy;
        this.ultimateCandidate = { resource: null };
        this.error = null;
        this.preferredResources = {};
        this.emergencyRunning = false;
        this.showServicePage = false;
        this.serviceAfterSchedule = null;
        this.aerialSortedCandidates = [];
        this.closeResources = {};
        this.showLoadingAfterDispatch = false;
        this.dispatchRunning = false;
        this.candidateMarkersOptions = {};
        this.pathStrokeOption = { color: '#0070d2', weight: 5 };
        this.trafficOn = false;
        this.trafficLayer = null;
        this.currentTime = null;
        this.slots = {};
        this.currentServices = {};
        this.getCurrentServices = function () {
            return _this.currentServices;
        };
        this.getNextServices = function () {
            return _this.nextServices;
        };
        var __sonarInterval = null;
        this.getServiceInfoRowClass = chatterActionUtils.getServiceInfoRowClass;
        this.hideMap = false;
        this.nextServices = {};
        this.allowChatterPosting = emergency.allowChatterPosting;
        this.shouldPostToChatter = this.allowChatterPosting;
        this.userHasAdminPermissions = userHasAdminPermissions;
        this.chatterCheckboxLabel = emergency.chatterDestination === 'wo' ? emergency.labels.EmergencyWizardChatterParent : emergency.labels.EmergencyWizardChatter;
        //check if service enable O2
        this.isO2ServiceEnableForServices = false;

        this.serviceMarkerOptions = {
            icon: emergency.icons.workOrder,
            animation: 2,
            labelContent: 'Service',
            labelClass: 'AN-ServiceMarkerLabel',
            zIndex: 200
        };

        /*-------------------RTL support---------------*/
        this.isRtlDirection = chatterActionUtils.isRtlDirection();

        this.isExplorer = function () {

            var ua = window.navigator.userAgent,
                msie = ua.indexOf("MSIE ");

            if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                return 'css-explorer';
            } else {
                return '';
            }
        };

        this.isCurrentServicePinned = function (resourceId) {
            return _this.currentServices[resourceId] && _this.currentServices[resourceId][emergency.objectNames.pinned];
        };
        this.isCurrentServiceEmergency = function (resourceId) {
            return _this.currentServices[resourceId] && _this.currentServices[resourceId][emergency.objectNames.emergency];
        };
        this.isCurrentServiceInJeopardy = function (resourceId) {
            return _this.currentServices[resourceId] && _this.currentServices[resourceId][emergency.objectNames.inJeopardy];
        };

        this.getPreferredResources = function () {
            return _this.preferredResources;
        };

        this.isInForm = function () {
            return appState.getStage() == stageType.Form;
        };

        this.isServiceCrew = function (candidate) {
            return candidate.Resource.Resource.ResourceType === 'C' && candidate.Resource.PictureLink == false;
        };

        this.safeHtml = function (str) {
            return $sce.trustAsHtml(str);
        };

        // View service button after dispatch
        this.viewService = function () {
            chatterActionUtils.openService(_this.serviceAfterSchedule.Id);
        };

        this.openLink = function (objectId) {
            chatterActionUtils.openService(objectId, null, true);
        };

        this.showViewService = function () {
            try {
                return !(window.parent && window.parent.parent && window.parent.parent.customServiceChatterLightbox);
            } catch (ex) {
                // nothing
            }

            return true;
        };

        // text before confirm
        this.generateConfirmText = function () {

            if (_this.scheduleToThisResource === null) return;

            return emergency.labels.ConfirmBeforeDispatch.replace('${name}', _this.service.Label).replace('${resource}', _this.scheduleToThisResource.name).replace('${eta}', _this.setBreadcrumbLabel(_this.breadcrumbs[_this.scheduleToThisResource.id], true).replace(' mins', ''));
        };

        // text to show on the success box
        this.generateResultsText = function () {
            if (_this.serviceAfterSchedule) {
                var resource = _this.serviceAfterSchedule.ResourceName,
                    name = _this.serviceAfterSchedule.Label;

                return emergency.labels.ServiceDispatchedTo.replace('{$name}', name).replace('${resource}', resource);
            }

            return null;
        };

        // set a CSS class for the marker (color defined by ETA)
        this.setResourceMarkerClass = function (resource) {

            if (!resource.duration) return 'AN-MarkerLabel';

            if (resource.duration && resource.duration.value !== undefined) {
                if (resource.startingIn <= MINUTES_INDEX.BEST) return 'AN-MarkerLabel AN-MarkerBest';

                if (resource.startingIn > MINUTES_INDEX.BEST && resource.startingIn <= MINUTES_INDEX.GOOD) return 'AN-MarkerLabel AN-MarkerGood';

                if (resource.startingIn > MINUTES_INDEX.GOOD) return 'AN-MarkerLabel AN-MarkerBad';
            }
        };

        this.setBreadcrumbLabel = function (marker, longText) {

            var labelHour = longText ? 'HoursMinsEmergency' : 'HoursMinsShortEmergency',
                labelMinutes = longText ? 'MinsEmergencyLong' : 'MinsEmergency';

            if (marker && (marker.startingIn || marker.startingIn === 0)) {
                return _this.formatMinutesHours(marker.startingIn, labelHour, labelMinutes);
            } else {
                return emergency.labels.NA;
            }

            // asap
            if (_this.scheduleWhen === 'asap' && marker && marker.duration && marker.duration.text) {
                return marker.duration.text;
            }

            // after current service
            if (marker && marker.duration && marker.duration.text) {
                var temp = marker.duration.text.split(' ');

                if (parseInt(temp[0]) + marker.afterCurrent < temp[0]) return marker.duration.text;

                temp[0] = parseInt(temp[0]) + marker.afterCurrent;
                return temp.join(' ');
            }

            return emergency.labels.NA;
        };

        // open the scheduling box - invoked from candidates list or map marker
        this.scheduleResource = function (resource) {
            _this.chatterPost = emergency.labels.WizardChatterPost.replace('$0', _this.service.Label);
            _this.showConfirmBox = true;
            _this.showCandidates = false;
            _this.scheduleToThisResource = {
                name: resource.name || resource.Resource.Name,
                id: resource.id || resource.Resource.Id
            };
        };

        // dispatch - saving to service
        this.dispatchService = function () {

            if (_this.dispatchRunning) return;

            _this.showLoadingAfterDispatch = true;
            _this.dispatchRunning = true;

            var resourceId = _this.scheduleToThisResource.id,
                calculatedDuration = _this.candidates[resourceId][emergency.objectNames.efficiency] ? Math.round(_this.service.durationInMs / _this.candidates[resourceId][emergency.objectNames.efficiency]) : _this.service.durationInMs,
                start = _this.breadcrumbs[resourceId].startingIn * 60 * 1000 + _this.currentTime,
                finish = start + calculatedDuration;

            var chatterPost = _this.shouldPostToChatter ? _this.chatterPost : '___null___';

            _this.controlServiceForm.doSecondStage({
                //ShouldPin: this.breadcrumbs[resourceId].startingIn === 0 && window.emergency.shouldPin, // FSL-2215
                ShouldPin: window.emergency.shouldPin,
                Start: start,
                Finish: finish,
                ResourceId: resourceId,
                PolicyUsed: _this.selectedPolicy,
                Chatter: chatterPost,
                TravelTo: Math.round(_this.breadcrumbs[resourceId].duration.value / 60) /* <---- FSL-1276*/ /* OLD: this.breadcrumbs[resourceId].startingIn*/
            }).then(function (result) {

                $scope.newResourceName = result.secondStageResult.Data.ResourceName;
                $scope.state = 'results';
                _this.serviceAfterSchedule = result.secondStageResult.Service;
                result.secondStageResult.Service.ResourceName = result.secondStageResult.Data.ResourceName;
                _this.showLoadingAfterDispatch = false;
                _this.dispatchRunning = false;

                if (_this.consecutiveWorkService) {

                    _this.consecutiveWorkService.start = finish + _this.consecutiveWorkService.travel * 1000;
                    _this.consecutiveWorkService.resourceId = resourceId;
                    _this.consecutiveWorkService.policyId = _this.selectedPolicy;

                    sfdcCommunication.saveConsecutiveService(_this.consecutiveWorkService).then(function (result) {
                        console.log('mst service was scheduled');
                    }).catch(function (ex) {
                        console.log(ex);
                    });
                }
            }).catch(function (ex) {
                console.log(ex);
                _this.showLoadingAfterDispatch = false;
                _this.dispatchRunning = false;
            });
        };

        // center map on a candidate (if no candidate is given, focus on service)
        this.centerMap = function (candidate) {

            _this.showCandidates = false;

            // if no candidate then center on service
            if (candidate) {
                _this.map.center.latitude = _this.breadcrumbs[candidate.Resource.Id].coords.latitude;
                _this.map.center.longitude = _this.breadcrumbs[candidate.Resource.Id].coords.longitude;
                _this.setCurrentOpenedInfoBox(candidate.Resource.Id);
                _this.getRoute(candidate.Resource.Id, _this.map.center);
            } else {
                _this.map.center.latitude = _this.service.coords.latitude;
                _this.map.center.longitude = _this.service.coords.longitude;
            }
        };

        this.calculateArrivalTime = function (time) {
            var eta = Math.round((time - emergency.now) / 1000 / 60);

            if (eta <= 1) return emergency.labels.Momentary;

            return eta + ' ' + emergency.labels.Minutes;
        };

        this.getRoute = function (resourceId, coordsOrigin) {

            // dest is always the service
            var coordsDest = {
                latitude: _this.service.coords.latitude,
                longitude: _this.service.coords.longitude
            };

            sfdcCommunication.getRouteFromGoogle(resourceId, coordsOrigin, coordsDest).then(function (path) {
                _this.currentPath = path;
            }).catch(function (ex) {
                console.log(ex);
            });
        };

        this.getCurrentPath = function () {
            return _this.currentPath || [];
        };

        // get policies
        sfdcCommunication.getPolicies().then(function (policies) {
            _this.policies = policies;
        }).catch(function (ex) {
            console.log(ex);
        });

        // used when changing policy
        this.runEmergencyAgain = function () {

            _this.partialResults = [];

            _this.controlServiceForm.doFirstStage({ policy: _this.selectedPolicy }).then(function (result) {
                _this.onFirstStageCompleted(result);
            });
        };

        // This will run the entire emergency process... getting candidates and calculating ETAs
        this.runEmergency = function () {

            _this.activityText = emergency.labels.FindingCandidates;
            var __distanceMatrixPromise = $q.defer(),
                __slotsPromise = $q.defer();
            _this.currentPath.length = 0;
            _this.error = '';
            _this.breadcrumbs = {};
            _this.emergencyRunning = true;
            _this.closeResources = {};
            // this.partialResults = [];

            // calculate duration, store in in this.service.durationInMs
            genericEmergencyHelper.calculateDurationInMs(_this.service);

            // get candidates - should be done earlier and saved on this.slots

            _this.candidates = _this.slots.ResourceIDToScheduleData;

            // no slots were found
            if (Object.keys(_this.candidates).length === 0) {
                __slotsPromise.reject();
                _this.currentTime = null;
                _this.error = emergency.labels.NoSlotsChooseAnother;
            } else {
                __slotsPromise.resolve();
                _this.currentTime = _this.slots.CurrentTime;
            }

            // get breadcrumbs, only after candidates returned
            __slotsPromise.promise.then(function () {

                _this.activityText = emergency.labels.FinidingLocations;

                sfdcCommunication.getBreadcrumbs(Object.keys(_this.candidates)).then(function (lastKnowPositions) {

                    _this.processNextServices(lastKnowPositions.nextServices, lastKnowPositions.now[0]);

                    _this.processCurrentServices(lastKnowPositions.currentServices);

                    // make sure we have homebases, copy from territory
                    lastKnowPositions.homebases.forEach(function (homebase) {

                        if (homebase.Latitude === undefined && homebase.ServiceTerritory && homebase.ServiceTerritory.Latitude) {
                            homebase.Latitude = homebase.ServiceTerritory.Latitude;
                            homebase.Longitude = homebase.ServiceTerritory.Longitude;
                        }
                    });

                    _this.resourcesFieldSet = lastKnowPositions.resourceFieldset;

                    lastKnowPositions.resources.forEach(function (resource) {
                        if (_this.candidates[resource.Id]) {
                            for (var key in resource) {
                                _this.candidates[resource.Id][key] = resource[key];
                            }
                        }
                    });

                    if (lastKnowPositions.breadcrumbs.length === 0 && lastKnowPositions.homebases.length === 0 && lastKnowPositions.services.length === 0) {
                        _this.error = emergency.labels.EWNoUpdatedBreadCrumbs;
                        _this.activityText = '';
                        _this.emergencyRunning = false;
                        return;
                    }

                    generateResourceMarkers.call(_this, lastKnowPositions);

                    // calculate aerial distance
                    _this.aerialSortedCandidates = [];

                    for (var resourceId in _this.breadcrumbs) {

                        _this.aerialSortedCandidates.push({
                            // aerial distance from breadcrumb to service
                            distance: genericEmergencyHelper.calculateDistance(_this.breadcrumbs[resourceId].coords.latitude, _this.breadcrumbs[resourceId].coords.longitude, _this.service.coords.latitude, _this.service.coords.longitude),

                            // resource id
                            resourceKey: resourceId,

                            // lat long, the Google style
                            lat: _this.breadcrumbs[resourceId].coords.latitude,
                            lng: _this.breadcrumbs[resourceId].coords.longitude
                        });

                        //this.breadcrumbs[resourceId].indexInAerialArray = this.aerialSortedCandidates.length - 1;
                    }

                    // sort by distance
                    _this.aerialSortedCandidates.sort(function (a, b) {
                        if (a.distance > b.distance) return 1;else if (a.distance < b.distance) return -1;else return 0;
                    });

                    // limit number of coords we send (we will send only the closest ones)
                    _this.aerialSortedCandidates.length = MAX_CANDIDATES > _this.aerialSortedCandidates.length ? _this.aerialSortedCandidates.length : MAX_CANDIDATES;

                    // remove breadcrumbs and candidates we don't need
                    for (var i = 0; i < _this.aerialSortedCandidates.length; i++) {
                        _this.closeResources[_this.aerialSortedCandidates[i].resourceKey] = true;
                    }
                    for (var crumbKey in _this.breadcrumbs) {
                        if (!_this.closeResources[crumbKey]) {
                            delete _this.breadcrumbs[crumbKey];
                        }
                    }

                    for (var _crumbKey in _this.candidates) {
                        if (!_this.closeResources[_crumbKey]) {
                            delete _this.candidates[_crumbKey];
                        }
                    }

                    // no slots were found after Google distance checking
                    if (Object.keys(_this.candidates).length === 0) {
                        __distanceMatrixPromise.reject();
                        _this.currentTime = null;
                        _this.error = emergency.labels.NoSlotsChooseAnother;
                        _this.emergencyRunning = false;
                        _this.activityText = '';
                    }

                    // get distance matrix from Google
                    __distanceMatrixPromise.resolve();

                    // it's safe here to turn down the service animation
                    _this.serviceMarkerOptions.animation = 0;
                }).catch(function (ex) {
                    console.log(ex);
                    __distanceMatrixPromise.reject();
                    _this.emergencyRunning = false;
                    _this.activityText = '';
                    _this.error = ex.message;
                });
            }).catch(function (ex) {
                console.log(ex);
                __distanceMatrixPromise.reject();
                _this.emergencyRunning = false;
                _this.activityText = '';
            });

            // get distance matrix from google when last known locations are available
            __distanceMatrixPromise.promise.then(function () {

                _this.activityText = emergency.labels.CalculatingETA;
                _this.setCurrentOpenedInfoBox(); // close info box
                _this.ultimateCandidate.resource = null;

                var coordsDest = {
                    latitude: _this.service.coords.latitude,
                    longitude: _this.service.coords.longitude
                };
                //if access to google maps is enabled, get distance from Google matrix
                if (_this.shouldShowMapOrgSetting) {
                    // get distances (SLR) from Google
                    sfdcCommunication.getDistanceMatrixFromGoogle(_this.aerialSortedCandidates, coordsDest).then(function (matrix) {

                        _this.emergencyStart();

                        for (var i = 0; i < matrix.rows.length; i++) {
                            if (matrix.rows[i].elements[0].status === "OK") {

                                var id = _this.aerialSortedCandidates[i].resourceKey;
                                // update breadcrumb duration data
                                _this.breadcrumbs[id].distance = matrix.rows[i].elements[0].distance;
                                _this.breadcrumbs[id].duration = matrix.rows[i].elements[0].duration_in_traffic != undefined ? matrix.rows[i].elements[0].duration_in_traffic : matrix.rows[i].elements[0].duration;

                                // update candidates marker
                                _this.candidateMarkersOptions[id].labelClass = _this.setResourceMarkerClass(_this.breadcrumbs[id]);
                                _this.candidateMarkersOptions[id].labelContent = _this.setBreadcrumbLabel(_this.breadcrumbs[id]);
                            }
                        }

                        // this will tell us if the resource has a valid slot (will update the isValidSlot property on the breadcrumbs object
                        _this.filterSlots(_this.candidates, _this.scheduleWhen);

                        if (!doWeHaveValidSlots(_this.breadcrumbs)) {
                            _this.error = emergency.labels.NoSlotsChooseAnother;
                            return;
                        }

                        // after calculating in Google, show info window and route for best candidate
                        $filter('eta')([_this.candidates], _this.breadcrumbs, _this.scheduleWhen, _this.ultimateCandidate);
                        _this.setCurrentOpenedInfoBox(_this.ultimateCandidate.resource);
                        _this.getRoute(_this.breadcrumbs[_this.ultimateCandidate.resource].id, _this.breadcrumbs[_this.ultimateCandidate.resource].coords);

                        // set breadcrumb labels
                        for (var _i = 0; _i < matrix.rows.length; _i++) {

                            var _id = _this.aerialSortedCandidates[_i].resourceKey;

                            if (matrix.rows[_i].elements[0].status === "OK") {
                                _this.candidateMarkersOptions[_id].labelClass = _this.setResourceMarkerClass(_this.breadcrumbs[_id]);
                                _this.candidateMarkersOptions[_id].labelContent = _this.setBreadcrumbLabel(_this.breadcrumbs[_id]);
                            }
                        }

                        // set map to show all candidates
                        _this.setZoomToShowAll();
                    }).catch(function (ex) {
                        console.log(ex);
                        _this.emergencyRunning = false;
                        _this.activityText = '';
                    });
                }
                //use O2NavigationRequest if google maps is not allowed and O2 is enabled
                else {
                        if (!_this.isO2ServiceEnableForServices) {
                            _this.error = emergency.labels.EnableO2Service;
                            return;
                        }

                        var routeList = [];
                        //set route list for resource and sa
                        _this.aerialSortedCandidates.forEach(function (candidate) {
                            var locations = [];
                            var coordsResource = { lat: candidate.lat, lng: candidate.lng };
                            var coordsService = { lat: _this.service.coords.latitude, lng: _this.service.coords.longitude };
                            locations.push(coordsResource, coordsService);
                            routeList.push({
                                locations: locations,
                                overview: 'full',
                                vehicle: { travel_profile: "car", vehicle_id: candidate.resourceKey }
                            });
                        });

                        var request = {
                            routes: routeList
                        };
                        //make O2 request to NavigationO2Service
                        sfdcCommunication.geO2Polygon(request, new Date()).then(function (routesList) {
                            _this.emergencyStart();
                            var response = routesList.results.results;

                            for (var i = 0; i < response.length; i++) {
                                if (response[i].code === "Ok") {

                                    var id = _this.aerialSortedCandidates[i].resourceKey;
                                    var routes = response[i].routes[0];

                                    // update breadcrumb duration data
                                    _this.breadcrumbs[id].distance = { text: '' + _this.convertDistanceO2toDistanceUnit(routes.distance, emergency.distanceUnit), value: routes.distance };
                                    _this.breadcrumbs[id].duration = { text: Math.round(routes.duration / 60) + ' min', value: routes.duration };

                                    // update candidates marker
                                    _this.candidateMarkersOptions[id].labelClass = _this.setResourceMarkerClass(_this.breadcrumbs[id]);
                                    _this.candidateMarkersOptions[id].labelContent = _this.setBreadcrumbLabel(_this.breadcrumbs[id]);
                                }
                            }
                            _this.filterSlots(_this.candidates, _this.scheduleWhen);

                            if (!doWeHaveValidSlots(_this.breadcrumbs)) {
                                _this.error = emergency.labels.NoSlotsChooseAnother;
                                return;
                            }

                            $filter('eta')([_this.candidates], _this.breadcrumbs, _this.scheduleWhen, _this.ultimateCandidate);
                        }).catch(function (ex) {
                            console.log(ex);
                            _this.emergencyRunning = false;
                            _this.activityText = '';
                        });
                    }
            });
        };

        this.onFirstStageCompleted = function (result) {
            var _this2 = this;

            this.selectedPolicy = result.firstStageResult.Data.policy;

            this.service = result.firstStageResult.Service;
            this.service.id = this.service.Id;
            this.service.name = this.service.label;
            this.preferredResources = result.firstStageResult.Data.Preferred;
            this.preferredTypes = Object.keys(this.preferredResources);

            this.service.coords = {
                latitude: result.firstStageResult.Data.Coords.Latitude,
                longitude: result.firstStageResult.Data.Coords.Longitude
            };

            if (!this.service.coords.latitude) {
                this.error = emergency.labels.emergency_no_latlong;
                this.activityText = '';
                return;
            }

            this.map.center = {
                latitude: this.service.coords.latitude,
                longitude: this.service.coords.longitude
            };

            this.slots = result.firstStageResult.Data.Slots;
            this.partialResults = this.slots.PartialResults || [];
            this.photos = result.firstStageResult.Data.Photos;

            this.setConsecutiveWorkDetails(this.slots);

            // hide map?
            this.hideMap = result.firstStageResult.Data.HideMap;
            //check if O2 is enable for service
            this.isO2ServiceEnableForServices = result.firstStageResult.Data.isO2ServiceEnableForServices;

            for (var resourceId in this.photos) {
                var user = this.photos[resourceId].RelatedRecord,
                    photo = null;

                if (user) {
                    photo = user.SmallPhotoUrl;
                }

                if (!photo || photo.endsWith('profilephoto/005/T')) photo = emergency.defaultPhoto;

                if (this.photos[resourceId][emergency.objectNames.PictureLink]) {
                    photo = this.photos[resourceId][emergency.objectNames.PictureLink];
                    this.slots.ResourceIDToScheduleData[resourceId].Resource['PictureLink'] = true;
                } else {
                    this.slots.ResourceIDToScheduleData[resourceId].Resource['PictureLink'] = false;
                }

                this.photos[resourceId] = photo;
            }
            //use  uiGmapIsReady only if org has access to google maps
            if (this.shouldShowMapOrgSetting) {
                uiGmapIsReady.promise().then(function (mapInstance) {

                    // clear sonar
                    clearInterval(__sonarInterval);

                    // set sonar
                    __sonarInterval = genericEmergencyHelper.sonarEffect(_this2.googleMap.getGMap(), _this2.map.center);

                    // create traffic object (off by default
                    _this2.trafficLayer = new google.maps.TrafficLayer();
                });
            }

            this.runEmergency();
        };

        this.setConsecutiveWorkDetails = function (slots) {

            _this.consecutiveWorkService = null;

            for (var id in slots.ResourceIDToScheduleData) {

                var schedulingOptions = slots.ResourceIDToScheduleData[id].SchedulingOptions;

                if (schedulingOptions[0] && schedulingOptions[0].MSTOptions) {

                    for (var serviceId in schedulingOptions[0].MSTOptions) {

                        _this.consecutiveWorkService = {
                            travel: slots.SAWrapper.m_travelResultlst[0].Travel,
                            serviceId: serviceId
                        };

                        return;
                    }
                }
            }
        };

        function generateResourceMarkers(lastKnowPosition) {

            this.breadcrumbs = {};

            // parse breadcrumbs array
            for (var i = 0; i < lastKnowPosition.breadcrumbs.length; i++) {

                var data = lastKnowPosition.breadcrumbs[i];
                //only if user has access to those fields
                if (data.LastKnownLatitude && data.LastKnownLongitude && data.LastKnownLocationDate) {
                    this.breadcrumbs[data.Id] = {
                        origin: 'breadcrumb', // data source (breadcrumb, homebase, service)
                        id: data.Id, // resource id
                        name: data.Name, // resource name
                        photo: this.photos[data.Id], // photo
                        updatedOn: data.LastKnownLocationDate, // update time of breadcrumb
                        afterCurrent: 0, // offset if we are on the "after service" mode
                        isValidSlot: false, // he's a candidate but need to check if it meets the emergency settings, defaults to NOT candidate
                        coords: { // geolocation
                            latitude: data.LastKnownLatitude,
                            longitude: data.LastKnownLongitude
                        }
                    };
                }
            }

            // parse homebases array
            for (var _i2 = 0; _i2 < lastKnowPosition.homebases.length; _i2++) {

                var _data = lastKnowPosition.homebases[_i2];

                // no geolocation on homebases or we already have data on this resource
                if (this.breadcrumbs[_data.ServiceResource.Id] || !_data.Latitude) {
                    continue;
                }

                this.breadcrumbs[_data.ServiceResource.Id] = {
                    origin: 'homebase', // data source (breadcrumb, homebase, service)
                    id: _data.ServiceResource.Id, // resource id
                    name: _data.ServiceResource.Name, // resource name
                    photo: this.photos[_data.ServiceResource.Id], // photo
                    updatedOn: null, // homebase, we don't care about update time
                    afterCurrent: 0, // offset if we are on the "after service" mode
                    isValidSlot: false, // he's a candidate but need to check if it meets the emergency settings, defaults to NOT candidate
                    coords: { // geolocation
                        latitude: _data.Latitude,
                        longitude: _data.Longitude
                    }
                };
            }

            //sort services according to SchedEndTime (ascending) so when we
            // loop over them the last SA will override the prior SA breadcrumbs
            lastKnowPosition.services.sort(function (a, b) {
                return a.SchedEndTime - b.SchedEndTime;
            });

            // parse services array
            for (var _i3 = 0; _i3 < lastKnowPosition.services.length; _i3++) {

                var _data2 = lastKnowPosition.services[_i3],
                    afterCurrent = 0;

                // calculate the afterCurrent
                if (_data2.SchedStartTime <= emergency.now && _data2.SchedEndTime >= emergency.now) {
                    afterCurrent = Math.round((_data2.SchedEndTime - emergency.now) / 1000 / 60);
                }

                // source is breadcrumb, just update afterCurrent and continue
                if (this.breadcrumbs[_data2.ServiceResources[0].ServiceResource.Id] && this.breadcrumbs[_data2.ServiceResources[0].ServiceResource.Id].origin === 'breadcrumb') {
                    this.breadcrumbs[_data2.ServiceResources[0].ServiceResource.Id].afterCurrent = afterCurrent;
                    continue;
                }

                // no geolocation on service
                if (!_data2.Latitude) {
                    continue;
                }

                this.breadcrumbs[_data2.ServiceResources[0].ServiceResource.Id] = {
                    origin: 'service', // data source (breadcrumb, homebase, service)
                    id: _data2.ServiceResources[0].ServiceResource.Id, // resource id
                    name: _data2.ServiceResources[0].ServiceResource.Name, // resource name
                    photo: this.photos[_data2.ServiceResources[0].ServiceResource.Id], // photo
                    updatedOn: _data2.SchedStartTime, // service start is considered as the time the technician checked in
                    afterCurrent: afterCurrent, // offset if we are on the "after service" mode
                    isValidSlot: false, // he's a candidate but need to check if it meets the emergency settings, defaults to NOT candidate
                    coords: { // geolocation
                        latitude: _data2.Latitude,
                        longitude: _data2.Longitude
                    }
                };
            }

            // this object is the marker options for the map
            for (var resourceId in this.breadcrumbs) {
                this.candidateMarkersOptions[resourceId] = {
                    animation: 2,
                    labelContent: this.setBreadcrumbLabel(this.breadcrumbs[resourceId]),
                    labelClass: this.setResourceMarkerClass(this.breadcrumbs[resourceId]),
                    icon: this.breadcrumbs[resourceId].photo === emergency.defaultPhoto ? emergency.defaultCandidateMarker : { url: this.breadcrumbs[resourceId].photo, scaledSize: MARKER_SIZE }
                };
            }
        }

        this.scheduleWhenUpdated = function () {
            _this.currentPath = [];
            _this.setCurrentOpenedInfoBox();

            // after calculating in Google, show info window and route for best candidate
            _this.filterSlots(_this.candidates, _this.scheduleWhen);
            $filter('eta')([_this.candidates], _this.breadcrumbs, _this.scheduleWhen, _this.ultimateCandidate);
            _this.currentOpenedInfoBox = _this.ultimateCandidate.resource;

            if (_this.ultimateCandidate.resource) {
                _this.getRoute(_this.breadcrumbs[_this.ultimateCandidate.resource].id, _this.breadcrumbs[_this.ultimateCandidate.resource].coords);
            }

            for (var mOption in _this.candidateMarkersOptions) {
                if (_this.breadcrumbs[mOption]) {
                    _this.candidateMarkersOptions[mOption].labelContent = _this.setBreadcrumbLabel(_this.breadcrumbs[mOption]);
                    _this.candidateMarkersOptions[mOption].labelClass = _this.setResourceMarkerClass(_this.breadcrumbs[mOption]);
                }
            }
        };

        // zoom out in map to show all candidates and service (only valid candidates)
        this.setZoomToShowAll = function () {

            var new_boundary = new google.maps.LatLngBounds();

            for (var index in _this.breadcrumbs) {
                if (_this.breadcrumbs[index].isValidSlot) {
                    var position = new google.maps.LatLng(_this.breadcrumbs[index].coords.latitude, _this.breadcrumbs[index].coords.longitude);
                    new_boundary.extend(position);
                }
            }

            // add service
            new_boundary.extend(new google.maps.LatLng(_this.service.coords.latitude, _this.service.coords.longitude));

            setTimeout(function () {
                _this.googleMap.refresh();
            }, 0);

            setTimeout(function () {
                _this.googleMap.getGMap().fitBounds(new_boundary);
            }, 100);
        };

        this.isCriticalError = function () {
            // if (!this.service.coords.latitude || !this.service.coords.longitude || !emergency.canRunEmergnecy)
            return _this.service && _this.service.coords && (!_this.service.coords.latitude || !_this.service.coords.longitude);
        };

        this.toggleTraffic = function () {

            if (!_this.trafficOn) {
                _this.trafficLayer.setMap(_this.googleMap.getGMap());
            } else {
                _this.trafficLayer.setMap();
            }

            _this.trafficOn = !_this.trafficOn;
        };

        this.setCurrentOpenedInfoBox = function (id) {
            if (id) {
                _this.currentOpenedInfoBox = id;
            } else {
                _this.currentOpenedInfoBox = null;
            }
        };

        this.getCurrentOpenedInfoBox = function () {
            return _this.currentOpenedInfoBox;
        };

        // do we have valid slots? checks after getting distances from Google
        function doWeHaveValidSlots(breadcrumbs) {

            for (var key in breadcrumbs) {
                if (breadcrumbs[key].isValidSlot) {
                    return true;
                }
            }

            return false;
        }

        this.formatMinutesHours = function (totalMinutes, text, text2) {

            var minutes = totalMinutes % 60;
            var hours = Math.floor(totalMinutes / 60);

            if (hours > 0) {
                return emergency.labels[text].replace('$0', hours).replace('$1', minutes);
            } else {
                return emergency.labels[text2].replace('$0', minutes);
            }
        };

        //convert O2 distance to user settings distance unit
        this.convertDistanceO2toDistanceUnit = function (distance, unit) {
            var finalDistance = void 0;
            if (unit === 'mile') {
                var distanceInMiles = distance * 0.0006214;
                finalDistance = distanceInMiles < 0.1 ? distance * 3.28084 : distanceInMiles;
                return finalDistance.toFixed(1) + ' ' + (distanceInMiles < 0.1 ? emergency.labels.FtDistanceUnitShort : emergency.labels.MilesDistanceUnitShort);
            } else {
                var distanceInKm = distance / 1000;
                finalDistance = distanceInKm < 0.1 ? distance : distanceInKm;
                return finalDistance.toFixed(1) + ' ' + (distanceInKm < 0.1 ? emergency.labels.MeterDistanceUnitShort : emergency.labels.KmDistanceUnitShort);
            }
        };

        this.emergencyStart = function () {
            _this.emergencyRunning = false;
            _this.activityText = null;
            _this.areCandidatesAvailable = true;
        };

        // will update the slots object with isValidSlot to identify if the service can really be inserted with the travel time
        this.filterSlots = function (slots) {
            var when = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'asap';


            // millseconds to add, in ASAP=0, if after service need to check afterCurrent on this.breadcrumb
            var durationFactor = 0;

            for (var resourceKey in slots) {

                // defaults to false
                _this.breadcrumbs[resourceKey].isValidSlot = false;

                // no slots
                if (slots[resourceKey].SchedulingOptions && slots[resourceKey].SchedulingOptions.length === 0) {
                    continue;
                }

                for (var i = 0; i < slots[resourceKey].SchedulingOptions.length; i++) {

                    // we have duration
                    if (_this.breadcrumbs[resourceKey].duration) {

                        if (when !== 'asap') {
                            durationFactor = _this.breadcrumbs[resourceKey].afterCurrent * 60 * 1000;
                        }

                        var serviceDurationWithEfficenty = _this.candidates[resourceKey][emergency.objectNames.efficiency] ? Math.round(_this.service.durationInMs / _this.candidates[resourceKey][emergency.objectNames.efficiency]) : _this.service.durationInMs;

                        if (slots[resourceKey].SchedulingOptions[i].Interval.Start + serviceDurationWithEfficenty + durationFactor + _this.breadcrumbs[resourceKey].duration.value * 1000 <= slots[resourceKey].SchedulingOptions[i].Interval.Finish) {
                            _this.breadcrumbs[resourceKey].isValidSlot = true;
                            _this.breadcrumbs[resourceKey].startingIn = slots[resourceKey].SchedulingOptions[i].Interval.Start + durationFactor + _this.breadcrumbs[resourceKey].duration.value * 1000 - _this.currentTime;
                            _this.breadcrumbs[resourceKey].startingIn = Math.round(_this.breadcrumbs[resourceKey].startingIn / 1000 / 60); // minutes
                            i = 9999999;
                        }
                    }
                }
            }
        };

        this.processCurrentServices = function (services) {

            _this.currentServices = services.reduce(function (servicesObj, srv) {

                servicesObj[srv.ServiceResources[0].ServiceResourceId] = srv;

                return servicesObj;
            }, {});
        };

        this.openCurrentService = function (serviceObj) {

            _this.showServicePage = serviceObj;
            _this.servicePageUrl = $sce.trustAsResourceUrl('EmergencyLightbox?id=' + serviceObj.Id).toString();
        };

        this.processNextServices = function (nextServices, now) {

            _this.nextServices = {};

            nextServices.forEach(function (service) {

                var resourceId = service.ServiceResources[0].ServiceResourceId;

                _this.nextServices[resourceId] = _this.nextServices[resourceId] || [];
                _this.nextServices[resourceId].push(service);
            });

            for (var id in _this.nextServices) {
                _this.nextServices[id].sort(function (a, b) {

                    if (a.SchedStartTime > b.SchedStartTime) return 1;
                    if (a.SchedStartTime < b.SchedStartTime) return -1;
                    return 0;
                });
            }

            for (var _id2 in _this.nextServices) {
                _this.nextServices[_id2] = _this.nextServices[_id2][0];
                _this.nextServices[_id2].startingIn = Math.round((_this.nextServices[_id2].SchedStartTime - now) / 1000 / 60);
                _this.nextServices[_id2].startingIn = _this.formatMinutesHours(_this.nextServices[_id2].startingIn, 'HoursMinsShortEmergency', 'MinsEmergency');
            }
        };

        this.generatePartialResult = function (p) {
            return emergency.labels.partialResults[p.Operation].replaceAll(p.Processed, p.Total);
        };
    }
})();
'use strict';

(function () {
    angular.module('emergencyApp').filter('eta', orderByEta);

    function orderByEta() {

        return function (candidates, breadcrumbs, schedulingType, ultimateCandidate) {

            var __candidates = candidates[0],
                orderedCandidates = [];

            for (var key in __candidates) {
                if (breadcrumbs[key] && breadcrumbs[key].isValidSlot) {
                    orderedCandidates.push(__candidates[key]);
                }
            }

            orderedCandidates.sort(function (a, b) {

                var resourceA = a.Resource.Resource,
                    resourceB = b.Resource.Resource;

                if (breadcrumbs[resourceA.Id].startingIn !== undefined && breadcrumbs[resourceB.Id].startingIn !== undefined) {
                    if (breadcrumbs[resourceA.Id].startingIn > breadcrumbs[resourceB.Id].startingIn) {
                        return 1;
                    }

                    if (breadcrumbs[resourceA.Id].startingIn < breadcrumbs[resourceB.Id].startingIn) {
                        return -1;
                    }

                    return 0;
                }

                // we have breadcrumbs for both resources
                if (breadcrumbs[resourceA.Id] && breadcrumbs[resourceB.Id]) {

                    var A_minutesToAdd = schedulingType === 'asap' ? 0 : breadcrumbs[resourceA.Id].afterCurrent * 60,
                        B_minutesToAdd = schedulingType === 'asap' ? 0 : breadcrumbs[resourceB.Id].afterCurrent * 60;

                    // we have google's durations?
                    if (breadcrumbs[resourceA.Id].duration && breadcrumbs[resourceB.Id].duration) {
                        if (breadcrumbs[resourceA.Id].duration.value + A_minutesToAdd > breadcrumbs[resourceB.Id].duration.value + B_minutesToAdd) return 1;else if (breadcrumbs[resourceA.Id].duration.value + A_minutesToAdd === breadcrumbs[resourceB.Id].duration.value + B_minutesToAdd) return 0;

                        return -1;
                    }

                    if (breadcrumbs[resourceA.Id].duration && breadcrumbs[resourceB.Id].duration === undefined) {
                        return 1;
                    }

                    if (breadcrumbs[resourceA.Id].duration === undefined && breadcrumbs[resourceB.Id].duration) {
                        return -1;
                    }

                    return 0;
                }

                if (breadcrumbs[resourceA.Id] && breadcrumbs[resourceB.Id] === undefined) {
                    return 1;
                }

                if (breadcrumbs[resourceA.Id] === undefined && breadcrumbs[resourceB.Id]) {
                    return -1;
                }

                if (breadcrumbs[resourceA.Id] === undefined && breadcrumbs[resourceB.Id] === undefined) {
                    return 0;
                }
            });

            // update the ultimate candidate
            if (ultimateCandidate) {
                if (orderedCandidates[0] && orderedCandidates[0].Resource) ultimateCandidate.resource = orderedCandidates[0].Resource.Resource.Id;else ultimateCandidate.resource = null;
            }

            return orderedCandidates;
        };
    }
})();
'use strict';

(function () {

    angular.module('emergencyApp').directive('policySelector', function () {
        return {
            template: generateTemplate()
        };
    });

    function generateTemplate() {
        return emergency.labels.EmergencyWizardPolicySelector.replace('$0', '<select class="dispatchTypeCombo" ng-model="emergencyWizard.scheduleWhen" ng-change="emergencyWizard.scheduleWhenUpdated()" ng-disabled="emergencyWizard.emergencyRunning">\n                    <option value="asap">' + emergency.labels.asapWizard + '</option>\n                    <option value="after">' + emergency.labels.afterService + '</option>\n                </select>').replace('$1', '<select class="policyCombo" ng-model="emergencyWizard.selectedPolicy" ng-change="emergencyWizard.runEmergencyAgain()" ng-disabled="emergencyWizard.emergencyRunning">\n                    <option ng-repeat="policy in emergencyWizard.policies" value="{{policy.Id}}">{{policy.Name}}</option>\n                </select>');
    }
})();
'use strict';

(function () {

    // service definition
    angular.module('emergencyApp').service('sfdcCommunication', sfdcCommunication);

    // service injections
    sfdcCommunication.$inject = ['$q'];

    // actual service c'tor
    function sfdcCommunication($q) {
        var _this = this;

        this.cachedRoutes = {};
        //get O2 Polilyne 
        this.geO2Polygon = function (navigatinRequest, date) {
            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(emergency.remoteActions.getO2Polyline, JSON.stringify(navigatinRequest), moment(date).format(), function (response, ev) {

                if (ev.status && response) {
                    deferred.resolve(response);
                } else {
                    deferred.reject(ev);
                }
            }, { buffer: false, escape: false });

            return deferred.promise;
        };

        // get policies
        this.getPolicies = function () {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(emergency.remoteActions.getPolicies, function (policies, ev) {

                if (ev.status && policies) {
                    deferred.resolve(policies);
                } else {
                    deferred.reject(ev);
                }
            }, { buffer: false, escape: false });

            return deferred.promise;
        };

        // get slots
        this.getSlots = function (serviceId, policyId) {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(emergency.remoteActions.getSlots, serviceId, policyId, function (slots, ev) {

                if (ev.status && slots) {
                    deferred.resolve(slots);
                } else {
                    deferred.reject(ev);
                }
            }, { buffer: false, escape: false });

            return deferred.promise;
        };

        // get resources: breadcrumbs & homebase
        this.getBreadcrumbs = function (resoucesList) {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(emergency.remoteActions.getBreadcrumbs, resoucesList, function (resources, ev) {

                if (ev.status && resources) {
                    deferred.resolve(resources);
                } else {
                    deferred.reject(ev);
                }
            }, { buffer: false, escape: false });

            return deferred.promise;
        };

        // get resources: breadcrumbs & homebase
        this.saveConsecutiveService = function (data) {

            var deferred = $q.defer();

            Visualforce.remoting.Manager.invokeAction(emergency.remoteActions.saveConsecutiveService, data, function (resources, ev) {

                if (ev.status && resources) {
                    deferred.resolve(resources);
                } else {
                    deferred.reject(ev);
                }
            }, { buffer: false, escape: false });

            return deferred.promise;
        };

        // get route from X to Y
        this.getRouteFromGoogle = function (resourceId, coordsOrigin, coordsDest) {

            var deferred = $q.defer(),
                directionsService = new google.maps.DirectionsService();

            // check if route is cached
            if (_this.cachedRoutes[resourceId]) {
                deferred.resolve(_this.cachedRoutes[resourceId]);
                return deferred.promise;
            }

            directionsService.route({
                origin: { lat: coordsOrigin.latitude, lng: coordsOrigin.longitude },
                destination: { lat: coordsDest.latitude, lng: coordsDest.longitude },
                travelMode: google.maps.TravelMode.DRIVING
            }, function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {

                    var currentPath = [];

                    for (var i = 0; i < response.routes[0].overview_path.length; i++) {
                        currentPath.push({
                            latitude: response.routes[0].overview_path[i].lat(),
                            longitude: response.routes[0].overview_path[i].lng()
                        });

                        _this.cachedRoutes[resourceId] = currentPath;
                        deferred.resolve(currentPath);
                    }
                } else {
                    deferred.reject(status);
                }
            });

            return deferred.promise;
        };

        // get distance matrix
        this.getDistanceMatrixFromGoogle = function (coordsOrigin, coordsDest) {

            var deferred = $q.defer(),
                distanceMatrixService = new google.maps.DistanceMatrixService();

            distanceMatrixService.getDistanceMatrix({
                origins: coordsOrigin,
                destinations: [{ lat: coordsDest.latitude, lng: coordsDest.longitude }],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: emergency.distanceUnit === 'mile' ? google.maps.UnitSystem.IMPERIAL : google.maps.UnitSystem.METRIC,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                }
            }, function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    deferred.resolve(response);
                } else {
                    deferred.reject(status);
                }
            });

            return deferred.promise;
        };
    }
})();
'use strict';

(function () {

    angular.module('emergencyApp').filter('ValidMarkers', ValidMarkers);

    function ValidMarkers() {

        return function (breadcrumbs) {

            var validBreadcrumbs = {};

            for (var resourceKey in breadcrumbs) {
                if (breadcrumbs[resourceKey] && breadcrumbs[resourceKey].isValidSlot) {
                    validBreadcrumbs[resourceKey] = breadcrumbs[resourceKey];
                }
            }

            return validBreadcrumbs;
        };
    }
})();