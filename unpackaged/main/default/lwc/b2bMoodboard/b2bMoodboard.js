import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import resolveCommunityIdToWebstoreId from "@salesforce/apex/B2B_Moodboard_Controller.resolveCommunityIdToWebstoreId";

import getProducts from "@salesforce/apex/B2B_Moodboard_Controller.getProducts";
import getMoodBoardNames from "@salesforce/apex/B2B_Moodboard_Controller.getMoodBoardNames";
import getMoodBoardData from "@salesforce/apex/B2B_Moodboard_Controller.getMoodBoardData";
import saveMoodBoard from "@salesforce/apex/B2B_Moodboard_Controller.saveMoodBoard";
import deleteMoodBoard from "@salesforce/apex/B2B_Moodboard_Controller.deleteMoodBoard";
import addMoodBoardProductsToTheCart from "@salesforce/apex/B2B_Moodboard_Controller.addMoodBoardProductsToTheCart";

import USERID from "@salesforce/user/Id";
import COMMUNITYID from "@salesforce/community/Id";
import CURRENCY_CODE from "@salesforce/i18n/currency";

// Toast Labels
import processingErrorTitle from "@salesforce/label/c.B2B_MB_Processing_Error_Title";
import searchErrorTitle from "@salesforce/label/c.B2B_MB_Search_Error_Title";
import noDefaultCategoryMessage from "@salesforce/label/c.B2B_MB_No_Default_Category_Message";
import distributeProductsErrorTitle from "@salesforce/label/c.B2B_MB_Distribute_Products_Error_Title";
import distributeProductsErrorMessage from "@salesforce/label/c.B2B_MB_Distribute_Products_Error_Message";
import saveErrorTitle from "@salesforce/label/c.B2B_MB_Save_Error_Title";
import saveErrorMessageNoProducts from "@salesforce/label/c.B2B_MB_Save_Error_Message_No_Products";
import deleteSuccess from "@salesforce/label/c.B2B_MB_Moodboard_deleted_successfully";

// Moodboard Labels
import largeScreensOnly from "@salesforce/label/c.B2B_MB_Large_Screens_Only";
import searchProductsPlaceholder from "@salesforce/label/c.B2B_MB_Search_Products_Placeholder";
import selectMoodboardPlaceholder from "@salesforce/label/c.B2B_MB_Select_Moodboard_Placeholder";
import saveAsPlaceholder from "@salesforce/label/c.B2B_MB_Save_As_Placeholder";
import deleteModalHeading from "@salesforce/label/c.B2B_MB_Delete_Modal_Heading";
import deleteModalDescription from "@salesforce/label/c.B2B_MB_Delete_Modal_Description";
import buttonSave from "@salesforce/label/c.B2B_MB_Button_Save";
import buttonSaveAs from "@salesforce/label/c.B2B_MB_Button_Save_As";
import buttonSaveNew from "@salesforce/label/c.B2B_MB_Button_Save_New";
import buttonCancel from "@salesforce/label/c.B2B_MB_Button_Cancel";
import buttonClear from "@salesforce/label/c.B2B_MB_Button_Clear";
import buttonDelete from "@salesforce/label/c.B2B_MB_Button_Delete";
import buttonDeleteConfirm from "@salesforce/label/c.B2B_MB_Delete_Modal_Button_Confirm";
import buttonClose from "@salesforce/label/c.B2B_MB_Button_Close";
import buttonAddToCart from "@salesforce/label/c.B2B_MB_Button_Add_To_Cart";
import altPleaseWait from "@salesforce/label/c.B2B_MB_Alt_Text_Please_Wait";
import altShowMenu from "@salesforce/label/c.B2B_MB_Alt_Text_Show_Menu";
import displayOptions from "@salesforce/label/c.B2B_MB_Display_Options";
import displayOptionName from "@salesforce/label/c.B2B_MB_Display_Option_Name";
import displayOptionSku from "@salesforce/label/c.B2B_MB_Display_Option_Sku";
import displayOptionPrice from "@salesforce/label/c.B2B_MB_Display_Option_Price";
import moodboardTotal from "@salesforce/label/c.B2B_MB_Total_Price";

export default class B2bMoodboard extends LightningElement {
	// Custom Labels
	labels = {
		toast: {
			processingErrorTitle: processingErrorTitle,
			searchErrorTitle: searchErrorTitle,
			noDefaultCategoryMessage: noDefaultCategoryMessage,
			distributeProductsErrorTitle: distributeProductsErrorTitle,
			distributeProductsErrorMessage: distributeProductsErrorMessage,
			saveErrorTitle: saveErrorTitle,
			saveErrorMessageNoProducts: saveErrorMessageNoProducts,
			deleteSuccess: deleteSuccess
		},
		moodboard: {
			largeScreensOnly: largeScreensOnly,
			searchProductsPlaceholder: searchProductsPlaceholder,
			selectMoodboardPlaceholder: selectMoodboardPlaceholder,
			saveAsPlaceholder: saveAsPlaceholder,
			deleteModalHeading: deleteModalHeading,
			deleteModalDescription: deleteModalDescription,
			buttonSave: buttonSave,
			buttonSaveAs: buttonSaveAs,
			buttonSaveNew: buttonSaveNew,
			buttonClear: buttonClear,
			buttonDelete: buttonDelete,
			buttonDeleteConfirm: buttonDeleteConfirm,
			buttonCancel: buttonCancel,
			buttonClose: buttonClose,
			buttonAddToCart: buttonAddToCart,
			altPleaseWait: altPleaseWait,
			altShowMenu: altShowMenu,
			displayOptions: displayOptions,
			displayOptionName: displayOptionName,
			displayOptionSku: displayOptionSku,
			displayOptionPrice: displayOptionPrice,
			moodboardTotal: moodboardTotal
		}
	};
	// These properties are set within experience builder and passed to the component
	@api effectiveAccountId;
	@api defaultCategoryId;
	@api includePrices;
	@api pageSize;

	@api displayNames = false;
	@api displaySKUs = false;
	@api displayPrices = false;

	@track showLoadingSpinner = false;
	@track searchTerm;
	@track products;
	@track productBank = [];
	@track moodBoard = [];
	//   @track listLength = 0;
	@track runningTotal = 0;
	@track currentZ = 0;

	@track isModalOpen = false;
	@track isSaveModal = false;
	@track isDeleteModal = false;

	@track moodBoardOptions;
	@track moodBoardName;
	@track moodBoardId;
	@track moodBoardData;

	communityId = COMMUNITYID;
	currencyCode = CURRENCY_CODE;
	userId = USERID;

	webstoreId;

	initialLoad = false;

	connectedCallback() {
		console.log("B2BMoodboard: connectedCallback()");
		console.log("effectiveAccountId: ", this.effectiveAccountId);
		console.log("communityId: ", this.communityId);

		if (!this.defaultCategoryId) {
			this.showLoadingSpinner = false;
			this.dispatchEvent(
				new ShowToastEvent({
					title: this.labels.toast.searchErrorTitle,
					message: this.labels.toast.noDefaultCategoryMessage,
					variant: "error"
				})
			);
		} else {
			console.log("defaultCategoryId: ", this.defaultCategoryId);
		}

		this.loadWebstoreId();
		this.loadMoodBoardOptions();
	}

	renderedCallback() {
		// console.log("Moodboard: renderedCallback()");
		if (this.initialLoad === true) return;

		if (this.defaultCategoryId && this.defaultCategoryId !== "") {
			this.initialLoad = true;
			this.doProductSearch(this.defaultCategoryId);
		}
	}

	loadWebstoreId() {
		console.log("loadWebstoreId()");
		resolveCommunityIdToWebstoreId({
			communityId: this.communityId
		})
			.then((result) => {
				if (result) {
					console.log("loadWebstoreId():result", result);
					this.webstoreId = result;
				}
			})
			.catch((error) => {
				console.log("loadWebstoreId():error", error);
				// console.log(error);
				this.showLoadingSpinner = false;
				this.dispatchEvent(
					new ShowToastEvent({
						title: this.labels.toast.searchErrorTitle,
						message: error.message,
						variant: "error"
					})
				);
			});
	}

	doProductSearch(catId) {
		console.log("doProductSearch()");

		this.showLoadingSpinner = true;

		getProducts({
			searchTerm: this.searchTerm,
			communityId: this.communityId,
			webstoreId: this.webstoreId,
			effectiveAccountId: this.effectiveAccountId,
			includePrices: this.includePrices,
			pageSize: this.pageSize,
			categoryId: catId
		})
			.then((result) => {
				this.showLoadingSpinner = false;

				if (result) {
					console.log("doProductSearch():success", result);

					if (
						result.searchResults &&
						result.searchResults != null &&
						result.searchResults != ""
					) {
						const searchResults = JSON.parse(result.searchResults);

						const moodBoardString = JSON.stringify(this.moodBoard);
						const moodBoardParse = JSON.parse(moodBoardString);
						let prodBankTemp = searchResults.productsPage.products;

						if (moodBoardParse !== undefined && moodBoardParse.length !== 0) {
							// Remove current MoodBoard products from ProdBank
							prodBankTemp = prodBankTemp.filter(function (cv) {
								return !moodBoardParse.find(function (e) {
									return e.id === cv.id;
								});
							});
						}

						this.productBank = prodBankTemp;
						//   console.log("this.productBank", JSON.stringify(this.productBank));
					}

					this.processMessages(result);
				}
			})
			.catch((error) => {
				this.processError(error);
			});
	}

	loadMoodBoardOptions() {
		console.log("loadMoodBoardOptions()");
		getMoodBoardNames({
			userId: this.userId,
			effectiveAccountId: this.effectiveAccountId
		})
			.then((result) => {
				console.log("loadMoodBoardOptions(): success");

				let options = [];

				Object.keys(result).forEach(function (key) {
					options.push({ label: result[key], value: key });
				});

				options.sort((a, b) => (a.label > b.label ? 1 : -1));
				console.log("options", options);

				this.moodBoardOptions = options;
			})
			.catch((error) => {
				console.log("loadMoodBoardOptions(): error");
				console.log(error);

				this.showLoadingSpinner = false;

				this.dispatchEvent(
					new ShowToastEvent({
						title: this.label.processingErrorTitle,
						message: error.message,
						variant: "error"
					})
				);
			});
	}

	loadMoodboard() {
		console.log("loadMoodboard()");

		console.log("communityId: " + this.communityId);
		console.log("webstoreId: " + this.webstoreId);
		console.log("moodBoardId: " + this.moodBoardId);

		this.moodBoard = null;

		this.showLoadingSpinner = true;

		getMoodBoardData({
			userId: this.userId,
			moodBoardId: this.moodBoardId,
			communityId: this.communityId,
			webstoreId: this.webstoreId,
			effectiveAccountId: this.effectiveAccountId,
			includePrices: this.includePrices
		})
			.then((result) => {
				console.log("getMoodBoardData():result");
				console.log(result);
				const data = JSON.parse(result);

				this.showLoadingSpinner = false;
				this.moodBoard = data;

				// Update Running Total
				this.updateTotal();

				// Load default product bank
				this.doProductSearch(this.defaultCategoryId);
			})
			.catch((error) => {
				console.log("loadMoodboard():error");
				console.log(error);
				this.showLoadingSpinner = false;

				this.dispatchEvent(
					new ShowToastEvent({
						title: this.label.processingError,
						message: error.body.message,
						variant: "error"
					})
				);
			});
	}

	handleMoodboardOptionChange(ev) {
		console.log("handleMoodboardOptionChange()");
		this.moodBoardId = ev.detail.value;

		for (let i = 0; i < this.moodBoardOptions.length; i++) {
			if (this.moodBoardOptions[i].value === this.moodBoardId) {
				this.moodBoardName = this.moodBoardOptions[i].label;
				break;
			}
		}

		if (this.moodBoardId && this.moodBoardId !== "") {
			this.loadMoodboard();
		}
	}

	handleMoodboardNameChange(ev) {
		console.log("handleMoodboardNameChange()");
		this.moodBoardName = ev.detail.value;
	}

	handleInputCommit(ev) {
		console.log("handleInputCommit()");
		let value = ev.target.value;
		this.searchTerm = value;

		if (value === "") {
			this.doProductSearch(this.defaultCategoryId);
		} else {
			this.doProductSearch(null);
		}
	}

	handleAdd(ev) {
		let productId = ev.detail;
		console.log("handleAdd()", productId);

		const prodBankFilter = this.productBank.filter(
			(product) => product.id !== productId
		);

		const moodBoardFilter = this.productBank.filter(
			(product) => product.id === productId
		);

		moodBoardFilter[0].sequence = null;
		moodBoardFilter[0].top = null;
		moodBoardFilter[0].left = null;
		moodBoardFilter[0].height = null;
		moodBoardFilter[0].width = null;
		moodBoardFilter[0].zIndex = null;

		this.productBank = prodBankFilter;
		this.moodBoard.push(moodBoardFilter[0]);

		// Update Running Total
		this.updateTotal();
	}

	handleRemove(ev) {
		console.log("handleRemove()");

		let productId = ev.detail;
		console.log("productId", productId);

		const prodBankFilter = this.moodBoard.filter(
			(product) => product.id === productId
		);

		const moodBoardFilter = this.moodBoard.filter(
			(product) => product.id !== productId
		);

		this.moodBoard = moodBoardFilter;
		// console.log("this.moodBoard", JSON.stringify(this.moodBoard));

		this.productBank.push(prodBankFilter[0]);
		// console.log("this.productBank", JSON.stringify(this.productBank));

		// Update Running Total
		this.updateTotal();
	}

	handleClearMoodboard() {
		console.log("handleClearMoodboard()");

		this.moodBoard = [];
		this.currentZ = 0;
		this.moodBoardId = null;
		this.moodBoardName = null;

		if (this.searchTerm) {
			this.doProductSearch(this.searchTerm);
		} else {
			this.doProductSearch(this.defaultCategoryId);
		}

		this.runningTotal = 0;
	}

	handleSaveMoodboard(ev) {
		console.log("handleSaveMoodboard()");

		let saveType = ev.currentTarget.dataset.id;
		let moodboardID;

		if (saveType === "save") {
			moodboardID = this.moodBoardId;
		}

		if (saveType === "save-as") {
			moodboardID = null;
		}

		this.showLoadingSpinner = true;

		let moodBoardString = JSON.stringify(this.moodBoard);
		let moodBoardParse = JSON.parse(moodBoardString);
		let moodBoardTEMP = [];
		let moodBoardJSON;

		if (moodBoardParse === undefined || moodBoardParse.length === 0) {
			console.log("NO PRODUCTS IN MOODBOARD");

			this.showLoadingSpinner = false;

			this.dispatchEvent(
				new ShowToastEvent({
					title: this.labels.toast.saveErrorTitle,
					message: this.labels.toast.saveErrorMessageNoProducts,
					variant: "error"
				})
			);

			return;
		} else {
			const mbLength = moodBoardParse.length;
			console.log("Saving " + mbLength + " products");

			for (const prod of moodBoardParse) {
				let prodObj = {};

				prodObj.id = prod.id;
				prodObj.t = prod.top;
				prodObj.l = prod.left;
				prodObj.h = prod.height;
				prodObj.w = prod.width;
				prodObj.z = prod.zIndex;

				moodBoardTEMP.push(prodObj);
			}

			// Sort moodBoardTEMP by zIndex
			moodBoardTEMP.sort((a, b) =>
				a.z > b.z ? 1 : a.z === b.z ? (a.id > b.id ? 1 : -1) : -1
			);

			//Update z-indexes to reflect mbLength
			for (const [index, obj] of moodBoardTEMP.entries()) {
				obj.z = index;
			}

			moodBoardJSON = JSON.stringify(moodBoardTEMP);
			console.log("moodBoardJSON", moodBoardJSON);
			console.log("effectiveAccountId: " + this.effectiveAccountId);

			saveMoodBoard({
				userId: this.userId,
				moodBoardId: moodboardID,
				moodBoardName: this.moodBoardName,
				effectiveAccountId: this.effectiveAccountId,
				data: moodBoardJSON
			})
				.then((result) => {
					console.log("saveMoodBoard():result");
					console.log(result);
					this.showLoadingSpinner = false;

					if (result.messagesJson) {
						let messages = JSON.parse(result.messagesJson);

						// Process messages returned
						// Display toasts when applicable
						// Create content for the details section
						for (const message of messages) {
							if (message.toast === true) {
								this.dispatchEvent(
									new ShowToastEvent({
										title: message.title,
										message: message.message,
										variant: message.severity
									})
								);
								this.isModalOpen = false;
								this.isSaveModal = false;
							}
						}
					}

					this.moodBoardId = result.moodboardId;
					this.loadMoodboard();
					this.closeModal();
					this.loadMoodBoardOptions();
					this.currentZ = 0;
				})
				.catch((error) => {
					console.log("saveMoodBoard():error");
					console.log(error);

					this.showLoadingSpinner = false;

					this.dispatchEvent(
						new ShowToastEvent({
							title: this.label.processingError,
							message: error.message,
							variant: "error"
						})
					);
				});
		}
	}

	handleDeleteMoodboard() {
		console.log("handleDeleteMoodboard()");

		this.showLoadingSpinner = true;

		// deleteMoodBoard(String moodboardId)
		deleteMoodBoard({
			moodBoardId: this.moodBoardId
		})
			.then((result) => {
				console.log("deleteMoodboard(): success");
				console.log(result);

				this.showLoadingSpinner = false;

				if (result.messagesJson) {
					let messages = JSON.parse(result.messagesJson);

					// Process messages returned
					// Display toasts when applicable
					// Create content for the details section
					for (let i = 0; i < messages.length; i++) {
						let message = messages[i];

						if (message.toast === true) {
							this.dispatchEvent(
								new ShowToastEvent({
									title: message.title,
									message: message.message,
									variant: message.severity
								})
							);
						}
					}
				}
				this.closeModal();
				this.handleClearMoodboard();
				this.loadMoodBoardOptions();
			})
			.catch((error) => {
				console.log("deleteMoodboard(): error");
				console.log(error);

				this.showLoadingSpinner = false;

				this.dispatchEvent(
					new ShowToastEvent({
						title: this.label.processingError,
						message: error.message,
						variant: "error"
					})
				);
			});
	}

	handleAddToCart() {
		console.log("handleAddToCart()");

		this.showLoadingSpinner = true;

		let moodBoardString = JSON.stringify(this.moodBoard);
		let moodBoardParse = JSON.parse(moodBoardString);
		let moodBoardTEMP = [];
		let moodBoardJSON;

		if (moodBoardParse === undefined || moodBoardParse.length === 0) {
			console.log("NO PRODUCTS IN MOODBOARD");

			this.showLoadingSpinner = false;

			this.dispatchEvent(
				new ShowToastEvent({
					title: this.labels.toast.saveErrorTitle,
					message: this.labels.toast.saveErrorMessageNoProducts,
					variant: "error"
				})
			);

			this.showLoadingSpinner = false;
			return;
		} else {
			for (const prod of moodBoardParse) {
				let prodObj = {};
				prodObj.id = prod.id;
				moodBoardTEMP.push(prodObj);
			}

			moodBoardJSON = JSON.stringify(moodBoardTEMP);

			addMoodBoardProductsToTheCart({
				userId: this.userId,
				communityId: this.communityId,
				webstoreId: this.webstoreId,
				moodBoardName: this.moodBoardName,
				effectiveAccountId: this.effectiveAccountId,
				activeCartOrId: "active",
				data: moodBoardJSON
			})
				.then((result) => {
					console.log("handleAddToCart():result");
					console.log(result);
					this.showLoadingSpinner = false;

					if (result.messagesJson) {
						let messages = JSON.parse(result.messagesJson);

						// Process messages returned
						// Display toasts when applicable
						// Create content for the details section
						for (let i = 0; i < messages.length; i++) {
							let message = messages[i];

							if (message.toast === true) {
								this.dispatchEvent(
									new ShowToastEvent({
										title: message.title,
										message: message.message,
										variant: message.severity
									})
								);
							}
						}
					}

					// Refresh the cart icon
					try {
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
					console.log("handleAddToCart():error");
					console.log(error);

					this.showLoadingSpinner = false;

					this.dispatchEvent(
						new ShowToastEvent({
							title: this.label.processingError,
							message: error.message,
							variant: "error"
						})
					);
				});
		}
	}

	updateTotal() {
		console.log("updateTotal()");
		this.runningTotal = 0;
		for (const product of this.moodBoard) {
			this.runningTotal += parseFloat(product.prices.unitPrice);
		}
	}

	// MODALS
	openModal(ev) {
		console.log("openModal()");
		this.isModalOpen = true;

		let modalType = ev.currentTarget.dataset.id;

		if (modalType === "saveAs") {
			this.isSaveModal = true;
		}

		if (modalType === "delete") {
			this.isDeleteModal = true;
		}
	}

	closeModal() {
		console.log("closeModal()");
		this.isModalOpen = false;
		this.isSaveModal = false;
		this.isDeleteModal = false;
	}

	// DROP & CLICK EVENTS
	handleDragOver(ev) {
		ev.preventDefault();
		ev.dataTransfer.dropEffect = "move";
		return false;
	}

	handleDrop(ev) {
		ev.preventDefault();
		const dropItem = ev.target.id;

		console.log("handleDrop()", dropItem);

		this.updateCurrentZ();

		let list = this.template.querySelectorAll("c-b2b-moodboard-canvas-item");

		for (const item of list) {
			if (item.id === dropItem) {
				this.currentZ++;
				item.updateZIndex(this.currentZ);
			}
		}
	}

	handleClick(ev) {
		console.log("handleClick()");
		ev.preventDefault();

		const clickItem = ev.detail.id;
		console.log("clickItem", clickItem);

		this.updateCurrentZ();

		let list = this.template.querySelectorAll("c-b2b-moodboard-canvas-item");

		// let currentZ = 0;
		/* for (const item of list) {
		  if (item.zIndex >= currentZ) {
			currentZ = item.zIndex;
		  }
		} */
		// console.log("currentZ", currentZ);

		for (const item of list) {
			if (item.id === clickItem) {
				this.currentZ++;
				item.updateZIndex(this.currentZ);
			}
		}
	}

	updateCurrentZ() {
		const list = this.template.querySelectorAll("c-b2b-moodboard-canvas-item");

		for (const item of list) {
			if (item.zIndex >= this.currentZ) {
				this.currentZ = item.zIndex;
			}
		}
	}

	handleUpdateEvent(ev) {
		console.log("handleUpdateEvent()");

		const detail = ev.detail;
		const detailString = JSON.stringify(detail);
		const detailParse = JSON.parse(detailString);

		const mbstring = JSON.stringify(this.moodBoard);
		const mbparse = JSON.parse(mbstring);

		for (const product of mbparse) {
			if (product.id === detailParse.id) {
				product.top = detailParse.top;
				product.left = detailParse.left;
				product.height = detailParse.height;
				product.width = detailParse.width;
				product.zIndex = detailParse.zIndex;
			}
		}

		console.log("mbparse", mbparse);

		this.moodBoard = mbparse;
	}

	// DISPLAY OPTIONS
	handleToggleNames() {
		console.log("handleToggleNames()");

		if (this.displayNames === false) {
			this.displayNames = true;
		} else {
			this.displayNames = false;
		}
	}

	handleToggleSKUs() {
		console.log("handleToggleSKUs()");

		if (this.displaySKUs === false) {
			this.displaySKUs = true;
		} else {
			this.displaySKUs = false;
		}
	}

	handleTogglePrices() {
		console.log("handleTogglePrices()");

		if (this.displayPrices === false) {
			this.displayPrices = true;
		} else {
			this.displayPrices = false;
		}
	}

	// GETTERS & SETTERS
	get moodBoardHasProducts() {
		return this.moodBoard && this.moodBoard.length > 0 ? true : false;
	}

	get unitPrice() {
		return this.product.prices && this.product.prices.unitPrice
			? this.product.prices.unitPrice
			: false;
	}

	// ERROR/MESSAGE HANDLING
	errorCallback(err) {
		console.log("B2BMoodboard: errorCallback()", err.message);

		this.dispatchEvent(
			new ShowToastEvent({
				title: "ERROR",
				message: err.message,
				variant: "error"
			})
		);
	}

	processError(error) {
		console.log("processError()", error);
		this.showLoadingSpinner = false;
		this.dispatchEvent(
			new ShowToastEvent({
				title: this.labels.toast.searchErrorTitle,
				message: error.body.message,
				variant: "error"
			})
		);
	}

	processMessages(result) {
		if (result.messagesJson) {
			let messages = JSON.parse(result.messagesJson);
			//   console.log("processMessages()", messages);

			// Process messages returned
			// Display toasts when applicable
			// Create content for the details section
			if (messages !== null) {
				for (const message of messages) {
					if (message.toast === true) {
						this.dispatchEvent(
							new ShowToastEvent({
								title: message.title,
								message: message.message,
								variant: message.severity
							})
						);
					}
				}
			}
		}
	}
}