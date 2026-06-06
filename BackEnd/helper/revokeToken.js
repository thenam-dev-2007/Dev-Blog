const { logoutAllDevices } = require("../../service/auth.service")

const revokeToken = async (userId, res) => {
    await logoutAllDevices(userId);
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    });
};

module.exports = { revokeToken }