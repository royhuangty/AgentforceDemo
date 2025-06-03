import React from 'react';
import { shallow, mount } from 'enzyme'
import DatePicker from '../../components/date-picker.jsx'
import { EngageReleaseDate } from '../../report-constants'
import {
    getDatesForPastNDays,
    dateWithDayGranularity
} from '../../util'

describe('Date-Picker', () => {
  let datePicker, expectedYear, expectedMonth, expectedDay
  let {
    start,
    end
  } = getDatesForPastNDays(7)
  let label = "Start Date"

  beforeEach(() => {
    datePicker = shallow(<DatePicker label={label} date={start} min={EngageReleaseDate} max={end}/>)
  })


  /// BASIC RENDER TEST ////


  it('Has correct state on render', () => {
    expectedYear = start.getFullYear()
    expectedMonth = start.getMonth()
    expectedDay = start.getDate()

    expect(datePicker.state(['year'])).toEqual(expectedYear)
    expect(datePicker.state(['month'])).toEqual(expectedMonth)
    expect(datePicker.state(['day'])).toEqual(expectedDay)    
  })

  it('has correct label and value', () => {
    expectedYear = start.getFullYear()
    expectedMonth = start.getMonth()
    expectedDay = start.getDate()

    expect(datePicker.find('label div').text()).toEqual(label)
    expect(datePicker.find('input').prop('value')).toEqual(`${expectedMonth + 1}/${expectedDay}/${expectedYear}`)
  })

  it('is open after focus', () => {
    expect(datePicker.state(['open'])).toEqual(false)
    datePicker.find('input').simulate('focus')
    expect(datePicker.state(['open'])).toEqual(true)
  })


  ////////////// RENDER MONTH NAVIGATION TEST ////////////////////////

  it('it navigates dates correctly', () => {
    let mountDatePicker = mount(<DatePicker label={label} date={start} min={EngageReleaseDate} max={end}/>)

    //Test changing the month to the next month
    let date = getDateFromParts(mountDatePicker.state(['year']),mountDatePicker.state(['month']),mountDatePicker.state(['day']))
    let monthBeforeClick = mountDatePicker.state('month')

    let title = getMonthFromDateAbbreviation(date, 1)
    let selector = '[title="' + title + '"]'

    mountDatePicker.setState({open: true})

    /*This approach is in the enzyme documentation but does not call the event handler correctly
    mountDatePicker.find(selector).simulate('click','right')
    */

    mountDatePicker.find(selector).prop('onClick')('right')

    expect(mountDatePicker.state('month')).toEqual(monthBeforeClick + 1)

    //Test changing the month the previous month
    date = getDateFromParts(mountDatePicker.state(['year']),mountDatePicker.state(['month']),mountDatePicker.state(['day']))
    monthBeforeClick = mountDatePicker.state('month')

    title = getMonthFromDateAbbreviation(date, -1)
    selector = '[title="' + title + '"]'

    mountDatePicker.find(selector).prop('onClick')('left')

    expect(mountDatePicker.state('month')).toEqual(monthBeforeClick -1)
  })


  /////////////// RENDER YEAR SELECT TEST ////////////////////////////

  it('changes year on year selection', () => {
    let mountDatePicker = mount(<DatePicker label={label} date={start} min={EngageReleaseDate} max={end}/>)
    mountDatePicker.setState({open: true})
    let event1 = { target: {value: '2015'}}

    let yearSelect = mountDatePicker.ref('yearSelect')
    yearSelect.simulate('change', event1)
    expect(mountDatePicker.state('year')).toEqual('2015')

    let event2 = { target: {value: '2016'}}
    yearSelect.simulate('change', event2)
    expect(mountDatePicker.state('year')).toEqual('2016')

    let event3 = { target: {value: '2017'}}
    yearSelect.simulate('change', event3)
    expect(mountDatePicker.state('year')).toEqual('2017')

  })

  it('has correct number of years to select from', () => {
    let testMin = new Date('Sun Mar 01 2001 00:00:00 GMT-0500 (EST)')
    let testMax = new Date('Sat May 27 2017 23:59:59 GMT-0400 (EDT)')
    let mountDatePicker = mount(<DatePicker label={label} date={start} min={testMin} max={testMax}/>)
    mountDatePicker.setState({open: true})

    expect(mountDatePicker.ref('yearSelect').find('option').length).toBe(17)
})

  it('year select is disabled/enabled based on year difference', () => {
    let testMin1 = new Date('Sun Mar 01 2017 00:00:00 GMT-0500 (EST)')
    let testMax1 = new Date('Sat May 27 2017 23:59:59 GMT-0400 (EDT)')
    let mountDatePicker1 = mount(<DatePicker label={label} date={start} min={testMin1} max={testMax1}/>)
    mountDatePicker1.setState({open: true})


    expect(mountDatePicker1.ref('yearSelect').prop('disabled')).toEqual(true)
    expect(mountDatePicker1.ref('yearSelect').prop('title')).toEqual('No other options available')

    mountDatePicker1.unmount()

    let testMin2 = new Date('Sun Mar 01 2014 00:00:00 GMT-0500 (EST)')
    let testMax2 = new Date('Sat May 27 2017 23:59:59 GMT-0400 (EDT)')
    let mountDatePicker2 = mount(<DatePicker label={label} date={start} min={testMin2} max={testMax2}/>)

    mountDatePicker2.setState({open: true})


    expect(mountDatePicker2.ref('yearSelect').prop('disabled')).toEqual(false)
    expect(mountDatePicker2.ref('yearSelect').prop('title')).toEqual('Select year')

  })

})

function getDateFromParts(year, month, day) {
    let date = dateWithDayGranularity(new Date())
    date.setFullYear(year)
    date.setMonth(month)
    date.setDate(day)

    return date
}

function getMonthFromDateAbbreviation(date, num) {
    let month = new Date(date)
    month.setMonth(month.getMonth() + num)
    return month.toDateString().split(' ')[1]
}
