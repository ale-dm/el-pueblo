import type { FactionKey } from "./factions.js";
import type { Phase } from "./phases.js";
import type { PlayerId } from "./ids.js";

/** Quién puede ver un evento. Coincide con el enumerado `visibility` de la BD. */
export type Visibility = "public" | "mafia" | "dead" | "private";

/** Catálogo de eventos del motor. Cada tipo tiene su payload tipado. */
export type GameEventPayloads = {
  "game.started": { seed: number; playerCount: number };
  "roles.assigned": { playerId: PlayerId; roleKey: string; faction: FactionKey };
  "phase.started": { phase: Phase; dayNumber: number };
  "vote.cast": { voterId: PlayerId; targetId: PlayerId | null };
  "trial.started": { defendantId: PlayerId };
  "trial.verdict": { defendantId: PlayerId; verdict: "guilty" | "innocent" };
  "player.hanged": { playerId: PlayerId };
  "player.killed": { playerId: PlayerId; cause: string };
  "night.action.submitted": { actorId: PlayerId; ability: string; targetId: PlayerId | null };
  "night.action.blocked": { actorId: PlayerId; ability: string };
  "investigation.result": { investigatorId: PlayerId; targetId: PlayerId; result: string };
  "chat.message": { channel: "public" | "mafia" | "dead"; senderId: PlayerId; text: string };
  "game.ended": { winner: FactionKey };
};

export type GameEventType = keyof GameEventPayloads;

/** Evento tal como se guarda en la tabla `events`. */
export interface GameEventEnvelope<T extends GameEventType = GameEventType> {
  seq: number;
  type: T;
  payload: GameEventPayloads[T];
  visibility: Visibility;
  /** Obligatorio si visibility = "private". */
  audiencePlayerId: PlayerId | null;
}
