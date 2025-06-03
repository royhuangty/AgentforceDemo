({
  doInit: function (component, event, helper) {
    let promises = [helper.getContactSuggestions(component)];
    Promise.all(promises);
  },
  newContact: function (component) {
    let recordId = component.get("v.recordId");
    component
      .getEvent("renderPanel")
      .setParams({
        type: "c:SDO_Tool_Insights_EditContactSuggestion",
        attributes: {
          recordId: recordId
        }
      })
      .fire();
  }
});