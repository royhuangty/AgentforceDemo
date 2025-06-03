'use strict';

(function () {
    var app = angular.module('Crews', ['angularMoment']);

    app.run(['amMoment', function (amMoment) {
        amMoment.changeLocale(window.userLocale);
    }]);

    moment.locale(window.userLocale);
})();
'use strict';

GanttController.$inject = ['$rootScope', '$scope', 'DataService', 'UtilsService', 'GeneralLightbox', 'ScmLightbox', 'TerritoryFilteringService', 'GetCrewCandidates', 'CreateCrewLightbox', '$timeout'];

angular.module('Crews').controller('Gantt', GanttController);

function GanttController($rootScope, $scope, DataService, UtilsService, GeneralLightbox, ScmLightbox, TerritoryFilteringService, GetCrewCandidates, CreateCrewLightbox, $timeout) {

    var ganttFolderOpenStatus = {},
        serviceContextMenu = null,
        isdtpUrlAddon = '&isdtp=p1',
        //W-15630542
    lastServiceRightClickId = null;

    $scope.daysOnGantt = window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.GanttHorizon__c] || '4';
    $scope.createNewCrew = CreateCrewLightbox.open;
    $scope.setUserSetting = DataService.setUserSetting;
    $scope.searchCrew = null;
    $scope.createGanttTimeline = createGanttTimeline;
    $scope.skillsLogicOperator = window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SkillsLogicOperator__c] || 'or';
    $scope.selectedFilterSkills = {};
    $scope.filterBoxXY = { x: 0, y: 0 };

    if (window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SelectedSkills__c]) {
        var selectedSkillsIds = JSON.parse(window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SelectedSkills__c]);
        selectedSkillsIds.forEach(function (skill) {
            return $scope.selectedFilterSkills[skill] = true;
        });
    }

    // attach scheduler events when ready
    scheduler.attachEvent("onSchedulerReady", function () {

        scheduler.attachEvent("onBeforeFolderToggle", onBeforeFolderToggle);
        scheduler.attachEvent("onBeforeViewChange", onBeforeViewChange);
        scheduler.attachEvent("onBeforeLightbox", function () {
            return false;
        });
        scheduler.attachEvent('onBeforeEventChanged', onBeforeEventChanged);
        scheduler.attachEvent("onBeforeDrag", onBeforeDrag);
        scheduler.attachEvent("onDblClick", onDblClick);
        scheduler.attachEvent("onYScaleClick", onYScaleClick);
        scheduler.attachEvent("onAfterEventDisplay", onAfterEventDisplay);
        scheduler.attachEvent("onCellDblClick", onCellDblClick);
        scheduler.attachEvent("onViewChange", onViewChange);
        scheduler.attachEvent("onBeforeTooltip", onBeforeTooltip);

        configureServiceContextMenu();
    });

    // update gantt resources when needed
    $rootScope.$on('createGanttTimeline', function () {

        DataService.getGanttData(scheduler._min_date, scheduler._max_date).then(function (ganttScms) {
            createGanttTimeline();
            scheduler.parse(ganttScms, 'json');
            DataService.validateAllServicesInView();
        });
    });

    var debounceTimer = void 0;
    var debounceSkillsTimer = void 0;

    var saveSelectedSkillToUserSettings = function saveSelectedSkillToUserSettings(selectedSkills) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            var selectedSkillsIds = [];
            for (var skill in selectedSkills) {
                if (selectedSkills[skill]) {
                    selectedSkillsIds.push(skill);
                }
            }
            DataService.setUserSetting(window.__crews.fields.Crew_Management_User_Setting.SelectedSkills__c, JSON.stringify(selectedSkillsIds), 'String');
        }, 800);
    };

    $scope.$watch('selectedFilterSkills', function () {
        saveSelectedSkillToUserSettings($scope.selectedFilterSkills);
        createGanttTimeline();
    }, true);

    $scope.$watch('skillsLogicOperator', function () {
        createGanttTimeline();
    });

    ganttInit();

    // generate the timeline
    function createGanttTimeline() {

        var timeline = [],
            territories = DataService.getLoadedTerritories(),
            resources = DataService.getResources(),
            crewIdsToChildrenMap = {},
            crews = DataService.getCrews(),
            skills = DataService.getSkills();

        clearTimeout(debounceSkillsTimer);
        debounceSkillsTimer = setTimeout(function () {
            DataService.getSkillsFromResourcesList($scope.selectedFilterSkills).then(function (data) {
                data.forEach(function (skill) {
                    if (!skills[skill.Id]) {
                        skills[skill.Id] = skill.MasterLabel;
                    }
                });
            });
        }, 3000);

        var searchTerms = $scope.searchCrew && $scope.searchCrew.split(',').map(function (term) {
            return term.trim();
        });

        var resourcesArr = Object.values(resources).sort(function (a, b) {
            return a.Name <= b.Name ? -1 : 1;
        });

        var territoriesArr = Object.values(territories).sort(function (a, b) {
            return a.Name <= b.Name ? -1 : 1;
        });

        var skillsFilterIds = Object.keys($scope.selectedFilterSkills).filter(function (key) {
            return $scope.selectedFilterSkills[key];
        });

        var filteredObject = filterResources(crews, resources, searchTerms);

        var filteredResources = filteredObject.resources;

        var filteredCrewsFromResources = filteredObject.crewsFromResources;

        var filteredCrews = filteredObject.crews;

        var crewsNamesMap = {};

        for (var key in crews) {
            crewsNamesMap[crews[key].ServiceCrewId] = crews[key].Name;
        }

        $scope.filteringIsApplied = skillsFilterIds.length > 0 ? true : false;

        // copy territories into timeline as a base

        var _loop = function _loop(i) {
            // CFSL-513
            if (!territories[territoriesArr[i].Id]) {
                return 'continue';
            }

            var crewsInTerritory = [],
                crewsTerritoryMemberships = Object.values(territoriesArr[i].territoryMemberships).sort(function (a, b) {
                return a.ServiceResource.Name <= b.ServiceResource.Name ? -1 : 1;
            });

            // Array of crews STMs (without secondaries)
            crewsTerritoryMemberships = crewsTerritoryMemberships.filter(function (stm) {
                return stm.ServiceResource.ServiceCrewId && stm.TerritoryType !== 'S';
            });

            crewsTerritoryMemberships.forEach(function (stm) {

                // STM does not intersect
                if (!UtilsService.isIntersect(scheduler._min_date, scheduler._max_date, stm.ganttEffectiveStartDate, stm.ganttEffectiveEndDate)) {
                    return;
                }

                // search for users (search = empty -> show OR matches search)
                var shouldShowResource = !$scope.searchCrew || filteredCrews.includes(stm.ServiceResource.Name) || filteredCrewsFromResources.includes(stm.ServiceResource.Name);

                if (!shouldShowResource) {
                    return;
                }

                // check that crew is not already in territory
                if (!crewsInTerritory.some(function (crew) {
                    return crew.crewId === stm.ServiceResource.ServiceCrewId;
                }) && crews[stm.ServiceResource.Id]) {

                    var crewKeyOnGanttForSas = stm.ServiceResource.ServiceCrewId + '_' + stm.ServiceTerritoryId,
                        crewKeyOnGanttForCrew = stm.ServiceResource.ServiceCrewId + '_' + stm.ServiceTerritoryId + '_folder',
                        crew = crews[stm.ServiceResource.Id],
                        labelOnGantt = '<div class="cm-drag-resource-on-crew">' + window.__crews.labels.DragResourcesToAssignThemTo.replace('{0}', stm.ServiceResource.Name.encodeHTML()) + '</div>',
                        crewColor = crew.ServiceCrew[window.__crews.fields.ServiceCrew.GanttColor__c] || '#a99be8',
                        skillsSentence = UtilsService.generateSkillsSentence(crew.ServiceResourceSkills, skills, crew) || window.__crews.labels.CrewHasNoSkills;

                    //check if there are checked skill filters and if the crew has matching skills
                    if (skillsFilterIds.length > 0 && !crewHasMatchingSkills(skillsFilterIds, crew.ServiceResourceSkills)) {
                        return;
                    }

                    labelOnGantt += '<svg aria-hidden="true" class="slds-icon cm-crew-icon-folder" style="background-color: ' + crewColor + ' !important;"><use xlink:href="' + window.__crews.icons.service_crew_member + '"></use></svg>';

                    if (searchTerms && filteredCrews.includes(crew.Name)) {
                        var crewName = UtilsService.findMatchingSearchTerm(stm.ServiceResource.Name, searchTerms);
                        labelOnGantt += '<span title="' + skillsSentence + '">' + crewName.beforeMatch.encodeHTML() + '<span class="cm-highlight-on-search">' + crewName.matchedPart.encodeHTML() + '</span>' + crewName.afterMatch.encodeHTML() + ' ' + window.__crews.labels.CrewSizeOnCm.replace('{0}', crew.ServiceCrew.CrewSize) + '</span>';
                    } else {
                        labelOnGantt += '<span title="' + skillsSentence + '">' + stm.ServiceResource.Name.encodeHTML() + ' ' + window.__crews.labels.CrewSizeOnCm.replace('{0}', crew.ServiceCrew.CrewSize) + '</span>';
                    }

                    if (skillsSentence !== window.__crews.labels.CrewHasNoSkills) {
                        labelOnGantt += '<div class="cm-crew-container-folder-buttons" onClick="window.__crews.functions.matchCrewSkillsInFilter(event, \'' + crew.Id + '\')">' + window.__crews.labels.MatchCrewSkills + '</div>';
                    }

                    crewsInTerritory.push({
                        children: [{
                            key: crewKeyOnGanttForSas,
                            label: window.__crews.labels.CrewSchedule
                        }],
                        label: labelOnGantt,
                        crewId: stm.ServiceResource.ServiceCrewId,
                        disableEventCreation: true,
                        key: crewKeyOnGanttForCrew,
                        open: ganttFolderOpenStatus[crewKeyOnGanttForCrew] !== undefined ? ganttFolderOpenStatus[crewKeyOnGanttForCrew] : true
                    });

                    crewIdsToChildrenMap[stm.ServiceResource.ServiceCrewId] = crewsInTerritory[crewsInTerritory.length - 1].children;
                }
            });

            // add this territory if it has crews
            if (crewsInTerritory.length > 0) {

                territoriesArr[i].children = crewsInTerritory;
                timeline.push(territoriesArr[i]);

                // make a map of IDs of all crews in current territories
                var crewsIdsInTerritory = {};
                territoriesArr[i].children.forEach(function (crew) {
                    return crewsIdsInTerritory[crew.crewId] = true;
                });
                // add resources with STM and SCM
                resourcesArr.forEach(function (currentResource) {

                    var alreadyAddedResource = {};

                    // only technicians are acceptable
                    if (currentResource.ResourceType !== 'T') {
                        return;
                    }

                    // check if resource has SCM
                    for (var id in currentResource.crewMemberships) {

                        var scm = currentResource.crewMemberships[id];
                        var crewName = crewsNamesMap[scm.ServiceCrewId];

                        // crew of the resource isn't matching to a search term so lets check if the resource's name matching a search term
                        if (!filteredCrews.includes(crewName) && !filteredResources.includes(currentResource.Name)) {
                            continue;
                        }

                        // crew was already added
                        if (alreadyAddedResource[scm.ServiceCrewId]) {
                            continue;
                        }

                        // current SCM is not for a crew in the territory
                        if (!crewsIdsInTerritory[scm.ServiceCrewId]) {
                            continue;
                        }

                        // current SCM doesn't intersect current view
                        if (!UtilsService.isIntersect(scheduler._min_date, scheduler._max_date, scm.start_date, scm.end_date)) {
                            continue;
                        }

                        // does resource has STM to current territory
                        var resourceStmId = UtilsService.doesResourceHasStm(currentResource, territoriesArr[i].Id, scheduler._min_date, scheduler._max_date);
                        if (!resourceStmId) {
                            continue;
                        }

                        var filteredLabel = null;

                        if (filteredResources.includes(currentResource.Name) && !filteredCrews.includes(scm.ServiceCrew.Name)) {
                            filteredLabel = DataService.generateFilteredResourceGanttLabel(currentResource, searchTerms);
                        }

                        // all checks passed, lets add this resource to a crew and mark it as added
                        crewIdsToChildrenMap[scm.ServiceCrewId].push({
                            label: filteredLabel ? filteredLabel : currentResource.label,
                            key: scm.ServiceResourceId + '_' + territoriesArr[i].Id + '_' + scm.ServiceCrewId
                        });

                        alreadyAddedResource[scm.ServiceCrewId] = true;
                    }
                });
            }
        };

        for (var i in territoriesArr) {
            var _ret = _loop(i);

            if (_ret === 'continue') continue;
        }

        scheduler.updateCollection('resources', timeline);
    }

    var filterResources = function filterResources(crews, resources, searchTerms) {
        var filteredCrewNames = [];
        var filteredResourceNames = [];
        var filteredCrewResourceNames = [];

        var crewsNamesMap = {};

        for (var key in crews) {
            crewsNamesMap[crews[key].ServiceCrewId] = crews[key].Name;
        }

        for (var id in crews) {
            var crew = crews[id];
            if (filterServiceCrewForGantt(crew, searchTerms)) {
                filteredCrewNames.push(crew.Name);
            }
        }

        for (var _id in resources) {
            var resource = resources[_id];
            if (filterServiceCrewForGantt(resource, searchTerms)) {
                filteredResourceNames.push(resource.Name);
                for (var _id2 in resource.crewMemberships) {
                    var scm = resource.crewMemberships[_id2];
                    var crewName = crewsNamesMap[scm.ServiceCrewId];
                    filteredCrewResourceNames.push(crewName);
                }
            }
        }

        return {
            crews: filteredCrewNames,
            resources: filteredResourceNames,
            crewsFromResources: filteredCrewResourceNames
        };
    };

    var isSkillInDateRange = function isSkillInDateRange(skill) {
        var skillStartDate = skill.EffectiveStartDate;
        var skillEndDate = skill.EffectiveEndDate;

        if (skillStartDate > scheduler._max_date || skillEndDate < scheduler._min_date) {
            //Crew is out of date
            return false;
        }
        //Crew date range is fine
        return true;
    };

    var crewHasMatchingSkills = function crewHasMatchingSkills(selectedSkillsFilterIds, crewSkillsArr) {
        //crew don't have skills at all
        if (!crewSkillsArr) {
            return false;
        }

        var crewSkillsIds = [];

        crewSkillsArr.forEach(function (skill) {
            crewSkillsIds.push(skill.SkillId);
        });

        var hasMatchingSkills = true;

        // AND Case
        if ($scope.skillsLogicOperator === 'and') {
            selectedSkillsFilterIds.forEach(function (skillId) {
                var skill = crewSkillsArr.find(function (item) {
                    return item.SkillId === skillId;
                });
                // crew has at least one skill that either not selected or not in range ? so the crew is not fine
                if (!crewSkillsIds.includes(skillId) || !isSkillInDateRange(skill)) {
                    hasMatchingSkills = false;
                }
            });
        } else {
            // OR Case
            hasMatchingSkills = false;
            selectedSkillsFilterIds.forEach(function (skillId) {
                var skill = crewSkillsArr.find(function (item) {
                    return item.SkillId === skillId;
                });
                //crew has at least one selected skill and is in date range? so the crew is fine
                if (crewSkillsIds.includes(skillId) && isSkillInDateRange(skill)) {
                    hasMatchingSkills = true;
                }
            });
        }

        //crew don't have the required skills
        if (!hasMatchingSkills) {
            return false;
        }
        return true;
    };

    $scope.showSkillsFilterBox = function ($event) {
        $scope.showSkillsFilter = true;
        $event.stopPropagation();

        $scope.filterBoxXY.x = $event.currentTarget.getBoundingClientRect().left + 'px';
        $scope.filterBoxXY.y = $event.currentTarget.getBoundingClientRect().top + 34 + 'px';
    };

    $scope.clearSkills = function () {
        return $scope.searchSkills = null;
    };

    $scope.isIe = function () {
        return !!window._isIE;
    };

    $scope.getSkills = function (searchTerm) {

        if (!searchTerm) {
            return DataService.getSkills();
        }

        var skills = DataService.getSkills(),
            filtertedSkills = {};

        clearTimeout(debounceSkillsTimer);
        debounceSkillsTimer = setTimeout(function () {
            DataService.getSkillsFromResourcesList($scope.selectedFilterSkills).then(function (data) {
                data.forEach(function (skill) {
                    if (!skills[skill.Id]) {
                        skills[skill.Id] = skill.MasterLabel;
                    }
                });
            });
        }, 3000);

        for (var id in skills) {

            if (skills[id].toUpperCase().includes(searchTerm.toUpperCase())) {
                filtertedSkills[id] = skills[id];
            }
        }

        return filtertedSkills;
    };

    $scope.bulkSelectSkills = function (value) {
        var skills = $scope.getSkills($scope.searchSkills);

        for (var id in skills) {
            $scope.selectedFilterSkills[id] = value;
        }
    };

    $scope.isTerritoryFilterOpen = function () {
        return TerritoryFilteringService.isOpen();
    };

    function filterServiceCrewForGantt(serviceResource, searchTerms) {

        // no search terms? always show
        if (!searchTerms) {
            return true;
        }

        var foundTerm = false;

        for (var i = 0; i < searchTerms.length; i++) {

            var term = searchTerms[i];

            // check if the term is an empty string
            if (term.length === 0) {
                continue;
            }

            foundTerm = serviceResource.Name.toLowerCase().includes(term.toLowerCase());

            if (foundTerm) {
                break;
            }
        };

        return foundTerm;
    }

    function prepareDatesBeforeFetching() {
        // W-12149381
        var daysToAdd = window.__crews.daysToLoadOnGanttInitForCrewManagement;
        var dates = {
            start: new Date(scheduler._min_date),
            end: new Date(scheduler._max_date || scheduler._min_date)
        };

        // Used to be bug: CFSL745
        dates.end.setDate(daysToAdd + dates.end.getDate());
        dates.start.setDate(dates.start.getDate() - daysToAdd);

        return dates;
    }

    function fetchGanttDataOnInit() {

        var dates = prepareDatesBeforeFetching();

        DataService.getGanttData(dates.start, dates.end).then(function (ganttScms) {
            createGanttTimeline();
            scheduler.parse(ganttScms, 'json');
            DataService.validateAllServicesInView();
        });
    }

    // init the gantt
    function ganttInit() {

        DataService.getResourcesPromise().promise.then(function () {

            $scope.changeDaysOnGantt(false);

            scheduler.init('Gantt', new Date(), 'CrewsTimeline');
            $rootScope.finishedLoadingGantt = true;

            if (window.__crews.loadedTerritories.length === 0) {
                TerritoryFilteringService.toggle();
                return;
            }

            $timeout(function bringDataWithDelay() {

                if (scheduler._is_initialized()) {
                    fetchGanttDataOnInit();
                } else {
                    $timeout(bringDataWithDelay, 1000);
                }
            }, 850);
        });
    }

    // change date for buttons , 0 = today
    $scope.changeDate = function (time) {

        var newDate = new Date();

        if (time !== 0) {
            newDate = new Date(scheduler._min_date);
            newDate.setDate(newDate.getDate() + time);
        }

        scheduler.setCurrentView(newDate);
    };

    // jump to date with DHTMLX mini calendar
    $scope.jumpToDate = function () {
        if (scheduler.isCalendarVisible()) {
            scheduler.destroyCalendar();
        } else {
            scheduler.renderCalendar({
                position: 'JumpToDate',
                date: scheduler._date,
                navigation: true,
                handler: function handler(date, calendar) {
                    scheduler.setCurrentView(date);
                    scheduler.destroyCalendar();
                }
            });
        }
    };

    // bring new data before changing the view
    function onBeforeViewChange(old_mode, old_date, mode, newDate) {

        if (old_date && old_date.getTime() !== newDate.getTime()) {

            var timelineSize = scheduler._max_date.getTime() - scheduler._min_date.getTime(),
                endDate = new Date(newDate);

            endDate.setMilliseconds(endDate.getMilliseconds() + timelineSize);

            DataService.getGanttData(newDate, endDate).then(function (ganttScms) {

                DataService.validateAllServicesInView();

                // prase new SCMs
                scheduler.parse(ganttScms, 'json');

                // update timeline
                createGanttTimeline();
            });
        }

        return true;
    }

    // handle gantt folder state
    function onBeforeFolderToggle(section, isOpen, allSections) {
        ganttFolderOpenStatus[section.key] = isOpen;
        return true;
    }

    // you can't create SCMs on the service appointment row
    function onBeforeDrag(id, mode, e) {

        // cancel service dragging
        if (id && scheduler._events[id] && scheduler._events[id].readonly) {
            return false;
        }

        var actionData = scheduler.getActionData(e);

        return actionData.section.includes('_');
    }

    // handle saving of SCMs
    function onBeforeEventChanged(ev, e, is_new, original) {

        console.log('onBeforeEventChanged');

        // check if we dragged to a folder
        var ganttDropData = scheduler.getActionData(e);

        if (ganttDropData && ganttDropData.section) {

            if (!ganttDropData.section.includes('_') || ganttDropData.section.includes('_folder')) {
                return false;
            }
        }

        // RREMINDER: resourceId on gantt is combination of RESOURCE, STM and CREW IDs

        var dataFromResourceId = ev.resourceId.split('_'),
            resourceId = dataFromResourceId[0],
            resourceStm = dataFromResourceId[1],
            crewId = dataFromResourceId[2],
            scmId = is_new ? null : ev.Id,
            resource = DataService.getResources()[resourceId];

        // checking that this is not the SA row
        if (dataFromResourceId.length === 1) {
            return false;
        }

        if (!resource) {
            return;
        }

        var stm = resource.territoryMemberships[resourceStm],
            startDate = UtilsService.convertDateToUTC(ev.start_date, stm.timezone),
            endDate = UtilsService.convertDateToUTC(ev.end_date, stm.timezone);

        // save changes to service
        DataService.saveChangesToScm(scmId, resourceId, crewId, startDate, endDate, false).then(function (data) {

            // resource has no stm
            if (data === false) {

                if (window.confirm(window.__crews.labels.ResourceHasNoStm.replace('$0', resource.Name))) {
                    saveSignleScm(true);
                } else {
                    $scope.saving = false;
                    return;
                }
            }

            // delete old event and update with new/updated SCM
            delete scheduler._events[ev.id];
            scheduler.parse(data, 'json');
        }).catch(function (err) {

            // in case of an error, need to undo changes
            if (!is_new) {
                scheduler._events[ev.id] = original;
                scheduler.updateView();
            } else {
                scheduler.deleteEvent(ev.id);
            }
        });

        return true;
    }

    // handle clicking on events on gantt
    function onDblClick(id, e) {

        var ganttEvent = scheduler._events[id];

        if (ganttEvent.type === 'service') {

            var tabs = [{ name: window.__crews.labels.Details, url: window.__crews.pages.service + '?id=' + ganttEvent.Id }];

            if (ganttEvent.ParentRecordType === 'WorkOrder') {
                tabs.push({ name: window.__crews.labels.WorkOrder, url: window.__crews.pages.workorder + '?id=' + ganttEvent.ParentRecordId + isdtpUrlAddon });
            } else if (ganttEvent.ParentRecordType === 'WorkOrderLineItem') {
                tabs.push({ name: window.__crews.labels.WOLI, url: window.__crews.pages.woli + '?id=' + ganttEvent.ParentRecordId + isdtpUrlAddon });
            }

            GeneralLightbox.open(ganttEvent.AppointmentNumber, tabs, ganttEvent.Id);
            window.scheduler.tooltip.hide();
        }

        if (ganttEvent.type === 'scm') {
            ScmLightbox.open(ganttEvent);
            window.scheduler.tooltip.hide();
        }
    }

    // handle clicking on a resource
    function onYScaleClick(index, section, e) {

        if (section.level === 2) {

            var resourceId = section.key.split('_'),
                resource = DataService.getResources()[section.key.split('_')[0]];

            if (resourceId.length === 3 && !section.key.includes('_CREATE')) {
                GeneralLightbox.open(resource.Name, window.__crews.pages.resource + '?id=' + resourceId[0] + isdtpUrlAddon, resourceId[0]);
            }
        }
    }

    // after show on gantt, jump animation
    function onAfterEventDisplay(ev) {

        setTimeout(function () {
            ev.showEffect = false;
            scheduler.updateView();
        }, 900);
    }

    // double click empty cell to create
    function onCellDblClick(x_ind, y_ind, clickedDate, y_val, eventObject) {

        var schedulerData = scheduler.getActionData(eventObject);

        // not clicked on a resource
        if (schedulerData.section.includes('_folder') || schedulerData.section.includes('_CREATE') || schedulerData.section.split('_').length === 2) {
            return;
        }

        var start = new Date(clickedDate),
            end = new Date(clickedDate);

        start.setHours(0);
        start.setMinutes(0);
        end.setHours(24);
        end.setMinutes(0);

        // REMINDER: ServiceResourceId_resourceStmId_ServiceCrewId
        // CHANGED in 30/11/2020 to ServiceResourceId_TerritoryId_ServiceCrewId
        var resourceId = schedulerData.section.split('_')[0],

        //stmId = schedulerData.section.split('_')[1],
        territoryId = schedulerData.section.split('_')[1],
            crewId = schedulerData.section.split('_')[2],
            objectForLightbox = {
            start: start,
            end: end,
            territory: DataService.getTerritories()[territoryId],
            resourceIds: [resourceId],
            crewId: crewId
        };

        ScmLightbox.openFromDrag(objectForLightbox);
    }

    function onViewChange(new_mode, new_date) {
        DataService.validateAllServicesInView();
        scheduler.updateView();
    }

    function onBeforeTooltip(id) {
        return !serviceContextMenu._isContextMenuVisible();
    }

    function configureServiceContextMenu() {

        serviceContextMenu = new dhtmlXMenuObject({
            parent: 'contextZone_A',
            context: true
        });

        serviceContextMenu.addNewChild(serviceContextMenu.topId, 0, 'getCandidates', '<svg aria-hidden="true" class="slds-icon cm-contextmenu"><use xlink:href="' + window.__crews.icons.candidates + '"></use></svg><span class="menu-caps">' + window.__crews.labels.Get_Candidates + '</span>', false);

        serviceContextMenu.attachEvent('onClick', function (id, zoneId, cas) {

            var service = scheduler._events[lastServiceRightClickId],
                skillsIds = [];

            switch (id) {

                case 'allSkills':
                    service.requiredSkills.forEach(function (s) {
                        return skillsIds.push(s.SkillId);
                    });
                    $rootScope.$broadcast('FilterSkills', skillsIds);
                    break;

                case 'missingSkills':
                    service.missingSkills.forEach(function (s) {
                        return s.missing && skillsIds.push(s.SkillId);
                    });
                    $rootScope.$broadcast('FilterSkills', skillsIds);
                    break;

                case 'getCandidates':

                    if (!service.MinimumCrewSize || service.MinimumCrewSize === '-') {
                        alert(window.__crews.labels.ServiceNoMinimumCrew);
                        return;
                    }

                    GetCrewCandidates.get(service);
                    break;

            }
        });

        scheduler.attachEvent('onContextMenu', function (event_id, native_event_object) {

            native_event_object.preventDefault();

            if (!event_id || event_id && scheduler._events[event_id].type !== 'service') {
                return;
            }

            lastServiceRightClickId = event_id;
            scheduler.dhtmlXTooltip.hide();

            var posx = 0,
                posy = 0;

            if (native_event_object.pageX || native_event_object.pageY) {

                posx = native_event_object.pageX;
                posy = native_event_object.pageY;
            } else if (native_event_object.clientX || native_event_object.clientY) {

                posx = native_event_object.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = native_event_object.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            serviceContextMenu.showContextMenu(posx, posy);
        });
    }

    window.__crews.functions.matchCrewSkillsInFilter = function (event, crewId) {

        event.stopPropagation();

        var crewSkills = DataService.getCrews()[crewId].ServiceResourceSkills;

        if (crewSkills) {
            $rootScope.$broadcast('FilterSkills', crewSkills.map(function (skill) {
                return skill.SkillId;
            }));
        }
    };

    $scope.isIe = function () {
        return !!window._isIE;
    };

    $scope.noTerritoriesSelected = function () {
        return window.__crews.loadedTerritories.length === 0;
    };

    $scope.changeDaysOnGantt = function () {
        var bringData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;


        var daysConfig = [{ x_step: 60, x_size: 24, x_length: 24 }, { x_step: 120, x_size: 24, x_length: 12 }, { x_step: 180, x_size: 24, x_length: 8 }, { x_step: 360, x_size: 16, x_length: 4 }, { x_step: 360, x_size: 20, x_length: 4 }, { x_step: 360, x_size: 24, x_length: 4 }, { x_step: 360, x_size: 28, x_length: 4 }, { x_step: 1440, x_size: 14, x_length: 1 }];

        angular.merge(scheduler.matrix.CrewsTimeline, daysConfig[$scope.daysOnGantt]);

        if (!bringData) {
            return;
        }

        var startDate = new Date(scheduler._min_date),
            endDate = new Date(scheduler._max_date);

        endDate.setDate(endDate.getDate() + parseInt($scope.daysOnGantt) + 1);

        DataService.getGanttData(startDate, endDate).then(function (ganttScms) {

            DataService.validateAllServicesInView();

            // prase new SCMs
            scheduler.parse(ganttScms, 'json');

            // update timeline
            createGanttTimeline();
        });

        scheduler.updateView();

        // save sticky
        DataService.setUserSetting(window.__crews.fields.Crew_Management_User_Setting.GanttHorizon__c, $scope.daysOnGantt, 'String');
    };

    // key shortcuts
    document.addEventListener('keyup', function (event) {

        var element = null;

        if (window.document.getElementsByClassName('LightboxBlackContainer').length !== 0) {
            return;
        }

        // disable shortcuts if input is active
        var activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            return;
        }

        switch (event.which) {

            case 37:

                element = window.document.getElementsByClassName('cm-top-button-container');

                if (element && element[0]) {
                    element[0].click();
                }

                break;

            // right arrow
            case 39:

                element = window.document.getElementsByClassName('cm-top-button-container');

                if (element && element[1]) {
                    element[1].click();
                }

                break;

            // T - jump to today
            case 84:
                $scope.changeDate(0);
                break;
        }
    });
}
'use strict';

ResourceListController.$inject = ['$scope', '$filter', 'DataService', 'TerritoryFilteringService', 'UtilsService'];

angular.module('Crews').controller('ResourceList', ResourceListController);

function ResourceListController($scope, $filter, DataService, TerritoryFilteringService, UtilsService) {

    $scope.selectedFilterSkills = {};
    $scope.getSelectedResourcesOnList = DataService.getSelectedResourcesOnList;
    $scope.currentFilteredResources = [];
    $scope.filterBoxXY = { x: 0, y: 0 };
    $scope.skillsLogicOperator = window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SkillsLogicOperator__c] || 'or';
    $scope.setUserSetting = DataService.setUserSetting;
    $scope.userSettings = window.__crews.settings;
    $scope.poicyFieldOnSettings = window.__crews.fields.Crew_Management_User_Setting.SchedulingPolicy__c;
    $scope.getPolicies = DataService.getPolicies;

    $scope.$on('FilterSkills', function (event, skills) {

        if (Array.isArray(skills) && skills.length > 0) {

            for (var key in $scope.selectedFilterSkills) {
                $scope.selectedFilterSkills[key] = false;
            }

            skills.forEach(function (skillId) {
                return $scope.selectedFilterSkills[skillId] = true;
            });
            $scope.skillsLogicOperator = "or";

            UtilsService.safeApply($scope);
        }
    });

    $scope.showSkillsFilterBox = function ($event) {

        $scope.showSkillsFilter = true;
        $event.stopPropagation();

        $scope.filterBoxXY.x = $event.currentTarget.getBoundingClientRect().left + 'px';
        $scope.filterBoxXY.y = $event.currentTarget.getBoundingClientRect().top + 34 + 'px';
    };

    $scope.isSkillsFilterApplied = function () {

        for (var key in $scope.selectedFilterSkills) {
            if ($scope.selectedFilterSkills[key]) {
                return true;
            }
        }

        return false;
    };

    $scope.setSearchTerm = function () {
        TerritoryFilteringService.setSearchTerm($scope.territorySearch);
    };

    $scope.bulkSelectSkills = function (value) {

        var skills = $scope.getSkills($scope.searchSkills);

        for (var id in skills) {
            $scope.selectedFilterSkills[id] = value;
        }
    };

    $scope.countSelected = function () {

        var count = 0,
            selectedResources = DataService.getSelectedResourcesOnList();

        for (var key in selectedResources) {
            if (selectedResources[key]) {
                count++;
            }
        }

        return count;
    };

    $scope.unselectAllResources = function () {

        var selectedResources = DataService.getSelectedResourcesOnList();

        for (var key in selectedResources) {
            selectedResources[key] = false;
        }
    };

    $scope.getSkills = function (searchTerm) {

        if (!searchTerm) {
            return DataService.getSkills();
        }

        var skills = DataService.getSkills(),
            filtertedSkills = {};

        for (var id in skills) {

            if (skills[id].toUpperCase().includes(searchTerm.toUpperCase())) {
                filtertedSkills[id] = skills[id];
            }
        }

        return filtertedSkills;
    };

    $scope.filterTerritories = function () {

        var territoriesForFilter = [],
            territories = DataService.getLoadedTerritories();

        for (var id in territories) {
            if (territories[id] && Object.keys(territories[id].territoryMemberships).length > 0) {
                territoriesForFilter.push(territories[id]);
            }
        }

        return territoriesForFilter.sort(function (a, b) {
            return a.Name <= b.Name ? -1 : 1;
        });
    };

    $scope.filterResources = function (territory) {

        var currentFilteredResources = $filter('ResourceFilter')(territory, $scope.selectedFilterSkills, $scope.resourceSearch, $scope.skillsLogicOperator);
        territory.hasResourcesToDisplayOnList = currentFilteredResources.length > 0;

        return currentFilteredResources.sort(function (a, b) {
            return a.Name <= b.Name ? -1 : 1;
        });;
    };

    $scope.areAnyResorcesAvailabeOnList = function () {
        return $scope.filterTerritories().find(function (x) {
            return x.hasResourcesToDisplayOnList;
        });
    };

    $scope.showTerritoryFilter = function () {
        TerritoryFilteringService.toggle();
    };

    $scope.isTerritoryFilterOpen = function () {
        return TerritoryFilteringService.isOpen();
    };

    $scope.isIe = function () {
        return !!window._isIE;
    };
    $scope.clearSkills = function () {
        return $scope.searchSkills = null;
    };
    $scope.clearResources = function () {
        return $scope.resourceSearch = null;
    };
    $scope.clearTerritories = function () {
        $scope.territorySearch = '';
        $scope.setSearchTerm();
    };
}
'use strict';

ToastController.$inject = ['$scope', 'UtilsService'];

angular.module('Crews').controller('ToastController', ToastController);

function ToastController($scope, UtilsService) {

    $scope.localErrors = [];

    $scope.clear = function () {
        $scope.localErrors.length = 0;
    };

    UtilsService.subscribeForNewErrors(function (error) {
        $scope.localErrors.unshift(error);
    });
}
'use strict';

dragTarget.$inject = ['DataService', 'UtilsService', 'ScmLightbox'];

angular.module('Crews').directive('dragTarget', dragTarget);

function dragTarget(DataService, UtilsService, ScmLightbox) {

    return {
        restrict: 'CAE',

        link: function link(scope, element, attributes, ctlr) {

            // dragging over the gantt
            element.bind('dragover', function (eventObject) {
                eventObject.preventDefault();
            });

            element.bind('drop', function (eventObject) {

                eventObject.preventDefault();

                var objectForLightbox = {
                    start: scheduler._min_date,
                    end: scheduler._max_date
                },
                    schedulerData = scheduler.getActionData(eventObject.originalEvent),
                    territoryId = schedulerData.section.split('_')[0],
                    crewId = schedulerData.section.split('_')[1];

                if (schedulerData.section.includes('_folder')) {
                    territoryId = schedulerData.section.split('_')[1];
                    crewId = schedulerData.section.split('_')[0];
                } else {

                    var foundEvent = false;

                    // set dates
                    for (var id in scheduler._events) {

                        var ganttEvent = scheduler._events[id];

                        if (ganttEvent.resourceId === schedulerData.section && UtilsService.isIntersect(schedulerData.date, schedulerData.date, ganttEvent.start_date, ganttEvent.end_date)) {

                            objectForLightbox.start = ganttEvent.start_date;
                            objectForLightbox.end = ganttEvent.end_date;

                            if (ganttEvent.type === 'service') {
                                territoryId = schedulerData.section.split('_')[1];
                                crewId = schedulerData.section.split('_')[0];
                            } else {
                                territoryId = schedulerData.section.split('_')[1];
                                crewId = schedulerData.section.split('_')[2];
                            }

                            foundEvent = true;
                            break;
                        }
                    }

                    // wasn't dropped on SCM or SA (and not on CREATE line)
                    if (!foundEvent) {
                        return;
                    }
                }

                objectForLightbox.territory = DataService.getTerritories()[territoryId];
                objectForLightbox.resourceIds = eventObject.originalEvent.dataTransfer.getData('text').split(',');
                objectForLightbox.crewId = crewId;

                ScmLightbox.openFromDrag(objectForLightbox);
            });
        }

    };
}
'use strict';

draggableResource.$inject = ['DataService', 'UtilsService'];

angular.module('Crews').directive('draggableResource', draggableResource);

function draggableResource(DataService, UtilsService) {

    function getSelectedResources() {

        var selectedIds = [],
            resourcesNames = [],
            selectedResources = DataService.getSelectedResourcesOnList();

        for (var id in selectedResources) {
            if (selectedResources[id]) {
                selectedIds.push(id);
                resourcesNames.push(DataService.getResources()[id].Name);
            }
        }

        return {
            ids: selectedIds.join(','),
            names: resourcesNames.join(', ')
        };
    }

    return {
        restrict: 'CAE',
        scope: { draggableResource: '=' },

        link: function link(scope, element, attributes, ctlr) {

            element.bind('dragend', function (eventObject) {
                eventObject.preventDefault();
                $('#CrewsGantt').removeClass('cm-dragging');
            });

            element.bind('dragstart', function (eventObject) {

                $('#CrewsGantt').addClass('cm-dragging');

                // auto select the resource we started the drag frmo (if not selected)
                DataService.getSelectedResourcesOnList()[scope.draggableResource.Id] = true;
                UtilsService.safeApply(scope);

                var resourcesData = getSelectedResources();

                // set resourcess Ids
                eventObject.originalEvent.dataTransfer.setData('text', resourcesData.ids);

                // get draggable dom element
                var draggableDomElement = $('#cm-DraggedResources');
                draggableDomElement.html(resourcesData.names);

                var crt = document.getElementById('cm-DraggedResources');

                document.body.appendChild(crt);
                var testDataTransfer = window.DataTransfer;
                if ('setDragImage' in testDataTransfer.prototype) {
                    eventObject.originalEvent.dataTransfer.setDragImage(crt, 0, 28);
                }
            });
        }
    };
}
'use strict';

ResourceCard.$inject = ['DataService', 'GeneralLightbox', 'UtilsService'];

angular.module('Crews').directive('resourceCard', ResourceCard);

function ResourceCard(DataService, GeneralLightbox, UtilsService) {

    return {
        restrict: 'CAE',
        scope: {
            resource: '=',
            search: '='
        },

        link: function link(scope, element, attributes, ctlr) {

            scope.generateResourceName = function (name) {
                if (scope.search) {
                    var resourceName = UtilsService.findMatchingSearchTerm(scope.resource.Name, scope.search);
                    return resourceName;
                } else {
                    return {
                        beforeMatch: name,
                        matchedPart: '',
                        afterMatch: ''
                    };
                }
            };

            scope.getSelectedResourcesOnList = DataService.getSelectedResourcesOnList;
            scope.resource.listOpened = false;
            if (!scope.getSelectedResourcesOnList()[scope.resource.Id]) {
                scope.getSelectedResourcesOnList()[scope.resource.Id] = false;
            }

            scope.objectIsEmpty = function (obj) {
                return Object.keys(obj).length === 0;
            };

            scope.generateSkillsSentence = function (resourceSkills) {
                return UtilsService.generateSkillsSentence(resourceSkills, DataService.getSkills());
            };

            scope.openResourceLightbox = function (name, id, ev) {
                ev.stopPropagation();
                GeneralLightbox.open(name, window.__crews.pages.resource + '?id=' + id + '&isdtp=p1', id);
            };

            scope.showScmOnGantt = function (id) {

                var crewId = scheduler._events[id].ServiceCrewId,
                    crews = DataService.getCrews(),
                    foundCrew = false;

                for (var k in crews) {
                    if (crews[k].ServiceCrewId === crewId) {
                        foundCrew = true;
                        break;
                    }
                }

                if (!foundCrew) {
                    window.alert(window.__crews.labels.NoScmToDisplay);
                }

                if (scheduler._events[id]) {
                    scheduler._events[id].showEffect = true;
                    scheduler.showEvent(id);
                }
            };

            scope.formatStm = function (stm) {

                var stmType = window.__crews.labels.Primary,
                    territoryName = DataService.getTerritories()[stm.ServiceTerritoryId].Name;

                if (stm.TerritoryType === 'S') {
                    stmType = window.__crews.labels.Secondary;
                } else if (stm.TerritoryType === 'R') {
                    stmType = window.__crews.labels.Relocation;
                }

                if (!stm.EffectiveStartDate && !stm.EffectiveEndDate) {
                    return '' + window.__crews.labels.StmNoStartNoEnd.replace('{0}', territoryName).replace('{1}', stmType);
                }

                if (!stm.EffectiveStartDate && stm.EffectiveEndDate) {
                    return '' + window.__crews.labels.StmNoStartHasEnd.replace('{0}', territoryName).replace('{1}', stm.EffectiveEndDate.format('l LT')).replace('{2}', stmType);
                }

                if (stm.EffectiveStartDate && !stm.EffectiveEndDate) {
                    return '' + window.__crews.labels.StmHasStartNoEnd.replace('{0}', territoryName).replace('{1}', stm.EffectiveStartDate.format('l LT')).replace('{2}', stmType);
                }

                if (stm.EffectiveStartDate && stm.EffectiveEndDate) {
                    return '' + window.__crews.labels.StmHasStartHasEnd.replace('{0}', territoryName).replace('{1}', stm.EffectiveStartDate.format('l LT')).replace('{2}', stm.EffectiveEndDate.format('l LT')).replace('{3}', stmType);
                }
            };

            scope.formatScm = function (scm) {

                var crewName = scm.ServiceCrew.Name;

                if (!scm.StartDate && !scm.EndDate) {
                    '' + window.__crews.labels.ScmNoStartNoEnd.replace('{0}', crewName);
                }

                if (!scm.StartDate && scm.EndDate) {
                    return '' + window.__crews.labels.ScmNoStartHasEnd.replace('{0}', crewName).replace('{1}', moment(scm.end_date).format('l LT'));
                }

                if (scm.StartDate && !scm.EndDate) {
                    return '' + window.__crews.labels.ScmHasStartNoEnd.replace('{0}', crewName).replace('{1}', moment(scm.start_date).format('l LT'));
                }

                if (scm.StartDate && scm.EndDate) {
                    return '' + window.__crews.labels.ScmHasStartHasEnd.replace('{0}', crewName).replace('{1}', moment(scm.start_date).format('l LT')).replace('{2}', moment(scm.end_date).format('l LT'));
                }
            };

            scope.getStmType = function (scm) {

                switch (scm.stmType) {
                    case 'S':
                        return window.__crews.labels.Secondary;
                    case 'P':
                        return window.__crews.labels.Primary;
                    case 'R':
                        return window.__crews.labels.Relocation;
                }
            };
        },

        template: '<div>\n\n                        <div class="cm-resource-header" ng-class="{\'no-label-header\': resource[\'' + window.__crews.fields.ServiceResource.GanttLabel__c + '\'] }" draggable="true" draggable-resource="resource" ng-click="resource.listOpened = !resource.listOpened" ng-class="{\'cm-resource-open\': resource.listOpened}">\n\n                            <input type="checkbox" ng-model="getSelectedResourcesOnList()[resource.Id]" ng-click="$event.stopPropagation()" />\n\n                            <img class="cm-resource-list-avatar" ng-src="{{ resource.RelatedRecord.SmallPhotoUrl}}" />\n\n                            <div class="cm-resource-title">\n                                <h1 ng-class="{\'cm-no-gantt-label\': !resource[\'' + window.__crews.fields.ServiceResource.GanttLabel__c + '\'] }" title="{{resource.Name}}">{{generateResourceName(resource.Name).beforeMatch}}<span class="cm-highlight-on-search">{{generateResourceName(resource.Name).matchedPart}}</span>{{generateResourceName(resource.Name).afterMatch}}</h1>\n                                <h2 title="{{resource[\'' + window.__crews.fields.ServiceResource.GanttLabel__c + '\']}}">{{ resource[\'' + window.__crews.fields.ServiceResource.GanttLabel__c + '\'] }}</h2>\n                            </div>\n\n                            <svg aria-hidden="true" class="slds-icon cm-resource-icon-lightbox" ng-click="openResourceLightbox(resource.Name, resource.Id, $event)">\n                                \u2028<use xlink:href="' + window.__crews.icons.resource + '"></use>\n                            \u2028</svg>\n\n                        </div>\n\n\n                        <div class="cm-resource-details" ng-show="resource.listOpened" >\n\n                            <div>\n                                <b>' + window.__crews.labels.SkillsNekudotaim + '</b>\n                                <span ng-if="resource.ServiceResourceSkills" class="cm-skill-description">\n                                    {{ generateSkillsSentence(resource.ServiceResourceSkills) }}\n                                </span>\n\n                                <span ng-if="!resource.ServiceResourceSkills" class="cm-skill-description">\n                                    ' + window.__crews.labels.ResourceNoSkills + '\n                                </span>\n                            </div>\n\n                            <div ng-show="resource.Description">\n                                <b>' + window.__crews.labels.Description + ':</b>\n                                <span>' + window.__crews.labels.Description + '</span>\n                            </div>\n\n                            <div class="cm-membership-seperator" ng-show="!objectIsEmpty(resource.territoryMemberships)">\n                                <b>' + window.__crews.labels.ServiceTerritoryMembership + '</b>\n                                <div class="cm-memberships-container">\n                                    <div ng-repeat="(id,stm) in resource.territoryMemberships">\n                                        <span class="cm-member-subheader">{{stm.MemberNumber}}: </span>\n                                        <span class="cm-member-subparagraph">{{ formatStm(stm) }}</span>\n                                    </div>\n                                </div>\n                            </div>\n\n                            <div class="cm-membership-seperator" ng-show="!objectIsEmpty(resource.crewMemberships)">\n                                <b>' + window.__crews.labels.ServiceCrewMembership + '</b>\n\n                                <div class="cm-memberships-container">\n                                    <div class="hoverEffectScm" ng-repeat="(id,scm) in resource.crewMemberships" ng-click="showScmOnGantt(scm.id)">\n                                        <span class="cm-member-subheader">{{scm.ServiceCrewMemberNumber}}: </span>\n                                        <span class="cm-member-subparagraph">{{ formatScm(scm) }} ({{ getStmType(scm)}})</span>\n                                    </div>\n                                </div>\n                            </div>\n                            \n                        </div>\n\n                    </div>'
    };
}
'use strict';

(function () {

    angular.module('Crews').directive('tooltip', function () {
        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="cc-helpIcon">?</div><div class="tooltipBaloon"><ng-transclude></ng-transclude></div>'
        };
    });
})();
'use strict';

(function () {

    ResourceFilter.$inject = ['DataService', 'UtilsService'];

    angular.module('Crews').filter('ResourceFilter', ResourceFilter);

    function ResourceFilter(DataService, UtilsService) {

        return function (territory, selectedFilterSkills, resourceSearch, logicOperator) {

            var resources = DataService.getResources(),
                filteredResources = [],
                filteredSkills = {},
                resourcesInFilter = {},
                logicOperatorSkillsFunction = logicOperator === 'or' ? doesResourceHaveSomeSkills : doesResourceHaveAllSkills;

            // which skills are selected
            for (var id in selectedFilterSkills) {
                if (selectedFilterSkills[id]) {
                    filteredSkills[id] = true;
                }
            }

            for (var _id in territory.territoryMemberships) {

                var stm = territory.territoryMemberships[_id];

                if (!UtilsService.isIntersect(scheduler._min_date, scheduler._max_date, stm.ganttEffectiveStartDate, stm.ganttEffectiveEndDate)) {
                    continue;
                }

                var resource = resources[stm.ServiceResourceId];

                if (!resource || resource.IsCapacityBased || !resource.IsActive) {
                    continue;
                }

                if (!logicOperatorSkillsFunction(filteredSkills, resource)) {
                    continue;
                }

                if (resourceSearch && !resource.Name.toUpperCase().includes(resourceSearch.toUpperCase())) {
                    continue;
                }

                if (resourcesInFilter[resource.Id]) {
                    continue;
                }

                resourcesInFilter[resource.Id] = true;

                filteredResources.push(resource);
            }

            return filteredResources;
        };
    }

    function doesResourceHaveAllSkills(skills, resource) {

        if (Object.keys(skills).length > 0) {

            var resourceGotSkills = {};

            // create a map of the resource skills
            if (resource.ServiceResourceSkills) {
                resource.ServiceResourceSkills.forEach(function (skill) {
                    return resourceGotSkills[skill.SkillId] = skill;
                });
            }

            // go over checked skills
            for (var id in skills) {

                // resource doesn't have the skill, resource is filtered
                if (!resourceGotSkills[id]) {
                    return false;
                }
            }

            return true;
        }

        return true;
    }

    function doesResourceHaveSomeSkills(skills, resource) {

        if (Object.keys(skills).length > 0) {

            var resourceGotSkills = {};

            // create a map of the resource skills
            if (resource.ServiceResourceSkills) {
                resource.ServiceResourceSkills.forEach(function (skill) {
                    return resourceGotSkills[skill.SkillId] = skill;
                });
            }

            // go over checked skills
            for (var id in skills) {

                // resource doesn't have the skill, resource is filtered
                if (resourceGotSkills[id]) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }
})();
'use strict';

function CrewManagementTerritory(ter, timezone) {

    for (var k in ter) {
        this[k] = ter[k];
    }

    // handle timezone label (WITH NEW MOMENT, SIGNS WERE REPLACED SO -60)
    var timezoneDiffInHours = moment(scheduler._min_date).tz(timezone)._offset / -60,
        gmtSign = '';

    if (timezoneDiffInHours === 0) {
        gmtSign = '';
    }
    if (timezoneDiffInHours < 0) {
        gmtSign = '+';
    }
    if (timezoneDiffInHours > 0) {
        gmtSign = '-';
    }

    var userLocale = window.jsUserLocale;
    var now = new Date();
    var timezoneName = new Intl.DateTimeFormat(userLocale, { timeZone: timezone, timeZoneName: 'long' }).formatToParts(now).find(function (part) {
        return part.type === 'timeZoneName';
    }).value;

    this.label = '<div title="' + ter.Name.encodeHTML() + '" class="cm-territory-name truncate">' + ter.Name.encodeHTML() + '</div><div class="cm-timezone-gantt">' + timezoneName + ' (GMT' + gmtSign + window.Math.abs(timezoneDiffInHours) + ')</div>';

    this.key = ter.Id;
    this.open = true;
    this.timezone = timezone;

    this.territoryMemberships = {};
}
'use strict';

(function () {

    scheduler.dhtmlXTooltip.config.className = 'cm-tooltip dhtmlXTooltip tooltip';
    scheduler.dhtmlXTooltip.config.timeout_to_display = 250;
    scheduler.dhtmlXTooltip.config.delta_x = 0;
    scheduler.dhtmlXTooltip.config.delta_y = 0;
    scheduler.config.minicalendar.mark_events = false;
    scheduler.config.limit_drag_out = false;
    scheduler.config.dblclick_create = false;
    scheduler.config.drag_create = false;
    scheduler.config.drag_resize = false;
    scheduler.config.drag_move = false;
    scheduler.config.mark_now = false;

    scheduler.createTimelineView({
        name: 'CrewsTimeline',
        x_unit: 'minute',
        x_date: '%g%A',
        x_step: 360,
        x_size: 20,
        x_start: 0,
        x_length: 4,
        y_unit: scheduler.serverList('resources', ''),
        y_property: 'resourceId',
        render: 'tree',
        dx: 170,
        second_scale: {
            x_unit: 'day',
            x_date: '%D, %M %j'
        },
        event_dy: 38,
        dy: 42,
        section_autoheight: false,
        folder_dy: 42,
        folder_events_available: false
    });

    scheduler.attachEvent("onSchedulerReady", function () {

        // don't let the user drag event out of the scheduler
        var cancelDragOutOfBound = false;

        // cancel drag outside of scheduler (invoke when mouse is out)
        dhtmlxEvent(scheduler._obj, 'mouseleave', function (e) {
            if (scheduler.getState().drag_id) {
                cancelDragOutOfBound = true;
                scheduler._on_mouse_up(e);
                window.getSelection().removeAllRanges();
            }
        });

        // cancel drag outside, move event back to its original
        scheduler.attachEvent('onBeforeEventChanged', function () {
            if (cancelDragOutOfBound) {
                cancelDragOutOfBound = false;
                return false;
            }

            return true;
        });
    });

    // set class for event
    scheduler.templates.event_class = function (start, end, ev) {

        var addedClasses = '';

        if (window.__currentCandidatesServiceId && ev.id !== window.__currentCandidatesServiceId) {
            addedClasses += 'cm-event-opacity ';
        }

        if (ev.type === 'scm') {

            if (ev.start_date.getTime() < scheduler._min_date.getTime() && ev.end_date.getTime() > scheduler._max_date.getTime()) {
                addedClasses += ' scm-container-both-not-ending ';
            } else if (ev.end_date.getTime() > scheduler._max_date.getTime()) {
                addedClasses += ' scm-container-right-not-ending ';
            } else if (ev.start_date.getTime() < scheduler._min_date.getTime()) {
                addedClasses += ' scm-container-left-not-ending ';
            }
        }

        if (ev.type === 'service') {
            return addedClasses + 'sa-on-gantt cm-sa-status-' + ev.StatusCategory;
        }

        if (ev.type === 'absence') {
            return addedClasses + 'absence-on-gantt';
        }

        if (ev.showEffect) {
            return addedClasses + 'scm-on-gantt cm-popup-scm';
        }

        return addedClasses + 'scm-on-gantt';
    };

    // classes for cells - draws background on level 0,1 and day separators on levle 2
    scheduler.templates.CrewsTimeline_cell_class = function (evs, date, section) {

        if (section.key.includes('_CREATE')) {
            return 'cm-gantt-drag-area';
        }

        if (section.level === 0) {
            return 'territory-on-gantt';
        }

        if (section.level === 1) {
            return 'crew-on-gantt';
        }

        // SA line
        if (section.key.split('_').length === 2) {

            if (section.level === 2 && date.getHours() === 0 && date.getTime() !== scheduler._min_date.getTime()) {
                return 'cm-BorderForDayChange cm-sa-separator-gantt-line';
            } else {
                return 'cm-sa-separator-gantt-line';
            }
        }

        if (section.level === 2 && date.getHours() === 0 && date.getTime() !== scheduler._min_date.getTime()) {
            return 'cm-BorderForDayChange';
        }
    };

    scheduler.templates.CrewsTimeline_scaley_class = function (key, label, section) {

        if (section.level === 0) {
            return 'territory-on-gantt';
        } else if (section.level === 1) {
            return 'crew-on-gantt';
        }

        return '';
    };

    scheduler.templates.event_bar_text = function (start, end, ev) {

        if (ev.type === 'service') {
            return drawServiceContent(ev);
        } else if (ev.type === 'absence') {
            return drawAbsenceContent(ev);
        } else {
            return drawScmContent(ev);
        }
    };

    // handle SCM drawing
    function drawScmContent(ev) {

        var content = '',
            moreClasses = '';

        if (ev.start_date.getTime() < scheduler._min_date.getTime()) {
            moreClasses += ' scm-continue-left ';
        }

        if (ev.end_date.getTime() > scheduler._max_date.getTime()) {
            moreClasses += ' scm-continue-right ';
        }

        var labelColor = '';

        if (!ev.ganttColor) {
            ev.ganttColor = '#a99be8';
        }

        content = '<div class="cm-event-padding ' + moreClasses + '" style="background-color: ' + hexToRgb(ev.ganttColor) + '; border-color:' + ev.ganttColor + ';">';
        labelColor = 'style="color:' + LightenDarkenColor(ev.ganttColor, -125) + '"';

        if (ev[window.__crews.fields.ServiceCrewMember.GanttLabel__c]) {

            content += '<span style="color:' + (ev.ganttColor ? LightenDarkenColor(ev.ganttColor, -125) : ev.ganttColor) + '">' + ev[window.__crews.fields.ServiceCrewMember.GanttLabel__c].encodeHTML() + '</span>';
        } else if (ev.ServiceCrewMemberNumber) {
            content += '<span ' + labelColor + ' >' + ev.ServiceCrewMemberNumber + '</span>';
        }

        if (ev.IsLeader) {
            content += '<div class="cm-is-leader-gantt" title="' + window.__crews.labels.Leader + '"><svg aria-hidden="true" class="slds-icon">\u2028<use xlink:href="' + window.__crews.icons.lead + '"></use>\u2028</svg></div>';
        }

        content += '</div>';

        return content;
    }

    // handle absence drawing
    function drawAbsenceContent(ev) {
        var content = '<div>';

        content += '<svg aria-hidden="true" class="naIcon""> <use xlink:href="' + window.__crews.icons.na + '"></use></svg>';

        if (ev[window.__crews.fields.ResourceAbsence.GanttLabel__c]) {
            content += '<span class="NA_Label"">\n                        ' + ev[window.__crews.fields.ResourceAbsence.GanttLabel__c].encodeHTML() + '\n                        </span>';
        } else {
            content += '<span class="NA_Label"">\n                        ' + ev.TypeLabel + '\n                        </span>';
        }

        content += '</div>';

        return content;
    }

    // handle Service drawing
    function drawServiceContent(ev) {

        var content = '';

        if (ev[window.__crews.fields.ServiceAppointment.GanttColor__c]) {

            var textColor = generateGanttTextColor(ev[window.__crews.fields.ServiceAppointment.GanttColor__c].substr(1, 6));
            content = '<div class="cm-sa-padding" style="background-color: ' + ev[window.__crews.fields.ServiceAppointment.GanttColor__c] + '; color: ' + textColor + '">';
        } else {
            content = '<div class="cm-sa-padding">';
        }

        content += handleSaValidationUi(ev);

        if (ev[window.__crews.fields.ServiceAppointment.GanttLabel__c]) {
            content += ev[window.__crews.fields.ServiceAppointment.GanttLabel__c].encodeHTML();
        } else {
            content += ev.AppointmentNumber;
        }

        content += '</div>';

        return content;
    }

    function handleSaValidationUi(ev) {

        var ui = '<div class="cm-validation"><svg aria-hidden="true" class="slds-icon">\u2028<use xlink:href="' + window.__crews.icons.warning + '"></use>\u2028</svg></div>';

        if (ev.availableMembersCount < ev.MinimumCrewSize || ev.totalMissingSkills > 0) {
            return ui;
        }

        return '';
    }

    function generateGanttTextColor(color) {
        // Convert color to RGB
        var rgb = parseInt('0x' + color, 16);
        var r = rgb >> 16 & 0xff;
        var g = rgb >> 8 & 0xff;
        var b = rgb >> 0 & 0xff;

        // Calculate relative luminance
        var luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Choose text color based on luminance
        return luminance > 128 ? '000000' : 'ffffff';
    }

    scheduler.templates.tooltip_text = function (start, end, ev) {

        if (ev.type === 'service') {
            return generateServiceTooltip(ev);
        }

        if (ev.type === 'absence') {
            return generateAbsenceTooltip(ev);
        }

        return generateScmTooltip(ev);
    };

    function generateServiceTooltip(ev) {

        var tooltipContent = '<div class="cm-tooltip-wrapper">\n                                <h1>' + ev.AppointmentNumber + '</h1>\n                                <div class="cm-tooltip-crewsize">\n                                    <div class="cm-tooltip-crewsize-single">\n                                        <div class="cm-tooltip-size-label">' + window.__crews.labels.MinimumSize + '</div>\n                                        <div class="cm-tooltip-size-value">' + ev.MinimumCrewSize + '</div>\n                                    </div>\n                                    \n                                    <div class="cm-tooltip-crewsize-single">\n                                        <div class="cm-tooltip-size-label">' + window.__crews.labels.RecommendedSize + '</div>\n                                        <div class="cm-tooltip-size-value">' + ev.RecommendedCrewSize + '</div>\n                                    </div>\n                                    \n                                    <div class="cm-tooltip-crewsize-single">\n                                        <div class="cm-tooltip-size-label">' + window.__crews.labels.CurrentlyAssigned + '</div>\n                                        <div class="cm-tooltip-size-value">' + ev.availableMembersCount + '</div>\n                                    </div>                                \n                                </div>\n                                <div class="cm-tooltip-label"><b>' + window.__crews.labels.RequiredSkillsCm + ' </b>';

        var skills = [];

        if (ev.requiredSkills) {

            ev.requiredSkills.forEach(function (skill) {

                var skillStr = skill.Skill.MasterLabel;

                if (skill.SkillLevel) {
                    skillStr = '' + window.__crews.labels.SkillAndLevel.replace('{0}', skillStr).replace('{1}', skill.SkillLevel);
                }

                skills.push(skillStr);
            });
        }

        if (skills.length !== 0) {
            tooltipContent += skills.join(', ') + '</div>';
        } else {
            tooltipContent += window.__crews.labels.ServiceNoReqSkills + '</div>';
        }

        for (var apiName in window.__crews.saTooltipFieldset) {

            if (ev[apiName] !== undefined) {
                var value = generateFieldToDisplay(ev[apiName], window.__crews.saTooltipFieldset[apiName].type, ev.timezone);

                if (value) {
                    tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.saTooltipFieldset[apiName].label.encodeHTML() + ': </b> ' + value + '</div>';
                }
            }
        }

        tooltipContent += '</div>'; // end of cm-tooltip-wrapper

        tooltipContent += generateServiceValidationTooltip(ev);

        return tooltipContent;
    }

    function generateFieldToDisplay(value, fieldType, timezone) {

        switch (fieldType) {

            case 'PICKLIST':
            case 'STRING':
            case 'TEXTAREA':
                return value.toString().encodeHTML();

            case 'INTEGER':
            case 'DOUBLE':
            case 'BOOLEAN':
                return value.toString();

            case 'DATE':
                return moment(value).tz(timezone).format('LL');

            case 'DATETIME':
                return moment(value).tz(timezone).format('LLLL');

            default:
                return null;

        }
    }

    function generateServiceValidationTooltip(ev) {

        var ui = '<div class="cm-tooltip-validation"><ul>',
            foundErrors = false;

        if (ev.availableMembersCount < ev.MinimumCrewSize) {
            var membersDiff = ev.MinimumCrewSize - ev.availableMembersCount;

            if (membersDiff === 1) {
                ui += '<li><span>' + window.__crews.labels.NotEnoughAvailableMembers.replace('{0}', membersDiff).replace('{1}', ev.MinimumCrewSize) + '</span></li>';
            } else {
                ui += '<li><span>' + window.__crews.labels.NotEnoughAvailableMembersPlural.replace('{0}', membersDiff).replace('{1}', ev.MinimumCrewSize) + '</span></li>';
            }

            foundErrors = true;
        }

        if (ev.totalMissingSkills > 0) {

            var missingSkills = [];
            foundErrors = true;

            ev.missingSkills.forEach(function (s) {

                if (s.missing) {

                    if (s.SkillLevel) {
                        missingSkills.push(' ' + window.__crews.labels.SkillAndLevel.replace('{0}', s.Skill.MasterLabel).replace('{1}', s.SkillLevel));
                    } else {
                        missingSkills.push(' ' + s.Skill.MasterLabel);
                    }
                }
            });

            ui += '<li><span>' + window.__crews.labels.MissingSkillsAre.replace('{0}', missingSkills.join(', ')) + '</span></li>';
        }

        if (!foundErrors) {
            return '';
        } else {
            return ui + '</ul></div>';
        }
    }

    function generateScmTooltip(ev) {

        var tooltipContent = '<div class="cm-tooltip-wrapper">',
            startValue = ev.StartDate ? moment(ev.start_date).format('llll') : window.__crews.labels.NotDefined,
            endValue = ev.EndDate ? moment(ev.end_date).format('llll') : window.__crews.labels.NotDefined;

        tooltipContent += '<h1>' + ev.ServiceCrewMemberNumber + '</h1>';
        tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.labels.EventStart + '</b> ' + startValue + '</div>';
        tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.labels.EventEnd + '</b> ' + endValue + '</div>';

        return tooltipContent + '</div>';
    }

    function generateAbsenceTooltip(ev) {

        var tooltipContent = '<div class="cm-tooltip-wrapper">';

        var tooltipLabel = ev[window.__crews.fields.ResourceAbsence.GanttLabel__c] ? ev[window.__crews.fields.ResourceAbsence.GanttLabel__c].encodeHTML() : ev.AbsenceNumber;

        var naIcon = '<svg aria-hidden="true" class="tooltipNAIcon""> <use xlink:href="' + window.__crews.icons.na + '"></use></svg>';

        tooltipContent += '<div>' + naIcon + ('<span class="NA_Label naLabelTooltip""> ' + tooltipLabel + ' </span></div>');
        tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.labels.EventType + '</b> ' + ev.TypeLabel + '</div>';
        tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.labels.EventStart + '</b> ' + moment(ev.start_date).format('llll') + '</div>';
        tooltipContent += '<div class="cm-tooltip-label"><b>' + window.__crews.labels.EventEnd + '</b> ' + moment(ev.end_date).format('llll') + '</div>';

        return tooltipContent + '</div>';
    }

    // format number in localeString
    function formatNumberToLocaleString(n) {
        try {
            return n.toLocaleString(window.__crews.jsUserLocale);
        } catch (e) {
            console.warn('Something wrong with your locale settings: ' + window.__crews.jsUserLocale);
        }

        return n;
    }

    function formatDateByLocaleWithDayOfTheWeek(jsDate) {
        var res = formatDateWithDayOfWeek(jsDate);

        if (res) {
            return res;
        }

        var localesToUseWithDayOfTheWeek = ['en_US'];

        if (localesToUseWithDayOfTheWeek.indexOf(window.__crews.userLocale) !== -1) {
            return moment(jsDate).format('ddd, MMM D YYYY');
        } else {
            return moment(jsDate).format('LL');
        }
    }

    function formatDateWithDayOfWeek(date) {
        var options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' },
            newDate = new Date(date);

        newDate.setHours(12);

        try {
            return newDate.toLocaleDateString(window.__crews.userLocale.replace('_', '-'), options);
        } catch (e) {
            return null;
        }
    }

    scheduler.templates.CrewsTimeline_scale_date = function (date) {

        var hours = date.getHours(),
            minutes = date.getMinutes() < 10 ? formatNumberToLocaleString(0) + formatNumberToLocaleString(date.getMinutes()) : formatNumberToLocaleString(date.getMinutes());

        // for 2 weeks view
        if (scheduler.matrix.CrewsTimeline.x_step === 1440) {
            return date.getDate();
        }

        if (!window.__crews.isAMPM) {
            return (date.getHours() < 10 ? formatNumberToLocaleString(0) + formatNumberToLocaleString(date.getHours()) : formatNumberToLocaleString(date.getHours())) + ':' + minutes;
        } else {
            if (hours === 0) {
                return formatNumberToLocaleString(12) + ' AM';
            }

            if (hours === 12) {
                return formatNumberToLocaleString(12) + ' PM';
            }

            if (hours > 12) {
                return formatNumberToLocaleString(hours - 12) + ' PM';
            } else {
                return formatNumberToLocaleString(hours) + ' AM';
            }
        }
    };

    scheduler.templates.CrewsTimeline_second_scale_date = function (date) {

        if (scheduler.matrix.CrewsTimeline.x_step === 1440) {
            return moment(date).format('ddd');
        }

        return formatDateByLocaleWithDayOfTheWeek(date);
    };

    scheduler.templates.CrewsTimeline_date = function (start, end) {

        var endDate = new Date(end);
        endDate.setDate(endDate.getDate() - 1);

        if (end.getTime() - start.getTime() === 86400000) {
            return formatDateByLocaleWithDayOfTheWeek(start);
        }

        return formatDateByLocaleWithDayOfTheWeek(start) + ' - ' + formatDateByLocaleWithDayOfTheWeek(endDate);
    };

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 'rgba(' + parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) + ',0.76)' : null;
    }

    function LightenDarkenColor(col, amt) {

        var usePound = false,
            num = void 0,
            r = void 0,
            b = void 0,
            g = void 0;

        if (col[0] === "#") {
            col = col.slice(1);
            usePound = true;
        }

        num = parseInt(col, 16);

        r = (num >> 16) + amt;

        if (r > 255) {
            r = 255;
        } else if (r < 0) {
            r = 0;
        }

        b = (num >> 8 & 0x00FF) + amt;

        if (b > 255) {
            b = 255;
        } else if (b < 0) {
            b = 0;
        }

        g = (num & 0x0000FF) + amt;

        if (g > 255) {
            g = 255;
        } else if (g < 0) {
            g = 0;
        }

        var returnVale = (usePound ? "#" : "") + (g | b << 8 | r << 16).toString(16);

        if (usePound && returnVale.length === 5 || !usePound && returnVale.length === 4) {
            returnVale += '00';
        }

        if (returnVale.length === 3) {
            returnVale = '#0000' + returnVale[1] + returnVale[2];
        }

        return returnVale;
    }
})();
'use strict';

CreateCrewLightbox.$inject = ['$rootScope', '$compile', 'DataService', 'UtilsService', 'RemoteActionsService'];

angular.module('Crews').factory('CreateCrewLightbox', CreateCrewLightbox);

function CreateCrewLightbox($rootScope, $compile, DataService, UtilsService, RemoteActionsService) {

    var crewColors = ['#8b8680', '#e5410f', '#f8611d', '#ffc455', '#facb00', '#dcda5c', '#7ac47a', '#23ca54', '#0faa6f', '#9c61b4', '#a99be8', '#f87393', '#eb686b', '#f16d60', '#ed6e91', '#d54409', '#0077be', '#3695e0', '#5eb6e7', '#61cae6'];

    // create a new scope
    var $scope = null;

    function open() {

        if ($scope) {
            return;
        }

        // create new isolated scope
        $scope = $rootScope.$new(true);

        init();
    }

    // basic init, copying stuff to scope and compiling
    function init() {

        $scope.closeLightbox = closeLightbox;
        $scope.createCrew = createCrew;
        $scope.dateSelector = dateSelector;
        $scope.formatDate = formatDate;
        $scope.getCrewsByTerritories = getCrewsByTerritories;
        $scope.getSelectedSkillsNames = getSelectedSkillsNames;
        $scope.getResources = DataService.getResources;
        $scope.validateResourceCanHaveScm = validateResourceCanHaveScm;
        $scope.getResourcesThatHaveStm = getResourcesThatHaveStm;
        $scope.activateCrew = activateCrew;
        $scope.checkStmOfInactiveCrew = checkStmOfInactiveCrew;
        $scope.generateLatestOrActiveStm = generateLatestOrActiveStm;
        $scope.showSkillsFilterBox = showSkillsFilterBox;
        $scope.nextStep = nextStep;
        $scope.timeChangeHandler = timeChangeHandler;
        $scope.validateDateForScm = validateDateForScm;

        $scope.crewIdToResourceId = {};
        $scope.resourcesWithStm = [];
        $scope.bringingResources = false;
        $scope.noValidResourcesForScm = false;
        $scope.resouceHasOverlappingScm = false;
        $scope.showColorPicker = false;
        $scope.crewColors = crewColors;

        $scope.crewsWithStms = {};
        $scope.colorBoxXY = {};
        $scope.crewsWithScms = {};
        $scope.inactiveCrewMembership = {};
        $scope.saving = false;
        $scope.error = null;
        $scope.skills = DataService.getSkills();
        $scope.territories = DataService.getLoadedTerritories();
        $scope.selectedSkills = {};
        $scope.step = 1;
        $scope.createNewCrew = '1';
        $scope.inactiveCrews = [];
        $scope.inactiveCrewsEnabled = function () {
            return $scope.inactiveCrews.length > 0;
        };

        $scope.hourStart = '0';
        $scope.minuteStart = '0';
        $scope.hourEnd = '23';
        $scope.minuteEnd = '59';
        $scope.minutesArray = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59'];
        $scope.hoursArray = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
        $scope.hoursLabels = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
        $scope.crewScmTimeError = false;

        handleAMPM();

        $scope.getColor = function (color) {
            return color ? '' : window.__crews.labels.NoColorSelected;
        };

        $scope.changeStep = function (step) {
            if ($scope.createNewCrew === '1') {
                $scope.step = step;
            }
        };

        var scmEnd = new Date(scheduler._min_date);
        var scmStart = new Date(scheduler._min_date);

        scmStart.setHours($scope.hourStart);
        scmStart.setMinutes($scope.minuteStart);
        scmEnd.setHours($scope.hourEnd);
        scmEnd.setMinutes($scope.minuteEnd);

        $scope.crewObject = {

            name: '',
            crewSize: 1,
            incativeCrewId: null,

            // STM Field
            stmTerritoryId: Object.keys($scope.territories)[0],
            stmStart: UtilsService.convertDateToUTC(scheduler._min_date, 'GMT'),
            stmEnd: null,

            // SCM fields
            scmStart: UtilsService.convertDateToUTC(scheduler._min_date, 'GMT'),
            scmEnd: UtilsService.convertDateToUTC(scmEnd, 'GMT'),
            scmResourceId: getCrewsByTerritories().length > 0 ? getCrewsByTerritories()[0].Id : null

        };

        $scope.getResourcesThatHaveStm();

        $scope.$watch('step', function (newValue) {
            if (newValue === 3) {
                $scope.validateResourceCanHaveScm();
            }
        });

        RemoteActionsService.callRemoteAction('getInactiveCrews', Object.keys($scope.territories)).then(function (inactiveCrews) {

            $scope.inactiveCrews = inactiveCrews;

            if (inactiveCrews[0]) {
                $scope.crewObject.incativeCrew = inactiveCrews[0];
                $scope.checkStmOfInactiveCrew($scope.crewObject.incativeCrew.Id);
            }
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getInactiveCrews --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });

        // add to body
        var lightboxDomElement = generateTemplate();
        angular.element('body').append(lightboxDomElement);

        // on destroy, remove DOM elements
        $scope.$on('$destroy', function () {
            return lightboxDomElement.remove();
        });

        // compile
        $compile(lightboxDomElement)($scope);

        UtilsService.safeApply($scope);
    }

    // esc - close lightbox
    document.addEventListener('keyup', function (e) {
        $scope && e.which === 27 && $scope.$evalAsync($scope.closeLightbox);
    });

    function dateSelector(id, dateType) {
        var bringRelevantResources = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        if (scheduler.isCalendarVisible()) {
            scheduler.destroyCalendar();
        } else {
            scheduler.renderCalendar({
                position: id,
                date: scheduler._date,
                navigation: true,
                handler: function handler(date, calendar) {

                    UtilsService.safeApply($scope, function () {

                        $scope.crewObject[dateType] = date;

                        if (dateType.indexOf('scm') > -1) {
                            $scope.validateResourceCanHaveScm();
                        }

                        if (bringRelevantResources) {
                            $scope.getResourcesThatHaveStm();
                        }

                        $scope.timeChangeHandler();
                        scheduler.destroyCalendar();
                    });
                }
            });
            // cfsl-985
            if (id.indexOf('stm-') > -1 && $(".LightboxBlackContainer").height() < 695) {
                $('.dhx_minical_popup').css('top', '185px');
            }
        }
    }

    function closeLightbox() {
        $scope.$destroy();
        $scope = null;
    }

    function handleAMPM() {
        if (window.__crews.isAMPM) {
            $scope.hoursLabels = ['12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
        }
    }

    function createCrew() {

        if ($scope.saving) {
            return;
        }

        if (!validateCrew()) {
            return;
        }

        var selectedSkillsIds = [];

        // add selected skills
        for (var id in $scope.selectedSkills) {
            $scope.selectedSkills[id] && selectedSkillsIds.push(id);
        }
        // let beforeSaveCrewObject = Object.assign({}, $scope.crewObject);

        $scope.crewObject.skillsIds = selectedSkillsIds.toString();

        $scope.crewObject.scmStart = UtilsService.convertDateToUTC($scope.crewObject.scmStart, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);
        $scope.crewObject.stmStart = UtilsService.convertDateToUTC($scope.crewObject.stmStart, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);
        if ($scope.crewObject.stmEnd) {
            var convertedStmEndToUTC = UtilsService.convertDateToUTC($scope.crewObject.stmEnd, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);
            var isSimilarToStartStm = new Date(convertedStmEndToUTC).getTime() === new Date($scope.crewObject.stmStart).getTime();
            $scope.crewObject.stmEnd = isSimilarToStartStm ? moment(new Date(convertedStmEndToUTC)).add(24, 'hours').toDate() : convertedStmEndToUTC;
        }
        if ($scope.crewObject.scmEnd) {
            var convertedScmEndToUTC = UtilsService.convertDateToUTC($scope.crewObject.scmEnd, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);
            var isSimilarToStartScm = new Date(convertedScmEndToUTC).getTime() === new Date($scope.crewObject.scmStart).getTime();
            $scope.crewObject.scmEnd = isSimilarToStartScm ? moment(new Date(convertedScmEndToUTC)).add(24, 'hours').toDate() : convertedScmEndToUTC;
        }

        $scope.saving = true;

        DataService.createCrew($scope.crewObject).then(function (data) {
            return $scope.closeLightbox();
        }).catch(function (ex) {
            $scope.error = ex.message;
            // $scope.crewObject = Object.assign({}, beforeSaveCrewObject);
            $scope.saving = false;
        });
    }

    function formatDate(type) {
        var scmSummary = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;


        if ($scope.crewObject[type]) {
            var dateType = scmSummary ? 'lll' : 'll';

            return moment($scope.crewObject[type]).format(dateType);
        }

        return window.__crews.labels.None;
    }

    function getCrewsByTerritories(id) {
        var resourcesArray = [],
            resources = DataService.getResources();

        for (var k in resources) {
            resourcesArray.push(resources[k]);
        }

        return resourcesArray;
    }

    function getSelectedSkillsNames() {

        var skillsNames = [];

        for (var k in $scope.selectedSkills) {
            $scope.selectedSkills[k] && skillsNames.push($scope.skills[k]);
        }

        return skillsNames.join(', ');
    }

    function validateCrew() {

        if (!$scope.crewObject.name) {
            alert(window.__crews.labels.NoCrewName);
            return false;
        }

        if ($scope.resouceHasOverlappingScm) {
            alert(window.__crews.labels.ResourceHasOverlappingSCM);
            return false;
        }

        return true;
    }

    function timeChangeHandler() {
        //Listening to changes from the time pickers
        $scope.crewObject.scmStart.setHours($scope.hourStart);
        $scope.crewObject.scmStart.setMinutes($scope.minuteStart);
        $scope.crewObject.scmEnd.setHours($scope.hourEnd);
        $scope.crewObject.scmEnd.setMinutes($scope.minuteEnd);

        $scope.validateDateForScm();
    }

    function validateDateForScm() {
        //checks the validity of the date that has picked
        var start = UtilsService.convertDateToUTC($scope.crewObject.scmStart, $scope.territories[$scope.crewObject.stmTerritoryId].timezone),
            end = UtilsService.convertDateToUTC($scope.crewObject.scmEnd, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);

        $scope.crewScmTimeError = start < end ? false : true;
    }

    function validateResourceCanHaveScm() {

        var start = UtilsService.convertDateToUTC($scope.crewObject.scmStart, $scope.territories[$scope.crewObject.stmTerritoryId].timezone),
            end = UtilsService.convertDateToUTC($scope.crewObject.scmEnd, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);

        RemoteActionsService.callRemoteAction('validateResourceCanHaveScm', $scope.crewObject.scmResourceId, $scope.crewObject.stmTerritoryId, start, end).then(function (result) {
            $scope.resouceHasOverlappingScm = !result;
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- validateResourceCanHaveScm --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });
    }

    function getResourcesThatHaveStm() {

        var start = UtilsService.convertDateToUTC($scope.crewObject.stmStart, $scope.territories[$scope.crewObject.stmTerritoryId].timezone),
            end = null;

        if ($scope.crewObject.stmEnd) {
            end = UtilsService.convertDateToUTC($scope.crewObject.scmEnd, $scope.territories[$scope.crewObject.stmTerritoryId].timezone);
        }

        $scope.bringingResources = true;

        RemoteActionsService.callRemoteAction('getResourcesThatHaveStm', $scope.crewObject.stmTerritoryId, start, end).then(function (resources) {

            $scope.bringingResources = false;

            //CFSL-1935
            var existingResourcesIds = {};
            $scope.resourcesWithStm = resources.filter(function (resource) {

                if (existingResourcesIds[resource.ServiceResourceId]) {
                    return false;
                }

                existingResourcesIds[resource.ServiceResourceId] = true;
                return true;
            });

            if (resources.length === 0) {
                $scope.noValidResourcesForScm = true;
                return;
            }

            $scope.noValidResourcesForScm = false;

            var found = false;
            for (var i = 0; i < resources.length; i++) {
                if ($scope.crewObject.scmResourceId === resources[i].ServiceResource.Id) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                $scope.crewObject.scmResourceId = resources[0].ServiceResource.Id;
            }
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getResourcesThatHaveStm --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });
    }

    function activateCrew() {

        if ($scope.saving || $scope.inactiveCrewMembership.scm.length === 0) {
            return;
        }

        $scope.saving = true;

        DataService.activateCrew($scope.crewObject.incativeCrew.Id).then(function (data) {
            return $scope.closeLightbox();
        }).catch(function (ex) {
            $scope.error = ex.message;
            $scope.saving = false;
        });
    }

    function generateLatestOrActiveStm() {

        var data = $scope.inactiveCrewMembership;

        if (Object.keys(data).length === 0) {
            return null;
        }

        if (data.activeStm) {
            return window.__crews.labels.InactiveCrewActiveStm.replace('$0', data.activeStm.ServiceTerritory.Name);
        } else if (data.lastActiveStm) {
            return window.__crews.labels.InactiveCrewPastStm.replace('$0', data.lastActiveStm.ServiceTerritory.Name);
        } else if (data.futureActiveStm) {
            return window.__crews.labels.InactiveCrewFutureStm.replace('$0', data.futureActiveStm.ServiceTerritory.Name);
        }
    }

    function checkStmOfInactiveCrew() {

        $scope.inactiveCrewMembership = {};

        RemoteActionsService.callRemoteAction('checkCrewBeforeActivation', $scope.crewObject.incativeCrew.Id, $scope.crewObject.incativeCrew.ServiceCrewId).then(function (data) {
            $scope.inactiveCrewMembership = data;
        });
    }

    function showSkillsFilterBox($event) {

        $event.stopPropagation();

        $scope.colorBoxXY.x = $event.currentTarget.getBoundingClientRect().left + 'px';
        $scope.colorBoxXY.y = $event.currentTarget.getBoundingClientRect().top + 34 + 'px';
    }

    function nextStep() {
        var justCheck = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


        if ($scope.step === 1 && $scope.crewObject.name && !$scope.noValidResourcesForScm) {
            !justCheck && $scope.step++;
            return true;
        }

        if ($scope.step === 3 && !$scope.resouceHasOverlappingScm && !$scope.crewScmTimeError) {
            !justCheck && $scope.step++;
            return true;
        }

        if ($scope.step === 2) {
            !justCheck && $scope.step++;
            return true;
        }

        return false;
    }

    function generateTemplate() {

        return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer">\n\n                        <div class="lightboxHeaderContainer">\n                            <svg aria-hidden="true" class="slds-icon CloseLightbox" ng-click="closeLightbox()">\n                                <use xlink:href="' + window.__crews.icons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header">' + window.__crews.labels.NewServiceCrew + '</h1>\n                        </div>\n\n                        <div class="lightboxContent">\n                        \n                            <div id="CC-saving-crew" ng-if="saving">\n                                <img src="' + window.__crews.icons.spinner + '" /><br />\n                                <span ng-show="createNewCrew == 1">' + window.__crews.labels.AddingCrew + '</span>\n                                <span ng-show="createNewCrew == 2">' + window.__crews.labels.ActivatingCrew + '</span>\n                            </div>\n                        \n                            <div class="scm-lb-error cc-error-lb" ng-show="error">\n                                <svg aria-hidden="true" class="slds-icon" ng-click="error = null">\n                                    <use xlink:href="' + window.__crews.icons.close + '"></use>\n                                </svg>\n                                \n                                {{error}}\n                            </div>\n                            \n                            \n                            <div class="scm-lb-saving" ng-show="saving">\n                                ' + window.__crews.labels.OnboardingSaving + '\n                            </div>\n                            \n                            <div id="CreateCrew-Progress" ng-class="{\'cc-disabled-progress\': createNewCrew == 2}">\n                            \n                                <div class="cc-step-title" ng-class="{\'CC-makeBold\' : step > 0}">' + window.__crews.labels.NewCrewDefention + '</div>\n                                <div class="cc-step-title" ng-class="{\'CC-makeBold\' : step > 1}">' + window.__crews.labels.NewCrewSkills + '</div>\n                                <div class="cc-step-title" ng-class="{\'CC-makeBold\' : step > 2}">' + window.__crews.labels.NewCrewAssignLeader + '</div>\n                                <div class="cc-step-title" ng-class="{\'CC-makeBold\' : step > 3}">' + window.__crews.labels.NewCrewSummary + '</div>\n                            \n                                <div id="CC-ProgressContainer">\n                                    <div id="CC-Progress" ng-style="{\'width\': 25 * step + \'%\'}"></div>\n                                </div>\n                            \n                            </div>\n                        \n                            \n                            <div ng-show="step == 1">\n                                \n                                <div class="CreateCrewLb-form-row">\n                                    \n                                    <div class="CC-NewOrInactivecontainer">\n                                        <input type="radio" name="CC-NewCrewRadio" id="CC-NewCrewRadio" ng-model="createNewCrew" value="1" />\n                                        <label for="CC-NewCrewRadio">' + window.__crews.labels.Createanewcrew + '</label>\n                                    </div>\n                                    \n                                    <div class="CC-NewOrInactivecontainer" ng-style="{opacity: inactiveCrews.length > 0 ? 1 : 0.4}">\n                                        <input type="radio" name="CC-ChooseInactive" id="CC-ChooseInactive" ng-model="createNewCrew" value="2" ng-disabled="inactiveCrews.length === 0" />\n                                        <label for="CC-ChooseInactive">' + window.__crews.labels.ChooseInactiveCrew + '</label>\n                                    </div>\n                                \n                                </div>\n                                \n                                <div class="CreateCrewLb-form-row" ng-show="createNewCrew == 2">\n                                    <label for="LB-InactiveCrewSelect">' + window.__crews.labels.SelectInactiveCrew + '</label>\n                                    <select id="LB-InactiveCrewSelect" ng-options="crew as crew.Name for crew in inactiveCrews" ng-model="crewObject.incativeCrew" ng-change="checkStmOfInactiveCrew(crew)">\n                                    </select>\n                                    \n                                    <a class="cc-link-blue" target="_blank" href="../{{crewObject.incativeCrew.ServiceCrewId}}">' + window.__crews.labels.Open_Service_Crew_Record + '</a>\n                                </div>\n                                \n                                <div ng-if="createNewCrew == 2">\n                                    {{ generateLatestOrActiveStm() }}                           \n                                </div>\n                                \n                                <div id="CC-issues-with-inactive-crew" ng-if="createNewCrew == 2 && generateLatestOrActiveStm() != null && inactiveCrewMembership.scm.length === 0">\n                                    ' + window.__crews.labels.NoScmForInactiveCrew + '                           \n                                </div>\n                                \n                                <div id="CC-recheck-inactive" ng-if="createNewCrew == 2" ng-click="checkStmOfInactiveCrew()">\n                                    ' + window.__crews.labels.RecheckInactive + '                           \n                                </div>\n                            \n                            \n                                <div class="CreateCrewLb-form-row CC-no-new-line" ng-show="createNewCrew == 1">\n                                    <label for="LB-CrewName">' + window.__crews.labels.ServiceCrewName + ' <span>*</span></label>\n                                    <input id="LB-CrewName" type="text" ng-model="crewObject.name" />\n                                </div>\n                                \n                    \n                                <div class="CreateCrewLb-form-row CC-no-new-line" ng-show="createNewCrew == 1">\n                                    <label for="LB-CrewSize">' + window.__crews.labels.CrewSize + '</label>\n                                    <input id="LB-CrewSize" type="number" min="1" max="100" ng-model="crewObject.crewSize" ng-paste="$event.preventDefault()" onkeydown="return false" />\n                                </div>\n                                \n                                \n                                <div>\n                                    <div class="CreateCrewLb-form-row CC-no-new-line" ng-show="createNewCrew == 1">\n                                        <label for="LB-CrewName">' + window.__crews.labels.Gantt_Label + '</label>\n                                        <input id="LB-CrewName" type="text" maxlength="80" ng-model="crewObject.label" />\n                                    </div>\n                                    \n                        \n                                    <div class="CreateCrewLb-form-row CC-no-new-line cc-create-color-container" ng-show="createNewCrew == 1">\n                                        <label>' + window.__crews.labels.Color + '</label>\n                                        <div id="LB-CrewColor" ng-click="showColorPicker = true; showSkillsFilterBox($event)">\n                                            <span  title="{{getColor(crewObject.color)}}" ng-class="{\'cc-crew-no-color\': !crewObject.color}" class="cc-color-box" ng-style="{background: crewObject.color}"></span>\n                                        </div>\n                                        \n                                        <div class="cm-body-overlay" ng-click="$parent.showColorPicker = false; $event.stopPropagation()" ng-if="showColorPicker" ng-style="{display: showColorPicker ? \'block\' : \'none\'}">\n                                            <div id="cc-color-picker" ng-style="{left: colorBoxXY.x, top: colorBoxXY.y}">\n                                               <span class="cc-color-box" ng-repeat="color in crewColors" ng-style="{background: color}" ng-click="crewObject.color = color; $parent.showColorPicker = false"></span>\n                                            </div>\n                                        </div>\n                                    </div>\n                                </div>\n                                \n                                \n                                <div ng-show="createNewCrew == 1">\n                                \n                                    <div class="cc-crew-stm-create">' + window.__crews.labels.AssignCrewToTerritory + '</div>\n                                \n                                    <div class="CreateCrewLb-form-row CC-no-new-line">\n                                        <label for="LB-CrewTerritory">' + window.__crews.labels.SelectTerritory + '</label>\n                                        \n                                        <select id="LB-CrewTerritory" ng-model="crewObject.stmTerritoryId" ng-change="getResourcesThatHaveStm()">\n                                            <option ng-repeat="(id,territory) in territories" ng-if="territory" value="{{id}}">{{territory.Name}}</option>\n                                        </select>\n                                        \n                                    </div>\n                                    \n                                        \n                                    <div class="CreateCrewLb-form-row CC-no-new-line" >\n                                        <label>' + window.__crews.labels.SummaryCrewEffectiveStart + '</label>\n                                        <span id="stm-start-date" class="scm-lb-date" ng-click="dateSelector(\'stm-start-date\', \'stmStart\', true)" ng-bind="formatDate(\'stmStart\')"></span>\n                                        <svg aria-hidden="true" class="slds-icon scm-lb-date-icon cc-date-icon-fix" ng-click="dateSelector(\'stm-start-date\', \'stmStart\', true)">\n                                            <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                        </svg>\n                                    </div>\n                                    \n                                        \n                                    <div class="CreateCrewLb-form-row CC-no-new-line">\n                                        <label>' + window.__crews.labels.SummaryCrewEffectiveEnd + '</label>\n                                        <span id="stm-end-date" class="scm-lb-date" ng-click="dateSelector(\'stm-end-date\', \'stmEnd\', true)" ng-bind="formatDate(\'stmEnd\')"></span>\n                                        <svg aria-hidden="true" class="slds-icon scm-lb-date-icon cc-date-icon-fix" ng-click="dateSelector(\'stm-end-date\', \'stmEnd\', true)">\n                                            <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                        </svg>\n                                        \n                                    </div>\n                                </div>\n                                \n                                \n                                <div id="CC-issues-no-valid-stm" ng-show="noValidResourcesForScm && createNewCrew == 1">\n                                    ' + window.__crews.labels.NoSTMinTerritoryForDates + '\n                                </div>\n                                \n                                \n                            </div>\n                            \n                            \n                            \n                            \n                            \n                            <div ng-show="step == 2" class="CreateCrewLb-form-row">\n                                                            \n                                <div class="cc-crew-stm-create">' + window.__crews.labels.SkillsToCrew + '</div>\n                                                            \n                                <div id="LB-SkillsSelector">\n                                \n                                    <div ng-repeat="(skillId, name) in skills" class="LB-SingleSkillSelector">\n                                        <input id="cs_+{{skillId}}" type="checkbox" ng-model="selectedSkills[skillId]" />\n                                        <label class="truncate" for="cs_+{{skillId}}">{{name}}</label>\n                                    </div>\n                                \n                                </div>\n                               \n                            </div>\n                            \n                            \n                           \n                            \n                            <div ng-show="step == 3">\n                            \n                                <div class="cc-crew-stm-create">' + window.__crews.labels.CreateScmLeader + '</div>\n                            \n                                <div class="CreateCrewLb-form-row CC-no-new-line">\n                                    <label for="LB-CrewLeader">' + window.__crews.labels.SelectCrewLeader + '</label>\n                                    <div id="CC-fetchingResources" ng-show="bringingResources">\n                                        <img src="' + window.__crews.icons.spinner + '" />\n                                        ' + window.__crews.labels.FetchingResources + '\n                                    </div>\n                                    <select id="LB-CrewLeader" ng-model="crewObject.scmResourceId" ng-change="validateResourceCanHaveScm()">\n                                        <option ng-repeat="resource in resourcesWithStm| orderBy : \'ServiceResource.Name\'" value="{{resource.ServiceResourceId}}">{{resource.ServiceResource.Name}}</option>\n                                    </select>\n                                </div>\n\n                                <br>\n                                \n                                <div class="CreateCrewLb-form-row CC-no-new-line scm-lb-select-margin-right">\n                                    <label>' + window.__crews.labels.Start_date + '</label>\n                                    <span id="scm-start-date" class="scm-lb-date" ng-click="dateSelector(\'scm-start-date\', \'scmStart\')" ng-bind="formatDate(\'scmStart\')"></span>\n                                    <svg aria-hidden="true" class="slds-icon scm-lb-date-icon cc-date-icon-fix" ng-click="dateSelector(\'scm-start-date\', \'scmStart\')">\n                                        <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                    </svg>\n                                    <select class="scm-lb-select scm-lb-select-width" ng-change="timeChangeHandler()" ng-model="hourStart">\n                                        <option ng-repeat="hour in hoursArray" value="{{+hour}}">{{hoursLabels[$index]}}</option>\n                                    </select>\n                                \n                                    <select class="scm-lb-select scm-lb-select-width" ng-change="timeChangeHandler()" ng-model="minuteStart">\n                                        <option ng-repeat="minute in minutesArray" value="{{+minute}}">{{minute}}</option>\n                                    </select>\n                                    \n                                </div>\n                                 \n                                <div class="CreateCrewLb-form-row CC-no-new-line">\n                                    <label>' + window.__crews.labels.EndDate + '</label>\n                                    <span id="scm-end-date" class="scm-lb-date" ng-click="dateSelector(\'scm-end-date\', \'scmEnd\')" ng-bind="formatDate(\'scmEnd\')"></span>\n                                    <svg aria-hidden="true" class="slds-icon scm-lb-date-icon cc-date-icon-fix" ng-click="dateSelector(\'scm-end-date\', \'scmEnd\')">\n                                        <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                    </svg>\n\n                                    <select class="scm-lb-select scm-lb-select-width" ng-change="timeChangeHandler()" ng-model="hourEnd">\n                                        <option ng-repeat="hour in hoursArray" value="{{+hour}}">{{hoursLabels[$index]}}</option>\n                                    </select>\n                                \n                                    <select class="scm-lb-select scm-lb-select-width" ng-change="timeChangeHandler()" ng-model="minuteEnd">\n                                        <option ng-repeat="minute in minutesArray" value="{{+minute}}">{{minute}}</option>\n                                    </select>\n                                    \n                                </div>\n\n                                <div id="CC-datetimeErrorMessageScm" ng-show="crewScmTimeError">\n                                    ' + window.__crews.labels.CrewMembershipDatetimeError + '\n                                </div>\n                                \n                                <div id="CC-resourceHasOverlappingScm" ng-show="resouceHasOverlappingScm">\n                                    ' + window.__crews.labels.ResourceOverlappingScm + '\n                                </div>\n                                \n                            </div>\n                            \n                            \n                            \n                            <div ng-show="step == 4">\n                            \n                                <div id="cc-summary">\n                                \n                                    <div class="cc-crew-stm-create">' + window.__crews.labels.SummaryFollowingCrew + '</div>\n                                \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.ServiceCrewName + ':</span>\n                                        <span class="cc-summary-value">{{ crewObject.name }}</span>\n                                    </div>\n                                    \n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewSize + '</span>\n                                        <span class="cc-summary-value">{{ crewObject.crewSize }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row" ng-show="crewObject.label ">\n                                        <span class="cc-summary-label">' + window.__crews.labels.Gantt_Label + ':</span>\n                                        <span class="cc-summary-value">{{ crewObject.label }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row" ng-show="crewObject.color">\n                                        <span class="cc-summary-label">' + window.__crews.labels.CrewColor + '</span>\n                                        <span class="cc-summary-value"><span class="cc-sum-color" ng-style="{background:crewObject.color}"></span></span>\n                                    </div>\n                                    \n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewSkills + '</span>\n                                        <span class="cc-summary-value" ng-show="getSelectedSkillsNames()">{{ getSelectedSkillsNames() }}</span>\n                                        <span class="cc-summary-value" ng-hide="getSelectedSkillsNames()">' + window.__crews.labels.SummaryCrewNoSkills + '</span>\n                                    </div>\n                                    \n                                    \n                                   \n                                    \n                                    <div class="cc-crew-stm-create" style="margin: 16px 0 10px 0;">' + window.__crews.labels.SummaryFollowingStm + '</div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewTerritory + '</span>\n                                        <span class="cc-summary-value">{{ territories[crewObject.stmTerritoryId].Name }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewEffectiveStart + '</span>\n                                        <span class="cc-summary-value">{{ formatDate(\'stmStart\') }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewEffectiveEnd + '</span>\n                                        <span class="cc-summary-value">{{ formatDate(\'stmEnd\') }}</span>\n                                    </div>\n                                    \n                                    \n                                    \n                                    \n                                    <div class="cc-crew-stm-create" style="margin: 16px 0 10px 0;">' + window.__crews.labels.SummaryFollowingScm + '</div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewResource + '</span>\n                                        <span class="cc-summary-value">{{ getResources()[crewObject.scmResourceId].Name }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewStart + '</span>\n                                        <span class="cc-summary-value">{{ formatDate(\'scmStart\' , true) }}</span>\n                                    </div>\n                                    \n                                    <div class="cc-summary-row">\n                                        <span class="cc-summary-label">' + window.__crews.labels.SummaryCrewEnd + '</span>\n                                        <span class="cc-summary-value">{{ formatDate(\'scmEnd\' , true) }}</span>\n                                    </div>\n                                \n                                \n                                </div>\n                                \n                                \n                                \n                                \n                            </div>\n                       \n                                                        \n                            <div class="scm-lb-footer" style="height:32px;">\n                                \n                                <div class="scm-lb-button" ng-show="createNewCrew == 1 &&  step === 4 && !saving" ng-click="createCrew()">' + window.__crews.labels.Save + '</div>\n                                <div class="scm-lb-button cc-next-back" ng-show="createNewCrew == 1 && step !== 4 && !saving" ng-click="nextStep()" ng-style="{opacity: !nextStep(true) ? 0.4 : 1, cursor: !nextStep(true) ? \'default\' : \'pointer\'}">' + window.__crews.labels.Next + '</div>\n                                <div class="scm-lb-button cc-next-back" ng-show="createNewCrew == 1 && step !== 1 && !saving" ng-click="step = step -1">' + window.__crews.labels.Back + '</div>\n                                \n                                <div class="scm-lb-button" ng-show="createNewCrew == 2" ng-class="{\'cc-default-cursor\': saving || inactiveCrewMembership.scm.length == 0}" ng-style="{opacity: saving || inactiveCrewMembership.scm.length == 0 ? 0.4 : 1}" ng-click="activateCrew()">' + window.__crews.labels.Activate + '</div>\n                            </div>\n                                                        \n                                                        \n                        </div>\n\n\n                    </div>\n                </div>');
    }

    // This will be our factory
    return {
        open: open
    };
}
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

DataService.$inject = ['$q', 'RemoteActionsService', 'UtilsService', '$rootScope'];

angular.module('Crews').factory('DataService', DataService);

function DataService($q, RemoteActionsService, UtilsService, $rootScope) {

    var resources = {},
        crews = {},
        serviceCrews = {},
        territories = {},
        allTerritories = {},
        loadedTerritories = {},
        skills = {},
        territoryMemberships = {},
        crewMemberships = {},
        operatingHours = {},
        gotResources = $q.defer(),
        visitedDays = {},
        services = {},
        selectedResourcesOnList = {},
        notFetchedSkillsList = [],
        firstLoad = true,
        skillsList = {},
        skillsClientList = [],
        policies = [];

    window.saTooltipFieldset = {};

    // init
    function init() {

        var def = $q.defer(),
            skillsDefer = null;

        // reset everything (but skills)
        resources = {};
        crews = {};
        territories = {};
        allTerritories = {};
        territoryMemberships = {};
        crewMemberships = {};
        operatingHours = {};
        visitedDays = {};
        serviceCrews = {};
        services = {};

        if (firstLoad) {
            skillsDefer = getSkills();
            getServiceAppointmentFieldset();
        }

        getResourcesAndTerritories().then(function () {

            // defer after skill done loading (territory changed)
            if (firstLoad) {
                skillsDefer.then(function () {
                    def.resolve();
                    gotResources.resolve();
                });
            }

            def.resolve();
            gotResources.resolve();
        });

        firstLoad = false;

        return def.promise;
    }

    init();

    function setSkillListFromServiceResourceSkills(resourceSkills, skillList) {
        resourceSkills.forEach(function (skill) {
            skillList[skill.SkillId] = Object.assign({}, skill.Skill);
        });
        return skillList;
    }

    // get resource and territories
    function getResourcesAndTerritories() {

        return RemoteActionsService.callRemoteAction('GetResourcesAndTerritories', window.__crews.loadedTerritories || []).then(function (data) {

            data.operatingHours.forEach(function (oh) {
                return operatingHours[oh.Id] = oh;
            });
            // iterate over all territories and throw error if there is no access to their OH 
            data.territories.forEach(function (territory) {
                var ohId = territory.OperatingHoursId;
                // no access to operating hours instance
                if (!operatingHours[ohId]) {
                    // add OH id to the error message and display it
                    $rootScope.NoAccessToOperatingHours = window.__crews.labels.NoAccessToOperatingHours.replace('$0', data.territories[0].OperatingHoursId);
                    $rootScope.disableOperatingHoursAccess = true;
                    // construct error
                    var error = {};
                    error.type = 'operatingHours';
                    error.message = ohId;
                    throw error;
                }
            });

            var withoutSharingTerritoriesByIds = data.withoutSharingTerritories.reduce(function (obj, item) {
                obj[item.Id] = item;
                return obj;
            }, {});

            // parse territories
            data.territories.forEach(function (t) {

                // territory must be active
                if (t.IsActive) {
                    territories[t.Id] = new CrewManagementTerritory(t, operatingHours[t.OperatingHoursId].TimeZone);

                    territories[t.Id]['hasSharing'] = withoutSharingTerritoriesByIds[t.Id] ? false : true;
                }
                allTerritories[t.Id] = new CrewManagementTerritory(t, operatingHours[t.OperatingHoursId].TimeZone);
            });
            // parse resources
            data.resources.forEach(processResource);

            var resourceMapIdsWithSkills = {};
            data.resourcesWithSkills.forEach(function (resourceSkills) {
                if (resourceSkills.ServiceResourceSkills && resourceSkills.ServiceResourceSkills.length > 0) {
                    resourceMapIdsWithSkills[resourceSkills.Id] = resourceSkills.ServiceResourceSkills;
                    //create skill list UI
                    skillsList = setSkillListFromServiceResourceSkills(resourceSkills.ServiceResourceSkills, skillsList);
                }
            });

            data.resources.forEach(function (resource) {

                if (resource.ServiceResourceSkills) {
                    skillsList = setSkillListFromServiceResourceSkills(resource.ServiceResourceSkills, skillsList);

                    if (resourceMapIdsWithSkills[resource.Id]) {
                        resource.ServiceResourceSkills = resource.ServiceResourceSkills.concat(resourceMapIdsWithSkills[resource.Id]);
                    }
                }
            });
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- GetResourcesAndTerritories --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });
    }

    //handle server data for stms, scms, absences and services
    function handleCrewDataRequests(requestedStartDate, requestedEndDate, offsetId, events) {
        var deferStmScmAbsencesServices = $q.defer();

        RemoteActionsService.callRemoteAction('getGanttStmScmAbsencesServices', requestedStartDate, requestedEndDate, window.__crews.loadedTerritories || [], offsetId).then(function (data) {
            //set stms in order to check length 
            var stms = data.stms;
            //merge server data and existed events
            events = !events ? Object.assign({}, data) : mergeStmScmAbsenceResponse(events, data);
            //check if next request needed 
            if (stms.length < window.__crews.maxSTMsToLoadEachBulkInCrewGantt) {
                //prepare data for crew gantt format
                var result = renderCrewDataFormat(requestedStartDate, requestedEndDate, events);
                deferStmScmAbsencesServices.resolve(result);
            } else {
                //set offsetId for next request
                var _offsetId = stms[stms.length - 1].Id;
                handleCrewDataRequests(requestedStartDate, requestedEndDate, _offsetId, events).then(deferStmScmAbsencesServices.resolve).catch(deferStmScmAbsencesServices.reject);
            }
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getGanttData --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferStmScmAbsencesServices.reject(err);
        });
        return deferStmScmAbsencesServices.promise;
    }

    function mergeStmScmAbsenceResponse(target, source) {
        for (var key in source) {
            if (Array.isArray(source[key])) {
                var _target$key;

                (_target$key = target[key]).push.apply(_target$key, _toConsumableArray(source[key]));
            } else if (_typeof(source[key]) === 'object' && source[key] !== null) {
                Object.assign(target[key], source[key]);
            }
        }
        return target;
    }

    function renderCrewDataFormat(requestedStartDate, requestedEndDate, data) {
        //set visited dates
        for (var newDate = new Date(requestedStartDate); newDate <= requestedEndDate; newDate.setDate(newDate.getDate() + 1)) {
            var key = UtilsService.generateDateKey(newDate);
            visitedDays[key] = true;
        }
        var ganttEvents = [];
        //Save stms and add territory memberships to resources AND territories
        data.stms.forEach(function (stm) {
            if (isTerritoryAvailable(stm.ServiceTerritoryId)) {
                processStm(stm);
            }
        });
        // Save scms and add crew memberships to resources
        data.scms.forEach(function (scm) {
            var newScms = processScm(scm);
            if (newScms.length > 0) {
                ganttEvents = ganttEvents.concat(newScms);
            }
        });

        // Save absences and add them to gantt events
        data.absences.forEach(function (absence) {
            var newAbsences = processAbsence(absence);
            if (newAbsences.length > 0) {
                ganttEvents = ganttEvents.concat(newAbsences);
            }
        });
        // save services
        data.services.forEach(function (service) {
            var newServices = processService(service, data.requiredServiceSkills, data.parents);
            if (newServices.length > 0) {
                ganttEvents = ganttEvents.concat(newServices);
            }
        });
        return ganttEvents;
    }

    // get gantt data - resolving parsed SCMs
    function getGanttData(requestedStartDate, requestedEndDate) {
        var checkDates = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;


        var deferStmScmAbsencesServices = $q.defer();
        var dataAlreadyAvailable = true;

        requestedStartDate = requestedStartDate || scheduler._min_date || new Date();
        requestedEndDate = requestedEndDate || scheduler._max_date || new Date();

        if (checkDates) {

            for (var newDate = new Date(requestedStartDate); newDate <= requestedEndDate; newDate.setDate(newDate.getDate() + 1)) {

                var key = UtilsService.generateDateKey(newDate);

                // one of the dates is not available locally, bring all
                if (!visitedDays[key]) {
                    dataAlreadyAvailable = false;
                    break;
                }
            }

            if (dataAlreadyAvailable) {
                deferStmScmAbsencesServices.resolve([]);
                return deferStmScmAbsencesServices.promise;
            }
        }
        return handleCrewDataRequests(requestedStartDate, requestedEndDate, null);
    }

    function processService(service, requiredServiceSkills, parents) {

        var resourceId = service.ServiceResources[0].ServiceResourceId,
            crewId = service.ServiceResources[0].ServiceCrewId,
            crew = crews[resourceId],
            ganttEvents = [];

        if (!crew) {
            return [];
        }

        for (var id in crew.territoryMemberships) {

            var copiedService = {},
                stm = crew.territoryMemberships[id];

            angular.copy(service, copiedService);

            // handle timezone n'stuff
            var startTimezoeOffset = UtilsService.getLocalDateOffsetOffset(service.SchedStartTime),
                endTimezoeOffset = UtilsService.getLocalDateOffsetOffset(service.SchedEndTime);

            copiedService.momentSchedStartTime = moment(copiedService.SchedStartTime + startTimezoeOffset).tz(stm.timezone);
            copiedService.momentSchedEndTime = moment(copiedService.SchedEndTime + endTimezoeOffset).tz(stm.timezone);

            copiedService.start_date = copiedService.momentSchedStartTime._d.getTime();
            copiedService.end_date = copiedService.momentSchedEndTime._d.getTime();

            // REMINDER: service id is ServiceCrewId_TerritoryId
            copiedService.resourceId = crewId + '_' + stm.ServiceTerritoryId;

            copiedService.text = copiedService.AppointmentNumber;
            copiedService.id = copiedService.Id + '_' + stm.ServiceTerritoryId;
            copiedService.territoryOnGantt = stm.ServiceTerritoryId;
            copiedService.crewOnGantt = crewId;
            copiedService.type = 'service';
            copiedService.readonly = true;
            copiedService.requiredSkills = requiredServiceSkills[copiedService.ParentRecordId] || [];
            copiedService.MinimumCrewSize = parents[copiedService.ParentRecordId] && parents[copiedService.ParentRecordId].MinimumCrewSize || '-';
            copiedService.RecommendedCrewSize = parents[copiedService.ParentRecordId] && parents[copiedService.ParentRecordId].RecommendedCrewSize || window.__crews.labels.CrewSizeUndefined;
            copiedService.timezone = stm.timezone;

            ganttEvents.push(copiedService);
        }

        return ganttEvents;
    }

    function processAbsence(absence) {

        absence.type = 'absence';

        var resource = resources[absence.ResourceId] || crews[absence.ResourceId],
            ganttEvents = [];

        // if resource has an STM, we need to add the absence
        if (resource && resource.territoryMemberships) {

            // initiate absences array of a resource
            resource.absences = resource.absences || {};

            // we are saving the unprocessed absence. we might not process it now but only after SCM was created for the resource.
            resource.absences[absence.Id] = absence;
            resource.absences[absence.Id].processed = false;

            // for crew resources, only iterate on their STMs
            if (resource.ResourceType == 'C') {

                for (var id in resource.territoryMemberships) {

                    var stm = resource.territoryMemberships[id],
                        ganttAbsence = createAbsence(absence, resource.ServiceCrewId, stm, true);

                    // save na on resource
                    resource.absences[ganttAbsence.Id] = ganttAbsence;
                    ganttEvents.push(ganttAbsence);
                }
            }

            // for technicians, iterate both on SCMs and STMs
            else {

                    for (var key in resource.crewMemberships) {

                        var currentCrewMembership = resource.crewMemberships[key];

                        for (var _id in resource.territoryMemberships) {

                            var _stm = resource.territoryMemberships[_id];

                            if (!shouldDrawAbsenceOnGantt(absence, _stm, currentCrewMembership)) {
                                continue;
                            }

                            var _ganttAbsence = createAbsence(absence, currentCrewMembership.ServiceCrewId, _stm, false);

                            // save na on resource
                            resource.absences[_ganttAbsence.Id] = _ganttAbsence;
                            ganttEvents.push(_ganttAbsence);
                        }
                    }
                }
        }
        return ganttEvents;
    }

    function shouldDrawAbsenceOnGantt(absence, stm, scm) {

        if (scm.territoryId !== stm.ServiceTerritoryId) {
            // SCM's and STM's territories not matching
            return false;
        }

        if (!stm.effectiveEndDateOriginal && stm.effectiveStartDateOriginal > absence.Start) {
            // no STM end date defined + STM starts after absence start
            return false;
        }

        if (stm.effectiveEndDateOriginal && (stm.effectiveStartDateOriginal > absence.Start || absence.Start > stm.effectiveEndDateOriginal)) {
            // has STM end date defined + absence does NOT intersect with STM interval
            return false;
        }

        return true;
    }

    function createAbsence(absence, serviceCrewId, stm, resourceTypeIsCrew) {

        var ganttAbsence = angular.copy(absence);

        ganttAbsence.id = ganttAbsence.Id + '_' + stm.ServiceTerritoryId + '_' + serviceCrewId;
        ganttAbsence.territoryId = stm.ServiceTerritoryId;
        ganttAbsence.processed = true;

        // RESOURCE ID on gantt is combination of RESOURCE, STM and CREW IDs
        if (resourceTypeIsCrew) {
            ganttAbsence.resourceId = serviceCrewId + '_' + stm.ServiceTerritoryId;
        } else {
            ganttAbsence.resourceId = ganttAbsence.ResourceId + '_' + stm.ServiceTerritoryId + '_' + serviceCrewId;
        }

        ganttAbsence.stmId = stm.Id;
        ganttAbsence.readonly = true;
        ganttAbsence.text = ganttAbsence.ServiceCrewMemberNumber;

        // remove local time diffrence
        var startTimezoeOffset = ganttAbsence.Start ? UtilsService.getLocalDateOffsetOffset(ganttAbsence.Start) : 0,
            endTimezoeOffset = ganttAbsence.End ? UtilsService.getLocalDateOffsetOffset(ganttAbsence.End) : 0;

        ganttAbsence.momentStart = moment(ganttAbsence.Start + startTimezoeOffset).tz(stm.timezone);
        ganttAbsence.momentEnd = moment(ganttAbsence.End + endTimezoeOffset).tz(stm.timezone);

        ganttAbsence.start_date = ganttAbsence.momentStart._d.getTime();
        ganttAbsence.end_date = ganttAbsence.momentEnd._d.getTime();

        return ganttAbsence;
    }

    function generateFilteredResourceGanttLabel(resource, searchTerms) {
        return UtilsService.generateResourceGanttLabel(resource, skills, false, searchTerms);
    }

    function processResource(r) {

        // not capacity based and active resources only
        if (!r.IsCapacityBased && r.IsActive) {

            // put to crews or resources object
            var destMap = r.ResourceType === 'C' ? crews : resources;

            destMap[r.Id] = r;
            destMap[r.Id].resourceId = r.Id;
            destMap[r.Id].label = UtilsService.generateResourceGanttLabel(r, skills, r.ResourceType === 'C');
            destMap[r.Id].crewMemberships = {};
            destMap[r.Id].territoryMemberships = {};

            if (r.ResourceType === 'C') {
                serviceCrews[r.ServiceCrewId] = r.ServiceCrew;
            }
        }
    }

    function processStm(stm) {

        var parsedStm = UtilsService.parseStm(stm, territories, operatingHours);

        if (!parsedStm) {
            return;
        }

        territoryMemberships[stm.Id] = stm;

        if (resources[stm.ServiceResourceId]) {
            resources[stm.ServiceResourceId].territoryMemberships[stm.Id] = stm;
        }

        if (crews[stm.ServiceResourceId]) {
            crews[stm.ServiceResourceId].territoryMemberships[stm.Id] = stm;
        }

        if (territories[stm.ServiceTerritoryId]) {
            territories[stm.ServiceTerritoryId].territoryMemberships[stm.Id] = stm;
        }
    }

    function doesCrewHasStm(crewId, territoryId, start, end) {

        var crew = null;

        for (var resourceId in crews) {

            if (crews[resourceId].ServiceCrewId === crewId) {
                crew = crews[resourceId];
                break;
            }
        }

        if (!crew) {
            return false;
        }

        var crewStms = crew.territoryMemberships;

        for (var stmId in crewStms) {

            var stm = crewStms[stmId];

            if (stm.ServiceTerritoryId === territoryId && UtilsService.isIntersect(start, end, stm.effectiveStartDateOriginal || new Date('1/1/2010'), stm.effectiveEndDateOriginal || new Date('1/1/2059'))) {
                return true;
            }
        }

        return false;
    }

    function processScm(scm) {

        scm.type = 'scm';
        crewMemberships[scm.Id] = scm;

        var resource = resources[scm.ServiceResourceId],
            ganttEvents = [];

        // if resource has an STM, we need to add the SCM
        if (resource && resource.territoryMemberships) {

            for (var id in resource.territoryMemberships) {

                var stm = resource.territoryMemberships[id],
                    ganttScm = angular.copy(scm);

                // SCM ID on gantt is combination of SCM and TERRITORY IDs
                ganttScm.id = ganttScm.Id + '_' + stm.ServiceTerritoryId;

                ganttScm.territoryId = stm.ServiceTerritoryId;

                // RESOURCE ID on gantt is combination of RESOURCE, STM and CREW IDs
                ganttScm.resourceId = ganttScm.ServiceResourceId + '_' + stm.ServiceTerritoryId + '_' + scm.ServiceCrewId;

                ganttScm.ganttColor = serviceCrews[scm.ServiceCrewId] && serviceCrews[scm.ServiceCrewId][window.__crews.fields.ServiceCrew.GanttColor__c] || null;

                ganttScm.stmId = stm.Id;
                ganttScm.stmType = stm.TerritoryType;

                ganttScm.text = ganttScm.ServiceCrewMemberNumber;

                // remove local time diffrence
                var startTimezoeOffset = ganttScm.StartDate ? UtilsService.getLocalDateOffsetOffset(ganttScm.StartDate) : 0,
                    endTimezoeOffset = ganttScm.EndDate ? UtilsService.getLocalDateOffsetOffset(ganttScm.EndDate) : 0;

                ganttScm.momentStartDate = ganttScm.StartDate ? moment(ganttScm.StartDate + startTimezoeOffset).tz(stm.timezone) : moment("2015-01-01T00:00:00").tz(stm.timezone);
                ganttScm.momentEndDate = ganttScm.EndDate ? moment(ganttScm.EndDate + endTimezoeOffset).tz(stm.timezone) : moment("2038-01-01T00:00:00").tz(stm.timezone);

                ganttScm.start_date = ganttScm.momentStartDate._d.getTime();
                ganttScm.end_date = ganttScm.momentEndDate._d.getTime();

                if (stm.ganttEffectiveStartDate >= ganttScm.end_date || stm.ganttEffectiveEndDate <= ganttScm.start_date) continue;

                // don't add this scm if the crew doesn't have stm to this territory
                if (!doesCrewHasStm(scm.ServiceCrewId, stm.ServiceTerritoryId, ganttScm.StartDate || new Date('1/1/2000'), ganttScm.EmdDate || new Date('1/1/2060'))) {
                    continue;
                }

                var isExist = false;
                if (ganttEvents.length > 0) {
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = ganttEvents[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var ExistingScm = _step.value;

                            if (ExistingScm.id === ganttScm.id) {
                                isExist = true;
                            }
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }
                }
                if (!isExist) {
                    ganttEvents.push(ganttScm);
                }
                resource.crewMemberships[ganttScm.id] = ganttScm;
            }
        }

        return ganttEvents;
    }

    // get all skills
    function getSkills() {

        return RemoteActionsService.callRemoteAction('getSkills').then(function (data) {
            data.forEach(function (d) {
                return skills[d.Id] = d.MasterLabel;
            });
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getSkills --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });
    }

    // get SA tooltip fieldset
    function getServiceAppointmentFieldset() {

        return RemoteActionsService.callRemoteAction('getServiceAppointmentTooltipFieldset').then(function (data) {

            for (var api in data) {

                window.__crews.saTooltipFieldset[api] = {
                    label: data[api][0],
                    type: data[api][1],
                    api: data[api][2]
                };
            }
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getServiceAppointmentFieldset --- !!!MAJOR FAILURE!!!');
            console.error(err);
        });
    }

    function getNotFetchedSkills(skillsIds) {
        return RemoteActionsService.callRemoteAction('getSkillsList', skillsIds).then(function (response) {
            skillsClientList = skillsClientList.concat(response);
            return skillsClientList;
        }).catch(function (ex) {
            console.log(ex);
            console.warn('unable to get skill list');
            return skillsClientList;
        });
    }

    function getSkillsFromResourcesList(skillListUserSettings) {

        for (var skill in skillListUserSettings) {
            if (!skillsList[skill] && skillListUserSettings[skill] === true) {
                notFetchedSkillsList.push(skill);
            }
        }
        skillsClientList = Object.values(skillsList);
        if (notFetchedSkillsList.length > 0) {
            //make server call only if fetchedSkills has skill
            return getNotFetchedSkills(notFetchedSkillsList);
        }
        return Promise.resolve(skillsClientList);
    }

    // save changes to SCM
    function saveChangesToScm(scmId, resourceId, crewId, territoryId, strStartDate, strEndDate, isLeader) {
        var forceCreation = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;


        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('saveChangesToScm', scmId, resourceId, crewId, territoryId, strStartDate, strEndDate, isLeader, forceCreation).then(function (data) {

            // this check is to see if resource has no stm
            if (data === false) {
                deferred.resolve(false);
                return;
            }

            deferred.resolve(processScm(data));
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- saveChangesToScm --- !!!MAJOR FAILURE!!!');
            console.error(err);
            //UtilsService.addError(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    // save multiple SCMs (only new)
    function saveMultipleScms(resourceIds, crewId, territoryId, strStartDate, strEndDate, isLeader) {
        var forceCreation = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;


        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('saveMultipleScms', resourceIds, crewId, territoryId, strStartDate, strEndDate, isLeader, forceCreation).then(function (data) {

            // some resources has no STM
            if (!Array.isArray(data)) {
                deferred.resolve(data);
                return;
            }

            var ganttEvents = [];
            data.forEach(function (scm) {

                var scms = processScm(scm);

                if (scms.length > 0) {
                    ganttEvents = ganttEvents.concat(scms);
                }

                // check if we have unprocessed absences
                var unprocessedAbsences = [],
                    resource = resources[scm.ServiceResourceId];

                if (resource && resource.absences) {

                    for (var id in resource.absences) {
                        if (!resource.absences[id].processed) {
                            unprocessedAbsences.push(resource.absences[id]);
                        }
                    }

                    unprocessedAbsences.forEach(function (absence) {

                        var newAbsences = processAbsence(absence);

                        if (newAbsences.length > 0) {
                            ganttEvents = ganttEvents.concat(newAbsences);
                        }
                    });
                }
            });

            deferred.resolve(ganttEvents);
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- saveMultipleScms --- !!!MAJOR FAILURE!!!');
            console.error(err);
            //UtilsService.addError(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    // delete SCM
    function deleteScm(scm) {

        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('deleteScm', scm.Id).then(function (data) {

            // deleting all SCM references
            delete crewMemberships[scm.Id];

            var crewMembershipsOnResource = resources[scm.ServiceResourceId].crewMemberships;

            var idsToDelete = [];
            for (var id in crewMembershipsOnResource) {
                if (id.includes(scm.Id)) {
                    idsToDelete.push(id);
                }
            }

            idsToDelete.forEach(function (id) {
                return delete crewMembershipsOnResource[id];
            });

            idsToDelete = [];
            for (var _id2 in scheduler._events) {
                if (_id2.includes(scm.Id)) {
                    idsToDelete.push(_id2);
                }
            }

            idsToDelete.forEach(function (id) {
                return delete scheduler._events[id];
            });

            deferred.resolve();
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- deleteScm --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function getCrewResource(resourceId) {

        for (var id in crews) {

            if (crews[id].ServiceCrewId === resourceId) {
                return crews[id];
            }
        }

        return null;
    }

    function validateAllServicesInView() {

        for (var eventId in scheduler._events) {

            var service = scheduler._events[eventId];

            // not in view or not a service, not interesting
            if (service.type !== 'service' || !UtilsService.isIntersect(service.start_date, service.end_date, scheduler._min_date, scheduler._max_date)) {
                continue;
            }

            if (service.type === 'service') {
                initMissingSkills(service);
            }

            service.availableMembersCount = 0;

            for (var id in scheduler._events) {

                var scm = scheduler._events[id];

                if (scm.type !== 'scm') {
                    continue;
                }

                // service INSIDE scm (timeframes), same crew and same territory
                if (scm.start_date <= service.start_date && service.end_date <= scm.end_date && scm.ServiceCrewId === service.crewOnGantt && scm.territoryId === service.territoryOnGantt) {

                    service.availableMembersCount++;

                    // check skills
                    checkSkillMatching(service, scm.ServiceResourceId);
                }
            }
        }

        scheduler._is_initialized() && scheduler.updateView();
    }

    function initMissingSkills(service) {
        service.missingSkills = angular.copy(service.requiredSkills);
        service.missingSkills.forEach(function (skill) {
            return skill.missing = true;
        });
        service.totalMissingSkills = service.missingSkills.length;
    }

    function checkSkillMatching(service, resourceId) {

        var resource = resources[resourceId];

        resource && resource.ServiceResourceSkills && resource.ServiceResourceSkills.forEach(function (resourceSkill) {

            for (var i = 0; i < service.missingSkills.length; i++) {

                if (resourceSkill.SkillId === service.missingSkills[i].SkillId) {

                    var resourceSkillLevel = resourceSkill.SkillLevel || 1,
                        serviceSkillLevel = service.missingSkills[i].SkillLevel || 1;

                    if (serviceSkillLevel <= resourceSkillLevel) {
                        service.missingSkills[i].missing = false;
                        service.totalMissingSkills--;
                    }
                }
            }
        });
    }

    function getLoadedTerritories() {

        var loadedTerritories = {};

        // window.__crews.loadedTerritories.forEach(id => territories[id]!=undefined  loadedTerritories[id] = territories[id]);
        window.__crews.loadedTerritories.forEach(function (id) {
            if (territories[id] != undefined) {
                loadedTerritories[id] = territories[id];
            }
        });

        return loadedTerritories;
    }

    function getCandidates(serviceId) {

        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('getCandidates', serviceId, window.__crews.settings[__crews.fields.Crew_Management_User_Setting.SchedulingPolicy__c]).then(function (data) {
            deferred.resolve(data);
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getCandidates --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    // activate a crew
    function activateCrew(resourceId) {

        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('activateCrew', resourceId).then(function (resource) {

            processResource(resource[0]);

            var start = new Date(scheduler._min_date),
                end = new Date(scheduler._max_date);

            start.setHours(start.getHours() - 120);
            end.setHours(end.getHours() + 120);

            getGanttData(start, end, false).then(function (ganttScms) {
                scheduler.parse(ganttScms, 'json');
                $rootScope.$broadcast('createGanttTimeline');
                deferred.resolve(resource);
            });
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- createCrew --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    // Create new crew
    function createCrew(crewObject) {

        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('createNewCrew', crewObject).then(function (data) {

            processResource(data.resource);
            processStm(data.stm[0]);
            scheduler.parse(processScm(data.scm[0]), 'json');
            $rootScope.$broadcast('createGanttTimeline');

            deferred.resolve(data);
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- createCrew --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function getUserSettingByProperty(field) {

        var deferred = $q.defer();

        RemoteActionsService.callRemoteAction('getUserSettingByProperty', field).then(function (data) {
            deferred.resolve(data);
        }).catch(function (err) {
            console.warn('!!!MAJOR FAILURE!!! --- getUserSettings --- !!!MAJOR FAILURE!!!');
            console.error(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function isTerritoryAvailable(territoryId) {
        return !!territories[territoryId];
    }

    function setUserSetting(field, value, type) {

        RemoteActionsService.callRemoteAction('setUserSettings', field, value, type).then(function (updatedSettings) {

            for (var key in updatedSettings) {
                window.__crews.settings[key] = updatedSettings[key];
            }
        });
    }

    // get scheduling policies
    RemoteActionsService.callRemoteAction('getPolicies').then(function (fetchedPolicies) {

        policies.push.apply(policies, _toConsumableArray(fetchedPolicies));

        if (!window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SchedulingPolicy__c]) {
            window.__crews.settings[window.__crews.fields.Crew_Management_User_Setting.SchedulingPolicy__c] = policies[0].Id;
        }
    }).catch(function (err) {
        console.warn('!!!MAJOR FAILURE!!! --- getPolicies --- !!!MAJOR FAILURE!!!');
        console.error(err);
    });

    return {
        init: init,
        getGanttData: getGanttData,
        getResources: function getResources() {
            return resources;
        },
        getTerritories: function getTerritories() {
            return territories;
        },
        getAllTerritories: function getAllTerritories() {
            return allTerritories;
        },
        getSkills: function getSkills() {
            return skills;
        },
        getTerritoryMemberships: function getTerritoryMemberships() {
            return territoryMemberships;
        },
        getCrewMemberships: function getCrewMemberships() {
            return crewMemberships;
        },
        getResourcesPromise: function getResourcesPromise() {
            return gotResources;
        },
        getOperatingHours: function getOperatingHours() {
            return operatingHours;
        },
        getCrews: function getCrews() {
            return crews;
        },
        getServices: function getServices() {
            return services;
        },
        getSelectedResourcesOnList: function getSelectedResourcesOnList() {
            return selectedResourcesOnList;
        },
        saveChangesToScm: saveChangesToScm,
        saveMultipleScms: saveMultipleScms,
        deleteScm: deleteScm,
        getCrewResource: getCrewResource,
        getSkillsFromResourcesList: getSkillsFromResourcesList,
        validateAllServicesInView: validateAllServicesInView,
        getCandidates: getCandidates,
        getLoadedTerritories: getLoadedTerritories,
        createCrew: createCrew,
        getUserSettingByProperty: getUserSettingByProperty,
        activateCrew: activateCrew,
        setUserSetting: setUserSetting,
        getPolicies: function getPolicies() {
            return policies;
        },
        generateFilteredResourceGanttLabel: generateFilteredResourceGanttLabel
    };
}
'use strict';

GeneralLightbox.$inject = ['$rootScope', '$sce', '$compile', 'UtilsService'];

angular.module('Crews').factory('GeneralLightbox', GeneralLightbox);

function GeneralLightbox($rootScope, $sce, $compile, UtilsService) {

    // create a new scope
    var $scope = null;

    function open(title, urlOrTabs) {
        var extendedId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;


        if ($scope) {
            return;
        }

        // create new isolated scope
        $scope = $rootScope.$new(true);

        // page urls
        if (window.Array.isArray(urlOrTabs)) {

            $scope.tabs = urlOrTabs;
            urlOrTabs.forEach(function (tab) {
                tab.url = $sce.trustAsResourceUrl(tab.url).toString();
            });

            $scope.activeTabIndex = 0;
        } else {

            // no tabs, just one view
            $scope.url = $sce.trustAsResourceUrl(urlOrTabs).toString();
        }

        $scope.title = title;
        $scope.extendedId = extendedId;

        $scope.closeLightbox = closeLightbox;
        $scope.openConsoleTab = UtilsService.openConsoleTab;

        $scope.changeActiveTab = function (i) {
            return $scope.activeTabIndex = i;
        };

        // add to body
        var lightboxDomElement = generateTemplate();
        angular.element('body').append(lightboxDomElement);

        // on destroy, remove DOM elements
        $scope.$on('$destroy', function () {
            return lightboxDomElement.remove();
        });

        // compile
        $compile(lightboxDomElement)($scope);

        safeApply($scope);
    }

    // esc - close lightbox
    document.addEventListener('keyup', function (e) {

        if ($scope && e.which === 27) {
            $scope.$evalAsync($scope.closeLightbox);
        }
    });

    function closeLightbox() {
        $scope.$destroy();
        $scope = null;
    }

    function safeApply(scope, fn) {

        var phase = scope.$root.$$phase;

        if (phase === '$apply' || phase === '$digest') {
            if (fn && typeof fn === 'function') {
                fn();
            }
        } else {
            scope.$apply(fn);
        }
    }

    function generateTemplate() {

        return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer">\n\n                        <div class="lightboxHeaderContainer">\n                            <svg aria-hidden="true" class="slds-icon CloseLightbox" ng-click="closeLightbox()">\n                                <use xlink:href="' + window.__crews.icons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header" ng-bind="title"></h1>\n                            \n                            <span ng-if="tabs" class="cm-lb-tab" ng-class="{\'cm-lb-active-tab\': activeTabIndex === $index}" ng-click="changeActiveTab($index)" ng-repeat="tab in tabs">\n                                {{ tab.name }}\n                            </span>\n                            \n                            <a class="cm-layout-link" ng-show="extendedId" ng-click="openConsoleTab($event, extendedId)" target="_blank" href="../{{ extendedId }}" title="' + window.__crews.labels.OpenInLayout + '">\n                                <svg aria-hidden="true" class="slds-icon">\n                                    <use xlink:href="' + window.__crews.icons.external + '"></use>\n                                </svg>\n                            </a>\n                            \n                        </div>\n\n                        <div class="lightboxContent">\n                            \n                            <iframe  ng-if="!tabs" ng-src="{{ url }}" class="resourceLightboxIframe"></iframe>\n                            \n                            <iframe  ng-if="tabs" ng-show="activeTabIndex === $index" ng-repeat="tab in tabs" ng-src="{{ tab.url }}" class="resourceLightboxIframe"></iframe>\n                            \n                        </div>\n\n\n                    </div>\n                </div>');
    }

    // This will be our factory
    return {
        open: open
    };
}
'use strict';

GetCrewCandidates.$inject = ['$rootScope', '$compile', 'UtilsService', 'DataService', 'GeneralLightbox'];

angular.module('Crews').factory('GetCrewCandidates', GetCrewCandidates);

function GetCrewCandidates($rootScope, $compile, UtilsService, DataService, GeneralLightbox) {

    // create a new scope
    var $scope = null;
    var isdtpUrlAddon = '&isdtp=p1'; //W-15630542

    function get(service) {

        if ($scope) {
            closeGetCandidates();
        }

        window.__currentCandidatesServiceId = service.id;

        // create new isolated scope
        $scope = $rootScope.$new(true);

        $scope.service = service;
        $scope.closeGetCandidates = closeGetCandidates;
        $scope.currentAssignedResources = getCurrentAssignedResources();
        $scope.getRelevantResources = getRelevantResources();
        $scope.openResourceLightbox = openResourceLightbox;
        $scope.openServiceLightbox = openServiceLightbox;
        $scope.getMissingSkillsForCandidate = getMissingSkillsForCandidate;
        $scope.getSelectedResourcesOnList = DataService.getSelectedResourcesOnList;
        $scope.getSelectedResources = getSelectedResources;
        $scope.hasCandidatesWithoutSkills = hasCandidatesWithoutSkills;
        $scope.hasCandidatesWithSkills = hasCandidatesWithSkills;
        $scope.assignSelected = assignSelected;
        $scope.saving = false;
        $scope.candidates = {};
        $scope.isEmpty = function (obj) {
            return Object.keys(obj).length === 0;
        };
        $scope.loading = true;
        $scope.hasCandidates = hasCandidates;
        $scope.error = null;
        $scope.insufficientSkillLevel = [];
        $scope.invalidSkillDate = [];

        DataService.getCandidates(service.Id).then(function (data) {

            $scope.candidates = data.ResourceIDToScheduleData;
            delete $scope.candidates[service.ServiceResources[0].ServiceResourceId];

            var realCandidates = {};

            // remove all resources that are from territories that are not loaded
            var resources = DataService.getResources();
            for (var id in $scope.candidates) {

                if (resources[id]) {
                    realCandidates[id] = $scope.candidates[id];
                }
            }

            $scope.candidates = realCandidates;

            getRelevantResources2();
        }).catch(function (ex) {
            $scope.error = ex.message;
        }).finally(function () {
            $scope.loading = false;
        });

        // unselect all resources
        var selectedResources = DataService.getSelectedResourcesOnList();
        for (var key in selectedResources) {
            selectedResources[key] = false;
        }

        $scope.$on('updateCandidates', function () {

            $scope.currentAssignedResources = getCurrentAssignedResources();
            $scope.currentAssignedResources.forEach(function (resource) {
                return delete $scope.candidates[resource.Id];
            });
            getRelevantResources2();
        });

        $scope.getMissingSkills = function () {
            return $scope.service.missingSkills.filter(function (skill) {
                return skill.missing;
            });
        };

        $scope.generateSkillsSentence = function (resourceSkills) {
            return UtilsService.generateSkillsSentence(resourceSkills, DataService.getSkills());
        };

        // add to body
        var getCandidatesDOMElement = generateTemplate();
        angular.element('#ResourceFiltersContainer').append(getCandidatesDOMElement);

        // on destroy, remove DOM elements
        $scope.$on('$destroy', function () {
            return getCandidatesDOMElement.remove();
        });

        // compile
        $compile(getCandidatesDOMElement)($scope);

        UtilsService.safeApply($scope);
        scheduler.updateView();
    }

    function closeGetCandidates() {

        // unselect all resources
        var selectedResources = DataService.getSelectedResourcesOnList();
        for (var key in selectedResources) {
            selectedResources[key] = false;
        }

        window.__currentCandidatesServiceId = null;
        $scope.$destroy();
        $scope = null;
        scheduler.updateView();
    }

    function openServiceLightbox() {

        var tabs = [{ name: window.__crews.labels.Details, url: window.__crews.pages.service + '?id=' + $scope.service.Id }];

        if ($scope.service.ParentRecordType === 'WorkOrder') {
            tabs.push({ name: window.__crews.labels.WorkOrder, url: window.__crews.pages.workorder + '?id=' + $scope.service.ParentRecordId + isdtpUrlAddon });
        } else {
            tabs.push({ name: window.__crews.labels.WOLI, url: window.__crews.pages.woli + '?id=' + $scope.service.ParentRecordId + isdtpUrlAddon });
        }

        GeneralLightbox.open($scope.service.AppointmentNumber, tabs, $scope.service.Id);
    }

    function openResourceLightbox(name, id, ev) {
        ev.stopPropagation();
        GeneralLightbox.open(name, window.__crews.pages.resource + '?id=' + id + isdtpUrlAddon, id);
    }

    function getSelectedResources() {

        var r_selectedResources = [],
            selectedResources = DataService.getSelectedResourcesOnList();

        for (var key in selectedResources) {
            if (selectedResources[key]) {
                r_selectedResources.push(key);
            }
        }

        return r_selectedResources;
    }

    function assignSelected() {

        if ($scope.saving) {
            return;
        }

        var selectedResourcesIds = getSelectedResources(),
            startDate = UtilsService.convertDateToUTC($scope.service.start_date, $scope.service.timezone),
            endDate = UtilsService.convertDateToUTC($scope.service.end_date, $scope.service.timezone);

        $scope.saving = true;

        // save changes to service
        DataService.saveMultipleScms(selectedResourcesIds, $scope.service.crewOnGantt, $scope.service.territoryOnGantt, startDate, endDate, false, true).then(function (data) {

            // unselect all resources
            var selectedResources = DataService.getSelectedResourcesOnList();
            for (var key in selectedResources) {
                selectedResources[key] = false;
            }

            data.forEach(function (scm) {
                delete $scope.candidates[scm.ServiceResourceId];
            });

            scheduler.parse(data, 'json');
            DataService.validateAllServicesInView();
            $rootScope.$broadcast('createGanttTimeline');
            $rootScope.$broadcast('updateCandidates');
        }).catch(function (err) {
            console.log(err);
            UtilsService.addError(err.message);
        }).finally(function () {
            $scope.saving = false;
        });
    }

    function getMissingSkillsForCandidate(resourceSkills) {

        if (!resourceSkills) {
            return '';
        }

        var skills = resourceSkills.filter(function (skill) {

            for (var i = 0; i < $scope.service.missingSkills.length; i++) {

                var serviceSkill = $scope.service.missingSkills[i];

                if (serviceSkill.missing && serviceSkill.SkillId === skill.SkillId) {

                    var resourceSkillLevel = skill.SkillLevel || 1,
                        serviceSkillLevel = serviceSkill.SkillLevel || 1;

                    if (serviceSkillLevel <= resourceSkillLevel) {
                        return true;
                    }
                }
            }

            return false;
        });

        return UtilsService.generateSkillsSentence(skills, DataService.getSkills());
    }

    function getCurrentAssignedResources() {

        var resources = DataService.getResources(),
            assignedResources = [];

        for (var resourceId in resources) {

            var resource = resources[resourceId];

            for (var scmId in resource.crewMemberships) {

                var scm = resource.crewMemberships[scmId];

                // scm to different crew
                if ($scope.service.crewOnGantt !== scm.ServiceCrewId) {
                    continue;
                }

                // service INSIDE scm
                if (scm.start_date <= $scope.service.start_date && $scope.service.end_date <= scm.end_date) {
                    assignedResources.push(resource);
                    break;
                }
            }
        }

        return assignedResources;
    }

    function getRelevantResources2() {

        var serviceSkillStartTime = $scope.service.SchedStartTime;
        var serviceSkillEndTime = $scope.service.SchedEndTime;
        $scope.insufficientSkillLevel = [];
        $scope.invalidSkillDate = [];

        var currentAssignedResourcesIds = $scope.currentAssignedResources.map(function (r) {
            return r.Id;
        }),
            resources = DataService.getResources();

        for (var resourceId in $scope.candidates) {

            var resource = resources[resourceId];

            resource.currentlyAssigned = currentAssignedResourcesIds.length !== 0 && currentAssignedResourcesIds.indexOf(resourceId) > -1;

            $scope.candidates[resourceId].resource = resource;
            $scope.candidates[resourceId].relevantSkills = [];

            // check if resource has at least one of the required skills
            for (var i = 0; i < $scope.service.requiredSkills.length; i++) {

                var serviceSkill = $scope.service.requiredSkills[i];

                if (!resource.ServiceResourceSkills) {
                    $scope.candidates[resourceId].resource = resource;
                    $scope.candidates[resourceId].relevantSkills = [];
                    continue;
                }

                for (var j = 0; j < resource.ServiceResourceSkills.length; j++) {

                    var resourceSkill = resource.ServiceResourceSkills[j];

                    if (serviceSkill.SkillId === resourceSkill.SkillId) {

                        var resourceSkillLevel = resourceSkill.SkillLevel || 1,
                            serviceSkillLevel = serviceSkill.SkillLevel || 1,
                            resourceSkillStartTime = resourceSkill.EffectiveStartDate || 0,
                            resourceSkillEndTime = resourceSkill.EffectiveEndDate || Infinity;
                        // relevant skill level is sufficient
                        if (serviceSkillLevel <= resourceSkillLevel) {
                            // relevant skill date is valid
                            if (resourceSkillEndTime >= serviceSkillStartTime && resourceSkillStartTime <= serviceSkillEndTime) {
                                $scope.candidates[resourceId].resource = resource;
                                $scope.candidates[resourceId].relevantSkills = $scope.candidates[resourceId].relevantSkills || [];
                                $scope.candidates[resourceId].relevantSkills.push(resourceSkill);
                            }
                            // relevant skill is invalid
                            else {
                                    $scope.invalidSkillDate.push(resourceSkill.ServiceResourceId);
                                }
                        }
                        // relevant skill level is insufficient
                        else {
                                $scope.insufficientSkillLevel.push(resourceSkill.ServiceResourceId);
                            }
                    }
                }
            }
        }
    }

    function hasCandidatesWithoutSkills() {

        if ($scope.service.requiredSkills.length === 0) {
            return false;
        }

        for (var key in $scope.candidates) {

            if ($scope.candidates[key].relevantSkills.length === 0) {
                return true;
            }
        }

        return false;
    }

    function hasCandidatesWithSkills() {

        if ($scope.service.requiredSkills.length === 0 && Object.keys($scope.candidates).length > 0) {
            return true;
        }

        for (var key in $scope.candidates) {

            if ($scope.candidates[key].relevantSkills.length > 0) {
                return true;
            }
        }

        return false;
    }

    function hasCandidates() {
        var noSkills = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


        for (var key in $scope.candidates) {

            // CFSL-678: SA has no skills, if we have 1 candidates that's ok
            if ($scope.service.requiredSkills.length === 0) {
                return true;
            }

            if (noSkills && $scope.candidates[key].relevantSkills.length === 0) {
                return true;
            }

            if (!noSkills && $scope.candidates[key].relevantSkills.length > 0) {
                return true;
            }
        }

        return false;
    }

    function getRelevantResources() {

        var relevantResources = {},
            resources = DataService.getResources();

        var _loop = function _loop(resourceId) {

            // check if resource is already assigned
            if ($scope.currentAssignedResources.find(function (assignee) {
                return assignee.Id === resourceId;
            })) {
                return 'continue';
            }

            var resource = resources[resourceId],
                isAssignedToOtherCrew = false;

            // need to check that the resource is not assigned to another crew
            for (var scmId in resource.crewMemberships) {

                var scm = resource.crewMemberships[scmId];

                if (UtilsService.isIntersect($scope.service.start_date, $scope.service.end_date, scm.start_date, scm.end_date)) {

                    if ($scope.service.crewOnGantt !== scm.ServiceCrewId) {
                        isAssignedToOtherCrew = true;
                    }
                }
            }

            // assigned to another crew
            if (isAssignedToOtherCrew) {
                return 'continue';
            }

            // check for intersecting NAs
            if (resource.absences) {

                var foundIntersectingAbsence = false;

                for (var id in resource.absences) {

                    var absence = resource.absences[id];

                    if (UtilsService.isIntersect($scope.service.start_date, $scope.service.end_date, absence.start_date, absence.end_date)) {
                        foundIntersectingAbsence = true;
                        break;
                    }
                }

                if (foundIntersectingAbsence) {
                    return 'continue';
                }
            }

            // check available STMs
            for (var stmId in resource.territoryMemberships) {

                var stm = resource.territoryMemberships[stmId];

                // no stm to territory
                if ($scope.service.territoryOnGantt !== stm.ServiceTerritoryId) {
                    continue;
                }

                // service not in stm
                if (stm.ganttEffectiveStartDate > $scope.service.start_date || $scope.service.end_date > stm.ganttEffectiveEndDate) {
                    break;
                }

                // service has no required skills so the resource is a candidate
                if ($scope.service.requiredSkills.length === 0) {

                    relevantResources[resourceId] = relevantResources[resourceId] || {};
                    relevantResources[resourceId].resource = resource;
                    relevantResources[resourceId].relevantSkills = [];
                }

                // check if resource has at least one of the required skills
                for (var i = 0; i < $scope.service.requiredSkills.length; i++) {

                    var serviceSkill = $scope.service.requiredSkills[i];

                    if (!resource.ServiceResourceSkills) {
                        continue;
                    }

                    for (var j = 0; j < resource.ServiceResourceSkills.length; j++) {

                        var resourceSkill = resource.ServiceResourceSkills[j];

                        if (serviceSkill.SkillId === resourceSkill.SkillId) {

                            var resourceSkillLevel = resourceSkill.SkillLevel || 1,
                                serviceSkillLevel = serviceSkill.SkillLevel || 1;

                            if (serviceSkillLevel <= resourceSkillLevel) {

                                relevantResources[resourceId] = relevantResources[resourceId] || {};
                                relevantResources[resourceId].resource = resource;
                                relevantResources[resourceId].relevantSkills = relevantResources[resourceId].relevantSkills || [];
                                relevantResources[resourceId].relevantSkills.push(resourceSkill);
                            }
                        }
                    }
                }
            }
        };

        for (var resourceId in resources) {
            var _ret = _loop(resourceId);

            if (_ret === 'continue') continue;
        }

        return relevantResources;
    }

    function generateTemplate() {

        return angular.element('\n                <div id="cm-GetCandidates">\n                    \n                    <div id="cm-CandidatesHeader">\n                        \n                        <h1 class="cm-candidate-title"> ' + window.__crews.labels.CrewCandidatesFor + ' <u ng-click="openServiceLightbox()">{{service.AppointmentNumber}}</u></h1>\n                        \n                        <span ng-click="closeGetCandidates()" id="cm-close-get-candidates" class="truncate" title="' + window.__crews.labels.Close + '">' + window.__crews.labels.Close + '</span>\n                        \n                        <div class="cm-candidate-service-details">\n                            <b>' + window.__crews.labels.MinimumSize + ':</b> {{ service.MinimumCrewSize }} (current assigned: {{service.availableMembersCount}})<br/>\n                            <b>' + window.__crews.labels.RecommendedSize + ':</b> {{ service.RecommendedCrewSize }}<br/>\n                            <b>' + window.__crews.labels.RequiredSkillsCm + '</b> {{ generateSkillsSentence(service.requiredSkills) }}<br/>\n                            <b>' + window.__crews.labels.MissingSkills2 + ':</b> {{ generateSkillsSentence(getMissingSkills()) || "' + window.__crews.labels.NoSkillsMissings + '" }}\n                        </div>\n                    </div>\n                    \n                    <div class="cm-candidates-list" ng-show="!loading && !error">\n                        \n                        <h1>' + window.__crews.labels.CurrentMembers + '</h1>\n                        \n                        <div ng-repeat="resource in currentAssignedResources" class="cm-assigned-resource-candidate">\n\n                            <h2 ng-click="openResourceLightbox(resource.Name, resource.Id, $event)">{{resource.Name}}</h2>\n                            <div>' + window.__crews.labels.SkillsNekudotaim + ' {{ generateSkillsSentence(resource.ServiceResourceSkills) }}</div>\n                            \n                        </div>\n                        \n                        <div class="cm-no-candidates" ng-if="isEmpty(currentAssignedResources)">\n                            ' + window.__crews.labels.NoAssignedResources + ' \n                        </div>\n                        \n                    </div>\n                    \n                    \n                    <div class="cm-candidates-list" ng-class="{\'cm-saving-candidates\': saving}" ng-if="!error">\n                        \n                        <h1 ng-show="hasCandidatesWithSkills()">' + window.__crews.labels.Candidates + '</h1>\n                        \n                        <div id="cm-candidates-assign-selected" ng-if="!isEmpty(candidates) && getSelectedResources().length > 0" ng-click="assignSelected()">\n                            <span ng-hide="$parent.saving">' + window.__crews.labels.AssignSelected + '</span>\n                            <span ng-show="$parent.saving">' + window.__crews.labels.AssigningResources + '</span>\n                        </div>\n                        \n                        \n                        <div>\n                            <div ng-repeat="relevantResource in candidates" class="cm-assigned-resource-candidate cm-candidate" draggable="true" draggable-resource="relevantResource.resource" ng-if="service.requiredSkills.length === 0 || relevantResource.relevantSkills.length > 0">\n\n                                <input type="checkbox" ng-model="getSelectedResourcesOnList()[relevantResource.resource.Id]" ng-click="$event.stopPropagation()" />\n                                <h2 ng-click="openResourceLightbox(relevantResource.resource.Name, relevantResource.resource.Id, $event)">{{relevantResource.resource.Name}}</h2>\n\n                                <div class="cm-candidate-text" ng-show="generateSkillsSentence(relevantResource.relevantSkills)">' + window.__crews.labels.RelevantSkills + ' {{ generateSkillsSentence(relevantResource.relevantSkills) }}</div>\n\n                                <div class="cm-candidate-has-missing-skills" ng-show="getMissingSkillsForCandidate(relevantResource.relevantSkills)">\n                                    ' + window.__crews.labels.HasMissingSkills + ' {{ getMissingSkillsForCandidate(relevantResource.relevantSkills) }}\n                                </div>\n\n                            </div>\n                        </div>\n                        \n                        \n                        <h1 class="cm-available-no-skill" ng-show="hasCandidatesWithoutSkills()">' + window.__crews.labels.AvailableResourcesNoSkill + '</h1>\n                        \n                        <div ng-repeat="relevantResource in candidates" class="cm-resource-available-no-skill cm-assigned-resource-candidate cm-candidate" draggable="true" draggable-resource="relevantResource.resource" ng-if="service.requiredSkills.length > 0 && relevantResource.relevantSkills.length === 0">\n                            <input type="checkbox" ng-model="getSelectedResourcesOnList()[relevantResource.resource.Id]" ng-click="$event.stopPropagation()" />\n                            <h2 ng-click="openResourceLightbox(relevantResource.resource.Name, relevantResource.resource.Id, $event)">{{relevantResource.resource.Name}}</h2>             \n                            <div class="cm-candidate-text" ng-if="!invalidSkillDate.includes(relevantResource.resource.Id) && !insufficientSkillLevel.includes(relevantResource.resource.Id)">' + window.__crews.labels.NoRelevantSkills + '</div>\n                            <!-- to be replaced with the relevant labels in 246 -->\n                            <div class="cm-candidate-text" ng-if="insufficientSkillLevel.includes(relevantResource.resource.Id)">' + window.__crews.labels.NoRelevantSkills + '</div>\n                            <div class="cm-candidate-text" ng-if="invalidSkillDate.includes(relevantResource.resource.Id)">' + window.__crews.labels.NoRelevantSkills + '</div>\n                        </div>\n                        \n                        \n                        \n                        <div class="cm-no-candidates" ng-if="isEmpty(candidates) && !loading && !error">\n                            ' + window.__crews.labels.NoCandidatesFoundCm + ' \n                        </div>\n                        \n                        <div class="cm-loading-candidates" ng-if="loading && !error">\n                            <img src="' + window.__crews.icons.spinner + '" /><br />\n                             ' + window.__crews.labels.FindingCandidates + '\n                        </div>\n                        \n                        \n                    </div>\n                    \n                    <div class="cm-loading-candidates" ng-if="!loading && error">\n                        ' + window.__crews.labels.GetCrewCandidatesGeneralError + '\n                    </div>\n                    \n                </div>');
    }

    // This will be our factory
    return {
        get: get
    };
}
'use strict';

RemoteActionsService.$inject = ['$q'];

angular.module('Crews').factory('RemoteActionsService', RemoteActionsService);

function RemoteActionsService($q) {

    function callRemoteAction(remoteActionName) {
        for (var _len = arguments.length, params = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            params[_key - 1] = arguments[_key];
        }

        var deferred = $q.defer(),
            remoteActionsParams = [window.__crews.remoteActions[remoteActionName]].concat(params).concat(function (data, ev) {
            ev.status ? deferred.resolve(data) : deferred.reject(ev);
        }).concat({ buffer: false, escape: false, timeout: 120000 });

        remoteActionsParams = remoteActionsParams.filter(function (v) {
            return v !== undefined;
        });

        window.Visualforce.remoting.Manager.invokeAction.apply(window.Visualforce.remoting.Manager, remoteActionsParams);

        return deferred.promise;
    }

    return {
        callRemoteAction: callRemoteAction
    };
}
'use strict';

ScmLightbox.$inject = ['$rootScope', '$compile', 'DataService', 'UtilsService'];

angular.module('Crews').factory('ScmLightbox', ScmLightbox);

function ScmLightbox($rootScope, $compile, DataService, UtilsService) {

    // create a new scope
    var $scope = null;

    function openFromDrag(dragData) {

        if ($scope) {
            return;
        }

        // create new isolated scope
        $scope = $rootScope.$new(true);

        // is multiple?
        $scope.multipleScms = dragData.resourceIds.length > 1;
        $scope.isFromDrag = true;
        $scope.saving = false;

        // get resources names
        $scope.resouceNames = [];

        dragData.resourceIds.forEach(function (resourceId) {
            $scope.resouceNames.push(DataService.getResources()[resourceId].Name);
        });

        $scope.resouceNames = $scope.resouceNames.join(', ');
        $scope.resourceIds = dragData.resourceIds;
        $scope.timezone = dragData.territory.timezone;
        $scope.territoryId = dragData.territory.Id;
        $scope.crewId = dragData.crewId;

        var start = moment(dragData.start),
            end = moment(dragData.end);

        initDates(start, end);

        $scope.start = new Date(dragData.start);
        $scope.end = new Date(dragData.end);

        $scope.title = window.__crews.labels.CreateScm;

        init();
    }

    function open(scm) {

        if ($scope) {
            return;
        }

        // create new isolated scope
        $scope = $rootScope.$new(true);

        $scope.scm = scm;

        if (scm) {

            var start = moment(scm.start_date),
                end = scm.EndDate ? moment(scm.end_date) : null;

            initDates(start, end);

            $scope.start = new Date(scm.start_date);
            $scope.end = scm.EndDate ? new Date(scm.end_date) : null;

            $scope.title = scm.ServiceCrewMemberNumber;
            $scope.resouceNames = DataService.getResources()[scm.ServiceResourceId].Name;
            $scope.isLeader = scm.IsLeader;
            $scope.multipleScms = false;
            $scope.isFromDrag = false;
            $scope.territoryId = scm.territoryId;
        }

        init();
    }

    // basic init, copying stuff to scope and compiling
    function init() {

        $scope.closeLightbox = closeLightbox;
        $scope.stmWarning = null;

        $scope.dateSelector = function dateSelector(id, dateType) {
            if (scheduler.isCalendarVisible()) {
                scheduler.destroyCalendar();
            } else {
                scheduler.renderCalendar({
                    position: id,
                    date: scheduler._date,
                    navigation: true,
                    handler: function handler(date, calendar) {

                        UtilsService.safeApply($scope, function () {

                            if (dateType === 'end' && !$scope[dateType]) {
                                $scope.minuteEnd = '0';
                                $scope.hourEnd = '0';
                            }

                            $scope[dateType] = date;
                            scheduler.destroyCalendar();
                        });
                    }
                });
            }
        };

        $scope.formatDate = formatDate;
        $scope.deleteScm = deleteScm;
        $scope.saveScm = saveScm;

        $scope.minutesArray = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59];
        $scope.hoursArray = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        $scope.hoursLabels = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

        handleAMPM();

        // add to body
        var lightboxDomElement = generateTemplate();
        angular.element('body').append(lightboxDomElement);

        // on destroy, remove DOM elements
        $scope.$on('$destroy', function () {
            return lightboxDomElement.remove();
        });

        // compile
        $compile(lightboxDomElement)($scope);

        UtilsService.safeApply($scope);
    }

    // esc - close lightbox
    document.addEventListener('keyup', function (e) {

        if ($scope && e.which === 27) {
            $scope.$evalAsync($scope.closeLightbox);
        }
    });

    function handleAMPM() {

        if (window.__crews.isAMPM) {
            $scope.hoursLabels = ['12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
        }
    }

    function initDates(start, end) {

        $scope.minuteStart = start.get('m').toString();
        $scope.hourStart = start.get('h').toString();
        $scope.minuteEnd = end ? end.get('m').toString() : null;
        $scope.hourEnd = end ? end.get('h').toString() : null;
    }

    function closeLightbox() {
        $scope.$destroy();
        $scope = null;
    }

    function formatDate(type) {

        if (type === 'start') {
            return moment($scope.start).format('ll');
        } else if ($scope.end) {
            return moment($scope.end).format('ll');
        }

        return window.__crews.labels.NotDefined;
    }

    function deleteScm() {

        if ($scope.saving) {
            return;
        }

        if (!window.confirm(window.__crews.labels.ScmDeleteConfirm)) {
            return;
        }

        DataService.deleteScm($scope.scm).then(function (data) {
            DataService.validateAllServicesInView();
            scheduler.updateView();
            $rootScope.$broadcast('createGanttTimeline');
            DataService.validateAllServicesInView();
            $rootScope.$broadcast('updateCandidates');
            $scope.closeLightbox();
        }).catch(function (err) {
            $scope.error = err.message;
            $scope.saving = false;
        });
    }

    function saveScm() {

        if ($scope.saving) {
            return;
        }

        $scope.saving = true;
        $scope.isFromDrag ? saveMultipleScms() : saveSignleScm();
    }

    function saveSignleScm() {
        var forceCreation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


        var resourceId = $scope.scm.ServiceResourceId,
            resourceStm = $scope.scm.stmId,
            scmId = $scope.scm.Id,
            crewId = $scope.scm.ServiceCrewId,
            resource = DataService.getResources()[resourceId];

        handleDatesForSaving();

        var stm = resource.territoryMemberships[resourceStm],
            startDate = UtilsService.convertDateToUTC($scope.start, stm.timezone),
            endDate = $scope.end ? UtilsService.convertDateToUTC($scope.end, stm.timezone) : null;

        // save changes to service
        DataService.saveChangesToScm(scmId, resourceId, crewId, $scope.territoryId, startDate, endDate, $scope.isLeader, forceCreation).then(function (data) {

            // resource has no stm
            if (data === false) {

                if (window.confirm(window.__crews.labels.ResourceHasNoStm.replace('$0', $scope.resouceNames))) {
                    saveSignleScm(true);
                } else {
                    $scope.stmWarning = [{ Id: resourceId, Name: $scope.resouceNames }];
                    $scope.saving = false;
                    return;
                }
            }

            // unselect all resources
            var selectedResources = DataService.getSelectedResourcesOnList();
            for (var key in selectedResources) {
                selectedResources[key] = false;
            }

            scheduler.parse(data, 'json');
            DataService.validateAllServicesInView();
            $rootScope.$broadcast('createGanttTimeline');
            $rootScope.$broadcast('updateCandidates');
            $scope.saving = false;
            $scope.closeLightbox();
        }).catch(function (err) {
            $scope.saving = false;
            $scope.error = err.message;
        });
    }

    function saveMultipleScms() {
        var forceCreation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


        handleDatesForSaving();

        var startDate = UtilsService.convertDateToUTC($scope.start, $scope.timezone),
            endDate = $scope.end ? UtilsService.convertDateToUTC($scope.end, $scope.timezone) : null;

        // save changes to service
        DataService.saveMultipleScms($scope.resourceIds, $scope.crewId, $scope.territoryId, startDate, endDate, !!$scope.isLeader, forceCreation).then(function (data) {

            if (!Array.isArray(data)) {

                var resources = DataService.getResources(),
                    resourcesNames = [],
                    confirmMessage = '';

                for (var id in data) {

                    // no stm?
                    if (!data[id]) {
                        resourcesNames.push(resources[id].Name);
                    }
                }

                if (resourcesNames.length === 1) {
                    confirmMessage = window.__crews.labels.ResourceHasNoStm.replace('$0', resourcesNames[0]);
                } else {
                    confirmMessage = window.__crews.labels.ResourcesHaveNoStm.replace('$0', resourcesNames.join(', '));
                }

                var shouldCreateStm = window.confirm(confirmMessage);

                if (shouldCreateStm) {
                    saveMultipleScms(true);
                    return;
                }

                $scope.stmWarning = [];

                for (var _id in data) {
                    // no stm?
                    if (!data[_id]) {
                        $scope.stmWarning.push({ Id: _id, Name: resources[_id].Name });
                    }
                }

                $scope.saving = false;
                return;
            }

            // unselect all resources
            var selectedResources = DataService.getSelectedResourcesOnList();
            for (var key in selectedResources) {
                selectedResources[key] = false;
            }

            scheduler.parse(data, 'json');
            DataService.validateAllServicesInView();
            $rootScope.$broadcast('createGanttTimeline');
            $rootScope.$broadcast('updateCandidates');
            $scope.saving = false;
            $scope.closeLightbox();
        }).catch(function (err) {
            $scope.saving = false;
            $scope.error = err.message;
        });
    }

    function handleDatesForSaving() {
        $scope.start.setHours($scope.hourStart);
        $scope.start.setMinutes($scope.minuteStart);

        if ($scope.end) {
            $scope.end.setHours($scope.hourEnd);
            $scope.end.setMinutes($scope.minuteEnd);
        }
    }

    function generateTemplate() {

        return angular.element('\n                <div class="LightboxBlackContainer">\n                    <div class="LightboxContainer scm-lb">\n\n                        <div class="lightboxHeaderContainer">\n                            <svg aria-hidden="true" class="slds-icon CloseLightbox" ng-click="closeLightbox()">\n                                <use xlink:href="' + window.__crews.icons.close + '"></use>\n                            </svg>\n                            <h1 class="light-box-header" ng-bind="title"></h1>\n                        </div>\n\n                        <div class="lightboxContent">\n                        \n                            <div class="scm-lb-error" ng-show="error">\n                                <svg aria-hidden="true" class="slds-icon" ng-click="error = null">\n                                    <use xlink:href="' + window.__crews.icons.close + '"></use>\n                                </svg>\n                                \n                                {{error}}\n                            </div>\n                            \n                            <div class="scm-lb-no-stm" ng-show="stmWarning">\n                                <svg aria-hidden="true" class="slds-icon" ng-click="stmWarning = null">\n                                    <use xlink:href="' + window.__crews.icons.close + '"></use>\n                                </svg>\n                                \n                                ' + window.__crews.labels.ResourcesWithoutSTMWarning + '\n                                \n                                <a ng-repeat="resource in stmWarning" href=\'../{{resource.Id}}\' target="_blank">{{resource.Name}} <span ng-show="!$last">,</span></a>\n                            </div>\n                            \n                            \n                            <div class="scm-lb-saving" ng-show="saving">\n                                ' + window.__crews.labels.OnboardingSaving + '\n                            </div>\n                        \n                        \n                            <div class="scm-scm-date-container">\n                                <div class="scm">' + window.__crews.labels.ServiceResourcesCm + '</div>\n                                <div class="scm-lb-resources">{{resouceNames}}</div>\n                            </div>\n                        \n                            \n                            <div class="scm-scm-date-container scm-lb-date-fix">\n                                <div>' + window.__crews.labels.EventStart + '</div>\n                                <span id="scm-start-date" class="scm-lb-date" ng-click="dateSelector(\'scm-start-date\', \'start\')" ng-bind="formatDate(\'start\')"></span>\n                                <svg aria-hidden="true" class="slds-icon scm-lb-date-icon" ng-click="dateSelector(\'scm-start-date\', \'start\')">\n                                    <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                </svg>\n                                \n                                <select class="scm-lb-select scm-lb-select-time" ng-model="hourStart">\n                                    <option ng-repeat="hour in hoursArray" value="{{+hour}}">{{hoursLabels[$index]}}</option>\n                                </select>\n                                \n                                <select class="scm-lb-select scm-lb-select-time" ng-model="minuteStart">\n                                    <option ng-repeat="minute in minutesArray" value="{{+minute}}">{{minute}}</option>\n                                </select>\n                            </div>\n      \n                            \n                            <div class="scm-scm-date-container scm-lb-date-fix">\n                                <div>' + window.__crews.labels.EventEnd + '</div>\n                                <span id="scm-end-date" class="scm-lb-date" ng-click="dateSelector(\'scm-end-date\', \'end\')" ng-bind="formatDate(\'end\')"></span>\n                                <svg aria-hidden="true" class="slds-icon scm-lb-date-icon" ng-click="dateSelector(\'scm-end-date\', \'end\')">\n                                    <use xlink:href="' + window.__crews.icons.event + '"></use>\n                                </svg>\n                                \n                                <select class="scm-lb-select scm-lb-select-time" ng-model="hourEnd">\n                                    <option ng-repeat="hour in hoursArray" value="{{+hour}}">{{hoursLabels[$index]}}</option>\n                                </select>\n                                \n                                <select class="scm-lb-select scm-lb-select-time" ng-model="minuteEnd">\n                                    <option ng-repeat="minute in minutesArray" value="{{+minute}}">{{minute}}</option>\n                                </select>\n                            </div>\n                            \n                            <div class="scm-scm-date-container" ng-hide="multipleScms">\n                                <input type="checkbox" ng-model="isLeader" id="scm-lb-leader"/>\n                                <label for="scm-lb-leader">' + window.__crews.labels.MakeLeader + '</label>\n                                <tooltip>' + window.__crews.labels.LeaderTooltipScmBox + '</tooltip>\n                            </div>\n                                         \n                                                        \n                            <div class="scm-lb-footer">\n                                <div class="scm-lb-button" ng-click="saveScm()">' + window.__crews.labels.Save + '</div>\n                                <div class="scm-lb-button scm-delete-button" ng-show="scm.Id" ng-click="deleteScm()">' + window.__crews.labels.Delete + '</div>\n                            </div>\n                                                        \n                                                        \n                        </div>\n\n\n                    </div>\n                </div>');
    }

    // This will be our factory
    return {
        open: open,
        openFromDrag: openFromDrag
    };
}
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

TerritoryFilteringService.$inject = ['$compile', '$rootScope', 'DataService', 'RemoteActionsService', 'UtilsService'];

angular.module('Crews').factory('TerritoryFilteringService', TerritoryFilteringService);

function TerritoryFilteringService($compile, $rootScope, DataService, RemoteActionsService, UtilsService) {

    // create new isolated scope
    var $scope = $rootScope.$new(true);
    $scope.isOpen = false;

    $scope.showOrphanServices = true;
    $scope.locationSearchTerm = '';
    $scope.showLocationFiltering = false;
    $scope.noLocationsLoad = false;
    $scope.locationFilter = {};
    $scope.locationFilterCopy = {};
    $scope.locationsFlat = [];
    $scope.territoriesSortedByTree = [];
    $scope.saving = false;

    // for autocomplete territory search
    $scope.shouldShowAutoCompleteUi = window.__crews.shouldShowAutoCompleteUi;
    $scope.currentResults = [];
    $scope.showResults = false;
    $scope.noTerritoriesFoundOnSearch = false;
    $scope.cachedTerritoriesQueryResults = {};
    $scope.currentlyLoading = false;
    $scope.searchText = null;
    $scope.allTerritoriesQueried = {};
    $scope.territoriesIdsToNames = {};
    $scope.currentlyLoadedTerritories = [];

    // add to body
    var filteringElement = generateTemplate().hide();
    angular.element('#ResourceList').append(filteringElement);

    // compile
    $compile(filteringElement)($scope);

    // open the UI
    function toggle() {
        $scope.isOpen = !$scope.isOpen;
        filteringElement.toggle();
        if (!$scope.isOpen) {
            $scope.closeTerritoryFilter();
        } else {
            setCurrentlyLoadedTerritories();
        }
    }

    function isOpen() {
        return $scope.isOpen;
    }

    function setCurrentlyLoadedTerritories() {
        var loadedLocationsIds = window.__crews.loadedTerritories;
        $scope.currentlyLoadedTerritories = loadedLocationsIds ? [].concat(_toConsumableArray(loadedLocationsIds)) : [];
    }

    function setSearchTerm(term) {

        $scope.locationSearchTerm = term;

        if ($scope.shouldShowAutoCompleteUi) {
            searchTerritory(term);
        }
    }

    $scope.closeTerritoryFilter = function () {
        for (var key in $scope.locationFilterCopy) {
            $scope.locationFilter[key] = $scope.locationFilterCopy[key];
        }

        $scope.isOpen = false;
        filteringElement.hide();
    };

    // this object will make the indentations on the tree UI
    $scope.styleForLocationTree = function (depth) {
        return {
            'margin-left': depth * 20 + 'px'
        };
    };

    // ready data for display - should happen only once when finished loading the territories list
    DataService.getResourcesPromise().promise.then(function () {

        var territories = DataService.getTerritories(),
            allTerritories = DataService.getAllTerritories(),
            treeData = {},
            m_locationTreeDataUnflatten = [],
            showLocations = [];

        // start build unflatten tree for location filtering hierarchy
        for (var id in territories) {

            var territory = territories[id];

            if (territory.hasSharing) {

                treeData[id] = {
                    id: id,
                    parent: territory.ParentTerritory ? territory.ParentTerritory : 0,
                    text: territory.Name,
                    items: []
                };

                $scope.territoriesIdsToNames[territory.Id] = territory.Name;
            }
        }

        // build data stuctures (tree + flat)
        for (var key in treeData) {

            var node = treeData[key];
            var activeParent = getFirstActiveParent(node);

            if (node.parent !== 0 && activeParent) {
                treeData[activeParent.Id].items.push(node);
            } else {
                m_locationTreeDataUnflatten.push(node);
            }
        }

        function getFirstActiveParent(node) {

            if (!node.id || !node.parent) return;

            if (treeData[node.parent.Id]) return node.parent;else {

                //check if territory is even available for user
                var parentNode = {};
                if (allTerritories[node.parent.Id]) {
                    parentNode = {
                        id: allTerritories[node.parent.Id].Id,
                        parent: allTerritories[node.parent.Id].ParentTerritory ? allTerritories[node.parent.Id].ParentTerritory : 0
                    };
                }
                return getFirstActiveParent(parentNode);
            }
        }

        $scope.locationsTree = m_locationTreeDataUnflatten;
        for (var i = 0; i < m_locationTreeDataUnflatten.length; i++) {
            setNodeDepth(m_locationTreeDataUnflatten[i], 0, $scope.locationsFlat);
        }

        for (var _i = 0; _i < $scope.locationsFlat.length; _i++) {

            $scope.noLocationsLoad = false;
            //W-14824302
            $scope.locationFilter[$scope.locationsFlat[_i].id] = window.__crews.loadedTerritories.indexOf($scope.locationsFlat[_i].id) > -1;

            if ($scope.locationFilter[$scope.locationsFlat[_i].id]) showLocations.push($scope.locationsFlat[_i].id);
        }

        //window.__crews.loadedTerritories.forEach(territoryId => $scope.locationFilter[territoryId] = true);


        // make a copy, used when user closing without save
        $scope.locationFilterCopy = angular.copy($scope.locationFilter);
    });

    // set node depth on each location (will be used to indent in the UI)
    function setNodeDepth(current, depth, arr) {
        current.depth = depth;
        arr.push(current);

        if (current.items) {
            for (var i = 0, len = current.items.length; i < len; i++) {
                current.items[i].depth = depth;
                setNodeDepth(current.items[i], depth + 1, arr);
            }
        }
    }

    // for location filter
    $scope.selectLocation = function (locationId, locationFilter) {

        // on search resuls view
        if ($scope.shouldShowAutoCompleteUi && $scope.locationSearchTerm) {

            var whereTerritoryInArray = $scope.currentlyLoadedTerritories.indexOf(locationId);

            if (whereTerritoryInArray === -1) {
                $scope.currentlyLoadedTerritories.push(locationId);
            } else {
                $scope.currentlyLoadedTerritories.splice(whereTerritoryInArray, 1);
            }

            return;
        }

        if ($scope.shouldShowAutoCompleteUi) {
            return;
        }

        var bool = !$scope.locationFilter[locationId],
            parentLocation = findLocationInTree($scope.locationsTree, locationId);

        if (parentLocation) {
            selectLocationTree(parentLocation, bool);
        }
    };

    // find parent location in the tree
    function findLocationInTree(locationsTree, locationId) {

        var child = null;

        for (var i = 0; i < locationsTree.length; i++) {
            if (locationsTree[i].id === locationId) {
                return locationsTree[i];
            } else {
                child = findLocationInTree(locationsTree[i].items, locationId);
                if (child) {
                    return child;
                }
            }
        }

        return child;
    }

    // check / uncheck the locations.
    function selectLocationTree(location, bool) {
        for (var i = 0; i < location.items.length; i++) {
            $scope.locationFilter[location.items[i].id] = bool;
            selectLocationTree(location.items[i], bool);
        }
    }

    // select all available locations
    $scope.selectAllLocations = function (isSelectAll, filteredLocations, locationFilter) {
        angular.forEach(filteredLocations, function (item) {
            locationFilter[item.id] = isSelectAll;
        });
    };

    $scope.applyFilterLocation = function () {

        $scope.saving = true;

        var territories = [],
            territoriesToUnmark = [];

        for (var id in $scope.locationFilter) {
            if ($scope.locationFilter[id]) {
                territories.push(id);
            } else {
                territoriesToUnmark.push(id);
            }
        }

        if (territories.length === 0) {
            alert(window.__crews.labels.MustHave1Territory);
            $scope.saving = false;
            return;
        }

        if (window.__crews.loadedTerritories.toString() === window.__crews.loadedTerritories) {
            $scope.saving = false;
            return;
        }

        RemoteActionsService.callRemoteAction('setLoadedTerritories', territories, window.__crews.settings.Id);

        window.__crews.loadedTerritories = territories;

        DataService.init().then(function () {

            $rootScope.$broadcast('createGanttTimeline');
        }).finally(function () {
            if (window.__crews.shouldShowAutoCompleteUi) {

                territoriesToUnmark.forEach(function (id) {
                    return delete $scope.locationFilter[id];
                });

                $scope.currentlyLoadedTerritories.length = 0;
                for (var _id in $scope.locationFilter) {
                    $scope.currentlyLoadedTerritories.push(_id);
                }
            }
            $scope.saving = false;
            angular.extend($scope.locationFilterCopy, $scope.locationFilter);
            $scope.closeTerritoryFilter();
        });
    };

    $scope.countSelected = function () {

        if (window.__crews.shouldShowAutoCompleteUi) {

            var count = 0;

            for (var id in $scope.locationFilter) {
                $scope.locationFilter[id] && count++;
            }

            return count;
        }

        var availableTerritories = {};
        $scope.locationsFlat.forEach(function (t) {
            return availableTerritories[t.id] = true;
        });

        var selected = 0;

        for (var _id2 in $scope.locationFilter) {
            if ($scope.locationFilter[_id2] && availableTerritories[_id2]) {
                selected++;
            }
        }

        return selected;
    };

    $scope.getTerritoriesToDisplay = function () {

        if ($scope.locationSearchTerm) {
            return $scope.currentResults.map(function (t) {
                return t.Id;
            });
        }

        var currentlyChecked = [];

        for (var id in $scope.locationFilter) {
            if ($scope.locationFilter[id]) {
                currentlyChecked.push(id);
            }
        }

        //return currentlyChecked;

        return $scope.currentlyLoadedTerritories;
    };

    $scope.showSearchResultsText = function () {
        return window.__crews.labels.ShowingSearchResultsTerritories.replace('$0', $scope.currentResults.length);
    };

    function searchTerritory(searchText) {

        // search is empty, mark "none" and validate
        if (searchText === "") {
            $scope.currentResults = [];
            $scope.showResults = false;
            $scope.noTerritoriesFoundOnSearch = false;
            return;
        }

        // check if cached
        if ($scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()]) {

            $scope.currentResults = $scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()];
            $scope.showResults = true;

            if ($scope.currentResults.length === 0) {
                $scope.noTerritoriesFoundOnSearch = true;
            } else {
                $scope.noTerritoriesFoundOnSearch = false;
            }

            return;
        }

        $scope.currentlyLoading = true;

        // query from server
        RemoteActionsService.callRemoteAction('searchTerritories', searchText).then(function (result, ev) {

            UtilsService.safeApply($scope, function () {

                // cache
                $scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()] = result;
                $scope.showResults = true;

                // not synced with current value
                if ($scope.locationSearchTerm !== searchText) {
                    return;
                }

                $scope.currentlyLoading = false;
                $scope.currentResults = result;

                if (result.length === 0) {
                    $scope.noTerritoriesFoundOnSearch = true;
                } else {
                    $scope.noTerritoriesFoundOnSearch = false;
                    result.forEach(function (t) {
                        $scope.allTerritoriesQueried[t.Label] = t;
                        $scope.territoriesIdsToNames[t.Id] = t.Label;
                    });
                }
            });
        });
    }

    $scope.selectTerritoriesAutoComplete = function (selectType) {

        if (!$scope.locationSearchTerm) {

            $scope.getTerritoriesToDisplay().forEach(function (territoryId) {
                $scope.locationFilter[territoryId] = selectType;
                $scope.selectLocation(territoryId, $scope.locationFilter);
            });
        } else {

            $scope.currentResults.forEach(function (territory) {
                $scope.locationFilter[territory.Id] = selectType;
                $scope.selectLocation(territory.Id, $scope.locationFilter);
            });
        }
    };

    function generateTemplate() {
        return angular.element('\n    \t\t<div class="LeftSiteLocationFiltering">\n    \t\t\n    \t\t    <div ng-if="isOpen" class="tf-container-open">\n    \t\t    \t\t\n                    <div id="cm-saving-territories" ng-show="saving">' + window.__crews.labels.OnboardingSaving + '</div>\n    \n                    <div class="lightboxContentContainer">\n    \n                        <div class="selectButtons" ng-show="!shouldShowAutoCompleteUi || (shouldShowAutoCompleteUi && ((locationSearchTerm && currentResults.length > 0) || !locationSearchTerm))">\n                        \n                            <span class="selectedNumberOfTerritories truncate" ng-show="!shouldShowAutoCompleteUi || (shouldShowAutoCompleteUi && !locationSearchTerm)">\n                                ' + window.__crews.labels.TeritoriesSelectedCm.replace('{0}', '{{ countSelected() }}') + '\n                            </span>\n                            \n                            <span class="selectedNumberOfTerritories truncate" ng-show="shouldShowAutoCompleteUi">\n                                \n                                <span ng-show="locationSearchTerm">{{ showSearchResultsText() }}</span>\n                                \n                                <div style="margin-top: 10px;" ng-class="{ \'tf-selectBtnsAutoComplete\' : !locationSearchTerm }">\n                                \n                                    <span \n                                        class="selectAllLocations truncate" \n                                        ng-click="selectTerritoriesAutoComplete(true)"\n                                        title="' + window.__crews.labels.Select_all + '">\n                                            ' + window.__crews.labels.Select_all + '\n                                    </span>\n                                    \n                                    <span \n                                        class="selectAllLocations truncate"\n                                        ng-click="selectTerritoriesAutoComplete(false)"\n                                        title="' + window.__crews.labels.Select_none + '">\n                                            ' + window.__crews.labels.Select_none + '\n                                    </span>\n                                    \n                                </div>\n                                \n                            </span>\n                            \n                            \n                            <span \n                                class="selectAllLocations truncate" \n                                ng-show="!shouldShowAutoCompleteUi"\n                                ng-click="selectAllLocations(true, filteredLocations, locationFilter)"\n                                title="' + window.__crews.labels.Select_all + '">\n                                    ' + window.__crews.labels.Select_all + '\n                            </span>\n                            \n                            <span \n                                class="selectAllLocations truncate"\n                                ng-show="!shouldShowAutoCompleteUi"\n                                ng-click="selectAllLocations(false, filteredLocations, locationFilter)"\n                                title="' + window.__crews.labels.Select_none + '">\n                                    ' + window.__crews.labels.Select_none + '\n                            </span>\n                        </div>\n                        \n                        \n                        \n                        \n                        \n                        <div id="LocationsTree" ng-show="!shouldShowAutoCompleteUi">\n                            <div ng-repeat="l in filteredLocations = (locationsFlat | filter: {text: locationSearchTerm})" class="locationFilterRow" ng-style="{{ styleForLocationTree(l.depth) }}" ng-click="selectLocation(l.id)">\n                                <div class="slds-form-element">\n                                  <div class="slds-form-element__control">\n                                    <div class="slds-checkbox">\n                                        <input type="checkbox" ng-model="locationFilter[l.id]" id="location_{{ l.id }}" />   \n                                        <label class="slds-checkbox__label" for="location_{{ l.id }}">\n                                            <span class="slds-checkbox_faux"></span>\n                                            <span class="slds-form-element__label">{{ l.text }}</span>\n                                        </label>\n                                    </div>\n                                  </div>\n                                </div>\n    \n                            </div>\n                        </div>\n                        \n                        \n                        \n                        <div id="LocationsTree" ng-show="shouldShowAutoCompleteUi">\n                            <div ng-repeat="id in getTerritoriesToDisplay()" class="locationFilterRow">\n                                <div class="slds-form-element">\n                                  <div class="slds-form-element__control">\n                                    <div class="slds-checkbox">\n                                        <input type="checkbox" ng-model="locationFilter[id]" id="location_{{ id }}" ng-click="selectLocation(id, locationFilter)" />   \n                                        <label class="slds-checkbox__label" for="location_{{ id }}">\n                                            <span class="slds-checkbox_faux"></span>\n                                            <span class="slds-form-element__label">{{ territoriesIdsToNames[id] }}</span>\n                                        </label>\n                                        \n                                    </div>\n                                  </div>\n                                </div>\n    \n                            </div>\n                        </div>\n                        \n                        \n                        \n                        <div class="cm-no-territories-found" ng-show="shouldShowAutoCompleteUi && locationSearchTerm && noTerritoriesFoundOnSearch && !currentlyLoading">\n                                ' + window.__crews.labels.NoServiceTerritoriesWereFound + '\n                        </div>\n                        \n                        \n                        <div id="CM-SearchingTerritories" ng-show="currentlyLoading">\n                            <img src="' + window.__crews.icons.spinner + '" />\n                            ' + window.__crews.labels.SearchingForTerritoriesCm + '\n                        </div>\n                        \n                        \n                    </div>\n                     \n                </div>\n                \n                \n                <div class="TerritoryFilterControllers" ng-show="isOpen">\n                    <span class="slds-button slds-button_brand territory-button-style territory-save-button" ng-click="applyFilterLocation()">' + window.__crews.labels.Save + '</span>\n                    <span class="slds-button slds-button_neutral territory-button-style" ng-class="{\'disable-territory-tree-button\': saving}" ng-click="closeTerritoryFilter()">' + window.__crews.labels.Cancel + '</span>\n                </div>\n                \n    \t\t</div>\n    \t');
    }

    return {
        toggle: toggle,
        isOpen: isOpen,
        setSearchTerm: setSearchTerm
    };
}
'use strict';

UtilsService.$inject = ['$q', 'RemoteActionsService'];

angular.module('Crews').factory('UtilsService', UtilsService);

function UtilsService() {

    var errors = [],
        errorSubscribers = [];

    function parseStm(stm, territories, operatingHours) {

        if (territories[stm.ServiceTerritoryId]) {
            stm.OperatingHoursId = territories[stm.ServiceTerritoryId].OperatingHoursId;
        }

        if (!stm.OperatingHoursId) {
            return null;
        }

        stm.timezone = operatingHours[stm.OperatingHoursId].TimeZone;

        if (stm.EffectiveStartDate) {
            stm.effectiveStartDateOriginal = stm.EffectiveStartDate;
            stm.EffectiveStartDate = moment(stm.EffectiveStartDate).tz(stm.timezone);
            stm.ganttEffectiveStartDate = stm.EffectiveStartDate;
        } else {
            stm.ganttEffectiveStartDate = moment("1900-01-01T00:00:00").tz(stm.timezone);
        }

        if (stm.EffectiveEndDate) {
            stm.effectiveEndDateOriginal = stm.EffectiveEndDate;
            stm.EffectiveEndDate = moment(stm.EffectiveEndDate).tz(stm.timezone);
            stm.ganttEffectiveEndDate = stm.EffectiveEndDate;
        } else {
            stm.ganttEffectiveEndDate = moment("2900-01-01T00:00:00").tz(stm.timezone);
        }

        return stm;
    }

    function doesResourceHasStm(resource, territoryId, start, end) {

        if (resource.territoryMemberships && Object.keys(resource.territoryMemberships).length === 0) {
            return false;
        }

        for (var id in resource.territoryMemberships) {

            var currentStm = resource.territoryMemberships[id];

            // has STM that is not secondary and STM is to the specified territory
            if (currentStm.ServiceTerritoryId.includes(territoryId) && isIntersect(start, end, currentStm.ganttEffectiveStartDate, currentStm.ganttEffectiveEndDate)) {
                return currentStm.Id;
            }

            // if (currentStm.TerritoryType !== 'S' && currentStm.ServiceTerritoryId.includes(territoryId) && isIntersect(start, end, currentStm.ganttEffectiveStartDate, currentStm.ganttEffectiveEndDate)) {
            //     return currentStm.Id;
            // }
        }

        return false;
    }

    function getLocalDateOffsetOffset(date) {
        return new Date(date).getTimezoneOffset() * 60 * 1000;
    }

    function isIntersect(a_start, a_end, b_start, b_end) {
        return a_start < b_end && a_end > b_start;
    }

    function generateDateKey(date) {
        return date.getDate() + '_' + date.getMonth() + '_' + date.getFullYear();
    }

    function convertDateToUTC(date, timezone) {
        if (!timezone) {
            return date;
        }
        var startDateOffset = -moment(date).tz(timezone)._offset,
            startDate = new Date(date);

        startDate.setMinutes(startDate.getMinutes() + startDateOffset);

        return startDate;
    }

    function addError(sfdcErrorObject) {
        errors.push(sfdcErrorObject);
        errorSubscribers.forEach(function (f) {
            return f(sfdcErrorObject);
        });
    }

    // run this function when new error appears
    function subscribeForNewErrors(fn) {
        errorSubscribers.push(fn);
    }

    function generateResourceGanttLabel(resource, allSkills) {
        var isCrew = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var searchTerms = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;


        var ganttLabelField = window.__crews.fields.ServiceResource.GanttLabel__c,
            label = '',
            skills = [],
            resourceName = null;

        //if there are search terms, split the word and prepate it to be highlighted
        if (searchTerms) {
            resourceName = findMatchingSearchTerm(resource.Name, searchTerms);
        }

        if (resource.ServiceResourceSkills) {

            resource.ServiceResourceSkills.forEach(function (s) {
                skills.push('' + allSkills[s.SkillId]);

                if (s.SkillLevel !== undefined && s.SkillLevel !== 1) {
                    skills[skills.length - 1] = '' + window.__crews.labels.SkillAndLevel.replace('{0}', skills[skills.length - 1]).replace('{1}', s.SkillLevel);
                }
            });

            skills = skills.join(', ');

            // W-9747244
            skills = skills.encodeHTML();
        } else {
            skills = isCrew ? window.__crews.labels.CrewNoSkills : window.__crews.labels.ResourceNoSkills;
        }

        label = '<div class="cm-resource-name-container-gantt" title="' + skills + '">';

        if (resource.RelatedRecord && resource.RelatedRecord.SmallPhotoUrl) {
            label += '<img class="cm-resource-photo" src="' + resource.RelatedRecord.SmallPhotoUrl + '" />';
        } else {
            label += '<div class="cm-resourcePhotoIcon"></div>';
        }

        var ganttResourceName = resource.Name.encodeHTML();
        if (resourceName) {
            ganttResourceName = resourceName.beforeMatch.encodeHTML() + '<span class="cm-highlight-on-search">' + resourceName.matchedPart.encodeHTML() + '</span>' + resourceName.afterMatch.encodeHTML();
        }

        if (resource[ganttLabelField]) {
            label += '<div class="cm-resource-name-gantt truncate">' + ganttResourceName + '</div>';
            label += '<div class="cm-resource-gantt-label truncate">' + resource[ganttLabelField].encodeHTML() + '</div>';
        } else {
            label += '<div class="cm-resource-name-gantt resource-gantt-no-label cm-resource-gantt-label truncate">' + ganttResourceName + '</div>';
        }

        label += '</div>';

        return label;
    }

    function safeApply(scope, fn) {

        var phase = scope.$root.$$phase;

        if (phase === '$apply' || phase === '$digest') {
            if (fn && typeof fn === 'function') {
                fn();
            }
        } else {
            scope.$apply(fn);
        }
    }

    function openConsoleTab(e, id) {

        var isInConsole = typeof sforce !== "undefined" ? sforce.console.isInConsole() : null;

        if (isInConsole) {

            if (e) {
                e.preventDefault();
            }

            window.sforce.console.generateConsoleUrl(['/' + id], function (result) {
                if (result.success) {
                    window.sforce.console.openConsoleUrl(null, result.consoleUrl, true);
                } else {
                    openLightningPrimaryTab(id);
                }
            });

            return true;
        }

        return false;
    }

    function openLightningPrimaryTab(id) {
        window.sforce.console.openPrimaryTab(null, '/' + id, true);
    }

    window.openConsoleTabFromModal = function (url) {

        var isInConsole = typeof sforce !== "undefined" ? sforce.console.isInConsole() : null;

        if (isInConsole) {

            window.sforce.console.generateConsoleUrl([url], function (result) {

                if (result.success) {
                    window.sforce.console.openConsoleUrl(null, result.consoleUrl, true);
                } else {
                    openLightningPrimaryTab(url);
                }
            });
        }
    };

    function generateSkillsSentence(resourceSkills, skills) {
        var crew = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;


        if (!resourceSkills) {
            return crew ? window.__crews.labels.CrewHasNoSkills : window.__crews.labels.ResourceNoSkills;
        }

        var skillNames = [];

        resourceSkills.forEach(function (s) {
            skillNames.push(skills[s.SkillId]);

            if (s.SkillLevel && s.SkillLevel !== 1) {
                skillNames[skillNames.length - 1] = '' + window.__crews.labels.SkillAndLevel.replace('{0}', skillNames[skillNames.length - 1]).replace('{1}', s.SkillLevel);
            }
        });

        return skillNames.join(', ');
    }

    String.prototype.encodeHTML = function () {
        var input = this;
        input = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        return input;
    };

    var findMatchingSearchTerm = function findMatchingSearchTerm(name, searchTerms) {
        var term = void 0;
        var index = -1;
        if (typeof searchTerms === 'string') {
            term = searchTerms;
            index = name.toLowerCase().indexOf(term.toLowerCase());
        } else {
            for (var i = 0; i < searchTerms.length; i++) {
                term = searchTerms[i];

                index = name.toLowerCase().indexOf(term.toLowerCase());

                if (index !== -1) {
                    break;
                }
            }
        }

        if (index !== -1) {
            return {
                beforeMatch: name.substring(0, index),
                matchedPart: name.substr(index, term.length),
                afterMatch: name.substring(index + term.length)
            };
        }
    };

    return {
        parseStm: parseStm,
        isIntersect: isIntersect,
        doesResourceHasStm: doesResourceHasStm,
        getLocalDateOffsetOffset: getLocalDateOffsetOffset,
        generateDateKey: generateDateKey,
        convertDateToUTC: convertDateToUTC,
        addError: addError,
        subscribeForNewErrors: subscribeForNewErrors,
        generateResourceGanttLabel: generateResourceGanttLabel,
        getErrors: function getErrors() {
            return errors;
        },
        safeApply: safeApply,
        openConsoleTab: openConsoleTab,
        generateSkillsSentence: generateSkillsSentence,
        findMatchingSearchTerm: findMatchingSearchTerm
    };
}