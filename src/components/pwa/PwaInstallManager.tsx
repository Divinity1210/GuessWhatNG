"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, PlusSquare, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = "gw_pwa_prompt_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return Boolean(mediaMatch || iosStandalone);
}

function detectIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

export function PwaInstallManager() {
  const pathname = usePathname();
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Ignore SW registration failure on unsupported environments
        });
    }

    const standalone = isRunningStandalone();
    setIsStandalone(standalone);
    setIsIos(detectIosDevice());

    try {
      const rawTs = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      const lastDismissed = rawTs ? Number(rawTs) : 0;
      const withinTtl =
        Number.isFinite(lastDismissed) &&
        lastDismissed > 0 &&
        Date.now() - lastDismissed < DISMISS_TTL_MS;
      setDismissed(withinTtl);
    } catch {
      setDismissed(false);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowInstructionsModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowInstructionsModal(true);
      } finally {
        setInstalling(false);
      }
      return;
    }
    setShowInstructionsModal(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenInstall = () => {
      if (isStandalone) return;
      void triggerInstall();
    };
    window.addEventListener("gw-open-install", handleOpenInstall);
    return () => {
      window.removeEventListener("gw-open-install", handleOpenInstall);
    };
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  };

  if (isStandalone) return null;

  const isPlayRoute = pathname === "/play";
  const canShowFloatingBanner =
    !isPlayRoute && !dismissed && (Boolean(deferredPrompt) || isIos);

  return (
    <>
      {canShowFloatingBanner && (
        <div className="fixed bottom-18 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px] z-40 animate-fade-in">
          <div className="rounded-2xl border border-white/15 bg-[#121624]/95 backdrop-blur-xl p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.55)] flex items-center gap-3">
            <img
              src="/gw-mark.png"
              alt="GuessWhat"
              className="size-10 rounded-xl bg-[#0b0e17] p-1 border border-white/10 object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                Install GuessWhat App
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Faster rounds &amp; instant home-screen access
              </p>
            </div>
            <button
              type="button"
              onClick={triggerInstall}
              disabled={installing}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#F7911B] to-[#FF0400] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
            >
              {deferredPrompt ? (installing ? "..." : "Install") : "How to Install"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showInstructionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowInstructionsModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#121624] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/gw-mark.png"
                  alt="GuessWhat"
                  className="size-11 rounded-xl bg-[#0b0e17] p-1.5 border border-white/10 object-contain shrink-0"
                />
                <div>
                  <h3 className="font-display text-base font-extrabold text-white">
                    Install GuessWhat App
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add GuessWhat to your home screen for instant launch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                aria-label="Close install instructions"
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            {isIos ? (
              <ol className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F7911B] text-[11px] font-black text-black">
                    1
                  </span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1 text-white"><Share className="size-3.5 text-[#F7911B]" /> Share</strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F7911B] text-[11px] font-black text-black">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="inline-flex items-center gap-1 text-white"><PlusSquare className="size-3.5 text-[#F7911B]" /> Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F7911B] text-[11px] font-black text-black">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-white">Add</strong> in the top corner to install GuessWhat on your device.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Download className="size-4 text-[#F7911B] shrink-0 mt-0.5" />
                  <span>
                    Open your browser menu (<strong className="text-white">⋮</strong>) or click the <strong className="text-white">Install</strong> icon in the address bar and select <strong className="text-white">Install GuessWhat</strong> / <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInstructionsModal(false)}
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
