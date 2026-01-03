import type { Request, Response } from "express";
import { Rating } from "./rating.model";
import { Ride } from "../rides/ride.model";
import { applyReceivedRating } from "./rating.service";

function uid(req: any) {
  return req.user?.id || req.user?._id || req.userId;
}

function clamp5(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NaN;
  return Math.max(1, Math.min(5, Math.round(v)));
}

// POST /api/ratings
// Body: { rideId, toUserId, behavior, punctuality, safety, comment }
export async function createRating(req: Request, res: Response) {
  const fromUserId = uid(req);
  if (!fromUserId) return res.status(401).json({ message: "Unauthorized" });

  const { rideId, toUserId, behavior, punctuality, safety, comment } = (req as any).body || {};
  if (!rideId || !toUserId) return res.status(400).json({ message: "rideId and toUserId required" });

  const b = clamp5(behavior);
  const p = clamp5(punctuality);
  const s = clamp5(safety);
  if (![b, p, s].every((x) => Number.isFinite(x))) {
    return res.status(400).json({ message: "Ratings must be 1..5" });
  }

  if (String(fromUserId) === String(toUserId)) {
    return res.status(400).json({ message: "You cannot rate yourself" });
  }

  const ride = await Ride.findById(rideId).lean();
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if ((ride as any).status !== "completed") {
    return res.status(400).json({ message: "You can only rate after ride completion" });
  }

  const isParticipant =
    String((ride as any).rider) === String(fromUserId) ||
    ((ride as any).passengers || []).some((p2: any) => String(p2) === String(fromUserId));
  const isTargetParticipant =
    String((ride as any).rider) === String(toUserId) ||
    ((ride as any).passengers || []).some((p2: any) => String(p2) === String(toUserId));

  if (!isParticipant || !isTargetParticipant) {
    return res.status(403).json({ message: "Both users must be participants of this ride" });
  }

  try {
    const created = await Rating.create({
      rideId,
      fromUser: fromUserId,
      toUser: toUserId,
      behavior: b,
      punctuality: p,
      safety: s,
      comment: String(comment || "").slice(0, 500),
    });

    const composite = (b + p + s) / 3;
    await applyReceivedRating(String(toUserId), composite);

    return res.status(201).json({ ok: true, rating: created });
  } catch (e: any) {
    // duplicate unique index => already rated
    if (e?.code === 11000) {
      return res.status(409).json({ message: "You already rated this user for this ride" });
    }
    return res.status(500).json({ message: e?.message || "Failed to create rating" });
  }
}

// GET /api/ratings/mine (received ratings summary)
export async function getMyRatingSummary(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const received = await Rating.find({ toUser: userId }).sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ ok: true, received });
}
