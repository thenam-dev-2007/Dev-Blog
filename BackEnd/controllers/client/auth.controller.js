const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model")
const { generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../service/token.service');
const { revokeToken } = require("../../helper/revokeToken");
const { generateEmailOTP } = require("../../service/email.service");
const { transporter } = require("../../config/email")

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

    // Tạo otp xác nhận
    const { otp, hashedOTP, expiresAt } = generateEmailOTP();

    // Tạo user mới trong database
    const newUser = await User.create({
      username: username.toLowerCase(), // Chuẩn hóa username
      email: email.toLowerCase(),
      password: password, // Sẽ được mã hóa tự động bởi pre-save middleware
      dateOfBirth: dateOfBirth,
      role: "user", // Mặc định là 'user' 
      emailOTP: hashedOTP,
      emailOTPExpires: expiresAt
    });

    await sendOTPEmail(newUser.email, otp);

    res.status(201).json({ 
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.',
      data: {
        email: newUser.email
      }
    });
  } 
  catch (error) {
    // Chuyển lỗi cho error handler middleware
    next(error);
  }
} 

module.exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = await User.findOne({email: email.toLowerCase()}).select("+emailOTP");

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy tài khoản' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản đã được xác thực"
      });
    }

    if (!user.emailOTP || user.emailOTP !== hashedOTP) {
      return res.status(400).json({
        success:false,
        message: "OTP không chính xác"
      })
    }

    if (user.emailOTPExpires < Date.now()) {
      return res.status(400).json({
        success:false,
        message: "OTP đã hết hạn"
      })
    }

    // Kích hoạt tài khoản
    user.isVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    const refreshToken = await generateRefreshToken(user);
    const accessToken = generateAccessToken(user);

    res.cookie("refreshToken", refreshToken.token,{
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000
        }
    );

    return res.status(200).json({
      success: true,
      message: "Xác thực email thành công",
      data: {
        accessToken
      }
    })

  } 
  catch (error) {
    next(error)
  }
};

module.exports.resendOTP = async (req, res, next) => {
  try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy tài khoản"
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
            success: false,
            message: "Tài khoản đã xác thực"
        });
      }

      if (user.otpResendAt && Date.now() - user.otpResendAt < 60 * 1000) {
        return res.status(429).json({
            success: false,
            message: "Vui lòng thử lại sau 1 phút"
        });
      }

      const { otp, hashedOTP } = generateEmailOTP()

      user.emailOTP = hashedOTP;
      user.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.otpResendAt = new Date();
      await user.save();

      await sendOTPEmail(user.email, otp);

      return res.status(200).json({
          success: true,
          message:
              "OTP mới đã được gửi"
      });

    } 
    catch (error) {
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

    // Bước 4: Kiểm tra user đã xác nhận email chưa
    if (!user.isVerified) {
      return res.status(403).json({
          success: false,
          message:
              "Vui lòng xác thực email trước khi đăng nhập"
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

module.exports.forgotPassword = async (req, res, next) => {
  try {
    // 1. Lấy email từ request body
    const { email } = req.body;
    
    // 2. Kiểm tra email có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy người dùng với email này.'
      });
    }
    
    // 3. Tạo reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Lưu mà không chạy validation
    
    // 4. Tạo URL reset (trong thực tế, đây là URL frontend)
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${resetToken}`;
    
    // 5. Gửi email
    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. 
                    Vui lòng click vào link sau để đặt lại mật khẩu: \n\n ${resetURL} \n\n
                    Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Yêu cầu đặt lại mật khẩu (hiệu lực trong 10 phút)',
        message
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Token đã được gửi đến email của bạn.'
      });
    } 
    catch (err) {
      // Nếu gửi email thất bại, xóa token khỏi database
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        status: 'error',
        message: 'Không thể gửi email. Vui lòng thử lại sau.'
      });
    }
  } 
  catch (error) {
    next(error)
  }
}

module.exports.resetPassword = async (req, res, next) => {
  try {
    // 1. Lấy token từ params và băm nó
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // 2. Tìm user có token khớp và chưa hết hạn
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() } // Token chưa hết hạn
    });
    
    // 3. Nếu không tìm thấy user hoặc token đã hết hạn
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token không hợp lệ hoặc đã hết hạn.'
      });
    }
    
    // 4. Cập nhật mật khẩu mới
    user.password = req.body.password;
    user.resetPasswordToken = undefined; // Xóa token
    user.resetPasswordExpires = undefined; // Xóa thời gian hết hạn
    await user.save(); // Middleware pre('save') sẽ tự động băm mật khẩu
    
    // 5. Tạo JWT mới và gửi về client
    const token = generateAccessToken(user._id); 
    
    res.status(200).json({
      status: 'success',
      token,
      message: 'Mật khẩu đã được đặt lại thành công.'
    });
  } catch (err) {
    console.error('Lỗi resetPassword:', err);
    res.status(500).json({
      status: 'error',
      message: 'Đã xảy ra lỗi server.'
    });
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
