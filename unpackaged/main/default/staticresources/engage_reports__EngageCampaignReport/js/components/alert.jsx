import React from 'react'
import Svg from './svg.jsx'

export default class Alert extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            closed: false
        }
    }

    close(event) {
        this.setState({
            closed: true
        })

        if (this.props.onClose) {
            this.props.onClose()
        }
    }

    render() {
        let closedClass = this.state.closed ? 'closed' : ''

        return (
            <div className={`alert-wrapper ${closedClass} slds-m-bottom--small`}>
                <div className='slds-notify_container'>
                    <div className={`slds-notify slds-notify--alert slds-theme--${this.props.theme} slds-theme--alert-texture`} role='alert'>
                        <button className='slds-button slds-notify__close slds-button--icon-inverse' onClick={this.close.bind(this)} title='Close'>
                            <Svg type={Svg.Types.Utility} symbol='close' className='slds-button__icon' />
                            <span className='slds-assistive-text'>Close</span>
                        </button>
                        <span className='slds-assistive-text'>Info</span>
                        <h2>
                            <span>
                                {renderIcon(this.props.theme)}
                                {React.Children.toArray(this.props.children)}
                            </span>
                        </h2>
                    </div>
                </div>
            </div>
        )
    }
}

const renderIcon = (theme) => {
    let t = Alert.Themes

    switch (theme) {
        case t.Success:
            return (
                <span className='slds-icon_container slds-icon-action-approval slds-icon_container--circle slds-m-right--x-small'>
                    <Svg aria-hidden='true' className='slds-icon slds-icon--x-small' type={Svg.Types.Action} symbol='approval' />
                </span>
            )
        case t.Warning:
            return <Svg aria-hidden='true' className='slds-icon slds-icon--x-small slds-m-right--x-small slds-icon-text-default' type={Svg.Types.Utility} symbol='warning' />
        case t.Error:
            return <Svg aria-hidden='true' className='slds-icon slds-icon--x-small slds-m-right--x-small' type={Svg.Types.Utility} symbol='ban' />
        default:
            return null
    }
}


Alert.Themes = {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    None: 'none'
}

Alert.propTypes = {
    theme: React.PropTypes.string,
    onClose: React.PropTypes.func
}

Alert.defaultProps = {
    theme: Alert.Themes.None
}
