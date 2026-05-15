// [GET] //
module.exports.home = (req, res) => { 
    // Nếu bạn chỉ viết hàm home = (req, res) => { ... } thì hàm đó chỉ tồn tại trong file hiện tại, file khác không gọi được.
    // Khi bạn viết module.exports.home = ..., bạn đã gắn hàm index vào đối tượng exports của module, cho phép file khác require() và dùng nó.
    res.send('Hello World!');
}