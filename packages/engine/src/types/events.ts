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
  /** will: última voluntad (texto), o null si no escribió ni fue limpiado. Se revela al morir. */
  "player.hanged": { playerId: PlayerId; roleKey: string | null; will: string | null };
  "player.killed": { playerId: PlayerId; cause: string; roleKey: string | null; will: string | null };
  /** mafiaTeam: si el actor es de la Mafia, la decisión la ven los demás miembros vivos de la Mafia. */
  "night.action.submitted": { actorId: PlayerId; ability: string; targetId: PlayerId | null; secondTargetId: PlayerId | null; mafiaTeam: boolean };
  "night.action.cancelled": { actorId: PlayerId; mafiaTeam: boolean };
  "will.written": { playerId: PlayerId; text: string };
  "night.action.blocked": { actorId: PlayerId; ability: string };
  /** check: tipo de comprobación (suspicious, alignment, role, visitors, targets, mafiaVisits, vision). */
  "investigation.result": { investigatorId: PlayerId; targetId: PlayerId; result: string; check: string };
  "ability.used": { playerId: PlayerId; ability: string };
  "effect.applied": { actorId: PlayerId; targetId: PlayerId; flag: PlayerFlag };
  "player.blackmailed": { actorId: PlayerId; targetId: PlayerId };
  "player.jailed": { jailorId: PlayerId; playerId: PlayerId };
  "mayor.revealed": { playerId: PlayerId };
  "trap.placed": { trapperId: PlayerId; targetId: PlayerId; readyDay: number };
  "attack.prevented": { victimId: PlayerId; protectorId: PlayerId };
  "night.resolved": { dayNumber: number };
  /**
   * whisper: un susurro se registra dos veces, una para quien lo envía y otra para quien lo recibe
   * (audienceId cambia). Así cada uno lo ve como un mensaje privado suyo.
   */
  "chat.message": { channel: "public" | "mafia" | "dead" | "whisper" | "jail"; senderId: PlayerId; text: string; recipientId?: PlayerId; audienceId?: PlayerId };
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
