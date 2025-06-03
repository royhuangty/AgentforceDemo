var serviceWrapper = {"serviceId":"","toStatus":"" , "signature":"",  "longitude":"","latitude":""};
var openSignCanvas = function(){
	$('.statuses-container').addClass('dn');
	$('.signature-container').removeClass('dn');
	$('.btn-group-padding').removeClass('dn');
	$('#BackToTheFirstPage').show();
	
}
var completeBtnHandler = function(){
	$('.approve-comp-btn').click(function(){	
		serviceWrapper.signature = $('#signature').jSignature('getData', 'image')[1];
		updateService();
	});

	$('.back-comp-btn').click(function(){	//back button
		$('.statuses-container').removeClass('dn');
		$('.signature-container').addClass('dn');
	});
}
var BackBtn = function(){
	$('#BackToTheFirstPage').click(function(){
		backTest();
	});
}

var getGeolocation = function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            serviceWrapper.latitude = position.coords.latitude;
            serviceWrapper.longitude = position.coords.longitude;
        });
    }
};

var updateService = function(){
	$('.serviceStatus')[0].innerHTML = serviceWrapper.toStatus;

	Visualforce.remoting.Manager.invokeAction(RemoteActions.updateService,JSON.stringify(serviceWrapper),
		function(result){
			$('.signature-container').addClass('dn');
			$('.statuses-container').addClass('dn');
			$('.success-msg-container').removeClass('dn');

			if(result){
				quickActionUtils.refreshParentFrame($('.serviceId').text());
			}
			else
			{
				$('#UpdatedStatusSeccessfully').hide();
				$('#UpdatedStatusFailed').show();
				$('#BackToTheFirstPage').show();
			}
		});
}
function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) {
                    return pair[1];
                }
            } 
        }

$(function() {
	if(typeof Sfdc !== "undefined" && typeof sforce !== 'undefined' && sforce.one!== undefined)
		$('header').hide();

	BackBtn();
	getGeolocation();

	$('.bs').show();
	serviceWrapper.serviceId = $('.serviceId').text();
	if ((typeof Sfdc !== "undefined" && typeof sforce !== 'undefined' && sforce.one!== undefined)){	//mobile view
		$('.signature-container .compl-buttons').addClass('dn');
		$('.comment-container .incomp-buttons').addClass('dn');
		$('#signature').jSignature({color:'#000',lineWidth:3, height:300, 'background-color': 'transparent',
        'decor-color': 'transparent'});
	}
	else{
		$('#signature').jSignature({color:'#000',lineWidth:3,'background-color': 'transparent',
        'decor-color': 'transparent'});	//init signature canvas for web view
	}
	completeBtnHandler();
	//$('.signature-container').addClass('dn');
});

