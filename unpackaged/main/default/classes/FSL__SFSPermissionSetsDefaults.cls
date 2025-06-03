/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
@RestResource(urlMapping='/PermissionSetsDefaults/*')
global class SFSPermissionSetsDefaults {
    global SFSPermissionSetsDefaults() {

    }
    @HttpGet
    global static List<FSL.SFSPermissionSetsDefaults.PermissionSetDefaultsResult> getPermissionSetsDefaults() {
        return null;
    }
global class PermissionSetDefaultsResult {
    global List<String> customPermission {
        get;
        set;
    }
    global String permissionSetAPIName {
        get;
        set;
    }
    global String permissionSetLicense {
        get;
        set;
    }
    global String permissionSetLicenseDeveloperName {
        get;
        set;
    }
    global String permissionSetName {
        get;
        set;
    }
    global String permissionsStaticResourceName {
        get;
        set;
    }
    global List<String> userPermissions {
        get;
        set;
    }
    global PermissionSetDefaultsResult() {

    }
}
}
