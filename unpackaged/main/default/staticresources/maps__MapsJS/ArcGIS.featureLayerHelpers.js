ArcGIS.featureLayerHelpers = {
	getFieldValue: function(feature, fieldName) {
		return feature.getProperty('mapAnythingProperties') ? feature.getProperty('attributes')[fieldName] : feature.getProperty(fieldName);
	},
	getSymbol: function(feature) {
		return feature.getProperty('mapAnythingProperties') ? feature.getProperty('symbol') : undefined;
	},
	getSymbolFromLegend: function(feature, renderer, totalFieldsMapped, legendsMap) {
		var symbol = ArcGIS.featureLayerHelpers.getSymbol(feature);
		if (symbol === undefined && feature.getProperty('mapAnythingProperties')) {
			try {
				var legendKeys = [];
				for (i = 0; i < totalFieldsMapped; i++) {
					// get the field# prop from the renderer and then get that returned value from the feature attributes
					legendKeys.push(feature.getProperty('attributes')[renderer['field' + (i + 1)]]);
				}
				
				// combine the values retrieved from above loop to get the correct symbol from the legend for this feature (marker)
				symbol = legendsMap[legendKeys.join(renderer.fieldDelimiter)];
			} catch(exception) {
				console.warn(exception);
			}
		}
		return symbol;
	},
	createFeatureGeoJsonFromEsriFeatureJson: function(geomType, featureData, spatialReference) {
		var feature;
		var projFrom = ArcGIS.projectionHelpers.getProjection(spatialReference);
		var projTo = 'EPSG:4326';
		var coords;
		switch(geomType) {
			case 'esriGeometryPoint':
				geomType = 'Point';
				coords = [featureData.geometry.x, featureData.geometry.y];
				break;
			case 'esriGeometryPolyline':
				geomType = 'MultiLineString';
				coords = featureData.geometry.paths;
				break;
			case 'esriGeometryPolygon':
				geomType = 'Polygon';
				coords = featureData.geometry.rings;
				break;
			default:
				console.log(geomType + ': Not implemented');
				return null;
		}
		coords = ArcGIS.projectionHelpers.reprojectCoordinates(projFrom, projTo, coords);
		feature = {
			type: 'Feature',
			geometry: {
				type: geomType,
				coordinates: coords
			},
			properties: {
				mapAnythingProperties: true,
				attributes: featureData.attributes,
				symbol: featureData.symbol
			}
		};
		return feature;
	},
	createFeatureCollectionGeoJsonFromEsriFeatureSetJson: function(featureSetData, layerId, sublayerId) {
		// spatialReference is not always defined inside a feature set or geometry.
		var geomType = featureSetData.geometryType;
		var spatialReference = featureSetData.spatialReference;
		var features = featureSetData.features.map(function(featureData, index) {
			var feature = ArcGIS.featureLayerHelpers.createFeatureGeoJsonFromEsriFeatureJson(geomType, featureData, spatialReference);
			feature.properties.layerId = layerId;
			feature.properties.sublayerId = sublayerId;
			// XXX: layer.forEach returns a feature with id 0, but layer.getFeatureById(0) returns undefined. Start from 1.
			feature.id = index + 1;
			return feature;
		});
		return {
			type: 'FeatureCollection',
			features: features,
			crs: {
				type: 'name',
				properties: {
					name: 'EPSG:4326'
				}
			}
		};
	},
	validateFieldValue: function(fieldValue, fieldInfo) {
		var error;
		var value = fieldValue.toString();

		// http://edndoc.esri.com/arcobjects/9.2/ComponentHelp/esriGeodatabase/esriFieldType.htm
		// http://desktop.arcgis.com/en/arcmap/10.3/manage-data/geodatabases/arcgis-field-data-types.htm
		switch (fieldInfo.type) {
			case 'esriFieldTypeSmallInteger':
				var min = -Math.pow(2, 16 - 1);
				var max = -min - 1;
				if (!value.match(/^-?[0-9]+$/)) {
					error = value + ' not a short integer';
				}
				else if(value < min) {
					error = value + ' smaller than ' + min;
				}
				else if (value > max) {
					error = value + ' greater than ' + min;
				}
				break;
			case 'esriFieldTypeInteger':
				var min = -Math.pow(2, 32 - 1);
				var max = -min - 1;
				if (!value.match(/^-?[0-9]+$/)) {
					error = value + ' not a long integer';
				}
				else if(value < min) {
					error = value + ' smaller than ' + min;
				}
				else if (value > max) {
					error = value + ' greater than ' + min;
				}
				break;
			case 'esriFieldTypeSingle':
				// TODO: range?
				if (!value.match(/^-?[0-9]+(\.[0-9]*)?$/)) {
					error = value + ' not a single-precision real number';
				}
				break;
			case 'esriFieldTypeDouble':
				if (!value.match(/^-?[0-9]+(\.[0-9]*)?$/)) {
					error = value + ' not a double-precision real number';
				}
				break;
			case 'esriFieldTypeString':
				if (fieldInfo.domain) {
					var found = false;
					fieldInfo.domain.codedValues.forEach(function(codedValue) {
						if (value == codedValue.code || value == codedValue.name) {
							value = fieldValue = codedValue.code;
							found = true;
							return false;
						}
					});
					if (!found) {
						error = value + ' not found in domain';
					}
				}
				if (value.length > fieldInfo.length) {
					error = value + ' longer than ' + fieldInfo.length + ' characters';
				}
				break;
			case 'esriFieldTypeDate':
				// https://www.epochconverter.com/
				if (!value.match(/^[0-9]+$/)) {
					value = new Date(value).getTime();
					if (isNaN(value)) {
						error = value + ' not an epoch time';
					}
					else {
						fieldValue = value;
					}
				}
				break;
			case 'esriFieldTypeOID':
				if (!value.match(/^[0-9]+$/)) {
					error = value + ' not an OID';
				}
				break;
			case 'esriFieldTypeGeometry':
				break;
			case 'esriFieldTypeBlob':
				break;
			case 'esriFieldTypeRaster':
				break;
			case 'esriFieldTypeGUID':
				if (!value.match(/^\{[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}\}$/)) {
					error = value + ' not a GUID';
				}
				break;
			case 'esriFieldTypeGlobalID':
				if (!value.match(/^\{[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}\}$/)) {
					error = value + ' not a Global ID';
				}
				break;
			case 'esriFieldTypeXML':
				break;
		}
		return error ? {
			valid: false,
			error: error
		} : {
			valid: true,
			value: fieldValue
		};
	},
	validateAttributes: function(attributes, fields) {
		var errors = [];
		var validatedAttributes = {};
		fields.forEach(function(field) {
			if (!field.nullable && !field.locked && !attributes[field.name]) {
				errors.push(field.name + ': Field not nullable');
			}
			if (field.locked && attributes[field.name]) {
				errors.push(field.name + ': Field not editable');
			}
		});
		Object.keys(attributes).forEach(function(fieldName) {
			var fieldValue = attributes[fieldName];
			var fieldInfo;
			fields.forEach(function(field) {
				if (field.name == fieldName || field.alias == fieldName) {
					fieldInfo = field;
					return false;
				}
			});
			if (fieldInfo) {
				var response = ArcGIS.featureLayerHelpers.validateFieldValue(fieldValue, fieldInfo);
				if (response.valid) {
					validatedAttributes[fieldInfo.name] = response.value;
				}
				else {
					errors.push(fieldName + ': ' + response.error);
				}
			}
			else {
				errors.push(fieldName + ': Field not found');
			}
		});
		return errors.length > 0 ? {
			valid: false,
			attributes: validatedAttributes,
			errors: errors
		} : {
			valid: true,
			attributes: validatedAttributes
		};
	},
	editFeatures: function(featureLayerURL, operation, data) {
		var dfd = jQuery.Deferred();
		var featureLayerURL = ArcGIS.secureURL(featureLayerURL);
		var requestData = {
			ajaxResource: 'ArcGISAPI',
			securityToken: MASystem.MergeFields.Security_Token,
			action: 'post',
			requestURL: featureLayerURL + '/' + operation,
			requestData: ArcGIS.tokenHelpers.createAccessTokenParameter(featureLayerURL, -1, -1) + data
		};
		ArcGIS.ajaxRequest(requestData).then(function(response) {
			console.log(requestData, response);
			if (response.success) {
				var responseData = response.data;
				if (responseData.error) {
					dfd.resolve({
						success: false,
						error: responseData.error.message
					});
				}
				else {
					dfd.resolve(Object.assign({ success: true }, responseData));
				}
			}
			else {
				dfd.resolve({
					success: false,
					error: getProperty(response, 'error', false) || ''
				});
			}
		});
		return dfd.promise();
	},
	addFeatureByURL: function(featureLayerURL, spatialReference, latitude, longitude, attributes) {
		var dfd = jQuery.Deferred();
		var projFrom = 'EPSG:4326';
		var projTo = ArcGIS.projectionHelpers.getProjection(spatialReference);
		if (projTo == null) {
			// If the projection is unnamed, we don't support it at this point
			var error = projTo + ': Unsupported projection';
			console.log(error);

			dfd.resolve({
				success: false,
				error: error
			});
			return dfd.promise();
		}
		else {
			var geometry = proj4(projFrom, projTo, [longitude, latitude]);
			var data = 'f=json&features=' + JSON.stringify([{
				geometry: {
					x: geometry[0],
					y: geometry[1]
				},
				attributes: attributes
			}]);
			ArcGIS.featureLayerHelpers.editFeatures(featureLayerURL, 'addFeatures', data).then(function(response) {
				if (response.success) {
					var addResults = response.addResults;
					if (addResults.length == 1) {
						if (addResults[0].success) {
							dfd.resolve({
								success: true,
								featureId: addResults[0].objectId
							});
						}
						else {
							dfd.resolve({
								success: false,
								error: addResults[0].error.description,
								code: addResults[0].error.code
							});
						}
					}
					else {
						dfd.resolve({
							success: false,
							error: 'Multiple features returned',
							results: addResults
						});
					}
				}
				else {
					dfd.resolve({
						success: false,
						error: response.error || 'Request failed',
						response: response
					});
				}
			});
		}
		return dfd.promise();
	},
	updateFeatureByURL: function(featureLayerURL, featureId, attributes, spatialReference, latitude, longitude) {
		var dfd = jQuery.Deferred();
		var data;
		attributes.OBJECTID = featureId;

		if (spatialReference != undefined && latitude != undefined && longitude != undefined) {
			var projFrom = 'EPSG:4326';
			var projTo = ArcGIS.projectionHelpers.getProjection(spatialReference);
			if (projTo == null) {
				// If the projection is unnamed, we don't support it at this point
				var error = projTo + ': Unsupported projection';
				console.log(error);

				dfd.resolve({
					success: false,
					error: error
				});
				return dfd.promise();
			}
			else {
				var geometry = proj4(projFrom, projTo, [longitude, latitude]);
				data = 'f=json&features=' + JSON.stringify([{
					geometry: {
						x: geometry[0],
						y: geometry[1]
					},
					attributes: attributes
				}]);
			}
		}
		else {
			data = 'f=json&features=' + JSON.stringify([{
				attributes: attributes
			}]);
		}
		ArcGIS.featureLayerHelpers.editFeatures(featureLayerURL, 'updateFeatures', data).then(function(response) {
			if (response.success) {
				var updateResults = response.updateResults;
				if (updateResults.length == 1) {
					if (updateResults[0].success) {
						dfd.resolve({
							success: true,
							featureId: updateResults[0].objectId
						});
					}
					else {
						dfd.resolve({
							success: false,
							featureId: updateResults[0].objectId,
							error: updateResults[0].error.description,
							code: updateResults[0].error.code
						});
					}
				}
				else {
					dfd.resolve({
						success: false,
						error: 'Multiple features returned',
						results: updateResults
					});
				}
			}
			else {
				dfd.resolve(response);
			}
		});
		return dfd.promise();
	},
	deleteFeatureByURL: function(featureLayerURL, featureId) {
		var dfd = jQuery.Deferred();
		var data = 'f=json&objectIds=' + featureId;
		ArcGIS.featureLayerHelpers.editFeatures(featureLayerURL, 'deleteFeatures', data).then(function(response) {
			if (response.success) {
				if (response.deleteResults) {
					var deleteResults = response.deleteResults;
					if (deleteResults.length == 1) {
						if (deleteResults[0].success) {
							dfd.resolve({
								success: true,
								featureId: deleteResults[0].objectId
							});
						}
						else {
							dfd.resolve({
								success: false,
								featureId: deleteResults[0].objectId,
								error: deleteResults[0].error.description,
								code: deleteResults[0].error.code
							});
						}
					}
					else {
						dfd.resolve({
							success: false,
							error: 'Multiple features returned',
							results: deleteResults
						});
					}
				}
				else {
					dfd.resolve({
						success: false,
						featureId: featureId,
						error: 'No such feature exists'
					});
				}
			}
			else {
				dfd.resolve(response);
			}
		});
		return dfd.promise();
	},
	onClickFeature: function(event, operationalLayer) {
		// operationalLayer = {
		//	id:
		//	title:
		//	[popupInfo:]
		//	[featureCollection:]
		// }

		console.log('onClickFeature', event, operationalLayer);

        var layerId = event.feature.getProperty('layerId');
		var sublayerId = event.feature.getProperty('sublayerId');
		var sublayer = ArcGIS.layers[layerId].sublayers[sublayerId];

		var useTooltipTableForMobile = false;
		var $tooltipContent;
		var $tooltipTab;
		var $tooltipBodyRows;

		if (!MA.isMobile) {
			$tooltipContent = $('#templates .tooltipTemplate').clone();
			$tooltipContent.attr('lat', event.latLng.lat());
			$tooltipContent.attr('lng', event.latLng.lng());
			$tooltipContent.data('feature', event.feature);
			$tooltipContent.find('.infowindow-header-record-name').text(operationalLayer.title);
			$tooltipBodyRows = $tooltipContent.find('.tooltip-bodyrows');

			var $aggregateLink = $tooltipContent.find('#maForArcGISInfoWindowAggregate_Item');
			if (event.feature.getGeometry().getType() == 'Polygon') {
				$aggregateLink.attr('href', 'javascript:ArcGIS.featureLayerHelpers.aggregate(' +
					event.latLng.lat() + ',' +
					event.latLng.lng() + ',' +
					'\'' + layerId + '\',' +
					'\'' + sublayerId + '\',' +
					event.feature.getId() + ')');
				$aggregateLink.show();
			}
			else {
				$aggregateLink.hide();
			}
		}

        var title = 'ArcGIS Layer';
        var fieldInfos = [];
		var fields = [];
        if (operationalLayer.popupInfo && operationalLayer.popupInfo.fieldInfos) {
            fieldInfos = operationalLayer.popupInfo.fieldInfos;
        }
        else if (operationalLayer.featureCollection &&
                 operationalLayer.featureCollection.layers &&
                 operationalLayer.featureCollection.layers.length > 0 &&
                 operationalLayer.featureCollection.layers[0].popupInfo &&
                 operationalLayer.featureCollection.layers[0].popupInfo.fieldInfos) {
			// we could have multiple sublayers
			// match the selected sublayer with its' corresponding field set
			for (var i = 0; i < operationalLayer.featureCollection.layers.length; i++) {
				if (fieldInfos.length == 0) {
					// found match with selected sublayer
					var sublayerName = operationalLayer.featureCollection.layers[i].layerDefinition.name;
					if (sublayerId.indexOf(sublayerName) !== -1) {
						// populate tooltip fields for selected sublayer and update the info box title
						fieldInfos = operationalLayer.featureCollection.layers[i].popupInfo.fieldInfos;
						$tooltipContent.find('.infowindow-header-record-name').text(sublayerName);
					}
				}
			}
        }
		else {
			fields = sublayer.fields;
		}

        var fieldData = [];
        if (fieldInfos.length > 0) {
            var firstToolTip = fieldInfos[0];
            if (firstToolTip.visible) {
                title = firstToolTip.label;
                var fieldValue = ArcGIS.featureLayerHelpers.getFieldValue(event.feature, firstToolTip.fieldName);
                if (firstToolTip.format && firstToolTip.format.dateFormat) {
                    title += ' ' + (new Date(fieldValue).toDateString());
                }
                else {
                    title += ' ' + fieldValue;
                }
            }

            fieldInfos.forEach(function(fieldInfo) {
                if (fieldInfo.visible) {
                    var fieldName = fieldInfo.fieldName;
                    var fieldValue = ArcGIS.featureLayerHelpers.getFieldValue(event.feature, fieldName);
                    if (fieldInfo.format && fieldInfo.format.dateFormat) {
                        fieldValue = (new Date(fieldValue).toDateString())
						fieldData.push({
							fieldName: fieldName,
							fieldValue: fieldValue,
							fieldLabel: fieldInfo.label
						});
                    }
                    else {
						fieldData.push({
							fieldName: fieldName,
							fieldValue: fieldValue,
							fieldLabel: fieldInfo.label
						});
                    }
					if (MA.isMobile && !useTooltipTableForMobile) {
						// $tooltipTab.append('<div class="tooltip-segment-item"><label>' + fieldInfo.label + '</label>' + fieldValue + '</div>');
					}
					else {
						var $tooltipDetails = $('#templates .tooltip-rowTemplate').clone();
						$tooltipDetails.find('.tooltip-label').text(fieldInfo.label);
                        $tooltipDetails.find('.tooltip-value').text(fieldValue);
						$tooltipBodyRows.append($tooltipDetails);
					}
                }
            });
        }
		else if (fields.length > 0) {
            var firstToolTip = fields[0];
			title = firstToolTip.alias;
			var fieldValue = ArcGIS.featureLayerHelpers.getFieldValue(event.feature, firstToolTip.name);
			if (firstToolTip.type == 'esriFieldTypeDate') {
				title += ' ' + (new Date(fieldValue).toDateString());
			}
			else {
				title += ' ' + fieldValue;
			}

            fields.forEach(function(field) {
				var fieldName = field.name;
				var fieldValue = ArcGIS.featureLayerHelpers.getFieldValue(event.feature, fieldName);
				if (field.type == 'esriFieldTypeDate') {
					fieldValue = (new Date(fieldValue).toDateString())
					fieldData.push({
						fieldName: fieldName,
						fieldValue: fieldValue,
						fieldLabel: field.alias
					});
				}
				else {
					fieldData.push({
						fieldName: fieldName,
						fieldValue: fieldValue,
						fieldLabel: field.alias
					});
				}
				if (MA.isMobile && !useTooltipTableForMobile) {
					// $tooltipTab.append('<div class="tooltip-segment-item"><label>' + field.alias + '</label>' + fieldValue + '</div>');
				}
				else {
					var $tooltipDetails = $('#templates .tooltip-rowTemplate').clone();
					$tooltipDetails.find('.tooltip-label').text(field.alias);
					$tooltipDetails.find('.tooltip-value').text(fieldValue);
					$tooltipBodyRows.append($tooltipDetails);
				}
            });
		}

		if (MA.isMobile) {
			var markerOptions = {
				type: 'arcGIS-marker',
				record: {
					name: operationalLayer.title,
					address: '',
					location: {
						coordinates: {
							lat: event.latLng.lat(),
							lng: event.latLng.lng()
						}
					}
				},
				marker: event,
				queryMetaData: {
					sublayer: sublayer,
					fieldData: fieldData
				}
			};
			VueEventBus.$emit('show-marker-tooltip', true, markerOptions);
		}
		else {
			var $arcGISActionTab = $tooltipContent.find('#infowindowMasterTabContentActions');

			var closureUid = '';
			for (key in event.feature) {
				if (key.indexOf('closure_uid') > -1) {
					closureUid = event.feature[key];
				}
			}

			$('#infowindowMasterTabContentActions').data('feature', event.feature);

			var arcLayout = userSettings.ButtonSetSettings.ArcGISLayerLayout || JSON.parse('[{"Label":"Actions","Columns":[[{"Label":"Set Reference Point","Type":"Standard Action"}],[{"Action":"Add to Trip","Label":"'+MASystem.Labels.ActionFramework_Add_to_Trip+'","Type":"Standard Action"},{"Label":"' + MASystem.Labels.Context_Remove_Marker + '","Type":"Standard Action"}],[{"Label":"Set Proximity Center","Type":"Standard Action"},{"Label":"' + MASystem.Labels.MA_STREET_VIEW + '","Type":"Standard Action"}],[{"Label":"Create Record","Type":"Standard Action"}]]}]');
			$arcGISActionTab.attr('lat', event.latLng.lat());
			$arcGISActionTab.attr('lng', event.latLng.lng());
			$arcGISActionTab.attr('data-title', title);
			$arcGISActionTab.attr('data-layer', operationalLayer.id);
			$arcGISActionTab.attr('data-layerid', layerId);
			$arcGISActionTab.attr('data-closureuid', closureUid);
			$arcGISActionTab.attr('data-sublayerid', sublayerId);

			//$arcGISActionTab.attr('data-feature',event.feature);
			$arcGISActionTab.html(MAActionFramework.buildLayoutFromContents(arcLayout, {
				markerType: 'ArcGISLayer'
			}));

			//Derek change this for ArcGIS
			$('#tooltip-content').data('arcFieldInfo', fieldData);

			var marker = new google.maps.Marker({
				position: event.latLng,
				anchorPoint: new google.maps.Point(0, -10),
				map: MA.map,
				title: '',
				icon: 'https://static.arcgis.com/images/Symbols/Animated/ConstantRedStrobeMarkerSymbol.png',
				opacity: 0,
				isVisible: false
			});
			MA.Map.InfoBubble.show({
				position: event.latLng,
				anchor: marker,
				content: $tooltipContent.html()
			});
			
			// Remove the anchor marker from the map so the original marker is still clickable
			marker.setMap(null);

			MA.Map.InfoBubble.adjust();
		}
    },
    onRightClickFeature: function(event, operationalLayer) {
		if (event.feature.getGeometry().getType() == 'Polygon') {
			var feature = ArcGIS.plotHelpers.highlightFeature(event.feature);
			ArcPolygon_Context.call(feature, event);
		}
	},
	addFeatureAndMarker: function(layer, latitude, longitude, attributes, templateName) {
		var dfd = jQuery.Deferred();
		ArcGIS.featureLayerHelpers.retrieveTemplateDataByLayer(layer, templateName).then(function(response) {
			if (response.success) {
				var templateData = response.templateData;
				var isActive = templateData.active;
				var sublayerId = templateData.webMapLayer.path;
				var sObjectPath = templateData.salesforceObject.path;
				var recordTypePath = templateData.recordType.path;
				var fieldSetPath = templateData.fieldSet.path;
				var latlng = templateData.latlng;
				var fieldMappings = templateData.fieldMappings;

				if (sublayerId == layer.sublayerId) {
					if (isActive) {
						if (latlng.lat && latlng.lng && latlng.lat != latlng.lng) {
							ArcGIS.featureLayerHelpers.addFeature(layer, latitude, longitude, attributes).then(function(response) {
								console.log('addFeature', response);
								if (response.success) {
									var featureId = response.featureId;
									var fields = [];
									fields.push({
										name: latlng.lat,
										value: latitude
									});
									fields.push({
										name: latlng.lng,
										value: longitude
									});
									$.each(attributes, function (fieldName, fieldValue) {
										fieldMappings.forEach(function(fieldMapping) {
											if (fieldMapping.webMapPath == fieldName) {
												if (fieldMapping.staticFieldPath.toUpperCase() != 'ID') {
													fields.push({
														name: fieldMapping.staticFieldPath,
														value: fieldValue
													});
												}
												return false;
											}
										});
									});
									var requestData = {
										ajaxResource : 'TooltipAJAXResources',
										action: 'createRecord',
										sobject: sObjectPath,
										recordtypeid: recordTypePath,
										fieldSet: fieldSetPath,
										fields: JSON.stringify(fields)
									};
									ArcGIS.ajaxRequest(requestData).then(function(response) {
										console.log('createRecord', response);
										if (response.success) {
											dfd.resolve({
												success: true,
												featureId: featureId,
												markerId: response.record.Id
											});
										}
										else {
											ArcGIS.featureLayerHelpers.deleteFeature(layer, featureId).then(function(response) {
												console.log('deleteFeature', response);
												if (response.success) {
													dfd.resolve({
														success: false,
														errors: ['Failed to create a Salesforce record. Deleted its associated ArcGIS feature.']
													});
												}
												else {
													dfd.resolve({
														success: false,
														errors: [
															'Failed to create a Salesforce record.',
															'Failed to delete its associated ArcGIS feature.'
														]
													});
												}
											});
										}
									});
								}
								else {
									dfd.resolve(response);
								}
							});
						}
						else {
							var errors = [];
							if (!latlng.lat) {
								errors.push('Latitude field not defined.');
							}
							if (!latlng.lng) {
								errors.push('Longitude field not defined.');
							}
							if (latlng.lat && latlng.lng && latlng.lat == latlng.lng) {
								errors.push('Latitude and longitude fields cannot be the same.');
							}
							dfd.resolve({
								success: false,
								errors: errors
							});
						}
					}
					else {
						dfd.resolve({
							success: false,
							errors: ['Template is not active.']
						});
					}
				}
				else {
					dfd.resolve({
						success: false,
						errors: ['Template webMapLayer path does not match sublayer Id.']
					});
				}
			}
			else {
				dfd.resolve({
					success: false,
					errors: [response.error]
				});
			}
		});
		return dfd.promise();
	},
	updateFeatureAndMarker: function(layer, featureId, attributes, latitude, longitude, templateName, markerId) {
		var dfd = jQuery.Deferred();
		ArcGIS.featureLayerHelpers.retrieveTemplateDataByLayer(layer, templateName).then(function(response) {
			if (response.success) {
				var templateData = response.templateData;
				var isActive = templateData.active;
				var sublayerId = templateData.webMapLayer.path;
				var sObjectPath = templateData.salesforceObject.path;
				var recordTypePath = templateData.recordType.path;
				var fieldSetPath = templateData.fieldSet.path;
				var latlng = templateData.latlng;
				var fieldMappings = templateData.fieldMappings;

				if (sublayerId == layer.sublayerId) {
					if (isActive) {
						if (latlng.lat && latlng.lng && latlng.lat != latlng.lng) {
							ArcGIS.featureLayerHelpers.updateFeature(layer, featureId, attributes, latitude, longitude).then(function(response) {
								console.log('updateFeature', response);
								if (response.success) {
									var featureId = response.featureId;
									var fields = [];
									if (latitude) {
										fields.push({
											field: latlng.lat,
											newValue: latitude
										});
									}
									if (longitude) {
										fields.push({
											field: latlng.lng,
											newValue: longitude
										});
									}
									$.each(attributes, function (fieldName, fieldValue) {
										fieldMappings.forEach(function(fieldMapping) {
											if (fieldMapping.webMapPath == fieldName) {
												if (fieldMapping.staticFieldPath.toUpperCase() != 'ID') {
													fields.push({
														field: fieldMapping.staticFieldPath,
														newValue: fieldValue
													});
												}
												return false;
											}
										});
									});
									var requestData = {
										ajaxResource : 'TooltipAJAXResources',
										action: 'updateRecordFields',
										recordId: markerId,
										updateData: JSON.stringify(fields)
									};
									ArcGIS.ajaxRequest(requestData).then(function(response) {
										console.log('updateRecordFields', response);
										if (response.success) {
											dfd.resolve({
												success: true,
												featureId: featureId,
												markerId: markerId
											});
										}
										else {
											dfd.resolve({
												success: false,
												errors: ['Failed to update the Salesforce record. Updated the ArcGIS feature only.']
											});
										}
									});
								}
								else {
									dfd.resolve(response);
								}
							});
						}
						else {
							var errors = [];
							if (!latlng.lat) {
								errors.push('Latitude field not defined.');
							}
							if (!latlng.lng) {
								errors.push('Longitude field not defined.');
							}
							if (latlng.lat && latlng.lng && latlng.lat == latlng.lng) {
								errors.push('Latitude and longitude fields cannot be the same.');
							}
							dfd.resolve({
								success: false,
								errors: ['Template is not active.']
							});
						}
					}
					else {
						dfd.resolve({
							success: false,
							errors: ['Template is not active.']
						});
					}
				}
				else {
					dfd.resolve({
						success: false,
						errors: ['Template webMapLayer path does not match sublayer Id.']
					});
				}
			}
			else {
				dfd.resolve({
					success: false,
					errors: [response.error]
				});
			}
		});
		return dfd.promise();
	},
	deleteFeatureAndMarker: function(layer, featureId, markerId) {
		// TODO: SF deletion
		var dfd = jQuery.Deferred();
		ArcGIS.featureLayerHelpers.deleteFeature(layer, featureId, markerId).then(function(response) {
			console.log('deleteFeature', response);
			dfd.resolve(response);
		});
		return dfd.promise();
	},
	addFeature: function(layer, latitude, longitude, attributes) {
		var dfd = jQuery.Deferred();
		if (attributes) {
			var response = ArcGIS.featureLayerHelpers.validateAttributes(attributes, layer.fields);
			if (!response.valid) {
				dfd.resolve({
					success: false,
					errors: response.errors
				});
				return dfd.promise();
			}
		}
		ArcGIS.featureLayerHelpers.addFeatureByURL(layer.layerData.url, layer.spatialReference, latitude, longitude, attributes).then(function(response) {
			if (response.success) {
				dfd.resolve(response);
			}
			else {
				dfd.resolve({
					success: false,
					errors: [response.error]
				});
			}
		});
		return dfd.promise();
	},
	updateFeature: function(layer, featureId, attributes, latitude, longitude) {
		var dfd = jQuery.Deferred();
		if (attributes) {
			var errors = ArcGIS.featureLayerHelpers.validateAttributes(attributes, layer.fields);
			if (errors.length > 0) {
				dfd.resolve({
					success: false,
					errors: errors
				});
				return dfd.promise();
			}
		}
		ArcGIS.featureLayerHelpers.updateFeatureByURL(layer.layerData.url, featureId, attributes, layer.spatialReference, latitude, longitude).then(function(response) {
			if (response.success) {
				dfd.resolve(response);
			}
			else {
				dfd.resolve({
					success: false,
					errors: [response.error]
				});
			}
		});
		return dfd.promise();
	},
	deleteFeature: function(layer, featureId) {
		var dfd = jQuery.Deferred();
		ArcGIS.featureLayerHelpers.deleteFeaturebyUrl(layer.layerData.url, featureId).then(function(response) {
			if (response.success) {
				dfd.resolve(response);
			}
			else {
				dfd.resolve({
					success: false,
					errors: [response.error]
				});
			}
		});
		return dfd.promise();
	},
	retrieveTemplatesDataById: function(id) {
		var dfd = jQuery.Deferred();
		var requestData = {
			ajaxResource : 'QueryBuilderAPI',
			securityToken: MASystem.MergeFields.Security_Token,
			action: 'editArcGISWebMapLayer',
			recId : id
		};
		ArcGIS.ajaxRequest(requestData).then(function(response) {
			console.log('retrieveTemplatesDataById', response);
			if(response.success) {
				var record = response.data[0];
				templatesData = record.maps__ArcGISWebMapC2C__c != undefined ? JSON.parse(record.maps__ArcGISWebMapC2C__c) : [];
				dfd.resolve({
					success: true,
					templatesData: templatesData
				});
			}
			else {
				dfd.resolve({
					success: false,
					error: 'Failed to retrieve templates data.'
				});
			}
		}, {
			buffer: false,
			escape: false,
            timeout: ArcGIS.timeoutInMilliseconds
		});
		return dfd.promise();
	},
	retrieveTemplatesDataByLayer: function(layer) {
		return ArcGIS.featureLayerHelpers.retrieveTemplatesDataById(ArcGIS.getIdFromLayerId(layer.layerId));
	},
	retrieveTemplateDataById: function(id, templateName) {
		var dfd = jQuery.Deferred();
		ArcGIS.featureLayerHelpers.retrieveTemplatesDataById(id).then(function(response) {
			console.log('retrieveTemplateDataById', response);
			if (response.success) {
				response.templatesData.forEach(function(templateData) {
					if (templateData.templateName == templateName) {
						dfd.resolve({
							success: true,
							templateData: templateData
						});
					}
				});
				dfd.resolve({
					success: false,
					error: 'Failed to find template.'
				});
			}
			else {
				dfd.resolve(response);
			}
		});
		return dfd.promise();
	},
	retrieveTemplateDataByLayer: function(layer, templateName) {
		return ArcGIS.featureLayerHelpers.retrieveTemplateDataById(ArcGIS.getIdFromLayerId(layer.layerId), templateName);
	},
    aggregateByEvent: function(event, layerId) {
        ArcGIS.featureLayerHelpers.aggregate(event.latLng.lat(), event.latLng.lng(), layerId, event.feature.getProperty('sublayerId'), event.feature.getId());
    },
    aggregate: function(latitude, longitude, layerId, sublayerId, featureId) {
		var feature = ArcGIS.plotHelpers.highlightFeatureById(layerId, sublayerId, featureId);
        shape_cluster_popup({
            position: new google.maps.LatLng(latitude, longitude),
            type: 'shape',
            feature: feature
        });
    },
	searchByAttribute: function($layer, searchTerm) {
		var records = [];
		var layerId = $layer.attr('qid');
		var sublayers = ArcGIS.layers[layerId].sublayers;
		Object.keys(sublayers).forEach(function(sublayerId) {
			var sublayer = sublayers[sublayerId];
			if (sublayer.class == 'placeholder' || sublayer.type != 'ArcGISFeatureLayer') return;

			sublayer.forEach(function(feature) {
				if (feature.getGeometry().getType() != 'Point') return false;
				var title;
				sublayer.fields.forEach(function(field){
					var fieldValue = (ArcGIS.featureLayerHelpers.getFieldValue(feature, field.name) || '').toString();
					if (fieldValue.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
						title = field.name + ': ' + fieldValue;
						return false;
					}
				});
				if (title) {
					var record = {
						marker: new google.maps.Marker({
							position: feature.getGeometry().get()
						}),
						type: 'feature',
						layerId: layerId,
						sublayerId: sublayerId,
						Id: feature.getId()
					};
					record.marker.title = title;
					record.marker.qid = layerId;
					record.marker.record = {
						Id: record.Id
					};
					records.push(record);
				}
			});
		});
		return records;
    },
	onClickSearchByAttribute: function(record) {
		MA.map.panTo(record.marker.getPosition());
		// https://developers.google.com/maps/documentation/javascript/maxzoom
		MA.map.setZoom(18);
	},
	searchByShape: function($layer, markerLayersInfo, shape, shapeManager, onAddFeature, updateLayerIndex, checkLayerIndex) {
		var records = [];
		var layerId = $layer.attr('qid');
		var sublayers = ArcGIS.layers[layerId].sublayers;
		// Group layer replaced with its child layers
		updateLayerIndex(-1);
		Object.keys(sublayers).forEach(function(sublayerId) {
			var sublayer = sublayers[sublayerId];
			if (sublayer.type != 'ArcGISFeatureLayer') return;

			// Child layer started
			updateLayerIndex(1);
			// Use a local variable to get the correct scope inside the onmessage callback function.
			var layerInfo = {
				layerId : layerId + ':' + sublayerId,
				dataType : $layer.attr('data-type'),
				type : 'feature',
				name : $layer.data('name') + ':' + sublayer.title,
				markers : [],
				tooltips: [],
				totalRecords: 0,
				hasAggregates: false
			};

			sublayer.fields.forEach(function(field){
				switch (field.type) {
					case 'esriFieldTypeDouble':
					case 'esriFieldTypeInteger':
					case 'esriFieldTypeSingle':
					case 'esriFieldTypeSmallInteger':
						if (!layerInfo.hasAggregates) layerInfo.hasAggregates = true;
						layerInfo.tooltips.push({
							FieldName: field.name,
							FieldLabel: field.alias,
							sum: 0,
							avg: null,
							min: null,
							max: null
						})
						break;
				}
			})

			function addFeature(feature) {
				onAddFeature();
				layerInfo.totalRecords++;

				var record = {
					marker: new google.maps.Marker({
						position: feature.getGeometry().get()
					}),
					Id: feature.getId()
				};
				record.marker.qid = layerId;
				record.marker.record = {
					Id: record.Id
				};

				records.push(record);
				layerInfo.markers.push(record.marker);

				layerInfo.tooltips.forEach(function(tooltip) {
					var fieldValue = ArcGIS.featureLayerHelpers.getFieldValue(feature, tooltip.FieldName);
					if (fieldValue != undefined) {
						tooltip.sum += parseFloat(fieldValue);
						tooltip.avg = tooltip.sum / layerInfo.totalRecords;
						if (tooltip.min == null || fieldValue < tooltip.min) tooltip.min = fieldValue;
						if (tooltip.max == null || fieldValue > tooltip.max) tooltip.max = fieldValue;
					}
				});
			}

			var requestData;
			var userWorker = true;
			try {
				requestData = normalizeShape(shape);
				if(requestData.type == 'legacy') {
					userWorker = false;
				}
			}
			catch(e) {
				userWorker = false;
			}

			if (window.Worker && userWorker) {
				var recMap = {};
				sublayer.forEach(function(feature) {
					if (feature.getGeometry().getType() != 'Point') return false;

					var featureId = feature.getId();
					var markerPos = feature.getGeometry().get();
					recMap[featureId] = [markerPos.lat(), markerPos.lng()];
				});

				var requestData = normalizeShape(shape);
				requestData.dataRegion = getProperty(MASystem, 'Organization.dataRegion', false);
				requestData.points = JSON.stringify(recMap);
				requestData.path = JSON.stringify(requestData.path);
				requestData.cmd = 'pointsInShape';
				requestData.externalScripts = JSON.stringify([MA.resources.MAShapeProcess]);

				var pointWorker = new Worker(MA.resources.MAWorker);
				pointWorker.postMessage(requestData);
				pointWorker.onmessage = function(e) {
					var res = e.data;
					if(res && res.success) {
						var pointsInPolygon = [];
						try {
							pointsInPolygon = JSON.parse(res.data);
						}
						catch(e) {
							pointsInPolygon = [];
						}
						pointsInPolygon.forEach(function(featureId) {
							addFeature(sublayer.getFeatureById(featureId));
						});
						if (layerInfo.totalRecords > 0) markerLayersInfo.push(layerInfo);
						checkLayerIndex();
					}
					pointWorker.terminate();
				};
			}
			else {
				// Fall back to old method, each loop
				sublayer.forEach(function(feature) {
					if (feature.getGeometry().getType() != 'Point') return false;
					if (shapeManager.containsLatLng(feature.getGeometry().get())) {
						addFeature(feature);
					}
				});
				if (layerInfo.totalRecords > 0) markerLayersInfo.push(layerInfo);
				checkLayerIndex();
			}
		});
		return records;
	}
};
