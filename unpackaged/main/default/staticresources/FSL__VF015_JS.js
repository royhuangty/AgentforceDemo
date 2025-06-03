//var serviceWrapper = {"serviceId":"","toStatus":"" ,"ActivityType":"", "signature":"", "inCompReason":"","inCompOther":"", "longitude":"","latitude":""};
var serviceWrapper = {"serviceId": "", "toStatus": "", "longitude": "", "latitude": ""},
    AssignStatus, VFstatusesArr = [], statusTranslations;

var statuses = [];
var ctrl15Data = [];

$(function () {

    if (typeof Sfdc !== "undefined" && typeof sforce !== 'undefined' && sforce.one !== undefined)
        $('header').hide();

    if (servicePinned == 'true') {
        $('#PinnedService').show();
        return;
    }

    $('.bs').show();
    
    serviceWrapper.serviceId = serviceId;
    setupServiceLegalStatuses();
});

function setupServiceLegalStatuses() {
    Visualforce.remoting.Manager.invokeAction(RemoteActions.getServiceLegalStatuses, function (result) {
            ctrl15Data = JSON.parse(result.replace(/"/g,'\"').replace(/&#39;/g,'\'').replace(/&quot;/g,'"'));
            getGeolocation();
            setStatusesArr();
            initStatuses();
        });
}

var setStatusesArr = function () {

    var pageStr = 'vf015_ChangeServiceStatus';

    if(ctrl15Data.statusTransitionConf == false){
        for (i = 0; i < Object.keys(ctrl15Data.statusesMap).length; i++) {
            statuses.push(Object.keys(ctrl15Data.statusesMap)[i]);
        }
    }

    for (i = 0; i < ctrl15Data.serviceLegalStatusesWrapperList.length; i++) {
        if(ctrl15Data.serviceLegalStatusesWrapperList[i].fromStatus === serviceStatus) {
            
            if(ctrl15Data.statusTransitionConf == true){
                
                var statusesKeyList = Object.keys(ctrl15Data.statusesMap);

                for (j = 0; j < statusesKeyList.length; j++) {
                    if( ctrl15Data.statusesMap[statusesKeyList[j]] == ctrl15Data.serviceLegalStatusesWrapperList[i].toStatus ){
                        statuses.push(statusesKeyList[j]);
                    }
                }
            }

            if(ctrl15Data.serviceLegalStatusesWrapperList[i].customVF != '--Select Page--' && 
                ctrl15Data.serviceLegalStatusesWrapperList[i].customVF != null && 
                ctrl15Data.serviceLegalStatusesWrapperList[i].customVF != pageStr){
                VFstatusesArr.push(ctrl15Data.serviceLegalStatusesWrapperList[i].toStatus);
            }
        }
    }
    
    statuses.sort();
    VFstatusesArr.sort();
};

var initStatuses = function () {
    var statusesLayout = '';

    if (statuses.length === 0) {
        $('.statuses-container').addClass('dn');
        $('.no-legal-statuses').removeClass('dn');
        $('#noStatusTransition').show();
    }
    else {
        var isEven = true;

        for (i = 0; i < statuses.length; i++) {
            if (isEven) {
                statusesLayout += '<div class="btn-group btn-block btn-group-justified" role="group" aria-label="...">';
            }
            statusesLayout += '<div class="btn-group btn-group-padding" role="group">';
            var strStatusAndType = statuses[i];
            //var status = strStatusAndType.split(',')[0];
            var status = strStatusAndType;
            //var ActivityType = strStatusAndType.split(',')[1];
            statusesLayout += '<button type="button" class="globalWhiteButton truncate status-button" status="' + status + '">' + status + '</button>';
            statusesLayout += '</div>';
            if (!isEven) {
                statusesLayout += '</div>';
            }
            isEven = !isEven;
        }

        if (!isEven) {
            statusesLayout += '<div class="btn-group" role="group">';
            statusesLayout += '<button type="button" class="button-status-expert btn btn-primary btn-lg btn-block"  disabled="disabled" style="visibility:hidden;"></button>';
            statusesLayout += '</div>';
            statusesLayout += '</div>';
        }

        $('.statuses-container').html(statusesLayout);

        statusChange();
    }
}

var Back = function () {
    getGeolocation();
    setStatusesArr();
    initStatuses();

    $('.signature-container').addClass('dn');
    $('.statuses-container').removeClass('dn');
    $('.comment-container').addClass('dn');
    $('.success-msg-container').addClass('dn');
};

var getGeolocation = function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            serviceWrapper.latitude = position.coords.latitude;
            serviceWrapper.longitude = position.coords.longitude;
        });
    }
};

var statusChange = function () {
    $('.statuses-container button').click(function () {
        var toStatus = this.innerText;
        console.log(toStatus);
        serviceWrapper.toStatus = ctrl15Data.statusesMap[toStatus];
        console.log(serviceWrapper.toStatus);
        //if the toStatus doesn't have customVf
        if (jQuery.inArray(serviceWrapper.toStatus, VFstatusesArr) == -1) {
            updateService();
        }
        else {
            
            var res;
            var currentStatus = serviceStatus;
            
            for (i = 0; i < ctrl15Data.serviceLegalStatusesWrapperList.length; i++) {
                if(ctrl15Data.serviceLegalStatusesWrapperList[i].fromStatus === currentStatus && ctrl15Data.serviceLegalStatusesWrapperList[i].toStatus === serviceWrapper.toStatus){
                    res = ctrl15Data.serviceLegalStatusesWrapperList[i].customVF;
                }
            }

            if (UserUITheme === 'Theme4t'){          // Mobile 
                if (res) {
                    var myUrl = ctrl15Data.loginUrlForCommunities + '/apex/' + res + '?id=' + serviceId + '&status=' + toStatus;
                    sforce.one.navigateToURL(myUrl, true);
                }
            } 
            else if(UserUITheme === 'Theme4d'){         // Lightning 
                var myUrl = ctrl15Data.loginUrlForCommunities + '/apex/' + res + '?id=' + serviceId;
                window.location.href = ctrl15Data.loginUrlForCommunities + '/apex/' + res + '?id=' + serviceId;
            }
            else {                                      // Classic 
                var myUrl = ctrl15Data.loginUrlForCommunities + '/apex/' + res + '?id=' + serviceId;
                window.location.href = ctrl15Data.loginUrlForCommunities + '/apex/' + res + '?id=' + serviceId;
            }
            
            // if (typeof Sfdc !== "undefined" && typeof sforce !== 'undefined') {
            //     if (res) {
            //         var myUrl = ctrl15Data.loginUrlForCommunities + '../apex/' + res + '?id=' + serviceId;//+ '&status=' + toStatus;
            //         console.log(myUrl);
            //         // sforce.one.navigateToURL(myUrl, true);
            //         window.location.href = '../apex/' + res + '?id=' + serviceId;
            //     }
            // }
            // else if (sforce.one !== undefined)
            //     if (res) {
            //         var myUrl = ctrl15Data.loginUrlForCommunities + '../apex/' + res + '?id=' + serviceId;//+ '&status=' + toStatus;
            //         console.log(myUrl);
            //         sforce.one.navigateToURL(myUrl, true);
            //         // window.location.href = '../apex/' + res + '?id=' + serviceId;
            //     }
            // else {
            //     window.location.href = '../apex/' + res + '?id=' + serviceId;
            // }
        }
    });
}

var updateService = function () {
    serviceStatus = serviceWrapper.toStatus;

    Visualforce.remoting.Manager.invokeAction(RemoteActions.updateService, JSON.stringify(serviceWrapper),
        function (result, meta) {
            $('.statuses-container').addClass('dn');
            $('.success-msg-container').removeClass('dn');

            if (result) {
                $($('#UpdatedStatusSeccessfully span')[1]).text(labels.updateSuccessfully);
                $('#UpdatedStatusFailed').hide();
                quickActionUtils.refreshParentFrame(serviceId);
            }
            else {
                $($('#UpdatedStatusSeccessfully span')[1]).text(labels.updateFailed);
                $('#UpdatedStatusFailed').show();
                $('#BackToTheFirstPage').show();
                $('#UpdatedStatusFailed div span').text(meta.message)
            }
        });
};