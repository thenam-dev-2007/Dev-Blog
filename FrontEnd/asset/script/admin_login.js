const API_URL = "http://127.0.0.1:3000/api/admin/auth/login";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("admin-login-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById("adminEmail")?.value.trim();

        const password =
            document.getElementById("adminPassword")?.value;

        if (!email || !password) {
            showMessage("Vui lòng nhập email và mật khẩu.", "admin-login-message", "error");
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const result = await response.json();
            console.log("API RESPONSE:", result);

            if (!response.ok) { // response.ok được trình duyệt tự tạo. response.ok === (status >= 200 && status < 300)
                showMessage(result.message || "Đăng nhập thất bại", "admin-login-message", "error");
                return;
            }

            if (result.data.user.role !== "admin") {
                showMessage("Bạn không có quyền truy cập trang quản trị", "admin-login-message", "error");
                return;
            }

            localStorage.setItem("adminAccessToken", result.data.accessToken);
            localStorage.setItem("adminUser", JSON.stringify(result.data.user));

            showMessage("Đăng nhập thành công. Đang chuyển trang...", "admin-login-message", "success");
            setTimeout(() => { window.location.href = "admin.html" }, 600);

        } 
        catch (error) {
            console.error(error);

            showMessage("Không thể kết nối tới server.", "admin-login-message", "error");
        } 
    });
});