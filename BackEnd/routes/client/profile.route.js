const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller.js")
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");
const auth = require("../../middlewares/auth.js");
const userMiddleware = require("../../middlewares/user.middleware.js")

router.get("/me", auth.authenticateToken, controller.getMyProfile);

router.get("/:id", auth.authenticateToken, controller.getOtherProfile);

// router.get("/:id/posts", auth.authenticateToken, userMiddleware.loadUser, controller.getUserPosts);

/**
 * [PUT] /api/profile/:id
 * Cập nhật thông tin profile (username, email, dateOfBirth, avatar)
 * Cần authentication - chỉ có thể sửa profile của chính mình
 * - Middleware: authenticateToken (kiểm tra token)
 * - Middleware: validation.validateUpdateUser (kiểm tra dữ liệu)
 * - Middleware: upload.uploadAvatar (upload avatar)
 */
router.patch("/me", auth.authenticateToken, upload.uploadAvatar.single('avatar'), validation.validateUpdateMyProfile, controller.updateMyProfile);

module.exports = router;
