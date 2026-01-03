import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requireAdmin } from "./admin.middleware";
import { getPendingKyc, approveKyc, rejectKyc } from "./admin.controller";

const router = Router();

router.get("/kyc/pending", protect, requireAdmin, getPendingKyc);
router.patch("/kyc/:userId/approve", protect, requireAdmin, approveKyc);
router.patch("/kyc/:userId/reject", protect, requireAdmin, rejectKyc);

export default router;
