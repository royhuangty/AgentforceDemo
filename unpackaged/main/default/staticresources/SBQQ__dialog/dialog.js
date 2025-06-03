/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * A Dialog component implementation that can replace the native browser dialogs:
 * alert, confirm, prompt
 * 
 * API:
 *  sb.dialog.alert(msg, opts, cb);
 *  sb.dialog.confirm(msg, opts, cb);
 *  sb.dialog.prompt(msg, opts, cb);
 * 
 * where
 *   msg {String} A message to display in the dialog
 *   opts {Object} Must contain "ok" and "cancel" properties for localized button labels
 *   cb {Function} The callback function to be invoked when user closes the dialog. The return value is same as native browser apis.
 *
 * Events:
 *   You can attach event listeners for these events emitted by this component:
 *   "create" - dialog is created an attached to DOM
 *   "show" - dialog has been opened
 *   "hide" - dialog has been closed
 *  
 * @example:
 *   <apex:commandButton id="save" action="{!save}" value="Save"
 *     onclick="event.preventDefault(); sb.dialog.confirm(
 *       'Are you sure?', 
 *       {ok: 'Ok', cancel: 'Cancel'},
 *       (ret) => { if(ret) this.form.submit()) }
 *     )" />
 */
window.sb = window.sb || {}; // don't pollute global namespace

sb.dialog = (() => {

	const focusableSelectors = [
		'a[href]:not([tabindex^="-"])',
		'area[href]:not([tabindex^="-"])',
		'input:not([type="hidden"]):not([type="radio"]):not([disabled]):not([tabindex^="-"])',
		'input[type="radio"]:not([disabled]):not([tabindex^="-"])',
		'select:not([disabled]):not([tabindex^="-"])',
		'textarea:not([disabled]):not([tabindex^="-"])',
		'button:not([disabled]):not([tabindex^="-"])',
		'iframe:not([tabindex^="-"])',
		'audio[controls]:not([tabindex^="-"])',
		'video[controls]:not([tabindex^="-"])',
		'[contenteditable]:not([tabindex^="-"])',
		'[tabindex]:not([tabindex^="-"])',
	]

	const TAB_KEY = 9;
	const ESC_KEY = 27;
	const ID_PREFIX = 'cpqDialog';  // prefix of the dialog ID
	let num = 0; // counter value, appended to ID_PREFIX to make multiple nested dialog DOM elements unique

	// CSS class names
	const CSS = {
		Buttons: 'sfdc-dialog-buttons',
		DialogContainer: 'sfdc-dialog-container',
		DialogContent: 'sfdc-dialog-content',
		PrimaryButton: 'sfdc-dialog-button-primary',
		Overlay: 'sfdc-dialog-overlay'
	}

	/** A basic dialog component that can replace native alert/confirm/prompt browser functions */
	class ACPDialog {

		/**
		 * Constructor
		 *
		 * @constructor
		 * @param {String} message the message to display in the UI
		 * @param {Object} opts addtional "options" for the dialog, e.g. labels of buttons "ok" and "cancel"
		 * @param {Function} cb the callback function to invoke when the user "closes" the dialog
		 * @param {Object} defaultValue For prompt dialogs, the defaultValue to return if the user enters nothing
		 */
		constructor(message, opts, cb, defaultValue) {
			// Prebind the functions to not lose the "this" value in event listeners
			this._hide = this.hide.bind(this);
			this._maintainFocus = this._maintainFocus.bind(this);
			this._bindKeypress = this._bindKeypress.bind(this);

			this._isOpen = false;
			this._previouslyFocused = null;
			this._listeners = {};
			this._cb = cb;
			this._opts = opts;

			this.$el = this._initDOM(message, defaultValue);
			this._id = this.$el.id;

			// Initialise everything needed for the dialog to work properly
			return this.create();
		}

		/** Create the dynamic DOM element(s) for the dialog and append to DOM */
		_initDOM(message, defaultValue) {
			const id = `${ID_PREFIX}${num++}`;
			const inputElement = this._getInputElement(defaultValue);
			const cancelButton = this._getCancelButton();
			const okButton = this._getOkButton();

			let el = document.createElement('div');
			ACPDialog.setAttributes(el, {
				id: id,
				'class': CSS.DialogContainer,
				role: 'alertdialog',
				'aria-labelledby': message,
				'aria-hidden': 'true',
				'aria-modal': 'true',
				tabindex: '-1'
			});

			el.innerHTML = `
		<div class="${CSS.Overlay}"></div>
		<div role="document" class="${CSS.DialogContent}">
			<p>${message}</p>
			${inputElement}
			<div class="${CSS.Buttons}">
				${cancelButton}
				${okButton}
			</div>
		</div>`;

			document.body.appendChild(el);
			return el;
		}

		/**
		 * Set up everything necessary for the dialog to be functioning
		 *
		 * @param {(NodeList | Element | string)} targets
		 * @return {this}
		 */
		create() {
			// Keep a collection of dialog closers, each of which will be bound a click event listener to close the dialog
			this._closers = ACPDialog.$$('[data-sfdc-dialog-hide]', this.$el);
			this._closers.forEach( (closer) => {
				closer.addEventListener('click', this._hide);
			});

			return this._fire('create');
		}

		/**
		 * Show the dialog element, disable all the targets (siblings), trap the
		 * current focus within it, listen for some specific key presses and fire all
		 * registered callbacks for `show` event
		 *
		 * @param {Event} event
		 * @return {this}
		 */
		show(event) {
			// abort if already open
			if (this._isOpen) {
				return this;
			}

			// Keep a reference to the currently focused element to be able to restore it later
			this._previouslyFocused = document.activeElement;
			this.$el.removeAttribute('aria-hidden');
			this._isOpen = true;

			// Set the focus to the dialog element
			this._moveFocusToDialog();

			// Keep focus trapped inside the dialog while open, and listening for key presses (TAB and ESC)
			document.body.addEventListener('focus', this._maintainFocus, true);
			document.addEventListener('keydown', this._bindKeypress);

			return this._fire('show', event);
		}

		/**
		 * Hide the dialog element, enable all the targets (siblings), restore the
		 * focus to the previously active element, stop listening for some specific
		 * key presses and fire all registered callbacks for `hide` event
		 *
		 * @param {Event} event
		 * @return {this}
		 */
		hide(event, forceCancel) {
			// abort if already closed
			if (!this._isOpen) {
				return this;
			}

			this._isOpen = false;
			this.$el.setAttribute('aria-hidden', 'true');

			// Restore the focus back to previously focused element
			if (this._previouslyFocused && this._previouslyFocused.focus) {
				this._previouslyFocused.focus();
			}

			// Cleanup event listeners
			document.body.removeEventListener('focus', this._maintainFocus, true);
			document.removeEventListener('keydown', this._bindKeypress);

			this._closers.forEach((closer) => {
				closer.removeEventListener('click', this._hide);
			});

			this._listeners = {};

			// Cleanup DOM
			document.body.removeChild(this.$el);

			// Execute callback function
			if(this._cb && typeof this._cb === 'function') {
				this._executeCallback(event);
			}

			return this._fire('hide', event);
		}

		/**
		 * Register a new callback for the given event type
		 *
		 * @param {string} type
		 * @param {Function} handler
		 */
		on(type, handler) {
			if (typeof this._listeners[type] === 'undefined') {
				this._listeners[type] = [];
			}

			this._listeners[type].push(handler);
			return this;
		}

		/**
		 * Unregister an existing callback for the given event type
		 *
		 * @param {string} type
		 * @param {Function} handler
		 */
		off(type, handler) {
			var index = (this._listeners[type] || []).indexOf(handler);

			if (index > -1) {
				this._listeners[type].splice(index, 1);
			}

			return this;
		}

		/**
		 * Iterate over all registered handlers for given type and call them all with
		 * the dialog element as first argument, event as second argument (if any). Also
		 * dispatch a custom event on the DOM element itself to make it possible to
		 * react to the lifecycle of auto-instantiated dialogs.
		 *
		 * @access private
		 * @param {string} type
		 * @param {Event} event
		 */
		_fire(type, event) {
			let listeners = this._listeners[type] || [];
			let domEvent = new CustomEvent(type, { detail: event });

			this.$el.dispatchEvent(domEvent);

			listeners.forEach((listener) => {
				listener(this.$el, event);
			});

			return this;
		}

		/**
		 * Private event handler used when listening to some specific key presses
		 * (namely ESCAPE and TAB)
		 *
		 * @access private
		 * @param {Event} event
		 */
		_bindKeypress(event) {
			// If multiple dialogs are nested, the keypress should only apply to the most recent/top one
			if (!this.$el.contains(document.activeElement)) return;

			if (this._isOpen) {
				switch(event.which) {
					case TAB_KEY:
						this._trapTabKey(event); // Keep focus trapped within the dialog element
						break;
					case ESC_KEY:
						event.preventDefault();
						this.hide(event, true);
						break;
				}
			}
		}

		/** Set the focus to the first element with `autofocus` with the dialog or the dialog itself */
		_moveFocusToDialog() {
			let focused = this.$el.querySelector('[autofocus]') || this.$el;
			if(focused && focused.focus) focused.focus();
		}

		/**
		 * Private event handler used when making sure the focus stays within the
		 * currently open dialog
		 *
		 * @access private
		 * @param {Event} event
		 */
		_maintainFocus(event) {
			// If focus is not within a dialog element move it back to its first focusable child
			if (
				this._isOpen &&
				!event.target.closest('[aria-modal="true"]') &&
				!event.target.closest('[data-sfdc-dialog-ignore-focus-trap]')
			) {
				this._moveFocusToDialog();
			}
		}

		/**
		 * Trap the focus inside the dialog
		 * @param {Event} event
		 */
		_trapTabKey(event) {
			let focusableChildren = ACPDialog.$$(focusableSelectors.join(','), this.$el).filter((child) => {
				return !!( child.offsetWidth || child.offsetHeight || child.getClientRects().length);
			});

			let focusedItemIndex = focusableChildren.indexOf(document.activeElement);

			// If SHIFT+TAB and the currently focused item is the first one, move the focus to the last
			// focusable item inside the dialog element
			if (event.shiftKey && focusedItemIndex === 0) {
				focusableChildren[focusableChildren.length - 1].focus();
				event.preventDefault();
				// If SHIFT and the currently focused item is the last one, move the focus to the first 
				// focusable item inside the dialog element
			} else if (
				!event.shiftKey &&
				focusedItemIndex === focusableChildren.length - 1
			) {
				focusableChildren[0].focus();
				event.preventDefault();
			}
		}
	}

	/**
	 * Helper function to set DOM attributes on a element using a simple map object
	 * 
	 * @param {Object} element the element to set the attributes on
	 * @param {Object} map the Map of attribute names to values
	 */
	ACPDialog.setAttributes = function(element,map) {
		if(element && element.setAttribute && map) {
			for(const [key, value] of Object.entries(map))
				element.setAttribute(key,value);
		}
	}

	/**
	 * Better/helper version of document.querySelectorAll()
	 *
	 * @param {String} selector the CSS selector
	 * @param {Element} [context = document] the context element, used to scope the query
	 * @return {Array<Element>} all descendat elements matching the query
	 */
	ACPDialog.$$ = function(selector, context) {
		return Array.prototype.slice.call(((context || document).querySelectorAll(selector)));
	}

	/** An Alert dialog to replace alert() */
	class AlertDialog extends ACPDialog {
		_getInputElement() {
			return '';
		}

		_getCancelButton() {
			return '';
		}

		_getOkButton() {
			return `<button type="button" autofocus data-sfdc-dialog-hide class="${CSS.PrimaryButton}">${this._opts.ok}</button>`;
		}

		_executeCallback(e) {
			this._cb();
		}
	}

	/** Abstract class with common code for both Confirm and Prompt dialogs */
	class CPDialog extends ACPDialog {
		_getOkButton() {
			return `<button type="button" data-sfdc-dialog-hide class="${CSS.PrimaryButton}">${this._opts.ok}</button>`;
		}

		_isOkButtonEvent(e) {
			return e && e.target && e.target.classList ? e.target.classList.contains(CSS.PrimaryButton) : false;
		}
	}

	/** A Confirm dialog to replace confirm() */
	class ConfirmDialog extends CPDialog {
		_getInputElement() {
			return '';
		}

		_getCancelButton() {
			return `<button type="button" autofocus data-sfdc-dialog-hide>${this._opts.cancel}</button>`;
		}

		_executeCallback(e) {
			this._cb(this._isOkButtonEvent(e) ? true : false);
		}
	}

	/** A Prompt dialog to replace prompt() */
	class PromptDialog extends CPDialog {
		_getInputElement(defaultValue) {
			return `<input type="text" autofocus value="${defaultValue ? defaultValue : ''}"></input>`;
		}

		_getCancelButton() {
			return `<button type="button" data-sfdc-dialog-hide>${this._opts.cancel}</button>`;
		}

		_executeCallback(e) {
			this._cb(this._isOkButtonEvent(e) ? this.$el.querySelector('input').value : null);
		}
	}

	// expose the external API to the caller/user of this code
	return {
		/*
		* Shows a modal dialog to display a message.
		* @param message - message to be displayed in the modal dialog.
		*/
		alert(message, opts, cb) {
			new AlertDialog(message, opts, cb).show();
		},

		/*
		* Shows a modal dialog to prompt user to confirm an action.
		* @param message The message/question displayed to the user.
		* @param cb callback function to execute after user confirms the action.
		*/
		confirm(message, opts, cb) {
			new ConfirmDialog(message, opts, cb).show();
		},

		/*
		* Shows a modal dialog to prompt user to confirm an action.
		* @param message The message/question displayed to the user.
		* @param cb callback function to execute after user confirms the action.
		*/
		prompt(message, opts, cb, defaultValue) {
			new PromptDialog(message, opts, cb, defaultValue).show();
		}
	}

})();