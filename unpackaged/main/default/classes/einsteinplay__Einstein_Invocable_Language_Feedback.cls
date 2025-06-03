/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class Einstein_Invocable_Language_Feedback {
    global Einstein_Invocable_Language_Feedback() {

    }
    @InvocableMethod(label='Einstein Text Feedback - Language')
    global static void AnalyzeLanguage(List<einsteinplay.Einstein_Invocable_Language_Feedback.LanguageFeedback> LFs) {

    }
global class LanguageFeedback {
    @InvocableVariable(label='Correct Label' description='What classification should it have been?  This should be the name of a label for that model' required=true)
    global String Label;
    @InvocableVariable(label='ModelId of custom Einstein.ai model' description='Einstein Model Id, not an SFDC RecordId' required=true)
    global String ModelId;
    @InvocableVariable(label='Incorrectly Classified Text' description='What did Einstein classify incorrectly? Use a field reference to grab the actual text' required=true)
    global String Text;
    global LanguageFeedback() {

    }
}
}
