const User = require("../../models/user.model");
const Post = require("../../models/post.model");
const getProfileStatus = require("../../service/profile.service");
const paginationHelper = require("../../helper/pagination");

// [GET]
module.exports.getAllUser = async (req, res, next) => {
    try {
        let find = { isDeleted: false };

        const countUsers = await User.countDocuments(find);

        let objectPagination = paginationHelper(
            {
                currentPage: 1,
                limitPost: 5,
            },
            req.query,
            countUsers,
        );

        const users = await User.find(find)
            .limit(objectPagination.limitPost)
            .skip(objectPagination.skip)
            .lean();

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách người dùng thành công",
            pagination: {
                currentPage: objectPagination.currentPage,
                totalPage: objectPagination.totalPage,
                totalUsers: countUsers,
                // limit: objectPagination.limit,
            },
            data: users,
        });
    } 
    catch (error) {
        // Nếu có lỗi không mong muốn, chuyển cho error handler
        next(error);
    }
};

// [GET] - Lấy profile của user
module.exports.getProfile = async (req, res, next) => {
    try {
        const user = req.targetUser;

        const profileStatus = await getProfileStatus(user._id);

        return res.status(200).json({
        code: 200,
        message: "Lấy thông tin profile thành công",
        data: {
            _id: user._id,
            fullname: user.fullname,
            avatar: user.avatar,
            dateOfBirth: user.dateOfBirth,

            totalPosts: profileStatus.totalPosts,
            totalLikes: profileStatus.totalLikes,
            totalComments: profileStatus.totalComments,
        },
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

        return res.status(200).json({
            success: true,
            message: "Xóa người dùng thành công",
        });
    } 
    catch (error) {
        next(error);
    }
};