const crypto = require("crypto");

// Tạo token có thời hạn (dùng JWT)
const generateVerificationToken = (userId) => {
    const token = crypto.randomBytes(32).toString("hex");
    // Token có hiệu lực trong 24 giờ
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return { token, expiresAt };
};

module.exports = { generateVerificationToken };