const homeRoute = require("./home.route.js");
const authRoute = require("./auth.route.js");
const postRoute = require("./post.route.js");
const profileRoute = require("./profile.route.js");
const registerRoute = require("./register.route.js");
const loginRoute = require("./login.route.js")
const searchRoute = require("./search.route.js");

module.exports = (app) => {
  const PATH_API = systemConfig.prefixApi;
  
  app.use(PATH_API + "/", homeRoute);

  app.use(PATH_API + "/posts", postRoute);

  app.use(PATH_API + "/search", searchRoute);

  app.use(PATH_API + "/profile", profileRoute);

  app.use(PATH_API + "/register", registerRoute);

  app.use(PATH_API + "/login", loginRoute)
};
