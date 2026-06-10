const Post = require("../../models/post.model.js");
const User = require("../../models/user.model.js");
const paginationHelper = require("../../helper/pagination")

// [GET] - Lấy tất cả bài viết 
module.exports.getAllPosts = async (req, res, next) => {
    try {
        let find = {isDeleted: false};

        const countPosts = await Post.countDocuments(find); // countDocuments() => Dùng để đếm số document trong MongoDB

        let objectPagination = paginationHelper(
        {
            currentPage: 1,
            limitPost: 4,
        }, 
        req.query, 
        countPosts
        )

        const posts = await Post.find(find)
        .sort({ createdAt: -1 })
        .limit(objectPagination.limitPost)
        .skip(objectPagination.skip)
        .populate("author", "username avatar")
        .populate("comments.user", "username avatar")
        .lean(); // lean() --> trong Mongoose dùng để trả về object JavaScript thuần thay vì trả về Mongoose Document.
        // Nên dùng GET API
        // Không nên dùng UPDATE API vì cần dùng các method của Mongoose document. (ví dụ: .save())
        res.status(200).json({
        success: true,
        message: "Lấy bài viết thành công",
        pagination: {
            currentPage: objectPagination.currentPage,
            totalPage: objectPagination.totalPage,
            totalPosts: countPosts
            // limit: objectPagination.limit,
        },
        data: posts
        })
    } 
    catch (error) {
        next(error)
    }
};

// [GET] - Lấy bài viết theo slug
module.exports.getPostBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const post = await Post.findOne({ slug, isDeleted: false })
        .populate("author", "username avatar")
        .populate("comments.user", "username avatar")
        .lean();

        if (!post) {
        return res.status(404).json({
            code: 404,
            message: "Bài viết không tồn tại",
        });
        }

        res.status(200).json({
        success: true,
        message: "Lấy bài viết thành công",
        data: post,
        });
    } 
    catch (error) {
        next(error)
    }
};