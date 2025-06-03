import React, { Component } from 'react'
import Spinner from './spinner.jsx'
import { fetchRecipientsDetails } from '../actions'
import { getSObjectPath, navigateToUrl } from '../../../../js/force-navigator'
import {
    PardotSyncTokens,
    RecipientDescriptions,
    ErrorMessages
} from '../report-constants'
import {
    sortObjectsByCallback
} from '../util'
import ErrorPrompt from './error-prompt.jsx'

export default class RecipientsList extends Component {
    constructor(props) {
        super(props)
        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }
    componentDidUpdate() {
        let { recipients } = this.props

        if (recipients.length === 0) {
            return
        }

        let idsByType = recipients
            .reduce((acc, recipient) => {
                return {
                    ...acc,
                    [recipient.type]: [...acc[recipient.type], recipient.id]
                }
            }, {
                [RecipientDescriptions.Lead.Type]: [],
                [RecipientDescriptions.Contact.Type]: []
            })

        Object.keys(idsByType).forEach((type) => {
            let ids = idsByType[type]
            if (!ids.length) {
                return
            }
            this.props.dispatch(
                fetchRecipientsDetails(type, ids)
            )
        })
    }

    allCheckboxesChanged(event) {
        let { checked } = event.target
        let {
            recipients,
            recipientDetails,
        } = this.props

        let ids = checked ? recipients
            .filter(r => {
                let detail = recipientDetails[r.id] || {}
                return !this.isRecipientDeleted(detail)
            })
            .map(r => r.id) : []
        this.props.onRecipientsSelected(ids)
    }

    singleCheckboxChanged(id, event) {
        let { selectedRecipientIds } = this.props
        let { checked } = event.target

        let ids = checked ? [...selectedRecipientIds, id] : selectedRecipientIds.filter(selectedId => selectedId !== id)
        this.props.onRecipientsSelected(ids)
    }

    render() {
        let {
            selectedRecipientIds,
            isPiPackageInstalled,
            recipientDetails
        } = this.props

        let recipients = sortObjectsByCallback(
            this.props.recipients
            // merge with details (name, email, company)
            .map(r => ({ ...r, ...recipientDetails[r.id] })),
            // sort by name
            (recipient => recipient.name)
        )

        const {error} = recipientDetails
        
        let hasLeads = !!recipients.find(r => r.type === RecipientDescriptions.Lead.Type)
        let hasContacts = !!recipients.find(r => r.type === RecipientDescriptions.Contact.Type)

        let showCheckboxes = isPiPackageInstalled && !(hasLeads && hasContacts);

        let company
        if (hasLeads && hasContacts) {
            company = 'Account/Company'
        } else if (hasContacts) {
            company = 'Account'
        } else {
            company = 'Company'
        }

        let allChecked = selectedRecipientIds.length === recipients.length

        return (
            <div className='slds-m-around--medium'>
                <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-table--fixed-layout'>
                    <thead>
                        <tr>
                            {error &&  <ErrorPrompt title="Insufficient Privileges" message={ErrorMessages.SendStatsInsufficientAccess} singleButton={true} callback={this.redirectToHome} />}
                            {showCheckboxes && <th><input type='checkbox' onChange={this.allCheckboxesChanged.bind(this)} checked={allChecked} /></th>}
                            <th className='slds-truncate' title='Name'>Name</th>
                            <th className='slds-truncate' title='Email'>Email</th>
                            <th className='slds-truncate' title={company}>{company}</th>
                            <th className='slds-truncate' title='Recipient Type'>Recipient Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipients.map(recipient => this.renderRecipient(recipient, showCheckboxes))}
                    </tbody>
                </table>
            </div>
        )
    }

    renderRecipient(recipient, showCheckboxes) {
        let detailColumns = []

        if (recipient.loading || recipient.loading === undefined) {
            detailColumns = [
                (<td key={0}>{this.renderSmallSpinner()}</td>),
                (<td key={1}>{this.renderSmallSpinner()}</td>)
            ]
        } else if (this.isRecipientDeleted(recipient)) {
            return <tr key={recipient.id}>
                <td/>
                <td className="slds-color__text_gray-7"><i>Deleted record</i></td>
                <td/>
                <td/>
            </tr>
        } else {
            detailColumns = [
                (<td key={0} className='slds-truncate' title={recipient.email}>{recipient.email}</td>),
                (<td key={1} className='slds-truncate' title={getRecipientCompanyElement(recipient)}>{getRecipientCompanyElement(recipient)}</td>)
            ]
        }

        let checked = !!this.props.selectedRecipientIds.find(id => id === recipient.id)

        return (
            <tr key={recipient.id}>
                {(() => {
                   if (showCheckboxes) {
                       return (
                           <td className='slds-truncate'>
                               <input type='checkbox' value={recipient.id} checked={checked} onChange={this.singleCheckboxChanged.bind(this, recipient.id)} />
                           </td>
                       )
                   }
                })()}

                <td className='slds-truncate' title={recipient.name}>
                    <a href='#' onClick={navigateToRecord.bind(this, recipient.id)}>
                        {recipient.name}
                    </a>
                </td>
                {detailColumns}
                <td className='slds-truncate' title={recipient.type}>{recipient.type}</td>
            </tr>
        )
    }

    renderSmallSpinner() {
        return (
            <div className='slds-float--left slds-is-relative slds-m-left--medium'>
                <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
            </div>
        )
    }

    isRecipientDeleted(recipient) {
        return !recipient.hasOwnProperty('email') || !recipient.hasOwnProperty('name')
    }
}

function getRecipientCompanyElement(recipient) {
        let isContact = recipient.type === RecipientDescriptions.Contact.Type
        let account = isContact ? recipient.account : null
        let companyName

        if (isContact) {
            if (account) {
                companyName = account.name
            }
        } else {
            companyName = recipient.company
        }

        if (companyName === PardotSyncTokens.Unknown) {
            companyName = ''
        }

        return isContact && companyName ? <a href='#' onClick={navigateToRecord.bind(RecipientsList,account.id)}>{companyName}</a> : companyName
}

function navigateToRecord(id) {
    window.open(getSObjectPath(id),'_blank')
}
