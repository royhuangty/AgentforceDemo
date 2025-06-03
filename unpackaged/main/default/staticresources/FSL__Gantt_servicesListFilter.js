'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {

    angular.module('serviceExpert').filter('servicesListFilter', ['utils', '$filter', 'servicesService', 'userSettingsManager', 'ServiceSelectorService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'BundleService', 'ResourcesAndTerritoriesService', function (utils, $filter, servicesService, userSettingsManager, ServiceSelectorService, SERVICE_STATUS, SERVICE_CATEGORY, BundleService, ResourcesAndTerritoriesService) {

        return function (services, filter, servicesListFields, allFilters) {

            var checksum = generateChecksum(services, filter);
            var platformEventServices = {};

            if (filter.selectedFilter === 'SearchOnServer') {

                // W-9329001
                var searchOnServerResult = services[filter.searchOnServer] ? [services[filter.searchOnServer]] : [],
                    _totalChecksum = 0;

                searchOnServerResult.forEach(function (s) {
                    return _totalChecksum += s.totalModifiedTimes;
                });

                searchOnServerResult.checksum += _totalChecksum.toString();

                return searchOnServerResult;
            }

            if (filter.isPlatformEventFilter) {
                filter.platformEventFilters[filter.selectedFilter].forEach(function (id) {
                    if (services[id]) {
                        platformEventServices[id] = services[id];
                    }
                });
            }

            var isOldFilter = allFilters && allFilters[filter.selectedFilter] && allFilters[filter.selectedFilter].old;

            if (useNewFilters && !isOldFilter) {

                var servicesToFilter = filter.isPlatformEventFilter ? platformEventServices : services;

                var newFilterResult = $filter('servicesListFilterNew')(servicesToFilter, filter, servicesListFields);

                newFilterResult.checksum = checksum + newFilterResult.totalChecksum.toString();

                return newFilterResult;
            }

            var servicesArray = [],
                endDate = new Date(filter.endDate),
                startDate = utils.addDaysToDate(endDate, -utils.ganttSettings.backHorizon),
                minDate = scheduler.getState().min_date,
                maxDate = scheduler.getState().max_date,
                customFilter = isStorageFilter(filter.selectedFilter),
                multiSearch = null,
                searchTextArray = [];

            if (filter.SearchText.indexOf(',') > -1) {
                multiSearch = filter.SearchText.replace(/, /g, ',').split(',');

                // bug fixing
                if (multiSearch[multiSearch.length - 1] === '') multiSearch.length--;
            }

            if (multiSearch) {
                searchTextArray = multiSearch;
            } else {
                searchTextArray.push(filter.SearchText);
            }

            var totalChecksum = 0,
                showOrphan = userSettingsManager.GetUserSettingsProperty('Show_Orphan_Services__c'),
                loadedTerritories = userSettingsManager.GetUserSettingsProperty('locations') || [];

            for (var key in services) {

                // W-14485537
                if (!(services[key] instanceof GanttService)) {
                    continue;
                }

                if (utils.shouldFilterServiceFromList(services[key], loadedTerritories, showOrphan)) {
                    continue;
                }

                for (var i = 0; i < searchTextArray.length; i++) {

                    var searchText = searchOnService(services[key], searchTextArray[i], servicesListFields),
                        checkDatesResult = checkDates(services[key], filter.selectedFiled, startDate, endDate);

                    if (filter.selectedFilter === 'Selected') {
                        if (ServiceSelectorService.SelectedServices[key] && ServiceSelectorService.SelectedServices[key] && searchText) {
                            totalChecksum += services[key].totalModifiedTimes;
                            servicesArray.push(services[key]);
                            break;
                        }
                    } else if (filter.selectedFilter === 'Flagged' && searchText) {
                        if (servicesService.flagged[key]) {
                            totalChecksum += services[key].totalModifiedTimes;
                            servicesArray.push(services[key]);
                            break;
                        }
                    } else if (filter.selectedFilter === 'Recent' && searchText) {
                        if (servicesService.recentlyUsed[key]) {
                            totalChecksum += services[key].totalModifiedTimes;
                            servicesArray.push(services[key]);
                            break;
                        }
                    } else if (filter.selectedFilter === 'Todo') {

                        if ((services[key].statusCategory === SERVICE_CATEGORY.NONE || services[key].violations || services[key].jeopardy) && services[key].statusCategory !== SERVICE_CATEGORY.CANCELED && services[key].statusCategory !== SERVICE_CATEGORY.COMPLETED) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'All') {

                        if (checkDatesResult) {

                            if (searchTextArray[i].length > 1 && searchText) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            } else if (searchTextArray[i].length <= 1) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            }
                        }
                    } else if (filter.selectedFilter === 'Unscheduled') {

                        if (!services[key].resource && services[key].statusCategory != SERVICE_CATEGORY.CANCELED) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'Violating') {

                        if (services[key].violations && services[key].statusCategory != SERVICE_CATEGORY.CANCELED) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'inJeopardy') {

                        if (services[key].jeopardy && services[key].statusCategory != SERVICE_CATEGORY.CANCELED) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'Scheduled') {

                        if (services[key].resource) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'Gantt filter') {

                        if (services[key].resource && services[key].start <= maxDate && services[key].finish >= minDate) {

                            // CFSL-446
                            var passingLongViewFilter = true;

                            if (scheduler._mode === 'LongView') {

                                var eventLengthInHours = (services[key].finish - services[key].start) / 1000 / 60 / 60;

                                if (window.__currentViewOptions.showMdt) {

                                    // remove FSL__ prefix
                                    var mdtField = window.mdtBooleanField.indexOf('FSL__') === 0 ? window.mdtBooleanField.substr(5, window.mdtBooleanField.length - 5) : window.mdtBooleanField;
                                    passingLongViewFilter = eventLengthInHours >= window.__currentViewOptions.minServiceDuration && services[key].fields[mdtField];
                                } else {
                                    passingLongViewFilter = eventLengthInHours >= window.__currentViewOptions.minServiceDuration;
                                }
                            }

                            if (searchTextArray[i].length > 1 && searchText && passingLongViewFilter) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            } else if (searchTextArray[i].length <= 1 && passingLongViewFilter) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            }
                        }
                    } else if (filter.selectedFilter === 'Contractors filter') {

                        if (services[key].resourceContractor) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (filter.selectedFilter === 'Cancelled filter') {

                        if (services[key].statusCategory === SERVICE_CATEGORY.CANCELED && checkDatesResult) {

                            if (searchTextArray[i].length > 1 && searchText) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            } else if (searchTextArray[i].length <= 1) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            }
                        }
                    } else if (filter.selectedFilter === 'Crews filter') {

                        if (services[key].isAssignToCrew) {
                            //Show SA's that are assigned to crews

                            if (searchTextArray[i].length > 1 && searchText) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            } else if (searchTextArray[i].length <= 1) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            }
                        }

                        // SAs that requires a crew (based on WO field - required/min crew size - if not null/blank/0 - SA should be scheduled to crew and be visible in Crew list view.
                        else if (services[key].parentFields.MinimumCrewSize !== undefined || services[key].parentFields.RecommendedCrewSize !== undefined) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                    } else if (filter.selectedFilter === 'Exclude Bundle Members') {

                        if (!BundleService.isBundleMember(services[key])) {
                            if (checkDatesResult) {

                                if (searchTextArray[i].length > 1 && searchText) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                } else if (searchTextArray[i].length <= 1) {
                                    totalChecksum += services[key].totalModifiedTimes;
                                    servicesArray.push(services[key]);
                                    break;
                                }
                            }
                        }
                    } else if (customFilter) {

                        if (customFilter.statusCheckboxs[statusTranslations[services[key].status]] && checkAdvanceFilterDates(customFilter, filter.selectedFiled, services[key]) && checkPriority(services[key], customFilter.servicePriority) && checkSelectFilter(services[key], customFilter) && checkCustomFilterLocations(services[key], customFilter.locationsCheckboxs, customFilter.noLocation)) {

                            if (searchTextArray[i].length > 1 && searchText) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            } else if (searchTextArray[i].length <= 1) {
                                totalChecksum += services[key].totalModifiedTimes;
                                servicesArray.push(services[key]);
                                break;
                            }
                        }
                    }
                } //end  search term for
            } //end services for

            var filterResult = $filter('orderBy')(servicesArray, filter.orderByField, filter.reverse);
            filterResult.checksum = checksum + totalChecksum.toString();
            return filterResult;
        };

        function generateChecksum(services, filter) {

            var checksum = Object.keys(services).length.toString();
            for (var key in filter) {

                if (_typeof(filter[key]) !== 'object') {

                    if (typeof filter[key] === 'boolean') {
                        checksum += filter[key] ? '1' : '0';
                        continue;
                    }

                    checksum += filter[key].toString();
                }
            }

            // individual proccessing - endDate
            checksum += filter.endDate.getTime();

            // individual proccessing - selectedFiled
            for (var _key in filter.selectedFiled) {
                checksum += filter.selectedFiled[_key] ? '1' : '0';
            }

            // individual proccessing - filter.advancedFilter.selectedFiled
            for (var _key2 in filter.advancedFilter.selectedFiled) {
                checksum += filter.advancedFilter.selectedFiled[_key2] ? '1' : '0';
            }

            // individual proccessing - filter.advancedFilter.statusCheckboxs
            for (var _key3 in filter.advancedFilter.statusCheckboxs) {
                checksum += filter.advancedFilter.statusCheckboxs[_key3] ? '1' : '0';
            }

            checksum += filter.advancedFilter.minDate.toString();
            checksum += filter.advancedFilter.maxDate.toString();
            checksum += filter.advancedFilter.servicePriority;
            checksum += filter.advancedFilter.jeopardies ? '1' : '0';
            checksum += filter.advancedFilter.unScheduled ? '1' : '0';
            checksum += filter.advancedFilter.violations ? '1' : '0';

            return checksum;
        }

        function searchOnService(service, searchText, servicesListFields) {

            if (service.name && service.name.toLowerCase().indexOf(searchText.toLowerCase()) != -1) {
                return true;
            } else if (service.ganttLabel && service.ganttLabel.toLowerCase().indexOf(searchText.toLowerCase()) != -1) {
                return true;
            } else if (service.accountName && service.accountName.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                return true;
            } else if (service.resourceName && service.resourceName.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                return true;
            }

            // 18 chars id
            else if (searchText.length == 18 && service.id && service.id.toLowerCase() == searchText.toLowerCase()) {
                    return true;
                } else if (service.serviceTerritoryName && service.serviceTerritoryName.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                    return true;
                } else if (utils.statusTranslations[service.status] && utils.statusTranslations[service.status].toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                    return true;
                }

            for (var i = 0; i < servicesListFields.length; i++) {

                var fieldType = servicesListFields[i].Type,
                    fieldValue = service[servicesListFields[i].APIName] ? service[servicesListFields[i].APIName].toString() : null;

                if (fieldType === utils.fieldsTypes.String || fieldType === utils.fieldsTypes.TextArea || fieldType === utils.fieldsTypes.Reference || fieldType === utils.fieldsTypes.Picklist || fieldType === utils.fieldsTypes.Double) {

                    if (fieldValue && fieldValue.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                        return true;
                    }
                }
            }

            return false;
        }

        function checkDates(item, selectedFiled, startDate, endDate) {

            var date = new Date(endDate);

            if (typeof selectedFiled.earlyStart != 'undefined' && selectedFiled.earlyStart && item.earlyStart && item.earlyStart > startDate && item.earlyStart <= date) {
                return true;
            } else if (typeof selectedFiled.dueDate != 'undefined' && selectedFiled.dueDate && item.dueDate && item.dueDate > startDate && item.dueDate <= date) {
                return true;
            } else if (typeof selectedFiled.appStart != 'undefined' && selectedFiled.appStart && item.appStart && item.appStart > startDate && item.appStart <= date) {
                return true;
            } else if (typeof selectedFiled.appEnd != 'undefined' && selectedFiled.appEnd && item.appEnd && item.appEnd > startDate && item.appEnd <= date) {
                return true;
            } else if (typeof selectedFiled.finish != 'undefined' && selectedFiled.finish && item.finish && item.finish > startDate && item.finish <= date) {
                return true;
            } else if (typeof selectedFiled.start != 'undefined' && selectedFiled.start && item.start && item.start > startDate && item.start <= date) {
                return true;
            } else if (typeof selectedFiled.display != 'undefined' && selectedFiled.display && item.ganttDisplay && item.ganttDisplay > startDate && item.ganttDisplay <= date) {
                return true;
            }

            return false;
        }

        function checkAdvanceFilterDates(advancedFilterObj, selectedFiled, item) {

            var minDate = new Date(advancedFilterObj.minDate),
                maxDate = new Date(advancedFilterObj.maxDate);

            minDate.setHours(0);
            minDate.setMinutes(0);
            maxDate.setDate(maxDate.getDate() + 1);
            maxDate.setHours(0);
            maxDate.setMinutes(0);

            for (var dateFiled in selectedFiled) {

                if (selectedFiled[dateFiled] && checkDateBetweenDates(item, dateFiled, minDate, maxDate)) {
                    return true;
                }
            }

            return false;
        }

        function checkDateBetweenDates(item, dateType, minDate, maxDate) {

            if (typeof item[dateType] == 'undefined') {
                return false;
            }

            return item[dateType] >= minDate && item[dateType] <= maxDate;
        }

        function checkPriority(item, servicePriority) {
            return item.priority <= servicePriority;
        }

        function checkSelectFilter(item, advancedFilterObj) {

            if (item.jeopardy && !advancedFilterObj.jeopardies) {
                return false;
            }

            if (item.violations && !advancedFilterObj.violations) {
                return false;
            }

            return !(item.start_date === null && !advancedFilterObj.unScheduled);
        }

        function checkCustomFilterLocations(service, locationsCheckboxs, noLocation) {
            if (noLocation && !service.location) return true;

            for (var territoryName in locationsCheckboxs) {
                if (service.serviceTerritoryName === territoryName && locationsCheckboxs[territoryName]) {
                    return true;
                }
            }

            return false;
        }

        function isStorageFilter(filterName) {

            if (userSettingsManager.GetUserSettingsProperty('Filters__c') == undefined) return null;

            var storageFilters = _typeof(userSettingsManager.GetUserSettingsProperty('Filters__c')) === "object" ? userSettingsManager.GetUserSettingsProperty('Filters__c') : JSON.parse(userSettingsManager.GetUserSettingsProperty('Filters__c'));

            for (var i = 0; i < storageFilters.length; i++) {
                if (storageFilters[i].name === filterName) return storageFilters[i].filter;
            }

            return null;
        }
    }]);
})();