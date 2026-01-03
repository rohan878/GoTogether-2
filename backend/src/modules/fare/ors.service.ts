import axios from "axios";

type LatLng = { lat: number; lng: number };

function key() {
  const k = process.env.ORS_API_KEY;
  if (!k) throw new Error("ORS_API_KEY missing");
  return k;
}

export async function orsDirections(points: LatLng[]) {
  // ORS expects [lng, lat]
  const coordinates = points.map((p) => [p.lng, p.lat]);

  const res = await axios.post(
    "https://api.openrouteservice.org/v2/directions/driving-car",
    { coordinates },
    {
      headers: {
        Authorization: key(),
        "Content-Type": "application/json",
      },
    }
  );

  const route = res.data?.routes?.[0];
  const summary = route?.summary;
  if (!summary) throw new Error("ORS returned no summary");

  return {
    distanceMeters: Number(summary.distance || 0),
    durationSeconds: Number(summary.duration || 0),
    geometry: route.geometry || null,
  };
}
