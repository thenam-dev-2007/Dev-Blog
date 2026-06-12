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
        .populate("author", "fullname avatar")
        .populate("comments.user", "fullname avatar")
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
        .populate("author", "fullname avatar")
        .populate("comments.user", "fullname avatar")
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

// [POST] - Tạo bài viết mới
module.exports.createPost = async (req, res, next) => {
    try {
        const { title, content, thumbnail, tags } = req.body;
        const authorId = req.user?.id; // Lấy từ middleware auth

        if (!authorId) {
        return res.status(401).json({
            code: 401,
            message: "Bạn phải đăng nhập để tạo bài viết",
        });
        }

        const newPost = await Post.create({
        title,
        content,
        thumbnail,
        tags: tags || [],
        author: authorId,
        });

        await User.findByIdAndUpdate(authorId, { $push: { posts: newPost._id } });

        const populatedPost = await newPost.populate(
        "author",
        "fullname email avatar",
        );

        res.status(201).json({
        code: 201,
        message: "Tạo bài viết thành công",
        data: populatedPost,
        });
    } 
    catch (error) {
        next(error)
    }
};

// [DELETE] - Xóa bài viết
module.exports.deletePost = async (req, res, next) => {
    try {
        const post = req.post;

        await Post.findByIdAndUpdate(
        post._id,
        {
            isDeleted: true,
            deletedAt: new Date()
        }
        );

        await User.findByIdAndUpdate(
            post.author,
            { $pull: { posts: post._id } } // $pull là một MongoDB update operator dùng để xóa phần tử khỏi mảng.
        );

        return res.status(200).json({
            success: true,
            message: "Xóa bài viết thành công"
        });

        }
    catch (error) {
        next(error);
    }
};