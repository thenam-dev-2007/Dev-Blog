const express = require("express");
const router = express.Router();

const validation = require("../../middlewares/validation");
const controller = require("../../controllers/admin/auth.controller");
const auth = require("../../middlewares/auth");

router.post("/login", validation.validateLogin, controller.login); 

router.post("/logout", auth.authenticateToken, controller.logout); 

router.post("/refresh-token", controller.refreshToken);

module.exports = router;