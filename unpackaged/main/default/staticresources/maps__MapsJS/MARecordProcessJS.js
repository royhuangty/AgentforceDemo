var sfTimeZoneOffset = '0';
var timezoneId = "America/New_York";
var Worker_MAIO_URL = 'https://internal.sfmapsapi.com';
var defaultMarkerColor = '3083d3';
var customDocUrlMarker = '/servlet/servlet.FileDownload?file=';
var customFileUrlMarker = '/sfc/servlet.shepherd/version/download/';
var checkImgUrlForProcess = function(imgId) {
	if(imgId.substring(0, 3) === '015') {
		return customDocUrlMarker + imgId;
	}
	return customFileUrlMarker + imgId;
}

function processRecords (data,callback) {
	/**
		what this needs
		1. records
		2. queryData.addressFields
		3. queryRecord
		4. recordList
		5. imageInfo
		6. isIE?
		7. legendInfo
		9. addressProxLimitInfo
	*/

	//grab the records and queryInfo
	var records = data.records || [];
	var queryRecord = data.queryRecord || {};
	var addressFields = data.addressFields;
	var layerType = data.layerType;
	var addressProxLimitInfo = data.addressProxLimitInfo || {};
	var FiscalYearSettings = data.FiscalYearSettings;
	
	if(typeof addressFields == 'string') {
	    try {
	        addressFields = JSON.parse(addressFields);
	    }
	    catch(e) {
	        addressFields = {};
	    }
	}
	//are we limiting records based on and address radius?
	//need this info to remove records from batches, MAP-3653
	if(typeof addressProxLimitInfo == 'string') {
		try {
	        addressProxLimitInfo = JSON.parse(addressProxLimitInfo);
	    }
	    catch(e) {
	        addressProxLimitInfo = {};
	    }
	}
	
	if(typeof FiscalYearSettings == 'string') {
	    try {
	        FiscalYearSettings = JSON.parse(FiscalYearSettings);
	    }
	    catch(e) {
	        FiscalYearSettings = null;
	    }
	}

	// if no region value, use the default internal https://internal.na.sfmapsapi.com set above
	var region = workerGetProperty(data, 'dataRegion');
	if (region === 'Europe') {
		Worker_MAIO_URL = 'https://internal.eu.sfmapsapi.com';
	} else if (region === 'North America') {
		Worker_MAIO_URL = 'https://internal.na.sfmapsapi.com';
	} else {
		Worker_MAIO_URL = 'https://internal.sfmapsapi.com';
	}
	// upate the url with icon info
	Worker_MAIO_URL = Worker_MAIO_URL + '/images/marker/3';
	var imgLoaderDimensions = data.imgLoaderDimensions || {};
	var isIE = data.isIE || false;
	//get the marker assignment types
	var markerAssignmentType = queryRecord.ColorAssignmentType__c;
	var colorAssignments = queryRecord.ColorAssignment__c || [];
	if(typeof colorAssignments == 'string') {
	    try {
	        colorAssignments = JSON.parse(colorAssignments);
	    }
	    catch(e) {
	        colorAssignments = [];
	    }
	}
	if(queryRecord.sfTimeZoneOffset) {
	    sfTimeZoneOffset = queryRecord.sfTimeZoneOffset;
	}
	if(queryRecord.timezoneId) {
	    timezoneId = queryRecord.timezoneId;
	}
	
	var shapeAssignments = queryRecord.ShapeAssignment__c || [];
	if(typeof shapeAssignments == 'string') {
	    try {
	        shapeAssignments = JSON.parse(shapeAssignments);
	    }
	    catch(e) {
	        shapeAssignments = [];
	    }
	}
	var advancedOptions = queryRecord.AdvancedOptions__c || {};
	if(typeof advancedOptions == 'string') {
	    try {
	        advancedOptions = JSON.parse(advancedOptions);
	    }
	    catch(e) {
	        advancedOptions = {};
	    }
	}

	//determine if we have a polymorphicField
	var isPoly = workerGetProperty(queryRecord, 'BaseObject__r.PolymorphicAddressObject__c', false) ? true : false;
	var polymorphicObject = isPoly ? workerGetProperty(queryRecord, 'BaseObject__r.AddressObject__c', false) : '';
	polymorphicObject = polymorphicObject.endsWith('Id') ? polymorphicObject.substring(0, polymorphicObject.length -2) : polymorphicObject;
	var recordsToGeocode = [];
	var tooltipMeta = data.tooltips || [];
	var shapeIdsToPlot = {};
	var shapeIdLocation = '';
	var isShapeCustomLocation;
	var checkForShapes = false;
	if(typeof tooltipMeta == 'string') {
	    try {
	        tooltipMeta = JSON.parse(data.tooltips);
	    }
	    catch(e) {
	        tooltipMeta = [];
	    }
	    
	}
	for(var sh=0,sLen = tooltipMeta.length; sh<sLen;sh++){
    	var tp = tooltipMeta[sh];
    	if(tp.includeShapeInfo) {
    		checkForShapes = true;
    		isShapeCustomLocation = workerGetProperty(tp,'shapeFields.isCustomGeometry');
    		shapeIdLocation = tp.linkId;
    		break;
    	}
    }
	
	var shapeAssignmentIsFirst = data.shapeAssignmentIsFirst || true;
	var recordList = data.recordList || [];
	var automaticAssign = advancedOptions.automaticassign == 'true' ? true : false;
	var autoAssignMap = {};
	var autoAssignIndex = colorAssignments.length;
	var shapeKeys = isIE ? MAMarkerBuilder.IEmarkerShapeSelection : MAMarkerBuilder.markerShapeSelection;
	
	//check the queryType
	var isLiveLayer = false;
	try {
		layerType = layerType|| ''; // workerGetProperty(queryRecord,'BaseObject__r.Type__c') || '';
		isLiveLayer = /live/i.test(layerType)/*.toLowerCase() == 'live'*/ ? true : false;
	}
	catch(e) {
		
	}
	
	//get the lat lng field
	var latField = addressFields.latitude || '';
	var lngField = addressFields.longitude || '';
	var verifiedLat = addressFields.verifiedLatitude || '';
	var verifiedLng = addressFields.verifiedLongitude || '';
    var colorByPicklistField;
    var colorByPicklistType = 'string';
    var picklistTimeZoneOffset = false;
	var staticInfo = {};
	var labelFieldType = 'string';
	var labelFieldToGet = '';
	
	if(markerAssignmentType === 'Static') {
		staticInfo.iconColor = queryRecord.IconColor__c || defaultMarkerColor+':Marker';

		//check if image
		var scatterSvgHTML;
		var scatterShape = MAMarkerBuilder.shapes['Scatter'];
		var scatterColor;
		var scatterImageURL;
		var markerImgUrl;
		var markerImgUrlFix
		if(staticInfo.iconColor.indexOf('image:') === 0) {
			var imgId = staticInfo.iconColor.split('image:')[1];
			//staticInfo.markerURL = MASystem.Images.pin_error;
			staticInfo.markerImgUrl = Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker'; //standard black marker if we have no image
			var imgWidth = 15.5;
			var imgHeight = 41;
			if(imgLoaderDimensions[imgId]) {
			    staticInfo.markerImgUrl = imgLoaderDimensions[imgId].imgURL || checkImgUrlForProcess(imgId);
				imgWidth = imgLoaderDimensions[imgId].width/2;
				imgHeight = imgLoaderDimensions[imgId].height;
				staticInfo.markerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
				staticInfo.scaledmarkerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
			}
			staticInfo.markerAnchor = {x:imgWidth, y:imgHeight};
			scatterImageURL = Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter';
		}
		else {
			var markerParts = staticInfo.iconColor.split(':');
			var markerIcon = markerParts[1] || 'Marker';
			var markerColor = markerParts[0] || defaultMarkerColor;
			var markerShape = MAMarkerBuilder.shapes[markerIcon];
            markerImgUrlFix = markerColor.replace(/#/g,'');
			markerImgUrl = Worker_MAIO_URL + '?color='+markerImgUrlFix+'&forlegend=false&icon='+markerIcon;
			scatterColor = markerImgUrlFix;
			if(workerCachedMarkers[staticInfo.iconColor]) {
				staticInfo.markerAnchor = workerCachedMarkers[staticInfo.iconColor].markerAnchor;
				staticInfo.markerSize = workerCachedMarkers[staticInfo.iconColor].markerSize;
				staticInfo.scaledmarkerSize =  workerCachedMarkers[staticInfo.iconColor].scaledmarkerSize;
				staticInfo.markerImgUrl = workerCachedMarkers[staticInfo.iconColor].markerImgUrl;
			}
			else {
				// staticInfo.markerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(svgHTML));
				staticInfo.markerAnchor = markerShape.anchor;
				staticInfo.markerSize = {height:markerShape.size.y,width:markerShape.size.x};
				staticInfo.scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
				staticInfo.markerImgUrl = markerImgUrl;
				
				workerCachedMarkers[staticInfo.iconColor] = {
					markerURL : staticInfo.markerURL,
					markerAnchor : staticInfo.markerAnchor,
					markerSize : staticInfo.markerSize,
					markerImgUrl : markerImgUrl,
					scaledmarkerSize: staticInfo.scaledmarkerSize
				};
			}
		}

		//create scatter marker
        staticInfo.scatterMarkerAnchor = scatterShape.anchor;
        staticInfo.scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
        staticInfo.scatterImageURL = Worker_MAIO_URL + '?color='+scatterColor+'&forlegend=false&icon=Scatter';
	}
    else if (markerAssignmentType === 'Dynamic-Label') {
        //get the field type so we can format the label
		var labelTooltip = tooltipMeta[0] || {};
		if (advancedOptions?.dynamicLabelTitleField && advancedOptions?.dynamicLabelTitleFieldType) {
			labelFieldType = advancedOptions.dynamicLabelTitleFieldType;
			labelFieldToGet = advancedOptions.dynamicLabelTitleField;
		} else {
			labelFieldType = workerGetProperty(labelTooltip,'describe.type') || 'string';
			labelFieldToGet = workerGetProperty(labelTooltip,'FieldName') || queryRecord.Tooltip1__c;
			labelFieldToGet = labelTooltip.polymorphicField ? queryRecord.Tooltip1__c : labelFieldToGet;
		}
	}
	else if(markerAssignmentType === 'Dynamic-Order') {
		//is a prox address enabled?
		var recMap = {};
		if(addressProxLimitInfo.enabled)
		{
			if(typeof processPointsInCircle == 'function')
			{
				for(var i = 0, len = records.length; i < len; i++) {
					var record = records[i];
					var verifiedLatitude = isPoly ? workerGetProperty(record[polymorphicObject],verifiedLat) : workerGetProperty(record,verifiedLat);
					var verifiedLongitude = isPoly ? workerGetProperty(record[polymorphicObject],verifiedLng) : workerGetProperty(record,verifiedLng);
					var latitudeField = isPoly ? workerGetProperty(record[polymorphicObject],latField) : workerGetProperty(record,latField);
					var longitudeField = isPoly ? workerGetProperty(record[polymorphicObject],lngField) : workerGetProperty(record,lngField);
					if(verifiedLatitude == undefined || verifiedLongitude == undefined) {
						if((latitudeField == undefined || longitudeField == undefined) && isLiveLayer == false) {
							//remove
							continue;
						}
						recMap[record.Id] = [latitudeField,longitudeField];
					}
					else {
						recMap[record.Id] = [verifiedLatitude,verifiedLongitude];
					}
					
				}
				addressProxLimitInfo.points = recMap;
				processPointsInCircle(addressProxLimitInfo,function(res) {
					var pointsNotInPolygon = res.pointsNotInPolygon || [];
					for(var r = 0; r < pointsNotInPolygon.length; r++) {
						var recToRemove = pointsNotInPolygon[r];
						for(var rr = 0; rr < recordList.length; rr++) {
							var recToCheck = recordList[rr];
							if(recToCheck === recToRemove) {
								recordList.splice(rr,1);
							}
						}
					}
				});

				//we will need to pass back the recordList for our next batches
			}
		}
	}
    
	var dynamicOtherInfo = null;

	// grab the picklist value from tooltip info
	for(var tp = 0, tpLen = tooltipMeta.length; tp < tpLen; tp++) {
		var tooltip = tooltipMeta[tp];
		if( /color/i.test(tooltip.TooltipType) || /shape/i.test(tooltip.TooltipType) ) {
			colorByPicklistField = workerGetProperty(tooltip,'ActualFieldName');
			colorByPicklistType = workerGetProperty(tooltip,'describe.soapType');
			
			if(colorByPicklistType.indexOf('date') >= 0) {
				picklistTimeZoneOffset = true;
			}

			if (colorByPicklistType.indexOf('dateTime') >= 0) {
				picklistTimeZoneOffset = false;
			}

		}
	}

	function isValidPolyline(record, baseObjectVertices = []) {
		let isValid = true;
		baseObjectVertices = baseObjectVertices.filter(item => item.trim().length);
		if(baseObjectVertices.length >= 2) {
			baseObjectVertices.forEach(vertex => {
				vertex = vertex.indexOf('maps__') === 0 ? vertex.substr(6) : vertex;
				if (record[vertex] && record[vertex]?.latitude && record[vertex]?.longitude) {

					let lat = record[vertex].latitude;
					let long = record[vertex].longitude;
					if (Number(lat) === NaN || Number(long) === NaN){ isValid = false; return;}
					if (Math.floor(Number(lat)) > 90 || Math.floor(Number(lat)) < -90) { isValid = false; return; }
					if (Math.floor(Number(long)) > 180 || Math.floor(Number(long)) < -180) { isValid = false; return; }
				} else {
					isValid = false;
					return;
				}
			})
		} else {
			isValid = false;
		}
		return isValid;
	}

	//loop over the records
	for(var i = 0, len = records.length; i < len; i++) {
		var record = records[i];
		var useTimezoneOffset = !(record.IsAllDayEvent || false) && picklistTimeZoneOffset;
		//create some basic marker info
		var legacyRecord = {
			Id : record.Id
        };
        // BK - Added to support current scheduling module. This can be removed after the Spring '18 release of maps.
        record.supportsActivities = (data && data.layerInfo) ? data.layerInfo.supportsActivities : false;
        record.baseObjectLabel = (data && data.layerInfo) ? data.layerInfo.baseObjectLabel : null;
        record.baseObjectId = queryRecord.maps__BaseObject__c;

		if (isPoly) {
			record.polyObjectField = polymorphicObject;
		}

		record.record = legacyRecord;
		record.savedQueryId = queryRecord.Id;
		record.savedQueryName = queryRecord.Name;
		record.qid = queryRecord.qid || '';
		record.isVisible = false;
		record.isClustered = false;
		record.isScattered = false;

		//build out our map of shapes to grab
		if(checkForShapes) {
			var shapeId = workerGetProperty(record,shapeIdLocation);
			var isCustomShape = workerGetProperty(record,isShapeCustomLocation);
			if(shapeId != undefined && isCustomShape != undefined) {
				shapeIdsToPlot[shapeId] = isCustomShape;
			}
		}
        var tooltip1 = '';
        try {
            tooltip1 = workerFormatTooltip(record,tooltipMeta[0],true,polymorphicObject);
            tooltip1 = htmlDecode(tooltip1);
			if(/^\<a.*\>.*\<\/a\>/i.test(tooltip1)){
				tooltip1 = tooltip1.match(/<a [^>]+>([^<]+)<\/a>/)[1];
				record[queryRecord.Tooltip1__c] = tooltip1;
			}
        }
        catch(e) {
			tooltip1 = getPolyField(record, polymorphicObject, queryRecord.Tooltip1__c, true, isPoly, 'N/A');
        }
		tooltip1 = htmlDecode(String(tooltip1));
		record.tooltip1 = tooltip1;
		record.tooltip1Field = queryRecord.Tooltip1__c;
		var verifiedLatitude = isPoly ? workerGetProperty(record[polymorphicObject],verifiedLat) : workerGetProperty(record,verifiedLat);
		var verifiedLongitude = isPoly ? workerGetProperty(record[polymorphicObject],verifiedLng) : workerGetProperty(record,verifiedLng);
		var latitudeField = isPoly ? workerGetProperty(record[polymorphicObject],latField) : workerGetProperty(record,latField);
		var longitudeField = isPoly ? workerGetProperty(record[polymorphicObject],lngField) : workerGetProperty(record,lngField);
		var vertex1 = isPoly ? workerGetProperty(record[polymorphicObject],addressFields?.geolocation2) : workerGetProperty(record,addressFields?.geolocation2);
		var vertex2 = isPoly ? workerGetProperty(record[polymorphicObject],addressFields?.geolocation3) : workerGetProperty(record,addressFields?.geolocation3);
		var vertex3 = isPoly ? workerGetProperty(record[polymorphicObject],addressFields?.geolocation4) : workerGetProperty(record,addressFields?.geolocation4);
		var vertex4 = isPoly ? workerGetProperty(record[polymorphicObject],addressFields?.geolocation5) : workerGetProperty(record,addressFields?.geolocation5);

		if(verifiedLatitude == undefined || verifiedLongitude == undefined) {
			//create location info even if needs geocoding, will update with coords on client side
			record.location = {
				coordinates : {
					lat : latitudeField,
					lng : longitudeField
				},
				fields : {
					lat : latField,
					lng : lngField
				}
			}

			//check if we need to geocode
			if((latitudeField == undefined || longitudeField == undefined) && isLiveLayer == false) {
				recordsToGeocode.push(record);
			}
			
		}
		else {
			//verified
			record.location = {
				coordinates : {
					lat : verifiedLatitude,
					lng : verifiedLongitude
				},
				fields : {
					lat : verifiedLat,
					lng : verifiedLng
				}
			}
		}

		var isTherePolyline = !!vertex1 || !!vertex2  || !!vertex3  || !!vertex4;
		if (queryRecord.AdvancedOptions__c.isPolyline === 'true' && isTherePolyline === true) {
			const baseObjectVertices = queryRecord?.BaseObject__r?.PolylineVertices__c?.vertices ?? [];
			const isValidPolylineRecord = isValidPolyline(record, baseObjectVertices);
			record.polyline = {
				isPolylineLayer: queryRecord.AdvancedOptions__c.isPolyline,
				color: '',
				vertices: [],
				validPolyline: isValidPolylineRecord,
				qid : queryRecord.	qid || '',
				polylineMarker: {},
				polylineMarkers: []
			};

			if (vertex1) record.polyline.vertices.push(vertex1);
			if (vertex1 && vertex2) record.polyline.vertices.push(vertex2);
			if (vertex1 && vertex2 && vertex3) record.polyline.vertices.push(vertex3);
			if (vertex1 && vertex2 && vertex3 && vertex4) record.polyline.vertices.push(vertex4);
		}
		
		try {
		    var formattedAddress = isPoly ? workerGetFormattedAddress(record[polymorphicObject],addressFields) : workerGetFormattedAddress(record,addressFields);
		    record.FormattedAddress_MA = formattedAddress;
		}
		catch(e) {
		    record.FormattedAddress_MA = '';
		}
		
		function processColorAssignentsForDynamicLabel()
		{
			// grab the color assignment and find a match
			var pickListField = queryRecord.PicklistField__c;
			var picklistValue = String(getPolyField(record, polymorphicObject, pickListField, true, isPoly, ''));
			var foundMatch = false;
			var otherColor;
			var otherLegendId;
			//autoAssignIndex = colorAssignments.length;
			for(var c = 0, cLen = colorAssignments.length; c < cLen; c++) {
				var rule = colorAssignments[c];
                var markerColor = rule.value;
				//store global other outside marker loop
				if(rule.comparevalue == '<Other>' && dynamicOtherInfo == null)
				{
					var scatterSvgHTML;
					var scatterColor;
					var scatterShape = MAMarkerBuilder.shapes['Scatter'];
					dynamicOtherInfo = {};
					dynamicOtherInfo.legendId = rule.legendId;
					dynamicOtherInfo.markerValue = rule.value;
					
					if(rule.value.indexOf('image:') === 0) {
						var imgId = rule.value.split('image:')[1];
						dynamicOtherInfo.markerURL = Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker'; //standard black marker if we have no image
            			var imgWidth = 15.5;
            			var imgHeight = 41;
            			if(imgLoaderDimensions[imgId]) {
            			    dynamicOtherInfo.markerImgUrl = imgLoaderDimensions[imgId].imgURL || checkImgUrlForProcess(imgId);
            				imgWidth = imgLoaderDimensions[imgId].width/2;
            				imgHeight = imgLoaderDimensions[imgId].height;
            			}
            			dynamicOtherInfo.markerAnchor = {x:imgWidth, y:imgHeight};
						
						// scatterSvgHTML = MAMarkerBuilder.createSVG({ type: 'Scatter', color: '#004de6:Scatter',forLegend: false });
						scatterColor = '#004de6';
						dynamicOtherInfo.scatterMarkerImgUrl = Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter';
					}
					else {
						var markerParts = rule.value.split(':');
						var markerIcon = markerParts[1] || 'Marker';
						var markerColor = markerParts[0] || defaultMarkerColor;
						var markerShape = MAMarkerBuilder.shapes[markerIcon];
						scatterColor = markerColor;
						dynamicOtherInfo.markerAnchor = markerShape.anchor;
						dynamicOtherInfo.markerSize = {height:markerShape.size.y,width:markerShape.size.x};
						dynamicOtherInfo.scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
						var imgURLFix = rule.value.replace(/#/g,'');
						dynamicOtherInfo.markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+markerIcon;
						workerCachedMarkers[rule.value] = {
							// markerURL : dynamicOtherInfo.markerURL,
							markerAnchor : dynamicOtherInfo.markerAnchor,
							markerSize : dynamicOtherInfo.markerSize,
							scaledmarkerSize : dynamicOtherInfo.scaledmarkerSize,
							markerImgUrl : dynamicOtherInfo.markerImgUrl
						};
					}

					//create scatter marker
					var scatterMarkerURL;
					var scatterMarkerAnchor;
					var scatterMarkerSize;
					var scatterMarkerImgUrl;
					//create static marker
					// dynamicOtherInfo.scatterMarkerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(scatterSvgHTML));
					dynamicOtherInfo.scatterMarkerAnchor = scatterShape.anchor;
					dynamicOtherInfo.scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
					dynamicOtherInfo.scatterMarkerImgUrl = Worker_MAIO_URL + '?color='+scatterColor.replace(/#/g,'')+'&forlegend=false&icon=Scatter';
					
					autoAssignMap['OtherInfo'] = {
					    legendId : rule.legendId,
		                markerValue : rule.value,
		                markerImgUrl : dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
		                markerAnchor :  dynamicOtherInfo.markerAnchor,
		                scatterMarkerAnchor : dynamicOtherInfo.scatterMarkerAnchor,
		                scatterMarkerSize : dynamicOtherInfo.scatterMarkerSize,
		                scatterMarkerImgUrl : dynamicOtherInfo.scatterMarkerImgUrl,
		                nameValue : 'Other'
					};

					break;
				}

				//not other so process marker and rule
				var checkLegend;
				
				if(workerLegendCompare[rule.operator]) {
				    var compareOptions = { picklistValue: picklistValue, rule: rule, useTimezoneOffset: useTimezoneOffset, FiscalYearSettings:FiscalYearSettings };
				    checkLegend = workerLegendCompare[rule.operator](compareOptions);
				}
				else {
				    checkLegend = {foundMatch:false};
				}
				var markerAnchor;
				var markerURL;
				
				var markerSize;
				var scaledmarkerSize;
				var markerImgUrl;
				var scatterSvgHTML;
				var scatterShape = MAMarkerBuilder.shapes['Scatter'];
				var scatterColor;
				if(checkLegend.foundMatch) {
					foundMatch = true;
					if(rule.value.indexOf('image:') === 0) {
						var imgId = rule.value.split('image:')[1];
						markerImgUrl = Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker'; //standard black marker if we have no image
            			var imgWidth = 15.5;
            			var imgHeight = 41;
            			if(imgLoaderDimensions[imgId]) {
            			    markerImgUrl = imgLoaderDimensions[imgId].imgURL || checkImgUrlForProcess(imgId);
							markerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
							scaledmarkerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
            				imgWidth = imgLoaderDimensions[imgId].width/2;
            				imgHeight = imgLoaderDimensions[imgId].height;
            			}
            			
            			markerAnchor = {x:imgWidth, y:imgHeight};
            			
						// create a static marker or general blue color
						// scatterSvgHTML = MAMarkerBuilder.createSVG({ type: 'Scatter', color: '#004de6',forLegend: false });
						scatterColor = '#004de6';
						scatterImgUrl = Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter';
					}
					else {
						var markerParts = rule.value.split(':');
						var markerIcon = markerParts[1] || 'Marker';
						var markerColor = markerParts[0] || defaultMarkerColor;
						var markerShape = MAMarkerBuilder.shapes[markerIcon];
						// var svgHTML = MAMarkerBuilder.createSVG({type: 'Marker',color: rule.value,forLegend: false});
						scatterColor = markerParts[0];
						// scatterSvgHTML = MAMarkerBuilder.createSVG({ type: 'Scatter', color: rule.value,forLegend: false });
						
						var imgURLFix = markerColor.replace(/#/g,'');
						markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+markerIcon;
						// markerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(svgHTML));
						markerAnchor = markerShape.anchor;
						markerSize = {height:markerShape.size.y,width:markerShape.size.x};
						scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
						workerCachedMarkers[rule.value] = {
							// markerURL : markerURL,
							markerAnchor : markerAnchor,
							markerSize : markerSize,
							markerImgUrl : markerImgUrl,
							scaledmarkerSize: scaledmarkerSize
						};
					}
					
					//create scatter marker
					var scatterMarkerURL;
                    var scatterMarkerAnchor = scatterShape.anchor;
                    var scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
                    var scatterImgUrl = Worker_MAIO_URL + '?color='+scatterColor.replace(/#/g,'')+'&forlegend=false&icon=Scatter';

					record.markerInfo = {
						markerImgUrl : markerImgUrl,
						icon: {
							url: markerImgUrl,
							anchor: markerAnchor,
							scaledSize : scaledmarkerSize,
							size : markerSize
						},
						markerValue : markerColor,
						optimized: true,
						cursor: 'pointer',
						layerType: 'query-marker',
						title: tooltip1,
						qid : queryRecord.qid || '',
						record : legacyRecord
					}
					record.scatterMarkerInfo = {
						markerImgUrl : scatterImgUrl,
						icon: {
							url: scatterImgUrl,
							anchor: scatterMarkerAnchor,
							scaledSize : scatterMarkerSize
						},
						optimized: true,
						cursor: 'pointer',
						layerType: 'query-marker',
						title: tooltip1,
						qid : queryRecord.qid || '',
						record : legacyRecord,
						color : scatterColor
					}
					
					var shapeCheck = markerColor.split(':')[1] || 'Marker';
					var imageCheck = markerColor.split(':')[0] || 'image';
					
					record.legendId = checkLegend.legendId;
					record.markerValue = checkLegend.markerValue;
					break;
				}
			}
			if(!foundMatch) {
			    
				// other
				dynamicOtherInfo = dynamicOtherInfo || {};
				record.markerInfo = {
					markerImgUrl : dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
					icon: {
						url: dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
						anchor: dynamicOtherInfo.markerAnchor,
						scaledSize : dynamicOtherInfo.scaledmarkerSize,
						size : dynamicOtherInfo.markerSize,
					},
					optimized: true,
					cursor: 'pointer',
					layerType: 'query-marker',
					title: tooltip1,
					qid : queryRecord.qid || '',
					record : legacyRecord
				}
				record.scatterMarkerInfo = {
					markerImgUrl : dynamicOtherInfo.scatterMarkerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Scatter',
					icon: {
						url: dynamicOtherInfo.scatterMarkerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Scatter',
						anchor: dynamicOtherInfo.scatterMarkerAnchor,
						scaledSize : dynamicOtherInfo.scatterMarkerSize,
					},
					optimized: true,
					cursor: 'pointer',
					layerType: 'query-marker',
					title: tooltip1,
					qid : queryRecord.qid || '',
					record : legacyRecord,
					color : scatterColor
				}

			    record.legendId = dynamicOtherInfo.legendId;
				record.markerValue = dynamicOtherInfo.markerValue;
				//update other if auto assign
			    if(automaticAssign) {
			        record.markerInfo.optimized = true;
			        record.scatterMarkerInfo.optimized = true;
			        //compare to map of legend possibilities
			        if(autoAssignMap[picklistValue]) {
			            //reuse old
			            record.legendId = autoAssignMap[picklistValue].legendId;
					    record.markerValue = autoAssignMap[picklistValue].markerValue;
					    
						record.markerInfo.markerImgUrl = autoAssignMap[picklistValue].markerImgUrl;
						record.markerInfo.icon =  {
							url: autoAssignMap[picklistValue].markerImgUrl,
							anchor: autoAssignMap[picklistValue].markerAnchor,
                            size: autoAssignMap[picklistValue].markerSize,
                            scaledSize: autoAssignMap[picklistValue].markerSize.scaledmarkerSize
						};
						record.scatterMarkerInfo.markerImgUrl = autoAssignMap[picklistValue].scatterMarkerImgUrl;
						record.scatterMarkerInfo.icon =  {
							url: autoAssignMap[picklistValue].scatterMarkerImgUrl,
							anchor: autoAssignMap[picklistValue].scatterAnchor,
							scaledSize: autoAssignMap[picklistValue].scatterSize
						};
						
					    autoAssignMap[picklistValue].count++;
					    autoAssignMap[picklistValue].recordIndexes.push(i);
					    
			        }
			        else {
			            //generate random color shape combo;
			            var autoLegendId = 'lid'+autoAssignIndex;
			            record.legendId = autoLegendId;
			            
			            // shape can be static as specified in the advancedOptions or assigned randomly as per JIRA case: MAP-250 ('https://Maps.atlassian.net/browse/MAP-250')
			            var shape;
			            var assignStaticShape = workerGetProperty(advancedOptions, 'markerShapeType') == 'static' ? true : false;
			            if(assignStaticShape) {
			            	 var markerShapeColorShape = workerGetProperty(advancedOptions, 'markerShapeValue');
			            	 var colorShapeArray = String(markerShapeColorShape).split(':');
			            	 
			            	 if(colorShapeArray.length >= 2) {
			            	 	shape = colorShapeArray[1];
			            	 }
			            } else {
			            	shape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
			            }
			            
			            var color = workerRandomHexColorCode();
			            var markerValue = color + ':' + shape;
			            var markerURL;
			            var markerAnchor;
                        var markerSize;
                        var scaledmarkerSize;
			            var scatterMarkerURL;
						var scatterShape = MAMarkerBuilder.shapes['Scatter'];
						var scatterImgUrl = Worker_MAIO_URL + '?color='+color.replace(/#/g,'')+'&forlegend=false&icon=Scatter';
						var imgURLFix = markerValue.replace(/#/g,'');
						var markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+shape;
					    record.markerValue = markerValue;
					    
					    var markerShape = MAMarkerBuilder.shapes[shape || 'Marker'];
					    
					    if(workerCachedMarkers[markerValue]) {
							// markerURL = workerCachedMarkers[markerValue].markerURL;
							markerAnchor = workerCachedMarkers[markerValue].markerAnchor;
                            markerSize = workerCachedMarkers[markerValue].markerSize;
                            scaledmarkerSize = workerCachedMarkers[markerValue].scaledmarkerSize;
						}
						else {
							//create static marker
							markerAnchor = markerShape.anchor;
							markerSize = {height:markerShape.size.y,width:markerShape.size.x};
                            scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
							workerCachedMarkers[markerValue] = {
								markerAnchor : markerAnchor,
                                markerSize : markerSize,
                                scaledmarkerSize: scaledmarkerSize
							};
                        }
                        record.markerInfo.markerImgUrl = markerImgUrl;
						record.markerInfo.icon =  {
							url: markerImgUrl,
							anchor: markerAnchor,
                            size : markerSize,
                            scaledSize: scaledmarkerSize
						};

						// create static marker
                        var scatterMarkerAnchor = scatterShape.anchor;
                        var scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
						record.markerInfo.scatterImgUrl = scatterImgUrl;
						record.scatterMarkerInfo.icon =  {
							url: scatterImgUrl,
							anchor: scatterMarkerAnchor,
							scaledSize : scatterMarkerSize
						};
            			
            			//try to get the name of the lookupfield
                        var nameValue = getPolyField(record, polymorphicObject, colorByPicklistField, true, isPoly, undefined);
						nameValue = nameValue == undefined ? '' : nameValue; // 'N/A'
						var legendValue = htmlDecode(nameValue);
						if(/^\<a.*\>.*\<\/a\>/i.test(legendValue)){
							legendValue = legendValue.match(/<a [^>]+>([^<]+)<\/a>/)[1];
						}
			            //create new
			            autoAssignMap[picklistValue] = {
			                legendId : autoLegendId,
			                markerValue : color + ':' + shape,
			                count : 1,
			                recordIndexes : [i],
			                markerAnchor : markerAnchor,
                            markerSize : markerSize,
                            scaledmarkerSize: scaledmarkerSize,
			                markerImgUrl : markerImgUrl,
							nameValue : nameValue,
							legendValue: legendValue,
			                scatterMarkerImgUrl : scatterImgUrl,
			                scatterAnchor : scatterMarkerAnchor,
			                scatterSize : scatterMarkerSize
			            };
			            autoAssignIndex++;
			        }
			    }
			}
		}
		

		//determine what type of marker
		if(markerAssignmentType == 'Static') {
			record.legendId = 'lid0';
			var markerValue = queryRecord.IconColor__c || '#00FF00:Marker';
			if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
				var color = markerValue.split(':')[0];
				record.polyline.color = color;
			}
			record.markerValue = markerValue;
			record.markerImgUrl = staticInfo.markerImgUrl;
		
			record.markerInfo = {
				markerImgUrl : staticInfo.markerImgUrl,
				icon: {
					url: staticInfo.markerImgUrl,
					anchor: staticInfo.markerAnchor,
					scaledSize : staticInfo.scaledmarkerSize,
					size : staticInfo.markerSize
				},
				markerValue : staticInfo.iconColor,
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}
			//scatter
			record.scatterMarkerInfo = {
				markerImgUrl : staticInfo.scatterImageURL,
				icon: {
					url: staticInfo.scatterImageURL,
					anchor: staticInfo.scatterMarkerAnchor,
					scaledSize : staticInfo.scatterMarkerSize
				},
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}

		}
		else if(markerAssignmentType == 'Dynamic-multiField') {
			var picklist1Value = shapeAssignmentIsFirst ? queryRecord.ShapeField__c : queryRecord.PicklistField__c;
			var urlShape = '';
			var urlColor = '';
			var imageURL = '';
			picklist1Value = String(getPolyField(record, polymorphicObject, picklist1Value, true, isPoly, ''));
			var firstSetOfRules = shapeAssignmentIsFirst ? shapeAssignments : colorAssignments;
			var firstSetMatchFound = false;
			var firstSetMatchInfo;
			for(var f = 0, fLen = firstSetOfRules.length; f < fLen; f++) {
				var rule1 = firstSetOfRules[f];
				/*if(rule1.comparevalue == '<Other>') {
					//firstSetOtherInfo = rule1.value;
					break;
				}*/
				urlShape = rule1.value;
				var compareOptions1 = { picklistValue: picklist1Value, rule: rule1, useTimezoneOffset: useTimezoneOffset, FiscalYearSettings:FiscalYearSettings };
				var checkRule1 = workerLegendCompare[rule1.operator](compareOptions1);
				var markerAnchor;
				var markerURL;
				var scatterSvgHTML;
				var scatterShape = MAMarkerBuilder.shapes.Scatter;
				var scatterColor;
				if(checkRule1.foundMatch) {
					firstSetMatchFound = true;
					firstSetFoundIndex = f;
					firstSetMatchInfo = rule1.value;
					break;
				}

				//end of loop without break, is other
				firstSetFoundIndex = f;
				firstSetMatchInfo = rule1.value;
			}

			//process second set
			var picklist2Value = shapeAssignmentIsFirst ? queryRecord.PicklistField__c : queryRecord.ShapeField__c;
			picklist2Value = String(getPolyField(record, polymorphicObject, picklist2Value, true, isPoly, ''));
			var secondSetOfRules = shapeAssignmentIsFirst ? colorAssignments : shapeAssignments;
			var secondSetMatchFound = false;
			var secondSetMatchInfo;
			//start loop
			for(var s = 0, sLen = secondSetOfRules.length; s < sLen; s++) {
				var rule2 = secondSetOfRules[s];
				urlColor = rule2.value.replace(/#/g,'');
				
				var compareOptions2 = { picklistValue: picklist2Value, rule: rule2, useTimezoneOffset: useTimezoneOffset, FiscalYearSettings:FiscalYearSettings };
				var checkRule2 = workerLegendCompare[rule2.operator](compareOptions2);
				var markerAnchor;
				var markerURL;
				var scatterSvgHTML;
				var scatterShape = MAMarkerBuilder.shapes['Scatter'];
				var scatterColor;
				if(checkRule2.foundMatch) {
					secondSetMatchFound = true;
					secondSetFoundIndex = s;
					secondSetMatchInfo = rule2.value;
					break;
				}

				//end of loop without break, is other
				secondSetFoundIndex = s;
				secondSetMatchInfo = rule2.value;
			}

			var markerColor;
			var scatterMarkerURL;
			var scatterMarkerAnchor;
			var scatterMarkerSize;
			var scatterColor;
			/*note about legend math for later
				take first index and multiply by the length of the second list
				then add the remainder to get the position.
			*/
			var legendMath = (firstSetFoundIndex*secondSetOfRules.length)+secondSetFoundIndex;
			var legendId = 'lid'+legendMath;
			var svgHTML;
			var markerShape;
			var scatterImgUrl;
			if(shapeAssignmentIsFirst) {
				scatterColor = secondSetMatchInfo;
				markerShape = MAMarkerBuilder.shapes[firstSetMatchInfo || 'Marker'];
				markerColor = secondSetMatchInfo + ':'+ firstSetMatchInfo;
				imageURL = Worker_MAIO_URL + '?color='+urlColor.replace(/#/g,'')+'&forlegend=false&icon='+urlShape;
				scatterImgUrl = Worker_MAIO_URL + '?color='+urlColor.replace(/#/g,'')+'&forlegend=false&icon=Scatter';
			}
			else {
				markerShape = MAMarkerBuilder.shapes[secondSetMatchInfo || 'Marker'];
				scatterColor = firstSetMatchInfo;
				markerColor = firstSetMatchInfo + ':'+ secondSetMatchInfo;
				imageURL = Worker_MAIO_URL + '?color='+urlShape.replace(/#/g,'')+'&forlegend=false&icon='+urlColor;
				scatterImgUrl = Worker_MAIO_URL + '?color='+urlShape.replace(/#/g,'')+'&forlegend=false&icon=Scatter';
			}

			//create markers
			var markerURL;
			var markerAnchor;
            var markerSize;
            var scaledmarkerSize;
			var markerImgUrl;

			if(workerCachedMarkers[markerColor]) {
				markerAnchor = workerCachedMarkers[markerColor].markerAnchor;
                markerSize = workerCachedMarkers[markerColor].markerSize;
                scaledmarkerSize = workerCachedMarkers[markerColor].scaledmarkerSize;
			}
			else {
				markerAnchor = markerShape.anchor;
                markerSize = {height:markerShape.size.y,width:markerShape.size.x};
                scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
				markerImgUrl = imageURL;
				workerCachedMarkers[markerColor] = {
					markerURL : imageURL,
					markerAnchor : markerAnchor,
					markerSize : markerSize,
                    markerImgUrl : markerImgUrl,
                    scaledmarkerSize: scaledmarkerSize
				};
			}

			//create scatter
			var scatterShape = MAMarkerBuilder.shapes['Scatter'];
			if(workerCachedMarkers[scatterColor+':Scatter']) {
				scatterMarkerAnchor = workerCachedMarkers[scatterColor+':Scatter'].markerAnchor;
				scatterMarkerSize = workerCachedMarkers[scatterColor+':Scatter'].markerSize;
			}
			else {
				//create static marker
				scatterMarkerAnchor = scatterShape.anchor;
				scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};

				workerCachedMarkers[scatterColor+':Scatter'] = {
					markerAnchor : scatterMarkerAnchor,
					markerSize : scatterMarkerSize
				};
			}

			//update records
			record.legendId = legendId;
			record.markerValue = markerColor;
		
			record.markerInfo = {
				markerImgUrl : imageURL,
				icon: {
					url: imageURL,
					anchor: markerAnchor,
                    size : markerSize,
                    scaledSize: scaledmarkerSize
				},
				markerValue : markerColor,
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}
			//scatter
			record.scatterMarkerInfo = {
				markerImgUrl : scatterImgUrl,
				icon: {
					url: scatterImgUrl,
					anchor: scatterMarkerAnchor,
					scaledSize : scatterMarkerSize
				},
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}
		}
		else if(markerAssignmentType == 'Dynamic, Field') {
			//grab the color assignment and find a match
			var pickListField = queryRecord.PicklistField__c;
			var picklistValue = String(getPolyField(record, polymorphicObject, pickListField, true, isPoly, ''));
			var foundMatch = false;
			var otherColor;
			var otherLegendId;
			//autoAssignIndex = colorAssignments.length;
			for(var c = 0, cLen = colorAssignments.length; c < cLen; c++) {
				var rule = colorAssignments[c];
                var markerColor = rule.value;
				//store global other outside marker loop
				if(rule.comparevalue == '<Other>' && dynamicOtherInfo == null)
				{
					var scatterSvgHTML;
					var scatterColor;
					var scatterShape = MAMarkerBuilder.shapes['Scatter'];
					dynamicOtherInfo = {};
					dynamicOtherInfo.legendId = rule.legendId;
					dynamicOtherInfo.markerValue = rule.value;
					
					if(rule.value.indexOf('image:') === 0) {
						var imgId = rule.value.split('image:')[1];
						dynamicOtherInfo.markerURL = Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker'; //standard black marker if we have no image
            			var imgWidth = 15.5;
            			var imgHeight = 41;
            			if(imgLoaderDimensions[imgId]) {
            			    dynamicOtherInfo.markerImgUrl = imgLoaderDimensions[imgId].imgURL || checkImgUrlForProcess(imgId);
            				imgWidth = imgLoaderDimensions[imgId].width/2;
            				imgHeight = imgLoaderDimensions[imgId].height;
            			}
            			dynamicOtherInfo.markerAnchor = {x:imgWidth, y:imgHeight};
						scatterColor = '#004de6';
						if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
							record.polyline.color = defaultMarkerColor;
						}
						dynamicOtherInfo.scatterMarkerImgUrl = Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter';
					}
					else {
						var markerParts = rule.value.split(':');
						var markerIcon = markerParts[1] || 'Marker';
						var markerColor = markerParts[0] || defaultMarkerColor;
						var markerShape = MAMarkerBuilder.shapes[markerIcon];
						if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
							record.polyline.color = markerColor;
						}
						dynamicOtherInfo.markerAnchor = markerShape.anchor;
                        dynamicOtherInfo.markerSize = {height:markerShape.size.y,width:markerShape.size.x};
                        dynamicOtherInfo.scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
						var imgURLFix = markerColor.replace(/#/g,'');
						scatterColor = imgURLFix;
						dynamicOtherInfo.markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+markerIcon;
						workerCachedMarkers[rule.value] = {
							markerAnchor : dynamicOtherInfo.markerAnchor,
                            markerSize : dynamicOtherInfo.markerSize,
                            scaledmarkerSize : dynamicOtherInfo.scaledmarkerSize,
							markerImgUrl : dynamicOtherInfo.markerURL
						};
					}

					//create scatter marker
					var scatterMarkerURL;
					var scatterMarkerAnchor;
					var scatterMarkerSize;
					var scatterMarkerImgUrl;
					
					//create static marker
					// dynamicOtherInfo.scatterMarkerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(scatterSvgHTML));
					dynamicOtherInfo.scatterMarkerAnchor = scatterShape.anchor;
					dynamicOtherInfo.scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
					dynamicOtherInfo.scatterMarkerImgUrl = Worker_MAIO_URL + '?color='+scatterColor.replace(/#/g,'')+'&forlegend=false&icon=Scatter';
					
					autoAssignMap['OtherInfo'] = {
					    legendId : rule.legendId,
                        markerValue : rule.value,
                        scaledmarkerSize: dynamicOtherInfo.scaledmarkerSize,
                        markerSize: dynamicOtherInfo.markerSize,
		                markerImgUrl : dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
		                markerAnchor :  dynamicOtherInfo.markerAnchor,
		                scatterMarkerAnchor : dynamicOtherInfo.scatterMarkerAnchor,
		                scatterMarkerSize : dynamicOtherInfo.scatterMarkerSize,
		                scatterMarkerImgUrl : dynamicOtherInfo.scatterMarkerImgUrl,
		                nameValue : 'Other'
					};
					break;
				}

				//not other so process marker and rule
				var checkLegend;
				
				if(workerLegendCompare[rule.operator]) {
					var compareOptions = { picklistValue: picklistValue, rule: rule, useTimezoneOffset: useTimezoneOffset, FiscalYearSettings:FiscalYearSettings };
				    checkLegend = workerLegendCompare[rule.operator](compareOptions);
				}
				else {
				    checkLegend = {foundMatch:false};
				}
				var markerAnchor;
				var markerURL;
				
                var markerSize;
                var scaledmarkerSize;
				var markerImgUrl;
				var scatterSvgHTML;
				var scatterShape = MAMarkerBuilder.shapes['Scatter'];
				var scatterColor;
				if(checkLegend.foundMatch) {
					foundMatch = true;
					if(rule.value.indexOf('image:') === 0) {
						var imgId = rule.value.split('image:')[1];
						markerURL = Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker'; //standard black marker if we have no image
            			var imgWidth = 15.5;
            			var imgHeight = 41;
            			if(imgLoaderDimensions[imgId]) {
            			    markerImgUrl = imgLoaderDimensions[imgId].imgURL || checkImgUrlForProcess(imgId);
                            markerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
                            scaledmarkerSize = {height:imgLoaderDimensions[imgId].height,width:imgLoaderDimensions[imgId].width};
            				imgWidth = imgLoaderDimensions[imgId].width/2;
            				imgHeight = imgLoaderDimensions[imgId].height;
            			}
            			
            			markerAnchor = {x:imgWidth, y:imgHeight};
            			
						//create a static marker or general blue color
						scatterColor = defaultMarkerColor.replace(/#/g,'');
						if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
							record.polyline.color = defaultMarkerColor;
						}
						scatterImgUrl = Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter';
					}
					else {
						var markerParts = rule.value.split(':');
						var markerIcon = markerParts[1] || 'Marker';
						var markerColor = markerParts[0] || defaultMarkerColor;
						var markerShape = MAMarkerBuilder.shapes[markerIcon];
						var imgURLFix = markerColor.replace(/#/g,'');
						if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
							record.polyline.color = markerColor;
						}
						scatterColor = imgURLFix;
						markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+markerIcon;
						markerAnchor = markerShape.anchor;
                        markerSize = {height:markerShape.size.y,width:markerShape.size.x};
                        scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
						workerCachedMarkers[rule.value] = {
							markerAnchor : markerAnchor,
                            markerSize : markerSize,
                            scaledmarkerSize: scaledmarkerSize,
							markerImgUrl : markerImgUrl
						};
					}
					
					//create scatter marker
					var scatterMarkerURL;
					var scatterMarkerAnchor;
					var scatterMarkerSize;
					var scatterImgUrl;
					//create static marker
					scatterMarkerAnchor = scatterShape.anchor;
					scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
					scatterImgUrl = Worker_MAIO_URL + '?color='+scatterColor.replace(/#/g,'')+'&forlegend=false&icon=Scatter';

					record.markerInfo = {
						markerImgUrl : markerImgUrl,
						icon: {
							url: markerImgUrl,
							anchor: markerAnchor,
                            size : markerSize,
                            scaledSize: scaledmarkerSize
						},
						markerValue : markerColor,
						optimized: true,
						cursor: 'pointer',
						layerType: 'query-marker',
						title: tooltip1,
						qid : queryRecord.qid || '',
						record : legacyRecord
					}
					record.scatterMarkerInfo = {
						markerImgUrl : scatterImgUrl,
						icon: {
							url: scatterImgUrl,
							anchor: scatterMarkerAnchor,
							scaledSize : scatterMarkerSize
						},
						optimized: true,
						cursor: 'pointer',
						layerType: 'query-marker',
						title: tooltip1,
						qid : queryRecord.qid || '',
						record : legacyRecord,
						color : scatterColor
					}
					
					record.legendId = checkLegend.legendId;
					record.markerValue = checkLegend.markerValue;
					break;
				}
			}
			if(!foundMatch) {
				// other
				dynamicOtherInfo = dynamicOtherInfo || {};
				record.markerInfo = {
					markerImgUrl : dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
					icon: {
						url: dynamicOtherInfo.markerImgUrl || Worker_MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
						anchor: dynamicOtherInfo.markerAnchor,
                        size : dynamicOtherInfo.markerSize,
                        scaledSize : dynamicOtherInfo.scaledmarkerSize
					},
					optimized: true,
					cursor: 'pointer',
					layerType: 'query-marker',
					title: tooltip1,
					qid : queryRecord.qid || '',
					record : legacyRecord
				}
				record.scatterMarkerInfo = {
					markerImgUrl : dynamicOtherInfo.scatterMarkerImgUrl,
					icon: {
						url: dynamicOtherInfo.scatterMarkerImgUrl,
						anchor: dynamicOtherInfo.scatterMarkerAnchor,
						scaledSize : dynamicOtherInfo.scatterMarkerSize,
					},
					optimized: true,
					cursor: 'pointer',
					layerType: 'query-marker',
					title: tooltip1,
					qid : queryRecord.qid || '',
					record : legacyRecord,
					color : scatterColor
				}
				record.legendId = dynamicOtherInfo.legendId;
				record.markerValue = dynamicOtherInfo.markerValue;
				//update other if auto assign
			    if(automaticAssign) {
			        record.markerInfo.optimized = true;
			        record.scatterMarkerInfo.optimized = true;
			        //compare to map of legend possibilities
			        if(autoAssignMap[picklistValue]) {
			            //reuse old
			            record.legendId = autoAssignMap[picklistValue].legendId;
					    record.markerValue = autoAssignMap[picklistValue].markerValue;
					    
						record.markerInfo.markerImgUrl = autoAssignMap[picklistValue].markerImgUrl;
						record.markerInfo.icon =  {
							url: autoAssignMap[picklistValue].markerImgUrl,
							anchor: autoAssignMap[picklistValue].markerAnchor,
                            size: autoAssignMap[picklistValue].markerSize,
                            scaledSize: autoAssignMap[picklistValue].scaledmarkerSize,
						};
						record.scatterMarkerInfo.markerImgUrl = autoAssignMap[picklistValue].scatterMarkerImgUrl;
						record.scatterMarkerInfo.icon =  {
							url: autoAssignMap[picklistValue].scatterMarkerImgUrl,
							anchor: autoAssignMap[picklistValue].scatterAnchor,
							scaledSize: autoAssignMap[picklistValue].scatterSize
						};
						
					    autoAssignMap[picklistValue].count++;
					    autoAssignMap[picklistValue].recordIndexes.push(i);
					    
			        }
			        else {
			            //generate random color shape combo;
			            var autoLegendId = 'lid'+autoAssignIndex;
			            record.legendId = autoLegendId;
			            
			            // shape can be static as specified in the advancedOptions or assigned randomly as per JIRA case: MAP-250 ('https://Maps.atlassian.net/browse/MAP-250')
			            var shape;
			            var assignStaticShape = workerGetProperty(advancedOptions, 'markerShapeType') == 'static' ? true : false;
			            if(assignStaticShape) {
			            	 var markerShapeColorShape = workerGetProperty(advancedOptions, 'markerShapeValue');
			            	 var colorShapeArray = String(markerShapeColorShape).split(':');
			            	 
			            	 if(colorShapeArray.length >= 2) {
			            	 	shape = colorShapeArray[1];
			            	 }
			            } else {
			            	shape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
			            }
			            
			            var color = workerRandomHexColorCode();
			            var markerValue = color + ':' + shape;
			            var markerURL;
			            var markerAnchor;
                        var markerSize;
                        var scaledmarkerSize;
			            var scatterMarkerURL;
			            var scatterMarkerAnchor;
			            var scatterMarkerSize;
						var scatterShape = MAMarkerBuilder.shapes['Scatter'];
						var imgURLFix = color.replace(/#/g,'');
						if (queryRecord.AdvancedOptions__c.isPolyline == 'true' && isTherePolyline == true) {
							record.polyline.color = color;
						}
						var scatterImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon=Scatter';
						var markerImgUrl = Worker_MAIO_URL + '?color='+imgURLFix+'&forlegend=false&icon='+shape;
					    record.markerValue = markerValue;
					    
					    var markerShape = MAMarkerBuilder.shapes[shape || 'Marker'];
					    if(workerCachedMarkers[markerValue]) {
							markerAnchor = workerCachedMarkers[markerValue].markerAnchor;
                            markerSize = workerCachedMarkers[markerValue].markerSize;
                            scaledmarkerSize = workerCachedMarkers[markerValue].scaledmarkerSize;
						}
						else {
							//create static marker
							markerAnchor = markerShape.anchor;
							markerSize = {height:markerShape.size.y,width:markerShape.size.x};
                            scaledmarkerSize = {height:markerShape.size.y/2,width:markerShape.size.x/2};
							workerCachedMarkers[markerValue] = {
								markerAnchor : markerAnchor,
                                markerSize : markerSize,
                                scaledmarkerSize: scaledmarkerSize
							};
						}
						//do scatter
						scatterMarkerAnchor = scatterShape.anchor;
						scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};
						record.markerInfo.markerImgUrl = markerImgUrl;
						record.markerInfo.icon =  {
							url: markerImgUrl,
							anchor: markerAnchor,
                            size : markerSize,
                            scaledSize: scaledmarkerSize
						};
						record.markerInfo.scatterImgUrl = scatterImgUrl;
						record.scatterMarkerInfo.icon =  {
							url: scatterImgUrl,
							anchor: scatterMarkerAnchor,
							scaledSize : scatterMarkerSize
						};
						
            			//try to get the name of the lookupfield
                        var nameValue = getPolyField(record, polymorphicObject, colorByPicklistField, true, isPoly, undefined);
						nameValue = nameValue == undefined ? '' : nameValue; // 'N/A'
						var legendValue = htmlDecode(nameValue);
						if(/^\<a.*\>.*\<\/a\>/i.test(legendValue)){
							legendValue = legendValue.match(/<a [^>]+>([^<]+)<\/a>/)[1];
						}
			            //create new
			            autoAssignMap[picklistValue] = {
			                legendId : autoLegendId,
			                markerValue : color + ':' + shape,
			                count : 1,
			                recordIndexes : [i],
			                markerAnchor : markerAnchor,
                            markerSize : markerSize,
                            scaledmarkerSize: scaledmarkerSize,
			                markerImgUrl : markerImgUrl,
							nameValue : nameValue,
							legendValue: legendValue,
			                scatterMarkerImgUrl : scatterImgUrl,
			                scatterAnchor : scatterMarkerAnchor,
			                scatterSize : scatterMarkerSize
			            };
			            autoAssignIndex++;
			        }
			    }
			}
		}
		else if(markerAssignmentType == 'Dynamic-Label') 
		{
			record.legendId = 'lid0';
			record.markerValue = 'labelMarker';
			
			//grab the lookup field or tooltip1 value
			var recordLabelValue = getPolyField(record, polymorphicObject, labelFieldToGet, true, isPoly, 'N/A');
			//MAP-4129, number fields appear as undefined
			recordLabelValue = String(recordLabelValue);
			record.tooltip1 = recordLabelValue;
			//shorten label
			if(tooltip1.length > 40) {
				record.tooltip1 = tooltip1.substring(0, 40).concat('...');
			}
			
			// we will run a process very similar to dynamic field to assign colors to records and we'll add the colors here to modify record's dynamic label marker images
			// background color based on field picked if any
			if(colorAssignments && String(colorAssignments).trim() != '')
			{
				processColorAssignentsForDynamicLabel();
				markerLabelTextColor = (advancedOptions.markerLabelTextColor) ? advancedOptions.markerLabelTextColor : '#FFFFFF';
				markerLabelBackgroundColor = record.markerValue ? String(record.markerValue).trim().split(':')[0] : '#000000';
			}
			else // legacy dynamic label functionality
			{
				var markerLabelTextColor = (advancedOptions.markerLabelTextColor) ? advancedOptions.markerLabelTextColor : '#cccccc';
				var markerLabelBackgroundColor = (advancedOptions.markerLabelBackgroundColor) ? advancedOptions.markerLabelBackgroundColor : '#000000';
			}
			record.labelInfo = {
				labelStyledIcon : {
					color: markerLabelBackgroundColor,
				    fore: markerLabelTextColor
				},
				lableMarker : {
    				draggable:false,
    				layerType: 'query-marker',
    				title: recordLabelValue,
    				qid : queryRecord.qid || '',
    				record : legacyRecord,
    				markerValue : 'labelMarker'
				},
				labelField : labelFieldToGet,
				labelType : labelFieldType
			}
			
			//scatter
			var scatterShape = MAMarkerBuilder.shapes['Scatter'];
			var scatterMarkerURL;
			var scatterMarkerAnchor;
			var scatterMarkerSize;
			// var scatterSvgHTML = MAMarkerBuilder.createSVG({ type: 'Scatter', color: markerLabelBackgroundColor,forLegend: false });
			if(workerCachedMarkers[markerLabelBackgroundColor+':Scatter']) {
				// scatterMarkerURL = workerCachedMarkers[markerLabelBackgroundColor+':Scatter'].markerURL;
				scatterMarkerAnchor = workerCachedMarkers[markerLabelBackgroundColor+':Scatter'].markerAnchor;
			}
			else {
				//create static marker
				// scatterMarkerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(scatterSvgHTML));
				scatterMarkerAnchor = scatterShape.anchor;
				scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};

				workerCachedMarkers[scatterColor+':Scatter'] = {
					// markerURL : scatterMarkerURL,
					markerAnchor : scatterMarkerAnchor,
					markerSize : scatterMarkerSize
				};
			}
			record.scatterMarkerInfo = {
				icon: {
					url: Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter',
					anchor: scatterMarkerAnchor,
					scaledSize : scatterMarkerSize
				},
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}

		}
		else if(markerAssignmentType == 'Dynamic-Order') {

			record.legendId = 'lid0';
			record.markerValue = 'orderMarker';

			//grab the index
			var recordIndex = 'N/A';
			for(var r = 0,rLen = recordList.length; r < rLen; r++) {
			    var compareId = recordList[r];
			    if(record.Id === compareId) {
			        recordIndex = r + 1;
			    }
			}

			var text = String(recordIndex);
			var width = text.length*8 + 18;

			//start building the icon svg
			var iconSVG = 
			'<svg width="__WIDTH__" height="__HEIGHT__" xmlns="http://www.w3.org/2000/svg">' +
				'<ellipse opacity="0.65" cx="__X__" cy="__Y__" rx="__RECT_WIDTH__" ry="__RECT_HEIGHT__" style="fill:__BRUSH__;stroke:__STROKE__;stroke-width:__STROKEWIDTH__;"/>' +
				'<text font-size="14" font-family="monospace" x="__OFFSETX__" y="__OFFSETY__" fill="__TEXT_PEN__" style="font-size:14px;">__TEXT__</text>' +
			'</svg>';

			//replace svg parts with updated info
			iconSVG = iconSVG.replace(/__TEXT__/g, text)
				.replace(/__BRUSH__/g, "#000070")
				.replace(/__STROKE__/g, "#FFF")
				.replace(/__STROKEWIDTH__/g, 1)
				.replace(/__TEXT_PEN__/g, "#FFF")
				.replace(/__WIDTH__/g, width)
				.replace(/__HEIGHT__/g, 20)
				.replace(/__RECT_WIDTH__/g, width/2)
				.replace(/__RECT_HEIGHT__/g, 10)
				.replace(/__OFFSETX__/g, 8)
				.replace(/__OFFSETY__/g, 14.5)
				.replace(/__X__/g, width/2)
				.replace(/__Y__/g, 10);


            
			var markerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(iconSVG));
			record.markerInfo = {
				icon: {
					url: markerURL,
					anchor: {x:width/2,y:10},
					scaledSize : {height:20,width:width}
				},
				markerValue : 'orderMarker',
				optimized: isIE ? false : true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}

			//scatter
			record.sf_order = text;
			var scatterShape = MAMarkerBuilder.shapes['Scatter'];
			var scatterMarkerURL;
			var scatterMarkerAnchor;
			var scatterMarkerSize;
			var scatterSvgHTML = MAMarkerBuilder.createSVG({ type: 'Scatter', color: '#000070:Scatter',forLegend: false });
			if(workerCachedMarkers['#000070:Scatter']) {
				// scatterMarkerURL = workerCachedMarkers['#000070:Scatter'].markerURL;
				scatterMarkerAnchor = workerCachedMarkers['#000070:Scatter'].markerAnchor;
			}
			else {
				//create static marker
				// scatterMarkerURL = 'data:image/svg+xml;base64,'+CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(scatterSvgHTML));
				scatterMarkerAnchor = scatterShape.anchor;
				scatterMarkerSize = {height:scatterShape.size.y,width:scatterShape.size.x};

				workerCachedMarkers['#000070:Scatter'] = {
					// markerURL : scatterMarkerURL,
					markerAnchor : scatterMarkerAnchor,
					markerSize : scatterMarkerSize
				};
			}

			record.scatterMarkerInfo = {
				icon: {
					url: Worker_MAIO_URL + '?color='+defaultMarkerColor+'&forlegend=false&icon=Scatter',
					anchor: scatterMarkerAnchor,
					scaledSize : scatterMarkerSize
				},
				optimized: true,
				cursor: 'pointer',
				layerType: 'query-marker',
				title: tooltip1,
				qid : queryRecord.qid || '',
				record : legacyRecord
			}
		}
	}
	callback({success:true,records:records,autoAssignMap : autoAssignMap,shapeIdsToPlot:shapeIdsToPlot, recordsToGeocode: recordsToGeocode, recordList : recordList});
}
 
function mobileSortListView (data,callback) {
    /***********
     * recordList - array
     * sortByArray - [{sortBy:'foo',id:int},{sortBy:'bar',id:int}...]
    *************/
    var recordList = data.recordList || [];
    if(typeof recordList == 'string') {
	    try {
	        recordList = JSON.parse(recordList);
	    }
	    catch(e) {
	        recordList = [];
	    }
	}
	var sortArray = data.sortArray || [];
    if(typeof sortArray == 'string') {
	    try {
	        sortArray = JSON.parse(sortArray);
	    }
	    catch(e) {
	        sortArray = [];
	    }
	}
	
	var sortObject = data.sortObject || {};
	if(typeof sortObject == 'string') {
	    try {
	        sortObject = JSON.parse(sortObject);
	    }
	    catch(e) {
	        sortObject = {sortBy : 'asc'};
	    }
	}
	var sortDirection = data.sortDirection || 'desc';
    
    var tempList = sortArray.keySort(sortObject);
    /*if(sortDirection === 'desc') {
        tempList = MASortFunction.MergeSortDesc(sortArray);
    }
    else if (sortDirection === 'asc') {
        tempList = MASortFunction.MergeSortAsc(sortArray);
    }
    else {
        tempList = sortArray;
    }*/
    
	var newRecordIdList = [];
	
    //loop over the results and order the record list
    for(var i = 0, len = tempList.length; i < len; i++) {
        var result = tempList[i];
        newRecordIdList.push(result.recId);
    }
    
    var returnData = {
        recordList : newRecordIdList,
        sortedArray : tempList
    };
    var tempList = null;
    callback({success:true,data:returnData});
}

//Helper Function for worker
function workerGetProperty(obj, prop, removeWorkspace) 
{
	prop = prop || '';

    if(removeWorkspace !== false)
    {
		//needed when working in our packaging org(s)
		if ( 'maps' == 'maps')
		{
			obj = workerRemoveNamespace(obj,'maps__');
			//remove from string prop as well
			prop = prop.replace(/maps__/g,'');
		}
    }

	var arr = prop.split(".");
		while(arr.length && (obj = obj[arr.shift()]));
	return obj;
}

function MAWorkerGetProperty(obj, props) {
    /*
     * obj - {}
     * props [] - array sequence of proprties to retreive from object
     */
    if(obj && typeof obj == 'object') {
    	if(Array.isArray(props)) 
    	{
    		while(props.length && (obj = obj[props.shift()]));
        	return obj;
    	}
    	else if(typeof props == 'string' && props.trim())
    	{
    		return workerGetProperty(obj, props, false);
    	}
    }
}
                
function workerRemoveNamespace (obj,nameSpace) {
	try {
		var namespacePrefix = nameSpace || 'maps__';
		for(var key in obj) {
			var val = obj[key];
			if(key == 'plottedQuery' || key == 'marker' || key == 'scatterMarker' || key == 'clusterMarker' || key == 'clusterGroup' || key == 'workers') {
				continue;
			}
			if (key.indexOf(namespacePrefix) == 0) {
				obj[key.replace(namespacePrefix, '')] = val;
				delete obj[key];

				//go recursive if this is an object
				if (obj[key.replace(namespacePrefix, '')] != null && typeof obj[key.replace(namespacePrefix, '')] == 'object') {
					workerRemoveNamespace(obj[key.replace(namespacePrefix, '')]);
				}
			}
			else if (typeof val == 'object') {
				workerRemoveNamespace(val);
			}
		};
	}
	catch (err) { } //this is most likely due to a null value being passed.  in any case, returning the original objects seems the correct action if we can't manipulate it
	return obj;
}



/*
* Changed workerLegendCompare[functionName] method signature
* 
* OLD METHOD SIG:
* functionName : function (picklistValue, rule)
* 
* NEW METHOD SIG:
* functionName : function (options)
*
* This will help with future modifications and also help remedy
* the timezone offset issue. The 'options' var will look like:

options = {
    picklistValue: String,
    rule: Object,
    useTimezoneOffset: Boolean
}

* RJH - Case 10816: [https://na8.salesforce.com/500C0000012F2Yq]
*/
var workerLegendCompare = {
	contains : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
	    picklistValue = htmlDecode(picklistValue);
		var returnObj = {foundMatch:false};
		
		if(picklistValue.toLowerCase().indexOf(rule.comparevalue.toLowerCase()) >= 0)
		{
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		return returnObj;
	},
	starts : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
	    picklistValue = htmlDecode(picklistValue);
		var returnObj = {foundMatch:false};
		if(picklistValue.toLowerCase().indexOf(rule.comparevalue.toLowerCase()) == 0)
		{
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		return returnObj;
	},
	equals : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
	    picklistValue = htmlDecode(picklistValue);
		var returnObj = {foundMatch:false};
		if(picklistValue.toLowerCase() == rule.comparevalue.toLowerCase())
		{
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		return returnObj;
	},
	includes : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
	    picklistValue = htmlDecode(picklistValue);
		var picklistArray = picklistValue.toLowerCase().split(';');
		var selectionArray = rule.comparevalue.toLowerCase().split('~~');
		
		var returnObj = {foundMatch:false};
		if(arrayContains(selectionArray,picklistArray)) {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
        
        
		function arrayContains(haystack, needles) {
		     var foundMatch = false;
			 var l = needles.map(function (needle) {
			        if(haystack.indexOf(needle) != -1) {
                        foundMatch = true;
			        }
				
			        });

            return foundMatch;
		}
		    //var foundMatch = false;
			/**return needles.map(function (needle) {
			    if(!foundMatch){
			        if(haystack.indexOf(needle) > -1){
			            foundMatch = true;
			        }
			        
			    } else {
			        return 0;
			    }
				return haystack.indexOf(needle);
			}).indexOf(-1) == -1;
		}*/
       
		return returnObj;
		
	},
	excludes : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
	    picklistValue = htmlDecode(picklistValue);
		var picklistArray = picklistValue.toLowerCase().split(';');
		var selectionArray = rule.comparevalue.toLowerCase().split('~~');
		var returnObj = {foundMatch:false};

		if(arrayDoesNotContains(selectionArray,picklistArray)) {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}

		function arrayDoesNotContains(haystack, needles) {
			return needles.map(function (needle) { 
				return haystack.indexOf(needle);
			}).indexOf(1) == -1;
		}

		return returnObj;
	},
	currency : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    
		var returnObj = {foundMatch:false};
		var fromval = rule.comparevalue.replace(/,/g, '');
		var toval = rule.toVal.replace(/,/g, '');
		var convertedValue = picklistValue;

		var decimalLength;
		if((fromval % 1 != 0 || toval % 1 != 0) == true) {
			//is it a decimal?
			decimalLength = fromval.split('.').length == 2 ? fromval.split('.')[1].length : 2;
		}
		else {
			decimalLength = 0;
		}
		//round picklistValue to ensure we catch all values if decimal is used
   		round(convertedValue, decimalLength);

		function round(num, places) {
			var multiplier = Math.pow(10, places);
			return Math.round(num * multiplier) / multiplier;
		}

		if(isNaN(convertedValue) == true || convertedValue == '') {
			return returnObj;
		}
		else if (+convertedValue >= +fromval && +convertedValue <= +toval) {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		else if (+convertedValue >= +fromval && toval == '') {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		else if (+convertedValue <= +toval && fromval == '') {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
			
		}
		return returnObj;
	},
	date : function (options) {
		var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    var FiscalYearSettings = options.FiscalYearSettings;
		var returnObj = {foundMatch:false};
		
		if (!picklistValue || picklistValue == 'undefined') {
		    return returnObj;
		}

		var fromMatches = false;
		var fromIsDateLiteral = false;
		var toMatches = false;
		var toIsDateLiteral = false;

		var timezoneOffset = 0;
		if(options.useTimezoneOffset) {
		    timezoneOffset = +sfTimeZoneOffset;
		}
		
		// keeping originalValue for timezone use, case 00015175
		var originalValue = +picklistValue;
		var picklistMoment;

		// Only apply timezoneOffset to date fields, case 00043010
		if (moment(originalValue).utc().hours() === 0 && moment(originalValue).utc().minutes() === 0 && moment(originalValue).utc().seconds() === 0) {
			// Date
			picklistMoment = moment(+picklistValue).subtract(timezoneOffset,'milliseconds');
		} else {
			// dateTime
			picklistMoment = moment(+picklistValue);
		}
		 
		// 2/6/2018, modifing literals to use end of week etc
		// Last Year --> Last Week = take first day of 'Last Year' and last day of 'Last Week'

		// check if date literal
		var dateArrayTest = ["day", "year", "quarter", "month", "week"];
		
		for (var i = 0; i < MADateLiterals.length; i++)
        {
			var dateLiteral = MADateLiterals[i];
			var recordMoment = picklistMoment;
			var momentTimeToCompare = dateLiteral.getMoment({ FiscalYearSettings: FiscalYearSettings }).local();

            // check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
            if (dateLiteral.label == rule.comparevalue && dateLiteral.value != 'DYNAMIC')
            {
				fromIsDateLiteral = true;
                // compare
                if (moment(+originalValue)) {
					if (recordMoment.isValid() && momentTimeToCompare.isValid()) {
						// 2/6/18 change
						// get the first day of the literal
						var ruleRange = dateLiteral.momentUnit
						// start with getting beginning of day
						var startOfDateCompare = momentTimeToCompare.startOf('day');
						// make sure we have a valid range
						var inArray = false;
						for(var ci = 0; ci < dateArrayTest.length; ci++) {
							var value = dateArrayTest[ci];
							if(value == ruleRange) {
								inArray = true;
								break;
							}
						}
						
						// now compare
						if(inArray) {
							if (FiscalYearSettings.yearType == 'Custom') {
								var dateLiteralObj = MADateLiteralsObj[dateLiteral.label.replace('_', ' ')]({ FiscalYearSettings: FiscalYearSettings });
								startOfDateCompare = moment(dateLiteralObj.start);
							} else {
								// get the beginning of rule --> beginning of Last Year
								startOfDateCompare = startOfDateCompare.startOf(ruleRange);
							}
						}

						fromMatches = recordMoment.isSameOrAfter(startOfDateCompare);
						// old compare pre 2/6 change
						// fromMatches = !recordMoment.startOf('day').isBefore(momentTimeToCompare.startOf('day'));
					}
                }
            }
            if (MADateLiterals[i].label == rule.enddate && MADateLiterals[i].value != 'DYNAMIC')
            {
            	toIsDateLiteral = true;
            	
            	// compare
            	if (moment(+originalValue)) {
            		if (recordMoment.isValid() && momentTimeToCompare.isValid()) {
						// 2/6/18 change
						// get the first day of the literal
						var ruleRange = dateLiteral.momentUnit
						// start with getting endo of day
						var endOfDateCompare = momentTimeToCompare.endOf('day');
						// make sure we have a valid range
						var inArray = false;
						for(var ci = 0; ci < dateArrayTest.length; ci++) {
							var value = dateArrayTest[ci];
							if(value == ruleRange) {
								inArray = true;
								break;
							}
						}

						// now compare
						if(inArray) {
							if (FiscalYearSettings.yearType == 'Custom') {
								var dateLiteralObj = MADateLiteralsObj[dateLiteral.label.replace('_', ' ')]({ FiscalYearSettings: FiscalYearSettings });
								endOfDateCompare = moment(dateLiteralObj.end);
							} else {
								// get the beginning of rule --> beginning of Last Year
								endOfDateCompare = endOfDateCompare.endOf(ruleRange);
							}
						}
						toMatches = recordMoment.isSameOrBefore(endOfDateCompare);
						// old compare
						// toMatches = !recordMoment.isAfter(momentTimeToCompare.endOf('day'));
					}
            	}
            }
        }

        // check from - date literal
		try {
            var stringParts = rule.comparevalue.split(' ');
            if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                var checkArr = ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS'];
                var inArray = false;
                for(var ci = 0; ci < checkArr.length; ci++) {
                    var value = checkArr[ci];
                    if(value == stringParts[2]) {
						inArray = true;
						break;
                    }
                }
               
            	if(isNum(stringParts[1]) && stringParts.length == 3 && inArray) 
            	{
					fromIsDateLiteral = true;
					if (stringParts[0] == 'NEXT' && picklistMoment.isSameOrAfter(moment().local().startOf(stringParts[2].substring(0,stringParts[2].length-1).toLowerCase()))) {
                        fromMatches = true;
                    }
                    else if (stringParts[0] == 'LAST' && picklistMoment.isSameOrAfter(moment().local().subtract(stringParts[1],stringParts[2].toLowerCase()).startOf(stringParts[2].substring(0,stringParts[2].length-1).toLowerCase()))) {
						fromMatches = true;
                    }
                }
                else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') 
                {
                    if (stringParts[3] == 'QUARTERS') // fiscal quarter logic needs to be applied
                    {
						fromIsDateLiteral = true;
						
						var numOfQuarters = stringParts[1];
						var dateLiteralObj = MADateLiteralsObj[rule.comparevalue.replace(stringParts[1], 'N')]({ FiscalYearSettings: FiscalYearSettings, value: numOfQuarters });

            			var currentFiscalQuarterStartDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterStartDate');
            			var currentFiscalQuarterEndDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterEndDate');
						var quarterDateFormat = MAWorkerGetProperty(FiscalYearSettings, 'dateFormat');
						

            			if(currentFiscalQuarterStartDate && currentFiscalQuarterEndDate) 
            			{
	        				if(stringParts[0] == 'NEXT') 
	            			{
								
 								var currentFiscalQuarterEndDateMom =  moment(dateLiteralObj.start);
            					fromMatches = picklistMoment.isSameOrAfter(currentFiscalQuarterEndDateMom);
	            			} 
	            			else if(stringParts[0] == 'LAST') 
	            			{
 								var lastNFiscalQuartersStartDateMom = moment(dateLiteralObj.start);
            					fromMatches = picklistMoment.isSameOrAfter(lastNFiscalQuartersStartDateMom);
	            			}
            			}	
                    }
                    else if (stringParts[3] == 'YEARS') 
                    {
                    	fromIsDateLiteral = true;
                    	
                        var numOfFiscalYears = stringParts[1];
						var dateLiteralObj = MADateLiteralsObj[rule.comparevalue.replace(stringParts[1], 'N')]({ FiscalYearSettings: FiscalYearSettings, value: numOfFiscalYears });

                        var currentFiscalYearStartDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalYearStartDate');
            			var currentFiscalYearEndDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalYearEndDate');
						var fiscalDateFormat = MAWorkerGetProperty(FiscalYearSettings, 'dateFormat');
						
            			if(currentFiscalYearStartDate && currentFiscalYearEndDate)
            			{
	        				if(stringParts[0] == 'NEXT') 
	            			{
 								var nextNFiscalYearsStartDateMom = moment(dateLiteralObj.start);
            					fromMatches = picklistMoment.isSameOrAfter(nextNFiscalYearsStartDateMom);
	            			} 
	            			else if(stringParts[0] == 'LAST') 
	            			{
 								var lastNFiscalYearsStartDateMom = moment(dateLiteralObj.start);
								fromMatches = picklistMoment.isSameOrAfter(lastNFiscalYearsStartDateMom);
	            			}
            			}	
                    }
                }
            }
            else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
            	var stringPartsValue = parseInt(stringParts[0]);
            	var stringPartsUnit = stringParts[1].toLowerCase();
            	var checkArr = ['days', 'years'];
                var inArray = false;
                for(var ci = 0; ci < checkArr.length; ci++) {
                    var value = checkArr[ci];
                    if(value == stringPartsUnit) {
						inArray = true;
						break;
                    }
                }
            	if (!isNaN(stringPartsValue) && inArray) {
            		fromIsDateLiteral = true;
            		var stringPartsEnd = stringParts[2] + (stringParts[3] ? ' ' + stringParts[3] : '');
            		if (stringPartsEnd == 'AGO') {						
            			if (picklistMoment.isSameOrAfter(moment().local().subtract(stringParts[0],stringParts[1].toLowerCase()).startOf(stringParts[1].substring(0,stringParts[1].length-1).toLowerCase()))) {
            				fromMatches = true;
            			}
            		}
            		else if (stringPartsEnd == 'FROM NOW') {
            			if (picklistMoment.isSameOrAfter(moment().local().add(stringParts[0],stringParts[1].toLowerCase()).startOf(stringParts[1].substring(0,stringParts[1].length-1).toLowerCase()))) {
            				fromMatches = true;
            			}
            		}
            	}
            }
        }
        catch (err) { }
        
        // check if the to value is a dynamic date literal
        try {
            var stringParts = rule.enddate.split(' ');
            if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                var checkArr = ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS'];
                var inArray = false;
                
                for(var ci = 0; ci < checkArr.length; ci++) {
                    var value = checkArr[ci];
                    if(value == stringParts[2]) {
						inArray = true;
						break;
                    }
                }
            	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && inArray) {
					toIsDateLiteral = true;
					
					var momentTimeToCompare = moment().local().subtract(stringParts[1],stringParts[2].toLowerCase()).endOf(stringParts[2].substring(0,stringParts[2].length-1).toLowerCase());

                    if (stringParts[0] == 'NEXT' && picklistMoment.isSameOrBefore(moment().local().add(stringParts[1],stringParts[2].toLowerCase()).endOf(stringParts[2].substring(0,stringParts[2].length-1).toLowerCase()))) {
						toMatches = true;
					}
					else if (stringParts[0] == 'LAST' && picklistMoment.isSameOrBefore(momentTimeToCompare)) {
						toMatches = true;
                    }
                }
                else if(stringParts.length == 4 && stringParts[2] == 'FISCAL') // fiscal quarter logic needs to be applied
        		{
        			if (stringParts[3] == 'QUARTERS') // fiscal quarter logic needs to be applied
                    {
                    	toIsDateLiteral = true;
                    	
	        			var numOfQuarters = stringParts[1];
						var dateLiteralObj = MADateLiteralsObj[rule.enddate.replace(stringParts[1], 'N')]({ FiscalYearSettings: FiscalYearSettings, value: numOfQuarters });

	        			var currentFiscalQuarterStartDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterStartDate');
	        			var currentFiscalQuarterEndDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterEndDate');
	        			var quarterDateFormat = MAWorkerGetProperty(FiscalYearSettings, 'dateFormat');
	
	        			if(currentFiscalQuarterStartDate && currentFiscalQuarterEndDate) 
	        			{
	        				if(stringParts[0] == 'NEXT') 
	            			{
	 							var nextNFiscalQuartersEndDateMom = moment(dateLiteralObj.end);
	        					toMatches = picklistMoment.isSameOrBefore(nextNFiscalQuartersEndDateMom);
	            			} 
	            			else if(stringParts[0] == 'LAST') 
	            			{
	 							var endOfLastNFiscalQuartersMom = moment(dateLiteralObj.end);
	        					toMatches = picklistMoment.isSameOrBefore(endOfLastNFiscalQuartersMom);
	            			}
	        			}	
                    }
                    else if (stringParts[3] == 'YEARS') 
                    {
                    	toIsDateLiteral = true;
                    	
                        var numOfFiscalYears = stringParts[1];
						var dateLiteralObj = MADateLiteralsObj[rule.enddate.replace(stringParts[1], 'N')]({ FiscalYearSettings: FiscalYearSettings, value: numOfFiscalYears });

                        var currentFiscalYearStartDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalYearStartDate');
            			var currentFiscalYearEndDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalYearEndDate');
            			var fiscalDateFormat = MAWorkerGetProperty(FiscalYearSettings, 'dateFormat');
            			
            			if(currentFiscalYearStartDate && currentFiscalYearEndDate) 
            			{
	        				if(stringParts[0] == 'NEXT') 
	            			{
 								var nextNFiscalYearsEndDateMom = moment(dateLiteralObj.end);
            					toMatches = picklistMoment.isSameOrBefore(nextNFiscalYearsEndDateMom);
	            			} 
	            			else if(stringParts[0] == 'LAST') 
	            			{
 								var lastNFiscalYearsEndDateMom = moment(dateLiteralObj.end);
								toMatches = picklistMoment.isSameOrBefore(lastNFiscalYearsEndDateMom);
	            			}
            			}	
                    }
        		}
            }
            else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
            	var stringPartsValue = parseInt(stringParts[0]);
            	var stringPartsUnit = stringParts[1].toLowerCase();
            	var checkArr = ['days', 'years'];
                var inArray = false;
                for(var ci = 0; ci < checkArr.length; ci++) {
                    var value = checkArr[ci];
                    if(value == stringPartsUnit) {
						inArray = true;
						break;
                    }
                }
            	if (!isNaN(stringPartsValue) && inArray) {
            		toIsDateLiteral = true;
            		var stringPartsEnd = stringParts[2] + (stringParts[3] ? ' ' + stringParts[3] : '');
            		if (stringPartsEnd == 'AGO') {
            			if (picklistMoment.isSameOrBefore(moment().local().subtract(stringParts[0],stringParts[1].toLowerCase()).endOf(stringParts[1].substring(0,stringParts[1].length-1).toLowerCase()))) {
            				toMatches = true;
            			}
            		}
            		else if (stringPartsEnd == 'FROM NOW') {
						var momentTimeToCompare = moment().local().add(stringParts[0],stringParts[1].toLowerCase()).endOf(stringParts[1].substring(0,stringParts[1].length-1).toLowerCase());
            			if (picklistMoment.isSameOrBefore(moment().local().add(stringParts[0],stringParts[1].toLowerCase()).endOf(stringParts[1].substring(0,stringParts[1].length-1).toLowerCase()))) {
            				toMatches = true;
            			}
            		}
            	}
            }
        }
        catch (err) { }
        
        //handle non date literals (case 00015743, adding if same day to match criteria as well for dates)
        try {
			//case 00022232 momentjs isSame is not reliable, comparing a string now.
			//seems to be related to comp tz vs sf timezone calculations
            //if (!fromIsDateLiteral && (picklistValue == '' || moment.utc(+picklistValue).isAfter(moment(rule.comparevalue,'YYYY-MM-DD')) || moment.utc(+picklistValue).isSame(moment(rule.comparevalue,'YYYY-MM-DD'), 'day') )) {
			var momentStart = moment(rule.comparevalue,'YYYY-MM-DD');
			var momentEnd = moment(rule.enddate,'YYYY-MM-DD');
			var momentPickList = picklistMoment;

			if (!fromIsDateLiteral && (momentPickList.isAfter(momentStart) || (momentPickList.format('YYYY-MM-DD') == momentStart.format('YYYY-MM-DD') ) )) {
       			fromMatches = true;
       		}

       		if (!toIsDateLiteral && (momentPickList.isBefore(momentEnd) || (momentPickList.format('YYYY-MM-DD') == momentEnd.format('YYYY-MM-DD') ) )) {
       			toMatches = true;
       		}
        }
        catch(e){}

		if(toMatches && fromMatches) {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
		
		return returnObj;
	},
	datejs : function (options) {
	    var picklistValue = options.picklistValue;
	    var rule = options.rule;
	    var FiscalYearSettings = options.FiscalYearSettings;
	    
		var returnObj = {foundMatch:false};
		var fromMatches = false;
		var fromIsDateLiteral = false;
		var toMatches = false;
		var toIsDateLiteral = false;
		var timezoneOffset = options.useTimezoneOffset ? new Date().getTimezoneOffset()*60000 : 0;
		//check if date literal
		if(MADateLiteralsObj[rule.comparevalue.replace(/_/g,' ')]) {
			fromIsDateLiteral = true;
			var compareObject = MADateLiteralsObj[rule.comparevalue.replace(/_/g,' ')]({FiscalYearSettings:FiscalYearSettings});
			//update the picklistValue to ignore browser timezone
			var compareTime;
			if(+picklistValue == 0) {
	            compareTime = 0;
			}
			else {
			    compareTime = new Date(+picklistValue);
			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
			    compareTime = compareTime.getTime() + compareTimezoneOffset;
			}
			if(compareObject.start <= compareTime) {
				fromMatches = true;
			}
		}
		if(MADateLiteralsObj[rule.enddate.replace(/_/g,' ')]) {
			toIsDateLiteral = true;
			var compareObject = MADateLiteralsObj[rule.enddate.replace(/_/g,' ')]({FiscalYearSettings:FiscalYearSettings});
			var compareTime;
			if(+picklistValue == 0) {
			    compareTime = 0;
			}
			else {
			    compareTime = new Date(+picklistValue);
			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
			    compareTime = compareTime.getTime() + compareTimezoneOffset;
			}
			if(compareObject.end >= compareTime) {
				toMatches = true;
			}
		}

		
		var hasNumber = /\d/;
		try {
			if(!fromIsDateLiteral && hasNumber.test(rule.comparevalue)) {
				var stringParts = rule.comparevalue.split(' ');
				//check if dynmamic
				if ((stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') && stringParts.length === 3) {
				    fromIsDateLiteral = true;
					var compareString = stringParts[0] + ' N ' + stringParts[2];
					var compareObject = MADateLiteralsObj[compareString]({ value: +stringParts[1], FiscalYearSettings:FiscalYearSettings });
					var timeZoneCheck = sfTimeZoneOffset != '0' ? (+sfTimeZoneOffset*-1) : timezoneOffset;
					var compareTime;
					if(+picklistValue == 0) {
					    compareTime = 0;
					}
					else {
					    compareTime = new Date(+picklistValue);
					    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
					    compareTime = compareTime.getTime() + compareTimezoneOffset;
					}
					if(compareObject.start <= compareTime) {
						fromMatches = true;
					}
				}
				else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
				    fromIsDateLiteral = true;
					//remove number replace with n
					var dynamicPart = stringParts.splice(0,1)[0];
					var compareString = 'N ' + stringParts.join(' ');
					var compareObject = MADateLiteralsObj[compareString]({ value: +dynamicPart, FiscalYearSettings:FiscalYearSettings });
					var compareTime = +picklistValue == 0 ? 0 : +picklistValue+(timezoneOffset);
					if(compareObject.start <= compareTime) {
						fromMatches = true;
					}
				}
				else {

				}
			}
		}
		catch(err){}
		try {
			if(!toIsDateLiteral && hasNumber.test(rule.enddate)) {
				var stringParts = rule.enddate.split(' ');
				//check if dynmamic
				if ((stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') && stringParts.length === 3) {
				    toIsDateLiteral = true;
					var compareString = stringParts[0] + ' N ' + stringParts[2];
					var compareObject = MADateLiteralsObj[compareString]({ value: +stringParts[1], FiscalYearSettings:FiscalYearSettings });
					var timeZoneCheck = sfTimeZoneOffset != '0' ? (+sfTimeZoneOffset*-1) : timezoneOffset;
					var compareTime;
					if(+picklistValue == 0) {
					    compareTime = 0;
					}
					else {
					    compareTime = new Date(+picklistValue);
					    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
					    compareTime = compareTime.getTime() + compareTimezoneOffset;
					}
					
					var compareFix = compareObject.end;
					if(compareString == 'LAST N DAYS') {
					    compareFix = compareObject.start;
					}
					
					if(compareFix >= compareTime) {
						toMatches = true;
					}
				}
				else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
				    toIsDateLiteral = true;
					//remove number replace with n
					var dynamicPart = stringParts.splice(0,1)[0];
					var compareString = 'N ' + stringParts.join(' ');
					var compareObject = MADateLiteralsObj[compareString]({ value: +dynamicPart, FiscalYearSettings:FiscalYearSettings });
					var compareTime;
					if(+picklistValue == 0) {
			            compareTime = 0;
        			}
        			else {
        			    compareTime = new Date(+picklistValue);
        			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
        			    compareTime = compareTime.getTime() + compareTimezoneOffset;
        			}
					if(compareObject.end >= compareTime) {
						toMatches = true;
					}
				}
				else {

				}
			}
		}
		catch(err){}

		//no date literals so compare actual dates
		if (!fromIsDateLiteral) {
			//check if split with '-' or '/'
			if(rule.comparevalue.indexOf('-') >= 0) {
				var dateParts = rule.comparevalue.split('-');
				var compareDate = new Date(dateParts[0],dateParts[1]-1,dateParts[2]);
				var compareTime;
				if(+picklistValue == 0) {
		            compareTime = 0;
    			}
    			else {
    			    compareTime = new Date(+picklistValue);
    			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
    			    compareTime = compareTime.getTime() + compareTimezoneOffset;
    			}
				if(compareTime >= compareDate.getTime() || picklistValue == '') {
					fromMatches = true;
				}
			}
			else if(rule.comparevalue.indexOf('/') >= 0) {
				var dateParts = rule.comparevalue.split('/');
				var compareDate = new Date(dateParts[2],dateParts[0]-1,dateParts[1]);
				var compareTime;
				if(+picklistValue == 0) {
		            compareTime = 0;
    			}
    			else {
    			    compareTime = new Date(+picklistValue);
    			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
    			    compareTime = compareTime.getTime() + compareTimezoneOffset;
    			}
				if(compareTime >= compareDate.getTime() || picklistValue == '') {
					fromMatches = true;
				}
			}
		}
		if (!toIsDateLiteral) {
			//check if split with '-' or '/'
			if(rule.enddate.indexOf('-') >= 0) {
				var dateParts = rule.enddate.split('-');
				var compareDate = new Date(dateParts[0],dateParts[1]-1,dateParts[2]);
				compareDate.setHours(23,59,59,999);
				var compareTime;
				if(+picklistValue == 0) {
		            compareTime = 0;
    			}
    			else {
    			    compareTime = new Date(+picklistValue);
    			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
    			    compareTime = compareTime.getTime() + compareTimezoneOffset;
    			}
				if(compareTime <= compareDate.getTime() || picklistValue == '') {
					toMatches = true;
				}
			}
			else if(rule.enddate.indexOf('/') >= 0) {
				var dateParts = rule.enddate.split('/');
				var compareDate = new Date(dateParts[2],dateParts[0]-1,dateParts[1]);
				var compareTime;
				if(+picklistValue == 0) {
		            compareTime = 0;
    			}
    			else {
    			    compareTime = new Date(+picklistValue);
    			    var compareTimezoneOffset = compareTime.getTimezoneOffset()*60000;
    			    compareTime = compareTime.getTime() + compareTimezoneOffset;
    			}
				compareDate.setHours(23,59,59,999);
				if(compareTime <= compareDate.getTime() || picklistValue == '') {
					toMatches = true;
				}
			}
		}

		if(toMatches && fromMatches) {
			returnObj = {
				markerValue : rule.value,
				legendId : rule.legendId,
				foundMatch : true
			};
		}
        
		return returnObj;
	}
};


function htmlDecode(stringValue) {
	
	if(typeof stringValue == 'string') {
		if(typeof(document) == 'object') {
			var txt = document.createElement("textarea");
			txt.innerHTML = stringValue;
			return txt.value;
		}
		else 
		{
			return String(stringValue)
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, '\'')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');	
		}
	}
	
	return stringValue;
}

var MADateLiteralsObj = {
    //https://help.salesforce.com/apex/HTViewHelpDoc?id=custom_dates.htm
    
    /***
		options = {
			value: Number
			FiscalYearSettings: {
				currentFiscalQuarterStartDate: String,
				currentFiscalQuarterEndDate: String,
				currentFiscalYearStartDate: String,
				currentFiscalYearEndDate: String,
				yearType: String,
			} // MASystem.Organization.FiscalYearSettings
		}
    */

    // DAYS
	'YESTERDAY' : function (options) {
		return {
			start : moment().subtract(1, 'days').startOf('day').valueOf(), // beginning of yesterday
			end : moment().subtract(1, 'days').endOf('day').valueOf() // end of yesterday
		}
	},
	'TODAY' : function (options) {
		return {
			start : moment().startOf('day').valueOf(), // beginning of today
			end : moment().endOf('day').valueOf() // end of today
		}
	},
	'TOMORROW' : function (options) {
		return {
			start : moment().add(1, 'days').startOf('day').valueOf(), // beginning of tomorrow
			end : moment().add(1, 'days').endOf('day').valueOf() // end of tomorrow
		}
	},
	
	// WEEKS
	'LAST WEEK' : function (options) {
	    //Starts 12:00:00 on the first day of the week before the most recent first day of the week and continues for seven full days. Your locale determines the first day of the week.
		var timeNow = new Date();
		var endofweek = new Date();
		var dayOfWeek = timeNow.getDay();
		var daysToSubtract = 7+dayOfWeek;
		endofweek.setDate(timeNow.getDate()-dayOfWeek);
		endofweek.setHours(23,59,59,999);
		//get start
		timeNow.setHours(0,0,0,0);
		timeNow.setDate(timeNow.getDate()-daysToSubtract);
		return {
			start : timeNow.getTime(),
			end : endofweek.getTime()
		}
	},
	'THIS WEEK': function (options) {
	    //Starts 12:00:00 on the most recent first day of the week before the current day and continues for seven full days. Your locale determines the first day of the week.
		var timeNow = new Date();
		var endofweek = new Date();
		var dayOfWeek = timeNow.getDay();
		var daysToAdd = 7-dayOfWeek;
		endofweek.setDate(timeNow.getDate()+daysToAdd);
		endofweek.setHours(23,59,59,999);
		timeNow.setHours(0,0,0,0);
		timeNow.setDate(timeNow.getDate()-dayOfWeek);
		return {
			start : timeNow.getTime(),
			end : endofweek.getTime()
		}
	},
	'NEXT WEEK' : function (options) {
	    //Starts 12:00:00 on the most recent first day of the week after the current day and continues for seven full days. Your locale determines the first day of the week.
		var endofweek = new Date();
		var startofweek = new Date();
		var dayOfWeek = endofweek.getDay();
		var daysToAdd = 7-dayOfWeek;
		startofweek.setDate(endofweek.getDate()+daysToAdd);
		startofweek.setHours(0,0,0,0);
		endofweek.setHours(23,59,59,999);
		endofweek.setDate(endofweek.getDate()+daysToAdd+7);
		return {
			start : startofweek.getTime(),
			end : endofweek.getTime()
		}
	},
	
	// MONTHS
	'LAST MONTH' : function (options) {
		return {
			start : moment().subtract(1, 'months').startOf('month').valueOf(), // beginning of last month
			end : moment().subtract(1, 'months').endOf('month').valueOf() // end of last month
		}
	},
	'THIS MONTH' : function (options) {
		return {
			start : moment().startOf('month').valueOf(), // beginning of this month
			end : moment().endOf('month').valueOf() // end of this month
		}
	},
	'NEXT MONTH' : function (options) {
		return {
			start : moment().add(1, 'months').startOf('month').valueOf(), // beginning of next month
			end : moment().add(1, 'months').endOf('month').valueOf() // end of next month
		}
	},
	'NEXT N MONTHS' : function (options) {
		return {
			start : moment().add(1, 'months').startOf('month').valueOf(), // beginning of next month
			end : moment().add(options.value, 'months').endOf('month').valueOf() // end of last N months
		}
	},
	'LAST N MONTHS' : function (options) {
		return {
			start : moment().subtract(options.value, 'months').startOf('month').valueOf(), // beginning of last N months
			end : moment().subtract(1, 'months').endOf('month').valueOf() // end of last month
		}
	},
	
	// DAYS
	'LAST N DAYS' : function (options) {
		return {
			start : moment().subtract(options.value, 'days').startOf('day').valueOf(), // beginning of last n days
			end : moment().subtract(1, 'days').endOf('day').valueOf() // end of yesterday
		}
	},
	'NEXT N DAYS' : function (options) {
		return {
			start : moment().add(1, 'days').startOf('day').valueOf(), // beginning of tomorrow
			end : moment().add(options.value, 'days').endOf('day').valueOf() // end of next N days
		}
	},
	'N DAYS AGO' : function (options) {
	    // Starts at 12:00:00 AM on the day n days before the current day and continues for 24 hours. (The range does not include today.)
		return {
			start : moment().subtract(options.value, 'days').startOf('day').valueOf(), // beginning of last n days
			end : moment().subtract(1, 'days').endOf('day').valueOf() // end of yesterday
		}
	},
	'N DAYS FROM NOW' : function (options) {
	    // Starts at 12:00:00 AM on the day n days after the current day and continues for 24 hours. (The range does not include today.)
		return {
			start : moment().add(1, 'days').startOf('day').valueOf(), // beginning of tomorrow
			end : moment().add(options.value, 'days').endOf('day').valueOf() // end of tomorrow
		}
	},
	'LAST 90 DAYS': function (options) {
		return {
			start : moment().subtract(90, 'days').startOf('day').valueOf(), // beginning of last 90 days
			end : moment().subtract(1, 'days').endOf('day').valueOf() // end of yesterday
		}
	},
	'NEXT 90 DAYS' : function (options) {
		return {
			start : moment().add(1, 'days').startOf('day').valueOf(), // beginning of tomorrow
			end : moment().add(90, 'days').endOf('day').valueOf() // end of next 90 days
		}
	},
	
	// YEARS
	'THIS YEAR': function (options) {
	    //Starts at 12:00:00 AM on January 1 of the current year and continues through the end of December 31 of the current year.
		var firstDay = new Date(new Date().getFullYear(), 0, 1);
		var lastDay = new Date(new Date().getFullYear(), 12, 0);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'LAST YEAR' : function (options) {
	    //Starts 12:00:00 on January 1 of the previous year and continues through the end of December 31 of that year.
		var firstDay = new Date(new Date().getFullYear()-1, 0, 1);
		var lastDay = new Date(new Date().getFullYear()-1, 12, 0);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'NEXT YEAR' : function (options) {
	    //Starts at 12:00:00 AM on January 1 of the year after the current year and continues through the end of December 31 of that year.
		var firstDay = new Date(new Date().getFullYear()+1, 0, 1);
		var lastDay = new Date(new Date().getFullYear()+1, 12, 0);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'LAST N YEARS' : function (options) {
	    //Starts at 12:00:00 am on January 1, n+1 years ago. The range ends on December 31 of the year before the current year.
		var firstDay = new Date(new Date().getFullYear()-options.value, 0, 1);
		var lastDay = new Date(new Date().getFullYear()-1, 11, 31);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'NEXT N YEARS' : function (options) {
	    //Starts at 12:00:00 AM on January 1 of the year after the current year and continues through the end of December 31 of the nth year.
		var firstDay = new Date(new Date().getFullYear()+1, 0, 1);
		var lastDay = new Date(new Date().getFullYear()+options.value, 11, 31);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'N YEARS AGO' : function (options) {
	    //Starts at 12:00:00 AM on January 1 of the calendar year n years before the current calendar year and continues through the end of December 31 of that year.
		var firstDay = new Date(new Date().getFullYear()-options.value, 0, 1);
		var lastDay = new Date(new Date().getFullYear()-options.value, 11, 31);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	'N YEARS FROM NOW' : function (options) {
	    //Starts at 12:00:00 AM on January 1 of the calendar year n years after the current calendar year and continues through the end of December 31 of that year.
		var firstDay = new Date(new Date().getFullYear()+options.value, 0, 1);
		var lastDay = new Date(new Date().getFullYear()+options.value, 11, 31);
		lastDay.setHours(23,59,59,999);
		return {
			start : firstDay.getTime(),
			end : lastDay.getTime()
		}
	},
	
	// QUARTERS
	'THIS QUARTER': function(options) {
		return {
			start: moment().startOf('quarter').valueOf(), // beginning of current quarter
			end: moment().endOf('quarter').valueOf() // end of current quarter
		}
	},
	'LAST QUARTER': function(options) {
		return {
			start: moment().subtract(1, 'quarters').startOf('quarter').valueOf(), // beginnign of last quarter
			end: moment().subtract(1, 'quarters').endOf('quarter').valueOf() // end of last quarter
		}
	},
	'NEXT QUARTER': function(options) {
		return {
			start: moment().add(1, 'quarters').startOf('quarter').valueOf(), // beginning of next quarter
			end: moment().add(1, 'quarters').endOf('quarter').valueOf() // end of next quarter
		}
	},
	'NEXT N QUARTERS': function(options) {
		return {
			start: moment().add(1, 'quarters').startOf('quarter').valueOf(), // beginning of next  quarter
			end: moment().add(options.value, 'quarters').endOf('quarter').valueOf() // end of next N quarters
		}
	},
	'LAST N QUARTERS': function(options) {
		return {
			start: moment().subtract(options.value, 'quarters').startOf('quarter').valueOf(), // beginning of last N quarters
			end: moment().subtract(1, 'quarters').endOf('quarter').valueOf() // enf of last quarter
		}
	},
	
	// FISCAL QUARTERS
	'THIS FISCAL QUARTER': function(options) {
		var currentFiscalQuarterStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate');
		var currentFiscalQuarterEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');

		return {
			start: moment(currentFiscalQuarterStartDate, dateFormat).startOf('day').valueOf(),
			end: moment(currentFiscalQuarterEndDate, dateFormat).endOf('day').valueOf()
		}
	},
	'LAST FISCAL QUARTER': function(options) {
		var currentFiscalQuarterStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate');
		var currentFiscalQuarterEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');
		
		return {
			start: moment(currentFiscalQuarterStartDate, dateFormat).subtract(1, 'quarter').startOf('day').valueOf(),
			end: moment(currentFiscalQuarterStartDate, dateFormat).subtract(1, 'days').endOf('day').valueOf()
		}
	},
	'NEXT FISCAL QUARTER': function(options) {
		var currentFiscalQuarterStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate');
		var currentFiscalQuarterEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');
		
		return {
			start: moment(currentFiscalQuarterEndDate, dateFormat).add(1, 'days').startOf('day').valueOf(),
			end: moment(currentFiscalQuarterEndDate, dateFormat).add(1, 'quarter').endOf('day').valueOf()
		}
	},
	'NEXT N FISCAL QUARTERS': function(options) {
		var currentFiscalQuarterStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate');
		var currentFiscalQuarterEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');
		
		return {
			start: moment(currentFiscalQuarterStartDate, dateFormat).add(options.value, 'quarter').startOf('day').valueOf(),
			end: moment(currentFiscalQuarterEndDate, dateFormat).add(options.value, 'quarter').endOf('day').valueOf()
		}
	},
	'LAST N FISCAL QUARTERS': function(options) {
		var currentFiscalQuarterStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate');
		var currentFiscalQuarterEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');
		
		return {
			start: moment(currentFiscalQuarterStartDate, dateFormat).subtract(options.value, 'quarter').startOf('day').valueOf(),
			end: moment(currentFiscalQuarterEndDate, dateFormat).subtract(options.value, 'quarter').endOf('day').valueOf()
		}
	},
	
	// FISCAL YEARS
	'THIS FISCAL YEAR': function(options) {
		var currentFiscalYearStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate');
		var currentFiscalYearEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');

		return {
			start: moment(currentFiscalYearStartDate, dateFormat).startOf('day').valueOf(),
			end: moment(currentFiscalYearEndDate, dateFormat).endOf('day').valueOf()
		}
	},
	'LAST FISCAL YEAR': function(options) {
		var currentFiscalYearStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate');
		var currentFiscalYearEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');

		return {
			start: moment(currentFiscalYearStartDate, dateFormat).subtract(1, 'year').valueOf(),
			end: moment(currentFiscalYearStartDate, dateFormat).subtract(1, 'days').valueOf()
		}
	},
	'NEXT FISCAL YEAR': function(options) {
		var currentFiscalYearStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate');
		var currentFiscalYearEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');

		return {
			start: moment(currentFiscalYearEndDate, dateFormat).add(1, 'days').valueOf(),
			end: moment(currentFiscalYearEndDate, dateFormat).add(1, 'year').valueOf(),
		}
	},
	'NEXT N FISCAL YEARS': function(options) {
		var currentFiscalYearStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate');
		var currentFiscalYearEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');

		return {
			start: moment(currentFiscalYearStartDate, dateFormat).add(options.value, 'year').valueOf(),
			end: moment(currentFiscalYearEndDate, dateFormat).add(options.value, 'year').valueOf(),
		}
	},
	'LAST N FISCAL YEARS': function(options) {
		var currentFiscalYearStartDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate');
		var currentFiscalYearEndDate = MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearEndDate');
		var dateFormat = MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat');
		
		return {
			start: moment(currentFiscalYearStartDate, dateFormat).subtract(options.value, 'year').valueOf(),
			end: moment(currentFiscalYearEndDate, dateFormat).subtract(options.value, 'year').valueOf()
		}
	},

	// MONTHS
	'LAST MONTH': function(options) {
		return {
			start: moment().subtract(1, 'months').startOf('month').valueOf(), // beginning of last month
			end: moment().subtract(1, 'months').endOf('month').valueOf() // end of last month
		}
	},
	'THIS MONTH': function(options) {
		return {
			start: moment().startOf('month').valueOf(), // beginning of this month
			end: moment().endOf('month').valueOf() // end of this month
		}
	},
	'NEXT MONTH': function(options) {
		return {
			start: moment().add(1, 'months').startOf('month').valueOf(), // beginning of next month
			end: moment().add(1, 'months').endOf('month').valueOf() // end of next month
		}
	},
	'NEXT N MONTHS': function(options) {
		return {
			start: moment().add(1, 'months').startOf('month').valueOf(), // beginning of next month
			end: moment().add(options.value, 'months').endOf('month').valueOf() // end of next N months
		}
	},
	'LAST N MONTHS': function(options) {
		return {
			start: moment().subtract(options.value, 'months').startOf('month').valueOf(), // start of last N months
			end: moment().subtract(1, 'months').endOf('month').valueOf() // end of last month
		}
	}
};

function workerFormatTooltip(obj, toolTipObj, noLinks, polymorphicObject)
{
    /*if (toolTipObj.DisplayType == 'REFERENCE')
    {
        var rId = getProperty(obj, toolTipObj.RefFieldName);
        var rName = getProperty(obj, toolTipObj.ActualFieldName);
        
        if (rId == undefined || rName == undefined)
        {
            return '';
        }
        else
        {
            return '<a onclick="event.stopPropagation();" target="_blank" href="/' + rId + '">' + rName + '</a>';
        }
        
    }*/
    if(toolTipObj.needsLink) {
        //leaving the above reference for now
        var rId = workerGetProperty(obj, toolTipObj.linkId, false);
        var rName = getPolyField(obj, polymorphicObject, toolTipObj.ActualFieldName, true, polymorphicObject, undefined);
		// changed conditional to be more concerned with no rName value since that is all we are returning. 
        if ((rId === undefined && rName === undefined) || rName === undefined)
        {
            return '';
        }
        else {
			// for compare, we will never need the link
            return rName;
        }
    }
    else
    {
		var fieldValue = getPolyField(obj, polymorphicObject, toolTipObj.ActualFieldName, true, polymorphicObject, undefined);

        if (fieldValue == undefined)
        {
            if (toolTipObj.describe.soapType.toLowerCase().indexOf('boolean') > -1)
            {
                return 'False';
            }
            else
            {
                return '';
            }
        }
        else
        {
            if (toolTipObj.describe.soapType.toLowerCase().indexOf('string') > -1)
            {
                return fieldValue;
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('boolean') > -1)
            {
                return fieldValue;
            }
            else if(toolTipObj.describe.type && toolTipObj.describe.type.toLowerCase().indexOf('percent') > -1){
                //grab the lat lng from object and parse
                var fieldParts = String(fieldValue).split('.');
                var c;
                if(toolTipObj.describe.scale) {
                    c = toolTipObj.describe.scale;
                }
                else if(fieldParts.length>1) {
                    c = fieldParts[1].length
                }
                var n = fieldValue, 
                    c = isNaN(c = Math.abs(c)) ? null : c, 
                    d = d == undefined ? "." : d, 
                    t = t == undefined ? "," : t, 
                    s = n < 0 ? "-" : "", 
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
                    j = (j = i.length) > 3 ? j % 3 : 0;
                return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "") + '%';
                
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('double') > -1)
            {
                //make sure c is not longer than the actual length of the decimal
                var fieldParts = String(fieldValue).split('.');
                var c;
                if(toolTipObj.describe.scale) {
                    c = toolTipObj.describe.scale;
                }
                else if(fieldParts.length>1) {
                    c = fieldParts[1].length
                }
                
                var n = fieldValue, 
                    c = isNaN(c = Math.abs(c)) ? 0 : c, 
                    d = d == undefined ? "." : d, 
                    t = t == undefined ? "," : t, 
                    s = n < 0 ? "-" : "", 
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
                    j = (j = i.length) > 3 ? j % 3 : 0;
                return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
                
            }
            else if (toolTipObj.describe.soapType.toLowerCase().indexOf('integer') > -1 || toolTipObj.describe.soapType.toLowerCase().indexOf('int') > -1)
            {
                var fieldParts = String(fieldValue).split('.');
                var c;
                if(toolTipObj.describe.scale) {
                    c = toolTipObj.describe.scale;
                }
                else if(fieldParts.length>1) {
                    c = fieldParts[1].length
                }
                var n = fieldValue, 
                    c = isNaN(c = Math.abs(c)) ? null : c, 
                    d = d == undefined ? "." : d, 
                    t = t == undefined ? "," : t, 
                    s = n < 0 ? "-" : "", 
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
                    j = (j = i.length) > 3 ? j % 3 : 0;
                return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
            }
            else if(toolTipObj.describe.soapType.toLowerCase().indexOf('location') > -1){
                //grab the lat lng from object and parse
                var latString = '';
                var lngString = '';
                if(typeof fieldValue === 'object') {
                    latString = fieldValue.latitude || '';
                    lngString = fieldValue.longitude || '';
                }
                return 'Latitude: ' + latString + '<br>Longitude: ' + lngString; 
                
            }
            else 
            {
                return fieldValue;
            }
            
        }
    }
    
    
}

var MADateLiterals = [
	// DAYS
	{ value:"YESTERDAY", label:"YESTERDAY", getMoment: function () { return moment().add(-1,'days'); }, momentUnit: 'day' },	
	{ value:"TODAY", label:"TODAY", getMoment: function () { return moment(); }, momentUnit: 'day' },
    { value:"TOMORROW", label:"TOMORROW", getMoment: function () { return moment().add(1,'days'); }, momentUnit: 'day' },
    { value:"DYNAMIC", label:"LAST N DAYS", getMoment: function (n) { return moment().add(n*-1,'days'); }, momentUnit: 'day' },
    { value:"DYNAMIC", label:"NEXT N DAYS", getMoment: function (n) { return moment().add(n,'days'); }, momentUnit: 'day' },
    { value:"DYNAMIC", label:"N DAYS AGO", getMoment: function (n) { return moment().add(n*-1,'days'); }, momentUnit: 'day' },
    { value:"DYNAMIC", label:"N DAYS FROM NOW", getMoment: function (n) { return moment().add(n,'days'); }, momentUnit: 'day' },
    
    // YEARS
    { value:"THIS_YEAR", label:"THIS YEAR", getMoment: function () { return moment(); }, momentUnit: 'year' },
    { value:"LAST_YEAR", label:"LAST YEAR", getMoment: function () { return moment().add(-1,'years'); }, momentUnit: 'year' },
    { value:"NEXT_YEAR", label:"NEXT YEAR", getMoment: function () { return moment().add(1,'years'); }, momentUnit: 'year' },
    { value:"DYNAMIC", label:"LAST N YEARS", getMoment: function (n) { return moment().add(n*-1,'years'); }, momentUnit: 'year' },
    { value:"DYNAMIC", label:"NEXT N YEARS", getMoment: function (n) { return moment().add(n,'years'); }, momentUnit: 'year' },
    { value:"DYNAMIC", label:"N YEARS AGO", getMoment: function (n) { return moment().add(n*-1,'years'); }, momentUnit: 'year' },
    { value:"DYNAMIC", label:"N YEARS FROM NOW", getMoment: function (n) { return moment().add(n,'years'); }, momentUnit: 'year' },
    
    // FISCAL YEARS
    { value:"THIS_FISCAL_YEAR", label:"THIS FISCAL YEAR", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).startOf('year'); }, momentUnit: 'year' },
    { value:"LAST_FISCAL_YEAR", label:"LAST FISCAL YEAR", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).subtract(1, 'years').startOf('day'); }, momentUnit: 'year' },
    { value:"NEXT_FISCAL_YEAR", label:"NEXT FISCAL YEAR", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).add(1, 'years').startOf('day'); }, momentUnit: 'year'  },
    { value:"DYNAMIC", label:"LAST N FISCAL YEARS", getMoment: function (numOfFiscalYears, options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).subtract(numOfFiscalYears, 'years').startOf('year'); }, momentUnit: 'year'  },
    { value:"DYNAMIC", label:"NEXT N FISCAL YEARS", getMoment: function (numOfFiscalYears, options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalYearStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).add(numOfFiscalYears, 'years').startOf('year'); }, momentUnit: 'year'  },
	
	// QUARTERS
    { value:"THIS_QUARTER", label:"THIS QUARTER", getMoment: function (options) { return moment().startOf('quarter'); }, momentUnit: 'quarter' },
    { value:"LAST_QUARTER", label:"LAST QUARTER", getMoment: function (options) { return moment().subtract(1, 'quarter').startOf('day'); }, momentUnit: 'quarter' },
    { value:"NEXT_QUARTER", label:"NEXT QUARTER", getMoment: function (options) { return moment().add(1, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    { value:"DYNAMIC", label:"LAST N QUARTERS", getMoment: function (numOfQuarters, options) { return moment().subtract(numOfQuarters, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    { value:"DYNAMIC", label:"NEXT N QUARTERS", getMoment: function (numOfQuarters, options) { return moment().add(numOfQuarters, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    
    // FISCAL QUARTERS
    { value:"THIS_FISCAL_QUARTER", label:"THIS FISCAL QUARTER", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).startOf('day'); }, momentUnit: 'quarter' },
    { value:"LAST_FISCAL_QUARTER", label:"LAST FISCAL QUARTER", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).subtract(1, 'quarter').startOf('day'); }, momentUnit: 'quarter' },
    { value:"NEXT_FISCAL_QUARTER", label:"NEXT FISCAL QUARTER", getMoment: function (options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).add(1, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    { value:"DYNAMIC", label:"LAST N FISCAL QUARTERS", getMoment: function (numOfFiscalQuarters, options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).subtract(numOfFiscalQuarters, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    { value:"DYNAMIC", label:"NEXT N FISCAL QUARTERS", getMoment: function (numOfFiscalQuarters, options) { return moment(MAWorkerGetProperty(options, 'FiscalYearSettings.currentFiscalQuarterStartDate'), MAWorkerGetProperty(options, 'FiscalYearSettings.dateFormat')).add(numOfFiscalQuarters, 'quarter').startOf('day'); }, momentUnit: 'quarter'  },
    
    // MONTHS
    { value:"LAST_MONTH", label:"LAST MONTH", getMoment: function () { return moment().add(-1,'months'); }, momentUnit: 'month' },
    { value:"THIS_MONTH", label:"THIS MONTH", getMoment: function () { return moment(); }, momentUnit: 'month' },
    { value:"NEXT_MONTH", label:"NEXT MONTH", getMoment: function () { return moment().add(1,'months'); }, momentUnit: 'month' },
    { value:"DYNAMIC", label:"LAST N MONTHS", getMoment: function (numOfMonths) { return moment().subtract(numOfMonths,'months'); }, momentUnit: 'month' },
    { value:"DYNAMIC", label:"NEXT N MONTHS", getMoment: function (numOfMonths) { return moment().add(numOfMonths,'months'); }, momentUnit: 'month' },

    // WEEKS
    { value:"LAST_WEEK", label:"LAST WEEK", getMoment: function () { return moment().add(-1,'weeks'); }, momentUnit: 'week' },
    { value:"THIS_WEEK", label:"THIS WEEK", getMoment: function () { return moment(); }, momentUnit: 'week' },
    { value:"NEXT_WEEK", label:"NEXT WEEK", getMoment: function () { return moment().add(1,'weeks'); }, momentUnit: 'week' },
    { value:"LAST_N_WEEKS", label:"LAST N WEEKS", getMoment: function (numOfWeeks) { return moment().subtract(numOfWeeks,'weeks'); }, momentUnit: 'week' },
    { value:"NEXT_N_WEEKS", label:"NEXT N WEEKS", getMoment: function (numOfWeeks) { return moment().add(numOfWeeks,'weeks'); }, momentUnit: 'week' },
];

var workerCachedMarkers = {};

function workerRandomHexColorCode()
{
    var hexList = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
    var hexCode = '#';
    for (var i = 0; i < 6; i++)
    {
        hexCode += hexList[Math.floor(Math.random() * 16)];
    }
    return hexCode;
}

function workerGetFormattedAddress (record,addressFields) {
    var addressInfo = {};
    for(var key in addressFields) {
        var fieldName = addressFields[key];
        var propertyValue = workerGetProperty(record,fieldName) || '';
        addressInfo[key] = propertyValue;
        
    }
    var street  = addressInfo.street      ?   addressInfo.street+', '       : '';
	var city    = addressInfo.city        ?   addressInfo.city+', '         : '';
	var state   = addressInfo.state       ?   addressInfo.state+' '         : '';
	var zipCode = addressInfo.zip         ?   addressInfo.zip+' '           : '';
	var country = addressInfo.country     ?   addressInfo.country           : '';
	
	var formattedAddress = (street || '') + (city || '') + (state || '') + (zipCode || '') + (country || '');
    
    return formattedAddress;
}

MASortFunction = {
    MergeSortAsc: function(array) {
		var len = array.length;

		if(len < 2) 
		{ 
			return array;
		}
		else
		{
			var pivot = Math.ceil(len/2);
			return MASortFunction.MergeAsc(MASortFunction.MergeSortAsc(array.slice(0,pivot)), MASortFunction.MergeSortAsc(array.slice(pivot)));
		}
	},

	// Does a merge sort in descending fashion
	MergeSortDesc: function(array) {
		var len = array.length;

		if(len < 2) 
		{ 
			return array;
		}
		else
		{
			var pivot = Math.ceil(len/2);
			return MASortFunction.MergeDesc(MASortFunction.MergeSortDesc(array.slice(0,pivot)), MASortFunction.MergeSortDesc(array.slice(pivot)));
		}
	},

	// Merges two objects in ascending fashion
	MergeAsc: function(left, right) {
		var result = [];

		while((left.length > 0) && (right.length > 0))
		{
			if(left[0].sortBy < right[0].sortBy && left[0].sortBy !== '' && left[0].sortBy !== null && left[0].sortBy !== undefined) {
				result.push(left.shift());
			}
			else if(right[0].sortBy === '' || right[0].sortBy === null || right[0].sortBy === undefined) {
				result.push(left.shift());
			}
			else {
				result.push(right.shift());
			}
		}

		result = result.concat(left, right);
		return result;
	},

	// Merges two objects in descending fashion
	MergeDesc: function(left, right) {
		var result = [];

		while((left.length > 0) && (right.length > 0))
		{
			if(left[0].sortBy > right[0].sortBy && left[0].sortBy !== '' && left[0].sortBy !== null && left[0].sortBy !== undefined) {
				result.push(left.shift());
			}
			else if(right[0].sortBy === '' || right[0].sortBy === null || right[0].sortBy === undefined) {
				result.push(left.shift());
			}
			else {
				result.push(right.shift());
			}
		}

		result = result.concat(left, right);
		return result;
	},
	
	keySort : function (array,options) {
	    //options layout
	    /*******
	     *  {
	     *    keyName : direction ('asc' || 'desc'),
	     *    key2Name : direction ('asc' || 'desc')
	     *  }
	    *********/
	    var results = array || [];
	    options = options || {};
	    results.keySort(options);
	    
	    return result;
	}
}


Array.prototype.keySort = function(keys) {

	keys = keys || {};
  
	var obLen = function(obj) {
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key))
				size++;
		}
		return size;
	};

	var obIx = function(obj, ix) {
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (size == ix)
					return key;
				size++;
			}
		}
		return false;
	};

	var keySort = function(a, b, d) {
		d = d !== null ? d : 1;
		// a = a.toLowerCase(); // this breaks numbers
		// b = b.toLowerCase();
		if (a == b)
			return 0;
		return a > b ? 1 * d : -1 * d;
	};

	var KL = obLen(keys);

	if (!KL) return this.sort(keySort);

	for ( var k in keys) {
		// asc unless desc or skip
		keys[k] = 
				keys[k] == 'desc' || keys[k] == -1  ? -1 
              : (keys[k] == 'skip' || keys[k] === 0 ? 0 
              : 1);
	}

	this.sort(function(a, b) {
		var sorted = 0, ix = 0;

		while (sorted === 0 && ix < KL) {
			var k = obIx(keys, ix);
			if (k) {
				var dir = keys[k];
				sorted = keySort(a[k], b[k], dir);
				ix++;
			}
		}
		return sorted;
	});
	return this;
};

function processAutoAssignRecords(data,callback) {
	/*
		data = {
			records : [{},{}...],
			deviceIdFieldName:string,
	        layerType: string,
	        deviceMap : {}
		}
	*/
	var recordArr = data.records;
	var recordsToGeocode = [];
	var geocodedRecords = [];
	var deviceMap = data.deviceMap || {};
	if(typeof recordArr == 'string') {
	    try {
	        recordArr = JSON.parse(recordArr);
	    }
	    catch(e) {
	        recordArr = [];
	    }
	}
	var addressFields = data.addressFields;
	if(typeof addressFields == 'string') {
	    try {
	        addressFields = JSON.parse(addressFields);
	    }
	    catch(e) {
	        addressFields = {};
	    }
	}
	//get the lat lng field
	var latField = addressFields.latitude || '';
	var lngField = addressFields.longitude || '';
	var verifiedLat = addressFields.verifiedLatitude || '';
	var verifiedLng = addressFields.verifiedLongitude || '';
	
	var recLength = recordArr.length;
	var deviceIdFieldName = data.deviceIdFieldName;
	var deviceVendorFieldName = data.deviceVendorFieldName;
	
	var layerType = data.layerType || '';
	
	var isLiveLayer = /live/i.test(layerType); // /*.toLowerCase() == 'live'*/ ? true : false; // layerType.toLowerCase() == 'live' ? true : false;
	
	for(var i = 0; i < recLength; i++) { // loop over returned records
    	var record = recordArr[i];
    	//check if we have a lat and lng
    	var verifiedLatitude = workerGetProperty(record,verifiedLat);
		var verifiedLongitude = workerGetProperty(record,verifiedLng);
		var latitudeField = workerGetProperty(record,latField);
		var longitudeField = workerGetProperty(record,lngField);
		
		if(verifiedLatitude == undefined || verifiedLongitude == undefined) {
			
			//check if we need to geocode
			if((latitudeField == undefined || longitudeField == undefined) && isLiveLayer == false) {
				recordsToGeocode.push(record);
			}
			else {
				geocodedRecords.push(record);
			}
			
		} else {
			geocodedRecords.push(record);
			
		}
		// populate device map if this is a live layer and if we have a way to locate the device ID of the record
		if(deviceIdFieldName && (layerType || '').toLowerCase() == 'live')
        {
            var deviceId = workerGetProperty(record, deviceIdFieldName, false);
			var deviceVendor = workerGetProperty(record, deviceVendorFieldName, false);
            var realDeviceId = null;
            
            if(deviceId)
            {
                realDeviceId =  deviceVendor ? (deviceVendor.trim().replace(/(\s|\n)/ig, '').toLowerCase() + '-' + deviceId.trim()) : deviceId.trim();
            }
            
            var recId = workerGetProperty(record, 'Id', false);

            if(realDeviceId)
            {
                if(!deviceMap[realDeviceId])
                {
                    deviceMap[realDeviceId] = {
                        records: [],
                        liveInfo: {},
                    };
                }
                if(recId)
                {
                    deviceMap[realDeviceId].records.push(recId);
                }
            }
        }
        
    }
	callback({success:true,recordsToGeocode:recordsToGeocode,records:geocodedRecords,deviceMap:deviceMap});
}


// returns true if num is an integer or float. Makes up for JavaScript's parseFloat, Number and isNaN shortcomings. trims the input.
function isNum(num) {
    if( String(num).trim().match(/^[+-]?\d+(.\d+)?$/) ) {
        return true;
    } else {
        return false;
    }
}

function processGeocodeRecordsArrayBatch(data, callback)
{
	var sfRecords = data.sfRecords || {};
	var geocodedRecords = data.geocodedRecords || {};
	if (typeof sfRecords == 'string')
	{
		try
		{
			sfRecords = JSON.parse(sfRecords);
		}
		catch (e)
		{
			sfRecords = {};
		}
	}
	if (typeof geocodedRecords == 'string')
	{
		try
		{
			geocodedRecords = JSON.parse(geocodedRecords);
		}
		catch (e)
		{
			geocodedRecords = {};
		}
	}
	var numFail = data.numFail || 0;
	var numSuccess = data.numSuccess || 0;
	var badAddressArray = [];
	var itemsToUpdate = [];
	var recordBatch = [];


	//update the record
	var latField = data.latField;
	var lngField = data.lngField;

	//loop over our sf records and update lat lng
	var sfKeys = Object.keys(sfRecords);
	for (var r = 0; r < sfKeys.length; r++)
	{
		var uid = sfKeys[r];
		var recordToGeo = sfRecords[uid];
		var result = geocodedRecords[uid];
		var data = result.data || {};
		var IsBadAddress = false;
		if (recordToGeo && result)
		{
			if (result.success != true)
			{
				IsBadAddress = true;
				result = { IsBadAddress: true };
			}

			recordToGeo.location = {
				coordinates: {}
			};
			var lat = workerGetProperty(data, 'position.lat');
			var lng = workerGetProperty(data, 'position.lng');

			/**********************************
			 * Fix for marker plotting in
			 * middle of US
			 * lat = 39.75999858400047
			 * lng = -98.49999638099968
			 **********************************/
			// if(lat != undefined && lng !=undefined) {
			if (isNum(lat) && isNum(lng))
			{
				// if(lat.indexOf('39.759998') === 0 && lng.indexOf('-98.499996')) {
				if (String(lat).indexOf('39.759998') === 0 && String(lng).indexOf('-98.499996') === 0)
				{
					result.IsBadAddress = true;
					lat = '';
					lng = '';
				}
			}

			if (latField.indexOf('.') != -1)
			{
				updateValue(recordToGeo, latField, lat);
			}
			else
			{
				recordToGeo[latField] = lat;
			}
			if (lngField.indexOf('.') != -1)
			{
				updateValue(recordToGeo, lngField, lng);
			}
			else
			{
				recordToGeo[lngField] = lng;
			}
			recordToGeo.location = {
				coordinates: {}
			};

			recordToGeo.location.coordinates.lat = lat;
			recordToGeo.location.coordinates.lng = lng;
			//recordToGeo.location.coordinates.lat = lat;
			//recordToGeo.location.coordinates.lng = lng;
			var formattedAddress = recordToGeo.FormattedAddress_MA || '';
			if (result.IsBadAddress)
			{
				recordToGeo.IsBadAddress = true;
				IsBadAddress = true;
				badAddressArray.push(recordToGeo);
				numFail++;
			}
			else
			{
				recordBatch.push(recordToGeo);
				numSuccess++;
			}


			//rebuilding old as not to rewrite a lot of apex
			var responseData = {
				City: data.city,
				Country: data.country,
				County: '',
				District: '',
				FormattedAddress: formattedAddress,
				HouseNumber: data.houseNumber,
				IsBadAddress: IsBadAddress,
				Label: data.matchLevel,
				Latitude: lat,
				Longitude: lng,
				PostalCode: data.postal,
				State: data.state,
				Street: data.street,
				Relevance: data.score
			};

			var item = { Operation: 'Geocode', Priority: 1, RequestData: { recordId: recordToGeo.Id, address: formattedAddress }, ResponseData: responseData };
			itemsToUpdate.push(item);
		}
		else
		{
			IsBadAddress = true
		}
	}

	callback({ success: true, itemsToUpdate: itemsToUpdate, badAddressArray: badAddressArray, recordBatch: recordBatch, numSuccess: numSuccess, numFail: numFail });
}

function processGeocodeRecordsArray (data,callback) {
	var recordArr = data.records || [];
	if(typeof recordArr == 'string') {
	    try {
	        recordArr = JSON.parse(recordObj);
	    }
	    catch(e) {
	        recordArr = [];
	    }
	}
	var numFail = data.numFail || 0;
	var numSuccess = data.numSuccess || 0;
	var badAddressArray = [];
	var itemsToUpdate = [];
	var recordBatch = [];
	
	
	//update the record
	var latField = data.latField;
	var lngField = data.lngField;
	
	for(var r = 0;r < recordArr.length; r++) {
		var IsBadAddress = false;
		var recordObj = recordArr[r];
		var recordToGeo = recordObj.record;
		var result = recordObj.result;
		var data = result.data || {};
		if(result.success != true || !result.data) {
		    IsBadAddress = true;
		    result = { IsBadAddress: true }; 
		}
		
		recordToGeo.location = {
		    coordinates : {}
		};
		var lat = workerGetProperty(data,'position.lat');
		var lng = workerGetProperty(data,'position.lng');
		
		/**********************************
		 * Fix for marker plotting in
		 * middle of US
		 * lat = 39.75999858400047
		 * lng = -98.49999638099968
		**********************************/
		// if(lat != undefined && lng !=undefined) {
		if( isNum(lat) && isNum(lng) ) {
			// if(lat.indexOf('39.759998') === 0 && lng.indexOf('-98.499996')) {
			if( String(lat).indexOf('39.759998') === 0 && String(lng).indexOf('-98.499996') === 0 ) {
				result.IsBadAddress = true;
				lat = '';
				lng = '';
			}
		}
		
		if(latField.indexOf('.') != -1) {
			updateValue(recordToGeo,latField,lat);
		}
		else {
			recordToGeo[latField] = lat;	
		}
		if(lngField.indexOf('.') != -1) {
			updateValue(recordToGeo,lngField,lng);
		}
		else {
			recordToGeo[lngField] = lng;	
		}
		recordToGeo.location = {
		    coordinates : {}
		};
		recordToGeo.location.coordinates.lat = lat;
		recordToGeo.location.coordinates.lng = lng;
		//recordToGeo.location.coordinates.lat = lat;
		//recordToGeo.location.coordinates.lng = lng;
		var formattedAddress = recordToGeo.FormattedAddress_MA || '';
		if(result.IsBadAddress) {
		    recordToGeo.IsBadAddress = true;
		    IsBadAddress = true;
		    badAddressArray.push(recordToGeo);
		    numFail++;
		}
		else {
		    recordBatch.push(recordToGeo);
		    numSuccess++;
		}
		
		
		//rebuilding old as not to rewrite a lot of apex
		var responseData = {
		    City : data.city,
		    Country : data.country,
		    County : '',
		    District : '',
		    FormattedAddress : formattedAddress,
		    HouseNumber : data.houseNumber,
		    IsBadAddress : IsBadAddress,
		    Label : data.matchLevel,
		    Latitude : lat,
		    Longitude : lng,
		    PostalCode : data.postal,
		    State : data.state,
		    Street : data.street,
		    Relavance : data.score
		};
		
		var item = { Operation: 'Geocode', Priority: 1, RequestData: { recordId: recordToGeo.Id, address: formattedAddress }, ResponseData: responseData };
		itemsToUpdate.push(item);
	}
	
	callback({success:true,itemsToUpdate:itemsToUpdate,badAddressArray:badAddressArray,recordBatch:recordBatch,numSuccess:numSuccess,numFail:numFail});
}


function updateValue(obj, field, value)
{
    try {
        // if ( MA.Namespace == 'maps')
        // {
            obj = MA.Util.removeNamespace(obj,'maps__');
            
            //remove from string prop as well
            field = field.replace(/maps__/g,'');
        //}
        
        var fieldParts = field.split('.');
        var currentObj = obj;
        for (var i = 0; i < fieldParts.length - 1; i++) {
            currentObj = currentObj[fieldParts[i]] = currentObj[fieldParts[i]] || {};
        }
        currentObj[fieldParts[fieldParts.length - 1]] =  value;
        return true;
    }
    catch (err) { }
    
    return false;
}

// Boolean and zero values were causing this function to always return the default value... which is an empty string.
function getPolyField(rec, polyObj, field, performColonCheck, isPoly, defaultValue) {
	var value = defaultValue;
	if (isPoly && field && (!performColonCheck || (performColonCheck && field.indexOf('::') > -1))) {

		var fieldValue = workerGetProperty(rec[polyObj], field.split('::')[1]);
		value = typeof fieldValue === 'boolean' ? fieldValue : (fieldValue || fieldValue === 0 ? fieldValue : defaultValue);
	}
	else {
		var fieldValue = workerGetProperty(rec, field);
		value = typeof fieldValue === 'boolean' ? fieldValue : (fieldValue || fieldValue === 0 ? fieldValue : defaultValue);
	}
	return value;
}