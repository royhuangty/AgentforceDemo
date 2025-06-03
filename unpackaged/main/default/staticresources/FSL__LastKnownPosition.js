"use strict";

function LastKnownPosition(sobject) {
    this.id = sobject.Id;
    this.latitude = sobject[fieldNames.ServiceResource.LastKnownLocation__Latitude__s];
    this.longitude = sobject[fieldNames.ServiceResource.LastKnownLocation__Longitude__s];
    this.lastModifiedDate = sobject[fieldNames.ServiceResource.LastKnownLocationUpdate__c];

    var tz = void 0;

    if (this.lastModifiedDate) tz = new Date(this.lastModifiedDate).getTimezoneOffset() * 60 * 1000;

    this.lastModifiedDate = this.lastModifiedDate ? new Date(this.lastModifiedDate + tz) : null;
}