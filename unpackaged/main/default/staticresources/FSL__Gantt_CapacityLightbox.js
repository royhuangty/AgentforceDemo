'use strict';

(function () {

    CapacityLightboxService.$inject = ['$rootScope', 'servicesService', 'TimePhasedDataService', '$sce', '$compile', 'utils', 'StateService', 'SERVICE_STATUS', 'SERVICE_CATEGORY', 'DeltaService', 'FieldSetFieldsService'];

    angular.module('serviceExpert').factory('CapacityLightboxService', CapacityLightboxService);

    function CapacityLightboxService($rootScope, servicesService, TimePhasedDataService, $sce, $compile, utils, StateService, SERVICE_STATUS, SERVICE_CATEGORY, DeltaService, FieldSetFieldsService) {

        // create a new scope
        var $scope = null;

        function open(id) {

            // create new isolated scope
            $scope = $rootScope.$new(true);

            // set needed parameters
            $scope.lightboxCapacity = TimePhasedDataService.resourceCapacities()[id];
            $scope.fieldsTypes = utils.fieldsTypes;
            $scope.selectedTab = 'details';
            $scope.kpiStart = $scope.lightboxCapacity.start_date;
            $scope.kpiEnd = $scope.lightboxCapacity.end_date;
            $scope.servicesScheduledToCapacity = {};
            $scope.tableSort = {
                orderByField: '',
                reverse: false
            };
            $scope.flaggedServices = servicesService.flagged;
            $scope.invokedActionFor = {};
            $scope.SERVICE_CATEGORY = SERVICE_CATEGORY;
            $scope.currentMenu = null;
            $scope.dummyServicesCount = 0;

            //$scope.changeTab = changeTab;
            $scope.closeLightbox = closeLightbox;
            $scope.openConsoleTab = utils.openConsoleTab;
            $scope.formatKpitText = formatKpitText;
            $scope.getObjectKeys = getObjectKeys;
            $scope.flagService = flagService;
            $scope.unscheduleServices = unscheduleServices;
            $scope.postToChatter = postToChatter;
            $scope.getStatusClass = utils.getCSSClassByStatusCategory;
            $scope.violationsTooltip = violationsTooltip;
            $scope.calculateKpisForCapacity = calculateKpisForCapacity;
            $scope.showLongTermWarning = function () {
                return scheduler._mode === 'LongView';
            };
            $scope.unscheduleRunning = false;
            $scope.hideKpisForCapacity = hideKpisForCapacity;
            $scope.formatAllowedCapacity = formatAllowedCapacity;

            // field sets
            FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
                $scope.servicesListFields = fieldsSetFieldsObject['CapacityServiceColumns'];
                $scope.tableSort.orderByField = $scope.servicesListFields[0].FullAPIName;
            });

            $scope.order = function (predicate, reverse) {
                $scope.tableSort.orderByField = predicate;
                $scope.tableSort.reverse = reverse;
            };

            $scope.getRefFieldID = function (service, field) {
                var fieldName = field.FullAPIName.replace('__r', '__c');
                return service[fieldName];
            };

            $scope.setCurrentMenu = function (index) {
                if ($scope.currentMenu === index) $scope.currentMenu = null;else $scope.currentMenu = index;
            };

            $scope.getStyleForServiceInList = function (service) {

                if (window.paletteViewActive && service.ganttPaletteColor) {
                    return { background: service.ganttPaletteColor.color };
                } else {
                    return { background: service.ganttColor };
                }
            };

            calculateKpisForCapacity(id);

            // add to body
            var lightboxDomElement = generateTemplate();
            lightboxDomElement.find('#ContractorCapacityLightbox').draggable({ containment: 'document', handle: '#ContractorCapacityLightboxHeader' });
            angular.element('body').append(lightboxDomElement);

            // set lightbox to open
            StateService.setLightBoxStatus();

            // on destroy, remove DOM elements
            $scope.$on('$destroy', function () {
                return lightboxDomElement.remove();
            });

            // add ESC shortcut
            $scope.$on('keypress', function (broadcastData, e) {
                if (e.which == 27) {
                    $scope.$evalAsync($scope.closeLightbox);
                }
            });

            // compile
            $compile(lightboxDomElement)($scope);
            utils.safeApply($scope);
        }

        function closeLightbox() {
            StateService.setLightBoxStatus(false);
            $scope.$destroy();
        }

        // calculate Capacity KPIs
        function calculateKpisForCapacity(capacityId) {

            $scope.capacityKpi = {
                hoursCapacity: 0,
                hoursInUse: 0,
                completed: 0,
                jeopardy: 0,
                workItemsCapacity: 0,
                workItemsAllocated: 0,
                minutesUsed: 0
            };

            $scope.dummyServicesCount = 0;

            var thisCapacityEvent = scheduler.getEvent(capacityId);
            var allCapacityEvents = scheduler.getEvents(thisCapacityEvent.start_date, thisCapacityEvent.end_date);
            $scope.servicesScheduledToCapacity = {};

            $scope.capacityKpi.hoursCapacity = thisCapacityEvent.hoursPerTimePeriod ? thisCapacityEvent.hoursPerTimePeriod : 0;
            $scope.capacityKpi.hoursInUse = thisCapacityEvent.hoursInUse ? thisCapacityEvent.hoursInUse : 0;
            $scope.capacityKpi.completed = 0;
            $scope.capacityKpi.jeopardy = 0;
            $scope.capacityKpi.violations = 0;
            $scope.capacityKpi.workItemsCapacity = thisCapacityEvent.workItemsPerTimePeriod ? thisCapacityEvent.workItemsPerTimePeriod : 0;
            $scope.capacityKpi.workItemsAllocated = thisCapacityEvent.workItemsAllocated ? thisCapacityEvent.workItemsAllocated : 0;
            $scope.capacityKpi.total = 0;
            $scope.capacityKpi.minutesUsedO2 = thisCapacityEvent.minutesUsed === undefined ? undefined : thisCapacityEvent.minutesUsed;
            $scope.capacityKpi.workItemsAllocatedO2 = thisCapacityEvent.workItemsAllocated === undefined ? undefined : thisCapacityEvent.workItemsAllocated;

            for (var i = 0; i < allCapacityEvents.length; i++) {

                if (allCapacityEvents[i].resourceId !== thisCapacityEvent.resourceId) continue;

                if (allCapacityEvents[i].type !== 'service') continue;

                if (allCapacityEvents[i].isDummy) {
                    $scope.dummyServicesCount++;
                    continue;
                }

                // if in longterm, show only services that meets the filtering options of the long term view
                if (scheduler._mode === 'LongView' && !scheduler.filter_LongView(allCapacityEvents[i].id, allCapacityEvents[i], false)) {
                    continue;
                }

                //only include services where start is inside capacity (without travel)
                if (allCapacityEvents[i].start.getTime() >= thisCapacityEvent.start_date.getTime() && allCapacityEvents[i].start.getTime() <= thisCapacityEvent.end_date.getTime()) {

                    $scope.capacityKpi.total++;

                    if (allCapacityEvents[i].statusCategory === SERVICE_CATEGORY.COMPLETED) $scope.capacityKpi.completed++;

                    if (allCapacityEvents[i].jeopardy) $scope.capacityKpi.jeopardy++;

                    if (allCapacityEvents[i].violations) $scope.capacityKpi.violations++;

                    $scope.servicesScheduledToCapacity[allCapacityEvents[i].id] = allCapacityEvents[i];
                }
            }
        }

        function hideKpisForCapacity() {
            return $scope.capacityKpi.minutesUsedO2 === undefined && $scope.capacityKpi.workItemsAllocatedO2 === undefined;
        }

        function formatAllowedCapacity() {
            if ($scope.capacityKpi.minutesUsedO2 === undefined && $scope.capacityKpi.workItemsAllocatedO2 === undefined) {
                if ($scope.capacityKpi.hoursCapacity > 0 && $scope.capacityKpi.workItemsCapacity > 0) {
                    return customLabels.maximum_service_appointments_and_hours_allowed.replaceAll($scope.capacityKpi.workItemsCapacity, $scope.capacityKpi.hoursCapacity);
                } else if ($scope.capacityKpi.hoursCapacity === 0) {
                    return customLabels.maximum_service_appointments_allowed.replaceAll($scope.capacityKpi.workItemsCapacity);
                } else if ($scope.capacityKpi.workItemsCapacity === 0) {
                    return customLabels.maximum_hours_allowed.replaceAll($scope.capacityKpi.hoursCapacity);
                }
            }
        }

        function formatKpitText() {
            return customLabels.KPIsAreCalculatedFromTo.replaceAll(moment($scope.kpiStart).format('llll'), moment($scope.kpiEnd).format('llll'));
        }

        function getObjectKeys(obj) {
            if (Object.keys(obj).length > 0) return Object.keys(obj);else return 0;
        }

        function flagService(id) {
            if (!servicesService.flagged[id]) {
                servicesService.flagged[id] = true;

                return;
            }

            if (servicesService.flagged[id]) {
                servicesService.flagged[id] = !servicesService.flagged[id];
            }
        }

        function postToChatter(serviceId, sayWhat) {

            if (sayWhat === '') sayWhat = prompt(customLabels.msg_to_post_to_chatter, '');

            if (sayWhat === '') {
                alert(customLabels.no_empty_msg_to_chatter);
                return;
            }

            servicesService.recentlyUsed[serviceId] = true;

            servicesService.postToChatter([serviceId], sayWhat).then(function (numOfMentions) {});
        }

        function unscheduleServices(servicesIdsArray) {

            if ($scope.unscheduleRunning || !confirm(customLabels.are_you_sure_unschedule)) {
                return true;
            }

            // we will need this to check rules later on
            var resourcesIds = [],
                servicesToUnschedule = [];

            servicesIdsArray.forEach(function (id) {
                $scope.invokedActionFor[id] = true;
                servicesToUnschedule.push(TimePhasedDataService.serviceAppointments()[id]);
                resourcesIds.push(TimePhasedDataService.serviceAppointments()[id].resource);
                servicesService.recentlyUsed[id] = true;
            });

            $scope.unscheduleRunning = true;

            servicesService.unscheduleServices(servicesIdsArray).then(function (resultObjects) {
                servicesService.drawServicesAndAbsences(resultObjects.services, resultObjects.absences, [], resultObjects.capacities);
                calculateKpisForCapacity($scope.lightboxCapacity.id);
                $scope.invokedActionFor[servicesIdsArray[0]] = false;
                $scope.unscheduleRunning = false;

                // TODO: Check rules
            }).catch(function (err) {
                utils.addNotification(customLabels.Action_Could_Not_Be_Performed, err.message || customLabels.user_is_not_allowed_to_perform_action);
                $scope.invokedActionFor[servicesIdsArray[0]] = false;
                $scope.unscheduleRunning = true;
            });
        }

        function violationsTooltip(s) {

            if (!s.violations) return;

            var violations = '';

            for (var i = 0; i < s.violations.length; i++) {
                violations += s.violations[i].RuleName + ' - ' + s.violations[i].ViolationString + '\n';
            }if (violations) violations = violations.substring(0, violations.length - 1);

            return violations;
        };

        function generateTemplate() {
            return angular.element('<div class="LightboxBlackContainer">\n\t\t\t\t<div class="LightboxContainer" id="ContractorCapacityLightbox">\n\n\t\t\t\t\t<div class="lightboxHeaderContainer" id="ContractorCapacityLightboxHeader">\n\n\t\t\t\t\t\t<svg fsl-key-press tabindex="0" ng-click="closeLightbox()" aria-hidden="true" class="slds-icon CloseLightbox">\n\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.close + '"></use>\n\t\t\t\t\t\t</svg>\n\n\t\t\t\t\t\t<h1 class="lightboxHeader">\n\t\t\t\t\t\t\t<i>' + customLabels.Capacity + ':</i>\n\t\t\t\t\t\t\t{{ lightboxCapacity.name }}\n\t\t\t\t\t\t</h1>\n\n\t\t\t\t\t\t<span class="lightboxSelectedTab">\n\t\t\t\t\t\t\t' + customLabels.Details + '\n\t\t\t\t\t\t</span>\n\n\t\t\t\t\t\t<div class="ExtendedForm">\n\t\t\t\t\t\t\t<a ng-click="openConsoleTab($event,lightboxCapacity.id)" target="_blank" href="../{{ lightboxCapacity.id }}" title="' + customLabels.ExtandedForm + '">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon openExternalIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.external + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\t\t\t\t\t\t\t</a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<div id="KPIforCapacity" class="KPIforCapacity" ng-hide="hideKpisForCapacity()">\n\t\t\t\t\t\t<div class="kpiIndicator" ng-show="capacityKpi.hoursCapacity > 0">\n\t\t\t\t\t\t\t<div class="kpiResourceValue">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon kpiResourceIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.clock + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\t\t\t\t\t\t\t\t{{ capacityKpi.hoursInUse }}/{{ capacityKpi.hoursCapacity }}</div>\n\t\t\t\t\t\t\t' + customLabels.Hours_Capacity + '\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t\t<div class="kpiIndicator" ng-show="capacityKpi.workItemsCapacity > 0">\n\t\t\t\t\t\t\t<div class="kpiResourceValue">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon kpiResourceIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.standard_objects + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\t\t\t\t\t\t\t\t{{ capacityKpi.workItemsAllocated }}/{{ capacityKpi.workItemsCapacity }}</div>\n\t\t\t\t\t\t\t' + customLabels.Services_Capacity + '\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t\t<div class="kpiIndicator">\n\t\t\t\t\t\t\t<div class="kpiResourceValue">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon kpiResourceIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.violation + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\t\t\t\t\t\t\t\t<!--<i class="fa fa-warning"></i>-->\n\t\t\t\t\t\t\t\t{{ capacityKpi.violations }}</div>\n\t\t\t\t\t\t\t' + customLabels.Violations + '\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t\t<div class="kpiIndicator">\n\t\t\t\t\t\t\t<div class="kpiResourceValue">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon kpiResourceIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.jeopardy + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\t\t\t\t\t\t\t\t{{ capacityKpi.jeopardy }}</div>\n\t\t\t\t\t\t\t' + customLabels.In_Jeopardy + '\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t\t<div class="kpiIndicator">\n\t\t\t\t\t\t\t<div class="kpiResourceValue">\n\t\t\t\t\t\t\t\t<svg aria-hidden="true" class="slds-icon kpiResourceIcon">\n\t\t\t\t\t\t\t\t\t\u2028<use xlink:href="' + lsdIcons.completed + '"></use>\n\t\t\t\t\t\t\t\t\u2028</svg>\n\n\t\t\t\t\t\t\t\t{{ capacityKpi.completed }}/{{ capacityKpi.total }}</div>\n\t\t\t\t\t\t\t' + customLabels.Completed + '\n\t\t\t\t\t\t</div>\n\n                        <div class="KpiRange">{{formatKpitText()}}</div>\n\t\t\t\t\t\t<div class="KpiRange updateKpiData" ng-if="dummyServicesCount > 0" fsl-key-press tabindex="0" ng-click="calculateKpisForCapacity(lightboxCapacity.id)">\n                            New KPI data is available - click to update\n                        </div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="allowedCapacity" ng-show="hideKpisForCapacity()">{{formatAllowedCapacity()}}</div>\n\n                    <div id="ContractorCapacityButtons">\n                    \n                            <span id="LongViewWarning" ng-if="showLongTermWarning()">' + customLabels.LongTermCapacityLBWarning + '</span>\n                    \n                            <button class="capacityServiceUnscheduleAll" ng-disabled="unscheduleRunning" ng-show="getObjectKeys(servicesScheduledToCapacity).length > 0" ng-click="unscheduleServices(getObjectKeys(servicesScheduledToCapacity))">\n                                <i class="fa fa-ban"></i>\n                                 ' + customLabels.Unschedule_All + '\n                            </button>\n                        </div>\n\t\t\t\t\t<div id="ContractorCapacityLightboxContent">\n\t\t\t\t\t\n                            <div class="NoServicesFound" ng-show="!getObjectKeys(servicesScheduledToCapacity)">\n                                <i class="fa fa-times"></i>\n                                <div>' + customLabels.No_services + '</div>\n                            </div>\n                        \n                        <table id="CapacityServicesTable" ng-show="getObjectKeys(servicesScheduledToCapacity).length > 0">\n                          <thead>\n                            <tr class="table-header">\n                                <th></th>\n                                <th></th>\n                                <th></th>\n                                <th ng-attr-title="{{field.Label}}" ng-repeat="field in servicesListFields" ng-class="{sortCapacityServicesBy: tableSort.orderByField == field.FullAPIName}" class="truncate capacityServiceColName" ng-click="tableSort.reverse=!tableSort.reverse;order(field.FullAPIName, tableSort.reverse)">\n                                    <span class="">{{field.Label}}</span>\n                                    <span ng-show="tableSort.orderByField == field.FullAPIName">\n                                        <span>\n                                            <svg ng-show ="!tableSort.reverse" aria-hidden="true" class="slds-icon arrowIcon">\n                                              <use xlink:href="' + lsdIcons.arrowup + '"></use>\n                                            </svg>\n                                            <svg ng-show ="tableSort.reverse" aria-hidden="true" class="slds-icon arrowIcon">\n                                              <use xlink:href="' + lsdIcons.arrowdown + '"></use>\n                                            </svg>\n                                        </span>\n                                    </span>\n                                </th>\n                            </tr>\n                          </thead>\n                          <tbody>\n                            <tr ng-repeat="(key, capacityService) in servicesScheduledToCapacity | orderObjectBy:tableSort.orderByField:tableSort.reverse" class="capacityServiceRow">\n                                <td ng-style="getStyleForServiceInList(capacityService)" class="TaskStatusColor {{ getStatusClass(capacityService.statusCategory, SERVICE_CATEGORY) }}" ></td>\n                                <td class="moreOptions">\n                                    <button class="serviceCapacityActionsButton" title="Actions" ng-click="setCurrentMenu($index)">\n                                          <svg class="slds-icon carretDownIcon" aria-hidden="true" ng-show="!invokedActionFor[capacityService.id]">\n                                                <use xlink:href="' + lsdIcons.down + '"></use>\n                                          </svg>\n                                          <img class="capacityServiceLoading"\n                                             src="' + lsdIcons.spinnerGif + '"\n                                             ng-show="invokedActionFor[capacityService.id]"/>\n                                    </button>   \n                                    <div id="actions-menu-{{$index}}" class="serviceCapacityActions" ng-show="currentMenu == $index">\n                                        <a fsl-tab-switch role="select" class="saSingleAction" ng-click="openConsoleTab($event,capacityService.id); setCurrentMenu($index);" target="_blank" href="../{{ capacityService.id }}">' + customLabels.Details + '</a>\n                                        <button fsl-tab-switch role="select" class="saSingleAction" ng-click="flagService(capacityService.id); setCurrentMenu($index);">\n                                            <span ng-show="!flaggedServices[capacityService.id]">' + customLabels.Flag + '</span>\n                                            <span ng-show="flaggedServices[capacityService.id]">' + customLabels.Unflag + '</span>\n                                        </button>\n                                        <button fsl-tab-switch role="select" ng-disabled="unscheduleRunning" class="saSingleAction" ng-click="unscheduleServices([capacityService.id]); setCurrentMenu($index);">' + customLabels.Unschedule + '</button>\n                                        <button fsl-tab-switch role="select" class="saSingleAction" ng-click="postToChatter(capacityService.id, \'\'); setCurrentMenu($index);">' + customLabels.Chatter + '</button>\n                                    </div>\n                                </td>\n                                <td class="iconOnServiceRow"\n                                        title="{{ violationsTooltip(capacityService) }}"\n                                        ng-class="{\'serviceList_jeopardy\': capacityService.jeopardy, \'serviceList_violations\': !capacityService.jeopardy && capacityService.violations}">\n                                        <i class="fa fa-bell" ng-if="capacityService.jeopardy"></i>\n                                        <i class="fa fa-warning" ng-if="capacityService.violations && !capacityService.jeopardy"></i>\n                                </td>\n                                <td ng-attr-title="{{capacityService | displayFieldSetField : field}}" ng-repeat="field in servicesListFields" class="truncate">\n                                    <span ng-show="field.Type != fieldsTypes.Reference" title="{{capacityService | displayFieldSetField : field}}">{{capacityService | displayFieldSetField : field}}</span>\n                                    <a ng-show="field.Type == fieldsTypes.Reference" ng-click="openConsoleTab($event, getRefFieldID(capacityService, field))" target="_blank" href="../{{ getRefFieldID(capacityService, field) }}" title="{{capacityService | displayFieldSetField : field}}">\n                                        {{capacityService | displayFieldSetField : field}}\n                                    </a>\n\n                                </td>\n                            </tr>\n                          </tbody>\n                        </table>\n\n\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>');
        }

        // This will be our factory
        return {
            open: open
        };
    }
})();