import {
    makeRestRequest,
    doQuery,
    doVisualforceRemoteAction,
    doCompositeRequest
} from './base-repo-prod'

import {
    lowerCaseObjectKeys
} from '../util'
import {
    objectToQuerystring
} from '../../../../js/util'
import {
    USERS_QUERY_BATCH_SIZE,
    ENGAGE_PERMISSIONSET_NAME,
    ENGAGE_REPORTS_PERMISSIONSET_NAME
} from '../permissions-constants'
import {
    NoRemoteRecordsFoundError,
    UnexpectedSOQLResponseError,
    PermsetAssignmentError
} from '../errors'

let RemoteActions = {}
export function setRemoteActions(remoteActions) {
    RemoteActions = remoteActions
}

export function assignReportsPermissionSetToUsers(sessionId, userIds) {
    return getEngageReportsPermissionSetId(sessionId).then((permSetId) => {
        let path = 'composite/tree/PermissionSetAssignment/'
        let body = {
            records: userIds.map(userId => ({
                AssigneeId: userId,
                PermissionSetId: permSetId,
                attributes: {
                    type: 'PermissionSetAssignment',
                    referenceId: userId
                }
            }))
        }

        return makeRestRequest(sessionId, path, 'POST', body)
            .catch((responseJson) => {
                let response = tryParseCompositeRequestErrors(responseJson)

                let userErrors = response.results.map(r => ({
                    userId: r.referenceId,
                    errors: r.errors.map(e => ({
                        statusCode: e.statusCode,
                        message: e.message
                    }))
                }))

                // throw specific error so that a .catch() up the chain can handle it better
                throw new PermsetAssignmentError('Error assigning Engage Reports PermissionSet to users', userErrors)
            })
    })
}

function tryParseCompositeRequestErrors(responseJson) {
    let response
    try {
        // Errors from composite requests will throw the response json as a string
        response = JSON.parse(responseJson)
    } catch (e) {
        // some unexpected error. it'll get thrown again
    } finally {
        if (!response.hasErrors) {
            // not a composite request error, throw in its original unparsed form
            throw responseJson
        }
    }
    return response
}

export function unassignReportsPermissionSetFromUsers(sessionId, userIds) {
    return getEngageReportsPermissionSetId(sessionId).then((permissionSetId) => {
        // batch deletes not available over REST
        return doVisualforceRemoteAction(RemoteActions.unassignReportsPermissionSetFromUsers, [permissionSetId, userIds], { timeout: 120000 })
    })
}

/**
 * Gets paginated batches of users by assignment of the reports perm set
 * @param {String} sessionId
 * @param {Boolean} hasReportsPermSet - flag for selecting users
 * @param {Number} page - 1-based index of batches
 * @param {String} queryLocatorId - id of saved query results,
 * @param {Number} batchSize - size of batch between 200-2000
 * @return {Promise} Resolves a batch of users
 */
export function getEngageUsersByReportsPermSetAssignment(sessionId, hasReportsPermSet = true, page = 1, queryLocatorId = null, batchSize = USERS_QUERY_BATCH_SIZE) {
    return setupOptionsForGetEngageUsersByReportsPermSetAssignment(sessionId, hasReportsPermSet, page, queryLocatorId, batchSize)
        .then((options) => {
            return doQuery(sessionId, options)
        })
        .then((response) => {
            if (!response.records) {
                throw new UnexpectedSOQLResponseError(`getEngageUsers() expected to have records array in response`, response)
            }

            if (response.nextRecordsUrl) {
                queryLocatorId = response.nextRecordsUrl.match(/\/query\/(\w{18})-\d+/)[1]
            }

            return {
                records: response.records.map(lowerCaseObjectKeys),
                totalSize: response.totalSize,
                hasReportsPermSet,
                page,
                queryLocatorId,
                batchSize
            }
        })
}

function setupOptionsForGetEngageUsersByReportsPermSetAssignment(sessionId, hasReportsPermSet, page, queryLocatorId, batchSize) {
    let options = {
        batchSize
    }

    // Check if initial query has already been made
    if (queryLocatorId) {
        options.queryLocator = queryLocatorId
        if (page > 1) {
            options.queryLocator += `-${(page - 1) * batchSize}`
        }

        // Don't need to do async work to setup options
        return Promise.resolve(options)
    }

    // Initial query needs to be made
    // First, get permission set ids
    return getPermissionSetIds(sessionId).then((permsets) => {
        // Build assignment sub queries for each perm set
        let [engagePermsetAssignmentQuery, reportsPermsetAssignmentQuery] = [ENGAGE_PERMISSIONSET_NAME, ENGAGE_REPORTS_PERMISSIONSET_NAME].map((permSetName) => {
            return `SELECT AssigneeId from PermissionSetAssignment where PermissionSetId = '${permsets[permSetName]}'`
        })

        // Setup users query with subqueries for both performance and to stay within soql length limits.
        let query = `SELECT Id, Name, Email, Profile.Name from User WHERE IsActive = true AND Id IN (${engagePermsetAssignmentQuery})`
        if (hasReportsPermSet) {
            query += ` AND Id IN (${reportsPermsetAssignmentQuery})`
        } else {
            query += ` AND Id NOT IN (${reportsPermsetAssignmentQuery})`
        }

        options.query = query
        return options
    })
}

function getEngagePermissionSetId(sessionId) {
    return getPermissionSetIds(sessionId).then((permsets) => {
        return permsets[ENGAGE_PERMISSIONSET_NAME]
    })
}

function getEngageReportsPermissionSetId(sessionId) {
    return getPermissionSetIds(sessionId).then((permsets) => {
        return permsets[ENGAGE_REPORTS_PERMISSIONSET_NAME]
    })
}

/**
 * Returns a promise to get the permission set ids for ENGAGE_PERMISSIONSET_NAME
 * and ENGAGE_REPORTS_PERMISSIONSET_NAME. The promise is cached in a closure so
 * that no new requests need to be made after the permission sets have been
 * fetched.
 * @param {String} sessionId
 * @return {Promise} Resolves an object containing permset ids, keyed on name
 */
const getPermissionSetIds = (() => {
    let GetPermissionSetIdsPromise = null

    return (sessionId) => {
        if (GetPermissionSetIdsPromise) {
            return GetPermissionSetIdsPromise
        }

        // setup each request
        let requests = [ENGAGE_PERMISSIONSET_NAME, ENGAGE_REPORTS_PERMISSIONSET_NAME]
            .map(permsetName => ({
                method: 'GET',
                path: 'query/' + objectToQuerystring({ q: `SELECT Id FROM PermissionSet WHERE Name = '${permsetName}' LIMIT 1` }),
                headers: {},
                referenceId: permsetName
            }))

        // run requests in a batch using a composite request
        return GetPermissionSetIdsPromise = doCompositeRequest(sessionId, requests)
            // then reduce responses into a single object containing ids, keyed on name
            .then(responses => responses.reduce((acc, response) => ({
                ...acc,
                [response.referenceId]: response.body.records[0].Id
            }), {}))
    }
}) ()
// ^ call closure function
