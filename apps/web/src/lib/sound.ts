/**
 * Efectos de sonido (sin música). Se generan con el navegador, sin ficheros.
 * El silencio se guarda en este navegador. Si el audio no está disponible, no pasa nada.
 */

const KEY = "pueblo:muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? "1" : "0");
  } catch {
    // Sin almacenamiento: el silencio dura lo que la pestaña.
  }
}

export type Cue = "vote" | "phase" | "night" | "death";

const TONE: Record<Cue, { freq: number; type: OscillatorType; dur: number; slide?: number }> = {
  vote: { freq: 880, type: "triangle", dur: 0.08 },
  phase: { freq: 523, type: "sine", dur: 0.6, slide: 1.5 },
  night: { freq: 330, type: "sine", dur: 1.2, slide: 0.6 },
  death: { freq: 220, type: "sawtooth", dur: 0.9, slide: 0.4 },
};

let context: AudioContext | null = null;

export function playCue(cue: Cue) {
  if (isMuted()) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const tone = TONE[cue];
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now);
    if (tone.slide) osc.frequency.linearRampToValueAtTime(tone.freq * tone.slide, now + tone.dur);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.dur);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + tone.dur);
  } catch {
    // Sin audio (navegador sin Web Audio o sin gesto del usuario): se calla.
  }
}
