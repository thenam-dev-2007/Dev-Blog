const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/auth.controller.js");
const validation = require("../../middlewares/validation.js");
const { authenticateToken } = require("../../middlewares/auth.js");

/**
 * === AUTHENTICATION ROUTES ===
 * Các route cho chứng thực người dùng (login, logout, lấy profile, etc.)
 */

/**
 * [POST] /api/auth/login
 * Đăng nhập người dùng
 * 
 * Middleware: validation.validateLogin
 *   - Kiểm tra username không rỗng
 *   - Kiểm tra password không rỗng
 * 
 * Body: { username: string, password: string }
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Đăng nhập thành công",
 *   data: {
 *     user: { _id, username, email, avatar, role, dateOfBirth, createdAt },
 *     token: "JWT token string",
 *     expiresIn: "24h"
 *   }
 * }
 * 
 * Response Error (400/401):
 * {
 *   success: false,
 *   message: "Lỗi chi tiết",
 *   error: "ERROR_CODE"
 * }
 */
router.post("/login", validation.validateLogin, controller.login);

/**
 * [GET] /api/auth/profile
 * Lấy thông tin profile của user hiện tại
 * 
 * Middleware: authenticateToken
 *   - Kiểm tra JWT token từ header Authorization
 *   - Nếu token không tồn tại, trả về 401
 *   - Nếu token hết hạn, trả về 401 với error "TOKEN_EXPIRED"
 *   - Nếu token không hợp lệ, trả về 403
 * 
 * Header: Authorization: Bearer <token>
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Lấy thông tin thành công",
 *   data: {
 *     _id: "user id",
 *     username: "username",
 *     email: "email@example.com",
 *     avatar: "avatar url",
 *     role: "user" | "admin",
 *     dateOfBirth: "ISO date string",
 *     createdAt: "ISO date string",
 *     updatedAt: "ISO date string"
 *   }
 * }
 * 
 * Response Error (401/403/404):
 * {
 *   success: false,
 *   message: "Chi tiết lỗi"
 * }
 */
router.get("/profile", authenticateToken, controller.getProfile);

/**
 * [POST] /api/auth/logout
 * Đăng xuất người dùng
 * 
 * Lưu ý: JWT là stateless, nên phía server không cần lưu gì
 *        Client sẽ tự xóa token khỏi localStorage/sessionStorage
 *        Tuy nhiên route này vẫn yêu cầu xác thực để đảm bảo
 * 
 * Middleware: authenticateToken
 *   - Kiểm tra JWT token từ header Authorization
 * 
 * Header: Authorization: Bearer <token>
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Đăng xuất thành công"
 * }
 * 
 * Response Error (401/403):
 * {
 *   success: false,
 *   message: "Chi tiết lỗi"
 * }
 */
router.post("/logout", authenticateToken, controller.logout);

/**
 * [POST] /api/auth/refresh-token
 * Làm mới token khi token hiện tại sắp hết hạn
 * 
 * Body: { refreshToken: string }
 * 
 * Quy trình:
 * 1. Client gửi refreshToken
 * 2. Server xác thực refreshToken
 * 3. Nếu hợp lệ, tạo token mới
 * 4. Trả về token mới
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Làm mới token thành công",
 *   data: {
 *     token: "JWT token mới",
 *     expiresIn: "24h"
 *   }
 * }
 * 
 * Response Error (400/401):
 * {
 *   success: false,
 *   message: "Chi tiết lỗi",
 *   error: "ERROR_CODE"
 * }
 */
router.post("/refresh-token", controller.refreshToken);

/**
 * [POST] /api/auth/verify-token
 * Kiểm tra tính hợp lệ của token
 * 
 * Cách gửi token (chọn 1 trong 2):
 * Option 1 - Body: { token: "JWT token string" }
 * Option 2 - Header: Authorization: Bearer <token>
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Token hợp lệ",
 *   data: {
 *     _id: "user id",
 *     username: "username",
 *     email: "email@example.com",
 *     role: "user" | "admin",
 *     iat: "issued at timestamp",
 *     exp: "expiration timestamp"
 *   }
 * }
 * 
 * Response Error (400/401):
 * {
 *   success: false,
 *   message: "Chi tiết lỗi",
 *   error: "ERROR_CODE"
 * }
 */
router.post("/verify-token", controller.verifyToken);

module.exports = router;
