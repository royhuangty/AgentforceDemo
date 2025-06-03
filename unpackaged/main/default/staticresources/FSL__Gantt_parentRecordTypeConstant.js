'use strict';

(function () {
	angular.module('serviceExpert').constant('PARENT_RECORD_TYPE', {
		WORKORDER: 'WorkOrder',
		LINEITEM: 'WorkOrderLineItem',
		ACCOUNT: 'Account'
	});
})();