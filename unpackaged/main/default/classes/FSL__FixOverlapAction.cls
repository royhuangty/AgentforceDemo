/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class FixOverlapAction {
    global FixOverlapAction() {

    }
    @Deprecated
    @InvocableMethod(label='Fix Schedule Overlaps - Deprecated' description='Fixes the schedule when a service appointment overlaps with another appointment, absence, or travel time.')
    global static void runFixOverlap(List<FSL.FixOverlapAction.FixOverlapActionRequest> fixOverlapActionRequests) {

    }
global class FixOverlapActionRequest {
    @InvocableVariable(label='Reason for In Jeopardy' description='Specify the reason for marking service appointments as In Jeopardy when dropped from the Gantt as a result of the fix schedule overlaps action.' required=true)
    global String InJeopardyReason;
    @InvocableVariable(label='Platform Event' description='When a service appointment overlaps with another appointment, absence, or travel time, a platform overlap event is created.' required=true)
    global FSL__Overlap_Event__e platformEvent;
    @InvocableVariable(label='Scheduling Policy' description='The scheduling policy used when running the fix schedule overlaps action.' required=true)
    global String SchedulingPolicyId;
    @InvocableVariable(label='Mark dropped service appointments as In Jeopardy' description='Service appointments dropped from the Gantt as a result of the fix schedule overlaps action are set to In Jeopardy.' required=true)
    global Boolean SetInJeopardyToDroppedServices;
    global FixOverlapActionRequest() {

    }
}
}
