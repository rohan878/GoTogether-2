import { Ride } from "./ride.model";
import { Message } from "../chat/message.model";
import { emitSystemMessage } from "../../socket";

let started = false;

export function startPickupScheduler() {
  if (started) return;
  started = true;

  setInterval(async () => {
    try {
      const now = new Date();

      const expired = await Ride.find({
        status: "pickup_wait", // ✅ fixed
        pickupDeadline: { $ne: null, $lte: now },
        pickupExpiredNotified: { $ne: true },
      }).limit(50);

      for (const ride of expired) {
        (ride as any).pickupExpiredNotified = true;
        await ride.save();

        const rideId = ride._id.toString();
        const text = "⏳ Pickup time ended. Rider: Start / Cancel / Wait more?";

        await Message.create({
          rideId,
          type: "SYSTEM",
          text,
          meta: { rideId, event: "PICKUP_EXPIRED" },
        });

        emitSystemMessage(rideId, text, { rideId, event: "PICKUP_EXPIRED" });
      }
    } catch (e: any) {
      console.error("pickup scheduler error:", e?.message || e);
    }
  }, 5000);

  console.log("✅ Pickup scheduler started");
}
