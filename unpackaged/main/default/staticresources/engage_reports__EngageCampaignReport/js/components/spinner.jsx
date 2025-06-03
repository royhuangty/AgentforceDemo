import React from 'react'

export default class Spinner extends React.Component {
    render() {
        let { size, type } = this.props
        size = size ? `--${size}` : '--medium'
        type = type ? `slds-spinner--${type}` : ''

        return (
            <div className='slds-spinner_container slds-is-relative slds-p-around--medium'>
                <div className={`slds-spinner ${type} slds-spinner${size}`} aria-hidden='false' role='alert'>
                    <div className='slds-spinner__dot-a'></div>
                    <div className='slds-spinner__dot-b'></div>
                </div>
            </div>
        )
    }
}

Spinner.Sizes = {
    Small: 'small',
    Medium: 'medium',
    Large: 'large'
}

Spinner.Types = {
    Default: '',
    Brand: 'brand',
    Inverse: 'inverse'
}

Spinner.propTypes = {
    size: React.PropTypes.string,
    type: React.PropTypes.string
}
