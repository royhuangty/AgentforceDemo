import React from 'react';
import { shallow } from 'enzyme'
import NoData from '../../components/no-data.jsx'

describe('No Data', () => {
    let noData
    let message = "This report has no results. Adjust settings and filters if you need to."

    beforeEach(() => {
        noData = shallow(<NoData message={message}/>)
    })
    
    it('Has an alert title of No data alert', () => {
        expect(noData.find('.slds-assistive-text').text()).toEqual('No data alert')
    })

    it('Has correct body text', () => {
        expect(noData.find('.slds-text-body--regular').text()).toEqual(message)
    })

    it('Has a warning symbol icon', () => {
        expect(noData.find('Svg').prop('symbol')).toEqual('warning')
    })
})
