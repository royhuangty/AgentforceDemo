import React, { Component } from 'react'
import Svg from './svg.jsx'
import DatePicker from './date-picker.jsx'
import { getDatesForPastNDays, dateWithDayGranularity } from '../util'
import {
    DateRangePresets,
    EngageReleaseDate,
    DefaultLocale
} from '../report-constants'
import {
    dateRangeSelectorDropdown,
    dropdownCloser,
    handleDateRangeSelectorDropdownClose,
    removeDropdownCloser
} from '../../../../js/dropdown-closer.js'

export default class DateRangeSelector extends Component {
    constructor(props) {
        super(props)
        this.state = {
            presetRangesOpen: true,
            datePickersOpen: false,
            startDate: props.startDate,
            endDate: props.endDate,
            dateRangeKey: props.dateRangeKey
        }
        this.dropDownListener = handleDateRangeSelectorDropdownClose.bind(this)
    }

    componentWillMount() {
        dropdownCloser(dateRangeSelectorDropdown, this.dropDownListener)
    }

    componentWillUnmount() {
        removeDropdownCloser(dateRangeSelectorDropdown, this.dropDownListener)
    }

    customDateRunClicked() {
        let {
            startDate,
            endDate
        } = this.state

        this.props.onRangeSelect(startDate, endDate, null)
    }

    startDateChanged(startDate) {
        let { endDate } = this.state
        if (startDate > endDate) {
            endDate = startDate
        }
        this.setState({
            startDate,
            endDate
        })
    }

    endDateChanged(endDate) {
        this.setState({
            endDate
        })
    }

    customDateRangeClicked() {
        this.setState({
            presetRangesOpen: false,
            datePickersOpen: true
        })
    }

    dateRangeOptionClicked(presetName) {
        let days = DateRangePresets[presetName].value
        let { start, end } = getDatesForPastNDays(days)
        this.props.onRangeSelect(start, end, presetName)
    }

    getActiveOptionClass(key) {
        if (key == this.state.dateRangeKey) {
            return 'slds-is-selected'
        } else if (this.state.dateRangeKey == null && key == 'Custom') {
            return 'slds-is-selected'
        } else {
            return ''
        }
    }

    render() {
        let presetsHideClass = this.state.presetRangesOpen ? '' : 'slds-hide'
        let pickersHideClass = this.state.datePickersOpen ? '' : 'slds-hide'
        let { startDate, endDate } = this.state
        let locale = this.props.userLocale || DefaultLocale
        return (
            <div className='slds-is-relative date-range-selector'>
                <div className={`${presetsHideClass} slds-dropdown slds-dropdown--right`}>
                    <ul className='slds-dropdown__list' role='menu'>
                        {Object.keys(DateRangePresets).map(key =>
                            <li className={'slds-dropdown__item ' + this.getActiveOptionClass(key)} role='presentation' key={key}>
                                <a onClick={this.dateRangeOptionClicked.bind(this, key)}>
                                    <span className="slds-icon_container slds-icon-text-default slds-m-right--small">
                                        <span>
                                            <Svg symbol='check' type={Svg.Types.Utility} className="slds-icon slds-icon--selected blue-check-mark slds-m-right--xx-small" aria-hidden="true" />
                                        </span>
                                        <span className="slds-assistive-text">Selected</span>
                                        <span className='slds-truncate capitalized'>{DateRangePresets[key].label}</span>
                                    </span>
                                </a>
                            </li>
                        )}
                        <li className={'slds-dropdown__item ' + this.getActiveOptionClass("Custom")} role='presentation'>
                            <a onClick={this.customDateRangeClicked.bind(this)}>
                                <span className="slds-icon_container slds-icon-text-default slds-m-right--small">
                                    <span>
                                        <Svg symbol='check' type={Svg.Types.Utility} className="slds-icon slds-icon--selected blue-check-mark slds-m-right--xx-small" aria-hidden="true" />
                                    </span>
                                    <span className="slds-assistive-text">Selected</span>
                                    <span className='slds-truncate capitalized'>Custom</span>
                                </span>
                            </a>
                        </li>
                    </ul>
                </div>
                <div className={pickersHideClass}>
                    <div>
                        <DatePicker label='Start Date' date={startDate} locale={locale} min={EngageReleaseDate} max={endDate} onChange={this.startDateChanged.bind(this)} />
                    </div>
                    <div>
                        <DatePicker label='End Date' date={endDate} locale={locale} min={startDate} max={dateWithDayGranularity(new Date())} onChange={this.endDateChanged.bind(this)} />
                    </div>
                    <button className='slds-button slds-button--neutral' onClick={this.customDateRunClicked.bind(this)}>Run</button>
                </div>
            </div>
        )
    }
}
