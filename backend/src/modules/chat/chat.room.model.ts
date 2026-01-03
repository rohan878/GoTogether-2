import mongoose, { Schema, Types } from "mongoose";

const PinnedLocationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    label: { type: String, default: "Pinned location" },
    pinnedBy: { type: Types.ObjectId, ref: "User", required: true },
    pinnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatRoomSchema = new Schema(
  {
    // ✅ single source of truth
    rideId: { type: Types.ObjectId, ref: "Ride", required: true, unique: true, index: true },

    members: [{ type: Types.ObjectId, ref: "User", required: true }],

    pinnedLocation: { type: PinnedLocationSchema, default: null },
  },
  { timestamps: true }
);

export const ChatRoom = mongoose.models.ChatRoom || mongoose.model("ChatRoom", ChatRoomSchema);
