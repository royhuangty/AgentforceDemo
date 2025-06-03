'use strict';

var bootstrap = {};

bootstrap.loadUserSettings = function () {

    Visualforce.remoting.Manager.invokeAction(RemoteActions.getUserSettings, function (settings, ev) {

        if (ev.status) {
            setSplashScreenTabDone('loading-user-setttings');

            bootstrap.loadedUserSettings = JSON.parse(settings.userSettings);
            angular.bootstrap(document.getElementById("serviceExpertApp"), ['serviceExpert']);

            if (!settings.isUserSettingsExist) {
                $('#loading-timephased').remove();
                $('#loading-finishing').remove();
            }
        } else {
            bootstrap.handleError(ev);
        }
    }, { buffer: false, escape: false, timeout: 120000 });
};

bootstrap.Start = function () {
    bootstrap.UpdatePermissionSets();
};

bootstrap.UpdatePermissionSets = function () {
    Visualforce.remoting.Manager.invokeAction(RemoteActions.updatePermissionSets, function (res, ev) {

        if (!res) {
            setSplashScreenTabDone('loading-permissions');
            bootstrap.loadUserSettings();
        } else {
            try {
                handleTabSettingAndRecordTypesPermissions(res).then(function () {
                    setSplashScreenTabDone('loading-permissions');
                    bootstrap.loadUserSettings();
                });
            } catch (err) {
                console.log(err);
                bootstrap.loadUserSettings();
            }
        }
    });
};

setSplashScreenTabDone.doneElements = {};

function setSplashScreenTabDone(id) {

    if (setSplashScreenTabDone.doneElements[id]) {
        return;
    }

    var taskElement = $('#' + id);

    if (taskElement) {
        taskElement.addClass('loading-task-done');
        setSplashScreenTabDone.doneElements[id] = true;
    }
}

function handleTabSettingAndRecordTypesPermissions(res) {

    return new Promise(function (resolve, reject) {

        var objIntegration = void 0;
        var objAdmin = JSON.parse(res['Admin'].replace(/&quot;/g, '"')),
            objAgent = JSON.parse(res['Agent'].replace(/&quot;/g, '"')),
            objGuest = JSON.parse(res['Guest'].replace(/&quot;/g, '"')),
            objCommunity = JSON.parse(res['Community'].replace(/&quot;/g, '"')),
            objCommunityDispatcher = JSON.parse(res['CommunityDispatcher'].replace(/&quot;/g, '"')),
            objDispatcher = JSON.parse(res['Dispatcher'].replace(/&quot;/g, '"')),
            objResource = JSON.parse(res['Resource'].replace(/&quot;/g, '"'));

        if (res['Integration']) {
            objIntegration = JSON.parse(res['Integration'].replace(/&quot;/g, '"'));
        }

        var promises = [createTabAndRecordTypePermission('FSL_Admin', 'Field Service Admin', objAdmin.tabSettings, objAdmin.recordTypeVisibilities, objAdmin.apexClasses), createTabAndRecordTypePermission('FSL_Agent', 'Field Service Agent', objAgent.tabSettings, objAgent.recordTypeVisibilities, objAgent.apexClasses), createTabAndRecordTypePermission('FSL_Dispatcher', 'Field Service Dispatcher', objDispatcher.tabSettings, objDispatcher.recordTypeVisibilities, objDispatcher.apexClasses), createTabAndRecordTypePermission('FSL_Community_Self_Service', 'Field Service Self Service', objCommunity.tabSettings, objCommunity.recordTypeVisibilities, objCommunity.apexClasses), createTabAndRecordTypePermission('FSL_Guest_User', 'Field Service Guest User', objGuest.tabSettings, objGuest.recordTypeVisibilities, objGuest.apexClasses), createTabAndRecordTypePermission('FSL_Community_Dispatcher', 'Field Service Community Dispatcher', objCommunityDispatcher.tabSettings, objCommunityDispatcher.recordTypeVisibilities, objCommunityDispatcher.apexClasses), createTabAndRecordTypePermission('FSL_Resource', 'Field Service Resource', objResource.tabSettings, objResource.recordTypeVisibilities, objResource.apexClasses)];

        if (objIntegration) {
            promises.push(createTabAndRecordTypePermission('sfdc_fieldservice', 'Field Service Integration', objIntegration.tabSettings, objIntegration.recordTypeVisibilities, objIntegration.apexClasses));
        }

        Promise.all(promises).then(function () {
            resolve();
        }, function () {
            resolve();
        });
    });
}

function createTabAndRecordTypePermission(name, label, tabSettings, recordTypeVisibilities, apexClasses) {
    var promise = new Promise(function (resolve, reject) {
        var baseUrl = window.location.origin,
            settingsTabName = 'Field_Service_Settings',
            psFullName = name != 'sfdc_fieldservice' ? name + '_Permissions' : name,
            psFullLabel = label != 'Field Service Integration' ? label + ' Permissions' : label,
            dataStr = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">' + '<soapenv:Header>' + '<met:SessionHeader>' + '<met:sessionId>' + sessionId + '</met:sessionId>' + '</met:SessionHeader>' + '</soapenv:Header>' + '<soapenv:Body>' + '<met:updateMetadata>' + '<met:metadata xsi:type="met:PermissionSet">' + '<fullName>' + psFullName + '</fullName>' + '<label>' + psFullLabel + '</label>';

        for (var i = 0; i < tabSettings.length; i++) {
            dataStr += '<tabSettings>' + '<tab>' + tabSettings[i].tab + '</tab>' + '<visibility>' + tabSettings[i].visibility + '</visibility>' + '</tabSettings>';
        }

        for (var j = 0; j < recordTypeVisibilities.length; j++) {
            dataStr += '<recordTypeVisibilities>' + '<recordType>' + recordTypeVisibilities[j].recordType + '</recordType>' + '<visible>' + recordTypeVisibilities[j].visible + '</visible>' + '</recordTypeVisibilities>';
        }
        for (var k = 0; k < apexClasses.length; k++) {
            dataStr += '<classAccesses>' + '<apexClass>' + apexClasses[k].apexClass + '</apexClass>' + '<enabled>' + apexClasses[k].enabled + '</enabled>' + '</classAccesses>';
        }

        dataStr += '</met:metadata>' + '</met:updateMetadata>' + '</soapenv:Body>' + '</soapenv:Envelope>';

        window.$.ajax({
            url: baseUrl + '/services/Soap/m/38.0',
            type: 'POST',
            dataType: "xml",
            data: dataStr,
            beforeSend: function beforeSend(xhr) {
                xhr.setRequestHeader('Content-Type', 'text/xml');
                xhr.setRequestHeader('SOAPAction', '""');
            }
        }).then(function (res, textStatus, jqXHR) {
            resolve();
        }, function (jqXHR, textStatus, errorThrown) {
            console.log('Failed to update permissions on load of VF');
            resolve();
        });
    });
}

bootstrap.handleError = function (ev) {

    var messageInsideLabelsToShow = false,
        labelsToShowToUser = {
        no_dispatcher_license_found: true,
        Apex_CPU_time_limit_exceeded: true
    };

    for (var label in labelsToShowToUser) {
        if (customLabels[label] === ev.message) messageInsideLabelsToShow = true;
    }

    if (ev.message.toLowerCase().indexOf('dml') > -1) cantLoadGantt(customLabels.no_dispatcher_permissions_found.replace('{0}', '<a href="vf066_settings#page=0&tab=1" target="_blank">').replace('{1}', '</a>'));else if (ev.type === 'operatingHours') cantLoadGantt(customLabels.dispatcher_console_error_loading + '<div class="otherMessage">' + customLabels.NoAccessToOperatingHours.replace('$0', ev.message) + '</div>');else if (messageInsideLabelsToShow) cantLoadGantt(ev.message);else {
        // error handled in getResourcesAndTerritoriesService 
        if (!ev.message.includes('TimeZone')) cantLoadGantt(customLabels.dispatcher_console_error_loading + '<div class="otherMessage">' + ev.message + '</div>');
    }
};

// this function is called from the chatter actions
bootstrap.UpdatePermissionSetsBootstrap = function (DocumentName, AppName) {

    Visualforce.remoting.Manager.invokeAction(sharedRemoteActions.updatePermissionSets, function (res, ev) {
        if (!res) {
            setSplashScreenTabDone('loading-permissions');
            angular.bootstrap(document.getElementById(DocumentName), [AppName]);
        } else {
            try {
                handleTabSettingAndRecordTypesPermissions(res).then(function () {
                    setSplashScreenTabDone('loading-permissions');
                    angular.bootstrap(document.getElementById(DocumentName), [AppName]);
                });
            } catch (err) {
                console.log(err);
                angular.bootstrap(document.getElementById(DocumentName), [AppName]);
            }
        }
    }, { buffer: false, timeout: 120000 });
};