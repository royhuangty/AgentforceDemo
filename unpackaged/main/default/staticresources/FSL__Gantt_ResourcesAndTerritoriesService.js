'use strict';

/*

    ResourceService
    The resource service keeps all stuff related to the resources and territories

 */

(function () {

    ResourcesAndTerritoriesService.$inject = ['$q', 'sfdcService', 'PushServices'];

    angular.module('serviceExpert').factory('ResourcesAndTerritoriesService', ResourcesAndTerritoriesService);

    function ResourcesAndTerritoriesService($q, sfdcService, PushServices) {

        // hold promises
        var deferredObjects = {
            territories: $q.defer(),
            resources: $q.defer(),
            operatingHours: $q.defer()
        },


        // active territories map
        _territories = {},


        // all territories
        allTerritories = {},


        // only without sharing territories
        withoutSharingTerritoriesIds = [],


        // resource map
        resources = {},


        // contractorResources array of Ids
        _contractorResources = [],


        // operating hours map
        operatingHours = {},


        // crew resources array of Ids
        _crewResources = {},
            _skillsList = {},
            _crewToResources = {};

        function getResourcesSkills() {
            return _skillsList;
        }

        function getResources() {
            return resources;
        }

        function getOperatingHours() {
            return operatingHours;
        }

        function getCapacityBasedResources() {
            return _contractorResources;
        }

        function getCrewResources() {
            return _crewResources;
        }

        function getCrewToResources() {
            return _crewToResources;
        }

        function getResourceAndTerritoriesFromJson(data) {
            var resetFunction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;


            var gotResourcesDeferred = $q.defer();

            scheduler.clearAll();
            //reset current territories and resources
            _territories = {};
            allTerritories = {};
            withoutSharingTerritoriesIds = [];
            resources = {};
            _contractorResources = [];
            operatingHours = {};
            _crewResources = {};
            _crewToResources = {};
            _skillsList = {};

            if (resetFunction) {
                resetFunction();
            }

            gotResourcesDeferred.resolve();

            var operatingHoursFromJsons = [];
            // get ALL territories
            data.Territories.forEach(function (territory) {
                _territories[territory.Id] = new ServiceTerritoryOptiViewer(territory);
                allTerritories[territory.Id] = new ServiceTerritoryOptiViewer(territory);
                operatingHoursFromJsons.push(territory.OperatingHours);
            });

            // get resources of loaded territories
            data.Resources.forEach(function (resource) {
                resources[resource.Id] = new ServiceResourceOptiViewer(resource);

                resource.ServiceTerritories.records.forEach(function (stm) {
                    if (stm.OperatingHours) operatingHoursFromJsons.push(stm.OperatingHours);
                });

                if (resources[resource.Id].isCapacityBased) _contractorResources.push(resource.Id);

                if (resources[resource.Id].serviceCrew) {
                    _crewResources[resource.Id] = resource;
                    _crewToResources[resources[resource.Id].serviceCrew] = resource;
                }
            });

            // get operating hours and timeslots of resources in loaded territories
            operatingHoursFromJsons.forEach(function (oph) {
                operatingHours[oph.Id] = new OperatingHoursOptiViewer(oph, data.CalendarDays);
            });

            deferredObjects.territories.resolve(_territories);
            deferredObjects.resources.resolve(resources);
            deferredObjects.operatingHours.resolve(operatingHours);

            return gotResourcesDeferred.promise;
        }

        function setSkillListFromServiceResourceSkills(resourceSkills, skillList) {
            resourceSkills.forEach(function (skill) {
                skillList[skill.SkillId] = Object.assign({}, skill.Skill);
            });
            return skillList;
        }

        // factory init - getting resources and territories
        function getResourceAndTerritories() {
            var resetFunction = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;


            var gotResourcesDeferred = $q.defer();

            sfdcService.GetResourcesAndTerritories().then(function (resourcesAndTerrtories) {

                if (resetFunction) {
                    resetFunction();
                }

                gotResourcesDeferred.resolve();

                var withoutSharingTerritoriesByIds = resourcesAndTerrtories.withoutSharingTerritories.reduce(function (obj, item) {
                    obj[item.Id] = item;
                    return obj;
                }, {});

                // get ALL territories
                resourcesAndTerrtories.territories.forEach(function (territory) {
                    if (territory.IsActive) {
                        _territories[territory.Id] = new ServiceTerritory(territory);

                        //get only without sharing territory ids (CFSL-1120)
                        _territories[territory.Id]['hasSharing'] = withoutSharingTerritoriesByIds[territory.Id] ? false : true;
                    }

                    allTerritories[territory.Id] = new ServiceTerritory(territory);
                });

                var resourceMapIdsWithSkills = {};
                resourcesAndTerrtories.resourcesWithSkills.forEach(function (resourceSkills) {
                    if (resourceSkills.ServiceResourceSkills && resourceSkills.ServiceResourceSkills.length > 0) {
                        resourceMapIdsWithSkills[resourceSkills.Id] = resourceSkills.ServiceResourceSkills;
                        //create skill list UI
                        _skillsList = setSkillListFromServiceResourceSkills(resourceSkills.ServiceResourceSkills, _skillsList);
                    }
                });

                // get resources of loaded territories
                resourcesAndTerrtories.resources.forEach(function (resource) {

                    if (resource.ServiceResourceSkills) {
                        _skillsList = setSkillListFromServiceResourceSkills(resource.ServiceResourceSkills, _skillsList);

                        if (resourceMapIdsWithSkills[resource.Id]) {
                            resource.ServiceResourceSkills = resource.ServiceResourceSkills.concat(resourceMapIdsWithSkills[resource.Id]);
                        }
                    }
                    resources[resource.Id] = new ServiceResource(resource);

                    if (resources[resource.Id].isCapacityBased) _contractorResources.push(resource.Id);

                    if (resources[resource.Id].serviceCrew) {
                        _crewResources[resource.Id] = resource;
                        _crewToResources[resources[resource.Id].serviceCrew] = resource;
                    }
                });

                // get operating hours and timeslots of resources in loaded territories
                resourcesAndTerrtories.operatingHours.forEach(function (oph) {
                    operatingHours[oph.Id] = new OperatingHours(oph);
                });

                // iterate over all territories and throw error if there is no access to their OH 
                for (var territory in _territories) {
                    var ohId = _territories[territory].operatingHours;
                    // no access to operating hours instance
                    if (!operatingHours[ohId]) {
                        var error = {};
                        error.type = 'operatingHours';
                        error.message = ohId;
                        throw error;
                    }
                }

                // use push service if at least one territory selected and push service setting enabled
                if (bootstrap.loadedUserSettings.locations.length && window.__gantt.pushService.pushServiceSettingEnabled) {
                    // push service
                    turnOnOrUpdatePushService();
                }

                deferredObjects.territories.resolve(_territories);
                deferredObjects.resources.resolve(resources);
                deferredObjects.operatingHours.resolve(operatingHours);

                window.setSplashScreenTabDone('loading-territories');
            }).catch(function (ex) {
                gotResourcesDeferred.reject(ex);
                deferredObjects.resources.reject();
                deferredObjects.territories.reject();
                deferredObjects.operatingHours.reject();
                console.warn('GetResourcesAndTeritorries: unable to load resources, territories, or operating hours');
                bootstrap.handleError(ex);
            });

            return gotResourcesDeferred.promise;
        }

        // run when service loads
        getResourceAndTerritories();

        // this will reset the data, used when locations are loaded/unloaded
        function reset() {

            _territories = {};
            resources = {};
            operatingHours = {};
            _contractorResources = [];
            _crewResources = {};
            _crewToResources = {};
            _skillsList = {};
        }

        function turnOnOrUpdatePushService() {

            var messageForPushService = {
                territories: bootstrap.loadedUserSettings.locations,
                resources: Object.keys(resources),
                operation: PushServices.MESSAGE_OPERATIONS.RESET
            };

            PushServices.isPushServiceActive() ? PushServices.updateSession(messageForPushService) : PushServices.connectToWebSocket(messageForPushService);
        }

        // This will be our resource factory
        return {
            promises: {
                territories: function territories() {
                    return deferredObjects.territories.promise;
                },
                resources: function resources() {
                    return deferredObjects.resources.promise;
                },
                operatingHours: function operatingHours() {
                    return deferredObjects.operatingHours.promise;
                }
            },
            territories: function territories() {
                return _territories;
            },
            allTerritories: allTerritories,
            getResources: getResources,
            getResourcesSkills: getResourcesSkills,
            operatingHours: operatingHours,
            getOperatingHours: getOperatingHours,
            getCapacityBasedResources: getCapacityBasedResources,
            getCrewResources: getCrewResources,
            getCrewToResources: getCrewToResources,
            contractorResources: function contractorResources() {
                return _contractorResources;
            },
            crewResources: function crewResources() {
                return _crewResources;
            },
            crewToResources: function crewToResources() {
                return _crewToResources;
            },
            skillsList: function skillsList() {
                return _skillsList;
            },
            getResourceAndTerritories: getResourceAndTerritories,
            getResourceAndTerritoriesFromJson: getResourceAndTerritoriesFromJson,
            reset: reset
        };
    }
})();