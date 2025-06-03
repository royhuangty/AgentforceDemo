
<!DOCTYPE html>
<html>

<head>
    <title>Primitive Map</title>
    <style>
        #map {
            height: 100%;
        }

        html,
        body {
            height: 100%;
            margin: 0;
        }
    </style>
</head>

<body>
    <div id="map"></div>
    <!--  Polyfill promises for IE11. -->
    <script src="https://cdn.jsdelivr.net/bluebird/3.5.0/bluebird.core.min.js"></script>
    <script>
        "use strict";

        var mapConfig = {
            apiKey: 'primitiveMapKey',
            geocodeEndpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
            MIN_ZOOM: 0,
            MAX_ZOOM: 21,
            AUTOZOOM_PADDING: 40 // comfortable margins around the markers
        };

        /**
         * Data and Methods to manipulate the map.
         * Wraps around the core google map and provides initialization and accessors.
         */
        var primitiveMap = {
            googleMap: null,
            centerValue: null,
            autoCenter: true,
            zoomValue: null,
            autoZoom: true,
            markerValues: [],
            activeMarkerKey: null,
            hoverMarkerKey: null,
            tilesLoaded: false,
            messageDispatcher: null,
            cmpId: undefined,

            init: function () {
                /**
                 * Handle a click anywhere on the map
                 */
                function handleMapClick() {
                    this.makeMarkerActive(null);     // no markers active
                }

                this.googleMap = new google.maps.Map(document.getElementById('map'), {
                    center: { lat: 37.790120, lng: -122.396879 },
                    zoom: 0
                });

                // Remove infoWindow from markers when clicking anywhere in 'whitespace' on map
                google.maps.event.addDomListener(this.googleMap, 'click', handleMapClick.bind(this));
                google.maps.event.addListenerOnce(this.googleMap, 'tilesloaded', this.handleTilesLoaded.bind(this));
                
                //User interaction events
                this.googleMap.addListener('click', this.notifyLocationOnMapClick.bind(this));
                this.googleMap.addListener('dragstart', this.notifyUserDragStart.bind(this));
                this.googleMap.addListener('dragend', this.notifyUserDragEnd.bind(this));
                this.googleMap.addListener('drag', this.notifyUserDrag.bind(this));
                this.googleMap.addListener('idle', this.notifyUserIdle.bind(this));
                this.googleMap.addListener('center_changed', this.notifyUserCenterChanged.bind(this));
                this.googleMap.addListener('mouseout', this.notifyUserMouseOut.bind(this));

                

                this.messageDispatcher = new MessageDispatcher(window, this.handleMessage.bind(this));
            },

            handleMessage: function (event) {
                var incoming = event && event.data;

                // Assume the incoming is json if type is string.
                // 222, it's object.
                // 224, it's json string.
                if (typeof (incoming) === "string") {
                    incoming = JSON.parse(incoming);
                    if(incoming === "call:centerMarkerOnDrag"){
                        this.centerMarkerOnDrag();
                    }
                    if(incoming.name && incoming.name === "call:updateMarkerIcon"){
                        this.updateMarkerIcon(incoming.iconUrl);
                    }
                    if(incoming.updateMarkersPosition) {
                        incoming = incoming.updateMarkersPosition;
                        if (incoming.marker) {
                            this.updateMarkerposition(incoming.key , incoming.marker[0]);
                            return;
                        }
                    } else {
                        incoming = incoming.arguments || {};
                        this.cmpId = incoming.cmpId;
                    }
                }
                if (incoming) {
                    if (incoming.center) {
                        this.center = incoming.center;
                    }
                    if (incoming.zoomLevel && !isNaN(incoming.zoomLevel)) {
                        this.zoomLevel = Number(incoming.zoomLevel);
                    }
                    if (incoming.markers) {
                        this.markers = incoming.markers;
                    }
                    if (incoming.activeMarkerId) {
                        this.activeMarkerId = incoming.activeMarkerId;
                    }
                    if (incoming.hoverMarkerId) {
                        this.hoverMarkerId = incoming.hoverMarkerId;
                    }
                    //this.googleMap.setOptions({styles: styles['hide']});
                    if (incoming.options && this.googleMap) {
                        var newOptions = {};
                        if(incoming.options.disableDefaultUI != undefined){
                            if(!this.googleMap.disableDefaultUI || this.googleMap.disableDefaultUI != incoming.options.disableDefaultUI){
                                newOptions['disableDefaultUI'] = incoming.options.disableDefaultUI;
                            }
                        }
                        if(incoming.options.draggable != undefined){
                            if(!this.googleMap.draggable || this.googleMap.draggable != incoming.options.draggable){
                                newOptions['draggable'] = incoming.options.draggable;
                            }
                        }
                        if(incoming.options.zoomControl != undefined){
                            if(!this.googleMap.zoomControl || this.googleMap.zoomControl != incoming.options.zoomControl){
                                newOptions['zoomControl'] = incoming.options.zoomControl;
                            }
                        }
                        if(incoming.options.scrollwheel != undefined){
                            if(!this.googleMap.scrollwheel || this.googleMap.scrollwheel != incoming.options.scrollwheel){
                                newOptions['scrollwheel'] = incoming.options.scrollwheel;
                            }
                        }
                        if(incoming.options.disableDoubleClickZoom != undefined){
                            if(!this.googleMap.disableDoubleClickZoom || this.googleMap.disableDoubleClickZoom != incoming.options.disableDoubleClickZoom){
                                newOptions['disableDoubleClickZoom'] = incoming.options.disableDoubleClickZoom;
                            }
                        }

                        // TODO for style
                        if(incoming.options.mapStyle != undefined){
                            newOptions['styles'] = incoming.options.mapStyle;    
                        }
                        this.googleMap.setOptions(newOptions);
                        
                    }
                }
                
                
            },

            /**
            * key - Pass the key for which marker need to be updated.
            * updateMarkerObj - Pass the marker object with new position values.
            * function (key, updateMarkerObj)
            */

            updateMarkerposition : function (key, updateMarkerObj) {
                //console.log("html file : updateMarkerposition called");
                var numMarkers = this.markerValues.length;
                for (var i = 0; i < numMarkers; i++) {
                    var marker = this.markerValues[i];
                    //console.log("html file :  marker.key === key "+marker.key + "  and key is : "+key);
                    if (marker.key === key) {
                        var apiMarker = marker.apiMarker;
                        if (apiMarker) {
                            //console.log("html file :  api marker not null");
                            apiMarker.setPosition(new google.maps.LatLng(updateMarkerObj.Latitude, updateMarkerObj.Longitude));
                        }
                    }
                };
            },

            
            

            /**
             * Make marker with the specified key active.
             * If key = null then all markers made inactive.
             */
            makeMarkerActive: function (key, notifyParent) {
                var numMarkers = this.markerValues.length;
                for (var i = 0; i < numMarkers; i++) {
                    var marker = this.markerValues[i];
                    if (marker.apiInfoWindow && marker.apiMarker) {
                        var apiInfoWindow = marker.apiInfoWindow;
                        if (marker.key === key) {
                            apiInfoWindow.open(
                                this.googleMap,
                                marker.apiMarker
                            );
                        } else {
                            apiInfoWindow.close();
                        }
                    }
                };

                if (notifyParent) {
                    // if cmpId is present, it serves 224. If not, fallback to old pattern.
                    if (this.cmpId) {
                        var postMessageEvent = {};
                        postMessageEvent.event = 'markerselect';
                        postMessageEvent.arguments = {
                            event: 'markerselect',
                            key: key
                        };
                        //add component id to the address data
                        postMessageEvent.arguments.cmpId = this.cmpId;
                        //TODO filter targetOrigin
                        this.messageDispatcher.send(JSON.stringify(postMessageEvent));
                    } else {
                        this.messageDispatcher.send({
                            event: 'markerselect',
                            key: key
                        });
                    }
                }
            },
            /**
             * Send Parent the lat/lng user clicked on 
             */
            notifyLocationOnMapClick : function(mapsMouseEvent){
                let message = {
                    eventName: 'click',
                    eventData: mapsMouseEvent.latLng.toJSON()
                }
                this.messageDispatcher.send(JSON.stringify(message));
            },

            notifyUserDragStart : function(mapsMouseEvent){
                let message = {
                    eventName: 'dragStart',
                    eventData: ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
            },

            notifyUserDragEnd : function(mapsMouseEvent){
                //assuming single marker
                let marker = this.markerValues[0];
                let apiMarker = marker && marker.apiMarker;


                let message = {
                    eventName: 'dragEnd',
                    eventData: apiMarker && apiMarker.getPosition().toJSON() || ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
            },

            notifyUserDrag: function(mapsMouseEvent){
                
                let message = {
                    eventName: 'drag',
                    eventData: ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
               
            },

            notifyUserIdle: function(mapsMouseEvent){
                //assuming single marker
                let marker = this.markerValues[0];
                let apiMarker = marker && marker.apiMarker;


                let message = {
                    eventName: 'idle',
                    eventData: apiMarker && apiMarker.getPosition().toJSON() || ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
               
            },
            notifyUserCenterChanged: function(mapsMouseEvent){
                
                let message = {
                    eventName: 'centerchnaged',
                    eventData: ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
               
            },
            notifyUserMouseOut: function(mapsMouseEvent){
                
                let message = {
                    eventName: 'mouseout',
                    eventData: ""
                }
                this.messageDispatcher.send(JSON.stringify(message));
               
            },

            centerMarkerOnDrag(){
                let marker = this.markerValues[0];
                let apiMarker = marker && marker.apiMarker;
                let center = this.googleMap.getCenter();
                let updatedCenter = new google.maps.LatLng(center.lat(), center.lng());
               
                apiMarker && apiMarker.setPosition(updatedCenter);
            },
            updateMarkerIcon(icon){
                let marker = this.markerValues[0];
                let apiMarker = marker && marker.apiMarker;

                apiMarker && apiMarker && apiMarker.setIcon(icon);
            },
            /**
             * Hover on marker with the specified key.
             */
            hoverOnMarker: function (key) {
                var numMarkers = this.markerValues.length;
                for (var i = 0; i < numMarkers; i++) {
                    var marker = this.markerValues[i];
                    if (marker.apiMarker && marker.apiMarker.setAnimation){
                        var apiMarker = marker.apiMarker;
                        if (marker.key === key) {
                            // bounce once
                            apiMarker.setAnimation(google.maps.Animation.BOUNCE);
                            apiMarker.setAnimation();
                        } else {
                            apiMarker.setAnimation();
                        }
                    }
                };
            },

            /**
             * Process markers ...
             * - Transforms each incoming marker from internal marker data format to google.maps.Marker format (apiMarker) and attaches to marker
             * - Creates google.maps.InfoWindow(s) for each marker
             * - Calculates zoom and center if required
             */
            processMarkers: function (markers) {
                markers = markers && markers.map && markers.map(function (marker) {

                    // Transform all markers to { Lat, Lng } so Google Maps JS API can consume them. Geocode if needed.
                    return mapUtils.getComputedLatLng(marker)
                        .then(function (position) {
                           // Transform the markers to Google format and pass them to the map
                            marker.type = marker.type || "none";
                            switch (marker.type) {
                               case "Circle" : {
                                    if(mapUtils.isValidCircle(marker)){
                                        var apiCircle = new google.maps.Circle({
                                            strokeColor: marker.strokeColor,
                                            strokeOpacity: marker.strokeOpacity,
                                            strokeWeight: marker.strokeWeight,
                                            fillColor: marker.fillColor,
                                            fillOpacity: marker.fillOpacity,
                                            map: primitiveMap.googleMap,
                                            center: position,
                                            type: "Circle",
                                            radius: marker.radius
                                        });
        
                                        marker.apiMarker = apiCircle;
                                        return marker;
                                    }
                                    break;
                                }
                                case "Rectangle" : {
                                    if(mapUtils.isValidRectangle(marker)){
                                        var apiRectangle = new google.maps.Rectangle({
                                            strokeColor: marker.strokeColor,
                                            strokeOpacity: marker.strokeOpacity,
                                            strokeWeight: marker.strokeWeight,
                                            fillColor: marker.fillColor,
                                            fillOpacity: marker.fillOpacity,
                                            map: primitiveMap.googleMap,
                                            center: marker.bounds,
                                            type: "Rectangle",
                                            bounds: marker.bounds
                                        });
        
                                        marker.apiMarker = apiRectangle;
                                        return marker;
                                    }
                                    break;
                                }
                                case "Polygon" : {
                                    if(mapUtils.isValidPolygon(marker)){
                                        var apiRectangle = new google.maps.Polygon({
                                            strokeColor: marker.strokeColor,
                                            strokeOpacity: marker.strokeOpacity,
                                            strokeWeight: marker.strokeWeight,
                                            fillColor: marker.fillColor,
                                            fillOpacity: marker.fillOpacity,
                                            map: primitiveMap.googleMap,
                                            allPaths: marker.paths,
                                            type: "Polygon",
                                            paths: marker.paths
                                        });
                                        marker.apiMarker = apiRectangle;
                                        return marker;
                                    }
                                    break;
                                }
                                default: {
                                    var markerOptions = {
                                        position: position,
                                        animation: google.maps.Animation.DROP,
                                        map: primitiveMap.googleMap
                                        };
                                         if(marker.icon){
                                                markerOptions['icon'] = marker.icon;
                                        }
                                        if(marker.animation){
                                            markerOptions['animation'] = marker.animation;
                                        }
                                        
                                        var apiMarker = new google.maps.Marker(markerOptions);
            
                                        // Create infoWindow for each marker
                                        // only if the title is not null, create infoWindow
                                        
                                        if(marker.title) {
                                            var title = marker.title || '';
                                            var description = marker.description || '';
                                            var infoWindow = new google.maps.InfoWindow({
                                                content: '<div>' +
                                                    '<h4>' + title + '</h4>' +
                                                    '<p>' + description + '</p>' +
                                                    '</div>'
                                            });
                                               marker.apiInfoWindow = infoWindow;
                                        }
                                        apiMarker.addListener('click', function () {
                                            var key = this.key;
                                            primitiveMap.activeMarkerKey = key;
                                            primitiveMap.makeMarkerActive(key, true);
                                        }.bind(marker));
            
                                        marker.apiMarker = apiMarker;
                                       // marker.apiInfoWindow = infoWindow;
                                        return marker;
                                }
                            }
                        }, function (e) {
                            console.error(e);
                        });
                });

                /*
                 * Once the markers are geocoded and transformed to Google format, we need to perform some optional steps.
                 * These are calculating the zoom and center if those attributes are not specified. These can be performed only after the Google format markers are computed (above).
                 *
                 * Some of the geocoding calls can fail due to network, api, invalid request etc. We can only wait for some max time after which we ignore the faulty markers and proceed with next steps.
                 */
                if (primitiveMap.autoZoom || primitiveMap.autoCenter) {

                    var postProcessRan = false;

                    /**
                     * The post process can be called in multiple instances:
                     * - All the markers resolved successfully.
                     * - Some markers resolved successfully and some were rejected by Google.
                     * - Some markers timed out due to network error.
                     * In all above scenarios, we will post process the markers that were resolved successfully.
                     */
                    function postProcessMarkersExactlyOnce() {

                        /**
                         * Auto calculate zoom and/or center if they are not specified.
                         */
                        function postProcessMarkers() {
                            var bounds = mapUtils.getComputedMapBounds(primitiveMap.getApiMarkers());

                            // optionally calculate zoom
                            if (primitiveMap.autoZoom) {
                                primitiveMap.zoomValue = mapUtils.getComputedZoomByBounds(
                                    primitiveMap.googleMap,
                                    bounds
                                );
                                primitiveMap.googleMap.setZoom(primitiveMap.zoomValue);
                            }

                            // optionally calculate center
                            primitiveMap.computeCenter();
                        }

                        if (!postProcessRan) {
                            postProcessRan = true;
                            postProcessMarkers();
                        }
                    }

                    Promise.all(markers)
                        .then(function () {
                            // all markers resolved successfully. do post process.
                            postProcessMarkersExactlyOnce();
                        }, function (error) {
                            // some markers failed due to geocoding error or invalid format. log the failures and then post process the successful markers.
                            console.error(error.message);
                            postProcessMarkersExactlyOnce();
                        });

                    // Edge case: If a network issue occurs, some markers might not resolve. Start post processing after the timeout.
                    // Most network errors are handled by Google status codes, this handles a slow network or lost request.
                    var geocodingTimeout = 5 * 1000;    // max wait time for all geocoding to finish
                    var id = setTimeout((function () {
                        clearTimeout(id);
                        postProcessMarkersExactlyOnce();
                    }).bind(primitiveMap), geocodingTimeout);
                }
            },

            /**
             * Event handler for when the tiles are first lodaded, until then, we can't really operate with the map.
             * @param {Object} Event - The google map Event object.
             */
            handleTilesLoaded: function () {
                this.tilesLoaded = true;
                this.processMarkers(this.markerValues);

                if (this.zoomValue) {
                    this.googleMap.setZoom(this.zoomValue);
                }
                this.computeCenter();
            },

            resetMarkers: function () {
                this.activeMarkerId = null;
                this.hoverMarkerKey = null;
                this.resetApiMarkers();
                this.resetInfoWindows();
            },

            resetInfoWindows: function () {
                var numMarkers = this.markerValues.length;
                for (var i = 0; i < numMarkers; i++) {
                    var apiInfoWindow = this.markerValues[i].apiInfoWindow;
                    if (apiInfoWindow) {
                        google.maps.event.clearInstanceListeners(apiInfoWindow);
                        apiInfoWindow.close();
                        this.markerValues[i].apiInfoWindow = null;
                    }
                }
            },

            resetApiMarkers: function () {
                var numMarkers = this.markerValues.length;
                for (var i = 0; i < numMarkers; i++) {
                    var apiMarker = this.markerValues[i].apiMarker;
                    if (apiMarker) {
                        google.maps.event.clearInstanceListeners(apiMarker);
                        apiMarker.setMap(null);
                        this.markerValues[i].apiMarker = null;
                    }
                }
            },

            getApiMarkers: function () {
                var apiMarkers = [];
                this.markerValues && this.markerValues.forEach(function (marker) {
                    var apiMarker = marker && marker.apiMarker;
                    if (apiMarker) {
                        apiMarkers.push(apiMarker);
                    }
                });
                return apiMarkers;
            },

            computeCenter: function () {
                if (this.autoCenter) {
                    var bounds = mapUtils.getComputedMapBounds(primitiveMap.getApiMarkers());
                    this.googleMap.panTo(bounds.getCenter());
                } else if (this.center && (mapUtils.isValidCoordinate(this.center) || mapUtils.isValidAddress(this.center))) {
                    mapUtils.getComputedLatLng(this.center)
                    .then(function (coordinates) {
                        primitiveMap.googleMap.setCenter(coordinates);
                    }, function (e) {
                        console.error(e);
                    });
                }
            },

            /**
             * setter function for the center attribute.
             * @param {Object} center - a pair of Latitude and Longitude, or address elements.
             */
            set center(center) {
                this.autoCenter = false;
                this.centerValue = center;
                this.tilesLoaded && this.computeCenter();
            },

            /**
             * getter function for the center attribute.
             * @returns {Object} a pair of Latitude and Longitude, or address elements.
             */
            get center() {
                return this.centerValue;
            },

            /**
             * setter for key of the hovered marker.
             * @param {String} key - the key/guid of the hovered marker.
             */
            set hoverMarkerId(key) {
                if (key !== this.hoverMarkerKey && this.tilesLoaded) {
                    this.hoverMarkerKey = key;
                    this.hoverOnMarker(key);
                }
            },

            /**
             * getter for key of the hovered marker.
             * @returns {String} the key/guid of the hovered marker.
             */
            get hoverMarker() {
                return this.hoverMarkerKey;
            },

            /**
             * setter for key of the active marker.
             * @param {String} key - the key/guid of the active marker.
             */
            set activeMarkerId(key) {
                if (key !== this.activeMarkerKey && this.tilesLoaded) {
                    this.activeMarkerKey = key;
                    this.makeMarkerActive(key);
                }
            },

            /**
             * getter for key of the active marker.
             * @returns {String} the key/guid of the active marker.
             */
            get activeMarkerId() {
                return this.activeMarkerKey;
            },

            /**
                * setter function for the markers attribute.
                * @param {Array} markers - an array of pairs of Latitude and Longitude, or address elements.
                */
            set markers(markers) {
                if (this.tilesLoaded) {
                    this.resetMarkers();
                    this.processMarkers(markers);
                }
                this.markerValues = markers;
            },

            /**
             * getter for the markers attribute.
             * @returns {Array} an array of pairs of Latitude and Longitude, or address elements.
             */
            get markers() {
                return this.markerValues;
            },

            /**
             * setter for the level of zoom.
             * @param {Number} zoomLevel - the numeric zoom level.
             */
            set zoomLevel(zoomLevel) {
                this.zoomValue = zoomLevel;
                this.autoZoom = false;
                if (this.tilesLoaded) {
                    this.googleMap.setZoom(zoomLevel);
                }
            },

            /**
             * getter for the level of zoom.
             * @param {Number} the numeric zoom level.
             */
            get zoomLevel() {
                return this.zoomValue;
            },
        };
        /* Primitive Map End */

        /**
         * Utility functions to prepare and transform map data like geocoding, computing bounds, center and zoom etc.
         */
        var mapUtils = (function () {

            var geocoder;

            /**
             * Checks if the marker has a pair of latitude and longitude with valid values
             * @param {object} marker
             */
            function isValidCoordinate(marker) {
                if (marker) {
                    var isValidLatitude = marker.Latitude && marker.Latitude >= -90 && marker.Latitude <= 90;
                    var isValidLongitude = marker.Longitude && marker.Longitude >= -180 && marker.Longitude <= 180;

                    if (isValidLatitude && isValidLongitude) {
                        return true;
                    }
                }
                return false;
            }

            /**
             * A street address which must be paired with at least one of country, state, city or postal code
             * At least one of country, state, city or postal code
             * @param {object} marker
             */
            function isValidAddress(marker) {
                if (marker) {
                    var atleastOneRequiredAddressComponentProvided = marker.Country || marker.State || marker.City || marker.PostalCode;
                    if (atleastOneRequiredAddressComponentProvided) {
                        return true;
                    }
                }
                return false;
            }

            /**
             * A Marker type circle which must validate shape stroke color, opacity, weight, radius
             * @param {object} marker
             */
            function isValidCircle(marker) {
                if (marker) {
                    var isValidStrokeColor = (typeof marker.strokeColor === 'string');
                    var isValidStrokeOpacity =  (typeof marker.strokeOpacity === 'number');
                    var isValidStrokeWeight = (typeof marker.strokeWeight === 'number');
                    var isValidFillColor = (typeof marker.fillColor === 'string');
                    var isValidFillOpacity =  (typeof marker.fillOpacity === 'number');
                    var isValidRadius =  (typeof marker.radius === 'number');
                    if(isValidStrokeColor && isValidStrokeOpacity && isValidStrokeWeight && isValidFillColor && isValidFillOpacity && isValidRadius){
                        return true;
                    }
                }
                return false;
            }
            /**
             * A Marker type rectangle which must validate shape stroke color, opacity, weight, bounds
             * @param {object} marker
             */
             function isValidRectangle(marker) {
                if (marker) {
                    var isValidStrokeColor = (typeof marker.strokeColor === 'string');
                    var isValidStrokeOpacity =  (typeof marker.strokeOpacity === 'number');
                    var isValidStrokeWeight = (typeof marker.strokeWeight === 'number');
                    var isValidFillColor = (typeof marker.fillColor === 'string');
                    var isValidFillOpacity =  (typeof marker.fillOpacity === 'number');
                    var isValidBounds = marker.bounds  && (typeof marker.bounds.north === 'number') && (typeof marker.bounds.south === 'number') && 
                                                            (typeof marker.bounds.east === 'number') && (typeof marker.bounds.west === 'number');
                    if(isValidStrokeColor && isValidStrokeOpacity && isValidStrokeWeight && isValidFillColor && isValidFillOpacity && isValidBounds){
                        return true;
                    }
                }
                return false;
            }
            /**
             * A Marker type polygon which must validate shape stroke color, opacity, weight, path, geoDesic
             * @param {object} marker
             */
            function isValidPolygon(marker) {
                if (marker) {
                    var isValidStrokeColor = (typeof marker.strokeColor === 'string');
                    var isValidStrokeOpacity =  (typeof marker.strokeOpacity === 'number');
                    var isValidStrokeWeight = (typeof marker.strokeWeight === 'number');
                    var isValidFillOpacity =  (typeof marker.fillOpacity === 'number');
                    var isValidPaths = marker.paths && Array.isArray(marker.paths) && isValidPolygonPath(marker.paths);
                    if(isValidStrokeColor && isValidStrokeOpacity && isValidStrokeWeight && isValidFillOpacity  && isValidPaths){
                        return true;
                    }
                }
                return false;
            }

            /**
             * Validate each lat lng for polygon
             */
            function isValidPolygonPath(paths){
                for(var i=0; i< paths.length; i++){
                    if(typeof paths[i].lat !== 'number' || typeof paths[i].lng !== 'number'){
                        return false;
                    }
                }
                return true;
            }
            /**
             * Given a marker which could be either (latitude, longitude) pair or address data,
             * resolve it to format consumable by Google API. Geocoding call might be required.
             */
            function getComputedLatLng(marker) {

                /**
                * Calls Google Geocode API to resolve addresses to coordinates.
                */
                function geocode(address) {
                    geocoder = geocoder || new google.maps.Geocoder();
                    return new Promise(function (resolve, reject) {
                        geocoder.geocode({
                            address: address
                        }, function (results, status) {
                            if (status === 'OK') {
                                if (results.length === 1) {
                                    resolve(results[0].geometry.location);
                                } else {
                                    reject(new Error('Invalid marker: ' + JSON.stringify(marker) + ' and will be ignored.\n. Geocoding ' + address + ' returned multiple(' + results.length + ') results.'));
                                }
                            } else {
                                reject(new Error('Geocoding ' + address + ' failed. Google geocoder status is ' + status));
                            }
                        });
                    });
                };

                return new Promise(function (resolve, reject) {
                    if (marker && mapUtils.isValidCoordinate(marker)) {
                        var lat = marker.Latitude, lng = marker.Longitude;
                        if (typeof marker.Latitude === 'string') {
                            lat = Number(marker.Latitude);
                            lng = Number(marker.Longitude);
                        }
                        resolve({ lat: lat, lng: lng });
                    } else if (marker && mapUtils.isValidAddress(marker)) {
                        var address = [
                            marker.Street,
                            marker.City,
                            marker.PostalCode,
                            marker.State,
                            marker.Country,
                        ].join(' ').trim();
                        geocode(address)
                            .then(function (results) {
                                resolve(results);
                            }, function (error) {
                                reject(error);
                            })
                    } else {
                        reject(
                            new Error(
                                'Invalid marker: ' + JSON.stringify(marker) + ' and will be ignored.\n. Marker format is invalid. Please specify both Latitude and Longitude, or one of PostalCode, City, State or Country (case sensitive).'
                            )
                        );
                    }
                });
            }

            /**
             * Given markers computes a bounds that encompasses all the markers.
             */
             function getComputedMapBounds(apiMarkers) {
                var bounds = new google.maps.LatLngBounds();
                var numMarkers = apiMarkers.length;
                for (var i = 0; i < numMarkers; i++) {
                    if(apiMarkers[i] && apiMarkers[i].type){
                        switch(apiMarkers[i].type){
                            case "Circle" :{
                                bounds.extend(apiMarkers[i].center);
                                break;
                            }
                            case "Rectangle" :{
                                bounds.union(apiMarkers[i].bounds);
                                break;
                            }
                            case "Polygon" :{
                                for(var p in apiMarkers[i].allPaths) {
                                    bounds.extend(apiMarkers[i].allPaths[p]);
                                }
                                break;
                            }
                            default :{
                                bounds.extend(apiMarkers[i] && apiMarkers[i].position);
                                break;
                            }
                        }
                    } 
                    else{
                        bounds.extend(apiMarkers[i] && apiMarkers[i].position);
                    }
               }
                return bounds;
            }

            /**
             * Compute the level of zoom required to display all the markers on the map with comfortable margins.
             */
            function getComputedZoomByBounds(map, bounds) {
                var AUTOZOOM_PADDING = mapConfig.AUTOZOOM_PADDING;

                // calculate min,max zoom supported by map. This varies based on location.
                var maxZoom =
                    map.mapTypes.get(map.getMapTypeId()).maxZoom || mapConfig.MAX_ZOOM;
                var minZoom =
                    map.mapTypes.get(map.getMapTypeId()).minZoom || mapConfig.MIN_ZOOM;

                // get bound corners surrounding all markers
                var ne = map.getProjection().fromLatLngToPoint(bounds.getNorthEast());
                var sw = map.getProjection().fromLatLngToPoint(bounds.getSouthWest());

                // calculate bound width and height
                var worldCoordWidth = Math.abs(ne.x - sw.x);
                var worldCoordHeight = Math.abs(ne.y - sw.y);

                // keep zooming in until bounds rectangle (with padding) is still visible in viewport
                for (var zoom = maxZoom; zoom >= minZoom; --zoom) {
                    if (
                        worldCoordWidth * (1 << zoom) + 2 * AUTOZOOM_PADDING <
                        map.getDiv().clientWidth &&
                        worldCoordHeight * (1 << zoom) + 2 * AUTOZOOM_PADDING <
                        map.getDiv().clientHeight
                    ) {
                        return zoom;
                    }
                }
                return 0;
            }

            return {
                isValidCoordinate: isValidCoordinate,
                isValidAddress: isValidAddress,
                getComputedLatLng: getComputedLatLng,
                getComputedMapBounds: getComputedMapBounds,
                getComputedZoomByBounds: getComputedZoomByBounds,
                isValidCircle: isValidCircle,
                isValidRectangle: isValidRectangle,
                isValidPolygon: isValidPolygon
            }
        })();

        /**
        * Message Dispatcher
        * - params: primitiveMap, window object
        * - Listens for incoming window messages
        * - Maps the incoming objects to properties on primitiveMap
        */
        function MessageDispatcher(window, receiveCallback) {

            // start listening for message
            window.addEventListener("message", receiveCallback);
            return {
                send: function(message) {
                    window.parent.postMessage(message, '*');
                }
            };
        };

        function init() {
            primitiveMap.init();
        }
    </script>
    <script src="https://maps.googleapis.com/maps/api/js?v=quarterly&key=primitiveMapKey&callback=init"></script>
</body>

</html>