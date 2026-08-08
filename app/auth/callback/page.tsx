"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCode, saveToken } from "@/lib/osm-auth";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"exchanging" | "error">("exchanging");
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const err  = params.get("error");

    if (err || !code) {
      setError(err === "access_denied" ? "You cancelled the login." : "OSM login failed.");
      setStatus("error");
      return;
    }

    exchangeCode(code)
      .then((token) => {
        saveToken(token);
        router.replace("/contribute");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("error");
      });
  }, [params, router]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-3xl">⚠️</p>
        <p className="text-gray-300 text-sm">{error}</p>
        <button
          onClick={() => router.replace("/contribute")}
          className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Logging you in…</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
