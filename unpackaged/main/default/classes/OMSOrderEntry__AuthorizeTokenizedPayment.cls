/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class AuthorizeTokenizedPayment {
    global AuthorizeTokenizedPayment() {

    }
    @InvocableMethod(label='Authorize Tokenized Payment' description='Authorizes payment for credit information that was previously tokenized')
    global static List<String> authorizePaymentInfo(List<OMSOrderEntry.AuthorizeTokenizedPayment.AuthorizeTokenizedPaymentRequest> request) {
        return null;
    }
global class AuthorizeTokenizedPaymentRequest {
    @InvocableVariable( required=true)
    global Id cartId;
    global AuthorizeTokenizedPaymentRequest() {

    }
}
}
