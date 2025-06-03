
var availableCustomLabelsMaker = (origin, LABELS) => {
    try{

        if (origin=='appointmentAssistantMain'){
            return [
                ['AppointmentAssistant_ThankYou_message',               LABELS.AppointmentAssistant_ThankYou_message],
                ['AppointmentAssistant_ETA_Updated_JustNow_Text',       LABELS.AppointmentAssistant_ETA_Updated_JustNow_Text],
                ['AppointmentAssistant_ETA_Updated_Text_1_Minute',      LABELS.AppointmentAssistant_ETA_Updated_Text_1_Minute],
                ['AppointmentAssistant_ETA_Updated_Text_Above_1_Minute',LABELS.AppointmentAssistant_ETA_Updated_Text_Above_1_Minute],
                ['Appointment_ReBooking_your_appt_was_canceled_msg',    LABELS.Appointment_ReBooking_your_appt_was_canceled_msg],
                ['Appointment_ReBooking_toastMessage_reschedule_appointment_fail_message',  LABELS.Appointment_ReBooking_toastMessage_reschedule_appointment_fail_message],
                ['Appointment_ReBooking_toastMessage_cancel_appointment_fail_message',      LABELS.Appointment_ReBooking_toastMessage_cancel_appointment_fail_message],
                ['---- SURVEY ----', '----'],
                ['AppointmentAssistant_External_Survey_Page',           LABELS.AppointmentAssistant_External_Survey_Page],
                ['AppointmentAssistant_External_Survey_Page_Link',      LABELS.AppointmentAssistant_External_Survey_Page_Link],
                ['---- BUTTONS ----', '----'],
                ['AppointmentAssistant_ContactTechBtn_Text',            LABELS.AppointmentAssistant_ContactTechBtn_Text],
                ['AppointmentAssistant_RescheduleApptBtn_Text',         LABELS.AppointmentAssistant_RescheduleApptBtn_Text],
                ['AppointmentAssistant_CancelApptBtn_Text',             LABELS.AppointmentAssistant_CancelApptBtn_Text],
            ];
        }

        if (origin=='aaConfirmAppointmentPage') {
            return [
                ['Appointment_ReBooking_confirm_upcoming_appointment_msg',     LABELS.Appointment_ReBooking_confirm_upcoming_appointment_msg],
                ['Appointment_ReBooking_Are_you_sure_toCancel_Appt',           LABELS.Appointment_ReBooking_Are_you_sure_toCancel_Appt],
                ['Appointment_ReBooking_we_look_fordward_message',             LABELS.Appointment_ReBooking_we_look_fordward_message],
                ['Appointment_ReBooking_toastMessage_comments_update_success', LABELS.Appointment_ReBooking_toastMessage_comments_update_success],
                ['Appointment_ReBooking_toastMessage_comments_update_failed',  LABELS.Appointment_ReBooking_toastMessage_comments_update_failed],
                ['Appointment_ReBooking_enter_message_hint',                   LABELS.Appointment_ReBooking_enter_message_hint],
                ['Appointment_ReBooking_reason_for_cancellation',              LABELS.Appointment_ReBooking_reason_for_cancellation],
                ['Appointment_ReBooking_select_an_option',                     LABELS.Appointment_ReBooking_select_an_option],
                ['Appointment_ReBooking_back_button_title',                    LABELS.Appointment_ReBooking_back_button_title],
                ['---- BUTTONS ----', '----'],
                ['Appointment_ReBooking_reschedule_button',                    LABELS.Appointment_ReBooking_reschedule_button],
                ['Appointment_ReBooking_confirm_appointment_button',           LABELS.Appointment_ReBooking_confirm_appointment_button],
                ['Appointment_ReBooking_cancel_appointment_button',            LABELS.Appointment_ReBooking_cancel_appointment_button],
                ['Appointment_ReBooking_comment_Edit_button',                  LABELS.Appointment_ReBooking_comment_Edit_button],
                ['Appointment_ReBooking_comment_Submit_button',                LABELS.Appointment_ReBooking_comment_Submit_button],
                ['---- TITLES ----', '----'],
                ['Appointment_ReBooking_arrival_window_title',                 LABELS.Appointment_ReBooking_arrival_window_title],
                ['Appointment_ReBooking_service_address_title',                LABELS.Appointment_ReBooking_service_address_title],
                ['Appointment_ReBooking_exact_appointment_title',              LABELS.Appointment_ReBooking_exact_appointment_title],
                ['Appointment_ReBooking_service_requested_title',              LABELS.Appointment_ReBooking_service_requested_title],
                ['Appointment_ReBooking_send_us_note',                         LABELS.Appointment_ReBooking_send_us_note],
            ];
        }
        return [];
    }catch(ex){
        console.error('availableCustomLabelsMaker() failed.'+ex.message);
        return [];
    }
};


//todo: check that arx is array
window.logCustomLabels = (origin, LABELS, isGroupCollapsed=true) => {
    try{
        let arr = [];
        let arx = availableCustomLabelsMaker(origin, LABELS);
        for(let i=0; i<arx.length; i++){
            let obx = {
                'Custom Label Name': arx[i][0],
                'Custom Label Value': arx[i][1]
            };
            if (arx[i][2]) obx['Display Reason'] = arx[i][2];
            arr.push(obx);
        }
        console.log('\n\n');
        console[isGroupCollapsed ? 'groupCollapsed' : 'group']('Custom labels');
        console.table(arr);
        console.groupEnd();
        console.log('\n\n');
    }catch(ex){
        console.error('logCustomLabels() failed.');
    }
};

window.logCustomLabelsWithReason = (arx) => {
    try{
        let arr = [];
        for(let i=0; i<arx.length; i++){
            let obx = {
                'Custom Label Name': arx[i][0],
                'Custom Label Value': arx[i][1]
            };
            if (arx[i][2]) obx['Display Reason'] = arx[i][2];
            arr.push(obx);
        }
        console.log('\n\n');
        console.group('Custom labels');
        console.table(arr);
        console.groupEnd();
        console.log('\n\n');
    }catch(ex){
        console.error('logCustomLabelsWithReason() failed.');
    }
};
