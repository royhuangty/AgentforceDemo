/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class RecurringPattern {
    global Set<FSL.RecurringPattern.DaysOfWeek> DaysOfWeek {
        get;
        set;
    }
    global Integer Frequency {
        get;
        set;
    }
    global FSL.RecurringPattern.FrequencyType FrequencyType {
        get;
        set;
    }
    global Integer NumberOfVisits {
        get;
        set;
    }
    global RecurringPattern() {

    }
global enum DaysOfWeek {Friday, Monday, Saturday, Sunday, Thursday, Tuesday, Wednesday}
global enum FrequencyType {DAILY, MONTHLY, WEEKLY}
}
