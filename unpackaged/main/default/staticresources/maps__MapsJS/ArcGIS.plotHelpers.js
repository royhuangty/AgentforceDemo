ArcGIS.plotHelpers = {
	plotWebMap: function(layerId, itemId, webMapURL, refreshParams) {
		
		var requestData = {
			ajaxResource: 'ArcGISAPI',
			securityToken: MASystem.MergeFields.Security_Token,
			action: 'requestItemData',
			accessToken: ArcGIS.tokenHelpers.getAccessToken(webMapURL),
			itemId: itemId
		};

		ArcGIS.ajaxRequest(requestData).then(function(response) {
			var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
			if (response.success) {
				if (getProperty(response, 'data.error')) {
                    window.VueEventBus.$emit('remove-layer', layerId);
					var message = getProperty(response, 'data.error.message') || '';
					if (message == 'You do not have permissions to access this resource or perform this operation.') {
						
						if (!ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
							var id = ArcGIS.getIdFromLayerId(layerId);
							ArcGIS.agolLogin(id, true, webMapURL);
						}
						else {
							ArcGIS.layerPlotting = false;
							MAToastMessages.showError({
								message: MASystem.Labels.AGISLB_Not_Authorized,
								timeOut: 3000,
								extendedTimeOut: 0
							});
						}
					}
					else {
						if (message == 'Item does not exist or is inaccessible.') {
							message = MASystem.Labels.AGISLB_Not_Authorized;
						}
						else if (!message) {
							message = MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
						}
						MAToastMessages.showError({
							message: message,
							timeOut: 3000,
							extendedTimeOut: 0
						});
						ArcGIS.layerPlotting = false;
					}
				}
				else {
					ArcGIS.layers[layerId] = {
						title: $layerHTML.data('name'),
						sublayers: {}
					};

					var allLayersData = getProperty(response, 'data', false) || {};
					ArcGIS.plotHelpers.plotAllLayers(layerId, allLayersData, webMapURL, refreshParams).then(function(response) {
						if (response.success) {

							$layerHTML.removeClass('loading');
							$layerHTML.find('.queryLoader').hide();
							$layerHTML.find('.arcGISQueryImage').show();

							var layerLegendText = response.layerLegend.length > 0 ? response.layerLegend.join('') : '';

							if (MA.isMobile) {
								ArcGIS.layers[layerId].legend = layerLegendText;
								$('#layersIndividualBody .legend-wrap').html(layerLegendText);
							}
							else {
								layerLegendText = layerLegendText == '' ? '' : '<table class="legend"><tbody>' + layerLegendText + '</tbody></table>';
								$layerHTML.append(layerLegendText);
							}

							var sublayers = ArcGIS.layers[layerId].sublayers;
							Object.keys(sublayers).forEach(function(sublayerId) {
								var sublayer = sublayers[sublayerId];
								if (sublayer.error) {
									var legendId = layerId + ArcGIS.fieldSeparator + sublayerId;
									$('#' + ArcGIS.plotHelpers.escapeElementId(legendId) + ' input').prop('checked', false);
								}
							});
						}
						else {
							window.VueEventBus.$emit('remove-layer', layerId);
							MAToastMessages.showError({
								message: response.error,
								timeOut: 3000,
								extendedTimeOut: 0
							});
						}
						ArcGIS.layerPlotting = false;
					});
				}
			}
			else {
				window.VueEventBus.$emit('remove-layer', layerId);
				var message;
				if (response.error == 'Memory error or time out.') {
					message = MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
				}
				else {
					message = MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin;
				}
				MAToastMessages.showError({
					message: message,
					timeOut: 3000,
					extendedTimeOut: 0
				});
				ArcGIS.layerPlotting = false;
			}
		});
	},
	plotWebMapLayers: function(layerId, sublayerIds, webMapURL, refreshParams, _doProxy) {
		
		var doProxy = _doProxy || false;
		var removeDuplicateLayers = true;
		var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
		ArcGIS.layers[layerId] = {
			title: $layerHTML.data('name'),
			sublayers: {}
		};
		if (removeDuplicateLayers) { sublayerIds = ArcGIS.removeDuplicates(sublayerIds); }
        var layerLegend = [];
		var layersCount = sublayerIds.length;

		sublayerIds.forEach(function(sublayerId, zIndex) {
			if (layersCount == 0) return false;

			var requestData = {
				ajaxResource: 'ArcGISAPI',
				securityToken:MASystem.MergeFields.Security_Token,
				action: 'get',
				doProxy: doProxy,
				requestURL: 'https://www.arcgis.com/sharing/rest/content/items/' + sublayerId + ArcGIS.tokenHelpers.createAccessTokenParameter(webMapURL, 1, 1) + 'f=json'
			};
			ArcGIS.ajaxRequest(requestData).then(function(response) {
				if (response.success) {
					if (getProperty(response, 'data.error')) {
						layersCount = 0;
						window.VueEventBus.$emit('remove-layer', layerId);
						var message = getProperty(response, 'data.error.message') || '';
						if (message == 'You do not have permissions to access this resource or perform this operation.') {
							
							if (!ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
								var id = ArcGIS.getIdFromLayerId(layerId);
								ArcGIS.agolLogin(id, true, webMapURL);
							}
							else {
								ArcGIS.layerPlotting = false;
								MAToastMessages.showError({
									message: MASystem.Labels.AGISLB_Not_Authorized,
									timeOut: 3000,
									extendedTimeOut: 0
								});
							}
						}
						else {
							if (message == 'Item does not exist or is inaccessible.') {
								message = MASystem.Labels.AGISLB_Not_Authorized;
							}
							else if (!message) {
								message = MASystem.Labels.Common_Refresh_And_Try_Again;
							}
							MAToastMessages.showError({
								message: message,
								timeOut: 3000,
								extendedTimeOut: 0
							});
							ArcGIS.layerPlotting = false;
						}
					}
					else {
						var layerData = getProperty(response, 'data');
						if (layerData.url) {
							if (!removeDuplicateLayers) layerData.id += ArcGIS.fieldSeparator + zIndex;
							layerData.layerType = ArcGIS.plotHelpers.guessLayerTypeFromURL(layerData.url);
							if (layerData.layerType) {
								ArcGIS.plotHelpers.plotLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
									ArcGIS.plotHelpers.createRefresher(response.layers, layerId, layerData, zIndex, webMapURL, refreshParams, doProxy);
									layerLegend[zIndex] = response.layerLegend;
									if (--layersCount == 0) {

										$layerHTML.removeClass('loading');
										$layerHTML.find('.queryLoader').hide();
										$layerHTML.find('.arcGISQueryImage').show();

										var layerLegendText = layerLegend.length > 0 ? layerLegend.join('') : '';

										if (MA.isMobile) {
											ArcGIS.layers[layerId].legend = layerLegendText;
											$('#layersIndividualBody .legend-wrap').html(layerLegendText);
										}
										else {
											layerLegendText = layerLegendText == '' ? '' : '<table class="legend"><tbody>' + layerLegendText + '</tbody></table>';
											$layerHTML.append(layerLegendText);
										}

										var sublayers = ArcGIS.layers[layerId].sublayers;
										Object.keys(sublayers).forEach(function(sublayerId) {
											var sublayer = sublayers[sublayerId];
											if (sublayer.error) {
												var legendId = layerId + ArcGIS.fieldSeparator + sublayerId;
												$('#' + ArcGIS.plotHelpers.escapeElementId(legendId) + ' input').prop('checked', false);
											}
										});
									}
									ArcGIS.layerPlotting = false;
								});
							}
							else {
								layersCount = 0;
								window.VueEventBus.$emit('remove-layer', layerId);
								MAToastMessages.showError({
									message: MASystem.Labels.Layers_ArcGIS_Layer_Not_Available_Ask_For_Help,
									timeOut: 3000,
									extendedTimeOut: 0
								});
								ArcGIS.layerPlotting = false;
							}
						}
						else {
							layersCount = 0;
							window.VueEventBus.$emit('remove-layer', layerId);
							MAToastMessages.showError({
								message: MASystem.Labels.Layers_ArcGIS_No_Layer_URL,
								timeOut: 3000,
								extendedTimeOut: 0
							});
							ArcGIS.layerPlotting = false;
						}
						
					}
				}
				else {
					layersCount = 0;
					window.VueEventBus.$emit('remove-layer', layerId);
					MAToastMessages.showError({
						message: response.error || MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin,
						timeOut: 3000,
						extendedTimeOut: 0
					});
					ArcGIS.layerPlotting = false;
				}
			});
		});
	},
	plotRESTLayer: function(layerId, url, refreshParams) {
		var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
		ArcGIS.layers[layerId] = {
			title: $layerHTML.data('name'),
			sublayers: {}
		};
		var serviceURL = removeTrailingSlashesFromURL(removeParametersFromURL(url));
		var layerData = {
			id: ArcGIS.plotHelpers.escapeFieldSeparator(serviceURL),
			url: serviceURL,
			layerType: ArcGIS.plotHelpers.guessLayerTypeFromURL(serviceURL)
		};
		if (layerData.layerType) {
			ArcGIS.plotHelpers.plotLayer(layerId, layerData, 0, serviceURL).then(function(response) {
				ArcGIS.plotHelpers.createRefresher(response.layers, layerId, layerData, 0, serviceURL, refreshParams);

				$layerHTML.removeClass('loading');
				$layerHTML.find('.queryLoader').hide();
				$layerHTML.find('.arcGISQueryImage').show();

				var layerLegendText = response.layerLegend ? response.layerLegend : '';

				if (MA.isMobile) {
					ArcGIS.layers[layerId].legend = layerLegendText;
					$('#layersIndividualBody .legend-wrap').html(layerLegendText);
				}
				else {
					layerLegendText = layerLegendText == '' ? '' : '<table class="legend"><tbody>' + layerLegendText + '</tbody></table>';
					$layerHTML.append(layerLegendText);
				}

				var sublayers = ArcGIS.layers[layerId].sublayers;
				Object.keys(sublayers).forEach(function(sublayerId) {
					var sublayer = sublayers[sublayerId];
					if (sublayer.error) {
						var legendId = layerId + ArcGIS.fieldSeparator + sublayerId;
						$('#' + ArcGIS.plotHelpers.escapeElementId(legendId) + ' input').prop('checked', false);
					}
				});
				// Fix for Bug W-15335478
				ArcGIS.layerPlotting = false;
			});
		}
		else {
			var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
			window.VueEventBus.$emit('remove-layer', layerId);
			MAToastMessages.showError({
				message: MASystem.Labels.AGISLB_Modal_ArcGIS_Validation_Unsupported,
				timeOut: 3000,
				extendedTimeOut: 0
			});
			// Fix for Bug W-15335478
			ArcGIS.layerPlotting = false;
		}
	},
    plotAllLayers: function(layerId, allLayersData, webMapURL, refreshParams) {
        var dfd = jQuery.Deferred();
		var layerLegend = [];
        ArcGIS.plotHelpers.plotBasemapLayers(layerId, allLayersData.baseMap, webMapURL, refreshParams).then(function(response) {
            layerLegend = layerLegend.concat(response.layerLegend);
			ArcGIS.plotHelpers.plotOperationalLayers(layerId, allLayersData.operationalLayers, webMapURL, refreshParams).then(function(response) {
                layerLegend = response.layerLegend.concat(layerLegend).filter(Boolean);
                //ArcGIS.reorderOperationalLayers(layerId, allLayersData.operationalLayers);
				if (layerLegend.length > 0) {
					dfd.resolve({
						success: true,
						layerLegend: layerLegend
					});
				}
				else {
					dfd.resolve({
						success: false,
						error: MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin
					});
				}
            });
        });
        return dfd.promise();
    },
    plotBasemapLayers: function(layerId, baseMap, webMapURL, refreshParams) {
        var dfd = jQuery.Deferred();
        var layerLegend = [];
        if (baseMap && baseMap.baseMapLayers && baseMap.baseMapLayers.length > 0) {
            var totalLayersCount = 0;
            baseMap.baseMapLayers.forEach(function(basemapLayer) {
				if (basemapLayer.visibility) {
					totalLayersCount++;
				}
			});
            var layersCount = totalLayersCount;

            baseMap.baseMapLayers.forEach(function(basemapLayer, zIndex) {
				if (basemapLayer.visibility) {
					ArcGIS.plotHelpers.plotLayer(layerId, basemapLayer, zIndex, webMapURL).then(function(response) {
						ArcGIS.plotHelpers.createRefresher(response.layers, layerId, basemapLayer, zIndex, webMapURL, refreshParams);
						layerLegend[baseMap.baseMapLayers.length - zIndex - 1] = response.layerLegend;
						if (--layersCount == 0) {
							dfd.resolve({
								success: true,
								layerLegend: layerLegend
							});
						}
					});
				}
            });
        }
        else {
            dfd.resolve({
                success: true,
                layerLegend: layerLegend
            });
        }
        return dfd.promise();
    },
    plotOperationalLayers: function(layerId, operationalLayers, webMapURL, refreshParams) {
        var dfd = jQuery.Deferred();
        var layerLegend = [];
        if (operationalLayers && operationalLayers.length > 0) {
			var totalLayersCount = 0;
			operationalLayers.forEach(function(operationalLayer) {
				if (operationalLayer.visibility) {
					totalLayersCount++;
				}
			});
			var layersCount = totalLayersCount;

            operationalLayers.forEach(function(operationalLayer, zIndex) {
				if (operationalLayer.visibility) {
					ArcGIS.plotHelpers.plotLayer(layerId, operationalLayer, zIndex, webMapURL).then(function(response) {
						ArcGIS.plotHelpers.createRefresher(response.layers, layerId, operationalLayer, zIndex, webMapURL, refreshParams);
						layerLegend[operationalLayers.length - zIndex - 1] = response.layerLegend;
						if (--layersCount == 0) {
							dfd.resolve({
								success: true,
								layerLegend: layerLegend
							});
						}
					});
				}
            });
        }
        else {
            dfd.resolve({
                success: true,
                layerLegend: layerLegend
            });
        }
        return dfd.promise();
    },
	createRefresher: function(layers, layerId, layerData, zIndex, webMapURL, refreshParams, _doProxy) {
		var doProxy = _doProxy || false;
		var refreshInterval = 0;
		if (refreshParams.automaticRefresh == 'UseLayerSetting') {
			if (layerData.refreshInterval) {
				refreshInterval = layerData.refreshInterval;
			}
		}
		else if (refreshParams.automaticRefresh == 'ForceRefresh') {
			if (refreshParams.interval > 0) {
				refreshInterval = refreshParams.interval;
			}
		}
		if (layers.length > 0 && layers[0]) {
			// Don't set timeout for each sub-sublayer because doing so will replot more & more sub-sublayers.
			// Just use the first sub-sublayer to replot all sub-sublayers.
			layers[0].refresh = function() {
				var errors = {};
				layers.forEach(function(layer) {
					errors[layer.sublayerId] = ArcGIS.layers[layerId].sublayers[layer.sublayerId].error;
				});
				ArcGIS.plotHelpers.plotLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
					ArcGIS.plotHelpers.createRefresher(response.layers, layerId, layerData, zIndex, webMapURL, refreshParams, doProxy);
					layers.forEach(function(layer) {
						layer.clear();
						var legendId = (layerId + ArcGIS.fieldSeparator + layer.sublayerId).replace(
							new RegExp(ArcGIS.fieldSeparator, 'g'), '\\' + ArcGIS.fieldSeparator).replace(
							/\//g, '\\/');
						var $legend = $('#' + legendId + ' input');
						var sublayer = ArcGIS.layers[layerId].sublayers[layer.sublayerId];
						if (errors[layer.sublayerId]) {
							if (!sublayer.error) {
								$legend.prop('checked', true);
								sublayer.show();
							}
						}
						else {
							if (sublayer.error) {
								$legend.prop('checked', false);
								sublayer.hide();
							}
						}
					});
				});
			};
			if (refreshInterval > 0) {
				layers[0].refresher = setTimeout(function() {
					layers[0].refresh();
				},
				refreshInterval * 60000);
			}
		}
	},
    reorderOperationalLayers: function(layerId, operationalLayers) {
		// XXX: This function is called after making all requests to plot operational and basemap layers, but not after actually plotting all layers.
		// ArcGIS.layers[layerId].sublayers may not have been fully populated at this point.
		// TODO: Use setTimeout?
        if (operationalLayers && operationalLayers.length > 0) {
			var reordered = false;
            operationalLayers.forEach(function(operationalLayer) {
                switch (operationalLayer.layerType) {
                    // These operational layer types are plotted as a basemap layer. We need to reorder these layers so that they come on top of true basemap layers.
                    case 'ArcGISImageServiceLayer':
                    case 'ArcGISImageServiceVectorLayer':
                    case 'ArcGISMapServiceLayer':
                    case 'ArcGISTiledImageServiceLayer':
                    case 'ArcGISTiledMapServiceLayer':
                    case 'VectorTileLayer':
                    case 'WebTiledLayer':
                    case 'WMS':
                        var sublayer = ArcGIS.layers[layerId].sublayers[operationalLayer.id];
                        if (sublayer) {
							sublayer.order = undefined;
							sublayer.hide();
							sublayer.show();
							reordered = true;
                        }
                        break;
                }
            });
			if (reordered) {
				ArcGIS.plotHelpers.indexAllBasemapLayers();
			}
        }
	},
	indexAllBasemapLayers: function() {
		for (var i = 0; i < MA.map.overlayMapTypes.length; i++) {
			var basemap = MA.map.overlayMapTypes.getAt(i);
			if (basemap.layerId && basemap.sublayerId) {
				var sublayer = ArcGIS.layers[basemap.layerId].sublayers[basemap.sublayerId];
				if (sublayer) {
					sublayer.order = i;
				}
			}
		}
	},
	createSublayer: function(options) {
		// === Common Fields ===
		// setVisible
		// clear
		// class
		// show
		// hide
		// url
		// layerId
		// sublayerId
		// layerData
		// type
		// title
		// zIndex
		// copyrightText
		// timestamp
		//
		// === ArcGISFeatureLayer Fields ===
		// drawingInfo
		// fields
		// spatialReference

		var layer;
		if (ArcGIS.layers[options.layerId]) {
			switch (options.class) {
				case 'placeholder':
					layer = {
						setVisible: function(visible) {
							layer.visible = visible;
						},
						clear: function() {
							layer.hide();
						}
					};
					break;
				case 'google.maps.Data':
					layer = new google.maps.Data();
					$.extend(layer, {
						setVisible: function(visible) {
							layer.visible = visible;
							layer.setMap(visible ? MA.map : null);
							if (visible) {
								ArcGIS.plotHelpers.labelFeatures(layer);
							}
							else {
								ArcGIS.plotHelpers.unlabelFeatures(layer);
							}
							ArcGIS.plotHelpers.showCopyrightText();
						},
						clear: function() {
							layer.hide();
							layer.forEach(function(feature) {
								if (feature.labelMarker) {
									feature.labelMarker.setMap(null);
									feature.labelMarker = null;
								}
								layer.remove(feature);
							});
						}
					});
					if (options.drawingInfo) {
						$.extend(layer, {
							drawingInfo: options.drawingInfo
						});
					}
					if (options.fields) {
						$.extend(layer, {
							fields: options.fields
						});
					}
					if (options.spatialReference) {
						$.extend(layer, {
							spatialReference: options.spatialReference
						});
					}
					layer.addListener('click', function(event) {
						ArcGIS.featureLayerHelpers.onClickFeature(event, options.layerData);
					});
					layer.addListener('rightclick', function(event) {
						ArcGIS.featureLayerHelpers.onRightClickFeature(event, options.layerData);
					});
					break;
				case 'google.maps.ImageMapType':
					layer = new google.maps.ImageMapType({
						name: options.name,
						opacity: options.opacity,
						maxZoom: options.maxZoom,
						tileSize: options.tileSize,
						getTileUrl: options.getTileUrl
					});
					$.extend(layer, {
						setVisible: function(visible) {
							layer.visible = visible;
							if (visible) {
								if (layer.order >= 0) {
									MA.map.overlayMapTypes.insertAt(layer.order, layer);
								}
								else {
									MA.map.overlayMapTypes.push(layer);
								}
							}
							else {
								// Find the layer to remove backward because a new
								// layer instance with the same name may have been
								// inserted at the same index effectively pushing
								// back the old one we want to remove.
								for (var i = MA.map.overlayMapTypes.length - 1; i >= 0; i--) {
									var basemap = MA.map.overlayMapTypes.getAt(i);
									if (basemap.layerId == layer.layerId && basemap.sublayerId == layer.sublayerId) {
										MA.map.overlayMapTypes.removeAt(i);
										break;
									}
								}
							}
							ArcGIS.plotHelpers.indexAllBasemapLayers();
							ArcGIS.plotHelpers.showCopyrightText();
						},
						clear: function() {
							layer.hide();
						},
					});
					break;
				case 'geoXML3.parser':
					layer = new geoXML3.parser({
						map: MA.map,
						forceType: options.type,
						processStyles: true,
						singleInfoWindow: true,
						afterParse: function () {
						},
						failedParse: function () {
						}
					});
					$.extend(layer, {
						setVisible: function(visible) {
							// XXX: If this is first time showing this layer, don't
							// showDocument() because parse() already showed the
							// layer. Calling showDocument() after parse() causes a
							// "doc is undefined" error and the layer won't finish
							// loading.
							if (layer.visible || !visible) {
								if (visible) {
									layer.showDocument();
								}
								else {
									layer.hideDocument();
								}
							}
							layer.visible = visible;
							ArcGIS.plotHelpers.showCopyrightText();
						},
						clear: function() {
							layer.hide();
						},
					});
					options.type = 'KML';
					layer.parse(options.url);
					break;
				case 'ProjectedOverlay':
					layer = new ProjectedOverlay(MA.map, options.url, options.bounds, {
						percentOpacity: 100
					});
					$.extend(layer, {
						setVisible: function(visible) {
							layer.visible = visible;
							layer.setMap(visible ? MA.map : null);
							ArcGIS.plotHelpers.showCopyrightText();
						},
						clear: function() {
							layer.hide();
						},
					});
					break;
				default:
					return layer;
			}
			$.extend(layer, {
				class: options.class,
				show: function() {
					layer.setVisible(true);
				},
				hide: function() {
					MA.Map.InfoBubble.hide();
					layer.setVisible(false);
				},
				url: options.url,
				layerId: options.layerId,
				sublayerId: options.sublayerId,
				layerData: options.layerData,
				type: options.type,
				title: options.title,
				zIndex: options.zIndex,
				copyrightText: options.copyrightText,
				timestamp: new Date().getTime(),
			});
			var oldlayer = ArcGIS.layers[options.layerId].sublayers[options.sublayerId];
			if (oldlayer) {
				if (oldlayer.order >= 0) {
					layer.order = oldlayer.order;
				}
				layer.setVisible(oldlayer.visible);
			}
			else {
				layer.show();
			}
			ArcGIS.layers[options.layerId].sublayers[options.sublayerId] = layer;
		}
		return layer;
	},
    plotLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
		var doProxy = _doProxy || false;
		// layerData = {
		//	layerType:
		// }
        var dfd = jQuery.Deferred();
        // TODO
        // https://developers.arcgis.com/web-map-specification/objects/baseMapLayer/
        // https://developers.arcgis.com/web-map-specification/objects/operationalLayers/
        switch (layerData.layerType) {
            /*
            case 'BingMapsAerial':
                // basemap layer
                break;
            case 'BingMapsRoad':
                // basemap layer
                break;
            case 'BingMapsHybrid':
                // basemap layer
                break;
			*/
            case 'ArcGISImageServiceLayer':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotArcGISImageServiceLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
			/*
            case 'ArcGISImageServiceVectorLayer':
                // operational layer
                // basemap layer
                break;
			*/
            case 'ArcGISMapServiceLayer':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotArcGISMapServiceLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
			/*
            case 'OpenStreetMap':
                // basemap layer
                break;
			*/
            case 'ArcGISTiledImageServiceLayer':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotArcGISTiledImageServiceLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            case 'ArcGISTiledMapServiceLayer':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotArcGISTiledMapServiceLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
			/*
            case 'VectorTileLayer':
                // operational layer
                // basemap layer
                break;
			*/
            case 'WebTiledLayer':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotWebTiledLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            case 'WMS':
                // operational layer
                // basemap layer
                ArcGIS.plotHelpers.plotWMS(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
			/*
            case 'CSV':
                // operational layer
                ArcGIS.plotHelpers.plotCSV(layerId, layerData, zIndex, webMapURL).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            */
            case 'ArcGISFeatureLayer':
                // operational layer
                ArcGIS.plotHelpers.plotArcGISFeatureLayer(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            /*
            case 'GeoRSS':
                // operational layer
                break;
            */
            case 'KML':
                // operational layer
                ArcGIS.plotHelpers.plotKML(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            /*
            case 'ArcGISStreamLayer':
                // operational layer
                break;
            */
            case 'WFS':
                // operational layer
                ArcGIS.plotHelpers.plotWFS(layerId, layerData, zIndex, webMapURL, doProxy).then(function(response) {
                    dfd.resolve(response);
                });
                break;
            default:
                dfd.resolve({
                    success: false,
                    layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
						layerId: layerId,
						layerData: layerData,
						error: layerData.layerType + ': Unsupported layer type'
					})
                });
                break;
        }
        return dfd.promise();
    },
    plotArcGISImageServiceLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
        // operational layer
        // basemap layer

		var doProxy = _doProxy || false;
        var dfd = jQuery.Deferred();

		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: layerData.layerType,
			title: layerTitle,
			zIndex: zIndex
		};

        var imageLayerURL = ArcGIS.secureURL(layerData.url);
        ArcGIS.serverRequest(layerId, imageLayerURL, webMapURL, doProxy).then(function(response) {
			if (response.success) {
				if (layerData.itemId) {
					var requestData = {
						ajaxResource: 'ArcGISAPI',
						securityToken: MASystem.MergeFields.Security_Token,
						action: 'requestItemData',
						accessToken: ArcGIS.tokenHelpers.getAccessToken(webMapURL),
						itemId: layerData.itemId
					};
					ArcGIS.ajaxRequest(requestData).then(function(response) {
						var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
						if (response.success) {
							if (getProperty(response, 'data.error')) {
								var message = getProperty(response, 'data.error.message') || '';
								if (message == 'You do not have permissions to access this resource or perform this operation.') {
									var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
									window.VueEventBus.$emit('remove-layer', layerId);
									if (!ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
										var id = ArcGIS.getIdFromLayerId(layerId);
										ArcGIS.agolLogin(id, true, webMapURL);
									}
									else {
										MAToastMessages.showError({
											message: MASystem.Labels.AGISLB_Not_Authorized,
											timeOut: 3000,
											extendedTimeOut: 0
										});
									}
									var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);
									dfd.resolve({
										success: false,
										layers: [layer],
										layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
											layerId: layerId,
											layerData: layerData,
											error: MASystem.Labels.AGISLB_Not_Authorized
										})
									});
								}
								else if (message == 'Empty response') {
									var bounds = MA.map.getBounds().toJSON();
									var imageJsonURL = imageLayerURL + '/exportImage' +
										ArcGIS.tokenHelpers.createAccessTokenParameter(imageLayerURL, 1, 1) +
										'f=json&format=jpgpng&bboxSR=4326' +
										'&bbox=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north +
										'&size=' + $(MA.map.getDiv()).width() + ',' + $(MA.map.getDiv()).height();
									ArcGIS.plotHelpers.plotImageLayer(layerId, layerData, zIndex, imageLayerURL, imageJsonURL, doProxy).then(function(response) {
										dfd.resolve(response);
									});
								}
							}
							else {
								var layerItemData = getProperty(response, 'data', false) || {};
								var renderingRule = layerItemData.renderingRule;

								var bounds = MA.map.getBounds().toJSON();
								var imageJsonURL = imageLayerURL + '/exportImage' +
									ArcGIS.tokenHelpers.createAccessTokenParameter(imageLayerURL, 1, 1) +
									'f=json&format=jpgpng&bboxSR=4326' +
									'&bbox=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north +
									'&size=' + $(MA.map.getDiv()).width() + ',' + $(MA.map.getDiv()).height() +
									(renderingRule ? '&renderingRule=' + encodeURIComponent(JSON.stringify(renderingRule)) : '');
								ArcGIS.plotHelpers.plotImageLayer(layerId, layerData, zIndex, imageLayerURL, imageJsonURL, doProxy).then(function(response) {
									dfd.resolve(response);
								});
							}
						}
						else {
							var error;
							if (getProperty(response, 'message', false)) {
								error = response.message;
							}
							else {
								error = 'No layer found';
							}
							var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);
							dfd.resolve({
								success: false,
								layers: [layer],
								layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
									layerId: layerId,
									layerData: layerData,
									error: error
								})
							});
						}
					});
				}
				else {
					var bounds = MA.map.getBounds().toJSON();
					var imageJsonURL = imageLayerURL + '/exportImage' +
						ArcGIS.tokenHelpers.createAccessTokenParameter(imageLayerURL, 1, 1) +
						'f=json&format=jpgpng&bboxSR=4326' +
						'&bbox=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north +
						'&size=' + $(MA.map.getDiv()).width() + ',' + $(MA.map.getDiv()).height();
					ArcGIS.plotHelpers.plotImageLayer(layerId, layerData, zIndex, imageLayerURL, imageJsonURL, doProxy).then(function(response) {
						dfd.resolve(response);
					});
				}
			}
			else {
				var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

				if (response.error.indexOf('Unauthorized endpoint') > -1) {
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
							layerId: layerId,
							layerData: layerData,
							requestURL: imageLayerURL
						})
					});
				}
				else if (response.error != MASystem.Labels.AGISLB_Login_Pending) {
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData,
							error: response.error || 'Failed to retrieve layer.'
						})
					});
				}
			}
        });
        return dfd.promise();
    },
    plotArcGISMapServiceLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
		var doProxy = _doProxy || false;
        // operational layer
        // basemap layer

        var dfd = jQuery.Deferred();

		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: layerData.layerType,
			title: layerTitle,
			zIndex: zIndex
		};

        var mapLayerURL = ArcGIS.secureURL(layerData.url);
        ArcGIS.serverRequest(layerId, mapLayerURL, webMapURL, doProxy).then(function(response) {
			if (response.success) {
				var bounds = MA.map.getBounds().toJSON();
				var imageJsonURL = mapLayerURL + '/export' +
					ArcGIS.tokenHelpers.createAccessTokenParameter(mapLayerURL, 1, 1) +
					'f=json&format=png24&transparent=true&bboxSR=4326' +
					'&bbox=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north +
					'&size=' + $(MA.map.getDiv()).width() + ',' + $(MA.map.getDiv()).height();

				ArcGIS.plotHelpers.plotImageLayer(layerId, layerData, zIndex, mapLayerURL, imageJsonURL, doProxy).then(function(response) {
					dfd.resolve(response);
				});
			}
			else {
				var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

				if (response.error.indexOf('Unauthorized endpoint') > -1) {
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
							layerId: layerId,
							layerData: layerData,
							requestURL: mapLayerURL
						})
					});
				}
				else if (response.error != MASystem.Labels.AGISLB_Login_Pending) {
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData,
							error: response.error || 'Failed to retrieve layer.'
						})
					});
				}
			}
        });
        return dfd.promise();
    },
    plotArcGISTiledImageServiceLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
        // operational layer
        // basemap layer

		var dfd = jQuery.Deferred();
		var doProxy = _doProxy || false;

		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
            type: 'ArcGISTiledImageServiceLayer',
			title: layerTitle,
			zIndex: zIndex
		};

        if (layerData.url) {
			var requestData = {
				ajaxResource: 'ArcGISAPI',
				securityToken:MASystem.MergeFields.Security_Token,
				action: 'get',
				doProxy: doProxy,
				requestURL: layerData.url + '?f=json'
			};
			ArcGIS.ajaxRequest(requestData).then(function(response) {
				var copyrightText = undefined;
                if (response.success) {
                    var responseData = getProperty(response, 'data', false) || {};
                    copyrightText = getProperty(responseData, 'copyrightText');

					var layer = ArcGIS.plotHelpers.plotTiledMapLayer(layerId, layerData, zIndex, copyrightText, layerData.url);
					dfd.resolve({
						success: true,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData
						})
					});
				}
				else {
					var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData,
							error: response.error || MASystem.Label.Common_Refresh_And_Try_Again_Contact_Admin
						})
					});
				}
			});
        }
        else {
            dfd.resolve({
                success: false,
                layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
					layerId: layerId,
					layerData: layerData,
					error: 'No layer URL found'
				})
            });
        }
        return dfd.promise();
    },
    plotArcGISTiledMapServiceLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
        // operational layer
        // basemap layer

        return ArcGIS.plotHelpers.plotArcGISTiledImageServiceLayer(layerId, layerData, zIndex, webMapURL, _doProxy);
    },
    plotWebTiledLayer: function(layerId, layerData, zIndex, webMapURL) {
        // operational layer
        // basemap layer

        var dfd = jQuery.Deferred();
        var templateURL = ArcGIS.secureURL(layerData.templateUrl);
        var layer = ArcGIS.plotHelpers.plotTiledMapLayer(layerId, layerData, zIndex, layerData.copyright, undefined, function(coord, zoom) {
            var tileURL = templateURL.replace('{level}', zoom).replace('{col}', coord.x).replace('{row}', coord.y);
            if (tileURL.indexOf('{subDomain}') > -1) {
                var subdomains = layerData.subDomains;
                var subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
                tileURL = tileURL.replace('{subDomain}', subdomain);
            }
            return tileURL;
        });
        dfd.resolve({
            success: true,
			layers: [layer],
            layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
				layerId: layerId,
				layerData: layerData
			})
        });
        return dfd.promise();
    },
    plotWMS: function(layerId, layerData, zIndex, webMapURL) {
        // operational layer
        // basemap layer

        var dfd = jQuery.Deferred();
        var proj = MA.map.getProjection();
        var mapURL = ArcGIS.secureURL(layerData.mapUrl);
        var layer = ArcGIS.plotHelpers.plotTiledMapLayer(layerId, layerData, zIndex, layerData.copyright, undefined, function(coord, zoom) {
            // http://www.sumbera.com/lab/GoogleV3/tiledWMSoverlayGoogleV3.htm
            var zFactor = Math.pow(2, zoom);
            var top = proj.fromPointToLatLng(new google.maps.Point(coord.x * 256 / zFactor, coord.y * 256 / zFactor));
            var bottom = proj.fromPointToLatLng(new google.maps.Point((coord.x + 1) * 256 / zFactor, (coord.y + 1) * 256 / zFactor));
            // http://docs.geoserver.org/latest/en/user/maps/wms/basics.html#axis-ordering
            var bbox = bottom.lat() + ',' + top.lng() + ',' + top.lat() + ',' + bottom.lng();
            var tileURL = mapURL +
                '?service=WMS' +
                '&request=GetMap' +
                '&format=image/png' +
                '&transparent=true' +
                '&version=' + layerData.version +
                '&layers=' + layerData.visibleLayers.join() +
                '&width=256' +
                '&height=256' +
                '&crs=EPSG:4326' +
                '&bbox=' + bbox;
            return tileURL;
        });
        dfd.resolve({
            success: true,
			layers: [layer],
            layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
				layerId: layerId,
				layerData: layerData
			})
        });
        return dfd.promise();
    },
    plotCSV: function(layerId, layerData, zIndex, webMapURL) {
        // operational layer

        var dfd = jQuery.Deferred();
        var csvURL = ArcGIS.secureURL(layerData.url);
        var layer = ArcGIS.plotHelpers.createSublayer({
			class: 'google.maps.Data',
			url: csvURL,
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: 'CSV',
			title: ArcGIS.layerLegendHelpers.getSublayerTitle(layerData),
			zIndex: zIndex,
			copyrightText: layerData.copyrightText, // XXX: Not defined in https://developers.arcgis.com/web-map-specification/objects/csvLayer/
		});

        // TODO

        return dfd.promise();
    },
    plotArcGISFeatureLayer: function(layerId, layerData, zIndex, webMapURL, _doProxy) {
		// layerData = {
		//	url:
		//	id:
		// }
		//
		// layerData = {
		//	featureCollection:
		//	id:
		// }
		//
		// layerData = {
		//	itemId:
		// }

        // operational layer

		var dfd = jQuery.Deferred();
		var doProxy = _doProxy || false;

		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: 'ArcGISFeatureLayer',
			title: layerTitle,
			zIndex: zIndex
		};

        if (layerData.url) {
			var featureLayerURL = ArcGIS.secureURL(layerData.url);

            ArcGIS.serverRequest(layerId, featureLayerURL, webMapURL, doProxy).then(function(response) {
                if (response.success) {
					ArcGIS.plotHelpers.retrieveLayerInfo(featureLayerURL, doProxy).then(function(response) {
						if (response.success) {
							var layerInfo = response.layerInfo;
							if (!layerData.title) {
								layerData.title = layerTitle = layerInfo.title || layerInfo.name;
							}
							if (layerInfo.layers) {
								var layerLegend = [];
								var layers = [];
								var totalLayersCount = layersCount = layerInfo.layers.length;

								layerInfo.layers.forEach(function(sublayer, index) {
									var sublayerURL = featureLayerURL + '/' + sublayer.id;
									var sublayerData = {
										id: ArcGIS.plotHelpers.escapeFieldSeparator(sublayerURL),
										url: sublayerURL,
										layerType: layerData.layerType,
										title: sublayer.name
									};
									ArcGIS.plotHelpers.plotArcGISFeatureLayer(layerId, sublayerData, index, webMapURL, doProxy).then(function(response) {
										layers = layers.concat(response.layers);
										layerLegend[totalLayersCount - index - 1] = response.layerLegend;
										if (--layersCount == 0) {
											dfd.resolve({
												success: true,
												layers: layers,
												layerLegend: layerLegend.join('')
											});
										}
									});
								});
							}
							else {
								var where = null;
								if (layerData.layerDefinition && layerData.layerDefinition.definitionExpression) {
									where = layerData.layerDefinition.definitionExpression;
								}
								else {
									where = '1=1';
								}

								var bounds = MA.map.getBounds().toJSON();
								var query = ArcGIS.tokenHelpers.createAccessTokenParameter(featureLayerURL, -1, -1) +
									'where=' + encodeURIComponent(where) +
									'&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope' +
									'&geometry=' + bounds.west + ',' + bounds.south + ',' + bounds.east + ',' + bounds.north;
								var pagination = layerInfo.advancedQueryCapabilities && layerInfo.advancedQueryCapabilities.supportsPagination;

								ArcGIS.plotHelpers.retrieveFeatures(featureLayerURL, query, layerData, layerId, pagination, doProxy).then(function(response) {
									if (response.success) {
										var featureCollection = response.featureCollection;
										var opacity = layerData.opacity;
										var drawingInfo;

										if (layerData.layerDefinition && layerData.layerDefinition.drawingInfo) {
											drawingInfo = layerData.layerDefinition.drawingInfo;
										}
										else {
											drawingInfo = layerInfo.drawingInfo;
										}

										var layer = ArcGIS.plotHelpers.createSublayer({
											class: 'google.maps.Data',
											url: featureLayerURL + '/query?f=json&' + query,
											layerId: layerId,
											sublayerId: layerData.id,
											layerData: layerData,
											type: 'ArcGISFeatureLayer',
											title: layerTitle,
											zIndex: zIndex,
											copyrightText: layerInfo.copyrightText,

											drawingInfo: drawingInfo,
											fields: layerInfo.fields,
											spatialReference: layerInfo.extent.spatialReference
										});

										var style = ArcGIS.styleHelpers.createStyleFromEsriDrawingInfo(drawingInfo, opacity, zIndex);
										ArcGIS.plotHelpers.populateFeatureLayer(layer, layerId, featureCollection, style.map);

										dfd.resolve({
											success: true,
											layers: [layer],
											layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
												layerId: layerId,
												layerData: layerData,
												style: style.legend
											})
										});
									}
									else {
										var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

										if (response.removed) {
											dfd.resolve({
												success: false,
												layers: [],
												layerLegend: ''
											});
										}
										else if (response.error.indexOf('Unauthorized endpoint') > -1) {
											dfd.resolve({
												success: false,
												layers: [layer],
												layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
													layerId: layerId,
													layerData: layerData,
													requestURL: featureLayerURL
												})
											});
										}
										else {
											dfd.resolve({
												success: false,
												layers: [layer],
												layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
													layerId: layerId,
													layerData: layerData,
													error: response.error || 'Failed to retrieve layer.'
												})
											});
										}
									}
								});
							}
						}
						else {
							var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

							if (response.error.indexOf('Unauthorized endpoint') > -1) {
								dfd.resolve({
									success: false,
									layers: [layer],
									layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
										layerId: layerId,
										layerData: layerData,
										requestURL: featureLayerURL
									})
								});
							}
							else {
								dfd.resolve({
									success: false,
									layers: [layer],
									layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
										layerId: layerId,
										layerData: layerData,
										error: response.error || 'Failed to retrieve layer.'
									})
								});
							}
						}
					});
				}
				else {
					var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

					if (response.error.indexOf('Unauthorized endpoint') > -1) {
						dfd.resolve({
							success: false,
							layers: [layer],
							layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
								layerId: layerId,
								layerData: layerData,
								requestURL: featureLayerURL
							})
						});
					}
					else if (response.error != MASystem.Labels.AGISLB_Login_Pending) {
						dfd.resolve({
							success: false,
							layers: [layer],
							layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
								layerId: layerId,
								layerData: layerData,
								error: response.error || 'Failed to retrieve layer.'
							})
						});
					}
				}
			});
        }
        else if (layerData.featureCollection) {
            ArcGIS.plotHelpers.plotFeatureCollectionJson(layerId, layerData, layerData.featureCollection, zIndex, webMapURL).then(function(response) {
                dfd.resolve(response);
            });
        }
        else if (layerData.itemId) {
            var requestData = {
                ajaxResource: 'ArcGISAPI',
                securityToken: MASystem.MergeFields.Security_Token,
                action: 'requestItemData',
                accessToken: ArcGIS.tokenHelpers.getAccessToken(webMapURL),
                itemId: layerData.itemId
            };
            ArcGIS.ajaxRequest(requestData).then(function(response) {
                if (response.success) {
                    if (getProperty(response, 'data.error')) {
						var message = getProperty(response, 'data.error.message') || '';
						if (message == 'You do not have permissions to access this resource or perform this operation.') {
							var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
							window.VueEventBus.$emit('remove-layer', layerId);
							if (!ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
								var id = ArcGIS.getIdFromLayerId(layerId);
								ArcGIS.agolLogin(id, true, webMapURL);
							}
							else {
								MAToastMessages.showError({
									message: MASystem.Labels.AGISLB_Not_Authorized,
									timeOut: 3000,
									extendedTimeOut: 0
								});
							}
						}
                    }
                    else {
                        var featureCollection = getProperty(response, 'data', false) || {};
                        ArcGIS.plotHelpers.plotFeatureCollectionJson(layerId, layerData, featureCollection, zIndex, webMapURL).then(function(response) {
                            dfd.resolve(response);
                        });
                    }
                }
				else {
					var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

					if ((getProperty(response, 'error', false) || '').indexOf('Unauthorized endpoint') > -1) {
						dfd.resolve({
							success: false,
							layers: [layer],
							layerLegend: ArcGIS.layerLegendHelpers.createUnauthorizedLayerLegend({
								layerId: layerId,
								layerData: layerData,
								requestURL: requestData.requestURL
							})
						});
					}
					else {
						dfd.resolve({
							success: false,
							layers: [layer],
							layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
								layerId: layerId,
								layerData: layerData,
								error: MASystem.Labels.Common_Refresh_And_Try_Again
							})
						});
					}
				}
            });
        }
        return dfd.promise();
    },
    plotKML: function(layerId, layerData, zIndex, webMapURL) {
        // operational layer

        // https://developers.google.com/maps/documentation/javascript/kmllayer
        var dfd = jQuery.Deferred();
        var requestURL = layerData.url + ArcGIS.tokenHelpers.createAccessTokenParameter(layerData.url, 1, 0);

        new ZipFile(requestURL, function(zip) {
            // Set the file type to KML if we failed to unzip the requested URL.
            var type = zip.status.length > 0 ? 'KML' : 'KMZ';
			var layer = ArcGIS.plotHelpers.createSublayer({
				class: 'geoXML3.parser',
				layerId: layerId,
				sublayerId: layerData.id,
				layerData: layerData,
				type: type,
				title: ArcGIS.layerLegendHelpers.getSublayerTitle(layerData),
				zIndex: zIndex,
				copyrightText: layerData.copyrightText, // XXX: Not defined in https://developers.arcgis.com/web-map-specification/objects/kmlLayer/
				url: requestURL,
			});
			dfd.resolve({
				success: true,
				layers: [layer],
				layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
					layerId: layerId,
					layerData: layerData
				})
			});
        });
        return dfd.promise();
    },
    plotWFS: function(layerId, layerData, zIndex, webMapURL) {
        // operational layer
        var dfd = jQuery.Deferred();

		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: 'WFS',
			title: layerTitle,
			zIndex: zIndex
		};

        if (layerData.wfsInfo && layerData.wfsInfo.featureUrl) {
            // https://developers.arcgis.com/web-map-specification/objects/wfsLayer/
            // http://docs.geoserver.org/latest/en/user/maps/wfs/reference.html
			var requestURL = layerData.wfsInfo.featureUrl +
                    '?service=WFS' +
                    '&version=' + layerData.wfsInfo.version +
                    '&request=GetFeature' +
                    '&typeNames=' + layerData.wfsInfo.name +
                    '&outputFormat=json';
            var requestData = {
                ajaxResource: 'ArcGISAPI',
                securityToken: MASystem.MergeFields.Security_Token,
                action: 'get',
                requestURL: requestURL
            };
            ArcGIS.ajaxRequest(requestData).then(function(response) {
                if (response.success) {
					var layer = ArcGIS.plotHelpers.createSublayer({
						class: 'google.maps.Data',
						url: requestURL,
						layerId: layerId,
						sublayerId: layerData.id,
						layerData: layerData,
						type: 'WFS',
						title: layerTitle,
						zIndex: zIndex,
						copyrightText: layerData.copyrightText, // XXX: Not defined in https://developers.arcgis.com/web-map-specification/objects/wfsLayer/
					});

                    var featureCollection = getProperty(response, 'data', false) || [];
                    var drawingInfo = layerData.layerDefinition.drawingInfo;
                    var opacity = layerData.opacity;

					var style = ArcGIS.styleHelpers.createStyleFromEsriDrawingInfo(drawingInfo, opacity, zIndex);
                    ArcGIS.plotHelpers.populateFeatureLayer(layer, layerId, featureCollection, style.map);

                    dfd.resolve({
                        success: true,
						layers: [layer],
                        layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData
						})
                    });
                }
				else {
					var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData,
							error: response.error || MASystem.Label.Common_Refresh_And_Try_Again_Contact_Admin
						})
					});
				}
            });
        }
        else {
			var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

            dfd.resolve({
                success: false,
				layers: [layer],
                layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
					layerId: layerId,
					layerData: layerData,
					error: 'No layer URL found'
				})
            });
        }
        return dfd.promise();
    },
	showCopyrightText: function() {
		var layerTitles = [];
		var copyrightText = [];
		for (var i = 0; i < MA.map.overlayMapTypes.length; i++) {
			var basemap = MA.map.overlayMapTypes.getAt(i);
			if (basemap.layerId && basemap.sublayerId) {
				if (basemap.class != 'placeholder' && basemap.copyrightText) {
					layerTitles.push(basemap.title);
					copyrightText.push(basemap.copyrightText);
				}
			}
		}
		Object.keys(ArcGIS.layers).forEach(function(layerId) {
			Object.keys(ArcGIS.layers[layerId].sublayers).forEach(function(sublayerId) {
				var sublayer = ArcGIS.layers[layerId].sublayers[sublayerId];
				if (sublayer.class != 'placeholder' && sublayer.copyrightText && sublayer.getMap && sublayer.getMap()) {
					layerTitles.push(sublayer.title);
					copyrightText.push(sublayer.copyrightText);
				}
			});
		});

		VueEventBus.$emit('get-attribution-element', function(el) {
			el.innerText = ArcGIS.baseEsriAttribution;
			copyrightText.forEach(function(text) {
				el.innerText += ' | ' + text;
			});
		});
	},
	guessLayerTypeFromURL: function(url) {
		var serviceURL = removeTrailingSlashesFromURL(removeParametersFromURL(url));
		var serverType= serviceURL.replace(/^.*\/([^\/]+Server)(?:\/[0-9]+)?$/, '$1');
		var layerType;
		switch (serverType) {
			case 'ImageServer':
				layerType = 'ArcGISImageServiceLayer';
				break;
			case 'MapServer':
				layerType = 'ArcGISMapServiceLayer';
				break;
			case 'FeatureServer':
				layerType = 'ArcGISFeatureLayer';
				break;
		}
		return layerType;
	},
	retrieveLayerInfo: function(layerURL, _doProxy) {
		// Access token should be available by the time this function gets called.
		var dfd = jQuery.Deferred();
		var doProxy = _doProxy || false;
		var requestData = {
			ajaxResource: 'ArcGISAPI',
			securityToken:MASystem.MergeFields.Security_Token,
			action: 'get',
			doProxy: doProxy,
			requestURL: layerURL + ArcGIS.tokenHelpers.createAccessTokenParameter(layerURL, 1, 1) + 'f=json'
		};
		try {
			ArcGIS.ajaxRequest(requestData).then(function(response) {
				if (response.success) {
					dfd.resolve({
						success: true,
						layerInfo: getProperty(response, 'data', false) || {}
					});
				}
				else {
					dfd.resolve({
						success: false,
						error: getProperty(response, 'error', false) || {}
					});
				}
			});
		}
		catch(ex) {
			dfd.resolve({
				success: false,
				error: ex
			})
		}
		return dfd.promise();
	},
	plotImageLayer: function(layerId, layerData, zIndex, imageLayerURL, imageJsonURL, _doProxy) {

		var doProxy = _doProxy || false;
		var dfd = jQuery.Deferred();
		var layerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(layerData);
		var placeholderLayerOptions = {
			class: 'placeholder',
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: layerData.layerType,
			title: layerTitle,
			zIndex: zIndex
		};

		var requestURL = imageLayerURL + ArcGIS.tokenHelpers.createAccessTokenParameter(imageLayerURL, 1, 1) + 'f=json';
		var requestData = {
			ajaxResource: 'ArcGISAPI',
			securityToken: MASystem.MergeFields.Security_Token,
			action: 'get',
			doProxy: doProxy,
			requestURL: requestURL
		};
		ArcGIS.ajaxRequest(requestData).then(function(response) {
			if (response.success) {
				var responseData = getProperty(response, 'data', false) || {};
				if (!layerData.title) {
					layerData.title =
						getProperty(responseData, 'name')
						|| getProperty(responseData, 'documentInfo.Title')
						|| undefined;
				}
				if (responseData.singleFusedMapCache) {
					var layer;
					if (responseData.tileServers) {
						layer = ArcGIS.plotHelpers.plotTiledMapLayer(layerId, layerData, zIndex, responseData.copyrightText, undefined, function(coord, zoom) {
							var tileServers = responseData.tileServers;
							var tileServer = tileServers[Math.floor(Math.random() * tileServers.length)];
							var tileURL = tileServer + '/tile/' + zoom + '/' + coord.y + '/' + coord.x;
							return tileURL;
						});
					}
					else {
						layer = ArcGIS.plotHelpers.plotTiledMapLayer(layerId, layerData, zIndex, responseData.copyrightText, imageLayerURL);
					}
					dfd.resolve({
						success: true,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData
						})
					});
				}
				else {
					var copyrightText = responseData.copyrightText;
					// XXX: Let's use 3857 for now because it works better for layers in EPSG:28992.
					/*
					var spatialReference = getProperty(responseData, 'spatialReference') || getProperty(responseData, 'extent.spatialReference') || null;
					var imageSR = ArcGIS.projectionHelpers.getProjection(spatialReference);
					imageSR = imageSR ? imageSR.replace('EPSG:', '') : 3857;
					*/
					var imageSR = 3857;
					var requestData = {
						ajaxResource: 'ArcGISAPI',
						securityToken: MASystem.MergeFields.Security_Token,
						action: 'get',
						doProxy: doProxy,
						requestURL: imageJsonURL + '&imageSR=' + imageSR
					};
					ArcGIS.ajaxRequest(requestData).then(function(response) {
						if (response.success) {
							var responseData = getProperty(response, 'data', false) || {};
							if (responseData.error) {
								// Hmm... how can I pass this error message?
								MAToastMessages.showError({
									message: MASystem.Labels.Layers_ArcGIS_Could_Not_Load_Layer,
									timeOut: 3000,
									extendedTimeOut: 0
								});

								var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

								dfd.resolve({
									success: false,
									layers: [layer],
									layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
										layerId: layerId,
										layerData: layerData,
										error: MASystem.Labels.Common_Refresh_And_Try_Again
									})
								});
							}
							else {
								// XXX: Don't assume that their responses are always available in both http and https; This doesn't work
								//var href = ArcGIS.secureURL(responseData.href);
								// Instead, rebuild the request query for an image
								var href = imageJsonURL.replace(/([?&]f=)json(&?)/, '$1image$2') + '&imageSR=' + imageSR;
								var extent = responseData.extent;
								// Try to grab the latest WKID
								var projFrom = ArcGIS.projectionHelpers.getProjection(extent.spatialReference);
								if (projFrom == null) {
									// If the projection is unnamed, we don't support it at this point
									var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

									dfd.resolve({
										success: false,
										layers: [layer],
										layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
											layerId: layerId,
											layerData: layerData,
											error: projFrom + ': Unsupported projection'
										})
									});
								}
								else {
									// We need lat/long coordinats
									var projTo = 'EPSG:4326';
									var extentBounds = {
										west: extent.xmin,
										south: extent.ymin,
										east: extent.xmax,
										north: extent.ymax
									};
									if (projFrom != projTo) {
										var westSouth = proj4(projFrom, projTo, [extentBounds.west, extentBounds.south]);
										var eastNorth = proj4(projFrom, projTo, [extentBounds.east, extentBounds.north]);
										extentBounds = {
											west: westSouth[0],
											south: westSouth[1],
											east: eastNorth[0],
											north: eastNorth[1]
										};
									}

									var bounds = new google.maps.LatLngBounds(
										new google.maps.LatLng(extentBounds.south, extentBounds.west),
										new google.maps.LatLng(extentBounds.north, extentBounds.east));

									var layer = ArcGIS.plotHelpers.createSublayer({
										class: 'ProjectedOverlay',
										layerId: layerId,
										sublayerId: layerData.id,
										layerData: layerData,
										type: layerData.layerType,
										title: layerTitle,
										zIndex: zIndex,
										copyrightText: copyrightText,
										url: href,
										bounds: bounds,
									});

									dfd.resolve({
										success: true,
										layers: [layer],
										layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
											layerId: layerId,
											layerData: layerData
										})
									});
								}
							}
						}
						else {
							var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);

							dfd.resolve({
								success: false,
								layers: [layer],
								layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
									layerId: layerId,
									layerData: layerData,
									error: response.error || MASystem.Label.Common_Refresh_And_Try_Again_Contact_Admin
								})
							});
						}
					});
				}
			}
			else {
				var layer = ArcGIS.plotHelpers.createSublayer(placeholderLayerOptions);
					dfd.resolve({
						success: false,
						layers: [layer],
						layerLegend: ArcGIS.layerLegendHelpers.createSublayerLegend({
							layerId: layerId,
							layerData: layerData,
							error: response.error || MASystem.Label.Common_Refresh_And_Try_Again_Contact_Admin
						})
					});
			}
		});
		return dfd.promise();
	},
	plotTiledMapLayer: function(layerId, layerData, zIndex, copyrightText, tileURL, getTileUrlCallback) {

		tileURL = ArcGIS.secureURL(tileURL);
		var layer = ArcGIS.plotHelpers.createSublayer({
			class: 'google.maps.ImageMapType',
			url: tileURL,
			layerId: layerId,
			sublayerId: layerData.id,
			layerData: layerData,
			type: layerData.layerType,
			title: ArcGIS.layerLegendHelpers.getSublayerTitle(layerData),
			zIndex: zIndex,
			copyrightText: copyrightText,
			name: layerId + ArcGIS.fieldSeparator + layerData.id,
			opacity: getProperty(layerData, 'opacity', false) || 1,
			maxZoom: 18,
			tileSize: new google.maps.Size(256, 256),
			getTileUrl: getTileUrlCallback || function(coord, zoom) {
				return tileURL + '/tile/' + zoom + '/' + coord.y + '/' + coord.x;
			},
		});
		return layer;
	},
	countFeatures: function(featureLayerURL, query, trialResultRecordCount, maxResultRecordCount, recordSizeMultiplier, _doProxy) {
		var dfd = jQuery.Deferred();
		var doProxy = _doProxy || doProxy;
		var requestData = {
			ajaxResource: 'ArcGISAPI',
			securityToken: MASystem.MergeFields.Security_Token,
			action: 'countFeatures',
			featureLayerURL: featureLayerURL,
			query: query,
			doProxy: doProxy,
			trialResultRecordCount: trialResultRecordCount,
			maxResultRecordCount: maxResultRecordCount,
			recordSizeMultiplier: recordSizeMultiplier
		};
		try {
			ArcGIS.ajaxRequest(requestData).then(function(response) {
				if (response.success) {
					var $recordCounting = MAToastMessages.showSuccess({
						message: MASystem.Labels.Layers_ArcGIS_Retrieving_Data,
						timeOut: 1000,
						extendedTimeOut: 0
					});
					dfd.resolve(response);
				}
				else {
					dfd.resolve({
						success: false,
						error: response.error || MASystem.Labels.Common_Refresh_And_Try_Again
					});
				}
			});
		}
		catch(ex) {
			dfd.resolve({
				success: false,
				error: ex
			});
		}
		return dfd.promise();
	},
	retrieveFeatures: function(featureLayerURL, query, layerData, layerId, pagination, _doProxy) {
		var dfd = jQuery.Deferred();
		var doProxy = _doProxy || false;
		try {
			if (pagination) {
				var trialResultRecordCount = 100;
				var maxResultRecordCount = 0;
				var recordSizeMultiplier = 20;
				ArcGIS.plotHelpers.countFeatures(featureLayerURL, query, trialResultRecordCount, maxResultRecordCount, recordSizeMultiplier, doProxy).then(function(response) {
					if (response.success) {
						var totalRecordCount = response.totalRecordCount;
						if (totalRecordCount == 0) {
							dfd.resolve({
								success: true,
								featureCollection: {
									type: 'FeatureCollection',
									features: [],
									crs: {}
								}
							});
						}
						else {
							var resultRecordCount = response.resultRecordCount;
							if (totalRecordCount > 10 * resultRecordCount) {
								dfd.resolve({
									success: false,
									error: MASystem.Labels.Layers_ArcGIS_Too_Many_Records
								});
							}
							else {
								var $retrievingFeatures = null;
								var startTime = new Date().getTime();
								var retrieveFeatures = function(resultRecordCount) {
									var dfd = jQuery.Deferred();
									var featureSet = null;
									var requestCount = Math.ceil(totalRecordCount / resultRecordCount);
									var failed = false;

									for(var resultOffset = 0; resultOffset < totalRecordCount; resultOffset += resultRecordCount) {
										if (!ArcGIS.layers[layerId]) {
											dfd.resolve({
												success: false,
												removed: true
											});
											break;
										}
										else if (new Date().getTime() - startTime >= ArcGIS.timeoutInMilliseconds && requestCount > 1) {
											if ($retrievingFeatures != null) $retrievingFeatures.remove();
											dfd.resolve({
												success: false,
												error: MASystem.Labels.Common_Refresh_And_Try_Again_Cannot_Show_Records
											});
											break;
										}

										var requestData = {
											ajaxResource: 'ArcGISAPI',
											securityToken: MASystem.MergeFields.Security_Token,
											action: 'get',
											doProxy: doProxy,
											requestURL: featureLayerURL + '/query?' + query + '&f=json&outFields=*&resultOffset=' + resultOffset + '&resultRecordCount=' + resultRecordCount
										};
										ArcGIS.ajaxRequest(requestData).then(function(response) {
											if (!ArcGIS.layers[layerId]) {
												dfd.resolve({
													success: false,
													removed: true
												});
											}
											else if (new Date().getTime() - startTime >= ArcGIS.timeoutInMilliseconds && requestCount > 1) {
												if ($retrievingFeatures != null) $retrievingFeatures.remove();
												dfd.resolve({
													success: false,
													error: MASystem.Labels.Common_Refresh_And_Try_Again_Cannot_Show_Records
												});
											}
											else if (!failed) {
												if (response.success) {
													var featSet = getProperty(response, 'data', false) || [];
													if (featureSet == null) {
														featureSet = featSet;
													}
													else {
														featureSet.features = featureSet.features.concat(featSet.features);
													}
													if (--requestCount == 0) {
														var featureCollection = ArcGIS.featureLayerHelpers.createFeatureCollectionGeoJsonFromEsriFeatureSetJson(featureSet, layerId, layerData.id);
														if ($retrievingFeatures != null) $retrievingFeatures.remove();
														dfd.resolve({
															success: true,
															featureCollection: featureCollection
														});
													}
												}
												else {
													failed = true;
													featureSet = null;
													if (resultRecordCount == 1) {
														if ($retrievingFeatures != null) $retrievingFeatures.remove();
														dfd.resolve({
															success: false,
															error: response.error == MASystem.Labels.Common_Refresh_And_Try_Again
														});
													}
													else {
														retrieveFeatures(Math.round(resultRecordCount/2)).then(function(response) {
															dfd.resolve(response);
														});
													}
												}
											}
										});
									}
									return dfd.promise();
								};
								retrieveFeatures(resultRecordCount).then(function(response) {
									dfd.resolve(response);
								});
							}
						}
					}
					else {
						dfd.resolve(response);
					}
				});
			}
			else {
				var $retrievingFeatures = null;
				var requestData = {
					ajaxResource: 'ArcGISAPI',
					securityToken: MASystem.MergeFields.Security_Token,
					action: 'get',
					doProxy: doProxy,
					requestURL: featureLayerURL + '/query?' + query + '&f=json&outFields=*'
				};
				ArcGIS.ajaxRequest(requestData).then(function(response) {
					if (response.success) {
						var featSet = getProperty(response, 'data', false) || [];
						var featureCollection = ArcGIS.featureLayerHelpers.createFeatureCollectionGeoJsonFromEsriFeatureSetJson(featSet, layerId, layerData.id);
						if ($retrievingFeatures != null) $retrievingFeatures.remove();
						dfd.resolve({
							success: true,
							featureCollection: featureCollection
						});
					}
					else {
						dfd.resolve({
							success: false,
							error: MASystem.Labels.Common_Refresh_And_Try_Again
						});
					}
				});
			}
			return dfd.promise();
		}
		catch(ex) {
			dfd.resolve({
				success: false,
				error: ex
			});
		}
		return dfd.promise();
	},
	addFeatureCollectionToFeatureLayer: function(layer, layerId, featureCollection) {
		var dfd = jQuery.Deferred();
		try {
			layer.addGeoJson(featureCollection);
			dfd.resolve({
				success: true
			});
		}
		catch (ex) {
			dfd.resolve({
				success: false,
				error: ex
			});
		}
		return dfd.promise();
	},
	populateFeatureLayer: function(layer, layerId, featureCollection, style) {
		ArcGIS.plotHelpers.addFeatureCollectionToFeatureLayer(layer, layerId, featureCollection).then(function(layerReturn) {
			if (layerReturn.success) {
				layer.setStyle(style);
				ArcGIS.plotHelpers.createFeatureLabelMarkers(layer);
				ArcGIS.plotHelpers.labelFeatures(layer);
			}
			else {
				var layerDataError = MAToastMessages.showError({
					message: MASystem.Labels.Layers_ArcGIS_Title_Could_Not_Build_Layer,
					subMessage: MASystem.Labels.Layers_ArcGIS_Could_Not_Connect_To_ArcGIS,
					timeOut: 3000,
					extendedTimeOut: 0
				});
			}
		});
	},
	plotFeatureCollectionJson: function(layerId, operationalLayer, featureCollection, zIndex, webMapURL) {
		var dfd = jQuery.Deferred();
		var totalLayersCount = layersCount = featureCollection.layers.length;
		var opacity = operationalLayer.opacity;
		var layerLegend = '';
		var layers = [];
		var itemId = webMapURL.match(/[?&]webmap=([0-9a-z,]+)/)[1];
		var url = 'https://www.arcgis.com/sharing/rest/content/items/' + itemId + '/data' + ArcGIS.tokenHelpers.createAccessTokenParameter(webMapURL, 1, 1) + 'f=json';
		featureCollection.layers.forEach(function(data, featureSetId) {
			var layerDefinition = data.layerDefinition;
			var sublayerId = operationalLayer.id + (totalLayersCount > 1 ? ArcGIS.fieldSeparator + layerDefinition.name : '');
			var spatialReference = layerDefinition.spatialReference || layerDefinition.extent.spatialReference;
			var drawingInfo = layerDefinition.drawingInfo;
			if (drawingInfo) {
			}

			var layer = ArcGIS.plotHelpers.createSublayer({
				class: 'google.maps.Data',
				url: url,
				layerId: layerId,
				sublayerId: sublayerId,
				layerData: operationalLayer,
				type: 'ArcGISFeatureLayer',
				title: ArcGIS.layerLegendHelpers.getSublayerTitle(operationalLayer, totalLayersCount > 1 ? layerDefinition : undefined),
				zIndex: zIndex,
				copyrightText: layerDefinition.copyrightText,

				drawingInfo: drawingInfo,
				fields: layerDefinition.fields,
				spatialReference: spatialReference
			});
			layers.push(layer);

			var featureSet = data.featureSet;
			var style = ArcGIS.styleHelpers.createStyleFromEsriDrawingInfo(drawingInfo, opacity, zIndex);
			if (featureSet.features.length > 0) {
				if (!featureSet.spatialReference) {
					featureSet.spatialReference = spatialReference;
				}

				// create feature collection GeoJson
				var featureCollection = ArcGIS.featureLayerHelpers.createFeatureCollectionGeoJsonFromEsriFeatureSetJson(featureSet, layerId, sublayerId);

				ArcGIS.plotHelpers.populateFeatureLayer(layer, layerId, featureCollection, style.map);
			}

			layerLegend = ArcGIS.layerLegendHelpers.createSublayerLegend({
				layerId: layerId,
				layerData: operationalLayer,
				layerDefinition: totalLayersCount > 1 ? layerDefinition : undefined,
				style: style.legend
			}) + layerLegend;
			if (--layersCount == 0) {
				dfd.resolve({
					success: true,
					layers: layers,
					layerLegend: layerLegend
				});
			}
		});
		return dfd.promise();
	},
	createFeatureLabelMarkers: function(layer) {
		if (layer.drawingInfo && layer.drawingInfo.labelingInfo && layer.drawingInfo.labelingInfo.length > 0) {
			var labelingInfo = layer.drawingInfo.labelingInfo[0];
			var labelFieldName;
			layer.fields.forEach(function(field) {
				switch (field.type) {
					case 'esriFieldTypeOID':
						labelFieldName = field.name;
						return false;
				}
			});
			var fontColor = '#ffffff';
			var fontSize = '10px';
			var bgColor = '#000000';
			var bgOpacity = 0.2;
			var justification = 'center';

			if (getProperty(labelingInfo, 'labelExpression')) {
				labelFieldName = labelingInfo.labelExpression.replace(/[\[\]]/g, '');
			}
			if (getProperty(labelingInfo, 'symbol.font.size')) {
				fontSize = labelingInfo.symbol.font.size + 'px';
			}
			if (getProperty(labelingInfo, 'symbol.color')) {
				fontColor = ArcGIS.styleHelpers.createHexFromEsriColor(labelingInfo.symbol.color).substr(0, 7);
				if (getProperty(labelingInfo, 'symbol.backgroundColor')) {
					bgColor = ArcGIS.styleHelpers.createHexFromEsriColor(labelingInfo.symbol.backgroundColor).substr(0, 7);
					bgOpacity = labelingInfo.symbol.backgroundColor[3] / 255;
				}
				else {
					bgColor = '#ffffff';
					bgOpacity = 0;
				}
			}
			if (getProperty(labelingInfo, 'symbol.horizontalAlignment')) {
				justification = labelingInfo.symbol.horizontalAlignment;
			}

			layer.forEach(function(feature) {
				feature.labelMarker = ArcGIS.plotHelpers.createLabelMarker({
					geometry: feature.getGeometry(),
					fontColor: fontColor,
					fontSize: fontSize,
					bgColor: bgColor,
					bgOpacity: bgOpacity,
					justification: justification,
					text: ArcGIS.featureLayerHelpers.getFieldValue(feature, labelFieldName)
				});
			});
		}
	},
	destroyFeatureLabelMarkers: function(layer) {
		layer.forEach(function(feature) {
			if (feature.labelMarker) {
				feature.labelMarker.setMap(null);
				feature.labelMarker = null;
			}
		});
	},
	labelFeatures: function(layer) {
		layer.forEach(function(feature) {
			if (feature.labelMarker) {
				feature.labelMarker.setMap(MA.map);
			}
		});
	},
	unlabelFeatures: function(layer) {
		layer.forEach(function(feature) {
			if (feature.labelMarker) {
				feature.labelMarker.setMap(null);
			}
		});
	},
	highlightFeature: function(feature) {
		return ArcGIS.plotHelpers.highlightFeatureById(feature.getProperty('layerId'), feature.getProperty('sublayerId'), feature.getId());
	},
	highlightFeatureById: function(layerId, sublayerId, featureId) {
		return ArcGIS.layers[layerId].sublayers[sublayerId].getFeatureById(featureId);

		// XXX: Highlighting prevents clicking the feature again until the overlay feature disappears.
		// Create a new layer for highlighted features.
		var layer = ArcGIS.overlayLayer;
		var color = '#ff0000';
		var opacity = 0.5;
		var sublayers = ArcGIS.layers[layerId].sublayers;
		var zIndex = Object.keys(sublayers).length;
		if (layer == null) {
			layer = new google.maps.Data();
			layer.setStyle({
				fillColor: color,
				fillOpacity: opacity,
				strokeOpacity: opacity,
				zIndex: zIndex
			});
			layer.type = 'overlay';
			ArcGIS.overlayLayer = layer;
		}

		// Delete previous features.
		layer.forEach(function(feature) {
			clearInterval(feature.fader);
			layer.remove(feature);
		});

		// Add the current feature.
		var feature = layer.add(sublayers[sublayerId].getFeatureById(featureId));
		layer.setMap(MA.map);

		// Fade away highlighting.
		feature.fader = setInterval(function() {
			if ((opacity -= 0.01) > 0) {
				layer.overrideStyle(feature, {
					fillColor: color,
					fillOpacity: opacity,
					strokeOpacity: opacity,
					zIndex: zIndex
				});
			}
			else {
				clearInterval(feature.fader);
				layer.remove(feature);
				layer.setMap(null);
			}
		},
		100);

		return feature;
	},
	createLabelMarker: function(options) {
		options.bgColor = options.bgColor && options.bgColor.charAt(0) == '#' ? options.bgColor.substr(1) : options.bgColor;
		var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);

		var labelMarkerURL = MAIO_URL + 'sfmapsapi.com/images/marker/3' +
			'?color=' + encodeURIComponent(options.bgColor) +
			'&text=' + encodeURIComponent(options.text) +
			'&icon=marker';

        var marker = new google.maps.Marker({
            icon: labelMarkerURL,
            clickable: false
        });

		var bounds = new google.maps.LatLngBounds();
		options.geometry.forEachLatLng(function(point) {
			bounds.extend(point);
		});
		var center = bounds.getCenter();
		var ne = bounds.getNorthEast();
		var sw = bounds.getSouthWest();
		var position = center;
		switch (options.justification) {
			case 'left':
				position = new google.maps.LatLng(center.lat(), sw.lng());
				break;
			case 'right':
				position = new google.maps.LatLng(center.lat(), ne.lng());
				break;
		}
		marker.setPosition(position);
        return marker;
    },
	escapeFieldSeparator: function(str) {
		return str.replace(ArcGIS.fieldSeparator, '_');
	},
	escapeElementId: function(id) {
		return id.replace(new RegExp(ArcGIS.fieldSeparator, 'g'), '\\' + ArcGIS.fieldSeparator).
			replace(/([\/.])/g, '\\$1');
	},
    removeLayer: function(layerId) {
        var dfd = jQuery.Deferred();
		if (ArcGIS.unauthorizedServers[layerId]) {
			delete ArcGIS.unauthorizedServers[layerId];
		}
		if (ArcGIS.unsecuredServers[layerId]) {
			delete ArcGIS.unsecuredServers[layerId];
		}
        if (ArcGIS.layers[layerId]) {
            try {
                var sublayers = ArcGIS.layers[layerId].sublayers;
                Object.keys(sublayers).forEach(function(sublayerId) {
					var sublayer = sublayers[sublayerId];
					sublayer.clear();
					if (sublayer.refresher) {
						clearTimeout(sublayer.refresher);
					}
                });
				ArcGIS.plotHelpers.showCopyrightText();
                delete ArcGIS.layers[layerId];
            }
            catch (ex) {
                dfd.resolve({
					success: false,
					error: ex
				});
            }
            if (MA.isMobile) {
                $('#PlottedQueriesTable .PlottedRowUnit[qid="' + layerId + '"]').remove();
            }
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

		if (Object.keys(ArcGIS.layers).length === 0) {
			$('#visibleAreaRefeshMap').removeClass('visible');
		}

        return dfd.promise();
    }
};
