const User = require("../../models/user.model.js");
const Post = require("../../models/post.model.js");
const paginationHelper = require("../../helper/pagination");


// [GET] //
module.exports.home = async (req, res, next) => {
    try {
        const find = { isDeleted: false };
        const countPosts = await Post.countDocuments(find);

        const objectPagination = paginationHelper(
            { currentPage: 1, limitPost: 4 },
            req.query,
            countPosts
        );

        const posts = await Post.find(find)
            .sort({ createdAt: -1 })
            .limit(objectPagination.limitItem)
            .skip(objectPagination.skip)
            .populate("author", "fullname avatar")
            .populate("comments.user", "fullname avatar")
            .lean();

        const topTags = await Post.aggregate([
            {
                $match: {
                    isDeleted: false
                }
            },
            {
                $unwind: "$tags"
            },
            {
                $group: {
                    _id: "$tags",
                    totalPosts: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    totalPosts: -1
                }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "tags",
                    localField: "_id",
                    foreignField: "_id",
                    as: "tag"
                }
            },
            {
                $unwind: "$tag"
            },
            {
                $project: {
                    _id: "$tag._id",
                    title: "$tag.title",
                    slug: "$tag.slug",
                    totalPosts: "$totalPosts"
                }
            }
        ]);

        const topAuthors = await Post.aggregate([
            {
                $match: {
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: "$author",
                    totalPosts: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    totalPosts: -1
                }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "author"
                }
            },
            {
                $unwind: "$author"
            },
            {
                $project: {
                    _id: "$author._id",
                    fullname: "$author.fullname",
                    avatar: "$author.avatar",
                    totalPosts: "$totalPosts"
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Lấy dữ liệu trang chủ thành công",
            pagination: {
                currentPage: objectPagination.currentPage,
                totalPage: objectPagination.totalPage,
                totalPosts: countPosts,
                limit: objectPagination.limitItem
            },
            posts,
            topTags,
            topAuthors
        });

    } 
    catch (error) {
        next(error);
    }
};