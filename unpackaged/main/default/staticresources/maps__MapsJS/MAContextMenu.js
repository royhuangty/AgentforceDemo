/********************************
 *   Setup Context Menus
 ********************************/
$(function () {
    /* Map Items (i.e. markers, clusters, shapes) */
    $.contextMenu({
        selector: '#mapdiv',
        build: function($trigger, e) {

            //start building the menu items by adding a header (the text of this header will change depending on what this context menu is for, but we need to add it now so it appears first)
            var menuItems = {
                header: { name: '', className: 'header', disabled: true },
                massActions: { name: MASystem.Labels.Context_Mass_Actions, items: {} }
            };

            //if mass actions are available, build a submenu for them.  otherwise, put a placeholder
            if(userSettings.ButtonSetSettings.massActionLayout && userSettings.ButtonSetSettings.massActionLayout.length > 0)
            {
                //loop over sections
                $.each(userSettings.ButtonSetSettings.massActionLayout, function (sectionIndex, section)
                {
                    //add a header for this section
                    menuItems['massActions'].items['folder'+sectionIndex] = { name: section.Label, className: 'header', disabled: true };

                    //loop over buttons and add an item for each
                    $.each(section.Buttons, function (buttonIndex, button) {

                        //find the definition of this button in the action framework
                        var buttonDefinition = {};
                        if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
                            $.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);
                        }
                        else if (MAActionFramework.standardActions[button.Action || button.Label]) {
                            $.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
                        }
                        else {
                            return;
                        }

                        //create a menu item
                        menuItems['massActions'].items['button'+buttonIndex+'~~'+buttonDefinition.Type+'~~'+button.Label] = {
                            name: buttonDefinition.Label,
                            className: 'massbutton',
                            callback: function () {
                                if (ContextMenuClick.type == 'map') {
                                    massActionClick(button.Action || button.Label, button.Type);
                                }
                                else if (ContextMenuClick.type == 'shape' || ContextMenuClick.type == 'arcpolygon') {
                                    massActionShapeClick(ContextMenuClick.target, button.Action || button.Label, button.Type);
                                }
                                else {
                                    massActionClick(button.Action || button.Label, button.Type);
                                }
                            }
                        };
                    });
                });
            }
            else {
                menuItems['massActions'].items['none'] = { name: MASystem.Labels.Context_No_Mass_Actions, disabled: true };
            }
            //add appropriate items based on what type of item was clicked
            switch (ContextMenuClick.type)
            {
                case 'map':

                    //header
                    menuItems.header.name = MASystem.Labels.Context_Map_Options;

                    //enable/disable ruler
                    menuItems.addruler = {
                        name: MASystem.Labels.MA_ADD_RULER,
                        className: 'massbutton',
                        callback: function () {
                            new MA.Map.Ruler({ position: ContextMenuClick.latlng });
                        }
                    };

                    //center map here
                    menuItems.center = {
                        name: MASystem.Labels.Context_Center_Map_Here,
                        className: 'massbutton',
                        callback: function () {
                            MA.map.panTo(ContextMenuClick.latlng);
                        }
                    };
                    
                    menuItems.center = {
                        name: MASystem.Labels.MA_DROP_PIN,
                        className: 'massbutton',
                        callback: function () {
                            c2c.C2CDropPin(ContextMenuClick.latlng);
                        }
                    };

                    //center map here
                    menuItems.mapEnableStretView = {
                        name: MASystem.Labels.MA_STREET_VIEW,
                        className: 'massbutton',
                        callback: function () {
                            MA.map.panTo(ContextMenuClick.latlng);

                            var radius = 50; //meters


                            //Find closed point that has street view

                            new google.maps.StreetViewService().getPanoramaByLocation(ContextMenuClick.latlng, radius, function (data1, status1) {


                                if (status1 == google.maps.StreetViewStatus.OK)
                                {
                                    //return data.location.latLng;

                                    MA.Map.InfoBubble.hide();
                                    MA.map.getStreetView().setOptions({ position: data1.location.latLng, visible: true });
                                }
                                else
                                {
                                    //Try again with a larger radius
                                    radius = radius * 2;

                                    new google.maps.StreetViewService().getPanoramaByLocation(ContextMenuClick.latlng, radius, function (data2, status2) {

                                        if (status2 == google.maps.StreetViewStatus.OK)
                                        {
                                            MA.Map.InfoBubble.hide();
                                            MA.map.getStreetView().setOptions({ position: data2.location.latLng, visible: true });
                                        }
                                        else
                                        {
                                            //Try again with a larger radius
                                            radius = radius * 2;

                                            new google.maps.StreetViewService().getPanoramaByLocation(ContextMenuClick.latlng, radius, function (data3, status3) {

                                                if (status3 == google.maps.StreetViewStatus.OK)
                                                {
                                                    MA.Map.InfoBubble.hide();
                                                    MA.map.getStreetView().setOptions({ position: data3.location.latLng, visible: true });
                                                }
                                                else
                                                {
                                                    alert('Not Available');
                                                }


                                            });
                                        }


                                    });

                                }

                            }); //end google.maps.StreetViewService().getPanoramaByLocation


                        }
                    };

                    //refresh visible area
                    if($('#PlottedQueriesTable .visibleOnly').length !== 0) {
                        menuItems.refresh = { 
                            name: "Refresh in this area",
                            className: 'massbutton',
                            callback: function () {
                                //remove ready class until finished and update text
                                $('#visibleAreaRefeshMap').removeClass('ready update').addClass('refreshing');
                                $('.visibleAreaRefreshMapText').text('Refresh layers in this area');
                                $('.visibleAreaRefreshMapText').text(MASystem.Labels.Context_Map_Refreshing);

                                //loop over queries and check if we need
                                var refreshIndex = 0;
                                var visibleIndex = $('#PlottedQueriesContainer .visibleOnly').length;

                                //add loading to all that need to be update
                                $('#PlottedQueriesContainer .visibleOnly').addClass('visibleLoading');

                                //batch the visiblOnly queries
                    			var q = async.queue(function (options, callback) {
                    			    if(options.isDataLayer) {
                    			    	var dlOptions = {};
                    			        MADemographicLayer.refreshDataLayer(options.pq,dlOptions,function(res) {
                    			            options.pq.removeClass('visibleLoading');
                    			            callback({success:true,data:options});
                    			        });
                    			    }
                    			    else {
                    			        Plotting.refreshQuery(options.pq).then(function(res) {
                    			            options.pq.removeClass('visibleLoading');
                    			            callback({success:true,data:options});
                    			        });
                    			    }
                    			});
                    			
                    			//loop over the visibleOnly queries and add to que
                    			$('.PlottedRowUnit.visibleOnly').each(function(i,row) {
                    			    var opt = {
                    			        pq : $(row),
                    			        isDataLayer : $(row).hasClass('DataLayer')
                    			    }
                    			    q.push(opt,function(res){});
                    			});
                    			
                    			q.drain = function(){
                                    if($('#visibleAreaRefeshMap').hasClass('update')) {
                                        $('#visibleAreaRefeshMap').removeClass('refreshing update').addClass('ready');
                                        $('.visibleAreaRefreshMapText').text('Refresh layers in this area');
                                    }
                                    else {
                                        //map has not moved show finished
                                        $('#visibleAreaRefeshMap').removeClass('refreshing').addClass('finished');
                                        $('.visibleAreaRefreshMapText').text('Done');
                
                                        //wait 3 seconds then hide button
                                        setTimeout(function() {
                                            //if map has moved since we started this process just show the normal button
                                            if($('#visibleAreaRefeshMap').hasClass('finished')) {
                                                $('#visibleAreaRefeshMap').removeClass('visible update finished').addClass('ready');
                                            }
                                        },3000);
                                    }
                    			}
                            }
                        };
                    }

                    //what's here
                    /*
                     var options = { lat: ContextMenuClick.latlng.lat, lng: ContextMenuClick.latlng.lng };
                     menuItems.here = {
                     name: "What's Here?",
                     className = 'massbutton',
                     callback: function () {
                     whatIsHere(options);
                     }
                     };
                     */

                    //remove favorites
                    if ( $('#PlottedQueriesTable .FavoriteRowUnit').length !== 0 ) {
                        menuItems.removeFavorites= {
                            name: MASystem.Labels.Context_Remove_All_Favorites,
                            className: 'massbutton',
                            callback: RemovePlotFavLocation
                        };
                    }

                    //remove poi
                    if($('#search-wrapper').data('poiMarkers') && $('#search-wrapper').data('poiMarkers')._map !== null) {
                        menuItems.removePOI = { name: MASystem.Labels.Context_Remove_POI, className: 'massbutton', callback: removePOI };
                    }

                    break;
                case 'legend':

                    //header
                    menuItems.header.name = MASystem.Labels.Context_Legend_Options;

                    //remove favorites
                    if ( $('#PlottedQueriesTable .FavoriteRowUnit').length !== 0 ) {
                        menuItems.removeFavorites= {
                            name: MASystem.Labels.Context_Remove_All_Favorites,
                            className: 'massbutton',
                            callback: RemovePlotFavLocation
                        };
                    }

                    //remove poi
                    if($('#search-wrapper').data('poiMarkers') && $('#search-wrapper').data('poiMarkers')._map !== null) {
                        menuItems.removePOI = { name: MASystem.Labels.Context_Remove_POI, className: 'massbutton', callback: removePOI };
                    }

                    break;
                case 'marker':

                    //header
                    menuItems.header.name = MASystem.Labels.Context_Marker_Options;

                    //center map here
                    menuItems.center = {
                        name: MASystem.Labels.Context_Center_Map_Here,
                        className: 'massbutton',
                        callback: function () {
                            MA.map.panTo(ContextMenuClick.latlng);
                        }
                    };

                    //favorite options
                    if(ContextMenuClick.target.layerType == 'favorite-marker') {
                        menuItems.header.name = MASystem.Labels.Context_Favorite_Options;
                        menuItems.removeFavorite = {
                            name: MASystem.Labels.Context_Remove_Favorite,
                            className: 'massbutton',
                            callback: function () {
                                var locationId = ContextMenuClick.target.Id;
                                var removeIndex = ContextMenuClick.target.index;
                                $('#PlottedQueriesTable .FavoriteRowUnit').each(function (i, row) {
                                    if($(row).attr('data-id') == locationId && removeIndex === i+1) {
                                        $(row).find('.btn-remove').click();
                                    }
                                });
                            }
                        };
                    }

                    //waypoint options
                    if(ContextMenuClick.target.layerType == 'waypoint-marker') {
                        menuItems.header.name = MASystem.Labels.Context_Waypoint_Options;
                    }

                    //ruler options
                    if(ContextMenuClick.target.layerType == 'ruler-marker') {
                        menuItems.header.name = "Ruler Options";
                        menuItems.removeRuler = { name: "Remove Ruler", className: 'massbutton', callback: function () { ContextMenuClick.target.maData.ruler.remove(); } };
                    }

                    //what's here options
                    if(ContextMenuClick.target.layerType == 'whatsHere-marker')
                    {
                        menuItems.header.name = 'Here Options';
                        menuItems.removeMarker = {
                            name: MASystem.Labels.Context_Remove_Marker,
                            callback: function(key, options) {
                                try {
                                    leafletMap.removeLayer($('#search-wrapper').data('whatsHere'));
                                }
                                catch (e) {}
                            }
                        };
                    }

                    //search address options
                    if(ContextMenuClick.target.layerType == 'searchAddress-marker')
                    {
                        menuItems.header.name = MASystem.Labels.Context_Search_Options;
                        menuItems.removeMarker = {
                            name: MASystem.Labels.Context_Remove_Marker,
                            callback: function(key, options) {
                                try {
                                    leafletMap.removeLayer($('#search-wrapper').data('newAddress'));
                                }
                                catch (e) {}
                            }
                        };
                    }

                    delete menuItems.massActions;
                    break;
                case 'cluster':
                    //header
                    menuItems.header.name = MASystem.Labels.Context_Cluster_Options;

                    //center map here
                    menuItems.center = {
                        name: MASystem.Labels.Context_Center_Map_Here,
                        className: 'massbutton',
                        callback: function () {
                            MA.map.panTo(ContextMenuClick.latlng);
                        }
                    };

                    break;
                case 'scatter':

                    //header
                    menuItems.header.name = MASystem.Labels.Context_Scatter_Options;

                    //center map here
                    var lat = ContextMenuClick.latlng.lat;
                    var lng = ContextMenuClick.latlng.lng;
                    menuItems.center = {
                        name: MASystem.Labels.Context_Center_Map_Here,
                        className: 'massbutton',
                        callback: function () {
                            leafletMap.panTo([lat,lng]);
                        }
                    };

                    break;
                case 'shape':

                    //header
                    menuItems.header.name = ContextMenuClick.target.label === undefined ? MASystem.Labels.MA_Boundary : ContextMenuClick.target.label;
                    var shape = ContextMenuClick.target;
                    var isCustom = shape.isCustom;
                    var isTravelGeom = shape.isTravelGeom;
            
                    var qid = shape.qid;
                    var $layer = $('#PlottedQueriesTable .PlottedShapeLayer[qid="'+qid+'"]');

                    var notEditable = !$layer.data('editable');
                    var newLayer = $layer.length === 0;

                    if(isTravelGeom) {
                        var isSavedTravel = shape.isSavedTravel || false;
                        if(!isSavedTravel) {
                            menuItems.saveLayer = {
                                name: MASystem.Labels.MA_Save_As_Shape_Layer,
                                callback : function (key, options) {
                                    //save the shape for later use
                                    VueEventBus.$bus.$emit('open-modal', {
                                        modal: 'create-custom-shape',
                                        options: {
                                            shape: shape,
                                            contextClick: true,
                                            qid: qid
                                        }
                                    });
                                }
                            }
                        }
                    }
                    else {
                        //edit layer if this is a google shape
                        if ( shape.getEditable ) {
    
                            var labelName = shape.getEditable() ? MASystem.Labels.MA_STOP_EDIT_SHAPE : MASystem.Labels.MA_EDIT_SHAPE;
                            var isDisabled = false;
    
                            if(newLayer) {
                                isDisabled = false;
                            } else if(notEditable) {
                                isDisabled = true;
                            }
    
                            menuItems.editLayer = {
                                name: labelName,
                                callback: function (key, options) {
                                    ContextMenuClick.target.setEditable(!shape.getEditable() );
    
                                    //if done editing, update the sidebar
                                    if(menuItems.editLayer.name == MASystem.Labels.MA_STOP_EDIT_SHAPE) {
    
                                        //update the label info
                                        if($layer.data('territoryData')) {
                                            var territory = $layer.data('territoryData');
                                            var geometry = territory.ShapeLayerGeometries__r.records[0];
    
                                            //create some options to create the shapeLayer template
                                            var jsonGeo = JSON.parse(geometry.Geometry__c);
                                            var terrOpts = JSON.parse(territory.Options__c);
                                            //add color options
                                            jsonGeo['colorOptions'] = terrOpts.colorOptions;
    
    
                                            //remove previous layer markers
                                            var markers = $layer.data('labelmarkers') || [];
                                            for(var m = 0; m < markers.length; m++) {
                                                var marker = markers[m];
                                                marker.setMap(null);
                                            }
    
                                            //create new label
                                            var labelMarker = MACustomShapes.createLabel(jsonGeo,terrOpts.colorOptions,shape,territory.Name);
                                            if ($layer.find('#toggle-labels').is(':checked')) {
                                                labelMarker.setMap(MA.map);
                                            }
                                            $layer.data('labelmarkers',[labelMarker]);
                                        }
                                    } else if (menuItems.editLayer.name == MASystem.Labels.MA_EDIT_SHAPE) {
                                        window.VueEventBus.$bus.$emit('check-shape-layer', $layer.data('id'));
                                    }
                                },
                                disabled: isDisabled
                            };
    
                            //hide if currently being edited
                            if( menuItems.editLayer.name != MASystem.Labels.MA_STOP_EDIT_SHAPE ) {
    
                                //allow saving this shape
                                var labelName = isCustom ? 'Edit Options' : MASystem.Labels.MA_Save_As_Shape_Layer;
                                var isDisabled = false;
    
                                if(newLayer) {
                                    labelName = MASystem.Labels.MA_Save_As_Shape_Layer;
                                    isDisabled = false;
                                } else if(notEditable) {
                                    labelName = isCustom ? 'Edit Options' : MASystem.Labels.MA_Save_As_Shape_Layer;
                                    isDisabled = true;
                                }
    
                                menuItems.saveLayer = {
                                    name: labelName,
                                    callback : function (key, options) {
                                        //save the shape for later use
                                        var shape = ContextMenuClick.target;
                                        var $tData = $layer.data('territoryData');
                                        var layerId = $tData ? $tData.Id : undefined;
                                        VueEventBus.$bus.$emit('open-modal', {
                                            modal: 'create-custom-shape',
                                            options: {
                                                id: layerId,
                                                shape: shape,
                                                contextClick: true
                                            }
                                        });
                                    },
                                    disabled: isDisabled
                                }
                            }
                            else if (menuItems.editLayer.name == MASystem.Labels.MA_STOP_EDIT_SHAPE && isCustom) {
                                menuItems.saveCloseLayer = {
                                    name: 'Stop and Save',
                                    callback: function (key, options) {
                                        ContextMenuClick.target.setEditable(false);
                                        var shape = ContextMenuClick.target;
                                        var qid = shape.qid;
                                        var $layer = $('#PlottedQueriesTable .PlottedShapeLayer[qid="'+qid+'"]');
                                        MACustomShapes.updateShapeGeometry({shape:shape,layer:$layer}, function (res) {
                                            if(res.success) {
                                                //show growler success
                                                growlSuccess($('#growl-wrapper'), 'Shape Layer successfully updated!',4000);
                                            }
                                            else {
                                                growlError($('#growl-wrapper'), 'Something went wrong! ' + res.message,4000);
                                            }
                                        });
                                    }//end callback
                                };
                            }
                        }
                    }
                    //enable/disable ruler
                    menuItems.addruler = {
                        name: MASystem.Labels.MA_ADD_RULER,
                        className: 'massbutton',
                        callback: function () {
                            new MA.Map.Ruler({ position: ContextMenuClick.latlng });
                        }
                    };
                    //remove layer
                    menuItems.removeLayer = {
                        name: MASystem.Labels.Layers_On_The_Map_Remove_Layer,
                        callback: function(key, options) {
                            try
                            {
                                //check if this prox object belongs to a marker.  if it does, remove it from the marker and the associated query
                                var marker = ContextMenuClick.target.maData.marker;
                                marker.maData.proximityCircle = null;
                                marker.record.plottedQuery.data('proximityObjects', $.grep(marker.record.plottedQuery.data('proximityObjects'), function (proxObj, i) {
                                    return proxObj !== ContextMenuClick.target;
                                }));
                                ContextMenuClick.target.setMap(null);

                                ChangeVisibilityWhenCircleIsAdded();
                            }
                            catch (err)
                            {
                                
                                //the prox object doesn't belong to a marker, so search the plotted layers for it
                                $('#PlottedQueriesContainer .proximity.layer, #PlottedQueriesContainer .PlottedShapeLayer').each(function(index, layer) {
                                    var $layer = $(layer);
                                    var layerData = $layer.data();
                                    var qid = layerData.qid;
                                    if(layerData.proxObject && layerData.proxObject == ContextMenuClick.target) {
                                        // remove the layer from dom, then trigger vue event
                                        removeProximityLayer($layer).then(function () {
                                            VueEventBus.$emit('remove-layer', qid);
                                        });

                                    } else if (layerData.proxObjects && layerData.proxObjects.length > 0) {
                                        var proxObjects = layerData.proxObjects;

                                        //loop over objects and remove
                                        var visible = proxObjects.length;
                                        for(var p = 0; p < proxObjects.length; p++) {
                                            var pObj = proxObjects[p];

                                            //check if this is an array
                                            if($.isArray(pObj)) {
                                                pObj = pObj[0];
                                                visible--;
                                                if(pObj == ContextMenuClick.target) {
                                                    //no shapes still visible, remove plotted row
                                                    removeProximityLayer($layer).then(function () {
                                                        VueEventBus.$emit('remove-layer', qid);
                                                    });
                                                }
                                            }
                                            else {
                                                //just remove this object
                                                if(pObj == ContextMenuClick.target) {
                                                    pObj.setMap(null);
                                                    visible--;

                                                    if(visible == 0) {
                                                        //no shapes still visible, remove plotted row
                                                        removeProximityLayer($layer).then(function () {
                                                            VueEventBus.$emit('remove-layer', qid);
                                                        });
                                                    }
                                                }
                                                else {
                                                    visible--;
                                                }
                                            }
                                        }
                                    } else if(layerData.dataLayer && layerData.dataLayer.contains(ContextMenuClick.target)) {
                                        removeProximityLayer($layer).then(function () {
                                            VueEventBus.$emit('remove-layer', qid);
                                        });
                                    }
                                });
                            }
                        }
                    };

                    break;
                case 'arcpolygon':
                    menuItems.header.name = "ArcGIS Polygon";
                    break;
                default:
                    return false;
            }
            //return the context menu
            return {
                items: menuItems,
                autoHide: true,
                reposition: false,
                events: {
                    hide: () => {
                        ContextMenuClick = {};
                        $('#PlottedQueriesContainer').find('.highlight').removeClass('highlight');
                    }
                }
            };
        }
    });

});

/*********************************************************************************
 * Other context menu handlers to dynamically create a map context menu
 **********************************************************************************/

//global var to store information about what was clicked
// on cluster click, google events fire all they way to the map
// preventDefault/ stopPropagation not working
// MAP-7650... this needs to be updated/ reworked
var googleEventPropegationBlock = false;
var ContextMenuClick = {};
//click map
var mapContextEnabled = true;
function Map_Context(e)
{
    if(mapContextEnabled) {
        var menuOptions = { type: 'map', latlng: e.latLng, target: this};
        var pixel = MA.Map.latLngOffset(e.latLng);
        var containerOffset = $('#mapdiv').offset();
        var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};

        launchContextMenu(menuOptions, coords);
    }
}

function Legend_Context(e, info) {
    if(mapContextEnabled) {
        var menuOptions;
        var coords;
        menuOptions = { type: 'legend', target: this, isLegend: true, info: info};
        var coords = {x: e.clientX, y: e.clientY};
        

        launchContextMenu(menuOptions, coords);
    }
}


//click polygon
function Shape_Context(e)
{
    var menuOptions = { type: 'shape', latlng: e.latLng, target: this };
    var pixel = MA.Map.latLngOffset(e.latLng);
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

//click ArcGIS polygon
function ArcPolygon_Context(e)
{
    var menuOptions = { type: 'arcpolygon', latlng: e.latLng, target: this };
    var pixel = MA.Map.latLngOffset(e.latLng);
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

function cluster_context (cluster)
{
    var menuOptions = { type: 'cluster', latlng: cluster.getCenter(), target: cluster };
    var pixel = MA.Map.latLngOffset(cluster.getCenter());
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

function marker_Context(e)
{
    //quick fix for right-clicking RichMarker instead of Google Marker
    e = e || { latLng: this.getPosition() };
    var menuOptions = { type: 'marker', latlng: e.latLng, target: this };
    var pixel = MA.Map.latLngOffset(e.latLng);
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

function polyline_Context(e)
{
    //quick fix for right-clicking RichMarker instead of Google Marker
    e = e || { latLng: this.getPosition() };
    var menuOptions = { type: 'marker', latlng: e.latLng, target: this };
    var pixel = MA.Map.latLngOffset(e.latLng);
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: pixel.x+containerOffset.left, y: pixel.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

function scatter_Context(e)
{
    var menuOptions = { type: 'scatter', latlng: e.latlng, target: this };
    var containerOffset = $('#mapdiv').offset();
    var coords = {x: e.containerPoint.x+containerOffset.left, y: e.containerPoint.y+containerOffset.top};
    launchContextMenu(menuOptions, coords);
}

// show context
function launchContextMenu(menuOptions, coords) {
    if (!MA.markerSelection.ctrl) {
        ContextMenuClick = menuOptions;
        $('#mapdiv').contextMenu(coords);
    }
}

/************************************************************************
 * Mass action context menu handlers
 ************************************************************************/
// MOBILE DOES NOT USE THIS FILE, MOVING TO JSHELPERFUNCTIONS
