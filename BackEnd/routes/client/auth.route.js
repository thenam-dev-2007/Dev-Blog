const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const validation = require("../../middlewares/validation");
const auth = require("../../middlewares/auth");
const { forgotPasswordLimiter } = require("../../middlewares/rateLimiter")

router.post("/register", validation.validateRegister, controller.register); 

router.post("/verify-email", controller.verifyEmail);

router.post("/resend-otp", controller.resendRegisterOTP);

router.post("/login", validation.validateLogin, controller.login); 

router.post("/logout", auth.authenticateToken, controller.logout); 

router.post("/refresh-token", controller.refreshToken);

router.patch("/change-password", auth.authenticateToken, validation.validatePassword, controller.changePassword);

router.patch("/change-email", auth.authenticateToken, validation.validateEmail, controller.changeEmail);

router.post("/forgot-password", forgotPasswordLimiter, controller.forgotPassword);

router.post("/verify-reset-password-otp", validation.validationOTP, controller.verifyResetPasswordOTP);

router.post("/resend-reset-password-otp", controller.resendResetPasswordOTP);

router.patch("/reset-password", validation.validatePassword, controller.resetPassword);

module.exports = router;
