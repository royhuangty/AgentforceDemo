/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class GenerateLobbyLinkInvocable {
    global GenerateLobbyLinkInvocable() {

    }
    @InvocableMethod(label='Get Lobby Link')
    global static List<String> getLobbyLink(List<tsaa.GenerateLobbyLinkInvocable.LobbyInput> inputs) {
        return null;
    }
global class LobbyInput {
    @InvocableVariable(label='Appointment End' required=false)
    global Datetime appointmentEnd;
    @InvocableVariable(label='Appointment Start' required=false)
    global Datetime appointmentStart;
    @InvocableVariable(label='Record Id' required=true)
    global String recordId;
    @InvocableVariable(label='Appointment StatusCategory' required=false)
    global String status;
    global LobbyInput() {

    }
}
}
