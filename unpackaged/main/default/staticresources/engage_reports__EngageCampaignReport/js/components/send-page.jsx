import React, { Component, PropTypes } from 'react'
import PageHeader, {PageHeaderTitle, PageHeaderDetails} from './page-header.jsx'
import Spinner from './spinner.jsx'
import NoData from './no-data.jsx'
import ErrorPrompt from './error-prompt.jsx'
import {
    percent,
    pluralize,
} from '../util'
import {
    selectPage,
    selectEmailRecipientsPage
} from '../actions'

import {
    Pages,
    ErrorMessages,
    ReportTypes
} from '../report-constants'
import {
    aggregateStatsForSend,
    calculateDerivedStats
} from '../report-data-aggregation'
import { navigateToUrl } from '../../../../js/force-navigator'

export default class SendPage extends Component {
    constructor(props) {
        super(props)
        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }

    componentWillMount() {
        this.props.fetchReports()
    }

    templateClicked(templateId) {
        this.props.dispatch(
            selectPage(Pages.Template, templateId)
        )
    }

    statClicked(key) {
        let { sendId } = this.props.filters.page
        this.props.dispatch(
            selectEmailRecipientsPage(sendId, key, { expandToAllTime: true })
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
        let { sendId } = filters.page

        let send = sends.find(s => s.id === sendId)
        let sendInstanceLoading = reportInstancesLoading([ReportTypes.Send])

        return (
            <div>
                <PageHeader {...this.props} pageTitle={this.renderPageTitle(send, sendInstanceLoading)} pageHeaderDetails={this.renderPageHeaderDetails(sendInstanceLoading, send)} includeDateSelector={false} includeEmailDraftTypesControl={false} includeClientTypesControl={false} includeScopeTypesControl={false}>
                </PageHeader>

                <div className={`${sendInstanceLoading ? 'placeholder' : ''} content-wrapper slds-p-around--medium`}>
                    {this.renderBody(send, sendInstanceLoading)}
                </div>
            </div>
        )
    }

    renderTemplateName(template) {
        if (template.id) {
            return (
                <p className="slds-text-body--regular slds-truncate" title="Template field">
                    <a onClick={this.templateClicked.bind(this, template.id)}>{template.name}</a>
                </p>
            )
        } else {
            return <p className="slds-text-body--regular slds-truncate slds-text-color--weak" title="Template field">self-drafted</p>
        }
    }

    renderPageTitle(send, sendInstanceLoading) {
        return (
            <PageHeaderTitle {...this.props}>
                <div>
                    <p className="slds-text-title--caps slds-line-height--reset">Engage Send Report</p>
                    <h1 className="slds-page-header__title slds-m-right--small slds-align-middle slds-truncate">
                        {(() => {
                            if (send && send.subject) {
                                return send.subject
                            } else if (sendInstanceLoading) {
                                return 'Engage Send Loading...'
                            } else {
                                return 'Engage Send'
                            }
                        })()}
                     </h1>
                </div>
            </PageHeaderTitle>
        )
    }

    renderPageHeaderDetails(loading, send) {
        if (loading || !send) {
            return (
                <PageHeaderDetails />
            )
        }

        return (
            <PageHeaderDetails>
                <div key="Sent_At">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Sent At">Sent At</p>
                    <p className="slds-text-body--regular slds-truncate" title="Sent At field">
                        {this.props.formatDateForUserTimezone(send.sentAt, true)}
                    </p>
                </div>
                <div key="Sender">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Sender">Sender</p>
                    <p className="slds-text-body--regular slds-truncate" title="Sender field">{send.owner.name}</p>
                </div>
                <div key="Template">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Template">Template</p>
                    {this.renderTemplateName(send.template)}
                </div>
            </PageHeaderDetails>
        )
    }

    renderBody(send, sendInstanceLoading) {
        let error = this.errorModal()
        if (error != null) {
            return error
        }

        let {
            statsBySendId,
            sendStats
        } = this.props

        if (sendInstanceLoading || sendStats.loading) {
            return (
                <Spinner size={Spinner.Sizes.Medium} type={Spinner.Types.Default} />
            )
        }

        let rawStats = statsBySendId[send && send.id]
        if (!send || !rawStats) {
            return <NoData message='Nothing found.'/>
        }

        let aggregatedStats = aggregateStatsForSend(rawStats)
        let stats = {
            ...aggregatedStats,
            ...calculateDerivedStats(aggregatedStats, send)
        }

        return (
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
        )
    }

    renderTemplate(template) {
        if (!template.id) {
            return <span className='slds-text-color--weak'>Self Drafted</span>
        }

        return (
            <a onClick={this.templateClicked.bind(this, template.id)}>
                {template.name}
            </a>
        )
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
