/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class VRA_DeleteImagesAction {
    global VRA_DeleteImagesAction() {

    }
    @InvocableMethod(label='VRA Delete Images Action' description='The apex action allows to delete the images from TechSee S3 bucket using API. The limit of incoming list of images is 5000 elemennts per one apex action transaction')
    global static List<tspa.VRA_DeleteImagesAction.Response> deleteImages(List<tspa.VRA_DeleteImagesAction.Request> requestList) {
        return null;
    }
global class Request {
    @InvocableVariable(label='Visual Images List' required=true)
    global List<tspa__Visual_Image__c> visualImageList;
    global Request() {

    }
}
global class Response {
    @InvocableVariable( required=false)
    global String error;
    @InvocableVariable( required=false)
    global Boolean isSuccess;
    @InvocableVariable( required=false)
    global String message;
}
}
