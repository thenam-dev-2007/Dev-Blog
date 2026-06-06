const RefreshToken = require("../models/refreshToken.model");

const logoutAllDevices = async (userId) => {
    return await RefreshToken.deleteMany({ userId });
};

module.exports = { logoutAllDevices };