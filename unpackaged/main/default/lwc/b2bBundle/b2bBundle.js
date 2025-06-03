/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getPathPrefix } from "lightning/configProvider"; // Provides the path prefix to Core resources, like CMS (https://salesforce.quip.com/1FZjAXYICqML)

// CONTROLLER METHODS
import getBundleProducts from "@salesforce/apex/B2BBundle.getBundleProducts";
import getProductPrice from "@salesforce/apex/B2BBundle.getProductPrice";
import getItemQuantity from "@salesforce/apex/B2BBundle.getItemQuantity";
import addToCart from "@salesforce/apex/B2BBundle.addToCart";
import searchCurrentProductPageURL from "@salesforce/apex/B2BBundle.searchCurrentProductPageURL";
//import getRelatedProductInfo from "@salesforce/apex/B2BBundle.getRelatedIndividualProductInfo";

// STORE IDS
import USERID from "@salesforce/user/Id";
import COMMUNITYID from "@salesforce/community/Id";
import CURRENCY_CODE from "@salesforce/i18n/currency";
// import BASE_PATH from "@salesforce/community/basePath";

// LABELS ?

export default class B2bBundle extends NavigationMixin(LightningElement) {
	// LABELS
	labels = {};

	// STORE IDS
	communityId = COMMUNITYID;
	currencyCode = CURRENCY_CODE;
	userId = USERID;
	webstoreId;

	// These properties are set within experience builder and passed to the component
	@api effectiveAccountId;
	@api recordId;
	@api bundle_Title;
	@api bundle_Name;
	@api bundle_SKU;
	@api bundle_Quantity;
	@api bundle_UnitPrice;

	@track contactId;
	@track accountId;
	@track relatedProductUrl;

	@track myCurrentProductPageURL;
	@track CSModifiedProducts;
	@track nbBundleItems;
	@track url;
	@track qtyMap = new Map();

	resolve(url) {
		const cmsResourceUrlPattern = /^\/cms\//;
		const b2bStaticImageResourcePattern = /^\/img\//;

		if (cmsResourceUrlPattern.test(url) || b2bStaticImageResourcePattern.test(url)) {
			url = `${getPathPrefix()}${url}`;
		}

		return url;
	}

	connectedCallback() {
        console.log("b2bBundle: connectedCallback()");
		this.nbBundleItems = 0;
		this.getItemsfromBundle();
	}

	handleQTYChange(event) {
		this.qtyMap.set(event.target.id, event.target.value);
	}

	handleClick(evt) {
		var ctarget = evt.currentTarget;
		var fullURL = ctarget.dataset.value;
		this.relatedProductPageRef = {
			type: "standard__webPage",
			attributes: {
				url: fullURL,
				actionName: "home"
			}
		};
		this[NavigationMixin.Navigate](this.relatedProductPageRef);
	}

	async getItemsfromBundle() {
		console.log("b2bBundle: getItemsfromBundle()");
		let myCSProducts;

		try {
			const myBundleProducts = await getBundleProducts({
				communityId: this.communityId,
				productID: this.recordId,
				effectiveAccountID: this.effectiveAccountId === "000000000000000" ? null : this.effectiveAccountId
			});

			myCSProducts = JSON.parse(JSON.stringify(myBundleProducts));

			this.nbBundleItems = myCSProducts.length;

			const myCurrentProductPageURL = await searchCurrentProductPageURL();

			for (let i = 0; i < myCSProducts.length; i++) {
				const productPrice = await getProductPrice({
					communityId: this.communityId,
					productId: myCSProducts[i].id,
					effectiveAccountId: this.effectiveAccountId === "000000000000000" ? null : this.effectiveAccountId
				});
				var itemQuantity = await getItemQuantity({
					currentProductId: this.recordId,
					myBundleItem: myCSProducts[i].id
				});

				myCSProducts[i].itemQuantity = itemQuantity;
				myCSProducts[i].fullUrl = myCurrentProductPageURL + myCSProducts[i].id;

				myCSProducts[i].myId = myCSProducts[i].id;
				myCSProducts[i].unitPrice = productPrice.unitPrice;
				myCSProducts[i].currencyIsoCode = productPrice.currencyIsoCode;

				let tempName = this.htmlDecode(myCSProducts[i].fields.Name);
				myCSProducts[i].fields.Name = tempName;

				let tempDesc = this.htmlDecode(myCSProducts[i].fields.Description);
				myCSProducts[i].fields.Description = tempDesc;

				if (myCSProducts[i].defaultImage.url != null) {
					myCSProducts[i].defaultImage.url = this.resolve(myCSProducts[i].defaultImage.url);
				}
			}
			this.CSModifiedProducts = await Promise.all(myCSProducts);
		} catch (error) {
			console.log(error);
		}
	}

	htmlDecode(input) {
		var e = document.createElement("textarea");
		e.innerHTML = input;
		// handle case of empty input
		return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
	}

	get hasProducts() {
		return this.nbBundleItems !== 0;
	}
}