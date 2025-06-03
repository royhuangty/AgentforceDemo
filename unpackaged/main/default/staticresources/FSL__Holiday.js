"use strict";

(function (global) {

    global.Holiday = function Holiday(sobject) {
        this.id = sobject.Id;
        this.holidayId = sobject.Id;
        this.name = sobject[fieldNames.Holiday.Name];
        this.description = sobject[fieldNames.Holiday.Description];
        this.activityDate = sobject[fieldNames.Holiday.ActivityDate];
        this.nextOccurrenceDate = sobject[fieldNames.Holiday.NextOccurrenceDate];
        this.isAllDay = sobject[fieldNames.Holiday.IsAllDay];
        this.isRecurrence = sobject[fieldNames.Holiday.IsRecurrence];;
        this.startTimeInMinutes = sobject[fieldNames.Holiday.StartTimeInMinutes];;
        this.endTimeInMinutes = sobject[fieldNames.Holiday.EndTimeInMinutes];
        this.recurrenceType = sobject[fieldNames.Holiday.RecurrenceType];
        this.recurrenceInterval = sobject[fieldNames.Holiday.RecurrenceInterval];
        this.recurrenceStartDate = sobject[fieldNames.Holiday.RecurrenceStartDate];
        this.recurrenceEndDateOnly = sobject[fieldNames.Holiday.RecurrenceEndDateOnly];
        this.recurrenceDayOfMonth = sobject[fieldNames.Holiday.RecurrenceDayOfMonth];
        this.recurrenceDayOfWeekMask = sobject[fieldNames.Holiday.RecurrenceDayOfWeekMask];
        this.recurrenceMonthOfYear = sobject[fieldNames.Holiday.RecurrenceMonthOfYear];

        if (this.isRecurrence) {
            // NextOccurrenceDate is core DATEONLY format serializing to date string in user locale, e.g. '2023-01-23'
            var dateTimeInBrowserTimeZone = new Date(this.nextOccurrenceDate);
            var tzOffSet = dateTimeInBrowserTimeZone.getTimezoneOffset() * 60 * 1000;
            this.date = new Date(dateTimeInBrowserTimeZone.getTime() + tzOffSet);
        } else {
            // ActivityDate is core DUEDATE format serializing to timestamp in GMT, e.g. 1630454400000
            // Add/Subtract necessary timezone offset from broswer timezone
            var _tzOffSet = new Date(this.activityDate).getTimezoneOffset() * 60 * 1000;
            this.date = new Date(this.activityDate + _tzOffSet);
        }
    };
})(window);