const jwt = require("jsonwebtoken");

/**
 * === AUTHENTICATION & AUTHORIZATION MIDDLEWARE ===
 * Các middleware cho xác thực và phân quyền
 */

/**
 * Middleware: authenticateToken
 * 
 * Mục đích: Kiểm tra JWT token từ header Authorization
 * 
 * Cách sử dụng:
 * - Thêm middleware này vào các route yêu cầu authentication
 * - Router.get("/protected", authenticateToken, controller.handler)
 * 
 * Header yêu cầu:
 * Authorization: Bearer <JWT_TOKEN>
 * 
 * Quy trình:
 * 1. Lấy token từ header Authorization
 * 2. Kiểm tra token có tồn tại không
 * 3. Xác thực token dùng JWT_SECRET
 * 4. Nếu thành công, gắn user info vào req.user
 * 5. Gọi next() để tiếp tục request
 * 
 * req.user sẽ chứa: { _id, username, email, role, iat, exp }
 * 
 * Có thể trả về:
 * - 401: Chưa đăng nhập (không có token)
 * - 401: Token hết hạn (TokenExpiredError)
 * - 403: Token không hợp lệ
 * - 500: Lỗi server
 */
module.exports.authenticateToken = async (req, res, next) => {
    try {
        let token;

        // Bước 1: Lấy token từ header Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Bước 2: Kiểm tra token có tồn tại không
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Bạn chưa đăng nhập",
            });
        }

        // Bước 4: Xác thực token
        // jwt.verify(token, secret, callback)
        // - token: JWT token cần xác thực
        // - process.env.JWT_SECRET: Secret key để verify token
        // - callback(err, user): Hàm callback khi xác thực hoàn tất
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Tìm user từ decoded token
        const user = await User.findById(decoded._id);
        if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ. Người dùng không tồn tại.'
        });
        }
        // Gắn thông tin user vào request để sử dụng ở các middleware/controller tiếp theo
        req.user = user;
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
 * - Thêm sau authenticateToken middleware
 * - Router.delete("/admin/users/:id", authenticateToken, authorizeAdmin, controller.handler)
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
module.exports.authorizeAdmin = (req, res, next) => {
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
module.exports.authorizeOwnerOrAdmin = (req, res, next) => {
    // Lấy ID của tài nguyên từ URL parameters
    // Ví dụ: /api/posts/5 --> req.params.id = "5"
    const resourceOwnerId = req.params.id;
    
    // Lấy ID của user hiện tại từ JWT token (đã được set bởi authenticateToken)
    const userId = req.user._id.toString();
    
    // Kiểm tra:
    // 1. userId !== resourceOwnerId: User không phải chủ sở hữu
    // 2. req.user.role !== 'admin': User không phải admin
    // Nếu cả 2 điều kiện đều đúng, thì user không có quyền
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