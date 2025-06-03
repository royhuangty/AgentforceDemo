'use strict';

(function () {

    StreamingClientResolverService.$inject = ['$q', 'StreamingAPIService', 'MstResolver', 'StateService', 'DeltaService'];

    angular.module('serviceExpert').factory('StreamingClientResolverService', StreamingClientResolverService);

    // this c'tor will function as our provider
    function StreamingClientResolverService($q, StreamingAPIService, MstResolver, StateService, DeltaService) {

        var latestCatchedEvent = -1;
        var StreamingChannels = ['ServicesTopic', 'AbsencesTopic', 'AssignedResourcesTopic', 'LivePositionsTopic', 'CapacitiesTopic', 'OptReqTopic', 'TimeDependencyTopic'];
        var REPLAY_FROM_KEY = 'replay';
        var failedToConnect = false;

        // connect to push server
        function connectToPush() {

            $.cometd.addListener('/meta/handshake', function (message) {

                if (message.successful) {

                    console.log('Handshake successful!');
                    registerAndSubscribeExtensions();

                    // if we failed to connect in one of our attempt, don't set the active state to true
                    // e.g: /meta/connect connection failed but this one works fine. We will eventually set the
                    //      active state to true but it isn't
                    if (!failedToConnect) {
                        StateService.setStreamingActiveState(true);
                    }
                } else {
                    failedToConnect = true;
                    StateService.setStreamingActiveState(false);
                    console.warn('Handshake! error: ' + message.error);
                }
            });

            $.cometd.addListener('/meta/connect', function (message) {

                if (!message.successful) {

                    failedToConnect = true;
                    StateService.setStreamingActiveState(false);
                    console.warn('disconnected! error: ' + message.error);
                } else if (!failedToConnect) {
                    StateService.setStreamingActiveState(true);
                }
            });

            MstResolver.connectToPush();
        }

        function registerAndSubscribeExtensions() {

            try {

                // set replay ext
                for (var i = 0; i < StreamingChannels.length; i++) {

                    var extension = $.cometd.getExtension(StreamingChannels[i]);

                    if (!extension) {
                        registerToPush(StreamingChannels[i]);
                    }

                    $.cometd.subscribe('/topic/' + StreamingChannels[i], StreamingAPIService.HandleNotification);
                }
            } catch (ex) {
                console.log(ex);
            }
        }

        // register channel to push server
        function registerToPush(channel) {
            var currentChannel = '/topic/' + channel;
            var replayExtension = new cometdReplayExtension();
            replayExtension.setChannel(currentChannel);
            replayExtension.setReplay(-1);
            $.cometd.registerExtension(channel, replayExtension);
        }

        // init connect
        function initStreaming() {
            try {
                // gantt updated checkout is checked
                if (StateService.getStreamingActiveState() == true) {
                    connectToPush();
                }
            } catch (ex) {
                console.log(ex);
            }
        }

        return {
            initStreaming: initStreaming
        };
    }
})();