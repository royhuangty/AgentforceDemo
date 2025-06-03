"use strict";

function ServiceTerritory(sobject) {
    this.id = sobject.Id;
    this.name = sobject.Name;
    this.latitude = sobject[fieldNames.ServiceTerritory.Latitude];
    this.longitude = sobject[fieldNames.ServiceTerritory.Longitude];
    this.operatingHours = sobject[fieldNames.ServiceTerritory.OperatingHours];
    this.operatingHours__r = sobject[fieldNames.ServiceTerritory.OperatingHours__r];
    this.description = sobject[fieldNames.ServiceTerritory.Description];
    this.parentTerritory = sobject[fieldNames.ServiceTerritory.ParentTerritory__r] ? sobject[fieldNames.ServiceTerritory.ParentTerritory] : undefined;
    this.isActive = sobject[fieldNames.ServiceTerritory.IsActive];
    this.o2Enabled = __gantt.isO2EngineOn && (__gantt.isO2ForAllTerritoriesOn || sobject[fieldNames.ServiceTerritory.O2_Enabled__c]);

    // has lookup for parent? store it
    if (sobject[fieldNames.ServiceTerritory.ParentTerritory__r]) {
        this.parentTerritory = new ServiceTerritory(sobject[fieldNames.ServiceTerritory.ParentTerritory__r]);
    }
}