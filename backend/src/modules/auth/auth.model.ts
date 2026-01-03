import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },

    role: { type: String, default: "USER" }, // USER | ADMIN

    gender: { type: String, default: "other" },
    photo: { type: String }, // optional

    isPhoneVerified: { type: Boolean, default: false },
    isAdminApproved: { type: Boolean, default: false },

    kycStatus: { type: String, default: "NONE" }, // NONE | PENDING | APPROVED | REJECTED
    nidImage: { type: String },
    selfieImage: { type: String },

    dnd: { type: Boolean, default: false },

    lastKnownLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },

    // -------------------- Module 4: Optimization & Rewards --------------------
    // Rolling average of received ratings (behavior/punctuality/safety combined)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Reliability signals
    cancellations: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },

    // Soft penalty / reward
    reliabilityScore: { type: Number, default: 100 }, // 0..100
    discountPct: { type: Number, default: 0 }, // e.g. 0, 5, 10
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
