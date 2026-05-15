const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater")
mongoose.plugin(slug)

const userSchema = new mongoose.Schema({
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            unique: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        avatar: {
            type: String,
            default: "https://sloganhay.com/avatar-mac-dinh-facebook/"
        },

        dateOfBirth: {
            type: Date
        },

        deleted: {
            type: Boolean,
            default: false
        },

        deletedAt: Date
    }, 
    {
        timestamps: true
    }
)


const User = mongoose.model("User", userSchema, "users");
                            // Tên model      // tìm connection tên là products
module.exports = User; // xuất file model