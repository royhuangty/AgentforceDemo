import ActionTypes from '../actions/report-action-types'
import { ReportNames } from '../report-constants'
import { mapObject } from '../util'

const reportInstances = (state = makeDefaultReportInstances(), action) => {
    switch(action.type) {
        case ActionTypes.REQUEST_REPORT_INSTANCE:
        case ActionTypes.RESPONSE_REPORT_INSTANCE:
            return {
                ...state,
                [action.reportType]: reportInstance(state[action.reportType], action)
            }
        case ActionTypes.SELECT_EMAIL_DRAFT_TYPE:
        case ActionTypes.SELECT_CLIENT_TYPE:
        case ActionTypes.SELECT_SCOPE_TYPE:
        case ActionTypes.SELECT_DATE_RANGE:
        case ActionTypes.SELECT_PAGE:
        case ActionTypes.REPORT_RUN_LIMIT_EXCEEDED:
            return makeDefaultReportInstances()
        default:
            return state
    }
}

function makeDefaultReportInstances() {
    return mapObject(ReportNames, () => {
        return {
            loading: false
        }
    })
}

function reportInstance(state = {}, action) {
    switch(action.type) {
        case ActionTypes.REQUEST_REPORT_INSTANCE:
            return {
                ...state,
                loading: true,
                criteriaHash: action.criteriaHash
            }
        case ActionTypes.RESPONSE_REPORT_INSTANCE:
            if (state.criteriaHash !== action.criteriaHash) {
                return state
            }
            return {
                ...state,
                ...action.reportInstance,
                loading: false
            }
        default:
            return state
    }
}

export default reportInstances
