var MASearch = {
    searchSalesforceRecords: function(searchTerm) {
        var deferSearch = jQuery.Deferred();
        // function taking too long to return, moving calls to individual sosl requests
        console.warn('Function to be deprecated. Moving to vue.');
        searchTerm = searchTerm || '';

        if(searchTerm === '') {
            deferSearch.resolve({success:false,message:MASystem.Labels.MA_Enter_Search_Term});
            return deferSearch.promise();
        }

        Visualforce.remoting.Manager.invokeAction(MARemoting.searchMAObjectsForRecords,
            searchTerm,
            function(result, event){
                if(event.status) {
                    if(result && result.success) {
                        deferSearch.resolve(result);
                    }
                    else {
                        deferSearch.resolve({success:false});
                    }
                }
                else {
                    deferSearch.resolve({success:false});
                }
            },{buffer:false,escape:false,timeout:45000}
            // do not update timeout, causing long running apex calls in clients org. May need to rework apex function
        );

        return deferSearch.promise();
    },
    searchPlottedMarkers: function(searchTerm, qid) {
        var dfd = $.Deferred();
        var $layersToSearch = $('#PlottedQueriesTable .PlottedRowUnit');
        if (qid) {
            // search a single layer
            $layersToSearch = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+qid+'"]');
        }
        if($layersToSearch.length > 0)
        {
            var recordArray = [];
            var dataLayerArray = [];
            //loop over plotted queries and create array of results
            $layersToSearch.each(function () {
                var $layer = $(this);
                if($layer.is('.DataLayer[plot-type="point"]') || $layer.is('.DataLayer[plot-type="marker"]')) {
                    $.each($layer.data('records'), function (index, record)  {
                        if(recordArray.length == 6) { return false; }
        
                        //check search term then push to array
                        if((record.isVisible || record.isClustered) && record.clusterMarker.title.toLowerCase().indexOf(searchTerm.toLowerCase())!= -1) {
                            recordArray.push(record);
                        }
                    });
                }
                else if($layer.is('.DataLayer[plot-type="polygon"]')) {
                    //do nothing
                }
                else if($layer.hasClass('ArcGISLayer')) {
                    Array.prototype.push.apply(recordArray, ArcGIS.featureLayerHelpers.searchByAttribute($layer, searchTerm));
                }
                else {
                    $.each($layer.data('records'), function (index, record)  {
                        if(recordArray.length == 6) { return false; }
        
                        //check search term then push to array
                        if((record.isVisible || record.isClustered || record.isScattered) && record.marker.title.toLowerCase().indexOf(searchTerm.toLowerCase())!= -1) {
                            recordArray.push(record);
                        }
                    });
                }
            });
            
            dfd.resolve({success:true,records:recordArray,dataLayers:dataLayerArray});
        }
        else {
            dfd.resolve({success:true,records:[]});
        }
        
        return dfd.promise();
    },
    searchGooglePlaces: function(searchTerm, options) {
        // adding in additional options
        options = $.extend({
            radius : 8000
        }, options || {});

        var deferSearch = jQuery.Deferred();
        searchTerm = searchTerm || '';

        var center = MA.map.getBounds().getCenter();
        var lat = center.lat();
        var lng = center.lng();
        var radius = options.radius || 8000; //default to about 5 miles

        try {
            var bounds = MA.map.getBounds();
            radius = google.maps.geometry.spherical.computeDistanceBetween(center, bounds.getNorthEast());

            // max allowed radius for this call by google maps API is 50000
            radius = radius > 50000 ? 50000 : radius; 
        }
        catch(e) {}

        if(searchTerm === '') {
            deferSearch.resolve({success:false,message:MASystem.Labels.MA_Enter_Search_Term});
            return deferSearch.promise();
        }

        Visualforce.remoting.Manager.invokeAction(MARemoting.placeSearch,
            searchTerm,
            lat,
            lng,
            radius,
            'placeSearch',
            function(result, event) {
                if(event.status) {
                    if(result && result.success) {
                        deferSearch.resolve(result);
                    }
                    else {
                        deferSearch.resolve({success:false});
                    }
                }
                else {
                    deferSearch.resolve({success:false});
                }
            },{buffer:false,escape:false,timeout:120000}
        );

        return deferSearch.promise();
    },
    parseGoogleAdr(adrAddress) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(adrAddress, 'text/html');
        const addressFields = {};
        doc.querySelectorAll('span').forEach((e) => {
            if (e.className.toLowerCase() === 'street-address') {
                addressFields.BillingStreet = e.innerText;
            } else if (e.className.toLowerCase() === 'locality') {
                addressFields.BillingCity = e.innerText;
            } else if (e.className.toLowerCase() === 'region') {
                addressFields.BillingState = e.innerText;
            } else if (e.className.toLowerCase() === 'country-name') {
                addressFields.BillingCountry = e.innerText;
            } else if (e.className.toLowerCase() === 'postal-code') {
                if (e.textContent.charCodeAt(0) === 12306){
                    //delete the Japanese postal character as it will be added back later
                    addressFields.BillingPostalCode = e.innerText.substring(1);
                }else{
                    addressFields.BillingPostalCode = e.innerText;
                }
            }
        });
        return addressFields;
    },
    /**
     * 
     * @param {*} userLocale 2 letter locale code
     * @param {*} userCountry 2 letter country code
     * @param {*} addressFields individual address components (BillingStreet, BillingCity, BillingCountry, BillingPostalCode, BillingState)
     */
    formatGoogleLocaleAddress(userLocale, userCountry, adrAddress){
        const addressFields = MASearch.parseGoogleAdr(adrAddress);
        return window.globalAddressFormatter.formatAddress(userLocale, userCountry, {
            address: addressFields.BillingStreet,
            country: addressFields.BillingCountry,
            city: addressFields.BillingCity,
            state: addressFields.BillingState,
            zipCode: addressFields.BillingPostalCode
        }, ', ');
    },
    renderGooglePlace: function(options) {
        /**
            options = {
                place: {
                    term: STRING // required
                    type: STRING // required. 'place', 'suggestion'
                    placeId: STRING // required if type==place
                }
            }
        **/
        var $dfd = $.Deferred();

        // clear right side bar of any existing items
        window.VueEventBus.$emit('clear-side-bar');

        var placeType = MA.getProperty(options, ['place', 'type']);
        
        // show proper search results
        $.each(MA.Map.Search.markers, function (i, marker) {
            marker.setMap(null);
        });

        var done = false;
        var places = [];
        var $loadingMessage = MAToastMessages.showLoading({message:'Grabbing Places...',timeOut:0,extendedTimeOut:0});
        var placesService = new google.maps.places.PlacesService(MA.map);
        var searchText = MA.getProperty(options, ['place', 'term']) || '';
        
        if(placeType === 'place') {
            var placeId = MA.getProperty(options, ['place', 'placeId']);

            placesService.getDetails({ placeId: placeId }, function (place, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK)
                {
                    place.isUpdated = true;
                    places.push(place);
                    done = true
                }
                else {
                    MA.log(status);
                    done = true
                }
            });
            
        }
        else if(placeType === 'suggestion') {
            var searchTerm = MA.getProperty(options, ['place', 'term']);
            MASearch.searchGooglePlaces(searchTerm).then(function(res) {
                if(res.success) {
                    var data = res.data || {};
                    places = data.results;
                    done = true;
                }
                else {
                    done = true;
                }
            });
        }
        else {
            done = true;
        }

        // clear
        var poiInt = setInterval(function() {
            if(done) {
                clearInterval(poiInt);

                var sideBarItems = [];

                // process the markers
                $.each(places, function(i,place) {
                    //get more details about this place
                    var place = places[i];
                    //create a marker
                    if(place.geometry) {
                        var marker = new google.maps.Marker({
                            map: MA.map,
                            position: place.geometry.location,
                            title: place.name,
                            maData: {place:place},
                            animation: google.maps.Animation.DROP,
                            id: place.place_id,
                            icon: {
                                url: place.icon,
                                size: new google.maps.Size(25, 25),
                                origin: new google.maps.Point(0, 0),
                                anchor: new google.maps.Point(12, 25),
                                scaledSize: new google.maps.Size(25, 25)
                            },
                            zIndex: -999
                        });

                        // build side bar item to be added to the right side bar
                        // calculate rating percent
                        var showRating = true;
                        var rating = MA.getProperty(place, ['rating']);
                        var starHTML = '';
                        if (rating === undefined) {
                            showRating = false;
                        } else {
                            // build start html
                            starHTML = MASearch.buildStarRatingHTML(rating);
                        }



                        var sideBarItem = {
                            mainText: MA.getProperty(place, ['name']), 
                            subText: MA.getProperty(place, ['formatted_address']), 
                            icon: MA.getProperty(place, ['icon']),
                            rating: rating, 
                            showRating: showRating,
                            id: place.place_id || new Date().getTime(), // unique key to represent this item in the sidebar,
                        };

                        let localeFormattedAddress;
                        if (placeType === 'place'){
                            var addressFields = MASearch.parseGoogleAdr(place.adr_address);
                            var [userLocale, userCountry] = MASystem.User.UserLocale.split('_');
                            localeFormattedAddress = globalAddressFormatter.formatAddress(userLocale, userCountry, {
                                address: addressFields.BillingStreet,
                                country: addressFields.BillingCountry,
                                city: addressFields.BillingCity,
                                state: addressFields.BillingState,
                                zipCode: addressFields.BillingPostalCode
                            },', ');
                            sideBarItem.localeFormattedAddress = localeFormattedAddress;
                        }

                        // add to list of side bar items which will be rendered to side bar
                        sideBarItems.push(sideBarItem);
                        
                        //add click event   
                        google.maps.event.addListener(marker, 'click', function () {
                            var poiDetailsDone = true;
                            var clickedMarker = this;
                            
                            if(!clickedMarker.isUpdated || !place.isUpdated) {
                                poiDetailsDone = false;
                                var placesService = new google.maps.places.PlacesService(MA.map);
                                placesService.getDetails({ placeId: place.place_id }, function (place, status) {
                                    if (status == google.maps.places.PlacesServiceStatus.OK)
                                    {
                                        clickedMarker.isUpdated = true;
                                        var poiData = clickedMarker.maData || {};
                                        var placeData = poiData.place || {};
                                        placeData = $.extend(placeData, place);
                                        poiDetailsDone = true
                                    }
                                    else {
                                        MA.log(status);
                                        poiDetailsDone = true
                                    }
                                });
                            }
                            
                            var poiInt = setInterval(function() {
                                if(poiDetailsDone) {
                                    clearInterval(poiInt);
                                    //check for place hours ensure all 7 days returned and get today's hours
                                    var openHours = 'Not Available';
                                    var weekDayText = getProperty(place, 'opening_hours.weekday_text', false) || [];
                                    if(place.opening_hours && weekDayText.length >=7) {
                                        var openToday = place.opening_hours.isOpen() == true ? 'Open Today' : 'Closed';
                                        openHours = openToday +' - <span style="">'+place.opening_hours.weekday_text[new Date().getDay() - 1]+'</span>';
                                    }
                                    
                                    //create tooltip content
                                    var $tooltipContent = $(
                                        '<div class="poi-tooltip">' +
                                            '<div class="slds-p-around_small">'+
                                                '<div class="slds-p-bottom_x-small">'+
                                                    '<div class="slds-text-heading_small">'+
                                                        '<a target="_blank" href="'+ (place.website ? place.website : 'javascript:void(0);') + '">' + place.name + ' ' +
                                                            '<span style="font-size:11px;" class="slds-icon slds-icon-text-light slds-icon_small ma-icon ma-icon-new-window"></span>'+
                                                        '</a>'+
                                                    '</div>'+
                                                    '<div style="' + (showRating ? '' : 'display:none;') + '">'+
                                                        '<div style="color: #e7711b;" class="inline slds-p-right_x-small search-result-rating slds-text-body_regular">' + rating + '</div>'+
                                                        '<div class="inline slds-p-right_x-small">'+
                                                            starHTML +
                                                        '</div>'+
                                                        '<div class="inline slds-p-right_x-small"> • </div>' +
                                                        '<div class="inline">' + (place.user_ratings_total ? place.user_ratings_total + ' reviews' : 'N/A') + '</div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="slds-grid slds-p-bottom_xx-small slds-grid_vertical-align-center">'+
                                                    '<div  style="width: 20px;" class="slds-col slds-text-color_weak slds-size_1-of-8"><span class="slds-icon slds-icon-text-light slds-icon_small ma-icon ma-icon-checkin"></span></div>'+
                                                    '<div class="slds-col slds-text-body_regular slds-text-color_weak slds-size_7-of-8">' + (localeFormattedAddress || place.formatted_address ||'Not Available') + '</div>'+
                                                '</div>'+
                                                '<div class="slds-grid slds-p-bottom_xx-small slds-grid_vertical-align-center">'+
                                                    '<div style="width: 20px;" class="slds-col slds-text-color_weak slds-size_1-of-8"><span class="slds-icon slds-icon-text-light slds-icon_small ma-icon ma-icon-clock"></span></div>'+
                                                    '<div class="slds-col slds-text-body_regular slds-text-color_weak slds-size_7-of-8">' + openHours + '</div>'+
                                                '</div>'+
                                                '<div class="slds-grid slds-p-bottom_xx-small slds-grid_vertical-align-center">'+
                                                    '<div style="width: 20px;" class="slds-col slds-text-color_weak slds-size_1-of-8"><span class="slds-icon slds-icon-text-light slds-icon_small ma-icon ma-icon-call"></span></div>'+
                                                    '<div class="slds-col slds-text-body_regular slds-text-color_weak slds-size_7-of-8">' + (place.international_phone_number ? C2D.c2dHtmlNumber(place.international_phone_number, null) : 'Not Available') + '</div>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div class="layout-tooltip" style="width: 100%; border-top: 1px solid #C0C0C0; padding: 10px 5px 5px 5px;">' +
                                                MAActionFramework.buildLayoutFromContents(userSettings.ButtonSetSettings.poiLayout).html() +
                                            '</div>' +
                                        '</div>'
                                    );

                                    MA.Map.InfoBubble.show({
                                        position: place.geometry.location,
                                        anchor: marker,
                                        minWidth: 420,
                                        content: $tooltipContent.get(0)
                                    });

                                    // set close click handler if any was passed
                                    if (typeof MA.Map.InfoBubble.setCloseButtonHandler === 'function') {
                                        MA.Map.InfoBubble.setCloseButtonHandler(function() {
                                            if(window.VueEventBus) {
                                                VueEventBus.$emit('infobubble-closed');
                                            }
                                        });
                                    }

                                    // emit event for infobubble opened with id of item the marker matches on the right side bar
                                    if(window.VueEventBus) {
                                        VueEventBus.$emit('infobubble-opened', sideBarItem.id);
                                    }
                                    
                                    //handle clicking an action button
                                    $tooltipContent.find('.actionbutton').click(function (e) {
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
                                                        + '&type=POI'
                                                        + '&latitude=' + place.geometry.location.lat()
                                                        + '&longitude=' + place.geometry.location.lng()
                                                        + '&address=' + place.formatted_address;

                                                        newURL = newURL.replace('{records}','NotSupported');
                                                        
                                                    window.open(newURL);
                                                break;
                                                case 'Javascript':
                                                    frameworkAction.ActionValue.call(this, {
                                                        button: $button,
                                                        customMarkers: [{ type: 'POI', place: place, title: place.name || 'My POI', phone: place.international_phone_number || '', website: place.website || '', latlng: place.geometry.location, address: place.formatted_address }]
                                                    });
                                                    
                                                break;
                                        
                                                default:
                                                break;
                                            }
                                        }

                                        //stop the click from getting to the map
                                        e.stopPropagation();
                                    });
                            
                                }
                            }, 100);
                        });
                    }
                    MA.Map.Search.markers.push(marker);
                                        
                });
                
                // add google places to side bar and show sidebar
                try {
                    window.VueEventBus.$emit('set-side-bar-items', sideBarItems);
                    window.VueEventBus.$emit('show-side-bar');
                } catch(e) { console.warn('Error encountered while populating side bar with points of interest:', e.message); }
                
                
                if(places.length) {
                    window.VueEventBus.$emit('set-side-bar-title', window.formatLabel(window.MASystem.Labels.POI_Selection, [searchText || '']));

                    if (places.length == 1) {
                        MA.map.panTo(places[0].geometry.location);
                        MA.map.setZoom(Math.max(MA.map.getZoom(), 12));
                    }
                }

                MAToastMessages.hideMessage($loadingMessage);
            }
            $dfd.resolve({success:true});
        }, 100);

        return $dfd.promise();
    },
    unrenderPointsOfInterest: function()
    {
        try
        {
            if(Array.isArray(MA.Map.Search.markers)) 
            {
                MA.Map.Search.markers.forEach(function(marker) {
                    marker.setMap(null);
                });

                MA.Map.Search.markers = [];
            }
        }
        catch (e) {}
        finally {
            MA.Map.InfoBubble.hide()
        }
    },
    buildStarRatingHTML: function (rating) {
        // duplicating the vue function, cannot render vue component in google popup
        var localRating = rating;
        // quick range check
        if (localRating >= 5) {
            localRating = 5;
        } else if (localRating <= 0) {
            localRating = 0;
        }
        // let round the number properly
        localRating = Math.round(localRating * 10) / 10;
        // process how many stars and assign classes
        var starHTML = '<ol class="cards-rating-stars">';
        var localStarCount = 1;
        for (localStarCount; localStarCount <= localRating; localStarCount++) {
            // cards-rating-star-half
            starHTML += '<li class="cards-rating-star"></li>';
        }
        if (localStarCount < 6) {
            var remainder = (localRating % 1).toFixed(1) * 10;
            var remainderClass = MASearch.processRemainderClass(remainder);
            // set the next start appropriately
            starHTML += '<li class="'+remainderClass+'"></li>';
            localStarCount++;
            for (localStarCount; localStarCount <= 5; localStarCount++) {
                // cards-rating-star-half
                starHTML += '<li class="cards-rating-star cards-rating-star-empty"></li>';
            }
        }
        starHTML += '</ol>';
        return starHTML;
    },
    processRemainderClass: function(remainder) {
        var remainderClass = '';
        if (remainder <= 2) {
            // round down
            remainderClass = 'cards-rating-star cards-rating-star-empty';
        } else if (remainder > 2 && remainder <= 7) {
            // round to half star
            remainderClass = 'cards-rating-star cards-rating-star-half';
        } else {
            // route up
            remainderClass = 'cards-rating-star';
        }
        return remainderClass;
    }
};