"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchSpots } from "@/lib/overpass";
import { readCache, writeCache } from "@/lib/cache";
import { BicycleSpot } from "@/types/spot";

export type LoadState = "locating" | "fetching" | "ready" | "offline" | "error";

interface UseSpots {
  spots: BicycleSpot[];
  state: LoadState;
  error: string | null;
  stale: boolean;
  userLat: number | null;
  userLon: number | null;
  radius: number;
  setRadius: (r: number) => void;
  refresh: () => void;
  setSearchDest: (lat: number, lon: number) => void;
  clearSearchDest: () => void;
}

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "53.0126");
const DEFAULT_LON = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LON ?? "-2.2278");

export function useSpots(): UseSpots {
  const [spots, setSpots]     = useState<BicycleSpot[]>([]);
  const [state, setState]     = useState<LoadState>("locating");
  const [error, setError]     = useState<string | null>(null);
  const [stale, setStale]     = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [radius, setRadius]   = useState(750);
  const [tick, setTick]       = useState(0);
  const [override, setOverride] = useState<{ lat: number; lon: number } | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const setSearchDest = useCallback((lat: number, lon: number) => {
    setOverride({ lat, lon });
  }, []);

  const clearSearchDest = useCallback(() => {
    setOverride(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      let lat = DEFAULT_LAT;
      let lon = DEFAULT_LON;

      if (override) {
        // Destination search — skip geolocation
        lat = override.lat;
        lon = override.lon;
        setState("fetching");
      } else {
        // GPS path
        setState("locating");
        try {
          const pos = await new Promise<{ coords: { latitude: number; longitude: number } }>(
            (res, rej) =>
              navigator.geolocation.getCurrentPosition(res as PositionCallback, rej, {
                timeout: 4000, maximumAge: 60000,
              }),
          );
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } catch {
          // Fall through to default coords silently
        }
      }

      if (cancelled) return;
      setUserLat(lat);
      setUserLon(lon);

      // Try cache first
      const cached = await readCache(lat, lon, radius);
      if (cached) {
        setSpots(cached.spots);
        setStale(cached.stale);
        setState(cached.offline ? "offline" : "ready");
        if (!cached.stale) return;
      }

      // Fetch from Overpass
      setState("fetching");
      try {
        const fresh = await fetchSpots(lat, lon, radius);
        if (!cancelled) {
          setSpots(fresh);
          setStale(false);
          setState("ready");
          await writeCache(lat, lon, radius, fresh);
        }
      } catch {
        if (!cancelled) {
          if (cached) {
            setState("offline");
            setStale(true);
          } else {
            setState("error");
            setError("Couldn't reach OpenStreetMap. Check your connection.");
          }
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [radius, tick, override]);

  return { spots, state, error, stale, userLat, userLon, radius, setRadius, refresh, setSearchDest, clearSearchDest };
}
