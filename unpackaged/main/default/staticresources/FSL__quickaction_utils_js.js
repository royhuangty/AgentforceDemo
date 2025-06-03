window.quickActionUtils = {
 refreshParentFrame: function(objectId,specificPage){

        if(typeof Sfdc != "undefined" && Sfdc.canvas) {
            Sfdc.canvas.publisher.publish({ name: "publisher.close",payload:{ refresh: "true" }});
        }
        if(typeof sforce != "undefined" && sforce.console && sforce.console.isInConsole()){


            sforce.console.generateConsoleUrl(['/' + objectId],function(result) {
                sforce.console.openConsoleUrl(null, result.consoleUrl, true);
            });


            sforce.console.getEnclosingTabId(function(tab){
                if(tab.success){
                    sforce.console.refreshSubtabById(tab.id);
                }
                else{
                    sforce.console.getFocusedSubtabId(function(tab){
                        sforce.console.refreshSubtabById(tab.id);
                    });
                }
            });

        }
        else if (typeof sforce != 'undefined' && sforce.one ) {
            sforce.one.navigateToSObject(objectId,specificPage);
        }
        else{

            try{
                window.parent.location.reload(); // In case we are in scheduler (gantt view)
            }catch(ex){
                window.parent.location = '/' + objectId;
            }
        }
    }
};