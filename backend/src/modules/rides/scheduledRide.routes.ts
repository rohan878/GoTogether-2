import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as Scheduled from "./scheduledRide.controller";

const router = Router();

// ✅ static routes first
router.get("/nearby", requireAuth, Scheduled.nearbyScheduled);

// ✅ list + create
router.get("/", requireAuth, Scheduled.listMyScheduled);
router.post("/", requireAuth, Scheduled.createScheduled);

// ✅ NEW: accept scheduled ride -> create chat room
router.post("/:id/accept", requireAuth, Scheduled.acceptScheduledRide);

// ✅ delete/cancel by id (keep last)
router.delete("/:id", requireAuth, Scheduled.deleteScheduled);

export default router;
