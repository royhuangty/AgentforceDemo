import React from 'react';
import thunk from 'redux-thunk'
import configureMockStore from 'redux-mock-store'
import { shallow, mount } from 'enzyme'
import RecipientsList from '../../components/recipients-list.jsx'
import { EngageReleaseDate } from '../../report-constants'
import {
    getDatesForPastNDays,
    dateWithDayGranularity
} from '../../util'

describe('Recipient-List', () => {
    let recipientsList, store, onRecipientsSelect
    let {
        start,
        end
    } = getDatesForPastNDays(7)

    let middlewares = [thunk]
    let mockStore = configureMockStore(middlewares)

    let label = "Start Date"
        let leads = [
        {id: "00Q46000001COOKEA4", type: "Lead"},
        {id: "00Q46000001COONEA4", type: "Lead"}, 
    ]

    let contacts = [
        {id: "0034600000TBQVxAAP", type: "Contact"},
        {id: "0034600000TBQViAAP", type: "Contact"},
    ]

    let allRecipients = leads.concat(contacts);


    let leadDetails = {
        "00Q46000001COOKEA4": {
            company: "Dickenson plc",
            email: "a_young@dickenson.com",
            id: "00Q46000001COOKEA4",
            loading: false,
            name: "Andy Young",
            type: "Lead"
        },
        "00Q46000001COONEA4": {
            company: "Ace Iron and Steel Inc.",
            email: "carolync@aceis.com",
            id: "00Q46000001COONEA4",
            loading: false,
            name: "Carolyn Crenshaw",
            type: "Lead"
        }
    }

        let contactDetails = {
        "0034600000TBQVxAAP": {
            email: "ssnow@examplemarket.com",
            id: "0034600000TBQVxAAP",
            loading: false,
            name: "Sharon Snow",
            type: "Contact"
        },
        "0034600000TBQViAAP": {
            email: "abiggs@interactive.com",
            id: "0034600000TBQViAAP",
            loading: false,
            name: "Andrew Biggs",
            type: "Contact"
        }
    }

    let allRecipientDetails = {
        "00Q46000001COOKEA4": {
            company: "Dickenson plc",
            email: "a_young@dickenson.com",
            id: "00Q46000001COOKEA4",
            loading: false,
            name: "Andy Young",
            type: "Lead"
        },
        "00Q46000001COONEA4": {
            company: "Ace Iron and Steel Inc.",
            email: "carolync@aceis.com",
            id: "00Q46000001COONEA4",
            loading: false,
            name: "Carolyn Crenshaw",
            type: "Lead"
        },
        "0034600000TBQVxAAP": {
            email: "ssnow@examplemarket.com",
            id: "0034600000TBQVxAAP",
            loading: false,
            name: "Sharon Snow",
            type: "Contact"
        },
        "0034600000TBQViAAP": {
            email: "abiggs@interactive.com",
            id: "0034600000TBQViAAP",
            loading: false,
            name: "Andrew Biggs",
            type: "Contact"
        }
    }

  beforeEach(() => {
    store = mockStore({todos: [] })
    onRecipientsSelect = onRecipientsSelected.bind(this)
  })


  /// BASIC RENDER TEST ////


  it('Has correct state on render', () => {
    /*
    expectedYear = start.getFullYear()
    expectedMonth = start.getMonth()
    expectedDay = start.getDate()

    expect(datePicker.state(['year'])).toEqual(expectedYear)
    expect(datePicker.state(['month'])).toEqual(expectedMonth)
    expect(datePicker.state(['day'])).toEqual(expectedDay)    
    */
  })

  it('does not display checkboxes on load with both leads and contacts', () => {
    recipientsList = shallow(<RecipientsList recipients={allRecipients} recipientDetails={allRecipientDetails} dispatch={store.dispatch} onRecipientsSelected={onRecipientsSelect} selectedRecipientIds={[]} isPiPackageInstalled={true} />)

    expect(recipientsList.find('input[type="checkbox"]').length).toBe(0)
  })

    it('does display checkboxes on load with just contacts', () => {
    recipientsList = shallow(<RecipientsList recipients={contacts} recipientDetails={contactDetails} dispatch={store.dispatch} onRecipientsSelected={onRecipientsSelect} selectedRecipientIds={[]} isPiPackageInstalled={true} />)

    expect(recipientsList.find('input[type="checkbox"]').length).toBe(3)
  })

     it('does display checkboxes on load with just leads', () => {
    recipientsList = shallow(<RecipientsList recipients={leads} recipientDetails={leadDetails} dispatch={store.dispatch} onRecipientsSelected={onRecipientsSelect} selectedRecipientIds={[]} isPiPackageInstalled={true} />)

    expect(recipientsList.find('input[type="checkbox"]').length).toBe(3)
  })
})


function onRecipientsSelected(ids) {
        this.setState({
            selectedRecipientIds: ids
        })
    }
