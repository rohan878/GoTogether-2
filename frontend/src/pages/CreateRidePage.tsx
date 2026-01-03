import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";

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

async function nominatimReverse(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Nominatim reverse failed");
  const data: any = await res.json();
  return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function CreateRidePage() {
  const nav = useNavigate();

  const [error, setError] = useState<string>("");

  // origin state
  const [originQ, setOriginQ] = useState("");
  const [originResults, setOriginResults] = useState<Place[]>([]);
  const [originPicked, setOriginPicked] = useState<Picked | null>(null);
  const [originLoading, setOriginLoading] = useState(false);

  // destination state
  const [destQ, setDestQ] = useState("");
  const [destResults, setDestResults] = useState<Place[]>([]);
  const [destPicked, setDestPicked] = useState<Picked | null>(null);
  const [destLoading, setDestLoading] = useState(false);

  // ride options
  const [seats, setSeats] = useState(2);
  const [genderPref, setGenderPref] = useState<"any" | "female" | "male">("any");
  const [radiusKm, setRadiusKm] = useState(1); // 0.5–2km
  const [dnd, setDnd] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const radiusMeters = useMemo(() => Math.round(radiusKm * 1000), [radiusKm]);

  async function searchOrigin() {
    setError("");
    if (originQ.trim().length < 2) return;
    setOriginLoading(true);
    try {
      const items = await nominatimSearch(originQ.trim());
      setOriginResults(items);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Origin search failed");
    } finally {
      setOriginLoading(false);
    }
  }

  async function searchDest() {
    setError("");
    if (destQ.trim().length < 2) return;
    setDestLoading(true);
    try {
      const items = await nominatimSearch(destQ.trim());
      setDestResults(items);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Destination search failed");
    } finally {
      setDestLoading(false);
    }
  }

  async function pickOrigin(p: Place) {
    setError("");
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    setOriginPicked({ address: p.display_name, lat, lng });
    setOriginQ(p.display_name);
    setOriginResults([]);
  }

  async function pickDest(p: Place) {
    setError("");
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    setDestPicked({ address: p.display_name, lat, lng });
    setDestQ(p.display_name);
    setDestResults([]);
  }

  function useMyLocationForOrigin() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = await nominatimReverse(lat, lng);
          setOriginPicked({ address, lat, lng });
          setOriginQ(address);
          setOriginResults([]);
        } catch (e: any) {
          console.error(e);
          setError(e?.message || "Failed to reverse-geocode location.");
        }
      },
      () => setError("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function createRide(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!originPicked || !destPicked) {
      setError("Please select both origin and destination.");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ IMPORTANT: only ONE backend route
      // If your backend uses different route, change it here only.
      const res = await api.post("/api/rides", {
        origin: originPicked,
        destination: destPicked,
        seats,
        genderPreference: genderPref,
        radiusMeters,
        dnd,
      });

      const rideId = res.data?.ride?._id || res.data?._id || res.data?.rideId;
      if (!rideId) {
        setError("Ride created, but rideId missing from server response.");
        return;
      }

      // go to chat/ride room
      nav(`/chat/${rideId}`);
    } catch (err: any) {
      console.error(err);

      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create ride";

      // If backend says route not found, show clearer debug
      if (status === 404) {
        setError(`${msg} (Backend route mismatch: POST /api/rides not found)`);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <TopBar />

      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 shadow-sm">
          <div className="text-4xl font-extrabold text-purple-700">Create a Ride 💗</div>
          <div className="mt-2 text-slate-600">
            Choose origin + destination, seats, gender preference, and radius.
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={createRide} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* ORIGIN */}
              <div className="rounded-3xl border border-purple-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold text-purple-700">Origin</div>
                  <button
                    type="button"
                    onClick={useMyLocationForOrigin}
                    className="rounded-2xl bg-purple-500 px-4 py-2 font-bold text-white hover:bg-purple-600"
                  >
                    Use My Location
                  </button>
                </div>

                <div className="mt-3 flex gap-3">
                  <input
                    value={originQ}
                    onChange={(e) => setOriginQ(e.target.value)}
                    placeholder="e.g., dhanmondi"
                    className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
                  />
                  <button
                    type="button"
                    onClick={searchOrigin}
                    disabled={originLoading}
                    className="rounded-2xl bg-pink-500 px-5 py-3 text-lg font-bold text-white hover:bg-pink-600 disabled:opacity-60"
                  >
                    {originLoading ? "..." : "Search"}
                  </button>
                </div>

                {originPicked && (
                  <div className="mt-3 text-sm text-purple-700">
                    <div className="font-bold">Selected:</div>
                    <div className="break-words">
                      {originPicked.address} ({originPicked.lat.toFixed(4)}, {originPicked.lng.toFixed(4)})
                    </div>
                  </div>
                )}

                {originResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {originResults.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => pickOrigin(p)}
                        className="w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-left hover:bg-purple-100"
                      >
                        <div className="font-semibold text-purple-800">{p.display_name}</div>
                        <div className="text-sm text-slate-600">
                          {Number(p.lat).toFixed(6)}, {Number(p.lon).toFixed(6)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* DESTINATION */}
              <div className="rounded-3xl border border-purple-200 bg-white p-5">
                <div className="text-lg font-extrabold text-purple-700">Destination</div>

                <div className="mt-3 flex gap-3">
                  <input
                    value={destQ}
                    onChange={(e) => setDestQ(e.target.value)}
                    placeholder="e.g., basabo"
                    className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
                  />
                  <button
                    type="button"
                    onClick={searchDest}
                    disabled={destLoading}
                    className="rounded-2xl bg-pink-500 px-5 py-3 text-lg font-bold text-white hover:bg-pink-600 disabled:opacity-60"
                  >
                    {destLoading ? "..." : "Search"}
                  </button>
                </div>

                {destPicked && (
                  <div className="mt-3 text-sm text-purple-700">
                    <div className="font-bold">Selected:</div>
                    <div className="break-words">
                      {destPicked.address} ({destPicked.lat.toFixed(4)}, {destPicked.lng.toFixed(4)})
                    </div>
                  </div>
                )}

                {destResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {destResults.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => pickDest(p)}
                        className="w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-left hover:bg-purple-100"
                      >
                        <div className="font-semibold text-purple-800">{p.display_name}</div>
                        <div className="text-sm text-slate-600">
                          {Number(p.lat).toFixed(6)}, {Number(p.lon).toFixed(6)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* OPTIONS */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-purple-200 bg-white p-5">
                <div className="text-lg font-extrabold text-purple-700">Seats</div>
                <select
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="mt-3 w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <div className="rounded-3xl border border-purple-200 bg-white p-5">
                <div className="text-lg font-extrabold text-purple-700">Gender Preference</div>
                <select
                  value={genderPref}
                  onChange={(e) => setGenderPref(e.target.value as any)}
                  className="mt-3 w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none"
                >
                  <option value="any">Any</option>
                  <option value="female">Female only</option>
                  <option value="male">Male only</option>
                </select>
              </div>

              <div className="rounded-3xl border border-purple-200 bg-white p-5">
                <div className="text-lg font-extrabold text-purple-700">Radius</div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.5}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="min-w-[64px] rounded-2xl bg-purple-50 px-3 py-2 text-center font-bold text-purple-700">
                    {radiusKm}km
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl border border-purple-200 bg-white px-4 py-3">
                  <div>
                    <div className="font-bold text-slate-900">DND</div>
                    <div className="text-xs text-slate-500">Disable notifications</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDnd((v) => !v)}
                    className={`rounded-2xl px-4 py-2 font-bold text-white ${
                      dnd ? "bg-pink-500 hover:bg-pink-600" : "bg-purple-500 hover:bg-purple-600"
                    }`}
                  >
                    {dnd ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Radius meters: <span className="font-bold">{radiusMeters}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-purple-600 px-6 py-4 text-xl font-extrabold text-white shadow hover:bg-purple-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Ride"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
