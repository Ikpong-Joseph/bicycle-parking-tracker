import { BicycleSpot, CachedArea } from "@/types/spot";
import { haversineMetres } from "./geo";

const DB_NAME = "bicycle-parking";
const STORE = "areas";
const DB_VERSION = 1;

const FRESH_MS = 60 * 60 * 1000;       // < 1hr: use cache, no refresh
const STALE_MS = 24 * 60 * 60 * 1000;  // 1–24hr: show cache + background refresh

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cacheKey(lat: number, lon: number, radius: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)},${radius}`;
}

export async function readCache(
  lat: number, lon: number, radius: number,
): Promise<{ spots: BicycleSpot[]; stale: boolean; offline: boolean } | null> {
  try {
    const db = await openDB();
    const key = cacheKey(lat, lon, radius);
    const tx = db.transaction(STORE, "readonly");
    const record: (CachedArea & { key: string }) | undefined = await new Promise(
      (res, rej) => {
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      },
    );
    if (!record) return null;

    // Check spatial coverage: cached centre within 50% of radius from query centre
    const dist = haversineMetres(lat, lon, record.centerLat, record.centerLon);
    if (dist > radius * 0.5) return null;

    const age = Date.now() - record.fetchedAt;
    if (age > STALE_MS) return { spots: record.spots, stale: true, offline: false };
    if (age > FRESH_MS) return { spots: record.spots, stale: true, offline: false };
    return { spots: record.spots, stale: false, offline: false };
  } catch {
    return null;
  }
}

export async function findSpotInCache(spotId: string): Promise<BicycleSpot | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const records: (CachedArea & { key: string })[] = await new Promise((res, rej) => {
      const r = tx.objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    for (const record of records) {
      const found = record.spots.find((s) => s.id === spotId);
      if (found) return found;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCache(
  lat: number, lon: number, radius: number, spots: BicycleSpot[],
): Promise<void> {
  try {
    const db = await openDB();
    const key = cacheKey(lat, lon, radius);
    const tx = db.transaction(STORE, "readwrite");
    const record: CachedArea & { key: string } = {
      key,
      centerLat: lat,
      centerLon: lon,
      radiusMetres: radius,
      fetchedAt: Date.now(),
      spots,
    };
    await new Promise<void>((res, rej) => {
      const r = tx.objectStore(STORE).put(record);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  } catch {
    // Cache write failure is non-fatal
  }
}
