import React, { Component, PropTypes } from 'react'
import Spinner from './spinner.jsx'
import PageHeader, {PageHeaderTitle, PageHeaderDetails} from './page-header.jsx'
import NoData from "./no-data.jsx";
import ErrorPrompt from './error-prompt.jsx'
import { pluralize, percent } from '../util'
import { selectTemplateRecipientsPage } from '../actions'
import { navigateToUrl } from '../../../../js/force-navigator'
import { ErrorMessages } from '../report-constants'
import {
    aggregateStatsForSends,
    calculateDerivedStats
} from '../report-data-aggregation'

export default class TemplatePage extends Component {
    constructor(props) {
        super(props)
        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }
    componentWillMount() {
        this.props.fetchReports()
    }

    statClicked(key) {
        let { templateId } = this.props.filters.page
        this.props.dispatch(
            selectTemplateRecipientsPage(templateId, key)
        )
    }

    errorModal() {
        if (this.props.reports.Send.error) {
            return (
                <ErrorPrompt {...this.props}
                             title="Insufficient Privileges"
                             message={ErrorMessages.InsufficientPrivileges}
                             singleButton={true}
                             callback={this.redirectToHome} />
            )
        } else if (this.props.sendStats.error) {
            return (
                <ErrorPrompt
                    title="Insufficient Privileges"
                    message={ErrorMessages.SendStatsInsufficientAccess}
                    singleButton={true}
                    callback={this.redirectToHome} />
            )
        } else {
            return null
        }
    }

    render() {
        let {
            filters,
            sends,
            reportInstancesLoading
        } = this.props
        let { templateId } = filters.page

        let sendInstanceLoading = reportInstancesLoading()
        let template = getTemplate(sends, templateId)

        return (
            <div>
                <PageHeader {...this.props} pageTitle={this.renderPageHeaderTitle(template, sendInstanceLoading)} includeEmailDraftTypesControl={false} includeScopeTypesControl={true} />
                {this.renderBody(template, sendInstanceLoading)}
            </div>
        )
    }

    renderPageHeaderTitle(template, sendInstanceLoading) {
        return (
            <PageHeaderTitle {...this.props}>
                <p className="slds-text-title--caps slds-line-height--reset">Engage Template Report</p>
                {this.renderTemplateName(template, sendInstanceLoading)}
            </PageHeaderTitle>
        )
    }

    renderTemplateName(template, sendInstanceLoading) {
        if (template && template.name) {
            return (
                <h1 className="slds-page-header__title slds-m-right--small slds-align-middle slds-truncate">{template.name}</h1>
            )
        } else if (sendInstanceLoading) {
                return (
                    <h1 className="slds-page-header__title slds-m-right--small slds-align-middle slds-truncate">Engage Email Template Loading...</h1>
                )
        } else {
            return null
        }
    }

    renderBody(template, sendInstanceLoading) {
        let error = this.errorModal()
        if(error != null) {
            return error
        }

        let {
            sendStats
        } = this.props

        if (sendInstanceLoading) {
            return this.renderSpinner()
        } else if (!template) {
            return this.renderNoData()
        }

        let {
            sends,
            statsBySendId
        } = this.props

        let templateSends = sends.filter(s => s.template && s.template.id === template.id)

        if (!hasStats(templateSends, statsBySendId)) {
            if (sendStats.loading) {
                return this.renderSpinner()
            } else {
                return this.renderNoData()
            }
        }

        let aggregatedStats = aggregateStatsForSends(templateSends, statsBySendId)
        let stats = {
            ...aggregatedStats,
            ...calculateDerivedStats(aggregatedStats, aggregatedStats.allTime)
        }

        return (
            <div className='content-wrapper slds-p-around--medium'>
                <div className='slds-grid slds-wrap'>
                    <div className='slds-size--1-of-2'>
                        <div className='slds-grid slds-wrap slds-text-align--center'>
                            <div className='slds-size--1-of-2'>
                                {this.renderStatCallout(stats, {
                                    top: {
                                        label: 'Sent',
                                        key: 'totalSends',
                                        pluralize: false
                                    },
                                    bottom: {
                                        label: 'Delivered',
                                        key: 'totalDelivered',
                                        pluralize: false
                                    }
                                })}
                            </div>
                            <div className='slds-size--1-of-2'>
                                {this.renderStatCallout(stats, {
                                    top: {
                                        label: 'Hard Bounce Rate',
                                        key: 'hardBounceRate',
                                        percent: true
                                    },
                                    bottom: {
                                        label: 'Hard Bounce',
                                        key: 'totalHardBounces'
                                    }
                                })}
                            </div>
                            <div className='slds-size--1-of-2'>
                                {this.renderStatCallout(stats, {
                                    top: {
                                        label: 'Unique Open Rate',
                                        key: 'uniqueOpenRate',
                                        percent: true
                                    },
                                    bottom: {
                                        label: 'Unique Open',
                                        key: 'uniqueOpens'
                                    }
                                })}
                            </div>
                            <div className='slds-size--1-of-2'>
                                {this.renderStatCallout(stats, {
                                    top: {
                                        label: 'Unique Clickthrough Rate',
                                        key: 'uniqueClickRate',
                                        percent: true
                                    },
                                    bottom: {
                                        label: 'Unique Click',
                                        key: 'uniqueClicks'
                                    }
                                })}
                            </div>
                        </div>
                        <div className='slds-text-heading--large'></div>
                    </div>
                    <div className='slds-size--1-of-2'>
                        <div className='slds-box slds-m-top--small'>
                            <div className='slds-section__title'>Email Statistics</div>
                            <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-table--striped'>
                                <tbody>
                                {[
                                    { label: 'Total Opens', key: 'totalOpens', pluralize: false },
                                    { label: 'Total Open Rate', key: 'totalOpenRate', percent: true },
                                    { label: 'Total Clicks', key: 'totalClicks', pluralize: false },
                                    { label: 'Total Clickthrough Rate', key: 'totalClickRate', percent: true },
                                    { label: 'Unopened', key: 'totalUnopened', pluralize: false },
                                    { label: 'Unclicked', key: 'totalUnclicked', pluralize: false },
                                    { label: 'Hard Bounces', key: 'totalHardBounces', pluralize: false },
                                    { label: 'Soft Bounces', key: 'totalSoftBounces', pluralize: false },
                                    { label: 'Bounce Rate', key: 'bounceRate', percent: true },
                                    { label: 'Unsubscribes', key: 'totalUnsubscribes', pluralize: false }
                                ].map((options) => {
                                    let stat = formatStat(stats, options)
                                    let label = formatLabel(stat, options)

                                    let statEl = options.percent || stat == 0 ? stat : <a onClick={this.statClicked.bind(this, options.key)}>{stat}</a>
                                    return (
                                        <tr key={options.key}>
                                            <td>{label}</td>
                                            <td>{statEl}</td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    renderSpinner() {
        return (
            <div className='content-wrapper placeholder slds-p-around--medium'>
                <div>
                    <Spinner size={Spinner.Sizes.Medium} type={Spinner.Types.Default} />
                </div>
            </div>
        )
    }

    renderNoData() {
        return <NoData message="This report has no results. Adjust settings and filters if you need to."/>
    }

    renderStatCallout(stats, options) {
        let topStat = formatStat(stats, options.top)
        let topLabel = formatLabel(topStat, options.top)
        let bottomStat = formatStat(stats, options.bottom)
        let bottomLabel = formatLabel(bottomStat, options.bottom)

        let bottomStatEl = bottomStat == 0 ? bottomStat : <a onClick={this.statClicked.bind(this, options.bottom.key)}>{bottomStat}</a>

        return (
            <div className='slds-box slds-m-top--small slds-m-right--small'>
                <div className='slds-text-heading--large'>{topStat}</div>
                <div className='slds-text-body--medium'>{topLabel}</div>
                <div className='slds-text-body--small'>
                    {bottomStatEl}
                    <span> {bottomLabel}</span>
                </div>
            </div>
        )
    }
}

function getTemplate(sends, templateId) {
    let send = sends.find(s => s.template && s.template.id === templateId)
    if (send) {
        return send.template
    }

    return null
}

function formatLabel(stat, options) {
    return ('pluralize' in options) && !options.pluralize || options.percent ? options.label : pluralize(options.label, stat)
}

function formatStat(stats, options) {
    let stat = stats[options.key]
    if (typeof stat !== 'number') {
        return ''
    }
    return options.percent ? percent(stat) : stat.toLocaleString()
}

function hasStats(templateSends, statsBySendId) {
    let send = templateSends[0]
    if (!send) {
        return false
    }

    let stats = statsBySendId[send.id]
    if (!stats) {
        return false
    }

    return stats.length > 0
}
