const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller");
const auth = require("../../middlewares/auth");

router.post("/", auth.authenticateToken, controller.login); 

module.exports = router;