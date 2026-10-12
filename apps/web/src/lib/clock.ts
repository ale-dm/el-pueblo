/** Fracción del temporizador que queda (de 0 a 1). `max` es la duración con la que empezó la fase. */
export function clockFraction(left: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, left / max));
}
