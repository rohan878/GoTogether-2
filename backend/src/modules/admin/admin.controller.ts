import type { Request, Response } from "express";
import { User } from "../auth/auth.model";

/**
 * GET /api/admin/kyc/pending
 * Admin sees all users who uploaded NID/selfie and waiting for approval
 */
export const getPendingKyc = async (_req: Request, res: Response) => {
  try {
    const users = await User.find({
      kycStatus: "PENDING",
      isPhoneVerified: true,
    }).select("name phone gender photo kycStatus nidImage selfieImage createdAt");

    return res.json({ users });
  } catch (e: any) {
    console.error("getPendingKyc error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/admin/kyc/:userId/approve
 */
export const approveKyc = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Approve
    user.isAdminApproved = true;
    user.kycStatus = "APPROVED";

    await user.save();

    return res.json({ message: "KYC approved", userId: user._id });
  } catch (e: any) {
    console.error("approveKyc error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/admin/kyc/:userId/reject
 * Body: { reason?: string }
 */
export const rejectKyc = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body as { reason?: string };

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Reject
    user.isAdminApproved = false;
    user.kycStatus = "REJECTED";
    // Optional: store reason if your model has a field for it
    // (user as any).kycRejectReason = reason || "";

    await user.save();

    return res.json({
      message: "KYC rejected",
      userId: user._id,
      reason: reason || null,
    });
  } catch (e: any) {
    console.error("rejectKyc error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};
