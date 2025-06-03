import React from 'react'
import Alert from './alert.jsx'
import { shownBackfillAlert } from '../actions/report-actions'
const expirationDate = new Date('10/27/2017')

export default class BackfillAlert extends React.Component {
    render() {
        if (this.messageExpired()) {
            return null
        }

        return (
            <Alert theme={Alert.Themes.Warning} onClose={this.closed.bind(this)}>
                We're making some improvements to the way we store Engage email data for deleted records. You may experience some delays in loading new data the week of 10/23/17 - 10/27/17.
            </Alert>
        )
    }

    closed() {
        this.props.dispatch(
            shownBackfillAlert()
        )
    }

    messageExpired() {
        return new Date() > expirationDate
    }
}
