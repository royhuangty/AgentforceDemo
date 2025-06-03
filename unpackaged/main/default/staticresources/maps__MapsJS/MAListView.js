//define MAListView
var defaultListViewPageSize = 50;
var actionHandler = getProperty(MASystem,'Organization.HandleAction') || 'showPopup';
var MAListView = {
	//bools for telling if the listview has ever been shown or is currently being shown
	wasLoaded: false,
	// isShown: false,

	//some vars up here go throughout the script so they're easier to change
	shapeClass: '.PlottedShapeLayer',
	queryClass: '.testing',
	proxiClass: '.layer',

	//some html we may want to change soon
	logCallHTML: actionHandler == 'showPopup'?'<a onclick="logACall_First([\'::id::\']);"><span aria-hidden="true" class="MAIcon glyphicon-phone-alt"></span></a>' : '<a href="maps__MapActions?action=log_call&id=::id::" target="_blank"><span aria-hidden="true" class="MAIcon glyphicon-phone-alt"></span></a>',
	badMarkerHTML: '<span aria-hidden="true" class="MAIcon ion-alert-circled" style="color: red; font-size: 18px"></span>',

	visibleRowHTML: '<span aria-hidden="true" class="ma-icon ma-icon-preview"></span>',
	invisibleRowHTML: '<span aria-hidden="true" class="ma-icon ma-icon-hide"></span>',

	//current maximum number of tooltips allowed
	maxTooltips: 8,

	//Setup some vars we need for the IsSelectedTab
	records: {},
	recordList: [],
	recordIdList: [],
	calculatedValues: {},

	listViewSettings: {
		pageSize: defaultListViewPageSize,
		pageNumber: 1,
		startIndex: 0,
		lastIndex: 0,
        selectedIds: [],
        selectedTabIds: [],
		currentSort: { columnToSort: '', sort: '' },
		filterCount: 0,
		queryCount: 0,
		filters: [],
		selectedTooltips: 0,
		mainCheckboxChecked: false,
		recordsDisplayed: 0
	},
	
	isLightningExperience: (typeof sforce !== 'undefined' && sforce.one),

	columnCount: 25,

	ListViewColumns: { 
		'0'		: { "label":MASystem.Labels.MA_VISIBILITY,	"visible":"true", "id":"0", "deprecated" : true,	'sortColumn' : null, "isRecordProperty" : false },				
		'1'		: { "label":MASystem.Labels.MA_CHECKBOX,	"visible":"true", "id":"1", "deprecated" : false,   'sortColumn' : null, "isRecordProperty" : false },
		'2'		: { "label":MASystem.Labels.MA_Marker,  	"visible":"true", "id":"2", "deprecated" : false,	'sortColumn' : null, "isRecordProperty" : false },
		
		'3'		: { "label":MASystem.Labels.ActionFramework_Log_a_Call,	"visible":"true", "id":"3", "deprecated" : false,	'sortColumn' : null, "isRecordProperty" : false },

		'4'		: { "label":MASystem.Labels.MA_Drive_Distance,	"visible":"true", "id":"4",  "deprecated" : false,	'sortColumn' : 'driveDistanceValue', 	"isRecordProperty" : false },
		'5'		: { "label":MASystem.Labels.MA_Drive_Time,		"visible":"true", "id":"5",  "deprecated" : false,	'sortColumn' : 'driveDurationValue', 	"isRecordProperty" : false },
		'23'	: { "label":MASystem.Labels.MA_Distance,		"visible":"true", "id":"23", "deprecated" : false,	'sortColumn' : 'straightDistanceValue', "isRecordProperty" : false },
		'24'	: { "label":MASystem.Labels.MA_Query,		    "visible":"true", "id":"24", "deprecated" : false,	'sortColumn' : null, 					"isRecordProperty" : false },
		
		'6'		: { "label":MASystem.Labels.MA_Street,		    "visible":"true", "id":"6",  "deprecated" : false,	'sortColumn' : 'street',            "isRecordProperty" : true },
		'7'		: { "label":MASystem.Labels.MA_City,		    "visible":"true", "id":"7",  "deprecated" : false,	'sortColumn' : 'city',              "isRecordProperty" : true },
		'8'		: { "label":MASystem.Labels.MA_State,		    "visible":"true", "id":"8",  "deprecated" : false,	'sortColumn' : 'state',             "isRecordProperty" : true },
		'9'		: { "label":MASystem.Labels.MA_Postal_Code,     "visible":"true", "id":"9",  "deprecated" : false,	'sortColumn' : 'zip',               "isRecordProperty" : true },
		'10'	: { "label":MASystem.Labels.MA_Country,	        "visible":"true", "id":"10", "deprecated" : false,	'sortColumn' : 'country',           "isRecordProperty" : true },
		'11'	: { "label":MASystem.Labels.MA_Longitude,       "visible":"true", "id":"11", "deprecated" : false,	'sortColumn' : 'verifiedLongitude', "isRecordProperty" : true },
		'12'	: { "label":MASystem.Labels.MA_Latitude,	    "visible":"true", "id":"12", "deprecated" : false,	'sortColumn' : 'verifiedLatitude',  "isRecordProperty" : true },
		
		'13'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [1]),	"visible":"true", "id":"13", "deprecated" : false,	'sortColumn' : 0,   "isRecordProperty" : true },
		'14'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [2]),	"visible":"true", "id":"14", "deprecated" : false,	'sortColumn' : 1,   "isRecordProperty" : true },
		'15'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [3]),	"visible":"true", "id":"15", "deprecated" : false,	'sortColumn' : 2,   "isRecordProperty" : true },
		'16'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [4]),	"visible":"true", "id":"16", "deprecated" : false,	'sortColumn' : 3,   "isRecordProperty" : true },
		'17'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [5]),	"visible":"true", "id":"17", "deprecated" : false,	'sortColumn' : 4,   "isRecordProperty" : true },
		'18'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [6]),	"visible":"true", "id":"18", "deprecated" : false,	'sortColumn' : 5,   "isRecordProperty" : true },
		'19'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [7]),	"visible":"true", "id":"19", "deprecated" : false,	'sortColumn' : 6,   "isRecordProperty" : true },
		'20'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [8]),	"visible":"true", "id":"20", "deprecated" : false,	'sortColumn' : 7,   "isRecordProperty" : true },
		'30'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [9]),	"visible":"true", "id":"30", "deprecated" : false,	'sortColumn' : 8,   "isRecordProperty" : true },
		'31'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [10]),	"visible":"true", "id":"31", "deprecated" : false,	'sortColumn' : 9,   "isRecordProperty" : true },
		'32'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [11]),	"visible":"true", "id":"32", "deprecated" : false,	'sortColumn' : 10,   "isRecordProperty" : true },
		'33'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [12]),	"visible":"true", "id":"33", "deprecated" : false,	'sortColumn' : 11,   "isRecordProperty" : true },
		'34'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [13]),	"visible":"true", "id":"34", "deprecated" : false,	'sortColumn' : 12,   "isRecordProperty" : true },
		'35'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [14]),	"visible":"true", "id":"35", "deprecated" : false,	'sortColumn' : 13,   "isRecordProperty" : true },
		'36'	: { "label":window.formatLabel(MASystem.Labels.Field_Number, [15]),	"visible":"true", "id":"36", "deprecated" : false,	'sortColumn' : 14,   "isRecordProperty" : true },
		
		'21'	: { "label":MASystem.Labels.MA_Address,	        "visible":"true", "id":"21", "deprecated" : false,	'sortColumn' : 'FormattedAddress_MA',      "isRecordProperty" : true },
		'22'	: { "label":MASystem.Labels.MA_Position,        "visible":"true", "id":"22", "deprecated" : false,	'sortColumn' : null,    "isRecordProperty" : true },
		
		// Live
		'25'	: { "label":MASystem.Labels.MA_LAST_REPORT_DATE,	"visible":"true",	"id":"25",	"deprecated" : false,	'sortColumn' : 'device.timestamp',    "isRecordProperty" : true, 'layerType':'Live' },
		'26'	: { "label":MASystem.Labels.MA_LAST_REPORT_TIME,    "visible":"true",	"id":"26",	"deprecated" : false,	'sortColumn' : 'device.timestamp',    "isRecordProperty" : true, 'layerType':'Live' },
		'27'	: { "label":MASystem.Labels.MA_LAST_EVENT,          "visible":"true",	"id":"27",	"deprecated" : true,	'sortColumn' : 'device.timestamp',    "isRecordProperty" : true, 'layerType':'Live' },
		'28'	: { "label":MASystem.Labels.MA_LAST_SPEED,          "visible":"true",	"id":"28",	"deprecated" : false,	'sortColumn' : 'device.timestamp',    "isRecordProperty" : true, 'layerType':'Live' },
	
		'29'	: { "label":MASystem.Labels.MA_LAYER_TYPE,		    "visible":"true",	"id":"29",	"deprecated" : false,	'sortColumn' : '',  				  "isRecordProperty" : false,'layerType':'Live' },
	},
	
	DefaultListViewColumns: {
		0:  {id: "1"},
		1:  {id: "2"},
		2:  {id: "6"},
		3:  {id: "7"},
		4:  {id: "8"},
		5:  {id: "9"},
		6:  {id: "10"},
		7:  {id: "11"},
		8:  {id: "12"}
	},
	
	operators: {
		none				: '<option value="none">'+MASystem.Labels.MA_None+'</option>',

		equals				: '<option value="equals">'+MASystem.Labels.MA_Equals+'</option>',
		notEqualTo			: '<option value="notEqualTo">'+MASystem.Labels.MA_Not_Equal+'</option>',
		startsWith			: '<option value="startsWith">'+MASystem.Labels.MA_Starts_With+'</option>',
		contains			: '<option value="contains">'+MASystem.Labels.MA_Contains+'</option>',
		doesNotContain		: '<option value="doesNotContain">'+MASystem.Labels.MA_Does_Not_Contain+'</option>',
		endsWith			: '<option value="endsWith">'+MASystem.Labels.MA_Ends_With+'</option>',

		lessThan			: '<option value="lessThan">'+MASystem.Labels.MA_Less_Than+'</option>',
		lessThanEqualTo		: '<option value="lessThanEqualTo">'+MASystem.Labels.MA_Less_Than_Equal+'</option>',
		greaterThan			: '<option value="greaterThan">'+MASystem.Labels.MA_Greater_Than+'</option>',
		greaterThanEqualTo	: '<option value="greaterThanEqualTo">'+MASystem.Labels.MA_Greater_Than_Equal+'</option>',
		range				: '<option value="range">'+MASystem.Labels.MA_Range+'</option>',
	},

	//distance matrix
	DistanceMatrixProcessing: false,
	DistanceMatrixRequest: [],
	
	currentURL: window.location.href.split('/')[0]+'//'+window.location.href.split('/')[2]+'/',

	liveColumns: ['25','26','27','28'],
	tooltipColumns: ['13', '14', '15', '16', '17', '18', '19', '20','30','31','32','33','34','35','36'],
	//################################################## KEEPING ##################################################
	

	//========== DRAWING ==========
	// Draws the entire tab
	DrawTab: function(options) {
		/*
			var options = {
				layerId         : 'string',
				isSelectedTab   : true|false,
				isExport        : true|false 
		   }
		*/
		var dfd = $.Deferred();
		options = $.extend({
			layerId : 'xxx',
			isSelectedTab : false,
			isExport : false
		}, options || {});
				
		//first let's get the recordsList which should contain a list of record Ids in order for us to display.
		//and let's get the list view settings needed
		
		var pageSizeDefault = defaultListViewPageSize;
		$('#listViewLoader').removeClass('hidden');
		if(typeof userSettings != 'undefined') {
			pageSizeDefault = userSettings.hasOwnProperty('PageSizeDefault') ? userSettings.PageSizeDefault : defaultListViewPageSize;
		}
		
		
		//CASE 13591: fix for the page size issue
		var currentLayer = options.layerId === 'SelectedTab' ? MAListView : $('[qid="' + options.layerId + '"]').data();
		if( (currentLayer || {}).hasOwnProperty('listViewSettings') ) {
			if( (currentLayer.listViewSettings || {}).hasOwnProperty('useDefaults') ) {
				pageSizeDefault = currentLayer.listViewSettings.useDefaults ? pageSizeDefault : $('div#' + options.layerId).find('select.lv-records-per-page').val();
			}
		}
		
		
		var recordList = [];
		var listViewSettings = {
			pageSize: defaultListViewPageSize,
			pageNumber: 1,
			startIndex: 0,
			lastIndex: 0,
            selectedIds: [],
            selectedTabIds: [],
			currentSort: { columnToSort: '', sort: '' },
			filterCount: 0,
			queryCount: 0,
			filters: [],
			selectedTooltips: 0,
		    mainCheckboxChecked: false
		}
		
		
		//we make an object for the layerData in case we need to span mulitpule queries
		var layerData = {};
		var layerDataId = '';
		var recordProcessDone = true;
		if (options.isSelectedTab)
		{
			recordProcessDone = false;
			//since this is the selected tab, let's pull from the "selected" object inside MAListView
			recordList = MAListView.recordList || [];
			listViewSettings = MAListView.listViewSettings;
			listViewSettings.pageSize = pageSizeDefault;
			var recordListLength = recordList.length;
            // var queryCount = [];
			var selectedTooltips = 0;
			var i = 0;
			while (i < recordListLength) {
				var recProcessed = 0;
				while (recProcessed < 100 && i < recordListLength) {
					recProcessed++;
					
					var layerIdTemp = MAListView.recordIdList[i];
					var layerDataTemp = $(MAListView.queryClass + '[qid="' + layerIdTemp + '"]').data() || { records: {} };
					
					layerData[layerIdTemp] = layerDataTemp;
					layerDataId = layerIdTemp;
					
					var tooltipLength = layerDataTemp.tooltips.length || 0;
					selectedTooltips = tooltipLength > listViewSettings.selectedTooltips ? tooltipLength : listViewSettings.selectedTooltips;

					i++;
				}
			}
		
			// MAListView.listViewSettings.queryCount = queryCount.length;
			MAListView.listViewSettings.selectedTooltips = selectedTooltips;
			
			//this is the first draw
			if( !MAListView.listViewSettings.hasOwnProperty('useDefaults') ) {
				MAListView.listViewSettings.useDefaults = true;
			}
			
			recordProcessDone = true;			
		} else {
		    //Set the layerData
		    layerDataId = options.layerId || '';
			layerData[options.layerId] = $('[qid="' + options.layerId + '"]').data() || {};
			
			//make sure we have list view settings
			var checkListSettings = getProperty(layerData[options.layerId], 'listViewSettings', false);
			if(checkListSettings == undefined) {
				layerData[options.layerId].listViewSettings = {};
			}
			
			//this is the first draw
			if( !layerData[options.layerId].listViewSettings.hasOwnProperty('useDefaults') ) {
				layerData[options.layerId].listViewSettings.useDefaults = true;
			}
			
			//do we have any settings?
			listViewSettings = layerData[options.layerId].listViewSettings || {};
			listViewSettings.pageSize = pageSizeDefault;
			
			//we should have a recordList
			recordList = layerData[options.layerId].recordList || [];
		}
		
		finishDrawingTab();

		function finishDrawingTab () {
			if (recordProcessDone) {
				//if this an export, let's modify the listViewSettings to show all of the rows
				if (options.isExport)
				{
					listViewSettings.pageSize = userSettings.maxExportSize === 0 ? 1000000 : userSettings.maxExportSize;
					listViewSettings.startIndex = 0;
				}
		
				//we have a search-all box that may or may not have the 'enter-keypress' class
				if( !$('#' + options.layerId).find('.listview-search').hasClass('enter-keypress') ) {
					var isCreating = '';
					//add enter-keypress ability since it's not there
					$('#' + options.layerId).find('.listview-search-text').keypress( function(e) {
						if(e.keyCode == 13) { 
							$('#' + options.layerId).find('a[role="search"]').click();
						}
					});
		
					//add this class so we know we've been here already
					$('#' + options.layerId).find('.listview-search').addClass('enter-keypress');
				}
		
				//let's make the table and table header
				var tableHTML = '<table>';
		
				// update mass action drop down
				var massActionHtml = MAListView.buildListViewMassActions();
				$('#' + options.layerId).find('.mass-action-wrapper select').empty().html(massActionHtml);
		
				//header, loop over the user selected perferences for the columns
				MAListView.DrawTabTableHeader({
					isSelectedTab   : options.isSelectedTab,
					layerData       : options.isSelectedTab ? layerData[layerDataId] : layerData[options.layerId],
					isExport        : options.isExport
				}).then(function(res) {
					tableHTML += res.html || '';
					//got our headers, now build the rows
					//loop over the records until we've shown enough records or we've run out of the records to show. 
					//since records is an object it self with properties, we need to loop over the properties and keep track of where we're at
					//listViewSettings.pageSize = pageSizeDefault;
					MAListView.DrawTabTableDataRows({
					
						layerId             : options.layerId,
						recordList         : recordList,
						listViewSettings    : listViewSettings,
						layerData           : layerData,
						isSelectedTab       : options.isSelectedTab,
						isExport            : options.isExport
						
					}).then(function(res2) {
						
						tableHTML += res2.html;

						//Render Table Html
						if (options.isExport)
						{
							//if this is to be exported, let's add it to the hidden export table
							$('#HiddenExportTable').html(tableHTML + '</table>');
						}
						else
						{
							$('#' + options.layerId).find('table.listview-data-table').html(tableHTML + '</table>');
							MAListView.UpdatePageShowing(options);
						}
						
						if(userSettings.maxExportSize <= 0) {
						    $('div#' + options.layerId).find('a[role="ListView-Export-Button"]').hide();
						}
				
						//always redraw headers with correct sorts applied
						var coloumSort = getProperty(listViewSettings || {},'currentSort.columnToSort',false) || '';
						var sort = getProperty(listViewSettings || {},'currentSort.sort',false) || '';
						$('div#' + options.layerId + ' th[colid="' + coloumSort + '"]').removeClass('asc').removeClass('desc').addClass(sort);
						
						//add click to the main checkbox for this tab
						if($('div#' + options.layerId).find('input.listview-main-checkbox').length > 0 && options.layerId !== 'SelectedTab') {
							$('div#' + options.layerId).find('input.listview-main-checkbox')[0].checked = layerData[options.layerId].listViewSettings.mainCheckboxChecked;
							$('div#' + options.layerId).find('input.listview-main-checkbox').click( function() {
							  
							    if(this.checked) {
							        layerData[options.layerId].listViewSettings.mainCheckboxChecked = true;
							        MAListView.SelectAll(options.layerId);
							    } else if(!this.checked) {
							        layerData[options.layerId].listViewSettings.mainCheckboxChecked = false;
							        MAListView.ClearSelected(options.layerId);
							    }
							    
							});
						}
						
						// fix the listview records per page
						$('div#' + options.layerId).find('select.lv-records-per-page').val( pageSizeDefault );
						$('#listViewLoader').addClass('hidden');

						window.VueEventBus.$emit('render-list-view');
						dfd.resolve({success:true});
					});
				});
			}
		}

		return dfd.promise();
	},

	// Draws the table header for the table inside the tab
	DrawTabTableHeader: function(options) {
		/*
			//listViewSettings is returned with the update startIndex
		
			var options = {
				isSelectedTab   : true|false,
				layerData       : {}
		   }
		*/
		var dfd = $.Deferred()
		options = $.extend({
			isSelectedTab : false,
			layerData : {}
		},options || {});
		//Are the columns defined in userSettings? If not we should populate them with the defaults.
		if(userSettings.ListViewColumns == undefined || Object.keys(userSettings.ListViewColumns).length === 0) {
			userSettings.ListViewColumns = MAListView.DefaultListViewColumns;
		}
		//are we in the selected tab or not?
		var layerId = options.isSelectedTab ? 'SelectedTab' : options.layerData.qid;
		var rowHTML = '<tr>';
		var headers = userSettings.ListViewColumns || {};
		var keys = Object.keys(headers);
		var headerLength = keys.length;
		var i = 0;
		var index;
		var colId;
		setTimeout(function doBatch() {
            if (i < headerLength)
            {
                var headerProcessed = 0;
                while (headerProcessed < 28 && i < headerLength) {
                    headerProcessed++;
                    var index = keys[i];
                    var colId = userSettings.ListViewColumns[index];
                    var col = MAListView.ListViewColumns[colId.id];
                    
					if (col.deprecated == false)
					{
						var colTitle = options.isExport ? '' : 'Missing';
						var colVisible = true;
						
						//these are the special selected tab-only columns
						if ((options.isSelectedTab && col.id=='1') || (!options.isSelectedTab && (col.id=='4' || col.id=='5' || col.id=='23' || col.id=='24')))
						{
							colVisible = false;
						} else if((options.isSelectedTab && col.id=='24')) {
							colVisible = MAListView.listViewSettings.queryCount > 1 ? true : false;
							colTitle = 'Query Name';
						}
						
						//if we're building a selected tab, let's leave the heading names alone
						if (options.isSelectedTab)
						{
							var lastSeven = ['30','31','32','33','34','35','36' ];
                            var tooltipId = jQuery.inArray(col.id,lastSeven) > -1 ? parseInt(col.id) - 22 : parseInt(col.id) - 13;
		
							if (MAListView.ListViewColumns.hasOwnProperty(col.id) && MAListView.listViewSettings.queryCount > 1)
							{
								if(jQuery.inArray(col.id,[ '13','14','15','16','17','18','19','20','30','31','32','33','34','35','36' ]) > -1 && tooltipId >= MAListView.listViewSettings.selectedTooltips) {
									colVisible = false;
								} else {
									colTitle = MAListView.ListViewColumns[col.id].label;
								}
								
							} else {
								if(jQuery.inArray(col.id,[ '13','14','15','16','17','18','19','20','30','31','32','33','34','35','36']) > -1 && tooltipId < options.layerData.tooltips.length) {
									colTitle = options.layerData.tooltips[tooltipId].FieldLabel;
								} else if(jQuery.inArray(col.id,[ '13','14','15','16','17','18','19','20','30','31','32','33','34','35','36']) > -1 && tooltipId >= options.layerData.tooltips.length) {
									colVisible = false;
								} else {
									colTitle = MAListView.ListViewColumns[col.id].label;
								}
							}
						}
						//otherwise we'll use more formal names, especially with tooltips
						else
						{
						    // is it a normal column or a tooltip or something else?
						    if(jQuery.inArray(col.id,[ '0','1','2','3','4','5','6','7','8','9','10','11','12','21','22','23','24', '25', '26', '27', '28', '29' ]) > -1) {
						        
						        colTitle = MAListView.ListViewColumns[col.id].label;
						        
						    } else if(jQuery.inArray(col.id,[ '13','14','15','16','17','18','19','20']) > -1) {
						        
						        var tooltipId = parseInt(col.id) - 13;
						        //check to see if things exist!!!
						        
		                        if (options.layerData && options.layerData.tooltips && options.layerData.tooltips[tooltipId]) {
		                            colTitle = options.layerData.tooltips[tooltipId].FieldLabel;
		                        } else {
		                            colVisible = false;
		                        }
		                        
						    } else if(jQuery.inArray(col.id,['30','31','32','33','34','35','36' ]) > -1) {
						        
						        var tooltipId = parseInt(col.id) - 22;
						        //check to see if things exist!!!
						        
		                        if (options.layerData && options.layerData.tooltips && options.layerData.tooltips[tooltipId]) {
		                            colTitle = options.layerData.tooltips[tooltipId].FieldLabel;
		                        } else {
		                            colVisible = false;
		                        }
		                        
						    } else {
						        colTitle = options.isExport ? '' : 'Missing';
						    }
						}
						
						if(col.id == '1') {
						    colTitle = '<input type="checkbox" class="listview-main-checkbox">';
						}
						
						if(col.id == '3' && MAListView.isLightningExperience) {
						    colVisible = false;
						}
						
						// don't display live column headers for non-live layers
						if(!options.isSelectedTab && MAListView.liveColumns.indexOf(col.id) >= 0 && !/live/i.test(options.layerData.layerType))
						{
							colVisible = false;
						}
		
						//is the column visible? is it deprecated?
						if (colVisible) {
							//visible and NOT deprecated columns get built here
							if((options.isSelectedTab && colTitle.indexOf('Tooltip') > -1 && MAListView.listViewSettings.queryCount > 1) || MAListView.ListViewColumns[col.id].sortColumn == null) {
								rowHTML += '<th colid="' + col.id + '">' + colTitle + '</th>';
							} else {
								rowHTML += '<th class="listview-col-sortable" colid="' + col.id + '" onclick="MAListView.SortFromDOM(this);">' + colTitle + '<span></span></th>';
							}
						}
						else if (!colVisible) {
							//invisible and NOT deprecated columns get built here
							if((options.isSelectedTab && colTitle.indexOf('Tooltip') > -1 && MAListView.listViewSettings.queryCount > 1) || MAListView.ListViewColumns[col.id].sortColumn == null) {
								rowHTML += '<th style="display: none;" colid="' + col.id + '">' + colTitle + '</th>';
							} else {
								rowHTML += '<th class="listview-col-sortable" style="display: none;"  colid="' + col.id + '" onclick="MAListView.SortFromDOM(this);">' + colTitle + '<span></span></th>';
							}
						}
					}


                    i++;
                }
                setTimeout(doBatch, 1);
            }
            else 
            { 
                rowHTML += options.isExport ? '<th colid="100">Record ID</th>' : '' ;
				
				rowHTML += '</tr>';
				dfd.resolve({html:rowHTML});
            }
		}, 1);
		
        return dfd.promise();
	},

	RemoveSort: function(){
		MAListView.listViewSettings.currentSort.sort = '';
	},

	// Draws a single data row for the table inside the tab
	DrawTabTableDataRow: function(recordListItem, layerId, property, record, layerData, listViewSettings, isSelectedTab, isExport) {
        if(record !== undefined) {
			//get the lat and lng for the marker or leave as N/A if it's N/A
			var lat = 'N/A';
			var lng = 'N/A';
			
			if (record.marker === undefined && record.polyline === undefined) 
			{
				lat = 'N/A';
				lng = 'N/A';
			}
			else
			{
				lat = record.location.coordinates.lat;
				lng = record.location.coordinates.lng;
			}
			
			// get device object, non-existent if non-live
			var device = record.device;
			
			var rowHTML = '<tr rowtype="data-row" data-id="'+record.Id + '" data-qid="' + layerId + '" lat="' + lat + '" lng="' + lng + '">';
			
            var isHeatmap = layerData.hasOwnProperty('heatmapLayer');
            var isVisible = record.isVisible || record.isScattered || record.isClustered || isHeatmap || record.isPolylineVisible;
			var MAIO_URL = getProperty(MASystem, 'Organization.MAIO_URL', false);
            //record.listViewVisible = isVisible;
				
			$.each(userSettings.ListViewColumns, function( index, colId ) {
				var col = MAListView.ListViewColumns[colId.id];
							
				//if this isn't the IsSelectedTab let's not show columns 4 & 5 (Diriving Distance/Time) NOTE
				if (col.deprecated == false)
				{
					var colContents = isExport ? '' : 'Missing';
					var colVisible = true;
					
					//these are the special selected tab-only columns
					if ((isSelectedTab && col.id=='1') || (!isSelectedTab && (col.id=='4' || col.id=='5' || col.id=='23' || col.id=='24')))
					{
						colVisible = false;
					} else if((isSelectedTab && col.id=='24')) {
						colVisible = MAListView.listViewSettings.queryCount > 1 ? true : false;
					}
					// don't display live column data for non-live layers
					else if(!isSelectedTab && MAListView.liveColumns.indexOf(col.id) >= 0 && !/live/ig.test(layerData.layerType))
					{
						colVisible = false;
					}
					
					switch(col.id)
					{
					    //VISIBILITY
						case '0':
							if (isVisible)
							{
								colContents = MAListView.visibleRowHTML;
							}
							else
							{
								colContents = MAListView.invisibleRowHTML;
							}
							break;
							
							
						//CHECKBOX
						case '1':  
							colContents = '';
							if (record)
							{
								if (jQuery.inArray( property, listViewSettings.selectedIds) > -1   )
								{
									colContents = '<input type="checkbox" id="' + layerId + '-' + record.Id + '" checked="checked" onclick="MAListView.RowSelected(\'' + record.Id + '\',\'' + layerId + '\',this);"/>';
								}
								else
								{
									colContents = '<input type="checkbox" id="' + layerId + '-' + record.Id + '" onclick="MAListView.RowSelected(\'' + record.Id + '\',\'' + layerId + '\',this);"/>';
                                }
							}
							break;
							
							
						//MARKER
						case '2':  
							//colContents = 'Marker';
							
							if(record.marker === undefined && record.polyline === undefined) 
							{
								colContents = MAListView.badMarkerHTML;
							} 
							else 
							{
								colContents = '<a onClick="MAListView.MarkerClick(\'' + layerData.qid + '\',\'' + record.Id + '\')">';
								
								var markerAssignmentType = layerData.markerAssignmentType || layerData.queryRecord.ColorAssignmentType__c;
								var applyMarkerAssignmentType = function() {
									var brush = record.markerValue.indexOf(':') >= 0 ? record.markerValue.replace('#', '') : record.markerValue.replace('#', '') + ':Marker';
									var brushSplit = brush.split(':')[1];
									if(brush.indexOf('image') >= 0) {
										// check if image is in docs or files..
										if(brushSplit.substring(0, 3) === '015') {
											colContents += '<img src="' + MA.SitePrefix + '/servlet/servlet.FileDownload?file=' + brushSplit + '" class="listview-marker-icon" />';

										} else {
											colContents += '<img src="' + MA.SitePrefix + '/sfc/servlet.shepherd/version/download/' + brushSplit + '" class="listview-marker-icon" />';
										}
										
									} else {
										var colorParts = brush.split(':');
										var iconPart = colorParts[1] || 'Circle';
										var iconColor = colorParts[0] || '3083d3';
										iconColor = iconColor.replace(/#/g,'');
										var markerURL = MAIO_URL + '/images/marker/3?color='+iconColor+'&forlegend=true&icon='+iconPart;
										colContents += '<img src="'+markerURL+'" style="width:12px;" />';
									}
								}
								
								switch(markerAssignmentType) 
								{
									case 'Static':
										applyMarkerAssignmentType();
										break;
										
									case 'Dynamic, Field':
										applyMarkerAssignmentType();
										break;
										
									case 'Dynamic-multiField':
										applyMarkerAssignmentType();
										break;
										
									case 'Dynamic-Order':
										colContents += '<img src="' + record.marker.icon.url + '" class="listview-marker-icon" />';
										break;
										
									case 'Dynamic-Label':
										colContents += 'Label';
										break;
										
									default:
										colContents += MAMarkerBuilder.createSVG({forLegend : true});
										break;
								}

								colContents += '</a>';
							}
							break;
							
							
						//LOG A CALL
						case '3':
						    colVisible = !MAListView.isLightningExperience;
							colContents = MAListView.logCallHTML.replace('::id::', record.Id);
							break;
							
							
						//CALCULATED DISTANCES
						case '4':
							colContents = MAListView.calculatedValues.hasOwnProperty(record.Id) ? MAListView.calculatedValues[record.Id].driveDistanceText || '' : '';
							break;
							
						case '5':  
							colContents = MAListView.calculatedValues.hasOwnProperty(record.Id) ? MAListView.calculatedValues[record.Id].driveDurationText || '' : '';
							break;
							
						case '23':  
							colContents = MAListView.calculatedValues.hasOwnProperty(record.Id) ? MAListView.calculatedValues[record.Id].straightDistanceText || '' : '';
							break;
							
						case '24':  
							colContents = '';
							if (layerData.savedQueryName) { colContents = htmlEncode(layerData.savedQueryName);	}
							break;
							
							
							
							
					    //ADDRESS PIECES
						case '6':
						    
						case '7':
							
						case '8':
							
						case '9':
							
						case '10':
							colContents = '';
							var addrFieldCol = MAListView.ListViewColumns[col.id].sortColumn;
							
							if(/live/i.test(layerData.layerType))
							{
								if(device instanceof MADevice)
								{
									var addressObject = device.getAddressObject();
									
									if(addressObject && typeof addressObject == 'object')
									{
										colContents = addressObject[addrFieldCol] || '';
										colContents = htmlEncode(colContents);
									}
								}
							}
							else
							{
								if (layerData.addressFields && layerData.addressFields[addrFieldCol] && record)
								{
								    var fieldToGet = layerData.addressFields[addrFieldCol];
									colContents = getProperty(record, fieldToGet, false) || '';
									colContents = htmlEncode(colContents);
								}
							}
							break; 
						
						case '11':
						
						case '12':
							colContents = '';
							var addrFieldCol = MAListView.ListViewColumns[col.id].sortColumn;
							
							if (layerData.addressFields && layerData.addressFields[addrFieldCol] && record)
							{
								var fieldToGet = layerData.addressFields[addrFieldCol];
							    colContents = getProperty(record, fieldToGet, false);
							}
							
							//if it's still blank, let's try one last thing
							if (colContents === '' || colContents === undefined) {
							    colContents = col.id === '11' ? record.location.coordinates.lng : record.location.coordinates.lat;
							}
							break;
						
						//TOOLTIPS
						case '13':
						    var ProcessToolTipColumnReturn = MAListView.ProcessToolTipColumn({
								toolTipIndex: MAListView.ListViewColumns[col.id].sortColumn,
								record: record,
								layerData: layerData,
								isSelectedTab: isSelectedTab
							});
							
							colContents = ProcessToolTipColumnReturn.colContents;
							colVisible = ProcessToolTipColumnReturn.colVisible;
							break;
						case '14':
							
						case '15':
							
						case '16':
							
						case '17':
							
						case '18':
							
						case '19':
							
						case '20':
						
						case '30':
							
						case '31':
							
						case '32':
							
						case '33':
							
						case '34':
							
						case '35':
							
						case '36':	
							var ProcessToolTipColumnReturn = MAListView.ProcessToolTipColumn({
								toolTipIndex: MAListView.ListViewColumns[col.id].sortColumn,
								record: record,
								layerData: layerData,
								isSelectedTab: isSelectedTab
							});
							
							colContents = ProcessToolTipColumnReturn.colContents;
							colVisible = ProcessToolTipColumnReturn.colVisible;
							
							break;
	
						//FULL ADDRESS 
						case '21':
							colContents = Plotting.getFormattedAddress(record, layerData) || '';
							
							if( colContents == null || colContents == undefined || String(colContents).trim() == '' ) 
							{
								if( /live/ig.test(layerData.layerType) && device)
								{
									colContents = '<a href="#" onclick="MAListView.updateLiveListViewRecordAddress(this);" style="border:1px solid black;">Update Address</a>';
								}
							}
							
							break;
	
						//COMBINED LAT LNG	
						case '22':
							colContents = 'N/A';
							if (lat != 'N/A') { colContents = parseFloat(lat).toFixed(4) + ',' + parseFloat(lng).toFixed(4); }
							break;
							
						// Last Report Date (Live)	
						case '25':
							colContents = isSelectedTab ? MASystem.Labels.MA_NA : colContents;
							
							if(device instanceof MADevice)
							{
								colContents = device.getFormattedDate() || '';
							}
							break;
							
						// Last Report Time (Live)
						case '26':
							colContents = isSelectedTab ? MASystem.Labels.MA_NA : colContents;
							
							if(device instanceof MADevice)
							{
								colContents = device.getFormattedTime() || '';
							}
							break;
							
						// Last Event (Live)
						case '27':
							colContents = isSelectedTab ? MASystem.Labels.MA_NA : colContents;
							
							if(device instanceof MADevice)
							{
								var deviceEvent = device.getEvent() || {};
								colContents = deviceEvent.name || deviceEvent.code || '';
							}
							break;
							
						// Last Speed (Live)
						case '28':
							colContents = isSelectedTab ? MASystem.Labels.MA_NA : colContents;
							
							if(device instanceof MADevice)
							{
								var deviceSpeed = device.getFormattedSpeed(); // speed converted to current user setting and 2 decimal places
								
								colContents = isNum(deviceSpeed) ? deviceSpeed : '';
							}
							break;
						
						case '29':
							var layerTypeDisplay = (layerData || {}).layerType;

							if (record.isPolyline) layerTypeDisplay = 'Polyline';
							layerTypeDisplay = /marker/i.test(layerTypeDisplay) ? MASystem.Labels.MA_Marker : layerTypeDisplay; // If Markers change to Marker
							colContents =  layerTypeDisplay || 'Missing';
							break;
							
						//DEFAULT
						default:
							colContents = 'Missing';
							break;
					}
						
					
					
					if (colVisible)
					{
						rowHTML += '<td colid="' + col.id + '">' + colContents + '</td>';
					}
					else
					{
						rowHTML += '<td style="display: none;" colid="' + col.id + '">' + colContents + '</td>';
					}
					
					
				}
			});
			
			rowHTML += isExport ? '<td colid="25">' + record.Id + '</td>' : '' ;
			
			rowHTML += '</tr>';
			
			return rowHTML;
        } else {
            return '';
        }
	},

	// Draws N table data rows calling on DrawTabTableDataRow()
	DrawTabTableDataRows: function(options) {
		var dfd = $.Deferred();
		
		var dataRowsHTML = '';				
		var recordsListLength = options.recordList.length;
		var recordsDisplayed = 0;
		var startIndex = 0;

		setTimeout(function doBatch() {
            if (startIndex < recordsListLength)
            {
                var recProcessed = 0;
                while ((recProcessed < 100) && (startIndex < recordsListLength)) {
                    recProcessed++;
					var newLayerId = options.isSelectedTab ? MAListView.recordIdList[startIndex] : options.layerId;

					var recordId = options.recordList[startIndex].split('::')[0];
					var record = options.layerData[newLayerId].records[recordId];
					var recordIsHeatmap = options.layerData[newLayerId].hasOwnProperty('heatmapLayer');
				    
				    if(record != undefined) {
						//is this record visible? if so, let's display it - handles heatmap/cluster/etc
		                record.listViewVisible = options.layerData[newLayerId].listViewSettings.filters.length > 0 ? record.listViewVisible : record.isVisible || record.isScattered || record.isClustered || recordIsHeatmap || record.isPolylineVisible;
						
		                var selectedTabRowVis = MAListView.calculatedValues.hasOwnProperty(record.Id) ? MAListView.calculatedValues[record.Id].isVisible : true;
						var recordIsVisible = options.isSelectedTab ? selectedTabRowVis : record.listViewVisible; //record.isVisible || record.isScattered || record.isClustered || recordIsHeatmap;
						record.listViewVisible = recordIsVisible;
						
						if(recordIsVisible && startIndex >= options.listViewSettings.startIndex && recordsDisplayed < options.listViewSettings.pageSize) {
							dataRowsHTML += MAListView.DrawTabTableDataRow({}, newLayerId, recordId, record, options.layerData[newLayerId], options.listViewSettings, options.isSelectedTab, options.isExport);
							recordsDisplayed++;
						}
				    }
                    startIndex++;
                }
                setTimeout(doBatch, 1);
            }
            else 
            {
            	//options.dataRowsHTML = dataRowsHTML;
                dfd.resolve({html : dataRowsHTML, totalRows : recordsDisplayed });
            }
        }, 1);
		
		
		return dfd.promise();
	},



	//========== METHODS FOR MANIPULATING TABS ==========
	// Adds a tab to the list of tabs
	AddTab: function(layerId) {
		if(!MAListView.TabExists(layerId)) {

			var title = '';
			var data = '';

			var isQuery = MAListView.IsQuery(layerId);
			var isProxLayer = MAListView.IsProxLayer(layerId);

			//is this a query or a shape?
			if (isQuery) {
				var la = $(MAListView.queryClass + '[qid="' + layerId + '"]');
				var t1 = la.data('savedQueryName');
				var t2 = la.find('.basicinfo-name').text();

				title = t1 === '' ? t2 : t1;
			} else if (isProxLayer) {
				title = $(MAListView.proxiClass + '[qid="' + layerId + '"]').data('title');
			} else {
				// var t1 = $(MAListView.shapeClass + '[qid="' + layerId + '"]').data('dataLayer').style.proxType;
				// var t2 = $(MAListView.shapeClass + '[qid="' + layerId + '"]').data('labels')[0].text;
				var ld = $(MAListView.shapeClass + '[qid="' + layerId + '"]').data();
				var t1 = ld.dataLayer.style.proxType;
				var t2 = ld.labels[0].text;

				title = (t1 === undefined || t1 === null) ? t2 : t1;
			}
			title = htmlEncode(htmlDecode(title));
				var $tabContent = $('#templates #ListViewTabContents').clone().html()
					.replace(/::layerId::/g, layerId);
			
			//put the title and data in the tabs
			$('#listview-tabs ul').append('<li><a href="#' + layerId + '">' + title + '</a></li>');
			$('#listview-tabs').append('<div id="' + layerId + '">' + $tabContent + '</div>');

			$('#listview-tabs').tabs({
				activate: function( event, ui ) {
					if (ui.newTab && ui.newTab.length) {
						var layerId = $(ui.newTab[0]).find('.ui-tabs-anchor').attr('href').substring(1);
				
						var options = { 
							layerId: layerId,
							isSelectedTab: layerId === 'SelectedTab', 
							isExport: false 
						};
				
						MAListView.DrawTab(options);
					}
				}
			});
		}
	},

	// Removes a specific tab from the list of tabs
	RemoveTab: function(layerId) {
	    var tabCount = $('#listview-tabs li').length;
	    var selectedTabExists = MAListView.TabExists('SelectedTab');
	    
		if(MAListView.TabExists(layerId)) {
		    
		    //let's clear any searches that were going on
            MAListView.ClearSearch({ layerId: layerId });
		    
			$('#listview-tabs').find('li a[href="#' + layerId + '"]').closest('li').remove();
			$('#listview-tabs').find('div#' + layerId).remove();
			
			//need to figure out if we should close the list view panel or not?
			if(tabCount <= 1) {
			    
				//if this is the last tab, hide the listview
				MAListView.CloseListViewNoLayers();
				
			} else if( tabCount == 2 && selectedTabExists && layerId !== 'SelectedTab' ) {
			    
			    //if this is the last tab AND we have a selected tab, hide the listview
			    MAListView.ClearAllSelected();
				MAListView.CloseListViewNoLayers();
				
			} else {
			    
			    //not the last tab at all, let's select the first tab
		        MAListView.SelectFirstTab();
			    
			}
			
		}
	},
	
	//Selects the first tab in the list of tabs
	SelectFirstTab: function() {
	    var arr = $('#listview-tabs li') || [];
	    
	    if(arr.length > 0) {
    	    var qid = arr[0].getAttribute('aria-controls');
    	    MAListView.SelectTab(qid);
	    }
	},

	// Selects a tab from the list of tabs and makes it active/selected on screen
	SelectTab: function(layerId) {
		if(MAListView.TabExists(layerId)) {
			// this selects the tab
			if(MAListView.wasLoaded && MAListView.isVisible()) {
				var index = $('#listview-tabs a[href="#' + layerId + '"]').parent().index();
				$('#listview-tabs').tabs( 'option', 'active', index);
			}
		}
	},

	// Uses various methods to add, select, and show the correct tab
	ConstructTab: function(layerId) {
		MAListView.AddTab(layerId);
		
		var pageSizeDefault = userSettings.PageSizeDefault || defaultListViewPageSize;
		var currentPageSize = $('div#'+layerId).find('select.lv-records-per-page').val() || pageSizeDefault;

		//default to the userSettings value for the first draw
		if(pageSizeDefault > 0) {
			$('div#' + layerId).find('select.lv-records-per-page').val( currentPageSize );
			//$('div#' + layerId).find('select.lv-records-per-page')[0].onchange();
			MAListView.ChangePageSize( layerId, parseInt( currentPageSize ) ).then(function() {
				// sort by tooltip 1 column by default
				MAListView.sortColumn({
					columnId: 13, // tooltip 1 column Id
					layerId: layerId
				});
			});
		} else {
		    MAListView.DrawTab({ layerId: layerId, isSelectedTab: false, isExport: false }).then(function() {
		    	// sort by tooltip 1 column by default
		    	MAListView.sortColumn({
					columnId: 13, // tooltip 1 column Id
					layerId: layerId
				});
		    });
		}

		if (MAListView.isVisible()) {
			MAListView.Show();
			MAListView.SelectTab(layerId);
		}

		$('#listview-accesstab').show().addClass('show-lv-accesstab');
	},


	sortColumn: function(options) {
		/**
			options = {
				layerId: STRING
				columnId: STRING
			}
		**/
		if(options && typeof options == 'object') {
			var columnId = options.columnId;
			var layerId = options.layerId;

			var $columnHeader = $('div[id="' + layerId + '"] th[colid="' + columnId + '"]').removeClass('listview-col-sort-asc');

			if($columnHeader.length > 0) {
				MAListView.SortFromDOM($columnHeader.get(0));
			}
		}
	},

	// Uses various methods to add, select, and show the correct tab
	ConstructTabNoShow: function(layerId) {
		MAListView.AddTab(layerId);
		
		var pageSizeDefault = userSettings.PageSizeDefault || 10;
		var currentPageSize = $('div#'+layerId).find('select.lv-records-per-page').val() || pageSizeDefault;

		//default to the userSettings value for the first draw
		if(pageSizeDefault > 0) {
			$('div#' + layerId).find('select.lv-records-per-page').val( currentPageSize );
			//$('div#' + layerId).find('select.lv-records-per-page')[0].onchange();
			MAListView.ChangePageSize( layerId, parseInt( currentPageSize ) );
		} else {
		    MAListView.DrawTab({ layerId: layerId, isSelectedTab: false, isExport: false });
		}

		$('#listview-accesstab').show().addClass('show-lv-accesstab');
	},

	// Uses ConstructTab to construct tabs from all currently plotted queries
	ConstructAllTabs: function(fromSettings) {
		if ($(MAListView.queryClass).length > 0) {
			var arr = $(MAListView.queryClass);
			var hasSelectedTab = $('div#SelectedTab').length > 0;

			for(var i=0; i<arr.length; i++) { 
				var qid = arr[i].getAttribute('qid'); 
				MAListView.ConstructTabNoShow(qid);
			}
			
			if(hasSelectedTab) {
			    MAListView.ConstructTabNoShow('SelectedTab');
			}
		
    		if (MAListView.isVisible()) {
    			MAListView.Show();
    			MAListView.SelectFirstTab();
    		}
		}
		if(fromSettings)
		{}
		else {
			MAListView.Show();
		}
		
	},

	// Removes all tabs
	RemoveAllTabs: function() {
		MAListView.Hide();

		MAListView.ClearAllSelected();

		var arr = $(MAListView.queryClass);
		for(var i=0; i<arr.length; i++) { 
			var qid = arr[i].getAttribute('qid');
			MAListView.RemoveTab(qid);
		}
	},

	// Checks to see if the tab exists
	TabExists: function(layerId) {
		//is the tab undefined or not?
		return $('div[id="' + layerId + '"]').length > 0;
	},
	
	//Fixes the listview tab issues
	FixListViewTab: function() {
	    if( $(MAListView.queryClass).length > 0 ) {
    		$('#listview-accesstab').addClass('show-lv-accesstab').show();
		} else {
    		$('#listview-accesstab').removeClass('show-lv-accesstab').hide();
		}
	},

	//========== EXPORTING ==========
	// Exports the data to a CSV file
	ExportTab: function (layerId, filename)
	{
		if (filename === undefined)
		{
			filename = 'Maps Export';
		}
	
		var isSelectedTab = layerId == 'SelectedTab';
		var recordCount = 0;
	
		//ALERT THE USER!
		var loadingDone = true;
		if (isSelectedTab)
		{
			Object.keys(MAListView.records).forEach(function(recordId) {
				if (MAListView.records[recordId].listViewVisible) {
					recordCount++;
				}
			});
		}
		else
		{
			loadingDone = false;
			try
			{
				var layerData = $(MAListView.queryClass + '[qid="' + layerId + '"]').data() || {listViewSettings:{}};
				var records = layerData.records || {};
				var keys = Object.keys(records);
				var recLengh = keys.length;
				var recCount = 0;
				var markerProcessingBatchSize = 100;
				setTimeout(function doBatch()
				{
					if (recCount < recLengh)
					{
						var recordsProcessed = 0;
						while (recordsProcessed < markerProcessingBatchSize && recCount < recLengh)
						{
							var recId = keys[recCount];
							var record = records[recId];
							if (record)
							{
								var isVisible = record.listViewVisible === true ? true : false;
								if (isVisible)
								{
									recordCount++;
								}
							}
							recordsProcessed++;
							recCount++;
						}
	
						setTimeout(doBatch, 1);
					}
					else
					{
						loadingDone = true;
					}
				}, 1);
			}
			catch (e) { loadingDone = true; }
		}
	
		var loadingInt = setInterval(function ()
		{
			if (loadingDone)
			{
				clearInterval(loadingInt);
				
				var exportSize = recordCount;

				if (userSettings.maxExportSize < exportSize) {
					exportSize = userSettings.maxExportSize;
				}
                var popupNotify = MASystem.Labels.ListView_Export_Popup_Warning;
                var confirmPop = MA.Popup.showMAConfirm({
					title: window.MASystem.Labels.MA_Export,
                    template: '<div style="text-align:center;" div><div>' + window.formatLabel(MASystem.Labels.ListView_Export_Verify, [exportSize]) + '</div><br><div>'+ MASystem.Labels.ListView_Export_Slow_Down+'</div><div style="color: #c23934;">' + popupNotify + '</div></div>'
                });

                confirmPop.then(function(res) {
                    if (res) {
                        //shoves the data in a hidden table
                        MAListView.DrawTab({ layerId: layerId, isSelectedTab: isSelectedTab, isExport: true }).then(function(res)
                        {

                            //converts th tags to td tags
                            $('#HiddenExportTable').find('th').wrapInner('<td />').contents().unwrap();

                            //grabs the data in the hidden table
                            var $rows = $('#HiddenExportTable').find('tr:has(td)');
                            var tmpColDelim = String.fromCharCode(11);
                            var tmpRowDelim = String.fromCharCode(0);

                            var colDelim = '","';
                            var rowDelim = '"\r\n"';

                            var csv = '"' + $rows.map(function (i, row)
                            {
                                var $row = $(row);
                                var $cols = $row.find('td');

                                return $cols.map(function (j, col)
                                {
                                    var $col = $(col);
                                    var text = $col.text();

                                    return text.replace(/"/g, '""').trim();
                                }).get().join(tmpColDelim);
                            }).get().join(tmpRowDelim).split(tmpRowDelim).join(rowDelim).split(tmpColDelim).join(colDelim) + '"';

                            //special case for safari running lightning...
                            MAListView.newDownload(csv, filename);

                            var magicTimeout = MA.Util.isIE() ? 2000 : 100;

                            //empties the hidden table
                            $('#HiddenExportTable').html('');
                        });
                    }
                });
			}
		},500);
    },

    newDownload: function (content, fileName) {
        content = content || '';
        fileName = fileName || 'MapAnything_Export';
        fileName = fileName.replace('.csv', '');
        openNewWindow('POST', MA.resources.Export, {exportData: content, fileName: fileName}, '_blank')
    },

	downloadCSV : function (content, fileName, mimeType) {
        var SFTheme = getProperty(MASystem, 'MergeFields.SForceTheme', 'false') || 'Theme3'; // else classic
        if (SFTheme === 'Theme4d') {
            var a = document.createElement('a');
            mimeType = mimeType || 'application/octet-stream';
            var is_safari = /constructor/i.test(window.HTMLElement) || window.safari
            , is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent);
            if (is_safari) {} else {
                if (URL && 'download' in a) { //html5 A[download]
                    a.href = URL.createObjectURL(new Blob([content], {
                        type: mimeType
                    }));
                    a.setAttribute('download', fileName);
                    a.setAttribute('target', '_blank');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } 
                else {
                    location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
                }
            }
        } else {
            // classic view
            var charset = document.characterSet || document.charset || 'UTF-8';
            MAExportCSV(
                new Blob( [content], {type: 'text/csv'+charset} ),
                fileName || 'ExportData.csv',
                true
            );
        }
	},
	//========== SEARCHING ==========
	// Searches ALL visible column data
	SearchAll: function($element) {
		//var layerId = $element.closest('div[id]').getAttribute('id');
		//workaround for IE
		var layerId = $element.parentElement.parentElement.parentElement.id;
		var searchTerm = $('#' + layerId).find('.listview-search-text').val();
		
		//regex to remove special chars from searches of the list view
		//decimal optional requires commas
		var currencyRegex = /(?=.*\d)^\$?(([1-9]\d{0,2}(,\d{3})*)|0)?(\.\d{1,2})?$/
		if(currencyRegex.test(searchTerm)){
			searchTerm = searchTerm.replace(/[^\w\s.]/gi, '');
		}

		var settings = layerId !== 'SelectedTab' ? $(MAListView.queryClass + '[qid="' + layerId + '"]').data('listViewSettings') : MAListView.listViewSettings;

		//check to see if it exists
		var index = MAListView.FilterExists({ layerId: layerId, colId: '-1' });

		if(index > -1) {
			//the filter exists, modify it
			var filters 
			settings.filters[index].value = searchTerm;
		} else {
			//the filter doesn't exist, create it
			settings.filters.push({
				colId: '-1',
				operator: 'contains',
				value: searchTerm 
			});
		}
		
		//redraw tab
		MAListView.Search({ layerId: layerId });
	},

	// Complete search function
	Search: function(options) {
		//Show the loading mask
		$('#listViewLoader').removeClass('hidden');

		try {
			var count = 0;
			var isSelectedTab = options.layerId === 'SelectedTab';
						
			var layer;
			if(isSelectedTab){
				var listViewToLoop = MAListView;
			} else {
				var listViewToLoop = $(MAListView.queryClass + '[qid="' + options.layerId + '"]').data();
				layer = listViewToLoop;
			}

			listViewToLoop.listViewSettings.pageNumber = 1;
			listViewToLoop.listViewSettings.startIndex = 0;
			//iterating through list of geocoded names for markers
			listViewToLoop.recordList.forEach(function(pElement, index){
				//for each filter
				if(isSelectedTab){
					layer = $(MAListView.queryClass + '[qid="' + MAListView.recordIdList[index] + '"]').data();
				}

				//more detailed dict containing geocodes as keys and then the data
				var element = pElement.split('::')[0];
				var record = layer.records[element];

				if(record !== undefined){
					var filterCount = listViewToLoop.listViewSettings.filters.length;
					var allMatch = true;
					var jj = 0;
		
					//iterating through list of filters being applied to markers
					while((jj < filterCount) && allMatch){
						//this variable is the filter being applied
						var colId = listViewToLoop.listViewSettings.filters[jj].colId;
						var columnValue = '';
						var dataType = '';

						//is this a search or a search all column
						if(colId > -1){
							columnValue = MAListView.GetColumnValue(layer, element, colId, isSelectedTab, true); //record[column];

							// modify column value if this is is a tooltip datetime field
							if(MAListView.tooltipColumns.indexOf(colId) >= 0) { // if this is a tooltip column
								var toolTipIndex = MAListView.ListViewColumns[colId].sortColumn; // MAListView.tooltipColumns.indexOf(colId);
								var tooltips = layer.tooltips || [];
								var tooltip = tooltips[toolTipIndex] || {};
								dataType = tooltip.DisplayType;

								// if this is a date/time field, set value to the utc milliseconds value for filter comparision later
								if(/date|time/i.test(dataType)) {
									var fieldValue = MAListView.ProcessToolTipColumn({
										toolTipIndex : toolTipIndex,
										record : record,
										layerData : layer,
										isSelectedTab: isSelectedTab
									}) || {};
									columnValue += ' ' + fieldValue.colContents || columnValue;
									columnValue = columnValue.substr(columnValue.indexOf(' ') + 1);
								}
							}
						} else {
							for (var kk = 0; kk < MAListView.columnCount; kk++) {
								if(userSettings.ListViewColumns.hasOwnProperty(kk)) {
									var colProps = MAListView.ListViewColumns[userSettings.ListViewColumns[kk].id];
									if(!colProps.deprecated && colProps.visible === 'true' && colProps.sortColumn !== null) {
										//if this data is displayed, add it to the string version of the data
										if(isSelectedTab){
											columnValue += MAListView.GetColumnValue(layer, element, colProps.id, isSelectedTab, true); //record[colProps.sortColumn];
										} else {
											columnValue += MAListView.GetColumnValue(layer, element, colProps.id, isSelectedTab, true) + ' '; //record[colProps.sortColumn];
										}
										
										// modify column value if this is is a tooltip datetime field
										//layer.listViewSettings.filters[jj].colId;
										if(MAListView.tooltipColumns.indexOf(userSettings.ListViewColumns[kk].id) >= 0) { // if this is a tooltip column
											var toolTipIndex = MAListView.ListViewColumns[userSettings.ListViewColumns[kk].id].sortColumn; // MAListView.tooltipColumns.indexOf(colId);
											var tooltips = layer.tooltips || [];
											var tooltip = tooltips[toolTipIndex] || {};
											dataType = tooltip.DisplayType;

											// if this is a date/time field, set value to the utc milliseconds value for filter comparision later
											if(/date|time/i.test(dataType)) {
												var fieldValue = MAListView.ProcessToolTipColumn({
													toolTipIndex : toolTipIndex,
													record : record,
													layerData : layer,
													isSelectedTab: isSelectedTab
												}) || {};

												if(isSelectedTab){
													columnValue += fieldValue.colContents || columnValue;
												} else {
													columnValue += fieldValue.colContents || ' ';
												}
											}
										}
									}
								}
							}
						}
						allMatch = MAListView.IsMatch({
							searchTerm: listViewToLoop.listViewSettings.filters[jj].value,
							operator: listViewToLoop.listViewSettings.filters[jj].operator,
							value: columnValue,
							dataType: dataType
						});

						jj++;
					}


					//set the visibility
					if(isSelectedTab){
						MAListView.BuildCalculatedValues( element, { isVisible: allMatch } );
					} else {
						record.listViewVisible = allMatch;
					}
					count = allMatch ? count+1 : count;
				}
			});

			if(isSelectedTab){
				MAListView.listViewSettings.filterCount = count;
			} else {
				listViewToLoop.listViewSettings.filterCount = count;
			}
			
			$('#listViewLoader').addClass('hidden');
			MAListView.DrawTab({
				layerId: options.layerId,
				isSelectedTab: isSelectedTab,
				isExport: false
			});
			
			//enable the select all button
			if(options.layerId !== 'SelectedTab' && count > 0) {
				$('div#' + options.layerId + ' a:contains("Select All")').show();
			}
		} catch (e) {
			//WE BROKE IT!
			$('#listViewLoader').addClass('hidden');
			MAListView.log(e);
		}
	},

    // Is this a string, a number, or a boolean?
	IsMatch: function(options) {
		/*
			options = {
				searchTerm,
				operator,
				value
			}
		*/
		
		/***************************************
		 * why was this always returning false?
		 * remove this line
		****************************************/
		//return false;
		var value = options.value;
		var searchTerm = options.searchTerm;
		var dataType = options.dataType;
		var operator = options.operator;

		if((value === undefined || searchTerm === undefined || value === null || searchTerm === null) && (operator == 'notEqualTo' || operator == 'doesNotContain')) {
			return true;
		} else if(/date|time/i.test(dataType) && operator != 'contains') {
			var dateTimeFormat = MASystem.User.dateFormat.toUpperCase() + ' ' + MASystem.User.timeFormat;
			var searchTermMom = moment(options.searchTerm, dateTimeFormat);
			var valueMom = moment(options.value, dateTimeFormat);

			if(searchTermMom.isValid() && valueMom.isValid()) {
				if(operator === 'equals' || operator === 'notEqualTo'){
					searchTermMom = moment(searchTermMom.valueOf()).format('YYYY MM DD');
					searchTermMom =  moment(searchTermMom, 'YYYY MM DD').valueOf();
					valueMom = moment(valueMom.valueOf()).format('YYYY MM DD');
					valueMom = moment(valueMom, 'YYYY MM DD').valueOf();
				} else {
					searchTermMom = searchTermMom.valueOf();
					valueMom = valueMom.valueOf();
				}
				
				return MAListView.IsMatch($.extend(options, {
					searchTerm: searchTermMom,
					value: valueMom,
					dataType: 'number', // nothing is checking for this now but should still work
				}));
			}
		} else {
			switch(typeof options.value) {
				case 'string':
					return MAListView.MatchString(options);
				case 'number':
					return MAListView.MatchNumber(options);
				case 'boolean':
					return MAListView.MatchBoolean(options);
				default:
					return false;
			}
		}
	},

    // Matches strings
	MatchString: function(options) {
		var value = options.value.toLowerCase();
		var search = options.searchTerm.toLowerCase();
		value = htmlDecode(value);
		search = htmlDecode(search);
		
		if(options.operator === 'equals' && value === search) {	return true; }
		else if(options.operator === 'notEqualTo' && value !== search) { return true; }
		else if(options.operator === 'startsWith' && value.indexOf(search) === 0) { return true; }
		else if(options.operator === 'contains' && value.indexOf(search) > -1) { return true; }
		else if(options.operator === 'doesNotContain' && value.indexOf(search) === -1) { return true; }
		else { return false; }
	},

    // Matches numbers
	MatchNumber: function(options) {
		var value = parseFloat(options.value || 0);
		var search = parseFloat(options.searchTerm || 0);
		
		if(options.operator === 'equals' && value === search) {	return true; }
		else if(options.operator === 'notEqualTo' && value !== search) { return true; }
		else if(options.operator === 'lessThan' && value < search) { return true; }
		else if(options.operator === 'lessThanEqualTo' && value <= search) { return true; }
		else if(options.operator === 'greaterThan' && value > search) { return true; }
		else if(options.operator === 'greaterThanEqualTo' && value >= search) { return true; }
		else { return false; }
	},

    // Matches booleans
	MatchBoolean: function(options) {
		//is the search term a string?
		var search = true;
		if(typeof options.searchTerm === 'string') {
			search = options.searchTerm === 'true';
		} else {
			search = options.searchTerm;
		}


		return options.value === search;
	},

    // Checks to see if the filter exists already
	FilterExists: function(options) {
	  /*
			options = {
				layerId: 'string',
				colId: integer
			}
		*/
		var filters = [];

		if(options.layerId !== 'SelectedTab') {
			filters = $(MAListView.queryClass + '[qid="' + options.layerId + '"]').data().listViewSettings.filters;
		} else {
			filters = MAListView.listViewSettings.filters;
		}

		for(var ii=filters.length-1; ii>=0; ii--) {
			if(filters[ii].colId == options.colId) {
				return ii;
			}
		}

		return -1;
	},
	
    // Gets the data for the specified filter
	GetFilterData: function(options) {
	  /*
			options = {
				layerId: 'string',
				colId: integer
			}
		*/
		var filters = [];
		
		var filterData = {
		  colId: null,
		  displayValue: '',
		  operator: '',
		  value: ''
		};
		
		var filterIndex = MAListView.FilterExists(options);

		if(options.layerId !== 'SelectedTab') {
			filters = $(MAListView.queryClass + '[qid="' + options.layerId + '"]').data().listViewSettings.filters;
		} else {
			filters = MAListView.listViewSettings.filters;
		}

		if(filterIndex !== -1) {
		  filterData = filters[filterIndex];
		}

		return filterData;
	},

	// Clears all filters
	ClearSearch: function(options) {
		/*
			options = {
				layerId = 'string'
			}
		*/
		options = $.extend({
			layerId : ''
		}, options || {});

		var everythingBroke = false;

		if(options.layerId === 'SelectedTab') {
			//reset our filter data
			MAListView.listViewSettings.filterCount = 0;
			MAListView.listViewSettings.filters = [];

			//change visibility in recordsList to true for all
			for ( var val in MAListView.calculatedValues ) {
				MAListView.calculatedValues[val].isVisible = true;
			};

		} else {
			var $layerData = $(MAListView.queryClass + '[qid="' + options.layerId + '"]').data() || {};

			//Does the layer even have listViewSettings property?
            if($layerData.hasOwnProperty('listViewSettings')) {
    			//reset our filter data
    			$layerData.listViewSettings.filterCount = 0;
    			$layerData.listViewSettings.filters = [];
                var records = $layerData.records || {};
                var recordList = $layerData.recordList || [];
    			//change visibility in recordsList to true for all
    			for (var ii = recordList.length - 1; ii >= 0; ii--) {
    			    var record = records[recordList[ii]];
    				if( record !== undefined ) {
    					record.listViewVisible = true;
    				}
    			};
            } else {
            	everythingBroke = true;
            }
		}

		if(!everythingBroke) {

			//empty the text box
			$('div[id="' + options.layerId + '"]').find('.listview-search-text').val('');

			//redraw tab
			var opt = {
				layerId			: options.layerId,
				isSelectedTab	: options.layerId == 'SelectedTab',
				isExport		: false,
				count			: 0
			};

			MAListView.UpdateAdvancedSearchLink(opt); 
			MAListView.DrawTab(opt);

			//disable the search all button
			$('div#' + options.layerId + ' a:contains("Select All")').hide();
		}
	},

	// Clears all filters
	ClearSearchFromDOM: function($element) {
		//used when passing in by element
		MAListView.ClearSearch({ layerId: $element.closest('div[id]').getAttribute('id') });
	},

    // Updates the advanced search link with the number of active filters
	UpdateAdvancedSearchLink: function(options) {
		var countString = options.count > 0 ? ' (' + options.count + ')' : '...';
		$('div[id="' + options.layerId + '"]').find('.lv-search-advanced').html(MASystem.Labels.MA_Advanced_Search + countString);
	},

    // Updates the page number and records in the pagination area
	UpdatePageShowing: function(options) {
		var countHTML = '';
		var layerData = null;
		var recordList = null;
		
		if(options.layerId === 'SelectedTab') {
		    layerData = MAListView;
		    recordList = layerData.recordList;
		} else {
		    layerData = $(MAListView.queryClass + '[qid="' + options.layerId + '"]').data() || {listViewSettings:{}};
		    //var layerType = layerData.hasOwnProperty('layerType') ? layerData.layerType : null;
		    //recordList = layerType == 'Live' ? Object.keys(layerData.records) : layerData.recordList;
		    recordList = layerData == undefined ? [] : (layerData.recordList == undefined ? [] : layerData.recordList);
		}
		
		//var preTotal = layerData.listViewSettings.hasOwnProperty('recordsDisplayed') ? layerData.listViewSettings.recordsDisplayed : recordList.length;
		var filterData = getProperty(layerData || {} ,'listViewSettings.filters',false) || [];
		var isFiltered = filterData.length > 0
		var filterCount = getProperty(layerData || {} ,'listViewSettings.filterCount',false) || 0;
		
		var total = 0;
		var loadingDone = true;
		if(/live/i.test(layerData.layerType))
		{
			total = (recordList || []).length - Object.keys(layerData.liveCriteriaUnmet).length;
		}
		else
		{
			//total = isFiltered ? filterCount : recordList.length;
			//always loop over records again... total counts are consistently wrong/ quick fix
			loadingDone = false;
			try {
				var records = layerData.records || {};
				var keys = Object.keys(records);
				var recLengh = keys.length;
				var recCount = 0;
				var markerProcessingBatchSize = 100;
				setTimeout(function doBatch() {
					if (recCount < recLengh) {
						var recordsProcessed = 0;
						while (recordsProcessed < markerProcessingBatchSize && recCount < recLengh) {
							var recId = keys[recCount];
							var record = records[recId];
							if(record) {
								var isVisible;
								if(record.listViewVisible) {
									isVisible = record.isVisible || record.isScattered || record.isClustered;
								} else {
									isVisible = record.listViewVisible;
								}
								if(isVisible) {
									total++;
								}
							}
							recordsProcessed++;
							recCount++;
						}
						
						setTimeout(doBatch, 1);
					}
					else {
						loadingDone = true;
					}
				},1);
			}
			catch(e) {loadingDone = true;}
		}
		
		var countInterval = setInterval(function () {
			if(loadingDone) {
				clearInterval(countInterval);
				var pageNumber = getProperty(layerData || {} ,'listViewSettings.pageNumber',false) || 1;
	
				var start   = total == 0 ? 0 : ((pageNumber - 1) * parseInt(layerData.listViewSettings.pageSize)) + 1;
				var end     = ((pageNumber - 1) * parseInt(layerData.listViewSettings.pageSize)) + parseInt(layerData.listViewSettings.pageSize);
				
				var actualEnd = total < end ? total : end;
				var unfiltered = isFiltered ? '(' + recordList.length + ' ' + MASystem.Labels.Layers_On_The_Map_Created + ')' : '';
		
				
				// DYNAMIC LABEL NEEDED HERE:
				countHTML = window.formatLabel(MASystem.Labels.MA_Listview_Showing, [start, actualEnd, total]) + unfiltered;
		
				if (options.layerId != undefined && options.layerId != '')
				{
					$('div#' + options.layerId).find('.listview-record-count').html(countHTML);
				}
			}
		},100);
		
		
		// $('div#' + options.layerId).find('select.lv-records-per-page').val( layerData.listViewSettings.pageSize );
	},

	buildListViewMassActions: function() {
		var listHTML = '<option value="none">'+MASystem.Labels.MA_Select_an_Option+'</option>';
        if(userSettings.ButtonSetSettings.massActionLayout && userSettings.ButtonSetSettings.massActionLayout.length > 0)
        {
            //loop over sections
            $.each(userSettings.ButtonSetSettings.massActionLayout, function (sectionIndex, section)
            {
                //don't show header

                //loop over buttons and add an item for each
                $.each(section.Buttons, function (buttonIndex, button) {
                    /*if(button.Label == 'Log a Call') {
                        return true;
                    }*/
                    //find the definition of this button in the action framework
                    var buttonDefinition = {};
                    var buttonInfo;
                    if (button.Type == 'Custom Action' && MAActionFramework.customActions[button.Label]) {
                        buttonInfo = MAActionFramework.customActions[button.Label];
                        $.extend(buttonDefinition, MAActionFramework.customActions[button.Label]);
                    }
                    else if (MAActionFramework.standardActions[button.Action || button.Label]) {
                        buttonInfo = MAActionFramework.standardActions[button.Action || button.Label];
                        $.extend(buttonDefinition, MAActionFramework.standardActions[button.Action || button.Label]);
                    }
                    else {
                        return;
					}
					var buttonLabel = htmlEncode(htmlDecode(buttonDefinition.Label));
                    listHTML += '<option data-action="'+button.Label+'" data-type="'+buttonInfo.Type+'" data-label="'+buttonLabel+'">'+buttonLabel+'</option>';
                    //listHTML += '<div class="ma-action-sheet-item massbutton" data-type="'+buttonInfo.Type+'" data-label="'+button.Label+'" onclick="MAListView.mobile.massListViewActionClick(this);">'+buttonInfo.Label+'</div>';
                });
            });
		}
		return listHTML;
	},

	//========== SORTING ==========
	// Sorts the data based on the specified column
	SortFromDOM: function($element) {
		var colId = $element.getAttribute('colid');
		var layerId = '';
		
		//What kind of browser are we using?
		try {
		    //Looks like this is a real browser.
            layerId = $element.closest('div[role="tabpanel"]').getAttribute('id');
		}
		catch(ex) {
		    //NAH DIS IE!
		    layerId = $($element).closest('div[role="tabpanel"]').attr('id');
		}
		
		if(layerId !== '') {
            MAListView.Sort(colId, layerId);
		}
	},

	// Sorts the data based on the specified column
	Sort: function(colId, layerId) {
		var col = MAListView.ListViewColumns[colId];
		
		var tabIsSelectedTab = layerId === 'SelectedTab';
        
		var $layer =    tabIsSelectedTab ? null : $(MAListView.queryClass + '[qid="' + layerId + '"]');
		var tooltips =  tabIsSelectedTab ? null : $layer.data('tooltips');
		
		var recList =   tabIsSelectedTab ? MAListView.recordList  : $layer.data('recordList') || [];
		var recs =      tabIsSelectedTab ? MAListView.records      : $layer.data('records');
		
		var layerDataPointer = tabIsSelectedTab ? MAListView : $layer.data();
		
		//show a loading mask
		$('#listViewLoader').removeClass('hidden');
		
		sortArray = [];
		var len = recList.length;
		var recCount = 0;
		var markerProcessingBatchSize = MA.Util.isIE() ? 200 : 1000;
		var markerProcessingTimeout = 1;
		setTimeout(function doBatch() {
            if(recCount < len) {
                var recordsProcessed = 0;
                while (recordsProcessed < markerProcessingBatchSize && recCount < len) {
                    recordsProcessed++;
                    
                    var sortBy = null;
                    var currentLayerId = tabIsSelectedTab ? MAListView.recordIdList[recCount] : layerId;
                    $layer = $('#PlottedQueriesContainer .PlottedRowUnit[qid="' + currentLayerId + '"]');
                    tooltips =  $layer.data('tooltips');
        			
        			var currentRec = $layer.data().records[recList[recCount].split('::')[0]];
		    
        		    if(currentRec !== undefined) {
            		    var device = currentRec.device;
            		    
            		    switch(colId) {
            		        case "21":
            		            //Combined address
            		            var fieldToGet = MAListView.ListViewColumns[21].sortColumn;
            		            
            		            if( $layer.data() && /live/i.test($layer.data().layerType) )
            		            {
            		                if(device instanceof MADevice)
            		                {
                                    	sortBy = device.getFormattedAddress();
            		                }
            		            }
            		            else 
            		            {            				        
            		                if( fieldToGet.indexOf('.') > -1 ) {
            					        var fields = fieldToGet.split('.');
            					        sortBy = typeof currentRec[fields[0]][fields[1]] === 'string' ? currentRec[fields[0]][fields[1]].toLowerCase() : currentRec[fields[0]][fields[1]];
            				        }
            				        else {
            				            sortBy = typeof currentRec[fieldToGet] === 'string' ? currentRec[fieldToGet].toLowerCase() : currentRec[fieldToGet];
            				        }
            		            }
            		            
            		            break;
            		            
            		        case "22":
            		            //Combined lat/lng
            		            sortBy = (currentRec.MALatitude__c+', '+currentRec.MALongitude__c).toLowerCase();
            		            break;
            		            
            		        case "4":
            		        case "5":
            		        case "23":
            		            //These are the calculated values
            		            sortBy = MAListView.calculatedValues.hasOwnProperty(currentRec.Id) ? MAListView.calculatedValues[currentRec.Id][MAListView.ListViewColumns[colId].sortColumn] || 0 : '';
            		            break;
            		            
                            case "6":
            		        case "7":
            		        case "8":
            		        case "9":
            		        case "10":
            		            //These are the address values
            		            var addrFieldCol = MAListView.ListViewColumns[colId].sortColumn;
            		            var layerData = $layer.data() || {};
            				    var fieldToGet = (layerData.addressFields || {})[addrFieldCol];
            				    
            				    if(/live/i.test(layerData.layerType))
								{
									if(device instanceof MADevice)
									{
										var addressObject = device.getAddressObject();
										
										if(addressObject && typeof addressObject == 'object')
										{
											var addressComponent = addressObject[addrFieldCol];
											sortBy =  typeof addressComponent == 'string' ? addressComponent.trim().toLowerCase() : '';
										}
									}
								}
								else
								{
	            				    if( fieldToGet.indexOf('.') > -1 ) {
	            					    var fields = fieldToGet.split('.');
	            					    sortBy = typeof currentRec[fields[0]][fields[1]] === 'string' ? currentRec[fields[0]][fields[1]].toLowerCase() : currentRec[fields[0]][fields[1]];
	            				    }
	            				    
	            				    else {
	            				        sortBy = typeof currentRec[fieldToGet] === 'string' ? currentRec[fieldToGet].toLowerCase() : currentRec[fieldToGet];
	            				    }
								}
            		            break;
            		            
            		            
            		            
            		        case "11":
            		        case "12":
            		            //These are the lat/lng values
            		            var addrFieldCol = MAListView.ListViewColumns[colId].sortColumn;
            				    var fieldToGet = $layer.data().addressFields[addrFieldCol];
            				    
            				    var currentProp = currentRec[fieldToGet];
            				    
            				    if(currentProp !== '' && currentProp !== undefined) {
            				        sortBy = currentProp;
            				    } else {
            				        sortBy = colId === '11' ? currentRec.location.coordinates.lng : currentRec.location.coordinates.lat;
            				    }
            				    
            		            break;
            		            
            		        case "13":
            		        case "14":
            		        case "15":
            		        case "16":
            		        case "17":
            		        case "18":
            		        case "19":
            		        case "20":
            		    	case "30":
            		    	case "31":
            		    	case "32":
            		    	case "33":
            		    	case "34":
            		    	case "35":
            		    	case "36":
            		            //These are the tooltip values
								var tooltipObj = tooltips[col.sortColumn];
								//passing true to keep from getting html links to sort, MAP-3919
							    var currentProp = formatTooltip(currentRec, tooltipObj,true);

							    if( tooltipObj.soapType.toLowerCase() === "date" ) {
							        //convert the dates to a moment
							        var theMoment = moment( currentProp, MASystem.User.dateFormat.toUpperCase() );
							        var theDate = new Date( theMoment.format('M/D/YYYY') );
							        sortBy = theDate.getTime() ||  '';
							    }
							    else if( tooltipObj.soapType.toLowerCase() === "datetime" ) {
							        // convert the dates to a moment
							        var theMoment = moment( currentProp, MASystem.User.dateFormat.toUpperCase() + ' ' + MASystem.User.timeFormat );

							        if(typeof currentProp == 'string' && currentProp.trim()) { // ignore empty strings
							        	if(theMoment.isValid()) {
							        		sortBy = theMoment.valueOf();
								        } else {
								        	// if we've hit this point, there's some kind of error getting a valid moment from the date time string
								        	sortBy = currentProp; // default to the date string itself fot the comparision value as backup
								        	console.warn(MASystem.Labels.ListView_Cant_Determine_Date_Value, currentProp, MASystem.User.dateFormat.toUpperCase(), MASystem.User.timeFormat);
								        }
							        }
							    } 

							    
							    else if( tooltipObj.soapType.toLowerCase() === "double" || tooltipObj.soapType.toLowerCase() === "integer" ) {
							        sortBy = getProperty(currentRec, tooltipObj.FieldName);
							    }
							    else if( /phone/i.test(tooltipObj.DisplayType) ) { // PHONE fields
							        if(typeof currentProp === 'string' && currentProp.trim()) {
							    		var nonDigit = /\D/g;
							    		sortBy = currentProp.trim().replace(nonDigit, ''); // remove all non-digits from phone number to compare the phone numbers only
							    	} else {
							    		sortBy = currentProp;
							    	}
							    }
							    else if( /boolean/i.test(tooltipObj.DisplayType) || /boolean/i.test(tooltipObj.soapType) ) { // BOOLEAN fields
							        if(typeof currentProp === 'string' && currentProp.trim()) {
							    		if(/true/i.test(currentProp)) {
							    			sortBy = 1;
							    		} else if(/false/i.test(currentProp)) {
							    			sortBy = -1;
							    		}
							    	}
							    }
							    else if( tooltipObj.needsLink ) {
							    	var prop = getProperty(currentRec, tooltipObj.FieldName);
							        sortBy = typeof prop === 'string' ? prop.toLowerCase() : prop;
							    }
							    
							    else {
							        sortBy = typeof currentProp === 'string' ? currentProp.toLowerCase() : currentProp;
							    }
							    
            		            break;
            		            
            		        case "25": // Report Date (Live)
        		        	case "26": // Report Time (Live)
        		        		if($layer.data() && /live/i.test($layer.data().layerType))
            		            {
            		            	if(device instanceof MADevice)
            		            	{
            		            		var deviceTimestamp = device.getTimestamp();
										sortBy = isNum(deviceTimestamp) ? deviceTimestamp : null;
            		            	}
            		            }
        		        		break;
        		        		
        		        	case "27": // Last Event (Live)
        		        		if($layer.data() && /live/ig.test($layer.data().layerType))
            		            {
            		            	if(device instanceof MADevice)
            		            	{	
            		            		var event = device.getEvent();
            		            		
                                    	if(event) {
                                    		sortBy = event.name || event.code;
                                    	}
            		            	}
            		            }
        		        		break;
        		        		
        		        	case "28": // Last Speed (Live)
        		        		if($layer.data() && /live/i.test($layer.data().layerType))
            		            {
            		            	if(device instanceof MADevice)
            		            	{
            		            		var deviceSpeed = device.getFormattedSpeed(); // speed converted to current user setting and 2 decimal places
                						
                                    	sortBy = isNum(deviceSpeed) ? deviceSpeed+'' : null;
            		            	}
            		            }
        		        		break;
        		        		
        		        	case "29": // Layer Type
                            	sortBy = $layer.data().layerType;
        		        		break;

                            default:
                                sortBy = '';
                                break;
            		        
            		    }
            
            			sortArray.push({ sortBy: sortBy, id: recCount });
            			recCount++;
        		    }
        		    else {
        		        recCount++;
        		    }
                }
                
                setTimeout(doBatch, markerProcessingTimeout);
            }
            
            else {
                if(sortArray.length > 0) {
        			var newRecordList = [];
        			var newRecordIdList = [];
        			var tempList = null;
        
        			var column = $('div[id="' + layerId + '"] th[colid="' + col.id + '"]');
        
        			if (column.hasClass('listview-col-sort-asc')) {
        				//change to desc
        				layerDataPointer.listViewSettings.currentSort = { columnToSort: col.id, sort: 'listview-col-sort-desc' };
        				column.removeClass('listview-col-sort-asc').addClass('listview-col-sort-desc');
        				tempList = MAListView.MergeSortDesc(sortArray);
        			}
        			
        			else {
        				//change to asc
        				layerDataPointer.listViewSettings.currentSort = { columnToSort: col.id, sort: 'listview-col-sort-asc' };
        				column.removeClass('listview-col-sort-desc').addClass('listview-col-sort-asc');
        				tempList = MAListView.MergeSortAsc(sortArray);
        			}
        
        			var tempLen = tempList.length;
        
        			for(var i=0; i<tempLen; i++) {
        				newRecordList.push(recList[tempList[i].id]);
        				if(tabIsSelectedTab) {
        				    newRecordIdList.push(MAListView.recordIdList[tempList[i].id]);
        				}
        			}
        			
        			
                    if(tabIsSelectedTab) {
        			    layerDataPointer.recordList = newRecordList;
        			    layerDataPointer.recordIdList = newRecordIdList;
                    }
                    
                    else {
        			    layerDataPointer.recordList = newRecordList;
                    }
                    
        		}
        		
        		else {
        			// MAListView.log('Nothing to sort!');
    		    }
    		
    		
    
        		var drawOpt = {
        			layerId         : layerId,
        			isSelectedTab   : layerId == 'SelectedTab',
        			isExport        : false 
        		};
                $('#listViewLoader').addClass('hidden');
        		MAListView.DrawTab(drawOpt);
            }
		},markerProcessingTimeout);
		
	},
	
	// Calls the sort function on the first sortable column
	SortFirstColumn: function(layerId) {
	    var sortableColumns = ['6','7','8','9','10','11','12','21','22'];
	    var availableColumns = $('div#' + layerId).find('table.listview-data-table').find('th');
	    var firstColId = null;
	    
	    for(var ii=0; ii<availableColumns.length; ii++) {
	        var colId = availableColumns[ii].getAttribute('colid');
	        
	        if(availableColumns[ii].style.display != 'none' && jQuery.inArray(colId, sortableColumns) > -1) {
	            firstColId = colId;
	            ii = availableColumns.length;
	        }
	    }
	    
	    if(firstColId != null) {
	        MAListView.Sort(firstColId, layerId);
	    }
	},

	// Does a merge sort in ascending fashion
	MergeSortAsc: function(array) {
		var len = array.length;

		if(len < 2) 
		{ 
			return array;
		}
		else
		{
			var pivot = Math.ceil(len/2);
			return MAListView.MergeAsc(MAListView.MergeSortAsc(array.slice(0,pivot)), MAListView.MergeSortAsc(array.slice(pivot)));
		}
	},

	// Does a merge sort in descending fashion
	MergeSortDesc: function(array) {
		var len = array.length;

		if(len < 2) 
		{ 
			return array;
		}
		else
		{
			var pivot = Math.ceil(len/2);
			return MAListView.MergeDesc(MAListView.MergeSortDesc(array.slice(0,pivot)), MAListView.MergeSortDesc(array.slice(pivot)));
		}
	},

	// Merges two objects in ascending fashion
	MergeAsc: function(left, right) {
		var result = [];

		while((left.length > 0) && (right.length > 0))
		{
			if (right[0].sortBy === '' || right[0].sortBy === null || right[0].sortBy === undefined) {
				result.push(right.shift());
			} else if (left[0].sortBy === '' || left[0].sortBy === null || left[0].sortBy === undefined) {
				result.push(left.shift());
			} else if (left[0].sortBy <= right[0].sortBy) {
				result.push(left.shift());
			} else {
				result.push(right.shift());
			}
		}

		result = result.concat(left, right);
		return result;
	},

	// Merges two objects in descending fashion
	MergeDesc: function(left, right) {
		var result = [];

		while((left.length > 0) && (right.length > 0))
		{
			if(left[0].sortBy >= right[0].sortBy && left[0].sortBy !== '' && left[0].sortBy !== null && left[0].sortBy !== undefined) {
				result.push(left.shift());
			}
			else if(right[0].sortBy === '' || right[0].sortBy === null || right[0].sortBy === undefined) {
				result.push(left.shift());
			}
			else {
				result.push(right.shift());
			}
		}

		result = result.concat(left, right);
		return result;
	},



	//========== HIDING AND SHOWING ==========
	// Shows the entire workspace with all of the tabs
	Show: function(options) {
		VueEventBus.$emit('show-list-view');
	},

	// Hides the entire workspace and all of the tabs inside of it
	Hide: function(options) {
		VueEventBus.$emit('close-list-view');
	},

	isVisible: function(cb) {
		// rework this
		var tab = window.VueStore.getters['tabs/activeTab']();
		return  /listview/i.test(tab);
	},
	
	// Displays the listview
	DisplayListView: function() {
		window.VueEventBus.$emit('show-list-view');
		
		//Stupid IE fix
		setTimeout(function() {
		    MAListView.ConstructAllTabs();
		}, 100);
	},

	// Hides the specified column in the specified query
	HideColumns: function(columns) {
		for (var i = 0; i < columns.length; i++) {
			$('th[colName=' + columns[i].toString() + ']').hide();
			$('td[colName=' + columns[i].toString() + ']').hide();
		}
	},

	// Shows the specified column in the specified query
	ShowColumns: function(columns) {
		for (var i = 0; i < columns.length; i++) {
			$('th[colName="' + columns[i].toString() + '"]').show();
			$('td[colName="' + columns[i].toString() + '"]').show();
		}
	},

    // Closes the listview
	Close: function() {
		// $('#mapcontainer').animate({ scrollTop: 0 }, 200);
		// $('#mapdiv').removeClass('listview-showing');
		// $('#mapcontainer').removeClass('listview-showing');
		// $('#listview').removeClass('listview-showing');
		// $('#listview-accesstab').addClass('show-lv-accesstab').show();
		VueEventBus.$emit('close-list-view');
	},	

    // Closes the listview when no tabs exist
	CloseListViewNoLayers: function() {
		$('#mapcontainer').animate({ scrollTop: 0 }, 200);
		$('#mapdiv').removeClass('listview-showing');
		$('#mapcontainer').removeClass('listview-showing');
		$('#listview').removeClass('listview-showing');
		$('#listview-accesstab').removeClass('show-lv-accesstab').hide();

		MAListView.isShown = false;
	},



	//========== FORMATTING AND PROCESSING ==========
    // Formats the address nicely
	FormatAddress: function(address) {
		if (!address || address == '')
		{
			address = '';
		}
		else if (address.indexOf(', ,') > -1)
		{
			address = address.replace(', ,','');
		}
		
		//remove line breaks
		address = address.replace(/\<br [\/]*\>/g, ', ').trim();
		
		//if it starts with a comma, remove it
		if (address.indexOf(',') == 0)
		{
			address = address.substring(1);
		}
		
		
		return address;
	},
	
    // Processes the tooltip columns
	ProcessToolTipColumn: function(options) {
	
		/*
			Input: {
					toolTipIndex : int,
					record : {},
					layerData : {},
					isSelectedTab: boolean
				}
			
			Output: {
				colContents: 'string',
				colVisible : true|false
			}
		*/
		
		var colContents = '';
		var colVisible = true;
		//'<a href="{!$Site.CurrentSiteUrl}/' + record.record.Id + '" target="_blank">' +  + '</a>'

		
		if (options.layerData.tooltips[options.toolTipIndex] && options.record)
		{
			// Adding support for polymorphic fields
		    if(!options.rawValue || options.layerData.tooltips[options.toolTipIndex].polymorphicField) {
				const tooltipMetadata = options.layerData.tooltips[options.toolTipIndex];
				const forcePlainText = options.toolTipIndex === 0 && tooltipMetadata?.DisplayType === 'PHONE';
    			var tooltipData = formatTooltip(options.record, tooltipMetadata, true, forcePlainText);

                if(options.toolTipIndex === 0 || options.layerData.tooltips[options.toolTipIndex].ActualFieldName === 'WorkOrderNumber') {
                	if( tooltipData.indexOf('&lt;a') > -1 ) {
                		colContents = tooltipData.replace('_top', '_blank').replace('_self', '_blank').replace('_parent', '_blank');
                	} else {
						var newWindow = getProperty(MASystem.Organization,'LightningNewWindow',false);
						var isSF1 = typeof(sforce) != 'undefined' && typeof(sforce.one) != 'undefined';
						var openNewTab;

						if (newWindow) {
							openNewTab = true;
						} else if (!isSF1) {
							openNewTab = true;
						} else {
							openNewTab = false;
						}



						if (openNewTab) {
							colContents = '<a href="/' + options.record.record.Id + '" target="_blank">' + htmlEncode(tooltipData) + '</a>';
						} else { 
							colContents = '<a href="/' + options.record.record.Id + '" target="_self">' + htmlEncode(tooltipData) + '</a>';
						}
                	}
				} else {
					colContents = tooltipData;
        			if (typeof tooltipData === 'string' && tooltipData.indexOf('&lt;a') === 0) {
        				colContents = tooltipData.replace('_top', '_blank').replace('_self', '_blank').replace('_parent', '_blank');
                    }
                }
		    } else {
				var columnValue = getProperty(options.record, options.layerData.tooltips[options.toolTipIndex].ActualFieldName);
				if (columnValue === null || columnValue === undefined) {
					colContents = '';
				} else {
					colContents = columnValue;
				}
		    }
            
			colVisible = true;
		}
		else
		{
			colVisible = false;
		}

		if (options.isSelectedTab && options.toolTipIndex < MAListView.listViewSettings.selectedTooltips)
		{
			colVisible = true;
		}
		
		return {
			colContents : colContents,
			colVisible : colVisible
		};
	},
	
	//Get the specific column value
	GetColumnValue: function(layer, recordId, colId, isSelectedTab, raw) {
	    //get the layerData
	    var layerData = layer;
	    var record = layerData.records[recordId];
	    
	    raw = raw === undefined ? false : raw;
	    
	    var colContents = '';
	    
	    //we got the layer, the record, and the column Id, so now we just need to do the math...
	    switch(colId) {
	    	//selected tab stuff
	    	
    		case '4':
    		    
    		case '5':
    			
    		case '23':
    			colContents = null;
    			var calculatedFieldCol = MAListView.ListViewColumns[colId].sortColumn;
    			if ( MAListView.calculatedValues && MAListView.calculatedValues.hasOwnProperty(recordId) )
    			{
    			    colContents = MAListView.calculatedValues[recordId].hasOwnProperty(calculatedFieldCol) 
    			    	? MAListView.calculatedValues[recordId][calculatedFieldCol] 
    			    	: null;
    			}
    			break;

    	    //ADDRESS PIECES
    		case '6':
    		    
    		case '7':
    			
    		case '8':
    			
    		case '9':
    			
    		case '10': 
    			colContents = '';
    			var addrFieldCol = MAListView.ListViewColumns[colId].sortColumn;
    			if (layerData.addressFields && layerData.addressFields[addrFieldCol] && record)
    			{
    			    var fieldToGet = layerData.addressFields[addrFieldCol];
    			    if( fieldToGet.indexOf('.') > -1 ) {
    				    var fields = fieldToGet.split('.');
    				    colContents = record[fields[0]][fields[1]] || '';
    			    } else {
    			        colContents = record[fieldToGet] || '';
    			    }
    			}
    			break; 
    		
    		case '11':
    		
    		case '12':
    			colContents = '';
    			fieldBackup = colId == '11' ? 'MALongitude__c' : 'MALatitude__c';
    			
    			var addrFieldCol = MAListView.ListViewColumns[colId].sortColumn;
    			if (layerData.addressFields && layerData.addressFields[addrFieldCol] && record)
    			{
    			    var fieldToGet = layerData.addressFields[addrFieldCol];
    			    if( fieldToGet.indexOf('.') > -1 ) {
    				    var fields = fieldToGet.split('.');
    				    colContents = record[fields[0]][fields[1]] || record[fieldBackup];
    			    } else {
    			        colContents = record[fieldToGet] || record[fieldBackup];
    			    }
    			}
    			break; 
    		
    		//TOOLTIPS
    		case '13':
    			
    		case '14':
    			
    		case '15':
    			
    		case '16':
    			
    		case '17':
    			
    		case '18':
    			
    		case '19':
    			
    		case '20':
    			
    		case '30':
    			
    		case '31':
    			
    		case '32':
    		
    		case '33':
    		
    		case '34':
    			
    		case '35':
    			
    		case '36':
    			var ProcessToolTipColumnReturn = MAListView.ProcessToolTipColumn({
    				toolTipIndex: MAListView.ListViewColumns[colId].sortColumn,
    				record: record,
    				layerData: layerData,
    				isSelectedTab: isSelectedTab,
    				rawValue: raw
    			});
    			
    			colContents = ProcessToolTipColumnReturn.colContents;
    			break;
    			
    		//FULL ADDRESS
    		case '21':
				colContents = Plotting.getFormattedAddress(record, layerData) || '';
				colContents = htmlEncode(colContents);
    			break;
    			
    		//COMBINED LAT LNG	
    		case '22':
    			if (lat != MASystem.Labels.MA_NA) { colContents = parseFloat( record.marker.getPosition().lat() ).toFixed(4) + ',' + parseFloat( record.marker.getPosition().lng() ).toFixed(4); }
				colContents = htmlEncode(colContents);
				break;
    			
    		default:
    		    colContents = '';
	    }
	    
	    return colContents;
	},



	//========== SELECTED MARKER TAB ==========
	// Clears all of the selected arrays
	ClearAllSelected: function() {
		$(MAListView.queryClass).each(function( index ) {
			if(typeof $(this).data('listViewSettings') == 'object')
			{
				$(this).data('listViewSettings').selectedIds = [];
				$(this).data('listViewSettings').selectedTabIds = [];
			}
		});

		if ($(MAListView.queryClass).length) {
			// uncheck all the checkboxes
			$('.listview-data-table').find('input[type="checkbox"]').attr('checked', false);

			// determine the active tab when the selected tab is removed
			var activeTabIndex; // new tab position will be one below it's current after removing selected tab
			if ($('#listview-tabs').find('li a[href="#SelectedTab"]').length) {
				if ($('#listview-tabs').tabs( 'option', 'active')) { // active tab is not selected tab
					activeTabIndex = $('#listview-tabs').tabs( 'option', 'active') - 1;
				} else { // active tab is selected tab
					activeTabIndex = 0;
				}
			} else { // there's no selected tab. keep same active  position
				activeTabIndex = $('#listview-tabs').tabs( 'option', 'active');
			}

			// remove the selected tab
			// MAListView.RemoveTab('SelectedTab');
			$('#listview-tabs').find('li a[href="#SelectedTab"]').closest('li').remove();
			$('#listview-tabs').find('div#SelectedTab').remove();
			
			// if($('div#listview').find('li[role="tab"]').length >= 1) {
			//   $('#listview-tabs').tabs( 'option', 'active', 1);
			// }
			$('#listview-tabs').tabs('refresh');
			$('#listview-tabs').tabs( 'option', 'active', activeTabIndex);
		}

		MAListView.listViewSettings.queryCount = 0;
		
        MAListView.records = {};
        MAListView.recordList = [];
        MAListView.recordIdList = [];
		MAListView.calculatedValues = {};
	},

	performMassAction: function(layerId) {
		// get the selected action
		var $listSection = $('#listview #' + layerId);
		var selectedAction = $listSection.find('.mass-action-wrapper select option:selected');
		var action = {
			label: selectedAction.attr('data-label'),
			type: selectedAction.attr('data-type'),
			action: selectedAction.attr('data-action')
		};
		if (action.action == 'Add to Route') {
			action.action = 'Add to Trip';
		}
		window.VueEventBus.$emit('performMassAction', layerId, action);
		return false;
	},

	// Clears the specific layer's selected list
	ClearSelected: function(layerId) {
	    var mainCheckBox = $('div#'+layerId).find('input.listview-main-checkbox');
	    
        //This fixes other main checkboxes being checked on pagination
	    if( mainCheckBox.prop("checked") ) {
	        mainCheckBox[0].click();
	    } else {
			var layer = $(MAListView.queryClass + '[qid="' + layerId + '"]');
			// update the total count

			$('div#' + layerId).find('.with-selected-wrapper').text(window.formatLabel(MASystem.Labels.MA_Listview_Selected, [0]));
    	    
    	    if( typeof layer.data('listViewSettings') == 'object' )
    	    {
    			layer.data('listViewSettings').selectedIds = [];
    			layer.data('listViewSettings').selectedTab = [];
    	    }
    		
    		var options = { 
    			layerId: layerId,
    			isSelectedTab: layerId === 'SelectedTab', 
    			isExport: false 
    		};
    
    		MAListView.DrawTab(options);
	    }
	},

	// Adds the selected tab to the front of the tab list
	AddSelectedTab: function(selectTab, newTab) {
		//reset the selected tooltips and the queryCount numbers
		MAListView.listViewSettings.selectedTooltips = 0;
		MAListView.listViewSettings.queryCount = 0;

		//clear the recordList array
		MAListView.records = {};
		MAListView.recordList = [];
		MAListView.recordIdList = [];

		var uniqueQueries = [];
		var selectedTooltips = 0;
		
		//let's build the  MAListView.recordList
		$(MAListView.queryClass).each(function( index ) {

			var layerId = $(this).attr('qid');
			var layerData = $(this).data();

            var buildList = function(selIds) {
                //find out how many unique queries are in this selcted tab
                //and also figure out max number of tooltips
                if ( selIds.length > 0 ) {
                    if( jQuery.inArray( layerId, uniqueQueries ) == -1 ) {
                        uniqueQueries.push(layerId);
                    }

                    selectedTooltips = layerData.tooltips.length > selectedTooltips ? layerData.tooltips.length : selectedTooltips;
                }

                for (var property in layerData.records)
                {
                    if (layerData.records.hasOwnProperty(property)) {

                        var record = layerData.records[property];

                        if ( jQuery.inArray( record.Id, selIds ) > -1 )
                        {

                            MAListView.recordIdList.push(layerId);
                            MAListView.recordList.push(record.Id + '::' + layerId);
                            MAListView.records[record.Id + '::' + layerId] = record;
                        }

                    }
                }
            };

            if (newTab) {
                if (Array.isArray(layerData.listViewSettings.selectedIds) && layerData.listViewSettings.selectedIds.length > 0) {
                    buildList(layerData.listViewSettings.selectedIds);
                }
            } else {
                if (Array.isArray(layerData.listViewSettings.selectedIds) && layerData.listViewSettings.selectedIds.length > 0) {
                    buildList(layerData.listViewSettings.selectedIds);
                }

                if (Array.isArray(layerData.listViewSettings.selectedTabIds) && layerData.listViewSettings.selectedTabIds.length > 0) {
                    buildList(layerData.listViewSettings.selectedTabIds);
                }
            }

			if(!MAListView.isVisible()) {
				MAListView.ConstructAllTabs();
				MAListView.DisplayListView();
			}
		});

		MAListView.listViewSettings.queryCount = uniqueQueries.length;
		MAListView.listViewSettings.selectedTooltips = selectedTooltips;

		if(MAListView.recordList.length > 0) {

			//do we have all of the tabs loaded?
			if ($(MAListView.queryClass).length > $('#listview-tabs li').length) {
				MAListView.ConstructAllTabs();
			}

			var $tabContent = $('#templates #ListViewTabContents').clone().html()
					.replace(/::layerId::/g, 'SelectedTab');

			//Check if exists
			if (MAListView.TabExists('SelectedTab'))
			{
				//clear the contents
				$('#SelectedTab').html($tabContent);
			}
			else
			{
                //build the tab

				//put the title and data in the tabs
				$('#listview-tabs ul').prepend('<li><a href="#' + 'SelectedTab' + '">' + MASystem.Labels.MA_selected + ' &nbsp;&nbsp;</a><a class="lv-select-clear" onclick="MAListView.ClearAllSelected()" role="clear"><span class="MAIcon glyphicon-remove-circle"></span></a></li>');
				$('#listview-tabs').append('<div id="' + 'SelectedTab' + '">' + $tabContent + '</div>');

				//refresh the tabs, just in case
				$('#listview-tabs').tabs("refresh");
			}


			var columnSort = getProperty(MAListView.listViewSettings || {},'currentSort.columnToSort',false) || '';
			var sort = getProperty(MAListView.listViewSettings || {},'currentSort.sort',false) || '';
			$('div#SelectedTab th[colid="' + columnSort + '"]').removeClass('asc').removeClass('desc').removeClass(sort);
			MAListView.RemoveSort();

			$('#SelectedTab .listview-col-sort-asc').removeClass('listview-col-sort-asc');
			$('#SelectedTab .listview-col-sort-desc').removeClass('listview-col-sort-desc');

			//let's draw the selected tab now
			MAListView.DrawTab({
				layerId        : 'SelectedTab',
				isSelectedTab  : true,
				isExport       : false

			});
		
			//hide the select all and clear selected buttons
			$('#SelectedTab a:contains("Select All")').hide();
			$('#SelectedTab a:contains("Clear Selected")').hide();

			//select the tab on screen

			MAListView.SelectTab('SelectedTab');
			var oldPageSize = MAListView.listViewSettings.pageSize || defaultListViewPageSize;
			$('div#SelectedTab').find('select.lv-records-per-page').val( oldPageSize );

			window.$('#listview-tabs').tabs({ active: 0 });
			//MAListView.SortFirstColumn('SelectedTab');
		} else {
			if(selectTab) {
				alert(MASystem.Labels.MA_Please_Select_Records);
			}
		}					
	},

    // Selects all of the rows that are visible
	SelectAll: function(layerId) {
	    var layerData = $(MAListView.queryClass + '[qid=' + layerId + ']').data();
		var recordListLength = layerData.recordList.length;
			
		var isHeatmap = layerData.hasOwnProperty('heatmapLayer');

		for(var ii=0; ii<recordListLength; ii++) {
			var recordId = layerData.recordList[ii];
			var record = layerData.records[layerData.recordList[ii]] || {};
			
			var isVisible = record.hasOwnProperty('listViewVisible') ? record.listViewVisible : false; //record.isVisible || record.isScattered || record.isClustered || isHeatmap;
			
			if(isVisible && jQuery.inArray( recordId, layerData.listViewSettings.selectedIds) === -1) {
				layerData.listViewSettings.selectedIds.push(recordId);
			}
		}

		$('div#' + layerId).find('.with-selected-wrapper').text(window.formatLabel(MASystem.Labels.MA_Listview_Selected,  [layerData.listViewSettings.selectedIds.length]));

		var options = {
			layerId: layerId,
			isSelectedTab: layerId === 'SelectedTab',
			isExport: false
        };

		MAListView.DrawTab(options);
	},

    // Selects all of the rows on the current page
	SelectAllOnPage: function(layerId) {
	    var checkboxes = $('div#' + layerId).find('input[type="checkbox"]');
	    var cbLength = checkboxes.length;
	    for(var ii=0; ii<cbLength; ii++) {
	        checkboxes[ii].click();
	    }
	},

	ProcessListViewButtonFromShapeLayerPopup: function(records) {
		//clear the currently selected rows.
        MAListView.ClearAllSelected();

		//let's use an array so we don't keep using selectors
		listViewSettingsByLayerId = {};

		$.each(records, function (index, record) {
			//let's add this marker's Id to the SelectedIds of the plotted query

			var layerId = record.marker ? record.marker.qid : record.qid;
			var recordId = record.Id;

			//check if the layerId already exists in our array, if it does add the recordId; if not create the holding object.
			if (listViewSettingsByLayerId[layerId])
			{
				listViewSettingsByLayerId[layerId].selectedTabIds.push(recordId);
			}
			else
			{
				listViewSettingsByLayerId[layerId] = {
					layerId: layerId,
					selectedTabIds: [recordId]
				}
			}
		});

		//now let's store the selected Ids against the correct layer's DOM data
		$.each(listViewSettingsByLayerId, function (index, layerIdData) {

			var layerData = $('[qid="' + layerIdData.layerId + '"]').data();

			if (layerData.listViewSettings)
			{
				layerData.listViewSettings.selectedTabIds = layerData.listViewSettings.selectedTabIds.concat(layerIdData.selectedTabIds);
			}
			else
			{
				layerData.listViewSettings = {
					pageSize: 10,
					pageNumber: 1,
					startIndex: 0,
					selectedTabIds: layerIdData.selectedTabIds
				};
			}

			$('[qid="' + layerIdData.layerId + '"]').data('listViewSettings', layerData.listViewSettings);
		});
		//Check if the selected tab exists, then build the tab and populate the data
		MAListView.AddSelectedTab(true);
	},

	BuildCalculatedValues: function(recordId, options) {
	    if( MAListView.calculatedValues.hasOwnProperty(recordId) ) {
	        jQuery.extend(MAListView.calculatedValues[recordId], options);
	    } else {
	        MAListView.calculatedValues[recordId] = options;
	    }
	},
	//========== HELPER METHODS ==========
    // Selects a row
	RowSelected: function(oid, layerId, checkbox) {
		var layerData = $(MAListView.queryClass + '[qid="' + layerId + '"]').data();
		
		if (layerData.listViewSettings) {
			if ($(checkbox).prop('checked')) {
			    //checked
				layerData.listViewSettings.selectedIds.push(oid);
				
			    //figure out how the main checkbox should look
			    if(layerData.listViewSettings.selectedIds.length == layerData.recordList.length) {
			        
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].indeterminate = false;
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].checked = true;
			        
			    } else if(layerData.listViewSettings.selectedIds.length > 0) {
			        
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].checked = false;
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].indeterminate = true;
			        
			    }
				
			} else {
			    //unchecked and id is already in list, remove it
				if ( jQuery.inArray( oid, layerData.listViewSettings.selectedIds) > -1 ) {
					layerData.listViewSettings.selectedIds = jQuery.grep(layerData.listViewSettings.selectedIds, function(value) {
						return value != oid;
					});
				}
				
				//figure out how the main checkbox should look
			    if(layerData.listViewSettings.selectedIds.length == 0) {
			        
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].checked = false;
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].indeterminate = false;
			        
			    } else {
			        
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].checked = false;
			        $('div#' + layerId).find('input.listview-main-checkbox')[0].indeterminate = true;
			        
			    }
			}
			
			//store the information back to the array
			$(MAListView.queryClass + '[qid="' + layerId + '"]').data('listViewSettings', layerData.listViewSettings);

			// update the total count
			$('div#' + layerId).find('.with-selected-wrapper').text(window.formatLabel(MASystem.Labels.MA_Listview_Selected, [layerData.listViewSettings.selectedIds.length]));
		}
	},

    // Handles marker clicks
	MarkerClick: function(layerId, markerId) {
		window.VueEventBus.$emit('list-view-marker-click', { layerId: layerId, recordId: markerId });
	},

	//Determines if the unique id is a query id or something else (prox/shape layer)
	IsQuery: function(id) {
		try {
			var isQuery = true;

			if(id.toString() !== 'NaN') {
				isQuery = id.search('prox') < 0 ? true : false;
			}

			return isQuery;
		}
		catch (err) {
			MAListView.log(err);
		}
	},

	//Determines if the unique id is a proximity layer or a shape layer
	IsProxLayer: function(id) {
		try {
			var isProxLayer = true;
			if(id.toString() !== 'NaN') {
				isProxLayer = id.search('shapeprox') < 0 ? true : false;
			}

			return isProxLayer;
		}
		catch (err) {
			MAListView.log(err);
		}
	},
	
    // Scrolls to the top of the page
	ScrollToListViewTop: function() {
		$('#mapcontainer').animate({ scrollTop: 0 }, 200);
	},

    // Scrolls to the listview
	ScrollToListView: function() {
		// the element inside of which we want to scroll
		var $elem = $('#mapcontainer');
		$('#mapcontainer').animate({scrollTop: $elem.height()}, 200);
	},



	//========== PAGINATION METHODS ==========
    // Moves to the next page
	PageForward: function(layerId) {
		var currentSettings = null;
		var isSelectedTab = layerId == 'SelectedTab';

        var $layer = {};
		var totalRecords = 0;
		
		var recordList = null;
		var records = null;

		//is this the selected tab or a normal tab?
		if(isSelectedTab) {
			currentSettings = MAListView.listViewSettings;
			recordList = MAListView.recordList;
			records = MAListView.records;
			$layer = MAListView;

			if(currentSettings.filterCount > 0) {
				totalRecords = currentSettings.filterCount;
			} else {
				totalRecords = MAListView.recordList.length;
			}
		} else {
		    $layer = $('[qid="' + layerId + '"]').data();
			currentSettings = $layer.listViewSettings || {};
			recordList = $layer.recordList || [];
			records = $layer.records || {};

			if(currentSettings.filterCount > 0) {
				totalRecords = currentSettings.filterCount;
			} else {
				totalRecords = $layer.recordList.length;
			}
		}

		var remainder = totalRecords % currentSettings.pageSize;
		var maxPage = remainder <= 0 ? Math.floor(totalRecords / currentSettings.pageSize) : Math.floor(totalRecords / currentSettings.pageSize) + 1;

		//are we already at the last page?
		if(currentSettings.pageNumber < maxPage) {
			//manipulate the settings
			currentSettings.pageNumber++;

			var i = currentSettings.startIndex;
			var max = recordList.length;
			var c = 0;
			
            var isHeatmap = $layer.hasOwnProperty('heatmapLayer');

			while(i < max && c <= currentSettings.pageSize) {
			    var isVisible = records[recordList[i]] !== undefined ? records[recordList[i]].listViewVisible : false; 
				if(isVisible) {
                    currentSettings.startIndex = i;
					c++;
				}
				i++;
			}

			//redraw
			MAListView.DrawTab({ layerId: layerId, isSelectedTab: isSelectedTab, isExport: false });
		}
	},

    // Moves to the previous page
	PageBackward: function(layerId) {
		var currentSettings = null;
		var isSelectedTab = layerId == 'SelectedTab';

        var $layer = {};
        
        var recordList = null;
		var records = null;

		//is this the selected tab or a normal tab?
		if(isSelectedTab) {
			currentSettings = MAListView.listViewSettings;
			recordList = MAListView.recordList;
			records = MAListView.records;
			$layer = MAListView;
		} else {
		    $layer = $('[qid="' + layerId + '"]').data();
			currentSettings = $layer.listViewSettings || {};
			recordList = $layer.recordList || [];
			records = $layer.records || {};
		}

		//are we already at the first page?
		if(currentSettings.pageNumber > 1) {
			//manipulate the settings
			currentSettings.pageNumber--;
			
			var i = currentSettings.startIndex-1;
			var c = 0;
			
			var isHeatmap = $layer.hasOwnProperty('heatmapLayer');

			while(i >= 0 && c < currentSettings.pageSize) {
			    var isVisible = records[recordList[i]] !== undefined ? records[recordList[i]].listViewVisible : false; 
			    //records[recordList[i]].isVisible || records[recordList[i]].isScattered || records[recordList[i]].isClustered || isHeatmap;
				if(isVisible) {
			        currentSettings.startIndex = i;
					c++;
				}
				i--;
			}

			//redraw
			MAListView.DrawTab({ layerId: layerId, isSelectedTab: isSelectedTab, isExport: false });
		}					
	},
	
	// Denotes a page size change that came from the user
	ChangePageSizeFromUI: function(layerId, value) {
		var layerData = layerId === 'SelectedTab' ? MAListView : $('[qid="' + layerId + '"]').data();
		
		layerData.listViewSettings.useDefaults = false;
		MAListView.ChangePageSize(layerId, value); 
	},

    // Changes the size of the page
	ChangePageSize: function(layerId, value) {
		var $dfd = $.Deferred();

		var currentSettings = {};
		var isSelectedTab = layerId == 'SelectedTab';

		//is this the selected tab or a normal tab?
		if(isSelectedTab) {
			currentSettings = MAListView.listViewSettings;
		} else {
			currentSettings = $('[qid="' + layerId + '"]').data('listViewSettings') || {};
		}

		//manipulate the settings
		currentSettings.pageSize = value;
		currentSettings.pageNumber = 1;
		currentSettings.startIndex = 0;

		var newOpt = { layerId: layerId, isSelectedTab: isSelectedTab, isExport: false };

		// redraw
		MAListView.DrawTab(newOpt).then($dfd.resolve);

		return $dfd.promise();
	},

    // Moves to the last page
	MoveToLastPage: function(layerId) {
		var currentSettings = null;
		var isSelectedTab = layerId == 'SelectedTab';

        var $layer = {};
		var totalRecords = 0;
		
		var recordList = null;
		var records = null;
		
		//is this the selected tab or a normal tab?
		if(isSelectedTab) {
			currentSettings = MAListView.listViewSettings;
			recordList = MAListView.recordList;
			records = MAListView.records;
			$layer = MAListView;

			if(currentSettings.filterCount > 0) {
				totalRecords = currentSettings.filterCount;
			} else {
				totalRecords = MAListView.recordList.length;
			}
		} else {
		    $layer = $('[qid="' + layerId + '"]').data();
			currentSettings = $layer.listViewSettings || {};
			recordList = $layer.recordList || [];
			records = $layer.records || {};

			if(currentSettings.filterCount > 0) {
				totalRecords = currentSettings.filterCount;
			} else {
				totalRecords = $layer.recordList.length;
			}
		}

		var remainder = totalRecords % currentSettings.pageSize;
		var maxPage = remainder <= 0 ? Math.floor(totalRecords / currentSettings.pageSize) : Math.floor(totalRecords / currentSettings.pageSize) + 1;

		//are we already at the last page?
		if(currentSettings.pageNumber < maxPage) {
			//manipulate the settings
			currentSettings.pageNumber = maxPage;
			
			var r = remainder === 0 ? currentSettings.pageSize : remainder;
			var i = recordList.length-1;
			var c = 0;
			
			var isHeatmap = $layer.hasOwnProperty('heatmapLayer');

			while(i >= 0 && c < r) {
			    var isVisible = records[recordList[i]] !== undefined ? records[recordList[i]].listViewVisible : false; 
			    //records[recordList[i]].isVisible || records[recordList[i]].isScattered || records[recordList[i]].isClustered || isHeatmap;
				if(isVisible) {
					currentSettings.startIndex = i;
					c++;
				}
				i--;
			}

			//redraw
			MAListView.DrawTab({ layerId: layerId, isSelectedTab: isSelectedTab, isExport: false });
		}
	},

    // Moves to the first page
	MoveToFirstPage: function(layerId) {
		var currentSettings = null;
		var isSelectedTab = layerId == 'SelectedTab';
		
        var $layer = {};
        
		var records = null;

		//is this the selected tab or a normal tab?
		if(isSelectedTab) {
			currentSettings = MAListView.listViewSettings;
			recordList = MAListView.recordList;
			records = MAListView.records;
			$layer = MAListView;
		} else {
		    $layer = $('[qid="' + layerId + '"]').data();
			currentSettings = $layer.listViewSettings || {};
			recordList = $layer.recordList || [];
			records = $layer.records || {};
		}

		//are we already at the first page?
		if(currentSettings.pageNumber > 1) {
			//manipulate the settings
			currentSettings.pageNumber = 1;

			var i = 0;
			var max = recordList.length;
			var c = 0;
			
			var isHeatmap = $layer.hasOwnProperty('heatmapLayer');

			while(i < max && c < 1) {
			    var isVisible = records[recordList[i]] !== undefined ? records[recordList[i]].listViewVisible : false; 
			    //records[recordList[i]].isVisible || records[recordList[i]].isScattered || records[recordList[i]].isClustered || isHeatmap;
				if(isVisible) {
					currentSettings.startIndex = i;
					c++;
				}
				i++;
			}

			//redraw
			MAListView.DrawTab({ layerId: layerId, isSelectedTab: isSelectedTab, isExport: false });
		}
	},

	// Handles click event for 'Update Address' field value on list views for live records 
	// whose device has no address. The address is reverse geocoded.
	updateLiveListViewRecordAddress: function(anchor)
    {
        var recordId = $(anchor).closest('tr').attr('data-id');
        var qid = $(anchor).closest('tr').attr('data-qid');
        
        var queryMetaData = $('.savedQuery[qid="' + qid + '"]').data() || {};
        var record = getProperty(queryMetaData, 'records.'+recordId);
        
        if(record && record != null && typeof record == 'object')
        {
            if(record.device instanceof MADevice) { // if valid device
                record.device.updateAddress(function(res) { // update device address
                    if(res.success) {
                        var address = record.device.getFormattedAddress();
                        var addressObject = record.device.getAddressObject();
                        // update list view and tooltip with new address
                        if(typeof address == 'string' && addressObject)
                        {
                            $(anchor).closest('td').text(address);   
                            
                            //  update the list view columns
                            MAListView.updateRecordRowAddress(record, address, addressObject);
                        }
                    }
                });
            }
        }
        
        return false;
    },

	// update the relevant record row with address information
	updateRecordRowAddress: function(record, address, addressObject) 
	{
		if(record && address && addressObject) 
		{
			if(typeof record == 'object' && typeof address == 'string' && typeof addressObject == 'object')
			{
				// update columns with address details
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="21"]').text(address || ''); // full address
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="6"]').text(addressObject.street || '');  // street
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="7"]').text(addressObject.city || '');  // city
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="8"]').text(addressObject.state || '');  // state
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="9"]').text(addressObject.zip || '');  // postal code
	            $('.listview-data-table tr[data-id="'+record.Id+'"] td[colid="10"]').text(addressObject.country || ''); // country
			}
		}
	},

	//========== POPUP METHODS ==========
	// Opens the filter popup
	ShowFilterPopupFromDOM: function(obj) {
		
		
		//this is will reference the link
		var layerId = $(obj).closest('div[role="tabpanel"]').attr('id')
		
		MAListView.ShowFilterPopup({layerId : layerId});
	},

	// Opens the filter popup
	ShowFilterPopup: function(options) {
		
		/*
		  options = {
			  layerId : 'string',
			  layerData: { obj }
		  }
		*/
		
		
		if (options.layerId == 'SelectedTab')
		{
			options.layerData = {
				listViewSettings : MAListView.listViewSettings
			}
			
			if (MAListView.listViewSettings.queryCount == 1)
			{
				options.layerData.tooltips = $(MAListView.queryClass).data().tooltips;
			}
		}
		else
		{
			options.layerData = $('[qid="' + options.layerId + '"]').data();
		}
		
		
		
		//clear existing filter rows
		$('#listview-filters-table').html('');
		
		//store the layerId being filtered
		$('#listview-filter-popup').attr('layerId', options.layerId);

		//var searchAllText = $('#' + options.layerId).find('.listview-search-text').val() === undefined ? '' : $('#' + options.layerId).find('.listview-search-text').val();
		var searchAllText = MAListView.GetFilterData({ layerId: options.layerId, colId: -1 }).displayValue || MAListView.GetFilterData({ layerId: options.layerId, colId: -1 }).value;
		
		//put in the "all columns" search row
		var rowHTML = '';
		rowHTML = '<tr>';
		//	rowHTML += '<td></td>';
		rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Listview_Advanced_Search_All_Columns + '</label></td>';
		rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Listview_Advanced_Search_Contains + '</label></td>';
		rowHTML += '<td>' + '<input type="text" class="search-all-value-input slds-input" value="' +  searchAllText  + '"/>' + '</td>';
		rowHTML += '</tr><tr><td class="lvs-row-spacer" colspan="3">&nbsp;</td></tr>';
		$('#listview-filters-table').append(rowHTML);
		
		//first get the columns that we need to display

		$.each(userSettings.ListViewColumns, function( index, colId ) {
			var col = MAListView.ListViewColumns[colId.id];
			
			var currentValue = MAListView.GetFilterData({ layerId: options.layerId, colId: colId.id }).displayValue;
			
		   if (col.visible == 'true')
		   {
			   
			   var rowHTML = '';
		   
			   //Get the column name - need to replace with the tooltip column label if not "IsSelected Tab"
			   
			   
			   
			   //operator and field informatoin
			   if ($.inArray( col.id, [ '0','1','2','3' ] ) > -1)
			   {
				   /*
				   rowHTML = '<tr>';
				   rowHTML += '<td></td>';
				   rowHTML += '<td>' + MAListView.ListViewColumns[col.id].label + '</td>';
				   rowHTML += '<td>' + 'Missing' + '</td>';
				   rowHTML += '<td>' + 'Missing' + '</td>';
				   rowHTML += '</tr>';
				   */
			   }
			   else if ($.inArray( col.id, [ '6','7','8','9','10' ] ) > -1)
			   {
				   rowHTML += '<tr class="listViewFilterRow" colId="' + col.id + '">';
				 //  rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('')  +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
			   }
			   else if ($.inArray( col.id, [ '21' ] ) > -1)
			   {
				   //combined address field, let's break it apart
				   rowHTML = '<tr class="combined-address-field-row">';
				  // rowHTML += '<td></td>'; //show hide additional address fields
				   rowHTML += '<td><legend class="slds-form-element__legend slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</legend></td>';
				   rowHTML += '<td></td>'; //rowHTML += '<td>' + '<select>' +  MAListView.operators.typeString.join('') +   '</select>' + '</td>';
				   rowHTML += '<td></td>'; //rowHTML += '<td>' + '<input type="text"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '6' + '">';
				 //  rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Street + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '7' + '">';
				   //rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_City + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '8' + '">';
				  // rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_State + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '9' + '">';
				  // rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Postal_Code + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '10' + '">';
				   //rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Country + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
			   }
			   else if ($.inArray( col.id, [ '22' ] ) > -1)
			   {
				   //combined position field, let's break it apart
				   rowHTML = '<tr>';
				   rowHTML += '<tr class="combined-address-field-row">'; //show hide additional fields
				   rowHTML += '<td><legend class="slds-form-element__legend slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</legend></td>';
				   rowHTML += '<td>' + '</td>';
				   rowHTML += '<td>' + '</td>';
				   rowHTML += '</tr>';
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '11' + '">';
				   //rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Longitude + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';
				   
				   
				   rowHTML += '<tr class="listViewFilterRow" colId="' + '12' + '">';
				   //rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MASystem.Labels.MA_Latitude + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
				   rowHTML += '</tr>';

			   }
			   else if ($.inArray( col.id, [ '13' ] ) > -1 ) //tooltip 1
			   {
					rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 0, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '14' ] ) > -1 ) //tooltip 2
			   {    
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 1, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '15' ] ) > -1 ) //tooltip 3
			   {
				   // Fix MAListView.  Not re-populating it's value.
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 2, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '16' ] ) > -1 ) //tooltip 4
			   {    
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 3, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '17' ] ) > -1 ) //tooltip 5
			   {
					rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 4, colId: col.id}, options ));   
			   }
			   else if ($.inArray( col.id, [ '18' ] ) > -1 ) //tooltip 6
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 5, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '19' ] ) > -1 ) //tooltip 7
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 6, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '20' ] ) > -1 ) //tooltip 8
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 7, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '30' ] ) > -1 ) //tooltip 9
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 8, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '31' ] ) > -1 ) //tooltip 10
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 9, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '32' ] ) > -1 ) //tooltip 11
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 10, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '33' ] ) > -1 ) //tooltip 12
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 11, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '34' ] ) > -1 ) //tooltip 13
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 12, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '35' ] ) > -1 ) //tooltip 14
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 13, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '36' ] ) > -1 ) //tooltip 15
			   {
				   rowHTML += MAListView.PopupFilterTooltipRow($.extend( {tooltipIndex: 14, colId: col.id}, options ));
			   }
			   else if ($.inArray( col.id, [ '23' ] ) > -1 )
			   {
				   rowHTML += '<tr class="listViewFilterRow" colId="' + col.id + '">';
				  // rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<div class="slds-form-element slds-form_compound"><div class="slds-form-element__row"><div class="slds-form-element"><div class="slds-form-element__control"><input type="text" class="value-input slds-input" value="' + currentValue + '"/></div></div>' + '<div class="slds-form-element"><div class="slds-select_container"><select class="unit-input slds-select"><option value="miles">'+ MASystem.Labels.MA_Miles+'</option>' + '<option value="meters">'+ MASystem.Labels.MA_Meters + '</option>' + '<option value="kilometers">' + MASystem.Labels.Routes_Kilometers + '</option>' + '</select></div></div></div></div>'+ '</td>';
				   rowHTML += '</tr>';
			   }
			   else if ($.inArray( col.id, [ '4' ] ) > -1 && options.layerId == 'SelectedTab')
			   {
				   rowHTML += '<tr class="listViewFilterRow" colId="' + col.id + '">';
				  // rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<div class="slds-form-element slds-form_compound"><div class="slds-form-element__row"><div class="slds-form-element"><div class="slds-form-element__control"><input type="text" class="value-input slds-input" value="' + currentValue + '"/></div></div>' + '<div class="slds-form-element"><div class="slds-select_container"><select class="unit-input slds-select"><option value="miles">miles</option>' + '<option value="meters">meters</option>' + '<option value="kilometers">km</option>' + '</select></div></div></div></div>'+ '</td>';
				   rowHTML += '</tr>';
			   }
			   else if ($.inArray( col.id, [ '5' ] ) > -1 && options.layerId == 'SelectedTab')
			   {
				   rowHTML += '<tr class="listViewFilterRow" colId="' + col.id + '">';
				 //  rowHTML += '<td></td>';
				   rowHTML += '<td><label class="slds-form-element__label">' + MAListView.ListViewColumns[col.id].label + '</label></td>';
				   rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
				   rowHTML += '<td>' + '<div class="slds-form-element slds-form_compound"><div class="slds-form-element__row"><div class="slds-form-element"><label class="slds-form-element__label" for="listview-days">Days</label><div class="slds-form-element__control"><input type="text" class="value-input days slds-input" value="' + currentValue + '" id="listview-days"/></div></div><div class="slds-form-element"><label class="slds-form-element__label" for="listview-hours">Hours</label><div class="slds-form-element__control"><input type="text" class="value-input hours slds-input" id="listview-hours"/></div></div><div class="slds-form-element"><label class="slds-form-element__label" for="listview-minutes">Minutes</label><div class="slds-form-element__control"><input type="text" class="value-input minutes slds-input" id="listview-minutes"/></div></div></div></div>  ' + '</td>';
				   rowHTML += '</td>';
				   rowHTML += '</tr>';
			   }
			   
				$('#listview-filters-table').append(rowHTML);
				
				
				//now that we've put all the HTML elements out there, let's put back the settings
				var filters = getProperty(options,'layerData.listViewSettings.filters',false);
				$.each(filters || [], function( index, filter ) {
					
					/*
						possible properties for a filter are:
							colId - string
							displayValue - string | object ; value to display in the input field, this is important because some filters are converted such as the drive distance
							operator - string
							value - string | decimal ; value used in the filter process (this is the value that has been converted, for example in the case of drive distance or drive time)
							unit - string ; unit of measure
					*/
					
					$filterRow = $('tr.listViewFilterRow[colId="' + filter.colId + '"]');
					$filterRow.find('select.listViewOperator').val(filter.operator);
					
					
					if (filter.colId == '5') //drive time
					{
						$filterRow.find('input.days').val(filter.displayValue.days);
						$filterRow.find('input.hours').val(filter.displayValue.hours);
						$filterRow.find('input.minutes').val(filter.displayValue.minutes);
					}
					else if (filter.colId == '23' || filter.colId == '4' ) //straight line distance or drive distance
					{
						$filterRow.find('input.value-input').val(filter.displayValue);
						$filterRow.find('select.unit-input').val(filter.unit);
						
						
						
					}
					else
					{

						$filterRow.find('input.value-input').val(filter.displayValue);
							
					}
					
					
				});
			   
			   
		   }
		   
		   
		   
			
		});

	
		LaunchPopupWindow($('#listview-filter-popup'), 600);
	},

    // Handles the tooltip rows for the filter popup
	PopupFilterTooltipRow: function(options) {
		/*
			layerId : 'string',
			tooltipIndex: 'integer',
			layerData : object
			colId: 'string'
		*/
		
		
		
		var rowHTML = '';
		var currentValue = MAListView.GetFilterData({ layerId: options.layerId, colId: options.colId }).displayValue;
		
		if (options.layerId == 'SelectedTab' && MAListView.listViewSettings.queryCount > 1)
		{
			//we aren't going to show the filters if there is more than one query because they could contain different columns.
		}
		else
		{

			if (options.layerData.tooltips[options.tooltipIndex])
			{
			
				if ($.inArray( options.layerData.tooltips[options.tooltipIndex].DisplayType.toUpperCase(), [ 'STRING','PHONE','ID','Email','Combobox','MULTIPICKLIST','PHONE','TEXTAREA','URL' ] ) > -1)
				{
					rowHTML += '<tr class="listViewFilterRow" colId="' + options.colId + '">';
					rowHTML += '<td><label class="slds-form-element__label">' + htmlEncode(options.layerData.tooltips[options.tooltipIndex].FieldLabel) + '</label></td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
					rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
					rowHTML += '</tr>';
				}
				else if ($.inArray( options.layerData.tooltips[options.tooltipIndex].DisplayType.toUpperCase(), [ 'CURRENCY','PERCENT', 'INTEGER','DOUBLE' ] ) > -1)
				{
					rowHTML += '<tr class="listViewFilterRow" colId="' + options.colId + '">';
					rowHTML += '<td><label class="slds-form-element__label">' + htmlEncode(options.layerData.tooltips[options.tooltipIndex].FieldLabel) + '</label></td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
					rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
					rowHTML += '</tr>';
				}
				else if ($.inArray( options.layerData.tooltips[options.tooltipIndex].DisplayType.toUpperCase(), [ 'DATE','DATETIME' ] ) > -1)
				{
					rowHTML += '<tr class="listViewFilterRow" colId="' + options.colId + '">';
					rowHTML += '<td><label class="slds-form-element__label">' + htmlEncode(options.layerData.tooltips[options.tooltipIndex].FieldLabel) + '</label></td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeDecimal.join('') +   '</select></div>' + '</td>';
					rowHTML += '<td>' + '<input type="text" class="value-input slds-input" value="' + currentValue + '"/>' + '</td>';
					rowHTML += '</tr>';
				}
				else if ($.inArray( options.layerData.tooltips[options.tooltipIndex].DisplayType.toUpperCase(), [ 'BOOLEAN' ] ) > -1)
				{
					var fieldLabel = options.layerData.tooltips[options.tooltipIndex].FieldLabel;
					var trueSelected = '';
					var falseSelected = '';
					
					if(currentValue === true) {
					  trueSelected = 'checked';
					} else if(currentValue === false) {
					  falseSelected = 'checked';
					}
					var fieldLabelRegex = / /;
					var fieldLabelForRadioId = fieldLabel.replace(fieldLabelRegex,'-')
					trueRadioId = fieldLabelForRadioId+'-'+'true'+'-'+options.colId;
					falseRadioId = fieldLabelForRadioId+'-'+'false'+'-'+options.colId;
					radioGroupName = options.layerData.tooltips[options.tooltipIndex].FieldName + options.colId;

					rowHTML += '<tr class="listViewFilterRow" colId="' + options.colId + '">';
					rowHTML += '<td><label class="slds-form-element__label">' + htmlEncode(fieldLabel) + '</label></td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select"><option value="none">' + MASystem.Labels.MA_None + '</option><option value="equals">' + MASystem.Labels.MA_Equals + '</option></select></div></td>';
					rowHTML += '<td>' + '<div class="slds-form_compound"><div class="slds-form-element__row slds-m-top_x-small"><div class="slds-form-element"><span class="slds-radio"><input type="radio" class="value-input slds-input" fieldValue="true" name="'+radioGroupName+ '" ' + trueSelected + ' id="'+trueRadioId+'" /><label class="slds-radio__label" for="'+trueRadioId+'"><span class="slds-radio_faux"></span><span class="slds-form-element__label">True</span></label></span></div>';
					rowHTML += '<div class="slds-form-element"><span class="slds-radio"><input type="radio" class="value-input slds-input" fieldValue="false" name="'+radioGroupName+'" ' + falseSelected + ' id="'+falseRadioId+'" /><label class="slds-radio__label" for="'+falseRadioId+'"><span class="slds-radio_faux"></span><span class="slds-form-element__label">False</span></label></span></div></div></div>' + '</td>';
					rowHTML += '</tr>';
				}
				else if ($.inArray( options.layerData.tooltips[options.tooltipIndex].DisplayType.toUpperCase(), [ 'PICKLIST' ] ) > -1)
				{
					//if this is a picklist, let's get all of the options and store them
					var picklistOptions = options.layerData.tooltips[options.tooltipIndex].PicklistOptions === undefined ? [] : options.layerData.tooltips[options.tooltipIndex].PicklistOptions;
					var optionSelect = [];

					if(picklistOptions.length > 0) {
						var len = picklistOptions.length; 						
						for (var i=0; i<len; i++) {
							const selected = picklistOptions[i].value === currentValue ? ' selected ' : '';
							var newOption = '<option value="' + picklistOptions[i].value + '"' + selected + '>' + htmlEncode(picklistOptions[i].label) + '</option>';
							optionSelect.push(newOption);
						}
					}

					rowHTML += '<tr class="listViewFilterRow" colId="' + options.colId + '">';
					rowHTML += '<td><label class="slds-form-element__label">' + htmlEncode(options.layerData.tooltips[options.tooltipIndex].FieldLabel) + '</label></td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="listViewOperator slds-select">' +  MAListView.operators.typeString.join('') +   '</select></div>' + '</td>';
					rowHTML += '<td>' + '<div class="slds-select_container"><select class="value-input slds-select  value="' + currentValue + '">' + optionSelect.join('') + '</select></div>' + '</td>';
					rowHTML += '</tr>';
				}
			
			
			}
		}
		return rowHTML;
	},


	// Clears popup without closing
	clearFilterPopup: function() {
		$('#listview-filter-popup .value-input:not([type="radio"])').val('');
		$('#listview-filter-popup .value-input[type="radio"]').prop('checked', false);
		$('#listview-filter-popup .listViewOperator').val('none');
		$('#listview-filter-popup .search-all-value-input').val('');
	},

    // Closes the popup
	closeFilterPopup: function() {
		/*
			layerId : 'string',
			doSave: boolean
		*/
		
		var options = {
			layerId : $('#listview-filter-popup').attr('layerId'),
			doSave : true
		}
		
		
		 //MAListView.closeFilterPopup({layerId : $('.testing').data().qid,doSave: true });
		

		/****************************
		 * To Do:
		 *  Put error checking in, for example if they have selected an operator, make sure there is a value (operator dependent of course), right now the script always assumes there is a value.
		 *  - Added in some error checking and now a filter will not be applied if there is no value. Further code may be needed in the future.
		 * ***
		 **********************/

		if (options.doSave)
		{
			var filtersArray = [];
			
			$( "tr.listViewFilterRow" ).each(function( index ) {
				
				var colId = $(this).attr('colid');
				var operator = $(this).find('select.listViewOperator').val();
				let colValue = $(this).find('.value-input').val();
				
				if (operator != 'none' && colValue != '' && colValue != undefined && colValue != null && colId != '5')
				{
					if (colId == '23' || colId == '4' ) //straight line distance or drive distance
					{
						var displayValue = $(this).find('input.value-input').val();
						var unitOfMeasure = $(this).find('select.unit-input').val();
						
						//need to conver to meters
						var meters = displayValue;

						if (unitOfMeasure == 'kilometers')
						{
							meters = 1000.00 * displayValue;
						}
						else if (unitOfMeasure == 'miles')
						{
							meters = 1609.344 * displayValue;
						}
						
						filtersArray.push({
							colId        : colId,
							operator     : operator,
							value        : meters,
							displayValue : displayValue,
							unit         : unitOfMeasure
						});
					}
					else
					{
						var fields = $(this).find('.value-input');
						var displayValue = null;

						if(fields.length > 1) {
							for(var i=0; i<fields.length; i++) {
								if(fields[i].checked) {
									var fieldValue = fields[i].getAttribute('fieldValue') === "true";
									displayValue = fieldValue;
								}
							}
						} else {
							displayValue = $(this).find('.value-input').val();
						}

						filtersArray.push({
							colId        : colId,
							operator     : operator,
							value        : displayValue,
							displayValue : displayValue
						});
					}
				} else if (operator != 'none' && colId == '5') {
					var days    = $('input.days').val();
					var hours   = $('input.hours').val();
					var minutes = $('input.minutes').val();
					
					//check for blanks and conver to Float
					days    = (days == "")      ? 0 : parseFloat(days);
					hours   = (hours == "")     ? 0 : parseFloat(hours);
					minutes = (minutes == "")   ? 0 : parseFloat(minutes);
					
					//convert to seconds
					var seconds = (days * 86400.00) + (hours * 3600.00) + (minutes * 60.00);

					filtersArray.push({
						colId        : colId,
						operator     : operator,
						value        : seconds,
						displayValue : {
							days : days,
							hours : hours,
							minutes : minutes
						}
					});
				}
				
			});
			
			
			if($('.search-all-value-input').val() !== '') {
				filtersArray.push({
					colId        : '-1',
					operator     : 'contains',
					value        : $('.search-all-value-input').val(),
					displayValue : $('.search-all-value-input').val()
				});
			}

			if (options.layerId === 'SelectedTab')
			{
				MAListView.listViewSettings.filters = filtersArray;
				var opt = { layerId: options.layerId, count: MAListView.listViewSettings.filters.length };
			}
			else
			{
				$layerData = $('[qid="' + options.layerId + '"]').data();
				$layerData.listViewSettings.filters = filtersArray;
				var opt = { layerId: options.layerId, count: $layerData.listViewSettings.filters.length };
			}
			MAListView.UpdateAdvancedSearchLink(opt); 
			MAListView.Search(opt);
			
			//close the popup
			ClosePopupWindow();
		}
	},
	
	// Logs MA ListView errors
	log: function() {
		try { 
			console.log('ListView errors:');
			$.each(arguments, function (index, arg) {
				console.log(arg);
				if (arg instanceof Error) {
					console.log(arg.stack);
				}
			}); 
		} catch (err) { }
	}

};

MAListView.operators.typeString = [
	MAListView.operators.none, 
	MAListView.operators.equals, 
	MAListView.operators.notEqualTo, 
	MAListView.operators.startsWith, 
	MAListView.operators.contains, 
	MAListView.operators.doesNotContain 
	/*MAListView.operators.endsWith*/
];

MAListView.operators.typeDecimal = [
	MAListView.operators.none, 
	MAListView.operators.equals, 
	MAListView.operators.notEqualTo, 
	MAListView.operators.lessThan, 
	MAListView.operators.lessThanEqualTo, 
	MAListView.operators.greaterThan, 
	MAListView.operators.greaterThanEqualTo 
	/*, MAListView.operators.range*/
];
