import ActionTypes from './report-action-types'
import {
    Pages
} from '../report-constants'
import * as repoFactory from '../repos/repo-factory'
import { resolvedPromise } from '../util'
import { FieldLevelSecurityError } from '../errors'

export function selectEmailsTableSender(senderId) {
    return {
        type: ActionTypes.SELECT_EMAILS_TABLE_SENDER,
        senderId
    }
}

export function selectOverviewSender(senderId) {
    return {
        type: ActionTypes.SELECT_OVERVIEW_SENDER,
        senderId
    }
}

export function selectOverviewField(fieldName) {
    return {
        type: ActionTypes.SELECT_OVERVIEW_FIELD,
        fieldName
    }
}

export function selectTopTemplatesSortField(fieldName) {
    return {
        type: ActionTypes.SELECT_TOP_TEMPLATES_SORT_FIELD,
        fieldName
    }
}

export function selectPage(page, id) {
    return {
        type: ActionTypes.SELECT_PAGE,
        page,
        id
    }
}

export function selectDraftType(draftType) {
    return {
        type: ActionTypes.SELECT_EMAIL_DRAFT_TYPE,
        draftType
    }
}

export function selectClientType(clientType) {
    return {
        type: ActionTypes.SELECT_CLIENT_TYPE,
        clientType
    }
}

export function selectScope(scopeType) {
    return {
        type: ActionTypes.SELECT_SCOPE_TYPE,
        scopeType
    }
}

export function selectDateRange(start, end, presetName) {
    return {
        type: ActionTypes.SELECT_DATE_RANGE,
        start,
        end,
        presetName
    }
}

export function selectEmailRecipientsPage(sendId, statType, additionalParams = {}) {
    return {
        type: ActionTypes.SELECT_PAGE,
        page: Pages.Recipients,
        selectedStat: statType,
        sendId,
        templateId: null,
        additionalParams
    }
}

export function selectTemplateRecipientsPage(templateId, statType, additionalParams = {}) {
    return {
        type: ActionTypes.SELECT_PAGE,
        page: Pages.Recipients,
        selectedStat: statType,
        sendId: null,
        templateId,
        additionalParams: {
            ...additionalParams,
            expandAllTime: false
        }
    }
}

export function fetchRecipientsDetails(recordType, ids) {
    return (dispatch, getState) => {
        let {
            recipients: recipientDetails,
            sessionId
        } = getState()

        // support recipients loading in batches
        let newIds = ids.filter(id => !recipientDetails.hasOwnProperty(id))

        if (newIds.length === 0) {
            return Promise.resolve()
        }

        dispatch(requestRecipientsDetails(newIds))


        return repoFactory.getReportRepo().getRecipientDetails(recordType, newIds)
            .then((records) => {
                return dispatch(responseRecipientsDetails(records, newIds, recordType))
            }).catch((error) => {
                if (error instanceof FieldLevelSecurityError) {
                    dispatch(recipientFieldLevelSecurityError(error))
                } else {
                    console.log(error)
                    throw error
                }
            })
    }
}

function recipientFieldLevelSecurityError(error) {
    return {
        type: ActionTypes.FIELD_LEVEL_SECURITY_ERROR,
        error
    }
}

function requestRecipientsDetails(ids) {
    return {
        type: ActionTypes.REQUEST_RECIPIENTS_DETAILS,
        ids
    }
}

function responseRecipientsDetails(records, ids, recordType) {
    return {
        type: ActionTypes.RESPONSE_RECIPIENTS_DETAILS,
        records,
        ids,
        recordType
    }
}

export function determineIfPiPackageInstalled() {
    return (dispatch, getState) => {
        let {
            sessionId,
            piPackageInstalled
        } = getState()

        if (piPackageInstalled !== null) {
            return resolvedPromise()
        }

        return repoFactory.getReportRepo().checkForPiPackage(sessionId).then((isInstalled) => {
            dispatch(
                responseCheckForPiPackage(isInstalled)
            )
        })
    }
}

function responseCheckForPiPackage(isInstalled) {
    return {
        type: ActionTypes.RESPONSE_CHECK_FOR_PI_PACKAGE,
        isInstalled
    }
}

export function expandEmailsTableSenderGrouping(senderId) {
    return {
        type: ActionTypes.EXPAND_EMAILS_TABLE_SENDER_GROUPING,
        senderId
    }
}

export function collapseEmailsTableSenderGrouping(senderId) {
    return {
        type: ActionTypes.COLLAPSE_EMAIL_TABLE_SENDER_GROUPING,
        senderId
    }
}
