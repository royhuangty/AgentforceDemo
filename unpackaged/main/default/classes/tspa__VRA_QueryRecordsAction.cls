/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class VRA_QueryRecordsAction {
    global VRA_QueryRecordsAction() {

    }
    @InvocableMethod(label='VRA Query Records Action' description='The apex action allows to query sObject record by api name of sObject and a list of filters')
    global static List<tspa.VRA_QueryRecordsAction.FlowOutputs> queryRecords(List<tspa.VRA_QueryRecordsAction.FlowInputs> requestList) {
        return null;
    }
global class FlowInputs {
    @InvocableVariable(label='Fields List' required=false)
    global String fieldsList;
    @InvocableVariable(label='Filter Logic' required=false)
    global String filterLogic;
    @InvocableVariable(label='Filters List' required=false)
    global String filtersList;
    @InvocableVariable(label='Object Api Name' required=true)
    global String objectApiName;
    @InvocableVariable(label='Store All Fields' required=false)
    global Boolean storeAllFields;
}
global class FlowOutputs {
    @InvocableVariable( required=false)
    global Boolean isSuccess;
    @InvocableVariable( required=false)
    global String message;
    @InvocableVariable( required=false)
    global List<SObject> objectList;
}
}
