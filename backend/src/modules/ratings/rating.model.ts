import mongoose, { Schema } from "mongoose";

// Module 4 Member-1: After-ride mutual ratings
// Stores one rating per (ride, fromUser, toUser).

const RatingSchema = new Schema(
  {
    rideId: { type: Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
    fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    behavior: { type: Number, min: 1, max: 5, required: true },
    punctuality: { type: Number, min: 1, max: 5, required: true },
    safety: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

RatingSchema.index({ rideId: 1, fromUser: 1, toUser: 1 }, { unique: true });

export const Rating = mongoose.model("Rating", RatingSchema);
