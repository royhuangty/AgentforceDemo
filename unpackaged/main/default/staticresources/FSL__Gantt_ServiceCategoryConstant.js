'use strict';

(function () {

	angular.module('serviceExpert').factory('SERVICE_CATEGORY', function () {
		return {
			NONE: 'None',
			SCHEDULED: 'Scheduled',
			DISPATCHED: 'Dispatched',
			IN_PROGRESS: 'InProgress',
			COULD_NOT_COMPLETE: 'CannotComplete',
			COMPLETED: 'Completed',
			CANCELED: 'Canceled'
		};
	});
})();