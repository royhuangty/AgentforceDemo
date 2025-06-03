var lastEventRightClicked = '',
    contextShown = false,
    xDateFormat,
    designatedWorkFields = [],
    schedulerDate = "2014-10-13";




function init() {

    window.daysResources =
     [
        {key: "Monday", label: monday},
        {key: "Tuesday", label: tuesday},
        {key: "Wednesday", label: wednesday},
        {key: "Thursday", label: thursday},
        {key: "Friday", label: friday},
        {key: "Saturday", label: saturday},
        {key: "Sunday", label: sunday}
    ];
    if (isTwelveHours) {
        xDateFormat = " %g:%i%A";
    }
    else {
        xDateFormat = "%G:%i";
    }

    if (!startOnMonday)
        daysResources.unshift(daysResources.pop());

    // set locale
    moment.locale(userLocale);

    initScheduler();
}

function initScheduler() {

    scheduler.createTimelineView({
        name: "timeline",
        x_unit: "minute",
        x_date: xDateFormat,
        x_step: 60,
        x_size: 24,
        x_start: 0,
        x_length: 60,
        y_unit: daysResources,
        dy: 47,
        dx: 100,
        event_dy: 42,
        y_property: "section_id",
        render: "bar",
        section_autoheight: false
    });

    scheduler.config.readonly_form = true;
    scheduler.config.dblclick_create = false;
    scheduler.config.mark_now = false;
    scheduler.config.collision_limit = 1;
    scheduler.init('scheduler_here', new Date(2014, 9, 13), "timeline");
    drawCalender(calender);

}

// FSL-2260
// function getDesignatedWorkFields() {
//     var promise = new Promise(function (resolve, reject) {
//
//         Visualforce.remoting.Manager.invokeAction(
//              remoteActions.getDesignatedWorkFields,
//              function(result,event) {
//                 if(event.status && result != null){
//                     resolve(result);
//                 }
//                 else {
//                     reject(Error('failed to get Picklist Fields :('));
//                 }
//
//              },{ buffer: false, escape: true, timeout: 120000  }
//
//         );
//     });
//
//     return promise;
// }

var selectId = null;
var rfcId = null;
var idMap = null;

function getDesignatedWorkFields() {
    var promise = jQuery.Deferred();

    Visualforce.remoting.Manager.invokeAction(
        remoteActions.getDesignatedWorkFields,
        function(result,event) {
            if(event.status && result != null){
                promise.resolve(result);
            }
            else {
                promise.reject(Error('failed to get Picklist Fields :('));
            }

        },{ buffer: false, escape: true, timeout: 120000  }

    );

    return promise.promise();
}


// draw calendar
function drawCalender(calendar) {

    var daysArray = [], timeSlot;

    if (!calendar[fieldNames.OperatingHours.TimeSlots]) {
        return;
    }

    for (var i = 0; i < calendar[fieldNames.OperatingHours.TimeSlots].records.length; i++) {

        // set current calendar
        timeSlot = calendar[fieldNames.OperatingHours.TimeSlots].records[i];

        // push interval to array.
        daysArray.push(parseSlot(timeSlot));
    }

    // draw event on scheduler.
    scheduler.parse(daysArray, "json");
}

function parseSlot(timeSlot) {

    //scheduler fields
        timeSlot.section_id= timeSlot[fieldNames.TimeSlot.DayOfWeek];
        timeSlot.start_date= createDate(schedulerDate, timeSlot[fieldNames.TimeSlot.StartTime].split(':')[0], timeSlot[fieldNames.TimeSlot.StartTime].split(':')[1], false);
        timeSlot.end_date  = createDate(schedulerDate, timeSlot[fieldNames.TimeSlot.EndTime].split(':')[0], timeSlot[fieldNames.TimeSlot.EndTime].split(':')[1], true);
    return timeSlot;
}

function saveCalenderClick() {


    if (checkEventsIntersection()) {
        alert(customLabels.IntersectingEventsCalEdit);
        return;
    }


    var operatingHours = [];

    for (var key in scheduler._events) {

        var slot = scheduler._events[key];
        var timeSlot = {};

        for (var s in slot) {
            timeSlot[s] = slot[s];
        }

        delete timeSlot.id;
        delete timeSlot.Id;

        timeSlot[fieldNames.TimeSlot.DayOfWeek] = slot.section_id;
        timeSlot[fieldNames.TimeSlot.EndTime] = createTimeObj(slot.end_date.getHours(), slot.end_date.getMinutes());
        timeSlot[fieldNames.TimeSlot.StartTime] = createTimeObj(slot.start_date.getHours(), slot.start_date.getMinutes());
        timeSlot[fieldNames.TimeSlot.OperatingHours] = calender.Id;

        operatingHours.push(timeSlot);
    }

    // Action function salseforce
    saveCalendar(JSON.stringify(operatingHours));

}

function createTimeObj(hours, minutes) {
    return hours*60*60*1000 + minutes*60*1000;
}

function refreshPage(calendarId) {
    if (isInCommunity) {
        var communityPath = parent.location.pathname.split('/');
        communityPath[communityPath.length - 1] = calendarId;
        communityPath = communityPath.join('/');

        parent.location = communityPath;
    }
    else if (sforce !== undefined && sforce.console.isInConsole()) {
        getFocusedSubtabId();
    }
    else {
        parent.location = '/' + calendarId;
    }
}

function getFocusedSubtabId() {
    sforce.console.getFocusedSubtabId(refreshByTabId);
}
var refreshByTabId = function showTabId(result) {
    //refresh the page by tab Id
    sforce.console.refreshSubtabById(result.id);
};


//convert hours/minunues to valid string for the server
//If the time is less than 10 adds zero before(e.g from 1 to 01)
function convertToValidTime(time) {

    if (time < 10) {
        return "0" + time;
    }
    return time;

}

function createDate(date, hours, min, isEnd) {
    var x = new Date();
    var timezoneOffset = x.getTimezoneOffset() * 60 * 1000;
    x = new Date(date).getTime() + timezoneOffset;
    var dateObj = new Date(x);
    dateObj.setHours(hours);
    dateObj.setMinutes(min);

    if (isEnd && hours == 0 & min == 0) {
        dateObj.setDate(dateObj.getDate() + 1);
    }

    return dateObj;
}


//------------------Timeline View -----------//

var dragged_event = null;

scheduler.attachEvent("onBeforeEventChanged", function(ev, e, is_new, original){

    if (ev.start_date.getDate() === ev.end_date.getDate() && ev.start_date.getHours() === ev.end_date.getHours() && ev.start_date.getMinutes() === ev.end_date.getMinutes()) {
        return false;
    }

    for (var key in scheduler._events) {

        var schedulerEvent = scheduler._events[key];
        if (ev.id !== schedulerEvent.id && ev.section_id === schedulerEvent.section_id && isIntersect(schedulerEvent.start_date, schedulerEvent.end_date, ev.start_date, ev.end_date)) {

            // check for complete cover
            if (ev.start_date >= schedulerEvent.start_date && ev.end_date <= schedulerEvent.end_date) {
                return false;
            }

            if (ev.start_date <= schedulerEvent.start_date && ev.end_date > schedulerEvent.end_date) {
                return false;
            }
        }
    }

    return true;
});

scheduler.attachEvent("onBeforeDrag", function (id, mode, e){

    if (id) {
        dragged_event=scheduler.getEvent(id);
    }

    return true;
});

scheduler.attachEvent("onEventCreated", function(id,e){
    dragged_event=scheduler.getEvent(id);
    dragged_event.justCreated = true;
});

scheduler.attachEvent("onDragEnd", function (){

    var ev = dragged_event;

    if (!ev)
        return true;

    //cover the case where pasting after midnight
    if (ev.end_date > scheduler.getState().max_date) {
        ev.end_date = new Date(scheduler.getState().max_date);
    }


    for (var key in scheduler._events) {

        var schedulerEvent = scheduler._events[key];
        if (ev.id !== schedulerEvent.id && ev.section_id === schedulerEvent.section_id && isIntersect(schedulerEvent.start_date,schedulerEvent.end_date, ev.start_date, ev.end_date)) {

            // check for complete cover
            if (ev.start_date >= schedulerEvent.start_date && ev.end_date <= schedulerEvent.end_date) {
                delete scheduler._events[ev.id];
                break;
            }

            if (ev.start_date <= schedulerEvent.start_date && ev.end_date > schedulerEvent.end_date) {
                delete scheduler._events[ev.id];
                break;
            }


            // snap
            var lengthInMs = ev.end_date - ev.start_date;

            if (ev.start_date < schedulerEvent.start_date && ev.end_date < schedulerEvent.end_date && schedulerEvent.start_date < ev.end_date) {
                ev.end_date = schedulerEvent.start_date;

                if (!ev.justCreated) {
                    if (ev.start_date.getHours() != 0 && ev.start_date.getMinutes() != 0) {
                        ev.start_date = new Date(ev.end_date);
                        ev.start_date.setMilliseconds(ev.start_date.getMilliseconds() - lengthInMs);
                    }
                } else {
                    ev.justCreated = false;
                }
            }

            if (ev.start_date < schedulerEvent.end_date && ev.start_date > schedulerEvent.start_date && schedulerEvent.end_date < ev.end_date) {
                ev.start_date = schedulerEvent.end_date;

                if (!ev.justCreated) {
                    ev.end_date = new Date(ev.start_date);
                    ev.end_date.setMilliseconds(ev.end_date.getMilliseconds() + lengthInMs);
                } else {
                    ev.justCreated = false;
                }
            }
        }
    }

    setTimeout(function() {
        scheduler.updateView();
    }, 0);

    return true;
});

scheduler.attachEvent("onBeforeEventChanged", function (ev, e, is_new) {

    // disable pasting with keyboard
    if (e instanceof KeyboardEvent) {
        return false;
    }


    var minDate = scheduler.getState().min_date,
        maxDate = scheduler.getState().max_date;

    if (ev.start_date < minDate) {
        ev.start_date = new Date(minDate);
    }

    if (ev.end_date > maxDate) {
        ev.end_date = new Date(maxDate);
    }

    if (!ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c])
        ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c] = null;

    return true;

});

scheduler.attachEvent("onEventCopied", function(ev) {
    $('.clipboard-explained-txt').text(customLabels.Timeslot + " - " + 
        moment(ev.start_date).format('LT') + " - " +
        moment(ev.end_date).format('LT'));

    scheduler.updateEvent(ev.id);
});

scheduler.attachEvent("onEventPasted", function(isCopy, pasted_ev, original_ev) {
    scheduler.callEvent("onDragEnd");
});


scheduler.templates.tooltip_text = function (start, end, event) {

    // show only if context menu is hidden
    if (contextShown)
        return false;

    var tooltip = '';

    tooltip += moment(start).format('LT') + " - " + moment(end).format('LT');
    tooltip += event[fieldNames.TimeSlot.Type] != null ? ' (' + event.TranslatedType + ')' : '';
    tooltip += '<br/>';

    var lsDesignation = event[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c];
    if (!isO2ForAllTerritoriesOn) {
        if (lsDesignation) {
            var allDesString = '', allDesArray = lsDesignation.split(';');

            for (var i = 0; i < allDesArray.length; i++) {
                allDesString += designatedWorkFields[allDesArray[i]]
                    ? designatedWorkFields[allDesArray[i]] + ', '
                    : allDesArray[i] + ', ';
            }
            allDesString = allDesString.substring(0, allDesString.length - 2);
        }
        tooltip += event[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c]
            ? customLabels.DesignatedWorkCalEditor + ': ' + allDesString : '';
    }

    if (event[fieldNames.TimeSlot.RecordsetFilterCriteriaId] != null || rfcs[event[fieldNames.TimeSlot.RecordsetFilterCriteriaId]] != undefined) {
        if (lsDesignation && !isO2ForAllTerritoriesOn) {
            tooltip += '<br/>';
        }
        tooltip += customLabels.EnhancedDesignatedWorkCalEditor + ': ' + rfcs[event[fieldNames.TimeSlot.RecordsetFilterCriteriaId]];
    }

    return tooltip;

}


scheduler.templates.event_bar_text = function (start, end, ev) {

    let shouldAddIcon = false;
    if (isO2ForAllTerritoriesOn) {
        shouldAddIcon= ev[fieldNames.TimeSlot.RecordsetFilterCriteriaId];
    }
    else {
        shouldAddIcon = ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c] || ev[fieldNames.TimeSlot.RecordsetFilterCriteriaId];
    }
    let designatedIcon = shouldAddIcon ? "<i class='fa fa-certificate designatedIcon'></i>" : '';

    return "<div>" + designatedIcon +
        "<i class='fa fa-times' onmouseup=deleteEvent(" + ev.id + ")></i> <span class='times'>" +
        moment(start).format('LT') + " - " +
        moment(end).format('LT') + "</span></div>";
}

// set class for services
scheduler.templates.event_class = function (start, end, ev) {
    if (ev[fieldNames.TimeSlot.Slot_Color__c]) 
        return 'slot-' + ev[fieldNames.TimeSlot.Slot_Color__c];
    
    if (ev[fieldNames.TimeSlot.Type] == 'Normal' || !ev[fieldNames.TimeSlot.Type])
        return 'working';
    if (ev[fieldNames.TimeSlot.Type] == "Extended")
        return 'optional';
};

//function for disable ligthbox. overiding the scheduler
scheduler.showLightbox = function (id) {};

//delete event from calnder.
function deleteEvent(eventId) {
    setTimeout(function() {
        scheduler.deleteEvent(eventId);
    }, 20);

}

var isCopy = false;
var copyDate, copySection, pasteSection = null;
function copyTimeSlot(ev) {
    scheduler._buffer_id = ev.id;
    isCopy = true;
    scheduler.callEvent("onEventCopied", [ev]);
}

function pasteTimeSlot() {
    var ev = scheduler.getEvent(scheduler._buffer_id);
    if (ev) {
        var event_duration = ev.end_date-ev.start_date;
        if (isCopy) {
             var new_ev = scheduler._lame_clone(ev);
             new_ev.id = scheduler.uid();
             new_ev.start_date = new Date(copyDate);
             new_ev.end_date = new Date(new_ev.start_date.valueOf() + event_duration);

            if (pasteSection) {
                var a = scheduler.getState().mode, d = null;
                scheduler.matrix[a] ? d = scheduler.matrix[a].y_property : scheduler._props[a] && (d = scheduler._props[a].property), new_ev[d] = pasteSection;
            }
             scheduler.addEvent(new_ev);
             scheduler.callEvent("onEventPasted", [isCopy, new_ev, ev]);
        }
    }
}

function copyToNextDay(ev) {
    if (ev) {
        var event_duration = ev.end_date-ev.start_date;
        var new_ev = scheduler._lame_clone(ev);
        
        delete new_ev.Id;
        new_ev.id = scheduler.uid();
        if (copySection) {
            var mode = scheduler.getState().mode;
            var y_prop = scheduler.matrix[mode].y_property;

            for (var i=0; i<scheduler.matrix[mode].y_unit.length; i++) {
                if (scheduler.matrix[mode].y_unit[i].key == copySection) {
                    new_ev[y_prop] = scheduler.matrix[mode].y_unit[(i+1)%7].key;
                    break;
                }
            }
        }

        scheduler.addEvent(new_ev);
        dragged_event = new_ev;
        scheduler.callEvent("onDragEnd");


        scheduler.updateView();
    }
}


//--------------------------------------------//


//------------------Week View -------------------///
// overide the title of dhtmlx.
scheduler.templates.week_date = function() { return ""; };
scheduler.templates.event_text = function() { return ""; };


$(function () {

    var dayContextMenu = new dhtmlXMenuObject({
        parent: "contextZone_A",
        context: true,
        iconset:'awesome'
    });

    dayContextMenu.setOverflowHeight(10);

    dayContextMenu.addNewChild(dayContextMenu.topId, 0, "working", customLabels.Normal, false, 'fa fa-briefcase', 'fa fa-briefcase');
    dayContextMenu.addNewChild(dayContextMenu.topId, 1, "optional", customLabels.Extended, false, 'fa fa-clock-o', 'fa fa-clock-o');
    if (!isO2ForAllTerritoriesOn) {
        dayContextMenu.addNewChild(dayContextMenu.topId, 3, 'designate', customLabels.DesignateWork
            + "<i class='fa fa-caret-right des-work-carret'></i>", false, 'fa fa-certificate', 'fa fa-certificate');
    }
    dayContextMenu.addNewChild(dayContextMenu.topId, 3, 'color', customLabels.Time_Slot_Color + "<i class='fa fa-caret-right des-work-carret'></i>", false, 'fa fa-paint-brush', 'fa fa-paint-brush');
    if (isO2Enabled) {
        dayContextMenu.addNewChild(dayContextMenu.topId, 2, 'O2designate', customLabels.O2DesignateWork, false, 'fa fa-filter', 'fa fa-filter');
    }

    dayContextMenu.addNewChild(dayContextMenu.topId, 4, "copy", customLabels.Copy, false, 'fa fa-copy', 'fa fa-copy');
    dayContextMenu.addNewChild(dayContextMenu.topId, 5, "nextDay", customLabels.Copy_to_next_day, false, 'fa fa-arrow-down', 'fa fa-arrow-down');
    dayContextMenu.addNewChild(dayContextMenu.topId, 0, "paste", customLabels.Paste, false, 'fa fa-paste', 'fa fa-paste');

    // FSL-2260
    // getDesignatedWorkFields().then(function (resultList) {
    //     designatedWorkFields = resultList;
    // });

    $.when( getDesignatedWorkFields() ).then(
        function(resultList) {
            designatedWorkFields = resultList;
        }
    );

    function isCheckOnDesignated(des) {
        var ev = scheduler.getEvent(lastEventRightClicked);
        return ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c] && ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c].split(';').indexOf(des) > -1;
    }

    function updateContextMenuDesignatedWork() {
        dayContextMenu.removeItem('designate');
        dayContextMenu.addNewChild(dayContextMenu.topId, 3, 'designate', customLabels.DesignateWork + "<i class='fa fa-caret-right des-work-carret'></i>", false, 'fa fa-certificate', 'fa fa-certificate');

        menuItemsIdsToDesWork = {};

        let designatedKeys = Object.keys(designatedWorkFields);

        if (designatedKeys.length === 0) {
            dayContextMenu.addNewChild('designate', 0, 'designate_0', customLabels.Designated_work_field_set_is_empty, true, 'fa fa-exclamation-circle', 'fa fa-exclamation-circle');
            return;
        }

        for (let i=0; i<designatedKeys.length; i++) {
            let key = designatedKeys[i];
            if (designatedWorkFields[key] === 'None')
                continue;

            var isChecked = isCheckOnDesignated(key);
            dayContextMenu.addCheckbox('child','designate',i,'designate_work_' + designatedWorkFields[key], designatedWorkFields[key], isChecked, false);

            menuItemsIdsToDesWork['designate_work_' + designatedWorkFields[key]] = key;
        }
    }

    function addColorsMenu() {

        // W-9828371 - order is important!
        var colors = ['Red', 'Pink', 'Purple', 'Indigo', 'Blue', 'Cyan', 'Teal', 'Green', 'Lime', 'Yellow', 'Amber', 'Orange', 'Brown', 'Grey', 'Asphalt', 'Black'],
            translatedColors = [
                customLabels.SlotColorRed, customLabels.SlotColorPink, customLabels.SlotColorPurple, customLabels.SlotColorIndigo, 
                customLabels.SlotColorBlue, customLabels.SlotColorCyan, customLabels.SlotColorTeal, 
                customLabels.SlotColorGreen, customLabels.SlotColorLime, customLabels.SlotColorYellow, customLabels.SlotColorAmber, 
                customLabels.SlotColorOrange, customLabels.SlotColorBrown, customLabels.SlotColorGrey, customLabels.SlotColorAsphalt, 
                customLabels.SlotColorBlack
            ];

        dayContextMenu.removeItem('color');
        dayContextMenu.addNewChild(dayContextMenu.topId, 3, 'color', customLabels.Time_Slot_Color + "<i class='fa fa-caret-right des-work-carret'></i>", false, 'fa fa-paint-brush', 'fa fa-paint-brush');

        var colorSelected = scheduler.getEvent(lastEventRightClicked)[fieldNames.TimeSlot.Slot_Color__c];
        dayContextMenu.addRadioButton('child','color', 0, customLabels.Default, '<span class="colorbox slot-Default"></span>' + customLabels.Default, 'SlotColors', !colorSelected, false);

        for (var i=0; i<colors.length; i++) {
            var isSelected = colorSelected == colors[i] ? true : false;
            dayContextMenu.addRadioButton('child','color', i+1, colors[i], '<span class="colorbox slot-' + colors[i] + '"></span>' + translatedColors[i] , 'SlotColors', isSelected, false);
        }
    }


    dayContextMenu.attachEvent("onClick", function (id, zoneId, cas) {

        switch (id) {

            case 'working':
                scheduler.getEvent(lastEventRightClicked)[fieldNames.TimeSlot.Type] = 'Normal';
                scheduler.updateEvent(lastEventRightClicked);
                scheduler.getEvent(lastEventRightClicked).TranslatedType = customLabels.Normal;
                break;

            case 'optional':
                scheduler.getEvent(lastEventRightClicked)[fieldNames.TimeSlot.Type] = 'Extended';
                scheduler.updateEvent(lastEventRightClicked);
                scheduler.getEvent(lastEventRightClicked).TranslatedType = customLabels.Extended;
                break;

            case 'copy':
                copyTimeSlot(scheduler.getEvent(lastEventRightClicked));
                break;

            case 'paste':   
                pasteTimeSlot();
                break;

            case 'nextDay':
                copyToNextDay(scheduler.getEvent(lastEventRightClicked));
                break;

            case 'O2designate':
                selectId = scheduler.getEvent(lastEventRightClicked).id;
                rfcId = scheduler.getEvent(lastEventRightClicked).RecordsetFilterCriteriaId;
                $("[name$='theLookupLink']").val(rfcs[rfcId]);
                $('.lookupIcon')[0].click();
                break;

            default:
        }

    });

    dayContextMenu.attachEvent("onCheckboxClick", function(id, state, zoneId, cas){
        addDesignatedWork(scheduler.getEvent(lastEventRightClicked), menuItemsIdsToDesWork[id]);
        return true;
    });

    dayContextMenu.attachEvent("onRadioClick", function(group, idChecked, idClicked, zoneId, cas){
        var ev = scheduler.getEvent(lastEventRightClicked);
        ev[fieldNames.TimeSlot.Slot_Color__c] = idClicked == customLabels.Default ? null : idClicked;

        scheduler.updateView();
        // allow radio button to be checked
        return true;
    });

    dayContextMenu.attachEvent("onShow", function (id) {
        contextShown = true;
    });

    dayContextMenu.attachEvent("onHide", function (id) {

        contextShown = false;
    });

    scheduler.attachEvent("onContextMenu", function (event_id, native_event_object) {
        copyDate = scheduler.getActionData(native_event_object).date;
        scheduler.dhtmlXTooltip.hide();

        var posx = 0;
        var posy = 0;

        if (native_event_object.pageX || native_event_object.pageY) {
            posx = native_event_object.pageX;
            posy = native_event_object.pageY;

        } else if (native_event_object.clientX || native_event_object.clientY) {
            posx = native_event_object.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = native_event_object.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        if (event_id) {
            copySection = scheduler.getActionData(native_event_object).section;

            dayContextMenu.showItem("working");
            dayContextMenu.showItem("optional");
            dayContextMenu.showItem("O2designate");
            dayContextMenu.showItem("color");
            dayContextMenu.showItem("copy");
            dayContextMenu.showItem("nextDay");
            dayContextMenu.hideItem("paste");
            dayContextMenu.showContextMenu(posx, posy);
            lastEventRightClicked = event_id;

            if (!isO2ForAllTerritoriesOn) {
                dayContextMenu.showItem("designate");
                updateContextMenuDesignatedWork();
            }
            addColorsMenu();

            return false; // prevent default action and propagation

        }
        else if (isCopy){
            pasteSection = scheduler.getActionData(native_event_object).section;

            dayContextMenu.hideItem("working");
            dayContextMenu.hideItem("optional");
            dayContextMenu.hideItem("copy");
            dayContextMenu.hideItem("nextDay");
            if (!isO2ForAllTerritoriesOn) {
                dayContextMenu.hideItem("designate");
            }
            dayContextMenu.hideItem("O2designate");
            dayContextMenu.hideItem("color");
            dayContextMenu.showItem("paste");
            dayContextMenu.showContextMenu(posx, posy);
            lastEventRightClicked = '';
            return false; // prevent default action and propagation
        }

        lastEventRightClicked = '';

        return true;
    });


    dhtmlxEvent(scheduler._obj, "mouseleave", function (e) {
        if (scheduler.getState().drag_id) {
            scheduler._on_mouse_up(e);
            window.getSelection().removeAllRanges();    // clear text selection on IE
        }
    });

});

function addDesignatedWork(ev, item) {
    if (!ev || !item)
        return;

    var existingDesignated = ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c] ? ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c].split(';') : [];
    var options = {};

    if (!existingDesignated) {
        existingDesignated = [];
    }

    for (var i = 0; i < existingDesignated.length; i++) {
        options[existingDesignated[i]] = true;
    }

    //remove if exists
    if (options[item])
        delete options[item];
    else
        options[item] = true;

    ev[fieldNames.TimeSlot.Designated_Work_Boolean_Fields__c] = Object.keys(options).join(';');

    scheduler.updateView();
}

function isIntersect(a_start, a_end, b_start, b_end) {
    return (a_start < b_end && a_end > b_start);
}


function checkEventsIntersection() {

    for (var k1 in scheduler._events) {

        var currentEvent = scheduler._events[k1];

        for (var k2 in scheduler._events) {

            var checkedEvent = scheduler._events[k2];

            if (k1 !== k2 && currentEvent.section_id === checkedEvent.section_id && isIntersect(currentEvent.start_date, currentEvent.end_date, checkedEvent.start_date, checkedEvent.end_date)) {
                return true;
            }

        }
    }

    return false;

}