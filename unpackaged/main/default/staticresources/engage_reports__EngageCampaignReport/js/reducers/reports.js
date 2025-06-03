import ActionTypes from '../actions/report-action-types'
import { ReportNames } from '../report-constants'
import { mapObject } from '../util'

const reports = (state = makeDefaultReports(), action) => {
    switch(action.type) {
        case ActionTypes.REQUEST_REPORT:
        case ActionTypes.RESPONSE_REPORT:
        case ActionTypes.REPORT_VIEW_INSUFFICIENT_PERMISSIONS_ERROR:
            return {
                ...state,
                [action.reportType]: report(state[action.reportType], action)
            }
        default:
            return state
    }
}

function makeDefaultReports() {
    return mapObject(ReportNames, (name, type) => {
        return {
            name,
            loading: false,
            error: false
        }
    })
}

function report(state = {}, action) {
    switch(action.type) {
        case ActionTypes.REQUEST_REPORT:
            return {
                ...state,
                loading: true
            }
        case ActionTypes.RESPONSE_REPORT:
            return {
                ...state,
                ...action.report,
                loading: false
            }
        case ActionTypes.REPORT_VIEW_INSUFFICIENT_PERMISSIONS_ERROR:
            return {
                ...state,
                loading: false,
                error: true
            }
        default:
            return state
    }
}

export default reports
