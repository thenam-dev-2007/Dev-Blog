const express = require("express");
require("dotenv").config();

const database = require("./config/database");
const routeClient = require("./routes/client/index.route");
// const routeAdmin = require("./routes/admin/index.route");

const app = express();
const port = process.env.PORT;

// Kết nối database
database.connect();

// Sử dụng middleware logger cho tất cả request
app.use(logger);

// Middleware
app.use(express.json()); // Dùng để đọc dữ liệu dạng JSON.
app.use(express.urlencoded({ extended: true })); // Dùng để đọc dữ liệu từ: form HTML, dữ liệu kiểu application/x-www-form-urlencoded

// Routes
routeClient(app);
// app.use("/admin", routeAdmin);

// Middleware xử lý lỗi (phải đặt sau các route)
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});