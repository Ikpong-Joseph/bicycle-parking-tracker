export interface BicycleSpot {
  id: string;           // "node/12345678"
  lat: number;
  lon: number;
  name?: string;
  capacity?: number;
  covered?: "yes" | "no" | "unknown";
  parkingType?: string; // stands, rack, shed, bollard, wall_loops, …
  fee?: "yes" | "no" | "unknown";
  access?: string;
  lastEdited?: string;  // ISO date string
  distanceMetres?: number;
}

export interface CachedArea {
  centerLat: number;
  centerLon: number;
  radiusMetres: number;
  fetchedAt: number;
  spots: BicycleSpot[];
}
