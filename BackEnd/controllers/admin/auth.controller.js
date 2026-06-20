const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model");
const { generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../service/token.service');

module.exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Vui lòng xác thực email trước khi đăng nhập"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Tài khoản này đã bị vô hiệu hóa"
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập hệ thống quản trị"
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);

        res.cookie("refreshToken", refreshToken.token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Không cần save toàn document
        await User.updateOne(
            { _id: user._id },
            { lastLogin: new Date() }
        );

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: {
                accessToken,
                user: {
                    _id: user._id,
                    fullname: user.fullname,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    dateOfBirth: user.dateOfBirth,
                    lastLogin: new Date()
                }
            }
        });
    } 
    catch (error) {
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

        await revokeToken(req.user._id, res);

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
        
        res.status(200).json({
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