import { setTimeoutPromise } from '../../../../js/util'
import {
    arrayFromLength
} from '../util'
import {
    randomTimePromise
} from './base-repo-dev'
import {
    USERS_QUERY_BATCH_SIZE
} from '../permissions-constants'
import {
    PermsetAssignmentError
} from '../errors'

export function assignReportsPermissionSetToUsers(sessionId, userIds) {
    return doBatchRestForPermissionSetAssignment(userIds).then((response) => {
        // If this is the first request for the batch, and a 20% chance
        if (response.results.length === USERS_QUERY_BATCH_SIZE && Math.random() < 0.2) {
            let userErrors = arrayFromLength(Math.ceil(Math.random() * 2), (i) => ({
                userId: userIds[i],
                errors: [
                    {
                        statusCode: 'DUPLICATE_VALUE',
                        message: `Duplicate PermissionSetAssignment. Assignee: ${userIds[i]}; Permission Set: permset123`
                    },
                    {
                        statusCode: 'SOME_OTHER_RANDOM_ERROR',
                        message: "User has incorrect license"
                    }
                ].slice(0, Math.ceil(Math.random() * 2))
            }))

            throw new PermsetAssignmentError('Error assigning Engage Reports PermissionSet to users', userErrors)
        }

        if (Math.random() < .01) {
            throw 'Some random error'
        }

        return response
    })
}

export function unassignReportsPermissionSetFromUsers(sessionId, userIds) {
    return doBatchRestForPermissionSetAssignment(userIds).then((response) => {
        if (Math.random() < .01) {
            throw 'Some random error'
        }

        return response
    })
}

function doBatchRestForPermissionSetAssignment(userIds) {
    return randomTimePromise(3000).then(() => {
        return {
            hasErrors: false,
            results: userIds.map((userId) => {
                return {
                    referenceId: userId,
                    id: 'abc123'
                }
            })
        }
    })
}

export function getEngageUsersByReportsPermSetAssignment(sessionId, hasReportsPermSet = true, page = 1, queryLocatorId = null, batchSize = USERS_QUERY_BATCH_SIZE) {
    return randomTimePromise(1000).then(() => {
        return {
            records: makeUsers(batchSize, page),
            totalSize: batchSize * 10,
            hasReportsPermSet,
            page,
            queryLocatorId: 'q12345',
            batchSize
        }
    })
}

function makeUsers(batchSize, page) {
    return arrayFromLength(batchSize, (i) => {
        let suffix = (page - 1) * batchSize + i
        return {
            id: '123' + i + Math.ceil(Math.random() * 99999),
            name: 'Bob Martin ' + suffix,
            email: `bob.martin${suffix}@salesmoom.gov`,
            profile: {
                name: 'Sales'
            }
        }
    })
}
