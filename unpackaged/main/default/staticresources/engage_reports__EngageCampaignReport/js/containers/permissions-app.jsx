import React from 'react'
import Immutable from 'immutable'
import { connect } from 'react-redux'
import {
    fetchEngageUsers,
    selectPage,
    selectHasReportsPermSet,
    unassignReportsPermissionSetFromAllEngageUsers,
    tryToAssignReportsPermissionSetToUserBatch,
    assignReportsPermissionSetToAllEngageUsers
} from '../actions/permissions-actions'
import Permissions from '../components/permissions.jsx'
import {
    arrayFromLength
} from '../util'

class PermissionsApp extends React.Component {
    componentWillMount() {
        this.props.dispatch(
            fetchEngageUsers()
        )
    }

    componentDidUpdate() {
        let {
            batchSize,
            loading
        } = this.props.users

        if (batchSize === null && !loading) {
            this.props.dispatch(
                fetchEngageUsers()
            )
        }
    }

    render() {
        return (
            <div className='slds-scope'>
                <Permissions {...this.props} />
            </div>
        )
    }
}

function mapStateToProps(state) {
    return ensureImmutableState(state)
}

/**
    Converts state to an immutable object, then back to plain js object.
    This guarantees that a component cannot alter the global state.
    The best practice is to actually use immutable objects for the state in
    the reducer functions, but this is probably the most pragmatic solution
    that doesn't involve refactoring the whole project.

    @param state
    @return Object
*/
function ensureImmutableState(state) {
    return Immutable.fromJS(state).toJS()
}

export default connect(mapStateToProps)(PermissionsApp)
