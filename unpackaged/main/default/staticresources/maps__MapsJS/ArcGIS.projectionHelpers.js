ArcGIS.projectionHelpers = {
	getProjection: function(spatialReference) {
		// Try to grab the latest WKID
		var proj = spatialReference.latestWkid || spatialReference.wkid;
		// Renamed EPSG projections
		switch(proj) {
			case 102100:
				proj = 3857;
				break;
		}
		proj = 'EPSG:' + proj;
		proj = proj4.defs[proj] ? proj : null;
		return proj;
	},
	reprojectCoordinates: function(projFrom, projTo, coords) {
		if (projFrom == null || projFrom == projTo || !(coords instanceof Array) || coords.length == 0) {
			// do nothing
		}
		else if (!(coords[0] instanceof Array)) {
			// coords is a point
			coords = proj4(projFrom, projTo, coords);
		}
		else {
			// coords is a deep array of points
			coords.forEach(function(c, i) {
				coords[i] = ArcGIS.projectionHelpers.reprojectCoordinates(projFrom, projTo, c);
			});
		}
		return coords;
	}
};
