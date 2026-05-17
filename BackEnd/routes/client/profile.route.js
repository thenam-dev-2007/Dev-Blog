const express = require("express");
const router = express.Router();

const multer = require("multer"); // Thư viện uppload ảnh
// Cấu hình multer
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'upload/');
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });
// multer.diskStorage(): Dùng để cấu hình cách Multer lưu file vào ổ đĩa.
// destination: Quy định lưu file ở đâu
    // req: Request từ Express.
    // file: Thông tin file upload.
    // cb: Callback của Multer. (cb(error, value))
    // cb(null, 'upload/')
    //    null → không có lỗi
    //    'upload/' → thư mục lưu file
// filename: Quy định tên file sau khi upload
    // file.originalname: Tên file gốc từ client.
    // Date.now(): Lấy timestamp hiện tại.
    // Date.now() + '-' + file.originalname --> Ghép tên file
    // cb(null, filename) --> Lưu file với tên "Date.now() + '-' + file.originalname" 
const storageMulter = (folder) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, folder);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        },
    });
};
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
        // file.mimetype là kiểu mime của file upload. (ví dụ: avatar.png --> mimetype: image/png)
        return cb(new Error('Chỉ cho phép upload ảnh'));
    }
    cb(null, true);
    // true: chấp nhận file này
};
const uploadAvatar = multer({ 
    storage: storageMulter('upload/avatar'),
    fileFilter,
    limits: {
        // Giới hạn dung lượng
        fileSize: 5 * 1024 * 1024
    }
});

const controller = require("../../controllers/client/user.controller.js");
const validation = require("../../middlewares/validation.js");

router.get("/:id", controller.getUserById);
router.put("/:id", uploadAvatar.single('avatar'), validation.validateUpdateUser, controller.updateUser);

module.exports = router