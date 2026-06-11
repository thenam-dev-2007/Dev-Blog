let registeredEmail = "";

function showOtpStep(email) {
    registeredEmail = email;
    const registerForm = document.getElementById("register-form");
    const otpBox = document.getElementById("register-otp-box");
    const emailTarget = document.getElementById("otp-email-target");

    if (registerForm) registerForm.classList.add("hidden");
    if (otpBox) otpBox.classList.remove("hidden");
    if (emailTarget) emailTarget.textContent = email;
}

async function finishEmailVerification(result) {
    setAccessToken(result.data?.accessToken);

    // verify-email của backend chỉ trả accessToken, nên lấy thêm profile nếu có thể.
    const profile = await getProfile();
    if (resultOk(profile) && profile.data) saveUserInfo(profile.data);

    showMessage("Xác thực email thành công. Đang chuyển về trang chủ...", "register-message", "success");
    setTimeout(() => window.location.href = "index.html", 800);
}

document.addEventListener("DOMContentLoaded", () => {
    const paramsEmail = getQueryParam("email");
    const verifyMode = getQueryParam("verify");
    if (paramsEmail && verifyMode) showOtpStep(paramsEmail);

    const registerForm = document.getElementById("register-form");
    const otpForm = document.getElementById("register-otp-form");
    const resendBtn = document.getElementById("btn-resend-register-otp");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = document.getElementById("reg-username")?.value.trim();
            const email = document.getElementById("reg-email")?.value.trim();
            const password = document.getElementById("reg-password")?.value;
            const confirm = document.getElementById("reg-confirm")?.value;
            const dateOfBirth = document.getElementById("reg-dob")?.value;
            const agree = document.getElementById("agree")?.checked;

            if (!username || !email || !password || !confirm || !dateOfBirth) {
                showMessage("Vui lòng nhập đầy đủ thông tin.", "register-message", "error");
                return;
            }
            if (password !== confirm) {
                showMessage("Mật khẩu xác nhận không khớp.", "register-message", "error");
                return;
            }
            if (!agree) {
                showMessage("Bạn cần đồng ý điều khoản để đăng ký.", "register-message", "error");
                return;
            }

            showLoading("Đang tạo tài khoản...");
            const result = await register(username, email, password, dateOfBirth);
            hideLoading();

            if (resultOk(result)) {
                showMessage(result.message || "Đã gửi OTP về email.", "register-message", "success");
                showOtpStep(result.data?.email || email);
            } else {
                showMessage(getErrorMessage(result, "Đăng ký thất bại"), "register-message", "error");
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = registeredEmail || document.getElementById("reg-email")?.value.trim();
            const otp = document.getElementById("register-otp")?.value.trim();

            if (!email || !otp) {
                showMessage("Vui lòng nhập OTP.", "register-message", "error");
                return;
            }

            showLoading("Đang xác thực OTP...");
            const result = await verifyRegisterEmail(email, otp);
            hideLoading();

            if (resultOk(result)) await finishEmailVerification(result);
            else showMessage(getErrorMessage(result, "Xác thực OTP thất bại"), "register-message", "error");
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
            const email = registeredEmail || document.getElementById("reg-email")?.value.trim();
            if (!email) return;

            showLoading("Đang gửi lại OTP...");
            const result = await resendRegisterOTP(email);
            hideLoading();

            if (resultOk(result)) showMessage(result.message || "Đã gửi lại OTP.", "register-message", "success");
            else showMessage(getErrorMessage(result, "Không gửi lại được OTP"), "register-message", "error");
        });
    }
});
