const User = require("../../models/user.model");
const Post = require("../../models/post.model");

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
        const user = req.targetUser;

        // Xóa toàn bộ bài viết của user
        await Post.updateMany(
            {
                author: user._id
            },
            {
                isDeleted: true,
                deletedAt: new Date()
            }
        );

        // Gỡ like của user trên các bài viết khác
        await Post.updateMany(
            {
                likes: user._id
            },
            {
                $pull: {
                    likes: user._id
                }
            },
        );

        // Xóa user
        await user.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Xóa người dùng thành công"
        });

    } 
    catch (error) {
        next(error);
    }
};