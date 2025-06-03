var ArcGIS = {
    unauthorizedServers: {},
    unsecuredServers: {},
    fieldSeparator: ':',
    timeoutInMilliseconds: 30000,
    layers: {},
    overlayLayer: null,
	copyrightControl: null,
	copyrightOverlay: null,
	// XXX: Can I remove this variable?
    fieldSetInformation: {},
	forceSecuredURLs: true,
	styleOverridedLayer: null,
    ajaxRequest: function(requestData) {
        var dfd = jQuery.Deferred();
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest, requestData, function(response, event) {
			if (response)
				dfd.resolve(response);
			else
                dfd.resolve({
                    success: false,
					error: MASystem.Labels.AGISLB_Modal_ArcGIS_Layer_Timout
                });
        }, {
            buffer: false,
            escape: false,
            timeout: ArcGIS.timeoutInMilliseconds
        });
        return dfd.promise();
    },
    agolLogin: function(id, plotLayer, webMapURL) {
        var w = 400;
        var h = 400;
        var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
        var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
        var top = dualScreenTop + (height / 2 - h / 2);
        var left = dualScreenLeft + (width / 2 - w / 2);
        var webMapHostURL = extractHostURL(webMapURL);
        ArcGIS.layerPlotting = !MA.isMobile ? true : false;
        window.open('https://www.arcgis.com/sharing/rest/oauth2/authorize' +
            '?client_id=4RLDxBHAKFKkgLvf' +
            '&response_type=token&' +
            '&redirect_uri=' + window.location.origin + '/apex/maps__ArcGISRedirect?params=' + id + '_' + plotLayer + '_' + webMapHostURL,
            'Maps for ArcGIS',
            'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
    },
    serverRequest: function(layerId, url, webMapURL, _doProxy) {
        var doProxy = _doProxy || false;
        var dfd = jQuery.Deferred();
        var hostURL = extractHostURL(url);
        if (ArcGIS.tokenHelpers.hasAccessToken(url)) {
            dfd.resolve({
                success: true
            });
        }
		// https://services*.arcgis.com shares the same credentials with https://*.arcgis.com.
        else if (hostURL.toLowerCase().endsWith('.arcgis.com')) {
			if (ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
				ArcGIS.tokenHelpers.setAccessToken(url, ArcGIS.tokenHelpers.getAccessToken(webMapURL));
				dfd.resolve({
					success: true
				});
			}
			else {
				var requestURL = url + '?f=json';
				var requestData = {
					ajaxResource: 'ArcGISAPI',
                    securityToken: MASystem.MergeFields.Security_Token,
                    doProxy: doProxy,
					action: 'get',
					requestURL: requestURL
				};
				ArcGIS.ajaxRequest(requestData).then(function(response) {
					if (response.success) {
						var responseData = response.data;
						if (responseData.error && responseData.error.code == 499) {
							// Private arcgis.com layer; Token required
							var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
							var id = ArcGIS.getIdFromLayerId(layerId);
							ArcGIS.agolLogin(id, true, webMapURL);
							window.VueEventBus.$emit('remove-layer', layerId);
							ArcGIS.plotHelpers.removeLayer(layerId);
							dfd.resolve({
								success: false,
								error: MASystem.Labels.AGISLB_Login_Pending,
							});
						}
						else {
							// Public arcgis.com layer
							dfd.resolve({
								success: true
							});
						}
					}
					else {
						dfd.resolve({
							success: false,
							error: getProperty(response, 'error', false) || ''
						});
					}
				});
			}
		}
        else {
            ArcGIS.tokenHelpers.generateAccessToken(url).then(function(response) {
                if (response.success) {
                    // token=='': The user doesn't have login credentials or he claims that the server is unsecured.
                    // token=='...': We obtained the token for this server.
                    // token==null: This specific URL is public data, but other layers on the same server may be secured. Don't record anything about this public layer so later we can try again for secured layers.
                    if (response.accessToken != null) {
                        ArcGIS.tokenHelpers.setAccessToken(url, response.accessToken);
                    }
                    dfd.resolve({
                        success: true
                    });
                }
                else {
                    dfd.resolve(response);
                }
            });
        }
        return dfd.promise();
    },
    getBounds: function() {
        var bounds = new google.maps.LatLngBounds();
        Object.keys(ArcGIS.layers).forEach(function(layerId) {
            bounds.union(ArcGIS.getLayerBounds(layerId));
        });
        return bounds;
    },
    getLayerBounds: function(layerId) {
        if (!ArcGIS.layers[layerId].bounds) {
            ArcGIS.layers[layerId].bounds = new google.maps.LatLngBounds();
            var sublayers = ArcGIS.layers[layerId].sublayers;
            Object.keys(sublayers).forEach(function(sublayerId) {
                var sublayer = sublayers[sublayerId];
				if (sublayer.forEach) {
                    sublayer.bounds = new google.maps.LatLngBounds();
                    sublayer.forEach(function(feature) {
                        feature.getGeometry().forEachLatLng(function(latLng) {
                            sublayer.bounds.extend(latLng);
                        });
                    });
                }
				if (sublayer.bounds) {
					ArcGIS.layers[layerId].bounds.union(sublayer.bounds);
				}
            });
        }
        return ArcGIS.layers[layerId].bounds;
    },
	removeLayer: function(id) {
		Object.keys(ArcGIS.layers).forEach(function(layerId) {
			if (layerId.indexOf(id + ArcGIS.fieldSeparator) == 0) {
				ArcGIS.plotHelpers.removeLayer(layerId);
			}
		});
	},
    refreshLayer: function(layerId) {
        var dfd = jQuery.Deferred();
        if (ArcGIS.layers[layerId]) {
			var sublayers = ArcGIS.layers[layerId].sublayers;
			Object.keys(sublayers).forEach(function(sublayerId) {
				var sublayer = sublayers[sublayerId];
				if (sublayer.refresh) {
					sublayer.refresh();
				}
			});
			ArcGIS.plotHelpers.showCopyrightText();

            dfd.resolve({
				success: true
			});
        }
        else {
            dfd.resolve({
				success: false,
				error: MASystem.Labels.AGISLB_Modal_ArcGIS_Layer_Not_Found
			});
        }
        return dfd.promise();
    },
    getIdFromLayerId: function(layerId) {
        return layerId.split(ArcGIS.fieldSeparator)[0];
    },
    generateLayerIdFromId: function(id) {
        return id + ArcGIS.fieldSeparator + new Date().getTime();
    },
	getLayerIdFromBasemapName: function(basemapName) {
		var items = basemapName.split(ArcGIS.fieldSeparator);
		return [items[0], items[1]].join(ArcGIS.fieldSeparator);
	},
    getBasemapIdFromBasemapName: function(basemapName) {
        return basemapName.split(ArcGIS.fieldSeparator)[2];
    },
    findUniqueLayerId: function(id) {
        var foundLayerId;
        if (id.indexOf(ArcGIS.fieldSeparator) >= 0) {
            foundLayerId = id;
        }
        else {
            Object.keys(ArcGIS.layers).forEach(function(layerId) {
                if (layerId.indexOf(id + ArcGIS.fieldSeparator) == 0) {
                    foundLayerId = layerId;
                }
            });
        }
        return foundLayerId;
    },
	findUniqueLayerById: function(layerId, sublayerId) {
        var layer = ArcGIS.layers[ArcGIS.findUniqueLayerId(layerId)];
        if (layer && sublayerId) {
            layer = layer.sublayers[sublayerId];
        }
        return layer;
	},
	findLayerById: function(layerId, sublayerId) {
        var layer = ArcGIS.layers[layerId];
        if (layer && sublayerId) {
            layer = layer.sublayers[sublayerId];
        }
        return layer;
	},
    removeDuplicates: function(arrayName)
    {
        //Return Unique Array
        var ReturnArray = new Array();
        arrayName.forEach(value => {
            if (ReturnArray.indexOf(value) < 0)
            {
                ReturnArray.push(value);
            }
        });

        return ReturnArray;
    },
	findLayerByTitle: function(layerTitle, sublayerTitle) {
		var layerFound;
		Object.keys(ArcGIS.layers).forEach(function(layerId) {
			var layer = ArcGIS.layers[layerId];
			if (layer.title == layerTitle) {
				Object.keys(layer.sublayers).forEach(function(sublayerId) {
					var sublayer = layer.sublayers[sublayerId];
					if (sublayer.title == sublayerTitle) {
						layerFound = sublayer;
						return false;
					}
				});
			}
		});
		return layerFound;
    },
    createDomElement: function(options) {
        var dfd = $.Deferred();
        options.component = 'ArcGISLayer';
        window.VueEventBus.$emit('add-layer', options, function(arcLayerRef) {
            $layerHTML = $(arcLayerRef);
            $layerHTML.addClass('ArcGISLayer PlottedRowUnit loading').removeClass('PlottedRowUnit-ArcGISLayer');
            dfd.resolve($layerHTML);
        });
        return dfd.promise();
    },
    storeLayerAnalytics(options) {
        try {
            // Begin MA analytics
            var requestData = {
                ajaxResource: 'TreeAJAXResources',
                securityToken: MASystem.MergeFields.Security_Token,
                action: 'store_layer_analytics',
                track: 'true',
                subtype: 'ArcGIS Online',
                id: options.id
            };

			ArcGIS.ajaxRequest(requestData).then(function(response) {
                // Done saving analytics
                VueEventBus.$emit('get-recent-layers');
            });
        }
        catch (ex) {
            console.warn(ex);
        }
    },
    createLayerElement(options) {
        var dfd = $.Deferred();

        ArcGIS.createDomElement(options).then(function($layerHTML) {
            // modifying for vue support
            // var $layerHTML = $('#templates .PlottedRowUnit-ArcGISLayer').clone().addClass('ArcGISLayer PlottedRowUnit loading').removeClass('PlottedRowUnit-ArcGISLayer');
            $layerHTML.find('.layername').html(MASystem.Labels.MA_Loading_With_Ellipsis);
            $layerHTML.find('.queryLoader').show();
            // handled in vue
            // $layerHTML.find('button.btn-remove').attr('onclick', "ArcGIS.plotHelpers.removeLayer('" + layerId + "');");
            $layerHTML.data('layerType', 'ArcGISLayer');
            $layerHTML.attr('data-type', 'ArcGIS Layer');
            $layerHTML.attr('data-qid', options.id);
            $layerHTML.attr('qid', options.qid);
            $layerHTML.attr('perm-modify', options.modify);
            $layerHTML.prependTo('#PlottedQueriesTable');
            if (!options.modify) {
                $layerHTML.find('.edit-query').remove();
            }

            if (MA.isMobile) {
                $layerHTML.attr({
                    'id'                    : 'ACTIVE_' + options.id,
                    'data-id'               : options.id,
                    'nodetype'              : 'PersonalDataLayer',
                    'type'                  : 'arcgisonline',
                    'perm-create'           : false,
                    'perm-delete'           : false,
                    'perm-export'           : false,
                    'perm-read'             : false,
                    'perm-modify'           : false,
                    'perm-setpermissions'   : false
                });
                $layerHTML.find('.layer-nest-click-area').attr({'action':'plot-data-layer-null'});
            }

            dfd.resolve($layerHTML);
        });

        return dfd.promise();
    },
    layerPlotting: false,
    plotLayer: function(options) {
        ArcGIS.layerPlotting = true;
        ArcGIS.storeLayerAnalytics(options);
        window.trackUsage('Maps', { action: 'Plot ArcGIS Layer', description: 'Plotting an ArcGIS Layer' });
        // Move to plotted tab
        VueEventBus.$emit('move-to-tab', 'plotted');

        var layerId = options.qid || ArcGIS.generateLayerIdFromId(options.id);

        // adding qid for layer tracking in vue
        if (!options.qid) {
            options.qid = layerId;
        }
        ArcGIS.createLayerElement(options).then(function($layerHTML) {
            var requestData = {
                ajaxResource: 'ArcGISAPI',
                securityToken: MASystem.MergeFields.Security_Token,
                action: 'getLayer',
                layerId: options.id
            };

            ArcGIS.ajaxRequest(requestData).then(function(data) {
                var record = data.record;
                var layerOptions = JSON.parse(record.maps__Options__c);
                var layerName = getProperty(record, 'Name');
                $layerHTML.find('.layername').html(htmlEncode(layerName)).addClass('basicinfo-name');
                $layerHTML.data('name', layerName);

                // { qid, url, layerId, automaticRefresh, refreshInterval }
                var _options = {
                    qid: options.qid,
                    url: layerOptions.baseURL,
                    layerId: layerId,
                    automaticRefresh: layerOptions.automaticRefresh,
                    refreshInterval: layerOptions.refreshInterval == '--None--' ? 0 : layerOptions.refreshInterval
                };

                ArcGIS.applyLayer(_options);
                $('#visibleAreaRefeshMap').addClass('visible');
            });
        });
		return layerId;
    },
    /**
     * @param { qid, url, layerId, automaticRefresh, refreshInterval } options
     */
    applyLayer(options) {
        var found;

        if (found = options.url.match(/[?&](webmap|layers)=([0-9a-z,]+)/)) {
            switch (found[1]) {
                case 'webmap':
                    
                    ArcGIS.plotHelpers.plotWebMap(options.layerId, found[2].split(',')[0], options.url, {
                        automaticRefresh: options.automaticRefresh,
                        interval: options.refreshInterval
                    }, options.doProxy || false);
                    break;
                case 'layers':
                    ArcGIS.plotHelpers.plotWebMapLayers(options.layerId, found[2].split(','), options.url, {
                        automaticRefresh: options.automaticRefresh,
                        interval: options.refreshInterval
                    }, options.doProxy || false);
                    break;
                default:
                    window.VueEventBus.$emit('remove-layer', options.qid);
                    MAToastMessages.showError({
                        message: MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Unsupported,
                        timeOut: 3000,
                        extendedTimeOut: 0
                    });
                    break;
            }
        } else if (options.url.indexOf('/rest/') > -1) {
            ArcGIS.plotHelpers.plotRESTLayer(options.layerId, options.url, {
                automaticRefresh: options.automaticRefresh,
                interval: options.refreshInterval
            });
        } else {
            window.VueEventBus.$emit('remove-layer', options.qid);
            MAToastMessages.showError({
                message: MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Unsupported,
                timeOut: 3000,
                extendedTimeOut: 0
            });
        }
    },
	getScale: function() {
		// https://gis.stackexchange.com/a/127949
		// https://groups.google.com/d/msg/google-maps-js-api-v3/hDRO4oHVSeM/osOYQYXg2oUJ
		var scale = 156543.03392 * Math.cos(MA.map.getCenter().lat() * Math.PI / 180) / Math.pow(2, MA.map.zoom) // meters per pixel
			* 96 // pixels per inch
			* 39.3701 // inches per meter
		return scale;
	},
	secureURL: function(url) {
		if (ArcGIS.forceSecuredURLs && url && url.match(/^http:\/\//)) {
			var uniqueURL = extractHostURL(url).toLowerCase();
			if (!ArcGIS.unsecuredServers[uniqueURL]) {
				ArcGIS.unsecuredServers[uniqueURL] = true;
				MAToastMessages.showWarning({
					// message: 'Insecure URL <a onclick="copyToClipboard(this)">' + uniqueURL + '</a> requested. Layer will be requested over HTTPS, but it may not be displayed. Ensure the layer is hosted over HTTPS. Please share this warning and details with Maps Support and your ArcGIS Online Administrator.',
					message: MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Insecure + '<a onclick="copyToClipboard(this)">' + uniqueURL + '</a>' + MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Insecure_Details,
					timeOut: 0,
					extendedTimeOut: 0
				});
			}
			url = url.replace(/^http:\/\//, 'https://');
		}
		return url;
	},
	getInfoWindowLayer: function() {
		var $infoWindowData = $('#infowindowMasterTabContentActions');
	    var layerId = $infoWindowData.data('layerid');
	    var sublayerId = $infoWindowData.data('layer');
	    var sublayer = ArcGIS.layers[layerId].sublayers[sublayerId]
	    return sublayer;
	},
    runInfoWindowAdjust: function() {
        $('.slds-info-window-wrapper').parent().parent().addClass('google-info-window-wrapper');
        var $googleInfoWindow = $('.google-info-window-wrapper');
        //Derek change this for ArcGIS
        //$googleInfoWindow.css({'width':'auto!important','height':'auto!important'});
        MA.Map.InfoBubble.adjust();

        //I am adding a big block of code from MADemographic here
        $('.slds-info-window-wrapper').find('.actionbutton').click(function(e) {
            var $button = $(this);
            var frameworkAction = $button.attr('data-type') == 'Custom Action' ?
                MAActionFramework.customActions[$button.attr('data-action')] || null :
                MAActionFramework.standardActions[$button.attr('data-action')] || null;

            if (frameworkAction) {
                switch (frameworkAction.Action) {
                    case 'Iframe':
                        /*//get a component index from the action framework to make this tab unique and build the iframe url
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
                        });*/
                        break;

                    case 'NewWindow':
                        var options = {
                            recString: ''
                        };
                        if (frameworkAction.ActionValue.indexOf('{records}') >= 0) {
                            options.records = true;
                        }

                        var newURL = frameworkAction.ActionValue +
                            (frameworkAction.ActionValue.indexOf('?') == -1 ? '?noparams' : '') +
                            '&Button=' + encodeURIComponent(frameworkAction.Label) +
                            '&RecordId=' + record.record.Id;
                        if (frameworkAction.Options.method == 'GET') {
                            if (frameworkAction.Options.addRecords) {
                                newURL += '&' + frameworkAction.Options.paramName + '=' + record.record.Id;
                            }
                            window.open(newURL);
                        }
                        else {
                            var postData = {};

                            if (frameworkAction.Options.addRecords) {
                                postData[frameworkAction.Options.paramName] = record.record.Id;
                            }

                            openNewWindow('POST', newURL, postData, '_blank');
                        }
                        break;

                    case 'Javascript':
                        var layerObj = {};
                        var lat = $('#infowindowMasterTabContentActions').attr('lat');
                        var lng = $('#infowindowMasterTabContentActions').attr('lng');
                        var title = $('#infowindowMasterTabContentActions').attr('data-title');
                        var records = {
                            location: {
                                coordinates: {
                                    lat: $('#infowindowMasterTabContentActions').attr('lat'),
                                    lng: $('#infowindowMasterTabContentActions').attr('lng')
                                }
                            },
                            marker: {
                                layerType: 'POI'
                            },
                            plottedQuery: null //$button
                        };

                        var removeRecords = {
                            marker: ''
                        };

                        var customMarkers = [];
                        var customMarker = {
                            latlng: new google.maps.LatLng(lat, lng),
                            type: "POI",
                            title: title,
                            address: 'ArcGIS Point at ' + lat + ' , ' + lng

                        };
                        customMarkers.push(customMarker);
                        //layerObj[marker.layerUID || 'dlClick'] = [marker];

                        if ($button.attr('data-action') == 'Remove Marker') {
                            var closureUid = $('#infowindowMasterTabContentActions').data('closureuid');
							var featureLayer = ArcGIS.getInfoWindowLayer();
                            var targetprop;
                            // pattern to access data in featureLayer has always been a letter plus the same letter. (ex. b.b, j.j, etc..)
                            // THIS FOR IN LOOP WILL LOOK FOR THE PATTERN STATED ABOVE. THIS WILL HOPEFULLY FIX HAVING TO CHANGE VARIABLE PROPERTY EVERY TIME GOOGLE MAPS API UPDATES
                            for (var prop in featureLayer) {
                                if (featureLayer[prop].hasOwnProperty(prop.toString())) {
                                    targetprop = prop;
                                }
                            }

                            featureLayer.remove(featureLayer[targetprop][targetprop][closureUid]);
                            MA.Map.InfoBubble.hide();
                        }
                        else if ($button.attr('data-action') == 'Create Record') {
                            var layerId = $('#infowindowMasterTabContentActions').data('layerid').substring(0, 18);
							var requestData = {
								ajaxResource: 'ArcGISAPI',
								securityToken: MASystem.MergeFields.Security_Token,
								action: 'getLayer',
								layerId: layerId
							};
							ArcGIS.ajaxRequest(requestData).then(function(response) {
                                var record = response.record;
								var templates = [];
								var arcC2Csettings = JSON.parse(getProperty(record, 'maps__ArcGISWebMapC2C__c')) || [];
								$.each(arcC2Csettings, function(k, c2cMap) {
									if (c2cMap.active) {
										templates.push(c2cMap);
									}
                                });
								ArcGIS.click2CreateHelpers.createRecordStep1({ layerType: 'ArcGISLayer', templates: templates, isMassAction: false });
							}, {
								buffer: false,
								escape: false,
								timeout: ArcGIS.timeoutInMilliseconds
							});
                        }
                        else {
                            frameworkAction.ActionValue.call(this, {
                                button: $button,
                                dataLayers: layerObj,
                                records: $button.attr('data-action') == MASystem.Labels.MA_STREET_VIEW ? [records] : [],
                                customMarkers: customMarkers,
                                mode: MA.IsMobile == true ? 'Mobile' : 'Desktop',
                                formattedMarkerAddress: 'ArcGIS Layer',
                            });
                        }
                        break;

                    default:
                        break;
                }
            }

            //stop the click from getting to the map
            // e.stopPropagation();
        });
        //This is the end of the MADemographic code
    },
    validateDetails: function() {
        var validDetails = true;
        var layerName = $('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').val() || '--None--';
        var layerWebMapURL = $('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').val() || '--None--';
        var automaticRefresh = $('div#CreateNewArcGISWebMapPopup').find('input[name="AutomaticRefresh"]:checked').val() || '--None--';
        var refreshInterval = $('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').val() || '--None--';

		if (layerName == '' || layerName == '--None--') {
			$('#arc-name-error-message').remove();
			$('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').closest('.slds-form-element').addClass('slds-has-error');
			$('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').closest('.slds-form-element').append('<div id="arc-name-error-message" class="slds-form-element__help">' + MASystem.Labels.AGISLB_Modal_C2C_Name_Validation + '.</div>');
			validDetails = false;
		}
		else {
			var longWords = false;
			layerName.split(/[ \t]+/).forEach(function(word) {
				if (word.length > 20) {
					longWords = true;
					return false;
				}
			});
			if (longWords) {
				$('#arc-name-error-message').remove();
				$('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').closest('.slds-form-element').addClass('slds-has-error');
				$('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').closest('.slds-form-element').append('<div id="arc-name-error-message" class="slds-form-element__help">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Max + '</div>');
				validDetails = false;
			}
			else {
				$('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').closest('.slds-form-element').removeClass('slds-has-error');
				$('#arc-name-error-message').remove();
			}
		}

		if (layerWebMapURL == '' || layerWebMapURL == '--None--') {
			$('#arc-url-error-message').remove();
			$('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').closest('.slds-form-element').addClass('slds-has-error');
			$('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').closest('.slds-form-element').append('<div id="arc-url-error-message" class="slds-form-element__help">' + MASystem.Labels.AGISLB_Modal_C2C_Name_Validation + '.</div>');
			validDetails = false;
		}
		else {
			$('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').closest('.slds-form-element').removeClass('slds-has-error');
			$('#arc-url-error-message').remove();
		}
		if (automaticRefresh == '--None--') {
			// TODO: Highlighting doesn't work?
			$('#arc-automaticrefresh-error-message').remove();
			$('div#CreateNewArcGISWebMapPopup').find('input[name="AutomaticRefresh"]').closest('.slds-form-element').addClass('slds-has-error');
			$('div#CreateNewArcGISWebMapPopup').find('input[name="AutomaticRefresh"]').closest('.slds-form-element').append('<div id="arc-automaticrefresh-error-message" class="slds-form-element__help">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Select_One + '</div>');
			validDetails = false;
		}
		else {
            $('div#CreateNewArcGISWebMapPopup').find('input[name="AutomaticRefresh"]').closest('.slds-form-element').removeClass('slds-has-error');
            $('#arc-automaticrefresh-error-message').remove();
		}
		$('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').attr('disabled', automaticRefresh != 'ForceRefresh');
        if (refreshInterval == '' || refreshInterval == '--None--' || (refreshInterval.match(/^([0-9]*\.)?[0-9]+$/) && refreshInterval > 0)) {
            $('#arc-refreshinterval-error-message').remove();
            $('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').closest('.slds-form-element').removeClass('slds-has-error');
        }
		else {
			$('#arc-refreshinterval-error-message').remove();
			$('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').closest('.slds-form-element').addClass('slds-has-error');
			$('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').closest('.slds-form-element').append('<div id="arc-refreshinterval-error-message" class="slds-form-element__help">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Greater_Zero + '</div>');
			validDetails = false;
		}

		if (!validDetails) {
			MAToastMessages.showError({
				message: MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Fix,
				timeOut: 3000,
				extendedTimeOut: 0
			});
		}

        return validDetails;
    },
    closeCreateWindow: function() {
        ClosePopupWindow();
        $('.arc-config-input-wrapper').empty();
        $('#fieldMappingsWrapper .arc-field-mapping-input').remove();
        $('#fieldMappingsWrapper').removeClass('fadeInLeft');
        $('#fieldMappingsWrapper').removeClass('fadeInDown');
        $('#webMapTemplateTable table tbody').empty();
        $('#webMapTemplateTable').removeClass('fadeInLeft');
        $('#CreateNewArcGISWebMapPopup .arc-advanced').removeClass('slds-is-active');
        $('#CreateNewArcGISWebMapPopup .arc-click-to-create').removeClass('slds-is-active');
        $('#CreateNewArcGISWebMapPopup .arc-details').addClass('slds-is-active');
        $('#arcgisDetailsTab').removeClass('slds-hide').addClass('slds-show');
        $('#arcgisC2CSetupTab').removeClass('slds-show').addClass('slds-hide');
        $('#arcgisAdvancedTab').removeClass('slds-show').addClass('slds-hide');
    }
};

// Global Click actions for ArcGIS
// $('document').ready(function() // BJ, Teddy changed this as a temporary fix until you get back to it cause it was breaking due to the $ being undefined
document.addEventListener("DOMContentLoaded", function() {
    $('#CreateNewArcGISWebMapPopup').on('click', "#newWebMapTemplate", function() {
        var options = $('#CreateNewArcGISWebMapPopup').data().options || {}
        var fieldMappings = [];
        var layerName = $('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').val() || '--None--';
        var layerDescription = $('div#CreateNewArcGISWebMapPopup').find('input[name="Description"]').val() || '--None--';
        var layerWebMapURL = $('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').val() || '--None--';
        var webMapOptions = {
            layerWebMapURL: layerWebMapURL,
            layerId: getProperty(options, 'id', false) || '',
            fieldMappingTemplates: fieldMappings
        }
        $('.arc-field-mapping-input #updateArcTemplate').attr('id', 'createArcTemplate').text(MASystem.Labels.AGISLB_Modal_Btn_Create_Template);
        $("#webMapTemplateTable").removeClass('fadeInLeft');
        $('.new-arc-template-setup-container').addClass('fadeInLeft');
        $('.arc-config-input-wrapper').addClass('fadeInLeft');
        $("#arcgisC2CSetupTab nav").show();
        $("#fieldMappingsWrapper").addClass('fadeInLeft');
        ArcGIS.click2CreateHelpers.createTemplateForm(webMapOptions);
    });

    $('#CreateNewArcGISWebMapPopup').on('click', "#arcgisC2CSetupTab .slds-breadcrumb a", function() {
        $("#arcgisC2CSetupTab nav").hide();
        $(".arc-config-input-wrapper").removeClass('fadeInDown');
        $("#fieldMappingsWrapper").removeClass('fadeInDown');
        $(".arc-config-input-wrapper .arc-config-input").remove();
        $("#fieldMappingsWrapper .arc-field-mapping-input").remove();
        $("#webMapTemplateTable").addClass('fadeInLeft');
    });

    $('#CreateNewArcGISWebMapPopup').on('change', 'input[name="Name"],textarea[name="WebMapURL"],input[name="AutomaticRefresh"]', function() {
        var name = $('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').val() || '--None--';
        var webMapURL = $('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').val() || '--None--';

        if (name != '--None--' && webMapURL != '--None--' && ArcGIS.validateDetails()) {
            $('.arc-click-to-create').css({
                'pointer-events': '',
                'opacity': '1'
            });
        }
        else {
            $('.arc-click-to-create').css({
                'pointer-events': 'none',
                'opacity': '0.6'
            });
        }
    });

    $('body').on('change', '#createArcLayerRecord .createrecord2-object', function() {
        var sobjectName = $(this).val();
        //ArcGIS.click2CreateHelpers.getFieldSets(sobjectName).then();
        var $recordTypeSelect = $('#createArcLayerRecord .createrecord2-recordtype').empty();
        $recordTypeSelect.append('<option value="none">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Loading_Text + '</option>');
        var $fieldSetSelect = $('#createArcLayerRecord .createrecord2-fieldset').empty();
        $fieldSetSelect.append('<option value="none">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Loading_Text + '</option>');
        ArcGIS.click2CreateHelpers.getFieldSets(sobjectName).then(function(objectFieldSetInformation) {
            var recordTypeInfo = getProperty(objectFieldSetInformation, 'recordTypeInfo', false || []);
            ArcGIS.fieldSetInformation = getProperty(objectFieldSetInformation, 'fieldSetInfo', false || {});
            var recordTypeString = '';
            for (k in recordTypeInfo) {
                var rt = recordTypeInfo[k];
                recordTypeString += '<option value="' + rt.getId + '">' + rt.getName + '</option>';
            }
            $recordTypeSelect.empty();
            $recordTypeSelect.append(recordTypeString);
            $recordTypeSelect.change();
            /**for (k in ArcGIS.fieldSetInformation) {
                var fsi = ArcGIS.fieldSetInformation[k];
                var userSelectedValue = $('.arc-config-input-wrapper .field-set-select').attr('data-default');
                if (k == userSelectedValue) {
                    $('#createArcLayerRecord .field-set-select').append('<option value="' + k + '" selected="selected">' + fsi.getLabel + '</option>');
                }
                else {
                    $('.arc-config-input-wrapper .field-set-select').append('<option value="' + k + '">' + fsi.getLabel + '</option>');
                }
            }*/
        })
    })
    $('body').on('change', '#createArcLayerRecord .createrecord2-recordtype', function() {
        var $fieldSetSelect = $('#createArcLayerRecord .createrecord2-fieldset').empty();
        $fieldSetSelect.append('<option value="none">' + MASystem.Labels.AGISLB_Modal_ArcGIS_Loading_Text + '</option>');
        var fieldSetString = '';
        for (k in ArcGIS.fieldSetInformation) {
            var fsi = ArcGIS.fieldSetInformation[k];
            fieldSetString += '<option value="' + k + '">' + fsi.getLabel + '</option>'
        }
        $fieldSetSelect.empty();
        $fieldSetSelect.append(fieldSetString);
    })
    $('body').on('change', "#createArcLayerRecord .createrecord2-template", function() {
        if ($(this).val() != 'default') {
            ArcGIS.click2CreateHelpers.populateFields();
        }
        else {
            $('.ClickToCreateFormTable .fieldInput').find('.get-input').val('');
            $('.ClickToCreateFormTable .fieldInput').find('.get-input').removeProp('disabled');
        }
    })
    $('body').on('click', '#CreateNewArcGISWebMapPopup .edit-template', function() {
        $("#webMapTemplateTable").removeClass('fadeInLeft');
        var ESRILayerInformation = $('#CreateNewArcGISWebMapPopup #webMapTemplateTable').data('ESRILayerInformation');
        var webMapOptions = $('#CreateNewArcGISWebMapPopup #webMapTemplateTable').data('webMapOptions');
        var currentWebMapOptions = {
            layerWebMapURL: getProperty(webMapOptions, 'layerWebMapURL', false) || '',
            layerId: getProperty(webMapOptions, 'layerId', false) || '',
            fieldMappingTemplates: []
        };

        //ArcGIS.click2CreateHelpers.createTemplateForm(currentWebMapOptions);
        var $tempRow = $(this).closest('.click-2-create-template-row');
        $tempRow.addClass('updatingTemplateRow');
        //currentWebMapOptions
        ArcGIS.click2CreateHelpers.editTemplate($tempRow, currentWebMapOptions, ESRILayerInformation).then(function(rowData, updatedrow) {
            var fieldSetSelect = $('.arc-config-input-wrapper .field-set-select');
            var fieldSetSelectHasOption = $(fieldSetSelect).find('option[value = "' + rowData.fieldSet.path + '"]').length > 0;

            var $latitudeField = $('.arc-config-input-wrapper .latitude-select');
            var $longitudeField = $('.arc-config-input-wrapper .longitude-select');

            $latitudeField.attr('data-default',rowData.latlng.lat);
            $longitudeField.attr('data-default',rowData.latlng.lng);


            fieldSetSelect.attr('data-default', rowData.fieldSet.path);
            $('#fieldMappingsContainer').data('fieldMappings', getProperty(rowData, 'fieldMappings', false) || []);
            $('.arc-field-mapping-input #createArcTemplate').attr('id', 'updateArcTemplate').html(MASystem.Labels.AGISLB_Modal_Btn_Update_Template).removeAttr('disabled');
            if (fieldSetSelectHasOption) {
                $(fieldSetSelect).val(rowData.fieldSet.path);
                $(fieldSetSelect).change();
            }
            else {
                $(fieldSetSelect).attr('original-value', rowData.fieldSet.path);
            }
            $('.arc-config-input-wrapper .record-type-select').attr('data-default', rowData.recordType.path);
            //$('.arc-config-input-wrapper .record-type-select').val(rowData.recordType.path).change();
            //$('.arc-config-input-wrapper .field-set-select').val(rowData.fieldSet.path).change();
            //$('.arc-config-input-wrapper .latitude-select').val(rowData.latlng.lat).change();
            //$('.arc-config-input-wrapper .longitude-select').val(rowData.latlng.lng).change();
            $('#updateArcTemplate').on('click', function() {
                //webmap-active
                var isActive = getProperty(rowData, 'active', false) || false;
                var $arcInputWrapper = $('.arc-config-input-wrapper');

                //so lets grab all the configuration information
                var templateData = {
                    active: isActive,
                    templateName: $arcInputWrapper.find('.web-map-template-name').val().replace(/[ \t]+/g, ' ').replace(/^ | $/g, ''),
                    webMapLayer: {
                        path: $arcInputWrapper.find('.web-map-layer-select').val(),
                        label: $arcInputWrapper.find('.web-map-layer-select option:selected').text()
                    },
                    salesforceObject: {
                        path: $arcInputWrapper.find('.salesforce-object-select').val(),
                        label: $arcInputWrapper.find('.salesforce-object-select option:selected').text()
                    },
                    recordType: {
                        path: $arcInputWrapper.find('.record-type-select').val(),
                        label: $arcInputWrapper.find('.record-type-select option:selected').text()
                    },
                    fieldSet: {
                        path: $arcInputWrapper.find('.field-set-select').val(),
                        label: $arcInputWrapper.find('.field-set-select option:selected').text()
                    },
                    latlng: {
                        lat: $arcInputWrapper.find('.latitude-select').val(),
                        lng: $arcInputWrapper.find('.longitude-select').val()
                    }
                };
                var newTemplateMappings = [];
                //now we need to grab all the field mapping information.
                $.each($('#fieldMappingsWrapper .field-match-row'), function(k, row) {

                    var $row = $(row);
                    var rowInfo = {
                        staticFieldLabel: $row.find('.static-field').text(),
                        staticFieldPath: $row.attr('data-path'),
                        webMapPath: $row.find('.webmap-field-select').val(),
                        locked: !$row.find('.field-editable').is(':checked')
                    };
                    newTemplateMappings.push(rowInfo); //webmap-field-select
                });
                templateData.fieldMappings = newTemplateMappings;

				if (ArcGIS.click2CreateHelpers.validateTemplateData(templateData, true)) {
					var templateRow = $(updatedrow); //$('#arc-field-mapping-template .click-2-create-template-row').clone();
					templateRow.find('.web-map-layers').attr('title', templateData.webMapLayer.label).find('div').text(templateData.webMapLayer.label);
					templateRow.find('.salesforce-object').attr('title', templateData.salesforceObject.label).text(templateData.salesforceObject.label);
					templateRow.find('.record-type').attr('title', templateData.recordType.label).text(templateData.recordType.label);
					templateRow.find('.field-set').attr('title', templateData.fieldSet.label).text(templateData.fieldSet.label);
					templateRow.find('.template-name').attr('title', templateData.templateName).find('div').text(templateData.templateName);
					templateRow.find('.webmap-active').attr('checked', isActive);

					$('#webMapTemplateTable .WebMapC2CTemplateRows').append(templateRow);

					templateRow.data('rowData', templateData);

					//now that we have we need to add it to the templates table.
					// ArcGIS.click2CreateHelpers.populateTemplates([templateData]);
					$(".arc-config-input-wrapper").removeClass('fadeInDown');
					$("#fieldMappingsWrapper").removeClass('fadeInDown');
					$(".arc-config-input-wrapper .arc-config-input").remove();
					$("#fieldMappingsWrapper .arc-field-mapping-input").remove();
					$("#webMapTemplateTable").addClass('fadeInLeft');
				}
            });
        });
    });


    $('body').on('click', "#createArcTemplate", function() {
        var $arcInputWrapper = $('.arc-config-input-wrapper');

        //so lets grab all the configuration information
        var templateData = {
            active: false,
            templateName: $arcInputWrapper.find('.web-map-template-name').val().replace(/[ \t]+/g, ' ').replace(/^ | $/g, ''),
            webMapLayer: {
                path: $arcInputWrapper.find('.web-map-layer-select').val(),
                label: $arcInputWrapper.find('.web-map-layer-select option:selected').text()
            },
            salesforceObject: {
                path: $arcInputWrapper.find('.salesforce-object-select').val(),
                label: $arcInputWrapper.find('.salesforce-object-select option:selected').text()
            },
            recordType: {
                path: $arcInputWrapper.find('.record-type-select').val(),
                label: $arcInputWrapper.find('.record-type-select option:selected').text()
            },
            fieldSet: {
                path: $arcInputWrapper.find('.field-set-select').val(),
                label: $arcInputWrapper.find('.field-set-select option:selected').text()
            },
            latlng: {
                lat: $arcInputWrapper.find('.latitude-select').val(),
                lng: $arcInputWrapper.find('.longitude-select').val()
            }
        };
        var newTemplateMappings = [];
        //now we need to grab all the field mapping information.
        $.each($('#fieldMappingsWrapper .field-match-row'), function(k, row) {
            var $row = $(row);
            var rowInfo = {
                staticFieldLabel: $row.find('.static-field').text(),
                staticFieldPath: $row.attr('data-path'),
                webMapPath: $row.find('.webmap-field-select').val(),
                locked: !$row.find('.field-editable').is(':checked')
            };
            newTemplateMappings.push(rowInfo); //webmap-field-select
        });
        templateData.fieldMappings = newTemplateMappings;

		if (ArcGIS.click2CreateHelpers.validateTemplateData(templateData)) {
			//now that we have we need to add it to the templates table.
			ArcGIS.click2CreateHelpers.populateTemplates([templateData]);

			$(".arc-config-input-wrapper").removeClass('fadeInDown');
			$("#fieldMappingsWrapper").removeClass('fadeInLeft');
			$("#fieldMappingsWrapper").removeClass('fadeInDown');
			$(".arc-config-input-wrapper .arc-config-input").remove();
			$("#fieldMappingsWrapper .arc-field-mapping-input").remove();
			$("#webMapTemplateTable").addClass('fadeInLeft');
		}
    });

    $('#PlottedQueriesContainer').on('click', '.agol-legend-row', function () {
        var $row = $(this);
        var $checkbox = $row.find('.agol-legend-checkbox');
        $checkbox.prop('checked',!$checkbox.prop('checked'));
        $checkbox.change();
    });
});

/* Code to simplify a google maps api v3 Polyline based on the douglasPeucker.js snippet
 *
 * https://gist.github.com/adammiller/826148/1d85ef082868391b3e0d13865dfc098705d1c30d#gistcomment-829573
 *
 * Author: Humppakarajat (?)
 *
 * Usage:
 * var pl = new google.maps.Polyline({...});
 * var simplifiedLinePath = pl.simplifyLine(0.00045);
 * var simplifiedLine = new google.maps.Polyline({map: gmap, path: simplifiedLinePath});
 */
/* TODO: Getting google undefined error. Need to move this prototype!
google.maps.Polyline.prototype.simplifyLine = function(tolerance) {
    var res = null;

    if(this.getPath() && this.getPath().getLength()) {
        var points = this.getPath().getArray();

        var Line = function( p1, p2 ) {
            this.p1 = p1;
            this.p2 = p2;

            this.distanceToPoint = function( point ) {
                // slope
                var m = ( this.p2.lat() - this.p1.lat() ) / ( this.p2.lng() - this.p1.lng() ),
                    // y offset
                    b = this.p1.lat() - ( m * this.p1.lng() ),
                    d = [];
                // distance to the linear equation
                d.push( Math.abs( point.lat() - ( m * point.lng() ) - b ) / Math.sqrt( Math.pow( m, 2 ) + 1 ) );
                // distance to p1
                d.push( Math.sqrt( Math.pow( ( point.lng() - this.p1.lng() ), 2 ) + Math.pow( ( point.lat() - this.p1.lat() ), 2 ) ) );
                // distance to p2
                d.push( Math.sqrt( Math.pow( ( point.lng() - this.p2.lng() ), 2 ) + Math.pow( ( point.lat() - this.p2.lat() ), 2 ) ) );
                // return the smallest distance
                return d.sort( function( a, b ) {
                    return ( a - b ); //causes an array to be sorted numerically and ascending
                } )[0];
            };
        };

        var douglasPeucker = function( points, tolerance ) {
            if ( points.length <= 2 ) {
                return [points[0]];
            }
            var returnPoints = [],
                // make line from start to end
                line = new Line( points[0], points[points.length - 1] ),
                // find the largest distance from intermediate poitns to this line
                maxDistance = 0,
                maxDistanceIndex = 0,
                p;
            for( var i = 1; i <= points.length - 2; i++ ) {
                var distance = line.distanceToPoint( points[ i ] );
                if( distance > maxDistance ) {
                    maxDistance = distance;
                    maxDistanceIndex = i;
                }
            }
            // check if the max distance is greater than our tollerance allows
            if ( maxDistance >= tolerance ) {
                p = points[maxDistanceIndex];
                line.distanceToPoint( p, true );
                // include this point in the output
                returnPoints = returnPoints.concat( douglasPeucker( points.slice( 0, maxDistanceIndex + 1 ), tolerance ) );
                // returnPoints.push( points[maxDistanceIndex] );
                returnPoints = returnPoints.concat( douglasPeucker( points.slice( maxDistanceIndex, points.length ), tolerance ) );
            } else {
                // ditching this point
                p = points[maxDistanceIndex];
                line.distanceToPoint( p, true );
                returnPoints = [points[0]];
            }
            return returnPoints;
        };
        res = douglasPeucker( points, tolerance );
        // always have to push the very last point on so it doesn't get left off
        res.push( points[points.length - 1 ] );
    }
    return res;
};
*/
