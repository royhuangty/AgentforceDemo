/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class VisualHistoryRestorer {
    global VisualHistoryRestorer() {

    }
    @InvocableMethod(label='Restore Visual Histories by session list')
    global static List<tspa.VisualHistoryRestorer.OutputResponse> restoreBySessions(List<tspa.VisualHistoryRestorer.InputParam> inputParams) {
        return null;
    }
global class InputParam {
    @InvocableVariable( required=false)
    global List<tspa__TechSeeSessions__c> sessions;
    global InputParam() {

    }
}
global class OutputResponse {
    @InvocableVariable( required=false)
    global Boolean isSuccess;
    @InvocableVariable( required=false)
    global String message;
}
}
