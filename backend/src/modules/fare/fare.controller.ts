import type { Request, Response } from "express";
import { Ride } from "../rides/ride.model";

function getUserId(req: any) {
  return req.user?._id || req.userId;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function calcFare(distanceMeters: number) {
  // simple BD-ish estimate (change numbers if you want)
  const baseFare = 60;
  const perKm = 18;
  const km = distanceMeters / 1000;
  const totalFare = Math.round(baseFare + perKm * km);
  return { baseFare, perKm, totalFare };
}

function buildQuote(ride: any) {
  const o = ride?.origin;
  const d = ride?.destination;

  const oLat = Number(o?.lat);
  const oLng = Number(o?.lng);
  const dLat = Number(d?.lat);
  const dLng = Number(d?.lng);

  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) {
    return null;
  }

  const distanceMeters = haversineMeters(oLat, oLng, dLat, dLng);
  const { baseFare, perKm, totalFare } = calcFare(distanceMeters);

  const passengerCount = 1 + (Array.isArray(ride.passengers) ? ride.passengers.length : 0);
  const perPassengerFare = Math.ceil(totalFare / Math.max(1, passengerCount));

  return {
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: null, // (optional) if later you integrate ORS
    baseFare,
    perKm,
    totalFare,
    passengerCount,
    perPassengerFare,
    note: "Estimate (no ORS key)",
  };
}

// POST /api/fare/:rideId/quote  (frontend already calls this sometimes)
export const generateQuote = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId).select("rider passengers origin destination status");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isRider = String((ride as any).rider) === String(userId);
    if (!isRider) return res.status(403).json({ message: "Only rider can generate quote" });

    const quote = buildQuote(ride);
    if (!quote) return res.status(400).json({ message: "Ride has invalid origin/destination coords" });

    return res.json({ quote });
  } catch (e: any) {
    console.error("generateQuote error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/fare/:rideId/quote (frontend ChatPage uses this)
export const getQuote = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId).select("rider passengers origin destination status");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const isRider = String((ride as any).rider) === String(userId);
    const isPassenger = (ride as any).passengers?.some((p: any) => String(p) === String(userId));
    if (!isRider && !isPassenger) return res.status(403).json({ message: "Not allowed" });

    const quote = buildQuote(ride);
    if (!quote) return res.status(400).json({ message: "Ride has invalid origin/destination coords" });

    return res.json({ quote });
  } catch (e: any) {
    console.error("getQuote error:", e?.message || e);
    return res.status(500).json({ message: "Server error" });
  }
};

// keep these exports so routes file doesn't crash even if unused right now
export const confirmShare = async (_req: Request, res: Response) => res.json({ ok: true });
export const pendingConfirmations = async (_req: Request, res: Response) => res.json({ pending: [] });
