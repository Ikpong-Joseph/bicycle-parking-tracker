"use client";
import { BicycleSpot } from "@/types/spot";
import { formatDistance, formatLastEdited } from "@/lib/geo";

const TYPE_LABELS: Record<string, string> = {
  stands: "Stands", rack: "Rack", shed: "Shed", bollard: "Bollard",
  wall_loops: "Wall loops", anchors: "Anchors", wide_stands: "Wide stands",
  covered_staple: "Covered staple",
};

interface Props {
  spot: BicycleSpot;
  onClick?: () => void;
}

export default function SpotCard({ spot, onClick }: Props) {
  const typeLabel = spot.parkingType ? (TYPE_LABELS[spot.parkingType] ?? spot.parkingType) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-900 rounded-2xl p-4 flex items-start gap-3 active:scale-[0.98] transition-transform"
    >
      <div className="text-2xl mt-0.5">🚲</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-100 truncate">
            {spot.name ?? typeLabel ?? "Bicycle parking"}
          </p>
          <p className="text-green-400 font-semibold text-sm shrink-0">
            {formatDistance(spot.distanceMetres ?? 0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
          {spot.capacity && <span>📦 {spot.capacity} spaces</span>}
          {spot.covered === "yes" && <span>🏠 Covered</span>}
          {spot.covered === "no" && <span>☁️ Uncovered</span>}
          {typeLabel && spot.name && <span>{typeLabel}</span>}
          {spot.fee === "no" && <span>✅ Free</span>}
          {spot.fee === "yes" && <span>💰 Paid</span>}
        </div>
        <p className="text-xs text-gray-600 mt-1">Updated {formatLastEdited(spot.lastEdited)}</p>
      </div>
    </button>
  );
}
