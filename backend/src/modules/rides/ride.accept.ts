import type { Request, Response } from "express";
import { Ride } from "./ride.model";
import { ChatRoom } from "../chat/chat.room.model";

// NOTE: This file is NOT used by ride.routes.ts (it uses ride.controller.ts),
// but it is compiled by TypeScript. So it must stay valid.

const uid = (req: any) => req.user?._id || req.user?.id || req.userId;

export const acceptRide = async (req: Request, res: Response) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ride = await Ride.findById(req.params.id);
    if (!ride || ride.status !== "open") {
      return res.status(400).json({ message: "Ride unavailable" });
    }

    if (String((ride as any).rider) === String(userId)) {
      return res.status(400).json({ message: "Rider is already in the ride" });
    }

    const already = (ride as any).passengers?.some((p: any) => String(p) === String(userId));
    if (!already) {
      (ride as any).passengers.push(userId);
      await ride.save();
    }

    const members = [
      String((ride as any).rider),
      ...((ride as any).passengers || []).map(String),
    ];

    await ChatRoom.updateOne(
      { rideId: (ride as any)._id },
      {
        $setOnInsert: { rideId: (ride as any)._id },
        $addToSet: { members: { $each: members } },
      },
      { upsert: true }
    );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("acceptRide(legacy file) error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};
