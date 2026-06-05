const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    content: {
        type: String,
        required: true
    },

    thumbnail: {
        type: String,
        default: "/images/default-post.png"
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    tags: [
        {
            type: String,
            trim: true
        }
    ],

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],

    comments: [
        new mongoose.Schema({
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            content: {
                type: String,
                required: true
            }
        },
        {
            timestamps: true
        })
    ],

    slug: {
        type: String,
        slug: "title",
        unique: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
},
{
    timestamps: true
});

const Post = mongoose.model("Post", postSchema, "posts");
module.exports = Post;