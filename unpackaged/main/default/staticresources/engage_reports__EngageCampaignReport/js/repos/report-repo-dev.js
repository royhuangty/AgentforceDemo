import { setTimeoutPromise } from '../../../../js/util'
import stubs from '../../../../js/stubs/engage-reports'
import {
    lowerCaseObjectKeys,
    mapObject
} from '../util'
import {
    RecipientDescriptions,
    ReportNames
} from '../report-constants'
import { TimeoutError } from '../errors'
import {
    randomTimePromise
} from './base-repo-dev'

const GET_REPORT_REQUEST_TIME = 500
const GET_REPORT_INSTANCE_REQUEST_TIME = 750
const CREATE_REPORT_INSTANCE_REQUEST_TIME = 1500
const GET_RECORD_DETAILS_REQUEST_TIME = 500
const STATS_FOR_SEND_TIME = 1000

export function getStatsForSendIds(sendIds, startDate, endDate) {
    return randomTimePromise(STATS_FOR_SEND_TIME).then(() => {
        return sendIds.map((sendId) => ({
            count: 2,
            sends: 1,
            opens: 2,
            clicks: 3,
            hardBounces: 0,
            softBounces: 0,
            unsubscribes: 0,
            sendId,
            recipientId: 'recipient123'
        }))
    })

}

export function getStatsForBatchesOfSends(sessionId, requestBatches, startDate, endDate) {
    let requestPromises = requestBatches.map(({ sendIds, recordType }) => {
        return getStatsForSends(sendIds, recordType)
            .then(({ aggregates, totalSize, queryLocatorId }) => {
                return {
                    aggregates,
                    totalSize,
                    queryLocatorId,
                    batchSize: 2000
                }
            })
    })

    return randomTimePromise(STATS_FOR_SEND_TIME).then(() => Promise.all(requestPromises))
}

export function createReportInstance(sessionId, criteria) {
    return randomTimePromise(CREATE_REPORT_INSTANCE_REQUEST_TIME).then(() => {
        // throw new TimeoutError('Took too dang long to run the report')
        return {
            id: 'reportInstance1234'
        }
    })
}

function getStatsForSends(sendIds, recordType) {
    return randomTimePromise(STATS_FOR_SEND_TIME).then(() => {
        return {
            totalSize: sendIds.length,
            queryLocatorId: null,
            aggregates: sendIds.map((sendId) => ({
                count: 2,
                sends: 1,
                opens: 2,
                clicks: 3,
                hardBounces: 0,
                softBounces: 0,
                unsubscribes: 0,
                sendId: sendId,
                recipientId: recordType + '123'
            }))
        }
    })
}

export function runReport() {
    return randomTimePromise(GET_REPORT_INSTANCE_REQUEST_TIME).then(() => ({
        ...stubs.reportInstances.Send.noFilters
    }))
}

export function getReport(reportName) {
    return randomTimePromise(GET_REPORT_REQUEST_TIME).then(() => {
        return Object.keys(stubs.reports)
            .filter(reportType => stubs.reports[reportType].devName === reportName)
            .map((reportType) => {
                return {
                    name: stubs.reports[reportType].name,
                    ...stubs.reports[reportType].describe
                }
            })
            [0]
    })
}

export function getRecipientDetails(recordType, ids) {
    let columns = RecipientDescriptions[recordType].Columns
    return getRecordDetails(null, recordType, ids, columns)
}

function getRecordDetails(sessionId, recordType, ids = [], columns = {}) {
    return randomTimePromise(GET_RECORD_DETAILS_REQUEST_TIME).then(() => {
        return ids.map((id) => {
            let recordDetails = mapObject(lowerCaseObjectKeys(columns), (value, key) => {
                return key === 'company' ? randomlyGeneratePardotUnknownCompanyToken() : `Some ${key}`
            })
            if (recordType === RecipientDescriptions.Contact.Type) {
                recordDetails.account = Math.random() > 0.5 ? null : {
                    name: recordDetails.company
                }

                delete recordDetails.company
            }

            return {
                id,
                attributes: {
                    type: recordType,
                    url: `/services/data/v39.0/sobjects/${recordType}/${id}`
                },
                ...recordDetails
            }
        })
    })
}

export function checkForPiPackage(sessionId) {
    return randomTimePromise(500).then(() => true)
}

function randomlyGeneratePardotUnknownCompanyToken() {
    return Math.random() > 0.8 ? '[[Unknown]]' : 'Some Company'
}

export default {
    createReportInstance,
    getReport
}
