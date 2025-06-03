({
    onInit : function(component, event, helper) {
        let opportunityId = component.get('v.recordId');
        
        helper.fireAction(component, 'c.getOpportunity', { 
            opportunityId: opportunityId
        }).then(function(opportunity){
            component.set('v.opportunity', opportunity);
        })
        
        helper.fireAction(component, 'c.getOpportunityScore', { 
            opportunityId: opportunityId
        }).then(function(scores){
            console.log(JSON.stringify(scores,null,2));
            let score = scores[0];
            let reasons = score && score.Insights ? JSON.parse(score.Insights) : [];
            
            for(let reason of reasons){
                reason.intensityLevel = reason.intensity > 0 ? 'HIGH_POS': 'HIGH_NEG';
            }
            
            component.set('v.score', score);
            component.set('v.reasons', reasons);
        })
        
        helper.fireAction(component, 'c.getUserLocale', {}, 'v.locale')
        helper.fireAction(component, 'c.getCurrencyCode', {}, 'v.currencyCode')
    },
    addReason : function(component, event, helper){
        let baseId = component.get('v.recordId');
        let reasons = component.get('v.reasons');
        let reason = {
            intensity: 0.9,
            intensityLevel: "HIGH_POS",
            title: {
                label:"AMOUNT_INCREASE_P",
                formatter: "custom",
                formatString: "Higher likelihood to win when amount went up significantly",
                parameters: []
            }
        }
        reasons.push(reason);
        component.set('v.reasons', reasons);
    },
    deleteReason : function(component, event, helper){
        let reasons = component.get('v.reasons');
        let reasonIndex = event.getParam('index');
        let reason = reasons[reasonIndex];
        console.log('reason',reason);
        
        if(reason.hasOwnProperty('Id')){
            helper.deleteReason(component, reason.Id, reasonIndex);
        } else {
            reasons.splice(reasonIndex, 1);
            component.set('v.reasons', reasons);
        }
    },
    save : function(component, event, helper){
        helper.saveScore(component);
    },
    cancel : function(component, event, helper){
        $A.get("e.force:closeQuickAction").fire();
    }
})