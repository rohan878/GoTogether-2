// src/utils/geocode.ts
export const geocodeAddress = async (address: string) => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "GoTogether/1.0 (student project)" },
  });

  if (!res.ok) throw new Error("Geocoding failed");

  const data: any[] = await res.json();
  if (!data || data.length === 0) throw new Error("Location not found");

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
};
