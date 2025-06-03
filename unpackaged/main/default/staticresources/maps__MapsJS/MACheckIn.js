var legacyMobile = false;

$(function() {
     /***********************
     *
     * get check in settings
     *
     **********************/
    var checkInInt = setInterval(function() {
        if(typeof(MA) == 'object') {
            clearInterval(checkInInt);
            MA.CheckIn.getFields().then(function(res) {
                //overwrite with options
                MA.CheckIn.general = res.data || {};
            });
        }
    },500);
}); 

function CheckIn(pMarker, callback)
{
    var $dfd = $.Deferred();
    if(pMarker == null) {
        MAToastMessages.showError({message:MASystem.Labels.Checkin_Unable_To_CheckIn, subMessage:MASystem.Labels.Checkin_Undefined_Marker,timeOut:0,closeButton:true});
        return;
    } 
    
    //locate the record from the plotted tab
    var SavedQueryId = '';
    var qid = pMarker.qid || '';
    var recordId = getProperty(pMarker,'record.Id',false) || '';
    var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+qid+'"]');

    var queryData = $plottedQuery.data() || {};

     //Added pMarker.savedQueryId in case this check-in came from the schedule or routes which do not have plotted queries
    SavedQueryId = queryData.savedQueryId || pMarker.savedQueryId || '';
    var $loadingMess = MAToastMessages.showLoading({message: MASystem.Labels.Checking_In_Progress,timeOut : 0, extendedTimeOut: 0});
    //check if we have a field set
    var fieldSet = false;
    if(MA.CheckIn.general['Activity-FieldSet'] && MA.CheckIn.general['Activity-FieldSet'] != 'Select') {
        fieldSet = true;
    }

    //is this a mapit marker?
    var isMapItRecord = getProperty(queryData,'options.isMapIt',false) || false

    //myCachedPositionInfo is populated from watchPosition
    if (myCachedPositionInfo != null)
    {
        //calculate the distance between the marker that was clicked and the current location and then check in
        var requestData = {
            action      : 'check_in',
            SavedQueryId: SavedQueryId,
            baseObjectId: pMarker.record.baseObjectId || '',
            id: MASystem.User.Id,
			lid:pMarker.record.Id,
            tooltip1: pMarker.title || pMarker.record.Id,
            clat: myCachedPositionInfo.coords.latitude,
            clong: myCachedPositionInfo.coords.longitude,
            caccuracy: myCachedPositionInfo.coords.accuracy,
            length: google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(myCachedPositionInfo.coords.latitude, myCachedPositionInfo.coords.longitude), pMarker.getPosition())
        };

        if(isMapItRecord)
        {
            requestData.isMapItRecord = true;
            requestData.mapItBaseObject = getProperty(queryData,'options.baseObjectId',false) || '';
        }

        //check if we have a field set
        if(fieldSet) {
            dispositionData = $('#CustomDispositionPopup .customDis-buttons').data('dispositionData');
            requestData = $.extend(requestData , dispositionData );
        }
        
        $.extend(requestData, {
            ajaxResource : 'TooltipAJAXResources'
        });
        requestData.action = 'check_in';
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	requestData,
        	function(json, event) {
                MAToastMessages.hideMessage($loadingMess);
                if(json.success)
                {
                    MAToastMessages.showSuccess({message: MASystem.Labels.Checkin_Success});
                    
                    /* extract results from the reference record that may have just got updated with new activity information on the backend */
                    
                    // get back end record
                    var referenceBackendRecord = json.ReferenceObject;
                    
                    // get front end record
                    var referenceFrontendRecord = getProperty(queryData, 'records.'+recordId);
                    
                    // update record with any new LastActivityDate information from the backend with help from tooltip information
                    updateRecordWithLastActivityDateFieldFromBackend(referenceFrontendRecord, referenceBackendRecord, queryData.tooltips);
                    // rerender the updated record's marker which may now have new information that my change the marker
                    Plotting.updatePlottedQueryMarkerRecordInfo(referenceFrontendRecord);
                    
                    try { callback(json); } catch (err) { MALog(window.formatLabel('Unable to perform check in callback: {0}', [err])); $('#CustomDispositionPopup #customDis-loadmask').hide();}
                    $dfd.resolve(json);
                }
                else
                {
                    //check if error msgs
                    $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                    var errorMsg = MASystem.Labels.Checkin_Field_Set_Error;
                    if(json.errMsgs) {
                        for(i=0; i < json.errMsgs.length;i++) {
                            errorMsg += '</br>' + json.errMsgs[i];
                        }
                    }
                    else { errorMsg = json.error; }
                    MAToastMessages.showError({message:MASystem.Labels.Checkin_Error_Checking_In, subMessage: errorMsg, timeOut:0, closeButton:true});
                    $('#CustomDispositionPopup #customDis-loadmask').hide();
                    $dfd.reject(errorMsg);
                }
        	},{buffer:false,escape:false}
        );
    }
    else
    {
        var requestData = {
            action      : 'check_in',
            SavedQueryId: SavedQueryId,
            baseObjectId: pMarker.record.baseObjectId || '',
            id: MASystem.User.Id,
			lid:pMarker.record.Id,
            tooltip1: pMarker.title || pMarker.record.Id,
            clat: '',
            clong: '',
            caccuracy: '',
            length: ''
        };

        if(isMapItRecord) 
        {
            requestData.isMapItRecord = true;
            requestData.mapItBaseObject = getProperty(queryData,'options.baseObjectId',false) || '';
        }

        //check if we have a field set
        if(fieldSet) {
            dispositionData = $('#CustomDispositionPopup .customDis-buttons').data('dispositionData');
            requestData = $.extend(requestData , dispositionData );
        }
    
        $.extend(requestData, {
            ajaxResource : 'TooltipAJAXResources'
        });
        requestData.action = 'check_in';
        requestData.clat = '';
        requestData.clong = '';
        requestData.caccuracy = '';
        requestData.length = '';
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	requestData,
        	function(json, event) {
            MAToastMessages.hideMessage($loadingMess);
                if(json.success)
                {
                    MAToastMessages.showSuccess({message: MASystem.Labels.Checkin_Success});
                    try { callback(json); } catch (err) { MALog(window.formatLabel('Unable to perform check in callback: {0}', [err])); $('#CustomDispositionPopup #customDis-loadmask').hide();}
                    
                    
                    /* extract results from the reference record that may have just got updated with new activity information on the backend */
                    
                    // get back end record
                    var referenceBackendRecord = json.ReferenceObject;
                    
                    // get front end record
                    var referenceFrontendRecord = getProperty(queryData || {}, 'records.'+recordId);
                    
                    // update record with any new LastActivityDate information from the backend with help from tooltip information
                    updateRecordWithLastActivityDateFieldFromBackend(referenceFrontendRecord, referenceBackendRecord, queryData.tooltips);
                    
                    // rerender the updated record's marker which may now have new information that my change the marker
                    Plotting.updatePlottedQueryMarkerRecordInfo(referenceFrontendRecord);
                    $dfd.resolve(json);
                }
                else
                {
                    //check if error msgs
                    $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                    var errorMsg = MASystem.Labels.Checkin_Field_Set_Error;
                    if(json.errMsgs) {
                        for(i=0; i < json.errMsgs.length;i++) {
                            errorMsg += '</br>' + json.errMsgs[i];
                        }
                    }
                    else { errorMsg = json.error; }
                    MAToastMessages.showError({message:MASystem.Labels.Checkin_Error_Checking_In, subMessage: errorMsg, timeOut:0, closeButton:true}); 
                    $('#CustomDispositionPopup #customDis-loadmask').hide();
                    $dfd.reject(errorMsg);
                }
        	},{buffer:false,escape:false}
        );
    }
    return $dfd.promise();
}

function CheckOut(pMarker, checkInId, callback) {
    var $dfd = $.Deferred();
    if(pMarker == null) {
        MAToastMessages.showError({message:MASystem.Labels.Checkin_Unable_To_CheckIn, subMessage: MASystem.Labels.Checkin_Undefined_Marker,timeOut:0,closeButton:true});
        return;
    }
    //locate the record from the plotted tab
    var SavedQueryId = '';
    var qid = pMarker.qid || '';
    var recordId = getProperty(pMarker,'record.Id',false) || '';
    var $plottedQuery = $('#PlottedQueriesTable .PlottedRowUnit[qid="'+qid+'"]');
    var queryData = $plottedQuery.data() || {};
    var checkInSettings = getProperty(queryData, 'queryRecord.BaseObject__r.Settings__c', false) || '{}';
    try {
        checkInSettings = JSON.parse(checkInSettings);
    } catch (e) {
        checkInSettings = {};
    }
    var postTo = getProperty(checkInSettings, 'CheckInPostTo', false) || '';
    var $loadingMess = MAToastMessages.showLoading({message: MASystem.Labels.Checkin_Checking_Out,timeOut : 0, extendedTimeOut: 0});
    
    var queryData = {};
    try {
        qid = pMarker.qid;
        recordId = pMarker.record.Id;
        queryData = $plottedQuery.data() || {};
        SavedQueryId = queryData.savedQueryId || '';
    }
    catch(e) {
        
    }
    
    //check if we have a field set
    var fieldSet = false;
    if(MA.CheckIn.general['Activity-FieldSet'] && MA.CheckIn.general['Activity-FieldSet'] != 'Select') {
        fieldSet = true;
    }
    //myCachedPositionInfo is populated from watchPosition
    if (myCachedPositionInfo != null)
    {
        //calculate the distance between the marker that was clicked and the current location and then check in
        var requestData = {
            action      : 'check_out', 
            checkInId   : checkInId,
            postTo      : postTo,
            SavedQueryId: SavedQueryId,
            lid         : pMarker.record.Id,
            clat        : myCachedPositionInfo.coords.latitude,
            clong       : myCachedPositionInfo.coords.longitude,
            caccuracy   : myCachedPositionInfo.coords.accuracy,
            distance    : google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(myCachedPositionInfo.coords.latitude, myCachedPositionInfo.coords.longitude), pMarker.getPosition())
        };

        //check if we have a field set
        if(fieldSet) {
            var dispositionData = $('#CustomDispositionPopup .customDis-buttons').data('dispositionData');
            requestData = $.extend(requestData , dispositionData );
        }
        
        $.extend(requestData, {
            ajaxResource : 'TooltipAJAXResources',
        	
        });
        requestData.action = 'check_out';
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	requestData,
        	function(response, event) {
                MAToastMessages.hideMessage($loadingMess);
                if (event.status) {
                    if(response.success) {
                        MALayers.hideModal('CustomDispositionPopup',true);
                        var $actionButton = $('#markerTooltipWrap').find('.actionbutton[data-action="Check Out"]');
                        var $listButton = $('#markerActionSheet').find('.actionbutton[data-action="Check Out"]');
                        $actionButton.removeData().attr('data-action','Check In').find('.action-bar-button-text').text(MASystem.Labels.ActionFramework_Check_In);
                        $listButton.removeData().attr('data-action','Check In').text(MASystem.Labels.ActionFramework_Check_In);
                        
                        MAToastMessages.showSuccess({message: MASystem.Labels.Checking_Out_Success});
                        try { callback(response.checkInId); } catch (err) { MALog('Unable to perform check out callback: ' + err); $('#CustomDispositionPopup #customDis-loadmask').hide();}
                        VueEventBus.$emit('refresh-action-buttons');
                        $dfd.resolve(response);
                    } else {
                        //check if error msgs
                        $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                        var errorMsg = MASystem.Labels.Checkin_Field_Set_Error;
                        if(response.errMsgs) {
                            for(i=0; i < response.errMsgs.length;i++) {
                                errorMsg += '</br>' + response.errMsgs[i];
                            }
                        }
                        else { errorMsg = response.error; }
                        MAToastMessages.showError({message:MASystem.Labels.Checkin_Error_Checking_In, subMessage: errorMsg, timeOut:0, closeButton:true});  
                        $('#CustomDispositionPopup #customDis-loadmask').hide();
                        $dfd.reject(errorMsg);
                    }
                } else {
                    $dfd.reject(event.message);;
                }
                
        	},{buffer:false,escape:false}
        );
    }
    else
    {
        var requestData = {
            action      : 'check_out',
            checkInId   : checkInId,
            lid         : pMarker.record.Id,
            postTo      : postTo,
            SavedQueryId: SavedQueryId,
            clat        : '',
            clong       : '',
            caccuracy   : '',
            distance    : ''
        };
        //check if we have a field set
        if(fieldSet) {
            var dispositionData = $('#CustomDispositionPopup .customDis-buttons').data('dispositionData');
            requestData = $.extend(requestData , dispositionData );
        }
        $.extend(requestData, {
            ajaxResource : 'TooltipAJAXResources'
        });
        requestData.action = 'check_out';
        requestData.clat = '';
        requestData.clong = '';
        requestData.caccuracy = '';
        requestData.distance = '';
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	requestData,
        	function(response, event) {
            MAToastMessages.hideMessage($loadingMess);
                if (event.status) {
                    if(response.success) {
                        var $actionButton = $('#markerTooltipWrap').find('.actionbutton[data-action="Check Out"]');
                        var $listButton = $('#markerActionSheet').find('.actionbutton[data-action="Check Out"]');
                        $actionButton.removeData().attr('data-action','Check In').text(MASystem.Labels.ActionFramework_Check_In);
                        $listButton.removeData().attr('data-action','Check In').text(MASystem.Labels.ActionFramework_Check_In);
                        MAToastMessages.showSuccess({message:MASystem.Labels.Checkin_Checkout_Success});
                        try { callback(response.checkInId); } catch (err) { MALog(window.formatLabel('Unable to perform check out callback: {0}', [err])); $('#CustomDispositionPopup #customDis-loadmask').hide();}
                        
                        
                        /* extract results from the reference record that may have just got updated with new activity information on the backend */
                        
                        // get back end record
                        var referenceBackendRecord = response.ReferenceObject;
                        
                        // get front end record
                        var referenceFrontendRecord = getProperty(queryData || {}, 'records.'+recordId);
                        
                        // update record with any new LastActivityDate information from the backend with help from tooltip information
                        updateRecordWithLastActivityDateFieldFromBackend(referenceFrontendRecord, referenceBackendRecord, queryData.tooltips);
                        
                        // rerender the updated record's marker which may now have new information that my change the marker
                        Plotting.updatePlottedQueryMarkerRecordInfo(referenceFrontendRecord);
                        VueEventBus.$emit('refresh-action-buttons');
                        $dfd.resolve(response);
                    } else {
                        $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                        //check if error msgs
                        var errorMsg = MASystem.Labels.Checkin_Field_Set_Error;
                        if(response.errMsgs) {
                            for(i=0; i < response.errMsgs.length;i++) {
                                errorMsg += '</br>' + response.errMsgs[i];
                            }
                        }
                        else { errorMsg = response.error; }
                        MAToastMessages.showError({message:MASystem.Labels.Checkin_Error_Checking_In, subMessage: errorMsg, timeOut:0, closeButton:true});  
                        $('#CustomDispositionPopup #customDis-loadmask').hide();
                        $dfd.reject(errorMsg);
                    }
                } else {
                    $dfd.reject(event.message);
                }
        	},{buffer:false,escape:false}
        );
    }
    return $dfd.promise();
}

function updateRecordWithLastActivityDateFieldFromBackend(frontendRecord, backendRecord, tooltips)
{
    if(frontendRecord && backendRecord && tooltips && typeof frontendRecord == 'object' && typeof backendRecord == 'object' && typeof tooltips == 'object')
    {
        // get last activity date from backend record
        if(backendRecord)
        {
            removeNamespace(backendRecord);
            var LastActivityDateString = backendRecord.LastActivityDate;
            var LastActivityDateMom = moment(LastActivityDateString, 'YYYY-MM-DD');
        }
        
        
        // get list of tooltips in record whose name is LastActivityDate, if any
        var lastActivityDateTooltips = [];
        
        // populate record tooltips
        if(frontendRecord)
        {
            lastActivityDateTooltips = (tooltips || []).filter(function(tooltip) {
                if(tooltip)
                {
                    return tooltip.ActualFieldName == 'LastActivityDate' || tooltip.FieldName == 'LastActivityDate';
                }
            });
        }
        
        // ony update record if we do actually have 'LastActivityDate' tooltip fields and the 'LastActivityDate' retreived from the backend after check in is valid
        if(LastActivityDateMom.isValid() && lastActivityDateTooltips.length > 0)
        {
            // loop through any LastActivityDate tooltips and update field value
            lastActivityDateTooltips.forEach(function(tooltip) {
                //update the actual field
                updateValue(frontendRecord, tooltip.FieldName, LastActivityDateMom.valueOf());
            });
        }
    }
}

function ShowCheckInDisposition(options) {
    var $dfd = $.Deferred();
    var $button = options.button;
    var recordOptions = options.record != undefined ? options : options.records[0];
    var record = recordOptions.record;
    var marker = recordOptions.marker;
    //verify the checkin location
    var requestData = {};
    
    //myCachedPositionInfo is populated from watchPosition
    if (myCachedPositionInfo != null)
    {
        var distance = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(myCachedPositionInfo.coords.latitude, myCachedPositionInfo.coords.longitude), marker.getPosition());
        requestData = {
            SavedQueryId: record.savedQueryId || '',
            id: MASystem.User.Id,
            lid:record.Id != undefined ? record.Id : getProperty(record,'record.Id',false) || '',
            tooltip1: marker.title || 'N/A',
            clat: String(myCachedPositionInfo.coords.latitude),
            clong: String(myCachedPositionInfo.coords.longitude),
            caccuracy: String(myCachedPositionInfo.coords.accuracy),
            length: String(distance)
        };
    }
    else {
        requestData = {
            SavedQueryId: record.savedQueryId || '',
            id: MASystem.User.Id,
            lid:record.Id != undefined ? record.Id : getProperty(record,'record.Id',false) || '',
            tooltip1: marker.title || 'N/A',
            clat: '',
            clong: '',
            caccuracy: '',
            length: ''
        };
    }
    MA.CheckIn.verifyCheckin(requestData).then(function(res) {
        if(res.success) {
            var $but = $('<button class="saveDisposition slds-button slds-button_brand">' + MASystem.Labels.MA_Finish + '</button>');
            if(res.settings && res.settings.CheckInPostTo && res.settings.CheckInPostTo.indexOf('Task') >= 0) {
                //show the disposition
                $('#CustomDispositionPopup .customDis-buttons .saveDisposition').remove();
                //var $but = $('<button class="saveDisposition MAbutton button-silver">' + MASystem.Labels.MA_Finish + '</button>');
                $('#CustomDispositionPopup .customDis-buttons').prepend($but)
                $('#customDis-loadmask').show();
                MALayers.showModal('CustomDispositionPopup')

                //show the disposition
                var fieldSetName = MA.CheckIn.general['Activity-FieldSet'];
                var platformOverride = true;
                $("#customDis-fieldset").empty();
                $.ajax({
					url: MA.resources.CustomDisposition,
					type: 'GET',
					dataType: 'HTML',
					data: {
						fieldset : fieldSetName,
						platform : (platformOverride ? 'desktop' : 'tablet'),
					}
				}).done(function(data,textStatus,res){
                    $('#customDis-loadmask').hide();
                    try{
                        var resText = res.responseText;
                        //remove sf page redirect injected code
                        resText = resText.replace('top.location=location;','console.log(e);');
                        $("#customDis-fieldset").html(resText);
                    }
                    catch (e){
                        MA.log('first failed',e);
                        try {
                            //Salesforce is trying to redefined a variable that results in type error
                            // fall back to javascript attempt
                            var jsSelector = $("#customDis-fieldset")[0];
                            jsSelector.innerHTML = res.responseText;
                        }
                        catch(e) {
                            MA.log('all failed',e);
                            //jquery and javascript failed
                            //need to stop and show error.
                            MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'});
                        }
                    }
                    //fill
                    try { $('#customDis-fieldset .fieldInput[data-field="Subject"]').find('.get-input').val('CheckIn @ ' + marker.title); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="Status"]').find('.get-input').val('Completed'); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutAccuracy"]+'"]').find('.get-input').val(myCachedPositionInfo.coords.accuracy); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutDate"]+'"]').find('.get-input').val(UserContext.today); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutDistanceFromRecord"]+'"]').find('.get-input').val(distance*0.000621371); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutLatitude"]+'"]').find('.get-input').val(myCachedPosition.lat()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutLongitude"]+'"]').find('.get-input').val(myCachedPosition.lng()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLatitude"]+'"]').find('.get-input').val(myCachedPosition.lat()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLongitude"]+'"]').find('.get-input').val(myCachedPosition.lng()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLocationAccuracy"]+'"]').find('.get-input').val(myCachedPositionInfo.coords.accuracy); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-DistanceFromRecord"]+'"]').find('.get-input').val(distance*0.000621371); } catch (err) {}
                });
                
                //handle finish button
                $but.on('click',function(e) {
                    //show loading
                    var classSelector = window.getProperty(e, 'currentTarget.classList', false);
                    classSelector = classSelector[0] || 'saveDisposition';
                    var $button = $('.' + classSelector);
                    $('#CustomDispositionPopup #customDis-loadmask').show();
                    $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').attr('disabled',true);
                    var fieldSetObject = buildFieldSetValues($('#customDis-fieldset'));
                    var fields = fieldSetObject.fields;
                    var FieldsFoundArray = fieldSetObject.FieldsFoundArray;
        
                    //convert fields to an array (this used to be the structure so for now it's easier to just convert back)
                    var fieldsArr = [];
                    $.each(fields, function (name, val) {
                        fieldsArr.push({ name: name, value: val });
                    });
                    fields = fieldsArr;
        
                    //extend our request data with the new fields and fieldset
                    requestData = $.extend(requestData , {fields : JSON.stringify(fields), fieldSet : MA.CheckIn.general['Activity-FieldSet']} );
                    $('#CustomDispositionPopup .customDis-buttons').data('dispositionData',requestData);
        
                    CheckIn(marker,function(response) {
                        var CheckInId = response.taskId || response.eventId;
                        
                        $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                        if (CheckInId) {
                            var isC2C = false;
                            if($button.hasClass('c2cAction')) {
                                isC2C = true;
                            }
                        
                            if (!MA.enabledFeatures.autoCheckOut) {
                                if(!isC2C) {
                                    $button.data('CheckInId', CheckInId).text(MASystem.Labels.ActionFramework_Check_Out).attr('data-action', 'Check Out');
                                }
                                else {
                                    //hide check in, show check out
                                    $button.hide();
                                    $button.closest('.buttons').find('.checkOut').show();
                                }
                            }
                            
                            //add this check in record to the raw plot data
                            if (CheckInId.substring(0,3) == '00T') {
                                if (!record.Tasks) { record.Tasks = []; }
                                record.Tasks.push({
                                    Id: CheckInId, 
                                    IsClosed: MA.enabledFeatures.autoCheckOut
                                });
                            }
                            else {
                                if (!record.Events) { record.Events = [];}
                                record.Events.push({
                                    Id: CheckInId,
                                    Subject: MA.enabledFeatures.autoCheckOut ? 'Check Out @' : 'Check In @'
                                });
                            }
                            $dfd.resolve(CheckInId);
                        } else {
                            $dfd.reject();
                        }
                        $('#CustomDispositionPopup #customDis-loadmask').hide();
                        //reset the disposistion
                        cancelDisposition();
                    });
                });
            }
            else {
                //do normal check in
                CheckIn(marker,function(response) {
                    $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                    var CheckInId = response.taskId || response.eventId;
                    if (CheckInId) {
                        var isC2C = false;
                        if($button.hasClass('c2cAction')) {
                            isC2C = true;
                        }
                    
                        if (!MA.enabledFeatures.autoCheckOut) {
                            if(!isC2C) {
                                $button.data('CheckInId', CheckInId).text(MASystem.Labels.ActionFramework_Check_Out).attr('data-action', 'Check Out');
                            }
                            else {
                                
                                //hide check in, show check out
                                $button.hide();
                                $button.closest('.buttons').find('.checkOut').show();
                            }
                        }
                        
                        //add this check in record to the raw plot data
                        if (CheckInId.substring(0,3) == '00T') {
                            if (!record.Tasks) { record.Tasks = []; }
                            record.Tasks.push({
                                Id: CheckInId, 
                                IsClosed: MA.enabledFeatures.autoCheckOut
                            });
                        }
                        else {
                            if (!record.Events) { record.Events = []; }
                            record.Events.push({
                                Id: CheckInId,
                                Subject: MA.enabledFeatures.autoCheckOut ? 'Check Out @' : 'Check In @'
                            });
                        }
                        $dfd.resolve(CheckInId);
                    } else {
                        $dfd.reject();
                    }
                    $('#CustomDispositionPopup #customDis-loadmask').hide();
                    //reset the disposistion
                    cancelDisposition();
                });
            }
        }
        else {
            MAToastMessages.showWarning({message : MASystem.Labels.Checkin_Error_Checking_In, subMessage: res.data});
            $dfd.reject();
        }
    });
    return $dfd.promise();
}

function ShowCheckOutDisposition (options) {
    var record = options.record;
    var marker = options.marker;
    var $button = options.button;
    var checkInId = options.checkinId || $button.data('CheckInId');

    //query for task id info, fields may be in field set
    var queryString = 'Select Subject,';
    var fieldsArr = [];
    for(key in MA.CheckIn.general) {
        var field = MA.CheckIn.general[key];
        if(key != 'AutoCheckOutEnabled' && key != 'Activity-FieldSet' && field != 'Select') {
            //queryString = queryString + ' ' + field+',';
            if($.inArray(field , fieldsArr) === -1) fieldsArr.push(field );
        }
    }
    queryString += fieldsArr.join();
    queryString = queryString.replace(/,\s*$/, ""); //remove last comma
    queryString += " From Task Where Id = '"+checkInId+"'";
    
    //changing this to use the TooltipAJAXResources VF page because of case 00007258
    //url: "/services/data/v34.0/query?q="+queryString,
    
    var processData = { 
    	ajaxResource : 'TooltipAJAXResources',
    	action	: 'do_query',
    	q : queryString
    };
    
    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
    	processData,
    	function(response, event) {
            if(response.records) {
                var record = response.records[0];
                //show the disposition
                $('#CustomDispositionPopup .saveDisposition').remove();
                var $but = $('<button class="slds-button slds-button_brand saveDisposition">' + MASystem.Labels.MA_Finish + '</button>');
                $('#CustomDispositionPopup .customDis-buttons').append($but);
                $('#customDis-loadmask').show();
                MALayers.showModal('CustomDispositionPopup');
    
                //show the disposition
                var fieldSetName = MA.CheckIn.general['Activity-FieldSet'];
                var platformOverride = true;
                $("#customDis-fieldset").empty();
                $.ajax({
					url: MA.resources.CustomDisposition,
					type: 'GET',
					dataType: 'HTML',
					data: {
						fieldset : fieldSetName,
                        platform : (platformOverride ? 'desktop' : 'tablet'),
					}
				}).done(function(data,textStatus,res){
                    $('#customDis-loadmask').hide();
                    try{
                        var resText = res.responseText;
                        //remove sf page redirect injected code
                        resText = resText.replace('top.location=location;','console.log(e);');
                        $("#customDis-fieldset").html(resText);
                    }
                    catch (e){
                        MA.log('first failed',e);
                        try {
                            //Salesforce is trying to redefined a variable that results in type error
                            // fall back to javascript attempt
                            var jsSelector = $("#customDis-fieldset")[0];
                            jsSelector.innerHTML = res.responseText;
                        }
                        catch(e) {
                            MA.log('all failed',e);
                            //jquery and javascript failed
                            //need to stop and show error.
                            MA.Popup.showLoading({display:false, popupId: 'CreateRecordPopupV2'});
                        }
                    }
                    //fill
                    try { $('#customDis-fieldset .fieldInput[data-field="Subject"]').find('.get-input').val(record.Subject); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="Status"]').find('.get-input').val('Completed'); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutAccuracy"]+'"]').find('.get-input').val(myCachedPositionInfo.coords.accuracy); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutDate"]+'"]').find('.get-input').val(UserContext.today); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutDistanceFromRecord"]+'"]').find('.get-input').val(distance*0.000621371); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutLatitude"]+'"]').find('.get-input').val(myCachedPosition.lat()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CheckOutLongitude"]+'"]').find('.get-input').val(myCachedPosition.lng()); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLatitude"]+'"]').find('.get-input').val(record[MA.CheckIn.general["Activity-CreatedLatitude"]]); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLongitude"]+'"]').find('.get-input').val(record[MA.CheckIn.general["Activity-CreatedLongitude"]]); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-CreatedLocationAccuracy"]+'"]').find('.get-input').val(record[MA.CheckIn.general["Activity-CreatedLocationAccuracy"]]); } catch (err) {}
                    try { $('#customDis-fieldset .fieldInput[data-field="'+MA.CheckIn.general["Activity-DistanceFromRecord"]+'"]').find('.get-input').val(record[MA.CheckIn.general["Activity-DistanceFromRecord"]]); } catch (err) {}
                });
    
                $but.on('click',function() {
                    //get the field data
                    $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').attr('disabled',true);
                    var fieldSetObject = buildFieldSetValues($('#CustomDispositionPopup .CustomDispositionFormTable'));
                    var fields = fieldSetObject.fields || {};
                    
                    //convert fields to an array (this used to be the structure so for now it's easier to just convert back)
                    var fieldsArr = [];
                    $.each(fields, function (name, val) {
                        fieldsArr.push({ name: name, value: val });
                    });
                    fields = fieldsArr;
                    
                    //store the request data for saving
                    var dispositionData = {fields : JSON.stringify(fields), fieldSet : MA.CheckIn.general['Activity-FieldSet']};
                    $('#CustomDispositionPopup .customDis-buttons').data('dispositionData',dispositionData);
    
                    CheckOut(marker, checkInId, function(CheckInId) {
                        $('#CustomDispositionPopup').find('.customDis-buttons .saveDisposition').removeAttr('disabled');
                        var isC2C = false;
                        if($button.hasClass('c2cAction')) {
                            isC2C = true;
                        }
    
                        if(!isC2C) {
                            if (MA.isMobile) {
                                $button.find('.action-bar-button-text').text('Check In');
                            } else {
                                $button.text('Check In');
                            }
                            $button.data('CheckInId', null);
                        }
                        else {
                            //hide check in, show check out
                            $button.data('CheckInId', null).hide();
                            $button.closest('.buttons').find('.checkIn').show();
                        }
    
                        //update this check in record in the raw plot data
                        if (CheckInId.indexOf('00T') == 0) {
                            var rec = options.record;
                            jQuery.each(rec.Tasks, function (index, task) {
                                if (task.Id == CheckInId) {
                                    task.IsClosed = true;
                                    return false;
                                }
                            });
                        }
                        else {
                            jQuery.each(rec.Events, function (index, event) {
                                if (event.Id == CheckInId) {
                                    event.Subject = event.Subject.replace('Check In @', 'Check Out @');
                                    return false;
                                }
                            });
                        }
                        $('#CustomDispositionPopup #customDis-loadmask').hide();
                        //reset the disposistion
                        cancelDisposition();
                    });
                });
            }
    	},{buffer:false,escape:false}
    );
}

function cancelDisposition () {
    //clear the inputs
    $('#CustomDispositionPopup .get-input').val('');
    $('#CustomDispositionPopup').find('.customDis-buttons button').removeAttr('disabled');
    //remove data
    $('#CustomDispositionPopup .customDis-buttons').removeData('dispositionData');

    //close the popup
    MALayers.hideModal('CustomDispositionPopup',true);
}