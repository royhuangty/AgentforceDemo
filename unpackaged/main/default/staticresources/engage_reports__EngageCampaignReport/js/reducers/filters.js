import { combineReducers } from 'redux'
import ActionTypes from '../actions/report-action-types'
import {
    Pages,
    StatFields,
    DateRangePresets
} from '../report-constants'
import {
    getDatesForPastNDays
} from '../util'
import { loadStore, registerPersistence } from '../localstorage'

const defaultDateRange = 'PastMonth'
const {
    start: defaultStart,
    end: defaultEnd
} = getDatesForPastNDays(DateRangePresets[defaultDateRange].value)

const DefaultPageFilters = {
    startDate: defaultStart,
    endDate: defaultEnd,
    dateRange: defaultDateRange,
    draftType: 'All',
    clientType: 'All',
    sendId: null,
    templateId: null,
    selectedScope: loadStore('filters.page.selectedScope') || 'team',
    selectedStat: null,
    expandToAllTime: false
}

registerPersistence('filters.page.selectedScope');

const page = (state = DefaultPageFilters, action) => {
    switch(action.type) {
        case ActionTypes.SELECT_PAGE:
            return {
                ...state,
                ...getUpdatesForPageChange(state, action)
            }
        case ActionTypes.SELECT_EMAIL_DRAFT_TYPE:
            return {
                ...state,
                draftType: action.draftType
            }
        case ActionTypes.SELECT_CLIENT_TYPE:
            return {
                ...state,
                clientType: action.clientType
            }
        case ActionTypes.SELECT_SCOPE_TYPE:
            return {
                ...state,
                selectedScope: action.scopeType
            }
        case ActionTypes.SELECT_DATE_RANGE:
            return {
                ...state,
                startDate: action.start,
                endDate: action.end,
                dateRange: action.presetName
            }
        default:
            return state
    }
}

function getUpdatesForPageChange(state, action) {
    let templateId, sendId, selectedStat = null
    let additionalParams = { expandToAllTime: false }

    switch(action.page) {
        case Pages.Template:
            templateId = action.id
            break
        case Pages.Send:
            sendId = action.id
            additionalParams.expandToAllTime = true
            break
        case Pages.Recipients:
            selectedStat = action.selectedStat
            sendId = action.sendId
            templateId = action.templateId
            additionalParams = {
                ...additionalParams,
                ...action.additionalParams
            }
    }

    return {
        templateId,
        sendId,
        selectedStat,
        ...additionalParams
    }
}

function makeDefaultOverviewFilters() {
    return {
        senderId: null,
        fieldName: StatFields.UniqueClicks
    }
}

const overview = (state = makeDefaultOverviewFilters(), action) => {
    switch(action.type) {
        case ActionTypes.REQUEST_REPORT_INSTANCE:
        case ActionTypes.SELECT_EMAIL_DRAFT_TYPE:
        case ActionTypes.SELECT_CLIENT_TYPE:
        case ActionTypes.SELECT_SCOPE_TYPE:
        case ActionTypes.SELECT_DATE_RANGE:
        case ActionTypes.SELECT_PAGE:
        case ActionTypes.REPORT_RUN_LIMIT_EXCEEDED:
            return {
                ...state,
                senderId: null
            }
        case ActionTypes.SELECT_OVERVIEW_SENDER:
            return {
                ...state,
                senderId: action.senderId
            }
        case ActionTypes.SELECT_OVERVIEW_FIELD:
            return {
                ...state,
                fieldName: action.fieldName
            }
        default:
            return state
    }
}

const DefaultTemplatesFilters = {
    fieldName: StatFields.OpenRate
}
const templates = (state = DefaultTemplatesFilters, action) => {
    switch(action.type) {
        case ActionTypes.SELECT_TOP_TEMPLATES_SORT_FIELD:
            return {
                ...state,
                fieldName: action.fieldName
            }
        default:
            return state
    }
}

function makeDefaultTeamEmailsFilters() {
    return {
        senderId: null,
        expandedGroupings: []
    }
}

const teamEmails = (state = makeDefaultTeamEmailsFilters(), action) => {
    switch(action.type) {
        case ActionTypes.SELECT_EMAILS_TABLE_SENDER:
            return {
                ...state,
                senderId: action.senderId,
                expandedGroupings: []
            }
        case ActionTypes.REQUEST_REPORT_INSTANCE:
            return makeDefaultTeamEmailsFilters()
        case ActionTypes.EXPAND_EMAILS_TABLE_SENDER_GROUPING:
            return {
                ...state,
                expandedGroupings: state.expandedGroupings.concat(action.senderId)
            }
        case ActionTypes.COLLAPSE_EMAIL_TABLE_SENDER_GROUPING:
            return {
                ...state,
                expandedGroupings: state.expandedGroupings.filter(id => id !== action.senderId)
            }
        default:
            return state
    }
}

const filtersReducer = combineReducers({
    page,
    overview,
    templates,
    teamEmails
})

export default filtersReducer
