({
    filterReasons : function(component) {
        let self = this;
        
        return new Promise($A.getCallback(function(resolve,reject){
            try{
                let confidence = component.find('intensity').get('v.value');
                console.log('confidence',JSON.stringify(confidence))
                let filterString = confidence.includes('POS') ? 'POS' : 'NEG';
                let opportunityReasons = self.opportunityReasons;
                let reasonOptions = opportunityReasons.filter( function(reason){
                    return reason.trend === filterString;
                })
                
                component.set('v.reasonOptions', reasonOptions);
                resolve();
            } catch(err){
                reject(err);
            }
        }))
    },
    loadExistingReason: function(component){
        let self = this;
        
        return new Promise($A.getCallback(function(resolve,reject){
            try{
                let reason = component.get('v.reason');
                let reasonsOptions = component.get('v.reasonOptions');
                console.log('helper:reason',JSON.stringify(reason,null,2))
                
                let matchedReasonIndex = reasonsOptions.findIndex(function(reasonsOption,index){
                    if(reasonsOption.label.toUpperCase() == reason.title.label.toUpperCase()){
                        return true;
                    }
                })
                
                component.set('v.reasonIndex', matchedReasonIndex);
                
                let selectedReason = reasonsOptions[matchedReasonIndex];

                if(selectedReason.hasOwnProperty('arguments')){
                    for(let [index,argument] of selectedReason.arguments.entries()){
                        argument.value = reason.title.parameters[index].value;
                    }
                    reason['arguments'] = selectedReason.arguments
                }
                
                component.set('v.reason', reason)
                resolve();
            } catch(err){
                reject(err);
            }
        }))
    },
    getPath: function(o, s){
        s = s.replace(/\[(\w+)\]/g, '.$1');
        s = s.replace(/^\./, '');
        let a = s.split('.');
        
        for (var i = 0, n = a.length; i < n; ++i) {
            var k = a[i];
            if (k in o) {
                o = o[k];
            } else {
                return;
            }
        }
        return o;
    },
    opportunityReasons: [
        //Labels not working in 210. Swap back to label and formatString when available
        {
            "label": "AMOUNT_DECREASE_N",
            "formatString": "Lower likelihood to win when amount went down significantly",
            "trend": "NEG"
        },
        {
            "label": "AMOUNT_DECREASES_CONSTANTLY_N",
            "formatString": "Lower likelihood to win when amount keeps going down",
            "trend": "NEG"
        },
        {
            "label": "AMOUNT_INCREASES_CONSTANTLY_P",
            "formatString": "Lower likelihood to win when amount keeps going up",
            "trend": "NEG"
        },
        {
            "label": "MISSING_AMOUNT",
            "formatString": "Amount is missing",
            "trend": "NEG"
        },
        {
            "label": "DEAL_WRONG_ON_TIME",
            "formatString": "Wrong time of year for this deal",
            "trend": "NEG"
        },
        {
            "label": "OPP_AGING_N",
            "formatString": "Lower likelihood to win when deals take longer",
            "trend": "NEG"
        },
        {
            "label": "OPP_NO_RECENT_UPDATES",
            "formatString": "No recent updates to opportunity",
            "trend": "NEG"
        },
        {
            "label": "ACCOUNT_PAST_LOST",
            "formatString": "Past losses with accounts",
            "trend": "NEG"
        },
        {
            "label": "MISSING_LEAD_SOURCE",
            "formatString": "Missing lead source",
            "trend": "NEG"
        },
        {
            "label": "LEAD_SOURCE_LOW_SUCCESS",
            "formatString": "Low success rate from this lead source compared to other sources",
            "trend": "NEG"
        },
        {
            "label": "MISSING_TYPE",
            "formatString": "Opportunity type is missing",
            "trend": "NEG"
        },
        {
            "label": "OPP_TYPE_LOW_SUCCESS",
            "formatString": "Low success rate for this opportunity type compared to other types",
            "trend": "NEG"
        },
        {
            "label": "MISSING_INDUSTRY",
            "formatString": "Industry is missing",
            "trend": "NEG"
        },
        {
            "label": "INDUSTRY_LOW_SUCCESS",
            "formatString": "Low success rate from this industry compared to other industries",
            "trend": "NEG"
        },
        {
            "label": "CURR_STAGE_LOW_SUCCESS",
            "formatString": "Low success rate for opportunities reaching this stage compared to other stages",
            "trend": "NEG"
        },
        {
            "label": "DEAL_STAGES_MOVING_SLOW",
            "formatString": "Deal moving slowly through stages",
            "trend": "NEG"
        },
        {
            "label": "DEAL_CURR_STAGE_MOVING_SLOW",
            "formatString": "Current stage is taking too long",
            "trend": "NEG"
        },
        {
            "label": "MISSING_CLOSE_DATE",
            "formatString": "Missing close date",
            "trend": "NEG"
        },
        {
            "label": "CLOSE_DATE_DELAYED_N",
            "formatString": "Close date delayed",
            "trend": "NEG"
        },
        {
            "label": "CLOSE_DATE_DELAYS_CONSTANTLY_N",
            "formatString": "Close date repeatedly delayed",
            "trend": "NEG"
        },
        {
            "label": "CLOSE_DATE_OVERDUE_N",
            "formatString": "Close date overdue",
            "trend": "NEG"
        },
        {
            "label": "CURR_FORECAST_CATEGORY_LOW_SUCCESS",
            "formatString": "Low success rate for opportunities reaching this forecast category compared to other stages",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_PROSPECT_UNRESPONSIVE",
            "formatString": "Prospect has not responded",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_COMPETITION_MENTIONED",
            "formatString": "Competition was mentioned",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_NO_COMMUNICATION",
            "formatString": "No communication",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_CONTACT_LEAVING",
            "formatString": "Contact is leaving",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_TASK_OVERDUE",
            "formatString": "Task overdue",
            "trend": "NEG"
        },
        {
            "label": "INSIGHT_NO_FUTURE_ACTIVITY",
            "formatString": "Opportunity has no open activity",
            "trend": "NEG"
        },
        {
            "label": "PRODUCT_LOW_SUCCESS",
            "formatString": "Low success rate for this product compared to your other products",
            "trend": "NEG"
        },
        {
            "label": "AMOUNT_INCREASE_P",
            "formatString": "Higher likelihood to win when amount went up significantly",
            "trend": "POS",
        },
        {
            "label": "AMOUNT_DECREASE_P",
            "formatString": "Higher likelihood to win when amount went down significantly",
            "trend": "POS"
        },
        {
            "label": "AMOUNT_DECREASES_CONSTANTLY_P",
            "formatString": "Higher likelihood to win when amount keeps going down",
            "trend": "POS"
        },
        {
            "label": "AMOUNT_INCREASES_CONSTANTLY_P",
            "formatString": "Higher likelihood to win when amount keeps going up",
            "trend": "POS"
        },
        {
            "label": "DEAL_RIGHT_ON_TIME",
            "formatString": "Right time of year for this deal",
            "trend": "POS"
        },
        {
            "label": "OPP_AGING_P",
            "formatString": "Higher likelihood to win when deals take longer",
            "trend": "POS"
        },
        {
            "label": "ACCOUNT_PAST_WIN",
            "formatString": "Past wins with accounts",
            "trend": "POS"
        },
        {
            "label": "LEAD_SOURCE_HIGH_SUCCESS",
            "formatString": "High success rate from this lead source compared to other sources",
            "trend": "POS"
        },
        {
            "label": "OPP_TYPE_HIGH_SUCCESS",
            "formatString": "High success rate for opportunity type compared to other types",
            "trend": "POS"
        },
        {
            "label": "INDUSTRY_HIGH_SUCCESS",
            "formatString": "High success rate from this industry compared to other industries",
            "trend": "POS"
        },
        {
            "label": "CURR_STAGE_HIGH_SUCCESS",
            "formatString": "High success rate for opportunities reaching this stage compared to other stages",
            "trend": "POS"
        },
        {
            "label": "DEAL_STAGES_MOVING_FAST",
            "formatString": "Deal moving quickly through stages",
            "trend": "POS"
        },
        {
            "label": "DEAL_PREV_STAGE_MOVING_FAST",
            "formatString": "Previous stage completed quickly",
            "trend": "POS"
        },
        {
            "label": "CLOSE_DATE_MOVED_UP",
            "formatString": "Close date moved up",
            "trend": "POS"
        },
        {
            "label": "CLOSE_DATE_DELAYED_P",
            "formatString": "You are more likely to win when the close date is delayed",
            "trend": "POS"
        },
        {
            "label": "CLOSE_DATE_MOVES_UP_CONSTANTLY",
            "formatString": "Close date repeatedly moved up",
            "trend": "POS"
        },
        {
            "label": "CLOSE_DATE_DELAYS_CONSTANTLY_P",
            "formatString": "You are more likely to win when the close date is repeatedly delayed",
            "trend": "POS"
        },
        {
            "label": "CLOSE_DATE_OVERDUE_P",
            "formatString": "You are more likely to win when the close date overdue",
            "trend": "POS"
        },
        {
            "label": "CURR_FORECAST_CATEGORY_HIGH_SUCCESS",
            "formatString": "High success rate for opportunities reaching this forecast category compared to other stages",
            "trend": "POS"
        },
        {
            "label": "HIGH_ACTIVITY",
            "formatString": "Lots of activity in this opportunity",
            "trend": "POS"
        },
        {
            "label": "FUTURE_ACTIVITY",
            "formatString": "Future activity exists",
            "trend": "POS"
        },
        {
            "label": "INSIGHT_RE_ENGAGED",
            "formatString": "Re-engaged opportunity",
            "trend": "POS"
        },
        {
            "label": "PRODUCT_HIGH_SUCCESS",
            "formatString": "High success rate for this product compared to your other products",
            "trend": "POS"
        },
        {
            "label": "AMOUNT_INCREASE_RANGE_P",
            "formatString": "Opportunity amount increased from [Previous Amount] to [Current Amount] on [Updated Date].",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Previous Amount",
                    "type": "currency",
                    "value": 99
                },
                {
                    "label": "Current Amount",
                    "type": "currency",
                    "path": "Amount",
                    "value": 99
                },
                {
                    "label": "Updated Date",
                    "type": "date",
                    "value": "2022-01-01"
                },
            ]
        },
        {
            "label": "AMOUNT_DECREASE_RANGE_N",
            "formatString": "Opportunity amount decreased from [Previous Amount] to [Current Amount] on [Updated Date].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Previous Amount",
                    "type": "currency",
                    "value": 99
                },
                {
                    "label": "Current Amount",
                    "type": "currency",
                    "path": "Amount",
                    "value": 99
                },
                {
                    "label": "Updated Date",
                    "type": "date",
                    "value": "2022-01-01"
                },
            ]
        },
        {
            "label": "AMOUNT_INCREASED_NUMBER_OF_TIMES_P",
            "formatString": "Opportunity amount has recently increased [Amount] times.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Amount",
                    "type": "number",
                    "value": 1
                }
            ]
        },
        {
            "label": "AMOUNT_DECREASED_NUMBER_OF_TIMES_N",
            "formatString": "Opportunity amount has recently decreased [Amount] times.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Amount",
                    "type": "number",
                    "value": 1
                }
            ]
        },
        {
            "label": "DEAL_STAGES_MOVING_FAST_SPECIFIC",
            "formatString": "Opportunity is moving quickly. It took [Days] days to reach the [Stage Name] stage.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Days",
                    "type": "number",
                    "value": 1
                },
                {
                    "label": "Stage Name",
                    "type": "text",
                    "path": "StageName",
                    "value": 'Discovery'
                }
            ]
        },
        {
            "label": "DEAL_STAGES_MOVING_SLOW_SPECIFIC",
            "formatString": "Opportunity is moving slowly. It has been open since [Date].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Date",
                    "type": "date",
                    "value": '2022-01-01'
                }
            ]
        },
        {
            "label": "CLOSE_DATE_MOVED_UP_SPECIFIC",
            "formatString": "Close date moved up to [New Date] on [Updated Date].",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "New Date",
                    "type": "date",
                    "value": "2022-01-01"
                },
                {
                    "label": "Updated Date",
                    "type": "date",
                    "value": '2022-01-01'
                }
            ]
        },
        {
            "label": "CLOSE_DATE_DELAYED_SPECIFIC_N",
            "formatString": "Close date recently changed to [New Date]. Based on past opportunities, that's a negative sign.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "New Date",
                    "type": "date",
                    "value": '2022-01-01'
                }
            ]
        },
        {
            "label": "CLOSE_DATE_MOVES_UP_NUMBER_TIMES",
            "formatString": "Close date has moved up [Times Moved Up] times.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Moved Up",
                    "type": "number",
                    "value": 1
                }
            ]
        },
        {
            "label": "CLOSE_DATE_DELAYS_NUMBER_TIMES_N",
            "formatString": "Close date has been delayed [Times Delayed] times.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Moved Up",
                    "type": "number",
                    "value": 1
                }
            ]
        },
        {
            "label": "HIGH_ACTIVITY_NUMBER_TIMES",
            "formatString": "Opportunity has had [Number of Activities] activities since being created.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Number of Activities",
                    "type": "number",
                    "value": 1
                }
            ]
        },
        {
            "label": "AMOUNT_CHANGES_NUMBER_TIMES_P",
            "formatString": "Opportunity amount has changed [Times Changed] times since being created. Based on past deals, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Changed",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "AMOUNT_CHANGES_NUMBER_TIMES_N",
            "formatString": "Opportunity amount has changed [Times Changed] times since being created. Based on past deals, that's not good.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Changed",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "CLOSE_DATE_CHANGES_NUMBER_TIMES_P",
            "formatString": "Close date has changed [Times Changed] times since being created. Based on past deals, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Changed",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "CLOSE_DATE_CHANGES_NUMBER_TIMES_N",
            "formatString": "Close date has changed [Times Changed] times since being created. Based on past deals, that's not good.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Changed",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "AMOUNT_DECREASE_RANGE_P",
            "formatString": "Opportunity amount recently decreased from [Old Amount] to [New Amount]. Based on past deals, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Old Amount",
                    "type": "currency",
                    "value": 10000
                },
                {
                    "label": "New Amount",
                    "type": "currency",
                    "path": "Amount",
                    "value": 5000
                }
            ]
        },
        {
            "label": "CLOSE_DATE_DELAYED_SPECIFIC_P",
            "formatString": "Close date recently changed to [Close Date]. Based on past opportunities, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Close Date",
                    "type": "date",
                    "value": "2022-01-01"
                }
            ]
        },
        {
            "label": "AMOUNT_DECREASED_NUMBER_OF_TIMES_P",
            "formatString": "Opportunity amount has decreased [Times Decreased] times since it was created. Based on past deals, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Decreased",
                    "type": "number",
                    "value": 2
                }
            ]
        },
        {
            "label": "CLOSE_DATE_DELAYS_NUMBER_TIMES_P",
            "formatString": "Close date delayed [Times Delayed] times since opportunity was created. Based on past deals, that's a good sign.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Times Delayed",
                    "type": "number",
                    "value": 2
                }
            ]
        },
        {
            "label": "PRODUCT_HIGH_SUCCESS_SPECIFIC_WITH_NAME",
            "formatString": "Opportunities that include [Product Name] typically have high success.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Product Name",
                    "type": "text",
                    "value": "Product A"
                }
            ]
        },
        {
            "label": "PRODUCT_LOW_SUCCESS_SPECIFIC_WITH_NAME",
            "formatString": "Opportunities that include [Product Name] typically have low success.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Product Name",
                    "type": "text",
                    "value": "Product A"
                }
            ]
        },
        {
            "label": "OPP_OPEN_SINCE_N",
            "formatString": "Opportunity is taking longer than other [Type] opportunities. It has been open since [Open Date].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Type",
                    "type": "text",
                    "path":"Type",
                    "value": "New Business"
                },
                {
                    "label": "Open Date",
                    "type": "date",
                    "value": "2022-01-01"
                }
            ]
        },
        {
            "label": "OPP_TYPE_HIGH_SUCCESS_SPECIFIC",
            "formatString": "Opportunities of type [Type] have a high success rate.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Type",
                    "type": "text",
                    "path":"Type",
                    "value": "New Business"
                }
            ]
        },
        {
            "label": "OPP_TYPE_LOW_SUCCESS_SPECIFIC",
            "formatString": "Opportunities of type [Type] have a low success rate.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Type",
                    "type": "text",
                    "path":"Type",
                    "value": "New Business"
                }
            ]
        },
        {
            "label": "CURR_STAGE_HIGH_SUCCESS_SPECIFIC",
            "formatString": "High success rate when opportunities reach the [Stage Name] stage.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Stage Name",
                    "type": "text",
                    "path": "StageName",
                    "value": "Discovery"
                }
            ]
        },
        {
            "label": "CURR_STAGE_LOW_SUCCESS_SPECIFIC",
            "formatString": "Opportunities at the [Stage Name] stage have a low success rate.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Type",
                    "type": "text",
                    "path": "StageName",
                    "value": "Qualification"
                }
            ]
        },
        {
            "label": "RECORD_TYPE_HIGH_SUCCESS_SPECIFIC",
            "formatString": "Opportunities with the [Record Type] record type have a high success rate.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Record Type",
                    "type": "text",
                    "path": "RecordType.Name",
                    "value": "Simple Opportunity"
                }
            ]
        },
        {
            "label": "RECORD_TYPE_LOW_SUCCESS_SPECIFIC",
            "formatString": "Opportunities with the [Record Type] record type have a low success rate.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Record Type",
                    "type": "text",
                    "path": "RecordType.Name",
                    "value": "Simple Opportunity"
                }
            ]
        },
        {
            "label": "DEAL_CURR_STAGE_MOVING_SLOW_STUCK_STAGE",
            "formatString": "Stuck in [Stage Name] stage since [Date].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Stage Name",
                    "type": "text",
                    "path": "StageName",
                    "value": "Qualification"
                },
                {
                    "label": "Date",
                    "type": "Date",
                    "value": "2022-01-01"
                }
            ]
        },
        {
            "label": "LEAD_SOURCE_HIGH_SUCCESS_SPECIFIC",
            "formatString": "High success rate with opportunities from the [Lead Source] lead source.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Lead Source",
                    "type": "text",
                    "path": "Lead Source",
                    "value": "Web"
                }
            ]
        },
        {
            "label": "LEAD_SOURCE_LOW_SUCCESS_SPECIFIC",
            "formatString": "Low success rate with opportunities from the [Lead Source] lead source.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Lead Source",
                    "type": "text",
                    "path": "Lead Source",
                    "value": "Web"
                }
            ]
        },
        {
            "label": "DEAL_PREV_STAGE_MOVING_FAST_DAYS",
            "formatString": "Advanced from previous opportunity stage in [Days in Stage] days.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Days in Stage",
                    "type": "number",
                    "value": 2
                }
            ]
        },
        {
            "label": "OPP_LAST_UPDATE",
            "formatString": "This opportunity hasn't been updated since [Last Update].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Last Update",
                    "type": "Date",
                    "value": "2022-01-01"
                }
            ]
        },
        {
            "label": "CURR_FORECAST_CATEGORY_HIGH_SUCCESS_SPECIFIC",
            "formatString": "Opportunities with the [Forecast Category] forecast category have a high success rate.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Forecast Category",
                    "type": "text",
                    "path": "ForecastCategoryName",
                    "value": "Best Case"
                }
            ]
        },
        {
            "label": "CLOSE_DATE_OVERDUE_DAYS_N",
            "formatString": "Close date of [Close Date] is overdue.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Close Date",
                    "type": "date",
                    "value": "2022-01-01"
                }
            ]
        },
        {
            "label": "CATEGORICAL_CUSTOM_FIELD_HIGH_SUCCESS_SPECIFIC",
            "formatString": "High success rate for opportunites where the value of the [Field Name] field is [Field Value].",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Field Name",
                    "type": "text",
                    "value": "Custom_Field__c"
                },
                {
                    "label": "Field Value",
                    "type": "text",
                    "value": "Some Value"
                }
            ]
        },
        {
            "label": "CATEGORICAL_CUSTOM_FIELD_LOW_SUCCESS_SPECIFIC",
            "formatString": "Low success rate for opportunities where the value of the [Field Name] field is [Field Value].",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Field Name",
                    "type": "text",
                    "value": "Custom_Field__c"
                },
                {
                    "label": "Field Value",
                    "type": "text",
                    "value": "Some Value"
                }
            ]
        },
        {
            "label": "ACCOUNT_WINS_SPECIFIC",
            "formatString": "Past wins with the [# of Wins] account.",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "# of Wins",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "ACCOUNT_LOSSES_SPECIFIC",
            "formatString": "Past losses with the [Account Name] account.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Account Name",
                    "type": "string",
                    "path": "Account.Name",
                    "value": "Account Name"
                }
            ]
        },
        {
            "label": "INDUSTRY_HIGH_SUCCESS_SPECIFIC",
            "formatString": "High success rate with opportunities in the [Industry Name] industry. ",
            "trend": "POS",
            "parameters": {},
            "arguments": [
                {
                    "label": "Industry Name",
                    "type": "text",
                    "path": "Account.Industry",
                    "value": 3
                }
            ]
        },
        {
            "label": "INDUSTRY_LOW_SUCCESS_SPECIFIC",
            "formatString": "Low success rate with opportunities in the [Industry Name] industry.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Industry Name",
                    "type": "text",
                    "path": "Account.Industry",
                    "value": 3
                }
            ]
        },
        {
            "label": "NUM_TOTAL_ACT_STATS",
            "formatString": "More engagement needed. Win rates were [Probability]% higher for similar deals with more than [# of Engagements] activities in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Engagements",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_MEETINGS_STATS",
            "formatString": "More meetings needed. Win rates were [Probability]% higher for similar deals with more than [# of Engagements] meetings in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Engagements",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_CALLS_STATS",
            "formatString": "More calls needed. Win rates were [Probability]% higher for similar deals with more than [# of Engagements] calls in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Engagements",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_IN_EMAILS_NUM_STATS",
            "formatString": "Low inbound email volume. Win rates were higher for similar deals with at least [# of Emails] inbound emails in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_OUT_EMAILS_N_STATS",
            "formatString": "More outbound emails needed. Win rates were [Probability]% higher for similar deals with more than [# of Emails] outbound emails in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_EMAILS_STATS",
            "formatString": "More email engagement needed. Win rates were [Probability]% higher for similar deals with more than [# of Emails] emails in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "GAP_COMMUNICATION",
            "formatString": "Recent gap in communication. Win rates were [Probability]% higher for similar deals when communication was frequent.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "CONTACT_NOT_RESPONDED",
            "formatString": "Contact has not responded to a recent email. Win rates were [Probability]% higher for similar deals when communication was frequent.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "NUM_CONTACTS_STATS",
            "formatString": "Too few contacts involved. Win rates were [Probability]% higher for similar deals with at least [Contacts] buyer contacts engaged.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Contacts",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "NUM_ENG_CONTACTS_LOW_STATS",
            "formatString": "Not enough contacts are engaging. Win rates were [Probability]% higher for similar deals with at least [# of Contacts] contacts actively communicating in this stage.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Contacts",
                    "type": "number",
                    "value": 5
                }
            ]
        },
        {
            "label": "RATE_TOTAL_ACT_STATS",
            "formatString": "More engagement needed. Win rates were [Probability]% higher for similar deals with more than [# of Meetings] activities in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Meetings",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_MEETINGS_STATS",
            "formatString": "More meetings needed. Win rates were [Probability]% higher for similar deals with more than [# of Meetings] meetings in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Meetings",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_CALLS_STATS",
            "formatString": "More calls needed. Win rates were [Probability]% higher for similar deals with more than [# of Calls] meetings in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Calls",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_IN_EMAILS_N_STATS",
            "formatString": "Low inbound email frequency. Win rates were higher for similar deals with at least [# of Emails] inbound emails in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_OUT_EMAILS_N_STATS",
            "formatString": "More outbound email engagement needed. Win rates were [Probability]% higher for similar deals with more than [# of Emails] outbound emails in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_EMAILS_STATS",
            "formatString": "More email engagement needed. Win rates were [Probability]% higher for similar deals with more than [# of Emails] emails in [# of Days] days.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                },
                {
                    "label": "# of Emails",
                    "type": "number",
                    "value": 5
                },
                {
                    "label": "# of Days",
                    "type": "number",
                    "value": 3
                }
            ]
        },
        {
            "label": "RATE_TOTAL_ACT_SNC_CREATION_STATS",
            "formatString": "More engagement needed. Win rates were [Probability]% higher for similar deals with more frequent activities over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "RATE_MEETINGS_SNC_CREATION_STATS",
            "formatString": "More meetings needed. Win rates were [Probability]% higher for similar deals with more frequent meetings over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "RATE_CALLS_SNC_CREATION_STATS",
            "formatString": "More calls needed. Win rates were [Probability]% higher for similar deals with more frequent calls over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "RATE_IN_EMAILS_SNC_CREATION_N_STATS",
            "formatString": "Low inbound email frequency. Win rates were higher for similar deals with at least [Probability] inbound emails over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "RATE_OUT_EMAILS_SNC_CREATION_N_STATS",
            "formatString": "More outbound email engagement needed. Win rates were [Probability]% higher for similar deals with more outbound email engagement over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        },
        {
            "label": "RATE_EMAILS_SNC_CREATION_STATS",
            "formatString": "More email engagement needed. Win rates were [Probability]% higher for similar deals with more emails over the life of the deal.",
            "trend": "NEG",
            "parameters": {},
            "arguments": [
                {
                    "label": "Probability",
                    "type": "number",
                    "value": 75
                }
            ]
        }
    ]
})