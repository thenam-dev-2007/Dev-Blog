const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Post = require("../../models/post.model");

const fs = require("fs/promises"); // file system (tạo, đọc, ghi, xóa, đổi tên file, ...)
                                    // /promises: thêm phiên bản Promise của thư viện fs (để dùng async, await)
const path = require("path"); // dùng để xử lý đường dẫn file/thư mục.
const getProfileStats = require("../../services/profile.service");

// [GET] - Lấy thông tin profile của user hiện tại
module.exports.getMyProfile = async (req, res, next) => {
  try {
    // req.user đã được gắn bởi middleware authenticate
    const user = req.user;
    
    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
    await user.save();
    
    // Lấy thống kê bài viết
    const status = await Post.aggregate([ // lấy toàn bộ collection posts.
                              // aggregate() luôn trả về một mảng.
      {
        $match: { // $match: Lọc tất cả bài viết của user.
          author: new mongoose.Types.ObjectId(user._id),
        },
      },
      {
        $group: { // $group: Gom tất cả bài viết thành một nhóm.
          _id: null, // Nghĩa là: Gom toàn bộ document thành 1 nhóm duy nhất. => Chỉ có 1 document
          totalPosts: { $sum: 1 }, // Mỗi document + 1.
          totalLikes: { $sum: "$likes" }, // Tính tổng like
          totalComments: { // Tính tổng comments
            $sum: {
              $size: { // Lấy số phần tử trong mảng.
                $ifNull: ["$comments", []], // Nếu comments = null hoặc comments không tồn tại [] (tránh lỗi)
              },
            },
          },
        },
      },
    ]);

    const profileStatus = status[0] || { // Sau khi dùng $group để gom => chỉ còn 1 document => lấy phần tử đầu tiên
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
    };

    res.status(200).json({
      code: 200,
      message: "Lấy thông tin profile thành công",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,

        totalPosts: profileStatus.totalPosts,
        totalLikes: profileStatus.totalLikes,
        totalComments: profileStatus.totalComments,
      },
    });
  } 
  catch (error) {
    next(error)
  }
}

// [GET] - Lấy thông tin profile của user khác
module.exports.getOtherProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Kiểm tra user tồn tại
    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    // 2. Lấy thống kê bài viết
    const status = await Post.aggregate([ // lấy toàn bộ collection posts.
                              // aggregate() luôn trả về một mảng.
      {
        $match: { // $match: Lọc tất cả bài viết của user.
          author: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: { // $group: Gom tất cả bài viết thành một nhóm.
          _id: null, // Nghĩa là: Gom toàn bộ document thành 1 nhóm duy nhất. => Chỉ có 1 document
          totalPosts: { $sum: 1 }, // Mỗi document + 1.
          totalLikes: { $sum: "$likes" }, // Tính tổng like
          totalComments: { // Tính tổng comments
            $sum: {
              $size: { // Lấy số phần tử trong mảng.
                $ifNull: ["$comments", []], // Nếu comments = null hoặc comments không tồn tại [] (tránh lỗi)
              },
            },
          },
        },
      },
    ]);

    const profileStatus = status[0] || { // Sau khi dùng $group để gom => chỉ còn 1 document => lấy phần tử đầu tiên
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
    };

    // 3. Trả về profile
    res.status(200).json({
      code: 200,
      message: "Lấy thông tin profile thành công",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,

        totalPosts: profileStatus.totalPosts,
        totalLikes: profileStatus.totalLikes,
        totalComments: profileStatus.totalComments,
      },
    });
  } 
  catch (error) {
    next(error);
  }
};

// [PATCH] //
module.exports.updateUser = async (req, res, next) => {
  try {
    // Bước 1: Lấy ID từ URL params
    const userId = req.params.id;
    const currentUserId = req.user?._id.toString();

    // Bước 2: Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        code: 400,
        message: "ID không hợp lệ",
      });
    }

    // Bước 3: Kiểm tra quyền (chỉ có thể sửa profile của chính mình)
    if (currentUserId !== userId) {
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
    const { username, dateOfBirth } = req.body;

    // Bước 6: Update dữ liệu
    if (username) user.username = username;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    // Nếu có upload avatar
    if (req.file) {
      // Xóa avatar cũ (nếu có)
      if (user.avatar && !user.avatar.includes("default-avatar.png")) {
        try {
          const oldAvatarPath = path.join( // Tạo biến chứa đường dẫn vật lý tới avatar cũ.
            process.cwd(), // Trả về thư mục gốc của project hiện tại.
            user.avatar.replace(/^\//, "") // Regex: /^\//
                                          // ^   : đầu chuỗi
                                          // \/  : dấu /
            // ví dụ: "/upload/avatar/old-avatar.png" sẽ đổi thành upload/avatar/old-avatar.png
            // Nếu không bỏ dấu / sẽ có thể tạo đường dẫn không đúng trên một số hệ điều hành.
          );
          await fs.unlink(oldAvatarPath); // Xóa file avatar cũ.
        } 
        catch (err) {
          console.error(err.message);
        }
      }
      // Cập nhật avatar mới
      user.avatar = `/upload/avatar/${req.file.filename}`;
    }

    // Bước 7: Save user
    await user.save();

    // Bước 8: Response
    const userResponse = {
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
    };

    return res.status(200).json({
      code: 200,
      message: "Cập nhật dữ liệu thành công",
      data: userResponse,
    });
  } 
  catch (error) {
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
