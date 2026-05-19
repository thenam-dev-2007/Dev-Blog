const User = require("../../models/user.model");

// [POST] /register - Tạo tài khoản mới
module.exports.register = async (req, res, next) => {
  try {
    // Lấy dữ liệu từ request body
    const { username, email, password, dateOfBirth } = req.body;

    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
      ],
    });

    if (existingUser) {
      // Nếu user bị xóa (inactive)
      if (existingUser.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản này đã bị xóa. Liên hệ support để khôi phục",
          error: "ACCOUNT_DELETED",
        });
      }

      // Nếu user đang active
      const duplicateField = 
        existingUser.username === username.toLowerCase() ? "username" : "email";
      
      return res.status(409).json({
        success: false,
        message: `${duplicateField === "username" ? "Username" : "Email"} đã được sử dụng`,
        error: "DUPLICATE_USER",
        duplicateField: duplicateField,
      });
    }

    // Tạo user mới
    const newUser = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // Sẽ được mã hóa tự động bởi pre-save middleware
      dateOfBirth: dateOfBirth || null,
      role: "user",
      isDeleted: false,
      deletedAt: null,
    });

    // Không trả về password
    newUser.password = undefined;

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          avatar: newUser.avatar,
          dateOfBirth: newUser.dateOfBirth,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


// [POST] /register/check-username - Kiểm tra username có sẵn không
module.exports.checkUsername = async (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Username là bắt buộc",
                error: "USERNAME_REQUIRED",
            });
        }

        if (username.length < 3 || username.length > 30) { 
            return res.status(400).json({
                success: false,
                message: "Username phải từ 3 đến 30 ký tự",
                error: "USERNAME_INVALID_LENGTH",
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username chỉ được chứa chữ cái, số và dấu gạch dưới",
                error: "USERNAME_INVALID_CHARACTERS",
            });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase(), isDeleted: false });
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username đã được sử dụng",
                error: "USERNAME_TAKEN",
            });
        }

        res.status(200).json({
            success: true,
            message: "Username có sẵn",
            available: true,
        });
    } catch (error){
        next(error);
    }
};


// [POST] /register/check-email - Kiểm tra email có sẵn không
module.exports.checkEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email là bắt buộc",
                error: "EMAIL_REQUIRED",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ",
                error: "EMAIL_INVALID",
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase(),
            isDeleted: false,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email đã được sử dụng",
                error: "EMAIL_TAKEN",
                available: false,
            });
        }

        res.status(200).json({
            success: true,
            message: "Email có sẵn",
            available: true,
        });
    } catch (error) {
        next(error);
    }
};


// [GET] /register/inactive - Lấy danh sách user không active (bị xóa)
module.exports.getInactiveUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 , search = ''} = req.query;
        const skip = (page -1 ) *limit;

        const query = { isDeleted: true};

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const inactiveUsers = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ deletedAt: -1 });

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách user không active thành công",
            data: {
                users: inactiveUsers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};


// [POST] /register/:id/restore - Khôi phục tài khoản bị xóa
module.exports.restoreAccount = async (req, res, next) => {
    try {
        const userId = req.params.id;

        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "ID không hợp lệ",
                error: "INVALID_USER_ID",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User không tồn tại",
                error: "USER_NOT_FOUND",
            });
        }

        if (!user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User đang active, không thể khôi phục",
                error: "USER_NOT_INACTIVE",
            });
        }

        user.isDeleted = false;
        user.deletedAt = null;
        await user.save();

        user.password = undefined;

        res.status(200).json({
            success: true,
            message: "Khôi phục tài khoản thành công",
            data: {
                user: user,
            },
        });
    } catch (error) {
        next(error);
    }
};