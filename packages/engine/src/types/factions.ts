/** Bandos del juego. En el MVP solo se usan "mafia" y "town" (ver docs/GDD.md §1). */
export const FACTIONS = ["town", "mafia", "coven", "neutral", "werewolf"] as const;
export type FactionKey = (typeof FACTIONS)[number];
