'use strict';

/*

 LoadServiceListService
 Service to aggregate all service list loading functions

 */

(function () {

    LastKnownPositionService.$inject = ['$q', 'sfdcService', 'utils', 'ResourcesAndTerritoriesService'];

    angular.module('serviceExpert').factory('LastKnownPositionService', LastKnownPositionService);

    function LastKnownPositionService($q, sfdcService, utils, ResourcesAndTerritoriesService) {

        var _lastKnownPositions = {};

        function updatePositions(positions) {
            var updated = {};
            var isUpdated = false;

            for (var resourceId in positions) {
                var lastPos = new LastKnownPosition(positions[resourceId]);
                var crewResource = void 0;

                if (positions[resourceId].ServiceCrewMembers) {
                    if (positions[resourceId].ServiceCrewMembers[0].IsLeader) {
                        crewResource = ResourcesAndTerritoriesService.getCrewToResources()[positions[resourceId].ServiceCrewMembers[0].ServiceCrewId];
                    }
                }

                if (!_lastKnownPositions[lastPos.id] || _lastKnownPositions[lastPos.id].lastModifiedDate < lastPos.lastModifiedDate) {
                    updated[resourceId] = lastPos;
                    _lastKnownPositions[resourceId] = lastPos;
                    isUpdated = true;

                    if (crewResource) {
                        updated[crewResource.Id] = lastPos;
                        _lastKnownPositions[crewResource.Id] = lastPos;
                    }
                }
            }

            return {
                dic: updated,
                isUpdated: isUpdated
            };
        }

        function getLastKnownPositions() {
            return sfdcService.getLivePositions().then(function (positions) {

                for (var resourceId in positions) {
                    _lastKnownPositions[resourceId] = new LastKnownPosition(positions[resourceId]);
                }

                return _lastKnownPositions;
            });
        }

        return {
            getLastKnownPositions: getLastKnownPositions,
            updatePositions: updatePositions,
            lastKnownPositions: function lastKnownPositions() {
                return _lastKnownPositions;
            }
        };
    }
})();