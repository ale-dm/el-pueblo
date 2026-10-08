import type { PlayerId } from "./ids.js";

/** Intenciones de los jugadores. El motor las valida y devuelve eventos o un error. */
export type Command =
  | { type: "vote"; voterId: PlayerId; targetId: PlayerId | null }
  | { type: "night.action"; actorId: PlayerId; ability: string; targetId: PlayerId | null }
  | { type: "chat.send"; senderId: PlayerId; channel: "public" | "mafia" | "dead"; text: string }
  | { type: "timer.expired" };
