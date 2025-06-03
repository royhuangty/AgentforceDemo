var globalStatuses = {},
    fieldSetArr = [],
    NAfieldSetArr = [],
    toolTipService = [],
    toolTipNa = [],
    dateToAmount = {},
    translatedStatus={},
    translatedAbsencePicklist={},
    SERVICE_CATEGORY = {
        NONE: 'None',
        SCHEDULED: 'Scheduled',
        DISPATCHED: 'Dispatched',
        IN_PROGRESS: 'InProgress',
        COULD_NOT_COMPLETE: 'CannotComplete',
        COMPLETED: 'Completed',
        CANCELED: 'Canceled'
    };

    function isRtlDirection() {

        try {
            //in case window === window.parent[0]
            var rtlLangList = ['iw', 'he', 'ar', 'arc', 'dv', 'fa', 'ha'];
            if(window.parent === top || !window.frameElement) {
                return document.querySelector('html').getAttribute('dir') ? document.querySelector('html').getAttribute('dir') === 'rtl' : (rtlLangList.includes(document.querySelector('html').getAttribute('lang')));
            }
            return window.parent.document.querySelector('html').getAttribute('dir') === 'rtl';
        }

        catch(e) {
            return false;
        }

    }
 
    $(function () {

    // set selected timeline
    $('#calendar_mode_selector')
        .val('week')
        .on('change', function(e) {
            scheduler.setCurrentView(scheduler._date, e.target.value);
        });


    // set locale
    var newLocale = userLocale;
   
    if(userLocale.indexOf('iw') != -1) {
        newLocale = userLocale.replace("iw","he");
       
    }
     moment.locale(newLocale);
     shortCutKeys();
     translatePickList("ServiceAppointment","Status",translatedStatus);
     translatePickList("ResourceAbsence","Type",translatedAbsencePicklist);

    $('#FirstTimeLoading').show();
    getAllFieldsSet().then(function () {
        var rtlDirection = this.isRtlDirection();
        if (rtlDirection) {
            $("html").attr("dir", "rtl")
        }
        scheduler.config.readonly = true;
        scheduler.config.rtl = rtlDirection;
        changingTheYaxis();
        scheduler.config.separate_short_events = true;
        scheduler.xy.min_event_height = 40;
        scheduler.config.year_x = 3;
        scheduler.config.year_y = 4;
        scheduler.config.start_on_monday = startOnMonday;
        scheduler.init('scheduler_here', new Date(), "week");
        afterInit();
         //if(yearlyAvailable){
            $('div[name="year_tab"]').show();
         //}
            
       /* else{
             $('div[name="year_tab"]').remove();
             $("#dhx_minical_icon").css('left','202px');
        }*/
            
        scheduler.setCurrentView();
        $('#FirstTimeLoading').hide();
    });


    scheduler.locale.labels["dhx_cal_today_button"] = Today;
    scheduler.locale.labels["day_tab"] = Day;
    scheduler.locale.labels["week_tab"] = Week;
    scheduler.locale.labels["month_tab"] = Month;
    scheduler.locale.labels["year_tab"] = Year;

    $('#Apply').on('click', function () {
        var first = parseInt($('#fromHour').val()),
            end = parseInt($('#toHour').val());

        if ((first != 0) && (end != 0) && (first >= end)) {
            alert(labels.The_first_hour_must_be_earlier_than_the_last_hour);
            return;
        }

        if ((first == 0) && (end == 0)) {
            scheduler.config.last_hour = 24;
            scheduler.config.first_hour = 0;
        } else if (end == 0) {
            scheduler.config.last_hour = 24;
            scheduler.config.first_hour = first;
        } else {
            scheduler.config.first_hour = first;
            scheduler.config.last_hour = end;
        }

        busyHours = {start: first, end: end};
        localStorage.setItem(sfdcUser + '_busyHours', JSON.stringify(busyHours));

        scheduler.updateView();
    });

    setHourSelectInputs();
    hideBusinessHours();

});

function hideBusinessHours() {
    $('div[name="month_tab"]').on('click', function () {
        $('#businessHours').hide();
        $('#yearGradient').hide();
        $("#TodayButton").show();
        $("#dhx_minical_icon").show();
        $('.dhx_cal_prev_button').css('margin-right','');
    });
    $('div[name="year_tab"]').on('click', function () {
        $('#businessHours').hide();
        $('#yearGradient').show();
        $("#TodayButton").hide();
        $("#dhx_minical_icon").hide();
        $('.dhx_cal_prev_button').css('margin-right','-54px');

    });
    $('div[name="week_tab"]').on('click', function () {
        $('#businessHours').show();
        $('#yearGradient').hide();
        $("#TodayButton").show();
        $("#dhx_minical_icon").show();
        $('.dhx_cal_prev_button').css('margin-right','');
    });
    $('div[name="day_tab"]').on('click', function () {
        $('#businessHours').show();
        $('#yearGradient').hide();
        $("#TodayButton").show();
        $("#dhx_minical_icon").show();
        $('.dhx_cal_prev_button').css('margin-right','');
    });
}

// set hour filtering select options
function setHourSelectInputs() {

    var options = '', currentHour = '', currentDate;

    for (var i = 0; i < 24; i++) {
        currentDate = new Date();
        currentDate.setHours(i);
        currentDate.setMinutes(0);
        currentHour = isAMPM ? moment(currentDate).format("h:mmA") : moment(currentDate).format("HH:mm");
        options += '<option value="' + i + '">' + currentHour + '</option>';
    }

    $('#fromHour').html($(options));
    $('#toHour').html($(options));

    $('#fromHour').val(busyHours.start);
    $('#toHour').val(busyHours.end);
}


// set Y-AXIS hours text
scheduler.templates.hour_scale = function (date) {

    if (isAMPM)
        return moment(date).format("h:mmA");

    return moment(date).format("HH:mm");
};

// set event hours text
scheduler.templates.event_header = function (start, end, ev) {

    var text = '';

    if(ev.multiDay) {
        text+='<svg aria-hidden="true" class="slds-icon multiDay"><use xlink:href="' + multiday + '" ></use></svg>';
        text+='<svg aria-hidden="true" class="slds-icon multiDay"><use xlink:href="' + forword + '" ></use></svg>';
    }
        
    if (ev.RtDeveloperName === 'Non_Availability')
        text += '<svg aria-hidden="true" class="slds-icon naIcon"><use xlink:href="' + na + '" ></use></svg>';

    if (ev.RtDeveloperName === 'Break')
        text += "<img src=" + breakeIcon + " class='breakIcon'/>";

    text += moment(ev.start_date).format("LT") + " - " + moment(ev.end_date).format("LT");

    return text;

};

//implemented only for month mode
scheduler.templates.event_bar_text = function (start, end, ev) {
    return '<a href="#" onclick="openObject(\'' + ev.id + '\')" style="color:' + ev.textColor + '">' + ev.name + '</a>';
};


scheduler.templates.tooltip_text = function (start, end, event) {

    if (scheduler._mode === 'year') {
        return null;
    }


    var icon = '';
    if (event.RtDeveloperName === 'Break')
        icon += '<svg aria-hidden="true" class="slds-icon tooltipBreakIcon"><use xlink:href=' + imgbreak + '></use></svg>';
    else if (event.RtDeveloperName === 'Non_Availability')
        icon += '<svg aria-hidden="true" class="slds-icon tooltipNAIcon"><use xlink:href=' + na + '></use></svg>';
    else if(event.multiDay){
        icon+='<svg aria-hidden="true" class="slds-icon tooltipMultiDayIcon"><use xlink:href="' + multiday + '" ></use></svg>';
        icon+='<svg aria-hidden="true" class="slds-icon tooltipMultiDayIcon"><use xlink:href="' + forword + '" ></use></svg>';
    }
    var tooltip = '<div class="tooltipBody">'
    tooltip += '<div class="tooltipLine"><b style="font-size:15px">' + event.name + '</b> ' + icon + ' </div>';

    tooltip += '<div class="tooltipLine">' +  moment(start).format("LT") + " - " + moment(end).format("LT") + '</div>';

    tooltip += '<div class="tooltipHR"></div>';
    if (event.type == 'service') { 
        for (var i = 0; i < toolTipService.length; i++) {

            if (toolTipService[i].Type === "REFERENCE" && event[toolTipService[i].FullAPIName]) {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipService[i].Label + " </span>    " + event[toolTipService[i].FullAPIName].Name + "</div>";
            } 
            
            else if (toolTipService[i].Type === "BOOLEAN") {
                tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipService[i].Label + " </span>    "  + '<input class="checkbox-on-tooltip" type="checkbox" ' + (event[toolTipService[i].FullAPIName] ? 'checked' : '') + ' disabled></input>' + "</div>";
            }

            else {
                if (event[toolTipService[i].FullAPIName] || event[toolTipService[i].FullAPIName] === false)
                    tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipService[i].Label + " </span>    " + event[toolTipService[i].FullAPIName] + "</div>";
            }

        }
    }
    else { 
        
        for (i = 0; i < toolTipNa.length; i++) {
            if (event[toolTipNa[i].FullAPIName] || event[toolTipNa[i].FullAPIName] === false){
                if (toolTipNa[i].Type == "REFERENCE"){
                    tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipNa[i].Label + " </span>    " + event[toolTipNa[i].FullAPIName].Name + "</div>";
                } else if(toolTipNa[i].Type == "BOOLEAN"){
                    tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipNa[i].Label + " </span>    " + '<input class="checkbox-on-tooltip" type="checkbox" ' + (event[toolTipNa[i].FullAPIName] ? 'checked' : '') + ' disabled></input>' + "</div>";
                }
                else {
                    tooltip += '<div class="tooltipLine"><span class="tooltipCell">' + toolTipNa[i].Label + " </span>    " + event[toolTipNa[i].FullAPIName] + "</div>";
                }
            }   
        }
    }

    tooltip += '</div>';
    return tooltip; 
}
//removing the hours from the left side- yearly tooltip
 scheduler.templates.event_date=function(start,end,ev){
    return "";
    };
scheduler.templates.year_tooltip = function (start, end, ev) {
    var tooltip1='';
    if(ev.multiDay){
        tooltip1+='<svg aria-hidden="true" class="slds-icon multiDayYearTt"><use xlink:href="' + multiday + '" ></use></svg>';
        tooltip1+='<svg aria-hidden="true" class="slds-icon multiDayYearTt"><use xlink:href="' + forword + '" ></use></svg>';
    }
     if (isAMPM)
        tooltip1 += '<div class="dhx_tooltip_date" style="margin-right:8px;padding-left:0px;">'+ moment(start).format("h:mmA")+'</div>   ';
    else
        tooltip1 +='<div class="dhx_tooltip_date" style="margin-right:8px;padding-left:0px">'+moment(start).format("HH:mm")+'</div>   ';
    tooltip1+= '<a href="#" onclick="openObject(\'' + ev.id + '\')">' + ev.name + '</a> ';

    if (ev.type === 'service') {
        ev.textColor="black";
        for (var i = 0; i < toolTipService.length; i++) {
            if (ev.Status && toolTipService[i].Label === "Status")
                tooltip1 += " (" +  translatedStatus[ev[toolTipService[i].FullAPIName]] + ") ";
            else if (toolTipService[i].Type === "REFERENCE") {
                if (ev[toolTipService[i].FullAPIName])
                    tooltip1 += ' <a href="#" onclick="openObject(\'' + ev[toolTipService[i].FullAPIName] + '\')">' + ev[toolTipService[i].SOQLString] + '</a> ';
            }
            else if (ev[toolTipService[i].SOQLString])
                tooltip1 += ' ' + ev[toolTipService[i].SOQLString] + ', ';
        }
    }
    else {
        for (i = 0; i < toolTipNa.length; i++) {
            if (ev[toolTipNa[i].SOQLString]){
                if(toolTipNa[i].SOQLString==="Type")
                    tooltip1+=' '+translatedAbsencePicklist[ev[toolTipNa[i].SOQLString]]+' ';
                else
                    tooltip1 += ' ' + ev[toolTipNa[i].SOQLString] + ' ';

            }
                
            
            else if (toolTipNa[i].Type === "REFERENCE")
                tooltip1 += ' <a href="#" onclick="openObject(\'' + ev[toolTipNa[i].FullAPIName] + '\')">' + ev[toolTipNa[i].SOQLString] + '</a> ';
        }
    }

    return tooltip1;
};


function afterInit() {
    scheduler.dhtmlXTooltip.config.className = 'dhtmlXTooltip tooltip expertTooltip';
    scheduler.dhtmlXTooltip.config.timeout_to_display = 300;
    scheduler.config.separate_short_events = true;
    $('#Apply').click();
    

    scheduler.attachEvent("onViewChange", function (new_mode, new_date) {
        let startDate = new Date(scheduler._min_date);
        let endDate = new Date(scheduler._max_date);
        
        // Thai locale
        if (userLocale === 'th_TH') {
            startDate.setFullYear(startDate.getFullYear() + 543)
            endDate.setFullYear(endDate.getFullYear() + 543)
        }
        
        Visualforce.remoting.Manager.invokeAction(
            getServices, startDate, endDate, resourceId,
            function (services, ev) {

                parsedEvents = [];

                if (ev.status) {
                    for (var i = 0; i < services.length; i++) {
                        if ((scheduler._events[services[i].Id] && scheduler._events[services[i].Id] < services[i].LastModifiedDate)
                            || (scheduler._events[services[i].Id] === undefined))

                            parsedEvents.push(parseService(services[i]));
                    }
                }

                if (parsedEvents.length > 0) {
                    scheduler.parse(parsedEvents, 'json');
                    scheduler.updateView();
                }


            }, {buffer: false, escape: true, timeout: 120000}
        );
        Visualforce.remoting.Manager.invokeAction(
            getNAs, startDate, endDate, resourceId,
            function (Nas, ev) {

                parsedEventsNa = [];

                if (ev.status) {
                    for (var i = 0; i < Nas.length; i++) {

                        if ((scheduler._events[Nas[i].Id] && scheduler._events[Nas[i].Id] < Nas[i].LastModifiedDate)
                            || (scheduler._events[Nas[i].Id] === undefined))

                        parsedEventsNa.push(parseNA(Nas[i]))
                    }

                }

                if (parsedEventsNa.length > 0) {
                    scheduler.parse(parsedEventsNa, 'json');
                    scheduler.updateView();
                }


            }, {buffer: false, escape: true, timeout: 120000}
        );
        if (scheduler.getState().mode == "year")
            durationsPerDay();
        //getStatusTranslations();

    });


    Visualforce.remoting.Manager.invokeAction(
        getDictionaries, function (dictionaries) {

            Visualforce.remoting.Manager.invokeAction(
                getStatuses, function (statuses) {
                    for (var i = 0; i < dictionaries.length; i++) {

                        switch (dictionaries[i].Name) {

                            case "Completed Status":
                                globalStatuses.completed = dictionaries[i][dictionaryValueField];
                                break;

                            case "Incomplete Status":
                                globalStatuses.incomplete = dictionaries[i][dictionaryValueField];
                                break;

                            case "In Progress":
                                globalStatuses.onsite = dictionaries[i][dictionaryValueField];
                                break;

                            case "None Status":
                                globalStatuses.new = dictionaries[i][dictionaryValueField];
                                break;

                            case "Scheduled Status":
                                globalStatuses.assigned = dictionaries[i][dictionaryValueField];
                                break;

                            case "Canceled Status":
                                globalStatuses.cancelled = dictionaries[i][dictionaryValueField];
                                break;

                            case "Dispatched Status":
                                globalStatuses.dispatched = dictionaries[i][dictionaryValueField];
                                break;
                        }
                    }

                    scheduler.updateView();

                }); // getStatuses

        }); // getDictionaries

    getRt();
    //getStatusTranslations();


} // afterInit

function translatePickList(service,field,translatedStatus){
    Visualforce.remoting.Manager.invokeAction(getTranslations,service,field,
        function (resultMap) {
            if (resultMap){
                for (var statusStr in resultMap) {
                     translatedStatus[statusStr] = resultMap[statusStr]; 
                }
                //console.log(translatedStatus);
            }
            else
                console.log('no map =(');
        });
}


function getRt() {
    Visualforce.remoting.Manager.invokeAction(getNaRecordTypes,
        function (resultRt) {
            if (resultRt.length > 0) {
                for (i = 0; i < resultRt.length; i++) {
                    if (resultRt[i].Name === "Break") {
                        globalStatuses.Break = resultRt[i].DeveloperName;
                    }
                    else
                        globalStatuses.Na = resultRt[i].DeveloperName;
                }
            }
            else
                console.log('no rt');
        });
}

function durationsPerDay() {
    let startDate = new Date(scheduler._min_date);
    let endDate = new Date(scheduler._max_date);

    // Thai locale
    if (userLocale === 'th_TH') {
        startDate.setFullYear(startDate.getFullYear() + 543)
        endDate.setFullYear(endDate.getFullYear() + 543)
    }
    
    Visualforce.remoting.Manager.invokeAction(getduartionPerDay, startDate, endDate, resourceId,
        function (resultList) {
            if (resultList) {
                for (var dtstr in resultList) {
                    dateToAmount[moment(dtstr).format('l')] = resultList[dtstr];  
                }
                //console.log(dateToAmount);
                scheduler.updateView();
            }
            else
                console.log('no map =(');
        });
}


function getAllFieldsSet() {
    var a = callRemote(getServiceFieldSet).then(function (resultFieldSet) {
        if (resultFieldSet.length > 0) {
            for (var i = 0; i < resultFieldSet.length; i++) {
                fieldSetArr.push(resultFieldSet[i]);
            }
        }
        else
            console.log('no field set');
    });

    var b = callRemote(getNAFieldSet).then(function (resultNaFieldSet) {
        if (resultNaFieldSet.length > 0) {
            for (i = 0; i < resultNaFieldSet.length; i++) {
                NAfieldSetArr.push(resultNaFieldSet[i]);
            }
        }
        else
            console.log('no NA field set');
    });

    var c = callRemote(getServiceTooltipFieldset).then(function (tooltipFieldSet) {
        if (tooltipFieldSet.length > 0) {
            for (i = 0; i < tooltipFieldSet.length; i++) {
                toolTipService.push(tooltipFieldSet[i]);
            }
        }
        else
            console.log('no tooltips field set');
    });

    var d = callRemote(getNaTooltipFieldset).then(function (tooltipNaFieldSet) {
        if (tooltipNaFieldSet.length > 0) {
            for (var i = 0; i < tooltipNaFieldSet.length; i++) {
                toolTipNa.push(tooltipNaFieldSet[i]);
            }
        }
        else
            console.log('no NA tooltips field set');
    });
    if (scheduler.getState().mode == "year") {
        var e = callRemotewithParams(getduartionPerDay).then(function (resultList) {
            if (resultList) {
                for (var dtstr in resultList) {
                    dateToAmount[moment(dtstr).format('l')] = resultList[dtstr];
                }

                scheduler.updateView();
            }
            else
                console.log('no map ');
        })
    }


    return Promise.all([a, b, c, d, e]);
}

function callRemote(remoteMethodName) {
    var promise = new Promise(function (resolve, reject) {
        Visualforce.remoting.Manager.invokeAction(remoteMethodName,
            function (result, err) {
                if (result) {
                    resolve(result);
                }

                else
                    reject(Error("It broke"));
            });

    });
    return promise;
}

function callRemotewithParams(remoteMethodName) {
    var promise = new Promise(function (resolve, reject) {
        Visualforce.remoting.Manager.invokeAction(remoteMethodName, scheduler._min_date, scheduler._max_date, resourceId,
            function (result, err) {
                if (result) {
                    resolve(result);
                }

                else
                    reject(Error("It broke"));
            });

    });
    return promise;
}


function show_minical() {
    if (scheduler.isCalendarVisible()) {
        scheduler.destroyCalendar();
    } else {
        scheduler.renderCalendar({
            position: "dhx_minical_icon",
            date: scheduler._date,
            navigation: true,
            handler: function (date, calendar) {
                scheduler.setCurrentView(date);
                scheduler.destroyCalendar()
            }
        });
    }
}

function changingTheYaxis() {

    var step = 15;

    scheduler.config.hour_size_px = (60 / step) * 22;

    scheduler.templates.hour_scale = function (date) {
        html = "";
        for (var i = 0; i < 60 / step; i++) {
            currentHour = isAMPM ? moment(date).format("h:mmA") : moment(date).format("HH:mm");
            html += "<div style='height:22px;line-height:22px;'>" + currentHour + "</div>";
            date = scheduler.date.add(date, step, "minute");
        }
        return html;
    }
}

scheduler.templates.month_date_class = function(date){
    if (scheduler.getState().mode !== "year")
        return;
    var evs = scheduler.getEvents(date, scheduler.date.add(date, 1, "day"));

    for (var i=0; i<evs.length; i++){
        if(evs[i].RtDeveloperName==='Non_Availability' && dateToAmount[moment(date).format('l')] === undefined )
            return 'NA_Absence_NoTravel';  
        else if (dateToAmount[moment(date).format('l')] <= lowUtility && evs[i].RtDeveloperName==='Non_Availability')
            return 'low_utilNA_Absence' ;
        else if (dateToAmount[moment(date).format('l')] > lowUtility && dateToAmount[moment(date).format('l')] < medUtility && evs[i].RtDeveloperName==='Non_Availability')
            return 'medium_utilNA_Absence';
        else if (dateToAmount[moment(date).format('l')] >= medUtility && evs[i].RtDeveloperName==='Non_Availability')
            return 'high_utilNA_Absence';
    }
    if (dateToAmount[moment(date).format('l')] <= lowUtility)
        return 'low_util';   
    else if (dateToAmount[moment(date).format('l')] > lowUtility && dateToAmount[moment(date).format('l')] < medUtility)
        return 'medium_util';
    else if (dateToAmount[moment(date).format('l')] >= medUtility)
        return 'high_util';

};

// set class for services
scheduler.templates.event_class = function (start, end, ev) {
    if(scheduler.getState().mode != "year"){
        if (ev.Status && ev.color == null) {
            switch (ev.StatusCategory) {
                case SERVICE_CATEGORY.NONE:
                    return "eventStatusNew";

                case SERVICE_CATEGORY.SCHEDULED:
                    return 'eventStatusAssigned';
                    break;

                case SERVICE_CATEGORY.DISPATCHED:
                    return "eventStatusDispatched";

                case SERVICE_CATEGORY.IN_PROGRESS:
                    return "eventStatusTravel";

                case SERVICE_CATEGORY.COMPLETED:
                    return "eventStatusCompleted";

                case SERVICE_CATEGORY.COULD_NOT_COMPLETE:
                    return "eventStatusIncomplete";

                default:
                    return "eventCustomStatus";
            }
        }
     
    }
       if (ev.RtDeveloperName) {
            switch (ev.RtDeveloperName) {
                case globalStatuses.Break:
                    return "NA_Break";
                case globalStatuses.Na:
                    if(ev.color)
                        return;
                    else if (scheduler._mode != 'month')
                        return "NA_Absence_NoTravel";
                    else
                        return "NA_Absence_Monthly";

            }
        }
};


function parseService(sfdcService) {

    var parsedService = {},
        tz_start,
        tz_finish;

    if (sfdcService.SchedStartTime)
        tz_start = new Date(sfdcService.SchedStartTime).getTimezoneOffset() * 60 * 1000;

    if (sfdcService.SchedEndTime)
        tz_finish = new Date(sfdcService.SchedEndTime).getTimezoneOffset() * 60 * 1000;

    // properties with special names to meet the scheduler needs
    parsedService.start_date = sfdcService.SchedStartTime ? new Date(sfdcService.SchedStartTime + tz_start) : null;
    parsedService.end_date = sfdcService.SchedEndTime ? new Date(sfdcService.SchedEndTime + tz_finish) : null;
    parsedService.type = 'service';
    parsedService.id = sfdcService.Id;
    parsedService.Status = sfdcService.Status ? sfdcService.Status : null;
    parsedService.StatusCategory = sfdcService.StatusCategory;
    parsedService.name = sfdcService.AppointmentNumber;
    parsedService.color = sfdcService[window.objectNames.ServiceAppointment.GanttColor__c] ? sfdcService[window.objectNames.ServiceAppointment.GanttColor__c].toString() : null;
    parsedService.multiDay=sfdcService[window.objectNames.ServiceAppointment.IsMultiDay__c] ? sfdcService[window.objectNames.ServiceAppointment.IsMultiDay__c].toString():null;
    parsedService.lastModified = sfdcService.LastModifiedDate;

    if (parsedService.color && parsedService.color > "#777888")
        parsedService.textColor = "black";
    else if (parsedService.color)
        parsedService.textColor = "white";

    parsedService.text = '<a href="#" onclick="openObject(\'' + parsedService.id + '\')" style="color:' + parsedService.textColor + '">' + parsedService.name + '</a>';

    parseFieldSetFields(sfdcService, parsedService, toolTipService);
    parseFieldSetFields(sfdcService, parsedService, fieldSetArr, true);

    return parsedService;
}

function parseFieldSetFields(sfdcObj, parsedObj, fieldset, isLabel) {
    for (var i = 0; i < fieldset.length; i++) {
        var val = sfdcObj[fieldset[i].FullAPIName];

        if (val || val === false) {
            switch (fieldset[i].Type) { 
                case 'DATETIME':
                    var fieldName = fieldset[i].FullAPIName;
                    if(fieldName=='CreatedDate' || fieldName=='LastReferencedDate' || fieldName=='SystemModstamp' || fieldName=='LastViewedDate' || fieldName=='LastModifiedDate')
                        val = moment.tz(new Date(val), userTimeZone).format('L LT');
                    else {
                        var tz = new Date(val).getTimezoneOffset() * 60 * 1000;
                        val = moment(new Date(val + tz)).format('L LT');;
                    }
                    break;
                case 'DATE':
                    var tz = new Date(val).getTimezoneOffset() * 60 * 1000;
                    val = moment(new Date(val + tz)).format('L LT');
                    break;
                case 'REFERENCE':
                    var idPropName;
                    if (fieldset[i].FullAPIName.indexOf('__c') > -1) {
                        idPropName = fieldset[i].FullAPIName.replace('__c', '__r');

                        if (!sfdcObj[idPropName].Name) {

                            let obj = {};
                            for (let i = 0; i< Object.keys(sfdcObj[idPropName]).length; i++) {
                                var key = Object.keys(sfdcObj[idPropName])[i];
                                if (key !== 'Id') { // dont touch Id
                                    obj[key.toLowerCase()] = sfdcObj[idPropName][key]; // swap the value to a new lower case key
                                }
                            }
                            sfdcObj[idPropName] = Object.assign(sfdcObj[idPropName], obj);
                            sfdcObj[idPropName].Name = sfdcObj[idPropName][fieldset[i].NameField];
                        }

                        val = sfdcObj[idPropName];
                    }
                    else {
                        idPropName = fieldset[i].APIName;

                        var fieldNameNoId = fieldset[i].FullAPIName.substr(0, fieldset[i].FullAPIName.length - 2);
                        val = sfdcObj[fieldNameNoId] && sfdcObj[fieldNameNoId];
                    }

                    break;
                case 'PICKLIST':
                    if (parsedObj.type == 'service' && fieldset[i].SOQLString.toLowerCase() == "status")
                        val = translatedStatus[val];
                    else if (parsedObj.type == 'ea' && fieldset[i].SOQLString.toLowerCase() == "type")
                        val = translatedAbsencePicklist[val];
                    break;
            }

            parsedObj[fieldset[i].FullAPIName] = val;

            if (isLabel){
                if (fieldset[i].Type == 'REFERENCE') {

                    var fieldNameNoId2 = fieldset[i].FullAPIName.substr(0, fieldset[i].FullAPIName.length - 2);
                    var val33 = sfdcObj[fieldNameNoId2] && sfdcObj[fieldNameNoId2];

                    parsedObj.text += ' &#9679; <a href="#" onclick="openObject(\'' + parsedObj[fieldset[i].FullAPIName].Id + '\')" style="color:' + parsedObj.textColor + '">' + parsedObj[fieldset[i].FullAPIName].Name + '</a>';
                }
                else 
                    parsedObj.text += ' &#9679; ' + val;
            }
        }
    }
}


function parseNA(sfdcNA) {

    var parsedNA = {};
    var tz_start, tz_finish;

    if (sfdcNA.Start)
        tz_start = new Date(sfdcNA.Start).getTimezoneOffset() * 60 * 1000;

    if (sfdcNA.End)
        tz_finish = new Date(sfdcNA.End).getTimezoneOffset() * 60 * 1000;

    // properties with special names to meet the scheduler needs
    parsedNA.start_date = sfdcNA.Start ? new Date(sfdcNA.Start + tz_start) : null;
    parsedNA.end_date = sfdcNA.End ? new Date(sfdcNA.End + tz_finish) : null;
    parsedNA.id = sfdcNA.Id;
    parsedNA.type = 'ea';
    parsedNA.RtDeveloperName = sfdcNA.RecordType && sfdcNA.RecordType.DeveloperName;
    parsedNA.name = sfdcNA.AbsenceNumber;
    parsedNA.color = (parsedNA.RtDeveloperName === 'Non_Availability' && sfdcNA[window.objectNames.ResourceAbsence.GanttColor__c]) ? sfdcNA[window.objectNames.ResourceAbsence.GanttColor__c].toString() : null; 
    parsedNA.lastModified = parsedNA.LastModifiedDate;

    if (parsedNA.color && parsedNA.color > "#777888")
        parsedNA.textColor = "black";
    else if (parsedNA.color)
        parsedNA.textColor = "white";

    parsedNA.text = '<a href="#" onclick="openObject(\'' + parsedNA.id + '\')" style="color:' + parsedNA.textColor + '">' + parsedNA.name + '</a>';

    parseFieldSetFields(sfdcNA, parsedNA, toolTipNa);
    parseFieldSetFields(sfdcNA, parsedNA, NAfieldSetArr, true);

    return parsedNA;
}

function openObject(serviceId) {
    if (typeof sforce != "undefined" && sforce.console && sforce.console.isInConsole()) {
        sforce.console.openPrimaryTab(null, '/' + serviceId, true);
    } else {
        window.open('../' + serviceId, '_blank');
    }
}


function shortCutKeys() {
    $(document).keydown(function (e) {

        if (e.which == 39) {
            $('#DatesRightArrow').click();
        }
        if (e.which == 37) {
            $('#DatesLeftArrow').click();
        }
        //'T' - quick jump to current date
        if (e.which == 84) {
            $('#TodayButton').click();
        }

    });
}

scheduler.attachEvent("onSchedulerReady", function () {

    // need to overdige this scheduler function because it returns unsorted array, causing a bug in the yearly tooltip
    scheduler.getEvents = function (e, t) {
        var i = [];
        for (var s in scheduler._events) {
            var n = scheduler._events[s];
            n && (!e && !t || n.start_date < t && n.end_date > e) && i.push(n)
        }

        i = i.sort(function(a,b) {

            if (a.start_date > b.start_date) { return 1; }
            if (a.start_date < b.start_date) { return -1; }
            if (a.start_date == b.start_date) { return 0; }

        });

        return i;
    };

});

scheduler.templates.month_date = function (date) {
    try {
        const DATE_FORMAT_OPTIONS = { month: 'long', year: 'numeric' };
        return date.toLocaleDateString(userLocale.replace('_', '-'), DATE_FORMAT_OPTIONS);
    } catch(ex) {
        console.log(ex);
        return date;
    }
};

scheduler.templates.month_scale_date = function (date) {
    
    let formattedDate = moment(date).format('dddd');
    formattedDate = replaceAll(formattedDate);

    return '<span title="' + formattedDate + '">' + formattedDate + '</span>';
    
};

scheduler.templates.month_day = function (date) {
    return moment(date).format('DD');
};

scheduler.templates.day_date = function(date) {
    try {
        const DATE_FORMAT_OPTIONS = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString(userLocale.replace('_', '-'), DATE_FORMAT_OPTIONS);
    } catch(ex) {
        console.log(ex);
        return date;
    }
};

scheduler.templates.day_scale_date = function(date){

    const DATE_FORMAT_OPTIONS = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
    let formattedDate =date.toLocaleDateString(userLocale.replace('_', '-'), DATE_FORMAT_OPTIONS);
    
    return '<span title="' + formattedDate + '">' + formattedDate + '</span>';
};

scheduler.templates.week_scale_date = scheduler.templates.day_scale_date;

scheduler.templates.year_date = function(date){
    try {
        const DATE_FORMAT_OPTIONS = {year: 'numeric' };
        return date.toLocaleDateString(userLocale.replace('_', '-'), DATE_FORMAT_OPTIONS);
    } catch(ex) {
        console.log(ex);
        return date;
    }
};

scheduler.templates.year_scale_date = function(date) {

    let formattedDate = moment(date).format('dddd');
    formattedDate = replaceAll(formattedDate);
    
    return '<span title="' + formattedDate + '">' + formattedDate + '</span>';

};

scheduler.templates.year_month = function(date){
    return moment(date).format('MMMM');
};

function replaceAll(str) {
    return str.replace(/'/g, '');
}