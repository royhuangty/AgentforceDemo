import ActionTypes from './report-action-types'
import {
    getReportNameFromType,
    deepClone,
    formatISO,
    nonSecureHash,
    prefixWithNamespace,
    getTimezoneAdjustedDate,
    getDateFilterFormat,
    splitIntoBatchesByMaxBatchSize
} from '../util'
import {
    getReport,
    getStatsForSendIds,
    runReport
} from '../repos/report-repo-<!-- @api -->'
import {
    ReportTypes,
    ScopeFilterableReportTypes,
    ClientTypes,
    EmailDraftTypes,
    Fields,
    EngageReleaseDate,
    GoogleAnalytics,
    EngageReportsPackageNamespace,
    RecipientDescriptions,
    SalesforceLimits
} from '../report-constants'
import {
    trackUserTiming,
    sendEvent
} from '../../../../js/google-analytics'
import {
    TimeoutError,
    ReportRunLimitExceededError,
    ReportRunError,
    InsufficientPermissionsError,
    SoqlRowLimitError,
    ApexCPUTimeLimitError,
    FieldLevelSecurityError
} from '../errors'
import {
    mapSendInstanceToSends,
    mapReportInstanceRowToRawStat,
    SendReportColumns
} from '../report-data-aggregation'
import { createAsyncCache } from '../cache'

const ONE_MINUTE_IN_MILLISECONDS = 1000 * 60
const reportInstanceCacheFetch = createAsyncCache(15 * ONE_MINUTE_IN_MILLISECONDS)

function requestReport(reportType) {
    return {
        type: ActionTypes.REQUEST_REPORT,
        reportType
    }
}

function receiveReport(reportType, report) {
    return {
        type: ActionTypes.RESPONSE_REPORT,
        reportType,
        report
    }
}

function requestReportInstance(reportType, criteriaHash) {
    return {
        type: ActionTypes.REQUEST_REPORT_INSTANCE,
        reportType,
        criteriaHash
    }
}

function receiveReportInstance(reportInstance, reportType, criteriaHash) {
    return {
        type: ActionTypes.RESPONSE_REPORT_INSTANCE,
        reportType,
        reportInstance,
        criteriaHash
    }
}

export function fetchStatsForSends(initialReportInstance, sendBatch) {
    return (dispatch, getState) => {
        let {
            startDate,
            endDate,
            sendIds,
            sendReportInstanceHash
        } = calculateSendReportInstanceHash(sendBatch)

        let { sendReportInstanceHash: initialInstanceHash } = calculateSendReportInstanceHash(initialReportInstance)
        dispatch(
            startSendStatBatch(initialInstanceHash, sendReportInstanceHash)
        )

        // split sendIds into batches: [1,2,3,4,5,6,7,8,9,10 -> [[1,2,3], [4,5,6], [7,8,9], [10]]
        let sendIdBatches = getBatchesOfSendIdsForStatQuery(sendIds)

        let maxConcurrentRequests = SalesforceLimits.MaxConcurrentVisualforceRemotingRequests
        let concurrentBatches = []
        for (let i = 0; i < maxConcurrentRequests && sendIdBatches.length > 0; i++) {
            let batch = sendIdBatches.shift()
            concurrentBatches.push(batch)
        }

        /**
         * Defined in scope because it modifies sendIdBatches. When the current batch
         * is returned and dispatched, another batch will be removed from sendIdBatches
         * and run.
         * @param batch {Array} - array of sendIds
        */
        const runBatch = (batch) => {
            return getStatsForSendIds(batch, startDate, endDate)
                .then((aggregates) => {
                    let { sendReportInstanceHash: initialInstanceHash } = calculateSendReportInstanceHash(initialReportInstance)
                    // exit if search changed
                    if (getState().sendStats.initialReportCriteriaHash !== initialInstanceHash) {
                        return
                    }

                    // update ui
                    dispatch(
                        responseSendStats(initialInstanceHash, sendReportInstanceHash, aggregates)
                    )

                    // run next batch
                    let nextBatch = sendIdBatches.shift()
                    if (nextBatch) {
                        return runBatch(nextBatch)
                    }
                })
                .catch((error) => {
                    if (error instanceof SoqlRowLimitError || error instanceof ApexCPUTimeLimitError) {
                        // Too many records

                        // Check if there is room to run more batches in parallel
                        let remainingConcurrencies = maxConcurrentRequests - concurrentBatches.length
                        // Divide batch by max of either remaining concurrencies or 4
                        let numNewBatches = Math.max(remainingConcurrencies, 4)

                        // split into more batches
                        let batches = splitIntoBatchesByMaxBatchSize(batch, batch.length / numNewBatches)

                        let newConcurrentBatches = batches.slice(0, Math.max(remainingConcurrencies, 1))
                        let remainingBatches = batches.slice(newConcurrentBatches.length, batches.length)

                        // move remaining batches to end of queue
                        remainingBatches.forEach(b => sendIdBatches.push(b))

                        return Promise.all(newConcurrentBatches.map(runBatch))
                    } else {
                        throw error
                    }
                })
        }

        // Concurrent promises will be run. When each finishes, it will chain the next batch's promise.
        // This ensures the max concurrent requests are always running when there are lots of batches.
        return Promise.all(concurrentBatches.map(runBatch))
            .then(() => {
                let { sendReportInstanceHash: initialInstanceHash } = calculateSendReportInstanceHash(initialReportInstance)

                // Mark this batch as done
                dispatch(
                    endSendStatBatch(initialInstanceHash, sendReportInstanceHash)
                )

                if (checkAllLoadingComplete(getState(), ReportTypes.Send)) {
                    // Mark send stat fetching as totally complete
                    dispatch(
                        finishSendStats(initialInstanceHash)
                    )
                }
            }).catch((error) => {
                if (error instanceof FieldLevelSecurityError) {
                    dispatch(fieldLevelSecurityError(error))
                }
            })
    }
}

function fieldLevelSecurityError(error) {
    return {
        type: ActionTypes.FIELD_LEVEL_SECURITY_ERROR,
        error
    }
}

function checkAllLoadingComplete(state, reportType) {
    let {
        reportInstanceBatches,
        sendStats: {
            sendStatBatchLoadingStatus
        },
        reportInstances: {
            [reportType]: initialReportInstance
        }
    } = state

    // Check if all send batches and their corresponding send stat batches are complete
    return allInstanceRecordsReceived(initialReportInstance, reportInstanceBatches, ReportTypes.Send) &&
        checkAllStatBatchesComplete(sendStatBatchLoadingStatus);
}

function calculateSendReportInstanceHash(reportInstance) {
    let {
        startDate,
        endDate
    } = getDatesFromReportInstanceFilters(reportInstance)

    let sendIds = reportInstance.factMap['T!T'].rows.map(r => r.dataCells[0].value)
    let sendReportInstanceHash = nonSecureHash(JSON.stringify({ sendIds, startDate, endDate }))
    return {
        sendIds,
        sendReportInstanceHash,
        startDate,
        endDate
    }
}

function checkAllStatBatchesComplete(sendStatBatchLoadingStatus) {
    // I wanted to do .values().every() but values() doesn't seem to be supported yet
    let keys = Object.keys(sendStatBatchLoadingStatus);
    for (let i = 0; i < keys.length; i++) {
        if (sendStatBatchLoadingStatus[keys[i]]) {
            return false;
        }
    }
    return true;
}

function getBatchesOfSendIdsForStatQuery(sendIds) {
    let maxNumSendIds = SalesforceLimits.MaxSendsToQueryStatsFor
    const minConcurrentBatches = SalesforceLimits.MinConcurrentVisualforceRemotingRequestsForStats
    // ensure at least 4 concurrent requests
    if (Math.ceil(sendIds.length / SalesforceLimits.MaxSendsToQueryStatsFor) < minConcurrentBatches ) {
        maxNumSendIds = Math.ceil(sendIds.length / minConcurrentBatches )
    }
    return splitIntoBatchesByMaxBatchSize(sendIds, maxNumSendIds)
}

function getDatesFromReportInstanceFilters(reportInstance) {
    let startDate
    let endDate
    reportInstance.reportMetadata.reportFilters.forEach((filter) => {
        if (filter.column.indexOf('Sent_At__c') > -1) {
            if (filter.operator === 'greaterOrEqual') {
                startDate = new Date(filter.value)
            } else if (filter.operator === 'lessOrEqual') {
                endDate = new Date(filter.value)
            }
        }
    })

    return {
        startDate,
        endDate
    }
}

function startSendStats(initialReportCriteriaHash) {
    return {
        type: ActionTypes.START_SEND_STATS,
        initialReportCriteriaHash
    }
}

function startSendStatBatch(initialReportCriteriaHash, sendBatchCriteriaHash) {
    return {
        type: ActionTypes.START_SEND_STAT_BATCH,
        initialReportCriteriaHash,
        sendBatchCriteriaHash
    }
}

function responseSendStats(initialReportCriteriaHash, sendBatchCriteriaHash, aggregates) {
    return {
        type: ActionTypes.RESPONSE_SEND_STATS,
        aggregates,
        initialReportCriteriaHash,
        sendBatchCriteriaHash
    }
}

function endSendStatBatch(initialReportCriteriaHash, sendBatchCriteriaHash) {
    return {
        type: ActionTypes.END_SEND_STAT_BATCH,
        initialReportCriteriaHash,
        sendBatchCriteriaHash
    }
}

function finishSendStats(initialReportCriteriaHash) {
    return {
        type: ActionTypes.FINISH_SEND_STATS,
        initialReportCriteriaHash
    }
}

export function fetchReport(reportType) {
    return (dispatch) => {
        dispatch(requestReport(reportType))
        let reportName = getReportNameFromType(reportType)

        return getReport(reportName)
            .then((report) => {
                dispatch(receiveReport(reportType, report))
            })
            .catch((error) => {
                if (error instanceof InsufficientPermissionsError) {
                    dispatch(insufficientPermissionsToViewReport(reportType))
                }

                throw error
            })
    }
}

function insufficientPermissionsToViewReport(reportType) {
    return {
        type: ActionTypes.REPORT_VIEW_INSUFFICIENT_PERMISSIONS_ERROR,
        reportType
    }
}

function shouldFetchReport(report) {
    return !report.reportMetadata && !report.loading
}

export function fetchReportIfNeeded(reportType) {
    return (dispatch, getState) => {
        let state = getState()
        if (shouldFetchReport(state.reports[reportType])) {
            return dispatch(
                fetchReport(reportType)
            )
        }

        return Promise.resolve()
    }
}

export function fetchReportInstance(reportType) {
    return (dispatch, getState) => {
        let state = getState()
        let criteria = generateReportInstanceRunCriteria(state, reportType)
        let criteriaHash = nonSecureHash(JSON.stringify(criteria))

        dispatch(
            requestReportInstance(reportType, criteriaHash)
        )

        return reportInstanceCacheFetch(criteriaHash, () => {
            return timedCreateReportInstance(state.sessionId, criteria, reportType)
        }).then((reportInstance) => {
            // If this is a send report, kick off stat fetch for it
            if (reportType === ReportTypes.Send) {
                let { sendReportInstanceHash } = calculateSendReportInstanceHash(reportInstance)
                dispatch(
                    startSendStats(sendReportInstanceHash)
                )
                dispatch(
                    fetchStatsForSends(reportInstance, reportInstance)
                ).catch((error) => {
                    dispatch(fieldLevelSecurityError(error))
                })
            }
            return dispatch(
                receiveReportInstance(reportInstance, reportType, criteriaHash)
            )
        }).catch((err) => {
            trackReportInstanceCreateError(err, reportType, dispatch)
            throw err
        })
    }
}

function trackReportInstanceCreateError(err, reportType, dispatch) {
    if (err instanceof TimeoutError) {
        trackReportInstanceTiming(startTime, reportType)
        sendEvent(GoogleAnalytics.Events.Category, GoogleAnalytics.Events.ReportInstanceTimeouts[reportType])
    } else if (err instanceof ReportRunLimitExceededError) {
        sendEvent(GoogleAnalytics.Events.Category, GoogleAnalytics.Events.ReportRunLimit)
    } else if (err instanceof ReportRunError) {
        sendEvent(GoogleAnalytics.Events.Category, GoogleAnalytics.Events.ReportRunError)
    } else {
        sendEvent(GoogleAnalytics.Events.Category, GoogleAnalytics.Events.UnknownError)
    }
}

export function fetchRemainingBatchesIfNeeded(reportType) {
    return (dispatch, getState) => {
        let instance = getState().reportInstances[reportType]

        if (instance.allData) {
            return Promise.resolve()
        } else {
            // We need to page through the report fetch
            dispatch(
                beginAllReportInstanceBatches(reportType, instance.id)
            )

            return dispatch(
                fetchRemainingReportInstanceBatches(reportType)
            )
        }
    }
}

function timedCreateReportInstance(sessionId, criteria, reportType, criteriaHash) {
    let startTime = new Date()
    let {
        reportId,
        reportMetadata
    } = criteria

    return runReport(reportId, reportMetadata)
        .then((reportInstance) => {
            trackReportInstanceTiming(startTime, reportType)
            return reportInstance
        })
}

export function instanceDoesNotContainTotalRecords(reportInstance) {
    return getGrandTotalRecords(reportInstance) !== countRecords(reportInstance)
}

function countRecords(reportInstance) {
    return reportInstance.groupingsDown.groupings.reduce((total, grouping) => {
        return total + reportInstance.factMap[`${grouping.key}!T`].rows.length
    }, 0)
}

function getGrandTotalRecords(reportInstance) {
    return reportInstance.factMap['T!T'].aggregates[0].value
}

function fetchRemainingReportInstanceBatches(reportType) {
    return (dispatch, getState) => {
        let {
            reportInstances,
            reportInstanceBatches
        } = getState()
        let initialReportInstance = reportInstances[reportType]

        if (allInstanceRecordsReceived(initialReportInstance, reportInstanceBatches, reportType)) {
            return Promise.resolve()
        }

        let initialReportInstanceId = initialReportInstance.id

        return dispatch(
            fetchReportInstanceBatches(reportType, initialReportInstanceId)
        ).then(() => {
            // Flag batch fetch as complete
            dispatch(
                finishAllReportInstanceBatches(reportType, initialReportInstanceId)
            )

            if (checkAllLoadingComplete(getState(), reportType)) {
                let { sendReportInstanceHash: initialInstanceHash } = calculateSendReportInstanceHash(initialReportInstance)
                // Mark send stat fetching as totally complete
                dispatch(
                    finishSendStats(initialInstanceHash)
                )
            }
        })
    }
}

function fetchReportInstanceBatches(reportType, initialReportInstanceId) {
    return (dispatch, getState) => {
        let state = getState()
        let { sessionId } = state

        let previousBatches = getAllBatches(state, reportType)

        let criteria = getCriteriaForBatch(state.reportInstances.Send, previousBatches, reportType)

        // Return a promise to fetch the report instance batch for this criteria and store it in state.reportInstanceBatches
        return timedCreateReportInstance(sessionId, criteria, reportType)
            .then((reportInstanceBatch) => {
                // We've fetched a batch, so dispatch an action to update state.reportInstanceBatches
                dispatch(
                    responseGetReportInstanceBatch(reportType, initialReportInstanceId, reportInstanceBatch)
                )

                let {
                    reportInstances,
                    reportInstanceBatches
                } = getState()

                let initialReportInstance = reportInstances[reportType]

                dispatch(
                    // Now that we have a batch of sends, kick off fetching the stats for this send
                    fetchStatsForSends(initialReportInstance, reportInstanceBatch)
                )

                // Check if the report id has changed, which means the user changed the report they want, which means we're done
                // or if we've received all records we're done
                if (instanceChanged(initialReportInstance, initialReportInstanceId) || allInstanceRecordsReceived(initialReportInstance, reportInstanceBatches, reportType)) {
                    return Promise.resolve();
                }

                // If we're not done, recursively fetch more batches
                return dispatch(
                    fetchReportInstanceBatches(reportType, initialReportInstanceId)
                )
            })
    }
}

function allInstanceRecordsReceived(initialReportInstance, reportInstanceBatches, reportType) {
    let typeBatches = reportInstanceBatches[reportType].batches
    let lastBatch = typeBatches[typeBatches.length - 1]
    return (initialReportInstance && initialReportInstance.hasOwnProperty('allData') && initialReportInstance.allData) ||
        (lastBatch && lastBatch.hasOwnProperty('allData') && lastBatch.allData)
}

function getAllBatches(state, reportType) {
    let {
        reportInstances,
        reportInstanceBatches
    } = state

    return [
        reportInstances[reportType],
        ...reportInstanceBatches[reportType].batches
    ]
}

function instanceChanged(instance, instanceId) {
    return !instance || instance.id !== instanceId
}

function getCriteriaForBatch(sendInstance, previousBatches, reportType) {
    let previousBatch = previousBatches[previousBatches.length - 1]

    return {
        reportId: previousBatch.reportMetadata.id,
        reportMetadata: updateCriteriaDateFilterFromPreviousBatch(previousBatch, reportType)
    }
}

/**
 * Updates criteria for next report run based on previous run to continue paging
 *
 * @param previousBatch
 * @param reportType
 * @returns {*}
 */
function updateCriteriaDateFilterFromPreviousBatch(previousBatch, reportType) {
    let reportMetadata = deepClone(previousBatch.reportMetadata)

    // No point in generalizing for report types we're not actually using right now
    if (reportType !== ReportTypes.Send) {
        throw `Paging for report type ${reportType} is not currently supported`
    }

    // Since we set reportMetadata.sortBy to asc for the Send report, the start date of our next batch is the end date of the last batch
    let rows = previousBatch.factMap['T!T'].rows
    let lastRow = rows[rows.length - 1]
    // Eastern in, Eastern out. Just do string manipulation to avoid timezone crap
    let newStartDate = new Date(lastRow.dataCells[SendReportColumns.SentAt].value)

    let sentAtColumn = prefixWithReportsNamespace(Fields.SentAt)

    reportMetadata.reportFilters = reportMetadata.reportFilters.map((reportFilter) => {
        if (reportFilter.column === sentAtColumn && reportFilter.operator === 'greaterOrEqual') {
            return {
                ...reportFilter,
                value: getDateFilterFormat(newStartDate)
            }
        } else {
            return reportFilter
        }
    })

    reportMetadata.standardDateFilter = {
        ...reportMetadata.standardDateFilter,
        startDate: getDateFilterFormat(newStartDate).split('T')[0]
    }

    return reportMetadata
}

function beginAllReportInstanceBatches(reportType, initialReportInstanceId) {
    return {
        type: ActionTypes.BEGIN_REPORT_INSTANCE_BATCHES,
        reportType,
        initialReportInstanceId
    }
}

function finishAllReportInstanceBatches(reportType, initialReportInstanceId) {
    return {
        type: ActionTypes.FINISH_REPORT_INSTANCE_BATCHES,
        reportType,
        initialReportInstanceId
    }
}

function requestGetReportInstanceBatch(reportType, reportInstanceId) {
    return {
        type: ActionTypes.REQUEST_GET_REPORT_INSTANCE_BATCHES,
        reportType,
        reportInstanceId
    }
}

function responseGetReportInstanceBatch(reportType, initialReportInstanceId, reportInstanceBatch) {
    return {
        type: ActionTypes.RESPONSE_GET_REPORT_INSTANCE_BATCHES,
        reportType,
        initialReportInstanceId,
        reportInstanceBatch
    }
}

function generateReportInstanceRunCriteria(state, reportType) {
    let {
        userTimezoneOffsetInHours,
        easternTimezoneOffsetInHours,
        reports,
        filters
    } = state

    let {
        clientType,
        draftType,
        selectedScope,
        startDate,
        endDate,
        sendId,
        selectedStat,
        expandToAllTime
    } = filters.page
    let report = reports[reportType]

    let criteria = {
        reportId: report.reportMetadata.id,
        reportMetadata: deepClone(report.reportMetadata)
    }

    let clientTypeFilter = ClientTypes[clientType].filterValue
    let draftTypeFilter = EmailDraftTypes[draftType].filter

    criteria.reportMetadata.reportFilters = []

    if (clientTypeFilter !== null) {
        let clientTypeColumn = prefixWithReportsNamespace(Fields.ClientType)
        criteria.reportMetadata.reportFilters.push(getReportFilter(clientTypeColumn, clientTypeFilter, 'equals'))
    }

    if (draftTypeFilter !== null) {
        let defaultTypeColumn = prefixWithReportsNamespace(Fields.TemplateName)
        criteria.reportMetadata.reportFilters.push(getReportFilter(defaultTypeColumn, draftTypeFilter.value, draftTypeFilter.operator))
    }

    if (ScopeFilterableReportTypes.hasOwnProperty(reportType) && selectedScope !== null) {
        criteria.reportMetadata.scope = sendId ? getWidestAvailableScope(report) : selectedScope;
    }

    if (reportType === ReportTypes.Send) {
        // We need sorting for the batching/paging to work correctly for the send report
        criteria.reportMetadata.sortBy = [
            {
                sortColumn: prefixWithReportsNamespace(Fields.SentAt),
                sortOrder: 'Asc'
            }
        ]

    }

    let sendPage = sendId && !selectedStat
    let shouldBroadenSearchDate = sendPage || expandToAllTime
    let actualStartDate = shouldBroadenSearchDate ? EngageReleaseDate : startDate
    let actualEndDate = shouldBroadenSearchDate ? new Date() : endDate

    //need to set end date to end of day
    actualEndDate.setHours(23, 59, 59)

    //now adjust date to respect timezones so we can grab correct data.
    let filterStartDate = getTimezoneAdjustedDate(actualStartDate, easternTimezoneOffsetInHours, userTimezoneOffsetInHours)

    let filterEndDate = getTimezoneAdjustedDate(actualEndDate, easternTimezoneOffsetInHours, userTimezoneOffsetInHours)

    let sentIdColumn = prefixWithReportsNamespace('Engage_Send__c.Id')
    let sentAtColumn = prefixWithReportsNamespace('Engage_Send__c.Sent_At__c')

    let formattedStartDate = getDateFilterFormat(filterStartDate)
    let formattedEndDate = getDateFilterFormat(filterEndDate)

    criteria.reportMetadata.reportFilters.push(getReportFilter(sentAtColumn, formattedStartDate, 'greaterOrEqual'))
    criteria.reportMetadata.reportFilters.push(getReportFilter(sentAtColumn, formattedEndDate, 'lessOrEqual'))

    //need this otherwise SF defaults to using fiscal quarter as standard default filter which will slow down performance.
    //standard filters do not use time so this will always be slightly wider than the datetime range we need.
    //these filters are evaluated together as "AND"s so we don't need this to be accurate just performant.
    criteria.reportMetadata.standardDateFilter = {
        column: sentAtColumn,
        durationValue: 'CUSTOM',
        startDate: filterStartDate,
        endDate: filterEndDate
    }

    if(sendPage) {
        criteria.reportMetadata.reportFilters.push(getReportFilter(sentIdColumn, sendId, 'equals'))
    }

    return criteria
}

function trackReportInstanceTiming(startTime, reportType) {
    let endTime = new Date()
    trackUserTiming(GoogleAnalytics.Timings.Category, GoogleAnalytics.Timings.ReportInstanceVars[reportType], endTime - startTime)
}

function getWidestAvailableScope(report) {
    return report.reportTypeMetadata.scopeInfo.values.slice(-1)[0].value
}

function getReportFilter(column, value, operator) {
    return {
        column,
        operator,
        value
    }
}

function prefixWithReportsNamespace(metaType) {
    return prefixWithNamespace(metaType, EngageReportsPackageNamespace)
}

export function selectReportTypes(reportTypes) {
    return {
        type: ActionTypes.SELECT_REPORTS,
        reportTypes
    }
}

export function shownBackfillAlert() {
    return {
        type: ActionTypes.SHOWN_BACKFILL_ALERT
    }
}
