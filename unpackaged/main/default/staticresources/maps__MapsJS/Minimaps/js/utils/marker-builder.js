define([
    '../js/utils/markers/svg__Pin',
    '../js/utils/markers/svg__Circle',
    '../js/utils/markers/svg__Triangle',
    '../js/utils/markers/svg__Square'
], function(pin, circle, triangle, square) {

    var shapes = {};

    for (var i = 0; i < arguments.length; i++) {
        var shape = arguments[i];
        shapes[shape.config.name] = shape;
    }

    var MarkerBuilder = function(options) {
        this.options = {
            type: 'pin',
            color: '#f44336',
            imgURL : ''
        };

        this.options = $.extend({}, this.options, options);
        this.shape = shapes[this.options.type.toLowerCase()] || shapes[this.defaults.type];
    };

    MarkerBuilder.prototype.getSVG = function(color) {
        var svg = this.shape.svg.replace(/__COLOR__/g, color || this.options.color);
        return "data:image/svg+xml;base64," + btoa(svg);
    };

    return MarkerBuilder;

});