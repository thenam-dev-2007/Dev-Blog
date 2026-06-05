const mongoose = require("mongoose");
const User = require("../models/user.model");

module.exports.loadUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        req.targetUser = user;

        next();
    } 
    catch (error) {
        next(error);
    }
};