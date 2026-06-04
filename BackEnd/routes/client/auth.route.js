const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const validation = require("../../middlewares/validation");
const auth = require("../../middlewares/auth");

router.post("/register", validation.validateRegister, controller.register); 
router.post("/login", validation.validateLogin, auth.authenticate, controller.login); 

module.exports = router;
