import { ScheduledRide } from "./scheduledRide.model";
import { Notification } from "../notifications/notification.model";

const WINDOW_MINUTES = 60;
const TOLERANCE_MINUTES = 5;

function toArea(address?: string) {
  if (!address) return "Selected area";
  return address.split(",").slice(0, 2).join(",").trim() || "Selected area";
}

export async function runScheduledRideReminderOnce() {
  const now = Date.now();

  const from = new Date(now + (WINDOW_MINUTES - TOLERANCE_MINUTES) * 60 * 1000);
  const to = new Date(now + (WINDOW_MINUTES + TOLERANCE_MINUTES) * 60 * 1000);

  const due = await ScheduledRide.find({
    status: "scheduled",
    reminderSentAt: null,
    scheduledFor: { $gte: from, $lte: to },
  })
    .sort({ scheduledFor: 1 })
    .limit(200);

  for (const item of due) {
    try {
      const when = new Date((item as any).scheduledFor).toLocaleString();
      const fromAddr = toArea((item as any)?.origin?.address);
      const toAddr = toArea((item as any)?.destination?.address);

      await Notification.create({
        user: (item as any).user,
        type: "SCHEDULE_REMINDER",
        title: "⏰ Scheduled ride reminder",
        body: `Your scheduled ride is in 1 hour.\nTime: ${when}\nFrom: ${fromAddr}\nTo: ${toAddr}`,
        rideId: null,
        read: false,
      });

      (item as any).reminderSentAt = new Date();
      await item.save();
    } catch (e) {
      console.error("schedule reminder notification failed:", e);
    }
  }

  return { ok: true, found: due.length };
}

let started = false;
export function startScheduledRideReminderLoop() {
  if (started) return;
  started = true;

  setInterval(async () => {
    try {
      await runScheduledRideReminderOnce();
    } catch (e) {
      console.error("scheduled reminder loop error:", e);
    }
  }, 60_000);

  console.log("✅ Scheduled ride reminder loop started (in-app, 1 hour before)");
}
