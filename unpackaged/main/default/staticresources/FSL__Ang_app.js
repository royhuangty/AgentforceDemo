'use strict';

(function () {

    // creating the angular app hi
    var app = angular.module('serviceExpert', ['uiGmapgoogle-maps', 'angularMoment', 'ui.bootstrap', 'chart.js', 'MstResolver']);

    app.run(['amMoment', function (amMoment) {
        var newLocale = userLocale;
        if (userLocale.indexOf('iw') != -1) {
            newLocale = userLocale.replace("iw", "he");
        }
        amMoment.changeLocale(newLocale);
    }]);

    app.config(['$sceDelegateProvider', '$compileProvider', 'MstResolverProvider', function ($sceDelegateProvider, $compileProvider, MstResolverProvider) {

        var updateViewIntervalForConsole = null,
            debouncedUpdateView = _.debounce(window.scheduler.updateView, 100).bind(window.scheduler);

        window.updateViewDebounced = function () {

            // nothing is running + tab hidden
            if (!updateViewIntervalForConsole && document.body.clientWidth === 0) {

                updateViewIntervalForConsole = setInterval(window.updateViewDebounced, 1000);
                return;
            }

            // visible, if running cancel
            if (document.body.clientWidth !== 0) {

                if (updateViewIntervalForConsole) {
                    clearInterval(updateViewIntervalForConsole);
                    updateViewIntervalForConsole = null;
                }

                debouncedUpdateView();
            }
        };

        // production
        if (!debugMode) {
            $compileProvider.debugInfoEnabled(false);
        }

        // set MST configs
        MstResolverProvider.setConfig({
            fslOperationRemoteAction: RemoteActions.getFslOperation,
            getAsyncApexJobRemoteAction: RemoteActions.getAsyncApexJob,
            apiVersion: '41.0',
            fieldNames: fieldNames.FslOperation,
            autoConnect: false
        });

        var trustedUrls = ['self', 'https://**.force.com'];

        if (window.orgUrl) {
            trustedUrls.push(window.orgUrl);
        }

        // Allow same origin resource loads.
        $sceDelegateProvider.resourceUrlWhitelist(trustedUrls);
    }]);
})();