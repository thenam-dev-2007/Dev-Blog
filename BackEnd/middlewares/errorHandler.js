const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError
} = require('../utils/errors.js');

/**
 * ============================================
 * Centralized Error Handler Middleware
 * ============================================
 * 
 * Xử lý tất cả các loại lỗi trong ứng dụng
 * - Custom errors (AppError)
 * - Mongoose validation errors
 * - MongoDB duplicate key errors
 * - JWT errors
 * - Unexpected errors
 */

module.exports.errorHandler = (err, req, res, next) => {
  // Ghi log lỗi ra console
  console.error('❌ Error:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });

  let error = { ...err };
  error.message = err.message;

  /**
   * Bước 1: Xử lý MongoDB Validation Errors
   * VD: Field type mismatch, required field missing
   */
  if (err.name === 'ValidationError') {
    const message = `Validation Error: ${Object.values(err.errors)
      .map((e) => e.message)
      .join(', ')}`;

    error = new ValidationError(message, {
      errors: Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {})
    });
  }

  /**
   * Bước 2: Xử lý MongoDB Duplicate Key Errors
   * VD: Duplicate email, unique username
   * Error code 11000 là MongoDB duplicate key error
   */
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" đã tồn tại. Vui lòng sử dụng giá trị khác`;

    error = new ConflictError(message, {
      field,
      value,
      errorCode: 'DUPLICATE_KEY'
    });
  }

  /**
   * Bước 3: Xử lý JWT Token Errors
   * JsonWebTokenError: Token signature không hợp lệ
   * TokenExpiredError: Token đã hết hạn
   */
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Token không hợp lệ', {
      errorCode: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token đã hết hạn. Vui lòng đăng nhập lại', {
      errorCode: 'TOKEN_EXPIRED'
    });
  }

  /**
   * Bước 4: Xử lý Mongoose CastError
   * VD: ObjectId không hợp lệ
   */
  if (err.name === 'CastError') {
    const message = `ID không hợp lệ: ${err.value}`;
    error = new ValidationError(message, {
      field: err.path,
      value: err.value
    });
  }

  /**
   * Bước 5: Fallback - Nếu không phải lỗi custom
   * Kiểm tra có statusCode không, không thì là 500
   */
  if (!(error instanceof AppError)) {
    error = new AppError(
      error.message || 'Internal Server Error',
      error.statusCode || 500,
      'INTERNAL_ERROR'
    );
  }

  // Lấy status code từ error object
  const statusCode = error.statusCode || 500;

  /**
   * Bước 6: Gửi response lỗi về client
   * Format: {success, message, error, details, timestamp}
   */
  res.status(statusCode).json({
    success: false,
    message: error.message,
    error: error.errorCode,
    details: error.details || {},
    timestamp: error.timestamp || new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async Handler Wrapper
 * 
 * Dùng để wrap async route handlers
 * Bắt tất cả promise rejections và truyền tới error handler
 * 
 * @example
 * router.post('/login', asyncHandler(async (req, res) => {
 *   const user = await User.findOne({username: req.body.username});
 *   if (!user) throw new NotFoundError('User not found');
 * }));
 */
module.exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Handler
 * Dùng cho routes không tồn tại
 * Đặt ở cuối, sau tất cả routes khác
 */
module.exports.notFound = (req, res, next) => {
  const error = new NotFoundError(
    `Route ${req.originalUrl} không tồn tại`,
    { path: req.originalUrl, method: req.method }
  );
  next(error);
};
