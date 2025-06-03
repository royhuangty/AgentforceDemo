'use strict';

function GanttService(sobject, copy) {

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

    this.id = sobject.Fields.Id || null;
    this.name = sobject.Fields.AppointmentNumber || null;
    this.AssignedResourceLastModifiedDate = sobject.AssignedResourceLastModifiedDate || null;
    this.ServiceAppointmentLastModifiedDate = sobject.ServiceAppointmentLastModifiedDate || null;
    this.accountName = sobject.Fields['Account.Name'] || null;
    this.accountId = sobject.Fields.AccountId || null;
    this.latitude = sobject.Fields.Latitude || null;
    this.longitude = sobject.Fields.Longitude || null;
    this.arrivalWindowEndTime = sobject.Fields.ArrivalWindowEndTime || null;
    this.arrivalWindowStartTime = sobject.Fields.ArrivalWindowStartTime || null;
    this.dueDate = sobject.Fields.DueDate || null;
    this.ganttDisplay = sobject.Fields.Gantt_Display_Date__c || null;
    //this.durationInMinutes                  = sobject.Fields.Duration || null;
    this.durationType = sobject.Fields.DurationType || null;
    this.earliestStartTime = sobject.Fields.EarliestStartTime || null;
    this.estDuration = sobject.Fields.Duration || null;
    this.travelTimeFrom = sobject.Fields.EstimatedTravelTimeFrom__c || null;
    this.travelTimeTo = sobject.Fields.EstimatedTravelTime || null;
    this.ganttLabel = sobject.Fields.GanttLabel__c || null;
    this.jeopardy = sobject.Fields.InJeopardy__c || null;
    this.jeopardyReason = sobject.Fields.jeopardyReasonTranslated || sobject.Fields.InJeopardyReason__c || null;
    this.parentRecord = sobject.Fields.ParentRecordId || null;
    this.parentRecordStatus = sobject.Fields.ParentRecordStatusCategory || null;
    this.parentRecordType = sobject.Fields.ParentRecordType || null;
    this.pinned = sobject.Fields.Pinned__c || false;
    this.isBundleMember = sobject.Fields.IsBundleMember || false;
    this.isBundle = sobject.Fields.IsBundle || false;
    this.RelatedBundle = sobject.Fields.RelatedBundleId || false;
    this.schedEndTime = sobject.Fields.SchedEndTime || null;
    this.schedStartTime = sobject.Fields.SchedStartTime || null;
    this.serviceTerritory = sobject.Fields.ServiceTerritory || null;
    this.serviceTerritoryName = sobject.Fields['ServiceTerritory.Name'] || null;
    this.status = sobject.Fields.Status || null;
    this.statusCategory = sobject.Fields.StatusCategory || null;
    this.subject = sobject.Fields.Subject || null;
    this.ganttColor = sobject.Fields.GanttColor__c || null;
    this.resource = sobject.Resource || null;
    this.resourceName = sobject.ResourceName || null;
    this.resourceContractor = sobject.ResourceContractor || null;
    this.isAssignToCrew = sobject.IsAssignToCrew || null;
    this.assignedResource = sobject.AssignedResource || null;
    this.violations = null;
    this.relatedTo = sobject.relatedTo || null;
    this.relatedFather = null;
    this.priority = this.minPriority;
    this.relatedFather = sobject.relatedFather;
    this.policyUsed = sobject.Fields.Scheduling_Policy_Used__c || null;
    this.scheduleMode = sobject.Fields.Schedule_Mode__c || null;
    this.emergency = sobject.Fields.Emergency__c || false;
    this.isServiceInChain = (usingNewMstModel || sobject.IsInO2Territory) && sobject.isServiceInChain;
    this.relatedService2 = sobject.relatedService2 || null;
    this.relatedService1 = sobject.relatedService1 || null;
    this.relationshipType = sobject.relationshipType || null;
    this.isImmidietlyFollow = sobject.relationshipType === "Immediately Follow";
    this.isInO2Territory = sobject.IsInO2Territory;
    this.ganttPaletteColor = null;
    this.Use_Async_Logic = sobject.Fields.Use_Async_Logic__c || false;
    this.icons = sobject.Fields.GanttIcon__c ? sobject.Fields.GanttIcon__c.split(';') : null;
    this.totalModifiedTimes = this.ServiceAppointmentLastModifiedDate;
    this.fromGetCandidateFlow = false;
    this.isOffsiteAppointment = sobject.Fields.IsOffsiteAppointment || false;

    if (this.AssignedResourceLastModifiedDate) {
        this.totalModifiedTimes += this.AssignedResourceLastModifiedDate;
    }

    if (this.icons) {
        this.icons = this.icons.map(function (icon) {
            return window.encodeURI(icon);
        });
    }

    var parentPriorityField = sobject.Fields.ParentRecordType == 'WorkOrder' ? CustomSettings.woPriorityField : CustomSettings.woliPriorityField;

    if (parentPriorityField && sobject.ParentFields && sobject.ParentFields[parentPriorityField]) this.priority = sobject.ParentFields[parentPriorityField];

    // MDT
    var realMdtBooleanField = fslNamespace ? mdtBooleanField.replace(fslNamespace + '__', '') : mdtBooleanField;
    this.isMDT = sobject.Fields[realMdtBooleanField] ? true : false;

    if (sobject.Fields.MDT_Operational_Time__c) {
        this.calculateMdtTimes(sobject.Fields.MDT_Operational_Time__c);
    } else if (this.isMDT) {
        this.mdtTimes = {
            travel: [],
            working: []
        };
    }

    // SET PARENT FIELDS
    this.parentFields = {};
    for (var key in sobject.ParentFields) {
        this.parentFields[key] = sobject.ParentFields[key];
    }

    // SET STUFF FOR GANTT (Scheduler + Timezones)
    this.setSchedulerProperties();

    // SET FIELD SET FIELDS
    addFieldSetToServiceObject(GanttService.prototype.allFieldSetsSet, sobject.Fields, this);

    // if mdt - don't show travel
    if (this.isMDT) {
        this.travelTimeFrom = 0;
        this.travelTimeTo = 0;
    }
}

GanttService.prototype.setSchedulerProperties = function () {

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

GanttService.prototype.setGanttResource = function (timephasedObjects, generateResourceId) {

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
        if (timephase.serviceTerritoryType === 'R' && (isDateIntersectRange(this.start_date, timephase.effectiveStartDate, timephase.effectiveEndDate) || !timephase.effectiveEndDate && timephase.effectiveStartDate < this.end_date)) {

            territories.push(timephase.serviceTerritory);
        }
    }

    // no relocation, must be primary
    if (territories.length === 0) {
        for (var _tpKey in resourceTimePhases) {

            var _timephase = resourceTimePhases[_tpKey];

            if (isDateIntersectRange(this.start_date, _timephase.effectiveStartDate, _timephase.effectiveEndDate)) {
                territories.push(_timephase.serviceTerritory);
            }
        }
    } else {
        //there is a relocation but also some secondaries - need to draw service on S rows as well
        if (showSecondarySTMs) {
            for (var _tpKey2 in resourceTimePhases) {

                var _timephase2 = resourceTimePhases[_tpKey2];

                if (_timephase2.serviceTerritoryType === 'S' && isDateIntersectRange(this.start_date, _timephase2.effectiveStartDate, _timephase2.effectiveEndDate)) {

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
GanttService.prototype.updateDatesBasedOnTravel = function () {

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

GanttService.prototype.isScheduled = function () {
    return this.resource && this.schedEndTime && this.schedStartTime;
};

GanttService.prototype.getGanttResource = function (checkResourceArray) {

    if (checkResourceArray) getGanttResourceWithSecondaryStms(this);

    return this.resourceId ? this.resourceId.substr(0, 18) : this.resourceId;
};

GanttService.prototype.getGanttTerritory = function () {
    return this.resourceId ? this.resourceId.substr(19, 37) : this.resourceId;
};

GanttService.prototype.isChanged = function (ganttService) {
    return this.AssignedResourceLastModifiedDate != ganttService.AssignedResourceLastModifiedDate || this.ServiceAppointmentLastModifiedDate != ganttService.ServiceAppointmentLastModifiedDate;
};

GanttService.prototype.isGotNewSTM = function (ganttService) {
    return this.resourceId === "" && ganttService.resource;
};

GanttService.prototype.isChainChanged = function (ganttService) {
    return this.isServiceInChain != ganttService.isServiceInChain || this.relatedService1 != ganttService.relatedService1 || this.relatedService2 != ganttService.relatedService2;
};

GanttService.prototype.minPriority = 1000000;

function isDateIntersectRange(inputDate, rangeStart, rangeEnd) {
    return rangeStart <= inputDate && inputDate < rangeEnd;
}

function getGanttResourceWithSecondaryStms(ganttService) {

    // when dragging duplicated service/absence on gantt- find the correct resource territory member (resourceId)
    if (showSecondarySTMs) {
        var resourceTerrArray = ganttService.resourceId.split(',');
        if (ganttService.resourceBeforeDrag && ganttService.resourceBeforeDrag != ganttService.resourceId && resourceTerrArray.length > 1) {
            for (var i = 0; i < resourceTerrArray.length; i++) {
                if (ganttService.resourceBeforeDrag.split(',')[i] != resourceTerrArray[i]) {
                    ganttService.resourceId = resourceTerrArray[i];
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

                    if (val === null) {
                        continue;
                    }

                    val = __setTimeZoneOffsetToDateField(val);

                    // for gantt filters date shifts
                    destService.fields[fieldsList[key].APIName] = val.getTime();
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

GanttService.copy = function (obj) {

    var gs = new GanttService(null, true);

    angular.merge(gs, obj);

    return gs;
};

GanttService.prototype.calculateMdtTimes = function (mdtTimesJson) {

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

GanttService.prototype.hideTravelForResize = function () {

    this.backupDatesForResize = {
        start_date: this.start_date,
        end_date: this.end_date,
        travelFrom: this.travelFrom,
        travelTo: this.travelTo
    };

    this.start_date = this.start;
    this.end_date = this.finish;
    this.travelFrom = 0;
    this.travelTo = 0;
};

GanttService.prototype.restoreTravelForResize = function () {

    this.start_date = this.backupDatesForResize.start_date;
    this.end_date = this.backupDatesForResize.end_date;
    this.travelFrom = this.backupDatesForResize.travelFrom;
    this.travelTo = this.backupDatesForResize.travelTo;
};

GanttService.prototype.wasSchedulingChanged = function (ganttService) {

    // check if AssignedResource was changed (any change on the record)
    if (this.AssignedResourceLastModifiedDate != ganttService.AssignedResourceLastModifiedDate) {
        return true;
    }

    // check if schedule start was changed (note: we are comparing to the raw service, hence the "Fields.SchedStartTime")
    if (this.schedStartTime != ganttService.Fields.SchedStartTime) {
        return true;
    }

    // check if schedule end was changed (note: we are comparing to the raw service, hence the "Fields.SchedEndTime")
    if (this.schedEndTime != ganttService.Fields.SchedEndTime) {
        return true;
    }

    // check if service in no longer part of a chain
    if (this.isServiceInChain !== ganttService.isServiceInChain) {
        return true;
    }

    return false;
};