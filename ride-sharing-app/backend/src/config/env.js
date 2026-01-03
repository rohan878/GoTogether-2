const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/gotogether",
  JWT_SECRET: process.env.JWT_SECRET || "defaultsecret",
  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || ""
};
