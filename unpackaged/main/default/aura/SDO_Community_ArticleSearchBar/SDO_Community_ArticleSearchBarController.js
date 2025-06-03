({
    searchKeyChange: function(component, event) {
        var myEvent = $A.get("e.c:SDO_Community_ArticleSearchKeyChange");
        myEvent.setParams({"searchKey": document.querySelector('.searchKey').value });
        myEvent.fire();
    },
    clearText: function(component) {
        component.set("v.searchKey", "");
        var myEvent = $A.get("e.c:SDO_Community_ArticleSearchKeyChange");
        myEvent.setParams({"searchKey": "" });
        myEvent.fire();
    }
})