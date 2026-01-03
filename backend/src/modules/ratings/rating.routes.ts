import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as RatingController from "./rating.controller";

const router = Router();

router.post("/", requireAuth, (RatingController as any).createRating);
router.get("/mine", requireAuth, (RatingController as any).getMyRatingSummary);

export default router;
