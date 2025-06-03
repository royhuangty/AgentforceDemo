/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LightningElement, track } from "lwc";

export default class B2bContentAware extends LightningElement {
  //   @track templateSize;
  @track templateWidth;

  connectedCallback() {
    console.log("b2bContentAware: connectedCallback()");
    window.addEventListener("resize", this.windowResize.bind(this));
  }

  renderedCallback() {
    // console.log("renderedCallback()");
    this.windowResize();
  }

  windowResize() {
    console.log("windowResize()");

    const tmpl = this.template.querySelector(".contentAwareContainer");
    this.templateWidth = tmpl.getBoundingClientRect().width;

    console.log("templateWidth", this.templateWidth);

    // TEMPLATE WIDTH BREAKPOINTS
    // X-SMALL (< 480px)
    // SMALL (>= 480px)
    // MEDIUM (>=768px)
    // LARGE (>=1024px)

    const items = this.querySelectorAll("[data-content='aware']");

    console.log("items", JSON.stringify(items));

    for (const item of items) {
      /* this.tileWidth = this.template
          .querySelector(".featuredProdImage")
          .getBoundingClientRect().width; */

      item.classList.remove("slds-size_1-of-1");
      item.classList.remove("slds-size_1-of-2");
      item.classList.remove("slds-size_1-of-3");
      item.classList.remove("slds-size_1-of-4");

      // X-SMALL
      if (this.templateWidth < 480) {
        item.classList.add("slds-size_1-of-1");
      }

      // SMALL
      if (this.templateWidth >= 480 && this.templateWidth < 768) {
        item.classList.add("slds-size_1-of-2");
      }

      // MEDIUM
      if (this.templateWidth >= 768 && this.templateWidth < 1024) {
        item.classList.add("slds-size_1-of-3");
      }

      // LARGE
      if (this.templateWidth >= 1024) {
        item.classList.add("slds-size_1-of-4");
      }
    }

    //   this.tileHeight = this.tileWidth;
  }
}