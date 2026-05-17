// register.html - Trang đăng ký

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById("username")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    const passwordConfirm = document.getElementById("passwordConfirm")?.value;

    if (!username || !email || !password || !passwordConfirm) {
        toast("Vui lòng điền tất cả thông tin", "error");
        return;
    }

    if (password !== passwordConfirm) {
        toast("Mật khẩu không khớp", "error");
        return;
    }

    if (password.length < 8) {
        toast("Mật khẩu phải ít nhất 8 ký tự", "error");
        return;
    }

    showLoading("Đang đăng ký...");

    try {
        const result = await register(username, email, password, passwordConfirm);
        hideLoading();

        if (result.code === 201) {
            toast("Đăng ký thành công!", "success");
            
            // Redirect to login sau 1.5 giây
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
        } else {
            toast(result.message || "Đăng ký thất bại", "error");
        }
    } catch (error) {
        hideLoading();
        console.error("Lỗi:", error);
        toast("Lỗi: " + error.message, "error");
    }
}

// Event listener for form
document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
});