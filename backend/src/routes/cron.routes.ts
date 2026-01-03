import { Router } from "express";
import { runScheduledRideReminderOnce } from "../modules/rides/scheduledRide.scheduler";

const router = Router();

// Protect with a secret header/token in production (simple for now)
router.get("/scheduled-reminders", async (req, res) => {
  try {
    const result = await runScheduledRideReminderOnce();
    // runScheduledRideReminderOnce() already returns { ok, found }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
});

export default router;
