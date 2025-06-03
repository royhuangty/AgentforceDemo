import { ReportNames } from './report-constants'

export function getReportTypeFromName(reportName) {
    return findFirstKeyForValue(ReportNames, reportName)
}

export function getReportNameFromType(reportType) {
    return ReportNames[reportType]
}

export function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length &&
        arr1
            .map((value, i) => value === arr2[i])
            .filter(v => !v)
            .length === 0
}

/**
    Higher order function that allows you to map over the values of and object
    for a given key. Returns a new object.

    @param oldObject
    @param callback
      @param currentValue
      @param currentKey
      @param currentIndex
      @param keys

    @return Object
*/
export function mapObject(oldObject, callback = ()=>{}) {
    return Object.keys(oldObject).reduce((newObject, key, i, keys) => {
        newObject[key] = callback(oldObject[key], key, i, keys)
        return newObject
    }, {})
}

export function percent(num) {
    return Math.round(num * 100) + '%'
}

export function resolvedPromise() {
    return Promise.resolve()
}

export function deepClone(obj) {
    if (obj === undefined) {
        return obj
    }
    return JSON.parse(JSON.stringify(obj))
}

/**
 * @param {Date} date
 * @param {string} locale
 * @param {boolean} includeTime
 * @return {string}
 */
export function formatDateForUI(date, locale, includeTime = false) {
    let options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }
    if (includeTime) {
        options['hour'] = 'numeric'
        options['minute'] = 'numeric'
    }
    return date.toLocaleDateString(locale, options)
}

export function getDatesForPastNDays(days) {
    let start = dateWithDayGranularity(new Date())
    let end = dateWithDayGranularity(new Date())
    start.setDate(start.getDate() - days)

    return {
        start,
        end
    }
}

export function datesEqual(a, b) {
    return dateWithDayGranularity(a).getTime() === dateWithDayGranularity(b).getTime()
}

export function dateWithDayGranularity(d) {
    let date = new Date(d)
    date.setHours(0, 0, 0, 0)
    return date
}

export function dateWithMonthGranularity(d) {
    let date = dateWithDayGranularity(d)
    date.setDate(1)
    return date
}

export function findFirstKeyForValue(obj, value) {
    return Object.keys(obj).find(key => obj[key] === value)
}

export function lowercaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1)
}

/** Pluralizes a string. Add to this as needed */
export function pluralize(string, num) {
    if (num === 1) {
        return string
    }

    return string + 's'
}

export function lowerCaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1)
}

export function sortObjectsByCallback(objects, callback, order = 'asc') {
    return objects.slice().sort((a, b) => {
        let aValue = callback(a)
        let bValue = callback(b)
        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1
        } else if (aValue > bValue) {
            return order === 'asc' ? 1 : -1
        }

        return 0
    })
}

export function lowerCaseObjectKeys(obj) {
    let stringObject = (obj).toString
    if (stringObject.call(obj) !== '[object Object]') {
        return obj
    }

    return Object.keys(obj).reduce((acc, key) => {
        return {
            ...acc,
            [lowerCaseFirstLetter(key)]: lowerCaseObjectKeys(obj[key])
        }
    }, {})
}

// http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
export function nonSecureHash(input) {
    let hash = 0, chr
    if (input.length === 0) {
        return hash
    }

    for (let i = 0; i < input.length; i++) {
        chr = input.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0
    }

    return hash
}

export function prefixWithNamespace(customMetaType, namespace) {
    if (!namespace) {
        return customMetaType
    }

    return customMetaType.split('.').map((metaType) => {
        return metaType.endsWith('__c') ? `${namespace}__${metaType}` : metaType
    }).join('.')
}

/**
 * Creates an array with length of input, and values created by a callback
 * @param {Number} length - length of array
 * @param {function(index)} callback - optional. The return value is assigned at
    the index passed into the callback
 * @return array
 */
export function arrayFromLength(length, callback) {
    let arr = Array.from(Array(length))
    if (callback) {
        return arr.map((undefinedValue, i) => callback(i))
    }

    return arr
}

/**
 * Responsible for converting the date into a timezone adjusted date taking into consideration the users physical location,
 * the user's timezone configured in SF, and EST/EDT which is the timezone of the data we store in SF. See Example...
 *
 * EXAMPLE: Computer is located in CDT, SF is configured to PDT and data is in EDT.
 *          JS dates use computer's physical location to determine timezone so dates will be in CDT (utc offset = -5)
 *          Convert CDT to SF (-5 - (-7)) = 2, to get adjustment for date object (CDT) to SF timezone setting (PDT)
 *          Convert EDT to SF (-4 - (-7)) = 3, to get adjustment for server data (EDT) to SF timezone setting (PDT)
 *          Add together to get full adjustment (2 + 3 = 5) which gives us the amount of hours to adjust by for date.
 *
 *          To prove this works correctly, say we want the start of a day using the above example.
 *          That would be 3 am EDT (when SF is set to PDT). 12 am PDT is the same as UTC 07:00:00.
 *          Since SF thinks the data stored is in PDT, not EDT, we must add the 3 hour offset ourselves.
 *          So, we must query for 3 am PDT or UTC 10:00:00.
 *
 *          Our Javascript date param passed into this function would be in CDT, which is UTC 05:00:00 at start of day.
 *          Using the offset we calculated above (+5), we get UTC 05:00:00 + 05:00:00 = UTC 10:00:00 (our desired time).
 *
 * @param date
 * @param dataTimezoneOffset - timezone data is stored in (should be EST/EDT)
 * @param sfTimezoneOffset - timezone configured in Salesforce for user
 * @returns Date
 */
export function getTimezoneAdjustedDate(date, dataTimezoneOffset, sfTimezoneOffset) {
    //don't want to alter original date object because it will have a cumulative effect on start/end date within state.
    let newDate = new Date(date.getTime())
    //we need to take into account the physical location where the user's computer is (affects Date() JS object)
    //as well as user's SF timezone configuration and also that the data is stored in SF as EST/EDT.
    let localToSF = (date.getTimezoneOffset()/-60) - sfTimezoneOffset
    let dataToSF =  dataTimezoneOffset - sfTimezoneOffset
    let offset = localToSF + dataToSF
    newDate.setHours(date.getHours() + offset)
    return newDate
}

/**
 * Calculates timezone difference between EST/EDT and SF user timezone setting to correctly display dates returned in
 * query results.
 * @param {Date} date
 * @param {number} dataTimezoneOffset - timezone data is stored in (should be EST/EDT)
 * @param {number} sfTimezoneOffset - timezone configured in Salesforce for user
 * @returns {Date}
 */
export function getTimezoneAdjustedDateForLabel(date, dataTimezoneOffset, sfTimezoneOffset) {
    let etToSF = dataTimezoneOffset - sfTimezoneOffset
    date.setHours(date.getHours() - etToSF)
    return date
}

export function getDateFilterFormat(date) {
    if (!date) {
        return ""
    }

    //SF wants an ISO 8601 formatting without milliseconds
    return date.toISOString().slice(0, 19) + "Z"
}

/**
 * Maps a one dimentional array of items to a two dimensional array of items
 * @param items {Array} - One dimensional array
 * @param maxBatchSize {Number}
 * @return {Array} - Two dimensional array
*/
export function splitIntoBatchesByMaxBatchSize(items, maxBatchSize) {
    return items.reduce((itemBatches, item) => {
        let currentBatch = itemBatches.pop() || []
        if (currentBatch.length >= maxBatchSize) {
            // add new batch
            return [...itemBatches, currentBatch, [item]]
        }
        // add to currentBatch
        return [...itemBatches, [...currentBatch, item]]
    }, [])
}
