"use strict";

function ServiceTerritoryOptiViewer(sobject) {
    this.id = sobject.Id;
    this.name = sobject.Id;
    this.latitude = sobject[fieldNames.ServiceTerritory.Latitude];
    this.longitude = sobject[fieldNames.ServiceTerritory.Longitude];
    this.operatingHours = sobject[fieldNames.ServiceTerritory.OperatingHours];
    this.operatingHours__r = sobject[fieldNames.ServiceTerritory.OperatingHours__r];
    this.description = sobject[fieldNames.ServiceTerritory.Description];
    this.parentTerritory = sobject[fieldNames.ServiceTerritory.ParentTerritory__r] ? sobject[fieldNames.ServiceTerritory.ParentTerritory] : undefined;
    this.isActive = sobject[fieldNames.ServiceTerritory.IsActive];

    // has lookup for parent? store it
    if (sobject[fieldNames.ServiceTerritory.ParentTerritory__r]) {
        this.parentTerritory = new ServiceTerritoryOptiViewer(sobject[fieldNames.ServiceTerritory.ParentTerritory__r]);
    }
}