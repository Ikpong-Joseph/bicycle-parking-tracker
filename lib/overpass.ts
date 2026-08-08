import { BicycleSpot } from "@/types/spot";
import { haversineMetres } from "./geo";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function buildQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:10];
(
  node["amenity"="bicycle_parking"](around:${radius},${lat},${lon});
  way["amenity"="bicycle_parking"](around:${radius},${lat},${lon});
);
out body;
>;
out skel qt;`;
}

function parseElement(el: Record<string, unknown>, userLat: number, userLon: number): BicycleSpot | null {
  const tags = (el.tags as Record<string, string>) || {};
  const lat = el.lat as number;
  const lon = el.lon as number;
  if (!lat || !lon) return null;

  const covered = tags.covered === "yes" ? "yes" : tags.covered === "no" ? "no" : "unknown";
  const fee = tags.fee === "yes" ? "yes" : tags.fee === "no" ? "no" : "unknown";

  return {
    id: `${el.type}/${el.id}`,
    lat,
    lon,
    name: tags.name,
    capacity: tags.capacity ? parseInt(tags.capacity, 10) : undefined,
    covered,
    parkingType: tags.bicycle_parking,
    fee,
    access: tags.access,
    lastEdited: (el.timestamp as string) || undefined,
    distanceMetres: haversineMetres(userLat, userLon, lat, lon),
  };
}

export async function fetchSpots(
  lat: number,
  lon: number,
  radius: number,
): Promise<BicycleSpot[]> {
  const query = buildQuery(lat, lon, radius);
  let lastErr: unknown;

  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const spots = (data.elements as Record<string, unknown>[])
        .filter((el) => el.tags)
        .map((el) => parseElement(el, lat, lon))
        .filter((s): s is BicycleSpot => s !== null);

      return spots.sort((a, b) => (a.distanceMetres ?? 0) - (b.distanceMetres ?? 0));
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error("All Overpass mirrors failed");
}
