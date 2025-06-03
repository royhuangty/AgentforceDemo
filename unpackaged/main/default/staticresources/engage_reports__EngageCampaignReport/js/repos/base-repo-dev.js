import { setTimeoutPromise } from '../../../../js/util'

export function randomTimePromise(max) {
    return setTimeoutPromise(random(max))
}

function random(ms) {
    return Math.ceil(Math.random() * ms)
}
