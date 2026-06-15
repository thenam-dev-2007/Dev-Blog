const { body, validationResult } = require("express-validator");
// express-validator: Cung cấp các hàm kiểm tra (validation chain) cho từng trường dữ liệu.
// Validation chain: Mỗi trường có thể có nhiều điều kiện kiểm tra, được nối tiếp nhau bằng dấu chấm.
const fs = require("fs/promises");
const User = require("../models/user.model");
const Post = require("../models/post.model");

const handleValidationErrors = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // validation thất bại --> xóa avatar/thumbnail
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } 
        catch (err) {
          console.error("Lỗi xóa file khi validation thất bại:", err.message);
        }
      }
      // Nếu có lỗi, trả về status 400 (Bad Request) với danh sách lỗi
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next(); // Không có lỗi, tiếp tục xử lý
};

module.exports.validateRegister = [
  // Kiểm tra fullname
  body("fullname")
    .trim()
    .notEmpty()
    .withMessage("fullname là bắt buộc")
    .bail() // bail() sẽ dừng khi validation thất bại
    .isLength({ min: 3, max: 30 })
    .withMessage("fullname phải từ 3-30 ký tự")
    .bail()
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage("fullname chỉ được chứa chữ cái và khoảng trắng")
    .bail(),

  // Kiểm tra email
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email là bắt buộc")
    .bail()
    .isEmail()
    .withMessage("Email không hợp lệ")
    .bail()
    .normalizeEmail() // Chuẩn hóa email (chuyển thành chữ thường, loại bỏ dấu chấm trong Gmail...)
    .custom(async (value) => {
      const user = await User.findOne({ email: value });
      if (user) {
          throw new Error("Email đã tồn tại");
      }
      return true;
    }),

  // Kiểm tra dateOfBirth (nếu có)
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Ngày sinh không hợp lệ") // isISO8601() dùng để kiểm tra định dạng ngày hợp lệ (YYYY-MM-DD)
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error("Ngày sinh không hợp lệ");
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

  // Kiểm tra password
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Mật khẩu là bắt buộc")
    .isLength({ min: 8 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/[a-zA-Z]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 chữ cái")
    .matches(/[0-9]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 số")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt"),

  // Confirm Password
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Xác nhận mật khẩu là bắt buộc")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Xác nhận mật khẩu không trùng khớp");
      }
      return true;
    }),

  // Middleware xử lý kết quả validation
  handleValidationErrors,
];

module.exports.validateUpdateMyProfile = [
    // Fullname
    body("fullname")
        .optional()
        .trim()
        // .notEmpty().withMessage('Fullname là bắt buộc')
        .isLength({ min: 3, max: 30 })
        .withMessage("Fullname phải từ 3-30 ký tự")
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage("Fullname chỉ được chứa chữ, số và dấu gạch dưới")
        .custom(async (value, { req }) => {
        const userId = req.user._id;
        const existingUser = await User.findOne({
            fullname: value,
            _id: { $ne: userId }, // Loại trừ chính user hiện tại
        });
        if (existingUser) {
            throw new Error("Fullname đã tồn tại");
        }
        return true;
        }),

    // Date of birth
    body("dateOfBirth")
      .isISO8601()
      .withMessage("Ngày sinh không hợp lệ") // isISO8601() dùng để kiểm tra định dạng ngày hợp lệ (YYYY-MM-DD)
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error("Ngày sinh không hợp lệ");
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

    handleValidationErrors,
];

module.exports.validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email là bắt buộc")
    .bail() // bail() sẽ dừng validate nếu bước trước thất bại.
    .isEmail()
    .withMessage("Email không hợp lệ")
    .normalizeEmail(), // Chuẩn hóa email
  // Ví dụ: USER@GMAIL.COM --> user@gmail.com

  body("password").notEmpty().withMessage("Mật khẩu là bắt buộc"),

  handleValidationErrors,
];

module.exports.validateComment = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung bình luận không được để trống")
    .isLength({ max: 1000 })
    .withMessage("Nội dung bình luận không được vượt quá 1000 ký tự"),

  handleValidationErrors,
];

module.exports.validateCreatePost = [
  // Title
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề là bắt buộc")
    .isLength({ max: 200 })
    .withMessage("Tiêu đề không được vượt quá 200 ký tự"),

  // Content
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung bài viết là bắt buộc")
    .isLength({ min: 10 })
    .withMessage("Nội dung phải có ít nhất 10 ký tự"),

  // Tags
  body("tags")
    .optional({ nullable: true })
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray()
    .withMessage("Tags phải là một mảng")
    .custom((value) => {
      if (value.length > 10) {
        throw new Error("Không được vượt quá 10 tags");
      }

      const hasEmptyTag = value.some(
        (tag) => typeof tag !== "string" || tag.trim() === "",
      );
      if (hasEmptyTag) {
        throw new Error("Tag không được để trống");
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports.validateUpdatePost = [
  // Title
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề không được để trống")
    .isLength({ max: 200 })
    .withMessage("Tiêu đề không được vượt quá 200 ký tự"),

  // Content
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Nội dung không được để trống")
    .isLength({ min: 10 })
    .withMessage("Nội dung phải có ít nhất 10 ký tự"),

  // Tags
  body("tags")
    .optional()
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray()
    .withMessage("Tags phải là một mảng")
    .custom((value) => {
      if (value.length > 10) {
        throw new Error("Không được vượt quá 10 tags");
      }

      const hasEmptyTag = value.some(
        (tag) => typeof tag !== "string" || tag.trim() === "",
      );
      if (hasEmptyTag) {
        throw new Error("Tag không được để trống");
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports.validatePassword = [
  // Current Password
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Mật khẩu hiện tại là bắt buộc"),

  // New Password
  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("Mật khẩu mới là bắt buộc")
    .isLength({ min: 8, max: 128 })
    .withMessage("Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/[a-zA-Z]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 chữ cái")
    .matches(/[0-9]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 số")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
    .custom((value, { req }) => {
      // Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
      if (value === req.body.currentPassword) {
        throw new Error("Mật khẩu mới phải khác với mật khẩu hiện tại");
      }
      return true;
    }),

  // Confirm Password
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Xác nhận mật khẩu là bắt buộc")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Xác nhận mật khẩu không trùng khớp");
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports.validateEmail = [
    // New Email
    body("newEmail")
        .trim()
        .notEmpty()
        .withMessage("Email là bắt buộc")
        .isEmail()
        .withMessage("Email không hợp lệ")
        .normalizeEmail()
        .custom(async (value, { req }) => {
            //  { req } chính là Express request object --> có thể dùng req.params.id, req.body, req.user
            if (value.toLowerCase() === req.user.email.toLowerCase()) {
                throw new Error("Email mới phải khác email hiện tại");
            }
            const emailExists = await User.findOne({
                email: value.toLowerCase(), // Tìm email giống email người dùng nhập. (tránh khác chữ hoa/thường.)
            });
            if (emailExists) {
                throw new Error("Email đã tồn tại");
            }
            return true;
        }),

    handleValidationErrors,
];

module.exports.validationOTP = [
  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP gồm 6 chữ số"),

  handleValidationErrors,
];
