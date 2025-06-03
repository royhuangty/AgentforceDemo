function processPointsInShape (options, callback) {
    var type = options.type;
    
    if(type == undefined) {
        callback({success:false,error:'Missing parameter "type". What type of shape is this?',types:['Circle','Polygon','Data']});
        return;
    }
    switch (type) {
        case 'circle' :
            processPointsInCircle(options,function(res) {
                callback(res);
            });
            break;
            
        case 'polygon' :
            processPointsInPolygon(options,function(res) {
                callback(res);
            });
            break;
            
        case 'rectangle' : 
            processPointsInRectangle(options,function (res) {
                callback(res);
            });
            break;
        
        case 'data' : 
            
            break;
        default :
            
            callback({success:false,error:'Missing parameter "type". What type of shape is this?',types:['Circle','Polygon','Data']});
            break;
    }
}

function processPointsInPolygon (options, callback) {
    var pointMap = options.points;
    var vs = options.path || [];
    var pointsInPolygon = [];
    for(var key in pointMap) {
        var point = pointMap[key];
        var x = point[0], y = point[1];
    
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
    
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        if(inside) {
            pointsInPolygon.push(key);
        }
    }
    
    callback({success:true,data:pointsInPolygon});
}

function processPointsInCircle(options,callback) {
    var pointMap = options.points || {};
    var pointsInPolygon = [];
    var pointsNotInPolygon = [];
    var cx = options.cx || '';
    var cy = options.cy  || '';
    var radius = options.radius  || '';
    
    //x, y, cx, cy, radius
    for(var key in pointMap) {
        var point = pointMap[key];
        var lt = point[0];
        var ln = point[1];
        var dLat = (lt - cx) * Math.PI / 180;
        var dLon = (ln - cy) * Math.PI / 180;
        var a = 0.5 - Math.cos(dLat) / 2 + Math.cos(cx * Math.PI / 180) * Math.cos(lt * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
        d = Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
        var isInside = d <= radius;
        if(isInside) {
            pointsInPolygon.push(key);
        }
        else {
            pointsNotInPolygon.push(key);
        }
    }
    
    callback({success:true,data:pointsInPolygon,pointsNotInPolygon:pointsNotInPolygon});
}

function processPointsInRectangle (options,callback) {
    var pointMap = options.points || {};
    var pointsInPolygon = [];
    var swLat = options.swLat || NaN;
    var swLng = options.swLng || NaN;
    var neLat = options.neLat || NaN;
    var neLng = options.neLng || NaN;
    
    var pointMap = options.points || {};
    for(var key in pointMap) {
        var point = pointMap[key];
        var lat = point[0];
        var lng = point[1];
        var isInside = true;
        
        if (lat < swLat) isInside = false;
        if (lat > neLat) isInside = false;
        if (lng < swLng) isInside = false;
        if (lng > neLng) isInside = false;
        
        if(isInside) {
            pointsInPolygon.push(key);
        }
        
    }
    
    
    callback({success:true,data:pointsInPolygon});
}

function toRadians(a) {
    return a * Math.PI / 180;
}

function normalizeShape (googleShape) {
    var shapeData = {
        cx : '',
        cy : '',
        radius : '',
        type : '',
        path : [],
        swLat : '',
        swLng : '',
        neLat : '',
        neLng : ''
    };
    //not to be called inside a worker!
    if(typeof(googleShape.getCenter) == 'function') {
        //this is a circle
        var center = googleShape.getCenter();
        shapeData.cx = center.lat();
        shapeData.cy = center.lng();
        shapeData.radius = googleShape.getRadius();
        shapeData.type = 'circle';
    }
    else if(typeof(googleShape.getPath) == 'function') {
        //we need to convert google lat lngs into an array or lat lngs
        var path = googleShape.getPath();
        var pointArray = path.getArray();
        var normalizedPath = [];
        for(var i = 0; i < pointArray.length; i++) {
            var point = pointArray[i];
            normalizedPath.push([point.lat(),point.lng()]);
        }
        
        shapeData.type = 'polygon';
        shapeData.path = normalizedPath;
        
    }
    else if(typeof(googleShape.getBounds) == 'function') {
        var bounds = googleShape.getBounds();
        var NE = bounds.getNorthEast();
        var SW = bounds.getSouthWest();
        shapeData.type = 'rectangle';
        shapeData.swLat = SW.lat();
        shapeData.swLng = SW.lng();
        shapeData.neLat = NE.lat();
        shapeData.neLng = NE.lng(); 
    }
    else {
        //don't use workers
        shapeData.type = 'legacy';
    }
    return shapeData;
}


/*******************************
 * 
 * Start territory functions
 * 
********************************/

function processTerritoryShapeHTML (options,callback) {
    callback = callback || function() {};
    options = options || {};
    var ShapeSelectionsObject = options.ShapeSelectionsObject || {};
    var selectLocation = options.selectLocation || '';
    var shapesToPlot = [];
    var geoids = [];
    
    //on recall of saved shapes, convert array to map
    var recreateMap = Array.isArray(ShapeSelectionsObject);
    var formattedShapeMap = {};
    //selectLocation == sidebar or main select popup
    selectLocation = typeof(selectLocation) == 'string' ? selectLocation.toLocaleLowerCase() : '';
    ShapeSelectionsObject = ShapeSelectionsObject || {};
    var keys = Object.keys(ShapeSelectionsObject) || [];
    var shapeLength = keys.length;
    var htmlString = '';
    for(var i = 0; i < shapeLength; i++) {
        var prop = keys[i];
        var option = ShapeSelectionsObject[prop];
        if(option != undefined) {
            var shapeValue = option.value || option.uniqueid || '';
            var shapeLabel = option.label || option.uniquelabel || '';
            var dataLevel = option.level || options.dataLevel || '';
            var isActive = option.isActive || false;
            var activeClass = isActive == true ? 'slds-is-selected' : '';
            if(selectLocation == 'sidebar') {
                htmlString += '<li class="slds-listbox__item '+activeClass+' lasso-list-item" role="presentation" value="'+shapeValue+'" data-value="'+shapeValue+'">'+
                    				'<span aria-selected="false" class="slds-listbox__option slds-listbox__option_plain slds-media" draggable="true" role="option" tabindex="0">'+
                    					'<span class="slds-truncate" title="Option 1">'+
                    						'<span class="slds-icon slds-icon_selected slds-icon_x-small slds-icon-text-default slds-m-right_x-small ma-icon ma-icon-check"></span>'+
                    						'<span class="list-item-label">'+shapeLabel+'</span>'+
                    					'</span>'+
                    				'</span>'+
                    			'</li>';
            }
            else {
                //recreateMap, means first load so isActive will be false... forcing to be true
                if(isActive || recreateMap) {
                    htmlString += '<option class="slds-truncate" value="'+shapeValue+'" data-level="'+dataLevel+'">'+shapeLabel+'</option>';
                }
            }
            
            if(!option.isPlotted) {
                geoids.push({label:shapeLabel,value:shapeValue,level:dataLevel,isPlotted:false,isActive:false});
                shapesToPlot.push(shapeValue);
            }
            
            if(recreateMap) {
                formattedShapeMap[shapeValue] = {label:shapeLabel,value:shapeValue,level:dataLevel,isPlotted:false,isActive:true};
            }
        }
    }
    
    callback({htmlString:htmlString,geoids:geoids,shapesToPlot:shapesToPlot,formattedShapeMap:formattedShapeMap});
}

function addToArray(array,data,callback) {
    //add passed data to an array by looping over the data and returning the array.
    /*******************************
     * array = ARRAY
     * data = ARRAY of x (objects,strings,etc)
    ********************************/
    callback = callback || function() {};
    try {
        if(typeof(data) == 'object') {
            var dataLength = data.length;
            for(var i = 0; i < dataLength; i++) {
                var dataToAdd = data[i];
                array.push(dataToAdd);
            }
            
            callback({success:true,array:array});
        }
        else {
            callback({success:false,error:'Data is not of type object(Array)',array:array,subMessage:'Did you pass data as an array?'});
        }
    }
    catch(e) {
        callback({success:false,error:e,array:array,subMessage:'Did you pass data as an array?'});
    }
}


/*******************************
 * 
 * End territory functions
 * 
********************************/