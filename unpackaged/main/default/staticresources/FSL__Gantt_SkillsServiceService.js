'use strict';

(function () {

    SkillsService.$inject = ['$q', 'sfdcService', 'ResourcesAndTerritoriesService'];

    angular.module('serviceExpert').factory('SkillsService', SkillsService);

    function SkillsService($q, sfdcService, ResourcesAndTerritoriesService) {

        var skills = [],
            defferedObjects = {
            skills: $q.defer()
        };
        var skillsClientList = [],
            defferedObjectSkill = {
            resourcesWithSkills: $q.defer()
        };

        var resourcesWithSkills = {};

        var serverSideSearch = null;

        var cachedServerSideSkillIds = {};

        var notFetchedSkillsList = [];
        function setServerSkill(skill) {
            serverSideSearch = skill;
        }

        function getServerSideSkill() {
            return serverSideSearch;
        }

        function setServerResult(skills) {
            resourcesWithSkills = skills;
        }

        // get skills
        function getSkillsFromSfdc() {

            var def = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.getSkills).then(function (sfdcSkills) {

                skills = sfdcSkills;
                def.resolve(def);
                defferedObjects.skills.resolve(skills);
            }).catch(function (ex) {
                def.reject(def);
                defferedObjects.skills.reject(ex);
                console.log(ex);
                console.warn('unable to get skill list');
            });

            return def.promise;
        }

        //get skills list in case none of resource has skills from user settings
        function getNotFetchedSkills(skillsIds) {
            return sfdcService.callRemoteAction(RemoteActions.getSkillsList, skillsIds).then(function (response) {
                skillsClientList = skillsClientList.concat(response);
                return skillsClientList;
            }).catch(function (ex) {
                console.log(ex);
                console.warn('unable to get skill list');
                return skillsClientList;
            });
        }

        function getSkillsFromResourcesList(skillListUserSettings) {

            var resourcesSkillList = ResourcesAndTerritoriesService.getResourcesSkills();
            for (var skill in skillListUserSettings) {
                if (!resourcesSkillList[skill] && skillListUserSettings[skill] === true) {
                    notFetchedSkillsList.push(skill);
                }
            }
            skillsClientList = Object.values(ResourcesAndTerritoriesService.getResourcesSkills());
            if (notFetchedSkillsList.length > 0) {
                //make server call only if fetchedSkills has skill
                return getNotFetchedSkills(notFetchedSkillsList);
            }
            return Promise.resolve(skillsClientList);
        }

        //api call to get resources list IDs with skillId
        function getResourcesWithSelectedSkillIdFromServer(skillId, territoriesIds, startDate, endDate) {
            var def = $q.defer();
            sfdcService.callRemoteAction(RemoteActions.getResourcesWithSelectedSkill, territoriesIds, skillId, startDate, endDate).then(function (result) {

                resourcesWithSkills = result;
                def.resolve(def);
                defferedObjectSkill.resourcesWithSkills.resolve(result);
            }).catch(function (ex) {
                def.reject(def);
                defferedObjectSkill.resourcesWithSkills.reject(ex);
                console.log(ex);
                console.warn('unable to get skill list');
            });

            return def.promise;
        }

        function addSkillToResource(resource, skillsList, skillId) {
            skillsList.forEach(function (skill) {

                if (!new ServiceResource(null, true).checkIfResourceAlreadyHasSkill(resource.skills, skill.Id, skill.SkillId)) {
                    if (!resource.skills[skillId]) {
                        resource.skills[skillId] = new ServiceResourceSkill(skill);
                    }
                    // already array, push
                    else if (Array.isArray(resource.skills[skillId])) {
                            resource.skills[skillId].push(new ServiceResourceSkill(skill));
                        } else {
                            resource.skills[skillId] = [resource.skills[skillId]];
                            resource.skills[skillId].push(new ServiceResourceSkill(skill));
                        }
                }
            });
            return resource;
        }

        // does a resource has all given skills? (AND OPERATOR)
        function doesHaveSkills(resourceId, skillIds) {
            var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var endDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


            if (!window.useResourceSkillFilter) {
                return true;
            }

            var resource = ResourcesAndTerritoriesService.getResources()[resourceId];
            //W-13063085
            var selectedSkill = getServerSideSkill();
            //check if need to update skills in resource in case server side research has results                  
            if (resourcesWithSkills[resourceId]) {
                resource = addSkillToResource(resource, resourcesWithSkills[resourceId], selectedSkill.Id);
            }

            if (!Array.isArray(skillIds)) {
                skillIds = [skillIds];
            }

            for (var i = 0, length = skillIds.length; i < length; i++) {

                var resourceSkillsObject = resource.skills[skillIds[i]];

                if (resourceSkillsObject) {

                    // W-8792817: same skills in different dates
                    if (Array.isArray(resourceSkillsObject)) {

                        var skillFound = false;

                        for (var j = 0; j < resourceSkillsObject.length; j++) {

                            if (startDate && endDate && isIntersect(startDate, endDate, resourceSkillsObject[j].effectiveStartDate, resourceSkillsObject[j].effectiveEndDate)) {
                                skillFound = true;
                            }
                        }

                        if (!skillFound) {
                            return false;
                        }
                    }

                    // skill found but doesn't intersect
                    else if (startDate && endDate && !isIntersect(startDate, endDate, resourceSkillsObject.effectiveStartDate, resourceSkillsObject.effectiveEndDate)) {
                            return false;
                        }
                }

                // skill not found
                else {
                        return false;
                    }
            }

            // all skilss were found
            return true;
        }

        // does a resource has all given skills? (OR OPERATOR)
        function doesHaveSomeSkills(resourceId, skillIds) {
            var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var endDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


            if (!window.useResourceSkillFilter) {
                return true;
            }

            var resource = ResourcesAndTerritoriesService.getResources()[resourceId];
            //W-13063085
            var selectedSkill = getServerSideSkill();
            //check if need to update skills in resource in case server side research has results           
            if (resourcesWithSkills[resourceId]) {
                resource = addSkillToResource(resource, resourcesWithSkills[resourceId], selectedSkill.Id);
            }

            if (!Array.isArray(skillIds)) {
                skillIds = [skillIds];
            }

            for (var i = 0, length = skillIds.length; i < length; i++) {

                var resourceSkillsObject = resource.skills[skillIds[i]];

                if (resourceSkillsObject) {

                    // W-8792817: same skills in different dates
                    if (Array.isArray(resourceSkillsObject)) {

                        for (var j = 0; j < resourceSkillsObject.length; j++) {

                            if (startDate && endDate && isIntersect(startDate, endDate, resourceSkillsObject[j].effectiveStartDate, resourceSkillsObject[j].effectiveEndDate)) {
                                return true;
                            }
                        }
                    }

                    // skill found and intersect
                    if (startDate && endDate && isIntersect(startDate, endDate, resource.skills[skillIds[i]].effectiveStartDate, resource.skills[skillIds[i]].effectiveEndDate)) {
                        return true;
                    }
                }
            }

            return false;
        }

        // This will be our state
        return {
            getSkills: function getSkills() {
                return skills;
            },
            getServerResult: function getServerResult() {
                return resourcesWithSkills;
            },
            getServerSideSkill: getServerSideSkill,
            doesHaveSkills: doesHaveSkills,
            doesHaveSomeSkills: doesHaveSomeSkills,
            getSkillsFromSfdc: getSkillsFromSfdc,
            getSkillsFromResourcesList: getSkillsFromResourcesList,
            getResourcesWithSelectedSkillIdFromServer: getResourcesWithSelectedSkillIdFromServer,
            setServerSkill: setServerSkill,
            setServerResult: setServerResult,
            cachedServerSideSkillIds: cachedServerSideSkillIds,
            promises: {
                skills: function skills() {
                    return defferedObjects.skills.promise;
                },
                resourcesWithSkills: function resourcesWithSkills() {
                    return defferedObjectSkill.resourcesWithSkills.promise;
                }
            }
        };
    }
})();