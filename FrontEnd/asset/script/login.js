//  login.html
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        showError("Vui lòng nhập đầy đủ thông tin!", "loginError");
        return;
    }

    showLoading("Đang đăng nhập");

    try {
        const result = await login(username, password );
        hideLoading();
        if (result.code === 200) {
            toast("Đăng nhập thành công!", "success");
            // Lưu thông tin người dùng vào localStorage
            saveUserInfo(result.data);
            // Chuyển hướng về trang chủ
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } else {
            showError(result.message || "Đăng nhập thất bại. Vui lòng thử lại.", "loginError");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi : " + error.message, "loginError");
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});
