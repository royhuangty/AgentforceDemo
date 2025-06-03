import React from 'react';
import { shallow, mount } from 'enzyme'
import DateRangeSelector from '../../components/date-range-selector.jsx'
import {
    getDatesForPastNDays,
    dateWithDayGranularity
} from '../../util'

describe('Date-Range-Selector', () => {
  let dateRangeSelector
  let {
    start,
    end
  } = getDatesForPastNDays(30)
  let dateRangeKey = "PastMonth"

  beforeEach(() => {
    dateRangeSelector = shallow(<DateRangeSelector dateRangeKey={dateRangeKey} startDate={start} endDate={end} max={end}/>)
  })


  /// BASIC RENDER TEST ////


    it('Has correct state on render', () => {

        expect(dateRangeSelector.state(['presetRangesOpen'])).toEqual(true)
        expect(dateRangeSelector.state(['datePickersOpen'])).toEqual(false)
        expect(dateRangeSelector.state(['startDate'])).toEqual(start)  
        expect(dateRangeSelector.state(['endDate'])).toEqual(end)
        expect(dateRangeSelector.state(['dateRangeKey'])).toEqual(dateRangeKey)
    })

    it('renders the correct selected filter on load/change', () => {

        let mountDateRangeSelector = mount(<DateRangeSelector dateRangeKey={dateRangeKey} startDate={start} endDate={end} max={end}/>)
  
        //verify past month is filter that is selected
        let selectedFilter = mountDateRangeSelector.find('.slds-is-selected')
        expect(selectedFilter.key()).toEqual("PastMonth")
        expect(selectedFilter.find('.slds-truncate').text()).toEqual('30 Days')
    })

    it('it toggles state when custom date range is selected', () => {
        let mountDateRangeSelector = mount(<DateRangeSelector dateRangeKey={dateRangeKey} startDate={start} endDate={end} max={end}/>)
        //simulate a change of filters
        let customLink = mountDateRangeSelector.find('.slds-dropdown__item').at(3)
        customLink.find('a').simulate('click')

        expect(mountDateRangeSelector.state(['presetRangesOpen'])).toEqual(false)
        expect(mountDateRangeSelector.state(['datePickersOpen'])).toEqual(true)

    })
})