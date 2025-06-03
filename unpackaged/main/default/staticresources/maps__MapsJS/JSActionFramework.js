var MAActionFramework = {
	buildRecordIdMap: function(records) {
		var recordIdMap = {};

		records.forEach(function(record) {
			var supportsActivities;
			var baseObjectName;
			var baseObjectLabel;
			var recordId = getProperty(record,'record.Id',false) || '';

			if (!recordId) return;

			try {
				// keeping existing logic just in case
				var queryData = record.plottedQuery.data();
				supportsActivities = queryData.options.supportsActivities;
				baseObjectName = queryData.options.baseObjectName;
				baseObjectLabel = queryData.options.baseObjectLabel;
			} catch (ex) {
				// if plottedQuery is undefined we can grab what we need from the record itself
				supportsActivities = record.supportsActivities;
				baseObjectName = record.baseObjectName;
				baseObjectLabel = record.baseObjectLabel;
			}
	
			if (supportsActivities) {
				recordIdMap[baseObjectName] = recordIdMap[baseObjectName] || { baseObjectLabel: baseObjectLabel, recordIds: [] };
				recordIdMap[baseObjectName].recordIds.push(recordId);
			}
		});

		return recordIdMap;
	},
	getNormalizedRoutingData: function(options) {
		var items = [];
		if (options.hasOwnProperty('customMarkers') && options.customMarkers.length) {
        	// POI and Take-Me-There
            for (var i = 0; i < options.customMarkers.length; i++) {
                var marker = options.customMarkers[i];
                // get lat lng
				var latlng = marker.latlng;
				if (!latlng) {
					try {
						latlng = marker.getPosition();
					} catch(e) {}
				}
                if (latlng === undefined) {
                    continue;
                }
				var placeId = getProperty(marker, 'place.place_id', false);
                items.push({
                    title: marker.title || 'POI Marker',
                    marker: marker,
                    lat: latlng.lat(),
					lng: latlng.lng(),
					// TODO
					// Dynamically set the baseObjectLabel because right now every MALocation is labeled as a POI
                    baseObjectLabel: 'POI',
                    placeId: placeId,
                    isMALocation: true
                });
            }
        }

        if (options.hasOwnProperty('records') && options.records.length) {
        	// Record Markers
            var qidToOptionsMap = {};

            $('.savedQuery').each(function() {
                var savedQueryData = $(this).data();
                var options = savedQueryData.options || {};
                qidToOptionsMap[savedQueryData.qid] = {
                    supportsActivities: options.supportsActivities,
                    baseObjectLabel: options.baseObjectLabel,
					baseObjectId: options.baseObjectId
                };
            });

        	for (var i = 0; i < options.records.length; i++) {
                var marker = options.records[i], lat, lng;
                var queryData = marker.plottedQuery ? marker.plottedQuery.data() || {} : {};

        		if (marker.location && marker.location.coordinates) {
        			lat = marker.location.coordinates.lat;
        			lng = marker.location.coordinates.lng;
        		}

        		// Skip if we do not have location data
                if (!lat || !lng) continue;

                var qidOptions = qidToOptionsMap[marker.qid];

                // If the marker layer is no longer available then qidOptions is null. We can safely assume we are attempting
                // to add a waypoint to the schedule. In this case, we can grab the data we need from the record/marker.
                if (!qidOptions) {
					if (marker.type != 'feature') {
						qidOptions = {
							baseObjectId: marker.baseObjectId,
							baseObjectLabel: marker.baseObjectLabel,
							supportsActivities: marker.supportsActivities
						};
					}
                }

				var markerTitle = getProperty(marker,'marker.title',false) || getProperty(marker,'Name',false) || '';
        		items.push(
                    $.extend({
            			title: markerTitle,
    					lat: lat,
            			lng: lng,
            			LinkId__c: marker.Id,
						MarkerLayer__c: queryData.savedQueryId,
                        marker: marker
            		},
                    qidOptions)
                );
        	}
        }
        if (options.hasOwnProperty('favorites') && options.favorites.length) {
        	for (var i = 0; i < options.favorites.length; i++) {
				var fav = options.favorites[i];
				var favoritePosition = fav.getPosition();
                items.push({
                    title: fav.title,
                    lat: fav.location.lat,
                    lng: fav.location.lng,
                    marker: fav,
                    address: fav.location.address
                });
			}
        }

        if (options.hasOwnProperty('dataLayers') && options.dataLayers) {
            var keys = Object.keys(options.dataLayers);

            for (var j = 0; j < keys.length; j++) {
                var layer = options.dataLayers[keys[j]];
                for (var i = 0; i < layer.length; i++) {
                    var marker = layer[i];
                    marker.address = 'Lat: '+ marker.position.lat() +', Lng: ' + marker.position.lng();

                    items.push({
                        title: marker.title,
                        lat: marker.position.lat(),
                        lng: marker.position.lng(),
                        marker: marker,
                        supportsActivities: false
                    });
                }
            }
        }

        return items;
   	},
			//definitions for buttons that exist in the framework
			standardActions: {
				'Section': {
					Label: MASystem.Labels.ActionFramework_Section, defaultIcon: '', Type: 'Section', Modes: ['Desktop', 'Mobile']
				},
				'View Record': {
				    Label: MASystem.Labels.MA_VIEW_RECORD, defaultIcon: 'ma-icon-document', Type: 'Standard Action', Modes: [], Layouts: [], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
				       setMobileState().always(function() {
							if (options.records) {
								var records = options.records || []
								var record = records[0] || {};
								// find record id (record.record.id === legacy code)
								var recordId = getProperty(record,'Id',false) || getProperty(record, 'record.Id', false);
								//check if this is salesforce1
								ma_navigateToSObject(recordId);
							} else if (options.favorites) {
								var records = options.favorites || []
								var record = records[0] || {};
								// find record id (record.record.id === legacy code)
								var recordId = getProperty(record, 'record.Id', false);
								//check if this is salesforce1
								ma_navigateToSObject(recordId);
							} else {
								console.warn('record type not supported.');
							}
				       });
				    }
				},
				'Set Reference Point': {
					Label: MASystem.Labels.ActionFramework_Set_Reference_Point, defaultIcon: 'ma-icon-priority', Type: 'Standard Action', Modes: ['Desktop'], Layouts: ['Tooltip', 'MyPosition', 'POI'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	       				//If this is a marker
	       				jQuery.each(options.records || [], function (index, record) {
	       				    var recordCoord;
	       				    var reocrdAddress;
	       				    //var record = options.records[0];
							if( record.hasOwnProperty('formattedMarkerAddress') && record.hasOwnProperty('latLng') ) {
								//WE GOT A FAVORITE LOCATION HERE!
								reocrdAddress = record.formattedMarkerAddress;
								recordCoord = record.latLng;
							}
							else {
								var markerLat = record.location.coordinates.lat || marker.getPosition().lat();
								var markerLng = record.location.coordinates.lng || marker.getPosition().lng();
								var queryData = record.plottedQuery.data() || {};
								var formattedAddress = Plotting.getFormattedAddress(record, queryData);
								reocrdAddress = formattedAddress;
								recordCoord = record.marker.position;
							}

							if(typeof VueEventBus != 'undefined') {
								VueEventBus.$emit('set-reference-point', {
									address: reocrdAddress,
									coordinates: recordCoord
								});
							}
	       				});

	       				// If this is POI or My Position
	       				jQuery.each(options.customMarkers || [], function (index, customMarker) {
	       				    if (customMarker.type === 'POI' || customMarker.type === 'MyPosition')
	       				    {
								if(typeof VueEventBus != 'undefined') {
									VueEventBus.$emit('set-reference-point', {
										address: customMarker.address,
										coordinates: customMarker.latlng
									});
								}
	       				    }
	       				});
	           		}
	           	},
				'Add to Trip': {
					//Legacy
					Label: MASystem.Labels.ActionFramework_Add_to_Trip,
					defaultIcon: 'ma-icon-route',
					Type: 'Standard Action',
					Modes: ['Desktop', 'Mobile'],
					Layouts: ['Tooltip', 'Mass', 'MyPosition', 'POI'],
					Requirements: [],
					Action: 'Javascript',
	           		ActionValue: function(options) {
						var items = MAActionFramework.getNormalizedRoutingData(options);
						VueEventBus.$emit('add-to-route', items);

						if (!options.isMassAction) {
							MA.Map.InfoBubble.hide();
						}
                    }
				},
                'Add to Schedule': {
                    Label: MASystem.Labels.MA_ADD_TO_SCHEDULE,
                    defaultIcon: 'ma-icon-route',
                    Type: 'Standard Action',
                    Modes: [ 'Desktop', 'Mobile'],
                    Layouts: [ 'Tooltip', 'Mass', 'POI' ],
                    Requirements: [],
                    Action: 'Javascript',
                    ActionValue: function(options) {
                        if(MA.isMobile) {
							// move to schedule tab, then do the processing, better user experience
							VueEventBus.$emit('activate-scheduling', function() {
								var items = MAActionFramework.getNormalizedRoutingData(options);
								VueEventBus.$emit('add-to-schedule', items);
							});
                        } else {
                            var items = MAActionFramework.getNormalizedRoutingData(options);

                            if (!items || !items.length) return;

                            VueEventBus.$emit('activate-scheduling', function() {
                                VueEventBus.$emit('add-to-schedule', items);
                            });

                            if (!options.isMassAction) {
                                MA.Map.InfoBubble.hide();
                            }
                        }
                    }
                },

                /////////////////////////////////////////////////////////// new functions 4/7/2017
				'Add to New Route': {
					Label: MASystem.Labels.MA_Add_To_New_Route,
					defaultIcon: 'ma-icon-route',
					Type: 'Standard Action',
					Modes: ['Desktop', 'Mobile'],
					Layouts: ['Tooltip', 'Mass', 'MyPosition', 'POI'],
					Requirements: [],
					Action: 'Javascript',
                    ActionValue: function (options) {
						var items = MAActionFramework.getNormalizedRoutingData(options);
						VueEventBus.$emit('add-to-new-route', items);

						if (!options.isMassAction) {
							MA.Map.InfoBubble.hide();
						}
	           		}
	           	},

	           	///////////////////////////////////////////////////////////
	           	'Set Proximity Center': {
	           		Label: MASystem.Labels.ActionFramework_Set_Proximity_Center, defaultIcon: 'ma-icon-proximity', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Tooltip', 'Mass', 'MyPosition', 'POI'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
						var proximityType = getProperty(userSettings, 'defaultProximitySettings.DefaultProximityType') || 'Circle';
						jQuery.each(options.records || [], function (index, record) {
							addProximityLayer({
								shapeType: proximityType,
								latitude: record.location.coordinates.lat,
								longitude: record.location.coordinates.lng
							});
						});
						jQuery.each(options.customMarkers || [], function (index, customMarker) {
							addProximityLayer({
								shapeType: proximityType,
								latitude: customMarker.latlng.lat(),
								longitude: customMarker.latlng.lng()
							});
						});
						jQuery.each(options.favorites || [], function (index, favorite) {
							addProximityLayer({
								shapeType: proximityType,
								latitude: favorite.location.lat,
								longitude: favorite.location.lng
							});
						});

						//loop over object of dlayers
						var dlayers = options.dataLayers || {};
						for(var dlid in dlayers) {
							var dl = dlayers[dlid] || [];
							for(var i = 0; i < dl.length; i++) {
								var dataLayer = dl[i];
								addProximityLayer({
									shapeType: proximityType,
									latitude: dataLayer.position.lat(),
									longitude: dataLayer.position.lng()
								});
							}
						}

	           			//hide the tooltip if this is not a mass action
	           			if (!options.isMassAction) {
	           				try{
	           					MA.Map.InfoBubble.hide();
	           				}
	           				catch (e){
	           					//do nothing
	           				}
	           			}
	           		}
				},
				'Remove C2C Marker': {
					Label: MASystem.Labels.Context_Remove_Marker,
					defaultIcon: 'ma-icon-close',
					Type: 'Standard Action',
					Modes: ['Desktop', 'Mobile', 'NearBy'],
					Layouts: ['Tooltip', 'Mass'],
					Requirements: [],
					Action: 'Javascript',
					ActionValue: function (options) {
						// putting this in for quick fix, mobile is expecting records for other actions but this is expecting customMarkers (desktop?)
						try {
							var c2c_marker;
							if (options.customMarkers) {
								c2c_marker = options.customMarkers[0].marker;
							} else if (options.records) {
								c2c_marker = options.records[0];
							}
							c2c_marker.setMap(null);
							VueEventBus.$bus.$emit('hide-tooltip');
						} catch (e) {
							console.warn('Unable to remove c2c marker', e);
						}
					}
				},
	           	'Remove Marker': {
	           		Label: MASystem.Labels.Context_Remove_Marker,
	           		defaultIcon: 'ma-icon-close',
	           		Type: 'Standard Action',
	           		Modes: ['Desktop', 'Mobile', 'NearBy'],
	           		Layouts: ['Tooltip', 'Mass'],
	           		Requirements: [],
	           		Action: 'Javascript',
	           		ActionValue: function (options) {
	           			var $dfd = $.Deferred();

	           			var $loadingToastUI = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,subMessage:MASystem.Labels.Removing_Markers, timeOut:0, extendedTimeOut:0});

	           		    var plottedQueries = {}; // store a record of plotted queries for redrawing listviews
	           			if (options.mode == 'Mobile') {
	           				jQuery.each(options.records || [], function (index, record) {
	           					RemoveMarker(record.marker);

	           					plottedQueries[ $(record['plottedQuery']).data('qid') ] = null; // add unique plottedQuery qid to list
	           				});
	           			}
	           			else if (options.mode == 'NearBy') {
	           				jQuery.each(options.records || [], function (index, record) {
	           					NearByRemoveMarker(record.marker);

	           					plottedQueries[ $(record['plottedQuery']).data('qid') ] = null; // add unique plottedQuery qid to list
	           				});
	           			}
	           			else {
							var sfRecords = options.records || [];
							const currentSelectedMarkers = sfRecords.filter((record) => record.selected);
							var waypointMarkers = {};
							try {
								VueEventBus.$bus.$emit('hide-tooltip');
							}
							catch(e){}
							//batch add to route
							var markerProcessingBatchSize = 100;
							var markerProcessingTimeout = 1;
							var recordsRemaining = sfRecords.length;
							var updateQueryMap = {};
							setTimeout(function doBatch() {
								if(sfRecords.length > 0) {
									var recordsProcessed = 0;
									while (recordsProcessed < markerProcessingBatchSize && sfRecords.length > 0)
									{
										recordsProcessed++;
										var record = sfRecords.shift();

										//if route marker, do not add to map (nothing to update)
										if(record.isRouteMarker) {
											//remove the waypoint from the waypoint list
											MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.Remove_Markers_Remove_Route_Hide_Waypoints,timeOut:7000,closeButton:true})

											continue;

											/*****************************************************************************************
											 *
											 * try simple notification to start, uncomment below code to actually remove the marker
											 * will need to update the mass action (right click on circles) as well
											 *
											 *****************************************************************************************/
											//waypointMarkers[record.Id] = record;
										}
										else if(record.type == 'feature'){
											record.sublayer.remove(record.feature);
										}
										else{
											if(sfRecords.length == 0) {
												RemoveMarkerDesktop(record, {updateQueryInfo:false}, true);
											} else {
												RemoveMarkerDesktop(record, {updateQueryInfo:false}, false);
											}
											

											var qid = record.marker.qid;
											updateQueryMap[qid] = 'process';
											plottedQueries[ $(record['plottedQuery']).data('qid') ] = null; // add unique plottedQuery qid to list
										}
									}

									//do next record
									setTimeout(doBatch, markerProcessingTimeout);
								}
								else {
									for(var queryid in updateQueryMap) {
										var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+queryid+'"]')
										if ($plottedQuery.data('type') == 'datalayer') {
											var renderModes = MADemographicLayer.getRenderModes($plottedQuery);
											// TODO: Currently, rerender "all" markers again. How to just count remaining markers and refresh legend?
											MADemographicLayer.rerenderDataLayer($plottedQuery,{renderModes: renderModes},function() {
											});
										}
										else {
											Plotting.updateQueryInfo($plottedQuery);
										}
									}
									// we are getting into this for all marker types
									var keys = Object.keys(updateQueryMap);
									if(keys.length > 0) {
										NotifySuccess(MASystem.Labels.MA_Success, MASystem.Labels.Remove_Markers);
									}
									MAToastMessages.hideMessage($loadingToastUI);
								}

								// redraw necessary list views
								Object.keys(plottedQueries).forEach(function(qid) {
									if(!plottedQueries[qid])
									{
										if(!MA.isMobile) {
											MAListView.ConstructTab(qid);
										}
										plottedQueries[qid] = true;
									}
								});

							}, markerProcessingTimeout);
							MA.markerSelection.updateUnselected({ markers: currentSelectedMarkers });
	           			}

	           			// remove data layer markers
	           			var removeDataLayerMarkerPromises = [];
	           			var dlayers = options.dataLayers || {};
	       				for(var dlid in dlayers) {
	       					var $plottedLayer = $('.DataLayer[uid="'+dlid+'"]');
	       					var dlMarkers = [];
	       					var dlMarkers2 = [];
	       				    var dl = dlayers[dlid] || [];
	       				    for(var i = 0; i < dl.length; i++) {
	       				        var dataLayer = dl[i];
	       				        dlMarkers2.push(dataLayer.markerId);
	       				        //dlMarkers.push(dataLayer.data.marker.uid);

	       				        dlMarkers.push(dataLayer.data.uid);
	       				        //MADemographicLayer.removeDataLayerMarker(dataLayer);
	       				    }

	       				   var removeDataLayerMarkerPromise = MADemographicLayer.removeDataLayerMarker({markers:dlMarkers, markers2 : dlMarkers2, layer: $plottedLayer});

	       				   if(removeDataLayerMarkerPromise) {
	       				       removeDataLayerMarkerPromises.push(removeDataLayerMarkerPromise);
	       				   }
						}
						   
						var favorites = options.favorites || [];
						for (var i = 0; i < favorites.length; i++) {
							var fav = favorites[i];
							var qid = fav.qid;
							VueEventBus.$emit('remove-favorite', qid);
						}

	       				$.when.apply($, removeDataLayerMarkerPromises).then(function() {
	       					if(arguments.length > 0) { // if any data layer markers were actually present and got removed
	       						NotifySuccess(MASystem.Labels.MA_Success, MASystem.Labels.Remove_Markers_Data_Layer);
	       					}
	       				});

						// hide the tooltip if this is not a mass action
	           			if (!options.isMassAction) {
	           				try{
	           					MA.Map.InfoBubble.hide();
	           				}
	           				catch (e){
	           					//do nothing
	           				}
	           			}


                        // redraw necessary list views
                    	Object.keys(plottedQueries).forEach(function(qid) {
                    	    if(!plottedQueries[qid])
                    	    {
    	           			    MAListView.ConstructTab(qid);
    	           			    plottedQueries[qid] = true;
                    	    }
	           			});
	           		}
	           	},
	           	'Take Me There': {
	           		Label: MASystem.Labels.ActionFramework_Take_Me_There, defaultIcon: 'ma-icon-navigate-arrow', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Tooltip', 'POI'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
						//get coordinates
	           			var lat, lng;
                        var dlMarkerPositions = [];

	           			if (options.records && options.records.length > 0) {
							if(options.records[0].location && options.records[0].location.coordinates) {
								lat = options.records[0].location.coordinates.lat;
								lng = options.records[0].location.coordinates.lng;
							}
	       				}
	       				else if (options.customMarkers && options.customMarkers.length > 0) {
							//case 00023859
							//spiderfy can alter the position if in spiderfy mode, changing to lat lng stored on actual marker
							try {
								lat = options.customMarkers[0].markerLocation.lat;
								lng = options.customMarkers[0].markerLocation.lng;
							}
							catch(e) {
								//fall back to getting the location off marker if hardcoded values are missing
								lat = options.customMarkers[0].latlng.lat();
								lng = options.customMarkers[0].latlng.lng();
							}
				        }
				        else if (options.customWPMarkers && options.customWPMarkers.length > 0) {
							//case 00023859
							//spiderfy can alter the position if in spiderfy mode, changing to lat lng stored on actual marker
							try {
								lat = options.customWPMarkers[0].markerLocation.lat;
								lng = options.customWPMarkers[0].markerLocation.lng;
							}
							catch(e) {
								//fall back to getting the location off marker if hardcoded values are missing
								lat = options.customWPMarkers[0].position.lat();
								lng = options.customWPMarkers[0].position.lng();
							}
				        } else if (options.dataLayers) {
                            // Sales commit SFCF-855
                            var dlayers = options.dataLayers || {};

                            for (var dlid in dlayers) {
                                var dl = dlayers[dlid] || [];

                                for (var i = 0; i < dl.length; i++) {
                                    var dataLayerMarker = dl[i];

                                    lat = dataLayerMarker.getPosition().lat();
                                    lng = dataLayerMarker.getPosition().lng();

                                    dlMarkerPositions.push({lat: lat, lng: lng});
                                }
                            }
                        }



				        //Let's get the start position... is this used? why not just use current location
				        var startPos = {
				        	lat: '',
				        	lng: ''
				        }

				        if( options.startPosition !== undefined ) {
				        	if( options.startPosition.coords !== undefined ) {
				        		startPos.lat = options.startPosition.coords.latitude;
				        		startPos.lng = options.startPosition.coords.longitude;
				        	}
				        }

				        //////////////////////////////////////////////////////
				        // DETERMINE USER DEVICE
				        //////////////////////////////////////////////////////
						// SFMF-668, if ios mobile device, ask what map to use if setting is missing
						var showMapSelectionPrompt = false;

						// if apple device, check setting
						var device = 'desktop';
						if (MA.isMobile) {
							// we are on the mobile page (may update at some point to actually detect mobile device here but this will do for now)
							var userAgent = navigator.userAgent;
							// we are using a mobile device... android or ios?
							var isAppleDevice = userAgent.match(/iPhone|iPad|iPod/i) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
							var isAndroidDevice = userAgent.match(/Android/i);

							if (isAppleDevice) {
								device = 'ios';
								var savedSetting = userSettings.handleMobileMaps;
								// if no setting, we need to show a prompt to ask and save setting
								if (!savedSetting) {
									showMapSelectionPrompt = true;
								}
							} else if (isAndroidDevice) {
								// device is android
								device = 'android';
							} else {
								// this is an unknown mobile device, just use desktop urls and have device figure it out
								device = 'desktop';
							}
						}

						// if this is a mobile ios device, do we have a saved map setting, waze, apple, google?
						if (showMapSelectionPrompt) {
							// currently only showing modal on mobile devices
							// hand off to vue modal, value will be saved and 'take me there' action will re-fire with saved value
							VueEventBus.$bus.$emit('open-modal', { modal: 'handle-maps', options: options});
						} else {
							// everything checks out so build take me there url
							var urlOptions = {
								startPos: startPos,
								lat: lat,
								lng: lng,
								dlMarkerPositions: dlMarkerPositions
							}
							var takeMeThereURLArray = MAActionFramework.buildTakeMeThereUrlArray(device, urlOptions);

							//////////////////////////////////////////////////////
							// DETERMINE WHETHER APP IS ACCESSED FROM SALESFORCE1 OR BROWSER
							//////////////////////////////////////////////////////

							var usingSalesforce1 = typeof sforce != 'undefined'
								&& sforce.one
								&& window.navigator.userAgent.toLowerCase().indexOf('salesforce1') != -1;

							setMobileState().always(function() {
								//////////////////////////////////////////////////////
								// OPEN "TAKE ME THERE" DIRECTIONS
								//////////////////////////////////////////////////////
								for (var j = 0; j < takeMeThereURLArray.length; j++) {
									var url = takeMeThereURLArray[j];
									setTimeout(function(){
										// open the link in sf1 or a new window
										if (usingSalesforce1) {
											sforce.one.navigateToURL(url);
										}
										else {
											// try new window
											if(!window.open(url, '_blank')) {
												window.open(url, '_parent');
											}
										}
									}, i * 1000);
								}
							});
						}
	           		}
	           	},
	           	'Set Verified Location': {
	           		Label: MASystem.Labels.ActionFramework_Set_Verified_Location, defaultIcon: 'ma-icon-my-location', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], RenderModes: ['Marker'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Verified Location Support'], Action: 'Javascript', ActionValue: function (options) {
						if (options.mode == 'Mobile')
				        {
				        	jQuery.each(options.records || [], function (index, record) {
	           					SetVerifiedLocation(record.marker);
	           				});
	                        MA.Map.InfoBubble.hide();
				        }
				        else
				        {
							var queryOptions = {};
							var currentLayers = document.querySelectorAll('#PlottedQueriesTable .savedQuery')
							for(var i = 0; i< currentLayers.length; i++) {
								var layer = currentLayers[i];
								var qid = layer.getAttribute('qid');
								if (qid) {
									var jQueryLayer = $(layer);
									var layerData = jQueryLayer.data();
									queryOptions[qid] = layerData.options;
								}
							}
					        MA.Map.InfoBubble.hide();
					        jQuery.each(options.records || [], function (index, record) {

					        	//find out what marker is visible
					        	var marker;
					        	var isRendered = [];
					        	//needs to be reworked,timeline
					        	if (record.isScattered) {
					        		//start wit scatter
					        		marker = record.scatterMarker;
					        		record.scatterMarker.setMap(null);
					        		isRendered.push(record.scatterMarker);
					        	}
					        	if (record.isClustered) {
					        		//no scatter, use cluster
					        		marker = record.clusterMarker;
					        		record.clusterMarker.setMap(null);
					        		isRendered.push(record.clusterMarker);
					        	}
					        	if(record.isVisible) {
					        		//we want the marker so end here
					        		marker = record.marker;
					        		record.marker.setMap(null);
					        		isRendered.push(record.marker);
					        	}

					        	//var marker = record.marker;
					        	if(marker === undefined) {
					        		MAToastMessages.showWarning({message:MASystem.Labels.Set_Verified_Location_Cannot_Get_Marker_Info,subMessage:MASystem.Labels.Set_Verified_Location_Try_Different_Render_Mode,timeOut:5000});
					        		return;
					        	}
								marker.setMap(MA.map);


					        	var currentLatLng = marker.getPosition();

								//hide all other render modes until done moving

								//marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
						        //make the marker draggable and listen for drag events
						        marker.setDraggable(true);
						        marker.setOpacity(0.4);
								google.maps.event.addListenerOnce(marker, 'dragend', function (e) {

									//reset the marker to non-draggable
									marker.setDraggable(false);
									marker.setOpacity(1);

									//send request to update the verified lat/long for this record
									var newLatLngPostion = marker.getPosition();
									var newLatLng = jQuery.extend({}, newLatLngPostion);
									var queryData = record.plottedQuery.data();
									var qid = queryData.qid;
									var isPolymorphic = queryOptions[qid].polymorphicAddressObject ? true : false;
									var processData = {
						            	ajaxResource : 'TooltipAJAXResources',
						            	action			: 'set_verified_location',
										baseObjectId	: queryData.options.baseObjectId,
										recordId		: isPolymorphic ? record[queryOptions[qid].addressObject] : record.Id,
										latitude		: newLatLng.lat(),
										longitude		: newLatLng.lng()
									};
									
									// SFMAP-676 Update record so that marker remaings on map when coordinates are cleared if a layer refresh hasn't taken place.
									record.Verified_Latitude__c = newLatLng.lat();
									record.Verified_Longitude__c = newLatLng.lng();

									update_marker_on_drag_end(processData).then(function(res) {
										//show success or error mes
										if(res && res.success) {
											//grab the lat lng fields
											if (record.location && record.location.fields) {
												var latField = record.location.fields.lat.replace('maps__','');
												var lngField = record.location.fields.lng.replace('maps__','');
												record.location.coordinates.lat = record[latField] = newLatLng.lat();
												record.location.coordinates.lng = record[lngField] = newLatLng.lng();
											}

											//update all marker types
											for(var m = 0; m < isRendered.length; m++) {
												var newMarker = isRendered[m];
												newMarker.setPosition(newLatLngPostion);
												newMarker.setMap(MA.map);
											}
											MAToastMessages.showSuccess({message:MASystem.Labels.Set_Verified_Location_Was_Updated,timeOut:3000});
										}
										else {
											marker.setPosition(currentLatLng);
											MAToastMessages.showError({message:res.message,timeOut:6000,closeButton:true});
										}
									});
								});
							});

							//fav location
							jQuery.each(options.favorites || [], function (index, favMarker) {
								var currentLatLng = favMarker.getPosition();
								//make the marker draggable and listen for drag events
								favMarker.setDraggable(true);
								favMarker.setOpacity(0.4);
								google.maps.event.addListenerOnce(favMarker, 'dragend', function (e) {

									//reset the marker to non-draggable
									favMarker.setDraggable(false);
									favMarker.setOpacity(1);

									//send request to update the verified lat/long for this record
									var newLatLngPostion = favMarker.getPosition();
									var newLatLng = jQuery.extend({}, newLatLngPostion);
									var recordId = getProperty(favMarker,'record.Id',false);

									if(recordId == undefined){
										MAToastMessages.showError({message:MASystem.Labels.Set_Verified_Location_Cannot_Set_Location,subMessage:MASystem.Labels.Set_Verified_Location_Missing_Record_ID,timeOut:6000,closeButton:true});
										return;
									}

									var processData = {
										ajaxResource: 'TooltipAJAXResources',
										action: 'set_verified_location',
										update_favorite_location : 'true',
										recordId: recordId,
										latitude: newLatLng.lat(),
										longitude: newLatLng.lng()
									};

									update_marker_on_drag_end(processData).then(function(res) {
										//show success or error mes
										if(res && res.success) {
											//update lat lng fields on marker in case they are reference elsewhere
											favMarker.location.lat = newLatLng.lat();
											favMarker.location.lng = newLatLng.lng();
											try {
												favMarker.record.record.Latitude__c = newLatLng.lat();
												favMarker.record.record.Longitude__c = newLatLng.lng();
											}
											catch(e){}

											//update all marker types
											favMarker.setPosition(newLatLngPostion);
											MAToastMessages.showSuccess({message:MASystem.Labels.Set_Verified_Location_Was_Updated,timeOut:3000});
										}
										else {
											marker.setPosition(currentLatLng);
											MAToastMessages.showError({message:res.message,timeOut:6000,closeButton:true});
										}
									});
								});
							});
						}
	           		}
	           	},
	           	'Add to Campaign': {
	           		Label: MASystem.Labels.ActionFramework_Add_to_Campaign, defaultIcon: 'ma-icon-campaign', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Contact Or Lead'], Action: 'Javascript', ActionValue: function (options) {
						if (MA.isMobile) {
							VueEventBus.$bus.$emit('open-modal', { modal: 'add-to-campaign', options: options});
						} else {
							if (options.isMassAction) {
								AddVisibleToCampaign(options.records);
							}
							else {
								var recordId = options.records[0].Id
								AddVisibleToCampaign(recordId);
							}
							MA.Map.InfoBubble.hide();
						}
	           		}
	           	},
	           	'Change Owner': {
	           		Label: MASystem.Labels.ActionFramework_Change_Owner, defaultIcon: 'ma-icon-change-owner', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Tooltip', 'Mass'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	           			var recordIds = [];
	           			jQuery.each(options.records || [], function (index, record) {
							
							var recordLite = {
								Id: record.Id,
								Name: record.Name,
								qid: record.qid
							};
							   
							recordIds.push(recordLite);

	           			});
	           			var defaultSubordinates = getProperty(MASystem,'Organization.ShowOnlySubordinates',false) || false;

    					$('#ChangeOwnerPopup .show-only-subordinate').prop('checked', defaultSubordinates);
	           			if (MA.isMobile) {
							VueEventBus.$bus.$emit('open-modal', { modal: 'ChangeOwnerPopup', options: options }, function() {
								mobileChangeOwner(recordIds);
							});
	           			} else {
							VueEventBus.$bus.$emit('open-modal', { modal: 'ChangeOwnerPopup', options: { records: recordIds }});
						}

				        MA.Map.InfoBubble.hide();
	           		}
	           	},
	           	'Send Email': {
	           		Label: MASystem.Labels.ActionFramework_Send_Email, Type: 'Standard Action', defaultIcon: 'ma-icon-email', Modes: ['Desktop'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Activity Support'], Action: 'Javascript', ActionValue: function (options) {
				    	jQuery.each(options.records || [], function (index, record) {
				    	    var recordId;
				    	    var recordType;
							recordId = record.Id;
							recordType = '';

		           			var EmailURL = "/_ui/core/email/author/EmailAuthor?p2_lkid=" + recordId + "&rtype=" + recordId.substring(0,3) + "&retURL=%2F" + recordId;
				            if(jQuery.inArray(recordId.substring(0,3), ['003', '00Q']) == -1)
				            {
				            	//check if account, record type and person account match record
				            	if(MA.personAccounts.enabled && recordId.substring(0,3) == '001' && recordType == MA.personAccounts.recordType) {
				            		//treat this as a contact with to and related to accounts
					    			EmailURL = "/_ui/core/email/author/EmailAuthor?p2_lkid="+ recordId +"&p3_lkid=" + recordId + "&retURL=%2F" + recordId;
					    		}
					    		else {
					    			EmailURL = "/_ui/core/email/author/EmailAuthor?p3_lkid=" + recordId + "&retURL=%2F" + recordId;
					    		}
				            }

				            window.open(EmailURL);
			            });
	           		}
	           	},
	           	'Log a Call': {
	           		Label: MASystem.Labels.ActionFramework_Log_a_Call, defaultIcon: 'ma-icon-call', Type: 'Standard Action', Modes: ['Desktop', 'Mobile', 'NearBy'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Activity Support'], Action: 'Javascript', ActionValue: function (options) {

	           			var actionHandler = getProperty(MASystem,'Organization.HandleAction') || 'showPopup'; // showPopup || showSalesforce || showOptions
						var logACallFieldSet = getProperty(MASystem || {}, 'MergeFields.LogACallTemplate', false);
						VueEventBus.$bus.$emit('open-modal',  { modal: 'log-a-call', options: {
							records: options.records || [],
							actionHandler: actionHandler || 'showPopup',
							fieldSet: logACallFieldSet
						}});
	           		}
				},
	           	'New Task': {
	           		Label: MASystem.Labels.ActionFramework_New_Task, defaultIcon: 'ma-icon-new-task', Type: 'Standard Action', Modes: ['Desktop', 'Mobile', 'NearBy'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Activity Support'], Action: 'Javascript', ActionValue: function (options) {
						var modalMounted = true;
						if (MA.isMobile) {
							modalMounted = false;
							VueEventBus.$bus.$emit('open-modal', { modal: 'NewTaskPopup', options: options }, function() {
								modalMounted = true;
							});
	           			}

						var taskInt = setInterval(function() {
							if (modalMounted) {
								clearInterval(taskInt);
								$('#NewTaskPopup').data('records',options.records);

								if (!options.records.length) {
									MAToastMessages.showWarning({ message: MASystem.Labels.Select_Markers, timeOut:6000 });
									return;
								}

								if (options.isMassAction && options.records.length) {
									$('#newTaskClassic').hide();
									NewTask(MAActionFramework.buildRecordIdMap(options.records || []));
								} else {
									$('#newTaskClassic').show();
									var actionHandler = getProperty(MASystem,'Organization.HandleAction') || 'showPopup'; // showPopup || showSalesforce || showOptions

									function showSF() {
										var recordId = options.records[0].Id;
										var redirectURL = MA.resources.MapActions + '?action=new_task&id=' + recordId;
										window.open(redirectURL);
									}

									if (actionHandler == 'showPopup') {
										NewTask(MAActionFramework.buildRecordIdMap(options.records || []));
									} else {
										showSF();
									}
								}
							}
						}, 100);
	           		}
	           	},
	           	'New Event': {
	           		Label: MASystem.Labels.ActionFramework_New_Event, defaultIcon: 'ma-icon-event', Type: 'Standard Action', Modes: ['Desktop', 'Mobile', 'NearBy'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Activity Support'], Action: 'Javascript', ActionValue: function (options) {
						var modalMounted = true;

						if (MA.isMobile) {
							modalMounted = false;
							VueEventBus.$bus.$emit('open-modal', { modal: 'NewEventPopup', options: options }, function() {
								modalMounted = true;
							});
						}

						var eventInt = setInterval(function() {
							if (modalMounted) {
								clearInterval(eventInt);
								$('#NewEventPopup').data('records',options.records);

								if (!options.records.length) {
									MAToastMessages.showWarning({ message: MASystem.Labels.Select_Markers, timeOut:6000 });
									return;
								}

								if (options.isMassAction) {
									$('#newEventClassic').hide();
									NewEvent(MAActionFramework.buildRecordIdMap(options.records || []));
								} else {
									$('#newEventClassic').show();
									var actionHandler = getProperty(MASystem,'Organization.HandleAction') || 'showPopup';

									function showSF() {
										var recordId = options.records[0].Id;

										var redirectURL = MA.resources.MapActions + '?action=new_event&id=' + recordId;
										window.open(redirectURL);
									}

									if (actionHandler == 'showPopup') {
										NewEvent(MAActionFramework.buildRecordIdMap(options.records || []));
									} else {
										showSF();
									}
								}
							}
						}, 100);
	           		}
	           	},
	           	'Check In': {
	           		Label: MASystem.Labels.ActionFramework_Check_In, defaultIcon: 'ma-icon-check', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Tooltip'], Requirements: [], Action: 'Javascript',
	           		ActionValue: function (options) {
						if (MASystem.Organization.EncryptedFields['Activity'].indexOf('Subject') > -1
								&& MASystem.Organization.EncryptedFields['autoCheckinEnabled'].indexOf('true') === -1) {
							
							VueEventBus.$bus.$emit('open-modal',  { modal: 'encrypted-fields' });
							return;
						}
						var $dfd = $.Deferred();
						var $button;
						var checkInId = '';
						if (options.buttonInfo) {
							// deprecating dom object
							$button = $('<button>temp</button>');
						} else {
							$button = options.button;
						}
						var thisRecord = options.records[0];
	           			var record = thisRecord.marker != null || thisRecord.polyline != null ? thisRecord : getProperty(thisRecord,'record',false) || {};                                
                        var marker = thisRecord.polyline != null ? record : record.marker || {};
                        var showPopup = options.showPopup || false;
                        var postTo = '';
                        // if this is an event, we need to validate if checking into self or creating new
                        // if self show popup and validate check in or out?
                        var qid = marker.qid || '';
                        var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+qid+'"]');
                        var queryData = $plottedQuery.data() || {};
                        var checkInSettings = getProperty(queryData, 'queryRecord.BaseObject__r.Settings__c') || '{}';
                        try {
                            checkInSettings = JSON.parse(checkInSettings);
                            postTo = getProperty(checkInSettings, 'CheckInPostTo', false) || '';
                            if (postTo === 'Same' && options.showPopup !== false) {
                                showPopup = true;
                            }
                        } catch (e) {
                            checkInSettings = {};
                        }
                        if (showPopup) {
                            var buttonHTML = '<div style="text-align: center;"><button class="slds-button slds-button_brand js-checkIn" onclick="">Check In</button><button class="slds-button slds-button_brand js-checkOut">Check Out</button></div>';
                            var popup = MA.Popup.showMAPopup({
                                template: buttonHTML,
                                popupId: 'checkinPopup',
                                width: '200px',
                                buttons: [
                                    {
                                        text: 'Cancel',
                                        type: 'slds-button_neutral'
                                        //no onTap or onclick just closes the popup
                                    }
                                ]
                            });
                            // attch listener to continue process
                            $('#checkinPopup').off('click', '.js-checkOut');
                            $('#checkinPopup').on('click', '.js-checkOut', function() {
                                var checkOutAction = MAActionFramework.standardActions['Check Out'];
                                options.showPopup = false;
                                options.postTo = 'Same';
                                MA.Popup.closeMAPopup();
                                checkOutAction.ActionValue(options);
                            });
                            $('#checkinPopup').off('click', '.js-checkIn');
                            $('#checkinPopup').on('click', '.js-checkIn', function() {
                                var checkInAction = MAActionFramework.standardActions['Check In'];
                                options.showPopup = false;
                                MA.Popup.closeMAPopup();
                                checkInAction.ActionValue(options);
							});
							$dfd.resolve('');
                        }
                        else {
                            if(MA.CheckIn && MA.CheckIn.general && MA.CheckIn.general['Activity-FieldSet'] && MA.CheckIn.general['Activity-FieldSet'] != 'Select' && MA.CheckIn.general['AutoCheckOutEnabled'] == 'true') {
								
								var thisRecord = options.records[0];
								var recordData = thisRecord.marker != null || thisRecord.polyline != null ? thisRecord : getProperty(thisRecord,'record',false) || {};                                
                        		var recordDataMarker = recordData.polyline != null ? recordData.polylineMarkers[0] : recordData.marker;
								var opt = {
                                    button : options.button,
                                    record : recordData,
                                    marker : recordDataMarker
                                }
                                ShowCheckInDisposition(opt).then(function(checkInId) {

									$dfd.resolve(checkInId);
								});
                            }
                            else {
								//continue as normal
                                CheckIn(marker).then(function(response) {
                                    var CheckInId = response.taskId || response.eventId;
                                    if (CheckInId) {
										$button.text('Check Out');
                                        if (!MA.enabledFeatures.autoCheckOut && postTo !== 'Same') {
                                            $button.data('CheckInId', CheckInId).attr('data-action', 'Check Out').find('.action-bar-button-text').text(MASystem.Labels.ActionFramework_Check_Out);
                                        }

                                        //add this check in record to the raw plot data
                                        if (CheckInId.substring(0,3) == '00T') {
                                            if(legacyMobile) {
                                                if (!record.record.Tasks) { record.record.Tasks = {}; }
                                                if (!record.record.Tasks.records) { record.record.Tasks.records = []; }
                                                record.record.Tasks.records.push({
                                                    Id: CheckInId,
                                                    IsClosed: MA.enabledFeatures.autoCheckOut
                                                });
                                            }
                                            else {
                                                if (!record.Tasks) { record.Tasks = []; }
                                                record.Tasks.push({
                                                    Id: CheckInId,
                                                    IsClosed: MA.enabledFeatures.autoCheckOut
                                                });
                                            }
                                        }
                                        else {
                                            if (postTo !== 'Same') {
                                                if (!record.Events) { record.Events = []; }
                                                record.Events.push({
                                                    Id: CheckInId,
                                                    Subject: MA.enabledFeatures.autoCheckOut ? 'Check Out @' : 'Check In @'
                                                });
                                            }
										}
										// SFCF-357, rerender marker info
										// google.maps.event.trigger(marker,'click');
										$dfd.resolve(CheckInId);
                                    } else {
										$dfd.reject();
									}
                                });
                            }
						}
						MA.Map.InfoBubble.hide();
						return $dfd.promise();
	           		},
	           		events: {
	           			'ready': [
	           				function (options)
	           				{
	           					//try to pull activity type from this record
	           					var postTo = '';
	           					try { postTo = JSON.parse(options.record.plottedQuery.data('baseObjectSettings')).CheckInPostTo; }
	           					catch (err) { postTo = 'Task'; }

	           					//update check in button to check out if already checked in
	           					if (postTo.indexOf('Task') != -1) {
		                            if (options.record.record.Tasks)
		                            {
										jQuery.each(options.record.record.Tasks, function (index, task) {
											if (!task.IsClosed) {
												try {
													options.button.data('CheckInId', task.Id).text(MASystem.Labels.ActionFramework_Check_Out).attr('data-action', 'Check Out');
												}
												catch(e) {}
												return false;
											}
										});
		                            }
		                        } else if (postTo.indexOf('Event') != -1) {
		                        	if (options.record.record.Events)
		                            {
										jQuery.each(options.record.record.Events, function (index, event) {
											if (event.Subject && event.Subject.indexOf('Check In @') == 0)
											{
												options.button.data('CheckInId', event.Id).text(MASystem.Labels.ActionFramework_Check_Out).attr('data-action', 'Check Out');
												return false;
											}
										});
		                            }
		                        }
	           				}
	           			]
	           		}
	           	},
	           	'Check Out': {
	           		Label: MASystem.Labels.ActionFramework_Check_Out, defaultIcon: 'ma-icon-check', Type: 'Standard Action', Modes: [], Layouts: [], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
						var $dfd = $.Deferred();   
						var $button;
						var checkinId = '';
						if (options.buttonInfo) {
							// deprecating dom object
							$button = $('<button>temp</button>');
							checkinId = getProperty(options || {}, 'buttonInfo.checkInId', false) || '';
						} else {
							$button = options.button;
							checkinId = $button.data('CheckInId') || '';
						}
						var thisRecord = options.records[0];
						var record = thisRecord.marker != null || thisRecord.polyline != null ? thisRecord : getProperty(thisRecord,'record',false) || {};                                
                        var marker = thisRecord.polyline != null ? record : record.marker || {};
                        if (options.postTo === 'Same') {
                            checkinId = getProperty(record, 'record.Id', false) || '';
                        }
				    	if(MA.CheckIn && MA.CheckIn.general && MA.CheckIn.general['Activity-FieldSet'] && MA.CheckIn.general['Activity-FieldSet'] != 'Select' && checkinId.indexOf('00U') != 0)
				    	{
				    		var options = {
				    			button : $button,
				    			record : record,
								marker : marker,
								checkinId: checkinId
				    		}
				    		ShowCheckOutDisposition(options);
				    	} else {
				    		CheckOut(marker, checkinId, function (CheckInId) {
								$button.find('.action-bar-button-text').text('Check In');
								$button.data('CheckInId', null);
		                        //update this check in record in the raw plot data
		                        if (CheckInId.indexOf('00T') == 0)
		                        {
									jQuery.each(record.Tasks, function (index, task) {
										if (task.Id == CheckInId) {
											task.IsClosed = true;
											return false;
										}
									});
		                        } else {
									jQuery.each(record.Events, function (index, event) {
										if (event.Id == CheckInId) {
											event.Subject = event.Subject.replace('Check In @', 'Check Out @');
											return false;
										}
									});
								}
								// SFCF-357, rerender marker info
								// google.maps.event.trigger(marker,'click');
								$dfd.resolve(CheckInId);
		                    });
				    	}
						MA.Map.InfoBubble.hide();
						return $dfd.promise();
	           		}
	           	},
	           	'Clear Coordinates': {
	           		Label: MASystem.Labels.ActionFramework_Clear_Coordinates,
	           		defaultIcon: 'ma-icon-clear',
	           		Type: 'Standard Action',
	           		Modes: ['Desktop'],
	           		Layouts: ['Tooltip', 'Mass'],
	           		Requirements: [],
	           		Action: 'Javascript',
					ActionValue: function (options) {
						MA.Map.InfoBubble.hide();
						VueEventBus.$bus.$emit('open-modal', { modal: 'clear-coordinates', options: options});
					}
	           	},
	           	'Chatter Post': {
	           		Label: MASystem.Labels.MA_Chatter_Post, Type: 'Standard Action', defaultIcon: 'ma-icon-email-chatter', Modes: ['Desktop'], Layouts: ['Tooltip', 'Mass'], Requirements: ['Chatter Support'], Action: 'Javascript', ActionValue: function (options) {
						var recordIds = [];
			        	jQuery.each(options.records || [], function (index, record) {
			        	    var supportsChatter = false;
							var recordId = record.Id;
							if(record?.marker?.layerType === 'waypoint-marker') {
								supportsChatter = record.marker.supportsChatter;
							} else {
							var queryData = record.plottedQuery.data();
							supportsChatter = queryData.options.supportsChatter;
							}
			        		if (supportsChatter) {
				            	recordIds.push(recordId);
				            }
			        	});
			            ChatterPost(recordIds);
	           		}
	           	},
	           	'Follow': {
	           		Label: MASystem.Labels.ActionFramework_Follow, defaultIcon: 'ma-icon-follow', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Mass'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	           			updateChatterSubscriptions(true, options.records);
	           		}
	           	},
	           	'Unfollow': {
	           		Label: MASystem.Labels.ActionFramework_Unfollow, defaultIcon: 'ma-icon-following', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Mass'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	           			updateChatterSubscriptions(false, options.records);
	           		}
	           	},
	           	'Update Field': {
	           		Label: MASystem.Labels.ActionFramework_Update_Field, defaultIcon: 'ma-icon-edit', Type: 'Standard Action', Modes: ['Desktop', 'Mobile'], Layouts: ['Mass'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	           			UpdateFieldOfVisible(options.records);
	           		}
	           	},
	           	'Create Favorite': {
	           		Label: MASystem.Labels.ActionFramework_Set_Favorite, defaultIcon: 'ma-icon-favorite', Type: 'Standard Action', Modes: ['Mobile'], Layouts: ['Tooltip', 'MyPosition', 'POI'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {

						if (options.records && options.records.length > 0) {
							var record = options.records[0];
							var latLng = getProperty(record,'location.coordinates');
							var queryData = $('#PlottedQueriesTable .savedQuery[data-id="'+record.savedQueryId+'"]').data() || {};
							var address = Plotting.getFormattedAddress(record,queryData);
							CreateFavorite({ latlng: latLng, address: address, name: record.marker.title,
								addressFields: {
									BillingCity: record?.BillingCity,
									BillingPostalCode: record?.BillingPostalCode,
									BillingState: record?.BillingState,
									BillingCountry: record?.BillingCountry,
									BillingStreet: record?.BillingStreet
								} });
						}
						else if (options.customMarkers && options.customMarkers.length > 0) {
							var marker = options.customMarkers[0];
							var markerPostion = marker.latlng;

							let favoriteOptions = {
								latlng: {
									lat: markerPostion.lat(),
									lng: markerPostion.lng()
								},
								address: marker.address || '',
								name: marker.title,
							}
	
							if (marker?.place?.adr_address){
								favoriteOptions.addressFields = window.parseGoogleAdr(marker.place.adr_address);
							}
							CreateFavorite(favoriteOptions);
						}
	           		}
	           	},
	           	'Create Record': {
                    Label: window.htmlDecode(MASystem.Labels.MA_Click2Create_With_Trademark),
                    defaultIcon: 'ma-icon-world',
                    Type: 'Standard Action',
                    Modes: ['Desktop', 'Mobile'],
                    Layouts: ['MyPosition', 'POI', 'Mass'],
                    Requirements: [],
                    Action: 'Javascript',
                    ActionValue: function (options) {
                        if (options.isMassAction) {
                            //do we have any data layers plotted?
                            if($('.DataLayer').length === 0) {
                                MAToastMessages.showWarning({message: window.formatLabel(window.MASystem.Labels.Click2Create_Warning_Header, ['Click2Create\u2122']),subMessage: window.MASystem.Labels.Click2Create_Warning_Body,timeOut:6000});
                            }
                            else {
                                //show data layer selection menu
                                var dataLayerSelectHTML = '<div class="overflow" style="max-height:400px; overflow: auto;">'+
                                                            '<div class="createrecord-formitem slds-form-element">'+
                                                                '<label class="slds-form-element__label">' + window.MASystem.Labels.Click2Create_DataLayer_DataToUse + '</label>'+
                                                                '<div class="slds-form-element__control">'+
                                                                    '<div class="slds-select_container">'+
                                                                        '<select class="slds-select createrecordDataLayer2-dataType"></select>'+
                                                                    '</div>'+
                                                                '</div>'+
                                                            '</div>'+
                                                        '</div>';

                                var dlSelectPopup = MA.Popup.showMAPopup({
                                    title: window.MASystem.Labels.Click2Create_CreateARecord,
                                    template: dataLayerSelectHTML,
                                    popupId : 'dataLayerSelction',
                                    width: 400,
                                    buttons: [
                                        {
                                        text: window.MASystem.Labels.MA_Cancel,
                                        type: 'slds-button_neutral'
                                        //no onTap or onclick just closes the popup
                                        },
                                        {
                                            text: window.MASystem.Labels.MA_Next,
                                            type: 'slds-button_brand',
                                            onTap: function(e) {
                                                //get the password and name
                                                var returnOpt = {
                                                    dlid : $('#dataLayerSelction .createrecordDataLayer2-dataType').val(),
                                                    lid : $('#dataLayerSelction .createrecordDataLayer2-dataType option:selected').attr('data-uid')
                                                }

                                                return returnOpt;
                                            }
                                        }
                                    ]
                                });

                                //fill out selectbox
                                MAData.createRecordFromDataLayer.getDataLayerc2cOptions();

                                dlSelectPopup.then(function(dlSelectPopupRes) {
                                    if(dlSelectPopupRes) {
                                        //update the options with the selected data layers markers
                                        var layerData = $('.DataLayer[qid="'+dlSelectPopupRes.lid+'"]').data();
                                        //grab the makrers from the selected layer
										// var markerArr = options.dataLayers[dlSelectPopupRes.lid];
										var markerArr = options.dataLayers[dlSelectPopupRes.lid] || options.dataLayers[layerData.key];
                                        options.dataLayers = markerArr || [];
                                        //check the number of records
                                        if(options.dataLayers.length > 5000) {
                                            MA.Popup.showMAAlert({
                                                title: 'Click2Create\u2122',
                                                template: '<div style="font-weight: bold;font-size: 13px;text-align: center;color: #d4504c;padding-bottom: 10px;">Please limit your selection and try again.</div><div style="text-align: center;">Currently a max of 5000 markers are permitted.</div>',
                                                width: 400
                                            });
                                            return;
                                        }

                                        var confirmPopup = MA.Popup.showMAConfirm({
                                            title: window.MASystem.Labels.Click2Create_CreateARecord,
                                            template: '<div style="font-weight: bold;font-size: 13px;text-align: center;color: #d4504c;padding-bottom: 10px;">' + window.MASystem.Labels.Click2Create_DataLayer_ReadCarefully + '</div>' +
											'<div style="text-align: center;">' + window.formatLabel(window.MASystem.Labels.Click2Create_DataLayer_CreateConfirmMessage, [options.dataLayers.length]) + '</div>' +
											'<div style="text-align: center;padding-top: 10px;">' + window.MASystem.Labels.Click2Create_DataLayer_AreYouSure + '</div>',
                                            cancelText : window.MASystem.Labels.MA_Cancel,
                                            width: 400
                                        });

                                        confirmPopup.then(function(res) {
                                            if(res) {
                                                //you clicked the ok button
                                                MAData.createRecordFromDataLayer.launch_popupV2({isMassAction : options.isMassAction || false, dataLayers : options.dataLayers, layerType : dlSelectPopupRes.dlid});
                                            }
                                            else {
                                                //you clicked cancel button
                                            }
                                        });
                                    }
                                    else {
                                        //you clicked cancel button
                                    }
                                });
                            }
                            return;
                        }
						// end mass action
						// start data layers
                        var dlayers = options.dataLayers || {};
                        for(var dlid in dlayers) {
                            var dl = dlayers[dlid] || [];
							var marker = dl[0];
                            //MAData.createRecordFromDataLayer.launch_popupV2({isMassAction : false, dataLayers : dl, layerType : marker.data.marker.dataType});
                            MAData.createRecordFromDataLayer.launch_popupV2({isMassAction : false, dataLayers : dl, layerType : marker.data.datatype});
						}
						// end data layers
						// start custom markers
                        if (options.customMarkers && options.customMarkers.length > 0) {
							var customMarker = options.customMarkers[0] || {};
							c2c.launch_popupV2({
								type: customMarker.type,
								position: customMarker.latlng,
								address: customMarker.address,
								name: customMarker.title,
								phone: getProperty(customMarker, 'place.formatted_phone_number', false) || '',
								website: getProperty(customMarker, 'place.website', false) || '',
								place: customMarker.place || null
							});
						}
						// end custom markers
                        try {
                            MA.Map.InfoBubble.hide();
                        } catch (e) {
                            //do nothing
                        }
                    }
	           	},
	           	'Street View': {
	           		Label: MASystem.Labels.MA_STREET_VIEW, defaultIcon: 'ma-icon-new-account', Type: 'Standard Action', Modes: ['Desktop'], Layouts: ['Tooltip', 'MyPosition', 'POI', 'DataLayer'], Requirements: [], Action: 'Javascript', ActionValue: function (options) {
	           			options.button.text('Searching...');

	           			var pos;
	           			if (options.records && options.records.length > 0) {
							var lat = options.records[0].location.coordinates.lat;
							var lng = options.records[0].location.coordinates.lng;
							pos = new google.maps.LatLng(lat, lng);
	           			}
	           			else if (options.customMarkers && options.customMarkers.length > 0) {
	           				pos = options.customMarkers[0].latlng;
	           			}
	           			else if (options.dataLayers) {
	           			    var dlayers = options.dataLayers || {};
		       				for(var dlid in dlayers) {
		       				    var dl = dlayers[dlid] || [];
		       				    for(var i = 0; i < dl.length; i++) {
		       				        var dataLayer = dl[i];
		       				        pos = dataLayer.getPosition();
								}
							}
	           			}

	           			 //If the radius is 50 meters or less, the panorama returned will be the nearest panorama to the given location.
	           			var radius = 50; //meters


	           			//Find closed point that has street view

                        new google.maps.StreetViewService().getPanoramaByLocation(pos, radius, function (data1, status1) {

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

                                new google.maps.StreetViewService().getPanoramaByLocation(pos, radius, function (data2, status2) {

                                    if (status2 == google.maps.StreetViewStatus.OK)
                                    {
                                        MA.Map.InfoBubble.hide();
	           					        MA.map.getStreetView().setOptions({ position: data2.location.latLng, visible: true });
                                    }
                                    else
                                    {
                                        //Try again with a larger radius
                                        radius = radius * 2;

                                        new google.maps.StreetViewService().getPanoramaByLocation(pos, radius, function (data3, status3) {

                                            if (status3 == google.maps.StreetViewStatus.OK)
                                            {
                                                MA.Map.InfoBubble.hide();
        	           					        MA.map.getStreetView().setOptions({ position: data3.location.latLng, visible: true });
                                            }
                                            else
                                            {
                                                options.button.text('Not Available');
                                            }


                                        });
                                    }


                                });

                            }

                        });
	           		}
	           	}
	        },

	        //placeholder for custom actions that will be injected into the framework
	        customActions: {},

	        //settings for marker layouts
	        markerLayouts: {
				tooltip         : { fieldName: 'TooltipLayout__c', selector: '.layout-tooltip', defaultHTML: '<div class="section-dropzone ui-droppable"></div>\
																												<div class="buttonset-section">\
																														<div class="buttonset-section-header ui-draggable">\
																															<div class="buttonset-section-name editable">Actions</div>\
																														</div>\
																														<div class="buttonset-section-columns">\
																														<div class="buttoncolumn">\
																															<div class="button-dropzone">\
																																<div class="button-dropzone-handle ui-droppable"></div>\
																															</div>\
																															<div class="buttonset-button ui-draggable">\
																																<div class="actionbutton Tooltip Mass MyPosition POI ui-draggable" data-type="Standard Action" data-action="Add to Trip">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip POI ui-draggable" data-type="Standard Action" data-action="Take Me There">' + MASystem.Labels.ActionFramework_Take_Me_There + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="buttoncolumn">\
																															<div class="button-dropzone">\
																																<div class="button-dropzone-handle ui-droppable"></div>\
																															</div>\
																															<div class="buttonset-button ui-draggable">\
																																<div class="actionbutton Tooltip Mass MyPosition POI ui-draggable" data-type="Standard Action" data-action="Set Proximity Center">Set Proximity Center</div>\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="buttoncolumn">\
																															<div class="button-dropzone">\
																																<div class="button-dropzone-handle ui-droppable"></div>\
																															</div>\
																															<div class="buttonset-button ui-draggable">\
																																<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Remove Marker">' + MASystem.Labels.Context_Remove_Marker + '</div>\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																															</div>\
																															<div class="buttonset-button ui-draggable">\
																																<div class="actionbutton Tooltip ui-draggable" data-type="Standard Action" data-action="Check In">Check In</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="section-dropzone ui-droppable"></div>\
																													</div>\
																													<div class="buttonset-section">\
																														<div class="buttonset-section-header ui-draggable">\
																															<div class="buttonset-section-name editable">Admin</div>\
																														</div>\
																														<div class="buttonset-section-columns">\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Set Verified Location">Set Verified Location</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Clear Coordinates">'+ MASystem.Labels.ActionFramework_Clear_Coordinates + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Change Owner">' + MASystem.Labels.ActionFramework_Change_Owner + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="section-dropzone ui-droppable"></div>\
																													</div>\
																													<div class="buttonset-section">\
																														<div class="buttonset-section-header ui-draggable">\
																															<div class="buttonset-section-name editable">Activities</div>\
																														</div>\
																														<div class="buttonset-section-columns">\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Log a Call">' + MASystem.Labels.ActionFramework_Log_a_Call + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Send Email">' + MASystem.Labels.ActionFramework_Send_Email + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="New Event">' + MASystem.Labels.ActionFramework_New_Event + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass ui-draggable" data-type="Standard Action" data-action="Add to Campaign">'+ MASystem.Labels.ActionFramework_Add_to_Campaign + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="section-dropzone ui-droppable"></div>\
																													</div>' },
				myPosition      : { fieldName: 'MyPositionLayout__c', selector: '.layout-myposition', defaultHTML: '<div class="section-dropzone ui-droppable"></div>\
																													<div class="buttonset-section">\
																														<div class="buttonset-section-header ui-draggable">\
																															<div class="buttonset-section-name editable">Actions</div>\
																														</div>\
																														<div class="buttonset-section-columns">\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass MyPosition POI ui-draggable" data-type="Standard Action" data-action="Add to Trip">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																																<div class="buttonset-button ui-draggable">\
																																	<div class="actionbutton Tooltip Mass MyPosition POI ui-draggable" data-type="Standard Action" data-action="Set Proximity Center">Set Proximity Center</div>\
																																	<div class="button-dropzone">\
																																		<div class="button-dropzone-handle ui-droppable"></div>\
																																	</div>\
																																</div>\
																															</div>\
																															<div class="buttoncolumn">\
																																<div class="button-dropzone">\
																																	<div class="button-dropzone-handle ui-droppable"></div>\
																																</div>\
																															</div>\
																														</div>\
																														<div class="section-dropzone ui-droppable"></div>\
																													</div>' },
				poi             : { fieldName: 'POILayout__c', selector: '.layout-poi', defaultHTML: '<div class="section-dropzone ui-droppable"></div>\
																									<div class="buttonset-section">\
																										<div class="buttonset-section-header ui-draggable">\
																											<div class="buttonset-section-name editable">Actions</div>\
																												</div>\
																											<div class="buttonset-section-columns">\
																												<div class="buttoncolumn">\
																													<div class="button-dropzone">\
																														<div class="button-dropzone-handle ui-droppable"></div>\
																													</div>\
																													<div class="buttonset-button ui-draggable">\
																														<div class="actionbutton Tooltip Mass MyPosition POI ui-draggable" data-type="Standard Action" data-action="Add to Trip">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div>\
																														<div class="button-dropzone">\
																															<div class="button-dropzone-handle ui-droppable"></div>\
																														</div>\
																													</div>\
																												</div>\
																												<div class="buttoncolumn">\
																													<div class="button-dropzone">\
																														<div class="button-dropzone-handle ui-droppable"></div>\
																													</div>\
																													<div class="buttonset-button ui-draggable">\
																														<div class="actionbutton Tooltip POI ui-draggable" data-type="Standard Action" data-action="Take Me There" style="background: rgb(250, 250, 250);">' + MASystem.Labels.ActionFramework_Take_Me_There + '</div>\
																														<div class="button-dropzone">\
																															<div class="button-dropzone-handle ui-droppable"></div>\
																														</div>\
																													</div>\
																												</div>\
																												<div class="buttoncolumn">\
																													<div class="button-dropzone">\
																														<div class="button-dropzone-handle ui-droppable"></div>\
																													</div>\
																												</div>\
																											</div>\
																											<div class="section-dropzone ui-droppable"></div>\
																										</div>' }
	        },

			getAction: function (type, action) {
				return type == 'Custom Action'
					? MAActionFramework.customActions[action] || null
					: MAActionFramework.standardActions[action] || null;
			},

			buildMobileLayoutFromContentsListView: function (layoutContents, options) {

	        	options = jQuery.extend({
	        		queryMetadata: { options: {supportsActivities: false, supportsChatter: false }},
	        		record: { record: { Id: '' } },
	        		renderType: '',
	        	}, options || {});

				var ActionsArr = [];
				jQuery.each(layoutContents, function (sectionIndex, section) {

					//add this section
					var obj = {
						label : section.Label,
						type : null,
						action : null,
						header : true
					};
					ActionsArr.push(obj);

					//loop over each column in this section
					jQuery.each(section.Columns, function (columnIndex, column) {

						//loop over each button in this column
						jQuery.each(column, function (buttonIndex, button) {

							//find the definition of this button in the action framework
							var buttonDefinition = {};
							if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
								var customActionButton = MAActionFramework.customActions[button.Label];
								var layerBaseObjectId = getProperty(options, 'queryMetadata.baseObjectId');
								var modesArray = getProperty(customActionButton, 'Modes', false);
								var baseObjectIdArray = getProperty(customActionButton, 'BaseObjects').split(';');
								if ((modesArray.indexOf('BaseObject') !== -1) && baseObjectIdArray.indexOf(layerBaseObjectId) === -1) {
									return;
								} else {
									jQuery.extend(buttonDefinition, customActionButton);
								}

								//disable Iframe on nearby for now
								var ActionType = customActionButton.Action;
								if(MA.isMobile && ActionType == 'Iframe') {
									return;
								}
							}
							else if (MAActionFramework.standardActions[button.Action || button.Label]) {
								if(options && options.mode == 'NearBy') {
									var modes = MAActionFramework.standardActions[button.Action || button.Label].Modes;
									if($.inArray('NearBy',modes) >= 0) {
										jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
									}
								}
								else {
									jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
								}
							}
							else {
								return;
							}
							var actButton = {
								label : buttonDefinition.Label, // this is the translated button text
								type : buttonDefinition.Type,
								action : button.Label, // this is the actual button action property in action framework => ex 'Add to Trip' is the action, 'Add to Route' is the label
								header : false,
								icon : button.icon || buttonDefinition.defaultIcon
							}

							//validate that this button meets mode requirements.  if it doesn't then disable it
							if ((MA.isMobile && jQuery.inArray('Mobile', buttonDefinition.Modes) == -1) || (!MA.isMobile && jQuery.inArray('Desktop', buttonDefinition.Modes) == -1)) {
								actButton['disabled'] = true;
								//ActionsArr.push(actButton);
								return;
							}

							//validate that this button meets visibility requirements.  if it doesn't then disable it
							jQuery.each(buttonDefinition.Requirements, function (index, requirement) {
								var supportsActivities = false;
								if (options.queryMetadata.options.supportsActivities !== undefined) {
									supportsActivities = options.queryMetadata.options.supportsActivities;
								} else if (options.record.supportsActivities !== undefined) {
									supportsActivities = options.record.supportsActivities;
								}

								if (requirement == 'Activity Support' && !supportsActivities) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Verified Location Support' && options.queryMetadata.addressFields && !(options.queryMetadata.addressFields.verifiedLatitude && options.queryMetadata.addressFields.verifiedLongitude)) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Contact Or Lead' && jQuery.inArray(options.record.record.Id.substring(0, 3), ['003', '00Q']) == -1) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Chatter Support' && !options.queryMetadata.options.supportsChatter) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
							});
							//validate that this button meets render type requirements
		                    if (buttonDefinition.RenderModes && jQuery.inArray(options.markerType, buttonDefinition.RenderModes) == -1 && buttonDefinition.Label != MASystem.Labels.ActionFramework_Set_Verified_Location) {
		                    	actButton['disabled'] = true;
		                    	//return false;
			                }

			                if(!actButton.disabled) {
			                	ActionsArr.push(actButton);
			                }
						});

					});
				});
				return ActionsArr;
	        },


			buildLayoutFromContentsListView: function (layoutContents, options) {

	        	jQuery.extend({
	        		queryMetadata: { supportsActivities: false, supportsChatter: false },
	        		record: { record: { Id: '' } },
	        		renderType: '',
	        	}, options || {});

	        	var ActionsArr = [];
				jQuery.each(layoutContents, function (sectionIndex, section) {

					//add this section
					var obj = {
						label : section.Label,
						type : null,
						action : null,
						header : true
					};
					ActionsArr.push(obj);

					//loop over each column in this section
					jQuery.each(section.Columns, function (columnIndex, column) {

						//loop over each button in this column
						jQuery.each(column, function (buttonIndex, button) {

							//find the definition of this button in the action framework
							var buttonDefinition = {};
							if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
								jQuery.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);

								//disable Iframe on nearby for now
								var ActionType = MAActionFramework.customActions[button.Label].Action;
								if(MA.IsMobile && ActionType == 'Iframe') {
									return;
								}
							}
							else if (MAActionFramework.standardActions[button.Action || button.Label]) {
								if(options && options.mode == 'NearBy') {
									var modes = MAActionFramework.standardActions[button.Action || button.Label].Modes;
									if($.inArray('NearBy',modes) >= 0) {
										jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
									}
								}
								else {
									jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
								}
							}
							else {
								return;
							}

							var actButton = {
								label : buttonDefinition.Label,
								type : buttonDefinition.Type,
								action : button.Label,
								header : false
							}

							//validate that this button meets mode requirements.  if it doesn't then disable it
							if ((MA.IsMobile && jQuery.inArray('Mobile', buttonDefinition.Modes) == -1) || (!MA.IsMobile && jQuery.inArray('Desktop', buttonDefinition.Modes) == -1)) {
								actButton['disabled'] = true;
								//ActionsArr.push(actButton);
								return;
							}

							//validate that this button meets visibility requirements.  if it doesn't then disable it
							jQuery.each(buttonDefinition.Requirements, function (index, requirement) {
								if (requirement == 'Activity Support' && !options.queryMetadata.supportsActivities) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Verified Location Support' && options.queryMetadata.coordinateFields && !(options.queryMetadata.coordinateFields.VerifiedLatitude && options.queryMetadata.coordinateFields.VerifiedLongitude)) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Contact Or Lead' && jQuery.inArray(options.record.record.Id.substring(0, 3), ['003', '00Q']) == -1) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
								else if (requirement == 'Chatter Support' && !options.queryMetadata.supportsChatter) {
									actButton['disabled'] = true;
									//ActionsArr.push(actButton);
									return false;
								}
							});
							//validate that this button meets render type requirements
		                    if (buttonDefinition.RenderModes && jQuery.inArray(options.markerType, buttonDefinition.RenderModes) == -1) {
		                    	actButton['disabled'] = true;
		                    	//return false;
			                }

			                //check if this is a duplicate
			                if(actButton.label == "Add to Trip" || actButton.label == MASystem.Labels.ActionFramework_Add_to_Trip || actButton.label == MASystem.Labels.ActionFramework_Check_In || actButton.label == MASystem.Labels.ActionFramework_Check_Out || actButton.label == MASystem.Labels.ActionFramework_Take_Me_There) {
			                	actButton['disabled'] = true;
			                	//return false;
			                }
			                if(!actButton.disabled) {
			                	ActionsArr.push(actButton);
			                }
						});

					});
				});

				return ActionsArr;
	        },

	        buildLayoutFromContents: function (layoutContents, options) {
	        	options = jQuery.extend({
	        		queryMetadata: { supportsActivities: false, supportsChatter: false },
	        		record: { record: { Id: '' } },
	        		renderType: ''
	        	}, options);

				const invalidPolylineActions = new Set();
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Clear_Coordinates);
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Verified_Location);
				invalidPolylineActions.add(MASystem.Labels.Context_Remove_Marker);
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Reference_Point);
				invalidPolylineActions.add(MASystem.Labels.MA_STREET_VIEW);
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Favorite);

				var $layout = jQuery('<div/>');
				jQuery.each(layoutContents, function (sectionIndex, section) {

					//add this section
					var $section = jQuery('#templates .buttonset-section').clone().appendTo($layout);

					$section.find('.buttonset-section-header').text(section.Label);

					//loop over each column in this section
					jQuery.each(section.Columns, function (columnIndex, column) {

						//loop over each button in this column
						var $column = $section.find('.buttoncolumn').eq(columnIndex);
						jQuery.each(column, function (buttonIndex, button) {

							//find the definition of this button in the action framework
							var buttonDefinition = {};
							if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
								jQuery.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);
							}
							else if (MAActionFramework.standardActions[button.Action || button.Label]) {
								jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
							}
							else {
								return;
							}

							//add this button
							var $button = jQuery('<div class="actionbutton" />').attr({'data-type': buttonDefinition.Type, 'data-action': button.Action || button.Label}).html(htmlEncode(buttonDefinition.Label)).appendTo($column);

							//validate that this button meets mode requirements.  if it doesn't then disable it
							if ((MA.IsMobile && jQuery.inArray('Mobile', buttonDefinition.Modes) == -1) || (!MA.IsMobile && jQuery.inArray('Desktop', buttonDefinition.Modes) == -1)) {
								$button.hide();
								$button.addClass('disabled'); 
								return;
							}

							//validate that this button meets visibility requirements.  if it doesn't then disable it
							jQuery.each(buttonDefinition.Requirements, function (index, requirement) {
								if (requirement == 'Activity Support' && !options.queryMetadata.supportsActivities) {
									$button.hide();
									$button.addClass('disabled'); return false;
								}
								else if (requirement == 'Verified Location Support' && options.queryMetadata.coordinateFields && !(options.queryMetadata.coordinateFields.VerifiedLatitude && options.queryMetadata.coordinateFields.VerifiedLongitude)) {
									$button.hide();
									$button.addClass('disabled'); return false;
								}
								else if (requirement == 'Contact Or Lead' && jQuery.inArray(options.record.record.Id.substring(0, 3), ['003', '00Q']) == -1) {
									$button.hide();
									$button.addClass('disabled'); return false;
								}
								else if (requirement == 'Chatter Support' && !options.queryMetadata.supportsChatter) {
									$button.hide();
									$button.addClass('disabled'); return false;
								}
							});

							//validate that this button meets render type requirements
		                    if (buttonDefinition.RenderModes && jQuery.inArray(options.markerType, buttonDefinition.RenderModes) == -1) {
								$button.hide();
								$button.addClass('disabled');
			                }

							if (options.queryMetadata.layerType === 'polyline' && invalidPolylineActions.has(buttonDefinition.Label)) {
								$button.hide();
								$button.addClass('disabled');
							}

						});

					});
				});

				return $layout;
	        },

	        buildLayoutFromContentsV2: function (layoutContents, options) {

	        	options = jQuery.extend({
	        		queryMetadata: {
	        		    options : {
	        		        supportsActivities: false,
	        		        supportsChatter: false
	        		     }
	        		},
	        		record: { record: { Id: '' } },
	        		renderType: ''
	        	}, options);

				const invalidPolylineActions = new Set();
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Clear_Coordinates);
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Verified_Location);
				invalidPolylineActions.add(MASystem.Labels.Context_Remove_Marker);
				invalidPolylineActions.add(MASystem.Labels.ActionFramework_Set_Reference_Point);
				invalidPolylineActions.add(MASystem.Labels.MA_STREET_VIEW);
				var $layout = jQuery('<div/>');
				jQuery.each(layoutContents, function (sectionIndex, section) {

					//add this section
					var $section = jQuery('#templates .buttonset-section').clone().appendTo($layout);

					$section.find('.buttonset-section-header').text(section.Label);

					//loop over each column in this section
					jQuery.each(section.Columns, function (columnIndex, column) {

						//loop over each button in this column
						var $column = $section.find('.buttoncolumn').eq(columnIndex);
						jQuery.each(column, function (buttonIndex, button) {

							//find the definition of this button in the action framework
							var buttonDefinition = {};
							if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
								var customActionButton = MAActionFramework.customActions[button.Label];
								var layerBaseObjectId = getProperty(options, 'queryMetadata.baseObjectId');
								var modesArray = getProperty(customActionButton, 'Modes', false);
								var baseObjectIdArray = getProperty(customActionButton, 'BaseObjects').split(';');
								if ((modesArray.indexOf('BaseObject') !== -1) && baseObjectIdArray.indexOf(layerBaseObjectId) === -1) {
									return;
								} else {
									jQuery.extend(buttonDefinition, customActionButton);
								}
							}
							else if (MAActionFramework.standardActions[button.Action || button.Label]) {
								jQuery.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
							}
							else {
								return;
							}

							//add this button
							var $button = jQuery('<div class="actionbutton" onclick="Plotting.tooltipActionClick(this); event.stopPropagation();" />')
                                .attr({
                                    'data-type': buttonDefinition.Type,
                                    'data-action': button.Action || button.Label
                                })
                                .html(htmlEncode(buttonDefinition.Label))
                                .appendTo($column);

							//validate that this button meets mode requirements.  if it doesn't then disable it
							if ((MA.IsMobile && jQuery.inArray('Mobile', buttonDefinition.Modes) == -1) || (!MA.IsMobile && jQuery.inArray('Desktop', buttonDefinition.Modes) == -1)) {
								$button.hide();
								$button.addClass('disabled'); 
								return;
							}

							//validate that this button meets visibility requirements.  if it doesn't then disable it
							jQuery.each(buttonDefinition.Requirements, function (index, requirement) {
								if (requirement == 'Activity Support' && !options.queryMetadata.options.supportsActivities) {
									$button.hide(); return false;
								}
								else if (requirement == 'Verified Location Support' && options.queryMetadata.addressFields && !(options.queryMetadata.addressFields.verifiedLatitude && options.queryMetadata.addressFields.verifiedLongitude)) {
									$button.hide(); return false;
								}
								else if (requirement == 'Contact Or Lead' && jQuery.inArray(options.record.Id.substring(0, 3), ['003', '00Q']) == -1) {
									$button.hide(); return false;
								}
								else if (requirement == 'Chatter Support' && !options.queryMetadata.options.supportsChatter) {
									$button.hide(); return false;
								}
							});

							//validate that this button meets render type requirements
		                    if (buttonDefinition.RenderModes && jQuery.inArray(options.markerType, buttonDefinition.RenderModes) == -1) {
								$button.hide();
								$button.addClass('disabled');
			                }

							if (options.queryMetadata.layerType === 'polyline' && invalidPolylineActions.has(buttonDefinition.Label)) {
								$button.hide();
								$button.addClass('disabled');
							}

						});

					});
				});

				return $layout;
			},
			
			buildTakeMeThereUrlArray: function (device, urlOptions) {
				// returns an array of map urls
				urlOptions = urlOptions || {};

				// determine what source we are using => google, ios, waze
				var mapSourceUrl = '';
				var startParam = '';
				var destinationParam = '';
				var mapOptions = {
					googleMaps: {
						desktop: {
							base: 'https://www.google.com/maps',
							start: 'saddr=',
							destination: 'daddr='
						},
						ios: {
							// https://developers.google.com/maps/documentation/urls/guide
							base: 'https://www.google.com/maps/dir/?api=1&dir_action=navigate',
							destination: 'destination='
						},
						android: {
							// https://developers.google.com/maps/documentation/urls/android-intents
							base: 'geo:',
							destination: 'q='
						}
					},
					appleMaps: {
						desktop: {
							base: 'https://maps.apple.com',
							start: 'saddr=',
							destination: 'daddr='
						},
						ios: {
							base: 'maps://maps.apple.com/maps',
							destination: 'daddr='
						},
						android: {
							// apple does not exist on android, use google
							// https://developers.google.com/maps/documentation/urls/android-intents
							base: 'google.navigation:',
							destination: 'q='
						}
					},
					waze: {
						desktop: {
							base: 'https://www.waze.com/livemap/directions',
							start: 'from=ll.',
							destination: 'to=ll.'
						},
						android: {
							base: 'https://www.waze.com/ul',
							destination: 'll='
						},
						ios: {
							base: 'https://www.waze.com/ul',
							destination: 'll='
						}
					},
					uber: {
						ios: {
							//example 
							//https://m.uber.com/ul/?action=setPickup&client_id=Rd3a2B9JITPWPLPzmvXXXXXXX&pickup[latitude]=25.0791848&pickup[longitude]=121.5265924&dropoff[latitude]=25.0777658&dropoff[longitude]=121.5283466
							base: 'https://m.uber.com/ul/?action=setPickup',
							destination: 'dropoff'
						},
						android: {
							// https://developers.google.com/maps/documentation/urls/android-intents
							base: 'geo:',
							destination: 'q='
						}
					}
				};
				// is this a mobile device?
				var selectedURLInfo;
				var userAgent = navigator.userAgent;
				var isNativeMapsApp = userAgent.match(/salesforcemaps_mobile/i);
				if (device === 'ios') {
					// check our setting and update mapSourceUrl
					var savedSetting = userSettings.handleMobileMaps;
					
					// if for some reason the saved option is invalid, fall back to apple maps since this ios
					var selectedMapOptions = mapOptions[savedSetting] || mapOptions.appleMaps;
					// if this is the native maps app, we need to use the desktop style url so they can capture it properly
					if (isNativeMapsApp && savedSetting === 'googleMaps') {
						selectedURLInfo = selectedMapOptions.desktop;
					} else {
						selectedURLInfo = selectedMapOptions.ios;
					}
				} else if (device === 'android') {
					// the geo: url scheme seems to solve allowing users to select map app
					// if the user selects always they will miss out on selecting a different app in the future (will probably be reported as a bug at some point)
					// if users want to select the app from options (like ios) we will have to move to using urls and will require a webpage landing page then navigaiton to the app
					// a 'bug' was opened for this behavior (the url landing page)
					var selectedMapOptions = mapOptions.googleMaps;
					selectedURLInfo = selectedMapOptions.android;
					mapSourceUrl = selectedURLInfo.base;
					startParam = selectedURLInfo.start;
					destinationParam = selectedURLInfo.destination;
				} else {
					// this is desktop or unknown mobile device
					var selectedMapOptions = mapOptions.googleMaps;
					selectedURLInfo = selectedMapOptions.desktop;
				}

				// set the params based on device
				mapSourceUrl = selectedURLInfo.base;
				startParam = selectedURLInfo.start || ''; // technically a mobile device will no have a start, instead directions/current position
				destinationParam = selectedURLInfo.destination;

				var urlParamCheck = mapSourceUrl.indexOf('?') > -1 ? '&' : '?'; // one of the apple base links contains a ? already
				var takeMeThereQueryString = mapSourceUrl + urlParamCheck;
				var isUber = savedSetting === 'uber';
				
				// Add Start Address (saddr) if exists
				var startPos = urlOptions.startPos || {};
				if (startPos.lat !== '' && startPos.lng !== '') {
					takeMeThereQueryString += startParam
						+ encodeURIComponent(startPos.lat + ',' + startPos.lng)
						+ '&';
				}

				// Sales commit SFCF-855
				var takeMeThereQueryStringArray = [];

				// if data layer, loop over markers
				var dlMarkerPositions = urlOptions.dlMarkerPositions || [];
				if (dlMarkerPositions.length > 0) {
					for (var i = 0; i < dlMarkerPositions.length; i++) {
						takeMeThereQueryStringArray.push(takeMeThereQueryString += destinationParam + encodeURIComponent(dlMarkerPositions[i].lat + ',' + dlMarkerPositions[i].lng));
					}
				} else {
					if (isUber) {
						var finalUrl = takeMeThereQueryString += destinationParam + '[latitude]=' + encodeURIComponent(urlOptions.lat) + '&dropoff[longitude]=' + encodeURIComponent(urlOptions.lng);
						takeMeThereQueryStringArray.push(finalUrl);
					} else {
						// we just have a lat and lng
						takeMeThereQueryStringArray.push(takeMeThereQueryString += destinationParam + encodeURIComponent(urlOptions.lat + ',' + urlOptions.lng));
					}
				}
				return takeMeThereQueryStringArray;
			},

	        //events that will be fired by this framework.  developers can hook onto these events using the on method
	        events: {
	        	'ready': []
	        },

	        //used to attach handlers to action framework events
	        on: function (event, method) {
	        	try {
	        		this.events[event].push(method);
	        	}
	        	catch (err) {
	        		MALog('Invalid Event: ' + event);
	        	}
	        },

	        //used to refresh the custom actions and
	        refresh: function () {
				var dfd = $.Deferred();
	        	var me = this;

	        	//remove existing custom actions from the framework
	        	me.customActions = {};

	        	//look for custom actions that need to be injected into the framework
				var processData = {
	                action : 'get_customactions'
	            };

	            Visualforce.remoting.Manager.invokeAction(MARemoting.AdminStartUpAction,
	                processData,
	                function(response, event){
			        	//add each custom action to the available buttons
			        	jQuery.each(response.results, function (index, action) {
			        		removeNamespace(MASystem.MergeFields.NameSpace, action);
			        		me.customActions[action.Name] = {
			        			Id				: action.Id,
			        			Label			: action.Name,
			        			Type			: 'Custom Action',
			        			Modes			: action.Modes__c ? action.Modes__c.split(';') : [],
			        			Layouts			: ['Tooltip','MyPosition','POI','Mass'],
			        			Requirements	: action.Requirements__c ? action.Requirements__c.split(';') : [],
			        			Action			: action.Action__c,
			        			ActionValue		: action.ActionValue__c,
								BaseObjects		: action.BaseObjects__c ? action.BaseObjects__c : '',
			        			Options			: action.Options__c ? JSON.parse(action.Options__c) : {method:'GET',addRecords:false}
			        		};
			        	});

			        	//fire ready events
			        	jQuery.each(me.events['ready'], function (index, method) {
			        		method();
						});
						dfd.resolve();
			        },{buffer:false,escape:false}
			    );
				return dfd.promise();
	        },

	        //an index to be used and incremented by anything interacting with the framework to ensure uniqueness
	        componentIndex: 1

		};

		//refresh the framework on ready
		jQuery(function () {
			MAActionFramework.refresh();
		});
