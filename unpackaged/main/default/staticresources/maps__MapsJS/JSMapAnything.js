var IsCorporateAdmin = true;

var UserId = MASystem.MergeFields.UserId;
var OrgId = MASystem.MergeFields.OrganizationId;

//TomTom Routing Images
var routingImages = MASystem.Images.routingImages;

var LoadingGIFUrl = MASystem.Images.LoadingGIFUrl;
var MALoaddingGIFUrl = MASystem.Images.MALoaddingGIFUrl;

var VisibleQueries = []; //Used to Determine Which Queries are Visible (List of Ids)
var SavedQueriesObjectIdArray = []; //Used to Store Information about Processed Saved Queries

var ProcessedSavedQueries = [];

var UserEmailAddress = MASystem.MergeFields.User_Email;

//var map = null;
var ProximityCircle = null;
var DOMNode = null;
var router = null;
var RouterResponse = null;

//Position Vars
var PositionMarker;
var WatchPositionMarker = null;
var PositionEnabled = false;

//Home Vars
var CenterLat;
var CenterLong;
var DefaultZoomLevel;
var DefaultMapType;

var DebugMode = false;

var GeoCodePointsIsRunning = false; //No Longer Needed

var CallBackFunction;

//New Permission Var(s)
var pageSize = 10;
var campaignsPageSize = 10;
var changeownerPageSize = 10;

var RoutingGeoCodeIsRunning;
var WayPointArray = [];
var skippedWaypointsArray;
var HasRoutingErrors = false;

var AddressesToBeGeoCoded = [];

var PlottedLegendSavedQryId = "";

var slider1;
var slider2;

var defaultQueries = [];

var notPrintEmailPage = document.URL.indexOf('PrintEmailRoute') == -1;

//toggle highlight variables
var highlightOnOff = false;
var highlight;

$(function()
{
    // if(notPrintEmailPage) { document.getElementById("exportedTable").style.height =(screen.height-460) + "px"; }
    sforce.connection.sessionId = MASystem.MergeFields.Session_Id;

    $('body').on('keyup','input.numberVal',function(event) {
        // skip for arrow keys
        if (event.which >= 37 && event.which <= 40) {
            event.preventDefault();
        }

        var currentVal = $(this).val();
        var testDecimal = testDecimals(currentVal);
        if($(this).hasClass('js-whole-number') && testDecimal > 0) {
            $(this).val(replaceCommas(currentVal));
        }
        else if (testDecimal.length > 1) {
            console.warn("You cannot enter more than one decimal point");
            currentVal = currentVal.slice(0, -1);
        }
        
        
        $(this).val(replaceCommas(currentVal));
    });

    toastr.options = {
        "positionClass": "toast-bottom-right",
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut",
        "iconClasses" : {
            "success" : "toast-success",
            "error"   : "toast-error",
            "warning" : "toast-warning",
            "info"    : "toast-info"
        }
    }

    //campaign filter handlers
    $('#addtocampaign-select-filters span.link.showadvancedfilters').click(function () {
        if ($(this).text() == 'Show Advanced Filters')
        {
            $(this).text('Hide Advanced Filters');
            $('#addtocampaign-select-advanced-filters').slideDown();
        }
        else
        {
            $(this).text('Show Advanced Filters');
            $('#addtocampaign-select-advanced-filters').slideUp();
        }
    });
    $('#addtocampaign-select-filters span.link.clearfilters').click(function () {
        $('#addtocampaign-select-advanced-filters').find('.filter-text, .filter-calendar, .filter-number').val('');
    });

    //handle clearing selected campaigns
    $('#addtocampaign-select-selectiondetails span.link.clearselections').click(function () {

        //uncheck all visible rows
        $('.campaign-row .campaign-checkbox').attr('checked', false);

        //update records in memory
        $('#addtocampaign-select-grid').data('records', {});

        //update the selections counter
        $('#addtocampaign-select-selectiondetails').data('numSelected', 0);
        $('#addtocampaign-select-selectiondetails span').first().text('0');

    });

    /*****************
     *  New Task
     *****************/
    //handle clicking an assignment type
    $('[name="newtask-assignto-type"]').click(function () {
        $('.newtask-assignto-type').hide().filter('.' + $(this).attr('value')).show();
    });



    /*****************
     *  New Event
     *****************/

    //handle clicking an assignment type
    $('[name="newevent-assignto-type"]').click(function () {
        $('.newevent-assignto-type').hide().filter('.' + $(this).attr('value')).show();
    });

    /***********************
    *   Plotted Layers
    ***********************/

    //change visibility toggle on prox layers
    $('#PlottedQueriesTable').on('change', '.affectvisibility', function() {
        //adding option to not remove related shapes from a query
        var thisIdAttr = this.getAttribute('id');
        if(thisIdAttr === 'limit-within-shape' || thisIdAttr === 'limit-within-prox'){
            $('.PlottedRowUnit.savedQuery').each(function(){
                var data = $(this).data();
                var columnSort = getProperty(data.listViewSettings || {},'currentSort.columnToSort',false) || '';
                var sort = getProperty(data.listViewSettings || {},'currentSort.sort',false) || '';
                var qid = getProperty(data || {},'qid',false) || '';
                $('div#'+qid+' th[colid="' + columnSort + '"]').removeClass('asc').removeClass('desc').removeClass(sort);
                $(this).data().listViewSettings.currentSort.sort = '';
                $('#'+ qid +' .listview-col-sort-asc').removeClass('listview-col-sort-asc');
                $('#'+ qid +' .listview-col-sort-desc').removeClass('listview-col-sort-desc');
            });
        }
        
        ChangeVisibilityWhenCircleIsAdded({force:true,keepRelatedShapes:true});
    });

    //Remove Copyright Link
    $("#nm_crimg a").attr('disabled','disabled');


    StartUpJS();

    //preload images
    var images = [];
    var preloaders = [MASystem.Images.chatterStatusLoader];
    for (i = 0; i < preloaders.length; i++) {
        images[i] = new Image();
        images[i].src = preloaders[i];
    }

}); //end onready

function NewLayerNavigationEnabled() {
    // TODO, fully remove function
    return true;
}
//options: { id: obj.attr('id'), visibleAreaOnly: false }
function PlotFolder(options, layers)
{
    //send a request to get the ids of all saved queries in this folder
    var processData = {
		ajaxResource : 'TreeAJAXResources',
		action: 'get_folder_queries',
		id: options.id
    };
    // delete the qid so we create seperate unique id's while plotting
    delete options.qid;
	var liveErrorDisplayed = false;

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(response, event) {
            //case 7742
            var data = response.data || [];
            // Filter out polyline layers if polylines not enabled.
            if (!window.userSettings.EnablePolyline) {
                data = data.filter(item => {
                    var cleanitem = removeNamespace('maps', item);
                    if (cleanitem.AdvancedOptions__c) {
                        const advOpts = JSON.parse( htmlDecode(cleanitem.AdvancedOptions__c) );
                        if (advOpts.isPolyline === 'true') return false;
                    }
                    return true;
                });
            }
            //dynamic que
            var q = async.queue(function (queryOptions, callback) {
                //plot
                MA.Util.plotFolderOptions.continue = false;
                MA.Util.plotFolderOptions.popupVisible = false;
                queryOptions.permissions.showLayers = false;
                // If this Folder to be plotted has any Live Layer, don't plot it for the visible area all option
                if( String(queryOptions.layerType).match(/live/i) && queryOptions.action == 'plot-visible-all')
                {
                    if(!liveErrorDisplayed)
                    {
                        var message = 'Live layers can not be plotted for visible area only.';
                        MAToastMessages.showError({'message':message,timeOut:6000});;
                        liveErrorDisplayed = true;
                    }
                }
                else
                {
                    queryOptions.renderAs = [queryOptions.defaultRenderMode];
                    Plotting.analyzeQuery(queryOptions);
                }

                //wait for the user to hit continue or cancel then continue next query
                var plotInt = setInterval(function() {

                    if(MA.Util.plotFolderOptions.continue) {
                        clearInterval(plotInt);
                        clearTimeout(tOut);
                        callback();
                    }

                    if(MA.Util.plotFolderOptions.popupVisible) {
                        clearTimeout(tOut);
                    }

                },500);

                //set a timeout to clear the interval if an unknown error occurs after 15 sec
                var tOut = setTimeout(function(){
                    clearInterval(plotInt);
                    callback();
                },15000);
            });

            //update options if this is corp folder
            options.nodetype = options.nodetype == "CorporateFolder" ? "CorporateSavedQuery" : "PersonalSavedQuery";

            //loop over queries
            var renderAs = options.renderAs;
            for(var i = 0; i < data.length; i++) {
                var query = data[i];
                query = removeNamespace('maps', query);

                //fix for tab names in listview.
                options.name = query.Name;
                options.layerType = getProperty(query, 'BaseObject__r.Type__c');
                options.baseObjectId = getProperty(query, 'BaseObject__c');
                
                var queryOptions = {
                    defaultRenderMode : renderAs,
                    visibleAreaOnly : options.visibleAreaOnly,
                    id : query.Id,
                    permissions : options,
                    layerType: options.layerType,
                    action: options.action,
                    name : options.name
                }

                //get the default render mode for this query
                if(options.renderAs == 'Default') {
                    //plot the saved maker method
                    if(query.AdvancedOptions__c != null) {
                        try {
                            var advOpt = JSON.parse( htmlDecode(query.AdvancedOptions__c) );
                            queryOptions.defaultRenderMode = advOpt.defaultRenderMode || 'Default';

                            if (advOpt.isPolyline === 'true') {
                                queryOptions.layerType = 'polyline';
                                options.layerType = 'polyline';
                                options.component = 'polylineLayer';
                            } else {
                                options.layerType = getProperty(query, 'BaseObject__r.Type__c');
                                options.component = 'MarkerLayer';
                            }
                        }
                        catch (e) {
                            //just plot markers
                            MA.log('Unable to parse advanced options for query id: ' + query.Id);
                        }
                    } else {
                        options.layerType = getProperty(query, 'BaseObject__r.Type__c'); 
                        options.component = 'MarkerLayer';
                    }
                }

                queryOptions.layerType = queryOptions.layerType === 'polyline' ? queryOptions.layerType : getProperty(query, 'BaseObject__r.Type__c');

                // If this Folder to be plotted has any Live Layer, don't plot it for the visible area all option
                if(String(queryOptions.layerType).match(/live/i) && options.action == 'plot-visible-all')
                {
                    if(!liveErrorDisplayed)
                    {
                        var message = 'Live layers can not be plotted for visible area only.';
                        MAToastMessages.showError({'message':message,timeOut:6000});
                        liveErrorDisplayed = true;
                    }
                }
                else
                {
                    //if dynamic do one at a time
                    if(query.Query__c.indexOf(':Dynamic') >= 0) {
                        q.push(queryOptions);
                    }
                    else {
                        options.showLayers = false;
                        options.renderAs = [renderAs];
                        options.id = query.Id;
                        Plotting.analyzeQuery(options);
                    }
                }
            }

            //show the layers pane
            if(options.doClick !== undefined) {
                if(options.doClick === true) {
                    $('#tabs-nav-plotted').click();
                }
            } else {
                $('#tabs-nav-plotted').click();
            }
        }
    );

    //send a request to get the ids of all saved territories in this folder
    var processData = {
		ajaxResource : 'TreeAJAXResources',
		action: 'get_folder_territories',
		id: options.id
	};

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(response, event){
            if(event.status) {
                if(response && response.success) {
                    var s = async.queue(function (shapeOptions, callback) {
                        let layerInfo = layers && layers.find(layer => layer.id === shapeOptions.Id) || options;

                        const shapeInfo = {
                            id: shapeOptions.Id,
                            modify: layerInfo.modify || false
                        };

                        if(shapeOptions.maps__CustomGeometry__c) {
                            MACustomShapes.drawV2(shapeInfo).always(function() {
                                callback();
                            });
                        }
                        else {
                            MA_DrawShapes.init(shapeInfo).always(function () {
                                callback();
                            });
                        }
                    });

                    s.concurrency = 5;

                    //plot each query
                    $.each(response.data || [], function (index, territory) {
                        s.push(territory);
                        /*if(territory.maps__CustomGeometry__c) {
                            MACustomShapes.drawV2({ id: territory.Id })
                        }
                        else {
                            MA_DrawShapes.init({ id: territory.Id });
                        }*/
                    });
                }
            }
        },{buffer:false,timeout:120000,escape:false}
    );

    //send a request to get the ids of all saved favorites in this folder
    var processData = {
		ajaxResource : 'TreeAJAXResources',
		action: 'get_folder_favorites',
		id: options.id
	};

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(response, event){
            //plot each query
            $.each(response.data || [], function (index, favorite) {
                PlotFavoriteLocation({ id: favorite.Id, name: favorite.Name });
            });
        }
    );

    //send a request to get the ids of all data layers in this folder
    var processData = {
		ajaxResource : 'TreeAJAXResources',
		action: 'get_folder_datalayers',
		id: options.id
	};

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(response, event){
            //plot each query
            $.each(response.data || [], function (index, layerData) {
                removeNamespace(namespace, layerData);
                let layerOptions = {
                    action: options.action,
                    id: layerData.Id,
                    type: 'datalayer',
                    name: layerData.Name,
                    description: layerData.Description__c || 'No Description',
                    baseObjectLabel: 'Data Layer',
                    modifiedInfo: layerData.LastModifiedDate,
                    createdInfo: layerData.CreatedDate,
                    nodetype: options.nodetype,
                    create: options.create,
                    delete: options.delete,
                    export: options.export,
                    modify: options.modify,
                    read: options.read,
                    setpermissions: options.setpermissions,
                    folderPath: options.folderPath
                };

                if (layers && layers.length) {
                    const layer = layers.find(l => l.id === layerData.Id);

                    layerOptions = {
                        ...layerOptions,
                        ...layer
                    };
                }

                MADemographicLayer.analyzeDataLayer(layerOptions);
            });
        }
    );

    //send a request to get the ids of all ArcGIS layers in this folder
    var processData = {
        ajaxResource: 'ArcGISAPI',
        securityToken: MASystem.MergeFields.Security_Token,
        action: 'getLayers',
        folderId: options.id
    };
    ArcGIS.ajaxRequest(processData).then(function(response) {
        if (response.success) {
            if (response.securityError){
                MAToastMessages.showWarning({'message':response.securityError,timeOut:6000});
            }
            response.records.forEach(function(record) {
                ArcGIS.plotLayer({
                    id: record.Id,
                    modify: options.modify
                });
            });
        }else if (response.securityError){
            MAToastMessages.showError({'message':response.securityError,timeOut:6000});

        }
    });
}

// returns true if num is an integer or float. Makes up for JavaScript's parseFloat, Number and isNaN shortcomings. trims the input.
function isNum(num) {
    return /^[+-]?\d+(.\d+)?$/.test(num);
}

function DoOnCompleteNewForSavedQry(NodeName,NodeId,baseObjectLabel,ParentNodeId,pNodeType,pIsCustom,pQueryType,pRel,pIsDynamic,advancedOptions)
{
    //Make New Node
    VueEventBus.$emit('refresh-folder');

    //Hide Popup
    ClosePopupWindow();
}

function DoOnCompleteEditSavedQry() {
    //Edit Existing Node
    VueEventBus.$emit('refresh-folder');
    //Hide Popup
    ClosePopupWindow();
}

/////////////////////////
/////////////////////////
var MaxExportSize;
var MaxQuerySize = 2000;

const checkMarkersInsideSelection = (selection) => {
    let showUnsupportedRenderModeToast = false;
    const markerSelection = MA.markerSelection;
    const  { 
        selectedMarkers,
        unselectedMarkers,
        selectedColor,
        sliderValue,
        sliderUnselectedValue,
        getSelectionCount,
        selectedOption
    } = markerSelection;
    let { selectionModeActive } = markerSelection;
    
    const $plottedLayers = $('#PlottedQueriesContainer .PlottedRowUnit');
    $plottedLayers.each(function() {
        let unsupportedRenderMode = false;
        const $plottedLayer = $(this);
        const layerId = $plottedLayer.data('savedQueryId');
        const renderList = [];
        const list = $plottedLayer.find('.item-selectable.active');
        for (let r = 0; r < list.length; r++) {
            const $row = $(list[r]);
            $row.addClass('sudo-active');
            const renderAs = $row.find('.renderButtons-button').attr('data-renderAs');
            if(renderAs === 'Markers')
                renderList.push(renderAs);
        }
        if (!['polyline', 'marker'].includes($plottedLayer.data('type').toLowerCase())) {
            return;
        } else if ((renderList.length === 0 || renderList.length > 1) && $plottedLayer.data('type') !== 'polyline') {
            unsupportedRenderMode = true;
        }

        if ($plottedLayer.data('type').toLowerCase() === 'polyline') {

            const records = Object.values($plottedLayer.data('records'));
            if (records) {
                records.forEach(record => {
                    const { 
                        Id: recordId,
                        savedQueryId: layerId,
                        polylineMarkers,
                        polylineMarker
                    } = record;

                    const selectionBoundary = selection.getBounds();
                    let vertexInPolyline = false;
                    for (let i = 0; i < polylineMarkers.length; i++) {
                        if (selectionBoundary.contains(polylineMarkers[i].getPosition())) {
                            vertexInPolyline = true;
                            break;
                        }
                    }
                    if (vertexInPolyline) {
                        // Add or subtract record
                        if (selectionModeActive === 'add') {
                            if (getSelectionCount() < 100 ) {
                                record.selected = true;

                                // Change appearance based on selectionStyle
                                if (selectedOption === 'opacity') {
                                    window.VueEventBus.$emit('handlePolylineOpacity', record);
                                } else {
                                    window.VueEventBus.$emit('handlePolylineColor', record);
                                }

                                // add record to selected
                                selectedMarkers[layerId] = selectedMarkers[layerId] || {};
                                selectedMarkers[layerId][recordId] = record;
                                // delete from unselected
                                if (unselectedMarkers[layerId] && unselectedMarkers[layerId][recordId]) {
                                    delete unselectedMarkers[layerId][recordId];
                                }
                            }
                        } else {
                            // Subtract Mode
                            record.selected = false;
                            // add record to unselected
                            unselectedMarkers[layerId] = unselectedMarkers[layerId] || {};
                            unselectedMarkers[layerId][recordId] = record;
                            // delete from selected
                            if (selectedMarkers[layerId] && selectedMarkers[layerId][recordId]) {
                                delete selectedMarkers[layerId][recordId];
                            }
                            // Set unselected Opacity if in Opacity mode
                            if (selectedOption === 'opacity') {
                                window.VueEventBus.$emit('handlePolylineOpacity', record);
                            } else {
                                window.VueEventBus.$emit('handlePolylineColor', record, true);
                            }
                        }
                    } else {
                        // Not part of the selection bounds.  Add to unselected if not already selected.
                        if (!record.selected) {
                            // add record to unselected
                            unselectedMarkers[layerId] = unselectedMarkers[layerId] || {};
                            unselectedMarkers[layerId][recordId] = record;
                            if (selectedOption === 'opacity') {
                                window.VueEventBus.$emit('handlePolylineOpacity', record);
                            }
                        }
                    }
                });
                window.VueEventBus.$emit('updateSelectedCount');
            }
        } else {
            // Handling Regular Markers
            const records = $plottedLayer.data('records') || {};
            let allMarkers = Object.values(records);
            const isMarkerLayer = $plottedLayer.data('type').toLowerCase() === 'marker';
            if (selectionModeActive === 'subtract' && isMarkerLayer) {
                allMarkers = allMarkers.filter(record => record.selected && selection.getBounds().contains(record.marker.getPosition()));
                if (!allMarkers.length) {
                    return;
                }
                allMarkers.forEach(marker => {
                    Plotting.Marker_Select_Subtract(marker);
                });
            } else if (selectionModeActive === 'add' && isMarkerLayer) {
                allMarkers = allMarkers.filter(record => !record.selected  && selection.getBounds().contains(record.marker.getPosition()));
                if (!allMarkers.length) {
                    return;
                } else if (unsupportedRenderMode) {
                    showUnsupportedRenderModeToast = true;
                    return;
                }
                for(let i = 0; i < allMarkers.length; i++) {
                    const marker = allMarkers[i];
                    if (getSelectionCount() < 100 ) {
                        Plotting.Marker_Select_Add(marker);
                    } else {
                        window.MAToastMessages.showWarning({message: window.MASystem.Labels.Marker_Selection_Max_100_Markers, timeOut: 6000 });
                        break;
                    }
                }
            }
            Object.values(records).forEach(marker => {
                if(!marker.selected) {
                    if(!unselectedMarkers[marker.savedQueryId]){
                        unselectedMarkers[marker.savedQueryId] = {};
                    }
                    unselectedMarkers[marker.savedQueryId][marker.record.Id] = marker;
                }
            });
        }
    });
    if (showUnsupportedRenderModeToast) {
        MAToastMessages.showWarning({
            message: MASystem.Labels.Layers_MultiSelect_Change_Visualization_Warning,
            timeOut: 6000,
            extendedTimeOut: 0,
            closeButton: true
        });
    }
    selection.setMap(null);
    selectionModeActive = null;
}

function StartUpJS()
{
    //if lightning experience remove padding
    // if(MASystem.MergeFields.SForceTheme == 'Theme4d') {
    //     //$('body').css('cssText','background-color: #16325c !important; padding: 0px !important;');
    //     $('#mapcontainer').css('left', '15px');
    //     $('#mapcontainer').css('width', 'calc(100% - 15px)');
    // }

    //handle resizing the window
    $(window).resize(function () {
        function doResize() {
            var mapHeight = $('#mapdiv').height();
            var sidebarHeight = $('div#sidebar-content').height();
            //check if lightning theme
            var LightningOffset = 0;
            var offsetHeight = $('#mapdiv').length > 0 ? $('#mapdiv').offset().top : 0;
            if(MASystem.MergeFields.SForceTheme != 'Theme4d') {
                var mapHeight = $('#mapdiv').height() + 23;
                var sidebarHeight = $('div#sidebar-content').height() + 23;
                var offsetHeight = offsetHeight - 24;
            }
            $("#mapdiv, #mapdiv #right-shadow, #mapcontainer, .bodyDiv, .MALoading, .noSidebarCell, .oRight, .sidebarCell").css('height', Math.max(485, $(window).height() - offsetHeight - LightningOffset) + "px");
            $('#sidebarCell').css('maxHeight', Math.max(485, $(window).height() - offsetHeight - LightningOffset) + "px");
            $('#SQTree, #PlottedQueriesTable, #routesCalendar, #Routing-Table, #poiResults').css('height', 'auto');
            $('#SQTree').css('max-height', mapHeight - 135);
            // $('#PlottedQueriesTable').css('max-height', mapHeight - 165);
            $('#routesCalendar').css('max-height', mapHeight - 205);
            $('#Routing-Table').css('max-height', mapHeight - 250);
            $('div#foldersearch-results-contents').css('min-height', sidebarHeight - 80);
            $('div#foldersearch-results-contents').css('max-height', mapHeight - 110);
            try { routesTabSlider.redrawSlider() } catch (err) {};
        }
        doResize();
        setTimeout(doResize, 200);  //resize again later because sometimes it doesn't take
    }).resize();

    //create map
    MA.map = new google.maps.Map(document.getElementById('mapdiv'), {
        center: { lat: 36.98500309285596, lng: -97.8662109375},
        zoom: 5,
        tilt: 0,
        rotateControl: false,
        panControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        fullscreenControl: true,
        fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        mapTypeControl: false,
        gestureHandling : 'greedy',
        scaleControl: true
    });

    //remove standard POI functionality
    MA.map.setOptions({
        styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'landscape', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ],
        draggableCursor : "url("+MASystem.Images.cursors.hand+"), auto"
    });

    MA.map._isVue = true;

    MA.map.data.setStyle(function(feature) {
        //check if we have any styling options
        var defaultStyles = {fillColor : '#000000', strokeColor: '#000000', strokeWeight : 3, fillOpacity : 0.2, strokeOpacity: 1};
        var styleOptions = feature.getProperty('styleOptions');

        if(styleOptions) {
            $.extend(defaultStyles,styleOptions);
        }

        return defaultStyles;
    });

    MA.map.data.addListener('click', function(event) {
        if( event.feature.getProperty('parcel') !== undefined ) {
            //could use options.mode for the isMobile
            var clickOptions = {
                isMobile : false
            }
           proximityLayer_Click({ position: event.latLng, type: 'data', feature: event.feature });
        }
    });
    MA.map.data.addListener('rightclick', function(event) {
        if( event.feature.getProperty('parcel') !== undefined ) {
            //could use options.mode for the isMobile
            var clickOptions = {
                isMobile : false
            }
            Shape_Context.call(event.feature, event);
        }
    });
    MA.map.data.addListener('mouseover', function(event) {
        if( event.feature.getProperty('parcel') !== undefined ) {
           this.overrideStyle(event.feature, {fillColor : '#000'});
        }
    });
    MA.map.data.addListener('mouseout', function(event) {
        if( event.feature.getProperty('parcel') !== undefined ) {
           this.revertStyle(event.feature);
        }
    });

    //handle streetview controls
    MA.map.getStreetView().setOptions({
        addressControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        panControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER }
    });

    //handle bounds changing (various purposes)
    google.maps.event.addListener(MA.map, 'bounds_changed', function (e) {
        //MA.Map.Search.autocomplete.setBounds(MA.map.getBounds());
        MAShapeLayer.ZoomOrDragEvent(e);

        //remove finished class from button and add update class
        $('#visibleAreaRefeshMap').removeClass('finished').addClass('update');

        //if not refreshing change text
        if(!$('#visibleAreaRefeshMap').hasClass('refreshing')) {
            $('.visibleAreaRefreshMapText').text('Refresh layers in this area');
        }

        //check if any visible area queries and button is not already visible or refreshing
        if(!$('#visibleAreaRefeshMap').hasClass('visible') && ($('#PlottedQueriesContainer .visibleOnly').length > 0 || $('#PlottedQueriesContainer .ArcGISLayer').length > 0)) {
            //show the button
            $('#visibleAreaRefeshMap').addClass('visible');
        }
    });


    //add keydragzoom functionality
    MA.map.enableKeyDragZoom();

    //create canvas overlay that will be used for position support
    MA.Map.offsetOverlay = new google.maps.OverlayView();
    MA.Map.offsetOverlay.draw = function() {};
    MA.Map.offsetOverlay.setMap(MA.map);

    //spiderfier to hold markers
    MA.Map.spiderfier = new OverlappingMarkerSpiderfier(MA.map, { keepSpiderfied: true });

    MA.Map.spiderfier.addListener('contextmenu', function (marker, e) {
        if (marker.spiderfied || MA.Map.spiderfier.markersNearMarker(marker, true).length == 0) {
            Plotting.marker_Select.call(marker, e);
        } else {
            //we will need to trigger a manual spiderfier
            MA.Map.spiderfier.F(marker, e);
        }
    });

    MA.Map.spiderfier.addListener('click', function (marker, e) {
        if (marker.spiderfied || MA.Map.spiderfier.markersNearMarker(marker, true).length == 0) {
            if(marker.type && marker.type === 'dataLayer') {
                MADemographicLayer.getDataLayerMarkerInfo.call(marker , {isMobile: false, layerName: marker.layerName, type: 'marker', key: marker.key});
            }
            else {
                Plotting.marker_Click.call(marker, { markerType: 'Marker' });
            }
        }
    });
    MA.Map.spiderfier.addListener('spiderfy', function (markersAffected, markersNotAffected) {
        $.each(markersAffected, function (i, marker) {
            marker.spiderfied = true;
        });
    });
    MA.Map.spiderfier.addListener('unspiderfy', function (markersAffected, markersNotAffected) {
        $.each(markersAffected, function (i, marker) {
            marker.spiderfied = false;
        });
    });

    MA.Map.spiderfier._isVue = true;

    //add drawing controls to the map
    MA.Map.Drawing.manager = new google.maps.drawing.DrawingManager({
        drawingControl: false,
        drawingControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.CIRCLE,
                google.maps.drawing.OverlayType.RECTANGLE
            ]
        },
        polygonOptions: {
            fillColor: '#22CC22',
            fillOpacity: 0.6,
            strokeColor: '#000000',
            strokeWeight: 4,
            editable: false
        },
        circleOptions: {
            fillColor: '#3083d3',
            fillOpacity: 0.6,
            strokeColor: '#16325C',
            strokeWeight: 4,
            editable: false
        },
        rectangleOptions: {
            fillColor: '#FFC96B',
            fillOpacity: 0.6,
            strokeColor: '#000000',
            strokeWeight: 4,
            editable: false
        }
    });
    MA.Map.Drawing.manager.setMap(MA.map);

    //handle drawing a shape
    google.maps.event.addListener(MA.Map.Drawing.manager, 'overlaycomplete', function (overlayCompleteEvent)
    {
        try {
            VueEventBus.$emit('move-to-tab', 'plotted');
        }
        catch(e){}
        switch (overlayCompleteEvent.type) {
            case google.maps.drawing.OverlayType.POLYLINE:

                //alert('POLYLINE!!!');

            break;
            case google.maps.drawing.OverlayType.POLYGON:
                addProximityLayer({
                    drawnShape: true,
                    shapeType: 'Polygon',
                    opacity: '0.6',
                    fillColor: '#22CC22',
                    borderColor: '#000000',
                }).then(function(proxPolyGonRef) {
                    var $proxLayer = proxPolyGonRef;
                    overlayCompleteEvent.overlay.qid = $proxLayer.data('qid');
                    $proxLayer.data('proxObject', overlayCompleteEvent.overlay);
                    //hide address
                    ChangeVisibilityWhenCircleIsAdded();

                    //handle shape-specific events
                    overlayCompleteEvent.overlay.getPaths().forEach(function (path) {
                        google.maps.event.addListener(path, 'insert_at', ChangeVisibilityWhenCircleIsAdded);
                        google.maps.event.addListener(path, 'set_at', ChangeVisibilityWhenCircleIsAdded);
                        google.maps.event.addListener(path, 'remove_at', ChangeVisibilityWhenCircleIsAdded);
                    });
                    trackUsage('Maps',{action: 'Draw Boundary (Polygon)'});
                });
            break;
            case google.maps.drawing.OverlayType.CIRCLE:
                var circleRadius = overlayCompleteEvent.overlay.getRadius();
                addProximityLayer({
                        drawnShape: true,
                        shapeType: 'Circle',
                        opacity: '0.6',
                        radius: circleRadius,
                        latitude: overlayCompleteEvent.overlay.getCenter().lat(),
                        longitude: overlayCompleteEvent.overlay.getCenter().lng()
                    }).then(function(proxRef) {
                    var $proxLayer = proxRef;
                    overlayCompleteEvent.overlay.qid = $proxLayer.data('qid');
                    $proxLayer.data('proxObject', overlayCompleteEvent.overlay);

                    //handle shape-specific events
                    google.maps.event.addListener(overlayCompleteEvent.overlay, 'center_changed', ChangeVisibilityWhenCircleIsAdded);
                    google.maps.event.addListener(overlayCompleteEvent.overlay, 'radius_changed', ChangeVisibilityWhenCircleIsAdded);
                    // analytics
                    trackUsage('Maps',{action: 'Draw Boundary (Circle)'});                     
                });

            break;
            case google.maps.drawing.OverlayType.RECTANGLE:
                if (window.MA.markerSelection.selectionModeActive || window.MA.markerSelection.ctrl) {
                    try {
                        checkMarkersInsideSelection(overlayCompleteEvent.overlay);
                        if (window.MA.markerSelection.getSelectionCount() > 0) {
                            MA.markerSelection.openSelectionPrompt();
                        }
                    } catch(e){
                        console.log('caught error: ', e);
                    }
                    MA.markerSelection.selectionModeActive = null;
                    break;
                } else {
                addProximityLayer({
                        drawnShape: true,
                        fillColor: '#FFC96B',
                        borderColor: '#000000',
                        shapeType: 'Polygon',
                        opacity: '0.6'
                    }).then(function(proxRectangleRef) {
                    var $proxLayer = proxRectangleRef;
                    overlayCompleteEvent.overlay.qid = $proxLayer.data('qid');
                    $proxLayer.data('proxObject', overlayCompleteEvent.overlay);
                    // $proxLayer.find('.js-address-wrapper').addClass('hidden');
                    ChangeVisibilityWhenCircleIsAdded();

                    //handle shape-specific events
                    google.maps.event.addListener(overlayCompleteEvent.overlay, 'bounds_changed', ChangeVisibilityWhenCircleIsAdded);
                    // analytics
                    trackUsage('Maps',{action: 'Draw Boundary (Rectangle)'});
                });
            }
            break;
        }

        //handle events
        google.maps.event.addListener(overlayCompleteEvent.overlay, 'click', function (e) {
            proximityLayer_Click({ position: e.latLng, type: overlayCompleteEvent.type, shape: this });
        });
        google.maps.event.addListener(overlayCompleteEvent.overlay, 'rightclick', function (e) {
            Shape_Context.call(this, e);
        });

        if($('#sidebar-content #tabs-nav-plotted').hasClass('tab-open'))
         {
          //do nothing tab already selected
         }
         else
         {
          //click tab to show results
               $('a[href="#tab-plotted"]').click();
         }

        if (!MA.markerSelection.ctrl) {
            // reset drawing mode
            MA.Map.Drawing.manager.setDrawingMode(null);

            // emit event to change drawing mode to the navBar Vue app. This will make necessary updates to DOM
            window.VueEventBus.$emit('drawing-mode-update', MA.Map.Drawing.manager.getDrawingMode());
        }
    });

    /*****************************************************************
    * Map event listeners
    *****************************************************************/
    // Map Context Menu
    if(!MA.isMobile) {
        // Hide open context menu
        google.maps.event.addListener(MA.map, 'zoom_changed', function() { try { $('#mapdiv').contextMenu('hide'); window.ContextMenuClick = {}; } catch (err) {} });
        google.maps.event.addListener(MA.map, 'bounds_changed', function() { try { $('#mapdiv').contextMenu('hide'); window.ContextMenuClick = {}; } catch (err) {} });
        
        window.addEventListener('keydown', (e) => {
            if(MA.markerSelection.ctrl && (e.which === '32' || e.code === 'Space')) {
                MA.markerSelection.spaceKey = true;
            } else if(!MA.markerSelection.ctrl && e.ctrlKey) {
                MA.markerSelection.ctrl = true; 
                window.ChangeDrawingManagerMode({
                    mode: 'rectangle'
                });
            }
        });

        window.addEventListener('keyup', (e) => {
            try {
                if(e.ctrlKey && (e.which === '32' || e.code === 'Space')) {
                    MA.markerSelection.spaceKey = false;
                } else if(MA.markerSelection.ctrl && !e.ctrlKey) {
                    MA.markerSelection.ctrl = false;
                    MA.markerSelection.spaceKey = false;
                    window.ChangeDrawingManagerMode({
                        mode: 'hand'
                    });
                }
            } catch(e) {}
        });

        google.maps.event.addListener(MA.map, 'mousedown', function(e) {
            if (MA.markerSelection.ctrl) {
                MA.markerSelection.selectionModeActive = MA.markerSelection.spaceKey ? 'subtract' : 'add';
            }
            try { 
                $('#mapdiv').contextMenu('hide'); window.ContextMenuClick = {};
            } catch (err) {}
        });

        // Show map context
        google.maps.event.addListener(MA.map,'rightclick',function(e) { 
            // checks if we clicked on a cluster by checking for the cluster class or the classes associated to the context menu before calling map click
            // the cluster class is for windows devices and the context menu classes are for macs as the macs seem to show the context menu as the click path instead of the cluster
            // adding a try catch in case any variables or functions don't exist for a browser
            try {
                if (!MA.markerSelection.ctrl) {
                    var classesToCheck = ['cluster', 'context-menu-layer', 'context-menu-list', 'context-menu-item'];
                    if (!(e && e.domEvent && e.domEvent.path) || !e.domEvent.path.some(el => el.id === 'context-menu-layer' || (el.classList && Array.from(el.classList.values()).some(cl => classesToCheck.includes(cl))))) {
                        Map_Context.call(this, e);
                    }
                }
            }
            catch (ex) {
                console.warn(ex);
                Map_Context.call(this, e);
            }
        });
    }

    //handle clicking the map
    google.maps.event.addListener(MA.map, 'click', function (e)
    {
        //check for nextclick handlers
        if (MA.events['nextclick'].length > 0) {
            MA.fire('nextclick', e);
            return;
        }

        //remove info bubble
        MA.Map.InfoBubble.hide();

        try { $.vakata.context.hide(); } catch (err) {}
    });

    /*****************************************************************/

    //map is now available for use so fire the mapready event
    MA.fire('mapready');

    //check on loading screen
    $('.MALoading .map-loading').addClass('success');
}


function ChangeDrawingManagerMode(options)
{
    /**
        options = {
            element: DOMElement Object, // DOM element that may have been clicked to get to this point
            mode: STRING, // drawing tool mode,
            drawingToolsButtonsClassName: STRING // class name of drawing tools buttons so they can be easily selected and manipulated if needed
        }
    **/
    options = options || {};

    switch(options.mode)
    {
        case 'hand':
            MA.Map.Drawing.manager.setDrawingMode(null);
            break;
        case 'polygon':
            MA.Map.Drawing.manager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            break;
        case 'circle':
            MA.Map.Drawing.manager.setDrawingMode(google.maps.drawing.OverlayType.CIRCLE);
            break;
        case 'rectangle':

            MA.Map.Drawing.manager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
            break;
        default:
            MA.Map.Drawing.manager.setDrawingMode(null);
    }
}


function GoToHomePosition()
{
    if (userSettings.defaultMapSettings.latitude == undefined && userSettings.defaultMapSettings.longitude == undefined && userSettings.defaultMapSettings.zoomLevel == undefined && userSettings.defaultMapSettings.mapType == undefined)
    {
        NotifyError(MASystem.MergeFields.MAHomeSetInfoLabel);
    }
    else
    {

        if (userSettings.defaultMapSettings.latitude != undefined && userSettings.defaultMapSettings.longitude != undefined) {
            MA.map.setCenter(new google.maps.LatLng(userSettings.defaultMapSettings.latitude, userSettings.defaultMapSettings.longitude));
            MA.map.setZoom(userSettings.defaultMapSettings.zoomLevel || MA.map.getZoom());

        }
    }
}

var visibilityUpdating = false;
var visibilityQueued = false;

var RouteObj = {};
var RouteWaypoints = [];

function SetDefaultMapLocation(options)
{
    /**
        // optional object to affect what gets saved as the map type
        options = {
            mapTypeId: STRING // a valid google.maps.MapTypeId
            customTileId: STRING // record id of custom tile
        }
    **/
    options = options || {};
    trackUsage('Maps',{action: 'Set Default View'});

    var processData = {
    	ajaxResource : 'UserAJAXResources',

    	action: 'set_default_map_location',
    	id: MASystem.User.Id,
    	zoomlvl : MA.map.getZoom(),
    	lat : MA.map.getCenter().lat(),
    	long : MA.map.getCenter().lng(),
    	type : options.customTileId ? (MA.map.getMapTypeId() + ':' + options.customTileId) : MA.map.getMapTypeId() // $('.MapViewTitle.Active').closest('td').attr('data-basemaptype')
    };

    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(json, event) {
            if(json.success) {
                $.extend(userSettings.defaultMapSettings, {
                    latitude    : MA.map.getCenter().lat(),
                    longitude   : MA.map.getCenter().lng(),
                    zoomLevel   : MA.map.getZoom(),
                    mapType     : MA.map.getMapTypeId() + ((typeof customTileId == 'string' && !customTileId.trim()) ? customTileId.trim() : '')
                });
                MAToastMessages.showSuccess({message:MASystem.Labels.NavBar_Default_View_Saved});
            }
            else {
                MAToastMessages.showError({message:MASystem.Labels.MA_Error_Updating_Default_Location, subMessage: json.error, timeOut: 0, closeButton:true, extendedTimeOut: 0});
                console.warn(formatLabel(MASystem.Labels.NavBar_Cant_Update_Default_Location, [json.error]));
            }
        },{buffer:false,escape:false}
    );
}

function unique(arrayName)
{
    //Return Unique Array
    var ReturnArray = new Array();
    $.each(arrayName,
        function(index, value)
        {
            if ($.inArray(value, ReturnArray) < 0)
            {
                ReturnArray.push(value);
            }
        }
    );

    return ReturnArray;
}

////////////////////  Format Tooltip Types  /////////////////////////////////////
var sforce = sforce || { internal: {}, connection: {} };
if(!sforce.internal) {
    sforce.internal = {};
}
if(!sforce.connection) {
    sforce.connection = {};
}
sforce.internal.stringToDateTime = function(source) {
    var bc = false;
    if (source === null || source.length === 0) {
        throw "Unable to parse dateTime1";
    }

    if (source.charAt(0) == '+') {
        source = source.substring(1);
    }
    if (source.charAt(0) == '-') {
        source = source.substring(1);
        bc = true;
    }

    if (source.length < 19) {
        throw ("Unable to parse dateTime2");
    }

    if (source.charAt(4) != '-' || source.charAt(7) != '-' ||
        source.charAt(10) != 'T') {
        throw ("Unable to parse dateTime3");
    }

    if (source.charAt(13) != ':' || source.charAt(16) != ':') {
        throw ("Unable to parse dateTime4");
    }

    var year = source.substring(0, 4);
    var month = source.substring(5, 7);
    var day = source.substring(8, 10);
    var hour = source.substring(11, 13);
    var min = source.substring(14, 16);
    var sec = source.substring(17, 19);

    var date = new Date(year, month-1, day, hour, min, sec);

    var pos = 19;

    // parse optional milliseconds
    if (pos < source.length && source.charAt(pos) == '.') {
        var milliseconds = 0;
        var start = ++pos;
        while (pos < source.length && sforce.internal.isDigit(source.charAt(pos))) {
            pos++;
        }
        var decimal = source.substring(start, pos);
        if (decimal.length == 3) {
            milliseconds = decimal;
        } else if (decimal.length < 3) {
            milliseconds = (decimal + "000").substring(0, 3);
        } else {
            milliseconds = decimal.substring(0, 3);
            if (decimal.charAt(3) >= '5') {
                ++milliseconds;
            }
        }

        date.setMilliseconds(milliseconds);
    }

    var offset = date.getTimezoneOffset() * 60000;
    //offset in milli;

    // parse optional timezone
    if (pos + 4 < source.length &&
    (source.charAt(pos) == '+' || (source.charAt(pos) == '-'))) {

        var hours = (source.charAt(pos + 1) - '0') * 10 + source.charAt(pos + 2) - '0';
        var mins = 0;
        if(source.charAt(pos + 3) == ':' )
        {
            mins = (source.charAt(pos + 4) - '0') * 10 + source.charAt(pos + 5) - '0';
            pos += 6;
        }
        else
        {
            mins = (source.charAt(pos + 3) - '0') * 10 + source.charAt(pos + 4) - '0';
            pos += 5;
        }
        var mseconds = (hours * 60 + mins) * 60 * 1000;

        // subtract milliseconds from current date to obtain GMT
        if (source.charAt(pos) == '+') {
            mseconds = -mseconds;
        }

        date = new Date(date.getTime() - offset + mseconds);
    }

    if (pos < source.length && source.charAt(pos) == 'Z') {
        pos++;
        date = new Date(date.getTime() - offset);
    }

    if (pos < source.length) {
        throw ("Unable to parse dateTime " + pos + " " + source.length);
    }

    return date;
};

function LaunchPopupWindow($popup, width, skipAppend)
{
    //scroll to top
    $('body').animate({ scrollTop: 0 }, "slow");

    //add the popup
    if (skipAppend) {   //quick fix for broken comboboxes due to dom manipulation
        $popup.fadeIn().css({
            width: width + 'px',
            position: 'absolute',
            top: '15px',
            left: Math.floor(($('body').width() - width) / 2) + 'px'
        });
    }
    else {
        $popup.appendTo('body').fadeIn().css({
            width: width + 'px',
            position: 'absolute',
            top: '15px',
            left: Math.floor(($('body').width() - width) / 2) + 'px'
        });
    }

    //add the fade layer
    //$('body').append('<div id="fade"></div>');
    //$('#fade').css({'filter' : 'alpha(opacity=80)'}).fadeIn();
    MA.Popup.showBackdrop();
    $popup.trigger('blah');

    //backdrop v2


    //try to focus on input
    setTimeout(function(){
        $popup.find('input[type=text]').eq(0).focus();
    });
}

function ClosePopupWindow()
{
    $('#fade , .popup_block').fadeOut(function() {
            $('#fade, a.close').remove();
    }); //fade them both out

    //backdrop v2
    MA.Popup.hideBackdrop();

}


function CloseMenuIfOpen(MenuId)
{
    if($('#' + MenuId).is(":visible"))
    {
        //Menu is Visible, Hide Menu
        $('#' + MenuId).slideToggle('normal', function() {
            // Animation complete.
        });
    }
}

    /************************
    *   Query Editor
    ************************/
    function queryEditorSaveComplete (queryId, baseObjectLabel, query, plotQueryOnComplete, queryIndex)
    {
        //determine if this query has a dynamic filter
        var isDynamic = false;
        $.each(query.filters || [], function (i, filter) {
            if (filter.value == ':Dynamic' || filter.value2 == ':Dynamic') {
                isDynamic = true;
            }
        });

        if (query.id)
        {
            //grab advancedOptions
            var advancedOptions;
            try {
                advancedOptions = JSON.stringify(query.advancedOptions);
            }
            catch (e) {
                advancedOptions = JSON.stringify({});
            }

            //this was an edit
            DoOnCompleteEditSavedQry(query.name, queryId, query.colorAssignmentType, isDynamic, advancedOptions);
        }
        else
        {
            //grab advancedOptions
            var advancedOptions;
            try {
                advancedOptions = JSON.stringify(query.advancedOptions);
            }
            catch (e) {
                advancedOptions = JSON.stringify({});
            }

            //this was new
            DoOnCompleteNewForSavedQry(
                query.name,
                queryId,
                baseObjectLabel,
                query.folderId,
                query.folderType.indexOf('Personal') == -1 ? 'CorporateSavedQuery' : 'PersonalSavedQuery',
                "false",
                query.colorAssignmentType == 'Static' ? 'Standard' : 'Legend',
                query.colorAssignmentType == 'Static' ? 'SavedQuery' : 'LegendSavedQuery',
                isDynamic,
                advancedOptions
            );
        }

        VueEventBus.$emit('close-query-builder');

        if (plotQueryOnComplete) {
            //determine if this is a visible area only query
            var visibleOnly = false;
            if(query.advancedOptions && query.advancedOptions.defaultRenderArea == 'VisibleArea') {
                visibleOnly = true;
            }
            if(query.advancedOptions && query.advancedOptions.defaultRenderMode) {
                renderMode = query.advancedOptions.defaultRenderMode;
                $('#PlottedQueriesTable').children().eq(queryIndex).data('renderMode', renderMode);
            }

            if (queryIndex) {
                //check if visible area has changed
                if(visibleOnly) {
                    $('#PlottedQueriesTable').children().eq(queryIndex).data('visibleAreaOnly', true).addClass('visibleOnly');
                }
                else {
                    $('#PlottedQueriesTable').children().eq(queryIndex).data('visibleAreaOnly',false).removeClass('visibleOnly');
                }
                Plotting.refreshQuery($('#PlottedQueriesTable').children().eq(queryIndex),null,{force:true});
            }
            else {
                var hoverInfo = (getProperty(MASystem, 'User.FullName', false) || '') + ' ' + new moment().format(formatUserLocaleDate({moment:true}));
                var queryDesc = query.description === '' ? 'No Description' : query.description;
                var plotOptions = {
                    id: (query.id || queryId),
                    renderAs: [renderMode],
                    visibleAreaOnly : visibleOnly || false,
                    name : query.name || query.Name || '',
                    modify : true, //if user is creating a query, they should be able to edit it so hardcoding true here
                    layerType: query.layerType,
                    type: query.layerType || 'marker',
                    component: query.layerType.toLowerCase() === 'polyline' ? 'polylineLayer' : null,
                    description: queryDesc || 'No Description',
                    modifiedInfo: hoverInfo,
                    createdInfo: hoverInfo,
                    baseObjectLabel: query.baseObject || 'N/A',
                    baseObjectId: query.baseObjectId
                }
                Plotting.analyzeQuery(plotOptions);
            }

            try {
                //BEGIN MA ANALYTICS
                var processData = {
        			ajaxResource : 'TreeAJAXResources',
        			action: 'store_layer_analytics',
        			track : 'true',
        			subtype : 'Marker Layer',
        			id : queryId
        		};

        	    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        			processData,
        			function(res, event){
                        if( NewLayerNavigationEnabled() ) {
                            VueEventBus.$emit('get-recent-layers');
                        }
                    }
                );
                //END MA ANALYTICS
            } catch (err) {
                MA.log(err);
            }
        }
    }

    /**********************
    *   Helper Methods
    ***********************/

    //helper method for extracting nested objects using a dot notation field name
    function extractValue(obj, field)
    {
        try {
            var fieldParts = field.split('.');
            var currentObj = obj;
            for (var i = 0; i < fieldParts.length; i++)
            {
                currentObj = currentObj[fieldParts[i]];
            }
            return (typeof currentObj == 'undefined' || currentObj == null) ? '' : currentObj;
        }
        catch (err) { }

        return '';
    }

    function handleDynamicMultifieldClick($plottedQuery,$button) {
        if ($button.find('.moreless-text').text() == window.MASystem.Labels.Layers_On_The_Map_Plotted_Marker_Layer_Button_Show_All) {
            $button.find('.moreless-text').text(window.MASystem.Labels.Layers_On_The_Map_Plotted_Marker_Layer_Button_Show_Less);
            $button.find('.MAIcon').removeClass('glyphicon-collapse-down').addClass('glyphicon-collapse-up');
            $plottedQuery.find('.legend-row').show();
            $plottedQuery.find('.legend-row-header').show();
            $plottedQuery.find('.legend-row-header').addClass('sectionOpen').removeClass('sectionClosed');
            $plottedQuery.find('.legend-row-header .rowDropIcon').addClass('ion-android-arrow-dropdown').removeClass('ion-android-arrow-dropup');
        }
        else if ($button.find('.moreless-text').text() == window.MASystem.Labels.Layers_On_The_Map_Show_More) {
            $button.find('.moreless-text').text(window.MASystem.Labels.Layers_On_The_Map_Plotted_Marker_Layer_Button_Show_All);
            $button.find('.MAIcon').removeClass('glyphicon-collapse-up').addClass('glyphicon-collapse-down');
            $plottedQuery.find('.legend-row:not(.empty)').show()
            $plottedQuery.find('.legend-row-header:not(.empty)').show()
            $plottedQuery.find('.legend-row-header:not(.empty)').removeClass('sectionOpen').addClass('sectionClosed');
            $plottedQuery.find('.legend-row-header:not(.empty) .rowDropIcon').addClass('ion-android-arrow-dropdown').removeClass('ion-android-arrow-dropup');
        }
        else {
            //show less
            $button.find('.moreless-text').text(window.MASystem.Labels.Layers_On_The_Map_Show_More);
            $button.find('.MAIcon').removeClass('glyphicon-collapse-up').addClass('glyphicon-expand');
            $plottedQuery.find('.legend-row').hide();
            $plottedQuery.find('.legend-row-header.empty').hide();
            $plottedQuery.find('.legend-row-header').removeClass('sectionOpen').addClass('sectionClosed');
            $plottedQuery.find('.legend-row-header .rowDropIcon').removeClass('ion-android-arrow-dropdown').addClass('ion-android-arrow-dropup');
        }
    }
