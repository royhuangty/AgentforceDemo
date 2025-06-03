import { combineReducers } from 'redux'
import reports from './reports'
import reportInstances from './report-instances'
import filters from './filters'
import ActionTypes from '../actions/report-action-types'
import { deepClone, mapObject } from '../util'
import { ReportNames } from '../report-constants'
import { loadStore, registerPersistence } from '../localstorage'
import {
    UserErrors
} from '../errors'

const constantReducer = (state = null, action) => state

const piPackageInstalled = (state = null, action) => {
    if (action.type === ActionTypes.RESPONSE_CHECK_FOR_PI_PACKAGE) {
        return action.isInstalled
    }

    return state
}

const recipients = (state = {}, action) => {
    switch(action.type) {
        case ActionTypes.REQUEST_RECIPIENTS_DETAILS:
            return {
                ...state,
                ...action.ids.reduce((acc, id) => {
                    acc[id] = {
                        loading: true
                    }
                    return acc
                }, {})
            }
        case ActionTypes.RESPONSE_RECIPIENTS_DETAILS:
            return {
                ...state,
                ...action.ids.reduce((acc, id) => {
                    return {
                        ...acc,
                        [id]: {
                            loading: false,
                            ...findRecord(action.records, id)
                        }
                    }
                }, {})
            }
        case ActionTypes.SELECT_PAGE:
            return {}
        case ActionTypes.FIELD_LEVEL_SECURITY_ERROR:
            return {
                ...state,
                loading: false,
                error: action.error
            }
        default:
            return state
    }
}

function findRecord(records, id) {
    return records.find(record => record.id === id) || {}
}

const reportInstanceBatches = (state = makeDefaultReportInstanceBatches(), action) => {
    switch(action.type) {
        case ActionTypes.FINISH_REPORT_INSTANCE_BATCHES:
        case ActionTypes.BEGIN_REPORT_INSTANCE_BATCHES:
        case ActionTypes.RESPONSE_GET_REPORT_INSTANCE_BATCHES:
            return {
                ...state,
                [action.reportType]: reportInstanceBatchType(state[action.reportType], action)
            }
        case ActionTypes.REQUEST_REPORT_INSTANCE:
            return {
                ...state,
                [action.reportType]: makeDefaultReportInstanceBatches()[action.reportType]
            }
        default:
            return state
    }
}

function reportInstanceBatchType(state, action) {
    switch (action.type) {
        case ActionTypes.BEGIN_REPORT_INSTANCE_BATCHES:
            return {
                ...state,
                batches: [],
                initialReportInstanceId: null,
                loading: true
            }
        case ActionTypes.FINISH_REPORT_INSTANCE_BATCHES:
            return {
                ...state,
                loading: false
            }
        case ActionTypes.RESPONSE_GET_REPORT_INSTANCE_BATCHES:
            return {
                ...state,
                initialReportInstanceId: action.initialReportInstanceId,
                batches: [
                    ...state.batches,
                    action.reportInstanceBatch
                ]
            }
        default:
            return state
    }
}

function makeDefaultReportInstanceBatches() {
    return mapObject(ReportNames, (name, type) => ({
        batches: [],
        initialReportInstanceId: null,
        loading: false
    }))
}

function makeDefaultSendStats() {
    return {
        loading: false,
        aggregates: [],
        initialReportCriteriaHash: null,
        // Object keyed by send batch criteria hash. True if the stat batch is still loading, false otherwise.
        sendStatBatchLoadingStatus: {}
    }
}

const sendStats = (state = makeDefaultSendStats(), action) => {
    switch (action.type) {
        case ActionTypes.REQUEST_REPORT_INSTANCE:
            return {
                ...makeDefaultSendStats(),
                loading: true
            }
        case ActionTypes.START_SEND_STATS:
            return {
                ...state,
                loading: true,
                aggregates: [],
                initialReportCriteriaHash: action.initialReportCriteriaHash
            }
        case ActionTypes.START_SEND_STAT_BATCH:
            if (state.initialReportCriteriaHash === action.initialReportCriteriaHash) {
                return {
                    ...state,
                    sendStatBatchLoadingStatus: {
                        ...state.sendStatBatchLoadingStatus,
                        [action.sendBatchCriteriaHash]: true
                    }
                }
            }
            return state
        case ActionTypes.END_SEND_STAT_BATCH:
            if (state.initialReportCriteriaHash === action.initialReportCriteriaHash) {
                return {
                    ...state,
                    sendStatBatchLoadingStatus: {
                        ...state.sendStatBatchLoadingStatus,
                        [action.sendBatchCriteriaHash]: false
                    }
                }
            }
            return state
        case ActionTypes.RESPONSE_SEND_STATS:
            if (state.initialReportCriteriaHash === action.initialReportCriteriaHash &&
                state.sendStatBatchLoadingStatus.hasOwnProperty(action.sendBatchCriteriaHash)) {
                return {
                    ...state,
                    aggregates: state.aggregates.concat(action.aggregates)
                }
            }
            return state
        case ActionTypes.FINISH_SEND_STATS:
            if (state.initialReportCriteriaHash === action.initialReportCriteriaHash) {
                return {
                    ...state,
                    loading: false,
                    initialReportCriteriaHash: null,
                    sendStatBatchLoadingStatus: {}
                }
            }
            return state
        case ActionTypes.FIELD_LEVEL_SECURITY_ERROR:
            return {
                ...state,
                loading: false,
                error: action.error
            }
        default:
            return state
    }
}

registerPersistence('alerts.backfillAlertShown')
const backfillAlertShown = loadStore('alerts.backfillAlertShown') || false
const defaultAlerts = {
    backfillAlertShown,
    canShowBackfillAlert: !backfillAlertShown
}

const alerts = (state = defaultAlerts, action) => {
    if (action.type === ActionTypes.SHOWN_BACKFILL_ALERT) {
        return {
            ...state,
            backfillAlertShown: true
        }
    }

    return state
}

const rootReducer = combineReducers({
    reports,
    reportInstances,
    reportInstanceBatches,
    filters,
    sessionId: constantReducer,
    userTimezoneOffsetInHours: constantReducer,
    easternTimezoneOffsetInHours: constantReducer,
    userId: constantReducer,
    userLocale: constantReducer,
    alerts,
    piPackageInstalled,
    recipients,
    sendStats
})

export default rootReducer
