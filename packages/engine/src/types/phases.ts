/** Fases de la partida. Orden y transiciones en src/phases/machine.ts. */
export const PHASES = [
  "day_1", "discussion", "voting", "defense", "judgement", "last_words", "night", "ended",
] as const;
export type Phase = (typeof PHASES)[number];
