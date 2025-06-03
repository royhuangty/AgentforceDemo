import React, {Component, PropTypes} from 'react'
import Svg from './svg.jsx'

export default class NoData extends Component {
    render() {
        return (
            <div className="slds-grid slds-grid--align-center slds-m-around--medium">
                <div className="slds-media__figure">
                    <span className="slds-icon_container" title="No data alert">
                        <Svg className='slds-icon slds-icon-text-default slds-icon--small' type={Svg.Types.Utility} symbol={'warning'}/>
                        <span className="slds-assistive-text">No data alert</span>
                    </span>
                </div>
                <div className='slds-text-body--regular slds-p-top--xx-small'>{this.props.message}</div>
            </div>
        )
    }
}
