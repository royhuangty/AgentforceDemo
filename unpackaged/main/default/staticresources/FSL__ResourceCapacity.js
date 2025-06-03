'use strict';

function ResourceCapacity(sobject) {

    this.sfdcType = 'capacity';

    this.id = sobject.Id;
    this.end = sobject[fieldNames.ResourceCapacity.EndDate];
    this.resource = sobject[fieldNames.ResourceCapacity.ServiceResource];
    this.resourceId = sobject[fieldNames.ResourceCapacity.ServiceResource];
    this.resourceName = sobject[fieldNames.ResourceCapacity.ServiceResource__r] ? sobject[fieldNames.ResourceCapacity.ServiceResource__r].Name : null;
    this.start = sobject[fieldNames.ResourceCapacity.StartDate];
    this.hoursInUse = sobject[fieldNames.ResourceCapacity.HoursInUse__c];
    this.hoursPerTimePeriod = sobject[fieldNames.ResourceCapacity.CapacityInHours] !== undefined ? sobject[fieldNames.ResourceCapacity.CapacityInHours] : null;
    this.minutesUsed = sobject[fieldNames.ResourceCapacity.MinutesUsed__c];
    this.lastModifiedDate = sobject.LastModifiedDate || null;
    this.name = sobject.CapacityNumber;
    this.timePeriod = sobject[fieldNames.ResourceCapacity.TimePeriod];
    this.workItemsAllocated = sobject[fieldNames.ResourceCapacity.Work_Items_Allocated__c];
    this.workItemsPerTimePeriod = sobject[fieldNames.ResourceCapacity.CapacityInWorkItems] !== undefined ? sobject[fieldNames.ResourceCapacity.CapacityInWorkItems] : null;

    if (window.isOptimizationViewer) {
        this.resourceName = sobject[fieldNames.ResourceCapacity.ServiceResource];
    }

    this.setSchedulerProperties();
}

ResourceCapacity.prototype.setSchedulerProperties = function () {

    // get all offsets for date fields - add when creating new javascript date
    this.start_date = __setTimeZoneOffsetToDateField(this.start);
    this.end_date = __setTimeZoneOffsetToDateField(this.end);

    // let diffTime = Math.abs(this.end_date - this.start_date);  // The multi day range is not supported for now
    // let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    //
    // diffDays = diffDays > 1 ? diffDays : 1;

    switch (this.timePeriod) {
        case 'Day':
            // this.end_date = addDaysToDate(this.start_date, diffDays);  // The multi day range is not supported for now
            this.end_date = addDaysToDate(this.start_date, 1);
            break;
        case 'Week':
            this.end_date = addDaysToDate(this.start_date, 7);
            break;
        case 'Month':
            this.end_date = addDaysToDate(this.end_date, 1);

            //this.end_date = new Date(this.end_date.setMonth(this.start_date.getMonth() + 1));
            break;
    }
    //fix DST issue W-12965314
    if (this.end_date.getHours() !== 0) {
        if (this.end_date.getHours() > 20) {
            this.end_date = addDaysToDate(this.end_date, 1);
        }
        this.end_date.setHours(0);
    }
    // For O2 capacity resource and calculation trigger is disable
    if (this.minutesUsed === undefined && this.workItemsAllocated === undefined) {
        if (this.hoursPerTimePeriod > 0 && this.workItemsPerTimePeriod > 0) {
            this.text = '<b>' + customLabels.maximum_service_appointments_and_hours_allowed.replaceAll(this.workItemsPerTimePeriod, this.hoursPerTimePeriod) + '</b>';
        } else if (this.hoursPerTimePeriod === 0) {
            this.text = '<b>' + customLabels.maximum_service_appointments_allowed.replaceAll(this.workItemsPerTimePeriod) + '</b>';
        } else if (this.workItemsPerTimePeriod === 0) {
            this.text = '<b>' + customLabels.maximum_hours_allowed.replaceAll(this.hoursPerTimePeriod) + '</b>';
        }
    } else if (this.hoursPerTimePeriod > 0) {
        this.text = '<b>' + customLabels.booked.replaceAll(calcCapacityPercentage(this.hoursInUse, this.hoursPerTimePeriod) + '%') + '</b> (<b>' + customLabels.x_Hours_scheduled_out_of_y.replaceAll(this.hoursInUse, this.hoursPerTimePeriod) + '</b>)';
    } else if (this.workItemsPerTimePeriod > 0) {
        this.text = '<b>' + customLabels.booked.replaceAll(calcCapacityPercentage(this.workItemsAllocated, this.workItemsPerTimePeriod) + '%') + '</b> (<b>' + customLabels.NumServicesScheduled.replaceAll(this.workItemsAllocated, this.workItemsPerTimePeriod) + '</b>)';
    }
    // set type
    this.type = 'contractorcapacity';
};

ResourceCapacity.prototype.setGanttResource = function (timephasedObjects, generateResourceId) {

    var resourceTimePhases = timephasedObjects[this.resource],
        territories = [];

    for (var tpKey in resourceTimePhases) {
        var timephase = resourceTimePhases[tpKey];

        if (isIntersect(timephase.effectiveStartDate, timephase.effectiveEndDate, this.start_date, this.end_date) || !timephase.effectiveEndDate && timephase.effectiveStartDate < this.end_date) {

            territories.push(timephase.serviceTerritory);
        }
    }

    this.resourceId = generateResourceId(this.resource, territories);
};

ResourceCapacity.prototype.isScheduled = function () {

    return !!this.resource;
};

ResourceCapacity.prototype.getGanttResource = function () {
    return this.resourceId ? this.resourceId.substr(0, 18) : this.resourceId;
};

function addDaysToDate(date, days) {
    var msToAdd = 1000 * 60 * 60 * 24 * days;
    return new Date(date.getTime() + msToAdd);
}

function calcCapacityPercentage(nom, denom) {
    return parseFloat((nom / denom * 100).toFixed(2));
}