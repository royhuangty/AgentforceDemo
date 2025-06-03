'use strict';

function OptimizationRequest(sobject) {
    this.id = sobject.Id;
    this.lastModifiedDate = sobject.LastModifiedDate;

    if (this.lastModifiedDate) {
        var lastModifiedDateTz = new Date(this.lastModifiedDate).getTimezoneOffset() * 60 * 1000;
        this.lastModifiedDate = new Date(this.lastModifiedDate.valueOf() + lastModifiedDateTz);
    }

    this.name = sobject.Name;
    this.scheduledAmount = sobject[fieldNames.Optimization_Request.Objects_Scheduled__c];
    this.objectToScheduled = sobject[fieldNames.Optimization_Request.Objects_To_Schedule__c];
    this.status = sobject[fieldNames.Optimization_Request.Status__c] || null;
    this.statusLabel = sobject.statusLabel || sobject[fieldNames.Optimization_Request.Status__c] || null;
    this.allTasks = sobject[fieldNames.Optimization_Request.All_Tasks_Mode__c] || null;
    this.includeEmptyLocations = sobject[fieldNames.Optimization_Request.Include_Services_With_Empty_Location__c] || null;
    this.type = sobject[fieldNames.Optimization_Request.Type__c] || null;
    this.failureReason = sobject[fieldNames.Optimization_Request.Failure_Reason__c] || null;
    this.failureDetails = sobject[fieldNames.Optimization_Request.Failure_Details__c] || null;
    this.optimizationData = sobject[fieldNames.Optimization_Request.Optimization_Data__c] || null;
    this.orgResourceAbsence = sobject[fieldNames.Optimization_Request.Originating_Resource_Absence__c] || null;
    this.orgServiceAppointment = sobject[fieldNames.Optimization_Request.Originating_Service_Appointment__c] || null;
    this.policy = sobject[fieldNames.Optimization_Request.Scheduling_Policy__c] || null;
    this.serviceAppointment = sobject[fieldNames.Optimization_Request.Service_Appointment__c] || null;
    this.resource = sobject[fieldNames.Optimization_Request.Service_Resource__c] || null;
    this.result = sobject[fieldNames.Optimization_Request.Result__c] || null;
    this.schedulingRecipe = sobject[fieldNames.Optimization_Request.Scheduling_Recipe__r] || null;
    this.territories = [];
    this.resourceName = null;

    if (this.resource) {
        this.resourceName = sobject[fieldNames.Optimization_Request.Service_Resource__c.replace('__c', '__r')].Name;
    }

    this.requestProgressStart = sobject[fieldNames.Optimization_Request.Request_Progress_Start__c] || null;

    if (sobject[territoryOptimizationRequestRelationshipName]) {
        for (var i = 0; i < sobject[territoryOptimizationRequestRelationshipName].length; i++) {
            this.territories.push(new TerritoryOptimizationRequest(sobject[territoryOptimizationRequestRelationshipName][i]));
        }
    }

    this.timespan = null;

    this.finish = sobject[fieldNames.Optimization_Request.Finish__c] || null;
    this.start = sobject[fieldNames.Optimization_Request.Start__c] || null;

    // if (this.start) {
    //     let startTz = new Date(this.start).getTimezoneOffset() * 60 * 1000;
    //     this.start = new Date(this.start.valueOf() + startTz);
    // }

    // if (this.finish) {
    //     let finishTz = new Date(this.finish).getTimezoneOffset() * 60 * 1000;
    //     this.finish = new Date(this.finish.valueOf() + finishTz);
    // }

    this.start = __setTimeZoneOffsetToDateField(this.start);
    this.finish = __setTimeZoneOffsetToDateField(this.finish);
}