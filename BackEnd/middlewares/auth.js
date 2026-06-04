const jwt = require("jsonwebtoken");

module.exports.authenticate = async (req, res, next) => {
    try {
        // Bước 1: Lấy token từ header Authorization
        // Format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
        });
        }
        // Tách token từ chuỗi "Bearer <token>"
        const token = authHeader.split(' ')[1];

        // Bước 2: Kiểm tra token có tồn tại không
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Bạn chưa đăng nhập",
            });
        }

        // Bước 4: Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Tìm user từ decoded token
        const user = await User.findById(decoded._id).select("_id username email role isActive"); // nếu không có select sẽ lấy toàn bộ document

        if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ. Người dùng không tồn tại.'
        });
        }
        // Gắn thông tin user vào request để sử dụng ở các middleware/controller tiếp theo
        req.user = user;
        // req.user không phải thuộc tính có sẵn của Express. Đây là một thuộc tính mà middleware xác thực tự thêm vào object req
        // Ví dụ: router.get("/profile", authenticateToken, (req, res) => {
                //     console.log(req.user);
                // });

                // Nếu middleware gắn:
                // req.user = {
                //     _id: "123",
                //     username: "nam"
                // };

                // thì controller sẽ nhận được:
                // {
                //     _id: "123",
                //     username: "nam"
                // }
        next();
    } 
    catch (error) {
        // Xử lý các lỗi JWT cụ thể
        if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
        }
        if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
        });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ' ,
        });
    }
};

/**
 * Middleware: authorizeAdmin
 * 
 * Mục đích: Kiểm tra xem user có phải admin không
 * 
 * Cách sử dụng:
 * - Thêm sau authenticate middleware
 * - Router.delete("/admin/users/:id", authenticate, authorizeAdmin, controller.handler)
 * 
 * Quy trình:
 * 1. Kiểm tra req.user có tồn tại không (phải có authenticateToken trước)
 * 2. Kiểm tra req.user.role === 'admin'
 * 3. Nếu không phải admin, trả về 403
 * 4. Nếu là admin, gọi next()
 * 
 * Trả về:
 * - 403: Người dùng không có quyền admin
 */
module.exports.authorizeAdmin = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập tài nguyên này',
            error: 'PERMISSION_DENIED',
        });
    }
    // Người dùng có quyền admin, tiếp tục xử lý request
    next();
};

/**
 * Middleware: authorizeOwnerOrAdmin
 * 
 * Mục đích: Kiểm tra xem user có phải chủ sở hữu tài nguyên hoặc admin không
 * 
 * Cách sử dụng:
 * - Thêm sau authenticateToken middleware
 * - Router.put("/posts/:id", authenticateToken, authorizeOwnerOrAdmin, controller.updatePost)
 * 
 * Quy trình:
 * 1. Lấy ID của tài nguyên từ URL (req.params.id)
 * 2. So sánh với ID của user hiện tại (req.user._id)
 * 3. Nếu user là chủ sở hữu HOẶC là admin, cho phép
 * 4. Nếu không, trả về 403
 * 
 * Ví dụ:
 * - User A có bài viết ID = 5
 * - User A request: PUT /api/posts/5 --> ALLOW (chủ sở hữu)
 * - User B request: PUT /api/posts/5 --> DENY (không phải chủ sở hữu)
 * - Admin request: PUT /api/posts/5 --> ALLOW (là admin)
 * 
 * Trả về:
 * - 403: Người dùng không có quyền sửa đổi tài nguyên
 */
module.exports.authorizeOwnerOrAdmin = async (req, res, next) => {
    const resourceOwnerId = req.params.id;
    
    // Lấy ID của user hiện tại từ JWT token (đã được set bởi authenticate)
    const userId = req.user._id.toString();
    
    if (userId !== resourceOwnerId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập tài nguyên này',
            error: 'PERMISSION_DENIED',
        });
    }
    // Người dùng là chủ sở hữu hoặc admin, tiếp tục xử lý request
    next();
};