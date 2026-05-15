const { body, validationResult } = require('express-validator');
// express-validator: Cung cấp các hàm kiểm tra (validation chain) cho từng trường dữ liệu.
// Validation chain: Mỗi trường có thể có nhiều điều kiện kiểm tra, được nối tiếp nhau bằng dấu chấm.



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
        .notEmpty().withMessage('Mật khẩu là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/[a-zA-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ cái')
        .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất 1 số'),

    // Kiểm tra age (nếu có)
    body('age')
        .optional() // Cho phép không cung cấp
        .isInt({ min: 0, max: 150 }).withMessage('Tuổi phải là số nguyên từ 0-150'),

    // Kiểm tra role (nếu có)
    body('role')
        .optional()
        .isIn(['user', 'admin']).withMessage('Role chỉ được là "user" hoặc "admin"'),

    // Middleware xử lý kết quả validation
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        // Nếu có lỗi, trả về status 400 (Bad Request) với danh sách lỗi
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ',
            errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
            }))
        });
        }
        next(); // Không có lỗi, tiếp tục xử lý
    }
];