$(function() {
    String.prototype.replaceAll = function() {
          var target = this;

          for (var i=0; i < arguments.length; i++) {
              target = target.replace('$'+ i, arguments[i]);
          }

          return target;
    };

    if (!isCapacityBased)
        $('#notCapacityBasedLightbox').show();

    var elemStart = '<span>';
    var elemBody = '<span id="dailyNumber"></span>';
    var elemFinish = '</span>';
    var elem = customLabels.capacity_selected_more_than_1_day.replaceAll(elemStart,elemBody,elemFinish);

    var e = $.parseHTML(elem);
    $('#dailyExplained').append(e);

    // set locale
    moment.locale(userLocale);

    $('#includeWeekEndCheckBox').on('change', function() {
        if ($('#includeWeekEndCheckBox').prop('checked')) {
            showWeekend = true;
            localStorage.setItem(sfdcUser + '_showWeekend', true);
        }
        else {
            showWeekend = false;
            localStorage.setItem(sfdcUser + '_showWeekend', false);
        }
        showCalendarWeekend();
    });

    $('#defaultCapacity').on('change', function() {
        defaultCapacity = $('#defaultCapacity').val() || $('#defaultCapacity').val().length ? $('#defaultCapacity').val() : 0;
        localStorage.setItem(sfdcUser + '_defaultCapacity', defaultCapacity);
    });

    $('#saveBtn').on('click', function() {
        save_form();
    });

    $('#capacityLightboxClose').on('click', function() {
        close_form();
    });

    $('#multiUpdateClose').on('click', function() {
        $('#multiUpdateLightbox').hide();
    });

    $('#multipleSaveBtn').on('click', function() {
        var hoursCap = $('#multiHoursCapacity').val();
        var servicesCap = $('#multiServicesCapacity').val();

        $('.inputError').removeClass('inputError');
        var isValid = true;
        if (isNaN(hoursCap) || hoursCap < 1) {
            isValid = false;
            $('#multiHoursCapacity').addClass('inputError');
        }

        if (isNaN(servicesCap) || servicesCap < 0) {
            isValid = false;
            $('#multiServicesCapacity').addClass('inputError');
        }

        if (!isValid)
            return;

        updateMultipleCapacities(parseInt(hoursCap), parseInt(servicesCap));
        $('.inputError').removeClass('inputError');
    });

    $("input[name='timePeriodRadioBtn']").on('click', function() {
        $('.durationExplained').fadeOut(100);
    });

    scheduler.locale.labels["dhx_cal_today_button"] = customLabels.Today;
    scheduler.init('scheduler_here', new Date(),"month");
    afterInit();
    scheduler.setCurrentView();

});

function afterInit() {
    scheduler.config.readonly = false;
    scheduler.config.dblclick_create = true;
    scheduler.config.mark_now = true;
    //scheduler.config.collision_limit = 1;
    scheduler.dhtmlXTooltip.config.className = 'dhtmlXTooltip tooltip expertTooltip';
    //scheduler.dhtmlXTooltip.config.timeout_to_display = 375;
    scheduler.dhtmlXTooltip.config.delta_x = -15;
    scheduler.dhtmlXTooltip.config.delta_y = -15;
    scheduler.config.start_on_monday = startOnMonday;
    scheduler.config.minicalendar.mark_events = false;

    if(showWeekend)
        $('#includeWeekEndCheckBox').prop('checked', 'checked');
    else 
        $('#includeWeekEndCheckBox').prop('checked', '');

    if (defaultCapacity) {
        $('#defaultCapacity').val(defaultCapacity);
        $('#multiHoursCapacity').val(defaultCapacity);
    }
    
    showCalendarWeekend();
    attachSchedulerEvents();
    bindKeyStrokes();
}

function attachSchedulerEvents() {
    scheduler.attachEvent("onDblClick", function (id, e){
        scheduler.showLightbox(id);
    });

    //get current month capacities
    scheduler.attachEvent("onViewChange", function (new_mode , new_date) {
        Visualforce.remoting.Manager.invokeAction(
             remoteActions.getMonthlyCapacities,scheduler._min_date,scheduler._max_date,resourceId,
             function(result,event) {
                parsedCapacities = [];
                if(event.status && result != null){
                    for (var i=0; i<result.length; i++) {
                        parsedCapacities.push(new ResourceCapacity(result[i]));
                    }
                    
                    scheduler.parse(parsedCapacities,'json');
                }
                else {
                    alert(customLabels.wentWrongContactSysAdmin);
                }

             },{ buffer: false, escape: true, timeout: 120000  }

        );
    });

    var eventMode = '';
    // before dragging a shift, mark it as selected
    scheduler.attachEvent("onBeforeDrag", function (id, mode, e){
        e.stopPropagation();
        markSelectedEvents(id,e);
        eventMode = mode;

        return true;
    });

    scheduler.attachEvent("onBeforeEventChanged", function(ev, e, is_new, original){
        if (eventMode != 'create') 
            return saveChangesToCapacity(ev.id, resourceId, ev.start_date, parseInt(ev.hoursPerTimePeriod), parseInt(ev.workItemsPerTimePeriod), ev.timePeriod, 0);           
        else 
            return true;
    });

    // scheduler.attachEvent("onEventChanged", function(id,ev){
    //     saveChangesToCapacity(ev.id, resourceId, ev.start_date, parseInt(ev.hoursPerTimePeriod), parseInt(ev.workItemsPerTimePeriod), ev.timePeriod, 0);           
    // });

    scheduler.attachEvent("onEventCreated", function(id,e){
        var ev = scheduler.getEvent(id);
        ev.isNewEvent = true;
        ev.isTempEvent = true;
        ev.name = customLabels.New_Capacity;
        ev.hoursPerTimePeriod = 0;
    });

    var menu = new dhtmlXMenuObject({
            parent: "contextZone_A",
            context: true
        });
    
    menu.attachEvent("onShow", function(id) {
        contextShown = true;
    });
    menu.attachEvent("onHide", function(id) {
        contextShown = false;
    });
    menu.addNewChild(menu.topId, 0, "Update", "<i class='fa fa-pencil'></i> " + customLabels.Update, false);
    menu.addNewChild(menu.topId, 1, "Delete", "<i class='fa fa-times'></i> " + customLabels.Delete, false);
    scheduler.attachEvent("onContextMenu", function(event_id, native_event_object) {
        if (event_id) {
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
            //if not in array - add
            if (SelectedEventsArray.length == 1)
                clearAllSelectedCapacities();
            if ($.inArray(String(event_id), SelectedEventsArray) == -1) {
                SelectedEventsArray.push(event_id);
            }
            lastRightClickedEvent = event_id;
            menu.showContextMenu(posx, posy);
            return false; // prevent default action and propagation
        }

        return true;
    });

    menu.attachEvent("onClick", function (event_id, native_event_object,cs){
        switch(event_id){
                case 'Delete':
                    deleteCapacities(SelectedEventsArray);
                    clearAllSelectedCapacities();
                    break;
                case 'Update':
                if(SelectedEventsArray.length>1) {
                    $('#multiUpdateLightbox').show();
                }
                else {
                    scheduler.showLightbox(lastRightClickedEvent);
                }
                break;
        }


        scheduler.updateView();
        return true;
    });

}

var html = function(id) { return document.getElementById(id); }; //just a helper
var lightboxDate;
var jumptoDate;

scheduler.showLightbox = function(id) {
    var ev = scheduler.getEvent(id);
    scheduler.startLightbox(id, html("capacityLightbox"));

    if (!ev.isNewEvent) {
        $('.ExtendedForm a').attr('href','../../' + ev.id);
        $('.ExtendedForm').show();
        $('#lightbox-HoursCapacity').val(ev.hoursPerTimePeriod);
        $('#lightbox-ServicesCapacity').val(ev.workItemsPerTimePeriod);
        lightboxDate = moment(ev.start_date);
        $('#lightbox-PeriodStart').val(lightboxDate.format('L'));
        switch (ev.timePeriod) {
            case 'Day': 
                $('#dailyCap').prop('checked', 'checked');
                break;
            case 'Week': 
                $('#weeklyCap').prop('checked', 'checked');
                break;
            case 'Month':
                $('#monthlyCap').prop('checked', 'checked');
                break;
        }
    }
    else {
        var startMS = ev.start_date.getTime();
        var endMS = ev.end_date.getTime();
        
        $('.ExtendedForm').hide();
        $('#lightbox-HoursCapacity').val(defaultCapacity);
        $('#lightbox-ServicesCapacity').val(0);
        lightboxDate = moment(ev.start_date);
        $('#lightbox-PeriodStart').val(lightboxDate.format('L'));
        $('#dailyCap').prop('checked', 'checked');

        var capacityDays = Math.ceil((endMS - startMS)/ 1000/60/60/24);
        if (capacityDays == 7) {
            $('#weeklyCap').prop('checked', 'checked');
            $('#weeklyExplained').fadeIn(1000);
        }
        else if (capacityDays >= 2) {
            //show info about more than one capacity creating
            $('#dailyNumber').text(capacityDays);
            $('#dailyExplained').fadeIn(1000);
        }
    }

    $('#capacityName').text(ev.name);
};

function save_form() {
    var ev = scheduler.getEvent(scheduler.getState().lightbox_id);
    var hoursCap = $('#lightbox-HoursCapacity').val();
    var servicesCap = $('#lightbox-ServicesCapacity').val();
    var periodStart = new Date(lightboxDate);
    var durType = $("input[name='timePeriodRadioBtn']:checked").val();
    var capId = ev.isNewEvent ? null : ev.id;

    var startMS = ev.start_date.getTime();
    var endMS = ev.end_date.getTime();
    var capacityDays = (endMS - startMS)/ 1000/60/60/24;

    $('.inputError').removeClass('inputError');
    var isValid = true;
    if (!lightboxDate.isValid()) {
        isValid = false;
        $('#lightbox-PeriodStart').addClass('inputError');
    }
    if (isNaN(hoursCap) || (hoursCap < 1 && servicesCap < 1)) {
        isValid = false;
        $('#lightbox-HoursCapacity').addClass('inputError');
    }

    if (isNaN(servicesCap) || (hoursCap < 1 && servicesCap < 1)) {
        isValid = false;
        $('#lightbox-ServicesCapacity').addClass('inputError');
    }

    if (!isValid)
        return;

    saveChangesToCapacity(capId, resourceId, periodStart, parseInt(hoursCap), parseInt(servicesCap), durType, parseInt(capacityDays));
    scheduler.endLightbox(true, html("capacityLightbox"));
    if (ev.isNewEvent) {
        scheduler.deleteEvent(ev.id);
    }

    $('.durationExplained').hide();
    $('.inputError').removeClass('inputError');
}

function close_form() {
    scheduler.endLightbox(false, html("capacityLightbox"));
    $('.durationExplained').hide();
    $('.inputError').removeClass('inputError');
}

function delete_event() {
    var event_id = scheduler.getState().lightbox_id;
    scheduler.endLightbox(false, html("capacityLightbox"));
}

function show_minical(){
    if (scheduler.isCalendarVisible()){
        scheduler.destroyCalendar();
    } else {
        scheduler.renderCalendar({
            position:"DatesJumpTo",
            date:scheduler._date,
            navigation:true,
            handler:function(date,calendar){
                scheduler.setCurrentView(date);
                scheduler.destroyCalendar()
            }
        });
    }
}

function showCapacityLightboxMinical(){
    if (scheduler.isCalendarVisible()){
         scheduler.destroyCalendar();
        } else {
            scheduler.renderCalendar({
                position:"lightbox-PeriodStart",
                date: new Date(lightboxDate),
                navigation:true,
                handler:function(date,calendar){
                    lightboxDate = moment(date);
                    $('#lightbox-PeriodStart').val(lightboxDate.format('L'));
                    scheduler.destroyCalendar();
                }
            });
        }
}

function saveChangesToCapacity(capacityId, resourceId, periodStart, hoursCapacity, servicesCapacity, timePeriod, daysDiff) {
    Visualforce.remoting.Manager.invokeAction(
         remoteActions.saveChangesToCapacity,capacityId,resourceId,periodStart,hoursCapacity,servicesCapacity,timePeriod,daysDiff,
         function(result,event) {
            if(event.type == "exception") {
                alert(event.message);   
                return false;
            }
            else if(event.status && result != null){
                if (capacityId != null) {
                    var parsedCC = new ResourceCapacity(result[0]);
                    scheduler.updateEvent(parsedCC.id);
                }
                else {
                    //scheduler.addEvent(parsedCC);
                    var parsedCapacities = [];
                    for (var i=0; result.length > i; i++) {
                        var parsedCC = new ResourceCapacity(result[0]);
                        parsedCapacities.push(parsedCC);
                    }
                        
                    scheduler.parse(parsedCapacities,'json');
                }

                scheduler.setCurrentView();
                return true;
                //capacities[result[i].Id] = parsedCC;
            }
            // else {
            //     alert('Failed to save capacity. \nPlease make sure all your data is correct and no validation rules are violated.');
            //     scheduler.setCurrentView();
            //     return false;
            // }
         },{ buffer: false, escape: true, timeout: 120000  }

    );
}

function updateMultipleCapacities(hoursCap, servicesCap) {
    Visualforce.remoting.Manager.invokeAction(
        remoteActions.updateMultipleCapacities,SelectedEventsArray,hoursCap,servicesCap,
        function(result,event) {
            if(event.status && result != null){
                var parsedCapacities = [];
                for (var i=0; result.length > i; i++) {
                    var parsedCC = new ResourceCapacity(result[i]);
                    parsedCapacities.push(parsedCC);
                }
                    
                scheduler.parse(parsedCapacities,'json');
                $('#multiUpdateLightbox').hide();
                scheduler.setCurrentView();
                //capacities[result[i].Id] = parsedCC;
            }
            else {
                alert('Failed to update capacity. \nPlease make sure all your data is correct and no validation rules are violated.');
            }

         },{ buffer: false, escape: true, timeout: 120000  }

    );
}

function deleteCapacities(capacityIds) {
    if(!confirm(customLabels.delete_capacities_are_you_sure.replace('$0', capacityIds.length)))
        return;

    Visualforce.remoting.Manager.invokeAction(
        remoteActions.deleteCapacities,
        capacityIds,
        function(result, event) {
            if (event.status) {
                if (!result) {
                    alert(customLabels.You_are_not_allowed_to_delete_capacities);
                }
                else {
                    for (var i=0; result.length > i; i++) {
                        var capId = result[i].Id;
                        
                        // send 'deleted' message to the server
                        scheduler.callEvent("onConfirmedBeforeEventDelete", [capId]);
                        // delete from client side datastore  
                        delete scheduler._events[capId];
                    }

                    scheduler.setCurrentView();
                }
            } else if (event.type === 'exception') {
                console.log(event.message);
                alert(event.message);
            }
        }
    );
}


function addDaysToDate(date, days) {
    var msToAdd = 1000 * 60 * 60 * 24 * days;
    return new Date(date.getTime() + msToAdd);
}

function showCalendarWeekend(){
    scheduler.ignore_month = function(date){
        if (showWeekend) {
            return false;
        }
        else {
            if (startOnMonday && (date.getDay() == 6 || date.getDay() == 0)) //hides Saturdays and Sundays
                return true;
            else if (!startOnMonday && (date.getDay() == 6 || date.getDay() == 5)) //hides Saturdays and Fridays
                return true;
        }
    };
    scheduler.updateView();
}

function markSelectedEvents(id, e) {
    if (e) {
        var ctrlPressed = e.ctrlKey || e.metaKey;
        e.stopPropagation();
    }

    // if the click was on empty cell, clear selected
    if (!id && !ctrlPressed) {
        clearAllSelectedCapacities();
        return;
    }

    var capacityEvent = scheduler.getEvent(id);
    var thisEvent = id;
    
    //Multi Select Shifts with Ctrl btn
    if (ctrlPressed) {
        var renderedEvent = scheduler.getRenderedEvent(id);
        $(renderedEvent).toggleClass('capacitySelected');

        if (typeof thisEvent != 'string')
            thisEvent = JSON.stringify(thisEvent);  

        if ($.inArray(thisEvent, SelectedEventsArray) == -1) {
            if (id != null)
                SelectedEventsArray.push(thisEvent);
        }
        else {
            SelectedEventsArray.splice($.inArray(thisEvent, SelectedEventsArray), 1);
        }

        if ($('.capacitySelected').length == 0) {
            clearAllSelectedCapacities();
        }

        return;
    }
    else {
        if (typeof thisEvent != 'string')
            thisEvent = JSON.stringify(thisEvent); 
        SelectedEventsArray = [thisEvent];

        var renderedEvent = scheduler.getRenderedEvent(id);
        // Set selected event
        if (!$(renderedEvent).hasClass('capacitySelected') || $('.capacitySelected').length > 1) {
            $('.capacitySelected').removeClass('capacitySelected');
            $(renderedEvent).addClass('capacitySelected');
        }
    }
}

function clearAllSelectedCapacities() {
    $('.capacitySelected').removeClass('capacitySelected');
    SelectedEventsArray = [];
}

function bindKeyStrokes() {
    $('html').bind('keydown', function(e) {
        // user is entering data
        if ( $('input[type=text]').is(":focus") )
            return;

        if ($('#multiUpdateLightbox').css('display') != 'none' || $('#capacityLightbox').css('display') != 'none')
            return;

        //  E - open extended form
        if (e.which == 69 && SelectedEventsArray.length == 1) {
            var winCap = window.open("/" + scheduler.getEvent(scheduler._select_id).id, '_blank');
        }
        // DEL - delete selected shift
        if (e.which == 46 && SelectedEventsArray.length > 0) {
            deleteCapacities(SelectedEventsArray);
            clearAllSelectedCapacities();
        }
        // ENTER - edit selected shift
        if (e.which == 13 && SelectedEventsArray.length == 1) {
            scheduler.showLightbox(scheduler._select_id);
        }
        else if (e.which == 13 && SelectedEventsArray.length > 1) {
            $('#multiUpdateLightbox').show();
        }

        // right arrow
        if (e.which == 39) {
            $('#DatesRightArrow').click();
        }

        // left arrow
        if (e.which == 37) {
            $('#DatesLeftArrow').click();
        }

        // 'T' - quick jump to current date
        if (e.which == 84) {
            $('#DatesToday').click();
        }

        //CTRL+A - select all
        if ((e.metaKey || e.ctrlKey) && e.which == 65) {
            var evs = scheduler.getEvents(scheduler.getState().min_date, scheduler.getState().max_date);
          
            for (var i=0; i<evs.length; i++) {
                var renderedEvent = scheduler.getRenderedEvent(evs[i].id);
                $(renderedEvent).addClass('capacitySelected');
                      
                var thisEvent = evs[i].id;
                if (typeof thisEvent != 'string')
                    thisEvent = JSON.stringify(evs[i].id);

                if ($.inArray(thisEvent, SelectedEventsArray) == -1) {
                    if (evs[i].id != null)
                        SelectedEventsArray.push(thisEvent);
                }
            }
        }
    });
}

scheduler.templates.event_bar_text = function(start,end,event){
    if (event.text == 'New event')
        return customLabels.New_Capacity;
    var str = '';
    if (event.hoursPerTimePeriod !== null) 
        str += "<span class='eventLabel'>" + customLabels.Hours_Capacity + ": " + event.hoursPerTimePeriod + "</span>";
    if (event.workItemsPerTimePeriod !== null)
        str += "<span class='eventLabel'>" + customLabels.Services_Capacity + ": " + event.workItemsPerTimePeriod + "</span>";
    
    return str;
};

scheduler.templates.event_class = function(start,end,ev){
    var returnClass = "eventContractorCapacity";
    if (ev.timePeriod == 'Day')
        returnClass += ' eventCapacityDaily';
    else if (ev.timePeriod == 'Week')
        returnClass += ' eventCapacityWeekly';
    else if (ev.timePeriod == 'Month')
        returnClass += ' eventCapacityMonthly';

    if ($.inArray(String(ev.id), SelectedEventsArray) != -1) {
        returnClass += ' capacitySelected';
    }

    return returnClass;
};

// set tool tip for events
scheduler.templates.tooltip_text = function(start,end,event) {
    if (contextShown)
        return false;

    var tooltip = '<div class="tooltipBody">';
    var typeIcon = 'fa-battery-empty';
    var hoursWidth = 0,  percentage = 0;

    if (event.hoursPerTimePeriod > 0) {
        hoursWidth = event.hoursInUse/event.hoursPerTimePeriod * 100;
        percentage = Math.floor(event.hoursInUse/event.hoursPerTimePeriod *100*100)/100;
    }
    else if (event.workItemsPerTimePeriod > 0) {
        hoursWidth = event.workItemsAllocated/event.workItemsPerTimePeriod * 100;
        percentage = Math.floor(event.workItemsAllocated/event.workItemsPerTimePeriod *100*100)/100;
    }

    if (hoursWidth <= 25) {
        typeIcon = 'fa-battery-empty';
    }
    else if (hoursWidth <= 50) {
        typeIcon = 'fa-battery-quarter';
    }
    else if (hoursWidth <= 75) {
        typeIcon = 'fa-battery-half';
    }
    else if (hoursWidth <= 100) {
        typeIcon = 'fa-battery-three-quarters';
    }
    else {
        typeIcon = 'fa-battery-full';
    }

    // For O2 capacity resource and calculation trigger is disable
    if (event.minutesUsed === undefined && event.workItemsAllocated === undefined) {
        tooltip += '<div class="tooltipLine"><b style="font-size:15px"> ' + event.name + '</b></div>';
    } else {
        tooltip += '<div class="tooltipLine"><b style="font-size:15px"><i class="fa ' + typeIcon + '"></i> ' + event.name + '</b> (' + percentage + '%)</div>';
    }

    if (event.workItemsPerTimePeriod) {
        if (event.workItemsAllocated === undefined) {
            tooltip += '<div class="tooltipLine">' + '</div>';
        } else {
            tooltip += '<div class="tooltipLine">' + customLabels.NumServicesScheduled.replace('$0', event.workItemsAllocated).replace('$1', event.workItemsPerTimePeriod) + '</div>';
        }
    }

    if (event.hoursPerTimePeriod) {
        if (event.minutesUsed === undefined) {
            tooltip += '<div class="tooltipLine">' + '</div>';
        } else {
            tooltip += '<div class="tooltipLine">' + customLabels.NumHoursScheduled.replace('{0}', event.hoursInUse).replace('{1}', event.hoursPerTimePeriod) + '</div>';
        }
    }

    tooltip += '<div class="tooltipHR"></div>';
    tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate"> ' + customLabels.Start + ' </span> <span class="tooltipValue">' + moment(event.start_date).format('llll') + '</span></div>';
    tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate"> ' + customLabels.Finish + ' </span> <span class="tooltipValue">' + moment(event.end_date).format('llll') + '</span></div>';
    tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate"> ' + customLabels.Duration_Type + ' </span> <span class="tooltipValue">' + durationLabels[event.timePeriod] + '</span></div>';

    if (event.workItemsAllocated > 0)
        tooltip += '<div class="tooltipLine"><span class="tooltipCell truncate"> ' + customLabels.NumberOfServices + ' </span> <span class="tooltipValue">' + event.workItemsAllocated + '</span></div>';

    tooltip += "</div>"; // of tooltipBody

    return tooltip;
}

scheduler.templates.month_date = function (date) {
    return moment(date).format('MMM YYYY');
};

scheduler.templates.month_scale_date = function (date) {
    return moment(date).format('dddd');
};
scheduler.templates.month_day = function (date) {
    return moment(date).format('DD');
};
function __setTimeZoneOffsetToDateField(dateField, allowNulls = true, isStart) {
    if (dateField) {
        let tz_offset = new Date(dateField).getTimezoneOffset() * 60 * 1000;
        let tz_offsetAfter = new Date(dateField + tz_offset).getTimezoneOffset() * 60 * 1000;

        //take care of DST issues (CFSL-2062)
        let offsetToAdd = 0;
        if (tz_offset != tz_offsetAfter) {
            offsetToAdd = tz_offset - tz_offsetAfter;
        }

        return new Date(dateField + tz_offset - offsetToAdd);
    }
    else {
        if (allowNulls) {
            return null;
        }
        else {
            return isStart ? new Date(0) : new Date(2400000000000);
        }
    }
}

