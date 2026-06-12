const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model");
const { generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../service/token.service');

module.exports.login = async (req, res, next) => {
    try {
        // Lấy dữ liệu từ request body
        const { email, password } = req.body;

        // Tìm user theo email
        // .select("+password"): Lấy password (vì model đã set select: false cho field password)
        const user = await User.findOne({
        email: email.toLowerCase(), 
        }).select("+password"); // Thêm password vào kết quả query
        
        // Kiểm tra user có tồn tại không
        if (!user) {
        return res.status(401).json({
            success: false,
            message: "Email hoặc mật khẩu không chính xác",
        });
        }

        // Kiểm tra user đã xác nhận email chưa
        if (!user.isVerified) {
        return res.status(403).json({
            success: false,
            message:
                "Vui lòng xác thực email trước khi đăng nhập"
        });
        }

        // Kiểm tra user có bị xóa không (soft delete)
        if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: "Tài khoản này đã bị xóa",
        });
        }

        // So sánh password
        // comparePassword là instance method được định nghĩa trong User model
        // Nó dùng bcrypt.compare để so sánh password nhập vào với password hash trong DB
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Email hoặc mật khẩu không chính xác",
        });
        }

        // Tạo JWT token
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);

        // Lưu refresh token vào cookie
        res.cookie('refreshToken', refreshToken.token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Cập nhật thời gian đăng nhập cuối
        user.lastLogin = new Date();
        await user.save();

        // Trả về response thành công
        res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        data: {
            user: {
            _id: user._id,
            fullname: user.fullname,
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

module.exports.logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await RefreshToken.deleteOne({
                token: refreshToken
            });
        }

        res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
        });

        return res.status(200).json({
            success: true,
            message: "Đăng xuất thành công"
        });

    } 
    catch (error) {
        next(error);
    }
};

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