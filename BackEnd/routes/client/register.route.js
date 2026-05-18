const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller");
const validation = require("../../middlewares/validation");

router.post("/", validation.validateCreateUser, controller.createUser); // Dấu : dùng để truyền data động

module.exports = router;