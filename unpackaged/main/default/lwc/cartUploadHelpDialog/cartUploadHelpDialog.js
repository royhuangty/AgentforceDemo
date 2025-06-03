import { LightningElement, track, api } from 'lwc';

import closeDialog from '@salesforce/label/c.B2B_Close_Dialog';

export default class CartUploadHelpDialog extends LightningElement {

    @api isOpen = false;

    @api contentId;
    @api contentType;

    label = {
        closeDialog
    };

    handleCloseModal(event) {
        this.dispatchEvent(new CustomEvent('closehelpdialog'));
    }

}