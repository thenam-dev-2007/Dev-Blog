const express = require("express");
require("dotenv").config();

const database = require("./config/database");
const routeClient = require("./routes/client/index.route");
// const routeAdmin = require("./routes/admin/index.route");

const app = express();
const port = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối database
database.connect();

// Sử dụng middleware logger cho tất cả request
app.use(logger);

// Routes
routeClient(app);
// app.use("/admin", routeAdmin);

// Middleware xử lý lỗi (phải đặt sau các route)
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});