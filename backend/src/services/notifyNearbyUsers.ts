import mongoose, { Schema, Types } from "mongoose";

export type NotificationType = "SCHEDULE_REMINDER" | "PANIC_ALERT" | "RIDE_REQUEST";

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  rideId?: Types.ObjectId | null;
  meta?: any;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["SCHEDULE_REMINDER", "PANIC_ALERT", "RIDE_REQUEST"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    rideId: { type: Schema.Types.ObjectId, ref: "Ride", default: null, index: true },
    meta: { type: Schema.Types.Mixed, default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
