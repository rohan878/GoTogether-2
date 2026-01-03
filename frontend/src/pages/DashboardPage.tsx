import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import NotificationBell from "../components/NotificationBell";

const ROUTE_CREATE_RIDE = "/create-ride";
const ROUTE_SETTINGS = "/settings";
const ROUTE_MONITORING = "/monitoring";

type Gps = { lat: number; lng: number };

function safeArea(address?: string) {
  if (!address) return "—";
  const parts = String(address)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ") || String(address);
}

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
    try {
      return String(v);
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeActiveRide(ride: any) {
  if (!ride) return null;
  const st = String(ride.status || "");
  if (st === "cancelled" || st === "completed") return null;
  return ride;
}

export default function DashboardPage() {
  const nav = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const [activeRide, setActiveRide] = useState<any>(null);
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAcceptId, setBusyAcceptId] = useState<string | null>(null);
  const [busyCancel, setBusyCancel] = useState(false);

  const [dnd, setDnd] = useState<boolean>(false);
  const [busyDnd, setBusyDnd] = useState(false);

  const [gps, setGps] = useState<Gps | null>(null);
  const [busyGps, setBusyGps] = useState(false);

  const radiusMeters = 2000;

  const suggestions = useMemo(() => {
    return (nearbyRides || []).map((r: any) => {
      const passengers = Array.isArray(r.passengers) ? r.passengers.length : 0;
      const seatsAvailable = Math.max(0, Number(r.seats || 0) - passengers);
      return {
        rideId: String(r._id),
        genderPreference: r.genderPreference || "any",
        distanceMeters: Number(r.distanceMeters || 0),
        destinationArea: safeArea(r.destination?.address),
        seatsAvailable,
      };
    });
  }, [nearbyRides]);

  async function loadActiveRideAndMe() {
    const a = await api.get("/api/rides/my/active");
    setActiveRide(normalizeActiveRide(a.data.ride || null));

    const meRes = await api.get("/api/auth/me");
    setMe(meRes.data?.user || null);
    setDnd(!!meRes.data?.user?.dnd);
  }

  async function loadNearby(coords: Gps | null) {
    if (!coords) {
      setNearbyRides([]);
      return;
    }

    const qs = `?radiusMeters=${radiusMeters}&lat=${coords.lat}&lng=${coords.lng}`;
    const s = await api.get(`/api/rides/nearby${qs}`);
    setNearbyRides(s.data.rides || []);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await loadActiveRideAndMe();
      await loadNearby(gps);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelRide() {
    const rideId = getId(activeRide?._id || activeRide?.id || activeRide);
    const myId = getId(me?._id || me?.id || me);
    if (!rideId || !myId) return;

    const riderId = getId(activeRide?.rider);
    const isRider = !!riderId && riderId === myId;

    const msg = isRider
      ? "Cancel the whole ride for everyone?"
      : "Leave this ride before it starts?";
    if (!confirm(msg)) return;

    setBusyCancel(true);
    setError("");
    try {
      if (isRider) {
        await api.post(`/api/rides/${rideId}/cancel`);
      } else {
        await api.post(`/api/rides/${rideId}/leave`);
      }

      // ✅ immediate UI fix (no more “still showing”)
      setActiveRide(null);

      await loadAll();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Action failed";
      setError(msg);
      alert(msg);
    } finally {
      setBusyCancel(false);
    }
  }

  async function acceptRide(rideId: string) {
    setBusyAcceptId(rideId);
    try {
      await api.post(`/api/rides/${rideId}/accept`);
      nav(`/chat/${rideId}`);
    } finally {
      setBusyAcceptId(null);
    }
  }

  async function toggleDnd() {
    setBusyDnd(true);
    try {
      const next = !dnd;
      setDnd(next);
      await api.patch("/api/auth/dnd", { dnd: next });
    } catch {
      setDnd((p) => !p);
      alert("DND update failed.");
    } finally {
      setBusyDnd(false);
    }
  }

  async function useMyCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }

    setBusyGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(coords);

        try {
          await api.post("/api/locations", coords);
        } catch {
          // ignore
        }

        try {
          await loadNearby(coords);
        } finally {
          setBusyGps(false);
        }
      },
      (err) => {
        console.error(err);
        setBusyGps(false);
        alert("Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-purple-800">💜 GoTogether</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create rides • Accept nearby requests • Temporary chat • Safety monitoring
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <NotificationBell />

              <button
                type="button"
                onClick={() => nav(ROUTE_MONITORING)}
                className="px-5 py-2 rounded-2xl bg-white border border-purple-200 text-purple-800 font-semibold hover:bg-purple-50"
              >
                🛡️ Monitoring
              </button>

              <button
                type="button"
                onClick={() => nav(ROUTE_CREATE_RIDE)}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow hover:opacity-95"
              >
                + Create Ride
              </button>

              <button
                type="button"
                onClick={() => nav(ROUTE_SETTINGS)}
                className="px-5 py-2 rounded-2xl bg-white border border-purple-200 text-purple-800 font-semibold hover:bg-purple-50"
              >
                ⚙️ Settings
              </button>

              <button
                type="button"
                onClick={toggleDnd}
                disabled={busyDnd}
                className={`px-5 py-2 rounded-2xl font-semibold shadow-sm border ${
                  dnd
                    ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                } disabled:opacity-60`}
                title="Do Not Disturb"
              >
                {busyDnd ? "Updating..." : dnd ? "🔕 DND ON" : "🔔 DND OFF"}
              </button>

              <button
                type="button"
                onClick={useMyCurrentLocation}
                disabled={busyGps}
                className="px-5 py-2 rounded-2xl bg-white border border-purple-200 text-purple-800 font-semibold hover:bg-purple-50 disabled:opacity-60"
              >
                {busyGps ? "Locating..." : "📡 Use my current location"}
              </button>
            </div>
          </div>

          {/* Module 4: show trust/reward signals */}
          {me ? (
            <div className="mt-4 flex flex-wrap gap-3 items-center text-sm">
              <span className="px-3 py-1 rounded-2xl bg-white border border-purple-200 text-purple-800">
                👤 {me.name || "You"}
              </span>
              <span className="px-3 py-1 rounded-2xl bg-white border border-purple-200 text-purple-800">
                ⭐ Rating: {Number(me.ratingAvg || 0).toFixed(2)} ({me.ratingCount || 0})
              </span>
              <span className="px-3 py-1 rounded-2xl bg-white border border-purple-200 text-purple-800">
                ✅ Reliability: {me.reliabilityScore ?? 100}/100
              </span>
              <span className="px-3 py-1 rounded-2xl bg-white border border-purple-200 text-purple-800">
                🎁 Discount: {me.discountPct ?? 0}%
              </span>
            </div>
          ) : null}

          {gps ? (
            <p className="mt-3 text-xs text-gray-600">
              Using GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          ) : (
            <p className="mt-3 text-xs text-gray-600">
              Tip: Click <span className="font-semibold">“Use my current location”</span> to see nearby rides.
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6 text-gray-600">
            Loading…
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold text-purple-800">🚗 My Active Ride</h2>
                <button
                  type="button"
                  onClick={loadAll}
                  className="px-4 py-2 rounded-2xl bg-white border border-purple-200 text-purple-800 font-semibold hover:bg-purple-50"
                >
                  Refresh
                </button>
              </div>

              {!activeRide ? (
                <p className="mt-2 text-gray-600">No active ride right now.</p>
              ) : (
                <div className="mt-3 rounded-2xl border border-purple-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold">
                      Status: {activeRide.status}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-semibold">
                      Seats: {activeRide.seats}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mt-3">
                    <span className="font-semibold">From:</span> {activeRide.origin?.address || "—"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">To:</span> {activeRide.destination?.address || "—"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => nav(`/chat/${getId(activeRide._id)}`)}
                      className="px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow hover:opacity-95"
                    >
                      💬 Open Chat
                    </button>

                    <button
                      type="button" // ✅ FIX: prevent silent submit
                      onClick={cancelRide}
                      disabled={busyCancel}
                      className="px-5 py-2 rounded-2xl bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyCancel ? "Cancelling..." : "❌ Cancel Ride"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
              <h2 className="text-xl font-extrabold text-purple-800">📍 Nearby Ride Requests</h2>
              <p className="text-sm text-gray-600 mt-1">
                Suggestions are based on your GPS (up to 2km). For privacy, initial cards show only distance & destination.
              </p>

              {!gps ? (
                <div className="mt-4 text-gray-600">
                  Please allow location access to see nearby rides.
                </div>
              ) : suggestions.length === 0 ? (
                <div className="mt-4 text-gray-600">No nearby rides found right now.</div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {suggestions.map((s: any) => (
                    <div
                      key={s.rideId}
                      className="rounded-2xl border border-purple-200 bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-extrabold text-purple-800">
                          Preference: {s.genderPreference} • {s.distanceMeters}m away
                        </div>
                        <div className="text-xs text-gray-700">Destination: {s.destinationArea}</div>
                        <div className="text-xs text-gray-500">Seats available: {s.seatsAvailable}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => acceptRide(s.rideId)}
                        disabled={busyAcceptId === s.rideId}
                        className="px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow hover:opacity-95 disabled:opacity-60"
                      >
                        {busyAcceptId === s.rideId ? "Accepting..." : "✅ Accept"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
