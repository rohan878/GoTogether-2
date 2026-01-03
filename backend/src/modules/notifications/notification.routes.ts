import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
} from "./notification.controller";

const router = Router();

router.get("/", requireAuth, getMyNotifications);
router.post("/:id/read", requireAuth, markNotificationRead);
router.post("/read-all", requireAuth, markAllRead);

export default router;
