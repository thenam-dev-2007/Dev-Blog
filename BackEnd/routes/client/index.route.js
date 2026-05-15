const homeRoute = require("./home.route.js");

module.exports = (app) => {   
    app.use('/', homeRoute);
}