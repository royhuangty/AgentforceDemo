'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    Gantt_LeftSideLocationFilteringService.$inject = ['$compile', '$rootScope', '$q', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'sfdcService', 'utils', 'TimePhasedDataService', 'StateService', 'calendarsService', 'monthlyViewHelperService', 'ResourceCrewsService', 'kpiCalculationsService', 'ResourceCapacitiesService', 'GanttPalettesService', 'GetSlotsService', 'servicesService', 'HolidayService', 'ServiceSelectorService'];

    angular.module('serviceExpert').factory('LeftSideLocationFilteringService', Gantt_LeftSideLocationFilteringService);

    function Gantt_LeftSideLocationFilteringService($compile, $rootScope, $q, ResourcesAndTerritoriesService, userSettingsManager, sfdcService, utils, TimePhasedDataService, StateService, calendarsService, monthlyViewHelperService, ResourceCrewsService, kpiCalculationsService, ResourceCapacitiesService, GanttPalettesService, GetSlotsService, servicesService, HolidayService, ServiceSelectorService) {

        // create new isolated scope
        var $scope = $rootScope.$new(true);

        // add to body
        var lightboxDomElement = generateTemplate().hide();
        angular.element('#LeftSideContainer').append(lightboxDomElement);

        GetSlotsService.close();

        // init stuff
        $scope.trust = utils.trust;
        $scope.showOrphanServices = false;
        $scope.locationSearchTerm = { text: '' };
        $scope.showLocationFiltering = false;
        $scope.noLocationsLoad = false;
        $scope.locationFilter = {};
        $scope.locationFilterCopy = {};
        $scope.locationsFlat = [];
        $scope.territoriesSortedByTree = [];
        $scope.showTree = true;
        $scope.showSecondaryTimezoneNotice = showSecondarySTMs && useLocationTimezone;
        $scope.spinnerIcon = window.lsdIcons.spinnerGif;
        $scope.showAutocompleteTerritoryPicker = window.__gantt.shouldShowAutoCompleteUi;

        // for autocomplete territory search
        $scope.currentResults = [];
        $scope.showResults = false;
        $scope.noTerritoriesFoundOnSearch = false;
        $scope.cachedTerritoriesQueryResults = {};
        $scope.currentlyLoading = false;
        $scope.searchText = null;
        $scope.allTerritoriesQueried = {};
        $scope.territoriesIdsToNames = {};
        $scope.currentlyLoadedTerritories = [];
        $scope.currentlySavingTerritories = false;
        $scope.searchResultText = window.customLabels.TerritoriesFoundInSearch;

        // W-10429684
        $scope.isRTL = StateService.isRtlDirection();

        $scope.getParentTerritory = function (id) {

            var territory = ResourcesAndTerritoriesService.territories()[id];

            if (territory && territory.parentTerritory) {
                return ResourcesAndTerritoriesService.territories()[territory.parentTerritory.id];
            }

            return null;
        };

        if (userSettingsManager.GetUserSettingsProperty('ShowFavoriteTerritoriesTab__c') !== null) {
            $scope.showTree = !userSettingsManager.GetUserSettingsProperty('ShowFavoriteTerritoriesTab__c');
        }

        $scope.favorites = userSettingsManager.GetUserSettingsProperty('FavoriteTerritories__c') ? JSON.parse(userSettingsManager.GetUserSettingsProperty('FavoriteTerritories__c')) : [];

        var saveFavoriteTerritoriesDebounced = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('FavoriteTerritories__c', JSON.stringify($scope.favorites));
        }, 800);

        $scope.saveTabDebounced = _.debounce(function () {
            userSettingsManager.SetUserSettingsProperty('ShowFavoriteTerritoriesTab__c', !$scope.showTree);
        }, 800);

        $scope.setShowTree = function (value) {
            $scope.showTree = value;
            $scope.saveTabDebounced();
        };

        function isOpen() {
            return $scope && $scope.opened;
        }

        // compile
        $compile(lightboxDomElement)($scope);

        function isNoTerritoryLoadded() {
            return $scope.noLocationsLoad;
        }

        // open the UI
        function open() {
            var reload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;


            $scope.opened = true;
            $scope.showTree = true;
            $scope.reload = reload;

            setCurrentlyLoadedTerritories();

            if (userSettingsManager.GetUserSettingsProperty('ShowFavoriteTerritoriesTab__c') !== null) {
                $scope.showTree = !userSettingsManager.GetUserSettingsProperty('ShowFavoriteTerritoriesTab__c');
            }

            $scope.favorites = userSettingsManager.GetUserSettingsProperty('FavoriteTerritories__c') ? JSON.parse(userSettingsManager.GetUserSettingsProperty('FavoriteTerritories__c')) : [];

            lightboxDomElement.show('fast', function () {
                $(this).find('.territories-list-type-tabs').children()[0].focus();
            });
        }

        window.__openLocationFilteringAndReload = function () {
            return open(true);
        };

        function setCurrentlyLoadedTerritories() {
            var loadedLocationsIds = userSettingsManager.GetUserSettingsProperty('locations');
            $scope.currentlyLoadedTerritories = loadedLocationsIds ? [].concat(_toConsumableArray(loadedLocationsIds)) : [];
        }

        $scope.toggleFavorite = function (id) {

            var index = $scope.favorites.indexOf(id);

            if (index > -1) {
                $scope.favorites.splice(index, 1);
            } else {
                $scope.favorites.push(id);
            }

            saveFavoriteTerritoriesDebounced();
        };

        $scope.isTerritoryInFavorite = function (id) {
            return $scope.favorites.includes(id);
        };

        // key press events
        $scope.$on('keypress', function (event, e) {
            if (e.which === 27) {
                $scope.closeLightbox();
            }
        });

        // close the UI (only if we have at least 1 loaded location)
        $scope.closeLightbox = function () {
            if (!$scope.noLocationsLoad) {
                for (var key in $scope.locationFilterCopy) {
                    $scope.locationFilter[key] = $scope.locationFilterCopy[key];
                }

                $scope.showOrphanServices = $scope.showOrphanServicesOldValue;

                lightboxDomElement.hide();

                window.__closeLeftSideTerritories = null;

                $scope.opened = false;
            }
        };

        window.__closeLeftSideTerritories = $scope.closeLightbox;

        // this object will make the indentations on the tree UI
        $scope.styleForLocationTree = function (depth) {

            // W-10429684
            var marginDirection = $scope.isRTL ? 'margin-right' : 'margin-left',
                result = {};

            result[marginDirection] = depth * 20 + 'px';

            return result;
        };

        $scope.switchToTerritory = function (id) {

            for (var k in $scope.locationFilter) {
                $scope.locationFilter[k] = false;
            }

            $scope.locationFilter[id] = true;

            $scope.applyFilterLocation();
        };

        // ready data for display - should happen only once when finished loading the territories list
        ResourcesAndTerritoriesService.promises.territories().then(function () {

            var treeData = {},
                m_locationTreeDataUnflatten = [],
                userSettingLocations = [],
                showLocations = [];

            // start build unflatten tree for location filtering hierarchy
            for (var id in ResourcesAndTerritoriesService.territories()) {

                var territory = ResourcesAndTerritoriesService.territories()[id];

                if (!territory['hasSharing']) continue;

                treeData[id] = {
                    id: id,
                    parent: territory.parentTerritory ? territory.parentTerritory : 0,
                    text: territory.name,
                    items: []
                };

                $scope.territoriesIdsToNames[territory.id] = territory.name;
            }

            // build data stuctures (tree + flat)
            for (var key in treeData) {

                var node = treeData[key];
                var activeParent = getFirstActiveParent(node);

                if (node.parent !== 0 && activeParent) {
                    treeData[activeParent.id].items.push(node);
                } else {
                    m_locationTreeDataUnflatten.push(node);
                }
            }

            function getFirstActiveParent(node) {
                if (!node.id || !node.parent) return;

                if (treeData[node.parent.id]) {
                    return node.parent;
                } else {

                    // check if territory is even available for user
                    var parentNode = {};
                    if (ResourcesAndTerritoriesService.allTerritories[node.parent.id]) parentNode = {
                        id: ResourcesAndTerritoriesService.allTerritories[node.parent.id].id,
                        parent: ResourcesAndTerritoriesService.allTerritories[node.parent.id].parentTerritory ? ResourcesAndTerritoriesService.allTerritories[node.parent.id].parentTerritory : 0
                    };

                    return getFirstActiveParent(parentNode);
                }
            }

            $scope.locationsTree = m_locationTreeDataUnflatten;

            for (var i = 0; i < m_locationTreeDataUnflatten.length; i++) {
                setNodeDepth(m_locationTreeDataUnflatten[i], 0, $scope.locationsFlat);
            }

            // check if we need to show services without locations (and without resource)
            $scope.showOrphanServices = JSON.parse(userSettingsManager.GetUserSettingsProperty('Show_Orphan_Services__c'));
            $scope.showOrphanServicesOldValue = $scope.showOrphanServices;

            $scope.territoriesSortedByTree = sortLocationsByTree(ResourcesAndTerritoriesService.territories(), $scope.locationsFlat);

            // we have something saved, lets parse it
            if (userSettingsManager.GetUserSettingsProperty('locations') !== null) {
                userSettingLocations = userSettingsManager.GetUserSettingsProperty('locations');
            }

            sfdcService.callRemoteAction(RemoteActions.getUnPrivilegeUserSettingsFields).then(function (result) {

                if (result.length > 1) {

                    var errMsg = customLabels.Unprivileged_Usersettings_Fields_Msg.split('{1}'),
                        originalMsg = errMsg[0],
                        fields = '',
                        maxFields = 3;

                    for (var _i = 0; _i < result.length && _i < maxFields; ++_i) {
                        fields += '<br>' + result[_i];
                    }

                    if (maxFields < result.length) {
                        var additionalFields = result.length - maxFields;
                        fields += '<br>';
                        originalMsg += errMsg[1].replace('{2}', additionalFields);
                    }

                    originalMsg = originalMsg.replace('{0}', fields);
                    utils.addNotification(customLabels.Unprivileged_Usersettings_Fields, originalMsg);
                }
            }).catch(function (err) {
                console.warn('GetUserSettingsProperty failed :-(');
                console.error(err);
            });

            if ($scope.showAutocompleteTerritoryPicker && $scope.locationsFlat.length === 0 || userSettingLocations.length === 0) {
                $scope.showLocationFiltering = true;
                $scope.noLocationsLoad = true;
                open();

                if ($scope.locationsFlat.length === 0 || userSettingLocations.length === 0) {
                    $('#FirstTimeLoading').remove();
                }

                return;
            }

            for (var _i2 = 0; _i2 < $scope.locationsFlat.length; _i2++) {

                $scope.noLocationsLoad = false;
                $scope.locationFilter[$scope.locationsFlat[_i2].id] = userSettingLocations.indexOf($scope.locationsFlat[_i2].id) > -1;

                if ($scope.locationFilter[$scope.locationsFlat[_i2].id]) showLocations.push($scope.locationsFlat[_i2].id);
            }

            // make a copy, used when user closing without save
            $scope.locationFilterCopy = angular.copy($scope.locationFilter);
            userSettingsManager.SetUserSettingsProperty('locations', JSON.stringify(showLocations));
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

        $scope.applyFilterLocationWithRowsCheck = function () {

            var showLocations = [];

            for (var key in $scope.locationFilter) {
                if ($scope.locationFilter[key]) {
                    showLocations.push(key);
                }
            }

            if (showLocations.length === 0) {
                alert(customLabels.One_loaded_location);
                return;
            }

            var start = new Date(scheduler._min_date),
                finish = new Date(scheduler._max_date);

            start.setDate(start.getDate() - window.daysToLoadOnGanttInit);
            finish.setDate(finish.getDate() + window.daysToLoadOnGanttInit);

            $scope.currentlySavingTerritories = true;

            sfdcService.callRemoteAction(RemoteActions.maximumRowsOnGanttReached, start, finish, showLocations).then(function (res) {

                if (!res) {
                    $scope.applyFilterLocation();
                } else {
                    $scope.currentlySavingTerritories = false;
                    alert(customLabels.MaxedRowsReachedOnGanttAlert);
                }
            });
        };

        // apply location filtering (clean memory and bring new objects)
        $scope.applyFilterLocation = function () {

            var showLocations = [],
                hideLocations = [];

            for (var key in $scope.locationFilter) {
                if ($scope.locationFilter[key]) {
                    showLocations.push(key);
                } else {
                    hideLocations.push(key);
                }
            }

            if (showLocations.length === 0) {
                $scope.currentlySavingTerritories = false;
                alert(customLabels.One_loaded_location);
                return;
            }

            $scope.noLocationsLoad = false;

            angular.extend($scope.locationFilterCopy, $scope.locationFilter);
            $scope.showOrphanServicesOldValue = $scope.showOrphanServices;

            StateService.isLoadingNewLocations = true;

            GanttPalettesService.resetCurrentPalette();
            ServiceSelectorService.unselectAll();

            // save settings
            userSettingsManager.SetUserSettingProperties($scope.parseLocationSettings(JSON.stringify(showLocations), $scope.showOrphanServices)).then(function () {

                if ($scope.reload) {
                    window.window.location.reload();
                    return;
                }

                ResourcesAndTerritoriesService.getResourceAndTerritories(function resetObjects() {

                    // reset monthly
                    monthlyViewHelperService.reset();

                    // reset resource and territories
                    ResourcesAndTerritoriesService.reset();

                    // reset all gantt events
                    scheduler._events = {};
                    // delete all calendars, relocations...
                    scheduler.deleteMarkedTimespan();

                    // reset timephased object
                    var ServiceFromServerSearchId = servicesService.filter.searchOnServer;
                    //Don't delete the last service that came from 'Search All Records'
                    TimePhasedDataService.reset(ServiceFromServerSearchId);

                    // calendars, relocations... crew members... capacity white markings...
                    calendarsService.reset();
                    ResourceCrewsService.reset();
                    ResourceCapacitiesService.reset();
                    HolidayService.reset();
                }).then(function () {

                    $scope.currentlySavingTerritories = false;
                    TimePhasedDataService.resetReachedMaxRows();

                    var start = new Date(scheduler.getState().min_date),
                        finish = new Date(scheduler.getState().max_date);

                    TimePhasedDataService.getTimePhasedObjects(start, finish).then(function () {
                        if (servicesService.filter.searchOnServer && TimePhasedDataService.serviceAppointments(servicesService.filter.searchOnServer)) {
                            $rootScope.$broadcast('gotNewTimePhasedObjects', { start: start, finish: finish, serviceAppointments: TimePhasedDataService.serviceAppointments(servicesService.filter.searchOnServer) });
                        }
                        updateViewDebounced();
                        $rootScope.$broadcast('gotNewResources', { show: showLocations });
                        StateService.isLoadingNewLocations = false;

                        kpiCalculationsService.calculateKpis();
                    });
                });
            }).catch(function (err) {

                $scope.currentlySavingTerritories = false;

                var msg = customLabels.territories_r_failure_msg + '\n',
                    FailedLocations = JSON.parse(err.FailedLocations);

                for (var i = 0; i < FailedLocations.length; i++) {
                    msg += FailedLocations[i].Name + '\n';
                }

                utils.addNotification(customLabels.territories_r_failure, msg);
                StateService.isLoadingNewLocations = false;
            });

            $scope.closeLightbox();
        };

        $scope.parseLocationSettings = function (locations, showOrphanServices) {
            return {
                locations: locations,
                Show_Orphan_Services__c: showOrphanServices
            };
        };

        // for location filter
        $scope.selectLocation = function (locationId) {

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
        $scope.selectAllLocations = function (isSelectAll, filteredLocations, locationFilter, showTree) {

            if (!showTree) {
                $scope.selectAllFavoriteLocations(isSelectAll, filteredLocations, locationFilter);
                return;
            }

            angular.forEach(filteredLocations, function (item) {
                locationFilter[item.id] = isSelectAll;
            });
        };

        $scope.selectAllFavoriteLocations = function (isSelectAll, filteredLocations, locationFilter) {
            angular.forEach(filteredLocations, function (item) {
                if ($scope.isTerritoryInFavorite(item.id)) {
                    locationFilter[item.id] = isSelectAll;
                }
            });
        };

        function sortLocationsByTree(territories, flatLocations) {

            return Object.keys(territories).map(function (key) {
                return territories[key];
            }).sort(function (a, b) {

                var a_pos = 0,
                    b_pos = 0;

                flatLocations.forEach(function (location, index) {
                    if (location.id === a.id) {
                        a_pos = index;
                    }

                    if (location.id === b.id) {
                        b_pos = index;
                    }
                });

                if (a_pos > b_pos) return 1;
                if (a_pos < b_pos) return -1;
                return 0;
            });
        }

        $scope.searchTerritory = function (searchText) {

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
            window.Visualforce.remoting.Manager.invokeAction(window.RemoteActions.searchTerritories, searchText, function (result, ev) {

                if (ev.status) {

                    utils.safeApply($scope, function () {

                        // cache
                        $scope.cachedTerritoriesQueryResults[searchText.toLocaleLowerCase()] = result;
                        $scope.showResults = true;

                        // not synced with current value
                        if ($scope.searchText !== searchText) {
                            return;
                        }

                        $scope.currentlyLoading = false;
                        $scope.currentResults = result;

                        if (result.length === 0) {
                            $scope.noTerritoriesFoundOnSearch = true;
                        } else {
                            $scope.noTerritoriesFoundOnSearch = false;
                            result.forEach(function (t) {
                                $scope.allTerritoriesQueried[t.Name] = t;
                                $scope.territoriesIdsToNames[t.Id] = t.Name;
                            });
                        }
                    });
                } else {

                    console.warn(ev);
                }
            }, { buffer: true, escape: false, timeout: 120000 });
        };

        $scope.addToCurrentLoadedTerritories = function (id, shouldAdd) {

            var indexOfId = $scope.currentlyLoadedTerritories.indexOf(id);

            if (shouldAdd && indexOfId === -1) {
                $scope.currentlyLoadedTerritories.push(id);
            }

            if (!shouldAdd && indexOfId > 1) {
                $scope.currentlyLoadedTerritories.splice(indexOfId, 1);
            }
        };

        $scope.clearAutocompleteSearch = function () {

            $scope.currentResults = [];
            $scope.showResults = false;
            $scope.noTerritoriesFoundOnSearch = false;
            $scope.currentlyLoading = false;
            $scope.searchText = '';
        };

        $scope.selectTerritoriesWithAutocomplete = function (selectAll) {

            // selected menu
            if (!$scope.searchText) {

                $scope.currentlyLoadedTerritories.forEach(function (id) {
                    $scope.locationFilter[id] = selectAll;
                });
            }

            // search results
            else {

                    $scope.currentResults.forEach(function (territory) {
                        $scope.locationFilter[territory.Id] = selectAll;
                        $scope.addToCurrentLoadedTerritories(territory.Id, selectAll);
                    });
                }
        };

        // DOM element
        function generateTemplate() {
            return angular.element('\n                        <div class="LeftSideLocationFiltering" >\n\n                            <div class="leftFilteringContentContainer" ng-if="opened">\n\n                                <div id="TF-loadingTerritories" ng-show="currentlySavingTerritories">\n                                    <img src="' + window.lsdIcons.spinnerGif + '" />\n                                    Loading Service Territories\n                                </div>\n\n                                <div class="territories-list-type-tabs">\n                                    <button tabindex="0" fsl-tab-switch role="tab" ng-click="setShowTree(true)" ng-class="{\'active-territory-tab\' : showTree}">' + customLabels.TerritoriesTree + '</button>\n                                    <button fsl-tab-switch role="tab" ng-click="setShowTree(false)" ng-class="{\'active-territory-tab\' : !showTree}">' + customLabels.Favorites + '</button>\n                                </div>\n                                \n                                <div tabindex="0" role="tooltip" id="leftLocationFiltering-tooltip" aria-label="' + (showSecondarySTMs && useLocationTimezone ? customLabels.LocationFilteringParagraph + '\n\n ' + customLabels.Stms_with_different_tz : customLabels.LocationFilteringParagraph) + '" tooltip-trigger="focus blur mouseenter mouseleave" tooltip-animation="false" tooltip-class="horizonTooltip tooltip-location-inner" tooltip-append-to-body="true" tooltip-placement="bottom" \n                                    tooltip="' + (showSecondarySTMs && useLocationTimezone ? customLabels.LocationFilteringParagraph + '\n\n ' + customLabels.Stms_with_different_tz : customLabels.LocationFilteringParagraph) + '">\n                                    <svg aria-hidden="true" class="slds-icon info-tooltip-icon">\n                                        \u2028<use xlink:href="' + lsdIcons.info + '"></use>\n                                    \u2028</svg>\n                                </div>\n\n                                <div class="leftLocationFilteringConf">\n                                \n\n                                    <div class="addBorderBottom">\n                                        <input type="checkbox" ng-model="$parent.showOrphanServices" id="servicesNoLocations" />\n                                        <label for="servicesNoLocations">' + customLabels.unassosiated_filtering + '</label><br/>\n                                    </div>\n\n                                    <input \n                                        id="locationFilteringSearch" \n                                        ng-show="(!showAutocompleteTerritoryPicker)" \n                                        type="search" ng-model="locationSearchTerm.text" \n                                        placeholder="' + customLabels.Search_location + '" \n                                    />\n                                    \n                                    <span fsl-key-press tabindex="0"\n                                        id="TF-SelectAllTerritoriesButton"\n                                        class="selectAllLocationsWhite truncate" \n                                        ng-click="selectAllLocations(true, filteredLocations, locationFilter, showTree)" \n                                        ng-hide="showAutocompleteTerritoryPicker" \n                                        title="' + customLabels.Select_all + '">\n                                            ' + customLabels.Select_all + '\n                                        </span>\n                                        \n                                    <span fsl-key-press tabindex="0"\n                                        id="TF-DeselectAllTerritoriesButton"\n                                        class="selectAllLocationsWhite truncate" \n                                        ng-click="selectAllLocations(false, filteredLocations, locationFilter, showTree)" \n                                        ng-hide="showAutocompleteTerritoryPicker"\n                                        title="' + customLabels.Select_none + '">\n                                            ' + customLabels.Select_none + '\n                                    </span>\n                                    \n                                    \n                                    \n                                    <img class="tp-spinner" ng-show="$parent.currentlyLoading && showTree" src="' + window.lsdIcons.spinnerGif + '" />\n                                    \n                                    <svg aria-hidden="true" class="slds-icon tp-clear-territory-search" ng-show="$parent.searchText && !$parent.currentlyLoading && showTree" ng-click="clearAutocompleteSearch()">\n                                        \u2028<use xlink:href="' + lsdIcons.close + '"></use>\n                                    \u2028</svg>\n                                    \n                                    \n                                    <input type="text" \n                                        ng-show="showAutocompleteTerritoryPicker && showTree" \n                                        class="tp-search-input"\n                                        placeholder="' + window.customLabels.SearchServiceTerritory + '" \n                                        ng-model="$parent.searchText" \n                                        ng-model-options="{ debounce: 333 }" \n                                        ng-change="searchTerritory(searchText)" \n                                        ng-click="setSearchResultBox($event)" \n                                    />\n                                    \n                                    \n                                    <span fsl-key-press tabindex="0"\n                                        id="TF-SelectAllTerritoriesButton"\n                                        class="selectAllLocationsWhite truncate" \n                                        ng-show="showAutocompleteTerritoryPicker && showTree" \n                                        ng-click="selectTerritoriesWithAutocomplete(true)" \n                                        title="' + customLabels.Select_all + '">\n                                            ' + customLabels.Select_all + '\n                                        </span>\n                                        \n                                    <span fsl-key-press tabindex="0"\n                                        id="TF-DeselectAllTerritoriesButton"\n                                        class="selectAllLocationsWhite truncate" \n                                        ng-show="showAutocompleteTerritoryPicker && showTree" \n                                        ng-click="selectTerritoriesWithAutocomplete(false)"\n                                        title="' + customLabels.Select_none + '">\n                                            ' + customLabels.Select_none + '\n                                    </span>\n                                    \n                                    \n                               \n                                </div>\n                                \n                                   \n                                   \n                                <!-- Territories tree with auto complete -->\n                                        \n                                <div id="TF-TerritoriesTreeWithAutoComplete" class="LocationsTree" ng-show="showAutocompleteTerritoryPicker && showTree">\n                                \n                                \n                                    <!-- SEARCH RESULTS -->\n                                    \n                                    <div class="tp-territories-found-summary" ng-show="$parent.searchText && !currentlyLoading && !noTerritoriesFoundOnSearch">\n                                        {{ searchResultText.replace(\'$0\', currentResults.length) }}\n                                    </div>\n                                \n                                    <div ng-repeat="territory in currentResults" class="locationFilterRow">\n                                \n                                        <input type="checkbox" ng-model="locationFilter[territory.Id]" id="location_{{ territory.Id }}" ng-change="addToCurrentLoadedTerritories(territory.Id, locationFilter[territory.Id])" />\n                                        \n                                        <svg aria-hidden="true" class="slds-icon favorite-territory" ng-class="{\'territory-is-fav\': isTerritoryInFavorite(territory.Id)}" ng-click="toggleFavorite(territory.Id)">\n                                            \u2028<use xlink:href="' + lsdIcons.favorite + '"></use>\n                                        \u2028</svg>\n                                        \n                                        <label for="location_{{ territory.Id }}" ng-bind="territory.Name"></label>\n                                        <span class="ter-search-parent" ng-if="territory.ParentTerritory">({{ territory.ParentTerritory.Name }})</span>\n                                        \n                                        <span title="' + customLabels.SwitchTerritoryHelp + '" class="switch-location" ng-click="switchToTerritory(territory.Id)">' + customLabels.SwitchTerritory + '</span>\n                                        \n                                    </div>\n                                    \n                                    \n                                    \n                                    <!-- CURRENTLY LOADED -->\n                                    \n                                    <div ng-repeat="territoryId in currentlyLoadedTerritories" ng-show="!$parent.searchText" class="locationFilterRow">\n                                \n                                        <input type="checkbox" ng-model="locationFilter[territoryId]" id="location_{{ territoryId }}" />\n                                        \n                                        <svg aria-hidden="true" class="slds-icon favorite-territory" ng-class="{\'territory-is-fav\': isTerritoryInFavorite(territoryId)}" ng-click="toggleFavorite(territoryId)">\n                                            \u2028<use xlink:href="' + lsdIcons.favorite + '"></use>\n                                        \u2028</svg>\n                                        \n                                        <label for="location_{{ territoryId }}">{{territoriesIdsToNames[territoryId]}}</label>\n                                        <span class="ter-search-parent" ng-if="getParentTerritory(territoryId)">({{ getParentTerritory(territoryId).name }})</span>\n                                        \n                                        <span title="' + customLabels.SwitchTerritoryHelp + '" class="switch-location" ng-click="switchToTerritory(territoryId)">' + customLabels.SwitchTerritory + '</span>\n                                        \n                                    </div>\n                                   \n                                    <div class="tp-no-territories-found" ng-show="noTerritoriesFoundOnSearch && !currentlyLoading">\n                                        ' + customLabels.NoServiceTerritoriesWereFound + '\n                                    </div>\n                                    \n                                </div>\n                                   \n                                   \n                                <div id="TF-TerritoriesFavoritesAutoComplete" class="LocationsTree" ng-show="showAutocompleteTerritoryPicker && !showTree">\n                                    \n                                    <div ng-repeat="territoryId in favorites" class="locationFilterRow">\n                                \n                                        <input type="checkbox" ng-model="locationFilter[territoryId]" id="location_{{ territoryId }}" />\n                                        \n                                        <svg aria-hidden="true" class="slds-icon favorite-territory" ng-class="{\'territory-is-fav\': isTerritoryInFavorite(territoryId)}" ng-click="toggleFavorite(territoryId)">\n                                            \u2028<use xlink:href="' + lsdIcons.favorite + '"></use>\n                                        \u2028</svg>\n                                        \n                                        <label for="location_{{ territoryId }}">{{territoriesIdsToNames[territoryId]}}</label>\n                                        \n                                        <span title="' + customLabels.SwitchTerritoryHelp + '" class="switch-location" ng-click="switchToTerritory(territoryId)">' + customLabels.SwitchTerritory + '</span>\n                                        \n                                    </div>\n                                    \n                                </div>      \n                                   \n                                   \n                                   \n                                   \n                                <!-- Territories tree without auto complete -->\n                                        \n                                <div id="TF-TerritoriesTree" class="LocationsTree" ng-show="showTree && !showAutocompleteTerritoryPicker">\n                                    <div ng-repeat="l in filteredLocations = (locationsFlat | filter:locationSearchTerm)" class="locationFilterRow" ng-style="{{ styleForLocationTree(l.depth) }}" ng-click="selectLocation(l.id)">\n                                        <input type="checkbox" ng-model="locationFilter[l.id]" id="location_{{ l.id }}" />\n                                        \n                                        <svg aria-hidden="true" class="slds-icon favorite-territory" ng-class="{\'territory-is-fav\': isTerritoryInFavorite(l.id)}" ng-click="toggleFavorite(l.id)">\n                                            \u2028<use xlink:href="' + lsdIcons.favorite + '"></use>\n                                        \u2028</svg>\n                                        \n                                        <label for="location_{{ l.id }}" ng-bind="l.text"></label>\n                                        \n                                        <span title="' + customLabels.SwitchTerritoryHelp + '" class="switch-location" ng-click="switchToTerritory(l.id)">' + customLabels.SwitchTerritory + '</span>\n                                        \n                                    </div>\n                                </div>\n                                \n                                \n                                \n                                <!-- Territories list without auto complete -->\n                                \n                                <div id="TF-TerritoriesListFavorites" class="LocationsTree" ng-show="!showTree && !showAutocompleteTerritoryPicker">\n                                \n                                    <div ng-repeat="l in filteredLocations = (locationsFlat | filter:locationSearchTerm)" ng-show="isTerritoryInFavorite(l.id)" class="locationFilterRow">\n                                        <input type="checkbox" ng-model="locationFilter[l.id]" id="location_f_{{ l.id }}" />\n                                        \n                                        <svg aria-hidden="true" class="slds-icon favorite-territory" ng-class="{\'territory-is-fav\': isTerritoryInFavorite(l.id)}" ng-click="toggleFavorite(l.id)">\n                                            \u2028<use xlink:href="' + lsdIcons.favorite + '"></use>\n                                        \u2028</svg>\n                                        \n                                        <label for="location_f_{{ l.id }}" ng-bind="l.text"></label>\n                                        \n                                        <span title="' + customLabels.SwitchTerritoryHelp + '" class="switch-location" ng-click="switchToTerritory(l.id)">' + customLabels.SwitchTerritory + '</span>\n                                        \n                                    </div>\n                                </div>\n                                    \n\n                            </div>\n                            \n\n                            <div class="lightboxControllers">\n                                <button class="lightboxSaveButton cancelButtonAndClose" ng-click="closeLightbox()">' + customLabels.Cancel + '</button>\n                                <button class="lightboxSaveButton" ng-click="applyFilterLocationWithRowsCheck()">' + customLabels.Save + '</button>\n                            </div>\n\n                        </div>\n                ');
        }

        function getFlatTerritoriesArray() {
            return $scope.locationsFlat;
        }

        function getTerritoriesSortedByTree() {
            return $scope.showAutocompleteTerritoryPicker ? window._.toArray(ResourcesAndTerritoriesService.territories()) : $scope.territoriesSortedByTree;
        }

        // This will be our factory
        return {
            isOpen: isOpen,
            open: open,
            getFlatTerritoriesArray: getFlatTerritoriesArray,
            getTerritoriesSortedByTree: getTerritoriesSortedByTree,
            isNoTerritoryLoadded: isNoTerritoryLoadded
        };
    }
})();