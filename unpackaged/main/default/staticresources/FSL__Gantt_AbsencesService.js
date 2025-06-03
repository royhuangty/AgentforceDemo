'use strict';

(function () {

    AbsencesService.$inject = ['$q', 'TimePhasedDataService', 'sfdcService', 'DeltaService', 'servicesService', 'utils'];

    angular.module('serviceExpert').factory('AbsencesService', AbsencesService);

    function AbsencesService($q, TimePhasedDataService, sfdcService, DeltaService, servicesService, utils) {

        var nonAvailabilityTypes = {};

        // saving changes to absence and returns the updated absence or the original one if there was an error
        function saveChangesToAbsence(originalAbsence, changedAbsence, policyUsed) {

            var deffered = $q.defer(),
                start = new Date(changedAbsence.start_date.getTime() + changedAbsence.travelTo * 1000),
                end = new Date(changedAbsence.end_date.getTime() - changedAbsence.travelFrom * 1000);

            if (useLocationTimezone) {
                //get territory offset by SRST
                var resourceTerritoryOffset = TimePhasedDataService.getIntersectingSrstOffset(changedAbsence, changedAbsence.getGanttResource());

                var userStartOffset = utils.getUserOffset(start);
                var userEndOffset = utils.getUserOffset(end);

                //set times accordingly
                start.setMinutes(start.getMinutes() + userStartOffset - resourceTerritoryOffset);
                end.setMinutes(end.getMinutes() + userEndOffset - resourceTerritoryOffset);
            }

            // snapToId, snapToType, snapDirection

            sfdcService.saveChangesToAbsence(changedAbsence.id, changedAbsence.getGanttResource(), policyUsed, start, end, null, //we do not want to set the label instead of the API name of the Type field picklist value
            changedAbsence.ganttLabel, changedAbsence.snapToId || null, changedAbsence.snapToType || null, changedAbsence.snapDirection || null).then(function (updatedObjects) {

                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.handleDeltaResponse(updatedObjects, shouldCheckRules);

                if (updatedObjects.error) {
                    deffered.reject([updatedObjects, originalAbsence]);
                } else {
                    deffered.resolve();
                }
            }).catch(function (err) {
                deffered.reject([err, originalAbsence]);
            });

            return deffered.promise;
        }

        function saveNewAbsence(draggedAbsence, policyId) {

            var deffered = $q.defer();

            if (useLocationTimezone) {

                //get territory offset by SRST
                var resourceTerritoryOffset = TimePhasedDataService.getIntersectingSrstOffset(draggedAbsence, draggedAbsence.resource),
                    userStartOffset = utils.getUserOffset(draggedAbsence.start_date),
                    userEndOffset = utils.getUserOffset(draggedAbsence.end_date);

                //set times accordingly
                draggedAbsence.start_date.setMinutes(draggedAbsence.start_date.getMinutes() + userStartOffset - resourceTerritoryOffset);
                draggedAbsence.end_date.setMinutes(draggedAbsence.end_date.getMinutes() + userEndOffset - resourceTerritoryOffset);
            }

            draggedAbsence.type = 'na';
            draggedAbsence.isDummy = true;
            var dummyEventId = scheduler.addEvent(draggedAbsence);

            sfdcService.saveChangesToAbsence(null, draggedAbsence.resource, policyId, draggedAbsence.start_date, draggedAbsence.end_date, draggedAbsence.absenceType, draggedAbsence.ganttLabel, draggedAbsence.snapToId || null, draggedAbsence.snapToType || null, draggedAbsence.snapDirection || null).then(function (updatedObjects) {

                scheduler.deleteEvent(dummyEventId);
                var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                DeltaService.handleDeltaResponse(updatedObjects, shouldCheckRules);

                if (updatedObjects.error) {
                    deffered.reject(updatedObjects);
                } else {
                    deffered.resolve();
                }
            }).catch(function (err) {
                scheduler.deleteEvent(dummyEventId);
                deffered.reject(err);
            });

            return deffered.promise;
        }

        function deleteAbsence(id) {

            var deffered = $q.defer();

            sfdcService.callRemoteAction(RemoteActions.deleteResourceAbsence, id).then(function (isDeleted) {

                if (isDeleted) {

                    // check rules if not "on demand" mode
                    var shouldCheckRules = window.__gantt.checkRulesMode !== 'On Demand';
                    DeltaService.getDelta(shouldCheckRules);
                } else {
                    utils.addNotification(customLabels.Action_Could_Not_Be_Performed, customLabels.Failed_To_Delete_Break, null, null);
                }
            }).catch(function (err) {
                deffered.reject(err);
            });

            return deffered.promise;
        }

        // // get NA types
        function getEmployeeAbsenceTypes() {

            var deffered = $q.defer();

            try {

                sforce.connection.sessionId = sessionId;
                var objName = 'ResourceAbsence';
                var recordTypeName = 'Non_Availability';
                var result = sforce.connection.describeLayout(objName);
                var employeesAbsenceMap = {};

                result.recordTypeMappings.forEach(function (recordType) {

                    if (recordType.developerName === 'Non_Availability') {

                        recordType.picklistsForRecordType.forEach(function (picklist) {

                            if (picklist.picklistName === 'Type') {

                                var naPicklistArray = picklist.picklistValues;

                                // in case we have only 1 picklist value, it's not returned as an array
                                if (!Array.isArray(naPicklistArray)) {
                                    naPicklistArray = [naPicklistArray];
                                }

                                naPicklistArray.forEach(function (picklistValue) {
                                    employeesAbsenceMap[picklistValue['value']] = picklistValue['label'];
                                });
                            }
                        });
                    }
                });

                nonAvailabilityTypes = employeesAbsenceMap;

                deffered.resolve(nonAvailabilityTypes);
            } catch (err) {

                // error using the API call, load with remoting
                sfdcService.callRemoteAction(RemoteActions.getEmployeeAbsenceTypes).then(function (eaTypes) {

                    if (!eaTypes) {
                        return;
                    }

                    nonAvailabilityTypes = eaTypes;

                    deffered.resolve(nonAvailabilityTypes);
                }).catch(function (err) {
                    deffered.reject(err);
                });
            }

            return deffered.promise;
        }

        // This will be our factory
        return {
            saveChangesToAbsence: saveChangesToAbsence,
            saveNewAbsence: saveNewAbsence,
            deleteAbsence: deleteAbsence,
            //nonAvailabilityTypes
            getEmployeeAbsenceTypes: getEmployeeAbsenceTypes
        };
    }
})();