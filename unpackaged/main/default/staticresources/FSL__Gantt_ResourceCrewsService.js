'use strict';

(function () {
    angular.module('serviceExpert').factory('ResourceCrewsService', ['ResourcesAndTerritoriesService', 'TimePhasedDataService', '$rootScope', 'utils', 'StateService', function (ResourcesAndTerritoriesService, TimePhasedDataService, $rootScope, utils, StateService) {

        var cachedCrewDates = {};
        // var cachedTerritories = {};

        $rootScope.$on('gotNewTimePhasedObjects', function (ev, timePhasedObjects) {
            if (StateService.areCrewsSupported() && timePhasedObjects.serviceCrewMembers && Object.keys(timePhasedObjects.serviceCrewMembers).length) {
                drewResourceCrewsService(timePhasedObjects.start, timePhasedObjects.finish, timePhasedObjects);
            }
        });

        function reset() {
            cachedCrewDates = {};
        }

        function drewResourceCrewsService(start, finish, timePhasedObjects) {

            var currStart = new Date(start),
                crewMembersData = undefined;

            while (currStart < finish) {
                var formatedDate = utils.formatDayToString(currStart);

                if (!cachedCrewDates[formatedDate]) {

                    if (crewMembersData === undefined) {
                        crewMembersData = buildCrewMembersData(timePhasedObjects.serviceCrewMembers);
                    }

                    cachedCrewDates[formatedDate] = true;

                    var currFinish = new Date(currStart);
                    currFinish.setDate(currFinish.getDate() + 1);

                    for (var memberId in crewMembersData) {
                        drewMemberBetweenDates(new Date(currStart), new Date(currFinish), crewMembersData[memberId]);
                    }
                }

                currStart.setDate(currStart.getDate() + 1);
            }
        }

        function drewMemberBetweenDates(start, finish, memberToDrew) {

            if (start.getTime() === finish.getTime()) return;

            var crewLabel;

            if (memberToDrew.member.ganttLabel) {
                crewLabel = memberToDrew.member.ganttLabel.encodeHTML();
            } else {
                crewLabel = customLabels.XCrewMember.replaceAll(memberToDrew.member.serviceCrew__r.Name.encodeHTML());
            }

            var color = memberToDrew.member ? memberToDrew.member.ganttColor || null : null;

            drawSCMsOfSeconderiesOrRelocationsTerritories(start, finish, memberToDrew, crewLabel, 'S', color);
            drawSCMsOfSeconderiesOrRelocationsTerritories(start, finish, memberToDrew, crewLabel, 'R', color);
            drawPrimariesAndRelocations(start, finish, memberToDrew, crewLabel, color);
        }

        function drawSCMsOfSeconderiesOrRelocationsTerritories(start, finish, memberToDrew, crewLabel, type, color) {

            var territories = memberToDrew.territoriesByType[type];

            if (territories !== undefined && (showSecondarySTMs || type === 'R')) {
                for (var i = 0; i < territories.length; i++) {

                    var currentTerritory = territories[i];

                    var toTerritoryTZ = useLocationTimezone ? currentTerritory.operatingHours.TimeZone : userTimeZone;

                    var startTerritoryTimePhase;
                    var finishTerritoryTimePhase;

                    if (useLocationTimezone) {
                        startTerritoryTimePhase = convertDateBetweenTimeZones(currentTerritory.start, currentTerritory.operatingHours.TimeZone, toTerritoryTZ);
                        finishTerritoryTimePhase = convertDateBetweenTimeZones(currentTerritory.finish, currentTerritory.operatingHours.TimeZone, toTerritoryTZ);
                    } else {
                        startTerritoryTimePhase = currentTerritory.start;
                        finishTerritoryTimePhase = currentTerritory.finish;
                    }

                    var intersectionOfTerritoryWithHorizon = utils.intersectDates({ start: startTerritoryTimePhase,
                        finish: finishTerritoryTimePhase }, { start: start,
                        finish: finish }).intersection;

                    if (intersectionOfTerritoryWithHorizon !== null) {

                        var startCrewMemberTimePhase = convertDateBetweenTimeZones(memberToDrew.member.startDate, 'GMT', toTerritoryTZ);
                        var finishCrewMemberTimePhase = convertDateBetweenTimeZones(memberToDrew.member.endDate, 'GMT', toTerritoryTZ);

                        var intersectionOfMemberWithSTM = utils.intersectDates({ start: intersectionOfTerritoryWithHorizon.start, finish: intersectionOfTerritoryWithHorizon.finish }, { start: startCrewMemberTimePhase, finish: finishCrewMemberTimePhase }).intersection;

                        if (intersectionOfMemberWithSTM !== null) {
                            addActualMarkedTimeSpan(intersectionOfMemberWithSTM.start, intersectionOfMemberWithSTM.finish, currentTerritory.sectionsToDraw, 'crewMember', crewLabel, 'crewLabelStyle', color);
                        }
                    }
                }
            }
        }

        function drawPrimariesAndRelocations(start, finish, memberToDrew, crewLabel, color) {

            var primaries = memberToDrew.territoriesByType['P'];
            var relocations = memberToDrew.territoriesByType['R'];

            if (relocations === undefined) {
                drewOnlyPrimaries(start, finish, memberToDrew, crewLabel, color);
            } else if (primaries !== undefined) {

                for (var i = 0; i < primaries.length; i++) {

                    var foundRelocationWithPrimaryOnHorizon = false;

                    var currentPrimary = primaries[i];

                    // Getting TZ - primary tz or user tz according to settings
                    var toTZprimary = useLocationTimezone ? currentPrimary.operatingHours.TimeZone : userTimeZone;

                    // Start and finish of primary STM 
                    var startMemberTimePhasePrimary = convertDateBetweenTimeZones(memberToDrew.member.startDate, 'GMT', toTZprimary);
                    var finishMemberTimePhasePrimary = convertDateBetweenTimeZones(memberToDrew.member.endDate, 'GMT', toTZprimary);

                    var intersectionOfMemberWithHorizonPrimary = utils.intersectDates({ start: startMemberTimePhasePrimary,
                        finish: finishMemberTimePhasePrimary }, { start: start,
                        finish: finish }).intersection;

                    if (intersectionOfMemberWithHorizonPrimary !== null) {

                        var intersectionOfMemberWithPrimary = utils.intersectDates({ start: currentPrimary.start,
                            finish: currentPrimary.finish }, { start: intersectionOfMemberWithHorizonPrimary.start,
                            finish: intersectionOfMemberWithHorizonPrimary.finish }).intersection;

                        if (intersectionOfMemberWithPrimary !== null) {

                            for (var j = 0; j < relocations.length; j++) {

                                var currentRelocation = relocations[j];

                                // Getting TZ - primary tz or user tz according to settings
                                var fromTZrelocation = useLocationTimezone ? currentRelocation.operatingHours.TimeZone : userTimeZone;

                                // Start and finish of relocation STM 
                                var startTerritoryTimePhaseRelocation = convertDateBetweenTimeZones(currentRelocation.start, fromTZrelocation, toTZprimary);
                                var finishTerritoryTimePhaseRelocation = convertDateBetweenTimeZones(currentRelocation.finish, fromTZrelocation, toTZprimary);

                                var intersectionOfRelocationWithHorizon = utils.intersectDates({ start: startTerritoryTimePhaseRelocation,
                                    finish: finishTerritoryTimePhaseRelocation }, { start: start,
                                    finish: finish }).intersection;

                                if (intersectionOfRelocationWithHorizon !== null) {
                                    var intersectionOfPrimaryMemberAndRelocation = utils.intersectDates({ start: intersectionOfRelocationWithHorizon.start,
                                        finish: intersectionOfRelocationWithHorizon.finish }, { start: intersectionOfMemberWithPrimary.start,
                                        finish: intersectionOfMemberWithPrimary.finish }).intersection;

                                    if (intersectionOfPrimaryMemberAndRelocation !== null) {
                                        drawSCMforPrimaryWhileRelocationIntersect(intersectionOfPrimaryMemberAndRelocation, intersectionOfMemberWithPrimary, currentPrimary.sectionsToDraw, crewLabel, color);
                                        foundRelocationWithPrimaryOnHorizon = true;
                                    }
                                }
                            }

                            if (!foundRelocationWithPrimaryOnHorizon && intersectionOfMemberWithPrimary !== null) {
                                addActualMarkedTimeSpan(intersectionOfMemberWithPrimary.start, intersectionOfMemberWithPrimary.finish, currentPrimary.sectionsToDraw, 'crewMember', crewLabel, 'crewLabelStyle', color);
                            }
                        }
                    }
                }
            }
        }

        function drawSCMforPrimaryWhileRelocationIntersect(intersectionOfPrimaryMemberAndRelocation, intersectionOfMemberWithPrimary, primarySectionsToDrew, crewLabel, color) {

            if (intersectionOfMemberWithPrimary.start.getTime() < intersectionOfPrimaryMemberAndRelocation.start.getTime()) {
                addActualMarkedTimeSpan(intersectionOfMemberWithPrimary.start, intersectionOfPrimaryMemberAndRelocation.start, primarySectionsToDrew, 'crewMember', crewLabel, 'crewLabelStyle', color);
            }

            if (intersectionOfPrimaryMemberAndRelocation.finish.getTime() < intersectionOfMemberWithPrimary.finish.getTime()) {
                addActualMarkedTimeSpan(intersectionOfPrimaryMemberAndRelocation.finish, intersectionOfMemberWithPrimary.finish, primarySectionsToDrew, 'crewMember', crewLabel, 'crewLabelStyle', color);
            }
        }

        function drewOnlyPrimaries(start, finish, memberToDrew, crewLabel, color) {
            var primaries = memberToDrew.territoriesByType['P'];

            if (primaries !== undefined) {
                for (var i = 0; i < primaries.length; i++) {

                    var currentPrimary = primaries[i];

                    var toTZ = useLocationTimezone ? currentPrimary.operatingHours.TimeZone : userTimeZone;

                    var startMemberTimePhase = convertDateBetweenTimeZones(memberToDrew.member.startDate, 'GMT', toTZ);
                    var finishMemberTimePhase = convertDateBetweenTimeZones(memberToDrew.member.endDate, 'GMT', toTZ);

                    var intersectionOfMemberWithHorizon = utils.intersectDates({ start: start, finish: finish }, { start: startMemberTimePhase, finish: finishMemberTimePhase }).intersection;

                    if (intersectionOfMemberWithHorizon !== null) {

                        var intersectionWithPrimary = utils.intersectDates({ start: currentPrimary.start, finish: currentPrimary.finish }, { start: intersectionOfMemberWithHorizon.start, finish: intersectionOfMemberWithHorizon.finish }).intersection;

                        if (intersectionWithPrimary !== null) {
                            addActualMarkedTimeSpan(intersectionWithPrimary.start, intersectionWithPrimary.finish, currentPrimary.sectionsToDraw, 'crewMember', crewLabel, 'crewLabelStyle', color);
                        }
                    }
                }
            }
        }

        function addActualMarkedTimeSpan(start, finish, sectionsToDraw, css, crewLabel, crewLabelStyle, color) {

            if (!color) {
                color = "#a99be8";
            }

            var ganttColorStyle = 'background: ' + color + '90; box-shadow: 0 0 0 1px ' + color;

            scheduler.addMarkedTimespan({
                start_date: start,
                end_date: finish,
                sections: sectionsToDraw['daily'],
                css: css,
                html: '<div class="' + crewLabelStyle + '" title="' + escapeHTML(crewLabel) + '" style="' + ganttColorStyle + '">\n                            <svg aria-hidden="true" class="slds-icon relocationIcon">\n                                <use xlink:href="' + lsdIcons.crewMember + '"></use>\n                            </svg>\n                            ' + escapeHTML(crewLabel) + '\n                          </div>'
            });

            scheduler.addMarkedTimespan({
                start_date: start,
                end_date: finish,
                sections: sectionsToDraw['monthly'],
                html: '<div class="crewUtilizBox" title="' + escapeHTML(crewLabel) + '" style="' + ganttColorStyle + '">\n                    <svg aria-hidden="true" class="slds-icon relocationIcon">\n                    <use xlink:href="' + lsdIcons.crewMember + '"></use>\n                    </svg></div>',
                css: 'crewmember_monthly'
            });
        }

        function convertDateBetweenTimeZones(dt, sourceTz, destTz) {
            return utils.convertDateBetweenTimeZones(dt, sourceTz, destTz);
        }

        function convertDtToMomentDt(dt, tz) {
            return utils.convertDtToMomentDt(dt, tz);
        }

        function convertMomentDtToDt(dt) {
            return utils.convertMomentDtToDt(dt);
        }

        function buildCrewMembersData(serviceCrewMembers) {
            var crewMembersData = {};
            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesAndTerritories();

            for (var key in serviceCrewMembers) {

                if (crewMembersData[key] === undefined) {
                    crewMembersData[key] = {};
                    crewMembersData[key].territoriesByType = {};
                    crewMembersData[key].member = serviceCrewMembers[key];
                }

                var timePhasedTerritories = resourcesToTimePhasedLocations[serviceCrewMembers[key].serviceResource];

                for (var timePhasedTerId in timePhasedTerritories) {

                    var timePhasedLoc = timePhasedTerritories[timePhasedTerId];
                    var sectionId = utils.generateResourceId(serviceCrewMembers[key].serviceResource, timePhasedLoc.serviceTerritory);

                    if (crewMembersData[key].territoriesByType[timePhasedLoc.serviceTerritoryType] === undefined) {
                        crewMembersData[key].territoriesByType[timePhasedLoc.serviceTerritoryType] = [];
                    }

                    crewMembersData[key].territoriesByType[timePhasedLoc.serviceTerritoryType].push({
                        start: timePhasedLoc.effectiveStartDate,
                        finish: timePhasedLoc.effectiveEndDate,
                        serviceTerritory: timePhasedLoc.serviceTerritory,
                        operatingHours: timePhasedLoc.serviceTerritory__r.OperatingHours,
                        type: timePhasedLoc.serviceTerritoryType,
                        id: timePhasedLoc.id,
                        section: sectionId,
                        sectionsToDraw: getSectionsToDrew(sectionId)
                    });
                }

                if (crewMembersData[key].territoriesByType['P'] !== undefined) {
                    crewMembersData[key].territoriesByType['P'].sort(utils.sortByTime);
                }

                if (crewMembersData[key].territoriesByType['R'] !== undefined) {
                    crewMembersData[key].territoriesByType['R'].sort(utils.sortByTime);
                }

                if (crewMembersData[key].territoriesByType['S'] !== undefined) {
                    crewMembersData[key].territoriesByType['S'].sort(utils.sortByTime);
                }
            }

            return crewMembersData;
        }

        function getSectionsToDrew(section) {

            var sectionsToDraw = { 'monthly': {}, 'daily': {} };

            for (var key in scheduler.matrix) {

                if (key === 'MonthlyView' || key === 'MTDView' || key === 'LongView') {
                    sectionsToDraw['monthly'][key] = [section];
                } else sectionsToDraw['daily'][key] = [section];
            }

            return sectionsToDraw;
        }

        return {
            reset: reset
        };
    }]);
})();