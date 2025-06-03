/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class CrewManagement {
    @RemoteAction
    global static Map<String,List<SObject>> GetResourcesAndTerritories(List<Id> territoriesIds) {
        return null;
    }
    @RemoteAction
    global static List<ServiceResource> activateCrew(Id resourceId) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> checkCrewBeforeActivation(Id resourceId, Id crewId) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> createNewCrew(Map<String,Object> crewData) {
        return null;
    }
    @RemoteAction
    global static Boolean deleteScm(Id scmId) {
        return null;
    }
    @RemoteAction
    global static Object getCandidates(Id serviceId) {
        return null;
    }
    @RemoteAction
    global static Object getCandidates2(Id serviceId, Id policyId) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> getGanttData(String strStartDate, String strFinishDate, List<Id> territoriesIds) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> getGanttServicesParentsSkills(String strStartDate, String strFinishDate, List<Id> territoriesIds) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> getGanttStmScmAbsencesServices(String strStartDate, String strFinishDate, List<Id> territoriesIds, Id offsetId) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> getGanttStmScmAbsences(String strStartDate, String strFinishDate, List<Id> territoriesIds) {
        return null;
    }
    @RemoteAction
    global static List<ServiceResource> getInactiveCrews(List<Id> territoriesId) {
        return null;
    }
    @RemoteAction
    global static List<FSL__Scheduling_Policy__c> getPolicies() {
        return null;
    }
    @RemoteAction
    global static List<ServiceTerritoryMember> getResourcesThatHaveStm(Id territoryId, String strStartDate, String strEndDate) {
        return null;
    }
    @RemoteAction
    global static List<Id> getSelectedSkillsCrewUserSettings() {
        return null;
    }
    @RemoteAction
    global static Map<String,List<String>> getServiceAppointmentTooltipFieldset() {
        return null;
    }
    @RemoteAction
    global static List<Skill> getSkillsList(List<Id> skillIds) {
        return null;
    }
    @RemoteAction
    global static List<Skill> getSkills() {
        return null;
    }
    @RemoteAction
    global static FSL__Crew_Management_User_Settings__c getUserSettingByProperty(String fieldName) {
        return null;
    }
    @RemoteAction
    global static Map<String,Object> getUserSettings() {
        return null;
    }
    @RemoteAction
    global static ServiceCrewMember saveChangesToScm(Id scmId, Id resourceId, Id crewId, String strStartDate, String strEndDate, Boolean isLeader) {
        return null;
    }
    @RemoteAction
    global static Object saveChangesToScmWithWarning(Id scmId, Id resourceId, Id crewId, Id territoryId, String strStartDate, String strEndDate, Boolean isLeader, Boolean forceCreation) {
        return null;
    }
    @RemoteAction
    global static List<ServiceCrewMember> saveMultipleScms2(List<Id> resourceIds, Id crewId, String strStartDate, String strEndDate, Boolean isLeader) {
        return null;
    }
    @RemoteAction
    global static Object saveMultipleScmsWithWarning(List<Id> resourceIds, Id crewId, Id territoryId, String strStartDate, String strEndDate, Boolean isLeader, Boolean forceCreation) {
        return null;
    }
    @RemoteAction
    global static List<ServiceCrewMember> saveMultipleScms(List<Id> resourceIds, Id crewId, String strStartDate, String strEndDate) {
        return null;
    }
    @RemoteAction
    global static List<FSL.ChatterActionController.ServiceTerritoryChatter> searchTerritories(String text) {
        return null;
    }
    @RemoteAction
    global static Boolean setLoadedTerritories(List<Id> territoriesIds, Id userSettingsId) {
        return null;
    }
    @RemoteAction
    global static FSL__Crew_Management_User_Settings__c setUserSettings(String fieldName, String value, String fieldType) {
        return null;
    }
    @RemoteAction
    global static Boolean validateResourceCanHaveScm(Id resourceId, Id territoryId, String strStartDate, String strEndDate) {
        return null;
    }
}
