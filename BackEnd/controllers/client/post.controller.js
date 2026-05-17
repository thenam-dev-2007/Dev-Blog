const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater")
mongoose.plugin(slug)

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

    slug: {
            type: String,
            slug: "title",
            unique: true 
        },

    likes: {
        type: Number,
        default: 0
    },

    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        content: {
            type: String,
            required: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
    // commentCount = comments.length
},
{
    timestamps: true
}
);

const Post = mongoose.model("Post", postSchema, "posts");
module.exports = Post;