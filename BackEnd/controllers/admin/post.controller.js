const Post = require("../../models/post.model.js");
const User = require("../../models/user.model.js");
const paginationHelper = require("../../helper/pagination");

// [GET] - Lấy tất cả bài viết
module.exports.getAllPosts = async (req, res, next) => {
    try {
        const posts = await Post.find({ isDeleted: false }).populate("author", "fullname").lean();

        res.status(200).json({
            success: true,
            message: "Lấy danh sách bài viết thành công",
            totalUsers: posts.length,
            data: posts,
        });
    } 
    catch (error) {
        next(error);
    }
};

// [DELETE] - Xóa bài viết
module.exports.deletePost = async (req, res, next) => {
    try {
        const post = req.post;

        await Post.findByIdAndUpdate(post._id, {
            isDeleted: true,
            deletedAt: new Date(),
        });

        await User.findByIdAndUpdate(
            post.author,
            { $pull: { posts: post._id } }, // $pull là một MongoDB update operator dùng để xóa phần tử khỏi mảng.
        );

        res.status(200).json({
            success: true,
            message: "Xóa bài viết thành công",
        });
    } 
    catch (error) {
        next(error);
    }
};
