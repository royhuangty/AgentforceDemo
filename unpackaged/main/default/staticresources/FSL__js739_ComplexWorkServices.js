(function() {

    angular.module('ComplexWork').constant('TIME_DEP_FIELDS', function() {
        return {
            sa1: complex.fieldNames.timeDependency.sa1,
            sa2: complex.fieldNames.timeDependency.sa2,
            sa1r: complex.fieldNames.timeDependency.sa1.replace('__c', '__r'),
            sa2r: complex.fieldNames.timeDependency.sa2.replace('__c', '__r'),
            dependency: complex.fieldNames.timeDependency.dependency,
            root: complex.fieldNames.timeDependency.root,
            sameResource: complex.fieldNames.timeDependency.sameResource
        };
    });

    angular.module('ComplexWork').factory('superService', superService);

    superService.$inject = ['$q'];

    function superService($q) {

        var STATUS_CATEGORIES = {
            NONE: 'None',
            SCHEDULED: 'Scheduled',
            DISPATCHED: 'Dispatched',
            IN_PROGRESS: 'InProgress',
            COULD_NOT_COMPLETE: 'CannotComplete',
            COMPLETED: 'Completed',
            CANCELED: 'Canceled'
        };

        var nodesLength = 0;


        // global call to remote action
        function callRemoteAction(remoteActionName, params, escape=true) {

            let deferred = $q.defer(),
                remoteActionsParams = [complex.remoteActions[remoteActionName]]
                    .concat(params)
                    .concat(function(data, ev) { ev.status ? deferred.resolve(data) : deferred.reject(ev); })
                    .concat({ buffer: false, escape });

            remoteActionsParams = remoteActionsParams.filter(function(v) { return v !== undefined });

            Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, remoteActionsParams);

            return deferred.promise;

        }

        function getMstChain() {
            return callRemoteAction('getMstChain', complex.serviceId);
        }


        function getRelatedServices() {
            return callRemoteAction('getRelatedServices', complex.serviceId);
        }

        function getComplexWorkLookupFields() {
            return callRemoteAction('getComplexWorkLookupFields', complex.serviceId, false);
        }

        function getRelatedServicesByLookupFieldId(lookupField, lastId) {
            return callRemoteAction('getRelatedServicesByLookupFieldId', [complex.serviceId, lookupField, lastId], false);
        }

        function scheduleService(id) {
            return callRemoteAction('scheduleService', id);
        }

        function getFieldsets() {
            return callRemoteAction('getServiceListFields');
        }

        function getTreeOrderForScheduling() {
            return callRemoteAction('getTree', complex.serviceId);
        }

        function addTimeDependency(sa1, sa2, dep, same) {

            if (dep === "Immediately Follow") {
                return callRemoteAction('addTimeDependency', [complex.serviceId, sa2, sa1, dep, same]);
            }

            return callRemoteAction('addTimeDependency', [complex.serviceId, sa1, sa2, dep, same]);
        }


        function removeTimeDependency(depId) {
            return callRemoteAction('removeTimeDependency', [complex.serviceId, depId]);
        }


        function checkIfInRelation(sameStartServices, r1, r2) {

            for (var key in sameStartServices) {

                var arr = sameStartServices[key];

                if (arr.has(r1) || arr.has(r2)) {
                    return key;
                }

            }

            return null;

        }


        function getServicesThatHaveSameResource(chain) {

            var services = {};

            for (let key in chain) {
                chain[key].relations.forEach(function(relation) {
                    services[key] = true;
                    services[relation.id] = true;
                });
            }

            for (let key in chain) {
                chain[key].relations.forEach(function(relation) {

                    if (relation.dependency) {
                        services[key] = false;
                        services[relation.id] = false;
                    }

                });
            }

            return services;
        }

        function setNodesHtml(chain, assignedResources) {

            var nodes = {},
                scheduled = '',
                servicesThatHasOnlySameResource = getServicesThatHaveSameResource(chain),
                name = '',
                fill;


            for (var key in chain) {

                if (servicesThatHasOnlySameResource[key]) {
                    continue;
                }

                fill = 'fill: ' + getColotByStatus(chain[key].statusCategory);

                name = '<b>' + chain[key].name + '</b>';
                scheduled = '<br/>' + chain[key].status.encodeHTML();
                scheduled += chain[key].isScheduled ? '<br/>' + moment(chain[key].start).tz(complex.timeZone).format('lll') : '<br/><br/>';


                nodes[key] = 's' + key + '[labelType="html" style="' + fill + '" label="' + name + scheduled + '" labelStyle="font-size:11px; text-align: left; line-height: 16px;"];';


                chain[key].relations.forEach(function(s) {

                    if (servicesThatHasOnlySameResource[s.id]) {
                        return;
                    }

                    name = '<b>' + s.name + '</b>';
                    scheduled = '<br/>' + s.status;
                    scheduled += s.isScheduled ? '<br/>' + moment(s.start).tz(complex.timeZone).format('lll') : '<br/><br/>';
                    fill = 'fill: ' + getColotByStatus(s.statusCategory);

                    nodes[s.id] = 's' + s.id + '[labelType="html" style="' + fill + '" label="' + name + scheduled + '" labelStyle="font-size:11px; text-align: left; line-height: 16px;"];';
                });

            }
            nodesLength = nodes;
            var resultStr = '';
           
            for (key in nodes) {
                resultStr += nodes[key];
            }

            return resultStr;

        }


        function formatGraph(chain, assignedResources) {

            var key, name, relations,
                sameStartServices = {},
                format = '',
                sameStartFormat = '',
                scheduledText;

            for (key in chain) {

                relations = chain[key].relations;
                name = chain[key].name;
                scheduledText = chain[key].isScheduled ? '[label="(Scheduled)" labelStyle="font-size:11px"]' : '';

                relations.forEach(function(relation) {

                    if (relation.dependency === 'Same Start') {

                        if (sameStartServices['s' + key] && sameStartServices['s' + relation.id]) {
                            sameStartServices['s' + key].add('s' + relation.id)
                        }

                        else if (!sameStartServices['s' + key] && !sameStartServices['s' + relation.id]) {

                            var bla = checkIfInRelation(sameStartServices, 's' + key, 's' + relation.id);

                            if (bla) {
                                sameStartServices[bla].add('s' + relation.id);
                                sameStartServices[bla].add('s' + key)
                            } else {
                                sameStartServices['s' + key] = new Set();
                                sameStartServices['s' + key].add('s' + relation.id)
                            }


                        }

                        else if (sameStartServices['s' + key] && !sameStartServices['s' + relation.id]) {
                            sameStartServices['s' + key].add('s' + relation.id);
                        }

                        else if (!sameStartServices['s' + key] && sameStartServices['s' + relation.id]) {
                            sameStartServices['s' + relation.id] = sameStartServices['s' + relation.id] || new Set();
                            sameStartServices['s' + relation.id].add('s' + key);
                        }
                        
                    }

                    // Start After Finish
                    else if (relation.dependency && (relation.dependency.indexOf('After') > - 1)) {

                        var textOnArrow = '';


                        if (relation.dependency === 'Start After Finish And Same Day') {
                            textOnArrow = relation.sameResource ? complex.labels.SameDayResourceCOmplex : complex.labels.SameDayCOmplex;
                        } else if (relation.dependency === 'Start After Finish' && relation.sameResource) {
                            textOnArrow = complex.labels.SameResourceCompelx;
                        }

                        textOnArrow = '[label="' + textOnArrow + '"]';

                        format += 's' + relation.id + '->' + 's' + key + textOnArrow;
                    }

                    else if (relation.dependency && (relation.dependency.indexOf('Immediately') > -1)) {

                        textOnArrow = '[label="' + complex.labels.ImmediatelyFollowedBy + '"]';
                        format += 's' + relation.id + '->' + 's' + key + textOnArrow;

                    }
                })

            }


            sameStartServices = combineSameStart(sameStartServices);

            for (key in sameStartServices) {

                sameStartFormat += '{' + key + ' ';

                sameStartServices[key].forEach(function(val) {
                    sameStartFormat += val + ' ';
                });

                sameStartFormat += '};';
            }

            format = sameStartFormat + setNodesHtml(chain, assignedResources) + format;
            return 'digraph { node [rx=3, ry=3];' + format + '}';
        }


        // CFSL-642
        function combineSameStart(data) {

            var combined = {},
                keysToDelete = new Set();

            Object.assign(combined, data);


            for (var key in data) {

                for (var innerKey in data) {

                    if (key === innerKey) {
                        continue;
                    }

                    combined[key].forEach(function(k) {

                        if (data[innerKey].has(k) || data[innerKey].has(key)) {
                            keysToDelete.add(innerKey);
                            combined[key] = new Set([...combined[key], ...data[innerKey]]);
                            combined[key].add(innerKey);
                            return;
                        }

                    });

                }

            }

            for (var key in keysToDelete) {
                delete combined[key];
            }

            return combined;

        }


        function checkIfServicesInChain(chain, s1, s2) {

            if (chain[s1] || chain[s2]) {
                return true;
            }

            for (var key in chain) {

                for (var i=0; i<chain[key].relations.length; i++) {
                    if (chain[key].relations[i].id === s1 || chain[key].relations[i].id === s2) {
                        return true;
                    }
                }

            }

            return false;

        }
     
        // Set up zoom support for graph
        (function() {
            var svg = d3.select("#DagrananaBatman"),
                inner = d3.select("#DagrananaBatman g"),
                zoom = d3.behavior.zoom();
            
            zoom.on("zoom", function() {
                inner.attr("transform", "translate(" + d3.event.translate + ")");
            });

            zoom.scaleExtent([1,1]);

            svg.call(zoom);
        }());


        function drawGraph(formattedGraph) {

            var render = dagreD3.render(),
                g = graphlibDot.read(formattedGraph);
           
            // Set margins, if not present
            if (!g.graph().hasOwnProperty("marginx") &&
                !g.graph().hasOwnProperty("marginy")) {
                g.graph().marginx = 20;
                g.graph().marginy = 20;
            }
            // g.graph().rankdir = "RL";

            g.graph().transition = function(selection) {
                return selection.transition().duration(500);
            };

            // Render the graph into svg g
            d3.select("#DagrananaBatman g").call(render, g);
        }


        function recenterGraph() {
            d3.select("#DagrananaBatman g").attr("transform", "translate(0,0) scale(1)");
            d3.behavior.zoom().translate([0,0]).scale(1);
        }


        function getColotByStatus(status) {

            switch (status) {

                case STATUS_CATEGORIES.NONE:
                    return '#a5e2d6';

                case STATUS_CATEGORIES.SCHEDULED:
                    return '#F9D058';

                case STATUS_CATEGORIES.DISPATCHED:
                    return '#8DD8FA';

                case STATUS_CATEGORIES.IN_PROGRESS:
                    return '#D68EF9';

                case STATUS_CATEGORIES.COMPLETED:
                    return '#95D055';

                case STATUS_CATEGORIES.COULD_NOT_COMPLETE:
                    return '#f58556';

                case STATUS_CATEGORIES.CANCELED:
                    return '#BEBCBA';

                default:
                    return '#B7C9EA';

            }


        }

        function getNodesLength() {
            return Object.keys(nodesLength).length;
        }

        let domParser = new DOMParser();
        String.prototype.decodeHTML = function() {
            let input = this;
            let doc = domParser.parseFromString(input, "text/html");
            return doc.documentElement.textContent !== '' ? doc.documentElement.textContent : input;
        }

        String.prototype.encodeHTML = function() {
            let input = this;
            input = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            return input;
        }

        // factory
        return {
            getMstChain: getMstChain,
            getRelatedServices: getRelatedServices,
            getComplexWorkLookupFields: getComplexWorkLookupFields,
            getRelatedServicesByLookupFieldId: getRelatedServicesByLookupFieldId,
            addTimeDependency: addTimeDependency,
            removeTimeDependency: removeTimeDependency,
            formatGraph: formatGraph,
            drawGraph: drawGraph,
            getNodesLength,
            checkIfServicesInChain: checkIfServicesInChain,
            getFieldsets: getFieldsets,
            getTreeOrderForScheduling,
            scheduleService: scheduleService,
            recenterGraph
        }

    }

}());