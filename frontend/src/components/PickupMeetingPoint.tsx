import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LeafletMouseEvent } from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Pos = { lat: number; lng: number };

function ClickToPick({ onPick }: { onPick: (p: Pos) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PickupMeetingPoint() {
  const [pos, setPos] = useState<Pos>({ lat: 23.8103, lng: 90.4125 });
  const [text, setText] = useState("");
  const debounceRef = useRef<number | null>(null);

  async function reverseGeocode(p: Pos) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const name = data?.display_name || "";
      setText(name || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
    } catch {
      setText(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
    }
  }

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // optional typing-based search can go here
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [text]);

  async function onPick(p: Pos) {
    setPos(p);
    await reverseGeocode(p);
  }

  return (
    <div className="rounded-3xl border border-purple-200 bg-white/70 p-5 shadow-sm">
      <div className="text-2xl font-extrabold text-purple-700">📍 Pickup / Meeting Point</div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-purple-200">
        <MapContainer center={[pos.lat, pos.lng]} zoom={14} style={{ height: 320, width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ClickToPick onPick={onPick} />
          <Marker position={[pos.lat, pos.lng]}>
            <Popup>{text || "Selected on map"}</Popup>
          </Marker>
        </MapContainer>
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-4 w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
        placeholder="Location will appear here"
      />
    </div>
  );
}
