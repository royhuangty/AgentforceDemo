({
	scriptsLoaded : function(component, event, helper) {

        var feedName = component.get("v.feedName");
        var randomNumber = component.get("v.randomNumber");
        helper.logToConsole(component, "Random Number: " + randomNumber, false);
        helper.logToConsole(component, "Getting settings for: " + feedName, false);
        var ctx = component.find("chart").getElement();
        
        var chartType = helper.getChartType(component, feedName);
        var indexAxis = helper.getIndexAxis(component, feedName);
        var labels = helper.getLabels(component, feedName);
        var colors = helper.getColors(component, feedName);
    
        var data = {
            labels: labels,
              datasets: [
                  {
                      label: feedName,
                      data: feedName ? helper.getData(helper, labels.length, feedName, randomNumber) : [],
                      borderWidth: 1.5,
                      borderColor: colors,
                      backgroundColor: colors,
                  }
              ]
            };
        
        var scales = {
              x: {
                grid: {
                  display: indexAxis === 'y',
              	}
              },
              y: {
                grid: {
                  display: indexAxis === 'x',
              	}
              }
            };

        var options = {        
            cutout: '80%', // Only used for doughnut types, ignored for others
            indexAxis: indexAxis, // Only used for bar charts - x will be vertical, y will be horizontal
            animation: {
                animateRotate: false
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            responsive: true,
            maintainAspectRatio : false,
            scales: chartType !== 'doughnut' ? scales : null
        };
        
        if (chartType === 'metric')
        {
            // Draw the metric boxes - these will be on the VF page only and not part of this component
        }
        else
        {
            var chart = new Chart(ctx, {
                type: chartType,
                data: data,
                options: options, 
            });
            
            
            chart.options.animation = false;
            // Random new values, except for doughnuts as we need consistency on the VF page and here, so we reload those charts each time new
            if (chartType !== "doughnut") {
                setInterval($A.getCallback(function() {
                    data.datasets[0].data.push(Math.round(helper.getRandomNumber(0, 10000))/100);
                    data.datasets[0].data.shift();
                    //data.labels.push(++lastLabel);
                    //data.labels.shift();
                    chart.update();
                }), Math.round(helper.getRandomNumber(4000, 10000)));
            }
        }
            
	}
    
})