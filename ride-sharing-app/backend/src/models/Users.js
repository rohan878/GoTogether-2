const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // media URLs (later you can plug Cloudinary or file upload)
    photoUrl: { type: String },   // profile photo
    nidUrl: { type: String },     // NID image
    selfieUrl: { type: String },  // selfie for admin verification

    // verification flags
    isPhoneVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false }, // admin approves KYC

    // OTP data
    otpCode: { type: String },
    otpExpiresAt: { type: Date },

    // multipurpose login: user / rider / admin
    role: {
      type: String,
      enum: ["user", "rider", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
