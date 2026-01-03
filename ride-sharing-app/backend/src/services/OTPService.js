const { OTP_EXPIRY_MINUTES } = require("../config/env");

// generate a 6-digit OTP
function generateOTP() {
  return "" + Math.floor(100000 + Math.random() * 900000);
}

function getExpiryDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + OTP_EXPIRY_MINUTES);
  return now;
}

module.exports = {
  generateOTP,
  getExpiryDate
};
