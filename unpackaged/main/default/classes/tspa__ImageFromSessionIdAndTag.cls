/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ImageFromSessionIdAndTag {
    global ImageFromSessionIdAndTag() {

    }
    @InvocableMethod(label='VRA Retrieve Images by SessionID and Tags' description='Attach images to the record Id based on session id and  Tags ')
    global static List<tspa.ImageFromSessionIdAndTag.VRAResponse> getImageFromSessionIdAndTag(List<tspa.ImageFromSessionIdAndTag.VRARequest> VRARequestFromFlow) {
        return null;
    }
global class VRARequest {
    @InvocableVariable( description='Get Rcoord id of Inserted VRA Image record' required=true)
    global String imageRecordId;
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
