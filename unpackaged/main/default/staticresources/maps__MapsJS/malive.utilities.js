
var messageText, alertType, hasMessages;

function isValueEmpty(val) {
    return val == undefined || val == null || val == 'undefined' || (typeof val == 'string' && val.trim() == '');
}

/* This function checks the type of the value and if the val is undefined, null or empty. 
It will return false if it can determine a type and that it has a value, and true if it can determine a type and doesnt have a value.
The following types are supported: boolean, string, number, Array, object, RegEx, Error, Date, Moment, Symbol and function (This can only tell if the object is of type function/ the actual function might not do anything)
*/
function isValueEmptyProto(val) {
    return val === undefined || val === null || val === 'undefined' || ((val instanceof String || typeof val === 'string') && val.trim() === '') 
        || (typeof val === 'number' && !isFinite(val)) || (Array.isArray(val) && (val.length === 0 || val === [])) || (Object.prototype.toString.call(val).indexOf("Function") === -1 && typeof val === 'function') 
        || (typeof val === 'object' && val.constructor === Object && Object.keys(val).length === 0) || (typeof val === 'object' && val.constructor === RegExp && val === '') 
        || (val instanceof Error && (typeof val.message === 'undefined' || val.message === '')) || (val instanceof Date && !isFinite(Date.parse(val))) || (val instanceof moment && !val.isValid()) 
        || (typeof val === 'symbol' && (String(val).length === 0 || String(val) === ''));
}

// Encodes any HTML text.
function htmlEncode(value){
    // Create a in-memory element, set its inner text (which is automatically encoded)
    // Then grab the encoded contents back out. The element never exists on the DOM.
    return $('<textarea/>').text(value).html();
}

function isObjectEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function checkForMessages() {
    if (hasMessages) {
        displayNotification(null, messageText, alertType);
    }
}

function GetObjProperty(obj, prop) {
    prop = prop || '';
    var arr = prop.split(".");
    while(arr.length && (obj = obj[arr.shift()]));
    return obj;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var Utility = {
    escapeText: function(s) {
        if ( !s ) {
            return "";
        }
        s = s + "";
        // Both single quotes and double quotes (for attributes)
        return s.replace( /['"<>&]/g, function( s ) {
            switch( s ) {
                case "'":
                    return "&#039;";
                case "\"":
                    return "&quot;";
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                case "&":
                    return "&amp;";
            }
        });
    },
    unescapeText: function(s) {
        if ( !s ) {
            return "";
        }
        s = s + "";
        // Both single quotes and double quotes (for attributes)
        return s.replace(/&#39;|&#039|&quot;|&lt;|&gt;|&amp;/g, function( s ) {
            switch( s ) {
                case "&#39;":
                    return "'";
                case "&#039;":
                    return "'";
                case "&quot;":
                    return "\"";
                case "&lt;":
                    return "<";
                case "&gt;":
                    return ">";
                case "&amp;":
                    return "&";
            }
        });
    },
    invokeRemoting: function( obj ) {
        /* example use
            Utility.invokeRemoting({
                path : '{!$RemoteAction.LiveRemoteFunctions.upsertRuleToAWS}',
                params : ruleFieldData,
                callback : function(result, event) {
                    Utility.handleCallback(result, event, myFunction, null, 
                        function(success, result, event) {
                            do something
                        }
                    );
                }
            });
        */
        /*if (this.getObjProperty(obj,'callback') != undefined) {
            if (typeof(obj.callback) === "function") {
                this.callback = obj.callback;
            }
        }*/
        if (this.getObjProperty(obj,'params') != undefined) {
            Visualforce.remoting.Manager.invokeAction(
                obj.path,
                obj.params,
                obj.callback,
                {escape: false}
            );
        }
        else {
            Visualforce.remoting.Manager.invokeAction(
                obj.path,
                obj.callback,
                {escape: false}
            );
        }
    },
    getObjProperty : function(obj, prop) {
        prop = prop || '';
        var arr = prop.split(".");
        while(arr.length && (obj = obj[arr.shift()]));
        return obj;
    },
    handleCallback : function(result, event, onSuccess, onError, onFinish) {
        var success = false;
        hasMessages = true;
        if (event.status) {
            messageText = result.message || result.success ? 'success' : 'error';
            if(result.success) {
                alertType = result.success ? 'success' : 'error';
                success = result.success;
            }
            else if(result.status) {
                alertType = result.status == 'ok' ? 'success' : 'error';
                success = result.status == 'ok';
            }
            if(success) {
                if(onSuccess && typeof onSuccess === 'function') {
                    onSuccess.apply(onSuccess, [success, result, event]);
                }
            }
            else {
                if(onError && typeof onError === 'function') {
                    onError.apply(onError, [success, result, event]);
                }
            }
        }
        else if (event.type === 'exception') {
            messageText = event.message;
            alertType = 'error';
            if(onError && typeof onError === 'function') {
                onError.apply(onError, [success, result, event]);
            }
        }
        else {
            messageText = event.message;
            alertType = 'error';
            if(onError && typeof onError === 'function') {
                onError.apply(onError, [success, result, event]);
            }
        }
        if(onFinish && typeof onFinish === 'function') {
            onFinish.apply(onFinish, [success, result, event]);
        }
    }
};


// example useage: objSort(myarray, 'summaryid', 'order', true);
function objSort() {
    var args = arguments,
        array = args[0],
        case_sensitive, keys_length, key, desc, a, b, i;

    if (typeof arguments[arguments.length - 1] === 'boolean') {
        case_sensitive = arguments[arguments.length - 1];
        keys_length = arguments.length - 1;
    } else {
        case_sensitive = false;
        keys_length = arguments.length;
    }

    return array.sort(function (obj1, obj2) {
        for (i = 1; i < keys_length; i++) {
            key = args[i];
            if (typeof key !== 'string') {
                desc = key[1];
                key = key[0];
                a = obj1[args[i][0]];
                b = obj2[args[i][0]];
            } else {
                desc = false;
                a = obj1[args[i]];
                b = obj2[args[i]];
            }

            if (case_sensitive === false && typeof a === 'string') {
                a = a.toLowerCase();
                b = b.toLowerCase();
            }

            if (! desc) {
                if (a < b) return -1;
                if (a > b) return 1;
            } else {
                if (a > b) return -1;
                if (a < b) return 1;
            }
        }
        return 0;
    });
}
    
function isLightningOrSF1() {
    return((typeof sforce != 'undefined') && sforce && (!!sforce.one));
}

/*Use to redirect to any other page in Live Product
    How to use parameters
    action: new, cancel, open, clone, map, assetTab (current options) (Optional: Default option returns you to Dashboard page)
    sumId: Pass in the summary record Id to define the Id of the redirect page (Optional)
    extraActions: Parameter designed to take in an Array of extra urlParams (Ex: [\'&tab=errors\']) should be passed in or a array variable containing (Ex: '&tab=errors' string)
    **extraActions can have more than one urlParam passed (Only works with open, clone and map action's for now)
*/
function redirectPage(action, recordId, extraActions) {
    
    if(isValueEmptyProto(recordId)){
        recordId = typeof summaryId !== 'undefined' && !isValueEmptyProto(summaryId) ? summaryId : recordId;
    } 
    
    if(Array.isArray(extraActions) && extraActions.length > 0){
        //Join and change extraActions to a string to add to urls if not blank
        extraActions = extraActions.join('');
    }
    
    var lightning = isLightningOrSF1(); 
    var lightBaseURL = lightning ? '/one/one.app#/alohaRedirect' : '';
    
    switch (action) {
        case "new":
            lightBaseURL += '/apex/maps__LiveSettings?tabId=summaries';
            break;
        case "cancel":
            lightBaseURL += '/apex/maps__LiveSettings?tabId=summaries';
            break;
        case "associations":
            lightBaseURL += '/apex/maps__LiveStopAssociations';
            break;
        case "open":
            // if(!isValueEmptyProto(recordId)){
                lightBaseURL += '/apex/maps__LiveSettings?tabId=summaries';
            // }
            /* else {
                messageText = 'You cannot open a summary that has no associated id.';
                alertType = 'error';
                title = null;
                checkForMessages();
                return;
            } */
            break;
        case "clone":
            // if(!isValueEmptyProto(recordId)) {
                lightBaseURL += '/apex/maps__LiveSettings?tabId=summaries';
            /* }
            else {
                messageText = 'You cannot clone a summary that has no associated id.';
                alertType = 'error';
                title = null;
                checkForMessages();
                return;
            } */
            break;
        case "map":
            if(lightning) {
                lightBaseURL += (recordId ? '/apex/maps__Maps?layerid=' + recordId : '/apex/maps__Maps') + (isValueEmpty(extraActions) ? '' : extraActions);
                //sforce.one.navigateToURL(lightBaseURL, false);
                window.open(lightBaseURL, '_blank');
            }
            else {
                var pageLoc = (recordId ? '/apex/maps__Maps?layerid=' + recordId + '&retUrl=' : '/apex/maps__Maps?retUrl=') + (isValueEmpty(extraActions) ? '' : extraActions);
                var retUrl = '/apex/maps__LiveSettings?tabId=summaries';
                pageLoc += encodeURI(retUrl);
                window.open(pageLoc, '_blank');
            }
            
            /* if(isValueEmptyProto(recordId)){
                messageText = 'You cannot open a summary in Maps that has no associated id.';
                alertType = 'error';
                title = null;
                checkForMessages();
            } */
            return;
        case "assetTab":
            lightBaseURL += '/' + assetPrefix;
            break;
        default:
            lightBaseURL += '/apex/maps__LiveSettings?tabId=summaries';
            break;
    }
    
    if(lightning) {
        sforce.one.navigateToURL(lightBaseURL, true);
    }
    else {
        window.top.location.href = lightBaseURL;
    }
}
