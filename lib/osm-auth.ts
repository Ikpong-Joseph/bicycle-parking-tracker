const OSM_SANDBOX = "https://master.apis.dev.openstreetmap.org";
const OSM_PROD    = "https://www.openstreetmap.org";

function osmBase() {
  return process.env.NEXT_PUBLIC_OSM_ENV === "production" ? OSM_PROD : OSM_SANDBOX;
}

function clientId() {
  return process.env.NEXT_PUBLIC_OSM_CLIENT_ID ?? "";
}

function redirectUri() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/auth/callback`;
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = crypto.getRandomValues(new Uint8Array(64));
  const verifier = base64url(array.buffer);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64url(hash);
  return { verifier, challenge };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isProduction() {
  return process.env.NEXT_PUBLIC_OSM_ENV === "production";
}

export async function startOAuthFlow() {
  const { verifier, challenge } = await generatePKCE();
  sessionStorage.setItem("osm_pkce_verifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: "write_api",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.href = `${osmBase()}/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const verifier = sessionStorage.getItem("osm_pkce_verifier");
  if (!verifier) throw new Error("No PKCE verifier found — start the OAuth flow again");

  const res = await fetch(`${osmBase()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId(),
      redirect_uri: redirectUri(),
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json();
  sessionStorage.removeItem("osm_pkce_verifier");
  return data.access_token as string;
}

export function saveToken(token: string) {
  sessionStorage.setItem("osm_token", token);
}

export function getToken(): string | null {
  return sessionStorage.getItem("osm_token");
}

export function clearToken() {
  sessionStorage.removeItem("osm_token");
}
