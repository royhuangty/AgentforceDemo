({
    onInit : function(component, event, helper){
        let action = component.get('c.getLogins');
        
        let externalIds = component.get('v.LoginUserIds');
        
        if(externalIds != undefined){
            externalIds = externalIds.split(',');
            for(let i = 0; i < externalIds.length; i++){
                externalIds[i] = externalIds[i].trim();
            }
            externalIds = JSON.stringify(externalIds);
        }
        
        action.setParams({
            sExternalIds: externalIds != undefined ? externalIds : '[]'
        });
        
        action.setCallback(this, function(res){
            let state = res.getState();
            let retVal = res.getReturnValue();
            
            if(state === 'SUCCESS'){
                helper.createUsers(component, retVal);
            }
            else {
                console.log('LogMeIn:onInit:error', res.getError());
            }
        });
        
        $A.enqueueAction(action);
    }
})