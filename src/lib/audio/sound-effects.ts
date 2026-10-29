"use client";

/**
 * Clean, zero-latency Web Audio API sound effects engine for GuessWhat.
 * Respects user mute preference stored in localStorage ("gw_sound_muted").
 */

const STORAGE_KEY = "gw_sound_muted";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
}

function playTone(
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  type: OscillatorType = "sine",
  peakGain = 0.12
) {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

/** Crisp ascending chord when starting a 10-question game session */
export function playGameStart(): void {
  playTone(523.25, 0.0, 0.14, "triangle", 0.12); // C5
  playTone(659.25, 0.07, 0.14, "triangle", 0.12); // E5
  playTone(783.99, 0.14, 0.16, "triangle", 0.13); // G5
  playTone(1046.5, 0.21, 0.28, "sine", 0.15); // C6
}

/** Tactile two-tone pop when locking in an option choice */
export function playOptionSelect(): void {
  playTone(587.33, 0.0, 0.09, "triangle", 0.13); // D5
  playTone(880.0, 0.055, 0.16, "sine", 0.14); // A5
}

/** Subtle tick when advancing to the next question */
export function playQuestionAdvance(): void {
  playTone(659.25, 0.0, 0.07, "sine", 0.07); // E5
}

/** Subtle celebratory chime when a player climbs up the live leaderboard */
export function playRankClimb(): void {
  playTone(587.33, 0.0, 0.11, "sine", 0.08); // D5
  playTone(739.99, 0.06, 0.11, "sine", 0.08); // F#5
  playTone(880.0, 0.12, 0.18, "triangle", 0.1); // A5
}

/** Full fanfare chord sequence when completing all 10 questions */
export function playSessionComplete(): void {
  playTone(523.25, 0.0, 0.15, "triangle", 0.13); // C5
  playTone(659.25, 0.09, 0.15, "triangle", 0.13); // E5
  playTone(783.99, 0.18, 0.15, "triangle", 0.13); // G5
  playTone(1046.5, 0.27, 0.4, "sine", 0.16); // C6
  playTone(1318.5, 0.35, 0.45, "triangle", 0.12); // E6
}
