import React, { Component, PropTypes } from 'react'
import Svg from './svg.jsx'
import Dropdown from './dropdown.jsx'
import DateRangeSelector from './date-range-selector.jsx'
import Spinner from './spinner.jsx'
import ProgressBar from './progress-bar.jsx'
import {
    selectClientType,
    selectDraftType,
    selectScope,
    selectDateRange,
    selectPage,
} from '../actions'
import {
    ReportTypes,
    FilterDropdownTypes,
    DateRangePresets,
    DefaultLocale,
    EmailDraftTypes,
    ClientTypes,
    Pages,
} from '../report-constants'
import {
    datesEqual,
    formatDateForUI
} from '../util'
import {
    pageHeader,
    dropdownCloser,
    togglePageHeaderDateRangeSelectorOpen
} from '../../../../js/dropdown-closer.js'
import {
    getPageInfo,
} from '../setup-routing'

export default class PageHeader extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dateRangeSelectorOpen: false
        }
        this.dropDownListener = togglePageHeaderDateRangeSelectorOpen.bind(this)
    }

    componentWillMount() {
        dropdownCloser(pageHeader, this.dropDownListener)
    }

    renderFilterControls() {
        let disabled = this.props.reportInstancesLoading() || this.props.sendStats.loading

        return (
            <div>
                <span>
                    {this.renderFilterDropdown(EmailDraftTypes, FilterDropdownTypes.EmailDraftTypes, disabled)}
                </span>
                <span>
                    {this.renderFilterDropdown(ClientTypes, FilterDropdownTypes.ClientTypes, disabled)}
                </span>
                <span>
                    {this.renderFilterDropdown(this.getScopeOptions(), FilterDropdownTypes.ScopeTypes, disabled)}
                </span>
            </div>
        )
    }

    renderFilterDropdown(itemsMap, type, disabled) {
        if (!this.props[`include${type}Control`]) {
            return null
        }

        let {
            draftType,
            clientType,
            selectedScope
        } = this.props.filters.page
        let title = ''
        let activeFilter = ''
        let onItemSelected
        if (type === FilterDropdownTypes.EmailDraftTypes) {
            title = itemsMap[draftType].title
            activeFilter = itemsMap[draftType].dropdownLabel;

            onItemSelected = (item) => {
                let action = selectDraftType(item.key)
                this.props.dispatch(action)
                this.props.fetchReports()
            }
        } else if (type === FilterDropdownTypes.ClientTypes) {
            title = itemsMap[clientType].title
            activeFilter = itemsMap[clientType].dropdownLabel;

            onItemSelected = (item) => {
                let action = selectClientType(item.key)
                this.props.dispatch(action)
                this.props.fetchReports()
            }
        } else if (type === FilterDropdownTypes.ScopeTypes) {
            title = itemsMap[selectedScope].title
            activeFilter = itemsMap[selectedScope].dropdownLabel;

            onItemSelected = (item) => {
                let action = selectScope(item.key)
                this.props.dispatch(action)
                this.props.fetchReports()
            }
        }
        let labelCSS = "slds-page-header__title"
        let items = Object.keys(itemsMap)
            .map((key) => {
                return {
                    key,
                    label: itemsMap[key].dropdownLabel,
                    title: itemsMap[key].title
                }
            })

        return <Dropdown disabled={disabled} items={items} header={title} title={title} activeFilter={activeFilter} onItemSelected={onItemSelected} labelCSS={labelCSS} />
    }

    getScopeOptions() {
        let metadata = {};
        let scopedReportTypes = [ReportTypes.Send]
        // All these report types should have the same scopes because they're based on the same primary object
        // We're looking through all of them because there's no report that's on every page that needs this dropdown
        scopedReportTypes.some((reportType) => {
            if ('reportTypeMetadata' in this.props.reports[reportType]) {
                metadata = this.props.reports[reportType].reportTypeMetadata
                return true
            }
            return false
        })

        if ('scopeInfo' in metadata) {
            return metadata.scopeInfo.values.reduce((acc, scopeInfo) => {
                acc[scopeInfo.value] = {
                    title: scopeInfo.label,
                    dropdownLabel: scopeInfo.label
                }
                return acc
            }, {})
        }

        // Default case if metadata is not loaded
        return {
            user: {
                title: 'My Engage Sends',
                dropdownLabel: 'My Engage Sends'
            },
            team: {
                title: "My Team's Engage Sends",
                dropdownLabel: "My Team's Engage Sends"
            },
            organization: {
                title: 'All Engage Sends',
                dropdownLabel: 'All Engage Sends'
            }
        }
    }

    filterDrodownItemClicked(dropdownItemsMap, item) {
        let action
        if (dropdownItemsMap === EmailDraftTypes) {
            action = selectDraftType(item.type)
        } else if (dropdownItemsMap === ClientTypes) {
            action = selectClientType(item.type)
        } else {
            action = selectScope(item.type)
        }

        this.setState({
            draftTypesDropdownOpen: false,
            sendClientsDropdownOpen: false,
            scopeDropdownOpen: false
        })
        this.props.dispatch(action)
        this.props.fetchReports()
    }

    filterDropdownToggleClicked(dropdownItemsMap) {
        let newState = {}
        if (dropdownItemsMap === EmailDraftTypes) {
            newState.draftTypesDropdownOpen = !this.state.draftTypesDropdownOpen
            newState.sendClientsDropdownOpen = false
            newState.scopeDropdownOpen = false
        } else if (dropdownItemsMap === ClientTypes) {
            newState.sendClientsDropdownOpen = !this.state.sendClientsDropdownOpen
            newState.draftTypesDropdownOpen = false
            newState.scopeDropdownOpen = false
        } else {
            newState.sendClientsDropdownOpen = false
            newState.draftTypesDropdownOpen = false
            newState.scopeDropdownOpen = !this.state.scopeDropdownOpen
        }

        this.setState(newState)
    }

    dateRangeSelected(start, end, presetName) {
        let { startDate, endDate, dateRange } = this.props.filters.page
        if (!datesEqual(start, startDate) || !datesEqual(end, endDate) || presetName !== dateRange) {
            this.props.dispatch(
                selectDateRange(start, end, presetName)
            )
            this.props.fetchReports()
        }

        this.setState({
            dateRangeSelectorOpen: false
        })
    }

    toggleDateRangeSelector() {
        this.setState({
            dateRangeSelectorOpen: !this.state.dateRangeSelectorOpen
        })
    }

    close() {
        this.setState({
            dateRangeSelectorOpen: false
        })
    }


    renderDateRangeSelector(startDate, endDate) {
        let dateRangeKey = this.props.filters.page.dateRange

        if (!this.props.includeDateSelector) {
            return null
        }

        let disabled = this.props.reportInstancesLoading() || this.props.sendStats.loading

        return (
            <div className='slds-text-align--right page-header-date-range-selector'>
                <button disabled={disabled} onClick={this.toggleDateRangeSelector.bind(this)} className='slds-button slds-button--icon-border' aria-haspopup='true' title='Select Date Range'>
                    <Svg className='slds-button__icon' type={Svg.Types.Action} symbol={'new_event'} />
                </button>
                {(() => {
                    if (!this.state.dateRangeSelectorOpen) {
                        return null
                    }

                    return <DateRangeSelector onRangeSelect={this.dateRangeSelected.bind(this)} startDate={startDate} endDate={endDate} dateRangeKey={dateRangeKey} userLocale={this.props.userLocale || DefaultLocale}/>
                })()}
            </div>

        )
    }

    navigateToHome(event) {
        event.preventDefault()
        this.props.dispatch(selectPage(Pages.Main, null))
    }

    render() {
        let {
            startDate,
            endDate,
            dateRange
        } = this.props.filters.page
        let locale = this.props.userLocale || DefaultLocale

        return (
            <div className='slds-page-header'>
                <div className='slds-grid'>
                    <div className='slds-col slds-has-flexi-truncate'>
                        <div className='slds-media slds-no-space slds-grow'>
                            <div className='slds-media__figure'>
                                <span className='slds-icon_container slds-icon-standard-email'>
                                    {this.renderEnvelopeIcon()}
                                </span>
                            </div>
                                <div className='slds-media__body'>
                                    {this.props.pageTitle}
                                    {this.renderFilterControls()}
                                </div>
                            </div>
                        <div>
                            {(() => {
                                let {
                                    showDate,
                                    includeDateSelector
                                } = this.props

                                if (showDate || includeDateSelector) {
                                    if (dateRange) {
                                        return `Last ${DateRangePresets[dateRange].label}`
                                    } else {
                                        return `${formatDateForUI(startDate, locale)} through ${formatDateForUI(endDate, locale)}`
                                    }
                                } else {
                                    return null
                                }
                            })()}
                        </div>
                    </div>
                    <div className='slds-col slds-no-flex slds-grid slds-align-top'>
                        {this.renderDateRangeSelector(startDate, endDate)}
                    </div>
                </div>
                {this.renderBatchesLoading()}
                {this.props.pageHeaderDetails}
            </div>
        )
    }

    renderEnvelopeIcon() {
        let { page } = getPageInfo(window.location)
        if (page === Pages.Main) {
            return <Svg symbol='email' type={Svg.Types.Standard} className='slds-icon slds-icon--large'/>
        } else {
            return <a onClick={this.navigateToHome.bind(this)}>
                <Svg symbol='email' type={Svg.Types.Standard} className='slds-icon slds-icon--large'/>
            </a>
        }
    }

    renderBatchesLoading() {
        let {
            sendStats,
            statsBySendId,
            reportInstances,
            reportInstancesLoading
        } = this.props

        // If nothing's loading, don't show a progress bar
        if (!sendStats.loading && !reportInstancesLoading()) {
            return null
        }

        let percent = 0
        // Default to 0 if we don't have the first send report because without that we have no idea of our progress
        let totalSendsToFetch = 0
        // If we've fetched the first send report
        if (reportInstances[ReportTypes.Send].hasOwnProperty('id')) {
            // We know how many total sends there are, so we have a target
            totalSendsToFetch = reportInstances[ReportTypes.Send].factMap['T!T'].aggregates[0].value
        }
        if (totalSendsToFetch === 0) {
            percent = 0
        } else {
            percent = Math.floor(99 * Object.keys(statsBySendId).length / totalSendsToFetch)
        }

        return (
            <div className='slds-m-top--x-small'>
                <div>Loading - {percent}%</div>
                <ProgressBar percent={percent} />
            </div>
        )
    }
}
export class PageHeaderTitle extends Component {

    render() {
        return (
            <div>
                {this.props.children}
            </div>
        )
    }
}

export class PageHeaderDetails extends Component {

    render() {
        if (!this.props.children) {
            return null
        } else {
            return (
                <ul className="slds-grid slds-page-header__detail-row">
                    {this.props.children.filter(c => c).map((child) =>
                        <li key={child.key} className="slds-page-header__detail-block">
                            {child}
                        </li>
                    )}
                </ul>
            )
        }
    }
}

export class PageHeaderRecipientPage extends Component {

    render() {
        if (!this.props.children) {
            return null
        } else {
            return (
                <div>
                    {this.props.children}
                </div>
            )
        }
    }
}


PageHeader.defaultProps = {
    includeDateSelector: true,
    includeEmailDraftTypesControl: true,
    includeClientTypesControl: true,
    includeScopeTypesControl: true,
    showDate: false
}
