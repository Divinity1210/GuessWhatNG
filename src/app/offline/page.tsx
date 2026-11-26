"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-[#0b0e17] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141720] p-8 text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <img
            src="/gw-logo.png"
            alt="GuessWhat"
            className="h-11 w-auto object-contain"
          />
        </div>

        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#F7911B]/15 border border-[#F7911B]/30 text-[#F7911B]">
          <WifiOff className="size-7" />
        </div>

        <h1 className="font-display text-2xl font-extrabold text-white">
          You&apos;re offline
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
          Reconnect to mobile data or Wi-Fi to continue playing live rounds on GuessWhat.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-6 py-3.5 text-sm font-bold text-white shadow-lg cursor-pointer hover:brightness-110 transition-all"
        >
          <RefreshCw className="size-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
}
