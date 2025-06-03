import React, { Component, PropTypes } from 'react'
import PageHeader, {PageHeaderTitle, PageHeaderDetails} from './page-header.jsx'
import ErrorPrompt from './error-prompt.jsx'
import Overview from './overview.jsx'
import TopTemplates from './top-templates.jsx'
import EmailsTable from './emails-table.jsx'
import { navigateToUrl } from '../../../../js/force-navigator'
import { ErrorMessages } from '../report-constants'
import { isInternetExplorer } from '../../../../js/browser-check'
import Alerts from './alerts.jsx'

export default class MainPage extends Component {
    constructor(props) {
        super(props)
        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }

    static propTypes: {
        reportInstances: PropTypes.object,
        filters: PropType.object
    }

    componentWillMount() {
        this.props.fetchReports()
    }

    renderPageHeaderTitle() {
        return (
            <PageHeaderTitle {...this.props}>
                <p className="slds-text-title--caps slds-line-height--reset">Engage Reports</p>
            </PageHeaderTitle>
        )
    }

    errorModal() {
        if (this.props.reports.Send.error) {
            return (
                <ErrorPrompt
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
        const ieFix = isInternetExplorer() ? 'ie-fix' : '';

        return (
            <div className={`main-page ${ieFix}`}>
                <Alerts alertsState={this.props.alerts} dispatch={this.props.dispatch} />
                <PageHeader {...this.props} pageTitle={this.renderPageHeaderTitle()} includeEmailDraftTypesControl={true} includeScopeTypesControl={true} includeClientTypesControl={true}>
                </PageHeader>
                <div className='content-wrapper slds-p-around--medium'>
                    {this.errorModal()}
                    <div className='slds-grid slds-grid--vertical-stretch'>
                        <div className='slds-size--1-of-2 slds-box slds-m-right--x-small'>
                            <Overview {...this.props} />
                        </div>
                        <div className='slds-size--1-of-2 slds-box slds-m-left--x-small'>
                            <TopTemplates {...this.props} />
                        </div>
                    </div>
                    <div className='slds-grid slds-wrap'>
                        <div className='slds-size--1-of-1 slds-box slds-m-top--medium'>
                            <EmailsTable {...this.props} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
