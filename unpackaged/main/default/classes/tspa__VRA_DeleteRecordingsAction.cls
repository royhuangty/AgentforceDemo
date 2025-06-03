/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class VRA_DeleteRecordingsAction {
    global VRA_DeleteRecordingsAction() {

    }
    @InvocableMethod(label='VRA Delete Recordings Action' description='The apex action allows to delete the recordings from TechSee S3 bucket using API. The limit of incoming list of images is 100 elemennts per one apex action transaction')
    global static List<tspa.VRA_DeleteRecordingsAction.Response> deleteRecordings(List<tspa.VRA_DeleteRecordingsAction.Request> requestList) {
        return null;
    }
global class Request {
    @InvocableVariable(label='Visual Recordings List' required=true)
    global List<tspa__Visual_Remote_Assistant_Recording__c> recordingList;
    global Request() {

    }
}
global class Response {
    @InvocableVariable( required=false)
    global String error;
    @InvocableVariable( required=false)
    global Boolean isSuccess;
    @InvocableVariable( required=false)
    global String message;
}
}
