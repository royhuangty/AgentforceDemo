/* global $ MA google*/
//global timeout for search delay functions
var searchTimeout;

/* Logging */
function MALog()
{
    try {
        $.each(arguments, function (index, arg) {
            console.log(arg);
            if (arg instanceof Error) {
                console.log(arg.stack);
            }
        });
    } catch (err) { }
}

//helper method for geocoding
function geocode(options)
{
    MA.Geocoding.geocode({ address: options.address }, function (response) {
        try {
            options.complete({
                success: true,
                request: options,
                results: response.result
            });
        }
        catch (err) {
            options.complete({success: false});
        }
    });
}

function update_marker_on_drag_end (processData) {
    return new Promise(function (resolve, reject)
    {
        processData = $.extend({
            ajaxResource: 'TooltipAJAXResources',
            action: 'set_verified_location',
            update_favorite_location : 'false',
            recordId: '',
            latitude: '',
            longitude: ''
        }, processData || {});
        //if no record id, return
        if(processData.recordId == '' || processData.recordId == undefined) {
            resolve({success:false,error:MASystem.Labels.Set_Verified_Location_Cannot_Set_Location,debug:'Missing a record Id.'});
        }
        else {
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                processData,
                function(response, event){
                    if(event.status) {
                        if(response.success)
                        {
                            resolve(response);
                        }
                        else
                        {
                            //show error and move marker back to where it was
                            var debugMsg = getProperty(response || {}, 'error',false) || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                            resolve({success:false,error:MASystem.Labels.Set_Verified_Location_Cannot_Set_Location,debug:debugMsg});
                        }
                    }
                    else {
                        resolve({success:false,error:MASystem.Labels.Set_Verified_Location_Cannot_Set_Location,debug:e.message});
                    }
                }
            );
        }
    });
}

/*
return obj
{
    duration : int (minutes),
    start: unix time stamp (seconds)
}
*/
function getWaypointTimeOptions (waypointOptions) {
    var returnOption;
    try {
        var duration = 0;
        var start = moment().unix();
        var flexible = false;
        // if passed a string, try and parse
        if (typeof waypointOptions === 'string') {
            try {
                waypointOptions = window.htmlDecode(waypointOptions);
                waypointOptions = JSON.parse(waypointOptions);
            } catch (e) {
                waypointOptions = {
                    TimeBasedOptions: {
                        Duration: '0 hr, 0 min',
                        Start: MASystem.Labels.MA_Set_Start
                    },
                    LockType: 'unlocked',
                    DraggablePoint: false
                };
            }
        }

        // create our duration in minutes
        var wpDuration = window.getProperty(waypointOptions, 'TimeBasedOptions.Duration', false) || '0 hr, 0 min';
        // this is more for internal, incorrect saves when testing null values
        var durationParts;
        try {
            durationParts = wpDuration.split(',');
        } catch (e) {
            durationParts = ['0', '0'];
        }
        var hours = durationParts[0] || 0;
        var mins = durationParts[1] || 0;
        duration = (parseInt(hours, 10) * 60) + parseInt(mins, 10);

        // create our start time, UNIX time stamp
        var wpStart = getProperty(waypointOptions, 'TimeBasedOptions.Start', false) || MASystem.Labels.MA_Set_Start;
        // if we have not set start time, set to flexible
        if (wpStart === MASystem.Labels.MA_Set_Start) {
            flexible = true;
        } else {
            // crate a unix time stamp in seconds (saved format should always be "hh:mm a || 9:00 am")
            var momentTime = moment(wpStart, 'hh:mm a');
            if (momentTime.isValid()) {
                start = momentTime.unix();
            } else {
                // sets time to now, will need to discuss error
                // setting to flexible since this fails
                flexible = true;
                start = window.moment().unix();
            }
        }
        returnOption = {
            start: start,
            duration: duration,
            flexible: flexible
        };
    } catch (e) {
        MA.log(e);
        returnOption = {
            start: moment().unix(),
            duration: 0,
            flexible: true
        }
    }

    return returnOption;
}

function waypoint_Click(options)
{
    options = $.extend({
        markerType: 'waypoint'
    }, options || {});

    var marker = this;

    try {
        // attempt to stop propegation down to the map hiding marker info
        event.stopPropagation();
    } catch (e) {
        console.warn('waypoint_click', e);
    }

    if(MA.isMobile) {
        // create data to pass to tooltips
        var markerOptions = {
            type: 'waypoint-marker',
            record: {
                name: marker.dataName,
                address: marker.dataAddress,
                notes: marker.dataNotes,
                location: {
                    coordinates: marker.markerLocation
                }
            },
            marker: marker,
            queryMetaData: {}
        };
        VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
    }
    else {
        //start building tooltip content from template
        var $waypointContent = $('#waypoint-content-template').clone().attr('id', 'waypoint-content');

        $waypointContent.find('.name').text(marker.dataName || '');
        $waypointContent.find('.address').text(marker.dataAddress || '');
        $waypointContent.data('marker',marker);
        //launch infobubble
        MA.Map.InfoBubble.show({
            position: marker.getPosition(),
            anchor: marker,
            minWidth: 300,
            maxWidth: 300,
            content: $waypointContent.get(0)
        });

        $waypointContent.on('click','.actionbutton',function() {

            var $button = $(this);
            var frameworkAction = $button.attr('data-type') == 'Custom Action'
                ? MAActionFramework.customActions[$button.attr('data-action')] || null
                : MAActionFramework.standardActions[$button.attr('data-action')] || null;

            frameworkAction.ActionValue.call(this, {
                button  : $button,
                customWPMarkers : [marker]
            });
        });
    }
}

function openNewWindow(verb, url, data, target) {
    var form = document.createElement("form");
    form.id = 'downloadPopup';
    form.action = url;
    form.method = verb;
    form.target = target || "_self";
    if (data) {
        for (var key in data) {
            var input = document.createElement("textarea");
            input.name = key;
            input.value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
            form.appendChild(input);
        }
    }
    form.style.display = 'none';
    document.body.appendChild(form);
    var formSubmitted = false;
    $('#downloadPopup').submit(function () {
        // did this popup open?
        formSubmitted = true;
    });
    try {
        $('#downloadPopup').submit();
        // formSubmitted = true;
    } catch (e) {
        console.warn(e);
        formSubmitted = false;
    }
    $('#downloadPopup').remove();
    setTimeout(function() {
        if (!formSubmitted) {
            MAToastMessages.showWarning({message:'Export Failed', subMessage: 'Please ensure popups are not blocked for this session.', timeOut: 0, closeButton:true});
        }
    });
}

function reverseGeocode(options)
{ 
    var dfd = $.Deferred();
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({ latLng: options.latLng }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            options.complete({
                success: true,
                request: options,
                results: results
            });
        }
        else {
            MA.log('Bad Reverse Geocode', status);
            options.complete({success: false});
        }
    });
}
var myCachedPosition;
var watchID;
var mypositionUpdating = false;
var PositionMarker;
var myCachedPositionInfo;
var moveToPos = false;
var ffFirstLoad = true;
var posFirstLoadDone = false;
function myPosition (options) {
    /**
        options = {
            element: DOMElement object // pass this object if you want the style to change after my position Show/Hide process
            pan: Boolean
        }
    **/
    options = options || {};

    //showError = true;
    //alert(myCachedPosition);

    moveToPos = options.pan;

    if(mypositionUpdating === false)
    {
        if(watchID !== null) {
            navigator.geolocation.clearWatch(watchID);
        }
        var geo_options = {
            enableHighAccuracy: true,
            maximumAge        : 60000,
            timeout           : 27000
        };

        //set to true until position is found
        mypositionUpdating = true;

        // build callback functions here to enable passing in some scope variables to out-of scope functions
        var locationSuccessCallback = function(positionObject) {
            onLocationFound( { position: positionObject, element: options.element } );
        };

        var locationErrorCallback = function(positionErrorObject) {
            onLocationError(positionErrorObject);
        };

        //locate position
        watchID = navigator.geolocation.watchPosition(locationSuccessCallback, locationErrorCallback, geo_options);

        //firefox error on finding first pos attempt, never finishes
        //may be able to be removed later...
        //after 5 sec in firefox on first attempt, try again if pos not updated
        if (ffFirstLoad && navigator.userAgent.indexOf("Firefox") > 0) {
            ffFirstLoad = false;
            setTimeout(function() {
                if(mypositionUpdating) {
                    mypositionUpdating = false;
                    myPosition(options);
                }
            },1000);
        }


    }
}

function onLocationError(positionErrorObject) {
    MA.log(positionErrorObject);
    mypositionUpdating = false;
    moveToPos = false;

    if(!posFirstLoadDone) {
        posFirstLoadDone = true;
        GoToHomePosition();
    }
    navigator.geolocation.clearWatch(watchID);
    var errMsg = getProperty(positionErrorObject || {}, 'message', false) || '';
    MAToastMessages.showError({message: MASystem.Labels.NavBar_My_Location_Message ,subMessage:errMsg || '', timeOut: 7000, closeButton:true});
    
}

function onLocationFound(options) {
    /**
        options = {
            element: DOMElement object // pass this object if you want the style to change after my position Show/Hide process
            position: Object // PositionObject from 'ator.geolocation.watchPosition' function success callback
        }
    **/
  options = options || {};
    posFirstLoadDone = true;
    var locationFound = options.position;
    myCachedPositionInfo = locationFound;

    //store location
    myCachedPosition = new google.maps.LatLng(locationFound.coords.latitude, locationFound.coords.longitude);
    mypositionUpdating = false;
    var zoomLevel = 17;
    if (MA.isMobile) {
        // if mobile, a perm can be set to define the zoom level
        zoomLevel = getProperty(userSettings, 'myLocationZoomLevel', false) || 17;
    }
    //remove previous position if found
    if(PositionMarker) {
        PositionMarker.setPosition(myCachedPosition);
        PositionMarker.gps= locationFound;

        if(moveToPos) {
            moveToPos = false;
            //pan to position
            MA.map.panTo(myCachedPosition);
            MA.map.setZoom(zoomLevel);
        }
    }
    else {
        var image = {
            url : MASystem.Images.positionMarker,
            size : new google.maps.Size(40, 40),
            anchor: new google.maps.Point(18, 18),
            scaledSize: new google.maps.Size(36, 36)
        };

        //create marker and add to map
        PositionMarker = new google.maps.Marker({
            position: myCachedPosition,
            map: MA.map,
            icon : image,
            title: 'My Position'
        });

        image = null;

        if(MA.isMobile) {
            google.maps.event.addListener(PositionMarker, 'click', function () {
                var markerOptions = {
                    type: 'my-position',
                    record: {
                        name: MASystem.Labels.MA_Current_Location,
                        address: MASystem.Labels.MA_Loading,
                        location: {
                            coordinates: {
                                lat: PositionMarker.getPosition().lat(),
                                lng: PositionMarker.getPosition().lng()
                            }
                        }
                    },
                    marker: PositionMarker,
                    queryMetaData: {}
                };
                VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
            });
        }
        else {
            //show some general info about location
            var accuracy = getProperty(myCachedPositionInfo,"coords.accuracy") === undefined ? '' : getProperty(myCachedPositionInfo,"coords.accuracy") + ' meters';
            var myPosLat = getProperty(myCachedPositionInfo,"coords.latitude") === undefined ? '' : getProperty(myCachedPositionInfo,"coords.latitude");
            var myPosLng = getProperty(myCachedPositionInfo,"coords.longitude") === undefined ? '' : getProperty(myCachedPositionInfo,"coords.longitude");
            //handle marker click
            google.maps.event.addListener(PositionMarker, 'click', function ()
            {
                try {
                    // attempt to stop propegation down to the map and hide marker info
                    event.stopPropagation();
                } catch (e) {
                    console.warn('c2c_click', e);
                }
                //create marker content
                var $MarkerBubbleContent = $([
                    '<div id="myposition-infobubble">',
                        '<div class="myposition-table-wrapper">',
                            '<table cellpadding="3">',
                                '<tr><td><span class="tooltip-label">Accuracy</span></td><td>' + accuracy + '</td></tr>',
                                '<tr><td><span class="tooltip-label">Address</span></td><td id="PositionAddress">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</td></tr>',
                            '</table>',
                        '</div>',
                        '<div class="layout-tooltip">',
                            MAActionFramework.buildLayoutFromContents(userSettings.ButtonSetSettings.myPositionLayout).html(),
                        '</div>',
                    '</div>'
                ].join(''));

                //create info bubble
                MA.myPositionInfoBubble = MA.Map.InfoBubble.show({
                    position: PositionMarker.getPosition(),
                    minWidth: 375,
                    content: $MarkerBubbleContent.get(0)
                });
                google.maps.event.addListener(MA.myPositionInfoBubble, 'domready', function ()
                {
                    //handle clicking an action button
                    $MarkerBubbleContent.find('.actionbutton').click(function (e) {
                        var $button = $(this);
                        var frameworkAction = $button.attr('data-type') == 'Custom Action'
                            ? MAActionFramework.customActions[$button.attr('data-action')] || null
                            : MAActionFramework.standardActions[$button.attr('data-action')] || null;

                        if (frameworkAction) {
                            switch (frameworkAction.Action)
                            {
                                case 'Iframe':

                                    //get a component index from the action framework to make this tab unique and build the iframe url
                                    var componentIndex = MAActionFramework.componentIndex++;
                                    var iframeURL = frameworkAction.ActionValue
                                        + (frameworkAction.ActionValue.indexOf('?') == -1 ? '?noparams' : '')
                                        + '&Button=' + encodeURIComponent(frameworkAction.Label)
                                        + '&RecordId=' + record.record.Id;

                                    //build the new tab and the corresponding pane
                                    var $newTab = $("<li id='CustomTab-"+componentIndex+"'><a href='#pane-customaction-"+componentIndex+"'>"+frameworkAction.Label+"</a> <span class='ui-icon ui-icon-close'>Remove Tab</span></li>");
                                    var $newPane = $("<div id='pane-customaction-"+componentIndex+"'><iframe src='"+iframeURL+"' style='width: 100%; height: 100%;'></iframe></div>");

                                    //append the tab and pane to the tooltip tabs and refresh
                                    $('#tooltip-content').find('.ui-tabs-nav').append($newTab).closest('.tabs').append($newPane).tabs('refresh').find('#CustomTab-'+componentIndex+' a').click();

                                    //handle clicking the close button for this new tab
                                    $newTab.css({'width': 'auto', 'padding-right': '5px'}).find('.ui-icon-close').css({'cursor': 'pointer', 'position': 'absolute', 'right': '0'}).click(function () {
                                        if ($newTab.is('.ui-tabs-active')) {
                                            $('#tooltip-content').find('.ui-tabs-nav > li:first-child a').click();
                                        }

                                        $newTab.remove();
                                        $newPane.remove();
                                    });
                                    break;

                                case 'NewWindow':

                                    var newURL = frameworkAction.ActionValue
                                        + (frameworkAction.ActionValue.indexOf('?') == -1 ? '?noparams' : '')
                                        + '&Button=' + encodeURIComponent(frameworkAction.Label)
                                        + '&type=My%20Position'
                                        + '&latitude=' + position.coords.latitude
                                        + '&longitude=' + position.coords.longitude
                                        + '&address=' + $('#PositionAddress').text();

                                    window.open(newURL);
                                    break;

                                case 'Javascript':

                                    frameworkAction.ActionValue.call(this, {
                                        button: $button,
                                        customMarkers: [{ type: 'MyPosition', title: 'My Position', latlng: PositionMarker.getPosition(), address: $('#PositionAddress').text() }]
                                    });

                                    break;

                                default:
                                    break;
                            }
                        }

                        //stop the click from getting to the map
                        e.stopPropagation();
                    });

                    //send reverse geocode request
                    reverseGeocode({
                        latLng: PositionMarker.getPosition(),
                        complete: function (response) {
                            if (response.success && response.results.length > 0) {
                                $('#PositionAddress').text(response.results[0].formatted_address || '');
                            }
                            else {
                                $('#PositionAddress').text('');
                            }
                        }
                    });
                });
            });
            $('#ShowPositionButton').addClass('btn-active');
            $(options.element).addClass('is-active');

        }

        if(moveToPos) {
            moveToPos = false;
            //pan to position
            MA.map.panTo(myCachedPosition);
            MA.map.setZoom(zoomLevel);
        }

        //mark position as enabled
        PositionEnabled = true;
        mypositionUpdating = false;
    }


}

function marker_Click_byId(event, layerId, recordId)
{
    $('#PlottedQueriesTable .PlottedRowUnit[qid="' + layerId + '"]').each(function () {
        var $pq =  $(this);
        var queryData = $pq.data() || {};
        var records = queryData.records || {};
        var record = records[recordId] || {};
        if(record.marker) {
            if(MA.isMobile) {
                Plotting.marker_Click.call(record.clusterMarker);
            }
            else {
                Plotting.marker_Click.call(record.marker);
            }
        }
    });

    if (event !== null)
    {
        if (event.stopPropagation){
            event.stopPropagation();
        }
        else if(window.event){
            window.event.cancelBubble=true;
        }
    }
}

function ClickDataMarker(event, layerId, recordId)
{
    $('#PlottedQueriesTable .DataLayer[key="' + layerId + '"]').each(function () {
        var $plottedLayer = $(this);
        var layerData = $plottedLayer.data() || {};
        var records = layerData.records || {};
        var record = records[recordId] || {}

        if(record.clusterMarker) {
            if(MA.isMobile) {
                google.maps.event.trigger(record.clusterMarker, 'click');
            }
            else {
                //google.maps.event.trigger(record.marker, 'click');
                var bounds = new google.maps.LatLngBounds();
           		bounds.extend(record.clusterMarker.getPosition());
                var clickOptions = {
                    isMobile : MA.isMobile || false,
                    layerName : layerData.name,
                    type : 'marker',
                    key : record.clusterMarker.key,
                    bounds : bounds
                };
                MADemographicLayer.getDataLayerMarkerInfo.call(record.clusterMarker,clickOptions);
            }
        }
    });

    if (event !== null)
    {
        if (event.stopPropagation){
            event.stopPropagation();
        }
        else if(window.event){
            window.event.cancelBubble=true;
        }
    }
}

function ZoomToFit(options)
{   
    var markers = [];
    options = $.extend({
        queries: [],
        dataLayers : [],
        polylineLayers: [],
        arcgisLayers: []
    }, options);
    //loop through the plotted queries to see if they are all heat maps
    var allHeatMaps = true;
    $('#PlottedQueriesTable .PlottedRowUnit').each(function () {
        if ($(this).attr('data-renderAs') != 'Heatmap') {
            allHeatMaps = false;
            return false;
        }

        if ($(this).data('layerType') === 'polyline') {
            allHeatMaps = false;
            return false;
        }
    });

    if (options.dataLayers.length > 0 || options.arcgisLayers.length > 0 || options.polylineLayers.length > 0) {
        allHeatMaps = false;
    }

    //if we only have heat maps, zoom out to country level
    if ($('#PlottedQueriesTable .PlottedRowUnit').length > 0 && allHeatMaps) {
        MA.map.setZoom(5);
    }
    else {
        try {
            var bounds = new google.maps.LatLngBounds();
            if (options.queries.length > 0) {
                $.each(options.queries, function (index, $query) {
                    $.each($query.data('records'), function (index, record) {
                        if (record.marker && (record.isVisible || record.isClustered || record.isScattered)) {
                            bounds.extend(record.marker.getPosition());
                        } else if (record.isPolyline && record.polyline && record.polylineMarkers){
                            record.polylineMarkers.forEach(mrk => {
                                bounds.extend(mrk.getPosition());
                            });
                        }
                    });
                });
            }
            else if (options.polylineLayers.length > 0) {
                $.each(options.polylineLayers, function (index, $polylineLayer) {
                    $.each($polylineLayer.data('records'), function (index, record) {
                        if (record.isPolyline && record.polyline && record.polylineMarkers){
                            record.polylineMarkers.forEach(mrk => {
                                bounds.extend(mrk.getPosition());
                            });
                        }
                    });
                });
            }
            else if (options.dataLayers.length > 0) {
                $.each(options.dataLayers, function (index, $dLayer) {
                    $.each($dLayer.data('markers'), function (index, marker) {
                        bounds.extend(marker.getPosition());
                    });
                });
            } if (options.arcgisLayers.length > 0) {
                $.each(options.arcgisLayers, function (index, $layer) {
                    var layerId = $layer.attr('qid');
                    bounds.union(ArcGIS.getLayerBounds(layerId));
                });
            }
            else {
                //queries
                $('#PlottedQueriesTable .PlottedRowUnit').each(function () {
                    if ($(this).hasClass('ArcGISLayer')) {
                        var layerId = $(this).attr('qid');
                        bounds.union(ArcGIS.getLayerBounds(layerId));
                        // Bounds for all ArcGIS layers were already unioned above.
                    }
                    else if($(this).hasClass('DataLayer')) {
                        $.each($(this).data('markers'), function (index, marker) {
                            bounds.extend(marker.getPosition());
                        });
                    } 
                    else if($(this).data('layerType') === 'polyline') {
                        $.each($(this).data('records'), function (index, record) {
                            if (record.isPolyline && record.polyline && record.polylineMarkers){
                                record.polylineMarkers.forEach(mrk => {
                                    bounds.extend(mrk.getPosition());
                                });
                            }
                        });
                    } 
                    else {
                        //records
                        $.each($(this).data('records'), function (index, record) {
                            if (record.marker && (record.isVisible || record.isClustered || record.isScattered)) {

                                // if(Plotting.mapItZoom != null){
                                //     MA.map.setCenter(record.marker.getPosition())
                                // }
                                //if(!Plotting.mapItZoom){
                                    bounds.extend(record.marker.getPosition());
                                //}
                            }
                        });

                        //distance limit circle
                        if($(this).data('distanceLimitCircle')) {
                            bounds.union($(this).data('distanceLimitCircle').getBounds());
                        }
                    }
                });


                
                //boundary layers
                $('#PlottedQueriesTable .proximity.layer').each(function () {
                    $.each($(this).data('proxObjects') || [], function (index, proxObj) {
                        if (proxObj instanceof google.maps.Polygon) {
                            proxObj.getPath().forEach(function (latlng, i) {
                                bounds.extend(latlng);
                            });
                        }
                        else {
                            bounds.union(proxObj.getBounds());
                        }
                    });
                    if ($(this).data('proxObject')) {
                        if ($(this).data('proxObject') instanceof google.maps.Polygon) {
                            $(this).data('proxObject').getPath().forEach(function (latlng, i) {
                                bounds.extend(latlng);
                            });
                        }
                        else {
                            bounds.union($(this).data('proxObject').getBounds());
                        }
                    }
                });

                //favorite locations
                VueEventBus.$emit('get-favorite-markers', function(layerMarkers) {
                    var layerQIDs = Object.keys(layerMarkers);
                    var layerLength = layerQIDs.length;
                    for (var l = 0; l < layerLength; l++) {
                        var qid = layerQIDs[l];
                        var layer = layerMarkers[qid] || {};
                        var markers = layer.markers || [];
                        markers.forEach(function(marker) {
                            try {
                                var favLatLng = marker.getPosition();
                                bounds.extend(favLatLng);
                            }
                            catch(e){
                                //silent fail
                            }
                        })
                    }
                });

                //shape layers
                function processPoints(geometry, callback, thisArg) {
                    if (geometry instanceof google.maps.LatLng) {
                        callback.call(thisArg, geometry);
                    }
                    else if (geometry instanceof google.maps.Data.Point) {
                        callback.call(thisArg, geometry.get());
                    }
                    else {
                        geometry.getArray().forEach(function(g) { processPoints(g, callback, thisArg); });
                    }
                }
                $('#PlottedQueriesTable .PlottedShapeLayer').each(function () {
                    var $plottedLayer = $(this);
                    if($plottedLayer.data('proxObjects').length > 0) {
                        //this should be a normal shape.
                        try {
                            var shapes = $plottedLayer.data('proxObjects') || [];
                            for(var s = 0; s < shapes.length; s++) {
                                var shape = shapes[s];

                                if (shape instanceof google.maps.Polygon) {
                                    shape.getPath().forEach(function (latlng, i) {
                                        bounds.extend(latlng);
                                    });
                                }
                                else {
                                    bounds.union(shape.getBounds());
                                }
                            }
                        }
                        catch (err) { MA.log('Unable to include data layer in zoom to fit calculation', err); }
                    }
                    else {
                        try {
                            $(this).data('dataLayer').forEach(function (feature) {
                                processPoints(feature.getGeometry(), bounds.extend, bounds);
                            });
                        }
                        catch (err) { MA.log('Unable to include data layer in zoom to fit calculation', err); }
                    }
                });
            }

            if(markers.length > 0) {
                $.each(markers, function (index, marker) {
                    bounds.extend(marker.getPosition());              
                });
            }
            if (!bounds.isEmpty()) {
                MA.map.fitBounds(bounds);
            }

            // zoom to fit route on map
            window.VueEventBus.$emit('zoom-to-fit-route', bounds);
        }
        catch (err) {
            MA.log(err);
        }
    }
}

var MAToastMessages = {
    showMessage : function(options,type) {
        type = type || 'info';
        options = $.extend({
            message : '',
            subMessage : '',
            timeOut : 3000,
            extendedTimeOut : 1000,
            position : 'toast-bottom-right',
            closeButton : false,
            onclick : null
        }, options || {});

        toastr.options.timeOut = options.timeOut;
        toastr.options.extendedTimeOut = options.extendedTimeOut;
        toastr.options.positionClass = options.position;
        toastr.options.closeButton = options.closeButton;
        toastr.options.onclick = options.onclick;
        // decode the substring then encode it
        var decodedMsg = htmlDecode(options.message);
        var decodedSubMsg = htmlDecode(options.subMessage);
        if(type === 'loading') {
            var $message = toastr['info'](htmlEncode(decodedSubMsg), htmlEncode(decodedMsg));
            $message.addClass('ma-toast-loading').removeClass('toast-info');
            return $message;
        }
        else {
            return toastr[type](htmlEncode(decodedSubMsg), htmlEncode(decodedMsg));
        }


    },
    showSuccess : function(options) {
        return MAToastMessages.showMessage(options,'success');
    },
    showLoading : function(options) {
        return MAToastMessages.showMessage(options,'loading');
    },
    showWarning : function(options) {
        return MAToastMessages.showMessage(options,'warning');
    },
    showError : function(options) {
        return MAToastMessages.showMessage(options,'error');
    },
    hideMessage : function (toast) {
        toastr.clear(toast);
        toast.remove();
        toast = null;
    }
}

/* Loadmask Functions */
function showLoading($elementToMask, msg, expirationTimeout, callback)
{
    return showMessage($elementToMask, "<div class='loadmask'></div><div class='loadmask-status'><div class='status'><span class='MA2-loader loader-inline' style='left: 3px;top: -2px;'></span><span>"+msg+"</span></div></div>", (expirationTimeout || false), callback);
}
function showSuccess($elementToMask, msg, expirationTimeout, callback)
{
    return showMessage($elementToMask, "<div class='loadmask'></div><div class='loadmask-status'><div class='status' style='border: 1px solid #28a54c;'><span class='MAIcon ion-checkmark-circled' style='font-size: 24px;color: #28a54c;padding-right: 2px;'></span><span>"+msg+"</span></div></div>", expirationTimeout, callback);
}
function showWarning($elementToMask, msg, expirationTimeout, callback)
{
    return showMessage($elementToMask, "<div class='loadmask'></div><div class='loadmask-status'><div class='status' style='border: 1px solid #e5c130;'><span class='MAIcon ion-alert-circled' style='font-size: 24px;color: #e5c130;padding-right: 2px;'></span><span>"+msg+"</span></div></div>", expirationTimeout, callback);
}
function showError($elementToMask, msg, expirationTimeout, callback)
{
    return showMessage($elementToMask, "<div class='loadmask'></div><div class='loadmask-status'><div class='status' style='border: 1px solid #e42012;'><span class='MAIcon ion-close-circled' style='font-size: 24px;color: #e42012;padding-right: 2px;'></span><span>"+msg+"</span></div></div>", expirationTimeout, callback);
}
function showForm($elementToMask, content, expirationTimeout, callback)
{
    return showMessage($elementToMask, "<div class='loadmask'></div><div class='loadmask-status'><div class='status'>"+content+"</div></div>", (expirationTimeout || false), callback);
}
function showMessage($elementToMask, html, expirationTimeout, callback)
{
    //check if element exists
    try {
        if($elementToMask.length) {
            //remove any existing loadmasks
            $elementToMask.find('.loadmask, .loadmask-status').remove();

            //add new loadmask
            $elementToMask.addClass('loadmask-active').append(html);

            //make sure that the new loadmask is visible by scrolling to it
            if ($(window).scrollTop() > $elementToMask.offset().top) {
                $('html, body').animate({ scrollTop: $elementToMask.offset().top }, "slow");
            }

            //set a timeout to remove this loadmask if the expiration timeout is not false
            if (expirationTimeout !== false)
            {
                setTimeout(function () {

                    //remove the loadmask
                    hideMessage($elementToMask);

                    //fire the callback if we have one
                    if (callback) { callback(); }

                }, (expirationTimeout || 1500));
            }

            return $elementToMask;
        }
        else {
            return $('<div></div>');
        }
    }
    catch(e) {
        return $('<div></div>');
    }
}
function hideMessage($elementToMask)
{
    $elementToMask.removeClass('loadmask-active').find('.loadmask, .loadmask-status').remove();
}

/* Growl Functions */
function growlLoading($growlLocation, msg, expirationTimeout, callback)
{
    return growlMessage($growlLocation, "<div class='growl'><span class='MA2-loader loader-inline' style='left: 3px;top: -2px;'></span><span>"+msg+"</span></div>", (expirationTimeout || false), callback);
}
function growlSuccess($growlLocation, msg, expirationTimeout, callback)
{
    return growlMessage($growlLocation, "<div class='growl' style='border: 1px solid #28a54c;'><span class='MAIcon ion-checkmark-circled' style='font-size: 24px;color: #28a54c;padding-right: 2px;'></span><span>"+msg+"</span></div>", expirationTimeout, callback);
}
function growlWarning($growlLocation, msg, expirationTimeout, callback)
{
    return growlMessage($growlLocation, "<div class='growl' style='border: 1px solid #e5c130;'><span class='MAIcon ion-alert-circled' style='font-size: 24px;color: #e5c130;padding-right: 2px;'></span><span>"+msg+"</span></div>", expirationTimeout, callback);
}
function growlError($growlLocation, msg, expirationTimeout, callback)
{
    return growlMessage($growlLocation, "<div class='growl' style='border: 1px solid #e42012;'><span class='MAIcon ion-close-circled' style='font-size: 24px;color: #e42012;padding-right: 2px;'></span><span>"+msg+"</span></div>", expirationTimeout, callback);
}
function growlMessage($growlLocation, html, expirationTimeout, callback)
{
    //either add the new growl or replace the existing growl depending on whether a growl or a wrapper was passed
    var $growl;
    if ($growlLocation.is('.growl'))
    {
        $growl = $(html).replaceAll($growlLocation);
    }
    else
    {
        $growl = $(html);
        $growlLocation.append($growl);
    }

    //set a timeout to remove this growl if the expiration timeout is not false
    if (expirationTimeout !== false)
    {
        setTimeout(function () {

            //remove the growl
            $growl.remove();

            //fire the callback if we have one
            if (callback) { callback(); }

        }, (expirationTimeout || 1500));
    }

    return $growl;
}

/* Popup Functions */
function launchPopup($popup, settings)
{
    //extend default settings
    settings = $.extend({
        resizable   : false,
        draggable   : false,
        modal       : true,
        minWidth    : '600px',
        minHeight   : 'auto',
        width       : '300px',
        buttons     : {
            'Close': function () {
                hidePopup($popup);
            }
        }
    }, settings);

    //add the fade layer if needed
    if (settings.modal) {
        $('body').append('<div id="fade"></div>');
        $('#fade').css({
            'filter' : 'alpha(opacity=80)',
            'z-index': '1000'
        }).fadeIn();
    }

    //launch editor
    $popup.dialog({
        resizable   : settings.resizable,
        draggable   : settings.draggable,
        width       : settings.width,
        buttons     : settings.buttons
    });

    //try to calculate marginLeft for centering
    var marginLeft = 0;
    try {
        //marginLeft = parseInt(settings.minWidth.replace('px', '')) / 2;
        marginLeft = $popup.dialog('widget').outerWidth() / 2;
    }
    catch (err) { }

    //css for the popup
    $popup.css('min-height', '0').dialog('widget').css({
        minWidth    : settings.minWidth,
        minHeight   : settings.minHeight,
        left        : '50%',
        marginLeft  : '-' + marginLeft + 'px',
        top         : '30px'
    })
        .find('.ui-dialog-titlebar').hide();

    //scroll to top
    $("html, body").animate({ scrollTop: 0 }, "slow");

    //return $popup for chaining
    return $popup;
}

function hidePopup($popup)
{
    $popup.dialog('destroy').hide();
    $('#fade').fadeOut(function() {
        $('#fade').remove();
    });
}

/* String Functions */
function htmlEncode(str)
{
    if(typeof str === 'string') {
        // make sure not to do double encode
        str = htmlDecode(str);
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } 

    return str;
}


function htmlDecode(stringValue) {
	if(typeof stringValue == 'string') {
		if(typeof(document) == 'object') {
			var txt = document.createElement("textarea");
			txt.innerHTML = stringValue;
			return txt.value;
		}
		else
		{
			return String(stringValue)
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, '\'')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');
		}
    }

    return stringValue;
}

/* Namespace Functions */
function addNamespace(namespace, obj)
{
    //if there is no namespace, do nothing
    if (namespace === '') { return obj; }

    //try to add the namespace prefix to each field in the object
    try
    {
        var namespacePrefix = namespace + '__';
        switch (typeof obj)
        {
            case 'string':
                if (obj.indexOf(namespacePrefix) !== 0 && (obj.indexOf('__c', obj.length - 3) != -1 || obj.indexOf('__r', obj.length - 3) != -1)) {
                    obj = namespacePrefix + obj;
                }
                break;
            case 'object':
                $.each(obj, function (key, val) {
                    if (key.indexOf(namespacePrefix) !== 0 && (key.indexOf('__c', key.length - 3) != -1 || key.indexOf('__r', key.length - 3) != -1)) {
                        obj[namespacePrefix + key] = val;
                        delete obj[key];
                    }
                    addNamespace(namespace, val);
                });
                break;
        }
    }
    catch (err) { } //this is most likely due to a null value being passed.  in any case, returning the original objects seems the correct action if we can't manipulate it

    //return the updated obj
    return obj;
}
function removeNamespace(namespace, obj)
{
    try
    {
        var namespacePrefix = namespace + '__';
        $.each(obj, function (key, val) {
            if (key.indexOf(namespacePrefix) === 0) {
                obj[key.replace(namespacePrefix, '')] = val;
                delete obj[key];

                //go recursive if this is an object
                if (obj[key.replace(namespacePrefix, '')] !== null && typeof obj[key.replace(namespacePrefix, '')] == 'object') {
                    removeNamespace(namespace, obj[key.replace(namespacePrefix, '')]);
                }
            }
            else if (typeof val == 'object') {
                removeNamespace(namespace, val);
            }
        });
    }
    catch (err) { } //this is most likely due to a null value being passed.  in any case, returning the original objects seems the correct action if we can't manipulate it

    return obj;
}


/* Grids */
function grid_Search()
{
    var $gridWrapper = $(this).closest('.grid-wrapper');
    var $grid = $gridWrapper.find('.grid-blue');
    var $loadmaskWrapper = $grid.closest('.loadmask-wrapper');

    //clear any existing search timeouts
    try { clearTimeout($gridWrapper.data('searchTimeout')); } catch (err) { }

    //set a loadmask over the grid
    showLoading($loadmaskWrapper, 'Searching...');

    //set a search timeout to perform the search when the user is done setting filters
    $gridWrapper.data(
        'searchTimeout',
        setTimeout(function () {

            //remove existing data for matching records
            $grid.data('matchingRecords', {});

            //perform the search
            var matchCount = 0;
            var matchingRecords = $grid.data('matchingRecords');
            $.each($grid.data('records'), function (id, record) {

                var match = true;

                //text filters
                $('.filter-text').each(function () {
                    if ($(this).val() !== '')
                    {
                        try {
                            if (record[$(this).attr('data-field')].toLowerCase().indexOf($(this).val().toLowerCase()) == -1) {
                                match = false;
                                return false;
                            }
                        }
                        catch (err) { }
                    }
                });
                if (!match) { return; }

                //calendar filters
                $('.filter-calendar').each(function () {
                    if ($(this).val() !== '')
                    {
                        try {
                            if (($(this).is('.end') && Date.parse(record[$(this).attr('data-field')]) > Date.parse($(this).val())) || ($(this).is('.start') && Date.parse(record[$(this).attr('data-field')]) < Date.parse($(this).val()))) {
                                match = false;
                                return false;
                            }
                        }
                        catch (err) { }
                    }
                });
                if (!match) { return; }

                //number filters
                $('.filter-number').each(function () {
                    if ($(this).val() !== '')
                    {
                        try {
                            if (($(this).is('.end') && record[$(this).attr('data-field')] > $(this).val()) || ($(this).is('.start') && record[$(this).attr('data-field')] < $(this).val())) {
                                match = false;
                                return false;
                            }
                        }
                        catch (err) { }
                    }
                });
                if (!match) { return; }

                //if we got this far then it's a match so add a record in memory for this match
                matchingRecords[id] = record;
                matchCount++;

            });

            //hold on to the match count for user later
            $grid.data('matchingRecordsCount', matchCount);

            //show page options
            $gridWrapper.find('.grid-page option').remove();
            for (var i = 1; i <= Math.ceil(matchCount / $grid.data('pageSize')); i++)
            {
                $gridWrapper.find('.grid-page').append("<option value='"+i+"'>"+i+"</option>");
            }

            //remove the loadmask
            hideMessage($loadmaskWrapper);

            //load the first page of data
            $gridWrapper.find('.grid-page').change();

        }, 800)
    );
}
function formatUserLocaleDate (options)
{
    //grab salesforce user locale object (capitalize dates for easy modification)
    var returnFormat;

    //format the locale for proper use
    if(options.moment === true)
    {
        //moment formating (DD/MM/YYYY HH:mm, MM-DD-YYYY h:mm a, etc...)
        returnFormat = MASystem.User.dateTimeFormat.replace('yyyy','YYYY').replace(/d/g,'D');
    }
    else if (options.datepicker === true)
    {
        //date picker format (dd/mm/yy, mm-dd-yy, etc...)
        returnFormat = MASystem.User.dateFormat.replace('yyyy','yy');
        //check for 'M' or 'MM'
        if(MASystem.User.dateFormat.indexOf('MM') >= 0)
        {
            returnFormat = returnFormat.replace('MM','mm');
        }
        else
        {
            returnFormat = returnFormat.replace('M','mm');
        }

        //check for 'd' or 'dd'
        if(MASystem.User.dateFormat.indexOf('dd') <= -1)
        {
            returnFormat = returnFormat.replace('d','dd');
        }
    }
    else if (options.salesforce === true)
    {
        //already in sForce format
        returnFormat = MASystem.User.dateTimeFormat;
    }
    else if (options.date)
    {
        //replace date format with actual date
        returnFormat = MASystem.User.dateTimeFormat.replace('y.', 'y').replace('M.', '').replace('d.', '').replace(/M/g, '').replace(/\//g, '').replace(/-/g,'').replace(/d/g, '').replace('yyyy', options.date)
    }
    else if (options.time)
    {
        returnFormat = MASystem.User.timeFormat;
    }

    return returnFormat;
}

function ChangeVisibilityWhenCircleIsAdded(options)
{

    //default options
    options = $.extend({
        force: false,
        keepRelatedShapes : false
    }, options || {});
    var keepRelatedShapes = options.keepRelatedShapes;

    MA.log('Running ChangeVisibilityWhenCircleIsAdded');

    //rebuild hit test shape manager
    MA.Map.hitTestShapeMgr = new MA.Map.ShapeManager();
    $('#PlottedQueriesTable .layer.proximity, #PlottedQueriesTable .PlottedShapeLayer').each(function () {
        var $layer = $(this);
        if ($layer.find('.affectvisibility').is(':checked')) {
            if ($layer.data('dataLayer')) {
                MA.Map.hitTestShapeMgr.addLayer($layer.data('dataLayer'));
            }
            if ($layer.data('kmlLayer')) {
                /* Look Here */
            }
            if ($layer.data('proxObject')) {
                MA.Map.hitTestShapeMgr.addLayer($layer.data('proxObject'));
            }
            if ($layer.data('proxObjects') && $layer.data('proxObjects').length > 0) {
                //loop over all prox objects and add
                var proxObjects = $layer.data('proxObjects');
                for(var pp = 0; pp < proxObjects.length; pp++) {
                    var proxObject = proxObjects[pp];
                    MA.Map.hitTestShapeMgr.addLayer(proxObject);
                }

            }
        }
    });
    $('#PlottedQueriesTable .PlottedRowUnit').each(function () {
        var $plottedQuery = $(this);
        /*
         if ($plottedQuery.data('proximityOptions').enabled && $plottedQuery.data('proximityOptions').affectVisibility) {
         $.each($plottedQuery.data('proximityObjects'), function (index, proxObject) {
         if (proxObject.getMap() != null) {
         MA.Map.hitTestShapeMgr.addLayer(proxObject);
         }
         });
         }
         */

        //Updated code from the above to solve case 00006097
        if ($plottedQuery.data('proximityOptions') && String($plottedQuery.data('proximityOptions').enabled).trim() === 'true' && String($plottedQuery.data('proximityOptions').affectVisibility).trim() === 'true') {
            $.each($plottedQuery.data('proximityObjects'), function (index, proxObject) {
                if (proxObject.getMap() != null) {
                    MA.Map.hitTestShapeMgr.addLayer(proxObject);
                }
            });
        }

    });

    //this is special just for the mobile page.  it can go away later
    try {
        if (pc_Added) {
            try {
                MA.Map.hitTestShapeMgr.addLayer(ProximityCircle);
            }
            catch (err) {
                try {
                    $.each(ProximityCircle, function (index, proxObject) {
                        MA.Map.hitTestShapeMgr.addLayer(proxObject);
                    });
                }
                catch (err) { }
            }
        }
    }
    catch (err) { }

    //if there aren't any records in the MA.Map.hitTestShapeMgr.shapes array, then we don't need to touch the queries
    //this will not remove the markers when the checkbox is unchecked... have to force on uncheck.
    if (MA.Map.hitTestShapeMgr.shapes.length > 0 || options.force)
    {

        //loop over each plotted query
        $('#PlottedQueriesTable .PlottedRowUnit').each(function () {
            var $plottedQuery = $(this);
            if(!$plottedQuery.hasClass('DataLayer')) {
                //determine which modes need to be rerendered
                $plottedQuery.addClass('unloading');

                //$plottedQuery.data('visibility-affected', true);

                var modesToRerender = [];
                if ($plottedQuery.find('.renderButtons-button.markers').is('.on')) { modesToRerender.push('Markers'); }
                if ($plottedQuery.find('.renderButtons-button.cluster').is('.on')) { modesToRerender.push('Cluster'); }
                if ($plottedQuery.find('.renderButtons-button.scatter').is('.on')) { modesToRerender.push('Scatter'); }
                const isPolylineLayer = $plottedQuery.data('options').layerType === 'polyline';

                //rerender this query as needed
                var queryProximityEnabled = ($plottedQuery.data('proximityOptions') && ($plottedQuery.data('proximityOptions').enabled == 'true'));
                if (!queryProximityEnabled && (modesToRerender.length > 0 || isPolylineLayer)) {
                    Plotting.unrenderQuery($plottedQuery,{modes:modesToRerender,keepRelatedShapes:keepRelatedShapes},function(res) {
                        Plotting.renderQueryV2($plottedQuery,modesToRerender,function(res) {
                            Plotting.updateQueryInfo($plottedQuery,function() {
                                $plottedQuery.removeClass('unloading loading');
                                $plottedQuery.find('.queryIcon').show();
                                $plottedQuery.find('.queryError').hide();
                                $plottedQuery.find('.queryLoader, .loading-icon').hide();
                            });
                        });
                    });
                }
                else
                {
                    //nothing to rerender
                    $plottedQuery.removeClass('unloading');
                }
            }
            else {
                var renderModes = MADemographicLayer.getRenderModes($plottedQuery);
                MADemographicLayer.unrenderDataLayer($plottedQuery,{modes:renderModes},function() {
                    //refresh the query
                    MADemographicLayer.rerenderDataLayer($plottedQuery,{renderModes:renderModes},function(res) {});
                });
            }

        }); //end of $('#PlottedQueriesContainer .PlottedRowUnit')
    }

    //CASE 00010062: Show the tab again.
    //$('#listview-accesstab').addClass('show-lv-accesstab');
    if (!MA.isMobile) {
        MAListView.FixListViewTab();
    }

    /* This is causing some issues and it's going to run too soon anyway (before query rendering is complete) so I'm removing it for now
     visibilityUpdating = false;
     if (visibilityQueued) {
     ChangeVisibilityWhenCircleIsAdded();
     }
     */
}

var imgLoaderDimensions = {};
var imgLoaderCounts = {};
var imgLoaderIntervals = {};
function imgLoaded ()
{
    imgLoaderCounts[this.queryId] = imgLoaderCounts[this.queryId] - 1;
    imgLoaderDimensions[this.imgId] = {
        width   : this.width,
        height  : this.height,
        imgURL  : this.src
    };
}
function imgError ()
{
    //imgLoaderCounts[this.queryId] = imgLoaderCounts[this.queryId] - 1;
    //check if this is an external image
    var img = new Image();
    img.queryId = this.queryId;
    img.imgId = this.imgId;
    img.name = MA.SitePrefix+'/servlet/servlet.ImageServer?id='+this.imgId+'&oid='+orgId;
    img.src = MA.SitePrefix+'/servlet/servlet.ImageServer?id='+this.imgId+'&oid='+orgId;
    img.onload = checkExternalSuccess;
    img.onerror = checkExternalFail;
    img.onabort = checkExternalFail;

}
function checkExternalFail () {
    //lets give this image a marker so something appears on the map
    imgLoaderCounts[this.queryId] = imgLoaderCounts[this.queryId] - 1;
    imgLoaderDimensions[this.imgId] = {
        hasErrors : true,
        width   : 31,
        height  : 41,
        imgURL : MASystem.Images.pin_error
    };
}
function checkExternalSuccess () {
    imgLoaderCounts[this.queryId] = imgLoaderCounts[this.queryId] - 1;
    imgLoaderDimensions[this.imgId] = {
        width   : this.width,
        height  : this.height,
        imgURL  : this.src
    };
}

//modifying function to support lookup links for all types (date, boolean ect..)
function formatTooltip(obj, toolTipObj, noLinks, forcePlainText)
{
    var newWindow = getProperty(MASystem.Organization,'LightningNewWindow',false); // took off || statement because it always resulted to true due to comparison check..
    var polyObject = toolTipObj.polymorphicField && obj.polyObjectField ? obj.polyObjectField + '.' : '';
    var ActualFieldNameTemp = polyObject + toolTipObj.ActualFieldName;

    if(toolTipObj.needsLink) {
        //leaving the above reference for now
        var rId;
        var linkId = getProperty(toolTipObj || {}, 'linkId', false);
        if (linkId && linkId.indexOf('.') > -1) {
            // assuming this is a lookup, Owner.Fullname, need to grab the value off the record
            linkId = polyObject + linkId;
            rId = getProperty(obj, linkId);
        } else {
            // not a lookup, if we have a linkId it should just be the Id
            rId = linkId;
        }
        var rName = getProperty(obj, ActualFieldNameTemp);
        if (rId == undefined || rName == undefined)
        {
            return '';
        }
        else {
            if(noLinks) {
                return rName;
            }
            else {
                var isCommunity = getProperty(MA || {}, 'IsCommunity', false) || false;
                var isSF1 = typeof(sforce) != 'undefined' && typeof(sforce.one) != 'undefined';             
                
                //open in new window?
                if(!newWindow && isSF1 && !isCommunity) {
                    return '<a onclick="event.stopPropagation();" target="_self" href="/' + rId + '">' + rName + '</a>';
                }
                else {
                    var communityURL = getProperty(MA || {}, 'CommunityBaseUrl', false) || '';
                    return '<a onclick="event.stopPropagation();" target="_blank" href="' + communityURL + '/' + rId + '">' + rName + '</a>';
                }
            }
        }
    }
    else
    {
        var fieldValue = getProperty(obj, ActualFieldNameTemp);
        var returnValue = fieldValue;
        var formattedValue = fieldValue;
        if (fieldValue == undefined)
        {
            if (toolTipObj.describe.soapType.toLowerCase().indexOf('boolean') > -1)
            {
                formattedValue = 'False';
            }
            else
            {
                formattedValue = '';
            }
        }
        else
        {
            if (toolTipObj.describe.soapType.toLowerCase().indexOf('string') > -1)
            {

                //check if hyperlink formula field
                try {
                    //security changes to encode everything causing double encoding for certain types
                    var is_htmlFormatted = getProperty(toolTipObj,'describe.htmlFormatted') || false;
                    var isURL = getProperty(toolTipObj,'describe.type');
                    var isImgTag = fieldValue.slice(0, 7).indexOf('&lt;img') > -1;
                    var displayType = getProperty(toolTipObj,'DisplayType',false) || '';
                    if(displayType.toLowerCase() == 'picklist') {
                        //translate the value into a label
                        var picklistOptions = getProperty(toolTipObj,'describe.picklistValues',false) || [];
                        for(var i = 0; i < picklistOptions.length; i++) {
                            var opt = picklistOptions[i];
                            if(opt.value == fieldValue) {
                                fieldValue = opt.label || opt.value;
                                break;
                            }
                        }
                        formattedValue = htmlEncode(fieldValue);
                    }
                    else if (displayType.toLowerCase() === 'phone') {
                        formattedValue = (forcePlainText) ? fieldValue : C2D.c2dHtmlNumber(fieldValue, obj.Id);
                    }
                    else if((displayType.toLowerCase() == 'string' || displayType.toLowerCase() == 'textarea') && isImgTag){                        decodedTag = function(str){
                            return String(str)
                                .replace(/&lt;/g, '<')
                                .replace(/&quot;/g, '"')
                                .replace(/&amp;/g, '&')
                                .replace(/%32/g, '=')
                                .replace(/&quot;/g, '"')
                                .replace(/&gt;/g, '>');
                        }(fieldValue);
                        formattedValue = decodedTag;
                        formattedValue = formattedValue.replace('></img>', ' />');
                    }
                    else if (displayType.toLowerCase() == 'multipicklist') {
                        var splitValue = fieldValue.split(';');
                        var picklistOptions = getProperty(toolTipObj,'describe.picklistValues',false) || [];
                        var convertedParts = [];
                        for(var f = 0; f < splitValue.length; f ++) {
                            var thisValue = splitValue[f];
                            //loop over picklist options
                            var foundMatch = false;
                            for(var i = 0; i < picklistOptions.length; i++) {
                                var opt = picklistOptions[i];
                                if(opt.value == thisValue) {
                                    var foundValue = opt.label || opt.value;
                                    convertedParts.push(htmlEncode(foundValue));
                                    foundMatch = true;
                                    break;
                                }
                            }
                            if(!foundMatch) {
                                convertedParts.push(htmlEncode(thisValue));
                            }
                        }

                        formattedValue = convertedParts.join(';');
                    }
                    else if(isURL != undefined && isURL.indexOf('url') > -1) {
                        var decodedFieldValue = htmlDecode(htmlDecode(fieldValue));
                        var lowerCaseValue = (typeof decodedFieldValue == 'string') ? decodedFieldValue.toLowerCase() : '';
                        toolTipObj.forceLink = false;
                        //does this url have http or https
                        if(lowerCaseValue.indexOf('http://') != 0 && lowerCaseValue.indexOf('https://') != 0) {
                            decodedFieldValue = 'http://' + decodedFieldValue
                        }
                        if(noLinks) {
                            //MAP-3919, list view sorting was using html not raw value
                            formattedValue = decodedFieldValue;
                        }
                        else if(!newWindow && typeof(sforce) != 'undefined' && typeof(sforce.one) != 'undefined') {
                            formattedValue =  '<a style="color:#0094D2;cursor:pointer;" onclick="sforce.one.navigateToURL(\''+htmlEncode(decodedFieldValue)+'\')">' + htmlEncode(decodedFieldValue) + '</a>';
                        }
                        else {
                            formattedValue =  '<a onclick="event.stopPropagation();" target="_blank" href="' + htmlEncode(decodedFieldValue) + '">' + htmlEncode(decodedFieldValue) + '</a>';
                        }
                    }
                    else if (is_htmlFormatted) {
                        fieldValue = htmlDecode(fieldValue);
                        toolTipObj.forceLink = false;
                        formattedValue = fieldValue;
                    }
                    else {

                        formattedValue = htmlEncode(fieldValue);
                    }
                }
                catch (e) {

                    formattedValue = htmlEncode(fieldValue);
                }
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('boolean') > -1)
            {
                formattedValue = String(fieldValue);
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('address') > -1)
            {
                //this comes back as an object, but check to make sure
                if(typeof(fieldValue) == 'object') {
                    //define our options
                    var addressParts = [fieldValue.street,fieldValue.city,fieldValue.state,fieldValue.postalCode,fieldValue.country];
                    var formattedAddressParts = [];
                    for(var i = 0;i < addressParts.length; i++) {
                        var part = addressParts[i];
                        if(part != undefined) {
                            formattedAddressParts.push(htmlEncode(part));
                        }
                    }

                    var [userLocale, userCountry] = MASystem.User.UserLocale.split('_');
                    localeFormattedValue = window.globalAddressFormatter.formatAddress(userLocale, userCountry, {
                        address: fieldValue.street ?? "",
                        country:fieldValue.country ?? "",
                        city: fieldValue.city ?? "",
                        state: fieldValue.state ?? "",
                        zipCode: fieldValue.postalCode ?? ""
                    },', ');

                    formattedValue = localeFormattedValue || formattedAddressParts.join(', ');
                }
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('datetime') > -1)
            {
                //need formating
                if(fieldValue === '')
                {
                    formattedValue = '';
                }
                else if(typeof fieldValue == 'number') {
                    //var normalizedDateTime = MA.Util.normalizeDateTime(fieldValue);
                    var normalizedDateTime = fieldValue;

                    /*
                     * Only Event objects have the IsAllDayEvent property, and they
                     * are currently the only objects that need modification anyway.
                     * RJH - Case 10816: [https://na8.salesforce.com/500C0000012F2Yq]
                     */

                    var tzInMinutes = (+MASystem.User.timeZoneOffset) / 60000;
                    if(obj.IsAllDayEvent) {
                        //if all day event don't apply any time zone stuff, no time needed
                        formattedValue = moment.utc(fieldValue).utcOffset(0).format(MASystem.User.dateFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                    }
                    else {
                        //check if moment timezones matches
                        if(moment.tz.zone(MASystem.User.timezoneId) != null) {
                            formattedValue = moment.tz(normalizedDateTime,MASystem.User.timezoneId).format(MASystem.User.dateTimeFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                        }
                        else {
                            //fallback to no tz... fails on day light savings
                            formattedValue = moment.utc(normalizedDateTime).utcOffset(tzInMinutes).format(MASystem.User.dateTimeFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                        }
                    }
                    //return moment.utc(normalizedDateTime).format(MASystem.User.dateTimeFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                }
                else {
                    formattedValue = moment(fieldValue,'YYYY-MM-DD').format(MASystem.User.dateTimeFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                }

            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('date') > -1)
            {
                //need formating
                if(typeof fieldValue == 'number') {
                    var normalizedDateTime = fieldValue;
                    //case 00012057, removing the timezone offset (dates are a day behind)
                    //still have timezone issues, defaulting to user SF timezone for dates as well, case 00015175
                    //things to consider, all day events, australia +12 -12 hrs etc.
                    formattedValue = moment.utc(fieldValue).utcOffset(0).format(MASystem.User.dateFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                }
                else {
                    formattedValue = moment(fieldValue,'YYYY-MM-DD').format(MASystem.User.dateFormat.replace(/d/g,'D').replace('yyyy','YYYY'));
                }

            } else if (toolTipObj.describe.soapType.toLowerCase().indexOf('time') > -1) {
                if (isNaN(fieldValue)) {
                    formattedValue = moment(fieldValue, MASystem.User.timeFormat).format(MASystem.User.timeFormat);
                }
                else {
                    formattedValue = moment.utc(fieldValue, 'x').format(MASystem.User.timeFormat);
                }
            } else if (toolTipObj.describe.soapType.toLowerCase().indexOf('xsd:time') > -1) {
                formattedValue = moment.utc(fieldValue).format(MASystem.User.timeFormat);
            }
            else if(toolTipObj.DisplayType.toLowerCase().indexOf('currency') > -1){
                //If we are using multiple currencies, we have to get the currency from the userSettings.
                var recordIso = obj.CurrencyIsoCode ? obj.CurrencyIsoCode : userSettings.userCurrency;

                return formattedValue = formatCurrency(fieldValue, toolTipObj, recordIso);
            }
            else if(toolTipObj.describe.type && toolTipObj.describe.type.toLowerCase().indexOf('percent') > -1){
                //grab the lat lng from object and parse
                try {
                    var localeTag = getProperty(MASystem, 'Organization.defaultOrgLocale', false) || 'en_US';
                    localeTag = localeTag.replace('_', '-');
                    var fieldParts = String(fieldValue).split('.');
                    var scale = 0;
                    // scale has a possibility to be 0 which is a falsy statement so we are checking if property exists
                    if (String(getProperty(toolTipObj,'describe.scale')) !== 'undefined') {
                        scale = toolTipObj.describe.scale;
                    }
                    else if (fieldParts.length > 1) {
                        scale = fieldParts[1].length
                    }
                    // toLocaleString expects a decimal, SF is passing a whole number
                    fieldValue = fieldValue / 100;
                    // not sure if this if statement is needed because field values 
                    // come back as numbers and this if statement blocks formatting
                    // if (Number.isNaN(fieldValue)) {
                        formattedValue = Number(fieldValue).toLocaleString(localeTag, {style: 'percent', minimumFractionDigits: scale, maximumFractionDigits: scale });
                        formattedValue.toString();
                    // }
                } catch (e) {
                    formattedValue = fieldValue;
                }
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('double') > -1 && !toolTipObj.DisplayType.toLowerCase().indexOf('currency') > -1)
            {
                // Had to add specification to exclude currency, as currency is handled above.
                // make sure c is not longer than the actual length of the decimal
                var fieldParts = String(fieldValue).split('.');
                var c;
                // scale has a possibility to be 0 which is a falsy statement so we are checking if property exists
                if(String(getProperty(toolTipObj,'describe.scale')) !== 'undefined') {
                    c = toolTipObj.describe.scale;
                }
                else if(fieldParts.length>1) {
                    c = fieldParts[1].length
                }
                var n = fieldValue,
                    c = isNaN(c = Math.abs(c)) ? 0 : c,
                    d = d == undefined ? "." : d,
                    t = t == undefined ? "," : t,
                    s = n < 0 ? "-" : "",
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
                    j = (j = i.length) > 3 ? j % 3 : 0;
                formattedValue = s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
                if (String(fieldValue).length < String(formattedValue).length) {
                    // SFCF-192 limiting precision if SF is rounding the number when returned from database
                    if (fieldParts[1]) {
                        c = fieldParts[1].length
                    }
                    formattedValue = s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
                }

            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('integer') > -1 || toolTipObj.describe.soapType.toLowerCase().indexOf('int') > -1)
            {
                var fieldParts = String(fieldValue).split('.');
                var c;
                if(toolTipObj.describe.scale) {
                    c = toolTipObj.describe.scale;
                }
                else if(fieldParts.length>1) {
                    c = fieldParts[1].length
                }
                var n = fieldValue,
                    c = isNaN(c = Math.abs(c)) ? null : c,
                    d = d == undefined ? "." : d,
                    t = t == undefined ? "," : t,
                    s = n < 0 ? "-" : "",
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
                    j = (j = i.length) > 3 ? j % 3 : 0;
                formattedValue = s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
            }
            else if(toolTipObj.describe.soapType.toLowerCase().indexOf('location') > -1){
                //grab the lat lng from object and parse
                var latString = '';
                var lngString = '';
                if(typeof fieldValue === 'object') {
                    latString = fieldValue.latitude || '';
                    lngString = fieldValue.longitude || '';
                }
                formattedValue = 'Latitude: ' + htmlEncode(latString) + '<br>Longitude: ' + htmlEncode(lngString);

            }
            else
            {

                formattedValue = fieldValue;//Changed the output to be unescaped for case 15106
            }

        }

        if(toolTipObj.forceLink && !noLinks) {
            if(rId === undefined) {
                return formattedValue;
            }
            else if(!newWindow && typeof(sforce) != 'undefined' && typeof(sforce.one) != 'undefined') {
                return '<a onclick="event.stopPropagation();" target="_self" href="/' + rId + '">' + formattedValue + '</a>';
            }
            else {
                return '<a onclick="event.stopPropagation();" target="_blank" href="/' + rId + '">' + formattedValue + '</a>';
            }
        }
        else {
            return formattedValue;
        }
    }


}




function getProperty(obj, prop, removeWorkspace)
{
    prop = prop || '';

    if(removeWorkspace !== false)
    {
        //needed when working in our packaging org(s)
        if ( MA.Namespace == 'maps')
        {
            obj = MA.Util.removeNamespace(obj,'maps__');

            //remove from string prop as well
            prop = prop.replace(/maps__/g,'');
        }
    }

    var arr = prop.split(".");
    while(arr.length && (obj = obj[arr.shift()]));
    return obj;
}

function grid_UpdatePage()
{
    var $gridWrapper = $(this).closest('.grid-wrapper');
    var $grid = $gridWrapper.find('.grid-blue');

    //set a loadmask over the grid
    var $loadingMessage;
    if(MA.isMobile) {
        $loadingMessage = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis});
    }
    else {
        showLoading($gridWrapper, MASystem.Labels.MA_Loading_With_Ellipsis);
    }

    //remove existing rows
    $grid.find('.grid-row').remove();

    //calculate start and end points for this page
    var recordStart = ($(this).val() - 1) * $grid.data('pageSize') + 1;
    var recordEnd = recordStart + $grid.data('pageSize') - 1;

    //loop over our matching records and add those that belong on this page
    var index = 1;
    $.each($grid.data('matchingRecords'), function (id, record) {

        //add a row for this record if we're past the starting point for this page
        if (recordStart <= index)
        {
            //add row
            var $row = $grid.data('populateRow').call($grid, $grid.data('rowTemplate').clone().addClass('grid-row').data('record', record));
            $grid.append($row);
        }

        //increment our index and stop looping if we're past the endpoint for this page
        index++;
        if (recordEnd < index) { return false; }
    });

    //update page info
    $gridWrapper.find('.grid-pageinfo').text('Displaying ' + Math.max(recordStart, 0) + ' - ' + Math.min(recordEnd, $grid.data('matchingRecordsCount')) + ' of ' + $grid.data('matchingRecordsCount'));

    //remove the loadmask over the grid
    if(MA.isMobile) {
        MAToastMessages.hideMessage($loadingMessage);
    }
    else {
        hideMessage($gridWrapper);
    }
}


var unitFactors = {
    'MILES': { 'METERS': 1609.344, 'MILES': 1, 'KM': 1.60934, 'MI': 1},
    'KM': { 'METERS': 1000, 'KM': 1, 'MILES': 0.621371, 'MI': 0.621371 },
    'METERS': { 'METERS': 1, "MILES" : 0.000621371, "MI" : 0.000621371, "YARDS" : 1.09361, "FEET" : 3.28084, "KM" : 0.001},
    'YARDS': { 'METERS': 0.9144, 'YARDS':1, },
    'FEET': { 'METERS': 0.3048 },
    'HOURS': { 'SECONDS': 3600, 'MINUTES':60, 'HOURS':1},
    'MINUTES': { 'SECONDS': 60, 'MINUTES':1, 'HOURS':1/60},
    'SECONDS': {'SECONDS':1, 'MINUTES':1/60, 'MILLISECONDS':1000},
};

function removeProximityLayer($proxLayer, options)
{
    //default options
    var dfd = $.Deferred();

    //remove label if present
    if($proxLayer.data('marker')) {
        var marker = $proxLayer.data('marker');
        marker.setMap(null);
    }

    //unrender the prox layer
    unrenderProximityLayer($proxLayer).then(function() {
        //remove the prox layer from the layers section
        if (MA.isMobile) {
            $proxLayer.remove();
        }
        dfd.resolve();
    });
    return dfd.promise();
}

function unrenderProximityLayer($proxLayer)
{
    var dfd = $.Deferred();
    try { $proxLayer.data('dataLayer').setMap(null); } catch (err) {}
    try { $proxLayer.data('kmlLayer').hideDocument(); } catch (err) {}
    try { $proxLayer.data('proxObject').centerPoint.setMap(null); } catch (err) {} // remove the centerPoint marker for boundaries that may have a centerPoint on it.
    try { $proxLayer.data('proxObject').setMap(null); } catch (err) {}
    try { $.each($proxLayer.data('proxObjects'), function (i, proxObject) { try{proxObject.centerPoint.setMap(null);}catch(e){} proxObject.setMap(null); }); } catch (err) {}
    try
    {
        if ($proxLayer.data('labelmarkers'))
        {
            var markers = $proxLayer.data('labelmarkers');

            for (var i = 0; i < markers.length; i++)
            {
                markers[i].setMap(null);
            }
        }
    }
    catch (err) {}
    $proxLayer.removeData();
    MA.Map.InfoBubble.hide();

    if($proxLayer.find('.affectvisibility').is(':checked')) {
        ChangeVisibilityWhenCircleIsAdded({ force: true, keepRelatedShapes: true });
    }
    MAShapeLayer.UpdateNeedMarkerBoundingEvents();
    dfd.resolve();
    return dfd.promise();
}

function createBoundaryLayerDom(options) {
    var dfd = $.Deferred();
    options.component = 'BoundaryLayer';
    window.VueEventBus.$emit('add-layer', options, function(BoundaryLayerRef) {
        var $proxLayer = $(BoundaryLayerRef);
        $proxLayer.data('qid', options.qid);
        $proxLayer.attr('qid', options.qid);
        $proxLayer.attr('data-id', options.qid);
        $proxLayer.data('id', options.qid);
        dfd.resolve($proxLayer);
    });

    return dfd.promise();
}

function addProximityLayer(options)
{
    var dfd = $.Deferred();
    options = $.extend({
        fillColor: '#3083d3',
        borderColor: '#16325C',
        colorOptions : {
            fillColor : '#3083d3',
            borderColor : '#16325C',
            fillOpacity : 0.6
        },
        affectVisible : false,
        type: 'boundary'
    }, options);
     //Add a unique ID to the attributes when the shape is plotted
    //this links to the listview table that can be viewed.
    var qid = new Date().getTime() + 'prox';
    options.id = qid;
    options.qid = qid;
    Plotting.plottedIds[qid] = options;
    //add a prox layer
    createBoundaryLayerDom(options).then(function(proxLayer) {
        var $proxLayer = proxLayer;

        $proxLayer.on('mouseenter','.drop-menu-wrapper',function(event) {
            var $button = $(this);
            var menuItemPos = $button.position();
            //get position to show menu
            var topPos = menuItemPos.top + 25; //+25px for button size

            $proxLayer.find('.prox-menu-visibility').css('top',topPos);
            $proxLayer.find('.plotted-visibile-icon, .prox-menu-visibility').addClass('active');

            var $menu = $button.find('.drop-down-menu');
            var menuOff = $menu.offset();
            var menuHeight = $menu.height();
            //check the menu height and offset
            var totalMenu = menuOff.top + menuHeight;

            //get the map dimensions
            var $container = $('#mapcontainer');
            var containerOff = $container.offset();
            var containerHeight = $container.height();
            var containerTotal = containerOff.top + containerHeight;

            //appears offscreen
            if(totalMenu >= containerTotal) {
                //place the menu on the bottom of the container
                topPos = menuItemPos.top - menuHeight;
                $menu.css('top',topPos);
            }
        });
        $proxLayer.on('mouseleave','.drop-menu-wrapper',function(event) {
            $('.drop-down-menu, .btn-lg').removeClass('active');
        });

        // this is still handled with jquery, not vue (TODO)
        // all layers have the same jquery listener
        if(options.affectVisible) {
            $proxLayer.find('.affectvisibility ').prop('checked',true);
        }

        dfd.resolve($proxLayer);
    });
    return dfd.promise();
}

function RemoveMarkerDesktop(record, options, isLastRecord)
{
    options = $.extend({ updateQueryInfo: true }, options);

    //keep track of record info
    var $plottedQuery = record.plottedQuery;

    //check if live
    if(record.isLiveRecord) {
        Plotting.removeDeviceHistory(record);
        //return;
    }

    //delete record
    delete $plottedQuery.data('records')[record.Id];

    //remove any markers from the map
    if ($plottedQuery.find('.renderButtons-button.markers').is('.on') && record.marker && record.isVisible) {
        // record.marker.setMap(null);
        if(isLastRecord) {
            $plottedQuery.data('macluster_marker').removeMarker(record.marker, false);
        } else {
            $plottedQuery.data('macluster_marker').removeMarker(record.marker, true);
        }
    }
    if ($plottedQuery.find('.renderButtons-button.cluster').is('.on') && record.clusterMarker && record.isClustered) {
        $plottedQuery.data('macluster_cluster').removeMarker(record.clusterMarker);
    }
    if ($plottedQuery.find('.renderButtons-button.scatter').is('.on') && record.scatterMarker && record.isScattered) {
        // record.scatterMarker.setMap(null);
        $plottedQuery.data('macluster_scatter').removeMarker(record.scatterMarker);
    }

    if (options.updateQueryInfo) {
        Plotting.updateQueryInfo($plottedQuery);

        //refresh the data in the listview
        try {
            MAListView.DrawTab({ layerId: record.qid, isSelectedTab: false, isExport: false });
        }
        catch (e) {
        }
    }

    //listview stuff
    if( $plottedQuery.data().hasOwnProperty('recordList') ) {
        var popIndexes = [];

        var recordList = $plottedQuery.data('recordList') || [];
        var index = recordList.length;
        while(index--) {
            var recordId = recordList[index];
            if(recordId === record.Id) {
                $plottedQuery.data('recordList').splice(index,1);
                break;
            }
        }
    }

}


//Created a global variable to enable access to the changeOwner__end function.
var storedNewOwner = {};

function ChangeOwner_Finish(req)
{
    var changeOwnerStats = {
        batchCount: 0,
        failureCount: 0,
        errorArr: [],
        successCount: 0,
    };
    //show loading
    
    var changeOwnerMessage = MAToastMessages.showLoading({message:MASystem.Labels.Change_Owner_Status,subMessage:MASystem.Labels.Change_Owner_Updating_Records,timeOut:0,extendedTimeOut:0});
    if(MA.isMobile) {
        MALayers.hideModal();
    }
    showLoading(changeOwnerStats, MASystem.Labels.Change_Owner_Updating_Records);
    
    
    //grab all records and create a batchable array
    var recArray = $('#ChangeOwnerPopup').data('recordIds') || req.records || [];
    var batchableArray;
    var recIdArray = [];
    var idToQid = {};
    for(var rid = 0; rid < recArray.length; rid++) {
        var currentRec = recArray[rid];
        recIdArray.push(currentRec.Id);
        idToQid[currentRec.Id] = [...(idToQid[currentRec.Id] || []), currentRec.qid]
    }
    batchableArray = MA.Util.createBatchable(recIdArray,MASystem.MergeFields.MassFieldUpdateScopeSize);

    var errorHTML = '<table style="table-layout:fixed;" class="slds-table slds-table_bordered slds-table_cell-buffer">';

    //create our que
    var recQue = async.queue(function (options, callback) {
        var updateOptions = {};
        var layers = [];
        const plottedLayers = document.querySelectorAll('#PlottedQueriesContainer .PlottedRowUnit');
        var tooltipQueryFields = {};
        plottedLayers.forEach((layer) => {
            const filteredKeys = Object.keys(layer).filter(key => key.indexOf('jQuery') !== -1 && layer[key].records);
            filteredKeys.forEach((key) => {
                var boName = layer[key].options.baseObjectName;
                tooltipQueryFields[boName] = tooltipQueryFields[boName] || [];
                layer[key].tooltips.forEach(tooltip => {
                    tooltipQueryFields[boName].push(tooltip.FieldName);
                });

                layers.push({
                    qid: layer[key].qid,
                    records: layer[key].records,
                    tooltips: layer[key].tooltips
                });
            });
        });
        if(MA.isMobile){
            updateOptions = {
                ajaxResource        : 'TooltipAJAXResources',
                action              : 'change_owner',
                ownerId             : storedNewOwner.Id,
                transferNotes       : $('#changeowner-notes').is(':checked'),
                transferAttachments : $('#changeowner-attachments').is(':checked'),
                transferTasks       : $('#changeowner-tasks').is(':checked'),
                transferEvents      : $('#changeowner-events').is(':checked'),
                serializedRecordIds : options.recordIds
            };
        } else if (req) {
            updateOptions = {
                ajaxResource        : 'TooltipAJAXResources',
                action              : 'change_owner',
                ownerId             : req.ownerId,
                transferNotes       : req.transferNotes,
                transferAttachments : req.transferAttachments,
                transferTasks       : req.transferTasks,
                transferEvents      : req.transferEvents,
                serializedRecordIds : options.recordIds,
                tooltips: JSON.stringify(tooltipQueryFields)
            }
        }
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            updateOptions,
            function(response, event){
                if(event.status)
                {
                    if (response.success)
                    {
                        var failures = 0;
                        //count the number of successful/failed responses
                        var errorRow = '';

                        $.each(response.results, function (index, result) {
                            if (result.success) {
                                var recordId = result.Id;
                                
                                layers.forEach(layer => {
                                    var record = layer.records[recordId];
                                    if (record && idToQid[recordId] && idToQid[recordId].indexOf(layer.qid) !== -1) {
                                        var saveRecord = response.records[recordId];
                                        layer.tooltips.forEach(thisTooltipMetadata => {
                                            var saveValue = getProperty(saveRecord, thisTooltipMetadata.FieldName);
                                            var updateFieldValue = getProperty(saveRecord, thisTooltipMetadata.updateField);
                                            updateValue(record, thisTooltipMetadata.FieldName, saveValue);
                                            if (thisTooltipMetadata.FieldName !== thisTooltipMetadata.updateField && thisTooltipMetadata.needsLink) {
                                                var idField = thisTooltipMetadata.FieldName;
                                                idField = idField.substring(0, idField.lastIndexOf('.')) + '.Id';
                                                updateValue(record, thisTooltipMetadata.updateField, updateFieldValue);
                                                updateValue(record, idField, updateFieldValue);
                                            }
                                        });
                                        Plotting.updatePlottedQueryMarkerRecordInfo(record);
                                    }
                                });
                                changeOwnerStats.successCount += 1;
                            }
                            else {
                                failures++;
                                changeOwnerStats.errorArr = result.errors || [];
                                var errorObj = changeOwnerStats.errorArr[0] || {};
                                hasErrors = true;
                                var errorMsg = errorObj.message || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;

                                errorRow = '<tr><td style="white-space: normal;">'+errorMsg+'</td></tr>';
                            }
                            errorHTML += errorRow;
                        });

                        if(response.errorMap) {
                            hasErrors = true;
                            //errorHTML += '<table>';
                            var permRows = '';
                            $.each(response.errorMap || [], function (key, errMap) {
                                var errMsg = errMap.error || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                                var errCount = errMap.count || 0;
                                changeOwnerStats.failures += errCount;
                                permRows += '<tr><td style="white-space: normal;">'+errMsg+'</td></tr>';
                            });

                            errorHTML += permRows;
                        }

                        if(hasErrors) {
                            var getErrors = changeOwnerStats.errorArr || [];
                            getErrors.push(errorHTML);
                            changeOwnerStats.failureCount += failures;
                            changeOwnerStats.errorArr = getErrors;
                        }

                        //decrement the batches we have out
                        changeOwnerStats.batchCount -= 1;
                        callback();
                    }
                    else
                    {
                        //decrement the batches we have out
                        changeOwnerStats.batchCount -= 1;
                        changeOwnerStats.failureCount += failures;
                        callback();
                    }
                } else {
                    var failures = 0;
                    hasErrors = true;
                    var permRows = '';
                    try {
                        var recordIds = JSON.parse(options.recordIds || '[]');
                        var errCount = recordIds.length || 0;
                        var errMsg = event.message || 'Server Error: Unable to process this batch';
                        failures = failures + errCount;
                        permRows += '<tr><td style="white-space: normal;">'+errMsg+'</td></tr>';
                    }
                    catch (e) {}

                    errorHTML += permRows;

                    if(hasErrors) {
                        var getErrors = changeOwnerStats.errorArr;
                        getErrors.push(errorHTML);
                        changeOwnerStats.push(getErrors);
                    }

                    //decrement the batches we have out
                    
                    changeOwnerStats.batchCount -= 1;
                   
                    changeOwnerStats.failureCount += failures;
                    callback();
                }
                    changeOwnerMessage.find('.toast-message').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [changeOwnerStats.batchCount ]));
                
            },{buffer:false,escape:false,timeout:120000}
        );
    });

    recQue.concurrency = 3;

    //add to the que
    for(var b = 0; b < batchableArray.length; b++)
    {
        var recArr = batchableArray[b];
        recQue.push({recordIds:JSON.stringify(recArr), qid: idToQid},function(res) {});
        $('#changeowner-options-wrapper').data('batchCount', $('#changeowner-options-wrapper').data('batchCount') + 1);
    }

    recQue.drain = function() {
        //show status message and then close the popup
        if (changeOwnerStats.failureCount == 0  || !changeOwnerStats.failureCount)
        {
            MAToastMessages.hideMessage(changeOwnerMessage);

            if(MA.isMobile) {
                MAToastMessages.showSuccess({message:'Change Owner Results',subMessage: changeOwnerStats.successCount + ' records updated, 0 failures.'});
                MALayers.hideModal();
            }
            else {
                MAToastMessages.showSuccess({message:'Change Owner Results',subMessage: changeOwnerStats.successCount + ' records updated, 0 failures.',timeOut:7000});
                var isListViewOpen = document.querySelector('div[data-pendo=main-nav_list]').classList.contains('is-active');
                var isTooltipOpen = checkTooltipOpen();
                //check if both list view and tooltip are active
                if (isListViewOpen && !MA.isMobile ){
                    window.MAListView.ConstructAllTabs();
                }
                if (isTooltipOpen && !MA.isMobile ){

                    var tooltipRecordId = $('#tooltip-content').find('div[class=name]').find('a[href]').attr('href').replace(/\//g, '');
                    if (recIdArray.includes(tooltipRecordId) && $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`)!==0){
                        $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`).find("a[onclick*='MAListView.MarkerClick']").trigger('click')
                    }
                }
                setTimeout(function() {
                    hideMessage($('#changeowner-options-wrapper'));
                    ClosePopupWindow();
                },1000)

            }
        }
        else
        {
            if(MA.isMobile) {
                MALayers.hideModal();
                MAToastMessages.hideMessage(changeOwnerMessage);
                MAToastMessages.showWarning({message:'Change Owner Results',subMessage: changeOwnerStats.successCount + ' records updated, ' + changeOwnerStats.failureCount + ' failure(s).'})
            }
            else {
                MAToastMessages.hideMessage(changeOwnerMessage);
                MAToastMessages.showWarning({message:'Change Owner Results',subMessage:changeOwnerStats.successCount + ' records updated, ' + changeOwnerStats.failureCount + ' failure(s).'})
                setTimeout(function() {
                    hideMessage($('#changeowner-options-wrapper'));
                    ClosePopupWindow();
                },1000)
            }

            try {
                //clsoe out the error html
                errorHTML += '</table>';
                if($('#changeowner-options-wrapper').data('errorArr').length > 0) {
                    setTimeout(function() {
                        var popupHtml = '<div style="overflow:auto;">' + errorHTML + '</div>';
                        // for(var i = 0, len = $('#changeowner-options-wrapper').data('errorArr').length; i<len; i++) {
                        //     if(i >= 1) {
                        //         break;
                        //     }
                        //     popupHtml += $('#changeowner-options-wrapper').data('errorArr')[i];
                        // }
                        // popupHtml += '</div>';
                        var alertPopup = MA.Popup.showMAAlert({
                            title: 'Unable to Change Owner',
                            template: popupHtml,
                            okText : MASystem.Labels.MA_Ok,
                            okType : 'slds-button_brand'
                        });
                        MA.Popup.showBackdrop();
                    }, 4000);
                }
            }
            catch(e) {}
        }
    };

}


function checkTooltipOpen(){
    if ($('div[class=tooltip-content-container]').length===0 || !$('div[class=tooltip-content-container]') ){return false}
    if ($('div[class=tooltip-content-container]').length===1){return $('div[class=tooltip-content-container]').parent().css('display')!=='none'}
    return true;
}
function mobileChangeOwner(recordIds)
{
    //make sure we got some valid ids
    if (recordIds && recordIds.length > 0)
    {
        //on input tap, show seconday popup to search for user...
        $('#ChangeOwnerPopup').off('click','.changeOwnerLookup '); //remove any previous
        $('#ChangeOwnerPopup').on('click', '.changeOwnerLookup ',function() {
            MALayers.showModal('dynamicSearchModal');
            $('#dynamicSearchModal').removeData();

            //add modal hide functionality
            $('#dynamicSearchModal').off('click','.hideDynamicModal');
            $('#dynamicSearchModal').on('click','.hideDynamicModal',function() {
                MALayers.hideModal('dynamicSearchModal',false);
            });

            //keep track of origin
            $('#dynamicSearchModal').data('domOrigin',$(this));
            //clear any previous
            $('#searchDynamicInput').val('');
            var $searchModal = $('#dynamicSearchModal');
            $searchModal.find('.search-empty-state').removeClass('hidden');
            $searchModal.find('.search-results-wrapper').addClass('hidden');
            $('#searchDynamicInput').focus();

            //remove any previous event listener
            $('#dynamicSearchModal').off('keyup','#searchDynamicInput');

            //attach event listener to input
            $('#dynamicSearchModal').on('keyup','#searchDynamicInput',function () {
                var $input = $(this);
                var searchTerm = $input.val();
                var $searchModal = $('#dynamicSearchModal');
                var $searchResults = $searchModal.find('.search-table-view').empty();
                if (searchTimeout !== null) {
                    clearTimeout(searchTimeout);
                }

                if(searchTerm === '') {
                    $searchModal.find('.search-empty-state').removeClass('hidden');
                    $searchModal.find('.search-results-wrapper').addClass('hidden');
                    return;
                }

                searchTimeout = setTimeout(function() {
                    searchTimeout = null;
                    var $favLoading = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading,timeOut:0,extendedTimeOut:0});

                    searchUsers(searchTerm).then(function(res) {
                        $searchModal.find('.search-empty-state').addClass('hidden');
                        $searchModal.find('.search-results-wrapper').removeClass('hidden');
                        MAToastMessages.hideMessage($favLoading);
                        $favLoading = null;
                        if(res.success) {
                            var resultHTML = '';
                            var userData = res.users || [];
                            var userDataLength = userData.length;
                            var resultHTML = '';
                            if(userDataLength === 0) {
                                //show no results
                                $searchResults.html('<li class="table-view-cell">No Results</li>');
                            }
                            else {
                                $.each(userData, function (index, data) {
                                    resultHTML += '<li class="table-view-cell ownerSuccess" data-id="'+htmlEncode(data.Id)+'">'+htmlEncode(data.Name)+'</li>';
                                });

                                $searchResults.html(resultHTML);

                                //attach click handler to rows
                                $searchResults.off('click','.ownerSuccess');
                                $searchResults.on('click','.ownerSuccess',function () {
                                    var $row = $(this);
                                    var dataId = $row.attr('data-id');
                                    var rowVal = $row.text();

                                    var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                                    $searchOriginLocation.attr('data-id',dataId).val(rowVal);

                                    //hide modal
                                    MALayers.hideModal('dynamicSearchModal',false);

                                    var selection = {
                                        Name : rowVal,
                                        Id : dataId
                                    };
                                    mobileChangeOwnerchangeOwnerStep2(selection);
                                });
                            }
                        }
                        else {
                            $searchResults.html('<li class="table-view-cell">No Results</li>');
                        }
                    });
                },500);
            });

            $('#dynamicSearchModal').off('click','.clearOriginInput');

            $('#dynamicSearchModal').on('click','.clearOriginInput',function () {
                var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                $searchOriginLocation.removeAttr('data-id').val('');
            });
            $('#dynamicSearchModal').off('click','.hideDynamicModal');
            $('#dynamicSearchModal').on('click','.clearOriginInput',function () {
                var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                $searchOriginLocation.removeAttr('data-id').val('');
            });

            //add modal hide functionality
            $('#dynamicSearchModal').on('click','.hideDynamicModal',function() {
                MALayers.hideModal('dynamicSearchModal',true);
            });
        });
        //reset values$('.changeOwnerLookup ').select2("val", "");
        var $input = $('#ChangeOwnerPopup .changeOwnerLookup').val('').trigger('change');
        var $resultsWrapper = $('#ChangeOwnerPopup .searchResults').html('<div class="ma-list-header"></div><div class="ma-list-item"><div class="ma-list-item-name">Search above for results...</div></div>');
        $('#ChangeOwnerPopup #changeowner-options-wrapper').hide();
        $('#ChangeOwnerPopup #changeowner-user-select').show();
        $('#ChangeOwnerPopup .ma-modal-footer .step2').hide();

        //create a popup
        MALayers.showModal('ChangeOwnerPopup');

        //store the record ids for later use
        $('#ChangeOwnerPopup').data({
            recordIds: recordIds
        });
    }
    else
    {
        showError($('#mapdiv').parent(), 'No visible markers');
    }
}
function ChangeOwner_Step1()
{
    if(MA.isMobile) {
        $('#ChangeOwnerPopup .changeOwnerLookup').val('').trigger('change');
        $('#ChangeOwnerPopup #changeowner-options-wrapper').hide();
        $('#ChangeOwnerPopup #changeowner-user-select').show();
        $('#ChangeOwnerPopup .ma-modal-footer .step2').hide();
    }
    else {
        //go back to step 1

        $('#changeowner-select-wrapper').css('min-height', 'auto').slideDown(300, function () { $(this).css('min-height', ''); });
        $('#changeowner-options-wrapper').css('min-height', 'auto').slideUp(300, function () { $(this).css('min-height', ''); });
    }
}
function mobileChangeOwnerchangeOwnerStep2(selection) {
    selection = $.extend({
        Id : '',
        Name : ''
    }, selection || {});
    storedNewOwner = Object.assign(storedNewOwner, selection);
    $('#changeowner-select-grid').data('selectedRecord', selection);
    $('#ChangeOwnerPopup #changeowner-options-wrapper').show();
    $('#ChangeOwnerPopup #changeowner-user-select').hide();
    $('#ChangeOwnerPopup .ma-modal-footer .step2').show();
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.removeStart('#'), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
//format currency
function formatCurrency(fieldValue, toolTipObj, recordISO) {
    // return value
    var formattedValue;
    // how many decimal places?
    // scale has a possibility to be 0 which is a falsy statement so we are checking if property exists
    // '0' > 0 returns false
    var scale = String(getProperty(toolTipObj,'describe.scale')) !== 'undefined' ? String(getProperty(toolTipObj,'describe.scale')) : 2;
    // available org currencies
    var orgCurrencies = getProperty(MASystem, 'Currency.available', false) || {};
    // format the currency based on org preferences
    if(!MASystem.Organization.isMultiCurrencyOrganization)
    {
        // Not a multi-currency.  Just show user's currency based on their locale.
        try {
            var corporateLocaleTag = MASystem.Organization.defaultOrgLocale.replace('_', '-');
            var orgISO = MASystem.User.DefaultCurrency;
            formattedValue = fieldValue.toLocaleString(corporateLocaleTag, { style: 'currency', currency: orgISO.toString(), localeMatcher: 'best fit', minimumFractionDigits: scale, maximumFractionDigits: scale });
        }
        catch (ex) {
            console.warn('Unable to parse locale', ex);
            formattedValue = fieldValue;
        }
    } else {
        try {
            // We are in a multi-currency org.  Figure out if we also have record-based currency
            var corpCurrency = getProperty(MASystem, 'Currency.corporate', false) || {};
            var corporateISO = corpCurrency.IsoCode;

            // Record
            var recordCurrency = orgCurrencies[recordISO] || {};

            // User
            var userCurrency = getProperty(MASystem, 'Currency.user', false);
            var userISO = userCurrency ? userCurrency.IsoCode : 'USD';
            var userConversionRate = userCurrency ? userCurrency.ConversionRate : 1;
            var userLocale = MASystem.User.UserLocale || '';
            var userLocaleTag = userLocale.replace('_', '-');

            // udpate our formatted value
            var isoCodeConversion = recordISO ? recordCurrency.IsoCode : corporateISO;
            if (isoCodeConversion === userISO) {
                // if iso is equal to the user iso, no conversion is needed
                var recordValue = fieldValue.toLocaleString(userLocaleTag, {style: 'decimal', minimumFractionDigits: scale, maximumFractionDigits: scale});
                formattedValue = recordCurrency.IsoCode + ' ' + recordValue;
            } else {
                // no need to modify the user value since fieldValue is returned in users currency
                var userValue = fieldValue.toLocaleString(userLocaleTag, {style: 'decimal', minimumFractionDigits: scale, maximumFractionDigits: scale});
                // set the org/record value
                var currencyObject = orgCurrencies[isoCodeConversion];
                var conversionRate = currencyObject ? currencyObject.ConversionRate : 1;
                // set up the math to adjust the field value;
                conversionRate = conversionRate / userConversionRate;
                var recordValue = fieldValue * conversionRate;
                // set the value and display
                recordValue = recordValue.toLocaleString(userLocaleTag, {style: 'decimal', minimumFractionDigits: scale, maximumFractionDigits: scale});
                formattedValue = isoCodeConversion + ' ' + recordValue + ' (' + userISO + ' ' + userValue + ')';
            }
        } catch (e){
            console.warn(e);
            formattedValue = fieldValue;
        }
    }
    return formattedValue;
}

function rebuildRecordFromDotNotation (dotNotation,value) {
    try{
        var objectLayout = dotNotation.split('.');
        var finalObj = {};
        var previousKey = '';
        for(var i = 0; i < objectLayout.length; i++) {
            var key = objectLayout[i];
            var prevObject;
            if(i == 0) {
                if(i === objectLayout.length - 1) {
                    finalObj[key] = value;
                }
                else {
                    finalObj[key] = {};
                }
            }
            else {
                prevObject = getProperty(finalObj,previousKey);
                if(prevObject) {
                    if(i === objectLayout.length - 1) {
                        prevObject[key] = value;
                    }
                    else {
                        prevObject[key] = {};
                    }
                }
                else {
                    if(i === objectLayout.length - 1) {
                        finalObj[key] = value;
                    }
                    else {
                        finalObj[key] = {};
                    }
                    //finalObj = prevObj;
                }
            }
            previousKey += previousKey == '' ? key : '.' + key;
        }

        return finalObj;
    }
    catch(e) {
        return {
            dotNotation : value
        };
    }
}

/******************************
 *
 * Start Campaign Logic
 *
 ******************************/
function AddVisibleToCampaign(records) {
	//start building lists of valid contact/lead ids to add to a campaign
	var contactIds = [];
	var leadIds = [];
	var showPopup = false;
	var $popup = $('#AddToCampaignPopup');
	var $searchResults = $popup.find('.tableResults').empty().html('<tr><td colspan="9">Please Search Above...</td></tr>');
	//was a specific record id passed?
	var $popupLoading = MAToastMessages.showLoading({
		message: MASystem.Labels.MA_Loading_With_Ellipsis,
		timeOut: 0,
		extendedTimeOut: 0
	});
	if (typeof records == 'string')
	{
		//yes, so just use that id
		var recordId = records;
		if (recordId.substring(0, 3) == '003') {
			contactIds.push(recordId);
		} else if (recordId.substring(0, 3) == '00Q') {
			leadIds.push(recordId);
		}
		showPopup = true;
	}
	else if (records)
	{
		var recLengh = records.length;
		var recCount = 0;
		var markerProcessingBatchSize = 100;
		setTimeout(function doBatch() {
			if (recCount < recLengh) {
				var recordsProcessed = 0;
				while (recordsProcessed < markerProcessingBatchSize && recCount < recLengh) {
					recordsProcessed++;
					var record = records[recCount];
					if (typeof record != 'undefined') {
                        if (record.Id.substring(0, 3) == '003') {
                            contactIds.push(record.Id);
                        } else if (record.Id.substring(0, 3) == '00Q') {
                            leadIds.push(record.Id);
                        }
					}
					recCount++;
				}

				setTimeout(doBatch, 1);
			} else {
				showPopup = true;
			}
		}, 1);
	}
	else
	{
		//no, so loop through all plotted queries looking for visible leads and contacts
		$('#PlottedQueriesTable .PlottedRowUnit').each(function() {
			var records = $(this).data('records') || [];
			var recLengh = records.length;
			var recCount = 0;
			var markerProcessingBatchSize = 100;
			setTimeout(function doBatch() {
				if (recCount < recLengh) {
					var recordsProcessed = 0;
					while (recordsProcessed < markerProcessingBatchSize && recCount < recLengh) {
						recordsProcessed++;

						var record = records[recCount];
						var recordId;
						if (typeof record != 'undefined') {
							recordId = record.Id;
							if ((record.isVisible || record.isClustered || record.isScattered) && recordId.substring(0, 3) == '003') //contact
							{
								contactIds.push(recordId);
							} else if ((record.isVisible || record.isClustered || record.isScattered) && recordId.substring(0, 3) == '00Q') //lead
							{
								leadIds.push(recordId);
							}
						}
						recCount++;
					}

					setTimeout(doBatch, 1);
				} else {
					showPopup = true;
				}
			}, 1);
		});
	}

	//wait for the proccessing to complete and make sure we got some valid ids
	var processInt = setInterval(function() {
		if (showPopup) {
			clearInterval(processInt);
			MAToastMessages.hideMessage($popupLoading);
			if (contactIds.length > 0 || leadIds.length > 0) {
				MALayers.showModal('AddToCampaignPopup');

				//store the contact and lead ids for use later
				$('#AddToCampaignPopup').data({
					contactIds: contactIds,
					leadIds: leadIds
				});

				//show a loading message on the popup
				$popup.find('.step2').hide();
				$popup.find('.step1').show();
				$('#addtocampaign-options-wrapper').hide();
				$('#addtocampaign-select-wrapper').show();
				$('#addtocampaign-filter-name').val('');
				$('#addtocampaign-select-selectiondetails span.link.clearselections').click();
				$('#addtocampaign-select-grid').data('records', {});

				//attach search function to input
				$popup.off('keyup', '.searchDynamicInput');
				$popup.on('keyup', '.searchDynamicInput', function() {
					var $input = $(this);
					var searchTerm = $input.val();


					if (searchTimeout !== null) {
						clearTimeout(searchTimeout);
					}

					if (searchTerm === '') {
						$searchResults.html('<tr><td colspan="9">Please Search Above...</td></tr>');
						return;
					}

					searchTimeout = setTimeout(function() {
						searchTimeout = null;
						var $favLoading = MAToastMessages.showLoading({
							message: MASystem.Labels.MA_Loading,
							timeOut: 0,
							extendedTimeOut: 0
						});

						var searchOptions = {
							sf_object: 'Campaign',
							searchTerm: searchTerm.replace(/\-/g,'*'),
							fieldsToReturn: 'Id, Name, Type, Status, IsActive, StartDate, EndDate, NumberOfLeads, NumberOfContacts, NumberOfResponses'
						}

						searchSFObject(searchOptions).then(function(res) {
							$popup.find('.search-empty-state').addClass('hidden');
							$popup.find('.search-results-wrapper').removeClass('hidden');
							MAToastMessages.hideMessage($favLoading);
							$favLoading = null;
							if (res.success) {
								var resultHTML = '';
								var userData = res.data || [];
								var userDataLength = userData.length;
								var resultHTML = '';
								if (userDataLength === 0) {
									//show no results
									//$searchResults.html('<li class="table-view-cell">No Results</li>');
									$searchResults.html('<tr><td colspan="9">No Results</td></tr>');
								} else {
									var campaigns = $('#addtocampaign-select-grid').data('records') || {};
									$.each(userData, function(index, data) {
										//Type, Status, IsActive, StartDate, EndDate, NumberOfLeads, NumberOfContacts, NumberOfResponses'
										//resultHTML += '<li class="table-view-cell ownerSuccess" data-id="'+data.Id+'">'+data.Name+'</li>';
										var startDate = data.StartDate == undefined ? '' : moment.utc(data.StartDate).format(MASystem.User.dateFormat.replace(/y/g, 'Y').replace('/d/', '/DD/'));
										var endData = data.EndDate == undefined ? '' : moment.utc(data.EndDate).format(MASystem.User.dateFormat.replace(/y/g, 'Y').replace('/d/', '/DD/'));
										var objectLocation = data.Id + '.isChecked';
										var isChecked = getProperty(campaigns, objectLocation) == true ? 'checked="checked"' : '';
										resultHTML += '<tr data-name="' + htmlEncode(data.Name) + '" data-id="' + data.Id + '" class="campaign-row"><td style="padding: 5px !important;"><label class="ma-checkbox"><input ' + isChecked + ' class="campaign-checkbox" name="checkbox" type="checkbox"/><span class="ma-checkbox-faux"></span></label></td><td><a href="/' + data.Id + '" target="_blank">' + htmlEncode(data.Name) + '</a></td><td>' + htmlEncode(data.Type) + '</td><td>' + htmlEncode(data.Status) + '</td><td>' + htmlEncode(startDate) + '</td><td>' + htmlEncode(endData) + '</td><td>' + data.NumberOfLeads + '</td><td>' + data.NumberOfContacts + '</td><td>' + data.NumberOfResponses + '</td></tr>';
									});

									$searchResults.html(resultHTML);

									$searchResults.off('change', '.campaign-checkbox');
									$searchResults.on('change', '.campaign-checkbox', function() {
										var $checkbox = $(this);
										var $row = $checkbox.closest('.campaign-row');
										var rowId = $row.attr('data-id');
										var rowName = $row.attr('data-name');

										var campaigns = $('#addtocampaign-select-grid').data('records');
										if ($checkbox.prop('checked')) {
											campaigns[rowId] = {
												isChecked: true,
												Name: rowName,
												Id: rowId
											};
											$('#addtocampaign-select-selectiondetails').data('numSelected', ($('#addtocampaign-select-selectiondetails').data('numSelected') || 0) + 1);
										} else {
											campaigns[rowId] = {
												isChecked: false,
												Name: rowName,
												Id: rowId
											};
											$('#addtocampaign-select-selectiondetails').data('numSelected', ($('#addtocampaign-select-selectiondetails').data('numSelected') || 0) + -1);
										}
										$('#addtocampaign-select-selectiondetails span').first().text($('#addtocampaign-select-selectiondetails').data('numSelected'));

									});
								}
							} else {
								$searchResults.html('<tr><td colspan="9">No Results</td></tr>');
							}
						});
					}, 500);
				});
			} else {
				if (MA.isMobile) {
					MAToastMessages.showWarning({
						message: MASystem.Labels.Campaing_Status,
						subMessage: MASystem.Labels.Campaing_Status_Plot_Contact_Or_Lead
					});
				} else {
					showError($('#mapdiv').parent(), MASystem.Labels.Campaing_Status_Plot_Contact_Or_Lead);
				}
			}
		}
	}, 1000);
}

function AddToCampaign_Step2() {
	//validation
	if (!($('#addtocampaign-select-selectiondetails').data('numSelected') > 0)) {
		//need to select a campaign, show error
		MAToastMessages.showWarning({
			message: MASystem.Labels.Campaing_Status,
			subMessage: MASystem.Labels.Campaing_Select_One_Or_More,
			timeOut: 5000
		});
		return;
	}

	//show loading
	var $loading = MAToastMessages.showLoading({
		message: MASystem.Labels.Campaing_Status,
		subMessage: MASystem.Labels.MA_Loading_With_Ellipsis,
		timeOut: 0,
		extendedTimeOut: 0
	});

	//show step 2
	$loading.find('.toast-message').text(MASystem.Labels.Loading_Statuses_With_Ellipsis);
	$('#AddToCampaignPopup .step2').show();
	$('#AddToCampaignPopup .step1').hide();

	$('#addtocampaign-select-wrapper').css('min-height', 'auto').slideUp(300, function() {
		$(this).css('min-height', '');
	});
	$('#addtocampaign-options-wrapper').css('min-height', 'auto').slideDown(300, function() {
		$(this).css('min-height', '');
	});

	//send request for campaign options
	var campaignIds = [];
	var campaignsMap = {};
	$.each($('#addtocampaign-select-grid').data('records'), function(id, record) {
		if (record.isChecked) {
			campaignIds.push(id);
			campaignsMap[id] = record;
		}
	});

	var processData = {
		ajaxResource: 'TooltipAJAXResources',
		action: 'get_campaign_statuses',
		serializedCampaignIds: JSON.stringify(campaignIds)
	};

	Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(response, event) {
			if (event.status) {
				if (response.success) {
					var $grid = $('#addtocampaign-options-grid');

					//populate the options grid
					$grid.find('.campaign-options-row').remove();
					$.each(campaignsMap, function(id, record) {

						var $row = populateCampaignOptionsRow($('#templates .campaign-options-row').clone().data('record', record).data('statusOptions', response.campaignStatuses[id]));
						$grid.append($row);

					});

					//hide the loading indicator
					MAToastMessages.hideMessage($loading);
				} else {
					MAToastMessages.hideMessage($loading);
					MAToastMessages.showError({
						message: MASystem.Labels.Campaing_Status,
						subMessage: MASystem.Labels.Campaing_Cannot_Load_Status
					});

				}
			} else {
				MAToastMessages.hideMessage($loading);
				MAToastMessages.showError({
					message: MASystem.Labels.Campaing_Status,
					subMessage: MASystem.Labels.Campaing_Cannot_Load_Status
				});

			}
		}, {buffer: false,escape: false,timeout: 40000}
	);
}

function populateCampaignOptionsRow($row)
{
    //populate basic record data
    var record = $row.data('record');
    var statusOptions = $row.data('statusOptions');
    $row.find('.campaign-name').html($("<a target='_blank'></a>").attr('href', '/'+record.Id).text(record.Name));

    //populate status options
    var $statusPicklist = $row.find('.campaign-status select');
    if (statusOptions && statusOptions.length > 0)
    {
        $statusPicklist.find('option').remove();
        $.each(statusOptions, function (index, option) {
            $statusPicklist.append(
                $("<option></option>").attr('value', option).text(option)
            );
        });
    }
    else
    {
        $statusPicklist.replaceWith(MASystem.Labels.Campaing_No_Valid_Statuses);
    }

    //return the row
    return $row;
}

function AddToCampaign_Step1()
{
    //go back to step 1
    $('#addtocampaign-select-wrapper').css('min-height', 'auto').slideDown(300, function () { $(this).css('min-height', ''); });
    $('#addtocampaign-options-wrapper').css('min-height', 'auto').slideUp(300, function () { $(this).css('min-height', ''); });
    $('#AddToCampaignPopup .step2').hide();
    $('#AddToCampaignPopup .step1').show();
}

function AddToCampaign_Finish() {
	//show loading
	var $loadingMessage = MAToastMessages.showLoading({
		message: MASystem.Labels.Campaing_Status,
		subMessage: MASystem.Labels.Campaing_Adding,
		timeOut: 0,
		extendedTimeOut: 0
	});
	MALayers.hideModal();
	var totalBatches = 0;

	//prepare request data
	var requestData = {
		serializedContactIds: JSON.stringify($('#AddToCampaignPopup').data('contactIds')),
		serializedLeadIds: JSON.stringify($('#AddToCampaignPopup').data('leadIds'))
	};

	//send request to add members to each selected campaign
	$('#addtocampaign-options-grid').data('numRequestsOut', 0);
	$('#addtocampaign-options-grid').data('numRequestsSuccessful', 0);
	$('#addtocampaign-options-grid').data('numRequestsFailed', 0);

	var callQueue = async.queue(function(batchOptions, callback) {

		var requestData = {
			serializedContactIds: JSON.stringify(batchOptions.contactIds),
			serializedLeadIds: JSON.stringify(batchOptions.leadIds),
			campaignId: batchOptions.campaignId,
			campaignStatus: batchOptions.campaignStatus,
			overrideExistingMemberStatus: batchOptions.overrideExistingMemberStatus,
			ajaxResource: 'TooltipAJAXResources',
			action: 'add_to_campaign',
		};

		//send request
		$('#addtocampaign-options-grid').data('numRequestsOut', $('#addtocampaign-options-grid').data('numRequestsOut') + 1);
		Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
			requestData,
			function(response, event) {
				if (event.status) {
					if (response.success) {
						//increment successful batch count
						$('#addtocampaign-options-grid').data('numRequestsSuccessful', $('#addtocampaign-options-grid').data('numRequestsSuccessful') + 1);
					} else {
						//increment failed batch count
						$('#addtocampaign-options-grid').data('numRequestsFailed', $('#addtocampaign-options-grid').data('numRequestsFailed') + 1);
					}

					//decrement pending batch count
					$('#addtocampaign-options-grid').data('numRequestsOut', $('#addtocampaign-options-grid').data('numRequestsOut') - 1);
					totalBatches--;
					$loadingMessage.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [totalBatches]));
					callback();
				} else {
					//increment failed batch count
					$('#addtocampaign-options-grid').data('numRequestsFailed', $('#addtocampaign-options-grid').data('numRequestsFailed') + 1);
					//decrement pending batch count
					$('#addtocampaign-options-grid').data('numRequestsOut', $('#addtocampaign-options-grid').data('numRequestsOut') - 1);
					totalBatches--;
					$loadingMessage.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [totalBatches]));
					callback();
				}
			}, {
				timeout: 60000,
				buffer: false,
				escape: false
			}
		);
	});

	callQueue.concurrency = 1;

	$('#addtocampaign-options-grid .campaign-options-row').each(function() {
		if ($(this).find('.campaign-status select').length > 0) {

			var $campaignOptionRow = $(this);
			var contactIds = [];
			var leadIds = [];

			//loop over the contacts and send in batches
			$.each($('#AddToCampaignPopup').data('contactIds'), function(index, contactId) {
				contactIds.push(contactId);

				//send out this batch if it's ready
				var batchSize = getProperty(MASystem,'MergeFields.MassFieldUpdateScopeSize',false) || 200;
				if (contactIds.length >= batchSize) {
					callQueue.push({
						"leadIds": [],
						"contactIds": contactIds,
						"campaignId": $campaignOptionRow.data('record').Id,
						"campaignStatus": $campaignOptionRow.find('.campaign-status select').val(),
						"overrideExistingMemberStatus": $campaignOptionRow.find('.campaign-override input').is(':checked')
					});
					contactIds = [];
					totalBatches++;
					// AddToCampaign_SendBatch(contactIds, leadIds, $campaignOptionRow.data('record').Id, $campaignOptionRow.find('.campaign-status select').val(), $campaignOptionRow.find('.campaign-override input').is(':checked'));
				}
			});

			//loop over the leads and send in batches
			$.each($('#AddToCampaignPopup').data('leadIds'), function(index, leadId) {
				leadIds.push(leadId);

				//send out this batch if it's ready
				//changing this to use the advanced option scope size
				var batchSize = getProperty(MASystem,'MergeFields.MassFieldUpdateScopeSize',false) || 200;
				if (contactIds.length + leadIds.length >= batchSize) {
					callQueue.push({
						"leadIds": leadIds,
						"contactIds": [],
						"campaignId": $campaignOptionRow.data('record').Id,
						"campaignStatus": $campaignOptionRow.find('.campaign-status select').val(),
						"overrideExistingMemberStatus": $campaignOptionRow.find('.campaign-override input').is(':checked')
					});
					leadIds = [];
					totalBatches++;
					// AddToCampaign_SendBatch(contactIds, leadIds, $campaignOptionRow.data('record').Id, $campaignOptionRow.find('.campaign-status select').val(), $campaignOptionRow.find('.campaign-override input').is(':checked'));
				}
			});

			//send out the last batch if needed
			if (contactIds.length + leadIds.length > 0) {
				callQueue.push({
					"leadIds": leadIds,
					"contactIds": contactIds,
					"campaignId": $campaignOptionRow.data('record').Id,
					"campaignStatus": $campaignOptionRow.find('.campaign-status select').val(),
					"overrideExistingMemberStatus": $campaignOptionRow.find('.campaign-override input').is(':checked')
				});
				totalBatches++;
				//AddToCampaign_SendBatch(contactIds, leadIds, $campaignOptionRow.data('record').Id, $campaignOptionRow.find('.campaign-status select').val(), $campaignOptionRow.find('.campaign-override input').is(':checked'));
			}
		}
	});

	//status update
	$loadingMessage.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [totalBatches]));


	callQueue.drain = function() {
		//done adding, show results
		var msgFunction = $('#addtocampaign-options-grid').data('numRequestsFailed') == 0 ? showSuccess : showWarning;
		MAToastMessages.hideMessage($loadingMessage);
		MALayers.hideModal();
		if (showSuccess) {
			MAToastMessages.showSuccess({
				Message: MASystem.Labels.Campaing_Status,
				subMessage: window.formatLabel(MASystem.Labels.Campaing_Adding_Batches_Successful,[$('#addtocampaign-options-grid').data('numRequestsSuccessful'), $('#addtocampaign-options-grid').data('numRequestsFailed')])
			});
		} else {
			MAToastMessages.showWarning({
				Message: MASystem.Labels.Campaing_Status,
				subMessage: window.formatLabel(MASystem.Labels.Campaing_Adding_Batches_Successful,[$('#addtocampaign-options-grid').data('numRequestsSuccessful'), $('#addtocampaign-options-grid').data('numRequestsFailed')])
			});
		}
	};
}
/******************************
 *
 * End Campaign Logic
 *
 ******************************/

/******************************
 *
 * Start Update Field Logic
 *
 ******************************/

function UpdateFieldOfVisible(records)
{
    var popup = MA.Popup.showMAPopup({
		template: $('#templates .UpdateFieldPopup').clone(),
        popupId : 'UpdateFieldPopup',
// 		width : 400,
		title: MASystem.Labels.ActionFramework_Update_Field,
		buttons: [
			{
				text: MASystem.Labels.MA_Cancel,
				type: 'slds-button_neutral disableBtn',
			},
			{
				text: MASystem.Labels.MA_Save_Close,
				type: 'slds-button_brand disableBtn',
				onclick :  UpdateField_Finish
			}
		]
	});

	$('#UpdateFieldPopup .field-selection').show();
    $('#UpdateFieldPopup .fieldUpdateMessage').hide();
    $('#UpdateFieldPopup .autoRefreshQuery').prop('checked',false);
    $('#UpdateFieldPopup .autoRefreshWrapper').addClass('hidden');

    $('#UpdateFieldPopup').data('records', records);
    if(MA.isMobile) {
        $('#UpdateFieldPopup .updatefield-query').html('<option value="--Select--">--Select--</option>');
    }
    else {
        $('#UpdateFieldPopup .updatefield-query').html('<option value="--Select--">--Select--</option>').select2().change();
    }
    $('#UpdateFieldPopup .updatefield-field-wrapper').hide();
    $('#UpdateFieldPopup .updatefield-value-wrapper').hide();

    //loop through the supplied records and populate the saved queries that they are included in
    var keys = Object.keys(records) || [];
    var len = keys.length;
    var i = 0;
    recordsDone = false;
    var qids = {};
    setTimeout(function doBatch() {
        if(i < len) {
            var recordsProcessed = 0;
            while (recordsProcessed < 100 && i < len) {
                recordsProcessed++;
                prop = keys[i];
                var record = records[prop];
                if(qids[record.qid] == undefined) {
                    qids[record.qid] = 'done';
                }

                i += 1;
            }
            setTimeout(doBatch, 1);
        }
        else {
            $.each(qids, function (key,val) {
                var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+key+'"]');
                if ($('#UpdateFieldPopup .updatefield-query option[value="'+$plottedQuery.index()+'"]').length == 0 && $plottedQuery.find('.ftu-icon-icon.inline').attr('type') != 'dataLayer') {
                    $('#UpdateFieldPopup .updatefield-query').append($('<option />').attr('data-qid',key).attr('value', $plottedQuery.index()).text($plottedQuery.find('.basicinfo-name').text()));
                }
            });
            //if there is only one query option then select it
            if ($('#UpdateFieldPopup .updatefield-query option').length == 2) {
                $('#UpdateFieldPopup .updatefield-query').val($('#UpdateFieldPopup .updatefield-query option:last-child').attr('value')).change().next().find('input').val($('#UpdateFieldPopup .updatefield-query option:last-child').text());
            }
        }
    },1);
}

function UpdateField_AddNewRow()
{
    var currentRows = $('#UpdateFieldPopup .mass-row-update-group .mass-update-row');
    if(currentRows.length < 10)
    {
        var $row =$('#updateFieldPopupRowTemplate .mass-update-row').clone();
        $('#UpdateFieldPopup .mass-row-update-group').append($row);

    // 	$('#UpdateFieldPopup .field-selection').show();
    //     $('#UpdateFieldPopup .fieldUpdateMessage').hide();
    //     $('#UpdateFieldPopup .autoRefreshQuery').prop('checked',false);
    //     $('#UpdateFieldPopup .autoRefreshWrapper').addClass('hidden');

    //     $('#UpdateFieldPopup').data('records', records);
        var records = $('#UpdateFieldPopup').data('records');
        if(MA.isMobile) {
            $row.find('.updatefield-query').html('<option value="--Select--">--Select--</option>');
        }
        else {
            $row.find('.updatefield-query').html('<option value="--Select--">--Select--</option>').select2().change();
        }
        $row.find('.updatefield-field-wrapper').hide();
        $row.find('.updatefield-value-wrapper').hide();

        //loop through the supplied records and populate the saved queries that they are included in
        var keys = Object.keys(records) || [];
        var len = keys.length;
        var i = 0;
        recordsDone = false;
        var qids = {};
        setTimeout(function doBatch() {
            if(i < len) {
                var recordsProcessed = 0;
                while (recordsProcessed < 100 && i < len) {
                    recordsProcessed++;
                    prop = keys[i];
                    var record = records[prop];
                    if(qids[record.qid] == undefined) {
                        qids[record.qid] = 'done';
                    }

                    i += 1;
                }
                setTimeout(doBatch, 1);
            }
            else {
                $.each(qids, function (key,val) {
                    var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+key+'"]');
                    if ($row.find('.updatefield-query option[value="'+$plottedQuery.index()+'"]').length == 0 && $plottedQuery.find('.ftu-icon-icon.inline').attr('type') != 'dataLayer') {
                        $row.find('.updatefield-query').append($('<option />').attr('data-qid',key).attr('value', $plottedQuery.index()).text($plottedQuery.find('.basicinfo-name').text()));
                    }
                });
                //if there is only one query option then select it
                if ($row.find('.updatefield-query option').length == 2) {
                    $row.find('.updatefield-query').val($('#UpdateFieldPopup .updatefield-query option:last-child').attr('value')).change().next().find('input').val($('#UpdateFieldPopup .updatefield-query option:last-child').text());
                }
            }
        },1);
    } else {
       MAToastMessages.showError({message:'Maximum number of fields has already been reached',subMessage:'Please save or remove your current field selections before continuing',timeOut:3000,extendedTimeOut:0})
    }
}



function UpdateField_QueryChanged(elem)
{
    //hide the value div and show loading for the field
    var $row = $(elem).closest('.mass-update-row');
    if(MA.isMobile) {
        $row.find('.updatefield-field').html("<option value='--Select--'>--Select--</option>");
    }
    else {
        $row.find('.updatefield-field').html("<option value='--Select--'>--Select--</option>").select2().change();
    }

    $row.find('.updatefield-value-wrapper').fadeOut(400);

    //show or hide the field depending on whether or not a query is selected
    if ($row.find('.updatefield-query').val() == '--Select--') {
        $row.find('.updatefield-field-wrapper').fadeOut(400);
    }
    else {
        $row.find('.updatefield-field').empty().append($('<option />').attr('value','Loading').text('--Loading Fields--'));

        $row.find('.updatefield-field-wrapper').fadeIn(400);

        var queryData = $('#PlottedQueriesTable > *').eq(parseInt($row.find('.updatefield-query').val())).data();
        var baseObject = queryData.options.baseObjectName;

        //send request for field options
        var processData = {
        	ajaxResource : 'TooltipAJAXResources',

        	action: 'get_editable_fields',
        	baseObject: baseObject
        };

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(response, event){
        	    if(event.status) {
                    if (response.success)
                    {
                        var fieldOptions = [];
                         fieldOptions.push($('<option />').attr('value', '--Select--').text('--Select--'));
                        $.each(response.editableFields, function (index, field) {
                            fieldOptions.push($('<option />').attr('value', field.value).text(field.label));
                            //$row.find('.updatefield-field').append();
                        });
                        //$row.find('.updatefield-field-wrapper').fadeOut(400);
                        $row.find('.updatefield-field').empty();
                        $row.find('.updatefield-field').append(fieldOptions);
                        //$row.find('.updatefield-field-wrapper').fadeIn(400);

                        $row.find('.updatefield-field').next().find('input').val('--Select--');
                        $row.find('.updatefield-field').next().find('.loadmask').remove();

                    }
                    else
                    {
                        var errMsg = response.error || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                        MAToastMessages.showError({message:MASystem.Labels.Change_Owner_Cannot_Update_Field,subMessage:errMsg,timeOut:0,extendedTimeOut:0,closeButton:true});
                        $.each(response.editableFields, function (index, field) {
                            $row.find('.updatefield-field').append($('<option />').attr('value', field.value).text(field.label));
                        });
                        $row.find('.updatefield-field').next().find('input').val('--Select--');
                        $row.find('.updatefield-field').next().find('.loadmask').remove();
                    }
        	    }
        	    else {
        	        var errMsg = event.message || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
        	        MAToastMessages.showError({message:MASystem.Labels.Change_Owner_Cannot_Update_Field,subMessage:errMsg,timeOut:0,extendedTimeOut:0,closeButton:true});
        	    }
            },{buffer:false,escape:false}
        );
    }
}
function UpdateField_FieldChanged(elem)
{
    //current row of interaction
    var $row = $(elem).closest('.mass-update-row');
    if ($row.find('.updatefield-field').val() == '--Select--') {
        $row.find('.updatefield-value-wrapper').fadeOut(400);
    }
    else {
        $row.find('.updatefield-value-wrapper').fadeIn(400);
        $row.find('.updatefield-value').html('<span style="font-size: 10px; font-style: italic; color: #C0C0C0;">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</span>');

        var baseObject;
        var updateRecords = false;
        var fieldsToCheck = []; //using array to keep track of 2 field legend
        var fieldToUpdate = $row.find('.updatefield-field').val();
        var queryData = $('#PlottedQueriesTable > *').eq(parseInt($row.find('.updatefield-query').val())).data();
        baseObject = queryData.options.baseObjectName;
        try {
            //check if this field is our legend field
            var queryRecord = queryData.queryRecord || {};

            //do we need to update records based on a legend?
            var colorAssignmentType = queryRecord.ColorAssignmentType__c;
            if(colorAssignmentType == "Dynamic, Field" || colorAssignmentType == "Dynamic-multiField") {

                if(colorAssignmentType == "Dynamic-multiField") {
                    if(queryRecord.ShapeField__c == fieldToUpdate) {updateRecords = true;}
                    fieldsToCheck.push(queryRecord.ShapeField__c);
                }
                if(queryRecord.PicklistField__c == fieldToUpdate) {updateRecords = true;}
                fieldsToCheck.push(queryRecord.PicklistField__c);
            }

            if(updateRecords) {
                $('#UpdateFieldPopup').find('.autoRefreshWrapper').removeClass('hidden');
            }
            else {
                $('#UpdateFieldPopup').find('.autoRefreshWrapper').addClass('hidden');
            }

            $('#UpdateFieldPopup').data({updateRecords:updateRecords,fieldsToCheck:fieldsToCheck,fieldToUpdate : fieldToUpdate});
        }
        catch(e) {
            //can't update our records, a manual refresh will be needed
        }

        //send request to get information about this field
        var processData = {
        	ajaxResource : 'TooltipAJAXResources',

        	action: 'get_editable_field',
        	baseObject: baseObject,
            fieldName: fieldToUpdate
        };

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(response, event){
                if (response.success)
                {
                    $row.find('.updatefield-value').data('fieldMetadata', response.editableField);
                    UpdateField_RenderValueField({},$row.find('.updatefield-value'));
                }
                else
                {
                }
            },{buffer:false,escape:false}
        );
    }
}
function UpdateField_Finish()
{

    //show loading
    var $status = MAToastMessages.showLoading({message:MASystem.Labels.Change_Owner_Update_Field_Status,subMessage:MASystem.Labels.Change_Owner_Updating_Records,timeOut:0,extendedTimeOut:0}).data({ batchCount: 0, successCount: 0, failureCount: 0 });
    var layersToUpdate = {};//Hold all our layer data as we loop through the rows.
    var recordsToUpdate = $('#UpdateFieldPopup').data('records') || []; //These are all records that are being updated currently via the Mass Field update.
    //Loop over all the row data and start combining like kind layer fields so that we dont send batches 1 field at a time.
    $.each($('#UpdateFieldPopup .mass-update-row'),function(k,row){
        var $row = $(row);//current mass field update row
        var queryQid = $row.find('.updatefield-query option:selected').attr('data-qid');

        //Checking to see if our layersToUpdate object already has the information we need for this plotted query
        //if not then we need to add a new object for the plotted layer that contains the records and record ids of the layer to be updated,
        //as well as any queryData and if we should autorefresh the layer after save or not.
        //We also need to assign an array to hold any field information that may be needed as we loop over the rows.
        if(!layersToUpdate.hasOwnProperty(queryQid)){
            var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+queryQid+'"]');
            var queryData = $plottedQuery.data() || {};
            var layerRecords = queryData.records;
            var queryToUpdate = $row.find('.updatefield-query').val();//$('#UpdateFieldPopup .updatefield-query').val();
            var layerRecordsToUpdate = $('#UpdateFieldPopup').data('records') || [];
            var autoRefreshQuery = $row.find('.autoRefreshQuery').prop('checked');
            layersToUpdate[queryQid] = {
                autoRefreshQuery:autoRefreshQuery,
                records:layerRecords,
                plottedQuery:$plottedQuery,
                updateInfo : [],
                recordIds : []
            };
        }
        var fieldName = $row.find('.updatefield-field').val();
        var newFieldValue = UpdateField_ExtractValueField({},$row);
        //now we just need to grab the correct plotted layer info from our layersToUpdate object and push the field api name of the field to be updated, as well as the new field value.
        layersToUpdate[queryQid].updateInfo.push({fieldName:fieldName,newFieldValue:newFieldValue});

    });
    var fieldQueue = async.queue(function (batchFieldOptions, callback) {
        var recordIds = batchFieldOptions.recordIds || [];
        var fieldUpdateInfo = batchFieldOptions.fieldUpdateInfo || [];
        var qid = batchFieldOptions.qid;
        //layerToUpdateQid = batchFieldOptions.qid;
        const plottedQuery = layersToUpdate[qid].plottedQuery;
        var tooltipQueryFields = {};
        plottedQuery.data().tooltips.forEach((element, index) => {
            element['tooltipIndex'] = index;
            tooltipQueryFields[element.FieldName] = element;
        });
        //send request to change ownership
        var processData = {
            ajaxResource : 'TooltipAJAXResources',
        	action: 'update_field',
        	serializedRecordIds : JSON.stringify(recordIds),
            fieldUpdateInfo : JSON.stringify(fieldUpdateInfo),
            tooltips: JSON.stringify(Object.keys(tooltipQueryFields))
        };
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(response, event){
        	    if(event.status) {
                    if (response && response.success)
                    {
                        //count the number of successful/failed responses
                        var failures = 0;
                        var successes = 0;
                        var failureMessage = '';
                        $.each(response.saveResults, function (index, saveResult) {
                            if (saveResult.success) {
                                successes++;
                                //update the record with new values
                                try {
                                    var recordId = saveResult.id;
                                    $.each(response.results, function (index, result) {
                    
                                        if(result.Id === recordId) {
                                            if(layersToUpdate[qid].records.hasOwnProperty(recordId)) {
                                                let record = layersToUpdate[qid].records[recordId];
                                                // looping thru the response to get the tooltip values for each - dtodd
                                                plottedQuery.data().tooltips.forEach((thisTooltipMetadata) => {
                                                    var saveValue = getProperty(result, thisTooltipMetadata.FieldName);
                                                    var updateFieldValue = getProperty(result, thisTooltipMetadata.updateField);
                                                    updateValue(record, thisTooltipMetadata.FieldName, saveValue);
                                                    if (thisTooltipMetadata.FieldName !== thisTooltipMetadata.updateField && thisTooltipMetadata.needsLink) {
                                                        var idField = thisTooltipMetadata.FieldName;
                                                        idField = idField.substring(0, idField.lastIndexOf('.')) + '.Id';
                                                        updateValue(record, thisTooltipMetadata.updateField, updateFieldValue);
                                                        updateValue(record, idField, updateFieldValue);
                                                    }
                                                });
                                                Plotting.updatePlottedQueryMarkerRecordInfo(record);
                                            }
                                        }
                                    });
                                }
                                catch(e) {
                                    console.warn(MASystem.Labels.Update_Fields_Refresh_Page,e);
                                }
                            }
                            else {
                                if(saveResult.errors) {
                                    var err = saveResult.errors[0];
                                    failureMessage += '<div>'+err.statusCode+':</div><div style="padding-left: 15px;"> ' + err.message + '</div></br>'
                                }
                                failures++;
                            }
                        });
                        //decrement the batches we have out
                        $status.data('batchCount', $status.data('batchCount') - 1);
                        $status.data('failureCount', $status.data('failureCount') + failures);
                        $status.data('successCount', $status.data('successCount') + successes);
                        $status.data('failureMessage',failureMessage);
                    }
                    else
                    {
                        //decrement the batches we have out
                        $status.data('batchCount', $status.data('batchCount') - 1);
                        $status.data('failureCount',$status.data('failureCount') + recordIds.length);
                        //check what type of error message
                        $status.data('failureMessage',response.details);
                        //$status.data('failureMessage');
                    }
        	    }
        	    else {
        	        //decrement the batches we have out
                    $status.data('batchCount', $status.data('batchCount') - 1);
                    $status.data('failureCount',$status.data('failureCount') + recordIds.length);
                    //check what type of error message
                    $status.data('failureMessage',event.message);
                    //$status.data('failureMessage');
        	    }

        	    if(MA.isMobile) {
                    $status.find('.toast-message').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
                }
                else {
                    $status.find('.loadmask-status span').not('.loader-inline').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
                }
        	    callback();
            },{buffer:false,escape:false,timeout:120000}
        );
    });

    fieldQueue.concurrency = 5;
    fieldQueue.drain = function(){
        //show status message and then close the popup
        if($status.data('failureMessage')) {
            MAToastMessages.showWarning({message: MASystem.Labels.Change_Owner_Update_Field_Status , subMessage: $status.data('successCount') + ' records updated, ' + $status.data('failureCount') + ' failure(s).'});
            MAToastMessages.hideMessage($status);
        }
        else if ($status.data('failureCount') == 0)
        {
            MAToastMessages.showSuccess({message: MASystem.Labels.Change_Owner_Update_Field_Status , subMessage: $status.data('successCount') + ' records updated, 0 failures.'});
            MAToastMessages.hideMessage($status);

            //do we need to update the query
            for(qid in layersToUpdate){
                if(layersToUpdate[qid].autoRefreshQuery) {
                    Plotting.refreshQuery(layersToUpdate[qid].plottedQuery);
                }
            }
            var isListViewOpen = document.querySelector('div[data-pendo=main-nav_list]').classList.contains('is-active');
            var isTooltipOpen = checkTooltipOpen();
            //check if both list view and tooltip are active

            if (isListViewOpen && !MA.isMobile){window.MAListView.ConstructAllTabs();}
            if (isTooltipOpen && !MA.isMobile ){
                var tooltipRecordId = $('#tooltip-content').find('div[class=name]').find('a[href]').attr('href').replace(/\//g, '');
                var recordsIdToUpdate  = recordsToUpdate.map(e => e.Id);
                if (recordsIdToUpdate.includes(tooltipRecordId) && $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`)!==0){
                    $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`).find("a[onclick*='MAListView.MarkerClick']").trigger('click');
                }
            }
        }
        else
        {
            MAToastMessages.showWarning({message: MASystem.Labels.Change_Owner_Update_Field_Status , subMessage: $status.data('successCount') + ' records updated, ' + $status.data('failureCount') + ' failure(s).'});
            MAToastMessages.hideMessage($status);
        }
    }

    var len = recordsToUpdate.length;
    var i = 0;
    setTimeout(function doBatch() {
        if(i < len) {
            var recordsProcessed = 0;
            while (recordsProcessed < 100 && i < len) {
                recordsProcessed++;
                record = recordsToUpdate[i];
                var qid = record.qid;
                
                if(layersToUpdate.hasOwnProperty(qid))
                {
                    layersToUpdate[qid].recordIds.push(record.Id);

                    if (layersToUpdate[qid].recordIds.length >= MASystem.MergeFields.MassFieldUpdateScopeSize) {
                        var fieldOptions = {
                            recordIds : layersToUpdate[qid].recordIds,
                            fieldUpdateInfo : getProperty(layersToUpdate[qid],'updateInfo',false) || [],
                            qid:qid
                        };
                        fieldQueue.push(fieldOptions, Plotting.updatePlottedQueryMarkerRecordInfo(record));
                        $status.data('batchCount', $status.data('batchCount') + 1);
                        layersToUpdate[qid].recordIds = [];
                        //UpdateField_SendBatch(recordIds,$status,{plottedQuery:$plottedQuery});
                    }
                }
                // $plottedQuery.data('macluster_marker').addMarker(record.marker);
                if (record.marker) {
                    MA.Map.spiderfier.addMarker(record.marker);
                    var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="' + qid + '"]');
                    if ($plottedQuery.data('macluster_markerGroup')) {
                        $plottedQuery.data('macluster_markerGroup').push(record.marker);
                    }
                }
                i += 1;
            }
            setTimeout(doBatch, 1);
        } else {
            for(qid in layersToUpdate){
                //send last batch
                if (layersToUpdate[qid].recordIds.length > 0) {
                    var fieldOptions = {
                        recordIds : layersToUpdate[qid].recordIds,
                        fieldUpdateInfo : getProperty(layersToUpdate[qid],'updateInfo',false) || [],
                        qid:qid
                    };
                    fieldQueue.push(fieldOptions,function(){});
                    $status.data('batchCount', $status.data('batchCount') + 1);
                    layersToUpdate[qid].recordIds = [];
                }
            }
        }

    },1)
    //Send the last of our batches so we make sure that all the records were updated
    for(qid in layersToUpdate){
        //send last batch
        if (layersToUpdate[qid].recordIds.length > 0) {
            var fieldOptions = {
                recordIds : layersToUpdate[qid].recordIds,
                fieldUpdateInfo : getProperty(layersToUpdate[qid],'updateInfo',false) || [],
                qid:qid
            };
            fieldQueue.push(fieldOptions,function(){});
            $status.data('batchCount', $status.data('batchCount') + 1);
            layersToUpdate[qid].recordIds = [];
        }


    }
}

function UpdateField_RenderValueField(options,$valueCell)
{
    options = $.extend({
        valueCell : $valueCell//$('#UpdateFieldPopup .updatefield-value')
    }, options || {});
    var $valueCell = options.valueCell;
    var fieldMetadata = $valueCell.data('fieldMetadata');
    var editType = displayTypeMetadata[fieldMetadata.DisplayType] ? displayTypeMetadata[fieldMetadata.DisplayType].editType : '';
    var renderType = displayTypeMetadata[fieldMetadata.DisplayType] ? displayTypeMetadata[fieldMetadata.DisplayType].renderType : '';

    switch (editType)
    {
        case 'string':

            $valueCell.html("<input class='ma-input' type='text' />").find('input').focus();
            break;

        case 'number':

            $valueCell.html("<input class='ma-input numberVal' type='text' />").find('input').focus();
            break;

        case 'textarea':

            $valueCell.html($("<textarea class='ma-input' />")).find('textarea').focus().select();
            break;

        case 'picklist':

            if(MA.isMobile) {
                var $picklistWrapper = $('<div class="ma-form-control icon-right"><div class="ma-icon ma-icon-down icon-right"></div><select class="combobox ma-input" /></div>');
                var $picklistOptions = $picklistWrapper.find('.ma-input');
                $.each(fieldMetadata.PicklistOptions, function (index, option) {
                    $picklistOptions.append($('<option />').attr('value', option.value).text(option.label));
                });

                $valueCell.html($picklistWrapper);
            }
            else {
                var $picklistOptions = $('<select class="combobox" />');
                $.each(fieldMetadata.PicklistOptions, function (index, option) {
                    $picklistOptions.append($('<option />').attr('value', option.value).text(option.label));
                });

                $valueCell.html($picklistOptions).find('.combobox').combobox().next().find('input').focus().select();
            }
            break;

        case 'multipicklist':
            if(MA.isMobile) {
                var $picklistWrapper = $('<div class="ma-form-control icon-right"><div class="ma-icon ma-icon-down icon-right"></div><select style="overflow: auto;" multiple="multiple" class="multiselect ma-input" /></div>');
                var $picklistOptions = $picklistWrapper.find('.ma-input');
                $.each(fieldMetadata.PicklistOptions, function (index, option) {
                    $picklistOptions.append($('<option />').attr('value', option.value).text(option.label));
                });

                $valueCell.html($picklistOptions);
            }
            else {
                var $picklistOptions = $('<select class="multiselect" />');
                $.each(fieldMetadata.PicklistOptions, function (index, option) {
                    $picklistOptions.append($('<option />').attr('value', option.value).text(option.label));
                });

                $valueCell.html($picklistOptions).find('.multiselect').multiselect({
                    noneSelectedText: 'Click here to select options',
                    selectedList: 2
                }).multiselectfilter().multiselect('uncheckAll');
            }
            break;

        case 'boolean':
            if(MA.isMobile) {
                $valueCell.html("<label class='ma-checkbox'><input type='checkbox' /><span class='ma-checkbox-faux'></span></label>").find('input').focus();
            }
            else {
                $valueCell.html("<input type='checkbox' />").find('input').focus();
            }
            break;

        case 'date':
            if(MA.isMobile) {
                $valueCell.html("<input placeholder='Select a date' type='text' class='date ma-input ma-datepicker slds-input' />").find('input').datepicker({ dateFormat: formatUserLocaleDate({datepicker   : true}) }).focus();
            }
            else {
                $valueCell.html("<input type='text' class='date slds-input' />").find('input').datepicker({ dateFormat: formatUserLocaleDate({datepicker   : true}) }).focus();
            }
            break;
        case 'datetime':
            var dateTimeGrid = '<div class="slds-grid slds-grid_vertical-align-center date-time-grid">';
            var timeSelect = $('#updateFields-datetime-template .date-time-col').clone();
            if(MA.isMobile) {
                dateTimeGrid += "<div slds-col><input placeholder='Select a date' type='text' class='date ma-input ma-datepicker slds-input' /></div>";
            }
            else {
                dateTimeGrid += "<div slds-col><input type='text' class='date slds-input' /></div>";
            }

            dateTimeGrid += '</div>';
            $valueCell.html(dateTimeGrid).find('.date-time-grid').append(timeSelect).find('input').datepicker({ dateFormat: formatUserLocaleDate({datepicker   : true}) }).addClass('slds-input').focus();


            break;
        case 'time':
            var timeSelect = $('#updateFields-time-template .time-col').clone();            
            $valueCell.html(timeSelect);
            break;
        case 'reference':
            if(MA.isMobile) {
                var html = '<div class="ma-form-control icon-left"><input class="ma-input autocomplete" type="text" placeholder="'+ MASystem.Labels.slds_picklist_search +'"/><div class="MAIcon ion-android-search" style="color: #54698d;position: absolute;top: 9px;left: 14px;font-size: 16px;"></div></div>';
                $valueCell.html(html).find('input').focus();
                var $lookup = $valueCell.find('.autocomplete');

                $valueCell.off('click','.autocomplete '); //remove any previous
                $valueCell.on('click', '.autocomplete ',function() {
                    MALayers.showModal('dynamicSearchModal');
                    $('#dynamicSearchModal').removeData();

                    //add modal hide functionality
                    $('#dynamicSearchModal').off('click','.hideDynamicModal');
                    $('#dynamicSearchModal').on('click','.hideDynamicModal',function() {
                        MALayers.hideModal('dynamicSearchModal',false);
                    });

                    //keep track of origin
                    $('#dynamicSearchModal').data('domOrigin',$(this));
                    //clear any previous
                    $('#searchDynamicInput').val('');
                    var $searchModal = $('#dynamicSearchModal');
                    $searchModal.find('.search-empty-state').removeClass('hidden');
                    $searchModal.find('.search-results-wrapper').addClass('hidden');
                    $('#searchDynamicInput').focus();

                    //remove any previous event listener
                    $('#dynamicSearchModal').off('keyup','#searchDynamicInput');

                    //attach event listener to input
                    $('#dynamicSearchModal').on('keyup','#searchDynamicInput',function () {
                        var $input = $(this);
                        var searchTerm = $input.val();
                        var $searchModal = $('#dynamicSearchModal');
                        var $searchResults = $searchModal.find('.search-table-view').empty();
                        if (searchTimeout !== null) {
                            clearTimeout(searchTimeout);
                        }

                        if(searchTerm === '') {
                            $searchModal.find('.search-empty-state').removeClass('hidden');
                            $searchModal.find('.search-results-wrapper').addClass('hidden');
                            return;
                        }

                        searchTimeout = setTimeout(function() {
                            searchTimeout = null;
                            var $favLoading = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading,timeOut:0,extendedTimeOut:0});

                            var lookupOptions = {
                                searchTerm: searchTerm,
                                baseObject: fieldMetadata.BaseObject,
                                fieldName: fieldMetadata.ActualFieldName
                            }

                            getLookupOptions(lookupOptions).then(function(res) {
                                var resultHTML = '';
                                var lookupOptionsData = res || [];
                                var lookupOptionsLength = lookupOptionsData.length;
                                var resultHTML = '';
                                if(lookupOptionsLength === 0) {
                                    //show no results
                                    $searchResults.html('<li class="table-view-cell">No Results</li>');
                                }
                                else {
                                    $.each(lookupOptionsData, function (index, data) {
                                        resultHTML += '<li class="table-view-cell lookupSuccess" data-id="'+htmlEncode(data.value)+'">'+htmlEncode(data.label)+'</li>';
                                    });

                                    $searchResults.html(resultHTML);

                                    //attach click handler to rows
                                    $searchResults.off('click','.lookupSuccess');
                                    $searchResults.on('click','.lookupSuccess',function () {
                                        var $row = $(this);
                                        var dataId = $row.attr('data-id');
                                        var rowVal = $row.text();

                                        var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                                        $searchOriginLocation.attr('data-id',dataId).val(rowVal);

                                        //hide modal
                                        MALayers.hideModal('dynamicSearchModal',false);

                                        var selection = {
                                            Name : rowVal,
                                            Id : dataId
                                        };
                                    });
                                }
                            }).fail(function(err) {
                                $searchResults.html('<li class="table-view-cell">No Results</li>');
                            }).always(function() {
                                $searchModal.find('.search-empty-state').addClass('hidden');
                                $searchModal.find('.search-results-wrapper').removeClass('hidden');
                                MAToastMessages.hideMessage($favLoading);
                                $favLoading = null;
                            });
                        },500);
                    });

                    $('#dynamicSearchModal').off('click','.clearOriginInput');

                    $('#dynamicSearchModal').on('click','.clearOriginInput',function () {
                        var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                        $searchOriginLocation.removeAttr('data-id').val('');
                    });
                    $('#dynamicSearchModal').off('click','.hideDynamicModal');
                    $('#dynamicSearchModal').on('click','.clearOriginInput',function () {
                        var $searchOriginLocation = $('#dynamicSearchModal').data('domOrigin');

                        $searchOriginLocation.removeAttr('data-id').val('');
                    });

                    //add modal hide functionality
                    $('#dynamicSearchModal').on('click','.hideDynamicModal',function() {
                        MALayers.hideModal('dynamicSearchModal',true);
                    });
                });

                /*$lookup.select2({
                    ajax: {
                        delay: 250,
                		transport: function (params, success, failure) {
                			var paramData = params.data || {};
                			var searchTerm = paramData.term || '';
                			var processData = {
    							ajaxResource : 'TooltipAJAXResources',

    							action: 'get_lookup_options',
    							baseObject: fieldMetadata.BaseObject,
                                fieldName: fieldMetadata.ActualFieldName,
                                term: searchTerm
    						};

    						var request = Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    							processData,
    							function(successResponse, event){
    							    var results = [];
    							    if(successResponse) {
    							        $.each(successResponse.lookupOptions, function (index, lookup) {
                                            results.push({
                                                id: lookup.value,
                                                text: lookup.label
                                            });
                                        });
    							    }
                                    success(results);
                                },{buffer:false,escape:false}
                            );
                			return request;
                		},
                		processResults: function(resp,page){
                		    return {
                				results : resp
                			}
                		}
                	},
                    placeholder: "Search...",
                    minimumInputLength: 2,
                    dropdownCssClass : 'needsclick',
                    containerCssClass : 'needsclick',
                    templateResult: function(result, container) {
                        if (!result.id) {
                            return result.text;
                        }
                        container.className += ' needsclick';
                        return result.text;
                    }
                });*/
            }
            else {

                var $lookup = $('<input type="text" class="autocomplete" />');
                $valueCell.html($lookup).find('input').focus();

                $lookup.autocomplete({
                    focus: function (event, ui) {
                        $lookup.val(ui.item.label);
                        return false;
                    },
                    select: function (event, ui) {
                        $lookup.val(ui.item.label).data('selectedItem', ui.item);
                        event.stopPropagation();
                        return false;
                    },
                    search: function () {
                        $lookup.addClass('searching');
                    },
                    source: function(request, response) {
                        var processData = {
                        	ajaxResource : 'TooltipAJAXResources',

                        	action: 'get_lookup_options',
                        	baseObject: fieldMetadata.BaseObject,
                            fieldName: fieldMetadata.ActualFieldName,
                            term: request.term
                        };

                        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                        	processData,
                        	function(successResponse, event){
                        	    $lookup.removeClass('searching');
                                if (!successResponse.success)
                                {
                                    response([]);
                                    return;
                                }

                                response(successResponse.lookupOptions);

                            },{buffer:false,escape:false}
                        );
                    }
                });
            }
            break;

        default:

            //no matching type so do nothing
            if(MA.isMobile) {
                $valueCell.html('<h4 style="font-style: italic; color: #C0C0C0;">Invalid Field Type...</h4>');
            }
            else
                $valueCell.html('<span style="font-size: 10px; font-style: italic; color: #C0C0C0;">Invalid Field Type...</span>');
            return;
    }
}

function UpdateField_ExtractValueField(options,$row)
{
    options = $.extend({
        valueCell : $row.find('.updatefield-value')//$('#UpdateFieldPopup .updatefield-value')
    }, options || {});
    var $valueCell = options.valueCell;
    var fieldMetadata = $valueCell.data('fieldMetadata');
    var fieldMetaDisplayType = fieldMetadata ? getProperty(fieldMetadata,'DisplayType',false) : '';
    var displayTypeForEditType = displayTypeMetadata[fieldMetaDisplayType];
    var editType = displayTypeForEditType ? getProperty(displayTypeForEditType,'editType',false) : '';

    switch (editType)
    {
        case 'string':

            return $valueCell.find('input').val();
            break;

        case 'number':

            return MA.Util.parseNumberString($valueCell.find('input').val());
            break;

        case 'textarea':

            return $valueCell.find('textarea').val();
            break;

        case 'picklist':

            return $valueCell.find('select').val();
            break;

        case 'multipicklist':
            if(MA.isMobile) {
                var selectArr = $valueCell.find('.multiselect').val() || [];
                return selectArr.join(';');
            }
            else {
                return $valueCell.find('.multiselect').multiselect('getChecked').map(function () {
                    return this.value;
                }).get().join(';');
            }
            break;

        case 'boolean':

            return $valueCell.find('input').is(':checked');
            break;

        case 'date':

            return $valueCell.find('input').val();

            break;
        case 'datetime':
            var dateVal = $valueCell.find('input').val();
            var hr = $valueCell.find('.hr').val();
            var min =$valueCell.find('.min').val();
            var timeMarker = $valueCell.find('.am-pm').val();

            if (dateVal == '') {
                return '';
            }

            var inputFormat = formatUserLocaleDate({datepicker: true}).replace('yy', 'YYYY').replace('mm', 'MM').replace('dd', 'DD') + ' hh:mm a';
            var outputFormat = formatUserLocaleDate({moment: true});
            return moment(dateVal + ' ' + hr + ':' + min + ' ' + timeMarker, inputFormat).format(outputFormat);

            break;
        case 'time':
            var hr = $valueCell.find('.hr').val();
            var min = $valueCell.find('.min').val();
            var timeMarker = $valueCell.find('.am-pm').val();

            if (hr == '--' || min == '--' || parseInt(hr) == NaN || parseInt(min) == NaN) {
                return '';
            }

            hr = parseInt(hr);

            if (timeMarker) {
                if (hr < 12 && timeMarker.toLowerCase() == 'pm') {
                    hr += 12;
                }
                else if (hr == 12 && timeMarker.toLowerCase() == 'am') {
                    hr = 0;
                }
            }

            return hr + ':' + min;
            break;
    
        case 'reference':

            try {
                if(MA.isMobile) {
                    return $valueCell.find('.autocomplete').val();
                }
                else {
                    return $valueCell.find('.autocomplete').data('selectedItem').value;
                }
            }
            catch (err) {
                return '';
            }
            break;

        default:

            //no matching type so return blank
            return '';
    }
}

/******************************
 *
 * End Update Field Logic
 *
 ******************************/

/* Event Handling */
$(function () {

    /* Menu Buttons */
    $('body').on('click', '.top-row-button, .menubutton', function () {

        //$('#visibleAreaRefeshMap').hide();

        //toggle the visibility for this menu
        var $menubutton = $(this);
        $menubutton.find('.menu').css('top', $menubutton.outerHeight() + 'px').slideToggle(300, function() {
            if($menubutton.find('.menu')[0].style.display == 'none') {
                $('#visibleAreaRefeshMap').addClass('visible');
            } else {
                $('#visibleAreaRefeshMap').removeClass('visible');
            }
        });



        //attempt to fit the entire menu in the viewport
        var windowWidth = $(window).width();
        var menuWidth = $menubutton.find('.menu').outerWidth();
        var menuButtonOffsetX = $menubutton.offset().left - $(window).scrollLeft();
        if (menuButtonOffsetX + menuWidth > windowWidth && menuWidth < windowWidth)
        {
            //the menu would be forced out of the viewport so move it to the left
            $menubutton.find('.menu').css('left', ((menuWidth - (windowWidth - menuButtonOffsetX)) * -1) + 'px');
        }

        //close all other menubuttons
        $('.menu').not($menubutton.find('.menu')).slideUp(300);
    });
    $('body').on('click', '.top-row-button .menu, .menubutton .menu', function (event) {

        //stop event propagation (which will end up closing the menu) if this menu is persistent
        if ($(this).is('.persistent')) {
            event.stopPropagation();
        }

    });


    /* Grids */
    $('.grid-wrapper .filter-text, .grid-blue .filter-number').keyup(grid_Search);
    $('.grid-wrapper .filter-calendar').datepicker({ onSelect: grid_Search });
    $('.grid-wrapper .grid-page').change(grid_UpdatePage);
});

var displayTypeMetadata = {
    'STRING': {
        editType    : 'string',
        renderType  : 'text'
    },
    'EMAIL': {
        editType    : 'string',
        renderType  : 'text'
    },
    'LOCATION': {
        editType    : 'string',
        renderType  : 'text'
    },
    'COMBOBOX': {
        editType    : 'string',
        renderType  : 'text'
    },
    'PHONE': {
        editType    : 'string',
        renderType  : 'html'
    },
    'URL': {
        editType    : 'string',
        renderType  : 'html'
    },
    'DOUBLE': {
        editType    : 'number',
        renderType  : 'text'
    },
    'PERCENT': {
        editType    : 'number',
        renderType  : 'text'
    },
    'INTEGER': {
        editType    : 'number',
        renderType  : 'text'
    },
    'CURRENCY': {
        editType    : 'number',
        renderType  : 'text'
    },
    'TEXTAREA': {
        editType    : 'textarea',
        renderType  : 'text'
    },
    'PICKLIST': {
        editType    : 'picklist',
        renderType  : 'text'
    },
    'MULTIPICKLIST': {
        editType    : 'multipicklist',
        renderType  : 'text'
    },
    'BOOLEAN': {
        editType    : 'boolean',
        renderType  : 'text'
    },
    'REFERENCE': {
        editType    : 'reference',
        renderType  : 'html'
    },
    'DATE': {
        editType    : 'date',
        renderType  : 'text'
    },
    'DATETIME': {
        editType    : 'datetime',
        renderType  : 'text'
    },
    'TIME': {
        editType    : 'time',
        renderType  : 'text'
    }
};

function ma_navigateToSObject(recordId) {
    if(typeof sforce != 'undefined' && sforce.one && MA.isMobile) {
        sforce.one.navigateToSObject(recordId);
    } else {
        //not salesforce 1
        if(!window.open('/'+recordId+'','_blank')) {
            window.open('/'+recordId+'','_parent')
        } else {
            console.warn('Unable to open record info.');
            // MAToastMessages.showWarning({message: 'Unable to open record info.'})
        }
    }
}

function ma_navigateToUrl (url,type,target) {
    //target will not work for sf1, only classic
    target = String(target || 'blank');
    //validate our param
    if(target.indexOf('blank') > -1){target = '_blank';}
    else if(target.indexOf('parent') > -1){target = '_parent';}
    else if(target.indexOf('self') > -1){target = '_self';}
    else if(target.indexOf('top') > -1){target = '_top';}
    else {target = '_blank';}

    //default our type and make sure a url was passed
    type = type || 'url'
    if(url == 'Not Available' || url == '' || url == undefined) {
        MA.log('navigateToUrl function error', 'error: Invalid URL: ' + url);
        return;
    }
    //are we in lightning?
    if (typeof(sforce) == 'object' && typeof(sforce.one) == 'object')
    {
        switch(type) {
            case 'tel' :
            case 'telephone' :
                sforce.one.navigateToURL('tel:'+url);
                break;
            case 'url' :
            default :
                sforce.one.navigateToURL(url);
        }
    }
    else {
        switch(type) {
            case 'tel' :
            case 'telephone' :
                window.open('tel:' + url,target);
                break;
            case 'url' :
            default :
                window.open(url,target);
        }
    }
}

//google places search
/*function autoCompleteSearch (searchText, options) {
 var deferred = $.Deferred();
 options = $.extend({
 'type' : 'query'
 }, options || {});
 if(searchText === '') {
 deferred.resolve([]);
 }
 else {//getPlacePredictions
 var autocompleteService = new google.maps.places.AutocompleteService();

 //set up request data
 var request = {
 input: searchText,
 bounds : MA.map.getBounds()
 };

 //get results
 if(options.type === 'query') {
 autocompleteService.getQueryPredictions(request, function (predictions, status) {
 if (status == google.maps.places.PlacesServiceStatus.OK) {
 deferred.resolve(predictions);
 }
 else {
 deferred.resolve([]);
 }
 });
 }
 else {
 autocompleteService.getPlacePredictions(request, function (predictions, status) {
 if (status == google.maps.places.PlacesServiceStatus.OK) {
 deferred.resolve(predictions);
 }
 else {
 deferred.resolve([]);
 }
 });
 }
 }

 return deferred.promise();
 }*/

function autoCompleteSearch (searchTerm,queryType) {
    var deferSearch = jQuery.Deferred();
    searchTerm = searchTerm || '';
    queryType = queryType == null ? 'queryAutocomplete' : queryType;
    var center = MA.map.getCenter();
    var lat = center.lat();
    var lng = center.lng();
    var radius = queryType == null ? 8000 : 50000; //default to about 5 miles
    
    try {
        var bounds = MA.map.getBounds();
        radius = Math.round(google.maps.geometry.spherical.computeDistanceBetween(center, bounds.getNorthEast()));
    }
    catch(e) {}

    if(searchTerm === '') {
        deferSearch.resolve({success:false,message:MASystem.Labels.MA_Enter_Search_Term});
        return;
    }

    Visualforce.remoting.Manager.invokeAction(MARemoting.placeSearch,
        searchTerm,
        lat,
        lng,
        radius,
        queryType,
        function(result, event){
            if(event.status) {
                deferSearch.resolve(result);
            }
            else {
                var message = event.message || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                deferSearch.resolve({success:false,message:message});
            }
        },
        {buffer:false}
    );

    return deferSearch.promise();
}

function placesSearch (searchText, options) {
    var deferred = $.Deferred();
    options = $.extend({
        'type' : 'query'
    }, options || {});
    if(searchText === '') {
        deferred.resolve([]);
    }
    else {//getPlacePredictions
        var placeService = new google.maps.places.PlacesService(MA.map);

        //set up request data
        var request = {
            query: searchText,
            bounds : MA.map.getBounds()
        };

        //get results
        placeService.textSearch(request, function(results,status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                deferred.resolve(results);
            }
            else {
                deferred.resolve([]);
            }
        });
    }

    return deferred.promise();
}

var c2c = {
    cancel_c2c : function () {
        MA.Popup.closeMAPopup();
    },

    launch_popupV2 : function (options) {
        // this existed to fix SF overwritting native Map var, removing on 1/29/18
        // try {
        //     //if not lightning, clear out the map
        //     if(typeof Map === 'function' && (typeof sforce === 'object' && !sforce.one)) {
        //         Map = undefined;
        //     }
        // }
        // catch(e) {}

        //launch the popup
        var popup;
        if(MA.isMobile) {
            //reset the popup
            var $c2cPopup = $('#CreateRecordPopupV2');
            $c2cPopup.find('.step2').addClass('hidden');
            $c2cPopup.find('.step1').removeClass('hidden');
            $c2cPopup.find('.createrecord2-step1').show();
            $c2cPopup.find('.createrecord2-step2').hide();
            $c2cPopup.find('.c2cLoadingWrapper').hide();
            MALayers.showModal('CreateRecordPopupV2');
        }
        else {
            var popup = MA.Popup.showMAPopup({
                template: $('#templates .CreateRecordPopup').clone(),
                popupId : 'CreateRecordPopupV2',
                width : 500,
                title: MASystem.Labels.Click2Create_CreateARecord,
                buttons: [
                    {
                        text: MASystem.Labels.MA_Cancel,
                        type: 'slds-button_neutral',
                    },
                    {
                        text: MASystem.Labels.MA_Next,
                        type: 'slds-button_brand step1',
                        keepOpen : true,
                        onclick: c2c.CreateRecord_Step1_Continue
                    },
                    {
                        text: MASystem.Labels.MA_Create_Record,
                        type: 'slds-button_brand step2 js-finishC2C hidden',
                        keepOpen : true,
                        //keepOpen : true,
                        onclick: c2c.CreateRecord_Step2_Continue
                    }
                ]
            });

            //create select2
            $("#CreateRecordPopupV2 .select2-input").select2();

			//select2 hide search
// 			$("#CreateRecordPopupV2 .select2-input-hide-search").select2({
// 				minimumResultsForSearch: Infinity
// 			});
        }

        MA.Popup.showLoading({display:true, popupId: 'CreateRecordPopupV2'});
        $('#CreateRecordPopupV2').data('popup',popup);

        var $objectPicklist = $('#CreateRecordPopupV2 .createrecord2-object').empty();

        var processData = {
        	ajaxResource : 'TooltipAJAXResources',
        	action: 'getClick2CreateSettings'
        };

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(response, event){
                if (response.success) {
                    userSettings.click2CreateSettings = $.extend({ settings: MA.Util.removeNamespace(response.settings) }, options);
                    $.each(userSettings.click2CreateSettings.settings, function (objName, setting) {
                        if (setting.record[options.type+'Enabled__c']) {
                            $objectPicklist.append($('<option />').attr('value', objName).text(setting.objectLabel));
                        }
                    });

                    if ($objectPicklist.find('option').length == 0) {
                        if(MA.isMobile) {
                            MALayers.hideModal();
                        }
                        else {
                            popup.close();
                        }
                        //show error message
                        MA.Popup.showMAAlert({
                            title: MASystem.Labels.Drop_Pin_Could_Not_Drop_Pin,
                            template: MASystem.Labels.Drop_Pin_Ask_Admin_For_C2C,
                            okText : MASystem.Labels.MA_Ok,
                            okType : 'slds-button_brand'
                        });
                    }
                    else {
                        $objectPicklist.change();
                    }

                    userSettings.click2CreateSettings.geoResponse = null;
                    if (options.place) {
                        var resultMap = {};
                        var formattedAddress = getProperty(options,'place.formatted_address') || '';
                        var StreetAddressOrder = {
                            'street_number' : 0,
                            'route' : 1,
                            'subpremise' : 100
                        };
                        $.each(options.place.address_components, function (i, component) {
                            $.each(component.types, function (j, type) {

                                //compare formatted address order
                                if(type === "street_number" || type === "route" || type === "subpremise") {
                                    var longName = component['long_name'];
                                    var shortName = component['short_name'];
                                    var longOrderIndex = formattedAddress.indexOf(longName);
                                    var shortOrderIndex = formattedAddress.indexOf(shortName);
                                    if(longOrderIndex > -1) {
                                        StreetAddressOrder[type] = longOrderIndex;
                                    }
                                    if(shortOrderIndex > -1) {
                                        StreetAddressOrder[type] = shortOrderIndex;
                                    }
                                    //StreetAddressOrder[type] = orderIndex;
                                }


                                //Add in the state code
                                if(type === 'administrative_area_level_1') {
                                    resultMap['state_code'] = component['short_name'];
                                }

                                //Add in the country code
                                if(type === 'country') {
                                    resultMap['country_code'] = component['short_name'];
                                }

                                resultMap[type] = component['long_name'];
                            });
                        });
                        userSettings.click2CreateSettings.geoResponse = {
                            result: {
                                IsBadAddress        : false,
                                Label               : 'ROOFTOP',
                                Relevance           : 100,
                                Latitude            : options.place.geometry.location.lat(),
                                Longitude           : options.place.geometry.location.lng(),
                                FormattedAddress    : options.place.formatted_address,
                                HouseNumber         : resultMap['street_number'] || '',
                                Street              : resultMap['route'] || '',
                                City                : resultMap['postal_town'] || resultMap['locality'] || '',
                                County              : resultMap['administrative_area_level_2'] || '',
                                State               : resultMap['administrative_area_level_1'] || '',
                                PostalCode          : resultMap['postal_code'] || '',
                                District            : resultMap['neighborhood'] || '',
                                Country             : resultMap['country'] || '',
                                StateCode           : resultMap['state_code'] || '',
                                CountryCode         : resultMap['country_code'] || ''
                            }
                        };
                        //complete street address (house number + route + subpremise)
                        var completeStreetAddressParts = [];
                        if (resultMap['street_number']) {
                            completeStreetAddressParts.push(resultMap['street_number']);
                        }
                        if (resultMap['route']) {
                            if(StreetAddressOrder.route > StreetAddressOrder.street_number) {
                                completeStreetAddressParts.push(resultMap['route']);
                            }
                            else {
                                completeStreetAddressParts.unshift(resultMap['route']);
                            }
                        }
                        if (resultMap['subpremise']) {
                            completeStreetAddressParts.push('#' + resultMap['subpremise']);
                        }
                        userSettings.click2CreateSettings.geoResponse.result['CompleteStreetAddress'] = completeStreetAddressParts.join(' ');
                    }
                }
                else if (!response.success) {
                    if(MA.isMobile) {
                        MALayers.hideModal();
                    }
                    else {
                        popup.close();
                    }
                    //show error message
                    MA.Popup.showMAAlert({
                        title: 'Click2Create&trade; Error',
                        template: response.message,
                        okText : MASystem.Labels.MA_Ok,
                        okType : 'slds-button_brand'
                    });
                }
                else {
                    if(MA.isMobile) {
                        MALayers.hideModal();
                    }
                    else {
                        popup.close();
                    }
                    MA.Popup.showMAAlert({
                        title: 'Click2Create&trade; Error',
                        template: MASystem.Labels.MA_Something_Went_Wrong,
                        okText : MASystem.Labels.MA_Ok,
                        okType : 'slds-button_brand'
                    });
                }
            },{buffer:false,escape:false}
        );


    },

    CreateRecord_Object_Change : function () {
        MA.Popup.showLoading({display:true, popupId: 'CreateRecordPopupV2'})

        var setting = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()];

		c2c.fieldMappings = {};
        
        var $batchPushSettingPicklist = $('#CreateRecordPopupV2 .createrecord2-arcgisbatchpushsetting');
        var $recordTypeWrapper = $('#CreateRecordPopupV2 .createrecord-formitem.arcgis-form-element');
        var $recordTypePicklist = $('#CreateRecordPopupV2 .createrecord2-recordtype');
        var arcPickList = $('#CreateRecordPopupV2 .updatefield-arc-field-wrapper');

        
        resetArcGISRelatedElements();
        hideArcGISRelatedElements();
        return;

        function resetArcGISRelatedElements() {
            $recordTypePicklist.empty();
            arcPickList.hide();
            $batchPushSettingPicklist.empty().hide();

            $recordTypePicklist.closest('.createrecord-formitem').hide();
            $batchPushSettingPicklist.closest('.createrecord-formitem').hide();
        }
        
        function hideArcGISRelatedElements() {
            $recordTypeWrapper.hide();
            $batchPushSettingPicklist.hide();
            $('.ma-form-control-wrap.updatefield-field-wrapper').show();
            var totalType = 0;
            var masterInfo = {
                html : null,
                found : false
            };
            $.each(setting.recordTypes, function (i, recordType) {
                if (recordType.available && !recordType.isPersonRecordType) // we don't show person account record types as an option
                {
                    totalType++;
                    if (recordType.recordTypeId == '012000000000000AAA')
                    {
                        if (setting.recordTypes.length > 1)
                        {
                            //not sure why we are not showing master... if nothing is avaiable from the total, nothing get shown
                            //addressing above with totalType count.
                            masterInfo.found = true;
                            masterInfo.html = $('<option />').attr('value', recordType.recordTypeId).text(recordType.name + ' (System Default)');
                        }
                        else
                        {
                            $recordTypePicklist.append($('<option />').attr('value', recordType.recordTypeId).text(recordType.name + ' (System Default)'));
                        }
                    }
                    else
                    {
                        $recordTypePicklist.append($('<option />').attr('value', recordType.recordTypeId).text(recordType.name));
                    }

                    if (recordType.defaultRecordTypeMapping)
                    {
                        $recordTypePicklist.val(recordType.recordTypeId);
                    }
                }
            });

            if(masterInfo.found && totalType == 1) {
                //we need to put in the master record
                if(masterInfo.html != null) {
                    $recordTypePicklist.append(masterInfo.html);
                }
            }

            if ($recordTypePicklist.find('option').length > 0) {
                $recordTypePicklist.closest('.createrecord-formitem').show();
            }

            MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'})
        }
    },

    CreateRecord_Step1_Continue: function () {
        var type = userSettings.click2CreateSettings.type;
        var setting = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()];
        $('#CreateRecordPopupV2 .createrecord2-fieldset-errors').hide();

        var recordTypeId = $('#CreateRecordPopupV2 .createrecord2-recordtype').val();
        var batchPushSetting = $('#CreateRecordPopupV2 .createrecord2-arcgisbatchpushsetting').val();
        if (batchPushSetting)
        {
            recordTypeId = c2c.fieldMappings[batchPushSetting].recordTypeId;
            $('#CreateRecordPopupV2 .createrecord2-recordtype').append($('<option />').attr('value', recordTypeId));
        }

        var fieldSetName = 'missing';

		if (setting.record.FieldSetOptions__c != undefined)
        {
            var FieldSetOptionsArray = JSON.parse(setting.record.FieldSetOptions__c);

            $.each(FieldSetOptionsArray, function (i, recordType) {
                if (recordTypeId == recordType.RecordTypeId)
                {
                    if (type == "MyPosition")
                    {
                        fieldSetName = recordType.MyPositionFieldSetAPIName;
                    }
                    else if (type == "POI")
                    {
                        fieldSetName = recordType.POIFieldSetAPIName;
                    }
                    else if (type == "MapClick")
                    {
                        fieldSetName = recordType.MapClickFieldSetAPIName;
                    }
                }
            });

        }
        else
        {
            fieldSetName = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()].record[userSettings.click2CreateSettings.type+'FieldSet__c'];
        }

        if (fieldSetName == 'missing')
        {
            alert('Unable to find Field Set, please contact your administrator');
        }
        else
        {
            //hide the step 1 button , show step 2
            $('#CreateRecordPopupV2 .step1').addClass('hidden');
            $('#CreateRecordPopupV2 .createrecord2-step1').hide();
            $('#CreateRecordPopupV2 .step2').removeClass('hidden');
            $('#CreateRecordPopupV2 .createrecord2-step2').show();
            MA.Popup.showLoading({display:true, popupId: 'CreateRecordPopupV2'})
            $("#CreateRecordPopupV2 .createrecord-fieldset").html(MASystem.Labels.MA_Loading_With_Ellipsis);
            var platformOverride = true;
            function showFields(res){
                //this is messy, but should at least show the form
                try{
                    var resText = res.responseText;
                    //remove sf page redirect injected code
                    resText = resText.replace('top.location=location;','console.warn(e);');
					$("#CreateRecordPopupV2 .createrecord-fieldset").html(resText);
                }
                catch (e){
                    MA.log('first failed',e);
                    try {
                        //Salesforce is trying to redefined a variable that results in type error
                        // fall back to javascript attempt
                        var jsSelector = $("#CreateRecordPopupV2 .createrecord-fieldset")[0];
                        jsSelector.innerHTML = res.responseText;
                    }
                    catch(e) {
                        MA.log('all failed',e);
                        //jquery and javascript failed
                        //need to stop and show error.
                        MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'});
                    }
                }
                function reverseGeocodeComplete (geoResponse)
                {

                    if (userSettings.click2CreateSettings.type == 'MyPosition')
                    {
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['MyPositionName__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.name); } catch (err) {}

                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['DefaultField__c']+'"]').find('.get-input').val(setting.record['MyPositionDefaultValue__c']); } catch (err) {}
                    }
                    else if (userSettings.click2CreateSettings.type == 'POI')
                    {
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['POIName__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.name); } catch (err) {}
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['POIPhone__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.phone || ''); } catch (err) {}
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['POIWebsite__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.website || ''); } catch (err) {}
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['DefaultField__c']+'"]').find('.get-input').val(setting.record['POIDefaultValue__c']); } catch (err) {}
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record['POIStateShort__c']+'"]').find('.get-input').val(geoResponse.result.StateCode); } catch (err) {}
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record['POICountryShort__c']+'"]').find('.get-input').val(geoResponse.result.CountryCode); } catch (err) {}
                    }
                    else if (userSettings.click2CreateSettings.type == 'MapClick')
                    {
                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['MapClickName__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.name); } catch (err) {}


                        try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record['DefaultField__c']+'"]').find('.get-input').val(setting.record['MapClickDefaultValue__c']); } catch (err) {}
                    }

                    try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record[type+'Street__c']+'"]').find('.get-input').val(geoResponse.result.CompleteStreetAddress); } catch (err) {}
                    try { $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record[type+'City__c']+'"]').find('.get-input').val(geoResponse.result.City); } catch (err) {}
                    try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record[type+'State__c']+'"]').find('.get-input').val(geoResponse.result.State); } catch (err) {}
                    try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record[type+'PostalCode__c']+'"]').find('.get-input').val(geoResponse.result.PostalCode); } catch (err) {}
                    try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record[type+'Country__c']+'"]').find('.get-input').val(geoResponse.result.Country); } catch (err) {}

                    try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record[type+'Latitude__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.position.lat()); } catch (err) {MA.log(err);}
                    try { $('#CreateRecordPopupV2 .createrecord-fieldset  .fieldInput[data-field="'+setting.record[type+'Longitude__c']+'"]').find('.get-input').val(userSettings.click2CreateSettings.position.lng()); } catch (err) {}
                    MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'});

                } //end function reverseGeocodeComplete (geoResponse)

                if (userSettings.click2CreateSettings.geoResponse)
                {
                    reverseGeocodeComplete(userSettings.click2CreateSettings.geoResponse);
                }
                else
                {
                    MA.Geocoding.reverseGeocode({ latLng: userSettings.click2CreateSettings.position }, function (geoResponse) {
                        userSettings.click2CreateSettings.geoResponse = geoResponse;
                        reverseGeocodeComplete(geoResponse);
                    });
                }
            }

			if (batchPushSetting)
			{
                $.ajax({
                    url: MA.resources.Click2Create,
                    type: 'GET',
                    dataType: 'HTML',
                    data: {
                        sobject : $('#CreateRecordPopupV2 .createrecord2-object').val(),
                        fieldset : fieldSetName,
                        recordtypeid :  (recordTypeId || ''),
                        platform : (platformOverride ? 'desktop' : 'tablet'),
                        arcgisFieldMappings: JSON.stringify(c2c.fieldMappings[batchPushSetting].fieldMappings)
                    }
                })
                .done(function(data,textStatus,res){
                    showFields(res);
                });
			}
			else
			{
				$.ajax({
					url: MA.resources.Click2Create,
					type: 'GET',
					dataType: 'HTML',
					data: {
						sobject : $('#CreateRecordPopupV2 .createrecord2-object').val(),
						fieldset : fieldSetName,
						recordtypeid :  (recordTypeId || ''),
						platform : (platformOverride ? 'desktop' : 'tablet')
					}
				})
				.done(function(data,textStatus,res){
					showFields(res);
				});

			}
        }
    },

    CreateRecord_Step2_Continue: function () {
        MA.Popup.showLoading({display:true, popupId: 'CreateRecordPopupV2'});
        var $c2cLoading = MAToastMessages.showLoading({message: MASystem.Labels.MA_Creating_Record, timeOut:0,extendedTimeOut:0});
        $('#CreateRecordPopupV2 .js-finishC2C').attr('disabled','disabled');
        if(MA.isMobile) {
            VueEventBus.$emit('show-global-loader', true);
        }

        //start collecting field values starting with default fields
        var geoResponse = userSettings.click2CreateSettings.geoResponse;
        var setting = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()];
        var type = userSettings.click2CreateSettings.type;

        //now grab fields from the field set, 9167
        var fieldSetObject = buildFieldSetValues($('#CreateRecordPopupV2 .fieldSetTable'));
        var fields = fieldSetObject.fields;
        var FieldsFoundArray = fieldSetObject.FieldsFoundArray;

        //Add Default values if they aren't already present on the form

        if (!MA.Util.isBlank(setting.record.DefaultField__c) && !MA.Util.isBlank(setting.record[type+'DefaultValue__c']) && $.inArray(setting.record['DefaultField__c'],FieldsFoundArray) == -1) {
            fields[setting.record.DefaultField__c] = setting.record[type+'DefaultValue__c'];
        }

        if (userSettings.click2CreateSettings.type == 'MyPosition')
        {
            if (!MA.Util.isBlank(setting.record['MyPositionName__c']) && $.inArray(setting.record['MyPositionName__c'],FieldsFoundArray) == -1  ) { fields[setting.record['MyPositionName__c']] = userSettings.click2CreateSettings.name; }
            if (!MA.Util.isBlank(setting.record['DefaultField__c']) && !MA.Util.isBlank(setting.record['DefaultField__c']) && $.inArray(setting.record['DefaultField__c'],FieldsFoundArray) == -1) { fields[setting.record['DefaultField__c']] = setting.record['MyPositionDefaultValue__c']; }
        }
        else if (userSettings.click2CreateSettings.type == 'POI')
        {
            if (!MA.Util.isBlank(setting.record['POIName__c']) && $.inArray(setting.record['POIName__c'],FieldsFoundArray) == -1) { fields[setting.record['POIName__c']] = userSettings.click2CreateSettings.name; }
            if (!MA.Util.isBlank(setting.record['POIPhone__c']) && $.inArray(setting.record['POIPhone__c'],FieldsFoundArray) == -1) { fields[setting.record['POIPhone__c']] = userSettings.click2CreateSettings.phone || ''; }
            if (!MA.Util.isBlank(setting.record['POIWebsite__c']) && $.inArray(setting.record['POIWebsite__c'],FieldsFoundArray) == -1) { fields[setting.record['POIWebsite__c']] = userSettings.click2CreateSettings.website || ''; }
            if (!MA.Util.isBlank(setting.record['DefaultField__c']) && !MA.Util.isBlank(setting.record['DefaultField__c']) && $.inArray(setting.record['DefaultField__c'],FieldsFoundArray) == -1) { fields[setting.record['DefaultField__c']] = setting.record['POIDefaultValue__c']; }
            if (!MA.Util.isBlank(setting.record['POIStateShort__c']) && !MA.Util.isBlank(setting.record['POIStateShort__c'])) { fields[setting.record['POIStateShort__c']] = geoResponse.result.StateCode; }
            if (!MA.Util.isBlank(setting.record['POICountryShort__c']) && !MA.Util.isBlank(setting.record['POICountryShort__c'])) { fields[setting.record['POICountryShort__c']] = geoResponse.result.CountryCode; }
        }
        else if (userSettings.click2CreateSettings.type == 'MapClick')
        {
            if (!MA.Util.isBlank(setting.record['MapClickName__c']) && $.inArray(setting.record['MapClickName__c'],FieldsFoundArray) == -1) { fields[setting.record['MapClickName__c']] = userSettings.click2CreateSettings.name; }
            if (!MA.Util.isBlank(setting.record['DefaultField__c']) && !MA.Util.isBlank(setting.record['DefaultField__c']) && $.inArray(setting.record['DefaultField__c'],FieldsFoundArray) == -1) { fields[setting.record['DefaultField__c']] = setting.record['MapClickDefaultValue__c']; }
        }

        //add address fields
        if (geoResponse.result)
        {
            if (setting.record[type+'Street__c'] && $.inArray(setting.record[type+'Street__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'Street__c']] = geoResponse.result.CompleteStreetAddress; }
            if (setting.record[type+'City__c'] && $.inArray(setting.record[type+'City__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'City__c']] = geoResponse.result.City; }
            if (setting.record[type+'State__c'] && $.inArray(setting.record[type+'State__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'State__c']] = geoResponse.result.State; }
            if (setting.record[type+'PostalCode__c'] && $.inArray(setting.record[type+'PostalCode__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'PostalCode__c']] = geoResponse.result.PostalCode; }
            if (setting.record[type+'Country__c'] && $.inArray(setting.record[type+'Country__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'Country__c']] = geoResponse.result.Country; }
        }

        if (setting.record[type+'Latitude__c'] && $.inArray(setting.record[type+'Latitude__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'Latitude__c']] = userSettings.click2CreateSettings.position.lat(); }
        if (setting.record[type+'Longitude__c'] && $.inArray(setting.record[type+'Longitude__c'],FieldsFoundArray) == -1) { fields[setting.record[type+'Longitude__c']] = userSettings.click2CreateSettings.position.lng(); }

        //convert fields to an array (this used to be the structure so for now it's easier to just convert back)
        var fieldsArr = [];
        $.each(fields, function (name, val) {
            fieldsArr.push({ name: name, value: val == '__' ? '' : val });
        });
        fields = fieldsArr;

        var setting = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()];
        var recordTypeId = $('#CreateRecordPopupV2 .createrecord2-recordtype').val() || '012000000000000AAA';
        var type = userSettings.click2CreateSettings.type;

        var fieldSetName = 'missing';

        if (setting.record.FieldSetOptions__c != undefined)
        {
            var FieldSetOptionsArray = JSON.parse(setting.record.FieldSetOptions__c);

            $.each(FieldSetOptionsArray, function (i, recordType) {
                if (recordTypeId == recordType.RecordTypeId)
                {
                    if (type == "MyPosition")
                    {
                        fieldSetName = recordType.MyPositionFieldSetAPIName;
                    }
                    else if (type == "POI")
                    {
                        fieldSetName = recordType.POIFieldSetAPIName;
                    }
                    else if (type == "MapClick")
                    {
                        fieldSetName = recordType.MapClickFieldSetAPIName;
                    }
                }


            });

        }
        else
        {
            fieldSetName = userSettings.click2CreateSettings.settings[$('#CreateRecordPopupV2 .createrecord2-object').val()].record[userSettings.click2CreateSettings.type+'FieldSet__c'];
        }

        //create record
        var processData = {
        	ajaxResource : 'TooltipAJAXResources',
        	action: 'createRecord',
        	sobject: $('#CreateRecordPopupV2 .createrecord2-object').val(),
            recordtypeid: $('#CreateRecordPopupV2 .createrecord2-recordtype').val() || '',
            fieldSet: fieldSetName,
            fields: JSON.stringify(fields)
        };

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(response, event) {
        	    MAToastMessages.hideMessage($c2cLoading);
        	    $('#CreateRecordPopupV2 .js-finishC2C').removeAttr('disabled');
                if(MA.isMobile) {
                    VueEventBus.$emit('show-global-loader', false);
                }
                var $errorList = $('#CreateRecordPopupV2 .createrecord2-fieldset-errors').empty().hide();
                if (!response.success) {
                    MAToastMessages.showError({message: MASystem.Labels.MA_Something_Went_Wrong,subMessage: MASystem.Labels.MA_Record_Not_Created});
                    if (response.errors && response.errors.length > 0) {
                        $.each(response.errors, function (i, errMsg) {
                            //GET THE ACTUAL FIELD NAME USING MAGIC
                            var fieldName = errMsg.split(': ')[1] || null;
                            var message = errMsg;

                            if(fieldName !== null) {
                                var actualName = $('#CreateRecordPopupV2').find('td[data-field="'+fieldName+'"]').closest('tr').find('.fieldLabel').text().replace(/\*/g, '') || fieldName;
                                message = message.replace(fieldName, actualName);
                            }

                            $('<li/>').text(message).appendTo($errorList);

                        });
                    }
                    else if (response.error) {
                        $('<li/>').text(response.error).appendTo($errorList);
                    }
                    else {
                        $(`<li>${MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin}</li>`).appendTo($errorList);
                    }
                    $errorList.show();
                    MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'});
                }
                else {
                    // create c2c marker for just created record only if setting is enabled
                    if (!MASystem.Organization.DisableClick2CreateMarkers) {
                        userSettings.click2CreateSettings.record = response.record;

                        var recordId = response.record.Id;

                        //changing to show a name if changed
                        var recordName = MA.Util.isBlank(setting.record[type+'Name__c']) ? userSettings.click2CreateSettings.name : $('#CreateRecordPopupV2 .createrecord-fieldset .fieldInput[data-field="'+setting.record[type+'Name__c']+'"]').find('input').val();
                        if(recordName == '') {
                            //fall back
                            recordName = userSettings.click2CreateSettings.name;
                        }

                        var markerShape = MA.Marker.shapes['Favorite'];
                        var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
                        var marker = new google.maps.Marker({
                            map: MA.map,
                            position: userSettings.click2CreateSettings.position,
                            icon: {
                                url: MAIO_URL+ '/images/marker/3?color=ff8800&forlegend=false&icon=Favorite',
                                anchor: markerShape.anchor
                            },
                            zIndex: -2,
                            title: recordName,
                            address : geoResponse.result ? geoResponse.result.FormattedAddress : userSettings.click2CreateSettings.position,
                            baseObject : MA.isMobile ? '{C2C}'+$('#CreateRecordPopupV2 .createrecord2-object').val() : '{C2C}'+$('#createrecord-object').val(),
                            record: { Id: recordId, Tasks : [] },
                            name: recordName ? recordName : 'Map C2C',
                            location: {
                                coordinates: {
                                    lat: geoResponse.result.Latitude,
                                    lng: geoResponse.result.Longitude
                                }
                            },
                        });

                        marker.record.marker = marker;
                        MA.Map.click2CreateMarkers.push(marker);

                        //handle marker click
                        if(MA.isMobile) {
                            google.maps.event.addListener(marker, 'click', function (e) { c2c.marker_Click.call(this); });
                        }
                        else {
                            google.maps.event.addListener(marker, 'click', function ()
                            {
                                //create tooltip content
                                var $tooltipContent = $([
                                    '<div id="tooltip-content">',
                                    '<div class="tooltip-header">',
                                    '<div class="name"><a target="_blank" style="font-family: helvetica,arial,sans-serif;font-size: 12px;color: #2265BB;font-weight: bold;text-decoration: none;white-space: normal;" /></div>',
                                    '<div class="address" style="margin: 3px 0 5px 0;padding: 0;font-family: helvetica,arial,sans-serif;font-size: 11px;font-weight: bold;text-decoration: none;color: #000;white-space: normal;" />',
                                    '</div>',
                                    '<div class="layout-tooltip slds-p-around_x-small">',
                                    '<div class="buttonset-section-columns">',
                                    '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div></div>' +
                                    '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Take_Me_There + '</div></div>' +
                                    //'<div class="buttoncolumn"><div class="actionbutton checkin">Check In</div></div>' +
                                    '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.Context_Remove_Marker + '</div></div>' +
                                    '</div>',
                                    '</div>',
                                    '</div>'
                                ].join(''));

                                //populate values
                                if (typeof sforce != 'undefined' && !isDesktopPage && sforce.one) {
                                    $tooltipContent.find('.name').html('<button style="padding:0px;" class="MAbutton button-small button-blue button-clear" onclick="sforce.one.navigateToSObject(\''+recordId+'\')">'+htmlEncode(recordName)+'</button>');
                                    //$tooltipContent.find('.name a').attr('href', '#').text(recordName).click(function () { sforce.one.navigateToSObject(recordId) });
                                }
                                else {
                                    $tooltipContent.find('.name a').attr('href', MA.SitePrefix+'/'+recordId).text(recordName);
                                }
                                // $tooltipContent.find('.address').text(geoResponse.result ? geoResponse.result.FormattedAddress : userSettings.click2CreateSettings.position).click(function () { launchNativeGPS(marker.getPosition().lat(), marker.getPosition().lng()); });

                                //update check in button to check out if needed
                                if (marker.record.Tasks) {
                                    $.each(marker.record.Tasks || [], function (index, task) {
                                        if (!task.IsClosed) {
                                            $tooltipContent.find('.actionbutton.checkin').data('CheckInId', task.Id).text('Check Out');
                                            return false;
                                        }
                                    });
                                }
                                if (marker.record.Events) {
                                    $.each(marker.record.Events || [], function (index, event) {
                                        if (event.Subject.indexOf('Check In @') == 0) {
                                            $tooltipContent.find('.actionbutton.checkin').data('CheckInId', event.Id).text('Check Out');
                                            return false;
                                        }
                                    });
                                }

                                //launch infobubble
                                MA.Map.InfoBubble.show({
                                    position: this.getPosition(),
                                    anchor: marker,
                                    minWidth: 420,
                                    content: $tooltipContent.get(0)
                                });

                                //handle action button clicks
                                $tooltipContent.find('.actionbutton').click(function () {
                                    var $button = $(this);
                                    switch ($button.text())
                                    {
                                        case MASystem.Labels.ActionFramework_Add_to_Trip:
                                            var c2cRec = {
                                                id : recordId,
                                                baseObject : '{C2C}'+$('#createrecord-object').val()
                                            }
                                            MAActionFramework.standardActions['Add to Trip'].ActionValue({
                                                customMarkers: [{ type: type, title: recordName, latlng: marker.getPosition(), address : geoResponse.result ? geoResponse.result.FormattedAddress : userSettings.click2CreateSettings.position, c2cRec : c2cRec }]
                                            });

                                            break;

                                        case MASystem.Labels.ActionFramework_Take_Me_There:

                                            MAActionFramework.standardActions['Take Me There'].ActionValue({
                                                customMarkers: [{ type: type, title: recordName, latlng: marker.getPosition(), address : geoResponse.result ? geoResponse.result.FormattedAddress : userSettings.click2CreateSettings.position }]
                                            });

                                            break;
                                        case 'Check In':

                                            MAActionFramework.standardActions['Check In'].ActionValue({
                                                button: $button,
                                                records: [marker.record]
                                            });

                                            break;

                                        case 'Check Out':

                                            MAActionFramework.standardActions['Check Out'].ActionValue({
                                                button: $button,
                                                records: [marker.record]
                                            });

                                            break;
                                        case 'Remove Marker':

                                            marker.setMap(null);
                                            MA.markerSelection.updateUnselected({ markers: [marker] });
                                            break;
                                    }
                                    MA.Map.InfoBubble.hide();
                                });
                            });
                        }
                    }

                    //close the popup
                    if(MA.isMobile) {
                        MAToastMessages.showSuccess({message:MASystem.Labels.MA_Record_Was_Created});
                        MALayers.hideModal();
                    }
                    else {
                        MA.Popup.closeMAPopup();
                        NotifySuccess(MASystem.Labels.MA_Record_Was_Created);
                    }

                }
            },{buffer:false,escape:false,timeout: 120000}
        );
    },
    marker_Click : function (options) {

        try {
            // attempt to stop propegation down to the map and hide marker info
            event.stopPropagation();
        } catch (e) {
            console.warn('c2c_click', e);
        }

        if(MA.isMobile) {
            options = $.extend({
                marker: this,
                record: this,
                type: 'c2c-marker'
            }, options || {});
    
            window.VueEventBus.$emit('show-marker-tooltip',true, options);
        }
    },
    processMapC2C : function () {
        var latLng = c2c.c2cMapMarker.getPosition();

        //remove marker
        c2c.c2cMapMarker.setMap(null);

        //if (MASystem.Organization.disable_reverse_geocoding)
        //{

            var $loadingGeo = MAToastMessages.showLoading({message:'Grabbing location info...',timeOut:0,extendedTimeOut:0});
            //reverse geocode this information
            reverseGeocode({
                latLng: latLng,
                complete: function (response) {
                    if(response.success)
                    {
                        var results = response.results || [];
                        var result = results[0];
                        var placeId = getProperty(result || {}, 'place_id');
                        if(result != undefined && placeId != undefined)
                        {
                            //reverse look up the place id
                            $('#message-top-center-container').removeClass('in');
                            var placesService = new google.maps.places.PlacesService(MA.map);
                            placesService.getDetails({ placeId: placeId }, function (place, status)
                            {
                                if (status == google.maps.places.PlacesServiceStatus.OK)
                                {

                                    //create a $button for js action framework
                                    var $button = $('<button class="action-bar-button actionbutton" data-type="Standard Action" data-marker="poi" data-action="Create Record"><div class="ma-icon ma-icon-world"></div>Click2Create<sup>TM</sup></button>');
                                    $loadingGeo.find('.toast-title').text('Loading Click2Create information...');
                                    //move directly to poi c2c
                                    var frameworkAction = $button.attr('data-type') == 'Custom Action'
                                        ? MAActionFramework.customActions[$button.attr('data-action')] || null
                                        : MAActionFramework.standardActions[$button.attr('data-action')] || null;
                                    MAToastMessages.hideMessage($loadingGeo);
                                    if (frameworkAction)
                                    {
                                        switch (frameworkAction.Action)
                                        {
                                            case 'Javascript':
                                                frameworkAction.ActionValue.call($button[0], {
                                                    button: $button,
                                                    customMarkers: [{ type: 'MapClick', place: place, title: place.name || place.address.indexOf(place.name > -1) ? 'Map Click' : place.name || 'Map Click', phone: place.international_phone_number || '', website: place.website || '', latlng: latLng, address: place.formatted_address}],
                                                    mode: 'newMobile'
                                                });
                                                break;

                                            default:
                                                break;
                                        }
                                    }
                                }
                            });
                        }
                        else
                        {
                            MAToastMessages.hideMessage($loadingGeo);
                            MAToastMessages.showWarning({message:'Unable to find location',subMessage:'Please move the marker to another location and try again.',timeOut:5000});
                        }
                    }
                    else {
                        // reverse geocode failed, we still want to create a record without an address
                        $('#message-top-center-container').removeClass('in');

                        //create a $button for js action framework
                        var $button = $('<button class="action-bar-button actionbutton" data-type="Standard Action" data-marker="poi" data-action="Create Record"><div class="ma-icon ma-icon-world"></div>Click2Create<sup>TM</sup></button>');
                        $loadingGeo.find('.toast-title').text('Loading Click2Create information...');
                        //move directly to poi c2c
                        var frameworkAction = $button.attr('data-type') == 'Custom Action'
                            ? MAActionFramework.customActions[$button.attr('data-action')] || null
                            : MAActionFramework.standardActions[$button.attr('data-action')] || null;
                        MAToastMessages.hideMessage($loadingGeo);
                        if (frameworkAction)
                        {
                            switch (frameworkAction.Action)
                            {
                                case 'Javascript':
                                    frameworkAction.ActionValue.call($button[0], {
                                        button: $button,
                                        customMarkers: [{ type: 'MapClick', title: 'Map Click', latlng: latLng}],
                                        mode: 'newMobile'
                                    });
                                    break;

                                default:
                                    break;
                            }
                        }
                    }
                }
            });

        /*
        }
        else
        {
            //MASystem.Organization.disable_reverse_geocoding = false
            //we can proceed forward, just can't store the reverse geocode (address)

            var frameworkAction = $button.attr('data-type') == 'Custom Action'
                ? MAActionFramework.customActions[$button.attr('data-action')] || null
                : MAActionFramework.standardActions[$button.attr('data-action')] || null;
            MAToastMessages.hideMessage($loadingGeo);
            if (frameworkAction)
            {
                switch (frameworkAction.Action)
                {
                    case 'Javascript':
                        frameworkAction.ActionValue.call($button[0], {
                            button: $button,
                            customMarkers: [{ type: 'MapClick', place: place, title: place.name || 'Map Click', phone: place.international_phone_number || '', website: place.website || '', latlng: latLng, address: place.formatted_address}],
                            mode: 'newMobile'
                        });
                        break;

                    default:
                        break;
                }
            }
        }
        */
    },
    cancelMapC2C : function () {
        try {
            c2c.c2cMapMarker.setMap(null);
            c2c.c2cMapMarker = null;

            $('#message-top-center-container').removeClass('in');
        }
        catch(e) {
            c2c.c2cMapMarker = null;
            $('#message-top-center-container').removeClass('in');
        }
    },
    c2cMapMarker : null,
    C2CDropPin : function (latlng) {
        c2c.cancelMapC2C();
        var markerShape = MAMarkerBuilder.shapes['Pin'];
        var svgHTML = MAMarkerBuilder.createSVG({type: 'Marker',color: '#4194e4:Pin',forLegend: false});
        var markerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(svgHTML));
        var markerAnchor = markerShape.anchor;
        var markerSize = {height:markerShape.size.y,width:markerShape.size.x};
        //create a draggable marker
        c2c.c2cMapMarker = new google.maps.Marker({
            icon: {
				url: markerURL,
				anchor: markerAnchor,
				scaledSize : markerSize
			},
			optimized: MA.Util.isIE() ? false : true,
			layerType: 'c2c-marker',
			title: 'MapClick',
			position : latlng,
			map : MA.map,
			draggable : true,
			opacity : 0.7
        });

        //show buttons to finish
        $('#message-top-center-container').addClass('in');
    },
    mobile : {
    }
};

function launch_custom_action(options) {
    VueEventBus.$bus.$emit('open-modal', { modal: 'launch-lightning-out', options: options});        
}

function proximityLayer_Click(options)
{
    shape_cluster_popup(
        $.extend(options, {
            type : 'shape'
        })
    );
}

function shape_cluster_toggle_tab(layerId)
{
    var $layer = $('#shape-popup-accordion').find('.tooltip-accordion-unit[layerId="' + layerId + '"]');
    $('#shape-popup-accordion').find('.tooltip-accordion-body').hide();
    $('#shape-popup-accordion').find('.tooltip-accordion-unit').find('.accordianIcon').addClass('ion-plus-circled').removeClass('ion-minus-circled');
    if($layer.hasClass('open')) {
        $layer.removeClass('open');
    }
    else {
        $('#shape-popup-accordion').find('.tooltip-accordion-unit').removeClass('open');
        $layer.addClass('open');
        $('#shape-popup-accordion').find('.tooltip-accordion-header[layerId="' + layerId + '"]').find('.accordianIcon').addClass('ion-minus-circled').removeClass('ion-plus-circled');
        $('#shape-popup-accordion').find('.tooltip-accordion-unit[layerId="' + layerId + '"] .tooltip-accordion-body').show();
        $('#shape-popup-accordion').find('tr[rowtype="data"][layerId="' + layerId + '"]').show();
    }

    MA.Map.InfoBubble.adjust();
}

function shape_cluster_toggle_subtab(layerId, tabType, obj)
{
    $('tr[rowtype="data-row-markers"][layerId="' + layerId + '"], tr[rowtype="data-row-legend"][layerId="' + layerId + '"], tr[rowtype="data-row-aggregates"][layerId="' + layerId + '"], tr[rowtype="data-row-actions"][layerId="' + layerId + '"]').hide();

    $('tr[rowtype="data-row-' + tabType + '"][layerId="' + layerId + '"]').show();


    //rowtype="sub-tab" layerId="' + layerInfo.layerId + '"
    $('td[rowtype="sub-tab"][layerId="' + layerId + '"]')
        .removeClass('shape-cluster-popup-subtab-active')
        .addClass('shape-cluster-popup-subtab-inactive');

    $(obj).removeClass('shape-cluster-popup-subtab-inactive');
    $(obj).addClass('shape-cluster-popup-subtab-active');

    MA.Map.InfoBubble.adjust();
}

function MergeAndSort(array)
{
    var len = array.length;

    if(len < 2)
    {
        return array;
    }
    else
    {
        var pivot = Math.ceil(len/2);
        return merge(MergeAndSort(array.slice(0,pivot)), MergeAndSort(array.slice(pivot)));
    }
}

function merge(left, right)
{
    var result = [];
    while((left.length > 0) && (right.length > 0))
    {
        if(left[0].title < right[0].title)
        {
            result.push(left.shift());
        }
        else
        {
            result.push(right.shift());
        }
    }

    result = result.concat(left, right);
    return result;
};

function buildFieldSetValues ($fieldSetTable) {
    /********************************
     *
     * pass through a field set table -> <table><tr><td class="field::x">...
     * return object of fields and fields found
     *
    *********************************/
    var fields = {};
    var FieldsFoundArray = [];
    var isFromC2CForm = $fieldSetTable.is('.ClickToCreateFormTable') || $fieldSetTable.closest('.ClickToCreateFormTable').length > 0;
    var isNonArcNonDataC2C = $fieldSetTable.closest('#CreateRecordPopupV2').length > 0;
    //now grab fields from the field set, 9167
    //$fieldSetTable.find('td[class^="field::"]').each(function ()
    $fieldSetTable.find('div[class^="field::"]').each(function ()
    //field::maps__Disposition__c fieldInput
    {
        var $row = $(this);
        var fieldName = $row.attr('data-field');
        var fieldType = $row.attr('data-type') || '';
        fieldType = fieldType.toLowerCase();
        FieldsFoundArray.push(fieldName);
        var value = '';
        if($row.find('.get-input').is('img') && fieldType != 'multipicklist') {
            value = undefined;
        }
        else if(isNonArcNonDataC2C && isFromC2CForm && fieldType == 'datetime') {
            var date = $row.find('.datepicker').val();
            var hr = $row.find('.hr').val();
            var min = $row.find('.min').val();

            var timeType = getProperty(MASystem, 'User.timeFormat');
            var showAM_PM = timeType === 'hh:mm a' || timeType === 'h:mm a';
            var part = showAM_PM ? $row.find('.am-pm').val() : undefined;

            var timeString = (part) ? hr + ':' + min + ' ' + part.toLowerCase() : hr + ':' + min;
            var timeFormat = (part) ? 'hh:mm a' : 'HH:mm';
            var inputFormat = formatUserLocaleDate({datepicker : true}).replace('yy', 'YYYY').replace('mm', 'MM').replace('dd', 'DD') + ' ' + timeFormat;
            var outputFormat = formatUserLocaleDate({moment: true});
            var dateTime = moment(date + ' ' + timeString, inputFormat).format(outputFormat);
            value = (dateTime !== 'Invalid date' && dateTime !== 'invalid date') ? dateTime : '';
        }
        else if(fieldType == 'picklist') {
            //find the select value
            value = $row.find('select').val();
        }
        else if (fieldType == 'reference')
        {
            if($row.find('select').length == 0 && $row.find('input').val() != '000000000000000')
            {

                value = $row.find('input').val();
            }
            else if($row.find('select').length == 1 && $row.find('span.lookupInput').length == 1)
            {
                value = $row.find('input').val();
            }
            else
            {
                value = $row.find('select').val();
            }
        }
        else if (fieldType == 'boolean') {
            if($row.find('input').is(':checked')) {
                value = true;
            }
            else {
                value = false;
            }
        }
        else if (fieldType == 'multipicklist') {
            var selectOptions = [];
            //grab the available options
            var availableOptions = $row.find('.get-input').closest('select').find('option');
            // loop over available and find out whats 'checked'
            for (var s = 0; s < availableOptions.length; s++) {
                if(availableOptions[s].selected === true){
                    // push selected options to the array
                    selectOptions.push(availableOptions[s].value);
                }
            }

            //Im putting a conditional here because I do not want to affect any users who may be using older stuff that worked in the past.
            //This was done for case 14947
            if(selectOptions.length == 0)
            {
                selectOptions = $row.find('.multiSelectPicklistTable optgroup[label="Chosen"]').closest('select').find('option');
            }
            if(selectOptions.length == 0)
            {
                //try to grab the last input
                selectOptions = $row.find('.multiSelectPicklistTable select.get-input').last().find('option');
            }
            value = '';
            for(var so = 0; so < selectOptions.length; so++) {
                value += selectOptions[so] + ';';

            }
        }
        else if (fieldType == 'textarea') {
            try {
                var rowKey = $row.find('.get-input').attr('id');
                var richTextInstances = CKEDITOR.instances || {};

                if(richTextInstances.hasOwnProperty(rowKey)) {
                    var CKInput = richTextInstances[rowKey];

                    value = CKInput.getData();
                }
                else {
                    value = $row.find('.get-input').val();
                }
            }
            catch(e) {
                value = $row.find('.get-input').val();
            }
        }
        else
        {
            value = $row.find('.get-input').val();
        }

        //if(value != '' && value != undefined)
        if(value != undefined)
        {
            fields[fieldName] = value;
        }
    });

    var returnObject = {
        fields : fields,
        FieldsFoundArray : FieldsFoundArray
    };

    return returnObject;
}

function shape_cluster_popup(options)
{
    //stop using google function to point contains
    //writing local versions, case 14853
    if (MA.isMobile) {
        VueEventBus.$bus.$emit('show-cluster-info', options);
    } else {
        shape_cluster_popup_functions.processShapePopup(options).then(function(res) {
            //do something when done. right now, not needed
        });
    }
}

var shape_cluster_popup_functions  = {
	processShapePopup : function (options) {
	    var dfd = $.Deferred();
		shape_cluster_popup_functions.getMarkersInsideShapeCluster(options).then(function(res) {


			var markerLayersInfo = res.markerLayersInfo || [];
			var $popup = res.popup;
            var bounds = res.bounds;

            //do one last check to process data layer aggregates
            var $popup = res.popup;
            shape_cluster_popup_functions.processDataLayerAggregates($popup,markerLayersInfo).then(function(res) {
            	dfd.resolve();
            });

		    $popup.find('.cluster-listview-button button').show();
		});

		return dfd.promise();
    },
	getMarkersInsideShapeCluster : function(options) {
		var dfd = $.Deferred();
		options = $.extend({
			type : ''
		}, options || {});
		var shapeMgr = null;
	    var shapeLabel = '';
	    var dataBounds = new google.maps.LatLngBounds(); //used for data layers
	    var clickedShape;
	    var htmlOptions = {
	    	type : options.type
        };
        var massActionInfo = {};
		options = $.extend({
			type : '',
			cluster : {},
		}, options || {});
		var layerSelector = '#PlottedQueriesTable .PlottedRowUnit';
		if (options.type == 'shape')
	    {
            clickedShape = options.feature || options.shape
            massActionInfo = {
                target: clickedShape,
                latlng: MA.map.getCenter(),
                type: 'shape'
            };
	        var shapeMgr = new MA.Map.ShapeManager().addLayer(clickedShape);

	        if(options.feature)
	        {
	            shapeLabel = options.feature.label || '';
	        }
	        else
	        {
	            try {
	                if (options.shape instanceof google.maps.Polygon) {
	                    options.shape.getPath().forEach(function (latlng, i) {
	                        dataBounds.extend(latlng);
	                    });
	                }
	                else {
	                    dataBounds.union(options.shape.getBounds());
	                }
	            }
	            catch(e) {
	                dataBounds = MA.map.getBounds();
	            }
	            shapeLabel = options.shape.label || '';
	        }
            htmlOptions.shapeLabel = shapeLabel;
        }
        else if (options.type == 'cluster')
	    {
	        //need to change this to not hardcoded
	        var clusterQID = getProperty(options || {}, 'cluster.markerClusterer_.qid', false) || '';
            layerSelector = '#PlottedQueriesTable .PlottedRowUnit[qid="' +  clusterQID + '"]';
            massActionInfo = {
                target: options.cluster,
                latlng: MA.map.getCenter(),
                type: 'cluster'
            };
        }
	    var layerMap = {};
	    var markerLayersInfo = [];
	    var records = [];
	    var totalRecordCount = 0;

	    var layersDone = true;
	    var layerIndex = 0;
	    //loop through our layers to get markers
	    $(layerSelector).each(function () {
	    	layerIndex++;
	    	layersDone = false;
	    	var layerInfo = {};
	    	var $layer = $(this);

	    	//this is a SF Layer
	    	if($layer.hasClass('savedQuery'))
        	{
        		//create some basic info
        		layerInfo = {
	                layerId : $layer.data('qid'),
	                dataType : $layer.attr('data-type'),
	                type : 'marker',
                    name : $layer.data('savedQueryName') != '' ? $layer.data('savedQueryName') : $layer.find('.basicinfo-name').text(),
	                markers : [],
                    tooltips : [],
	                totalRecords: 0,

	                fieldList : [],
	                advancedOptions : $(this).data('advancedOptions'),
	                legendInfo : $layer.data('legendInfo'),
	                legendCounts : {},
	                records : [],
	                hasAggregates : false,
	            };

	            var tooltipData = $layer.data('tooltips') || [];
				$.each(tooltipData, function (recordId, tooltip) {
	                //make sure we are only using Tooltips (not things used for the legend) and that we don't include the same field twice.
	                if ( ( tooltip.TooltipType == 'ToolTip' || tooltip.TooltipType == 'Priority' || (/color/i).test(tooltip.TooltipType) ) && $.inArray(layerInfo.fieldList,tooltip.ActualFieldName) == -1)
	                {
	                    if (tooltip.describe.type == 'currency' || tooltip.describe.type == 'double' || tooltip.describe.type == 'integer' || tooltip.describe.type == 'int' || tooltip.describe.type == 'percent')
	                    {
	                        layerInfo.hasAggregates = true;

	                        layerInfo.tooltips.push(
	                            $.extend({
	                                sum : 0
	                            }, tooltip)
	                        );

	                        layerInfo.fieldList.push(tooltip.ActualFieldName);
	                    }
	                }
                });

				//get markers from cluster
	            if (options.type == 'cluster')
	            {
	                var layerRecords = $(this).data('records');

	                $.each(options.cluster.getMarkers(), function (recordId, marker) {

	                    var record = layerRecords[marker.record.Id];

	                    if (record.isVisible || record.isClustered || record.isScattered)
	                    {
	                        //if (shapeMgr.containsLatLng(record.marker.getPosition())) {
                            records.push(record);

	                        layerInfo.totalRecords++;
	                        //layerInfo.records.push(record);
	                        layerInfo.markers.push(record.marker);

	                        if (!layerInfo.legendCounts[record.legendId])
	                        {
	                            layerInfo.legendCounts[record.legendId] = {count : 0};
	                        }
	                        layerInfo.legendCounts[record.legendId].count++;

	                        totalRecordCount++;

	                        if (layerInfo.hasAggregates)
	                        {
	                            $.each(layerInfo.tooltips, function (recordId, tooltip) {

	                                var aValue = getProperty(record,tooltip.FieldName);

	                                if (aValue != undefined)
	                                {
	                                    tooltip.sum += parseFloat(aValue);
	                                }
	                            });
	                        }
	                    }
	                });
	                if (--layerIndex == 0) layersDone = true;
	            }
	            //break this out into worker
	            else if (options.type == 'shape')
	            {
	                var recordData = $layer.data('records') || [];
	                var recMap = {};
	                $.each(recordData, function (recordId, record) {
	                //$.each($(this).data('records'), function (recordId, record) {
	                    if (record.isVisible || record.isClustered || record.isScattered) {
	                        var markerPos = record.marker.getPosition();
	                        recMap[recordId] = [markerPos.lat(),markerPos.lng()];
	                    } else if (record.isPolyline) {
                            record.polyline.vertices.forEach((vertex, index) => {
                                recMap[`vertex${index}${recordId}`] = [vertex.latitude, vertex.longitude];
                            });
                        }
	                }); 

	                var processData;
	                var userWorker = true;
	                try {
	                    processData = normalizeShape(clickedShape);
	                    if(processData.type == 'legacy') {
	                        userWorker = false;
	                    }
	                }
	                catch(e) {
	                    userWorker = false;
	                }

	                if (window.Worker && userWorker) {
                        var processData = normalizeShape(clickedShape);
                        processData.dataRegion = getProperty(MASystem, 'Organization.dataRegion', false);
	                    processData.points = JSON.stringify(recMap);
	                    processData.path = JSON.stringify(processData.path);
	                    processData.cmd = 'pointsInShape';
	                    processData.externalScripts = JSON.stringify([MA.resources.MAShapeProcess]);

	                    var pointWorker = new Worker(MA.resources.MAWorker);
	                    pointWorker.postMessage(processData);
	                    pointWorker.onmessage = function(e) {
	                        var res = e.data;
                            const polylineAddedSet = new Set();
	                        if(res && res.success) {
	                            var pointsInPolygon = [];
	                            try {
	                                pointsInPolygon = JSON.parse(res.data);
	                            }
	                            catch(e) {
	                                pointsInPolygon = [];
	                            }
	                            $.each(pointsInPolygon || [], function (i, uid) {
                                    var vertexIndex;
                                    if(uid.includes('vertex')) {
                                        var cutDownStr = uid.split('vertex')[1];
                                        uid = cutDownStr.slice(1);
                                        vertexIndex = cutDownStr.slice(0,1);
                                    }
	                                var record = recordData[uid];
                                    record = record.isPolyline && polylineAddedSet.has(uid) ? undefined : record;
	                                if(record != undefined) {
	                                    layerInfo.totalRecords++;
	                                    records.push(record);
                                        if (record.isPolyline) {
                                            layerInfo.markers.push(record.polylineMarkers[vertexIndex]);
                                            polylineAddedSet.add(uid);
                                        } else {
                                            layerInfo.markers.push(record.marker);
                                        }

	                                    if (!layerInfo.legendCounts[record.legendId])
	                                    {
	                                        layerInfo.legendCounts[record.legendId] = {count : 0};
	                                    }
	                                    layerInfo.legendCounts[record.legendId].count++;

	                                    totalRecordCount++;

	                                    if (layerInfo.hasAggregates)
	                                    {
	                                        $.each(layerInfo.tooltips, function (recordId, tooltip) {


	                                            var aValue = getProperty(record,tooltip.FieldName);

	                                            if (aValue != undefined)
	                                            {
	                                                tooltip.sum += parseFloat(aValue);
	                                            }
	                                        });
	                                    }
	                                }
	                            });
	                            if (--layerIndex == 0) layersDone = true;
	                        }
	                        else if (--layerIndex == 0) layersDone = true;
	                        pointWorker.terminate();
	                    };
	                }
	                else {
	                	//fall back to old method, each loop
	                    $.each(recordData, function (recordId, record) {
	                        if (record.isVisible || record.isClustered || record.isScattered) {
	                            if (shapeMgr.containsLatLng(record.marker.getPosition())) {

	                                layerInfo.totalRecords++;
	                                records.push(record);
                                    layerInfo.markers.push(record.marker);

	                                if (!layerInfo.legendCounts[record.legendId])
	                                {
	                                    layerInfo.legendCounts[record.legendId] = {count : 0};
	                                }
	                                layerInfo.legendCounts[record.legendId].count++;

	                                totalRecordCount++;

	                                if (layerInfo.hasAggregates)
	                                {
	                                    $.each(layerInfo.tooltips, function (recordId, tooltip) {


	                                        var aValue = getProperty(record,tooltip.FieldName);

	                                        if (aValue != undefined)
	                                        {
	                                            tooltip.sum += parseFloat(aValue);
	                                        }
	                                    });
	                                }
	                            }
	                        }
                            
                            if (record.isPolylineVisible && record.polyline.validPolyline) {
                                let polylineFound = false;
                                record.polylineMarkers.forEach((marker, index) => {
                                    if (!polylineFound && shapeMgr.containsLatLng(marker.getPosition())) {
                                        polylineFound = true;
                                        layerInfo.totalRecords++;
                                        records.push(record);
                                        layerInfo.markers.push(record.polylineMarkers[index]);
    
                                        if (!layerInfo.legendCounts[record.legendId])
                                        {
                                            layerInfo.legendCounts[record.legendId] = {count : 0};
                                        }
                                        layerInfo.legendCounts[record.legendId].count++;
    
                                        totalRecordCount++;
    
                                        if (layerInfo.hasAggregates)
                                        {
                                            $.each(layerInfo.tooltips, function (recordId, tooltip) {
    
    
                                                var aValue = getProperty(record,tooltip.FieldName);
    
                                                if (aValue != undefined)
                                                {
                                                    tooltip.sum += parseFloat(aValue);
                                                }
                                            });
                                        }
                                    }
                                });
	                        }
                        });
                        if (--layerIndex == 0) layersDone = true;
	                }
	            }

	            markerLayersInfo.push(layerInfo);
        	}
        	//this is a data layer (is it a marker)
            else if($layer.attr('plot-type') == 'marker' || $layer.attr('plot-type') == 'point')
            {
                layerInfo = {
                    layerId : $layer.data('id'),
                    dataType : $layer.attr('data-type'),
                    type : 'data',
                    name : $layer.data('name'),
                    markers : [],
                    tooltips : [],
                    totalRecords: 0,
                    legend: $layer.data('legend'),
                    key : $layer.data('key'),
                    uids : [],
                    tables : [],
                    timestamp : new Date().getTime(),
                };

                if (options.type == 'cluster')
                {
                    var cluster = options.cluster || {};
                    $.each(cluster.markers_, function(ii,marker) {
                        dataBounds.extend(marker.getPosition());
                        layerInfo.uids.push(marker.data.uid);
                        layerInfo.markers.push(marker);
                        layerInfo.totalRecords++;
                        totalRecordCount++;
                    });

                    if (layerInfo.totalRecords > 0) markerLayersInfo.push(layerInfo);
                    if (--layerIndex == 0) layersDone = true;
                }
                else if (options.type == 'shape')
                {
                    var recordData = $layer.data('records') || [];
                    var recMap = {};
                    $.each(recordData, function (recordId, record) {
                    //$.each($(this).data('records'), function (recordId, record) {
                        if( record.isVisible || record.isClustered ) {
                            var markerPos = record.clusterMarker.getPosition();
                            recMap[recordId] = [markerPos.lat(),markerPos.lng()];
                        }
                    });

                    var processData;
                    var userWorker = true;
                    try {
                        processData = normalizeShape(clickedShape);
                        if(processData.type == 'legacy') {
                            userWorker = false;
                        }
                    }
                    catch(e) {
                        userWorker = false;
                    }

                    if (window.Worker && userWorker) {
                        var processData = normalizeShape(clickedShape);
                        processData.dataRegion = getProperty(MASystem, 'Organization.dataRegion', false);
                        processData.points = JSON.stringify(recMap);
                        processData.path = JSON.stringify(processData.path);
                        processData.cmd = 'pointsInShape';
                        processData.externalScripts = JSON.stringify([MA.resources.MAShapeProcess]);

                        var pointWorker = new Worker(MA.resources.MAWorker);
                        pointWorker.postMessage(processData);
                        pointWorker.onmessage = function(e) {
                            var res = e.data;
                            if(res && res.success) {
                                var pointsInPolygon = [];
                                try {
                                    pointsInPolygon = JSON.parse(res.data);
                                }
                                catch(e) {
                                    pointsInPolygon = [];
                                }
                                $.each(pointsInPolygon || [],function (i,uid) {
                                    var record = recordData[uid];
                                    if(record != undefined) {
                                        var marker = record.clusterMarker;
                                        records.push(record);
                                        layerInfo.uids.push(marker.data.uid);
                                        //layerInfo.tables.push(marker.data.table);
                                        layerInfo.markers.push(marker);
                                        layerInfo.totalRecords++;
                                        totalRecordCount++;
                                    }
                                });

                                if (layerInfo.totalRecords > 0) markerLayersInfo.push(layerInfo);
                                if (--layerIndex == 0) layersDone = true;
                            }
                            else if (--layerIndex == 0) layersDone = true;
                            pointWorker.terminate();
                        };
                    }
                    else {
                        //fall back to old method, each loop
                        $.each($layer.data('records'), function (id, record) {
                            if( record.isVisible || record.isClustered ) {
                                var marker = record.clusterMarker;
                                if (marker && shapeMgr.containsLatLng(marker.getPosition())) {
                                    //markers.push(marker);
                                    layerInfo.uids.push(marker.data.uid);
                                    //layerInfo.tables.push(marker.data.table);
                                    layerInfo.markers.push(marker);
                                    layerInfo.totalRecords++;
                                    totalRecordCount++;
                                }
                            }
                        });

                        if (layerInfo.totalRecords > 0) markerLayersInfo.push(layerInfo);
                        if (--layerIndex == 0) layersDone = true;
                    }
                }
            }
            else if ($layer.hasClass('ArcGISLayer'))
            {
                Array.prototype.push.apply(records,
					ArcGIS.featureLayerHelpers.searchByShape(
						$layer,
						markerLayersInfo,
						clickedShape,
						shapeMgr,
						function()
						{
							totalRecordCount++;
						},
						function(inc)
						{
							layerIndex += inc;
						},
						function()
						{
							if (--layerIndex == 0) layersDone = true;
						}
					)
				);
            }
            else if (--layerIndex == 0) layersDone = true;
	    });

		var processInt = setInterval(function() {
			if(layersDone) {
                clearInterval(processInt);
				//now build the html to go along with these layers
                htmlOptions.totalRecordCount = totalRecordCount;
                //htmlOptions.dataBounds = dataBounds;
				shape_cluster_popup_functions.buildHTML(markerLayersInfo, htmlOptions, options).then(function(res) {
                    var qid = MA.getProperty(options, "feature.qid");
                    var $proxLayer = $('[qid="' + MA.getProperty(options, "feature.qid") + '"]');
                    if ($proxLayer) {
                        $proxLayer.data('geometry', {});
                    }

					//build out some final html and show html info
                    var $popupHTMLWithActions = $('<div id="shapeInfoPopup" class=""></div>').html(res.popupHTML);
                    $popupHTMLWithActions.find('#shapeTooltipTabs').tabs({ active: 0, activate: function(event, ui) { MA.Map.InfoBubble.adjust(); } });
                    // attempt to get shape geometry
                    if (options.type == 'shape') {
                        getShapeLayerGeometry(options).then(function(res) {
                            var perimeter = isNum(res.perimeter) ? res.perimeter : perimeter;
                            var area = isNum(res.area) ? res.area : area;
                            if (isNum(perimeter) || isNum(area)) {
                                var geoHTML = '<div class="area-wrap slds-p-right_small">' + MASystem.Labels.MA_Area + ': <span id="area">' + Number(area).toFixed(2) + '</span>  m<sup>2</sup>' + '</div><div class="perimeter-wrap">' +
                                MASystem.Labels.MA_Perimeter + ': <span id="perimeter">' + Number(perimeter).toFixed(2) + '</span> m</div>';
                                if(MA.isMobile) {
                                    $('#clusterTopBar').find('.shape-geometry').html(geoHTML);
                                } else {
                                    $popupHTMLWithActions.find('.shape-geometry').html(geoHTML);
                                }

                                geometry = {
                                    perimeter: perimeter,
                                    area: area,
                                    unit: MA.getProperty(res, 'unit')
                                };
                                if ($proxLayer) {
                                    $proxLayer.data('geometry', geometry);
                                }
                                var massActionOptions = $.extend(options, {
                                    geometry: geometry
                                });
                                $popupHTMLWithActions.find('#shapeTooltipActionsTab').data('actionOptions', massActionOptions);
                            }
                        }).fail(function(err) {
                            if(MA.isMobile) {
                                $('#clusterTopBar').find('.shape-geometry').html('Area and perimeter currently unavailable.');
                            } else {
                                $popupHTMLWithActions.find('.shape-geometry').html('Area and perimeter currently unavailable.');
                            }
                            console.warn('failed to get area and perimeter successfully', err);
                            $proxLayer.data('geometry', null);
                        });
                    }

					if(MA.isMobile) {
                        $popupHTMLWithActions.find('.tooltip-accordion-unit').css({padding: '.5rem .75rem .75rem',width:'100%'});
                        
                        $('#clusterBody').html($popupHTMLWithActions);

                        // $('#clusterBodyWrapper').find('#shapeActionsWrapper, #shapeActionSheet').data('actionOptions', massActionOptions);
                        
                        if (options.custom) {
                            // build shape tooltip actions displayed from the top
                            buildShapeTooltipActionSheet(options);
                            $('#clusterWrap [action-sheet="shapeTooltipActionSheet"]').show();
                        } else {
                            $('#clusterWrap [action-sheet="shapeTooltipActionSheet"]').hide();
                        }

				        $('#clusterBody .shapeLabel').remove();
                        $('#clusterWrap .standard-cluster-buttons-wrapper').hide();
                        VueEventBus.$bus.$emit('show-cluster-info', true);
                        // MALayers.moveToTab('showClusterInfo');
                    }

                    //event listeners for mobile and desktop
                    if (options.type == 'cluster')
                    {
                        if(!MA.isMobile) {
                            MA.Map.InfoBubble.show({
                                position: options.cluster.getCenter(),
                                minWidth: 420,
                                content: $popupHTMLWithActions.get(0)
                            });
                        }
                        $popupHTMLWithActions.find('.shape-geometry').remove();
                        $popupHTMLWithActions.find('button').on('click', function () {
                            MA.Map.InfoBubble.hide();
                            if ($(this).hasClass('zoomToMarkers')) {
                                MA.map.fitBounds(options.cluster.getBounds());
                                // MALayers.moveToTab('hideClusterInfo');
                            }
                            else if ($(this).hasClass('drawPolygon'))
                            {
                                var shapeMgr = new MA.Map.ShapeManager();
                                var bounds = new google.maps.LatLngBounds();
                                // MALayers.moveToTab('hideClusterInfo');
                                // MALayers.moveToTab('activeLayers');


                                $.each(options.cluster.getMarkers(), function (i, marker) {
                                    shapeMgr.addLayer(marker.getPosition());
                                    bounds.extend(marker.getPosition());
                                });


                                addProximityLayer({
                                    drawnShape: true,
                                    shapeType: 'Polygon',
                                    fillColor: '#22CC22',
                                    borderColor: '#000000',
                                    qid: qid
                                }).then(function(proxLayer) {
                                    var $proxLayer = proxLayer;
                                    //qid for ListView
                                    var qid = $proxLayer.data('qid');
                                    $proxLayer.attr('data-id',qid);
                                    $proxLayer.data(
                                        'proxObject',
                                        new google.maps.Polygon({
                                            map: MA.map,
                                            paths: shapeMgr.getConvexHull(),
                                            strokeColor: '#000000',
                                            strokeWeight: 4,
                                            fillColor: '#22CC22',
                                            fillOpacity: 0.6,
                                            layerType: 'prox',
                                            qid: qid
                                        })
                                    );
                                    ChangeVisibilityWhenCircleIsAdded();
                                    MA.map.fitBounds(bounds);

                                    //handle shape events
                                    google.maps.event.addListener($proxLayer.data('proxObject'), 'click', function (e) {
                                        proximityLayer_Click({ position: e.latLng, type: 'polygon', shape: $proxLayer.data('proxObject') });
                                    });
                                    google.maps.event.addListener($proxLayer.data('proxObject'), 'rightclick', function (e) {
                                        Shape_Context.call(this, e);
                                    });
                                });
                            }
                        });
                    }
                    else if (options.type == 'shape')
                    {
                        if(!MA.isMobile)
                        {
                            //create info bubble
                            MA.Map.InfoBubble.show({
                                position: options.position,
                                minWidth: 420,
                                content: $popupHTMLWithActions.get(0),
                                layerType: 'popup',
                                popupType: 'prox'
                            });
                        }
                    }

                    if (totalRecordCount > 0)
                    {
                        $popupHTMLWithActions.find('.cluster-listview-button').html('<button style="display:none;">' + MASystem.Labels.MA_Create_Selected_Tab + '</button>');
                        $popupHTMLWithActions.find('.cluster-listview-button button').click(function (event) {
                            MAListView.ProcessListViewButtonFromShapeLayerPopup(records);
                            MA.Map.InfoBubble.hide();
                            event.stopPropagation();
                        });
                    }
                    $popupHTMLWithActions.data('massActionInfo', massActionInfo);
				    //pass back layer info
				    dfd.resolve({success:true, markerLayersInfo: markerLayersInfo, popup: $popupHTMLWithActions, bounds:dataBounds});
				});

			}
		},100);

		return dfd.promise();
	},
	buildHTML : function (markerLayersInfo, options, geometryOptions) {
		options = $.extend({
			shapeLabel : '',
			totalRecordCount : 0
        }, options || {});
		markerLayersInfo = markerLayersInfo || [];
		var shapeLabel = options.shapeLabel || '';
		var dfd = $.Deferred();
        var totalRecordCount = options.totalRecordCount;
        var shapeLayerId = MA.getProperty(geometryOptions, 'feature.qid');

		//create our basic wrapper html
        var popupHTML = '<div id="tooltip-content">'+
                            '<div class="tooltip-header">' +
                                '<div class="shapeLabel" style="font-weight:bold;">'+htmlEncode(options.shapeLabel)+'</div>' + 
                                '<div style="'+(MA.isMobile === true ? "display:none;" : "")+'" class="totalCount" style="color:#757575;font-size:10px;line-height:10px;">' + totalRecordCount +' ' + MASystem.Labels.MA_Total_Records_In_Boundary + '</div>';

        if(MA.isMobile) {
            // update our area permimeter and counts
            var popupTitle = 'Cluster Info';
            if(geometryOptions.type == 'shape' && shapeLabel != '') {
                popupTitle = shapeLabel;
            }
            else if (geometryOptions.type === 'shape') {
                popupTitle = 'Shape Info';
            }
            var topBarMarkup = htmlEncode(popupTitle) + ' <div class="ma-top-bar-subtext recordAddress">'+htmlEncode(totalRecordCount)+' record(s)</div>';
            if(options.type == 'shape') {
                topBarMarkup += '<div class="ma-top-bar-subtext shape-geometry">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</div>';
            }                              
            if (totalRecordCount > 0 && options.type == 'shape')
            {
                //popupHTML += '<div class="cluster-listview-button"></div>';
            }
            else if(totalRecordCount > 0 && options.type == 'cluster')
            {
                popupHTML += '<div class="ma-button-group" style="text-align: center;align-items: center;justify-content: center;margin: 10px 0px;">' +
                    '<button class="ma-button ma-button--white zoomToMarkers">' + MASystem.Labels.MA_Zoom_To_Markers + '</button>'+
                    '<button class="ma-button ma-button--white drawPolygon">' + MASystem.Labels.MA_Draw_Polygon + '</button>'+
                    '</div>';
            }
            else
            {
                //no records show message
                popupHTML += '<div class="ma-button-group" style="text-align: center;align-items: center;justify-content: center;margin-top: 10px;">' +
                    '<div>No Information Available!</div>';
                '</div>';
            }
            $('#clusterTopBar').find('.ma-top-bar-title--left').html(topBarMarkup);
        }
        else
        {
            if (options.type == 'shape')
            {

                if(totalRecordCount > 0 )
                {
                    popupHTML += '<div style="color:#757575;font-size:10px;line-height:10px;" class="shape-geometry">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</div>';
                    popupHTML += '</div>';
                    popupHTML += '<div class="cluster-listview-button"></div>';
                }
                else
                {
                    popupHTML += '<div style="color:#757575;font-size:10px;line-height:10px;" class="shape-geometry"></div>';
                    popupHTML += '</div>';
                }
                
            }
            else if (options.type == 'cluster')
            {
                popupHTML += '</div>';
                popupHTML += '<div class="standard-cluster-buttons-wrapper">'
                popupHTML += '<table class="standard-cluster-buttons-table">'
                popupHTML += '<tr>'
                popupHTML += '<td><button class="ma-button ma-button--white ma-button-sm zoomToMarkers">' + MASystem.Labels.MA_Zoom_To_Markers + '</button></td>'
                popupHTML += '<td class="drawpolygon"><button class="ma-button ma-button--white ma-button-sm drawPolygon">' + MASystem.Labels.MA_Draw_Polygon + '</button></td>'
                popupHTML += '<td class="cluster-listview-button">' + MASystem.Labels.MA_Create_Selected_Tab + '</td>'
                popupHTML += '</tr>'
                popupHTML += '</table>'
                popupHTML += '</div>';
            }
        }

        popupHTML += '<div id="shapeTooltipTabs" class="tabs ui-tabs ui-widget ui-widget-content ui-corner-all">'; // tabs and tabs content wrapper

        // shape tooltip tabs
        var tabs = [
            {
                label: MASystem.Labels.MA_Layers,
                id: 'shapeTooltipLayersTab' 
            },
            {
                label: MASystem.Labels.MA_Actions,
                id: 'shapeTooltipActionsTab'
            }
        ];

        // tab headers
        popupHTML += '<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">';

        if (!MA.isMobile) {
            tabs.forEach(function(tab) {
                popupHTML += '<li class="tooltip-tab ui-state-default ui-corner-top">';
                popupHTML += '<a href="#' + tab.id + '" class="ui-tabs-anchor" role="presentation">' + htmlEncode(tab.label) + '</a>'
                popupHTML += '</li>';
            });
        }

        popupHTML += '</ul>';

        var htmlProcessed = true;

        tabs.forEach(function(tab) {
            if (tab.id == 'shapeTooltipLayersTab') {
                popupHTML += '<div id="' + tab.id + '">';
                popupHTML += '<div class="accordianWrapper"><div id="shape-popup-accordion" class="tooltip-accordion-wrap" style="width: 100%;">';

                // loop over our processed results and build html
                $.each(markerLayersInfo,function(index, layerInfo) {
                    if (layerInfo.totalRecords > 0) {
                        var legendPopupHTML = '';
                        var markersPopupHTML = '';
                        var mkrs = layerInfo.markers || [];
                        if(layerInfo.type == 'marker')
                        {
                            //process SF Layers
                            var layerPopupHTML = '<table style="width: 100%;">';


                            //add "tabs"
                            layerPopupHTML += '<tr class="ma-tab-link-group" style="border-bottom: 1px solid #d8dde6;">';

                            if(!MASystem.Organization.RemoveAggregatesTooltipTab) {
                                layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-active active" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'aggregates\',this);">' + MASystem.Labels.MA_Aggregates + '</td>';
                            }

                            layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link ' + (MASystem.Organization.RemoveAggregatesTooltipTab ? 'shape-cluster-popup-subtab-active' : 'shape-cluster-popup-subtab-inactive') + '" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'legend\',this);">' + MASystem.Labels.MA_Legend + '</td>';
                            layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'markers\',this);">' + MASystem.Labels.MA_Markers + '</td>';

                            // ACTIONS TAB
                            // layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'actions\', this);">' + 'Actions' + '</td>';

                            layerPopupHTML += '</tr>';

                            //formatTooltip(record, tooltip);
                            //$.extend({}, object1, object2);

                            //formatTooltip(tooltip,$.extend(tooltip, {ActualFieldName: 'sum'}));

                            ///////Aggregates
                            if(!MASystem.Organization.RemoveAggregatesTooltipTab) {

                                layerPopupHTML += '<tr rowtype="data-row-aggregates" layerId="' + layerInfo.layerId + '">';
                                layerPopupHTML += '<td colspan="3" >';
                                if (layerInfo.hasAggregates)
                                {
                                    layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';
                                    layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                                    $.each(layerInfo.tooltips, function (recordId, tooltip) {

                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + htmlEncode(tooltip.FieldLabel) + '</td>';
                                        layerPopupHTML += '<td>' + MASystem.Labels.MA_Sum +':</td>';
                                        layerPopupHTML += '<td>' + htmlEncode(formatTooltip(tooltip,$.extend(tooltip, {CurrencyIsoCode: MASystem.User.DefaultCurrency,ActualFieldName: 'sum'}))) + '</td>';
                                        layerPopupHTML += '</tr>';

                                        //store the average on the tooltip object, so we can format it.
                                        tooltip.avg = Math.round((tooltip.sum/layerInfo.totalRecords)*100)/100;

                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + '' + '</td>';
                                        layerPopupHTML += '<td>' + MASystem.Labels.MA_Avg + ':</td>';
                                        layerPopupHTML += '<td>' + htmlEncode(formatTooltip(tooltip,$.extend(tooltip, {CurrencyIsoCode: MASystem.User.DefaultCurrency,ActualFieldName: 'avg'}))) + '</td>';
                                        layerPopupHTML += '</tr>';

                                    });
                                    layerPopupHTML += '</table>';
                                    layerPopupHTML += '</div>';
                                }
                                else
                                {
                                    layerPopupHTML += '<div class="ma-list-item shape-cluster-popup-message-noAggregates">' + MASystem.Labels.MA_No_Aggregates + '</div>';
                                    layerPopupHTML += '</table>';
                                }
                                layerPopupHTML += '</td>';
                                layerPopupHTML += '</tr>';
                            }


                            //////legend///////

                            if(MASystem.Organization.RemoveAggregatesTooltipTab)
                            {
                                layerPopupHTML += '<tr rowtype="data-row-legend" layerId="' + layerInfo.layerId + '" style="display: table-row;">';
                            }
                            else
                            {
                                layerPopupHTML += '<tr rowtype="data-row-legend" layerId="' + layerInfo.layerId + '" style="display: none;">';
                            }

                            layerPopupHTML += '<td colspan="3" >';
                            layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';
                            layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                            $.each(layerInfo.legendInfo, function (recordId, legend) {

                                //are there any records for this legend row?
                                if (layerInfo.legendCounts[legend.legendId])
                                {
                                    layerPopupHTML += '<tr class="legend-row">';
                                    layerPopupHTML += '<td class="legend-text">' + htmlEncode(legend.label) +'</td>';
                                    layerPopupHTML += '<td class="visiblemarkers" style="width: 1px; white-space: nowrap;">' + window.formatLabel(MASystem.Labels.Mobile_Legend_Count, [layerInfo.legendCounts[legend.legendId].count, legend.count])  +'</td>';
                                    // layerPopupHTML += '<td class="of" style="width: 1px; white-space: nowrap;">' + MASystem.Labels.MA_of + '</td>';
                                    // layerPopupHTML += '<td class="totalmarkers" style="width: 1px; white-space: nowrap; padding-right: 30px;">' + legend.count +'</td>';
                                    layerPopupHTML += '<td class="legend-color">' + MAMarkerBuilder.createSVG({ color: legend.markerValue, forLegend: true }) + '</td>';
                                    layerPopupHTML += '</tr>';
                                }

                            });
                            layerPopupHTML += '</table>';
                            layerPopupHTML += '</div>';

                            layerPopupHTML += '</td>';
                            layerPopupHTML += '</tr>';


                            //////actions///////
                            layerPopupHTML += '<tr rowtype="data-row-actions" layerId="' + layerInfo.layerId + '" style="display: none;">';
                            layerPopupHTML += '<td colspan="3" >';
                            layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';

                            layerPopupHTML += '</div>';
                            layerPopupHTML += '</td>';
                            layerPopupHTML += '</tr>';


                            //////markers///////

                            var sortedMarkers = MergeAndSort(mkrs);
                            layerPopupHTML += '<tr rowtype="data-row-markers" layerId="' + layerInfo.layerId + '" style="display: none;">';
                            layerPopupHTML += '<td colspan="3" >';
                            layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';

                            if (sortedMarkers.length > 100)
                            {
                                layerPopupHTML += '<div class="shape-cluster-popup-message-firstXXmarkers">' + MASystem.Labels.MA_First_Hundred + '</div>';
                            }


                            layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                            for (var i = 0; i < sortedMarkers.length; i++)
                            {
                                var sortMarker = sortedMarkers[i];
                                //grab the marker url
                                var markerIcon = '';
                                try {
                                    var mIcon =sortMarker.getIcon();
                                    markerIcon = mIcon.url;
                                }
                                catch(e){}
                                layerPopupHTML += '<tr onclick="marker_Click_byId(event,\'' + sortMarker.qid + '\',\'' + sortMarker.record.Id + '\');">';
                                layerPopupHTML += '<td style="padding: 0px;text-align: center;"><img style="height: 16px;max-width: 30px;" src="'+markerIcon+'"/></td>';
                                layerPopupHTML += '<td class="shape-popup-accordion-marker-tab-content">' + htmlEncode(sortMarker.title) + '</td>';
                                layerPopupHTML += '</tr>';

                                if (i==100)
                                {
                                    break;
                                }
                            }

                            layerPopupHTML += '</table>';
                            layerPopupHTML += '</div>';

                            layerPopupHTML += '</td>';
                            layerPopupHTML += '</tr>';


                            layerPopupHTML += '</table>';

                            popupHTML += '<div class="ma-list tooltip-accordion-unit ' + (index==0 ? 'open' : '') +  '" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<div rowtype="header" class="ma-list-header shape-cluster-popup-header tooltip-accordion-header" onclick="shape_cluster_toggle_tab(\'' + layerInfo.layerId + '\');" layerId="' + layerInfo.layerId + '">';
                            if(index === 0) {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-minus-circled"></div>';
                            }
                            else {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-plus-circled"></div>';
                            }

                            popupHTML += '<div class="inline shape-cluster-popup-header-label ma-list-item-name">' + htmlEncode(layerInfo.name) + '</div>';
                            popupHTML += '<div style="text-align:right;" class="inline shape-cluster-popup-header-count float-right">' + layerInfo.totalRecords + '</div>';
                            popupHTML += '</div>';


                            popupHTML += '<div style="padding-top: 0px; ' + (index!=0 ? 'display:none;' : '') +  '" class="ma-list-item tooltip-accordion-body"><table style="width: 100%"><tr rowtype="data" style="' + (index==0 ? '' : 'display:none;') +  '" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<td colspan="3">';
                            popupHTML += layerPopupHTML;
                            popupHTML += '</td>';
                            popupHTML += '</tr>';


                            popupHTML += '</table></div></div>';
                            htmlProcessed = true;
                        }
                        else if (layerInfo.type == 'data')
                        {
                            //process data layers
                            var legend = {};

                            if(mkrs.length > 100)
                            {
                                markersPopupHTML += '<div class="shape-cluster-popup-message-firstXXmarkers">' + MASystem.Labels.MA_First_Hundred + '</div>';
                            }
                            
                            var count = 0;
                            var rowNumbers = [];
                            var hasOtherRow = false;
                            $.each(mkrs, function(k,v) {
                                var data = v.data || {};
                                //var mkr = data.marker || {};
                                if(count < 100) {
                                    var uid = v.markerId || '';
                                    var icon = v.getIcon();
                                    if(typeof icon == 'object') {
                                        //get the url
                                        icon = icon.url || MASystem.Images.pin_error;
                                    }
                                    var title = v.title || '';
                                    markersPopupHTML += '<tr onclick="ClickDataMarker(event, \''+layerInfo.key+'\', \''+uid+'\');">';
                                    markersPopupHTML += '<td style="padding: 0px;text-align: center;"><img style="height: 16px;max-width: 30px;" src="'+icon+'"></td>';
                                    markersPopupHTML += '<td class="shape-popup-accordion-marker-tab-content">'+htmlEncode(title)+'</td>';
                                    markersPopupHTML += '</tr>';
                                }

                                var rowid = data.rowid || 'nope';
                                if(rowid !== 'nope' && !legend.hasOwnProperty(rowid)) {
                                    legend[rowid] = 1
                                    var rowNumber = rowid.replace('row-', '');
                                    if(rowNumber == 'other') {
                                        hasOtherRow = true;
                                    }
                                    else {
                                        rowNumbers.push(Number(rowNumber));
                                    }
                                }
                                else if(rowid !== 'nope' && legend.hasOwnProperty(rowid)) {
                                    legend[rowid]++;
                                }
                                count++;
                            });
                            rowNumbers.sort(function(x, y){return x-y});
                            if(hasOtherRow) {
                                rowNumbers.push('other');
                            }
                            var legendInfo = getProperty(layerInfo,'legend') || {};
                            var legendRows = legendInfo.rows || {};
                            $.each(rowNumbers, function(index, rowNumber) {
                                var k = 'row-' + rowNumber;
                                var v = legend[k];
                                if(MA.isMobile) {
                                    var legendSet = legendRows[k];
                                    legendPopupHTML += '<tr class="legend-row"><td class="legend-text">'+htmlEncode(legendSet.label)+'</td><td class="visiblemarkers" style="width: 1px; white-space: nowrap;">'+legendSet.count+'</td><td class="of" style="width: 1px; white-space: nowrap;">' + MASystem.Labels.MA_of + '</td><td class="totalmarkers" style="width: 1px; white-space: nowrap; padding-right: 30px;">'+legendSet.totalmarkers+'</td><td class="legend-color" style="width: 20px; "><img style="max-height:20px; max-width: initial;" src="'+legendSet.icon+'"></td></tr>';
                                }
                                else {
                                    var row = $('.DataLayer[key="'+layerInfo.key+'"]').find('.legend-row[uid="'+k+'"]').clone();
                                    row.find('.legend-visibility-toggle').remove();
                                    row.find('.visiblemarkers').text(v);
                                    legendPopupHTML += '<tr class="legend-row">'+row.html()+'</tr>';
                                }
                            });

                            popupHTML += '<div class="ma-list tooltip-accordion-unit ' + (index==0 ? 'open' : '') +  '" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<div rowtype="header" class="ma-list-header shape-cluster-popup-header tooltip-accordion-header" onclick="shape_cluster_toggle_tab(\'' + layerInfo.layerId + '\');" layerId="' + layerInfo.layerId + '">';
                            if(index === 0) {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-minus-circled"></div>';
                            }
                            else {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-plus-circled"></div>';
                            }
                            popupHTML += '<div class="inline shape-cluster-popup-header-label ma-list-item-name">' + htmlEncode(layerInfo.name) + '</div>';
                            popupHTML += '<div style="text-align:right;" class="inline shape-cluster-popup-header-count float-right">' + layerInfo.totalRecords + '</div>';
                            popupHTML += '</div>';

                            popupHTML += '<div style="padding-top: 0px; ' + (index!=0 ? 'display:none;' : '') +  '" class="ma-list-item tooltip-accordion-body"></table style="width: 100%"><tr rowtype="data" style="' + (index==0 ? '' : 'display:none;') +  '" layerId="' + layerInfo.layerId + '"><td colspan="2"><table style="width: 100%">';
                            popupHTML += '<tr class="ma-tab-link-group" style="border-bottom: 1px solid #d8dde6;">';

                            if(!MASystem.Organization.RemoveAggregatesTooltipTab) {
                                popupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-active active" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'aggregates\',this);">' + 'Aggregates' + '</td>';
                                popupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'legend\',this);">' + 'Legend' + '</td>';
                            }
                            else {
                                popupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-active active" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'legend\',this);">' + 'Legend' + '</td>';
                            }

                            popupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'markers\',this);">' + 'Markers' + '</td>';
                            popupHTML += '</tr>';

                            if(MASystem.Organization.RemoveAggregatesTooltipTab) {
                                popupHTML += '<tr rowtype="data-row-legend" style="display:table-row;" layerId="' + layerInfo.layerId + '">';
                            }
                            else {
                                popupHTML += '<tr rowtype="data-row-aggregates" style="display:table-row;"' +  '" layerId="' + layerInfo.layerId + '">';
                                popupHTML += '<td colspan="1" >';
                                popupHTML += '<div class="shape-cluster-popup-subtab-data-v2 ' + layerInfo.layerId + '">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</div>';
                                popupHTML += '</td>';
                                popupHTML += '</tr>';
                                popupHTML += '<tr rowtype="data-row-legend" style="display:none;" layerId="' + layerInfo.layerId + '">';
                            }

                            popupHTML += '<td colspan="1" >';
                            popupHTML += '<div class="shape-cluster-popup-subtab-data"><table class="ma-table" style="width: 100%;">';
                            popupHTML += legendPopupHTML;
                            popupHTML += '</table></div>';
                            popupHTML += '</td>';
                            popupHTML += '</tr>';
                            popupHTML += '<tr rowtype="data-row-markers" style="display:none;" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<td colspan="1" >';
                            popupHTML += '<div class="shape-cluster-popup-subtab-data"><table class="ma-table" style="width: 100%;">';
                            popupHTML += markersPopupHTML;
                            popupHTML += '</table></div>';
                            popupHTML += '</td>';
                            popupHTML += '</tr>';
                            popupHTML += '</table></td></tr></table>';
                            popupHTML += '</div></div>';

                            htmlProcessed = true;
                        }
                        else if (layerInfo.type == 'feature')
                        {
                            var layerPopupHTML = '<table style="width: 100%;">';

                            layerPopupHTML += '<tr class="ma-tab-link-group" style="border-bottom: 1px solid #d8dde6;">';

                            if(!MASystem.Organization.RemoveAggregatesTooltipTab)
                            {
                                layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-active active" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'aggregates\',this);">' + 'Aggregates' + '</td>';
                                layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'legend\',this);">' + 'Legend' + '</td>';
                            }
                            else
                            {
                                layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-active active" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'legend\',this);">' + 'Legend' + '</td>';
                            }

                            layerPopupHTML += '<td rowtype="sub-tab" layerId="' + layerInfo.layerId + '" class="ma-tab-link shape-cluster-popup-subtab-inactive" onclick="shape_cluster_toggle_subtab(\'' + layerInfo.layerId + '\',\'markers\',this);">' + 'Markers' + '</td>';
                            layerPopupHTML += '</tr>';

                            if(!MASystem.Organization.RemoveAggregatesTooltipTab)
                            {
                                layerPopupHTML += '<tr rowtype="data-row-aggregates" layerId="' + layerInfo.layerId + '">';
                                layerPopupHTML += '<td colspan="3" >';
                                if (layerInfo.hasAggregates)
                                {
                                    layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';
                                    layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                                    $.each(layerInfo.tooltips, function (recordId, tooltip)
                                    {
                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + htmlEncode(tooltip.FieldLabel) + '</td>';
                                        layerPopupHTML += '<td>' + 'Sum:' + '</td>';
                                        layerPopupHTML += '<td>' + numberWithCommas(round(tooltip.sum)) + '</td>';
                                        layerPopupHTML += '</tr>';

                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + '' + '</td>';
                                        layerPopupHTML += '<td>' + 'Avg:' + '</td>';
                                        layerPopupHTML += '<td>' + numberWithCommas(round(tooltip.avg)) + '</td>';
                                        layerPopupHTML += '</tr>';

                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + '' + '</td>';
                                        layerPopupHTML += '<td>' + 'Min:' + '</td>';
                                        layerPopupHTML += '<td>' + numberWithCommas(round(tooltip.min)) + '</td>';
                                        layerPopupHTML += '</tr>';

                                        layerPopupHTML += '<tr class="aggregate-row">';
                                        layerPopupHTML += '<td>' + '' + '</td>';
                                        layerPopupHTML += '<td>' + 'Max:' + '</td>';
                                        layerPopupHTML += '<td>' + numberWithCommas(round(tooltip.max)) + '</td>';
                                        layerPopupHTML += '</tr>';
                                    });
                                    layerPopupHTML += '</table>';
                                    layerPopupHTML += '</div>';
                                }
                                else
                                {
                                    layerPopupHTML += '<div class="ma-list-item shape-cluster-popup-message-noAggregates">' + MASystem.Labels.MA_No_Aggregates + '</div>';
                                    layerPopupHTML += '</table>';
                                }
                                layerPopupHTML += '</td>';
                                layerPopupHTML += '</tr>';
                            }


                            //////legend///////

                            if(MASystem.Organization.RemoveAggregatesTooltipTab)
                            {
                                layerPopupHTML += '<tr rowtype="data-row-legend" layerId="' + layerInfo.layerId + '" style="display: table-row;">';
                            }
                            else
                            {
                                layerPopupHTML += '<tr rowtype="data-row-legend" layerId="' + layerInfo.layerId + '" style="display: none;">';
                            }

                            layerPopupHTML += '<td colspan="3" >';
                            layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';
                            if (layerInfo.legendInfo)
                            {
                                layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                                $.each(layerInfo.legendInfo, function (recordId, legend)
                                {
                                    //are there any records for this legend row?
                                    if (layerInfo.legendCounts[legend.legendId])
                                    {
                                        layerPopupHTML += '<tr class="legend-row">';
                                        layerPopupHTML += '<td class="legend-text">' + htmlEncode(legend.label) +'</td>';
                                        // layerPopupHTML += '<td class="visiblemarkers" style="width: 1px; white-space: nowrap;">' + layerInfo.legendCounts[legend.legendId].count  +'</td>';
                                        // layerPopupHTML += '<td class="of" style="width: 1px; white-space: nowrap;">' + MASystem.Labels.MA_of + '</td>';
                                        layerPopupHTML += '<td class="totalmarkers" style="width: 1px; white-space: nowrap; padding-right: 30px;">' + window.formatLabel(MASystem.Labels.Mobile_Legend_Count, [layerInfo.legendCounts[legend.legendId].count, legend.count]) +'</td>';
                                        layerPopupHTML += '<td class="legend-color">' + MAMarkerBuilder.createSVG({ color: legend.markerValue, forLegend: true }) + '</td>';
                                        layerPopupHTML += '</tr>';
                                    }
                                });
                                layerPopupHTML += '</table>';
                            }
                            layerPopupHTML += '</div>';
                            layerPopupHTML += '</td>';
                            layerPopupHTML += '</tr>';


                            //////markers///////

                            var sortedMarkers = MergeAndSort(mkrs);
                            layerPopupHTML += '<tr rowtype="data-row-markers" layerId="' + layerInfo.layerId + '" style="display: none;">';
                            layerPopupHTML += '<td colspan="3" >';
                            layerPopupHTML += '<div class="shape-cluster-popup-subtab-data">';

                            if (sortedMarkers.length > 100)
                            {
                                layerPopupHTML += '<div class="shape-cluster-popup-message-firstXXmarkers">' + MASystem.Labels.MA_First_Hundred + '</div>';
                            }


                            layerPopupHTML += '<table class="ma-table" style="width: 100%;">';
                            for (var i = 0; i < sortedMarkers.length; i++)
                            {
                                var sortMarker = sortedMarkers[i];
                                //grab the marker url
                                var markerIcon = '';
                                try {
                                    var mIcon =sortMarker.getIcon();
                                    markerIcon = mIcon.url;
                                }
                                catch(e){}
                                layerPopupHTML += '<tr onclick="marker_Click_byId(event,\'' + sortMarker.qid + '\',\'' + sortMarker.record.Id + '\');">';
                                layerPopupHTML += '<td style="padding: 0px;text-align: center;"><img style="height: 16px;max-width: 30px;" src="'+markerIcon+'"/></td>';
                                layerPopupHTML += '<td class="shape-popup-accordion-marker-tab-content">' + htmlEncode(sortMarker.title) + '</td>';
                                layerPopupHTML += '</tr>';

                                if (i==100)
                                {
                                    break;
                                }
                            }

                            layerPopupHTML += '</table>';
                            layerPopupHTML += '</div>';

                            layerPopupHTML += '</td>';
                            layerPopupHTML += '</tr>';


                            layerPopupHTML += '</table>';

                            popupHTML += '<div class="ma-list tooltip-accordion-unit ' + (index==0 ? 'open' : '') +  '" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<div rowtype="header" class="ma-list-header shape-cluster-popup-header tooltip-accordion-header" onclick="shape_cluster_toggle_tab(\'' + layerInfo.layerId + '\');" layerId="' + layerInfo.layerId + '">';
                            if(index === 0) {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-minus-circled"></div>';
                            }
                            else {
                                popupHTML += '<div class="accordianIcon inline MAIcon ion-plus-circled"></div>';
                            }

                            popupHTML += '<div class="inline shape-cluster-popup-header-label ma-list-item-name">' + htmlEncode(layerInfo.name) + '</div>';
                            popupHTML += '<div style="text-align:right;" class="inline shape-cluster-popup-header-count float-right">' + layerInfo.totalRecords + '</div>';
                            popupHTML += '</div>';


                            popupHTML += '<div style="padding-top: 0px; ' + (index!=0 ? 'display:none;' : '') +  '" class="ma-list-item tooltip-accordion-body"><table style="width: 100%"><tr rowtype="data" style="' + (index==0 ? '' : 'display:none;') +  '" layerId="' + layerInfo.layerId + '">';
                            popupHTML += '<td colspan="2">';
                            popupHTML += layerPopupHTML;
                            popupHTML += '</td>';
                            popupHTML += '</tr>';
                            popupHTML += '</table></div></div>';
                            htmlProcessed = true;
                        }
                    }
                    else {
                        htmlProcessed = true;
                    }
                });
                popupHTML += '</div></div></div>';
            }
            else if (tab.id == 'shapeTooltipActionsTab') {
                var nonMarkerLayersFound = false;
                markerLayersInfo.forEach(function(layerInfo) {
                    if (layerInfo.type != 'marker') {
                        nonMarkerLayersFound = true;
                        return false;
                    }
                });

                var buttonSettings = JSON.parse(JSON.stringify(MA.getProperty(userSettings, 'ButtonSetSettings')));
                if (nonMarkerLayersFound) {
                    // Remove Activities & Chatter actions for data layers
                    var remove = [];
                    buttonSettings.massActionLayout.forEach(function(massActionGroup, index) {
                        if (massActionGroup.Label == "Activities" || massActionGroup.Label == "Chatter") {
                            remove.push(index);
                        }
                    });
                    remove.reverse().forEach(function(index) {
                        buttonSettings.massActionLayout.splice(index, 1);
                    });

                    // Remove other irrelevant mass actions for data layers
                    var buttonsToRemove = [
                        "Add to Campaign",
                        "Change Owner",
                        "Update Field"
                    ];
                    buttonSettings.massActionLayout.forEach(function(massActionGroup, index) {
                        if (massActionGroup.Label == "Mass Action") {
                            remove.length = 0;
                            massActionGroup.Buttons.forEach(function(button, index) {
                                if (buttonsToRemove.indexOf(button.Label) >= 0) {
                                    remove.push(index);
                                }
                            });
                            remove.reverse().forEach(function(index) {
                                massActionGroup.Buttons.splice(index, 1);
                            })
                        }
                    });
                }

                popupHTML += '<div id="' + tab.id + '">';
                
                // build shape tooltip actio buttons
                var shapeActionsButtonsResult = MAShapeLayer.buildShapeActionButtons({
                    buttonSettings: buttonSettings,
                    layerId: shapeLayerId,
                    // geometry: geometry,
                    options: geometryOptions
                });

                if (shapeActionsButtonsResult && shapeActionsButtonsResult.markup) {
                    popupHTML += '<div>' + shapeActionsButtonsResult.markup + '</div>';
                } else {
                    if (!MA.isMobile) {
                        popupHTML += '<div>' + MASystem.Labels.MA_No_Actions + '</div>';
                    }
                }

                popupHTML += '</div>';
            }
        });

        popupHTML += '</div></div>'; // end tabs and tab contents wrapper

        var processInt = setInterval(function() {
            if(htmlProcessed) {
                popupHTML += '</div>'; // end tabs and tabs content wrapper
                popupHTML += '</div></div>';
                clearInterval(processInt);
                dfd.resolve({ success: true, popupHTML: popupHTML});
            }
        },100);

        return dfd.promise();
	},
	processDataLayerAggregates : function ($popupHTMLWithActions,markerLayersInfo,dataBounds) {
		dataBounds = dataBounds || new google.maps.LatLngBounds();
		//need to send data aggregate calls after the popup is displayed
		var dfd = $.Deferred();
		var processQueue = async.queue(function (layer, processCallback) {
		    if (layer.type == 'data')
		    {
			    $popupHTMLWithActions.find('.cluster-listview-button button').remove();
			    //var dataAggregateAction = (layer.dataType || '') === 'x_dmp_data' ? 'get_dmp_aggregates_by_key' : 'get_aggregates_by_key';
			    //grab our aggregates
			    var $plottedLayer = $('#PlottedQueriesTable .DataLayer[key="'+layer.key+'"]');
			    var layerData = $plottedLayer.data();
			    //grab our plottedLayer info
			    var SFDataForLayer = layerData.SFLayerParams || {};
			    var uids = layer.uids || [];

			    var batchableUIDs = MA.Util.createBatchable(uids,1000);
			    var dataOptions = {
			        method : 'post',
			        action: 'markers',
			        subType : 'data',
			        version : '3'
			    };

			    var totalsMap = {};
			    var hasAggregates = false;
			    var CE = dataBounds.getCenter();
			    var NE = dataBounds.getNorthEast();
			    var SW = dataBounds.getSouthWest();
			    var paramerters = {
			        'data' : SFDataForLayer,
			        'mapinfo' : {
			            'nelat' : NE.lat(),
			            'nelng' : NE.lng(),
			            'swlat' : SW.lat(),
			            'swlng' : SW.lng(),
			            'celat' : CE.lat(),
			            'celng' : CE.lng(),
			            'limit' : 0
			        },
			        'ids' : [],
			        'aggregates' : 'true',
			        'details' : 'false'
			    };

			    //create a batchable section for our markers
			    var keepProcessingAggs = true;
			    var recordBatch = async.queue(function (opt, recordCallback) {
			        var uidLength = opt.recs.length;
			        paramerters.ids = opt.recs;
			        paramerters.mapinfo.limit = uidLength;
			        var jsonParams = JSON.stringify(paramerters);

			        if(keepProcessingAggs) {
				        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,
				            dataOptions ,
				            jsonParams,
				            function(res, event){
				                if(event.status && keepProcessingAggs) {
				                    if(res && res.success) {
				                        var data = res.data || {};
				                        var aggregates = data.aggregates || [];
				                        if(aggregates.length > 0) {

				                            hasAggregates = true;
				                            $.each(aggregates || [], function (i, a) {

				                                var totals = totalsMap[a.label] || {max : null, sum : null, min : null, avg : null}
				                                var sum = a.sum != undefined ? parseFloat(a.sum).toFixed(2) : 'N/A';
				                                var avg = a.avg != undefined ? parseFloat(a.avg).toFixed(2) : 'N/A';
				                                var max = a.max != undefined ? parseFloat(a.max).toFixed(2) : 'N/A';
				                                var min = a.min != undefined ? parseFloat(a.min).toFixed(2) : 'N/A';

				                                if(a.max != undefined) {
				                                    var max = parseFloat(a.max);
				                                    if(totals.max == null) {
				                                        totals.max = max;
				                                    }
				                                    else if (max > totals.max) {
				                                        totals.max = max;
				                                    }
				                                }
				                                if(a.sum != undefined) {
				                                    var sum = parseFloat(a.sum);
				                                    if(totals.sum == null) {
				                                        totals.sum = sum;
				                                    }
				                                    else {
				                                        totals.sum = totals.sum + sum;
				                                    }
				                                }
				                                if(a.min != undefined) {
				                                    var min = parseFloat(a.min);
				                                    if(totals.min == null) {
				                                        totals.min = min;
				                                    }
				                                    else if (min < totals.min) {
				                                        totals.min = min;
				                                    }
				                                }
				                                if(a.avg != undefined) {
				                                    var avg = parseFloat(a.avg);
				                                    if(totals.avg == null) {
				                                        totals.avg = avg;
				                                    }
				                                    else {
				                                        totals.avg = (totals.avg + avg) / 2;
				                                    }
				                                }
				                                totalsMap[a.label] = totals;
				                            });
				                        }
				                        else {
				                        	keepProcessingAggs = false;
				                        }
				                        recordCallback();
				                    }
				                    else {
				                        recordCallback();
				                    }
				                }
				                else {
				                    recordCallback();
				                }
				            },{escape:false,timeout:120000,buffer:false}
				        );
					}
			        else {
			        	recordCallback();
			        }
			    });

			    recordBatch.concurrency = 5;

			    recordBatch.drain = function () {
			        var tempHtml = '<table class="ma-table" style="width: 100%;">';
			        var foundAggs = false;
			        $.each(totalsMap,function(key,totals) {
			            foundAggs = true;
			            if(hasAggregates) {
			                var sum = totals.sum != null ? MA.Util.formatNumberString(totals.sum) : 'N/A';
			                var avg = totals.avg != null ? MA.Util.formatNumberString(totals.avg) : 'N/A';
			                var max = totals.max != null ? MA.Util.formatNumberString(totals.max) : 'N/A';
			                var min = totals.min != null ? MA.Util.formatNumberString(totals.min) : 'N/A';
			                tempHtml += '<tr class="aggregate-row"><td>'+htmlEncode(key)+'</td><td>Sum:</td><td>'+sum+'</td></tr>';
			                tempHtml += '<tr class="aggregate-row"><td></td><td>Avg:</td><td>'+avg+'</td></tr>';
			                tempHtml += '<tr class="aggregate-row"><td></td><td>Min:</td><td>'+min+'</td></tr>';
			                tempHtml += '<tr class="aggregate-row"><td></td><td>Max:</td><td>'+max+'</td></tr>';
			            }
			            else {
			                tempHtml = '<div class="ma-list-item shape-cluster-popup-message-noAggregates">' + MASystem.Labels.MA_No_Aggregates + '</div>';
			            }
			        });
			        if(!foundAggs) {
			        	tempHtml = '<div class="ma-list-item shape-cluster-popup-message-noAggregates">' + MASystem.Labels.MA_No_Aggregates + '</div>';
			        }
			        tempHtml += '</table>';
			        $('.shape-cluster-popup-subtab-data-v2.'+layer.layerId).html(tempHtml);
			        MA.Map.InfoBubble.adjust();
			        //call back to layer queue
			        processCallback();
			    };

			    $.each(batchableUIDs,function(i,batch) {
			        recordBatch.push({recs:batch},function(){});
			    });
			}
			else {
				//have had issues where these fire too quickly, add quick timeout
				setTimeout(function() {
					processCallback();
				},5);
			}
		});

		processQueue.concurrency = 1;

		processQueue.drain = function () {
		    //done processing
		    dfd.resolve({success:true});
		};

		if(markerLayersInfo.length == 0) {
			processQueue.kill();
			dfd.resolve({success:true});
		}

		//add to the queue
		$.each(markerLayersInfo, function (index, layer) {
		    processQueue.push(layer,function() {});
		});

		return dfd.promise();
    }
}

function getShapeLayerGeometry(options) {
    options = options || {};
    var $dfd = $.Deferred();

    var feature = options.feature;
    var dissolve = options.dissolve;
    var uid = MA.getProperty(options, 'feature.qid');

    // shape info
    var center = MA.getProperty(options, 'shape') instanceof  google.maps.Circle ? options.shape.getCenter() : null;
    var radius = MA.getProperty(options, 'shape') instanceof  google.maps.Circle ? options.shape.getRadius() : null;
    var bounds = MA.getProperty(options, 'shape') instanceof  google.maps.Rectangle ? options.shape.getBounds() : null;
    var path = MA.getProperty(options, 'shape') instanceof  google.maps.Polygon ? options.shape.getPath() : null;
    var shapeType = MA.getProperty(options, 'shape.shapeType');

    var shapeLayerData = $('[qid="' + uid + '"]').data();

    var territoryId = MA.getProperty(options, 'territoryId') || MA.getProperty(shapeLayerData, 'id');

    var geoId = feature ? feature.getProperty('id') : null;
    var geoIds = MA.getProperty(shapeLayerData, 'popupData.geometry');

    var params;

    // build shape geometry parameters
    if (shapeType == 'travelTime' || shapeType == 'travelDistance') {
        // do nothing, don't calcuate area for travel time and distance for now
    }
    else if (territoryId) {
        params = { territoryId: territoryId };
    }
    else if (center && isNum(radius)) {
        params = {
            type: 'circle',
            radius: radius,
            lat: center.lat(),
            lng: center.lng()
        };
    }
    else if (bounds) {
        params = {
            type: 'rectangle',
            NE: bounds.getNorthEast(),
            SW: bounds.getSouthWest()
        };
    }
    else if (path) {
        var points = [];
        
        path.getArray().forEach(function(point) {
            points.push({
                lat: point.lat(),
                lng: point.lng()
            });
        });

        params = {
            type: 'polygon',
            points: points,
        };
    }

    // get geometry
    if (params) {
        MA.getShapeGeometry(params)
            .then(function(res) {
                var area;
                var geometry = dissolve ? MA.getProperty(res, 'total') : MA.getProperty(res, ['geometries', geoId]) || MA.getProperty(res, 'geometries.custom');
                var unit =  MA.getProperty(res, 'unit');

                if (geometry && (isNum(geometry.area) || isNum(geometry.perimeter))) {
                    $dfd.resolve({
                        perimeter: geometry.perimeter,
                        area: geometry.area,
                        unit: unit
                    });
                } else {
                    $dfd.resolve({ message: 'Invalid or unexepected shape geometry result' });
                }
            })
            .fail($dfd.reject);
    } else {
        $dfd.reject({ message: 'No shape parameters found or geometry is not supported for this shape' });
    }

    return $dfd.promise();
}

function validateDate(value)
{
    var result = {success:false};

    if(typeof value == 'string') {
        value = value.trim();

        if(value.match(/^\d+\/\d+\/\d+$/)) {
            result = {
                success:true,
                date: value.trim(),
            };
        }
        else {
            result = {
                success:false,
                message: 'Invalid date format: ' + value,
            };
        }
    } else {
        result = {
            success: false,
            message: 'Date input type unexpected: ' + value,
        };
    }

    result.input = value;

    return result;
}

function validateTime(value)
{
    var errorMsg = "";
    //remove white space for validation
    var inputFormat;

    value = value || '';
    value = value.toLowerCase().replace(/\s/g, '');
    // regular expression to match required time format
    re = /^(\d{1,2}):(\d{2})(:00)?([ap]m)?$/;

    if(value != '') {
        if(regs = value.match(re)) {
            if(regs[4]) {
                // 12-hour time format with am/pm
                inputFormat = '12hr';

                if(regs[1] < 1 || regs[1] > 12) {
                    errorMsg = "Invalid value for hours: " + regs[1];
                }
            } else {
                // 24-hour time format
                inputFormat = '24hr';

                if(regs[1] < 0 || regs[1] > 23) {
                    errorMsg = "Invalid value for hours: " + regs[1];
                }
            }
            if(!errorMsg && regs[2] > 59) {
                errorMsg = "Invalid value for minutes: " + regs[2];
            }
        } else {
            errorMsg = "Invalid time format: " + value;
        }
    }
    else {
        errorMsg = "Time cannot be blank.";
    }

    if(errorMsg != "") {
        //alert(errorMsg);
        //field.focus();
        return {success:false,message:errorMsg, input:value};
    }
    var converted24hrTime = convertTo24Hour(value);
    var time24hr = moment(converted24hrTime,'HH:mm').format('HH:mm');
    var time12hr = moment(converted24hrTime,'HH:mm').format('h:mm A');
    return {success:true,'time12hr':time12hr, 'time24hr':time24hr, input:value, inputFormat:inputFormat};
}

function convertTo24Hour(time) {
    var hours = parseInt(time.substr(0, 2));
    if(time.indexOf('am') != -1 && hours == 12) {
        time = time.replace('12', '0');
    }
    if(time.indexOf('pm')  != -1 && hours < 12) {
        time = time.replace(hours, (hours + 12));
    }
    return time.replace(/(am|pm)/, '');
}

/* String Functions */
String.prototype.removeStart = function (prefix) { return this.indexOf(prefix) == 0 ? this.substring(prefix.length) : this.toString(); }

//styled markers, this can probably be moved to the static resource once done changing it to fit our needs.

var StyledIconTypes = {};
var StyledMarker, StyledIcon;

/**
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
function inherits(childCtor, parentCtor) {
    /** @constructor */
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    /** @override */
    childCtor.prototype.constructor = childCtor;
}

(function() {
    if(typeof google === 'object') {
        var bu_ = 'https://chart.googleapis.com/chart?chst=';
        var gm_ = google.maps;
        var gp_ = gm_.Point;
        var ge_ = gm_.event;
        var gmi_ = gm_.MarkerImage;


        /**
         * This class is an extended version of google.maps.Marker. It allows
         * styles to be applied that change it's appearance.
         * @extends google.maps.Marker
         * @param {StyledMarkerOptions} StyledMarkerOptions The options for the Marker
         */
        StyledMarker = function(styledMarkerOptions) {
            gm_.Marker.call(this);
            var me=this;
            var ci = me.styleIcon = styledMarkerOptions.styleIcon;
            me.bindTo('icon',ci);
            me.bindTo('shadow',ci);
            me.bindTo('shape',ci);
            me.setOptions(styledMarkerOptions);
        };
        inherits(StyledMarker, gm_.Marker);

        /**
         * This class stores style information that can be applied to StyledMarkers.
         * @extends google.maps.MVCObject
         * @param {StyledIconType} styledIconType The type of style this icon is.
         * @param {StyledIconOptions} styledIconOptions The options for this StyledIcon.
         * @param {StyledIcon} styleClass A class to apply extended style information.
         */
        StyledIcon = function(styledIconType,styledIconOptions,styleClass) {
            var k;
            var me=this;
            var i_ = 'icon';
            var sw_ = 'shadow';
            var s_ = 'shape';
            var a_ = [];

            function gs_() {
                var image_ = document.createElement('img');
                var simage_ = document.createElement('img');
                ge_.addDomListenerOnce(simage_, 'load', function() {
                    var w = simage_.width, h = simage_.height;
                    me.set(sw_,new gmi_(styledIconType.getShadowURL(me),null,null,styledIconType.getShadowAnchor(me,w,h)));
                    simage = null;
                });
                ge_.addDomListenerOnce(image_, 'load', function() {
                    var w = image_.width, h = image_.height;
                    me.set(i_,new gmi_(styledIconType.getURL(me),null,null,styledIconType.getAnchor(me,w,h)));
                    me.set(s_,styledIconType.getShape(me,w,h));
                    image_ = null;
                });
                image_.src = styledIconType.getURL(me);
                simage_.src = styledIconType.getShadowURL(me);
            }

            /**
             * set:
             * This function sets a given style property to the given value.
             * @param {String} name The name of the property to set.
             * @param {Object} value The value to set the property to.
             * get:
             * This function gets a given style property.
             * @param {String} name The name of the property to get.
             * @return {Object}
             */
            me.as_ = function(v) {
                a_.push(v);
                for(k in styledIconOptions) {
                    v.set(k, styledIconOptions[k]);
                }
            }

            if (styledIconType !== StyledIconTypes.CLASS) {
                for (k in styledIconType.defaults) {
                    me.set(k, styledIconType.defaults[k]);
                }
                me.setValues(styledIconOptions);
                me.set(i_,styledIconType.getURL(me));
                me.set(sw_,styledIconType.getShadowURL(me));
                if (styleClass) styleClass.as_(me);
                gs_();
                me.changed = function(k) {
                    if (k!==i_&&k!==s_&&k!==sw_) {
                        gs_();
                    }
                };
            } else {
                me.setValues(styledIconOptions);
                me.changed = function(v) {
                    styledIconOptions[v] = me.get(v);
                    for (k = 0; k < a_.length; k++) {
                        a_[k].set(v,me.get(v));
                    }
                };
                if (styleClass) styleClass.as_(me);
            }
        };
        StyledIcon.prototype = new gm_.MVCObject();

        /**
         * StyledIconType
         * This class holds functions for building the information needed to style markers.
         * getURL:
         * This function builds and returns a URL to use for the Marker icon property.
         * @param {StyledIcon} icon The StyledIcon that holds style information
         * @return {String}
         * getShadowURL:
         * This function builds and returns a URL to use for the Marker shadow property.
         * @param {StyledIcon} icon The StyledIcon that holds style information
         * @return {String{
        * getAnchor:
        * This function builds and returns a Point to indicate where the marker is placed.
         * @param {StyledIcon} icon The StyledIcon that holds style information
         * @param {Number} width The width of the icon image.
         * @param {Number} height The height of the icon image.
         * @return {google.maps.Point}
         * getShadowAnchor:
         * This function builds and returns a Point to indicate where the shadow is placed.
         * @param {StyledIcon} icon The StyledIcon that holds style information
         * @param {Number} width The width of the shadow image.
         * @param {Number} height The height of the shadow image.
         * @return {google.maps.Point}
         * getShape:
         * This function builds and returns a MarkerShape to indicate where the Marker is clickable.
         * @param {StyledIcon} icon The StyledIcon that holds style information
         * @param {Number} width The width of the icon image.
         * @param {Number} height The height of the icon image.
         * @return {google.maps.MarkerShape}
         */

        StyledIconTypes.CLASS = {};

        StyledIconTypes.MARKER = {
            defaults: {
                text:'',
                color:'00ff00',
                fore:'000000',
                starcolor:null
            },
            getURL: function(props){
                var _url;
                var starcolor_=props.get('starcolor');
                var text_=props.get('text');
                var color_=props.get('color').replace(/#/,'');
                var fore_=props.get('fore').replace(/#/,'');
                if (starcolor_) {
                    _url = bu_ + 'd_map_xpin_letter&chld=pin_star|';
                } else {
                    _url = bu_ + 'd_map_pin_letter&chld=';
                }
                if (text_) {
                    text_ = text_.substr(0,2);
                }
                _url+=text_+'|';
                _url+=color_+'|';
                _url+=fore_;
                if (starcolor_) {
                    _url+='|'+starcolor_.replace(/#/,'');
                }
                return _url;
            },
            getShadowURL: function(props){
                if (props.get('starcolor')) {
                    return bu_ + 'd_map_xpin_shadow&chld=pin_star';
                } else {
                    return bu_ + 'd_map_pin_shadow';
                }
            },
            getAnchor: function(props,width,height){
                return new gp_(width / 2,height);
            },
            getShadowAnchor: function(props,width,height){
                return new gp_(width / 4,height);
            },
            getShape: function(props,width,height){
                var _iconmap = {};
                _iconmap.coord = [
                    width / 2, height,
                    (7 / 16) * width, (5 / 8) * height,
                    (5 / 16) * width, (7 / 16) * height,
                    (7 / 32) * width, (5 / 16) * height,
                    (5 / 16) * width, (1 / 8) * height,
                    (1 / 2) * width, 0,
                    (11 / 16) * width, (1 / 8) * height,
                    (25 / 32) * width, (5 / 16) * height,
                    (11 / 16) * width, (7 / 16) * height,
                    (9 / 16) * width, (5 / 8) * height
                ];
                for (var i = 0; i < _iconmap.coord.length; i++) {
                    _iconmap.coord[i] = Math.round(_iconmap.coord[i]);
                }
                _iconmap.type = 'poly';
                return _iconmap;
            }
        };

        StyledIconTypes.BUBBLE = {
            defaults: {
                text:'',
                color:'00ff00',
                fore:'000000'
            },
            getURL: function(props){
                var _url = getProperty(MASystem, 'Organization.MAIO_URL', false)
                + '/images/labels/v2?fontcolor=' + props.get('fore').replace(/#/,'%23')
                + '&bgcolor=' + props.get('color').replace(/#/,'%23')
                + '&bgopacity=1&fontsize=12px&text=' + props.get('text');
                return _url;
            },
            getShadowURL: function(props){
                return undefined;
            },
            getAnchor: function(props,width,height){
                return new google.maps.Point(0,22);
            },
            getShadowAnchor: function(props,width,height){
                return new google.maps.Point(0,24);
            },
            getShape: function(props,width,height){
                var _iconmap = {};
                _iconmap.coord = [
                    0,44,
                    13,26,
                    13,6,
                    17,1,
                    width - 4,1,
                    width,6,
                    width,21,
                    width - 4,26,
                    21,26
                ];
                _iconmap.type = 'poly';
                return _iconmap;
            }
        };
    }
})();

/* Jquery Sort Function */
jQuery.fn.sortElements = (function(){

    var sort = [].sort;
    return function(comparator, getSortable) {

        getSortable = getSortable || function(){return this;};

        var placements = this.map(function(){

            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,

                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );

            return function() {

                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }

                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);

            };

        });

        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });

    };

})();

/*************************
 *
 * Chatter Post
 *
**************************/
function ChatterPost(recordIds)
{
    if(MA.isMobile) {
        MALayers.showModal('ChatterPostPopup');
    }
    else {
        LaunchPopupWindow($('#ChatterPostPopup'), 800);
    }

    //store the record ids for later use
    $('#ChatterPostPopup').data({
        recordIds: recordIds
    });

    //clear out any existing data
    $('#chatterpost-content').val('');
    hideMessage($('#chatterpost-content-wrapper'));
}

function ChatterPost_Finish()
{
    //show loading
    var $mobileLoad;
    if(MA.isMobile) {
        $mobileLoad = MAToastMessages.showLoading({message:MASystem.Labels.Chatter_Posting,timeOut:0,extendedTimeOut:0});
        $('#chatterpost-content-wrapper').data({ batchCount: 0, successCount: 0, failureCount: 0 });
        MALayers.hideModal();
    }
    else {
        showLoading($('#chatterpost-content-wrapper').data({ batchCount: 0, successCount: 0, failureCount: 0 }), MASystem.Labels.Chatter_Posting);
    }

    //loop through records and send out batches
    var recordIds = [];
    $.each($('#ChatterPostPopup').data('recordIds'), function (index, recordId) {
        recordIds.push(recordId);

        //send out this batch if it's ready
        if (recordIds.length > 200)
        {
            ChatterPost_SendBatch(recordIds);
        }
    });

    //send the last batch if needed
    if (recordIds.length > 0) {
        ChatterPost_SendBatch(recordIds);
    }

    //done sending batches, update status message
    if(MA.isMobile) {
        $mobileLoad.find('.toast-title').text(window.formatLabel(MASystem.Labels.Chatter_Posting_Batches_Remaining, [$('#chatterpost-content-wrapper').data('batchCount')]));
    }
    else {
        showLoading($('#chatterpost-content-wrapper'), window.formatLabel(MASystem.Labels.Chatter_Posting_Batches_Remaining, [$('#chatterpost-content-wrapper').data('batchCount')]));
    }

    //set an interval to track when all the batches have returned
    $('#chatterpost-content-wrapper').data(
        'batchInterval',
        setInterval(function () {

            if ($('#chatterpost-content-wrapper').data('batchCount') == 0)
            {
                //clear this interval because we're done
                clearInterval($('#chatterpost-content-wrapper').data('batchInterval'));

                //show status message and then close the popup
                if ($('#chatterpost-content-wrapper').data('failureCount') == 0)
                {
                    if(MA.isMobile) {
                        MAToastMessages.hideMessage($mobileLoad);
                        MAToastMessages.showSuccess({message:'Success',subMessage:$('#chatterpost-content-wrapper').data('successCount') + ' posts, 0 failures.'});
                    }
                    else {
                        showSuccess($('#chatterpost-content-wrapper'), $('#chatterpost-content-wrapper').data('successCount') + ' posts, 0 failures.', 2000, function () {
                            ClosePopupWindow();
                        });
                    }
                }
                else
                {
                    if(MA.isMobile) {
                        MAToastMessages.hideMessage($mobileLoad);
                        MAToastMessages.showWarning({message:'Success',subMessage:$('#chatterpost-content-wrapper').data('successCount') + ' posts, ' + $('#chatterpost-content-wrapper').data('failureCount') + ' failure(s).'});
                    }
                    else {
                        showWarning($('#chatterpost-content-wrapper'), $('#chatterpost-content-wrapper').data('successCount') + ' posts, ' + $('#chatterpost-content-wrapper').data('failureCount') + ' failure(s).', 2000, function () {
                            ClosePopupWindow();
                        });
                    }
                }
            }
            else
            {
                //status update
                if(MA.isMobile) {
                    $mobileLoad.find('.toast-title').text(window.formatLabel(MASystem.Labels.Chatter_Posting_Batches_Remaining, [$('#chatterpost-content-wrapper').data('batchCount')]));
                }
                else {
                    showLoading(window.formatLabel(MASystem.Labels.Chatter_Posting_Batches_Remaining, [$('#chatterpost-content-wrapper').data('batchCount')]));
                }

            }

        }, 1000)
    );
}

function ChatterPost_SendBatch(recordIds)
{
    //prepare request data
    //send request to add tasks
    var processData = {
    	ajaxResource : 'TooltipAJAXResources',

    	action: 'chatter_post',
    	serializedRecordIds : JSON.stringify(recordIds),
        content             : $('#chatterpost-content').val()
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(response, event){
            if (response.success)
            {
                //count the number of successful/failed responses
                var failures = 0;
                var successes = 0;
                $.each(response.results, function (index, result) {
                    if (result.success) {
                        successes++;
                    }
                    else {
                        failures++;
                    }
                });

                //decrement the batches we have out
                $('#chatterpost-content-wrapper').data('batchCount', $('#chatterpost-content-wrapper').data('batchCount') - 1);
                $('#chatterpost-content-wrapper').data('failureCount',$('#chatterpost-content-wrapper').data('failureCount') + failures);
                $('#chatterpost-content-wrapper').data('successCount',$('#chatterpost-content-wrapper').data('successCount') + successes);
            }
            else
            {
                //decrement the batches we have out
                $('#chatterpost-content-wrapper').data('batchCount', $('#chatterpost-content-wrapper').data('batchCount') - 1);
                $('#chatterpost-content-wrapper').data('failureCount',$('#chatterpost-content-wrapper').data('failureCount') + recordIds.length);
            }
    	},{buffer:false,escape:false}
    );

    //increment the batches that we have out and restart the id list
    $('#chatterpost-content-wrapper').data('batchCount',$('#chatterpost-content-wrapper').data('batchCount') + 1);
    recordIds.length = 0;
}

function updateChatterSubscriptions(shouldFollow, records)
{
    //show a status message
    var $status;

    if(MA.isMobile) {
        $status = MAToastMessages.showLoading({message:MASystem.Labels.Chatter_Updating_Subscriptions,timeOut:0,extendedTimeOut:0}).data({ batchCount: 0, failureCount: 0 });
    }
    else {
        $status = growlLoading($('#growl-wrapper'), MASystem.Labels.Chatter_Updating_Subscriptions)
        .data({ batchCount: 0, failureCount: 0 });
    }

    //loop through all plotted queries looking for visible records
    var recordIds = [];
    $.each(records, function(index, record) {
        var supportsChatter = false;
        var recordId;
        var queryData = record.plottedQuery.data();
        supportsChatter = queryData.options.supportsChatter;
        recordId = record.Id;
        //make sure this objects supports chatter
        if (supportsChatter) {
            recordIds.push(recordId);

            //send out this batch if it's ready
            if (recordIds.length > 200) {
                sendChatterSubscriptionsBatch($status, recordIds, shouldFollow);
            }
        }
    });

    //send the last batch if needed
    if (recordIds.length > 0) {
        sendChatterSubscriptionsBatch($status, recordIds, shouldFollow);
    }

    //done sending batches, update status message
    if(MA.isMobile) {
        $status.find('.toast-title').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
    }
    else {
        $status.find('span').not('.MA2-loader').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
    }

    //set an interval to track when all the batches have returned
    $status.data(
        'batchInterval',
        setInterval(function () {

            if ($status.data('batchCount') == 0)
            {
                //clear this interval because we're done
                clearInterval($status.data('batchInterval'));

                //show success
                if(MA.isMobile) {
                    MAToastMessages.hideMessage($status);
                    MAToastMessages.showSuccess({message:MASystem.Labels.Chatter_Follow_Update_Successfully});
                }
                else {
                    $status = growlSuccess($status, MASystem.Labels.Chatter_Follow_Update_Successfully);
                }
            }

        }, 1000)
    );
}

function sendChatterSubscriptionsBatch($status, recordIds, shouldFollow)
{
    //send request
    var recordCount = recordIds.length;
    var processData = {
    	ajaxResource : 'TooltipAJAXResources',

    	action: 'update_chatter_subscriptions',
    	serializedRecordIds: JSON.stringify(recordIds),
    	shouldFollow: shouldFollow
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(response, event){
            if (response.success)
            {
                var isTooltipOpen = checkTooltipOpen();
                if (isTooltipOpen && !MA.isMobile ){
                    var tooltipRecordId = $('#tooltip-content').find('div[class=name]').find('a[href]').attr('href').replace(/\//g, '');
                    if (recordIds.includes(tooltipRecordId) && $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`)!==0){
                        $(`tr[data-id=${tooltipRecordId}][rowtype=data-row]`).find("a[onclick*='MAListView.MarkerClick']").trigger('click');
                    }
                }

            }
            else
            {
                $status.data('failureCount', $status.data('failureCount') + recordCount);
            }

            //decrement the batches we have out
            $status.data('batchCount', $status.data('batchCount') - 1);
            if(MA.isMobile) {
                $status.find('.toast-title').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
            }
            else {
                $status.find('span').not('.MA2-loader').text(window.formatLabel(MASystem.Labels.Chatter_Updating_Batches_Remaining, [$status.data('batchCount')]));
            }
    	},{buffer:false,escape:false}
    );

    //increment the batches that we have out and restart the id list
    $status.data('batchCount', $status.data('batchCount') + 1);
    recordIds.length = 0;
}

/*********************************
 *
 * Event/Task Functions
 *
 ********************************/
function NewTask(recordIdMap)
{
    var $popup = $('#NewTaskPopup');
    MALayers.showModal('NewTaskPopup');
    $popup.find('.step2').hide();
    $popup.find('.step1').show();

    //store the record ids for later use
    $popup.data({
        recordIdMap: recordIdMap
    });

    //clear out any existing data
    $('#newtask-details-wrapper').addClass('hidden');
    $popup.find('.taskSubject').removeClass('error');
    $('#newtask-assignto-wrapper').removeClass('hidden');
    $('#newtask-filter-name').val('');
    $('#newtask-details-wrapper input, #newtask-details-wrapper textarea').val('');
    $('#newtask-assignto-type-static').click();

    //clear previous search history
    $popup.find('.search-table-view').empty().html('<li class="table-view-cell">' + MASystem.Labels.MA_SearchAboveEllipsis + '</li>');
    $popup.find('.searchDynamicInput ').val('').removeAttr('data-id');
    //showLoading($('#newtask-select-grid-wrapper'), 'Loading Users...');

    //keep track of origin
    $popup.data('domOrigin',$popup.find('.searchDynamicInput '));
    //clear any previous
    $('#searchDynamicInput').val('');
    $popup.find('.search-empty-state').removeClass('hidden');
    $popup.find('.search-results-wrapper').addClass('hidden');

    //remove any previous event listener
    $popup.off('keyup','.searchDynamicInput');
    $popup.on('keyup','.searchDynamicInput',function () {
        var $input = $(this);
        var searchTerm = $input.val();

        var $searchResults = $popup.find('.search-table-view').empty();
        if (searchTimeout !== null) {
            clearTimeout(searchTimeout);
        }

        if(searchTerm === '') {
            $popup.find('.search-empty-state').removeClass('hidden');
            $popup.find('.search-results-wrapper').addClass('hidden');
            return;
        }

        searchTimeout = setTimeout(function() {
            searchTimeout = null;
            var $favLoading = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading,timeOut:0,extendedTimeOut:0});

            searchUsers(searchTerm).then(function(res) {
                $popup.find('.search-empty-state').addClass('hidden');
                $popup.find('.search-results-wrapper').removeClass('hidden');
                MAToastMessages.hideMessage($favLoading);
                $favLoading = null;
                if(res.success) {
                    var resultHTML = '';
                    var userData = res.users || [];
                    var userDataLength = userData.length;
                    var resultHTML = '';
                    if(userDataLength === 0) {
                        //show no results
                        $searchResults.html('<li class="table-view-cell">' + MASystem.Labels.MA_No_Results + '</li>');
                    }
                    else {
                        $.each(userData, function (index, data) {
                            resultHTML += '<li class="table-view-cell ownerSuccess" data-id="'+htmlEncode(data.Id)+'">'+htmlEncode(data.Name)+'</li>';
                        });

                        $searchResults.html(resultHTML);

                        //attach click handler to rows
                        $searchResults.off('click','.ownerSuccess');
                        $searchResults.on('click','.ownerSuccess',function () {
                            var $row = $(this);
                            var dataId = $row.attr('data-id');
                            var rowVal = $row.text();

                            var $searchOriginLocation = $popup.data('domOrigin');

                            $searchOriginLocation.attr('data-id',dataId).val(rowVal);

                            //hide modal
                            MALayers.hideModal('dynamicSearchModal',false);

                            var selection = {
                                Name : rowVal,
                                Id : dataId
                            };
                            NewTask_Step2();
                        });
                    }
                }
                else {
                    $searchResults.html('<li class="table-view-cell">' + MASystem.Labels.MA_No_Results + '</li>');
                }
            });
        },500);
    });

    //init date picker
    $popup.find('.taskDate').datepicker({ dateFormat: formatUserLocaleDate({datepicker : true}) });

    //send a request to get the available user lookup fields for these base objects
    var $baseObjTable = $('#newtask-assignto-type-dynamic-table').html('<thead class="ma-table-header"><tr><th>Base Object</th><th>Task Owner</th></tr></thead>');

    var processData = {
    	ajaxResource : 'TooltipAJAXResources',

    	action: 'get_lookup_fields',
    	baseObjects: JSON.stringify(Object.keys(recordIdMap)),
    	relatedObjects: JSON.stringify(['User'])
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(response, event){
            if (response.success)
            {
                $.each(response.lookupOptions, function (baseObject, options) {
                    var $row;
                    if(MA.isMobile) {
                        $row = $('<tr><td class="label" /><td class="value"><div class="ma-form-control has-inset-icon--right"><i class="ma-icon ma-icon-down inset-icon--right" style="font-size: 20px;top: 5px;"></i><select class="field ma-input" /></div></td></tr>').appendTo($baseObjTable);
                    }
                    else {
                        $row = $('<tr><td class="label" /><td class="value"><div class="ma-form-control has-inset-icon--right"><i class="MAIcon ion-android-arrow-dropdown inset-icon--right" style="font-size: 20px;top: 5px;"></i><select class="field ma-input" /></div></td></tr>').appendTo($baseObjTable);
                    }
                    $row.find('.label').text(recordIdMap[baseObject].baseObjectLabel);

                    var $fieldOptions = $row.find('.field');
                    $.each(options, function (index, option) {
                        $fieldOptions.append($('<option/>').attr('value', option.value).text(option.label));
                    });
                });
            }
    	},{buffer:false,escape:false}
    );
}

function NewTask_Step1()
{
    //go back to step 1
    $('#NewTaskPopup').find('.step2').hide();
    $('#NewTaskPopup').find('.step1').show();
    $('#newtask-assignto-wrapper').removeClass('hidden');
    $('#newtask-details-wrapper').addClass('hidden');
}

function NewTask_Step2()
{
    //ensure we have an id
    if($('[name="newtask-assignto-type"]:checked').val() == 'Static') {
        if($('#NewTaskPopup .searchDynamicInput ').attr('data-id') == undefined) {
            MAToastMessages.showError({message:'Please select a user before continuing.'});
            return;
        }
    }
    //show step 2
    $('#NewTaskPopup').find('.step2').show();
    $('#NewTaskPopup').find('.step1').hide();
    $('#newtask-assignto-wrapper').addClass('hidden')
    $('#newtask-details-wrapper').removeClass('hidden');
}

function NewTask_Finish()
{
    var dfd = jQuery.Deferred();
    var $popup = $('#NewTaskPopup');
    $popup.find('.taskSubject').removeClass('error');
    $popup.find('.taskDate').removeClass('error');
    //error check
    if($popup.find('.taskSubject').val() == '') {
        $popup.find('.taskSubject').addClass('error');
        return;
    }

    if($popup.find('.taskDate').val() == '') {
        $popup.find('.taskDate').addClass('error');
        return;
    }

    //remove event listeners from popup
    $popup.off('keyup','.searchDynamicInput');
    $popup.off('click','.searchDynamicInput ');
    //destroy date picker
    $popup.find('.taskDate').datepicker('destroy');

    MALayers.hideModal('NewTaskPopup');

    //show loading
    $('#newtask-details-wrapper').data({ batchCount: 0, successCount: 0, failureCount: 0 });
    var $taskLoader = MAToastMessages.showLoading({message:MASystem.Labels.ActionFramework_New_Task,subMessage:'Adding Tasks...',timeOut:0,extendedTimeOut:0});

    var recordIdMap = $popup.data('recordIdMap');

    //loop through records and send out batches
    $.each(recordIdMap, function (baseObjectName, map)
    {
        var recordIds = [];
        $.each(map.recordIds, function (index, recordId) {
            recordIds.push(recordId);

            //send out this batch if it's ready
            if (recordIds.length > 200)
            {
                NewTask_SendBatch(recordIds, baseObjectName, map.baseObjectLabel);
            }
        });

        //send the last batch if needed
        if (recordIds.length > 0) {
            NewTask_SendBatch(recordIds, baseObjectName, map.baseObjectLabel);
        }
    });

    //done sending batches, update status message
    $taskLoader.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [$('#newtask-details-wrapper').data('batchCount')]));

    //set an interval to track when all the batches have returned
    $('#newtask-details-wrapper').data(
        'batchInterval',
        setInterval(function () {

            if ($('#newtask-details-wrapper').data('batchCount') == 0)
            {
                dfd.resolve();
                MAToastMessages.hideMessage($taskLoader);
                //clear this interval because we're done
                clearInterval($('#newtask-details-wrapper').data('batchInterval'));

                //show status message and then close the popup
                if ($('#newtask-details-wrapper').data('failureCount') == 0)
                {
                    MAToastMessages.showSuccess({message:MASystem.Labels.ActionFramework_New_Task,subMessage:$('#newtask-details-wrapper').data('successCount') + ' records added, 0 failures.'});
                }
                else
                {
                    MAToastMessages.showWarning({message:MASystem.Labels.ActionFramework_New_Task,subMessage:$('#newtask-details-wrapper').data('successCount') + ' records added, ' + $('#newtask-details-wrapper').data('failureCount') + ' failure(s).',timeOut:0,extendedTimeOut:0, closeButton:true});
                }
            }
            else
            {
                //status update
                $taskLoader.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [$('#newtask-details-wrapper').data('batchCount')]));
            }

        }, 1000)
    );
    return dfd.promise();
}

function NewTask_SendBatch(recordIds, baseObjectName, baseObjectLabel)
{
    //prepare request data
    var requestData = {
        serializedRecordIds : JSON.stringify(recordIds),
        assignmentType      : $('[name="newtask-assignto-type"]:checked').val(),
        baseObjectName      : baseObjectName,
        subject             : $('#newtask-details-subject').val(),
        dueDate             : $('#newtask-details-duedate').val(),
        description         : $('#newtask-details-description').val()
    };

    //add assignment type data
    if (requestData.assignmentType == 'Static') {
        requestData.ownerId = $('#NewTaskPopup .searchDynamicInput ').attr('data-id');
    }
    else {
        $('#newtask-assignto-type-dynamic-table tr').each(function () {
            if ($(this).find('.label').text() == baseObjectLabel) {
                requestData.ownerField = $(this).find('.value select').val();
                return;
            }
        });
    }

    //send request to add tasks
    $.extend(requestData, {
        ajaxResource : 'TooltipAJAXResources',

    	action: 'add_tasks'
    });

    //preserving record count for error messages since recordIds is zero'd out for return
    var recordCount = recordIds.length;

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	requestData,
    	function(response, event){
            if (response.success)
            {
                //count the number of successful/failed responses
                var failures = 0;
                var successes = 0;
                $.each(response.results, function (index, result) {
                    if (result.success) {
                        successes++;
                    }
                    else {
                        failures++;
                    }
                });

                //decrement the batches we have out
                $('#newtask-details-wrapper').data('batchCount', $('#newtask-details-wrapper').data('batchCount') - 1);
                $('#newtask-details-wrapper').data('failureCount',$('#newtask-details-wrapper').data('failureCount') + failures);
                $('#newtask-details-wrapper').data('successCount',$('#newtask-details-wrapper').data('successCount') + successes);
            }
            else
            {
                //decrement the batches we have out
                $('#newtask-details-wrapper').data('batchCount', $('#newtask-details-wrapper').data('batchCount') - 1);
                $('#newtask-details-wrapper').data('failureCount',$('#newtask-details-wrapper').data('failureCount') + recordCount);
            }
        },{buffer:false,escape:false}
    );

    //increment the batches that we have out and restart the id list
    $('#newtask-details-wrapper').data('batchCount',$('#newtask-details-wrapper').data('batchCount') + 1);
    recordIds.length = 0;
}

function NewEvent(recordIdMap)
{
    MALayers.showModal('NewEventPopup');
    var $popup = $('#NewEventPopup');
    //store the record ids for later use
    $popup.data({
        recordIdMap: recordIdMap
    });

    $popup.find('.datepicker').datepicker({ dateFormat: formatUserLocaleDate({datepicker : true}) });

    //clear out any existing data
    $('#newevent-details-wrapper').addClass('hidden');
    $('#newevent-assignto-wrapper').removeClass('hidden');
    $popup.find('.taskSubject').removeClass('error');
    $popup.find('#newevent-details-startdate').removeClass('error');
    $popup.find('#newevent-details-enddate').removeClass('error');
    $('#newevent-filter-name').val('');
    $('#newevent-details-wrapper input, #newevent-details-wrapper textarea').val('');
    $('#newevent-assignto-type-static').click();

    $('#NewEventPopup').find('.step2').hide();
    $('#NewEventPopup').find('.step1').show();

    if (!MA.isMobile) {
        // initialize time inputs
        $('.ma-time-input').autocomplete({
            minLength: 0,
            autoFocus: true,
            source: timeoptions()
        }).focus(function(event) {
            $(event.target).autocomplete( "search", "" );
        });

        // default times
        $('#eventStartTime').val(moment().format(MA.getProperty(MASystem, 'User.timeFormat')));
        $('#eventEndTime').val(moment().add(1, 'hour').format(MA.getProperty(MASystem, 'User.timeFormat')));
    }

    // set default values
    var startMoment = moment();
    var endMoment = moment().add(1,'hours');
    $('#newevent-details-startdate').val(startMoment.format(MASystem.User.dateFormat.replace(/y/g, 'Y').replace(/d/g, 'D')));
    $('#newevent-details-starthour').val(startMoment.format('h'));
    $('#newevent-details-startminute').val(startMoment.format('mm'));
    $('#newevent-details-startperiod').val(startMoment.format('A'));
    $('#newevent-details-enddate').val(endMoment.format(MASystem.User.dateFormat.replace(/y/g, 'Y').replace(/d/g, 'D')));
    $('#newevent-details-endhour').val(endMoment.format('h'));
    $('#newevent-details-endminute').val(endMoment.format('mm'));
    $('#newevent-details-endperiod').val(endMoment.format('A'));

    //clear previous search history
    $popup.find('.search-table-view').empty().html('<li class="table-view-cell slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center">' + MASystem.Labels.MA_SearchAboveEllipsis + '</li>');
    $popup.find('.searchDynamicInput ').val('').removeAttr('data-id');
    //showLoading($('#newtask-select-grid-wrapper'), 'Loading Users...');

    //keep track of origin
    $popup.data('domOrigin',$popup.find('.searchDynamicInput'));
    //clear any previous
    $popup.find('.search-empty-state').removeClass('hidden');
    $popup.find('.search-results-wrapper').addClass('hidden');

    //remove any previous event listener
    $popup.off('keyup','.searchDynamicInput');
    $popup.on('keyup','.searchDynamicInput',function () {
        var $input = $(this);
        var searchTerm = $input.val();

        var $searchResults = $popup.find('.search-table-view').empty();
        if (searchTimeout !== null) {
            clearTimeout(searchTimeout);
        }

        if(searchTerm === '') {
            $popup.find('.search-empty-state').removeClass('hidden');
            $popup.find('.search-results-wrapper').addClass('hidden');
            return;
        }

        searchTimeout = setTimeout(function() {
            searchTimeout = null;
            var $favLoading = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading,timeOut:0,extendedTimeOut:0});

            searchUsers(searchTerm).then(function(res) {
                $popup.find('.search-empty-state').addClass('hidden');
                $popup.find('.search-results-wrapper').removeClass('hidden');
                MAToastMessages.hideMessage($favLoading);
                $favLoading = null;
                if(res.success) {
                    var resultHTML = '';
                    var userData = res.users || [];
                    var userDataLength = userData.length;
                    var resultHTML = '';
                    if(userDataLength === 0) {
                        //show no results
                        $searchResults.html('<li class="table-view-cell slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center">' + MASystem.Labels.MA_No_Results + '</li>');
                    }
                    else {
                        $.each(userData, function (index, data) {
                            resultHTML += '<li class="table-view-cell ownerSuccess slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center" data-id="'+htmlEncode(data.Id)+'">'+htmlEncode(data.Name)+'</li>';
                        });

                        $searchResults.html(resultHTML);

                        //attach click handler to rows
                        $searchResults.off('click','.ownerSuccess');
                        $searchResults.on('click','.ownerSuccess',function () {
                            var $row = $(this);
                            var dataId = $row.attr('data-id');
                            var rowVal = $row.text();

                            var $searchOriginLocation = $popup.data('domOrigin');

                            $searchOriginLocation.attr('data-id',dataId).val(rowVal);

                            //hide modal
                            MALayers.hideModal('dynamicSearchModal',false);

                            var selection = {
                                Name : rowVal,
                                Id : dataId
                            };
                            NewEvent_Step2();
                        });
                    }
                }
                else {
                    $searchResults.html('<li class="table-view-cell slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center">' + MASystem.Labels.MA_No_Results + '</li>');
                }
            });
        },500);
    });

    //send a request to get the available user lookup fields for these base objects
    var $baseObjTable = $('#newevent-assignto-type-dynamic-table').html('<thead class="ma-table-header"><tr><th>Base Object</th><th>Event Owner</th></tr></thead>');

    var processData = {
    	ajaxResource : 'TooltipAJAXResources',

    	action: 'get_lookup_fields',
    	baseObjects: JSON.stringify(Object.keys(recordIdMap)),
    	relatedObjects: JSON.stringify(['User'])
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(response, event){
            if (response.success)
            {
                $.each(response.lookupOptions, function (baseObject, options) {
                    var $row = $('<tr><td class="label" /><td class="value"><div class="ma-form-control has-inset-icon--right"><i class="ma-icon ma-icon-down inset-icon--right" style="font-size: 20px;top: 5px;"></i><select class="field ma-input" /></div></td></tr>').appendTo($baseObjTable);
                    $row.find('.label').text(recordIdMap[baseObject].baseObjectLabel);

                    var $fieldOptions = $row.find('.field');
                    $.each(options, function (index, option) {
                        $fieldOptions.append($('<option/>').attr('value', option.value).text(option.label));
                    });
                });
            }
    	},{buffer:false,escape:false}
    );
}

function timeoptions(step) {
    
    var result;
    step = step || 15; // default to 15 minute intervals

    if (moment) {
        result = [];

        var mom = moment().startOf('day');

        while (mom.isBefore(moment().endOf('day'))) {
            result.push({
                value: mom.format(MASystem.User.timeFormat),
                label: mom.format(MASystem.User.timeFormat)
            });

            mom = mom.add(step, 'minutes');
        }
    }

    return result;
}

function NewEvent_Step1()
{
    //go back to step 1
    $('#NewEventPopup').find('.step2').hide();
    $('#NewEventPopup').find('.step1').show();
    $('#newevent-assignto-wrapper').removeClass('hidden');
    $('#newevent-details-wrapper').addClass('hidden');
}

function NewEvent_Step2()
{
    if($('[name="newevent-assignto-type"]:checked').val() == 'Static') {
        if($('#NewEventPopup .searchDynamicInput ').attr('data-id') == undefined) {
            MAToastMessages.showError({message:'Please select a user before continuing.'});
            return;
        }
    }
    //go to step 2
    $('#NewEventPopup').find('.step2').show();
    $('#NewEventPopup').find('.step1').hide();
    $('#newevent-assignto-wrapper').addClass('hidden');
    $('#newevent-details-wrapper').removeClass('hidden');
}

function NewEvent_Finish()
{
    var dfd = jQuery.Deferred()
    //remove event listeners from popup
    var $popup = $('#NewEventPopup');
    $popup.off('keyup','.searchDynamicInput');
    $popup.off('click','.searchDynamicInput ');

    var $eventSubject = $popup.find('.taskSubject').removeClass('error');
    var $eventStart = $popup.find('#newevent-details-startdate').removeClass('error');
    var $eventEnd = $popup.find('#newevent-details-enddate').removeClass('error');
    var $eventStartTime = $popup.find('#eventStartTime').removeClass('error');
    var $eventEndTime = $popup.find('#eventEndTime').removeClass('error');

    var hasError = false;
    if($eventSubject.val() == '') {
        $eventSubject.addClass('error');
        hasError = true;
    }
    if($eventStart.val() == '') {
        $eventStart.addClass('error');
        hasError = true;
    }
    if($eventEnd.val() == '') {
        $eventEnd.addClass('error');
        hasError = true;
    }


    var startDateInput = $('#newevent-details-startdate').val();
    var endDateInput = $('#newevent-details-enddate').val();

    var startTimeInput, endTimeInput;

    if (MA.isMobile) {
        startTimeInput = $('#newevent-details-starthour').val() + ':' + $('#newevent-details-startminute').val() + ' ' + $('#newevent-details-startperiod').val();
        endTimeInput = $('#newevent-details-endhour').val() + ':' + $('#newevent-details-endminute').val() + ' ' + $('#newevent-details-endperiod').val();
    } else { // format times to a format that will be picked up in the logic below
        var timeInputRegex;
        var maSystemUserTimeFormat = MASystem.User.timeFormat;
        var momentFormatStart = moment($('#eventStartTime').val(), maSystemUserTimeFormat).format(maSystemUserTimeFormat);
        var momentFormatEnd = moment($('#eventEndTime').val(), maSystemUserTimeFormat).format(maSystemUserTimeFormat);
        var timeValidateRegex = {
            hmma: '^(1[0-2]|0?[1-9]):([0-5][0-9]) ([AaPp][Mm])$',
            hmm: '^([01]?[0-9]|2[0-3]):[0-5][0-9]',
            hmms: '^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]'
        }

        if(maSystemUserTimeFormat === 'h:mm a' || maSystemUserTimeFormat === 'hh:mm a') {
            startTimeInput = momentFormatStart
            endTimeInput = momentFormatEnd
            timeInputRegex = new RegExp(timeValidateRegex.hmma);
        }

        else if(maSystemUserTimeFormat === 'H:mm' || maSystemUserTimeFormat === 'HH:mm') {
            startTimeInput = momentFormatStart
            endTimeInput = momentFormatEnd
            timeInputRegex = new RegExp(timeValidateRegex.hmm);
        }
        
        else if(maSystemUserTimeFormat === 'H:mm:ss' || maSystemUserTimeFormat === 'HH:mm:ss') {
            startTimeInput = momentFormatStart
            endTimeInput = momentFormatEnd
            timeInputRegex = new RegExp(timeValidateRegex.hmms);
        }

        else {
            startTimeInput = momentFormatStart
            endTimeInput = momentFormatEnd
            timeInputRegex = new RegExp(timeValidateRegex.hmma);
        }

        if (!$('#eventStartTime').val().match(timeInputRegex)) {
            $eventStartTime.addClass('error');
            hasError = true;
        }
        if (!$('#eventEndTime').val().match(timeInputRegex)) {
            $eventEndTime.addClass('error');
            hasError = true;
        }
    }

    if(hasError) {
        return;
    }

    //validation (this kind of validation doesn't work with alt locales so I'm removing it for now)
    var startMoment = moment(startDateInput + ' ' + startTimeInput, MASystem.User.dateFormat.replace(/y/g, 'Y').replace(/d/g, 'D') + 'h:mm A');
    var endMoment = moment(endDateInput + ' ' + endTimeInput, MASystem.User.dateFormat.replace(/y/g, 'Y').replace(/d/g, 'D') + 'h:mm A');

    if (!(startMoment.isValid() && endMoment.isValid())) {
        showError($('#newevent-details-wrapper'), 'Invalid Dates');
        return;
    }

    //destroy date picker
    $popup.find('.datepicker').datepicker('destroy');

    MALayers.hideModal('NewEventPopup');

    //show loading
    $('#newevent-details-wrapper').data({ batchCount: 0, successCount: 0, failureCount: 0 });
    var $taskLoader = MAToastMessages.showLoading({message:MASystem.Labels.ActionFramework_New_Event,subMessage:'Adding Events...',timeOut:0,extendedTimeOut:0});

    //loop through records and send out batches
    $.each($('#NewEventPopup').data('recordIdMap'), function (baseObjectName, map)
    {
        var recordIds = [];
        $.each(map.recordIds, function (index, recordId) {
            recordIds.push(recordId);

            //send out this batch if it's ready
            if (recordIds.length > 200)
            {
                NewEvent_SendBatch(recordIds, baseObjectName, map.baseObjectLabel);
            }
        });

        //send the last batch if needed
        if (recordIds.length > 0) {
            NewEvent_SendBatch(recordIds, baseObjectName, map.baseObjectLabel);
        }
    });

    //done sending batches, update status message
    $taskLoader.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [$('#newevent-details-wrapper').data('batchCount')]));

    //set an interval to track when all the batches have returned
    $('#newevent-details-wrapper').data(
        'batchInterval',
        setInterval(function () {

            if ($('#newevent-details-wrapper').data('batchCount') == 0)
            {
                dfd.resolve();
                //clear this interval because we're done
                clearInterval($('#newevent-details-wrapper').data('batchInterval'));
                MAToastMessages.hideMessage($taskLoader);
                //show status message and then close the popup
                if ($('#newevent-details-wrapper').data('failureCount') == 0)
                {
                    MAToastMessages.showSuccess({message:MASystem.Labels.ActionFramework_New_Event,subMessage:$('#newevent-details-wrapper').data('successCount') + ' records added, 0 failures.'});
                }
                else
                {
                    MAToastMessages.showWarning({message:MASystem.Labels.ActionFramework_New_Event,subMessage:$('#newevent-details-wrapper').data('successCount') + ' records added, ' + $('#newevent-details-wrapper').data('failureCount') + ' failure(s).',timeOut:0,extendedTimeOut:0, closeButton:true});
                }
            }
            else
            {
                //status update
                $taskLoader.find('.toast-message').text(window.formatLabel(MASystem.Labels.Campaing_Adding_Batches, [$('#newevent-details-wrapper').data('batchCount')]));
            }

        }, 1000)
    );
    return dfd.promise();
}

function NewEvent_SendBatch(recordIds, baseObjectName, baseObjectLabel)
{
    var startDateInput = $('#newevent-details-startdate').val();
    var endDateInput = $('#newevent-details-enddate').val();

    var startTimeInput, endTimeInput;

    if (MA.isMobile) {
        startTimeInput = $('#newevent-details-starthour').val() + ':' + $('#newevent-details-startminute').val() + ' ' + $('#newevent-details-startperiod').val();
        endTimeInput = $('#newevent-details-endhour').val() + ':' + $('#newevent-details-endminute').val() + ' ' + $('#newevent-details-endperiod').val();
    } else { // format times to a format that will be picked up in the logic below
        startTimeInput = moment($('#eventStartTime').val(), MASystem.User.timeFormat).format('h:mm A');
        endTimeInput = moment($('#eventEndTime').val(), MASystem.User.timeFormat).format('h:mm A');
    }

    var startDate = moment(startDateInput + ' ' + startTimeInput, MASystem.User.dateFormat.replace('yyyy', 'YYYY').replace(/d/g, 'D') + ' h:mm A').format(formatUserLocaleDate({ moment: true }));
    var endDate = moment(endDateInput + ' ' + endTimeInput, MASystem.User.dateFormat.replace('yyyy', 'YYYY').replace(/d/g, 'D') + ' h:mm A').format(formatUserLocaleDate({ moment: true }));

    // prepare request data
    var requestData = {
        serializedRecordIds : JSON.stringify(recordIds),
        assignmentType      : $('[name="newevent-assignto-type"]:checked').val(),
        baseObjectName      : baseObjectName,
        subject             : $('#newevent-details-subject').val(),
        startDate           : startDate,
        endDate             : endDate,
        description         : $('#newevent-details-description').val()
    };

    //add assignment type data
    if (requestData.assignmentType == 'Static') {
        requestData.ownerId = $('#NewEventPopup .searchDynamicInput ').attr('data-id');
    }
    else {
        $('#newevent-assignto-type-dynamic-table tr').each(function () {
            if ($(this).find('.label').text() == baseObjectLabel) {
                requestData.ownerField = $(this).find('.value select').val();
                return;
            }
        });
    }

    //send request to add tasks
    $.extend(requestData,{
        ajaxResource : 'TooltipAJAXResources',

    	action: 'add_events',
    })
    
    //preserving record count for error messages since recordIds is zero'd out for return
    var recordCount = recordIds.length;

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	requestData,
    	function(response, event){
            if (response.success)
            {
                //count the number of successful/failed responses
                var failures = 0;
                var successes = 0;
                $.each(response.results, function (index, result) {
                    if (result.success) {
                        successes++;
                    }
                    else {
                        failures++;
                    }
                });

                //decrement the batches we have out
                $('#newevent-details-wrapper').data('batchCount', $('#newevent-details-wrapper').data('batchCount') - 1);
                $('#newevent-details-wrapper').data('failureCount',$('#newevent-details-wrapper').data('failureCount') + failures);
                $('#newevent-details-wrapper').data('successCount',$('#newevent-details-wrapper').data('successCount') + successes);
            }
            else
            {
                //decrement the batches we have out
                $('#newevent-details-wrapper').data('batchCount', $('#newevent-details-wrapper').data('batchCount') - 1);
                $('#newevent-details-wrapper').data('failureCount',$('#newevent-details-wrapper').data('failureCount') + recordCount);
            }
    	},{buffer:false,escape:false}
    );

    //increment the batches that we have out and restart the id list
    $('#newevent-details-wrapper').data('batchCount',$('#newevent-details-wrapper').data('batchCount') + 1);
    recordIds.length = 0;
}

function setMobileState() {

    var dfd = $.Deferred();
    var saveStateEnabled = getProperty(MASystem,'User.recallMobileSaveState',false) || userSettings.recallMobileSaveState || false;
    var $loadingMsg = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,timeOut:0,extendedTimeOut:0});
    if(MA.isMobile && saveStateEnabled) {
        var plottedLayers = [];
        var layers;
        var scheduleData;
        try{
            VueEventBus.$bus.$emit('get-plotted-layers', function (layers) {
                layers.forEach(function(layer){
                    if(layer.id && layer.type == 'marker') plottedLayers.push(layer.id);
                });
            });

            layers = JSON.stringify(plottedLayers);
            // get route from vue
            var routeId = '';
            VueEventBus.$bus.$emit('get-plotted-route', function (route) {
                if (route.Id && route.onMap) {
                    routeId = route.Id;
                } else {
                    routeId = '';
                }
            });
            //var routeId = $('#routename').attr('data-id') || '';

            VueEventBus.$bus.$emit('get-schedule-data', function (schedule) {
                if(schedule) {
                    scheduleData = {
                        dateString: schedule.dateString,
                        schedulePlotted: schedule.schedulePlotted
                    }
                } else {
                    scheduleData = {
                        dateString: '',
                        schedulePlotted: false
                    }
                }
            });

            var zoom = MA.map.zoom;
            var centerLat = MA.map.getCenter().lat();
            var centerLng = MA.map.getCenter().lng();

            var processData = {
                ajaxResource : 'UserAJAXResources',
                action: 'store_mobile_state',
                id: MASystem.User.Id,
                plottedLayers : layers,
                plottedRoute : routeId,
                schedule: scheduleData.dateString || null,
                schedulePlotted: scheduleData.schedulePlotted || false,
                zoomLevel : zoom,
                lat : centerLat,
                lng : centerLng
            };
            
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                processData,
                function(json, event){
                    MAToastMessages.hideMessage($loadingMsg);
                    if(event.status) {
                        if(json.success)
                        {
                            dfd.resolve();
                        } else {
                            MA.isUserLoggedIn(json, event, true); 
                            dfd.reject();
                        }
                    } else {
                        MA.isUserLoggedIn(json, event, true); 
                        dfd.reject();
                    }
                },{escape:false}
            );
        } catch(err){
            MA.log(err);
            MA.log('Unable to parse saved mobile layers. JSON='+plottedLayers);
            MAToastMessages.hideMessage($loadingMsg);
            dfd.reject();
        }
    }
    else {
        setTimeout(function() {
            MAToastMessages.hideMessage($loadingMsg);
            dfd.resolve();
        }, 500);
    }
    return dfd.promise();
}

function validateLocale(locale) {
    // SF has a few locales that do not work with standard JS functions
    // this function will attempt to parse out unsupported locales
    var tempLocaleToCheck = locale.replace(/_/g,'-');
    try {
        var randomNumber = Math.random();
        // check if toLocaleString supports this locale
        randomNumber.toLocaleString(tempLocaleToCheck);
        // locale supported, return passed in value
        return locale;
    } catch (e) {
        // unsupported, try to find match
        console.warn('Unsupported locale', locale);
        try {
            var localeParts = tempLocaleToCheck.split('-');
            // only grab the first 2 parts of the locale (fixes some german locales => de_DE_Euro)
            var slicedParts = localeParts.slice(0,2);
            var newLocale = slicedParts.join('_');
            tempLocaleToCheck = newLocale.replace(/_/g,'-');
            // check if toLocaleString supports this locale
            randomNumber.toLocaleString(tempLocaleToCheck);
            // passed, so update the user locale.
            console.info('Found supported locale', newLocale);
            return newLocale;
        } catch (e) {
            console.warn('Unable to find locale match, defaulting to en_US');
            return 'en_US';
        }
    }
}

function validateTimeSetting() {
    if (!validateTimeValues()) {
        $('.timedefaults-routestart').closest('.slds-form-element').addClass('slds-has-error');
        $('.timedefaults-routeend').closest('.slds-form-element').addClass('slds-has-error');
    } else {
        $('.timedefaults-routestart').closest('.slds-form-element').removeClass('slds-has-error');
        $('.timedefaults-routeend').closest('.slds-form-element').removeClass('slds-has-error');
    }
}

function validateTravelTime() {
    var hours = Number($('#travelTimeHours').val());
    var minutes = Number($('#travelTimeMinutes').val());

    if ((minutes / 60) + hours > 5.5) {
        MAToastMessages.showError({ message: MASystem.Labels.MA_Reduce_Travel_Time });
        return false;
    }
    return true;
}

function validateTimeValues() {
    var startTimeString = $('.timedefaults-routestart').val();
    var endTimeString = $('.timedefaults-routeend').val();

    var momentStart = window.moment(startTimeString, 'h:mm a');
    var momentEnd = window.moment(endTimeString, 'h:mm a');

    if (momentStart.isAfter(momentEnd) || momentEnd.isBefore(momentStart)) {
        return false;
    }
    return true;
}

function validateRadiusSetting(){
    if(!validateRadius($('#ProximityRadius').val())){
        $('#ProximityRadius').closest('.slds-form-element').addClass('slds-has-error');
        $('.radiusError.slds-form-element__help').show();
    }else {
        $('#ProximityRadius').closest('.slds-form-element').removeClass('slds-has-error');
        $('.radiusError.slds-form-element__help').hide();
    }
}


function validateRadiusBoundary(elem){
    if(!validateRadius($(elem).val())){
        $(elem).closest('.slds-form-element').addClass('slds-has-error');
        $(elem).closest('.slds-form-element').find('.borderRadiusError.slds-form-element__help').show();
    }else {
        $(elem).closest('.slds-form-element').closest('.slds-form-element').removeClass('slds-has-error');
        $(elem).closest('.slds-form-element').find('.borderRadiusError.slds-form-element__help').hide();
    }
}

function validateRadius(proxValue)
{
    if(isNaN(proxValue))
    {
        return false;
    } else {
        var proxUnit = MA.Util.parseNumberString(proxValue);
        if(Number(proxUnit < 0))
        {
            return false;
        }
    }      
    return true;
}

function toggleShapeLayers (toggle) {
    var $select = $(toggle);
    var $proxLayer = $select.closest('.proximity.layer');
    var toggleVal = $select.val() || '';

    $proxLayer.find('.js-rowToggle').addClass('hidden');

    //show appropriate options
    $proxLayer.find('.js-rowToggle[data-id="'+toggleVal+'"]').removeClass('hidden');

    if(toggleVal != 'KML') {
        $proxLayer.find('.js-saveKML').addClass('hidden');
        $proxLayer.find('.js-toggleKML').removeClass('hidden');
    }
    if ($proxLayer.find('.link.showoptions').text() == MASystem.Labels.MA_Show_Options) {
        $proxLayer.find('.link.showoptions').click();
    }

    //handle defaults and color options
    switch (toggleVal)
    {
    	case 'Circle':
    	    try {
        		$proxLayer.find('.color-wrapper .fillcolor')[0].color.fromString('3083d3');
        		$proxLayer.find('.color-wrapper .bordercolor')[0].color.fromString('16325C');
    	    }
    	    catch (e) {}
            var defailtCircleU = getProperty(userSettings, 'defaultProximitySettings.circleRadiusUnits') || 'MILES';
            $proxLayer.find('.js-radiusUnit').val(defailtCircleU);
            $proxLayer.find('.js-rowToggle[data-id="travelDistance::Circle"]').removeClass('hidden');
    		break;
    	case 'Isoline':
    	    try {
        		$proxLayer.find('.color-wrapper .fillcolor')[0].color.fromString('CCCC22');
        		$proxLayer.find('.color-wrapper .bordercolor')[0].color.fromString('000000');
    	    }
    	    catch (e) {}
    		break;
    	case 'Polygon':
    	    try {
        		$proxLayer.find('.color-wrapper .fillcolor')[0].color.fromString('22CC22');
        		$proxLayer.find('.color-wrapper .bordercolor')[0].color.fromString('000000');
    	    }
    	    catch (e) {}
    		break;
    	case 'KML':
    	    $proxLayer.find('.js-saveKML').removeClass('hidden');
            $proxLayer.find('.js-toggleKML').addClass('hidden');
    		break;
    	case 'travelTime':
    	    var defaultTimeHours = getProperty(userSettings, 'defaultProximitySettings.travelTimeRadiusHours') || '';
            var defaultTimeMinutes = getProperty(userSettings, 'defaultProximitySettings.travelTimeRadiusMinutes') || '';
            var todayDate = new Date();
            var dayOfWeek = todayDate.getDay();
            if(dayOfWeek==0){
                $proxLayer.find('#radius-traffic-sunday').addClass('active');
            }else if(dayOfWeek==1){
                $proxLayer.find('#radius-traffic-monday').addClass('active');
            }else if(dayOfWeek==2){
                $proxLayer.find('#radius-traffic-tuesday').addClass('active');
            }else if(dayOfWeek==3){
                $proxLayer.find('#radius-traffic-wednesday').addClass('active');
            }else if(dayOfWeek==4){
                $proxLayer.find('#radius-traffic-thursday').addClass('active');
            }else if(dayOfWeek==5){
                $proxLayer.find('#radius-traffic-friday').addClass('active');
            }else if(dayOfWeek==6){
                $proxLayer.find('#radius-traffic-saturday').addClass('active');
            }
            $proxLayer.find('.radius-hours').val(defaultTimeHours);
            $proxLayer.find('.radius-minutes').val(defaultTimeMinutes);
    	    break;
    	case 'travelDistance':
            var defaultDistanceU = getProperty(userSettings, 'defaultProximitySettings.travelDistanceRadiusUnits') || 'MILES';
            $proxLayer.find('.js-radiusUnit').val(defaultDistanceU);
            $proxLayer.find('.js-rowToggle[data-id="travelDistance::Circle"]').removeClass('hidden');
    	    break;
    	default:
    	    try {
        		$proxLayer.find('.color-wrapper .fillcolor')[0].color.fromString('22CC22');
        		$proxLayer.find('.color-wrapper .bordercolor')[0].color.fromString('000000');
    	    }
    	    catch (e) {}
    		break;
    }
}

/****************************************
 *
 * number formatting regex functions
 *
****************************************/
function testDecimals(currentVal) {
    var count;
    currentVal.match(/\./g) === null ? count = 0 : count = currentVal.match(/\./g);
    return count;
}

//
function replaceCommas(yourNumber) {
    var isNegative = yourNumber.charAt(0) === '-';
    var components = yourNumber.toString().split(".");
    if (components.length === 1)
        components[0] = yourNumber;
    components[0] = components[0].replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (components.length === 2)
        components[1] = components[1].replace(/\D/g, "");
    return (isNegative ? '-' : '') + components.join(".");
}


function MADevice(deviceObj)
{
    // copy all properties of the deviceObj parameter to the 'this' object
    if(deviceObj && typeof deviceObj == 'object')
    {
        (function extend(thisDevice, deviceObj) {
            Object.keys(deviceObj).forEach(function(key) { thisDevice[key] = deviceObj[key]; });
        })(this, deviceObj);
    }

    // this is populated when the address is reverse geocoded using the updateAddress function
    this.reverse = {
        formattedAddress: null,
        addressObject: null,
    };

    // creates a map of event codes to event name
    if(!this.eventsMap && typeof this.eventsMap != 'object') {
        MADevice.prototype.eventsMap =  {
            POWUP: 'Power On',
            ALIVE: 'Alive',
            IGON: 'Ignition On',
            IGOFF: 'Ignition Off',
            START: 'Moving',
            STOP: 'Stopped',
            PRIOD: 'Location Update',
            SPEED: 'Begin Speeding',
            NOSPD: 'End Speeding',
            GPSY: 'GPS Acquired',
            GPSN: 'GPS Lost',
            CGAIN: 'Comm Up',
            CLOSS: 'Comm Down',
            INxHI: 'High Transition',
            INxLO: 'Low Transition',
            ACCEL: 'Quick Acceleration',
            DECEL: 'Hard Braking',
            ZONE_ENTRY: 'Geo-Zone Entry',
            ZONE_EXIT: 'Geo-Zone Exit',
            JBUS_PTO_ON: 'PTO On',
            JBUS_PTO_OFF: 'PTO Off',
            BPWUP: 'Battery Power On',
            BMOTN: 'Motion with Ignition Off',
            APWUP: 'Power On',
            APOSN: 'Location Update',
            AMOTN: 'Motion',
            ABATLO: 'Battery Low',
            ABATOK: 'Battery OK',
            // PND_DISCONNECT: 'PND Disconnect',
            position_update: 'Location Update',
            application_opened:                     'Application Opened',
            application_in_background:              'Application in Background',
            manual_tracking_toggled_to_true:        'Live Location Turned On', // 'Availability Turned On',
            manual_tracking_toggled_to_false:       'Live Location Turned Off', // 'Availability Turned Off',
            automatic_tracking_toggled_to_false:    'Live Location Turned Off', // 'Availability Turned Off',
            green_button_press: 'Green Button Push',
            yellow_button_press: 'Yellow Button Push',
            red_button_press: 'Red Button Push',
            blue_button_press: 'Blue Button Push',

            BPSON:  'Location Update',
            OBD_BOARD_ENABLE: 'Device Now Reading Engine Data',
            OBD_BOARD_DISABLE:  'Device Not Reading Engine Data',
            HARD_CORNERING_RIGHT:   'Hard Right Turn',
            HARD_CORNERING_LEFT:    'Hard Left Turn',
            TOWING_STOP:    'Towing Stopped',
            TOWING_START:   'Towing',
            COLLISION:  'Collision',
            DKFOB:  'Key Fob Engaged'
         };
    }

    // successful() - Boolean. True if device information was retreived successfully from database
    if(typeof this.successful != 'function') {
        MADevice.prototype.successful = function() {
            // validate lat lng
            var isSuccess = Boolean(this.success) === true ? true:false;
            var position = this.position;
            if (position) {
                // validate lat
                var latitude = position.lat;
                var isLatitudeInvalid = latitude < -90 || latitude > 90;
                // validate lng
                var longitude = position.lng;
                var isLongitudeInvalid = longitude < -180 || longitude > 180;
                if (isLatitudeInvalid || isLongitudeInvalid) {
                    isSuccess = false;
                }
            } else {
                isSuccess = false;
            }
            return isSuccess;
        };
    }

    // getId() - returns the deviceId (Number or String) or a null if not available.
    // concatenates the device vendor (if any) to the device ESN
    // return null if a deice id could not be built from the device esn and vendor
    if(typeof this.getId != 'function') {
        MADevice.prototype.getId = function() {
            var deviceId = null;

            var esn = this.getESN();
            var vendor = this.getVendor();

            if(esn) {
                deviceId = esn;

                if(typeof vendor == 'string') {
                    deviceId = vendor.trim().replace(/(\s|\n)/ig, '').toLowerCase() + '-' + deviceId; // append vendor to esn if vendor exists
                }
            }

            return deviceId;
        };
    }

    // getESN() - returns only the ESN part without the prefix or postfix
    // return null if esn cannot be extracted
    if(typeof this.getESN != 'function') {
        MADevice.prototype.getESN = function() {
            var esn = null;

            var vendor = this.getVendor();
            var deviceIdFromAPI = this.deviceId;

            if( typeof deviceIdFromAPI == 'string' ) {
                var regexString = '(' + vendor + '-)(.*)'; // prepare match pattern: vendor-XXXX
                var regex = new RegExp(regexString, 'i'); // create regex object using pattern, ignore case
                var deviceIdComponents = deviceIdFromAPI.match(regex); // check for match

                if(Array.isArray(deviceIdComponents)) { // if vendor pattern matched
                    esn =  deviceIdComponents[2] || null;
                } else { // vendor pattern was not matched, default the esn to the whole deviceId property from the API. This makes it work until we make vendor field a must have
                    esn = deviceIdFromAPI.trim();
                }


                esn = typeof esn == 'string' ? esn.trim().replace(/-location$/g, '').trim() : null; // remove any '-location' which is at the very end of the esn string

                if(typeof esn == 'string' && esn.trim() == '') { // if esn is still a string but empty, make null
                    esn = null;
                }
            }

            return esn;
        };
    }

    if(typeof this.getVendor != 'function') {
        MADevice.prototype.getVendor = function() {
            var vendor = this.vendor || null;

            if(typeof vendor == 'string') {
                vendor = this.vendor.trim();
            } else {
                vendor = null;
            }


            return vendor;
        };
    }

    // getPosition() - returns {lat:Number, lng:Number, isValid():Boolean}
    if(typeof this.getPosition != 'function') {
        MADevice.prototype.getPosition = function() {
            var devicePosition = null;

            try
            {
                var deviceLat = MA.getProperty(this, ['position','lat']);
                var deviceLng = MA.getProperty(this, ['position','lng']);

                if( isNum(deviceLat) && isNum(deviceLng) ) { // if lat/lng valid numbers
                        if (deviceLat <= MA.MAX_LATITUDE && deviceLat >= MA.MIN_LATITUDE || deviceLng <= MA.MAX_LONGITUDE && deviceLng >= MA.MIN_LONGITUDE) {
                            devicePosition = {
                                lat: Number(deviceLat),
                                lng: Number(deviceLng)
                            };
                        }
                }
            } catch(e) { console.warn(e); }
            return devicePosition;
        };
    }


    if(typeof this.setPosition != 'function') {
        MADevice.prototype.setPosition = function(lat, lng) {
            var devicePosition = null;

            if( isNum(lat) && isNum(lng) ) { // if lat/lng valid numbers
                    devicePosition = {
                        lat: lat,
                        lng: lng,
                    };
            }

            return devicePosition;
        };
    }


    /*
     * @name: getEvent
     * @return: event object {code:string,name:string} or null if event not found
     * @return: if code is found but the corresponding event name is not found in the eventsMap, event.name defaults to 'UNKNOWN'
    */
    if(typeof this.getEvent != 'function') {
        MADevice.prototype.getEvent = function() {
            var result = null;

            var eventLabel = MA.getProperty(this, 'eventLabel'); // event label
            var eventCode = MA.getProperty(this, 'eventType') || MA.getProperty(this, 'deviceMessage.eventType'); // event code

            if (typeof eventLabel === 'string' && eventLabel.trim()) { // event code -> name translation was handled in the back end
                result = {
                    code: eventCode,
                    name: eventLabel
                };
            } else if(typeof eventCode === 'string' && eventCode.trim()) { // handle event code -> name translation
                result = {
                    code: eventCode,
                    name: this.eventsMap[eventCode] || null,
                };
            }

            return result;
        };
    }


    /**
     * @name: getType
     * @return: string or null if type not found/known
     * @info: returns type of device. So far it's either CalAmp or Availability
     * */
    if(typeof this.getType != 'function')
    {
        MADevice.prototype.getType = function()
        {
            var deviceType = getProperty(this, 'messageType', false);

            if(typeof deviceType != 'string') {
                deviceType = null;
            } else {
                deviceType = deviceType.trim();
            }

            return deviceType;
        };
    }

    // getSpeed() - returns a speed Number value or null if not found
    // returns speed as miles per hour as default from the live api
    if(typeof this.getSpeed != 'function') {
        MADevice.prototype.getSpeed = function() {
            var speed = NaN;

            if( isNum(getProperty(this, 'metadata.speed', false)) ) {
                speed = getProperty(this, 'metadata.speed', false);
            } else if( isNum(getProperty(this, 'deviceMessage.position.speed', false)) ) {
                speed = getProperty(this, 'deviceMessage.position.speed', false);
            } else if( isNum(getProperty(this, 'deviceMessage.gps.gps.speed', false)) ) {
                speed = getProperty(this, 'deviceMessage.gps.gps.speed', false);
            }

            if(isNum(speed))
            {
                // default negative speed values to zero
                if(speed < 0)
                {
                    speed = 0;
                }

                speed = Number(speed); // turn to number if it was a string
            }

            return speed;
        };
    }


    // getFormattedSpeed() - returns a speed Number value or null if not found
    // returns speed in the user setting distance units per hour, and trimmed to 2 decimal places
    if(typeof this.getFormattedSpeed != 'function') {
        MADevice.prototype.getFormattedSpeed = function() {
            var formattedSpeed = null;
            var speedInMilesPerHour = this.getSpeed();

            if(isNum(speedInMilesPerHour))
            {
                // convert from miles/h to user setting units
                var userSettingsUnits = String(getProperty(userSettings||{}, 'RouteDefaults.unit', false) || 'mi').toUpperCase();
                var convertedSpeed = speedInMilesPerHour * unitFactors['KM'][userSettingsUnits];

                if(isNum(convertedSpeed))
                {
                    formattedSpeed = Number(convertedSpeed).toFixed(2);
                }
            }

            return formattedSpeed;
        };
    }

    // getSpeedLimit() - returns a speed Limit object with value and unit properties
    // returns - { value: Number, unit: String } or null if no info
    if(typeof this.getSpeedLimit != 'function') {
        MADevice.prototype.getSpeedLimit = function() {
            var speedLimitResult = null;
            var speedLimitObject = MA.getProperty(this, ['metadata', 'speedLimit']);

            if(speedLimitObject && typeof speedLimitObject == 'object') {
                var speedLimitValue = speedLimitObject.value;
                var speedLimitUnit = speedLimitObject.unit;

                if(speedLimitValue && speedLimitUnit && isNum(speedLimitValue) && typeof speedLimitUnit == 'string' && speedLimitUnit.trim() != '' ) {
                    speedLimitResult = {};
                    speedLimitResult.value = Number(speedLimitValue);
                    speedLimitResult.unit = speedLimitUnit.trim();
                }
            }

            return speedLimitResult;
        };
    }

    // getHeading() - returns the heading value (Number or direction string)
    if(typeof this.getHeading != 'function') {
        MADevice.prototype.getHeading = function() {
            var result = null;
            var heading = MA.getProperty(this, ['metadata','heading']) || MA.getProperty(this, ['position','heading']);

            if(typeof heading == 'string' && heading.trim() != '')
            {
                result = heading.trim();
            }
            else if(typeof heading == 'number')
            {
                result = heading;
            }

            return result;
        };
    }

    // getDirection() - returns direction compass direction e.g. N,E,S,W,NE
    if(typeof this.getDirection != 'function') {
        MADevice.prototype.getDirection = function() {
            var heading = this.getHeading();
            var direction = null;

            if(isNum(heading))
            {
                if(heading > 11.25 && heading <= 78.75)
                {
                   direction = "NE";
                }
                else if(heading > 78.75 && heading <= 123.75)
                {
                   direction = "E";
                }
                else if(heading > 123.75 && heading <= 168.75)
                {
                   direction = "SE";
                }
                else if(heading > 168.75 && heading <= 213.75)
                {
                   direction = "S";
                }
                else if(heading > 213.75 && heading <= 258.75)
                {
                   direction = "SW";
                }
                else if(heading > 258.75 && heading <= 303.75)
                {
                   direction = "W";
                }
                else if(heading > 303.75 && heading <= 348.75)
                {
                   direction = "NW";
                }
                else if(heading > 348.75 || (heading >= 0 && heading <= 11.25))
                {
                   direction = "N";
                }
            }
            else if(typeof heading == 'string' && heading.trim() != '')
            {
                direction = heading;
            }

            return direction;
        };
    }

    // getOdometerReading() - returns odometer reading number in miles or NaN if not found
    if(typeof this.getOdometer != 'function') {
        MADevice.prototype.getOdometer = function() {
            var odometer = null;

            if( isNum( MA.getProperty(this, ['metadata', 'odometer'])) ) {
                odometer = MA.getProperty(this, ['metadata', 'odometer']);
            }

            return odometer;
        };
    }

    // getBatteryLife() - returns battery life
    if(typeof this.getBatteryLevel != 'function') {
        MADevice.prototype.getBatteryLevel = function() {
            var batteryLife = NaN;

            if( isNum( MA.getProperty(this, ['metadata', 'batteryLevel'])) ) {
                batteryLife = MA.getProperty(this, ['metadata', 'batteryLevel']);
            }

            return batteryLife;
        };
    }

    // getFormattedOdometer() - returns a formatted odometer value if device has one (or NaN), but converted to
    // units as found in user settings and rounded to 2 decimal places
    if(typeof this.getFormattedOdometer != 'function') {
        MADevice.prototype.getFormattedOdometer = function() {
            var formattedOdometer = NaN;
            var odometer = this.getOdometer(); // miles

            if(isNum(odometer))
            {
                var userSettingsUnits = String(getProperty(userSettings||{}, 'RouteDefaults.unit', false)).toUpperCase();
                var convertedOdometer = odometer * unitFactors['MILES'][userSettingsUnits];
                formattedOdometer = Number(convertedOdometer).toFixed(2);
            }

            return formattedOdometer;
        };
    }

    // getBatteryLevel() - returns battery life
    if(typeof this.getBatteryLevel != 'function') {
        MADevice.prototype.getBatteryLevel = function() {
            var batteryLife = NaN;

            if( isNum( MA.getProperty(this, ['metadata', 'batteryLevel'])) ) {
                batteryLife = MA.getProperty(this, ['metadata', 'batteryLevel']);
            }

            return batteryLife;
        };
    }

    // getPositionMethod() -  returns the position method as string. Can be 'manual' or 'auto'
    if(typeof this.getPositionMethod != 'function') {
        MADevice.prototype.getPositionMethod = function() {
            var positionMethod = getProperty(this, 'metadata.positionMethod') || getProperty(this, 'deviceMessage.positionMethod');

            if( !positionMethod || typeof positionMethod != 'string' || isNum(positionMethod) ) { positionMethod = null; }

            return positionMethod;
        };
    }

    // getGeocodeType() - returns 'Reverse' or 'Manual'
    if(typeof this.getGeocodeType != 'function') {
        MADevice.prototype.getGeocodeType = function() {
            var positionMethod = this.getPositionMethod();
            var geocodeType = null;

            if(positionMethod)
            {
                if( positionMethod.trim().match(/auto/i) ) {
                    geocodeType='Reverse';
                } else if( positionMethod.trim().match(/manual/i) ) {
                    geocodeType = 'Manual';
                }
            }

            return geocodeType;
        };
    }

    // getAddressObject() - returns an object with address properties {city:string, street:string, state:string...}
    if(typeof this.getAddressObject != 'function') {
        MADevice.prototype.getAddressObject = function() {
            var addressObject = null;

            // get all possible device objects from device. stop once you run into one.
            if( getProperty(this, 'reverse.addressObject', false) && typeof getProperty(this, 'reverse.addressObject', false) == 'object' ) {
                addressObject = getProperty(this, 'reverse.addressObject', false);
            } else if( getProperty(this, 'position.address', false) && typeof getProperty(this, 'position.address', false) == 'object' ) {
                addressObject = getProperty(this, 'position.address', false);
            } else if( getProperty(this, 'deviceMessage.gps.gps.address', false) && typeof getProperty(this, 'deviceMessage.gps.gps.address', false) == 'object' ) {
                addressObject = getProperty(this, 'deviceMessage.gps.gps.address', false);
            } else if( getProperty(this, 'deviceMessage.position', false) && typeof getProperty(this, 'deviceMessage.position', false) == 'object' ) {
                addressObject = getProperty(this, 'deviceMessage.position', false);
            }

            addressObject = this.normalizeAddressObject(addressObject);

            // further checks to verify if object is actual address object and also normalize with correct properties if so
            if(addressObject && typeof addressObject == 'object')
            {
                // check if the address object contains any address components as properties
                var addressComponents = ['street', 'city', 'state', 'country', 'zip', 'zipCode', 'postalCode'];

                var valid = addressComponents.reduce(function(acc, val) {
                    return acc || addressObject.hasOwnProperty(val);
                });

                if(valid)
                {
                    addressObject.zipCode = addressObject.zip = (addressObject.postalCode || addressObject.postal); // normalize by adding zip properties
                }
                else
                {
                    addressObject = null; // invalid address object
                }
            }

            return addressObject;
        };
    }

    // getFormattedAddress() - returns formatted address as string or a null
    if(typeof this.getFormattedAddress != 'function') {
        MADevice.prototype.getFormattedAddress = function() {
            var stringAddress = null;

            // extract address from all possible fullAddress properties
            if( typeof getProperty(this, 'reverse.formattedAddress', false) == 'string' ) {
                stringAddress = getProperty(this, 'reverse.formattedAddress', false);
            } else if( typeof getProperty(this, 'deviceMessage.position.fullAddress', false) == 'string' ) {
                stringAddress = getProperty(this, 'deviceMessage.position.fullAddress', false).trim();
            } else if( typeof getProperty(this, 'position.fullAddress', false) == 'string' ) {
                stringAddress = getProperty(this, 'position.fullAddress', false).trim();
            }

            // if empty string make null
            if(typeof stringAddress == 'string' && stringAddress == '') { stringAddress = null; }

            // if no address yet try to find it in the address object if it exists and build address string
            if(stringAddress == null) {
                var addressObject = this.normalizeAddressObject(this.getAddressObject());

                if(addressObject && typeof addressObject == 'object') {
                    var street  = addressObject.street      ?   addressObject.street+', '       : '';
                    var city    = addressObject.city        ?   addressObject.city+', '         : '';
                    var state   = addressObject.state       ?   addressObject.state+' '         : '';
                    var zip     = addressObject.zip         ?   addressObject.zip+' '           : '';
                    var country = addressObject.country     ?   addressObject.country           : '';

                    stringAddress = (street || '') + (city || '') + (state || '') + (zip || '') + (country || '');
                }
            }

            // if empty string make null
            if(typeof stringAddress == 'string' && stringAddress == '') { stringAddress = null; }

            return stringAddress;
        };
    }

    /**
     * Normalizes the address object with recognizable properties across Maps
     * properties: street, city, state, country, zip, zipCode, postalCode
     * returns: Object with the properties above
     * @info all properties may not be available but at least one should be
     */
    if(typeof this.normalizeAddressObject != 'function') {
        MADevice.prototype.normalizeAddressObject = function(addressObject) {
            if(addressObject && typeof addressObject == 'object') {
                addressObject.city = addressObject.city || addressObject.City;
                addressObject.country = addressObject.country || addressObject.Country;
                addressObject.state = addressObject.state || addressObject.State;
                addressObject.street = addressObject.CompleteStreetAddress || addressObject.street || addressObject.Street;
                addressObject.zip = addressObject.zip || addressObject.postalCode || addressObject.zipCode || addressObject.PostalCode;
                addressObject.zipCode = addressObject.postalCode = addressObject.zip;

                return addressObject;
            }
        };
    }

    // getFuelEconomy() - returns fuel economy Number value or null if not found
    if(typeof this.getFuelEconomy != 'function') {
        MADevice.prototype.getFuelEconomy = function() {
            var fuelEconomy = NaN;

            if( isNum(getProperty(this, 'fuelEconomy')) ) {
                fuelEconomy = getProperty(this, 'fuelEconomy');
                fuelEconomy = Number(fuelEconomy);
            }

            return fuelEconomy;
        };
    }

    // getFuelEconomy() - returns fuel economy numeric value converted to units specified in user settings or NaN if not found
    if(typeof this.getFormattedFuelEconomy != 'function') {
        MADevice.prototype.getFormattedFuelEconomy = function() {
            var formattedFuelEconomy = NaN;
            var fuelEconomy = this.getFuelEconomy(); // miles

            if( isNum(fuelEconomy) ) {
                // convert miles to user setting units
                var userSettingsUnits = String(getProperty(userSettings||{}, 'RouteDefaults.unit', false)).toUpperCase();
                var convertedFuelEconomy = fuelEconomy * unitFactors['MILES'][userSettingsUnits];

                if(isNum(convertedFuelEconomy))
                {
                    formattedFuelEconomy = Number(convertedFuelEconomy).toFixed(2);
                }
            }

            return formattedFuelEconomy;
        };
    }

    /*
     * @arguments: callback(Function)
     * @return: a success object {success:Boolean}
     * @effects: reverse geocodes the device location and updates the device address
     * @info: new address can now be accessed by device.getFormattedAddress() or device.getAddressObject()
     *
    */
    if(typeof this.updateAddress != 'function') {
        MADevice.prototype.updateAddress = function(callback) {
            var position = this.getPosition();
            var coordinates = new google.maps.LatLng(position.lat, position.lng);
            var options = {
                latLng : coordinates,
            };

            var thisDevice = this;

            MA.Geocoding.reverseGeocode(options, function(res) {
                if(res.success) {
                    var result = res.result;

                    if(result && typeof result == 'object') {
                        // set the formatted address
                        thisDevice.reverse.formattedAddress = result.FormattedAddress;

                        result.city = result.City;
                        result.country = result.Country;
                        result.state = result.State;
                        result.street = result.Street;
                        result.zip = result.zipCode || result.PostalCode;

                        // build the address object from the result
                        thisDevice.reverse.addressObject = result;
                    }

                    callback({success:true});
                } else {
                    callback({success:false});
                }
            });
        };
    }

    // getTimestamp() - returns numerical timestamp value or null if not found
    if(typeof this.getTimestamp != 'function') {
        MADevice.prototype.getTimestamp = function() {
            var timestamp = null;

            if( isNum(getProperty(this, 'timestamp', false)) ) {
                timestamp = getProperty(this, 'timestamp', false);
            }

            return parseFloat(timestamp);
        };
    }

    // getTimezone of device when it reported the current message
    // returns timezone object ex. {id:'America/New_York', offset:-4500, abbreviation:'EST' ...} or null if no info
    if(typeof this.getTimezone != 'function') {
        MADevice.prototype.getTimezone = function() {
            var timezoneResult = null;

            var timezoneObject = MA.getProperty(this, ['metadata', 'timezone']);

            if(timezoneObject && typeof timezoneObject == 'object') {
                var timezoneId = timezoneObject.id;

                if(typeof timezoneId == 'string' && moment.tz.zone(timezoneId.trim())) {
                    timezoneResult = {};
                    timezoneResult.id = timezoneId.trim();

                    try {
                        var timezoneAbbreviation = moment().tz(timezoneId.trim()).format('z');

                        if(typeof timezoneAbbreviation == 'string' && timezoneAbbreviation.trim()) {
                            timezoneResult.abbreviation = timezoneAbbreviation.trim();
                        }
                    } catch(e) {
                        // error happened while getting timezone abbreviation.
                        timezoneResult.abbreviation = null;
                    }
                }
            }

            return timezoneResult;
        };
    }

    // formats device.getTimezone result
    // returns String: e.g. 'America/New_York (EST)'' or just 'America/New_York' is the abbreviation is missing for some reason
    // return null if a timezoneId was not found
    if(typeof this.getFormattedTimezone != 'function') {
        MADevice.prototype.getFormattedTimezone = function() {
            var formattedTimezone = null;

            var timezoneObject = this.getTimezone();
            var timezoneIdString = MA.getProperty(timezoneObject, ['id']);
            var timezoneAbbreviationString = MA.getProperty(timezoneObject, ['abbreviation']);

            if(typeof timezoneIdString == 'string' && timezoneIdString.trim()) {
                formattedTimezone = timezoneIdString.trim();

                // add abbreviation
                if(typeof timezoneAbbreviationString == 'string' && timezoneAbbreviationString.trim()) {
                    formattedTimezone += ' (' + timezoneAbbreviationString.trim() + ')';
                }
            }

            return formattedTimezone;
        };
    }

    /*
     * parameters: timezone Id string: optional. e.g. 'America/New_York'
     * The time is formatted based on one of three timezone information:
     *  Order of precedence for timezone id used to format the time form highest to lowest
     *  i) inputTimezoneId parameter (if one is passed)
     *  ii) device timezoneId as received from Live gateway and retreived using device.getTimezone()
     *  iii) default timezone id as setup on current salesforce org
    */
    if(typeof this.getFormattedTime != 'function') {
        MADevice.prototype.getFormattedTime = function(inputTimezoneId) {
            var timestamp = this.getTimestamp();
            var formattedTime = null;

            if(isNum(timestamp)) {
                try {
                    var thisDeviceTimezone = MA.getProperty(this.getTimezone(), ['id']);
                    var timezoneId = inputTimezoneId || thisDeviceTimezone || getProperty(MASystem, 'User.timezoneId', false); // timezone precedence
                    var theTime = moment(timestamp, 'x').tz(timezoneId);
                    var timeFormat = getProperty(MASystem, 'User.timeFormat', false);

                    if(theTime.isValid() && typeof timeFormat == 'string') {
                        formattedTime = theTime.format(timeFormat);
                    }
                } catch(e) {}
            }

            return formattedTime;
        };
    }

    /*
     * parameters: timezone Id string: optional. e.g. 'America/New_York'
     * The date is formatted based on one of three timezone information:
     *  Order of precedence for timezone id used to format the date form highest to lowest
     *  i) inputTimezoneId parameter (if one is passed)
     *  ii) device timezoneId as received from Live gateway and retreived using device.getTimezone()
     *  iii) default timezone id as setup on current salesforce org
    */
    if(typeof this.getFormattedDate != 'function') {
        MADevice.prototype.getFormattedDate = function(timezoneId) {
            var timestamp = this.getTimestamp();
            var formattedDate = null;

            if(isNum(timestamp)) {
                try {
                    var thisDeviceTimezone = MA.getProperty(this.getTimezone(), ['id']);
                    var timezoneId = timezoneId || thisDeviceTimezone || getProperty(MASystem, 'User.timezoneId', false); // timezone precedence
                    var theTime = moment(timestamp, 'x').tz(timezoneId);
                    var dateFormat = getProperty(MASystem, 'User.dateFormat', false);

                    if(theTime.isValid() && typeof dateFormat == 'string') {
                        formattedDate = theTime.format(dateFormat.toUpperCase());
                    }
                } catch(e) {}
            }

            return formattedDate;
        };
    }

    /*
     * @info gets the average speed between this and another device
     * @param another device: MADevice
     * @return the average speed in miles per hour: Number
     * @return null if value cannot be calculated for some reason
    */
    if(typeof this.getAverageSpeed != 'function')
    {
        MADevice.prototype.getAverageSpeed = function(otherDevice) {
            var averageSpeed = null;

            if(otherDevice instanceof MADevice)
            {
                var distanceBetween = this.getDistance(otherDevice); // miles
                var timeDifference = this.getTimeDifference(otherDevice); // milliseconds

                // an unfortunate but needed deviation from the formula after request.
                // forces the distance to 0 if instantenous speed were both 0
                // forces the average speed evaluate to 0
                if(this.getSpeed() == 0 && otherDevice.getSpeed() == 0)
                {
                    distanceBetween = 0;
                }

                if(isNum(distanceBetween) && isNum(timeDifference))
                {
                    timeDifference = timeDifference/1000/60/60; // milliseconds to hours

                    averageSpeed = distanceBetween/timeDifference; // miles per hour
                }
            }

            return averageSpeed;
        };
    }

    /*
     * @info gets the average speed between this and another device
     * uses MADevice.getAverageSpeed() to get the average speed between two devices
     * this functions formats the value by applying correct conversion units as well as formatting
     * the number to a displayable format (currently 2 decimal places)
     * null returned if for some reason the value could not be retreived or formatted correctly
    */
    if(typeof this.getFormattedAverageSpeed != 'function')
    {
        MADevice.prototype.getFormattedAverageSpeed = function(otherDevice) {
            var formattedAverageSpeed = null;

            if(otherDevice instanceof MADevice)
            {
                var averageSpeedInMilesPerHour = this.getAverageSpeed(otherDevice);

                if(isNum(averageSpeedInMilesPerHour))
                {
                    // convert from miles/h to user setting units
                    var userSettingsUnits = String(getProperty(userSettings||{}, 'RouteDefaults.unit', false)).toUpperCase();
                    var convertedAverageSpeed = averageSpeedInMilesPerHour * unitFactors['MILES'][userSettingsUnits]; // convert from miles to user settings units

                    if(isNum(convertedAverageSpeed))
                    {
                        formattedAverageSpeed = Number(convertedAverageSpeed).toFixed(2);
                    }
                }
            }

            return formattedAverageSpeed;
        };
    }

    /*
     * @info gets the time difference between this and another device
     * @param another device: MADevice
     * @return the time difference in milliseconds: Number
     * @return null if value cannot be calculated for some reason
    */
    if(typeof this.getTimeDifference != 'function')
    {
        MADevice.prototype.getTimeDifference = function(otherDevice) {
            var timeDifference = null;

            if(otherDevice instanceof MADevice)
            {
                var thisDeviceTimeStamp = this.getTimestamp();
                var otherDeviceTimeStamp = otherDevice.getTimestamp();

                if(isNum(thisDeviceTimeStamp) && isNum(otherDeviceTimeStamp))
                {
                    timeDifference = Math.abs( thisDeviceTimeStamp - otherDeviceTimeStamp ); // milliseconds
                }
            }

            return timeDifference;
        };
    }


    /*
     * @info gets the distance between this and another device
     * @param another device: MADevice
     * @return the distance between the two devices in miles (English Standard Units): Number
     * @return null if value cannot be calculated for some reason
    */
    if(typeof this.getDistance != 'function')
    {
        MADevice.prototype.getDistance = function(otherDevice) {
            var distanceBetween = null;

            if(otherDevice instanceof MADevice)
            {
                var thisDevicePosition = new google.maps.LatLng(this.getPosition());
                var otherDevicePosition = new google.maps.LatLng(otherDevice.getPosition());

                if(thisDevicePosition && otherDevicePosition)
                {
                    distanceBetween = google.maps.geometry.spherical.computeDistanceBetween(thisDevicePosition, otherDevicePosition); // meters
                    distanceBetween = distanceBetween * unitFactors['METERS']['MILES']; // convert and return in miles
                }
            }

            return distanceBetween;
        };
    }

    if(typeof this.getFormattedDistance != 'function')
    {
        MADevice.prototype.getFormattedDistance = function(otherDevice) {
            var formattedDistance = null;

            if(otherDevice instanceof MADevice)
            {
                var distanceBetween = this.getDistance(otherDevice); // miles

                if(isNum(distanceBetween))
                {
                    var userSettingsUnits = String(getProperty(userSettings||{}, 'RouteDefaults.unit', false)).toUpperCase();
                    var convertedDistanceBetween = distanceBetween * unitFactors['MILES'][userSettingsUnits]; // convert and return in user settings units

                    if(isNum(convertedDistanceBetween))
                    {
                        formattedDistance = Number(convertedDistanceBetween).toFixed(2);
                    }
                }
            }

            return formattedDistance;
        };
    }


    /******** date/time filters **********/

    /**
     * param: criteria object {}
     * Only considers the time of day and not the day/date itself e.g time falls between 2-4pm on whatever day
     */
    if(typeof this.lastReportTimeMatches != 'function')
    {
        MADevice.prototype.lastReportTimeMatches = function(criteria)
        {
            if(typeof criteria == 'object')
            {
                var operator = criteria.operator;
                var type = criteria.type;
                var time = criteria.time;
                var t1 = criteria.t1;
                var t2 = criteria.t2;
                var tz = criteria.tz;

                // set up upper and lower bounds of range
                var upper, lower, thisDevice;

                if(time == 'now')
                {
                    time = moment().valueOf();
                }

                if(t1 == 'now')
                {
                    t1 = moment().valueOf();
                }

                if(t2 == 'now')
                {
                    t2 = moment().valueOf();
                }

                if(operator == 'WITHIN')
                {
                    lower = moment(t1, 'x').tz(tz).valueOf();
                    upper = moment(t2, 'x').tz(tz).valueOf();
                }
                else if(operator == 'LESS_THAN')
                {
                    lower = moment(time, 'x').tz(tz).startOf('day').valueOf();
                    upper = moment(time, 'x').tz(tz).valueOf();
                }
                else if(operator == 'GREATER_THAN')
                {
                    lower = moment(time, 'x').tz(tz).valueOf();
                    upper = moment(time, 'x').tz(tz).endOf('day').valueOf();
                }
                else if(operator == 'EQUAL')
                {
                    lower = upper =  moment(time, 'x').tz(tz).valueOf();
                }

                var thisDeviceTimeStamp = this.getTimestamp();

                // make sure lower range is not earlier than two years ago
                if(isNum(upper) && isNum(lower) && isNum(thisDeviceTimeStamp))
                {
                    // for time comparisions only, igore what the day is and just consider the time only. These means we equalize the days while retaining the original time for comparision
                    var timeFormat = 'hh:mm:ss a';
                    var dateFormat = 'MM/DD/YYYY';
                    var randDate = '01/01/1970';

                    var upperTimeString =  moment(upper, 'x').tz(tz).format(timeFormat);
                    var lowerTimeString =  moment(lower, 'x').tz(tz).format(timeFormat);
                    var thisDeviceTimeString = moment(thisDeviceTimeStamp, 'x').tz(tz).format(timeFormat);

                    var upperMom = moment(randDate + ' ' + upperTimeString, dateFormat + ' ' + timeFormat);
                    var lowerMom = moment(randDate + ' ' + lowerTimeString, dateFormat + ' ' + timeFormat);
                    var thiDeviceMom = moment(randDate + ' ' + thisDeviceTimeString, dateFormat + ' ' + timeFormat);

                    if(lowerMom.isValid() && upperMom.isValid() && thiDeviceMom.isValid())
                    {
                        lower = lowerMom.valueOf();
                        upper = upperMom.valueOf();
                        thisDevice = thiDeviceMom.valueOf();

                        var timestamp = this.getTimestamp();
                        var result = thisDevice >= lower && thisDevice <= upper;
                        return result;
                    }
                }
            }
        }
    }

    /**
     * param: criteria object {}
     * Only considers the day irregardless of time. compares only the day of criteria and device regardless of time.
     */
    if(typeof this.lastReportDateMatches != 'function')
    {
        MADevice.prototype.lastReportDateMatches = function(criteria)
        {
            if(typeof criteria == 'object')
            {
                var operator = criteria.operator;
                var type = criteria.type;
                var deviceTime = criteria.time;
                var t1 = criteria.t1;
                var t2 = criteria.t2;
                var tz = criteria.tz;

                // change yesterday/today to actual value
                if(/yesterday/i.test(deviceTime)) {
                    deviceTime = moment().tz(tz).startOf('day').subtract(1, 'day').valueOf();
                } else if(/today/i.test(deviceTime)) {
                    deviceTime = moment().tz(tz).startOf('day').valueOf();
                }

                if(/yesterday/i.test(t1)) {
                    t1 = moment().tz(tz).startOf('day').subtract(1, 'day').valueOf();
                } else if(/today/i.test(t1)) {
                    t1 = moment().tz(tz).startOf('day').valueOf();
                }

                if(/yesterday/i.test(t2)) {
                    t2 = moment().tz(tz).startOf('day').subtract(1, 'day').valueOf();
                } else if(/today/i.test(t2)) {
                    t2 = moment().tz(tz).startOf('day').valueOf();
                }

                // set up upper and lower bounds of range
                var upper, lower;

                if(operator == 'WITHIN')
                {
                    lower = moment(t1, 'x').tz(tz).valueOf();
                    upper = moment(t2, 'x').tz(tz).valueOf();
                }
                else if(operator == 'LESS_THAN')
                {
                    lower = moment().tz(tz).subtract(2, 'years').valueOf();
                    upper = moment(deviceTime, 'x').tz(tz).valueOf();
                }
                else if(operator == 'GREATER_THAN')
                {
                    lower = moment(deviceTime, 'x').tz(tz).valueOf();
                    upper = moment().tz(tz).valueOf(); // now
                }
                else if(operator == 'EQUALS')
                {
                    lower = moment(deviceTime, 'x').tz(tz).startOf('day').valueOf();
                    upper =  moment(deviceTime, 'x').tz(tz).endOf('day').valueOf();
                }

                if(isNum(upper) && isNum(lower))
                {
                    // to compare dates/days only, just trim back all to the beginning of day and compare that
                    var upperMom = moment(upper, 'x').tz(tz).endOf('day');
                    var lowerMom = moment(lower, 'x').tz(tz).startOf('day');

                    var twoYearsAgoMom = moment(lower, 'x').tz(tz).subtract(2, 'years');

                    // make sure lower range is not earlier than two years ago
                    if(lowerMom.valueOf() < twoYearsAgoMom.valueOf())
                    {
                        lowerMom = twoYearsAgoMom;
                    }

                    if(lowerMom.isValid() && upperMom.isValid())
                    {
                        lower = lowerMom.valueOf();
                        upper = upperMom.valueOf();

                        var timestamp = this.getTimestamp();
                        var result = timestamp >= lower && timestamp <= upper;
                        return result;
                    }
                }
            }
        }
    }

    /**
     * param: criteria object {}
     * a strict comparision of date and time where ontly timestamps are strictly compared
     */
    if(typeof this.lastReportDateAndTimeMatches != 'function')
    {
        MADevice.prototype.lastReportDateAndTimeMatches = function(criteria)
        {
            if(typeof criteria == 'object')
            {
                var operator = criteria.operator;
                var type = criteria.type;
                var time = criteria.time;
                var t1 = criteria.t1;
                var t2 = criteria.t2;
                var tz = criteria.tz;
                var negate = criteria.negate;

                // set up upper and lower bounds of range
                var upper, lower;

                if(time == 'now')
                {
                    time = moment().valueOf();
                }

                if(t1 == 'now')
                {
                    t1 = moment().valueOf();
                }

                if(t2 == 'now')
                {
                    t2 = moment().valueOf();
                }

                if(operator == 'WITHIN')
                {
                    lower = moment(t1, 'x').tz(tz).valueOf();
                    upper = moment(t2, 'x').tz(tz).valueOf();
                }
                else if(operator == 'LESS_THAN')
                {
                    lower = moment().tz(tz).subtract(2, 'years').valueOf();
                    upper = moment(time, 'x').tz(tz).valueOf();
                }
                else if(operator == 'GREATER_THAN')
                {
                    lower = moment(time, 'x').tz(tz).valueOf();
                    upper = moment().tz(tz).valueOf();
                }
                else if(operator == 'EQUAL')
                {
                    lower = upper =  moment(time, 'x').tz(tz).valueOf();
                }

                if(isNum(upper) && isNum(lower))
                {
                    var upperMom = moment(upper, 'x').tz(tz);
                    var lowerMom = moment(lower, 'x').tz(tz);
                    var twoYearsAgoMom = moment(lower, 'x').tz(tz).subtract(2, 'years').startOf('day');

                    // make sure lower range is not earlier than two years ago
                    if(lowerMom.isValid() && twoYearsAgoMom.isValid() && lowerMom.valueOf() < twoYearsAgoMom.valueOf())
                    {
                        lowerMom = twoYearsAgoMom;
                    }

                    if(lowerMom.isValid() && upperMom.isValid())
                    {
                        lower = lowerMom.valueOf();
                        upper = upperMom.valueOf();

                        var result = this.getTimestamp() >= lower && this.getTimestamp() <= upper;

                        if(negate)
                        {
                            return !result;
                        }
                        else
                        {
                            return result;
                        }
                    }
                }
            }
        }
    }

    if (typeof this.meetsLiveCriteria != 'function') {
        MADevice.prototype.meetsLiveCriteria = function(criteriaList) {
            var device = this;

            if (Array.isArray(criteriaList) && criteriaList.length > 0) {
                var criteria = criteriaList[0];

                if (criteria.type) {
                    if (criteria.type == 'date') {
                        return device.lastReportDateMatches(criteria);
                    } else if (criteria.type == 'time') {
                        return device.lastReportTimeMatches(criteria);
                    } else if (criteria.type == 'timestamp') {
                        return device.lastReportDateAndTimeMatches(criteria);
                    } else {
                        return false;
                    }
                }
            }


        }
    }
}

// returns true if num is an integer or float. Makes up for JavaScript's parseFloat, Number and isNaN shortcomings
function isNum(num) {
    return /^[+-]?\d+(.\d+)?$/.test(num);
}

function searchLookupOptions (filter,keepSearch,searchTerm) {
    var dfd = $.Deferred();
    if (typeof keepSearch !== 'boolean') {
        keepSearch = true;
    }
    var processData = {
    	ajaxResource : 'TooltipAJAXResources',
    	action			: 'get_lookup_optionsv2',
    	baseObject: filter.BaseObject,
        fieldApiName : filter.FieldApiName,
        fieldName: filter.fieldName,
        parentField: filter.ParentField == null || filter.ParentField == 'Id' || (filter.Reference !== true && filter.GrandparentField == null) ? '--none--' : filter.ParentField,
        grandparentField : filter.GrandparentField == null || filter.GrandparentField == 'Id' || filter.Reference !== true ? '--none--' : filter.GrandparentField,
        term: searchTerm,
        keepSearch: keepSearch
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(res, event) {
    	    if(event.status) {
                dfd.resolve(res);
    	    }
    	    else {
    	        dfd.resolve({success:false});
    	    }
        },{buffer:false,escape:false}
    );
    return dfd.promise();
}

function searchUsers (searchTerm) {
    var dfd = jQuery.Deferred();
    searchTerm = searchTerm || '';

    var processData = {
    	ajaxResource : 'TooltipAJAXResources',

    	action: 'get_users_search',
    	searchTerm : searchTerm
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(res, event) {
            dfd.resolve(res);
        },{buffer:false,escape:false}
    );

    return dfd.promise();
}

function searchSFObject (options) {
    $.extend({
        'sf_object' : '', // Salesforce object to search
        'fieldsToReturn' : 'Id', //comma seperated string of fields -> Id,Name,Type...
        'searchTerm' : '' //what to find
    }, options || {});
    var dfd = jQuery.Deferred();

    if(options.sf_object == null) {
        dfd.resolve({success:false,error:'Missing Salesforce Object',expectedOption:{"sf_object":"Account","outputFields":"Id,Name","searchTerm":"Test"}});
    }
    else if(options.searchTerm == null || options.searchTerm == '') {
        dfd.resolve({success:false,error:'Missing a search term',expectedOption:{"sf_object":"Account","outputFields":"Id,Name","searchTerm":"Test"}});
    }
    else {

        options.ajaxResource = 'TooltipAJAXResources';
        options.action = 'searchObjectForName';

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	options,
        	function(res, event) {
                dfd.resolve(res);
            },{buffer:false,escape:false}
        );
    }

    return dfd.promise();
}

function getLookupOptions (options) {
    $.extend({
        searchTerm : '',
        baseObject : '',
        fieldName : ''
    }, options || {});
    var dfd = jQuery.Deferred();

    var processData = {
		ajaxResource : 'TooltipAJAXResources',
		action: 'get_lookup_options',
		baseObject: options.baseObject,
        fieldName: options.fieldName,
        term: options.searchTerm
	};

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(res, event) {
            if (event.status) {
                if (res.success) {
                    dfd.resolve(res.lookupOptions);
                } else {
                    dfd.reject(res.error);
                }
            } else {
                dfd.reject(event.message);
            }
        },{buffer:false,escape:false}
    );

    return dfd.promise();
}

//helper method for updating nested objects using a dot notation field name
function updateValue(obj, field, value)
{
    try {
        if ( MA.Namespace == 'maps')
        {
            obj = MA.Util.removeNamespace(obj,'maps__');

            //remove from string prop as well
            field = field.replace('maps__','');
        }

        var fieldParts = field.split('.');
        var currentObj = obj;
        for (var i = 0; i < fieldParts.length - 1; i++) {
            currentObj = currentObj[fieldParts[i]] = currentObj[fieldParts[i]] || {};
        }
        currentObj[fieldParts[fieldParts.length - 1]] =  value;
        return true;
    }
    catch (err) { }

    return false;
}

function timeStringToSlider (utcTime) {
    //ensure this is a number
    if(isNaN(utcTime)) {
        var timeNow = new Date();
        return timeStringToSlider(timeNow.getTime());
    }
    else {
        var momentTime = moment(+utcTime);
        var momentObject = momentTime.toObject();
        var dayOfWeek = momentTime.format('dddd');
        momentObject['dayOfWeek'] = dayOfWeek;

        //conver to slider value
        var mHours = momentObject.hours;
        var mMinutes = momentObject.minutes;
        var hours1 = mHours * 60;
        var minutes1 = mMinutes;
        var sliderValue = hours1+minutes1;
        momentObject['sliderValue'] = sliderValue;
        momentObject['string'] = momentTime.format('h:mm A')
        return momentObject;
    }
}
function sliderToTimeString (value) {
    if(isNaN(value)) {
        //just default to today
        var d = new moment();
        return {
            hours : String(d.format('h')),
            minutes : String(d.format('m')),
            milHours : String(d.format('H')),
            milMinutes : String(d.format('m')),
            string : d.format('h') + ':' + d.format('m') + ' ' + d.format('a'),
            militaryTime : d.format('H') + ':' + d.format('m')
        };
    }

    var hours1 = Math.floor(value / 60);
    var minutes1 = value - (hours1 * 60);
    var AMPM = '';
    if (hours1.length == 1) {hours1 = '0' + hours1;}
    if (String(minutes1).length == 1) { minutes1 = '0' + minutes1;}
    if (minutes1 == 0) {minutes1 = '00';}
    if (hours1 >= 12) {
        if (hours1 == 12) {
            hours1 = hours1;
            minutes1 = minutes1;
            AMPM = 'PM';
        } else {
            hours1 = hours1 - 12;
            minutes1 = minutes1;
            AMPM = 'PM';
        }
    } else {
        hours1 = hours1;
        minutes1 = minutes1;
        AMPM = 'AM';
    }
    if (hours1 == 0) {
        hours1 = 12;
        minutes1 = minutes1;
    }

    var milHours = AMPM == 'PM' ? hours1 + 12 : hours1;

    return {
        hours : String(hours1),
        minutes : String(minutes1),
        milHours : String(milHours),
        milMinutes : String(minutes1),
        string : hours1 + ':' + minutes1 + ' ' + AMPM,
        militaryTime : milHours + ':' + String(minutes1)
    };
}

function newEventClassic() {
    MALayers.hideModal('NewEventPopup',true);
    var records = $('#NewEventPopup').data('records');
    jQuery.each(records || [], function (index, record) {
        var recordId = record.Id;
    	var redirectURL = MA.resources.MapActions + '?action=new_event&id=' + recordId;
   		window.open(redirectURL);
    });
}
function newTaskClassic() {
    MALayers.hideModal('NewTaskPopup',true);
    var records = $('#NewTaskPopup').data('records');
    jQuery.each(records || [], function (index, record) {
    	var recordId = record.Id;
    	var redirectURL = MA.resources.MapActions + '?action=new_task&id=' + recordId;
       	window.open(redirectURL);
    });
}


function NotifyError(pTitle,pMessage)
{
    //start deprecating notify, use toastr
    MAToastMessages.showError({
        message: pTitle,
        subMessage: pMessage,
        timeOut:0,
        extendedTimeOut:0,
        closeButton:true
    });
}

function NotifyWarning(pTitle, pMessage, timeout)
{
    MAToastMessages.showWarning({
        message: pTitle,
        subMessage: pMessage,
        timeOut: isNum(timeout) ? timeout : 5000
    });
}

function NotifySuccess(pTitle, pMessage)
{
    MAToastMessages.showSuccess({
        message: pTitle,
        subMessage: pMessage,
        timeOut:5000
    });
}

function toggleSLDSNavigation(e) {
	var navTarget = $(e).attr('target-content');
	var navContentTarget = $('#' + navTarget);

    if(navTarget == 'shapeLayerBuilderTabDisplay' || navTarget == 'shapeLayerBuilderTabShapeSelection') {
        //add validation, need to change this in future
        if ($('#shapeBuilderDetailsName').val() == '') {
            $('#shapeBuilderDetailsName').addClass('error');
            $('#ShapeBuilderMenu .slds-nav-vertical__item').removeClass('slds-is-active').eq(0).addClass('slds-is-active');
            return;
            // insert error message that a name needs to be entered before continuing
        }
        else {
            $('#shapeBuilderDetailsName').removeClass('error');
        }
    }

	$(e).closest('.slds-nav-vertical__item').siblings('.slds-nav-vertical__item').removeClass('slds-is-active');
	$(e).closest('.slds-nav-vertical__item').addClass('slds-is-active');
	// $(navTargetContent).closest('.slds-tabs--default').find('.slds-tabs--default__content').removeClass('slds-show').addClass('slds-hide');
	$(navContentTarget).siblings('.slds-navigation-content-area').removeClass('slds-show').addClass('slds-hide');
	$(navContentTarget).removeClass('slds-hide').addClass('slds-show');
}

/* parses records of different types for address and returns address */
/* tries to return address in both formatted string and object formats */
/* some records have an address in the device (if they're live records) or in address fields, or both, or other future options. The source option specifies what address should be looked for */
/* returns { //
    formattedAddress: STRING,
    addressObject: {
        street: STRING,
        state: STRING,
        country: STRING,
        ...
    }
} */
/* returns null only if both an address object and formatted address could not be located/built with given information */
function getRecordAddress(record, options)
{
    // getRecordAddress(record, {source:'device'}); -- returns the address calculated from the device if one is found
    // getRecordAddress(record, queryData); -- assumes this is a regular marker record, queryData must have the addressFields object
    // getRecordAddress(record, addressFields); -- adressFields{} needs to be an objects with address key value pairs which tell where in the record addresses will be found

    // addressFields = {
    //     street: STRING
    //     ...
    // }

    /*
        options = {
            source: String|Object|Array|null, // identifies where and how the address will be located within the record. if blank, it's assumed queryData was passed in and will attempt to find addressFields in there
            source: device, // for live records with devices in them. if source is marker, also pass in queryData to find addressFields
            queryData: { // used to pass any query information that may be essential to locate address. does not need all query information, just what is usable to locate address e.g. addressFields for regular marker records
                addressFields: {} // has field names that help locate address values in record
            }
            addressFields: { // you can also pass this directly to locate addresses on the record instead of queryData

            }
        }
    */
    var result = null;


    if(typeof record == 'object' && typeof options == 'object')
    {
        var formattedAddress, addressObject;

        if(options.source == 'device')
        {
            if((record.device) instanceof MADevice) // if we have a vaild device in the record
            {
                formattedAddress = record.device.getFormattedAddress();
                addressObject = record.device.getAddressObject();
            }
        }
        else
        {
            // assumes this is a regular record so it uses queryData addressFields to locate/build address
            if(typeof options.queryData == 'object' || typeof options.addressFields == 'object') // if we have query data
            {
                // first try to see if address fields property were passed, else try to find address fields in
                var addressFields = options.addressFields || options.queryData.addressFields; // first

                if(typeof addressFields == 'object') // if we have addressFields to locate addresses in a record
                {
                    formattedAddress = Plotting.getFormattedAddress(record, {addressFields: addressFields});

                    addressObject = null; // todo - for now, we don't try to build an address object for regular/marker layers
                }
            }
        }

        // populate result with formatted address and address object if any valid ones are found

        // add formatted address string to result if any
        if(formattedAddress && typeof formattedAddress == 'string' && String(formattedAddress).trim() != '')
        {
            // make result an object and populate the formatted address
            result = {
                formattedAddress: formattedAddress
            }
        }

        // add address object to result if any
        if(addressObject && typeof addressObject == 'object')
        {
            // if result is not an object yet, make it an object and populate it with the address object
            result = result || {};
            result.addressObject = addressObject;
        }
    }

    return result;
}


function getDistanceMatrix(distanceMatrixOptions)
{
    /*
        distanceMatrixOptions = {
            origins: [],
            destinations: [],
            mode: STRING, // DRIVING
            ... // bunch of other options needed by google, esri or HERE endpoints
        }
    */
    var $dfd = $.Deferred();

    try
    {
        if(typeof distanceMatrixOptions == 'object')
        {
            if(Array.isArray(distanceMatrixOptions.origins) && Array.isArray(distanceMatrixOptions.destinations))
            {
                var normalizedOrigins = distanceMatrixOptions.origins.map(function(origin, i) {
                    // todo - check if origin.type and origin.value are valid location inputs (string, LatLng objects, Google Places, etc.)
                    return origin.value;
                });

                var normalizedDestinations = distanceMatrixOptions.destinations.map(function(destination, i) {
                    // todo - check if origin.type and origin.value are valid location inputs (string, LatLng objects, Google Places, etc.)
                    return destination.value;
                });

                var travelMode = typeof distanceMatrixOptions.mode == 'string' ? distanceMatrixOptions.mode.trim().toUpperCase() : 'DRIVING';

                // this may be getting replaced by HERE endpoint logic
                var service = new google.maps.DistanceMatrixService();

                service.getDistanceMatrix(
                {
                    origins: normalizedOrigins,
                    destinations: normalizedDestinations,
                    travelMode: travelMode,
                    transitOptions: {
                    },
                    drivingOptions: {
                    	departureTime: new Date(),
                    	trafficModel: 'bestguess'
                    },
                    unitSystem: google.maps.UnitSystem.METRIC,
                    avoidHighways: false,
                    avoidTolls: false
                }, callback);

                function callback(response, status) {
                    try
                    {
                      	if(status == 'OK')
                      	{
                      	    $dfd.resolve({success:true, result: {
                      	        OriginalResults: response,

                      	        // ... normalize result object
                      	        row: getProperty(response, 'rows.0.elements.0'), // quick way to get a result object when only one source and destination were passed in

                      	    }});
                      	}
                      	else
                      	{
                      	    $dfd.resolve({success:false, message:'Bad distance matrix response'});
                      	}
                    }
                    catch(e)
                    {
                        $dfd.resolve({success:false, message:'Error while processing distance matrix results', exception:e});
                    }
                }
            }
            else
            {
                 $dfd.resolve({success:false, message:'Invalid distance matrix origin(s) and/or destination(s)'});
            }
        }
        else
        {
            $dfd.resolve({success:false, message:'Distance matrix options not found or invalid'});
        }


    }
    catch(e)
    {
        $dfd.resolve({success:false, message:'Unexpected error while retreiving distance matrix', exception:e});
    }

    return $dfd.promise();
}

function addDataToArray(array,data) {
    var dfd = $.Deferred();

    if(!Array.isArray(array) || !Array.isArray(data)) {
        dfd.resolve({success:false,array:array,error:'Passed params are not of type "Array"'});
    }
    else {

        //proccess our html off the main thread
        if(window.Worker) {
            var processData = {
                cmd : 'addDataToArray',
                array : JSON.stringify(array),
                data : JSON.stringify(data),
                externalScripts : JSON.stringify([MA.resources.MAShapeProcess]),
                dataRegion : getProperty(MASystem, 'Organization.dataRegion', false)
            };

            var htmlWorker = new Worker(MA.resources.MAWorker);
            htmlWorker.postMessage(processData);
            htmlWorker.onmessage = function(e) {
                var data = e.data;
                if(data) {
                    dfd.resolve(data);
                }
                else {
                    dfd.resolve({success:false,array:array,error:MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin});
                }
            };
        }
        else {
            addToArray({data:data,array:array},function (res) {
                if(res) {
                    dfd.resolve(res);
                }
                else {
                   dfd.resolve({success:false,array:array,error:MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin});
                }
            })
        }
    }

    return dfd.promise();
}

// slds tab toggling - requires id on the content div and an attribute on the li
function toggleArcGISTab(e) {
    var tabTarget = $(e).attr('data-tab');
    var tabContentTarget = $(e).closest('.slds-tabs--default').find('#' + tabTarget);

    $(e).siblings('.slds-tabs--default__item').removeClass('slds-active');
    $(e).addClass('slds-active');
    $(e).closest('.slds-tabs--default').find('.slds-tabs--default__content').removeClass('slds-show').addClass('slds-hide');
    $(tabContentTarget).addClass('slds-show').removeClass('slds-hide');
}

function addCustomAction(custom) {
    // wait for the vue component to load
    var waitInt = setInterval(function () {
        if (MASystem && MASystem.vueCustomNavReady) {
            // load the action
            if (custom && typeof custom.label === 'string' && custom.label.trim() && typeof custom.action === 'function') {
                if (window.VueEventBus) {
                    window.VueEventBus.$emit('add-custom-action', custom);
                }
            }
            clearInterval(waitInt);
        }
    }, 500);
    // if for some reason the interval fails or vue fails, just kill it after 10 seconds
    setTimeout(function() {
        clearInterval(waitInt);
    }, 10000);
}

function massActionShapeClick (proximityLayer, buttonAction, buttonType, massActionOptions)
{
    var shapeMgr = new MA.Map.ShapeManager().addLayer(proximityLayer);
    var geometry = MA.getProperty(massActionOptions, 'shape.geometry');
    let polylineLayerFound = false;

    //loop over all visible records and determine which markers are in this layer
    var matchedRecords = [];
    var dataLayers = {};
    var recordsDone = true;
    var dataLayersDone = true;
    var $loading = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,timeOut:0,extendedTimeOut:0});
    var $plottedLayers = MA.isMobile ? $('#PlottedQueriesTable .PlottedRowUnit') : $('#PlottedQueriesContainer .PlottedRowUnit');

    Object.keys(VueStore.state.plotted.waypointMarkers).forEach(function(key) {
        var records = {};
        VueStore.state.plotted.waypointMarkers[key].forEach(function(marker) {
            if (marker.record) {
                records[marker.record.Id] = marker.record;
            }
        });

        $plottedLayers = $plottedLayers.add($('<div>').data('records', records));
    });

    $plottedLayers.each(function () {
        var $plottedLayer = $(this);

        if($plottedLayer.hasClass('DataLayer')){
            dataLayersDone = false;
            //limit to only a few actions
            var markers = $plottedLayer.data('records') || {};
            var markerKeys = Object.keys(markers);
            var mI = markerKeys.length;
            var markerArr = [];
            var ii = 0;
            setTimeout(function doBatchData() {
                if(ii < mI) {
                    var recordsProcessed = 0;
                    while (recordsProcessed < 100 && ii < mI) {
                        recordsProcessed++;
                        prop = markerKeys[ii];
                        var record = markers[prop];
                        var markerRowId = record.data.rowid;
                        // need to update legend on mobile for data layers assume true
                        var markerIsVisible = MA.isMobile ? true : $plottedLayer.find('.legend-row[uid="'+markerRowId+'"] .legend-checkbox-wrapper .MAIcon').hasClass('ion-checkmark-round');
                        //update counts
                        if ((record.isVisible || record.isClustered ) && shapeMgr.containsLatLng(record.markerCoordinate) && markerIsVisible) {
                            markerArr.push(record.clusterMarker);
                        }
            
                        ii += 1;
                    }
                    setTimeout(doBatchData, 1);
                }
                else {
                    dataLayersDone = true;
                }
            },1);
            dataLayers[$plottedLayer.attr('qid')] = markerArr;
            

        }
        else if($plottedLayer.hasClass('ArcGISLayer')){
            var layerId = $plottedLayer.attr('qid');
            var sublayers = ArcGIS.layers[layerId].sublayers;
            var records = [];
            Object.keys(sublayers).forEach(function(sublayerId){
                var sublayer = sublayers[sublayerId];
                if(sublayer.class == 'placeholder' || sublayer.type != 'ArcGISFeatureLayer') return;
                sublayer.forEach(function(feature){
                    if(feature.getGeometry().getType() != 'Point') return false;
                    if(shapeMgr.containsLatLng(feature.getGeometry().get())){
                        var coords = feature.getGeometry().get();
                        var record = {
                            marker: new google.maps.Marker({
                                position: coords
                            }),
                            location: {
                                coordinates: {
                                    lat: coords.lat(),
                                    lng: coords.lng()
                                }
                            },
                            type: 'feature',
                            layerId: layerId,
                            sublayerId: sublayerId,
                            Id: feature.getId(),
                            sublayer: sublayer,
                            feature: feature
                        };
                        record.marker.qid = layerId;
                        record.marker.record = {
                            Id: record.Id
                        };
                        records.push(record);
                        matchedRecords.push(record);
                    }
                });
            });
            recordsDone = false;
            var nrecords = records.length;
            records.forEach(function(record) {
                MA.Geocoding.reverseGeocode({ latLng: record.marker.position }, function (geoResponse) {
                    record.address = geoResponse.result.FormattedAddress
                    recordsDone = --nrecords == 0;
                });
            });
        }
        else if($plottedLayer.hasClass('ArcGISLayerTemplate')) {
            // TODO: Mass actions for ArcGIS points
        } else {
            var records = $plottedLayer.data('records') || {};
            var keys = Object.keys(records) || [];
            var len = keys.length;
            var i = 0;
            const polylineFoundRecordSet = new Set();
            recordsDone = false;
            setTimeout(function doBatch() {
                if (i < len) {
                    var recordsProcessed = 0;
                    while (recordsProcessed < 100 && i < len) {
                        recordsProcessed++;
                        prop = keys[i];
                        var record = records[prop];
                        //update counts
                        if ((record.isVisible || record.isWaypoint || record.isClustered || record.isScattered) && shapeMgr.containsLatLng(record.marker.getPosition())) {
                            matchedRecords.push(record);
                        } else if (record.isPolyline && record.polyline.validPolyline) {
                            record.polylineMarkers.forEach(mrkr => {
                                if (shapeMgr.containsLatLng(mrkr.getPosition()) && !polylineFoundRecordSet.has(record.Id)) {
                                    matchedRecords.push(record);
                                    polylineFoundRecordSet.add(record.Id);
                                    polylineLayerFound = true;
                                }
                            });
                        }
            
                        i += 1;
                    }
                    setTimeout(doBatch, 1);
                } else {
                    recordsDone = true;
                }
            }, 1);
        }
    });

    var waitInt = setInterval(function() {
        if(recordsDone && dataLayersDone) {
            clearInterval(waitInt);
            MAToastMessages.hideMessage($loading);
            //search for a matching framework action
            var frameworkAction = buttonType == 'Custom Action'
                ? MAActionFramework.customActions[buttonAction] || null
                : MAActionFramework.standardActions[buttonAction] || null;
            
            //perform mass action if found
            if (frameworkAction) {
                switch (frameworkAction.Action)
                {
                    case 'Javascript':
                        const invalidPolylineActions = new Set();
                        invalidPolylineActions.add(MASystem.Labels.ActionFramework_Clear_Coordinates);
                        invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Verified_Location);
                        invalidPolylineActions.add(MASystem.Labels.Context_Remove_Marker);

                        if (invalidPolylineActions.has(frameworkAction.Label) && polylineLayerFound) {
                            MAToastMessages.showWarning({message:MASystem.Labels.Actions_Not_Supported_For_Polyline,timeOut:5000});
                            return;
                        }
        
                        var favorites = [];
                        if (MA.isMobile) {
                            $('#PlottedQueriesTable .FavoriteRowUnit').each(function (i,row){
                                var marker = $(row).data('marker');
                                var poiCoordinate = marker.getPosition();
                                if (shapeMgr.containsLatLng(poiCoordinate) && marker.map != null) {
                                    favorites.push($(row).data('marker'));
                                }
                            });
                        } else {
                            VueEventBus.$emit('get-favorite-markers', function(layerMarkers) {
                                var layerQIDs = Object.keys(layerMarkers);
                                var layerLength = layerQIDs.length;
                                for (var l = 0; l < layerLength; l++) {
                                    var qid = layerQIDs[l];
                                    var layer = layerMarkers[qid] || {};
                                    var markers = layer.markers || [];
                                    markers.forEach(function(marker) {
                                        var poiCoordinate = marker.getPosition();
                                        if (shapeMgr.containsLatLng(poiCoordinate) && marker.map != null) {
                                            favorites.push(marker);
                                        }
                                    });
                                }
                            });
                        }
        
                        var customMarkers = [];
                        $.each(MA.Map.Search.markers || [], function (index, poiMarker) {
                            var place = poiMarker.maData.place;
                            var MarkerCoordinate = poiMarker.getPosition();
                            if (shapeMgr.containsLatLng(MarkerCoordinate)) {
                                customMarkers.push({ type: 'POI', title: place.name || 'My POI', latlng: MarkerCoordinate, address: place.formatted_address, place: place });
                            }
                        });
                        if (PositionEnabled) {
                            try {
                                if (shapeMgr.containsLatLng(PositionMarker.getPosition())) {
                                    customMarkers.push({ type: 'MyPosition', title: 'My Position', latlng: PositionMarker.getPosition(), address: 'My Position' });
                                }
                            }
                            catch (err) {}
                        }
        
                        if(matchedRecords.length == 0 && favorites.length == 0 && customMarkers.length == 0 && dataLayers.length == 0) {
                            growlError($('#growl-wrapper'), 'No available layers were found.', 4000);
                        }
                        else {
                            var actionOptions =  {
                                records			: matchedRecords,
                                favorites		: favorites,
                                customMarkers	: customMarkers,
                                dataLayers      : dataLayers,
                                isMassAction	: true
                            };
                            // determine if to add shape info
                            if (buttonType == 'Custom Action') {
                                if (MA.getProperty(frameworkAction, 'Options.includeShapeInfo')) {
                                    actionOptions.shape = {
                                        geometry: geometry
                                    };
                                }
                            } else {
                                actionOptions.shape = {
                                    geometry: geometry
                                };
                            }

                            frameworkAction.ActionValue.call(this, actionOptions);
                        }
        
                        break;
        
                    case 'NewWindow':
                        //check for possible options, let's say records {records}
                        //parameters check
                        var options = {
                            recString : ''
                        };
        
                        $.each(matchedRecords || [], function (index, marker) {
                            var markId = marker.record.Id;
                            options.recString += options.recString == '' ? markId : ','+markId;
                        });
        
                        //is this a post or get request
                        
                        var newURL = frameworkAction.ActionValue;
                        if(frameworkAction.Options.method == 'GET') {
                            //replace holders with new options
                            if(frameworkAction.Options.addRecords) {
                                newURL = frameworkAction.ActionValue + (frameworkAction.ActionValue.indexOf('?') == -1 ? 
                                    '?'+frameworkAction.Options.paramName+'=' + options.recString : 
                                    '?'+frameworkAction.Options.paramName+'=' + options.recString)
                                //newURL = frameworkAction.ActionValue.replace('{records}',options.recString);
                            }
                            if (MA.getProperty(frameworkAction, 'Options.includeShapeInfo')) {
                                var perimeter = MA.getProperty(geometry, 'perimeter');
                                var area = MA.getProperty(geometry, 'area');
                                var unit = MA.getProperty(geometry, 'unit');

                                if (isNum(area) && isNum(perimeter)) {
                                    
                                    newURL += newURL.indexOf('?') < 0 ? '?' : '&';
                                    newURL += 'perimeter=' + perimeter + '&area=' + area + '&unit=' + unit;
                                }
                            }

                            window.open(newURL);
                            break;
                        }
                        else {
                            var postData = {};
        
                            if(frameworkAction.Options.addRecords) {
                                postData[frameworkAction.Options.paramName] = options.recString
                            }

                            if (MA.getProperty(frameworkAction, 'Options.includeShapeInfo')) {
                                var perimeter = MA.getProperty(geometry, 'perimeter');
                                var area = MA.getProperty(geometry, 'area');
                                var unit = MA.getProperty(geometry, 'unit');

                                if (isNum(area) && isNum(perimeter)) {
                                    postData['shape'] = {
                                        geometry: {
                                            perimeter: perimeter,
                                            area: area,
                                            unit: unit
                                        }
                                    };
                                }
                            }
        
                            //check if any get parameters are present and send as post as well
                            if(newURL.indexOf('?') > -1) {
                                //loop over params and make post
                                var params = newURL.split('?')[1];
                                //now split on &
                                var paramArr = params.split('&');
                                $.each(paramArr,function(index,pa){
                                    var paramParts = pa.split('=');
                                    if(paramParts.length == 2) {
                                        postData[paramParts[0]] = paramParts[1];
                                    }
                                    else {
                                        //invalid
                                        return false;
                                    }
                                });
                            }
                            openNewWindow('POST', newURL, postData, '_blank');
                            break;
                        }
                    case 'LightningOut':
                        var options = {
                            recordList : [],
                            label: frameworkAction.Label
                        };
                        
                        $.each(matchedRecords || [], function (index, marker) {
                            var markId = marker.record.Id;
                            var markerTooltips = marker.plottedQuery.data('tooltips') || [];
                            var tooltipInfo = [];
                            options.recordList.push(markId);
                            for(var i = 0; i < markerTooltips.length; i++) {
                                var thisTooltip = markerTooltips[i];
                                tooltipInfo.push({
                                    apiName: thisTooltip.ActualFieldName,
                                    baseObject: thisTooltip.BaseObject,
                                    value: marker[thisTooltip.ActualFieldName]
                                });
                            }
                            options[markId] = {
                                location: {
                                    lat: getProperty(marker,'location.coordinates.lat',false) || null,
                                    lng: getProperty(marker,'location.coordinates.lng',false) || null
                                },
                                formattedAddress: marker.FormattedAddress_MA || '',
                                recordId: marker.record.Id,
                                tooltipInfo: tooltipInfo
                            }
                        });
                        if (frameworkAction.ActionValue.indexOf('{records}') >= 0) {
                            options.records = true;
                        }
                        var actionValue = frameworkAction.ActionValue;

                        options.actionValue = actionValue;
                        options.qualifiedName = actionValue;
                        if (frameworkAction.Options.addRecords) {  
                            options[frameworkAction.Options.paramName] = record.Id;                         
                        }
                        options.frameworkOptions = frameworkAction.Options;
                        options.hideControls = frameworkAction.Options.hideControls;
                        launch_custom_action(options);
                        break;
                    case 'FlowAction':
                        var options = {
                            recordList : [],
                            label: frameworkAction.Label
                        };
                        $.each(matchedRecords || [], function (index, marker) {
                            var markId = marker.record.Id;
                            options.recordList.push(markId);
                        });
                        options.actionValue = 'maps:MapsFlowDisplay';
                        options.qualifiedName = 'maps:MapsFlowDisplay';
                        options.bundleName = 'maps:MapsFlowDisplay';
                        options.flowDevName = frameworkAction.ActionValue;
                        options.hideControls = frameworkAction.Options.hideControls;
                        launch_custom_action(options);
                        break;
                    case 'QuickAction':
                        var options = {
                            recordList : []                            
                        };
                        $.each(matchedRecords || [], function (index, marker) {
                            var markId = marker.record.Id;                            
                            var markerTooltips = marker.plottedQuery.data('tooltips') || [];
                            var tooltipInfo = [];
                            for(var i = 0; i < markerTooltips.length; i++) {
                                var thisTooltip = markerTooltips[i];
                                tooltipInfo.push({
                                    apiName: thisTooltip.ActualFieldName,
                                    baseObject: thisTooltip.BaseObject,
                                    value: marker[thisTooltip.ActualFieldName]
                                });
                            }
                            options.recordList.push(markId);
                            options[markId] = {
                                location: {
                                    lat: getProperty(marker,'location.coordinates.lat',false) || null,
                                    lng: getProperty(marker,'location.coordinates.lng',false) || null
                                },
                                formattedAddress: marker.record.FormattedAddress_MA || '',
                                recordId: marker.record.Id,
                                tooltipInfo: tooltipInfo
                            }
                        });
                        var remotingOptions = MA.isMobile ? RemoteAction : MARemoting;
                        Visualforce.remoting.Manager.invokeAction(remotingOptions.CustomActions.performQuickAction,
                            frameworkAction.ActionValue, '',
                        function (response, event) {
                            if (response && response.success) {
                                switch(response.actionType) {
                                    case 'lightning': 
                                        options.actionValue = response.bundleName
                                        options.qualifiedName = response.qualifiedName
                                        options.bundleName = response.bundleName
                                        
                                        launch_custom_action(options);
                                    break;
                                    case 'flow':
                                        options.actionValue = 'maps:MapsFlowDisplay';
                                        options.qualifiedName = 'maps:MapsFlowDisplay';
                                        options.bundleName = 'maps:MapsFlowDisplay';
                                        options.flowDevName = response.flowDevName;
                                        launch_custom_action(options);
                                    break;
                                }
                                
                            } else {
                                MAToastMessages.showError({
                                    message: response.errorMessage
                                });                            
                            }
                        });
                        break
                    default:
                        break;
                }
            }
        }
    }, 2000);
}

$(document).ready(function() {
	$(document).on('click', '.slds-nav-vertical__action', function(event) {
		toggleSLDSNavigation(this);
	});
	$('body').on('click','#UpdateFieldPopup .remove-mass-update-row',function(){
	    if($('#UpdateFieldPopup .mass-update-row').length > 1){
	        $(this).closest('.mass-update-row').remove();
	    }
    });
    //When the event popup is in use if the user selects a start date that is after the end date we want to update the end date accordingly.
    $('#newevent-details-startdate').on('change',function() {
        var startDate = new Date($(this).val());
        var endDate = new Date($('#newevent-details-enddate').val());
		if(startDate > endDate) {
		    $('#newevent-details-enddate').val($(this).val())
        }
        
    })
    //When the event popup is in use if the user selects an end date that is before the start date we want to update the start date accordingly.
    $('#newevent-details-enddate').on('change',function() {
        var endDate = new Date($(this).val());
        var startDate = new Date($('#newevent-details-startdate').val());
		if(startDate > endDate) {
		    $('#newevent-details-startdate').val($(this).val())
        }
        
    })
});

function massActionClick (buttonAction, buttonType, clickTarger)
{
    clickTarger = clickTarger || ContextMenuClick;
    //search for a matching framework action
    var frameworkAction = buttonType == 'Custom Action'
        ? MAActionFramework.customActions[buttonAction] || null
        : MAActionFramework.standardActions[buttonAction] || null;

    let foundPolylineLayer = false;
    const invalidPolylineActions = new Set();
    invalidPolylineActions.add(MASystem.Labels.ActionFramework_Clear_Coordinates);
    invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Verified_Location);
    invalidPolylineActions.add(MASystem.Labels.Context_Remove_Marker);

    //perform action if found
    if (frameworkAction) {
        switch (frameworkAction.Action)
        {
            case 'Javascript':

                //build the appropriate lists of objects to act on depending on what was clicked
                var customMarkers = [];
                var favorites = [];
                var records = [];
                var dataLayers = {};
                switch (clickTarger.type)
                {
                    case 'legend':
                        var legendInfo = clickTarger.info;
                        var $plottedLayer = $('[qid="' + legendInfo.qid + '"]');
                        if ($plottedLayer.data('layerType') === 'polyline') foundPolylineLayer = true;
                        var queryData = $plottedLayer.closest('.PlottedRowUnit');
                        if(legendInfo.sectionid) {
                            if(legendInfo.id) {
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (record.legendId === legendInfo.id) {
                                        records.push(record);
                                    }
                                });
                            } else {
                                var lidArray = [];
                                $.each($plottedLayer.find('[data-sectionid="' + legendInfo.sectionid + '"]'), function (rowIndex, row ){
                                    lidArray.push($(row).attr("data-id"));
                                });
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (lidArray.indexOf(record.legendId) > 0) {
                                        records.push(record);
                                    }
                                });
                            }
                        } else {
                            $.each(queryData.data('records'), function (recordId, record) {
                                if (record.legendId === legendInfo.id) {
                                    records.push(record);
                                }
                            });
                        }
                        
                        break;
                    case 'map':

                        if (MA.isMobile) {
                            $('#PlottedQueriesTable .FavoriteRowUnit').each(function (i,row){
                                var marker = $(row).data('marker');
                                if(marker.map != null) {
                                    favorites.push($(row).data('marker'));
                                }
                            });
                        } else {
                            VueEventBus.$emit('get-favorite-markers', function(layerMarkers) {
                                var layerQIDs = Object.keys(layerMarkers);
                                var layerLength = layerQIDs.length;
                                for (var l = 0; l < layerLength; l++) {
                                    var qid = layerQIDs[l];
                                    var layer = layerMarkers[qid] || {};
                                    var markers = layer.markers || [];
                                    markers.forEach(function(marker) {
                                        if(marker.map != null) {
                                            favorites.push(marker);
                                        }
                                    })
                                }
                            });
                        }
                        $('#PlottedQueriesContainer .PlottedRowUnit').each(function() {
                            var $plottedLayer = $(this);

                            if ($plottedLayer.data('layerType') === 'polyline') foundPolylineLayer = true;

                            if($plottedLayer.hasClass('DataLayer')){
                                var markers = $plottedLayer.data('records') || {};
                                var markerKeys = Object.keys(markers);
                                var mI = markerKeys.length;
                                var markerArr = [];
                                while(mI--) {
                                    var markerId = markerKeys[mI];
                                    var record = markers[markerId];
                                    //var markerRowId = record.data.rowid;
                                    var markerRowId = record.data.rowid;
                                    var markerIsVisible = $plottedLayer.find('.legend-row[uid="'+markerRowId+'"] .legend-checkbox-wrapper .MAIcon').hasClass('ion-checkmark-round');
                                    if ((record.isVisible || record.isClustered ) && markerIsVisible) {
                                        markerArr.push(record.clusterMarker);
                                    }
                                }
                                dataLayers[$plottedLayer.attr('uid')] = markerArr;
                                
                            }
                            else {
                                $.each($plottedLayer.data('records'), function (recordId, record) {
                                    if (record.isVisible || record.isClustered || record.isScattered || record.isPolylineVisible) {
                                        records.push(record);
                                    }
                                });
                            }
                        });
                        $.each(MA.Map.Search.markers || [], function (index, poiMarker) {
                            var place = getProperty(poiMarker, 'maData.place', false) || {};
                            customMarkers.push({ type: 'POI', title: place.name || 'My POI', latlng: poiMarker.getPosition(), address: place.formatted_address, place: place });
                        });
                        if (PositionEnabled) {
                            try {
                                customMarkers.push({ type: 'MyPosition', title: 'My Position', latlng: PositionMarker.getPosition(), address: 'My Position' });
                            }
                            catch (err) {}
                        }

                        break;
                    case 'cluster':
                        $.each(clickTarger.target.getMarkers(), function (index, marker) {
                            
                            //grab the record from the dom
                            var tempDataArr;
                            if (dataLayers.hasOwnProperty(marker.qid)) {
                                tempDataArr = dataLayers[marker.qid];
                            } else {
                                dataLayers[marker.qid] = [];
                                tempDataArr = dataLayers[marker.qid];
                            }
                            var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+marker.qid+'"]');
                            if ($plottedQuery.hasClass('DataLayer')) {
                                var clusterRecords = $plottedQuery.data('records');
                                var clusterRecord = clusterRecords[marker.markerId];
                                tempDataArr.push(clusterRecord.clusterMarker);
                            } else {
                                var clusterRecords = $plottedQuery.data('records');
                                var clusterRecord = clusterRecords[marker.record.Id];
                                records.push(clusterRecord);
                            }

                        });
                        break;
                    default:
                        //grab the record from the dom
                        var marker = clickTarger.target;
                        var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+marker.qid+'"]');
                        var queryData = $plottedQuery.data();
                        var queryRecords = queryData.records;
                        var markerRecord = queryRecords[marker.record.Id];
                        if($plottedQuery.hasClass('DataLayer')){
                            dataLayers[$plottedQuery.attr('uid')] = [markerRecord.clusterMarker];
                        } else {
                            records.push(markerRecord);
                        }
                }

                if (foundPolylineLayer && invalidPolylineActions.has(frameworkAction.Label)) {
                    MAToastMessages.showWarning({message:MASystem.Labels.Actions_Not_Supported_For_Polyline,timeOut:5000});
                    return;
                }
                //call the framework action
                frameworkAction.ActionValue.call(this, {
                    records			: records,
                    favorites		: favorites,
                    customMarkers	: customMarkers,
                    dataLayers      : dataLayers,
                    isMassAction	: true
                });
                $('#PlottedQueriesContainer').find('.highlight').removeClass('highlight');
                break;

            case 'NewWindow':
                //check for possible options, let's say records {records}
                //parameters check
                var options = {
                    recString : ''
                };

                switch (clickTarger.type)
                {
                    case 'map':

                        if(frameworkAction.Options.addRecords) {
                            $('#PlottedQueriesContainer .PlottedRowUnit').each(function() {
                                if(!$(this).hasClass('DataLayer')){
                                    $.each($(this).data('records'), function(index, record) {
                                        if (record.isVisible || record.isClustered || record.isScattered) {
                                            options.recString += options.recString == '' ? record.record.Id : ','+record.record.Id;
                                        }
                                    });
                                }
                            });
                        }
                        break;

                    case 'cluster':
                        if(frameworkAction.Options.addRecords) {
                            $.each(clickTarger.target.getMarkers(), function (index, marker) {
                                options.recString += options.recString == '' ? marker.record.Id : ','+marker.record.Id;
                            });
                        }
                        break;

                    default:
                        if(frameworkAction.Options.addRecords) {
                            options.recString += clickTarger.target.record.Id;
                        }

                }

                //is this a post or get request
                var newURL = frameworkAction.ActionValue;
                if(frameworkAction.Options.method == 'GET') {
                    //replace holders with new options
                    if(frameworkAction.Options.addRecords) {
                        newURL = frameworkAction.ActionValue
                            + (frameworkAction.ActionValue.indexOf('?') == -1 ? '?'+frameworkAction.Options.paramName+'=' + options.recString : '?'+frameworkAction.Options.paramName+'=' + options.recString)
                        //newURL = frameworkAction.ActionValue.replace('{records}',options.recString);
                    }
                    window.open(newURL);
                    break;
                }
                else {
                    var postData = {};

                    if(frameworkAction.Options.addRecords) {
                        postData[frameworkAction.Options.paramName] = options.recString
                    }
                    //check if any get parameters are present and send as post as well
                    if(newURL.indexOf('?') > -1) {
                        //loop over params and make post
                        var params = newURL.split('?')[1];
                        //now split on &
                        var paramArr = params.split('&');
                        $.each(paramArr,function(index,pa){
                            var paramParts = pa.split('=');
                            if(paramParts.length == 2) {
                                postData[paramParts[0]] = paramParts[1];
                            }
                            else {
                                //invalid
                                return false;
                            }
                        });
                    }
                    openNewWindow('POST', newURL, postData, '_blank');
                    break;
                }
            case 'LightningOut':
                var options = {
                    recordList : [],
                    label: frameworkAction.Label
                };
                switch (clickTarger.type)
                {
                    case 'legend': {
                        var legendInfo = clickTarger.info;
                        var $plottedLayer = $('[qid="' + legendInfo.qid + '"]');
                        if ($plottedLayer.data('layerType') === 'polyline') foundPolylineLayer = true;
                        var queryData = $plottedLayer.closest('.PlottedRowUnit');
                        if(legendInfo.sectionid) {
                            if(legendInfo.id) {
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (record.legendId === legendInfo.id) {
                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                        options[thisRecord.Id] = {
                                            location: {
                                                lat: getProperty(record,'location.coordinates.lat',false) || null,
                                                lng: getProperty(record,'location.coordinates.lng',false) || null
                                            },
                                            formattedAddress: record.FormattedAddress_MA || '',
                                            recordId: thisRecord.Id
                                        }
                                    }
                                });
                            } else {
                                var lidArray = [];
                                $.each($plottedLayer.find('[data-sectionid="' + legendInfo.sectionid + '"]'), function (rowIndex, row ){
                                    lidArray.push($(row).attr("data-id"));
                                });
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (lidArray.indexOf(record.legendId) > 0) {
                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                        options[thisRecord.Id] = {
                                            location: {
                                                lat: getProperty(record,'location.coordinates.lat',false) || null,
                                                lng: getProperty(record,'location.coordinates.lng',false) || null
                                            },
                                            formattedAddress: record.FormattedAddress_MA || '',
                                            recordId: thisRecord.Id
                                        }
                                    }
                                });
                            }
                        } else {
                            $.each(queryData.data('records'), function (recordId, record) {
                                if (record.legendId === legendInfo.id) {
                                    var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                        options[thisRecord.Id] = {
                                            location: {
                                                lat: getProperty(record,'location.coordinates.lat',false) || null,
                                                lng: getProperty(record,'location.coordinates.lng',false) || null
                                            },
                                            formattedAddress: record.FormattedAddress_MA || '',
                                            recordId: thisRecord.Id
                                        }
                                }
                            });
                        }
                        break;
                    }
                    case 'map':
                        
                        $('#PlottedQueriesContainer .PlottedRowUnit').each(function() {
                            if(!$(this).hasClass('DataLayer')){
                                $.each($(this).data('records'), function(index, record) {
                                    if (record.isVisible || record.isClustered || record.isScattered) {

                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                        options[thisRecord.Id] = {
                                            location: {
                                                lat: getProperty(record,'location.coordinates.lat',false) || null,
                                                lng: getProperty(record,'location.coordinates.lng',false) || null
                                            },
                                            formattedAddress: record.FormattedAddress_MA || '',
                                            recordId: thisRecord.Id
                                        }
                                        
                                    }
                                });
                            }
                        });
                        
                        break;

                    case 'cluster':
                        
                        $.each(clickTarger.target.getMarkers(), function (index, record) {
                            var thisRecord = record.record;
                            options.recordList.push(thisRecord.Id);
                            options[thisRecord.Id] = {
                                location: {
                                    lat: getProperty(record,'location.coordinates.lat',false) || null,
                                    lng: getProperty(record,'location.coordinates.lng',false) || null
                                },
                                formattedAddress: record.FormattedAddress_MA || '',
                                recordId: thisRecord.Id
                            }
                        });
                        
                        break;

                    default:
                        options.recordList.push(clickTarger.target.record.Id);

                }
                if (frameworkAction.ActionValue.indexOf('{records}') >= 0) {
                    options.records = true;
                }
                var actionValue = frameworkAction.ActionValue;

                options.actionValue = actionValue;
                options.qualifiedName = actionValue;
                if (frameworkAction.Options.addRecords) {  
                    options[frameworkAction.Options.paramName] = record.Id;                         
                }
                options.frameworkOptions = frameworkAction.Options;
                options.hideControls = frameworkAction.Options.hideControls;
                launch_custom_action(options);
                break;
            case 'FlowAction':
                var options = {
                    recordList : [],
                    label: frameworkAction.Label
                };
                switch (clickTarger.type)
                {
                    case 'legend': {
                        var legendInfo = clickTarger.info;
                        var $plottedLayer = $('[qid="' + legendInfo.qid + '"]');
                        if ($plottedLayer.data('layerType') === 'polyline') foundPolylineLayer = true;
                        var queryData = $plottedLayer.closest('.PlottedRowUnit');
                        if(legendInfo.sectionid) {
                            if(legendInfo.id) {
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (record.legendId === legendInfo.id) {
                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                    }
                                });
                            } else {
                                var lidArray = [];
                                $.each($plottedLayer.find('[data-sectionid="' + legendInfo.sectionid + '"]'), function (rowIndex, row ){
                                    lidArray.push($(row).attr("data-id"));
                                });
                                $.each(queryData.data('records'), function (recordId, record) {
                                    if (lidArray.indexOf(record.legendId) > 0) {
                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                    }
                                });
                            }
                        } else {
                            $.each(queryData.data('records'), function (recordId, record) {
                                if (record.legendId === legendInfo.id) {
                                    var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                }
                            });
                        }
                        break;
                    }
                    case 'map':
                        
                        $('#PlottedQueriesContainer .PlottedRowUnit').each(function() {
                            if(!$(this).hasClass('DataLayer')){
                                $.each($(this).data('records'), function(index, record) {
                                    if (record.isVisible || record.isClustered || record.isScattered) {
                                        var thisRecord = record.record;
                                        options.recordList.push(thisRecord.Id);
                                    }
                                });
                            }
                        });
                        
                        break;

                    case 'cluster':
                        
                        $.each(clickTarger.target.getMarkers(), function (index, record) {
                            var thisRecord = record.record;
                            options.recordList.push(thisRecord.Id);
                        });
                        
                        break;

                    default:
                        options.recordList.push(clickTarger.target.record.Id);

                }
                options.actionValue = 'maps:MapsFlowDisplay';
                options.qualifiedName = 'maps:MapsFlowDisplay';
                options.bundleName = 'maps:MapsFlowDisplay';
                options.flowDevName = frameworkAction.ActionValue;
                options.label = frameworkAction.Label
                options.hideControls = frameworkAction.Options.hideControls;
                window.launch_custom_action(options);
                break;
            case 'QuickAction':
                var options = {
                    recordList : [],
                    label: frameworkAction.Label
                };
                switch (clickTarger.type)
                {
                    case 'map':
                        
                        $('#PlottedQueriesContainer .PlottedRowUnit').each(function() {
                            if(!$(this).hasClass('DataLayer')){
                                $.each($(this).data('records'), function(index, record) {
                                    if (record.isVisible || record.isClustered || record.isScattered) {
                                        options.recordList.push(record.record.Id);
                                    }
                                });
                            }
                        });
                        
                        break;

                    case 'cluster':
                        
                        $.each(clickTarger.target.getMarkers(), function (index, marker) {
                            options.recordList.push(record.record.Id);
                        });
                        
                        break;

                    default:
                        options.recordList.push(clickTarger.target.record.Id);

                }
                Visualforce.remoting.Manager.invokeAction(MARemoting.CustomActions.performQuickAction,
                    frameworkAction.ActionValue, record.Id,
                function (response, event) {
                    if (response && response.success) {
                        switch(response.actionType) {                            
                            case 'lightning': 
                                options.actionValue = response.bundleName
                                options.qualifiedName = response.qualifiedName
                                options.bundleName = response.bundleName
                                
                                launch_custom_action(options);
                            break;
                            case 'flow':
                                options.actionValue = 'maps:MapsFlowDisplay';
                                options.qualifiedName = 'maps:MapsFlowDisplay';
                                options.bundleName = 'maps:MapsFlowDisplay';
                                options.flowDevName = response.flowDevName;
                                
                                launch_custom_action(options);
                            break;
                        }
                        
                    } else {
                        MAToastMessages.showError({
                            message: response.errorMessage
                        });                            
                    }
                });
                break
            default:
                break;
        }
    }
}

// check if page is being loaded in an iframe
function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
// assign class so that appropriate styles can be applied
if(inIframe()) {
    $("body").addClass("iframeEmbed");
}

/** This function will send usage data to pendo to track user interaction with Maps
 * @param event - the action taken by the user
 * @param data - JSON with information about the action taken by the user
 * trackUsage('Layer Plotted',
 * {
 *     layerType: 'Salesforce Layer'
 * })
 */
function trackUsage(event,data) {
    // append the device information to the data
    var userAgent = navigator.userAgent;
	var isNativeMapsApp = userAgent.match(/salesforcemaps_mobile/i);
    var device = '';
    if (isNativeMapsApp) {
        // hybrid maps app
        device = 'Native Mobile';
    } else if (MA.isMobile && typeof sforce != 'undefined' && sforce.one) {
        // salesforce 1
        device = 'SF Mobile';
    } else if (MA.isMobile) {
        // just using mobile page in a browser
        device = 'Mobile Browser';
    } else {
        device = 'Desktop';
    }
    if (typeof data === 'object') {
        data.device = device;
    } else {
        data = {
            device: device
        };
    }
    try {
        if (!MA.isRunningInSandbox && MASystem.Organization.isPendoEnabled && MASystem.User.Email.indexOf('@salesforce.com') === -1 && MASystem.User.Email.indexOf('@mapanything.com') === -1) {
            try {
                pendo.track(event,data);
            } catch(e){console.log(e)}
        }
    } catch(e){console.log(e)}
}

function buildBrowserWebKit() {
    $.uaMatch = function( ua ) {
        ua = ua.toLowerCase();

        var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
            /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
            /(msie) ([\w.]+)/.exec( ua ) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
            [];

        return {
            browser: match[ 1 ] || "",
            version: match[ 2 ] || "0"
        };
    };

    matched = $.uaMatch( navigator.userAgent );
    //IE 11+ fix (Trident) 
    matched.browser = matched.browser == 'trident' ? 'msie' : matched.browser;
    browser = {};

    if ( matched.browser ) {
        browser[ matched.browser ] = true;
        browser.version = matched.version;
    }

    // Chrome is Webkit, but Webkit is also Safari.
    if ( browser.chrome ) {
        browser.webkit = true;
    } else if ( browser.webkit ) {
        browser.safari = true;
    }

    $.browser = browser;
}
