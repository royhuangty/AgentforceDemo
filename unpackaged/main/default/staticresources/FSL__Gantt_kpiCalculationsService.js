'use strict';

(function () {

    kpiCalculationsService.$inject = ['StateService', 'SERVICE_CATEGORY', 'userSettingsManager'];

    angular.module('serviceExpert').factory('kpiCalculationsService', kpiCalculationsService);

    function kpiCalculationsService(StateService, SERVICE_CATEGORY, userSettingsManager) {

        var __kpis = {
            total: 0,
            completed: 0,
            violations: 0,
            jeopardy: 0,
            avgTravelTime: 0,
            totalScheduledDuration: 0
        };

        function resetKpis() {
            for (var key in __kpis) {
                __kpis[key] = 0;
            }
        }

        function calculateKpis() {

            var allVisibleEvents = scheduler.getEvents(scheduler.getState().min_date, scheduler.getState().max_date),
                totalWithoutContractorServices = 0;

            resetKpis();

            var loadedTerritories = userSettingsManager.GetUserSettingsProperty('locations');

            for (var i = 0; i < allVisibleEvents.length; i++) {

                var ganttEvent = allVisibleEvents[i],
                    calculateTravel = true;

                // support secondaries
                if (showSecondarySTMs && allVisibleEvents[i].resourceId.indexOf(',') > -1) {
                    var sections = allVisibleEvents[i].resourceId.split(',');
                    var correctSection = null;
                    for (var j = 0; j < sections.length; j++) {
                        var ter = sections[j].split('_')[1];
                        if (loadedTerritories.indexOf(ter) > -1) {
                            correctSection = ter;
                            break;
                        }
                    }

                    if (!correctSection) continue;
                } else if (loadedTerritories.indexOf(allVisibleEvents[i].resourceId.split('_')[1]) === -1) {
                    continue;
                }

                // W-13280870 - taking breaks travel time into account
                if (ganttEvent.type === 'na' || ganttEvent.type === 'break') {
                    __kpis.avgTravelTime += ganttEvent.travelTo + ganttEvent.travelFrom;
                }

                // continue if it's not a service (can be break, na, etc)
                if (ganttEvent.type !== 'service') {
                    continue;
                }

                if (StateService.areContractorsSupported() && ganttEvent.resourceContractor) {
                    calculateTravel = false;
                } else {
                    totalWithoutContractorServices++;
                }

                __kpis.total++;

                // check if service is completed
                ganttEvent.statusCategory === SERVICE_CATEGORY.COMPLETED && __kpis.completed++;

                // check if we have rule violation
                ganttEvent.violations && __kpis.violations++;

                // check if in jeopardy
                ganttEvent.jeopardy && __kpis.jeopardy++;

                // add travel, if needed
                if (calculateTravel) {

                    if (ganttEvent.isMDT) {

                        var totalWork = 0;

                        ganttEvent.mdtTimes.travel.forEach(function (times) {

                            if (scheduler._min_date <= times.Start && times.Finish <= scheduler._max_date) {
                                totalWork += times.Finish - times.Start;
                            }
                        });

                        __kpis.avgTravelTime += totalWork / 1000;
                    } else {
                        __kpis.avgTravelTime += ganttEvent.travelTo + ganttEvent.travelFrom;
                    }
                }

                // convert from millisecond to second
                if (ganttEvent.isMDT) {

                    var _totalWork = 0;

                    ganttEvent.mdtTimes.working.forEach(function (times) {

                        if (scheduler._min_date <= times.Start && times.Finish <= scheduler._max_date) {
                            _totalWork += times.Finish - times.Start;
                        }
                    });

                    __kpis.totalScheduledDuration += _totalWork / 1000;
                } else {
                    __kpis.totalScheduledDuration += (ganttEvent.finish - ganttEvent.start) / 1000;
                }
            }

            // calculate averages
            if (allVisibleEvents.length > 0 && __kpis.total > 0 && totalWithoutContractorServices > 0) {

                if (StateService.areContractorsSupported()) {
                    __kpis.avgTravelTime = Math.floor(__kpis.avgTravelTime / 60 / totalWithoutContractorServices);
                } else {
                    __kpis.avgTravelTime = Math.floor(__kpis.avgTravelTime / 60 / __kpis.total);
                }
            } else {
                __kpis.avgTravelTime = 0;
            }
        }

        // This will be our factory
        return {
            calculateKpis: calculateKpis,
            kpis: __kpis
        };
    }
})();