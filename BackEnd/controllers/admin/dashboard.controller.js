const User = require("../../models/user.model")
const Post = require("../../models/post.model");
const mongoose = require("mongoose");

module.exports.dashboard = async (req, res, next) => {
    try {
        const [totalUsers, statsResult, latestPosts, topAuthors] = await Promise.all([
            // chạy nhiều query cùng lúc (MongoDB xử lý song song)

            // Tổng số user
            User.countDocuments({role: "user", isActive: true}),

            // Thống kê bài viết, like, comment
            Post.aggregate([
            {
                $match: {
                    // Lọc bài viết
                    isDeleted: false,
                },
            },
            {
                $group: {
                // tất cả document được gom thành 1 nhóm duy nhất
                    _id: null,

                    totalPosts: {
                        // mỗi document cộng thêm 1
                        $sum: 1,
                    },

                    totalLikes: {
                        $sum: {
                            // cộng tất cả lại
                            $size: {
                                // Đếm số phần tử trong mảng.
                                $ifNull: ["$likes", []], // nếu like = null --> đổi thành []
                            },
                        },
                    },

                    totalComments: {
                        $sum: {
                            $size: {
                                $ifNull: ["$comments", []],
                            },
                        },
                    },
                },
            },
            ]),

            // 3 bài viết mới nhất
            Post.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(3)
                .populate("author", "fullname")
                .select("title thumbnail createdAt author"),

            // 3 người có nhiều bài viết nhất
            Post.aggregate([
            {
                $match: {
                    isDeleted: false,
                },
            },
            {
                $group: {
                    // gom bài viết theo từng user.
                    _id: "$author",
                    totalPosts: {
                        // đếm số bài
                        $sum: 1,
                    },
                },
            },
            {
                $sort: {
                    // sắp xếp
                    totalPosts: -1,
                },
            },
            {
                // lấy 3 người
                $limit: 3,
            },
            {
                $lookup: {
                    // join với collection user
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                // Bóc mảng user
                $unwind: "$user",
                // ví dụ:
                // user: [                            user: {
                //     {`                                    fullname: "Nam"
                //         fullName: "Nam"   -->      }
                //     }
                // ]
            },
            {
                $project: {
                    // chọn field cần trả về
                    _id: "$user._id",
                    fullname: "$user.fullname",
                    avatar: "$user.avatar",
                    totalPosts: 1,
                },
            },
            ]),
        ]);

        const stats = statsResult[0] || {
            totalPosts: 0,
            totalLikes: 0,
            totalComments: 0,
        };

        res.status(200).json({
            success: true,
            message: "Lấy dữ liệu dashboard thành công",
            data: {
                statistics: {
                    totalUsers,
                    totalPosts: stats.totalPosts,
                    totalLikes: stats.totalLikes,
                    totalComments: stats.totalComments,
                },
                latestPosts,
                topAuthors,
            },
        });
    } 
    catch (error) {
        next(error);
    }
};
