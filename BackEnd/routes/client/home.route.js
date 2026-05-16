const express = require("express");
const router = express.Router(); // Tạo ra các router (Router() là hàm của express)

const controller = require("../../controllers/client/home.controller.js");

router.get(
    '/', 
    controller.home
);

module.exports = router;