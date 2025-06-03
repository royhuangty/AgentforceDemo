/**
 * In memory storage only. All data is lost upon page refresh. When item has been in cache
 * for longer than the timeout, it is deleted.
 * @param timeout {Number}
 * @return {Function} - fetch function that takes in a key and a cache miss function:
 *      const fetchMoom = createAsyncCache(60000)
 *      fetchMoom(id, () => {
 *          return getMoomAsync(id)
 *      }).then(moom => console.log(moom))
*/
export const createAsyncCache = (timeout) => {
    let cache = {}

    const set = (key, value) => {
        cache[key] = {
            value,
            date: new Date()
        }
    }

    const get = (key) => {
        let result = cache[key]
        if (!result) {
            return
        }

        if (new Date() - result.date > timeout) {
            delete cache[key]
            return
        }

        return result.value
    }

    /**
     * Value will be returned from cache if it is there, else a callback function is called
     * that returns a promise which resolves the value. The resolved value will
     * be stored in cache.
     * @param key {String}
     * @param getValue {Function} - When called, returns a promise that resolves to the value to be stored in cache
     * @return {Promise} - Resolves to value
    */
    const fetch = (key, getValue) => {
        let value = get(key)
        if (value) {
            return Promise.resolve(value)
        } else {
            return getValue().then((value) => {
                set(key, value)
                return value
            })
        }
    }

    return fetch
}
