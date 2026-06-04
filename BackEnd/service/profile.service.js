const mongoose = require("mongoose");
const Post = require("../models/post.model");

module.exports = async (userId) => {
    const result = await Post.aggregate([
        {
        $match: {
            author: new mongoose.Types.ObjectId(userId),
        },
        },
        {
        $group: {
            _id: null,

            totalPosts: {
            $sum: 1,
            },

            totalLikes: {
            $sum: "$likes",
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
    ]);

    return (
        result[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        }
    );
};