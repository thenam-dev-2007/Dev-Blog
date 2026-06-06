const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const validation = require("../../middlewares/validation");
const auth = require("../../middlewares/auth");

router.post("/register", validation.validateRegister, controller.register); 

router.post("/login", validation.validateLogin, controller.login); 

router.post("/logout", auth.authenticateToken, controller.logout); 

router.post("/refresh-token", controller.refreshToken);

router.patch("/change-password", auth.authenticateToken, validation.validateChangePassword, controller.changePassword);

router.patch("/change-email", auth.authenticateToken, validation.validateChangeEmail, controller.changeEmail);

module.exports = router;
