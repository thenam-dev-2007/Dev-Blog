const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/dashboard.controller");
const auth = require("../../middlewares/auth");
const authorize = require("../../middlewares/authorize.js");

router.get("/", auth.authenticateToken, authorize.authorizeRoles("admin"), controller.dashboard);

module.exports = router;