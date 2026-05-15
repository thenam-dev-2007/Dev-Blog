// Middleware xử lý lỗi
module.exports.errorHandler = (err, req, res, next) => {
    // err: Là object lỗi được truyền vào.
    // req: Là request từ client
    // res: Dùng để trả response về client
    // next: Hàm chuyển sang middleware tiếp theo.
    console.log("Error: ", err.message); // Ghi log lỗi ra console

    // Xác định mã trạng thái HTTP 
    // Nếu không có, mặc định là 500 Internal Server Error
    const statusCode = err.statusCode || 500;

    // Trả về response lỗi
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
    }); 
};
