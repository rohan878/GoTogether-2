import { Router } from "express";
import { upsertLocation } from "./location.controller";
import { protect } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/", protect, upsertLocation);

export default router;
