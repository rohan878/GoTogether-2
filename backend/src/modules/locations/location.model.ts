import { Schema, model, Types } from "mongoose";

const locationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Location = model("Location", locationSchema);
