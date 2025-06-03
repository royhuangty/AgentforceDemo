export const SendReportColumns = {
    SendId: 0,
    Subject: 1,
    Owner: 2,
    TemplateName: 3,
    Type: 4,
    SentAt: 5,
    TotalSends: 6,
    TotalHardBounces: 7,
    TotalSoftBounces: 8
}

export function mapSendInstanceToSends(initialInstance, batchInstance) {
    let allInstances = [initialInstance, ...batchInstance.batches]
    let sends = []
    let cols = SendReportColumns
    // Dedupe sends based on ID. No matter how precise we are with our date filters, two sends at the exact same time
    // mean we either run the risk of missing records or getting duplicates
    let processedSendIds = {}
    allInstances.forEach((instance) => {
        let rows = instance.factMap['T!T'].rows
        for (let i = 0; i < rows.length; i++) {
            let cells = rows[i].dataCells
            let id = cells[cols.SendId].value
            if (processedSendIds.hasOwnProperty(id)) {
                continue
            }
            processedSendIds[id] = true
            sends.push({
                id: id,
                subject: cells[cols.Subject].label,
                owner: {
                    name: cells[cols.Owner].label,
                    id: cells[cols.Owner].value
                },
                template: {
                    name: cells[cols.TemplateName].label,
                    id: cells[cols.TemplateName].value
                },
                type: cells[cols.Type].value,
                sentAt: new Date(cells[cols.SentAt].value),
                totalSends: cells[cols.TotalSends].value,
                totalHardBounces: cells[cols.TotalHardBounces].value,
                totalSoftBounces: cells[cols.TotalSoftBounces].value
            })
        }
    })

    return sends
}

/**
 * @param {Object} state
 * @return {Object} -
 * The format looks like this:
 *      {
 *          'send123': [
 *              {
 *                  send: { name: '10x your mother', id: 'send123' },
 *                  recipient: { name: 'Ben Dover', id: 'lead123' },
 *                  ...,
 *                  opens: 0,
 *                  totalSends: 50
 *              },
 *              ... more stats
 *          ],
 *          ... more stats key'ed on send id
 *      }
 * }
*/
export function mapSendAggregatesToRawStatsBySendId(aggregates) {
    let statsBySendId = {}
    // Using for loop for performance. Be careful not to alter state
    for (let i = 0; i < aggregates.length; i++) {
        let sendStat = aggregates[i]
        if (!statsBySendId[sendStat.sendId]) {
            statsBySendId[sendStat.sendId] = [sendStat]
        } else {
            statsBySendId[sendStat.sendId].push(sendStat)
        }
    }

    return statsBySendId
}

export function getSenders(sends) {
    let senderIds = {}
    let senders = []
    for (let i = 0; i < sends.length; i++) {
        if (senderIds[sends[i].owner.id]) {
            continue
        }
        senderIds[sends[i].owner.id] = true
        senders.push(sends[i].owner)
    }
    return senders
}


/**
 * Aggregates raw stats
 * @param stats {Object} - Raw stats, basically 1-1 mapping of Engage Lead/Contact Stat
 * @return {Object}
*/

export function aggregateStatsForSend(stats) {
    let totalSends = 0
    let totalClicks = 0
    let totalOpens = 0
    let totalHardBounces = 0
    let totalSoftBounces = 0
    let totalUnsubscribes = 0

    let clicksByRecipientId = {}
    let opensByRecipientId = {}
    let uniqueClicks = 0
    let uniqueOpens = 0

    stats.forEach((stat) => {
        totalSends += stat.sends
        totalClicks += stat.clicks
        totalOpens += stat.opens
        totalHardBounces += stat.hardBounces
        totalSoftBounces += stat.softBounces
        totalUnsubscribes += stat.unsubscribes

        if (stat.clicks) {
            clicksByRecipientId[stat.recipientId] = 1
        }

        if (stat.opens) {
            opensByRecipientId[stat.recipientId] = 1
        }
    })

    return {
        totalSends,
        totalOpens,
        totalClicks,
        totalHardBounces,
        totalSoftBounces,
        totalUnsubscribes,
        totalDelivered: calculateDelivered({totalSends, totalHardBounces, totalSoftBounces}),
        uniqueClicks: Object.values(clicksByRecipientId).length,
        uniqueOpens: Object.values(opensByRecipientId).length
    }
}


export function findSend(sends, sendId) {
    for (let i = 0; i < sends.length; i++) {
        if (sends[i].id === sendId) {
            return sends[i]
        }
    }

    return null
}

/**
 * Aggregates the stats for each send, then aggregates all send stats into one stat object
 * @param sends {Array[Object]} - Array of sends whose stats will be merged
 * @param statsBySendId {Object} - Collections of raw stats for a given send, keyed on sendId
 * @return {Object} - {
 *      totalSends: ...,
 *      ...
 *      uniqueClicks: ...,
 *      allTime: {
 *          totalSends: ...,
 *          ...
 *      }
 * }
*/

export function aggregateStatsForSends(sends, statsBySendId) {
    let sendStats = []
    let allTimeSendStats = []

    sends.forEach((send) => {
        allTimeSendStats.push({
            totalSends: send.totalSends,
            totalHardBounces: send.totalHardBounces,
            totalSoftBounces: send.totalSoftBounces
        })

        let rawStats = statsBySendId[send.id]
        if (!rawStats) {
            // stats have not yet loaded for the send
            return
        }

        sendStats.push(aggregateStatsForSend(rawStats))
    })

    let mergedStats = aggregateArrayOfKeyValues(sendStats)
    mergedStats.allTime = aggregateArrayOfKeyValues(allTimeSendStats)

    return mergedStats
}

function aggregateArrayOfKeyValues(arr) {
    let aggregates = {}

    for (let i = 0; i < arr.length; i++) {
        let item = arr[i]
        let keys = Object.keys(item)

        for (let j = 0; j < keys.length; j++) {
            let key = keys[j]
            if (aggregates[key]) {
                aggregates[key] = aggregates[key] + item[key]
            } else {
                aggregates[key] = item[key]
            }
        }
    }

    return aggregates
}

export function calculateDerivedStats(aggregatedStats, allTimeStats) {
    let delivered = calculateDelivered(aggregatedStats)
    let allTimeDelivered = calculateDelivered(allTimeStats)

    return {
        totalDelivered: delivered,
        totalDeliveredRate: allTimeDelivered / allTimeStats.totalSends || 0,
        uniqueClickRate: aggregatedStats.uniqueClicks / allTimeDelivered || 0,
        totalOpenRate: aggregatedStats.totalOpens / allTimeDelivered || 0,
        hardBounceRate: aggregatedStats.totalHardBounces / allTimeStats.totalSends || 0,
        unsubscribeRate: aggregatedStats.totalUnsubscribes / allTimeDelivered || 0,
        uniqueOpenRate: aggregatedStats.uniqueOpens / allTimeDelivered || 0,
        totalClickRate: aggregatedStats.totalClicks / allTimeDelivered || 0,
        totalUnopened: delivered - aggregatedStats.uniqueOpens,
        totalUnclicked: delivered - aggregatedStats.uniqueClicks,
        bounceRate: (aggregatedStats.totalSoftBounces + aggregatedStats.totalHardBounces) / allTimeStats.totalSends || 0
    }
}

function calculateDelivered(stats) {
    return stats.totalSends - (stats.totalHardBounces + stats.totalSoftBounces)
}
