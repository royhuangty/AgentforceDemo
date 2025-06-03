import { combineReducers } from 'redux'
import ActionTypes from '../actions/permissions-action-types'

const sessionId = (state = null) => {
    return state
}

const defaultUsersState = {
    batches: {},
    loading: false,
    totalSize: 0,
    batchSize: null
}

const users = (state = defaultUsersState, action) => {
    switch(action.type) {
        case ActionTypes.ASSIGNMENT_COMPLETE_CONFIRMED:
            return {
                ...defaultUsersState
            }
        case ActionTypes.REQUEST_ENGAGE_USERS:
            return {
                ...state,
                loading: true,
                batches: {
                    ...state.batches,
                    [action.page]: [],
                }
            }
        case ActionTypes.RESPONSE_ENGAGE_USERS:
            return {
                ...state,
                loading: false,
                batches: {
                    ...state.batches,
                    [action.page]: action.users
                },
                totalSize: action.totalSize,
                batchSize: action.batchSize
            }
        case ActionTypes.SELECT_HAS_REPORTS_PERM_SET:
            return {
                ...defaultUsersState
            }
        default:
            return state
    }
}

const defaultReportsPermSetAssignmentsState = {
    loading: false,
    assignment: {
        assigned: [],
        unassignable: []
    },
    unassignment: {
        unassigned: []
    },
    confirmed: false,
    error: null
}

const reportsPermSetAssignments = (state = defaultReportsPermSetAssignmentsState, action) => {
    switch(action.type) {
        case ActionTypes.ASSIGNMENT_COMPLETE_CONFIRMED:
            return {
                ...state,
                confirmed: true
            }
        case ActionTypes.SELECT_HAS_REPORTS_PERM_SET:
            return {
                ...defaultReportsPermSetAssignmentsState
            }
        case ActionTypes.START_ASSIGN_PERMISSION_SET_TO_ALL_USERS:
        case ActionTypes.START_UNASSIGN_PERMISSION_SET_FROM_ALL_USERS:
            return {
                ...defaultReportsPermSetAssignmentsState,
                loading: true
            }
        case ActionTypes.FINISH_ASSIGN_PERMISSION_SET_TO_ALL_USERS:
        case ActionTypes.FINISH_UNASSIGN_PERMISSION_SET_FROM_ALL_USERS:
            return {
                ...state,
                loading: false
            }
        case ActionTypes.FINISH_ASSIGN_PERMISSION_SET_TO_BATCH:
            return {
                ...state,
                assignment: {
                    ...state.assignment,
                    assigned: [
                        ...state.assignment.assigned,
                        ...action.assigned
                    ]
                }

            }
        case ActionTypes.BATCH_ASSIGNMENT_ERROR:
            return {
                ...state,
                assignment: {
                    ...state.assignment,
                    unassignable: [
                        ...state.assignment.unassignable,
                        ...action.unassignable
                    ]
                }
            }
        case ActionTypes.ALL_USERS_ASSIGNMENT_ERROR:
            return {
                ...state,
                loading: false,
                error: action.error
            }
        case ActionTypes.FINISH_UNASSIGN_PERMISSION_SET_FROM_BATCH:
            return {
                ...state,
                unassignment: {
                    unassigned: [
                        ...state.unassignment.unassigned,
                        ...action.unassigned
                    ]
                }
            }
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

const defaultFiltersState = {
    hasReportsPermSet: false,
    queryLocatorId: null,
    page: 1
}

const filters = (state = defaultFiltersState, action) => {
    switch(action.type) {
        case ActionTypes.ASSIGNMENT_COMPLETE_CONFIRMED:
            return {
                ...defaultFiltersState,
                hasReportsPermSet: state.hasReportsPermSet
            }
        case ActionTypes.SELECT_HAS_REPORTS_PERM_SET:
            return {
                ...state,
                hasReportsPermSet: action.hasReportsPermSet,
                queryLocatorId: null,
                page: 1
            }
        case ActionTypes.SELECT_PAGE:
            return {
                ...state,
                page: action.page
            }
        case ActionTypes.RESPONSE_ENGAGE_USERS:
            return {
                ...state,
                queryLocatorId: state.hasReportsPermSet === action.hasReportsPermSet ? action.queryLocatorId : state.queryLocatorId
            }
        default:
            return state
    }
}

const rootReducer = combineReducers({
    users,
    reportsPermSetAssignments,
    filters,
    sessionId
})

export default rootReducer
