const express = require("express");
require("dotenv").config();

const database = require("./config/database");
const routeClient = require("./routes/client/index.route");

const app = express();
const port = process.env.PORT;

// Kết nối database
database.connect();

routeClient(app);

// Middleware xử lý lỗi (phải đặt sau các route)
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
