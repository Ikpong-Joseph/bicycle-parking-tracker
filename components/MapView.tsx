"use client";
import { useEffect, useRef } from "react";
import { BicycleSpot } from "@/types/spot";
import { useRouter } from "next/navigation";

interface Props {
  spots: BicycleSpot[];
}

export default function MapView({ spots }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || spots.length === 0) return;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icon paths broken by webpack
      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        // @ts-expect-error leaflet map instance
        mapRef.current.remove();
      }

      const center = spots[0];
      const map = L.map(containerRef.current!).setView([center.lat, center.lon], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      spots.forEach((spot) => {
        const marker = L.marker([spot.lat, spot.lon]).addTo(map);
        marker.on("click", () => {
          router.push(`/spot/${encodeURIComponent(spot.id)}`);
        });
        const cap = spot.capacity ? `${spot.capacity} spaces` : "capacity unknown";
        const covered = spot.covered === "yes" ? "Covered" : spot.covered === "no" ? "Uncovered" : "";
        marker.bindPopup(
          `<strong>${spot.name ?? spot.parkingType ?? "Bicycle parking"}</strong><br/>${cap}${covered ? " · " + covered : ""}`,
        );
      });

      // Fit map to all spots
      const group = L.featureGroup(spots.map((s) => L.marker([s.lat, s.lon])));
      map.fitBounds(group.getBounds().pad(0.1));
    }

    init();

    return () => {
      if (mapRef.current) {
        // @ts-expect-error leaflet map instance
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [spots, router]);

  return <div ref={containerRef} className="w-full" style={{ height: "calc(100vh - 200px)" }} />;
}
