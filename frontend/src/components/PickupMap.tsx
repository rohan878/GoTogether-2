import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression, LeafletMouseEvent } from "leaflet";
import { socket } from "../lib/socket";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
};

type Pinned = {
  lat: number;
  lng: number;
  address?: string;
};

type Props = {
  rideId: string;
  groupId?: string | null;
  pinned?: Pinned | null;
};

function Recenter({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function MapClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PickupMap({ rideId, groupId, pinned }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimItem[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  const [lat, setLat] = useState<number>(pinned?.lat ?? 23.8103);
  const [lng, setLng] = useState<number>(pinned?.lng ?? 90.4125);
  const [address, setAddress] = useState<string>(pinned?.address ?? "");

  const [sharing, setSharing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const center = useMemo(() => [lat, lng] as LatLngExpression, [lat, lng]);

  useEffect(() => {
    if (pinned?.lat && pinned?.lng) {
      setLat(pinned.lat);
      setLng(pinned.lng);
      setAddress(pinned.address || "");
      setQuery(pinned.address || "");
    }
  }, [pinned?.lat, pinned?.lng, pinned?.address]);

  useEffect(() => {
    if (!groupId) return;
    socket.emit("group:join", groupId);
    return () => {
      socket.emit("group:leave", groupId);
    };
  }, [groupId]);

  async function reverseGeocode(nextLat: number, nextLng: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLat}&lon=${nextLng}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const name = data?.display_name || "";
      setAddress(name);
      setQuery(name || `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
    } catch {
      setAddress("");
      setQuery(`${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
    }
  }

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoadingSug(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          query
        )}&limit=6&addressdetails=1&countrycodes=bd`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const items: NominatimItem[] = await res.json();
        setSuggestions(items || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function selectSuggestion(item: NominatimItem) {
    const nextLat = Number(item.lat);
    const nextLng = Number(item.lon);
    setLat(nextLat);
    setLng(nextLng);
    setAddress(item.display_name);
    setQuery(item.display_name);
    setSuggestions([]);
  }

  async function onMapPick(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
    await reverseGeocode(nextLat, nextLng);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        await reverseGeocode(nextLat, nextLng);
      },
      () => alert("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function shareToChat() {
    if (!groupId) {
      alert("Group not created yet. Passenger must accept first.");
      return;
    }

    setSharing(true);
    socket.emit(
      "group:pin",
      { groupId, rideId, lat, lng, address: address || query },
      (resp: any) => {
        setSharing(false);
        if (!resp?.ok) {
          alert(resp?.message || "Failed to share pinned location.");
          return;
        }
        alert("Pinned location shared ✅");
        setSuggestions([]);
      }
    );
  }

  return (
    <div className="rounded-3xl border border-purple-200 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold text-purple-700">📍 Pickup / Meeting Point</div>
          <div className="text-sm text-slate-600">Search / GPS / Map click → then Share</div>
        </div>

        <button
          onClick={useMyLocation}
          className="rounded-2xl border-2 border-purple-200 bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50"
        >
          📡 My Location
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search area (e.g., bashabo)"
            className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
          />

          {(loadingSug || suggestions.length > 0) && (
            <div className="absolute z-[999] mt-2 w-full overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-lg">
              {loadingSug && <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>}
              {!loadingSug &&
                suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                  >
                    {s.display_name}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          onClick={shareToChat}
          disabled={sharing || !groupId}
          className="rounded-2xl bg-pink-500 px-6 py-3 text-lg font-bold text-white shadow hover:bg-pink-600 disabled:opacity-60"
        >
          {sharing ? "Sharing..." : "Share Pickup"}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-purple-200">
        <MapContainer center={center} zoom={14} style={{ height: 320, width: "100%" }}>
          <Recenter center={center} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickPicker onPick={onMapPick} />
          <Marker position={[lat, lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Selected point</div>
                <div className="opacity-80">{address || "No address yet"}</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
