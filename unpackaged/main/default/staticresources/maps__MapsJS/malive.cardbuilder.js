

function MACardBuilder(options, result) {
	this.options = options;
	this.result = result;
    return this.GenerateCards();
}

MACardBuilder.prototype.GenerateCards = function() {

/*
cardsection :'#card-section',
arrayProperty: 'summaries',
*/

    $( this.options.cardsection ).html('');
    var CardHTML = '';
    var DataArray = [];

    if (this.result.hasOwnProperty('success') && this.result.success) {
        DataArray = this.result[this.options.arrayProperty];
        for (var index=0; index < DataArray.length; index++) {

            CardHTML += '<div class="slds-card slds-container_medium slds-m-bottom_medium">'
                + '<ul class="slds-accordion">'
                    + '<li class="slds-accordion__list-item">'
                        + '<section class="slds-accordion__section">'
                            + '<div class="slds-accordion__summary">'
                                + '<h3 class="slds-text-heading_small slds-accordion__summary-heading slds-grid slds-grid_vertical-align-center slds-p-around_x-small" style="background-color: whitesmoke;">'

                                    + '<button aria-controls="accordion-details-02" aria-expanded="true" class="slds-button accordian-switch">'
                                        + '<span class="slds-icon_container" title="show config details">'
                                            + '<svg class="slds-accordion__summary-action-icon slds-button__icon_large slds-button__icon_left" aria-hidden="true" style="fill: darkgray">'
                                                + '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/apexpages/slds/latest/assets/icons/utility-sprite/svg/symbols.svg#switch"></use>'
                                            + '</svg>'
                                        + '</span>'
                                    + '</button>'

                                    + '<div class="slds-col slds-text-heading_small"><strong>' + GetObjProperty(DataArray[index], 'summaryname') + '</strong></div>'

                                    + '<div title="show errors" class="slds-p-bottom_x-small slds-p-right_medium' + (GetObjProperty(DataArray[index], 'openErrorCount') == 0 ? ' slds-hide"' : '"') + '>'
                                        + '<a href="javascript:void(0);" onclick="SummaryModal.open(\'' + GetObjProperty(DataArray[index], 'id') + '\', \'errors\');">'
                                            + '<span class="slds-badge slds-theme--error">' + GetObjProperty(DataArray[index], 'openErrorCount') + ' ERRORS</span>'
                                        + '</a>'
                                    + '</div>'

                                    + '<div class="slds-form-element slds-p-right_medium">'
                                        + '<label class="slds-checkbox--toggle slds-grid enable-disable-toggle page-header-inline-checkbox-toggle">'
                                           + '<input type="checkbox" name="checkbox" aria-describedby="toggle-desc" onchange="setActiveState(\'' + GetObjProperty(DataArray[index], 'id') + '\', this)"' + ( GetObjProperty(DataArray[index], 'isactive') ? 'checked="checked"' : '' )  + '">'
                                                + '<span id="toggle-desc" class="slds-checkbox_faux_container" aria-live="assertive">'
                                                    + '<span class="slds-checkbox_faux" title="activate/deactivate summary processing"></span>'
                                                    + '<span class="slds-checkbox_on">Active</span>'
                                                    + '<span class="slds-checkbox_off">Inactive</span>'
                                                + '</span>'
                                            + '</input>'
                                        + '</label>'
                                    + '</div>'

                                    + '<div class="slds-dropdown-trigger slds-dropdown-trigger_click" title="summary actions">'
                                        + '<button class="slds-button slds-button_icon slds-button_icon-border-filled actionDropDown">'
                                            + '<span class="slds-button__icon ma-icon ma-icon-down"></span>'
                                        + '</button>'
                                        + '<div class="slds-dropdown slds-dropdown_left slds-dropdown_actions">'
                                            + '<ul class="slds-dropdown__list">'
                                                + '<li class="slds-dropdown__item">'
                                                    + '<a href="javascript:void(0);" onclick="DateModal.open(\'' + GetObjProperty(DataArray[index], 'id') + '\');">Generate Historical Summaries</a>'
                                                + '</li>'
                                                + '<li class="slds-dropdown__item">'
                                                    + '<a href="javascript:void(0);" onclick="SummaryModal.open(\'' + GetObjProperty(DataArray[index], 'id') + '\');">Edit</a>'
                                                + '</li>'
                                                + '<li class="slds-dropdown__item">'
                                                    + '<a href="javascript:void(0);" onclick="SummaryModal.open(\'' + GetObjProperty(DataArray[index], 'id') + '\', true);">Clone</a>'
                                                + '</li>'
                                                + '<li class="slds-has-divider_top-space" role="separator"></li>'
                                                + '<li class="slds-dropdown__item">'
                                                    + '<a href="javascript:void(0);" onclick="deleteSummary(\'' + GetObjProperty(DataArray[index], 'id') + '\');" style="color: red;">Delete</a>'
                                                + '</li>'
                                            + '</ul>'
                                        + '</div>'
                                    + '</div>'

                                + '</h3>'
                            + '</div>'

                            + '<div aria-hidden="false" class="slds-accordion__content" id="accordion-details-01">'
                                + '<div class="slds-card__body slds-card__body_inner slds-m-around_xx-small">'
                                    + '<div class="slds-grid slds-gutters">'
                                        + '<div class="slds-col">'
                                            + '<div class="slds-form-element slds-m-bottom_small">'
                                                + '<label class="slds-form-element__label" for="select-01">Live Layer</label>'
                                                + '<div class="slds-form-element__control">'
                                                    + '<input type="text" readonly="" id="text-input-id-1" class="slds-input" value="' + (GetObjProperty(DataArray[index], 'livelayername')) + '" />'
                                                + '</div>'
                                            + '</div>'
                                            + '<div class="slds-form-element slds-m-bottom_small">'
                                                + '<label class="slds-form-element__label" for="select-01">Device Count</label>'
                                                + '<div class="slds-form-element__control">'
                                                    + '<input type="text" readonly="" id="text-input-id-1" class="slds-input" value="' + (GetObjProperty(DataArray[index], 'devicecount')) + '" />'
                                                + '</div>'
                                            + '</div>'
                                            + '<div class="slds-form-element slds-m-bottom_small">'
                                                + '<label class="slds-form-element__label" for="select-01">Description</label>'
                                                + '<div class="slds-form-element__control">'
                                                    + '<input type="text" readonly="" id="text-input-id-1" class="slds-input" value="' + (typeof GetObjProperty(DataArray[index], 'summarydesc') === 'undefined' ? '' : GetObjProperty(DataArray[index], 'summarydesc')) + '" />'
                                                + '</div>'
                                            + '</div>'
                                        + '</div>'
                                        + '<div class="slds-col">'
                                            + '<div class="slds-form-element slds-m-bottom_small">'
                                                + '<label class="slds-form-element__label" for="select-01">Created Date</label>'
                                                + '<div class="slds-form-element__control">'
                                                    + '<input type="text" readonly="" id="text-input-id-1" class="slds-input" value="' + (typeof GetObjProperty(DataArray[index], 'createddate') === 'undefined' ? '' : moment(GetObjProperty(DataArray[index], 'createddate')).format("MM/DD/YYYY")) + '" />'
                                                + '</div>'
                                            + '</div>'
                                            + '<div class="slds-form-element slds-m-bottom_small">'
                                                + '<label class="slds-form-element__label" for="select-01">Created By</label>'
                                                + '<div class="slds-form-element__control">'
                                                    + '<input type="text" readonly="" id="text-input-id-1" class="slds-input" value="' + (GetObjProperty(DataArray[index], 'createdby')) + '" />'
                                                + '</div>'
                                            + '</div>'
                                        + '</div>'
                                    + '</div>'
                                + '</div>'
                            + '</div>'
                        + '</section>'
                    + '</li>'
                + '</ul>'
            + '</div>';
        }
    }
    
    $( this.options.cardsection ).append( CardHTML );
    $( '.actionDropDown' ).on( 'click', function() {
        var wasopen = $( this ).closest( '.slds-dropdown-trigger' ).hasClass( "slds-is-open" );
        var dropdown = $( this ).closest( '.slds-dropdown-trigger' );
        $( '.actionDropDown' ).closest( '.slds-dropdown-trigger' ).removeClass( "slds-is-open" );
        if( !wasopen ) {
            dropdown.addClass( "slds-is-open" );
        }
    });
    $( ".accordian-switch" ).on( 'click', function( event ) {
        $( this ).closest( '.slds-accordion__section' ).toggleClass( 'slds-is-open' );
    });

    return DataArray;
}