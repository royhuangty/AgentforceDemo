'use strict';

(function () {
	angular.module('serviceExpert').factory('calendarsService', ['ResourcesAndTerritoriesService', 'TimePhasedDataService', 'HolidayService', '$rootScope', 'utils', function (ResourcesAndTerritoriesService, TimePhasedDataService, HolidayService, $rootScope, utils) {

		var cachedDates = {};
		var relocationsOnGantt = {};
		var resourceToWorkingDates = {};
		var allCalendarSlots = {};

		$rootScope.$on('gotNewTimePhasedSTMsAndShifts', function (ev, timePhasedObjects) {
			drawOperatingHours(timePhasedObjects.start, timePhasedObjects.finish, timePhasedObjects.resourceToServiceCrewMembers);
			scheduler.updateView();
		});

		function reset() {
			cachedDates = {};
			relocationsOnGantt = {};
			resourceToWorkingDates = {};
			allCalendarSlots = {};

			serviceObject.resourceToWorkingDates = resourceToWorkingDates;
		}

		function drawOperatingHours(start, finish, resourceToServiceCrewMembers) {
			var currDay = new Date(start);
			var resourceLocationData = null;
			var resourceLocationDataWithSecondaries = null;

			while (currDay < finish) {
				var formatedDate = utils.formatDayToString(currDay);

				if (!cachedDates[formatedDate] || $rootScope.isOptimizationViewer) {
					cachedDates[formatedDate] = true;
					if (!resourceLocationData) {
						resourceLocationData = buildResourceToLocationsToTimePhased(TimePhasedDataService.resourcesAndTerritories());
					}

					var currFinish = new Date(currDay);
					currFinish.setDate(currFinish.getDate() + 1);

					for (var resourceId in ResourcesAndTerritoriesService.getResources()) {
						drawResourceOperatingHours(new Date(currDay), new Date(currFinish), resourceId, resourceLocationData[resourceId]);
					}
				}

				currDay.setDate(currDay.getDate() + 1);
			}
		}

		function drawResourceOperatingHours(start, finish, resourceId, resourceLocationData, isSecondary) {
			var primariesAndRelocations = { 'P': [], 'R': [], 'S': [] },
			    secondaryIds = {},
			    secondaryWithNoOperatingIds = {};

			for (var resourceLocation in resourceLocationData) {
				var resourceTimeData = resourceLocationData[resourceLocation].slice();
				var sectionId = utils.generateResourceId(resourceId, resourceLocation);
				var currLocationStart = start;

				// make service click. software.
				for (var i = 0; i < resourceTimeData.length; i++) {
					var timePhasedLocation = resourceTimeData[i];
					var timePhasedLocationAndDayIntersection = utils.intersectDates({ start: currLocationStart, finish: finish }, timePhasedLocation);

					primariesAndRelocations[timePhasedLocation.type].push(timePhasedLocation);

					if (timePhasedLocation.type == 'S') {
						secondaryIds[timePhasedLocation.serviceTerritory] = timePhasedLocation;
						continue;

						// this code will continue
					}

					if (timePhasedLocationAndDayIntersection.intersection) {
						for (var j = 0; j < timePhasedLocationAndDayIntersection.remainderFrom1.length; j++) {
							var remainder = timePhasedLocationAndDayIntersection.remainderFrom1[j];

							if (remainder.isStart) {
								// programmed by click software engineer
								addMarkedTimeSpan(remainder.start, remainder.finish, sectionId);
							}
						}

						if (timePhasedLocation.type == 'R' && !relocationsOnGantt[timePhasedLocation.id] && !isSecondary) {
							addRelocation(timePhasedLocation, resourceLocationData, resourceId);
						}

						currLocationStart = timePhasedLocationAndDayIntersection.intersection.finish;
					} else continue;

					// continue if no permissions to get this territory (no need to draw OH, only relocation marks^^.
					if (!ResourcesAndTerritoriesService.allTerritories[resourceLocation]) continue;

					// this code by clicksoftware ince
					var calendarId = timePhasedLocation.operatingHours || ResourcesAndTerritoriesService.allTerritories[resourceLocation].operatingHours;
					var shiftsByResource = TimePhasedDataService.resourcesAndShifts()[resourceId];

					if (calendarId) drawByCalendarAndTime(timePhasedLocationAndDayIntersection.intersection.start, timePhasedLocationAndDayIntersection.intersection.finish, calendarId, sectionId, isSecondary, null, shiftsByResource);else addMarkedTimeSpan(timePhasedLocationAndDayIntersection.intersection.start, timePhasedLocationAndDayIntersection.intersection.finish, sectionId);
				}

				if (currLocationStart.getTime() != finish.getTime() && !secondaryIds[sectionId.split('_')[1]]) {
					addMarkedTimeSpan(currLocationStart, finish, sectionId);
				}
			}

			// clicksoftware rox
			if (showSecondarySTMs && !utils.isEmpty(secondaryIds) && !isSecondary) {
				var secondStmList = findIntersectionsForPsAndRs(primariesAndRelocations, resourceId, secondaryIds);

				var secondaryLocationData = buildResourceToLocationsToTimePhased(secondStmList);

				drawSecondariesOperatingHours(start, finish, resourceId, secondaryLocationData[resourceId], true);
			}
		}

		function findIntersectionsForPsAndRs(primariesAndRelocations, resourceId, secondaryIds) {
			var secondStmList = {};
			secondStmList[resourceId] = {};

			// find intersections with relocations
			for (var i = 0; i < primariesAndRelocations['P'].length; i++) {
				var primary = primariesAndRelocations['P'][i];

				if (primariesAndRelocations['R'].length == 0) {
					secondStmList[resourceId][primary.id] = primary;
					continue;
				}

				for (var j = 0; j < primariesAndRelocations['R'].length; j++) {
					var reloc = primariesAndRelocations['R'][j];

					var intersection = utils.intersectDates(primary, reloc);

					//no intersection? - add primary
					if (!intersection.intersection) {
						secondStmList[resourceId][primary.id] = primary;
					}

					//has remainder? set primary's start and finish according to remainders.
					if (intersection.remainderFrom1.length > 0) {
						for (var inter = 0; inter < intersection.remainderFrom1.length; inter++) {
							var primaryClone = angular.copy(primary);
							primaryClone.start = intersection.remainderFrom1[inter].start;
							primaryClone.finish = intersection.remainderFrom1[inter].finish;

							secondStmList[resourceId][primary.id + '_' + inter] = primaryClone;
						}
					}

					if (!secondStmList[resourceId][reloc.id]) {
						var relocationClone = angular.copy(reloc);
						relocationClone.serviceTerritory = primary.serviceTerritory;
						secondStmList[resourceId][relocationClone.id] = relocationClone;
					}
				}
			}
			// this is some ugly code.

			//iterate on all created primaries and set start and finish according to the secondary
			var thirdStmList = {};
			thirdStmList[resourceId] = {};
			for (var _i = 0; _i < primariesAndRelocations['S'].length; _i++) {
				var currentSecondary = primariesAndRelocations['S'][_i];

				for (var sKey in secondStmList[resourceId]) {
					var currentP = secondStmList[resourceId][sKey];
					var _intersection = utils.intersectDates(currentP, currentSecondary);

					if (_intersection.intersection) {
						var _primaryClone = angular.copy(currentP);
						_primaryClone.start = _intersection.intersection.start;
						_primaryClone.finish = _intersection.intersection.finish;

						//if respect secondary stm on gantt and sec has OH - 
						if (window.isShowSecondaryOperatingHours && currentSecondary.operatingHours) _primaryClone.operatingHours = currentSecondary.operatingHours;

						_primaryClone.ohTerr = _primaryClone.serviceTerritory;
						_primaryClone.serviceTerritory = currentSecondary.serviceTerritory;

						thirdStmList[resourceId][sKey + '_' + _i] = _primaryClone;
					}
				}
			}

			return thirdStmList;
		}

		function drawSecondariesOperatingHours(start, finish, resourceId, resourceLocationData, isSecondary) {
			for (var resourceLocation in resourceLocationData) {
				var resourceTimeData = resourceLocationData[resourceLocation].slice();
				var sectionId = utils.generateResourceId(resourceId, resourceLocation);
				var currLocationStart = start;

				// make service click. software.
				for (var i = 0; i < resourceTimeData.length; i++) {
					var timePhasedLocation = resourceTimeData[i];
					var timePhasedLocationAndDayIntersection = utils.intersectDates({ start: currLocationStart, finish: finish }, timePhasedLocation);

					if (timePhasedLocationAndDayIntersection.intersection) {
						for (var j = 0; j < timePhasedLocationAndDayIntersection.remainderFrom1.length; j++) {
							var remainder = timePhasedLocationAndDayIntersection.remainderFrom1[j];

							if (remainder.isStart) {
								addMarkedTimeSpan(remainder.start, remainder.finish, sectionId);
							}
						}

						currLocationStart = timePhasedLocationAndDayIntersection.intersection.finish;
					} else continue;

					// take operating hours from STM, fallback to territory
					var calendarId = void 0;
					try {
						if (timePhasedLocation.operatingHours) calendarId = timePhasedLocation.operatingHours;else if (ResourcesAndTerritoriesService.allTerritories[timePhasedLocation.ohTerr]) calendarId = ResourcesAndTerritoriesService.allTerritories[timePhasedLocation.ohTerr].operatingHours;else if (timePhasedLocation.serviceTerritory__r) calendarId = timePhasedLocation.serviceTerritory__r.OperatingHoursId;else calendarId = undefined;
					} catch (e) {
						calendarId = null;
					}

					var shiftsByResource = TimePhasedDataService.resourcesAndShifts()[resourceId];

					if (calendarId || shiftsByResource.length) {
						var calObj = void 0;
						if (!ResourcesAndTerritoriesService.getOperatingHours()[calendarId]) {
							calObj = timePhasedLocation.serviceTerritory__r.OperatingHours;
						}

						drawByCalendarAndTime(timePhasedLocationAndDayIntersection.intersection.start, timePhasedLocationAndDayIntersection.intersection.finish, calendarId, sectionId, isSecondary, calObj, shiftsByResource);
					} else addMarkedTimeSpan(timePhasedLocationAndDayIntersection.intersection.start, timePhasedLocationAndDayIntersection.intersection.finish, sectionId);
				}

				if (currLocationStart.getTime() != finish.getTime()) {
					addMarkedTimeSpan(currLocationStart, finish, sectionId);
				}
			}
		}

		function convertDtToMomentDt(dt, tz) {
			return utils.convertDtToMomentDt(dt, tz);
		}

		function convertMomentDtToDt(dt) {
			return utils.convertMomentDtToDt(dt);
		}

		function drawByCalendarAndTime(start, finish, calendarId, sectionId, isSecondary) {
			drawByCalendarAndTime(start, finish, calendarId, sectionId, isSecondary, null, null);
		}

		function drawByCalendarAndTime(start, finish, calendarId, sectionId, isSecondary, calObj) {
			drawByCalendarAndTime(start, finish, calendarId, sectionId, isSecondary, calObj, null);
		}

		function drawByCalendarAndTime(start, finish, calendarId, sectionId, isSecondary, calObj, shiftsByResource) {
			var calendar = ResourcesAndTerritoriesService.getOperatingHours()[calendarId] || calObj;
			// if calendar is null there is no access to the OH on the stm 
			var calendarTZ = calendar ? calendar.timezone : null;

			var tz = useLocationTimezone ? calendarTZ : userTimeZone;

			if (isSecondary && useLocationTimezone) {
				var sections = sectionId.split(',');
				for (var i = 0; i < sections.length; i++) {
					var ter = sections[i].split('_')[1];
					var op = ResourcesAndTerritoriesService.territories()[ter].operatingHours;
					if (ResourcesAndTerritoriesService.getOperatingHours()[op]) {
						tz = ResourcesAndTerritoriesService.getOperatingHours()[op].timezone;
					}
				}
			}

			var ganttStart = convertDtToMomentDt(start, tz);
			var ganttFinish = convertDtToMomentDt(finish, tz);

			var resourceStart = ganttStart.clone().tz(calendarTZ);
			var resourceFinish = ganttFinish.clone().tz(calendarTZ);

			var ganttStartJS = convertMomentDtToDt(ganttStart);
			var ganttFinishJS = convertMomentDtToDt(ganttFinish);

			var lastInvalidDate = ganttStartJS;

			var daysOfTheWeek = [ganttStart.clone().add(-1, 'days'), ganttStart.clone(), ganttStart.clone().add(1, 'days')];

			for (var j = 0; j < daysOfTheWeek.length; j++) {
				var dayOfTheWeek = daysOfTheWeek[j];

				var slotsAndShifts = [];

				//add shifts by day
				if (shiftsByResource) {
					var todaysShifts = shiftsByResource[utils.formatDayToString(convertMomentDtToDt(dayOfTheWeek))];
					if (todaysShifts) {
						for (var _i2 = 0; _i2 < todaysShifts.length; _i2++) {
							if (todaysShifts[_i2].serviceTerritoryId == sectionId.split('_')[1] || !todaysShifts[_i2].serviceTerritoryId) {
								slotsAndShifts.push({ slotStart: todaysShifts[_i2].startTime,
									slotFinish: todaysShifts[_i2].endTime,
									type: todaysShifts[_i2].timeSlotType,
									record: 'shift',
									hasTerritory: !!todaysShifts[_i2].serviceTerritoryId,
									isHolidaySlot: isHolidayEnabled ? todaysShifts[_i2].isHolidayShift : false,
									slotColor: todaysShifts[_i2].backgroundColor
								});
							}
						}
					}
				}

				//add slots
				if (calendar) {
					var slotsArray = calendar.slots[dayOfTheWeek.get('day')] || [];
					for (var _i3 = 0; _i3 < slotsArray.length; _i3++) {
						var day = slotsArray[_i3];
						var slotStart = getDateBySlotProperties(dayOfTheWeek, day, 'startHour', 'startMinute', calendarTZ, tz, isSecondary);

						//CFSL-1194 - when slot is between 00:00-00:59 don't change endHour to 24.
						if (day['startHour'] == 0 && day['endHour'] == 24 && day['endMinute'] !== 0) day['endHour'] = 0;

						var slotFinish = getDateBySlotProperties(dayOfTheWeek, day, 'endHour', 'endMinute', calendarTZ, tz, isSecondary);

						slotsAndShifts.push({ slotStart: slotStart, slotFinish: slotFinish, type: day.type, record: 'timeslot' });
					}
				}

				var slotsIntervals = void 0,
				    slotsCombined = [];

				//only shifts or only calendar?
				if (shiftsByResource && !calendar || !shiftsByResource && calendar) {
					slotsCombined = slotsAndShifts;
				}

				//both
				else {
						slotsIntervals = combineToIntervalsArray(slotsAndShifts);
						slotsCombined = combineToTypedSlots(slotsIntervals, slotsAndShifts.sort(function (a, b) {
							return a.slotStart - b.slotStart;
						}));
					}

				//exclude holidays
				if (calendar && TimePhasedDataService.operatingHoursAndHolidays()) {
					(function () {
						var dateKey = utils.formatDayToString(convertMomentDtToDt(dayOfTheWeek));
						var holidaysByDate = TimePhasedDataService.operatingHoursAndHolidays()[calendarId] || {};
						var holidaysToday = holidaysByDate[dateKey] || [];
						var holidaysConverted = [];
						holidaysToday.forEach(function (holiday) {
							holidaysConverted.push(HolidayService.enhanceHoliday(holiday, sectionId, calendarTZ, tz, calendarId));
						});
						HolidayService.addHolidaysIntoCollection(holidaysConverted);
						slotsCombined = excludeHolidaySlots(holidaysConverted, slotsCombined, ganttStartJS, ganttFinishJS);
					})();
				}

				for (var _i4 = 0; _i4 < slotsCombined.length; _i4++) {

					var intersectionWitOuter = utils.intersectDates({ start: slotsCombined[_i4].slotStart, finish: slotsCombined[_i4].slotFinish }, { start: ganttStartJS, finish: ganttFinishJS }).intersection;

					if (!intersectionWitOuter) continue;

					var _slotStart = intersectionWitOuter.start;
					var _slotFinish = intersectionWitOuter.finish;

					if (slotsCombined[_i4].record == 'shift' && slotsCombined[_i4].slotColor) {
						addMarkedTimeSpan(lastInvalidDate, _slotStart, sectionId, null);
						addMarkedTimeSpan(_slotStart, _slotFinish, sectionId, slotsCombined[_i4].record, slotsCombined[_i4].slotColor);
					} else if (slotsCombined[_i4].type == 'Extended') {
						addMarkedTimeSpan(lastInvalidDate, _slotStart, sectionId, null);
						addMarkedTimeSpan(_slotStart, _slotFinish, sectionId, slotsCombined[_i4].type);
					} else {
						addMarkedTimeSpan(lastInvalidDate, _slotStart, sectionId, slotsCombined[_i4].type);
					}

					fillResourceToWorkingDates(_slotStart, _slotFinish, slotsCombined[_i4].type, sectionId);

					lastInvalidDate = _slotFinish;
				}
			}

			addMarkedTimeSpan(lastInvalidDate, ganttFinishJS, sectionId, null);
		}

		// get all slots and shifts and fill array of starts and finishes sorted
		function combineToIntervalsArray(_slotsAndShifts) {
			if (!_slotsAndShifts || !_slotsAndShifts.length) return [];

			return _slotsAndShifts.reduce(function (intervals, next) {
				intervals.push(next.slotStart, next.slotFinish);
				return intervals;
			}, []).sort(function (a, b) {
				return a - b;
			});
		}

		//check each interval's record in order to keep remainder slots with the original type (normal/extended)
		//return array of unified slots by record and type
		function combineToTypedSlots(_intervalsArray, _slotsAndShifts) {
			var typedSlots = [];

			for (var i = 0; i < _intervalsArray.length - 1; i++) {
				var tempInterval = undefined;

				var currentInterval = _intervalsArray[i],
				    nextInterval = _intervalsArray[i + 1];

				if (currentInterval.getTime() == nextInterval.getTime()) continue;

				for (var j = 0; j < _slotsAndShifts.length; j++) {
					var slot = _slotsAndShifts[j];

					var intersection = utils.intersectDates({ start: currentInterval, finish: nextInterval }, { start: slot.slotStart, finish: slot.slotFinish });
					if (intersection.intersection) {
						var currentSlot = tempInterval; //slotsByIntervals[currentInterval.getTime()+'_'+nextInterval.getTime()];

						//when to keep current slot - no slot, always override timeslot, shift with territory over shift without, 
						//holiday shift over non-holiday shift
						if (currentSlot === undefined || currentSlot.record == 'timeslot' || currentSlot.record == 'shift' && (!currentSlot.hasTerritory && slot.hasTerritory || !currentSlot.isHolidaySlot && slot.isHolidaySlot)) {
							tempInterval = {
								slotStart: currentInterval,
								slotFinish: nextInterval,
								type: slot.type,
								record: slot.record,
								hasTerritory: slot.hasTerritory,
								originalSlotStart: slot.slotStart,
								isHolidaySlot: slot.isHolidaySlot,
								slotColor: slot.slotColor
							};
						} else {
							// already found shift intersecting slot for this interval - both with or without territory - first one is the winner
							if (currentSlot.hasTerritory && slot.hasTerritory || !currentSlot.hasTerritory && !slot.hasTerritory) {
								if (currentSlot.originalSlotStart > slot.slotStart) {
									tempInterval = {
										slotStart: currentInterval,
										slotFinish: nextInterval,
										type: slot.type,
										record: slot.record,
										hasTerritory: slot.hasTerritory,
										originalSlotStart: slot.slotStart,
										isHolidaySlot: slot.isHolidaySlot,
										slotColor: slot.slotColor
									};
								}
							}
						}
					}
				}
				if (tempInterval) typedSlots.push(tempInterval);
			}

			return typedSlots.reduce(function (combined, next) {
				if (!combined.length) {
					combined.push(next);
				} else {
					var prev = combined.pop();

					//if adjacent slots - unify 
					if (prev.slotFinish == next.slotStart && prev.record == next.record && prev.type == next.type && prev.isHolidaySlot == next.isHolidaySlot && prev.record != 'shift' && next.record != 'shift') {
						prev.slotFinish = next.slotFinish;
						combined.push(prev);
					} else {
						combined.push(prev, next);
					}
				}

				return combined;
			}, []);
		}

		function getDateBySlotProperties(date, slot, hoursProperty, minutesProperty, calendarTZ, secondaryTZ, isSecondary) {
			var result = convertMomentDtToDt(date);
			result.setHours(slot[hoursProperty]);
			result.setMinutes(slot[minutesProperty]);

			var tz = useLocationTimezone ? calendarTZ : userTimeZone;

			if (isSecondary && useLocationTimezone) tz = secondaryTZ;

			var localDate = convertDtToMomentDt(result, calendarTZ);
			var newDate = convertMomentDtToDt(localDate.tz(tz));

			return newDate;
		}

		function fillResourceToWorkingDates(start, finish, type, sectionId) {
			var timeInMinutes = (finish.getTime() - start.getTime()) / (1000 * 60);

			var resourceDic = resourceToWorkingDates[sectionId];
			if (!resourceDic) {
				resourceDic = {};
				resourceToWorkingDates[sectionId] = resourceDic;
			}

			var dayFormat = utils.formatDayToString(start);
			var resourceCurrDay = resourceDic[dayFormat];

			if (!resourceCurrDay) {
				resourceCurrDay = {
					regular: 0,
					overtime: 0
				};

				resourceDic[dayFormat] = resourceCurrDay;
			}

			if (type == 'Extended') {
				resourceCurrDay.overtime += timeInMinutes;
			} else {
				resourceCurrDay.regular += timeInMinutes;
			}
		}

		function addRelocation(terMember, locationsToTimePhasedDic, resourceId) {
			var otherTerritories = [];
			if (!showSecondarySTMs) otherTerritories = Object.keys(locationsToTimePhasedDic);else {
				for (var key in locationsToTimePhasedDic) {
					for (var i = 0; i < locationsToTimePhasedDic[key].length; i++) {
						if (locationsToTimePhasedDic[key][i].type != 'S' && otherTerritories.indexOf(key) == -1) otherTerritories.push(key);
					}
				}
			}

			otherTerritories.splice(otherTerritories.indexOf(terMember.serviceTerritory), 1);

			var destLocation = terMember.serviceTerritory;

			if (ResourcesAndTerritoriesService.territories()[destLocation]) {
				var toOpHours = ResourcesAndTerritoriesService.territories()[destLocation].operatingHours;
				var toTZ = ResourcesAndTerritoriesService.getOperatingHours()[toOpHours].timezone;
			}

			for (var _i5 = 0; _i5 < otherTerritories.length; _i5++) {
				var sections = [utils.generateResourceId(resourceId, otherTerritories[_i5])];
				relocationsOnGantt[terMember.id] = true;
				var start = terMember.start;
				var finish = terMember.finish;

				// convert from arget tz to source tz
				if (useLocationTimezone && ResourcesAndTerritoriesService.territories()[otherTerritories[_i5]]) {
					var fromOpHours = ResourcesAndTerritoriesService.territories()[otherTerritories[_i5]].operatingHours;
					var fromTZ = ResourcesAndTerritoriesService.getOperatingHours()[fromOpHours].timezone;

					start = convertMomentDtToDt(convertDtToMomentDt(start, toTZ).tz(fromTZ));
					finish = convertMomentDtToDt(convertDtToMomentDt(finish, toTZ).tz(fromTZ));
				}

				var relocationTerName = ResourcesAndTerritoriesService.territories()[terMember.serviceTerritory] ? ResourcesAndTerritoriesService.territories()[terMember.serviceTerritory].name : null;
				//var tooltip = customLabels.Relocated_to + ' ' + relocationTerName + ' ' + customLabels.from + ' ' + moment(start).format('llll') + ' ' + customLabels.to + ' ' + moment(finish).format('llll');

				var innerHtml = null,
				    tooltip = null;
				if (relocationTerName) {
					innerHtml = customLabels.Relocated_to.replace('$0', _.escape(relocationTerName));
					tooltip = _.escape(customLabels.Relocated_to_many_params.replaceAll(relocationTerName || customLabels.Relocated_No_Permissions, moment(start).format('llll'), moment(finish).format('llll')));
				} else {
					innerHtml = customLabels.Relocated_No_Permissions;
					tooltip = _.escape(customLabels.Relocated_to_no_permissions_many_params.replaceAll(moment(start).format('llll'), moment(finish).format('llll')));
				}

				var relocationCss = 'relocation';

				/*
    	Code to drew SCM & relocation half and half (bottom/top) UI CREW
    	var resourceToServiceCrewMembers = TimePhasedDataService.resourceToServiceCrewMembers();
    
    if(resourceToServiceCrewMembers[resourceId] !== undefined){
    	for (let key in resourceToServiceCrewMembers[resourceId]) {
    		let intersection = utils.intersectDates({ start: resourceToServiceCrewMembers[resourceId][key].startDate, finish: resourceToServiceCrewMembers[resourceId][key].endDate}, {start: start, finish: finish}).intersection;
    			if(intersection != null){
    			if(intersection.start.getTime() == start.getTime() && intersection.finish.getTime() == finish.getTime()){
    				relocationCss = 'reloctionCrewMemberTop';
    			}
    		}
    	}
    }
    */

				var relocationMonthlyCss = 'relocation_monthly';

				scheduler.addMarkedTimespan({
					start_date: start,
					end_date: finish,
					sections: {
						ZoomLevel2: sections,
						ZoomLevel3: sections,
						ZoomLevel4: sections,
						ZoomLevel5: sections,
						ZoomLevel6: sections,
						ZoomLevel7: sections
					},
					html: "<div class='relocatedLabel' title='" + tooltip + "'>" + "<svg aria-hidden='true' class='slds-icon relocationIcon'>" + "<use xlink:href='" + lsdIcons.relocation + "'></use>" + "</svg> " + innerHtml + "</div>",
					css: relocationCss
				});

				scheduler.addMarkedTimespan({
					start_date: start,
					end_date: finish,
					sections: {
						MonthlyView: sections,
						MTDView: sections,
						LongView: sections
					},
					html: "<div class='relocatedLabel' title='" + tooltip + "'>" + "<svg aria-hidden='true' class='slds-icon relocationIcon'>" + "<use xlink:href='" + lsdIcons.relocation + "'></use>" + "</svg></div>",
					css: relocationMonthlyCss
				});
			}
		}

		function isCrewMemberDuringRelocation(start, finish, sectionId, member, stms) {

			var relocation = undefined;
			var primary = undefined;

			for (var key in stms) {

				if (stms[key].serviceTerritoryType === 'P') {
					primary = stms[key];
				}

				if (stms[key].serviceTerritoryType === 'R') {
					relocation = stms[key];
				}
			}

			if (relocation !== undefined) {
				if (sectionId.indexOf(primary.serviceTerritory)) {
					if (start >= relocation.effectiveStartDate && (finish <= relocation.effectiveEndDate || relocation.effectiveEndDate === undefined)) {
						return true;
					}
				}
			}

			return false;
		}

		// Exclude holiday slots from available time for a single day
		function excludeHolidaySlots(holidaySlots, availableSlots, start, finish) {
			// 1. Cut off if any holiday time range is beyond current start and finish
			holidaySlots.forEach(function (slot) {
				return HolidayService.trimHoliday(slot, start, finish);
			});

			// 2. Sort holidays
			holidaySlots.sort(function (a, b) {
				return a.start - b.start || a.finish - b.finish;
			});

			// 3. Merge overlapping holidays
			var mergedHolidaySlots = HolidayService.mergeHolidays(holidaySlots);

			// 4. Exclude holidays from available time
			return HolidayService.excludeHolidaysFromSlots(mergedHolidaySlots, availableSlots, 'slotStart', 'slotFinish');
		}

		function addMarkedTimeSpan(start, finish, sectionId, type, slotColor) {
			if (start.getTime() == finish.getTime()) return;

			var sectionsToDraw = {};
			for (var key in scheduler.matrix) {

				// don't draw calendars on monthly view
				if (key === 'MonthlyView' || key === 'LongView') {
					continue;
				}

				sectionsToDraw[key] = sectionId.indexOf(',') > -1 ? sectionId.split(',') : [sectionId];
			}

			var cssClass = 'gray_section';
			var htmlInputElement = undefined;

			if (type === 'shift' && slotColor) {
				// '99' is appended to slot color to add 60% opacity
				slotColor = slotColor + '99';
				htmlInputElement = '<div style="background-color: ' + slotColor.encodeHTML() + '; width:100%; height:100%;"></div>';
				cssClass = undefined;
			} else if (type === 'Extended') cssClass = 'overtime_section';

			var sectionIdForOverlapCheck = sectionsToDraw[Object.keys(sectionsToDraw)[0]];
			if (cssClass === 'gray_section' && allCalendarSlots[sectionIdForOverlapCheck] && (allCalendarSlots[sectionIdForOverlapCheck].start_date < finish && allCalendarSlots[sectionIdForOverlapCheck].end_date > start || allCalendarSlots[sectionIdForOverlapCheck].start_date == finish && allCalendarSlots[sectionIdForOverlapCheck].end_date == start)) {
				return;
			}

			scheduler.addMarkedTimespan({
				start_date: start,
				end_date: finish,
				sections: sectionsToDraw,
				css: cssClass,
				html: htmlInputElement
			});

			allCalendarSlots[sectionIdForOverlapCheck] = {
				start_date: start,
				end_date: finish,
				sections: sectionsToDraw,
				css: cssClass,
				html: htmlInputElement
			};
		}

		function buildResourceToLocationsToTimePhased(stmList) {
			var resourcesToLocationsToTimePhased = {};
			var resourcesToTimePhasedLocations = stmList || TimePhasedDataService.resourcesByPrimariesAndRelocations();

			for (var resourceId in resourcesToTimePhasedLocations) {
				var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];
				var resourceLocations = {};

				resourcesToLocationsToTimePhased[resourceId] = resourceLocations;

				for (var timePhasedLocId in timePhasedLocations) {
					var timePhasedLoc = timePhasedLocations[timePhasedLocId];

					var timePhasedArray = resourceLocations[timePhasedLoc.serviceTerritory];

					if (!timePhasedArray) {
						timePhasedArray = [];
						resourceLocations[timePhasedLoc.serviceTerritory] = timePhasedArray;
					}

					timePhasedArray.push({
						start: timePhasedLoc.effectiveStartDate || timePhasedLoc.start,
						finish: timePhasedLoc.effectiveEndDate || timePhasedLoc.finish,
						serviceTerritory: timePhasedLoc.serviceTerritory,
						operatingHours: timePhasedLoc.operatingHours,
						type: timePhasedLoc.serviceTerritoryType || timePhasedLoc.type,
						id: timePhasedLoc.id,
						ohTerr: timePhasedLoc.ohTerr || null,
						serviceTerritory__r: timePhasedLoc.serviceTerritory__r || null
					});
				}

				for (var locationId in resourceLocations) {
					var _timePhasedArray = resourceLocations[locationId];
					_timePhasedArray.sort(utils.sortByTime);
				}
			}

			return resourcesToLocationsToTimePhased;
		}

		var serviceObject = {
			resourceToWorkingDates: resourceToWorkingDates,
			relocationsOnGantt: relocationsOnGantt,
			reset: reset
		};

		return serviceObject;
	}]);
})();