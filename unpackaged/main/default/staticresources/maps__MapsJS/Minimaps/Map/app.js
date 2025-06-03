require.config({
    paths: {
        'jquery'         : '../js/lib/jquery-3.1.1.slim.min',
        'leaflet'        : '../js/lib/leaflet',
        'cluster'        : '../js/lib/leaflet.markercluster',
        'marker-builder' : '../js/utils/marker-builder',
        'geo-utils'      : '../js/utils/geo-utils'
    },
    shim: {
        'leaflet': {
            exports: 'L'
        },
        'cluster': {
            deps: [ 'leaflet' ]
        }
    },
    config: {
        text: {
            useXhr: function(url, protocol, hostname, port) {
                return true;
            }
        }
    }
});

require([
    'jquery',
    'minimap',
    'config',
    'leaflet',
    'cluster'
], function($, MiniMap, config, L) {
    MiniMap.init(config);
});