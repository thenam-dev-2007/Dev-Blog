const User = require("../../models/user.model");
const Post = require("../../models/post.model");

// [GET] - Lấy thông tin profile của user (kèm số bài viết)
module.exports.getProfileInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    const postCount = await Post.countDocuments({ author: id });

    const userProfile = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      postCount,
      createdAt: user.createdAt,
    };

    res.json({
      code: 200,
      message: "Lấy thông tin profile thành công",
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] //
module.exports.updateUser = async (req, res, next) => {
  try {
    // Bước 1: Lấy ID từ URL params
    const userId = req.params.id;
    const currentUserId = req.user?._id.toString();

    // Bước 2: Kiểm tra xem id có được cung cấp không;
    if (!userId) {
      return res.status(400).json({
        code: 400,
        message: "User ID is required",
      });
    }

    // Kiểm tra quyền (chỉ có thể sửa profile của chính mình hoặc là admin)
    if (currentUserId !== userId && req.user?.role !== "admin") {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền sửa profile này",
      });
    }

    // Bước 3: Gọi model để tìm user
    const user = await User.findById(userId);

    // Bước 4: Kiểm tra xem user có tồn tại không
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: `User with ID ${userId} not found`,
      });
    }

    // Bước 5: Lấy dữ liệu từ body request
    const { username, password, email, dateOfBirth } = req.body;

    // Bước 6: Update dữ liệu
    if (username) user.username = username;
    if (email) user.email = email.toLowerCase();
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    // Nếu có password mới, pre('save') middleware sẽ tự hash
    if (password) {
      user.password = password;
    }

    // Nếu có upload avatar
    if (req.file) {
      user.avatar = `/upload/avatar/${req.file.filename}`;
    }

    // Bước 7: Save user
    await user.save();

    // Không trả password về client
    const userResponse = user.toObject();
    delete userResponse.password;

    // Bước 8: Response
    return res.status(200).json({
      code: 200,
      message: "Cập nhật dữ liệu thành công",
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// [GET] - Lấy tất cả bài viết của user
module.exports.getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    const Post = require("../../models/post.model.js");
    const posts = await Post.find({ author: id })
      .populate("author", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({ author: id });

    res.json({
      code: 200,
      message: "Lấy bài viết của user thành công",
      data: {
        user: {
          id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: getUserStats
 * 
 * [GET] /api/profile/:id/stats
 * 
 * Mục đích: Lấy thống kê của user (tổng bài viết, likes, comments)
 * 
 * Quy trình:
 * 1. Lấy user ID từ params
 * 2. Kiểm tra user có tồn tại
 * 3. Đếm tổng bài viết của user
 * 4. Tính tổng lượt like trên tất cả bài viết
 * 5. Đếm tổng comments trên tất cả bài viết
 * 6. Trả về thống kê
 * 
 * Response Success:
 * {
 *   success: true,
 *   data: {
 *     userId: string,
 *     username: string,
 *     totalPosts: number,
 *     totalLikes: number,
 *     totalComments: number,
 *     joinDate: ISO date string
 *   }
 * }
 */
module.exports.getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Bước 1: Kiểm tra user tồn tại
    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
        error: "USER_NOT_FOUND",
      });
    }

    // Bước 2: Đếm tổng bài viết
    const totalPosts = await Post.countDocuments({ author: id });

    // Bước 3: Tính tổng likes trên tất cả bài viết
    // aggregate dùng để thực hiện các phép toán phức tạp trên dữ liệu
    const likesAggregation = await Post.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, totalLikes: { $sum: "$likes" } } },
    ]);
    const totalLikes = likesAggregation[0]?.totalLikes || 0;

    // Bước 4: Đếm tổng comments trên tất cả bài viết
    const commentsAggregation = await Post.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, totalComments: { $sum: { $size: "$comments" } } } },
    ]);
    const totalComments = commentsAggregation[0]?.totalComments || 0;

    // Bước 5: Trả về thống kê
    res.status(200).json({
      success: true,
      message: "Lấy thống kê thành công",
      data: {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        totalPosts,
        totalLikes,
        totalComments,
        joinDate: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: changePassword
 * 
 * [POST] /api/profile/:id/change-password
 * 
 * Mục đích: Thay đổi mật khẩu người dùng
 * 
 * Yêu cầu:
 * - Phải xác thực bằng token JWT
 * - Chỉ có thể đổi password của chính mình
 * - Phải cung cấp mật khẩu hiện tại (xác minh)
 * 
 * Quy trình:
 * 1. Lấy user ID từ params
 * 2. Kiểm tra xem đó có phải user hiện tại không (từ req.user)
 * 3. Lấy currentPassword, newPassword từ request
 * 4. Lấy user từ database
 * 5. So sánh currentPassword với password trong DB
 * 6. Nếu sai, trả về lỗi 401
 * 7. Nếu đúng, cập nhật password mới
 * 8. Trả về success message
 * 
 * Request:
 * {
 *   currentPassword: "OldPassword123!",
 *   newPassword: "NewPassword456!",
 *   confirmPassword: "NewPassword456!"
 * }
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Đổi mật khẩu thành công"
 * }
 * 
 * Response Error:
 * - 400: Mật khẩu hiện tại không chính xác
 * - 401: Không có quyền đổi mật khẩu của user khác
 * - 404: User không tồn tại
 */
module.exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();

    // Bước 1: Kiểm tra có phải đổi password của chính mình không
    if (currentUserId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền đổi mật khẩu của user khác",
        error: "PERMISSION_DENIED",
      });
    }

    // Bước 2: Lấy user từ database (cần select password)
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
        error: "USER_NOT_FOUND",
      });
    }

    // Bước 3: Lấy passwords từ request
    const { currentPassword, newPassword } = req.body;

    // Bước 4: So sánh currentPassword với password trong DB
    // comparePassword là method của model User
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
        error: "INVALID_CURRENT_PASSWORD",
      });
    }

    // Bước 5: Cập nhật password mới
    // Pre-save middleware sẽ tự hash password
    user.password = newPassword;
    await user.save();

    // Bước 6: Trả về success message
    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    next(error);
  }
};

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
