/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class API {
    global API() {

    }
    global static Map<String,Object> AssignRecords(String planId, List<SObject> records) {
        return null;
    }
    global static Map<String,Object> BatchGeocode(Map<String,Object> options) {
        return null;
    }
    global static Map<String,Object> CreateDriveDistanceRule(String label, List<String> deviceIds, System.Location center, Decimal driveDistance, String email) {
        return null;
    }
    global static maps__Route__c CreateRoute(Map<String,Object> options) {
        return null;
    }
    global static Map<String,Object> DriveTimeOrDistancePolygon(Map<String,Object> options) {
        return null;
    }
    global static Map<String,Object> Geocode(Map<String,Object> options) {
        return null;
    }
    global static Map<String,Object> GetBoundaryGeoJSON(List<String> geoIds, Boolean mergeShape) {
        return null;
    }
    global static Map<String,Object> GetBoundaryInformation(String parameters) {
        return null;
    }
    global static Map<String,Object> GetCurrentLocation(Integer version, List<String> deviceids) {
        return null;
    }
    global static Map<String,Object> GetDistanceMatrix(List<Map<String,Object>> Locations) {
        return null;
    }
    global static Map<String,Object> GetHostedData(String parameters) {
        return null;
    }
    global static Map<String,Object> GetLiveHistory(String deviceId, String liveAPIVersion, String starttime, String endtime) {
        return null;
    }
    global static Map<String,Object> GetTerritoryGeometry(Id territoryId) {
        return null;
    }
    global static Map<String,Object> GetTerritoryGeometry(String territoryId) {
        return null;
    }
    global static Map<String,Object> PointInPolygon(Map<String,Object> options) {
        return null;
    }
    global static Map<String,Object> StartAdvancedOptimizationForUsers(Set<Id> userIds, Date startDate) {
        return null;
    }
    global static Map<String,Object> StartAdvancedOptimizationForVisitPlan(Id templateId, Date startDate) {
        return null;
    }
    global static Map<String,Object> getPolygonGeometry(Map<String,Object> polygon) {
        return null;
    }
    global static Map<String,Object> getRoute(String requestJSON) {
        return null;
    }
global class GeneralException extends Exception {
}
global class InvalidLicenseException extends Exception {
}
global enum RouteLineOutputType {GEOJSON, TILE}
global class RouteRequest {
    global Boolean optimized;
    global maps.API.RouteLineOutputType routeLineOutputType;
    global List<maps.API.Waypoint> waypoints;
    global RouteRequest() {

    }
    global maps.API.RouteResponse send() {
        return null;
    }
}
global class RouteResponse {
    global Decimal distance;
    global String routeLine;
    global Decimal totalTravelTime;
    global List<maps.API.Waypoint> waypoints;
    global RouteResponse() {

    }
}
global class Waypoint {
    global System.Location coordinates;
    global String id;
    global Waypoint(String id, System.Location coordinates) {

    }
}
}
