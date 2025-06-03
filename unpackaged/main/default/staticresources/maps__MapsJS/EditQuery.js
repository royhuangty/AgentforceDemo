function validateDateRange(startDate, endDate) {
    // date format should be in the form of YYYY-MM-DD or current users format
    // expecting a range, can be an acutal date or date literal => 2017-03-20 or TODAY
    var formatedDate = getProperty(MASystem || {}, 'User.dateFormat', false) || 'M/D/YYYY';
    // moment expects all upper case for format
    formatedDate = formatedDate.toUpperCase();
    // check if date literal
    var endIsDateLiteral = false;
    var startIsDateLiteral = false;
    var startObj = {};
    var endObj = {};
    for (var i = 0; i < MADateLiterals.length; i++)
    {
        if (MADateLiterals[i].label == startDate && MADateLiterals[i].value != 'DYNAMIC') {
            startIsDateLiteral = true;
            startObj = MADateLiterals[i];
            startObj.success = true;
        }
        if (MADateLiterals[i].label == endDate && MADateLiterals[i].value != 'DYNAMIC') {
            endIsDateLiteral = true;
            endObj = MADateLiterals[i];
            endObj.success = true;
        }
    }

    // check if these are a dynamic date literal if above was unsuccessful
    if(!startIsDateLiteral) {
        startObj = buildDynamicDateLiteral(startDate);
        startIsDateLiteral = startObj.isDateLiteral || false;
    }
    if(!endIsDateLiteral) {
        var endObj = buildDynamicDateLiteral(endDate);
        endIsDateLiteral = endObj.isDateLiteral || false;
    }

    // check if this is a valid date
    // attempt to build raw date
    if(!startIsDateLiteral) {
        var isValidStart = true;
        var momentStart = moment(startDate,formatedDate).utc().startOf('day');
        if(!momentStart.isValid()) {
            // try standard SF date
            momentStart = moment(startDate,'YYYY-MM-DD').utc().startOf('day');
        }
        startObj = {
            success: momentStart.isValid(),
            date: momentStart.format('MM/DD/YYYY'),
            getMoment: function() {return momentStart;}
        }
    }
    if(!endIsDateLiteral) {
        var momentEnd = moment(endDate,formatedDate).utc().startOf('day');
        if(!momentEnd.isValid()) {
            // try standard SF date
            momentEnd = moment(endDate,'YYYY-MM-DD').utc().startOf('day');
        }
        endObj = {
            success: momentEnd.isValid(),
            date: momentEnd.format('MM/DD/YYYY'),
            getMoment: function() {return momentEnd;}
        }
    }

    // validate our checks and compare if start is before end
    if(startObj.success && endObj.success) {
        var startMoment = startObj.getMoment();
        var endMoment = endObj.getMoment();
        var dateIsValid = startMoment.isSameOrBefore(endMoment);

        if(dateIsValid) {
            return {success: true};
        }
        else {
            return {success: false, error: 'Start date is after the end date.'}
        }
    }
    else {
        if(!startObj.success && !endObj.success) {
            return {success: false, error: 'Invalid start and end dates.'};
        }
        else if(!startObj.success) {
            return {success: false, error: 'Invalid start date.'};
        }
        else {
            return {success: false, error: 'Invalid end date.'};
        }
    }
}

function buildDynamicDateLiteral (dateLiteral) {
    var isDateLiteral = false;
    var dateIsValid = true;
    var literalDate;    
    try {
        var stringParts = dateLiteral.split(' ');
        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
            var checkArr = ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS'];
            var inArray = checkArr.indexOf(stringParts[2]) >= 0;

            var literalNumber = stringParts[1] || '';
            isDateLiteral = true;
            if(!isNum(literalNumber)) {
                dateIsValid = false;
                return {success: false, isDateLiteral:isDateLiteral, error: literalNumber + ' is not a number.'};
            }

            if(isNum(literalNumber) && stringParts.length == 3 && inArray) 
            {
                if (stringParts[0] == 'NEXT') {
                    literalDate = moment().utc().add(literalNumber, stringParts[2].toLowerCase()).startOf('day');
                    return {success: true, getMoment:function() { return literalDate;}, date: literalDate.format('MM/DD/YYYY'), isDateLiteral:isDateLiteral};
                }
                else if (stringParts[0] == 'LAST') {
                    literalDate = moment().utc().subtract(literalNumber, stringParts[2].toLowerCase()).startOf('day');
                    return {success: true, getMoment:function() { return literalDate;}, date: literalDate.format('MM/DD/YYYY'), isDateLiteral:isDateLiteral};
                }
                else {
                    return {success:false, error:'No date literal info found for: ' + dateLiteral, isDateLiteral:isDateLiteral};
                }
            }
            else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') 
            {
                var fiscalType = stringParts[3] || '';
                fiscalType = fiscalType.toLowerCase();
                var FiscalYearSettings = getProperty(MASystem, 'Organization.FiscalYearSettings', false) || {};
                var currentFiscalQuarterStartDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterStartDate');
                var currentFiscalQuarterEndDate = MAWorkerGetProperty(FiscalYearSettings, 'currentFiscalQuarterEndDate');
                var quarterDateFormat = MAWorkerGetProperty(FiscalYearSettings, 'dateFormat');
                var literalNumber = stringParts[1];
                isDateLiteral = true;
                if (fiscalType == 'quarters' || fiscalType == 'years') // fiscal quarter logic needs to be applied
                {
                    fiscalType = fiscalType.toLowerCase();

                    if(currentFiscalQuarterStartDate && currentFiscalQuarterEndDate) 
                    {
                        if(stringParts[0] == 'NEXT') 
                        {
                            literalDate = moment(currentFiscalQuarterStartDate, quarterDateFormat).add(literalNumber, fiscalType).startOf('day');
                        } 
                        else if(stringParts[0] == 'LAST') 
                        {
                            literalDate = moment(currentFiscalQuarterStartDate, quarterDateFormat).subtract(literalNumber, fiscalType).startOf('day');
                        }
                        return {success: true, getMoment:function() { return literalDate;}, date: literalDate.format('MM/DD/YYYY'), isDateLiteral:isDateLiteral};
                    }
                    else {
                        return {success:false, error:'No fiscal info found for: ' + dateLiteral, isDateLiteral:isDateLiteral};
                    }
                }
                else {
                    return {success: false, error: fiscalType + ' not a valid fiscal option', isDateLiteral:isDateLiteral};
                }
            }
        }
        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
            var stringPartsValue = parseInt(stringParts[0]);
            var stringPartsUnit = stringParts[1].toLowerCase();
            var checkArr = ['days', 'years'];
            var literalType = stringParts[1] || '';
            literalType = literalType.toLowerCase();
            var inArray = checkArr.indexOf(literalType) >= 0;
            isDateLiteral = true;
            if(!isNum(stringPartsValue)) {
                dateIsValid = false;
                return {success: false, error: literalNumber + ' is not a number.', isDateLiteral:isDateLiteral};
            }
            if (!isNaN(stringPartsValue) && inArray) {
                var stringPartsEnd = stringParts[2] + (stringParts[3] ? ' ' + stringParts[3] : '');
                if (stringPartsEnd == 'AGO') {
                    literalDate = moment().utc().subtract(stringPartsValue, stringPartsUnit).startOf('day');
                }
                else if (stringPartsEnd == 'FROM NOW') {
                    literalDate = moment().utc().add(stringPartsValue, stringPartsUnit).startOf('day');
                }
                return {success: true, getMoment:function() { return literalDate;}, date: literalDate.format('MM/DD/YYYY'), isDateLiteral:isDateLiteral};
            }
            else {
                return {success: false, error: 'No date literal found for: ' + dateLiteral, isDateLiteral:false}
            }
        }
        else {
            return {success: false, error: 'No date literal found for: ' + dateLiteral, isDateLiteral:isDateLiteral}
        }
    }
    catch (err) { 
        return {success: false, error: err, isDateLiteral:isDateLiteral};
    }
}

function refreshBadges()
{
	//filter by owner
	var filterByOwnerCount = $('#savedqueryeditor .filterbyowner input:radio[name=filterByOwner]:checked').val() == 'TRUE'
	|| $('#savedqueryeditor .filterbyowner input:radio[name=filterByOwner]:checked').val() == 'TEAM'
	|| $('#savedqueryeditor .filterbyowner input:radio[name=filterByOwner]:checked').val() == 'MINE'
	|| $('#savedqueryeditor .filterbyowner input:radio[name=filterByOwner]:checked').val() == 'MYTEAM'
	? 1 : 0;

	if (filterByOwnerCount == 0) {
		$('.filtericon.filterbyownertab .filtericon-badge').hide();
	}
	else {
		$('.filtericon.filterbyownertab .filtericon-badge').text(filterByOwnerCount).show();
	}

	//field filters
	var filterCount = $('.fieldfilters .listbox .filter').length;
	if (filterCount == 0) {
		$('.filtericon.fieldfiltertab .filtericon-badge').hide();
	}
	else {
		$('.filtericon.fieldfiltertab .filtericon-badge').text(filterCount).show();
	}
	
	//cross object filters
	var crossfilterCount = $('.crossfilters .listbox .crossfilter').length;
	if (crossfilterCount == 0) {
		$('.filtericon.crossfiltertab .filtericon-badge').hide();
	}
	else {
		$('.filtericon.crossfiltertab .filtericon-badge').text(crossfilterCount).show();
	}
	
	//filter by activity
	var filterByActivityCount = ($('.activityfilter-task.combobox').val() == 'all' ? 0 : 1) + ($('.activityfilter-event.combobox').val() == 'all' ? 0 : 1);
	if (filterByActivityCount == 0) {
		$('.filtericon.filterbyactivitytab .filtericon-badge').hide();
	}
	else {
		$('.filtericon.filterbyactivitytab .filtericon-badge').text(filterByActivityCount).show();
	}
	
	//advanced filter options
	var advancedOptionsCount = ($('.advanced .orderby-field').val() == '--'+MASystem.Labels.MA_None+'--' ? 0 : 1) + ($('.advanced .limit-records-enabled').is(':checked') == true ? 1 : 0) + ($('.advanced .limit-proximity-enabled').is(':checked') == true ? 1 : 0)
	+ ( $('.date_time_range_wrapper .date_time_range').val() != 'all' ? 1:0 );
	
	if (advancedOptionsCount == 0)
	{
		$('.advancedtab.filtericon .filtericon-badge').hide();
	}
	else {
		$('.advancedtab.filtericon .filtericon-badge').text(advancedOptionsCount).show();
	}
}
        
try {

    function AddColorRow(hexColor, int)
    {
        var UnixTimeInMilliseconds = (new Date).getTime() + int; //we use the 'int' var because in a loop getTime() might result in the same so value;
        var rgbArray = hexToRgbHeatMap(hexColor);
        var rgbStr = 'rgb(' + rgbArray.r +', '+ rgbArray.g +', '+ rgbArray.b +')';

        $('#heatmap-options-color-table').append('<tr><td style="padding-bottom:3px;"><a onclick="MoveHeatMapOptionsColorRowUp(this)" class="hmo-button"><img class="hmo-arrow-up" src="' + imageRefs.arrowUp + '" width="19" height="13" /></a>' +
            '<a onclick="MoveHeatMapOptionsColorRowDown(this)" class="hmo-button"><img class="hmo-arrow-down" src="' + imageRefs.arrowDown + '" width="9" height="5" /></a></td>' +
            '<td><input id="heatmap-options-color-input-'+ UnixTimeInMilliseconds +'" class="color boundary-style" style="background-color: ' + rgbStr +'; color:  ' + rgbStr +';" type="text" autocomplete="off" value="' + hexColor + '" /></td>' + 
            '<td><a class="heatmap-arrange-delete" onclick="RemoveHeatMapOptionsColorRow(this)"><img src="' + imageRefs.delete + '" width="19" height="18" /></a></td></tr>'
        );
        
        new jscolor.color(document.getElementById('heatmap-options-color-input-' + UnixTimeInMilliseconds), {});
    }
    
    function MoveHeatMapOptionsColorRowUp(obj)
    {
        var row = $(obj).parents("tr:first");
        row.insertBefore(row.prev());
    }
    
    function MoveHeatMapOptionsColorRowDown(obj)
    {
        var row = $(obj).parents("tr:first");
        row.insertAfter(row.next());
    }
    
    function RemoveHeatMapOptionsColorRow(obj)
    {
        $(obj).parents("tr:first").remove();
    }
    
    function hexToRgbHeatMap(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /*
     * hide/show top level tabs based on the layer type (determined by the type of base object the layer is based off of)
     **/
    function showHideEditQueryTabs() 
    {
        // this string is built in the controller
        var tabsToDisplayString = savedQueryInfo.tabsToDisplay.trim();
        
        // only do the hiding and showing if we successfully retreived a list of tabs to show        
        if(typeof(tabsToDisplayString) == 'string' && tabsToDisplayString != '') 
        {
            var tabsToDisplay = tabsToDisplayString.trim().toLowerCase().split(',');
            
            if(Array.isArray(tabsToDisplay)) // make sure we actually do have a list of tabs to show
            {
                if(tabsToDisplay.length > 0) // make sure that the list of tabs to show actually has items in it
                {
                    // select needed elements
                    var $domTabsList = $('.top-level-tab'); // list of top-level tabs dom elements
                
                    // make all tabs invisible
                    $domTabsList.hide();
                    
                    // loop over tabs and make visible if they are found in the list of tabs to display
                    $domTabsList.each(function(i, el) {
                        var $tab = $(this);
                        var dataTab = String($tab.attr('data-tab')).trim().toLowerCase();
                        var showDataTab = tabsToDisplay.indexOf(dataTab) >= 0;
                        
                        if(showDataTab)
                        {
                            $tab.show();
                        }
                    });
                    
                    // default to first visible tab
                    $domTabsList.find(':visible').eq(0).children().click();
                }
            }
        }
        
        return;
    }
    
    /*
     * hide/show side menu items based on the layer type (determined by the type of base object the layer is based off of)
     */
    function showHideSideMenuItems() 
    {
        // this string is built in the controller
        var sideMenuItemsToDisplayString = savedQueryInfo.sideMenuItemsToDisplay.trim();
        
        // only do the hiding and showing if we successfully retreived a list of side menu items to show
        if(typeof(sideMenuItemsToDisplayString) == 'string' && sideMenuItemsToDisplayString != '') 
        {
            var sideMenuItemsToDisplay = sideMenuItemsToDisplayString.trim().toLowerCase().split(',');
            
            if(Array.isArray(sideMenuItemsToDisplay)) // make sure we actually do have a list of side menu items to show
            {
                if(sideMenuItemsToDisplay.length > 0) // make sure that the list of side menu items to show actually has items in it
                {
                    // get list of side menu tabs
                    var $sideMenuList = $('.sub-filter-item');
                    
                    // hide all first
                    $sideMenuList.hide();

                    // loop through each one and if found in the list of menu items to be displayed, make visible
                    $sideMenuList.each(function(i, el) {
                        var $menuItem = $(this);
                        var dataTab = String($(this).attr('data-tab')).trim().toLowerCase();
                        var showSideMenuItem = sideMenuItemsToDisplay.indexOf(dataTab) >= 0;
                        
                        if(showSideMenuItem)
                        {
                            $menuItem.show();
                        }
                    });

                    // default at the first side-menu item
                    $sideMenuList.find(':visible').eq(0).click();
                }
            }
        }
        
        return;
    }
        
    function disableFilter($filter)
    {
        if ($filter.is('.crossfilter')) {
    		$filter.find('.crossfilter-fields td.indexlabel').text('').append($('#savedqueryeditor-templates img.loader').clone());
    	}
    	else {
        	$filter.find('td.indexlabel').text('').append($('#savedqueryeditor-templates img.loader').clone());
        }
        return $filter;
    }
    
    function enableFilter($filter)
    {
        if ($filter.is('.crossfilter')) {
            var filterText = $filter.attr('data-index') == 'AND' ?  MASystem.Labels.MA_AND : $filter.attr('data-index');
    		$filter.find('.crossfilter-fields td.indexlabel').empty().text(filterText);
    	}
    	else {
    	    var filterText = $filter.attr('data-index') == 'AND' ?  MASystem.Labels.MA_AND : $filter.attr('data-index');
        	$filter.find('td.indexlabel').empty().text(filterText);
        }
        return $filter;
    }
    function runPolymorphicFilterCheck() {
        var filters = document.querySelectorAll('#savedqueryeditor .fieldfilters .filter tr');
        var hasPolyFilter = false;
        for(var i = 0; i < filters.length; i++) { 
            var filter = filters[i];
            var fieldOption = filter.getElementsByClassName('combobox')[0].value;
            if (query.polymorphicObject && query.polymorphicObject !== null && fieldOption === query.addressObject) {
                hasPolyFilter = true;
            }
        }
        if (hasPolyFilter) {
            document.getElementsByClassName('filter-logic-section')[0].style.display = 'none';
            return false;
        } else {
            document.getElementsByClassName('filter-logic-section')[0].style.display = 'block';
            return true;
        }
    }
    function updateFilter($updatedFilter, $loaderToReplace, operator, value, value2)
    {
        var processData = {
            ajaxResource : 'QueryBuilderAPI',
            action: 'getFilter',
            baseObject : $updatedFilter.attr('data-baseobject').split('~~')[0],
            fieldName : $updatedFilter.find('.fieldoptions .combobox').val() == null ? '' : $updatedFilter.find('.fieldoptions .combobox').val(),
            parentFieldName : $updatedFilter.find('.parentfieldoptions .combobox').val() == null ? '' : $updatedFilter.find('.parentfieldoptions .combobox').val(),
            grandparentFieldName : $updatedFilter.find('.grandparentfieldoptions .combobox').val() == null ? '' : $updatedFilter.find('.grandparentfieldoptions .combobox').val()
        };
        if (query.polymorphicObject && query.polymorphicObject !== '' && query.addressObject === processData.fieldName && processData.parentFieldNames !== '') {
            processData.polymorphicObject = query.polymorphicObject;
        }
        //ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(response, event){
                //CLOSED LOADING SPINNER
                hideMessage($('#queryeditor-modal'));
                if(event.status) {
                    let collapsedFieldOptions = [];
                    if(response.currentBaseObjectNames.length > 1) {   
                        
                        // If the list is based on multiple base objects, check for duplicates
                        // and collapse them.

                        // Helper Map
                        var duplicateLocations = {  };

                        // Doing this in a single pass through the options...
                        for(var fieldOptionIndex = 0; fieldOptionIndex < response.parentFieldOptions.length; fieldOptionIndex ++) {

                            var fieldOptionValue = response.parentFieldOptions[fieldOptionIndex].value;

                            // Does this already exist?  Then we have a duplicate
                            if(duplicateLocations[fieldOptionValue]){
                                var rootIndex = duplicateLocations[fieldOptionValue].rootIndex;

                                //Has the label already been made?  If so, we can ignore it and just get rid of it.
                                if(!response.parentFieldOptions[rootIndex].labeled) {
                                
                                    var newLabel = '';

                                    // Create a new label based on base objects and the label.
                                    for(var boIndex=0; boIndex<response.currentBaseObjectNames.length; boIndex ++){
                                        newLabel += response.currentBaseObjectNames[boIndex];
                                        newLabel += boIndex !== response.currentBaseObjectNames.length -1 ? '/' : ' ';
                                    }

                                    newLabel += fieldOptionValue;
                                    response.parentFieldOptions[rootIndex].label = newLabel;
                                    response.parentFieldOptions[rootIndex]['labeled'] = true;
                                }      

                                response.parentFieldOptions.splice(fieldOptionIndex,1);
                                fieldOptionIndex --;
                            }
                            else {
                                duplicateLocations[fieldOptionValue] = {};
                                duplicateLocations[fieldOptionValue]['rootIndex'] = fieldOptionIndex;
                            }
                        }
                    }
                    //update type information
                    $updatedFilter.attr('data-basetype', response.baseType).attr('data-fieldtype', response.fieldType);
                    
                    //field options
                    var $fieldSelect = $updatedFilter.find('.fieldoptions .combobox').empty();
                    var fieldFrag = document.createDocumentFragment();
                    $.each(response.fieldOptions || [], function (i, opt) {
                        // create option, add to fragment
                        var optFrag = document.createElement('option');
                        optFrag.value = opt.value;
                        optFrag.innerHTML = opt.label;
                        fieldFrag.appendChild(optFrag);
                    });
                    $fieldSelect[0].appendChild(fieldFrag);
                    $fieldSelect.val(response.fieldName);
                    $updatedFilter.trigger('change.select2');
                     
                    //refresh parent field options if there are any
                    if (response.parentFieldOptions != null && response.parentFieldOptions.length > 0)
                    {
                        $parentFieldSelect = $updatedFilter.find('.parentfieldoptions .combobox').empty();
                        var parentFieldFrag = document.createDocumentFragment();
                        $.each(response.parentFieldOptions || [], function (i, opt) {
                            var optFrag = document.createElement('option');
                            optFrag.value = opt.value;
                            optFrag.innerHTML = opt.label;
                            parentFieldFrag.appendChild(optFrag);
                        });
                        $parentFieldSelect[0].appendChild(parentFieldFrag);
                        $parentFieldSelect.val(response.parentFieldName);
                        $updatedFilter.trigger('change.select2');
                        $updatedFilter.find('.parentfieldoptions').show();
                    }
                    else
                    {
                        $updatedFilter.find('.parentfieldoptions').hide().find('.combobox').empty().val('');
                    }
                    
                    //refresh grandparent field options if there are any
                    if (response.grandparentFieldOptions != null && response.grandparentFieldOptions.length > 0)
                    {
                        $grandparentFieldSelect = $updatedFilter.find('.grandparentfieldoptions .combobox').empty();
                        var grandParentFieldFrag = document.createDocumentFragment();
                        $.each(response.grandparentFieldOptions || [], function (i, opt) {
                            var optFrag = document.createElement('option');
                            optFrag.value = opt.value;
                            optFrag.innerHTML = opt.label;
                            grandParentFieldFrag.appendChild(optFrag);
                        });
                        $grandparentFieldSelect[0].appendChild(grandParentFieldFrag);
                        $grandparentFieldSelect.val(response.grandparentFieldName);
                        $updatedFilter.trigger('change.select2');
                        $updatedFilter.find('.grandparentfieldoptions').show();
                    }
                    else
                    {
                        $updatedFilter.find('.grandparentfieldoptions').hide().find('.combobox').empty().val('');
                    }
                
                    //refresh operator options
                    var $operatorOptions = $updatedFilter.find('.operator .combobox').empty();
                    var operatorFrag = document.createDocumentFragment();
                    $.each(response.operatorOptionsMap || [], function (i, opt) {
                        var optFrag = document.createElement('option');
                        optFrag.value = opt.value;
                        optFrag.innerHTML = opt.label;
                        operatorFrag.appendChild(optFrag);
                    });
                    $operatorOptions[0].appendChild(operatorFrag);
                    $operatorOptions.select2();
                    $updatedFilter.trigger('change.select2');
                    
                    //if we were passed an operator, populate
                    if (operator)
                    {
                    	$operatorOptions.val(operator).change();
                    }
                    
                    //change value input to match the new field type
                    $updatedFilter.find('.value .STRING input:text').removeAttr('class').val('');
                    if (response.baseType == 'STRING')
                    {
                        $updatedFilter.find('.value .STRING input').addClass(response.fieldType).addClass('slds-input');
                    }
                    $updatedFilter.find('.value > div').hide().filter('.' + response.baseType).show();
                    
                    //update value options if this is a type that requires it
                    if (response.fieldType == 'PICKLIST' || response.fieldType == 'MULTIPICKLIST')
                    {
                        var $picklistOptions = $updatedFilter.find('.value .PICKLIST .multiselect').empty();
                        var picklistFrag = document.createDocumentFragment();
                        $.each(response.picklistOptions || [], function (i, opt) {
                            var optFrag = document.createElement('option');
                            optFrag.value = opt.value;
                            optFrag.innerHTML = opt.label || opt.value;
                            picklistFrag.appendChild(optFrag);
                        });
                        $picklistOptions[0].appendChild(picklistFrag);
                        //multiselect widget might not be enabled yet which would throw an error so just catch it and do nothing
                        try {
                        	$picklistOptions.multiselect('refresh').multiselect('uncheckAll');
                        }
                        catch (err) { }
                    }
                    else if (response.fieldType == 'ID')
                    {
                    	
                    	//set up merge field autocomplete
                    	
                    	if($updatedFilter.attr('data-baseobject') != 'Task' && $updatedFilter.attr('data-baseobject') != 'Event'){
                        	$updatedFilter.find('.value .ID .idfiltervalue').autocomplete({
                        		source: response.currentBaseObjectNames.indexOf('User') != -1
                                    ? [':Dynamic', ':UserId', ':DirectReportIds', ':SubordinateIds', ':TeamAccountIds'] //this is for the dynamic filter functionality (currently only supporting user)
                                    : [':UserId', ':DirectReportIds', ':SubordinateIds', ':TeamAccountIds']
                        	});
                    	}
                    }
                    
                    enableFilter($updatedFilter);
                    
                    //if we were passed a loader then replace it with this filter
                    if ($loaderToReplace)
                    {
                        $loaderToReplace.slideUp(
                            200,
                            function ()
                            {
                                $(this).replaceWith($updatedFilter);
                                $updatedFilter.attr('data-basetype', response.baseType).attr('data-fieldtype', response.fieldType).slideDown(500);
                                    
                                //assign unique names to the boolean radio buttons
                                $updatedFilter.find('.value .BOOLEAN input').attr('name', 'bool_' + globalIndex++);
                                
                                $updatedFilter.find('.combobox').select2();
                                $updatedFilter.find('.multiselect').multiselect({
                                    noneSelectedText: 'Click here to select options',
                                    selectedList: 2
                                }).multiselectfilter().multiselect('uncheckAll');
                                buildDatePickers($updatedFilter.find('input.datejs'), { fieldType: response.fieldType });
                                
                                refreshIndices();
                                refreshCrossIndices();
                                refreshBadges();

                                //if we were passed a value then use it to populate the currently displayed value input
                                if (value)
                                {
                                    switch (response.baseType)
                                    {
                                        case 'STRING':
                                            if (value != 'NULL')
                                            {
                                                $updatedFilter.find('.value > div.STRING > input').val(value);
                                            }
                                            if (value2 && value2 != 'NULL')
                                            {
                                                $updatedFilter.find('.value > div.STRING .range input').val(value2);
                                            }
                                            break;
                                        case 'PICKLIST':
                                            if (value != '')
                                            {
                                                var selectedOptions = value.split('~~');
                                                for (var s in selectedOptions)
                                                {
                                                    $updatedFilter.find('.value .PICKLIST .multiselect').multiselect("widget").find('input[value="'+selectedOptions[s]+'"]').click();// option[value='+selectedOptions[s]+']').attr('selected', 'selected');
                                                }
                                            }
                                            break;
                                        case 'BOOLEAN':
                                            if (value != 'NULL')
                                            {
                                                $updatedFilter.find('.value > div.BOOLEAN input[value='+value+']').prop('checked', true);
                                            }
                                            break;
                                        case 'DATE':
                                       		if (value != 'NULL') {
                                                $updatedFilter.find('.value > div.DATE > input.datejs').val(valueToDateString(value, $updatedFilter.attr('data-fieldtype')));
                                            }
                                            if (value2 != 'NULL') {
                                                $updatedFilter.find('.value > div.DATE .range > input.datejs').val(valueToDateString(value2, $updatedFilter.attr('data-fieldtype')));
                                            }
                                            break;
                                        case 'ID':
                                        	var operator = $updatedFilter.find('.operator .combobox').val();
                                        	if (operator == 'in' || operator == 'not in')
                                        	{
                                        		$updatedFilter.find('.value .ID .queryfiltervalue .combobox').val(value).trigger('change.select2');
                                        	}
                                        	else
                                        	{
                                        		$updatedFilter.find('.value .ID .idfiltervalue').val(value);
                                        	}
                                        	$updatedFilter.find('.operator .combobox').change();
                                        	break;
                                    }
                                }
                                
                                //for some reason, operator changes aren't being caught during the population process for these filters (maybe because they're hidden?).  just refire the change event now
                                $operatorOptions.find('option:selected').change();
                                runPolymorphicFilterCheck();
                            }
                        );
                    }
                    
                    runPolymorphicFilterCheck();
                    
                }
                else if (event.type === 'exception') {
                    //show error
                    MA.log(event.message + '::' + event.where);
                } 
                else {
                    //show error
                    MA.log(event.message);
                }
            },{buffer:false,escape:false,timeout:120000}
        );
        
    }
    
    function updateColorPicklistField($updatedColorField,fieldValue,callback)
    {
        callback = callback || function(){};
        var $parentFieldSelect = $updatedColorField.closest('td').find('.parentfieldoptions select').empty();
        var $comboBox = $parentFieldSelect.closest('.parentfieldoptions').find('.select2-container');
        $comboBox.hide();
        
        // $("#advanced-reference-options").hide();
        $parentFieldSelect.find("#advanced-reference-options").hide();
        
        if($('option:selected',$updatedColorField).attr('data-lookup') == 'lookup'){
            var queryInfo = JSON.parse(document.querySelector('[id$="serializedQuery"]').value) || {};
            var isPoly = queryInfo.polymorphicObject ? true : false;
            var processData = {
                ajaxResource : 'QueryBuilderAPI',
                
                action: 'getTooltipReference',
                baseObject : $updatedColorField.attr('data-baseobject').split('~~')[0],
                fieldName : $updatedColorField.val() == null ? '' : $updatedColorField.val(),
                parentFieldName : $updatedColorField.find('.parentfieldoptions .combobox').val() == null ? '' : $updatedColorField.find('.parentfieldoptions .combobox').val()
            };
            if (isPoly && processData.fieldName === queryInfo.addressObject) {
                processData.polymorphicObject = queryInfo.polymorphicObject;
            }
            //ADDED LOADING SPINNER
            showLoading($('#queryeditor-modal'),'loading');
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                processData,
                function(response, event){
                    //CLOSED LOADING SPINNER
                    hideMessage($('#queryeditor-modal'));
                    if(event.status) {
                        var selectData = response.data;
                        
                    	//update type information
                        $updatedColorField.attr('data-basetype', selectData.baseType).attr('data-fieldtype', selectData.fieldType);
                        
                        //refresh parent field options if there are any
                        if (selectData.parentFieldOptions && selectData.parentFieldOptions.length > 0)
                        {
                             $parentFieldSelect.append(
                                    $("<option></option>")
                                        .attr('value','--Select a Field--')
                                        .text('--Select a Field--')
                                );
                            $parentFieldSelect.attr('data-currentbaseobject',selectData.currentBaseObjectName);
                            $.each(selectData.parentFieldOptions || [], function (i, opt) {
                                var label = opt.label || '';
                                //remove the lookup string to reduce confusion
                                label = label.replace(/\(Lookup\)/g, '');

                                $parentFieldSelect.append(
                                    $("<option></option>")
                                        .attr('value', opt.value)
                                        .text(label)
                                );                            
                            });
                            
                            //update the field on recall?
                            if(fieldValue) {
                                $('.color-picklistvalues').data('needToUpdate',true);
                                //$parentFieldSelect.find('.color-picklistvalues').data('needToUpdate',true);
                                $parentFieldSelect.val(fieldValue).change();
                            }
                            
                            if($comboBox.length == 0) {
                                $parentFieldSelect.select2();
                            }
                            else {
                                //show the box
                                $comboBox.show();
                                $parentFieldSelect.closest('.parentfieldoptions').find('.ui-combobox > input').val($parentFieldSelect.find('option:selected').text());
                            }
                        }
                        callback();
                    }
                    else if (event.type === 'exception') {
                        //show error
                        callback();
                        MA.log(event.message + '::' + event.where);
                    } 
                    else {
                        //show error
                        callback();
                        MA.log(event.message);
                    }
                },{buffer:false,escape:false}
            );
    	} 
    	else
        {
            MA.Util.resetCombobox($parentFieldSelect);
            $comboBox.hide();
            var fieldType = $updatedColorField.attr('data-fieldtype');
            if (fieldType == "REFERENCE" || fieldType == "STRING" || fieldType == "ID")
        	{
        	    // $("#advanced-reference-options").show();
                $parentFieldSelect.find("#advanced-reference-options").show();
                $parentFieldSelect.find('.markergrid-wrapper').height(125);
        	}
        	else
        	{
        	    // $("#advanced-reference-options").hide();
        	    $parentFieldSelect.find("#advanced-reference-options").hide();
        	    
        	}
        	callback();
        }
    }
    
    function updateMultiField($updatedMultiField,fieldValue)
    {
        var $parentFieldSelect = $updatedMultiField.closest('td').find('.parentfieldoptions select').empty();
        var $comboBox = $parentFieldSelect.closest('.parentfieldoptions').find('.select2-container');
        $comboBox.hide();
        var queryInfo = JSON.parse(document.querySelector('[id$="serializedQuery"]').value) || {};
        var isPoly = queryInfo.polymorphicObject ? true : false;

        //populate comboxbox if needed
        var processData = {
            ajaxResource : 'QueryBuilderAPI',
            
            action: 'getTooltipReference',
            baseObject : $updatedMultiField.attr('data-baseobject').split('~~')[0],
            fieldName : $updatedMultiField.closest('.multiField').val() == null ? '' : $updatedMultiField.closest('.multiField').val(),
            parentFieldName : $updatedMultiField.find('.parentfieldoptions .combobox').val() == null ? '' : $updatedMultiField.find('.parentfieldoptions .combobox').val()
        };
        if (isPoly && processData.fieldName === queryInfo.addressObject) {
            processData.polymorphicObject = queryInfo.polymorphicObject;
        }
        //ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');

        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(response, event){
                //CLOSED LOADING SPINNER
                hideMessage($('#queryeditor-modal'));
                if(event.status) {
                    var selectData = response.data;
                	//update type information
                    $updatedMultiField.attr('data-basetype', selectData.baseType).attr('data-fieldtype', selectData.fieldType);
                
                    //refresh parent field options if there are any
                    
                    if (selectData.parentFieldOptions && selectData.parentFieldOptions.length > 0)
                    {
                        $parentFieldSelect.append(
                                $("<option></option>")
                                    .attr('value','--Select a Field--')
                                    .text('--Select a Field--')
                            );
                        $parentFieldSelect.attr('data-currentbaseobject',selectData.currentBaseObjectName);
                        var selectArray = selectData.parentFieldOptions || [];
                        for(var i = 0; i < selectArray.length; i++){
                            var opt = selectArray[i];
                            var label = opt.label || '';
                            //remove the lookup string to reduce confusion
                            label = label.replace(/\(Lookup\)/g, '');

                            $parentFieldSelect.append(
                                $("<option></option>")
                                    .attr('value', opt.value)
                                    .text(label)
                            );
                        }
                        /**$.each(selectData.parentFieldOptions || [], function (i, opt) {
                            $parentFieldSelect.append(
                                $("<option></option>")
                                    .attr('value', opt.value)
                                    .text(opt.label)
                            );                            
                        });
                        */
                        if(fieldValue) {
                            $parentFieldSelect.val(fieldValue).change();    
                        }
                        
                        if($comboBox.length == 0) {
                            $parentFieldSelect.select2();
                            $parentFieldSelect.closest('.parentfieldoptions').find('.ui-combobox > input').val($parentFieldSelect.find('option:selected').text());
                            //.find('.grandparentfieldoptions .ui-combobox > input').val($grandparentFieldSelect.find('option:selected').text());
                        }
                        else {
                            //show the box
                            $comboBox.show();
                            MA.Util.resetCombobox($parentFieldSelect);
                        }
                    }
                }
                else if (event.type === 'exception') {
                    //show error
                    MA.log(event.message + '::' + event.where);
                } 
                else {
                    //show error
                    MA.log(event.message);
                }
            },{buffer:false,escape:false}
        );
    }
    
    function updateTooltip($updatedTooltip,fieldValue)
    {
        var queryInfo = JSON.parse(document.querySelector('[id$="serializedQuery"]').value) || {};
        var isPoly = queryInfo.polymorphicObject ? true : false;

        var processData = {
            ajaxResource : 'QueryBuilderAPI',
            action: 'getTooltipReference',
            baseObject : $updatedTooltip.attr('data-baseobject').split('~~')[0],
            fieldName : $updatedTooltip.closest('.tooltip').val() == null ? '' : $updatedTooltip.closest('.tooltip').val(),
            parentFieldName : $updatedTooltip.find('.parentfieldoptions .combobox').val() == null ? '' : $updatedTooltip.find('.parentfieldoptions .combobox').val()
        };
        if (isPoly && processData.fieldName === queryInfo.addressObject) {
            processData.polymorphicObject = queryInfo.polymorphicObject;
        }
        //if this is tooltip1, update our label info to show the tooltip that will be displayed
        if($updatedTooltip.attr('data-tooltip') == 'tooltip1') {
            var tooltip1Text = $updatedTooltip.find('option:selected').text();
            $('#dynamicLabelWrapper .js-label-tooltip1').text(tooltip1Text);
        }
        
        //ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');
                
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(response, event){
                //update type information
                //CLOSED LOADING SPINNER
                hideMessage($('#queryeditor-modal'));
                if(event.status) {
                    var tooltipData = response.data;
                    $updatedTooltip.attr('data-basetype', tooltipData.baseType).attr('data-fieldtype', tooltipData.fieldType);
                
                    //refresh parent field options if there are any
                    if (tooltipData.parentFieldOptions && tooltipData.parentFieldOptions.length > 0)
                    {
                        $parentFieldSelect = $updatedTooltip.closest('td').find('.parentfieldoptions .combobox').empty();
                        var bulkFrag = document.createDocumentFragment();
                        $.each(tooltipData.parentFieldOptions || [], function (i, opt) {
                            var label = opt.label || '';
                            //remove the lookup string to reduce confusion
                            label = label.replace(/\(Lookup\)/g, '');
                            
                            // create option, add to fragment
                            var optFrag = document.createElement('option');
                            optFrag.value = opt.value;
                            optFrag.innerHTML = label;
                            bulkFrag.appendChild(optFrag);
                        });
                        // update select with fragment
                        $parentFieldSelect[0].appendChild(bulkFrag);
                        if(fieldValue){
                        	$parentFieldSelect.val(fieldValue);    
                        }
                        //$parentFieldSelect.val(response.parentFieldName);
                        //$updatedTooltip.closest('td').find('.parentfieldoptions .ui-combobox > input').val($parentFieldSelect.find('option:selected').text());
                        
                        $parentFieldSelect.select2({width:'auto'});
                        $updatedTooltip.closest('td').find('.parentfieldoptions .select2-container').show();
                    }
                    else
                    {
                        $updatedTooltip.closest('td').find('.parentfieldoptions .select2-container').hide();//.find('.combobox').empty().val('');
                    }
                }
                else if (event.type === 'exception') {
                    //show error
                    MA.log(event.message + '::' + event.where);
                } 
                else {
                    //show error
                    MA.log(event.message);
                }
            },{buffer:false,escape:false}
        );
    }
    
    function updateCrossFilter($updatedCrossFilter, $loaderToReplace)
    {
        disableFilter($updatedCrossFilter);
        
        var processData = {
            ajaxResource : 'QueryBuilderAPI',
            
            action: 'getCrossFilter',
            baseObject : $updatedCrossFilter.attr('data-baseobject'),
            fieldName : $updatedCrossFilter.find('.fieldoptions .combobox').val() == null ? '' : $updatedCrossFilter.find('.fieldoptions .combobox').val(),
            crossObjectName : $updatedCrossFilter.find('.crossobjectoptions .combobox').val() == null ? '' : $updatedCrossFilter.find('.crossobjectoptions .combobox').val(),
            crossFieldName : $updatedCrossFilter.find('.crossfieldoptions .combobox').val() == null ? '' : $updatedCrossFilter.find('.crossfieldoptions .combobox').val()
        };
        
        //ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(response, event){
                //CLOSED LOADING SPINNER
                hideMessage($('#queryeditor-modal'));
                if (event.status) {
                    //field options
                    $newFieldOptions = $updatedCrossFilter.find('.crossfilter-fields .fieldoptions .combobox').empty();
                    $.each(response.fieldOptions || [], function (i, opt) {
                        $newFieldOptions.append(
                            $("<option></option>")
                                .attr('value', opt.value)
                                .text(opt.label)
                        );
                    });
                    $newFieldOptions.val(response.fieldName);
                    $updatedCrossFilter.find('.crossfilter-fields .fieldoptions .ui-combobox > input').val($newFieldOptions.find('option:selected').text());
                    
                    //only update operator options if we don't have any because cross filter operator options are not affected by any changes
                    $operatorOptions = $updatedCrossFilter.find('.crossfilter-fields .operator .combobox');
                    if ($operatorOptions.children().length == 0)
                    {
                        $.each(response.operatorOptions || [], function (i, opt) {
                            $operatorOptions.append(
                                $("<option></option")
                                    .attr('value', opt.value)
                                    .text(opt.label)
                            );
                        });
                    }
                    
                    //cross object options
                    $crossObjectOptions = $updatedCrossFilter.find('.crossfilter-fields .crossobjectoptions .combobox').empty();
                    $.each(response.crossObjectOptions || [], function (i, opt) {
                        $crossObjectOptions.append(
                            $("<option></option")
                                .attr('value', opt.value)
                                .text(opt.label)
                        );
                    });
                    $crossObjectOptions.val(response.crossObjectName);
                    $updatedCrossFilter.find('.crossfilter-fields .crossobjectoptions .ui-combobox > input').val($crossObjectOptions.find('option:selected').text());
                                                                
                    //need to update cross field options
                    $crossFieldOptions = $updatedCrossFilter.find('.crossfilter-fields .crossfieldoptions .combobox').empty();
                    $.each(response.crossFieldOptions || [], function (i, opt) {
                        $crossFieldOptions.append(
                            $("<option></option")
                                .attr('value', opt.value)
                                .text(opt.label)
                        );
                    });
                    $crossFieldOptions.val(response.crossFieldName);
                    $updatedCrossFilter.find('.crossfilter-fields .crossfieldoptions .ui-combobox > input')
                        .val($crossFieldOptions.find('option:selected').text())
                        .removeClass('invalid');
                    
                    if (response.crossFieldOptions.length == 0)
                    {
                        $updatedCrossFilter.find('.crossfilter-fields .crossfieldoptions .ui-combobox > input').addClass('invalid');
                    }
                    
                    enableFilter($updatedCrossFilter);
                    
                    if ($loaderToReplace)
                    {
                        $loaderToReplace.slideUp(
                            200,
                            function ()
                            {
                                jQuery(this).replaceWith($updatedCrossFilter);
                                $updatedCrossFilter.slideDown(500);
                                
                                $updatedCrossFilter.find('.crossfilter-fields .combobox').select2();
                                buildDatePickers($updatedCrossFilter.find('.crossfilter-fields input.datejs'));
                                
                                refreshBadges();
                            }
                        );
                    }
                } 
                else if (event.type === 'exception') {
                    //show error
                    //$('#savedqueryeditor .buttons .msgs').html('<b>Error Updating Cross Filter</b>: Please try again').show();
                    MAToastMessages.showWarning({message:'Error Updating Cross Filter',subMessage:'Please try again',timeOut:4000,closeButton:true});
                    MA.log(event.message + '::' + event.where);
                } 
                else {
                    //show error
                    //$('#savedqueryeditor .buttons .msgs').html('<b>Error Updating Cross Filter</b>: Please try again').show();
                    MAToastMessages.showWarning({message:'Error Updating Cross Filter',subMessage:'Please try again',timeOut:4000,closeButton:true});
                    MA.log(event.message);
                }
            },{buffer:false,escape:false,timeout:120000}
        );
    }
    
    function validateQuery (callback)
    {
        var query;
        var $dfd = $.Deferred();
        
    	if($('.limit-proximity-enabled').is(':checked') == true && !/live/i.test(savedQueryInfo.baseObjectType) ) // forced comment
        { 
            geocodeEditQueryAddress().then(function(res) {
                $dfd.resolve(res);
            });
        }
        else
        {
            $dfd.resolve({success:true, query:buildQuery()});
        }
        
        return $dfd.promise();
    }
    
    function geocodeEditQueryAddress()
    {
        var result = {};
        var $dfd = $.Deferred();
        
        //convert distance to meters
    	var distancevalue = $('.distance-value').val();
    	var distancetype = $('.distance-type').val();
    	if (distancetype == 'MILES')
    	{
    		distancemeters = distancevalue*1609.344;
    	}
    	else if (distancetype == 'KM')
    	{
    		distancemeters = distancevalue*1000;
    	}
    	else if (distancetype == 'YARDS')
    	{
    		distancemeters = distancevalue*0.9144;
    	}
    	else if (distancetype == 'FEET')
    	{
    		distancemeters = distancevalue*0.3048;
    	}
    	else
    	{
    		distancemeters = distancevalue;
    	}

	 
        geocode({
            address: $('#savedqueryeditor .address-value').val(),
            complete : function(response) 
            {
                if(response.success)
                {
                    //is this a bad address?
                    var result = getProperty(response,'results', false) || {};
                    var isBadAddress = result.IsBadAddress || false;
                    if(isBadAddress) {
                        result = {success:false};
                        $dfd.resolve(result);
                    }
                    else {
                        var addressLatLng = new google.maps.LatLng(response.results.Latitude, response.results.Longitude);
                        var latRadius = google.maps.geometry.spherical.computeOffset(addressLatLng, distancemeters, 0).lat() - addressLatLng.lat();
                        var lngRadius = google.maps.geometry.spherical.computeOffset(addressLatLng, distancemeters, 90).lng() - addressLatLng.lng();
                        var minLat = addressLatLng.lat() - latRadius;
                        var maxLat = addressLatLng.lat() + latRadius;
                        var minLong = addressLatLng.lng() - lngRadius;
                        var maxLong = addressLatLng.lng() + lngRadius;
                        $('#savedqueryeditor .buttons .msgs').hide();
                        
                        result = {
                            success:true, 
                            query:buildQuery({
                                distanceMeters  : distancemeters,
                                lat             : response.results.Latitude,
                                long            : response.results.Longitude,
                                minLat          : minLat,
                                maxLat          : maxLat,
                                minLong         : minLong,
                                maxLong         : maxLong
                            })
                        };
                        
                        $dfd.resolve(result);
                    }
                }
                else
                {
                    result = {success:false};
                    $dfd.resolve(result);
                }
            }
        });
        
        return $dfd.promise();
    }
    
    
    function buildQuery(options)
    {
    	var options = options || {};
        var componentIndex = 0;

        var baseObjectLayerType = savedQueryInfo.layerType // forced comment
        
        if($('#savedqueryeditor .advanced-enablerefreshing').is(':checked'))
        {
            refreshIntervalNumericValue = parseInt($('#savedqueryeditor .advanced-refreshing-value').val());
            refreshIntervalUnits = $('#savedqueryeditor .advanced-refreshing-unit').val();
            refreshInterval = (refreshIntervalNumericValue && refreshIntervalUnits) ? refreshIntervalNumericValue + ' ' + refreshIntervalUnits : null;
        }
        
        var refreshInterval;
        if(baseObjectLayerType == 'Live' && !refreshInterval) {
            // set default live refresh if none exists
            refreshInterval = '30 sec';
        }
        var useFilterLogic = runPolymorphicFilterCheck();
        var queryObj = {
            id                  : query.id,
            name                : $('#savedqueryeditor .name').val(),
            description         : $('#savedqueryeditor .description').val(),
            folderId            : query.folderId,
            folderType          : query.folderType,
            baseObject          : query.baseObject,
            baseObjectId        : query.baseObjectId,
            filterByOwner       : 'All',
            selectedQueue       : $('#savedqueryeditor .filterbyowner select[id$=queueselect]').val(),
            useFilterLogic      : useFilterLogic && $('#savedqueryeditor .filterlogiclink').text() != MASystem.Labels.MA_Add ? true : false,
            filterLogicString   : useFilterLogic ? $('#savedqueryeditor .filterlogic').val() : '',
            rowLimit			: $('#savedqueryeditor .limit-records-enabled').is(':checked') == true ? parseInt($('#savedqueryeditor .limits-rowcount-value').val()) : 250000,
            rowOrder			: $('#savedqueryeditor select.orderby-field').val()== '--'+MASystem.Labels.MA_None+'--' ? '' : $('select.orderby-field').val(),
            rowOrderDirection   : $('#savedqueryeditor .orderby-dir').is('.desc') ? 'desc' : 'asc',
            refreshInterval		: refreshInterval,
            activitySubfilters  : [],
            filters             : [],
            crossFilters        : [],
            relatedLists		: [],
            columns             : [],
            layerType: baseObjectLayerType,
        };
        
        //check for a polymorphic object
        if (query.polymorphicObject != null && query.polymorphicObject != '') {            
            queryObj.addressObject = query.addressObject;
            queryObj.polymorphicObject = query.polymorphicObject;
        }
        //filter by owner settings
        var filterByOwnerValue = $('#savedqueryeditor .filterbyowner input:radio[name=filterByOwner]:checked').val();
        if (filterByOwnerValue == 'TRUE')
        {
        	queryObj.filterByOwner = 'My:' + $('.filterbyowner-owner').val() + ':' + $('.filterbyowner-ownerfield').val();
        } else if (filterByOwnerValue == 'TEAM')
        {
        	queryObj.filterByOwner = 'Team';
        } else if (filterByOwnerValue == 'MINE')
        {
        	queryObj.filterByOwner = 'MINE';
        } else if (filterByOwnerValue == 'MYTEAM')
        {
        	queryObj.filterByOwner = 'MYTEAM';
        }

        if(queryObj.folderId == 'PersonalRoot' || queryObj.folderId == 'CorporateRoot') {
            queryObj.folderType = queryObj.folderId;
        }
        
        // add advanced options
        queryObj.advancedOptions = {
        	enableLimit		      : $('#savedqueryeditor .limit-records-enabled').is(':checked'),
           	enableProxLimit	      : $('#savedqueryeditor .limit-proximity-enabled').is(':checked'),
        	distance		      : $('.distance-value').val(),
        	selectType		      : $('.distance-type').val(),
        	address			      : $('.address-value').val(),
        	distanceMeters	      : options.distanceMeters,
			distanceLat		      : options.lat,
			distanceLong	      : options.long,
        	distanceMinLat	      : options.minLat,
        	distanceMaxLat 	      : options.maxLat,
	       	distanceMinLong	      : options.minLong,
	       	distanceMaxLong	      : options.maxLong,
	       	
	       	markerShapeType	      : $('#dynamicStaticShapeInput').val() || '',
	       	markerShapeValue	  : $('#dynamicShapePicker').attr('data-color') || null,
	       	
	       	aggregateType	      : $('.advanced-enableaggregates').is(':checked') ? $('.advanced-aggregates-type').val() : '',
	       	defaultTab		      : $('#advanced-tooltip-defaulttab').val(),
	       	defaultLiveTab		  : $('#advanced-live-tooltip-defaulttab').val(),
            defaultRenderMode     : $('#markers-defaultrendermode').val(),
            defaultRenderArea     : $('#markers-defaultrenderarea').val(),
            
            // automatic assign and otherthreshold can now be overridden some point after this because they can now be setup for multiple things (dynamic-field, dynamic-Label...)
            automaticassign       : $('#advanced-reference-option-automaticassign').is(':checked'),
            otherthreshold        : $('#savedqueryeditor #advanced-reference-option-automaticassign').is(':checked') && $('#advanced-reference-option-otherthreshold').val() == ''  ? 0 : $('#advanced-reference-option-otherthreshold').val(),
            
            heatmapWeightedValue  : $('#heatmap-options-weighted-value').val(),
            heatmapDissipating    : $('#heatmap-options-dissipate-with-zoom').is(':checked'),
            heatmapRadius         : $('#heatmap-options-radius').val(),
            heatmapOpacity        : $('#heatmap-options-opacity').val(),
            heatmapMaxIntensity   : $('#heatmap-options-max-intensity').val(),
            heatmapGradient       : '',
            markerLabelTextColor    : $('#marker-label-text-color').val(),
            markerLabelBackgroundColor : $('#marker-label-background-color').val(),
            waypointsBefore     : $('#savedqueryeditor .advanced-route-disablewaypoints').is(':checked') ? parseInt($('#savedqueryeditor .advanced-route-before').val()) : null,		
            waypointsAfter      : $('#savedqueryeditor .advanced-route-disablewaypoints').is(':checked') ? parseInt($('#savedqueryeditor .advanced-route-after').val()) : null,
            
            // filter by last report date and last report time activity Live input
            // liveOptions: liveOptionsJSONString || null,
            layerTypeOptions: null,
            layerSubType: savedQueryInfo.layerSubType, // forced comment
        };
        
        /* With new layer types coming in, we need this.
           different types of layers have different types of settings that need to be saved
           use this function to define how to get that information and it will be saved for you
           the information will be saved under the advancedOptions property of the saved query data as a string which will have to be JSON deserialized later for usage
           The format you end up with looks like below under the advancedOptions property
           
           {
               advancedOptions: {
                   live: JSON String
                   geofence: JSON String
                   layertype: JSON String
                   ...
                   ...
               }
           }
        */
        var layerTypeAdvancedOptions = getLayerTypeAdvancedOptions(baseObjectLayerType);

        // serialize the returned layer type advanced option settings and assign t the advanced options 'layerTypeOptions' property
        if(layerTypeAdvancedOptions)
        {
            try
            {
                var layerTypeOptionsJSONString = JSON.stringify(layerTypeAdvancedOptions) || null;
                queryObj.advancedOptions.layerTypeOptions = layerTypeOptionsJSONString;
            } catch(e) { console.warn(e); }
        }
        
        
        //add Heatmap Options
        var heatmapGradient = []
        $.each($( "#heatmap-options-color-table" ).find('input'), function( index, value ) {
            heatmapGradient.push($(value).val());
        });
        
        queryObj.advancedOptions.heatmapGradient = JSON.stringify(heatmapGradient);
        
        //add proximity options
        var proximityType = $('#savedqueryeditor .proximity-select').val();
        if(proximityType == 'circle')
       	{
       		queryObj.proximityOptions = {
            	enabled			: $('.proximity-enabled').is(':checked'),
            	hideMarkers		: $('.proximity-hidemarkers').is(':checked'),
                affectVisibility: $('.proximity-affectvisibility').is(':checked'),
            	radius			: $('.proximity-circle-radius').val(),
            	selectType		: $('.proximity-select').val(),
            	measurementType	: $('.proximity-circle-unit').val(),
            	fill        	: $('#proximity-fill').val(),
            	border      	: $('#proximity-border').val(),
            	opacity     	: $('#proximity-opacity').val()
            };
       	}
        else if(proximityType == 'isoline')
       	{
       		queryObj.proximityOptions = {
        		enabled			: $('.proximity-enabled').is(':checked'),
        		hideMarkers		: $('.proximity-hidemarkers').is(':checked'),
                affectVisibility: $('.proximity-affectvisibility').is(':checked'),
        		radius			: $('.proximity-isoline-radius').val(),
            	selectType		: $('.proximity-select').val(),
            	unitType		: $('.proximity-isoline-unit-type').val(),
            	measurementType	: $('.proximity-isoline-unit').val(),
            	mode			: $('.proximity-isoline-mode').val(),
            	traffic			: $('.proximity-isoline-traffic').is(':checked')
       		};
       	}
       	
       	// for geofence layers, retreive the geofence radius value and units and save those as ou would regular layer proximity options
       	// so as to achieve the functionaility as whle plotting geofence layers
       	if(/geofence/i.test(savedQueryInfo.layerType))
       	{
       	    var geofenceInput = getAdvancedGeofenceOptions() || {};
       	    
       	    if(/circle/i.test(geofenceInput.geofenceType))
       	    {
           	    queryObj.proximityOptions = {
	            	enabled			: true,
	            	hideMarkers		: false,
                    affectVisibility: false,
	            	selectType		: 'circle',
	            	fill        	: '#3083D3',
	            	border      	: '#16325C',
	            	opacity     	: '0.60'
	            };
           	    
           	    if(isNum(geofenceInput.geofenceRadius))
           	    {
           	        queryObj.proximityOptions.radius = geofenceInput.geofenceRadius;
           	    }
           	    
           	    if(geofenceInput.geofenceRadiusUnits && String(geofenceInput.geofenceRadiusUnits).trim())
           	    {
           	        geofenceInput.geofenceRadiusUnits = /kilometers/i.test(geofenceInput.geofenceRadiusUnits) ? 'KM' : geofenceInput.geofenceRadiusUnits;
           	        
           	        queryObj.proximityOptions.measurementType = String(geofenceInput.geofenceRadiusUnits).trim().toUpperCase();
           	    }
       	    }
       	}
       	
        
        //add activity filtering options
        queryObj.filterByActivity = {
            task: $('#savedqueryeditor .filterbyactivity .activityfilter-task').val(),
            event: $('#savedqueryeditor .filterbyactivity .activityfilter-event').val(),
            operator: $('#savedqueryeditor .filterbyactivity .activityfilter-operator').val()
        }; 
        
        //loop through and add activity subfilters
        var activitySubfilterSelectors = [];
        if (queryObj.filterByActivity.task != 'all') { activitySubfilterSelectors.push('#savedqueryeditor .filterbyactivity .activitysubfilters-wrapper[data-type="task"] .subfilters > .filter'); }
        if (queryObj.filterByActivity.event != 'all') { activitySubfilterSelectors.push('#savedqueryeditor .filterbyactivity .activitysubfilters-wrapper[data-type="event"] .subfilters > .filter'); }
        if (activitySubfilterSelectors.length > 0) {
            $(activitySubfilterSelectors.join(',')).each(function () {
                queryObj.activitySubfilters.push({
                    index                   : componentIndex++,
                    baseObject              : $(this).attr('data-baseobject'),
                    fieldName               : $(this).find('.fieldoptions .combobox').val(),
                    parentFieldName         : $(this).find('.parentfieldoptions .combobox').val(),
                    grandparentFieldName    : $(this).find('.grandparentfieldoptions .combobox').val(),
                    fieldType               : $(this).attr('data-fieldtype'),
                    operator                : $(this).find('.operator .combobox').val(),
                    value                   : extractValue1($(this)),
                    value2                  : extractValue2($(this))
                });
            });
        }
        
        //loop through and add filters
        $('.fieldfilters .filter').each(function ()
        {
            queryObj.filters.push({
                index                   : componentIndex++,
                baseObject              : $(this).attr('data-baseobject'),
                indexLabel              : $(this).find('.indexlabel').text(),
                fieldName               : $(this).find('.fieldoptions .combobox').val(),
                parentFieldName         : $(this).find('.parentfieldoptions .combobox').val(),
                grandparentFieldName    : $(this).find('.grandparentfieldoptions .combobox').val(),
                fieldType               : $(this).attr('data-fieldtype'),
                operator                : $(this).find('.operator .combobox').val(),
                value                   : extractValue1($(this)),
                value2                  : extractValue2($(this)),
                addressObject           : $(this).find('.fieldoptions .combobox').val() === query.addressObject ? query.addressObject : '',
                polymorphicAddressObject: $(this).find('.fieldoptions .combobox').val() === query.addressObject ? query.polymorphicObject : ''
            });
        });

        // device layer vendor filter
        if(String(savedQueryInfo.layerType).toLowerCase() == 'live-device')
        {
            var vendorFieldString = savedQueryInfo.boVendorFieldValue || '';
            var vendorFields = vendorFieldString.trim().split('.') || [];
            var liveDeviceInput = getAdvancedLiveDeviceOptions() || {};
            var vendorInput = getProperty(liveDeviceInput, 'vendor', false);
            vendorInput = (typeof vendorInput == 'string') ? vendorInput.trim().toLowerCase() : null; // lowecase vendor
            
            // if the vendor field is located in a lookup object type, we want to slightly modify the api name of the lookup object
            if(Array.isArray(vendorFields) && vendorFields.length > 1) // this is hit if the vendor field had more than one dot(field name is a lookup to more than on object)
            {
                var lookUpField = vendorFields[0];
                
                if(lookUpField.slice(lookUpField.length -3) == '__r') // if this was a relationship field
                {
                    lookUpField = lookUpField.replace('__r','__c');
                }
                else
                {
                    lookUpField = lookUpField + 'Id';
                }
                
                vendorFields[0] = lookUpField;
            }
            
            queryObj.filters.push({
                index                   : componentIndex++,
                baseObject              : savedQueryInfo.baseObjectTypeName || null,
                indexLabel              : -1, // does not need to show up on the field filters tab
                fieldName               : vendorFields[0] || null,
                parentFieldName         : vendorFields[1] || null,
                grandparentFieldName    : vendorFields[2] || null,
                fieldType               : 'STRING',
                operator                : 'equals',
                value                   : vendorInput || null,
                value2                  : null,
                filterType              : 'DeviceLayerVendor',
            });
        }
        

        //loop through and add cross filters
        $('.crossfilters .crossfilter').each(function ()
        {
            var crossFilter = {
                index               	: componentIndex++,
                baseObject          	: $(this).attr('data-baseobject'),
                indexLabel          	: 0,
                fieldName           	: $(this).find('.fieldoptions .combobox').val(),
                crossObjectName     	: $(this).find('.crossobjectoptions .combobox').val(),
                crossFieldName      	: $(this).find('.crossfieldoptions .combobox').val(),
                operator            	: $(this).find('.operator .combobox').val(),
                useCrossFilterLogic	  	: $(this).find('.crossfilterlogiclink').text() == MASystem.Labels.MA_Add ? false : true,
                crossFilterLogicString	: $(this).find('.crosslogic').val(),
                filters             	: []
            };
            
            //loop through and add subfilters
            var subfilterIndex = 1;
            $(this).find('.subfilters > .filter').each(function ()
            {
                crossFilter.filters.push({
                    index                   : subfilterIndex++,
                    baseObject              : $(this).attr('data-baseobject').split('~~')[0],
                    indexLabel              : $(this).find('.indexlabel').text(),
                    fieldName               : $(this).find('.fieldoptions .combobox').val(),
                    parentFieldName         : $(this).find('.parentfieldoptions .combobox').val(),
                    grandparentFieldName    : $(this).find('.grandparentfieldoptions .combobox').val(),
                    fieldType               : $(this).attr('data-fieldtype'),
                    operator                : $(this).find('.operator .combobox').val(),
                    value                   : extractValue1($(this)),
                    value2                  : extractValue2($(this))
                });
            });

            queryObj.crossFilters.push(crossFilter);
        });
        
        //loop through and add columns
        $('#querycolumns > li').each(function () {
            queryObj.columns.push({
                fieldName       : $(this).attr('data-fieldname'),
                fieldType       : $(this).attr('rel'),
                isDefaultSort   : $(this).find('.sortcolumnindicator').length > 0
            });
        });
        
        //add tooltip settings
        $('#savedqueryeditor .tooltip').each(function () {
            var $tooltip = $(this);
            var isLookup = $tooltip.find('option:selected').attr('data-lookup');
            if(isLookup == 'true') {
                var parentValue = $tooltip.val();
                var childValue = $tooltip.closest('td').find('.parentfieldoptions .combobox').val();

                if(childValue == '--Select a Field--' || childValue == null) {
                    //no child is set
                    tooltipField = parentValue;
                }
                else {
                    tooltipField = !(query.polymorphicObject && query.polymorphicObject !== null) || parentValue !== query.addressObject ? parentValue + '.' + childValue : query.polymorphicObject + '::' + childValue;
                }
            }
            else {
                // MAP-6040, check on blur if layer is cleared (user not actually selecting value "--None--")
                var inputValue = $tooltip.next().find('input').val();
                var inputCleared = inputValue == '--'+MASystem.Labels.MA_None+'--' || $tooltip.val() == '--'+MASystem.Labels.MA_None+'--'
                tooltipField = inputCleared ? '' : $tooltip.val();
            }
            
            queryObj[$tooltip.attr('data-tooltip')] = tooltipField;
        });
        
        //add basic color settings
        queryObj.colorAssignmentType = $('#savedqueryeditor .color-assignmenttype').val();
        queryObj.iconColor  = $('.colormarker .Static .markertype-color-preview').css('display') == 'none' 
            ? 'image:' + $('.colormarker .Static .markertype-image').val()
            : $('.Static .markertype-color-preview').attr('data-color');
        //queryObj.picklistField  = $('#savedqueryeditor .color-picklistfield').val() == '--Select a Field--' ? '' : $('#savedqueryeditor .color-picklistfield').val();
         /**March Release 2016*/                
            var picklistField = $('#savedqueryeditor .color-picklistfield').not('.dynamicLabel').val() == '--Select a Field--' ? '' : $('#savedqueryeditor .color-picklistfield').not('.dynamicLabel').val();
            if (query.polymorphicObject && query.polymorphicObject !== null && picklistField === query.addressObject) { 
                picklistParentField = document.getElementById('savedqueryeditor').getElementsByClassName('color-picklistparentfield')[0].value;
                picklistField = picklistParentField === null || picklistParentField === '--Select a Field--' ? picklistField : query.polymorphicObject + '::' + picklistParentField;
            } else {
                picklistField += $('#savedqueryeditor .color-picklistparentfield').not('.dynamicLabel').val() == null || $('#savedqueryeditor .color-picklistparentfield').not('.dynamicLabel').val() == '--Select a Field--'? '' : '.' + $('#savedqueryeditor .color-picklistparentfield').not('.dynamicLabel').val();
            }
            queryObj.picklistField = picklistField;
            /**End March Release*/
        //add settings based on assignment type
        if (queryObj.colorAssignmentType == 'Dynamic-Order')
        {
        	//this is a weird place to put this, but it kind of makes sense.  We should move away from these color fields later.
        	queryObj.colorAssignment = JSON.stringify({ drawLine: $('.order-drawline').is(':checked') });
        }
        else if (queryObj.colorAssignmentType == 'Dynamic, Field')
        {
        	queryObj.colorAssignment = JSON.stringify($('.color-picklistvalues').data('markerGrid').colorAssignments());
        }
        else if (queryObj.colorAssignmentType == 'Dynamic-Label')
        {
            var $dynamicLabelColorPicklistField = $('#savedqueryeditor #dynamicLabelColorPicklistField');
            var $dynamicLabelColorPicklistParentField = $('#savedqueryeditor #dynamicLabelColorPicklistParentField');
            
            var dynamicLabelColorPicklistField = $dynamicLabelColorPicklistField.val();
            var dynamicLabelColorPicklistParentField = $dynamicLabelColorPicklistParentField.val();
            
            // clean up color pick-list field
            if(!dynamicLabelColorPicklistField && dynamicLabelColorPicklistField == '--Please Choose--' || dynamicLabelColorPicklistField == '--None--' || dynamicLabelColorPicklistField == '--Select a Field--' || String(dynamicLabelColorPicklistField).trim().indexOf('--') == 0)
            {
                dynamicLabelColorPicklistField = null;
            } else
            {
                dynamicLabelColorPicklistField = dynamicLabelColorPicklistField.trim();
            }
            
            // clean up color pick-list parent field
            if(!dynamicLabelColorPicklistParentField || dynamicLabelColorPicklistParentField == '--Please Choose--' || dynamicLabelColorPicklistParentField == '--None--')
            {
                dynamicLabelColorPicklistParentField = null;
            } else
            {
                dynamicLabelColorPicklistParentField = dynamicLabelColorPicklistParentField.trim();
            }
            
            // set dynamic label col data to save
            if(dynamicLabelColorPicklistField)
            {
                var picklistField = dynamicLabelColorPicklistField;
                
                if(dynamicLabelColorPicklistParentField)
                {
                    if (query.polymorphicObject && query.polymorphicObject !== null && picklistField === query.addressObject) {
                        picklistField = query.polymorphicObject + '::' + dynamicLabelColorPicklistParentField
                    } else {
                        picklistField += '.'+dynamicLabelColorPicklistParentField;
                    }
                }
                
                // set pickistField to save
                queryObj.picklistField = picklistField;
                
                // set colorAssignment field to save
                var dynamicLabelMarkerGrid = $('.dynamicLabelWrapper .marker-multifieldColorValues').data('markerGrid');
                if(dynamicLabelMarkerGrid)
                {
                    var dynamicLabelColorAssignments = dynamicLabelMarkerGrid.colorAssignments();

                    // when we know we have both a picklist field and color assignment input, only then go ahead and save both
                    if(dynamicLabelColorAssignments)
                    {
                        queryObj.picklistField = picklistField; // set pickistField to save
                	    queryObj.colorAssignment = JSON.stringify(dynamicLabelColorAssignments); // set color assignment field to save
                    }
                }
                
                // set automaticassign to save
                queryObj.advancedOptions.automaticassign = false; //$('#dynamicLabelAutoAssign').is(':checked');
                
                // set otherthreshold to save
                var dynamicLabelOtherThreshold = $('#dynamicLabelOtherThreshold').val();
                
                // clean up dynamicLabelOtherThreshold
                if(dynamicLabelOtherThreshold)
                {
                    if(String(dynamicLabelOtherThreshold).trim() == '') {
                        dynamicLabelOtherThreshold = '0';
                    } else {
                        dynamicLabelOtherThreshold = String(dynamicLabelOtherThreshold).trim();
                    }
                    
                    queryObj.advancedOptions.otherthreshold = dynamicLabelOtherThreshold;
                }
            }
            
            // var picklistField = dynamicLabelColorPicklistField == '--Select a Field--' || '--None--' ? ''  : $dynamicLabelColorPicklistField.val();
            // picklistField += $dynamicLabelColorPicklistParentField.val() == null || $dynamicLabelColorPicklistParentField.val() == '--Select a Field--'? '' : '.' + $dynamicLabelColorPicklistParentField.val();
            // queryObj.picklistField = picklistField;
            
            // var dynamicLabelMarkerGrid = $('.dynamicLabelWrapper .color-picklistvalues').data('markerGrid');
            
            // if(dynamicLabelMarkerGrid)
            // {
        	   // queryObj.colorAssignment = JSON.stringify(dynamicLabelMarkerGrid.colorAssignments());
            // }
        }
        else if (queryObj.colorAssignmentType == 'Dynamic-multiField')
        {
            var shapePicklistField = $(' #marker-multiField-shapeField').val() == '--Select a Field--' ? '' : $('#marker-multiField-shapeField').val();
            if (query.polymorphicObject && query.polymorphicObject !== null && shapePicklistField === query.addressObject) {
                var shapeParentField = document.getElementById('marker-multiFieldParent-shapeField').value || '';
                shapePicklistField = shapeParentField === '--Select a Field--' || shapeParentField === '' ? shapePicklistField : query.polymorphicObject + '::' + shapeParentField;
            } else {
                shapePicklistField += $('#marker-multiFieldParent-shapeField').val() == null || $('#marker-multiFieldParent-shapeField').val() == '--Select a Field--'? '' : '.' + $('#marker-multiFieldParent-shapeField').val();
            }            
            queryObj.shapePicklistField = shapePicklistField;
            var colorPicklistField = $(' #marker-multiField-colorField').val() == '--Select a Field--' ? '' : $('#marker-multiField-colorField').val();
            if (query.polymorphicObject && query.polymorphicObject !== null && colorPicklistField === query.addressObject) {
                var colorParentField = document.getElementById('marker-multiFieldParent-colorField').value || '';
                colorPicklistField = colorParentField === '--Select a Field--' || colorParentField === '' ? colorPicklistField : query.polymorphicObject + '::' + colorParentField;
            } else {            
                colorPicklistField += $('#marker-multiFieldParent-colorField').val() == null || $('#marker-multiFieldParent-colorField').val() == '--Select a Field--'? '' : '.' + $('#marker-multiFieldParent-colorField').val();
            }            
            queryObj.picklistField = colorPicklistField;
            
            try {
                queryObj.shapeAssignment = JSON.stringify($('.Dynamic-multiField  .marker-multifieldShapeValues').data('markerGrid').colorAssignments());
        	    queryObj.colorAssignment = JSON.stringify($('.Dynamic-multiField  .marker-multifieldColorValues').data('markerGrid').colorAssignments());
            }
            catch(e) {}
    
        }
        
        //loop through and add MarkerLayerRelatedList
        $('#MarkerLayerRelatedList-list .MarkerLayerRelatedList-row').each(function (index)
        {
        	//build related list
            var MarkerLayerRelatedList = ({
            	index					: index, 
                baseObject              : query.baseObject,
                relatedobject           : $(this).data('crossObjectName'),
                referencefield			: $(this).data('crossObjectFieldName'),
                numtodisplay            : $(this).find('.MarkerLayerRelatedList-numtodisplay').val(),
                filter                  : undefined,
                field1                  : $(this).find('.MarkerLayerRelatedList-column').eq(0).val() || '',
                field2                  : $(this).find('.MarkerLayerRelatedList-column').eq(1).val() || '',
                field3                  : $(this).find('.MarkerLayerRelatedList-column').eq(2).val() || '',
                field4                  : $(this).find('.MarkerLayerRelatedList-column').eq(3).val() || '',
                field5                  : $(this).find('.MarkerLayerRelatedList-column').eq(4).val() || '',
                aggregate1              : undefined,
                aggregate2              : undefined,
                relatedlistname			: $(this).find('.MarkerLayerRelatedList-label').is('.watermark') ? '' : $(this).find('.MarkerLayerRelatedList-label').text(),
                relatedlistsort			: $(this).find('.MarkerLayerRelatedList-orderby').val() + ' ' + $(this).find('.MarkerLayerRelatedList-orderby-direction').val(),
                filters					: []
            });
            
            //add filters
            $(this).find('.MarkerLayerRelatedList-filters .filter').each(function (index) {
                MarkerLayerRelatedList.filters.push({
                    index                   : componentIndex++,
                    baseObject              : MarkerLayerRelatedList.relatedobject,
                    indexLabel              : index,
                    fieldName               : $(this).find('.fieldoptions .combobox').val(),
                    parentFieldName         : $(this).find('.parentfieldoptions .combobox').val(),
                    grandparentFieldName    : $(this).find('.grandparentfieldoptions .combobox').val(),
                    fieldType               : $(this).attr('data-fieldtype'),
                    operator                : $(this).find('.operator .combobox').val(),
                    value                   : extractValue1($(this)),
                    value2                  : extractValue2($(this))
                });
            });

            //add to the query
            queryObj.relatedLists.push(MarkerLayerRelatedList);
        });

        return queryObj;
    }
    
    function extractValue1($filter)
    {
        switch ($filter.attr('data-basetype'))
        {
            case 'STRING':
                return $filter.find('.value .STRING > input').val();
                break;
            case 'PICKLIST':
                var selectedOptions = [];
                $filter.find('.value .PICKLIST select.multiselect').multiselect('widget').find('input[type="checkbox"]:checked').each(function () { selectedOptions.push($(this).attr('value'))});
                //$filter.find('.value .PICKLIST select.multiselect > option:checked').each(function () { selectedOptions.push($(this).val()); } );
                return selectedOptions.join('~~');
                break;
            case 'BOOLEAN':
                return $filter.find('.value .BOOLEAN input:radio:checked').val() == undefined ? 'NULL' : $filter.find('.value .BOOLEAN input:radio:checked').val();
                break;
            case 'DATE':
                var stringVal = $filter.find('.value .DATE > input.datejs').val();
                var returnVal = '';
                
                //check if the value is a date literal
                $.each(dateLiterals, function (i, dateLiteral)
                {
                    //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
                    if (dateLiteral.label == stringVal && dateLiteral.value != 'DYNAMIC')
                    {
                        //this is a date literal, so the text itself is our value
                        returnVal = dateLiteral.value;
                        return false;
                    }
                });
                if (returnVal != '') { return returnVal; }
                
                //check if the value is a dynamic date literal
                try {
                    var stringParts = stringVal.split(' ');
                    if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        if (!isNaN(parseInt(stringParts[1]))) {
                            if (stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                                return stringParts[0] + '_N_' + stringParts[2] + ':' + parseInt(stringParts[1]); 
                            }
                            else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    return stringParts[0] + '_N_FISCAL_' + stringParts[3] + ':' + parseInt(stringParts[1]);
                                }
                            }
                        }
                    } 
                    else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {  
                        if (!isNaN(parseInt(stringParts[0]))) {
                            if (stringParts.length == 3 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {
                                return 'N_' + stringParts[1] + '_' + stringParts[2] + ':' + parseInt(stringParts[0]);
                            } else if (stringParts.length == 4 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {                     
                                return 'N_' + stringParts[1] + '_' + stringParts[2] + '_' + stringParts[3] + ':' + parseInt(stringParts[0]);
                            }
                        }
                    }
                }
                catch (err) { }
                
                //if we made it this far, we aren't dealing with a date literal so parse the date
                try {
                    if ($filter.attr('data-fieldtype') == 'DATE')
                    {
						var formatedDate = formatUserLocaleDate({datepicker:true}).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
                        var formattedMoment = moment(stringVal,formatedDate);
                        return formattedMoment.isValid() ? formattedMoment.format('YYYY-MM-DD') : 'NULL';
                    }
                    else
                    {
                    	var formatedDate = formatUserLocaleDate({moment:true});
                        var formattedMoment = moment(stringVal,formatedDate);
                    	return formattedMoment.isValid() ? formattedMoment.utc().format('YYYY-MM-DDTHH:mm:ss\\Z') : 'NULL';
                    }
                }
                catch (err) {
                    return 'NULL';
                }
                break;
            case 'ID':
            	var operator = $filter.find('.operator .combobox').val();
            	if (operator == 'in' || operator == 'not in')
            	{
            		return $filter.find('.value .ID .queryfiltervalue .combobox').val();
            	}
            	else
            	{
            		return $filter.find('.value .ID .idfiltervalue').val();
            	}
            	break;
            default:
                return '';
        }
    }
    
    function extractValue2($filter)
    {
        switch ($filter.attr('data-basetype'))
        {
            case 'STRING':
                return $filter.find('.value .STRING .range input').val();
                break;
            case 'DATE':
                var stringVal = $filter.find('.value .DATE .range input.datejs').val();
                var returnVal = '';
            
                //check if the value is a date literal
                $.each(dateLiterals, function (i, dateLiteral)
                {
                    //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
                    if (dateLiteral.label == stringVal && dateLiteral.value != 'DYNAMIC')
                    {
                        //this is a date literal, so the text itself is our value
                        returnVal = dateLiteral.value;
                        return false;
                    }
                });
                if (returnVal != '') { return returnVal; }
                
                //check if the value is a dynamic date literal
                try {
                    var stringParts = stringVal.split(' ');
                    if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        if (!isNaN(parseInt(stringParts[1]))) {
                            if (stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                                return stringParts[0] + '_N_' + stringParts[2] + ':' + parseInt(stringParts[1]); 
                            }
                            else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    return stringParts[0] + '_N_FISCAL_' + stringParts[3] + ':' + parseInt(stringParts[1]);
                                }
                            }
                        }
                    }
                    else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {  
                        if (!isNaN(parseInt(stringParts[0]))) {
                            if (stringParts.length == 3 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {
                                return 'N_' + stringParts[1] + '_' + stringParts[2] + ':' + parseInt(stringParts[0]);
                            } else if (stringParts.length == 4 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {                     
                                return 'N_' + stringParts[1] + '_' + stringParts[2] + '_' + stringParts[3] + ':' + parseInt(stringParts[0]);
                            }
                        }
                    }
                }
                catch (err) { }
                
                //if we made it this far, we aren't dealing with a date literal so parse the date
                try {
                    if ($filter.attr('data-fieldtype') == 'DATE')
                    {
                        var formatedDate = formatUserLocaleDate({datepicker:true}).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
                        var formattedMoment = moment(stringVal,formatedDate);
                        return formattedMoment.isValid() ? formattedMoment.format('YYYY-MM-DD') : 'NULL';
                    }
                    else
                    {
                        var formatedDate = formatUserLocaleDate({moment:true});
                        var formattedMoment = moment(stringVal,formatedDate);
                        return formattedMoment.isValid() ? formattedMoment.utc().format('YYYY-MM-DDTHH:mm:ss\\Z') : 'NULL';
                    }
                }
                catch (err) {
                    return 'NULL';
                }
                break;
            default:
                return '';
        }
    }
    
    function valueToDateString(value, fieldType)
    {
        //check if the value is a date literal
        for (var i in dateLiterals)
        {
            if (dateLiterals.hasOwnProperty(i) && dateLiterals[i].value == value && value != 'DYNAMIC')
            {
                //this is a date literal, so the text itself is our value
                return dateLiterals[i].label;
            }
        }
        
        //check if the value is a dynamic date literal
        try {
            var stringParts = value.split(':');
            if (stringParts.length == 2 && !isNaN(parseInt(stringParts[1]))) {
                var literalParts = stringParts[0].split('_');
                if (literalParts[0] == 'NEXT' || literalParts[0] == 'LAST') {
                    if (literalParts[1] == 'N') {
                        if (literalParts.length == 3 && $.inArray(literalParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                            return literalParts[0] + ' ' + parseInt(stringParts[1]) + ' ' + literalParts[2]; 
                        }
                        else if (literalParts.length == 4 && literalParts[2] == 'FISCAL') {
                            if (literalParts[3] == 'QUARTERS' || literalParts[3] == 'YEARS') {
                                return literalParts[0] + ' ' + parseInt(stringParts[1]) + ' FISCAL ' + literalParts[3];
                            }
                        }
                    }
                } 
                else if (literalParts[2] == 'AGO' || literalParts[2] == 'FROM') {  
                    if (literalParts[0] == 'N') {
                        if (literalParts.length == 3 && $.inArray(literalParts[1], ['DAYS', 'YEARS']) != -1) {
                            return parseInt(stringParts[1]) + ' ' + literalParts[1] + ' ' + literalParts[2]; 
                        }
                        else if (literalParts.length == 4 && $.inArray(literalParts[1], ['DAYS', 'YEARS']) != -1) {
                            return parseInt(stringParts[1]) + ' ' + literalParts[1] + ' ' + literalParts[2] + ' ' + literalParts[3];
                        }
                    }
                }
            }
        }
        catch (err) { }
            
        //if we made it this far, we aren't dealing with a date literal so parse the date
        try
        {
            if (fieldType == 'DATE')
            {
            	var formatedDate = formatUserLocaleDate({datepicker:true}).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
                return moment(value).format(formatedDate);
            }
            else
            {
            	var formatedDate = formatUserLocaleDate({moment:true});
                return moment(value).format(formatedDate);
            }
        }
        catch (err) {}

        return '';
    }
    
    var dateLiterals = [
        // DAYS
        { value:"YESTERDAY", label:"YESTERDAY" },
        { value:"TODAY", label:"TODAY" },
        { value:"TOMORROW", label:"TOMORROW" },
        { value:"DYNAMIC", label:"LAST N DAYS" },
        { value:"DYNAMIC", label:"NEXT N DAYS" },
        { value:"DYNAMIC", label:"N DAYS AGO" },
        { value:"DYNAMIC", label:"N DAYS FROM NOW" },

        // WEEKS
        { value:"LAST_WEEK", label:"LAST WEEK" },
        { value:"THIS_WEEK", label:"THIS WEEK" },
        { value:"NEXT_WEEK", label:"NEXT WEEK" },
        { value:"DYNAMIC", label:"LAST N WEEKS" },
        { value:"DYNAMIC", label:"NEXT N WEEKS" },

        // MONTHS
        { value:"LAST_MONTH", label:"LAST MONTH" },
        { value:"THIS_MONTH", label:"THIS MONTH" },
        { value:"NEXT_MONTH", label:"NEXT MONTH" },
        { value:"DYNAMIC", label:"LAST N MONTHS" },
        { value:"DYNAMIC", label:"NEXT N MONTHS" },
        
        // QUARTERS
        { value:"THIS_QUARTER", label:"THIS QUARTER" },
        { value:"LAST_QUARTER", label:"LAST QUARTER" },
        { value:"NEXT_QUARTER", label:"NEXT QUARTER" },
        { value:"DYNAMIC", label:"LAST N QUARTERS" },
        { value:"DYNAMIC", label:"NEXT N QUARTERS" },

        // YEARS
        { value:"THIS_YEAR", label:"THIS YEAR" },
        { value:"LAST_YEAR", label:"LAST YEAR" },
        { value:"NEXT_YEAR", label:"NEXT YEAR" },
        { value:"DYNAMIC", label:"LAST N YEARS" },
        { value:"DYNAMIC", label:"NEXT N YEARS" },
        { value:"DYNAMIC", label:"N YEARS AGO" },
        { value:"DYNAMIC", label:"N YEARS FROM NOW" },
        
        // FISCAL QUARTERS
        { value:"THIS_FISCAL_QUARTER", label:"THIS FISCAL QUARTER" },
        { value:"LAST_FISCAL_QUARTER", label:"LAST FISCAL QUARTER" },
        { value:"NEXT_FISCAL_QUARTER", label:"NEXT FISCAL QUARTER" },
        { value:"DYNAMIC", label:"LAST N FISCAL QUARTERS" },
        { value:"DYNAMIC", label:"NEXT N FISCAL QUARTERS" },
        
        // FISCAL YEARS
        { value:"THIS_FISCAL_YEAR", label:"THIS FISCAL YEAR" },
        { value:"LAST_FISCAL_YEAR", label:"LAST FISCAL YEAR" },
        { value:"NEXT_FISCAL_YEAR", label:"NEXT FISCAL YEAR" },
        { value:"DYNAMIC", label:"LAST N FISCAL YEARS" },
        { value:"DYNAMIC", label:"NEXT N FISCAL YEARS" },
    ];
    
    function buildDatePickers ($elements)
    {
    	//format date for locale
    	var formatedDate = formatUserLocaleDate({datepicker:true});
    	
        $elements
            .datepicker({
                changeYear: true,
                showOn: "button",
                buttonImage: imageRefs.calendar,
                buttonImageOnly: true,
                dateFormat: formatedDate,
                constrainInput: false,
                onSelect: function () {
                    //parse this new date
                    $(this).val(parseDateInput($(this)));
                }
            })
            .autocomplete({
                minLength: 0,
                source: dateLiterals,
                focus: function (event, ui) {
                    return false;
                },
                select: function( event, ui ) {
                    parseDateInput($(this).val( ui.item.label ));    
                    return false;
                }
            })
            .blur(function () {
                $(this).val(parseDateInput($(this)));
            });
    }
    
    function parseDateInput ($dateInput)
    {
        var stringVal = $dateInput.val();
    
        //check if the value is a date literal
        for (var i in dateLiterals)
        {
            //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
            if (dateLiterals.hasOwnProperty(i) && dateLiterals[i].label == stringVal && dateLiterals[i].value != 'DYNAMIC')
            {
                //this is a date literal, so the text itself is our value
                $dateInput.removeClass('invalid').prev().val('');
                return stringVal;
            }
        }
        
        //check if the value is a dynamic date literal
        try {
            var stringParts = stringVal.split(' ');
            if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                // check if number
                if (!isNaN(parseInt(stringParts[1]))) {
                    // only allow positive number
                    if (stringParts[1] > 0) {
                        if (stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                            $dateInput.removeClass('invalid').prev().val('');
                            return stringVal;
                        }
                        else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                            if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                $dateInput.removeClass('invalid').prev().val('');
                                return stringVal;
                            }
                        }
                    }
                }
                // N is either NaN or negative
                $dateInput.addClass('invalid').prev().val('NULL');
                return stringVal;
            } else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
                // check if number
                if (!isNaN(parseInt(stringParts[0]))) {
                    // only allow positive number
                    if (stringParts[0] > 0) {
                        if (stringParts.length == 3 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {
                            $dateInput.removeClass('invalid').prev().val('');
                            return stringVal;
                        }
                        else if (stringParts.length == 4 && $.inArray(stringParts[1], ['DAYS','YEARS']) != -1) {
                            $dateInput.removeClass('invalid').prev().val('');
                            return stringVal;
                        }
                    }
                }
                // N is either NaN or negative
                $dateInput.addClass('invalid').prev().val('NULL');
                return stringVal;
            }
        }
        catch (err) { }
        
        //validate the date
        var formatedDate = formatUserLocaleDate({datepicker:true}).replace('dd','DD').replace('mm','MM').replace('yy','YYYY');
        var parsedDate = moment($dateInput.val(),formatedDate);

        if ($dateInput.val() == '')
        {
            $dateInput.removeClass('invalid').prev().val('NULL');
            return '';
        }
        else if (!parsedDate.isValid())
        {
            $dateInput.addClass('invalid').prev().val('NULL');
            return $dateInput.val();
        }
        else
        {
            if ($dateInput.closest('.filter').attr('data-fieldtype') == 'DATE')
            {
            	//format date for locale
            	formatedDate = formatUserLocaleDate({datepicker:true}).replace('dd','DD').replace('mm','MM').replace('yy','YYYY');
       			parsedDate = moment($dateInput.val(),formatedDate);
            	
                $dateInput.removeClass('invalid').prev().val(
                    parsedDate.format(formatedDate)
                );
                
                return parsedDate.format(formatedDate);
            }
            else
            {
            	//format date for locale
            	formatedDate = formatUserLocaleDate({moment:true});
            	parsedDate = moment($dateInput.val(),formatedDate);
            	
                $dateInput.removeClass('invalid').prev().val(
                    parsedDate.format(formatedDate)
                );
                
                return parsedDate.format(formatedDate);
            }
        }
    }
    
    function refreshIndices()
    {
        $('.fieldfilters .listbox > .filter').each(function (index, element)
        {
            $(this).attr('data-index', index + 1).find('.indexlabel').text(index + 1);
        });
    }
    
    function refreshCrossIndices()
    {
    	$('.crossfilters .listbox .subfilters:first > .filter').each(function (index, element)
        	{
            	$(this).attr('data-index', index + 1).find('.indexlabel').text(index + 1);
        });
        
        $('.crossfilters .listbox .subfilters:last > .filter').each(function (index, element)
        	{
            	$(this).attr('data-index', index + 1).find('.indexlabel').text(index + 1);
        });            	
    }
    
	function randomHexColorCode()
    {
        var hexList = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
        var hexCode = '#';
        for (var i = 0; i < 6; i++)
        {
            hexCode += hexList[Math.floor(Math.random() * 16)];
        }
        return hexCode;
    }
	
	/***********************************************
    *   MutiField Marker Grids
    ***********************************************/
    //object
    var ShapeMarkerGrid = function (opts) {//
        //defaults
        $.extend(this, {
            el: $('<div class="slds-p-around_x-small markergrid-wrapper"></div>'),
            tableEl: null,
            type: null,
            picklistOptions: []
        }, opts);

        //build grid element
        this.redraw();
    };

    //methods
    $.extend(ShapeMarkerGrid.prototype, {
        
        //type metadata
        types: {
            'BOOLEAN'       : { baseType: 'PICKLIST' },
            'PICKLIST'      : { baseType: 'PICKLIST' },
            'MULTIPICKLIST' : { baseType: 'MULTIPICKLIST' },
            'DATE'          : { baseType: 'DATE' },
            'DATETIME'      : { baseType: 'DATE' },
            'STRING'        : { baseType: 'STRING' },
            'TEXTAREA'      : { baseType: 'STRING' },
            'URL'           : { baseType: 'STRING' },
            'COMBOBOX'      : { baseType: 'STRING' },
            'REFERENCE'     : { baseType: 'REFERENCE' },
            'ID'            : { baseType: 'REFERENCE' },
            'CURRENCY'      : { baseType: 'NUMBER' },
            'INTEGER'       : { baseType: 'NUMBER' },
            'DOUBLE'        : { baseType: 'NUMBER' },
            'PERCENT'       : { baseType: 'NUMBER' },
            'PHONE'         : { baseType: 'PHONE' }    
        },

        //get/set type
        type: function (type) {
            if (type) {
                this.type = type;
                return this.redraw();
            }
            else {
                return this.type;
            }
        },

        //get base type
        baseType: function () {
            
            return this.types[this.type].baseType;
        },

        //redraw the grid based on type
        redraw: function () {
            var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
        	var tableClass;
        	var currencyQuickFill;
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';
                tableClass = 'shapemarkergrid';
                currencyQuickFill = '.shapemarkergrid-quickfill';
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                tableClass = 'colormarkergrid';
                currencyQuickFill = '.colormarkergrid-quickfill';
            }
            //remove existing content
            this.el.empty();

            //add quickfill options
            this.el.append($('#savedqueryeditor-templates ' + currencyQuickFill + '[data-type="'+this.baseType()+'"]').clone());
			this.el.find(currencyQuickFill + ' .numberval').blur(function() {
				$(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1 });
			})
			.on('keyup change', function(e) {
				var e = window.event || e;
				var keyUnicode = e.charCode || e.keyCode;
				if (e !== undefined) {
					switch (keyUnicode) {
						case 16: break; // Shift
						case 17: break; // Ctrl
						case 18: break; // Alt
						case 27: this.value = ''; break; // Esc: clear entry
						case 35: break; // End
						case 36: break; // Home
						case 37: break; // cursor left
						case 38: break; // cursor up
						case 39: break; // cursor right
						case 40: break; // cursor down
						case 78: break; // N (Opera 9.63+ maps the "." from the number key section to the "N" key too!) (See: http://unixpapa.com/js/key.html search for ". Del")
						case 110: break; // . number block (Opera 9.63+ maps the "." from the number block to the "N" key (78) !!!)
						case 190: break; // .
						default: $(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1});
					}
				}
			});
            
            //parse color assignments
            var colorAssignmentMap = {};
			try {
                if(this.gridType == 'shapes'){
					var shapeAssignmentRules = JSON.parse(query.shapeAssignment);
            		$.each(shapeAssignmentRules, function (index, rule) {
                		colorAssignmentMap['cv' + rule.comparevalue] = rule;
                	});
                } else if(this.gridType == 'colors')
                {
                	var colorAssignmentRules = JSON.parse(query.colorAssignment);
            		$.each(colorAssignmentRules, function (index, rule) {
                		colorAssignmentMap['cv' + rule.comparevalue] = rule;
                	});
                }
            }
            catch (err) {
                if(this.gridType == 'shapes'){
                    $.each((query.shapeAssignment || '').split('~~'), function (index, shapeAssignment) {
                        if (shapeAssignment != '') {
                            var assignmentParts = shapeAssignment.split('~');
                            colorAssignmentMap[assignmentParts[0]] = { value: assignmentParts[1] };
                        }
                    });
                } else if(this.gridType == 'colors')
                {
                    $.each((query.colorAssignment || '').split('~~'), function (index, colorAssignment) {
                        if (colorAssignment != '') {
                            var assignmentParts = colorAssignment.split('~');
                            colorAssignmentMap[assignmentParts[0]] = { value: assignmentParts[1] };
                        }
                    });                    
                
                }
            }
			
            //add grid
            var $table = this.tableEl = $('<table class="' + tableClass + '" />').appendTo(this.el);
            $table.append($('#savedqueryeditor-templates ' + markerGridHeader + '[data-type="'+this.baseType()+'"]').clone());
            
            //init headers
            if(this.gridType == 'shapes'){
            	$table.find(markerGridHeader + ' ' + markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
            } else if(this.gridType == 'colors')
            {
                $table.find(markerGridHeader + ' ' + markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" style="background-color="#00FF00"></div>');    
            }
            //handlers
            $table.find('.color-dynamicallyassign').click(function () { grid.dynamicallyAssign({ dimension: $(this).attr('data-dimension') || 'all' }); });
            $table.on('click', '.add-row-icon', function () { grid.addRow({ target: this }); });
            $table.on('click', '.remove-row', function () { $(this).closest(markerGridRow).remove(); });
            
            //add rows
            var grid = this; //
            if (this.baseType() == 'PICKLIST')
            {
            	//picklists are a special case because we need to populate a row for each option even for a new grid
                var grid = this;
                $.each(grid.picklistOptions || [], function (index, option) {
                    grid.addRow({ comparevalue: option.itemValue,comparelabel : option.itemLabel || option.itemValue});//bryan James I added comparelabel
                });
                if(this.type != 'BOOLEAN'){
                    grid.addRow({ comparevalue: '<Other>' }).tableEl.find(markerGridRow).last().addClass('other');
                }   
                //update the colors based on the existing query if we have one
                if (this.needToUpdate && Object.keys(colorAssignmentMap).length > 0)
				{   
                    //assign color values
					this.tableEl.find(markerGridRow).each(function()
					{
						var text = 'cv' + $(this).find('.comparevalue').attr('value')
						var color = (colorAssignmentMap[text] || { value:'#00FF00:Marker' }).value;
						
                        if(grid.gridType == 'shapes'){
                                $(this).find(markerTypePreview).attr('data-color', '#00FF00:' + color).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + color, forLegend: true }));
    					
                            } else if(grid.gridType == 'colors'){
                                $(this).find(markerTypePreview).attr('data-color', color).html('<div class="top-row-button colorTest" data-color="'+ color +'" style="background-color:'+ color +';"></div>'); 
                            }
					});
					
					query.colorAssignment = grid.gridType == 'colors' ? null : query.colorAssignment;
					query.shapeAssignment = grid.gridType == 'shapes' ? null : query.shapeAssignment;
		        }
            }
			else if (this.needToUpdate && Object.keys(colorAssignmentMap).length > 0) 
			{
                //create a row for each existing rule
            	$.each(colorAssignmentMap, function (index, rule) {
                	grid.addRow({ rule: rule });
                	
                });
                
                query.colorAssignment = grid.gridType == 'colors' ? null : query.colorAssignment;
				query.shapeAssignment = grid.gridType == 'shapes' ? null : query.shapeAssignment;
            }
            else 
            {
            	//just create a blank row and the <Other> row
               	grid.addRow({});
               	if(grid.gridType == 'shapes'){
			      
                    grid.addRow({ rule: { comparedisplay: '<Other>', comparevalue: '<Other>', value: 'Marker' } });
			
                } else if(grid.gridType == 'colors'){
                   
                    grid.addRow({ rule: { comparedisplay: '<Other>', comparevalue: '<Other>', value: '#00FF00' } }); 
                }
               
            }
        },

        //add a row to the marker grid
        addRow: function (options) {
            var markerGridHeader;
        	var markerGridRow;
            var markerTypePreview;
            
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';        
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                
            }

            // MAP-6276, fix for blank number not at start
            var compareValue = getProperty(options || {}, 'rule.comparevalue', false);
            //create row
            var $row = $('#savedqueryeditor-templates ' + markerGridRow + '[data-type="'+this.baseType()+'"]').clone();
            var rowLength = this.tableEl.find(markerGridRow).length;
        	if (options.target && $(options.target).closest('tr').is(markerGridRow)) {
        		$row.insertAfter($(options.target).closest('tr'));
            }
            else if (this.baseType() === 'NUMBER' && (compareValue === '' || compareValue === undefined)) {
                if(rowLength === 0) {
                    $row.appendTo(this.tableEl);
                }
                else {
                    this.tableEl.find('.colormarkergrid-row:first').before($row);
                }
            }
        	else if (this.tableEl.find(markerGridRow + '.other').length > 0) {
                $row.insertBefore(this.tableEl.find(markerGridRow + '.other'));
            }
        	else {
        		$row.appendTo(this.tableEl);
        	}

            var thisBaseType = this.baseType();
            
            switch (thisBaseType)
            {
                case 'PICKLIST':
                    //Bryan James
                	$row.find('.comparevalue').text(options.comparelabel || options.comparevalue).attr('value',options.comparevalue);//$row.find('.comparevalue').text(options.comparevalue);
                    if(this.gridType == 'shapes'){
                        		
                            	$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
						
                            } else if(this.gridType == 'colors'){
                                
                            	$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>');
                                //onclick event to show the picker
                               
                            }
                    //$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                break;
                    
                case 'MULTIPICKLIST':
                
                	//update row
                    //$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    if(this.gridType == 'shapes'){
                        		
                    	$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        
                    	$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>');
                        //onclick event to show the picker
                       
                    }
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //add picklist options
                    $.each(this.picklistOptions, function (index, option) {
                    	$row.find('.comparevalue').append($('<option>', { value : option.itemValue }).text(option.itemLabel)); 
                    });
					$row.find('.comparevalue').multiselect({ noneSelectedText: 'Click here to select options', selectedList: 2 }).multiselectfilter().multiselect('uncheckAll');
					
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue option').remove();
							$row.find('.comparevalue').append($('<option></option>').attr('value', '<Other>').text('--Other--'));
							$row.find('.comparevalue').multiselect('refresh').multiselect('checkAll');
             				$row.find('.comparevalue').multiselect('disable');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							
							var selectedOptions = options.rule.comparevalue.split('~~');
							for (var i in selectedOptions) {
                                if (selectedOptions.hasOwnProperty(i)) {
								   $row.find('.comparevalue').multiselect('widget').find('input[value="'+selectedOptions[i]+'"]').click();
                                }
							}
						}
						
						/**if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > '+ markerTypePreview).hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
						}*/
						    if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
					}
                break;
                case 'DATE':
                
                	//create row
                    //$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                    if(this.gridType == 'shapes'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>');
                               
                               
                    }
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //init datepickers
                    var formatedDate = formatUserLocaleDate({
		            	datepicker	: true,
		            	salesforce	: false,
		            	moment		: false
		            });
					$row.find('.comparevalue, .enddate').removeAttr('disabled').val('').datepicker({
						dateFormat: formatedDate,
                        defaultDate: "-8w",
                        numberOfMonths: 3,
                        showOn: "button",
		                buttonImage: imageRefs.calendar,
		                buttonImageOnly: true,
		                constrainInput: false,
                        onClose: function( selectedDate ) {
                           	if ($(this).is('.comparevalue')) {
								$row.find('.enddate').datepicker( "option", "minDate", selectedDate );
							}
							else {
								$row.find('.comparevalue').datepicker( "option", "maxDate", selectedDate );
							}
						}
                    })
                    .autocomplete({
                        minLength: 0,
	                    source: MADateLiterals,
	                    focus: function (event, ui) {
	                        return false;
	                    },
	                    select: function( event, ui ) {
	                        $(this).val(ui.item.label);    
	                        return false;
	                    }
                	});
					
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.enddate').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
							$row.find('.ui-datepicker-trigger').hide();
							$row.find('.dateliteralpicker').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							
							var formatedDate = formatUserLocaleDate({ datepicker: true }).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
							var formatCompareValue;
							var formatEndDate;
							var comparevalueIsDateLiteral = false;
							var enddateIsDateLiteral = false;
									
							//check for date literals
		            		for (var i in MADateLiterals)
		                    {
                                if (MADateLiterals.hasOwnProperty(i))
                                {
			                        //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
			                        if (MADateLiterals[i].label == options.rule.comparevalue && MADateLiterals[i].value != 'DYNAMIC')
			                        {
			                        	formatCompareValue = options.rule.comparevalue;
			                        	comparevalueIsDateLiteral = true;
			                        	
			                        }
			                        if (MADateLiterals[i].label == options.rule.enddate && MADateLiterals[i].value != 'DYNAMIC')
			                        {
			                        	formatEndDate = options.rule.enddate;
			                        	enddateIsDateLiteral = true;
			                        }
                                }
		                    }
									
							//check if the from value is a dynamic date literal
		                    try {
		                        var stringParts = options.rule.comparevalue.split(' ');
		                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
		                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
		                        		formatCompareValue = options.rule.comparevalue;
		                        		comparevalueIsDateLiteral = true;
				                    }
				                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                        if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                            formatCompareValue = options.rule.comparevalue;
		                        		    comparevalueIsDateLiteral = true;
                                        }
                                    }
		                        }
		                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
		                        	var stringPartsValue = parseInt(stringParts[0]);
		                        	var stringPartsUnit = stringParts[1].toLowerCase();
		                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
		                        		formatCompareValue = options.rule.comparevalue;
		                        		comparevalueIsDateLiteral = true;
		                        	}
			                    }
		                    }
		                    catch (err) { }
				                    
		                    //check if the to value is a dynamic date literal
		                    try {
		                        var stringParts = options.rule.enddate.split(' ');
		                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
		                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
		                        		enddateIsDateLiteral = true;
		                        		formatEndDate = options.rule.enddate;
				                    }
				                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                        if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                            enddateIsDateLiteral = true;
		                        		    formatEndDate = options.rule.enddate;
                                        }
                                    }
		                        }
		                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
		                        	var stringPartsValue = parseInt(stringParts[0]);
		                        	var stringPartsUnit = stringParts[1].toLowerCase();
		                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
		                        		enddateIsDateLiteral = true;
		                        		formatEndDate = options.rule.enddate;
		                        	}
			                    }
		                    }
		                    catch (err) { }
									
                            //format date to display correct user locale
                            if(enddateIsDateLiteral != true)
							{
								//formatCompareValue = moment(options.rule.comparevalue,'YYYY-MM-DD').utc().format(formatedDate);
								formatEndDate = moment(options.rule.enddate,'YYYY-MM-DD').utc().format(formatedDate);
							}
							if (comparevalueIsDateLiteral != true)
							{
								formatCompareValue = moment(options.rule.comparevalue,'YYYY-MM-DD').utc().format(formatedDate);
								//formatEndDate = moment(options.rule.enddate,'YYYY-MM-DD').utc().format(formatedDate);
							}
							//populate
							$row.find('.comparevalue').val(formatCompareValue);
							$row.find('.enddate').val(formatEndDate);
							// if(enddateIsDateLiteral != true || comparevalueIsDateLiteral != true)
							// {
							// 	formatCompareValue = moment(options.rule.comparevalue,'YYYY-MM-DD').utc().format(formatedDate);
							// 	formatEndDate = moment(options.rule.enddate,'YYYY-MM-DD').utc().format(formatedDate);
							// }
							
							// //populate
							// $row.find('.comparevalue').val(formatCompareValue);
							// $row.find('.enddate').val(formatEndDate);
						}
						
						/**if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > ' + markerTypePreview).hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
						}*/
						if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
					}
                break;
                case 'STRING':
                
                	//create row
                    //$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                    /**if(this.gridType == 'shapes'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00"></div>');
                               
                               
                    }*/
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
					//populate
					if (options.rule) {
					    
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						
						    if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
							//$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
						
					}
					else {
						if(this.gridType == 'shapes'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
					
                        } else if(this.gridType == 'colors'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color:#00FF00;"></div>'); 
                        }
					}
					
                break;
                case 'REFERENCE':
               		
               		//create row
                    //$row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                    /**if(this.gridType == 'shapes'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00"></div>');                                  
                    }*/
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    //handle autocomplete of related records
                    $row.find('.comparedisplay').autocomplete({
		            	source: function (request, response) {
                            
				            var searchTerm = request.term;
                            /**March Release 2016*/
						    // var fieldName = $('#savedqueryeditor .color-picklistfield option:selected').attr('data-lookup') == 'lookup' ? $('#savedqueryeditor .color-picklistparentfield').val() : $('#savedqueryeditor .color-picklistfield').val();
						    //var fieldName = $row.parent().closest('tr').find('.color-picklistfield option:selected').attr('data-lookup') == 'lookup' ? $row.parent().closest('tr').find('.color-picklistparentfield').val() : $row.parent().closest('tr').find('.color-picklistfield').val();
				            var fieldName = $row.parent().closest('.multi-fields').find('.multiField option:selected').attr('data-lookup') == 'true' ? $row.parent().closest('.multi-fields').find('.multiFieldParent').val() : $row.parent().closest('.multi-fields').find('.multiField').val();
                            var queryBaseObject = $row.parent().closest('.multi-fields').find('.multiField option:selected').attr('data-lookup') == 'true' ? $row.parent().closest('.multi-fields').find('.multiFieldParent').attr('data-currentbaseobject') : query.baseObject;
 
                            var processData = {
                                ajaxResource : 'QueryBuilderAPI',
                                
                                action: 'getLookupOptions',
                                baseObject	: queryBaseObject,
                                term		: searchTerm,
                                fieldName	: fieldName
                            };
                            
                            //ADDED LOADING SPINNER
                            showLoading($('#queryeditor-modal'),'loading');
                
                            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                                processData,
                                function(lookupOptionsResponse, event){
                                    //CLOSED LOADING SPINNER
                                    hideMessage($('#queryeditor-modal'));
                                    if(event.status) {	
				             			var options = [];
				             			$.each(lookupOptionsResponse.data, function (index, data) {
                                            
				             				options.push({
				             					label: data.Name,
				             					value: data.Id
				             				});
				             			});
				             			
				             			response(options);
				             		}
				             		else {
				             		    response([]);
				             		}
                                },{buffer:false,escape:false}
                            );
			            },
			            minLength: 2,
			            select: function( event, ui) {
			            	$(this).closest(markerGridRow).find('.searchText').val(ui.item.label);
			            	$(this).closest(markerGridRow).find('.valueText').val(ui.item.value);
			            	return false;
			            },
			            focus: function( event, ui) {
				            $(this).closest(markerGridRow).find('.searchText').val(ui.item.label);
				            $(this).closest(markerGridRow).find('.valueText').val(ui.item.value);
				            return false;
						}
		            });
                    
					//populate
					if (options.rule) {
						if(options.rule.comparedisplay == '<Other>') {
							$row.addClass('other');
							$row.find('.comparedisplay').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
                            $row.find('.comparevalue').val('<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.comparedisplay').val(options.rule.comparedisplay);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						
					
						    if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
							//$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
							
					
					} else {
						if(this.gridType == 'shapes'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
					
                        } else if(this.gridType == 'colors'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>'); 
                        }
					}
					
               	break;
                case 'NUMBER':
               	
               		//create row
                    //$row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                    /**if(this.gridType == 'shapes'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00"></div>');                                  
                    }*/
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //init currency mask
                    $row.find('.numberval').blur(function() {
						$(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1 });
					})
					.on('keyup change', function(e) {
						var e = window.event || e;
						var keyUnicode = e.charCode || e.keyCode;
						if (e !== undefined) {
							switch (keyUnicode) {
								case 16: break; // Shift
								case 17: break; // Ctrl
								case 18: break; // Alt
								case 27: this.value = ''; break; // Esc: clear entry
								case 35: break; // End
								case 36: break; // Home
								case 37: break; // cursor left
								case 38: break; // cursor up
								case 39: break; // cursor right
								case 40: break; // cursor down
								case 78: break; // N (Opera 9.63+ maps the "." from the number key section to the "N" key too!) (See: http://unixpapa.com/js/key.html search for ". Del")
								case 110: break; // . number block (Opera 9.63+ maps the "." from the number block to the "N" key (78) !!!)
								case 190: break; // .
								default: $(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1});
							}
						}
					});
                    
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.toVal').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.comparevalue').val(options.rule.comparevalue).change();
							$row.find('.toVal').val(options.rule.toVal).change();
						}
						
						
						
						    if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
							//$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
						
					} else {
						if(this.gridType == 'shapes'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
					
                        } else if(this.gridType == 'colors'){
                            $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>'); 
                        }
					}
               	
               	break;
                case 'PHONE':
               	
               		//create row
                    //$row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder({ forLegend: true }));
                   if(this.gridType == 'shapes'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
						
                    } else if(this.gridType == 'colors'){
                        $row.find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="#00FF00" style="background-color="#00FF00"></div>');                                  
                    }
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //input mask for phone values
                    $row.find('.comparevalue').mask('(999) 999-9999');
                    
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.operator').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						/**if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > ' + markerTypePreview).hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {*/
						    if(this.gridType == 'shapes'){
						       
                                $row.find(markerTypePreview).attr('data-color', '#00FF00:' + options.rule.value).html(MAMarkerBuilder.createSVG({ color: '#00FF00:' + options.rule.value, forLegend: true }));
    					
                            } else if(this.gridType == 'colors'){
                                
                                $row.find(markerTypePreview).attr('data-color', options.rule.value).html('<div class="top-row-button colorTest" data-color="'+options.rule.value+'" style="background-color:'+options.rule.value+';"></div>'); 
                            }
							//$row.find(markerTypePreview).attr('data-color', options.rule.value).html(MAMarkerBuilder({ color: options.rule.value, forLegend: true }));
						//}
					}
               	
               	break;
            }

            return this;
        },
        
        rowToColorAssignment: function ($row) {
            var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
            var value;
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';
                value = $row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color').split(':')[1];
                
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                value = $row.find('.colorTest').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.colorTest').attr('data-color');
            }
        	switch (this.baseType())
            {
                case 'PICKLIST':
                    return {
						operator		: $row.find('.operator').val(),
						comparevalue	: $row.find('.comparevalue').attr('value'),//text(),
                        value 			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
					};
				break;
				case 'MULTIPICKLIST':
					var selectedOptions = [];
					if($row.find('.comparevalue').val() != '<Other>') {
						$row.find('.comparevalue').multiselect('widget').find('input[type="checkbox"]:checked').each(function () { selectedOptions.push($(this).attr('value'))});
					}
            		
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val() == '<Other>' ? $row.find('.comparevalue').val() : selectedOptions.join('~~'),
                        value 			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
		           	};
				break;
                case 'DATE':
				
					//capatalize for moment
            		var formatedDate = formatUserLocaleDate({datepicker	: true}).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
		            		
            		var comparevalueIsDateLiteral = false;
            		var enddateIsDateLiteral = false;
		            		
            		//check for date literals
            		for (var i in MADateLiterals)
                    {
                        if (MADateLiterals.hasOwnProperty(i))
                        {
	                        //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
	                        if (MADateLiterals[i].label == $row.find('.comparevalue').val())
	                        {
	                        	comparevalueIsDateLiteral = true;
	                        	
	                        }
	                        if (MADateLiterals[i].label == $row.find('.enddate').val())
	                        {
	                        	enddateIsDateLiteral = true;
	                        	
	                        }
                        }
                    }
		                    
                    //check if the from value is a dynamic date literal
                    try {
                        var stringParts = $row.find('.comparevalue').val().split(' ');
                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
                        		comparevalueIsDateLiteral = true;
		                    }
		                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    comparevalueIsDateLiteral = true;
                                }
                            }
                        }
                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
                        	var stringPartsValue = parseInt(stringParts[0]);
                        	var stringPartsUnit = stringParts[1].toLowerCase();
                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
                        		comparevalueIsDateLiteral = true;
                        	}
	                    }
                    }
                    catch (err) { }
		                    
                    //check if the to value is a dynamic date literal
                    try {
                        var stringParts = $row.find('.enddate').val().split(' ');
                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
                        		enddateIsDateLiteral = true;
		                    }
		                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    enddateIsDateLiteral = true;
                                }
                            }
                        }
                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
                        	var stringPartsValue = parseInt(stringParts[0]);
                        	var stringPartsUnit = stringParts[1].toLowerCase();
                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
                        		enddateIsDateLiteral = true;
                        	}
	                    }
                    }
                    catch (err) { }
		                    
                    //format to utc for storage skip other
                    var formattedCompareValue;
                    var formattedEndDate;
                    
                    // allowing for date and date literals to be saved together now
                    if($row.find('.comparevalue').val() == '<Other>' || $row.find('.enddate').val() == '<Other>')
                    {
                        formattedCompareValue = $row.find('.comparevalue').val();
                        formattedEndDate = $row.find('.enddate').val();
                    }
                    else {
                        if(comparevalueIsDateLiteral == true) {
                            formattedCompareValue = $row.find('.comparevalue').val();
                        }
                        else {
                            formattedCompareValue = moment($row.find('.comparevalue').val(),formatedDate).utc().format('YYYY-MM-DD');
                        }
                        if (enddateIsDateLiteral == true) {
                            formattedEndDate = $row.find('.enddate').val();
                        }
                        else {
                            formattedEndDate = moment($row.find('.enddate').val(),formatedDate).utc().format('YYYY-MM-DD');
                        }
                    }

                    //old 
                    // if(comparevalueIsDateLiteral == true || enddateIsDateLiteral == true)
                    // {
                    // 	var formattedCompareValue = $row.find('.comparevalue').val();
					// 	var formattedEndDate = $row.find('.enddate').val();
                    // }
            		// else if($row.find('.comparevalue').val() == '<Other>' || $row.find('.enddate').val() == '<Other>')
            		// {
            		// 	var formattedCompareValue = $row.find('.comparevalue').val();
					// 	var formattedEndDate = $row.find('.enddate').val();
					// }
					// else
					// {
					// 	var formattedCompareValue = moment($row.find('.comparevalue').val(),formatedDate).utc().format('YYYY-MM-DD');
					// 	var formattedEndDate = moment($row.find('.enddate').val(),formatedDate).utc().format('YYYY-MM-DD');
					// }
							
            		return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: formattedCompareValue,
		           		enddate			: formattedEndDate,
                        value 			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
	           		};
				
				break;
                case 'STRING':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
                        value 			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
	           		};
				break;
                case 'REFERENCE':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
                        value 			: value,//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color'),
		           		comparedisplay	: $row.find('.comparedisplay').val()
	           		};
				break;
				case 'NUMBER':
					return {
						operator 		: $row.find('.operator').val(),
						comparevalue	: $row.find('.comparevalue').val(),
						toVal			: $row.find('.toVal').val(),
                        value			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
					};
				break;
				case 'PHONE':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
                        value 			: value//$row.find(markerTypePreview).css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find(markerTypePreview).attr('data-color')
	           		};
				break;
				
            }
        },
        
        //quickfill for supported types
        quickfill: function (options) {
       		var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
            var currencyQuickFill;
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';
        		currencyQuickFill = '.shapemarkergrid-quickfill';
        	} else if(this.gridType == 'colors')
            { 
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                currencyQuickFill = '.colormarkergrid-quickfill';
            }
        	//remove existing rows if needed
        	if (options.replace) {
        		this.tableEl.find(markerGridRow + ':not(.other)').remove();
        	}
        	
        	switch (this.baseType())
        	{
        		case 'NUMBER':
                    // if(options.addRow)
                    // {
                    //     if(this.gridType == 'shapes'){
                    //         this.addRow({ rule: { operator: 'currency', comparevalue: '', toVal: '', value: 'Marker' } });
                    //     }
                    //     else if(this.gridType == 'colors'){
                    //         this.addRow({ rule: { operator: 'currency', comparevalue: '', toVal: '', value: '#00FF00' } });
                    //     }
                    // }
                    // else
                    // {
                        var $quickfill = this.el.find(currencyQuickFill);
                        var fromVal = parseFloat($quickfill.find('.numberval.from').val().replace(/,/g, ''));
                        var toVal = parseFloat($quickfill.find('.numberval.to').val().replace(/,/g, ''));
                        var divisions = parseInt($quickfill.find('.divisions').val());
                        var stepVal = (toVal - fromVal) / divisions;
                        
                        var precision = $quickfill.find('.numberval.from').val().indexOf('.') == -1 ? 0 : $quickfill.find('.numberval.from').val().length - $quickfill.find('.numberval.from').val().indexOf('.') - 1;
                        var precisionStepVal = 1;
                        if (precision > 0) {
                            var precisionStepVal = '0.';
                            while (precisionStepVal.length < precision + 1) {
                                precisionStepVal += '0';
                            }
                            precisionStepVal = parseFloat(precisionStepVal + '1');
                        }
                        
                        //make sure the precision step val won't cause us to go over the toVal
                        while ((stepVal + precisionStepVal) * divisions > toVal) {
                            stepVal -= precisionStepVal;
                        }
                        
                        var currentVal = parseFloat(fromVal.toFixed(precision));
                        for (var i = 0; i < divisions; i++) {
                            var nextVal = i + 1 == divisions ? toVal : parseFloat((currentVal + stepVal).toFixed(precision));
                            
                            if(this.gridType == 'shapes'){
                                this.addRow({ rule: { operator: 'currency', comparevalue: currentVal.toFixed(precision), toVal: nextVal.toFixed(precision), value: 'Marker' } });
                            }
                            else if(this.gridType == 'colors'){
                                this.addRow({ rule: { operator: 'currency', comparevalue: currentVal.toFixed(precision), toVal: nextVal.toFixed(precision), value: '#00FF00' } });
                            }
                            currentVal = nextVal + precisionStepVal;
                        }
                    //}
        		break;
        	}
        	
        	//sort if new rows were added
        	if (!options.replace) {
        		this.sort({ target: this.el.find('.markergrid-sort').data('sortDir', 'ASC') });
        	}
        
        },
        
        //sort for supported types
        sort: function (options) {//
        	var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
        
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';        
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
            }
        	
        	switch (this.baseType())
        	{
        		case 'NUMBER':
        		
        			if ($(options.target).data('sortDir') == 'DESC')
              		{
               			this.tableEl.find(markerGridRow).sortElements(function(a, b){
			            	if ($(a).find('.comparevalue').val() == '') {
			            		return 1;
			            	}
		            		else if($(b).find('.comparevalue').val() == '') {
		            			 return -1;
		            		}
		            		else {
						    	return parseInt($(a).find('.comparevalue').val().replace(/,/g, '')) < parseInt($(b).find('.comparevalue').val().replace(/,/g, '')) ? 1 : -1;
							}
						});
						$(options.target).data('sortDir', 'ASC');
                    }
                    else
                    {
						this.tableEl.find(markerGridRow).sortElements(function(a, b){
			            	if ($(a).find('.comparevalue').val() == '') {
			            		return -1;
			            	}
		            		else if($(b).find('.comparevalue').val() == '') {
		            			 return 1;
		            		}
		            		else {
						    	return parseInt($(a).find('.comparevalue').val().replace(/,/g, '')) > parseInt($(b).find('.comparevalue').val().replace(/,/g, '')) ? 1 : -1;
							}
						});
						$(options.target).data('sortDir', 'DESC');
					}
        		
        		break;
        	}
        },
        
        //dynamically select options
        dynamicallyAssign: function (options) {
            var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
        	var thisGridType = this.gridType;
            
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';        
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                
            }
            options = $.extend({
                dimension: 'all'
            }, options);

        	this.tableEl.find(markerGridRow).each(function () {
        	    
                var shapeKeys = $.map(MAMarkerBuilder.shapes, function (markerShape, key) { return $.inArray('dynamic', markerShape.types) == -1 ? null : key; });
                var shape = (options.dimension == 'all' || options.dimension == 'shape') ? shapeKeys[Math.floor(Math.random() * shapeKeys.length)] : ($(this).find(markerTypePreview).attr('data-color').split(':')[1] || 'Marker');
                var color = (options.dimension == 'all' || options.dimension == 'color') ? randomHexColorCode() : $(this).find(markerTypePreview).attr('data-color').split(':')[0];
		    	
		    	if(thisGridType == 'shapes'){
		    	   
		    	    $(this).find(markerTypePreview).attr('data-color', color+':'+shape).html(MAMarkerBuilder.createSVG({ color: color+':'+shape, forLegend: true }));
		    	} else if(thisGridType == 'colors'){
		    	   
		    	     $(this).find(markerTypePreview).attr('data-color', '#00FF00:Marker').html('<div class="top-row-button colorTest" data-color="' + color + '" style="background-color:' + color + '"></div>');
		    	}
		                             
		    	var $imageOptions = $(this).find('.markertype-image option');
                var image = (options.dimension == 'all' || options.dimension == 'image') ? $($imageOptions.get(Math.floor(Math.random() * $imageOptions.length))).attr('value') : $(this).find('.markertype-image').val();
		   		$(this).find('.markertype-image').val(image).next().find('input').val($(this).find('.markertype-image option:selected').text());
		   	}); 
        },
        
        //get/set color assignments
        colorAssignments: function (options) {
            var markerGridHeader;
        	var markerGridRow;
        	var markerTypePreview;
        
        	if(this.gridType == 'shapes')
        	{
            	markerGridHeader = '.shapemarkergrid-header';
            	markerGridRow = '.shapemarkergrid-row';
        		markerTypePreview = '.markertype-shape-preview';        
        	} else if(this.gridType == 'colors')
            {
                markerGridHeader = '.colormarkergrid-header';
            	markerGridRow = '.colormarkergrid-row';
        		markerTypePreview = '.markertype-colorpicker-preview';
                
            }
        	var grid = this;
        	return grid.tableEl.find(markerGridRow).map(function (index, row) {
        		return grid.rowToColorAssignment($(row));
        	}).get();
        }

    });

    /***********************************************
    *   Marker Grids
    ***********************************************/

    //object
    var MarkerGrid = function (opts) {
        //defaults
        $.extend(this, {
            el: $('<div class="slds-p-around_x-small markergrid-wrapper"></div>'),
            tableEl: null,
            type: null,
            picklistOptions: []
        }, opts);

        //build grid element
        this.redraw();
    };

    //methods
    $.extend(MarkerGrid.prototype, {
        
        //type metadata
        types: {
            'BOOLEAN'       : { baseType: 'PICKLIST' },
            'PICKLIST'      : { baseType: 'PICKLIST' },
            'MULTIPICKLIST' : { baseType: 'MULTIPICKLIST' },
            'DATE'          : { baseType: 'DATE' },
            'DATETIME'      : { baseType: 'DATE' },
            'STRING'        : { baseType: 'STRING' },
            'TEXTAREA'      : { baseType: 'STRING' },
            'URL'           : { baseType: 'STRING' },
            'COMBOBOX'      : { baseType: 'STRING' },
            'REFERENCE'     : { baseType: 'REFERENCE' },
            'ID'            : { baseType: 'REFERENCE' },
            'CURRENCY'      : { baseType: 'NUMBER' },
            'INTEGER'       : { baseType: 'NUMBER' },
            'DOUBLE'        : { baseType: 'NUMBER' },
            'PERCENT'       : { baseType: 'NUMBER' },
            'PHONE'         : { baseType: 'PHONE' }    
        },

        //get/set type
        type: function (type) {
           
            if (type) {
                this.type = type;
                return this.redraw();
            }
            else {
                return this.type;
            }
        },

        //get base type
        baseType: function () {
            return this.types[this.type].baseType;
        },

        //redraw the grid based on type
        redraw: function () {//
            //remove existing content
            this.el.empty();

            //add quickfill options
            this.el.append($('.markergrid-quickfill[data-type="'+this.baseType()+'"]').clone());
			this.el.find('.markergrid-quickfill .numberval').blur(function() {
				$(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1 });
			})
			.on('keyup change', function(e) {
				var e = window.event || e;
				var keyUnicode = e.charCode || e.keyCode;
				if (e !== undefined) {
					switch (keyUnicode) {
						case 16: break; // Shift
						case 17: break; // Ctrl
						case 18: break; // Alt
						case 27: this.value = ''; break; // Esc: clear entry
						case 35: break; // End
						case 36: break; // Home
						case 37: break; // cursor left
						case 38: break; // cursor up
						case 39: break; // cursor right
						case 40: break; // cursor down
						case 78: break; // N (Opera 9.63+ maps the "." from the number key section to the "N" key too!) (See: http://unixpapa.com/js/key.html search for ". Del")
						case 110: break; // . number block (Opera 9.63+ maps the "." from the number block to the "N" key (78) !!!)
						case 190: break; // .
						default: $(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1});
					}
				}
			});
            
            //parse color assignments
			var colorAssignmentMap = {};
			try {
			    
				var colorAssignmentRules = JSON.parse(query.colorAssignment);
				
            	$.each(colorAssignmentRules, function (index, rule) {
                	colorAssignmentMap['cv' + rule.comparevalue] = rule;
                });
            }
            catch (err) {
        		$.each((query.colorAssignment || '').split('~~'), function (index, colorAssignment) {
      				if (colorAssignment != '') {
      					var assignmentParts = colorAssignment.split('~');
      					colorAssignmentMap[assignmentParts[0]] = { value: assignmentParts[1] };
      				}
      			});
            }
            
            //add grid
            var $table = this.tableEl = $('<table class="markergrid" />').appendTo(this.el);
            $table.append($('.markergrid-header[data-type="'+this.baseType()+'"]').clone());
            
            //init headers
            $table.find('.markergrid-header .markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
            
            //handlers
            $table.find('.color-dynamicallyassign').click(function () { grid.dynamicallyAssign({ dimension: $(this).attr('data-dimension') || 'all' }); });
            $table.on('click', '.add-row-icon', function () {  grid.addRow({ target: this }); });
            $table.on('click', '.remove-row', function () {  $(this).closest('.markergrid-row').remove(); });
            
            //add rows
            var grid = this; //
            
            if (this.baseType() == 'PICKLIST')
            {
            	//picklists are a special case because we need to populate a row for each option even for a new grid
                var grid = this;
                $.each(grid.picklistOptions || [], function (index, option) {
                    grid.addRow({ comparevalue: option.itemValue,comparelabel: option.itemLabel });
                });
                
                if(this.type != 'BOOLEAN') {
                grid.addRow({ comparevalue: '<Other>' }).tableEl.find('.markergrid-row').last().addClass('other');
                }   
                //update the colors based on the existing query if we have one
                if (this.needToUpdate && Object.keys(colorAssignmentMap).length > 0) 
				{   
					//assign color values
					this.tableEl.find('.markergrid-row').each(function()
					{
						//changing from using text to value, case 00015889
						//var text = $(this).find('.comparevalue').text();
						var text = 'cv' + $(this).find('.comparevalue').attr('value');
						var color = (colorAssignmentMap[text] || { value:'#00FF00:Marker' }).value;
						if(color.indexOf('image') == 0)
						{
							var imageval = color.split('image:')[1];
							$(this).find('.markertype-image').val(imageval);
							$(this).find('.markertype-image').next().find('input').val($(this).find('.markertype-image option:selected').first().text());
							$(this).find('.markertype-wrapper > .markertype-color-preview').hide();
							$(this).find('.markertype-wrapper > .ui-combobox').show();
						}
						else
						{
                            $(this).find('.markertype-color-preview').attr('data-color', color).html(MAMarkerBuilder.createSVG({ color: color, forLegend: true }));
						}
					});
					
					query.colorAssignment = null;
		        }
            }
			else if (this.needToUpdate && Object.keys(colorAssignmentMap).length > 0) 
			{
                //create a row for each existing rule
            	$.each(colorAssignmentMap, function (index, rule) {
                    grid.addRow({ rule: rule });
                });
                
                query.colorAssignment = null;
            }
            else 
            {
            	//just create a blank row and the <Other> row
               	grid.addRow({});
               	grid.addRow({ rule: { comparedisplay: '<Other>', comparevalue: '<Other>', value: '#00FF00' } });
            }
        },

        //add a row to the marker grid
        addRow: function (options) {
        
        	//create row
        	var $row = $('#savedqueryeditor-templates .markergrid-row[data-type="'+this.baseType()+'"]').clone();
        	if (options.target && $(options.target).closest('tr').is('.markergrid-row')) {
        		$row.insertAfter($(options.target).closest('tr'));
        	}
        	else if (this.tableEl.find('.markergrid-row.other').length > 0) {
        		$row.insertBefore(this.tableEl.find('.markergrid-row.other'));
        	}
        	else {
        		$row.appendTo(this.tableEl);
        	}

            switch (this.baseType())
            {
                //Bryan James Changing for label and values on picklists
                case 'PICKLIST':
                	$row.find('.comparevalue').text(options.comparelabel || options.comparevalue).attr('value',options.comparevalue);
                    //$row.find('.comparevalue').text(options.comparelabel || options.comparevalue).attr('comparevalue',options.comparevalue);
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                break;
                case 'MULTIPICKLIST':
                
                	//update row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //add picklist options
                    $.each(this.picklistOptions, function (index, option) {
                    	$row.find('.comparevalue').append($('<option>', { value : option.itemValue }).text(option.itemLabel)); 
                    });
					$row.find('.comparevalue').multiselect({ noneSelectedText: 'Click here to select options', selectedList: 2 }).multiselectfilter().multiselect('uncheckAll');
					
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue option').remove();
							$row.find('.comparevalue').append($('<option></option>').attr('value', '<Other>').text('--Other--'));
							$row.find('.comparevalue').multiselect('refresh').multiselect('checkAll');
             				$row.find('.comparevalue').multiselect('disable');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							
							var selectedOptions = options.rule.comparevalue.split('~~');
							for (var i in selectedOptions) {
                                if (selectedOptions.hasOwnProperty(i)) {
								   $row.find('.comparevalue').multiselect('widget').find('input[value="'+selectedOptions[i]+'"]').click();
                                }
							}
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
                break;
                case 'DATE':
                
                	//create row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //init datepickers
                    var formatedDate = formatUserLocaleDate({
		            	datepicker	: true,
		            	salesforce	: false,
		            	moment		: false
		            });
					$row.find('.comparevalue, .enddate').removeAttr('disabled').val('').datepicker({
						dateFormat: formatedDate,
                        defaultDate: "-8w",
                        numberOfMonths: 3,
                        showOn: "button",
		                buttonImage: imageRefs.calendar,
		                buttonImageOnly: true,
		                constrainInput: false,
                        onClose: function( selectedDate ) {
                           	if ($(this).is('.comparevalue')) {
								$row.find('.enddate').datepicker( "option", "minDate", selectedDate );
							}
							else {
								$row.find('.comparevalue').datepicker( "option", "maxDate", selectedDate );
							}
						}
                    })
                    .autocomplete({
                        minLength: 0,
	                    source: MADateLiterals,
	                    focus: function (event, ui) {
	                        return false;
	                    },
	                    select: function( event, ui ) {
	                        $(this).val(ui.item.label);    
	                        return false;
	                    }
                	});
					
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.enddate').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
							$row.find('.ui-datepicker-trigger').hide();
							$row.find('.dateliteralpicker').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							
							var formatedDate = formatUserLocaleDate({ datepicker: true }).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
							var formatCompareValue;
							var formatEndDate;
							var comparevalueIsDateLiteral = false;
							var enddateIsDateLiteral = false;
									
							//check for date literals
		            		for (var i in MADateLiterals)
		                    {
                                if (MADateLiterals.hasOwnProperty(i))
                                {
			                        //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
			                        if (MADateLiterals[i].label == options.rule.comparevalue && MADateLiterals[i].value != 'DYNAMIC')
			                        {
			                        	formatCompareValue = options.rule.comparevalue;
			                        	comparevalueIsDateLiteral = true;
			                        	
			                        }
			                        if (MADateLiterals[i].label == options.rule.enddate && MADateLiterals[i].value != 'DYNAMIC')
			                        {
			                        	formatEndDate = options.rule.enddate;
			                        	enddateIsDateLiteral = true;
			                        }
                                }
		                    }
									
							//check if the from value is a dynamic date literal
		                    try {
		                        var stringParts = options.rule.comparevalue.split(' ');
		                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
		                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
		                        		formatCompareValue = options.rule.comparevalue;
		                        		comparevalueIsDateLiteral = true;
				                    }
				                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                        if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                            formatCompareValue = options.rule.comparevalue;
		                        		    comparevalueIsDateLiteral = true;
                                        }
                                    }
		                        }
		                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
		                        	var stringPartsValue = parseInt(stringParts[0]);
		                        	var stringPartsUnit = stringParts[1].toLowerCase();
		                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
		                        		formatCompareValue = options.rule.comparevalue;
		                        		comparevalueIsDateLiteral = true;
		                        	}
			                    }
		                    }
		                    catch (err) { }
				                    
		                    //check if the to value is a dynamic date literal
		                    try {
		                        var stringParts = options.rule.enddate.split(' ');
		                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
		                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'WEEKS', 'MONTHS']) != -1) {
		                        		enddateIsDateLiteral = true;
		                        		formatEndDate = options.rule.enddate;
				                    }
				                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                        if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                            enddateIsDateLiteral = true;
		                        		    formatEndDate = options.rule.enddate;
                                        }
                                    }
		                        }
		                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
		                        	var stringPartsValue = parseInt(stringParts[0]);
		                        	var stringPartsUnit = stringParts[1].toLowerCase();
		                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
		                        		enddateIsDateLiteral = true;
		                        		formatEndDate = options.rule.enddate;
		                        	}
			                    }
		                    }
		                    catch (err) { }
									
							//format date to display correct user locale
							//if(enddateIsDateLiteral != true || comparevalueIsDateLiteral != true)
							if(enddateIsDateLiteral != true)
							{
								formatEndDate = moment(options.rule.enddate,'YYYY-MM-DD').format(formatedDate);
							}
							if (comparevalueIsDateLiteral != true)
							{
								formatCompareValue = moment(options.rule.comparevalue,'YYYY-MM-DD').format(formatedDate);
							}
							//populate
							$row.find('.comparevalue').val(formatCompareValue);
							$row.find('.enddate').val(formatEndDate);
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
                break;
                case 'STRING':
                
                	//create row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.operator').attr('disabled', 'disabled');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
					
                break;
               	case 'REFERENCE':
               		
               		//create row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                  
                    //handle autocomplete of related records
                    $row.find('.comparedisplay').autocomplete({
		            	source: function (request, response) {
				            var searchTerm = request.term;
						     /**March Release 2016*/
						    var fieldName = $row.parent().closest('tr').find('.color-picklistfield option:selected').attr('data-lookup') == 'lookup' ? $row.parent().closest('tr').find('.color-picklistparentfield').val() : $row.parent().closest('tr').find('.color-picklistfield').val();
			             	var queryBaseObject = $row.parent().closest('tr').find('.color-picklistfield option:selected').attr('data-lookup') == 'lookup' ? $row.parent().closest('tr').find('.color-picklistparentfield').attr('data-currentbaseobject') : query.baseObject;
                            var processData = {
                                ajaxResource : 'QueryBuilderAPI',
                                
                                action: 'getLookupOptions',
                                baseObject	: queryBaseObject,
                                term		: searchTerm,
                                fieldName	: fieldName
                            };
                            
                            //ADDED LOADING SPINNER
                            showLoading($('#queryeditor-modal'),'loading');
                            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                                processData,
                                function(lookupOptionsResponse, event){
                                    //CLOSED LOADING SPINNER
                                    hideMessage($('#queryeditor-modal'));
                                    if(event.status) {
                                        var options = [];
                                        $.each(lookupOptionsResponse.data, function (index, data) {	
                                            options.push({
                                                label: data.Name,
                                                value: data.Id
                                            });
                                        });
                                        
                                        response(options);
                                    }
                                    else {
                                        response([]);
                                    }
                                },{buffer:false,escape:false}
                            );
			            },
			            minLength: 2,
			            select: function( event, ui) {
			            	$(this).closest('.markergrid-row').find('.searchText').val(ui.item.label);
			            	$(this).closest('.markergrid-row').find('.valueText').val(ui.item.value);
			            	return false;
			            },
			            focus: function( event, ui) {
				            $(this).closest('.markergrid-row').find('.searchText').val(ui.item.label);
				            $(this).closest('.markergrid-row').find('.valueText').val(ui.item.value);
				            return false;
						}
		            });
                    
					//populate
					if (options.rule) {
						if(options.rule.comparedisplay == '<Other>') {
							$row.addClass('other');
							$row.find('.comparedisplay').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
                            $row.find('.comparevalue').val('<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.comparedisplay').val(options.rule.comparedisplay);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
					
               	break;
               	case 'NUMBER':
               	
               		//create row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //init currency mask
                    $row.find('.numberval').blur(function() {
						$(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1 });
					})
					.on('keyup change', function(e) {
						var e = window.event || e;
						var keyUnicode = e.charCode || e.keyCode;
						if (e !== undefined) {
							switch (keyUnicode) {
								case 16: break; // Shift
								case 17: break; // Ctrl
								case 18: break; // Alt
								case 27: this.value = ''; break; // Esc: clear entry
								case 35: break; // End
								case 36: break; // Home
								case 37: break; // cursor left
								case 38: break; // cursor up
								case 39: break; // cursor right
								case 40: break; // cursor down
								case 78: break; // N (Opera 9.63+ maps the "." from the number key section to the "N" key too!) (See: http://unixpapa.com/js/key.html search for ". Del")
								case 110: break; // . number block (Opera 9.63+ maps the "." from the number block to the "N" key (78) !!!)
								case 190: break; // .
								default: $(this).formatCurrency({negativeFormat: '-%s%n', roundToDecimalPlace: -1});
							}
						}
					});
                    
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.toVal').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.comparevalue').val(options.rule.comparevalue).change();
							$row.find('.toVal').val(options.rule.toVal).change();
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
               	
               	break;
               	case 'PHONE':
               	
               		//create row
                    $row.find('.markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
                    $row.find('.markertype-image').combobox();
                    $row.find('.markertype-wrapper > .ui-combobox').hide();
                    
                    //input mask for phone values
                    $row.find('.comparevalue').mask('(999) 999-9999');
                    
					//populate
					if (options.rule) {
						if(options.rule.comparevalue == '<Other>') {
							$row.addClass('other');
							$row.find('.operator').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.comparevalue').val('<Other>').attr('disabled', 'disabled').attr('val', '<Other>');
							$row.find('.remove-row').hide();
						}
						else {
							$row.find('.operator').val(options.rule.operator);
							$row.find('.comparevalue').val(options.rule.comparevalue);
						}
						
						if(options.rule.value.indexOf('image') == 0) {
							$row.find('.markertype-selector-image').click();
							$row.find('.markertype-image').val(options.rule.value.split('image:')[1]).next().find('input').val($row.find('.markertype-image option:selected').first().text());
							$row.find('.markertype-wrapper > .markertype-color-preview').hide();
							$row.find('.markertype-wrapper > .ui-combobox').show();
						}
						else {
							$row.find('.markertype-color-preview').attr('data-color', options.rule.value).html(MAMarkerBuilder.createSVG({ color: options.rule.value, forLegend: true }));
						}
					}
               	
               	break;
            }

            return this;
        },
        
        rowToColorAssignment: function ($row) {
        	switch (this.baseType())
            {
                case 'PICKLIST':
                    return {
						operator		: $row.find('.operator').val(),
						comparevalue	: $row.find('.comparevalue').attr('value'),//text(),
						value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
					};
				break;
				case 'MULTIPICKLIST':
					var selectedOptions = [];
					if($row.find('.comparevalue').val() != '<Other>') {
						$row.find('.comparevalue').multiselect('widget').find('input[type="checkbox"]:checked').each(function () { selectedOptions.push($(this).attr('value'))});
					}
            		
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val() == '<Other>' ? $row.find('.comparevalue').val() : selectedOptions.join('~~'),
		           		value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
		           	};
				break;
				case 'DATE':
				
					//capatalize for moment
            		var formatedDate = formatUserLocaleDate({datepicker	: true}).replace('mm','MM').replace('dd','DD').replace('yy','YYYY');
		            		
            		var comparevalueIsDateLiteral = false;
            		var enddateIsDateLiteral = false;
		            		
            		//check for date literals
            		for (var i in MADateLiterals)
                    {
                        if (MADateLiterals.hasOwnProperty(i))
                        {
	                        //check if the label matches and the value is not blank (blank value denotes a dynamic date literal and cannot be matched directly)
	                        if (MADateLiterals[i].label == $row.find('.comparevalue').val())
	                        {
	                        	comparevalueIsDateLiteral = true;
	                        	
	                        }
	                        if (MADateLiterals[i].label == $row.find('.enddate').val())
	                        {
	                        	enddateIsDateLiteral = true;
	                        	
	                        }
                        }
                    }
		                    
                    //check if the from value is a dynamic date literal
                    try {
                        var stringParts = $row.find('.comparevalue').val().split(' ');
                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                        		comparevalueIsDateLiteral = true;
		                    }
		                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    comparevalueIsDateLiteral = true;
                                }
                            }
                        }
                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
                        	var stringPartsValue = parseInt(stringParts[0]);
                        	var stringPartsUnit = stringParts[1].toLowerCase();
                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
                        		comparevalueIsDateLiteral = true;
                        	}
	                    }
                    }
                    catch (err) { }
		                    
                    //check if the to value is a dynamic date literal
                    try {
                        var stringParts = $row.find('.enddate').val().split(' ');
                        if (stringParts[0] == 'NEXT' || stringParts[0] == 'LAST') {
                        	if (!isNaN(parseInt(stringParts[1])) && stringParts.length == 3 && $.inArray(stringParts[2], ['DAYS', 'QUARTERS', 'YEARS', 'MONTHS', 'WEEKS']) != -1) {
                        		enddateIsDateLiteral = true;
		                    }
		                    else if (stringParts.length == 4 && stringParts[2] == 'FISCAL') {
                                if (stringParts[3] == 'QUARTERS' || stringParts[3] == 'YEARS') {
                                    enddateIsDateLiteral = true;
                                }
                            }
                        }
                        else if (stringParts[2] == 'AGO' || stringParts[2] == 'FROM') {
                        	var stringPartsValue = parseInt(stringParts[0]);
                        	var stringPartsUnit = stringParts[1].toLowerCase();
                        	if (!isNaN(stringPartsValue) && $.inArray(stringPartsUnit, ['days', 'years']) != -1) {
                        		enddateIsDateLiteral = true;
                        	}
	                    }
                    }
                    catch (err) { }
		                    
                    //format to utc for storage skip other
                    var formattedCompareValue;
                    var formattedEndDate;
                    
                    // allowing for date and date literals to be saved together now
                    if($row.find('.comparevalue').val() == '<Other>' || $row.find('.enddate').val() == '<Other>')
                    {
                        formattedCompareValue = $row.find('.comparevalue').val();
                        formattedEndDate = $row.find('.enddate').val();
                    }
                    else {
                        if(comparevalueIsDateLiteral == true) {
                            formattedCompareValue = $row.find('.comparevalue').val();
                        }
                        else {
                            formattedCompareValue = moment($row.find('.comparevalue').val(),formatedDate).format('YYYY-MM-DD');
                        }
                        if (enddateIsDateLiteral == true) {
                            formattedEndDate = $row.find('.enddate').val();
                        }
                        else {
                            formattedEndDate = moment($row.find('.enddate').val(),formatedDate).format('YYYY-MM-DD');
                        }
                    }


                    // old code, could not combine literals and dates
                    // if(comparevalueIsDateLiteral == true || enddateIsDateLiteral == true)
                    // {
                    // 	var formattedCompareValue = $row.find('.comparevalue').val();
					// 	var formattedEndDate = $row.find('.enddate').val();
                    // }
            		// else if($row.find('.comparevalue').val() == '<Other>' || $row.find('.enddate').val() == '<Other>')
            		// {
            		// 	var formattedCompareValue = $row.find('.comparevalue').val();
					// 	var formattedEndDate = $row.find('.enddate').val();
					// }
					// else
					// {
					// 	var formattedCompareValue = moment($row.find('.comparevalue').val(),formatedDate).utc().format('YYYY-MM-DD');
					// 	var formattedEndDate = moment($row.find('.enddate').val(),formatedDate).utc().format('YYYY-MM-DD');
					// }
							
            		return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: formattedCompareValue,
		           		enddate			: formattedEndDate,
		           		value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
	           		};
				
				break;
				case 'STRING':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
		           		value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
	           		};
				break;
				case 'REFERENCE':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
		           		value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color'),
		           		comparedisplay	: $row.find('.comparedisplay').val()
	           		};
				break;
				case 'NUMBER':
					return {
						operator 		: $row.find('.operator').val(),
						comparevalue	: $row.find('.comparevalue').val(),
						toVal			: $row.find('.toVal').val(),
						value			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
					};
				break;
				case 'PHONE':
					return {
		           		operator 		: $row.find('.operator').val(),
		           		comparevalue	: $row.find('.comparevalue').val(),
		           		value 			: $row.find('.markertype-color-preview').css('display') == 'none' ? 'image:' + $row.find('.markertype-image').val() : $row.find('.markertype-color-preview').attr('data-color')
	           		};
				break;
            }
        },
        
        //quickfill for supported types
        quickfill: function (options) {
        
        	//remove existing rows if needed
        	if (options.replace) {
        		this.tableEl.find('.markergrid-row:not(.other)').remove();
        	}
        	
        	//add rows based on type
        	switch (this.baseType())
        	{
        		case 'NUMBER':
                    // if(options.addRow)
                    // {
                    //     if(this.gridType == 'shapes'){
                    //         this.addRow({ rule: { operator: 'currency', comparevalue: '', toVal: '', value: 'Marker' } });
                    //     }
                    //     else if(this.gridType == 'colors'){
                    //         this.addRow({ rule: { operator: 'currency', comparevalue: '', toVal: '', value: '#00FF00' } });
                    //     }
                    // }
                    // else
                    // {
                        var $quickfill = this.el.find('.markergrid-quickfill');
                        var fromVal = parseFloat($quickfill.find('.numberval.from').val().replace(/,/g, ''));
                        var toVal = parseFloat($quickfill.find('.numberval.to').val().replace(/,/g, ''));
                        var divisions = parseInt($quickfill.find('.divisions').val());
                        var stepVal = (toVal - fromVal) / divisions;
                        
                        var precision = $quickfill.find('.numberval.from').val().indexOf('.') == -1 ? 0 : $quickfill.find('.numberval.from').val().length - $quickfill.find('.numberval.from').val().indexOf('.') - 1;
                        var precisionStepVal = 1;
                        if (precision > 0) {
                            var precisionStepVal = '0.';
                            while (precisionStepVal.length < precision + 1) {
                                precisionStepVal += '0';
                            }
                            precisionStepVal = parseFloat(precisionStepVal + '1');
                        }
                        
                        //make sure the precision step val won't cause us to go over the toVal
                        while ((stepVal + precisionStepVal) * divisions > toVal) {
                            stepVal -= precisionStepVal;
                        }
                        
                        var currentVal = parseFloat(fromVal.toFixed(precision));
                        for (var i = 0; i < divisions; i++) {
                            var nextVal = i + 1 == divisions ? toVal : parseFloat((currentVal + stepVal).toFixed(precision));
                            this.addRow({ rule: { operator: 'currency', comparevalue: currentVal.toFixed(precision), toVal: nextVal.toFixed(precision), value: '#00FF00' } });
                            currentVal = nextVal + precisionStepVal;
                        }
                   // }
        		break;
        	}
        	
        	//sort if new rows were added
        	if (!options.replace) {
        		this.sort({ target: this.el.find('.markergrid-sort').data('sortDir', 'ASC') });
        	}
        
        },
        
        //sort for supported types
        sort: function (options) {//
            
            
        	switch (this.baseType())
        	{
        		case 'NUMBER':
        		
        			if ($(options.target).data('sortDir') == 'DESC')
              		{
               			this.tableEl.find('.markergrid-row').sortElements(function(a, b){
			            	if ($(a).find('.comparevalue').val() == '') {
			            		return 1;
			            	}
		            		else if($(b).find('.comparevalue').val() == '') {
		            			 return -1;
		            		}
		            		else {
						    	return parseInt($(a).find('.comparevalue').val().replace(/,/g, '')) < parseInt($(b).find('.comparevalue').val().replace(/,/g, '')) ? 1 : -1;
							}
						});
						$(options.target).data('sortDir', 'ASC');
                    }
                    else
                    {
						this.tableEl.find('.markergrid-row').sortElements(function(a, b){
			            	if ($(a).find('.comparevalue').val() == '') {
			            		return -1;
			            	}
		            		else if($(b).find('.comparevalue').val() == '') {
		            			 return 1;
		            		}
		            		else {
						    	return parseInt($(a).find('.comparevalue').val().replace(/,/g, '')) > parseInt($(b).find('.comparevalue').val().replace(/,/g, '')) ? 1 : -1;
							}
						});
						$(options.target).data('sortDir', 'DESC');
					}
        		
        		break;
        	}
        },
        
        //dynamically select options
        dynamicallyAssign: function (options) {
            options = $.extend({
                dimension: 'all'
            }, options);

        	this.tableEl.find('.markergrid-row').each(function () {
                var shapeKeys = $.map(MAMarkerBuilder.shapes, function (markerShape, key) { return $.inArray('dynamic', markerShape.types) == -1 ? null : key; });
                var shape = (options.dimension == 'all' || options.dimension == 'shape') ? shapeKeys[Math.floor(Math.random() * shapeKeys.length)] : ($(this).find('.markertype-color-preview').attr('data-color').split(':')[1] || 'Marker');
                var color = (options.dimension == 'all' || options.dimension == 'color') ? randomHexColorCode() : $(this).find('.markertype-color-preview').attr('data-color').split(':')[0];
		    	$(this).find('.markertype-color-preview').attr('data-color', color+':'+shape).html(MAMarkerBuilder.createSVG({ color: color+':'+shape, forLegend: true }));
		                             
		    	var $imageOptions = $(this).find('.markertype-image option');
                var image = (options.dimension == 'all' || options.dimension == 'image') ? $($imageOptions.get(Math.floor(Math.random() * $imageOptions.length))).attr('value') : $(this).find('.markertype-image').val();
		   		$(this).find('.markertype-image').val(image).next().find('input').val($(this).find('.markertype-image option:selected').text());
		   	}); 
        },
        
        //get/set color assignments
        colorAssignments: function (options) {
        	var grid = this;
        	return grid.tableEl.find('.markergrid-row').map(function (index, row) {
        		return grid.rowToColorAssignment($(row));
        	}).get();
        }

    });
    
    /***********************
    * Related Lists
    ************************/
    function RelatedList_Add()
    {
    	var relatedListParts = $(this).val().split('~~');
    	if (relatedListParts[0] != '--') {
    		var $MarkerLayerRelatedList = $('#savedqueryeditor-templates .MarkerLayerRelatedList-row').clone().insertBefore('#MarkerLayerRelatedList-watermark').data({ crossObjectName: relatedListParts[0], crossObjectFieldName: relatedListParts[1] });
    		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label').text($(this).find('option:selected').text());
    		RelatedList_Update($MarkerLayerRelatedList);
    	}
    	
    	setTimeout(function () {
            $('#MarkerLayerRelatedList-addnew-object').val('--').next().find('input').val('--'+MASystem.Labels.MA_Add_New+'--');
            $('#select2-MarkerLayerRelatedList-addnew-object-container').text('--'+MASystem.Labels.MA_Add_New+'--');
    	}, 500);
    }
    
    function RelatedList_EditLabel($MarkerLayerRelatedList)
    {
    	var $label = $MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label');
    	if (!$label.is('editing')) {
        	var label = $label.is('.watermark') ? '' : $label.text();
        	$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label').empty().append($('<input class="MarkerLayerRelatedList-label-input" />').val(label)).removeClass('watermark').addClass('editing');
        	$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label-input').select().on('blur', function () {
        		$label.text($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label-input').val().trim()).removeClass('editing');
        		if ($label.text() == '') {
        			$label.text('Click to add a label').addClass('watermark');
        		}
        	});
        }
    }
    
    function RelatedList_Update($MarkerLayerRelatedList, MarkerLayerRelatedList)
    {
    	//create comboboxes
    	$MarkerLayerRelatedList.find('.combobox').select2();
    	$('.MarkerLayerRelatedList-numtodisplay-wrapper .ui-autocomplete-input:first').width(40);
    	$('.MarkerLayerRelatedList-numtodisplay-wrapper .ui-autocomplete-input:last').width(60);
    
        var processData = {
            ajaxResource : 'QueryBuilderAPI',
            
            action: 'getRelatedList',
            baseObject: query.baseObject,
            crossObjectName: $MarkerLayerRelatedList.data('crossObjectName')
        };
        
        //ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');
        Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
            processData,
            function(response, event){
                //CLOSED LOADING SPINNER
                hideMessage($('#queryeditor-modal'));
                if(event.status) {
                	$MarkerLayerRelatedList.data('columnOptions', response.data.crossObjectFieldOptions);
                	
                	//populate sort options
                    var $orderBy = $MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby').empty();
                    var orderFrag = document.createDocumentFragment();
                	$.each(response.data.crossObjectSortFieldOptions || [], function (index, option) {
                        // create option, add to fragment
                        var opt = document.createElement('option');
                        opt.value = option.itemValue;
                        opt.innerHTML = option.itemLabel;
                        orderFrag.appendChild(opt);
                    });
                    $orderBy[0].appendChild(orderFrag);
                	$orderBy.val('CreatedDate').select2();
                	
                	//select existing values
                	if (MarkerLayerRelatedList)
                	{
                		//basic settings
                		MarkerLayerRelatedList.relatedlistsort = MarkerLayerRelatedList.relatedlistsort || 'CreatedDate DESC';
                		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-numtodisplay').val(MarkerLayerRelatedList.numtodisplay).next().find('input').val(MarkerLayerRelatedList.numtodisplay);
                		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby').val(MarkerLayerRelatedList.relatedlistsort.split(' ')[0]).next().find('input').val($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby option:selected').text()).trigger('change.select2');
                		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby-direction').val(MarkerLayerRelatedList.relatedlistsort.split(' ')[1]).next().find('input').val($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby-direction option:selected').text()).trigger('change.select2');
                        
                        $MarkerLayerRelatedList.find('.MarkerLayerRelatedList-numtodisplay').trigger('change.select2');
                        $MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby').trigger('change.select2');
                		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-orderby-direction').trigger('change.select2');
                		//label
                		
                		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label').text(MarkerLayerRelatedList.relatedlistname);
                		if (MarkerLayerRelatedList.relatedlistname == null) {
                			$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-label').text('Click to add a label').addClass('watermark');
                		}
                		
                		//add columns
                		for (var i = 1; i < 6; i++) {
                			if (MarkerLayerRelatedList['field'+i]) {
                				RelatedList_AddColumn($MarkerLayerRelatedList, MarkerLayerRelatedList['field'+i]);
                			}
                		}
                		
                		//add filters
                		$.each(MarkerLayerRelatedList.filters || [], function (index, filter) {
                			
                			//add new filter
                            var $loader = $('.ajaxload.template').clone().removeClass('template').insertBefore($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-addfilter'))
                            $loader.slideDown(
                            200,
                            function ()
                            {
                                    var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', filter.baseObject);
                                    $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', filter.fieldName));
                                    $newFilter.find('.fieldoptions .combobox').val(filter.fieldName);
                                    $newFilter.find('.parentfieldoptions .combobox').append($("<option></option>").attr('value', filter.parentFieldName));
                                    $newFilter.find('.parentfieldoptions .combobox').val(filter.parentFieldName);
                                    $newFilter.find('.grandparentfieldoptions .combobox').append($("<option></option>").attr('value', filter.grandparentFieldName));
                                    $newFilter.find('.grandparentfieldoptions .combobox').val(filter.grandparentFieldName);
                                    
                                    updateFilter($newFilter, $loader, filter.operator, filter.value, filter.value2);
                                }
                            );

                        });
                    }
                    
                    //populate the first column with the name field if it's not already populated
                    if ($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-column').length == 0) {
                        RelatedList_AddColumn($MarkerLayerRelatedList);
                        $MarkerLayerRelatedList.find('.MarkerLayerRelatedList-column').val(response.data.nameField).change().next().find('input').val($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-column option:selected').text());
                    }
                }
                else if (event.type === 'exception') {
                    //show error
                    MA.log(event.message + '::' + event.where);
                } 
                else {
                    //show error
                    MA.log(event.message);
                }
         	},{buffer:false,escape:false}
        );
    }
    
    function RelatedList_AddColumn($MarkerLayerRelatedList, value)
    {
    	//add column
        var $column = $('<div class="inline relatedColumnWrap" style="margin:2px;"><select style="width:155px;" class="MarkerLayerRelatedList-column"><option value="--">--'+MASystem.Labels.MA_None+'--</option></select></div>');
        var orderFrag = document.createDocumentFragment();
    	$.each($MarkerLayerRelatedList.data('columnOptions'), function (index, option) {
            var opt = document.createElement('option');
            opt.value = option.itemValue;
            opt.innerHTML = option.itemLabel;
            orderFrag.appendChild(opt);
        });
        var $columSelect = $column.find('.MarkerLayerRelatedList-column');
        $columSelect[0].appendChild(orderFrag);
        $column.insertBefore($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-addcolumn'));
    	
    	//populate value if we have one, otherwise use default
    	if (value) {
    		$columSelect.val(value).change();
    	}
    	else {
    		$columSelect.find('option').each(function () {
    			if ($(this).attr('value') == 'Name') {
    				$columSelect.val('Name').change();
    				return false;
    			}
    		});
    		
    		if ($columSelect.val() == '--'+MASystem.Labels.MA_None+'--') {
    			var $firstOption = $columSelect.children(':first').next();
    			$columSelect.val($firstOption.attr('value')).change();
    		}
    	}
    	
    	//handle removing the column when --None-- is selected
    	$columSelect.on('change', function () {
    		if ($(this).val() == '--') {
    			$(this).next().remove();
    			$(this).remove();
    			$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-addcolumn').show();
    		}
    	});
    	
    	//hide the add column link if we already have 5
    	if ($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-column').length >= 5) {
    		$MarkerLayerRelatedList.find('.MarkerLayerRelatedList-addcolumn').hide();
        }
        $columSelect.select2();
    }
    
    function RelatedList_AddFilter($MarkerLayerRelatedList)
    {
    	var baseObject = $MarkerLayerRelatedList.data('crossObjectName');
        var $loader = $('.ajaxload.template').clone().removeClass('template').insertBefore($MarkerLayerRelatedList.find('.MarkerLayerRelatedList-addfilter'));
        $loader.slideDown(
            200,
            function ()
            {
                var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', baseObject);
                updateFilter($newFilter, $loader);
            }
        );
    }
    
    function RelatedList_Move($MarkerLayerRelatedList, direction)
    {
    	if (direction == 'up' && $MarkerLayerRelatedList.prev('.MarkerLayerRelatedList-row').length > 0) {
    		$MarkerLayerRelatedList.insertBefore($MarkerLayerRelatedList.prev());
    	}
    	else if (direction == 'down' && $MarkerLayerRelatedList.next('.MarkerLayerRelatedList-row').length > 0) {
    		$MarkerLayerRelatedList.insertAfter($MarkerLayerRelatedList.next());
    	}
    }
    
    function RelatedList_Remove($MarkerLayerRelatedList)
    {
    	$MarkerLayerRelatedList.remove();
    }
    
    
    
    /********************************************************************************
     * 
     * Functions related to live filter by last report date and time inputs
     * 
     *********************************************************************************/
    
    function initializeLiveReportDateAndTimeInputs()
    {
        // filter by device last report date and time input
        var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
        var $filterByLastReportDateTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDateTime');
        // var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
        // var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
        
        
        // select comboboxes
        // var $dateRangeDropdown = $filterByLastReportDateTimeDiv.find('.date_range');
        // var $timeRangeDropdown = $filterByLastReportTimeDiv.find('.time_range');
        
        // var $timeRelationDropdown = $filterByLastReportTimeDiv.find('.time_relation');
        // var $timeUnitsDropdown = $filterByLastReportTimeDiv.find('.time_units');
        // var $timezoneDropdown = $filterByLastReportDateAndTimeDiv.find('.timezone');
        
        // // date handlers
        // $dateRangeDropdown.change(liveDateRangeChange);
        
        // // time handlers
        // $timeRangeDropdown.change(liveTimeRangeChange);
        
        // date/time handlers
        $filterByLastReportDateTimeDiv.find('.date_time_range').change(liveDateTimeRangeChange);
        
        // turn selects to jquery ui combobox (select2)
        $filterByLastReportDateTimeDiv.find('select').each(function(e) {
            $(this).select2();
        });
        

        // $( $dateRangeDropdown ).select2();
        // $( $timeRangeDropdown ).select2();
        // $( $timeRelationDropdown ).select2();
        // $( $timeUnitsDropdown ).select2();
        // $( $timezoneDropdown ).select2();
        
        var currentUserTimezone = getProperty(MASystem, 'User.timezoneId') || 'America/New_York';
        
        // get minimum date
        var minMom = moment().tz(currentUserTimezone);
        var minDate;
        if(minMom.isValid())
        {
            minDate = minMom.subtract(2, 'years').toDate();
        }
        else
        {
            minDate = new Date(new Date().getTime() - (365*2*24*60*60*1000));
        }
        
        // get maximum date
        var maxMom = moment().tz(currentUserTimezone);
        var maxDate;
        if(maxMom.isValid())
        {
            maxDate = maxMom.toDate();
        }
        else
        {
            maxDate = new Date();
        }
        
        // var dateLiterals = {
        //     'today': { value:MASystem.Labels.MA_TODAY.toUpperCase() || 'TODAY', val:'today' },
        //     'tomorrow': { value:MASystem.Labels.MA_TOMORROW.toUpperCase() || 'TOMORROW', val:'tomorrow' },
        //     'yesterday': { value:MASystem.Labels.MA_YESTERDAY.toUpperCase() || 'YESTERDAY', val:'yesterday'},
        // };
        
        // var dateLiteralKeys = {};
        // dateLiteralKeys[MASystem.Labels.MA_TODAY.toUpperCase()] = 'today';
        // dateLiteralKeys[MASystem.Labels.MA_TOMORROW.toUpperCase()] = 'tomorrow';
        // dateLiteralKeys[MASystem.Labels.MA_YESTERDAY.toUpperCase()] = 'yesterday';
        
        // add jquery ui calendar to from/to date wrapppers
        $filterByLastReportDateTimeDiv.find('.from_to_wrapper input').each(function(e) {
            $(this).datepicker({
                dateFormat: formatUserLocaleDate({datepicker:true}),
                changeYear: true,
                changeMonth: true,
                // showOn: "button",
                // constrainInput: false,
                // buttonImage: MASystem.Images.calender_jq,
                buttonImageOnly: true,
                minDate: minDate,
                maxDate: maxDate,
                buttonText: 'Select date',
                onSelect: function(text) {
                    $(this).attr('val' , text);
                    $(this).data('val', text);
                    $(this).blur();
                    return false;
                },
            });
        });
    }
           
            
    function liveDateRangeChange(event) 
    {
        
        // filter by device last report date and time input
        var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
        var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
        var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
        
        // from/to inputs wrappper
        var $fromToWrapper = $filterByLastReportDateDiv.find('.from_to_wrapper');
        
        // time range dropdown wrappper
        var $timeRange = $filterByLastReportTimeDiv.find('.time_range');
        
        var timeRangeValue = $timeRange.val().trim();
        
        // default every time range dropdown option as enabled
        $timeRange.find('option').attr('disabled', false);
        
        switch( $(this).val() ) 
        {
            case 'all':
            case 'today':
                // hide from/to wrapper
                $fromToWrapper.fadeOut();
                
                // enable the duration option of the time range dropdown
                // enabled above
                break;
            case 'yesterday':
                // hide from/to wrapper
                $fromToWrapper.fadeOut();
                
                // disable the non-compatible duration option of the time range dropdown
                $timeRange.find('option[value="duration"]').attr('disabled', 'disabled');
                if(timeRangeValue == 'duration')
                {
                    timeRangeValue = 'all';
                }
                break;
            case 'custom':
                // show from/to wrapper
                $fromToWrapper.fadeIn();
                
                // disable the non-compatible duration option of the time range dropdown
                $timeRange.find('option[value="duration"]').attr('disabled', 'disabled');
                if(timeRangeValue == 'duration')
                {
                    timeRangeValue = 'all';
                }
                break;
            default:
                // enable the duration option of the time range dropdown
                // enabled above
                break;
        }
        
        // trigger time range input change event to handle other time input options display
        $timeRange.select2();
        $timeRange.val(timeRangeValue);
        $timeRange.change();
    }
    
    
    function liveTimeRangeChange(event) 
    {
        
        // filter by device last report time inputs
        var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
        var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
        
        // get date inputs
        var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
        var $dateRange = $filterByLastReportDateDiv.find('.date_range');
        
        // from/to inputs wrappper
        var $fromToWrapper = $filterByLastReportTimeDiv.find('.from_to_wrapper');
        
        // time relation dropdown wrappper
        var $timeRelationWrapper = $filterByLastReportTimeDiv.find('.time_relation_wrapper');
        
        // duration and time units inputs wrapper
        var $durationTimeUnitsWrapper = $filterByLastReportTimeDiv.find('.duration_time_units_wrapper');
        
        // timezone input wrappper
        var $timezoneWrappper = $filterByLastReportDateAndTimeDiv.find('.timezone_wrapper');
        
        var currentUserTimezone = getProperty(MASystem, 'User.timezoneId');
        
        switch( $(this).val() )
        {
            case 'all':
                // hide all other time inputs
                $timeRelationWrapper.fadeOut();
                $fromToWrapper.fadeOut();
                $durationTimeUnitsWrapper.fadeOut();
                
                if($dateRange.val().trim() == 'custom')
                {
                    $timezoneWrappper.slideDown();
                }
                else
                {
                    $timezoneWrappper.slideUp();
                }
                
                break;
            case 'time_frame':
                // hide time relation, duration and time units inputs
                $timeRelationWrapper.hide();
                $durationTimeUnitsWrapper.hide();
                
                // show from/to and timezone inputs
                $fromToWrapper.fadeIn();
                
                $timezoneWrappper.slideDown();
                break;
            case 'duration':    
                // hide from/to inputs
                $fromToWrapper.hide();
                $timezoneWrappper.slideUp();
                
                // show time relation inputs and timezone
                $timeRelationWrapper.fadeIn();
                $durationTimeUnitsWrapper.fadeIn();
                break;
            default:
                break;
        }
    }
    
    function liveDateTimeRangeChange(event) 
    {
        
        // filter by device last report time inputs
        var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
        var $filterByLastReportDateTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDateTime');
        
        var $dateTimeRangeWrapper = $filterByLastReportDateTimeDiv.find('.date_time_range_wrapper');
        var $dateTimeFromToWrapper = $filterByLastReportDateTimeDiv.find('.from_to_wrapper');
        var $dateTimeDurationRelationWrapper = $filterByLastReportDateTimeDiv.find('.date_time_duration_relation_wrapper');
        
        var $dateTimeRelationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_relation_wrapper');
        var $dateTimeDurationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_duration_wrapper');

        switch( $(this).val() )
        {
            case 'all':
                refreshBadges();
                $dateTimeFromToWrapper.fadeOut();
                $dateTimeDurationRelationWrapper.fadeOut();
                
                break;
            case 'today':
            case 'yesterday':
                $dateTimeFromToWrapper.fadeOut();
                $dateTimeDurationRelationWrapper.fadeOut();
                
                break;
            case 'date':    
                $dateTimeDurationRelationWrapper.hide();
                $dateTimeFromToWrapper.fadeIn();
                break;
             case 'duration':  
                $dateTimeFromToWrapper.hide();
                $dateTimeDurationRelationWrapper.fadeIn();
                break;
            default:
                break;
        }
    }
    
    function geofenceTypeChange(el)
    {
        var geofenceTypeSelected = ($(this).val() || '').trim();
        
        if(geofenceTypeSelected == 'circle')
        {
            // hide geofence tab radius content
            showTab('geofence');
        }
        else if(geofenceTypeSelected == 'irregular')
        {
            // show geofence tab radius content
            hideTab('geofence');
        }
    }
    
    function geofenceRadiusKeyUp(el)
    {
        var geofenceRadiusEntered = ($(this).val() || '').trim();
        
        if(geofenceRadiusEntered.length > 5 || !isNum(geofenceRadiusEntered))
        {
            var replaceValue = geofenceRadiusEntered.substring(0, geofenceRadiusEntered.length-1);
            // delete last digit
            $(this).val( replaceValue );
        }
    }


    function parseFilterByLastReportDateAndTimeInput() 
    {
        var result = { dateTime:[] };
        
        try
        {
            var dateTimeInput = parseFilterByLastReportDateTimeInput(); // { timeRange:timeRange, fromTime:fromTime, toTime:toTime, timeRelation:timeRelation, duration:duration, timeUnits:timeUnits, timezone:timezone };
            result.dateTime.push(dateTimeInput);
        }
        catch(e){ console.warn(e); }
        
        return result;
    }

    function parseFilterByLastReportDateInput()
    {
        var dateInput;
        
        try
        {
            // filter by device last report date input
            var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
            var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
            
            // get date inputs
            var dateRange = $filterByLastReportDateDiv.find('.date_range').val().trim();
            var fromDate = $filterByLastReportDateDiv.find('.from_date').val().trim();
            var toDate = $filterByLastReportDateDiv.find('.to_date').val().trim();
            
            // get user default date format
            var dateFormat = String( MASystem.User.dateFormat ).toUpperCase();
            
            // from/to date moment objects
            var fromDateMom = moment(fromDate, dateFormat);
            
            // write date inputs to result
            dateInput = { dateRange:dateRange, fromDate:fromDate, toDate:toDate, dateInputFormat:dateFormat };
        }
        
        catch(e) { console.warn(e); }
        
        finally { return dateInput; }
    }

    function parseFilterByLastReportTimeInput()
    {
        var timeInput;
        
        try
        {
            // filter by device last report date and time input
            var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
            var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
            var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
            
            
            // get time inputs
            var timeRange = $filterByLastReportTimeDiv.find('.time_range').val().trim();
            var fromTime = $filterByLastReportTimeDiv.find('.from_time').val().trim();
            var toTime = $filterByLastReportTimeDiv.find('.to_time').val().trim();
            var timeRelation = $filterByLastReportTimeDiv.find('.time_relation').val().trim();
            var duration = $filterByLastReportTimeDiv.find('.duration').val().trim();
            var timeUnits = $filterByLastReportTimeDiv.find('.time_units').val().trim();
            
            fromTime = validateTime(fromTime);
            toTime = validateTime(toTime);
            
            timeInput = { timeRange:timeRange, fromTime:fromTime, toTime:toTime, timeRelation:timeRelation, duration:duration, timeUnits:timeUnits };
        }
        
        catch(e) { console.warn(e); }
        
        finally { return timeInput; }
    }
    
    function parseFilterByLastReportDateTimeInput()
    {
        var dateTimeInput;
        
        try
        {
            // filter by device last report date input
            var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
            var $filterByLastReportDateTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDateTime');
            
            var $dateTimeRangeWrapper = $filterByLastReportDateTimeDiv.find('.date_time_range_wrapper');
            var $dateTimeFromToWrapper = $filterByLastReportDateTimeDiv.find('.from_to_wrapper');
            var $dateTimeDurationRelationWrapper = $filterByLastReportDateTimeDiv.find('.date_time_duration_relation_wrapper');
            
            var $dateTimeRelationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_relation_wrapper');
            var $dateTimeDurationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_duration_wrapper');
            
            // get date inputs
            var dateTimeRange = $dateTimeRangeWrapper.find('.date_time_range').val().trim();
            var fromDate = $dateTimeFromToWrapper.find('.from_date').val().trim(); // did this to allow translation of ate literals these later if needed
            var toDate = $dateTimeFromToWrapper.find('.to_date').val().trim(); // the val is stored and associated with respective name in language (TODAY, TOMORROW etc)
            
            // get user default date format
            var dateFormat = String( MASystem.User.dateFormat ).toUpperCase();
            
            // get date/time relation
            var dateTimeRelation = $dateTimeRelationWrapper.find('.date_time_relation').val().trim();
            
            // get duration value
            var duration = $dateTimeDurationWrapper.find('.duration').val().trim();
            
            // get time units value
            var timeUnits = $dateTimeDurationWrapper.find('.time_units').val().trim();
            
            // write date inputs to result
            dateTimeInput = { dateTimeRange:dateTimeRange, fromDate:fromDate, toDate:toDate, dateInputFormat:dateFormat, dateTimeRelation:dateTimeRelation, duration:duration, timeUnits:timeUnits };
        }
        
        catch(e) { console.warn(e); }
        
        finally { return dateTimeInput; }
    }
    
    function loadLayerTypeOptions(query) // forced comment
    {
        var layerType =  savedQueryInfo.layerType
        
        if(layerType)
        {
            switch(String(layerType).toLowerCase())
            {
                case 'live':
                    loadLiveOptionsData( query );
                    break;
                    
                case 'live-device':
                    loadLiveDeviceOptionsData( query );
                    break;
                    
                case 'geofence':
                    loadGeofenceOptionsData( query );
                    break;
            }
        }
    } // forced comment
    
    // populate live options (liveOptions)
    function loadLiveOptionsData(query) // forced comment
    {
        // extract the live options
        var liveOptions;

        try
        {
            // for backward compatibility, we continue to grab liveOptions from already saved queries that didn't save the data in the new format/location
            liveOptions = JSON.parse(getProperty(query, 'advancedOptions.liveOptions', false) || null) || (JSON.parse(getProperty(query, 'advancedOptions.layerTypeOptions', false) || null) || {}).live;
        }  
        catch(e) { console.warn('Error processing advanced live options from the saved query'); }
        
        
        // populate various saved live settings when editing an existing saved query
        if(liveOptions && typeof liveOptions == 'object')
        {
            // populate edit query with live filter by device last report date and time data
            // loadLiveFilterByLastReportDateAndTimeData( getProperty(liveOptions, 'filterByLastReportDateAndTime') );
            
            // populate edit query with live filter by device last report date/time data
            loadLiveFilterByLastReportDateAndTimeData( getProperty(liveOptions, 'filterByLastReportDateAndTime') );
            
            // load other live data here
            // ...
        }
    } // forced comment
    
    // populate live device options
    function loadLiveDeviceOptionsData(query) // forced comment
    {
        // extract the live options
        var liveDeviceOptions;

        try
        {
            // for backward compatibility, we continue to grab liveOptions from already saved queries that didn't save the data in the new format/location
            liveDeviceOptions = (JSON.parse(getProperty(query, 'advancedOptions.layerTypeOptions', false) || null) || {})['live-device'];
        }  
        catch(e) { console.warn('Error processing advanced live device options from the saved query'); }
        

        // populate various saved live settings when editing an existing saved query
        if(liveDeviceOptions && typeof liveDeviceOptions == 'object')
        {
            
            // populate vendor dropdown
            $('#savedqueryeditor #vendorSelector').val(liveDeviceOptions.vendor);
            $('#savedqueryeditor #vendorSelector').change();
            
            // load other live device data here
            // ...
        }
    } // forced comment
    
    // populate geofence layer type options
    function loadGeofenceOptionsData(query) // forced comment
    {
        // extract the live options
        var geofenceOptions;

        try
        {
            var geofenceOptionsString;
            
            // for backward compatibility, we continue to grab geofenceOptions from already saved queries that didn't save the data in the new format/location
            geofenceOptions = JSON.parse( getProperty(query, 'advancedOptions.layerTypeOptions', false) || {} ).geofence;
        
        
        
            // populate various saved live settings when editing an existing saved query
            if(geofenceOptions && typeof geofenceOptions == 'object')
            {
                // populate geofence radius numeric value
                $('#savedqueryeditor #geofence-radius').val(geofenceOptions.geofenceRadius || '');
                
                // populate geofence radius units
                $('#savedqueryeditor #geofence-radius-units').val(geofenceOptions.geofenceRadiusUnits || '');
                $('#savedqueryeditor #geofence-radius-units').change(); // forced comment
                
                // populate geofence type dropdown
                $('#savedqueryeditor #geofenceType').val(geofenceOptions.geofenceType || '');
                $('#savedqueryeditor #geofenceType').change(); // trigger change event to set appropriate geofence radius input visibility
                
                // populate other geofence data
                // ...
            }
        }  
        catch(e) { console.warn('Error processing advanced live options from the saved query'); }
    } // forced comment
    
    
    // populate live device last report date and time filter inputs
    function loadLiveFilterByLastReportDateAndTimeData( filterByLastReportDateAndTimeInputData )
    {
        try
        {
            if( filterByLastReportDateAndTimeInputData && typeof filterByLastReportDateAndTimeInputData == 'object' )
            {
                // var filterByLastReportDate = filterByLastReportDateAndTimeInput.date;
                // var filterByLastReportTime = filterByLastReportDateAndTimeInput.time;
                var filterByLastReportDateTimeData = filterByLastReportDateAndTimeInputData.dateTime;
                // var timezone = filterByLastReportDateAndTimeInput.timezone;

                // load timezone input
                // loadLiveFilterByLastReportDateAndTimeTimezoneData(timezone);
                
                // load time inputs // do this before loadLiveFilterByLastReportDateData(). This order is important.
                // we want this to happen before report because the date range change event affects the time range dropdown options and needs to happen last (it's changes take precedence)
                // loadLiveFilterByLastReportTimeData(filterByLastReportTime); 
                
                // load date inputs /  do this after loadLiveFilterByLastReportTimeData(). This order is important.
                // loadLiveFilterByLastReportDateData(filterByLastReportDate);
                
                loadLiveFilterByLastReportDateTimeData(filterByLastReportDateTimeData);
            }
        }
        catch(e) {console.warn(e);}
    }
    
    function loadLiveFilterByLastReportDateTimeData(filterByLastReportDateTimeData)
    {
        try
        {
            if( Array.isArray(filterByLastReportDateTimeData) )
            {
                var filterByLastReporDateTime = filterByLastReportDateTimeData[0];
                
                if( filterByLastReporDateTime && typeof filterByLastReporDateTime == 'object' )
                {
                    // get date/time input values
                    var inputDateFormat = String(filterByLastReporDateTime.dateInputFormat).toUpperCase();
                    var dateRange = filterByLastReporDateTime.dateTimeRange;
                    
                    var fromDate = filterByLastReporDateTime.fromDate;
                    var toDate = filterByLastReporDateTime.toDate;
                    
                    var duration = filterByLastReporDateTime.duration;
                    var timeUnits = filterByLastReporDateTime.timeUnits;
                    var dateTimeRelation = filterByLastReporDateTime.dateTimeRelation;
                    
                    // select filter by device last report date/time input elements
                    var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
                    var $filterByLastReportDateTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDateTime');
                    
                    var $dateTimeRangeWrapper = $filterByLastReportDateTimeDiv.find('.date_time_range_wrapper');
                    var $dateTimeFromToWrapper = $filterByLastReportDateTimeDiv.find('.from_to_wrapper');
                    var $dateTimeDurationRelationWrapper = $filterByLastReportDateTimeDiv.find('.date_time_duration_relation_wrapper');
                    
                    var $dateTimeRelationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_relation_wrapper');
                    var $dateTimeDurationWrapper = $dateTimeDurationRelationWrapper.find('.date_time_duration_wrapper');
                    
                    var currentUserdateFormat = String(getProperty(MASystem, 'User.dateFormat')).toUpperCase();
                    
                    // get start date value
                    var fromDateText= '';
                    
                    if(fromDate == 'today' || fromDate == 'yesterday' || fromDate == 'tomorrow')
                    {
                        fromDateText = fromDate.toUpperCase();
                    }
                    else
                    {
                        if(validateDate(fromDate).success)
                        {
                            var fromMom = moment(fromDate, inputDateFormat);
                            
                            if(fromMom.isValid())
                            {
                                fromDateText = fromMom.format(currentUserdateFormat);
                            }
                        }
                    }
                    
                    // get end date value
                    var toDateText= '';
                    
                    if(toDate == 'today' || toDate == 'yesterday' || toDate == 'tomorrow')
                    {
                        toDateText = toDate.toUpperCase();
                    }
                    else
                    {
                        if(validateDate(toDate).success)
                        {
                            var toMom = moment(toDate, inputDateFormat);
                            
                            if(toMom.isValid())
                            {
                                toDateText = toMom.format(currentUserdateFormat);
                            }
                        }
                    }
                    
                    
                    // populate date/time relation
                    $dateTimeRelationWrapper.find('.date_time_relation').val( dateTimeRelation );
                    $dateTimeRelationWrapper.find('.date_time_relation').change();
                    
                    // populate duration value
                    $dateTimeDurationWrapper.find('.duration').val( duration );
                    
                    // populate time units value
                    $dateTimeDurationWrapper.find('.time_units').val( timeUnits );
                    $dateTimeDurationWrapper.find('.time_units').change();
            

                    // populate dom with values
                    $dateTimeFromToWrapper.find('.from_date').val(fromDateText);
                    $dateTimeFromToWrapper.find('.from_date').attr('val', fromDateText.toLowerCase());
                    
                    $dateTimeFromToWrapper.find('.to_date').val(toDateText);
                    $dateTimeFromToWrapper.find('.to_date').attr('val', toDateText.toLowerCase());
                    
                    $dateTimeRangeWrapper.find('.date_time_range').val(dateRange);
                    $dateTimeRangeWrapper.find('.date_time_range').change();
                }
            }
        }
        catch(e) {console.warn(e);}
    }
    
    // populate live device last report date filter inputs
    function loadLiveFilterByLastReportDateData(filterByLastReportDateArray) 
    {
        try
        {
            if( Array.isArray(filterByLastReportDateArray) )
            {
                var filterByLastReportDate = filterByLastReportDateArray[0];
                
                if( filterByLastReportDate && typeof filterByLastReportDate == 'object' )
                {
                    // get date input values
                    var inputDateFormat = filterByLastReportDate.dateInputFormat;
                    var dateRange = filterByLastReportDate.dateRange;
                    var fromDate = filterByLastReportDate.fromDate;
                    var toDate = filterByLastReportDate.toDate;
                    
                    // get date input elements
                    
                    // filter by device last report date and time input
                    var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
                    var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
                    var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
                    
                    // from/to inputs wrappper
                    var $fromToWrapper = $filterByLastReportDateDiv.find('.from_to_wrapper');
            
                    // date range dropdown wrappper
                    var $dateRange = $filterByLastReportDateDiv.find('.date_range');
                    
                    
                    // ensure date inputs are formatted correctly using the date format provided at time of input and the current org's date format
                    var currentUserDateFormat = String( getProperty(MASystem, 'User.dateFormat') ).toUpperCase();
                    
                    // populate inputs and manually trigger changes
                    
                    // set date range
                    $dateRange.val( dateRange );
                    
                    
                    // represent date strings input as moment objects to moments to validate date and also find the right format to display to user
                    var fromDateMom = moment(fromDate, inputDateFormat);
                    var toDateMom = moment(toDate, inputDateFormat);
                    
                    // set from time
                    if( fromDateMom.isValid() )
                    {
                        var validatedFrom = validateDate( fromDateMom.format(currentUserDateFormat) );
                        
                        if( validatedFrom.success ) {
                            $fromToWrapper.find('.from_date').val( validatedFrom.date );
                        }
                    }
                    
                    // set to time
                    if( toDateMom.isValid() )
                    {
                        var validatedTo = validateDate( toDateMom.format(currentUserDateFormat) );
                        
                        if( validatedTo.success ) {
                            $fromToWrapper.find('.to_date').val( validatedTo.date );
                        }
                    }
                    
                    // trigger date range change to chnage date range display and to force correct values/selections for time input
                    $dateRange.change();
                }
            }
        }
        catch(e) {console.warn(e);}
    }
    
    
    // populate live device last report time filter inputs
    function loadLiveFilterByLastReportTimeData(filterByLastReportTimeArray)
    {
        try
        {
            if( Array.isArray(filterByLastReportTimeArray) )
            {
                var filterByLastReporTime = filterByLastReportTimeArray[0];
                
                if( filterByLastReporTime && typeof filterByLastReporTime == 'object' )
                {
                    /*** get time input values ***/
                    var duration = filterByLastReporTime.duration;
                    var timeRange = filterByLastReporTime.timeRange;
                    var timeRelation = filterByLastReporTime.timeRelation;
                    var timeUnits = filterByLastReporTime.timeUnits;
                    
                    var fromTimeObject = filterByLastReporTime.fromTime || {};
                    var toTimeObject = filterByLastReporTime.toTime || {};
                    
                    // get user current time format setting
                    var userTimeFormat = getProperty(MASystem, 'User.timeFormat');
                    
                    
                    // get from/time inputs
                    
                    // get from time
                    var fromTime;
                    if( fromTimeObject.success )
                    {
                        if(/12/.test(fromTimeObject.inputFormat)) // 12-hour time format
                        {
                            fromTime = fromTimeObject.time12hr;
                        }
                        else // 24-hour time format
                        {
                            fromTime = fromTimeObject.time24hr;
                        }
                    }
                    
                    // get to time
                    var toTime;
                    if( toTimeObject.success )
                    {
                        if(/12/.test(toTimeObject.inputFormat)) // 12-hour time format
                        {
                            toTime = toTimeObject.time12hr;
                        }
                        else // 24-hour time format
                        {
                            toTime = toTimeObject.time24hr;
                        }
                    }
                    
                    
                    /*** get/select required DOM elements ***/
                    
                    // main enclosing divs
                    var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
                    var $filterByLastReportDateDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportDate');
                    var $filterByLastReportTimeDiv = $filterByLastReportDateAndTimeDiv.find('.filterByLastReportTime');
                    
                    // from/to time inputs wrappper
                    var $fromToWrapper = $filterByLastReportTimeDiv.find('.from_to_wrapper');
            
                    // time range dropdown wrappper
                    var $timeRange = $filterByLastReportTimeDiv.find('.time_range');
                    
                    // time relation dropdown input
                    var $timeRelation = $filterByLastReportTimeDiv.find('.time_relation');
                    
                    // time duration input
                    var $duration = $filterByLastReportTimeDiv.find('.duration');
                    
                    // time units input
                    var $timeUnits = $filterByLastReportTimeDiv.find('.time_units');

                    // ensure time inputs are formatted correctly using the time format provided at time of input and the current org's time format
                    var currentUserTimeFormat = String( getProperty(MASystem, 'User.timeFormat') ).toUpperCase();
                    
                    
                    /*** populate time input elements ***/
                    
                    // populate time range
                    $timeRange.val( timeRange );
                    $timeRange.change();
                    
                    // populate time relation
                    $timeRelation.val( timeRelation );
                    $timeRelation.change();
                    
                    // populate duration input
                    $duration.val( duration );
                    
                    // populate time units input
                    $timeUnits.val( timeUnits );
                    $timeUnits.change();

                    // populate from/to time inputs
                    $fromToWrapper.find('.from_time').val( fromTime );
                    $fromToWrapper.find('.to_time').val( toTime );
                }
            }
        }
        catch(e) {console.warn(e);}
    }
    
    
    function loadLiveFilterByLastReportDateAndTimeTimezoneData(timezone)
    {
        try
        {
            var $filterByLastReportDateAndTimeDiv = $('#savedqueryeditor .filterByLastReportDateAndTime');
            var $timezone_wrapper = $filterByLastReportDateAndTimeDiv.find('.timezone_wrapper');
            $timezone_wrapper.find('.timezone').val( timezone );
            $timezone_wrapper.find('.timezone').change();
        }
        catch(e) { console.warn(e); }
    }
    
    function validateLiveDeviceLastReportDateTimeInput() 
    {
        var result = { success: true };
        
        try
        {
            var deviceLastReportDateAndTimeInput = parseFilterByLastReportDateTimeInput();
            
            if(typeof deviceLastReportDateAndTimeInput == 'object')
            {
                var dateTimeRange = deviceLastReportDateAndTimeInput.dateTimeRange;
                var fromDate = deviceLastReportDateAndTimeInput.fromDate;
                var toDate = deviceLastReportDateAndTimeInput.toDate;
                var dateTimeRelation = deviceLastReportDateAndTimeInput.dateTimeRelation;
                var duration = deviceLastReportDateAndTimeInput.duration;
                var timeUnits = deviceLastReportDateAndTimeInput.timeUnits;
                var dateInputFormat = String(deviceLastReportDateAndTimeInput.dateInputFormat).toUpperCase();
                
                if( dateTimeRange == 'all') {}
                else if( dateTimeRange == 'today' || dateTimeRange == 'yesterday') {}
                else if( dateTimeRange == 'date')
                {
                    if(fromDate == '' && toDate == '')
                    {
                        result.success = false;
                        result.message = 'Must enter at least one value in the from/to date boxes.';
                    }
                    else // we have at least a form of input in either of the date to/from inputs
                    {
                        var twoYearsAgoMom = moment().subtract(2, 'years');
                        var now = moment();
                        
                        if(fromDate != '' && toDate == '') // from not blank - to blank
                        {
                            if(validateDate(fromDate).success)
                            {
                                var fromMom = moment(fromDate, dateInputFormat);
                                if( !fromMom.isValid() )
                                {
                                    result.success = false;
                                    result.message = 'Date value in the from date box is invalid.';
                                }
                                else
                                {
                                    if(fromMom.valueOf() < twoYearsAgoMom.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the from date box cannot be less than two years ago.';
                                        
                                    }
                                    else if(fromMom.valueOf() > now.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the from date box cannot be greater than today.';
                                    }
                                }
                            }
                            else
                            {
                                result.success = false;
                                result.message = 'Date value in the from date box is invalid.';
                            }
                        }
                        else if(fromDate == '' && toDate != '') // from blank - to not blank
                        {
                            if(validateDate(toDate))
                            {
                                var toMom = moment(toDate, dateInputFormat);
                                if( !toMom.isValid() )
                                {
                                    result.success = false;
                                    result.message = 'Date value in the to date box is invalid.';
                                }
                                else
                                {
                                    if(toMom.valueOf() < twoYearsAgoMom.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the to date box cannot be less than two years ago.';
                                        
                                    }
                                    else if(toMom.valueOf() > now.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the to date box cannot be greater than today.';
                                    }
                                }
                            }
                            else
                            {
                                result.success = false;
                                result.message = 'Date value in the to date box is invalid.';
                            }
                        }
                        else if(fromDate != '' && toDate != '') // both from and to not blank
                        {
                            if(validateDate(fromDate).success && validateDate(toDate).success)
                            {
                                var fromMom = moment(fromDate, dateInputFormat);
                                var toMom = moment(toDate, dateInputFormat);
                                
                                if( fromMom.isValid() && toMom.isValid() )
                                {
                                    if(fromMom.valueOf() < twoYearsAgoMom.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the from date box cannot be less than two years ago.';
                                        
                                    }
                                    else if(fromMom.valueOf() > now.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date value in the from date box cannot be greater than today.';
                                    }
                                    
                                    if(toMom.valueOf() < fromMom.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'The from date value is greater than the to date value.';
                                    }
                                    else if(toMom.valueOf() < twoYearsAgoMom.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date input value in the to date box cannot be less than two years ago.';
                                        
                                    }
                                    else if(toMom.valueOf() > now.valueOf())
                                    {
                                        result.success = false;
                                        result.message = 'Date input value in the to date box cannot be greater than today.';
                                    }
                                    else
                                    {
                                        if(fromMom.valueOf() > toMom.valueOf())
                                        {
                                            result.success = false;
                                            result.message = 'From date input value is greater than the to date input value.';
                                        }
                                    }
                                }
                                else
                                {
                                    result.success = false;
                                    var message = '';
                                    
                                    if( !fromMom.isValid() && !toMom.isValid() )
                                    {
                                        message += 'The from/to date values are invalid or unexpected.';
                                    }
                                    else if( !fromMom.isValid() )
                                    {
                                        message += 'The from date value is invalid or unexpected.';
                                    }
                                    else if( !fromMom.isValid() )
                                    {
                                        message += 'The to date value is invalid or unexpected.';
                                    }
                                    else
                                    {
                                        message += 'Date value is invalid or unexpected.';
                                    }

                                    result.message = message;
                                }
                            }
                            else
                            {
                                result.success = false;
                                var message = '';
                                
                                if(!validateDate(fromDate).success)
                                {
                                    message += 'Invalid from date value. ';
                                }
                                
                                if(!validateDate(toDate).success)
                                {
                                    message += 'Invalid to date value.';
                                }
                            }
                        }
                    }
                }
                else if( dateTimeRange == 'duration')
                {
                    if(dateTimeRelation != 'in' && dateTimeRelation != 'not_in')
                    {
                        result.success = false;
                        result.message = 'Invalid or unknown input was selected for the duration "* reported in" selection.';
                    }
                    else 
                    {
                        if(isNum(duration))
                        {    
                            if(duration < 1 || duration > 9999)
                            {
                                result.success = false;
                                result.message = 'The duration number value must be a 4-digit positive number.';
                            }
                            else
                            {
                                var fromMom = moment().subtract(duration, timeUnits);
                                
                                if( !fromMom.isValid() )
                                {
                                    result.success = false;
                                    result.message = 'The duration or time units entered are invalid.';
                                }
                                else
                                {
                                    if(['minutes', 'seconds', 'hours', 'days', 'weeks'].indexOf(timeUnits) < 0)
                                    {
                                        result.success = false;
                                        result.message = 'Invalid or unknown input for the time units selection.';
                                    }
                                }
                            }
                        }
                        else
                        {
                            result.success = false;
                            result.message = 'The duration value is not a number.';
                        }
                    }
                }
                else 
                { 
                    result.success = false;
                    result.message = 'Invalid or unknown value for the Date range selection'; 
                } 
            }
        }
        catch(e){ console.warn(e); result = false; }
        
        return result;
    }
    /********End of Functions related to live filter by last report date and time inputs*******/
    
    function validateGeofenceInput() 
    {
        var result = { success: true };
        
        try
        {
            var geofenceInput = getAdvancedGeofenceOptions();
            
            // find all instances of invalid geofence input and set success to false with appropriate message for display
            if(typeof geofenceInput == 'object')
            {
                var geofenceTypeList = ['irregular', 'circle'];
                
                if(geofenceTypeList.indexOf(geofenceInput.geofenceType) < 0)
                {
                    result.success = false;
                    result.message = 'You must select a valid Geofence Type for this query before you can proceed';
                }
                else if(geofenceInput.geofenceType == 'circle')
                {
                    if(!isNum(geofenceInput.geofenceRadius))
                    {
                        result.success = false;
                        result.message = 'Missing or invalid Geofence circle radius input';
                    }
                    else if(Number(geofenceInput.geofenceRadius) > 99999)
                    {
                        result.success = false;
                        result.message = 'Geofence circle radius cannot have more than 5 digits';
                    }
                    else if(typeof geofenceInput.geofenceRadiusUnits != 'string' || geofenceInput.geofenceRadiusUnits == '')
                    {
                        result.success = false;
                        result.message = 'Missing or invalid Geofence circle radius units input';
                    }
                }
            }
            else
            {
                result.success = false;
                result.message = 'Could not validate geofence input';
            }
        }
        catch(e){ console.warn(e); result.success = false; result.message = 'Unexpected error while validating geofence input'; }
        
        return result;
    }
    
    function validateLiveDeviceInput() // forced comment
    {
        var result = { success: true };
        
        try
        {
            var liveDeviceInput = getAdvancedLiveDeviceOptions();
            
            // find all instances of invalid geofence input and set success to false with appropriate message for display
            if(typeof liveDeviceInput == 'object')
            {
                if(!liveDeviceInput.vendor || String(liveDeviceInput.vendor).trim() == '')
                {
                    result.success = false;
                    result.message = 'You must select a valid Vendor for this query before you can proceed';
                }
            }
        }
        catch(e){ console.warn(e); result.success = false; result.message = 'Unexpected error while validating geofence input'; }
        
        return result;
    } // forced comment
    
    /**
     * This funtion is a one stop shop to get the advanced options of the given layer type 
     * so the information can get stored in the saved query
     * */
    function getLayerTypeAdvancedOptions() // forced comment
    {
        var layerType = savedQueryInfo.layerType
        var result = {};
        
        try
        {
            if(layerType) // forced comment
            {
                var info = null;
                
                switch(String(layerType).toLowerCase()) // forced comment
                {
                    // make sure info is valid json object because it will get serialized to save and deserialized for plotting
                    case 'live':
                        info = getAdvancedLiveOptions();
                        break;
                    case 'live-device': // this should be included in commit, somehow got ommited in other repository commit
                        info = getAdvancedLiveDeviceOptions(); // forced comment
                        break;
                    case 'geofence':
                        info = getAdvancedGeofenceOptions();
                        break;
                    default:
                        break;
                }
                
                result[String(layerType).toLowerCase()] = info || null; // forced comment
            }
        }
        catch(e) { console.warn('unable to parse some layer specific input for the layerType: ' + baseObjectLayerType); }
        
        return result;
    } // forced comment
    
    function getAdvancedLiveOptions()
    {
        var liveOptions = null;
        
        try
        {
            liveOptions = { 
                    // filter live by last report date and time input
                    filterByLastReportDateAndTime: parseFilterByLastReportDateAndTimeInput(),
                    
                    // add key value pairs here to get more live advanced options
                    // ...
            };
        }
        catch(e) { console.warn(e); }
        finally
        {
            return liveOptions;
        }
    }
    
    function getAdvancedLiveDeviceOptions() // forced comment
    {
        var liveDeviceOptions = null;
        
        try
        {
            liveDeviceOptions = { 
                    // device vendor selection
                    vendor: $('#savedqueryeditor #vendorSelector').val(),
                    
                    // add key value pairs here to get more live device advanced options
                    // ...
            };
        }
        catch(e) { console.warn(e); }
        finally
        {
            return liveDeviceOptions;
        }
    } // forced comment
    
    function getAdvancedGeofenceOptions()
    {
        var geofenceOptions = null;
        
        try
        {
            geofenceOptions = { 
                    // geofence type
                    geofenceType: $('#savedqueryeditor #geofenceType').val().trim() || null,
                    
                    // geofence circle radius
                    geofenceRadius: $('#savedqueryeditor #geofence-radius').val().trim() || null,
                    
                    // geofence circle radius units
                    geofenceRadiusUnits: $('#savedqueryeditor #geofence-radius-units').val().trim() || null,
                    
                    // add key value pairs here to get more geofence advanced options
                    // ...
            };
        }
        catch(e) { console.warn(e); }
        finally
        {
            return geofenceOptions;
        }
    }
    
    function initializeLayerTypeInputs() // forced comment
    {
        var layerType = savedQueryInfo.layerType
        
        if(layerType)
        {
            if(typeof layerType == 'string')
            {
                switch(layerType.trim().toLowerCase())
                {
                    case 'live':
                        initializeLiveInputs();
                        break;
                    case 'live-device':
                        initializeLiveDeviceInputs();
                        break;
                    case 'geofence':
                        initializeGeofenceInputs();
                        break;
                    default:
                        break;
                }
            }
        }
    } // forced comment
        
    function initializeLiveInputs() // forced comment
    {
        var $markerTypeWrapper = $('#savedqueryeditor .markertype-wrapper.first-level-markertype-selector');

        $markerTypeWrapper.find('.markertype-color-preview').hide();
        $markerTypeWrapper.find('.markertype-image').next().show();
        $markerTypeWrapper.find('.ui-combobox > input').next().show();
        
        
        initializeLiveReportDateAndTimeInputs();
    } // forced comment
    
    function initializeLiveDeviceInputs() // forced comment
    {
        var $markerTypeWrapper = $('#savedqueryeditor .markertype-wrapper.first-level-markertype-selector');

        $markerTypeWrapper.find('.markertype-color-preview').hide();
        $markerTypeWrapper.find('.markertype-image').next().show();
        $markerTypeWrapper.find('.ui-combobox > input').next().show();
        
        $('#savedqueryeditor #vendorSelector').select2({width:'resolve'});
    } // forced comment
    
    function initializeGeofenceInputs() // forced comment
    {
        var $geofenceRadiusInputWrapper = $('#savedqueryeditor #geofence-radius-input-wrapper');
        var $geofenceTypeSelector = $('#geofenceType');
        
        // initialize geofence type dropdown with handler
        $('#savedqueryeditor').on('change', '#geofenceType', geofenceTypeChange);
        
        // determine which geofence type dropdown items are enabled/disabled
        if(savedQueryInfo.baseObjectShape && String(savedQueryInfo.baseObjectShape).trim() != '') // if there's a value for the base object shape field
        {
            // enable irregular option
            $('#geofenceType option[value="irregular"]').attr('disabled', false);
        }
        else // no shape in BO
        {
            // disable irregular option
            $('#geofenceType option[value="irregular"]').attr('disabled', true);
        }
        
        if(savedQueryInfo.baseObjectLat && String(savedQueryInfo.baseObjectLat).trim() != '' && savedQueryInfo.baseObjectLng && String(savedQueryInfo.baseObjectLng).trim() != '') // if there's a lat/lng field value on base object
        {
            // enable circle option
            $('#geofenceType option[value="circle"]').attr('disabled', false);
        }
        else // no lat/lng field values in bo
        {
            // disable circle option
            $('#geofenceType option[value="circle"]').attr('disabled', true);
        }
        
        // initialize geofence radius
        if(isNum(savedQueryInfo.defaultGeofenceRadius))
        {
            $geofenceRadiusInputWrapper.find('#geofence-radius').val(savedQueryInfo.defaultGeofenceRadius);
        }
        
        $geofenceRadiusInputWrapper.find('#geofence-radius').on('keyup', geofenceRadiusKeyUp);
        
        // initialize geofence radius units input widget
        $geofenceRadiusInputWrapper.find('#geofence-radius-units').val(savedQueryInfo.defaultGeofenceRadiusUnits).change().select2({});
        
        // initialize geofence type dropdown
        $geofenceTypeSelector.find('option').prop('selected', false);
        $geofenceTypeSelector.find('option:not(:disabled)').eq(0).prop('selected', true);
        $geofenceTypeSelector.select2({}); // default to the first enabled option
        
        $geofenceTypeSelector.change();
    } // forced comment
    
    // quickly switch to top-level tab given the tab index or tab name (as specified by it's 'data-tab' attribute)
    // index is only for visible tabs
    function goToTab(tabStringNameOrIndex) {
        var $tab;
        
        // figure out the target tab
        if(isNum(tabStringNameOrIndex))
        {
            $tab = $('.top-level-tab:visible').eq(tabStringNameOrIndex);
        }
        else
        {
            $tab = $('.top-level-tab[data-tab="' + tabStringNameOrIndex + '"');
        }
        
        $tab.children().click(); // click to go to tab
    }
    
    function hideTab(tabStringNameOrIndex) {
        var $tab;
        
        var topLevelTabClassName = 'top-level-tab';
        
        // figure out the target tab
        if(isNum(tabStringNameOrIndex))
        {
            $tab = $(topLevelTabClassName).eq(tabStringNameOrIndex);
        }
        else
        {
            $tab = $('.' + topLevelTabClassName + '[data-tab="' + tabStringNameOrIndex + '"');
        }
        
        // hide target tab
        $tab.fadeOut(); 
        
        // fall back to the previous visible tab
        goToTab(0);
    }
    
    function showTab(tabStringNameOrIndex) {
        var $tab;
        
        var topLevelTabClassName = 'top-level-tab';
        
        // figure out the target tab
        if(isNum(tabStringNameOrIndex))
        {
            $tab = $(topLevelTabClassName).eq(tabStringNameOrIndex);
        }
        else
        {
            $tab = $('.' + topLevelTabClassName + '[data-tab="' + tabStringNameOrIndex + '"');
        }
        
        // hide target tab
        $tab.fadeIn(); 
        
        // fall back to the previous visible tab
        goToTab(tabStringNameOrIndex);
    }
    
    function goToTab(tabStringNameOrIndex) {
        var $tab;
        
        // figure out the target tab
        if(isNum(tabStringNameOrIndex))
        {
            $tab = $('.top-level-tab:visible').eq(tabStringNameOrIndex);
        }
        else
        {
            $tab = $('.top-level-tab[data-tab="' + tabStringNameOrIndex + '"');
        }
        
        $tab.children().click(); // click to go to tab
    }
    
    // quickly switch to filter tab side menu item tab given the item index or name (as specified by it's 'data-tab' attribute)
    function goToSubFilterItem(subFilterItemNameOrIndex) {
        var $item;
        
        // figure out the target sub-filte rmenu item
        if(isNum(subFilterItemNameOrIndex))
        {
            $item = $('.sub-filter-item:visible').eq(subFilterItemNameOrIndex); // index is only for visible side items
        }
        else
        {
            $item = $('.sub-filter-item[data-tab="' + subFilterItemNameOrIndex + '"');
        }
        
        $item.children().click(); // click to go to side menu-item
    }
    
    $(function () {
		// Display Filter tabs on click
		$('#tab-filters').on('click', '.filtericon', function () {
			if (!$(this).is('.active')) {
				$('.filtericon').removeClass('active');
        		$('.htab-content:visible').slideUp(400);
        		$(this).addClass('active');
        		$('.htab-content.'+$(this).attr('data-tab')).slideDown(400);
			}
		});
		
        
		//Manage Marker tabs on icon click
		$('.markertabs').on('click', '.markercolortab', function ()            
        {
        	$('.markericon').removeClass('active');
        	$(this).addClass('active');
        	$('#tab-markers .shapemarker').hide();
        	$('#tab-markers .symbolmarker').hide();
        	$('#tab-markers .colormarker').show();
        });
        
        $('.markertabs').on('click', '.markershapetab', function ()            
        {
        	$('.markericon').removeClass('active');
        	$(this).addClass('active');
        	$('#tab-markers .colormarker').hide();
        	$('#tab-markers .symbolmarker').hide();
        	$('#tab-markers .shapemarker').show();
        });
        
        $('.markertabs').on('click', '.markersymboltab', function ()            
        {
        	$('.markericon').removeClass('active');
        	$(this).addClass('active');
        	$('#tab-markers .shapemarker').hide();
        	$('#tab-markers .colormarker').hide();
        	$('#tab-markers .symbolmarker').show();
        });
        
        
        
        //Removes row on related list tab
		$('#savedqueryeditor').on('click', '.MarkerLayerRelatedList-remove', function () 
        {
            $(this).closest('.MarkerLayerRelatedList-row').remove()
        });

        // handle events
        $('#savedqueryeditor')

            //clicking marker color previews needs to display an editor
            .on('click', '.markertype-color-preview', function(e) {
                var $preview = $(this);
                var $colorPickerSelector = $(".markerpicker.bubble.top");
                var numOfMarkerPickers = $colorPickerSelector.length;
                // this removes clones that is not the one you are currently clicking.
                if(numOfMarkerPickers > 0) {
                    $colorPickerSelector.each(function() {
                        $(this).remove();
                    });
                }
                //build editor bubble
                var offset = $(this).offset();
                var heightOfMarkerPicker = 265;
                var offSetTopOutOfViewport = (offset.top - heightOfMarkerPicker) + 'px';
                var offsetTop = (offset.top + 25) + 'px';
                var offsetLeft = offset.left + 'px';
                var $bubble = $('#savedqueryeditor-templates .markerpicker').clone()
                    .addClass('bubble top')
                    .css({
                        position: 'absolute',
                        top: offsetTop,
                        left: offsetLeft,
                        width: 200,
                        height: heightOfMarkerPicker,
                        padding: '5px'
                    })
                    .appendTo('body')
                    .on('click', function(e) {
                        e.stopPropagation();
                    });
                //init color picker
                var $shapeWrapper = $bubble.find('.markerpicker-shapes');
                var $colorPicker = $bubble.find('.markerpicker-color');
                $colorPicker.minicolors({
                    inline: true,
                    control: 'brightness',
                    change: function(hex, opacity) {
                        try {
                            $shapeWrapper.empty();
                            var html = '<table><tr>';
                            $.each(MAMarkerBuilder.shapes, function (shape, shapeMeta) {
                                if ($.inArray('dynamic', shapeMeta.types) != -1) {
                                    var svg = MAMarkerBuilder.createSVG({
                                        color: hex + ':' + shape
                                    });
                                    html += '<td>' + svg + '</td>'
                                }
                            });
                            html += '</tr></table>';
                            $shapeWrapper.append(html)
                        } catch (e) {}
                    }
                }).minicolors('value', '#00FF00');
            
                //handle color picker selection
                $shapeWrapper.on('click', 'svg', function() {
                    var color = $colorPicker.minicolors('value') + ':' + $(this).attr('data-shape');
            
                    //if this is a mass action, update all rows.  otherwise, just update this row
                    if ($preview.is('.massaction')) {
                        $preview.closest('.markergrid').find('.markergrid-row .markertype-color-preview').attr('data-color', color).html(MAMarkerBuilder.createSVG({
                            color: color,
                            forLegend: true
                        }));
                    } else {
                        $preview.attr('data-color', color).html(MAMarkerBuilder.createSVG({
                            color: color,
                            forLegend: true
                        }));
                    }
            
                    //remove the picker
                    $bubble.remove();
                });
            
                var bounding = $(".markerpicker.bubble.top")[0].getBoundingClientRect();
                if (bounding.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
                    // Bottom is out of viewport so move to top of button marker
                    $(".markerpicker.bubble.top").css('top', offSetTopOutOfViewport);
                }
                //stop propagation to avoid closing bubble
                e.stopPropagation();
            });


    	    /**March Release 2016*/
        	$('#savedqueryeditor').on('click', '.markertype-shape-preview', function (e) {
                var $preview = $(this);
                //build editor bubble
                var offset = $preview.offset();
                var offsetTop = (offset.top + 25) + 'px';
                var offsetLeft = offset.left + 'px';
                var $bubble = $('#savedqueryeditor-templates .shapepicker').clone()
                    .addClass('bubble top')
                    .css({ position: 'absolute', top: offsetTop, left: offsetLeft, width: 225, height: 245, padding: '5px' })
                    .appendTo('body')
                    .on('click', function (e) { e.stopPropagation(); })
                ;

                //init color picker
                var $shapeWrapper = $bubble.find('.markerpicker-shapes');
                
                //var $colorPicker = //$bubble.find('.markerpicker-shapes');
                
                try {
                    $shapeWrapper.empty();
                    var html = '<table><tr>';
                    var tableBreak = 4;
                    var shapeCount = 0;
                    $.each(MAMarkerBuilder.shapes, function (shape, shapeMeta) {
                        if(shapeCount == tableBreak) {
                            shapeCount = 0;
                            html += '</tr><tr>';
                        }
                        if ($.inArray('dynamic', shapeMeta.types) != -1) {
                            //$(MAMarkerBuilder({ color: hex + ':' + shape })).attr('data-shape', shape).appendTo($shapeWrapper);
                            var svg = MAMarkerBuilder.createSVG({ color: '#00FF00' + ':' + shape });
                            //$(MAMarkerBuilder.createSVG({ color: '#00FF00' + ':' + shape })).attr('data-shape', shape).appendTo($shapeWrapper);
                            html += '<td>'+svg+'</td>';
                        }
                        shapeCount++;
                    });
                    
                    if(shapeCount != 0) {
                        html += '</tr>';
                    }
                    
                    html += '</table>';
                    $shapeWrapper.append(html);
                } catch(e) {}
                
                //handle color picker selection
                $shapeWrapper.on('click', 'svg', function () {
                    //var color = $colorPicker.minicolors('value')+':'+$(this).attr('data-shape');
                    var color = '#00FF00'+':'+$(this).attr('data-shape');
                    //if this is a mass action, update all rows.  otherwise, just update this row
                    if ($preview.is('.massaction')) {
                        //$preview.closest('.shapemarkergrid').find('.shapemarkergrid-row .markertype-shape-preview').attr('data-color', '#00FF00').html(MAMarkerBuilder({ color: '#00FF00', forLegend: true }));
                        $preview.closest('.shapemarkergrid').find('.shapemarkergrid-row .markertype-shape-preview').attr('data-color', color).html(MAMarkerBuilder.createSVG({ color: color, forLegend: true }));
                    }
                    else {
                        $preview.attr('data-color', color).html(MAMarkerBuilder.createSVG({ color: color, forLegend: true }));
                        //$preview.attr('data-color', '#00FF00').html(MAMarkerBuilder({ color: '#00FF00', forLegend: true }));
                    }
                    
                    //remove the picker
                    $bubble.remove();
                });

                //stop propagation to avoid closing bubble
                e.stopPropagation();
            }); 
        
        
        $('#savedqueryeditor')

            //clicking marker color previews needs to display an editor
            .on('click', '.markertype-colorpicker-preview .colorTest', function (e) {
                var $preview = $(this);

                //needed to capture the click
                e.stopPropagation();

                var colorOptions = {
                    element : $preview,//$('.drop2 .colorTest'),
                    showMarkers : false,
                    //icon:$('.drop2 .colorTest').attr('data-icon') || 'Marker', if we had a marker
                    //color: $('.drop2 .colorTest').attr('data-color') || '#3c78d8' //launch picker with color selected
                    color: $preview.attr('data-color') || '#3c78d8' //launch picker with color selected
                }

                //opens the picker
                MA.colors.openPicker(colorOptions ,function(res) {
                    //do something with the color
                    $preview.css({'background': res.color});//$('.drop2 .colorTest').css('background',res.color);
                    $preview.attr('data-color',res.color);//$('.drop2 .colorTest').attr('data-color',res.color);
                });
                
            }); 
    
        //get the query that we're creating/editing
        query = JSON.parse($('[id$="serializedQuery"]').val());
        $('#savedqueryeditor span.baseobject-name').text(query.baseObjectName);
        if(query.baseObject == 'Account')
        {
            $('#savedqueryeditor .territory-teams').show();
        } else {
            $('#savedqueryeditor .territory-teams').hide();
        }

        if (query.baseObject.endsWith('__x')) { // setting up External Objects limits for empty query
            const queryRowLimit = parseInt(query.rowLimit);
            if (Number.isNaN(queryRowLimit)) {
                $('#savedqueryeditor .limits-rowcount-value').val(MA.defaults.maxQuerySizeExt); // will always start at max (2000)
            }
        }

        // display query Created By and Created Date info
        if (query.createdBy && query.createdDate) {
            var systemInfo = '***' + MASystem.Labels.MA_CREATED_BY_NAME + ' ' + query.createdBy+ ' ' + MASystem.Labels.MA_ON + ' '+query.createdDate;
            
            if (query.modifiedBy && query.modifiedDate) {
                systemInfo += ', ' + MASystem.Labels.MA_MODIFIED_BY + ' ' +query.modifiedBy+ ' ' + MASystem.Labels.MA_ON + ' '  + query.modifiedDate;
            }
        	$('#savedqueryeditor .systeminfo').text(systemInfo);
        }
        if (savedQueryInfo.queryIndex && savedQueryInfo.queryIndex != '') {
        	$('.savebtn.plotbtn').addClass('refreshbtn').attr('value', MASystem.Labels.MA_SAVE_AND_REFRESH);
        }
        
        //initialize color pickers
        jscolor.init();
        $('.colormarker .Static .markertype-color-preview').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true }));
        
        //combobox settings
        $('#savedqueryeditor').on('focus', '.ui-autocomplete-input', function () { 
            var $me = $(this); 
            $me.select();
        });

        $('.filterbyactivity .combobox').select2();
        $('.Static .markertype-select').combobox();
        
        // get the sortable fields for OrderBy dropdown
        // ADDED LOADING SPINNER
        showLoading($('#queryeditor-modal'),'loading');
        VueEventBus.$emit('get-fields', { isSortable: true }, query.baseObject, (res) => {
            if (res.success) {
                var fields = res.data;
                // loop over the fields and build html
                var $sortableField = $('select.orderby-field');
                $sortableField.append(
                    $('<option></option>').attr('value','--'+MASystem.Labels.MA_None+'--').text('--'+MASystem.Labels.MA_None+'--')
                );
                $.each(fields || [], function (index, option) {
                    $('<option></option>').attr('value', option.apiName).text(option.label).appendTo($sortableField);
                });
                $sortableField.removeAttr('disabled');
                $sortableField.select2();
                hideMessage($('#queryeditor-modal'));
                if (query.rowOrder != null) {
                    $('#savedqueryeditor .advanced').find('.orderby-field').val(query.rowOrder).trigger('change.select2');
                    refreshBadges();
                    if(query.rowOrderDirection == 'desc') {
                        $('#savedqueryeditor .orderby-dir').addClass('desc');
                    }
                } else {
                    refreshBadges();
                }
            } else {
                console.warn(res.message);
                hideMessage($('#queryeditor-modal'));
            }
        });

        // batch get fields and then pass them into the old function
        VueEventBus.$emit('get-fields', { isSortable: true }, query.baseObject, (res) => {
            if (res.success) {
                var fields = res.data;
                //get metadata for the selected query (or base object)
                var processData = {
                    ajaxResource : 'QueryBuilderAPI',
                    action: 'getSavedQueryMetadata',
                    baseObject : baseObject
                };
                //
                //ADDED LOADING SPINNER
                showLoading($('#queryeditor-modal'),'loading');
                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                    processData,
                    function(response, event){
                        //CLOSED LOADING SPINNER
                        hideMessage($('#queryeditor-modal'));
                        if(event.status) {
                            // path of least resistance to get this done. will need full rewrite into vue with more time
                            response.data.tooltipOptions = fields;
                            response.data.picklistOptions = fields;
                            //populate tooltip options
                            var $tooltips = $('select.tooltip');
                            $tooltips.append($('<option></option>').attr('value','--'+MASystem.Labels.MA_None+'--').text('--'+MASystem.Labels.MA_None+'--'));
                            var $HeatmapOptionsWeightedValue = $('#heatmap-options-weighted-value');
                            var $markerFieldShapeSelect = $('#marker-multiField-shapeField');
                            $markerFieldShapeSelect.append($('<option></option>').attr('value','--'+MASystem.Labels.MA_None+'--').text('--'+MASystem.Labels.MA_None+'--'));
                            var $markerFieldColorSelect = $('#marker-multiField-colorField');
                            $markerFieldColorSelect.append($('<option></option>').attr('value','--'+MASystem.Labels.MA_None+'--').text('--'+MASystem.Labels.MA_None+'--'));
                            var $dynamicLabelColorPicklistField = $('#dynamicLabelColorPicklistField');
                            $markerFieldShapeSelect.attr('data-baseobject', baseObject);
                            $markerFieldColorSelect.attr('data-baseobject', baseObject);
                            $dynamicLabelColorPicklistField.attr('data-baseobject', baseObject);
                            $tooltips.attr('data-baseobject', baseObject);
                            
                            //doc frags to speed up dom manipulation
                            var tooltipFrag = document.createDocumentFragment();
                            var numberTooltipFrag = document.createDocumentFragment();
                            // create frags
                            $.each(response.data.tooltipOptions || [], function (index, option) {
                                var isReference = 'false';
                                if(option.displayType == 'reference') {
                                    option.label = option.label + ' (Lookup)';
                                    isReference = 'true';
                                }

                                // create option frag
                                var opt = document.createElement('option');
                                opt.innerHTML = option.label || '';
                                opt.value = option.apiName || '';
                                opt.setAttribute('data-lookup', isReference);

                                // if number, add to num tootips
                                if (option.soapType === 'double' || option.soapType === 'integer') {
                                    numberTooltipFrag.appendChild(opt.cloneNode(true));
                                }
                                tooltipFrag.appendChild(opt);
                            });
                            
                            // add to selects
                            $dynamicLabelColorPicklistField[0].appendChild(tooltipFrag.cloneNode(true));
                            $markerFieldShapeSelect[0].appendChild(tooltipFrag.cloneNode(true));
                            $markerFieldColorSelect[0].appendChild(tooltipFrag.cloneNode(true));
                            // loop over our tooltips and append frags
                            $tooltips.each(function(i,select) {
                                select.appendChild(tooltipFrag.cloneNode(true));
                            });
                            
                            $tooltips.removeAttr('disabled').find('option:first-child').remove();
                            var $toolTip0 = $($tooltips[0]);
                            if ($tooltips.data('baseobject') == 'Case') {
                                $toolTip0.val('CaseNumber');
                            } 
                            else if($tooltips.data('baseobject') == 'WorkOrder') {
                                $toolTip0.val('Subject');
                            }
                            else {
                                $toolTip0.val('Name');
                                if($toolTip0.val() == null) {
                                    $toolTip0.val('--'+MASystem.Labels.MA_None+'--')
                                }
                            }

                            $HeatmapOptionsWeightedValue[0].appendChild(numberTooltipFrag);
                            
                            //update our label text
                            var tooltip1Text = $('#tab-tooltips .tooltip[data-tooltip="tooltip1"] option:selected').text();
                            $('#dynamicLabelWrapper .js-label-tooltip1').text(tooltip1Text);
                            
                            //populate marker color field options
                            //populate marker color field options
                            
                            var $picklistField = $('select.color-picklistfield').data('needToUpdate', query.colorAssignmentType == 'Dynamic, Field');
                            $picklistField.append($('<option></option>').attr('value','--Select a Field--').text('--Select a Field--'));
                            $markerFieldShapeSelect.data('needToUpdate', query.colorAssignmentType == 'Dynamic-multiField');
                            $('#marker-multiField-colorField').data('needToUpdate', query.colorAssignmentType == 'Dynamic-multiField');
                            
                            //
                            // added for new feature to do colot assignments on dynamic label. for dynamic label, load color assigment grid with saved data
                            // $markerFieldColorSelect.data('needToUpdate', query.colorAssignmentType == 'Dynamic-Label');
                            $('#dynamicLabelColorPicklistField').data('needToUpdate', query.colorAssignmentType == 'Dynamic-Label');
                            
                            
                            $('select.color-picklistfield').attr('data-baseobject', baseObject);
                            $.each(response.data.picklistOptions || [], function (index, option) {
                                /**March Release 2016*/                         
                                
                                $('<option></option>').attr('value', option.apiName).attr('data-lookup','baseobject field').text(option.label).appendTo($picklistField);
                                if(option.displayType == 'reference') {                                    
                                    $('<option></option>').attr('value', option.apiName).attr('data-lookup',"lookup").text(option.label + ' (Lookup)').appendTo($picklistField);
                                }
                            });
                            /**End March Release*/
                            $picklistField.removeAttr('disabled').find('option:first-child').remove();
                            
                            //populate marker image options
                            var $markerImageFields = $('select.markertype-image');
                            $.each(response.data.markerImageOptions || [], function (index, option) {
                                $('<option></option>').attr('value', option.itemValue).text(option.itemLabel).appendTo($markerImageFields);
                            });
                            $markerImageFields.removeAttr('disabled').find('option:first-child').remove();
                            $('.Static .markertype-image').combobox();
                            
                            //populate related list options
                            var $relatedListOptions = $('#MarkerLayerRelatedList-addnew-object').html('<option value="--">--'+MASystem.Labels.MA_Add_New+'--</option>');
                            var relatedFrag = document.createDocumentFragment();
                            $.each(response.data.crossObjectOptions || [], function (index, option) {
                                var optFrag = document.createElement('option');
                                optFrag.value = option.itemValue;
                                optFrag.innerHTML = option.itemLabel;
                                relatedFrag.appendChild(optFrag);
                            });
                            $relatedListOptions[0].appendChild(relatedFrag);
                            $relatedListOptions.removeAttr('disabled').select2();
                    
                            //populate existing data for this query if we have it
                            if (query.id != null || query.isClone)
                            {
                                //tooltips
                                $('#savedqueryeditor .tooltip').each(function () {
                                    /**March Release 2016*/
                                    var toolTipValue = query[$(this).attr('data-tooltip')];
                                    var renderParentOptions = false;
                                    var toolTipValueArray = [];

                                    if(toolTipValue != null && toolTipValue.indexOf('.') > -1)
                                    {
                                        toolTipValueArray = toolTipValue.split('.');
                                        toolTipValue = toolTipValueArray[0].indexOf('__r') > -1 ? toolTipValueArray[0].replace('__r','__c') : toolTipValueArray[0]+'Id';
                                        renderParentOptions = true;

                                        // if tooltip value is specified but doesn't exist in the available fields remove it
                                        if (fields.findIndex(field => field.apiName === toolTipValue) < 0) {
                                            toolTipValue = undefined;
                                            renderParentOptions = false;
                                        }
                                    }
                                    else if(toolTipValue != null && toolTipValue.indexOf('::') > -1) {
                                        toolTipValueArray = toolTipValue.split('::');
                                        toolTipValue = query.addressObject;
                                        renderParentOptions = true;
                                        if (fields.findIndex(field => field.apiName === toolTipValue) < 0) {
                                            toolTipValue = undefined;
                                            renderParentOptions = false;
                                        }
                                    }
                                    // if tooltip value is specified but doesn't exist in the available fields remove it
                                    else if (fields.findIndex(field => field.apiName === toolTipValue) < 0) {
                                        toolTipValue = undefined;
                                    }

                                    //$(this).val(query[$(this).attr('data-tooltip')]);
                                    $(this).val(toolTipValue || '--'+MASystem.Labels.MA_None+'--');
                                    if(renderParentOptions)
                                    {
                                        updateTooltip($(this).closest('.tooltip'),toolTipValueArray[1]);
                                        $(this).closest('td').find('.parentfieldoptions .combobox').val(toolTipValueArray[1]);
                                }
                                    /*End March Release*/
                                });
                                
                                //update our label text
                                var tooltip1Text = $('#tab-tooltips .tooltip[data-tooltip="tooltip1"] option:selected').text();
                                $('#dynamicLabelWrapper .js-label-tooltip1').text(tooltip1Text);
                                
                                //color assignment type
                                $('.color-assignmenttype').val(query.colorAssignmentType).change();
                                if (query.colorAssignmentType == 'Dynamic-Order')
                                {
                                    try {
                                        $('.order-drawline').prop('checked', JSON.parse(query.colorAssignment).drawLine);
                                    }
                                    catch (err) { }
                                }
                                
                                //icon color
                                try {
                                    if (query.iconColor.indexOf('image:') == 0) {
                                        $('.colormarker .Static .markertype-selector-image').click();
                                        $('.colormarker .Static .markertype-image').val(query.iconColor.split('image:')[1]).next().find('input').val($('.colormarker .Static .markertype-image').find('option:selected').text());
                                    }
                                    else {
                                        $('.colormarker .Static .markertype-selector-color').click();
                                        $('.colormarker .Static .markertype-color-preview').attr('data-color', query.iconColor).html(MAMarkerBuilder.createSVG({ color: query.iconColor, forLegend: true }));
                                    }
                                } catch (err) { 
                                    $('.colormarker .Static .markertype-selector-color').click();
                                }
                                try {
                                    
                                }
                                catch (err) { }
                                //$('.color-picklistfield').val(query.picklistField).change();
                                /**March Release 2016*/
                                    var picklistfield = query.picklistField;
                                    var shapePicklistField = query.shapePicklistField;
                                    var renderParentOptions = false;
                                    var renderShapeParentOptions = false;
                                    var shapepicklistfieldArray = [];
                                    var picklistfieldArray = [];
                                    
                                    if(picklistfield != null && picklistfield.indexOf('.') > -1)
                                    {                                    
                                        picklistfieldArray = picklistfield.split('.');
                                        picklistfield = picklistfieldArray[0].indexOf('__r') > -1 ? picklistfieldArray[0].replace('__r','__c') : picklistfieldArray[0]+'Id';
                                        renderParentOptions = true;
                                    } else if(picklistfield != null && picklistfield.indexOf('::') > -1)
                                    {                                    
                                        picklistfieldArray = picklistfield.split('::');
                                        picklistfield = query.addressObject;
                                        renderParentOptions = true;
                                    }
                                    if(shapePicklistField != null && shapePicklistField.indexOf('.') > -1)
                                    {                                    
                                        shapepicklistfieldArray = shapePicklistField.split('.');
                                        shapePicklistField = shapepicklistfieldArray[0].indexOf('__r') > -1 ? shapepicklistfieldArray[0].replace('__r','__c') : shapepicklistfieldArray[0]+'Id';
                                        renderShapeParentOptions = true;
                                    } else if(shapePicklistField != null && shapePicklistField.indexOf('::') > -1)
                                    {                                    
                                        shapepicklistfieldArray = shapePicklistField.split('::');
                                        shapePicklistField = query.addressObject;
                                        renderShapeParentOptions = true;
                                    }

                                    if(renderParentOptions)
                                    {	
                                        if(query.colorAssignmentType == 'Dynamic-multiField')
                                        {
                                            $('#marker-multiFieldParent-colorField').data('needToUpdate', true);
                                            $('#marker-multiField-colorField').val(picklistfield);
                                            updateMultiField($('#marker-multiField-colorField'),picklistfieldArray[1]);
                                        } 
                                        else if(query.colorAssignmentType == 'Dynamic-Label')
                                        {
                                            $('#dynamicLabelColorPicklistParentField').data('needToUpdate', true);
                                            $('#dynamicLabelColorPicklistField').val(picklistfield).change();
                                            updateMultiField($('#dynamicLabelColorPicklistField'), picklistfieldArray[1]);
                                        } 
                                        else { 
                                            $('.color-picklistparentfield').data('needToUpdate', true);
                                            // make sure we grab the lookup field
                                            $('.color-picklistfield').not('.dynamicLabel').find('option[value="'+picklistfield+'"][data-lookup="lookup"]').prop('selected', true);
                                            //$('.color-picklistfield').not('.dynamicLabel').val(picklistfield);
                                            updateColorPicklistField($('.color-picklistfield').not('.dynamicLabel'),null,function() {
                                                updateColorPicklistField($('.color-picklistfield').not('.dynamicLabel'),picklistfieldArray[1],function(){
                                                    //var advancedOptions = query.advancedOptions || {};
                                                    if (query.advancedOptions.automaticassign)
                                                    {
                                                        $('#advanced-reference-option-automaticassign').prop('checked', query.advancedOptions.automaticassign == 'true' ? true : false);
                                                    }
                                                    if (query.advancedOptions.otherthreshold)
                                                    {
                                                        $('#advanced-reference-option-otherthreshold').val(query.advancedOptions.otherthreshold);
                                                    }
                                                });
                                            });
                                        }                               
                                        
                                    } else {
                                        var option;
                                        
                                        if(query.colorAssignmentType == 'Dynamic-multiField')
                                        {
                                        
                                            $('#marker-multiField-colorField option').each(function() {
                                                if($(this).attr('value') == picklistfield && $(this).attr('data-lookup') != 'lookup')
                                                {
                                                    
                                                    //$(this).prop('selected',true);
                                                    $(this).attr('selected','selected');
                                                    
                                                }
                                            });
                                    
                                            $('#marker-multiField-colorField').change();
                                        } 
                                        else if(query.colorAssignmentType == 'Dynamic-Label')
                                        {
                                            $('#dynamicLabelColorPicklistField option').each(function(){
                                                if($(this).attr('value') == picklistfield && $(this).attr('data-lookup') != 'lookup')
                                                {
                                            
                                                    //$(this).prop('selected', true);
                                                    $(this).attr('selected','selected');
                                                }
                                            });
                                            $('#dynamicLabelColorPicklistField').change();
                                        } 
                                        else {
                                            var currentIndex = 0;
                                            var selectedIndex = 0;
                                            $('.color-picklistfield').not('.dynamicLabel').find('option').each(function() {
                                                if($(this).attr('value') == query.picklistField && $(this).attr('data-lookup') == 'baseobject field')
                                                {
                                                    selectedIndex = currentIndex;
                                                }
                                                else {
                                                    $(this).removeAttr('selected');
                                                }
                                                currentIndex ++
                                            });
                                            
                                            $('.color-picklistfield').not('.dynamicLabel').prop('selectedIndex', selectedIndex);
                                                                        
                                            $('.color-picklistfield').not('.dynamicLabel').change();
                                        }
                                    }
                                
                                    if(renderShapeParentOptions)
                                    {
                                        $('#marker-multiFieldParent-shapeField').data('needToUpdate', true);
                                        $('#marker-multiField-shapeField').val(shapePicklistField);
                                        updateMultiField($('#marker-multiField-shapeField'), shapepicklistfieldArray[1]);
                                    } 
                                    else if(query.colorAssignmentType == 'Dynamic-multiField') {
                                        $('#marker-multiField-shapeField option').each(function() {
                                            if($(this).attr('value') == shapePicklistField && $(this).attr('data-lookup') != 'lookup')
                                            {
                                                
                                                $(this).attr('selected','selected');
                                                
                                            }
                                        });
                                        $('#marker-multiField-shapeField').change();
                                        
                                    }
                                    /*End March Release*/
                                if (query.advancedOptions.heatmapWeightedValue)
                                {
                                    $('#heatmap-options-weighted-value').val(query.advancedOptions.heatmapWeightedValue).change();
                                    $('#heatmap-options-dissipate-with-zoom').prop('checked', query.advancedOptions.heatmapDissipating == 'true' ? true : false);
                                    $('#heatmap-options-radius').val(query.advancedOptions.heatmapRadius);
                                    $('#heatmap-options-opacity').val(query.advancedOptions.heatmapOpacity);
                                    $('#heatmap-options-max-intensity').val(query.advancedOptions.heatmapMaxIntensity);
                                    
                                    $( "#heatmap-options-color-table" ).empty();
                                    
                                    //javascript:AddColorRow('#FFFFFF')
                                    
                                    $.each(JSON.parse(query.advancedOptions.heatmapGradient), function( index, value ) {
                                        AddColorRow(value, index);
                                    });
                                    
                                }
                                
                            }
                            else
                            {
                                //no existing query so set defaults
                                $('.Static .markertype-selector-color').click();
                                if (query.baseObject == 'Task' || query.baseObject == 'Event') {
                                    $('#savedqueryeditor .tooltip').first().val('Subject');
                                }
                            }
                            
                            //if we don't have a picklist field selected yet, pick the first option
                            if ($picklistField.val() == '') { $picklistField.val($picklistField.find('.option:first-child').val()); }
                            
                            //render comboboxes
                            $('#savedqueryeditor .color-assignmenttype').select2();
                            $picklistField.select2();
                            $tooltips.select2({'width':'250px'});
                            $HeatmapOptionsWeightedValue.select2();
                            $markerFieldShapeSelect.select2();
                            $markerFieldColorSelect.removeAttr('disabled').select2();
                            $dynamicLabelColorPicklistField.removeAttr('disabled').select2();
                            //$('#dynamicStaticShapeInput').select2();
                            $('#select2-dynamicStaticShapeInput-container').parent().css('min-width','125px');
                            
                            
                            if ( !(query.id != null || query.isClone) && /live/i.test( savedQueryInfo.baseObjectType ) ) // forced comment
                            {
                                if($('select option:contains("Front Truck 5")').size() > 0) // default the live marker image to 'Front Truck 5'
                                {
                                    var $markerTypeWrapper = $('#savedqueryeditor .markertype-wrapper.first-level-markertype-selector');
                                    
                                    $markerTypeWrapper.find('.markertype-color-preview').hide();
                                    $markerTypeWrapper.find('.markertype-image').next().show();
                                    $markerTypeWrapper.find('.ui-combobox > input').next().show();
                                    
                                    // set default marker for live layer under Marker tab
                                    $markerTypeWrapper.find('select option:contains("Front Truck 5")').prop('selected', true);
                                    $markerTypeWrapper.find('input').val($('.markertype-wrapper select option:contains("Front Truck 5")').eq(0).text()); 
                                    
                                    // remove dymanic-label combobox option in Marker tab
                                    $('.color-assignmenttype option[value="Dynamic-Order"]').remove(); 
                                }
                            }
                        }
                        else if (event.type === 'exception') {
                            //show error
                            MA.log(event.message + '::' + event.where);
                        } 
                        else {
                            //show error
                            MA.log(event.message);
                        }
                    }, {buffer:false,escape:false, timeout: 120000}
                );
            } else {
                console.warn(res.message);
            }
        });

        //handle adding new filters
        $('.htab-content-button.add').click(function () {
            if ($(this).closest('.htab-content').is('.fieldfilters'))
            {
                var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($('.fieldfilters > .listbox'))
                $loader.slideDown(
                    200,
                    function ()
                    {
                        var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', baseObject);
                        $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', MA.SObject.nameField(baseObject)));
                        $newFilter.find('.fieldoptions .combobox').val('Name');
                        
                        updateFilter($newFilter, $loader);
                    }
                );
            }
            else if ($(this).closest('.htab-content').is('.crossfilters'))
            {
                //make sure this object has a valid child relationship
                if (query.initialCrossObject == null || query.initialCrossField == null)
                {
                    alert(MASystem.Labels.MA_Base_Object_Child_Error);
                    return;
                }
                
                //make sure we don't already have 2 cross filters
                if ($('.crossfilters .listbox > div').length > 1)
                {
                    alert(MASystem.Labels.MA_Cross_Filters_Allowed_Error);
                    return;
                }
                
                var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($('.crossfilters .listbox'));
                $loader.slideDown(
                    200,
                    function ()
                    {
                        var $newCrossFilter = $('.crossfilter.template').clone().removeClass('template').attr('data-baseobject', baseObject).attr('data-index', 'AND');
                        $newCrossFilter.find('.fieldlabel .baseobject').text(query.baseObjectName);
                        $newCrossFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', 'Id'));
                        $newCrossFilter.find('.fieldoptions .combobox').val('Id');
                        $newCrossFilter.find('.crossobjectoptions .combobox').append($("<option></option>").attr('value', query.initialCrossObject));
                        $newCrossFilter.find('.crossobjectoptions .combobox').val(query.initialCrossObject);
                        $newCrossFilter.find('.crossfieldoptions .combobox').append($("<option></option>").attr('value', query.initialCrossField));
                        $newCrossFilter.find('.crossfieldoptions .combobox').val(query.initialCrossField);
                        
                        updateCrossFilter($newCrossFilter, $loader);
                    }
                );
            }
        });
        
        //date control functions
        $('#savedqueryeditor').on('keyup', '.datejs', function (event)
        {
            //don't parse on enter because it is probably an autocomlete selection and can't change the value if it isn't
            if (event.which == 13) { return; }
            
            //don't validate controls that are marked as novalidation
            if ($(this).is('.novalidation')) { return; }
            
            //validate the input
            parseDateInput($(this));
        });
        
        $('#savedqueryeditor').on('click', '.dateliteralpicker', function () 
        {
            //open the date literal autocomplete list when clicking the date literal picker icon
            $(this).siblings('.datejs').autocomplete("search", "").focus();
            $('.ui-front').removeClass('ui-front');
        });
        
        //on blur, set the text value of floating point inputs to the parsed value just to avoid little issues like '2.' being valid (2. parses to 2)
        $('#savedqueryeditor').on('blur', '.NUMBER, .CURRENCY, .DOUBLE, .PERCENT', function ()
        {
            if ($(this).val() != '')
            {
                if ($(this).is('.CURRENCY'))
                {
                    $(this).val($(this).val().replace(/,/g,''));
                    $(this).val(parseFloat($(this).val()));
                }
            }
        });
        
        //validation for numeric fields
        $('#savedqueryeditor').on('keyup change', '.INTEGER, .NUMBER, .CURRENCY, .DOUBLE, .PERCENT', function () 
        {
            var isValid = true;
            
            //blank is valid for all numeric fields unless the operator is range (because null is invalid with > and <)
            if ($(this).val() == '')
            {
                if ($(this).closest('.filter').find('.operator .combobox').val() == 'range')
                {
                    isValid = false;
                }
            }
            else
            {
                if ($(this).is('.INTEGER'))
                {
                    if (isNaN(parseInt($(this).val())))
                    {
                        isValid = false;
                    }
                    else
                    {  
                        //on a successful parse, set the text value to the parsed value just to avoid little issues like '2.' being valid (2. parses to 2)
                        $(this).val(parseInt($(this).val()));
                        
                    }
                }
                else
                {
                    if (isNaN(parseFloat($(this).val())))
                    {
                        isValid = false;
                    }
                }
            }
            
            if (isValid)
            {
                $(this).removeClass('invalid');
            }
            else
            {
                $(this).addClass('invalid');
            }
        });
        
        /**************************************
        *   March Release 2016
        **************************************/
        $('#savedqueryeditor').on('change','.tooltips .fieldoptions .combobox, .tooltip .parentfieldoptions .combobox',function(){
            updateTooltip($(this).closest('.tooltip'));
        });
        
        
        $('.color-picklistfield').on('change',function() {             	
            updateColorPicklistField($(this));
        });
        
        
        // handle dynamic/static marker shape toggle under the Marker Tab. If static shape is selected, display the shape picker, oterwise hide
        $('#savedqueryeditor').on('change', '#dynamicStaticShapeInput', function(e) {
            if( $(this).val() == 'static' ) {
                $('#dynamicShapePicker').attr('data-color', '#00FF00:Marker').html(MAMarkerBuilder.createSVG({ forLegend: true })).show();
            } else if( $(this).val() == 'dynamic' ) {
                $('#dynamicShapePicker').attr('data-color', null).hide();
            }
        });
        
        
        /**$('.multiField').on('change',function(){             	
            //updateMultiField($(this));
        });*/
        /*End March Release*/
        
        /**********************************teddy***************************/
        $('#savedqueryeditor').on('load', function() {
            if(/live/i.test(savedQueryInfo.baseObjectType)) // default the live marker image to 'Front Truck 5'
            {
                if($('select option:contains("Front Truck 5")').size() > 0) 
                {
                    $('.markertype-wrapper').find('.markertype-color-preview').hide();
                    $('.markertype-wrapper').find('.markertype-image').next().show();
                    $('.markertype-wrapper').find('.ui-combobox > input').next().show();
                    $('.markertype-wrapper').find('.markertype-selector-image').click();
                }
            }
        });
        /**********************************teddy***************************/
        
        /**************************************
         *  FILTER HANDLERS
         **************************************/
        
        //filter delete link
        $('#savedqueryeditor').on('click', '.filter .deletelink', function () 
        {
            $(this).closest('.filter').slideUp(
                500, 
                function () { 
                    $(this).remove();
                    refreshIndices();
                    refreshCrossIndices();
                    refreshBadges();
                    runPolymorphicFilterCheck();
                }
            ); 
        });
        
        
        $('#removeFiltersLink').click(function ()
        {
            $('#queryfilters .filter .deletelink, #queryfilters .crossfilter .deletelink').click();
        });
        
        //handling selecting a new field for a filter
        $('#savedqueryeditor').on('change', '.filter .fieldoptions .combobox, .filter .parentfieldoptions .combobox, .filter .grandparentfieldoptions .combobox', function ()
        {
            updateFilter($(this).closest('.filter'));
        });
        
        //handling selecting a new operator for a filter
        $('#savedqueryeditor').on('change', '.filter .operator .combobox', function ()
        {
            var $updatedFilter = $(this).closest('.filter');
        
        	//handle the range operator
            if ($(this).val() == 'range')
            {
                $updatedFilter.find('.range').show(500);
                $updatedFilter.find('.nextlast').hide(500);
            }
            else if ($(this).val() == 'next' || $(this).val() == 'last')
            {
                $updatedFilter.find('.range').hide(500);
                $updatedFilter.find('.nextlast').show(500);
            }
            else
            {
                $updatedFilter.find('.range').hide(500);
                $updatedFilter.find('.nextlast').hide(500);
            }
            
            //handle the in and not in operators
            if ($(this).val() == 'in' || $(this).val() == 'not in')
            {
            	$updatedFilter.find('.idfiltervalue').hide();
            	$updatedFilter.find('.queryfiltervalue').show();
            }
            else
            {
            	$updatedFilter.find('.queryfiltervalue').hide();
            	$updatedFilter.find('.idfiltervalue').show();
            }
            
            //the range operator affects validity so revalidate
            $updatedFilter.find('.value input').change();
        });
        
        //filter logic link
        $('#savedqueryeditor .filterlogiclink').click(function()
        {
            if ($(this).text() == MASystem.Labels.MA_Add)
            {
                var filterArr = [];
                $('.fieldfilters .filter').each(function () { filterArr.push($(this).find('.indexlabel').text()); } );
                $('.filterlogic').val('(' + filterArr.join(' AND ') + ')').show(500);
                $(this).text(MASystem.Labels.MA_Remove);
            }
            else
            {
                $('.filterlogic').hide(500);
                $(this).text(MASystem.Labels.MA_Add);
            }
        });
        
        /************************************
         *  CROSS FILTER HANDLERS
         ************************************/
        
        //handle changing field on a cross filter
        $('#savedqueryeditor').on('change', '.crossfilter > table .fieldoptions .combobox, .crossfilter .crossobjectoptions .combobox', function ()
        {
        	//remove all subfilters if the cross object is changing
        	if ($(this).is('.crossobjectoptions .combobox')) {
        		$(this).closest('.crossfilter').find('.subfilters .filter .deletelink').click();
        	}
        
            updateCrossFilter($(this).closest('.crossfilter'));
        });
        
        //handle clicking links on a cross filter
        $('#savedqueryeditor').on('click', '.crossfilter .crossfilteractions span.link', function ()
        {
            if ($(this).text() == 'Show Advanced')
            {
                $(this).closest('.crossfilter').find('.advanced').show('slide');
                $(this).text('Hide Advanced');  
            }
            else if ($(this).text() == 'Hide Advanced')
            {
                $(this).closest('.crossfilter').find('.advanced').hide('slide');
                $(this).text('Show Advanced');  
            }
            else if ($(this).text() == MASystem.Labels.MA_Delete)
            {
                $(this).closest('.crossfilter').slideUp(
                500, 
                function () { 
                    $(this).remove();
                    refreshIndices();
					refreshCrossIndices();
                    refreshBadges();
                }
            ); 
            }
        });
        
        //handle subfilter links
        $('#savedqueryeditor').on('click', '.crossfilter .addfilter span.link', function ()
        {
            var $updatedCrossFilter = $(this).closest('.crossfilter');
        
            var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($updatedCrossFilter.find('.subfilters'));
            $loader.slideDown(
                200,
                function ()
                {
                    var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', $updatedCrossFilter.find('.crossobjectoptions .combobox').val());
                    updateFilter($newFilter, $loader);
                }
            );
        });
        
        //crossfilter logic link
        $('#savedqueryeditor').on('click', '.crossfilterlogiclink', function ()
        {
            if ($(this).text() == MASystem.Labels.MA_Add)
            {
                var crossfilterArr = [];
                $(this).closest('.crossfilter').find('.subfilters > .filter').each(function () { crossfilterArr.push($(this).find('.indexlabel').text()); } );
                $(this).closest('.crossfilterlogic').find('.crosslogic').val('(' + crossfilterArr.join(' AND ') + ')').show(500);
                $(this).text(MASystem.Labels.MA_Remove);
            }
            else
            {
                $(this).closest('.crossfilterlogic').find('.crosslogic').hide(500);
                $(this).text(MASystem.Labels.MA_Add);
            }
        });
        
        /*******************************
         * ADVANCED FILTER HANDLERS
         *******************************/
        //enable disable limits with checkbox
        $('.limit-proximity-enabled').click(function()
        {
            if ($(this).is(':checked'))
            {
            	$(this).closest('.htab-content-body').find('.distance-value').removeAttr('disabled', 'disabled');
        		$(this).closest('.htab-content-body').find('.distance-type').removeAttr('disabled', 'disabled');
        		$(this).closest('.htab-content-body').find('.address-value').removeAttr('disabled', 'disabled');
        		refreshBadges();
            }
            else
            {
            	$(this).closest('.htab-content-body').find('.distance-value').attr('disabled', 'disabled');
        		$(this).closest('.htab-content-body').find('.distance-type').attr('disabled', 'disabled');
        		$(this).closest('.htab-content-body').find('.address-value').attr('disabled', 'disabled');
        		refreshBadges();
            }
        });
        
        $(".advanced-route-disablewaypoints").change(function() {			        
			if(this.checked)		
        	{		
    			$('.advanced-route-options-inputs').show();		
			} else {		
                $('.advanced-route-options-inputs').hide();		
            }		
		});
        //enable disable record limits
        $('.limit-records-enabled').click(function()
        {
            if ($(this).is(':checked'))
            {
            	$(this).closest('.htab-content-body').find('.limits-rowcount-value').removeAttr('disabled', 'disabled');
            	refreshBadges();
            }
            else
            {
            	$(this).closest('.htab-content-body').find('.limits-rowcount-value').attr('disabled', 'disabled');
            	refreshBadges();
            }
        });
        
        /*******************************
         *  ACTIVITY FILTER HANDLERS
         *******************************/
        //handle changing activity filters
        $('.filterbyactivity .activityfilter-task, .filterbyactivity .activityfilter-event').change(function () {
            var activityType = $(this).closest('.activityfilter-wrapper').attr('data-type');
            if ($(this).val() == 'all') {
                $('.activitysubfilters-wrapper[data-type="'+activityType+'"]').slideUp(400);
            } else {
                $('.activitysubfilters-wrapper[data-type="'+activityType+'"]').slideDown(400);
            }
            refreshBadges();
        });
        
        $('.activitysubfilters-wrapper .link.addfilter').click(function () {
            var baseObject = $(this).closest('.activitysubfilters-wrapper').attr('data-type') == 'task' ? 'Task' : 'Event';
            var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($(this).closest('.activitysubfilters-wrapper').find('.subfilters'));
            $loader.slideDown(
                200,
                function ()
                {
                    var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', baseObject);
                    $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', 'Subject'));
                    $newFilter.find('.fieldoptions .combobox').val('Subject');
                    
                    updateFilter($newFilter, $loader);
                }
            );
        });
        
        /******************************
        *	FILTER BY OWNER AND SCOPE HANDLERS
        ********************************/
        
        //init the combobox for the owner specifier
        $('.filterbyowner-owner').select2();
        
        //populate dynamic owner options
        var $ownerField = $('.filterbyowner-ownerfield').empty();
        $.each(JSON.parse($('[id$=":serializedFilterByOwnerOptions"]').val()), function (index, option) {
        	$ownerField.append($('<option />').attr('value', option.value).text(option.label));
        });
        $ownerField.val('OwnerId').select2();
        
        //handle changing filter by owner
        $('input[type="radio"][name="filterByOwner"]').click(function () {
        	if ($('input[type="radio"][name="filterByOwner"]:checked').attr('value') == 'TRUE') {
        		$('.filterbyowner-ownerfield-wrapper').slideDown(400);
        	} 
        	else {
        		$('.filterbyowner-ownerfield-wrapper').slideUp(400);
        	}
        });

        // if the base object does not support the scope filters, disable
        var $filterWrap = $('#filterWrapper');
        var myTerritoryScope = getProperty(query || {}, 'scopeFilterOptions.My_Territory', false) || false;
        if (!myTerritoryScope) {
            $filterWrap.find('.customScope[data-type="My_Territory"]').attr('disabled', 'disabled');
        }
        var myTeamTerritoryScope = getProperty(query || {}, 'scopeFilterOptions.My_Team_Territory', false) || false;
        if (!myTeamTerritoryScope) {
            $filterWrap.find('.customScope[data-type="My_Team_Territory"]').attr('disabled', 'disabled');
        }
        
        /*****************************
        *  Jquery Sort Function
        *****************************/
		
		jQuery.fn.sortElements = (function(){

		    var sort = [].sort;
		    return function(comparator, getSortable) {
		        getSortable = getSortable || function(){return this;};

		        var placements = this.map(function(){
		            var sortElement = getSortable.call(this),
		                parentNode = sortElement.parentNode,
		                // Since the element itself will change position, we have
		                // to have some way of storing its original position in
		                // the DOM. The easiest way is to have a 'flag' node:
		                nextSibling = parentNode.insertBefore(
		                    document.createTextNode(''),
		                    sortElement.nextSibling
		                );

		            return function() {

		                if (parentNode === this) {
		                    throw new Error(
		                        "You can't sort elements if any one is a descendant of another."
		                    );
		                }

		                // Insert before flag:
		                parentNode.insertBefore(this, nextSibling);
		                // Remove flag:
		                parentNode.removeChild(nextSibling);

		            };

		        });

		        return sort.call(this, comparator).each(function(i){
		            placements[i].call(getSortable.call(this));
		        });

		    };

		})();
        
        /*****************************
        *  COLOR MARKER HANDLERS
        *****************************/

        //handle changing assignment type
        $('.color-assignmenttype').change(function () {
            var $select = $(this);
            var assignmentType = $select.val();
            
            //uncheck the auto assign remaining checkbox and set value to blank
            $('#advanced-reference-option-automaticassign').prop('checked',false);
            $('#advanced-reference-option-otherthreshold').val('');
            $('#advanced-reference-options').hide();
            if(assignmentType === 'Dynamic-multiField') {
                $('#advanced-reference-option-automaticassign').prop('checked',false);
            } else if(assignmentType === 'Dynamic-Label') {
                $('#dynamicLabelAutoAssign').prop('checked', false);
            }
            
            $('.color-options tr.toggle').hide().filter('.'+$(this).val()).show();
            $('.color-picklistfield').val('--Select a Field--').change().next().find('input').val('--Select a Field--');
        });
        
        //handle changing picklist field
        $('.color-picklistfield').change(function () {
            var $that = $(this);
            
            var $colorPicklistTR = $(this).closest('tr');
            
            // $('.color-picklistvalues').empty().show();
            $colorPicklistTR.find('.color-picklistvalues').empty().show();
            
            if ($(this).val() == '--Select a Field--' || $('option:selected', $(this)).attr('data-lookup') == 'lookup')
            {
                // no field is selected, hide the marker grid
                // $('.color-picklistvalues').hide();
                $colorPicklistTR.find('.color-picklistvalues').hide();
            }
            else
            {
                var needToUpdate = $(this).data('needToUpdate');
                $(this).data('needToUpdate', false);
                $('#savedqueryeditor .buttons .msgs').hide();

                var processData = {
                    ajaxResource : 'QueryBuilderAPI',
                    
                    action: 'getFieldMarkerMetaData',
                    baseObject: baseObject,
                    fieldName: $(this).val()
                };

                //ADDED LOADING SPINNER
                showLoading($('#queryeditor-modal'),'loading');
                $('#tab-markers .markergrid-wrapper').remove();
                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                    processData,
                    function(response, event){
                        //CLOSED LOADING SPINNER
                        hideMessage($('#queryeditor-modal'));
                        if(event.status) {
                            if($that.hasClass('dynamicLabel'))
                            {
                                $('.color-picklistvalues').data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions, gridType : 'colors' }));
                                // $('.marker-multifieldColorValues').data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions, gridType : 'colors' }));
                            }
                            else
                            {
                                $('.color-picklistvalues').data('markerGrid', new MarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions }));
                            }
                            
                            // $('.color-picklistvalues').data('markerGrid').el.appendTo($('.color-picklistvalues'));
                            $colorPicklistTR.find('.color-picklistvalues').data('markerGrid').el.appendTo( $colorPicklistTR.find('.color-picklistvalues') );
                            
                            var fieldType = response.data.fieldType;
                            //if (response.data.fieldType == "REFERENCE" || response.data.fieldType == "STRING" || response.data.fieldType == "ID" || respnose.data.fieldType)
                            if (fieldType == "REFERENCE" || fieldType == "STRING" || fieldType == "ID")// || fieldType == 'PICKLIST')
                            {
                                // $("#advanced-reference-options").show();
                                $colorPicklistTR.find("#advanced-reference-options").show();
                                $('#tab-markers .markergrid-wrapper').height(125);

                            }
                            else
                            {
                                // $("#advanced-reference-options").hide();
                                // $("#advanced-reference-option-automaticassign").attr('checked',false);
                                
                                $colorPicklistTR.find("#advanced-reference-options").hide();
                                $colorPicklistTR.find("#advanced-reference-option-automaticassign").prop('checked',false);
                            }
                            
                        }
                    },{buffer:false,escape:false}
                );
            }
		});
		
        /**March Release 2016*/
		$('.color-picklistparentfield').change(function () {
		    var $colorPicklistParentTR = $(this).closest('tr');
		    var $that = $(this);
		    var $colorPicklistParentTD = $(this).closest('td');
		    
            // var $select = $('.color-picklistvalues');
            var $select = $colorPicklistParentTR.find('.color-picklistvalues');
            
            var fieldType = $select.attr('data-fieldtype');
            if (fieldType == "REFERENCE" || fieldType == "STRING" || fieldType == "ID")// || fieldType == 'PICKLIST')
        	{
        	    // $("#advanced-reference-options").show();
                $colorPicklistParentTR.find("#advanced-reference-options").show();
                $colorPicklistParentTR.find('.markergrid-wrapper').height(125);
        	}
        	else
        	{
        	    // $("#advanced-reference-options").hide();
        	    // $("#advanced-reference-option-automaticassign").attr('checked',false);
        	    
        	    $colorPicklistParentTR.find("#advanced-reference-options").hide();
        	    $colorPicklistParentTR.find("#advanced-reference-option-automaticassign").prop('checked',false);
        	}

            $select.empty().show();
            if ($select.val() == '--Select a Field--')
            {
                //no field is selected, hide the marker grid
                $select.hide();
            }
            else
            {
                var needToUpdate = $select.data('needToUpdate') || $(this).data('needToUpdate');
                $select.data('needToUpdate', false);
                $('#savedqueryeditor .buttons .msgs').hide();
				
                var processData = {
                    ajaxResource : 'QueryBuilderAPI',
                    
                    action: 'getFieldMarkerMetaData',
                    baseObject: $(this).attr('data-currentbaseobject'),
                    fieldName: $(this).val()
                };

                //ADDED LOADING SPINNER
                showLoading($('#queryeditor-modal'),'loading');
                $('#tab-markers .markergrid-wrapper').remove();
                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                    processData,
                    function(response, event){
                        //CLOSED LOADING SPINNER
                        hideMessage($('#queryeditor-modal'));
                        if(event.status) {
                            
                            if($that.hasClass('dynamicLabel'))
                            {
                                $('.color-picklistvalues').data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions, gridType : 'colors' }));
                                // $('.marker-multifieldColorValues').data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions, gridType : 'colors' }));
                            }
                            else
                            {
                                $('.color-picklistvalues').data('markerGrid', new MarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions }));
                            }
                            
                            // $('.color-picklistvalues').data('markerGrid').el.appendTo($('.color-picklistvalues'));
                            $select.data('markerGrid').el.appendTo( $colorPicklistParentTR.find('.color-picklistvalues') );
                            
                            if (response.data.fieldType == "REFERENCE" || response.data.fieldType == "STRING")
                            {
                                $colorPicklistParentTR.find("#advanced-reference-options").show();
                                $colorPicklistParentTR.find('.markergrid-wrapper').height(125);
                            }
                            else
                            {
                                $colorPicklistParentTR.find("#advanced-reference-options").hide();
                            }
                            
                        }
                    },{buffer:false,escape:false}
                );
            }
		});
        
        /**March Release 2016*/
        //handle changing picklist field
        $('#savedqueryeditor').on('change', '.multiField', function () {
            var $select = $(this);
            //if this is a dynamic label, check if static is selected...
            var queryType = $('#savedqueryeditor .color-assignmenttype').val() || '';
            if(queryType.toLowerCase() == 'dynamic-label') {
                var fieldSelection = $('#dynamicLabelColorPicklistField').val();
                var $staticLab = $('.dynamicLabelWrapper .js-label-static').hide();
                var $dynamicLab = $('.dynamicLabelWrapper  .js-label-dynamic').show();
                if(fieldSelection == '--None--' || fieldSelection == '-'+MASystem.Labels.MA_None+'-' || fieldSelection == '-MASystem.Labels.MA_None-') {
                    //show show the static options and hide dynamic
                    $staticLab.show();
                    $dynamicLab.hide();
                    return;
                }
                /********************************************************************/
                // Fix for dynamic labels color assignment (Lookup only)
                var $parentFieldSelect = $select.closest('td').find('.parentfieldoptions select').empty();
                var $comboBox = $parentFieldSelect.closest('.parentfieldoptions').find('.select2-container');
                var query = JSON.parse($('[id$="serializedQuery"]').val());
                var picklistfield = query.picklistField;
    
                if(picklistfield != null && (picklistfield.indexOf('.') > -1 || picklistfield.indexOf('::') > -1) && !$comboBox.data()) {  
                    updateMultiField($select);
                    // Don't render a new marker assignment grid
                    return;                                  
                }
                /********************************************************************/
            } 
            updateMultiField($select);
           
            
			var picklistValues = $select.closest('td').find('.multiField').attr('id') == 'marker-multiField-shapeField' ? '.marker-multifieldShapeValues' : '.marker-multifieldColorValues';

            var markerGridType = picklistValues == '.marker-multifieldShapeValues' ? 'shapes' :'colors';
            
            if($select.hasClass('dynamicLabel'))
			{
			    markerGridType = 'colors';
			}
			
            var $picklistValues = $select.closest('.multiFieldsTable').closest('tr').find(picklistValues);
            
            $picklistValues.empty().show();
            if ($select.val() == '--Select a Field--' || $('option:selected',$select).attr('data-lookup') == 'lookup' || String($select.val()).trim().indexOf('--') == 0)
            {
                // no field is selected, hide the marker grid
                $picklistValues.hide();
            }
            else
            {
                
                var needToUpdate = $select.data('needToUpdate');
                
                $select.data('needToUpdate', false);
                $('#savedqueryeditor .buttons .msgs').hide();
                        
                var processData = {
                    ajaxResource : 'QueryBuilderAPI',
                    action: 'getFieldMarkerMetaData',
                    baseObject: baseObject,
                    fieldName: $select.val()
                };
                
                //ADDED LOADING SPINNER
                showLoading($('#queryeditor-modal'),'loading');

                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                    processData,
                    function(response, event){
                        //CLOSED LOADING SPINNER
                        hideMessage($('#queryeditor-modal'));
                        if(event.status) {
                            $picklistValues.data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions,gridType : markerGridType }));
                        	$picklistValues.data('markerGrid').el.appendTo($picklistValues);
                        }
                    },{buffer:false,escape:false}
                );
            }  
		});
        
		$('#savedqueryeditor').on('change', '.multiFieldParent', function () {
            var $select = $(this);
			var picklistValues = $select.closest('td').find('.multiField').attr('id') == 'marker-multiField-shapeField' ? '.marker-multifieldShapeValues' : '.marker-multifieldColorValues';
            var markerGridType = picklistValues == '.marker-multifieldShapeValues' ? 'shapes' :'colors';
            
            if($(this).hasClass('dynamicLabel'))
			{
			    markerGridType = 'colors';
			}
			
            var $picklistValues = $(this).closest('.multiFieldsTable').closest('tr').find(picklistValues);
            
            $picklistValues.empty().show();
            if ($select.val() == '--Select a Field--' || String($select.val()).trim().indexOf('--') == 0 || String($select.val()).trim() == '')
            {
                //no field is selected, hide the marker grid
                $picklistValues.hide();
            }
            else
            {
                //var multiPickListField = $('.multiFieldParent').closest('td').find('.multiField').attr('id') == 'marker-multiField-shapeField' ? $('#marker-multiField-shapeField') : $('#marker-multiField-colorField');
                var multiPickListField = markerGridType == 'shapes' ? $('#marker-multiField-shapeField') : $('#marker-multiField-colorField');
                //var picklistValues = $('.multiFieldParent').closest('td').find('.multiField').attr('id') == 'marker-multiField-shapeField' ? '.marker-multifieldShapeValues' : '.marker-multifieldColorValues';
                
                var needToUpdate = $picklistValues.data('needToUpdate') || $(this).data('needToUpdate');
                $picklistValues.data('needToUpdate', false);
                $('#savedqueryeditor .buttons .msgs').hide();
				
                var processData = {
                    ajaxResource : 'QueryBuilderAPI',
                    
                    action: 'getFieldMarkerMetaData',
                    baseObject: $select.attr('data-currentbaseobject'),
                    fieldName: $select.val()
                };
                //ADDED LOADING SPINNER
                showLoading($('#queryeditor-modal'),'loading');
                Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                    processData,
                    function(response, event){
                        //CLOSED LOADING SPINNER
                        hideMessage($('#queryeditor-modal'));
                        if(event.status) {
                            // $(picklistValues).empty();
                            $(picklistValues).data('markerGrid', new ShapeMarkerGrid({ type: response.data.fieldType, needToUpdate: needToUpdate, picklistOptions: response.data.picklistOptions,gridType : markerGridType }));
                        	$picklistValues.data('markerGrid').el.appendTo($picklistValues);
                            if (response.data.fieldType == "REFERENCE" || response.data.fieldType == "STRING")
                            {
                                $("#advanced-reference-options").show();
                                //$('#tab-markers').find('.markergrid-wrapper').height(125);
                            }
                            else
                            {
                                $("#advanced-reference-options").hide();
                            }
                        }
                    },{buffer:false,escape:false}
                );
            }  
		});
		
		
            
		$('#savedqueryeditor .colormarker').on('click', '.markertype-selector img', function () {
				             
			//only show the markertype selector that matches the selected type
			if ($(this).is('.markertype-selector-color')) {
				$(this).closest('.markertype-wrapper').find('.markertype-image').next().hide();
				$(this).closest('.markertype-wrapper').find('.markertype-shape-preview').show();
			}
			else {
				$(this).closest('.markertype-wrapper').find('.markertype-shape-preview').hide();
				$(this).closest('.markertype-wrapper').find('.markertype-image').next().show();
			}
				                
		});
        /**End March Release*/
		//handle selecting a different marker type
		$('#savedqueryeditor .colormarker').on('click', '.markertype-selector img', function () {
				             
			//only show the markertype selector that matches the selected type
			if ($(this).is('.markertype-selector-color')) {
				$(this).closest('.markertype-wrapper').find('.markertype-image').next().hide();
				$(this).closest('.markertype-wrapper').find('.markertype-color-preview').show();
			}
			else {
				$(this).closest('.markertype-wrapper').find('.markertype-color-preview').hide();
				$(this).closest('.markertype-wrapper').find('.markertype-image').next().show();
			}
				                
		});
		
		//handle interacting with reference marker grid options
		$('.color-picklistvalues').on('blur', '.markertable[data-type="reference"] input.comparedisplay', function () {
    		if ($(this).next().val() == '') {
    			$(this).val('');
    		}
    	});
    	$('.color-picklistvalues').on('keydown', '.markertable[data-type="reference"] input.comparedisplay', function (e) {
    		if ($.inArray(e.which, [9,13,37,38,39,40]) == -1) {
    			$(this).next().val('');
    		}
    	});
		
        
		/****************************
         *	PROXIMITY HANDLERS
         ****************************/
        $('.proximity-select').change(function () {
            if ($(this).val() == 'circle')
            {
                $('.proximity-isoline').hide();
                $('.proximity-circle').show();
			}
			else if ($(this).val() == 'isoline')
			{
				$('.proximity-isoline').show();
				$('#savedqueryeditor .proximity-isoline-unit-type').change();
                $('.proximity-circle').hide();
			}
		});
        
        //handle selecting a different isoline unit type
        $('#savedqueryeditor').on('change', '.proximity-isoline-unit-type', function () {
            if ($(this).val() == 'Distance') {
                $(this).closest('.proximity-wrapper').find('.proximity-isoline-unit').html('').append("<option value='MILES'>Miles</option><option value='KM'>Km</option><option value='METERS'>Meters</option><option value='YARDS'>Yards</option><option value='FEET'>Feet</option>");
            }
            else {
                $(this).closest('.proximity-wrapper').find('.proximity-isoline-unit').html('').append("<option value='MINUTES'>Minutes</option><option value='HOURS'>Hours</option>");
            }
        });
        
        /****************************
         *  SAVING
         ****************************/

        //handle clicking close
        $('#savedqueryeditor .closebtn, #savedqueryeditor-error .closebtn').click(function () {
            VueEventBus.$emit('close-query-builder');
            //attempt to fire the close callback
            // if (queryEditorClose) { queryEditorClose(); }
            // else if (parent.queryEditorClose) { parent.queryEditorClose(); }
        });

        //handle clicking save
        $('#savedqueryeditor .savebtn').click(function (event) //teddy - added event param
        {
            //hide previous error messages
            $('#savedqueryeditor .buttons .msgs').hide();

            //hide refresh layers in this area button after saving because queries may no longer have visible area
            $('#visibleAreaRefeshMap').removeClass('visible');
            
            //make sure we aren't already saving
            if ($(this).attr('value') == MASystem.Labels.MA_Saving)
            {
                return false;
            }

            //make sure we have a query name
            if ($('#savedqueryeditor input.name').val().trim() == '')
            {
                //$('#savedqueryeditor .buttons .msgs').html("<bMASystem.Labels.MA_Validation_Error/b>:MASystem.Labels.MA_Validation_Error_name).show();
                MAToastMessages.showWarning({message:MASystem.Labels.MA_Validation_Error,subMessage:MASystem.Labels.MA_Validation_Error_name,timeOut:8000,closeButton:true});
                return;
            }

            // Validation for 80 characters max (SF Limit)...
            if ($('#savedqueryeditor input.name').val().trim().length > 80)
            {
                MAToastMessages.showWarning({
                    message: MASystem.Labels.MA_Validation_Error,
                    subMessage: MASystem.Labels.MA_Max_Length_80_Name,
                    timeOut: 8000,
                    closeButton: true
                });
                return;
            }

            //make sure there are no invalid filters (QUICK FIX HERE TO IGNORE VALIDATION PROBLEMS WITH ADVANCED CROSS FILTER OPTIONS)
            if ($('#savedqueryeditor input.invalid').not('.advanced.crossfieldoptions input').length > 0)
            {
                //$('#savedqueryeditor .buttons .msgs').html("<bMASystem.Labels.MA_Validation_Error/b>:MASystem.Labels.MA_Validation_Error_filters).show();
                MAToastMessages.showWarning({message:MASystem.Labels.MA_Validation_Error,subMessage:MASystem.Labels.MA_Validation_Error_filters,timeOut:8000,closeButton:true});
                //show any advanced filters that are hiding an invalid value
                //$('#savedqueryeditor .crossfilter input.invalid:hidden').closest('.crossfilter').find('span.link:contains("Show Advanced")').click();

                return false;
            }

            //make sure there aren't more than 3 query filters
            var queryFilterCount = 0;

            $('#savedqueryeditor .fieldfilters .filter[data-basetype="ID"]').each(function () {
                var operatorValue = $(this).find('.operator .combobox').val();
            	if (operatorValue == 'in' || operatorValue == 'not in') {
            		queryFilterCount++;
            	}

            });
            if (queryFilterCount > 3)
            {
            	//$('#savedqueryeditor .buttons .msgs').html("<bMASystem.Labels.MA_Validation_Error/b>:MASystem.Labels.MA_Validation_Error_3_query_filters).show();
            	MAToastMessages.showWarning({message:MASystem.Labels.MA_Validation_Error,subMessage:MASystem.Labels.MA_Validation_Error_3_query_filters,timeOut:8000,closeButton:true});
                return;
            }
            var returnFalse = false;
            var invalidDynamicFilter = false;
            $('#savedqueryeditor .fieldfilters .filter[data-basetype="STRING"]').each(function () {
                var operatorValue = $(this).find('.operator .combobox').val();
            	var inputValue = $(this).find('.value input').val();
            	
            	if(inputValue.toLowerCase().indexOf(':dynamic') > -1 && inputValue.toLowerCase() != ':dynamic' ){
            	    invalidDynamicFilter = true;
            	}
            	
            	if (operatorValue == 'range' ){
            	    
            	    if(!isNaN(parseFloat($(this).find('.value input[data-range="from"]').val())) && !isNaN(parseFloat($(this).find('.value input[data-range="to"]').val())))
            	    {
            	        
            	        if(parseFloat($(this).find('.value input[data-range="to"]').val()) < parseFloat($(this).find('.value input[data-range="from"]').val()))
            	        {
            	            
                            returnFalse = true;
            	        }
            	    }
            	    
            	}
            });
            if(returnFalse)
            {
                MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'Range values must be in the format of small to large',timeOut:8000,closeButton:true});
                return returnFalse;
            }
            if(invalidDynamicFilter)
            {
                MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'Dynamic filters must be entered in the form as ":Dynamic" with no additional characters.',timeOut:8000,closeButton:true});
                return returnFalse;
            }

            //make sure there are no invalid limits
           	try {
           		var rowLimit = parseInt($('.limits-rowcount-value').val());
                var rowLimitElement = document.getElementsByClassName('limit-records-enabled')[0];
                if (rowLimitElement && rowLimitElement.checked) {
                    if (query.baseObject.endsWith('__x')) { // validation for External Objects
                        if (isNaN(rowLimit) || rowLimit < 1 || rowLimit > MA.defaults.maxQuerySizeExt) {
                            window.document.getElementById('max-query-size').value = MA.defaults.maxQuerySizeExt; // reset value to max if rowLimit is out of exceptable limits
                            MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_record_limit_ext_objs,timeOut:8000,closeButton:true});
                            return;
                        }
                    }
                    if (isNaN(rowLimit) || rowLimit < 1 || rowLimit > 250000) {
                        MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_record_limit,timeOut:8000,closeButton:true});
                        return;
                    }
                }
           	}
           	catch (err) {
           		MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_Invalid_record_limit,timeOut:8000,closeButton:true});
               	return;
           	}
           	 //make sure there are no invalid numbers in before and after route waypoint days and that neither field is empty if disable is checked		
            if ($('#savedqueryeditor .advanced-route-disablewaypoints').is(':checked'))		
            try {		
           		var waypointsBefore = parseInt($('.advanced-route-before').val());		
                var waypointsAfter = parseInt($('.advanced-route-after').val());		
                		
           		if (isNaN(waypointsBefore) || isNaN(waypointsAfter)) {		
           			MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_Invalid_Day_Integer,timeOut:8000,closeButton:true});
               		return;		
           		}		
                		
           	}		
           	catch (err) {		
           		MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_Invalid_Day_Integer,timeOut:8000,closeButton:true});
               	return;		
           	}                
           	//make sure there is not a invalid limit by address filter
           	if ($('#savedqueryeditor .limit-proximity-enabled').is(':checked'))
           	{
               	try{
	               	var distance = $('#savedqueryeditor .advanced .distance-value').val();
	               	var address = $('#savedqueryeditor .advanced .address-value').val();
	               	var type = $('#savedqueryeditor .advanced .distance-type').val();
	                if (distance == '' || address == '')
	                {
	                    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_Invalid_Address_limits_blank,timeOut:8000,closeButton:true});
	                    return;
	                }
	                else if (isNaN(parseInt(distance)))
	                {
	                	MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_distance_number,timeOut:8000,closeButton:true});
	                    return;
	                }
               	}
               	catch (err) {
               		MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_address_limit,timeOut:8000,closeButton:true});
                   	return;
               	}
            }
           	
            
            $('.tooltip').each(function(index) {
                if($(this).val() == MASystem.Labels.MA_Loading_With_Ellipsis){
                    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'Some items have not finished loading yet, please try saving again in a couple of seconds',timeOut:8000,closeButton:true});
                    return false;
                }
            })
            
            //make sure we have a value for tooltip 1
            var $tooltip1Val = $('[data-tooltip="tooltip1"]').val();
            if ($tooltip1Val == '--'+MASystem.Labels.MA_None+'--' || $tooltip1Val == null)
            {
                MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage: MASystem.Labels.MA_Validation_Error_Tooltip1,timeOut:8000,closeButton:true});
                return false;
            }
            
            //delete any blank multipicklist values under marker selection
			$('#savedqueryeditor table.markertable .multipicklistvalue').each(function()
			{
				if($(this).find('.comparevalue').multiselect('getChecked').length == 0)
				{
					$(this).remove();
				}
			});
			 if($('.color-assignmenttype').val() == 'Dynamic-multiField')
			 {
			     var shapeField = String($('#marker-multiField-shapeField').val() || '').trim();
			     var parentShapeField = $('#marker-multiFieldParent-shapeField').val();
			     
			     var colorField = String($('#marker-multiField-colorField').val() || '').trim();
			     var parentColorField = $('#marker-multiFieldParent-colorField').val();
			     
			     var isInvalidInput = shapeField == ''         ||     shapeField.indexOf('--') == 0         ||
			                          colorField == ''         ||     colorField.indexOf('--') == 0         ||
			                          
			                          parentShapeField == '--'+MASystem.Labels.MA_None+'--'   ||     parentShapeField == '--Select a Field--'   ||
			                          parentColorField == '--'+MASystem.Labels.MA_None+'--'   ||     parentColorField == '--Select a Field--';
			     
			     if(isInvalidInput)
			     {
			         var message =  MASystem.Labels.MA_Validation_Error;
			         var subMessage = 'You must enter a field selection for both Assorted Shapes and Assorted colors before proceeding';
			         
			         MAToastMessages.showWarning({ message:message, subMessage:subMessage, timeOut:8000, closeButton:true });
                     return false;
			     }
			     
			     if($('.shapemarkergrid-header').attr('data-type')=='NUMBER')
			     {
			         var markerRulesValid = true;
			         $('.shapemarkergrid .shapemarkergrid-row').each(function(i){
			            if(markerRulesValid){ 
                            if($(this).find('.comparevalue').val() == '' && $(this).find('.toVal').val() == '') { 
		                	    markerRulesValid = false;
		                	    
                            }else if($(this).find('.comparevalue').val() == '' && i > 0)
                            {
                                markerRulesValid = false
                            } else if($(this).find('.toVal').val() == '' && i < $('.shapemarkergrid .shapemarkergrid-row').length -2)
                            {
                                markerRulesValid = false;
                            }
		                    if($(this).find('.comparevalue').val() != '<Other>'){
		                    
		                        if(parseInt($(this).find('.comparevalue:not(:first)').val()) > parseInt($(this).find('.toVal').val())) {
		                            
		                            
		                	        markerRulesValid = false;
		                        }
		                    }
			            }
                     });
                     if(!markerRulesValid)
                     { 
                	    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'You must enter a valid FROM-TO range for markers before proceeding',timeOut:8000,closeButton:true});
                	    return false;
                     }
			     }
			     else if($('.shapemarkergrid-header').attr('data-type') == 'DATE')
			     {
                    var markerRulesValid = true;
                    var errMsg = 'You must enter a valid FROM-TO range for markers before proceeding';
                    $('.shapemarkergrid .shapemarkergrid-row').each(function(){
                        var $row = $(this);
                        // grab both values and make sure they are valid
                        var startDate = $row.find('.comparevalue').val();
                        var endDate = $row.find('.enddate').val();

                        if(startDate === '<Other>' && endDate === '<Other>') {
                            return;
                        }

                        // check if start or end are blank
                        if(startDate === '' || endDate === '') {
                            markerRulesValid = false;
                            errMsg = 'Start and End dates cannot be blank';
                            return false;
                        }

                        // values are filled in, make sure the start and end are valid and start is before end
                        var dateValidationCheck = validateDateRange(startDate, endDate);
                        if(!dateValidationCheck.success) {
                            markerRulesValid = false;
                            errMsg = dateValidationCheck.error || 'You must enter a valid FROM-TO range for markers before proceeding';
                            return false;
                        }
                    });

                    if(!markerRulesValid){
                        MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:errMsg,timeOut:8000,closeButton:true});
                        return false;
                    }
                     
			     }
			     
			     
			     if($('.colormarkergrid-header').attr('data-type')=='NUMBER')
			     {
			         var markerRulesValid = true;
			         $('.colormarkergrid .colormarkergrid-row').each(function(){
			            if(markerRulesValid){ 
                            if($(this).find('.comparevalue').val() == '' || $(this).find('.toVal').val() == '') { 
		                	    markerRulesValid = false;
		                
		                    }
		                    if($(this).find('.comparevalue').val() != '<Other>'){
		                       
		                        if(parseInt($(this).find('.comparevalue:not(:first)').val()) > parseInt($(this).find('.toVal').val())) {
		                         
		                            
		                	        markerRulesValid = false;
		                        }
		                    }
			            }
                     });
                     
			     }
			     else if($('.colormarkergrid-header').attr('data-type') == 'DATE')
			     {
                    var markerRulesValid = true;
                    var errMsg = 'You must enter a valid FROM-TO range for markers before proceeding';
                    $('.colormarkergrid .colormarkergrid-row').each(function(){
                        var $row = $(this);
                        // grab both values and make sure they are valid
                        var startDate = $row.find('.comparevalue').val();
                        var endDate = $row.find('.enddate').val();

                        if(startDate === '<Other>' && endDate === '<Other>') {
                            return;
                        }

                        // check if start or end are blank
                        if(startDate === '' || endDate === '') {
                            markerRulesValid = false;
                            errMsg = 'Start and End dates cannot be blank';
                            return false;
                        }

                        // values are filled in, make sure the start and end are valid and start is before end
                        var dateValidationCheck = validateDateRange(startDate, endDate);

                        if(!dateValidationCheck.success) {
                            markerRulesValid = false;
                            errMsg = dateValidationCheck.error || 'You must enter a valid FROM-TO range for markers before proceeding';
                            return false;
                        }
                     });

			         if(!markerRulesValid){
                        MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:errMsg,timeOut:8000,closeButton:true});
                	    return false;
			         }
			     }
			 }
			 
            if($('.color-assignmenttype').val() == 'Dynamic, Field')
			 {
                if($('.color-picklistparentfield').not('.dynamicLabel').val() == '--'+MASystem.Labels.MA_None+'--' || $('.color-picklistparentfield').not('.dynamicLabel').val() == '--Select a Field--' || $('.color-picklistfield').not('.dynamicLabel').val() == '--Select a Field--' || $('.color-picklistfield').not('.dynamicLabel').val() == '--'+MASystem.Labels.MA_None+'--' )
                {
                    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'You must enter a field selection before proceeding in a Dynamic Field Query',timeOut:8000,closeButton:true});
                    return false;
                }
                var formatedDate = getProperty(MASystem || {}, 'User.dateFormat', false) || 'M/D/YYYY';
                // moment expects all upper case for format
                formatedDate = formatedDate.toUpperCase();
                if($('.markergrid-header').attr('data-type') == 'DATE')
                {
                    var markerRulesValid = true;
                    var errMsg = 'You must enter a valid FROM-TO range for markers before proceeding';
                    $('.markergrid .markergrid-row').each(function(){
                        var $row = $(this);
                        // grab both values and make sure they are valid
                        var startDate = $row.find('.comparevalue').val();
                        var endDate = $row.find('.enddate').val();

                        if(startDate === '<Other>' && endDate === '<Other>') {
                            return;
                        }

                        // check if start or end are blank
                        if(startDate === '' || endDate === '') {
                            markerRulesValid = false;
                            errMsg = 'Start and End dates cannot be blank';
                            return false;
                        }

                        // values are filled in, make sure the start and end are valid and start is before end
                        var dateValidationCheck = validateDateRange(startDate, endDate);

                        if(!dateValidationCheck.success) {
                            markerRulesValid = false;
                            errMsg = dateValidationCheck.error || 'You must enter a valid FROM-TO range for markers before proceeding';
                            return false;
                        }
                     });

			         if(!markerRulesValid){
                        MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:errMsg,timeOut:8000,closeButton:true});
                	    return false;
			         }
			     }
			 }
            //validate currency grids if needed
            if ($('.color-assignmenttype').val() == 'Dynamic, Field' && $('.Dynamic.toggle .markertable.currency').length > 0)
            {
                //compare blank values currency marker
                var markerRulesValid = true;
				$('.color-picklistvalues .markertable .currencyvalue.row:not(:first, :last)').each(function()
               	{ 
                	if($(this).find('.comparevalue').val() == '' || $(this).find('.toVal').val() == '') { 
	                	markerRulesValid = false;
	                }
	            });
		        $('.color-picklistvalues .markertable .currencyvalue.row(:first, :last)').each(function()
               	{ 
                	if($(this).find('.comparevalue').val() == '' && $(this).find('.toVal').val() == '') { 
	                	markerRulesValid = false;
	                }
	            });
	            
				//make sure markers return a valid value range
				$('.color-picklistvalues .markertable .currencyvalue.row').each(function()
               	{ 
                	if(parseInt($(this).find('.comparevalue:not(:first)').val()) > parseInt($(this).find('.toVal').val())) { 
	                	markerRulesValid = false;
	                }
	            });
		        if(!markerRulesValid)
                { 
                    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'You must enter a valid FROM-TO range for markers before proceeding',timeOut:8000,closeButton:true});
                	return false;
                }
            }
            
            //make sure there are no conflicting settings
            if ($('.proximity-enabled').is(':checked') && (isNaN(parseFloat($('.proximity-circle-radius').val())) || parseFloat($('.proximity-circle-radius').val()) <= 0))
            {
                MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'Proximity radius must be greater than 0',timeOut:8000,closeButton:true});
            	return false;
            }
            
            //make sure there are no blank reference values in the marker grid
            if ($('.color-picklistvalues .markertable').attr('data-type') == 'reference')
			{
				var referenceOptionError = false;
				$('.color-picklistvalues .markertable input.comparevalue[type="hidden"]').each(function () {
					if ($(this).val() == '') {
						referenceOptionError = true;
					}
				});
				
				if (referenceOptionError) {
				    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'You must enter a value for each option in the marker grid before proceeding',timeOut:8000,closeButton:true});
					return false;
				}
			}
             
             
            // make sure that the refresh button is set and a value set for Live 
            if(savedQueryInfo.layerType == 'Live') // forced comment
            {
                if( $('#savedqueryeditor .advanced-enablerefreshing').is(':checked'))
                {
                    var refreshIntervalNumericInput = $('#savedqueryeditor .advanced-refreshing-value').val();
                    var refreshIntervalNumericValue =  parseInt(Number(refreshIntervalNumericInput));
                    var refreshIntervalUnits = String( $('#savedqueryeditor .advanced-refreshing-unit').val() ).trim();
                    
                    if( refreshIntervalUnits != 'min' || refreshIntervalUnits != 'sec' )
                    {
                        if(!refreshIntervalNumericValue || (refreshIntervalNumericValue < 10 && refreshIntervalUnits == 'sec'))
                        {
                            MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'The refresh value must be greater than 10 seconds',timeOut:8000,closeButton:true});
                            return;
                        }
                    }
                    else // refreshIntervalUnits not min or sec
                    {
                        MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'The refresh time unit is not recognized',timeOut:8000,closeButton:true});
                        return;
                    }
                }
                else // refresh button not checked
                {
                    MAToastMessages.showWarning({message: MASystem.Labels.MA_Validation_Error,subMessage:'You must check the <i>Enable refreshing</i> option and enter a refresh value for Live Layers',timeOut:8000,closeButton:true});
                    return;
                }

                
                var liveReportDateAndTimeInput = validateLiveDeviceLastReportDateTimeInput();
                
                if(typeof liveReportDateAndTimeInput == 'object')
                {

                    
                    if( !liveReportDateAndTimeInput.success ) {
                        var message = liveReportDateAndTimeInput.message || 'Invalid input values in the \'Last Report Date and Time\' section';
                        NotifyWarning('Live Input Error', message);
                        // $('#savedqueryeditor .buttons .msgs').html("<bMASystem.Labels.MA_Validation_Error/b>: " + message).show();
                        return;
                    }
                }
                else
                {
                    NotifyError('Live Input Error', 'Could not successfully validate the \'Last Report Date and Time\' input values.');
                    return;
                }
            }

            
            // validate geofence layer type input if applicable
            if(savedQueryInfo.layerType == 'Geofence') // forced comment
            {
                var geofenceInputValid = validateGeofenceInput();
                
                if(typeof geofenceInputValid == 'object')
                {

                    
                    if( !geofenceInputValid.success ) {
                        var message = geofenceInputValid.message || 'Invalid geofence input values';
                        NotifyWarning('Geofence Input Error', message);

                        return;
                    }
                }
                else
                {
                    NotifyError('Geofence Input Error', 'Could not successfully validate Geofence layer input values.');
                    return;
                }
            }
            
            if(savedQueryInfo.layerType == 'Live-Device') // forced comment
            {
                var liveDeviceInputValid = validateLiveDeviceInput();
                
                if(typeof liveDeviceInputValid == 'object')
                {
                    
                    if( !liveDeviceInputValid.success ) {
                        var message = liveDeviceInputValid.message || 'Invalid Live Device input values';
                        NotifyWarning('Device Layer Input Error', message);

                        return;
                    }
                }
                else
                {
                    NotifyError('Live Device Input Error', 'Could not successfully validate the Device layer input values.');
                    return;
                }
            } // forced comment
            
            
            //loading indicator
            var $button = $(this);
            $button.attr('value',  MASystem.Labels.MA_Saving);
            

            //build query object to send
            validateQuery().then(function (response) {
            	if(response.success)
            	{
                    var processData = {
                        ajaxResource : 'QueryBuilderAPI',
                        
                        action: 'saveQuery',
                        serializedQuery: JSON.stringify(response.query),
                    };
                    window.trackUsage('Maps', { action: 'Edit Marker Layer', description: 'Clicking "Save" on Marker Layer Builder' });

                    //ADDED LOADING SPINNER
                    showLoading($('#queryeditor-modal'),'loading');
                    Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                        processData,
                        function(successResponse, event) {
                            //CLOSED LOADING SPINNER
                            hideMessage($('#queryeditor-modal'));
                            if(event.status) {
		                        if (successResponse.success)
		                        {
		                            //attempt to fire the success callback
		                            var plotQueryOnComplete = $button.is('.plotbtn');
		                            response.query.layerType = savedQueryInfo.layerType; // getProperty(successResponse, 'data.layerType', false);
		                            if (queryEditorSaveComplete) { queryEditorSaveComplete(successResponse.data.id, $('.baseobject-name').text(), response.query, plotQueryOnComplete, $button.is('.refreshbtn') ? savedQueryInfo.queryIndex : null); }
		                            else if (parent.queryEditorSaveComplete) { parent.queryEditorSaveComplete(successResponse.data.id, $('.baseobject-name').text(), response.query, plotQueryOnComplete, $button.is('.refreshbtn') ? savedQueryInfo.queryIndex : null); }
		                        }
		                        else
		                        {
		                            //show error message
		                            //$('#savedqueryeditor .systeminfo').hide();
		                            var data = '';
		                            var msg = '';

		                            if(JSON.stringify(successResponse.data||null).indexOf('STRING_TOO_LONG') > -1) {
		                                data = 'Description is too long. Please limit to 255 characters.';
		                                msg = 'Error';
		                            } else {
		                                data = successResponse.data;
		                                msg = successResponse.message;
		                            }
		                            MAToastMessages.showError({message:'Error Saving Query',subMessage:msg||data,timeOut:0,closeButton:true});
		                            //$('#savedqueryeditor .buttons .msgs').html('<b>' + msg + '</b>' + ': ' + data).show();
		                        }
                            }
                            else if (event.type === 'exception') {
                                //show error
                                //$('#savedqueryeditor .systeminfo').hide();
                                MAToastMessages.showWarning({message:'Error Saving Query',subMessage:event.message,timeOut:5000,closeButton:true});
	                            //$('#savedqueryeditor .buttons .msgs').html('<b>Error Saving Query</b>: Please check your filters try again').show();
                                MA.log(event.message + '::' + event.where);
                            } 
                            else {
                                //show error
                                //$('#savedqueryeditor .systeminfo').hide();
                                MAToastMessages.showWarning({message:'Error Saving Query',subMessage:event.message,timeOut:5000,closeButton:true});
	                            //$('#savedqueryeditor .buttons .msgs').html('<b>Error Saving Query</b>: Please check your filters try again').show();
                                MA.log(event.message);
                            }
                            
                            // restore save and save & plot button status before save
                            //remove loading indicator
	                        if($button.hasClass('plotbtn') == true)
    		                {
    			             	$button.attr('value', 'Save & Plot');
    			            }
    			            else
    			            {
    			            	$button.attr('value', 'Save');
    			            }
    			            
                        },{buffer:false,escape:false}
                    );
	             }
	             else
	             {
	                 // update button
	                $button.attr('value', $button.hasClass('plotbtn') == true ? 'Save & Plot' : 'Save');
		            
		            MAToastMessages.showWarning({message:'Geocode Error',subMessage: response.message || 'Please check the entered address and distance value (Filters > Advanced > Limits)',timeOut:8000,closeButton:true});
	             }
            });
        });
        

        // hide/show top level tabs based on the layer type (determined by the layer type we are editing)
        showHideEditQueryTabs(); 
        
        // hide/show side menu items based on the layer type (determined by the layer type we are editing)
        showHideSideMenuItems(); 
        
        // hide/show different input widgets across the edit popup based on what the layerType is
        initializeLayerTypeInputs();
        
        
        /******************************************
         *  POPULATE DATA FROM EXISTING QUERY
         *****************************************/
        if (query.id || query.isClone)
        {
            //populate name
            $('#savedqueryeditor input.name').val(query.name);
            
            //populate description
            $('#savedqueryeditor input.description').val(query.description);
            
            //update filter by owner settings
            if (query.filterByOwner.indexOf('My:') == 0)
            {
                
                $('.filterbyowner input:radio[name=filterByOwner][value=TRUE]').click();
                $('.filterbyowner-ownerfield-wrapper').slideDown(400);
                
                refreshBadges();
               
                $('.filterbyowner-owner').val(query.filterByOwner.split(':')[1]).trigger('change.select2');
                $('.filterbyowner-ownerfield').val(query.filterByOwner.split(':')[2]).trigger('change.select2');
            }
            else if (query.filterByOwner == 'QUEUE')
            {
                $('.filterbyowner input:radio[name=filterByOwner][value=QUEUE]').click()
                .parent()
                .find('select')
                .val(query.selectedQueue);
            }
            else if (query.filterByOwner == 'Team')
            {
                $('.filterbyowner input:radio[name=filterByOwner][value=TEAM]').click();
               
            }else if (query.filterByOwner == 'MINE')
            {
                $('.filterbyowner input:radio[name=filterByOwner][value=MINE]').click();
               
            }else if (query.filterByOwner == 'MYTEAM')
            {
                $('.filterbyowner input:radio[name=filterByOwner][value=MYTEAM]').click();
               
            }
            //update activity filter settings
            //translate operator
            var translatedOperator = query.filterByActivity.operator == 'AND' ?  MASystem.Labels.MA_AND :  MASystem.Labels.MA_OR;
            $('.filterbyactivity .activityfilter-operator').val(query.filterByActivity.operator).change().next().find('> input').val(translatedOperator);
            if (query.filterByActivity.task != 'all')
            {
                //update operator
                $('.filterbyactivity .activityfilter-task').val(query.filterByActivity.task).change().next().find('> input').val(query.filterByActivity.task);
            }
            if (query.filterByActivity.event != 'all')
            {
                //update operator
                $('.filterbyactivity .activityfilter-event').val(query.filterByActivity.event).change().next().find('> input').val(query.filterByActivity.event);
            }

            
            //add activity subfilters
            $.each(query.activitySubfilters, function (index, filter) {
            
                //add new filter
                var baseObject = filter.baseObject.toLowerCase();
                var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($('.activitysubfilters-wrapper[data-type="'+baseObject+'"] .subfilters'));
                $loader.slideDown(
                    200,
                    function ()
                    {
                        var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', filter.baseObject);
                        $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', filter.fieldName));
                        $newFilter.find('.fieldoptions .combobox').val(filter.fieldName);
                        $newFilter.find('.parentfieldoptions .combobox').append($("<option></option>").attr('value', filter.parentFieldName));
                        $newFilter.find('.parentfieldoptions .combobox').val(filter.parentFieldName);
                        $newFilter.find('.grandparentfieldoptions .combobox').append($("<option></option>").attr('value', filter.grandparentFieldName));
                        $newFilter.find('.grandparentfieldoptions .combobox').val(filter.grandparentFieldName);
                        
                        updateFilter($newFilter, $loader, filter.operator, filter.value, filter.value2);
                    }
                );
            });
            
            //filter logic settings
            if (query.useFilterLogic)
            {
                $('#savedqueryeditor .filterlogiclink').click();
                $('#savedqueryeditor .filterlogic').val(query.filterLogicString);
            }

            
            //filters
            $.each(query.filters, function (index, filter)
            {
                //add new filter
                var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($('.fieldfilters > .listbox'))
                $loader.slideDown(
                    200,
                    function ()
                    {
                        var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', filter.baseObject);
                        $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', filter.fieldName));
                        $newFilter.find('.fieldoptions .combobox').val(filter.fieldName);
                        $newFilter.find('.parentfieldoptions .combobox').append($("<option></option>").attr('value', filter.parentFieldName));
                        $newFilter.find('.parentfieldoptions .combobox').val(filter.parentFieldName);
                        $newFilter.find('.grandparentfieldoptions .combobox').append($("<option></option>").attr('value', filter.grandparentFieldName));
                        $newFilter.find('.grandparentfieldoptions .combobox').val(filter.grandparentFieldName);
                        
                        updateFilter($newFilter, $loader, filter.operator, filter.value, filter.value2);
                    }
                );
            });
               
            //cross filters 
            $.each(query.crossFilters, function (index, crossFilter) 
            {
                //add new cross filter
                var $loader = $('.ajaxload.template').clone().removeClass('template').appendTo($('.crossfilters > .listbox'));
                $loader.slideDown(
                    200,
                    function ()
                    {
                        var $newCrossFilter = $('.crossfilter.template').clone().removeClass('template').attr('data-baseobject', crossFilter.baseObject).attr('data-index', 'AND');
                        $newCrossFilter.find('.fieldlabel .baseobject').text(query.baseObjectName);
                        $newCrossFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', crossFilter.fieldName));
                        $newCrossFilter.find('.fieldoptions .combobox').val(crossFilter.fieldName);
                        $newCrossFilter.find('.operator .combobox').val(crossFilter.operator);
                        $newCrossFilter.find('.crossobjectoptions .combobox').append($("<option></option>").attr('value', crossFilter.crossObjectName));
                        $newCrossFilter.find('.crossobjectoptions .combobox').val(crossFilter.crossObjectName);
                        $newCrossFilter.find('.crossfieldoptions .combobox').append($("<option></option>").attr('value', crossFilter.crossFieldName));
                        $newCrossFilter.find('.crossfieldoptions .combobox').val(crossFilter.crossFieldName);
                        if(crossFilter.useCrossFilterLogic)
                        {
                        	$newCrossFilter.find('.crossfilterlogic .crossfilterlogiclink').text(MASystem.Labels.MA_Remove);
                        	$newCrossFilter.find('.crossfilterlogic .crosslogic').show();
                        	$newCrossFilter.find('.crossfilterlogic .crosslogic').val(crossFilter.crossFilterLogicString);
                        }
                        
                        //add subfilters
                        $.each(crossFilter.filters, function (index, filter)
                        {
                            var $subloader = $('.ajaxload.template').clone().removeClass('template').appendTo($newCrossFilter.find('.subfilters'));
                            $subloader.slideDown(
                                200,
                                function ()
                                {
                                    var $newFilter = $('.filter.template').clone().removeClass('template').attr('data-baseobject', $newCrossFilter.find('.crossobjectoptions .combobox').val());
                                    $newFilter.find('.fieldoptions .combobox').append($("<option></option>").attr('value', filter.fieldName));
                                    $newFilter.find('.fieldoptions .combobox').val(filter.fieldName);
                                    $newFilter.find('.parentfieldoptions .combobox').append($("<option></option>").attr('value', filter.parentFieldName));
                                    $newFilter.find('.parentfieldoptions .combobox').val(filter.parentFieldName);
                                    $newFilter.find('.grandparentfieldoptions .combobox').append($("<option></option>").attr('value', filter.grandparentFieldName));
                                    $newFilter.find('.grandparentfieldoptions .combobox').val(filter.grandparentFieldName);
                                    updateFilter($newFilter, $subloader, filter.operator, filter.value, filter.value2);
                                }
                            );
                        });
                
                        
                        updateCrossFilter($newCrossFilter, $loader);
                    }
                );
            });
            //advanced filter options
            if (query.advancedOptions) {
            	$('.limit-records-enabled').prop('checked', query.advancedOptions.enableLimit == 'true' ? true : false);
            	$('.limit-proximity-enabled').prop('checked', query.advancedOptions.enableProxLimit == 'true' ? true : false);
            	$('.advanced-enableaggregates').prop('checked', typeof query.advancedOptions.aggregateType == 'undefined' || query.advancedOptions.aggregateType != '');
            	$('.advanced-aggregates-type').val($('.advanced-enableaggregates').is(':checked') ? query.advancedOptions.aggregateType : 'sum');
            	$('#advanced-tooltip-defaulttab').val(query.advancedOptions.defaultTab || 'info');
            	
            	$('#advanced-live-tooltip-defaulttab').val(query.advancedOptions.defaultLiveTab || 'live');
            	$('#advanced-live-tooltip-defaulttab').select2({dropDownAutoWidth:true, width:'resolve'}).change();
            	
                $('#markers-defaultrendermode').val(query.advancedOptions.defaultRenderMode || 'Default');
                $('#markers-defaultrenderarea').val(query.advancedOptions.defaultRenderArea || 'EntireMap');
           		$('.distance-value').val(query.advancedOptions.distance);
           		$('.address-value').val(query.advancedOptions.address);
	            $('.distance-type').val(query.advancedOptions.selectType);
	            setTimeout(function(){ 
    	            if (query.advancedOptions.automaticassign)
    	            {
    	                $('#advanced-reference-option-automaticassign').prop('checked', query.advancedOptions.automaticassign == 'true' ? true : false);
    	               
    	            }
    	            if (query.advancedOptions.otherthreshold) 
    	            {
    	                $('#advanced-reference-option-otherthreshold').val(query.advancedOptions.otherthreshold);
    	            }
    	            
    	            if (query.advancedOptions.markerLabelTextColor)
    	            {
    	                $('#marker-label-text-color')[0].color.fromString( query.advancedOptions.markerLabelTextColor );
    	            }
    	            
    	            if (query.advancedOptions.markerLabelBackgroundColor)
    	            {
    	                $('#marker-label-background-color')[0].color.fromString( query.advancedOptions.markerLabelBackgroundColor );
    	            }
    	            
    	            refreshBadges();
	            },3000);
            }
            
            // populate layerType options on edit query popup
            loadLayerTypeOptions(query);

            if (!query.advancedOptions || query.advancedOptions.enableProxLimit == 'false')
        	{
        		$('.limit-proximity-enabled').closest('.htab-content-body').find('.distance-value').attr('disabled', 'disabled');
        		$('.limit-proximity-enabled').closest('.htab-content-body').find('.distance-type').attr('disabled', 'disabled');
        		$('.limit-proximity-enabled').closest('.htab-content-body').find('.address-value').attr('disabled', 'disabled');
        	}
        	
        	// query limits
            if (query.baseObject.endsWith('__x')) { // setting up External Objects limits on existing layers
                const queryRowLimit = parseInt(query.rowLimit);
                if (Number.isNaN(queryRowLimit) || queryRowLimit < 1 || queryRowLimit > MA.defaults.maxQuerySizeExt) {
                    $('.limits-rowcount-value').val(MA.defaults.maxQuerySizeExt);
                } else {
                    $('.limits-rowcount-value').val(queryRowLimit);
                }
            } else {
                $('.limits-rowcount-value').val(parseInt(query.rowLimit));
            }

            if (!query.advancedOptions || query.advancedOptions.enableLimit == 'false')
            {
            	$('.limit-records-enabled').closest('.htab-content-body').find('.limits-rowcount-value').attr('disabled', 'disabled');
            	refreshBadges();
            }
            
            //proximity
            if (query.proximityOptions) {
            	if(query.proximityOptions.selectType == 'circle')
            	{
            		$('.proximity-select').val(query.proximityOptions.selectType);
            		$('.proximity-isoline').hide();
           			$('.proximity-circle').show();
	            	$('.proximity-enabled').prop('checked', query.proximityOptions.enabled == 'true' ? true : false);
	            	$('.proximity-hidemarkers').prop('checked', query.proximityOptions.hideMarkers == 'true' ? true : false);
                    $('.proximity-affectvisibility').prop('checked', query.proximityOptions.affectVisibility == 'false' ? false : true);
	            	$('.proximity-circle-radius').val(query.proximityOptions.radius);
	            	$('.proximity-circle-unit').val(query.proximityOptions.measurementType);
	            	
	            	$('#proximity-fill')[0].color.fromString( (query.proximityOptions.fill) ? query.proximityOptions.fill : '#3083d3');
	            	$('#proximity-border')[0].color.fromString( (query.proximityOptions.border) ? query.proximityOptions.border : '#16325C');
	            	$('#proximity-opacity').val( (query.proximityOptions.opacity) ? query.proximityOptions.opacity : '0.60');
            	}
            	else if (false && query.proximityOptions.selectType == 'isoline')
        		{
        			$('.proximity-isoline').show();
                    $('.proximity-circle').hide();
        			$('.proximity-select').val(query.proximityOptions.selectType);
        			$('.proximity-enabled').prop('checked', query.proximityOptions.enabled == 'true' ? true : false);
        			$('.proximity-hidemarkers').prop('checked', query.proximityOptions.hideMarkers == 'true' ? true : false);
                    $('.proximity-affectvisibility').prop('checked', query.proximityOptions.affectVisibility == 'false' ? false : true);
	            	$('.proximity-isoline-radius').val(query.proximityOptions.radius);
	            	$('.proximity-isoline-mode').val(query.proximityOptions.mode);
	            	$('.proximity-isoline-unit-type').val(query.proximityOptions.unitType);
	            	$('#savedqueryeditor .proximity-isoline-unit-type').change();
	            	$('.proximity-isoline-unit').val(query.proximityOptions.measurementType);
	            	$('.proximity-isoline-traffic').prop('checked', query.proximityOptions.traffic == 'true' ? true : false);
        		}
            }
            
            
            // Markers Tab
            // staticDynamic
            var markerShapeType = getProperty(query, 'advancedOptions.markerShapeType');
            var markerShapeValue = getProperty(query, 'advancedOptions.markerShapeValue');
            
            var $dynamicStaticShapeInput = $('#dynamicStaticShapeInput');
            var $dynamicShapePicker = $('#dynamicShapePicker');
            
            $dynamicShapePicker.attr('data-color', markerShapeValue);
            
           if(markerShapeType == 'static') {
                $dynamicStaticShapeInput.val('static').change();
                $dynamicShapePicker.attr('data-color', markerShapeValue).html(MAMarkerBuilder.createSVG({ forLegend: true , color: markerShapeValue})).show();
               // $dynamicStaticShapeInput.val('static').change();
              
            } else {
                $dynamicStaticShapeInput.val('dynamic').change();
                $dynamicShapePicker.attr('data-color', null).hide();
            }
            
            
            //related list
            $.each(query.relatedLists, function (index, MarkerLayerRelatedList) {
                RelatedList_Update($('#savedqueryeditor-templates .MarkerLayerRelatedList-row').clone().insertBefore($('#MarkerLayerRelatedList-watermark')).data({ crossObjectName: MarkerLayerRelatedList.relatedobject, crossObjectFieldName: MarkerLayerRelatedList.referencefield }), MarkerLayerRelatedList);
            });
            
            if (query.refreshInterval != null) {
            	try {
            		$('#savedqueryeditor .advanced-enablerefreshing').prop('checked', true);
           			$('#savedqueryeditor .advanced-refreshing-value').val(query.refreshInterval.split(' ')[0]);
           			$('#savedqueryeditor .advanced-refreshing-unit').val(query.refreshInterval.split(' ')[1]);
            	}
            	catch (err) { }
            }
            //if the waypoints are null don't check the disable route waypoints box and hide the input fields		
            if (query.advancedOptions && query.advancedOptions.waypointsAfter == null && query.advancedOptions.waypointsBefore == null) {		
                		
                try {		
                    $('#savedqueryeditor .advanced-route-options-inputs').hide();                                   					
                }		
                catch (err) { }		
            }		
            //if the waypoints are not null check the diable route waypoints box and show the input fields with the query data.		
            if (query.advancedOptions.waypointsAfter != null && query.advancedOptions.waypointsBefore != null) {		
                		
                try {		
                    $('#savedqueryeditor .advanced-route-options-inputs').show();		
           			$('#savedqueryeditor .advanced-route-disablewaypoints').prop('checked', true);		
           			$('#savedqueryeditor .advanced-route-before').val(query.advancedOptions.waypointsBefore);		
           			$('#savedqueryeditor .advanced-route-after').val(query.advancedOptions.waypointsAfter);	           					
                }		
                catch (err) { }		
            }		
            
            //temp fix for blank indices
            setTimeout(function(){
            	refreshCrossIndices();
            },1500);
        }
        else
        {
            //this is a new query so use default values
            if(savedQueryInfo.layerType == 'Live') // forced comment
            {
                // 10 sec 30 sec
                $('#savedqueryeditor .advanced-enablerefreshing').prop('checked', 'checked');
                $('#savedqueryeditor .advanced-refreshing-value').val('30');
                $('#savedqueryeditor .advanced-refreshing-unit option[value="sec"]').prop('selected', true);
            }
                
            setTimeout(function () { $('#savedqueryeditor input.name').focus() }, 100);
        }
        
        
        
    });	//end onready
    
    /***********************************
     * 
     * no new function below this point
     * older firefox will not recognize them
     * 
    *********************************/
    
} catch(e) { MA.log(e); }