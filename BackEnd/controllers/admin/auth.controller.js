/**
 * Controller: deleteAccount
 * 
 * [DELETE] /api/profile/:id
 * 
 * Mục đích: Xóa tài khoản (soft delete - đánh dấu là xóa, không xóa khỏi DB)
 * 
 * Yêu cầu:
 * - Phải xác thực bằng token JWT
 * - Chỉ có thể xóa account của chính mình hoặc admin
 * 
 * Lợi ích của soft delete:
 * - Giữ lại dữ liệu trong database để audit và phục hồi
 * - Không ảnh hưởng đến referential integrity
 * - Có thể khôi phục account sau này
 * 
 * Quy trình:
 * 1. Lấy user ID từ params
 * 2. Kiểm tra xem đó có phải user hiện tại không
 * 3. Kiểm tra user có tồn tại không
 * 4. Cập nhật isDeleted = true và deletedAt = hiện tại
 * 5. Trả về success message
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Tài khoản đã bị xóa thành công"
 * }
 * 
 * Response Error:
 * - 403: Không có quyền xóa account của user khác
 * - 404: User không tồn tại
 * - 400: User đã bị xóa trước đó
 */
module.exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();

    // Bước 1: Kiểm tra có phải xóa account của chính mình không
    if (currentUserId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa account của user khác",
        error: "PERMISSION_DENIED",
      });
    }

    // Bước 2: Tìm user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
        error: "USER_NOT_FOUND",
      });
    }

    // Bước 3: Kiểm tra user đã bị xóa trước đó chưa
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đã bị xóa trước đó",
        error: "ACCOUNT_ALREADY_DELETED",
      });
    }

    // Bước 4: Soft delete - đánh dấu là xóa
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Bước 5: Trả về success message
    res.status(200).json({
      success: true,
      message: "Tài khoản đã bị xóa thành công",
    });
  } catch (error) {
    next(error);
  }
};