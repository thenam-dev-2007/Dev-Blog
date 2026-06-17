const crypto = require("crypto");

const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshToken.model");

const getAccessSecret = () => {
    return process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "blog_platform_access_secret_dev";
};

const getAccessExpiry = () => {
    return process.env.ACCESS_TOKEN_EXPIRY || process.env.JWT_EXPIRES_IN || "7d";
};

// Hàm dùng để tạo JWT token cho user.
// Lưu đồng thời _id, id, userId để middleware/FE cũ mới đều đọc được.
const generateAccessToken = (user) => {
    const id = String(user._id || user.id);

    return jwt.sign(
        {
            _id: id,
            id,
            userId: id,
            role: user.role || "user",
        },
        getAccessSecret(),
        { expiresIn: getAccessExpiry() }
    );
};

// Tạo refresh token và lưu vào database
const generateRefreshToken = async (user) => {
    const token = crypto.randomBytes(40).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
        token,
        userId: user._id,
        expiresAt,
    });

    return { token, expiresAt };
};

// Xác thực access token
const verifyAccessToken = (token) => {
    return jwt.verify(token, getAccessSecret());
};

// Làm mới access token bằng refresh token
const refreshAccessToken = async (token) => {
    const storedToken = await RefreshToken.findOne({
        token,
        expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
        return null;
    }

    const user = await User.findById(storedToken.userId);

    if (!user) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        return null;
    }

    const newAccessToken = generateAccessToken(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });

    const newRefreshToken = await generateRefreshToken(user);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken.token,
    };
};

const revokeToken = async (userId, res) => {
    await RefreshToken.deleteMany({ userId });

    if (res) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
        });
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    refreshAccessToken,
    revokeToken,
};
