var MAIO_URL = 'https://internal.sfmapsapi.com'; // This is switched to the correct region when runExport is invoked.

var MAKMLExport = {
		runExport : function(region) {
			// adding in another check for SF remote sites to use default url to keep push upgrades from breaking (SFMF-905)
			if (region === 'Europe') {
				MAIO_URL = 'https://internal.eu.sfmapsapi.com';
			} else if (region === 'North America') {
				MAIO_URL = 'https://internal.na.sfmapsapi.com';
			}
			MAKMLExport.createKML();
		},

		styleObject : {},
		kmlParts : {
			header : '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n <Document>\n',
			footer : ' </Document>\n</kml>',
			placeMarkString : '    <Placemark>\n      <styleUrl>#::STYLEID::</styleUrl>\n      <name>::NAME::</name>\n      <description>::DESCRIPTION::</description>\n      <Point><coordinates>::COORDS::</coordinates></Point>\n    </Placemark>\n',
			queryFolders : '',
			queryPlaceMarks : '',
			shapeFolders : '',
			savedShapes : '',
			drawnShapes : '',
			styles : ''
		},
		otherMarkerURLS : {
			image : MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
			label : MAIO_URL + '?color=000000&forlegend=false&icon=Marker',
			order : MAIO_URL + '?color=000000&forlegend=false&icon=Marker'
		},
		
		resetKMLParts : function() {
			MAKMLExport.kmlParts.queryFolders = '';
			MAKMLExport.kmlParts.shapeFolders = '';
			MAKMLExport.kmlParts.styles = '';
			MAKMLExport.kmlParts.drawnShapes = '';
			MAKMLExport.kmlParts.savedShapes = '';
			MAKMLExport.styleObject = {};
			MAKMLExport.loadingMessage.window = null;
			MAKMLExport.totals = {
				layers: 0,
				shapes: 0
			};
		},

		totals: {
			layers: 0,
			shapes: 0
		},

		loadingMessage: {
			isLoading: false,
			window: null,
			show: function() {
				MAKMLExport.loadingMessage.window = window.MAToastMessages.showLoading({
					message: MASystem.Labels.MA_Export,
					subMessage: MASystem.Labels.MA_Loading,
					timeOut: 0,
					extendedTimeOut: 0
				});
			},
			hide: function() {
				MAToastMessages.hideMessage(MAKMLExport.loadingMessage.window);
			},
			updateSubMessage: function(message) {
				MAKMLExport.loadingMessage.window.find('.toast-message').text(message);
			},
			showWaitMessage: function() {
				MAToastMessages.showMessage({
					message: this.window.MASystem.Labels.Almost_There
				});
			}
		},

		createKML : function () {
			if (MAKMLExport.loadingMessage.isLoading) {
				MAKMLExport.loadingMessage.showWaitMessage();
				return;
			}
			MAKMLExport.resetKMLParts();
			MAKMLExport.loadingMessage.isLoading = true;
			MAKMLExport.loadingMessage.show();
			MAKMLExport.processSideBar(function() {
				MAKMLExport.loadingMessage.isLoading = false;
				MAKMLExport.loadingMessage.hide();
				MAKMLExport.saveKML();
			});
		},

		processSideBar : function (callback) {
			callback = callback || function(){};
			//start with queries
			var queries = $('#PlottedQueriesTable .PlottedRowUnit').not('.DataLayer')
			
			//batch the queries to process all information
			var queryTotal = queries.length;
			var currentQuery = 1;
			var q = async.queue(function (processData, layerCallback) {
				MAKMLExport.loadingMessage.updateSubMessage('Processing SFDC Layer ' + currentQuery + ' of ' + queryTotal);
				//create folder for this query
	    		MAKMLExport.kmlParts.queryFolders += ' <Folder>\n    <name>'+ htmlEncode(processData.layerName) +'</name>\n';

				var arrayOfRecords = [];
	    		var tempArray = [];
	    		var chunks = 200;
	    		var tooltipData = processData.tooltipData;

	    		//create smaller chunks of records
	    		for (var id in processData.records) {
					var marker = processData.records[id];
					if(marker.isVisible || marker.isClustered || marker.isScattered) {
						tempArray.push(marker);
					}

					if(tempArray.length == chunks){
						arrayOfRecords.push(tempArray);
						tempArray = [];
					}
				}

				//Add remaining
				if(tempArray.length > 0){
					arrayOfRecords.push(tempArray);
				}	

				//batch
				var markerIndex = 1;
				var rbatch = async.queue(function (marker, markerCallback) {
					if(marker.marker && marker.record) {
						markerIndex++;
						var brush = marker.markerValue.replace('#','');
						var url = marker.marker.getIcon().url;

						if(brush == 'labelMarker') {
							brush = '00000:Marker', url = MAIO_URL + '?color=008FFF&forlegend=false&icon=Circle';
							if(!MAKMLExport.styleObject[brush]) {
								MAKMLExport.styleObject[brush] = url;
								MAKMLExport.kmlParts.styles += ' <Style id="'+brush+'"><IconStyle><Icon><href>'+htmlEncode(url)+'</href></Icon><scale>0.2</scale></IconStyle></Style>\n';
							}
						}
						else if(brush == 'orderMarker') {
							brush = '008FFF:Circle', url = MAIO_URL + '?color=008FFF&forlegend=false&icon=Circle'; marker.tooltip1 = markerIndex.toString();
							if(!MAKMLExport.styleObject[brush]) {
								MAKMLExport.styleObject[brush] = url;
								MAKMLExport.kmlParts.styles += '<Style id="'+brush+'"><IconStyle><Icon><href>'+htmlEncode(url)+'</href></Icon><scale>0.5</scale></IconStyle></Style>\n';
							}
						}
						else if(
							brush.indexOf('image') >=0 ) {brush = '008FFF:Marker', url = MAIO_URL + '?color=000000&forlegend=false&icon=Marker';
							if(!MAKMLExport.styleObject[brush]) {
								MAKMLExport.styleObject[brush] = url;
								MAKMLExport.kmlParts.styles += ' <Style id="'+brush+'"><IconStyle><Icon><href>'+htmlEncode(url)+'</href></Icon><scale>1</scale></IconStyle><LabelStyle><scale>0</scale></LabelStyle></Style>\n';
							}
						}
						else {
						    var markerParts = brush.split(':');
						    var shape = markerParts[1] || 'Marker';
						    if(shape != 'Marker' && shape != 'Square' && shape != 'Triangle' && shape != 'Circle') {
							    //use a standard marker
							    brush = markerParts[0] +':Marker';
							}
						    if(url.indexOf('svg') !== -1) {
						        //try to get the brush 
								url = MAIO_URL + '?color=' + markerParts[0] + '&forlegend=false&icon=Marker';
						    }
							if(!MAKMLExport.styleObject.hasOwnProperty(brush)) {
							    if(MA.Util.isIE()) {
        						   MAKMLExport.styleObject[brush] = marker.marker.content;
        						}
        						else {
        						    MAKMLExport.styleObject[brush] = marker.marker.getIcon();
        						}
								MAKMLExport.kmlParts.styles += ' <Style id="'+brush+'"><IconStyle><Icon><href>'+htmlEncode(url)+'</href></Icon><scale>1</scale></IconStyle><LabelStyle><scale>0</scale></LabelStyle></Style>\n';
							}
						}

						var markerOptions = {
							title : marker.tooltip1 || '',
							lat : marker.marker.getPosition().lat(),
							lng : marker.marker.getPosition().lng(),
							styleId : brush,
							tooltipData : tooltipData,
							record : marker || {}
						};

						if (markerOptions.lat && markerOptions.lng) {
							var name = MA.Util.encodeHTML(markerOptions.title);
							var cdata = '<![CDATA[<table>';
							try{
								var i = 0;
								var tpLength = markerOptions.tooltipData.length;
								setTimeout(function doBatch() {
									if (i < tpLength) {
                                		var tpProcessed = 0;
                                		while (tpProcessed < 10 && i < tpLength) {
											tpProcessed++;
											var tooltip = markerOptions.tooltipData[i];
											var fieldValue = getProperty(markerOptions.record, tooltip.ActualFieldName, false);
											cdata += '<tr><td style="padding-right: 10px;">' + tooltip.FieldLabel + ':</td><td>' + fieldValue + '</td></tr>';
											i++;
										}
										setTimeout(doBatch, 1);
									} else {
										if (cdata.substring(cdata.length-11,cdata.length) != '</table>]]>'){
											cdata+= '</table>]]>';
										}
										var placeMark = MAKMLExport.kmlParts.placeMarkString.replace('::NAME::', name).replace('::COORDS::',markerOptions.lng + ',' + markerOptions.lat + ',0').replace('::STYLEID::',markerOptions.styleId).replace('::DESCRIPTION::', cdata);
										MAKMLExport.kmlParts.queryPlaceMarks += placeMark;
										markerCallback();
									}
								}, 1);
							}
							catch(e){
								if (cdata.substring(cdata.length-11,cdata.length) != '</table>]]>'){
									cdata+= '</table>]]>';
								}
								var placeMark = MAKMLExport.kmlParts.placeMarkString.replace('::NAME::', name).replace('::COORDS::',markerOptions.lng + ',' + markerOptions.lat + ',0').replace('::STYLEID::',markerOptions.styleId).replace('::DESCRIPTION::', cdata);
								MAKMLExport.kmlParts.queryPlaceMarks += placeMark;
								markerCallback();
							}
						}
						else {
							markerCallback({success:false});
						}
					}
					else {
						markerCallback();
					}
				}, 3);

				if(arrayOfRecords.length > 0) {
					for(var i = 0; i < arrayOfRecords.length; i++){
						var records = arrayOfRecords[i];
						rbatch.push(records,function(res){
							//do nothing
						});
					}
				}
				else {
					//no markers, just close the folder
					MAKMLExport.kmlParts.queryPlaceMarks = '';
					MAKMLExport.kmlParts.queryFolders += '  </Folder>\n';
					currentQuery++;
			    	layerCallback({success:true});
				}
				rbatch.drain = function() {
					//append markers and close folder
					MAKMLExport.kmlParts.queryFolders += MAKMLExport.kmlParts.queryPlaceMarks;
					MAKMLExport.kmlParts.queryFolders += '  </Folder>\n';
					MAKMLExport.kmlParts.queryPlaceMarks = '';
					currentQuery++;
			    	layerCallback({success:true});
			    };
			});
			
			//create queue
			//('------Loop over queries------');
			if(queries.length > 0) {
				for(var i = 0; i < queries.length; i++){
					var $query = $(queries[i]);
					if(!$query.hasClass('DataLayer')) {
						var data = $query.data();
						var processData = {
							tooltipData : data.tooltips || [],
							layerName : data.savedQueryName,
							records : data.records || {}
						};
						//('-----add query-------');
						q.push(processData,function(res){
							//do nothing
						});
					}
				}
			}
			else {
				//('query done');
				MAKMLExport.proccessShapes(function() {
					callback();
				});
			}
			
			q.drain = function(){
				//('query done');
				MAKMLExport.proccessShapes(function() {
					callback();
				});
			};
		},
        
		processDataLayerSyle : function (dataLayer,shapeId) {
		    var returnStyle = ' <Style id="'+shapeId+'prox"><LineStyle><width>4</width><color>99000000</color></LineStyle><PolyStyle><color>9922cc22</color></PolyStyle></Style>\n';
		    
		    //open up the data layer to get the styles
		    var styleInfo = dataLayer.style;
		    
		    if(styleInfo) {
		        returnStyle = ' <Style id="'+shapeId +'prox"><LineStyle><width>'+styleInfo.strokeWeight+'</width><color>'+MAKMLExport.colorHelpers.hexToKML(styleInfo.strokeColor,'0.4')+'</color></LineStyle><PolyStyle><color>'+MAKMLExport.colorHelpers.hexToKML(styleInfo.fillColor,'0.4')+'</color></PolyStyle></Style>\n';
		    }
		    
		    
		    return returnStyle;
		},

		proccessShapes : function(callback) {
			callback = callback || function(){};
			var shapes = $('#PlottedQueriesContainer .proximity.layer');
			var savedShapes = $('#PlottedQueriesContainer .PlottedShapeLayer');
			var totalShapes = shapes.length + savedShapes.length;
			var currentShape = 1;
			var sq = async.queue(function (processData, callback) {
				MAKMLExport.loadingMessage.updateSubMessage('Processing Shape Layer ' + currentShape + ' of ' + totalShapes);
				if(processData.isSaved) {
					if((processData.shapes && processData.shapes.length > 0) || (processData.kmlInfo && processData.kmlInfo.length > 0)) {
						var savedShapeFolder = '<Folder><name>'+processData.name+'</name>\n';
						if(processData.kmlInfo && processData.kmlInfo.length > 0) {
						    //this is a shape layer
						    var shapeId = new Date();
						    shapeId = shapeId.getTime();
						    
						    //process style info
						    if(processData.dataLayer) {
						        MAKMLExport.kmlParts.styles += MAKMLExport.processDataLayerSyle(processData.dataLayer,shapeId);
						    }
						    else {
						        //defualt
						        MAKMLExport.kmlParts.styles += ' <Style id="'+shapeId+'prox"><LineStyle><width>4</width><color>99000000</color></LineStyle><PolyStyle><color>9922cc22</color></PolyStyle></Style>\n';
						    }
						    
						    //MAKMLExport.kmlParts.styles += ' <Style id="'+shapeId +'"><LineStyle><width>'+shapeData.strokeWeight+'</width><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.strokeColor,shapeData.fillOpacity)+'</color></LineStyle><PolyStyle><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.fillColor,shapeData.fillOpacity)+'</color></PolyStyle></Style>\n';
                            for(var i = 0, length = processData.kmlInfo.length; i < length; i++) {
                            	var shapeInfo = processData.kmlInfo[i] || {};
                            	var features = shapeInfo.features || [];
                            	for(var f = 0, len = features.length; f < len; f++) {
                            		var geo = features[f] || [];
                            		var coordinates = geo.geometry.coordinates || [];
                            		for(var c = 0, cLen = coordinates.length; c < cLen; c++) {
                            		    savedShapeFolder += '<Placemark>\n<styleUrl>#'+shapeId +'prox</styleUrl>\n<name>'+processData.name+'</name><Polygon><outerBoundaryIs><LinearRing><coordinates>';
                            			var coordinate = coordinates[c] || [];
                            			for(var ll = 0, llength = coordinate.length; ll < llength; ll++) {
                            				var latlngWrap = coordinate[ll] || [];
                            				var isNumber = !isNaN(latlngWrap[0]);
                            			    if(isNumber) {
                            			        savedShapeFolder += latlngWrap.join(',') + '\n';
                            			    }
                            			    else {
                                				for(var l = 0, llen = latlngWrap.length; l < llen; l++) {
                                					var latlng = latlngWrap[l];
                                					savedShapeFolder += latlng.join(',') + '\n';
                                				}
                            			    }
                            			}
                            			savedShapeFolder += '</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>';
                            		}
                            	}
                            }
						}
						else {
    						//create folder for this saved shape and add all shapes (right now only one, but mayby more later)
    						for(var pds = 0; pds < processData.shapes.length; pds++) {
    						    
    							var sShape = processData.shapes[pds];
    							var shapeKMLData = MAKMLExport.polygonHelpers.parseShapeOptions(sShape);
    							savedShapeFolder += shapeKMLData;
    						}
    
    						//check for a label marker
    						if(processData.labels.length > 0) {
    							//create placemarks
    							for(var l = 0; l < processData.labels.length; l++) {
    								var label = processData.labels[l];
    								var lat = label.getPosition().lat();
    								var lng = label.getPosition().lng();
    								var url = label.getIcon().replace(/&/g,'&amp;');
    								MAKMLExport.styleObject[processData.name + l] = url;
    								MAKMLExport.kmlParts.styles += ' <Style id="'+processData.name + l+'"><IconStyle><Icon><href>'+htmlEncode(url)+'</href></Icon><scale>2</scale></IconStyle><LabelStyle><scale>0</scale></LabelStyle></Style>\n';
    								var placeMark = MAKMLExport.kmlParts.placeMarkString.replace('::NAME::', '').replace('::COORDS::',lng + ',' + lat + ',0').replace('::STYLEID::',processData.name + l).replace('::DESCRIPTION::', '');
    								savedShapeFolder += placeMark;
    							}
    						}
						}

						savedShapeFolder += '</Folder>';
                        
						MAKMLExport.kmlParts.savedShapes += savedShapeFolder;
					}
					currentShape++;
					callback();
				}
				else {
					var shapeKMLData = MAKMLExport.polygonHelpers.parseShapeOptions(processData.shape);
					MAKMLExport.kmlParts.drawnShapes += shapeKMLData;
					currentShape++;
					callback();
				}
			});
			//q.concurrency=5;
			
			//create queue
			//('------Loop over shapes------');
			if(shapes.length > 0 || savedShapes.length >0) {
				for(var s= 0; s < shapes.length; s++){
					var $shape = $(shapes[s]);
					var data = $shape.data();
					if(!data.proxObject && data.proxObjects && data.proxObjects.length) {
						data.proxObject = data.proxObjects[0];
					}
					if(data.proxObject) {
						var processData = {
							shape : data.proxObject,
							isSaved : false
						};
						//('-----add shape-------');
						sq.push(processData,function(res){
							//do nothing
						});
					}
				}

				for(var ss= 0; ss < savedShapes.length; ss++){
					var $savedShape = $(savedShapes[ss]);
					var data2 = $savedShape.data();
					if(data2.proxObjects) {
						var processData2 = {
							shapes : data2.proxObjects || [],
							isSaved : true,
							name : data2.popupData.name || '',
							labels : data2.labelmarkers || [],
							kmlInfo : data2.kmlInfo || [],
							dataLayer : data2.dataLayer || null
						};
						//add to que
						//('-----add Saved shape-------');
						sq.push(processData2,function(res){
							//do nothing
						});
					}
				}
			}

			else {
				//('done shapes');
				callback();
			}
			
			sq.drain = function(){
				//('done shapes');
				callback();
			};
		},

		saveKML : function() {
			var returnKML = MAKMLExport.kmlParts.header;
			returnKML += MAKMLExport.kmlParts.styles;
			returnKML += MAKMLExport.kmlParts.queryFolders;
			//create shape folders
			if(MAKMLExport.kmlParts.drawnShapes !== '' || MAKMLExport.kmlParts.savedShapes !== '') {
				MAKMLExport.kmlParts.shapeFolders += '  <Folder>\n    <name>All Shapes</name>\n';
				MAKMLExport.kmlParts.shapeFolders += '    <Folder>\n      <name>Drawn Shapes</name>\n' + MAKMLExport.kmlParts.drawnShapes + '</Folder>\n';
				MAKMLExport.kmlParts.shapeFolders += '    <Folder>\n      <name>Saved Shapes</name>\n' + MAKMLExport.kmlParts.savedShapes + '</Folder>\n';
				MAKMLExport.kmlParts.shapeFolders += '  </Folder>';
				returnKML += MAKMLExport.kmlParts.shapeFolders;
			}
			returnKML += MAKMLExport.kmlParts.footer;

            MAKMLExport.saveData('Maps_export.kml',returnKML,'data/xml');    
		},

		newDownload: function (content, fileName) {
			content = content || '';
			fileName = fileName || 'Maps_export';
			fileName = fileName.replace('.kml', '');
			openNewWindow('POST', MA.resources.KMLExport, {exportData: content, fileName: fileName}, '_blank');
		},

        saveData : function(fileName, content, mimeType) {
        	try {
				mimeType = mimeType || 'application/octet-stream';
				fileName = fileName || 'Maps_export.kml';
				
				MAKMLExport.newDownload(content, fileName);
        	} catch(e) {
        		console.warn(e);
        	}
        },
		colorHelpers : {
			hexToKML : function(hex,op) {
				hex = hex.replace('#','');
				op = op || 0.5;
				var colors = {
	                r: hex.substr(0, 2) || "00",
	                g: hex.substr(2, 2) || "00",
	                b: hex.substr(4, 2) || "00"
	            };

	            var rgba = {
	            	r: parseInt(colors.r, 16),
	                g: parseInt(colors.g, 16),
	                b: parseInt(colors.b, 16),
	                a: op
	            };

	            colors = {
	                r: rgba.r,
	                g: rgba.g || 0,
	                b: rgba.b || 0
	            };

	            op = parseInt(op * 255, 10); 
	            op = op.toString(16);

	            colors.b = colors.b.toString(16);
	            colors.g = colors.g.toString(16);
	            colors.r = colors.r.toString(16);
	            if (op.length < 2) op = "0" + op;
	            if (colors.b.length < 2) colors.b = "0" + colors.b;
	            if (colors.g.length < 2) colors.g = "0" + colors.g;
	            if (colors.r.length < 2) colors.r = "0" + colors.r;
	            return op + colors.b + colors.g + colors.r;
			}
		},

		polygonHelpers : {
			toEarth : function(p) {
			    var longitude, latitude, DEG, colatitude;
			    if (p.x === 0) {
			        longitude = Math.PI / 2.0;
			    } else {
			        longitude = Math.atan(p.y / p.x);
			    }
			    colatitude = Math.acos(p.z);
			    latitude = (Math.PI / 2.0 - colatitude);
			    if (p.x < 0.0) {
			        if (p.y <= 0.0) {
			            longitude = -(Math.PI - longitude);
			        } else {
			            longitude = Math.PI + longitude;
			        }
			    }
			    DEG = 180.0 / Math.PI;
			    return {longitude: longitude * DEG, latitude: latitude * DEG};
			},

			toCart : function(longitude, latitude){
			    var theta = longitude;
			    var phi = Math.PI/2.0 - latitude;
			    // spherical coordinate use "co-latitude", not "lattitude"
			    // latitude = [-90, 90] with 0 at equator
			    // co-latitude = [0, 180] with 0 at north pole
			    return {x:Math.cos(theta)*Math.sin(phi),y:Math.sin(theta)*Math.sin(phi),z:Math.cos(phi)};
			},


			spoints : function(longitude,latitude,meters,n,offset){
			    //constant to convert to radians
			    var RAD = Math.PI/180.0;
			    //mean radius of earth in meters
			    var MR = 6378.1 * 1000.0;
			    var offsetRadians = (offset || 0) * RAD;
			    // compute long degrees in rad at a given lat
			    var r = (meters/(MR * Math.cos(latitude * RAD)));
			    var vec = MAKMLExport.polygonHelpers.toCart(longitude*RAD, latitude* RAD);
			    var pt = MAKMLExport.polygonHelpers.toCart(longitude*RAD + r, latitude*RAD);
			    var pts = [];
			    for(i=0;i<=n;i++){
			        pts.push(MAKMLExport.polygonHelpers.toEarth(MAKMLExport.polygonHelpers.rotPoint(vec,pt,offsetRadians + (2.0 * Math.PI/n)*i)));
			    }
			    //add another point to connect back to start
			    //pts.push(pts[0]);
			    return pts;
			},

			rotPoint : function(vec,pt,phi){
			    //remap vector for clarity
			    var u, v, w, x, y,z;
			    u=vec.x;
			    v=vec.y;
			    w=vec.z;
			    x=pt.x;
			    y=pt.y;
			    z=pt.z;
			    var a, d,e;
			    a=u*x + v*y + w*z;
			    d = Math.cos(phi);
			    e=Math.sin(phi);
			    return {x:(a*u + (x-a*u)*d+ (v*z-w*y)*e),y:(a*v + (y - a*v)*d + (w*x - u*z) * e),z:(a*w + (z - a*w)*d + (u*y - v*x) * e)};
			},

			kml_regular_polygon : function(longitude,latitude,meters,segments,offset){
			    var s = '<Polygon>\n';
			    s += '  <outerBoundaryIs><LinearRing><coordinates>\n';
			    var pts = MAKMLExport.polygonHelpers.spoints(longitude,latitude,meters,segments,offset);
			    var len = pts.length;
			    for(i=0;i<len;i++){
			        s += "    " + pts[i].longitude + "," + pts[i].latitude + "\n";
			    }

			    s += '  </coordinates></LinearRing></outerBoundaryIs>\n';
			    s += '</Polygon>\n';
			    return s;
			},

			parseShapeOptions : function(shape) {
				var shapeData;
				var uId = new Date();
		        uId = uId.getTime() + 'prox';
		        var shapeId = shape.qid || uId;
				if(typeof(shape.getCenter) == 'function') {
		            //circle
		            //get the center
		            var center = shape.getCenter();
		            
		            shapeData = {
		                pT : 'C',
		                longitude : center.lng(),
		                latitude : center.lat(),
		                meters : shape.getRadius(),
		                segments : 20,
		                fillColor : shape.fillColor || '#3083d3',
		                fillOpacity : shape.fillOpacity || 0.6,
		                strokeColor : shape.strokeColor || '#16325C',
		                strokeWeight : shape.strokeWeight || 4,
		                label : 'Circle'
		            }

		            //update the style string
		            MAKMLExport.kmlParts.styles += ' <Style id="'+shapeId +'"><LineStyle><width>'+shapeData.strokeWeight+'</width><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.strokeColor,shapeData.fillOpacity)+'</color></LineStyle><PolyStyle><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.fillColor,shapeData.fillOpacity)+'</color></PolyStyle></Style>\n';

		            var polygonKMLString =  MAKMLExport.polygonHelpers.kml_regular_polygon(shapeData.longitude,shapeData.latitude,shapeData.meters,shapeData.segments);

		            var shapeKMLString = '<Placemark>\n<styleUrl>#'+shapeId +'</styleUrl>\n<name>'+shapeData.label+'</name>';
		            shapeKMLString += polygonKMLString;
		            return shapeKMLString += '</Placemark>\n';

		        }
		        else if(typeof(shape.getPath) == 'function') {
		            //poly
		            shapeData = {
		                pT : 'P',
		                points : [],
		                fillColor : shape.fillColor || '#22CC22',
		                fillOpacity : shape.fillOpacity || 0.6,
		                strokeColor : shape.strokeColor || '#000000',
		                strokeWeight : shape.strokeWeight || 4,
		                label : 'Polygon'
		            }

		            MAKMLExport.kmlParts.styles += ' <Style id="'+shapeId +'"><LineStyle><width>'+shapeData.strokeWeight+'</width><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.strokeColor,shapeData.fillOpacity)+'</color></LineStyle><PolyStyle><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.fillColor,shapeData.fillOpacity)+'</color></PolyStyle></Style>\n';

		            var shapeKMLString = '<Placemark>\n<styleUrl>#'+shapeId+'</styleUrl>\n<name>'+shapeData.label+'</name>\n<Polygon>\n<outerBoundaryIs><LinearRing><coordinates>\n';
		            
		            //loop over the points to get the lat lng
		            var points = shape.getPath();
		            for (var i =0; i < points.getLength(); i++) {
		                var xy = points.getAt(i);
		                shapeKMLString += xy.lng() +','+xy.lat()+'\n';
		            }
		            var end = points.getAt(0);
		            shapeKMLString += end.lng() +','+end.lat()+'\n';
		            
		            return shapeKMLString += '</coordinates></LinearRing></outerBoundaryIs>\n</Polygon>\n</Placemark>\n';
		        }
		        else if(typeof(shape.getBounds) == 'function') {
		            //rectangle
		            shapeData = {
		                pT : 'R',
		                points : [],
		                fillColor : shape.fillColor || '#FFC96B',
		                fillOpacity : shape.fillOpacity || 0.6,
		                strokeColor : shape.strokeColor || '#000000',
		                strokeWeight : shape.strokeWeight || 4,
		                label : 'Rectangle'
		            }
		            
		            //get the bounds
		            var bounds = shape.getBounds();
		            var NE = bounds.getNorthEast();
		            var SW = bounds.getSouthWest();

		            var points = [{lat: NE.lat(), lng: NE.lng()},{lat: NE.lat(), lng: SW.lng()},{lat:SW.lat(), lng: SW.lng()},{lat: SW.lat(), lng:NE.lng()}];

		            MAKMLExport.kmlParts.styles += ' <Style id="'+shapeId+'"><LineStyle><width>'+shapeData.strokeWeight+'</width><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.strokeColor,shapeData.fillOpacity)+'</color></LineStyle><PolyStyle><color>'+MAKMLExport.colorHelpers.hexToKML(shapeData.fillColor,shapeData.fillOpacity)+'</color></PolyStyle></Style>\n';

		            var shapeKMLString = '<Placemark>\n<styleUrl>#'+shapeId +'</styleUrl>\n<name>'+shapeData.label+'</name>\n<Polygon>\n<outerBoundaryIs><LinearRing><coordinates>\n';
		            
		            //loop over the points to get the lat lng
		            for (var i =0; i < points.length; i++) {
		                var xy = points[i];
		                shapeKMLString += xy.lng +','+xy.lat+'\n';
		            }
		            var end = points[0];
		            shapeKMLString += end.lng +','+end.lat+'\n';
		            
		            return shapeKMLString += '</coordinates></LinearRing></outerBoundaryIs>\n</Polygon>\n</Placemark>\n';
		            
		        }
		        else {
		        	return '';
		        }
			}
		}
	}