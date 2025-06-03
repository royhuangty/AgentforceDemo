import React from 'react';
import { shallow } from 'enzyme'
import page from '../../reducers/filters.js'
import overview from '../../reducers/filters.js'
import filtersReducer from '../../reducers/filters.js'
import ActionTypes from '../../actions/report-action-types'
import {getDatesForPastNDays} from '../../util'
import {DateRangePresets, EmailDraftTypes, StatFields} from '../../report-constants'

describe('page reducer', () => {
  const defaultDateRange = 'PastMonth'
  const {
      start: defaultStart,
      end: defaultEnd
  } = getDatesForPastNDays(DateRangePresets[defaultDateRange].value)

  it('should return the initial state', () => {
    expect(page(undefined, {}).page).toEqual(
      {
        startDate: defaultStart,
        endDate: defaultEnd,
        dateRange: defaultDateRange,
        draftType: 'All',
        clientType: 'All',
        sendId: null,
        templateId: null,
        selectedScope: 'team',
        selectedStat: null,
        expandToAllTime: false
      })
  })
  it('should handle select email draft', () => {
      expect(
          page({}, {
              type: ActionTypes.SELECT_EMAIL_DRAFT_TYPE,
              draftType: 'Templated'
          }).page
      ).toEqual({
            startDate: defaultStart,
            endDate: defaultEnd,
            dateRange: defaultDateRange,
            draftType: 'Templated',
            clientType: 'All',
            sendId: null,
            templateId: null,
            selectedScope: 'team',
            selectedStat: null,
            expandToAllTime: false
      })
  })
})

describe('overview reducer', () => {
  const defaultDateRange = 'PastMonth'
  const {
      start: defaultStart,
      end: defaultEnd
  } = getDatesForPastNDays(DateRangePresets[defaultDateRange].value)
  

  it('should return the initial state', () => {
    expect(overview(undefined, {}).overview).toEqual(
      {
        senderId: null,
        fieldName: StatFields.UniqueClicks
      }
    )
  })
})
