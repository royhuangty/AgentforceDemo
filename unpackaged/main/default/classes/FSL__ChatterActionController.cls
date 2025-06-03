/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class ChatterActionController {
    @RemoteAction
    global static void ChangeServiceToBeforeFormState(FSL.ChatterActionController.ServiceAppointmentChatter InputService, FSL.ChatterActionController.ChatterActionAdditionalData AdditionalData) {

    }
    @RemoteAction
    global static FSL.ChatterActionController.ServiceCreationResult CreateOrUpdateService(FSL.ChatterActionController.ServiceAppointmentChatter InputService, FSL.ChatterActionController.ChatterActionAdditionalData AdditionalData) {
        return null;
    }
    @RemoteAction
    global static FSL.ChatterActionController.ChatterActionFirstStageResult DoFirstStage(FSL.ChatterActionController.ServiceAppointmentChatter InputService, Boolean IsSLR, String ApexInterfaceFullName, FSL.ChatterActionController.ChatterActionAdditionalData AdditionalData) {
        return null;
    }
    @RemoteAction
    global static FSL.ChatterActionController.ChatterActionSecondStageResult DoSecondStage(FSL.ChatterActionController.ServiceAppointmentChatter InputService, Boolean IsSLR, String ApexInterfaceFullName, FSL.ChatterActionController.ChatterActionAdditionalData AdditionalData) {
        return null;
    }
    @RemoteAction
    global static FSL.ChatterActionController.ChatterActionData getChatterActionData(Id ObjectId) {
        return null;
    }
    @RemoteAction
    global static List<FSL.ChatterActionController.ServiceTerritoryChatter> searchTerritories(String text) {
        return null;
    }
    @RemoteAction
    global static void updatePermissionSets() {

    }
    @RemoteAction
    global static Map<String,String> updatePermissionSetsWithTabAndRecordTypeReturned() {
        return null;
    }
global class ChatterActionAdditionalData {
    global ChatterActionAdditionalData() {

    }
}
global class ChatterActionData {
}
global class ChatterActionFirstStageResult extends FSL.ChatterActionController.ChatterActionStageResult {
    global ChatterActionFirstStageResult() {

    }
}
global class ChatterActionSecondStageResult extends FSL.ChatterActionController.ChatterActionStageResult {
    global ChatterActionSecondStageResult() {

    }
}
global abstract class ChatterActionStageResult {
    global ChatterActionStageResult() {

    }
}
global class ServiceAppointmentChatter {
    global ServiceAppointmentChatter() {

    }
}
global class ServiceCreationResult {
    global ServiceCreationResult() {

    }
}
global class ServiceTerritoryChatter {
    global ServiceTerritoryChatter() {

    }
}
}
