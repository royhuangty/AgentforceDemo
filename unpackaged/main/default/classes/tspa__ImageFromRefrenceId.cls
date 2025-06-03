/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ImageFromRefrenceId {
    global ImageFromRefrenceId() {

    }
    @InvocableMethod(label='VRA Retrieve Images by refrenceId' description='Attach images to the record Id based on Input Parameters ')
    global static List<tspa.ImageFromRefrenceId.VRAResponse> getImageFromSessionIdAndTag(List<tspa.ImageFromRefrenceId.VRARequest> VRARequestFromFlow) {
        return null;
    }
global class VRARequest {
    @InvocableVariable( description='Agent Name who initiated the session' required=true)
    global List<String> agentName;
    @InvocableVariable( description='Image Comment result value to fetch Image retaled to Comment result' required=true)
    global List<String> imageComment;
    @InvocableVariable( description='Get Rcoord id of Inserted VRA Image record' required=true)
    global String imageRecordId;
    @InvocableVariable( description='Invite destination can be phone or email or messaging user,etc' required=true)
    global List<String> inviteDestination;
    @InvocableVariable( description='OCR scan result value to fetch Image retaled to Scan result' required=true)
    global List<String> ocrResult;
    @InvocableVariable( description='Get RecordId  of the object to attach image' required=true)
    global String recordId;
    @InvocableVariable( description='referenceId of the session to fetch Images' required=true)
    global String referenceId;
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
    global String referenceId;
    global VRAResponse() {

    }
}
}
