const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller.js")
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");
const auth = require("../../middlewares/auth.js");
const authorize = require("../../middlewares/authorize.js");
const userMiddleware = require("../../middlewares/user.middleware.js");

router.get("/me", auth.authenticateToken, controller.getMyProfile);

router.get("/me/posts", auth.authenticateToken, controller.getMyPosts);

router.get("/:id", auth.authenticateToken, userMiddleware.loadUser, controller.getOtherProfile);

router.get("/:id/posts", auth.authenticateToken, userMiddleware.loadUser, controller.getOthersPosts);

router.patch("/me", auth.authenticateToken, upload.uploadAvatar.single('avatar'), validation.validateUpdateMyProfile, controller.updateMyProfile);

module.exports = router;
