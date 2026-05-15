const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
        username: String,
        password: String,
        email: String,
        slug: {
            type: String,
            slug: "title",
            unique: true 
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


const User = mongoose.model("User", userSchema, "users")
                               // Tên model               // tìm connection tên là products
module.exports = User // xuất file model