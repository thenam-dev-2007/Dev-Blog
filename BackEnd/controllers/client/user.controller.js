const User = require("../../models/user.model");

// [GET] //
module.exports.getUserById = async (req, res, next) => {
    try {
        // Bước 1: Lấy ID từ params của request
        const userId = req.params.id;

        // Bước 2: Kiểm tra xem id có được cung cấp không;
        if(!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Bước 3: Gọi model để tìm user
        const user = await User.findById(userId);

        // Bước 4: Kiểm tra xem user có tồn tại không
        if(!user) {
            // Nếu không, trả về lỗi 404 Not Found
            return res.status(404).json({
                success: false,
                message: `User with ID ${userId} not found`
            });
        }

        // Bước 5: Trả về thông tin user
        res.status(200).json({
            success: true,
            data: user
        });
    }
    catch(error) {
        // Nếu có lỗi không mong muốn, chuyển cho error handler
        next(error);
    }
}

// [POST] //
module.exports.createUser = async (req, res, next) => {
    try {
         // Lấy dữ liệu từ request body
    const { username, email, password, dateOfBirth, role } = req.body;

    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await User.findOne({
        // $or là toán tử của MongoDB dùng để kiểm tra: Chỉ cần một điều kiện đúng là document sẽ được tìm thấy.
        $or: [
            { username: username.toLowerCase() }, // Chuyển username thành chữ thường
            { email: email.toLowerCase() }
        ]
    });

    if (existingUser) {
      // Nếu đã tồn tại, trả về lỗi 409 (Conflict)
        return res.status(409).json({
            success: false,
            message: 'Username hoặc email đã được sử dụng',
            error: 'DUPLICATE_USER'
        });
    }

    // Tạo user mới trong database
    const newUser = await User.create({
        username: username.toLowerCase(), // Chuẩn hóa username
        email: email.toLowerCase(),
        password, // Sẽ được mã hóa tự động bởi pre-save middleware
        dateOfBirth,
        role: role || 'user' // Mặc định là 'user' nếu không cung cấp
    });

    // Không trả về password trong response (mặc dù select: false đã làm điều này)
    // Nhưng vẫn cần chắc chắn
    newUser.password = undefined;

    // Trả về response thành công với status 201 (Created)
    res.status(201).json({
        success: true,
        message: 'Tạo user thành công',
        data: {
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                dateOfBirth: newUser.dateOfBirth,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        }
    });
    }
    catch (error) {
        // Chuyển lỗi cho error handler middleware
        next(error);
    }
}

// [PUT] //
module.exports.updateUser = async (req, res, next) => {
    try {
        // Bước 1: Lấy ID từ URL params 
        const userId = req.params.id;

        // Bước 2: Kiểm tra xem id có được cung cấp không;
        if(!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Bước 3: Gọi model để tìm user
        const user = await User.findById(userId);

        // Bước 4: Kiểm tra xem user có tồn tại không
        if(!user) {
            // Nếu không, trả về lỗi 404 Not Found
            return res.status(404).json({
                success: false,
                message: `User with ID ${userId} not found`
            });
        }

        // Bước 5: Lấy dữ liệu từ body request
        const { username, password, email, dateOfBirth } = req.body;

        // Bước 6: Update dữ liệu
        user.username = username;
        user.email = email.toLowerCase();
        user.dateOfBirth = dateOfBirth;

        // Nếu có password mới
        // pre('save') middleware sẽ tự hash
        if (password) {
            user.password = password;
        }

        // Nếu có upload avatar
        if (req.file) {
            user.avatar = `/upload/${req.file.filename}`;
        }

        // Bước 7: Save user
        await user.save();
        
        // Không trả password về client
        const userResponse = user.toObject();
        delete userResponse.password;

        // Bước 8: Response
        return res.status(200).json({
            success: true,
            message: "Cập nhật dữ liệu thành công",
            data: userResponse
        });
    }
    catch (error) {
        next(error);
    }
}
