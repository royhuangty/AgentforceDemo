({
    baseUrl: '.',
    name: 'app',
    findNestedDependencies: true,
    includeRequire: [ 'app' ],
    inlineText: true,
    optimize: 'none',
    wrap: true,
    mainConfigFile: 'app.js',
    out: 'dist/app.js',
    paths: {
        config: "empty:",
        app: 'app'
    }
})