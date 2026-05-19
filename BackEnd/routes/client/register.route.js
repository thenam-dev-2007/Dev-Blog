const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/register.controller");
const validation = require("../../middlewares/validation");

router.post("/", validation.validateCreateUser, controller.register); // Dấu : dùng để truyền data động
router.post("/check-username", controller.checkUsername);
router.post("/check-email", controller.checkEmail);
router.get("/inactive", controller.getInactiveUsers);
router.post("/:id/restore", controller.restoreAccount);

module.exports = router;