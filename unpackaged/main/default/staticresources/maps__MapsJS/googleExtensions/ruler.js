/* Ruler */
MA.Map.Ruler = function (options) {
    // Setup Ruler Variables
    this.transitLineColor = '#FF0000';
    this.straightLineColor = '#FF0000';
    this.infoBubble = null;
    this.polyline = null;
    this.waypointArray = [];
    this.$layersTabDOM = null;
    this.directionsDisplay = null;
    this.directionsService = new google.maps.DirectionsService();
    this.infoBubbleOpen = true;
    this.showInfoBubble = true;

    /*
    this.markerColor = 'red';

    if (MA.ruleIndex == 1)      { this.markerColor = 'red'; }
    else if (MA.ruleIndex == 2) { this.markerColor = 'blue'; }
    else if (MA.ruleIndex == 3) { this.markerColor = 'green'; }
    else if (MA.ruleIndex == 4) { this.markerColor = 'yellow'; }
    else if (MA.ruleIndex == 5) { this.markerColor = 'orange'; }
    */

    //Let's add a Layer's tab Item
    //this.$layersTabDOM = $('#templates .RulerRowUnit').clone();
    var me = this;
    me.createDomElement().then(function($rulerLayer) {
        me.$layersTabDOM = $rulerLayer
        me.$layersTabDOM.find('.basicinfo-name').text(window.MASystem.Labels.Layers_On_The_Map_Header_Ruler +' ' + MA.ruleIndex);
        //this.$layersTabDOM.find('.color-box').css('color', this.straightLineColor);
        me.$layersTabDOM.prependTo('#PlottedQueriesTable');

        me.$layersTabDOM.find('.transit-line-color').attr('value', me.transitLineColor);
        me.$layersTabDOM.find('.straight-line-color').attr('value', me.straightLineColor);
        jscolor.init();

        if($('#sidebar-content #tabs-nav-plotted').hasClass('tab-open'))
        {
        //do nothing tab already selected
        }
        else
        {
        //click tab to show results
            $('a[href="#tab-plotted"]').click();
        }

        me.directionsDisplay = new google.maps.DirectionsRenderer({
            suppressInfoWindows: true,
            suppressMarkers: true,
            preserveViewport: true,
            map: MA.map,
            polylineOptions: {
                strokeColor: me.transitLineColor,
                strokeOpacity: 0.7,
                strokeWeight: 5
            }
        });

        // store the center of the map as the position of the click just in case a position wasn't included
        options = $.extend({ position: MA.map.getCenter() }, options);

        me.polyline = new google.maps.Polyline({
            map: MA.map,
            path: [
                options.position,
                options.position
            ],
            strokeColor: me.straightLineColor,
            strokeOpacity: 0.4,
            strokeWeight: 4,
            draggable: false,
            editable: false,
            geodesic: true
        });

        me.$layersTabDOM.on('click','.btn-remove', function () {
            //remove the layer from the layers section
            if (me.infoBubbleOpen) {
                try { me.infoBubble.setMap(null); } catch (err) {}
                me.infoBubbleOpen = false;
            }
            me.remove();

        });


        me.$layersTabDOM.on('click','.button-update', function () {
            me.transitLineColor  = me.$layersTabDOM.find('.transit-line-color').val();
            me.straightLineColor = me.$layersTabDOM.find('.straight-line-color').val();

            me.polyline.setOptions({strokeColor: me.straightLineColor});
            me.directionsDisplay.setOptions({polylineOptions: {strokeColor: me.transitLineColor}});

            //force redraw
            me.directionsDisplay.setMap(MA.map);

        });


        me.$layersTabDOM.on('click','.plotted-visibile-icon',function () {
            $button = $(this);

            //check if the layer is currently visible or not
            if($button.find('span').is('.ma-icon-preview'))
            {
                //hide
                $button.find('span').removeClass('ma-icon-preview').addClass('ma-icon-hide');
                me.polyline.setMap(null);
                me.directionsDisplay.setMap(null);
                $.each(me.waypointArray, function( index, value ) {
                    value.setMap(null);
                });
            }
            else
            {
                //show
                $button.find('span').removeClass('ma-icon-hide').addClass('ma-icon-preview');
                me.polyline.setMap(MA.map);
                me.directionsDisplay.setMap(MA.map);
                $.each(me.waypointArray, function( index, value ) {
                    value.setMap(MA.map);
                });
            }
        })

        me.addMarkers();

        //increment ruleIndex, if it's too high let's restart it at 1
        MA.ruleIndex++;
        if (MA.ruleIndex > 5) { MA.ruleIndex = 1; }
    });
};
$.extend(MA.Map.Ruler.prototype, {
    createDomElement: function() {
        var dfd = $.Deferred();
        // ruler is not supported on mobile
        var qid = new Date().getTime() + 'ruler';
        var options = {
            component: 'RulerLayer',
            qid: qid
        };
        window.VueEventBus.$emit('add-layer', options, function(RulerLayerRef) {
            var $tempLayer = $(RulerLayerRef);
            dfd.resolve($tempLayer);
        });
        return dfd.promise();
    },
    addMarkers: function() {

        //create place holder var, so we don't use "this" in later calls
        var me = this;



        //Remove all the current markers
        $.each(me.waypointArray, function( index, value ) {
            value.setMap(null);
        });

        //Blank the waypointArray
        me.waypointArray = [];

        //loop through all the waypoints and add markers
        me.polyline.getPath().forEach(function(element, index) {

            var marker2Options = {
                map: MA.map,
                position: new google.maps.LatLng(element.lat(),element.lng()),
                draggable: true,
                index: index
            }

            if (index == 0)
            {
                //Start, let's show a green circle here
                marker2Options.icon=
                    {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor:'green',
                        fillOpacity : 1,
                        strokeColor : 'black',
                        strokeWeight : 1,
                        scale: 7
                    };
                marker2Options.type = 'start';
            }
            else if (index == (me.polyline.getPath().getLength() - 1))
            {
                //End, let's show a red marker
                marker2Options.icon=
                    {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor:'red',
                        fillOpacity : 1,
                        strokeColor : 'black',
                        strokeWeight : 1,
                        scale: 7
                    };
                marker2Options.type = 'end';
            }
            else
            {
                //create vertex marker
                marker2Options.icon=
                    {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor:'white',
                        fillOpacity : 1,
                        strokeColor : 'black',
                        strokeWeight : 1,
                        scale: 7
                    };
                marker2Options.type = 'vertex';
            }


            var marker =new google.maps.Marker(marker2Options);

            if (index == (me.polyline.getPath().getLength() - 1) && me.showInfoBubble == true)
            {
                me.infoBubble = new InfoBubble({
                    position: new google.maps.LatLng(element.lat(),element.lng()),
                    content: "<center>" + MASystem.Labels.MA_Please_Drag_The_Red_Marker_To_Begin + "</center>",
                    hideCloseButton: true,
                    disableAutoPan: true
                });
                me.infoBubble.open(MA.map, marker);
                me.showInfoBubble = false;
            }



            google.maps.event.addListener(marker, 'drag', function () { me.redraw(); });
            google.maps.event.addListener(marker, 'dragend', function () { me.dragend(); });
            google.maps.event.addListener(marker, 'dragstart', function () { me.dragstart(this); });

            if (marker2Options.type == 'vertex')
            {
                google.maps.event.addListener(marker, 'dblclick', function () {

                    var markerClicked = this;
                    markerClicked.setMap(null);

                    var TempArray = [];

                    //Remove all the midpoints
                    $.each(me.waypointArray, function( index, value ) {

                        if (value.type == 'midpoint')
                        {
                            value.setMap(null);
                        }
                        else if (value.index == markerClicked.index)
                        {
                            value.setMap(null);
                        }
                        else
                        {
                            TempArray.push(value);
                        }


                    });



                    me.waypointArray = [].concat(TempArray);

                    me.redraw();
                    me.addMarkers();
                    me.getWaypointLocations();

                });
            }

            me.waypointArray.push(marker);


            if ((index + 1) < me.polyline.getPath().getLength())
                {
                    var StartOfSegment = new google.maps.LatLng(element.lat(),element.lng());
                    var EndOfSegment = new google.maps.LatLng(me.polyline.getPath().getAt(index+1).lat(),me.polyline.getPath().getAt(index+1).lng());

                    var MidpointOfSegment = google.maps.geometry.spherical.interpolate(StartOfSegment, EndOfSegment, 0.5);

                    var marker3Options = {
                        map: MA.map,
                        position: MidpointOfSegment,
                        draggable: true,
                        index: (index + 0.5),
                        type: 'midpoint'
                    };
                    marker3Options.icon=
                        {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor:'white',
                            fillOpacity : 0.60,
                            strokeColor : 'black',
                            strokeWeight : 1,
                            scale: 5
                        };

                    var marker2 =new google.maps.Marker(marker3Options);

                    google.maps.event.addListener(marker2, 'drag', function () {

                        this.type = 'vertex';

                        me.redraw();
                    });
                    google.maps.event.addListener(marker2, 'dragend', function (e) { me.dragend(e); });

                    google.maps.event.addListener(marker2, 'dragstart', function (e) { me.dragstart(this); });

                    me.waypointArray.push(marker2);

                }

        });

    },
    redraw: function () {
        /*
        var distance = MA.Util.formatDistance(google.maps.geometry.spherical.computeDistanceBetween(this.marker1.getPosition(), this.marker2.getPosition()));
        this.poly.setPath([this.marker1.getPosition(), this.marker2.getPosition()]);

        this.$rulerLayer.find('.info-distance').text(distance);
        */

        var pathArray = [];

        $.each(this.waypointArray, function( index, value ) {

            if (value.type != 'midpoint')
            {
                pathArray.push(value.getPosition());
            }


        });


        this.polyline.setPath(pathArray);

    },
    dragstart: function () {
        /*
        this.$rulerLayer.find('.info-start').text('Drop Pin to Show');
        this.$rulerLayer.find('.info-end').text('Drop Pin to Show');
        this.$rulerLayer.find('.info-drive').text('Drop Pin to Show');
        */
        if (this.infoBubbleOpen)
        {
             try { this.infoBubble.setMap(null); } catch (err) {}
             this.infoBubbleOpen = false;
        }


        this.changeDisplayStatus(3);
    },
    dragend: function () {

          this.addMarkers();
          this.getWaypointLocations();



    },
    getWaypointMeasurements: function() {
        var me = this;
        var totalDistance = 0;
        // grab the row
        var pointsToMeasure = me.waypointArray;
        // need to combine 3 points into 1 segment (basically joining the middle point to make 1 long point => start ------ middle ------ end)
        var segmentLengthInMeters = 0;
        var segmentIndex = 1;
        var rowIndex = 1;
        for (var i = 0; i < pointsToMeasure.length - 1; i++) {
            var startPoint = pointsToMeasure[i];
            var endPoint = pointsToMeasure[i + 1];
            var StraightLineDistanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(startPoint.getPosition(), endPoint.getPosition());
            segmentLengthInMeters += StraightLineDistanceInMeters;
            if (segmentIndex === 2) {
                var $waypointRow = me.$layersTabDOM.find('.ruler-waypoint-row[data-row="'+rowIndex+'"]');
                rowIndex++;
                $waypointRow.find('.ruler-waypoint-row-straight-info').html(MA.Util.formatDistance(segmentLengthInMeters));
                segmentIndex = 0;
                segmentLengthInMeters = 0;
            }
            segmentIndex++
            totalDistance += StraightLineDistanceInMeters;
        }
        me.$layersTabDOM.find('.info-distance').html(MA.Util.formatDistance(totalDistance));
    },
    getWaypointLocations: function()
    {
        //create place holder var, so we don't use "this" in later calls
        var me = this;

        me.changeDisplayStatus(5);



        me.directionsDisplay.setMap(null);

        var waypoints = [];

        $.each(me.waypointArray, function( index, value ) {

            if (value.type != 'midpoint' && value.type !='start' && value.type !='end')
            {
                waypoints.push({
                    location: value.getPosition()
                });

            }
        });

        var request = {
            origin: me.waypointArray[0].getPosition(),
            destination: me.waypointArray[me.waypointArray.length-1].getPosition(),
            travelMode: google.maps.TravelMode.DRIVING,
            waypoints: waypoints,
            durationInTraffic: true
        };

        var TotalDistanceInMeters = 0;
        var TotalTimeInSeconds = 0;
        var TotalTimeWithTrafficInSeconds = 0;
        var TotalStraightLineDistanceInMeters = 0;

        me.directionsService.route(request, function(response, status) {

            if (status == google.maps.DirectionsStatus.OK)
            {

                me.directionsDisplay.setDirections(response);
                me.directionsDisplay.setMap(MA.map);

                var waypointHTML = '';
                var totalLegs = response.routes[0].legs.length;

                $.each(response.routes[0].legs, function( index, value ) {

                    if (index == 0)
                    {
                        var $waypointStartRow = $('#templates .ruler-start-waypoint-row').clone().addClass('ruler-waypoint-start');
                        $waypointStartRow.find('.ruler-waypoint-row-address').html(htmlEncode(value.start_address));
                        waypointHTML += $waypointStartRow[0].outerHTML;
                    }


                    var DirveDistanceInMeters = value.distance.value;
                    var DriveTimeInSeconds = value.duration.value;
                    var DriveTimeInSecondsWithTraffic = value.duration_in_traffic != null ? value.duration_in_traffic.value : 0;

                    var totalNormalTime = me.formatDriveTimeLabel(DriveTimeInSeconds, true);
                    var totalTrafficTime = me.formatDriveTimeLabel(DriveTimeInSecondsWithTraffic, false);

                    if(DriveTimeInSecondsWithTraffic != 0 && DriveTimeInSecondsWithTraffic > DriveTimeInSeconds)
                    {
                        //var TimeStr = '<span style="color: #E54E4E;font-weight: bold;">'+ totalTrafficTime + ' with traffic </span>(' + totalNormalTime +  ' normally)';
                        var TimeStr = '<span style="color: #E54E4E;font-weight: bold;">'+ totalTrafficTime + '</span><br/><span class="info-drive-no-traffic">' + totalNormalTime +  '</span>';
                    }
                    else
                    {
                        var TimeStr = totalNormalTime;
                    }

                    var $waypointRow = $('#templates .ruler-waypoint-row').clone().addClass( ((index+1) == totalLegs) ?  'ruler-waypoint-end' : 'ruler-waypoint-midpoint').attr('data-row', index + 1);
                    $waypointRow.find('.ruler-waypoint-row-drive-info').html(MA.Util.formatDistance(DirveDistanceInMeters) + ' &bull; ' + TimeStr);
                    $waypointRow.find('.ruler-waypoint-row-address').html(htmlEncode(value.end_address));
                    waypointHTML += $waypointRow[0].outerHTML;


                    //Add to totals

                    //Driving Totals
                    TotalDistanceInMeters += DirveDistanceInMeters;
                    TotalTimeInSeconds += DriveTimeInSeconds;
                    TotalTimeWithTrafficInSeconds += DriveTimeInSecondsWithTraffic;
                });

                var totalNormalTime = me.formatDriveTimeLabel(TotalTimeInSeconds, true);
                var totalTrafficTime = me.formatDriveTimeLabel(TotalTimeWithTrafficInSeconds, false);


                //display traffic info if needed
                if(TotalTimeWithTrafficInSeconds != 0 && TotalTimeWithTrafficInSeconds > TotalTimeInSeconds)
                {
                    totalTimeStr = '<span style="color: #E54E4E;font-weight: bold;">'+ totalTrafficTime + '</span><br/><span class="info-drive-no-traffic">' + totalNormalTime +  '</span>';
                }
                else {
                    totalTimeStr = totalNormalTime;
                }

                me.$layersTabDOM.find('.info-drive').html(MA.Util.formatDistance(TotalDistanceInMeters) + ' &bull; ' + totalTimeStr);



                me.$layersTabDOM.find('.info-waypoints').html(waypointHTML);
                // get the straight line measurements
                me.getWaypointMeasurements();
                me.changeDisplayStatus(1);
            }
            else
            {
                me.changeDisplayStatus(4);
            }
        });

    },
    formatDriveTimeLabel: function(seconds, showNoTraffic) {
        let timeLabel = '';
        const totalHours = Math.floor(seconds / 3600);
        const totalMinutes = Math.floor((seconds - (totalHours * 3600)) / 60);

        if (showNoTraffic) {
            if (totalHours === 0) {
                timeLabel = totalMinutes ===1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_No_Hour_Singular_Minute_No_Traffic) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_No_Hour_Multiple_Minutes_No_Traffic, [totalMinutes]);
            } else {
                if (totalHours === 1) {
                    timeLabel = totalMinutes === 1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Singular_Hour_Singular_Minute_No_Traffic) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Singular_Hour_Multiple_Minutes_No_Traffic, [totalMinutes]);
                } else {
                    timeLabel = totalMinutes === 1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plural_Hour_Singular_Minute, [totalHours]) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Multiple_Hours_Multiple_Minutes_No_Traffic, [totalHours, totalMinutes]);
                } 
            }
        } else {
            if (totalHours === 0) {
                timeLabel = totalMinutes ===1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_No_Hour_Singular_Minute) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_No_Hour_Multiple_Minutes, [totalMinutes]);
            } else {
                if (totalHours === 1) {
                    timeLabel = totalMinutes === 1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Singular_Hour_Singular_Minute) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Singular_Hour_Multiple_Minutes, [totalMinutes]);
                } else {
                    timeLabel = totalMinutes === 1 ? window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plural_Hour_Singular_Minute, [totalHours]) : window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Multiple_Hours_Multiple_Minutes, [totalHours, totalMinutes]);
                } 
            }
        }

        return timeLabel;
    },
    remove: function () {
        //this.label1.setMap(null);
        //this.label2.setMap(null);
        try
        {
            // dom removal handled by vue now
            // this.$layersTabDOM.remove();
            this.polyline.setMap(null);
            this.directionsDisplay.setMap(null);
            $.each(this.waypointArray, function( index, value ) {
                value.setMap(null);
            });
        }
        catch (rulerRemoveEx)
        {
            console.warn(rulerRemoveEx);
        }
    },
    changeDisplayStatus: function(i)
    {
        //hide all warning windows
        this.$layersTabDOM.find('.info-success, .info-warning-start, .info-warning-dragging, .info-warning-invalid-points, .info-warning-calculating').hide();

        if (i == 1)
        {
            this.$layersTabDOM.find('.info-success').show();
        }
        else if (i == 2)
        {
            this.$layersTabDOM.find('.info-warning-start').show();
        }
        else if (i == 3)
        {
            this.$layersTabDOM.find('.info-warning-dragging').show();
        }
        else if (i == 4)
        {
            this.$layersTabDOM.find('.info-warning-invalid-points').show();
        }
        else if (i == 5)
        {
            this.$layersTabDOM.find('.info-warning-calculating').show();
        }
    }
});