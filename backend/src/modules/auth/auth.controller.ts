import type { Request, Response } from "express";
import { User } from "./auth.model";
import { comparePassword, hashPassword, signToken } from "./auth.service";
import { sendSms } from "../../utils/sms";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, phone, password, gender, photo } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone, password are required" });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(409).json({ message: "Phone already registered" });

    const passwordHash = await hashPassword(password);

    await User.create({
      name,
      phone,
      passwordHash,
      gender: gender || "other",
      photo,
      isPhoneVerified: false,
      isAdminApproved: false,
      kycStatus: "NOT_SUBMITTED",
      dnd: false,
    });

    const otp = genOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phone, { otp, expiresAt });

    await sendSms(phone, `Your GoTogether OTP is: ${otp}`);

    return res.status(201).json({ message: "Registered. Please verify OTP.", phone });
  } catch (e: any) {
    console.error("register error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) return res.status(400).json({ message: "phone and otp are required" });

    const rec = otpStore.get(phone);
    if (!rec) return res.status(400).json({ message: "OTP not found. Please register again." });

    if (Date.now() > rec.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    if (String(rec.otp) !== String(otp)) return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isPhoneVerified = true;
    await user.save();
    otpStore.delete(phone);

    // ✅ IMPORTANT: payload must include userId
    const token = signToken({ userId: user._id.toString() });

    return res.json({
      message: "Phone verified",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        photo: user.photo,
        isPhoneVerified: user.isPhoneVerified,
        isAdminApproved: user.isAdminApproved,
        kycStatus: user.kycStatus,
        dnd: user.dnd,
        role: user.role,

        // Module 4 signals
        ratingAvg: user.ratingAvg || 0,
        ratingCount: user.ratingCount || 0,
        reliabilityScore: user.reliabilityScore ?? 100,
        discountPct: user.discountPct ?? 0,
        cancellations: user.cancellations || 0,
        completedRides: user.completedRides || 0,
      },
    });
  } catch (e: any) {
    console.error("verifyOtp error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "phone and password are required" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ userId: user._id.toString() });

    return res.json({
      message: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        photo: user.photo,
        isPhoneVerified: user.isPhoneVerified,
        isAdminApproved: user.isAdminApproved,
        kycStatus: user.kycStatus,
        dnd: user.dnd,
        role: user.role,

        // Module 4 signals
        ratingAvg: user.ratingAvg || 0,
        ratingCount: user.ratingCount || 0,
        reliabilityScore: user.reliabilityScore ?? 100,
        discountPct: user.discountPct ?? 0,
        cancellations: user.cancellations || 0,
        completedRides: user.completedRides || 0,
      },
    });
  } catch (e: any) {
    console.error("login error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    return res.json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        photo: user.photo,
        isPhoneVerified: user.isPhoneVerified,
        isAdminApproved: user.isAdminApproved,
        kycStatus: user.kycStatus,
        dnd: user.dnd,
        role: user.role,

        // Module 4 signals
        ratingAvg: user.ratingAvg || 0,
        ratingCount: user.ratingCount || 0,
        reliabilityScore: user.reliabilityScore ?? 100,
        discountPct: user.discountPct ?? 0,
        cancellations: user.cancellations || 0,
        completedRides: user.completedRides || 0,
      },
    });
  } catch (e: any) {
    console.error("me error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const files = req.files as any;

    const nid = files?.nid?.[0];
    const selfie = files?.selfie?.[0];
    if (!nid || !selfie) return res.status(400).json({ message: "nid and selfie files are required" });

    const dbUser = await User.findById(user._id);
    if (!dbUser) return res.status(404).json({ message: "User not found" });

    dbUser.nidImage = nid.buffer.toString("base64");
    dbUser.selfieImage = selfie.buffer.toString("base64");
    dbUser.kycStatus = "PENDING";
    dbUser.isAdminApproved = false;

    await dbUser.save();

    return res.json({ message: "Documents uploaded. Waiting for admin approval.", kycStatus: dbUser.kycStatus });
  } catch (e: any) {
    console.error("uploadDocuments error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const toggleDnd = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { dnd } = req.body as { dnd?: boolean };

    if (typeof dnd !== "boolean") return res.status(400).json({ message: "dnd must be boolean" });

    const updated = await User.findByIdAndUpdate(user._id, { dnd }, { new: true });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "DND updated", dnd: updated.dnd });
  } catch (e: any) {
    console.error("toggleDnd error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};
