import type { FactionKey } from "./factions.js";
import type { Phase } from "./phases.js";
import type { PlayerId } from "./ids.js";
import type { PlayerFlag } from "./state.js";

/** Quién puede ver un evento. Coincide con el enumerado `visibility` de la BD. */
export type Visibility = "public" | "mafia" | "dead" | "private";

/** Catálogo de eventos del motor. Cada tipo tiene su payload tipado. */
export type GameEventPayloads = {
  "game.started": { playerCount: number };
  "roles.assigned": { playerId: PlayerId; roleKey: string; faction: FactionKey; uses: Record<string, number> };
  "phase.started": { phase: Phase; dayNumber: number };
  "vote.cast": { voterId: PlayerId; targetId: PlayerId | null };
  "trial.started": { defendantId: PlayerId };
  "judgement.cast": { voterId: PlayerId; verdict: "guilty" | "innocent" };
  "trial.verdict": { defendantId: PlayerId; verdict: "guilty" | "innocent" };
  "player.hanged": { playerId: PlayerId; roleKey: string | null };
  "player.killed": { playerId: PlayerId; cause: string; roleKey: string | null };
  "night.action.submitted": { actorId: PlayerId; ability: string; targetId: PlayerId | null; secondTargetId: PlayerId | null };
  "night.action.blocked": { actorId: PlayerId; ability: string };
  "investigation.result": { investigatorId: PlayerId; targetId: PlayerId; result: string };
  "ability.used": { playerId: PlayerId; ability: string };
  "effect.applied": { actorId: PlayerId; targetId: PlayerId; flag: PlayerFlag };
  "player.blackmailed": { actorId: PlayerId; targetId: PlayerId };
  "player.jailed": { jailorId: PlayerId; playerId: PlayerId };
  "mayor.revealed": { playerId: PlayerId };
  "trap.placed": { trapperId: PlayerId; targetId: PlayerId; readyDay: number };
  "attack.prevented": { victimId: PlayerId; protectorId: PlayerId };
  "night.resolved": { dayNumber: number };
  "chat.message": { channel: "public" | "mafia" | "dead"; senderId: PlayerId; text: string };
  "game.ended": { winner: FactionKey };
};

export type GameEventType = keyof GameEventPayloads;

/** Evento tal como se guarda en la tabla `events`. Unión discriminada por `type`. */
export type GameEventEnvelope<T extends GameEventType = GameEventType> = {
  [K in T]: {
    seq: number;
    type: K;
    payload: GameEventPayloads[K];
    visibility: Visibility;
    /** Obligatorio si visibility = "private". */
    audiencePlayerId: PlayerId | null;
  };
}[T];

/** Evento antes de asignarle seq y visibilidad. Lo construye el motor. */
export type EventInput = {
  [K in GameEventType]: { type: K; payload: GameEventPayloads[K] };
}[GameEventType];
