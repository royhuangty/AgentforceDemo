var MAData = {
    CensusLayer: null,
    Markers: [],
     
    groupByData: null,
    sandbox: false,
    
    unit: '',
    
    markerLimit: 100,
    markerImage: 'oil',

    createRecordFromDataLayer: {
        getDataLayerc2cOptions : function () {
            //clear the previous options
            var $selectList = $('#dataLayerSelction .createrecordDataLayer2-dataType').empty();
            
            //loop over queries to ge types
            var layers = $('#PlottedQueriesTable .DataLayer');
            var lI = layers.length;
            var tempOptions = {};
            var selectOptionsHTML = '';
            while(lI--) {
                var $layer = $(layers[lI]);
                var layerType = $layer.attr('data-type');
                var layerName = $layer.find('.basicinfo-name').text();
                var qid = $layer.attr('qid');
                
                // now support all data types, removing previous mapping
                
                selectOptionsHTML += '<option data-uid="'+qid+'" value="'+layerType+'">'+layerName+'</options>';
            }
            $selectList.append(selectOptionsHTML);
            selectOptionsHTML = null;
            tempOptions = null;
            layers = null;
            
        },
        
        cancel_Record : function () {
            ClosePopupWindow();
            
            //reset all values
            $('#CreateRecordDataLayerPopup .createrecord-step').show();
            $('#createrecordDataLayer-step2').hide();
        },
        
        launch_popupV2 : function (options) {
            options = $.extend({
                isMassAction : false,
                dataLayers : []
            }, options || {});
            if(!options.layerType) {
                return;
            }
            
            // this existed to fix SF overwritting native Map var, removing on 1/29/18
            // try {
            //     //if not lightning, clear out the map
            //     if(typeof Map === 'function' && (typeof sforce === 'object' && !sforce.one)) {
            //         Map = undefined;
            //     }
            // }
            // catch(e) {}
            
            var popup;
            if(MA.isMobile) {
                //reset the popup
                var $c2cPopup = $('#createDataLayerRecordV2');
                $c2cPopup.find('.step2').addClass('hidden');
                $c2cPopup.find('.step1').removeClass('hidden');
                $c2cPopup.find('.createrecordDataLayer2-step1').show();
                $c2cPopup.find('.createrecordDataLayer2-step2').hide();
                $c2cPopup.find('.c2cLoadingWrapper').hide();
                MALayers.showModal('createDataLayerRecordV2');
            }
            else {
                var popup = MA.Popup.showMAPopup({
                    template: $('#templates .CreateRecordDataLayerPopup2').clone(),
                    popupId : 'createDataLayerRecordV2',
                    width : 600,
                    title: MASystem.Labels.Click2Create_CreateARecord,
                    buttons: [
                        {
                            text: MASystem.Labels.MA_Next,
                            type: 'slds-button_brand step1',
                            keepOpen : true,
                            onTap: function(e) {
                                //get the password and name
                                MAData.createRecordFromDataLayer.create_step_2_V2();
                            }
                        },
                        {
                            text: MASystem.Labels.MA_Create_Record,
                            type: 'slds-button_brand step2 hidden savec2c',
                            keepOpen : true,
                            //keepOpen : true,
                            onTap: function(e) {
                                MAData.createRecordFromDataLayer.saveDataLayerRecordV2();
                            }
                        },
                        { 
                            text: MASystem.Labels.MA_Cancel,
                            type: 'slds-button_neutral',
                        }
                    ]
                });
            }
            var $popup = $('#createDataLayerRecordV2');
            
            $popup.find('.MA2-loading-mask').removeClass('hidden');
            $popup.find('.savec2c').attr('disabled',true);
            $popup.removeData();
            $popup.data({'popup':popup,'isMassAction': options.isMassAction,'dataLayers': options.dataLayers,'dataType' : options.layerType});
            
            //get data
            var processData = { 
            	ajaxResource : 'TooltipAJAXResources',
            	action	: 'getClick2CreateDataLayerSettings',
            	dataType : options.layerType
            };
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            	processData,
            	function(response, event) {
                    if (response.success) {
                        //launch the popup
                        var $objectPicklist = $popup.find('.createrecordDataLayer2-object').empty();
                        $popup.find('.createrecordDataLayer2-fieldset-errors').empty().hide();
                         //try to parse the data
                        if(response.data) {
                            var data = MA.Util.removeNamespace(response.data);
                            try {
                                var settings = JSON.parse(data.Settings__c);
                                $popup.data('settings',settings);
                                //add options to select list for available base objects
                                var c2cSettings = settings['C2C'];
                                
                                for (var key in c2cSettings) {
                                    var baseObjData = c2cSettings[key];
                                    $objectPicklist.append($('<option />').attr('value', key).text(baseObjData.objLabel));
                                }
                                
                            }
                            catch(e){
                                MA.log(e);
                            }
                        }
                        if(response.settings) {
                            //if we have settings we were able to update the record settings, otherwise use the backup saved in settins__c (legacy)
                            $popup.data('recordTypes',response.settings);
                        }
                        
                        //update the record types
                        MAData.createRecordFromDataLayer.object_Change_V2();
                        $popup.find('.MA2-loading-mask').addClass('hidden');
                        $popup.find('.savec2c').removeAttr('disabled');
                        
                    }
                    else if (!response.success) {
                        if(MA.isMobile) {
                            MALayers.hideModal();
                        }
                        else {
                            popup.close();
                        }
                        //show error message
                        MA.Popup.showMAAlert({
                            title: MASystem.Labels.Almost_There,
                            template: response.message,
                            okText :  MASystem.Labels.MA_Ok,
                            okType : 'slds-button_brand'
                        });
                    }
                    else {
                        if(MA.isMobile) {
                            MALayers.hideModal();
                        }
                        else {
                            popup.close();
                        }
                        MA.Popup.showMAAlert({
                            title: MASystem.Labels.Almost_There,
                            template: MASystem.Labels.MA_Something_Went_Wrong,
                            okText : MASystem.Labels.MA_Ok,
                            okType : 'slds-button_brand'
                        });
                    }
                },{escape:false,buffer:false}
            );
        },
        
        create_step_2_V2 : function () {
            //grab the popup data again
            var $popup = $('#createDataLayerRecordV2');
            $popup.find('.MA2-loading-mask').addClass('hidden');
            var settings = $popup.data('settings');
            var c2cSettings = settings['C2C'];
            var currentSelection = $popup.find('.createrecordDataLayer2-object').val();
            var objc2cSettings = c2cSettings[currentSelection];
            var recordTypes = objc2cSettings.recordTypes;
            var fieldSetOptions = objc2cSettings.fieldSetOptions;
            var fieldSetName = 'missing';
            //grab the fieldset for the selected record type
            var recordTypeId = $popup.find('.createrecordDataLayer2-recordtype').val();
            
            //loop over fieldsets
            for (var f = 0; f < fieldSetOptions.length; f++) {
                var fs = fieldSetOptions[f];
                
                if(fs.RecordTypeId == recordTypeId) {
                    fieldSetName = fs.FieldSetAPIName;
                }
            }
            if(fieldSetName == 'missing' && fieldSetOptions.length > 0){
                var fs = fieldSetOptions[0];
                fieldSetName = fs.FieldSetAPIName;     
            }
            //hide the step 1 button , show step 2
            $popup.find('.step1').addClass('hidden');
            $popup.find('.createrecordDataLayer2-step1').hide();
            $popup.find('.step2').removeClass('hidden');
            $popup.find('.createrecordDataLayer2-step2').show();
            $popup.find('.savec2c').attr('disabled',true);
            
            $popup.find('.createrecordDataLayer-fieldset').html(MASystem.Labels.MA_Loading);
            
            $.ajax({
                url: MA.resources.Click2Create,
                type: 'GET',
                dataType: 'HTML',
                data: {
                    sobject : $popup.find('.createrecordDataLayer2-object').val(),
                    fieldset : fieldSetName,
                    recordtypeid :  (recordTypeId || ''),
                    platform : (MA.IsMobile ? 'tablet' : 'desktop')
                }
            })
            .done(function (data,textStatus,res) {
                
                $popup.find('.createrecordDataLayer-fieldset').html(res.responseText);
                
                if(!$popup.data('isMassAction')){
                    //build json data to send
                    var jsonData = {
                        uIds : [],
                        tableNames : [],
                        sfdcData : [],
                        topicData : [],
                        dataType : $('#createDataLayerRecordV2').data('dataType')
                    }
                    var markers = $popup.data('dataLayers') || [];
                    var mI = markers.length;
                    while(mI--) {
                        var marker = markers[mI];
                        jsonData.uIds.push(marker.data.uid);
                        //jsonData.tableNames.push('dbusa-v1');
                    }
                
                    if(objc2cSettings.fields) {
                        var fields = objc2cSettings.fields;
                        //loop over the saved data layer fields and try to update
                        for(var key in fields) {
                            var field = fields[key];
                            if(field != null && field != '') {
                                var phpFix = key.replace('dmp_','');
                                jsonData.topicData.push({topic_id:phpFix,field:field});
                            }
                        }
                    }
                
                    //get data
                    var $status = showLoading($popup.find('.CreateRecordDataLayerPopup2'),MASystem.Labels.MA_Loading_With_Ellipsis);
                    MAData.createRecordFromDataLayer.getC2CDataFromServer(jsonData).then(function(res) {
                        $popup.find('.savec2c').removeAttr('disabled');
                        hideMessage($status);
                        if(res.success) {
                            var markerData = res.data[0];
                            for(var sfdcId in markerData) {
                                var fieldValue = markerData[sfdcId];
                                //try and find a matching field
                                try {
                                    var $input = $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="'+sfdcId+'"]');
                                    var $row = $input.closest('tr');
                                    $row.addClass('autoPopDataLayer');
                                    
                                    //fill in the rows
                                    if($input.length > 0) {
                                        if(!$popup.data('isMassAction')){
                                            $input.find('.get-input').val(fieldValue);
                                        }
                                    }
                                    else {
                                        //append to bottom hidden
                                        var rowTemp = '<tr style="display:none;"><td class="field::'+sfdcId+' fieldInput" data-field="'+sfdcId+'" data-type="string"><input class="get-input '+sfdcId+'" value="'+fieldValue+'"/></td></tr>';
                                        $popup.find('.createrecordDataLayer-fieldset .fieldSetTable').append(rowTemp);
                                    }
                                }
                                catch(e) {
                                    
                                }
                            }
                        }
                        
                        //update the lat lng fields
                        //if(!$popup.data('isMassAction')){
                            try { $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="maps__Geolocation_Longitude__s"]').find('.get-input').val(markerInfo.markerData.lng); } catch (err) {}
                            try { $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="maps__Geolocation_Latitude__s"]').find('.get-input').val(markerInfo.markerData.lat); } catch (err) {}
                            try { $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="maps__MALongitude__c"]').find('.get-input').val(markerInfo.markerData.lng); } catch (err) {}
                            try { $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="maps__MALatitude__c"]').find('.get-input').val(markerInfo.markerData.lat); } catch (err) {}
                        //}
                        
                        $popup.find('.MA2-loading-mask').remove('hidden');
                    });
                }
                else {
                    if(objc2cSettings.fields) {
                        var fData = objc2cSettings.fields;
                        //loop over the saved data layer fields and try to update
                        for(var id in fData) {
                            var fieldData = fData[id];
                                                        
                            // this will add the + symbol letting users know it will be auto populated
                            var $input = $popup.find('.createrecordDataLayer-fieldset .fieldInput[data-field="'+fieldData+'"]');
                            var $row = $input.closest('.c2cRow');
                            $row.addClass('autoPopDataLayer');
                            var $rowLabel = $input.closest('.slds-form-element').find('.fieldLabel');
                            $rowLabel.prepend('<abbr><sup>+</sup></abbr>');
                        }
                    }
                    $popup.find('.savec2c').removeAttr('disabled');
                }
            })
            .fail(function (err) {
                MA.log(err);
                //callback(res);
            });
            
        },
        
        getC2CDataFromServer : function (json) {
            var dfd = $.Deferred();
            var options = { 
                action: 'c2c',
                subType : 'data',
                version : '2'
            };
            // check for legacy field names and try to update
            var dataSource = MAData.legacyDataLayerMap[json.dataType] || json.dataType || '';
            MAData.getDataLayerFieldsFromMAIO(dataSource).then(function(sources) {
                var oldValues = json.topicData || [];
                json.dataType = dataSource;
                json.topicData = MAData.legacySourceDataLayer(sources,oldValues);
            }).fail(function(err) {
                console.warn(err);
            }).always(function() {
                var jsonParams = JSON.stringify(json);
            
                Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequestPOST,
                    options ,
                    jsonParams,
                    function(res, event){
                        if(event.status) {
                            if(res && res.success) {
                                //double data in object (legacy), check levels just in case
                                var data = getProperty(res,'data.data',false);
                                if(data != undefined) {
                                    dfd.resolve(res.data);
                                }
                                else {
                                    dfd.resolve(res);
                                }
                            }
                            else {
                                var errMsg = res != undefined ? (res.error || MASystem.Labels.Common_Refresh_And_Try_Again) : MASystem.Labels.Common_Refresh_And_Try_Again;
                                dfd.resolve({success:false,error:errMsg});
                            }
                        }
                        else {
                            var errMsg = event.message || MASystem.Labels.Common_Refresh_And_Try_Again;
                            dfd.resolve({success:false,error:errMsg});
                        }
                    },{buffer:false,escape:false,timeout:120000}
                );
            });
            
            
            return dfd.promise();
        },
        
        object_Change_V2 : function () {
            var $popup = $('#createDataLayerRecordV2');
            
            var settings = $popup.data('settings');
            var c2cSettings = settings['C2C'];
            var currentSelection = $popup.find('.createrecordDataLayer2-object').val();
            var objc2cSettings = c2cSettings[currentSelection];
            
            //empty the recordType Selection and update
            var $recordTypePicklist = $popup.find('.createrecordDataLayer2-recordtype').empty();
            //check if we were able to get updated recordTypes
            try {
                var recordTypesObj = $popup.data('recordTypes');
                recordTypesObj = recordTypesObj[currentSelection];
                recordTypes = recordTypesObj.recordTypes;
                for (var rt = 0; rt < recordTypes.length; rt++) {
                    var redtype = recordTypes[rt];
                    if(redtype.available) {
                        var name = redtype.master === true ? redtype.name + ' (System Default)' : redtype.name;
                        $recordTypePicklist.append($('<option />').attr('value', redtype.recordTypeId).text(name));
                    }
                }
            }
            catch(e) {
                //legacy
                recordTypes = objc2cSettings.recordTypes;
                
                for (var r = 0; r < recordTypes.length; r++) {
                    var rtype = recordTypes[r];
                    $recordTypePicklist.append($('<option />').attr('value', rtype.id).text(rtype.label));
                }
            }
        },

        create_step_2 : function () {
            //grab the popup data again
            var $popup = $('#CreateRecordDataLayerPopup');

            var settings = $popup.data('settings');
            var c2cSettings = settings['C2C'];
            var currentSelection = $popup.find('#createrecordDataLayer-object').val();
            var objc2cSettings = c2cSettings[currentSelection];
            var recordTypes = objc2cSettings.recordTypes;
            var fieldSetOptions = objc2cSettings.fieldSetOptions;
            
            //grab the fieldset for the selected record type
            var recordTypeId = $('#createrecordDataLayer-recordtype').val();
            var fieldSetName = 'missing';
            
            //loop over fieldsets
            for (var f = 0; f < fieldSetOptions.length; f++) {
                var fs = fieldSetOptions[f];
                
                if(fs.RecordTypeId == recordTypeId) {
                    fieldSetName = fs.FieldSetAPIName;
                }
            }
            if(fieldSetName == 'missing' && fieldSetOptions.length > 0){
                var fs = fieldSetOptions[0];
                fieldSetName = fs.FieldSetAPIName;     
            }
            //grab the marker data
            var markerData = MA.demographicsInfoBubble.markerData;
            
            $('#CreateRecordDataLayerPopup .createrecord-step').hide();
            $('#createrecordDataLayer-step2').show();
            $('#createDataLayerRecordV2 .MA2-loading-mask').removeClass('hidden');
            $popup.find('.savec2c').attr('disabled',true);
            
            $("#createrecordDataLayer-fieldset").html(MASystem.Labels.MA_Loading_With_Ellipsis).load(MA.resources.Click2Create, "sobject=" + $('#createrecordDataLayer-object').val() + '&fieldset=' + fieldSetName + '&recordtypeid=' + (recordTypeId || '') + '&platform=desktop', function () {
                //update fields
                $('#createDataLayerRecordV2 .MA2-loading-mask').addClass('hidden');
                $popup.find('.savec2c').removeAttr('disabled');
                if(objc2cSettings.fields) {
                    var fields = objc2cSettings.fields;
                    //loop over the saved data layer fields and try to update
                    for(var key in fields) {
                        var field = fields[key];
                        //try and find a matching field
                        try {
                            var $input = $('#createrecordDataLayer-fieldset .fieldInput[data-field="'+field+'"]');
                            
                            //insert the default data for these
                            for(var t = 0; t < markerData.tabs.length; t++) {
                                //loop over these values 
                                var tab = markerData.tabs[t];
                                for(var tt = 0; tt < tab.values.length; tt++) {
                                    var value = tab.values[tt];
                                    if(key == value.topic_id) {
                                        if($input.length > 0) {
                                            $input.find('.get-input').val(value.value);
                                        }
                                        else {
                                            //append to bottom hidden
                                            var rowTemp = '<tr style="display:none;"><td class="field::'+field+' fieldInput" data-field="'+field+'" data-type="string"><input class="get-input '+field+'" value="'+value.value+'"/></td></tr>';
                                            $('#createrecordDataLayer-fieldset .fieldSetTable').append(rowTemp);
                                        }
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }
                
                //update the lat lng fields
                try { jQuery('#createrecordDataLayer-fieldset .fieldInput[data-field="maps__Geolocation_Longitude__s"]').find('.get-input').val(markerData.marker.markerData.lng); } catch (err) {}
                try { jQuery('#createrecordDataLayer-fieldset .fieldInput[data-field="maps__Geolocation_Latitude__s"]').find('.get-input').val(markerData.marker.markerData.lat); } catch (err) {}
                try { jQuery('#createrecordDataLayer-fieldset .fieldInput[data-field="maps__MALongitude__c"]').find('.get-input').val(markerData.marker.markerData.lng); } catch (err) {}
                try { jQuery('#createrecordDataLayer-fieldset .fieldInput[data-field="maps__MALatitude__c"]').find('.get-input').val(markerData.marker.markerData.lat); } catch (err) {}
                
            });    
        },
        
        saveDataLayerRecordV2 : function () {
            var $popup = $('#createDataLayerRecordV2');
            var isMassAction = $('#createDataLayerRecordV2').data('isMassAction');
            var dataLayers = $('#createDataLayerRecordV2').data('dataLayers');
            var settings = $popup.data('settings');
            var c2cSettings = settings['C2C'];
            var currentSelection = $popup.find('.createrecordDataLayer2-object').val();
            var objc2cSettings = c2cSettings[currentSelection];
            var recordTypes = objc2cSettings.recordTypes;
            var fieldSetOptions = objc2cSettings.fieldSetOptions;
            
            //grab the fieldset for the selected record type
            var recordTypeId = $popup.find('.createrecordDataLayer2-recordtype').val();
            var fieldSetName = 'missing';
            
            //grab the marker data
            //var markerData = MA.demographicsInfoBubble.markerData;
            
            //loop over fieldsets
            for (var f = 0; f < fieldSetOptions.length; f++) {
                var fs = fieldSetOptions[f];
                
                if(fs.RecordTypeId == recordTypeId) {
                    fieldSetName = fs.FieldSetAPIName;
                }
            }
            if(fieldSetName == 'missing' && fieldSetOptions.length > 0){
                var fs = fieldSetOptions[0];
                fieldSetName = fs.FieldSetAPIName;
            }
            $('#createDataLayerRecordV2 .MA2-loading-mask .updateText').text('Retrieving Data...');
            $('#createDataLayerRecordV2 .MA2-loading-mask').removeClass('hidden');
            $popup.find('.savec2c').attr('disabled',true);
            
            //now grab fields from the field set
            var sfdcFieldData = [];
            var FieldsFoundArray = [];
            $popup.find('.createrecordDataLayer-fieldset [class^="field::"]').each(function () 
            {
                var fieldName = $(this).attr('data-field');
                var fieldType = $(this).attr('data-type');
                FieldsFoundArray.push(fieldName);
                var fieldObj = {
                    field : fieldName,
                    fieldType : fieldType,
                    value : ''
                };
                var value = '';
                if (fieldType) {
                    fieldType = fieldType.toLowerCase();
                }
                if(fieldType == 'picklist' && !$(this).find('select').is(':disabled')) {
                    //find the select value
                    value = $(this).find('select').val();
                }
                // this may be needed later on when expanding the datetime field to select time
                // else if(fieldType == 'datetime') {
                //     var date = $(this).find('.datepicker').val();
                //     var hr = $(this).find('.hr').val();
                //     var min = $(this).find('.min').val();
        
                //     var timeType = getProperty(MASystem, 'User.timeFormat');
                //     var showAM_PM = timeType === 'hh:mm a' || timeType === 'h:mm a';
                //     var part = showAM_PM ? $(this).find('.am-pm').val() : undefined;
        
                //     var timeString = (part) ? hr + ':' + min + ' ' + part.toLowerCase() : hr + ':' + min;
                //     var timeFormat = (part) ? 'hh:mm a' : 'HH:mm';
                //     var inputFormat = formatUserLocaleDate({datepicker : true}).replace('yy', 'YYYY').replace('mm', 'MM').replace('dd', 'DD') + ' ' + timeFormat;
                //     var outputFormat = formatUserLocaleDate({moment: true});
                //     var dateTime = moment(date + ' ' + timeString, inputFormat).format(outputFormat);
                //     value = (dateTime !== 'Invalid date' && dateTime !== 'invalid date') ? dateTime : '';
                // }
                else if (fieldType == 'reference') 
                {
                    if($(this).find('select').length === 0 && $(this).find('input').val() != '000000000000000') 
                    {
                        value = $(this).find('input').val();
                    }
                    else if($(this).find('select').length == 1 && $(this).find('span.lookupInput').length == 1) 
                    {
                        if($(this).find('input').val() == '000000000000000') {
                            value = '';
                        }
                        else {
                            value = $(this).find('input').val();
                        }
                    }
                    else 
                    {
                        value = $(this).find('select').val();
                    }
                }
                else if (fieldType == 'boolean') {
                    if($(this).find('input').is(':checked')) {
                        value = 'true';
                    }
                    else {
                        value = 'false';
                    }
                }
                else 
                {
                    value = $(this).find('.get-input').val();
                }
        
                //if(value != '' && value != undefined)
                if(value != undefined && value != null && value != 'null' && value != '') // we should handle this check in the backend.
                {
                    fieldObj.value = value;
                    sfdcFieldData.push(fieldObj);
                }
            });
            
            var jsonData = {
                uIds : [],
                tableNames : [],
                sfdcData : sfdcFieldData,
                topicData : [],
                dataType : $('#createDataLayerRecordV2').data('dataType')
            }
            var markers = $popup.data('dataLayers') || [];
            var mI = markers.length;
            while(mI--) {
                var marker = markers[mI];
                jsonData.uIds.push(marker.data.uid);
                //jsonData.tableNames.push(marker.data.marker.table);
            }
        
            if(objc2cSettings.fields) {
                var fields = objc2cSettings.fields;
                //loop over the saved data layer fields and try to update
                for(var key in fields) {
                    var field = fields[key];
                    if(field != null && field != '') {
                        var phpFix = key.replace('dmp_','');
                        jsonData.topicData.push({topic_id:phpFix,field:field});
                    }
                }
            }
            
            //queue the data in chunks
            MAData.createRecordFromDataLayer.getC2CDataFromServer(jsonData).then(function(res) {
                var arrayOfRecords = [];
                var tempArray = [];
                var ID_CHUNK_SIZE = 50;
                // this is a big TODO/Fix
                // since the MAIO endpoint will accept '' to override auto populate data, we have to make sure all fields are passed once we get data back from them
                // this requires another loop

            
                //Split the Ids returned in the Id only query into groups of ID_CHUNK_SIZE
                if(res && res.success && res.data.length > 0){
                    var allRecordsCount = res.data.length;
                    for(var d = 0; d < allRecordsCount; d++){
                        var record = res.data[d];
                        // make sure all fields are present
                        for (var f = 0; f < FieldsFoundArray.length; f++) {
                            var fieldToUpdate = FieldsFoundArray[f];
                            if (!record[fieldToUpdate]) {
                                record[fieldToUpdate] = '';
                            }
                        }
                        tempArray.push(res.data[d]);
        
                        if(tempArray.length == ID_CHUNK_SIZE){
                            arrayOfRecords.push(tempArray);
                            tempArray = [];
                        }
                    }
        
                    //Add any ids from the last loop that may not have hit ID_CHUNK_SIZE array size
                    if(tempArray.length > 0){
                        arrayOfRecords.push(tempArray);
                    }   
                    
                    //Build the results object and then send this
                    var results = {
                        errors : [],
                        warnings : [],
                        totals : {
                            success : 0,
                            failure : 0
                        },
                        failures : [],
                        records : [],
                        remaining : res.data.length
                    };
                    var apexError = {
                        hasError : false,
                        msg : ''
                    };
                    var q = async.queue(function (options, callback) {
                        var processData = { 
                        	ajaxResource : 'TooltipAJAXResources',
                        	action	: 'getClick2CreateDataLayerSettings',
                        	dataType : options.layerType
                        };
                        
                        $.extend(options, {
                            ajaxResource : 'TooltipAJAXResources',
                        	action	: 'createDataLayerRecordV2'
                        });
                        
                        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                        	options,
                        	function(res, event) {
                        	    if(event.status) {
                                    if(res.success) {
                                        //get the data
                                        if(res.data) {
                                            var data = res.data;
                                            var totals = data.totals || {success : 0, failure : 0};
                                            //add these to main results
                                            results.errors = results.errors.concat(data.errors || []);
                                            results.warnings = results.warnings.concat(data.warnings || []);
                                            results.failures = results.failures.concat(data.failures || []);
                                            results.records = results.records.concat(data.records || []);
                                            results.totals.success += totals.success;
                                            results.totals.failure += totals.failure;
                                            
                                            //update status
                                            
                                            var remaining = results.remaining - (totals.success + totals.failure);
                                            $('#createDataLayerRecordV2 .MA2-loading-mask .updateText').text(window.formatLabel(MASystem.Labels.DataLayer_Adding_Records[remaining, allRecordsCount]));
                                        }
                                        callback({success:true});
                                    }
                                    else {
                                        callback({success:false});    
                                    } 
                        	    }
                        	    else {
                        	        callback({success:false});  
                        	    }
                        	},{escape:false,buffer:false,timeout:120000}
                        );
                    });
                    q.concurrency=5;
                    
                    //create queue
                    for(var i = 0; i < arrayOfRecords.length; i++){
                        //Clone the options object
                        //var queryOptions = layerOptions;
                        var ajaxData = {
                            objectType: $popup.find('.createrecordDataLayer2-object').val(),
                            recordTypeId: $popup.find('.createrecordDataLayer2-recordtype').val() || '',
                            fieldSetName: fieldSetName,
                            jsonData :  JSON.stringify(arrayOfRecords[i])
                        }

                        //Add to the queue, will a call back to handle errors
                        q.push(ajaxData,function(res){
                            if(!res.success){
                                //clear out remaining tasks because all attempts will fail
                                apexError.msg = res.error || MASystem.Labels.MA_Something_Went_Wrong;
                                var totals = results.totals;
                                apexError.hasError = true;
                                q.tasks = [];
                            }
                        });
                    }
                    
                    q.drain = function(){
                        //close this popup and open another with more data about success if mass action
                        var popupData = $('#createDataLayerRecordV2').data();
                        var popup = popupData.popup;
                        if(MA.isMobile) {
                            MALayers.hideModal();
                        }
                        else {
                            popup.close();
                        }
                        
                        var totals = results.totals;
                        var errors = results.errors;
                        var warnings = results.warnings;
                        var records = results.records;
                            
                        if(apexError.hasError) {
                            var bodyHTML = '<div class="info-header" style="font-weight:bold; text-align: center;"><span style="font-size:24px;" class="MAIcon ion-android-sad"></span> Oh snap, something went wrong</div>'+
                                            '<div class="msg-wrap" style="max-height:400px;overflow:auto; padding: 15px 0;">'+
                                                '<div style="text-align: center;" class="errors-wrap">'+apexError.msg+'</div>'+
                                                '<div style="text-align: center;" class="errors-wrap">'+totals.success+' successful, '+totals.failure+' failures</div>'+
                                            '</div>';
                                            
                            var confirmPopup = MA.Popup.showMAAlert({
                                title: 'Click2Create&trade; Error',
                                template: bodyHTML,
                                cancelText : 'Close',
                                width: 300
                            });
                        }
                        else {
                            if((!popupData.isMassAction || popupData.dataLayers.length == 1) && records.length == 1) {
                                var record = records[0];

                                if (MA.getProperty(MASystem, 'Organization.DisableClick2CreateMarkers') !== true) {// look for a native boolean true value
                                    MAData.createC2CDLIcon(popupData, record.id);
                                } else {
                                    NotifySuccess(MASystem.Labels.MA_Record_Was_Created);
                                }
                            }
                            else {
                                //create a popup with more info
                                //check if any warnings
                                var warningHTML = '';
                                var warningDisplay = 'none';
                                if(warnings.length>0) {
                                    warningDisplay = 'block';
                                    var warn = warnings[0];
                                    warningHTML += '<div>'+warn+'</div>'
                                }
                                else {
                                    warningHTML += '<div>No warnings to report.</div>';
                                }
                                var errorsHTML = '';
                                var errorDisplay = 'none';
                                if(errors.length>0) {
                                    for(var e = 0; e < errors.length; e++) {
                                        errorDisplay = 'block';
                                        if(e === 20) {break;}
                                        var err = errors[e];
                                        errorsHTML += '<div>'+err+'</div>';
                                    }
                                }
                                else {
                                  errorsHTML  += '<div>No errors to report.</div>';
                                }
                                //build the popup body
                                bodyHTML = '<div class="info-header" style="font-weight:bold;text-align:center;">' + window.formatLabel(MASystem.Labels.DataLayer_Successfully_Created_x_Records, [totals.success, totals.failure]) + '</div>'+
                                            '<div class="msg-wrap" style="max-height:400px;overflow:auto; padding: 15px 0;">'+
                                                '<div class="errors-wrap" style="margin-bottom: 15px; display:'+errorDisplay+';"><div style="font-weight:bold;color:#CB2929;">Errors:</div>'+errorsHTML+'</div>'+
                                                '<div class="warnings-wrap" style="display:'+errorDisplay+';"><div style="font-weight:bold; color: #c93;">Warnings:</div>'+warningHTML+'</div>'+
                                            '</div>';
                                //open new popup with more info
                                var confirmPopup = MA.Popup.showMAAlert({
                                    title: 'Click2Create&trade; Results',
                                    template: bodyHTML
                                });
                            }
                        }
                    }
                }
                else {
                    var errMsg = res.error || MASystem.Labels.Common_Refresh_And_Try_Again;
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:errMsg,timeOut:0,extendedTimeOut:0,closeButton:true});
                }
            });
        },
        marker_Click : function (options) {
            options = $.extend({
                marker: this,
                record: this,
                type: 'c2c-marker'
            }, options || {});
        
            if(MA.isMobile) {
                window.VueEventBus.$emit('show-marker-tooltip',true, options);
            }
        },
    },
    
    createC2CDLIcon: function (popupData, recordId) {
        //get the first record
        var dataLayerInfo = popupData.dataLayers[0];
        recordId = recordId || '';
        var recordName = dataLayerInfo.title || '';
        var markerShape = MA.Marker.shapes['Favorite'];
        var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
        var markerURL = MAIO_URL + '/images/marker/3?color=FF8800&forlegend=false&icon=Favorite';
        var marker = new google.maps.Marker({
            map: MA.map,
            position: dataLayerInfo.getPosition(),
            icon: {
                url: markerURL,
                anchor: markerShape.anchor
            },
            cursor: 'pointer',
            zIndex: 1000,
            title: recordName,
            record: { record: { Id: recordId } },
            name: recordName,
            address: '',
            location: {
                coordinates: dataLayerInfo.data.position
            },
        });

        reverseGeocode({
            latLng: dataLayerInfo.getPosition(),
            complete: function(response) {
                if (response.success && response.results.length > 0) {
                    var result = response.results[0];
                    var formattedAddress = result.formatted_address || '';
                    marker.address = formattedAddress;

                    marker.record.marker = marker;
                    MA.Map.click2CreateMarkers.push(marker);

                    //handle marker click
                    if(MA.isMobile) {
                        google.maps.event.addListener(marker, 'click', function (e) { MAData.createRecordFromDataLayer.marker_Click.call(this); });
                    }
                    else {
                        google.maps.event.addListener(marker, 'click', function ()
                        {
                            //create tooltip content
                            var $tooltipContent = $([
                                '<div id="tooltip-content">',
                                    '<div class="tooltip-header">',
                                        '<div class="name"><a style="font-family: helvetica,arial,sans-serif;font-size: 12px;color: #2265BB;font-weight: bold;text-decoration: none;white-space: normal;" /></div>',
                                        '<div class="address" style="margin: 3px 0 5px 0;padding: 0;font-family: helvetica,arial,sans-serif;font-size: 11px;font-weight: bold;text-decoration: none;color: #000;white-space: normal;" />',
                                    '</div>',
                                    '<div class="layout-tooltip">',
                                        '<div class="buttonset-section-columns">',
                                            '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Add_to_Trip + '</div></div>' +
                                            '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.ActionFramework_Take_Me_There + '</div></div>' +
                                            //'<div class="buttoncolumn"><div class="actionbutton checkin">Check In</div></div>' +
                                            '<div class="buttoncolumn"><div class="actionbutton">' + MASystem.Labels.Context_Remove_Marker + '</div></div>' +
                                        '</div>',
                                    '</div>',
                                '</div>'
                            ].join(''));
                
                            //populate values
                            if (typeof sforce != 'undefined' && sforce.one) {
                                $tooltipContent.find('.name a').attr('href', '#').removeAttr('target').text(recordName).click(function () { ma_navigateToSObject(recordId) });
                            }
                            else {
                                $tooltipContent.find('.name a').attr('href', MA.SitePrefix+'/'+recordId).attr('target', '_blank').text(recordName);
                            }
                            //$tooltipContent.find('.address').text(geoResponse.result.FormattedAddress).click(function () { launchNativeGPS(marker.getPosition().lat(), marker.getPosition().lng()); });
                
                            //update check in button to check out if needed
                            if (marker.record.Tasks) {
                                 $.each(marker.record.Tasks || [], function (index, task) {
                                     if (!task.IsClosed) {
                                         $tooltipContent.find('.actionbutton.checkin').data('CheckInId', task.Id).text('Check Out');
                                         return false;
                                     }
                                 });
                            }
                            if (marker.record.Events) {
                                $.each(marker.record.Events || [], function (index, event) {
                                    if (event.Subject.indexOf('Check In @') == 0) {
                                        $tooltipContent.find('.actionbutton.checkin').data('CheckInId', event.Id).text('Check Out');
                                        return false;
                                    }
                                });
                            }
                
                            //launch infobubble
                            MA.Map.InfoBubble.show({
                                position: this.getPosition(),
                                anchor: marker,
                                minWidth: 420,
                                content: $tooltipContent.get(0)
                            });
                
                            //handle action button clicks
                            $tooltipContent.find('.actionbutton').click(function () {
                                switch ($(this).text())
                                {
                                    case MASystem.Labels.ActionFramework_Add_to_Trip:
                                        var c2cRec = {
                                            id : recordId,
                                            baseObject : '{C2C}'+$('#createrecord-object').val()
                                        }
                                        MAActionFramework.standardActions['Add to Trip'].ActionValue({
                                            customMarkers: [{ type: 'dataLayer', title: recordName, latlng: marker.getPosition(), address: '', c2cRec : c2cRec }]
                                        });
                
                                    break;
                                    case MASystem.Labels.ActionFramework_Take_Me_There:
                
                                        MAActionFramework.standardActions['Take Me There'].ActionValue({
                                            customMarkers: [{ type: 'dataLayer', title: recordName, latlng: marker.getPosition(), address: '' }]
                                        });
                
                                    break;
                                    case MASystem.Labels.Context_Remove_Marker:
                
                                        marker.setMap(null);
                
                                    break;
                                }
                                MA.Map.InfoBubble.hide();
                            });
                        });
                    }
            
                }
            }
        });
    },
    deleteDataLayer: function (layerId) {
        var processData = { 
        	ajaxResource : 'TreeAJAXResources',
        	
        	action: 'delete_layer',
        	id : layerId
        };
        
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
        	processData,
        	function(res, event){
                VueEventBus.$emit('refresh-folder');
                showSuccess($('#mapdiv'), 'Successfully deleted this data layer.');
            },{escape:false,buffer:false}
        );
    },
    
    wizard: {
        
        resetPopup: function (keepHeader) {
            MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
            $('#dl-details').click();
            
            $('#MADataLayerEditor .dl-label').val('').closest('.slds-form-element').removeClass('slds-has-error');
            $('#MADataLayerEditor .dl-desc').val('');
            
            MAData.wizard.resetDataSource();
            MAData.wizard.resetTooltip(false);
            MAData.wizard.resetFilters();
            MAData.wizard.resetLegend();
        },
        
        resetDataSource : function () {
            $('#MADataLayerEditor .next-Tooltip').removeClass('slds-show').addClass('slds-hide');
            $('#dl-style').removeClass('slds-show').addClass('slds-hide');
            $('#dl-style .dl-card').removeClass('selected hidden');
            $('#dl-style .dl-card[data-id="centroid"]').addClass('hidden');
            $('#dl-level-wrapper').html('<select><option>' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option></select>');
            $('#dl-level').removeClass('slds-show').addClass('slds-hide');
            $('#dl-source-select').val($('#dl-source-select option:first').val()).change();
        },
        
        resetTooltip : function (checkForDefaults) {
            checkForDefaults = checkForDefaults == true ? true : false;
            var $tooltip = $('#MADataLayerEditor .tooltipWrap');
            $tooltip.find('.hearers-wrap .dl-row').remove();
            $tooltip.find('.tabs-wrap .dl-tab').remove();
            $tooltip.find('.details-wrap .dl-row').remove();
            $tooltip.find('#dl-details-wrapper .dl-headerBtn').attr('disabled','disabled');
            
            //fill in defaults if needed
            var sourceId = $('#dl-source-select').val();
            if(sourceId && checkForDefaults) {
                var sampleData = MADemographicLayer.defaultDataSamples[sourceId];

                // Create headers
                if (sampleData && sampleData.header) {
                    for (var h = 0; h < sampleData.header.length; h++) {
                        var hRow = sampleData.header[h];
                        MAData.wizard.createToolipRow({element:$('#dl-tooltip-header-addRow'),type:'header',data:hRow}); 
                    }
                }

                // Create tabs
                if (sampleData && sampleData.tabs) {
                    for (var t = 0; t < sampleData.tabs.length; t++) {
                        var tab = sampleData.tabs[t];
                        MAData.wizard.createTooltipTab(tab);
                    }
                }
            }
            else {
                //add a sample tab
                $('#add-dl-tab').click();
                $('#dl-tooltip-setup .dl-tab.active .tab-name').val('Info');
            }
        },
        
        resetFilters : function () {
            $('#dlFilters').empty();
        },
        
        resetLegend : function (resetAll,useStyle) {
            resetAll = resetAll || true;
            useStyle = useStyle || false;
            
            $('#dl-legend-grid .dl-legend-title').val('');
            $('#dl-legend-grid .dl-legend-subtitle').val('');
            $('#dl-setupLegend').removeClass('slds-show').addClass('slds-hide');
            $('#dl-legend-options').removeClass('slds-show').addClass('slds-hide');
            $('#legendDistButtons .dl-legitem').removeClass('hidden active');
            
            var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id') || 'point';
            $('#legendImagePlaceholder .legendSampleBtn').removeClass('active');
            $('#MADataLayerEditor').removeData('useLegend');
            //show sample image for static
            $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg').addClass('hidden');
            $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"]').removeClass('hidden');
            $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg.legendStatic').removeClass('hidden');
            $('#dl-legend-wrap').addClass('hidden');
            $('#legendImagePlaceholder').removeClass('hidden');
            $('#dl-Done').removeClass('slds-show').addClass('slds-hide');
            
            if(resetAll) {
                $('#styleSelectWrap button').removeClass('button-blue');
                $('#dl-useFilters .staticLegend').addClass('button-blue');
                $('#dl-addFilters').removeClass('slds-show').addClass('slds-hide');
                $('#dl-legendSelect-wrap').html('<select><option>' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option></select>');
            }
            else {
                if(!useStyle) {
                    $('#dl-addFilters').removeClass('slds-show').addClass('slds-hide');
                    $('#dl-legendSelect-wrap').html('<select><option>' + MASystem.Labels.MA_Loading_With_Ellipsis + '</option></select>');
                }
            }
            
        },
        
        launchPopup: function (options) {
            MAData.wizard.resetPopup();
            var $popup = $('#MADataLayerEditor');
            $popup.removeData();
            $popup.data('folder-id',options.folderId);
            $popup.data('folder-id-actual',options["folder-id-actual"]);
            $popup.find('.notificationMsg').removeClass('error').hide();
            
            LaunchPopupWindow($popup,900);
            //do we have a layer id?
            if(options.layerId) {
                //update button text if layer is already plotted
                var $plottedLayer = $('#PlottedQueriesTable .DataLayer[data-id="'+options.layerId+'"]');
                if($plottedLayer.length > 0) {
                    $popup.find('.savePlotDataLayer').text('Save and Refresh');
                    $popup.data('isRefresh',true);
                    $popup.data('plottedLayer',$plottedLayer);
                }
                else {
                    $popup.find('.savePlotDataLayer').text(MASystem.Labels.modal_MLB_Save_and_Plot_Button);
                }
                
                //store some general data for saving/updating later
                $popup.data('layer-id',options.layerId);
                var isClone = options.isClone || false;
                $popup.data('isClone',isClone);
                //get the layer info
                MAData.wizard.getLayerInfo({id:options.layerId, isClone: isClone});
            }
            else {
                MAData.getDataLayerSource().then(function(res) {
                    if(res.success) {
                    }
                    else {
                        var errMsg = res.error || MASystem.Labels.Common_Refresh_And_Try_Again;
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:errMsg,timeOut:0, closeButton:true});
                    }
                });
            }
        },
        
        buildFilters: function (filterArray) {
            var $row = $('#templates .dl-filter-row').clone();
            //loop over our filters and create rows
            $.each(filterArray || [], function (i,filter) {
                MAData.wizard.createFilterRow(filter);
            });
        },
        
        getLayerInfo: function (layerOptions) {
            
            layerOptions = $.extend({
                isClone : false,
                id      : ''
            }, layerOptions || {});
            
            //get our layer info before we get our source data
            var processData = { 
            	ajaxResource : 'TreeAJAXResources',

            	action: 'get_layer',
            	layerId : layerOptions.id
            };
            MA.Popup.showLoading({display:true,popupId:'MADataLayerEditor'});
            var $loadingSource = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,timeOut:0,extendedTimeOut:0});
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            	processData,
            	function(res, event){
            	    if(event.status) {
                       if(res.success) {
                           MAToastMessages.hideMessage($loadingSource);
                           MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                           //let's grab some basic info from this layer grab only what is needed
                           var sfLayer = res.data;
                           if(sfLayer != undefined) {
                               //update our layer name tab
                               var name = layerOptions.isClone == true ? 'Copy of ' + sfLayer.Name : sfLayer.Name;
                               var $popup = $('#MADataLayerEditor').attr('isLoading','true');
                               $popup.find('.dl-label').val(name);
                               $popup.find('.dl-desc').val(sfLayer.maps__Description__c);
                                if(name.replace(/[ \t]/g, '') != '') {
                                    $popup.find('.next-DataSource').addClass('slds-show').removeClass('slds-hide');
                                }
                                else {
                                    $popup.find('.next-DataSource').removeClass('slds-show').addClass('slds-hide');
                                }
                           
                                var jsonOptions;
                                try{
                                    jsonOptions = JSON.parse(sfLayer.maps__Options__c);
                                }
                                catch(e) {
                                    //can't parse json, show error
                                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Something_Went_Wrong_With_Layer,timeOut:0, closeButton:true});
                                    return;
                                }
                                //grab the sources only
                                MAData.getDataLayerSource({}).then(function(res) {
                                    if(res.success) {
                                        var fileId = jsonOptions.file_id || '';
                                        //check legacy support
                                        fileId = MAData.legacyDataLayerMap[fileId] || fileId;
                                        //get the field for this data source, breaking out because of heap size issues
                                        MAData.getDataLayerSourceFields(fileId).then(function(res) {
                                            if(res.success) {
                                                var dataSources = $('#MADataLayerEditor').data('sources');
                                                
                                                var dataSource = getProperty(dataSources,fileId);
                                                if(dataSource != undefined) {
                                                    //we have our data source info back, now let's fill out everything
                                                    //data source
                                                    $('#dl-source-select').val(fileId).trigger('change');
                                                    
                                                    var levelId = jsonOptions.level_id || '';
                                                    levelId = MAData.legacyDataLayerMap[levelId] || levelId;
                                                    $('#dl-level-select').val(levelId).change();
                                                    
                                                    //select polygon or marker based on saved data
                                                    if(jsonOptions.type === 'polygon') {
                                                        $('#cardShape').addClass('selected').change();
                                                        $('#legendImagePlaceholder .legImgWrapper[data-type="polygon"]').removeClass('hidden');
                                                        $('#legendImagePlaceholder .legImgWrapper[data-type="polygon"] .legendImg.legendStatic').removeClass('hidden');
                                                    } else {
                                                        $('#cardMarker').addClass('selected').change();
                                                        $('#legendImagePlaceholder .legImgWrapper[data-type="point"]').removeClass('hidden');
                                                        $('#legendImagePlaceholder .legImgWrapper[data-type="point"] .legendImg.legendStatic').removeClass('hidden');
                                                    }
                                                    
                                                    //populate our filters
                                                    MAData.wizard.buildFilters(jsonOptions.filters || []);
                                                    
                                                    //populate our tooltip data
                                                    var popup = jsonOptions.popup || {};
                                                    var header = popup.header || [];
                                                    var tabs = popup.tabs || [];
                                                    var legendInfo = jsonOptions.legend || {};
                                                    var legendRows = legendInfo.rows || [];
                                                    //loop over tabs, create, remove previous
                                                    //empty any previous
                                                    $('#dl-tooltip-setup .tabs-wrap .dl-tab').remove();
                                                    $('#dl-tooltip-setup .details-wrap .dl-row').remove();
                                                    $('#dl-tooltip-setup .hearers-wrap .dl-row').remove();
                                                    for(var t = 0; t < tabs.length; t++) {
                                                        var tab = tabs[t];
                                                        MAData.wizard.createTooltipTab(tab);
                                                    }
                                                    //create tooltip headers
                                                    for(var h = 0; h < header.length; h++) {
                                                        var hRow = header[h];
                                                        //create the row
                                                        MAData.wizard.createToolipRow({element:$('#dl-tooltip-header-addRow'),type:'header',data:hRow}); 
                                                    }
                                                    
                                                    //finally set up our style and legend info
                                                    if(legendRows.length > 0 && (jsonOptions.topic_id != '--' && jsonOptions.topic_id != undefined && jsonOptions.topic_id != '')) {
                                                        MAData.wizard.styleSetup(true);
                                                        //update our legend, first check very old legacy
                                                        var legacyTopicCheck = jsonOptions.topic_id;
                                                        var oldTopicIdLocation;
                                                        try {
                                                            var firstRow = legendRows[0];
                                                            //do we have a topic id here?
                                                            oldTopicIdLocation = firstRow.topic_id;
                                                        }
                                                        catch(e) {}
                                                        if(oldTopicIdLocation != undefined) {
                                                            legacyTopicCheck = oldTopicIdLocation;
                                                        }
                                                        
                                                        //now convert that value from legacy again
                                                        legacyTopicCheck = MAData.legacySelectDataLayer($('#dl-legendSelect'),legacyTopicCheck)
                                                        
                                                        $('#dl-legendSelect').val(legacyTopicCheck).change();
                                                        
                                                        //check if we need to try for legacy support
                                                        if($('#dl-legendSelect').val() == '--') {
                                                            MA.log(window.formatLabel(MASystem.Labels.DataLayer_Cannot_Find_Layer_Source_Fields, [jsonOptions.topic_id]));
                                                            jsonOptions.topic_id = MAData.legacySelectDataLayer($('#dl-legendSelect'),jsonOptions.topic_id);
                                                            $('#dl-legendSelect').val(jsonOptions.topic_id).change();
                                                        }
                                                        
                                                        //wait a sec to finish legend, need to adjust this
                                                        setTimeout(function() {
                                                            //make sure manual is selected
                                                            $('#legendDistButtons .manual').click();
                                                            
                                                            //update our title and subtitle
                                                            var $legendWrap = $('#dl-legend-wrap');
                                                            $legendWrap.find('.dl-legend-title').val((legendInfo.title || 'Data Layer Legend'));
                                                            $legendWrap.find('.dl-legend-subtitle').val(legendInfo.subtitle);
                                                            
                                                            //empty out any previous rows
                                                            $('#dl-legend-info-wrapper').empty();
                                                            
                                                            if(typeof legendRows == 'object' && legendRows.length === 0) {
                                                                //create fake row for error handling
                                                                MAData.wizard.createLegendRow({isOther:true, color:'#93c47d', pointType: 'Circle'});
                                                            }
                                                            else {
                                                                //loop over our saved rows and add
                                                                $.each(legendRows || [], function(i,row) {
                                                                    //update the topic select
                                                                    row.isSaved = true;
                                                                    if(row.values && row.values == '--Other--') {
                                                                        row.isOther = true;
                                                                    }
                                                                    MAData.wizard.createLegendRow(row);
                                                                });
                                                                
                                                                //if only 1 row and has topic id of '--other--' and is a polygon
                                                                //this is a fake row for styling shapes
                                                                if((legendRows && legendRows.length) === 1 && jsonOptions.type === 'polygon') {
                                                                    var legendRowTest = legendRows[0] || {};
                                                                    if(legendRowTest.topic_id == '--other--') {
                                                                        //no styling was used
                                                                        MAData.wizard.styleSetup(false);
                                                                    }
                                                                }
                                                            }
                                                            
                                                        }, 1000);
                                                    }
                                                    else {
                                                        MAData.wizard.styleSetup(false);
                                                    }
                                                }
                                                else {
                                                    MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:MASystem.Labels.Common_Refresh_And_Try_Again})
                                                }
                                            }
                                        });
                                        
                                        
                                    }
                                    else {
                                        var errMsg = res.error || MASystem.Labels.Common_Refresh_And_Try_Again;
                                        MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:errMsg,timeOut:0, closeButton:true});
                                    }
                                });
                           }
                       }
                       else {
                           var errMsg = res.error || MASystem.Labels.Common_Refresh_And_Try_Again;
                           MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:errMsg,timeOut:0, closeButton:true});
                       }
            	    }
                    else if (event.type === 'exception') {
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:event.message,timeOut:0, closeButton:true});
                        MA.log(MASystem.Labels.DataLayer_Cannot_Get_Layer,event.message + '::' + event.where);
                    } else {
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There, subMessage:event.message,timeOut:0, closeButton:true});
                        MA.log(MASystem.Labels.DataLayer_Cannot_Get_Layer,event.message);
                    }
            	},{buffer:false,timeout:120000,escape:false}
            );
        },
        
        closePopup: function () {
            ClosePopupWindow();
            MAData.wizard.resetPopup();
        },
        
        changeTab: function (tab) {
            $tab = $(tab);
            var tabId = $tab.attr('id');
            
            $('#MADataLayerEditor .dl-label').closest('.slds-form-element').removeClass('slds-has-error');
            

            if(tabId == 'dl-details') {
                $('.dl-panel').removeClass('slds-show').addClass('slds-hide');
                $('.dl-panel[data-id="'+tabId+'"]').addClass('slds-show').removeClass('slds-hide');
                MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                $('#MADataLayerEditor .sidebar .item').removeClass('active');
                $tab.addClass('active');
                return;
            }

            if($('#MADataLayerEditor .dl-label').val().replace(/[ \t]/g, '') == '') {
                $('#MADataLayerEditor .dl-label').closest('.slds-form-element').addClass('slds-has-error');
                return;
            }

            if(tabId == 'dl-dataSource'){
                //update selected
                $('.dl-panel').removeClass('slds-show').addClass('slds-hide');
                $('.dl-panel[data-id="'+tabId+'"]').addClass('slds-show').removeClass('slds-hide');
                $('#MADataLayerEditor .sidebar .item').removeClass('active');
                $tab.addClass('active');
                return;
            }

            //name is good, check for source
            if($('#dl-source-select').val() == '--') {
                $('#dl-source-select').next().find('input').addClass('error');
                return;
            }
            else if($('#dl-level-select').val() == '--') {
                $('#dl-level-select').next().find('input').addClass('error');
                return;
            }

            if(tabId == 'dl-tooltip'){
                $('.dl-panel').removeClass('slds-show').addClass('slds-hide');
                var $panel = $('.dl-panel[data-id="'+tabId+'"]');
                $panel.addClass('slds-show').removeClass('slds-hide');
                if($panel.find('.tabs-wrap').children().length == 0) {
                    $panel.find('#dl-details-wrapper .dl-headerBtn').attr('disabled', 'disabled');
                }
                $('#MADataLayerEditor .sidebar .item').removeClass('active');
                $tab.addClass('active');
            }
            else if(tabId == 'dl-filters'){
                $('.dl-panel').removeClass('slds-show').addClass('slds-hide');
                $('.dl-panel[data-id="'+tabId+'"]').addClass('slds-show').removeClass('slds-hide');
                $('#MADataLayerEditor .sidebar .item').removeClass('active');
                $tab.addClass('active');
            }
            else if(tabId == 'dl-filtersFix'){
                $('.dl-panel').removeClass('slds-show').addClass('slds-hide');
                $('.dl-panel[data-id="'+tabId+'"]').addClass('slds-show').removeClass('slds-hide');
                $('#MADataLayerEditor .sidebar .item').removeClass('active');
                $tab.addClass('active');
            }
            
        },
        
        styleSetup : function (useStyle) {
            useStyle = useStyle || false;
            MAData.wizard.resetLegend(false,useStyle);
            //are we dealing with point or polygon?
            var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id') || 'point';
            
            //start by hiding sample images
            $('#legendImagePlaceholder .legImgWrapper').addClass('hidden');
            $('#legendImagePlaceholder .legImgWrapper .legendImg').addClass('hidden');
            //hide the legend info and show sample image
            $('#dl-legend-wrap').addClass('hidden');
            $('#legendImagePlaceholder').removeClass('hidden');
            //remove finished dialog
            $('#dl-Done').removeClass('slds-show').addClass('slds-hide');
            //remove button classes 
            $('#styleSelectWrap button').removeClass('button-blue');
            $('#legendImagePlaceholder .legendSampleBtn').removeClass('active');
            $('#MADataLayerEditor').data('useLegend',useStyle);
            //no styles
            if(!useStyle) {
                $('#dl-addFilters, #dl-setupLegend').removeClass('slds-show').addClass('slds-hide');
                //show sample image for static
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"]').removeClass('hidden');
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg.legendStatic').removeClass('hidden');
                //update the button under images to reflect choice
                $('#legendImagePlaceholder .legendSampleBtn.legendStatic').addClass('active');
                //update the no button to reflect selection
                $('#dl-useFilters .staticLegend').addClass('button-blue');
                //show finished dialog
                $('#dl-Done').addClass('slds-show').removeClass('slds-hide');
            }
            else {
                //show sample image for styles
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"]').removeClass('hidden');
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg.legendColor').removeClass('hidden');
                //update button under image for styles
                $('#legendImagePlaceholder .legendSampleBtn.legendColor').addClass('active');
                //show our filter selection (select set of info...)
                $('#dl-addFilters').addClass('slds-show').removeClass('slds-hide');
                //update style button to yes
                $('#dl-useFilters .colorLegend').addClass('button-blue');
                
                //update our information select box if needed
                if($('#dl-legendSelect').hasClass('js-ready') === false) {
                    var selectedSource = $('#dl-source-select').val();
                    var dataSources = $('#MADataLayerEditor').data('sources');
                    if(dataSources != undefined) {
                        var dataSource = dataSources[selectedSource];
                        if(dataSource != undefined) {
                            //loop over our fields
                            var dataFields = dataSource.fields;
                            
                            //loop over our fields
                            var sourceFragment = document.createDocumentFragment();
                            var intOpt = document.createElement('option');
                            intOpt.innerHTML = MASystem.Labels.MA_PLEASE_SELECT_A_TOPIC;
                            intOpt.value = '--';
                            intOpt.setAttribute('selected','selected');
                            sourceFragment.appendChild(intOpt);
                            $.each(dataFields || [], function (i, field) {
                                var opt = document.createElement('option');
                                opt.innerHTML = field.label || '';
                                opt.value = field.id || '';
                                opt.setAttribute('data-type',field.format_as || 'string');
                                opt.setAttribute('data-filter',field.filter_as || 'string');
                                opt.setAttribute('data-picklist',field.has_picklist || 'false');
                                sourceFragment.appendChild(opt);
                            });
                            
                            $('#dl-legendSelect-wrap').html('<select id="dl-legendSelect" class="js-ready" onchange="MAData.wizard.setupLegend(this)"></select>');
                            var $select = $('#dl-legendSelect');
                            $select[0].appendChild(sourceFragment);
                            $select.select2();
                            $select.next().find('input').removeClass('error');
                        }
                    }
                }
            }
        },
        
        setupLegend:function () {
            //does this source support a dynamic legend?
            var $dataSource = $('#dl-source-select');
            var $selectedOption = $dataSource.find('option:selected');
            var $select = document.getElementById('dl-legendSelect');// $('#dl-legendSelect');
            var $option = $select.options[$select.selectedIndex];
            //console.log($option);
            //var $optionDataType = $('#dl-legendSelect option:selected').data('type') || 'string';
            var hasAutoLegend = $selectedOption.attr('has_auto_legend') == 'true' && $option.getAttribute('data-type') !== 'string' ? true : false;
            var $s2Wrap = $('#dl-legendSelect-wrap .select2-container').removeClass('error');
            $('#dl-legend-grid .dl-legend-title').val($('#dl-legendSelect option:selected').text() || '');

            //make sure we have proper values
            if($select.value == '--' || $select.value == null) {
                //hide the legend creation options
                $('#dl-setupLegend').removeClass('slds-show').addClass('slds-hide');
                $('#dl-legend-wrap').addClass('hidden');
                $('#legendImagePlaceholder').removeClass('hidden');
                $('#dl-legend-info-wrapper').empty();
                $s2Wrap.addClass('error');
            }
            else {
                //reset everything 
                $('#dl-Done').removeClass('slds-show').addClass('slds-hide');
                $('#legendDistButtons .dl-legitem').removeClass('hidden active');
                $('#dl-legend-options').removeClass('slds-show').addClass('slds-hide');
                
                var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id') || 'point';
                $('#legendImagePlaceholder .legendSampleBtn').removeClass('active');
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg').addClass('hidden');
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"]').removeClass('hidden');
                $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg.legendColor').removeClass('hidden');
                $('#dl-legend-wrap').addClass('hidden');
                $('#legendImagePlaceholder').removeClass('hidden');
                $('#dl-Done').removeClass('slds-show').addClass('slds-hide');
                
                
                //show the legend creation options
                $('#dl-setupLegend').addClass('slds-show').removeClass('slds-hide');
                if(hasAutoLegend) {
                    //show all legend options
                    $('#legendDistButtons .dl-legitem[data-type="decimal"]').removeClass('hidden');
                }
                else {
                    $('#legendDistButtons .dl-legitem[data-type="decimal"]').addClass('hidden');
                    //set manual
                    $('#legendDistButtons .dl-legitem.manual').removeClass('hidden').addClass('active');
                    //create legend
                    MAData.wizard.createLegend('manual');
                }
            }
        },
        
        updateSampleImage: function (button,imgParam) {
            //update button
            $('#legendImagePlaceholder .legendSampleBtn').removeClass('active');
            var $button = $(button);
            $button.addClass('active');
            //show proper image
            var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id');
            $('#legendImagePlaceholder .legendImg').addClass('hidden');
            $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg.'+imgParam+'').removeClass('hidden');
        },
        
        
        createFilterRow : function (options) {
            var $row = $('#templates .dl-filter-row').clone();
            $row.on('click','.remove-row',function() {
               var $r = $(this).closest('.dl-filter-row');
               $r.remove();
            });
            
            //grab our source
            var selectedSource = $('#dl-source-select').val();
            var dataSources = $('#MADataLayerEditor').data('sources');
            if(dataSources != undefined) {
                var dataSource = dataSources[selectedSource];
                if(dataSource != undefined) {
                    //loop over our fields
                    var dataFields = dataSource.fields;
                    
                    //loop over our fields
                    var sourceFragment = document.createDocumentFragment();
                    var intOpt = document.createElement('option');
                    intOpt.innerHTML = MASystem.Labels.MA_PLEASE_SELECT_A_TOPIC;
                    intOpt.value = '--';
                    intOpt.setAttribute('disabled','disabled');
                    intOpt.setAttribute('selected','selected');
                    sourceFragment.appendChild(intOpt);
                    $.each(dataFields || [], function (i, field) {
                        var opt = document.createElement('option');
                        opt.innerHTML = field.label || '';
                        opt.value = field.id || '';
                        opt.setAttribute('data-type',field.format_as || 'string');
                        opt.setAttribute('data-filter',field.filter_as || 'string');
                        opt.setAttribute('data-picklist',field.has_picklist || 'false');
                        sourceFragment.appendChild(opt);
                    });
                    
                    $row.find('.dl-filter-topic-wrap').html('<select style="width:100%;" class="dl-filter-topic" onchange="MAData.wizard.updateFilter(this)"></select>');
                    var $select = $row.find('.dl-filter-topic');
                    $select[0].appendChild(sourceFragment);
                    $select.select2();
                    $select.next().find('input').removeClass('error');
                    //end field drop down creation
                    
                    $('#dl-filters-wrapper').append($row);
                    $row.find('.dl-filter-topic').select2();
                    $row.find('.dl-filter-operator').select2();
                    $('#dlFilters').append($row);
                    
                    //let's update this row with selections if passed
                    if(options) {
                        var topicId = MAData.legacySelectDataLayer($row.find('.dl-filter-topic'),options.topic_id);
                        $row.find('.dl-filter-topic').val(topicId).change();
                        var dataType = $row.find('.dl-filter-topic option:selected').attr('data-type');
                        $row.find('.dl-filter-operator').val(options.operator).change();
                        $row.find('.dl-filter-value').val(options.values);
                        if(options.operator == 'range') {
                            if(dataType == 'date') {
                                var dateFormat = getProperty(MASystem,'User.dateFormat',false) || '';
                                var momentStart = moment(options.min,'YYYY-MM-DD').format(dateFormat.toUpperCase());
                                var momentEnd = moment(options.max,'YYYY-MM-DD').format(dateFormat.toUpperCase());
                                $row.find('.dl-filter-value-start').val(momentStart);
                                $row.find('.dl-filter-value-end').val(momentEnd);
                            }
                            else {
                                $row.find('.dl-filter-value-start').val(options.min);
                                $row.find('.dl-filter-value-end').val(options.max);
                            }
                        }
                        else if(dataType == 'date') {
                            var dateValue = options.values;
                            if(typeof dateValue == 'object') {
                                dateValue = options.values[0];
                            }
                            var dateFormat = getProperty(MASystem,'User.dateFormat',false) || '';
                            var momentDate = moment(dateValue,'YYYY-MM-DD').format(dateFormat.toUpperCase());
                            $row.find('.dl-filter-value-start').val(momentDate);
                        }
                        else {
                            //create our multiple select options
                            if(typeof options.values == 'string') {
                                options.values = [options.values];
                            }
                            
                            //first we need to check if this is a picklist option, if not, append it
                            var $valSelect = $row.find('.dl-filter-value-start');
                            var sFragment = document.createDocumentFragment();
                            $.each(options.values || [],function(i,val) {
                                var foundMatch = false;
                                options.values[i] = htmlEncode(options.values[i]);
                                $.each($valSelect.find('option'),function(i,opt) {
                                    var optVal = opt.value;
                                    if(optVal == val) {
                                        //don't append
                                        foundMatch = true;
                                        return false;
                                    }
                                });
                                
                                if(!foundMatch) {
                                    //didn't find anything, append option
                                    var opt = document.createElement('option');
                                    opt.innerHTML = htmlEncode(val) || '';
                                    opt.value = htmlEncode(val) || '';
                                    sFragment.appendChild(opt);
                                }
                            });
                            
                            try {
                                var $select = $row.find('.dl-filter-value-start');
                                $valSelect[0].insertBefore(sFragment,$valSelect[0].firstChild);
                            }
                            catch(e) {
                                
                            }
                            
                            $row.find('.dl-filter-value-start').val(options.values).trigger('change');
                        }
                    }
                }
            }
        },
        
        createLegendCheck: function (showOptions,type) {
            $('#legendDistButtons').removeClass('error');
            var $button = $('#legendDistButtons .dl-legitem.'+type+'');
            //if already processed this, don't do it again
            if($button.hasClass('active')) {
                return;
            }
            
            //remove active classes and update new selection
            $('#legendDistButtons .dl-legitem').removeClass('active')
            $button.addClass('active');
            
            //hide our done status and show generic images while we process the request
            $('#dl-Done').removeClass('slds-show').addClass('slds-hide');
            $('#legendImagePlaceholder').removeClass('hidden');
            $('#dl-legend-wrap').addClass('hidden');
            $('#dl-legend-info-wrapper').empty();
            
            //do we need to show any extra options?
            if(showOptions) {
                $('#dl-legend-options').addClass('slds-show').removeClass('slds-hide');
                $('#legendDistButtons .dl-legitem').addClass('hidden');
                if(type == 'quantiles') {
                    $('#dl-legend-minVal').addClass('hidden');
                    $('#dl-legend-maxVal').addClass('hidden');
                    $('#dl-legend-buckets .fieldLabel').css('padding-top','0px');
                }
                else {
                    $('#dl-legend-minVal').removeClass('hidden');
                    $('#dl-legend-maxVal').removeClass('hidden');
                    $('#dl-legend-buckets').removeClass('hidden');
                    $('#dl-legend-buckets .fieldLabel').css('padding-top','10px');
                }
                $button.removeClass('hidden');
            }
            else {
                $('#dl-legend-options').removeClass('slds-show').addClass('slds-hide');
                MAData.wizard.createLegend(type);
            }
        },
        
        createLegend:function (type,options) {
            //show the finshed logo
            $('#dl-Done').addClass('slds-show').removeClass('slds-hide');
            
            var activeLegend = $('#legendDistButtons .active').attr('data-id');
            $('#legendImagePlaceholder').addClass('hidden');
            $('#dl-legend-wrap').removeClass('hidden');
            
            $('#dl-legend-info-wrapper').empty();
            $('#dl-addLegendRow-btn').addClass('hidden');
            $('#dl-legend-options .dl-legend-buckets').removeClass('error');
            
            //auto fill a title if one isn't present
            if($('#dl-legend-wrap .dl-legend-title').val() == '') {
                var legendText = $('#dl-legendSelect option:selected').text() || '';
                $('#dl-legend-wrap .dl-legend-title').val(legendText);
            }
            
            //build our parameters to get legend
            var paramerters = {};
            var createLegend = true;
            if (options) {
                createLegend = false;
            }
            else if(activeLegend === 'quantiles') {
                //do we have number of buckets entered?
                var $buckets = $('#dl-legend-options .dl-legend-buckets');
                $buckets.removeClass('error');
                if($buckets.val() == '' || isNaN($buckets.val()) || $buckets.val() > 60) {
                    $buckets.addClass('error');
                    MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Include_60_Ranges});
                    return;
                }
                
                paramerters = {
                    source : $('#dl-source-select').val(),
                    level : $('#dl-level-select').val(),
                    field : $('#dl-legendSelect').val(),
                    divisions : MA.Util.parseNumberString($buckets.val())
                }
            }
            else if(activeLegend === 'distribution') {
                var $min = $('#dl-legend-options .dl-legend-minVal').removeClass('error');
                var $max = $('#dl-legend-options .dl-legend-maxVal').removeClass('error');
                var $buckets = $('#dl-legend-options .dl-legend-buckets').removeClass('error');
                var min = $min.val().replace(/,/g,'');
                var max = $max.val().replace(/,/g,'');
                var buckets = $buckets.val();
                
                var foundError = false;
                if($min.val() == '') {
                    $min.addClass('error');
                    foundError = true;
                }
                if($max.val() == '') {
                    $max.addClass('error');
                    foundError = true;
                }
                if($buckets.val() == '') {
                    $buckets.addClass('error');
                    foundError = true;
                }
                if(foundError) {
                    MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Min_Max_Ranges,timeOut:6000});
                    return;
                }
                if(buckets > 60) {
                    MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Include_60_Ranges});
                    return;
                }
                
                paramerters = {
                    minimum : MA.Util.parseNumberString(min),
                    maximum : MA.Util.parseNumberString(max),
                    divisions : MA.Util.parseNumberString(buckets)
                }
            }
            else if(activeLegend === 'auto') {
                paramerters = {
                    source : $('#dl-source-select').val(),
                    level : $('#dl-level-select').val(),
                    field : $('#dl-legendSelect').val()
                }
            }
            else if(activeLegend === 'manual') {
                $('#dl-addLegendRow-btn').removeClass('hidden');
                MAData.wizard.createLegendRow();
                if($('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id') == 'point') {
                    //create a row for other
                    MAData.wizard.createLegendRow({isOther:true, color:'#93c47d', pointType: 'Circle'});
                }
                createLegend = false;
            }
            else {
                MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Unknown_Legend_Type});
                return;
            }
            
            
            //this is not a saved query or manual.. create the legend
            if(createLegend) {
                //build our request data
                var options = { 
                    method : 'get',
                    action: 'legend',
                    subType : 'data',
                    version : '2'
                };
                MA.Popup.showLoading({display:true,popupId:'MADataLayerEditor'});
                var $loadingSource = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,subMessage:MASystem.Labels.DataLayer_Preparing_Legend_Details,timeOut:0,extendedTimeOut:0});
                Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
                    options ,
                    paramerters,
                    function(res, event){
                        MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                        MAToastMessages.hideMessage($loadingSource);
                        if(event.status) {
                            //update the legend title with the selected options
                            $('#dl-legend-grid .dl-legend-title').val($('#dl-legendSelect option:selected').text() || '');
                            if(res.success) {
                                var legendData = getProperty(res,'data.data') || [];
                                $.each(legendData,function (i,row) {
                                    MAData.wizard.createLegendRow(row);
                                });
                            }
                            else {
                                var errMsg = MASystem.Labels.DataLayer_Cannot_Create_Legend_Automatically;
                                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:errMsg,timeOut:0,closeButton:true});
                            }
                        }
                        else if (event.type === 'exception') {
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Cannot_Create_Legend_Automatically,timeOut:0,closeButton:true});
                            MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,event.message + '::' + event.where);
                        } else {
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Cannot_Create_Legend_Automatically,timeOut:0,closeButton:true});
                            MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,event.message);
                        }
                    }
                );
            }
        },
        
        createTooltipTab: function (options) {
            var tabLimit = 6;
            
            //limit tabs
            var tabLength = $('#MADataLayerEditor .tabs-wrap .dl-tab').length;
            if(tabLength >= tabLimit) {
                var msg = 'A max of '+tabLimit+' tabs may be assigned per data layer.';
                MAToastMessages.showWarning({message:MASystem.Labels.Almost_There,subMessage:msg,timeOut:5000});
                return;
            }
            //check how many tabs we have for the temp title
            var uid = new Date();
            uid = uid.getTime() + MA.componentIndex++;
            var newTabIndex = $('#dl-rightPanel .tabs-wrap .dl-tab').length + 1;
            var $row = $('#templates .dl-tab.template').clone().removeClass('template');
            $row.find('.tab-name').val(window.MASystem.Labels.MA_New);
            
            $row.attr({'tab-index': newTabIndex, 'uid' : uid});

            if(options) {
                //update the row with saved info
                $row.find('.tab-name').val(options.tab_label);
                
                //create row if needed
                var data = options.data || [];
                for(var d = 0; d < data.length; d++) {
                    var dRow = data[d];
                    dRow.uid = uid;
                    MAData.wizard.createToolipRow({type:'tab',data:dRow,uid:uid});
                }
                $row.find('.dl-tooltip-collapse').click();
            }
            
            $row.appendTo($('#dl-rightPanel .tabs-wrap'));

            //set the new tab as active
            $('#dl-rightPanel .tabs-wrap .dl-tab').removeClass('active');
            $row.addClass('active');
            $('#dl-rightPanel .details-wrap .dl-row').hide();
            $('#dl-rightPanel .details-wrap .dl-row[data-tabid="'+uid+'"]').show();
            $('#dl-details-wrapper .dl-headerBtn').removeAttr('disabled');
            
        },
        
        removeTooltipTab: function (element) {
            var $element = $(element);
            var $tab = $element.closest('.dl-tab');

            //remove rows that are related to this tab
            var uid = $tab.attr('uid');
            $('#dl-rightPanel .details-wrap .dl-row[data-tabid="'+uid+'"]').remove();
            var wasActive = $tab.hasClass('active');
            $tab.remove();

            var $tabs = $('#dl-rightPanel .tabs-wrap .dl-tab');
            var tabLength = $tabs.length;
            if(tabLength >= 1) {
                if(wasActive) {
                    var $newTab = $tabs.first();
                    $newTab.addClass('active');
                    var uid = $newTab.attr('uid');
                    $('#dl-rightPanel .details-wrap .dl-row[data-tabid="'+uid+'"]').show();
                }
            }
            else {
                $('#dl-details-wrapper .dl-headerBtn').attr('disabled','true');
            }
        },
        
        handleTooltipClick: function (element) {
            $('#dl-rightPanel .tabs-wrap .dl-tab').removeClass('active');
            //can be the tab or the inpu
            var $input = $(element);
            var $tab = $input.closest('.dl-tab');
            $tab.addClass('active');
            var uid = $tab.attr('uid');

            //show hide the proper rows
            $('#dl-rightPanel .details-wrap .dl-row').hide();
            $('#dl-rightPanel .details-wrap .dl-row[data-tabid="'+uid+'"]').show();
        },
        
        createToolipRow: function (options) {
            var headerLimit = 3;
            var tooltipLimit = 10;
            //limit rows
            if(options.type == 'tab') {
                //get the tab id
                var uid = options.uid || $('#dl-rightPanel .tabs-wrap .dl-tab.active').attr('uid');
                //count the rows for the tab
                var tabLength = $('#dl-details-wrapper .dl-tooltip-row[data-tabid="'+uid+'"]').length;
                $('#MADataLayerEditor .dl-details-help').addClass('hidden');
                if(tabLength >= tooltipLimit) {
                    var msg = window.formatLabel(MASystem.Labels.DataLayer_Number_Popups_Available, tooltipLimit);
                    MAToastMessages.showWarning({subMessage:msg, timeOut:6000});
                    return;
                }
            }
            if(options.type == 'header') {
                //count the rows for the header
                var headerLength = $('#dl-tooltip-setup .hearers-wrap .dl-tooltip-row').length;
                $('#MADataLayerEditor .dl-header-help').addClass('hidden');
                if(headerLength >= headerLimit) {
                    var msg = window.formatLabel(MASystem.Labels.DataLayer_Number_Headers_Available, headerLimit);
                    MAToastMessages.showWarning({subMessage:msg, timeOut:6000});
                    return;
                }
            }
            
            var dataSources = $('#MADataLayerEditor').data('sources');
            if(dataSources != undefined) {
                var fileId = $('#dl-source-select').val();
                var dataSource = dataSources[fileId];
                if(dataSource != undefined) {
                    var dataFields = dataSource.fields;
                    
                    var $row = $('#templates .dl-tooltip-row').clone();
                    
                    //get the selected tab uid
                    var uid = $('#dl-rightPanel .tabs-wrap .dl-tab.active').attr('uid');
                    $row.attr('data-tabId', uid);

                    //loop over options and create select
                    var fileSelectHTML = '<select style="width: 100%;" class="dl-tooltip-file">';
        
                    fileSelectHTML += '<option disabled="disabled" value="--" selected>--Select--</option>';
                    fileSelectHTML += '<option value="' + dataSource.id + '">'+ htmlEncode(dataSource.label) +'</option>';
                    fileSelectHTML += '</select>'
                    $row.find('.dl-tooltip-file-wrap').html(fileSelectHTML);
                    
                    var sourceFragment = document.createDocumentFragment();
                    var firstOpt = document.createElement('option');
                    firstOpt.innerHTML = '--Select--';
                    firstOpt.value = '--';
                    sourceFragment.appendChild(firstOpt);
                            
                    $.each(dataFields, function( index, value ) {
                        var opt = document.createElement('option');
                        opt.innerHTML = value.label;
                        opt.value = value.id;
                        sourceFragment.appendChild(opt);
                    });
                    
                    $row.find('.dl-tooltip-topic-wrap').html('<select style="width: 100%;" onchange="MAData.wizard.validateTooltipTopic(this);" class="dl-tooltip-topic"></select>');
                    var $select = $row.find('.dl-tooltip-topic');
                    $select[0].appendChild(sourceFragment);
                    $select.select2();
                    $select.next().find('input').removeClass('error');
                    
                    //set the data source to the data source selected earlier
                    $row.find('.dl-tooltip-file').val(fileId).change();
                    $row.find('.dl-tooltip-file').select2();
                    
                    //add our listeners
                    $row.on('click','.remove-row',function() {
                       var $r = $(this).closest('.dl-tooltip-row');
                       $r.remove();
                    });
                    
                    if(options.type == 'tab') {
                        //add this row the element
                        $('#MADataLayerEditor .details-wrap').append($row);
                    }
                    else {
                        $('#MADataLayerEditor .hearers-wrap').append($row);
                    }
                    
                    if(options.data) {
                        var file_id_legacy = options.data.file_id || '';
                        file_id_legacy = MAData.legacyDataLayerMap[file_id_legacy] || file_id_legacy;
                        $row.find('.dl-tooltip-file').val(file_id_legacy).change();
                        $row.find('.dl-tooltip-file').change();
                        var topic_legacy = options.data.topic_id || '';
                        topic_legacy = MAData.legacyDataLayerMap[topic_legacy] || topic_legacy;
                        $row.find('.dl-tooltip-topic').val(topic_legacy).change();
                        $row.attr('data-tabid',options.data.uid);
                        
                        //try one last time for legacy support
                        if($row.find('.dl-tooltip-topic').val() == '--') {
                            MA.log('Data Layer Warning!', 'Unable to find ' + topic_legacy + ' value. This may be a legacy value. Attempting to locate by partial match.')
                            //loop over our options and try to find a match
                            try {
                                var availableOptions = $row.find('.dl-tooltip-topic option');
                                $.each(availableOptions || [], function (i, selOpt) {
                                    var selectValue = selOpt.value || '';
                                    if(topic_legacy.indexOf(selectValue) > -1) {
                                        $row.find('.dl-tooltip-topic').val(selectValue).change();
                                        return false;
                                    }
                                });
                            }
                            catch (e) {
                                MA.log('Data Layer Warning!', 'Unable to find ' + topic_legacy + ' value. An updated value will need to be selected.')
                            }
                        }
                    }
                }
            }
        },
        
        validateTooltipTopic: function(select) {
            var $select = $(select);
            var $row = $select.closest('.dl-tooltip-row');
            var $s2Wrap = $row.find('.dl-tooltip-topic-wrap .select2-container').removeClass('error');
            if($select.val() == '--' || $select.val() == '') {
                $s2Wrap.addClass('error');
            }
        },
        
        createLegendRow: function(options) {
            //make sure we have a topic selected
            options = $.extend({
                min: "",
                min_label : "",
                max : "",
                max_label : "",
                color : "#3c78d8",
                isOther : false,
            }, options || {});
            var dataType = $('#dl-legendSelect option:selected').attr('data-type');

            if(dataType == '') {
                return;
            }
            
            if(options.isSaved) {
                //make some changes to the color options for row creation
                if(options.color) {
                    var colorArr = options.color.split(':');
                    if(colorArr.length == 2) {
                        options.pointType = colorArr[1];
                        options.color = '#'+colorArr[0];
                    }
                }
            }
            
            options.color = options.color.indexOf('#') == 0 ? options.color : '#' + options.color
            var colorHTML = MAData.wizard.updateLegendRowColor(options);
            var html = MAData.wizard.buildOperatorSelect(dataType,true);
            
            var $row = $('#templates .dl-legend-row').clone();
            $row.find('.dl-legend-color').html(colorHTML).attr('data-color',options.color).attr('data-maicon',options.pointType || 'Marker');
            $row.find('.dl-legend-operator-wrap').html(html);
            
            if((dataType == 'decimal' || dataType == 'integer' || dataType == 'currency') && !options.isOther) {
                $row.find('.dl-filter-operator').val('range').change();
            }
            
            //update the values
            if(options.isSaved){
                $row.find('.dl-filter-operator').val(options.operator).change();
                if(options.operator == 'range') {
                    $row.find('.dl-filter-value-start').val(options.min);
                    $row.find('.dl-filter-value-end').val(options.max);
                }
                else {
                    //convert values to array
                    if(typeof options.values === 'string') {
                        options.values = [options.values];
                    }
                    
                    //we'll have to loop over our previous options and see if in the picklist options
                    var $legendSelect = $row.find('.dl-filter-value-start');
                    var sFragment = document.createDocumentFragment();
                    $.each(options.values || [],function(i,val) {
                        options.values[i] = htmlEncode(options.values[i]);
                        var foundMatch = false;
                        $.each($legendSelect.find('option'),function(i,opt) {
                            var optVal = opt.value;
                            if(optVal == val) {
                                //don't append
                                foundMatch = true;
                                return false;
                            }
                        });
                        
                        if(!foundMatch) {
                            //didn't find anything, append option
                            var opt = document.createElement('option');
                            opt.innerHTML = htmlEncode(val) || '';
                            opt.value = htmlEncode(val) || '';
                            sFragment.appendChild(opt);
                        }
                    });
                    
                    $legendSelect[0].insertBefore(sFragment,$legendSelect[0].firstChild);
                    $legendSelect.val(options.values).trigger('change');
                    
                }
            }
            else {
                $row.find('.dl-filter-operator').change();
                $row.find('.dl-filter-value-start').val(options.min_label);
                $row.find('.dl-filter-value-end').val(options.max_label);
            }
            
            $row.on('click','.dl-legend-color', function (e) {
                e.stopPropagation();
                var $color = $(this);
                var levelData = $('#MADataLayerEditor').data('levelData');
                var currentLevel = $('#groupbyV2').val();
                var type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id')
                var showMarkers = false;

                if(type == 'point') {
                    showMarkers = true;
                }
                
                if($('.colorPicker.bubble.top').length > 0) {
                    //remove
                    $('.colorPicker.bubble.top').remove();
                }
                
                MA.colors.openPicker({element:$color,showMarkers:showMarkers,icon:$color.attr('data-maicon') || 'Marker', color: $color.attr('data-color') || '#2E43FF'},function(res){
                    var colorHTML = '';
                    if($('#MADataLayerEditor').data('layerType') == 'point') {
                        //update the icon
                        res = $.extend({
                            pointType: "Marker",
                            color : "#2E43FF",
                            forLegend : true
                        }, res || {});
                        colorHTML = MAData.wizard.updateLegendRowColor(res);
                    }
                    else {
                        res = $.extend({
                            color : "#2E43FF"
                        }, res || {});
                        colorHTML = MAData.wizard.updateLegendRowColor(res);
                    }
                    
                    $row.find('.dl-legend-color').attr({'data-maicon':res.pointType,'data-color':res.color}).html(colorHTML);
                    
                });
            });
            
            $row.on('click','.remove-row',function() {
               var $r = $(this).closest('.dl-legend-row');
               $r.remove();
            });

            //init combobox
            $row.find('.dl-filter-operator').select2();
            
            if(options.isOther) {
                $row.addClass('OTHER').find('.dl-filter-operator').val('equals').attr('disabled','disabled').css('background-color','#e8e8e8').change();
                $row.find('.dl-filter-value-start').empty();
                $row.find('.dl-filter-value-start').append('<option value="--Other--">' + MASystem.Labels.Data_Legend_Other + '</option>').val(['--Other--']).attr('disabled','disabled').css('background-color','#e8e8e8');
                $row.find('.remove-row').remove();
            }

            if($('#dl-legend-info-wrapper .OTHER').length > 0) {
                $row.insertBefore($('#dl-legend-info-wrapper .OTHER'));
            }
            else {
                $row.appendTo($('#dl-legend-info-wrapper'));
            }
            
        },
        
        updateLegendRowColor: function (options) {
            //get the layer type
            var levelData = $('#MADataLayerEditor').data('levelData');
            var currentLevel = $('#groupbyV2').val();
            var type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id')
            
            var colorHTML = '';
            if(type == '') {
                return colorHTML;
            }
            else if (type == 'polygon') {
                colorHTML = '<div class="dl-legend-colorBox" style="background:'+options.color+'; height: 20px;width: 20px;border-radius: 3px;"></div>';
            }
            else if (type == 'point') {
                var pointType = options.pointType || 'Marker';
                colorHTML = '<span class="dl-legend-colorBox">'+MAMarkerBuilder.createSVG({ color: options.color + ':' + pointType,forLegend:true })+'</span>';
            }
            
            return colorHTML;
        },
        
        searchIndex : 0,
        
        updateValueField: function (select,forLegend) {
            var $select = $(select);
            var operator = $select.val();
            var $row = $select.closest('.dl-row');
            var dataType;
            var paddingFix = false;
            forLegend = forLegend || false;
            var $selectedField;
            if(forLegend) {
                dataType = $('#dl-legendSelect option:selected').attr('data-type');
                paddingFix = true;
                $selectedField = $('#dl-legendSelect');
            }
            else {
                dataType = $row.find('.dl-filter-topic option:selected').attr('data-type');
                $selectedField = $row.find('.dl-filter-topic');
            }
            
            var hasPicklist = $selectedField.find('option:selected').attr('data-picklist') == 'true' ? true : false;
            if (hasPicklist) {
                //grab all picklist values
                var dataSources = $('#MADataLayerEditor').data('sources');
                if(dataSources != undefined) {
                    var fileId = $('#dl-source-select').val();
                    var dataSource = dataSources[fileId];
                    if(dataSource != undefined) {
                        //we have what we need, loop over picklist options and find one we need
                        var fields = dataSource.fields;
                        var selectedFieldVal = $selectedField.val();
                        var pickListOptions = [];
                        $.each(fields || [], function(i,field) {
                            if(field.id == selectedFieldVal) {
                                pickListOptions = field.picklist;
                                return false;
                            }
                        });
                        
                        //now let's loop over our picklist options and add to select 
                        var sourceFragment = document.createDocumentFragment();
                        $.each(pickListOptions,function(i, pOpt) {
                            var opt = document.createElement('option');
                            opt.innerHTML = pOpt.label;
                            opt.value = pOpt.label;
                            sourceFragment.appendChild(opt);
                        });
                        
                        if(forLegend) {
                            $row.find('.dl-filter-value-wrapper').html('<select style="width:100%;" multiple="multiple" class="rowSelect dl-filter-value-start"></select>');
                        }
                        else {
                            $row.find('.dl-filter-value-wrapper').html('<select multiple="multiple" class="rowSelect dl-filter-value-start"></select>');
                        }
                        var $pickSelect = $row.find('.dl-filter-value-start');
                        $pickSelect[0].appendChild(sourceFragment);
                        // tags:true allows user text
                        $pickSelect.select2({tags:true});
                    }
                }
            }
            else {
                //is this a range filter?
                if(operator === 'range') {
                    $row.find('.dl-filter-value-wrapper').html('<input class="dl-filter-value-start" style="width: calc(50% - 25px);" type="text" onkeyup="MAData.wizard.validateInput(this,'+forLegend+');"/><span> - </span><input style="width: calc(50% - 25px);" class="dl-filter-value-end" onkeyup="MAData.wizard.validateInput(this,'+forLegend+');" type="text"/>');
                
                    if(dataType == 'date') {
                        var dateFormat = formatUserLocaleDate({datepicker:true});
                        var placeHolder = dateFormat.replace('yy','yyyy');
                        $row.find('.dl-filter-value-start').css('width','calc(50% - 50px)').addClass('isDate').attr('placeholder',placeHolder).datepicker({
                            showOn: "button",
                            buttonImage: MA.Images.calendar,
                            buttonImageOnly: true,
                            buttonText: "",
                            dateFormat: dateFormat,
                            onClose: function( selectedDate ) {
                                $row.find('.dl-filter-value-end').datepicker( "option", "minDate", selectedDate );
                                MAData.wizard.validateInput($row.find('.dl-filter-value-start'),forLegend);
                            }
                        });
                        $row.find('.dl-filter-value-end').css('width','calc(50% - 50px)').addClass('isDate').attr('placeholder',placeHolder).datepicker({
                            showOn: "button",
                            buttonImage: MA.Images.calendar,
                            buttonImageOnly: true,
                            buttonText: "",
                            dateFormat: dateFormat,
                            onClose: function( selectedDate ) {
                                $row.find('.dl-filter-value-start').datepicker( "option", "maxDate", selectedDate );
                                MAData.wizard.validateInput($row.find('.dl-filter-value-end'),forLegend);
                            }
                        });
                    }
                }
                else {
                    if (dataType == 'date') {
                        var dateFormat = formatUserLocaleDate({datepicker:true});
                        var placeHolder = dateFormat.replace('yy','yyyy');
                        $row.find('.dl-filter-value-wrapper').html('<input class="dl-filter-value-start" style="width: calc(100% - 20px);" type="text" onkeyup="MAData.wizard.validateInput(this,'+forLegend+');"/></div>');
                        $row.find('.dl-filter-value-start').css('width','calc(100% - 50px)').addClass('isDate').attr('placeholder',placeHolder).datepicker({
                            showOn: "button",
                            buttonImage: MA.Images.calendar,
                            buttonImageOnly: true,
                            buttonText: "",
                            dateFormat: dateFormat,
                            onClose: function( selectedDate ) {
                                MAData.wizard.validateInput($row.find('.dl-filter-value-start'),forLegend);
                            }
                        });
                    }
                    else {
                        var styleChange = forLegend == true ? 'style="width:100%"' : '';
                        $row.find('.dl-filter-value-wrapper').html('<select '+styleChange+' multiple="multiple" class="rowSelect dl-filter-value-start"></select>');
                        $row.find('.dl-filter-value-start').select2(
                            {
                                minimumInputLength: 1,
                                ajax: {
                                    delay: 250,
                                    transport: function (params, success, failure) {
                                        var paramData = params.data || {};
                                        var searchTerm = paramData.term || '';
                                        var request = MAData.autoCompleteSearch({
                                            source : $('#dl-source-select').val(),
                                            level : $('#dl-level-select').val(),
                                            field : forLegend == true ? $('#dl-legendSelect').val() : $row.find('.dl-filter-topic').val(),
                                            searchterm : searchTerm
                                        }).then(success);
                                        MAData.wizard.searchIndex++;
                                        return request;
                                    },
                                    processResults: function(resp,page){
                                        MAData.wizard.searchIndex--;
                                        if(resp.success) {
                                            var returnData = getProperty(resp,'data.data') || [];
                                            var results = [];
                                            $.each(returnData,function (i, item) {
                                                results.push({text: item.label,id:item.id});
                                            });
                                           //var results = {results : []}
                                            return {
                                                results : results   
                                            };
                                        }
                                        else {
                                            return {
                                                results : []
                                            }
                                        }
                                    }
                                },
                                tags: true,
                                language: {
                                    noResults: function (params) {
                                        return "Please enter a value above";
                                    }
                                }
                            }
                        );
                    }
                }
            }
        },
        
        buildOperatorSelect: function (type,forLegend) {
            forLegend = forLegend || false;
            //only show range if polygon
            var currentLevel = $('#dl-level-select').val();
            var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id');
            
            var operatorSelectHTML = '<select style="width:100%;" class="dl-filter-operator" onchange="MAData.wizard.updateValueField(this,'+forLegend+');">';
            //operatorSelectHTML += '<option value="--" selected>Please select an operator</option>';
            
            if(type == 'string') {
                operatorSelectHTML += '<option value="equals">equals</option>';
                operatorSelectHTML += '<option value="not equal to">not equal to</option>';
                operatorSelectHTML += '<option value="starts with">starts with</option>';
                operatorSelectHTML += '<option value="contains">contains</option>';
                operatorSelectHTML += '<option value="does not contain">does not contain</option>';
            }
            else if (type == 'decimal' || type == 'currency' || type == 'integer') {
                //REMOVED POLYGON RANGE ONLY FOR ISSUE MAY16MAPRT-84 - https://Maps.atlassian.net/browse/MAY16MAPRT-84
                
                // if(geo_type == 'polygon') {
                //     operatorSelectHTML += '<option value="range">range</option>';
                // }
                // else {
                    operatorSelectHTML += '<option value="equals">equals</option><option value="not equal to">not equal to</option>';
                    operatorSelectHTML += '<option value="less than">less than</option><option value="greater than">greater than</option>';
                    operatorSelectHTML += '<option value="less or equal">less or equal</option>';
                    operatorSelectHTML += '<option value="greater or equal">greater or equal</option>';
                    operatorSelectHTML += '<option value="range">range</option>';
                // }
            }
            else if (type == 'date') {
                operatorSelectHTML += '<option value="equals">equals</option><option value="not equal to">not equal to</option>';
                operatorSelectHTML += '<option value="less than">less than</option><option value="greater than">greater than</option>';
                operatorSelectHTML += '<option value="less or equal">less or equal</option>';
                operatorSelectHTML += '<option value="greater or equal">greater or equal</option>';
                operatorSelectHTML += '<option value="range">range</option>';
            }
            else if (type == 'boolean') {
                operatorSelectHTML += '<option value="equals">equals</option>';
            }
            else if (type == 'multipicklist') {
                operatorSelectHTML += '<option value="contains">contains</option>';
                operatorSelectHTML += '<option value="does not contain">does not contain</option>';
            }
            else {
                operatorSelectHTML += '<option value="equals">equals</option><option value="not equal to">not equal to</option>';
            }
            operatorSelectHTML += '</select>';
            
            return operatorSelectHTML;
            
        },
        
        updateFilter: function (selection) {
            var $topic = $(selection);
            var $option = $topic.find('option:selected');
            var dataType = $option.attr('data-type');

            //get the level details


            //build operator options
            var html = MAData.wizard.buildOperatorSelect(dataType);
            
            //update the row
            var $row = $topic.closest('.dl-filter-row');
            
            $row.find('.dl-filter-operator-wrap').html(html);
            $row.find('.dl-filter-operator-wrap select').select2().change();
            if(dataType == 'date') {
                $row.find('.dl-filter-value-start').val('');
            } else if(dataType == 'boolean') {
                var selectHTML = '<select class="dl-filter-value-start" style="width:100%;"><option value="true">True</option><option value="false">False</option></select>';
                $row.find('.dl-filter-value-wrapper').html(selectHTML);
                $row.find('.dl-filter-value-wrapper select').select2({
                    placeholder : 'Please select a topic'
                }).change();
            }
            
        },
        isSaving : false,
        
        saveDataLayer:function (plotLayer) {
            
            // Validation for 80 characters max (SF Limit)...
            if ($('#data-layer-name').val().trim().length > 80)
            {
                MAToastMessages.showWarning({
                    message: MASystem.Labels.MA_Validation_Error,
                    subMessage: MASystem.Labels.MA_Max_Length_80_Name,
                    timeOut: 8000,
                    closeButton: true
                });
                return;
            }

            if(MAData.wizard.isSaving) {
                return;
            }
            
            //validate our layer!
            var jsonData = MAData.wizard.validateDataLayer();
            if(jsonData.success == false) {
                return;
            }
            
            MA.Popup.showLoading({display:true,popupId:'MADataLayerEditor'});
            MAData.wizard.isSaving = true;
            
            //layer is validated, let's grab name, folder, user
            var $popup = $('#MADataLayerEditor');
            var isRefresh = $popup.data('isRefresh') || false;
            var $refreshLayer;
            if(isRefresh) {
                $refreshLayer = $popup.data('plottedLayer');
                if($('#MADataLayerEditor').data('layerType') == 'polygon') {
                    $refreshLayer.removeClass('visibleOnly');
                    //hide visible area button
                    $('#visibleAreaRefeshMap').removeClass('visible');
                }
                else {
                    $refreshLayer.addClass('visibleOnly');
                }
            }
            //get the folder
            var folderId;
            var layerId;
            var userId;
            
            //check if this is a saved layer (editing) else get folder
            var isClone = $popup.data('isClone') || false;
            if($('#MADataLayerEditor').data('layer-id') && !isClone) {
                layerId = $('#MADataLayerEditor').data('layer-id');
            }
            else {
                if($('#MADataLayerEditor').data('folder-id') == 'PersonalRoot' || $('#MADataLayerEditor').data('folder-id') == 'RoleUserFolder') {
                    if($('#MADataLayerEditor').data('folder-id') == 'RoleUserFolder') {
                        if (NewLayerNavigationEnabled()) {
                            //not supported right now
                            userId = MA.CurrentUser.Id;
                        }
                        else {
                            userId = $popup.data('folder-id-actual');
                        }
                        
                    }
                    else {
                        userId = MA.CurrentUser.Id;
                    }
                }
                else if ($('#MADataLayerEditor').data('folder-id') == 'CorporateRoot') {
                    //send nothing for corporate root
                }
                else {
                    //Something has to happen if we're in a subfolder here
                    
                    folderId = $('#MADataLayerEditor').data('folder-id');
                    var breadcrumbText = '';
                    //We've got to figure this thing out now
                    
                    if (NewLayerNavigationEnabled()) {
                        $.each($('div#folder-breadcrumb > a'), function(i,v) { 
                            breadcrumbText += $(v).text(); 
                        });
                        
                        //Check if this string contains 'Personal'
                        if(breadcrumbText.indexOf('Personal') === 4) {
                            userId = MA.CurrentUser.Id;
                        }
                    } else {
                        
                    }
                }
            }
            
            var processData = { 
            	ajaxResource : 'TreeAJAXResources',
            	
            	action: 'save_layerV2',
            	layerData: JSON.stringify({
                    maps__Description__c : $('#MADataLayerEditor .dl-desc').val(),
                    maps__Folder__c : folderId === 'Home' ? '' : folderId,
                    maps__Type__c : 'Data Layer',
                    maps__User__c : userId,
                    maps__Version__c : '1',
                    Name : $('#MADataLayerEditor .dl-label').val(),
                    Id : layerId
                }),
                jsonOptions : JSON.stringify(jsonData),
                isClone : $('#MADataLayerEditor').data('isClone') || false
            };
            
            //save the layer
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            	processData,
            	function(res, event){
            	    if(event.status) {
            	        MAData.wizard.isSaving = false;
                        if(res.success) {
                            //refresh the folders
                            if (NewLayerNavigationEnabled())
                            {
                                MAToastMessages.showSuccess({message:MASystem.Labels.DataLayer_Was_Saved});
                                // TODO callback refresh?
                                VueEventBus.$emit('refresh-folder');
                                if(plotLayer) {
                                    if(isRefresh) {
                                        //refresh
                                        //$refreshLayer.find('.basicinfo-name').text(res.data.Name);
                                        $refreshLayer.data('name',res.data.Name)
                                        MADemographicLayer.refreshDataLayer($refreshLayer,{name:res.data.Name});
                                    }
                                    else {
                                        var dataId = getProperty(res,'data.Id');
                                        var dataLayerType = '';
                                        try {
                                            var dataLayerOptions = JSON.parse(res.data.Options__c);
                                            dataLayerType = getProperty(dataLayerOptions, 'type');
                                        } catch (e) {
                                            // could not parse json
                                            console.warn('invalid json options', dataLayerOptions, e);
                                        }
                                        var isPlotted = $('#PlottedQueriesTable .DataLayer[data-id="'+dataId+'"]').length > 0;
                                        if(isPlotted) {
                                            $('#PlottedQueriesTable .DataLayer[data-id="'+dataId+'"] .basicinfo-name').text(res.data.Name);
                                        }

                                        var dataLayerObjectForAnalyze = {
                                            isPlotted: isPlotted,
                                            id: dataId,
                                            edit: true,
                                            modify: true,
                                            read: true,
                                            delete: true,
                                            name: (res.data.Name || 'Saved Data Layer'),
                                            dataLayerPlotType: dataLayerType
                                        }
                                        MADemographicLayer.analyzeDataLayer(dataLayerObjectForAnalyze);
                                    }
                                    VueEventBus.$emit('move-to-tab', 'plotted');
                                }
                            }
                            else
                            {
                                //old folders are deprecated
                                MAToastMessages.showWarning({message: MASystem.Labels.Layers_Could_Not_Load_Folder,timeOut:0,closeButton:true});
                            }
                            
                            MAData.wizard.closePopup();
                            MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                        
                        }
                        else {
                            MA.log(res);
                            var msg = res.message || 'Unable to save: Unknown Error.'
                            MAToastMessages.showError({message:MASystem.Labels.DataLayer_Was_Not_Saved,subMessage:msg,timeOut:0,closeButton:true});
                            MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                        }
                        
            	    }
            	    else if (event.type === 'exception') {
                        MAToastMessages.showError({message:MASystem.Labels.DataLayer_Was_Not_Saved,subMessage:event.message,timeOut:0,closeButton:true});
                        MA.log('Unable to save data layer',event.message + '::' + event.where);
                        MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                    } else {
                        MAToastMessages.showError({message:MASystem.Labels.DataLayer_Was_Not_Saved,subMessage:event.message,timeOut:0,closeButton:true});
                        MA.log('Unable to save data layer',event.message);
                        MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                    }
                },{escape:false,buffer:false}
            );
        },
        
        validateDataLayer : function () {
            var $popup = $('#MADataLayerEditor');
            
            var dataLayerSaveData = {
                opacity : 50 //may be deprecated?
            };
            
            //validate our name
            var $dataName = $popup.find('.dl-label').closest('.slds-form-element').removeClass('slds-has-error');
            if($dataName.find('#data-layer-name').val().replace(/[\t]/g, '') == '') {
                //go to tab
                $('#dl-details').click();
                //add error Class
                $dataName.closest('.slds-form-element').addClass('slds-has-error');
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.Error_Enter_A_Name,timeOut:0,closeButton:true});
                return {success:false};
            }
            
            
            //validate our source tab
            var $sourceSelect2 = $('#dl-source-wrapper .select2-container').removeClass('error');
            if($('#dl-source-select').val() == '--') {
                //find the select2 wrapper and add error
                $sourceSelect2.addClass('error');
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Data_Source_Requried,timeOut:0,closeButton:true});
                $('#dl-dataSource').click();
                return {success:false};
            }
            var $levelSelect2 = $('#dl-level-wrapper .select2-container').removeClass('error');
            if($('#dl-level-select').val() == '--') {
                //find the select2 wrapper and add error
                $levelSelect2.addClass('error');
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Detail_Required,timeOut:0,closeButton:true});
                $('#dl-dataSource').click();
                return {success:false};
            }
            var $styleWrapper = $('#dl-style .dl-card').removeClass('error');
            if($('#dl-style .dl-card.selected').length === 0) {
                //find the select2 wrapper and add error
                $styleWrapper.addClass('error');
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Style_Required,timeOut:0,closeButton:true});
                $('#dl-dataSource').click();
                return {success:false};
            }
            dataLayerSaveData['file_id'] = $('#dl-source-select').val();
            dataLayerSaveData['level_id'] = $('#dl-level-select').val();
            dataLayerSaveData['type'] = $('#dl-style .dl-card.selected').attr('data-id');
            
            //validate filters
            var filterError = false;
            var filters = [];
            $('#dlFilters .dl-filter-row').each(function(i,row) {
                var $row = $(row);
                var $filterContent = $row.find('.filter-content').removeClass('error');
                var filter = {};
                //validate source 
                var $rowSource = $row.find('.dl-filter-topic');
                var dataType = $rowSource.find('option:selected').attr('data-type');
                if($rowSource.val() == '--' || $rowSource.val() == null) {
                    $row.remove();
                    return true;
                }
                filter['topic_id'] = $rowSource.val();
                
                //check operator
                var $rowOperator = $row.find('.dl-filter-operator');
                var operatorValue = $rowOperator.val();
                if(operatorValue == null || operatorValue == '--') {
                    $filterContent.addClass('error');
                    filterError = true;
                    return {success:false};
                }
                // certain operators can be blank, let's validate those (using map to reduce loop and IE 11)
                var operatorsCanBeBlank = {'equals': 'equals', 'not equal to': 'not equal to', 'contains': 'contains', 'does not contain': 'does not contain'};
                // if the selected operator does not matches, and value is blank, show error
                if (!operatorsCanBeBlank[operatorValue]) {
                    var rowValue = $row.find('.dl-filter-value-start').val();
                    // if not array, make an array
                    var valueArray = [];
                    if (!Array.isArray(rowValue) && rowValue) {
                        valueArray.push(rowValue);
                    } else {
                        valueArray = rowValue;
                    }
                    // if the operator is not allowed to be blank but has a blank value, show error
                    if (valueArray.length === 0) {
                        $filterContent.addClass('error');
                        filterError = true;
                        return {success:false};
                    }
                }
                filter['operator'] = $rowOperator.val();
                //check values
                if($rowOperator.val() == 'range') {
                    var $rowValueStart = $row.find('.dl-filter-value-start');
                    var $rowValueEnd = $row.find('.dl-filter-value-end');
                    var startVal = $rowValueStart.val();
                    var endVal = $rowValueEnd.val();
                    if(dataType == 'date') {
                        var dateFormat = getProperty(MASystem,'User.dateFormat') || '';
                        var momentStart = moment(startVal,dateFormat.toUpperCase());
                        var momentEnd = moment(endVal,dateFormat.toUpperCase());
                        if((momentStart.isValid() || startVal == '') && (momentEnd.isValid() || endVal == '')) {
                            startVal = momentStart.format('YYYY-MM-DD');
                            endVal = momentEnd.format('YYYY-MM-DD');
                        }
                    }
                    else if(isNaN($rowValueStart.val()) || isNaN($rowValueEnd.val())) {
                        $filterContent.addClass('error');
                        filterError = true;
                        return {success:false};
                    }
                    filter['min'] = startVal;
                    filter['max'] = endVal;
                }
                else {
                    var $rowValue = $row.find('.dl-filter-value-start');
                    if(dataType == 'date') {
                        var startVal = $rowValue.val();
                        var dateFormat = getProperty(MASystem,'User.dateFormat') || '';
                        var momentStart = moment(startVal,dateFormat.toUpperCase());
                        if((momentStart.isValid() || startVal == '')) {
                            startVal = momentStart.format('YYYY-MM-DD');
                        }
                        filter['values'] = [startVal];
                    }
                    else {
                        filter['values'] = $rowValue.val();
                    }
                }
                
                filters.push(filter);
            });
            dataLayerSaveData['filters'] = filters;
            
            if(filterError) {
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Please_Update_Values,timeOut:0, extendedTimeOut:0, closeButton:true});
                $('#dl-filtersFix').click();
                return {success:false};
            }
            
            //check for empty tooltips and remove them
            $('#dl-tooltip-setup .dl-tooltip-row').each(function(i, tooltip) {
                var $tooltip = $(tooltip);
                //check if each tooltip has a topic
                var $tpTopic = $tooltip.find('.dl-tooltip-topic');
                var $tpSelect = $tooltip.find('.dl-tooltip-topic-wrap .select2-container').removeClass('error');
                if($tpTopic.val() == '--') {
                    $tooltip.remove();
                }
            });
            
            // if(tooltipError) {
            //     MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:'Please check all tooltips and update missing values.',timeOut:0,closeButton:true});
            //     $('#dl-tooltip').click();
            //     return {success:false};
            // }
            
            /******************************************
             * no tooltip errors, build out our json
            ******************************************/
            var popupJSON = {
                header : [],
                tabs : []
            };
            var $tooltipSetup = $('#dl-tooltip-setup');
            //loop over rows
            var headerRows = $tooltipSetup.find('.hearers-wrap .dl-tooltip-row');
            for(var h = 0; h < headerRows.length; h++) {
                var $head = $(headerRows[h]);
                var file_id = $head.find('.dl-tooltip-file').val();
                var topic_id = $head.find('.dl-tooltip-topic').val();
                if(topic_id != '--' && file_id != '--') {
                    var headObj = {
                        file_id: file_id,
                        topic_id: topic_id
                    }
                    popupJSON.header.push(headObj);
                }
            }
            
            //get tabs
            var tabRows = $tooltipSetup.find('.tabs-wrap .dl-tab');
            var tabsJSON = popupJSON.tabs;
            for(var t = 0; t < tabRows.length; t++) {
                var $tab = $(tabRows[t]);
                var tabLabel = $tab.find('.tab-name').val();
                tabUID = $tab.attr('uid');
                var tabObj = {
                    tab_id : tabUID,
                    tab_label: tabLabel,
                    data : []
                }
                
                //loop over the data rows that match that tab uid
                var $dataRows = $tooltipSetup.find('.details-wrap .dl-tooltip-row[data-tabid="'+tabUID+'"]');
                for(var dr = 0; dr < $dataRows.length; dr++) {
                    var $row = $($dataRows[dr]);
                    var tabfile_id = $row.find('.dl-tooltip-file').val();
                    var tabtopic_id = $row.find('.dl-tooltip-topic').val();
                    if(tabfile_id != '--' && tabtopic_id != '--' && tabtopic_id != null) {
                        var rowObj = {
                            file_id : tabfile_id,
                            topic_id : tabtopic_id
                        }
                        //add to the tab obj
                        tabObj.data.push(rowObj);
                    }
                }
                tabsJSON.push(tabObj);
            }
            dataLayerSaveData['popup'] = popupJSON;
            /******************************************
             * end tooltips
            ******************************************/
            
            //validate legend
            var legendData = {};
            var $styleButtons = $('#styleSelectWrap .styleDLbtn');
            if(!$styleButtons.hasClass('button-blue')) {
                $('#dl-filters').click();
                MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MAsystem.Labels.DataLayer_Style_Layer,timeOut:10000,closeButton:true});
                return {success:false};
            }
            //are we styling?
            var styleThisLayer = $('#styleSelectWrap .styleDLbtn.button-blue').hasClass('colorLegend') || false;
            if(styleThisLayer) {
                legendData['title'] = $('#dl-legend-grid .dl-legend-title').val();
                legendData['subTitle'] = $('#dl-legend-grid .dl-legend-subtitle').val();
                legendData['rows'] = [];
                //check that a source is selected
                var $legendSource = $('#dl-legendSelect');
                var $legendSelect2 = $('#dl-legendSelect-wrap .select2-container').removeClass('error');
                if($legendSource.val() == '--') {
                    $legendSelect2.addClass('error');
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MAsystem.Labels.DataLayer_Style_Layer,timeOut:10000,closeButton:true});
                    $('#dl-filters').click();
                    return {success:false};
                }
                dataLayerSaveData.topic_id = $legendSource.val();
                
                //validate that a legend type has been selected
                var $legendType = $('#legendDistButtons .dl-legitem');
                var legendType = $('#legendDistButtons .dl-legitem.active').attr('data-id');
                $('#legendDistButtons').removeClass('error');
                if($legendType.hasClass('active')) {
                    if(legendType == 'auto') {
                        //no checks needed here, we'll check for legend rows later
                    }
                    else if(legendType == 'quantiles') {
                        var $buckets = $('#dl-legend-options .dl-legend-buckets').removeClass('error');
                        var bucketVal = $buckets.val();
                        if(isNaN(bucketVal) || bucketVal == '') {
                            $buckets.addClass('error');
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Sort_By_Quantities,timeOut:10000,closeButton:true});
                            $('#dl-filters').click();
                            return {success:false};
                        }
                    }
                    else if(legendType == 'distribution') {
                        var $buckets = $('#dl-legend-options .dl-legend-buckets').removeClass('error');
                        var $minVal = $('#dl-legend-options .dl-legend-minVal').removeClass('error');
                        var minVal = $buckets.val();
                        if(isNaN(minVal) || minVal == '') {
                            $minVal.addClass('error');
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Sort_By_Distribution,timeOut:10000,closeButton:true});
                            $('#dl-filters').click();
                            return {success:false};
                        }
                        var $maxVal = $('#dl-legend-options .dl-legend-maxVal').removeClass('error');
                        var maxVal = $maxVal.val();
                        if(isNaN(maxVal) || maxVal == '') {
                            $maxVal.addClass('error');
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Sort_By_Distribution,timeOut:10000,closeButton:true});
                            $('#dl-filters').click();
                            return {success:false};
                        }
                        var $buckets = $('#dl-legend-options .dl-legend-buckets').removeClass('error');
                        var bucketVal = $buckets.val();
                        if(isNaN(bucketVal) || bucketVal == '') {
                            $buckets.addClass('error');
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Sort_By_Distribution,timeOut:10000,closeButton:true});
                            $('#dl-filters').click();
                            return {success:false};
                        }
                    }
                    else {
                        //manual, check legend rows
                        var $legendRows = $('#dl-legend-wrap .dl-legend-row input.error');
                        if($legendRows.length > 0) {
                            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Address_Errors_In_Legend,timeOut:10000,closeButton:true});
                            $('#dl-filters').click();
                            return {success:false};
                        }
                    }
                }
                else {
                    //no legend type, show error
                    $('#legendDistButtons').addClass('error');
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Specify_How_To_Divide,timeOut:10000,closeButton:true});
                    $('#dl-filters').click();
                    return {success:false};
                }
                
                //no error found, loop over legend rows
                var $legendRows = $('#dl-legend-wrap .dl-legend-row');
                var legendRowErrors = false;
                var legendDataType = $('#dl-legendSelect option:selected').attr('data-type');
                $legendRows.each(function(i, row) {
                    var $row = $(row);
                    var operator = $row.find('.dl-filter-operator').val();
                    var legendObject = {
                        'topic_id' : $('#dl-legendSelect').val()
                    };
                    legendObject['operator'] = operator;
                    
                    if(operator == 'range') {
                        //check for empty inputs
                        var $minVal = $row.find('.dl-filter-value-start');
                        var $maxVal = $row.find('.dl-filter-value-end');
                        var min = $minVal.val() != undefined ? MA.Util.parseNumberString($minVal.val()) : '';
                        var max = $maxVal.val() != undefined ? MA.Util.parseNumberString($maxVal.val()) : '';
                        if(isNaN(min) || min == '') {
                            legendRowErrors = true;
                            $minVal.addClass('error');
                        }
                        if(isNaN(max) || max == '') {
                            legendRowErrors = true;
                            $maxVal.addClass('error');
                        }
                        legendObject['min'] = min;
                        legendObject['max'] = max;
                    }
                    else if (legendDataType == 'number' || legendDataType == 'decimal' || legendDataType == 'currency') {
                        //check all the values for numbers
                        var $s2Wrap = $row.find('.dl-filter-value-wrapper .select2-container').removeClass('error');
                        var values = $row.find('.dl-filter-value-start').val();
                        var valuesArray = [];
                        if($row.hasClass('OTHER') || $row.hasClass('other')) {
                            legendObject['values'] = $row.find('.dl-filter-value-start').val();
                        }
                        else {
                            $.each(values || [], function(i,val) {
                                var isNumber = MA.Util.isNumber(val);
                                var parsedVal = val != undefined ? MA.Util.parseNumberString(val) : '';
                                if(isNumber && parsedVal != '') {
                                    valuesArray.push(parsedVal);
                                }
                                else {
                                    legendRowErrors = true;
                                    $s2Wrap.addClass('error');
                                    return false;
                                }
                            });
                            legendObject['values'] = valuesArray
                        }
                    }
                    else {
                        var $s2Wrap = $row.find('.dl-filter-value-wrapper .select2-container').removeClass('error');
                        if($row.find('.dl-filter-value-start').val() == '' || $row.find('.dl-filter-value-start').val() == undefined) {
                            legendRowErrors = true;
                            $s2Wrap.addClass('error');
                        }
                        legendObject['values'] = $row.find('.dl-filter-value-start').val();
                    }
                    
                    if($('#dl-style .dl-card.selected').attr('data-id') == 'point') {
                        legendObject['color'] = $row.find('.dl-legend-color').attr('data-color').replace('#','') + ':' + $row.find('.dl-legend-color').attr('data-maicon');
                    }
                    else {
                        legendObject['color'] = $row.find('.dl-legend-color').attr('data-color').replace('#','');
                    }
                    
                    legendData['rows'].push(legendObject);
                });
                
                if(legendRowErrors) {
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Address_Errors_And_Values_In_Legend,timeOut:0,closeButton:true});
                    $('#dl-filters').click();
                    return {success:false};
                }
                
            }
            else {
                dataLayerSaveData.topic_id = null;
                //no style, continue
                var legendRow = {};
                var type = $('#dl-style .dl-card.selected').attr('data-id');
                if(type == 'polygon') {
                    legendRow = {
                        color: '3c78d8',
                        max : '0',
                        min : '0',
                        operator : 'range',
                        topic_id : '--other--'
                    };
                }
                else if(type == 'point') {
                    legendRow = {
                        color : '93c47d:Circle',
                        operator : 'equals',
                        topic_id : '--other--',
                        values : '--Other--'
                    }
                }
                legendData['title'] = $('#dl-source-select option:selected').text();
                legendData['subTitle'] = '--';
                legendData['rows'] = [legendRow];
            }
            dataLayerSaveData['legend'] = legendData;
            
            return dataLayerSaveData;
        },
        
        validateInput: function (element,isLegend) {
            var $element = $(element);
            var $row = $element.closest('.dl-filter-row');
            
            if(isLegend) {
                dataType = $('#dl-legendSelect option:selected').attr('data-type');
            }
            else {
                dataType = $row.find('.dl-filter-topic option:selected').attr('data-type');
            }
            
            var dtArr = {
                'string'    :/(\w+)/ig,
                'date'      :/\b\d+[-/.]\d+[-/.]\d+\b/g,
                'decimal'   :/[^\d\t\r\n]+/g,
                'boolean'   :/(true|false)/ig
            };
            
            var trimmedValue = '';
            var newClass = 'valid';
            var inputVal = $element.val();
            switch(dataType) {
                case 'currency':
                    var origValisNum = MA.Util.isNumber(inputVal);
                    var parsedValue = MA.Util.parseNumberString(inputVal);
                    var notANumber = isNaN(parsedValue);
                    if(!origValisNum || notANumber) {
                        newClass = 'error';
                    }
                    else {
                        newClass = 'valid';
                    }
                    break;
                case 'decimal':
                    var dedValisNum = MA.Util.isNumber(inputVal);
                    var parsedDecValue = MA.Util.parseNumberString(inputVal);
                    var decNotANumber = isNaN(parsedDecValue);
                    if(!dedValisNum || decNotANumber) {
                        newClass = 'error';
                    }
                    else {
                        newClass = 'valid';
                    }
                    break;
                    break;
                    
                case 'string':
                    
                    trimmedValue = $element.val().trim();
                    newClass = trimmedValue.search( dtArr[dataType] ) > -1 ? 'valid' : 'error';
                    break;
                    
                case 'date':
                    trimmedValue = $element.val().trim();
                    newClass = (trimmedValue.search( dtArr[dataType] ) > -1 && trimmedValue.length <= 10) ? 'valid' : 'error';
                    if(trimmedValue == '') {
                        newClass = 'valid';
                    }
                    break;
                    
                case 'boolean':
                    trimmedValue = $element.val().trim().toLowerCase();
                    newClass = (trimmedValue == 'true' || trimmedValue == 'false') ? 'valid' : 'error';
                    break;
                
                default:
                    //not in our checks, assume it's valid
                    trimmedValue = $element.val();
                    newClass = 'valid';
                    break;
            }
            
            $element.removeClass('valid').removeClass('error').addClass(newClass);
        }
        
    },

    //return a response from our database containing all data layer sources
    //optionally pass a parameter to retrieve on certain info
    getDataLayerSource: function(urlParameters,updateSelect) {
        updateSelect = updateSelect || true;
        /******************
         * @param (optional) {object - string:string} urlParameters
         * 
         * urlParameters = {
         *  source : {string},
         *  fields : {boolean} || false
         * }
         * 
         * if not specified, all sources will be returned with no fields
        *******************/
        MA.Popup.showLoading({display:true,popupId:'MADataLayerEditor'});
        var $loadingSource = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,subMessage:MASystem.Labels.Almost_There,timeOut:0,extendedTimeOut:0});
        var dfd = jQuery.Deferred();
        
        var options = { 
            method : 'get',
            action: 'sources',
            subType : 'data',
            version : '2'
        };
        var paramerters = urlParameters || {};
        paramerters = $.extend({
            orgId : MASystem.MergeFields.Organization_Id
        }, paramerters || {} );
        $('#MADataLayerEditor').removeData('sources');

        // Check if User has SelfHostedDataUser permission enabled to display Data Uploader link.
        // remove the false when this feature is added back
        if (userSettings.SelfHostedDataUser == true && window.advancedFeatureLicenseEnabled && $("#uploader-link").length !== 1) {
            $('#dl-grid').append(
                '<a id="uploader-link" href="' + window.MA.SelfHostedUrl + '" target="_blank"'
                + 'style="'
                + 'padding-left: .75rem; '
                + 'color: #005fb2; '
                + 'text-decoration: none; '
                + 'font-family: Salesforce Sans; '
                + 'font-size: .875rem">'
                + 'Add a Data Source&nbsp;'
                + '<span class="ma-icon ma-icon-new-window"></span>'
                + '</a>');
        }

        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
            options ,
            paramerters,
            function(res, event){
                MAToastMessages.hideMessage($loadingSource);
                MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
                if(event.status) {
                    if(res.success) {
                        var sources = getProperty(res,'data.sources');
                        //let's populate our data source tab
                        if(sources != undefined) {
                            //reset our boxes
                            var sourceFragment = document.createDocumentFragment();
                            var sourceById = {};
                            $.each(sources,function(index,source) {
                                var opt = document.createElement('option');
                                opt.innerHTML = source.label;
                                opt.value = source.id;
                                opt.setAttribute('has_auto_legend', source.has_auto_legend || 'false');
                                sourceFragment.appendChild(opt);

                                sourceById[source.id] = source;
                            });
                            
                            if(updateSelect) {
                                $('#dl-source-wrapper').html('<select style="width: 300px;" id="dl-source-select" class="dl-combobox" onchange="MAData.getDataLayerLevelOfDetail()"><option value="--" selected>-- Select --</option></select>');
                                var $select = $('#dl-source-select');
                                $select[0].appendChild(sourceFragment);
                                $select.select2();
                                $select.next().find('input').removeClass('error');
                            }
                            
                            //cache our data source so another call out will not be needed
                            $('#MADataLayerEditor').data('sources',sourceById);
                            dfd.resolve({success:true});
                        }
                        else {
                            dfd.resolve({success:false,error:MASystem.Labels.DataLayer_Data_Sources_Not_Avail,errInfo:res});
                            MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,res);
                        }
                    }
                    else {
                        dfd.resolve({success:false,error:MASystem.Labels.DataLayer_Data_Sources_Not_Avail,errInfo:res});
                        MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,res);
                    }
                }
                else if (event.type === 'exception') {
                    dfd.resolve({success:false,error:event.message,errInfo:event.message + '::' + event.where});
                    MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,event.message + '::' + event.where);
                } else {
                    dfd.resolve({success:false,error:event.message,errInfo:event.message});
                    MA.log(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,event.message);
                }
            },{timeout:120000,buffer:false,escape:false}
        );
        
        return dfd.promise();
    },

    getDataLayerFieldsFromMAIO: function (dataSource) {
        var dfd = $.Deferred();

        var options = { 
            method : 'get',
            action: 'sources',
            subType : 'data',
            version : '2'
        };
        var paramerters =  {
            'fields' : 'true',
            'source' : dataSource,
            'orgId'  : MASystem.MergeFields.Organization_Id
        };
        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
            options ,
            paramerters,
            function(res, event){
                if(event.status) {
                    if(res && res.success) {
                        var sources = getProperty(res,'data.sources');
                        if(sources === undefined) {
                            console.warn(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,res);
                            dfd.reject(MASystem.Labels.DataLayer_Data_Sources_Not_Avail);
                        }
                        else {
                            dfd.resolve(sources);
                        }
                    }
                    else {
                        console.warn(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,res);
                        dfd.reject(MASystem.Labels.DataLayer_Data_Sources_Not_Avail);
                    }
                }
                else {
                    console.warn(MASystem.Labels.DataLayer_Data_Sources_Not_Avail,event);
                    dfd.reject(event.message);
                }
            },{buffer:false, timeout: 45000, escape:false}
        );
        return dfd.promise();
    },
    
    getDataLayerSourceFields: function (dataSource) {
        dataSource = dataSource || $('#dl-source-select').val();
        if(dataSource == undefined || dataSource == '--') {
            MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:MASystem.Labels.DataLayer_Data_Sources_Not_Avail,timeOut:6000});
            return;
        }
        
        var dfd = jQuery.Deferred();
        //check if this source has already been retrieved this round
        var dataSources = $('#MADataLayerEditor').data('sources');
        var dataObject = dataSources[dataSource];
        if(dataObject != undefined && dataObject.hasFields == true) {
            //just return, we are good here
            dfd.resolve({success:true});
        }
        else {
            //let's go get these fields
            MA.Popup.showLoading({display:true,popupId:'MADataLayerEditor'});
            var $loadingSource = MAToastMessages.showLoading({message:MASystem.Labels.MA_Loading_With_Ellipsis,subMessage:MASystem.Labels.Almost_There,timeOut:0,extendedTimeOut:0});
            
            MAData.getDataLayerFieldsFromMAIO(dataSource).then(function(sources) {
                $.each(sources || [], function (i,source) {
                    var sourceId = source.id;
                    source.hasFields = true;
                    dataSources[sourceId] = source;
                });
                dfd.resolve({success:true});
            }).fail(function(err) {
                dfd.resolve({success:false,error:err});
            }).always(function() {
                MAToastMessages.hideMessage($loadingSource);
                MA.Popup.showLoading({display:false,popupId:'MADataLayerEditor'});
            });
        }
        
        return dfd.promise();
    },

    getDataLayerLevelOfDetail: function () {
        var dfd = $.Deferred();
        
        var selectedSource = $('#dl-source-select').val();
        var $s2Wrap = $('#dl-source-wrapper .select2-container').removeClass('error');
        //reset the legend
        MAData.wizard.resetFilters();
        MAData.wizard.resetTooltip(true);
        MAData.wizard.resetLegend();
        
        //hide next steps
        $('#dl-style').removeClass('slds-show').addClass('slds-hide');
        $('#dl-level').removeClass('slds-show').addClass('slds-hide');
        $('.next-Tooltip').removeClass('slds-show').addClass('slds-hide');
        if(selectedSource == '--') {
            dfd.resolve({success:false});
            $s2Wrap.addClass('error');
            return dfd.promise();
        }
        
        var dataSources = $('#MADataLayerEditor').data('sources');
        $('#dl-level').addClass('slds-show').removeClass('slds-hide');
        var thisSource = dataSources[selectedSource];
        if(dataSources != undefined && thisSource.hasFields == true) {
            MAData.popupulateLevels(dataSources);
            dfd.resolve({success:true});
        }
        else {
            //go grab our info
            MAData.getDataLayerSourceFields(selectedSource).then(function(res) {
                if(res.success) {
                    dataSources = $('#MADataLayerEditor').data('sources');
                    if(dataSources != undefined) {
                        MAData.popupulateLevels(dataSources);
                        dfd.resolve({success:true});
                    }
                    else {
                        MA.log(res);
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:res.error || MASystem.Labels.DataLayer_Cannot_Find_Details,timeOut:0,closeButton:true});
                        dfd.resolve({success:false});    
                    }
                }
                else {
                    MA.log(res);
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:res.error || MASystem.Labels.DataLayer_Cannot_Find_Details,timeOut:0,closeButton:true});
                    dfd.resolve({success:false});
                }
            });
        }
        
        return dfd.promise();
    },
    
    popupulateLevels : function (dataSources) {
        //use our stored info
        var fileId = $('#dl-source-select').val();
        if(dataSources != undefined) {
            var dataSource = dataSources[fileId];
            if(dataSource != undefined) {
                var dataLevels = dataSource.levels || [];
                
                //reset our boxes
                var sourceFragment = document.createDocumentFragment();
                var firstOpt = document.createElement('option');
                firstOpt.innerHTML = '--Select--';
                firstOpt.value = '--';
                sourceFragment.appendChild(firstOpt);
                var valueOne = '';
                $.each(dataLevels || [] ,function(index,level) {
                    var opt = document.createElement('option');
                    valueOne = level.id;
                    opt.innerHTML = level.label;
                    opt.value = level.id;
                    opt.setAttribute('data-markers',level.markers);
                    opt.setAttribute('data-tiles',level.tiles);
                    sourceFragment.appendChild(opt);
                });
                
                $('#dl-level-wrapper').html('<select style="width:300px;" id="dl-level-select" class="dl-combobox" onchange="MAData.getDataLayerStyle();"></select>');
                var $select = $('#dl-level-select');
                $select[0].appendChild(sourceFragment);
                $select.select2();
                $select.next().find('input').removeClass('error');
                
                //if only 1 selection, select it and move forward
                if(dataLevels.length == 1){
                    $('#dl-level-select').val(valueOne).change();
                }
            }
        }
    },
    
    getDataLayerStyle : function () {
        var dfd = $.Deferred();
        
        //reset the legend
        MAData.wizard.resetFilters();
        MAData.wizard.resetTooltip(true);
        MAData.wizard.resetLegend();
        
        var selectedSource = $('#dl-source-select').val();
        var $s2Wrap = $('#dl-level-wrapper .select2-container').removeClass('error');
        var dataSources = $('#MADataLayerEditor').data('sources');
        //$('#dl-level').addClass('slds-show').removeClass('slds-hide');
        if(dataSources != undefined) {
            MAData.popupulateStyle(dataSources);
            dfd.resolve({success:true});
        }
        else {
            //go grab our info
            MAData.getDataLayerSource().then(function(res) {
                if(res.success) {
                    dataSources = $('#MADataLayerEditor').data('sources');
                    if(dataSources != undefined) {
                        MAData.popupulateLevels(dataSources);
                        dfd.resolve({success:true});
                    }
                    else {
                        MA.log(res);
                        MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:res.error || MASystem.Labels.DataLayer_Cannot_Find_Details,timeOut:0,closeButton:true});
                        dfd.resolve({success:false});    
                    }
                }
                else {
                    MA.log(res);
                    MAToastMessages.showError({message:MASystem.Labels.Almost_There,subMessage:res.error || MASystem.Labels.DataLayer_Cannot_Find_Details,timeOut:0,closeButton:true});
                    dfd.resolve({success:false});
                }
            });
        }
        
        return dfd.promise();
    },
    
    popupulateStyle: function (selectOption) {
        //use our stored info
        var $selectedLevel = $('#dl-level-select');
        var $selecedOptions = $selectedLevel.find('option:selected');
        
        $('#dl-style .dl-card').removeClass('selected');
        if($selectedLevel.val() == '--') {
            $('#MADataLayerEditor .next-Tooltip').removeClass('slds-show').addClass('slds-hide');
            $('#dl-level-wrapper .select2-container').addClass('error');
            $('#dl-style').removeClass('slds-show').addClass('slds-hide');
            return;
        }
        
        $('#dl-style').addClass('slds-show').removeClass('slds-hide');
        
        
        //what do we show?
        var showMarkers = $selecedOptions.attr('data-markers') == 'true' ? true : false;
        var showTiles = $selecedOptions.attr('data-tiles') == 'true' ? true : false;
        $('#dl-style .dl-card[data-id="point"]').addClass('hidden');
        $('#dl-style .dl-card[data-id="polygon"]').addClass('hidden');
        
        if(showMarkers && showTiles) {
            $('#dl-style .dl-card[data-id="point"]').removeClass('hidden');
            $('#dl-style .dl-card[data-id="polygon"]').removeClass('hidden');
        }
        else if (showMarkers) {
            $('#dl-style .dl-card[data-id="point"]').removeClass('hidden');
            $('#dl-style .dl-card[data-id="point"]').addClass('selected').click();
        }
        else if (showTiles) {
            $('#dl-style .dl-card[data-id="polygon"]').removeClass('hidden');
            $('#dl-style .dl-card[data-id="polygon"]').addClass('selected').click();
        }
        
    },
    
    selectDataLayerStyle: function (element) {
        var $el = $(element);
        //remove checkmarks
        $('#dl-style .dl-card').removeClass('selected error');
        $el.addClass('selected');
        $('.next-Tooltip').addClass('slds-show').removeClass('slds-hide');
        
        //determine what sample images to display
        var geo_type = $('#MADataLayerEditor .dl-cards .dl-card.selected').attr('data-id');
        $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"]').removeClass('hidden');

        //scroll down
        var $panel = $('#dl-rightPanel .dl-panel[data-id="dl-dataSource"]');
        var height = $panel[0].scrollHeight;
        $panel.animate({ scrollTop: height }, 1000);

        //update sample images
        $('#legendImagePlaceholder .legImgWrapper .legendImg').addClass('hidden');
        $('#legendImagePlaceholder .legImgWrapper[data-type="'+geo_type+'"] .legendImg').first().removeClass('hidden');
    },

    //Removes the overlay
    RemoveOverlay: function (name) {
        $.each(MA.map.overlayMapTypes.getArray(), function (i, overlay) {
            if (overlay.name == name) {
                MA.map.overlayMapTypes.removeAt(i);
                return false;
            }
        });
    },
    
    legacyDataLayerMap : {
        "42-sample" : "42",
        "x_can_2006_census" : "x_can_2006_census",
        "x_usa_2010_census" : "x_usa_2010_census",
        "x_mex_demographics" : "x_mex_demographics",
        "x_aus_2011_abs_select" : "x_aus_2011_abs_select",
        "x_can_2011_census" : "x_can_2011_census",
        "x_can_2011_nhs" : "x_can_2011_nhs",
        "x_usa_2013_acs" : "x_usa_2013_acs",
        "x_usa_2013_elsi" : "x_usa_2013_elsi",
        "x_usa_2015_energy" : "x_usa_2015_energy",
        "x_usa_2016_maponics_autodealers" : "maponics_autodealers",
        "x_usa_2016_maponics_prizm" : "maponics_prizm",
        "x_usa_2016_maponics_schools" : "maponics_schools",
        "x_airports" : "x_airports",
        "x_usa_2015_cbre" : "x_usa_2015_cbre",
        "x_2016_maponics_colleges" : "maponics_colleges",
        "x_maponics_demographics" : "maponics_demographics",
        "x_jlg_emea" : "x_jlg_emea",
        "x_eu_2016_nuts" : "x_eu_2016_nuts",
        "x_growthplay" : "x_growthplay",
        "x_hospitals" : "x_hospitals",
        "x_italy" : "x_italy",
        "x_business" : "business",
        "x_usa_dbusa_sample" : "business_sample",
        "x_usa_dbusa" : "business",
        "ma_business_sample" : "business_sample",
        "ma_business" : "business",
        "x_dmp_data" : "property",
        "x_property_sample" : "property_sample",
        "x_jlg_ship_to_location" : "x_jlg_ship_to_location",
        "x_rehau_permits_2015" : "x_rehau_permits_2015",
        "x_superchargers" : "x_superchargers",
        "x_usa_2016_truecar_august" : "x_usa_2016_truecar_august",
        "x_usa_2016_truecar_july" : "x_usa_2016_truecar_july",
        "x_nzl_2014_votingplace" : "x_nzl_2014_votingplace",
    },
    
    legacySourceDataLayer : function (sources,oldValues) {
        if(sources === undefined) {
            return oldValues;
        }
        // oldValues [{"topic_id":"latitude","field":"Latitude"},{"topic_id":"longitude","field":"Longitude"}, etc]
        var returnValues = [];
        try {
            // should be an array of objects with 1 
            var source = sources[0] || {};
            var fields = getProperty(source || {}, 'fields', false) || [];
            for(var f = 0; f < oldValues.length; f++) {
                var data = oldValues[f];
                var oldField = data.topic_id;
                if(oldField !== undefined) {
                    var found = false;
                    var partialMatch = undefined;
                    // compare the field data with source info
                    for(var i = 0; i < fields.length; i++) {
                        var field = fields[i];
                        var serverField = field.id;
                        if(serverField === oldField) {
                            // no change needed
                            found = true;
                            break;
                        }
                        else if (!partialMatch && oldField.indexOf(serverField) >= 0) {
                            // first partial match
                            partialMatch = serverField;
                        }
                    }
                    if (!found && partialMatch) {
                        data.topic_id = partialMatch;
                    }
                }
            }
        }
        catch (e) {
            console.warn('Unable to update old data field values', e);
        }
        
        return oldValues;
    },

    legacySelectDataLayer : function (select,oldValue) {
        if(select == null) {
            return oldValue;
        }
        var returnValue = oldValue;
        var partialMatch = null;
        var fullMatch = null;
        try {
            var $select = $(select);
            $select.find('option').each(function(i,opt) {
                var optValue = opt.value || '';
                if(oldValue == optValue) {
                    fullMatch = optValue;
                    return false;
                }
                else if(oldValue.indexOf(optValue) > -1) {
                    partialMatch = optValue;
                    //return false;
                }
            });
        }
        catch (e) {
            returnValue = oldValue;
        }
        
        if(fullMatch != null) {
            returnValue = fullMatch;
        }
        else if(partialMatch != null) {
            returnValue = partialMatch;
        }
        else {
            returnValue = oldValue;
        }
        
        return returnValue;
    },
    
    autoCompleteSearch : function (params) {
        var dfd = $.Deferred();
        var options = { 
            method : 'get',
            action: 'autocomplete',
            subType : 'data',
            version : '2'
        };
        
        $.extend({
            source : '',
            level : '',
            field : '',
            searchterm : ''
        }, params || {});
                
        Visualforce.remoting.Manager.invokeAction(MARemoting.MapAnythingIORequest,
            options ,
            params,
            function(res, event){
                if(event.status) {
                    if(res.success) {
                        var data = res.data || [];
                        dfd.resolve(res);
                    }
                    else {
                        dfd.resolve({success:false});
                        MA.log('Unable to get data layer autocomplete',res);
                    }
                }
                else if (event.type === 'exception') {
                    dfd.resolve({success:false});
                    MA.log('Unable to get data layer autocomplete',event.message + '::' + event.where);
                } else {
                    dfd.resolve({success:false});
                    MA.log('Unable to get data layer autocomplete',event.message);
                    }
            },{buffer:false,escape:false}
        );
        
        return dfd.promise();
    }
}
