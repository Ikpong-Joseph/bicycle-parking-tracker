"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, startOAuthFlow, clearToken, isProduction } from "@/lib/osm-auth";
import { submitSpot, NewSpotPayload } from "@/lib/osm-api";

type Step = "login" | "locate" | "form" | "review" | "submitting" | "done" | "error";

const PARKING_TYPES = [
  { value: "stands",      label: "Stands" },
  { value: "rack",        label: "Rack" },
  { value: "shed",        label: "Shed" },
  { value: "bollard",     label: "Bollard" },
  { value: "wall_loops",  label: "Wall loops" },
];

export default function ContributePage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("login");
  const [token, setToken]       = useState<string | null>(null);
  const [lat, setLat]           = useState<number | null>(null);
  const [lon, setLon]           = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [covered, setCovered]   = useState<"yes" | "no" | "">("");
  const [parkingType, setParkingType] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [nodeId, setNodeId]     = useState("");

  useEffect(() => {
    const t = getToken();
    if (t) { setToken(t); setStep("locate"); }
  }, []);

  function handleLogin() {
    if (!process.env.NEXT_PUBLIC_OSM_CLIENT_ID) {
      alert("OSM_CLIENT_ID not set — see README for setup instructions.");
      return;
    }
    startOAuthFlow();
  }

  function handleUseCurrentLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocating(false);
        setStep("form");
      },
      () => {
        setLocating(false);
        alert("Couldn't get your location. Check location permissions.");
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }

  async function handleSubmit() {
    if (!token || lat === null || lon === null) return;
    setStep("submitting");
    setSubmitError("");

    const payload: NewSpotPayload = {
      lat, lon,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      covered: covered || undefined,
      parkingType: parkingType || undefined,
    };

    try {
      const id = await submitSpot(token, payload);
      setNodeId(id);
      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      if (msg.includes("401") || msg.includes("403")) {
        clearToken();
        setToken(null);
        setStep("login");
      } else {
        setSubmitError(msg);
        setStep("error");
      }
    }
  }

  const isProd = isProduction();

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-8 flex flex-col gap-5 min-h-full">
      {/* Environment banner */}
      <div className={`px-3 py-2 rounded-xl text-xs font-semibold text-center ${
        isProd
          ? "bg-red-900/60 border border-red-700 text-red-300"
          : "bg-blue-900/60 border border-blue-700 text-blue-300"
      }`}>
        {isProd
          ? "🔴 LIVE — edits will appear on openstreetmap.org"
          : "🔵 SANDBOX — edits go to the OSM test server, not the real map"}
      </div>

      <button onClick={() => router.push("/")} className="text-green-400 text-sm self-start">
        ← Back
      </button>

      <h1 className="text-xl font-bold text-gray-100">Add a parking spot</h1>

      {/* ── Step: Login ─────────────────────────────────────────────────────── */}
      {step === "login" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            To submit a spot to OpenStreetMap you need to log in with your OSM account.
            Don&apos;t have one?{" "}
            <a
              href={isProd ? "https://www.openstreetmap.org/user/new" : "https://master.apis.dev.openstreetmap.org/user/new"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 underline"
            >
              Create one free
            </a>
            .
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-green-700 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
          >
            Log in with OpenStreetMap
          </button>
        </div>
      )}

      {/* ── Step: Locate ────────────────────────────────────────────────────── */}
      {step === "locate" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            Where is the parking spot?
          </p>
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="w-full py-3.5 bg-green-700 text-white font-bold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {locating ? "Getting location…" : "📍 Use my current location"}
          </button>
          <p className="text-xs text-gray-600 text-center">
            Pin-drop on map coming in a future update.
            For now, stand at the parking spot and tap above.
          </p>
        </div>
      )}

      {/* ── Step: Form ──────────────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="flex flex-col gap-4">
          {lat && lon && (
            <div className="bg-gray-900 rounded-xl px-4 py-3 text-xs text-gray-400">
              📍 {lat.toFixed(5)}, {lon.toFixed(5)}
              <button
                onClick={() => setStep("locate")}
                className="ml-2 text-green-400 underline"
              >
                change
              </button>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Parking type</label>
            <div className="flex flex-wrap gap-2">
              {PARKING_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setParkingType(p => p === t.value ? "" : t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    parkingType === t.value
                      ? "bg-green-700 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Capacity (spaces)</label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-gray-900 rounded-xl px-4 py-3 text-gray-100 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Covered?</label>
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setCovered(c => c === v ? "" : v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                    covered === v
                      ? "bg-green-700 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {v === "yes" ? "✅ Yes" : "☁️ No"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep("review")}
            className="w-full py-3.5 bg-green-700 text-white font-bold rounded-2xl mt-2 active:scale-[0.98] transition-transform"
          >
            Review submission →
          </button>
        </div>
      )}

      {/* ── Step: Review ────────────────────────────────────────────────────── */}
      {step === "review" && lat !== null && lon !== null && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-300 font-semibold">Review your submission</p>
          <p className="text-xs text-gray-500">
            This will add a new point to OpenStreetMap.{" "}
            {isProd ? "Once submitted it is visible to everyone." : "This is the sandbox — it won't affect the real map."}
          </p>

          <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
            {[
              { label: "📍 Location",   value: `${lat.toFixed(5)}, ${lon.toFixed(5)}` },
              { label: "🚲 Type",       value: PARKING_TYPES.find(t => t.value === parkingType)?.label ?? "Not specified" },
              { label: "📦 Capacity",   value: capacity || "Not specified" },
              { label: "🏠 Covered",    value: covered === "yes" ? "Yes" : covered === "no" ? "No" : "Not specified" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm text-gray-100">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("form")}
              className="flex-1 py-3 bg-gray-800 text-gray-300 font-semibold rounded-2xl active:scale-[0.98] transition-transform"
            >
              Edit
            </button>
            <button
              onClick={handleSubmit}
              className={`flex-1 py-3 font-bold rounded-2xl active:scale-[0.98] transition-transform ${
                isProd
                  ? "bg-red-700 text-white"
                  : "bg-green-700 text-white"
              }`}
            >
              {isProd ? "Submit to OSM" : "Submit to sandbox"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Submitting ────────────────────────────────────────────────── */}
      {step === "submitting" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-500">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Submitting to OpenStreetMap…</p>
        </div>
      )}

      {/* ── Step: Done ──────────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-5 pt-8 text-center">
          <p className="text-5xl">✅</p>
          <div>
            <p className="text-gray-100 font-semibold text-lg">Spot submitted!</p>
            <p className="text-gray-500 text-sm mt-1">
              {isProd
                ? "It'll appear on OpenStreetMap within a few minutes."
                : `Sandbox node ID: ${nodeId}`}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            {isProd && (
              <a
                href={`https://www.openstreetmap.org/node/${nodeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gray-800 text-gray-300 font-semibold rounded-2xl text-center text-sm"
              >
                View on OpenStreetMap ↗
              </a>
            )}
            <button
              onClick={() => { setStep("locate"); setCapacity(""); setCovered(""); setParkingType(""); }}
              className="w-full py-3 bg-green-700 text-white font-bold rounded-2xl"
            >
              Add another spot
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-gray-800 text-gray-400 rounded-2xl text-sm"
            >
              Back to map
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Error ─────────────────────────────────────────────────────── */}
      {step === "error" && (
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <p className="text-5xl">⚠️</p>
          <p className="text-gray-300 text-sm">{submitError}</p>
          <button
            onClick={() => setStep("review")}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl font-semibold"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
