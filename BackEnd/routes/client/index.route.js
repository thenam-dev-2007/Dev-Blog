const systemConfig = require("../../config/system.js");
const homeRoute = require("./home.route.js");
const postRoute = require("./post.route.js");
const profileRoute = require("./profile.route.js");
const authRoute = require("./auth.route.js");

module.exports = (app) => {
  const PATH_API = systemConfig.prefixApi;
  
  app.use(PATH_API + "/", homeRoute);

  app.use(PATH_API + "/posts", postRoute);

  app.use(PATH_API + "/profile", profileRoute);

  app.use(PATH_API + "/auth", authRoute);
};
