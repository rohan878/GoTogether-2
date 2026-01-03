import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as RideController from "./ride.controller";
import scheduledRideRoutes from "./scheduledRide.routes";

const router = Router();

function mustFn(fn: any, name: string) {
  if (typeof fn !== "function") {
    throw new Error(
      `ride.routes.ts: Handler "${name}" is not a function. Check your export/import in ride.controller.ts`
    );
  }
  return fn;
}

// Active ride
router.get(
  "/my/active",
  requireAuth,
  mustFn((RideController as any).getMyActiveRide, "getMyActiveRide")
);

// Create ride
router.post("/", requireAuth, mustFn((RideController as any).createRide, "createRide"));

// Nearby rides
router.get("/nearby", requireAuth, mustFn((RideController as any).getNearbyRides, "getNearbyRides"));

// Ride details (participants only) — keep path specific to avoid clashing with /scheduled
router.get("/detail/:id", requireAuth, mustFn((RideController as any).getRideById, "getRideById"));

// Accept / Leave
router.post("/:id/accept", requireAuth, mustFn((RideController as any).acceptRide, "acceptRide"));
router.post("/:id/leave", requireAuth, mustFn((RideController as any).leaveRide, "leaveRide"));

// ✅ CANCEL — support BOTH endpoint styles + BOTH methods
// Style A: /api/rides/:id/cancel  (PATCH/POST)
router.patch("/:id/cancel", requireAuth, mustFn((RideController as any).cancelRide, "cancelRide"));
router.post("/:id/cancel", requireAuth, mustFn((RideController as any).cancelRide, "cancelRide"));

// Style B: /api/rides/cancel/:id (PATCH/POST)  <-- many frontends do this by mistake
router.patch("/cancel/:id", requireAuth, mustFn((RideController as any).cancelRide, "cancelRide"));
router.post("/cancel/:id", requireAuth, mustFn((RideController as any).cancelRide, "cancelRide"));

// ETA / Panic / Stops / Confirm / Countdown
router.get("/:id/eta", requireAuth, mustFn((RideController as any).getRideEta, "getRideEta"));
router.post("/:id/panic", requireAuth, mustFn((RideController as any).panicAlert, "panicAlert"));
router.put("/:id/stops", requireAuth, mustFn((RideController as any).updateStops, "updateStops"));
router.post("/:id/confirm", requireAuth, mustFn((RideController as any).confirmFareShare, "confirmFareShare"));
router.post(
  "/:id/countdown/start",
  requireAuth,
  mustFn((RideController as any).startPickupCountdown, "startPickupCountdown")
);

// Module 4: mark ride completed (enables ratings + rewards)
router.post(
  "/:id/complete",
  requireAuth,
  mustFn((RideController as any).completeRide, "completeRide")
);

// Scheduled routes
router.use("/scheduled", scheduledRideRoutes);

export default router;
