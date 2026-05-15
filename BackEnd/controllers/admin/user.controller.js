const User = require("../../models/user.model");

// [GET] //
module.exports.getUser = async () => {
    try {
        res.status(200).json({
            success: true,
            count: User.length,
            data: User,
        });
    }
    catch(error) {
        // Nếu có lỗi không mong muốn, chuyển cho error handler
        next(error);
    }
}