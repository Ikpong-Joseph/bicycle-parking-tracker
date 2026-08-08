"use client";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useSpots } from "@/hooks/useSpots";
import SpotCard from "@/components/SpotCard";
import RadiusSelector from "@/components/RadiusSelector";
import { geocode } from "@/lib/nominatim";
import { useRouter } from "next/navigation";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const { spots, state, error, stale, radius, setRadius, refresh, setSearchDest, clearSearchDest } = useSpots();
  const [view, setView]           = useState<"list" | "map">("list");
  const [query, setQuery]         = useState("");
  const [destLabel, setDestLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isLoading = (state === "locating" || state === "fetching") && spots.length === 0;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setGeocoding(true);
    setGeoError(null);
    const result = await geocode(q);
    setGeocoding(false);
    if (!result) {
      setGeoError(`No results for "${q}"`);
      return;
    }
    setDestLabel(result.displayName.split(",").slice(0, 2).join(",").trim());
    setSearchDest(result.lat, result.lon);
    setQuery("");
  }

  function handleClearDest() {
    setDestLabel(null);
    setGeoError(null);
    clearSearchDest();
  }

  function statusText() {
    if (state === "locating") return "Getting your location…";
    if (state === "fetching") return destLabel ? `Searching near ${destLabel}…` : "Searching OpenStreetMap…";
    if (state === "ready") return destLabel ? `${spots.length} spots near ${destLabel}` : `${spots.length} spots found`;
    if (state === "offline") return `${spots.length} spots (offline)`;
    if (state === "error") return "Could not load spots";
    return "";
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-gray-950 sticky top-0 z-10 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-100">🚲 Bike Parking</h1>
            <p className="text-xs text-gray-500">{statusText()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={state === "fetching" || state === "locating"}
              className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 active:scale-95 disabled:opacity-40 transition-transform"
              title="Refresh"
            >
              <span className={state === "fetching" ? "animate-spin inline-block" : ""}>⟳</span>
            </button>
            <button
              onClick={() => router.push("/contribute")}
              className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center text-white text-xl active:scale-95 transition-transform"
              title="Add missing spot"
            >
              +
            </button>
          </div>
        </div>

        {/* Destination search */}
        {destLabel ? (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-900/40 border border-green-700 rounded-xl">
            <span className="text-xs text-green-300 flex-1 truncate">📍 Near: {destLabel}</span>
            <button
              onClick={handleClearDest}
              className="text-green-400 text-sm font-bold shrink-0"
              aria-label="Clear destination"
            >
              ✕
            </button>
          </div>
        ) : (
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setGeoError(null); }}
              placeholder="Search near a place or postcode…"
              className="flex-1 bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none"
            />
            <button
              type="submit"
              disabled={geocoding || !query.trim()}
              className="px-3 py-2 bg-gray-800 rounded-xl text-gray-300 text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform shrink-0"
            >
              {geocoding ? "…" : "Go"}
            </button>
          </form>
        )}

        {geoError && (
          <p className="text-xs text-red-400 mb-2 px-1">{geoError}</p>
        )}

        <RadiusSelector value={radius} onChange={setRadius} />

        <div className="flex gap-1 mt-3 bg-gray-900 rounded-xl p-1">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v ? "bg-gray-700 text-gray-100" : "text-gray-500"
              }`}
            >
              {v === "list" ? "📋 List" : "🗺️ Map"}
            </button>
          ))}
        </div>
      </div>

      {/* Stale / offline banner */}
      {(stale || state === "offline") && (
        <div className="mx-4 mt-2 px-3 py-2 bg-amber-900/50 border border-amber-700 rounded-xl text-xs text-amber-300">
          {state === "offline"
            ? "Offline — showing last saved results"
            : "Showing cached results — tap ⟳ to refresh"}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
            <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">
              {state === "locating" ? "Getting your location…" : "Searching for bike parking…"}
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="mx-4 mt-6 p-5 bg-gray-900 rounded-2xl text-center">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-gray-400 text-sm mb-3">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && state !== "error" && spots.length === 0 && (
          <div className="mx-4 mt-6 p-5 bg-gray-900 rounded-2xl text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-gray-400 text-sm mb-3">
              No bicycle parking found within{" "}
              {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}. Try expanding the radius.
            </p>
            <button
              onClick={() => setRadius(Math.min(radius * 2, 2000))}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl font-semibold"
            >
              Expand radius
            </button>
          </div>
        )}

        {view === "list" && spots.length > 0 && (
          <div className="px-4 py-3 flex flex-col gap-2 pb-8">
            {spots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                onClick={() => router.push(`/spot/${encodeURIComponent(spot.id)}`)}
              />
            ))}
          </div>
        )}

        {view === "map" && <MapView spots={spots} />}
      </div>
    </div>
  );
}
