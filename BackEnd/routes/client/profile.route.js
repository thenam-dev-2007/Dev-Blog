const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller.js");
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");

router.get("/:id", controller.getUserById);
router.put("/:id", validation.validateUpdateUser, upload.uploadAvatar.single('avatar'), controller.updateUser);

module.exports = router