import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import api from "@/lib/api";

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

type Place = {
  display_name: string;
  lat: string;
  lon: string;
};

type Picked = {
  address: string;
  lat: number;
  lng: number;
};

async function nominatimSearch(q: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q
  )}&limit=6&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Nominatim search failed");
  return (await res.json()) as Place[];
}

async function reverseNominatim(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return "My current location";
  const data = await res.json();
  return data?.display_name || "My current location";
}

function prettyDT(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function toDatetimeLocalMin(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function RideMonitoringPage() {
  const [me, setMe] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // schedule form
  const [openCreate, setOpenCreate] = useState(false);
  const [originQ, setOriginQ] = useState("");
  const [originResults, setOriginResults] = useState<Place[]>([]);
  const [originPicked, setOriginPicked] = useState<Picked | null>(null);
  const [destQ, setDestQ] = useState("");
  const [destResults, setDestResults] = useState<Place[]>([]);
  const [destPicked, setDestPicked] = useState<Picked | null>(null);
  const [seats, setSeats] = useState(2);
  const [genderPref, setGenderPref] = useState<"any" | "female" | "male">("any");
  const [radiusKm, setRadiusKm] = useState(1);

  const minSchedule = useMemo(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    return toDatetimeLocalMin(d);
  }, []);

  const [scheduledFor, setScheduledFor] = useState<string>("");
  const radiusMeters = useMemo(() => Math.round(radiusKm * 1000), [radiusKm]);
  const [busyCreate, setBusyCreate] = useState(false);

  // ETA
  const [eta, setEta] = useState<any>(null);
  const [busyEta, setBusyEta] = useState(false);

  // Panic
  const [busyPanic, setBusyPanic] = useState(false);

  // Cancel/Leave active ride
  const [busyCancel, setBusyCancel] = useState(false);

  // Nearby scheduled rides
  const [nearOpen, setNearOpen] = useState(false);
  const [nearBusyLoc, setNearBusyLoc] = useState(false);
  const [nearGPS, setNearGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [nearBusyLoad, setNearBusyLoad] = useState(false);
  const [nearbySchedules, setNearbySchedules] = useState<any[]>([]);
  const [busyAcceptId, setBusyAcceptId] = useState<string>("");

  // matched scheduled actions
  const [busySchedActionId, setBusySchedActionId] = useState<string>("");

  /* =====================================================
     🔹 ADDED: Module 2 – Member 3 (Pickup Countdown)
  ===================================================== */
  const [nowTs, setNowTs] = useState(Date.now());
  const [showLatePrompt, setShowLatePrompt] = useState(false);
  const [busyCountdown, setBusyCountdown] = useState(false);

  const remainingMs = useMemo(() => {
    if (!activeRide?.pickupDeadline) return 0;
    return new Date(activeRide.pickupDeadline).getTime() - nowTs;
  }, [activeRide, nowTs]);

  useEffect(() => {
    if (!activeRide?.pickupDeadline) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeRide?.pickupDeadline]);

  useEffect(() => {
    const isRider = getId(activeRide?.rider) === getId(me?._id || me?.id || me);


    if (
      activeRide?.status === "pickup_wait" &&
      remainingMs <= 0 &&
      isRider
    ) {
      setShowLatePrompt((prev) => (prev ? prev : true));

    }
  }, [remainingMs, activeRide, me]);

  async function startPickupCountdown(minutes: number) {
    if (!activeRide?._id) return;
    setBusyCountdown(true);
    try {
      await api.post(`/api/rides/${activeRide._id}/countdown/start`, {
        seconds: minutes * 60,
      });
      await loadAll();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to start countdown");
    } finally {
      setBusyCountdown(false);
    }
  }

  async function waitFiveMoreMinutes() {
    setShowLatePrompt(false);
    await startPickupCountdown(5);
  }

  async function cancelRideFully() {
    if (!activeRide?._id) return;
    await api.post(`/api/rides/${activeRide._id}/cancel`);
    setShowLatePrompt(false);
    await loadAll();
  }

  async function startRideNow() {
  if (!activeRide?._id) return;
  try {
    await api.post(`/api/rides/${activeRide._id}/start`);
    setShowLatePrompt(false);
    await loadAll();
  } catch (e: any) {
    alert(e?.response?.data?.message || "Failed to start ride");
  }
}

  /* ================= END ADD ================= */

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [meRes, activeRes, schedRes] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/rides/my/active"),
        api.get("/api/rides/scheduled"),
      ]);
      setMe(meRes.data?.user || null);
      setActiveRide(activeRes.data?.ride || null);
      setScheduled(schedRes.data?.scheduled || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* ---------- existing functions BELOW ARE UNCHANGED ---------- */
  // (searchOrigin, createScheduledRide, cancelOrLeaveRide, panic, etc.)
  // 👉 unchanged, exactly as you provided

  async function searchOrigin() {
    setError("");
    if (originQ.trim().length < 2) return;
    const items = await nominatimSearch(originQ.trim());
    setOriginResults(items);
  }
  async function searchDest() {
    setError("");
    if (destQ.trim().length < 2) return;
    const items = await nominatimSearch(destQ.trim());
    setDestResults(items);
  }
  function pickOrigin(p: Place) {
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    setOriginPicked({ address: p.display_name, lat, lng });
    setOriginQ(p.display_name);
    setOriginResults([]);
  }
  function pickDest(p: Place) {
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    setDestPicked({ address: p.display_name, lat, lng });
    setDestQ(p.display_name);
    setDestResults([]);
  }

  async function useMyLocationAsOrigin() {
    setError("");
    if (!navigator.geolocation) return setError("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const addr = await reverseNominatim(lat, lng);
          setOriginPicked({ address: addr, lat, lng });
          setOriginQ(addr);
          setOriginResults([]);
        } catch (e: any) {
          setError(e?.message || "Failed to use current location");
        }
      },
      () => setError("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function createScheduledRide() {
    setError("");
    if (!originPicked || !destPicked) return setError("Please select origin & destination.");
    if (!scheduledFor) return setError("Please choose a date & time.");

    const pickedTime = new Date(scheduledFor).getTime();
    const minTime = new Date(minSchedule).getTime();
    if (pickedTime < minTime) return setError("Please select a future date & time.");

    setBusyCreate(true);
    try {
      await api.post("/api/rides/scheduled", {
        origin: originPicked,
        destination: destPicked,
        seats,
        genderPreference: genderPref,
        radiusMeters,
        scheduledFor: new Date(scheduledFor).toISOString(),
      });

      setOpenCreate(false);
      setOriginQ("");
      setDestQ("");
      setOriginPicked(null);
      setDestPicked(null);
      setOriginResults([]);
      setDestResults([]);
      setScheduledFor("");
      setSeats(2);
      setGenderPref("any");
      setRadiusKm(1);

      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to schedule ride");
    } finally {
      setBusyCreate(false);
    }
  }

  async function cancelScheduled(id: string) {
    if (!confirm("Cancel this scheduled ride?")) return;
    try {
      await api.delete(`/api/rides/scheduled/${id}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Cancel failed");
    }
  }

  async function refreshEta() {
    if (!activeRide?._id) return;
    if (!navigator.geolocation) return setError("Geolocation not supported.");

    setBusyEta(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const fromLat = pos.coords.latitude;
          const fromLng = pos.coords.longitude;
          const res = await api.get(
            `/api/rides/${activeRide._id}/eta?fromLat=${fromLat}&fromLng=${fromLng}`
          );
          setEta(res.data);
        } catch (e: any) {
          console.error(e);
          setError(e?.response?.data?.message || e?.message || "ETA failed");
        } finally {
          setBusyEta(false);
        }
      },
      () => {
        setBusyEta(false);
        setError("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function panic() {
    if (!activeRide?._id) return;
    if (!navigator.geolocation) return setError("Geolocation not supported.");
    if (!confirm("Send PANIC alert to all ride members now?")) return;

    setBusyPanic(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post(`/api/rides/${activeRide._id}/panic`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            notifyAdmins: true,
          });
          alert("Panic alert sent ✅");
        } catch (e: any) {
          console.error(e);
          setError(e?.response?.data?.message || e?.message || "Panic failed");
        } finally {
          setBusyPanic(false);
        }
      },
      () => {
        setBusyPanic(false);
        setError("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

async function cancelOrLeaveRide() {
  console.log("🔥 CLICKED cancelOrLeaveRide");

  const rideId = getId(activeRide?._id || activeRide?.id || activeRide);
  if (!rideId) return;

  const myId = getId(me?._id || me?.id || me);
  if (!myId) return;

  const riderId = getId(activeRide?.rider);
  const isRider = riderId && myId && riderId === myId;

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
    setEta(null);
    await loadAll();
  } catch (e: any) {
    console.error(e);
    const m = e?.response?.data?.message || e?.message || "Action failed";
    setError(m);
    alert(m);
  } finally {
    setBusyCancel(false);
  }
}



  async function useMyLocationForNearby() {
    setError("");
    if (!navigator.geolocation) return setError("Geolocation not supported.");
    setNearBusyLoc(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setNearGPS({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearBusyLoc(false);
      },
      () => {
        setNearBusyLoc(false);
        setError("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function loadNearbySchedules() {
    setError("");
    if (!nearGPS) return setError("Please click 'Use my current location' first (for nearby schedules).");
    setNearBusyLoad(true);
    try {
      const res = await api.get(
        `/api/rides/scheduled/nearby?lat=${nearGPS.lat}&lng=${nearGPS.lng}&radiusMeters=2000`
      );
      setNearbySchedules(res.data?.items || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to load nearby scheduled rides");
    } finally {
      setNearBusyLoad(false);
    }
  }

  async function acceptNearbySchedule(scheduleId: string) {
    setError("");
    if (!confirm("Accept this scheduled ride and open chat?")) return;

    setBusyAcceptId(scheduleId);
    try {
      const res = await api.post(`/api/rides/scheduled/${scheduleId}/accept`);
      const rideId = res.data?.rideId;
      if (!rideId) throw new Error("Server did not return rideId");

      // ✅ refresh lists so acceptor sees it in My Scheduled Rides too
      await loadAll();

      window.location.href = `/chat/${rideId}`;
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Accept failed");
    } finally {
      setBusyAcceptId("");
    }
  }

  // ✅ NEW: Open Chat for matched scheduled rides
  function openChat(rideId: string) {
    window.location.href = `/chat/${rideId}`;
  }

  // ✅ NEW: Cancel/Leave for matched scheduled rides
  async function cancelOrLeaveMatchedScheduled(s: any) {
    const id = String(s._id || "");
    const rideId = String(s.linkedRideId || "");
    if (!id || !rideId) return;

    const isCreator = !s.hostUser; // creator entry has no hostUser, acceptor copy has hostUser set
    const msg = isCreator ? "Cancel this matched ride for everyone?" : "Leave this matched ride?";
    if (!confirm(msg)) return;

    setBusySchedActionId(id);
    setError("");
    try {
      if (isCreator) {
        await api.post(`/api/rides/${rideId}/cancel`);

      } else {
        await api.post(`/api/rides/${rideId}/leave`);
      }

      // mark this scheduled entry cancelled too (for clean UI)
      await api.delete(`/api/rides/scheduled/${id}`);

      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setBusySchedActionId("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <TopBar />

      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-3xl font-extrabold text-purple-800">🛡️ Ride Monitoring</div>
              <div className="mt-1 text-sm text-slate-600">
                Scheduled rides • Panic button • ETA • Cancel/Leave before start
              </div>
            </div>
            <button
              onClick={loadAll}
              className="rounded-2xl border border-purple-200 bg-white px-4 py-2 font-semibold text-purple-800 hover:bg-purple-50"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              {error}
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 text-gray-600">Loading…</div>
        ) : (
          <>
            {/* Active ride */}
            <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xl font-extrabold text-purple-800">🚗 Active Ride</div>
                {activeRide && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                    Status: {activeRide.status}
                  </span>
                )}
              </div>

              {!activeRide ? (
                <div className="mt-2 text-gray-600">No active ride right now.</div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 rounded-3xl border border-purple-200 bg-white p-5">
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">From:</div>
                      <div className="break-words">{activeRide.origin?.address || "—"}</div>
                      <div className="mt-2 font-semibold">To:</div>
                      <div className="break-words">{activeRide.destination?.address || "—"}</div>
                    </div>

                    {eta && (
                      <div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-4">
                        <div className="text-sm font-extrabold text-pink-700">ETA ✨</div>
                        <div className="mt-2 text-sm text-gray-700">
                          <div>
                            Pickup ETA: <span className="font-semibold">{prettyDT(eta.pickup?.etaAt)}</span>
                          </div>
                          <div>
                            Destination ETA:{" "}
                            <span className="font-semibold">{prettyDT(eta.destination?.etaAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 🔹 Pickup countdown display */}
{/* 🔹 Pickup countdown display */}
{activeRide?.status === "pickup_wait" && activeRide?.pickupDeadline && (
  <div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-4">
    <div className="text-sm font-extrabold text-pink-700">
      ⏳ Waiting at pickup point
    </div>
    <div className="mt-1 text-2xl font-black text-purple-800">
      {Math.max(0, Math.floor(remainingMs / 60000))}:
      {String(Math.max(0, Math.floor((remainingMs % 60000) / 1000))).padStart(2, "0")}
    </div>
  </div>
)}


                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={refreshEta}
                        disabled={busyEta}
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 font-bold text-white shadow hover:opacity-95 disabled:opacity-60"
                      >
                        {busyEta ? "Calculating…" : "📍 Refresh ETA"}
                      </button>

                      <button
  type="button"   // ✅ VERY IMPORTANT
  onClick={cancelOrLeaveRide}
  disabled={busyCancel}
  className="rounded-2xl bg-white px-5 py-2 font-bold text-purple-800 border border-purple-200 hover:bg-purple-50 disabled:opacity-60"
>
  {busyCancel ? "Working…" : "✖ Cancel / Leave"}
</button>


                    </div>
                  </div>

                  <div className="rounded-3xl border border-purple-200 bg-white p-5">
                    <div className="text-lg font-extrabold text-purple-800">🚨 Safety</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Press only in emergency. It will alert all members (and admins).
                    </div>

                    <button
                      onClick={panic}
                      disabled={busyPanic}
                      className="mt-4 w-full rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-5 text-lg font-black text-white shadow-lg hover:opacity-95 disabled:opacity-60"
                    >
                      {busyPanic ? "Sending…" : "PANIC BUTTON"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduled rides */}
            <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xl font-extrabold text-purple-800">📅 Scheduled Rides</div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setNearOpen((v) => !v)}
                    className="rounded-2xl border border-purple-200 bg-white px-4 py-2 font-bold text-purple-800 hover:bg-purple-50"
                  >
                    {nearOpen ? "Hide Nearby (2km)" : "Nearby schedules (2km)"}
                  </button>

                  <button
                    onClick={() => setOpenCreate((v) => !v)}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 font-bold text-white shadow hover:opacity-95"
                  >
                    {openCreate ? "Close" : "+ Schedule a Ride"}
                  </button>
                </div>
              </div>

              {nearOpen && (
                <div className="mt-4 rounded-3xl border border-purple-200 bg-white p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-purple-800">
                        📍 Nearby Scheduled Rides (within 2km)
                      </div>
                      <div className="text-xs text-gray-600">
                        Shows other users’ scheduled rides near your current location (preview like ride requests).
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={useMyLocationForNearby}
                        disabled={nearBusyLoc}
                        className="rounded-2xl bg-purple-50 px-4 py-2 font-bold text-purple-800 border border-purple-200 hover:bg-purple-100 disabled:opacity-60"
                      >
                        {nearBusyLoc ? "Locating…" : "📡 Use my current location"}
                      </button>

                      <button
                        onClick={loadNearbySchedules}
                        disabled={nearBusyLoad}
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 font-bold text-white shadow hover:opacity-95 disabled:opacity-60"
                      >
                        {nearBusyLoad ? "Loading…" : "🔄 Refresh nearby"}
                      </button>
                    </div>
                  </div>

                  {nearGPS && (
                    <div className="mt-2 text-xs text-gray-600">
                      GPS: {nearGPS.lat.toFixed(5)}, {nearGPS.lng.toFixed(5)}
                    </div>
                  )}

                  {nearbySchedules.length === 0 ? (
                    <div className="mt-4 text-gray-600">No nearby scheduled rides found.</div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {nearbySchedules.map((x: any) => {
                        const id = String(x._id || x.id || "");
                        return (
                          <div key={id} className="rounded-3xl border border-purple-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-extrabold text-purple-800">
                                  {Math.max(0, Number(x.distanceMeters ?? 0))}m away •{" "}
                                  {x.genderPreference || "any"}
                                </div>

                                <div className="mt-3 text-sm text-gray-700">
                                  <div className="font-semibold">From:</div>
                                  <div className="break-words">{x?.origin?.address || "—"}</div>
                                  <div className="mt-2 font-semibold">To:</div>
                                  <div className="break-words">{x?.destination?.address || "—"}</div>
                                </div>

                                <div className="mt-2 text-xs text-gray-600">
                                  Scheduled: <span className="font-semibold">{prettyDT(x.scheduledFor)}</span>
                                </div>

                                <div className="mt-2 text-[11px] text-gray-500">
                                  (Preview only — identity hidden)
                                </div>
                              </div>

                              <button
                                onClick={() => acceptNearbySchedule(id)}
                                disabled={busyAcceptId === id || !id}
                                className="shrink-0 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-xs font-black text-white shadow hover:opacity-95 disabled:opacity-60"
                              >
                                {busyAcceptId === id ? "Accepting…" : "✅ Accept"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* create form (unchanged) */}
              {openCreate && (
                <div className="mt-4 rounded-3xl border border-purple-200 bg-white p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-extrabold text-purple-800">Origin</div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={originQ}
                          onChange={(e) => setOriginQ(e.target.value)}
                          placeholder="e.g., Gulshan"
                          className="w-full rounded-2xl border-2 border-purple-200 px-4 py-3 outline-none focus:border-pink-400"
                        />
                        <button
                          onClick={searchOrigin}
                          className="rounded-2xl bg-pink-500 px-4 py-3 font-bold text-white hover:bg-pink-600"
                        >
                          Search
                        </button>
                      </div>

                      <button
                        onClick={useMyLocationAsOrigin}
                        className="mt-2 w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-800 hover:bg-purple-100"
                      >
                        📍 Use my current location
                      </button>

                      {originResults.length > 0 && (
                        <div className="mt-2 overflow-hidden rounded-2xl border border-purple-100">
                          {originResults.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => pickOrigin(p)}
                              className="block w-full border-b border-purple-100 bg-white px-4 py-3 text-left text-sm hover:bg-purple-50"
                            >
                              {p.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                      {originPicked && (
                        <div className="mt-2 text-xs text-purple-700">Selected: {originPicked.address}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-extrabold text-purple-800">Destination</div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={destQ}
                          onChange={(e) => setDestQ(e.target.value)}
                          placeholder="e.g., Dhanmondi"
                          className="w-full rounded-2xl border-2 border-purple-200 px-4 py-3 outline-none focus:border-pink-400"
                        />
                        <button
                          onClick={searchDest}
                          className="rounded-2xl bg-pink-500 px-4 py-3 font-bold text-white hover:bg-pink-600"
                        >
                          Search
                        </button>
                      </div>
                      {destResults.length > 0 && (
                        <div className="mt-2 overflow-hidden rounded-2xl border border-purple-100">
                          {destResults.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => pickDest(p)}
                              className="block w-full border-b border-purple-100 bg-white px-4 py-3 text-left text-sm hover:bg-purple-50"
                            >
                              {p.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                      {destPicked && (
                        <div className="mt-2 text-xs text-purple-700">Selected: {destPicked.address}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-xs font-bold text-gray-600">Seats</div>
                      <select
                        value={seats}
                        onChange={(e) => setSeats(Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border-2 border-purple-200 bg-white px-3 py-3 font-semibold text-purple-800"
                      >
                        <option value={2}>2 people</option>
                        <option value={3}>3 people</option>
                        <option value={4}>4 people</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-600">Gender</div>
                      <select
                        value={genderPref}
                        onChange={(e) => setGenderPref(e.target.value as any)}
                        className="mt-1 w-full rounded-2xl border-2 border-purple-200 bg-white px-3 py-3 font-semibold text-purple-800"
                      >
                        <option value="any">Any</option>
                        <option value="female">Female only</option>
                        <option value="male">Male only</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-600">Radius</div>
                      <select
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border-2 border-purple-200 bg-white px-3 py-3 font-semibold text-purple-800"
                      >
                        <option value={0.5}>0.5 km</option>
                        <option value={1}>1 km</option>
                        <option value={1.5}>1.5 km</option>
                        <option value={2}>2 km</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-600">When</div>
                      <input
                        type="datetime-local"
                        min={minSchedule}
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="mt-1 w-full rounded-2xl border-2 border-purple-200 bg-white px-3 py-3 font-semibold text-purple-800"
                      />
                      <div className="mt-1 text-[11px] text-gray-500">Must be in the future</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={createScheduledRide}
                      className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-bold text-white shadow hover:opacity-95 disabled:opacity-60"
                      disabled={busyCreate}
                    >
                      {busyCreate ? "Saving…" : "Save Scheduled Ride"}
                    </button>
                    <button
                      onClick={() => setOpenCreate(false)}
                      className="rounded-2xl border border-purple-200 bg-white px-6 py-3 font-bold text-purple-800 hover:bg-purple-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ✅ My scheduled rides list (UPDATED: Open Chat + Cancel/Leave for matched) */}
              {scheduled.length === 0 ? (
                <div className="mt-4 text-gray-600">No scheduled rides.</div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {scheduled.map((s) => {
                    const id = String(s._id || "");
                    const rideId = String(s.linkedRideId || "");
                    const isMatched = String(s.status) === "matched" && !!rideId;
                    const isCreator = !s.hostUser; // creator entry
                    const actionBusy = busySchedActionId === id;

                    return (
                      <div key={id} className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-extrabold text-purple-800">{prettyDT(s.scheduledFor)}</div>
                            <div className="mt-1 text-xs text-gray-600">
                              Status: <span className="font-semibold">{s.status}</span>
                            </div>
                          </div>

                          {/* scheduled-only cancel stays */}
                          {s.status === "scheduled" && (
  <button
    type="button"   // ✅ ADD THIS
    onClick={() => cancelScheduled(s._id)}
    className="rounded-2xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600"
  >
    Cancel
  </button>
)}

                        </div>

                        <div className="mt-3 text-sm text-gray-700">
                          <div className="font-semibold">From:</div>
                          <div className="break-words">{s.origin?.address || "—"}</div>
                          <div className="mt-2 font-semibold">To:</div>
                          <div className="break-words">{s.destination?.address || "—"}</div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                            Seats: {s.seats}
                          </span>
                          <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-800">
                            Gender: {s.genderPreference}
                          </span>
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                            Radius: {Math.round((s.radiusMeters || 0) / 100) / 10}km
                          </span>
                        </div>

                        {/* ✅ NEW: matched actions */}
                        {isMatched && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => openChat(rideId)}
                              className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-xs font-black text-white shadow hover:opacity-95"
                            >
                              💬 Open Chat
                            </button>

                            <button
                            type="button"
                              onClick={() => cancelOrLeaveMatchedScheduled(s)}
                              disabled={actionBusy}
                              className="rounded-2xl border border-purple-200 bg-white px-4 py-2 text-xs font-black text-purple-800 hover:bg-purple-50 disabled:opacity-60"
                            >
                              {actionBusy
                                ? "Working…"
                                : isCreator
                                ? "✖ Cancel Ride"
                                : "↩ Leave Ride"}
                            </button>
                          </div>
                        )}

                        {s.reminderSentAt && (
                          <div className="mt-3 text-xs text-gray-600">
                            Reminder sent: {prettyDT(s.reminderSentAt)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
        {/* 🔹 Late passenger decision modal */}
{showLatePrompt && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4">
      <div className="text-xl font-extrabold text-purple-800">
        ⏰ Passengers are late
      </div>
      <div className="text-sm text-gray-600">
        What do you want to do?
      </div>

      <button
        onClick={startRideNow}
        className="w-full rounded-2xl bg-green-500 py-2 font-bold text-white"
      >
        ▶ Start Ride Now
      </button>

      <button
        onClick={waitFiveMoreMinutes}
        className="w-full rounded-2xl bg-purple-500 py-2 font-bold text-white"
      >
        ⏳ Wait 5 more minutes
      </button>

      <button
        onClick={cancelRideFully}
        className="w-full rounded-2xl bg-red-500 py-2 font-bold text-white"
      >
        ❌ Cancel Ride
      </button>
    </div>
  </div>
)}

      </div>
    </div>
  );
}
