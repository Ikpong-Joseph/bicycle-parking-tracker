export interface GeoResult {
  displayName: string;
  lat: number;
  lon: number;
}

export async function geocode(query: string): Promise<GeoResult | null> {
  const params = new URLSearchParams({ q: query, format: "json", limit: "1" });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "Accept-Language": "en", "User-Agent": "BicycleParkingTracker/1.0" } },
  );
  if (!res.ok) return null;
  const data: { display_name: string; lat: string; lon: string }[] = await res.json();
  if (!data.length) return null;
  return {
    displayName: data[0].display_name,
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
}
