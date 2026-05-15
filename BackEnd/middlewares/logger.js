// Middleware logging - ghi lại thông tin request
module.exports.logger = (req, res, next) => {
    const start = Date.now(); // Lấy thời gian bắt đầu
    
    // Lắng nghe sự kiện khi response hoàn thành
    res.on('finish', () => {
        const duration = Date.now() - start; // Tính thời gian xử lý
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    
    // Chuyển đến middleware tiếp theo
    next();
};