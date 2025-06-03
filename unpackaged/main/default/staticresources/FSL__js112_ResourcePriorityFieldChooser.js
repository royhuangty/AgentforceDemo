var app = angular.module("ResourcePriorityFieldSelector",[]);
app.controller('ResourcePriorityFieldController', function ($scope,fctResourcePriorityFieldSelector) {

	//******** Save selected resource priority field name to the Service goal field **********/
	$scope.btnSaveClicked = function(){
		fctResourcePriorityFieldSelector.saveSelection($scope.selectedResourcePriorityField).then(function(){
			// Reload the page after save occurred
			window.parent.location = '/' + ObjectId;
		});
	};

	//******** Get numeric fields  **********/
	$scope.getNumericFields = function(objectName) {
		fctResourcePriorityFieldSelector.getNumericFields(objectName).then(function(numericFields){
			$scope.numericFieldsArray=numericFields;
			if (ResourcePriorityField == null || ResourcePriorityField == ''){
				// Select first property when no data is retrieved.
				$scope.selectedResourcePriorityField = Object.keys(numericFields)[0];
			} else {
				$scope.selectedResourcePriorityField = ResourcePriorityField;
			}
		});
	};

	$scope.getNumericFields('ServiceResource');

});

//******** Factory object to call VisualForce remote functions asynchronously **********/
app.factory('fctResourcePriorityFieldSelector', function($q) {
	return {
		getNumericFields: function(objectName) {
			var deferred = $q.defer();
			Visualforce.remoting.Manager.invokeAction(RemoteActions.getObjectNumericFields,
			 objectName, function (result, ev) {
	       		if (ev.status) {
	        		deferred.resolve(result);
	        	} else {
	        		deferred.reject(ev);
	        	}
			});
			return deferred.promise;
		},
		saveSelection: function(selectedPriorityField) {
			var deferred = $q.defer();
			Visualforce.remoting.Manager.invokeAction(RemoteActions.SaveFieldNameOnServiceGoal,
			 ObjectId, CurrentObjectName, selectedPriorityField, function (result, ev) {
	       		if (ev.status) {
	        		deferred.resolve(result);
	        	} else {
	        		deferred.reject(ev);
	        	}
			});
			return deferred.promise;
		}
	};
});