/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ZoomApiRequest {
    global ZoomApiRequest() {

    }
    @InvocableMethod(label='Add Zoom Webinar Registrant' description='Adds a registrant to a Zoom Webinar')
    global static void addWebinarRegistrant(List<MktgExtAction.ZoomApiRequest.ZoomActionRequest> zoomReq) {

    }
global class ZoomActionRequest {
    @InvocableVariable( required=true)
    global String email;
    @InvocableVariable( required=true)
    global String firstName;
    @InvocableVariable( required=true)
    global String lastName;
    @InvocableVariable( required=true)
    global String webinarId;
    global ZoomActionRequest() {

    }
}
global class ZoomApiRequestException extends Exception {
}
}
