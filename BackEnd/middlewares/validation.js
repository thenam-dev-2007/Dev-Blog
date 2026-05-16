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
        .optional() // Cho phép không cung cấp
        .isISO8601().withMessage('Ngày sinh không hợp lệ') // isISO8601() dùng để kiểm tra định dạng ngày hợp lệ (YYYY-MM-DD)
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

    // Kiểm tra role (nếu có)
    body('role')
        .optional()
        .isIn(['user', 'admin']).withMessage('Role chỉ được là "user" hoặc "admin"'),

    // Middleware xử lý kết quả validation
    handleValidationErrors
];

// Middleware kiểm tra dữ liệu cho route PUT /api/users
module.exports.validateUpdateUser = [
    // Username
    body('username')
        .trim()
        .notEmpty().withMessage('Username là bắt buộc')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username phải từ 3-30 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username chỉ được chứa chữ, số và dấu gạch dưới'),

    // Email
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail()
        .custom(async (value, { req }) => {
            //  { req } chính là Express request object --> có thể dùng req.params.id, req.body, req.user
            const emailExists = await User.findOne({
                email: value.toLowerCase(), // Tìm email giống email người dùng nhập. (tránh khác chữ hoa/thường.)
                _id: { $ne: req.params.id } // $ne trong MongoDB nghĩa là: not equal (khác với) --> Tìm email giống nhưng khác id hiện tại
            });
            if (emailExists) {
                throw new Error('Email đã tồn tại'); // express-validator sẽ tự thêm lỗi validation.
            }
            return true;
        }),

    // Password
    body('password')
        .optional()
        .trim()
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/[a-zA-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ cái')
        .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất 1 số')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt'),

    // Date of birth
    body('dateOfBirth')
        .notEmpty().withMessage('Ngày sinh là bắt buộc')
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