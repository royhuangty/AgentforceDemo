'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

(function () {

    angular.module('serviceExpert').directive('ganttPalette', GanttPaletteDirective);

    GanttPaletteDirective.$inject = [];

    function GanttPaletteDirective() {

        controllerFunction.$inject = ['$scope', 'GanttPalettesService', 'TimePhasedDataService', 'GeneralLightbox', 'userSettingsManager', 'utils', '$rootScope'];

        function controllerFunction($scope, GanttPalettesService, TimePhasedDataService, GeneralLightbox, userSettingsManager, utils, $rootScope) {

            $scope.isEmpty = GanttPalettesService.isEmpty;
            $scope.paletteApplied = false;

            $scope.updatePaletteView = function () {

                $scope.calculatePaletteColors = false;
                $scope.paletteDataIsValid = true;

                if ($scope.paletteApplied === true) {
                    $scope.clearPalette();
                }

                // reset user setting if no palette is selected
                if ($scope.selectedPalette === customLabels.None || $scope.GanttPalettes[$scope.selectedPalette] === undefined) {
                    userSettingsManager.SetUserSettingsProperty('Gantt_Palette__c', null);
                }

                if ($scope.GanttPalettes[$scope.selectedPalette] !== undefined) {

                    var values;
                    var colors;
                    $scope.currentPalette = $scope.GanttPalettes[$scope.selectedPalette];

                    $scope.picklistMap = {};
                    GanttPalettesService.serviceFieldsMap().then(function (result) {
                        var fieldDescribe = result[$scope.currentPalette.ServiceProperty];

                        try {

                            if (fieldDescribe.Type === FieldTypes.PICKLIST) {
                                values = Object.keys($scope.currentPalette.ColorScheme.picklist[fieldDescribe.Name]);
                                colors = Object.values($scope.currentPalette.ColorScheme.picklist[fieldDescribe.Name]);
                            }

                            if (fieldDescribe.Type === FieldTypes.BOOLEAN) {
                                values = [customLabels.Selected, customLabels.Deselected];
                                colors = [$scope.currentPalette.ColorScheme.max.color, $scope.currentPalette.ColorScheme.min.color];
                            }

                            if (fieldDescribe.Type === FieldTypes.DATE || fieldDescribe.Type === FieldTypes.DATETIME) {
                                var now = utils.convertMomentDtToDt(moment().tz(userTimeZone));
                                colors = createColorRange($scope.currentPalette.ColorScheme.min.color, $scope.currentPalette.ColorScheme.max.color, $scope.currentPalette.ColorLevel);
                                values = createValueDateRange(now, $scope.currentPalette.ColorScheme.min.value, $scope.currentPalette.ColorScheme.max.value, $scope.currentPalette.ColorScheme.min.type, $scope.currentPalette.ColorScheme.max.type, $scope.currentPalette.ColorLevel);
                            }

                            if (fieldDescribe.Type === FieldTypes.DOUBLE) {
                                colors = createColorRange($scope.currentPalette.ColorScheme.min.color, $scope.currentPalette.ColorScheme.max.color, $scope.currentPalette.ColorLevel);
                                values = createValueDoubleRange($scope.currentPalette.ColorScheme.min.value, $scope.currentPalette.ColorScheme.max.value, $scope.currentPalette.ColorLevel);
                            }

                            if (fieldDescribe.Type === FieldTypes.INTEGER || fieldDescribe.Type === FieldTypes.PERCENT) {
                                colors = createColorRange($scope.currentPalette.ColorScheme.min.color, $scope.currentPalette.ColorScheme.max.color, $scope.currentPalette.ColorLevel);
                                values = createValueIntegerRange($scope.currentPalette.ColorScheme.min.value, $scope.currentPalette.ColorScheme.max.value, $scope.currentPalette.ColorLevel);
                            }

                            if (fieldDescribe.Type === FieldTypes.LOCATION || fieldDescribe.Type === FieldTypes.ADDRESS) {
                                colors = createColorRange($scope.currentPalette.ColorScheme.min.color, $scope.currentPalette.ColorScheme.max.color, $scope.currentPalette.ColorLevel);
                                values = createValueDoubleRange($scope.currentPalette.ColorScheme.min.value, $scope.currentPalette.ColorScheme.max.value, $scope.currentPalette.ColorLevel, true);
                            }

                            $scope.picklistLength = colors.length;

                            for (var idx = 0; idx < colors.length; idx++) {
                                $scope.picklistMap[values[idx]] = colors[idx];
                            }
                        } catch (ex) {
                            $scope.paletteDataIsValid = false;
                        }
                    });
                }
            };

            $scope.clearPalette = function () {
                $scope.hidePaletteView();
                $scope.selectedPalette = customLabels.None;
                userSettingsManager.SetUserSettingsProperty('Gantt_Palette__c', null);
                $scope.paletteApplied = false;
                $rootScope.$broadcast('paletteUpdated');
            };

            $rootScope.$on('applyPalette', function () {
                $scope.applyPalette();
            });

            $scope.applyPalette = function () {
                if ($scope.calculatePaletteColors) {
                    return;
                } else {

                    $scope.calculatePaletteColors = true;
                    var ganttPalette = $scope.GanttPalettes[$scope.selectedPalette];

                    if (ganttPalette !== undefined) {
                        GanttPalettesService.applyNewPaletteForGantt(ganttPalette, TimePhasedDataService.serviceAppointments()).then(function (res) {
                            $scope.showPaletteView();
                            $scope.paletteApplied = true;
                            $scope.calculatePaletteColors = false;
                            $rootScope.$broadcast('paletteUpdated');
                        });
                    } else {
                        alert('No palette selected');
                        $scope.calculatePaletteColors = false;
                        return;
                    }
                }
            };

            $scope.openPalettesLightbox = function (mode) {
                switch (mode) {
                    case 'edit':
                        GeneralLightbox.open(customLabels.GanttPalettes, GanttPalettePage);
                        break;
                }
            };

            $scope.calculatePalettePortionStyle = function (value) {
                return { 'background': value, 'width': 100 / $scope.picklistLength + '%', 'height': '12px' };
            };

            GanttPalettesService.getGanttPalettes().then(function (GanttPalettesMap) {
                $scope.GanttPalettes = Object.fromEntries(Object.entries(GanttPalettesMap).sort(function (_ref, _ref2) {
                    var _ref4 = _slicedToArray(_ref, 2),
                        a = _ref4[1];

                    var _ref3 = _slicedToArray(_ref2, 2),
                        b = _ref3[1];

                    return a.Name.localeCompare(b.Name);
                }));
                $scope.selectedPalette = userSettingsManager.GetUserSettingsProperty('Gantt_Palette__c') || ($scope.GanttPalettes == undefined || $scope.isEmpty($scope.GanttPalettes) ? customLabels.NoPalettes : customLabels.None);
                $scope.updatePaletteView();
            });

            $scope.getTranslatedPicklistValue = function (key) {

                if ($scope.GanttPalettes[$scope.selectedPalette] && $scope.GanttPalettes[$scope.selectedPalette].translations) {
                    return $scope.GanttPalettes[$scope.selectedPalette].translations[key] || key;
                }

                return key;
            };
        }

        function createValueDoubleRange(minValue, maxValue, paletteColorPartitionOptionalToCalculateBy, isDistanceMap) {

            minValue = parseFloat(minValue);
            maxValue = parseFloat(maxValue);

            var doubleDelta = (maxValue - minValue) / paletteColorPartitionOptionalToCalculateBy;

            var values = [];

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {
                var currentDoubleValueStart = minValue + i * doubleDelta;
                var currentDoubleValueEnd = minValue + (i + 1) * doubleDelta;

                if (isDistanceMap) {

                    if (i === 0) {
                        values.push(createSentenceLabel([currentDoubleValueEnd, distanceUnit, customLabels.OrLower]));
                    } else if (i === paletteColorPartitionOptionalToCalculateBy - 1) {
                        values.push(createSentenceLabel([customLabels.HigherThan, currentDoubleValueStart, distanceUnit]));
                    } else {
                        values.push(customLabels.Between_x_and_y.replaceAll(createSentenceLabel([currentDoubleValueStart, distanceUnit]), createSentenceLabel([currentDoubleValueEnd, distanceUnit])));
                    }
                } else {

                    if (i === 0) {
                        values.push(createSentenceLabel([currentDoubleValueEnd, customLabels.OrLower]));
                    } else if (i === paletteColorPartitionOptionalToCalculateBy - 1) {
                        values.push(createSentenceLabel([customLabels.HigherThan, currentDoubleValueStart]));
                    } else {
                        values.push(customLabels.Between_x_and_y.replaceAll(currentDoubleValueStart, currentDoubleValueEnd));
                    }
                }
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

                if (i === 0) {
                    values.push(createSentenceLabel([currentIntegerValueEnd, customLabels.OrLower]));
                } else if (i === paletteColorPartitionOptionalToCalculateBy - 1) {
                    values.push(createSentenceLabel([customLabels.HigherThan, currentIntegerValueStart]));
                } else {
                    values.push(customLabels.Between_x_and_y.replaceAll(currentIntegerValueStart, currentIntegerValueEnd));
                }
            }

            return values;
        }

        function createValueDateRange(now, minTimeValue, maxTimeValue, minTimeType, maxTimeType, paletteColorPartitionOptionalToCalculateBy) {

            var minTimeDurationInMiliseconds = getNumberOfMilisecondsForDuration(minTimeType, minTimeValue);
            var maxTimeDurationInMiliseconds = getNumberOfMilisecondsForDuration(maxTimeType, maxTimeValue);

            var minTime = now.getTime() + minTimeDurationInMiliseconds;
            var maxTime = now.getTime() + maxTimeDurationInMiliseconds;

            var timeDelta = (maxTime - minTime) / paletteColorPartitionOptionalToCalculateBy;

            var values = [];

            for (var i = 0; i < paletteColorPartitionOptionalToCalculateBy; i++) {
                var currentTimeValueStart = minTime + i * timeDelta;
                var currentTimeValueStartMoment = moment(currentTimeValueStart);

                var currentTimeValueEnd = minTime + (i + 1) * timeDelta;
                var currentTimeValueEndMomnet = moment(currentTimeValueEnd);

                if (i === 0) {
                    values.push(createSentenceLabel([customLabels.Earlierthan, currentTimeValueEndMomnet.format("dddd, MMMM Do YYYY, h:mm:ss a")]));
                } else if (i === paletteColorPartitionOptionalToCalculateBy - 1) {
                    values.push(createSentenceLabel([customLabels.LaterThan, currentTimeValueStartMoment.format("dddd, MMMM Do YYYY, h:mm:ss a")]));
                } else {
                    values.push(customLabels.Between_x_and_y.replaceAll(currentTimeValueStartMoment.format("dddd, MMMM Do YYYY, h:mm:ss a"), currentTimeValueEndMomnet.format("dddd, MMMM Do YYYY, h:mm:ss a")));
                }
            }

            return values;
        }

        function getNumberOfMilisecondsForDuration(timeType, timeValue) {

            var timeDurationInMiliseconds;

            switch (timeType) {
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

        function createColorRange(minColor, maxColor, paletteColorPartitionOptionalToCalculateBy) {

            var colors = [];
            // MIN Color representation

            var firstSubColorMin = minColor.substr(1, 2); // # FF
            var secondSubColorMin = minColor.substr(3, 4).substr(0, 2); // #    FF
            var thirdSubColorMin = minColor.substr(5, 6); // #       FF


            // MAX Color representation

            var firstSubColorMax = maxColor.substr(1, 2); // # FF
            var secondSubColorMax = maxColor.substr(3, 4).substr(0, 2); // #    FF
            var thirdSubColorMax = maxColor.substr(5, 6); // #       FF


            // MIN Color Number representation

            var firstSubColorMinNumber = parseInt(firstSubColorMin, 16); // # 44
            var secondSubColorMinNumber = parseInt(secondSubColorMin, 16); // #    44
            var thirdSubColorMinNumber = parseInt(thirdSubColorMin, 16); // #       44


            // MAX Color Number representation

            var firstSubColorMaxNumber = parseInt(firstSubColorMax, 16); // # 44
            var secondSubColorMaxNumber = parseInt(secondSubColorMax, 16); // #    44
            var thirdSubColorMaxNumber = parseInt(thirdSubColorMax, 16); // #       44


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

        function createSentenceLabel(sentenceParts) {
            var sentence = '';

            for (var i = 0; i < sentenceParts.length; i++) {
                sentence += sentenceParts[i] + ' ';
            }

            return sentence;
        }

        var template = '<div>\n                            <div class="palette-explain-headline">\n                                <div class="palette-explain">\n                                    ' + customLabels.PaletteChangeExplain + '\n                                </div>\n\n                                <button ng-if="showPaletteEdit" class="globalWhiteButton truncate palette-editor-button" title="' + customLabels.OpenPaletteEditor + '" ng-click="openPalettesLightbox(\'edit\')">\n                                    ' + customLabels.OpenPaletteEditor + '\n                                </button>\n                            </div>\n\n                            <div>\n                                <span>\n                                    <select class="ganttPaletteSelector" ng-model="selectedPalette" ng-change="updatePaletteView()">\n                                        <option ng-if="isEmpty(GanttPalettes) == true" value="' + customLabels.NoPalettes + '">--- ' + customLabels.NoPalettes + ' ---</option>\n                                        <option ng-if="isEmpty(GanttPalettes) == false" value="' + customLabels.None + '">--- ' + customLabels.None + ' ---</option>\n                                        <option ng-repeat="(key,value) in GanttPalettes" value="{{key}}">{{value.Name}}</option>\n                                    </select>\n                                </span>\n                            </div>\n\n                            <div class="palette-details-container" ng-if="GanttPalettes[selectedPalette] !== undefined">\n                                \n                                <div ng-if="paletteDataIsValid">\n\n                                    ' + customLabels.HoverPaletteColor + '\n                                \n                                    <div style="padding-top: 10px">\n                                        <div class="paletteBox">\n                                            <span title="{{getTranslatedPicklistValue(key)}}" ng-class="{\'roundBoxRight\': $last, \'roundBoxLeft\': $first}" ng-style="calculatePalettePortionStyle(value)" ng-repeat="(key, value) in picklistMap"></span>\n                                        </div>\n                                    </div>\n\n                                    <div class="palette-description" ng-hide="currentPalette.Description === \'\' || currentPalette.Description === undefined">\n                                        <div class="description-label-heading">\n                                            ' + customLabels.Description + '\n                                        </div>\n                                        <div class="palette-description-content">\n                                            {{currentPalette.Description}}\n                                        </div>\n                                    </div>\n                                    \n                                    <div class="apply-palette-button-container">\n                                        <button ng-show="paletteApplied === false" ng-class="{ quickActionBtnForPaletteDisabled : calculatePaletteColors, quickActionBtnForPalette: !calculatePaletteColors}"  class="" ng-click="applyPalette()">' + customLabels.ApplyPalette + '</button>\n                                        <button ng-show="paletteApplied === true" ng-class="{ quickActionBtnForPaletteDisabled : calculatePaletteColors, quickActionBtnForPalette: !calculatePaletteColors}"  class="" ng-click="clearPalette()">' + customLabels.UseDefaultPalette + '</button>\n                                    </div>\n\n                                </div>\n\n                                <div class="palette-details-error" ng-if="paletteDataIsValid == false">\n                                    ' + customLabels.PaletteDataIsInvalid + '\n                                </div>\n\n                            </div>\n                        </div>';

        return {
            restrict: 'E',
            template: template,
            scope: {
                showPaletteView: '=',
                showPaletteEdit: '=',
                hidePaletteView: '='
            },
            controller: controllerFunction
        };
    }
})();