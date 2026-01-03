import type { Request, Response } from "express";
import { Notification } from "./notification.model";

const getUserId = (req: any) => req.user?._id || req.userId;

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(50, Math.max(1, Number((req as any).query?.limit) || 20));

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    return res.json({ notifications, unreadCount });
  } catch (e) {
    console.error("getMyNotifications error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    await Notification.updateOne({ _id: id, user: userId }, { $set: { read: true } });

    return res.json({ ok: true });
  } catch (e) {
    console.error("markNotificationRead error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    return res.json({ ok: true });
  } catch (e) {
    console.error("markAllRead error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
