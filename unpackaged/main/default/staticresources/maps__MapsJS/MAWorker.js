self.addEventListener('message', function(e) {
	var data = e.data;

	if(data.externalScripts) {
		var scripts = JSON.parse(data.externalScripts) || {};
		for(var key in scripts) {
			var script = scripts[key];
			self.importScripts(script);
		}
	}

	switch (data.cmd) {
		case 'updateRecords':
			/**
				what this needs
				1. records
				2. queryData.addressFields
				3. queryRecord
				4. recordList
				5. imageInfo
				6. isIE?
				7. legendInfo
			*/
			//grab the records and queryInfo
			var imgLoaderDimensions = {};
			if(data.imgLoaderDimensions) {
				imgLoaderDimensions = JSON.parse(data.imgLoaderDimensions);
			}

			var regionURL = 'https://internal.sfmapsapi.com';
			if (data.dataRegion === 'Europe') {
				regionURL = 'https://internal.eu.sfmapsapi.com';
			} else if (data.dataRegion === 'North America') {
				regionURL = 'https://internal.na.sfmapsapi.com';
			}
			
			var processData = {
				dataRegion: data.dataRegion,
				records : JSON.parse(data.records) || [],
				queryRecord : JSON.parse(data.queryRecord) || {},
				addressFields : JSON.parse(data.addressFields) || {},
				deviceFields:JSON.stringify(data.deviceFields), 
                layerType: JSON.stringify(data.layerType),                  
				shapeAssignmentIsFirst : data.shapeAssignmentIsFirst || true,
				imgLoaderDimensions : imgLoaderDimensions,
				isIE : data.isIE || false,
				MAIO_URL: regionURL,
				recordList : JSON.parse(data.recordList) || [],
				tooltips : JSON.parse(data.tooltips) || [],
				addressProxLimitInfo : JSON.parse(data.addressProxLimitInfo || '{}'),
				FiscalYearSettings: JSON.parse(data.FiscalYearSettings || '{}')
			}
			
			var records = processRecords(processData,function(res) {
				//response with processed records
				self.postMessage({
					success:true,
					records:JSON.stringify(res.records),
					recordsToGeocode:JSON.stringify((res.recordsToGeocode)),
					shapeIdsToPlot:JSON.stringify(res.shapeIdsToPlot),
					recordList:JSON.stringify(res.recordList)
				});
			});

			break;
		
		case 'sortListView' : 
		    var recordList;
		    try {
		        recordList = JSON.parse(data.recordList);
		    }
		    catch(e) {
		        recordList = [];
		    }
		    var sortArray;
		    try {
		        sortArray = JSON.parse(data.sortArray);
		    }
		    catch(e) {
		        sortArray = [];
		    }
		    var sortObject;
		    try {
		        sortObject = JSON.parse(data.sortObject);
		    }
		    catch(e) {
		        sortObject = [];
		    }
		    var processListData = {
		        recordList : recordList,
		        sortArray : sortArray,
		        sortObject : sortObject
		    };
		    mobileSortListView(processListData,function (res) {
		        self.postMessage({success:true,data:JSON.stringify(res.data)});
		    })
		    break;
		case 'processGeocodeRecordsArray' :
			var processData = {
				records : JSON.parse(data.records),
				latField : data.latField,
				lngField : data.lngField
			};
			processGeocodeRecordsArray(processData,function(res) {
				self.postMessage({success:true,data:JSON.stringify(res)});
			})
			break;
		case 'processGeocodeRecordsArrayBatch' :
			var processData = {
				sfRecords : JSON.parse(data.sfRecords),
				geocodedRecords : JSON.parse(data.geocodedRecords),
				latField : data.latField,
				lngField : data.lngField
			};
			processGeocodeRecordsArrayBatch(processData,function(res) {
				self.postMessage({success:true,data:JSON.stringify(res)});
			})
			break;
		case 'processAutoAssignRecords' :
			//perform a loop in a worker to build a needGeocoding array...
			var processData = {
				records : JSON.parse(data.records),
				deviceIdFieldName:data.deviceIdFieldName,
				deviceVendorFieldName:data.deviceVendorFieldName,
                layerType: data.layerType,
                deviceMap: JSON.parse(data.deviceMap),
                addressFields:JSON.parse(data.addressFields)
			};
			processAutoAssignRecords(processData,function(res) {
				self.postMessage({success:true,records:JSON.stringify(res.records),recordsToGeocode:JSON.stringify(res.recordsToGeocode),deviceMap:JSON.stringify(res.deviceMap)});
				//self.postMessage({success:true,data:JSON.stringify(res)});
			})
			break;
		case 'pointsInShape' : 
				var processData = {
					cx : data.cx,
					cy : data.cy,
					neLat : data.neLat,
					neLng : data.neLng,
					swLat : data.swLat,
					swLng : data.swLng,
					type : data.type,
					radius : data.radius,
					points : JSON.parse(data.points),
					path : JSON.parse(data.path)
				};
				processPointsInShape(processData,function(res) {
					self.postMessage({success:true,data:JSON.stringify(res.data)});
				});
			break;
		case 'processTerritoryShapeHTML' :
				var processData = {
					ShapeSelectionsObject : JSON.parse(data.ShapeSelectionsObject),
					selectLocation : data.selectLocation,
					dataLevel : data.dataLevel
				}
				
				processTerritoryShapeHTML(processData,function(res) {
					self.postMessage({success:true,data:res});
				});
			break;	
				
		case 'addDataToArray' : 
				var processData = {
					data : JSON.parse(data.data),
					array : JSON.parse(data.array)
				}
				
				addToArray(processData.array,processData.data,function(res) {
					if(res.success) {
						self.postMessage({success:true,array:JSON.stringify(res.array)});
					}
					else {
						self.postMessage({success:false,array:JSON.stringify(res.array),error:res.error,subMessage:res.subMessage});
					}
				});
			break;
				
		case 'stop':

			break;
		default:
			self.postMessage('Unknown command: ' + data.msg);
	}

}); //end listener
