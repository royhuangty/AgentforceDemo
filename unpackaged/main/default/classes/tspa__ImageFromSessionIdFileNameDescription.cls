/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ImageFromSessionIdFileNameDescription {
    global ImageFromSessionIdFileNameDescription() {

    }
    @InvocableMethod(label='VRA Retrieve Images by SessionID,ImageComment,OCRresult,Tags and fileName' description='Attach images to the record Id based on Input Parameters ')
    global static List<tspa.ImageFromSessionIdFileNameDescription.VRAResponse> getSessionIdFileNameDescription(List<tspa.ImageFromSessionIdFileNameDescription.VRARequest> VRARequestFromFlow) {
        return null;
    }
global class VRARequest {
    @InvocableVariable( description='File Name to fetch Images' required=true)
    global String fileName;
    @InvocableVariable( description='Image Comment result value to fetch Image retaled to Comment result' required=true)
    global List<String> imageComment;
    @InvocableVariable( description='Get Rcoord id of Inserted VRA Image record' required=true)
    global String imageRecordId;
    @InvocableVariable( description='OCR scan result value to fetch Image retaled to Scan result' required=true)
    global List<String> ocrResult;
    @InvocableVariable( description='Get RecordId  of the object to attach image' required=true)
    global String recordId;
    @InvocableVariable( description='Session Id of the session to fetch Images' required=true)
    global String sessionId;
    @InvocableVariable( description='Tag List to fetch Images' required=true)
    global List<String> tagList;
    global VRARequest() {

    }
}
global class VRAResponse {
    @InvocableVariable( required=false)
    global String jobId;
    @InvocableVariable( required=false)
    global String jobStatus;
    @InvocableVariable( required=false)
    global String sessionId;
    global VRAResponse() {

    }
}
}
