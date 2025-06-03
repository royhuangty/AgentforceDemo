import React, { Component, PropTypes } from 'react'
import {
    USERS_QUERY_BATCH_SIZE,
    UnassignAction,
    AssignAction,
    ErrorMessages
} from '../permissions-constants'
import {
    fetchEngageUsers,
    selectPage,
    selectHasReportsPermSet,
    assignReportsPermissionSetToAllEngageUsers,
    unassignReportsPermissionSetFromAllEngageUsers
} from '../actions/permissions-actions'
import {
    arrayFromLength
} from '../util'
import Spinner from './spinner.jsx'
import ErrorPrompt from './error-prompt.jsx'
import PermissionsModal from './permissions-modal.jsx'
import { navigateToUrl } from '../../../../js/force-navigator'

export default class Permissions extends Component {
    constructor(props) {
        super(props)
        this.redirectToHome = () => {
            navigateToUrl("/home/home.jsp?sdtd=1")
        }
    }
    actionTypeSelectChanged(event) {
        let hasReportsPermSet = event.target.value === UnassignAction
        this.props.dispatch(
            selectHasReportsPermSet(hasReportsPermSet)
        )
        this.props.dispatch(
            fetchEngageUsers()
        )
    }

    pageClicked(pageNumber) {
        let {
            filters,
            dispatch
        } = this.props

        if (filters.page === pageNumber) {
            return
        }

        dispatch(
            selectPage(pageNumber)
        )

        dispatch(
            fetchEngageUsers()
        )
    }

    submitClicked() {
        let {
            filters,
            users,
            dispatch
        } = this.props

        let assignmentAction = filters.hasReportsPermSet ? UnassignAction : AssignAction
        let numUsers = users.totalSize
        let s = numUsers > 1 ? 's' : ''
        let message = `This will ${assignmentAction} the Engage Reports Permission Set to ${numUsers} user${s}.`

        if (window.confirm(message)) {
            if (assignmentAction === AssignAction) {
                dispatch(
                    assignReportsPermissionSetToAllEngageUsers()
                )
            } else {
                dispatch(
                    unassignReportsPermissionSetFromAllEngageUsers()
                )
            }
        }
    }

    render() {
        let {
            filters,
            users,
            reportsPermSetAssignments,
            dispatch,
            userHasInsufficientAccess
        } = this.props

        let assignmentAction = filters.hasReportsPermSet ? UnassignAction : AssignAction
        if (userHasInsufficientAccess === true) {
            return (
                <ErrorPrompt
                    title="Insufficient Privileges"
                    message={ErrorMessages.FLS_PermSet}
                    singleButton={true}
                    callback={this.redirectToHome} />
            )
        }

        return (
            <div className='content-wrapper slds-p-around--medium slds-is-relative'>
                <PermissionsModal users={users} reportsPermSetAssignments={reportsPermSetAssignments} assignmentAction={assignmentAction} dispatch={dispatch}/>
                <h1 className='slds-text-heading--large slds-m-bottom--large'>Engage Reports (End User) Permission Set Assignment</h1>
                <div className='slds-m-horizontal--medium'>
                    <div className='slds-grid slds-grid--align-spread'>
                        <div>
                            <div className='slds-form-element'>
                                <label className='slds-form-element__label' for='perm-is-assigned'>Show</label>
                                <div className='slds-form-element__control'>
                                    <div className='slds-select_container'>
                                        <select onChange={this.actionTypeSelectChanged.bind(this)} defaultValue={assignmentAction} id='perm-is-assigned' className='slds-select'>
                                            <option value={AssignAction}>Unassigned Users</option>
                                            <option value={UnassignAction}>Assigned Users</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className='slds-form-element slds-text-align--right'>
                                <div className='slds-form-element__control'>
                                    <button disabled={users.totalSize === 0} onClick={this.submitClicked.bind(this)} id='submit-assign' className='slds-button slds-button--brand'>
                                        {assignmentAction} All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {this.renderUsers(assignmentAction)}
                {this.renderPagination()}
            </div>
        )
    }

    renderUsers(assignmentAction) {
        let {
            users,
            filters
        } = this.props

        console.log('Test');

        let batch = users.batches[filters.page] || []

        return (
            <div className='slds-p-around--medium slds-m-bottom--small'>
                {(() => {
                    let typeOfUsers = assignmentAction === UnassignAction ? 'Assigned' : 'Unassigned'
                    if (users.loading) {
                        return <Spinner size={Spinner.Sizes.Small} type={Spinner.Types.Default} />
                    } else if (users.totalSize === 0) {
                        return <h2 className='slds-text-heading--medium slds-m-bottom--medium'>No {typeOfUsers} Users Found</h2>
                    }

                    return (
                        <div>
                            <h2 className='slds-text-heading--medium slds-m-bottom--medium'>{typeOfUsers} Users with Salesforce Engage Permission Set</h2>
                            <table className='slds-table slds-table--bordered slds-table--cell-buffer slds-table--fixed-layout'>
                                <thead>
                                    <tr>
                                        <th className='slds-truncate'>Name</th>
                                        <th className='slds-truncate'>Email</th>
                                        <th className='slds-truncate'>Profile</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batch.map(user =>
                                        <tr key={user.id}>
                                            <td className='slds-truncate'>{user.name}</td>
                                            <td className='slds-truncate'>{user.email}</td>
                                            <td className='slds-truncate'>{user.profile.name}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                })()}
            </div>

        )
    }

    renderPagination() {
        let {
            filters,
            users
        } = this.props

        let totalPages = Math.ceil(users.totalSize / USERS_QUERY_BATCH_SIZE)

        if (totalPages < 2) {
            return null
        }

        return (
            <footer className='slds-utility-bar_container' role='footer'>
                <ul className='slds-utility-bar'>
                    {
                        arrayFromLength(totalPages, (i) => {
                            let currentPage = i + 1

                            let isActiveClass = currentPage === filters.page ? 'slds-is-active' : ''
                            return (
                                <li className='slds-utility-bar__item' key={i}>
                                    <button onClick={this.pageClicked.bind(this, currentPage)} className={`slds-button slds-utility-bar__action ${isActiveClass}`}>
                                        {currentPage}
                                    </button>
                                </li>
                            )
                        })
                    }
                </ul>
            </footer>
        )
    }
}
