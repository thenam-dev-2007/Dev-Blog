const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Post = require("../../models/post.model");

const fs = require("fs/promises"); // file system (tạo, đọc, ghi, xóa, đổi tên file, ...)
// /promises: thêm phiên bản Promise của thư viện fs (để dùng async, await)
const path = require("path"); // dùng để xử lý đường dẫn file/thư mục.
const getProfileStatus = require("../../service/profile.service");
const paginationHelper = require("../../helper/pagination");

// [GET] - Lấy thông tin profile của user hiện tại
module.exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, profileStatus] = await Promise.all([
      User.findById(userId).select("fullname email avatar dateOfBirth").lean(),
      getProfileStatus(userId),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin profile thành công",
      data: {
        _id: user._id,
        fullname: user.fullname,
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

// [GET] - Lấy thông tin profile của user khác
module.exports.getOtherProfile = async (req, res, next) => {
  try {
    const user = req.targetUser;

    const profileStatus = await getProfileStatus(user._id);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin profile thành công",
      data: {
        _id: user._id,
        fullname: user.fullname,
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

// [PATCH] //
module.exports.updateMyProfile = async (req, res, next) => {
  const cleanUpNewFile = async () => {
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error("Không thể xóa file mới khi rollback:", err.message);
      }
    }
  };

  try {
    // Lấy Id từ token
    const userId = req.user._id;

    // Tìm user
    const user = await User.findById(userId);

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`,
      });
    }

    // Lấy dữ liệu từ body request
    const { fullname, dateOfBirth } = req.body;

    // Update dữ liệu
    if (fullname !== undefined) user.fullname = fullname;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

    // Lưu avatar cũ để xóa sau khi save thành công
    let oldAvatarPath = null;
    // Nếu có upload avatar
    if (req.file) {
      // Xóa avatar cũ (nếu có)
      if (user.avatar && !user.avatar.includes("default-avatar.png")) {
        oldAvatarPath = path.join(
          // Tạo biến chứa đường dẫn vật lý tới avatar cũ.
          process.cwd(), // Trả về thư mục gốc của project hiện tại.
          user.avatar.replace(/^\/+/, ""), // Regex: /^\//
          // ^   : đầu chuỗi
          // \/+  : loại bỏ nhiều dấu / (nếu có)
          // ví dụ: "/upload/avatar/old-avatar.png" sẽ đổi thành upload/avatar/old-avatar.png
          // Nếu không bỏ dấu / sẽ có thể tạo đường dẫn không đúng trên một số hệ điều hành.
        );
      }
      // Cập nhật avatar mới
      user.avatar = `/upload/avatar/${req.file.filename}`;

      // Save user
      await user.save();

      if (oldAvatarPath) {
        try {
          await fs.unlink(oldAvatarPath); // Xóa file avatar cũ.
        } catch (err) {
          console.error(err.message);
        }
      }
    }

    // Response
    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
    };

    res.status(200).json({
      success: true,
      message: "Cập nhật dữ liệu thành công",
      data: userResponse,
    });
  } 
  catch (error) {
    await cleanUpNewFile();
    next(error);
  }
};

// [GET] - Lấy tất cả bài viết (me)
module.exports.getMyPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const countPosts = await Post.countDocuments({
      author: userId,
      isDeleted: false,
    });

    let objectPagination = paginationHelper(
      {
        currentPage: 1,
        limitPost: 9,
      },
      req.query,
      countPosts,
    );

    const posts = await Post.find({ author: userId, isDeleted: false })
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar")
      .sort({ createdAt: -1 })
      .skip(objectPagination.skip)
      .limit(objectPagination.limitPost)
      .lean();

    res.status(200).json({
      success: true,
      message: "Lấy bài viết của user thành công",
      data: posts,
      pagination: objectPagination,
    });
  } 
  catch (error) {
    next(error);
  }
};

// [GET] - Lấy tất cả bài viết (others)
module.exports.getOthersPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = id;

    const countPosts = await Post.countDocuments({
      author: userId,
      isDeleted: false,
    });

    let objectPagination = paginationHelper(
      {
        currentPage: 1,
        limitPost: 9,
      },
      req.query,
      countPosts,
    );

    const posts = await Post.find({ author: userId, isDeleted: false })
      .populate("author", "fullname email avatar")
      .populate("comments.user", "fullname avatar")
      .sort({ createdAt: -1 })
      .skip(objectPagination.skip)
      .limit(objectPagination.limitPost)
      .lean();

    res.status(200).json({
      success: true,
      message: "Lấy bài viết của user thành công",
      data: {
        user: {
          id: user._id,
          fullname: user.fullname,
          avatar: user.avatar,
        },
        posts,
        pagination: objectPagination,
      },
    });
  } 
  catch (error) {
    next(error);
  }
};
