const mongoose = require("mongoose");
const Post = require("../models/post.model");

module.exports = async (userId) => {
    const result = await Post.aggregate([
        {
            $match: {  // $match: lọc ra các document thỏa điều kiện.
                author: new mongoose.Types.ObjectId(userId),
                isDeleted: false
            }
        },
        {
            $group: {  // Gộp tất cả document thành 1 nhóm
                _id: null,

                totalPosts: {
                    $sum: 1  // Mỗi document cộng thêm 1
                },

                totalLikes: {
                    $sum: {
                        $size: {
                            $ifNull: ["$likes", []]
                        }
                    }
                },

                totalComments: {
                    $sum: {
                        $size: {
                            $ifNull: ["$comments", []]
                        }
                    }
                }
            }
        }
    ]);

    return result[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0
    };
};