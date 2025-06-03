({
    doInit : function(cmp, evt, helper) {
        var steps = cmp.get('v.steps').split(/,/);
        var cmps = [];
        for (var i=0; i<steps.length; i++){
            cmps.push(['lightning:progressStep', {
                'label': steps[i],
                'value': steps[i]
            }]);
        }
        cmps.push(['lightning:progressIndicator', {
            'type': 'base',
            'currentStep': cmp.get('v.currentStep')
        }]);
        $A.createComponents(cmps, function(elms, status, err){
            if (status === "SUCCESS") {
                console.log('success');
                var parent = elms[steps.length];
                var childs = []
                for (var i=0; i<steps.length; i++){
                    childs.push(elms[i]);
                }
                parent.set('v.body', childs);
                cmp.set("v.body", [parent]);
            }
        });
    }
})