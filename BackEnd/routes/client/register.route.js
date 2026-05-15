const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller.js");
const validation = require("../../middlewares/validation.js");

router.post("/", validation.validateCreateUser, controller.createUser);

module.exports = router;