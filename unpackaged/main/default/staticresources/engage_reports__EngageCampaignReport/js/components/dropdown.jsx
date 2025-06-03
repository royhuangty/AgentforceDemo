import React, { Component, PropTypes } from 'react'
import Svg from './svg.jsx'
import {
    filterDropdown,
    dropdownCloser,
    handleFilterDropdownClose,
    removeDropdownCloser
} from '../../../../js/dropdown-closer.js'

/**
    Expected props:
        @param title : String
        @param header: String || Element
        @param items : Object[] of { label, key }
        @param onItemSelected : function(selectedItem)
        @param tabIndex (optional)
*/
export default class Dropdown extends Component {
    constructor(props) {
        super(props)
        this.state = {
            open: false,
        }
        this.dropDownListener = handleFilterDropdownClose.bind(this)
    }

    componentWillMount() {
        dropdownCloser(filterDropdown, this.dropDownListener)
    }

    componentWillUnmount() {
        removeDropdownCloser(filterDropdown, this.dropDownListener)
    }

    toggle() {
        this.setState({
            open: !this.state.open
        })
    }

    itemClicked(item) {
        this.props.onItemSelected(item)
        this.close()
    }

    mouseDown(event) {
        let { dropdown } = this.refs
        let { target } = event

        if ((target !== dropdown && !dropdown.contains(target))) {
            return
        }

        event.preventDefault()
    }

    close() {
        this.setState({
            open: false
        })
    }

    getActiveOptionClass(item, activeFilter) {
         if (item.label == activeFilter) {
            return 'slds-is-selected'
        } else {
            return ''
        }
    }

    render() {
        let {
            title,
            items,
            tabIndex,
            header,
            activeFilter,
            dropDownCSS,
            labelCSS,
            disabled
        } = this.props
        let isOpenClass = this.state.open ? 'slds-is-open' : ''
        let tabIndexProp = {}
        if (tabIndex !== null && tabIndex !== undefined) {
            tabIndexProp = { tabIndex: tabIndex || '0' }
        }
        if (dropDownCSS === null || dropDownCSS === undefined) {
            dropDownCSS = 'slds-dropdown--left slds-dropdown--small';
        }
        if (labelCSS === null || labelCSS === undefined) {
            labelCSS = 'slds-text-heading--small';
        }

        let focusClass = disabled ? '' : 'slds-type-focus'

        return (
            <span className={`slds-m-right--large slds-p-bottom--small ${labelCSS}`}>
                <div className={`slds-dropdown-trigger slds-dropdown-trigger--click slds-p-bottom--xxx-small ${isOpenClass}`} onMouseDown={this.mouseDown.bind(this)}>
                    <button {...tabIndexProp} disabled={disabled} onBlur={this.close.bind(this)} onClick={this.toggle.bind(this, title)} className={`slds-button slds-button--reset ${focusClass} slds-truncate filter-dropdown`} aria-haspopup='true' title={title}>
                        <span className='slds-m-right--x-small capitalized'>{header}</span>
                        <Svg symbol='down' type={Svg.Types.Utility} className='slds-button__icon' />
                        <span className='slds-assistive-text capitalized'>{title}</span>
                    </button>
                    <div className={`slds-dropdown ${dropDownCSS}`} ref='dropdown'>
                        <ul className={`slds-dropdown__list slds-dropdown--length-${items.length}`} role='menu'>
                            {items.map(item =>
                                <li className={'slds-dropdown__item has-icon--left ' + this.getActiveOptionClass(item, activeFilter)} role='presentation' key={item.key}>
                                    <a onClick={this.itemClicked.bind(this, item)}>
                                        <span className="slds-icon_container slds-icon-text-default slds-m-right--small">
                                            <span>
                                                <Svg symbol='check' type={Svg.Types.Utility} className="slds-icon slds-icon--selected blue-check-mark slds-m-right--xx-small" aria-hidden="true" />
                                            </span>
                                            <span className="slds-assistive-text">Selected</span>
                                            <span className='slds-truncate capitalized'>{item.label}</span>
                                        </span>
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </span>
        )
    }
}

Dropdown.propTypes = {
    header: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf((propValue, key, componentName, location, propFullName) => {
        if (!propValue[key] || !propValue[key].key || !propValue[key].label) {
            let missing = !propValue[key] ? 'item' : !propValue[key].key ? 'key' : 'label'
            return new Error(`Invalid prop \`${propFullName}\` supplied to \`${componentName}\`. Missing ${missing}. Validation failed.`)
        }
    }),
    onItemSelected: PropTypes.func.isRequired,
    tabIndex: PropTypes.number,
    activeFilter: PropTypes.string,
    dropDownCSS: PropTypes.string,
    labelCSS: PropTypes.string,
    disabled: PropTypes.bool
}
