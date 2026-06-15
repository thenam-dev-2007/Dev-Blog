const API_URL = "http://127.0.0.1:3000/api/auth";

let registeredEmail = "";

function showOtpStep(email) {
  registeredEmail = email;

  document.getElementById("register-form")?.classList.add("hidden");
  document.getElementById("register-otp-box")?.classList.remove("hidden");
  document.getElementById("otp-email-target").textContent = email;
}

function showMessage(message, type = "success") {
  const messageBox = document.getElementById("register-message");

  messageBox.innerHTML = `
        <div class="${type}">
            ${message}
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const otpForm = document.getElementById("register-otp-form");
  const resendBtn = document.getElementById("btn-resend-register-otp");

  // ================= REGISTER =================
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullname = document.getElementById("reg-fullname").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;
    const dateOfBirth = document.getElementById("reg-dob").value;
    const agree = document.getElementById("agree").checked;

    if (!fullname || !email || !password || !confirm || !dateOfBirth) {
      return showMessage("Vui lòng nhập đầy đủ thông tin", "error");
    }

    if (password !== confirm) {
      return showMessage("Mật khẩu xác nhận không khớp", "error");
    }

    if (!agree) {
      return showMessage("Bạn cần đồng ý điều khoản", "error");
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullname,
          email,
          password,
          confirmPassword: confirm, // Đổi từ confirm thành confirmPassword để khớp với Backend validation
          dateOfBirth,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({ message: "Lỗi phản hồi từ server" }));

      if (!response.ok) {
        // Backend trả về mảng 'errors' nếu validation thất bại
        const errorMsg =
          result.message ||
          (result.errors && result.errors[0].msg) ||
          "Đăng ký thất bại";
        return showMessage(errorMsg, "error");
      }

      showMessage(result.message, "success");
      showOtpStep(result.data.email);
    } catch (error) {
      console.error(error);
      showMessage("Không thể kết nối tới server", "error");
    }
  });

  // ================= VERIFY OTP =================
  otpForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const otp = document.getElementById("register-otp").value.trim();

    try {
      const response = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: registeredEmail,
          otp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return showMessage(result.message, "error");
      }

      localStorage.setItem("accessToken", result.data.accessToken);

      showMessage("Xác thực email thành công", "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (error) {
      console.error(error);
      showMessage("Không thể kết nối tới server", "error");
    }
  });

  // ================= RESEND OTP =================
  resendBtn?.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_URL}/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return showMessage(result.message, "error");
      }

      showMessage(result.message, "success");
    } catch (error) {
      console.error(error);
      showMessage("Không thể kết nối tới server", "error");
    }
  });
});
