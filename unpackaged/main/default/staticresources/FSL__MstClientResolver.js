'use strict';

(function () {

    var ASYNC_JOB_MONITOR_TIMES = 7500;

    angular.module('MstResolver', []).provider('MstResolver', MstResolver);

    function MstResolver() {

        var config = {
            fslOperationRemoteAction: null,
            getAsyncApexJobRemoteAction: null,
            apiVersion: '61.0',
            fieldNames: {
                Initiator: 'Initiator__c',
                Request_Type: 'Request_Type__c',
                ResultText: 'ResultText__c'
            },
            autoConnect: true
        };

        this.setConfig = function (configObject) {
            return config = configObject;
        };

        this.$get = function ($q) {
            return MstResolverService($q, config);
        };

        this.$get.$inject = ['$q'];
    }

    // this c'tor will function as our provider
    function MstResolverService($q, config) {

        var fslOperations = {},
            cometdUnsubscribe = null,
            fslOperationReplies = {};

        var latestCatchedEvent = -1;

        // connect to push server
        function connectToPush() {

            var metaHandshakeListener = $.cometd.addListener('/meta/handshake', function (message) {
                if (message.successful) {
                    console.log('Handshake successful!');

                    // set replay ext
                    var extention = $.cometd.getExtension('myReplayExtensionName');

                    if (extention == null) {
                        var replayExtension = new cometdReplayExtension();
                        replayExtension.setChannel('/topic/MstCompletedChannel');
                        replayExtension.setReplay(latestCatchedEvent);
                        $.cometd.registerExtension('myReplayExtensionName', replayExtension);
                    }

                    $.cometd.subscribe('/topic/MstCompletedChannel', handleCometdConnection);
                } else {
                    console.warn('Handshake! error: ' + message.error);
                }
            });

            var metaSubscribeListener = $.cometd.addListener('/meta/connect', function (message) {
                if (!message.successful) {
                    console.warn('disconnected! msg: ' + message);
                }
            });

            $.cometd.init({
                url: window.location.protocol + '//' + window.location.hostname + (null != window.location.port ? ':' + window.location.port : '') + '/cometd/' + config.apiVersion + '/',
                requestHeaders: { Authorization: 'OAuth ' + sessionId }
            });
        }

        // handling messages from cometd
        function handleCometdConnection(message) {

            // not relevant - deleted event
            if (message.data.event.type === 'deleted') {
                return;
            }

            console.info('message from stream, type: ' + message.data.event.type + ', replayId: ' + message.data.event.replayId + ', fslOp: ' + message.data.sobject.Id);

            // set latest replay event id in case the connection will drop
            latestCatchedEvent = message.data.event.replayId;

            // saving the message
            fslOperationReplies[message.data.sobject.Id] = message;

            // check if we already have promise
            var fslOp = fslOperations[message.data.sobject.Id];

            if (fslOp) {
                fslOp.deferred.resolve(message);
            }

            // // not relevant
            // if ((!fslOp && !fslOp.deferred) || (message.data.event.type === 'deleted')) {
            //     return;
            // }
            //
            // fslOperations[message.data.sobject.Id] = fslOp;
            //
            // if (config.fslOperationRemoteAction) {
            //
            //     Visualforce.remoting.Manager.invokeAction(config.fslOperationRemoteAction,
            //         fslOp.time, message.data.sobject.Id,
            //
            //         (res, ev) => {
            //
            //             // need to make sure there was no error in the fsl op, error is in result text
            //             if (ev.status && !res.fslOperation.fslOperation[config.fieldNames.ResultText]) {
            //                 res.fslOperation.result = JSON.parse(res.fslOperation.result);
            //
            //                 if (res.fslOperation.fslOperation[config.fieldNames.Request_Type] === 'Get Candidates') {
            //                     handleGetCandidatesString(res.fslOperation.result);
            //                 }
            //
            //                 if (res.fslOperation.fslOperation[config.fieldNames.Request_Type] === 'Appointment Booking') {
            //                     handleAppointmentBookingString(res.fslOperation.result.Slots);
            //                 }
            //
            //                 fslOp.deferred.resolve(res);
            //
            //             } else {
            //                 fslOp.deferred.reject(res);
            //             }
            //         },
            //
            //         { buffer: false, escape: false, timeout: 120000 }
            //     );
            //
            // } else {
            //     fslOp.deferred.resolve();
            // }
        }

        // parse get candaidates results
        function handleGetCandidatesString(result) {

            var candidates = result.ResourceIDToScheduleData;

            for (var candidate in candidates) {
                candidates[candidate].SchedulingOptions.forEach(function (option) {
                    option.Interval.Start = moment(option.Interval.Start).valueOf();
                    option.Interval.Finish = moment(option.Interval.Finish).valueOf();

                    for (var relatedKey in option.MSTOptions) {
                        option.MSTOptions[relatedKey].Interval.Start = moment(option.MSTOptions[relatedKey].Interval.Start).valueOf();
                        option.MSTOptions[relatedKey].Interval.Finish = moment(option.MSTOptions[relatedKey].Interval.Finish).valueOf();
                    }
                });
            }
        }

        // parse appointment booking results
        function handleAppointmentBookingString(slots) {
            slots.forEach(function (slot) {

                slot.Interval.Start = moment(slot.Interval.Start).valueOf();
                slot.Interval.Finish = moment(slot.Interval.Finish).valueOf();
            });
        }

        // signup to get updates (id = fsl operation id)
        function getUpdates(id) {

            fslOperations[id] = {
                time: new Date().getTime() - 3000, // CFSL-1355
                deferred: $q.defer(),
                mstPromise: $q.defer(),
                asyncMethodCheckerTimeout: null,
                gotReply: false
            };

            var fslOp = fslOperations[id];

            // when this promise will be resolved, run the remote action
            fslOperations[id].deferred.promise.then(function (message) {

                if (config.fslOperationRemoteAction) {

                    Visualforce.remoting.Manager.invokeAction(config.fslOperationRemoteAction, fslOp.time, message.data.sobject.Id, function (res, ev) {

                        // need to make sure there was no error in the fsl op, error is in result text
                        if (ev.status && !res.fslOperation.fslOperation[config.fieldNames.ResultText]) {

                            if (res.fslOperation.result) res.fslOperation.result = JSON.parse(res.fslOperation.result);

                            if (res.fslOperation.fslOperation[config.fieldNames.Request_Type] === 'Get Candidates') {
                                handleGetCandidatesString(res.fslOperation.result);
                            }

                            if (res.fslOperation.fslOperation[config.fieldNames.Request_Type] === 'Appointment Booking') {
                                handleAppointmentBookingString(res.fslOperation.result.Slots);
                            }

                            fslOp.mstPromise.resolve(res);
                        } else {

                            if (res && res.fslOperation && res.fslOperation.fslOperation) {
                                fslOp.mstPromise.reject(res.fslOperation.fslOperation[config.fieldNames.ResultText]);
                            } else {
                                fslOp.mstPromise.reject(ev);
                            }
                        }

                        fslOp.gotReply = true;
                    }, { buffer: false, escape: false, timeout: 120000 });
                }
            });

            // we already got the reply, resolve the reply (function above will run)
            if (fslOperationReplies[id]) {
                fslOp.deferred.resolve(fslOperationReplies[id]);
                delete fslOperationReplies[id];
            }

            // monitor the future call
            fslOperations[id].asyncMethodCheckerTimeout = setInterval(function () {

                monitorAsyncCall(id);
            }, ASYNC_JOB_MONITOR_TIMES);

            return fslOperations[id].mstPromise.promise;
        }

        // monitor future calls
        function monitorAsyncCall(id) {

            var fslOp = fslOperations[id];

            Visualforce.remoting.Manager.invokeAction(config.getAsyncApexJobRemoteAction, id, function (res, ev) {

                //console.log(res);

                // if null than FSL OP finished
                if (!res) {

                    clearInterval(fslOp.asyncMethodCheckerTimeout);

                    if (!ev.status) {
                        if (ev.xhr && ev.xhr.statusText === 'communication failure') {
                            fslOp.mstPromise.reject({ message: ev.message });
                        } else {
                            fslOp.mstPromise.reject({ message: customLabels.wentWrongContactSysAdmin });
                        }

                        console.log(ev);
                    }

                    return;
                }

                if (res.Status === 'Aborted' || res.Status === 'Failed') {

                    if (!fslOp.gotReply) {
                        fslOp.mstPromise.reject({ message: res.ExtendedStatus });
                    }

                    clearInterval(fslOp.asyncMethodCheckerTimeout);
                }

                if (res.Status === 'Completed') {

                    var message = { data: { sobject: { Id: id } } };

                    fslOp.deferred.resolve(message);
                    clearInterval(fslOp.asyncMethodCheckerTimeout);
                }
            });
        }

        // init connect
        (function () {

            try {

                if (config.autoConnect) {
                    connectToPush();
                }
            } catch (ex) {
                console.log(ex);
            }
        })();

        return {
            getUpdates: getUpdates,
            connectToPush: connectToPush,
            handleCometdConnection: handleCometdConnection
        };
    }
})();