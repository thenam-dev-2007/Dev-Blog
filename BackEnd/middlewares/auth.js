const User = require("../models/user.model");

const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../service/token.service")

module.exports.authenticateToken = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        // Format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
            });
        }
        // Tách token từ chuỗi "Bearer <token>"
        const token = authHeader.split(' ')[1];

        // Xác thực token
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token không hợp lệ hoặc đã hết hạn' 
            });
        }
        
        // Tìm user từ decoded token
        const user = await User.findById(decoded._id).select("_id username email role isActive").lean(); // nếu không có select sẽ lấy toàn bộ document

        if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ. Người dùng không tồn tại.'
        });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị khóa"
            });
        }
        // Gắn thông tin user vào request để sử dụng ở các middleware/controller tiếp theo
        req.user = user;
        // req.user không phải thuộc tính có sẵn của Express. Đây là một thuộc tính mà middleware xác thực tự thêm vào object req
        // Ví dụ: router.get("/profile", authenticateToken, (req, res) => {
                //     console.log(req.user);
                // });

                // Nếu middleware gắn:
                // req.user = {
                //     _id: "123",
                //     username: "nam"
                // };

                // thì controller sẽ nhận được:
                // {
                //     _id: "123",
                //     username: "nam"
                // }
            
        // Có thể dùng req.user = decoded;
        // Ưu điểm:
        //     Nhanh hơn.
        // Nhược điểm:
        //     User bị khóa vẫn dùng token được.
        //     User bị xóa vẫn dùng token được.
        //     Role thay đổi không có tác dụng ngay.
        req.accessToken = token;
        next();
    } 
    catch (error) {
        // Xử lý các lỗi JWT cụ thể
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ"
            });
        }
    }
};