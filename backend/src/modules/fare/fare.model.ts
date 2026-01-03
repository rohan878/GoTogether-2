import mongoose, { Schema } from "mongoose";

const pointSchema = new Schema(
  { lat: Number, lng: Number, address: String },
  { _id: false }
);

const fareQuoteSchema = new Schema(
  {
    rideId: { type: String, required: true, index: true },

    origin: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },
    stops: { type: [pointSchema], default: [] },

    distanceMeters: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },

    // Simple fare formula (MVP). You can tune later.
    baseFare: { type: Number, default: 80 },
    perKm: { type: Number, default: 25 },
    totalFare: { type: Number, required: true },

    // seat count used for split
    passengerCount: { type: Number, required: true },
    perPassengerFare: { type: Number, required: true },

    // who confirmed their share
    confirmations: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        confirmedAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const FareQuote = mongoose.model("FareQuote", fareQuoteSchema);
