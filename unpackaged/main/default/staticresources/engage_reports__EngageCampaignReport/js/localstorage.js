const toPersist = {};

const STORAGE_KEY = 'store';

export function persistStore(store) {
    store.subscribe(listener(store));
}

export function loadStore(path) {
    const store = JSON.parse(window.localStorage.getItem('store'));
    return getPath(path, store);
}

export function registerPersistence(path) {
    toPersist[path] = true;
}

/**
 * The debounced subscription listener
 */
function listener(store) {
    let timeout;

    const writeToLocalStorage = () => {
        const state = store.getState();

        // Object to write back to store
        const write = {};

        Object.keys(toPersist).forEach(path => {
            const item = getPath(path, state);
            if (item !== undefined) {
                writePath(path, write, item);
            }
        });

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(write));
    };

    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(writeToLocalStorage, 500);
    };
}

function getPath(path, object) {
    return path.split('.').reduce((accum, curr) => {
        return accum ? accum[curr] : undefined
    }, object)
}

function writePath(path, object, item) {
    path = path.split('.');
    let curr = object;

    for (let i = 0; i < path.length - 1; ++i) {
        const p = path[i];
        if (!curr[p]) {
            curr[p] = {};
        }
        curr = curr[p];
    }

    curr[path[path.length - 1]] = item;
}
