import { Router } from "express";
import { register, verifyOtp, login, uploadDocuments, me, toggleDnd } from "./auth.controller";
import { protect } from "../../middlewares/auth.middleware";
import multer from "multer";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);

router.get("/me", protect, me);

// ✅ User-level DND toggle
router.patch("/dnd", protect, toggleDnd);

// NID + Selfie upload
router.post(
  "/upload-docs",
  protect,
  upload.fields([
    { name: "nid", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  uploadDocuments
);

export default router;
