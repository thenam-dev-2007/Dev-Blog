const rateLimit = require('express-rate-limit');

// Giới hạn: tối đa 3 yêu cầu forgot-password trong 1 giờ
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 3,
    message: {
        status: 'fail',
        message: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 1 giờ.'
    }
});

module.exports = { forgotPasswordLimiter };
