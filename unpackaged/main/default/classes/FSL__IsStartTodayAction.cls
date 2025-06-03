/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class IsStartTodayAction {
    global IsStartTodayAction() {

    }
    @InvocableMethod(label='Check If Overlap Is Today' description='Checks whether the overlap occurred today.')
    global static List<Boolean> isDateTodayInTimezone(List<FSL.IsStartTodayAction.IsServiceStartTodayDecisionRequest> isServiceStartTodayDecisionRequest) {
        return null;
    }
global class IsServiceStartTodayDecisionRequest {
    @InvocableVariable(label='Object Type' description='The type of object that triggered the overlap.' required=true)
    global String eventType;
    @InvocableVariable(label='Object Id' description='The ID of the object that caused the overlap.' required=true)
    global Id objectId;
    @InvocableVariable(label='Resource TimeZone' description='The timezone of the service resource that has the overlap.' required=true)
    global String timezoneName;
    global IsServiceStartTodayDecisionRequest() {

    }
}
}
