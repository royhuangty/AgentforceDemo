'use strict';

function ResourcesAndTerritoriesOptiViewer(resource, stm, territoriesToTimezones) {
    this.id = stm.Id;
    this.name = stm.Id;
    this.effectiveEndDate = stm.EffectiveEndDate ? new Date(stm.EffectiveEndDate).getTime() : null;
    this.effectiveStartDate = stm.EffectiveStartDate ? new Date(stm.EffectiveStartDate).getTime() : null;
    this.latitude = stm.Latitude || null;
    this.longitude = stm.Longitude || null;
    this.serviceResource = resource.Id;
    this.serviceResource__r = {
        Id: resource.Id,
        Name: resource.Id,
        RelatedRecordId: resource.RelatedRecordId,
        ResourceType: resource.ResourceType
    };
    this.serviceTerritory = stm.ServiceTerritoryId;
    this.serviceTerritory__r = {
        Id: stm.ServiceTerritoryId,
        OperatingHoursId: stm.ServiceTerritory.OperatingHoursId,
        OperatingHours: {
            Id: stm.ServiceTerritory.OperatingHoursId,
            TimeZone: territoriesToTimezones[stm.ServiceTerritoryId] ? territoriesToTimezones[stm.ServiceTerritoryId].OperatingHours.TimeZone : null
        }
    };
    this.serviceTerritoryType = stm.TerritoryType;
    this.operatingHours = stm.OperatingHoursId || null;
    this.operatingHours__r = !stm.OperatingHoursId ? null : {
        Id: stm.OperatingHoursId,
        TimeZone: stm.OperatingHours.TimeZone
    };

    function changeDatesAccordingToTimezone(date, timezone) {
        var offset = useLocationTimezone ? -moment.tz.zone(timezone).utcOffset(utils.convertDtToMomentDt(new Date(date), timezone).valueOf()) : utils.getUserOffset(new Date(date));
        return date + offset * 60 * 1000; //+ utils.getUserOffset(new Date(date))*60*1000
    }

    this.timezone = territoriesToTimezones[stm.ServiceTerritoryId] ? territoriesToTimezones[stm.ServiceTerritoryId].OperatingHours.TimeZone : null;
    if (this.operatingHours__r) {
        if (this.operatingHours__r.TimeZone !== this.timezone) {
            console.warn('The Resource with STM - ' + this.id + ' has operating hours with different timezone!');
        }
    }

    this.effectiveStartDate = this.effectiveStartDate ? changeDatesAccordingToTimezone(this.effectiveStartDate, this.timezone) : null;
    this.effectiveEndDate = this.effectiveEndDate ? changeDatesAccordingToTimezone(this.effectiveEndDate, this.timezone) : null;

    this.effectiveStartDate = __setTimeZoneOffsetToDateField(this.effectiveStartDate, false, true);
    this.effectiveEndDate = __setTimeZoneOffsetToDateField(this.effectiveEndDate, false);

    //this one is in use in GanttServiceOptiViewer to determine if the Assigned Resource is a Contractor. 
    this.IsCapacityBased = resource.IsCapacityBased;
}