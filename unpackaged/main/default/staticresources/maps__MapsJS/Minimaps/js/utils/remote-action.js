define([], function() {

    /**
     * Construct a MM.utils.RemoteAction object.
     * @param {string} controller Fully qualified controller reference which contains the remote action (e.g. namespace.controller).
     * @param {string} method Name of the remote action.
     * @returns {RemoteAction}
     */
    var RemoteAction = function(controller, method) {
        if (!controller || typeof controller !== 'string') {
            // TODO
            throw 'Bad parameter';
            return;
        }
    
        if (!method || typeof method !== 'string') {
            // TODO
            throw 'Bad parameter';
            return;
        }
    
        this.controller = controller;
        this.method = method;
    };    

    /**
     * Set error handler.
     * @param {function} fn Function reference.
     */
    RemoteAction.prototype.setErrorHandler = function(fn) {
        if (typeof fn === 'function') {
            this.errorHandler = fn;
        } else {
            throw new RemoteActionException('Parameter is not a function.');
        }
    
        return this;
    };    

    /**
     * Handles the call to the remote action.
     * @param {Array} params An array of params being passed to the remote action.
     * @param {function} callback The callback function that will be invoked with the remote action result.
     */
    RemoteAction.prototype.invoke = function(params, callback, config) {
        if (!params || !Array.isArray(params)) {
            // TODO
            throw 'Bad parameter';
            return;
        }
    
        if (callback) {
            if (typeof callback !== 'function') {
                // TODO
                throw 'Callback param is not a function.';
                return;
            }
    
            this.callback = callback;
        }
    
        if (config) {
            if (typeof config !== 'object') {
                throw 'Config param is not an object.';
                return;
            }
        }
    
        params.unshift(this.controller + '.' + this.method);
        params.push(this._handleResult.bind(this));
    
        Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, params, config || {});
    };    
    

    /**
     * Callback for the invoked action result
     * @param {object} result Whatever the invoked action returns.
     * @param {object} event Contains info about the result of the invoked action call.
     */
    RemoteAction.prototype._handleResult = function(result, event) {
        if (event.status) {
            this.callback(result);
        } else {
            if (this.errorHandler) {
                this.errorHandler.call(this.errorHandler, result, event);
            }
        }
    }; 
    
    /**
     * Exceptions
     */
    var RemoteActionException = function(message) {
        this.message = message;
        this.name = 'RemoteActionException';
    };
    
    return RemoteAction;

});

