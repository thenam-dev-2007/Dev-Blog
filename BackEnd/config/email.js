const nodemailer = require("nodemailer");

// Tạo transporter với Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail', // Sử dụng service Gmail
    auth: {
        user: process.env.EMAIL_USER, // Địa chỉ email Gmail của bạn
        pass: process.env.EMAIL_PASS  // App Password 
    }
    });
// Kiểm tra kết nối
transporter.verify((error, success) => {
    if (error) {
        console.error('Lỗi kết nối email server:', error);
    } 
    else {
        console.log('Đã sẵn sàng gửi mail!');
    }
});

module.exports = { transporter };