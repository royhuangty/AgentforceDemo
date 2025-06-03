'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

(function () {

    MapService.$inject = ['$rootScope', '$q', 'TimePhasedDataService', 'LastKnownPositionService', 'utils', 'servicesService', 'ServiceAppointmentLightboxService', 'ResourceLightboxService', 'bulkScheduleService', 'FieldSetFieldsService', 'GeneralLightbox', 'ResourcesAndTerritoriesService', 'userSettingsManager', 'sfdcService', 'SERVICE_STATUS', 'RegisterService', 'DeltaService'];

    angular.module('serviceExpert').factory('MapService', MapService);

    function MapService($rootScope, $q, TimePhasedDataService, LastKnownPositionService, utils, servicesService, ServiceAppointmentLightboxService, ResourceLightboxService, bulkScheduleService, FieldSetFieldsService, GeneralLightbox, ResourcesAndTerritoriesService, userSettingsManager, sfdcService, SERVICE_STATUS, RegisterService, DeltaService) {

        var POLYGONS = '[POLYGONS]';
        var initMapFinished = false;

        var MAP_CONSTANTS = {
            IFRAME_TYPE: {
                SECURED: '1',
                NORMAL: '2'
            },
            IFRAME_RECEIVED_MESSAGES_TYPES: {
                FSL_MAP_LOADED: 'FSL_MAP_LOADED',
                FSL_MAP_INITIALIZATION: 'FSL_MAP_INITIALIZATION',
                FSL_MAP_DATA_UPDATE: 'FSL_MAP_DATA_UPDATE',
                VIEW_DETAILS: 'VIEW_DETAILS',
                FLAG_SA: 'FLAG_SA',
                API_REQUEST: 'API_REQUEST',
                GET_ICON: 'GET_ICON'
            },
            IFRAME_SEND_MESSAGES_TYPES: {
                API_REQUEST_SUCCEED: 'API_REQUEST_SUCCEED',
                API_REQUEST_FAILED: 'API_REQUEST_FAILED',
                FSL_MAP_INITIALIZATION: 'FSL_MAP_INITIALIZATION',
                // FSL_MAP_DATA_UPDATE: 'FSL_MAP_DATA_UPDATE',
                FSL_MAP_SERVICES_UPDATE: 'FSL_MAP_SERVICES_UPDATE',
                SHOW_SERVICE_ON_MAP: 'SHOW_SERVICE_ON_MAP',
                GET_ICON_SUCCEED: 'GET_ICON_SUCCEED',
                GET_ICON_FAILED: 'GET_ICON_FAILED',
                FSL_MAP_LIVE_POSITION: 'FSL_MAP_LIVE_POSITION',
                FSL_MAP_UPDATE_FILTER: 'FSL_MAP_UPDATE_FILTER',
                FSL_MAP_UPDATE_VIEW: 'FSL_MAP_UPDATE_VIEW'
            },
            POLYGON_MENU_ACTIONS: {
                SCHEDULE: POLYGONS + ' SCHEDULE',
                UNSCHEDULE: POLYGONS + ' UNSCHEDULE',
                DISPATCH: POLYGONS + ' DISPATCH',
                IN_JEOPARDY: POLYGONS + ' IN_JEOPARDY',
                DELETE_POLYGON: POLYGONS + ' DELETE_POLYGON',
                CUSTOM_ACTION: POLYGONS + ' CUSTOM_ACTION'
            }
        };

        var mapData = {
            showServiceOnMapId: undefined,
            showServiceOnMap: false,
            reactDomain: undefined,
            targetOrigin: undefined,
            reactMapInitialize: false,
            iframeMapMode: window.iframeMapMode,
            debugMode: window.debugMode,
            iframeWindow: undefined,
            serviceFields: [],
            dynamicIcons: {}
        };

        LastKnownPositionService.getLastKnownPositions();

        FieldSetFieldsService.fieldsSetFields().then(function (fieldsSetFieldsObject) {
            mapData.serviceFields = fieldsSetFieldsObject.MapInfo;
        });

        var handleIframeMessages = function handleIframeMessages(dataMsg) {

            var data = dataMsg;

            if (mapData.iframeMapMode === MAP_CONSTANTS.IFRAME_TYPE.NORMAL) {
                data = dataMsg.data;
            }

            if (data.type !== undefined) {
                if (data.type.includes(POLYGONS)) {
                    handlePolygonAction(data);
                } else {
                    handleMapMessages(data);
                }
            }
        };

        var bindEvent = function bindEvent(element, eventName, eventHandler) {
            if (element.addEventListener) {
                element.addEventListener(eventName, eventHandler);
            } else if (element.attachEvent) {
                element.attachEvent('on' + eventName, eventHandler);
            }
        };

        setTimeout(function () {
            if (mapData.iframeMapMode === MAP_CONSTANTS.IFRAME_TYPE.SECURED && SfdcApp.iframe) {
                if (mapData.debugMode) {
                    SfdcApp.iframe.addMessageHandler('GanttReactMapIframeDebug', handleIframeMessages);
                } else {
                    SfdcApp.iframe.addMessageHandler('GanttReactMapIframe', handleIframeMessages);
                }
            }

            if (mapData.iframeMapMode === MAP_CONSTANTS.IFRAME_TYPE.NORMAL) {

                // Will be done on the apex controller to avoid timing issues with lightning
                // if(mapData.debugMode){
                //     mapData.reactDomain = window.origin + '/apex/FSLGanttMapSFDev';
                // }
                // else{
                //     mapData.reactDomain = window.origin + '/apex/FSLGanttMapSF';
                // }

                mapData.targetOrigin = window.location.origin + window.location.pathname;
                mapData.iframeWindow = document.getElementById("GanttReactMapIframeSF").contentWindow;
                bindEvent(window, 'message', handleIframeMessages);
            }
        }, 0);

        var sendMessageToIframe = function sendMessageToIframe(msg) {

            if (mapData.iframeMapMode === MAP_CONSTANTS.IFRAME_TYPE.SECURED && SfdcApp.iframe) {
                if (mapData.debugMode) {
                    SfdcApp.iframe.sendMessage('GanttReactMapIframeDebug', msg);
                } else {
                    SfdcApp.iframe.sendMessage('GanttReactMapIframe', msg);
                }
            }

            if (mapData.iframeMapMode === MAP_CONSTANTS.IFRAME_TYPE.NORMAL) {
                mapData.iframeWindow.postMessage(msg, mapData.targetOrigin);
            }
        };

        var handleMapMessages = function handleMapMessages(data) {
            switch (data.type) {
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.FSL_MAP_LOADED:
                    // updateGanttMapFilter();
                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.FSL_MAP_INITIALIZATION:
                    mapData.reactMapInitialize = true;
                    updateGanttMapView();
                    updateGanttMapFilter();
                    updateGanttMapLivePositions();
                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.FSL_MAP_DATA_UPDATE:
                    if (mapData.showServiceOnMap && mapData.showServiceOnMapId) {
                        setTimeout(function () {

                            var showServiceOnMapMsg = {
                                serviceId: mapData.showServiceOnMapId,
                                type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.SHOW_SERVICE_ON_MAP
                            };

                            sendMessageToIframe(showServiceOnMapMsg);

                            mapData.showServiceOnMap = false;
                            mapData.showServiceOnMapId = undefined;
                        }, 7000);
                    }
                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.VIEW_DETAILS:
                    viewDetails(data.id, data.objectType);
                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.FLAG_SA:
                    flagSA(data.serviceAppointmentsId);
                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.API_REQUEST:

                    sendMapAPIRequest(data.method, data.filter, data.params).then(function (res) {

                        if (data.method === 'getCustomActions') {

                            parsePolygonCustomActionMenu(res).then(function (customActionsParsed) {

                                var apiRequestResponse = {
                                    response: customActionsParsed,
                                    feature: data.feature,
                                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_SUCCEED
                                };

                                sendMessageToIframe(apiRequestResponse);
                            }).catch(function (err) {
                                console.warn(err);
                            });
                        } else if (data.method === 'getReportRowsForMap') {

                            addIconForReport(res).then(function (reportRowsWithIcon) {

                                var apiRequestResponse = {
                                    response: reportRowsWithIcon,
                                    feature: data.feature,
                                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_SUCCEED
                                };

                                sendMessageToIframe(apiRequestResponse);
                            });
                        } else if (data.method === 'getReportsWithGeolocationCols') {

                            addIconForReportMarkers(res).then(function (mapReport) {

                                var apiRequestResponse = {
                                    response: mapReport,
                                    feature: data.feature,
                                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_SUCCEED
                                };

                                sendMessageToIframe(apiRequestResponse);
                            });
                        } else if (data.method === 'getMapReports') {

                            addIconsForReports(res).then(function (reportsRowsWithIcon) {

                                var apiRequestResponse = {
                                    response: reportsRowsWithIcon,
                                    feature: data.feature,
                                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_SUCCEED
                                };

                                sendMessageToIframe(apiRequestResponse);
                            });
                        } else {

                            var apiRequestResponse = {
                                response: res,
                                feature: data.feature,
                                type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_SUCCEED
                            };

                            sendMessageToIframe(apiRequestResponse);
                        }
                    }).catch(function (err) {

                        var apiRequestResponse = {
                            response: err,
                            feature: data.feature,
                            type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.API_REQUEST_FAILED
                        };

                        sendMessageToIframe(apiRequestResponse);
                    });

                    break;
                case MAP_CONSTANTS.IFRAME_RECEIVED_MESSAGES_TYPES.GET_ICON:
                    GetIconForMap(data.hex, data.folder, data.icon, data.iconKey).then(function (base64Icon) {

                        var apiRequestResponse = {
                            response: base64Icon,
                            iconKey: data.iconKey,
                            type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.GET_ICON_SUCCEED
                        };

                        sendMessageToIframe(apiRequestResponse);
                    }).catch(function (errMsg) {

                        var apiRequestResponse = {
                            response: errMsg,
                            iconKey: data.iconKey,
                            type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.GET_ICON_FAILED
                        };

                        sendMessageToIframe(apiRequestResponse);
                    });

                default:
                    break;
            }
        };

        var handlePolygonAction = function handlePolygonAction(data) {
            switch (data.type) {
                case MAP_CONSTANTS.POLYGON_MENU_ACTIONS.CUSTOM_ACTION:
                    runCustomAction(data.servicesIds, data.action);
                    break;
                case MAP_CONSTANTS.POLYGON_MENU_ACTIONS.DISPATCH:
                    servicesService.changeStatus(data.servicesIds, SERVICE_STATUS.DISPATCHED).then(function (resultObjects) {
                        servicesService.drawServicesAndAbsences(resultObjects.services);
                    }).catch(function (err) {
                        utils.addNotification(window.customLabels.Action_Could_Not_Be_Performed, err.message || window.customLabels.user_is_not_allowed_to_perform_action);
                    });
                    break;
                case MAP_CONSTANTS.POLYGON_MENU_ACTIONS.UNSCHEDULE:
                    servicesService.unscheduleServices(data.servicesIds);
                    break;
                case MAP_CONSTANTS.POLYGON_MENU_ACTIONS.SCHEDULE:
                    bulkScheduleService.schedule(data.servicesIds);
                    break;
                case MAP_CONSTANTS.POLYGON_MENU_ACTIONS.IN_JEOPARDY:
                    servicesService.setInJeopardy(data.servicesIds);
                    break;
            }
        };

        var CreateCustomActionData = function CreateCustomActionData(action) {

            var deferred = $q.defer();

            try {

                var customAction = {};
                customAction.id = action.Id;
                customAction.name = action[window.GanttMap.fieldNames.CustomGanttAction.Label];
                customAction.className = action[window.GanttMap.fieldNames.CustomGanttAction.Class];
                customAction.order = action[window.GanttMap.fieldNames.CustomGanttAction.Order];
                customAction.permission = action[window.GanttMap.fieldNames.CustomGanttAction.Permission];
                customAction.section = action[window.GanttMap.fieldNames.CustomGanttAction.Section];
                customAction.visualforce = action[window.GanttMap.fieldNames.CustomGanttAction.Visualforce];

                if (action[window.GanttMap.fieldNames.CustomGanttAction.Icon]) {
                    var iconUrl = generateIconUrl(action[window.GanttMap.fieldNames.CustomGanttAction.Icon].split(','));

                    toDataURL(iconUrl).then(function (res) {
                        var svg64 = res.replace(/^.+base64,/, "").replace(/\"?\)$/, "");
                        var xml = window.atob(svg64);
                        var hex = '#17325c';
                        var color = xml.replace(/fill="#[A-Za-z0-9]+"/, 'fill="' + hex + '"');
                        var color64 = window.btoa(color);
                        customAction.icon = "url('data:image/svg+xml;base64," + color64 + "')";
                        deferred.resolve(customAction);
                    });
                }
            } catch (ex) {
                deferred.reject(ex);
            }

            return deferred.promise;
        };

        var parsePolygonCustomActionMenu = function parsePolygonCustomActionMenu(res) {

            var deferred = $q.defer();

            var customActionAsync = {};

            for (var i = 0; i < res.length; i++) {
                if (utils.hasCustomPermission(res[i][window.GanttMap.fieldNames.CustomGanttAction.Permission]) && res[i][window.GanttMap.fieldNames.CustomGanttAction.Section] === 'map') {
                    customActionAsync[res[i].Id] = CreateCustomActionData(res[i]);
                }
            }

            $q.all(customActionAsync).then(function (customActionsParsed) {
                deferred.resolve(customActionsParsed);
            }).catch(function (event) {
                console.warn(event.message);
                deferred.reject();
            });

            return deferred.promise;
        };

        var addIconForReportMarkers = function addIconForReportMarkers(reportMap) {
            // show notification if there is no run report permission
            var notifications = utils.butlerNotifications();
            if (Object.keys(reportMap[0].report).length === 0 && reportMap[0].color === 'error') {
                var filteredNotifications = notifications.filter(function (notification) {
                    return notification.title === window.customLabels.Report_Object_Access_Deny;
                });
                if (filteredNotifications.length >= 1) {
                    return;
                }
                utils.addNotification(window.customLabels.Report_Object_Access_Deny, window.customLabels.Report_Object_Access_Error_Message, function () {});
                return;
            }

            var deferred = $q.defer();

            var iconsResultPromises = [];

            try {

                for (var i = 0; i < reportMap.length; i++) {

                    if (!!reportMap[i].icon) {
                        var iconDetails = reportMap[i].icon.split(',');
                        iconsResultPromises.push(GetIconForMap('#ffffff', iconDetails[0], iconDetails[1], 'report_' + iconDetails[0] + '_' + iconDetails[1]));
                    }
                }
            } catch (ex) {
                console.warn('failed to add icon to report based on configuration');
                deferred.reject(ex);
            }

            $q.all(iconsResultPromises).then(function (reportIcons) {

                var j = 0;

                for (var _i = 0; _i < reportMap.length; _i++) {
                    if (!!reportMap[_i].icon) {
                        reportMap[_i].icon = reportIcons[j];
                        j++;
                    }
                }

                deferred.resolve(reportMap);
            }).catch(function (event) {
                deferred.resolve(reportRows);
            });

            return deferred.promise;
        };

        var addIconsForReports = function addIconsForReports(reportsMap) {

            var deferred = $q.defer();
            var reportsIds = Object.keys(reportsMap);

            var resultPromises = {};

            for (var i = 0; i < reportsIds.length; i++) {
                resultPromises[reportsIds[i]] = addIconForReport(reportsMap[reportsIds[i]]);
            }

            $q.all(resultPromises).then(function (reportsRowsWithIcon) {
                deferred.resolve(reportsRowsWithIcon);
            });

            return deferred.promise;
        };

        var addIconForReport = function addIconForReport(reportRows) {

            var deferred = $q.defer();

            var iconsResultPromises = [];

            for (var i = 0; i < reportRows.length; i++) {
                var reportRow = reportRows[i];
                var objectTypeName = reportRow.sObjectType.split(/(?=[A-Z])/).join('_').toLowerCase();

                if (reportRow.sObjectType === 'ServiceAppointment') {
                    objectTypeName = 'work_order';
                }

                if (reportRow.sObjectType === 'ServiceResource') {
                    objectTypeName = 'home';
                }

                if (reportRow.sObjectType === 'Asset') {
                    objectTypeName = 'product';
                }

                iconsResultPromises.push(GetIconForMap('#ffffff', 'standard', objectTypeName, 'report_' + objectTypeName));
            }

            $q.all(iconsResultPromises).then(function (reportIcons) {

                for (var _i2 = 0; _i2 < reportRows.length; _i2++) {
                    reportRows[_i2].reportIcon = reportIcons[_i2];
                }

                deferred.resolve(reportRows);
            }).catch(function (event) {
                deferred.resolve(reportRows);
            });

            return deferred.promise;
        };

        function toDataURL(url) {

            var deferred = $q.defer();

            var xhr = new XMLHttpRequest();

            xhr.onload = function () {
                if (xhr.status == 404) {
                    deferred.reject();
                } else {

                    var reader = new FileReader();

                    reader.onloadend = function () {
                        deferred.resolve(reader.result);
                    };

                    reader.readAsDataURL(xhr.response);
                }
            };

            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();

            return deferred.promise;
        }

        function generateIconUrl(_ref) {
            var _ref2 = _slicedToArray(_ref, 2),
                folder = _ref2[0],
                icon = _ref2[1];

            return window.GanttMap.icons.globalIcon + '/' + folder + '/' + icon + '.svg';
        }

        function GetIconForMap(hex, folder, icon, iconKey) {

            var deferred = $q.defer();

            try {

                if (!mapData.dynamicIcons[iconKey]) {

                    var iconUrl = generateIconUrl([folder, icon]);

                    toDataURL(iconUrl).then(function (res) {

                        var svg64 = res.replace(/^.+base64,/, "").replace(/\"?\)$/, "");
                        var xml = window.atob(svg64);
                        var color = xml.replace(/fill="#[A-Za-z0-9]+"/, 'fill="' + hex + '"');
                        var color64 = window.btoa(color);
                        mapData.dynamicIcons[iconKey] = "data:image/svg+xml;charset=utf-8;base64," + color64;
                        deferred.resolve(mapData.dynamicIcons[iconKey]);
                    }).catch(function (res) {

                        var iconUrl = generateIconUrl([folder, 'report']);

                        toDataURL(iconUrl).then(function (res) {
                            var svg64 = res.replace(/^.+base64,/, "").replace(/\"?\)$/, "");
                            var xml = window.atob(svg64);
                            var color = xml.replace(/fill="#[A-Za-z0-9]+"/, 'fill="' + hex + '"');
                            var color64 = window.btoa(color);
                            mapData.dynamicIcons[iconKey] = "data:image/svg+xml;charset=utf-8;base64," + color64;
                            deferred.resolve(mapData.dynamicIcons[iconKey]);
                        });
                    });
                } else {
                    deferred.resolve(mapData.dynamicIcons[iconKey]);
                }
            } catch (e) {
                deferred.reject(e.message);
            }

            return deferred.promise;
        }

        var sendMapAPIRequest = function sendMapAPIRequest(remoteActionName, filter) {
            for (var _len = arguments.length, params = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                params[_key - 2] = arguments[_key];
            }

            var remoteActionsWithFalseBuffer = {};
            var getReportsWithGeolocationCols = RemoteActions.getReportsWithGeolocationCols.split('.');
            remoteActionsWithFalseBuffer[getReportsWithGeolocationCols[getReportsWithGeolocationCols.length - 1]] = true;

            var buffer = !(remoteActionName in remoteActionsWithFalseBuffer);

            return new Promise(function (resolve, reject) {
                var _ref3;

                var remoteActionsParams = (_ref3 = [RemoteActions[remoteActionName]]).concat.apply(_ref3, params).concat(function (data, ev) {
                    ev.status ? resolve(data) : reject(ev);
                }).concat({ buffer: buffer, escape: false });

                var remoteActionsParamsNew = remoteActionsParams;

                if (filter) {
                    remoteActionsParamsNew = remoteActionsParams.filter(function (v) {
                        if (!v) {
                            return false;
                        } else {
                            return true;
                        }
                    });
                } else {
                    remoteActionsParamsNew = remoteActionsParams.map(function (v) {
                        if (v === undefined) {
                            return null;
                        } else {
                            return v;
                        }
                    });
                }

                Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, remoteActionsParamsNew);
            });
        };

        var showServiceOnMap = function showServiceOnMap(serviceId, floatingMapOn, workingState) {

            mapData.showServiceOnMap = true;
            mapData.showServiceOnMapId = serviceId;

            if (workingState !== 'map' && !floatingMapOn) {
                $rootScope.$broadcast('changeWorkingState', 'map');
            }

            if (mapData.reactMapInitialize) {

                setTimeout(function () {

                    var showServiceOnMapMsg = {
                        serviceId: mapData.showServiceOnMapId,
                        type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.SHOW_SERVICE_ON_MAP
                    };

                    sendMessageToIframe(showServiceOnMapMsg);

                    mapData.showServiceOnMap = false;
                    mapData.showServiceOnMapId = undefined;
                }, 150);
            } else {
                initializeGanttMap(false);
            }
        };

        var runCustomAction = function runCustomAction(servicesIds, action) {

            if (action.visualforce) {
                var startDateStr = scheduler._min_date.getMonth() + 1 + "-" + scheduler._min_date.getDate() + "-" + scheduler._min_date.getFullYear(),
                    endDateStr = scheduler._max_date.getMonth() + 1 + "-" + scheduler._max_date.getDate() + "-" + scheduler._max_date.getFullYear();

                if (servicesIds.length === 1) {
                    GeneralLightbox.open(action.name, action.visualforce + '?id=' + servicesIds[0] + '&start=' + startDateStr + '&end=' + endDateStr);
                } else {
                    GeneralLightbox.open(action.name, action.visualforce + '?services=' + servicesIds.join(',') + '&start=' + startDateStr + '&end=' + endDateStr);
                }
            } else {

                sfdcService.callRemoteAction(RemoteActions.runCustomServiceAction, action.className, servicesIds, scheduler._min_date, scheduler._max_date).then(function (res) {
                    DeltaService.updateGantt();
                    if (res) {
                        utils.addNotification(action.name, res, null, null);
                    }
                }).catch(function (ev) {
                    return utils.addNotification(action.name, ev.message, null, null);
                });
            }
        };

        var viewDetails = function viewDetails(id, mode) {
            switch (mode) {
                case 'service':
                    // set recently used
                    servicesService.recentlyUsed[id] = true;
                    ServiceAppointmentLightboxService.open(id);
                    break;
                case 'liveposition':
                    ResourceLightboxService.open(id);
                    break;
                case 'resource':
                    ResourceLightboxService.open(id);
                    break;
                case 'report':
                    utils.openSObjectLink(id);
                    break;
                default:
                    utils.openSObjectLink(id);
                    break;
            }
        };

        var flagSA = function flagSA(serviceAppointmentsId) {
            serviceAppointmentsId.map(function (id) {
                servicesService.flagged[id] = true;
                scheduler.updateEvent(id);
            });
        };

        var initializeGanttMap = function initializeGanttMap(forceInitialization) {
            //W-14733334 initMapFinished was added in order to prevent multiple calls in case init message from Map delayed
            if (!forceInitialization && (initMapFinished || mapData.reactMapInitialize)) {
                return;
            }

            var territoriesForReact = getReactTerritories();
            var livePositionsForReact = getReactLivePositions();

            var MapDataInitialization = {
                ganttMapDefinitions: window.GanttMap,
                livePositions: livePositionsForReact,
                territories: territoriesForReact,
                type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.FSL_MAP_INITIALIZATION,
                ganttDate: scheduler._min_date
            };

            sendMessageToIframe(MapDataInitialization);
            initMapFinished = true;
        };

        var updateGanttMapFilter = function updateGanttMapFilter() {

            if (mapData.reactMapInitialize) {

                var filteredServices = getReactServicesFilter();

                var MapDataUpdate = {
                    filteredServices: filteredServices,
                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.FSL_MAP_UPDATE_FILTER
                };

                sendMessageToIframe(MapDataUpdate);
            } else {
                setTimeout(function () {
                    initializeGanttMap(false);
                }, 5000);
            }
        };

        var updateGanttMapView = function updateGanttMapView() {

            if (mapData.reactMapInitialize) {

                var relevantStmsForReact = getReactResources();

                var ganttViewUpdate = {
                    relevantStms: relevantStmsForReact,
                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.FSL_MAP_UPDATE_VIEW
                };

                sendMessageToIframe(ganttViewUpdate);
            } else {
                setTimeout(function () {
                    updateGanttMapView();
                }, 5000);
            }
        };

        var updateGanttMapServices = function updateGanttMapServices(servicesToUpdate, deletedServicesIds) {
            var clearServices = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;


            if (mapData.reactMapInitialize) {

                if (_.isEmpty(servicesToUpdate) && _.isEmpty(deletedServicesIds)) {
                    return;
                }

                var servicesForReact = getReactServices(servicesToUpdate);

                var servicesUpdate = {
                    clearServices: false,
                    services: servicesForReact,
                    deletedServicesIds: deletedServicesIds,
                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.FSL_MAP_SERVICES_UPDATE
                };

                sendMessageToIframe(servicesUpdate);
            } else {
                setTimeout(function () {
                    updateGanttMapServices(servicesToUpdate, deletedServicesIds, clearServices);
                }, 5000);
            }
        };

        var updateGanttMapLivePositions = function updateGanttMapLivePositions() {
            if (mapData.reactMapInitialize) {

                var livePositionsForReact = getReactLivePositions();

                var MapDataInitialization = {
                    livePositions: livePositionsForReact,
                    type: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES.FSL_MAP_LIVE_POSITION
                };

                sendMessageToIframe(MapDataInitialization);
            } else {
                setTimeout(function () {
                    updateGanttMapLivePositions(servicesToUpdate, deletedServicesIds, clearServices);
                }, 5000);
            }
        };

        RegisterService.register('positions', function (updatedPositions) {
            updateGanttMapLivePositions();
        });

        var updateGanttMapFilterDebounce = _.debounce(updateGanttMapFilter, 300, { 'maxWait': 1000 });
        var updateGanttMapViewDebounce = _.debounce(updateGanttMapView, 300, { 'maxWait': 1000 });

        /// PREPARE DATA FOR MAP FUNCTIONS ///
        var getReactServicesFilter = function getReactServicesFilter() {

            var filteredServices = {};

            for (var i = 0; i < servicesService.filteredServices.servicesArray.length; i++) {
                filteredServices[servicesService.filteredServices.servicesArray[i].id] = true;
            }

            return filteredServices;
        };

        var getReactServices = function getReactServices(services) {

            var serviceMarkers = {};

            if (Array.isArray(services)) {
                for (var i = 0; i < services.length; i++) {
                    serviceMarkers[services[i].id] = parseSingleService(services[i]);
                }
            } else {
                for (var id in services) {
                    serviceMarkers[services[id].id] = parseSingleService(services[id]);
                }
            }

            return serviceMarkers;
        };

        var parseSingleService = function parseSingleService(service) {

            var serviceWindowData = { fields: {} };

            serviceWindowData['latitude'] = service.latitude;
            serviceWindowData['longitude'] = service.longitude;
            serviceWindowData['pinned'] = service.pinned;
            serviceWindowData['statusCategory'] = service.statusCategory;
            serviceWindowData['resourceId'] = service.resourceId;
            serviceWindowData['id'] = service.id;
            serviceWindowData['Status'] = service.Status;
            serviceWindowData['AppointmentNumber'] = service.AppointmentNumber;
            serviceWindowData['dragData'] = !service.isScheduled() ? utils.getRelevantDataForDraggingService(service) : null;

            // if we do NOT ignore CPs and user has no D&D cp, disable dragging
            if (!window.__gantt.ignoreReadonlyGantt226 && !window.customPermissions.Enable_Drag_And_Drop) {
                serviceWindowData['dragData'] = null;
            }

            serviceWindowData['icons'] = service.icons;

            if (window.paletteViewActive && service.ganttPaletteColor) {
                serviceWindowData['color'] = service.ganttPaletteColor.color;
            } else if (service.ganttColor) {
                serviceWindowData['color'] = service.ganttColor;
            } else {
                serviceWindowData['color'] = utils.getColorHexByCategory(service.statusCategory);
            }

            for (var idx = 0; idx < mapData.serviceFields.length; idx++) {

                var currentFieldValue = undefined;
                var currentFieldValueAPIName = undefined;
                var currentFieldValueFullAPIName = undefined;

                if (service.fields[mapData.serviceFields[idx].APIName] !== undefined) {
                    currentFieldValueAPIName = service.fields[mapData.serviceFields[idx].APIName];
                    currentFieldValueFullAPIName = service.fields[mapData.serviceFields[idx].FullAPIName];

                    if (mapData.serviceFields[idx].APIName !== mapData.serviceFields[idx].FullAPIName) {
                        currentFieldValue = { Value: currentFieldValueAPIName, Id: currentFieldValueFullAPIName };
                    } else {
                        currentFieldValue = { Value: currentFieldValueAPIName };
                    }
                }

                serviceWindowData.fields[mapData.serviceFields[idx].APIName] = currentFieldValue;
            }

            return serviceWindowData;
        };

        var getReactResources = function getReactResources() {

            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date;

            var resources = {};

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesByPrimariesAndRelocations();

            for (var resourceId in resourcesToTimePhasedLocations) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];

                    if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                        resources[timePhasedLoc.id] = timePhasedLoc;
                    }
                }
            }

            return resources;
        };

        var getReactLivePositions = function getReactLivePositions() {

            var start = scheduler.getState().min_date,
                finish = scheduler.getState().max_date;

            var resourcesToTimePhasedLocations = TimePhasedDataService.resourcesAndTerritories();

            var lastPositions = {};

            if (!(window.customPermissions.Hide_Live_Locations_Gantt_Map_Layer || isLastKnownFieldsNotAllowed)) {
                lastPositions = LastKnownPositionService.lastKnownPositions();
            }

            var filteredPositions = {};

            for (var resourceId in lastPositions) {
                var timePhasedLocations = resourcesToTimePhasedLocations[resourceId];

                for (var timePhasedLocId in timePhasedLocations) {
                    var timePhasedLoc = timePhasedLocations[timePhasedLocId];

                    if (isIntersect(start, finish, timePhasedLoc.effectiveStartDate, timePhasedLoc.effectiveEndDate)) {
                        filteredPositions[lastPositions[resourceId].id] = { latitude: lastPositions[resourceId].latitude, longitude: lastPositions[resourceId].longitude, resource: timePhasedLoc.serviceResource__r, lastKnowLocation: lastPositions[resourceId] };
                    }
                }
            }

            return filteredPositions;
        };

        var getReactTerritories = function getReactTerritories() {

            var filteredTerritories = userSettingsManager.GetUserSettingsProperty('locations'); //array of ids
            var territories = ResourcesAndTerritoriesService.territories(); //obj

            var filtered = Object.keys(territories).filter(function (id) {
                return filteredTerritories.includes(id);
            }).reduce(function (obj, id) {
                obj[id] = territories[id];
                return obj;
            }, {});

            return filtered;
        };

        return {
            showServiceOnMap: showServiceOnMap,
            initializeGanttMap: initializeGanttMap,
            updateGanttMapServices: updateGanttMapServices,
            updateGanttMapFilter: updateGanttMapFilterDebounce,
            updateGanttMapView: updateGanttMapViewDebounce,
            IFRAME_SEND_MESSAGES_TYPES: MAP_CONSTANTS.IFRAME_SEND_MESSAGES_TYPES,
            reactDomain: mapData.reactDomain
        };
    }
})();