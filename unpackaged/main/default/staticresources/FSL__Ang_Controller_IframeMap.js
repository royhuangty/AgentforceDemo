'use strict';

(function () {

    angular.module('serviceExpert').controller('ctrlIframeMap', ['$scope', 'sfdcService', '$rootScope', 'MapService', 'servicesService', 'TimePhasedDataService', function ($scope, sfdcService, $rootScope, MapService, servicesService, TimePhasedDataService) {

        $scope.filter = servicesService.filter;

        $scope.$on('showServiceOnMap', function (event, serviceId) {
            MapService.showServiceOnMap(serviceId, $scope.floatingMapOn, $scope.workingState);
        });

        $scope.$on('gotNewResources', function (e, locationsArr) {
            MapService.initializeGanttMap(true);
        });

        $scope.$watch('filter', function (newVal, oldVal) {
            if ($scope.workingState === 'map' || $scope.floatingMapOn) {
                MapService.updateGanttMapFilter();
            }
        }, true);

        $scope.$watch('floatingMapOn', function (newValue) {
            if (newValue) {
                MapService.updateGanttMapFilter();
            }
        });

        //event for toggle markers.
        $scope.$watch('workingState', function (newValue) {
            if (newValue === 'map' || $scope.floatingMapOn) {
                MapService.updateGanttMapFilter();
            }
        });

        $rootScope.$on('paletteUpdated', function () {
            MapService.updateGanttMapServices(TimePhasedDataService.serviceAppointments(), {});
        });

        $rootScope.$on('updateTimePhaseData', function (event, updatedServices) {
            MapService.updateGanttMapServices(updatedServices, {});
        });

        $rootScope.$on('deleteTimePhaseData', function (event, deletedServices) {
            MapService.updateGanttMapServices({}, deletedServices);
        });

        $rootScope.$on('gotNewTimePhasedObjects', function (ev, timePhasedObjects) {
            MapService.initializeGanttMap(false);
            MapService.updateGanttMapServices(timePhasedObjects.serviceAppointments, [], true);
            MapService.updateGanttMapView();
        });

        scheduler.attachEvent('onViewChange', function () {
            if ($scope.workingState === 'map' || $scope.floatingMapOn) {
                MapService.updateGanttMapView();
                //updateServicesThatAreAlreadyOnFilterList
                MapService.updateGanttMapServices(servicesService.filteredServices.servicesArray, []);
            }
        });
    }]);
})();