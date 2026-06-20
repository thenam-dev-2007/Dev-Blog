require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const database = require("./config/database");
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const routeClient = require("./routes/client/index.route");
const routeAdmin = require("./routes/admin/index.route");

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
};

// Bật CORS trước routes
app.use(cors(corsOptions));

// Kết nối database
database.connect();

// Middleware
app.use(express.json({ limit: "10kb" }));
app.use((req, res, next) => {
    console.log("Request received:", req.method, req.url);
    next();
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logger
app.use(logger);

// Cho phép truy cập file trong thư mục upload
app.use("/upload", express.static("upload"));

// Routes
routeClient(app);
routeAdmin(app);

// Middleware 404
app.use(notFound);

// Middleware xử lý lỗi
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});