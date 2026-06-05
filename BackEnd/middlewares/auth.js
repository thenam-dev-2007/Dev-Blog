const jwt = require("jsonwebtoken");

module.exports.authenticateToken = async (req, res, next) => {
    try {
        // Bước 1: Lấy token từ header Authorization
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

        // Bước 2: Kiểm tra token có tồn tại không
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Bạn chưa đăng nhập",
            });
        }

        // Bước 4: Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
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

        next(error)
    }
};
