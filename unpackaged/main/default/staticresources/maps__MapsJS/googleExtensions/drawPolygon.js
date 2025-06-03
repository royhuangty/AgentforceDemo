/* Draw Polygon (mobile) */
MA.Map.DrawPolygon = function (options) {
    var me = this;
    me.straightLineColor = '#000000'
    me.drawMarkers = [];
    me.lines = [];
    me.pointOrder = [];
    me.polygon = null;
    me.mapListener = null;
    me.setListener = null;
    me.insertListener = null;
    me.done = options.done;

    // create map click listener for creating a new marker
    me.init();
}
$.extend(MA.Map.DrawPolygon.prototype, {
    addMarker: function(event) {
        var me = this;
        var latLng = event.latLng;
        var currentMarkers = me.drawMarkers;
        if (latLng) {
            var markerColor = 'green';
            if (currentMarkers.length === 0) {
                // start marker
                markerColor = 'red';
            }
            var tempMarker = new google.maps.Marker({
                position: latLng,
                map: MA.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: markerColor,
                    fillOpacity : 1,
                    strokeColor : 'black',
                    strokeWeight : 1,
                    scale: 7
                }
            });
            // if this is our first marker, add a listener to finish drawing
            if (me.drawMarkers.length === 0) {
                tempMarker.addListener('click', function(e) {
                    // if we do not have more than 1 marker, show warning
                    var markerLength = me.drawMarkers.length;
                    if (markerLength === 1) {
                        // do nothing
                    } else {
                        me.buildPolygon();
                    }
                });
            }

            me.drawMarkers.push(tempMarker);

            if (me.drawMarkers.length > 1) {
                var lastTwo = [me.drawMarkers[me.drawMarkers.length-1].getPosition(), me.drawMarkers[me.drawMarkers.length-2].getPosition()];
                me.lines.push(new google.maps.Polyline({
                    path: lastTwo,
                    map: MA.map,
                    strokeColor : 'black',
                    strokeWeight : 2,
                    scale: 7
                }));
            }

            // me.pointOrder.push(latLng);
        }
    },
    init: function() {                                                                                                                                                                                     
        var me = this;
        
        me.toggleDrawingMode(true);
    },
    rollback: function() {
        var me = this;

        if (me.polygon) {
            me.polygon.setMap(null);
            me.polygon = null;
        } 
        else {
            if (me.drawMarkers.length != me.lines.length && me.drawMarkers.length > 0) {
                me.drawMarkers[me.drawMarkers.length-1].setVisible(false);
                me.drawMarkers[me.drawMarkers.length-1].setMap(null);
                me.drawMarkers.pop();
            }

            if (me.lines.length > 0) {
                me.lines[me.lines.length-1].setVisible(false);
                me.lines[me.lines.length-1].setMap(null);
                me.lines.pop();
            }
        }

        me.toggleDrawingMode(true);
    },
    toggleEditMode: function(enable) {
        var me = this;
        enable = enable === true ? true : false;

        var path;

        if (me.polygon) {
            me.polygon.setOptions({ 'editable': enable });
            path = me.polygon.getPath();
        }

        if (enable) {
            try {
                MA.map.setOptions({ draggableCursor : "default" });
            } catch (e) {}
            // set up listeners to update 
            if (path) {
                 me.setListener = path.addListener('set_at', function(e) {
                    var pointToAdd = me.getEditCoordinates(e);
                    me.updatePoints(pointToAdd, e);
                });

                me.insertListener = path.addListener('insert_at', function(e) {
                    var pointToAdd = me.getEditCoordinates(e);
                    me.updatePoints(pointToAdd, e);
                });
            }
        } else {
            google.maps.event.removeListener(me.setListener);
            google.maps.event.removeListener(me.insertListener);
            try {
                MA.map.setOptions({ draggableCursor : "url("+MASystem.Images.cursors.hand+"), auto" });
            } catch(e) {}
        }
    },
    toggleDrawingMode: function(enable) {
        var me = this;
        google.maps.event.removeListener(me.mapListener);

        if (enable) {
            try {
                MA.map.setOptions({ draggableCursor : "default" });
            } catch (e) {}

            VueEventBus.$bus.$emit('disable-long-press', true);
            // longpress.disabled = true;

            me.mapListener = MA.map.addListener('click', function(event) {
                me.addMarker(event);
            });
        }
        else {
            try {
                MA.map.setOptions({ draggableCursor : "url("+MASystem.Images.cursors.hand+"), auto" });
            } catch(e) {}

            google.maps.event.removeListener(me.mapListener);
            VueEventBus.$bus.$emit('disable-long-press', false);
            // longpress.disabled = false;
        }
    },
    updatePoints: function(latLng, pointLocation) {
        var me = this;
        me.pointOrder.push(latLng);
        // update points
        var path = me.polygon.getPath();
        var markerArr = path.getArray();
        me.drawMarkers = [];
        for (var i = 0; i < markerArr.length; i++) {
            var point = markerArr[i];
            var tempMarker = new google.maps.Marker({
                position: point,
                map: null,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor:'green',
                    fillOpacity : 1,
                    strokeColor : 'black',
                    strokeWeight : 1,
                    scale: 7
                }
            });
            me.drawMarkers.push(tempMarker);
        }
    },
    getEditCoordinates: function(pathLocation) {
        var me = this;
        var path = me.polygon.getPath();
        var pathLen = path.length;
        return path.getAt(pathLocation);
    },
    finishDrawing: function() {
        var me = this;

        me.toggleEditMode(false);
        me.toggleMarkers(false);
        me.toggleLines(false);
        me.drawShapeLayer();

        me.toggleDrawingMode(false);

        if (me.done) {
            me.done();
        }

        me.lines = [];
        me.drawMarkers = [];
        me.lines = [];
        me.pointOrder = [];
        // me.polygon = null;
        me.mapListener = null;
        me.setListener = null;
        me.insertListener = null;

        me.done = null;          
    },
    drawShapeLayer: function() {
        var me = this;
        var $loadingMsg = MAToastMessages.showLoading({message:'Drawing shape layer...',timeOut:0,extendedTimeOut:0});
        var qid = moment().format('x') + '_shape';
        me.polygon.addListener('click', function (e) {
            proximityLayer_Click({
                position: e.latLng,
                type: 'shape',
                custom: true,
                qid: qid,
                shape: this
            });
        });

        var plotOptions = {
            action: 'plot-shape',
            type: 'shape',
            name: 'Custom',
            custom: true,
            qid: qid,
            shapeType: 'polygon',
            shape: me.polygon,
            isCustom: true,
            description: 'Custom drawn shape'
        };
        if (MA.isMobile) {
            MA_DrawShapes.init(plotOptions).always(function() {
                MAToastMessages.hideMessage($loadingMsg);
                MAToastMessages.showSuccess({message:'Done', timeOut:5000,extendedTimeOut:0});
            });
        } else {
            MALayers.processLayerAction(plotOptions)
            .then(function(res) {
                qid = res ? res.qid : qid;
            }).always(function(res) {
                MAToastMessages.hideMessage($loadingMsg);
                MAToastMessages.showSuccess({message:'Done', timeOut:5000,extendedTimeOut:0});
            });
        }
    },
    toggleMarkers: function(showMarkers) {
        showMarkers = showMarkers === true ? true : false;
        var me = this;
        var markers = me.drawMarkers;
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            if (showMarkers) {
                marker.setMap(MA.map);
                marker.setVisible(true);
            } else {
                marker.setVisible(false);
            }
        }
    },
    toggleLines: function(showLines) {
        var me = this;

        me.lines.forEach(function(line) {
            if (showLines) {
                line.setMap(MA.map);
                line.setVisible(true);
            } else {
                line.setVisible(false);
            }
        });
    },
    buildPolygon: function() {
        var me = this;

        me.polygon = new google.maps.Polygon({
            path: this.drawMarkers.map(function(marker) { return marker.getPosition(); }),
            scale: 7,
            label: 'Custom',
            strokeColor: this.straightLineColor,
            strokeOpacity: 0.4,
            strokeWeight: 4,
            draggable: false,
            editable: false,
            fillColor: '#22CC22',
            fillOpacity: 0.35,
            suppressUndo: true
        });

        me.polygon.setMap(MA.map);

        me.toggleDrawingMode(false);
    },
    getPolygon: function() {
        return this.polygon;
    },
    remove: function() {
        var me = this;

        // longpress.disabled = false;
        VueEventBus.$bus.$emit('disable-long-press', false);

        me.toggleEditMode(false);
        
        if (me.polygon) {
            me.polygon.setVisible(false);
            me.polygon.setMap(null);
            me.polygon = null;
        }

        me.toggleMarkers(false);
        me.toggleLines(false);

        me.drawMarkers = [];
        me.lines = [];
        me.pointOrder = [];

        me.toggleDrawingMode(false);

        if (me.done) {
            me.done();
        }
    }
});