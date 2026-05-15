const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller.js");

router.get("/:id", controller.getUserById)

module.exports = router