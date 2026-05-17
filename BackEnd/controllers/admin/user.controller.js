const User = require("../../models/user.model");

// [GET] //
module.exports.getAllUser = async () => {
    try {
        res.status(200).json({
            success: true,
            count: User.length,
            data: User,
        });
    }
    catch(error) {
        // Nếu có lỗi không mong muốn, chuyển cho error handler
        next(error);
    }
}

// [DELETE] - Xóa tài khoản
module.exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.user?.id;

        if (!userId) {
        return res.status(400).json({
            code: 400,
            message: "User ID is required",
        });
        }

        // Kiểm tra quyền
        if (currentUserId !== userId && req.user?.role !== "admin") {
        return res.status(403).json({
            code: 403,
            message: "Bạn không có quyền xóa account này",
        });
        }

        const user = await User.findById(userId);

        if (!user) {
        return res.status(404).json({
            code: 404,
            message: "User not found",
        });
        }

        // Xóa tất cả posts của user
        const Post = require("../../models/post.model.js");
        await Post.deleteMany({ author: userId });

        // Xóa user
        await User.findByIdAndDelete(userId);

        res.json({
        code: 200,
        message: "Xóa tài khoản thành công",
        });
    } catch (error) {
        next(error);
    }
};