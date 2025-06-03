ArcGIS.styleHelpers = {
	getValue: function(feature, renderer) {
		var value;
		if (renderer.field) {
			value = ArcGIS.featureLayerHelpers.getFieldValue(feature, renderer.field);
		}
		else if (renderer.field1) {
			value = ArcGIS.featureLayerHelpers.getFieldValue(feature, renderer.field1);
		}
		else if (renderer.valueExpression) {
			value = ArcGIS.Arcade.evaluate(feature, renderer.valueExpression);
		}
		return value;
	},
	createSvgUrl: function(svg) {
		var xmlns = 'http://www.w3.org/2000/svg';
		if (svg.indexOf('xmlns="' + xmlns + '"') == -1) {
			svg = svg.replace(/^(<svg)/, '$1 xmlns="' + xmlns + '"');
		}
		return 'data:image/svg+xml;base64,' + CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(svg));
	},
	createHexFromEsriColor: function(color) {
		color = color || [0, 0, 0, 0];
		var hex = '#';
		color.forEach(function(c) {
			c = c.toString(16);
			if (c.length % 2 > 0) {
				c = '0' + c;
			}
			hex += c;
		});
		return hex;
	},
	createRgbaFromEsriColor: function(color) {
		color = color || [0, 0, 0, 0];
		return 'rgba(' + color[0] + ',' + color[1] +',' + color[2] + ','+ color[3]/255 + ')';
	},
	createStyleFromEsriPMSSymbol: function(symbol, opacity, zIndex) {
		var scaleFactor = 1.3; // Experimental
		var width = scaleFactor * symbol.width;
		var height = scaleFactor * symbol.height;
		var xoffset = symbol.xoffset || 0;
		var yoffset = symbol.yoffset || 0;
		var contentType = symbol.contentType || '';
		var imageData = symbol.imageData || '';
		var url = contentType != '' && imageData != '' ? 'data:' + contentType + ';base64,' + imageData : ArcGIS.secureURL(symbol.url);
		var style = {
			map: {
				icon: {
					url: url,
					scaledSize: new google.maps.Size(width, height),
					anchor: new google.maps.Point(xoffset + 0.5 * width, yoffset + 0.5 * height)
					// XXX: Base64-encoded image data inside based64-encoded SVG doesn't work?
//					url: contentType != '' && imageData != '' ? ArcGIS.styleHelpers.createSvgUrl('<svg overflow="hidden" width="30" height="20" style="touch-action: none;"><image fill-opacity="0" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="-10" y="-10" width="20" height="20" preserveAspectRatio="none" xlink:href="data:' + contentType + ';base64,' + imageData + '" transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,10.00000000)"></image></svg>') : ArcGIS.secureURL(symbol.url)
					// Example
//					url: ArcGIS.styleHelpers.createSvgUrl('<svg overflow="hidden" width="30" height="20" style="touch-action: none;"><image fill-opacity="0" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="-10" y="-10" width="20" height="20" preserveAspectRatio="none" xlink:href="data:image/png;base64,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" transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,10.00000000)"></image></svg>')
				},
				zIndex: zIndex
			},
			legend: '<svg overflow="hidden" width="30" height="20" style="touch-action: none;"><image fill-opacity="0" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="-10" y="-10" width="20" height="20" preserveAspectRatio="none"' +
				' xlink:href="' + url + '"' +
				' transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,10.00000000)"></image></svg>'
		};
		return style;
	},
	createStyleFromEsriSMSSymbol: function(symbol, opacity, zIndex) {
		var style;
		switch(symbol.style) {
			// TODO: https://resources.arcgis.com/en/help/rest/apiref/index.html?renderer.html
			case 'esriSMSCircle':
				var svg = '<svg xmlns="http://www.w3.org/2000/svg" overflow="hidden" width="30" height="30" style="touch-action: none;"><circle' +
					' fill="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color) + '"' +
					' fill-opacity="' + opacity + '"' +
					' stroke="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.outline?.color) + '"' +
					' stroke-opacity="' + opacity + '"' +
					' stroke-width="' + symbol.outline?.width + '"' +
					' stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" cx="0" cy="0"' +
					' r="' + symbol.size / 2.0 + '"' +
					' fill-rule="evenodd" stroke-dasharray="none" dojoGfxStrokeStyle="solid" transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,15.00000000)"></circle></svg>';
				// scale = radius = symbol.size / 2.0
				// https://stackoverflow.com/a/31150400
				// https://stackoverflow.com/a/22084522
				style = {
					map: {
						icon: {
						/*
							path: google.maps.SymbolPath.CIRCLE,
							fillColor: ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color),
							fillOpacity: opacity,
							strokeColor: ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.outline.color),
							strokeOpacity: opacity,
							strokeWeight: symbol.outline.width,
							scale: symbol.size / 2.0
							*/
							url: ArcGIS.styleHelpers.createSvgUrl(svg)
						},
						zIndex: zIndex
					},
					legend: svg
				};
				break;
			case 'esriSMSCross':
				// TODO
				break;
			case 'esriSMSDiamond':
				// TODO
				break;
			case 'esriSMSSquare':
				// TODO
				break;
			case 'esriSMSX':
				// TODO
				break;
			case 'esriSMSTriangle':
				// TODO
				break;
			default:
				console.warn(symbol.style + ': Not implemented');
				break;
		}
		return style;
	},
	createStyleFromEsriSLSSymbol: function(symbol, opacity, zIndex) {
		var style;
		switch(symbol.style) {
			// XXX: https://developers.google.com/maps/documentation/javascript/examples/overlay-symbol-dashed
			// Dashed symbols are not supported in a style object.
			case 'esriSLSDash':
				break;
			case 'esriSLSDashDot':
				// TODO
				break;
			case 'esriSLSDashDotDot':
				// TODO
				break;
			case 'esriSLSDot':
				// TODO
				break;
			case 'esriSLSNull':
				// TODO
				break;
			case 'esriSLSSolid':
				style = {
					map: {
						strokeColor: ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color),
						strokeOpacity: opacity,
						strokeWeight: symbol.width,
						zIndex: zIndex
					},
					legend: '<svg xmlns="http://www.w3.org/2000/svg" overflow="hidden" width="30" height="30" style="touch-action: none;"><path fill="none" fill-opacity="0"' +
						' stroke="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color) + '"' +
						' stroke-opacity="' + opacity + '"' +
						' stroke-width="' + symbol.width + '"' +
						' stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" path="M -15,0 L 15,0 E" d="M-15 0L 15 0" stroke-dasharray="none" dojoGfxStrokeStyle="solid" transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,15.00000000)"></path></svg>'
				};
				break;
			default:
				console.warn(symbol.style + ': Not implemented');
				break;
		}
		return style;
	},
	createStyleFromEsriSFSSymbol: function(symbol, opacity, zIndex) {
		var style;
		switch(symbol.style) {
			case 'esriSFSBackwardDiagonal':
				// TODO
				break;
			case 'esriSFSCross':
				// TODO
				break;
			case 'esriSFSDiagonalCross':
				// TODO
				break;
			case 'esriSFSForwardDiagonal':
				// TODO
				break;
			case 'esriSFSHorizontal':
				// TODO
				break;
			case 'esriSFSNull':
				// TODO
				break;
			case 'esriSFSSolid':
				style = {
					map: {
						fillColor: ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color),
						fillOpacity: opacity,
						strokeColor: ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.outline?.color),
						strokeOpacity: opacity,
						strokeWeight: symbol.outline?.width,
						zIndex: zIndex
					},
					legend: '<svg xmlns="http://www.w3.org/2000/svg" overflow="hidden" width="30" height="30" style="touch-action: none;"><path' +
						' fill="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.color) + '"' +
						' fill-opacity="' + opacity + '"' +
						' stroke="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(symbol.outline?.color) + '"' +
						' stroke-opacity="' + opacity + '"' +
						' stroke-width="' + symbol.outline?.width + '"' +
						' stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" path="M -10,-10 L 10,0 L 10,10 L -10,10 L -10,-10 Z" d="M-10-10L 10 0L 10 10L-10 10L-10-10Z" fill-rule="evenodd" stroke-dasharray="none" dojoGfxStrokeStyle="solid" transform="matrix(1.00000000,0.00000000,0.00000000,1.00000000,15.00000000,15.00000000)"></path></svg>'
				};
				break;
			case 'esriSFSVertical':
				// TODO
				break;
			default:
				console.warn(symbol.style + ': Not implemented');
				break;
		}
		return style;
	},
	createStyleFromEsriSymbol: function(symbol, opacity, zIndex) {
		// ArcGIS Symbol Objects: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000n5000000
		var style;
		switch(symbol.type) {
			case 'esriPMS':
				style = ArcGIS.styleHelpers.createStyleFromEsriPMSSymbol(symbol, opacity, zIndex);
				break;
			case 'esriSMS':
				style = ArcGIS.styleHelpers.createStyleFromEsriSMSSymbol(symbol, opacity, zIndex);
				break;
			case 'esriSLS':
				style = ArcGIS.styleHelpers.createStyleFromEsriSLSSymbol(symbol, opacity, zIndex);
				break;
			case 'esriSFS':
				style = ArcGIS.styleHelpers.createStyleFromEsriSFSSymbol(symbol, opacity, zIndex);
				break;
			default:
				console.warn(symbol.type + ': Not implemented');
				break;
		}
		return style;
	},
	createStyleFromEsriSimpleRenderer: function(renderer, opacity, zIndex) {
		return ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.symbol, opacity, zIndex);
	},
	createStyleFromEsriUniqueValueRenderer: function(renderer, opacity, zIndex) {
		var legend = '';
		var info = renderer.uniqueValueInfos;
		var legendsMap = {};
		for (var i = 0; i < info.length; i++) {
			var style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(info[i].symbol, opacity, zIndex);
			legend += '<div style="display:block; margin-bottom: 10px;">' + (style ? style.legend + ' ' : '') + info[i].label + '</div>';

			// map the legend value to its symbol
			legendsMap[info[i].value] = info[i].symbol;
		}
		if (renderer.defaultSymbol) {
			var style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.defaultSymbol, opacity, zIndex);
			legend += '<div style="display:block; margin-bottom: 10px;">' + (style ? style.legend + ' ' : '') + window.MASystem.Labels.ArcGIS_Legend_Others + '</div>';
		}

		// determine the number of fields used in creating the legend buckets for use later
		var totalFieldsMapped = 0
		Object.keys(renderer).forEach((key) => {
			if (key.startsWith('field') && key !== 'fieldDelimiter') {
				totalFieldsMapped++;
			}
		});
		var style = {
			map: function(feature) {
				var style;
				var symbol = ArcGIS.featureLayerHelpers.getSymbolFromLegend(feature, renderer, totalFieldsMapped, legendsMap);
				if (symbol) {
					style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(symbol, opacity, zIndex);
				}
				else {
					if (renderer.defaultSymbol) {
						style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.defaultSymbol, opacity, zIndex);
					}
					var value = ArcGIS.styleHelpers.getValue(feature, renderer);
					for (var i = 0; i < info.length; i++) {
						if (value == info[i].value) {
							style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(info[i].symbol, opacity, zIndex);
							break;
						}
					}
				}
				return style.map;
			},
			legend: legend
		};
		return style;
	},
	createStyleFromEsriClassBreaksRenderer: function(renderer, opacity, zIndex) {
/*
<svg overflow="hidden" width="24" height="120" style="touch-action: none;">
<defs>
	<linearGradient id="dojoxUnique1" gradientUnits="userSpaceOnUse" x1="0.00000000" y1="0.00000000" x2="0.00000000" y2="120.00000000">
		<stop offset="0.00000000" stop-color="rgb(13, 38, 68)" stop-opacity="1"></stop>
		<stop offset="0.25000000" stop-color="rgb(56, 98, 122)" stop-opacity="1"></stop>
		<stop offset="0.50000000" stop-color="rgb(98, 158, 176)" stop-opacity="1"></stop>
		<stop offset="0.75000000" stop-color="rgb(177, 205, 194)" stop-opacity="1"></stop>
		<stop offset="1.00000000" stop-color="rgb(255, 252, 212)" stop-opacity="1"></stop>
	</linearGradient>
</defs>
<rect fill="url(#dojoxUnique1)" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="0" y="0" width="24" height="120" ry="0" rx="0" fill-rule="evenodd"></rect>
<rect fill="rgb(255, 255, 255)" fill-opacity="0.19999999999999996" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="0" y="0" width="24" height="120" ry="0" rx="0" fill-rule="evenodd"></rect>
</svg>
*/
		var legend = '';
		var visVars = renderer.visualVariables;
		if (visVars && visVars.length > 0) {
			var labelWidth = 200;
			var fontSize = 11;
			legend += '<svg xmlns="http://www.w3.org/2000/svg" overflow="hidden"' +
				' width="' + (24 + labelWidth) + '"' +
				' height="' + (120 + fontSize) + '"' +
				' style="touch-action: none;"><defs><linearGradient id="dojoxUnique1" gradientUnits="userSpaceOnUse" x1="0.00000000"' +
				' y1="' + fontSize / 2.0 + '"' +
				' x2="0.00000000"' +
				' y2="' + (120 + fontSize / 2.0) + '">';
			for (var i = 0; i < visVars.length; i++) {
				var stops = visVars[i].stops;
				switch (visVars[i].type) {
					case 'colorInfo':
						if (stops) {
							for (var j = stops.length - 1; j >= 0; j--) {
								legend += '<stop offset="' + (stops.length - 1 - j) / (stops.length - 1) + '"' +
									' stop-color="' + ArcGIS.styleHelpers.createRgbaFromEsriColor(stops[j].color) + '"' +
									' stop-opacity="' + opacity + '"></stop>';
							}
						}
						break;
				}
			}
			legend += '</linearGradient></defs><rect fill="url(#dojoxUnique1)" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="0"' +
				' y="' + fontSize / 2.0 + '"' +
				' width="24" height="120" ry="0" rx="0" fill-rule="evenodd"></rect><rect fill="rgb(255, 255, 255)" fill-opacity="0.19999999999999996" stroke="none" stroke-opacity="0" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4" x="0"' +
				' y="' + fontSize / 2.0 + '"' +
				' width="24" height="120" ry="0" rx="0" fill-rule="evenodd"></rect>';
			for (var i = 0; i < visVars.length; i++) {
				var stops = visVars[i].stops;
				switch (visVars[i].type) {
					case 'colorInfo':
						for (var j = stops.length - 1; j >= 0; j--) {
							var y = fontSize / 2.0 + (stops.length - 1 - j) / (stops.length - 1) * 120;
							legend += '<line x1="24"' +
								' y1="' + y + '"' +
								' x2="30"' +
								' y2="' + y + '"' +
								' stroke="black" stroke-width="1"></line>' +
								'<text x="35"' +
								' y="' + (fontSize / 2.0 - 2 + y) + '"' +
								' font-size="' + fontSize + '">' +
								(j == stops.length - 1 ? '&gt; ' : (j == 0 ? '&lt; ' : '')) + stops[j].value +
								'</text>';
						}
						break;
				}
			}
			legend += '</svg>';
		}
		if (renderer.defaultSymbol) {
			var style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.defaultSymbol, opacity, zIndex);
			legend += '<div style="display:block; margin-bottom: 10px;">' + style.legend + ' ' + window.MASystem.Labels.ArcGIS_Legend_Others + '</div>';
		}
		var style = {
			map: function(feature) {
				var style;
				var symbol = ArcGIS.featureLayerHelpers.getSymbol(feature);
				if (symbol) {
					style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(symbol, opacity, zIndex);
				}
				else {
					if (renderer.defaultSymbol) {
						style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.defaultSymbol, opacity, zIndex);
					}
					if (visVars && visVars.length > 0) {
						style = ArcGIS.styleHelpers.createStyleFromEsriSymbol(renderer.classBreakInfos[0].symbol, opacity, zIndex);
						for (var i = 0; i < visVars.length; i++) {
							var value = ArcGIS.styleHelpers.getValue(feature, visVars[i]);
							var stops = visVars[i].stops;
							if (stops) {
								for (var j = 0; j < stops.length; j++) {
									if (((j == 0 || value >= stops[j-1].value) && value < stops[j].value) || (j == stops.length - 1 && value >= stops[j].value)) {
										switch (visVars[i].type) {
											case 'colorInfo':
												var color = [];
												if (j == 0 || value >= stops[j].value) {
													color = stops[j].color;
												}
												else {
													for(var k = 0; k < 4; k++) {
														color[k] = Math.round(stops[j-1].color[k] + (value - stops[j-1].value) / (stops[j].value - stops[j-1].value) * (stops[j].color[k] - stops[j-1].color[k]));
													}
												}
												style.map.fillColor = ArcGIS.styleHelpers.createRgbaFromEsriColor(color);
												break;
											case 'sizeInfo':
												var size;
												if (j == 0 || value >= stops[j].value) {
													size = stops[j].size;
												}
												else {
													size = stops[j-1].size + (value - stops[j-1].value) / (stops[j].value - stops[j-1].value) * (stops[j].size - stops[j-1].size);
												}
												switch (visVars[i].target) {
													case 'outline':
														style.map.strokeWeight = size;
														break;
												}
												break;
										}
										break;
									}
								}
							}
						}
					}
				}
				return style.map;
			},
			legend: legend
		};
		return style;
	},
	createStyleFromEsriDrawingInfo: function(drawingInfo, opacity, zIndex) {
		var style = {};
		var renderer = drawingInfo.renderer;
		if (!opacity) {
			if (drawingInfo.transparency) {
				opacity = 1.0 - drawingInfo.transparency / 100.0;
			}
			else {
				opacity = 1.0;
			}
		}
		switch(renderer.type) {
			case 'simple':
				style = ArcGIS.styleHelpers.createStyleFromEsriSimpleRenderer(renderer, opacity, zIndex);
				break;
			case 'uniqueValue':
				style = ArcGIS.styleHelpers.createStyleFromEsriUniqueValueRenderer(renderer, opacity, zIndex);
				break;
			case 'classBreaks':
				style = ArcGIS.styleHelpers.createStyleFromEsriClassBreaksRenderer(renderer, opacity, zIndex);
				break;
			default:
				console.warn(renderer.type + ': Not implemented');
				break;
		}
		return style;
	}
};
