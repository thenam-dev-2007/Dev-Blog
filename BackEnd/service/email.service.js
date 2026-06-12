const crypto = require("crypto");
const { transporter } = require("../config/email")

const generateEmailOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return { otp, hashedOTP, expiresAt };
}

const generateOTPAndSave = async (user, otpField, otpExpiresField) => {
    // otpField và otpExpiresField là biến chứa tên field, không phải tên field cố định.
    const {otp, hashedOTP, expiresAt} = generateEmailOTP();

    user[otpField] = hashedOTP;
    user[otpExpiresField] = expiresAt;
    // user["emailOTP"] = hashedOTP;
    // user["emailOTPExpires"] = expiresAt;
    // tuowgn đương:
    // user.emailOTP = hashedOTP;
    // user.emailOTPExpires = expiresAt;
    user.otpResendAt = new Date();

    await user.save({ validateBeforeSave: false });

    return otp;
};

const sendOTPEmail = async (email, otp) => {
    try {
        if (typeof email === "object" && email !== null) {
            otp = email.otp;
            email = email.email;
        }
        await transporter.sendMail({
            from: `"Blog Platform" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác thực tài khoản',
            html: `
                <div style="font-family: Arial">
                <h2>Xác thực email</h2>
                <p>Mã OTP của bạn là:</p>
                <h1 style="letter-spacing: 5px; color: #4CAF50; ">${otp}</h1>
                <p> OTP có hiệu lực trong 10 phút. </p>
                </div>
            `
            });
    } 
    catch (error) {
        throw error;
    }
}
module.exports = { generateEmailOTP, generateOTPAndSave, sendOTPEmail };