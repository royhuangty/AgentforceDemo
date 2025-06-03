({
    doInit : function(component, event, helper) {
        helper.filterReasons(component)
        .then(function(){
            return helper.loadExistingReason(component);
        })
    },
    intensityChangeHandler : function(component, event, helper){
        helper.filterReasons(component);
	},
    formatStringChangeHandler : function(component, event, helper){
        let reason = component.get('v.reason')
        let reasonOptions = component.get('v.reasonOptions');
		let selectedReasonIndex = event.getSource().get('v.value');
        let selectedReason = reasonOptions[selectedReasonIndex];
        
        reason.title.label = selectedReason.label;
        
        if(selectedReason.arguments){
            let opportunity = component.get('v.opportunity')
            
            for(let argument of selectedReason.arguments){ 
                if(argument.hasOwnProperty('path')){
                    let value = helper.getPath(opportunity, argument.path);
                    argument.value = value;
                }
            }
            reason['arguments'] = selectedReason.arguments
        }
        
        component.set('v.reason', reason)
	},
    deleteReason : function(component, event, helper){
        let deleteReason = component.getEvent("deleteReason");
        deleteReason.setParams({
            index: component.get('v.index')
        })
        deleteReason.fire();
    }
})