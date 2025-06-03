let reportRepo = null
let permissionsRepo = null
export function setReportRepo(repo)  {
    reportRepo = repo
}
export function setPermissionsRepo(repo) {
    permissionsRepo = repo
}
export function getReportRepo() {
    validateReportRepoIsSet()

    return reportRepo
}

export function getPermissionsRepo() {
    validatePermissionsRepoIsSet()
    return permissionsRepo
}

function validateReportRepoIsSet() {
    if (reportRepo == null) {
        throw `Report repo was not set correctly.`
    }
}

function validatePermissionsRepoIsSet() {
    if (permissionsRepo == null) {
        throw `Permissions repo was not set correctly.`
    }
}

