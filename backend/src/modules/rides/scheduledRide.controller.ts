import type { Request, Response } from "express";
import { ScheduledRide } from "./scheduledRide.model";
import { getDistanceInMeters } from "../../utils/distance";
import { ChatRoom } from "../chat/chat.room.model";
import { Notification } from "../notifications/notification.model";
import { User } from "../auth/auth.model";
import { Ride } from "./ride.model";

const uid = (req: any) => req.user?._id || req.user?.id || req.userId;

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * If frontend passes 2 (km) instead of 2000 (meters),
 * convert automatically. Then clamp to 500–2000m.
 */
function clampRadiusMeters(value: any, fallback = 2000) {
  let n = Number(value);
  if (!Number.isFinite(n)) return fallback;

  if (n > 0 && n <= 20) n = n * 1000; // treat as KM
  return Math.max(500, Math.min(2000, Math.round(n)));
}

function parseDate(value: any): Date | null {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function extractLatLng(obj: any): { lat: number; lng: number } | null {
  if (!obj) return null;

  const latRaw =
    obj.lat ?? obj.latitude ?? obj.Lat ?? obj.Latitude ?? obj?.coords?.lat ?? obj?.coordinate?.lat;

  const lngRaw =
    obj.lng ??
    obj.lon ??
    obj.longitude ??
    obj.Lng ??
    obj.Longitude ??
    obj?.coords?.lng ??
    obj?.coords?.lon ??
    obj?.coordinate?.lng ??
    obj?.coordinate?.lon;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// GET /api/rides/scheduled
export async function listMyScheduled(req: Request, res: Response) {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const scheduled = await ScheduledRide.find({ user: userId })
      .sort({ scheduledFor: 1 })
      .lean();

    return res.json({ scheduled });
  } catch (e: any) {
    console.error("listMyScheduled error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/rides/scheduled
export async function createScheduled(req: Request, res: Response) {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body: any = req.body || {};
    const origin = body.origin;
    const destination = body.destination;

    if (!origin?.address) return res.status(400).json({ message: "origin.address required" });
    if (!destination?.address) return res.status(400).json({ message: "destination.address required" });

    const o = extractLatLng(origin);
    const d = extractLatLng(destination);

    if (!o) return res.status(400).json({ message: "origin lat/lng required" });
    if (!d) return res.status(400).json({ message: "destination lat/lng required" });

    const scheduledFor = parseDate(body.scheduledFor);
    if (!scheduledFor) return res.status(400).json({ message: "scheduledFor is required" });

    const seats = Math.max(1, Math.min(6, Number(body.seats || 2)));
    const genderPreference = ["any", "female", "male"].includes(body.genderPreference)
      ? body.genderPreference
      : "any";
    const radiusMeters = clampRadiusMeters(body.radiusMeters, 1000);

    const created = await ScheduledRide.create({
      user: userId,
      origin: { address: String(origin.address), lat: o.lat, lng: o.lng },
      destination: { address: String(destination.address), lat: d.lat, lng: d.lng },
      seats,
      genderPreference,
      radiusMeters,
      scheduledFor,
      status: "scheduled",
    });

    return res.status(201).json({ scheduled: created });
  } catch (e: any) {
    console.error("createScheduled error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/rides/scheduled/:id  (marks cancelled)
export async function deleteScheduled(req: Request, res: Response) {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const doc = await ScheduledRide.findOne({ _id: req.params.id, user: userId });
    if (!doc) return res.status(404).json({ message: "Not found" });

    doc.status = "cancelled";
    (doc as any).cancelReason = "Cancelled by user";
    await doc.save();

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("deleteScheduled error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/rides/scheduled/nearby?lat=...&lng=...&radiusMeters=...
export async function nearbyScheduled(req: Request, res: Response) {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const lat = num((req as any).query?.lat);
    const lng = num((req as any).query?.lng);
    const radiusMeters = clampRadiusMeters((req as any).query?.radiusMeters, 2000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "lat & lng required" });
    }

    // ✅ exclude my own schedules, and exclude cancelled/matched ones
    const items = await ScheduledRide.find({
      status: "scheduled",
      user: { $ne: userId },
    })
      .sort({ scheduledFor: 1 })
      .lean();

    const nearby = items
      .map((r: any) => {
        const o = extractLatLng(r?.origin);
        if (!o) return null;
        const dist = getDistanceInMeters(lat, lng, Number(o.lat), Number(o.lng));
        if (!Number.isFinite(dist)) return null;
        if (dist > radiusMeters) return null;
        return { ...r, distanceMeters: Math.round(dist) };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);

    return res.json({ items: nearby });
  } catch (e: any) {
    console.error("nearbyScheduled error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/rides/scheduled/:id/accept
 * ✅ creates a real Ride + chatroom
 * ✅ creates acceptor's own ScheduledRide copy so it appears in their list
 * ✅ idempotent: if already matched, return linkedRideId
 */
export async function acceptScheduledRide(req: Request, res: Response) {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const scheduled = await ScheduledRide.findById(req.params.id);
    if (!scheduled) return res.status(404).json({ message: "Scheduled ride not found" });

    const creatorId = String((scheduled as any).user);

    // creator cannot accept own schedule
    if (creatorId === String(userId)) {
      return res.status(400).json({ message: "You are the creator" });
    }

    // ✅ if already matched, just return rideId (idempotent)
    if (String((scheduled as any).status) === "matched" && (scheduled as any).linkedRideId) {
      const rideId = String((scheduled as any).linkedRideId);

      // ensure acceptor copy exists (so acceptor sees it in My Scheduled list)
      await ScheduledRide.updateOne(
        { user: userId, linkedRideId: rideId },
        {
          $setOnInsert: {
            user: userId,
            hostUser: creatorId,
            origin: (scheduled as any).origin,
            destination: (scheduled as any).destination,
            seats: (scheduled as any).seats || 2,
            genderPreference: (scheduled as any).genderPreference || "any",
            radiusMeters: (scheduled as any).radiusMeters || 1000,
            scheduledFor: (scheduled as any).scheduledFor,
            status: "matched",
            linkedRideId: rideId,
            acceptedBy: userId,
            acceptedAt: (scheduled as any).acceptedAt || new Date(),
          },
        },
        { upsert: true }
      );

      return res.json({ ok: true, rideId });
    }

    // must be active
    if (String((scheduled as any).status) !== "scheduled") {
      return res.status(400).json({ message: "This schedule is not active" });
    }

    // ✅ Create a real Ride now
    const newRide = await Ride.create({
      rider: creatorId,
      origin: (scheduled as any).origin,
      destination: (scheduled as any).destination,
      seats: (scheduled as any).seats || 2,
      genderPreference: (scheduled as any).genderPreference || "any",
      radiusMeters: (scheduled as any).radiusMeters || 1000,
      stops: [],
      status: "open",
      passengers: [userId],
      scheduledFromId: (scheduled as any)._id,
      scheduledFor: (scheduled as any).scheduledFor,
    });

    // ✅ Mark creator schedule as matched + link ride
    (scheduled as any).status = "matched";
    (scheduled as any).linkedRideId = newRide._id;
    (scheduled as any).acceptedAt = new Date();
    (scheduled as any).acceptedBy = userId;
    await scheduled.save();

    // ✅ Create acceptor's own scheduled entry so it appears in their list
    await ScheduledRide.updateOne(
      { user: userId, linkedRideId: newRide._id },
      {
        $setOnInsert: {
          user: userId,
          hostUser: creatorId,
          origin: (scheduled as any).origin,
          destination: (scheduled as any).destination,
          seats: (scheduled as any).seats || 2,
          genderPreference: (scheduled as any).genderPreference || "any",
          radiusMeters: (scheduled as any).radiusMeters || 1000,
          scheduledFor: (scheduled as any).scheduledFor,
          status: "matched",
          linkedRideId: newRide._id,
          acceptedBy: userId,
          acceptedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // ✅ Upsert chat room keyed by REAL rideId
    const members = [creatorId, String(userId)];
    await ChatRoom.updateOne(
      { rideId: newRide._id },
      { $setOnInsert: { rideId: newRide._id }, $addToSet: { members: { $each: members } } },
      { upsert: true }
    );

    // notify creator + acceptor
    const acceptor = await User.findById(userId).select("name phone").lean();
    const acceptorName = acceptor?.name || "Someone";

    await Notification.create({
      user: creatorId,
      type: "SCHEDULE_ACCEPTED",
      title: "📅 Scheduled ride accepted",
      body: `Accepted by: ${acceptorName}\nTime: ${(scheduled as any).scheduledFor}`,
      rideId: newRide._id,
      read: false,
    }).catch(() => null);

    await Notification.create({
      user: String(userId),
      type: "SCHEDULE_ACCEPTED",
      title: "✅ You joined a scheduled ride",
      body: "Chat is ready. Open it to coordinate pickup.",
      rideId: newRide._id,
      read: false,
    }).catch(() => null);

    return res.json({ ok: true, rideId: String(newRide._id) });
  } catch (e: any) {
    console.error("acceptScheduledRide error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
}
