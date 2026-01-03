import { Router } from "express";
import { protect, requireAdminApproval, requireVerifiedPhone } from "../../middlewares/auth.middleware";
import { getMessages, sendMessage, pinLocation } from "./chat.controller";

const router = Router();

router.get("/:rideId/messages", protect, requireVerifiedPhone, requireAdminApproval, getMessages);
router.post("/:rideId/messages", protect, requireVerifiedPhone, requireAdminApproval, sendMessage);
router.post("/:rideId/pin", protect, requireVerifiedPhone, requireAdminApproval, pinLocation);

export default router;
