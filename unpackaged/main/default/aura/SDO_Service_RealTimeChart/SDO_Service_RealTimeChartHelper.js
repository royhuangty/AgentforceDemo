({
	getData : function(helper, length, feedName, randomNumber) {
        var data = [];
        var newRandom = helper.getRandomNumber(0, 200);
        if (feedName === "AgentCapacity") {
            data.push(Math.round(randomNumber * newRandom));
            data.push(Math.round(newRandom - (randomNumber * newRandom)));
        }
        else if (feedName === "WorkItemStatus") {
            // Get the first 3 non-zero digits and use those as the values for the donut (allows us to do the same on the Visualforce page)
            var randomString = Math.round(randomNumber >= 0.1 ? randomNumber * 1000 : randomNumber * 10000).toString();
            
            data.push(Math.round(parseInt(randomString[0]) * newRandom));
            data.push(Math.round(parseInt(randomString[1]) * newRandom));
            data.push(Math.round(parseInt(randomString[2]) * newRandom));
        }
        else {
            for (var i=0; i< length; i++) {
                data.push(Math.round(helper.getRandomNumber(0, 10000))/100);
            }
        }
        return data;
	},
    
    getRandomNumber : function(min, max) {
		return Math.random() * (max - min) + min;
    },
    
    getChartType : function(component, feedName) {
        this.logToConsole(component,"Finding chart type for: " + feedName);
        if (feedName === "WorkItemStatus" || feedName === "AgentCapacity")
        {
            this.logToConsole(component,"Found chart type for: " + feedName);
            return "doughnut";
        }
        else if (feedName === "AgentCapacityStatus" || feedName === "AgentPresenceStatuses" || feedName === "AgentWorkStatus") {
            this.logToConsole(component,"Found chart type for: " + feedName);
            return "bar";            
        }
        else 
        {
            this.logToConsole(component,"Defaulting to metric charttype for: " + feedName);
            return "metric";
        }
    },
    
    getIndexAxis : function(component, feedName) {
        if (feedName === "AgentPresenceStatuses" || feedName === "AgentWorkStatus") {
            return 'y';
        }
        return 'x';
    },
    
    getLabels : function(component, feedName) {
        this.logToConsole(component,"Getting labels for : " + feedName);
        if (feedName === "WorkItemStatus") 
        {

            return ["Assigned", "In Progress", "Waiting"];
        }
        else if (feedName === "AgentCapacityStatus") {
            return ["Available", "Idle", "Busy", "At Capacity", "Offline"];
        }
        else if (feedName === "AgentCapacity") {
            return ["Used Capacity", "Available Capacity"];
        }
        else if (feedName === "AgentPresenceStatuses") {
            return ["All - Available", "Cases - Available", "Messaging - Available", "Voice - Available", "Busy", "Busy - Break", "Busy - Lunch"];
        }
        else if (feedName === "AgentWorkStatus") {
            return ["Assigned", "Opened", "Closed", "Declined", "Push Timeout", "Canceled", "Unavailable"];
        }
        else if (feedName === "WaitTime") {
            return ["Average Wait Time","Longest Wait Time"];
        }
        else if (feedName === "RaisedFlags") {
            return ["Raised Flags"];
        }
        else if (feedName === "WorkPerformance") {
            return ["Average Work Handle Time", "Average Speed to Answer", "Average Active Work Time", "After Conversation Time"];
        }
        
        return [];
    },
    
    getColors : function(component, feedName) {
        if (feedName === "WorkItemStatus" || feedName === "AgentCapacity")
        {
            // Doughnut charts need 3 colors, all others just the one.
            this.logToConsole(component,"Getting colors for: " + feedName);
            return ["rgb(50, 144, 237)", "rgb(157, 83, 242)", "rgb(38, 171, 164)"];
        }
        else {
            // Doughnut charts need 3 colors, all others just the one.
            this.logToConsole(component,"Getting colors for: " + feedName);
            return ["rgb(50, 144, 237)"];
        }
        
        return [];
        
    },
    
    logToConsole : function(component, whatToLog, isError) {
        // Function to easily turn logging on and off when releasing
        if (component.get("v.enableConsoleLogging"))
        {
            if (isError)
            {
                console.error("RealTimeChart: " + whatToLog);
            }
            else{
                console.log("RealTimeChart: " + whatToLog);
            }
            
        }
    }
})