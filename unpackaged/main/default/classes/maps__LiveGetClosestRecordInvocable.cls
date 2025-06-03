/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class LiveGetClosestRecordInvocable {
    global LiveGetClosestRecordInvocable() {

    }
    @InvocableMethod(label='Get Closet Record for a Given Stop Record')
    global static List<maps.LiveGetClosestRecordInvocable.getClosestRecordResponse> getClosestRecord(List<maps.LiveGetClosestRecordInvocable.getClosestRecordRequest> requestList) {
        return null;
    }
global class getClosestRecordRequest {
    @InvocableVariable(label='GeoLocation API Name' required=true)
    global String latLongGeoFieldApiName;
    @InvocableVariable(label='Object API Name' required=true)
    global String queryObjApiName;
    @InvocableVariable(label='Summary Event Record Id' required=true)
    global Id sumEventId;
    global getClosestRecordRequest() {

    }
}
global class getClosestRecordResponse {
    @InvocableVariable(label='Distance in Kilometers' required=false)
    global Decimal distanceKM;
    @InvocableVariable(label='Distance in Miles' required=false)
    global Decimal distanceMiles;
    @InvocableVariable(label='Record Id (Null if no records are found)' required=false)
    global Id objId;
    global getClosestRecordResponse() {

    }
}
}
