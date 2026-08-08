export interface NewSpotPayload {
  lat: number;
  lon: number;
  capacity?: number;
  covered?: "yes" | "no";
  parkingType?: string;
}

const OSM_SANDBOX_API = "https://master.apis.dev.openstreetmap.org";
const OSM_PROD_API    = "https://api.openstreetmap.org";

function apiBase() {
  return process.env.NEXT_PUBLIC_OSM_ENV === "production" ? OSM_PROD_API : OSM_SANDBOX_API;
}

function xmlHeader(token: string) {
  return {
    "Content-Type": "text/xml",
    Authorization: `Bearer ${token}`,
  };
}

async function apiCall(token: string, method: string, path: string, body?: string) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: xmlHeader(token),
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OSM API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.text();
}

export async function submitSpot(token: string, spot: NewSpotPayload): Promise<string> {
  // 1. Open changeset
  const changesetXml = `<osm>
  <changeset>
    <tag k="created_by" v="BicycleParkingTracker/1.0"/>
    <tag k="comment" v="Add bicycle parking spot"/>
  </changeset>
</osm>`;

  const changesetId = await apiCall(token, "PUT", "/api/0.6/changeset/create", changesetXml);

  // 2. Build node tags
  const tags: Record<string, string> = { amenity: "bicycle_parking" };
  if (spot.capacity)    tags.capacity          = String(spot.capacity);
  if (spot.covered)     tags.covered           = spot.covered;
  if (spot.parkingType) tags.bicycle_parking   = spot.parkingType;

  const tagXml = Object.entries(tags)
    .map(([k, v]) => `    <tag k="${escXml(k)}" v="${escXml(v)}"/>`)
    .join("\n");

  const nodeXml = `<osm>
  <node changeset="${changesetId.trim()}" lat="${spot.lat}" lon="${spot.lon}">
${tagXml}
  </node>
</osm>`;

  const nodeId = await apiCall(token, "PUT", "/api/0.6/node/create", nodeXml);

  // 3. Close changeset
  await apiCall(token, "PUT", `/api/0.6/changeset/${changesetId.trim()}/close`);

  return nodeId.trim(); // returns the new OSM node ID
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
