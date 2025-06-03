'use strict';

(function () {

    window.__ganttFilterFieldSet = {};
    window.__picklistArrayForFilter = [];
    window.__evalConditionValue = {};

    angular.module('serviceExpert').filter('servicesListFilterNew', ['utils', '$filter', 'GanttFilterService', 'FieldSetFieldsService', 'userSettingsManager', function (utils, $filter, GanttFilterService, FieldSetFieldsService, userSettingsManager) {

        FieldSetFieldsService.fieldsSetFields().then(function (fields) {
            fields.ganttFilter.forEach(function (field) {
                return __ganttFilterFieldSet[field.FullAPIName] = field;
            });
        });

        return function (services, filter, servicesListFields) {

            var totalChecksum = 0,
                servicesArray = [],
                selectedFilter = filter.isPlatformEventFilter ? filter.selectedFilter : GanttFilterService.getFilterById(filter.selectedFilter),
                servicesInsidePlatformEventFilter = new Set();

            // no filters
            if (!selectedFilter) {
                for (var serviceId in services) {
                    totalChecksum += services[serviceId].totalModifiedTimes;
                    servicesArray.push(services[serviceId]);
                }
            } else {

                if (filter.isPlatformEventFilter && filter.platformEventFilters[selectedFilter]) {
                    servicesInsidePlatformEventFilter = new Set(filter.platformEventFilters[selectedFilter]);
                }

                // for text search
                var multiSearch = null,
                    searchTextArray = [];

                if (filter.SearchText.indexOf(',') > -1) {
                    multiSearch = filter.SearchText.replace(/, /g, ',').split(',');

                    if (multiSearch[multiSearch.length - 1] === '') {
                        multiSearch.length--;
                    }
                }

                if (multiSearch) {
                    searchTextArray = multiSearch;
                } else {
                    searchTextArray.push(filter.SearchText);
                }

                var showOrphan = userSettingsManager.GetUserSettingsProperty('Show_Orphan_Services__c'),
                    loadedTerritories = userSettingsManager.GetUserSettingsProperty('locations') || [];

                for (var _serviceId in services) {

                    if (!filter.isPlatformEventFilter && utils.shouldFilterServiceFromList(services[_serviceId], loadedTerritories, showOrphan)) {
                        continue;
                    }

                    // searching...
                    if (filter.SearchText) {

                        var foundSearchMatch = false;

                        for (var i = 0; i < searchTextArray.length; i++) {
                            if (searchOnService(services[_serviceId], searchTextArray[i], servicesListFields)) {
                                foundSearchMatch = true;
                                if (filter.isPlatformEventFilter && servicesInsidePlatformEventFilter.has(_serviceId)) {
                                    servicesArray.push(services[_serviceId]);
                                    totalChecksum += services[_serviceId].totalModifiedTimes;
                                }
                                break;
                            }
                        }

                        if (!foundSearchMatch) {
                            continue;
                        }
                    }

                    // Platform event filter and searchTerm is empty string? the service should be included
                    else if (filter.isPlatformEventFilter && servicesInsidePlatformEventFilter.has(_serviceId)) {
                            servicesArray.push(services[_serviceId]);
                            totalChecksum += services[_serviceId].totalModifiedTimes;
                        }

                    if (!filter.isPlatformEventFilter) {
                        filter.pivotDate = new Date(filter.endDate);
                        filter.pivotDate.setHours(0);
                        filter.pivotDate.setMinutes(0);

                        // check if service is in date range
                        if (!isServiceInDateRange(services[_serviceId], filter.selectedFiled, filter.pivotDate, selectedFilter)) {
                            continue;
                        }

                        // check conditions
                        if (evaluateCondition(services[_serviceId], selectedFilter.Criterias, selectedFilter.Logic)) {
                            totalChecksum += services[_serviceId].totalModifiedTimes;
                            servicesArray.push(services[_serviceId]);
                        }
                    }
                }
            }

            var resultArray = $filter('orderBy')(servicesArray, filter.orderByField, filter.reverse);
            resultArray.totalChecksum = totalChecksum;

            return resultArray;
        };
    }]);

    function stringifySingleCondition(serviceFields, condition, index) {

        if (!serviceFields[getPropertyName(condition.property)] && serviceFields[getPropertyName(condition.property)] !== false) {
            serviceFields[getPropertyName(condition.property)] = '';
        }

        // violations check
        if (condition.property === 'FSL__RULE_VIOLATIONS__FSL') {

            var value = condition.value.toString() === 'true';

            if (condition.operator === 'equals' && value || condition.operator === 'not equal to' && !value) {
                return '(Array.isArray(__evalRealService.violations) && __evalRealService.violations.length > 0)';
            } else {
                return '(!__evalRealService.violations || (Array.isArray(__evalRealService.violations) && __evalRealService.violations.length === 0))';
            }
        }

        var operator = evaluateOperator(condition.operator);

        //if contains commas (,) - create an array
        if (condition.value && condition.value.indexOf && condition.value.indexOf(',') > -1) {
            condition.value = condition.value.replace(/, /g, ',').split(',').map(function (val) {
                return val.trim();
            });
        }

        // if value is array then this is a picklist
        if (Array.isArray(condition.value)) {

            condition.value = condition.value.map(function (c) {
                return c.toLowerCase ? c.toLowerCase() : c;
            });
            __picklistArrayForFilter[index] = condition.value;

            return evaluateArrayValue(condition.operator, condition.property, index);
        } else {

            // store parsed value in global var __evalConditionValue
            evaluateValue(condition.property, condition.value, __ganttFilterFieldSet, index);
        }

        // simple condition (A > B) - we can assume that if we have this operator, both the property and value are simple
        if (operator) {

            var fieldType = __ganttFilterFieldSet[condition.property].Type;

            if (fieldType === 'STRING' || fieldType === 'TEXTAREA' || fieldType === 'EMAIL' || fieldType === 'REFERENCE') {
                return '__evalService.' + getPropertyName(condition.property) + '.toLowerCase() ' + evaluateOperator(condition.operator) + ' __evalConditionValue.' + condition.property + '_' + index + '.toLowerCase()';
            }

            return '__evalService.' + getPropertyName(condition.property) + ' ' + evaluateOperator(condition.operator) + ' __evalConditionValue.' + condition.property + '_' + index;
        } else {
            return evaluateSepcialOperator(condition.operator, condition.value, condition.property, index);
        }
    }

    function evaluateArrayValue(operator, property, index) {
        switch (operator) {
            case 'contains':
                return 'new RegExp(__picklistArrayForFilter[' + index + '].join("|").replace(/\\(/g, \'\\\\(\').replace(/\\)/g, \'\\\\)\').replace(/\\+/g, \'\\\\+\'), \'i\').test(__evalService.' + getPropertyName(property) + ') === true';
            case 'does not contain':
                return 'new RegExp(__picklistArrayForFilter[' + index + '].join("|").replace(/\\(/g, \'\\\\(\').replace(/\\)/g, \'\\\\)\').replace(/\\+/g, \'\\\\+\'), \'i\').test(__evalService.' + getPropertyName(property) + ') === false';
            case 'start with':
                return 'new RegExp(\'^\' + __picklistArrayForFilter[' + index + '].join("|^"), \'i\').test(__evalService.' + getPropertyName(property) + ') === true';
            case 'equals':
                return '__picklistArrayForFilter[' + index + '].indexOf(__evalService.' + getPropertyName(property) + '.toLowerCase()) > -1';
            case 'not equal to':
                return '__picklistArrayForFilter[' + index + '].indexOf(__evalService.' + getPropertyName(property) + '.toLowerCase()) === -1';
            default:
                return '__picklistArrayForFilter[' + index + '].some( element => __evalService.' + getPropertyName(property) + ' ' + evaluateOperator(operator) + ' element)';

        }
    }

    // get property name (reference)
    function getPropertyName(property) {

        if (property === "FSL__RULE_VIOLATIONS__FSL") {
            return "FSL__RULE_VIOLATIONS__FSL";
        }

        return removeNamespace(__ganttFilterFieldSet[property].APIName);
    }

    // run eval()
    function evaluateCondition(service, conditions, logic) {

        var serviceFields = service.fields;
        window.__evalService = serviceFields;
        window.__evalRealService = service;

        var stringConditions = logic ? replaceLogicOperators(logic) : '',
            conditionsMapped = {};

        // build string conditions
        for (var i in conditions) {
            conditionsMapped[i] = stringifySingleCondition(serviceFields, conditions[i], i - 1);

            if (!logic) {
                stringConditions += '{' + i.toString() + '} && ';
            }
        }

        // need to remove last '&&' if we had no logic
        if (!logic) {
            stringConditions = stringConditions.substr(0, stringConditions.length - 3);
        }

        // put string conditions into logic format (1 AND 2 OR 3)
        for (var _i in conditionsMapped) {
            stringConditions = stringConditions.replace('{' + _i + '}', conditionsMapped[_i]);
        }

        if (stringConditions === "") {
            return true;
        }

        return eval(stringConditions);
    }

    // parse and evaluate the value, put it on the global scope
    function evaluateValue(fieldName, value, fieldDefitions, index) {

        if (!fieldDefitions[fieldName]) {
            window.__evalConditionValue[fieldName] = null;
            return;
        }

        switch (fieldDefitions[fieldName].Type) {

            // W-14571198
            case 'BOOLEAN':
                if (typeof value === 'boolean') {
                    window.__evalConditionValue[fieldName + '_' + index] = value === true;break;
                } else {
                    window.__evalConditionValue[fieldName + '_' + index] = value === "true";break;
                }

            case 'DATE':
                window.__evalConditionValue[fieldName + '_' + index] = new Date(value).setHours(0, 0, 0, 0);break;
            case 'DATETIME':
                window.__evalConditionValue[fieldName + '_' + index] = new Date(value);break;

            case 'STRING':
            case 'EMAIL':
            case 'TEXTAREA':
            case 'REFERENCE':
                if (value) {
                    window.__evalConditionValue[fieldName + '_' + index] = value.toLowerCase();
                } else {
                    window.__evalConditionValue[fieldName + '_' + index] = '';
                }

                break;

            default:
                window.__evalConditionValue[fieldName + '_' + index] = value;

        }
    }

    function evaluateOperator(operator) {
        switch (operator) {
            case 'equals':
                return '==';
            case 'not equal to':
                return '!=';
            case 'less than':
                return '<';
            case 'greater than':
                return '>';
            case 'less or equal':
                return '<=';
            case 'greater or equal':
                return '>=';
            default:
                return null;
        }
    }

    function evaluateSepcialOperator(operator, text, property, index) {
        //W-14862111 - Filter fails when using "Contains" and value is null
        switch (operator) {
            case 'contains':
                return !text ? '__evalService.' + getPropertyName(property) + '.toLowerCase() == __evalConditionValue.' + property + '_' + index + '.toLowerCase()' : '__evalService.' + getPropertyName(property) + '.toLowerCase().indexOf(\'' + text.toLowerCase().replace(/'/g, "\\'") + '\') > -1';
            case 'does not contain':
                return !text ? '__evalService.' + getPropertyName(property) + '.toLowerCase() != __evalConditionValue.' + property + '_' + index + '.toLowerCase()' : '__evalService.' + getPropertyName(property) + '.toLowerCase().indexOf(\'' + text.toLowerCase().replace(/'/g, "\\'") + '\') === -1';
            case 'start with':
                return !text ? '__evalService.' + getPropertyName(property) + '.toLowerCase() == __evalConditionValue.' + property + '_' + index + '.toLowerCase()' : '__evalService.' + getPropertyName(property) + '.toLowerCase().indexOf(\'' + text.toLowerCase().replace(/'/g, "\\'") + '\') === 0';
        }
    }

    function replaceLogicOperators(str) {
        str = str.split('AND').join('&&');
        str = str.split('OR').join('||');
        str = str.split('NOT').join('!');
        return str;
    }

    function removeNamespace(field) {
        if (fslNamespace && field.indexOf(fslNamespace + '__') === 0) {
            var l = fslNamespace.length + 2;
            return field.substr(l, field.length - l);
        }

        return field;
    }

    // check if service is in date range
    function isServiceInDateRange(service, dateFields, pivotDate, filter) {

        var minDate = scheduler._min_date,
            maxDate = scheduler._max_date;

        // set dates
        if (!filter.List_only_appointments_on_the_gantt) {

            minDate = new Date(pivotDate);
            maxDate = new Date(pivotDate);

            minDate.setDate(minDate.getDate() - filter.Days_before_horizon);
            maxDate.setDate(maxDate.getDate() + filter.Days_after_horizon + 1);
            maxDate.setMinutes(maxDate.getMinutes() - 1);
        } else {

            // only services that are on the gantt --> start || finish must be on the gantt (with travel!)
            if (service.end_date && isIntersectIncludeLimits(minDate, maxDate, service.end_date, service.end_date)) {
                return true;
            }
            if (service.start_date && isIntersectIncludeLimits(minDate, maxDate, service.start_date, service.start_date)) {
                return true;
            }

            return false;
        }

        // early & due
        if (dateFields.earlyStart && service.earlyStart && isIntersectIncludeLimits(minDate, maxDate, service.earlyStart, service.earlyStart)) {
            return true;
        }
        if (dateFields.dueDate && service.dueDate && isIntersectIncludeLimits(minDate, maxDate, service.dueDate, service.dueDate)) {
            return true;
        }

        // start & finish
        if (dateFields.start && service.start && isIntersectIncludeLimits(minDate, maxDate, service.start, service.start)) {
            return true;
        }
        if (dateFields.finish && service.finish && isIntersectIncludeLimits(minDate, maxDate, service.finish, service.finish)) {
            return true;
        }

        // appointment window
        if (dateFields.appStart && service.appStart && isIntersectIncludeLimits(minDate, maxDate, service.appStart, service.appStart)) {
            return true;
        }
        if (dateFields.appEnd && service.appEnd && isIntersectIncludeLimits(minDate, maxDate, service.appEnd, service.appEnd)) {
            return true;
        }

        // display date
        if (dateFields.display && service.ganttDisplay && isIntersectIncludeLimits(minDate, maxDate, service.ganttDisplay, service.ganttDisplay)) {
            return true;
        }

        return false;
    }

    // search
    function searchOnService(service, searchText, servicesListFields) {

        if (service.name && service.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
            return true;
        } else if (service.ganttLabel && service.ganttLabel.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
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
})();