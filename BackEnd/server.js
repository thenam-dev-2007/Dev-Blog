const express = require("express");
require("dotenv").config();

const cookieParser = require('cookie-parser');
const database = require("./config/database");
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const routeClient = require("./routes/client/index.route");
// const routeAdmin = require("./routes/admin/index.route");

const app = express();
const port = process.env.PORT;

// Kết nối database
database.connect();

// Middleware
app.use(express.json()); // Dùng để đọc dữ liệu dạng JSON.
app.use(express.urlencoded({ extended: true })); // Dùng để đọc dữ liệu từ: form HTML, dữ liệu kiểu application/x-www-form-urlencoded
app.use(cookieParser())

// Sử dụng middleware logger cho tất cả request
app.use(logger);

// Cho phép truy cập file trong thư mục upload
app.use("/upload", express.static("upload"));

// Routes
routeClient(app);
// app.use("/admin", routeAdmin);

// Middleware 404 dùng để xử lý các request đến đường dẫn không tồn tại trong hệ thống
app.use(notFound);

// Middleware xử lý lỗi (phải đặt sau các route)
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});