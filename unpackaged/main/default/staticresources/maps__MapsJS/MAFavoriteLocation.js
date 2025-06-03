function NewLayerNavigationEnabled()
{
    return (typeof MALayers != "undefined");
}

function PlotFavoriteLocation(options) {
    //BEGIN MA ANALYTICS
    var processData = { 
		ajaxResource : 'TreeAJAXResources',
		action: 'store_layer_analytics',
		track : 'true',
		subtype : 'Favorite Location',
		id : options.id
	};
	
    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
		processData,
		function(res, event){
            if(NewLayerNavigationEnabled()) {
                VueEventBus.$emit('get-recent-layers');
            }
        }
    );
    //END MA ANALYTICS
    if (!options.qid) {
        options.qid = 'fav_' + moment().format('x');
    }

    // if desktop use vue
    options.component = 'FavoriteLayer';
    VueEventBus.$emit('add-layer', options, function () {
        // not needed...
    });
}


function removeFavLocaiton($favLayer)
{
    var dfd = $.Deferred();
    //unrender the fav layer
    $favLayer.data('marker').setMap(null);
    
    //remove the prox layer from the layers section
    if (MA.isMobile) {
        $favLayer.slideUp(300, function () {
            $favLayer.remove(); 
        });
    }
    //done
    dfd.resolve();
    return dfd.promise();
}

function RemovePlotFavLocation() {
    $('#PlottedQueriesTable .FavoriteRowUnit').each(function (i,row){
        $(row).find('.btn-remove').click();
    });
}

//handle clicking a favorite location marker
function favLocation_Click() {
    var marker = this;
    if (MA.isMobile) {
        var markerOptions = {
            type: 'favorite-marker',
            record: marker.record,
            marker: marker
        };
        VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
    } else {
        //build the tooltip content for this location
        const localeFormattedAddress = window.formatLocaleAddress(window.MASystem.User.UserLocale, JSON.parse(marker.addressFields));
        var $tooltipContent = $(
            '<div class="favlocation-tooltip-content" style="overflow: hidden;">' +
                '<table>' +
                    '<tr>' +
                        // '<td>Name:</td>' +
                        '<td class="name info">' + htmlEncode(marker.title) + '</td>' +
                    '</tr>' +
                    '<tr>' +
                        // '<td>Address:</td>' +
                        '<td class="address info">' +
                            '<span class="ma-icon ma-icon-checkin slds-icon slds-icon--x-small"></span>' +
                            htmlEncode(localeFormattedAddress || marker.location.address) + 
                        '</td>' +
                    '</tr>' +
                    '<tr>' +
                        // '<td>Description:</td>' +
                        '<td class="description info">'+ htmlEncode(marker.record.description) +'</td>' +
                    '</tr>' +
                '</table>' +
                '<div class="layout-tooltip">' +
                    '<div class="buttonset-section-columns">' +
                        '<div class="buttoncolumn">' +
                            '<div class="actionbutton" data-action="Add to Trip">'+MASystem.Labels.ActionFramework_Add_to_Trip+'</div>' +
                            '<div class="actionbutton" data-action="Set Proximity Center">'+MASystem.Labels.ActionFramework_Set_Proximity_Center+'</div>' +
                        '</div>' +
                        '<div class="buttoncolumn">' +
                            '<div class="actionbutton" data-action="Remove Marker">'+MASystem.Labels.Context_Remove_Marker+'</div>' +
                            '<div class="actionbutton" data-action="Set Verified Location">'+MASystem.Labels.ActionFramework_Set_Verified_Location+'</div>' +
                        '</div>' +
                        '<div class="buttoncolumn">' +
                            '<div class="actionbutton" data-type="Standard Action" data-action="Set Reference Point">Set Reference Point</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        $tooltipContent.find('.description').text(marker.description);

        //create popup
        MA.Map.InfoBubble.show({
            position: marker.getPosition(),
            anchor: marker,
            minWidth: 260,
            content: $tooltipContent.get(0)
        });

        //handle clicking action buttons
        $tooltipContent.find('.actionbutton').click(function (event) {
            try {
                event.stopPropagation();
            } catch (e) {}
            var data_action = $(this).attr('data-action');
            switch (data_action)
            {
                case 'Add to Trip':
                    var options = {
                        "favorites": [marker]
                    };
                    var items = MAActionFramework.getNormalizedRoutingData(options);
                    VueEventBus.$emit('add-to-route', items);
                    MA.Map.InfoBubble.hide();
                    break;
                case 'Set Proximity Center':
                    var proximityType = getProperty(userSettings || {}, 'defaultProximitySettings.DefaultProximityType', false) || 'Circle';
                    addProximityLayer({
                        shapeType: proximityType,
                        latitude: marker.getPosition().lat(),
                        longitude: marker.getPosition().lng()
                    });
                    break;
                case 'Set Verified Location':
                    var newOptions = {
                        favorites: [marker]
                    };
                    MAActionFramework.standardActions['Set Verified Location'].ActionValue(newOptions);
                    break;
                case 'Remove Marker':
                    marker.setMap(null);
                    var markerQID = marker.qid;
                    $('#PlottedQueriesTable .FavoriteRowUnit').each(function (i,row) {
                        if($(row).attr('data-qid') == markerQID) {
                            $(row).find('.btn-remove').click();
                        }
                    });
                    break;
                case 'Set Reference Point':
                    var newOptions = {
                        records: [],
                        favorites: [],
                        customMarkers: []
                    };

                    newOptions.records.push({ formattedMarkerAddress: marker.location.address, latLng: marker.position });

                    MAActionFramework.standardActions['Set Reference Point'].ActionValue(newOptions);
                    break;
            }
            MA.Map.InfoBubble.hide();
        });
    }
}