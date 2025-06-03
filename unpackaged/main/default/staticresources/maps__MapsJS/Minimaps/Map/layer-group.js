define([
    'marker-builder',
], function(MarkerBuilder) {

    var module = {},
        markerClusterGroup;

    var build = function(map, layer) {
        this.layer = layer;
        this.markers = [];
        this.counter = 0;
        
        layer.records.forEach(buildMarker.bind(this));
        
        if (!markerClusterGroup) markerClusterGroup = L.markerClusterGroup();
        if(this.counter > 0) {
            markerClusterGroup.addLayers(this.markers).addTo(map);
            counter ++;
        } else {
            var contextClusterGroup = L.markerClusterGroup();
            contextClusterGroup.addLayers(this.markers).addTo(map);
            counter++;
        }
    };

    var buildMarker = function(record) {
        var latField = this.layer.marker.latField,
            lngField = this.layer.marker.lngField,
            verifiedLatField = this.layer.marker.verifiedLatField,
            verifiedLngField = this.layer.marker.verifiedLngField,
            lat = record[latField.toLowerCase()].replace(',', '.'),
            lng = record[lngField.toLowerCase()].replace(',', '.');

        if (verifiedLatField) lat = record[verifiedLatField.toLowerCase()].replace(',', '.') || lat;
        if (verifiedLngField) lng = record[verifiedLngField.toLowerCase()].replace(',', '.') || lng;

        if (!lat || !lng) return;

        var builder = new MarkerBuilder({
            type: this.layer.marker.type,
            color: this.layer.marker.color,
            imgURL: this.layer.marker.imgURL
        });
        var svgIcon;
        var checkImgUrlForMarkerBuild = function(imgURL, orgId) {
            if(imgURL.substring(0, 3) === '015') {
                return '/servlet/servlet.ImageServer?id=' + imgURL + '&oid=' + orgId;
                
            }
            return '/sfc/servlet.shepherd/version/download/' + imgURL;
        }
        if(this.layer.marker.imgURL != null && this.layer.marker.imgURL != '') {
            svgIcon = L.icon({
                iconUrl: checkImgUrlForMarkerBuild(this.layer.marker.imgURL, this.layer.marker.organizationId),
                //iconSize: [builder.shape.config.size.x, builder.shape.config.size.y],
                iconAnchor: [builder.shape.config.anchor.x, builder.shape.config.anchor.y],
                popupAnchor: [-2, -builder.shape.config.size.y]
            });
        } else {
            svgIcon = L.icon({
                iconUrl: builder.getSVG(),
                iconSize: [builder.shape.config.size.x, builder.shape.config.size.y],
                iconAnchor: [builder.shape.config.anchor.x, builder.shape.config.anchor.y],
                popupAnchor: [-2, -builder.shape.config.size.y]
            });
        } 

        var popupContent = getPopupContent.call(this, record),
            marker = L.marker([lat, lng], { icon: svgIcon }).bindPopup(popupContent);
        this.markers.push(marker);
    };

    var getPopupContent = function(record) {
        var isContextRecord = window.location.search.indexOf(record.id.substr(0, 15)) >= 0,
            encodedRecordName = $('<div/>').text(record[this.layer.nameField.toLowerCase()]).html(),
            anchor = '<a target="_top" href="/' + record.id + '">' + encodedRecordName + '</a>';

        var html = '<h3 class="slds-text-heading--small">';
        html += (isContextRecord) ? encodedRecordName : anchor;
        html += '</h3>';

        var $header = $('<div>').addClass('popup-header').html(html),
            result = $header[0].outerHTML;

        result += '<div class="tooltip-body padded"><table class="tooltip-table"><tbody class="tooltip-bodyrows">';

        this.layer.fields.forEach(function(field) {
            if (field.toLowerCase() === this.layer.nameField.toLowerCase()) return;

            var encodedFieldData = $('<div/>').text(record[field]).html();

            result += '<tr class="tooltip-rowTemplate">';
            result += '<td><span class="tooltip-label">' + this.layer.fieldPathToLabel[field] + '</span></td>';
            result += '<td class="tooltip-fieldName">' + encodedFieldData + '</td>';
        });

        result += '</tbody></table></div>';

        return result;
    };

    var setOpacity = function(layerGroup, opacity) {
        layerGroup.getLayers().forEach(function(layer) {
            layer.setOpacity(opacity);
        });
    };

    module.build = function(map, layer) {
        if (!map || !layer) return;

        return build(map, layer);
    };

    module.setOpacity = setOpacity;

    return module;

});