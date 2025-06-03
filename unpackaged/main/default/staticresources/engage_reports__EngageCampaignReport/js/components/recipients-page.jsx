import React, { Component, PropTypes } from 'react'
import PageHeader, {PageHeaderTitle, PageHeaderDetails, PageHeaderRecipientPage} from './page-header.jsx'
import Dropdown from './dropdown.jsx'
import Spinner from './spinner.jsx'
import RecipientsList from './recipients-list.jsx'
import Modal from './modal.jsx'
import ErrorPrompt from './error-prompt.jsx'
import { getLocationOrigin } from '../../../../js/util'
import { interPackageVisualforceLink, navigateToUrl} from '../../../../js/force-navigator'
import {
    Pages,
    DateRangePresets,
    SendLeadContactInstanceColumns as Columns,
    RecipientDescriptions,
    PardotPackageNamespace,
    EngageReportsPackageNamespace,
    ErrorMessages,
    DefaultLocale,
} from '../report-constants'
import {
    pluralize,
    formatDateForUI,
    getTimezoneAdjustedDateForLabel,
} from '../util'
import {
    selectPage,
    determineIfPiPackageInstalled
} from '../actions'
import {
    findSend
} from '../report-data-aggregation'

const ListViewTypes = {
    All: 'All',
    Lead: RecipientDescriptions.Lead.Type,
    Contact: RecipientDescriptions.Contact.Type
}

// TODO consolidate statKeys, like "opens" and "totalOpens" used across various components
const StatsMap = {
    sends: 'Sent',
    totalSent: 'Sent',
    totalSends: 'Sent',
    delivered: 'Delivered',
    totalDelivered: 'Delivered',
    opens: 'Opens',
    totalOpens: 'Opens',
    uniqueOpens: 'Unique Opens',
    clicks: 'Clicks',
    totalClicks: 'Clicks',
    uniqueClicks: 'Unique Clicks',
    unsubscribes: 'Unsubscribes',
    totalUnsubscribes: 'Unsubscribes',
    hardBounces: 'Hard Bounces',
    totalHardBounces: 'Hard Bounces',
    softBounces: 'Soft Bounces',
    totalSoftBounces: 'Soft Bounces',
    unopened: 'Unopened',
    totalUnopened: 'Unopened',
    unclicked: 'Unclicked',
    totalUnclicked: 'Unclicked'
}


export default class RecipientsPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectedRecipientIds: [],
            selectedListViewType: null,
        }

        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }

    componentWillMount() {
        this.props.fetchReports()
        this.props.dispatch(
            determineIfPiPackageInstalled()
        )

    }

    componentDidUpdate() {
        if (this.state.selectedListViewType !== null) {
            return
        }

        let {
            sends,
            statsBySendId,
        } = this.props
        let {
            sendId,
            templateId,
            selectedStat,
        } = this.props.filters.page

        let send = findSend(sends, sendId)
        let recipients = getRecipients(sends, statsBySendId, selectedStat, sendId, templateId, send)
        let items = getListViewDropdownItems(recipients)
        if (items.length > 0) {
            this.setState({
                selectedListViewType: items[0].key
            })
        }
    }

    templateClicked(templateId) {
        this.props.dispatch(
            selectPage(Pages.Template, templateId)
        )
    }

    listViewNameChanged(recordType, event) {
        let key = `${recordType.toLowerCase()}ListView`

        this.setState({
            [key]: {
                ...this.state[key],
                name: event.target.value.trim()
            }
        })
    }

    onRecipientsSelected(ids) {
        this.setState({
            selectedRecipientIds: ids
        })
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
            sendId,
            templateId,
            selectedStat,
            expandToAllTime
        } = this.props.filters.page

        let {
            sends,
            statsBySendId,
            reportInstancesLoading
        } = this.props

        let {
            selectedListViewType
        } = this.state


        if (!sendId && !templateId || !selectedStat) {
            return this.renderBadInputsError()
        }

        let send = findSend(sends, sendId)
        let recipients = getRecipients(sends, statsBySendId, selectedStat, sendId, templateId, send)
        let filteredRecipients = getRecipientsFilteredBySelectedListViewType(recipients, selectedListViewType)

        let isLoading = reportInstancesLoading()
        let template = getTemplate(sends, templateId)

        return (
            <div>
                <PageHeader {...this.props} pageTitle={this.renderPageHeaderTitle(selectedStat, send, template, recipients, filteredRecipients)} pageHeaderDetails={this.renderPageHeaderDetails(sendId, send)} includeDateSelector={false} includeEmailDraftTypesControl={false} includeScopeTypesControl={false} includeClientTypesControl={false} showDate={!expandToAllTime}>
                </PageHeader>
                <div className={`${isLoading ? 'placeholder' : ''} content-wrapper slds-p-around--medium slds-is-relative`}>
                    {this.renderBody(selectedStat, sendId, send, filteredRecipients)}
                </div>
            </div>
        )
    }

    renderPageHeaderTitle(selectedStat, send, template, allRecipients, displayedRecipients) {
        return (
            <PageHeaderTitle {...this.props}>
                <p className="slds-text-title--caps slds-line-height--reset">Engage Reports</p>
                <h1 className="slds-page-header__title slds-m-right--small slds-align-middle engage-reports-header-dropdown">
                    {this.renderHeaderDropdown(selectedStat, send, template, allRecipients)}
                </h1>
                {this.renderSendEngageEmailButton()}
                {this.renderPageHeaderRecipients(displayedRecipients)}
            </PageHeaderTitle>
        )
    }

    renderSendEngageEmailButton() {
        if (!this.props.piPackageInstalled) {
            return
        }

        let {
            selectedRecipientIds,
            selectedListViewType
        } = this.state

        if (selectedListViewType === ListViewTypes.All) {
            return
        }

        let type = selectedListViewType === ListViewTypes.Lead ? 'Lead' : 'Contact'
        let page = 'MicroCampaign' + type

        let qsParams = {
            wrapMassAction: 1,
            scontrolCaching: 1,
            // this would normally be 'retUrl' in classic, but 'vfRetURLInSFX' can be used as a hack until the salesforce package is updated
            vfRetURLInSFX: location.toString()
        }

        let formUrl = interPackageVisualforceLink(page, EngageReportsPackageNamespace, PardotPackageNamespace, qsParams)

        return (
            <div className='slds-float--right'>
                <form action={formUrl} method='post'>
                    {selectedRecipientIds.map(id =>
                        <input type='hidden' name='ids' value={id} key={id}/>
                    )}
                    <input type='submit' value='Send Engage Email' className='slds-button slds-button--neutral' disabled={selectedRecipientIds.length === 0} />
                </form>
            </div>
        )
    }

    renderListViewTypeDropdown(name, recipients) {
        let items = getListViewDropdownItems(recipients)
        if (items.length === 0) {
            return null
        }

        let { selectedListViewType } = this.state

        let header = selectedListViewType === ListViewTypes.All ? `All recipients: ${name}` : `${selectedListViewType}s: ${name}`
        let title = 'Select a list view type to create'
        let onItemSelected = (item) => {
            this.setState({
                selectedListViewType: item.key,
                selectedRecipientIds: []
            })
        }

        if (items.length === 1) {
            return header
        }

        return (
            <div>
                <Dropdown items={items} header={header} title={title} onItemSelected={onItemSelected} />
            </div>
        )
    }

    renderHeaderDropdown(selectedStat, send, template, recipients) {
        if (this.props.reportInstancesLoading()) {
            return null
        }

        if (send) {
            return this.renderListViewTypeDropdown(send.subject, recipients)
        } else if (template) {
            return this.renderListViewTypeDropdown(template.name, recipients)
        } else {
            return 'Nothing found'
        }
    }

    renderTemplateName(template) {
        if (!template) {
            return <p className="slds-text-body--regular slds-truncate slds-text-color--weak" title="Template field">Loading</p>
        } else if (template.id) {
            return (
                <p className="slds-text-body--regular slds-truncate" title="Template field">
                    <a onClick={this.templateClicked.bind(this, template.id)}>{template.name}</a>
                </p>
            )
        } else {
            return <p className="slds-text-body--regular slds-truncate slds-text-color--weak" title="Template field">self-drafted</p>
        }
    }

    renderPageHeaderRecipients(recipients) {
        return (
            <PageHeaderRecipientPage>
                <div>
                    {this.renderSubHeader(recipients)}
                </div>
            </PageHeaderRecipientPage>
        )
    }

    renderPageHeaderDetails(sendId, send) {
        if (this.props.reportInstancesLoading() || !sendId) {
            return <PageHeaderDetails />
        }

        let sentAt = send ? send.sentAt : null
        let sender = send ? send.owner : null
        return (
            <PageHeaderDetails {...this.props}>
                {this.renderDayHeaderStat(sentAt)}
                {this.renderSenderHeaderStat(sender)}
            </PageHeaderDetails>
        )
    }

    renderDayHeaderStat(sentAt) {
        if(!sentAt) {
            return null
        } else {
            let sentAtDate = this.props.formatDateForUserTimezone(sentAt, true)
            return (
                <div key="Sent_At">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Sent At">Sent At</p>
                    <p className="slds-text-body--regular slds-truncate" title="Sent At field">{sentAtDate}</p>
                </div>
            )
        }
    }

    // we will need to use this function after talking to UX about mocks
    renderDayHeaderStatForTemplate(dateRange, startDate, endDate) {
        let locale = this.props.userLocale || DefaultLocale
        let dateText = ""
        if (dateRange) {
            dateText = `Last ${DateRangePresets[dateRange].label}`
        } else {
            dateText = `${formatDateForUI(startDate, locale)} through ${formatDateForUI(endDate, locale)}`
        }
        return (
            <div>
                <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Sent At">Sent At</p>
                <p className="slds-text-body--regular slds-truncate" title="Sent At field">{dateText}</p>
            </div>
        )
    }


    renderSenderHeaderStat(sender) {
        if (!sender) {
            return null
        } else {
            return (
                <div key="Sender">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Sender">Sender</p>
                    <p className="slds-text-body--regular slds-truncate" title="Sent At field">{sender.name}</p>
                </div>
            )
        }
    }

    renderTemplateHeaderStat(template) {
        if (!template) {
            return null
        } else {
            return (
                <div key="Template">
                    <p className="slds-text-title slds-truncate slds-m-bottom--xx-small" title="Template">Template</p>
                    {this.renderTemplateName(template)}
                </div>
            )
        }
    }


    renderSubHeader(recipients) {
        if (this.props.reportInstancesLoading()) {
            return null
        }

        let numRecipients = recipients.length

        return (
            <div>
                <span>{numRecipients} {pluralize('Record', numRecipients)} </span>
                <span>({StatsMap[this.props.filters.page.selectedStat]})</span>
                <span> - Sorted by Name</span>
            </div>
        )
    }

    renderBody(selectedStat, sendId, send, recipients) {
        let error = this.errorModal()
        if (error != null) {
            return error
        }
        if (this.props.reportInstancesLoading() || this.props.sendStats.loading && recipients.length === 0) {
            return <Spinner size={Spinner.Sizes.Large} type={Spinner.Types.Default} />
        }

        let {
            dispatch,
            piPackageInstalled,
            sends,
            recipients: recipientDetails
        } = this.props

        if (sendId && !send) {
            return  <div className='slds-text-heading--medium'>Nothing found</div>
        }
        let {
            selectedRecipientIds,
            selectedListViewType
        } = this.state

        let onRecipientsSelected = this.onRecipientsSelected.bind(this)

        let isPiPackageInstalled = piPackageInstalled

        return <RecipientsList recipients={recipients} recipientDetails={recipientDetails} dispatch={dispatch} onRecipientsSelected={onRecipientsSelected} selectedRecipientIds={selectedRecipientIds} isPiPackageInstalled={isPiPackageInstalled} />
    }

    renderSmallSpinner() {
        return (
            <div className='slds-float--left slds-is-relative slds-m-left--medium'>
                <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
            </div>
        )
    }

    renderBadInputsError() {
        let { expandToAllTime } = this.props.filters.page
        return (
            <div>
                <PageHeader includeDateSelector={false} includeEmailDraftTypesControl={false} includeClientTypesControl={false} {...this.props} showDate={!expandToAllTime}>
                    Error
                </PageHeader>
                <div className='content-wrapper slds-p-around--medium slds-is-relative'>
                    <h2>One or more params is missing:</h2>
                    <ul>
                        <li>templateId</li>
                        <li>sendId</li>
                        <li>type</li>
                    </ul>
                </div>
            </div>
        )
    }
}

function getRecipients(sends, statsBySendId, selectedStat, sendId, templateId, send) {
    let recipients = []
    if (sendId && send) {
        recipients = getRecipientsOfSend(send, statsBySendId, selectedStat)
    } else if (templateId) {
        recipients = getRecipientsOfTemplate(sends, statsBySendId, selectedStat, templateId)
    }

    return dedupeRecipients(recipients)
}

function getListViewDropdownItems(recipients) {
    let containsLeads = recipients.find(r => r.type === RecipientDescriptions.Lead.Type)
    let containsContacts = recipients.find(r => r.type === RecipientDescriptions.Contact.Type)
    let items = []

    if (containsLeads && containsContacts) {
        items.push({
            label: 'All Recipients View',
            key: ListViewTypes.All
        })
    }

    if (containsLeads) {
        items.push({
            label: 'Leads View',
            key: ListViewTypes.Lead
        })
    }

    if (containsContacts) {
        items.push({
            label: 'Contacts View',
            key: ListViewTypes.Contact
        })
    }

    return items
}

function getRecipientsFilteredBySelectedListViewType(recipients, selectedListViewType) {
    if (selectedListViewType && selectedListViewType !== ListViewTypes.All) {
        return recipients.filter(r => r.type === selectedListViewType)
    }

    return recipients
}

function getRecipientsWithOpensClicks(send, statsBySendId, recipientDetails, selectedStat) {
    let recipientIdsWithOpensClicks = []
    if (StatsMap[selectedStat] === StatsMap['unopened'] || StatsMap[selectedStat] === StatsMap['unclicked']) {
        let stat = StatsMap[selectedStat] === StatsMap['unopened'] ? 'opens' : 'clicks'
        recipientIdsWithOpensClicks = getRecipientsOfSend(send, statsBySendId, recipientDetails, stat)
        recipientIdsWithOpensClicks = recipientIdsWithOpensClicks.map((recipient) => {
            return recipient.id
        })
    }
    return recipientIdsWithOpensClicks
}

function getRecipientsOfSend(send, statsBySendId, selectedStat) {
    let recipientIdsWithOpensClicks = getRecipientsWithOpensClicks(send, statsBySendId, selectedStat)
    let rawRecipientStats = statsBySendId[send.id]
    if (!rawRecipientStats) {
        return []
    }

    let recipientIds = {}
    let recipients = []

    for (let i = 0; i < rawRecipientStats.length; i++) {
        let rawStats = rawRecipientStats[i]
        if (!rawStats || !shouldFilterRecipientStatBySelectedStat(rawStats, selectedStat, recipientIdsWithOpensClicks)) {
            continue
        }
        let { recipientId } = rawStats
        if (recipientIds[recipientId]) {
            continue
        }

        recipientIds[recipientId] = true

        recipients.push({
            id: recipientId,
            type: recipientId.indexOf(RecipientDescriptions.Lead.Prefix) === 0 ? RecipientDescriptions.Lead.Type : RecipientDescriptions.Contact.Type
        })

    }

    return recipients
}

function shouldFilterRecipientStatBySelectedStat(rawStat, selectedStat, recipientIdsWithOpensClicks) {
    let inferredOpens = rawStat.opens + rawStat.clicks
    let inferredSends = rawStat.sends + inferredOpens
    let inferredDelivered = inferredSends - (rawStat.hardBounces + rawStat.softBounces)

    switch (selectedStat) {
        case 'sends':
        case 'totalSent':
        case 'totalSends':
            return inferredSends > 0
        case 'delivered':
        case 'totalDelivered':
            return inferredDelivered > 0
        case 'opens':
        case 'totalOpens':
        case 'uniqueOpens':
            return inferredOpens > 0
        case 'clicks':
        case 'totalClicks':
        case 'uniqueClicks':
            return rawStat.clicks > 0
        case 'unsubscribes':
        case 'totalUnsubscribes':
            return rawStat.unsubscribes > 0
        case 'hardBounces':
        case 'totalHardBounces':
            return rawStat.hardBounces > 0
        case 'softBounces':
        case 'totalSoftBounces':
            return rawStat.softBounces > 0
        case 'unopened':
        case 'totalUnopened':
            return !recipientIdsWithOpensClicks.includes(rawStat.recipientId) && inferredDelivered > 0 && inferredOpens < 1
        case 'unclicked':
        case 'totalUnclicked':
            return !recipientIdsWithOpensClicks.includes(rawStat.recipientId) && inferredDelivered > 0 && rawStat.clicks < 1
    }
}

function getTemplate(sends, templateId) {
    if (templateId) {
        for (let i = 0; i < sends.length; i++) {
            if (sends[i].template.id === templateId) {
                return sends[i].template
            }
        }
    }

    return null
}

function getRecipientsOfTemplate(sends, statsBySendId, selectedStat, templateId) {
    let recipients = []
    for (let i = 0; i < sends.length; i++) {
        let send = sends[i]
        if (send.template.id !== templateId) {
            continue
        }
        let sendRecipients = getRecipientsOfSend(send, statsBySendId, selectedStat)

        recipients = recipients.concat(sendRecipients)
    }
    return recipients
}

function dedupeRecipients(recipients) {
    let recipientIds = {}
    let dedupedRecipients = []

    for (let i = 0; i < recipients.length; i++) {
        let recipient = recipients[i]
        if (recipientIds[recipient.id]) {
            continue
        }
        recipientIds[recipient.id] = true
        dedupedRecipients.push(recipient)
    }

    return dedupedRecipients
}
