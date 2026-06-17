const User = require("../models/user.model");
const { verifyAccessToken } = require("../service/token.service");

module.exports.authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Không tìm thấy token xác thực. Vui lòng đăng nhập.",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        const userId =
            decoded?._id ||
            decoded?.id ||
            decoded?.userId ||
            decoded?.userID;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ. Thiếu thông tin người dùng.",
            });
        }

        // User model hiện tại dùng isActive, không có field isDeleted.
        // Không lọc isDeleted:false vì sẽ làm user hợp lệ bị trả về null.
        const user = await User.findById(userId)
            .select("_id fullname email avatar dateOfBirth role isActive")
            .lean();

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Token không hợp lệ. Người dùng không tồn tại.",
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị khóa",
            });
        }

        req.user = user;
        req.accessToken = token;
        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
            });
        }

        next(error);
    }
};
