/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class Einstein_Invocable_Language {
    global Einstein_Invocable_Language() {

    }
    @InvocableMethod(label='Einstein Text Prediction - Language')
    global static void AnalyzeLanguage(List<einsteinplay.Einstein_Invocable_Language.LanguageRequest> LRs) {

    }
global class LanguageRequest {
    @InvocableVariable(label='Field to Analyze: Literal string of Field Name (i.e. "MyField__c")' required=true)
    global String FieldToAnalyze;
    @InvocableVariable(label='Field to Store Answer: Literal string of Field Name (i.e. "Classification__c")' description='The top label will be stored in this text field' required=true)
    global String LabelStoreField;
    @InvocableVariable(label='ModelId (CommunitySentiment or ModelId of custom Einstein.ai model)' description='Model Id String value from Einstein.ai (not the Salesforce ID)' required=true)
    global String ModelId;
    @InvocableVariable(label='Model Type (Sentiment or Intent)' description='Allowed String values are Sentiment and Intent' required=true)
    global String ModelType;
    @InvocableVariable(label='Field to Store Probability: Literal string of Field Name (i.e. "Confidence__c")' description='The probability on the top label will be stored in this number/percentage field' required=false)
    global String ProbabilityStoreField;
    @InvocableVariable(label='Field to Store Raw Results: Literal string of Field Name (i.e. "Raw_Results__c")' description='This text field will get all predictions (label/probability pairs) stored as JSON' required=false)
    global String RawStoreField;
    @InvocableVariable(label='RecordId of record to Analyze' required=true)
    global String RecordId;
    global LanguageRequest() {

    }
}
}
