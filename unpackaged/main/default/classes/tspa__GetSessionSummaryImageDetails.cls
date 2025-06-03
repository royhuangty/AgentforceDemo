/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class GetSessionSummaryImageDetails {
    global GetSessionSummaryImageDetails() {

    }
    @InvocableMethod(label='VRA Retrieve session summary and Images detail' description='Fetch session summary data along with its related report image and descriptions based on input parameter ')
    global static List<tspa.GetSessionSummaryImageDetails.SessionSummaryImageDetails> tspa_GetSessionSummaryImageDetails(List<String> SessionIds) {
        return null;
    }
global class SessionSummaryImageDetails {
    @InvocableVariable( required=false)
    global List<Note> imageDescription;
    @InvocableVariable( required=false)
    global List<tspa__Visual_Image__c> imageResponse;
    @InvocableVariable( required=false)
    global List<Note> reportDescription;
    @InvocableVariable( required=false)
    global List<tspa__Visual_History__c> sessionSummaryResponse;
    global SessionSummaryImageDetails(List<Note> reportDescription, List<Note> imageDescription, List<tspa__Visual_History__c> sessionSummaryResponse, List<tspa__Visual_Image__c> imageResponse) {

    }
}
}
