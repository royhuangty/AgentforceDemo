'use strict';

(function () {

    angular.module('serviceExpert').filter('pagination', ['servicesService', function (servicesService) {
        return function (servicesArr, pageNum, servicesPerPage) {

            servicesService.filter.totalServices = servicesArr.length;

            if (servicesService.filter.currentPage == null || parseInt(servicesService.filter.currentPage) > servicesService.filter.totalPages) {
                servicesService.filter.currentPage = '1';
                pageNum = 1;
            }

            var result = [];
            var from = (pageNum - 1) * servicesPerPage;
            var upperLimit = (pageNum - 1) * servicesPerPage + servicesPerPage;

            if (servicesArr.length <= servicesPerPage) result = servicesArr;else result = servicesArr.slice(from, upperLimit);

            if (servicesArr.length == servicesService.filter.servicesPerPage) servicesService.filter.totalPages = 1;else {
                servicesService.filter.totalPages = Math.floor(servicesArr.length / servicesService.filter.servicesPerPage);

                if (servicesArr.length % servicesService.filter.servicesPerPage > 0) servicesService.filter.totalPages++;
            }

            servicesService.filter.firstVisibleService = from + 1;
            servicesService.filter.lastVisibleService = upperLimit;
            if (servicesArr.length <= servicesPerPage) servicesService.filter.lastVisibleService = servicesArr.length;else if (upperLimit > servicesArr.length) servicesService.filter.lastVisibleService = servicesArr.length;

            return result;
        };
    }]);
})();