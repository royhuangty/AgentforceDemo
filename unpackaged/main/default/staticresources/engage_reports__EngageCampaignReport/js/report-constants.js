import { mapObject } from './util'
import { EventCategories } from '../../../js/google-analytics'

export const ReportNames = {
    Send: 'Engage_Sends'
}

export const ReportTypes = {
    // NOTE: If you add a new report type, make sure you check every usage of this since we make some assumptions
    // about only running send reports these days
    Send: 'Send'
}

export const ScopeFilterableReportTypes = {
    SendLead: 'SendLead',
    SendContact: 'SendContact',
    Send: 'Send'
}

export const Pages = {
    Main: 'Main',
    Send: 'Send',
    Template: 'Template',
    Recipients: 'Recipients'
}

function pagePath(page) {
    return `/apex/EngageCampaignReport/${page}/`
}

export const GoogleAnalytics = {
    Pages: {
        [Pages.Main]: pagePath('main'),
        [Pages.Send]: pagePath('send'),
        [Pages.Template]: pagePath('template'),
        [Pages.Recipients]: pagePath('recipients')
    },
    Timings: {
        Category: 'Engage Reports',
        ReportInstanceVars: {
            [ReportTypes.Send]: 'Send run'
        }
    },
    Events: {
        Category: EventCategories.Engage,
        ReportInstanceTimeouts: {
            [ReportTypes.Send]: `Reports - ${ReportTypes.Send} Run Timeout`,
        },
        ReportRunLimit: 'Reports - Run Limit Exceeded',
        ReportRunError: 'Reports - Run Error'
    }
}

export const StatFields = {
    OpenRate: 'Total Open Rate',
    ClickRate: 'Total Click Rate',
    UniqueOpens: 'Unique Opens',
    UniqueClicks: 'Unique Clicks',
    TotalUnsubscribes: 'Unsubscribes',
    TotalHardBounces: 'Hard Bounces',
    TotalDelivered: 'Total Delivered'
}

export const DonutDataMappings = {
    totalDelivered: ['Total Delivered', 'Total Delivered Out of Total Sent', 'totalDeliveredRate'],
    totalHardBounces: ['Total Hard Bounces', 'Total Hard Bounces Out of Total Sent', 'hardBounceRate'],
    totalUnsubscribes: ['Unsubscribes', 'Unsubscribes Out of Total Delivered', 'unsubscribeRate'],
    uniqueClicks: ['Unique Clicks', 'Unique Clicks Out of Total Delivered', 'uniqueClickRate'],
    uniqueOpens: ['Unique Opens', 'Unique Opens Out of Total Delivered', 'uniqueOpenRate'],
}

export const Fields = {
    TemplateName: 'Engage_Send__c.Engage_Email_Template__c.Name',
    ClientType: 'Engage_Send__c.Type__c',
    SentAt: 'Engage_Send__c.Sent_At__c'
}

export const FilterDropdownTypes = {
    EmailDraftTypes: 'EmailDraftTypes',
    ClientTypes: 'ClientTypes',
    ScopeTypes: 'ScopeTypes'
}

export const EmailDraftTypes = {
    All: {
        title: 'All Engage Emails',
        dropdownLabel: 'All Engage Emails',
        filter: null
    },
    Templated: {
        title: 'Engage Email Templates',
        dropdownLabel: 'Templated Emails',
        filter: {
            operator: 'notEqual',
            value: ''
        }
    },
    NonTemplated: {
        title: 'Self-Drafted Emails',
        dropdownLabel: 'Self-Drafted Emails',
        filter: {
            operator: 'equals',
            value: ''
        }
    }
}

export const DateRangePresets = {
    PastWeek: {
        label: '7 Days',
        value: 7
    },
    Past2Weeks: {
        label: '14 Days',
        value: 14
    },
    PastMonth: {
        label: '30 Days',
        value: 30
    }
}

export const DefaultLocale = 'en-US'

export const ClientTypes = {
    All: {
        title: 'Sent with Any Method',
        dropdownLabel: 'Any Method',
        filterValue: null
    },
    EngageCampaigns: {
        title: 'Sent with Engage Campaigns',
        dropdownLabel: 'Engage Campaigns',
        filterValue: 'Engage Campaigns'
    },
    Gmail: {
        title: 'Sent with Gmail',
        dropdownLabel: 'Engage for Gmail',
        filterValue: 'Engage for Gmail'
    },
    Outlook: {
        title: 'Sent with Outlook',
        dropdownLabel: 'Engage for Outlook',
        filterValue: 'Engage for Outlook'
    }
}

export const EngageReleaseDate = new Date('2015/3/1')

export const DonutColorsHex = {
    Pie: '#CAD2E0',
    Slice: '#4a90e2'
}

export const RecipientDescriptions = {
    Lead: {
        Type: 'Lead',
        Prefix: '00Q',
        Columns: {
            Email: 'Email',
            Company: 'Company',
            Name: 'Name'
        }
    },
    Contact: {
        Type: 'Contact',
        Prefix: '003',
        Columns: {
            Email: 'Email',
            Company: 'Account.Name, Account.Id',
            Name: 'Name'
        }
    }
}

export const PardotSyncTokens = {
    Unknown: '[[Unknown]]'
}

/**
    EngageReportsPackageNamespace is populated by the 'sf1' gulp task.
    You can specify by using the "--namespace" argument:
        gulp sf1 --namespace myNamespace

    If no namespace is given, and the env is 'dev', the namespace will
    be set to ''.
    If no namespace is given, and the env is 'prod', the namespace will be set
    to 'engage_reports'.
*/
export const EngageReportsPackageNamespace = '<!-- @namespace -->'
export const PardotPackageNamespace = 'pi'

export const ErrorMessages = {
    InsufficientPrivileges: "You don't have access to the Engage Reports folder. Contact your Salesforce admin.",
    NoAccess: "You do not have access to Engage Team Reports. Contact your system administrator to gain access.",
    SendStatsInsufficientAccess: "You have insufficient access to view this content."
}

// Some of these limits are platform limits, some are app limits to help stay within platform limits
// See https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform.htm
export const SalesforceLimits = {
    // Api platform limit
    MaxApiQueryLocators: 10,
    /**
        Affected by:
            Max WHERE clause in SOQL being limited to 4,000 characters, as well as response time.
            Limit in the number of records (stats) used in the aggregation - 50000
            Limit in the number of rows returned - 2000

        To stay within record limits, MaxSendsToQueryStatsFor * recipientsPerSend * statsPerRecipient must be < 50000
        To stay within row limts, MaxSendsToQueryStatsFor * recipientsPerSend must be < 2000
    */
    MaxSendsToQueryStatsFor: 200,
    MinConcurrentVisualforceRemotingRequestsForStats: 4,
    /* Throttle number of concurrent requests so that queued and pending requests don't
     block the network if the user changes the criteria and new requests need to be made.
     Ideally we want 6 - 12 requests in a queued or pending state at any given time, so
     this number will have to be adjusted when MaxSendsToQueryStatsFor gets adjusted.
     The higher the number, the longer the user needs to wait if they change the search criteria.
     The lower the number, the longer it could take (depending on avg response time) to complete all requests  */
    MaxConcurrentVisualforceRemotingRequests: 20,
    MaxRequestsInCompositeBatchRequest: 25
}
