import React, {Component} from 'react'
import Modal from './modal.jsx'

class ErrorPrompt extends Component {
    constructor(props) {
        super(props);

        // Bind `this` so callbacks have correct context
        this.cancelClick = this.cancelClick.bind(this);
        this.confirmClick = this.confirmClick.bind(this);
        this.keyHandler = this.keyHandler.bind(this);
    }

    cancelClick() {
        document.removeEventListener('keydown', this.keyHandler);

        if (this.props.cancelCallback) {
            this.props.cancelCallback();
        }

        if (this.props.singleButton && this.props.callback) {
            this.props.callback()
        }
    }

    confirmClick() {
        document.removeEventListener('keydown', this.keyHandler);

        if (this.props.callback) {
            this.props.callback();
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.keyHandler)
    }

    componentWillUnmount () {
        document.removeEventListener('keydown', this.keyHandler);
    }

    keyHandler(e) {
        // Catch 'escape' key
        if (e.which === 27) {
            this.cancelClick();
        }
    }

    render() {
        let errorPromptProps = {
            title: this.props.title,
            isError: true,
            confirmButton: {
                text: this.props.confirmText,
                callback: this.confirmClick
            }
        }

        return (
            <Modal {...errorPromptProps}>
                {this.props.message}
            </Modal>
        )
    }
}

ErrorPrompt.propTypes = {
    title: React.PropTypes.string.isRequired,
    tagline: React.PropTypes.node,
    confirmText: React.PropTypes.string,
    cancelText: React.PropTypes.string,
    callback: React.PropTypes.func,
    singleButton: React.PropTypes.bool,
}

ErrorPrompt.defaultProps = {
    confirmText: 'Okay',
    cancelText:  'Cancel',
    singleButton: false
}

export default ErrorPrompt;
