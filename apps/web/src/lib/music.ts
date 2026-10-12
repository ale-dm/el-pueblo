import { isMuted } from "./sound.js";

/**
 * Música de fondo: las pistas de la wiki (public/audio), una por fase, en bucle. Comparte el silencio con los efectos
 * (`sound.ts`). Los navegadores no dejan sonar hasta que el usuario toca algo: si el primer intento se bloquea, se
 * reintenta en el primer toque.
 */
export type Track = "cauldron" | "naming" | "day" | "discussion" | "voting" | "defense" | "night";

const VOLUME = 0.3;
const FADE_MS = 700;
const STEP_MS = 40;

let audio: HTMLAudioElement | null = null;
let current: Track | null = null;
let fader: ReturnType<typeof setInterval> | null = null;
let retry = false;

/** Pista de la pantalla: la sala (con o sin elección de nombres), o la fase de la partida. Nada fuera de ellas. */
export function trackFor(input: { status: string; phase?: string; naming?: boolean }): Track | null {
  if (input.status === "lobby") return input.naming ? "naming" : "cauldron";
  if (input.status !== "playing") return null;
  switch (input.phase) {
    case "day_1": return "day";
    case "discussion": return "discussion";
    case "voting": return "voting";
    case "defense":
    case "judgement":
    case "last_words": return "defense";
    case "night": return "night";
    default: return null;
  }
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    // Sin gesto del usuario el navegador rechaza el sonido: se reintenta en el siguiente toque.
    window.addEventListener("pointerdown", () => {
      if (retry && audio && current) void audio.play().then(() => (retry = false)).catch(() => {});
    });
    window.addEventListener("pueblo:mute", () => {
      if (audio) audio.muted = isMuted();
    });
  }
  return audio;
}

function fadeTo(target: number, done?: () => void) {
  const a = element();
  if (fader) clearInterval(fader);
  const step = (VOLUME / (FADE_MS / STEP_MS)) * (target > a.volume ? 1 : -1);
  fader = setInterval(() => {
    const next = Math.min(VOLUME, Math.max(0, a.volume + step));
    const reached = step > 0 ? next >= target : next <= target;
    a.volume = reached ? target : next;
    if (reached) {
      if (fader) clearInterval(fader);
      fader = null;
      done?.();
    }
  }, STEP_MS);
}

let wanted: Track | null = null;
let hold: Track | null = null;

/** Pista de la pantalla. Si hay una retención (p. ej. el reparto de muertes), esa suena primero. */
export function playTrack(track: Track | null) {
  wanted = track;
  apply();
}

/** Retiene una pista mientras dure algo (el reparto de muertes de la mañana). Null la suelta y vuelve la de la pantalla. */
export function holdTrack(track: Track | null) {
  hold = track;
  apply();
}

function apply() {
  const track = hold ?? wanted;
  if (track === current) return;
  switchTo(track);
}

function switchTo(track: Track | null) {
  current = track;
  const a = element();
  const start = () => {
    if (track === null) {
      a.pause();
      return;
    }
    a.src = `/audio/${track}.mp3`;
    a.volume = 0;
    a.muted = isMuted();
    a.play().then(() => (retry = false)).catch(() => (retry = true));
    fadeTo(VOLUME);
  };
  if (a.paused || a.volume === 0) start();
  else fadeTo(0, start);
}
