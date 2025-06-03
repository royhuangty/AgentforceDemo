define([
    'layer-group',
    'marker-builder',
    'geo-utils'
], function(LayerGroup, MarkerBuilder, GeoUtils) {

    var module = {},
        _map,
        _mmid,
        _options,
        _layerGroups = {};

    var DEFAULTS = {
        center: {
            lat: 37.0902,
            lng: -95.7129
        },
        zoom: 4
    };

    var init = function(hasPageErrors) {
        _options = _options || DEFAULTS;

        if (hasPageErrors) $.extend(_options, DEFAULTS);

        bindEventHandlers();
        initMap();

        if (!_options.layers) return;

        decorateLayersWithData();
        filterDataPointsWithHaversine();

        _options.layers.forEach(function(layer) {
            _layerGroups[layer.id] = {
                ref: LayerGroup.build(_map, layer),
                visible: true
            };

            addLayerListItemHTML(layer);
        });

        _map.on('popupopen', adjustPopupHTML);
    };

    var filterDataPointsWithHaversine = function() {
        var centerPoint = _options.center;

        _options.layers.forEach(function(layer) {
            if (layer.type !== 'nearby') return;

            var radiusInMeters = GeoUtils.getRadiusInMeters(layer.radius, layer.unit),
                filteredRecords = [];

            for (var i = 0; i < layer.records.length; i++) {
                var boundingPoint = {
                    lat: layer.records[i][layer.marker.verifiedLatField || layer.marker.latField],
                    lng: layer.records[i][layer.marker.verifiedLngField || layer.marker.lngField]
                };

                var haversineDistance = GeoUtils.getHaversineDistance(centerPoint, boundingPoint);
                if (haversineDistance > radiusInMeters) continue;

                filteredRecords.push(layer.records[i]);
            }

            layer.records = filteredRecords;
        });
    };

    var bindEventHandlers = function() {
        $('img.mm-close-error').click(closeError);
        $('button.mm-toggle-button').click(toggleMiniMapBody);
    };

    var initMap = function() {
        try {
            _map = L.map(_mmid, {
                center: [
                    _options.center.verifiedLat || _options.center.lat,
                    _options.center.verifiedLng || _options.center.lng
                ],
                zoom: _options.zoom,
                scrollWheelZoom: false
            });
        } catch (ex) {
            console.log('error loading map');
        }

        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '',
            maxZoom: 18,
            id: 'newest',
            noWrap: 'true',
            unloadInvisibleTiles: 'false',
            updateWhenIdle: 'false',
            reuseTiles: 'true',
            updateWhenZooming: 'false',
            keepBuffer: '10'
        }).addTo(_map);
    };

    var addLayerListItemHTML = function(layer) {
        var builder = new MarkerBuilder({
            type: layer.marker.type,
            color: layer.marker.color
        });
        var $listItem = $('#templates > .ma-layer-list-item').clone();
        var checkImgUrlToAddToHTML = function(imgURL, orgId) {
            if(imgURL.substring(0, 3) === '015') {
                return "/servlet/servlet.ImageServer?id=" + imgURL + "&oid=" + orgId;
            }
            return "/sfc/servlet.shepherd/version/download/" + imgURL;
        }
        $listItem.find('.ma-layer-list-text').html(layer.label);
        if(layer.marker.imgURL != null && layer.marker.imgURL != '') {
            // Custom Marker
            $listItem.find('.ma-layer-list-icon').html('<div class="title-marker-icon"><img id="svgCardIcon__' + layer.marker.type + '" src=' + checkImgUrlToAddToHTML(layer.marker.imgURL, layer.marker.organizationId) + ' /></div>');
        } else {
            // Standard Marker
            $listItem.find('.ma-layer-list-icon').html('<div class="title-marker-icon"><img id="svgCardIcon__' + layer.marker.type + '" src="' + builder.getSVG() + '" /></div>');
        }
        $listItem.appendTo($('div#miniMapBody > div.ma-layer-list'));
    };

    var adjustPopupHTML = function(e) {
        var $wrapper = $(e.popup._container.childNodes[1]),
            $content = $wrapper.find('.leaflet-popup-content');

        if ($wrapper.has('> .popup-header').length) {
            $wrapper.find('.leaflet-popup-content > .popup-header').remove();
        } else {
            // Hacky fix for content width issue when any one tooltip is shown for the first time
            $content.width($content.outerWidth() + 5);
        }

        $wrapper.find('.popup-header').detach().prependTo($wrapper);
    };

    var decorateLayersWithData = function() {
        var $dataWrapper = $('div#ma_data');

        _options.layers.forEach(function(layer) {
            var $layer = $dataWrapper.find('[data-layerid="' + layer.id + '"]');

            layer.records = getRecords($layer);
        });

        function getRecords($layer) {
            var self = this;
            this.records = [];

            $layer.find('[data-ma-field-info="data"]').each(function() {
                this.data = {};
                $(this).find('div').each(addRecordData.bind(this));
                self.records.push(this.data);
            });

            function addRecordData(index, element) {
                var api = $(element).data('field-api'),
                    value = $(element).find('span').text().trim();

                this.data[api] = value;
            }

            return this.records;
        }
    };

    var toggleLayerGroupVisibility = function(layerGroupId) {
        var layerGroup = _layerGroups[layerGroupId],
            opacity;

        if (!layerGroup) return;

        if (layerGroup.visible) {
            opacity = 0;
            layerGroup.visible = false;
        } else {
            opacity = 1;
            layerGroup.visible = true;
        }

        LayerGroup.setOpacity(layerGroup.ref, opacity);
    };

    var processErrors = function(errors) {
        if (!errors || !errors.length) return;

        var $notifyContainer = $('div.slds-notify_container'),
            $errorContainer = $notifyContainer.find('#miniMapErrors');

        errors.forEach(function(error) {
            $errorContainer.append( $('<p>').text(error) );
        });

        $notifyContainer.show();

        toggleMiniMapBody();
    };

    var closeError = function(event) {
        $(event.target).blur();
        $('.slds-notify_container').hide();
    };

    var toggleMiniMapBody = function(event) {
        $('#miniMapBody').toggle();

        if (event) {
            $('svg.layer-open').toggle();
            $('svg.layer-close').toggle();
            $(event.target).blur();
        }
    };

    module.init = function(data) {
        data = data || {};
        _mmid = data.mmid || 'minimap';
        _options = data.options;

        var hasPageErrors = data.errors.length;

        init(hasPageErrors);
        processErrors(data.errors);
    };

    module.toggleLayerGroupVisibility = toggleLayerGroupVisibility;

    return module;

});