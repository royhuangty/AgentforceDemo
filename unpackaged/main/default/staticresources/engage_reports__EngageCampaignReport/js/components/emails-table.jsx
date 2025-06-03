import React, { Component, PropTypes } from 'react'
import {
    selectEmailsTableSender,
    selectPage,
    selectEmailRecipientsPage,
    expandEmailsTableSenderGrouping,
    collapseEmailsTableSenderGrouping
} from '../actions'
import { Pages } from '../report-constants'
import Combobox from './combobox.jsx';
import Spinner from './spinner.jsx'
import NoData from "./no-data.jsx";
import {
    getSenders,
    aggregateStatsForSend
} from '../report-data-aggregation'
import {
    sortObjectsByCallback,
} from '../util'
import { ErrorMessages } from '../report-constants'

const COLLAPSED_GROUPING_LENGTH = 10

export default class EmailsTable extends Component {
    templateClicked(template) {
        this.props.dispatch(
            selectPage(Pages.Template, template.id)
        )
    }

    emailSendClicked(send) {
        this.props.dispatch(
            selectPage(Pages.Send, send.id)
        )
    }

    statClicked(sendId, statType) {
        this.props.dispatch(
            selectEmailRecipientsPage(sendId, statType)
        )
    }

    render() {
        let {
            filters,
            reports,
            sends,
            reportInstancesLoading,
            sendStats
        } = this.props

        if(reports.Send.error) {
            return <NoData message={ErrorMessages.NoAccess}/>
        }

        if (sendStats.error) {
            return <NoData message={ErrorMessages.SendStatsInsufficientAccess}/>
        }

        // only show loading if end report is loading or stats are still loading but nothing has been returned yet
        if (reportInstancesLoading() || sendStats.loading && sendStats.aggregates.length === 0) {
            return <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
        }

        let { senderId } = filters.teamEmails
        let senders = getSenders(sends)
        let sender = senderId ? senders.find(s => s.id === senderId) : null

        return (
            <div className='slds-p-horizontal--medium'>
                <div className='slds-section__title slds-m-bottom_medium'>
                    {this.renderSendersSearch(senders, sender)}
                </div>
                {(() => {
                    if (sends.length === 0) {
                        return <NoData message="This report has no results. Adjust settings and filters if you need to."/>
                    } else if (sender) {
                        return this.renderSingleSenderTable(sender)
                    } else {
                        return this.renderAllSendersTable(senders)
                    }
                })()}
            </div>
        )
    }

    renderAllSendersTable() {
        let {
            sends,
            statsBySendId,
            formatDateForUserTimezone,
            filters,
            dispatch
        } = this.props
        let { expandedGroupings } = filters.teamEmails

        let sendStatsBySenders = getSendStatsGroupedBySender(sends, statsBySendId)

        const columns = [
            { title: 'Sender', width: 10},
            { title: 'Date', width: 7.5 },
            { title: 'Template' },
            { title: 'Subject Line' },
            { title: 'Sent', width: 3.5 },
            { title: 'Delivered', width: 6 },
            { title: 'Unique Opens', width: 7.5 },
            { title: 'Unique Clicks', width: 7.5 },
            { title: 'Unsubscribes', width: 8.5 }
        ];

        return (
            <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-no-row-hover contains-grouping slds-table--fixed-layout'>
                <thead>
                    <tr className='slds-text-title--caps slds-text-body--small'>
                        {
                            columns.map(({title, width}) => {
                                const style = width !== undefined ? { width: width + 'rem' } : {};
                                return (
                                    <th scope='col' key={title} style={style}>
                                        <div title={title}>
                                            {title}
                                        </div>
                                    </th>
                                );
                            })
                        }
                    </tr>
                </thead>
                <tbody>
                    {
                        sendStatsBySenders.sort((a, b) => {
                            let aLength = a.statsBySends.length
                            let bLength = b.statsBySends.length

                            if (aLength < bLength) {
                                return 1
                            } else if (aLength > bLength) {
                                return -1
                            }
                            return 0
                        }).map(({ sender, statsBySends }) => {
                            let expanded = expandedGroupings.includes(sender.id)
                            let toggleClicked = (e) => {
                                e.preventDefault()
                                let toggleFn = expanded ? collapseEmailsTableSenderGrouping : expandEmailsTableSenderGrouping
                                dispatch(
                                    toggleFn(sender.id)
                                )
                            }

                            let isCollapsible = statsBySends.length > COLLAPSED_GROUPING_LENGTH
                            let renderedStats = expanded ? statsBySends : statsBySends.slice(0, COLLAPSED_GROUPING_LENGTH)
                            return renderedStats.map((statsBySend, i) => {
                                let formattedSentAt = formatDateForUserTimezone(statsBySend.send.sentAt)
                                return (
                                    <tr className={`group-tr-${i} slds-is-selected `} key={`${statsBySend.send.id}_${i}`}>
                                        {(() => {
                                            if (i === 0) {
                                                let rowSpan = renderedStats.length + (isCollapsible ? 1 : 0)
                                                return <th className='white-background grouping slds-truncate' rowSpan={rowSpan} title={sender.name}>{sender.name}</th>
                                            }
                                        })()}
                                        <td className='thick-border-left gray-background slds-truncate' title={formattedSentAt}>{formattedSentAt}</td>
                                        <td className='gray-background slds-truncate' title={getTemplateName(statsBySend.send.template)}>{this.renderTemplateName(statsBySend.send.template)}</td>
                                        <td className='gray-background slds-truncate' title={statsBySend.send.subject}>
                                            <a onClick={this.emailSendClicked.bind(this, statsBySend.send)}>{statsBySend.send.subject}</a>
                                        </td>
                                        <td className='gray-background slds-truncate' title={statsBySend.stats.totalSends}>{this.renderLinkedStat(statsBySend, 'totalSends')}</td>
                                        <td className='gray-background slds-truncate' title={statsBySend.stats.totalDelivered}>{this.renderLinkedStat(statsBySend, 'totalDelivered')}</td>
                                        <td className='gray-background slds-truncate' title={statsBySend.stats.uniqueOpens}>{this.renderLinkedStat(statsBySend, 'uniqueOpens')}</td>
                                        <td className='gray-background slds-truncate' title={statsBySend.stats.uniqueClicks}>{this.renderLinkedStat(statsBySend, 'uniqueClicks')}</td>
                                        <td className='gray-background slds-truncate' title={statsBySend.stats.totalUnsubscribes}>{this.renderLinkedStat(statsBySend, 'totalUnsubscribes')}</td>
                                    </tr>
                                )
                            })
                            .concat((() => {
                                if (isCollapsible) {
                                    return (
                                        <tr className='slds-is-selected'>
                                            <td className='thick-border-left gray-background'></td>
                                            <td className='gray-background'></td>
                                            <td className='gray-background'>
                                                <a href='#' onClick={toggleClicked}>
                                                    {expanded ? 'Show Less' : 'Show More'}
                                                </a>
                                            </td>
                                            <td className='gray-background'></td>
                                            <td className='gray-background'></td>
                                            <td className='gray-background'></td>
                                            <td className='gray-background'></td>
                                            <td className='gray-background'></td>
                                        </tr>
                                    )
                                }
                            })())
                            .concat(
                                <tr className='last-of-group'>
                                    <td>Grand Total:</td>
                                    <td colSpan={8}>{statsBySends.length} sends</td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </table>
        )
    }

    renderLinkedStat(statsBySend, statType) {
        let stat = statsBySend.stats[statType]
        if (stat == 0) {
            return stat
        }
        return (
            <a onClick={this.statClicked.bind(this, statsBySend.send.id, statType)}>
                {stat}
            </a>
        )
    }

    renderSingleSenderTable(sender) {
        let {
            sends,
            statsBySendId,
            formatDateForUserTimezone
        } = this.props

        let userSends = sends.filter(send => send.owner.id === sender.id)

        let statsBySends = []

        for (let i = 0; i < userSends.length; i++) {
            let send = userSends[i]
            let rawSendStats = statsBySendId[send.id]
            if (!rawSendStats) {
                // stats for this send have not yet loaded
                continue
            }
            statsBySends.push({
                send,
                stats: aggregateStatsForSend(rawSendStats)
            })
        }

        const columns = [
            { title: 'Date', width: 7.5 },
            { title: 'Template' },
            { title: 'Subject Line' },
            { title: 'Sender', width: 10},
            { title: 'Sent', width: 3.5 },
            { title: 'Delivered', width: 6 },
            { title: 'Unique Opens', width: 7.5 },
            { title: 'Unique Clicks', width: 7.5 },
            { title: 'Unsubscribes', width: 8.5 }
        ];

        return (
            <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-table--striped slds-table--fixed-layout'>
                <thead>
                    <tr className='slds-text-title--caps slds-text-body--small'>
                        {
                            columns.map(({title, width}) => {
                                const style = width !== undefined ? { width: width + 'rem' } : {};
                                return <th scope='col' key={title} style={style}>
                                    <div title={title}>
                                        {title}
                                    </div>
                                </th>
                            })
                        }
                    </tr>
                </thead>
                <tbody>
                    {statsBySends
                        .map(statsBySend =>
                            <tr className='slds-text-body--small' key={statsBySend.send.id}>
                                <td className='slds-truncate' title={formatDateForUserTimezone(statsBySend.send.sentAt)}>{formatDateForUserTimezone(statsBySend.send.sentAt)}</td>
                                <td className='slds-truncate' title={getTemplateName(statsBySend.send.template)}>{this.renderTemplateName(statsBySend.send.template)}</td>
                                <td className='slds-truncate' title={statsBySend.send.subject}>
                                    <a onClick={this.emailSendClicked.bind(this, statsBySend.send)}>{statsBySend.send.subject}</a>
                                </td>
                                <td className='slds-truncate' title={sender.name}>{sender.name}</td>
                                <td className='slds-truncate' title={statsBySend.stats.totalSends}>{this.renderLinkedStat(statsBySend, 'totalSends')}</td>
                                <td className='slds-truncate' title={statsBySend.stats.totalDelivered}>{this.renderLinkedStat(statsBySend, 'totalDelivered')}</td>
                                <td className='slds-truncate' title={statsBySend.stats.uniqueOpens}>{this.renderLinkedStat(statsBySend, 'uniqueOpens')}</td>
                                <td className='slds-truncate' title={statsBySend.stats.uniqueClicks}>{this.renderLinkedStat(statsBySend, 'uniqueClicks')}</td>
                                <td className='slds-truncate' title={statsBySend.stats.totalUnsubscribes}>{this.renderLinkedStat(statsBySend, 'totalUnsubscribes')}</td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
        )
    }

    renderTemplateName(template) {
        if (template.id) {
            return <a onClick={this.templateClicked.bind(this, template)}>{template.name}</a>
        } else {
            return <span className='slds-text-color--weak'>self-drafted</span>
        }
    }

    renderSendersSearch(senders, selectedSender) {
        let searchText = 'All Team Emails'
        const items = sortObjectsByCallback(senders, (sender) => sender.name.toLowerCase())
            .map((sender) => {
                if (selectedSender != null && selectedSender.id == sender.id) {
                    searchText = `${sender.name}'s Emails`
                }
                return {
                    key: sender.id,
                    value: sender.name
                };
            });

        items.unshift({
            value: 'All Team Emails',
            key: 'all'
        });

        const onItemSelected = (key) => {
            let id = key === 'all' ? null : key;
            this.props.dispatch(
                selectEmailsTableSender(id)
            );
        };

        const disabled = this.props.reportInstancesLoading() || this.props.sendStats.loading;

        return <Combobox items={items} placeholder='Emails Select Sender' onSelect={onItemSelected}
            disabled={disabled} searchText={searchText}/>
    }
}

/**
 * Aggregates stats for each send, and groups the aggregated stats by sender
 * @param sends {Array}
 * @param statsBySendId {Object}
 * @return {Array} -
 *      [
 *          {
 *              sender,
 *              statsBySends: [
 *                  {
 *                      send,
 *                      stats
 *                  },
 *                  ...
 *              ]
 *          },
 *          ...
 *      ]
*/
function getSendStatsGroupedBySender(sends, statsBySendId) {
    let sendStatsBySenderId = {}

    for (let i = 0; i < sends.length; i++) {
        let send = sends[i]
        let rawSendStats = statsBySendId[send.id]
        if (!rawSendStats) {
            // raw stats for this send still need to load
            continue
        }

        if (!sendStatsBySenderId[send.owner.id]) {
            sendStatsBySenderId[send.owner.id] = {
                sender: send.owner,
                statsBySends: []
            }
        }

        sendStatsBySenderId[send.owner.id].statsBySends.push({
            send,
            stats: aggregateStatsForSend(rawSendStats)
        })
    }

    return Object.values(sendStatsBySenderId)
}

function getTemplateName(template) {
    if (template.id) {
        return template.name
    } else {
        return 'self-drafted'
    }
}