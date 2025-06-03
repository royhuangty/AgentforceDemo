'use strict';

function GanttServiceOptiViewer(sobject, copy) {

    // used to copying
    if (copy) {
        return;
    }

    // SET TYPE
    this.sfdcType = 'service';

    // STUFF THAT ARE RETRIVED FROM SALESFORCED
    //this.fields                             = Object.assign({}, sobject.Fields);
    this.fields = {};
    for (var k in sobject.Fields) {
        this.fields[k] = sobject.Fields[k];
    }

    if (_.isEmpty(serviceStatusCategories)) {
        for (var key in serviceStatuses) {}
    }
    if (_.isEmpty(optiViewerStatusCategories)) for (var _key in serviceStatuses) {
        var Category = _key;
        switch (_key) {
            case 'COULD_NOT_COMPLETE':
                Category = 'CannotComplete';
                break;
            case 'IN_PROGRESS':
                Category = 'InProgress';
                break;
            case 'SCHEDULED':
                Category = 'Scheduled';
                break;
            case 'NONE':
                Category = 'None';
                break;
            case 'DISPATCHED':
                Category = 'Dispatched';
                break;
            case 'COMPLETED':
                Category = 'Completed';
                break;
            case 'CANCELED':
                Category = 'Canceled';
                break;
        }
        optiViewerStatusCategories[serviceStatuses[_key]] = Category;
    }

    this.id = sobject.Id || null;
    this.name = sobject.AppointmentNumber || sobject.Id || null;
    this.AssignedResourceLastModifiedDate = sobject.AssignedResourceLastModifiedDate || null;
    this.ServiceAppointmentLastModifiedDate = sobject.ServiceAppointmentLastModifiedDate || null;
    this.accountName = sobject['Account.Name'] || null;
    this.accountId = sobject.AccountId || null;
    this.latitude = sobject.Latitude || null;
    this.longitude = sobject.Longitude || null;
    this.arrivalWindowEndTime = sobject.ArrivalWindowEndTime || null;
    this.arrivalWindowStartTime = sobject.ArrivalWindowStartTime || null;
    this.dueDate = sobject.DueDate || null;
    this.ganttDisplay = sobject.Gantt_Display_Date__c || null;
    //this.durationInMinutes                  = sobject.Duration || null;
    this.durationType = sobject.DurationType || null;
    this.earliestStartTime = sobject.EarliestStartTime || null;
    this.estDuration = sobject.Duration || null;
    this.travelTimeFrom = sobject.ServiceResources ? sobject.ServiceResources.records[0].EstimatedTravelTimeFrom__c || sobject.ServiceResources.records[0].FSL__EstimatedTravelTimeFrom__c : null;
    this.travelTimeTo = sobject.ServiceResources ? sobject.ServiceResources.records[0].EstimatedTravelTime : null;
    this.ganttLabel = sobject.GanttLabel__c || null;
    this.jeopardy = sobject.InJeopardy__c || null;
    this.jeopardyReason = sobject.jeopardyReasonTranslated || sobject.InJeopardyReason__c || null;
    this.parentRecord = sobject.ParentRecordId || null;
    this.parentRecordStatus = sobject.ParentRecordStatusCategory || null;
    this.parentRecordType = sobject.ParentRecordType || null;
    this.pinned = sobject.Pinned__c || false;
    this.isBundleMember = sobject.IsBundleMember || false;
    this.isBundle = sobject.IsBundle || false;
    this.RelatedBundle = sobject.RelatedBundleId || false;
    this.schedEndTime = sobject.SchedEndTime || null;
    this.schedStartTime = sobject.SchedStartTime || null;
    this.serviceTerritory = sobject.ServiceTerritory || null;
    this.serviceTerritoryName = sobject['ServiceTerritory.Name'] || null;
    this.status = sobject.Status || null;
    this.statusCategory = sobject.StatusCategory || window.optiViewerStatusCategories[sobject.Status] || null;
    this.subject = sobject.Subject || null;
    this.ganttColor = sobject.GanttColor__c || null;
    this.resource = sobject.ServiceResources ? sobject.ServiceResources.records[0].ServiceResourceId : null;
    this.resourceName = sobject.ServiceResources ? sobject.ServiceResources.records[0].ServiceResourceId : null;
    this.resourceContractor = sobject.ResourceContractor || null;
    this.isAssignToCrew = sobject.IsAssignToCrew || null;
    this.assignedResource = sobject.ServiceResources ? sobject.ServiceResources.records[0].Id : null;
    this.violations = null;
    this.relatedTo = sobject.relatedTo || null;
    this.relatedFather = null;
    this.priority = this.minPriority;
    this.relatedFather = sobject.relatedFather;
    this.policyUsed = sobject.Scheduling_Policy_Used__c || null;
    this.scheduleMode = sobject.Schedule_Mode__c || null;
    this.emergency = sobject.Emergency__c || false;
    this.isServiceInChain = (usingNewMstModel || sobject.IsInO2Territory) && sobject.isServiceInChain;
    this.relatedService2 = sobject.relatedService2 || null;
    this.relatedService1 = sobject.relatedService1 || null;
    this.relationshipType = sobject.relationshipType || null;
    this.isImmidietlyFollow = sobject.relationshipType === "Immediately Follow";
    this.ganttPaletteColor = null;
    this.Use_Async_Logic = sobject.Use_Async_Logic__c || false;
    this.icons = sobject.GanttIcon__c ? sobject.GanttIcon__c.split(';') : null;
    this.totalModifiedTimes = this.ServiceAppointmentLastModifiedDate;
    this.fromGetCandidateFlow = false;

    if (this.AssignedResourceLastModifiedDate) {
        this.totalModifiedTimes += this.AssignedResourceLastModifiedDate;
    }

    if (this.icons) {
        this.icons = this.icons.map(function (icon) {
            return window.encodeURI(icon);
        });
    }

    var parentPriorityField = sobject.ParentRecordType == 'WorkOrder' ? CustomSettings.woPriorityField : CustomSettings.woliPriorityField;

    if (parentPriorityField && sobject.ParentFields && sobject.ParentFields[parentPriorityField]) this.priority = sobject.ParentFields[parentPriorityField];

    // MDT
    var realMdtBooleanField = fslNamespace ? mdtBooleanField.replace(fslNamespace + '__', '') : mdtBooleanField;
    this.isMDT = sobject[realMdtBooleanField] ? true : false;

    if (sobject.MDT_Operational_Time__c) {
        this.calculateMdtTimes(sobject.MDT_Operational_Time__c);
    } else if (this.isMDT) {
        this.mdtTimes = {
            travel: [],
            working: []
        };
    }

    // SET PARENT FIELDS
    this.parentFields = {};
    for (var _key2 in sobject.ParentFields) {
        this.parentFields[_key2] = sobject.ParentFields[_key2];
    }

    // SET STUFF FOR GANTT (Scheduler + Timezones)
    this.setSchedulerProperties();

    // SET FIELD SET FIELDS
    addFieldSetToServiceObject(GanttServiceOptiViewer.prototype.allFieldSetsSet, sobject, this);

    // if mdt - don't show travel
    if (this.isMDT) {
        this.travelTimeFrom = 0;
        this.travelTimeTo = 0;
    }
}

GanttServiceOptiViewer.prototype.setSchedulerProperties = function () {

    //let tz_schdStart, tz_schdFinish, tz_actualStart, tz_actualFinish, tz_early, tz_due, tz_app_start, tz_app_finish, tz_gantt_display_date;

    //dictionary for field name to scheduler name
    var timefields = { 'schedStartTime': 'start',
        'schedEndTime': 'finish',
        'dueDate': 'dueDate',
        'earliestStartTime': 'earlyStart',
        'arrivalWindowStartTime': 'appStart',
        'arrivalWindowEndTime': 'appEnd',
        'actualStartTime': 'actualStartTime',
        'actualEndTime': 'actualEndTime',
        'ganttDisplay': 'ganttDisplay'
    };

    // get all offsets for date fields - add when creating new javascript date
    // properties related to Dates and Times
    for (var fieldKey in timefields) {
        this[timefields[fieldKey]] = __setTimeZoneOffsetToDateField(this[fieldKey]);
    }

    // custom properties that needs parsing of some sort
    this.type = 'service';
    this.travelTo = this.travelTimeTo ? parseInt(this.travelTimeTo) * 60 : 0;
    this.travelFrom = this.travelTimeFrom ? parseInt(this.travelTimeFrom) * 60 : 0;
    //this.durationInMinutes  = this.durationInMinutes ? parseFloat(this.durationInMinutes) : null;
    this.estDuration = this.estDuration ? parseFloat(this.estDuration) : null;
    this.text = this.ganttLabel ? this.ganttLabel.encodeHTML() : this.name;
};

GanttServiceOptiViewer.prototype.setSchedulerPropertiesAfterOutputJson = function (updateType) {

    //let tz_schdStart, tz_schdFinish, tz_actualStart, tz_actualFinish, tz_early, tz_due, tz_app_start, tz_app_finish, tz_gantt_display_date;
    if (updateType === 'service') {
        //dictionary for field name to scheduler name
        var timefields = { 'schedStartTime': 'start',
            'schedEndTime': 'finish'
        };
        // get all offsets for date fields - add when creating new javascript date
        // properties related to Dates and Times
        for (var fieldKey in timefields) {
            this[timefields[fieldKey]] = __setTimeZoneOffsetToDateField(this[fieldKey]);
        }
    } else if (updateType === 'assignedResource') {
        // custom properties that needs parsing of some sort
        this.travelTo = this.travelTimeTo ? parseInt(this.travelTimeTo) * 60 : 0;
        this.travelFrom = this.travelTimeFrom ? parseInt(this.travelTimeFrom) * 60 : 0;
    }
};

GanttServiceOptiViewer.prototype.setGanttResource = function (timephasedObjects, generateResourceId) {

    // not scheduled
    if (!this.isScheduled()) {
        return;
    }

    var resourceTimePhases = timephasedObjects[this.resource],
        territories = [];

    this.resourceId = null;

    this.start_date = __setTimeZoneOffsetToDateField(this.schedStartTime);
    this.end_date = __setTimeZoneOffsetToDateField(this.schedEndTime);

    // go over all time phases of the specific resource
    for (var tpKey in resourceTimePhases) {

        var timephase = resourceTimePhases[tpKey];

        // if relocation, this will be our drawing place
        if (timephase.serviceTerritoryType === 'R' && (isIntersectIncludeLimits(timephase.effectiveStartDate, timephase.effectiveEndDate, this.start_date, this.end_date) || !timephase.effectiveEndDate && timephase.effectiveStartDate < this.end_date)) {

            territories.push(timephase.serviceTerritory);
        }
    }

    // no relocation, must be primary
    if (territories.length === 0) {
        for (var _tpKey in resourceTimePhases) {

            var _timephase = resourceTimePhases[_tpKey];

            if (isIntersectIncludeLimits(_timephase.effectiveStartDate, _timephase.effectiveEndDate, this.start_date, this.start_date)) {
                territories.push(_timephase.serviceTerritory);
            }
        }
    } else {
        //there is a relocation but also some secondaries - need to draw service on S rows as well
        if (showSecondarySTMs) {
            for (var _tpKey2 in resourceTimePhases) {

                var _timephase2 = resourceTimePhases[_tpKey2];

                if (_timephase2.serviceTerritoryType === 'S' && isIntersectIncludeLimits(_timephase2.effectiveStartDate, _timephase2.effectiveEndDate, this.start_date, this.end_date)) {

                    territories.push(_timephase2.serviceTerritory);
                }
            }
        }
    }

    this.resourceId = generateResourceId(this.resource, territories);

    if (this.isScheduled()) {
        this.updateDatesBasedOnTravel();
    }
};

// updates dates if we have travel
GanttServiceOptiViewer.prototype.updateDatesBasedOnTravel = function () {

    if (this.resourceId) {
        if (this.travelFrom) {
            if (this.travelFrom <= maxTravelTimeInSeconds) {
                this.end_date.setMinutes(this.end_date.getMinutes() + Math.floor(this.travelFrom / 60));
            } else {
                //this.end_date.setMinutes(this.end_date.getMinutes() + 60);
                this.hiddenTravelFrom = {
                    hiddenMinutes: this.end_date.getMinutes() + Math.floor(this.travelFrom / 60),
                    hiddenTravel: this.travelFrom
                };
                this.travelFrom = maxTravelTimeInSeconds;
                this.end_date.setMinutes(this.end_date.getMinutes() + Math.floor(this.travelFrom / 60));
            }
        }

        if (this.travelTo) {
            if (this.travelTo <= maxTravelTimeInSeconds) {
                this.start_date.setMinutes(this.start_date.getMinutes() - Math.floor(this.travelTo / 60));
            } else {
                //this.start_date.setMinutes(this.start_date.getMinutes() - 60);
                this.hiddenTravelTo = {
                    hiddenMinutes: this.start_date.getMinutes() - Math.floor(this.travelTo / 60),
                    hiddenTravel: this.travelTo
                };
                this.travelTo = maxTravelTimeInSeconds;
                this.start_date.setMinutes(this.start_date.getMinutes() - Math.floor(this.travelTo / 60));
            }
        }
    }
};

GanttServiceOptiViewer.prototype.isScheduled = function () {
    return this.resource && this.schedEndTime && this.schedStartTime;
};

GanttServiceOptiViewer.prototype.getGanttResource = function (checkResourceArray) {

    if (checkResourceArray) getGanttResourceWithSecondaryStms(this);

    return this.resourceId ? this.resourceId.substr(0, 18) : this.resourceId;
};

GanttServiceOptiViewer.prototype.getGanttTerritory = function () {
    return this.resourceId ? this.resourceId.substr(19, 37) : this.resourceId;
};

GanttServiceOptiViewer.prototype.isChanged = function (GanttServiceOptiViewer) {
    return this.AssignedResourceLastModifiedDate != GanttServiceOptiViewer.AssignedResourceLastModifiedDate || this.ServiceAppointmentLastModifiedDate != GanttServiceOptiViewer.ServiceAppointmentLastModifiedDate;
};

GanttServiceOptiViewer.prototype.isGotNewSTM = function (GanttServiceOptiViewer) {
    return this.resourceId === "" && GanttServiceOptiViewer.resource;
};

GanttServiceOptiViewer.prototype.isChainChanged = function (GanttServiceOptiViewer) {
    return this.isServiceInChain != GanttServiceOptiViewer.isServiceInChain || this.relatedService1 != GanttServiceOptiViewer.relatedService1 || this.relatedService2 != GanttServiceOptiViewer.relatedService2;
};

GanttServiceOptiViewer.prototype.minPriority = 1000000;

function getGanttResourceWithSecondaryStms(GanttServiceOptiViewer) {

    // when dragging duplicated service/absence on gantt- find the correct resource territory member (resourceId)
    if (showSecondarySTMs) {
        var resourceTerrArray = GanttServiceOptiViewer.resourceId.split(',');
        if (GanttServiceOptiViewer.resourceBeforeDrag && GanttServiceOptiViewer.resourceBeforeDrag != GanttServiceOptiViewer.resourceId && resourceTerrArray.length > 1) {
            for (var i = 0; i < resourceTerrArray.length; i++) {
                if (GanttServiceOptiViewer.resourceBeforeDrag.split(',')[i] != resourceTerrArray[i]) {
                    GanttServiceOptiViewer.resourceId = resourceTerrArray[i];
                    break;
                }
            }
        }
    }
}

function addFieldSetToServiceObject(fieldsList, sourceService, destService) {
    for (var key in fieldsList) {
        var val = null;

        /* if (fieldsList[i].SOQLString.indexOf('.') != -1) {
             var splited = fieldsList[i].SOQLString.split('.');
              var innerObj = sourceService[splited[0]];
             if (innerObj) {
                 val = innerObj[splited[1]];
                  var idPropName = fieldsList[i].APIName.replace('__r', '__c');
                  destService[idPropName] = sourceService[idPropName];
             }
         }
         else {*/
        val = sourceService[fieldsList[key].APIName];
        //}

        if (val || val == false) {
            switch (fieldsList[key].Type) {
                case 'DATE':
                case 'DATETIME':
                    val = __setTimeZoneOffsetToDateField(val);

                    // for gantt filters date shifts
                    destService[fieldsList[key].APIName] = val.getTime();
                    break;
                case 'REFERENCE':
                    var idPropName = fieldsList[key].JsAPIName.replace('__r', '__c');
                    destService[idPropName] = sourceService[idPropName];
                    break;
            }

            destService[fieldsList[key].APIName] = val;
        }
    }
}

GanttServiceOptiViewer.copy = function (obj) {

    var gs = new GanttServiceOptiViewer(null, true);

    angular.merge(gs, obj);

    return gs;
};

GanttServiceOptiViewer.prototype.calculateMdtTimes = function (mdtTimesJson) {

    try {
        this.mdtTimes = JSON.parse(mdtTimesJson);

        var localOffsetMs = new Date().getTimezoneOffset() * 1000 * 60,
            mdtObject = {
            travel: [],
            working: []
        };

        this.mdtTimes.forEach(function (times) {
            var Start = moment.tz(times.Start, userTimeZone),
                Finish = moment.tz(times.Finish, userTimeZone);

            // OLD MOMENT
            // Start = new Date(Start.valueOf() - Start._offset * 60 * 1000 + localOffsetMs);
            // Finish = new Date(Finish.valueOf() - Finish._offset * 60 * 1000 + localOffsetMs);

            Start = new Date(Start.valueOf() + Start._offset * 60 * 1000 + localOffsetMs);
            Finish = new Date(Finish.valueOf() + Finish._offset * 60 * 1000 + localOffsetMs);

            times.Start = Start;
            times.Finish = Finish;

            if (times.Type === 'OperationalSlot') {
                mdtObject.working.push(times);
            } else if (times.Type === 'Travel') {
                mdtObject.travel.push(times);
            }
        });

        this.mdtTimes = mdtObject;
    } catch (e) {
        this.mdtTimes = {
            travel: [],
            working: []
        };
    }
};