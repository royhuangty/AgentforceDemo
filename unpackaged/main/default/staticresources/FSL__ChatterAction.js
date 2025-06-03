'use strict';

(function () {
    angular.module('ChatterAction', ['UIDirectives']);
})();
'use strict';

(function () {

	angular.module('ChatterAction').constant('parentType', {
		Service: 'Service',
		Parent: 'Parent',
		Other: 'Other'
	});
})();
'use strict';

(function () {

	angular.module('ChatterAction').constant('stageType', {
		Form: 'Form',
		ActionFirst: 'ActionFirst',
		ActionSecond: 'ActionSecond',
		Loading: 'Loading',
		Error: 'Error'
	});
})();
'use strict';

(function () {

    angular.module('ChatterAction').directive('addressInput', ['geolocation', function (geolocation) {
        return {
            //restrict: 'E',
            link: function link(scope, element, attributes) {
                var currAddress = null;
                scope.$watch(attributes.addressString, function (newValue, oldValue) {
                    if (newValue !== currAddress) {
                        currAddress = newValue;
                        writeToInput();
                    }
                });

                element.change(function () {
                    var newVal = element.val();
                    setValuesOnParent(newVal);
                });

                var autocomplete = new google.maps.places.Autocomplete(element[0], {});

                google.maps.event.addListener(autocomplete, 'place_changed', function () {
                    var place = autocomplete.getPlace();
                    setValuesOnParent(element.val(), geolocation.getAddressObject(place));
                });

                function setValuesOnParent(newVal, address) {
                    scope.$evalAsync(function () {
                        currAddress = newVal;
                        scope.$eval(attributes.addressString + "=newVal", { newVal: newVal });
                        scope.$eval(attributes.addressDirty + "=true");
                        scope.$eval(attributes.needToGeocode + "=true");

                        if (address) {
                            scope.$eval(attributes.needToGeocode + "=false");

                            scope.$eval(attributes.addressObject + ".Street=newVal", { newVal: address.Street });
                            scope.$eval(attributes.addressObject + ".City=newVal", { newVal: address.City });
                            scope.$eval(attributes.addressObject + ".State=newVal", { newVal: address.State });
                            scope.$eval(attributes.addressObject + ".Zip=newVal", { newVal: address.Zip });
                            scope.$eval(attributes.addressObject + ".Country=newVal", { newVal: address.Country });

                            scope.$eval(attributes.addressObject + ".Latitude=newVal", { newVal: address.Latitude });
                            scope.$eval(attributes.addressObject + ".Longitude=newVal", { newVal: address.Longitude });
                        }
                    });
                }

                function writeToInput() {
                    element.val(currAddress);
                }
            }
        };
    }]);
})();
'use strict';

(function () {

    angular.module('UIDirectives', []).directive('fslDatePicker', function () {
        return function (scope, element, attributes, s) {

            var currDate = null;
            var currTimeZone = null;
            var clickCount = 0;

            scope.$watch(attributes.myModel, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    currDate = newValue;
                    writeToInput();
                }
            });

            scope.$watch(attributes.timeZone, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    currTimeZone = newValue;
                    writeToInput();
                }
            });

            var datePicker = $(element).datepicker({
                inline: true,
                isRTL: document.querySelector('html').getAttribute('dir') === 'rtl',
                onSelect: function onSelect(datetext, inst) {

                    if (inst._keyEvent) {
                        clickCount++;

                        if (clickCount % 2 === 0) return;
                    }

                    var date = datePicker.datepicker("getDate");
                    currDate = moment.tz({
                        year: date.getFullYear(),
                        month: date.getMonth(),
                        date: date.getDate(),
                        hours: date.getHours(),
                        minutes: date.getMinutes()

                    }, currTimeZone).tz('GMT');

                    scope.$eval(attributes.myModel + "=date", { date: currDate });

                    writeToInput();

                    scope.$apply();
                }
            });

            function writeToInput() {
                if (currTimeZone && currDate) element.val(currDate.tz(currTimeZone).format('ll'));
            }
        };
    });
})();
'use strict';

(function () {

    angular.module('ChatterAction').directive('error', function () {
        return {
            restrict: 'E',
            scope: {
                message: '='
            },
            template: errorTemplate,
            link: function link(scope) {
                scope.getMessage = function () {
                    return scope.message;
                };
                scope.icon = sharedIcons.Error;
            }
        };
    });

    // directive template
    var errorTemplate = '<div><div id="error" aria-live="assertive" role="alert">\n                                <svg aria-hidden="true" class="slds-icon">\n                                    <use xlink:href="{{icon}}"></use>\n                                </svg>\n                                <span ng-bind="getMessage()"></span>\n                            </div></div>';
})();
'use strict';

(function () {

    angular.module('ChatterAction').directive('fslKeyPress', function () {
        return {
            restrict: 'A',
            link: function link(scope, element, attrs) {
                element.bind('keypress', function (e) {
                    if (e.keyCode === 13 || e.keyCode === 32) {
                        angular.element(e.target).trigger('click');
                    }
                });
            }
        };
    }).directive('fslTabSwitch', function () {
        var keys = {
            end: 35,
            home: 36,
            left: 37,
            up: 38,
            right: 39,
            down: 40
        };

        var direction = {
            37: -1,
            38: -1,
            39: 1,
            40: 1
        };

        function switchTabOnArrowPress(event, role) {
            var pressed = event.keyCode;
            var tabs = document.querySelectorAll('[role="' + role + '"]');
            for (var i = 0; i < tabs.length; ++i) {
                tabs[i].index = i;
            };

            if (direction[pressed] !== undefined) {
                var target = event.target;
                if (target.index !== undefined) {
                    if (tabs[target.index + direction[pressed]]) {
                        tabs[target.index + direction[pressed]].focus();
                    } else if (pressed === keys.left || pressed === keys.up) {
                        if (tabs[tabs.length - 1]) tabs[tabs.length - 1].focus();
                    } else if (pressed === keys.right || pressed === keys.down) {
                        if (tabs[0]) tabs[0].focus();
                    }
                }
            }
        }

        return {
            restrict: 'A',
            link: function link(scope, element, attrs) {
                element.bind('keydown', function (e) {
                    if (e.keyCode === keys.left || e.keyCode === keys.right) {
                        switchTabOnArrowPress(e, 'tab');
                    }

                    //vertical switch
                    else if (e.keyCode === keys.up || e.keyCode === keys.down) {
                            switchTabOnArrowPress(e, 'select');
                        }
                });
            }
        };
    });
})();
'use strict';

(function () {

    angular.module('ChatterAction').directive('loading', function () {

        return {
            restrict: 'E',
            scope: {},
            link: function link(scope, element, attribues) {
                scope.spinnerImg = sharedIcons.Spinner;
                scope.loading = window.sharedCustomLabels.loading;
            },
            template: loadingTemplate
        };
    });

    // template 
    // W-8390229 img was changed to css loading
    var loadingTemplate = '<div id="Loading">\n                                    <div class="loadingWrapper-chatter-actions">\n                                       <div class="slds-spinner slds-spinner_large" role="status">\n                                          <span class="slds-assistive-text">{{loading}}</span>\n                                          <div class="slds-spinner__dot-a"></div>\n                                          <div class="slds-spinner__dot-b"></div>\n                                       </div>\n                                    </div>\n                                     <div>{{loading}}</div>\n                                </div>';
})();
'use strict';

(function () {
    angular.module('ChatterAction').directive('serviceForm', ['chatterActionUtils', 'parentType', 'geolocation', 'appState', 'stageType', '$q', function (chatterActionUtils, parentType, geolocation, appState, stageType, $q) {

        return {
            restrict: 'E',
            transclude: {
                mainContent: 'mainContent'
            },

            scope: {
                showAssignToMe: '=',
                showBackButton: '=',
                handleSlr: '=',
                apexClassName: '=',
                onFirstStageCompleted: '&',
                control: '=',
                geocodingMustSucceed: '=',
                hideDates: '=',
                showRelatedServiceMessage: '=',
                chatterActionFormClassObject: '='
            },

            link: function link(scope, element, attribues) {
                scope.chatterActionUtils = chatterActionUtils;
                scope.parentType = parentType;
                scope.showMoreOptions = false;
                scope.chatterActionData = null;
                scope.isGeocodeSuccessfull = true;
                scope.appState = appState;
                scope.stageType = stageType;
                scope.internalControl = scope.control || {};
                scope.internalControl.doSecondStage = doSecondStage;
                scope.internalControl.doFirstStage = doFirstStage;
                scope.showCurrentLocationMarket = !window.chinaMap;
                scope.territorySeachRemoteAction = window.sharedRemoteActions.searchTerritories;
                scope.territoryValid = true;
                scope.labelsForTerritoryPicker = window.sharedCustomLabels;
                scope.spinnerIcon = window.sharedIcons.Spinner;
                scope.useAutocompleteTerritoryPicker = false;

                if (window.appBooking && window.appBooking.appBookingSettings && window.appBooking.appBookingSettings[window.appBooking.fieldNames.settings.ShowMoreOptions__c]) {
                    scope.showMoreOptions = window.appBooking.appBookingSettings[window.appBooking.fieldNames.settings.ShowMoreOptions__c];
                }

                scope.generateAddressForChina = function () {
                    var service = scope.serviceObjects[scope.formSelections.serviceCreation.id];

                    var address = '';

                    if (service.Street) address += service.Street + ', ';
                    if (service.City) address += service.City + ', ';
                    if (service.State) address += service.State + ', ';
                    if (service.Country) address += service.Country + ', ';

                    return address.substr(0, address.length - 2);
                };

                // form selections
                scope.formSelections = {
                    serviceCreation: {
                        id: null,
                        Label: sharedCustomLabels.Create_a_new_service
                    },
                    workType: null,
                    assignToMe: false,
                    valid: true
                };

                // service objects binded to the UI (each wo can have several)
                scope.serviceObjects = {
                    null: {}
                };

                // service form select options
                scope.serviceCreationModeTypes = [scope.formSelections.serviceCreation];

                // W-8557852
                // sharedCustomLabels.titleWithObject = attribues.titleWithObject;
                // sharedCustomLabels.titleWithoutObject = attribues.titleWithoutObject;
                // sharedCustomLabels.actionButtonText = attribues.actionButtonText;

                chatterActionUtils.callRemoteAction(sharedRemoteActions.getChatterActionData, [sharedObjectId]).then(function (chatterActionData) {
                    scope.chatterActionData = chatterActionData;
                    moment.locale(chatterActionData.UserLocale);
                    parseChatterActionData();
                    fillServiceFormByChatterActionData();
                    appState.setStage(stageType.Form);

                    if (chatterActionData.UrlSuffix) {
                        chatterActionUtils.setUrlSuffix(chatterActionData.UrlSuffix);
                    }

                    applyCustomCSS();

                    // if we have work type & territory derivation, go to the second screen
                    var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];
                    if (scope.chatterActionData.DerivationDataObject.WorkTypeChatter && currService.Territory && currService.Territory.Id && scope.chatterActionData.ObjectType == parentType.Other || scope.chatterActionData.ObjectType == parentType.Service) {

                        // automatically run only if enabled
                        window.autorunChatterAction && scope.actionButtonClicked();
                    }
                }, showError);

                scope.getLabel = function (label) {
                    return sharedCustomLabels[label];
                };

                scope.getIcon = function (icon) {
                    return sharedIcons[icon];
                };

                scope.isObjectExist = function () {
                    return sharedObjectId;
                };

                scope.getWrapperClass = function () {
                    var res = {};

                    res[scope.getPageName()] = true;
                    if (chatterActionUtils.isSFOne()) res['sf1'] = true;

                    return res;
                };

                scope.isCurrentServicePinned = function () {
                    var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];

                    return currService.Pinned;
                };

                scope.formIsValid = function () {
                    var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];
                    if (!currService || !currService.DueDate) {
                        scope.formSelections.valid = true;
                    } else {
                        scope.formSelections.valid = currService.DueDate.isAfter(currService.EarlyStart);
                    }

                    return scope.formSelections.valid;
                };

                // get address from geolocation or switch back to the one from the original object
                scope.toggleAddress = function () {
                    var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];
                    currService.currentLocation.currentlyLoading = true;

                    if (currService.currentLocation.active) {
                        currService.currentLocation.active = false;
                        currService.currentLocation.currentlyLoading = false;
                        currService.AddressString = currService.AddressBeforeCurrentLocation;
                        currService.AddressBeforeCurrentLocation = null;
                    } else {
                        geolocation.getCurrentAddress()

                        // success
                        .then(function (location) {
                            currService.currentLocation.active = true;
                            currService.currentLocation.currentlyLoading = false;
                            currService.AddressBeforeCurrentLocation = currService.AddressString;
                            currService.AddressString = location.address;
                        })

                        // failed :-(
                        .catch(function (err) {
                            alert('Could not get current location. You need to enable geolocation for this app.');
                            currService.currentLocation.currentlyLoading = false;
                            console.error('Could not get current location :(');
                            console.log(err);
                        });
                    };
                };

                scope.backButtonClicked = function () {
                    appState.back();
                };

                scope.getSelectedTerritoryForAutoComplete = function () {
                    return scope.serviceObjects[scope.formSelections.serviceCreation.id].Territory;
                };

                scope.actionButtonClicked = function () {
                    if (scope.isCurrentServicePinned()) return;

                    if (!scope.territoryValid) {
                        alert('Select territory and try again');
                        return;
                    }

                    appState.setStage(stageType.Loading);
                    var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];
                    chatterActionUtils.setSelectedTerritory(currService.Territory);

                    if (!window.chinaMap && (currService.needToGeocode || !currService.Latitude || !currService.Longitude)) {
                        geolocation.geocodeAddress(currService.AddressString).then(function (geocodeResult) {
                            currService.needToGeocode = false;
                            scope.isGeocodeSuccessfull = true;
                            angular.merge(currService, geocodeResult);
                            currService.GeocodedFromJS = true;
                        }, function (err) {
                            scope.isGeocodeSuccessfull = false;
                            if (scope.geocodingMustSucceed) {
                                return $q.reject(err);
                            }
                        }).then(doFirstStageWrapper, showError);
                    } else {
                        scope.isGeocodeSuccessfull = true;
                        // prevent salesforce lat & lng override
                        if (currService.addressDirty || !currService.Id) {
                            currService.GeocodedFromJS = true;
                        }

                        doFirstStageWrapper();
                    }
                };

                function doFirstStageWrapper() {
                    return doFirstStage(null, null, true);
                }

                function hasAddressObject(service) {
                    return service.Street || service.City || service.State || service.Zip || service.Country;
                }

                scope.workTypeChanged = function () {
                    // can only happen when curr object is not parent and & service
                    // if no derivation for dd, fill it from the work type
                    if (!scope.chatterActionData.DerivationDataObject.DueDate) {
                        var currDueDateOffset = scope.formSelections.workType.DueDateOffset;
                        var currService = scope.serviceObjects[scope.formSelections.serviceCreation.id];
                        currService.DueDate = currService.EarlyStart.clone().add(currDueDateOffset, 'minutes');
                    }
                };

                scope.getPageName = function () {
                    return currentPageName;
                };

                // scope.IsTerritoryPickerActive = function(){
                // chatterActionUtils.callRemoteAction(sharedRemoteActions.TerritoryPickerActive,[]).then(function(result){
                //     scope.IsTerritoryPickerActive = result;
                // });
                // }

                function callOnFirstStageCompleted(firstStageResult) {
                    var promise = returnDummyPromiseIfNeeded(scope.onFirstStageCompleted({ result: firstStageResult }));

                    promise.then(function () {
                        //console.log('resolved');
                    });

                    return promise;
                }

                function returnDummyPromiseIfNeeded(promise) {
                    if (!promise) {
                        var deferred = $q.defer();
                        promise = deferred.promise;
                        deferred.resolve();
                    }

                    return promise;
                }

                function doStage(stageInternalFunction, serviceForServer, newStage, apexAdditionalData, dontShowLoading, actionDonePromise) {
                    if (!dontShowLoading) appState.setStage(stageType.Loading);

                    if (scope.handleSlr && scope.chatterActionData.SLREnabled) {
                        var serviceOldId = serviceForServer.Id;
                        if (newStage == stageType.ActionFirst) serviceForServer.IsVirtualForSLR = true;
                        return chatterActionUtils.callRemoteAction(sharedRemoteActions.createOrUpdateService, [serviceForServer, getChatterActionAdditionalData(serviceForServer, apexAdditionalData, newStage == stageType.ActionFirst)]).then(function (result) {
                            serviceForServer.Id = result.Service.Id;
                            serviceForServer.RequiresAsyncOperation = result.Service.RequiresAsyncOperation;
                        }).then(stageInternalFunction).then(function (result) {
                            serviceForServer.Id = serviceOldId;
                            finishLoading();
                            return result;
                        }).catch(showError);
                    } else return stageInternalFunction().then(function (result) {
                        finishLoading();
                        return result;
                    }).catch(showError);

                    function finishLoading() {
                        actionDonePromise.then(function () {
                            appState.setStage(newStage);;
                        });
                    }
                }

                function doFirstStage(apexAdditionalData, dontShowLoading, needToCallOnFirstStageCompleted) {
                    var serviceForServer = prepareServiceFromForm(scope.serviceObjects[scope.formSelections.serviceCreation.id]);
                    var firstStageCompleteFunction = needToCallOnFirstStageCompleted ? callOnFirstStageCompleted : function () {};

                    return doStage(doFirstStageInternal, serviceForServer, stageType.ActionFirst, apexAdditionalData, dontShowLoading, returnDummyPromiseIfNeeded());

                    function doFirstStageInternal() {
                        var serverResult = null;
                        return chatterActionUtils.callRemoteAction(sharedRemoteActions.doFirstStage, [serviceForServer, scope.handleSlr && scope.chatterActionData.SLREnabled, scope.apexClassName, getChatterActionAdditionalData(serviceForServer, apexAdditionalData, true)]).then(function (result) {
                            serviceForServer.Id = result.Service.Id;
                            serviceForServer.RequiresAsyncOperation = result.Service.RequiresAsyncOperation;

                            serverResult = {
                                firstStageResult: result
                            };

                            return serverResult;
                        }).then(firstStageCompleteFunction).then(function () {
                            // inner function for parameters
                            var deferred = $q.defer();
                            //console.log('back to old and finish loading');

                            if (serviceForServer.RequiresAsyncOperation) {
                                return chatterActionUtils.callRemoteAction(sharedRemoteActions.ChangeServiceToBeforeFormState, [serviceForServer, getChatterActionAdditionalData(serviceForServer, apexAdditionalData)]).then(function () {}).then(function () {
                                    deferred.resolve(serverResult);
                                });
                            } else {
                                deferred.resolve(serverResult);
                            }

                            return deferred.promise;
                        });
                    }
                }

                function prepareServiceFromForm(service) {
                    return {
                        Id: service.Id,
                        TerritoryId: service.Territory && service.Territory.Id,
                        ParentWorkTypeChatter: scope.formSelections.workType.Id,
                        Latitude: service.Latitude,
                        Longitude: service.Longitude,
                        ParentId: getParentId(service),
                        EarlyStart: service.EarlyStart.valueOf(),
                        DueDate: service.DueDate.valueOf(),
                        ArrivalWindowStartTime: service.ArrivalWindowStartTime,
                        ArrivalWindowEndTime: service.ArrivalWindowEndTime,
                        GeocodedFromJS: service.GeocodedFromJS,
                        RequiresAsyncOperation: service.RequiresAsyncOperation,
                        AddressObj: {
                            Street: service.Street,
                            City: service.City,
                            State: service.State,
                            Zip: service.Zip,
                            Country: service.Country
                        }
                    };
                }

                function doSecondStage(apexAdditionalData, donePromise) {
                    donePromise = returnDummyPromiseIfNeeded(donePromise);
                    var serviceForServer = prepareServiceFromForm(scope.serviceObjects[scope.formSelections.serviceCreation.id]);
                    return doStage(doSecondStageInternal, serviceForServer, stageType.ActionSecond, apexAdditionalData, false, donePromise);

                    function doSecondStageInternal() {
                        return chatterActionUtils.callRemoteAction(sharedRemoteActions.doSecondStage, [serviceForServer, scope.handleSlr && scope.chatterActionData.SLREnabled, scope.apexClassName, getChatterActionAdditionalData(serviceForServer, apexAdditionalData, false)]).then(function (result) {
                            console.log(result);

                            return {
                                secondStageResult: result
                            };
                        });
                    }
                }

                function getChatterActionAdditionalData(service, apexAdditionalData, isFirstStage) {
                    var res = {
                        AssignToMe: scope.formSelections.assignToMe,
                        CurrentObjectId: sharedObjectId,
                        PolicyOverrideId: scope.chatterActionData.DerivationDataObject.Policy,
                        LookupFromWO: scope.chatterActionData.DerivationDataObject.LookupFromWO,
                        ParentType: scope.chatterActionData.ObjectType,
                        BaseWorkType: scope.chatterActionData.DerivationDataObject.WorkTypeChatter,
                        Data: apexAdditionalData,
                        IsFirstStage: isFirstStage,
                        ApexInterfaceFullName: scope.apexClassName
                    };

                    if (scope.chatterActionData.ObjectType != parentType.Other && scope.servicesCopies[service.Id]) {
                        res.BaseServiceAppointment = prepareServiceFromForm(scope.servicesCopies[service.Id]);
                    }

                    return res;
                }

                function getParentId(service) {
                    if (scope.chatterActionData.ObjectType == parentType.Parent) return sharedObjectId;else if (scope.chatterActionData.ObjectType == parentType.Service) return service.ParentId;else return null;
                }

                function parseChatterActionData() {
                    scope.chatterActionData.DerivationDataObject.EarlyStart = scope.chatterActionData.DerivationDataObject.EarlyStart ? moment(scope.chatterActionData.DerivationDataObject.EarlyStart).tz('GMT') : null;
                    scope.chatterActionData.DerivationDataObject.DueDate = scope.chatterActionData.DerivationDataObject.DueDate ? moment(scope.chatterActionData.DerivationDataObject.DueDate).tz('GMT') : null;

                    for (var i = 0; i < scope.chatterActionData.CurrentParentServices.length; i++) {
                        scope.chatterActionData.CurrentParentServices[i].EarlyStart = scope.chatterActionData.CurrentParentServices[i].EarlyStart ? moment(scope.chatterActionData.CurrentParentServices[i].EarlyStart).tz('GMT') : null;
                        scope.chatterActionData.CurrentParentServices[i].DueDate = scope.chatterActionData.CurrentParentServices[i].DueDate ? moment(scope.chatterActionData.CurrentParentServices[i].DueDate).tz('GMT') : null;
                    }

                    scope.chatterActionData.WorkTypesSortedArray = chatterActionUtils.sortDicByLabel(scope.chatterActionData.WorkTypeChatters);
                    // no work types in org, parent account, or wo without work type
                    if (scope.chatterActionData.WorkTypesSortedArray.length == 0 || scope.chatterActionData.UnCertifiedParent || scope.chatterActionData.ObjectType != parentType.Other && !scope.chatterActionData.DerivationDataObject.WorkTypeChatter) {
                        scope.chatterActionData.WorkTypesSortedArray.unshift({
                            Id: null,
                            Label: sharedCustomLabels.None,
                            DueDateOffset: 60 * 24 * 7 // 7 days default
                        });

                        scope.chatterActionData.WorkTypeChatters[null] = scope.chatterActionData.WorkTypesSortedArray[0];
                    }

                    // number of allowed territories to display on picker has exceeded
                    if (scope.chatterActionData.ExceededMaxTerritories) {
                        scope.useAutocompleteTerritoryPicker = true;
                    }

                    scope.chatterActionData.TerritoriesSortedArray = chatterActionUtils.sortDicByLabel(scope.chatterActionData.Territories);

                    scope.chatterActionData.TerritoriesSortedArray.unshift({
                        Id: null,
                        Label: sharedCustomLabels.None,
                        TimeZone: scope.chatterActionData.UserTimeZone
                    });

                    scope.chatterActionData.TerritoriesSortedArray[null] = scope.chatterActionData.TerritoriesSortedArray[0];
                }

                function showError(event) {
                    scope.errorMessage = event.message;
                    appState.setStage(stageType.Error);
                    return $q.reject();
                }

                function fillServiceFormByChatterActionData() {
                    fillServiceCreationModeByChatterActionData();
                    fillWorkTypeByChatterActionData();
                    fillBindedServiceObjects();
                }

                function fillServiceCreationModeByChatterActionData() {
                    for (var i = 0; i < scope.chatterActionData.CurrentParentServices.length; i++) {

                        var currentServiceCreationMode = {
                            id: scope.chatterActionData.CurrentParentServices[i].Id,
                            Label: scope.chatterActionData.CurrentParentServices[i].Label
                        };

                        scope.serviceCreationModeTypes.push(currentServiceCreationMode);

                        // if we are on a service, select it in the creation type
                        if (scope.chatterActionData.ObjectType == parentType.Service && scope.chatterActionData.CurrentParentServices[i].Id == scope.chatterActionData.ObjectId) {
                            scope.formSelections.serviceCreation = currentServiceCreationMode;
                        }

                        // if we are on wo, select the first service
                        if (scope.chatterActionData.ObjectType == parentType.Parent && i == 0) {
                            scope.formSelections.serviceCreation = currentServiceCreationMode;
                        }
                    }
                }

                function fillWorkTypeByChatterActionData() {
                    if (scope.chatterActionData.DerivationDataObject.WorkTypeChatter) scope.formSelections.workType = scope.chatterActionData.WorkTypeChatters[scope.chatterActionData.DerivationDataObject.WorkTypeChatter];else scope.formSelections.workType = scope.chatterActionData.WorkTypesSortedArray[0];
                }

                function fillBindedServiceObjects() {
                    // fill new service object
                    // early start
                    if (scope.chatterActionData.DerivationDataObject.EarlyStart) {
                        scope.serviceObjects[null].EarlyStart = scope.chatterActionData.DerivationDataObject.EarlyStart;
                    } else {
                        scope.serviceObjects[null].EarlyStart = moment().tz('GMT');
                    }

                    // due date
                    if (scope.chatterActionData.DerivationDataObject.DueDate) {
                        scope.serviceObjects[null].DueDate = scope.chatterActionData.DerivationDataObject.DueDate;
                    } else {
                        var currDueDateOffset = scope.formSelections.workType.DueDateOffset;
                        scope.serviceObjects[null].DueDate = scope.serviceObjects[null].EarlyStart.clone().add(currDueDateOffset, 'minutes');
                    }

                    // territory
                    if (scope.chatterActionData.DerivationDataObject.TerritoryId) {
                        scope.serviceObjects[null].Territory = scope.chatterActionData.Territories[scope.chatterActionData.DerivationDataObject.TerritoryId];
                    } else {
                        scope.serviceObjects[null].Territory = scope.chatterActionData.TerritoriesSortedArray[0];
                    }

                    // address
                    scope.serviceObjects[null].AddressString = scope.chatterActionData.DerivationDataObject.Address;
                    angular.merge(scope.serviceObjects[null], scope.chatterActionData.DerivationDataObject.AddressObj);
                    scope.serviceObjects[null].currentLocation = {};

                    // geolocation
                    scope.serviceObjects[null].Latitude = scope.chatterActionData.DerivationDataObject.Latitude;
                    scope.serviceObjects[null].Longitude = scope.chatterActionData.DerivationDataObject.Longitude;

                    scope.serviceObjects[null].RequiresAsyncOperation = false;

                    // other services
                    for (var i = 0; i < scope.chatterActionData.CurrentParentServices.length; i++) {
                        var currService = scope.chatterActionData.CurrentParentServices[i];
                        var newService = { Id: currService.Id };
                        // es, dd
                        newService.EarlyStart = currService.EarlyStart ? currService.EarlyStart : moment().tz('GMT');
                        newService.DueDate = currService.DueDate ? currService.DueDate : moment().tz('GMT');

                        newService.ArrivalWindowStartTime = currService.ArrivalWindowStartTime;
                        newService.ArrivalWindowEndTime = currService.ArrivalWindowEndTime;

                        // territory
                        if (currService.TerritoryId) {
                            newService.Territory = scope.chatterActionData.Territories[currService.TerritoryId];
                        } else {
                            newService.Territory = scope.chatterActionData.TerritoriesSortedArray[0];
                        }

                        // address
                        newService.AddressString = currService.Address;
                        angular.merge(newService, currService.AddressObj);
                        newService.currentLocation = {};

                        // geolocation
                        newService.Latitude = currService.Latitude;
                        newService.Longitude = currService.Longitude;

                        newService.ParentId = currService.ParentId;
                        newService.RelatedService = currService.RelatedService;
                        newService.RelatedServiceLabel = currService.RelatedServiceLabel;
                        newService.Pinned = currService.Pinned;
                        newService.RequiresAsyncOperation = currService.RequiresAsyncOperation;

                        scope.serviceObjects[currService.Id] = newService;
                    }

                    scope.servicesCopies = angular.copy(scope.serviceObjects);
                }

                function applyCustomCSS() {
                    if (scope.chatterActionData.CustomCSS) {
                        var css = jQuery("<link>");
                        css.attr({
                            rel: "stylesheet",
                            type: "text/css",
                            href: scope.chatterActionData.CustomCSS
                        });
                        $("head").append(css);
                    }
                }
            },
            template: window.chinaMap ? '<div ng-class="getWrapperClass()">\n                <header> \n                    <button class="back-button-smt" ng-show="appState.getStage() == stageType.ActionFirst || (appState.getStage() == stageType.Error && chatterActionData)" ng-click="backButtonClicked()" id="AN-BackButton">\n                          {{getLabel(\'Back\')}}\n                    </button>\n\n                    <span class="AN-RecordName truncate" ng-cloak="">\n                        <span ng-show="!isObjectExist()">{{getLabel(\'titleWithoutObject\')}}</span>\n                        <span ng-show="isObjectExist()">{{getLabel(\'titleWithObject\')}} {{chatterActionData.ObjectInstanceName}}</span>\n                    </span>\n                </header>\n                \n                <div id="ChatterActionForm" ng-class="chatterActionFormClassObject">\t\t \n                    <div id="AN-GeoWarning" ng-show="!isGeocodeSuccessfull && appState.getStage() == stageType.ActionFirst">\n                        {{ :: getLabel(\'FailedToGeocode\') }}\n                    </div>\n    \t            <div id="ServiceForm" ng-show="appState.getStage() == stageType.Form" ng-cloak="">\n                        <div id="AN-PinnedServiceMessage" ng-show="isCurrentServicePinned()">\n                            <svg class="slds-icon"><use xlink:href="{{ getIcon(\'Pinned\') }}"></use></svg>\n                            {{ :: getLabel(\'Pinned\')}}\n                        </div>\n                        <div id="AN-RelatedService" ng-show="showRelatedServiceMessage && serviceObjects[formSelections.serviceCreation.id].RelatedService">\n                            <svg class="slds-icon"><use xlink:href="{{ getIcon(\'Related\') }}"></use></svg>\n                            {{getLabel(\'Related\').replace(\'$0\',serviceObjects[formSelections.serviceCreation.id].RelatedServiceLabel)}}\n                        </div>\n    \t            \t<div class="AN-input-group first-input-group">\n    \t                    <label for="AN-ServiceCreation">{{ :: getLabel(\'Chatter_Action_Service_Creation_Type\') }}</label>\n    \t                    <select ng-disabled="chatterActionData.ObjectType == parentType.Service || chatterActionData.ObjectType == parentType.Other" ng-change="serviceSelectionChanged()" ng-model="formSelections.serviceCreation" ng-options="creationType as creationType.Label for creationType in serviceCreationModeTypes" id="AN-ServiceCreation">\n    \t                    </select>  \n    \t                </div>   \n\n    \t                <div class="AN-input-group">\n    \t                    <label for="AN-ServiceTypeInput">{{ :: getLabel(\'Work_type\') }}</label>\n    \t                    <select\n    \t                        id="AN-ServiceTypeInput"\n                                ng-disabled="chatterActionData.ObjectType == parentType.Service || chatterActionData.ObjectType == parentType.Parent"\n    \t                        ng-model="formSelections.workType"\n                                ng-change="workTypeChanged()"\n    \t                        ng-options="type as type.Label for type in chatterActionData.WorkTypesSortedArray">\n    \t                    </select>\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-show="showMoreOptions"> \n    \t                    <label for="AN-EarlyStartInput">{{ :: getLabel(\'Early_start\') }}</label>\n    \t                    <input fsl-date-picker ng-keydown="$event.preventDefault()" readonly="true" my-model="serviceObjects[formSelections.serviceCreation.id].EarlyStart" time-zone="serviceObjects[formSelections.serviceCreation.id].Territory.TimeZone" id="AN-EarlyStartInput" type="text"/>\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-show="showMoreOptions">\n    \t                    <label for="AN-DueDateInput">{{ :: getLabel(\'Due_date\') }}</label>\n    \t                    <input fsl-date-picker ng-keydown="$event.preventDefault()" readonly="true" my-model="serviceObjects[formSelections.serviceCreation.id].DueDate" time-zone="serviceObjects[formSelections.serviceCreation.id].Territory.TimeZone" id="AN-DueDateInput" type="text"/>\n    \t                </div>\n\n    \t \n    \t \n    \t                <div class="AN-input-group">\n    \t                    <label for="AN-AddressInput">{{ :: getLabel(\'Address\') }}</label>\n    \t                    <input id="AN-AddressInput" type="text" disabled value="{{generateAddressForChina()}}"/>\n    \t                </div>\n    \t \n\n    \t                <div class="AN-input-group" ng-hide="chatterActionData.IsTerritoryPickerActive">\n    \t                    <label for="AN-LocationInput">{{ :: getLabel(\'Territory\') }}</label>\n    \t                    <select\n    \t                        id="AN-LocationInput"\n    \t                        ng-show="!useAutocompleteTerritoryPicker"\n    \t                        ng-model="serviceObjects[formSelections.serviceCreation.id].Territory"\n    \t                        ng-options="terr as terr.Label for terr in chatterActionData.TerritoriesSortedArray">\n    \t                    </select>\n    \t                    \n    \t                    <territory-picker \n    \t                        ng-show="useAutocompleteTerritoryPicker" \n    \t                        search-action="territorySeachRemoteAction" \n    \t                        value="getSelectedTerritoryForAutoComplete()" \n    \t                        valid="territoryValid" \n    \t                        labels="labelsForTerritoryPicker" \n    \t                        spinner="spinnerIcon" \n                            ></territory-picker>\n                            \n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-if="showAssignToMe && chatterActionData.CurrentUserHasResource && (chatterActionData.ObjectName === \'WorkOrder\' || chatterActionData.ObjectName === \'ServiceAppointment\')">\n    \t                    <input type="checkbox" id="AN-AssignToMe" ng-model="formSelections.assignToMe" />\n    \t                    <label for="AN-AssignToMe">{{ :: getLabel(\'Assign_to_me\') }}</label>\n    \t                </div>\n\n    \t                <button class="AN-BlueButton AN-full-width-button" ng-class="{ DisabledBlueButton: isCurrentServicePinned()}" ng-click="actionButtonClicked()">{{ :: getLabel(\'actionButtonText\') }}</button>\n\n    \t                <div id="AN-FormNotValid" ng-show="!formIsValid()">{{ getLabel(\'EarlyCantBeBeforeDue\') }}</div>\n\n    \t                <button id="AN-MoreOptions" ng-click="showMoreOptions = !showMoreOptions" ng-show="!hideDates">\n    \t                    <span ng-hide="showMoreOptions">{{ :: getLabel(\'Show_more_options\') }}</span>\n    \t                    <span ng-show="showMoreOptions">{{ :: getLabel(\'Show_less_options\') }}</span>\n    \t                </button>\n\n    \t            </div>\n                    <loading ng-show="appState.getStage() == stageType.Loading"></loading>\n                    <error ng-show="appState.getStage() == stageType.Error" message="errorMessage"></error>\n                    <div ng-transclude="mainContent" ng-show="appState.getStage() == stageType.ActionFirst || appState.getStage() == stageType.ActionSecond"></div>\n                </div>\n            </div>' : '<div ng-class="getWrapperClass()">\n                <header> \n                    <button class="back-button-smt" ng-show="appState.getStage() == stageType.ActionFirst || (appState.getStage() == stageType.Error && chatterActionData)" ng-click="backButtonClicked()" id="AN-BackButton">\n                          {{getLabel(\'Back\')}}\n                    </button>\n\n                    <span class="AN-RecordName truncate" ng-cloak="">\n                        <span ng-show="!isObjectExist()">{{getLabel(\'titleWithoutObject\')}}</span>\n                        <span ng-show="isObjectExist()">{{getLabel(\'titleWithObject\')}} {{chatterActionData.ObjectInstanceName}}</span>\n                    </span>\n                </header>\n                \n                <div id="ChatterActionForm" ng-class="chatterActionFormClassObject">\t\t \n                    <div id="AN-GeoWarning" ng-show="!isGeocodeSuccessfull && appState.getStage() == stageType.ActionFirst">\n                        {{ :: getLabel(\'FailedToGeocode\') }}\n                    </div>\n    \t            <div id="ServiceForm" ng-show="appState.getStage() == stageType.Form" ng-cloak="">\n                        <div id="AN-PinnedServiceMessage" ng-show="isCurrentServicePinned()">\n                            <svg class="slds-icon"><use xlink:href="{{ getIcon(\'Pinned\') }}"></use></svg>\n                            {{ :: getLabel(\'Pinned\')}}\n                        </div>\n                        <div id="AN-RelatedService" ng-show="showRelatedServiceMessage && serviceObjects[formSelections.serviceCreation.id].RelatedService">\n                            <svg class="slds-icon"><use xlink:href="{{ getIcon(\'Related\') }}"></use></svg>\n                            {{getLabel(\'Related\').replace(\'$0\',serviceObjects[formSelections.serviceCreation.id].RelatedServiceLabel)}}\n                        </div>\n    \t            \t<div class="AN-input-group first-input-group">\n    \t                    <label for="AN-ServiceCreation">{{ :: getLabel(\'Chatter_Action_Service_Creation_Type\') }}</label>\n    \t                    <select ng-disabled="chatterActionData.ObjectType == parentType.Service || chatterActionData.ObjectType == parentType.Other" ng-change="serviceSelectionChanged()" ng-model="formSelections.serviceCreation" ng-options="creationType as creationType.Label for creationType in serviceCreationModeTypes" id="AN-ServiceCreation">\n    \t                    </select>  \n    \t                </div>   \n\n    \t                <div class="AN-input-group">\n    \t                    <label for="AN-ServiceTypeInput">{{ :: getLabel(\'Work_type\') }}</label>\n    \t                    <select\n    \t                        id="AN-ServiceTypeInput"\n                                ng-disabled="chatterActionData.ObjectType == parentType.Service || chatterActionData.ObjectType == parentType.Parent"\n    \t                        ng-model="formSelections.workType"\n                                ng-change="workTypeChanged()"\n    \t                        ng-options="type as type.Label for type in chatterActionData.WorkTypesSortedArray">\n    \t                    </select>\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-show="showMoreOptions"> \n    \t                    <label for="AN-EarlyStartInput">{{ :: getLabel(\'Early_start\') }}</label>\n    \t                    <input fsl-date-picker readonly="true" my-model="serviceObjects[formSelections.serviceCreation.id].EarlyStart" time-zone="serviceObjects[formSelections.serviceCreation.id].Territory.TimeZone" id="AN-EarlyStartInput" type="text"/>\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-show="showMoreOptions">\n    \t                    <label for="AN-DueDateInput">{{ :: getLabel(\'Due_date\') }}</label>\n    \t                    <input fsl-date-picker readonly="true" my-model="serviceObjects[formSelections.serviceCreation.id].DueDate" time-zone="serviceObjects[formSelections.serviceCreation.id].Territory.TimeZone" id="AN-DueDateInput" type="text"/>\n    \t                </div>\n\n    \t                <div class="AN-input-group">\n    \t                    <label for="AN-AddressInput" >{{ :: getLabel(\'Address\') }}</label>\n    \t                    <input placeholder="{{labelsForTerritoryPicker.enter_location}}" address-input address-object="serviceObjects[formSelections.serviceCreation.id]" address-string="serviceObjects[formSelections.serviceCreation.id].AddressString" address-dirty="serviceObjects[formSelections.serviceCreation.id].addressDirty" need-to-geocode="serviceObjects[formSelections.serviceCreation.id].needToGeocode" id="AN-AddressInput" type="text" />\n                            <svg ng-show="showCurrentLocationMarket && !serviceObjects[formSelections.serviceCreation.id].currentLocation.currentlyLoading" ng-class="{\'AN-UsingCurrentLocation\': serviceObjects[formSelections.serviceCreation.id].currentLocation.active}" ng-click="toggleAddress()" aria-label="{{ labelsForTerritoryPicker.currentLocation }}" id="AN-LocationIcon" class="slds-icon">\n                                <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="{{getIcon(\'Location\')}}"></use>\n                            </svg>\n                            <img ng-show="serviceObjects[formSelections.serviceCreation.id].currentLocation.currentlyLoading" ng-click="toggleAddress()" alt="{{ labelsForTerritoryPicker.loading }}" id="AN-LocationIconLoading" class="slds-icon ng-hide" ng-src="{{getIcon(\'Spinner\')}}">\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-hide="chatterActionData.IsTerritoryPickerActive">\n    \t                    <label for="AN-LocationInput">{{ :: getLabel(\'Territory\') }}</label>\n    \t                    <select\n    \t                        id="AN-LocationInput"\n    \t                        ng-show="!useAutocompleteTerritoryPicker"\n    \t                        ng-model="serviceObjects[formSelections.serviceCreation.id].Territory"\n    \t                        ng-options="terr as terr.Label for terr in chatterActionData.TerritoriesSortedArray">\n    \t                    </select>\n    \t                    \n    \t                    <territory-picker \n    \t                        ng-show="useAutocompleteTerritoryPicker"\n    \t                        search-action="territorySeachRemoteAction" \n    \t                        value="serviceObjects[formSelections.serviceCreation.id].Territory" \n    \t                        valid="territoryValid" \n    \t                        labels="labelsForTerritoryPicker" \n    \t                        spinner="spinnerIcon" \n                            ></territory-picker>\n    \t                </div>\n\n    \t                <div class="AN-input-group" ng-if="showAssignToMe && chatterActionData.CurrentUserHasResource && (chatterActionData.ObjectName === \'WorkOrder\' || chatterActionData.ObjectName === \'ServiceAppointment\')">\n    \t                    <input type="checkbox" id="AN-AssignToMe" ng-model="formSelections.assignToMe" />\n    \t                    <label for="AN-AssignToMe">{{ :: getLabel(\'Assign_to_me\') }}</label>\n    \t                </div>\n\n    \t                <button class="AN-BlueButton AN-full-width-button" ng-class="{ DisabledBlueButton: isCurrentServicePinned()}" ng-click="actionButtonClicked()">{{ :: getLabel(\'actionButtonText\') }}</button>\n\n    \t                <div id="AN-FormNotValid" ng-show="!formIsValid()">{{ getLabel(\'EarlyCantBeBeforeDue\') }}</div>\n\n    \t                <button id="AN-MoreOptions" ng-click="showMoreOptions = !showMoreOptions" ng-show="!hideDates">\n    \t                    <span ng-hide="showMoreOptions">{{ :: getLabel(\'Show_more_options\') }}</span>\n    \t                    <span ng-show="showMoreOptions">{{ :: getLabel(\'Show_less_options\') }}</span>\n    \t                </button>\n\n    \t            </div>\n                    <loading ng-show="appState.getStage() == stageType.Loading"></loading>\n                    <error ng-show="appState.getStage() == stageType.Error" message="errorMessage"></error>\n                    <div ng-transclude="mainContent" ng-show="appState.getStage() == stageType.ActionFirst || appState.getStage() == stageType.ActionSecond"></div>\n                </div>\n            </div>'
        };
    }]);
})();
'use strict';

(function () {
    angular.module('ChatterAction').directive('territoryPicker', [function () {

        return {
            restrict: 'E',
            scope: {
                searchAction: '=',
                value: '=',
                valid: '=',
                labels: '=',
                spinner: '='
            },

            link: function link(scope) {

                scope.currentResults = [];
                scope.resuls = {};
                scope.showResults = false;
                scope.searchText = '';
                scope.allTerritories = {};
                scope.warningText = null;
                scope.searchResultTopPosition = 0;
                scope.currentlySaving = 0;

                // Update territory input if already filled (1st time only)
                scope.$watch('value', function (newValue, oldValue) {

                    // W-8037308
                    if (newValue) {
                        scope.searchText = newValue.Label;
                        scope.valid = true;
                    }
                });

                scope.closeSearchBoxClickOutside = function () {

                    scope.showResults = false;

                    if (scope.searchText === "") {
                        scope.value = { Id: null, Label: scope.labels.none, TimeZone: 'GMT' };
                        scope.valid = true;
                        return;
                    }

                    scope.valid = !scope.searchText || !!scope.allTerritories[scope.searchText];
                };

                scope.selectTerritory = function (territory) {
                    scope.searchText = territory.Label;
                    scope.showResults = false;
                    scope.warningText = null;
                    scope.value = territory;
                    scope.valid = true;
                };

                scope.isSelectedTerritoryValid = function () {
                    return !!scope.allTerritories[scope.searchText] || scope.searchText === "";
                };

                scope.setSearchResultBox = function ($event) {
                    scope.searchResultTopPosition = $event.currentTarget.getBoundingClientRect().top + 40 + 'px';
                };

                scope.searchTerritory = function (searchText) {

                    // search is empty, mark "none" and validate
                    if (searchText === "") {
                        scope.currentResults = [];
                        scope.value = { Id: null, Label: scope.labels.none, TimeZone: 'GMT' };
                        scope.showResults = false;
                        scope.warningText = null;
                        scope.valid = true;
                        return;
                    }

                    // check if cached
                    if (scope.resuls[searchText.toLocaleLowerCase()]) {

                        scope.currentResults = scope.resuls[searchText.toLocaleLowerCase()];
                        scope.showResults = true;

                        if (scope.currentResults.length === 0) {
                            scope.warningText = scope.labels.NoServiceTerritoryFound;
                        } else {
                            scope.warningText = null;
                        }

                        return;
                    }

                    scope.currentlySaving = true;

                    // query from server
                    window.Visualforce.remoting.Manager.invokeAction(scope.searchAction, scope.searchText, function (result, ev) {

                        if (ev.status) {

                            scope.$apply(function () {

                                // cache
                                scope.resuls[searchText.toLocaleLowerCase()] = result;
                                scope.showResults = true;

                                // not synced with current value
                                if (scope.searchText !== searchText) {
                                    return;
                                }

                                scope.currentlySaving = false;
                                scope.currentResults = result;

                                if (result.length === 0) {
                                    scope.warningText = scope.labels.NoServiceTerritoryFound;
                                } else {
                                    scope.warningText = null;
                                    result.forEach(function (t) {
                                        return scope.allTerritories[t.Label] = t;
                                    });
                                }
                            });
                        } else {

                            console.warn(ev);
                        }
                    }, { buffer: true, escape: false, timeout: 120000 });
                };
            },

            template: '\n                    <div>\n\n                        <input type="text" \n                            placeholder="' + window.sharedCustomLabels.None + '" \n                            ng-model="searchText" \n                            ng-model-options="{ debounce: 333 }" \n                            ng-change="searchTerritory(searchText)" \n                            ng-click="setSearchResultBox($event)"\n                            ng-keydown="setSearchResultBox($event)" \n                        />\n                        \n                        <img class="tp-spinner" ng-src="{{spinner}}" ng-show="currentlySaving" />\n                        \n                        <div class="tp-click-catch" ng-click="closeSearchBoxClickOutside()" ng-show="showResults && currentResults.length > 0">\n                            <div class="tp-territories-container" ng-style="{\'top\': searchResultTopPosition}">\n                                <div tabindex="0" fsl-key-press fsl-tab-switch role="select" class="tp-territory" ng-repeat="territory in currentResults" ng-click="selectTerritory(territory)">\n                                    {{ territory.Label }}\n                                </div>\n                            </div>\n                        </div>\n                        \n                        <div class="tp-warning" ng-show="warningText && showResults">{{ warningText }}</div>\n                             \n                    </div>'
        };
    }]);
})();
'use strict';

(function () {

    angular.module('ChatterAction').filter('dateTimeFilter', function () {
        return function (date, format) {
            return data.tz(userTimeZone).format(format);
        };
    });
})();
'use strict';

(function () {

    angular.module('ChatterAction').filter('dictToArray', function () {
        return function (obj) {
            if (!(obj instanceof Object)) return obj;

            var arr = [];
            for (var key in obj) {
                arr.push(obj[key]);
            }
            return arr;
        };
    });
})();
'use strict';

(function () {

	// service definition
	angular.module('ChatterAction').factory('appState', ['stageType', function (stageType) {

		var statesStack = [];
		statesStack.push(stageType.Loading);

		var service = {
			getStage: function getStage() {
				return statesStack[statesStack.length - 1];
			},
			setStage: function setStage(newStage) {
				if (service.getStage() != newStage) statesStack.push(newStage);
			},
			back: function back() {
				var first = service.getStage();
				var curr = first;
				var firstLoop = true;

				while (true) {
					if (!curr || curr != stageType.Loading && curr != first && !firstLoop) {
						statesStack.push(curr);
						break;
					}

					curr = statesStack.pop();
					firstLoop = false;
				}
			}
		};

		return service;
	}]);
})();
'use strict';

(function () {

    // service definition
    angular.module('ChatterAction').factory('chatterActionUtils', ['$q', 'orderByFilter', '$filter', function ($q, orderByFilter, $filter) {

        var territories = null;
        var selectedTerritory = null;
        var suffix = '';

        function isRtlDirection() {
            return window.isLanguageRTL;
        }

        function setUrlSuffix(suff) {
            suffix = suff;
        }

        function isSFOne() {
            return window.sforce && sforce.one;
        }

        function sortDicByLabel(dic) {
            return orderByFilter($filter('dictToArray')(dic), 'Label');
        }

        function changeDateToTerritoryTZ(momentDate) {
            if (selectedTerritory) return momentDate.tz(selectedTerritory.TimeZone);else return momentDate;
        }

        function setSelectedTerritory(territory) {
            selectedTerritory = territory;
        }

        function openService(objectId, specificPage, newWindow) {
            if (typeof sforce != "undefined" && sforce.console && sforce.console.isInConsole()) {

                sforce.console.generateConsoleUrl(['/' + objectId], function (result) {
                    if (result.success) {
                        sforce.console.openConsoleUrl(null, result.consoleUrl, true);
                        if (newWindow == undefined) {
                            sforce.console.getEnclosingTabId(function (tab) {
                                if (tab.success) {
                                    sforce.console.refreshSubtabById(tab.id);
                                } else {
                                    sforce.console.getFocusedSubtabId(function (tab) {
                                        sforce.console.refreshSubtabById(tab.id);
                                    });
                                }
                            });
                        }
                    } else openLightningSubtab(objectId);
                });
            } else if (typeof sforce != 'undefined' && sforce.one) {
                if (UserUITheme === 'Theme4t') {
                    // Mobile 
                    sforce.one.navigateToSObject(objectId, specificPage);
                } else if (UserUITheme === 'Theme4d') {
                    // Lightning
                    //window.open('../' + objectId, '_blank');
                    sforce.one.navigateToSObject(objectId, specificPage);
                } else {
                    // Classic 
                    window.open('../' + objectId, '_blank');
                }
            } else if (newWindow) {
                window.open('../' + objectId, '_blank');
            } else if (appBooking && appBooking.isInCommunity) {
                //W-14371943 open record for site : community page
                window.parent.location = suffix + '/' + objectId;
            } else {
                try {
                    window.parent.location.reload(); // In case we are in scheduler (gantt view)
                } catch (ex) {
                    window.parent.location = suffix + '/' + objectId;
                }
            }
        }

        function openLightningSubtab(id) {
            sforce.console.getEnclosingPrimaryTabId(function (result) {

                //Now that we have the primary tab ID, we can open a new subtab in it
                var primaryTabId = result.id;
                sforce.console.openSubtab(primaryTabId, '/' + id, true);
            });
        };

        function getServiceInfoRowClass(field) {
            if (!field) return;

            var obj = {};

            if (field.Type == 'REFERENCE') obj.resourceOnServiceTT = true;

            return obj;
        }

        function callRemoteAction(functionName, paramsArray) {
            var deferred = $q.defer();
            paramsArray.unshift(functionName);
            paramsArray.push(function (result, event) {
                if (event.status) {
                    deferred.resolve(result);
                } else {
                    deferred.reject(event);
                }
            });
            paramsArray.push({ buffer: false, escape: false, timeout: 120000 });
            Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, paramsArray);
            return deferred.promise;
        }

        return {
            callRemoteAction: callRemoteAction,
            sortDicByLabel: sortDicByLabel,
            openService: openService,
            setSelectedTerritory: setSelectedTerritory,
            changeDateToTerritoryTZ: changeDateToTerritoryTZ,
            setUrlSuffix: setUrlSuffix,
            isSFOne: isSFOne,
            getServiceInfoRowClass: getServiceInfoRowClass,
            isRtlDirection: isRtlDirection
        };
    }]);
})();
'use strict';

(function () {

    // service definition
    angular.module('ChatterAction').service('geolocation', geolocation);

    // service injections
    geolocation.$inject = ['$q'];

    // actual service c'tor
    function geolocation($q) {
        var _this = this;

        var currentLocation = {
            longitude: null,
            latitude: null,
            address: null
        };

        this.getAddressObject = function (googleResult) {
            var location = {
                Latitude: googleResult.geometry.location.lat(),
                Longitude: googleResult.geometry.location.lng(),
                Street: null,
                City: null,
                State: null,
                Zip: null,
                Country: null
            };

            for (var i = 0; i < googleResult.address_components.length; i++) {
                var types = googleResult.address_components[i].types;

                if (!types || types.length == 0) continue;
                var firstType = types[0];
                var val = googleResult.address_components[i].short_name ? googleResult.address_components[i].short_name : googleResult.address_components[i].long_name;

                switch (firstType) {
                    case 'street_number':
                        location.Street = val + ' ';
                        break;
                    case 'route':
                        if (location.Street == null) location.Street = '';
                        location.Street = location.Street + val;
                        break;
                    case 'locality':
                        location.City = val;
                        break;
                    case 'administrative_area_level_1':
                        location.State = val;
                        break;
                    case 'postal_code':
                        location.Zip = val;
                        break;
                    case 'country':
                        location.Country = val;
                        break;

                }
            }

            return location;
        };

        // geocode address using Google (get lang and long)
        this.geocodeAddress = function (address) {

            var deferred = $q.defer(),
                geocoder = new google.maps.Geocoder();

            if (address != null && address != undefined && address.trim() == '') {
                deferred.resolve({
                    Latitude: null,
                    Longitude: null,
                    Street: null,
                    City: null,
                    State: null,
                    Zip: null,
                    Country: null
                });

                return deferred.promise;
            }

            geocoder.geocode({ address: address }, function (results, status) {

                if (status === google.maps.GeocoderStatus.OK) {
                    var firstRes = results[0];
                    var location = _this.getAddressObject(firstRes);
                    deferred.resolve(location);
                } else {
                    deferred.reject({ message: sharedCustomLabels.WizardUnableToGeocode });
                }
            });

            return deferred.promise;
        };

        this.getCurrentAddress = function () {

            var deferred = $q.defer();

            navigator.geolocation.getCurrentPosition(function (result) {
                var geocoder = new google.maps.Geocoder();
                currentLocation.latitude = result.coords.latitude;
                currentLocation.longitude = result.coords.longitude;

                geocoder.geocode({ 'latLng': { lat: result.coords.latitude, lng: result.coords.longitude } }, function (addressResult, status) {

                    if (status == google.maps.GeocoderStatus.OK && addressResult[0]) {
                        currentLocation.address = addressResult[0].formatted_address;
                    }

                    deferred.resolve(currentLocation);
                });
            },

            // no geolocation available
            function (err) {
                deferred.reject(err);
            },

            // options object for google
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });

            return deferred.promise;
        };
    }
})();