/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class GeocodeRecordInvocable {
    global GeocodeRecordInvocable() {

    }
    @InvocableMethod(label='Geocode Record')
    global static List<maps.GeocodeRecordInvocable.GeocodeRecordOutputs> Geocode(List<maps.GeocodeRecordInvocable.GeoCodeRecordInputs> request) {
        return null;
    }
global class GeoCodeRecordInputs {
    @InvocableVariable(label='Input City' required=false)
    global String inputCity;
    @InvocableVariable(label='Input Country' required=false)
    global String inputCountry;
    @InvocableVariable(label='Input Postal Code' required=false)
    global String inputPostalCode;
    @InvocableVariable(label='Input State' required=false)
    global String inputState;
    @InvocableVariable(label='Input Street' required=false)
    global String inputStreet;
    @InvocableVariable(label='Output City Field' required=false)
    global String outputCity;
    @InvocableVariable(label='Output Country Field' required=false)
    global String outputCountry;
    @InvocableVariable(label='Output Error Message Field' description='If an error occures, this field will be updated with helpful debug information.' required=false)
    global String outputErrorMessage;
    @InvocableVariable(label='Output Full Address Field' description='Assembled address value built out of the parsed address components.' required=false)
    global String outputFullAddress;
    @InvocableVariable(label='Output Latitude Field' required=false)
    global String outputLatitude;
    @InvocableVariable(label='Output Longitude Field' required=false)
    global String outputLongitude;
    @InvocableVariable(label='Output Match Level Field' description='The most detailed address field that matches the geocoding query. [country, state, county, city, district, street, intersection, houseNumber, postalCode, landmark]' required=false)
    global String outputMatchLevel;
    @InvocableVariable(label='Output Postal Code Field' required=false)
    global String outputPostalCode;
    @InvocableVariable(label='Output Relevance Field' description='Indicates the relevance of the results found; the higher the score the more relevant.' required=false)
    global String outputRelevance;
    @InvocableVariable(label='Output State Field' required=false)
    global String outputState;
    @InvocableVariable(label='Output Street Field' required=false)
    global String outputStreet;
    @InvocableVariable(label='Record Id' required=true)
    global Id recordId;
    global GeoCodeRecordInputs() {

    }
}
global class GeocodeRecordOutputs {
    @InvocableVariable(label='Output Error Message' description='If an error occures, this field will be updated with helpful debug information. Recommended setting this to the same location as the "Output Error Message Field" if used.' required=false)
    global String errorMessage;
    @InvocableVariable(label='Success' description='Indicates that the process ran.' required=false)
    global Boolean Success;
    global GeocodeRecordOutputs() {

    }
}
}
