var orgId = MASystem.MergeFields.Organization_Id;

var MADemographicLayer = {
    getMarkers: true,

    defaultMarker: '3083d3:Marker',
    defaultColor: '3083d3',

    markerLimit: 15000,

    dmpMarkerLimit: 15000,

    queryTimeout: 15000,

    runningQueries: [],

    t: null,
    
    analyzeDataLayer: function (options) {
        var dfd = $.Deferred();

        options = $.extend({
            action : '',
            baseObjectLabel : 'Data Layer',
            create : false,
            createdInfo : 'N/A',
            delete : false,
            description : 'No Description',
            export : false,
            folderPath : '',
            id : '',
            modifiedInfo : 'N/A',
            modify : false,
            name : 'Saved Data Layer',
            nodetype : '',
            read : false,
            setpermissions : false,
            type: 'datalayer'
        }, options || {});
        
        //create uniqie identifier
        var uid = new Date();
        uid = uid.getTime();
        if (!options.qid) {
            options.qid = uid + 'dataLayer';
        }
        if(!options.id) {
            dfd.resolve({success:false,error:'No Id for Data Layer.'});
            return dfd.promise();
        }
        
        //create our plotted layer
        MADemographicLayer.BuildPlottedLayerDiv(options).then(function($plottedLayer) {
            options.plottedLayer = $plottedLayer;
            
            options.plottedLayer.data('plottingOptions',options);
            options.plottedLayer.data('options', {
                supportsChatter: false,
                relatedListCount: 0
            });
            
            options.plottedLayer.find('.queryIcon').hide();
            options.plottedLayer.find('.queryLoader').show();
            
            var $mobileLoadingMessage = MAToastMessages.showLoading({message: MASystem.Labels.Layers_Mobile_Build_Layer_Element_Title, subMessage: MASystem.Labels.Layers_Getting_Data_Layer_Details,timeOut:0,extendedTimeOut:0});
            
            // if(MA.isMobile) {
            //     options.mobileLayer = MADemographicLayer.buildMobileView(options);
            // }
            
            Plotting.plottedIds[options.id] = $.extend({
                type : 'datalayer',
                qid : options.qid,
                name : '',
                dataLayerId : options.id
            }, options || {});
            //Check due to old folder junk
            if(!options.stayOnMapTab) {
                VueEventBus.$emit('move-to-tab', 'plotted');
            }
            
            //BEGIN MA ANALYTICS
            var analyticData = { 
                ajaxResource : 'TreeAJAXResources',
                action: 'store_layer_analytics',
                track : 'true',
                subtype : 'Data Layer',
                id : options.id
            };
            
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                analyticData,
                function(res, event){
                    if(NewLayerNavigationEnabled()) {
                        VueEventBus.$emit('get-recent-layers');
                    }
                },{escape:false,buffer:false,timeout:120000}
            );
            trackUsage('Maps', { action: 'Plot Data Layer', description: 'Plot Data Layer' });
            //grab our info from SF
            var processData = { 
                ajaxResource : 'TreeAJAXResources',
                action: 'get_layer_data',
                id : options.id
            };
            
            $plottedLayer.find('.header .ftu-icon-icon').attr('type','dataLayer');
            $plottedLayer.attr({'data-type':options.datatype});
            $plottedLayer.find('.header .ftu-icon-icon').removeClass('error');
            $plottedLayer.find('.queryIcon').hide();
            $plottedLayer.find('.queryLoader').show();
            $plottedLayer.find('.query-visibility').hide();
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                processData,
                function(res, event){
                    if(event.status) {
                        if(res && res.success) {
                            var d = new Date();
                            var theKey = orgId + d.getTime();
                            options.key = theKey;
                            $plottedLayer.attr({'uid':theKey});
                            var datLayerObject = res.options;
                            var dataLayerOptions = getProperty(res, 'options.maps__Options__c', false);
                            if(dataLayerOptions !== undefined) {
                
                                //parse our data layer options
                                try {
                                    dataLayerOptions = JSON.parse( dataLayerOptions );
                                    datLayerObject.parsedOptions = dataLayerOptions;
                                }
                                catch(e) {
                                    dfd.resolve({success:false,error: MASystem.Labels.Common_Refresh_And_Try_Again});
                                    return dfd.promise();
                                }
                                
                                //update some styling
                                $mobileLoadingMessage.find('.toast-title').text(datLayerObject.name);
                                
                                //are we plotting markers or shapes?
                                var dataLayerType = dataLayerOptions.type;
                                var file_id_legacy = dataLayerOptions.file_id || '';
                                file_id_legacy = MAData.legacyDataLayerMap[file_id_legacy] || file_id_legacy;
                                options.plottedLayer.attr({'data-type':file_id_legacy,'plot-type':dataLayerType});

                                if(dataLayerType == 'point' || dataLayerType == 'marker') {
                                    MADemographicLayer.plotMarkersV2.init(options,datLayerObject).then(function(res) {
                                        options.plottedLayer.find('.queryError').hide();
                                        $plottedLayer.find('.query-visibility').show();
                                        options.plottedLayer.find('.queryIcon').show();
                                        dfd.resolve({success:true});
                                    }).fail(function (err) {
                                        options.plottedLayer.find('.queryError').show();
                                        options.plottedLayer.find('.queryIcon').hide();
                                        options.plottedLayer.find('.ftu-icon-icon[type="dataLayer"]').removeAttr('type');
                                        MAToastMessages.showError({message:MASystem.Labels.Layers_Cannot_Load_Data_Layer,subMessage:MASystem.Labels.Common_Refresh_And_Try_Again,timeOut:0,closeButton:true});
                                        dfd.resolve({success:false});
                                    }).always(function () {
                                        MAToastMessages.hideMessage($mobileLoadingMessage);
                                        options.plottedLayer.find('.queryLoader').hide();
                                        options.plottedLayer.find('.loadMask').hide();
                                        options.plottedLayer.removeClass('loading');
                                    });
                                }
                                else {
                                    MADemographicLayer.plotShapes(options,datLayerObject).then(function(res) {
                                        MAToastMessages.hideMessage($mobileLoadingMessage);
                                        if(res.success) {
                                            options.plottedLayer.find('.queryLoader').hide();
                                            options.plottedLayer.find('.queryError').hide();
                                            options.plottedLayer.find('.queryIcon').show();
                                            options.plottedLayer.find('.loadMask').hide();
                                            dfd.resolve({success:true});
                                        }
                                        else {
                                            //update plotted layer with error
                                            options.plottedLayer.find('.queryLoader').hide();
                                            options.plottedLayer.find('.queryError').show();
                                            options.plottedLayer.find('.queryIcon').hide();
                                            options.plottedLayer.find('.loadMask').hide();
                                            options.plottedLayer.find('.ftu-icon-icon[type="dataLayer"]').removeAttr('type');
                                            var errMsg = MASystem.Labels.Common_Refresh_And_Try_Again;
                                            MAToastMessages.showError({message:MASystem.Labels.Layers_Cannot_Load_Data_Layer,subMessage:errMsg,timeOut:0,closeButton:true});
                                            dfd.resolve({success:false});
                                        }
                                    });
                                }
                            }
                            else {
                                var errMsg = MASystem.Labels.Common_Refresh_And_Try_Again;
                                dfd.resolve({success:false,error:errMsg});
                                return dfd.promise();
                            }   
                        }
                        else {
                            var errMsg = MASystem.Labels.Common_Refresh_And_Try_Again;
                            dfd.resolve({success:false,error:errMsg});
                        }
                    }
                    else {
                        dfd.resolve({success:false,error:event.message});
                    }
                },{timeout:120000,buffer:false,escape:false}
            );
            // $plottedLayer.find('button.btn-remove').attr('onclick', 'MADemographicLayer.RemoveLayerFromDom(this);');

            //handle hover menu
            $plottedLayer.off('mouseenter','.drop-menu-wrapper');
            $plottedLayer.on('mouseenter','.drop-menu-wrapper',function(event) {
                var $button = $(this);
                var menuItemPos = $button.position();
                //get position to show menu
                var topPos = menuItemPos.top + 25; //+25px for button size

                if($plottedLayer.hasClass('loading')) {
                    return;
                }

                if($button.is('.query-options')) {
                    $plottedLayer.find('.query-menu-options').css('top',topPos);
                    $plottedLayer.find('.plotted-menu-icon, .query-menu-options').addClass('active');
                }

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
            $plottedLayer.off('mouseleave','.drop-menu-wrapper');
            $plottedLayer.on('mouseleave','.drop-menu-wrapper',function(event) {
                $('.drop-down-menu, .btn-lg').removeClass('active');
            });

            //handle actions
            $plottedLayer.off('click','.edit-query');
            $plottedLayer.on('click','.edit-query',function() {
                MAData.wizard.launchPopup({ layerId: options.id, plottedLayer : $plottedLayer, isPlotted: true });
            });
            $plottedLayer.off('click','.refresh-query');
            $plottedLayer.on('click','.refresh-query',function() {
                MADemographicLayer.refreshDataLayer($plottedLayer);
            });
            $plottedLayer.off('click','.fit-query');
            $plottedLayer.on('click','.fit-query',function() {
                ZoomToFit({ dataLayers: [$plottedLayer] });
            });
        });
        return dfd.promise();
    },

    plotMarkersV2: {
        init: function (origOptions,dataLayerSFOptions) {
            var dfd = $.Deferred();
            var $plottedLayer = origOptions.plottedLayer;
            var sfDataOptions = dataLayerSFOptions.parsedOptions || {};
            var cleanedData = MADemographicLayer.plotMarkersV2.cleanUpLegacyData(sfDataOptions);
            $plottedLayer.data('SFLayerParams',cleanedData);
            $plottedLayer.addClass('visibleOnly');
            $plottedLayer.find('.status').text(MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer_Loading);
            MADemographicLayer.plotMarkersV2.phase_1(cleanedData).then(function (res) {
                // send out batches of ids
                var phase2Data = res;
                MADemographicLayer.plotMarkersV2.phase_2(phase2Data, $plottedLayer).then(function (markerData) {
                    MADemographicLayer.createDataLayerMarkers(origOptions,markerData).then(function() {
                            dfd.resolve({success:true});
                        });
                }).fail(function(err) {

                });
            }).fail(function (err) {
                dfd.reject();
            });
            return dfd.promise();
        },
        cleanUpLegacyData: function (sfData) {
            // we need to remove other row info and unused params
            var cleanedData = {
                file_id: sfData.file_id || '',
                filters: sfData.filters || [],
                legend: sfData.legend || {},
                level_id: sfData.level_id,
                popup: sfData.popup,
                defaultMarkerColor: sfData.defaultMarkerColor || '93c47d:Circle'
            };
            // remove other row from legend
            var oldLegendRows = getProperty(sfData, 'legend.rows', false) || [];
            var newLegendRows = [];
            for (var i = 0; i < oldLegendRows.length; i++) {
                var row = oldLegendRows[i];
                var values = row.values || [];
                var skipRow = false;
                if (row.topic_id === '--Other--') {
                    // skip
                    cleanedData.defaultMarkerColor = row.color || sfData.defaultMarkerColor || '93c47d:Circle';
                    continue;
                }
                if (typeof row.values === 'object') {
                    var stringValue = row.values.join(',');
                    if (stringValue.toLowerCase().indexOf('--other--') > -1) {
                        cleanedData.defaultMarkerColor = row.color || sfData.defaultMarkerColor || '93c47d:Circle';
                        continue;
                    }
                }
                if (typeof row.values === 'string') {
                    var stringValue = row.values;
                    if (stringValue.toLowerCase().indexOf('--other--') > -1) {
                        cleanedData.defaultMarkerColor = row.color || sfData.defaultMarkerColor || '93c47d:Circle';
                        continue;
                    }
                }
                newLegendRows.push(row);
            }
            cleanedData.legend.rows = newLegendRows
            return cleanedData;
        },
        phase_1: function (sfDataOptions) {
            var dfd = $.Deferred();
            var NE = MA.map.getBounds().getNorthEast();
            var SW = MA.map.getBounds().getSouthWest();
            var CE = MA.map.getCenter();
            // var cleanedData = MADemographicLayer.plotMarkersV2.cleanUpLegacyData(sfDataOptions);
            var queryLimit = 15000;
            if(MA.isMobile) {
                var markerLimit = 1000;
                if (userSettings.mobilePlotLimit) {
                    markerLimit = userSettings.mobilePlotLimit == '' ? 1000 : MA.Util.parseNumberString(userSettings.mobilePlotLimit);
                }
                queryLimit = markerLimit;
            }
            sfDataOptions.filters.forEach(function(filter) {
                if(filter.values) {
                    // legacy fix
                    if (!Array.isArray(filter.values)) {
                        filter.values = [filter.values];
                    }
                    filter.values.forEach(function(value, index) {
                        if(value.match(/^[+-]?\$?\d+(,\d{3})*(\.\d+)?$/)) {
                            filter.values[index] = MA.Util.parseNumberString(value);
                        }
                    });
                }
            });
            var markerLayerData = {
                data: sfDataOptions,
                mapinfo: {
                    'nelat' : NE.lat(),
                    'nelng' : NE.lng(),
                    'swlat' : SW.lat(),
                    'swlng' : SW.lng(),
                    'celat' : CE.lat(),
                    'celng' : CE.lng(),
                    'limit' : queryLimit,
                    'offset': 0
                },
                ids: [],
                aggregates: false,
                details: false
            }
            var options = { 
                method : 'post',
                action: 'markers',
                subType : 'data',
                version : '3'
            };
            var jsonParams = JSON.stringify(markerLayerData);
            Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,
                options ,
                jsonParams,
                function(response, event){
                    if (event.status) {
                        if (response && response.success) {
                            var returnData = response.data || {ids: []};
                            dfd.resolve({requestData: markerLayerData, returnData: returnData});
                        } else {
                            var errMsg = getProperty(response || {}, 'errInfo') || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
                            dfd.reject(errMsg);
                        }
                    } else {
                        dfd.reject(event.message);
                    }
                }, {timeout: 45000, buffer: false, escape: false}
            );
            return dfd.promise();
        },
        phase_2: function (data, $plottedLayer) {
            var dfd = $.Deferred();
            $.extend({
                requestData: {},
                returnData : {}
            }, data || {});
            // create batchable 1000 at a time
            var requestData = data.requestData;
            var idsToRequest = getProperty(data, 'returnData.ids', false) || [];
            var batchableArray = MA.Util.createBatchable(idsToRequest, 1000);
            var markerLayerData = {
                'aggregates' : [],
                'legend' : {
                    'title' : '',
                    'subtitle' : '',
                    'rows' : []
                },
                'markers' : []
            };
            if (batchableArray.length === 0) {
                dfd.resolve(markerLayerData);
            } else {
                var errors = [];
                var batchesRemaining = 0;
                var markerQue = async.queue(function (markerParams, callback) {
                    var options = { 
                        method : 'post',
                        action: 'markers',
                        subType : 'data',
                        version : '3'
                    };
                    // markerParams.details = true;
                    var jsonParams = JSON.stringify(markerParams);
                    
                    Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,
                        options ,
                        jsonParams,
                        function(res, event){
                            if(event.status) {
                                if(res && res.success) {
                                    var layerData = res.data;
                                    var markerArr = layerData.markers || [];
                                    markerLayerData.markers = markerLayerData.markers.concat(markerArr);
                                    var legendData = layerData.legend;
                                    markerLayerData.legend = legendData;
                                    $plottedLayer.find('.status').text(MASystem.Labels.MA_Processing + ' Batch: ' + batchesRemaining);
                                    callback();
                                }
                                else {
                                    var errMsg = getProperty(res||{},'message') || MASystem.Labels.Common_Refresh_And_Try_Again;
                                    console.warn(errMsg);
                                    errors.push(errMsg);
                                    callback();
                                }
                            }
                            else {
                                console.warn(event);
                                errors.push(event.message);
                                callback();
                                //dfd.resolve({success:false,error:event.message});
                            }
                            batchesRemaining--;
                        },{escape:false,buffer:false,timeout:120000}
                    );
                });

                markerQue.concurrency = 5;
                var numberOfBatches = batchableArray.length;
                batchesRemaining = numberOfBatches;
                $plottedLayer.find('.status').text(MASystem.Labels.MA_Processing + ' Batch: ' + batchesRemaining);
                for(var i = 0; i < numberOfBatches; i++) {
                    var paramerters = $.extend({}, requestData || {});
                    paramerters.ids = batchableArray[i];
                    paramerters.details = true;
                    markerQue.push(paramerters,function(res){});
                }
                
                markerQue.drain = function(){
                    dfd.resolve(markerLayerData);
                }
            }
            return dfd.promise();
        }
    },
    
    plotShapes : function (origOptions,dataLayerSFOptions) {
        var dfd = $.Deferred();
        
        var $plottedLayer = origOptions.plottedLayer;
        $plottedLayer.find('.header .ftu-icon-icon').attr('type','dataLayer');
        $plottedLayer.attr('key',origOptions.key);
        $plottedLayer.find('.header .ftu-icon-icon').removeClass('error');
        $plottedLayer.find('.queryIcon').hide();
        $plottedLayer.find('.queryLoader').show();
        
        //go grab some markers
        var options = { 
            method : 'post',
            action: 'storage',
            subType : 'tile',
            version : '2'
        };
        var NE = MA.map.getBounds().getNorthEast();
        var SW = MA.map.getBounds().getSouthWest();
        
        /*var paramerters = {
          "key":origOptions.key,
          "data":{"type":"polygon","file_id":"x_can_2011_census","level_id":"can-1","topic_id":"can_2011_median_age","country_id":"--","opacity":50,"filters":[],"legend":{"title":"Median Age","subTitle":"","rows":[{"topic_id":"can_2011_median_age","operator":"range","min":"24.10","max":"38.20","color":"e06666"},{"topic_id":"can_2011_median_age","operator":"range","min":"38.20","max":"40.40","color":"f6b26b"},{"topic_id":"can_2011_median_age","operator":"range","min":"40.40","max":"42.80","color":"ffd966"},{"topic_id":"can_2011_median_age","operator":"range","min":"42.80","max":"44.00","color":"93c47d"}]},"popup":{"header":[{"type":"","file_id":"x_can_2011_census","topic_id":"can_2011_median_person_per_household"},{"type":"","file_id":"x_can_2011_census","topic_id":"can_2011_median_age"}],"tabs":[{"tab_id":"1480643895993","tab_label":"Info","data":[{"file_id":"x_can_2011_census","topic_id":"can_2011_median_age_female"},{"file_id":"x_can_2011_census","topic_id":"can_2011_median_age_male"},{"file_id":"x_can_2011_census","topic_id":"can_2011_avg_household_income"}]}]}}
        };*/
        
        var paramerters = {
          "key":origOptions.key,
          "data":dataLayerSFOptions.parsedOptions
        };
        var jsonParams = JSON.stringify(paramerters);
        
        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,
            options ,
            jsonParams,
            function(res, event){
                if(event.status) {
                    if(res && res.success) {
                        try {
                            MA.Map.removeOverlay('customTileLayer');
                        }catch(e){}
                        var legendOptions = {
                            legend: dataLayerSFOptions.parsedOptions.legend,
                            isPolygon: true
                        }
                        MADemographicLayer.createLegendInfo(legendOptions).then(function (normalizedLegend) {
                            var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
                            var customTileURL = MAIO_URL + '/tile/draw/2';
                            origOptions.plottedLayer.data('customTileKey',res.key);
                            //set up the tile server
                            var CensusLayer = new google.maps.ImageMapType({
                                name: origOptions.key,
                                maxZoom: 18,
                                tileSize: new google.maps.Size(256, 256),
                                opacity: origOptions.opacity || 0.7,
                                getTileUrl: function(coord, zoom) {
                                    // https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes
                                    // Normalizes the coords that tiles repeat across the x axis (horizontally)
                                    // like the standard Google map tiles.

                                    // tile range in one direction range is dependent on zoom level
                                    // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
                                    var tileRange = 1 << zoom;

                                    // repeat across x-axis
                                    if (coord.x < 0 || coord.x >= tileRange) {
                                        coord.x = (coord.x % tileRange + tileRange) % tileRange;
                                    }

                                    return [ customTileURL, '/', coord.x, '/', coord.y, '/', zoom, '/', origOptions.key].join('');
                                }
                            });
                            
                            MA.map.overlayMapTypes.push(CensusLayer);
                            var newData = {
                                name: origOptions.name,
                                id: origOptions.id,
                                key: origOptions.key,
                                markers: null,
                                censusLayer: CensusLayer,
                                legend: normalizedLegend,
                                clusterGroup: null,
                                clusterMarkers: [],
                                numClusterDataPoints: 0
                            };

                            MADemographicLayer.FillPlottedLayerDiv(origOptions.plottedLayer, newData).then(function(res) {
                                $plottedLayer.find('.visiblemarkers').hide();
                                $plottedLayer.find('.of').hide();
                                $plottedLayer.find('.totalmarkers').hide();
                
                                //TURN ON CLICKS!
                                // google.maps.event.addListener(MA.map, 'click', function(event) {
                                //  MADemographicLayer.HandleClick(event, null, null, theKey);
                                // });
                                // MADemographicLayer.ToggleLayerClick(origOptions.key);
                                
                                dfd.resolve({success:true,msg: MASystem.Labels.DataLayer_Finished_Rendering});
                            });
                        });
                    } else {
                        MA.log(res,event);
                        var errMsg = getProperty(res||{},'message') || MASystem.Labels.Common_Refresh_And_Try_Again;
                        dfd.resolve({success:false,error:errMsg});
                    }
                }
                else {
                    MA.log(event);
                    dfd.resolve({success:false,error:event.message});
                }
            },{escape:false,buffer:false,timeout:120000}
        );
        
        return dfd.promise();
    },
    createLegendInfo: function(layerData) {
        var $dfd = $.Deferred();
        var legendInfo = layerData.legend;
        var rows = legendInfo.rows || [];
        var normalizedLegend = {};
        var isPolygon = layerData.isPolygon || false;
        MADemographicLayer.getImageInfoForLegend(rows, isPolygon).then(function() {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var commonData = {
                    active: true,
                    count: 0,
                    totalmarkers: 0,
                    markerValue: row.color,
                    label: MADemographicLayer.BuildLegendRowText(row)
                }
                var rowId = '';
                if (isPolygon) {
                    rowId = 'row-' + i;
                    commonData.legendId = rowId;
                    commonData.icon = '';
                } else {
                    var imgInfo = imgLoaderDimensions[row.color] || {};
                    rowId = row.row_id;
                    commonData.legendId = rowId;
                    commonData.icon = imgInfo.imgURL;
                }
                normalizedLegend[rowId] = commonData;
            }
            $dfd.resolve({
                title: legendInfo.title || 'Legend',
                subTitle: legendInfo.subTitle || '',
                rows: normalizedLegend
            });
        });
        return $dfd.promise();
    },
    getImageInfoForLegend: function(legendRows, isPolygon) {
        var dfd = $.Deferred();
        var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
        var imagesToProcess = [];
        var qid = moment().format('x');
        for(var i = 0, len = legendRows.length; i < len; i++) {
            var row = legendRows[i];
            imagesToProcess.push(row.color);
        }
        if (imagesToProcess.length > 0 && !isPolygon) {
            for (var g = 0; g < imagesToProcess.length; g++) {
                var imgIcon = imagesToProcess[g];
                var imageURL = '';
                var imgId = '';
                var colorParts = imgIcon.split(':');
                var iconPart = colorParts[1] || 'Circle';
                var iconColor = colorParts[0] || '3083d3';
                iconColor = iconColor.replace(/#/g,'');
                imgId = imgIcon;
                imageURL = MAIO_URL + '/images/marker/3?color='+iconColor+'&forlegend=false&icon='+iconPart;
                // if cached, skip
                if (imgLoaderDimensions[imgIcon] === undefined) {
                    var img = new Image();
                    img.imgId = imgId;
                    img.queryId = qid;
                    img.name = imageURL;
                    img.src = imageURL;
                    img.onload = imgLoaded;
                    img.onerror = imgError;
                    img.onabort = imgError;
                    imgLoaderCounts[qid] = (imgLoaderCounts[qid] || 0) + 1;
                }
            }
            imgLoaderIntervals[qid] = setInterval(function () {
                if ((imgLoaderCounts[qid] || 0) === 0) {
                    clearInterval(imgLoaderIntervals[qid]);
                    dfd.resolve();
                }
            },200);
        } else {
            dfd.resolve();
        }
        return dfd.promise();
    },
    createDataLayerMarkers : function (options,layerData) {
        layerData = layerData || {};
        var renderModes = MADemographicLayer.getRenderModes(options.plottedLayer);

        //callback = callback || function(){};
        var theKey = options.key;
        options.plottedLayer.attr('key', theKey);
        var $plottedLayer = options.plottedLayer;
        var plottedDataType = $plottedLayer.attr('data-type') || 'dataLayer';
        var dataLayerName = $plottedLayer.data('name') || 'Data Layer';
        var dfd = $.Deferred();
        var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
        // var legendInfo = layerData.legend;
        MADemographicLayer.createLegendInfo(layerData).then(function (normalizedLegend) {
            try {
                var records = {};
                var markers = getProperty(layerData,'markers');
                if(markers != undefined) {
                    var clusterMarkers = [];
                    var len = markers.length;
                    var markerProcessingBatchSize = 500;
                    var markerProcessingTimeout = 1;
                    var i = 0;
                    setTimeout(function doBatch() {
                        if (i < len)
                        {
                            var recordsProcessed = 0;
                            while (recordsProcessed < markerProcessingBatchSize && i < len) {
                                recordsProcessed++;
                                
                                var marker = markers[i];
                                var color = MADemographicLayer.defaultMarker;
                                var icon = null;
                    
                    
                                if( marker.hasOwnProperty('color') ) {
                                    if(marker.color !== '' && marker.color !== null && marker.color !== undefined) {
                                        color = marker.color;
                                    }
                                }
                                
                                var colorParts = color.split(':');
                                var iconPart = colorParts[1] || 'Circle';
                                var iconColor = colorParts[0] || '3083d3';
                                iconColor = iconColor.replace(/#/g,'');
                                var iconInfo = MAMarkerBuilder.shapes[iconPart] || MAMarkerBuilder.shapes['Circle'];
                                var iconSize = iconInfo.size || {x:48,y:48};
                                var iconAnchor = iconInfo.anchor || {x:12,y:12};
                                icon = {
                                    url : MAIO_URL + '/images/marker/3?color='+iconColor+'&forlegend=false&icon='+iconPart,
                                    size: new google.maps.Size(iconSize.x, iconSize.y),
                                    scaledSize: new google.maps.Size(iconSize.x/2, iconSize.y/2),
                                    anchor: new google.maps.Point(iconAnchor.x, iconAnchor.y)
                                }
                                
                                var uniqueMarkerId = marker.uid || '';
                                marker.label = marker.label || 'Data Layer Marker';
                                marker.datatype = plottedDataType;
                                var clusterMarker = new google.maps.Marker({
                                    position: {
                                        lat: parseFloat(marker.position.lat),
                                        lng: parseFloat(marker.position.lng)
                                    },
                                    //layerUID : options.plottedLayer.attr('uid'),
                                    data : marker,
                                    isVisible : false,
                                    title: marker.label || 'Data Layer Marker',
                                    icon: icon,
                                    zIndex : -999999,
                                    markerId : uniqueMarkerId,
                                    key : options.key,
                                    qid : options.qid,
                                    type: 'dataLayer',
                                    layerName : options.name || MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer,
                                    record : {
                                        Id : uniqueMarkerId
                                    }
                                });
                    
                                var MarkerCoordinate = new google.maps.LatLng(parseFloat(marker.position.lat), parseFloat(marker.position.lng));
                                records[uniqueMarkerId] = {
                                    clusterMarker : clusterMarker,
                                    isVisible : false,
                                    isClustered : true,
                                    position: {
                                        lat: parseFloat(marker.position.lat),
                                        lng: parseFloat(marker.position.lng)
                                    },
                                    markerCoordinate : MarkerCoordinate,
                                    data : marker,
                                    // to remove marker
                                    type : 'dataLayer',
                                    dataLayerName: dataLayerName,
                                    plottedQuery: $plottedLayer,
                                    marker : {
                                        qid : options.qid
                                    },
                                    // to make mobile tooltip happy
                                    record: {}
                                }
                    
                                if(clusterMarker !== null) {
                                    // make sure marker does not get messed up with Vue
                                    clusterMarker._isVue = true;
                                    MA.Map.spiderfier.addMarker(clusterMarker);
                                    if (!MA.isMobile) {
                                        google.maps.event.addListener(clusterMarker, 'mousedown', function() { $('#mapdiv').contextMenu('hide'); window.ContextMenuClick = {}; });
                                        google.maps.event.addListener(clusterMarker, 'rightclick', marker_Context);
                                    }
                    
                                    //markerList.push(marker);
                                    clusterMarkers.push(clusterMarker);
                    
                                }
                                i++;
                            }
            
                            //set a timeout to process the next batch
                            var processedMarkers = Object.keys(records);
                            $plottedLayer.find('.status').text('Rendering: ' + processedMarkers.length);
                            setTimeout(doBatch, markerProcessingTimeout);
                        }
                        else
                        {
                            //Cluster stuff
                            var clusterer = new MarkerClusterer(MA.map, [], {
                                zoomOnClick: false,
                                imagePath: MASystem.Images.clusterFolder,
                                savedQueryName: options.name,
                                qid: options.qid
                            });
                            clusterer.clearMarkers();
                            clusterer.qid = options.qid;
                            //clusterer.addMarkers(clusterMarkers.slice(0, MA.limits.maxClusterSize));
                            google.maps.event.addListener(clusterer, 'click', MADemographicLayer.ClusterClick);
                            google.maps.event.addListener(clusterer, 'rightclick', cluster_context);
                    
                            var newData = {
                                name: options.name,
                                id: options.id,
                                key: options.key,
                                markers: clusterMarkers,
                                censusLayer: null,
                                legend: normalizedLegend,
                                clusterGroup: clusterer,
                                clusterMarkers: [],
                                numClusterDataPoints: clusterer.getTotalMarkers(),
                                records : records
                            };
                            MADemographicLayer.FillPlottedLayerDiv(options.plottedLayer, newData).then(function(res) {
                                //render markers
                                MADemographicLayer.rerenderDataLayer(options.plottedLayer, {renderModes: renderModes}, function(res) {
                                    //callback({success:true,msg:'finished rendering'});
                                    dfd.resolve({success:true,msg: MASystem.Labels.DataLayer_Finished_Rendering});
                                    //update legend with totals
                        
                                    MADemographicLayer.setQueryDisplayDropDown({ plottedLayer: $plottedLayer, renderModes: renderModes, modify: options.modify });
                                });
                            });
                        }
                    }, markerProcessingTimeout);
                }
                else {
                    dfd.resolve({success:false,error:MASystem.Labels.Layers_No_Markers_Found});
                }
            }
            catch(e) {
                dfd.resolve({success:false, error:MASystem.Labels.Common_Refresh_And_Try_Again});
            }
        });
        return dfd.promise();
    },

    getDataLayerMarkerInfo : function (options) {
        options = $.extend({
            isMobile : false,
            key : '',
            layerName : MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer
        }, options || {});
        var marker = this;
        MADemographicLayer.testMarker = marker;

        var markerPos = marker.getPosition();
        var key = marker.key;
        if(MA.isMobile) {
            $('#markerTooltipWrap').data('record',marker);
            $tooltipContent = $('#markerTooltipWrap');
            var dataInfo = marker.data;
            var markerOptions = {
                type: 'data-layer',
                record: {
                    name: marker.title,
                    address: marker.layerName, // display query name in address location
                    location: {
                        coordinates: dataInfo.position
                    },
                    data: dataInfo
                },
                marker: marker,
                queryMetaData: {}
            };
            VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
        }
        else {
            //go get our layer
            var $plottedLayer = $('#PlottedQueriesTable .DataLayer[key="'+key+'"]');
            var isPropertyData = $plottedLayer.attr('data-type') == 'property';
            //create a new info bubble and show loading
            var $tooltipContent = $('#tooltip-demographic-template').clone().attr('id', 'tooltip-content').addClass('demographics').show();
            $tooltipContent.find('.layerName').text(htmlDecode(options.layerName));
            MADemographicLayer.t = $tooltipContent;

            MA.demographicsInfoBubble = MA.Map.InfoBubble.show({
                position: marker.getPosition(),
                minWidth: 200,
                content: $tooltipContent.get(0),
                anchor: marker
            });

            $tooltipContent.find('.tooltip-loader').show();
        
            var markerLoaded = false;
            var returnedMarkers = [];
            returnedMarkers.push(marker);
            $.each(returnedMarkers, function(i,mark) {
                var markerData = mark.data;
                //grab the popup
                var popup = markerData.popup;
                var dlLayout = userSettings.ButtonSetSettings.dataLayerLayout || JSON.parse('[{"Label":"Actions","Columns":[[{"Action":"Add to Trip","Label":"'+MASystem.Labels.ActionFramework_Add_to_Trip+'","Type":"Standard Action"},{"Action":"Remove Marker","Label":"' + MASystem.Labels.Context_Remove_Marker + '","Type":"Standard Action"}],[{"Label":"Set Proximity Center","Type":"Standard Action"},{"Label":"' + MASystem.Labels.MA_STREET_VIEW + '","Type":"Standard Action"}],[{"Label":"Create Record","Type":"Standard Action"}]]}]');
        
                MADemographicLayer.BuildHeader(popup.header, $tooltipContent, options);
                MADemographicLayer.BuildTabs(popup.tabs, $tooltipContent, options);

                var tabs = $tooltipContent.find('#madata-tabs');
                var tabURL = "#tab-buttonActions";
                tabs.find('ul').append('<li><a data-pane="#tab-buttonActions" href="'+tabURL+'">Actions</a></li>');
                var $dataHTML = $('<div id="tab-buttonActions" class="layout-tooltip pane"></div>');
    
    
                $dataHTML.html(MAActionFramework.buildLayoutFromContents(dlLayout, {
                        markerType: 'DataLayer'
                    })
                );

                //handle clicking an action button
                $dataHTML.find('.actionbutton').click(function (e) {
                    var $button = $(this);
                    var frameworkAction = $button.attr('data-type') == 'Custom Action'
                        ? MAActionFramework.customActions[$button.attr('data-action')] || null
                        : MAActionFramework.standardActions[$button.attr('data-action')] || null;
    
                    if (frameworkAction) {
                        switch (frameworkAction.Action)
                        {
                            case 'Iframe':
    
                                break;
    
                            case 'NewWindow':
                                var options = {
                                    recString : ''
                                };
                                if(frameworkAction.ActionValue.indexOf('{records}') >= 0) {
                                    options.records = true;
                                }
    
                                var newURL = frameworkAction.ActionValue
                                    + (frameworkAction.ActionValue.indexOf('?') == -1 ? '?noparams' : '')
                                    + '&Button=' + encodeURIComponent(frameworkAction.Label)
                                    + '&RecordId=' + record.record.Id;
                                if(frameworkAction.Options.method == 'GET') {
                                    if(frameworkAction.Options.addRecords) {
                                        newURL += '&'+frameworkAction.Options.paramName+'=' + record.record.Id;
                                    }
                                    window.open(newURL);
                                    break;
                                }
                                else {
    
                                    var postData = {};
    
                                    if(frameworkAction.Options.addRecords) {
                                        postData[frameworkAction.Options.paramName] = record.record.Id;
                                    }
    
                                    openNewWindow('POST', newURL, postData, '_blank');
                                    break;
                                }
    
                            case 'Javascript':
                                var layerObj = {};
                                layerObj[marker.key || 'dlClick'] = [marker];
                                frameworkAction.ActionValue.call(this, {
                                    button: $button,
                                    dataLayers: layerObj,
                                    mode : MA.IsMobile == true ? 'Mobile' : 'Desktop'
                                });
                                break;
    
                            default:
                                break;
                        }
                    }
    
                    //stop the click from getting to the map
                    e.stopPropagation();
                });
    
                tabs.append($dataHTML);
    
                //init tabs
                $tooltipContent.find('.tabs').tabs({
                    activate: function( event, ui ) {
                        setTimeout(function () {
                            MA.Map.InfoBubble.adjust();
                        }, 200);
                    }
                }).find('.ui-tabs-nav')
                .css('white-space','nowrap')
                .css('overflow-x','auto')
                .css('overflow-y','hidden')
                .find('li')
                    .css('display','inline-block')
                    .css('float','none')
                    .css('vertical-align','bottom');
    
            
                //break loop
                return false;
            });
            
            //hide loading and adjust pan
            $tooltipContent.find('.tooltip-loader').hide();
            setTimeout(function () {
                MA.Map.InfoBubble.adjust();
            }, 200);
        }
    },

    //Calls remove layer from the dom
    RemoveLayerFromDom: function(obj, refresh) {
        var dfd = $.Deferred();
        var el = $(obj).closest('.PlottedRowUnit');

        var data = el.data() || {};
        var options = {
            id: data.id,
            key: el.attr('key'),
            uid: el.attr('uid'),
            plotMarkers: el.attr('plot-type') === 'marker',
            refresh : refresh || false,
            name : data.name
        };

        if(!refresh && el.hasClass('loading')) {
            return;
        }
        MADemographicLayer.RemoveLayer(options,function(res) {
            dfd.resolve();
        });
        return dfd.promise();
    },


    //Removes the layer from the map and removes the plotted layer div
    RemoveLayer: function(options, callback) {
        callback = callback || function(){};
        MA.Map.InfoBubble.hide();
        //Get the current element.
        var element = $('#PlottedQueriesTable').find('.PlottedRowUnit[uid="'+options.uid+'"]');
        //Get the key for the next polygon layer.
        var nextKey = null;
        var ii = 0;
        if($('.PlottedRowUnit.DataLayer[plot-type="polygon"]').length > 1) {
            var len = $('.PlottedRowUnit.DataLayer[plot-type="polygon"]').length;

            while(nextKey === null && ii < len) {
                var newKey = $('.PlottedRowUnit.DataLayer[plot-type="polygon"]')[ii].getAttribute('key');

                if(newKey !== options.key) {
                    nextKey = newKey;
                }

                ii++;
            }
        }

        element.addClass('unloading');

        var layerData = element.data() || {};
        var clusterer = layerData.clusterGroup || null;
        if(clusterer !== null) {
            clusterer.clearMarkers();
        }
        if (element.data('heatmapLayer')) {
            element.data('heatmapLayer').setMap(null);
            element.data('heatmapLayer', null);
        }
        //Clears the layer
        if (options.plotMarkers || options.isDMP) {
            //clear the marker layer
            var list = element.data().markers || [];
            for(var jj = list.length-1; jj >= 0; jj--) {

                MA.Map.spiderfier.removeMarker(list[jj]);
                list[jj].setMap(null);

            }
            list = [];

            //clear any parcel boundaries
            var boundaries = element.data('parcelBoundaries');
            $.each(boundaries || [],function(i,layer) {
                layer.find('.btn-remove').click();
            });

        } else {

            //null out the layer
            var elementData = element.data() || {};
            elementData.censusLayer = null;

            //hide any info bubbles
            MA.Map.InfoBubble.hide();

            //actually remove the overlay
            var overlays = MA.map.overlayMapTypes.getArray();
            for(var kk=overlays.length-1; kk >= 0; kk--) {

                if(overlays[kk] !== undefined) {
                    if (overlays[kk].name == options.key) {
                        MA.map.overlayMapTypes.removeAt(kk);
                        //return false;
                    }
                }

            }

        }

        //remove the plottedrowunit
        if(!options.refresh) {
            //if no visible area queries hide refreh button
            if($('#PlottedQueriesTable .visibleOnly').length === 0) {
                $('#visibleAreaRefeshMap').addClass('ready').removeClass('visible');
            }
        }

        // MADemographicLayer.ToggleLayerClick(nextKey);

        callback({success:true});
    },

    getRenderModes: function($plottedLayer) {
        var renderModes = [];
        var onButtons = $plottedLayer.find('.renderButtons-button.on');

        //force cluster for mobile
        if(MA.isMobile) {
            return ['Cluster'];
        }

        //Figure out what render modes we have on.
        $.each(onButtons, function(i,v) {
            renderModes.push(v.getAttribute('data-renderAs'));
        });


        //If we have no render modes and the onButtons do not exist, this is a freshly plotted layer, default to cluster.
        if(onButtons.length === 0 && renderModes.length === 0) {
            renderModes.push('Cluster');
        }

        return renderModes;
    },

    setQueryDisplayDropDown: function(options) {
        /*
         options = {
         plottedLayer: the plotted layer,
         renderModes: the render modes array
         }
         */

        var $plottedLayer = options.plottedLayer || null;
        var plotClusters = jQuery.inArray("Cluster", options.renderModes || []) > -1;
        var plotMarkers = jQuery.inArray("Markers", options.renderModes || []) > -1;

        if($plottedLayer !== null) {

            $plottedLayer.find('.plotted-visibile-icon').find('.MAIcon').hide();
            $plottedLayer.find('.multi-select').html('');
            $plottedLayer.find('.select-icon').hide();

            if (!options.modify) {
                $plottedLayer.find('.edit-query').remove();
            }

            if(plotClusters) {
                $plottedLayer.find('.cluster').addClass('on');
                $plottedLayer.find('.select-icon').addClass('Cluster').show();
                $plottedLayer.find('.renderButtons-button.cluster').closest('li').addClass('active');
            }
            else {
                $plottedLayer.find('.cluster').removeClass('on');
                $plottedLayer.find('.select-icon').removeClass('Cluster').show();
                $plottedLayer.find('.renderButtons-button.cluster').closest('li').removeClass('active');
            }





            if(plotMarkers) {
                $plottedLayer.find('.marker').addClass('on');
                $plottedLayer.find('.select-icon').addClass('Markers').show();
                $plottedLayer.find('.renderButtons-button.markers').closest('li').addClass('active');
            }
            else {
                $plottedLayer.find('.marker').removeClass('on');
                $plottedLayer.find('.select-icon').removeClass('Markers').show();
                $plottedLayer.find('.renderButtons-button.markers').closest('li').removeClass('active');
            }



            if(plotClusters && plotMarkers) {
                $plottedLayer.find('.multi-select').html('<svg class="svg-circle-num" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><g><circle cx="10" cy="10" fill="#28a2ff" id="svg_1" r="8.83163" stroke="#f9f9f9" stroke-width="2"></circle><text fill="#f9f9f9" font-family="Monospace" font-size="18" id="svg_2" stroke="#f9f9f9" stroke-width="0" text-anchor="middle" transform="matrix(0.7992677323256553,0,0,0.6748139102469572,3.3995968056728256,7.2131973728906305) " x="8.3" xml:space="preserve" y="10">2</text></g></svg>');
                $plottedLayer.find('.select-icon').hide();
            }
            else if(!plotClusters && !plotMarkers) {
                $plottedLayer.find('.plotted-visibile-icon').find('.ma-icon').removeClass('ma-icon-preview').addClass('ma-icon-hide').show();
            }

        }
    },

    rerenderDataLayer: function($plottedLayer, options, callback) {
        options = $.extend({
            renderModes : []
        }, options || {});

        // var renderModes = MADemographicLayer.getRenderModes($plottedLayer);
        var renderModes = options.renderModes;

        var renderCluster = false;
        var renderMarkers = false;
        var renderHeatMapDataPoints = false;
        for(var i = 0,len = renderModes.length; i < len; i++) {
            var mode = renderModes[i];
            if(mode == 'Cluster') {
                renderCluster = true;
                $plottedLayer.find('#select-hide').prop('checked',true);
                
                $plottedLayer.find('.renderButtons-button[data-renderas="Cluster"]').addClass('on').closest('.item-selectable').addClass('active');
                $plottedLayer.find('.select-icon').addClass(mode);
                renderMarkers = false;
                $plottedLayer.find('.renderButtons-button[data-renderas="Markers"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Markers');
                $plottedLayer.find('.renderButtons-button[data-renderas="Heatmap"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Heatmap');
                break;
            }
            else if (mode == 'Markers') {
                renderMarkers = true;
                $plottedLayer.find('#select-hide').prop('checked',true);
                $plottedLayer.find('.renderButtons-button[data-renderas="Markers"]').addClass('on').closest('.item-selectable').addClass('active');
                $plottedLayer.find('.select-icon').addClass(mode);
                renderCluster = false;
                $plottedLayer.find('.renderButtons-button[data-renderas="Cluster"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Cluster');
                renderHeatMapDataPoints = false;
                $plottedLayer.find('.renderButtons-button[data-renderas="Heatmap"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Heatmap');
                break;
            }
            else if (mode == 'Heatmap') {
                renderHeatMapDataPoints = true;
                $plottedLayer.find('#select-hide').prop('checked',true);
                $plottedLayer.find('.renderButtons-button[data-renderas="Heatmap"]').addClass('on').closest('.item-selectable').addClass('active');
                $plottedLayer.find('.select-icon').addClass(mode);
                renderCluster = false;
                $plottedLayer.find('.renderButtons-button[data-renderas="Cluster"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Cluster');
                renderMarkers = false;
                $plottedLayer.find('.renderButtons-button[data-renderas="Markers"]').removeClass('on').closest('.item-selectable').removeClass('active');
                $plottedLayer.find('.select-icon').removeClass('Markers');
                break;
            }
        }
        
        //only rendering clusters or markers, not both at one time

        callback = callback || function(){};
        //collect data about the records that need to be processed and rendered
        var markerProcessingBatchSize = MA.Map.hitTestShapeMgr.hasShapes()
            ? getProperty($,'.browser.webkit',false) || buildBrowserWebKit()
            ? 500
            : 20
            : 1000;
        var markerProcessingTimeout = 1;
        var clusterMarkers = [];
        var heatMapDataPoints = [];
        var layerData = $plottedLayer.data() || {};
        var recordsToProcess = layerData.records || {};
        var markerUniqueIdList = Object.keys(recordsToProcess);
        var totalMarkerCount = markerUniqueIdList.length;

        //get legend Data
        var legend = $plottedLayer.data('legend') || {title: 'Legend', subTitle:'', rows:{}};
        // clear totals
        var rows = legend.rows;
        var keys = Object.keys(rows)
        for(var r = 0; r < keys.length; r++) {
            var rowId = keys[r];
            var row = rows[rowId];
            
            row.rowId = row.values == '--Other--' || row.values == window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Other ? 'row-other' : 'row-'+r;
            var $row;
            if(!MA.isMobile) {
                $row = $plottedLayer.find('.legend-row[uid="'+rowId+'"]');
            }
            row.totalmarkers = 0;
            row.count = 0;
        }

        var totals = {
            markers : 0
        };

        //What is the deal with the proximity? Inverted or no?
        var invertProximity = getProperty(userSettings || {}, 'InvertProximity', false) || false;

        setTimeout(function doBatch() {

            if (markerUniqueIdList.length > 0)
            {

                //status update
                $plottedLayer.find('.status').text(formatLabel(MASystem.Labels.Layers_Processing_Remaining, [markerUniqueIdList.length]));

                var recordsProcessed = 0;
                while (recordsProcessed < markerProcessingBatchSize && markerUniqueIdList.length > 0)
                {
                    recordsProcessed++;

                    var uniqueId = markerUniqueIdList.shift();
                    var record = recordsToProcess[uniqueId];

                    //check for position and if we need to check prox options
                    if (record.position) {
                        //update legend totals
                        var legendRow = record.data.rowid.toLowerCase();
                        var mlegend = rows[legendRow];
                        if(mlegend !== undefined && mlegend.active) {
                            mlegend.totalmarkers++;
                            if (MA.Map.hitTestShapeMgr.hasShapes())
                            {

                                //loop through all prox objects to see if this marker falls inside or outside
                                var isInsideProxObject = MA.Map.hitTestShapeMgr.containsLatLng(record.markerCoordinate);

                                //determine if we should continue based on whether or not prox visibility has been inverted or this query has prox enabled
                                if ( (invertProximity && isInsideProxObject) || (!invertProximity && !isInsideProxObject) )
                                {
                                    //we should not plot this marker so continue to the next one
                                    record.isVisible = false;
                                    //record.isClustered = false;
                                    continue;
                                }
                            }

                            //if we made it this far, then we should render this marker (still check proximity options to ensure markers aren't hidden)
                            mlegend.count++;
                            totals.markers++;
                            //adjusting the cluster below for markers or clusters
                            record.isVisible = true;
                            clusterMarkers.push(record.clusterMarker);//for right now I am going to have them always push to the clusterMarkers so the data stays.
                            if(renderHeatMapDataPoints) {
                                if(record.position != undefined && record.position != null) {                                    
                                    heatMapDataPoints.push(new google.maps.LatLng(record.position.lat,record.position.lng));
                                }
                            }
                        }
                    }
                }

                //set a timeout to process the next batch
                setTimeout(doBatch, markerProcessingTimeout);
            } else {
                var dpCount = clusterMarkers.length || heatMapDataPoints.length;
                $plottedLayer.find('.status').text(MASystem.Labels.MA_Data_Points +': ' + dpCount);

                //if we are displaying a heat map we want to make sure that we remove it.
                if ($plottedLayer.data('heatmapLayer')) {                    
                    $plottedLayer.data('heatmapLayer').setMap(null);
                    $plottedLayer.data('heatmapLayer', null);
                }
                if(renderCluster) {
                    //if markers, do not cluster, but still use the cluster group
                    layerData.clusterGroup.addMarkers(clusterMarkers);
                    layerData.clusterGroup.setMaxZoom(22);
                    layerData.clusterGroup.setMap(MA.map);
                    layerData.clusterGroup.repaint();
                }
                else if(renderHeatMapDataPoints){
                    //If we want to see a heat map this is where the datapoints we add earlier are made into the heat map
                    $plottedLayer.data('numHeatmapDataPoints', heatMapDataPoints.length);
                    layerData.clusterGroup.clearMarkers();
                        $plottedLayer.data('heatmapLayer', new google.maps.visualization.HeatmapLayer({
                            map: MA.map,
                            data: heatMapDataPoints,
                            dissipating: true,
                            radius: 15,
                            opacity: 0.8,
                            maxIntensity: 5,
                            gradient: ['rgba(0,0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,255)', 'rgb(0,255,0)', 'yellow', 'rgb(255,0,0)'],
                            $plottedLayer: $plottedLayer,
                        }));
                } else {
                    //if markers, do not cluster, but still use the cluster group
                    layerData.clusterGroup.addMarkers(clusterMarkers);
                    layerData.clusterGroup.setMaxZoom(5);
                    layerData.clusterGroup.setMap(MA.map);
                    layerData.clusterGroup.repaint();
                }

                //update the acutal legend obj
                var legendRowKeys = Object.keys(rows);
                for(var rl = 0; rl < legendRowKeys.length; rl++) {
                    var prop = legendRowKeys[rl];
                    var row = rows[prop];
                    if(!MA.isMobile) {
                        var $row = $plottedLayer.find('.legend-row[uid="'+row.legendId+'"]');
                        $row.find('.visiblemarkers').text(row.count);
                        $row.find('.totalmarkers').text(row.totalmarkers);
                        if(row.totalmarkers === 0) {
                            // update the legend rows
                            $row.addClass('empty').hide();
                        }
                    }
                }

                //update info
                $plottedLayer.find('.status').html(window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Records,[MA.Util.formatNumberString(totalMarkerCount)]));
                //   $(infoHTML).insertAfter($plottedLayer.find('.status'));

                if(renderCluster || renderMarkers || renderHeatMapDataPoints) {
                    $plottedLayer.find('.select-icon').show();
                    $plottedLayer.find('.ma-icon-hide').hide();
                }

                //show the show all drop down
                $plottedLayer.find('.legend-moreless-checkbox').hide();
                $plottedLayer.find('.legend-moreless-wrapper').show();
                $plottedLayer.find('.legend-showhide').hide();

                callback({ done:true });

            }
        }, markerProcessingTimeout);
    },

    //Handles clicks on the map
    //HandleClick: function(e, markerData, marker, key, options) {
    HandleClick: function(options) {
        options = $.extend({
            isMobile : false,
            key : '',
            layerName : 'Data Layer'
        }, options || {});

        var clickLocation = this;
        var $tooltipContent;

        try{
            if(Plotting.mobile.previousMarker) {
                Plotting.mobile.previousMarker.marker.setIcon(Plotting.mobile.previousMarker.icon);
            }

            if(ArcGIS.styleOverridedLayer) {
                ArcGIS.styleOverridedLayer.revertStyle();
                ArcGIS.styleOverridedLayer = null;
            }
        }
        catch(e){}

        var lat;
        var lng;
        var key = options.key;
        var markerData;
        var clickPos;

        if(options.type === 'shape') {


            lat = clickLocation.latLng.lat();
            lng = clickLocation.latLng.lng();

            var latLng = { latitude: lat, longitude: lng, lat: lat, lng: lng };
            clickPos = latLng;
        }
        else {
            clickPos = clickLocation.getPosition();
            lat = clickPos.lat();
            lng = clickPos.lng();
            var markerInfo = clickLocation.data || {};
            markerData = markerInfo.marker || {};
        }

        var $mobileLoadingMessage = MAToastMessages.showLoading({message: MASystem.Labels.Layers_Mobile_Build_Layer_Element_Title, subMessage: MASystem.Labels.Layers_Getting_Data_Layer_Details,timeOut:0,extendedTimeOut:0});

        //create a new info bubble and show loading
        $tooltipContent = $('#tooltip-demographic-template').clone().attr('id', 'tooltip-content').addClass('demographics').show();
        $tooltipContent.find('.layerName').text(htmlDecode(options.layerName));
        $tooltipContent.find('.tooltip-loader').show();

        if(markerData === null || markerData === undefined) {
            var opts = {
                method  : 'get',
                action  : 'click',
                subType : 'tile',
                version : '2'
            };
            
            var params = {
                'lat' : lat,
                'lng' : lng,
                'key' : key
            }
            Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
                opts,
                params,
                function(res, event){
                    MAToastMessages.hideMessage($mobileLoadingMessage);
                    if(event.status) {       
                        if(res && res.success) {
                            var data = res.data;
                            if(data && data.header){
                                if(Object.keys(data.header).length === 0) return;
                            }
                            MADemographicLayer.BuildHeader_Shape(data.header, $tooltipContent, options);
                            MADemographicLayer.BuildTabs_Shape(data.tabs, $tooltipContent);
                            if(MA.isMobile) {
                                //move to the marker info view
                                // MALayers.moveToTab('markerInfo');
        
                                var noButtonHTML = '<button class="action-bar-button"><div class="ma-icon"></div>No Actions Available</button>';
                                $tooltipContent.find('.action-bar-wrap').html(noButtonHTML);
        
        
                                //move the map depending on orientation;
                                if($('#mapWrapSelector').width() < 769) {
                                    MA.map.setCenter({lat:lat,lng:lng});
                                    var panByPixels = $('#mapWrapSelector').height()*0.25;
                                    MA.map.panBy(0,panByPixels);
                                }
                                else {
                                    MA.map.setCenter({lat:lat,lng:lng});
                                    var panByPixels2 = $('#mapWrapSelector').height()*0.25;
                                    MA.map.panBy(-panByPixels2,0);
                                }
                            }
                            else {
                                MA.demographicsInfoBubble = MA.Map.InfoBubble.show({
                                    position: clickPos,
                                    minWidth: 200,
                                    content: $tooltipContent.get(0)
                                });
        
                                //init tabs
                                if(options.isMobile) {
                                    $tooltipContent.find('.tabs').navbar().find('a').each(function () {
                                        $(this).click(function () {
                                            $tooltipContent.find('.navbar a').removeClass('ui-btn-active').filter(this).addClass('ui-btn-active');
                                            $tooltipContent.find('.pane').css({ height: '0', padding: '0' });
                                            $tooltipContent.find($(this).attr('data-pane')).css({ height: 'auto', padding: '10px' });
                                            MA.Map.InfoBubble.adjust();
                                        });
                                    });
                                    $tooltipContent.find('.navbar a').first().click()
                                }
                                else {
                                    $tooltipContent.find('.tabs').tabs({
                                        activate: function( event, ui ) {
                                            setTimeout(function () {
                                                try {
                                                    MA.Map.InfoBubble.adjust();
                                                }
                                                catch (err) {}
                                            }, 500);
                                        }
                                    }).find('.ui-tabs-nav')
                                    .css('white-space','nowrap')
                                    .css('overflow-x','auto')
                                    .css('overflow-y','hidden')
                                    .find('li')
                                        .css('display','inline-block')
                                        .css('float','none')
                                        .css('vertical-align','bottom');
                                }
        
                                //hide loading and adjust pan
                                $tooltipContent.find('.tooltip-loader').hide();
                                MA.Map.InfoBubble.adjust();
                            }
                        }
                        else {
                            var errMsg = res != undefined ? (res.message || MASystem.Labels.Common_Refresh_And_Try_Again) : MASystem.Labels.Common_Refresh_And_Try_Again;
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:errMsg,timeOut:0, closeButton:true, extendedTimeOut: 0});
                        }
                    }
                    else {
                        var errMsg = event.message || MASystem.Labels.Common_Refresh_And_Try_Again;
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:errMsg,timeOut:0, closeButton:true, extendedTimeOut: 0});
                    }
                },{buffer:false,timeout:120000}
            );

        } else {
            MAToastMessages.hideMessage($mobileLoadingMessage);
            MA.demographicsInfoBubble = MA.Map.InfoBubble.show({
                position: clickPos,
                minWidth: 500,
                content: $tooltipContent.get(0),
                anchor: clickLocation,
                markerData: markerData
            });


            MADemographicLayer.BuildHeader(markerData.header, $tooltipContent, options);


            MADemographicLayer.BuildTabs(markerData.tabs, $tooltipContent);

            if(clickLocation) {

                var dlLayout = userSettings.ButtonSetSettings.dataLayerLayout || JSON.parse('[{"Label":"Actions","Columns":[[{"Action":"Add to Trip","Label":"'+MASystem.Labels.ActionFramework_Add_to_Trip+'","Type":"Standard Action"},{"Action":"Remove Marker","Label":"' + MASystem.Labels.Context_Remove_Marker + '","Type":"Standard Action"}],[{"Label":"Set Proximity Center","Type":"Standard Action"},{"Label":"Street View","Type":"Standard Action"}],[{"Label":"Create Record","Type":"Standard Action"}]]}]');

                
                var tabs = $tooltipContent.find('#madata-tabs');
                var tabURL = options.isMobile == false ? "#tab-buttonActions" : "#" ;
                tabs.find('ul').append('<li><a data-pane="#tab-buttonActions" href="'+tabURL+'">Actions</a></li>');
                var $dataHTML = $('<div id="tab-buttonActions" class="layout-tooltip pane"></div>');

                $dataHTML.html(MAActionFramework.buildLayoutFromContents(dlLayout, {
                        markerType: 'DataLayer'
                    })
                );

                //handle clicking an action button
                $dataHTML.find('.actionbutton').click(function (e) {
                    var $button = $(this);
                    var frameworkAction = $button.attr('data-type') == 'Custom Action'
                        ? MAActionFramework.customActions[$button.attr('data-action')] || null
                        : MAActionFramework.standardActions[$button.attr('data-action')] || null;

                    if (frameworkAction) {
                        switch (frameworkAction.Action)
                        {
                            case 'Iframe':
                                break;

                            case 'NewWindow':
                                break;

                            case 'Javascript':
                                var layerObj = {};
                                var marker = clickLocation;
                                layerObj[marker.layerUID || 'dlClick'] = [marker];
                                frameworkAction.ActionValue.call(this, {
                                    button: $button,
                                    dataLayers: layerObj,
                                    mode : MA.IsMobile == true ? 'Mobile' : 'Desktop'
                                });
                                break;

                            default:
                                break;
                        }
                    }

                    //stop the click from getting to the map
                    e.stopPropagation();
                });

                tabs.append($dataHTML);
            }

            //init tabs
            $tooltipContent.find('.tabs').tabs({
                activate: function( event, ui ) {
                    setTimeout(function () {
                        try {
                            var $bubble = $(MA.demographicsInfoBubble.content);
                            var height = $bubble.height();
                            var oldHeight = parseFloat($bubble.attr('data-height')) || 0;
                            $bubble.attr('data-height',height);
                            setTimeout(function () {
                                try {
                                    MA.Map.InfoBubble.adjust();
                                }
                                catch (err) {}
                            }, 500);

                        } catch (err) {}
                    }, 200);
                }
            }).find('.ui-tabs-nav')
            .css('white-space','nowrap')
            .css('overflow-x','auto')
            .css('overflow-y','hidden')
            .find('li')
                .css('display','inline-block')
                .css('float','none')
                .css('vertical-align','bottom');

            //hide loading and adjust pan
            $tooltipContent.find('.tooltip-loader').hide();
            setTimeout(function () {
                try {
                    MA.Map.InfoBubble.adjust();
                }
                catch (err) {}
            }, 500);
        }
    },

    removeDataLayerMarker: function(options) {
        var $dfd = $.Deferred();

        options = $.extend({
            markers : [],
            markers2 : [],
        }, options || {});

        if(!options.layer) {
            return;
        }
        
        try {
            MA.Map.spiderfier.unspiderfy();
        }
        catch(e){}
        
        //data layers are always clusters now

        var $plottedLayer = options.layer;
        var renderCluster = $plottedLayer.find('.renderButtons-button.cluster').hasClass('on');
        var renderMode = renderCluster ? 'Cluster' : 'Markers'
        var layerData = $plottedLayer.data() || {};
        var dlMarkers = layerData.records || {};
        var clusterGroup = layerData.clusterGroup;
        if(true) {
            clusterGroup.clearMarkers();
        }
        //loop over markers and remove them
        var markers = options.markers;
        for(var i = 0, len = markers.length; i < len; i++) {
            var markerId = markers[i];

            //let's find this markerid in the records
            if(dlMarkers.hasOwnProperty(markerId)) {
                var record = dlMarkers[markerId];

                //unrender the marker and cluster marker
                try {record.clusterMarker.setMap(null);} catch(e){}
                // try {record.marker.setMap(null);} catch(e){}

                //delete the record info
                delete dlMarkers[markerId];
            }
        }

        if(true) {
            MADemographicLayer.unrenderDataLayer($plottedLayer,{modes: [renderMode]},function() {
                MADemographicLayer.rerenderDataLayer($plottedLayer,{renderModes: [renderMode]},function() {
                    $dfd.resolve({success:true});
                });
            });
        }

        return $dfd.promise();
    },

    updateDataLayerInfo: function(options) {
        var $plottedLayer = options.layer;
        var legendData = $plottedLayer.data('legend');
        legendData = legendData.rows || [];
        //loop over rows for dl and update
        for(legendId in options.rows) {
            var rowInfo = options.rows[legendId];
            var $legendRow = $plottedLayer.find('.legend-row[uid="'+legendId+'"]');
            var visible = parseFloat($legendRow.find('.visiblemarkers').text());
            var total = parseFloat($legendRow.find('.totalmarkers').text());
            $legendRow.find('.visiblemarkers').text(visible-rowInfo.visibleTotal);
            $legendRow.find('.totalmarkers').text(total-rowInfo.total);
            $plottedLayer.find('.plottinginfo-wrapper .status').text(MASystem.Labels.MA_Data_Points +': ' + (total - rowInfo.total));
        }
    },

    //Builds and appends the HTML for the info bubble header
    BuildHeader: function(headerData, $element, options) {
        options = $.extend({
            layerName : MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer
        }, options || {});
        var newHTML = '';
        // XXX: REMOVE ME?
        //var colon = (headerData.label != null && headerData.label !== '' && headerData.formatted_value != null && headerData.formatted_value !== '') ? ':' : '';

        if(MA.isMobile) {
            //update the main header
            $element.find('.recordName').html(htmlEncode(options.layerName) + '<div class="ma-top-bar-subtext recordAddress">Layer Info</div>');

            var $tabBody = $element.find('.ma-tab-content-group').empty();
            // XXX: REMOVE ME?
            /*newHTML += '<div class="ma-tab-content active" id="dataLayerHeader">'
            newHTML += '<div class="tooltip-segment-item"><label>'+ headerData.label + colon +'</label>'+ headerData.value +'</div>';*/

            var len = headerData.length;
            newHTML += '<div class="ma-tab-content active" id="dataLayerHeader">';
            for(var ii=0; ii<len; ii++) {
                var headRow = headerData[ii];
                var colon = (headRow.label !== '' && headRow.formatted_value !== '') ? ':' : '';
                newHTML += '<div class="tooltip-segment-item"><label>'+  htmlEncode(headRow.label) + colon + '</label>' + htmlEncode(headRow.formatted_value) +'</div>';
            }
            newHTML += '</div>';
            $tabBody.append(newHTML);
        }
        else {

            //add in the single topic-specific header
            // XXX: REMOVE ME?
            //newHTML += '<tr><td style="font-weight:bold; font-size: 12px; ">' + headerData.label + colon + '</td><td style="font-size: 12px;">' + headerData.value + '</td></tr>';

            //handle all of the levels: state, county, etc.
            var len = headerData.length;
            for(var ii=0; ii<len; ii++) {
                var headRow = headerData[ii];
                newHTML += '<tr><td style="font-weight:bold; font-size: 11px; ">' + headRow.label + ':</td><td style="font-size: 11px;">' + headRow.formatted_value + '</td></tr>';
            }

            $element.find( '.tooltip-table' ).append( newHTML );
        }
    },
    BuildHeader_Shape: function(headerData, $element, options) {
        var newHTML = '';
        var colon = (headerData.label != null && headerData.label !== '' && headerData.formatted_value != null && headerData.formatted_value !== '') ? ':' : '';

        if(MA.isMobile) {
            //update the main header
            $element.find('.recordName').html(htmlEncode(options.layerName) + '<div class="ma-top-bar-subtext recordAddress">Layer Info</div>');

            var $tabBody = $element.find('.ma-tab-content-group').empty();

            newHTML += '<div class="ma-tab-content active" id="dataLayerHeader">';
            newHTML += '<div class="tooltip-segment-item"><label>'+  (headerData.label || '') + colon + '</label>' + (headerData.formatted_value || '') +'</div>';

            //handle all of the levels: state, county, etc.
            var headerLevels = getProperty(headerData,'levels',false) || [];
            var len = headerLevels.length;
            for(var ii=0; ii<len; ii++) {
                var headRow = headerData.levels[ii];
                var colon = (headRow.label !== '' && headRow.formatted_value !== '') ? ':' : '';
                newHTML += '<div class="tooltip-segment-item"><label>'+  headRow.label + colon + '</label>' + headRow.formatted_value +'</div>';
            }
            newHTML += '</div>';
            $tabBody.append(newHTML);
        }
        else {
            //add in the single topic-specific header
            newHTML += '<tr><td style="font-weight:bold; font-size: 12px; ">' + htmlEncode(headerData.label || '') + colon + '</td><td style="font-size: 11px;">' + (htmlEncode(headerData.formatted_value || '')) + '</td></tr>';
            
            //handle all of the levels: state, county, etc.
            var headerLevels = getProperty(headerData,'levels',false) || [];
            var len = headerLevels.length;
            for(var ii=0; ii<len; ii++) {
                newHTML += '<tr><td style="font-weight:bold; font-size: 11px; ">' + htmlEncode(headerLevels[ii].label) + ':</td><td style="font-size: 11px;">' + htmlEncode(headerLevels[ii].formatted_value) + '</td></tr>';
            }
            $element.find( '.tooltip-table' ).append( newHTML );
        }
    },

    BuildTabsV2: function(tabData, $element,options) {
        tabData = tabData || [];
        options = $.extend({
            isMobile : false
        }, options || {});

        if(MA.isMobile) {
            var len = tabData.length;
            var mobileTabs = '';
            var mobileTabsBody = '';
            var tabLength = 0;
            var $dataLayerActionSheet = $('#dataLayerActionSheet .ma-action-sheet').empty();
            mobileTabs += '<button class="ma-button active ma-tab-link" data-tab="dataLayerHeader">Header</button>';
            for(var ii=0; ii<len; ii++) {
                var tabInfo = tabData[ii];
                if(tabInfo.values.length > 0) {
                    if(tabLength < 2) {
                        mobileTabs += '<button class="ma-button ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</button>';
                    }
                    else if (tabLength === 2) {
                        mobileTabs += '<button action-sheet="dataLayerActionSheet" id="dataLayerMoreButton" class="ma-button action-bar-button open-marker-action-sheet open-action-sheet">More</button>';
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</div>');
                    }
                    else {
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</div>');
                    }

                    mobileTabsBody += '<div class="ma-tab-content" id="'+tabInfo.id+'">';
                    var valCount = tabInfo.values.length;
                    for(var jj=0; jj<valCount; jj++) {
                        var tabValue = tabInfo.values[jj];
                        mobileTabsBody += '<div class="tooltip-segment-item"><label>'+  htmlEncode(tabValue.label) + '</label>' + htmlEncode(tabValue.formatted_value) +'</div>';
                        //dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + tabData[ii].values[jj].label + ':</td><td style="float:left; font-size: 12px;">' + tabData[ii].values[jj].formatted_value + '</td></tr>';
                    }
                    tabLength++;
                    mobileTabsBody += '</div>';
                }
            }
            if(tabLength >= 3) {
                // mobileTabs += '</ul></div></div>';
            }
            $element.find('.ma-tab-link-group').empty().append(mobileTabs);
            $element.find('.ma-tab-content-group').append(mobileTabsBody);
        }
        else {
            var tabs = $element.find('#madata-tabs');

            //handle all of the tabs.
            var len = tabData.length;
            for(var ii=0; ii<len; ii++) {
                var tab = tabData[ii];
                var hrefURL = "#tab-" + tab.tab_id;
                var dataPaneInfo = tab.tab_id;
                tabs.find('ul').append('<li><a data-pane="'+hrefURL+'" href="' + hrefURL + '">' + htmlEncode(tab.tab_label) + '</a></li>');
                var dataHTML = '<div class="pane" id="tab-' + dataPaneInfo + '"><table id="'+ dataPaneInfo + '-table">';
                var tab_Data = tab.data || [];
                var valCount = tab_Data.length;
                for(var jj=0; jj<valCount; jj++) {
                    var td = tab_Data[jj];
                    dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + htmlEncode(td.label) + ':</td><td style="float:left; font-size: 12px;">' + htmlEncode(td.formatted_value) + '</td></tr>';
                }
                dataHTML += '</table></div>';
                tabs.append(dataHTML);
            }
        }
    },

    //Builds and appends the tab data to the proper tabs
    BuildTabs: function(tabData, $element,options) {
        tabData = tabData || [];
        options = $.extend({
            isMobile : false
        }, options || {});

        if(MA.isMobile) {
            var len = tabData.length;
            var mobileTabs = '';
            var mobileTabsBody = '';
            var tabLength = 0;
            var $dataLayerActionSheet = $('#dataLayerActionSheet .ma-action-sheet').empty();
            mobileTabs += '<button class="ma-button active ma-tab-link" data-tab="dataLayerHeader">Header</button>';
            for(var ii=0; ii<len; ii++) {
                var tabInfo = tabData[ii];
                //if(getProperty(tabInfo,'values.length') > 0) {
                    if(tabLength < 2) {
                        mobileTabs += '<button class="ma-button ma-tab-link" data-tab="'+tabInfo.tab_id+'">' + htmlEncode(tabInfo.tab_label) + '</button>';
                    }
                    else if (tabLength === 2) {
                        mobileTabs += '<button action-sheet="dataLayerActionSheet" id="dataLayerMoreButton" class="ma-button action-bar-button open-marker-action-sheet open-action-sheet">More</button>';
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.tab_id+'">' + htmlEncode(tabInfo.tab_label) + '</div>');
                    }
                    else {
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.tab_id+'">' + htmlEncode(tabInfo.tab_label) + '</div>');
                    }

                    mobileTabsBody += '<div class="ma-tab-content" id="'+tabInfo.tab_id+'">';
                    
                    
                    var innerTabData = tabInfo.data || [];
                    var valCount = innerTabData.length;
                    for(var jj=0; jj<valCount; jj++) {
                        var tabValue = innerTabData[jj];
                        var colon = (tabValue.label !== '' && tabValue.formatted_value !== '') ? ':' : '';
                        mobileTabsBody += '<div class="tooltip-segment-item"><label>'+  htmlEncode(tabValue.label) + colon + '</label>' + htmlEncode(tabValue.formatted_value) +'</div>';
                        //dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + tabData[ii].values[jj].label + ':</td><td style="float:left; font-size: 12px;">' + tabData[ii].values[jj].formatted_value + '</td></tr>';
                    }
                    tabLength++;
                    mobileTabsBody += '</div>';
                //}
            }
            if(tabLength >= 3) {
                // mobileTabs += '</ul></div></div>';
            }
            $element.find('.ma-tab-link-group').empty().append(mobileTabs);
            $element.find('.ma-tab-content-group').append(mobileTabsBody);
        }
        else {
            var tabs = $element.find('#madata-tabs');

            //handle all of the tabs.
            var len = tabData.length;
            for(var ii=0; ii<len; ii++) {
                var tab = tabData[ii] || {};
                var innerTabData = tab.data || [];
                var hrefURL = "#tab-" + tab.tab_id;
                tabs.find('ul').append('<li><a data-pane="#tab-' + tab.tab_id+'" href="' + hrefURL + '">' + htmlEncode(tab.tab_label) + '</a></li>');
                var dataHTML = '<div class="pane" id="tab-' + tab.tab_id + '"><table id="'+ tab.tab_id + '-table">';

                var valCount = innerTabData.length;
                for(var jj=0; jj<valCount; jj++) {
                    var tabRow = innerTabData[jj];
                    var formattedValue = htmlEncode(tabRow.formatted_value);
                    if (tabRow.formatted_value && typeof tabRow.formatted_value === 'string' && tabRow.formatted_value.indexOf('href=') > -1) {
                        var encodedValue = htmlEncode(tabRow.value);
                        var httpsPrefix = 'https://';
                        if (encodedValue.substring(0,8) === 'https://' || encodedValue.substring(0,7) === 'http://') { 
                            httpsPrefix = '';
                        }
                        formattedValue = '<a href="'+httpsPrefix+encodedValue+'" target="_blank">'+encodedValue+'</a>';
                    }
                    dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + htmlEncode(tabRow.label) + ':</td><td style="float:left; font-size: 12px;">' + formattedValue + '</td></tr>';
                }
                dataHTML += '</table></div>';
                tabs.append(dataHTML);
            }
        }
    },

    BuildTabs_Shape: function(tabData, $element) {
        tabData = tabData || [];

        if(MA.isMobile) {
            var len = tabData.length;
            var mobileTabs = '';
            var mobileTabsBody = '';
            var tabLength = 0;
            var $dataLayerActionSheet = $('#dataLayerActionSheet .ma-action-sheet').empty();
            mobileTabs += '<button class="ma-button active ma-tab-link" data-tab="dataLayerHeader">Header</button>';
            for(var ii=0; ii<len; ii++) {
                var tabInfo = tabData[ii];
                //if(getProperty(tabInfo,'values.length') > 0) {
                    if(tabLength < 2) {
                        mobileTabs += '<button class="ma-button ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</button>';
                    }
                    else if (tabLength === 2) {
                        mobileTabs += '<button action-sheet="dataLayerActionSheet" id="dataLayerMoreButton" class="ma-button action-bar-button open-marker-action-sheet open-action-sheet">More</button>';
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</div>');
                    }
                    else {
                        $dataLayerActionSheet.append('<div class="ma-action-sheet-item ma-tab-link" data-tab="'+tabInfo.id+'">' + htmlEncode(tabInfo.name) + '</div>');
                    }

                    mobileTabsBody += '<div class="ma-tab-content" id="'+tabInfo.id+'">';
                    
                    
                    var innerTabData = tabInfo.values || [];
                    var valCount = innerTabData.length;
                    for(var jj=0; jj<valCount; jj++) {
                        var tabValue = innerTabData[jj];
                        var colon = (tabValue.label !== '' && tabValue.formatted_value !== '') ? ':' : '';
                        mobileTabsBody += '<div class="tooltip-segment-item"><label>'+  htmlEncode(tabValue.label) + colon + '</label>' + htmlEncode(tabValue.formatted_value) +'</div>';
                        //dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + tabData[ii].values[jj].label + ':</td><td style="float:left; font-size: 12px;">' + tabData[ii].values[jj].formatted_value + '</td></tr>';
                    }
                    tabLength++;
                    mobileTabsBody += '</div>';
                //}
            }
            if(tabLength >= 3) {
                // mobileTabs += '</ul></div></div>';
            }
            $element.find('.ma-tab-link-group').empty().append(mobileTabs);
            $element.find('.ma-tab-content-group').append(mobileTabsBody);
        }
        else {
            //handle all of the tabs.
            var tabs = $element.find('#madata-tabs');
            var len = tabData.length;
            for(var ii=0; ii<len; ii++) {
                if(tabData[ii].values.length > 0) {
                    tabs.find('ul').append('<li><a href="#tab-' + tabData[ii].id + '">' + htmlEncode(tabData[ii].name) + '</a></li>');
                    var dataHTML = '<div id="tab-' + tabData[ii].id + '"><table id="'+ tabData[ii].id + '-table">';
                    
                    var valCount = tabData[ii].values.length;
                    for(var jj=0; jj<valCount; jj++) {
                        dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + htmlEncode(tabData[ii].values[jj].label) + ':</td><td style="float:left; font-size: 12px;">' + htmlEncode(tabData[ii].values[jj].formatted_value) + '</td></tr>';
                    }
                    
                    dataHTML += '</table></div>';
                    
                    tabs.append(dataHTML);
                }
            }
        }
    },

    //Builds and appends the HTML for the info bubble header
    BuildMobileHeader: function(headerData, $element) {
        var newHTML = [];

        //add in the single topic-specific header
        newHTML.push(htmlEncode(headerData.label + ': ' + headerData.value));

        //handle all of the levels: state, county, etc.
        var len = headerData.levels.length;
        for(var ii=0; ii<len; ii++) {
            newHTML.push(htmlEncode(headerData.levels[ii].label + ': ' + headerData.levels[ii].value));
        }

        $element.find( '.name' ).html( newHTML.join(' <br /> ') );
    },

    //Builds and appends the tab data to the proper tabs
    BuildMobileTabs: function(tabData, $element) {
        var tabs = $element.find( '.navbar' );

        //handle all of the tabs.
        var len = tabData.length;
        for(var ii=0; ii<len; ii++) {
            if(tabData[ii].values.length > 0) {
                tabs.find('ul').append('<li><a href="#tab-' + tabData[ii].id + '">' + htmlEncode(tabData[ii].name) + '</a></li>');
                var dataHTML = '<div id="tab-' + tabData[ii].id + '"><table id="'+ tabData[ii].id + '-table">';

                var valCount = tabData[ii].values.length;
                for(var jj=0; jj<valCount; jj++) {
                    dataHTML += '<tr><td style="font-weight:bold; font-size: 12px; padding-right:10px">' + htmlEncode(tabData[ii].values[jj].label) + ':</td><td style="float:left; font-size: 12px;">' + htmlEncode(tabData[ii].values[jj].formatted_value) + '</td></tr>';
                }

                dataHTML += '</table></div>';

                $element.append(dataHTML);
            }
        }
    },

    //Builds the actions tab
    BuildActionsTab: function(actionData, $element) {
        var tabs = $element.find('#madata-tabs');

        //handle all of the tabs.
        var len = actionData.length;
        tabs.find('ul').append('<li><a href="#tab-buttonActions">Actions</a></li>');
        var $dataHTML = $('<div id="tab-buttonActions" class="layout-tooltip"></div>');

        $dataHTML.html(MAActionFramework.buildLayoutFromContents(userSettings.ButtonSetSettings.dataLayerLayout, {
                markerType: 'DataLayer'
            })
        );

        //handle clicking an action button
        $dataHTML.find('.actionbutton').click(function (e) {
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
                        var options = {
                            recString : ''
                        };
                        if(frameworkAction.ActionValue.indexOf('{records}') >= 0) {
                            options.records = true;
                        }

                        var newURL = frameworkAction.ActionValue
                            + (frameworkAction.ActionValue.indexOf('?') == -1 ? '?noparams' : '')
                            + '&Button=' + encodeURIComponent(frameworkAction.Label)
                            + '&RecordId=' + record.record.Id;
                        if(frameworkAction.Options.method == 'GET') {
                            if(frameworkAction.Options.addRecords) {
                                newURL += '&'+frameworkAction.Options.paramName+'=' + record.record.Id;
                            }
                            window.open(newURL);
                            break;
                        }
                        else {

                            var postData = {};

                            if(frameworkAction.Options.addRecords) {
                                postData[frameworkAction.Options.paramName] = record.record.Id;
                            }

                            openNewWindow('POST', newURL, postData, '_blank');
                            break;
                        }

                    case 'Javascript':
                        frameworkAction.ActionValue.call(this, {
                            button: $button,
                            dataLayers: [MA.demographicsInfoBubble.markerData.marker]
                        });
                        break;

                    default:
                        break;
                }
            }

            //stop the click from getting to the map
            e.stopPropagation();
        });

        tabs.append($dataHTML);
    },

    //builds the mobile view
    buildMobileView : function (options) {
        var $wrapper = $('#layersIndividualWrap');
        var $mobilePlottedQuery;
        if(options.refresh && !$wrapper.hasClass('nest-out')) {
            //we are in a single view check if this is the visible element
            var plottedQueryId = $wrapper.find('.layersIndividual').attr('data-id');
            if(plottedQueryId === options.id) {
                //we found the plotted layer
                $mobilePlottedQuery = $wrapper.find('.layersIndividual');
            }
            else {
                //just return a template
                $mobilePlottedQuery = $('#templates .layersIndividual.template').clone().removeClass('template');
            }
            //clear previous data
            //$mobilePlottedQuery.removeData().addClass('loading').find('.legend-showhide, .legend, .legend-moreless').hide().filter('.legend').empty();
            $mobilePlottedQuery.find('.status').html(MASystem.Labels.Layers_On_The_Map_Refreshing_Layer);
        }
        else {
            $mobilePlottedQuery = $('#templates .layersIndividual.template').clone().removeClass('template');
            $mobilePlottedQuery.find('.status').html(MASystem.Labels.MA_Running_Query);
            $mobilePlottedQuery.find('.plotLayer').attr('data-type','datalayer');
            $wrapper.empty();

            $wrapper.append($mobilePlottedQuery);

            var subTitleHTML = '<div class="ma-top-bar-subtext layerType">'+ MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer + '</div>';
            $mobilePlottedQuery.find('.layerName').html(htmlEncode(options.name+subTitleHTML));
            $mobilePlottedQuery.attr({'data-id':options.id,'type':'datalayer'});
                        
            //hide plot on load, not supported
            $mobilePlottedQuery.find('.plotOnLoadToggle').attr('disabled','disabled');
            /*if(MALayers.isPlotOnLoad.hasOwnProperty(plotOptions.savedQueryId)) {
             $mobilePlottedQuery.find('.plotOnLoadToggle').prop('checked',true);
             }*/

        }

        return $mobilePlottedQuery;

    },

    //Builds the initial plotted layer div in the plotted tab
    BuildPlottedLayerDiv: function(options) {
        var dfd = $.Deferred();
        if(!options.plottedLayer) {
            //hide any info bubbles
            MA.Map.InfoBubble.hide();
            options.component = 'DataLayer';
            options.isTileBased = options.dataLayerPlotType == 'polygon' ? true : false;
            options.isActiveMapListener = true;
            window.VueEventBus.$emit('add-layer', options, function(dataLayerRef) {
                var $plottedLayer = $(dataLayerRef);
                $plottedLayer.addClass('DataLayer loading PlottedRowUnit').removeClass('PlottedRowUnit-DataLayer');
                MADemographicLayer.appendDataToDomElement($plottedLayer, options);
                dfd.resolve($plottedLayer);
            });
        } else {
            // just update the name
            options.plottedLayer.find('.basicinfo-name').html(htmlEncode(options.name));
            dfd.resolve(options.plottedLayer);
        }
        return dfd.promise();
    },
    appendDataToDomElement: function ($plottedLayer, options) {
        $.extend($plottedLayer.data(), options);
        $plottedLayer.attr('data-id', options.id);
        $plottedLayer.attr('key', options.key);
        $plottedLayer.attr('uid', options.uid);
        $plottedLayer.attr('qid', options.qid);
        $plottedLayer.attr('plot-type', options.plotMarkers ? 'marker' : 'polygon');

        if(options.plotMarkers) {
            $plottedLayer.addClass('visibleOnly');
        }
        $plottedLayer.find('.basicinfo-name').html(htmlEncode(options.name));
        $plottedLayer.find('.basicinfo-baseobjectname').html(MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Text_Data_Layer);

        $plottedLayer.find('.loadMask').show();
        $plottedLayer.find('.loading-icon').show();
    },

    refreshDataLayer: function($plottedLayer, dlOptions, callback) {
        dlOptions = $.extend({
            isMobile : false,
        }, dlOptions || {});
        callback = callback || function(){}
        //unrender the data layer
        $plottedLayer.addClass('loading');
        $plottedLayer.find('.queryIcon').hide();
        $plottedLayer.find('.loading-icon').show();
        var data = $plottedLayer.data() || {};
        MA.Map.spiderfier.unspiderfy();
        MADemographicLayer.RemoveLayerFromDom($plottedLayer,true).then(function() {
            //refresh the query
            $plottedLayer.removeClass('unloading');
            var options = $plottedLayer.data();
            var origPlottingOptions = options.plottingOptions;
            origPlottingOptions = $.extend({
                refresh: true,
                plottedLayer : $plottedLayer,
                isMobile : dlOptions.isMobile,
                name : dlOptions.name || data.name,
                stayOnMapTab: dlOptions.stayOnMapTab || false
            }, origPlottingOptions || {});
            MADemographicLayer.analyzeDataLayer(origPlottingOptions).then(function() {
                callback({success:true});
            });

        });
    },

    //Fills the plotted layer div with the necessary data
    FillPlottedLayerDiv: function(layer, data) {
        var dfd = $.Deferred();
        var $plottedLayer = layer.removeClass('loading');
        $plottedLayer.data(data);
        if (MA.isMobile) { 
            dfd.resolve();
            return dfd.promise();
        }
        $plottedLayer.find('.ma-icon-hide').addClass('ma-icon-preview').removeClass('ma-icon-hide').hide();
        $plottedLayer.find('.select-icon').removeClass('Markers').addClass('Cluster');
        $plottedLayer.find('a.renderButtons-button.cluster').closest('li').addClass('active');

        $plottedLayer.find('.basicinfo-name').html(htmlEncode(data.name));


        if(data.markers !== null) {

            var markerCount = data.markers.length;
            $plottedLayer.find('.plottinginfo-wrapper .inline.status').html(window.formatLabel(MASystem.Labels.MA_Data_Points,[markerCount]));
            $plottedLayer.find('.plottinginfo-wrapper .info').html('<div>' + window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Markers_Created,[markerCount]) + ', ' + window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Visible,[markerCount]) + '.' + '</div>');

        } else if(data.censusLayer !== null) {
            //Hide the zoom to fit
            $plottedLayer.find('.drop-menu-item.item-selectable.fit-query').hide();

            //do census layer stuff
            var stat = $plottedLayer.find('.plottinginfo-wrapper .inline.status');
            stat.css('width','95.5%');

            isCensusLayer = true;

        }

        if(data.legend.hasOwnProperty('rows')) {

            var info = '';

            if(data.legend.title !== '') {
                info += data.legend.title;

                if(data.legend.subTitle !== '' && data.legend.subTitle !== undefined) {
                    info += ': ' + data.legend.subTitle;
                }
            }

            $plottedLayer.find('.plottinginfo-wrapper .info').append('<div>' + htmlEncode(info) + '</div>');
            //do legend stuff here
            var tableHTML = MADemographicLayer.BuildLegend(data.legend.rows);
            $plottedLayer.find('table.legend').html(tableHTML).show();
            $plottedLayer.find('div.legend-showhide').show();
            $plottedLayer.find('.loadMask').hide();
            $plottedLayer.find('.loading-icon').hide();

            dfd.resolve({
                success: true
            });
        }
        else {
            dfd.resolve({
                success: true
            });
        }

        return dfd.promise();
    },

    // TODO: Maybe delete it. Huidae
    UpdateLegend: function(layer) {
        var $plottedLayer = layer;
        var data = $plottedLayer.data();
        var legendHasRows = data.legend.rows.length > 0;
        var legendIsReal = false;

        if(legendHasRows) {
            legendIsReal = data.legend.rows[0].hasOwnProperty('icon') || data.legend.rows[0].hasOwnProperty('color');
        }

        if(legendHasRows && legendIsReal) {
            //do legend stuff here
            var tableHTML = MADemographicLayer.BuildLegend(data.legend.rows);

            $plottedLayer.find('table.legend').html(tableHTML).show();
            $plottedLayer.find('div.legend-showhide').show();
        } else {
            //do legend stuff here

            var theColor = isCensusLayer ? MADemographicLayer.defaultColor : MADemographicLayer.defaultMarker;

            var otherRow = {
                color: theColor,
                operator: 'equals',
                topic_id: '--fake--',
                values: '--Other--'
            }

            var fakeLegend = [ otherRow ];

            var tableHTML = MADemographicLayer.BuildLegend(fakeLegend);

            $plottedLayer.find('table.legend').html(tableHTML).show();
            $plottedLayer.find('div.legend-showhide').show();
        }
    },

    //Creates the legend with the given legend data
    BuildLegend: function(legendRows, fields) {
        var isPolygon = false;
        var rowHTML = '';
        if (!MA.isMobile) {
            var keys = Object.keys(legendRows);
            for(var ii=0, len=keys.length; ii<len; ii++) {
                var prop = keys[ii];
                var row = legendRows[prop];
                var markerImage = row.icon;
                var dataColor = row.markerValue;
                if (row.markerValue.indexOf(':') > -1) {
                    markerImage = row.icon;
                } else {
                    isPolygon = true;
                    dataColor = '#'+row.markerValue;
                }

                rowHTML += '<tr class="legend-row" uid="'+row.legendId+'" ::ONCLICK::>';
                rowHTML += '<td class="legend-visibility-toggle legend-checkbox-wrapper">::CHECKBOX::</td>';
                rowHTML += '<td class="legend-text">'+htmlEncode(row.label)+'</td>';
                rowHTML += '<td class="visiblemarkers">0</td>';
                rowHTML += '<td class="of">'+ window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Of + '</td>';
                rowHTML += '<td class="totalmarkers">0</td>';
                if(isPolygon) {
                    rowHTML += '<td class="legend-color" data-color="'+dataColor+'"><span class="MAIcon ion-stop" style="color: '+dataColor+'; font-size: 16px;"></span></td>';
                }
                else {
                    rowHTML += '<td class="legend-color" data-color="'+dataColor+'"><img src="'+markerImage+'" style="width: 20px;"></td>';
                }
                rowHTML += '</tr>';
            }

            if(isPolygon) {
                rowHTML = rowHTML.replace(/::ONCLICK::/g, '').replace(/::CHECKBOX::/g, '<span class="MAIcon dataLayerCheckbox ion-checkmark-round"></span>');
            } else {
                rowHTML = rowHTML.replace(/::ONCLICK::/g, 'onclick="MADemographicLayer.ToggleMarkerRow(this);"').replace(/::CHECKBOX::/g, '<span class="MAIcon dataLayerCheckbox ion-checkmark-round"></span>');
            }
        }

        return rowHTML;
    },

    //Builds the rows for the legend depending on the operator
    BuildLegendRowText: function(row) {
        var op = (row.operator || 'equals').toLowerCase();
        var values = row.values ? (typeof row.values == 'object' ? row.values : row.values.split(',')) : [];
        var min = row.min || '';
        var max = row.max || '';
        var formatAs = row.format_as || '';
        if(row.topic_id === '--fake--') {
            values = ['Other'];
        }
        for(var i = 0; i < values.length; i++) {
            if(values[i] == '--Other--') {
                values[i] = window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Other;
            }
        }
        
        //check if min and max = 0 and row is other
        if(max == 0 && min == 0 && row.topic_id == 'row-other') {
            values = ['Other'];
            op = 'equals';
        }

        if(formatAs === 'currency') {
            min = min !== '' ? MADemographicLayer.FormatValue(min, formatAs) : '';
            max = max !== '' ? MADemographicLayer.FormatValue(max, formatAs) : '';
        }

        var formattedValues = [];
        $.each(values, function(i, val) {
            var formattedVal = val;
            if(!isNaN(val) && row.topic_id.indexOf('year') == -1 && val != '' && val != 'Other') {
                formattedVal = formatAs == 'currency' ? MADemographicLayer.FormatValue(val, formatAs) : MA.Util.formatNumberString(val);
            }
            formattedValues.push(formattedVal);
        });
        values = formattedValues.join(', ');
        if (min) {
            min = MA.Util.formatNumberString(min);
        }
        if (max) {
            max = MA.Util.formatNumberString(max);
        }

        switch(op) {
            case 'equals':
                return values;

            case 'not equal to':
                return MASystem.Labels.MA_NOT_EQUAL_TO + ' ' + values;

            case 'starts with':
                return MASystem.Labels.MA_Starts_With + ' ' + values;

            case 'contains':
                return MASystem.Labels.MA_Contains + ' ' + values;

            case 'does not contain':
                return MASystem.Labels.MA_Does_Not_Contain + ' ' + values;

            case 'ends with':
                return MASystem.Labels.MA_Ends_With + ' ' + values;

            case 'less than':
                return MASystem.Labels.MA_Less_Than + ' ' + values;

            case 'less or equal':
                return MASystem.Labels.MA_Less_Than_Equal + ' ' + values;

            case 'greater than':
                return MASystem.Labels.MA_Greater_Than + ' ' + values;

            case 'greater or equal':
                return MASystem.Labels.MA_Greater_Than_Equal + ' ' + values;

            case 'range':
                return min + ' ' + MASystem.Labels.MA_To + ' ' + max;

            default:
                return '';
        }
    },

    //Toggles the marker row hidden or shown
    ToggleMarkerRow: function(element, options) {
        var dfd = jQuery.Deferred();

        if( MA.Map.hasOwnProperty('spiderfier') ) {
            MA.Map.spiderfier.unspiderfy();
        }

        options = $.extend({
            isMobile : false,
            plottedLayer : null
        }, options || {});

        //if this is mobile, the legend is on a different view
        var $plottedLayer;
        var checkbox;
        var rowid;
        var isShown;
        $plottedLayer = $(element).closest('.PlottedRowUnit.DataLayer');
        if($plottedLayer.hasClass('loading')) {
            dfd.resolve({success:false});
            return dfd.promise();;
        }
        checkbox = $(element).find('.legend-visibility-toggle').find('span');
        rowid = $(element).attr('uid');
        isShown = checkbox.hasClass('ion-checkmark-round');

        if(isShown) {
            checkbox.removeClass('ion-checkmark-round');
        } else {
            checkbox.addClass('ion-checkmark-round');
        }

        var layerData = $plottedLayer.data() || {};

        //what modes do we need to render
        var renderClusterMode = true;

        //collect data about the records that need to be processed and rendered
        var markerProcessingBatchSize = MA.Map.hitTestShapeMgr.hasShapes()
            ? $.browser.webkit
            ? 500
            : 20
            : 1000;
        var markerProcessingTimeout = 1;
        var layerData = $plottedLayer.data() || {};
        var recordsToProcess = layerData.records || {};
        var markerUniqueIdList = Object.keys(recordsToProcess);
        var totalMarkerCount = markerUniqueIdList.length;

        //are we rendering or unrendering
        var renderCluster = isShown ? false : true;

        //get legend Data
        var legend = $plottedLayer.data('legend') || {title: 'Legend',subTitle: '',row: {}};
        var rows = legend.rows;
        // set the active toggle to false
        var rowToUpdate = rows[rowid];
        rowToUpdate.active = renderCluster;
        rowToUpdate.totalmarkers = 0;
        rowToUpdate.count = 0;

        //What is the deal with the proximity? Inverted or no?
        var invertProximity = getProperty(userSettings || {}, 'InvertProximity', false) || false;
        var markersToCluster = [];
        setTimeout(function doBatch() {
            if (markerUniqueIdList.length > 0) {
                //status update
                $plottedLayer.find('.status').text(formatLabel(MASystem.Labels.Layers_Processing_Remaining, [markerUniqueIdList.length]));

                var recordsProcessed = 0;
                while (recordsProcessed < markerProcessingBatchSize && markerUniqueIdList.length > 0)
                {
                    recordsProcessed++;

                    var uniqueId = markerUniqueIdList.shift();
                    var record = recordsToProcess[uniqueId];
                    var legendRow;
                    try{
                        legendRow = rows[record.data.rowid];
                        legendRow.totalmarkers++;
                    }
                    catch(e) {legendRow = {count:0,totalmarkers:0};}
                    if(record.data.rowid == rowid) {
                        //are we rendering anything?
                        if(renderCluster) {
                            //check if prox enabled and render
                            if (MA.Map.hitTestShapeMgr.hasShapes())
                            {
                                //loop through all prox objects to see if this marker falls inside or outside
                                var isInsideProxObject = MA.Map.hitTestShapeMgr.containsLatLng(record.markerCoordinate);

                                //determine if we should continue based on whether or not prox visibility has been inverted or this query has prox enabled
                                if ( (invertProximity && isInsideProxObject) || (!invertProximity && !isInsideProxObject) )
                                {
                                    //we should not show this marker so continue to the next one
                                    if(record.isVisible) {
                                        record.isVisible = false;
                                    }
                                    continue;
                                }
                            }
                            legendRow.count++;
                            if (renderClusterMode) {
                                record.isVisible = true;
                                markersToCluster.push(record.clusterMarker);
                            }
                        } else {
                            record.isVisible = false;
                        }
                    } else {
                        if(record.isVisible) {
                            legendRow.visible++;
                            markersToCluster.push(record.clusterMarker);
                        }
                        continue;
                    }
                }

                //set a timeout to process the next batch
                setTimeout(doBatch, markerProcessingTimeout);
            }
            else
            {
                //is the layer visible?
                if($plottedLayer.find('#select-hide').prop('checked')) {
                    layerData.clusterGroup.setMap(MA.map);
                }
                else {
                    layerData.clusterGroup.setMap(null);
                }
                layerData.clusterGroup.clearMarkers();
                layerData.clusterGroup.addMarkers(markersToCluster);
                layerData.clusterGroup.repaint();
                //update the acutal legend obj
                var legendRowKeys = Object.keys(rows);
                for(var rl = 0; rl < legendRowKeys.length; rl++) {
                    var prop = legendRowKeys[rl];
                    var row = rows[prop];
                    var $row = $plottedLayer.find('.legend-row[uid="'+row.legendId+'"]');
                    $row.find('.visiblemarkers').text(row.count);
                    $row.find('.totalmarkers').text(row.totalmarkers);
                    if(row.totalmarkers === 0) {
                        // update the legend rows
                        $row.addClass('empty').hide();
                    }
                }

                //update info
                $plottedLayer.find('.status').html(window.formatLabel(window.MASystem.Labels.Layers_On_The_Map_Plotted_Data_Layer_Records,[MA.Util.formatNumberString(totalMarkerCount)]));

                dfd.resolve({ done:true });

            }
        }, markerProcessingTimeout);

        return dfd.promise();
    },
    ToggleLayerClick: function(key) { //Toggles the click events on polygons
        if(key !== null) {
            if($('.PlottedRowUnit.DataLayer').find('.inline.status').find('span').hasClass('ion-toggle-filled')) {
                //Remove all click events
                google.maps.event.clearListeners(MA.map, 'click');
                //Hide all clickability icons
                $('.PlottedRowUnit.DataLayer').find('.inline.status').find('span').removeClass('ion-toggle-filled').addClass('ion-toggle');
            }
            else {
                //Turn on click for that single layer.
                google.maps.event.addListener(MA.map, 'click', function(event) {
                    MADemographicLayer.HandleClick.call(event,{key:key,type:'shape',layerName : $('.PlottedRowUnit.DataLayer[key="'+key+'"]').find('.basicinfo-name').text()});
                    //MADemographicLayer.HandleClick(event, null, null, key, {layerName : $('.PlottedRowUnit.DataLayer[key="'+key+'"]').find('.basicinfo-name').text()});
                });
                //Show clickability icon for that layer
                $('.PlottedRowUnit.DataLayer[key="'+key+'"]').find('.inline.status').find('span').removeClass('ion-toggle').addClass('ion-toggle-filled');
            }
        }
    },

    //
    FormatValue: function(value, format) {
        switch (format) {
            case 'currency':
                return '$' + parseInt(value).toLocaleString();
                break;
        }
    },



    //----------------------------------------------------------------------------//



    //Handles the cluster click stuff
    ClusterClick: function(cluster) {

        shape_cluster_popup(
            {
                cluster : cluster,
                type : 'cluster'
            }
        );
    },

 

    allHidden: false,



    showHideMarkers: function(element) {

        var $plottedLayer = $(element).closest('.PlottedRowUnit.DataLayer');

        var checkbox = $(element)[0];
        var layerData = $plottedLayer.data();

        if(checkbox.checked) {

            //turn everything that was on, back on
            MADemographicLayer.allHidden = false;

            var layerTypes = $plottedLayer.find('.renderButtons-button.on');

            /*$.each(layerTypes, function(i,layerElement) {
             var layerType = layerElement.getAttribute('data-renderas');
             MADemographicLayer.toggleSelection(layerData, layerType, true);
             });*/
            var renderModes = MADemographicLayer.getRenderModes($plottedLayer);
            MADemographicLayer.rerenderDataLayer($plottedLayer,{renderModes: renderModes},function() {

            });

            MADemographicLayer.showHideActiveLayers($plottedLayer, false);

        } else {

            //turn it all off
            MADemographicLayer.allHidden = true;

            var renderModes = MADemographicLayer.getRenderModes($plottedLayer);
            MADemographicLayer.unrenderDataLayer($plottedLayer,{modes: renderModes},function() {

            });

            MADemographicLayer.showHideActiveLayers($plottedLayer, true);

        }



    },



    showHideActiveLayers: function($plottedLayer, hideAll) {

        var activeLayers = ($plottedLayer.find('.drop-menu-item.item-selectable.active') || []).length;

        if(hideAll || MADemographicLayer.allHidden) {

            $plottedLayer.find('.select-icon').hide();
            $plottedLayer.find('.multi-select').html('');
            $plottedLayer.find('.plotted-visibile-icon').find('.ma-icon').removeClass('ma-icon-preview').addClass('ma-icon-hide').show();

        } else {

            if(activeLayers > 0) {

                if(activeLayers > 1) {

                    $plottedLayer.find('.multi-select').html('<svg class="svg-circle-num" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><g><circle cx="10" cy="10" fill="#28a2ff" id="svg_1" r="8.83163" stroke="#f9f9f9" stroke-width="2"></circle><text fill="#f9f9f9" font-family="Monospace" font-size="18" id="svg_2" stroke="#f9f9f9" stroke-width="0" text-anchor="middle" transform="matrix(0.7992677323256553,0,0,0.6748139102469572,3.3995968056728256,7.2131973728906305) " x="8.3" xml:space="preserve" y="10">2</text></g></svg>');
                    $plottedLayer.find('.select-icon').hide();

                } else {

                    $plottedLayer.find('.multi-select').html('');
                    $plottedLayer.find('.select-icon').show();

                }

                $plottedLayer.find('.plotted-visibile-icon').find('.ma-icon').removeClass('ma-icon-preview').addClass('ma-icon-hide').hide();

            } else {

                $plottedLayer.find('.select-icon').hide();
                $plottedLayer.find('.plotted-visibile-icon').find('.ma-icon').removeClass('ma-icon-preview').addClass('ma-icon-hide').show();

            }

        }

    },



    renderSelection: function(element) {
        var $button = $(element);
        var $plottedLayer = $button.closest('.PlottedRowUnit.DataLayer');

        var layerType = $button.find('.renderButtons-button').attr('data-renderas');

        var renderMode = !$button.hasClass('active');
        var layerData = $plottedLayer.data();

        if(renderMode) {
            $plottedLayer.find('#select-hide').prop('checked',true);
            $plottedLayer.find('#select-hide').prop('checked',true);
            $plottedLayer.find('#select-hide').prop('checked',true);
            MADemographicLayer.rerenderDataLayer($plottedLayer,{renderModes:[layerType]},function() {

            });
            
        } else {

            MADemographicLayer.unrenderDataLayer($plottedLayer,{modes:[layerType]},function() {

            });

            /*$button.removeClass('active');
             $(element).find('a').removeClass('on');
             $plottedLayer.find('.select-icon').removeClass(layerType);*/

            /*if(!MADemographicLayer.allHidden) {
             MADemographicLayer.toggleSelection(layerData, layerType, false);
             }*/
        }

        MADemographicLayer.showHideActiveLayers($plottedLayer, false);

    },


    toggleSelection: function(dataLayer, layerType, show) {

        var map = show === true ? MA.map : null;

        if(layerType == 'Cluster') {

            var clusterer = dataLayer.clusterGroup || null;

            if(clusterer !== null) {
                clusterer.setMap(map);
                var markers = clusterer.markers_ || [];

                for(ii=0, len=markers.length; ii<len; ii++) {
                    markers[ii].setMap(map);
                }
            }

        } else {

            var markers = dataLayer.markers || [];

            for(ii=0, len=markers.length; ii<len; ii++) {
                markers[ii].setMap(map);
            }

        }

    },
    
    unrenderDataLayer: function ($plottedLayer, options, callback) {
        options = $.extend({
            modes : []
        }, options || {});
        
        try {
            MA.Map.spiderfier.unspiderfy();
        }
        catch(e){}
        
        $plottedLayer.find('.renderButtons-button[data-renderas="Cluster"]').removeClass('on').closest('.item-selectable').removeClass('active');
        $plottedLayer.find('.select-icon').removeClass('Cluster');
        
        $plottedLayer.find('.renderButtons-button[data-renderas="Markers"]').removeClass('on').closest('.item-selectable').removeClass('active');
        $plottedLayer.find('.select-icon').removeClass('Markers');
    
        $plottedLayer.find('.renderButtons-button[data-renderas="Heatmap"]').removeClass('on').closest('.item-selectable').removeClass('active');
        $plottedLayer.find('.select-icon').removeClass('Heatmap');

        if ($plottedLayer.data('heatmapLayer')) {
            $plottedLayer.data('heatmapLayer').setMap(null);
            $plottedLayer.data('heatmapLayer', null);
        }
        callback = callback || function(){};
        var layerData = $plottedLayer.data() || {};
        if (layerData.clusterGroup) {
            layerData.clusterGroup.clearMarkers();
        }

        callback({ done:true });
    },
    
    defaultDataSamples : {
        business: {
            header: [{ file_id: 'business', topic_id: 'company_name' }, { file_id: 'business', topic_id: 'ma_naics01_desc' }, { file_id: 'business', topic_id: 'physical_address_standardized' }],
            tabs: [{ tab_id: '1499862699432', tab_label: 'Info', data: [{ file_id: 'business', topic_id: 'location_sales_total' }, { file_id: 'business', topic_id: 'full_name' }, { file_id: 'business', topic_id: 'sourcetitle' }, { file_id: 'business', topic_id: 'phone' }, { file_id: 'business', topic_id: 'url' }] }]
        },
        usa_property_sfdc: {
            header: [{ file_id: 'usa_property_sfdc', topic_id: 'propertyaddressfull' }, { file_id: 'usa_property_sfdc', topic_id: 'taxassessedvaluetotal' }, { file_id: 'usa_property_sfdc', topic_id: 'taxassessedvalueimprovements' }],
            tabs: [{ tab_id: '1499862699433', tab_label: 'Info', data: [{ file_id: 'usa_property_sfdc', topic_id: 'partyowner1namefull' }, { file_id: 'usa_property_sfdc', topic_id: 'contactownermailaddressfull' }] }]
        },
        x_usa_2010_census: {
            header: [{ file_id: 'x_usa_2010_census', topic_id: 'usa_2010_total_population' }],
            tabs: []
        },
        x_can_2011_nhs: {
            header: [{ file_id: 'x_can_2011_nhs', topic_id: 'can_2011_population' }],
            tabs: []
        },
        x_usa_2013_acs: {
            header: [{ file_id: 'x_usa_2013_acs', topic_id: 'population_total' }],
            tabs: []
        },
        aus_2016_abs: {
            header: [{ file_id: 'aus_2016_abs', topic_id: 'g01_tot_p_p' }],
            tabs: []
        },
        usa_2018_energy: {
            header: [{ file_id: 'usa_2018_energy', topic_id: 'label' }, { file_id: 'usa_2018_energy', topic_id: 'total' }],
            tabs: [{ tab_id: '1499862699434', tab_label: 'Info', data: [{ file_id: 'usa_2018_energy', topic_id: 'commercial' }, { file_id: 'usa_2018_energy', topic_id: 'industrial' }, { file_id: 'usa_2018_energy', topic_id: 'residential' }, { file_id: 'usa_2018_energy', topic_id: 'transportation' }] }]
        },
        x_airports: {
            header: [{ file_id: 'x_airports', topic_id: 'facilityname' }],
            tabs: [{ tab_id: '1499862699435', tab_label: 'Info', data: [{ file_id: 'x_airports', topic_id: 'ownership' }, { file_id: 'x_airports', topic_id: 'managerphone' }] }]
        },
        maponics_autodealers: {
            header: [{ file_id: 'maponics_autodealers', topic_id: 'label' }, { file_id: 'maponics_autodealers', topic_id: 'address' }],
            tabs: [{ tab_id: '1499862699436', tab_label: 'Info', data: [{ file_id: 'maponics_autodealers', topic_id: 'subtype' }, { file_id: 'maponics_autodealers', topic_id: 'brand_names' }, { file_id: 'maponics_autodealers', topic_id: 'phone' }, { file_id: 'maponics_autodealers', topic_id: 'url' }] }]
        },
        can_business: {
            header: [{ file_id: 'can_business', topic_id: 'company_name' }, { file_id: 'can_business', topic_id: 'ma_naics01_desc' }, { file_id: 'can_business', topic_id: 'address' }],
            tabs: [{ tab_id: '1499862699437', tab_label: 'Info', data: [{ file_id: 'can_business', topic_id: 'estimated_sales_value' }, { file_id: 'can_business', topic_id: 'phone' }, { file_id: 'can_business', topic_id: 'url_company_domain' }] }]
        },
        uk_business: {
            header: [{ file_id: 'uk_business', topic_id: 'companyname' }, { file_id: 'uk_business', topic_id: 'siccode_sictext_1' }, { file_id: 'uk_business', topic_id: 'regaddress_addressline1' }],
            tabs: [{ tab_id: '1499862699438', tab_label: 'Info', data: [{ file_id: 'uk_business', topic_id: 'uri' }, { file_id: 'uk_business', topic_id: 'companystatus' }] }]
        },
        maponics_colleges: {
            header: [{ file_id: 'maponics_colleges', topic_id: 'name' }, { file_id: 'maponics_colleges', topic_id: 'campusname' }, { file_id: 'maponics_colleges', topic_id: 'type' }],
            tabs: [{ tab_id: '1499862699439', tab_label: 'Info', data: [{ file_id: 'maponics_colleges', topic_id: 'address' }] }]
        },
        x_eu_2016_nuts: {
            header: [{ file_id: 'x_eu_2016_nuts', topic_id: 'population' }],
            tabs: []
        },
        x_mex_demographics: {
            header: [{ file_id: 'x_mex_demographics', topic_id: 'total_pop_2010' }],
            tabs: []
        },
        usa_schools: {
            header: [{ file_id: 'usa_schools', topic_id: 'sch_name' }, { file_id: 'usa_schools', topic_id: 'ed_level' }],
            tabs: [{ tab_id: '1499862699440', tab_label: 'Info', data: [{ file_id: 'usa_schools', topic_id: 'address' }, { file_id: 'usa_schools', topic_id: 'district' }, { file_id: 'usa_schools', topic_id: 'phone' }] }]
        },
        distancemarkers: {
            header: [{ file_id: 'distancemarkers', topic_id: 'street_name' }, { file_id: 'distancemarkers', topic_id: 'distance_value' }],
            tabs: [{ tab_id: '1499862699441', tab_label: 'Info', data: [{ file_id: 'distancemarkers', topic_id: 'base_name' }] }]
        }
    }
};
