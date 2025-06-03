ArcGIS.layerLegendHelpers = {
	getSublayerTitle: function(layerData, layerDefinition) {
		var sublayerTitle;
		if (layerData.title) {
			sublayerTitle = layerData.title + (layerDefinition != undefined ? ArcGIS.fieldSeparator + ' ' + (layerDefinition.title || layerDefinition.name) : '');
		}
		else {
			sublayerTitle = (layerDefinition != undefined ? layerDefinition.title || layerDefinition.name : 'Untitled');
		}
		return sublayerTitle;
	},
	createSublayerLegend: function(options) {
		var sublayerId = options.layerData.id + (options.layerDefinition != undefined ? ArcGIS.fieldSeparator + options.layerDefinition.name : '');
		var sublayer = ArcGIS.layers[options.layerId].sublayers[sublayerId];
		var sublayerTitle = ArcGIS.layerLegendHelpers.getSublayerTitle(options.layerData, options.layerDefinition);
		sublayer.legendId = options.layerId + ArcGIS.fieldSeparator + sublayerId;
		var legend;

		if (MA.isMobile) {
			legend = $('#templates .legend-item-ArcGISLayer.template').clone().removeClass('legend-item-ArcGISLayer template').addClass('legend-item').html()
				.replace(/::legendCheckboxId::/g, sublayer.legendId)
				.replace(/::layerId::/g, options.layerId)
				.replace(/::sublayerId::/g, sublayerId)
				.replace(/::type::/g, 'ArcGISLayer')
				.replace(/::dataRule::/g, '0')
				.replace(/::Label::/g, sublayerTitle)
				.replace(/::Marker::/g, options.style ? options.style : '')
				.replace(/::isAuto::/g, '')
				.replace(/::OTHER::/g, '');
		}
		else {
			legend =
				'<tr class="agol-legend-row" id="' + sublayer.legendId + '"><td class="legend-checkbox-wrapper">' +
				'<input type="checkbox" class="agol-legend-checkbox" checked="checked" ' +
					'onchange="ArcGIS.layerLegendHelpers.onClickSublayerLengendCheckbox(this, \'' + options.layerId + '\', \'' + sublayerId + '\');" />' +
				'<label></label></td><td class="legend-text">' + sublayerTitle + '</td></tr>' +
				(options.style ? '<tr class="agol-legend-row"><td class="legend-checkbox-wrapper"></td><td class="legend-text">' + options.style + '</td></tr>' : '');
		}

		if (options.error) {
			ArcGIS.layers[options.layerId].sublayers[sublayerId].error = options.error;
			var error = sublayerTitle + ': ' + options.error;
			var unauthorizedUrl;

			try {
				if (error.indexOf('Unauthorized endpoint') > -1) {
					var textToFind = 'endpoint = ';
					var urlStartIndex = error.indexOf(textToFind);

					if (urlStartIndex > -1) {
						unauthorizedUrl = error.substring(urlStartIndex + textToFind.length);
						unauthorizedUrl = unauthorizedUrl.split(' ')[0];
						textToFind = '.com';
						var dotComIndex = unauthorizedUrl.indexOf(textToFind);

						if (dotComIndex > -1) {
							unauthorizedUrl = unauthorizedUrl.substring(0, dotComIndex + textToFind.length);
						}

						error = unauthorizedUrl ? window.formatLabel(MASystem.Labels.Layers_ArcGIS_Unauthorized_Remote_Site, [unauthorizedUrl]) : error;
					}
				}
			} catch(err) {
				console.warn(err);
			}

			var timeOut = unauthorizedUrl ? null : 3000;
			if (!options.hideError) {
				MAToastMessages.showError({
					message: error,
					timeOut: timeOut,
					extendedTimeOut: 0,
					onclick: unauthorizedUrl ? function () { CopyToClipboardText(unauthorizedUrl) } : null
				});
			}
		}
		else {
			delete ArcGIS.layers[options.layerId].sublayers[sublayerId].error;
		}
		return legend;
	},
	createUnauthorizedLayerLegend: function(options) {
		var hostURL = extractHostURL(options.requestURL);
		var error = window.formatLabel(MASystem.Labels.Layers_ArcGIS_Unauthorized_Remote_Site, [hostURL]);
		if (!ArcGIS.unauthorizedServers[options.layerId]) {
			ArcGIS.unauthorizedServers[options.layerId] = [];
		}
		if (!ArcGIS.unauthorizedServers[options.layerId].includes(hostURL.toLowerCase())) {
			ArcGIS.unauthorizedServers[options.layerId].push(hostURL.toLowerCase());
			MAToastMessages.showError({
				message: error,
				timeOut: null,
				extendedTimeOut: 0,
				onclick: function () { CopyToClipboardText(hostURL) }
			});
		}
		return ArcGIS.layerLegendHelpers.createSublayerLegend({
			layerId: options.layerId,
			layerData: options.layerData,
			layerDefinition: options.layerDefinition,
			error: error,
			hideError: true
		});
	},
    onClickSublayerLengendCheckbox: function(checkbox, layerId, sublayerId) {
        if (ArcGIS.layers[layerId]) {
            var sublayers = ArcGIS.layers[layerId].sublayers;
            Object.keys(sublayers).forEach(function(id) {
                if (id == sublayerId) {
					var sublayer = sublayers[sublayerId];
					if (sublayer.error) {
						$(checkbox).prop('checked', false);
						MAToastMessages.showError({
							message: sublayer.error,
							timeOut: sublayer.error.indexOf('Unauthorized remote site') > -1 ? 0 : 3000,
							extendedTimeOut: 0
						});
					}
					if ($(checkbox).is(':checked')) {
						sublayer.show();
					}
					else {
						sublayer.hide();
					}
                    return false;
                }
            });
			ArcGIS.plotHelpers.showCopyrightText();
        }
    }
};
