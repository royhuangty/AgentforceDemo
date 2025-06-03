/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class RunFixScheduleOverlaps {
    global RunFixScheduleOverlaps() {

    }
    @InvocableMethod(label='Fix Schedule Overlaps' description='Fixes the schedule when a service appointment overlaps with another appointment, absence, or travel time.')
    global static void runFixOverlap(List<FSL.RunFixScheduleOverlaps.FixOverlapActionRequest> fixOverlapActionRequests) {

    }
global class FixOverlapActionRequest {
    @InvocableVariable(label='Overlap Day End' description='The end date and time of the day that the overlap occurs.' required=true)
    global Datetime EndTime;
    @InvocableVariable(label='Resource ID' description='The ID of the service resource that has the overlap.' required=true)
    global String ResourceId;
    @InvocableVariable(label='Resource TimeZone' description='The timezone of the service resource that has the overlap.' required=true)
    global String ResourceTimeZone;
    @InvocableVariable(label='Scheduling Policy' description='The scheduling policy used when running the Fix Schedule Overlaps action.' required=true)
    global String SchedulingPolicyId;
    @InvocableVariable(label='Overlap Day Start' description='The start date and time of the day that the overlap occurs.' required=true)
    global Datetime StartTime;
    global FixOverlapActionRequest() {

    }
}
}
