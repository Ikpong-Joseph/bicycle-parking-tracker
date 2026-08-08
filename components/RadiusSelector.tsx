"use client";

const OPTIONS = [250, 500, 750, 1000, 2000];

interface Props {
  value: number;
  onChange: (r: number) => void;
}

export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {OPTIONS.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            value === r
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 active:bg-gray-700"
          }`}
        >
          {r < 1000 ? `${r}m` : `${r / 1000}km`}
        </button>
      ))}
    </div>
  );
}
