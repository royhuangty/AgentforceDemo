/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class VRAinviteAction {
    global VRAinviteAction() {

    }
    @InvocableMethod(label='Session Invite' description='Invite customers to VRA Sessions')
    global static List<tspa__TechSeeSessions__c> sendInvite(List<tspa.VRAinviteAction.Requests> requestList) {
        return null;
    }
global class Requests {
    @InvocableVariable(label='Audio' description='Is the session with audio' required=false)
    global Boolean audio;
    @InvocableVariable(label='Client Language' description='VRA Language value to send invite' required=true)
    global String clientLanguage;
    @InvocableVariable(label='Initiate With Video' description='If cameras should be on in the beginning of the 2-way video session' required=false)
    global Boolean initiateWithVideo;
    @InvocableVariable(label='inviteType' description='VRA invite type values - SMS or Email' required=true)
    global String inviteType;
    @InvocableVariable(label='recordId' description='VRA Supported object, from where phone or email will be fetched' required=true)
    global Id recordId;
    @InvocableVariable(label='Sessiontype' description='VRA Session Type' required=true)
    global String sessionType;
    @InvocableVariable(label='to' description='VRA SMS or Email value' required=false)
    global String to;
    @InvocableVariable(label='Video Filter Type' description='The video filter type decide if the mode 2-way will work with image background.' required=false)
    global String videoFilterType;
    global Requests() {

    }
}
}
