"use strict";

function ServiceCrewMember(sobject) {
    this.id = sobject.Id;
    this.name = window.isOptimizationViewer ? sobject.Id : sobject.Name;
    this.endDate = sobject[fieldNames.ServiceCrewMember.EndDate] || null;
    this.startDate = sobject[fieldNames.ServiceCrewMember.StartDate];
    this.serviceResource = sobject[fieldNames.ServiceCrewMember.ServiceResource];
    this.serviceResource__r = sobject[fieldNames.ServiceCrewMember.ServiceResource__r];
    this.serviceCrew = sobject[fieldNames.ServiceCrewMember.ServiceCrew];
    this.serviceCrew__r = window.isOptimizationViewer ? { Name: this.serviceCrew, Id: this.serviceCrew } : sobject[fieldNames.ServiceCrewMember.ServiceCrew__r];
    this.leader = sobject[fieldNames.ServiceCrewMember.Leader];
    this.ganttLabel = sobject[fieldNames.ServiceCrewMember.GanttLabel];

    this.ganttColor = sobject.ServiceCrew ? sobject.ServiceCrew[fieldNames.ServiceCrew.GanttColor__c] : null;

    this.startDate = __setTimeZoneOffsetToDateField(this.startDate, false, true);
    this.endDate = __setTimeZoneOffsetToDateField(this.endDate, false);
}

ServiceCrewMember.prototype.calculateTimeZone = function (timezone) {
    var offset = getTimezoneOffset(timezone);
    this.tzStartDate = addTimezoneOffsetToDate(this.startDate, offset);
    this.tzEndDate = addTimezoneOffsetToDate(this.endDate, offset);
};

function getTimezoneOffset(timezone) {
    var date = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 1000 * 60).getTime();
    var offset = new Date(new Date().toLocaleString("en", { timeZone: timezone })).getTime();
    return -(date - offset) + 1000;
}

function addTimezoneOffsetToDate(date, offset) {
    var adjustedDate = new Date(date.getTime() + offset);
    return adjustedDate;
}