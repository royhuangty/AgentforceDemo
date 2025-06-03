import { LightningElement, api } from "lwc";

import CURRENCY_CODE from "@salesforce/i18n/currency";
import BASE_PATH from "@salesforce/community/basePath";

// LABELS
import bankItemAdd from "@salesforce/label/c.B2B_MB_Bank_Item_Add";

export default class B2bMoodboardBankItem extends LightningElement {
	// custom labels
	labels = {
		moodboardBank: {
			bankItemAdd: bankItemAdd
		}
	};

	@api product;

	currencyCode = CURRENCY_CODE;

	connectedCallback() {
		// console.log("B2BMoodboardBankItem: connectedCallback()");
		// console.log("product", JSON.stringify(this.product));
	}

	renderedCallback() {
		// console.log("B2BMoodboardBankItem: renderedCallback()");
	}

	handleAdd(ev) {
		const addEvent = new CustomEvent("add", {
			// Pass shizz up to the parent component
			detail: this.product.id
		});
		this.dispatchEvent(addEvent);
	}

	// GETTERS & SETTERS
	get id() {
		return this.product.id;
	}

	get name() {
		return this.product.name;
	}

	get sku() {
		return this.product.fields.StockKeepingUnit.value;
	}

	get description() {
		return this.product.fields.Description.value;
	}

	get unitPrice() {
		return this.product.prices && this.product.prices.unitPrice
			? this.product.prices.unitPrice
			: false;
	}

	get communityName() {
		// used to change the CMS image source paths to one that includes the community name.
		//let path = BASE_PATH.replace("\/s\/", "");
		//console.log('communityName: ' + path);

		let path = BASE_PATH;
		let pos = BASE_PATH.lastIndexOf("/s");
		if (pos >= 0) {
			path = BASE_PATH.substring(0, pos);
		}

		return path;
	}

	get imageSrc() {
		let url = this.product.defaultImage.url;

		if (url.indexOf("/cms/delivery/media") >= 0) {
			const searchRegExp = /\/cms\/delivery\/media/g;

			url = url.replace(
				searchRegExp,
				this.communityName + "/cms/delivery/media"
			);
		}

		if (url.indexOf("/cms/media") >= 0) {
			const searchRegExp = /\/cms\/media/g;

			url = url.replace(
				searchRegExp,
				this.communityName + "/cms/delivery/media"
			);
		}

		return url;
	}
}