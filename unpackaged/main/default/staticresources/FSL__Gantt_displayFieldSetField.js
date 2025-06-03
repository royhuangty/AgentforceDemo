'use strict';

(function () {

    angular.module('serviceExpert').filter('displayFieldSetField', ['utils', '$filter', function (utils, $filter) {
        return function (service, field) {

            if (!service || !field) return;

            var res = service[field.APIName];

            if (res) {
                if (field.APIName === 'Status') {
                    res = utils.statusTranslations[service.status] || service.status;
                } else switch (field.Type) {
                    case utils.fieldsTypes.DateTime:
                        res = $filter('amDateFormat')(res, 'l LT');
                        break;
                    case utils.fieldsTypes.Date:
                        res = $filter('amDateFormat')(res, 'L');
                        break;
                    case utils.fieldsTypes.Currency:
                        res = $filter('currency')(res, defaultCurrency);
                        break;
                    case utils.fieldsTypes.Picklist:
                        res = service.fields[field.TranslatedToLabel] ? service.fields[field.TranslatedToLabel] : res;
                        break;

                    // W-14497725 - removed string transformations - no need and can cause performance issues
                }
            }

            if (res == null) res = undefined;

            return res;
        };
    }]).filter('displayReportField', ['utils', '$filter', function (utils, $filter) {
        return function (reportField) {

            if (!reportField) {
                return;
            }

            var res = reportField.Label;

            switch (reportField.Type) {
                case 'DATETIME_DATA':
                    res = $filter('amDateFormat')(res, 'l LT');
                    break;
                case 'DATE_DATA':
                    res = $filter('amDateFormat')(res, 'L');
                    break;
            }

            if (res == null) res = undefined;

            return res;
        };
    }]);
})();