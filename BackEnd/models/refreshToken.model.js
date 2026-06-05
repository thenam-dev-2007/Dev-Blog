const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true,
        index: true // Tạo index để tăng tốc truy vấn
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Tự động xóa token hết hạn
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema, "refreshTokens");