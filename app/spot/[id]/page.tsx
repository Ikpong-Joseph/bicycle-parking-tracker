"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BicycleSpot } from "@/types/spot";
import { findSpotInCache } from "@/lib/cache";
import { formatDistance, formatLastEdited } from "@/lib/geo";

const TYPE_LABELS: Record<string, string> = {
  stands: "Stands", rack: "Rack", shed: "Shed", bollard: "Bollard",
  wall_loops: "Wall loops", anchors: "Anchors", wide_stands: "Wide stands",
};

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<BicycleSpot | null>(null);

  useEffect(() => {
    findSpotInCache(decodeURIComponent(id)).then((found) => {
      if (found) setSpot(found);
    });
  }, [id]);

  function openDirections() {
    if (!spot || typeof window === "undefined") return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${spot.lat},${spot.lon}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}&travelmode=walking`;
    window.open(url, "_blank");
  }

  if (!spot) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Loading…</p>
      </div>
    );
  }

  const rows = [
    { label: "Type", value: spot.parkingType ? (TYPE_LABELS[spot.parkingType] ?? spot.parkingType) : "Unknown" },
    { label: "Capacity", value: spot.capacity ? `${spot.capacity} spaces` : "Not tagged" },
    { label: "Covered", value: spot.covered === "yes" ? "Yes" : spot.covered === "no" ? "No" : "Not tagged" },
    { label: "Fee", value: spot.fee === "yes" ? "Paid" : spot.fee === "no" ? "Free" : "Not tagged" },
    { label: "Access", value: spot.access ?? "Public" },
    { label: "Distance", value: formatDistance(spot.distanceMetres ?? 0) },
    { label: "OSM last updated", value: formatLastEdited(spot.lastEdited) },
  ];

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-8 flex flex-col gap-4">
      <button onClick={() => router.back()} className="text-green-400 text-sm self-start">
        ← Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          {spot.name ?? spot.parkingType ? (TYPE_LABELS[spot.parkingType!] ?? spot.parkingType) : "Bicycle parking"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">OSM id: {spot.id}</p>
      </div>

      <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-4 py-3">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-100 font-medium">{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={openDirections}
        className="w-full py-3.5 bg-green-700 text-white font-bold rounded-2xl text-base active:scale-[0.98] transition-transform"
      >
        🗺️ Get directions
      </button>

      <a
        href={`https://www.openstreetmap.org/${spot.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs text-gray-600 underline"
      >
        View on OpenStreetMap
      </a>
    </div>
  );
}
