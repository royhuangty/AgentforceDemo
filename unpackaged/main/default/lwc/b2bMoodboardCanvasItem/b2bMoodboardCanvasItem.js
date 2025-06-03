import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import CURRENCY_CODE from "@salesforce/i18n/currency";
import BASE_PATH from "@salesforce/community/basePath";

// Moodboard Labels
import buttonClose from "@salesforce/label/c.B2B_MB_Button_Close";

export default class B2bMoodboardCanvasItem extends LightningElement {
	// Moodboard Labels
	labels = {
		moodboardItem: {
			buttonClose: buttonClose
		}
	};
	@api product;

	@api displayName;
	@api displaySku;
	@api displayPrice;

	currencyCode = CURRENCY_CODE;

	isInitialRender = true;

	@track showNubbin = false;

	@track pos1;
	@track pos2;
	@track pos3;
	@track pos4;
	@track offsetLeft = 0;
	@track offsetRight;
	@track offsetTop = 0;
	@track offsetBottom;
	@track minBoundX;
	@track maxBoundX;
	@track minBoundY;
	@track maxBoundY;

	@api positionTop;
	@api positionLeft;
	@api positionRight;
	@api positionBottom;
	@api boxWidth;
	@api boxHeight;
	@api zIndex = 0;

	connectedCallback() {
		console.log("B2BMoodboardCanvasItem: connectedCallback()");
		// console.log("product", JSON.stringify(this.product));

		this.positionLeft = this.product.left;
		console.log("positionLeft", JSON.stringify(this.positionLeft));

		this.positionTop = this.product.top;
		console.log("positionTop", JSON.stringify(this.positionTop));

		this.boxWidth = this.product.width;
		console.log("boxWidth", JSON.stringify(this.boxWidth));

		this.boxHeight = this.product.height;
		console.log("boxHeight", JSON.stringify(this.boxHeight));

		this.zIndex = this.product.zIndex;
		console.log("zIndex", JSON.stringify(this.zIndex));
	}

	renderedCallback() {
		// console.log("B2BMoodboardCanvasItem: renderedCallback()");

		if (this.isInitialRender) {
			console.log("initial render");
			this.isInitialRender = false;
		}
	}

	// HTML DRAG & DROP EVENTS
	handleDragStart(ev) {
		console.log("handleDragStart()");

		// hide drag image (https://github.com/salesforce/lwc/issues/1809) -- ETA FEB 2021
		// ev.dataTransfer.setDragImage(new Image(), 0, 0);
		ev.dataTransfer.setData("text/plain", ev.target.id);
		ev.dataTransfer.dropEffect = "move";

		ev.target.classList.add("dragging");

		this.boxHeight = ev.target.clientHeight;
		this.boxWidth = ev.target.clientWidth;

		this.minBoundX = 8;
		this.minBoundY = 8;
		this.maxBoundX = this.template.host.parentNode.offsetWidth - 8;
		this.maxBoundY = this.template.host.parentNode.offsetHeight - 8;

		this.pos1;
		this.pos2;
		this.pos3 = ev.clientX;
		this.pos4 = ev.clientY;
	}

	handleDrag(ev) {
		// console.log("handleDrag()");
		this.pos1 = this.pos3 - ev.clientX;
		this.pos2 = this.pos4 - ev.clientY;
		this.pos3 = ev.clientX;
		this.pos4 = ev.clientY;

		this.offsetLeft = ev.currentTarget.offsetLeft;
		this.offsetTop = ev.currentTarget.offsetTop;
	}

	handleDragEnd(ev) {
		console.log("handleDragEnd()");
		ev.target.classList.remove("dragging");

		const updateEvent = new CustomEvent("updateevent", {
			detail: {
				id: this.product.id,
				top: this.positionTop,
				left: this.positionLeft,
				height: this.boxHeight,
				width: this.boxWidth,
				zIndex: this.zIndex
			}
		});
		this.dispatchEvent(updateEvent);
	}

	handleClick(ev) {
		const clickEvent = new CustomEvent("clickevent", {
			// Pass shit up to the parent component
			detail: {
				id: this.product.id,
				zIndex: this.zIndex
			}
		});
		this.dispatchEvent(clickEvent);
	}

	handleRemove(ev) {
		const removeEvent = new CustomEvent("remove", {
			// Pass shit up to the parent component
			detail: this.product.id
		});
		this.dispatchEvent(removeEvent);
	}

	showTooltip() {
		console.log("showTooltip()");
		this.showNubbin = true;
	}

	hideTooltip() {
		console.log("hideTooltip()");
		this.showNubbin = false;
	}

	@api updateZIndex(z) {
		console.log("updateZIndex()", z);
		this.zIndex = z;

		const updateEvent = new CustomEvent("updateevent", {
			detail: {
				id: this.product.id,
				top: this.positionTop,
				left: this.positionLeft,
				height: this.boxHeight,
				width: this.boxWidth,
				zIndex: this.zIndex
			}
		});
		this.dispatchEvent(updateEvent);

		// this.product.zIndex = this.z;
		// console.log(JSON.stringify(this.product));
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

	get boxStyles() {
		// console.log("getBoxStyles()", this.product.id);
		/* console.log("getBoxStyles():positionLeft = ", this.positionLeft);
		  console.log("getBoxStyles():positionTop = ", this.positionTop);
		  console.log("getBoxStyles():zIndex = ", this.zIndex); */

		if (this.pos1 !== undefined) {
			this.positionLeft = this.offsetLeft - this.pos1;
		}

		if (this.pos2 !== undefined) {
			this.positionTop = this.offsetTop - this.pos2;
		}

		this.positionRight = this.positionLeft + this.boxWidth;
		this.positionBottom = this.positionTop + this.boxHeight;

		if (this.positionLeft <= this.minBoundX) {
			this.positionLeft = this.minBoundX;
		}

		if (this.positionRight >= this.maxBoundX) {
			this.positionLeft = this.maxBoundX - this.boxWidth;
		}

		if (this.positionTop <= this.minBoundY) {
			this.positionTop = this.minBoundY;
		}

		if (this.positionBottom >= this.maxBoundY) {
			this.positionTop = this.maxBoundY - this.boxHeight;
		}

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

		return `left: ${this.positionLeft}px; top: ${this.positionTop}px; background-image: url(${url}); z-index: ${this.zIndex}`;
	}

	errorCallback(err) {
		console.log("MoodboardItem: errorCallback()", err.message);

		this.dispatchEvent(
			new ShowToastEvent({
				title: "ERROR",
				message: err.message,
				variant: "error"
			})
		);
	}
}