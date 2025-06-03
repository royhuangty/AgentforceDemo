const CORE_LOG_NAME = "blngEPT";
const CORE_LOG_ENDPOINT = "/_ui/common/request/servlet/CPQLoggingServlet";
const METRICS_VERSION = "1.0";

function _normalizeApiHost(apiHost) {
    var m = /([a-zA-Z0-9_-]+)\.(vpod\.visual\.t\.force|visual\.force|salesforce)\.com$/.exec(apiHost);
    if (m) {
        if (m[2] == "vpod.visual.t.force") {
            apiHost = m[1] + ".vpod.t.force.com";
        } else {
            apiHost = m[1] + ".salesforce.com";
        }
    }
    return apiHost;
}

function sendMetrics(metricsInfo) {

    // We are only interested in logging transactions with at least 150ms
    // This will eliminate the noise cased by random clicks on the page
    if (!metricsInfo || !metricsInfo[0] || metricsInfo[0].ept < 150) {
        return;
    }

    // Figures out the hostname for the API request. Visual force
    // hostname will be different than the servlet endpoint
    var hostname = this._normalizeApiHost(location.host);
    var url = location.protocol + "//" + hostname + CORE_LOG_ENDPOINT;

    // Core logging require a valid session id (hence passing the cookie)
    // Also adding the Origin header in the query to handle CORS
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            if (xhr.status == 200) {
                console.log("Billing Performance Metrics Successfully logged!");
            } else {
                console.log("Error while logging Billing Performance Metrics!");
                console.log(xhr.getAllResponseHeaders());
            }
        }
    }
    xhr.open("POST", url, true);

    // Build the JSON expected by the servlet
    var logLines = [
        {
            "logName": CORE_LOG_NAME,
            "logLevel": "INFO",
            "logAttrs": {
                "version": METRICS_VERSION
            }
        }
    ];
    Object.assign(logLines[0].logAttrs, metricsInfo[0]);

    // Send the data
    var formData = new FormData();
    formData.append("logLines", JSON.stringify(logLines));
    xhr.send(formData);
}