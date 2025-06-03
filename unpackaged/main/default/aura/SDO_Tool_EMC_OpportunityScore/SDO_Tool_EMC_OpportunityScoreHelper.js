({
    fireAction : function(component, apexAction, apexActionParams, assignedVariable) {
        let self = this;
        if(self.VERBOSE) console.log('fireAction', apexAction, apexActionParams);
        
        return new Promise($A.getCallback(function(resolve,reject){
            let action = component.get(apexAction);
            
            action.setParams(apexActionParams);
            
            action.setCallback(this, function(res){
                let response = res.getReturnValue();
                let state = res.getState();
                let error = res.getError();
                
                if(state !== 'SUCCESS') {
                    console.log('ERROR:'+apexAction, error);
                    reject(error);
                }
                if(assignedVariable && assignedVariable != ''){
                    if(self.VERBOSE) console.log(assignedVariable, response);
                    component.set(assignedVariable, response);
                }
                
                resolve(response);
            })
            
            $A.enqueueAction(action);
        }))
    },
    saveScore : function(component) {
        let action = component.get('c.saveOpportunityScore');
        let score = component.get('v.score');
        let reasons = component.get('v.reasons');
        let recordId = component.get('v.recordId');
        
        let locale = component.get('v.locale');
        let currencyCode = component.get('v.currencyCode');
        
        score['BaseId'] = recordId;
            
        let formatted_reasons = reasons.map(function(reason){
            let formatted_reason = {
                intensity: reason.intensity,
                intensityLevel: reason.intensityLevel,
                title:{
                    label: reason.title.label,
                    formatString: reason.title.formatString,
                    parameters: reason.title.parameters
                }
            }
            console.log('reason',reason);
            console.log('formatted_reason',formatted_reason);
            
            if(reason.arguments){
            	let parameters = []
                
                for(let argument of reason.arguments){
                    let value = argument.value;
                    let parameter = {};
                    
                    if(argument.type == 'currency'){
                        parameter.value = $A.localizationService.formatCurrency(value);
                        parameter.type = "string"
                    } else if(argument.type == 'number'){
                        parameter.value = $A.localizationService.formatNumber(value);
                        parameter.type = "string"
                    } else if(argument.type == 'date') {
                        parameter.value = value;
                        parameter.type = "date"
                    } else {
                        parameter.value = value;
                        parameter.type = "string"
                    }
                    
                    parameters.push(parameter);
                }
                
                console.log('parameters',parameters);
                formatted_reason.title.parameters = parameters;
            }
            
            return formatted_reason;
        })
        
        console.log(JSON.stringify(formatted_reasons));
        
        score['Insights'] = JSON.stringify(formatted_reasons)
        
        action.setParams({
            scoreData: score
        })
        
        action.setCallback(this, function(res){
            let retVal = res.getReturnValue();
            let state = res.getState();
            
            if(state === 'SUCCESS'){
                this.sendMixpanelEvent(
                    component, 
                    $A.getCallback(function(){
                        $A.get('e.force:refreshView').fire();
                        $A.get("e.force:closeQuickAction").fire();
                    }))
            } else if(state === 'INCOMPLETE'){
                console.log('INCOMPLETE', res.getError())
            } else {
                console.log('ERROR', res.getError());
            }
        })
        
        $A.enqueueAction(action);
    },
    sendMixpanelEvent: function(component, callback){
        let mixpanelEvent = component.getEvent('MixpanelEvent');
        mixpanelEvent.setParams({
            eventName: 'SDO Event',
            payload: {
                action: 'Score Opportunity'
            }
        });
        
        mixpanelEvent.fire();
        
        if(callback){
            callback();
        }
    }
})