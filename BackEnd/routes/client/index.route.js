const homeRoute = require("./home.route.js");
const profileRoute = require("./profile.route.js");
const registerRoute = require("./register.route.js");

module.exports = (app) => {  
    const PATH_API = systemConfig.prefixApi;

    app.use(PATH_API + '/', homeRoute);

    app.use(PATH_API + '/profile', profileRoute);

    app.use(PATH_API + '/register', registerRoute);
}