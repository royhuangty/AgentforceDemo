import 'babel-polyfill'
import {
    setTimeoutPromise,
    objectToQuerystring
} from '../../../../js/util'
import {
    lowerCaseFirstLetter,
    findFirstKeyForValue,
    lowerCaseObjectKeys
} from '../util'
import {
    RecipientDescriptions,
    PardotPackageNamespace,
    EngageReportsPackageNamespace,
    SalesforceLimits
} from '../report-constants'
import {
    makeRestRequest,
    makeSoapRequest,
    doVisualforceRemoteAction,
    doQuery
} from './base-repo-prod'

import {
    TimeoutError,
    ReportRunError,
    ReportRunLimitExceededError,
    ApiErrors,
    InsufficientPermissionsError,
    ApexErrors,
    SoqlRowLimitError,
    ApexCPUTimeLimitError,
    FieldLevelSecurityError,
    UserErrors
} from '../errors'

const POLLING_WAIT_TIME_MILLISECONDS = 1000
const MAX_POLLING_RETRIES = 300

let RemoteActions = {}
export function setRemoteActions(remoteActions) {
    RemoteActions = remoteActions
}

export function getReport(reportName) {
    return doVisualforceRemoteAction(RemoteActions.getReport, [reportName])
        .catch((error) => {
            if (error === ApexErrors.NoSOQLRows) {
                // user doesn't have permission to view reports engage folder
                throw new InsufficientPermissionsError(error)
            }

            throw error
        })
}

export function runReport(reportId, reportMetadata) {
    validateRemoteAction('runReport')

    let metadata = { ...reportMetadata }
    let sortBy = metadata.sortBy

    // Apex Remote Actions can't deserialize Enums
    metadata = deleteMetadataEnums(metadata);


    return doVisualforceRemoteAction(RemoteActions.runReport, [reportId, metadata, sortBy])
        .then((instance) => {
            return getCompletedReportInstance(instance.id).then((completedInstance) => {
                if (!completedInstance.factMap['T!T'].rows) {
                    completedInstance.factMap['T!T'].rows = []
                }
                return {
                    ...instance,
                    ...completedInstance
                }
            })
        })
}

function getCompletedReportInstance(instanceId, remainingRetries = MAX_POLLING_RETRIES) {
    validateRemoteAction('getCompletedReportInstance')

    return doVisualforceRemoteAction(RemoteActions.getCompletedReportInstance, [instanceId])
        .then((instance) => {
            if (instance) {
                return instance
            } else if (remainingRetries < 1) {
                throw new TimeoutError(`Report instance, ${reportInstanceId}, took too long (${MAX_POLLING_RETRIES} tries) to run.`)
            }

            return setTimeoutPromise(POLLING_WAIT_TIME_MILLISECONDS)
                .then(() => {
                    return getCompletedReportInstance(instanceId, --remainingRetries)
                })
        })
}

function validateRemoteAction(actionName) {
    if (!RemoteActions[actionName]) {
        throw `Expected Remote Action, ${actionName}, to be set`
    }
}

export function getStatsForSendIds(sendIds, startDate, endDate) {
    let action = RemoteActions.getEngageStatsForSendIds
    if (!action) {
        throw 'Remote Action for getEngageStatsForSendIds not set'
    }

    let args = [sendIds, startDate.toUTCString(), endDate.toUTCString()]
    let options = { buffer: false, timeout: 30000 }

    return doVisualforceRemoteAction(action, args, options)
        .catch((error) => {
            if (error.indexOf(ApiErrors.Messages.SoqlRowLimit) > -1) {
                throw new SoqlRowLimitError(error)
            } else if (error.indexOf(ApiErrors.Messages.ApexCPUTimeLimit) > -1) {
                throw new ApexCPUTimeLimitError(error)
            } else if (error.indexOf(UserErrors.SendStatsInsufficientAccess) > -1) {
                throw new FieldLevelSecurityError(error)
            }
        })
}

export function getRecipientDetails(recordType, ids) {
    let action
    if (recordType === RecipientDescriptions.Lead.Type) {
        action = RemoteActions.getLeadDetails
    } else if (recordType === RecipientDescriptions.Contact.Type) {
        action = RemoteActions.getContactDetails
    }

    if (!action) {
        return Promise.reject('Remote Action for getRecipientDetails() is not set.')
    }

    return doVisualforceRemoteAction(action, [ids]).then((recipients) => {
        return recipients.map((recipient) => {
            return {
                ...lowerCaseObjectKeys(recipient),
                type: recordType
            }
        })
    }).catch((error) => {
        if (error.indexOf(UserErrors.SendStatsInsufficientAccess) > -1) {
            throw new FieldLevelSecurityError(error)
        }
        else {
            console.log(error)
            throw error
        }
    })
}

function describeReport(sessionId, reportId) {
    let path = `analytics/reports/${reportId}/describe`
    let method = 'GET'
    return makeRestRequest(sessionId, path, method)
}

export function createReportInstance(sessionId, criteria, remainingRetries = 5) {
    let {
        reportId,
        reportMetadata
    } = criteria

    let path = `analytics/reports/${reportId}/instances`
    let method = 'POST'
    let params = {
        reportMetadata
    }

    return makeRestRequest(sessionId, path, method, params)
        .catch((err) => {
            try {
                err = JSON.parse(err)
            } catch (e) {}
            if (err instanceof Array) {
                let error = err.find(error => error.errorCode === ApiErrors.ErrorCodes.Forbidden)
                if (error) {
                    if (error.message === ApiErrors.Messages.ReportRunLimitExceeded) {
                        throw new ReportRunLimitExceededError(error.message)
                    }
                }
                error = err.find(e => e.errorCode === ApiErrors.ErrorCodes.BadRequest)
                if (error) {
                    let invalidOperatorMessages = [ApiErrors.Messages.FilterOperatorGreaterOrEqualInvalid, ApiErrors.Messages.FilterOperatorEqualsInvalid]
                    // if it's an invalid operator error, try again
                    if (remainingRetries > 0 && invalidOperatorMessages.find(m => error.message.indexOf(m) > -1)) {
                        return setTimeoutPromise(1000).then(() => createReportInstance(sessionId, criteria, --remainingRetries))
                    }
                }
                throw new ReportRunError(err[0].message)
            }

            throw new ReportRunError(err)
        })
}


export function checkForPiPackage(sessionId) {
    let { getIsPardotPackageInstalled } = RemoteActions
    if (!getIsPardotPackageInstalled) {
        return Promise.reject('Remote Action "getIsPardotPackageInstalled" is not set.')
    }

    return doVisualforceRemoteAction(getIsPardotPackageInstalled)
}

function getNamespace(sessionId, metaType, metaObjectName, namespace) {
    let query = `SELECT NamespacePrefix FROM ${metaType} WHERE Name = '${metaObjectName}' AND NamespacePrefix = '${namespace}' LIMIT 1`
    let path = `query?q=${encodeURIComponent(query)}`
    let method = 'GET'

    return makeRestRequest(sessionId, path, method)
        .then((response) => {
            if (!response.records || response.records.length < 1) {
                return ''
            }

            return response.records[0].NamespacePrefix
        })
}

function deleteMetadataEnums(metadata) {
    //reportFormat is not necessary in request
    delete metadata.reportFormat;
    // sortBy uses an enum for sortColumn
    delete metadata.sortBy;

    // reportFilterFieldValue is only in metadata in certain batches but isn't necessary
    metadata.reportFilters.forEach(reportFilter => {
        delete reportFilter.filterType;
    });

    return metadata;
}
