import mongoose, { Schema } from "mongoose";

const PanicAlertSchema = new Schema(
  {
    rideId: { type: Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: null },
    note: { type: String, default: null },
    notifiedAdmins: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PanicAlertSchema.index({ rideId: 1, createdAt: -1 });

export const PanicAlert =
  mongoose.models.PanicAlert || mongoose.model("PanicAlert", PanicAlertSchema);
