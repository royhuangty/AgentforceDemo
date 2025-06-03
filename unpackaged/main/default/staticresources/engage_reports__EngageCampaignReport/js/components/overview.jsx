import React, { Component, PropTypes } from 'react'
import Combobox from './combobox.jsx';
import DonutChart from './donut-chart.jsx'
import Spinner from './spinner.jsx'
import Dropdown from './dropdown.jsx'
import NoData from './no-data.jsx'
import {
    getSenders,
    calculateDerivedStats,
    aggregateStatsForSends
} from '../report-data-aggregation'
import {
    selectOverviewSender,
    selectOverviewField
} from '../actions'
import {
    StatFields,
    DonutColorsHex,
    DonutDataMappings,
    ErrorMessages,
    ReportTypes
} from '../report-constants'
import {
    findFirstKeyForValue,
    lowercaseFirstLetter,
    pluralize,
    sortObjectsByCallback,
} from '../util'

const DonutFields = [
    'UniqueOpens',
    'UniqueClicks',
    'TotalUnsubscribes',
    'TotalHardBounces',
    'TotalDelivered'
]

export default class Overview extends Component {
    render() {
        let {
            statsBySendId,
            reportInstancesLoading,
            filters,
            sends
        } = this.props
        let selectedField = filters.overview.fieldName
        let sendInstanceLoading = reportInstancesLoading([ReportTypes.Send])

        return (
            <div className='slds-p-horizontal--medium'>
                <div>
                    <div className='slds-text-heading--medium slds-p-bottom--small'>Your Engage Overview Report</div>

                    <div className='slds-grid slds-grid_vertical-align-center'>
                        <div className='slds-col slds-size_1-of-3'>
                            <div className='slds-text-heading_small'>
                                {this.renderSendersSearch(sends)}
                            </div>
                        </div>
                        <div className='slds-col slds-size_2-of-3'>
                            <span className='slds-m-left--small'>
                                {this.renderStatFieldDropdown(selectedField)}
                            </span>
                        </div>
                    </div>

                </div>
                <div className='overview-body'>
                    {this.renderBody(selectedField, sends)}
                </div>
            </div>
        )
    }

    renderBody(selectedField, sends) {
        if (this.noAccess()) {
            return <NoData message={ErrorMessages.NoAccess}/>
        }

        if (this.sendStatsInsufficientAccess()) {
            return <NoData message={ErrorMessages.SendStatsInsufficientAccess}/>
        }

        let {
            statsBySendId,
            filters,
            reportInstancesLoading
        } = this.props

        let sendInstanceLoading = reportInstancesLoading([ReportTypes.Send])

        if (!sendInstanceLoading && sends.length === 0) {
            return <NoData message="This report has no results. Adjust settings and filters if you need to."/>
        }

        if (sendInstanceLoading || Object.keys(statsBySendId).length === 0) {
            return <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
        }

        let { senderId } = filters.overview

        let filteredSends = getFilteredSends(senderId, sends)
        let aggregatedSendStats = aggregateStatsForSends(filteredSends, statsBySendId)

        let stats = {
            ...aggregatedSendStats,
            ...calculateDerivedStats(aggregatedSendStats, aggregatedSendStats.allTime)
        }

        let fieldKey = findFirstKeyForValue(StatFields, selectedField)
        let selectedStatKey = lowercaseFirstLetter(fieldKey)

        return (
            <div className='slds-grid'>
                <div className='slds-size--1-of-2'>
                    <div className='slds-p-right--small'>
                        {this.renderDonut(stats, selectedField, selectedStatKey)}
                    </div>
                </div>
                <div className='slds-size--1-of-2'>
                    <div className='slds-p-left--small'>
                        <table className='slds-m-top--medium'>
                            <tbody>
                                <tr>
                                    {this.renderStatCallout('Total Sent', stats, 'totalSends', selectedStatKey)}
                                    {this.renderStatCallout('Total Delivered', stats, 'totalDelivered', selectedStatKey)}
                                </tr>
                                <tr>
                                    {this.renderStatCallout('Total Open', stats, 'totalOpens', selectedStatKey, true)}
                                    {this.renderStatCallout('Unique Open', stats, 'uniqueOpens', selectedStatKey, true)}
                                </tr>
                                <tr>
                                    {this.renderStatCallout('Total Click', stats, 'totalClicks', selectedStatKey, true)}
                                    {this.renderStatCallout('Unique Click', stats, 'uniqueClicks', selectedStatKey, true)}
                                </tr>
                                <tr>
                                    {this.renderStatCallout('Hard Bounce', stats, 'totalHardBounces', selectedStatKey, true)}
                                    {this.renderStatCallout('Unsubscribed', stats, 'totalUnsubscribes', selectedStatKey)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    renderDonut(stats, selectedField, selectedStatKey) {
        if (!DonutDataMappings.hasOwnProperty(selectedStatKey)) {
            console.log(`Could not find donut data mapping for ${selectedStatKey}`);
            return <NoData/>
        }

        let stat = stats[selectedStatKey]
        let [statLabel, statKey, rateKey] = DonutDataMappings[selectedStatKey]
        let percentFilled = stats[rateKey]

        return (
            <div>
                <div className='slds-m-vertical--large slds-is-relative slds-text-align--center'>
                    <DonutChart diameter={200} percentFilled={percentFilled} pieColor={DonutColorsHex.Pie} sliceColor={DonutColorsHex.Slice} />
                    <div className='donut-chart-center slds-text-align--center'>
                        <div className='slds-text-heading--large'>
                            <b>{stat}</b>
                        </div>
                        <div className='slds-text-color--weak'>
                            {statLabel}
                        </div>
                    </div>
                </div>
                <div className='slds-grid slds-grid--align-center slds-m-horizontal--medium'>
                    <div className='slds-grid donut-key slds-m-right--xxx-small'>
                        <span className='slds-p-top--xxx-small'>
                            <span className='donut-key-dot donut-key-dot-blue slds-m-right--xx-small'></span>
                        </span>
                        <span>{statKey}</span>
                    </div>
                </div>
            </div>
        )
    }

    renderStatFieldDropdown(selectedField) {
        let items = Object.keys(StatFields)
            .filter(key => DonutFields.includes(key))
            .map((key) => {
                return {
                    key,
                    label: StatFields[key]
                }
            })

        let onItemSelected = (item) => {
            this.props.dispatch(
                selectOverviewField(item.label)
            )
        }

        let disabled = this.props.reportInstancesLoading()|| this.props.sendStats.loading

        return <Dropdown disabled={disabled} items={items} header={`${selectedField}`} title={'Select field to view'} activeFilter={selectedField} onItemSelected={onItemSelected} />

    }

    renderStatCallout(label, stats, statKey, selectedStatKey, shouldPluralize) {
        let statEl, labelEl
        // add commas
        let stat = stats[statKey]

        if (shouldPluralize) {
            label = pluralize(label, stat)
        }

        stat = stat.toLocaleString()

        if (statKey === selectedStatKey) {
            statEl = <b>{stat}</b>
            labelEl = <b>{label}</b>
        } else {
            statEl = stat
            labelEl = label
        }

        return (
            <td>
                <div className='slds-text-align--right slds-m-bottom--small'>
                    <div className='slds-text-heading--large'>
                        {statEl}
                    </div>
                    <div className='slds-text-title--caps slds-text-color--weak'>
                        {labelEl}
                    </div>
                </div>
            </td>
        )
    }

    renderSendersSearch(sends) {
        const senders = getSenders(sends)
        let { senderId } = this.props.filters.overview
        let searchText = 'All Team Members'

        const items = sortObjectsByCallback(senders, (sender) => sender.name.toLowerCase())
            .map((sender) => {
                if (senderId != null && senderId == sender.id) {
                    searchText = sender.name
                }
                return {
                    value: sender.name,
                    key: sender.id
                }
        });

        items.unshift({
            value: 'All Team Members',
            key: 'all'
        });

        const onItemSelected = (key) => {
            let id = key === 'all' ? null : key
            this.props.dispatch(
                selectOverviewSender(id)
            )
        };

        const disabled = this.props.reportInstancesLoading() || this.props.sendStats.loading;

        return <Combobox items={items} placeholder='Overview Select Sender' onSelect={onItemSelected}
            disabled={disabled} searchText={searchText}/>;
    }

    noAccess() {
        return this.props.reports.Send.error
    }

    sendStatsInsufficientAccess() {
        return this.props.sendStats.error

    }
}

function getFilteredSends(senderId, sends) {
    if (!senderId) {
        return sends
    }

    let filteredSends = []
    for (let i = 0; i < sends.length; i++) {
        if (sends[i].owner.id === senderId) {
            filteredSends.push(sends[i])
        }
    }
    return filteredSends
}
