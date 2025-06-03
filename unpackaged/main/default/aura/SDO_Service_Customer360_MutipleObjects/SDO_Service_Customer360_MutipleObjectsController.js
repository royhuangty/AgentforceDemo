({
    doInit : function(component, event, helper) {
        console.log("init");
        var action = component.get('c.getContact');
        var recid = component.get('v.recordId');
        action.setParams( {recid : recid} );      
        action.setCallback(this, function(response){
                var state = response.getState();
                if (component.isValid() && state === "SUCCESS"){
                  component.set("v.contact", response.getReturnValue());
                  console.log(response.getReturnValue());
                }
                else {
                  console.log("Failed with state" + state);
                }
          })
          $A.enqueueAction(action);
        
    },
    viewContact : function(component, event, helper) {
        console.log('nav to trip');
        var contactId = component.get("v.contact.Id");
        var navEvt = $A.get("e.force:navigateToSObject");
            navEvt.setParams({
              "recordId": contactId
              
            });
            navEvt.fire();
   }
})