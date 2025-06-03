"use strict";

setTimeout(function sendTiks() {
    postMessage(10);
    setTimeout(sendTiks, 10000);
}, 10000);