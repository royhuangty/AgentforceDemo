ArcGIS.click2CreateHelpers = {
    connectWebMap: function() {
		if (!$('.arc-config-input').is(':visible')) {
			var options = $('#CreateNewArcGISWebMapPopup').data().options || {}
			var fieldMappings = $('#CreateNewArcGISWebMapPopup').data().fieldMappings || []
			var layerName = $('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').val() || '--None--';
			var layerDescription = $('div#CreateNewArcGISWebMapPopup').find('input[name="Description"]').val() || '--None--';
			var layerWebMapURL = $('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').val() || '--None--';
			var webMapOptions = {
				layerWebMapURL: layerWebMapURL,
				layerId: getProperty(options, 'id', false) || '',
				fieldMappingTemplates: fieldMappings
			};
			ArcGIS.click2CreateHelpers.createTemplateForm(webMapOptions);
		}
    },
	toggleTemplateForm: function(on, callbackFunction) {
        var analyzeCallback = callbackFunction != null ? callbackFunction : function() {}
        //since there are a couple of places that we can toggle the fieldMap form on we are
        //just gonna go ahead and create a function for it.
        if (on.toLowerCase == 'show') {
            $("#webMapTemplateTable").removeClass('fadeInLeft');
        }
        else {
            $("#webMapTemplateTable").addClass('fadeInLeft');
        }
        try {
            analyzeCallback();
        }
        catch (ex) {
        }
    },
    createTemplateForm: function(mapOptions) {
        var dfd = jQuery.Deferred();
		var url = mapOptions.layerWebMapURL;
		var found;
		if (found = url.match(/[?&](webmap|layers)=[0-9a-z,]+/)) {
			switch (found[1]) {
				case 'webmap':
					ArcGIS.click2CreateHelpers.createTemplateFormForWebMap(mapOptions).then(function(response) {
						dfd.resolve(response);
					});
					break;
				case 'layers':
					ArcGIS.click2CreateHelpers.createTemplateFormForWebMapLayers(mapOptions).then(function(response) {
						dfd.resolve(response);
					});
					break;
				default:
					MAToastMessages.showWarning({
						message: MASystem.Labels.AGISLB_Error_Use_Web_Map_Url,
						timeOut: 3000,
						extendedTimeOut: 0
					});
					dfd.resolve({
						success: false
					});
					break;
			}
		}
		else if (url.indexOf('/rest/') > -1 && ArcGIS.plotHelpers.guessLayerTypeFromURL(url) == 'ArcGISFeatureLayer') {
			ArcGIS.click2CreateHelpers.createTemplateFormForRESTLayer(mapOptions).then(function(response) {
				dfd.resolve(response);
			});
		}
		else {
			MAToastMessages.showWarning({
				message: MASystem.Labels.AGISLB_Error_Use_Web_Map_Url,
				timeOut: 3000,
				extendedTimeOut: 0
			});
			dfd.resolve({
				success: false
			});
		}
		return dfd.promise();
	},
	createTemplateFormForWebMap: function(mapOptions) {
        var dfd = jQuery.Deferred();

        var featureLayerData = {};
        var itemId = mapOptions.layerWebMapURL.split('webmap=')[1];
        var webMapURL = mapOptions.layerWebMapURL;
        var layerId = getProperty(mapOptions, 'layerId', false) || '';
        var $c2cLoading = MAToastMessages.showLoading({
			message: MASystem.Labels.AGISLB_Connecting_Message,
			timeOut: 0,
			extendedTimeOut: 0
		});

        var requestData = {
            ajaxResource: 'ArcGISAPI',
            securityToken: MASystem.MergeFields.Security_Token,
            action: 'requestItemData',
            accessToken: ArcGIS.tokenHelpers.getAccessToken(webMapURL),
            itemId: itemId
        };
        ArcGIS.ajaxRequest(requestData).then(function(response) {
            var responseData = getProperty(response, 'data', false) || { error: true };
            if (getProperty(responseData, 'error', false)) {
                $c2cLoading.remove();
                MAToastMessages.showError({
					message: MASystem.Labels.Layers_ArcGIS_Cannot_Connect,
					timeOut: 3000,
					extendedTimeOut: 0
				});
                ArcGIS.agolLogin(layerId, false, webMapURL);
            }
            else {
				$c2cLoading.remove();

				var layers = [];
				var fields = {};

				// TODO: Revisit this object
				var ESRILayerInformation = {};
				ESRILayerInformation.layerInfo = getProperty(response, 'data') || {};
				if (ESRILayerInformation.layerInfo.operationalLayers) {
					ESRILayerInformation.layerInfo.operationalLayers.forEach(function(operationalLayer) {
						// popupInfo may not be in the root of operationalLayer.
						if (operationalLayer.layerType == "ArcGISFeatureLayer" && operationalLayer.popupInfo) {
							layers.push(operationalLayer);
							var fieldInfo = [];
							operationalLayer.popupInfo.fieldInfos.forEach(function(field) {
								fieldInfo.push({
									fieldName: field.fieldName,
									label: field.label
								});
							});

							fields[operationalLayer.id] = {
								label: operationalLayer.title,
								fieldInfo: fieldInfo
							}
						} else if (operationalLayer.featureCollection) {
							// featureCollection
							if (operationalLayer.featureCollection.layers) {
								operationalLayer.featureCollection.layers.forEach(function(featureLayer) {
									var fieldInfo = [];
									featureLayer.popupInfo.fieldInfos.forEach(function(field) {
										fieldInfo.push({
											fieldName: field.fieldName,
											label: field.label
										})
									})
									// create unique id for featureLayer by appending its' id to the parent operationalLayer id
									featureLayer.id = operationalLayer.id + featureLayer.layerDefinition.id;	
									featureLayer.title = featureLayer.layerDefinition.name;
									fields[featureLayer.id] = {
										label: featureLayer.title,
										fieldInfo: fieldInfo
									}
									layers.push(featureLayer);
								})
							}
						}
					});
				}

				ArcGIS.click2CreateHelpers.buildTemplateForm(mapOptions, ESRILayerInformation, layers, fields);

				dfd.resolve({
					success: true
				});
            }
        });

        return dfd.promise();
    },
	createTemplateFormForWebMapLayers: function(mapOptions) {
        var dfd = jQuery.Deferred();

		var removeDuplicateLayers = true;
		var webMapURL = mapOptions.layerWebMapURL;
		var found = webMapURL.match(/[?&]layers=([0-9a-z,]+)/);
		var sublayerIds = found[1].split(',');

		if (removeDuplicateLayers) sublayerIds = unique(sublayerIds);
		var layersCount = sublayerIds.length;

		var layers = [];
		var fields = {};

		sublayerIds.forEach(function(sublayerId, index) {
			var requestData = {
				ajaxResource: 'ArcGISAPI',
				securityToken:MASystem.MergeFields.Security_Token,
				action: 'get',
				requestURL: 'https://www.arcgis.com/sharing/rest/content/items/' + sublayerId + ArcGIS.tokenHelpers.createAccessTokenParameter(webMapURL, 1, 1) + 'f=json'
			};
			ArcGIS.ajaxRequest(requestData).then(function(response) {
				if (response.success && !getProperty(response, 'data.error')) {
					var layerData = getProperty(response, 'data');
					if (layerData.url) {
						layerData.layerType = ArcGIS.plotHelpers.guessLayerTypeFromURL(layerData.url);
						if (layerData.layerType == 'ArcGISFeatureLayer') {
							layerData.id = index;
							layerData.title = layerData.title || layerData.name;

							layers.push(layerData);

                            var fieldInfo = [];
                            var fieldData = getProperty(layers, 'fields', false) || [];
                            fieldData.forEach(function(field) {
                                fieldInfo.push({
                                    fieldName: field.name,
                                    label: field.alias
                                });
                            });
							fields[layerData.id] = {
								label: layerData.title,
								fieldInfo: fieldInfo
							};
						}
					}
				}
				if (--layersCount == 0) {
					var layerInfo = mapOptions;

					ArcGIS.click2CreateHelpers.buildTemplateForm(mapOptions, layerInfo, layers, fields);

					dfd.resolve({
						success: true
					});
				}
			});
		});

		return dfd.promise();
	},
	createTemplateFormForRESTLayer: function(mapOptions) {
        var dfd = jQuery.Deferred();

        var layerId = getProperty(mapOptions, 'layerId', false) || '';
        var featureLayerURL = mapOptions.layerWebMapURL;
        var $c2cLoading = MAToastMessages.showLoading({
			message: MASystem.Labels.AGISLB_Connecting_Message,
			timeOut: 0,
			extendedTimeOut: 0
		});

		ArcGIS.serverRequest(layerId, featureLayerURL, featureLayerURL).then(function(response) {
			if (response.success) {
				ArcGIS.plotHelpers.retrieveLayerInfo(featureLayerURL).then(function(response) {
					if (response.success) {
						$c2cLoading.remove();
						var layerInfo = response.layerInfo;
						layerInfo.title = layerInfo.title || layerInfo.name;

						var layers = [];
						var fields = {};

						if (layerInfo.layers) {
							var sublayersCount = layerInfo.layers.length;

							layerInfo.layers.forEach(function(sublayer, index) {
								var sublayerURL = featureLayerURL + '/' + sublayer.id;
								ArcGIS.plotHelpers.retrieveLayerInfo(featureLayerURL).then(function(response) {
									if (response.success) {
										var sublayerInfo = response.layerInfo;
										sublayerInfo.title = sublayerInfo.title || sublayerInfo.name;

										layers.push(sublayerInfo);

										var fieldInfo = [];
										sublayerInfo.fields.forEach(function(field) {
											fieldInfo.push({
												fieldName: field.name,
												label: field.alias
											});
										});
										fields[sublayerInfo.id] = {
											label: sublayerInfo.title,
											fieldInfo: fieldInfo
										};
									}

									if (--sublayersCount == 0) {
										ArcGIS.click2CreateHelpers.buildTemplateForm(mapOptions, layerInfo, layers, fields);

										dfd.resolve({
											success: true
										});
									}
								});
							});
						}
						else {
							layers.push(layerInfo);

							var fieldInfo = [];
							layerInfo.fields.forEach(function(field) {
								fieldInfo.push({
									fieldName: field.name,
									label: field.alias
								});
							});
							fields[layerInfo.id] = {
								label: layerInfo.title,
								fieldInfo: fieldInfo
							};

							ArcGIS.click2CreateHelpers.buildTemplateForm(mapOptions, layerInfo, layers, fields);

							dfd.resolve({
								success: true
							});
						}
					}
					else {
						$c2cLoading.remove();
						MAToastMessages.showError({
							message: MASystem.Labels.Common_Refresh_And_Try_Again_Cannot_Connect,
							timeOut: 3000,
							extendedTimeOut: 0
						});
						dfd.resolve({
							success: false
						});
					}
				});
			}
			else {
				$c2cLoading.remove();
				MAToastMessages.showError({
					message: MASystem.Labels.Common_Refresh_And_Try_Again_Cannot_Connect,
					timeOut: 3000,
					extendedTimeOut: 0
				});
				dfd.resolve({
					success: false
				});
			}
		});

		return dfd.promise();
	},
	buildTemplateForm: function(mapOptions, layerInfo, layers, fields) {
		MAToastMessages.showSuccess({
			message: MASystem.Labels.AGISLB_Connected,
			timeOut: 3000,
			extendedTimeOut: 0
		});
		//We are checking to see if we have any preexisting templates. If so then we want to show the list of templates instead of the blank form.
		var fieldMappingTemplateArray = getProperty(mapOptions, 'fieldMappingTemplates', false) || [];
		$('#CreateNewArcGISWebMapPopup #webMapTemplateTable').data('ESRILayerInformation', layerInfo);
		$('#CreateNewArcGISWebMapPopup #webMapTemplateTable').data('webMapOptions', mapOptions);

		if (fieldMappingTemplateArray.length > 0) {
			ArcGIS.click2CreateHelpers.toggleTemplateForm('hide');
		}
		else {
			var configureInputTemplate = $('#arc-config-input-template > .arc-config-input').clone();
			var configureFieldMapTemplate = $('#arc-field-mapping-template > .arc-field-mapping-input').clone();
			$(".arc-config-input-wrapper").append(configureInputTemplate);
			$(".arc-config-input-wrapper select").addClass('select2-input');
			$('#fieldMappingsWrapper').append(configureFieldMapTemplate);
			$(".arc-config-input-wrapper .select2-input").select2();
			$(".arc-config-input-wrapper").addClass('fadeInDown');
			$("#fieldMappingsWrapper").addClass('fadeInDown');
			$("#fieldMappingsWrapper .select2-input").select2();

			$('.arc-config-input-wrapper .slds-form-element:last-child .select2-input').change(function() {
				$('#fieldMappingsWrapper article').removeClass("disabled");
			});;

			if (layers.length > 0) {
				var $sObjectSelect = $('.arc-config-input-wrapper .salesforce-object-select');
				var sObjectSelectHasOriginalOption = $sObjectSelect.has('original-value');

				//now that we have populated our object select list we need to start checking for when the user selects one so we can put the correct options in the record
				//type and field set select lists.
				$sObjectSelect.on('change', function() {
					$('.arc-config-input-wrapper .record-type-select').empty();
					$('.arc-config-input-wrapper .field-set-select').empty();
					$('.arc-config-input-wrapper .latitude-select').empty();
					$('.arc-config-input-wrapper .longitude-select').empty();

					var $c2cLoading = MAToastMessages.showLoading({
						message: MASystem.Labels.Layers_ArcGIS_Retrieving_Fields,
						timeOut: 0,
						extendedTimeOut: 0
					});

					//get the object information for the currently selected sObject, then add the return data to our remaining select lists.
					ArcGIS.click2CreateHelpers.getFieldSets($(this).val()).then(function(objectFieldSetInformation) {
						var recordTypeInfo = getProperty(objectFieldSetInformation, 'recordTypeInfo', false || []);
						ArcGIS.fieldSetInformation = getProperty(objectFieldSetInformation, 'fieldSetInfo', false || {});
						var latlngFields = getProperty(objectFieldSetInformation, 'geoFieldsInfo', false || []);
						var latlngOptions = '';
						$.each(latlngFields, function(k, v) {
							latlngOptions += '<option value="' + v.value + '">' + v.label + '</option>';
						});
						$('.arc-config-input-wrapper .latitude-select').append(latlngOptions).val($('.arc-config-input-wrapper .latitude-select').attr('data-default')).change();
						$('.arc-config-input-wrapper .longitude-select').append(latlngOptions).val($('.arc-config-input-wrapper .longitude-select').attr('data-default')).change();
						for (k in recordTypeInfo) {
							var rt = recordTypeInfo[k];
							var userSelectedValue = $('.arc-config-input-wrapper .record-type-select').attr('data-default');
							if (k == userSelectedValue) {
								$('.arc-config-input-wrapper .record-type-select').append('<option value="' + rt.getId + '" selected="selected">' + rt.getName + '</option>').addClass('field-mapping-select');
							}
							else {
								$('.arc-config-input-wrapper .record-type-select').append('<option value="' + rt.getId + '">' + rt.getName + '</option>').addClass('field-mapping-select');
							}
						};
						for (k in ArcGIS.fieldSetInformation) {
							var fsi = ArcGIS.fieldSetInformation[k];
							var userSelectedValue = $('.arc-config-input-wrapper .field-set-select').attr('data-default');
							if (k == userSelectedValue) {
								$('.arc-config-input-wrapper .field-set-select').append('<option value="' + k + '" selected="selected">' + fsi.getLabel + '</option>');
							}
							else {
								$('.arc-config-input-wrapper .field-set-select').append('<option value="' + k + '">' + fsi.getLabel + '</option>');
							}
						}
						$('.arc-config-input-wrapper .field-mapping-select').on('change', function() {
							var currentFieldSet = $('.arc-config-input-wrapper .field-set-select').val();
							var currentFeatureLayer = $('.arc-config-input-wrapper .web-map-layer-select').val();

							ArcGIS.click2CreateHelpers.populateFieldMappings(ArcGIS.fieldSetInformation[currentFieldSet], fields[currentFeatureLayer]);
						});
						$('.arc-config-input-wrapper .field-mapping-select').change();
						$c2cLoading.remove();
					});
				});

				layers.forEach(function(layer) {
					$('.arc-config-input-wrapper .web-map-layer-select').append('<option value="' + layer.id + '"' + (layers.length == 1 ? ' selected="selected"' : '') + '>' + layer.title + '</option>');
				});

				var $c2cLoading = MAToastMessages.showLoading({
					message: MASystem.Labels.Layers_ArcGIS_Retrieving_Salesforce_Objects,
					timeOut: 0,
					extendedTimeOut: 0
				});
				ArcGIS.click2CreateHelpers.getObjectsWithFieldSets(null).then(function(objectsWithFieldSets) {
					//We need to loop through our returned objects and populate the salesforce-object-select select list with the results.
					$.each(objectsWithFieldSets, function(iterate, sObject) {
						$sObjectSelect.append('<option value="' + sObject.value + '">' + sObject.label + '</option>');

						if (sObjectSelectHasOriginalOption && $sObjectSelect.attr('original-value') == sObject.value) {
							$sObjectSelect.val($sObjectSelect.attr('original-value'));
							$sObjectSelect.trigger('change');
						}
					});
					$c2cLoading.remove();
				});
			}
		}
	},
    getObjectsWithFieldSets: function() {
        var dfd = jQuery.Deferred();
		// //We need to figure out which objects even have fieldsets created for them so that we dont just return a ton of useless information.
		VueEventBus.$emit('get-objects', { hasFieldSets: true }, false, (res) => {
			if (res.success) {
				var availableObjects = res.data;
				// loop over the objects and return them like previous release.
				// new return is label, name
				// old is label, value
				var objectsToResolve = [];
				for (var i = 0; i < availableObjects.length; i++) {
					var obj = availableObjects[i];
					objectsToResolve.push({
						label: obj.name,
						value: obj.label
					});
				}
				dfd.resolve(objectsToResolve);
			} else {
				console.warn('could not retrieve sfdc object', err);
				dfd.resolve([]);
			}
		});

        return dfd.promise();
    },
    getFieldSets: function(objectName) {
        //we are going to start a promise here
        var dfd = jQuery.Deferred();
        //We need to get all the fieldset information we have for the currently selected object.
        var requestData = {
            objectName: objectName,
            ajaxResource: 'ArcGISAPI',
            securityToken: MASystem.MergeFields.Security_Token,
            action: 'getFieldSet'
        };
		ArcGIS.ajaxRequest(requestData).then(function(response) {
            if (response.success) {
				$('.CreateArcLayerRecordPopup .missingFieldSet').hide();
				$('.CreateArcLayerRecordPopup .createrecord2-step1').show();
                dfd.resolve(response.fieldSetInfo)
                //callBackFunction(response.fieldSetInfo);
			}
			else {
				$('.CreateArcLayerRecordPopup .createrecord2-step1').hide();
				$('.CreateArcLayerRecordPopup .missingFieldSet').show();
			}
        }, {
            buffer: false,
            escape: false,
            timeout: ArcGIS.timeoutInMilliseconds
        });

        return dfd.promise();
    },
    populateFieldMappings: function(fieldSetInfo, featureLayerInfo) {
        var $fieldMapRow = $('#arc-field-mapping-template .field-match-row.template').clone();
        //field-values-logic-table
        $('#fieldMappingsWrapper .field-match-row').remove();

        var fieldSetMemberInfo = fieldSetInfo.fieldSetMemberInfo;
        var featureLayerInfoArray = featureLayerInfo.fieldInfo;
        var arcGISFieldsSelectOptions = '';
        $.each(featureLayerInfoArray, function(index, fieldInfo) {
            arcGISFieldsSelectOptions += '<option value="' + fieldInfo.fieldName + '">' + fieldInfo.label + '</option>'
        });

        var $uniqueIDSelect = $('#fieldMappingsWrapper .uniqueIDSelect');

        var uniqueIDSelectOptions = '';
        $.each(fieldSetMemberInfo, function(index, fsObject) {
            uniqueIDSelectOptions += '<option value="' + fsObject.fieldPath + '">' + fsObject.fieldLabel + '</option>'

            var $fsObjectRow = $('#arc-field-mapping-template .field-match-row.template').clone().removeClass('template'); //$fieldMapRow;
            $fsObjectRow.attr('data-path', fsObject.fieldPath);
			$fsObjectRow.find('.static-field').html(htmlEncode(fsObject.fieldLabel));
			$fsObjectRow.find('.field-editable').addClass(fsObject.fieldPath + '-editable');
            $fsObjectRow.find('.select2-input-template').append(arcGISFieldsSelectOptions).removeClass('select2-input-template').addClass('select2-input').addClass(fsObject.fieldPath + '-select');
            $('#fieldMappingsWrapper .field-values-logic-table tbody').append($fsObjectRow);
        })
        $uniqueIDSelect.append(uniqueIDSelectOptions);
		var $mappingContainerData = $('#fieldMappingsContainer').data();
		var fieldMappings = getProperty($mappingContainerData, 'fieldMappings') || [];
        $.each(fieldMappings, function(i, fm) {
            if (getProperty(fm, 'webMapPath', false) != null) {
                $('.' + getProperty(fm, 'staticFieldPath', false) + '-editable').prop('checked', !getProperty(fm, 'locked', false));
                $('.' + getProperty(fm, 'staticFieldPath', false) + '-select').val(getProperty(fm, 'webMapPath', false));
            }
		});
        $("#fieldMappingsWrapper .field-values-logic-table tbody .select2-input").select2();
        $uniqueIDSelect.change();
    },
    populateTemplates: function(templateData, callbackFunction) {
        var analyzeCallback = callbackFunction != null && callbackFunction != '' ? callbackFunction : function() {};
        $.each(templateData, function(i, rowData) {
            var webMapLabel = getProperty(rowData, 'webMapLayer.label', false) || '';
            if (webMapLabel != undefined && webMapLabel != '') {
                //webmap-active
                var isActive = getProperty(rowData, 'active', false) || false;
                var templateRow = $('#arc-field-mapping-template .click-2-create-template-row').clone();
                templateRow.find('.web-map-layers').attr('title', rowData.webMapLayer.label).find('div').text(rowData.webMapLayer.label);
                templateRow.find('.salesforce-object').attr('title', rowData.salesforceObject.label).text(rowData.salesforceObject.label);
                templateRow.find('.record-type').attr('title', rowData.recordType.label).text(rowData.recordType.label);
                templateRow.find('.field-set').attr('title', rowData.fieldSet.label).text(rowData.fieldSet.label);
                templateRow.find('.template-name').attr('title', rowData.templateName).find('div').text(rowData.templateName);
                templateRow.find('.webmap-active').attr('checked', isActive);
                templateRow.data('rowData', rowData);

                $('#webMapTemplateTable .WebMapC2CTemplateRows').append(templateRow);
            }
        });

        //we need to update our rows data to reflect the active / inactive pill box.
        $('#webMapTemplateTable .WebMapC2CTemplateRows .webmap-active').on('change', function() {
			var rowData = $(this).closest('.click-2-create-template-row').data();
            rowData.rowData.active = $(this).prop('checked');
        });

        //if the user wants to delete the current layer we need to remove the data and hide the row.
        $('#webMapTemplateTable .delete-template').click(function() {
            var $row = $(this).closest('.click-2-create-template-row');
            var rowData = $row.data().rowData;
            $row.data('rowData', null);
            $row.data('deletedData', rowData);
            $row.hide();
        })
        try {
            //analyzeCallback();
        }
        catch (ex) {
        }
    },
    editTemplate: function(row, webMapOptions, ESRILayerInformation) {
        //Starting a promise
        var dfd = jQuery.Deferred();
        var $c2cLoading = MAToastMessages.showLoading({
			message: MASystem.Labels.Layers_ArcGIS_Retrieving_Details,
			timeOut: 0,
			extendedTimeOut: 0
		});
		var rowData = row.data().rowData;

        ArcGIS.click2CreateHelpers.createTemplateForm(webMapOptions).then(function(res) {
            /*DMT*/
            var mapLayerSelect = $('.arc-config-input-wrapper .web-map-layer-select');
            var mapLayerSelectHasOption = $(mapLayerSelect).find('option[value = "' + rowData.webMapLayer.path + '"]').length > 0;
            $('.arc-config-input-wrapper .web-map-layer-select').val(rowData.webMapLayer.path);
			$('.arc-config-input-wrapper .web-map-template-name').val(rowData.templateName);

            var sfObjectSelect = $('.arc-config-input-wrapper .salesforce-object-select');
            var sfObjectSelectHasOption = $(sfObjectSelect).find('option[value = "' + rowData.salesforceObject.path + '"]').length > 0;

            if (sfObjectSelectHasOption) {
                $(sfObjectSelect).val(rowData.salesforceObject.path);
                $(sfObjectSelect).change();
            }
            else {
                $(sfObjectSelect).attr('original-value', rowData.salesforceObject.path);
            }
            /*DMT*/

            $('#fieldMappingsWrapper .uniqueIDSelect').empty();
            var currentFieldSet = rowData.fieldSet.path; //$('.arc-config-input-wrapper .field-set-select').val();
            var currentFeatureLayer = rowData.webMapLayer.path; //$('.arc-config-input-wrapper .web-map-layer-select').val();
            var featureLayerData = {};
            var itemId = webMapOptions.layerWebMapURL.split('webmap=')[1];
            var webMapURL = webMapOptions.layerWebMapURL;

            var requestData = {
                ajaxResource: 'ArcGISAPI',
                securityToken: MASystem.MergeFields.Security_Token,
                action: 'requestItemData',
                accessToken: ArcGIS.tokenHelpers.getAccessToken(webMapURL),
                itemId: itemId
            };
            ArcGIS.ajaxRequest(requestData).then(function(response) {
                if (response.success) {
                    if (getProperty(response, 'data.error')) {
                		$c2cLoading.remove();
						var message = getProperty(response, 'data.error.message') || '';
						if (message == 'You do not have permissions to access this resource or perform this operation.') {
							if (!ArcGIS.tokenHelpers.hasAccessToken(webMapURL)) {
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
						ESRILayerInformation.layerInfo = getProperty(response, 'data') || {};
                        if (ESRILayerInformation.layerInfo.operationalLayers) {
                            var fieldSetSelect = $('.arc-config-input-wrapper .field-set-select');
                            var fieldSetSelectHasOption = $(fieldSetSelect).find('option[value = "' + rowData.fieldSet.path + '"]').length > 0;

                            if (fieldSetSelectHasOption) {
                                $(fieldSetSelect).val(rowData.fieldSet.path);
                                $(fieldSetSelect).change();
                            }
                            else {
                                $(fieldSetSelect).attr('original-value', rowData.fieldSet.path);
							}
                            $('.arc-config-input-wrapper .record-type-select').val(rowData.recordType.path)//.change();
                            $('.arc-config-input-wrapper .field-set-select').val(rowData.fieldSet.path) //.change();
                            $('.arc-config-input-wrapper .latitude-select').val(rowData.latlng.lat)
                            $('.arc-config-input-wrapper .longitude-select').val(rowData.latlng.lng)
                        }
					}

					$c2cLoading.remove();
                }
                else {
                	$c2cLoading.remove();
					var $layerHTML = $("#PlottedQueriesTable .ArcGISLayer.PlottedRowUnit[qid='" + layerId + "']");
					$layerHTML.remove();
					var message;
					if (response.message) {
						message = response.message;
					}
					else {
						message = MASystem.Labels.AGISLB_No_Web_Map_Found;
					}
					MAToastMessages.showError({
						message: message,
						subMessage: MASystem.Labels.AGISLB_Additional_Error,
						timeOut: 3000,
						extendedTimeOut: 0
					});
                }
            });

            dfd.resolve(rowData, row);
        });

        return dfd.promise();
    },
	createRecordStep1: function(options) {
		options = $.extend({
			isMassAction: false,
			dataLayers: []
		}, options || {});
		if (!options.layerType) {
			return;
		}

		// this existed to fix SF overwritting native Map var, removing on 1/29/18
		// try
		// {
		//     //if not lightning, clear out the map
		//     if (typeof Map === 'function' && (typeof sforce === 'object' && !sforce.one))
		//     {
		//         Map = undefined;
		//     }
		// }
		// catch (ex) {}

		var popup;
		if (MA.isMobile) {
			//reset the popup
			var $c2cPopup = $('#createDataLayerRecordV2');
			$c2cPopup.find('.step2').addClass('hidden');
			$c2cPopup.find('.step1').removeClass('hidden');
			$c2cPopup.find('.createrecordDataLayer2-step1').show();
			$c2cPopup.find('.createrecordDataLayer2-step2').hide();
			$c2cPopup.find('.c2cLoadingWrapper').hide();
			MALayers.showModal('createDataLayerRecordV2');
		}
		else {
			popup = MA.Popup.showMAPopup({
				template: $('#templates .CreateArcLayerRecordPopup').clone(),
				popupId: 'createArcLayerRecord',
				width: 630,
				title: MASystem.Labels.Click2Create_CreateARecord,
				buttons: [{
					text: MASystem.Labels.MA_Next,
					type: 'slds-button_brand step1',
					keepOpen: true,
					onTap: function(e) {
						//get the password and name
						ArcGIS.click2CreateHelpers.createRecordStep2(options.templates);
					}
				}, {
					text: MASystem.Labels.MA_Create_Record,
					type: 'slds-button_brand step2 hidden savec2c',
					keepOpen: true,
					//keepOpen : true,
					onTap: function(e) {
						ArcGIS.click2CreateHelpers.saveRecord();
					}
				}, {
					text: MASystem.Labels.MA_Cancel,
					type: 'slds-button_neutral',
				}]
			});
		}

		var $popup = $('#createArcLayerRecord');

		$popup.find('.MA2-loading-mask').removeClass('hidden');
		$popup.find('.savec2c').attr('disabled', true);
		$popup.removeData();
		$popup.data({ 'popup': popup, 'isMassAction': options.isMassAction });

		//get data
		$popup.find('.createrecord2-fieldset-errors').empty().hide();
		var $objectPicklist = $popup.find('.createrecord2-object').empty();
		$objectPicklist.append('<option value="none">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option>');
		var $fieldSetSelect = $('#createArcLayerRecord .createrecord2-fieldset').empty();
		$fieldSetSelect.append('<option value="none">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option>');
		var $recordTypeSelect = $('#createArcLayerRecord .createrecord2-recordtype').empty();
		$recordTypeSelect.append('<option value="none">' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option>');
		ArcGIS.click2CreateHelpers.getObjectsWithFieldSets().then(function(objectResponse) {
			$objectPicklist.empty();
			var objectString = '';
			var objectsWithTemplates = [];//creating an array to store objects with ARCGIS templates.
			for(var o = 0; o < options.templates.length; o ++){
				var thisTemplate = options.templates[o];
				//no point in adding the same object in to the objectsWithTemplatesArray, only need it once.
				var objectPath = getProperty(thisTemplate,'salesforceObject.path', false);
				if(!objectsWithTemplates.indexOf(objectPath) > -1) {
					objectsWithTemplates.push(objectPath);
				}
			}
			$.each(objectResponse, function(k, v) {
				//Checking to make sure a arc template exists for the object before adding it to the list
				objectString += objectsWithTemplates.indexOf(v.value) > -1 ? '<option value="' + v.value + '">' + v.label + '</option>': '';
				//$objectPicklist.append($('<option />').attr('value',v.value).text(v.label));
			});

			$objectPicklist.append(objectString);
			$objectPicklist.change();
		});
	},
	createRecordStep2: function(templates) {
		var $popup = $('#createArcLayerRecord');
		$popup.find(".createrecord-fieldset").html(MASystem.Labels.MA_Loading_With_Ellipsis);
		var currentSelection = $popup.find('.createrecord2-object').val();

		var missingData = false;
		var fieldSetName = $popup.find('.createrecord2-fieldset option').text() || 'missing';
		var recordTypeId = $popup.find('.createrecord2-recordtype').val();
		var fieldSet = $popup.find('.createrecord2-fieldset').val();
		var relevantTemplates = [];
		var $createrecord2 = $popup.find('.createrecord2-template');
		$createrecord2.empty();
		var templateOptions = '<option value="default">--' + MASystem.Labels.MA_None + '--</option>';
		$.each(templates, function(k, v) {
			var sfo = getProperty(v, 'salesforceObject.path') || '';
			var recType = getProperty(v, 'recordType.path') || '';
			var fs = getProperty(v, 'fieldSet.path') || '';

			if (currentSelection === undefined || currentSelection === null
					|| recordTypeId === undefined || recordTypeId === null
					|| fieldSet === undefined || fieldSet === null) {
				
				missingData = true;
			}

			currentSelection = currentSelection === undefined || currentSelection === null ? '' : currentSelection;
			recordTypeId = recordTypeId === undefined || recordTypeId === null ? '' : recordTypeId;
			fieldSet = fieldSet === undefined || fieldSet === null ? '' : fieldSet;

			if (sfo.toLowerCase() == currentSelection.toLowerCase() && recType == recordTypeId && fieldSet.toLowerCase() == fs.toLowerCase()) {
				relevantTemplates.push(v);
				templateOptions += '<option value ="' + getProperty(v, 'templateName') + '">' + getProperty(v, 'templateName') + '</option>';
			}
		});

		if (missingData) {
			return;
		}

		$createrecord2.append(templateOptions);
		$popup.find('.step1').addClass('hidden');
		$popup.find('.createrecord2-step1').hide();
		$popup.find('.step2').removeClass('hidden');
		$popup.find('.createrecord2-step2').show();
		$popup.find('.savec2c').attr('disabled', true);
		//MA.Popup.showLoading({display:true, popupId: 'CreateArcLayerRecordPopup'})

		$.ajax({
			url: MA.resources.Click2Create,
			type: 'GET',
			dataType: 'HTML',
			data: {
				sobject: currentSelection,
				fieldset: fieldSet,
				recordtypeid: (recordTypeId || ''),
				platform: (MA.IsMobile ? 'tablet' : 'desktop')
			}
		}).done(function(data,textStatus,res) {
			$popup.find('.createrecord-fieldset').html(res.responseText);
			$popup.find('.createrecord-fieldset').data('templates', relevantTemplates);
			$popup.find('.savec2c').removeAttr('disabled');
			$popup.find('.MA2-loading-mask').remove('hidden');
		}).fail(function(err) {
			MA.log(err);
			//callback(res);
		});
	},
	saveRecord: function() {
		MA.Popup.showLoading({ display: true, popupId: 'CreateArcLayerRecordPopup' });
		var $c2cLoading = MAToastMessages.showLoading({
			message: MASystem.Labels.MA_Creating_Record,
			timeOut: 0,
			extendedTimeOut: 0
		});
		$('#CreateArcLayerRecordPopup .savec2c').attr('disabled', 'disabled');
		var $popup = $('#createArcLayerRecord');
		var templateName = $popup.find('.createrecord2-template').val();
		var fieldSetObject = buildFieldSetValues($('#createArcLayerRecord .fieldSetTable'));
		var fields = fieldSetObject.fields;
		var FieldsFoundArray = fieldSetObject.FieldsFoundArray;
		var templates = $popup.find('.createrecord-fieldset').data().templates;
		var latlng = {}
		var fieldsArr = [];

		$.each(templates, function(k, v) {
			if (v.templateName == templateName) {
				latlng = getProperty(v, 'latlng') || {};

			}
		});
		var lat = $('#infowindowMasterTabContentActions').attr('lat');
		var lng = $('#infowindowMasterTabContentActions').attr('lng');
		fieldsArr.push({ name: latlng.lat, value: lat });
		fieldsArr.push({ name: latlng.lng, value: lng });
		$.each(fields, function(name, val) {
			fieldsArr.push({ name: name, value: val });
		});
		fields = fieldsArr;

		var requestData = {
			ajaxResource: 'TooltipAJAXResources',
			action: 'createRecord',
			sobject: $('#createArcLayerRecord .createrecord2-object').val(),
			recordtypeid: $('#createArcLayerRecord .createrecord2-recordtype').val() || '',
			fieldSet: $('#createArcLayerRecord .createrecord2-fieldset').val() || '',
			fields: JSON.stringify(fields)
		};
		ArcGIS.ajaxRequest(requestData).then(function(response) {
			$('#createArcLayerRecord .js-finishC2C').removeAttr('disabled');
			if (MA.isMobile) {
				$('#createArcLayerRecord .c2cLoadingWrapper').hide();
			}
			var $errorList = $('#createArcLayerRecord .createrecord2-fieldset-errors').empty().hide();
			if (!response.success) {
				MAToastMessages.showError({
					message: MASystem.Labels.MA_Something_Went_Wrong,
					subMessage: MASystem.Labels.MA_Record_Not_Created
				});
				if (templateName == 'default') {
					$('<li>Please choose a template first</li>').appendTo($errorList);
				}
				else if (response.errors && response.errors.length > 0) {
					$.each(response.errors, function(i, errMsg) {
						//GET THE ACTUAL FIELD NAME USING MAGIC
						var fieldName = errMsg.split(': ')[1] || null;
						var message = errMsg;

						if (fieldName !== null) {
							var actualName = $('#createArcLayerRecord').find('td[data-field="' + fieldName + '"]').closest('tr').find('.fieldLabel').text().replace(/\*/g, '') || fieldName;
							message = message.replace(fieldName, actualName);
						}

						$('<li/>').text(message).appendTo($errorList);

					});
				}
				else if (response.error) {
					$('<li/>').text(response.error).appendTo($errorList);
				}
				else {
					$(`<li>${MASystem.Labels.Common_Refresh_And_Try_Again_Contact_Admin}</li>`).appendTo($errorList);
				}
				$errorList.show();
				MA.Popup.showLoading({ display: false, popupId: 'createArcLayerRecord' });
			}
			else {
				// create click2CreateSettings object if it doesn't exist already
				if (!userSettings.click2CreateSettings) {
					userSettings.click2CreateSettings = {};
				}
				userSettings.click2CreateSettings.name = templateName ;
				userSettings.click2CreateSettings.record = response.record;

				var recordId = response.record.Id;

				//changing to show a name if changed
				var recordName = userSettings.click2CreateSettings.name; //MA.Util.isBlank(setting.record[type+'Name__c']) ? userSettings.click2CreateSettings.name : $('#createArcLayerRecord .createrecord-fieldset .fieldInput[data-field="'+setting.record[type+'Name__c']+'"]').find('input').val();
				if (recordName == '') {
					//fall back
					recordName = userSettings.click2CreateSettings.name;
				}

				if (MASystem.Organization.DisableClick2CreateMarkers !== true) { // needs to be a primitve boolean true and not a truthy value
					var markerShape = MA.Marker.shapes['Favorite'];
					var marker;
					var position = new google.maps.LatLng(lat, lng);
					if (!(window.ActiveXObject) && "ActiveXObject" in window) {
						marker = new RichMarker({
							map: MA.map,
							position: position,
							anchor: markerShape.anchor.Rich,
							flat: true,
							zIndex: 1000,
							title: recordName,
							record: { Id: recordId },
							content: MAMarkerBuilder.createSVG({ type: 'Marker', color: '#FF8800:Favorite' })
						});
					}
					else {
						marker = new google.maps.Marker({
							map: MA.map,
							position: position,
							icon: {
								url: 'data:image/svg+xml;base64,' + CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(MAMarkerBuilder.createSVG({ type: 'Marker', color: '#FF8800:Favorite' }))),
								anchor: markerShape.anchor
							},
							zIndex: 1000,
							title: recordName,
							address: 'Lat:' + lat + ', Lng: ' + lng,
							baseObject: MA.isMobile ? '{C2C}' + $('#createArcLayerRecord .createrecord2-object').val() : '{C2C}' + $('#createrecord-object').val(),
							record: { Id: recordId, Tasks: [] }
						});
					}
					marker.record.marker = marker;
					MA.Map.click2CreateMarkers.push(marker);

					//handle marker click
					if (MA.isMobile) {
						google.maps.event.addListener(marker, 'click', function(e) { c2c.marker_Click.call(this); });
					}
					else {
						google.maps.event.addListener(marker, 'click', function() {
							//create tooltip content
							var $tooltipContent = $([
								'<div id="tooltip-content" class="ma-arcgis-tooltip">',
								'<div class="tooltip-header">',
								'<div class="name"><a target="_blank" style="font-family: helvetica,arial,sans-serif;font-size: 12px;color: #2265BB;font-weight: bold;text-decoration: none;white-space: normal;" /></div>',
								'<div class="address" style="margin: 3px 0 5px 0;padding: 0;font-family: helvetica,arial,sans-serif;font-size: 11px;font-weight: bold;text-decoration: none;color: #000;white-space: normal;" />',
								'</div>',
								'<div class="layout-tooltip">',
								'<div class="buttonset-section-columns">',
								'<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div></div>' +
								'<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Take_Me_There + '</div></div>' +
								//'<div class="buttoncolumn"><div class="actionbutton checkin">Check In</div></div>' +
								'<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.Context_Remove_Marker + '</div></div>' +
								'</div>',
								'</div>',
								'</div>'
							].join(''));

							//populate values
							if (typeof sforce != 'undefined' && !isDesktopPage && sforce.one) {
								$tooltipContent.find('.name').html('<button style="padding:0px;" class="MAbutton button-small button-blue button-clear" onclick="sforce.one.navigateToSObject(\'' + recordId + '\')">' + htmlEncode(recordName) + '</button>');
								//$tooltipContent.find('.name a').attr('href', '#').text(recordName).click(function () { sforce.one.navigateToSObject(recordId) });
							}
							else {
								$tooltipContent.find('.name a').attr('href', MA.SitePrefix + '/' + recordId).text(recordName);
							}
							$tooltipContent.find('.address').text('Lat:' + lat + ', Lng: ' + lng).click(function() { launchNativeGPS(marker.getPosition().lat(), marker.getPosition().lng()); });

							//update check in button to check out if needed
							if (marker.record.Tasks) {
								$.each(marker.record.Tasks || [], function(index, task) {
									if (!task.IsClosed) {
										$tooltipContent.find('.actionbutton.checkin').data('CheckInId', task.Id).text('Check Out');
										return false;
									}
								});
							}
							if (marker.record.Events) {
								$.each(marker.record.Events || [], function(index, event) {
									if (event.Subject.indexOf('Check In @') == 0) {
										$tooltipContent.find('.actionbutton.checkin').data('CheckInId', event.Id).text('Check Out');
										return false;
									}
								});
							}

							//launch infobubble
							MA.Map.InfoBubble.show({
								position: this.getPosition(),
								anchor: marker,
								minWidth: 420,
								content: $tooltipContent.get(0)
							});

							//handle action button clicks
							$tooltipContent.find('.actionbutton').click(function() {
								var $button = $(this);
								switch ($button.text()) {
									case MASystem.Labels.ActionFramework_Add_to_Trip:
										var c2cRec = {
											id: recordId,
											baseObject: '{C2C}' + $('#createrecord-object').val()
										}
										MAActionFramework.standardActions['Add to Trip'].ActionValue({
											customMarkers: [{ type: 'POI', title: recordName, latlng: marker.getPosition(), address: 'Lat:' + lat + ', Lng: ' + lng, c2cRec: c2cRec }]
										});
										break;
									case MASystem.Labels.ActionFramework_Take_Me_There:
										MAActionFramework.standardActions['Take Me There'].ActionValue({
											customMarkers: [{ type: 'POI', title: recordName, latlng: marker.getPosition(), address: 'Lat:' + lat + ', Lng: ' + lng }]
										});
										break;
									case 'Check In':
										MAActionFramework.standardActions['Check In'].ActionValue({
											button: $button,
											records: [marker.record]
										});
										break;
									case 'Check Out':
										MAActionFramework.standardActions['Check Out'].ActionValue({
											button: $button,
											records: [marker.record]
										});
										break;
									case 'Remove Marker':
										marker.setMap(null);
										break;
								}
								MA.Map.InfoBubble.hide();
							});
						});
					}
				}

				//close the popup
				if (MA.isMobile) {
					MAToastMessages.showSuccess({
						message: MASystem.Labels.MA_Record_Was_Created
					});
					MALayers.hideModal();
				}
				else {
					MA.Map.InfoBubble.hide()
					MA.Popup.closeMAPopup();
				}
			}
			$c2cLoading.remove();
		}, {
			buffer: false,
			escape: false
		});
	},
	populateFields: function() {
		var $popup = $('#createArcLayerRecord');
		var templateName = $popup.find('.createrecord2-template').val();
		var infoWindowData = $('#infowindowMasterTabContentActions').data() || {};
		var layerData = ArcGIS.layers[getProperty(infoWindowData, 'layerid')].sublayers[getProperty(infoWindowData, 'layer')] || {};

		// try getting layerData with sublayerId if we fail to find it with the layerId -> featureLayer
		if (Object.keys(layerData).length === 0 && layerData.constructor === Object) {
			layerData = ArcGIS.layers[getProperty(infoWindowData, 'layerid')].sublayers[getProperty(infoWindowData, 'sublayerid')] || {};
		}
		
		var closureuidVal = getProperty(infoWindowData, 'closureuid', false);
		var featureData = function() { // the common pattern to access data in layer data has always been a letter plus the same letter. (ex. b.b, j.j, etc..)
			for(var prop in layerData) {
				if(layerData[prop].hasOwnProperty(prop.toString())) {
					var accessVal = prop.toString();
					var accessFeatureData = accessVal + '.' + accessVal + '.' + closureuidVal;
					return getProperty(layerData, accessFeatureData, false) || {};
				} 
			}
		};
		var arcFieldInfo = (function() { // the common pattern to access arcFieldInfo is to target the attributes property.
			var featureDataValue = featureData();
			for(var prop in featureDataValue) {
				if(featureDataValue[prop].hasOwnProperty('attributes')) {
					return getProperty(featureDataValue, prop.toString(), false).attributes;
				}
			}
		})();

		var c2cFieldInputs = $('.ClickToCreateFormTable .fieldInput');
		var templates = $popup.find('.createrecord-fieldset').data().templates;
		var fieldMappings = [];

		$.each(templates, function(k, v) {
			if (v.templateName == templateName) {
				fieldMappings = getProperty(v, 'fieldMappings') || [];
				var lat = $('#infowindowMasterTabContentActions').attr('lat');
				var lng = $('#infowindowMasterTabContentActions').attr('lng');
				$popup.find('.createrecord-fieldset .fieldInput[data-field="' + v.latlng.lat + '"]').find('.get-input').val(lat);
				$popup.find('.createrecord-fieldset .fieldInput[data-field="' + v.latlng.lng + '"]').find('.get-input').val(lng);
			}
		});
		$.each(fieldMappings, function(k, v) {
			var fieldPath = getProperty(v, 'staticFieldPath', false) || '';
			var featurePath = getProperty(v, 'webMapPath', false) || '';
			var $field = $('.ClickToCreateFormTable .fieldInput[data-field="' + fieldPath + '"]').find('.get-input');
			$field.val(arcFieldInfo[featurePath]);
			if (getProperty(v, 'locked', false)) {
				$field.prop('disabled', 'disabled');
			}
			else {
				$field.removeProp('disabled');
			}
		});
    },
    validateTemplateData: function(templateData, update) {
        var validDetails = true;
        var $arcInputWrapper = $('.arc-config-input-wrapper');

		if (templateData.templateName == '') {
			$('#web-map-template-name-error-message').remove();
			$arcInputWrapper.find('.web-map-template-name').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.web-map-template-name').closest('.slds-form-element').append('<div id="web-map-template-name-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else if (!update && !ArcGIS.click2CreateHelpers.checkDuplicateTemplateNames(templateData)) {
			$('#web-map-template-name-error-message').remove();
			$arcInputWrapper.find('.web-map-template-name').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.web-map-template-name').closest('.slds-form-element').append('<div id="web-map-template-name-error-message" class="slds-form-element__help">You have already created a template with this name. Please use a different name.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.web-map-template-name').closest('.slds-form-element').removeClass('slds-has-error');
			$('#web-map-template-name-error-message').remove();
		}
		if (templateData.webMapLayer.label == '--Select--' || templateData.webMapLayer.path == null) {
			$('#web-map-layer-select-error-message').remove();
			$arcInputWrapper.find('.web-map-layer-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.web-map-layer-select').closest('.slds-form-element').append('<div id="web-map-layer-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.web-map-layer-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#web-map-layer-select-error-message').remove();
		}
		if (templateData.salesforceObject.label == '--Select--' || templateData.salesforceObject.path == null) {
			$('#salesforce-object-select-error-message').remove();
			$arcInputWrapper.find('.salesforce-object-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.salesforce-object-select').closest('.slds-form-element').append('<div id="salesforce-object-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.salesforce-object-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#salesforce-object-select-error-message').remove();
		}
		if (templateData.recordType.label == '--Select--' || templateData.recordType.path == null) {
			$('#record-type-select-error-message').remove();
			$arcInputWrapper.find('.record-type-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.record-type-select').closest('.slds-form-element').append('<div id="record-type-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.record-type-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#record-type-select-error-message').remove();
		}
		if (templateData.latlng.lat == null) {
			$('#latitude-select-error-message').remove();
			$arcInputWrapper.find('.latitude-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.latitude-select').closest('.slds-form-element').append('<div id="latitude-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.latitude-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#latitude-select-error-message').remove();
		}
		if (templateData.latlng.lng == null) {
			$('#longitude-select-error-message').remove();
			$arcInputWrapper.find('.longitude-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.longitude-select').closest('.slds-form-element').append('<div id="longitude-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.longitude-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#longitude-select-error-message').remove();
		}
		if (templateData.fieldSet.label == '--Select--' || templateData.fieldSet.path == null) {
			$('#field-set-select-error-message').remove();
			$arcInputWrapper.find('.field-set-select').closest('.slds-form-element').addClass('slds-has-error');
			$arcInputWrapper.find('.field-set-select').closest('.slds-form-element').append('<div id="field-set-select-error-message" class="slds-form-element__help">This field is required.</div>');
			validDetails = false;
		}
		else {
			$arcInputWrapper.find('.field-set-select').closest('.slds-form-element').removeClass('slds-has-error');
			$('#field-set-select-error-message').remove();
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
	checkDuplicateTemplateNames: function(templateData) {
		var validName = true;
		var templateId = templateData.templateName.toLowerCase() +
			ArcGIS.fieldSeparator + templateData.salesforceObject.label +
			ArcGIS.fieldSeparator + templateData.recordType.label +
			ArcGIS.fieldSeparator + templateData.fieldSet.label;

		$.each($('#webMapTemplateTable .WebMapC2CTemplateRows').children(), function(i, row) {
			var rowData = $(row).data('rowData');
			if (rowData) {
				var rowId = rowData.templateName.toLowerCase() +
					ArcGIS.fieldSeparator + rowData.salesforceObject.label +
					ArcGIS.fieldSeparator + rowData.recordType.label +
					ArcGIS.fieldSeparator + rowData.fieldSet.label;
				if (templateId == rowId) {
					validName = false;
					return false;
				}
			}
		});

		return validName;
	}
};
