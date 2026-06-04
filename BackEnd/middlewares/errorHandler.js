// Middleware xử lý lỗi toàn cục
// Phải có 4 tham số (err, req, res, next) để Express nhận diện là error handler
module.exports = (err, req, res, next) => {
  console.error('Lỗi chi tiết:', err.stack); // Ghi log lỗi cho developer
  
  // Trả về response lỗi cho client
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server nội bộ',
  });
};
