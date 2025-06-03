import React from 'react'
import Svg from './svg.jsx'


export default class Combobox extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            id: `combobox_${Combobox._id++}`,
            focused: false,
            searchText: this.props.searchText || '',
            selectedKey: '',
            selectedValue: this.props.searchText || '',
            focusedItem: 0,
            filteredItems: this.getFilteredItems(''),
            displayText: ''
        };
    }

    componentDidMount() {
        document.addEventListener('keydown', this.keyHandler.bind(this));
    }

    componentWillUnmount () {
        document.removeEventListener('keydown', this.keyHandler.bind(this));
    }

    keyHandler(e) {
        switch (e.which) {
            case 27:  // Escape
                this.setState({displayText: this.state.selectedValue })
                if (this.input) {
                    this.input.blur();
                }
                break;
            case 40:  // Down
                this.setState({focusedItem: Math.min(this.state.filteredItems.length - 1, this.state.focusedItem + 1)});
                if (this.focused) this.focused.scrollIntoView(false);
                break;
            case 38:  // Up
                this.setState({focusedItem: Math.max(0, this.state.focusedItem - 1)});
                if (this.focused) this.focused.scrollIntoView(false);
                break;
            case 13:  // Enter
                if (this.state.focused) {
                    let item = this.state.filteredItems[this.state.focusedItem];
                    //prevent selecting invalid choices
                    if (item != null) {
                        this.selectItem(item.key, item.selectedText || item.value);
                    }
                    this.input.blur();
                }
                break;
        }
    }

    onBlur() {
        this.setState({
            focused: false,
            displayText: '',
            searchText: this.props.searchText
        });
    }

    onFocus() {
        this.setState({
            focused: true,
            displayText: '',
            filteredItems: this.getFilteredItems('')
        });
    }

    selectItem(key, value) {
        this.setState({
            selectedKey: key,
            selectedValue: value,
            displayText: ''
        });
        this.props.onSelect(key);
    }

    searchTextChanged(e) {
        let filteredItems = this.getFilteredItems(e.target.value);

        this.setState({
            displayText: e.target.value,
            filteredItems: filteredItems,
            focusedItem: Math.max(0, Math.min(filteredItems.length - 1, this.state.focusedItem))
        });
    }

    getFilteredItems(searchText) {
        if (!searchText) {
            return this.props.items;
        }

        const s = searchText.trim().toLowerCase();

        return this.props.items
            .filter(({value}) => value.trim().toLowerCase().indexOf(s) > -1);
    }

    renderListboxItem(x, i) {
        let focused = i === this.state.focusedItem ? 'slds-has-focus' : '';

        return (
            <li role="presentation" className="slds-listbox__item" key={x.key} onMouseDown={this.selectItem.bind(this, x.key, x.selectedText || x.value)}
                ref={(x) => {if (focused) this.focused = x}}>
                <span id={`${this.state.id}_listbox_option_${x.key}`} className={`slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta ${focused}`} role="option">
                    <span className="slds-media__body">
                        <span className="slds-listbox__option-text slds-listbox__option-text_entity">{x.value}</span>
                    </span>
                </span>
            </li>
        );
    }

    render() {
        let searchValue  = (this.state.displayText === '' && this.state.focused == false) ? this.props.searchText : this.state.displayText;
        return (
            <div className="slds-form-element">
                <label className="slds-form-element__label slds-float--left slds-m-top--x-small slds-text-align--right slds-p-right--small slds-text-color--weak" htmlFor={this.state.id}>{this.props.label}</label>

                <div className="slds-form-element__control">
                    <div className="slds-combobox_container">
                        <div className={'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click' + (this.state.focused ? ' slds-is-open' : '')}
                            aria-expanded={this.state.focused} aria-haspopup="listbox" role="combobox">
                            <div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right">
                                <input className="slds-input slds-combobox__input" id={this.state.id} aria-autocomplete="list"
                                    aria-controls={`${this.state.id}_listbox`} autoComplete="off" role="textbox"
                                    placeholder={this.props.placeholder} type="text"
                                    onFocus={this.onFocus.bind(this)} onBlur={this.onBlur.bind(this)}
                                    value={searchValue}
                                    onChange={this.searchTextChanged.bind(this)}
                                    disabled={this.props.disabled}
                                    ref={(input) => {this.input = input}} />

                                <span className="slds-icon_container slds-icon-utility-search slds-input__icon slds-input__icon_right" title="Search icon">
                                    <Svg className="slds-icon slds-icon slds-icon_x-small slds-icon-text-default" type={Svg.Types.Utility} symbol='search' />
                                    <span className="slds-assistive-text">Search</span>
                                </span>
                            </div>

                            <div id={`${this.state.id}_listbox`} role="listbox">
                                {
                                    this.state.filteredItems.length ?
                                        <ul className="slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid slds-dropdown_length-7" role="presentation">
                                            { this.state.filteredItems.map(this.renderListboxItem.bind(this)) }
                                        </ul>
                                        : null
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Combobox._id = 0;

Combobox.propTypes = {
    label: React.PropTypes.string,
    placeholder: React.PropTypes.string,
    items: React.PropTypes.array,
    onSelect: React.PropTypes.func,
    disabled: React.PropTypes.bool,
    searchText: React.PropTypes.string
}
