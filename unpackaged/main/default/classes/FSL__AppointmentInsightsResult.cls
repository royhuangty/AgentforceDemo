/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class AppointmentInsightsResult {
    global Integer blockedSlots {
        get;
        set;
    }
    global List<FSL.AppointmentInsightsResult.BlockingRule> blockingRules {
        get;
        set;
    }
    global Datetime horizonEndDate {
        get;
        set;
    }
    global Datetime horizonStartDate {
        get;
        set;
    }
    global Datetime operationStartTime {
        get;
        set;
    }
    global Id policyId {
        get;
        set;
    }
    global Integer resourcesEvaluated {
        get;
        set;
    }
    global Id serviceAppointmentId {
        get;
        set;
    }
    global Id serviceTerritoryId {
        get;
        set;
    }
    global AppointmentInsightsResult() {

    }
global class BlockingRule {
    global String ruleName {
        get;
        set;
    }
    global Integer slotsBlockedByMultipleRules {
        get;
        set;
    }
    global Integer slotsBlockedByRule {
        get;
        set;
    }
    global BlockingRule() {

    }
}
}
