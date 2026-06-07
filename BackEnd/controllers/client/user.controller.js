const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Post = require("../../models/post.model");

const fs = require("fs/promises"); // file system (tạo, đọc, ghi, xóa, đổi tên file, ...)
                                    // /promises: thêm phiên bản Promise của thư viện fs (để dùng async, await)
const path = require("path"); // dùng để xử lý đường dẫn file/thư mục.
const getProfileStatus = require("../../service/profile.service");

// [GET] - Lấy thông tin profile của user hiện tại
module.exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, profileStatus] = await Promise.all([
      User.findById(userId)
        .select("username email avatar dateOfBirth")
        .lean(),

      getProfileStatus(userId),
    ]);

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    return res.status(200).json({
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
  } catch (error) {
    next(error);
  }
};

// [GET] - Lấy thông tin profile của user khác
module.exports.getOtherProfile = async (req, res, next) => {
  try {
    const user = req.targetUser;

    const profileStatus = await getProfileStatus(user._id);

    return res.status(200).json({
        code: 200,
        message: "Lấy thông tin profile thành công",
        data: {
            id: user._id,
            username: user.username,
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
module.exports.updateMyProfile = async (req, res, next) => {
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