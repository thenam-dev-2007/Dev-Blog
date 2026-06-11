const systemConfig = require("../../config/system.js");
const authRoute = require("../../routes/admin/auth.route");
const profileRoute = require("../../routes/admin/auth.route");
const postRoute = require("../../routes/admin/post.route");


module.exports = (app) => {
    const PATH_API = systemConfig.prefixApi;
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(PATH_API + "/auth", authRoute);

    app.use(PATH_API + "/posts", postRoute);

    app.use(PATH_API + "/profile", profileRoute);
};
