var GlobalMessages = {
    NA: MASystem.Labels.MA_Something_Went_Wrong,
    TRAFFIC: { // custom message only used by the core frontend (not MAIO)
        ROUTE: MASystem.Labels.MA_50_STOPS_MAY_BE_USED_IN_A_ROUTE_THAT_INCLUDES_TRAFFIC,
        TIME_BASED_ROUTE: MASystem.Labels.MA_50_STOPS_MAY_BE_USED_IN_A_ROUTE_THAT_INCLUDES_TRAFFIC,
        SCHEDULE: MASystem.Labels.Schedule_Error_Limit_Schedule_50_Event_Or_Less
    },
    NO_ERROR_FOUND: { // used when no error match is found based on maio's response
        ROUTE: MASystem.Labels.MA_Unable_Build_Route,
        TIME_BASED_ROUTE: MASystem.Labels.MA_Unable_Build_Route,
        SCHEDULE: MASystem.Labels.MA_Unable_Build_Sched
    },
    'Bad Request': {
        SCHEDULE: MASystem.Labels.Schedule_Error_Route_Not_Available
    },
    82001: {
        ROUTE: MASystem.Labels.MA_120_STOPS_MAY_BE_USED,
        TIME_BASED_ROUTE: MASystem.Labels.MA_120_STOPS_MAY_BE_USED,
        SCHEDULE: MASystem.Labels.MA_150_STOPS_MAY_BE_USED
    },
    82002: {
        ROUTE: MASystem.Labels.MA_Please_Add_Two_Stops,
        TIME_BASED_ROUTE: MASystem.Labels.MA_Please_Add_Two_Stops,
        SCHEDULE: MASystem.Labels.MA_Please_Add_Two_Events
    },
    82003: {
        ROUTE: 'Your Transportation Mode does not support this many stops. Please change your Transportation Mode or use less stops.',
        TIME_BASED_ROUTE: 'Your Transportation Mode does not support this many stops. Please change your Transportation Mode or use less stops.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Transportation_Method_Too_Many_Events
    },
    82004: {
        ROUTE: 'Woah there, time traveler... Please ensure your start time is before your end time.',
        TIME_BASED_ROUTE: 'Woah there, time traveler... Please ensure your start time is before your end time.',
        SCHEDULE: MASystem.Labels.Common_End_Time_Before_Start_Time
    },
    82005: {
        TIME_BASED_ROUTE: 'You have a stop that begins before your start time. Please ensure your stops occur after your start time.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Event_Starts_Before_Start_Hours
    },
    82006: {
        TIME_BASED_ROUTE: 'You have a stop that begins after your end time. Please ensure your events occur before your end time.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Event_Starts_After_Hours
    },
    82007: {
        TIME_BASED_ROUTE: 'You have overlapping stops. Please edit your stop times and try again.',
        SCHEDULE: Schedule_Error_Multiple_Overlapping_Events
    },
    82008: {
        TIME_BASED_ROUTE: 'You have a stop that finishes after your route\'s end time. Please edit your route end time or the offending stop.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Event_After_Day_Ends
    },
    82009: {
        TIME_BASED_ROUTE: 'You have a stop that overlaps a restricted time. Please edit the restricted time or offending stop.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Restricted_Time_Overlap
    },
    82010: {
        TIME_BASED_ROUTE: 'You have a stop that is outside your route start and end time. Edit your route start, end, or the offending stop.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Event_Out_Of_Working_Time
    },
    82011: {
        ROUTE: MASystem.Labels.MA_Please_Add_Two_Stops,
        TIME_BASED_ROUTE: MASystem.Labels.MA_Please_Add_Two_Stops,
        SCHEDULE: MASystem.Labels.MA_Please_Add_Two_Events
    },
    82012: {
        TIME_BASED_ROUTE: 'Please limit your route to 120 stops or less.'
    },
    82013: {
        TIME_BASED_ROUTE: 'You have a stop that begins before your start time. Please ensure your stops occur after your start time.'
    },
    82014: {
        TIME_BASED_ROUTE: MASystem.Labels.Routes_Late_Arrival,
        SCHEDULE: MASystem.Labels.Schedule_Error_Late_To_Event
    },
    82015: {
        ROUTE: MASystem.Labels.Routes_Late_Arrival,
        // TIME_BASED_ROUTE: 'Unable to build route. You can\'t get to some of your stops in time. Please ensure there are no overlapping stops.',
        SCHEDULE: MASystem.Labels.Schedule_Error_Wont_Make_It_On_Time_Overlapping
    },
    82017: {
        ROUTE: MASystem.Labels.MA_LIMIT_ASIA_25_STOPS,
        TIME_BASED_ROUTE: MASystem.Labels.MA_LIMIT_ASIA_25_STOPS
    },
    82700: {
        SCHEDULE: MASystem.Labels.Schedule_Error_More_Stops_Then_Allowed
    }
};

var WaypointMessages = {
    82005: {
        TIME_BASED_ROUTE: MASystem.Labels.MA_Stop_Before_Start,
        SCHEDULE: MASystem.Labels.MA_Stop_Before_Start_Sched
    },
    82006: {
        TIME_BASED_ROUTE: MASystem.Labels.MA_Stop_After_End,
        SCHEDULE: MASystem.Labels.MA_Stop_After_End_Sched
    },
    82007: {
        TIME_BASED_ROUTE: MASystem.Labels.MA_Overlap_Stop,
        SCHEDULE: MASystem.Labels.MA_Overlap_Event
    },
    82008: {
        TIME_BASED_ROUTE: MASystem.Labels.MA_Finish_After_End,
        SCHEDULE: MASystem.Labels.MA_Finish_After_End_Sched
    },
    82009: {
        TIME_BASED_ROUTE: 'This stop overlaps with a restricted time.',
        SCHEDULE: MASystem.Labels.Schedule_Event_Overlap_Restricted_Time
    },
    82010: {
        TIME_BASED_ROUTE: 'This stop is outside your route start or end time.',
        SCHEDULE: MASystem.Labels.Schedule_Event_Outside_Of_Work_Day
    },
    82013: {
        TIME_BASED_ROUTE: 'This stop begins before the route\'s start time'
    },
    82014: {
        TIME_BASED_ROUTE: 'You will be late for this stop.',
        SCHEDULE: MASystem.Labels.Schedule_Running_Late
    },
    82015: {
        ROUTE: 'You will be late for this stop.',
        SCHEDULE: MASystem.Labels.Schedule_Running_Late
    }
};

function getWaypointErrorMessage(errorCode, type) {
    type = type || '';
    errorCode = errorCode || '';
    var error = WaypointMessages[errorCode] || {};
    var msg = error[type] || GlobalMessages['NA'];
    return msg;
}
function getGlobalErrorMessage(errorCode, type) {
    type = type || '';
    errorCode = errorCode || '';
    var error = GlobalMessages[errorCode] || {};
    var msg = error[type] || GlobalMessages['NA'];
    return msg;
}