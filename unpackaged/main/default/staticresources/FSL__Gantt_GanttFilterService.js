'use strict';

(function () {

    GanttFilterService.$inject = ['$q', 'sfdcService', 'utils', 'FieldSetFieldsService'];

    angular.module('serviceExpert').factory('GanttFilterService', GanttFilterService);

    function GanttFilterService($q, sfdcService, utils, FieldSetFieldsService) {

        var filtersPromise = $q.defer(),
            filters = [],
            filterMap = {};

        if (useNewFilters) {

            var filtersReady = sfdcService.callRemoteAction(RemoteActions.getGanttFilters),
                fieldsetsReady = FieldSetFieldsService.fieldsSetFields();

            $q.all([filtersReady, fieldsetsReady]).then(function (results) {

                var fieldsets = results[1],
                    sfdcFilters = results[0],
                    fieldsetMap = { FSL__RULE_VIOLATIONS__FSL: true };

                for (var key in fieldsets) {
                    fieldsets[key].forEach(function (k) {
                        fieldsetMap[k.FullAPIName] = true;
                        fieldsetMap[k.APIName] = true;
                    });
                }

                var ganttFilters = [];

                sfdcFilters.forEach(function (filter) {

                    var parsedFilter = parseFilter(filter);

                    if (validateFilter(parsedFilter, fieldsetMap)) {
                        ganttFilters.push(parsedFilter);
                    }
                });

                // W-16674102 - Sort custom filters
                ganttFilters.sort(sortCustomFilters);

                filters = ganttFilters;
                filtersPromise.resolve(ganttFilters);
            });
        }

        function validateFilter(filter, fieldsets) {

            // no criterias, all good
            if (!filter.Criterias) {
                return true;
            }

            for (var k in filter.Criterias) {

                if (filter.Criterias[k].property.indexOf('.') > -1) {
                    console.warn('INVALID FILTER: ' + filter.Name + ' (Id: ' + filter.Id + ')');
                    return false;
                }

                if (!fieldsets[filter.Criterias[k].property]) {
                    console.warn('INVALID FILTER: ' + filter.Name + ' (Id: ' + filter.Id + ')');
                    return false;
                }
            }

            return true;
        }

        // check if we need to create the logic (1 AND 2 AND ..... )
        function parseLogic(logic, criterias) {

            if (!logic) {

                logic = '';

                for (var i in criterias) {
                    logic += i + ' AND ';
                }

                return shieldLogic(logic.substr(0, logic.length - 5));
            }

            return shieldLogic(logic);
        }

        // add {} around numbers
        function shieldLogic(logic) {

            var shieldedLogic = logic;

            for (var i = 1; i <= 10; i++) {

                if (i === 1 && logic.indexOf('1') > -1) {
                    var i1 = shieldedLogic.indexOf(1),
                        i10 = shieldedLogic.indexOf(10);

                    // that means both 10 and 1 are present and 10 is before 1
                    if (i1 !== -1 && i1 === i10) {
                        i1 = shieldedLogic.lastIndexOf(1);
                    }

                    shieldedLogic = shieldedLogic.substr(0, i1) + '{1} ' + shieldedLogic.substr(i1 + 2);
                    continue;
                }

                // index not present
                if (shieldedLogic.indexOf(i) !== -1) {
                    shieldedLogic = shieldedLogic.replace(i, '{' + i + '}');
                }
            }

            return shieldedLogic;
        }

        function getFilterById(id) {

            var filter = null;

            filters.forEach(function (f) {
                filter = f.Id === id ? f : filter;
            });

            return filter;
        }

        function getFilterFromSalesforce(id) {

            var def = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.getFilterById, id).then(function (filter) {

                var parsedFilter = parseFilter(filter),
                    newFilter = true;

                for (var i = 0; i < filters.length; i++) {
                    if (filters[i].Id === parsedFilter.Id) {
                        filters[i] = parsedFilter;
                        newFilter = false;
                        break;
                    }
                }

                if (newFilter) {

                    filters.push(parsedFilter);

                    // W-16674102 - Sort custom filters after the addition of a new filter
                    filters.sort(sortCustomFilters);
                }

                def.resolve(parsedFilter);
            });

            return def.promise;
        }

        function deleteFilter(id) {

            var def = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.deleteFilter, id).then(function () {

                var foundIndex = -1;

                for (var i = 0; i < filters.length; i++) {
                    if (filters[i].Id === id) {
                        foundIndex = i;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    filters.splice(foundIndex, 1);
                }

                def.resolve(id);
            });

            return def.promise;
        }

        function hideFilter(id) {

            var def = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.hideFilter, id).then(function () {

                var foundIndex = -1;

                for (var i = 0; i < filters.length; i++) {
                    if (filters[i].Id === id) {
                        foundIndex = i;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    filters.splice(foundIndex, 1);
                }

                def.resolve(id);
            });

            return def.promise;
        }

        function parseFilter(sobjectFilter) {

            var criterias = false,
                disabled = false;

            try {
                if (sobjectFilter[fieldNames.GanttFilter.Criterias]) {
                    criterias = JSON.parse(sobjectFilter[fieldNames.GanttFilter.Criterias]);
                }
            } catch (ex) {
                disabled = true;
                utils.addNotification(window.customLabels.CustomFilterInvalidCriteriaButlerMsg, window.customLabels.CustomFilterInvalidCriteriaButlerBody.replace('$0', sobjectFilter[fieldNames.GanttFilter.Name]), null, null);
            }

            return {
                Id: sobjectFilter.Id,
                Name: sobjectFilter[fieldNames.GanttFilter.Name],
                Description: sobjectFilter[fieldNames.GanttFilter.Description],
                Days_after_horizon: sobjectFilter[fieldNames.GanttFilter.Days_after_horizon],
                Days_before_horizon: sobjectFilter[fieldNames.GanttFilter.Days_before_horizon],
                Criterias: criterias,
                List_only_appointments_on_the_gantt: sobjectFilter[fieldNames.GanttFilter.List_only_appointments_on_the_gantt],
                Logic: parseLogic(sobjectFilter[fieldNames.GanttFilter.Logic], criterias),
                Public: sobjectFilter[fieldNames.GanttFilter.Public],
                Hidden: sobjectFilter[fieldNames.GanttFilter.Hidden],
                CreatedById: sobjectFilter.CreatedById,
                Displayed_Fields: sobjectFilter[fieldNames.GanttFilter.Displayed_Fields] ? JSON.parse(sobjectFilter[fieldNames.GanttFilter.Displayed_Fields]) : null,
                disabled: disabled
            };
        }

        function setFilterMap(map) {
            filterMap = Object.assign(map, {});
        }

        function getFilterMap() {
            return filterMap;
        }

        function sortCustomFilters(filter1, filter2) {

            if (filter1.Name > filter2.Name) {
                return 1;
            }

            if (filter1.Name < filter2.Name) {
                return -1;
            }

            return 0;
        }

        return {
            filtersPromise: filtersPromise.promise,
            getFilterById: getFilterById,
            getFilterFromSalesforce: getFilterFromSalesforce,
            deleteFilter: deleteFilter,
            hideFilter: hideFilter,
            setFilterMap: setFilterMap,
            getFilterMap: getFilterMap

        };
    }
})();