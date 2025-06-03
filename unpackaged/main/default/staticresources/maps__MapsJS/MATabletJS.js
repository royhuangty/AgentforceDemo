/*global
    $
    MA
    MASystem
    google
    Plotting
    getProperty
    MAMarkerBuilder
*/
var notPrintEmailPage = true;
var $searchLoading;
var PositionEnabled;
var isDesktopPage = false;
var myCachedPosition;
var legacyMobile = false;
/******************************************************
 *
 * Using this obj to check if things are loaded,
 * space out loading for faster load times
 *
 ******************************************************/
var eventListenLoaded = {
    addToCampaign : false,
    newTask : false,
    newEvent : false,
    listViewScroll : false,
    searchMap : false
}


$(function () {
    try {
        jscolor.init();
    }
    catch(e) {
        //just use default colors
    }

    /*************************************
     * add listener for dynamic filters
     * aka pills
    *************************************/
    $(document).on('click','.js-remove-pill',function() {
        $(this).remove();
    });

    /***************************************
     * handle all number input formatting
    *****************************************/
    $('body').on('keyup','input.numberVal',function(event) {
        // skip for arrow keys
        if (event.which >= 37 && event.which <= 40) {
            event.preventDefault();
        }

        var currentVal = $(this).val();
        var testDecimal = testDecimals(currentVal);
        if($(this).hasClass('js-whole-number') && testDecimal.length > 0) {
            currentVal = currentVal.slice(0, -1);
        }
        else if (testDecimal.length > 1) {
            currentVal = currentVal.slice(0, -1);
        }

        $(this).val(replaceCommas(currentVal));
    });


    //set up route waypoint spiderfy
    var MARoutes = {};

    MA.isMobile = true;

    /************************************
     * Set up toastr
     ************************************/
    var toastInt = setInterval(function() {
        if(typeof toastr == 'object') {
            clearInterval(toastInt);
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
            };
        }
    });
    /************************************
     *  end toastr
     ************************************/

    /************************************************
     * Overwrite marker click function for mobile
     ************************************************/
    var plottingOverwriteInt = setInterval(function () {
        if(typeof Plotting === 'object') {

            clearInterval(plottingOverwriteInt);
            Plotting.marker_Click = function(options) {
                options = $.extend({
                    markerType: 'marker'
                }, options || {});
                var marker = this;
                var qid = marker.qid;
                if(!qid) {
                    return;
                }
                try {
                    marker.setMap(MA.map);
                }
                catch(e) {}

                var $plottedQuery;
                var showNotes = false;
                if(marker.layerType === 'waypoint-marker' && !options.routingData) {

                    var $routingTable = $('#routeSingleListView');

                    showNotes = true;

                    //grab the secondary data
                    var routeData = $routingTable.data() || {};
                    //grab the plotted queries
                    var plottedQueries = routeData.plottedQueries;
                    //grab the query we need
                    $plottedQuery = plottedQueries[marker.savedQueryId] || {};
                }
                else if (marker.type && marker.type === 'dataLayer') {
                    window.MADemographicLayer.getDataLayerMarkerInfo.call(marker, {
                        isMobile: true,
                        layerName: marker.layerName,
                        type: 'marker',
                        key: marker.key
                    });
                }
                else if (marker.layerType === 'sched-marker') {
                    var $schedTable = $('#scheduleWrap');
                    var routeData = $schedTable.data() || {};
                    //grab the plotted queries
                    var plottedQueries = routeData.plottedQueries;
                    //grab the query we need
                    $plottedQuery = plottedQueries[marker.savedQueryId] || {};
                }
                else {
                    $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+qid+'"]');
                }

                var $tooltipContent = $('#markerTooltipWrap');
                var queryMetaData = options.routingData || $plottedQuery.data();
                var records = queryMetaData.records || {};
                var recordId = marker.record.Id;
                var record = records[recordId];

                if(marker.layerType === 'waypoint-marker') {
                    record.isRouteMarker = true;
                }

                var markerOptions = {
                    type: 'sfdc-marker',
                    record: record,
                    recordId: recordId,
                    queryMetaData: queryMetaData,
                    marker: marker
                };
                VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
            };
        }
    },500);
});

var MALayers = {
    currentFolder : '',
    showModal : function (modalId) {
        $('#'+modalId+'').addClass('in');
        $('#'+modalId+'').addClass('slds-fade-in-open');
        /*if ( $($Id).has('.ma-modal-search-input') ) {
         $($Id).find('.ma-modal-search-input').focus();
         } else {}*/
        $('#modalScreen').addClass('in')
    },
    hideModal : function (modalSelector,hideMask) {
        hideMask = hideMask === false ? false : true;
        if(modalSelector != undefined) {
            $('#'+modalSelector+'').removeClass('in');
            $('#'+modalSelector+'').removeClass('slds-fade-in-open');
            $('#'+modalSelector+'').find('.slds-modal').removeClass('slds-fade-in-open');
        }
        else {
            //hide all modals
            $('.ma-modal').removeClass('in');
            $('.ma-modal').removeClass('slds-fade-in-open');
            $('.maModal').removeClass('in');
            $('.maModal').removeClass('slds-fade-in-open');
        }

        if(hideMask) {
            $('#modalScreen').removeClass('in');
            $('.backdrop').removeClass('active');
            $('.slds-backdrop').removeClass('slds-backdrop_open');
        }
        $('.select2-hidden-accessible').select2('close');
    },
    loadRecent: function () {
        VueEventBus.$emit('load-recents-layers');
    },
    isPlotOnLoad : {},
    moveToTab: function (tab) {
        console.log('deprecated', tab);
        if (tab === 'plotted') {
            VueEventBus.$emit('change-tab', 'layers');
            VueEventBus.$emit('update-layer-tab', 'tabLayersActive');
        }
    },
    isPhoneSize: function() {
        return $('#mapWrapSelector').width() < 769;
    },
    isTabletSize: function() {
        return $('#mapWrapSelector').width() >= 769;
    },
};

function CreateFavorite(options)
{
    options = $.extend({
        name : ''
    }, options || {});

    VueEventBus.$bus.$emit('open-modal', { modal: 'create-favorite', options: options});
}

function NewLayerNavigationEnabled () {
    return true;
}

function GoToHomePosition()
{
    if (userSettings.defaultMapSettings.latitude == undefined && userSettings.defaultMapSettings.longitude == undefined && userSettings.defaultMapSettings.zoomLevel == undefined && userSettings.defaultMapSettings.mapType == undefined)
    {
        MAToastMessages.showWarning({message:MASystem.MergeFields.MAHomeSetInfoLabel});
    }
    else
    {
        if (userSettings.defaultMapSettings.latitude != undefined && userSettings.defaultMapSettings.longitude != undefined) {
            MA.map.setCenter(new google.maps.LatLng(userSettings.defaultMapSettings.latitude, userSettings.defaultMapSettings.longitude));
            MA.map.setZoom(userSettings.defaultMapSettings.zoomLevel || MA.map.getZoom());
        }
    }
}

function cluster_Click(cluster)
{
    shape_cluster_popup(
        {
            cluster : cluster,
            type : 'cluster'
        }
    );
}

function ClosePopupWindow () {
    MALayers.hideModal();
}
function Shape_Context() {}
function cluster_context(){}
function favLocation_Click (){
    var marker = this;
    var record = marker.record || {};
    var markerOptions = {
        type: 'favorite-marker',
        record: {
            name: marker.title,
            address: marker.location.address,
            description: record.description || '',
            location: {
                coordinates: marker.location
            }
        },
        marker: marker,
        queryMetaData: {}
    };
    VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
}
function marker_Context (){}


function launchSaveShapeUI(params) {
    var saveShapePopupId = 'saveShapePopup';
    var $saveShapePopup = $('#' + saveShapePopupId);
    var $saveButton = $saveShapePopup.find('#saveShapeLayerButton');

    // clear any previous values from input
    $saveShapePopup.find('.ma-input').val('');
    $('#selectedFolder').html('').attr('data-folder-id', '');

    $saveButton.unbind('click');

    $saveButton.click(function() {
        var shapeLayerName = $saveShapePopup.find('#shapeLayerName').val();
        var shapeLayerDescription = $saveShapePopup.find('#shapeLayerDescription').val();
        var folderId = $('#selectedFolder').attr('data-folder-id') || 'PersonalRoot'; // default to Personal folder if no folder was selected

        var saveShapeInputIsValid = typeof shapeLayerName == 'string' && typeof folderId == 'string' && shapeLayerName.trim() && folderId.trim();

        if (saveShapeInputIsValid) 
        {
            $('#saveShapePopup .slds-spinner_container').show();
            var options = {
                shapeLayerName: shapeLayerName,
                shapeLayerDescription: shapeLayerDescription,
                folderId: folderId,
                shapeInfo: params
            };
    
            MAShapeLayer.saveShape(options)
                .then(function(res) {
                    if (res.success) {
                        var data = res.data || {};
                        NotifySuccess('Shape Layer saved!');            
                        MALayers.hideModal(saveShapePopupId, true);
                        VueEventBus.$emit('change-tab', 'layers');
                        VueEventBus.$emit('update-layer-tab', 'tabLayersActive');
                        // remove drawn shape
                        VueEventBus.$emit('remove-layer', params.qid);
                        MACustomShapes.drawV2({
                            "id": data.Id,
                            "qid": moment().format('x') + '_shape',
                            "type": "shape",
                            "component": "shapeLayer",
                            "name": data.Name,
                            "defaultAction": "plot-shape-custom",
                            "description": data.maps__Description__c || '',
                            "baseObjectLabel": "N/A",
                            "modifiedInfo": "N/A",
                            "createdInfo": MASystem.User.FullName + ', ' + moment().format('M/D/YYYY h:mm a'),
                            "nodetype": "PersonalTerritory",
                            "create": true,
                            "delete": true,
                            "export": true,
                            "modify": true,
                            "read": true,
                            "setpermissions": true,
                            "folderPath": "",
                            "isLoading": true
                        });
                    } else {
                        NotifyError('Error while saving shape!');
                    }
                })
                .fail(function(err) {
                    console.warn(err);
                    NotifyError(MA.getProperty(err, 'message') || 'Error while saving shape!');
                }).always(function() {
                    $('#saveShapePopup .slds-spinner_container').hide();
                });
        }
        else 
        {
            NotifyWarning('Please enter a valid shape name and select a folder to save the shape');
        }
    });

    MALayers.showModal(saveShapePopupId);
}

function launchFolderSelector(element) {
    var MAFolderSelector = new MA.Folder.Selector();

    MAFolderSelector.launch()
        .then(function(res) {
            var $selectedFolder = $('#selectedFolder');
            $selectedFolder.html('');

            var folder = MA.getProperty(res, 'folder');
            var folderId = MA.getProperty(folder, 'Id');
            var folderName = MA.getProperty(folder, 'Name');
            var breadcrumbs = MA.getProperty(res, 'breadcrumbs');

            var breadCrumbsText = '';

            if (Array.isArray(breadcrumbs)) {
                breadcrumbs.concat(folder).forEach(function(breadcrumb, index, array) {
                    var folderName = MA.getProperty(breadcrumb, 'Name');

                    if (index < array.length - 1) {
                        breadCrumbsText += folderName + ' > ';
                    } else {
                        breadCrumbsText += folderName;
                    }
                });
            }

            $selectedFolder.attr('data-folder-id', folderId);
            $selectedFolder.attr('data-folder-name', folderName);
            $selectedFolder.html(breadCrumbsText);
        })
        .fail(function(err) {
            err = err || {};

            if (err.cancel) {
                // user cancelled
            } else {
                NotifyWarning('Maps Folder not selected successfully');
            }
        });
}

function parsehhmmsst(arg) {
    var result = 0, arr = arg.split(':')
    if (parseInt(arr[0]) < 12) {
        result = parseInt(arr[0]) * 3600 // hours
    }
    result += parseInt(arr[1]) * 60 // minutes
    if (arg.indexOf('p') > -1) {  // 8:00 PM > 8:00 AM
        result += 43200
    }
    return result
}
