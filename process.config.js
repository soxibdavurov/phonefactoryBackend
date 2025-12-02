module.exports = {
    apps: [{
        name: "PhoneFactory",
        cwd: "./",
        script: "./dist/server.js",
        watch: false,
        env_development: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        },
        instances: 1,
        exec_mode: "cluster"
    }]
}