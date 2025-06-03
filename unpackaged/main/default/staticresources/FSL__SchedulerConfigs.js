'use strict';

/*

    This module is used to make the basic gantt timeline views and set them on the global schedulerConfig module

 */

var schedulerConfig = function (schedulerConfig) {

    var timelineConfigs = {
        dateTitleFormat: '%D, %F %d',
        dateFormat: '%g:%i%A',
        resourceCellSize: 170,
        locationCellHeight: 44,
        rowHeight: 46,
        eventHeight: 42
        // sort: sortEvents  Bug fix - W-14707041
    };

    // in-day view
    function setTimeLineZoomLevel2() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel2',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 30,
            x_size: 16,
            x_start: 0,
            x_length: 6,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // daily view
    function setTimeLineZoomLevel3() {

        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel3',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 60,
            x_size: 24,
            x_start: 0,
            x_length: 24,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // 2 days view
    function setTimeLineZoomLevel4() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel4',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 120,
            x_size: 24,
            x_start: 0,
            x_length: 12,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    };

    // 3 days view
    function setTimeLineZoomLevel5() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel5',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 240,
            x_size: 18,
            x_start: 0,
            x_length: 6,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // weekly view
    function setTimeLineZoomLevel6() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel6',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 360,
            x_size: 28,
            x_start: 0,
            x_length: 4,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // 2 weeks view
    function setTimeLineZoomLevel7() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'ZoomLevel7',
            x_unit: 'minute',
            x_date: timelineConfigs.dateFormat,
            x_step: 720,
            x_size: 28,
            x_start: 0,
            x_length: 2,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'day',
                x_date: timelineConfigs.dateTitleFormat
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // utilization view
    function setTimeLineLongTerm() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'MonthlyView',
            x_unit: 'day',
            x_date: '%d',
            x_step: 1,
            x_size: 14,
            x_start: 0,
            x_length: 1,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'month',
                x_date: '%M'
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // monthly view
    function setMDTView() {
        scheduler.createTimelineView({
            smart_rendering: true,
            name: 'MTDView',
            x_unit: 'day',
            x_date: '%d',
            x_step: 1,
            x_size: 35,
            x_start: 0,
            x_length: 1,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'month',
                x_date: '%M'
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // monthly view
    function setLongView() {
        scheduler.createTimelineView({
            smart_rendering: true,
            // scrollable:true,
            // column_width:100,
            name: 'LongView',
            x_unit: 'day',
            x_date: '%d',
            x_step: 1,
            x_size: 20,
            x_start: 0,
            x_length: 7,
            y_unit: scheduler.serverList('resources', ''),
            y_property: 'resourceId',
            render: 'tree',
            dx: timelineConfigs.resourceCellSize,
            second_scale: {
                x_unit: 'month',
                x_date: '%M'
            },
            event_dy: timelineConfigs.eventHeight,
            dy: timelineConfigs.rowHeight,
            section_autoheight: false,
            folder_dy: timelineConfigs.locationCellHeight,
            folder_events_available: false,
            sort: timelineConfigs.sort
        });
    }

    // config all timelines
    function configTimelines() {
        setTimeLineZoomLevel2();
        setTimeLineZoomLevel3();
        setTimeLineZoomLevel4();
        setTimeLineZoomLevel5();
        setTimeLineZoomLevel6();
        setTimeLineZoomLevel7();
        setTimeLineLongTerm();
        setMDTView();
        setLongView();
    }

    // misc configurations
    function setConfigurations() {
        var rtlDirection = document.querySelector('html').getAttribute('dir') === 'rtl';
        scheduler.config.drag_resize = false;
        scheduler.config.multisection = true;
        scheduler.config.multisection_shift_all = false;
        scheduler.config.limit_drag_out = false;
        scheduler.config.dblclick_create = false;
        scheduler.config.mark_now = false;
        scheduler.config.time_step = 1;
        scheduler.dhtmlXTooltip.config.className = 'dhtmlXTooltip tooltip expertTooltip';
        scheduler.dhtmlXTooltip.config.timeout_to_display = 375;
        scheduler.dhtmlXTooltip.config.delta_x = 10;
        scheduler.dhtmlXTooltip.config.delta_y = 0;
        scheduler.config.minicalendar.mark_events = false;
        scheduler.config.preserve_length = false;
        scheduler.config.rtl = rtlDirection;
        // scheduler.config.drag_create = false // W-10709962
        scheduler.config.touch = false;

        //scheduler.config.delay_render = 50;
        //scheduler.config.time_step = serviceJumpsOnGantt;
    }

    // set rows height
    function setRowHeights(rowHeight, updateView) {

        var height = 32;

        switch (rowHeight) {
            case 'xsmall':
                height = 27;
                break;
            case 'small':
                height = 32;
                break;
            case 'normal':
                height = 39;
                break;
            case 'large':
                height = 46;
                break;
            default:
                height = 39;
                break;
        }

        // check if changed
        if (scheduler.matrix.ZoomLevel3.dy === height) return;

        // set timeline parameters
        for (var viewName in scheduler.matrix) {
            scheduler.matrix[viewName].dy = height;
            scheduler.matrix[viewName].event_dy = height - 4;
            scheduler.matrix[viewName].folder_dy = height + 2;
        }

        if (updateView) {
            scheduler._is_initialized() && scheduler.setCurrentView();
        }
    }

    function setReadOnly(value) {
        scheduler.config.readonly = value;
    }

    // sort function for events - decide which event is displayed on top
    function sortEvents(a, b) {

        var a_start = new Date(a.start_date),
            a_end = new Date(a.end_date),
            b_start = new Date(b.start_date),
            b_end = new Date(b.end_date);

        if (a.type === 'na' && b.type !== 'na') {
            if (b_end < a_start || a_end < b_start) return +a_start > +b_start ? 1 : -1;else return -1;
        } else if (b.type === 'na' && a.type !== 'na') {
            if (a_end < b_start || b_end < a_start) return +a_start > +b_start ? 1 : -1;else return 1;
        } else {
            return +a_start > +b_start ? 1 : -1;
        }
    }

    // our config module
    return {
        timelineConfigs: timelineConfigs,
        configTimelines: configTimelines,
        setRowHeights: setRowHeights,
        setReadOnly: setReadOnly,
        setConfigurations: setConfigurations,
        sortEvents: sortEvents
    };
}(schedulerConfig || {});