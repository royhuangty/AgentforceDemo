/*This function will load script and call the callback once the script has loaded*/
function loadScriptAsync(scriptSrc, callback) {
    if (typeof callback !== 'function') {
        throw new Error('Not a valid callback for async script load');
    }
    var script = document.createElement('script');
    script.onload = callback;
    script.src = scriptSrc;
    document.head.appendChild(script);
}

/**
 * EVENT LOGGED WHEN USER VISIT THE REAL-TIME LOCATION PAGE
 */
window.myAnalytics = (function() {
    return {
        fireEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'ResourceId' : value });
                gtag('event', 'Real-time Location', { 'Action Item': 'Page loaded' });
            })
        }
    };
}());


/**
 * EVENT LOGGED WHEN USER VISIT THE NEW BOOKING URL
 */
window.sssAnalytics = (function() {
    return {
        logSSSNewBookingAuthPageEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-New Booking : Page View', { 'Action Item': 'Authentication Page' });
            })
        }
    };
}());

/**
 * EVENT LOGGED WHEN USER CONFIRM THE NEW BOOKING
 */

window.sssNewBookingAnalytics = (function() {
    return {
        logSSSNewBookinConfirmPageEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-New Booking : Appointment Confirmed', { 'Action Item': 'Appointment Booking' });
            })
        }
    };
}());


/**
 * EVENT LOGGED WHEN USER RELOAD THE URL - SSS REBOOKING
 */
window.sssReBookingAnalytics = (function() {
    return {
        logSSSReBookingEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-Rebooking : Page View', { 'Action Item': 'Page View' });
            })
        }
    };
}());

/**
 * EVENT LOGGED WHEN USER CONFIRM THE APPOINTMENT
 */
window.sssReBookingConfirmAppt = (function() {
    return {
        logSSSReBookingConfirmApptEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-Rebooking : Appointment Confirmed', { 'Action Item': 'Page View' });
            })
        }
    };
}());

/**
 * EVENT LOGGED WHEN USER RESCHEDULE THE APPOINTMENT : ReBooking
 */
window.sssReBookingRescheduleAppt = (function() {
    return {
        logSSSReBookingRescheduleApptEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-Rebooking : Appointment Rescheduled', { 'Action Item': 'Page View' });
            })
        }
    };
}());

/**
 * EVENT LOGGED WHEN USER CANCEL THE APPOINTMENT
 */
window.sssReBookingCancelAppt = (function() {
    return {
        logSSSReBookingCancelApptEvent : function(value) {
            loadScriptAsync('https://www.googletagmanager.com/gtag/js?id=G-5E1ZFNNCPJ', function(){
                window.dataLayer = window.dataLayer || [];
                function gtag() { 
                    dataLayer.push(arguments);
                    
                }
                gtag('js', new Date());
                gtag('config', 'G-5E1ZFNNCPJ', { 'event' : 'Self-Service scheduling' });
                gtag('event', 'SSS-Rebooking : Appointment Cancelled', { 'Action Item': 'Page View' });
            })
        }
    };
}());