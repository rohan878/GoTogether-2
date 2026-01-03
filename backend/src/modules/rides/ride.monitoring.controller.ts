import type { Request, Response } from "express";
import { Ride } from "./ride.model";
import { User } from "../auth/auth.model";
import { ChatRoom } from "../chat/chat.room.model";
import { Message } from "../chat/message.model";
import { PanicAlert } from "./panicAlert.model";
import { Notification } from "../notifications/notification.model";
import { notifyRideMembersPanic } from "./panic.notify";
import { orsDirections } from "../fare/ors.service";

const getUserId = (req: any) => req.user?._id || req.userId;

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const area = (addr?: string) => (addr ? addr.split(",").slice(0, 2).join(",").trim() : "Selected area") || "Selected area";

async function reverseNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GoTogether/1.0 (student project)" },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

export const panicButton = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const rideId = req.params.id;

    const lat = num((req as any).body?.lat);
    const lng = num((req as any).body?.lng);
    const notifyAdmins = Boolean((req as any).body?.notifyAdmins);
    const note = String((req as any).body?.note || "").trim() || null;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (lat == null || lng == null) return res.status(400).json({ message: "lat and lng are required" });

    const ride = await Ride.findById(rideId).select("rider passengers origin destination status");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isMember =
      String((ride as any).rider) === String(userId) ||
      ((ride as any).passengers || []).some((p: any) => String(p) === String(userId));
    if (!isMember) return res.status(403).json({ message: "You are not part of this ride" });

    const addr = await reverseNominatim(lat, lng);

    await PanicAlert.create({
      rideId: ride._id,
      triggeredBy: userId,
      lat,
      lng,
      address: addr,
      note,
      notifiedAdmins: notifyAdmins,
    });

    const me = await User.findById(userId).select("name").lean();
    const triggeredByName = me?.name || "a user";

    const riderId = String((ride as any).rider);
    const passengerIds = ((ride as any).passengers || []).map((p: any) => String(p));

    // ✅ in-app notify ride members
    await notifyRideMembersPanic({
      rideId: String(ride._id),
      riderId,
      passengerIds,
      triggeredByName,
      lat,
      lng,
      fromAddr: area((ride as any).origin?.address),
      toAddr: area((ride as any).destination?.address),
    });

    // ✅ optional in-app notify admins (no SMS)
    if (notifyAdmins) {
      const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
      const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
      const body =
        `🚨 Panic alert triggered by ${triggeredByName}\n` +
        `Ride: ${area((ride as any).origin?.address)} → ${area((ride as any).destination?.address)}\n` +
        `Map: ${mapUrl}`;

      if (admins.length) {
        await Notification.insertMany(
          admins.map((a: any) => ({
            user: a._id,
            type: "PANIC_ALERT",
            title: "🚨 PANIC ALERT (Admin)",
            body,
            rideId: ride._id,
            read: false,
          }))
        );
      }
    }

    await Message.create({
      rideId: ride._id,
      type: "SYSTEM",
      sender: null,
      text: `🚨 PANIC ALERT triggered by ${triggeredByName}. Location shared.`,
      meta: { event: "PANIC_ALERT", lat, lng, address: addr, note, notifyAdmins },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("panicButton error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getEta = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const rideId = req.params.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ride = await Ride.findById(rideId).select("rider passengers origin destination stops status pickupDeadline").lean();
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isMember =
      String((ride as any).rider) === String(userId) ||
      ((ride as any).passengers || []).some((p: any) => String(p) === String(userId));
    if (!isMember) return res.status(403).json({ message: "You are not part of this ride" });

    const fromLat = num((req as any).query?.fromLat);
    const fromLng = num((req as any).query?.fromLng);
    if (fromLat == null || fromLng == null) return res.status(400).json({ message: "fromLat and fromLng are required" });

    const origin = (ride as any).origin;
    const dest = (ride as any).destination;

    const toPickup = await orsDirections([
      { lat: fromLat, lng: fromLng },
      { lat: Number(origin.lat), lng: Number(origin.lng) },
    ]);

    const stops = Array.isArray((ride as any).stops) ? (ride as any).stops : [];
    const tripPoints = [
      { lat: Number(origin.lat), lng: Number(origin.lng) },
      ...stops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      { lat: Number(dest.lat), lng: Number(dest.lng) },
    ];

    const trip = await orsDirections(tripPoints);

    const now = Date.now();
    const pickupEtaAt = new Date(now + Math.max(0, toPickup.durationSeconds) * 1000).toISOString();
    const destinationEtaAt = new Date(
      now + (Math.max(0, toPickup.durationSeconds) + Math.max(0, trip.durationSeconds)) * 1000
    ).toISOString();

    return res.json({
      rideId: String((ride as any)._id),
      status: (ride as any).status,
      pickupDeadline: (ride as any).pickupDeadline || null,
      pickup: { distanceMeters: toPickup.distanceMeters, durationSeconds: toPickup.durationSeconds, etaAt: pickupEtaAt },
      trip: { distanceMeters: trip.distanceMeters, durationSeconds: trip.durationSeconds },
      destination: { etaAt: destinationEtaAt },
    });
  } catch (e: any) {
    console.error("getEta error:", e);
    const msg = e?.message === "ORS_API_KEY missing" ? "ORS_API_KEY missing in backend .env" : "Server error";
    return res.status(500).json({ message: msg });
  }
};

export const cancelRideAsPassenger = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const rideId = req.params.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const ride = await Ride.findById(rideId).select("rider passengers status");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const status = String((ride as any).status);
    if (!["open", "pickup_wait"].includes(status)) {
      return res.status(400).json({ message: "You can only leave before the ride starts" });
    }

    const isPassenger = ((ride as any).passengers || []).some((p: any) => String(p) === String(userId));
    if (!isPassenger) return res.status(400).json({ message: "You are not a passenger in this ride" });

    (ride as any).passengers = ((ride as any).passengers || []).filter((p: any) => String(p) !== String(userId));
    await ride.save();

    await ChatRoom.updateOne({ rideId: ride._id }, { $pull: { members: userId } });

    const me = await User.findById(userId).select("name").lean();
    const name = me?.name || "A passenger";

    await Message.create({
      rideId: ride._id,
      type: "SYSTEM",
      sender: null,
      text: `❌ ${name} left the ride before start.`,
      meta: { event: "PASSENGER_LEFT", userId: String(userId) },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("cancelRideAsPassenger error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
