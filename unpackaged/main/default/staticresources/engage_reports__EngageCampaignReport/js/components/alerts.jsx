import React from 'react'
import BackfillAlert from './backfill-alert.jsx'

/*
 * Stateless component designated by pure function.
 * Wraps all application alerts to ensure they play well together.
 * Basically a copy of how alerts are handled in Engage Campaigns.
*/
const Alerts = ({ alertsState, dispatch }) => {
    let alerts = []

    if (alertsState.canShowBackfillAlert) {
        alerts.push(
            <BackfillAlert dispatch={dispatch} key={alerts.length}/>
        )
    }


    return (
        <div className='alerts-wrapper'>
            {alerts}
        </div>
    )
}

export default Alerts
