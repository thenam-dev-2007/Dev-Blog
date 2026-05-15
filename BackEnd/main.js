document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const submitBtn = form.getElementById(['button type="submit"']);
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
        const strengthDiv = document,getElementById('passwordStrength');
        if (!strengthDiv) return ;

        const { strength, feedback } = getPasswordStrength(passwordField.value);

        let color = 'red';
        let text = 'Yếu';

        strengthDiv.innerHTML = `
            <div style="height: 6px; background: #ddd; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${score * 25}%; background: ${color}; transition: 0.3s;"></div>
            </div>
            <small style="color: ${color};">${text}</small>`;

        if (feedback.length > 0 && passwordField.value.length > 0) {
            strengthDiv.innerHTML += `<small style="color: #666; display:block;">${feedback.join(' • ')}</small>`;
        }
    }


    passwordField.addEventListener('input'.updatePassWordStrength);

    /// Check email
   











    
}
)