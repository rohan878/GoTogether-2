import mongoose, { Schema } from "mongoose";

export type RideStatus =
  | "open"
  | "pickup_wait"
  | "started"
  | "cancelled"
  | "completed";

const LocationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const RideSchema = new Schema(
  {
    rider: { type: Schema.Types.ObjectId, ref: "User", required: true },

    origin: { type: LocationSchema, required: true },
    destination: { type: LocationSchema, required: true },

    // ✅ Multi-stop support (Module-2 Member-2)
    stops: { type: [LocationSchema], default: [] },

    seats: { type: Number, required: true },

    genderPreference: {
      type: String,
      enum: ["any", "female", "male"],
      default: "any",
    },

    radiusMeters: { type: Number, default: 1000 },

    // passengers who accepted
    passengers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // ✅ Pickup countdown support (Module-2 Member-3)
    pickupDeadline: { type: Date, default: null },
    pickupExpiredNotified: { type: Boolean, default: false },

    // ✅ Fare support (Module-2 Member-1)
    fareQuoteId: { type: String, default: null },

    status: {
      type: String,
      enum: ["open", "pickup_wait", "started", "cancelled", "completed"],
      default: "open",
    },

    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

RideSchema.index({ rider: 1, status: 1 });

export const Ride = mongoose.model("Ride", RideSchema);
