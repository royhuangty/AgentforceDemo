let userCommissionScript = {

    loadCommission : function(lastModifiedDate, showQuickSaveMessage){

        //Get the namespace of org
        let nameSpace = "SpiffCE";
        let urlParameters = new URLSearchParams(window.location.search);
        let recordId = urlParameters.get('id');

        //Call the LWC userCommissions component
        $Lightning.use(nameSpace+":userCommissionsApp", function() {
            $Lightning.createComponent(nameSpace+":userCommissions",
            { 
                recordId : recordId,
                loadInitiatorMessage : showQuickSaveMessage,
                lastModifiedDate : lastModifiedDate,
                hideRefresh : true,
                source : 'QUOTE_LINE_EDITOR'
            },
            "lwc", 
            function() {
                
            });
        });

        }

};