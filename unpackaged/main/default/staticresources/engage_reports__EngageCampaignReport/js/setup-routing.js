import {
    Pages,
    GoogleAnalytics,
    DefaultLocale,
} from './report-constants'
import {
    selectPage,
    selectEmailRecipientsPage,
    selectTemplateRecipientsPage
} from './actions'
import { formatDateForUI } from './util'
import { trackVirtualPageView } from '../../../js/google-analytics'

let hashChangeInitiatedFromStore = false

export function setupRouting(store) {
    handleInitialRoute(store)

    store.subscribe(() => {
        handleRouteUpdatesFromStore(store)
    })

    window.addEventListener('hashchange', () => {
        handleRouteUpdatesFromHashChange(store)
    })
}

function handleInitialRoute(store) {
    let {
        page,
        id,
        params
    } = getPageInfo(window.location)

    trackGoogleAnalyticsPageView(page)

    if (page === Pages.Send || page === Pages.Template) {
        store.dispatch(
            selectPage(page, id)
        )
    } else if (page === Pages.Recipients) {
        let {
            type,
            sendId,
            templateId,
            scope,
            clientType,
            draftType,
            startDate,
            endDate,
            range,
            allTime
        } = params
        if (startDate) {
            startDate = new Date(startDate)
        }
        if (endDate) {
            endDate = new Date(endDate)
        }
        let additionalParams = {
            startDate,
            endDate,
            draftType,
            clientType,
            selectedScope: scope,
            dateRange: range,
            expandToAllTime: allTime
        }

        if (sendId) {
            store.dispatch(
                selectEmailRecipientsPage(sendId, type, additionalParams)
            )
        } else {
            store.dispatch(
                selectTemplateRecipientsPage(templateId, type, additionalParams)
            )
        }
    } else {
        window.location.hash = '/'
    }
}

function handleRouteUpdatesFromStore(store) {
    // TODO use react router
    let { location } = window
    let state = store.getState()
    let {
        templateId,
        sendId,
        selectedStat,
        selectedScope,
        startDate,
        endDate,
        dateRange,
        draftType,
        clientType,
        expandToAllTime
    } = state.filters.page
    let {
        page,
        id,
        params
    } = getPageInfo(location)
    let locale = state.userLocale || DefaultLocale

    if (selectedStat) {
        if (page !== Pages.Recipients) {
            let filterParams = toQuerystringParams({
                startDate: formatDateForUI(startDate, locale),
                endDate: formatDateForUI(endDate, locale),
                range: dateRange,
                scope: selectedScope,
                draftType,
                clientType
            })

            if (sendId && (sendId !== params.sendId || selectedStat !== params.type)) {
                location.hash = `/recipients?type=${selectedStat}&sendId=${sendId}&${filterParams}&allTime=${expandToAllTime}`
            } else if (templateId && (templateId !== params.templateId || selectedStat !== params.type)) {
                location.hash = `/recipients?type=${selectedStat}&templateId=${templateId}&${filterParams}`
            }
        }
    } else if (templateId) {
        if (page !== Pages.Template || templateId !== id) {
            location.hash = '/template/' + templateId
        }
    } else if (sendId) {
        if (page !== Pages.Send || sendId !== id) {
            location.hash = '/send/' + sendId
        }
    } else {
        if (page !== Pages.Main) {
            location.hash = '#/'
            hashChangeInitiatedFromStore = true
        }
    }
}

function handleRouteUpdatesFromHashChange(store) {
    let state = store.getState()
    let {
        templateId,
        sendId,
        selectedStat
    } = state.filters.page

    let {
        page,
        id,
        params
    } = getPageInfo(location)

    trackGoogleAnalyticsPageView(page)

    if (page === Pages.Main) {
        if (!hashChangeInitiatedFromStore) {
            store.dispatch(
                selectPage(Pages.Main, null)
            )
        }
    } else if (page === Pages.Template) {
        if (templateId !== id || selectedStat) {
            store.dispatch(
                selectPage(Pages.Template, id)
            )
        }
    } else if (page === Pages.Send) {
        if (sendId !== id || selectedStat) {
            store.dispatch(
                selectPage(Pages.Send, id)
            )
        }
    } else if (page === Pages.Recipients) {
        let additionalParams = {
            startDate: new Date(params.startDate),
            endDate: new Date(params.endDate),
            dateRange: params.range,
            selectedScope: params.scope,
            clientType: params.clientType,
            draftType: params.draftType,
            expandToAllTime: params.allTime
        }
        if (params.sendId && (sendId !== params.sendId || selectedStat !== params.type)) {
            store.dispatch(
                selectEmailRecipientsPage(params.sendId, params.type, additionalParams)
            )
        } else if (params.templateId && (templateId !== params.templateId || selectedStat !== params.type)) {
            store.dispatch(
                selectTemplateRecipientsPage(params.templateId, params.type, additionalParams)
            )
        }
    }

    hashChangeInitiatedFromStore = false
}

export function getPageInfo(location) {
    let info = {
        page: undefined,
        id: undefined,
        params: {}
    }

    if (location.hash === '#/') {
        info.page = Pages.Main
    } else if (location.hash.indexOf('#/send/') === 0) {
        info.page = Pages.Send
        info.id = location.hash.split('#/send/')[1]
    } else if (location.hash.indexOf('#/template/') === 0) {
        info.page = Pages.Template
        info.id = location.hash.split('#/template/')[1]
    } else if (location.hash.indexOf('#/recipients') === 0) {
        info.page = Pages.Recipients,
        info.params = getParams(location.hash.split('#/recipients?')[1])
    }

    return info
}

function getParams(querystring) {
    return querystring.split('&')
        .map(paramString => paramString.split('='))
        .reduce((accumulator, keyValueArray) => {
            return {
                ...accumulator,
                [keyValueArray[0]]: coerceValue(keyValueArray[1])
            }
        }, {})
}

function coerceValue(value) {
    if (value == 'true') {
        return true
    } else if (value == 'false') {
        return false
    } else if (!value) {
        return null
    } else {
        return value
    }
}

function toQuerystringParams(params) {
    return Object.keys(params).map((key) => {
        return `${key}=${params[key] || ''}`
    }).join('&')
}

function trackGoogleAnalyticsPageView(page) {
    if (GoogleAnalytics.Pages[page]) {
        trackVirtualPageView(GoogleAnalytics.Pages[page])
    }
}
