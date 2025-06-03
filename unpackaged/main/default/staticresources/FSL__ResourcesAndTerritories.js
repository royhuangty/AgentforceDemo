"use strict";

function ResourcesAndTerritories(sobject) {
    this.id = sobject.Id;
    this.name = sobject.MemberNumber;
    this.effectiveEndDate = sobject[fieldNames.ServiceTerritoryMember.EffectiveEndDate] || null;
    this.effectiveStartDate = sobject[fieldNames.ServiceTerritoryMember.EffectiveStartDate];
    this.latitude = sobject[fieldNames.ServiceTerritoryMember.Latitude];
    this.longitude = sobject[fieldNames.ServiceTerritoryMember.Longitude];
    this.serviceResource = sobject[fieldNames.ServiceTerritoryMember.ServiceResource];
    this.serviceResource__r = sobject[fieldNames.ServiceTerritoryMember.ServiceResource__r];
    this.serviceTerritory = sobject[fieldNames.ServiceTerritoryMember.ServiceTerritory];
    this.serviceTerritory__r = sobject[fieldNames.ServiceTerritoryMember.ServiceTerritory__r];
    this.serviceTerritoryType = sobject[fieldNames.ServiceTerritoryMember.TerritoryType];
    this.operatingHours = sobject[fieldNames.ServiceTerritoryMember.OperatingHours];
    this.operatingHours__r = sobject[fieldNames.ServiceTerritoryMember.OperatingHours__r];

    this.effectiveStartDate = __setTimeZoneOffsetToDateField(this.effectiveStartDate, false, true);
    this.effectiveEndDate = __setTimeZoneOffsetToDateField(this.effectiveEndDate, false);

    this.timezone = sobject[fieldNames.ServiceTerritoryMember.ServiceTerritory__r][fieldNames.ServiceTerritory.OperatingHours__r][fieldNames.OperatingHours.Timezone];
}