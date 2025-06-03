    
Territory = {
    deleteTerritoryLayer: function (territoryLayer) {
        Visualforce.remoting.Manager.invokeAction(MARemoting.Territory.delete,
            territoryLayer,
            function(response) {
                if (response.success) {
                    MAToastMessages.showSuccess({ message: 'Successfully deleted layer' });
                    VueEventBus.$emit('refresh-folder');
                }
            },
            {
                escape: false,
                buffer: false
            }
        )
    }
};
