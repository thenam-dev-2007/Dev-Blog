const jwt = require("jsonwebtoken");

module.exports = (user) => {
    return jwt.sign(
    // Payload (dữ liệu được lưu trong token)
    {
        _id: user._id.toString(), // newUser._id MongoDB trả về là ObjectId.
        role: user.role,
        // Sau payload có thể thêm:
        //     username
        //     email
    },
    // Secret (khóa bí mật để mã hóa token)
    process.env.JWT_SECRET,
    // Options (cấu hình token)
    { expiresIn: process.env.JWT_EXPIRES_IN }
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