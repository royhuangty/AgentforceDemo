"use strict";

(function (global) {

    var DAYS = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
    };

    global.TimeSlot = function TimeSlot(sobject) {
        this.startHour = Math.floor(sobject[fieldNames.TimeSlot.StartTime] / 1000 / 60 / 60);
        this.startMinute = Math.ceil(sobject[fieldNames.TimeSlot.StartTime] / 1000 / 60 / 60 % 1 * 60);

        this.endHour = Math.floor(sobject[fieldNames.TimeSlot.EndTime] / 1000 / 60 / 60);
        this.endMinute = Math.ceil(sobject[fieldNames.TimeSlot.EndTime] / 1000 / 60 / 60 % 1 * 60);

        this.type = sobject[fieldNames.TimeSlot.Type];

        if (this.endHour == 0) this.endHour = 24;
    };

    global.TimeSlotOptiViewer = function TimeSlot(sobject) {
        this.startHour = parseInt(sobject[fieldNames.TimeSlot.StartTime].split(":")[0]);
        this.startMinute = parseInt(sobject[fieldNames.TimeSlot.StartTime].split(":")[1]);

        this.endHour = parseInt(sobject[fieldNames.TimeSlot.EndTime].split(":")[0]);
        this.endMinute = parseInt(sobject[fieldNames.TimeSlot.EndTime].split(":")[1]);

        this.type = sobject[fieldNames.TimeSlot.Type];

        if (this.endHour == 0) this.endHour = 24;
    };

    global.OperatingHours = function OperatingHours(sobject) {
        this.id = sobject.Id;
        this.name = sobject.Name;
        this.timezone = sobject[fieldNames.OperatingHours.Timezone];

        // day -> time slots
        this.slots = {};
        var slotsArr = sobject[fieldNames.OperatingHours.Time_Slots__r];
        if (!slotsArr) slotsArr = [];

        for (var i = 0; i < slotsArr.length; i++) {
            var slot = slotsArr[i];
            var dayOfTheWeek = slot[fieldNames.TimeSlot.DayOfWeek];
            dayOfTheWeek = DAYS[dayOfTheWeek];

            var currArr = this.slots[dayOfTheWeek];

            if (!currArr) {
                currArr = [];
                this.slots[dayOfTheWeek] = currArr;
            }

            currArr.push(new TimeSlot(slot));
        }
    };

    global.OperatingHoursOptiViewer = function OperatingHoursOptiViewer(sobject, CalendarDays) {
        this.id = sobject.Id;
        this.name = sobject.Id;
        this.timezone = sobject[fieldNames.OperatingHours.Timezone];

        // day -> time slots
        this.slots = {};
        var slotsArr = CalendarDays;
        if (!slotsArr) slotsArr = [];

        for (var i = 0; i < slotsArr.length; i++) {
            var slot = slotsArr[i];
            var dayOfTheWeek = slot[fieldNames.TimeSlot.DayOfWeek];
            dayOfTheWeek = DAYS[dayOfTheWeek];

            if (slot.OperatingHoursId !== this.id) continue;

            var currArr = this.slots[dayOfTheWeek];

            if (!currArr) {
                currArr = [];
                this.slots[dayOfTheWeek] = currArr;
            }

            currArr.push(new TimeSlotOptiViewer(slot));
        }
    };
})(window);