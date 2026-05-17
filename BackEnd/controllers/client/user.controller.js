const User = require("../../models/user.model");
const Post = require("../../models/post.model");

// [GET] //
module.exports.getUserById = async (req, res, next) => {
  try {
    // Bước 1: Lấy ID từ params của request
    const userId = req.params.id;

    // Bước 2: Kiểm tra xem id có được cung cấp không;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Bước 3: Gọi model để tìm user
    const user = await User.findById(userId);

    // Bước 4: Kiểm tra xem user có tồn tại không
    if (!user) {
      // Nếu không, trả về lỗi 404 Not Found
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`,
      });
    }

    // Bước 5: Trả về thông tin user
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    // Nếu có lỗi không mong muốn, chuyển cho error handler
    next(error);
  }
};

// [POST] //
module.exports.createUser = async (req, res, next) => {
  try {
    // Lấy dữ liệu từ request body
    const { username, email, password, dateOfBirth, role } = req.body;

    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await User.findOne({
      // $or là toán tử của MongoDB dùng để kiểm tra: Chỉ cần một điều kiện đúng là document sẽ được tìm thấy.
      $or: [
        { username: username.toLowerCase() }, // Chuyển username thành chữ thường
        { email: email.toLowerCase() },
      ],
    });

    if (existingUser) {
      // Nếu đã tồn tại, trả về lỗi 409 (Conflict)
      return res.status(409).json({
        success: false,
        message: "Username hoặc email đã được sử dụng",
        error: "DUPLICATE_USER",
      });
    }

    // Tạo user mới trong database
    const newUser = await User.create({
      username: username.toLowerCase(), // Chuẩn hóa username
      email: email.toLowerCase(),
      password, // Sẽ được mã hóa tự động bởi pre-save middleware
      dateOfBirth,
      role: role || "user", // Mặc định là 'user' nếu không cung cấp
    });

    // Không trả về password trong response (mặc dù select: false đã làm điều này)
    // Nhưng vẫn cần chắc chắn
    newUser.password = undefined;

    // Trả về response thành công với status 201 (Created)
    res.status(201).json({
      success: true,
      message: "Tạo user thành công",
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          dateOfBirth: newUser.dateOfBirth,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    // Chuyển lỗi cho error handler middleware
    next(error);
  }
};

// [PUT] //
module.exports.updateUser = async (req, res, next) => {
  try {
    // Bước 1: Lấy ID từ URL params
    const userId = req.params.id;
    const currentUserId = req.user?.id;

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

// [DELETE] - Xóa tài khoản
module.exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        code: 400,
        message: "User ID is required",
      });
    }

    // Kiểm tra quyền
    if (currentUserId !== userId && req.user?.role !== "admin") {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xóa account này",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    // Xóa tất cả posts của user
    const Post = require("../../models/post.model.js");
    await Post.deleteMany({ author: userId });

    // Xóa user
    await User.findByIdAndDelete(userId);

    res.json({
      code: 200,
      message: "Xóa tài khoản thành công",
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
