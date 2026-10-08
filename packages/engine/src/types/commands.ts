import type { PlayerId } from "./ids.js";

/** Intenciones de los jugadores. El motor las valida y devuelve eventos o un error. */
export type Command =
  | { type: "game.start"; hostId: PlayerId }
  | { type: "vote"; voterId: PlayerId; targetId: PlayerId | null }
  | { type: "judgement.vote"; voterId: PlayerId; verdict: "guilty" | "innocent" }
  | { type: "day.action"; actorId: PlayerId; ability: string; targetId: PlayerId | null }
  | {
      type: "night.action";
      actorId: PlayerId;
      ability: string;
      targetId: PlayerId | null;
      secondTargetId?: PlayerId | null;
    }
  | { type: "chat.send"; senderId: PlayerId; channel: "public" | "mafia" | "dead"; text: string }
  | { type: "timer.expired" };
