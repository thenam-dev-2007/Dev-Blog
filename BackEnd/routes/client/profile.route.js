const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/user.controller")
const validation = require("../../middlewares/validation.js");
const upload = require("../../middlewares/upload.js");
const auth = require("../../middlewares/auth");

/**
 * [GET] /api/profile/:id
 * Lấy thông tin profile của user (kèm số bài viết)
 */
router.get("/:id", auth.authenticateToken, controller.getProfileInfo);

/**
 * [GET] /api/profile/:id/posts
 * Lấy tất cả bài viết của user (có phân trang)
 */
router.get("/:id/posts", auth.authenticateToken, controller.getUserPosts);

/**
 * [GET] /api/profile/:id/stats
 * Lấy thống kê của user (tổng bài viết, likes, comments)
 * Công khai - không cần authentication
 */
router.get("/:id/stats", controller.getUserStats);

/**
 * [PUT] /api/profile/:id
 * Cập nhật thông tin profile (username, email, dateOfBirth, avatar)
 * Cần authentication - chỉ có thể sửa profile của chính mình
 * - Middleware: authenticateToken (kiểm tra token)
 * - Middleware: validation.validateUpdateUser (kiểm tra dữ liệu)
 * - Middleware: upload.uploadAvatar (upload avatar)
 */
router.put("/:id", auth.authenticateToken, validation.validateUpdateUser, upload.uploadAvatar.single('avatar'), controller.updateUser);

/**
 * [POST] /api/profile/:id/change-password
 * Thay đổi mật khẩu
 * Cần authentication - chỉ có thể đổi password của chính mình
 * Body: { currentPassword, newPassword, confirmPassword }
 */
router.post("/:id/change-password", authenticateToken, authorizeOwnerOrAdmin, validation.validateChangePassword, controller.changePassword);

/**
 * [DELETE] /api/profile/:id
 * Xóa tài khoản (soft delete)
 * Cần authentication - chỉ có thể xóa account của chính mình hoặc admin
 */
router.delete("/:id", authenticateToken, authorizeOwnerOrAdmin, controller.deleteAccount);

module.exports = router;
