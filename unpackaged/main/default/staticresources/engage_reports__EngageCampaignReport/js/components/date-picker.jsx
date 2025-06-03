import React, { Component } from 'react'
import Svg from './svg.jsx'
import {
    dateWithDayGranularity,
    dateWithMonthGranularity
} from '../util'
import {
    datePickerDropdown,
    dropdownCloser,
    handleDatePickerDropdownClose,
    removeDropdownCloser
} from '../../../../js/dropdown-closer.js'

export default class DatePicker extends Component {
    constructor(props) {
        super(props)
        let { date } = props
        this.state = {
            open: false,
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate()
        }
        this.dropDownListener = handleDatePickerDropdownClose.bind(this)
    }

    componentWillMount() {
        dropdownCloser(datePickerDropdown, this.dropDownListener)
    }

    componentWillUnmount() {
        removeDropdownCloser(datePickerDropdown, this.dropDownListener)
    }

    componentDidUpdate(nextProps) {
        if (!this.state.open) {
            let { date } = this.props
            let year = date.getFullYear()
            let month = date.getMonth()
            let day = date.getDate()

            let {
                year: sYear,
                month: sMonth,
                day: sDay
            } = this.state

            if (sYear !== year || sMonth !== month || sDay !== day) {
                this.setState({
                    year,
                    month,
                    day
                })
            }
        }
    }

    containerMouseDown(event) {
        let { yearSelect } = this.refs
        let { target } = event

        if (!yearSelect || (target === yearSelect || yearSelect.contains(target))) {
            return
        }

        event.preventDefault()
    }

    dateInputFocused() {
        this.setState({
            open: true
        })
    }

    dateInputBlurred(event) {
        let { relatedTarget } = event

        /*Firefox and IE8-11 do not provide a relatedTarget on onBlur events. So if relatedTarget is null
        grab the active element explicitly*/
        relatedTarget = relatedTarget || document.activeElement

        if (relatedTarget && this.refs.container.contains(relatedTarget)) {
            return
        }

        this.setState({
            open: false
        })
    }

    navigateMonthClicked(direction) {
        let date = this.getDateFromState()
        let increment = direction === 'left' ? -1 : 1

        date.setMonth(date.getMonth() + increment)

        this.setState({
            ...getPartsFromDate(date)
        })
    }

    todayClicked() {
        let {
            year,
            month,
            day
        } = getTodayParts()

        this.dateSelected(year, month, day)
    }

    dateSelected(year, month, day) {
        let date = getDateFromParts(year, month, day)
        this.props.onChange(date)

        this.setState({
            open: false
        }, () => {
            this.refs.input.blur()
        })
    }

    getCalendarDateCssClass(year, month, day, weekIndex) {
        let {
            min,
            max,
            date
        } = this.props
        let currentDate = getDateFromParts(year, month, day)
        if (!isDayInThisMonth(day, weekIndex) || !dayIsBetweenMinAndMax(currentDate, min, max)) {
            return 'slds-disabled-text'
        }

        let {
            day: propDay,
            month: propMonth,
            year: propYear
        } = getPartsFromDate(date)
        if (propYear === year && propMonth === month && propDay === day) {
            return 'slds-is-selected'
        }

        let {
            year: thisYear,
            month: thisMonth,
            day: thisDay
        } = getTodayParts()
        if (thisYear === year && thisMonth === month && thisDay === day) {
            return 'slds-is-today'
        }

        return ''
    }

    getDateFromState() {
        let {
            year,
            month,
            day
        } = this.state

        return getDateFromParts(year, month, day)
    }

    render() {
        let {
            year,
            month,
            day
        } = getPartsFromDate(this.props.date)
        let options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        }
        let formattedDate = this.props.date.toLocaleDateString(this.props.locale, options)

        return (
            <div className='slds-is-relative' ref='container' onMouseDown={this.containerMouseDown.bind(this)}>
                <label>
                    <div>{this.props.label}</div>
                    <input type='text' value={formattedDate} readOnly={true} onFocus={this.dateInputFocused.bind(this)} onBlur={this.dateInputBlurred.bind(this)} ref='input'/>
                </label>

                {this.renderPicker()}
            </div>
        )
    }

    renderPicker() {
        if (!this.state.open) {
            return null
        }

        let date = this.getDateFromState()

        return (
            <div className='slds-datepicker slds-dropdown slds-dropdown--right' aria-hidden='false'>
                {this.renderFilters(date)}
                {this.renderMonth(date)}
            </div>
        )
    }

    renderFilters(date) {
        let thisMonthName = getMonthName(date)

        return (
            <div className='slds-datepicker__filter slds-grid'>
                <div className='slds-datepicker__filter--month slds-grid slds-grid--align-spread slds-grow'>
                    {this.renderMonthNavigationButton(date, 'left')}
                    <h2 className='slds-align-middle' aria-live='assertive' aria-atomic='true'>
                        {thisMonthName}
                    </h2>
                    {this.renderMonthNavigationButton(date, 'right')}
                </div>
                <div className='slds-shrink-none'>
                    <label className='slds-assistive-text'>Pick a Year</label>
                    <div className='slds-select_container'>
                        {this.renderYearSelect()}
                    </div>
                </div>
            </div>
        )
    }

    renderMonthNavigationButton(date, direction) {
        let increment, disabled
        if (direction === 'left') {
            increment = -1
            let prevMonth = new Date(date)
            prevMonth.setMonth(prevMonth.getMonth() + increment)
            disabled = dateWithMonthGranularity(prevMonth) < dateWithMonthGranularity(this.props.min)

        } else {
            increment = 1
            let nextMonth = new Date(date)
            nextMonth.setMonth(nextMonth.getMonth() + increment)
            disabled = dateWithMonthGranularity(nextMonth) > dateWithMonthGranularity(this.props.max)
        }
        let title = getMonthFromDateAbbreviation(date, increment)

        return (
            <div className='slds-align-middle'>
                <button disabled={disabled} className='slds-button slds-button--icon-container' title={title} onClick={this.navigateMonthClicked.bind(this, direction)}>
                    <Svg className='slds-button__icon' type={Svg.Types.Utility} symbol={direction} />
                    <span className='slds-assistive-text'>{title}</span>
                </button>
            </div>
        )
    }

    renderYearSelect() {
        let {
            min,
            max
        } = this.props

        let years = getYearsBetween(min, max)

        /**
            If only one option is available, clicking on the select will cause
            the text input to lose focus. Currently, focus is only returned to the
            input when the select value changes, it needs to be disabled; unless
            the input focus/blur logic that controls the datepicker visibility
            is reworked.
        */
        let disabled = years.length === 1
        let title = disabled ? 'No other options available' : 'Select year'

        return (
            <select disabled={disabled} title={title} value={this.state.year} onChange={this.yearChanged.bind(this)} className='slds-select' ref='yearSelect'>
                {years.map(year =>
                    <option value={year} key={year}>{year}</option>
                )}
            </select>
        )
    }

    renderMonth(date) {
        let daysOfTheWeek = getDaysOfTheWeek()
        let year = date.getFullYear()
        let month = date.getMonth()
        let calendar = getCalendarDataForCurrentMonth(year, month)

        return (
            <table className='slds-datepicker__month' role='grid' aria-labelledby='month'>
                <thead>
                    <tr>
                        {daysOfTheWeek.map(day =>
                            <th scope='col' key={day}>
                                <abbr title={day}>{day.substring(0, 3)}</abbr>
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {calendar.map((week, i) =>
                        <tr key={i}>
                            {week.map((day, j) => {
                                let listeners = {}
                                let className = this.getCalendarDateCssClass(year, month, day, i)
                                if (className !== 'slds-disabled-text') {
                                    listeners.onClick = this.dateSelected.bind(this, year, month, day)
                                }
                                return (
                                    <td className={className} role='gridcell' aria-disabled='true' aria-selected='false' key={j}>
                                        <span {...listeners} className='slds-day'>{day}</span>
                                    </td>
                                )
                            })}
                        </tr>
                    )}
                    <tr>
                        <td colSpan='7' role='gridcell'>
                            <a onClick={this.todayClicked.bind(this)} className='slds-show--inline-block slds-p-bottom--x-small'>Today</a>
                        </td>
                    </tr>
                </tbody>
            </table>
        )
    }

    yearChanged(event) {
        let newYear = event.target.value
        let {
            year,
            month,
            day
        } = this.state
        let {
            min,
            max
        } = this.props

        this.setState({
            year: newYear,
            month: ensureMonthWithinValidRange(year, month, day, newYear, min, max)
        })
        this.refs.input.focus()
    }
}

function getDateFromParts(year, month, day) {
    return new Date(`${year}/${month + 1}/${day}`)
}

function isDayInThisMonth(day, weekIndex) {
    return !(weekIndex === 0 && day > 7 || weekIndex > 2 && day < 7)
}

function getTodayParts() {
    return getPartsFromDate(dateWithDayGranularity(new Date()))
}

function getPartsFromDate(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate()
    }
}

function getMonthFromDateAbbreviation(date, num) {
    let month = new Date(date)
    month.setMonth(month.getMonth() + num)
    return month.toDateString().split(' ')[1]
}

function getYearsBetween(min, max) {
    let maxYear = max.getFullYear()
    let years = []
    for (let i = min.getFullYear(); i <= maxYear; i++) {
        years.push(i)
    }

    return years
}

function getDaysOfTheWeek() {
    return [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ]
}

function getCalendarDataForCurrentMonth(year, month) {
    let calendar = [
        new Array(7),
        new Array(7),
        new Array(7),
        new Array(7),
        new Array(7),
        new Array(7)
    ]

    let currentDate = dateWithDayGranularity(new Date())
    currentDate.setFullYear(year)
    currentDate.setMonth(month)
    currentDate.setDate(1)

    let firstDay = currentDate.getDay()

    // fill first week with end of previous month
    if (firstDay > 0) {
        let previousDate = new Date(currentDate)
        for (let i = firstDay; i > 0; i--) {
            previousDate.setDate(previousDate.getDate() - 1)
            calendar[0][previousDate.getDay()] = previousDate.getDate()
        }
    }

    // fill weeks with dates from current month
    for (let i = 0; i < calendar.length; i++) {
        let startDay = i === 0 ? firstDay : 0
        for (let j = startDay; j < calendar[i].length; j++) {
            calendar[i][j] = currentDate.getDate()
            currentDate.setDate(currentDate.getDate() + 1)
        }
    }

    // remove up to last 2 weeks if they contain any no dates from the current month
    for (let i = 0; i < 2; i++) {
        if (calendar[calendar.length - 1][0] <= 14) {
            calendar.pop()
        }
    }

    return calendar
}

function getMonthName(date) {
    let months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ]

    return months[date.getMonth()]
}

function dayIsBetweenMinAndMax(date, min, max) {
    return min <= date && date <= max
}

function ensureMonthWithinValidRange(oldYear, month, day, newYear, min, max) {
    let date = getDateFromParts(newYear, month, day)

    let increment = newYear > oldYear ? -1 : 1
    while (!dayIsBetweenMinAndMax(date, min, max)) {
        date.setMonth(date.getMonth() + increment)
    }

    return date.getMonth()
}
