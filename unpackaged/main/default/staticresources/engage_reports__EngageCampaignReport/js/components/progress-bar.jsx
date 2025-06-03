import React from 'react'

export default class ProgressBar extends React.Component {
    render() {
        return (
            <div className='slds-progress-bar' aria-valuemin='0' aria-valuemax='100' aria-valuenow={this.props.percent} role='progressbar'>
                <span className='slds-progress-bar__value' style={{ width: `${this.props.percent}%` }}>
                    <span className='slds-assistive-text'>Progress: ${this.props.percent}%</span>
                </span>
            </div>
        )
    }
}
