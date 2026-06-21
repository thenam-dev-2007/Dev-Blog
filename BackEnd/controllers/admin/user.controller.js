const User = require("../../models/user.model");
const Post = require("../../models/post.model");
const getProfileStatus = require("../../service/profile.service");
const paginationHelper = require("../../helper/pagination");

// [GET]
module.exports.getAllUser = async (req, res, next) => {
    try {
        const users = await User.find({
            isActive: true,
            role: "user"
        }).select("-password -refreshToken").lean();

        res.status(200).json({
            success: true,
            message: "Lấy danh sách người dùng thành công",
            totalUsers: users.length,
            data: users,
        });
    } 
    catch (error) {
        next(error);
    }
};

// [DELETE] - Xóa tài khoản
module.exports.deleteUser = async (req, res, next) => {
    try {
        const user = req.targetUser;

        if (req.user._id.toString() === user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Không thể tự xóa tài khoản của chính mình",
            });
        }

        // Xóa toàn bộ bài viết của user
        await Post.updateMany(
            {
                author: user._id,
                isDeleted: false,
            },
            {
                isDeleted: true,
                deletedAt: new Date(),
            },
        );

        // Gỡ like của user trên các bài viết khác
        await Post.updateMany(
            {
                likes: user._id,
            },
            {
                $pull: {
                likes: user._id,
                },
            },
        );

        // Xóa user
        await User.updateOne(
            { _id: user._id },
            {
                isDeleted: true,
                isActive: false,
                deletedAt: new Date(),
            },
        );

        res.status(200).json({
            success: true,
            message: "Xóa người dùng thành công",
        });
    } 
    catch (error) {
        next(error);
    }
};