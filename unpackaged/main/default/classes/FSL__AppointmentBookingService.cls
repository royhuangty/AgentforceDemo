/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class AppointmentBookingService {
    global static Boolean ForceSharing {
        get;
        set;
    }
    global AppointmentBookingService() {

    }
    global static FSL.ABSlotsResponse GetABSlots(Id serviceID, Id policyId, OperatingHours calendar, System.TimeZone tz, String sortBy, Boolean exactAppointment) {
        return null;
    }
    @InvocableMethod(label='AppointmentBooking GetSlots' description='Get appointment booking slots')
    global static List<FSL.AppointmentBookingService.AppointmentBookingSlotWrapper> GetSlots(List<FSL.AppointmentBookingService.AppointmentBookingParamsWrapper> ABParams) {
        return null;
    }
    global static List<FSL.AppointmentBookingSlot> GetSlots(Id serviceID, Id policyId, Id operatingHoursID, System.TimeZone tz, Boolean exactAppointment) {
        return null;
    }
    global static List<FSL.AppointmentBookingSlot> GetSlots(Id serviceID, Id policyId, OperatingHours calendar, System.TimeZone tz, Boolean exactAppointment) {
        return null;
    }
    global static List<FSL.AppointmentBookingSlot> GetSlots(Id serviceID, Id policyId, OperatingHours calendar, System.TimeZone tz, FSL.AppointmentBookingService.SortResultsBy sortResults, Boolean exactAppointment) {
        return null;
    }
    global static List<FSL.AppointmentBookingSlot> GetSlots(Id serviceID, Id policyId, OperatingHours calendar, System.TimeZone tz, String sortBy, Boolean exactAppointment) {
        return null;
    }
global class AppointmentBookingParamsWrapper {
    @InvocableVariable( required=true)
    global Id calendarId;
    @InvocableVariable( required=false)
    global Boolean exactAppointment;
    @InvocableVariable( required=true)
    global Id policyId;
    @InvocableVariable( required=true)
    global Id serviceID;
    @InvocableVariable( required=false)
    global String sortBy;
    @InvocableVariable( required=true)
    global String tz;
    global AppointmentBookingParamsWrapper() {

    }
}
global class AppointmentBookingSlotWrapper {
    @InvocableVariable( required=false)
    global List<Decimal> Grade;
    @InvocableVariable( required=false)
    global List<Datetime> SlotFinish;
    @InvocableVariable( required=false)
    global List<Datetime> SlotStart;
}
global enum SortResultsBy {Grade, NoSort, SLotDateTime}
}
