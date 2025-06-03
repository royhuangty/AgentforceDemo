var MARoutes = {
    // test change
    routeCount : 0,
    mobileStateZoom : null,
    mobileStateCenter : null,
    mobilestate : function (routeId) {
        var dfd = jQuery.Deferred();

        MARoutes.displayRoute(null,routeId).then(function() {
            dfd.resolve({success:true});
        });

        return dfd.promise();
    }
}
    
    function OrderNumbersOnWaypoints(options)
    {
        options = $.extend({
            mobile : MA.isMobile || false
        }, options || {});
    
        var $routingTable;
        if(MA.isMobile) {
            $routingTable = $('#routeSingleListView');
        }
        else {
            $routingTable = $('#Routing-Table');
        }
    
        var $tableRows = $routingTable.find('.waypoint-row');
        var $firstRow = $tableRows.first();
        var $lastRow = $tableRows.last();
        var $notFirstLast = $tableRows.not(':first').not(':last');
    
        //fix any locked waypoints that were moved
        $tableRows.not(':first').removeClass('start');
        $tableRows.not(':last').removeClass('end');
        $tableRows.not(':first').not(':last').removeClass('startend');
    
        if ($routingTable.find('.waypoint-row.startend').length === 1) {
            if($tableRows.not(':first').hasClass('startend')) {
                //this is the end update class
                $tableRows.last().removeClass('startend').addClass('end');
                //$routingTable.find('.waypoint-row.startend:not(:first-child)').removeClass('startend').addClass('end');
            }
            else {
                $tableRows.first().removeClass('startend').addClass('end');
                //$routingTable.find('.waypoint-row.startend:not(:last-child)').removeClass('startend').addClass('start');
            }
        }
    
        //relabel
        var lockOffset;
        if(MA.isMobile) {
            $('#routeListView').find('.routeInfo').remove();
            lockOffset = $firstRow.hasClass('start') || $firstRow.hasClass('startend') ? 1 : 0;
            //lockOffset = $('#routeSingleListView .waypoint-row.start, #routeSingleListView .waypoint-row.startend:not(:last-child)').length > 0 ? 1 : 0;
            //var $tableRows = $('#routeSingleListView .waypoint-row');
            $tableRows.removeClass('start-location');
            $tableRows.removeClass('end-location');
            $tableRows.removeAttr('index')
            $tableRows.each(function(key, value) {
                var $row = $(this);
                var rowOrder = key;
                if(lockOffset > 0) {
                    rowOrder = (key-1);
                }
                $row.attr('index',rowOrder);
                if(key === 0) {
                    $row.addClass('start-location');
                }
                else if (key === $tableRows.length-1) {
                    $row.addClass('end-location')
                }
    
                if (!$row.hasClass('startend') && !$row.hasClass('start') && !$row.hasClass('end')) {
                    $row.find('.time-block-counter').text(key + 1 - lockOffset);
                }
    
    
            });
        }
        else {
            lockOffset = $('#Routing-Table .waypoint-row.start, #Routing-Table .waypoint-row.startend:not(:last-child)').length > 0 ? 1 : 0;
            $('#Routing-Table .waypoint-row').each(function(key, value) {
                $(this).find('.svg-marker-waypoint text').text(key + 1 - lockOffset);
            });
        }
    
    
        //update summary data
        $('#tab-routes-route .waypoints-count').text($('#Routing-Table .waypoint-row').length + ' stops');
        $('#Routing-Table .waypoint-row .distance').text('');
        $('#drivingDistance, #totalTime').text('');
    }

    
    /******************************
    *	On Ready
    ******************************/
    $(function () {
    
        /****************************************
        *	Init
        ****************************************/
        //set up route waypoint spiderfy
        var loadInt = setInterval(function() {
            if(typeof(MARoutes) == 'object') {
                clearInterval(loadInt); 
                MARoutes.waypointMarkers = new OverlappingMarkerSpiderfier(MA.map, { keepSpiderfied: true });
                MARoutes.waypointMarkers.addListener('click', function (marker, e) {
                    if (marker.spiderfied || MARoutes.waypointMarkers.markersNearMarker(marker, true).length == 0) {
                        if(!marker.savedQueryId) {
                            waypoint_Click.call(marker, { markerType: 'waypoint' });
                        }
                    }
                });
                MARoutes.waypointMarkers.addListener('spiderfy', function (markersAffected, markersNotAffected) {
                    $.each(markersAffected, function (i, marker) {
                        marker.spiderfied = true;
                    });
                });
                MARoutes.waypointMarkers.addListener('unspiderfy', function (markersAffected, markersNotAffected) {
                    $.each(markersAffected, function (i, marker) {
                        marker.spiderfied = false;
                    });
                });
            }
        },500);
    
    });
    