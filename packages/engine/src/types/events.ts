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
  /** Un rol de apoyo de la Mafia se convierte en Mafioso cuando ya no quedan Mafiosos que maten. */
  "role.promoted": { playerId: PlayerId; roleKey: string; uses: Record<string, number> };
  "phase.started": { phase: Phase; dayNumber: number };
  "vote.cast": { voterId: PlayerId; targetId: PlayerId | null };
  "trial.started": { defendantId: PlayerId };
  "judgement.cast": { voterId: PlayerId; verdict: "guilty" | "innocent" };
  /** guiltyWeight/innocentWeight: votos ponderados (el Mayor revelado vale 3). Ausentes en partidas antiguas. */
  "trial.verdict": { defendantId: PlayerId; verdict: "guilty" | "innocent"; guiltyWeight?: number; innocentWeight?: number };
  /** will: última voluntad (texto), o null si no escribió ni fue limpiado. Se revela al morir. */
  "player.hanged": { playerId: PlayerId; roleKey: string | null; will: string | null };
  /** cleaned: el Janitor lo limpió; el rol no se revela y se muestra como "Limpiado" (wiki: Janitor.md:212). */
  "player.killed": { playerId: PlayerId; cause: string; roleKey: string | null; will: string | null; cleaned?: boolean };
  /** mafiaTeam: si el actor es de la Mafia, la decisión la ven los demás miembros vivos de la Mafia. */
  /** roleKey: el rol de quien actúa (el Mafioso sabe cuándo es una orden del Godfather, Mafioso.md:225). */
  "night.action.submitted": { actorId: PlayerId; ability: string; targetId: PlayerId | null; secondTargetId: PlayerId | null; choice: string | null; mafiaTeam: boolean; roleKey?: string | null };
  /** roleblock_immune: el mensaje de bloqueo para un inmune al bloqueo (wiki: Hypnotist.md:262, 408). */
  "hypnosis.message": { playerId: PlayerId; message: "attacked" | "protected" | "roleblocked" | "roleblock_immune" };
  /** Lo ve solo quien falsificó (forgerId). */
  "will.forged": { playerId: PlayerId; role: string; forgerId: PlayerId };
  "night.action.cancelled": { actorId: PlayerId; mafiaTeam: boolean };
  "will.written": { playerId: PlayerId; text: string };
  "night.action.blocked": { actorId: PlayerId; ability: string };
  /**
   * Aviso privado de la noche (wiki): solo lo recibe `playerId`.
   * target_jailed: su objetivo estaba encarcelado y su acción falla (Jailor.md:252).
   * attack_attempt: lo atacó alguien mientras estaba encarcelado (Jailor.md:252, Vigilante.md:194).
   * medium_talking: un Médium le habla esta noche; un aviso por cada Médium (Medium.md:209, 213).
   * healed: lo atacaron y un Doctor lo curó (Doctor.md:225, 253).
   * jailor_execute / jailor_changed_mind: el Jailor decide ejecutarle o cambia de opinión (Jailor.md:282, 284).
   * psychic_small / psychic_evil: la Psíquica no puede dar visión (Psychic.md:318, 322).
   */
  "night.notice": { playerId: PlayerId; notice: "target_jailed" | "attack_attempt" | "medium_talking" | "transport_jailed" | "jailed_transport_attempt" | "transported" | "healed" | "target_attacked" | "vigilante_put_away_gun" | "vigilante_guilt_suicide" | "jailor_execute" | "jailor_changed_mind" | "psychic_small" | "psychic_evil" };
  /** Usos que le quedan tras disparar o ponerse en alerta (wiki: Vigilante y Veteran, "You have (#) bullet(s) left"). Solo lo ve el jugador. */
  "uses.left": { playerId: PlayerId; ability: string; left: number };
  /** El Janitor limpió a un jugador que murió esta noche: ve su rol real al amanecer (wiki: Janitor.md:214). */
  "clean.revealed": { janitorId: PlayerId; playerId: PlayerId; roleKey: string | null };
  /** check: tipo de comprobación (suspicious, group, role, visitors, targets, mafiaVisits, vision). group: claves de rol del grupo (wiki: Investigator). */
  /** side: en la visión de la Psíquica, el bando del que hay al menos uno (wiki: Psychic).
   * more: el Lookout sabe que hubo más visitantes de los tres que identifica (wiki: Lookout). */
  "investigation.result": { investigatorId: PlayerId; targetId: PlayerId; result: string; check: string; side?: "mafia" | "town"; more?: boolean };
  "ability.used": { playerId: PlayerId; ability: string };
  "effect.applied": { actorId: PlayerId; targetId: PlayerId; flag: PlayerFlag };
  "player.blackmailed": { actorId: PlayerId; targetId: PlayerId };
  "player.jailed": { jailorId: PlayerId; playerId: PlayerId };
  "mayor.revealed": { playerId: PlayerId };
  "trap.placed": { trapperId: PlayerId; targetId: PlayerId; readyDay: number };
  /** La trampa se desmonta (el Trapper se elige a sí mismo) o se activa por una visita. */
  "trap.removed": { trapperId: PlayerId; reason: "dismantled" | "triggered" };
  "attack.prevented": { victimId: PlayerId; protectorId: PlayerId };
  "night.resolved": { dayNumber: number };
  /**
   * whisper: un susurro se registra dos veces, una para quien lo envía y otra para quien lo recibe
   * (audienceId cambia). Así cada uno lo ve como un mensaje privado suyo.
   */
  /** anonymous: el Médium vivo habla con los muertos y los muertos lo ven como "Medium" (wiki: Medium). */
  "chat.message": { channel: "public" | "mafia" | "dead" | "whisper" | "jail" | "seance"; senderId: PlayerId; text: string; recipientId?: PlayerId; audienceId?: PlayerId; anonymous?: boolean };
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
