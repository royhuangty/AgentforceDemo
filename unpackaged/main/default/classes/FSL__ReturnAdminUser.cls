/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ReturnAdminUser {
    global ReturnAdminUser() {

    }
    @InvocableMethod(label='Return Admin User Mail' description='Return Admin User Mail')
    global static List<FSL.ReturnAdminUser.AdminUserDetails> returnAdminUser() {
        return null;
    }
global class AdminUserDetails {
    @InvocableVariable(label='User Email' description='User Email' required=true)
    global String userMail;
    @InvocableVariable(label='User Name' description='User Name' required=true)
    global String userName;
    global AdminUserDetails() {

    }
}
}
