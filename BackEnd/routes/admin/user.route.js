const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/user.controller.js")
const auth = require("../../middlewares/auth.js");
const authorize = require("../../middlewares/authorize.js");
const userMiddleware = require("../../middlewares/user.middleware.js");

router.get("/", auth.authenticateToken, authorize.authorizeRoles("admin"), controller.getAllUser);

router.delete("/:id", auth.authenticateToken, authorize.authorizeRoles("admin"), userMiddleware.loadUser, controller.deleteUser);

module.exports = router;