const User = require("../../models/user.model");
const { generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../service/auth.service');

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

    // Bước 2: Tìm user theo username
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

/**
 * Controller: logout
 * 
 * [POST] /api/auth/logout
 * 
 * Mục đích: Đăng xuất người dùng
 * 
 * Lưu ý:
 * - JWT là stateless (không lưu trạng thái trên server)
 * - Server không cần làm gì cả
 * - Client sẽ tự xóa token từ localStorage/sessionStorage
 * - Route này yêu cầu authentication để đảm bảo chỉ user đã đăng nhập mới có thể logout
 * 
 * Quy trình:
 * 1. authenticateToken middleware xác thực token
 * 2. Trả về response thành công
 * 3. Client xóa token khỏi storage
 * 
 * Response (200):
 * {
 *   success: true,
 *   message: "Đăng xuất thành công"
 * }
 * 
 * Response Error:
 * - 401: Chưa đăng nhập (không có token)
 * (Xử lý bởi authenticateToken middleware)
 */
module.exports.logout = async (req, res, next) => {
  try {
    // JWT là stateless, nên server không cần làm gì
    // Chỉ cần phản hồi cho client
    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: refreshToken
 * 
 * [POST] /api/auth/refresh-token
 * 
 * Mục đích: Tạo token mới khi token hiện tại sắp hết hạn
 * 
 * Quy trình:
 * 1. Lấy refreshToken từ request body
 * 2. Xác thực refreshToken
 * 3. Nếu hợp lệ, tạo token mới
 * 4. Trả về token mới
 * 
 * Request:
 * {
 *   refreshToken: "eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Làm mới token thành công",
 *   data: {
 *     token: "eyJhbGciOiJIUzI1NiIs...",
 *     expiresIn: "24h"
 *   }
 * }
 * 
 * Response Error:
 * - 400: Thiếu refreshToken
 * - 401: RefreshToken không hợp lệ hoặc hết hạn
 * 
 * Lưu ý:
 * - Có thể cấu hình JWT_REFRESH_SECRET riêng hoặc dùng JWT_SECRET
 * - RefreshToken thường có thời gian sống dài hơn (30 ngày, 90 ngày)
 * - AccessToken (token thường) thường ngắn hơn (15 phút, 1 giờ)
 */
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
