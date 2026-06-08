const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
        username: {
            type: String,
            required: [true, 'Username là bắt buộc'],
            trim: true,
            minlength:  [3, 'Username phải có ít nhất 3 ký tự'],
            maxlength: [30, 'Username không được vượt quá 30 ký tự'],
            unique: true
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

        resetPasswordToken: String, // Token đã băm

        resetPasswordExpires: Date, // Thời gian hết hạn của token

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
        next();
        // Báo cho Mongoose: Middleware xong rồi, tiếp tục save document.
        // Nếu quên gọi next() thì request có thể bị treo.
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

// Phương thức: Tạo reset token
userSchema.methods.createPasswordResetToken = function() {
    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString('hex'); 
    // tạo 32 byte ngẫu nhiên, chuyển thành hex (64 ký tự) – đây là token chưa băm.
    
    // Băm token và lưu vào database
    this.resetPasswordToken = crypto
        .createHash('sha256') // băm token trước khi lưu vào database để tránh lộ token nếu database bị tấn công.
        .update(resetToken)
        .digest('hex');
    
    // Đặt thời gian hết hạn: 10 phút
    this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    // Trả về token chưa băm (sẽ được gửi qua email)
    return resetToken;
};

const User = mongoose.model("User", userSchema, "users");
                            // Tên model      // tìm connection tên là products
module.exports = User; // xuất file model