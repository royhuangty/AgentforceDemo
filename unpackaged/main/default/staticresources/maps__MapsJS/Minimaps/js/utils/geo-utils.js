define(function() {

    const POLAR_RADIUS = 6356752; // meters
    const EQUATORIAL_RADIUS = 6378137 // meters
    const RADIUS_DIFF = EQUATORIAL_RADIUS - POLAR_RADIUS; // meters

    /**
     * Gets the diagonal from the center of the radius to a corner of the bounding box.
     * 
     * @param  {number} radius - The radius of the circle.
     * @return {number}
     */
    var getDiagonalBoundingBoxDistanceFromCenter = function(radius) {
        return Math.sqrt(Math.pow(radius, 2) + Math.pow(radius, 2));
    };

    /**
     * Returns the lat/lng of the point where the vector terminates.
     * 
     * @param  {object} center - The center of the circle.
     * @param  {number} magnitude - The magnitude of the vector which we are calculating lat/lng for.
     * @param  {number} angle - The angle off the x-axis that our vector is pointing (direction).
     * @return {object}
     */
    var getLatLng = function(center, magnitude, angle) {
        const MAX_LAT = 85.05115; // degrees
        const MIN_LAT = -85.05115; // degrees
        const MAX_LNG = 180; // degrees
        const MIN_LNG = -180 // degrees

        var dx = magnitude * Math.sin(angle * Math.PI / 180.0),
            dy = magnitude * Math.cos(angle * Math.PI / 180.0);

        var eccentricity = POLAR_RADIUS + (RADIUS_DIFF * (90.0 - center.lat) / 90.0),
            appliedEccentricity = eccentricity * Math.cos(center.lat * Math.PI / 180.0);

        var lat = (dx / appliedEccentricity + center.lat * Math.PI / 180.0) * 180.0 / Math.PI,
            lng = (dy / eccentricity + center.lng * Math.PI / 180.0) * 180.0 / Math.PI;

        if (lat > MAX_LAT) {
            var diff = lat - MAX_LAT;
            lat = MIN_LAT + diff;
        } else if (lat < MIN_LAT) {
            var diff = MIN_LAT - lat;
            lat = MAX_LAT - diff;
        }

        if (lng > MAX_LNG) {
            var diff = lng - MAX_LNG;
            lng = -diff;
        } else if (lng < MIN_LNG) {
            var diff = MIN_LNG - lng;
            lng = MAX_LNG - diff;
        }

        return {
            'lat': lat,
            'lng': lng
        };
    };

    var GeoUtils = {};

    /**
     * Returns the given radius in meters.
     * 
     * @param  {number} radius - The radius of the circle.
     * @param  {string} unit - The unit of measure for the radius (either km or mi).
     * @return {number}
     */
    GeoUtils.getRadiusInMeters = function(radius, unit) {
        const METERS_PER_KM = 1000;
        const METERS_PER_MI = 1609.34;

        if (unit === 'km') return radius * METERS_PER_KM;
        if (unit === 'mi') return radius * METERS_PER_MI;
    };

    GeoUtils.degreesToRadians = function(degrees) {
        return degrees * Math.PI / 180.0;
    };

    GeoUtils.getHaversineDistance = function(latlng1, latlng2) {
        if (!latlng1 || !latlng1.lat || !latlng1.lng || !latlng2 || !latlng2.lat || !latlng2.lng) return 0;

        var lat1 = this.degreesToRadians(latlng1.contextLat || latlng1.lat),
            lng1 = this.degreesToRadians(latlng1.contextLng || latlng1.lng),
            lat2 = this.degreesToRadians(latlng2.lat),
            lng2 = this.degreesToRadians(latlng2.lng);

        var diffLat = lat2 - lat1,
            diffLng = lng2 - lng1;

        var a = Math.pow(Math.sin(diffLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(diffLng / 2), 2);
            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // var eccentricity = POLAR_RADIUS + RADIUS_DIFF * (90.0 - lat1) / 90.0;

        return POLAR_RADIUS * c;
    };

    /**
     * Given informatino about a circle, returns the lat/lng points of the bounding box.
     * 
     * @param  {object} center - The center of the radius with lat and lng properties.
     * @param  {number} radius - The radius of the circle.
     * @param  {unit} unit - The unit of measure for the radius (either km or mi).
     * @return {object}
     */
    GeoUtils.getBoundingBoxByCenterAndRadius = function(center, radius, unit) {
        // TODO
        // Check for empty string and data types
        if (!radius || !center || center.lat == null || center.lng == null || (unit !== 'mi' && unit !== 'km')) throw 'Bad parameter';

        var result = {
            topRight: {},
            topLeft: {},
            bottomLeft: {},
            bottomRight: {}
        };

        var radiusInMeters = this.getRadiusInMeters(radius, unit),
            distance = getDiagonalBoundingBoxDistanceFromCenter(radiusInMeters);

        result.topRight = getLatLng(center, distance, 45);
        result.topLeft = getLatLng(center, distance, 135);
        result.bottomLeft = getLatLng(center, distance, 225);
        result.bottomRight = getLatLng(center, distance, 315);

        return result;
    };

    return GeoUtils;

});