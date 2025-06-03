import React, { Component, PropTypes } from 'react'
import NoData from "./no-data.jsx";
import Dropdown from './dropdown.jsx'
import Spinner from './spinner.jsx'
import { selectTopTemplatesSortField, selectPage } from '../actions'
import {
    Pages,
    StatFields,
    ErrorMessages,
    ReportTypes
} from '../report-constants'
import { sortObjectsByCallback, percent } from '../util'
import {
    aggregateStatsForSends,
    calculateDerivedStats
} from '../report-data-aggregation'

const MaxRecordsToShow = 8

const StatsToDisplay = {
    Open: 'totalOpenRate',
    Click: 'totalClickRate'
}

const Fields = [
    'OpenRate',
    'ClickRate'
]

export default class TopTemplates extends Component {
    templateClicked(template) {
        this.props.dispatch(
            selectPage(Pages.Template, template.id)
        )
    }

    render() {
        let {
            filters,
            reports,
            sendStats,
            reportInstancesLoading
        } = this.props

        if(reports.Send.error) {
            return <NoData message={ErrorMessages.NoAccess}/>
        }

        if (sendStats.error) {
            return <NoData message={ErrorMessages.SendStatsInsufficientAccess}/>
        }

        let fields = Object.keys(StatFields)
            .filter(key => Fields.includes(key))
            .map((key) => {
                return {
                    name: key,
                    label: StatFields[key]
                }
            })

        let templateCSS = "slds-dropdown--left slds-dropdown--large"
        let selectedField = filters.templates.fieldName

        let items = fields.map((field) => {
            return {
                label: field.label,
                key: field.name
            }
        })

        let onItemSelected = (item) => {
            this.props.dispatch(
                selectTopTemplatesSortField(item.label)
            )
        }
        let disabled = this.props.reportInstancesLoading()|| this.props.sendStats.loading

        return (
            <div className='slds-m-right--large'>
                <div>
                    <Dropdown disabled={disabled} items={items} header={"Top Performing Templates by " + selectedField} title={selectedField} onItemSelected={onItemSelected} activeFilter={selectedField} dropDownCSS={templateCSS}/>
                </div>
                <div className="slds-p-top--small">
                    {this.renderTableContent(selectedField)}
                </div>
            </div>
        )
    }

    renderTableContent(selectedField) {
        let {
            statsBySendId,
            sends,
            reportInstancesLoading,
            sendStats
        } = this.props


        let instanceLoading = reportInstancesLoading()

        if (instanceLoading || (sendStats.loading && sendStats.aggregates.length === 0)) {
            return <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
        }

        let templateStats = getTemplateStats(sends, statsBySendId)

        if (!instanceLoading && !sendStats.loading && templateStats.length === 0) {
            return (
                <NoData message="This report has no results. Adjust settings and filters if you need to."/>
            )
        }

        templateStats = sortTemplateStats(templateStats, selectedField).slice(0, MaxRecordsToShow)

        return (
            <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-table_fixed-layout'>
                <thead>
                <tr className='slds-text-title--caps'>
                    <th className='slds-truncate slds-size_2-of-3' title='Template'>Template</th>
                    <th className='slds-truncate' title='Opens'>Opens</th>
                    <th className='slds-truncate' title='Clicks'>Clicks</th>
                </tr>
                </thead>
                <tbody>
                    {templateStats.map(({ template, stats }) =>
                        <tr className='slds-text-body--small' key={template.id}>
                            <td className='slds-truncate' title={template.name}>
                                <a onClick={this.templateClicked.bind(this, template)}>
                                    {template.name}
                                </a>
                            </td>
                            <td className='slds-truncate' title={percent(stats[StatsToDisplay.Open])}>{percent(stats[StatsToDisplay.Open])}</td>
                            <td className='slds-truncate' title={percent(stats[StatsToDisplay.Click])}>{percent(stats[StatsToDisplay.Click])}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        )
    }
}

function getTemplateStats(allSends, statsBySendId) {
    return getTemplatesWithSends(allSends)
        .map(({ template, sends }) => {
            let aggregatedStats = aggregateStatsForSends(sends, statsBySendId)

            return {
                template,
                stats: {
                    ...aggregatedStats,
                    ...calculateDerivedStats(aggregatedStats, aggregatedStats.allTime)
                }
            }
        })
}

function getTemplatesWithSends(sends) {
    let templateStatsByTemplateId = {}

    sends.forEach((send) => {
        let templateId = send.template.id
        if (!templateId) {
            return
        }

        if (!templateStatsByTemplateId[templateId]) {
            templateStatsByTemplateId[templateId] = {
                template: send.template,
                sends: []
            }
        }

        templateStatsByTemplateId[templateId].sends.push(send)
    })

    return Object.values(templateStatsByTemplateId)
}

function sortTemplateStats(templateStatsCollection, selectedField) {
    let field = selectedField === StatFields.OpenRate ? StatsToDisplay.Open : StatsToDisplay.Click
    return sortObjectsByCallback(templateStatsCollection, (templateStats) => templateStats.stats[field], 'desc')
}
