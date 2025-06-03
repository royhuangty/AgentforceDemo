function extractHostURL(url) {
    // https://host.example.com/query?params=... => https://host.example.com
    return url.replace(/^((?:https?:\/\/)?[^/?]+).*$/, '$1');
}

function extractDomainURL(url) {
    // https://host.example.com/query?params=... => https://example.com
    return url.replace(/^(https?:\/\/)?(?:[^/?]+\.)*([^/?]+\.[^/?]+).*$/, '$1$2');
}

function removeTrailingSlashesFromURL(url) {
    // https://example.com/arcgis/rest/ => https://example.com/arcgis/rest
    return url.replace(/\/+$/, '');
}

function removeParametersFromURL(url) {
    // https://host.example.com/query?params=... => https://host.example.com/query
    return url.replace(/\?.*$/, '');
}

// https://stackoverflow.com/a/2901298
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function round(x) {
    if (x < 0.001)
        decimal = 6;
    else if (x < 1)
        decimal = 3;
    else
        decimal = 2;
    multiplier = Math.pow(10, decimal);
    return Math.round(x * multiplier) / multiplier;
}

// https://codepen.io/shaikmaqsood/pen/XmydxJ/
function copyToClipboard(element) {
	var $temp = $('<input>');
	$('body').append($temp);
	$temp.val($(element).text()).select();
	document.execCommand('copy');
	$temp.remove();
}
function CopyToClipboardText( text ) {
    var $temp = $('<input>');
	$('body').append($temp);
	$temp.val(text).select();
	document.execCommand('copy');
	$temp.remove();

    MAToastMessages.showSuccess({
        message: window.formatLabel(MASystem.Labels.text_copied, [text]),
        timeOut: 3000,
        extendedTimeOut: 0
    });
}

// https://learn.jquery.com/using-jquery-core/faq/how-do-i-select-an-element-by-an-id-that-has-characters-used-in-css-notation/
function escapeElementId(id) {
	return '#' + id.replace(/(:|\.|\[|\]|,|=|@)/g, '\\$1');
}

// https://blog.element84.com/polygon-winding-post.html
function calculatePolygonArea(path) {
	var ret = (path[0].lng() - path[path.length-1].lng()) * (path[0].lat() + path[path.length-1].lat());
	for (var i = 0; i < path.length - 1; i++)
		ret += (path[i+1].lng() - path[i].lng()) * (path[i+1].lat() + path[i].lat());
	return ret / 2.0;
}

function findPolygonWinding(path) {
	return calculatePolygonArea(path) > 0;
}

function parseGoogleAdr(adrAddress) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(adrAddress, 'text/html');
    const addressFields = {};
    doc.querySelectorAll('span').forEach((e) => {
        if (e.className.toLowerCase() === 'street-address') {
            addressFields.BillingStreet = e.innerText;
        } else if (e.className.toLowerCase() === 'locality') {
            addressFields.BillingCity = e.innerText;
        } else if (e.className.toLowerCase() === 'region') {
            addressFields.BillingState = e.innerText;
        } else if (e.className.toLowerCase() === 'country-name') {
            addressFields.BillingCountry = e.innerText;
        } else if (e.className.toLowerCase() === 'postal-code') {
            if (e.textContent.charCodeAt(0) === 12306){
                //delete the Japanese postal character as it will be added back later
                addressFields.BillingPostalCode = e.innerText.substring(1);
            }else{
                addressFields.BillingPostalCode = e.innerText;
            }
        }
    });
    return addressFields;
}

/**
 * 
 * @param {*} userLocale locale set in Salesforce User profile
 * @param {*} addressFields individual address components (BillingStreet, BillingCity, BillingCountry, BillingPostalCode, BillingState)
 * @returns string literal of address formatted based on locale
 */
function formatLocaleAddress(userLocale, addressFields) {
    const [locale, country] = userLocale.split('_');
    return window.globalAddressFormatter.formatAddress(locale, country, {
        address: addressFields.BillingStreet,
        country: addressFields.BillingCountry,
        city: addressFields.BillingCity,
        state: addressFields.BillingState,
        zipCode: addressFields.BillingPostalCode
    }, ', ');
}
