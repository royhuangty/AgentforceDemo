'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*

 FieldSetFieldsService

 */

(function () {

    FieldSetFieldsService.$inject = ['$q', 'sfdcService'];

    angular.module('serviceExpert').factory('FieldSetFieldsService', FieldSetFieldsService);

    function FieldSetFieldsService($q, sfdcService) {

        var deferred = $q.defer(),
            fieldsSetFieldsObject = {},
            _serviceAppointmentFields = $q.defer();

        $q.all([sfdcService.callRemoteAction(RemoteActions.getServiceListFields), sfdcService.callRemoteAction(RemoteActions.getServiceMiniFormFields), sfdcService.callRemoteAction(RemoteActions.getServiceMapInfoWindowFields), sfdcService.callRemoteAction(RemoteActions.getServiceGanttTooltipFields), sfdcService.callRemoteAction(RemoteActions.getServiceCapacityColumns), sfdcService.callRemoteAction(RemoteActions.getGanttFilterFields), sfdcService.callRemoteAction(RemoteActions.getServicePreviewFields)]).then(function (fieldsListArray) {

            fieldsSetFieldsObject = {
                ListColumns: fieldsListArray[0],
                ListExpanded: fieldsListArray[1],
                MapInfo: fieldsListArray[2],
                GanttToolTip: fieldsListArray[3],
                CapacityServiceColumns: fieldsListArray[4],
                ganttFilter: fieldsListArray[5],
                servicePreview: fieldsListArray[6]
            };

            if (sfdcService.isOptimizationViewer()) {
                if (_typeof(GanttServiceOptiViewer.prototype.allFieldSets) !== 'object') {
                    GanttServiceOptiViewer.prototype.allFieldSets = fieldsSetFieldsObject;

                    var allFieldSetsObject = {};

                    // only insert each field once!!
                    for (var key in GanttServiceOptiViewer.prototype.allFieldSets) {
                        var fieldset = GanttServiceOptiViewer.prototype.allFieldSets[key];
                        for (var i = 0; i < fieldset.length; i++) {
                            allFieldSetsObject[fieldset[i].APIName] = fieldset[i];
                        }
                    }

                    GanttServiceOptiViewer.prototype.allFieldSetsSet = allFieldSetsObject;
                }
            } else {
                // if we inject this to another controller, don't overwrite prototype
                if (_typeof(GanttService.prototype.allFieldSets) !== 'object') {
                    GanttService.prototype.allFieldSets = fieldsSetFieldsObject;

                    var _allFieldSetsObject = {};

                    // only insert each field once!!
                    for (var _key in GanttService.prototype.allFieldSets) {
                        var _fieldset = GanttService.prototype.allFieldSets[_key];
                        for (var i = 0; i < _fieldset.length; i++) {
                            _allFieldSetsObject[_fieldset[i].APIName] = _fieldset[i];
                        }
                    }

                    GanttService.prototype.allFieldSetsSet = _allFieldSetsObject;
                    _serviceAppointmentFields.resolve(Object.keys(_allFieldSetsObject));
                }
            }

            deferred.resolve(fieldsSetFieldsObject);
        }).catch(function (ex) {
            deferred.reject();
            _serviceAppointmentFields.reject();
            console.warn('FieldSetFieldsService: unable to get service appointment field sets');
        });

        // This will be our resource factory
        return {
            fieldsSetFields: function fieldsSetFields() {
                return deferred.promise;
            },
            serviceAppointmentFields: function serviceAppointmentFields() {
                return _serviceAppointmentFields.promise;
            }
        };
    }
})();