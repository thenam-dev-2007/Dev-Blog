const express = require("express");
require("dotenv").config();

const database = require("./config/database");
const routeClient = require("./routes/client/index.route");
const routeAdmin = require("./routes/admin/index.route");

const app = express();
const port = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối database
database.connect();

// Routes
routeClient(app);
app.use("/admin", routeAdmin);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});