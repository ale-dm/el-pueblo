/** Segundos que quedan hasta `endsAt` (ISO), sin bajar de 0. Null si no hay temporizador. */
export function secondsLeft(endsAt: string | null, now: number): number | null {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
}

/** m:ss, como en el reloj de la partida. */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
