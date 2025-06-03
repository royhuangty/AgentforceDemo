var app = angular.module("GroupRuleAndObjectives", []);

app.controller('groupController' , function($scope , fctGroupRuleAndObjectives){
			
	$scope.ruleOrObjective = objFields;
    $scope.UpdateSucceeded = true;
    $scope.SucceessMsg = '';
    //********  Set the selected field in Shift\Service ComboBox**********/	
	
	$scope.SetServieShiftFieldName = function(){
		var dtObjectFields;

		if(isFieldExpert) {
			dtObjectFields = $scope.dctServiceFields;
		}
		else {
			dtObjectFields = $scope.dctShiftFields;
		}
		if((objectField == null) || (objectField == ""))
			$scope.selectedServiceFields = customLabels.All;
		else
		{
			for (key in dtObjectFields) {
		 		  if (dtObjectFields.hasOwnProperty(key)) {	   
		 		    if(dtObjectFields[key] == objectField)
		 		    	$scope.selectedServiceFields = key;
		 		  }
		 	}			
		}
	}
		
	//******** Save -- In comboBox fields displayed as names and need to send to server the label of the fields , 
	//******** so using the proper dictionary for taking the field's label    **********/
		
	$scope.btnSaveClicked = function() {		
		if(isFieldExpert){
			fctGroupRuleAndObjectives.save($scope.dctServiceFields[$scope.selectedServiceFields] ,$scope.dctResourceFields[$scope.selectedResourceFields]).then(function(reuslt){
				$scope.SucceessMsg = '';
    			window.parent.location = '/' + ObjectId;	
			    $scope.UpdateSucceeded = true;
			},function(result){
			    $scope.UpdateSucceeded = false;
				$scope.SucceessMsg = result.message;
			});
		}
		else {
			fctGroupRuleAndObjectives.save($scope.dctShiftFields[$scope.selectedServiceFields] , $scope.dctResourceFields[$scope.selectedResourceFields]).then(function(reuslt){
				//alert(customLabels.SaveSuccessAlert);
				window.parent.location = '/' + ObjectId;
			});
		}
	}
		
	//******** Get resource's fields (Field's name and Field's label)*************//
		
	fctGroupRuleAndObjectives.getGrupe(ObjectName.resourceObjectName).then(function(resourceFields){
		//resourceFields.unshift('All');
		
		var arrayResourceFields = [];
		$scope.dctResourceFields  = {};
		$scope.dctResourceFields[customLabels.All] = null; 
		arrayResourceFields.unshift(customLabels.All);
		
		for(i=0; i<resourceFields.length; i++){
			arrayResourceFields.push(resourceFields[i].FieldName);
			var key = resourceFields[i].FieldName;
			var val = resourceFields[i].FieldLabel; 
			$scope.dctResourceFields [key] = val;
			
		}
		$scope.ResourceFiledsArray = arrayResourceFields;
		
		if((resourceField == null) || (resourceField == ""))
			$scope.selectedResourceFields = customLabels.All;
		else
		{
			for (key in $scope.dctResourceFields) {

		 		  if ($scope.dctResourceFields.hasOwnProperty(key)) {
		 		    console.log("key = " + key + ", value = " + $scope.dctResourceFields[key]);
		 		    if($scope.dctResourceFields[key] == resourceField)
		 		    
		 		    	$scope.selectedResourceFields = key;
		 		  }
		 	}
			
		}
	});

	if(isFieldExpert == true){
		$scope.ObjectName = customLabels.ServiceFieldLable;
		fctGroupRuleAndObjectives.getGrupe(ObjectName.serviceObjectName).then(function(servicetFields){
			
			var arrayServiceFields = [];

			arrayServiceFields.unshift(customLabels.All);
			$scope.dctServiceFields  = {};
			$scope.dctServiceFields[customLabels.All] = null; 
			for(i=0; i<servicetFields.length; i++){
				arrayServiceFields.push(servicetFields[i].FieldName);
				var key = servicetFields[i].FieldName;
				var val = servicetFields[i].FieldLabel; 
				$scope.dctServiceFields [key] = val;
				
			}
			$scope.ServiceFiledsArray = arrayServiceFields;
			$scope.SetServieShiftFieldName();
		})
	}
	else
	{
		$scope.ObjectName = customLabels.ShiftFieldLabel;
		fctGroupRuleAndObjectives.getGrupe(ObjectName.shiftObjectName).then(function(shiftFields){
			//shiftFields.unshift('All');
			
			var arrayshiftFields = [];

			arrayshiftFields.unshift(customLabels.All);
			$scope.dctShiftFields  = {};
			$scope.dctShiftFields[customLabels.All] = null; 
			for(i=0; i<shiftFields.length; i++){
				arrayshiftFields.push(shiftFields[i].FieldName);
				var key = shiftFields[i].FieldName;
				var val = shiftFields[i].FieldLabel; 
				$scope.dctShiftFields[key] = val;
				
			}
			$scope.ServiceFiledsArray = arrayshiftFields;
			$scope.SetServieShiftFieldName();
			
		});
	}
});

app.factory('fctGroupRuleAndObjectives' , function($q){
	return {
		getGrupe: function(objectName){
		 var deferred = $q.defer();
			Visualforce.remoting.Manager.invokeAction(
	        		RemoteActions.GetObjectFields, objectName  , function(result, ev)
	        		{ 
	        			if (ev.status) {
	        				deferred.resolve(result);
	        			}
	        			else{
	        				deferred.reject(ev);
	        			}
	        			
	        		});
			return deferred.promise;
		}, //SaveFieldsNamesOnWorkRule(Id Objectid , String ObjectName, String ObjectFieldName , String ResourceFieldName )
		save: function(selectedServiceFields , selectedResourceFields){
		 	
				var deferred = $q.defer();
		 	
				Visualforce.remoting.Manager.invokeAction(
						RemoteActions.SaveFieldsNamesOnWorkRule, ObjectId , CurrentObjectName, selectedServiceFields , selectedResourceFields, function(result, ev)
		        		{
		        			if (ev.status) {
		        				deferred.resolve(result);
		        			}
		        			else{
		        				deferred.reject(ev);
		        			}
		        		});
		
				return deferred.promise;
		}
	}
});