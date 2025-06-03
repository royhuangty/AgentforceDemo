'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {

    GanttPalettesService.$inject = ['$q', 'sfdcService', 'utils', 'userSettingsManager', 'ResourcesAndTerritoriesService', 'TimePhasedDataService'];

    angular.module('serviceExpert').factory('GanttPalettesService', GanttPalettesService);

    function GanttPalettesService($q, sfdcService, utils, userSettingsManager, ResourcesAndTerritoriesService, TimePhasedDataService) {

        var serviceFieldsMap = void 0,
            currentAppliedPalette = void 0,
            picklistMap = void 0,
            palettesWereLoaded = false,
            palettesDeffered = $q.defer();

        function getServiceFieldsMap() {

            var deffered = $q.defer();

            if (serviceFieldsMap !== undefined) {
                setTimeout(function () {
                    deffered.resolve(serviceFieldsMap);
                }, 0);
            } else {

                sfdcService.callRemoteAction(RemoteActions.getServiceFieldsMap).then(function (result) {

                    serviceFieldsMap = {};

                    for (var key in result) {
                        serviceFieldsMap[key] = JSON.parse(result[key].replace(/&quot;/g, '"'));
                    }

                    deffered.resolve(serviceFieldsMap);
                }).catch(function (err) {
                    deffered.reject(err);
                });
            }

            return deffered.promise;
        }

        function getGanttPalettes() {

            sfdcService.callRemoteAction(RemoteActions.getGanttPalettes).then(function (result) {

                var palettes = result.palettes;

                palettesWereLoaded = true;

                var GanttPalettes = {};

                for (var i = 0; i < palettes.length; i++) {
                    var parsedPalette = {};
                    parsedPalette.Id = palettes[i].Id;
                    parsedPalette.Name = palettes[i][fieldNames.GanttServicePalette.Name];

                    parsedPalette.ServiceProperty = palettes[i][fieldNames.GanttServicePalette.ServiceProperty];
                    parsedPalette.ServicePropertyNoNamespace = utils.removeFSLNamespace(parsedPalette.ServiceProperty);

                    if (palettes[i][fieldNames.GanttServicePalette.ColorScheme] !== undefined) {
                        try {
                            parsedPalette.ColorScheme = JSON.parse(palettes[i][fieldNames.GanttServicePalette.ColorScheme]);
                        } catch (err) {
                            parsedPalette.ColorScheme = undefined;
                        }
                    } else {
                        parsedPalette.ColorScheme = undefined;
                    }

                    parsedPalette.Description = palettes[i][fieldNames.GanttServicePalette.Description];
                    parsedPalette.ColorLevel = palettes[i][fieldNames.GanttServicePalette.ColorLevel];
                    parsedPalette.Active = palettes[i][fieldNames.GanttServicePalette.Active];
                    GanttPalettes[parsedPalette.Id] = parsedPalette;
                }

                // W-9651760 - add translations
                for (var id in GanttPalettes) {

                    var serviceFieldName = GanttPalettes[id] && GanttPalettes[id].ServiceProperty;

                    if (serviceFieldName && result.translations[serviceFieldName]) {
                        GanttPalettes[id].translations = result.translations[serviceFieldName];
                    }
                }

                palettesDeffered.resolve(GanttPalettes);
            }).catch(function (err) {
                palettesDeffered.reject(err);
            });

            return palettesDeffered.promise;
        }

        function updateGanttServicePaletteColor(ganttService) {

            if (currentAppliedPalette !== undefined) {

                var servicePropertyType = serviceFieldsMap[currentAppliedPalette.ServiceProperty];

                switch (servicePropertyType.Type) {
                    case FieldTypes.BOOLEAN:
                        updateGanttServicePaletteColorBooleanField(ganttService);
                        break;
                    case FieldTypes.PICKLIST:
                        updateGanttServicePaletteColorPicklistField(ganttService);
                        break;
                    case FieldTypes.DATETIME:
                    case FieldTypes.DATE:
                        updateGanttServicePaletteColorDateField(ganttService);
                        break;
                    case FieldTypes.DOUBLE:
                    case FieldTypes.INTEGER:
                    case FieldTypes.PERCENT:
                        updateGanttServicePaletteColorNumberField(ganttService);
                        break;
                    case FieldTypes.LOCATION:
                        updateGanttServicePaletteColorGeolocationField(ganttService);
                        break;
                    case FieldTypes.ADDRESS:
                        updateGanttServicePaletteColorAddressField(ganttService);
                        break;
                    default:
                        console.log('Other');
                }
            }
        }

        function applyNewPaletteForGantt(palette, ganttServices) {

            var deffered = $q.defer();

            if (currentAppliedPalette === undefined || currentAppliedPalette.Id !== palette.Id) {

                userSettingsManager.SetUserSettingsProperty('Gantt_Palette__c', palette.Id);

                currentAppliedPalette = palette;

                var servicePropertyType = serviceFieldsMap[currentAppliedPalette.ServiceProperty];

                updatePaletteMap(servicePropertyType.Type);

                switch (servicePropertyType.Type) {
                    case FieldTypes.BOOLEAN:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorBooleanField);
                        break;
                    case FieldTypes.PICKLIST:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorPicklistField);
                        break;
                    case FieldTypes.DATETIME:
                    case FieldTypes.DATE:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorDateField);
                        break;
                    case FieldTypes.DOUBLE:
                    case FieldTypes.INTEGER:
                    case FieldTypes.PERCENT:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorNumberField);
                        break;
                    case FieldTypes.LOCATION:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorGeolocationField);
                        break;
                    case FieldTypes.ADDRESS:
                        updateGanttServicePaletteColorFieldHelper(ganttServices, updateGanttServicePaletteColorAddressField);
                        break;
                    default:
                        console.log('Other');
                }

                deffered.resolve();
            } else {
                deffered.resolve();
            }

            return deffered.promise;
        }

        function updateGanttServicePaletteColorFieldHelper(ganttServices, paletteClassificationFunction) {
            for (var serviceId in ganttServices) {
                paletteClassificationFunction(ganttServices[serviceId]);
            }
        }

        function updateGanttServicePaletteColorBooleanField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {
                if (ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace] === true) {
                    ganttService.ganttPaletteColor = {
                        color: currentAppliedPalette.ColorScheme.max.color,
                        palleteId: currentAppliedPalette.Id
                    };
                } else {
                    ganttService.ganttPaletteColor = {
                        color: currentAppliedPalette.ColorScheme.min.color,
                        palleteId: currentAppliedPalette.Id
                    };
                }
            }
        }

        function updateGanttServicePaletteColorPicklistField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {

                var fieldValue = ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace];
                var finalColor;

                if (fieldValue === undefined) {
                    finalColor = currentAppliedPalette.ColorScheme.empty;
                } else {
                    finalColor = currentAppliedPalette.ColorScheme.picklist[currentAppliedPalette.ServiceProperty][fieldValue];
                }

                ganttService.ganttPaletteColor = {
                    color: finalColor,
                    palleteId: currentAppliedPalette.Id
                };
            }
        }

        function updateGanttServicePaletteColorDateField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {

                var timeFieldValue = ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace];

                if (useLocationTimezone) {
                    var op = void 0;

                    if (ganttService.resourceId) {
                        var relevantSTM = TimePhasedDataService.getRelevantSTMToGanttService(ganttService);

                        if (relevantSTM && relevantSTM.operatingHours) {
                            op = relevantSTM.operatingHours;
                        } else if (relevantSTM.serviceTerritory) {
                            op = ResourcesAndTerritoriesService.territories()[relevantSTM.serviceTerritory].operatingHours;
                        }
                    } else if (ganttService.ServiceTerritoryId) {
                        op = ResourcesAndTerritoriesService.territories()[ganttService.ServiceTerritoryId].operatingHours;
                    }

                    var opObj = ResourcesAndTerritoriesService.getOperatingHours()[op];
                    var fromTZ = opObj ? opObj.timezone : userTimeZone;
                    timeFieldValue = convertDateBetweenTimeZones(new Date(timeFieldValue), fromTZ, userTimeZone).getTime();
                }

                var finalColor = undefined;
                var minTime = undefined;
                var maxtime = undefined;
                var minColor = undefined;
                var maxColor = undefined;

                if (timeFieldValue === undefined) {
                    finalColor = currentAppliedPalette.ColorScheme.empty;
                } else {
                    for (var key in picklistMap) {

                        if (picklistMap[key].start < timeFieldValue && timeFieldValue <= picklistMap[key].end) {
                            finalColor = key;
                            break;
                        }

                        if (minTime === undefined || picklistMap[key].start <= minTime) {
                            minTime = picklistMap[key].start;
                            minColor = key;
                        }

                        if (maxtime === undefined || picklistMap[key].end > maxtime) {
                            maxtime = picklistMap[key].end;
                            maxColor = key;
                        }
                    }

                    if (finalColor === undefined) {
                        if (timeFieldValue > maxtime) {
                            finalColor = maxColor;
                        } else {
                            finalColor = minColor;
                        }
                    }
                }

                ganttService.ganttPaletteColor = {
                    color: finalColor,
                    palleteId: currentAppliedPalette.Id
                };
            }
        }

        function updateGanttServicePaletteColorNumberField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {

                var fieldValue = ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace];

                var finalColor = undefined;
                var minValue = undefined;
                var maxValue = undefined;
                var minColor = undefined;
                var maxColor = undefined;

                if (fieldValue === undefined) {
                    finalColor = currentAppliedPalette.ColorScheme.empty;
                } else {

                    for (var key in picklistMap) {

                        if (picklistMap[key].start < fieldValue && fieldValue <= picklistMap[key].end) {
                            finalColor = key;
                            break;
                        }

                        if (minValue === undefined || picklistMap[key].start <= minValue) {
                            minValue = picklistMap[key].start;
                            minColor = key;
                        }

                        if (maxValue === undefined || picklistMap[key].end > maxValue) {
                            maxValue = picklistMap[key].end;
                            maxColor = key;
                        }
                    }

                    if (finalColor === undefined) {
                        if (fieldValue > maxValue) {
                            finalColor = maxColor;
                        } else {
                            finalColor = minColor;
                        }
                    }
                }

                ganttService.ganttPaletteColor = {
                    color: finalColor,
                    palleteId: currentAppliedPalette.Id
                };
            }
        }

        function updateGanttServicePaletteColorGeolocationField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {

                var fieldValue = ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace];
                var finalColor = undefined;
                var minValue = undefined;
                var maxValue = undefined;
                var minColor = undefined;
                var maxColor = undefined;

                if (currentAppliedPalette.ColorScheme.geolocation.latitude === undefined || currentAppliedPalette.ColorScheme.geolocation.longitude === undefined) {
                    finalColor = currentAppliedPalette.ColorScheme.empty;
                } else {

                    var distance = calculateDistance(currentAppliedPalette.ColorScheme.geolocation.latitude, currentAppliedPalette.ColorScheme.geolocation.longitude, fieldValue.latitude, fieldValue.longitude);

                    for (var key in picklistMap) {

                        if (picklistMap[key].start < distance && distance <= picklistMap[key].end) {
                            finalColor = key;
                            break;
                        }

                        if (minValue === undefined || picklistMap[key].start <= minValue) {
                            minValue = picklistMap[key].start;
                            minColor = key;
                        }

                        if (maxValue === undefined || picklistMap[key].end > maxValue) {
                            maxValue = picklistMap[key].end;
                            maxColor = key;
                        }
                    }

                    if (finalColor === undefined) {
                        if (distance > maxValue) {
                            finalColor = maxColor;
                        } else {
                            finalColor = minColor;
                        }
                    }
                }

                ganttService.ganttPaletteColor = {
                    color: finalColor,
                    palleteId: currentAppliedPalette.Id
                };
            }
        }

        function updateGanttServicePaletteColorAddressField(ganttService) {
            if (!ganttService.ganttPaletteColor || ganttService.ganttPaletteColor.palleteId !== currentAppliedPalette.Id) {

                var fieldValue = ganttService.fields[currentAppliedPalette.ServicePropertyNoNamespace];
                var finalColor = undefined;
                var minValue = undefined;
                var maxValue = undefined;
                var minColor = undefined;
                var maxColor = undefined;

                if (currentAppliedPalette.ColorScheme.geolocation.latitude === undefined || currentAppliedPalette.ColorScheme.geolocation.longitude === undefined) {
                    finalColor = currentAppliedPalette.ColorScheme.empty;
                } else {

                    var distance = calculateDistance(currentAppliedPalette.ColorScheme.geolocation.latitude, currentAppliedPalette.ColorScheme.geolocation.longitude, ganttService.latitude, ganttService.longitude);

                    for (var key in picklistMap) {

                        if (picklistMap[key].start < distance && distance <= picklistMap[key].end) {
                            finalColor = key;
                            break;
                        }

                        if (minValue === undefined || picklistMap[key].start <= minValue) {
                            minValue = picklistMap[key].start;
                            minColor = key;
                        }

                        if (maxValue === undefined || picklistMap[key].end > maxValue) {
                            maxValue = picklistMap[key].end;
                            maxColor = key;
                        }
                    }

                    if (finalColor === undefined) {
                        if (distance > maxValue) {
                            finalColor = maxColor;
                        } else {
                            finalColor = minColor;
                        }
                    }
                }

                ganttService.ganttPaletteColor = {
                    color: finalColor,
                    palleteId: currentAppliedPalette.Id
                };
            }
        }

        function updatePaletteMap(type) {
            var tempBool = false;
            var colors;
            var values;
            picklistMap = {};

            if (FieldTypes.DATETIME === type || FieldTypes.DATE === type) {
                values = createValueDateRange(currentAppliedPalette.ColorScheme.min.value, currentAppliedPalette.ColorScheme.max.value, currentAppliedPalette.ColorScheme.min.type, currentAppliedPalette.ColorScheme.max.type, currentAppliedPalette.ColorLevel);
                tempBool = true;
            }

            if (FieldTypes.DOUBLE === type || FieldTypes.LOCATION === type || FieldTypes.ADDRESS === type) {
                values = createValueDoubleRange(currentAppliedPalette.ColorScheme.min.value, currentAppliedPalette.ColorScheme.max.value, currentAppliedPalette.ColorLevel);
                tempBool = true;
            }

            if (FieldTypes.INTEGER === type || FieldTypes.PERCENT === type) {
                values = createValueIntegerRange(currentAppliedPalette.ColorScheme.min.value, currentAppliedPalette.ColorScheme.max.value, currentAppliedPalette.ColorLevel);
                tempBool = true;
            }

            if (tempBool) {

                colors = createColorRange(currentAppliedPalette.ColorScheme.min.color, currentAppliedPalette.ColorScheme.max.color, currentAppliedPalette.ColorLevel);

                for (var idx = 0; idx < colors.length; idx++) {
                    picklistMap[colors[idx]] = values[idx];
                }
            }
        }

        function createColorRange(minColor, maxColor, paletteColorPartitionOptionalToCalculateBy) {

            var colors = [];
            // MIN Color representation
            var firstSubColorMin = minColor.substr(1, 2); // # FF
            var secondSubColorMin = minColor.substr(3, 4).substr(0, 2); // #   FF
            var thirdSubColorMin = minColor.substr(5, 6); // #     FF

            // MAX Color representation
            var firstSubColorMax = maxColor.substr(1, 2); // # FF
            var secondSubColorMax = maxColor.substr(3, 4).substr(0, 2); // #   FF
            var thirdSubColorMax = maxColor.substr(5, 6); // #     FF

            // MIN Color Number representation
            var firstSubColorMinNumber = parseInt(firstSubColorMin, 16); // # 44
            var secondSubColorMinNumber = parseInt(secondSubColorMin, 16); // #   44
            var thirdSubColorMinNumber = parseInt(thirdSubColorMin, 16); // #     44

            // MAX Color Number representation
            var firstSubColorMaxNumber = parseInt(firstSubColorMax, 16); // # 44
            var secondSubColorMaxNumber = parseInt(secondSubColorMax, 16); // #   44
            var thirdSubColorMaxNumber = parseInt(thirdSubColorMax, 16); // #     44


            // Find Delta between First color 
            var firstDiffrence = firstSubColorMaxNumber - firstSubColorMinNumber;
            var firstColorDelta = firstDiffrence / paletteColorPartitionOptionalToCalculateBy;

            // Find Delta between First color 
            var secondDiffrence = secondSubColorMaxNumber - secondSubColorMinNumber;
            var secondColorDelta = secondDiffrence / paletteColorPartitionOptionalToCalculateBy;

            // Find Delta between First color 
            var thirdDiffrence = thirdSubColorMaxNumber - thirdSubColorMinNumber;
            var thirdColorDelta = thirdDiffrence / paletteColorPartitionOptionalToCalculateBy;

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {

                var currentFirstNumber = Math.round(Math.abs(firstSubColorMinNumber + firstColorDelta * i)) % 256;
                var currentSecondNumber = Math.round(Math.abs(secondSubColorMinNumber + secondColorDelta * i)) % 256;
                var currentThirdNumber = Math.round(Math.abs(thirdSubColorMinNumber + thirdColorDelta * i)) % 256;

                var currentFirstString = currentFirstNumber.toString(16);

                if (currentFirstString.length === 1) {
                    currentFirstString = "0" + currentFirstString;
                }

                var currentSecondString = currentSecondNumber.toString(16);

                if (currentSecondString.length === 1) {
                    currentSecondString = "0" + currentSecondString;
                }

                var currentThirdString = currentThirdNumber.toString(16);

                if (currentThirdString.length === 1) {
                    currentThirdString = "0" + currentThirdString;
                }

                var newCurrentColor = '#' + currentFirstString + currentSecondString + currentThirdString;

                colors.push(newCurrentColor);
            }

            return colors;
        }

        function createValueDateRange(minTimeValue, maxTimeValue, minTimeType, maxTimeType, paletteColorPartitionOptionalToCalculateBy) {

            var now = utils.convertMomentDtToDt(moment().tz(userTimeZone));

            var minTimeDurationInMiliseconds = getNumberOfMilisecondsForDuration(minTimeType, minTimeValue);
            var maxTimeDurationInMiliseconds = getNumberOfMilisecondsForDuration(maxTimeType, maxTimeValue);

            var minTime = now.getTime() + minTimeDurationInMiliseconds;
            var maxTime = now.getTime() + maxTimeDurationInMiliseconds;

            var timeDelta = (maxTime - minTime) / paletteColorPartitionOptionalToCalculateBy;

            var values = [];

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {
                var currentTimeValueStart = minTime + i * timeDelta;
                var currentTimeValueEnd = minTime + (i + 1) * timeDelta;
                var interval = { start: currentTimeValueStart, end: currentTimeValueEnd };
                values.push(interval);
            }

            return values;
        }

        function getNumberOfMilisecondsForDuration(timeType, timeValue) {

            var timeDurationInMiliseconds;

            switch (timeType) {
                case "Seconds":
                    timeDurationInMiliseconds = timeValue * 1000;
                    break;
                case "Minutes":
                    timeDurationInMiliseconds = timeValue * 60 * 1000;
                    break;
                case "Hours":
                    timeDurationInMiliseconds = timeValue * 60 * 60 * 1000;
                    break;
                case "Days":
                    timeDurationInMiliseconds = timeValue * 24 * 60 * 60 * 1000;
                    break;
            }

            return timeDurationInMiliseconds;
        }

        function createValueDoubleRange(minValue, maxValue, paletteColorPartitionOptionalToCalculateBy) {

            minValue = parseFloat(minValue);
            maxValue = parseFloat(maxValue);

            var doubleDelta = (maxValue - minValue) / paletteColorPartitionOptionalToCalculateBy;

            var values = [];

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {
                var currentDoubleValueStart = minValue + i * doubleDelta;
                var currentDoubleValueEnd = minValue + (i + 1) * doubleDelta;
                var interval = { start: currentDoubleValueStart, end: currentDoubleValueEnd };
                values.push(interval);
            }

            return values;
        }

        function createValueIntegerRange(minValue, maxValue, paletteColorPartitionOptionalToCalculateBy) {

            minValue = parseInt(minValue);
            maxValue = parseInt(maxValue);

            var integerDelta = (maxValue - minValue) / paletteColorPartitionOptionalToCalculateBy;

            integerDelta = Math.round(integerDelta);

            var values = [];

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {
                var currentIntegerValueStart = minValue + i * integerDelta;
                var currentIntegerValueEnd = minValue + (i + 1) * integerDelta;
                var interval = { start: currentIntegerValueStart, end: currentIntegerValueEnd };
                values.push(interval);
            }

            return values;
        }

        // calculate distance (aerial)
        function calculateDistance(lat1, lon1, lat2, lon2) {
            var rLatitutde1 = Math.PI * lat1 / 180,
                rLatitutde2 = Math.PI * lat2 / 180,
                theta = lon1 - lon2,
                radTheta = Math.PI * theta / 180,
                distance = Math.sin(rLatitutde1) * Math.sin(rLatitutde2) + Math.cos(rLatitutde1) * Math.cos(rLatitutde2) * Math.cos(radTheta);

            distance = Math.acos(distance);
            distance = distance * 180 / Math.PI;
            distance = distance * 60 * 1.1515;

            return distanceUnit === 'km' ? distance * 1.609344 : distance * 0.8684;
        }

        function resetCurrentPalette() {
            currentAppliedPalette = undefined;
            window.paletteViewActive = false;
        }

        function isEmptyPaletteValue(obj) {

            if (obj == null) return true;
            if (obj.length > 0) return false;
            if (obj.length === 0) return true;
            if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== "object") return true;
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) return false;
            }

            return true;
        }

        function convertDateBetweenTimeZones(dt, sourceTz, destTz) {
            return utils.convertDateBetweenTimeZones(dt, sourceTz, destTz);
        }

        return {
            serviceFieldsMap: getServiceFieldsMap,
            applyNewPaletteForGantt: applyNewPaletteForGantt,
            getGanttPalettes: getGanttPalettes,
            updateGanttServicePaletteColor: updateGanttServicePaletteColor,
            resetCurrentPalette: resetCurrentPalette,
            isEmpty: isEmptyPaletteValue,
            werePalettesLoaded: function werePalettesLoaded() {
                return palettesWereLoaded;
            }
        };
    }
})();