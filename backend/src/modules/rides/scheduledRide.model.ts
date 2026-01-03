import { Schema, model } from "mongoose";

const PointSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const ScheduledRideSchema = new Schema(
  {
    // Owner of this scheduled entry (creator OR acceptor copy)
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // If this entry belongs to an acceptor, store who the original creator/host was
    hostUser: { type: Schema.Types.ObjectId, ref: "User" },

    origin: { type: PointSchema, required: true },
    destination: { type: PointSchema, required: true },

    seats: { type: Number, default: 2 },
    genderPreference: { type: String, enum: ["any", "female", "male"], default: "any" },
    radiusMeters: { type: Number, default: 1000 },

    scheduledFor: { type: Date, required: true },

    // ✅ matched added
    status: { type: String, enum: ["scheduled", "matched", "cancelled"], default: "scheduled" },

    cancelReason: { type: String },

    // ✅ link to real Ride created after accept
    linkedRideId: { type: Schema.Types.ObjectId, ref: "Ride" },

    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date },

    reminderSentAt: { type: Date },
  },
  { timestamps: true }
);

ScheduledRideSchema.index({ user: 1, scheduledFor: 1 });
ScheduledRideSchema.index({ status: 1, scheduledFor: 1 });
ScheduledRideSchema.index({ linkedRideId: 1 });

export const ScheduledRide = model("ScheduledRide", ScheduledRideSchema);
