'use strict';

(function () {

    RegisterService.$inject = ['DeltaService', 'StreamingAPIService', 'PushServices'];

    angular.module('serviceExpert').factory('RegisterService', RegisterService);

    function RegisterService(DeltaService, StreamingAPIService, PushServices) {

        // register for updates
        function register(type, callback) {
            DeltaService.register(type, callback);
            StreamingAPIService.register(type, callback);
            if (type === 'positions' || type === 'optimizationRequests' || type === 'rules') {
                PushServices.register(type, callback);
            }
        }

        function unRegister(type, callback) {
            DeltaService.unRegister(type, callback);
            StreamingAPIService.unRegister(type, callback);
            if (type === 'positions' || type === 'optimizationRequests' || type === 'rules') {
                PushServices.unRegister(type, callback);
            }
        }

        return {
            register: register,
            unRegister: unRegister
        };
    }
})();