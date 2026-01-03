import { useMemo, useState } from "react";
import api from "../lib/api";

type Stop = { lat: number; lng: number; address?: string };

export default function StopsEditor({
  rideId,
  disabled,
  initialStops,
  onUpdated,
}: {
  rideId: string;
  disabled: boolean;
  initialStops: Stop[];
  onUpdated: () => void;
}) {
  const [stops, setStops] = useState<Stop[]>(initialStops || []);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const canAdd = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    return Number.isFinite(la) && Number.isFinite(ln);
  }, [lat, lng]);

  const addStop = () => {
    if (!canAdd) return;
    const la = Number(lat);
    const ln = Number(lng);

    setStops((p) => [...p, { lat: la, lng: ln, address }]);
    setLat("");
    setLng("");
    setAddress("");
  };

  const removeStop = (idx: number) => {
    setStops((p) => p.filter((_, i) => i !== idx));
  };

  const saveStops = async () => {
    setSaving(true);
    try {
      // ✅ FIX: add /api
      await api.patch(`/api/rides/${rideId}/stops`, { stops });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/70 border border-purple-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-purple-800">🛑 Route Stops</h3>
        <button
          disabled={disabled || saving}
          onClick={saveStops}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Stops"}
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-1">Rider only • Ride open থাকলে stops update হবে</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="lat (e.g. 23.8103)"
          className="border rounded-xl px-3 py-2"
          disabled={disabled}
        />
        <input
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="lng (e.g. 90.4125)"
          className="border rounded-xl px-3 py-2"
          disabled={disabled}
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Optional label/address"
          className="border rounded-xl px-3 py-2"
          disabled={disabled}
        />
      </div>

      <button
        onClick={addStop}
        disabled={disabled || !canAdd}
        className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50"
      >
        + Add Stop
      </button>

      <div className="mt-4 space-y-2">
        {stops.length === 0 ? (
          <p className="text-sm text-gray-600">No stops added yet.</p>
        ) : (
          stops.map((s, idx) => (
            <div
              key={`${s.lat}-${s.lng}-${idx}`}
              className="flex items-center justify-between gap-3 bg-white border border-purple-100 rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-purple-800 truncate">
                  Stop {idx + 1}: {s.address || "No label"}
                </p>
                <p className="text-xs text-gray-600">
                  {s.lat}, {s.lng}
                </p>
              </div>
              <button
                onClick={() => removeStop(idx)}
                disabled={disabled}
                className="px-3 py-2 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
