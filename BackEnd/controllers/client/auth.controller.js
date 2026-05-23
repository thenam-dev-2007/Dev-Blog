const User = require("../../models/user.model.js");
const jwt = require("jsonwebtoken");

/**
 * Hàm tiện ích: generateToken
 * 
 * Mục đích: Tạo JWT token cho user
 * 
 * @param {Object} user - Đối tượng user từ database
 *   - user._id: MongoDB object ID
 *   - user.username: Tên đăng nhập
 *   - user.email: Email người dùng
 *   - user.role: Vai trò (user hoặc admin)
 * 
 * @returns {String} JWT token đã mã hóa
 * 
 * Cấu trúc JWT token:
 * - Header: { "alg": "HS256", "typ": "JWT" }
 * - Payload: { _id, username, email, role, iat, exp }
 * - Signature: Mã hóa bằng JWT_SECRET
 * 
 * Thời gian hết hạn:
 * - Mặc định 24 giờ (từ JWT_EXPIRES_IN environment variable)
 * - Có thể cấu hình trong .env
 */
const generateToken = (user) => {
  return jwt.sign(
    // Payload (dữ liệu được lưu trong token)
    {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    // Secret (khóa bí mật để mã hóa token)
    process.env.JWT_SECRET,
    // Options (cùi chọn token)
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
};

/**
 * Controller: login
 * 
 * [POST] /api/auth/login
 * 
 * Mục đích: Xác thực người dùng và cấp token JWT
 * 
 * Quy trình:
 * 1. Lấy username và password từ request body
 * 2. Kiểm tra username và password có được cung cấp
 * 3. Tìm user trong database theo username (case-insensitive)
 * 4. Kiểm tra user có tồn tại không
 * 5. Kiểm tra user có bị xóa không (soft delete)
 * 6. So sánh password dùng bcrypt
 * 7. Nếu tất cả ok, tạo JWT token
 * 8. Trả về token + user info
 * 
 * Request:
 * {
 *   username: "john_doe",
 *   password: "SecurePassword123!"
 * }
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Đăng nhập thành công",
 *   data: {
 *     user: { _id, username, email, avatar, role },
 *     token: "eyJhbGciOiJIUzI1NiIs...",
 *     expiresIn: "24h"
 *   }
 * }
 * 
 * Response Error:
 * - 400: Thiếu username hoặc password
 * - 401: Username không tồn tại hoặc password sai
 * - 401: Tài khoản đã bị xóa
 */
module.exports.login = async (req, res, next) => {
  try {
    // Bước 1: Lấy dữ liệu từ request body
    const { username, password } = req.body;

    // Bước 2: Kiểm tra dữ liệu yêu cầu
    // (Validation từ middleware sẽ kiểm tra trước, nhưng ta kiểm tra lại để chắc chắn)
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username và mật khẩu là bắt buộc",
        error: "MISSING_CREDENTIALS",
      });
    }

    // Bước 3: Tìm user theo username
    // .select("+password"): Lấy password (vì model đã set select: false cho field password)
    const user = await User.findOne({
      username: username.toLowerCase(), // Case-insensitive search
    }).select("+password"); // Thêm password vào kết quả query

    // Bước 4: Kiểm tra user có tồn tại không
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc mật khẩu không chính xác",
        error: "INVALID_CREDENTIALS",
      });
    }

    // Bước 5: Kiểm tra user có bị xóa không (soft delete)
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản này đã bị xóa",
        error: "ACCOUNT_DELETED",
      });
    }

    // Bước 6: So sánh password
    // comparePassword là instance method được định nghĩa trong User model
    // Nó dùng bcrypt.compare để so sánh password nhập vào với password hash trong DB
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc mật khẩu không chính xác",
        error: "INVALID_CREDENTIALS",
      });
    }

    // Bước 7: Tạo JWT token
    const token = generateToken(user);

    // Bước 8: Trả về response thành công
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    });
  } catch (error) {
    // Bắt lỗi không mong muốn (lỗi DB, lỗi server, v.v.)
    // Chuyển cho error handler middleware
    next(error);
  }
};

/**
 * Controller: getProfile
 * 
 * [GET] /api/auth/profile
 * 
 * Mục đích: Lấy thông tin profile của user hiện tại
 * 
 * Yêu cầu:
 * - Phải có token JWT hợp lệ trong header Authorization
 * - Middleware authenticateToken sẽ xác thực token và gắn user info vào req.user
 * 
 * Quy trình:
 * 1. Lấy user ID từ req.user._id (đã được xác thực)
 * 2. Tìm user trong database
 * 3. Trả về user info (không có password)
 * 
 * Response Success (200):
 * {
 *   success: true,
 *   message: "Lấy thông tin thành công",
 *   data: {
 *     _id: "507f1f77bcf86cd799439011",
 *     username: "john_doe",
 *     email: "john@example.com",
 *     avatar: "https://...",
 *     role: "user",
 *     dateOfBirth: "1995-01-15T00:00:00.000Z",
 *     createdAt: "2024-01-20T10:30:00.000Z"
 *   }
 * }
 * 
 * Response Error:
 * - 404: User không tồn tại trong database
 * (401, 403 sẽ được xử lý bởi authenticateToken middleware)
 */
module.exports.getProfile = async (req, res, next) => {
  try {
    // Bước 1: Lấy user ID từ JWT token
    // req.user được set bởi authenticateToken middleware
    const userId = req.user._id;

    // Bước 2: Tìm user trong database
    const user = await User.findById(userId);

    // Bước 3: Kiểm tra user có tồn tại không
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Bước 4: Trả về thông tin user (không có password)
    res.status(200).json({
      success: true,
      message: "Lấy thông tin thành công",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
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