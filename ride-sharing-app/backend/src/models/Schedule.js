const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // optional: the role when they scheduled (info only)
    roleAtBooking: {
      type: String,
      enum: ["user", "rider"],
      default: "user"
    },

    origin: { type: String, required: true },
    destination: { type: String, required: true },

    // when the ride is planned to start
    dateTime: { type: Date, required: true },

    notes: { type: String },

    status: {
      type: String,
      enum: ["planned", "cancelled", "completed"],
      default: "planned"
    },

    // if we already sent reminder SMS
    reminderSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
