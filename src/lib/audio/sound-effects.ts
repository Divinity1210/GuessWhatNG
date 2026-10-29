"use client";

/**
 * GuessWhat Audio & Signature Background Music Engine ("The GuessWhat Groove")
 * - Zero-latency Web Audio API sound effects + polyphonic 4-bar Afrobeats/Kalimba/Rhodes loop
 * - Sample-accurate lookahead scheduler at 106 BPM in F Major / A Minor (Fmaj9 -> G6 -> Em7 -> Am9)
 * - Respects user mute & music toggles stored in localStorage
 */

const SOUND_MUTE_KEY = "gw_sound_muted";
const MUSIC_OFF_KEY = "gw_music_off";

let audioCtx: AudioContext | null = null;
let bgmMasterGain: GainNode | null = null;
let bgmSchedulerTimer: ReturnType<typeof setInterval> | null = null;
let bgmIsRunning = false;
let currentStep = 0;
let nextNoteTime = 0;
let lastMenuClickMs = 0;

// 106 BPM -> 16th note = ~0.1415s
const BPM = 106;
const SIXTEENTH_SEC = 60 / BPM / 4;
const TOTAL_STEPS = 64; // 4 bars of 16 sixteenth-notes

// MIDI note to Hz helper
function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 4-Bar Lush Rhodes Chord Progression: Fmaj9 -> G6 -> Em7 -> Am9
const BAR_CHORDS: number[][] = [
  [65, 69, 72, 76, 79], // Bar 1: Fmaj9 (F4, A4, C5, E5, G5)
  [67, 71, 74, 76, 79], // Bar 2: G6/9  (G4, B4, D5, E5, G5)
  [64, 67, 71, 74, 79], // Bar 3: Em7   (E4, G4, B4, D5, G5)
  [69, 72, 76, 79, 83], // Bar 4: Am9   (A4, C5, E5, G5, B5)
];

// Warm Sub-Bass pattern (64 steps across 4 bars; 0 = rest, >0 = MIDI note)
const BASS_STEPS: number[] = [
  // Bar 1 (F2 = 41, C3 = 48)
  41, 0, 0, 41, 0, 0, 48, 0, 41, 0, 0, 0, 48, 0, 41, 0,
  // Bar 2 (G2 = 43, D3 = 50)
  43, 0, 0, 43, 0, 0, 50, 0, 43, 0, 0, 0, 50, 0, 43, 0,
  // Bar 3 (E2 = 40, B2 = 47)
  40, 0, 0, 40, 0, 0, 47, 0, 40, 0, 0, 0, 47, 0, 40, 0,
  // Bar 4 (A2 = 45, E3 = 52, G2 = 43 turnaround)
  45, 0, 0, 45, 0, 0, 52, 0, 45, 0, 0, 43, 0, 0, 45, 0,
];

// Addictive Kalimba / Marimba Pentatonic Hook (64 steps; 0 = rest, >0 = MIDI note)
// Uses A minor / C major pentatonic (C5=72, D5=74, E5=76, G5=79, A5=81, C6=84)
const MELODY_STEPS: number[] = [
  // Bar 1: Call phrase — bright, warm syncopated kalimba motif
  76, 0, 79, 0, 81, 0, 79, 76, 0, 74, 0, 72, 0, 74, 76, 0,
  // Bar 2: Rising response
  79, 0, 81, 0, 84, 0, 81, 79, 0, 76, 0, 74, 0, 76, 74, 0,
  // Bar 3: Melodious counter-hook
  76, 0, 79, 0, 81, 0, 84, 0, 81, 0, 79, 76, 0, 74, 72, 0,
  // Bar 4: Warm resolution & turnaround
  72, 0, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0,
];

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

function getBgmMaster(ctx: AudioContext): GainNode {
  if (!bgmMasterGain) {
    bgmMasterGain = ctx.createGain();
    bgmMasterGain.gain.setValueAtTime(0.85, ctx.currentTime);
    bgmMasterGain.connect(ctx.destination);
  }
  return bgmMasterGain;
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_MUTE_KEY) === "1";
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_MUTE_KEY, muted ? "1" : "0");
  if (muted) {
    stopBackgroundMusic();
  }
  window.dispatchEvent(new CustomEvent("gw-audio-change"));
}

export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUSIC_OFF_KEY) !== "1" && !isSoundMuted();
}

export function isBackgroundMusicPlaying(): boolean {
  return bgmIsRunning;
}

/** Schedule a lush Electric Rhodes chord pad for 1 bar */
function scheduleRhodesChord(ctx: AudioContext, dest: AudioNode, midiNotes: number[], time: number, duration: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1050, time);
  filter.connect(dest);

  for (const note of midiNotes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(mtof(note), time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.022, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.008, time + duration * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

/** Schedule a warm Kalimba / Marimba pluck with a subtle dotted-8th echo tap */
function scheduleKalimbaPluck(ctx: AudioContext, dest: AudioNode, midiNote: number, time: number) {
  const freq = mtof(midiNote);

  const playTap = (tapTime: number, peak: number) => {
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, tapTime);

    // Soft 2nd harmonic chime overtone for authentic kalimba tine warmth
    harmonic.type = "sine";
    harmonic.frequency.setValueAtTime(freq * 2, tapTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, tapTime);
    filter.frequency.exponentialRampToValueAtTime(650, tapTime + 0.28);

    gain.gain.setValueAtTime(0.0001, tapTime);
    gain.gain.linearRampToValueAtTime(peak, tapTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, tapTime + 0.34);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.0001, tapTime);
    harmGain.gain.linearRampToValueAtTime(peak * 0.25, tapTime + 0.005);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, tapTime + 0.09);

    osc.connect(filter);
    harmonic.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(tapTime);
    harmonic.start(tapTime);
    osc.stop(tapTime + 0.36);
    harmonic.stop(tapTime + 0.11);
  };

  // Primary kalimba pluck + soft dotted-8th echo
  playTap(time, 0.065);
  playTap(time + SIXTEENTH_SEC * 3, 0.018);
}

/** Schedule a round, warm Afrobeats sub-bass note */
function scheduleSubBass(ctx: AudioContext, dest: AudioNode, midiNote: number, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(mtof(midiNote), time);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(240, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.085, time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + SIXTEENTH_SEC * 2.4);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(time);
  osc.stop(time + SIXTEENTH_SEC * 2.5);
}

/** Schedule a gentle warm woodblock/rim clave on syncopated Afrobeats steps */
function scheduleWarmClave(ctx: AudioContext, dest: AudioNode, time: number, accent: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(accent ? 780 : 620, time);
  osc.frequency.exponentialRampToValueAtTime(320, time + 0.035);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(accent ? 0.022 : 0.012, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(time);
  osc.stop(time + 0.045);
}

function scheduleStep(ctx: AudioContext, step: number, time: number) {
  const master = getBgmMaster(ctx);

  // 1. Trigger lush Rhodes chord at the start of each 16-step bar
  if (step % 16 === 0) {
    const barIdx = Math.floor(step / 16) % BAR_CHORDS.length;
    scheduleRhodesChord(ctx, master, BAR_CHORDS[barIdx], time, SIXTEENTH_SEC * 16);
  }

  // 2. Trigger Sub-Bass groove
  const bassNote = BASS_STEPS[step % TOTAL_STEPS];
  if (bassNote > 0) {
    scheduleSubBass(ctx, master, bassNote, time);
  }

  // 3. Trigger Kalimba earworm melody
  const melNote = MELODY_STEPS[step % TOTAL_STEPS];
  if (melNote > 0) {
    scheduleKalimbaPluck(ctx, master, melNote, time);
  }

  // 4. Gentle syncopated Afrobeats woodblock clave (steps 0, 3, 6, 10, 12 in each bar)
  const barStep = step % 16;
  if (barStep === 0 || barStep === 3 || barStep === 6 || barStep === 10 || barStep === 12) {
    scheduleWarmClave(ctx, master, time, barStep === 3 || barStep === 10);
  }
}

/** Start the signature GuessWhat background music loop */
export function startBackgroundMusic(): void {
  if (typeof window === "undefined") return;
  if (isSoundMuted() || window.localStorage.getItem(MUSIC_OFF_KEY) === "1") return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (bgmIsRunning) return;
  bgmIsRunning = true;

  const master = getBgmMaster(ctx);
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.01, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.6);

  currentStep = 0;
  nextNoteTime = ctx.currentTime + 0.05;

  bgmSchedulerTimer = setInterval(() => {
    if (!bgmIsRunning || !audioCtx) return;
    // Schedule 180ms ahead for rock-solid timing
    while (nextNoteTime < audioCtx.currentTime + 0.18) {
      scheduleStep(audioCtx, currentStep, nextNoteTime);
      nextNoteTime += SIXTEENTH_SEC;
      currentStep = (currentStep + 1) % TOTAL_STEPS;
    }
  }, 50);

  window.dispatchEvent(new CustomEvent("gw-audio-change"));
}

/** Smoothly stop the background music loop */
export function stopBackgroundMusic(): void {
  bgmIsRunning = false;
  if (bgmSchedulerTimer) {
    clearInterval(bgmSchedulerTimer);
    bgmSchedulerTimer = null;
  }
  if (audioCtx && bgmMasterGain) {
    try {
      bgmMasterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmMasterGain.gain.setValueAtTime(bgmMasterGain.gain.value, audioCtx.currentTime);
      bgmMasterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    } catch {
      // Ignore
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gw-audio-change"));
  }
}

/** Toggle background music on/off during active gameplay and persist preference */
export function toggleBackgroundMusic(): boolean {
  if (typeof window === "undefined") return false;
  if (bgmIsRunning) {
    window.localStorage.setItem(MUSIC_OFF_KEY, "1");
    stopBackgroundMusic();
    return false;
  } else {
    window.localStorage.setItem(MUSIC_OFF_KEY, "0");
    startBackgroundMusic();
    return true;
  }
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

/** Crisp, tactile wooden/kalimba UI click when navigating menus, tabs, and buttons */
export function playMenuClick(): void {
  if (isSoundMuted()) return;
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (nowMs - lastMenuClickMs < 45) return; // Prevent double-firing on nested handlers
  lastMenuClickMs = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;

  // Warm wooden body tap (quick pitch inflection 680Hz -> 920Hz)
  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  bodyOsc.type = "triangle";
  bodyOsc.frequency.setValueAtTime(680, t);
  bodyOsc.frequency.exponentialRampToValueAtTime(920, t + 0.028);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, t);

  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.linearRampToValueAtTime(0.11, t + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.048);

  bodyOsc.connect(filter);
  filter.connect(bodyGain);
  bodyGain.connect(ctx.destination);

  bodyOsc.start(t);
  bodyOsc.stop(t + 0.055);

  // Subtle crisp harmonic overtone for tactile snap
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();

  snapOsc.type = "sine";
  snapOsc.frequency.setValueAtTime(1480, t);

  snapGain.gain.setValueAtTime(0.0001, t);
  snapGain.gain.linearRampToValueAtTime(0.055, t + 0.002);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);

  snapOsc.connect(snapGain);
  snapGain.connect(ctx.destination);

  snapOsc.start(t);
  snapOsc.stop(t + 0.03);
}

/** Crisp ascending chord when starting a 10-question game session + starts background music */
export function playGameStart(): void {
  lastMenuClickMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  playTone(523.25, 0.0, 0.14, "triangle", 0.12); // C5
  playTone(659.25, 0.07, 0.14, "triangle", 0.12); // E5
  playTone(783.99, 0.14, 0.16, "triangle", 0.13); // G5
  playTone(1046.5, 0.21, 0.28, "sine", 0.15); // C6
  startBackgroundMusic();
}

/** Tactile two-tone pop when locking in an option choice */
export function playOptionSelect(): void {
  lastMenuClickMs = typeof performance !== "undefined" ? performance.now() : Date.now();
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

/** Full fanfare chord sequence when completing all 10 questions (stops background music first) */
export function playSessionComplete(): void {
  stopBackgroundMusic();
  playTone(523.25, 0.0, 0.15, "triangle", 0.13); // C5
  playTone(659.25, 0.09, 0.15, "triangle", 0.13); // E5
  playTone(783.99, 0.18, 0.15, "triangle", 0.13); // G5
  playTone(1046.5, 0.27, 0.4, "sine", 0.16); // C6
  playTone(1318.5, 0.35, 0.45, "triangle", 0.12); // E6
}
