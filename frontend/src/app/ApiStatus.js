"use client";

import { useEffect, useState } from "react";

export default function ApiStatus() {
  const [status, setStatus] = useState("Checking backend...");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/status`
        );

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        if (data.status === "online") {
          setStatus("Backend Connected");
          setConnected(true);
        } else {
          setStatus("Backend Offline");
          setConnected(false);
        }
      } catch (error) {
        setStatus("Backend Offline");
        setConnected(false);
      }
    }

    checkBackend();
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm text-white backdrop-blur">
      <span
        className={`mr-2 ${
          connected ? "text-green-400" : "text-red-400"
        }`}
      >
        ●
      </span>

      {status}
    </div>
  );
}