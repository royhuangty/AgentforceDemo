/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class RestoreVisualHistoriesInvocable {
    global RestoreVisualHistoriesInvocable() {

    }
    @InvocableMethod(label='Action (Deprecated)')
    global static List<tspa.RestoreVisualHistoriesInvocable.OutputResponse> chatBotInviteAction(List<tspa.RestoreVisualHistoriesInvocable.InputParam> inputParams) {
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
    global OutputResponse(Boolean pIsSuccess, String pMessage) {

    }
}
}
