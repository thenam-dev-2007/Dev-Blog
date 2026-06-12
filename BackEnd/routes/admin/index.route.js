const systemConfig = require("../../config/system.js");
const authRoute = require("../../routes/admin/auth.route");
const dashboardRoute = require("../../routes/admin/dashboard.route");
const profileRoute = require("../../routes/admin/auth.route");
const postRoute = require("../../routes/admin/post.route");


module.exports = (app) => {
    const PATH_API = systemConfig.prefixApi;
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(PATH_API + PATH_ADMIN + "/auth", authRoute);

    app.use(PATH_API + PATH_ADMIN + "/auth", dashboardRoute);

    app.use(PATH_API + PATH_ADMIN + "/posts", postRoute);

    app.use(PATH_API + PATH_ADMIN + "/profile", profileRoute);
};
