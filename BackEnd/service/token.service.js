const crypto = require("crypto");

const User = require("../models/user.model")
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshToken.model")

const generateAccessToken = (user) => {
    return jwt.sign(
    // Payload (dữ liệu được lưu trong token)
    {
        _id: user._id.toString(), // newUser._id MongoDB trả về là ObjectId.
        role: user.role,
        // Sau payload có thể thêm:
        //     fullname
        //     email
    },
    // Secret (khóa bí mật để mã hóa token)
    process.env.ACCESS_TOKEN_SECRET,
    // Options (cấu hình token)
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

// Hàm dùng để tạo JWT token cho user
// - user._id: MongoDB object ID
// - user.role: Vai trò (user hoặc admin)

// Cấu trúc JWT token:
// - Header: { "alg": "HS256", "typ": "JWT" }
// - Payload: { _id, role, iat, exp}
//          iat: thời điểm tạo token (tự động thêm)
//          exp: thời điểm hết hạn (tự động thêm)
// - Signature: Mã hóa bằng JWT_SECRET

// Thời gian hết hạn:
// - Mặc định 24 giờ (từ JWT_EXPIRES_IN environment variable)
// - Có thể cấu hình trong .env

// Tạo refresh token và lưu vào database
const generateRefreshToken = async (user) => {
    // Tạo token ngẫu nhiên an toàn thay vì dùng JWT
    const token = crypto.randomBytes(40).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày
    
    // Lưu vào database
    await RefreshToken.create({
        token,
        userId: user._id,
        expiresAt
    });
    
    return { token, expiresAt };
}

// Xác thực access token
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

// Làm mới access token bằng refresh token
const refreshAccessToken = async (token) => {
    // Tìm refresh token trong database
    const storedToken = await RefreshToken.findOne({ 
        token,
        expiresAt: { $gt: new Date() } // Chưa hết hạn
    });

    if (!storedToken) {
        return null; // Token không hợp lệ hoặc đã hết hạn
    }

    // Tìm user
    const user = await User.findById(storedToken.userId);

    if (!user) {
        // Xóa token nếu user không tồn tại
        await RefreshToken.deleteOne({ _id: storedToken._id });
        return null;
    }
    
    // Tạo access token mới
    const newAccessToken = generateAccessToken(user);
    
    // Xóa refresh token cũ (rotation)
    await RefreshToken.deleteOne({ _id: storedToken._id });
    
    // Tạo refresh token mới
    const newRefreshToken = await generateRefreshToken(user);
    
    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken.token
    };
}

const revokeToken = async (userId, res) => {
    await RefreshToken.deleteMany({ userId });
    if (res) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        });
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    refreshAccessToken,
    revokeToken
};