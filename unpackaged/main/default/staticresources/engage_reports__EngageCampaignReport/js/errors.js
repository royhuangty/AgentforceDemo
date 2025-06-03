class ExtendableError extends Error {
    constructor(message) {
        super(message)
        this.message = message
        this.name = this.constructor.name
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor)
        } else {
            this.stack = (new Error(message)).stack
        }
    }

    getMessage() {
        return this.message
    }
}

export class TimeoutError extends ExtendableError {}

export class UnexpectedSOQLResponseError extends ExtendableError {
    constructor(message, response) {
        super(message)
        this.response = response
    }
}

export class SoqlRowLimitError extends ExtendableError {}
export class ApexCPUTimeLimitError extends ExtendableError {}
export class FieldLevelSecurityError extends ExtendableError {}
export class NoRemoteRecordsFoundError extends UnexpectedSOQLResponseError {}

export class PermsetAssignmentError extends ExtendableError {
    constructor(message, results) {
        super(message)
        this.results = results
    }
}

export class InsufficientPermissionsError extends ExtendableError {}
export class ApiError extends ExtendableError {}
export class ReportRunError extends ApiError {}
export class ReportRunLimitExceededError extends ApiError {}

export const ApiErrors = {
    ErrorCodes: {
        Forbidden: 'FORBIDDEN',
        BadRequest: 'BAD_REQUEST'
    },
    Messages: {
        ReportRunLimitExceeded: "You can't run more than 1,200 reports asynchronously every 60 minutes. Try again later.",
        FilterOperatorGreaterOrEqualInvalid: "Specify a valid condition because greaterOrEqual is invalid",
        FilterOperatorEqualsInvalid: "Specify a valid condition because equals is invalid",
        SoqlRowLimit: "Too many query rows:",
        ApexCPUTimeLimit: "Apex CPU time limit exceeded"
    }
}

export const ApexErrors = {
    NoSOQLRows: "List has no rows for assignment to SObject"
}

export const UserErrors = {
    ReportRunLimitExceeded: "We're sorry but the limit of report runs for the hour has been exceeded. Please try again later.",
    SendStatsInsufficientAccess: "You have insufficient access to view this content."
}
