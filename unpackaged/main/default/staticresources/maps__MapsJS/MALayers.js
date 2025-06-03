var MALayers = {

	currentFolder: 'Home', // still used
	currentFolderNodeType: '', // still used

	moveToTab: function(tabid) {
		console.log('deprecated', tabid);
		//$('div#layer-tab-nav').find('li[aria-selected="true"]').find('a').text();
		tabid = tabid.toLowerCase() == 'saved' ? 'folders' : tabid.toLowerCase();

		if (tabid == 'plotted' || tabid == 'folders' || tabid == 'recent') {
			$('a#layer-tab-nav-' + tabid).click();
		}
		VueEventBus.$emit('move-to-tab', tabid);
	},
	// still used
	showModal: function(modalId) {
		$('#' + modalId + '').addClass('in');
		$('#' + modalId + ' .slds-scope .slds-modal').addClass('slds-fade-in-open');
		/*if ( $($Id).has('.ma-modal-search-input') ) {
		 $($Id).find('.ma-modal-search-input').focus();
		 } else {}*/
		if ($('.backdrop').length == 0) {
			$('<div class="backdrop"></div>').appendTo('body');
		}
		$('.backdrop').addClass('active visible');
	},
	// still used
	hideModal: function(modalSelector, hideMask) {
		hideMask = hideMask === false ? false : true;
		if (modalSelector != undefined) {
			//$('#'+modalSelector+'').removeClass('in');
			$('#' + modalSelector + ' .slds-scope .slds-modal').removeClass('slds-fade-in-open');
		} else {
			//hide all modals
			//$('.ma-modal').removeClass('in');
			$('.maModal .slds-scope .slds-modal').removeClass('slds-fade-in-open');
		}

		if (hideMask) {
			$('#modalScreen').removeClass('in');
			$('.backdrop').removeClass('active visible');
		}
		$('.select2-hidden-accessible').select2('close');
	},
	// still used, can be moved to vue
	createTerritoryLayer: function() {
		getLayerCount().then(function(layerCount) {
			if (Number.isInteger(layerCount) && layerCount >= 10) {
				window.VueEventBus.$emit('show-generic-modal', {
					title: MASystem.Labels.Territory_Management_Too_Many_Layers_Title,
					message: MASystem.Labels.Territory_Management_Too_Many_Layers
				});
			} else {
				window.VueEventBus.$emit('render-territory-builder');
			}
		});
	},
	// still used, can be moved to vue
	createArcGISWebMapLayer: function(saveModal) {
		// add pendo tracking for ArcGIS layer save button click
		window.trackUsage('ArcGIS Layer - Nav - Save', { action: 'ArcGIS save button', description: 'Saving an ArcGIS layer' });

		var $button = $(saveModal);
        $button.attr('value', MASystem.Labels.MA_Saving + '...');
        var f = MALayers.currentFolder;
        var ft = MALayers.currentFolderNodeType;
		var validArcGISLayer = false;
		var isHome = false;
		if(f === 'Home') {
			// Opened from the Recent tab and the folder doesn't matter because we're editing an existing layer by its ID.
			// If you pass the Home folder to QueryBuilderAPI, you'll get Invalid id: Home.
			f = 'PersonalRoot';
			isHome = true;
		}
        if(f === 'PersonalRoot' || f === 'CorporateRoot') {
            ft = f;
        }

        var layerName = $('div#CreateNewArcGISWebMapPopup').find('input[name="Name"]').val() || '--None--';
        var layerDescription = $('div#CreateNewArcGISWebMapPopup').find('input[name="Description"]').val() || '--None--';
        var layerWebMapURL = $('div#CreateNewArcGISWebMapPopup').find('textarea[name="WebMapURL"]').val() || '--None--';
        var automaticRefresh = $('div#CreateNewArcGISWebMapPopup').find('input[name="AutomaticRefresh"]:checked').val();
        var refreshInterval = $('div#CreateNewArcGISWebMapPopup').find('input[name="RefreshInterval"]').val() || '--None--';
        var click2createTemplates = $('#webMapTemplateTable  .WebMapC2CTemplateRows tr');

        if(ArcGIS.validateDetails()) {

            var remoteData = {
                folder : f,
                folderType : ft,
                layerName : layerName,
                layerDescription : layerDescription,
                layerWebMapURL : layerWebMapURL,
                automaticRefresh : automaticRefresh,
                refreshInterval : refreshInterval,
                ajaxResource : 'QueryBuilderAPI',
				securityToken: MASystem.MergeFields.Security_Token,

				action: 'saveArcGISWebMapLayer'
            }
            if($('div#CreateNewArcGISWebMapPopup').attr('data-mode') == 'edit')
            {
                remoteData.recId = $('div#CreateNewArcGISWebMapPopup').attr('data-layerid');
            }

			var c2cTemplates = [];
			$.each(click2createTemplates,function(i,row)
			{
				rowData = getProperty($(row).data(),'rowData',false) || null;
				if(rowData != null)
				{
					var webMapLabel = getProperty(rowData,'webMapLayer.label',false) || '';
					if(webMapLabel != undefined && webMapLabel != '')
					{
						c2cTemplates.push(rowData);
					}
				}
			});
			remoteData.click2createTemplates = JSON.stringify(c2cTemplates);

            //saveArcGISWebMapLayer
            Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
                remoteData,
                function(response,event){
                    $button.attr('value', 'Save');
                    if (response.success)
                    {
                        validArcGISLayer = true
                        //attempt to fire the success callback
                        var plotQueryOnComplete = $button.is('.plotbtn');
                        MALayers.breadCrumbClickHandler(isHome ? 'Home' : remoteData.folder);
                        $('#error-message').remove();
                        $(".WebMapC2CTemplateRows").empty();
                        $('#arcConnectionSuccess').hide();
				        $('#arcConnectionFail').hide();
				        $('.arc-config-input-wrapper').empty();
				        $('#fieldMappingsWrapper .arc-field-mapping-input').remove();
				        $('#fieldMappingsWrapper').removeClass('fadeInLeft');
				        $('#fieldMappingsWrapper').removeClass('fadeInDown');
				        $('#webMapTemplateTable table tbody').empty();
				        $('#webMapTemplateTable').removeClass('fadeInLeft');
				        $('#CreateNewArcGISWebMapPopup .arc-advanced').removeClass('slds-is-active');
				        $('#CreateNewArcGISWebMapPopup .arc-click-to-create').removeClass('slds-is-active');
				        $('#CreateNewArcGISWebMapPopup .arc-details').addClass('slds-is-active');
				        $('#arcgisDetailsTab').removeClass('slds-hide').addClass('slds-show');
				        $('#arcgisC2CSetupTab').removeClass('slds-show').addClass('slds-hide');
				        $('#arcgisAdvancedTab').removeClass('slds-show').addClass('slds-hide');
                        closeThisSLDSModal($button);
                        //ArcGIS.closeCreateWindow();
                    }

                }
            );
        }

	},
	displayCreateArcGISWebMapLayerPopup: function(options) {
		$('#arcConnectionFail').hide();
		options = $.extend({
			baseObjectType : ''
		}, options || {});
		var popup = $('div#CreateNewArcGISWebMapPopup');
		var fieldMappings = {};
		//arcgis derek
		$('.arc-click-to-create').css({
			'pointer-events':'none',
			'opacity':'0.6'
		})
		$(popup).attr('data-mode','');
		$(popup).attr('data-layerid','');
		$(popup).find('.slds-input').val("");
		$(popup).find('.slds-textarea').val("");
		$('#arc-name-error-message').remove();
		$('#arc-url-error-message').remove();
		$('#arc-automaticrefresh-error-message').remove();
		$('#arc-refreshinterval-error-message').remove();
		$(popup).addClass('slds-fade-in-open');
		$(popup).find('.slds-form-element').removeClass('slds-has-error');
		if(options.action=='edit-data-layer' || options.action=='clone-data-layer')
		{
			var processData = {
				ajaxResource : 'QueryBuilderAPI',
				securityToken: MASystem.MergeFields.Security_Token,
				action: 'editArcGISWebMapLayer',
				recId : options.id
			};

			Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
				processData,
				function(response, event){
					if(response.success)
					{
						var rec = response.data[0];
						var layerName = rec.Name != undefined ? rec.Name : '';
						var layerDescription = rec.maps__Description__c != undefined ? rec.maps__Description__c : '';
						var layerOptions = rec.maps__Options__c != undefined ? JSON.parse(rec.maps__Options__c) : {};
						fieldMappings = rec.maps__ArcGISWebMapC2C__c != undefined ? JSON.parse(rec.maps__ArcGISWebMapC2C__c) : [];
						$(popup).data('options',options);
						$(popup).data('fieldMappings',fieldMappings);
                        $(".WebMapC2CTemplateRows").empty();
						if(fieldMappings.length > 0)
						{
							ArcGIS.click2CreateHelpers.populateTemplates(fieldMappings);
						}
						if(options.action=='edit-data-layer')
						{

							$(popup).attr('data-mode','edit');
							$(popup).attr('data-layerid',options.id);
							$(popup).find('input[name="Name"]').val(layerName);

						} else if(options.action=='clone-data-layer')
						{
							 $(popup).find('input[name="Name"]').val('Copy of ' + layerName);

						}
						$(popup).find('input[name="Description"]').val(layerDescription);
						$(popup).find('textarea[name="WebMapURL"]').val(layerOptions.baseURL);
						$(popup).find('input[name="AutomaticRefresh"][value="' + layerOptions.automaticRefresh + '"]').prop('checked', true);
						$(popup).find('input[name="RefreshInterval"]').val(layerOptions.refreshInterval == '--None--' ? '' : layerOptions.refreshInterval);
						if(ArcGIS.validateDetails())
						{
							$('.arc-click-to-create').css({
								'pointer-events':'',
								'opacity':'1'
							})
						} else {
							$('.arc-click-to-create').css({
								'pointer-events':'none',
								'opacity':'0.6'
							})
						}
					}
				},{buffer:false,escape:false,timeout:120000}
			);
		} else
		{
			$(popup).attr('data-mode','');
			$(popup).attr('data-layerid','');
			$(popup).find('.slds-input').val("");
			$(popup).find('.slds-textarea').val("");
			$(popup).find('input').first().focus();
		}
		//Click2Create Modal code.
		$('#sldsModalBackDrop').addClass('slds-backdrop--open');
	},

	breadCrumbClickHandler: function(id) {
		// updated to use vue
		VueEventBus.$emit('load-folder', id);
	},

	// still used
	doPlotOnLoad: function(id) {
		var saved = $('div#layer-tab-folders').find('div#' + id).find('.ftu-icon-left');
		var recent = $('div#recent-queries').find('div#' + id).find('.ftu-icon-left');
		var search = $('div#foldersearch-results-contents').find('div#' + id).find('.ftu-icon-left');

		if (saved.hasClass('is-plot-on-load') || recent.hasClass('is-plot-on-load') || search.hasClass('is-plot-on-load')) {
			var processData = {
				ajaxResource: 'TreeAJAXResources',

				action: 'remove_plot_on_load',
				id: id
			};

			Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
				processData,
				function(json, event) {
					if (json.success) {
						userSettings.PlotOnLoadQueries.splice(userSettings.PlotOnLoadQueries.indexOf(id), 1);
						VueEventBus.$emit('get-recent-layers');
						NotifySuccess("Success!", "Removed Plot On Load");
						saved.removeClass('is-plot-on-load');
						recent.removeClass('is-plot-on-load');
						search.removeClass('is-plot-on-load');
						$('div#layer-tab-folders').find('div#' + id).find('.ft-tooltip-plotonload').html('<td class="label"><b>' + MASystem.Labels.MA_Plot_On_Load + '</b> </td><td class="value">False</td>');
						$('div#foldersearch-results-contents').find('div#' + id).find('.ft-tooltip-plotonload').html('<td class="label"><b>' + MASystem.Labels.MA_Plot_On_Load + '</b> </td><td class="value">False</td>');
					} else {
						NotifyError("Error Removing Plot On Load", json.error);
					}
				}, {
					buffer: false
				}
			);
		} else {
			var processData = {
				ajaxResource: 'TreeAJAXResources',

				action: 'add_plot_on_load',
				id: id
			};

			Visualforce.remoting.Manager.invokeAction(MARemoting.processAJAXRequest,
				processData,
				function(json, event) {
					if (json.success) {
						userSettings.PlotOnLoadQueries.push(id);
						VueEventBus.$emit('get-recent-layers');
						NotifySuccess("Success!", "Added Plot On Load");
						saved.addClass('is-plot-on-load');
						recent.addClass('is-plot-on-load');
						search.addClass('is-plot-on-load');

						$('div#layer-tab-folders').find('div#' + id).find('.ft-tooltip-plotonload').html('<td class="label"><b>' + MASystem.Labels.MA_Plot_On_Load + '</b> </td><td class="value">True</td>');
						$('div#foldersearch-results-contents').find('div#' + id).find('.ft-tooltip-plotonload').html('<td class="label"><b>' + MASystem.Labels.MA_Plot_On_Load + '</b> </td><td class="value">True</td>');
					} else {
						NotifyError("Error Adding Plot On Load", json.error);
					}
				}, {
					buffer: false
				}
			);
		}
	},

	// still used (can be moved into a vue cmp)
	calcPlottedLayerInfo: function(obj) {
		var tooltipTemplate = $('#folderItem-template').find('.ftu-tooltip').html();
		//get the id
		var data = $(obj).data();
		var tooltip = $(obj).find('.ftu-tooltip');
		var tooltipArrow = $(obj).find('.ftu-tooltip-arrow');
		var newHTML = '';

		if (data.type === 'datalayer') {
			//this is a data layer
			newHTML = tooltipTemplate.replace('::TOOLTIP-TITLE::', htmlEncode(data.name) || 'N/A')
				.replace('::TOOLTIP-DESC::', htmlEncode(data.description) || 'N/A')
				.replace('::TOOLTIP-BASEOBJ::', 'Data Layer')
				.replace('::TOOLTIP-CREATED::', htmlEncode(data.createdInfo) || 'N/A')
				.replace('::TOOLTIP-MODIFIED::', htmlEncode(data.modifiedInfo) || 'N/A')
				.replace('â€¢', '')
			// .replace('::TOOLTIP-PLOTONLOAD::', '');  //hides the plot on load stuff for now - Commented out because now this row is being hidden once the new HTML is appended
		} else if (data.hasOwnProperty('marker')) {

			var createdBy = '';
			var modifiedBy = '';

			if (data.marker.hasOwnProperty('record')) {
				if (data.marker.record.hasOwnProperty('record')) {
					createdBy = data.marker.record.record.CreatedBy.Name + ', ' + data.marker.record.record.CreatedDate;
					modifiedBy = data.marker.record.record.LastModifiedBy.Name + ', ' + data.marker.record.record.LastModifiedDate;
				} else {
					createdBy = 'N/A';
					modifiedBy = 'N/A';
				}
			} else {
				createdBy = 'N/A';
				modifiedBy = 'N/A';
			}
			
			//this is a fav layer
			newHTML = tooltipTemplate.replace('::TOOLTIP-TITLE::', htmlEncode(data.marker.title) || 'N/A')
				.replace('::TOOLTIP-DESC::', htmlEncode(data.marker.description) || 'N/A')
				.replace('::TOOLTIP-BASEOBJ::', 'Location')
				.replace('::TOOLTIP-CREATED::', htmlEncode(createdBy))
				.replace('::TOOLTIP-MODIFIED::', htmlEncode(modifiedBy))
				.replace('â€¢', '')
			// .replace('::TOOLTIP-PLOTONLOAD::', '');  //hides the plot on load stuff for now - Commented out because now this row is being hidden once the new HTML is appended

		} else if (data.hasOwnProperty('proxObjects') && data.popupData) {
			
			//this is a shape layer
			newHTML = tooltipTemplate.replace('::TOOLTIP-TITLE::', htmlEncode(data.popupData.name) || 'N/A')
				.replace('::TOOLTIP-DESC::', htmlEncode(data.popupData.description) || 'N/A')
				.replace('::TOOLTIP-BASEOBJ::', 'Shape')
				.replace('::TOOLTIP-CREATED::', htmlEncode(data.popupData.createdBy))
				.replace('::TOOLTIP-MODIFIED::', htmlEncode(data.popupData.modifiedBy))
				.replace('â€¢', '')
			// .replace('::TOOLTIP-PLOTONLOAD::', '');  //hides the plot on load stuff for now - Commented out because now this row is being hidden once the new HTML is appended

		} else {
			
			//add info to the hover
			newHTML = tooltipTemplate.replace('::TOOLTIP-TITLE::', htmlEncode(data.savedQueryName) || 'N/A')
				.replace('::TOOLTIP-DESC::', htmlEncode(data.description) || 'N/A')
				.replace('::TOOLTIP-BASEOBJ::', htmlEncode(data.baseObjectLabel) || 'N/A')
				.replace('::TOOLTIP-CREATED::', htmlEncode(data.createdBy) || 'N/A')
				.replace('::TOOLTIP-MODIFIED::', htmlEncode(data.modifiedBy) || 'N/A')
				.replace('â€¢', '')
			// .replace('::TOOLTIP-PLOTONLOAD::', '');  //hides the plot on load stuff for now - Commented out because now this row is being hidden once the new HTML is appended

		}

		tooltip.html(newHTML);
		tooltip.find('.tooltip-row.ft-tooltip-plotonload').hide(); //hide Plot on Load row
		var folderPath = data.folderPath || '';
		tooltip.find('.ftu-tooltip-pad-gray').prepend('<div class="layer-folder-path"><div class="ftu-icon-icon inline" type="folder"></div>' + folderPath + '</div>');

		//display the hover
		var scrollPos = $(window).scrollTop();
		var $Layer = $(obj);
		var layerWidth = $Layer.width();
		var layerOff = $Layer.offset();
		//this is the row position from top of page in pixels
		var layerTop = layerOff.top;

		//layersPanel
		var buttonPosition = $Layer.offset();
		var layersPanelPosition = $('.layersPanel').offset();
		var computedPositionLeft =  buttonPosition.left - layersPanelPosition.left;
		var computedPositionTop =  buttonPosition.top - layersPanelPosition.top;

		//get some menu info
		var $menu = tooltip;
		var menuHeight = $menu.height();

		//determine if menu is to large and add scroll before calc
		if (menuHeight >= 400) {
			$menu.css({
				'max-height': '400px',
				'overflow-y': 'auto'
			});
			menuHeight = 400;
		}

		//check the menu height and offset
		var totalMenu = computedPositionTop + menuHeight;

		//get the map dimensions
		var containerHeight = $('#horizontalViewsWrap').height();

		//appears offscreen 140
		var $arrow = $Layer.find('.ftu-tooltip-arrow');
		if (totalMenu >= containerHeight) {
			//update the position of the dropdown to stay within the bounds of the app
			positionDifference = totalMenu - containerHeight;
			dropdownVerticalPadding = 2;
			newPosition = computedPositionTop - positionDifference - dropdownVerticalPadding;
			$menu.css({
				top: newPosition + "px",
				left: computedPositionLeft + 436 + "px"
			});

		} else {
			$menu.css({
				top: computedPositionTop - 20 + "px",
				left: computedPositionLeft + 436 + "px"
			});
		}

		//handle arrow
		$arrow.css(
		{
			'top': computedPositionTop + 3 + 'px',
			'left': computedPositionLeft + 426 + 'px'
		});
	},
};

function closeThisSLDSModal(theModal) {
	$('#sldsModalBackDrop').removeClass('slds-backdrop--open');
	$('.slds-backdrop').removeClass('slds-backdrop_open');
	$(theModal).closest('.slds-modal').removeClass('slds-fade-in-open');
}

function getLayerCount() {
	var dfd = jQuery.Deferred();

	Visualforce.remoting.Manager.invokeAction(MARemoting.Territory.getLayerCount, function (response) {
		var success = response.success;
		var layerCount = response.layerCount || 0;

		if (success && Number.isInteger(layerCount)) {
			dfd.resolve(layerCount);
		} else {
			dfd.reject(false);
		}
	});

	return dfd.promise();
}

window.VueEventBus.$emit('MA-Layers', MALayers);