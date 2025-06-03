/* Shape Manager */
MA.Map.ShapeManager = function () {
    this.shapes = [];
    this.latLngs = [];
};
$.extend(MA.Map.ShapeManager.prototype, {
    addLayer: function (layer) {
        if (layer instanceof google.maps.Data || layer instanceof google.maps.Data.Feature) {
            var me = this;
            function addGeometry (geometry) {
                switch (geometry.getType()) {
                    case 'Polygon':
                        var outerWinding;
                        for (var i = 0; i < geometry.getLength(); i++) {
                            var path = geometry.getAt(i).getArray();
                            var winding = findPolygonWinding(path);
                            if (i == 0) {
                                outerWinding = winding;
                            }
                            if (winding == outerWinding) {
                                var shape = {
                                    type: 'data',
                                    boundary: new google.maps.Polygon({ paths: path }),
                                    holes: []
                                };
                                for (var j = i+1; j < geometry.getLength(); j++) {
                                    path = geometry.getAt(j).getArray();
                                    winding = findPolygonWinding(path);
                                    if (winding == outerWinding) {
                                        i = j - 1;
                                        break;
                                    
                                    }
                                    shape.holes.push(new google.maps.Polygon({ paths: path }));
                                }
                                me.shapes.push(shape);
                            }
                        }
                        break;
                    case 'MultiPolygon':
                        geometry.getArray().forEach(function (g) { addGeometry(g); });
                        break;
                }
            }

            //add the geometry for this feature (or each feature if this is a data layer)
            if (layer instanceof google.maps.Data) {
                layer.forEach(function (feature) {
                    if (feature.getGeometry()) {
                        addGeometry(feature.getGeometry());
                    } else {
                        var badFeatureName = feature.maData ? feature.maData.label : feature.getId() ? feature.getId()  : 'layer';
                        MA.log('Invalid feature geometry for \'' + badFeatureName + '\'');
                    }
                });
            }
            else {
                addGeometry(layer.getGeometry());
            }
        }
        else if (layer instanceof google.maps.Circle) {
            this.shapes.push({ type: 'circle', boundary: layer });
        }
        else if (layer instanceof google.maps.Polygon) {
            this.shapes.push({ type: 'polygon', boundary: layer });
        }
        else if (layer instanceof google.maps.Rectangle) {
            this.shapes.push({ type: 'rectangle', boundary: layer });
        }
        else if (layer instanceof google.maps.LatLng) {
            this.latLngs.push(layer);
        }
        else {
            MA.log('Invalid layer type');
        }
        return this;
    },
    containsLatLng: function (latLng) {
        var inShapes = false;
        $.each(this.shapes, function (i, shape)
        {
            //check if the record falls within this boundary
            switch (shape.type) {
                case 'data':

                    if (google.maps.geometry.poly.containsLocation(latLng, shape.boundary))
                    {
                        //it does, so now check to make sure it doesn't fall within any of the holes
                        var inHole = false;
                        $.each(shape.holes, function (i, hole) {
                            if (google.maps.geometry.poly.containsLocation(latLng, hole)) {
                                inHole = true;
                                return false;
                            }
                        });

                        //if it's not in a hole then this is a hit and we can include this record and move on
                        if (!inHole) {
                            inShapes = true;
                            return false;
                        }
                    }

                break;
                case 'polygon':

                    if (google.maps.geometry.poly.containsLocation(latLng, shape.boundary)) {
                        inShapes = true;
                    }

                break;
                case 'rectangle':

                    if (shape.boundary.getBounds().contains(latLng)) {
                        inShapes = true;
                    }

                break;
                case 'circle':

                    if (google.maps.geometry.spherical.computeDistanceBetween(latLng, shape.boundary.getCenter()) <= shape.boundary.getRadius()) {
                        inShapes = true;
                    }

                break;
            }
        });

        return inShapes;
    },
    hasShapes: function () {
        return this.shapes.length > 0;
    },
    getDistant: function (cpt, bl) {
        var vY = bl[1].lat() - bl[0].lat(), vX = bl[0].lng() - bl[1].lng();
        return (vX * (cpt.lat() - bl[0].lat()) + vY * (cpt.lng() - bl[0].lng()));
    },
    findMostDistantPointFromBaseLine: function (baseLine) {
        var maxD = 0, maxPt = null, newPoints = [], i, pt, d;
        for (i = this.latLngs.length - 1; i >= 0; i--) {
            pt = this.latLngs[i];
            d = this.getDistant(pt, baseLine);
            if (d > 0) {
                newPoints.push(pt);
            } else {
                continue;
            }

            if (d > maxD) {
                maxD = d;
                maxPt = pt;
            }
        }

        return { maxPoint: maxPt, newPoints: newPoints };
    },
    buildConvexHull: function (baseLine) {
        var convexHullBaseLines = [];
        var t = this.findMostDistantPointFromBaseLine(baseLine, this.latLngs);
        if (t.maxPoint) {
            convexHullBaseLines = convexHullBaseLines.concat(this.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints));
            convexHullBaseLines = convexHullBaseLines.concat(this.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints));
            return convexHullBaseLines;
        }
        else {
            return [baseLine[0]];
        }
    },
    getConvexHull: function () {
        var maxLat = false, minLat = false, maxPt = null, minPt = null, i;
        for (i = this.latLngs.length - 1; i >= 0; i--) {
            var pt = this.latLngs[i];
            if (maxLat === false || pt.lat() > maxLat) {
                maxPt = pt;
                maxLat = pt.lat();
            }
            if (minLat === false || pt.lat() < minLat) {
                minPt = pt;
                minLat = pt.lat();
            }
        }
        return [].concat(this.buildConvexHull([minPt, maxPt]), this.buildConvexHull([maxPt, minPt]));
    }
});

MA.Map.hitTestShapeMgr = new MA.Map.ShapeManager();

/* Label */
MA.Map.Label = function (options) {
    this.setValues(options);

    var span = this.span_ = document.createElement('span');
    span.style.cssText = 'position: relative; left: 0%; top: 0px; white-space: nowrap; border: 0px; border-radius: 6px; color: #FFF; font-family:arial; font-weight:bold; padding: 5px 8px; background-color: #000; opacity: .75; filter: alpha(opacity=75); -ms-filter: "alpha(opacity=75)"; -khtml-opacity: .75; -moz-opacity: .75;';

    var div = this.div_ = document.createElement('div');
    div.appendChild(span);
    div.style.cssText = 'position: absolute; z-index: 30; display: none; -webkit-transform: translateZ(0px);';

    this.bindTo('position', options.bindPositionTo, 'position');
};
MA.Map.Label.prototype = $.extend(new google.maps.OverlayView, {
    onAdd: function () {
        var pane = this.getPanes().overlayLayer;
        pane.appendChild(this.div_);

        // Ensures the label is redrawn if the text or position is changed.
        var me = this;
        this.listeners_ = [
            google.maps.event.addListener(this, 'position_changed', function() { me.draw(); }),
            google.maps.event.addListener(this, 'text_changed', function() { me.draw(); })
        ];
    },
    onRemove: function () {
        this.div_.parentNode.removeChild(this.div_ );

        // Label is removed from the map, stop updating its position/text.
        for (var i = 0, I = this.listeners_.length; i < I; ++i) {
            google.maps.event.removeListener(this.listeners_[i]);
        }
    },
    draw: function () {
        var position = this.getProjection().fromLatLngToDivPixel(this.get('position'));

        var div = this.div_;
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
        div.style.display = 'block';

        this.span_.innerHTML = this.get('text').toString();
    }
});