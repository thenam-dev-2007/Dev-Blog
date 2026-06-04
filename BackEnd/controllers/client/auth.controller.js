const User = require("../../models/user.model");
const generateToken = require("../../service/auth.service")

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

    const token = generateToken(newUser);

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
        },
        token
      }
    });
  } catch (error) {
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

    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
    await user.save();

    // Bước 6: Tạo JWT token
    const token = generateToken(user);

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
        token
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
    // Bước 1: Lấy refreshToken từ request body
    const { refreshToken } = req.body;

    // Bước 2: Kiểm tra refreshToken có được cung cấp không
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token là bắt buộc",
        error: "MISSING_REFRESH_TOKEN",
      });
    }

    // Bước 3: Xác thực refreshToken
    // Có thể dùng JWT_REFRESH_SECRET riêng hoặc JWT_SECRET chung
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      (err, user) => {
        // Bước 4: Kiểm tra refreshToken có hợp lệ không
        if (err) {
          return res.status(401).json({
            success: false,
            message: "Refresh token không hợp lệ hoặc đã hết hạn",
            error: "INVALID_REFRESH_TOKEN",
          });
        }

        // Bước 5: Tạo token mới dùng user info từ refreshToken
        const newToken = generateToken(user);

        // Bước 6: Trả về token mới
        res.status(200).json({
          success: true,
          message: "Làm mới token thành công",
          data: {
            token: newToken,
            expiresIn: process.env.JWT_EXPIRES_IN || "24h",
          },
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: verifyToken
 * 
 * [POST] /api/auth/verify-token
 * 
 * Mục đích: Kiểm tra tính hợp lệ của token
 * 
 * Cách sử dụng:
 * - Có thể gửi token qua 2 cách: request body hoặc header Authorization
 * 
 * Quy trình:
 * 1. Lấy token từ body hoặc header
 * 2. Xác thực token
 * 3. Nếu hợp lệ, trả về user info
 * 4. Nếu không hợp lệ, trả về lỗi
 * 
 * Request Option 1 (Body):
 * {
 *   token: "eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Request Option 2 (Header):
 * Header: Authorization: Bearer <token>
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Token hợp lệ",
 *   data: {
 *     _id: "507f1f77bcf86cd799439011",
 *     username: "john_doe",
 *     email: "john@example.com",
 *     role: "user",
 *     iat: 1642680600,  // Issued at (timestamp)
 *     exp: 1642767000   // Expiration (timestamp)
 *   }
 * }
 * 
 * Response Error:
 * - 400: Thiếu token
 * - 401: Token không hợp lệ hoặc hết hạn
 */
module.exports.verifyToken = async (req, res, next) => {
  try {
    // Bước 1: Lấy token từ request
    // Ưu tiên lấy từ body, nếu không có thì lấy từ header Authorization
    const token =
      req.body.token || // Option 1: Từ request body
      req.headers["authorization"]?.split(" ")[1]; // Option 2: Từ header "Authorization: Bearer <token>"
    // ?. là optional chaining (nếu headers["authorization"] undefined, trả về undefined thay vì lỗi)

    // Bước 2: Kiểm tra token có được cung cấp không
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token là bắt buộc",
        error: "MISSING_TOKEN",
      });
    }

    // Bước 3: Xác thực token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      // Bước 4: Kiểm tra token có hợp lệ không
      if (err) {
        return res.status(401).json({
          success: false,
          message: "Token không hợp lệ hoặc hết hạn",
          error: "INVALID_TOKEN",
        });
      }

      // Bước 5: Token hợp lệ, trả về user info
      // user = { _id, username, email, role, iat, exp }
      res.status(200).json({
        success: true,
        message: "Token hợp lệ",
        data: user,
      });
    });
  } catch (error) {
    next(error);
  }
};