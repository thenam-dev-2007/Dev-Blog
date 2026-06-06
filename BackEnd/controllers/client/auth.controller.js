const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model")
const { generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../service/token.service');
const { revokeToken } = require("../../helper/revokeToken")

module.exports.register = async (req, res, next) => {
  try {
    // Lấy dữ liệu từ request body
    const { username, email, password, dateOfBirth} = req.body;

    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await User.findOne({
      // $or là toán tử của MongoDB dùng để kiểm tra: Chỉ cần một điều kiện đúng là document sẽ được tìm thấy.
      $or: [
        { username: username.toLowerCase() }, 
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
      password: password, // Sẽ được mã hóa tự động bởi pre-save middleware
      dateOfBirth: dateOfBirth,
      role: "user", // Mặc định là 'user' 
    });

    // Tạo token
    const accessToken = generateAccessToken(newUser);
    const refreshToken = await generateRefreshToken(newUser);

    // Lưu refresh token vào httpOnly cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true, // Chỉ server mới đọc được
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });

    // Trả về response thành công với status 201 (Created)
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          dateOfBirth: newUser.dateOfBirth,
          role: newUser.role,
        },
        accessToken
      }
    });
  } 
  catch (error) {
    // Chuyển lỗi cho error handler middleware
    next(error);
  }
} 

// Quy trình:
//  1. Lấy email và password từ request body
//  2. Kiểm tra email và password có được cung cấp
//  3. Tìm user trong database theo email (case-insensitive)
//  4. Kiểm tra user có tồn tại không
//  5. Kiểm tra user có bị xóa không (soft delete)
//  6. So sánh password dùng bcrypt
//  7. Nếu tất cả ok, tạo JWT token
//  8. Trả về token + user info
module.exports.login = async (req, res, next) => {
  try {
    // Bước 1: Lấy dữ liệu từ request body
    const { email, password } = req.body;

    // Bước 2: Tìm user theo email
    // .select("+password"): Lấy password (vì model đã set select: false cho field password)
    const user = await User.findOne({
      email: email.toLowerCase(), 
    }).select("+password"); // Thêm password vào kết quả query

    // Bước 3: Kiểm tra user có tồn tại không
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Bước 4: Kiểm tra user có bị xóa không (soft delete)
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản này đã bị xóa",
      });
    }

    // Bước 5: So sánh password
    // comparePassword là instance method được định nghĩa trong User model
    // Nó dùng bcrypt.compare để so sánh password nhập vào với password hash trong DB
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Bước 6: Tạo JWT token
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    // Lưu refresh token vào cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
    await user.save();

    // Bước 7: Trả về response thành công
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          avatar: user.avatar,
          role: user.role,
        },
        accessToken
      }
    });
  } 
  catch (error) {
    // Chuyển cho error handler middleware
    next(error);
  }
};

module.exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        await RefreshToken.deleteOne({
            token: refreshToken
        });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict"
    });

    return res.status(200).json({
        success: true,
        message: "Đăng xuất thành công"
    });

  } 
  catch (error) {
    next(error);
  }
};

// Quy trình:
//  1. Lấy refreshToken từ request cookies
//  2. Xác thực refreshToken
//  3. Nếu hợp lệ, tạo token mới
//  4. Trả về token mới
module.exports.refreshToken = async (req, res, next) => {
  try {
    // Lấy refresh token từ cookie hoặc body
    const refreshToken = req.cookies.refreshToken; // httpOnly: true --> nhận từ cookies
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token không được cung cấp' 
      });
    }
    
    const result = await refreshAccessToken(refreshToken);
    
    if (!result) {
      return res.status(403).json({ 
        success: false, 
        message: 'Refresh token không hợp lệ hoặc đã hết hạn' 
      });
    }
    
    // Cập nhật cookie với refresh token mới
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: 'Access token đã được làm mới',
      data: {
        accessToken: result.accessToken
      }
    });
    
  }
  catch (error) {
    next(error);
  }
};

module.exports.changePassword = async (req, res, next) => {
  try {
      const user = await User.findById(req.user._id).select(+password);

      const { currentPassword, newPassword } = req.body;

      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
          return res.status(400).json({
              success: false,
              message: "Mật khẩu hiện tại không đúng"
          });
      }

      user.password = newPassword;
      await user.save();

      // Đăng xuất toàn bộ thiết bị
      await revokeToken(user._id, res);

      return res.status(200).json({
          success: true,
          message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
      });
    } 
    catch (error) {
      next(error);
  }
};

module.exports.changeEmail = async (req, res, next) => {
  try {
      const user = req.user;

      const { newEmail } = req.body;

      user.email = newEmail.toLowerCase();
      await user.save();

      // Đăng xuất toàn bộ thiết bị
      await revokeToken(user._id, res);

      return res.status(200).json({
          success: true,
          message: "Đổi email thành công. Vui lòng đăng nhập lại."
      });
    } 
    catch (error) {
      next(error);
  }
};

// res.cookie(name, value, options);
  // 1. name: Tên cookie
  // 2. value: Giá trị của cookie
  // 3. options: Là object cấu hình cookie.
      // httpOnly: true --> Cookie không thể đọc bằng JavaScript.
      // secure: true --> Chỉ gửi cookie qua HTTPS.
      // sameSite: "strict" --> Chỉ gửi cookie khi request xuất phát từ cùng website. 
      // --> Kiểm soát việc gửi cookie giữa các website.
      // sameSite: "lax" --> Mặc định của nhiều browser.
      // maxAge: Thời gian sống cookie (ms).
      // expires: Đặt ngày hết hạn cụ thể.
