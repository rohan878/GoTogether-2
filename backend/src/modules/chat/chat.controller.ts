import type { Request, Response } from "express";
import { Ride } from "../rides/ride.model";
import { ChatRoom } from "./chat.room.model";
import { Message } from "./message.model";

const getUserId = (req: any) => req.user?._id || req.userId;

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId).select("rider passengers");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isRider = String(ride.rider) === String(userId);
    const isPassenger = (ride.passengers || []).some((p: any) => String(p) === String(userId));
    if (!isRider && !isPassenger) return res.status(403).json({ message: "Not allowed" });

    const msgs = await Message.find({ rideId })
      .sort({ createdAt: 1 })
      .populate("sender", "name photo")
      .lean();

    return res.json({ messages: msgs });
  } catch (e) {
    console.error("getMessages error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { rideId } = req.params;
    const text = String((req as any).body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "text required" });

    const ride = await Ride.findById(rideId).select("rider passengers");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isRider = String(ride.rider) === String(userId);
    const isPassenger = (ride.passengers || []).some((p: any) => String(p) === String(userId));
    if (!isRider && !isPassenger) return res.status(403).json({ message: "Not allowed" });

    const members = [ride.rider, ...(ride.passengers || [])];
    await ChatRoom.updateOne(
      { rideId: ride._id },
      { $setOnInsert: { rideId: ride._id }, $addToSet: { members: { $each: members } } },
      { upsert: true }
    );

    const created = await Message.create({
      rideId,
      type: "TEXT",
      sender: userId,
      text,
      meta: null,
    });

    const msg = await Message.findById(created._id).populate("sender", "name photo").lean();
    return res.status(201).json({ message: msg });
  } catch (e) {
    console.error("sendMessage error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const pinLocation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { rideId } = req.params;

    const lat = Number((req as any).body?.lat);
    const lng = Number((req as any).body?.lng);
    const label = String((req as any).body?.label || "Meet here (Pinned)").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "lat/lng required" });
    }

    const ride = await Ride.findById(rideId).select("rider passengers");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isRider = String(ride.rider) === String(userId);
    const isPassenger = (ride.passengers || []).some((p: any) => String(p) === String(userId));
    if (!isRider && !isPassenger) return res.status(403).json({ message: "Not allowed" });

    const members = [ride.rider, ...(ride.passengers || [])];
    await ChatRoom.updateOne(
      { rideId: ride._id },
      {
        $setOnInsert: { rideId: ride._id },
        $addToSet: { members: { $each: members } },
        $set: { pinnedLocation: { lat, lng, label, pinnedBy: userId, pinnedAt: new Date() } },
      },
      { upsert: true }
    );

    // ✅ THIS IS THE FEATURE YOU WANT BACK:
    // message text includes direct map link (like before)
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const textWithLink = `📍 ${label}\n${mapUrl}`;

    const created = await Message.create({
      rideId,
      type: "LOCATION",
      sender: userId,
      text: textWithLink,
      meta: { lat, lng, label, mapUrl },
    });

    const msg = await Message.findById(created._id).populate("sender", "name photo").lean();
    return res.json({ ok: true, message: msg });
  } catch (e) {
    console.error("pinLocation error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
