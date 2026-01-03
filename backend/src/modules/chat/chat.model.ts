import { Schema, model, Types } from "mongoose";

const chatSchema = new Schema(
  {
    rideId: { type: Types.ObjectId, ref: "Ride", required: true },
    riderId: { type: Types.ObjectId, ref: "User", required: true },
    members: [{ type: Types.ObjectId, ref: "User" }], // rider + accepted passengers
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatSchema.index({ rideId: 1 }, { unique: true });

export const Chat = model("Chat", chatSchema);
