'use strict';

/*

    Wrapping Google Places (map stuff)

*/

(function () {

    angular.module('serviceExpert').directive('googlePlaces', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                myMap: '=',
                searchMarker: '='
            },
            template: '<input id="google_places_ac" name="google_places_ac" type="text" class="input-block-level"/>',
            link: function link($scope, elm, attrs) {
                var autocomplete = new google.maps.places.Autocomplete($('#google_places_ac')[0], {});

                google.maps.event.addListener(autocomplete, 'place_changed', function () {

                    var place = autocomplete.getPlace();

                    if (!$scope.searchMarker) {
                        $scope.searchMarker = new google.maps.Marker({
                            map: $scope.myMap,
                            position: place.geometry.location
                        });
                    } else {
                        $scope.searchMarker.setPosition(place.geometry.location);
                    }

                    if (place.geometry.viewport) {
                        $scope.myMap.fitBounds(place.geometry.viewport);
                    } else {
                        $scope.myMap.setCenter(place.geometry.location);
                        $scope.myMap.setZoom(17); // Why 17? Because it looks good.
                    }
                });
            }
        };
    });
})();