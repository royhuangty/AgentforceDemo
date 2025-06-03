import React from 'react'
import { connect } from 'react-redux'
import Immutable from 'immutable'
import {
    fetchReportIfNeeded,
    fetchReportInstance,
    fetchRemainingBatchesIfNeeded
} from '../actions/report-actions'
import {
    ReportNames,
    ReportTypes,
    DefaultLocale,
} from '../report-constants'
import MainPage from '../components/main-page.jsx'
import SendPage from '../components/send-page.jsx'
import TemplatePage from '../components/template-page.jsx'
import RecipientsPage from '../components/recipients-page.jsx'
import {
    mapObject,
    formatDateForUI,
    getTimezoneAdjustedDateForLabel,
} from '../util'
import {
    mapReportInstanceRowToRawStat,
    mapSendInstanceToSends,
    mapSendAggregatesToRawStatsBySendId
} from '../report-data-aggregation'

import {
    InsufficientPermissionsError,
    FieldLevelSecurityError
} from '../errors'

class App extends React.Component {
    fetchReports() {
        let { dispatch } = this.props

        dispatch(
            fetchReportIfNeeded(ReportTypes.Send)
        ).then(() => {
            return dispatch(
                fetchReportInstance(ReportTypes.Send)
            )
        }).then(() => {
            return dispatch(
                fetchRemainingBatchesIfNeeded(ReportTypes.Send)
            )
        }).catch((error) => {
            if (error instanceof InsufficientPermissionsError) {
                // do nothing since this is handled elsewhere
                return
            } 
            throw error
        })
    }

    /**
     * @param {Date} date
     * @param {boolean} includeTime
     * @return {string}
     */
    formatDateForUserTimezone(date, includeTime = false) {
        let locale = this.props.userLocale || DefaultLocale
        return formatDateForUI(
            getTimezoneAdjustedDateForLabel(
                date,
                this.props.easternTimezoneOffsetInHours,
                this.props.userTimezoneOffsetInHours
            ), locale, includeTime
        )
    }

    reportInstancesLoading() {
        return !reportInstanceLoaded(this.props.reportInstances.Send, this.props.reportInstanceBatches.Send, this.props.sendStats)
    }

    render() {
        let {
            templateId,
            sendId,
            selectedStat
        } = this.props.filters.page

        let props = {
            ...this.props,
            fetchReports: this.fetchReports.bind(this),
            formatDateForUserTimezone: this.formatDateForUserTimezone.bind(this),
            reportInstancesLoading: this.reportInstancesLoading.bind(this),
        }

        return (
            <div className='slds-scope'>
                {(() => {
                    if (selectedStat) {
                        return <RecipientsPage {...props} />
                    } else if (templateId) {
                        return <TemplatePage {...props} />
                    } else if (sendId) {
                        return <SendPage {...props} />
                    } else {
                        return <MainPage {...props} />
                    }
                })()}
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        ...state,
        statsBySendId: mapSendAggregatesToRawStatsBySendId(state.sendStats.aggregates),
        sends: mapStateToSends(state)
    }
}

/**
 * Maps over report instances.
 * Pretty much a 1-1 mapping of the underlying report format with raw stats grouped by send id.
 * Sends from subsequent batches are used as well.
 * The format looks like this:
 *      {
 *          'send123': [
 *              {
 *                  send: { name: '10x your mother', id: 'send123' },
 *                  recipient: { name: 'Ben Dover', id: 'lead123' },
 *                  ...,
 *                  opens: 0,
 *                  totalSends: 50
 *              },
 *              ... more stats
 *          ],
 *          ... more stats key'ed on send id
 *      }
 * }
*/

function mapStateToSends(state) {
    if (!reportInstanceLoaded(state.reportInstances.Send)) {
        return []
    }

    return mapSendInstanceToSends(state.reportInstances.Send, state.reportInstanceBatches.Send)
}

function reportInstanceLoaded(instance) {
    return !instance.loading && instance.factMap
}

/**
 Converts state to an immutable object, then back to plain js object.
 This guarantees that a component cannot alter the global state.
 The best practice is to actually use immutable objects for the state in
 the reducer functions, but this is probably the most pragmatic solution
 that doesn't involve refactoring the whole project.
 @param state
 @return Object
 */
function ensureImmutableState(state) {
    return Immutable.fromJS(state).toJS()
}

function removeRecordsWithNoDateFromInstance(instance) {
    return instance
}

export default connect(mapStateToProps)(App)
