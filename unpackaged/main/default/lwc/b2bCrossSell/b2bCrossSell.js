/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LightningElement, wire, api, track } from "lwc";

import communityId from "@salesforce/community/Id";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getCrossSellProducts from "@salesforce/apex/B2BCrossSell.getCrossSellProducts";
import getProductPrice from "@salesforce/apex/B2BCrossSell.getProductPrice";
import addToCart from "@salesforce/apex/B2BCrossSell.addToCart";
import searchCurrentProductPageURL from "@salesforce/apex/B2BCrossSell.searchCurrentProductPageURL";
// **************************** Alexandre Update Begin 07/2023*********************
import cartChanged from "@salesforce/messageChannel/lightning__commerce_cartChanged";
import basePathName from '@salesforce/community/basePath';
import {publish,MessageContext} from "lightning/messageService";
// https://developer.salesforce.com/docs/atlas.en-us.b2b_b2c_comm_dev.meta/b2b_b2c_comm_dev/b2b_b2c_comm_display_lwc_apis.htm
import { addItemsToCart, addItemToCart } from 'commerce/cartApi';
// **************************** Alexandre Update End 07/2023*********************


import { NavigationMixin } from "lightning/navigation";

// **************************** Alexandre Update Begin 07/2023 *********************
// Provides the path prefix to Core resources - Use for Image URL
//import { getPathPrefix } from "lightning/configProvider";
// **************************** Alexandre Update End   07/2023 *********************


// Custom Labels
import crossSell_AddToCart from "@salesforce/label/c.B2B_CS_Add_To_Cart_Button_Label";
import crossSell_Description from "@salesforce/label/c.B2B_CS_Description_Label";
import crossSell_MoreInformation from "@salesforce/label/c.B2B_CS_More_Information_Button_Label";

import cartUpdated from "@salesforce/label/c.B2B_CS_Cart_Updated";
import productAdded from "@salesforce/label/c.B2B_CS_Product_added_to_your_cart";
import errorDetected from "@salesforce/label/c.B2B_CS_Error_detected";

export default class B2bCrossSell extends NavigationMixin(LightningElement) {
	// **************************** Alexandre Update Begin 07/2023 *********************
	@wire(MessageContext)
	messageContext;
	// **************************** Alexandre Update End   07/2023 *********************

	// Custom Labels
	labels = {
		toast: {
			cartUpdated: cartUpdated,
			productAdded: productAdded,
			errorDetected: errorDetected
		},
		component: {
			addToCart: crossSell_AddToCart,
			description: crossSell_Description,
			moreInformation: crossSell_MoreInformation
		}
	};

	@api effectiveAccountId; // Gets or sets the effective account - if any - of the user viewing the product. @type {string}
	@api recordId; // Gets or sets the unique identifier of a product. @type {string}
	@api displayType;
	@api crossSell_Title; // Gets or sets the CrossSell Title. @type {string}
	@api productType;
	@api displayImages;
	@api displayDescription; // Active or inactive the Display Description @type {string}
	@api displayQty;

	@track contactId;
	@track accountId;
	@track relatedProductUrl;

	@track isGrid = false;
	@track isStacked = false;

	//Store the webstoreID
	@track myCurrentProductPageURL;
	@track CSModifiedProducts;

	//Nb of items retrieves
	@track nbRecommendedItems;

	@track url;

	//store quantity for each elements
	@track qtyMap = new Map();

	activeSections = ["b2bProdRecSection"];

	/**
	 * Gets the normalized effective account of the user.
	 *
	 * @type {string}
	 * @readonly
	 * @private
	 */
	get resolvedEffectiveAccountId() {
		const effectiveAcocuntId = this.effectiveAccountId || "";
		let resolved = null;

		if (
			effectiveAcocuntId.length > 0 &&
			effectiveAcocuntId !== "000000000000000"
		) {
			resolved = effectiveAcocuntId;
		}
		return resolved;
	}

	// Update Image URLs coming from CMS (URL or Uploaded images)
	resolve(url) {
		/**
		 * Regular expressions for CMS resources and for static B2B image resources -
		 * specifically the "no image" image - that we want to handle as though they were CMS resources.
		 */
		const cmsResourceUrlPattern = /^\/cms\//;
		const b2bStaticImageResourcePattern = /^\/img\//;
		// If the URL is a CMS URL, transform it; otherwise, leave it alone.
		if (
			cmsResourceUrlPattern.test(url) ||
			b2bStaticImageResourcePattern.test(url)
		) {

		// **************************** Alexandre Update Begin 07/2023 *********************

			//url = `${basePathName}${url}`;
		//#################
		//	IF LWR SITE
			if (document.getElementsByTagName("webruntime-app").length) {
				//window.console.log(document.getElementsByTagName("webruntime-app").length);
				url = basePathName + "/sfsites/c" + url;
			}
			else{
			url = basePathName + url;
		}
		}

return url;
		// if (this.template instanceof LWRComponent) {
    // The component is being used within an LWR template.
    // Add your logic here.
	//window.console.log( "yoyo :" +this.template );
//  }
		window.console.log( "## URL :" + url);
		window.console.log( "Prefix :" + basePathName);
		// **************************** Alexandre Update End   07/2023 *********************

	}

	/**
	 * Retrieve CrossSell Products on loading Page
	 */
	connectedCallback() {
		this.nbRecommendedItems = 0;
		this.getCSProducts();

		if (this.displayType === "Grid") this.isGrid = true;
		if (this.displayType === "Stacked") this.isStacked = true;
	}

	/**
	 * Add Quantity in map for each products
	 */
	handleQTYChange(event) {
		this.qtyMap.set(event.target.id, event.target.value);
		//window.console.log( "event.target.id: ",event.target.id," ",this.qtyMap.get(event.target.id));
	}

	/**
	 * Handles a user request to add the product to their active cart.
	 *
	 * @private
	 */
	addProductToCart(evt) {
		let qty = this.qtyMap.get(evt.target.id);
		if (!qty) qty = 1;

		console.log("add cart communityId", communityId);
		console.log(
			"add cart productId",
			evt.target.id.substring(0, evt.target.id.indexOf("-"))
		);
		console.log("add cart quantity", qty);
		console.log(
			"add cart effectiveAccountId",
			this.resolvedEffectiveAccountId
		);
	// **************************** Alexandre Update Begin 07/2023 *********************

		//#################
		//	IF LWR SITE
		if (document.getElementsByTagName("webruntime-app").length) {
		addItemToCart(evt.target.id.substring(0, evt.target.id.indexOf("-")), qty).then((fulfilled) => {
        console.log("added product to cart");  });
		}
		else{
	// **************************** Alexandre Update End   07/2023 *********************


		

		addToCart({
			communityId: communityId,
			productId: evt.target.id.substring(0, evt.target.id.indexOf("-")),
			quantity: qty,
			effectiveAccountId: this.resolvedEffectiveAccountId
		})
			.then((result) => {
				console.log(result);
				console.log("no errors");
				this.dispatchEvent(
					new ShowToastEvent({
						title: this.labels.toast.cartUpdated,
						message: this.labels.toast.productAdded,
						variant: "success"
					})
				);

				// Refresh the cart icon
				try {
	// **************************** Alexandre Update Begin 07/2023 *********************
					//https://help.salesforce.com/s/articleView?id=000389948&type=1
					publish(this.messageContext, cartChanged);
	// **************************** Alexandre Update End   07/2023 *********************

					this.dispatchEvent(
						new CustomEvent("cartchanged", {
							bubbles: true,
							composed: true
						})
					);
				} catch (err) {
					console.log("error: " + err);
				}
			})
			.catch((error) => {
				this.error = error;
				console.log("errors: " + JSON.stringify(error));

				this.dispatchEvent(
					new ShowToastEvent({
						title: this.labels.toast.errorDetected,
						message: error.message,
						variant: "error"
					})
				);
			});
		}
	// **************************** Alexandre Update Begin 07/2023 *********************

	}
	// **************************** Alexandre Update End   07/2023 *********************

	/**
	 * Access the Cross Sell Product on Click.
	 */
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

	//#################
	//##### NEW  ###### https://hicglobalsolutions.com/blog/lightning-web-components/
	//#################

	async getCSProducts() {
		let myCSProducts;
		let i;
		//window.console.log(" log: communityId: ", communityId);
		//window.console.log(" log: productID: ", this.recordId);
		//window.console.log(" log: effectiveAccountID: ",this.effectiveAccountId);
		try {
			const myCrossSellProducts = await getCrossSellProducts({
				communityId: communityId,
				productID: this.recordId,
				effectiveAccountID:
					this.effectiveAccountId === "000000000000000"
						? null
						: this.effectiveAccountId,
				productType: this.productType
			});
			//searchForProductMetadata(String cmsContentType, String cmsContentFieldName, String matchingRecord){
			//myContent = content;

			myCSProducts = JSON.parse(JSON.stringify(myCrossSellProducts));
			//window.console.log("myCrossSellProducts:", myCSProducts);
			this.nbRecommendedItems = myCSProducts.length;
			const myCurrentProductPageURL = await searchCurrentProductPageURL();

			for (i = 0; i < myCSProducts.length; i++) {
				//   window.console.log("######## THE PRE ID: ");
				//  window.console.log("######## THE ID: ", myCSProducts[i].id);
				// window.console.log("######## THE POST ID: ");
				let productPrice = await getProductPrice({
					communityId: communityId,
					productId: myCSProducts[i].id,
					effectiveAccountId:
						this.effectiveAccountId === "000000000000000"
							? null
							: this.effectiveAccountId
				});

				if (productPrice === null) {
					productPrice = {};
					productPrice.unitPrice = null;
					productPrice.currencyIsoCode = null;
				}

				if (this.effectiveAccountId === "000000000000000") {
					myCSProducts[i].showAddToCart = false;
				} else {
					myCSProducts[i].showAddToCart = true;
				}

				//console.log('productPrice: ' + productPrice);

				// **************************** Alexandre Update Begin 07/2023 *********************
				window.console.log("######## Product URL Part1 : ", myCurrentProductPageURL );
				window.console.log("######## Product URL Part2: ",  myCSProducts[i].id);
				window.console.log("######## Product URL Base: ",window.location.origin);
				window.console.log("######## Product URL Basepathname: ",basePathName);
				var finalbaseURl = window.location.origin + basePathName + "/product/";
				window.console.log("######## Product Final URL : ",finalbaseURl + myCSProducts[i].id);
				//Get URL link to CrossSell Product
				myCSProducts[i].fullUrl = finalbaseURl + myCSProducts[i].id;
				//myCSProducts[i].fullUrl = myCurrentProductPageURL + myCSProducts[i].id;
				// **************************** Alexandre Update End   07/2023 *********************


				//Get Unique Id for add to cart qty in case of two similar
				//myCSProducts[i].uniqueId = i + myCSProducts[i].id;
				//window.console.log("######## unique ID: ", myCSProducts[i].uniqueId);

				//Get Id of the
				myCSProducts[i].myId = myCSProducts[i].id;
				//window.console.log("######## My ID: ", myCSProducts[i].id);
				//     window.console.log("######## My ID: ", myCSProducts[i].myId);

				//  window.console.log("######## Final ID: ", myCSProducts[i].id);

				//    window.console.log("$$$$$ Price Global: ", productPrice);
				//  window.console.log( "$$$$$ Currenceiso value: ", productPrice.currencyIsoCode);
				// window.console.log("$$$$$ Price value: ", productPrice.unitPrice);
				//window.console.log("Name value: ", myCSProducts[i].fields.Name);
				//Get Price for this CrossSell Product
				myCSProducts[i].unitPrice = productPrice.unitPrice;
				//Get Currency for this CrossSell Product
				myCSProducts[i].currencyIsoCode = productPrice.currencyIsoCode;
				// window.console.log( "CurrencyISoCode value: ", myCSProducts[i].currencyIsoCode);
				//  window.console.log("Price value: ", myCSProducts[i].unitPrice);

				//window.console.log( "SKU value: ", myCSProducts[i].fields.StockKeepingUnit);
				//window.console.log( "Image Alternative value: ",myCSProducts[i].defaultImage.alternativeText);
				//Get (and update) Description for this CrossSell Product
				if (myCSProducts[i].fields.Description != null) {
					//window.console.log('myDescription:', myContent[i].contentNodes.Description.value);

					// window.console.log("Description Before: ", myCSProducts[i].fields.Description);
					myCSProducts[i].fields.Description = myCSProducts[
						i
					].fields.Description.replace(/&#39;/g, "'")
						.replace("&lt;/p&gt;", "")
						.replace("&lt;p&gt;", "")
						.replace("&quot;", '"')
						.replace("&lt;h1&gt;", "")
						.replace("&lt;/h1&gt;", "")
						.replace("&lt;br&gt;", "");
				}
				//window.console.log( "Description After: ", myCSProducts[i].fields.Description);
				//Get Image for this CrossSell Product
				if (myCSProducts[i].defaultImage.url != null) {
				  //window.console.log("URL value lulu : ", myCSProducts[i].defaultImage.url);
					myCSProducts[i].defaultImage.url = this.resolve(
						myCSProducts[i].defaultImage.url
					);
				//	window.console.log("URLNew  value: ", myCSProducts[i].defaultImage.url);
				}
			}
			// ### IMPORTANT REPLACE THE FOLLOWING LINE AND REMOVE AWAIT IN LOOP
			// Wait for every promise in the loop for getProductPrice
			//https://eslint.org/docs/rules/no-await-in-loop
			//this.CSModifiedProducts = await Promise.all(myCSProducts);
			this.CSModifiedProducts = myCSProducts;
		} catch (error) {
			window.console.log(error);
		}
	}

	handleSectionToggle(event) {
		const openSections = event.detail.openSections;

		if (openSections.length === 0) {
			this.activeSectionsMessage = "All sections are closed";
		} else {
			this.activeSectionsMessage =
				"Open sections: " + openSections.join(", ");
		}
	}

	/**
	 * Gets whether product information has been retrieved for display.
	 *
	 * @type {Boolean}
	 * @readonly
	 * @private
	 */
	get hasProducts() {
		return this.nbRecommendedItems !== 0;
	}
}