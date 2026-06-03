const { body, validationResult } = require('express-validator');
// express-validator: Cung cấp các hàm kiểm tra (validation chain) cho từng trường dữ liệu.
// Validation chain: Mỗi trường có thể có nhiều điều kiện kiểm tra, được nối tiếp nhau bằng dấu chấm.

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Nếu có lỗi, trả về status 400 (Bad Request) với danh sách lỗi
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    next(); // Không có lỗi, tiếp tục xử lý
};

// Middleware kiểm tra dữ liệu cho route POST /api/users
module.exports.validateCreateUser = [
    // Kiểm tra username
    body('username')
        .trim()
        .notEmpty().withMessage('Username là bắt buộc')
        .isLength({ min: 3, max: 30 }).withMessage('Username phải từ 3-30 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username chỉ được chứa chữ, số và dấu gạch dưới'),

    // Kiểm tra email
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(), // Chuẩn hóa email (chuyển thành chữ thường, loại bỏ dấu chấm trong Gmail...)

    // Kiểm tra password
    body('password')
        .trim()
        .notEmpty().withMessage('Mật khẩu là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/[a-zA-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ cái')
        .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất 1 số')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt'),

    // Kiểm tra dateOfBirth (nếu có)
    body('dateOfBirth')
        .isISO8601()
        .withMessage('Ngày sinh không hợp lệ') // isISO8601() dùng để kiểm tra định dạng ngày hợp lệ (YYYY-MM-DD)
        .custom((value) => {
            if (new Date(value) > new Date()) {
                throw new Error('Ngày sinh không hợp lệ');
            }
            return true;
        })
        // custom() cho phép tự định nghĩa điều kiện kiểm tra. value là giá trị của field hiện tại.
        // new Date(value) --> Chuyển string thành đối tượng Date.
        // new Date() --> Lấy thời gian hiện tại.
        // Nếu điều kiện sai:
            // express-validator sẽ đánh dấu validation failed
            // message lỗi sẽ là: Ngày sinh không hợp lệ
        .toDate(),

    // Middleware xử lý kết quả validation
    handleValidationErrors
];

// Middleware kiểm tra dữ liệu cho route PUT /api/users
module.exports.validateUpdateUser = [
    // Username
    body('username')
        .optional()
        .trim()
        // .notEmpty().withMessage('Username là bắt buộc')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username phải từ 3-30 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username chỉ được chứa chữ, số và dấu gạch dưới'),

    // Date of birth
    body('dateOfBirth')
        .optional()
        // .notEmpty().withMessage('Ngày sinh là bắt buộc')
        .isISO8601().withMessage('Ngày sinh không hợp lệ')
        .custom((value) => {
            if (new Date(value) > new Date()) {
                throw new Error('Ngày sinh không hợp lệ');
            }

            return true;
        })
        .toDate(),

    handleValidationErrors
];

// Middleware kiểm tra dữ liệu cho route POST /api/auth/login
module.exports.validateLogin = [
    // User
    body('username')
        .trim()
        .notEmpty().withMessage('Username là bắt buộc'),

    // Password
    body('password')
        .trim()
        .notEmpty().withMessage('Mật khẩu là bắt buộc'),

    handleValidationErrors
];

// Middleware kiểm tra dữ liệu cho comment
module.exports.validateComment = [
    body('content')
        .trim()
        .notEmpty().withMessage('Nội dung bình luận không được để trống')
        .isLength({ max: 1000 }).withMessage('Nội dung bình luận không được vượt quá 1000 ký tự'),

    handleValidationErrors
];

// Middleware kiểm tra dữ liệu cho create post
module.exports.validateCreatePost = [
    // Title
    body('title')
        .trim()
        .notEmpty().withMessage('Tiêu đề là bắt buộc')
        .isLength({ max: 200 }).withMessage('Tiêu đề không được vượt quá 200 ký tự'),
        
    // Content
    body('content')
        .trim()
        .notEmpty().withMessage('Nội dung bài viết là bắt buộc')
        .isLength({ min: 10 }).withMessage('Nội dung phải có ít nhất 10 ký tự'),

    // Tags
    body('tags')
        .optional()
        .isArray().withMessage('Tags phải là một mảng')
        .custom((value) => {
            if (value.length > 10 ) {
                throw new Error('Không được vượt quá 10 tags');
            }
            return true;
        }),


    handleValidationErrors
];

/**
 * Middleware: validateChangePassword
 * Kiểm tra dữ liệu khi thay đổi mật khẩu
 */
module.exports.validateChangePassword = [
    // Current Password
    body('currentPassword')
        .trim()
        .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),

    // New Password
    body('newPassword')
        .trim()
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 8 }).withMessage('Mật khẩu phải có ít nhất 8 ký tự')
        .matches(/[a-zA-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ cái')
        .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất 1 số')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt')
        .custom((value, { req }) => {
            // Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
            if (value === req.body.currentPassword) {
                throw new Error('Mật khẩu mới phải khác với mật khẩu hiện tại');
            }
            return true;
        }),

    // Confirm Password
    body('confirmPassword')
        .trim()
        .notEmpty().withMessage('Xác nhận mật khẩu là bắt buộc')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Xác nhận mật khẩu không trùng khớp');
            }
            return true;
        }),

    handleValidationErrors
];