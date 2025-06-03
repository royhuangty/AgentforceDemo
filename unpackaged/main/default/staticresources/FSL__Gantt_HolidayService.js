'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function () {

    HolidayService.$inject = ['utils', 'ResourcesAndTerritoriesService', 'TimePhasedDataService'];

    angular.module('serviceExpert').factory('HolidayService', HolidayService);

    function HolidayService(utils, ResourcesAndTerritoriesService, TimePhasedDataService) {
        var _scheduler$serverList = scheduler.serverList('holidays'),
            _scheduler$serverList2 = _slicedToArray(_scheduler$serverList, 2),
            _scheduler$serverList3 = _scheduler$serverList2[0],
            holidaysByDate = _scheduler$serverList3 === undefined ? {} : _scheduler$serverList3,
            _scheduler$serverList4 = _scheduler$serverList2[1],
            intervalsByDate = _scheduler$serverList4 === undefined ? {} : _scheduler$serverList4;

        /**
         * Add holidays into scheduler collection
         */


        function addHolidaysIntoCollection(holidays) {
            if (!holidays || !holidays.length) {
                return;
            }
            holidays.forEach(function (h) {
                return addHolidayIntoCollection(h);
            });
            scheduler.serverList('holidays', [holidaysByDate, intervalsByDate]);
        }

        /**
         * Add a single holiday into scheduler collection
         */
        function addHolidayIntoCollection(holiday) {
            var dateKey = moment(holiday.start).startOf('day').toDate().toISOString();

            // Merge the new holiday into day intervals for all current territories and resouces on gantt
            intervalsByDate[dateKey] = mergeHolidayIntoDayIntervals(holiday, intervalsByDate[dateKey] || []);

            holidaysByDate[dateKey] = holidaysByDate[dateKey] || {};
            var h = holidaysByDate[dateKey][holiday.id];
            if (!h) {
                h = Object.assign({ territories: {} }, holiday);
                // Delete ambigous properties
                delete h.territory;
                delete h.start;
                delete h.finish;
                holidaysByDate[dateKey][h.id] = h;
            }
            // Aggeregate territories observed by this holiday from both directly related OH or indirectly from STM
            // Normally holiday does not carry territory data. Should call enhanceHoliday before adding it into scheduler.
            if (holiday.territory && holiday.territory.id) {
                h.territories[holiday.territory.id] = holiday.territory;
            }
        }

        /**
         * Enhance holiday with necessary data for territory and start, finish converted to location/user timezone.
         */
        function enhanceHoliday(holiday, sectionId, calendarTimezone, userTimezone, calendarId) {
            var resourceId = sectionId.split('_')[0],
                territoryId = sectionId.split('_')[1];
            var stm = resourceId && Object.values(TimePhasedDataService.resourcesAndTerritories()[resourceId] || {}).find(function (stm) {
                return stm.serviceTerritory === territoryId;
            }) || {};
            // Categorize holiday under this territory for direct relation from ST or STM. Exclude cloned OH from primary for secondary STM.
            var territory = [stm.operatingHours, (stm.serviceTerritory__r || {}).OperatingHoursId].includes(calendarId) ? ResourcesAndTerritoriesService.territories()[territoryId] : null;
            var date = moment(holiday.date).startOf('day');
            var startTimeLocal = holiday.isAllDay ? date.toDate() : date.clone().add(holiday.startTimeInMinutes, 'minute').toDate();
            var endTimeLocal = holiday.isAllDay ? date.clone().endOf('day').toDate() : date.clone().add(holiday.endTimeInMinutes, 'minute').toDate();
            var systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            var holidayEnhanced = Object.assign({
                start: utils.convertDateBetweenTimeZones(startTimeLocal, calendarTimezone, userTimezone),
                finish: utils.convertDateBetweenTimeZones(endTimeLocal, calendarTimezone, userTimezone),
                territory: territory
            }, holiday);
            return holidayEnhanced;
        }

        /**
         * Exclude non-overlapping holiday intervals from other intervals, e.g. available working hours
         * 
         * slotStart - index of field name for slot start from slot array
         * slotEnd - index of field name for slot end from slot array
         */
        function excludeHolidaysFromSlots(holidays, slots, slotStart, slotFinish) {
            var remainingSlots = [];

            var _loop = function _loop() {
                var slot = slots.shift();
                while (holidays.length && holidays[0].finish <= slot[slotStart]) {
                    holidays.shift();
                }
                if (!holidays.length) {
                    remainingSlots.push.apply(remainingSlots, [slot].concat(_toConsumableArray(slots)));
                    return 'break';
                }
                if (slot[slotFinish] <= holidays[0].start || slot.isHolidaySlot) {
                    remainingSlots.push(slot);
                    return 'continue';
                }
                var intersection = utils.intersectDates({ start: slot[slotStart], finish: slot[slotFinish] }, holidays[0]);
                if (intersection.remainderFrom1 && intersection.remainderFrom1.length) {
                    var remainderFromSlot = intersection.remainderFrom1.map(function (remainder) {
                        var _Object$assign;

                        return Object.assign({}, slot, (_Object$assign = {}, _defineProperty(_Object$assign, slotStart, remainder.start), _defineProperty(_Object$assign, slotFinish, remainder.finish), _Object$assign));
                    });
                    slots.unshift.apply(slots, _toConsumableArray(remainderFromSlot));
                }
            };

            _loop2: while (slots && slots.length) {
                var _ret = _loop();

                switch (_ret) {
                    case 'break':
                        break _loop2;

                    case 'continue':
                        continue;}
            }

            return remainingSlots;
        }

        /**
         * Merge a new holiday into sorted non-overlapping intervals of the same day.
         */
        function mergeHolidayIntoDayIntervals(holiday) {
            var intervals = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

            if (holiday.isAllDay) {
                return [{
                    start: moment(holiday.start).startOf('day').toDate(),
                    finish: moment(holiday.finish).endOf('day').toDate()
                }];
            }
            var start = holiday.start,
                finish = holiday.finish;

            for (var i = 0; i < intervals.length;) {
                if (intervals[i].finish < start) {
                    i++;
                    continue;
                } else if (intervals[i].start > finish) {
                    intervals.splice(i, 0, { start: start, finish: finish });
                    return intervals;
                } else {
                    if (intervals[i].start < start) {
                        start = intervals[i].start;
                    }
                    if (intervals[i].finish > finish) {
                        finish = intervals[i].finish;
                    }
                    intervals.splice(i, 1);
                }
            }
            intervals.push({ start: start, finish: finish });
            return intervals;
        }

        /**
         * Merge holidays sorted by start time into non-overlapping intervals
         */
        function mergeHolidays(holidays) {
            var mergedHolidays = [];
            var last = void 0;
            holidays.forEach(function (slot) {
                if (!last || slot.start > last.finish) {
                    mergedHolidays.push(last = slot);
                } else if (slot.finish > last.finish) {
                    last.finish = slot.finish;
                }
            });
            return mergedHolidays;
        }

        /**
         * Trim the holiday with given start and finish.
         */
        function trimHoliday(holiday, start, finish) {
            if (holiday.start < start) {
                holiday.start = start;
            }
            if (holiday.finish > finish) {
                holiday.finish = finish;
            }
        }

        function reset() {
            scheduler.serverList('holidays', []);

            var _scheduler$serverList5 = scheduler.serverList('holidays');

            var _scheduler$serverList6 = _slicedToArray(_scheduler$serverList5, 2);

            var _scheduler$serverList7 = _scheduler$serverList6[0];
            holidaysByDate = _scheduler$serverList7 === undefined ? {} : _scheduler$serverList7;
            var _scheduler$serverList8 = _scheduler$serverList6[1];
            intervalsByDate = _scheduler$serverList8 === undefined ? {} : _scheduler$serverList8;
        }

        return {
            addHolidaysIntoCollection: addHolidaysIntoCollection,
            addHolidayIntoCollection: addHolidayIntoCollection,
            enhanceHoliday: enhanceHoliday,
            excludeHolidaysFromSlots: excludeHolidaysFromSlots,
            mergeHolidayIntoDayIntervals: mergeHolidayIntoDayIntervals,
            mergeHolidays: mergeHolidays,
            trimHoliday: trimHoliday,
            reset: reset
        };
    }
})();