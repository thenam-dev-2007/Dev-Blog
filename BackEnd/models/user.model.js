const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
        fullname: {
            type: String,
            required: [true, 'Fullname là bắt buộc'],
            trim: true,
            minlength:  [3, 'Fullname phải có ít nhất 3 ký tự'],
            maxlength: [30, 'Fullname không được vượt quá 30 ký tự'],
            match: [
                /^[a-zA-ZÀ-ỹ\s]+$/,
                'Fullname chỉ được chứa chữ cái và khoảng trắng'
            ]
        },

        password: {
            type: String,
            required: [true, 'Mật khẩu là bắt buộc'],
            minlength: [8, 'Mật khẩu phải có ít nhất 8 ký tự'],
            select: false // Không trả về password khi query (bảo mật)
        },

        email: {
            type: String,
            required: [true, 'Email là bắt buộc'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'] // Regex kiểm tra email
        },

        avatar: {
            type: String,
            default: "../upload/avatar/default-avatar.jpg"
        },

        dateOfBirth: {
            type: Date
        },

        role: {
            type: String,
            enum: ['user', 'admin'], // Chỉ cho phép 2 giá trị
            default: 'user'
        },

        posts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }],

        isActive: {
            type: Boolean,
            default: true
        },
        
        lastLogin: {
            type: Date,
            default: null
        },

        passwordChangedAt: Date, // Thời gian thay đổi mật khẩu lần cuối

        resetPasswordOTP: {
            type: String,
            select: false
        },

        resetPasswordOTPExpires: {
            type: Date
        },

        resetPasswordVerified: {
            type: Boolean,
            default: false
        },

        isVerified: { 
            type: Boolean, 
            default: false 
        },

        emailOTP: {
            type: String,
            select: false
        },

        emailOTPExpires: {
            type: Date
        },

        otpResendAt: {
            type: Date
        }
    }, 
    {
        timestamps: true // Tự động thêm createdAt và updatedAt
    }
)

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function(next) {
// pre('save') là middleware chạy trước khi document được save vào MongoDB.
    // Chỉ mã hóa nếu password thay đổi (tránh mã hóa lại khi update)
    // this trỏ tới document hiện tại (arrow function không có từ khóa this)
    if (!this.isModified('password')) return next();
    // Kiểm tra xem field password có thay đổi không.
    // Nếu không thay đổi --> để bỏ qua middleware.

    try {
        // Tạo salt với 12 rounds (càng cao càng an toàn nhưng chậm hơn)
        // Salt là chuỗi ngẫu nhiên thêm vào password trước khi hash.
        const salt = await bcrypt.genSalt(12);
        // Mã hóa password với salt
        this.password = await bcrypt.hash(this.password, salt);
    } 
    catch (error) {
        next(error); // Chuyển lỗi cho error handler
    }
});

// Method instance: So sánh password (dùng cho login)
userSchema.methods.comparePassword = async function(candidatePassword) {
// methods dùng để thêm hàm cho từng document của model.
    return await bcrypt.compare(candidatePassword, this.password);
    // candidatePassword: Là password người dùng nhập khi login.
};

const User = mongoose.model("User", userSchema, "users");
                            // Tên model      // tìm connection tên là products
module.exports = User; // xuất file model