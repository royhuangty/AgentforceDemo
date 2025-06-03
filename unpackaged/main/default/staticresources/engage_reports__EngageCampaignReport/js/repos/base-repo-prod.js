import jQuery, { ajax } from 'jquery'
import {
    NoRemoteRecordsFoundError
} from '../errors'
import {
    nonSecureHash
} from '../util'
import {
    objectToQuerystring
} from '../../../../js/util'

export function doQuery(sessionId, options = { query: null, queryLocator: null, batchSize: null }) {
    let {
        query,
        queryLocator,
        batchSize
    } = options

    let params = {}
    let path = 'query/'
    if (queryLocator) {
        path += queryLocator
    } else if (query) {
        params = { q: query }
    }

    let method = 'GET'

    let headers = {}
    if (batchSize) {
        headers['Sforce-Query-Options'] = `batchSize=${batchSize}`
    }

    return makeRestRequest(sessionId, path, method, params, headers)
}


/**
    @param sessionId
    @param requests [Array] of Composite Subrequest (https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/requests_composite.htm)
*/
export function doCompositeRequest(sessionId, requests) {
    let path = 'composite/'
    let method = 'POST'
    let params = {
        allOrNone: false,
        compositeRequest: requests.map((request) => {
            return {
                method: request.method,
                url: restDataPathPrefix() + request.path,
                httpHeaders: request.headers,
                referenceId: request.referenceId
            }
        })
    }

    return makeRestRequest(sessionId, path, method, params)
        .then(({ compositeResponse }) => compositeResponse)
}

function restDataPathPrefix() {
    return '/services/data/v38.0/'
}

export function makeRestRequest(sessionId, path, method, params = {}, headers = {}) {
    let options = {
        url: `${getProtocolAndHostPath()}${restDataPathPrefix()}${path}`,
        headers: {
            'Authorization': `OAuth ${sessionId}`,
            ...headers
        },
        method,
        data: method === 'POST' ? JSON.stringify(params) : params,
        dataType: method === 'POST' ? 'json' : undefined,
        contentType: "application/json; charset=utf-8",
        processData: true
    }

    return doAjax(options)
}

export function makeSoapRequest(sessionId, soapAction, body) {
    let options = {
        url: `${getProtocolAndHostPath()}/services/Soap/m/38.0`,
        headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': soapAction
        },
        method: 'POST',
        dataType: 'xml',
        data: body,
        processData: false
    }

    return doAjax(options).then((xmlResponse) => {
        let response = jQuery(xmlResponse)
        if (response.find('success').text() === 'false') {
            throw response.find('errors message').text()
        }

        return response
    })
}

export function doVisualforceRemoteAction(actionLocation, args = [], options = { timeout: 10000 }) {
    return new Promise((resolve, reject) => {
        Visualforce.remoting.timeout = options.timeout
        Visualforce.remoting.Manager.invokeAction(actionLocation, ...args, (response, event) => {
            if (event.status) {
                resolve(response)
            } else {
                reject(event.message)
            }
        }, { escape: false, buffer: false })
    })
}

function doAjax(options) {
    return new Promise((resolve, reject) => {
        ajax(options, resolve)
            .done((data, textStatus, jqXHR) => {
                resolve(data)
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                reject(jqXHR.responseText)
            })
    })
}

function getProtocolAndHostPath() {
    let {
        protocol,
        hostname
    } = window.location

    return `${protocol}//${hostname}`
}
