import React from 'react';
import { shallow } from 'enzyme'
import {selectEmailsTableSender} from '../../actions/index.js'
import ActionTypes from '../../actions/report-action-types.js'
import {DateRangePresets, EmailDraftTypes, StatFields} from '../../report-constants'

describe('index actions', () => {

  it('should create an action to select emails table sender', () => {
      let id = 1
      let expectedAction = {
          type: ActionTypes.SELECT_EMAILS_TABLE_SENDER,
          senderId: id
      }
      expect(selectEmailsTableSender(id)).toEqual(expectedAction)
  })
})
