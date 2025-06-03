// thunk lets you dispatch functions, used for async actions
import thunk from 'redux-thunk'
import {
    createStore,
    applyMiddleware,
    compose
} from 'redux'

export const configureStore = (initialState, rootReducer, pathToRootReducer) => {
    const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
    const store = createStore(rootReducer, initialState, composeEnhancers(applyMiddleware(thunk)))

    if(module.hot) {
        module.hot.accept(pathToRootReducer, () => {
            const nextReducer = require(pathToRootReducer)
            store.replaceReducer(nextReducer)
        })
    }

    return store
}
