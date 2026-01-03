import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { generateQuote, getQuote, confirmShare, pendingConfirmations } from "./fare.controller";

const router = Router();

router.post("/:rideId/quote", protect, generateQuote);
router.get("/:rideId/quote", protect, getQuote);

router.post("/:rideId/confirm", protect, confirmShare);
router.get("/:rideId/pending", protect, pendingConfirmations);

export default router;
