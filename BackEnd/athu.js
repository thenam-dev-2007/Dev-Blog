document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const message = document.getElementById('message');

    const passwordField = document.getElementById('register-password');
    const confirmPasswordField = document.getElementById('register-confirm');
    const emailField = document.getElementById('register-email');

    /// Chekc Pass mạnh
    function getPasswordStrength(password) {
        let strength = 0;
        const feedback = [];

        if (password.length >= 8) strength ++;
        else feedback.push('Ít nhất có 8 ký tự');
        
        if (/[A-Z]/.test(password)) strength ++;
        else feedback.push('Ít nhất có 1 chữ hoa');

        if (/[a-z]/.test(password)) strength ++;
        else feedback.push('Ít nhất có 1 chữ thường');

        if (/[0-9]/.test(password)) strength ++;
        else feedback.push('Ít nhất có 1 số');

        if (/[^A-Za-z0-9]/.test(password)) strength ++;
        else feedback.push('Ít nhất có 1 ký tự đặc biệt');

        return { strength, feedback };
    }

    function updatePassWordStrength() {
        const strengthDiv = document.getElementById('passwordStrength');
        if (!strengthDiv) return ;

        const { strength, feedback } = getPasswordStrength(passwordField.value);

        let color = 'red';
        let text = 'Yếu';

        if (strength >= 5) {
            color = 'green';
            text = 'Mạnh';
        } else if (strength >= 3) {
            color = 'orange';
            text = 'Trung bình';
        }

        strengthDiv.innerHTML = `
            <div style="height: 6px; background: #ddd; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${strength * 20}%; background: ${color}; transition: 0.3s;"></div>
            </div>
            <small style="color: ${color};">${text}</small>`;

        if (feedback.length > 0 && passwordField.value.length > 0) {
            strengthDiv.innerHTML += `<small style="color: #666; display:block;">${feedback.join(' • ')}</small>`;
        }
    }


    passwordField.addEventListener('input', updatePassWordStrength);

    // ================== DEBOUNCE KIỂM TRA EMAIL ==================
    let timeout;
    async function checkEmailExists(email) {
        if (!email) return;

        const emailMessage = document.getElementById('emailMessage') || 
                            createEmailMessageElement();

        emailMessage.textContent = 'Đang kiểm tra...';
        emailMessage.style.color = 'blue';

        try {
            // Giả lập API call - thay bằng API thật của bạn
            const response = await fetch('https://your-api.com/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.exists) {
                emailMessage.textContent = 'Email này đã được sử dụng!';
                emailMessage.style.color = 'red';
            } else {
                emailMessage.textContent = 'Email có thể sử dụng ✓';
                emailMessage.style.color = 'green';
            }
        } catch (err) {
            emailMessage.textContent = '';
        }
    }

    function createEmailMessageElement() {
        const div = document.createElement('small');
        div.id = 'emailMessage';
        emailField.parentNode.appendChild(div);
        return div;
    }

    emailField.addEventListener('input', function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            checkEmailExists(this.value.trim());
        }, 800); // Debounce 800ms
    });

    // ================== TOGGLE PASSWORD ==================
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                togglePassword.textContent = '🙈';
            } else {
                passwordField.type = 'password';
                togglePassword.textContent = '👁️';
            }
        });
    }

    // ================== SUBMIT FORM ==================
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullName = document.getElementById('register-name').value.trim();
        const email = emailField.value.trim();
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        const phone = document.getElementById('register-phone')?.value.trim() || '';

        message.textContent = '';
        message.style.color = '';


        if (!fullName) return showError('Vui lòng nhập họ và tên');
        if (!email) return showError('Vui lòng nhập email');
        if (!isVaildEmail(email)) return showError('Email không hợp lệ');
        if (!password) return showError('Vui lòng nhập mật khẩu');
        if (password.length < 8) return showError('Mật khẩu phải có ít nhất 8 ký tự');

        const strength = getPasswordStrength(password);
        if (strength.strength < 3) return showError('Mật khẩu chưa đủ mạnh. Vui lòng thêm chữ hoa, số và ký tự đặc biệt.');

        if (password !== confirmPassword) return showError('Mật khẩu xác nhận không khớp');


        setLoading(true);

        try {
            const response = await fetch('https://your-api.com/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName,
                    email,
                    phone,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                message.style.color = 'green';
                message.textContent = 'Đăng ký thành công! 🎉';
                form.reset();
                // window.location.href = '/login.html';
            } else {
                handleServerError(response.status, data);
            }
        } catch (error) {
            showError('Lỗi kết nối. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    });

    function isVaildEmail(email){
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showError(msg) {
        message.style.color = 'red';
        message.textContent = msg;
    }

    function setLoading(isLoading) {
        if (isLoading){
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang đăng ký...';
            submitBtn.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng ký';
            submitBtn.style.opacity = '1';
        }
    }

    function handleServerError(status, data) {
        switch (status) {
            case 409 :
                showError('Email đã tồn tại. Vui lòng sử dụng email khác.');
                break;
            case 400:
                showError(data.message || 'Dữ liệu gửi lên không hợp lệ.');
                break;
            case 422:
                showError('Thông tin không hợp lệ. Vui lòng kiểm tra lại.');
                break;
            default:
                showError(data.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        }       
    }
});
