/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class GetRecordingBySessionIdandRefrenceId {
    global GetRecordingBySessionIdandRefrenceId() {

    }
    @InvocableMethod(label='VRA Retrieve session Recordings ' description='Fetch session recordings  based on Input Parameters ')
    global static List<tspa.GetRecordingBySessionIdandRefrenceId.VRAResponse> GetRecordingdetails(List<tspa.GetRecordingBySessionIdandRefrenceId.SessionRecordingDetails> VRARequestFromFlow) {
        return null;
    }
global class SessionRecordingDetails {
    @InvocableVariable( required=false)
    global String reference;
    @InvocableVariable( required=false)
    global String referenceType;
    @InvocableVariable( required=false)
    global String sessionId;
    @InvocableVariable( required=false)
    global Integer sortOrder;
    @InvocableVariable( required=false)
    global String token;
    global SessionRecordingDetails() {

    }
}
global class VRAResponse {
    @InvocableVariable( required=false)
    global List<tspa__Visual_Remote_Assistant_Recording__c> sessionRecordings;
    global VRAResponse(List<tspa__Visual_Remote_Assistant_Recording__c> sessionRecordings) {

    }
}
}
