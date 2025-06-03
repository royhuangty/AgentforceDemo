'use strict';

function TerritoryOptimizationRequest(sobject) {
  this.id = sobject.Id;
  this.optimizationRequest = sobject[fieldNames.TerritoryOptimizationRequest.OptimizationRequest] || null;
  this.serviceTerritory = sobject[fieldNames.TerritoryOptimizationRequest.ServiceTerritory] || null;
  this.serviceTerritoryName = null;

  if (this.serviceTerritory) {
    this.serviceTerritoryName = sobject[fieldNames.TerritoryOptimizationRequest.ServiceTerritory.replace('__c', '__r')].Name || null;
  }
}