// 2000 is the default (and max) in the rest api, but 200 (min), which is better for ux
export const USERS_QUERY_BATCH_SIZE = 200
export const ENGAGE_PERMISSIONSET_NAME = 'Sales_Edge'
export const ENGAGE_REPORTS_PERMISSIONSET_NAME = 'Engage_Reports_End_User'
export const UnassignAction = 'Unassign'
export const AssignAction = 'Assign'

// map of better error messages for given api error status codes
export const ApiAssignmentErrorStatusCodesToMessages = {
    'DUPLICATE_VALUE': 'User already has Engage Reports (End User) Permission Set assigned.'
}

export const ErrorMessages = {
    FLS_PermSet: "You don't have access to manage permission sets for users."
}
