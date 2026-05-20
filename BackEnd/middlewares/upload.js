const multer = require("multer"); // Thư viện uppload ảnh

// Hàm tạo storage theo folder
const storageMulter = (folder) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, folder);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + "-" + file.originalname);
        },
    });
};

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        // file.mimetype là kiểu mime của file upload. (ví dụ: avatar.png --> mimetype: image/png)
        return cb(
            new Error("Chỉ chấp nhận file ảnh JPEG, PNG, WebP")
        );
    }

    cb(null, true); // true: Chấp nhận file
};

// Hàm tạo upload
const createUpload = (folder, maxSizeMB) => {
    return multer({
        storage: storageMulter(folder),
        fileFilter,
        limits: {
            fileSize: maxSizeMB * 1024 * 1024,
        },
    });
};

// Upload avatar
const uploadAvatar = createUpload(
    "upload/avatar",
    5
);

// Upload thumbnail
const uploadThumbnail = createUpload(
    "upload/thumbnail",
    10
);

module.exports = {
    uploadAvatar,
    uploadThumbnail,
};

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