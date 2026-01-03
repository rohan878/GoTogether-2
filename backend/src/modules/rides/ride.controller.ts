import type { Request, Response } from "express";
import axios from "axios";

import { Ride } from "./ride.model";
import { User } from "../auth/auth.model";
import { Location } from "../locations/location.model";
import { Notification } from "../notifications/notification.model";
import { ChatRoom } from "../chat/chat.room.model";
import { Message } from "../chat/message.model";
import { getDistanceInMeters } from "../../utils/distance";
import { sendSms } from "../../utils/sms";
import { recalcReliabilityAndDiscount } from "../ratings/rating.service";

// -------------------- helpers --------------------
function uid(req: any) {
  return req.user?.id || req.user?._id || req.userId;
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function clampRadiusMeters(value: any, fallback = 1000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(500, Math.min(2000, Math.round(n)));
}

function safeArea(address?: string) {
  if (!address) return "—";
  const parts = String(address)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ") || String(address);
}

function nowPlusSeconds(sec: number) {
  return new Date(Date.now() + Math.max(0, sec) * 1000).toISOString();
}

/**
 * Fallback ETA estimate if ORS returns 0/NaN durations.
 * Uses straight-line distance and a conservative city speed.
 */
function estimateSecondsByDistanceMeters(distanceMeters: number, speedKmh = 22) {
  // 22 km/h = city-ish average including stops
  const speedMps = (speedKmh * 1000) / 3600;
  const sec = Math.round(distanceMeters / Math.max(speedMps, 1));
  return Math.max(60, sec); // at least 1 minute so UI never shows identical "now"
}

async function notifyRideRequestToNearbyUsers(args: {
  rideId: string;
  riderId: string;
  originLat: number;
  originLng: number;
  radiusMeters: number;
  riderGender: string;
  destinationArea: string;
}) {
  const { rideId, riderId, originLat, originLng, radiusMeters, riderGender, destinationArea } =
    args;

  // 1) compute distance from rider origin to each stored user location
  const locations = await Location.find({ userId: { $ne: riderId } }).lean();
  if (!locations.length) return { ok: true, notified: 0 };

  const distanceList = locations
    .map((l: any) => {
      const d = getDistanceInMeters(originLat, originLng, Number(l.lat), Number(l.lng));
      return {
        userId: String(l.userId),
        distanceMeters: Math.round(d),
      };
    })
    .filter((x) => x.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  if (!distanceList.length) return { ok: true, notified: 0 };

  // 2) filter out DND / unverified / unapproved
  const userIds = distanceList.map((d) => d.userId);
  const allowedUsers = await User.find({
    _id: { $in: userIds },
    dnd: { $ne: true },
    isPhoneVerified: true,
    isAdminApproved: true,
  })
    .select("_id phone")
    .lean();

  const allowed = new Map<string, string | undefined>();
  for (const u of allowedUsers as any[]) allowed.set(String(u._id), u.phone);

  const finalTargets = distanceList.filter((d) => allowed.has(d.userId));
  if (!finalTargets.length) return { ok: true, notified: 0 };

  // 3) in-app notifications
  await Promise.all(
    finalTargets.map((t) =>
      Notification.create({
        user: t.userId,
        type: "RIDE_REQUEST",
        title: "🚗 Nearby ride request",
        body: `Gender: ${riderGender}\nDistance: ${t.distanceMeters}m\nTo: ${destinationArea}`,
        rideId,
        read: false,
      }).catch(() => null)
    )
  );

  // 4) optional SMS (only if TWILIO env is configured)
  const canSms =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_FROM_NUMBER;

  if (canSms) {
    await Promise.all(
      finalTargets.map(async (t) => {
        const phone = allowed.get(t.userId);
        if (!phone) return;
        const text =
          `Nearby ride request\n` +
          `Gender: ${riderGender}\n` +
          `Distance: ${t.distanceMeters}m\n` +
          `To: ${destinationArea}`;
        try {
          await sendSms(String(phone), text);
        } catch {
          // ignore SMS failures; in-app notification still exists
        }
      })
    );
  }

  return { ok: true, notified: finalTargets.length };
}

// -------------------- controllers --------------------

// GET /api/rides/my/active
export async function getMyActiveRide(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findOne({
    $or: [{ rider: userId }, { passengers: userId }],
    status: { $nin: ["cancelled", "completed"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ ride: ride || null });
}

// GET /api/rides/:id (basic ride details for coordination/ratings)
export async function getRideById(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id)
    .populate("rider", "name gender photo ratingAvg ratingCount reliabilityScore")
    .populate("passengers", "name gender photo ratingAvg ratingCount reliabilityScore")
    .lean();
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  // Only participants can view
  const isParticipant =
    String((ride as any).rider?._id || (ride as any).rider) === String(userId) ||
    ((ride as any).passengers || []).some((p: any) => String(p?._id || p) === String(userId));
  if (!isParticipant) return res.status(403).json({ message: "Not allowed" });

  return res.json({ ok: true, ride });
}

// POST /api/rides
export async function createRide(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // must be verified to create rides (Module 1)
  const me = (req as any).user;
  if (!me?.isPhoneVerified) return res.status(403).json({ message: "Phone not verified" });
  if (!me?.isAdminApproved) return res.status(403).json({ message: "Admin approval required" });

  const payload: any = req.body || {};
  const origin = payload.origin;
  const destination = payload.destination;

  if (!origin?.address || origin?.lat == null || origin?.lng == null) {
    return res.status(400).json({ message: "origin (address, lat, lng) required" });
  }
  if (!destination?.address || destination?.lat == null || destination?.lng == null) {
    return res.status(400).json({ message: "destination (address, lat, lng) required" });
  }

  const seats = Math.max(1, Math.min(6, Number(payload.seats || 2)));
  const genderPreference = ["any", "female", "male"].includes(payload.genderPreference)
    ? payload.genderPreference
    : "any";
  const radiusMeters = clampRadiusMeters(payload.radiusMeters, 1000);

  const ride = await Ride.create({
    rider: userId,
    origin: {
      address: String(origin.address),
      lat: Number(origin.lat),
      lng: Number(origin.lng),
    },
    destination: {
      address: String(destination.address),
      lat: Number(destination.lat),
      lng: Number(destination.lng),
    },
    seats,
    genderPreference,
    radiusMeters,
    stops: Array.isArray(payload.stops) ? payload.stops : [],
    status: "open",
    passengers: [],
  });

  // Notify nearby users (Module 1 Member-3)
  const destinationArea = safeArea(destination.address);
  await notifyRideRequestToNearbyUsers({
    rideId: String(ride._id),
    riderId: String(userId),
    originLat: Number(origin.lat),
    originLng: Number(origin.lng),
    radiusMeters,
    riderGender: String(me?.gender || "other"),
    destinationArea,
  });

  return res.status(201).json({ ride });
}

// GET /api/rides/nearby?lat=...&lng=...&radiusMeters=...
export async function getNearbyRides(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const lat = num((req as any).query?.lat);
  const lng = num((req as any).query?.lng);
  const radiusMeters = clampRadiusMeters((req as any).query?.radiusMeters, 2000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: "lat & lng required" });
  }

  // Only show available rides + exclude your own + exclude rides you already joined
  const rides = await Ride.find({
    status: { $in: ["open", "pickup_wait"] },
    rider: { $ne: userId },
    passengers: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .lean();

  const nearby = rides
    .map((r: any) => {
      const o = r?.origin;
      if (!o || o.lat == null || o.lng == null) return null;
      const d = getDistanceInMeters(lat, lng, Number(o.lat), Number(o.lng));
      if (d > radiusMeters) return null;
      return { ...r, distanceMeters: Math.round(d) };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);

  return res.json({ rides: nearby });
}

// POST /api/rides/:id/accept
export const acceptRide = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const rideId = req.params.id;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // already accepted?
    const already = (ride.passengers || []).some((p: any) => String(p) === String(userId));
    if (already) {
      return res.json({ message: "Already joined", ride });
    }

    // capacity check (if you have seats field)
    if (typeof ride.seats === "number" && (ride.passengers?.length || 0) >= ride.seats) {
      return res.status(400).json({ message: "Ride is full" });
    }

    ride.passengers = ride.passengers || [];
    ride.passengers.push(userId);

    // ✅ AUTO START pickup countdown (10 minutes) when first passenger accepts
    // Only set if not already running
    if (!ride.pickupDeadline) {
      ride.status = "pickup_wait"; // must exist in your status enum list
      ride.pickupDeadline = new Date(Date.now() + 10 * 60 * 1000);
    }

    await ride.save();

    return res.json({
      message: "Ride accepted",
      ride,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ message: e?.message || "Accept failed" });
  }
};


// POST /api/rides/:id/leave
export async function leaveRide(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  (ride as any).passengers = ((ride as any).passengers || []).filter(
    (p: any) => String(p) !== String(userId)
  );
  await ride.save();

  await ChatRoom.updateOne(
    { rideId: (ride as any)._id },
    { $pull: { members: userId } },
    { upsert: true }
  );

  return res.json({ ok: true });
}

// PATCH /api/rides/:id/cancel
export async function cancelRide(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const isRider = String((ride as any).rider) === String(userId);

  // ✅ IMPORTANT FIX:
  // The UI uses a single "Cancel Ride" button for both rider and passengers.
  // If a passenger clicks cancel, treat it as "leave" (Module 3 Member-4).
  if (!isRider) {
    const wasPassenger = ((ride as any).passengers || []).some((p: any) => String(p) === String(userId));
    if (!wasPassenger) return res.status(403).json({ message: "Not allowed" });

    (ride as any).passengers = ((ride as any).passengers || []).filter(
      (p: any) => String(p) !== String(userId)
    );
    await ride.save();

    // Module 4 Member-4: soft penalty for frequent cancellations/leaves
    // Leaving after accepting (before start) counts as a cancellation.
    await User.updateOne({ _id: userId }, { $inc: { cancellations: 1 } }).catch(() => null);
    const u = await User.findById(userId).catch(() => null);
    if (u) {
      recalcReliabilityAndDiscount(u as any);
      await (u as any).save().catch(() => null);
    }

    await ChatRoom.updateOne(
      { rideId: (ride as any)._id },
      { $pull: { members: userId } },
      { upsert: true }
    );

    await Message.create({
      rideId: String((ride as any)._id),
      type: "SYSTEM",
      text: "👋 A passenger left the ride.",
      meta: { event: "PASSENGER_LEFT" },
    }).catch(() => null);

    return res.json({ ok: true, left: true });
  }

  // Rider cancels the whole ride
  (ride as any).status = "cancelled";
  (ride as any).cancelledAt = new Date();
  await ride.save();

  // Module 4 Member-4: rider cancellation counts
  await User.updateOne({ _id: userId }, { $inc: { cancellations: 1 } }).catch(() => null);
  const u2 = await User.findById(userId).catch(() => null);
  if (u2) {
    recalcReliabilityAndDiscount(u2 as any);
    await (u2 as any).save().catch(() => null);
  }

  await Message.create({
    rideId: String((ride as any)._id),
    type: "SYSTEM",
    text: "❌ Ride cancelled by rider.",
    meta: { event: "RIDE_CANCELLED" },
  }).catch(() => null);

  return res.json({ ok: true, cancelled: true });
}

// POST /api/rides/:id/complete
// Rider marks a ride as completed so ratings/rewards can be given.
export async function completeRide(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const isRider = String((ride as any).rider) === String(userId);
  if (!isRider) return res.status(403).json({ message: "Only rider can complete the ride" });

  if ((ride as any).status === "cancelled") {
    return res.status(400).json({ message: "Cancelled rides cannot be completed" });
  }

  (ride as any).status = "completed";
  (ride as any).completedAt = new Date();
  await ride.save();

  // Module 4 Member-4: reward completion counts
  const participantIds = [String((ride as any).rider), ...(((ride as any).passengers || []) as any[]).map(String)];
  await User.updateMany({ _id: { $in: participantIds } }, { $inc: { completedRides: 1 } }).catch(
    () => null
  );

  // Update derived reliability/discount for participants
  const participants = await User.find({ _id: { $in: participantIds } }).catch(() => [] as any);
  for (const u of participants as any[]) {
    recalcReliabilityAndDiscount(u);
    await u.save().catch(() => null);
  }

  await Message.create({
    rideId: String((ride as any)._id),
    type: "SYSTEM",
    text: "✅ Ride completed. You can now rate each other.",
    meta: { event: "RIDE_COMPLETED" },
  }).catch(() => null);

  return res.json({ ok: true, completed: true, ride });
}

// GET /api/rides/:id/eta?fromLat=...&fromLng=...
export async function getRideEta(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id).lean();
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const fromLat = num((req as any).query?.fromLat);
  const fromLng = num((req as any).query?.fromLng);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return res.status(400).json({ message: "fromLat/fromLng required" });
  }

  const o: any = (ride as any).origin;
  const d: any = (ride as any).destination;
  if (!o || !d) return res.status(400).json({ message: "Ride origin/destination missing" });
  if (o.lat == null || o.lng == null || d.lat == null || d.lng == null) {
    return res.status(400).json({ message: "Ride origin/destination missing lat/lng" });
  }

  const key = process.env.ORS_API_KEY;
  if (!key) {
    // fallback so UI never breaks
    const pickupSec = 8 * 60;
    const tripSec = 20 * 60;
    return res.json({
      pickup: {
        etaAt: nowPlusSeconds(pickupSec),
        durationSeconds: pickupSec,
        distanceMeters: 0,
      },
      destination: {
        etaAt: nowPlusSeconds(pickupSec + tripSec),
        durationSeconds: pickupSec + tripSec,
        distanceMeters: 0,
      },
      trip: {
        durationSeconds: tripSec,
        distanceMeters: 0,
      },
    });
  }

  const leg1 = await axios.post(
    "https://api.openrouteservice.org/v2/directions/driving-car",
    { coordinates: [[fromLng, fromLat], [Number(o.lng), Number(o.lat)]] },
    { headers: { Authorization: key, "Content-Type": "application/json" } }
  );
  const seg1 = leg1.data.features?.[0]?.properties?.segments?.[0];
  let dur1 = Number(seg1?.duration || 0);
  let dist1 = Number(seg1?.distance || 0);

  const leg2 = await axios.post(
    "https://api.openrouteservice.org/v2/directions/driving-car",
    { coordinates: [[Number(o.lng), Number(o.lat)], [Number(d.lng), Number(d.lat)]] },
    { headers: { Authorization: key, "Content-Type": "application/json" } }
  );
  const seg2 = leg2.data.features?.[0]?.properties?.segments?.[0];
  let dur2 = Number(seg2?.duration || 0);
  let dist2 = Number(seg2?.distance || 0);

  // ✅ FEEDBACK FIX #1: if ORS returns 0/NaN durations, estimate so pickup/destination don't become identical "now"
  if (!Number.isFinite(dur1) || dur1 <= 0) {
    const fallbackDist = getDistanceInMeters(fromLat, fromLng, Number(o.lat), Number(o.lng));
    dur1 = estimateSecondsByDistanceMeters(fallbackDist);
    dist1 = Number.isFinite(dist1) && dist1 > 0 ? dist1 : fallbackDist;
  }
  if (!Number.isFinite(dur2) || dur2 <= 0) {
    const fallbackDist = getDistanceInMeters(Number(o.lat), Number(o.lng), Number(d.lat), Number(d.lng));
    dur2 = estimateSecondsByDistanceMeters(fallbackDist);
    dist2 = Number.isFinite(dist2) && dist2 > 0 ? dist2 : fallbackDist;
  }

  return res.json({
    pickup: { etaAt: nowPlusSeconds(dur1), durationSeconds: dur1, distanceMeters: dist1 },
    destination: {
      etaAt: nowPlusSeconds(dur1 + dur2),
      durationSeconds: dur1 + dur2,
      distanceMeters: dist1 + dist2,
    },
    trip: { durationSeconds: dur2, distanceMeters: dist2 },
  });
}

// POST /api/rides/:id/panic
export async function panicAlert(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id).lean();
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const lat = num((req as any).body?.lat);
  const lng = num((req as any).body?.lng);
  const mapLink =
    Number.isFinite(lat) && Number.isFinite(lng) ? `https://maps.google.com/?q=${lat},${lng}` : "";

  // ✅ FEEDBACK FIX #2: req.user may not include name -> fetch from DB to avoid "Someone"
  const pressedByReqUser = (req as any).user;
  let senderName: string | null = pressedByReqUser?.name || null;
  let senderPhone: string | null = pressedByReqUser?.phone || null;

  if (!senderName || senderName === "Someone") {
    const dbUser = await User.findById(userId).select("name phone").lean();
    senderName = dbUser?.name || senderName || "Someone";
    senderPhone = dbUser?.phone || senderPhone || null;
  }

  const phoneSuffix = senderPhone ? ` (${senderPhone})` : "";

  const body =
    `🚨 PANIC ALERT\n` +
    `Pressed by: ${senderName}${phoneSuffix}\n` +
    `Ride: ${(ride as any).origin?.address || ""} → ${(ride as any).destination?.address || ""}\n` +
    (mapLink ? `Map: ${mapLink}` : "");

  const targets = [String((ride as any).rider), ...((ride as any).passengers || []).map(String)].filter(
    (t: string) => t && String(t) !== String(userId)
  );

  await Promise.all(
    targets.map((t: string) =>
      Notification.create({
        user: t,
        type: "PANIC_ALERT",
        title: "🚨 Panic Alert",
        body,
        rideId: (ride as any)._id,
        read: false,
      }).catch(() => null)
    )
  );

  return res.json({ ok: true });
}

// PUT /api/rides/:id/stops
export async function updateStops(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (String((ride as any).rider) !== String(userId)) {
    return res.status(403).json({ message: "Only rider can update stops" });
  }

  (ride as any).stops = Array.isArray((req as any).body?.stops) ? (req as any).body.stops : [];
  await ride.save();
  return res.json({ ride });
}

// POST /api/rides/:id/confirm
export async function confirmFareShare(_req: Request, res: Response) {
  // (Optional) extend later: store passenger confirmation status
  return res.json({ ok: true });
}

// POST /api/rides/:id/countdown/start
export async function startPickupCountdown(req: Request, res: Response) {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (String((ride as any).rider) !== String(userId)) {
    return res.status(403).json({ message: "Only rider can start countdown" });
  }

  const seconds = Math.max(60, Math.min(60 * 60, Number((req as any).body?.seconds || 10 * 60)));
  (ride as any).status = "pickup_wait";
  (ride as any).pickupDeadline = new Date(Date.now() + seconds * 1000);
  (ride as any).pickupExpiredNotified = false;
  await ride.save();

  await Message.create({
    rideId: String((ride as any)._id),
    type: "SYSTEM",
    text: `⏳ Pickup countdown started (${Math.round(seconds / 60)} min).`,
    meta: { event: "PICKUP_COUNTDOWN_STARTED", seconds },
  }).catch(() => null);

  return res.json({ ok: true, ride });
}
