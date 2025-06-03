/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class Einstein_Invocable_Image_Classification {
    global Einstein_Invocable_Image_Classification() {

    }
    @InvocableMethod(label='Einstein Image Classification')
    global static void AnalyzeImageClassification(List<einsteinplay.Einstein_Invocable_Image_Classification.ClassificationRequest> CRs) {

    }
global class ClassificationRequest {
    @InvocableVariable(label='Field containing URL of Image to analyze' description='Enter the name of the fields, that contains the URL of the image' required=true)
    global String FieldToAnalyze;
    @InvocableVariable(label='Field to Store Answer: Literal string of Field Name (i.e. "Classification__c")' description='Enter the name of the field, that should be analyzed via Einstein Vision.' required=true)
    global String LabelStoreField;
    @InvocableVariable(label='ModelId of custom Einstein.ai model' required=true)
    global String ModelId;
    @InvocableVariable(label='Field to Store Probability: Literal string of Field Name (i.e. "Confidence__c")' description='The probability on the top label will be stored in this number/percentage field' required=false)
    global String ProbabilityStoreField;
    @InvocableVariable(label='Field to Store Raw Results: Literal string of Field Name (i.e. "Raw_Results__c")' description='This text field will get all predictions (label/probability pairs) stored as JSON' required=false)
    global String RawStoreField;
    @InvocableVariable(label='RecordID of record to Analyze' description='The ID of the record that should be analyzed.' required=true)
    global String RecordId;
    global ClassificationRequest() {

    }
}
}
