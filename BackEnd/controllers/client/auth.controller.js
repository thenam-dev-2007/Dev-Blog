const crypto = require("crypto");
const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model");
const { generateAccessToken, generateRefreshToken, refreshAccessToken, revokeToken } = require("../../service/token.service");
const { generateEmailOTP, generateOTPAndSave, sendOTPEmail } = require("../../service/email.service");
const { transporter } = require("../../config/email");

module.exports.register = async (req, res, next) => {
  try {
    // Lấy dữ liệu từ request body
    const { fullname, email, password, dateOfBirth } = req.body;

    // Tạo otp xác nhận
    const { otp, hashedOTP, expiresAt } = generateEmailOTP();

    // Tạo user mới trong database
    const newUser = await User.create({
      fullname: fullname,
      email: email.toLowerCase(),
      password: password, // Sẽ được mã hóa tự động bởi pre-save middleware
      dateOfBirth: dateOfBirth,
      role: "user", // Mặc định là 'user'
      emailOTP: hashedOTP,
      emailOTPExpires: expiresAt,
    });

    await sendOTPEmail(newUser.email, otp);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.",
      data: {
        email: newUser.email,
      },
    });
  } catch (error) {
    // Chuyển lỗi cho error handler middleware
    next(error);
  }
};

module.exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+emailOTP",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã được xác thực",
      });
    }

    if (!user.emailOTP || user.emailOTP !== hashedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP không chính xác",
      });
    }

    if (user.emailOTPExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP đã hết hạn",
      });
    }

    // Kích hoạt tài khoản
    user.isVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    const refreshToken = await generateRefreshToken(user);
    const accessToken = generateAccessToken(user);

    res.cookie("refreshToken", refreshToken.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Xác thực email thành công",
      data: {
        user: {
          _id: user._id,
          fullname: user.fullname,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          avatar: user.avatar,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.resendRegisterOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã xác thực",
      });
    }

    if (user.otpResendAt && Date.now() - user.otpResendAt < 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: "Vui lòng thử lại sau 1 phút",
      });
    }

    const otp = await generateOTPAndSave(user, "emailOTP", "emailOTPExpires");

    await sendOTPEmail(user.email, otp, "verify");

    res.status(200).json({
      success: true,
      message: "OTP mới đã được gửi",
    });
  } catch (error) {
    next(error);
  }
};

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

    // Bước 4: Kiểm tra user đã xác nhận email chưa
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Vui lòng xác thực email trước khi đăng nhập",
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
    res.cookie("refreshToken", refreshToken.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
          fullname: user.fullname,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          avatar: user.avatar,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    // Chuyển cho error handler middleware
    next(error);
  }
};

module.exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await RefreshToken.deleteOne({
        token: refreshToken,
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    await revokeToken(req.user._id, res);
    
    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
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
        message: "Refresh token không được cung cấp",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(403).json({
        success: false,
        message: "Refresh token không hợp lệ hoặc đã hết hạn",
      });
    }

    // Cập nhật cookie với refresh token mới
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Access token đã được làm mới",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const { currentPassword, newPassword } = req.body;

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    user.password = newPassword;
    await user.save();

    await revokeToken(user._id, res);

    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports.changeEmail = async (req, res, next) => {
  try {
    const user = req.user;

    const { newEmail } = req.body;

    user.email = newEmail.toLowerCase();
    await user.save();

    await revokeToken(user._id, res);

    res.status(200).json({
      success: true,
      message: "Đổi email thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với email này.",
      });
    }

    const { otp, hashedOTP, expiresAt } = generateEmailOTP();

    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = expiresAt;
    user.resetPasswordVerified = false;

    await user.save({ validateBeforeSave: false });
    // validateBeforeSave: false dùng để bỏ qua toàn bộ validation của Mongoose khi gọi save().
    // Nếu dùng await user.save(); --> Mongoose sẽ kiểm tra lại tất cả validation trước khi lưu. (không bỏ qua middleware)
    // Chỉ đang cập nhật (resetPasswordOTP, resetPasswordOTPExpires), không đụng tới (fullname, password, email)
    // --> nên việc chạy lại toàn bộ validation là không cần thiết.

    await sendOTPEmail({
      email: user.email,
      otp,
      type: "reset-password",
    });

    res.status(200).json({
      success: true,
      message: "OTP đã được gửi",
    });
  } catch (error) {
    next(error);
  }
};

module.exports.verifyResetPasswordOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordOTP",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    if (user.resetPasswordOTP !== hashedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP không chính xác",
      });
    }

    if (user.resetPasswordOTPExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP đã hết hạn",
      });
    }

    user.resetPasswordVerified = true;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "OTP hợp lệ",
    });
  } catch (error) {
    next(error);
  }
};

module.exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy toàn khoản",
      });
    }

    if (!user.resetPasswordVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP chưa được xác thực",
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    user.resetPasswordVerified = false;
    await user.save(); // Middleware pre('save') sẽ tự động băm mật khẩu

    await revokeToken(user._id, res); // Đăng xuất khỏi tất cả các thiết bị

    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    next(err);
  }
};

module.exports.resendResetPasswordOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    if (user.otpResendAt && Date.now() - user.otpResendAt < 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: "Vui lòng thử lại sau 1 phút",
      });
    }

    const otp = await generateOTPAndSave(
      user,
      "resetPasswordOTP",
      "resetPasswordOTPExpires",
    );
    user.resetPasswordVerified = false;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail({
      email: user.email,
      otp,
      type: "reset-password",
    });

    res.status(200).json({
      success: true,
      message: "OTP mới đã được gửi",
    });
  } catch (error) {
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
