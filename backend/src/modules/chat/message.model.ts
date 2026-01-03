import mongoose, { Schema, Types } from "mongoose";

const MessageSchema = new Schema(
  {
    rideId: { type: Types.ObjectId, ref: "Ride", required: true, index: true },

    type: { type: String, enum: ["TEXT", "SYSTEM", "LOCATION"], default: "TEXT" },

    sender: { type: Types.ObjectId, ref: "User", default: null },

    text: { type: String, default: "" },

    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
