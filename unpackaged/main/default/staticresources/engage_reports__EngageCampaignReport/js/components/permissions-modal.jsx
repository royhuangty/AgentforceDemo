import React, { Component, PropTypes } from 'react'
import Spinner from './spinner.jsx'
import Modal from './modal.jsx'
import {
    UnassignAction,
    AssignAction,
    ApiAssignmentErrorStatusCodesToMessages,
    ErrorMessages
} from '../permissions-constants'
import ErrorPrompt from './error-prompt.jsx'
import {
    assignmentCompleteConfirmed
} from '../actions/permissions-actions'

export default class PermissionsModal extends Component {
    confirmAssignmentClicked() {
        this.props.dispatch(
            assignmentCompleteConfirmed()
        )
    }

    render() {
        let {
            users,
            reportsPermSetAssignments,
            assignmentAction
        } = this.props

        let {
            assignment,
            unassignment,
            loading,
            confirmed,
            error
        } = reportsPermSetAssignments

        let totalSuccess
        let totalErred = 0

        if (assignmentAction === AssignAction) {
            totalSuccess = assignment.assigned.length
            totalErred = assignment.unassignable.length
        } else {
            totalSuccess = unassignment.unassigned.length
        }

        if (!loading && !totalSuccess && !error || confirmed) {
            return null
        }

        let title
        let done = totalSuccess + totalErred === users.totalSize

        if (error === ErrorMessages.FLS_PermSet) {
            return (
                <ErrorPrompt
                    title="Insufficient Privileges"
                    message={error}
                    singleButton={true}
                    callback={this.confirmAssignmentClicked.bind(this)}/>
            )
        }

        if (error) {
            title = (
                <div className='slds-text-color--error'>
                    Error {assignmentAction}ing users
                </div>
            )
        } else if (done) {
            title = `${assignmentAction}ed "Engage Reports (End User)" permission set`
        } else {
            title = `${assignmentAction}ing "Engage Reports (End User)" permission set...`
        }

        return (
            <Modal confirmButton={{ text: 'Ok', disabled: !done, callback: this.confirmAssignmentClicked.bind(this) }} title={title} showHeaderCloseButton={false}>
                {(() => {
                    if (error) {
                        return this.renderError(error)
                    } else if (done) {
                        return this.renderDone(assignmentAction, totalSuccess, users.totalSize)
                    } else {
                        return this.renderProgress(assignmentAction, totalSuccess, users.totalSize)
                    }
                })()}
                {this.renderUnassignable(assignment.unassignable)}
            </Modal>
        )
    }

    renderError(error) {
        return (
            <div className='slds-text-heading--small'>
                {error}
            </div>
        )
    }

    renderDone(assignmentAction, totalSuccess, totalUsers) {
        return (
            <div className='slds-text-heading--small'>
                Successfully {assignmentAction}ed {totalSuccess} of {totalUsers} users
            </div>
        )
    }

    renderProgress(assignmentAction, totalSuccess, totalSize) {
        return (
            <div>
                <div className='slds-text-heading--small'>
                    {assignmentAction}ed {totalSuccess} users of {totalSize} users...
                </div>
                <div>
                    {(() => {
                        if (assignmentAction === UnassignAction) {
                            return <i>This could take a few minutes</i>
                        }
                    })()}
                </div>
                <div className='slds-p-around--large'>
                    <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
                </div>
            </div>
        )
    }

    renderUnassignable(unassignableUsers) {
        if (unassignableUsers.length === 0) {
            return null
        }

        // flatten user batches into single array
        let allUsers = Object.values(this.props.users.batches).reduce((all, batch) => all.concat(batch))

        let userErrors = unassignableUsers.map(({ userId, errors }) => ({
            user: allUsers.find(user => user.id === userId),
            errors
        }))

        return (
            <div className='slds-m-top--large'>
                <b>{unassignableUsers.length} Users were unassignable:</b>
                {userErrors.map(userError =>
                    <div key={userError.user.id}>
                        <div>
                            <span>{userError.user.name} </span>
                            <small>({userError.user.email})</small>
                        </div>
                        <ul className='slds-list--dotted slds-text-color--error'>
                            {userError.errors.map(error =>
                                <li key={error.statusCode}>
                                    <span>{ApiAssignmentErrorStatusCodesToMessages[error.statusCode] || error.message}</span>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        )
    }
}
