import ActionTypes from './permissions-action-types'
import * as repoFactory from '../repos/repo-factory'
import {
    arrayFromLength,
    mapObject
} from '../util'
import {
    PermsetAssignmentError,
    FieldLevelSecurityError
} from '../errors'

export function fetchEngageUsers(page = null, hasReportsPermSet = null) {
    return (dispatch, getState) => {
        let {
            sessionId,
            filters,
            users
        } = getState()

        if (page === null) {
            page = filters.page
        }

        if (hasReportsPermSet === null) {
            hasReportsPermSet = filters.hasReportsPermSet
        }

        if (users.batches[page]) {
            return Promise.resolve()
        }

        dispatch(
            requestEngageUsers(page)
        )

        return repoFactory.getPermissionsRepo().getEngageUsersByReportsPermSetAssignment(sessionId, hasReportsPermSet, page, filters.queryLocatorId).then((response) => {
            return dispatch(
                responseEngageUsers(page, response)
            )
        })
    }
}

export function unassignReportsPermissionSetFromAllEngageUsers() {
    return (dispatch, getState) => {
        dispatch(
            startUnassignPermissionSetFromAllUsers()
        )

        return forAllUserBatches(dispatch, getState, true, (page) => {
            return dispatch(
                tryToUnassignReportsPermissionSetFromUserBatch(page)
            )
        }).then(() => {
            return dispatch(
                finishUnassignPermissionSetFromAllUsers()
            )
        }).catch((error) => {
            return dispatch(
                allUsersAssignmentError(error)
            )
        })
    }
}

export function assignReportsPermissionSetToAllEngageUsers() {
    return (dispatch, getState) => {
        dispatch(
            startAssignPermissionSetToAllUsers()
        )

        return forAllUserBatches(dispatch, getState, false, (page) => {
            return dispatch(
                tryToAssignReportsPermissionSetToUserBatch(page)
            )
        }).then(() => {
            return dispatch(
                finishAssignPermissionSetToAllUsers()
            )
        }).catch((error) => {
            return dispatch(
                allUsersAssignmentError(error)
            )
        })
    }
}

function allUsersAssignmentError(error) {
    return {
        type: ActionTypes.ALL_USERS_ASSIGNMENT_ERROR,
        error
    }
}

function forAllUserBatches(dispatch, getState, hasReportsPermSet, callback) {
    let { users } = getState()
    let totalBatches = Math.ceil(users.totalSize / users.batchSize)

    return Promise.all(arrayFromLength(totalBatches, (i) => {
        let page = i + 1
        return dispatch(
            fetchEngageUsers(page, hasReportsPermSet)
        ).then(() => {
            return callback(page)
        })
    }))
}

export function tryToAssignReportsPermissionSetToUserBatch(page) {
    return (dispatch, getState) => {
        let {
            sessionId,
            users
        } = getState()

        let userIds = users.batches[page].map(u => u.id)

        dispatch(
            startAssignPermissionSetToBatch(page)
        )

        return repoFactory.getPermissionsRepo().assignReportsPermissionSetToUsers(sessionId, userIds)
            .catch((error) => {
                if ( !(error instanceof PermsetAssignmentError) ) {
                    console.log(error)
                    throw error
                }

                console.log(error)
                dispatch(
                    batchAssignmentError(error)
                )

                let erredUserIds = error.results.map(r => r.userId)
                let filteredUserIds = userIds.filter(id => !erredUserIds.includes(id))

                return reportFactory.getReportRepo().assignReportsPermissionSetToUsers(sessionId, filteredUserIds)
            })
            .then((response) => {
                return dispatch(
                    finishAssignPermissionSetToBatch(response.results, page)
                )
            })
    }
}

function batchAssignmentError(error) {
    return {
        type: ActionTypes.BATCH_ASSIGNMENT_ERROR,
        unassignable: error.results
    }
}

function fieldLevelSecurityError(error) {
    return {
        type: ActionTypes.FIELD_LEVEL_SECURITY_ERROR,
        error
    }
}

export function tryToUnassignReportsPermissionSetFromUserBatch(page) {
    return (dispatch, getState) => {
        let {
            sessionId,
            users
        } = getState()
        let userIds = users.batches[page].map(u => u.id)

        return repoFactory.getPermissionsRepo().unassignReportsPermissionSetFromUsers(sessionId, userIds)
            .then(() => {
                return dispatch (
                    finishUnassignPermissionSetFromBatch(userIds, page)
                )
            }).catch((error) => {
                if (error instanceof FieldLevelSecurityError) {
                    return dispatch(fieldLevelSecurityError(error))
                }
                console.log(error)
                throw error
            })
    }
}

export function assignmentCompleteConfirmed() {
    return {
        type: ActionTypes.ASSIGNMENT_COMPLETE_CONFIRMED
    }
}

export function startAssignPermissionSetToAllUsers() {
    return {
        type: ActionTypes.START_ASSIGN_PERMISSION_SET_TO_ALL_USERS
    }
}

export function finishAssignPermissionSetToAllUsers() {
    return {
        type: ActionTypes.FINISH_ASSIGN_PERMISSION_SET_TO_ALL_USERS
    }
}

function startAssignPermissionSetToBatch(page) {
    return {
        type: ActionTypes.START_ASSIGN_PERMISSION_SET_TO_BATCH,
        page
    }
}

function finishAssignPermissionSetToBatch(results, page) {
    return {
        type: ActionTypes.FINISH_ASSIGN_PERMISSION_SET_TO_BATCH,
        assigned: results.map(r => r.referenceId),
        page
    }
}

function startUnassignPermissionSetFromAllUsers() {
    return {
        type: ActionTypes.START_UNASSIGN_PERMISSION_SET_FROM_ALL_USERS
    }
}

function finishUnassignPermissionSetFromAllUsers() {
    return {
        type: ActionTypes.FINISH_UNASSIGN_PERMISSION_SET_FROM_ALL_USERS
    }
}

function finishUnassignPermissionSetFromBatch(userIds, page) {
    return {
        type: ActionTypes.FINISH_UNASSIGN_PERMISSION_SET_FROM_BATCH,
        unassigned: userIds,
        page
    }
}

export function selectPage(page) {
    return {
        type: ActionTypes.SELECT_PAGE,
        page
    }
}

export function selectHasReportsPermSet(hasReportsPermSet) {
    return {
        type: ActionTypes.SELECT_HAS_REPORTS_PERM_SET,
        hasReportsPermSet
    }
}

function requestEngageUsers(page) {
    return {
        type: ActionTypes.REQUEST_ENGAGE_USERS,
        page
    }
}

function responseEngageUsers(page, response) {
    return {
        type: ActionTypes.RESPONSE_ENGAGE_USERS,
        users: response.records,
        queryLocatorId: response.queryLocatorId,
        hasReportsPermSet: response.hasReportsPermSet,
        totalSize: response.totalSize,
        batchSize: response.batchSize,
        page
    }
}
