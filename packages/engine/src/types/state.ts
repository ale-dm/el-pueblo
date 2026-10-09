import type { FactionKey } from "./factions.js";
import type { Phase } from "./phases.js";
import type { PlayerId, Seat } from "./ids.js";

export type PlayerStatus = "alive" | "dead" | "disconnected";

/** Marcas que aplican las acciones. "alert", "jailed" y "blackmailed" duran solo hasta el final de la noche o del día. */
export type PlayerFlag = "framed" | "cleaned" | "blackmailed" | "jailed" | "alert" | "mayorRevealed" | "noExecute" | "zombied";

export interface PlayerState {
  id: PlayerId;
  seat: Seat;
  nick: string;
  /** Clave de roles.key. Null hasta asignar roles. */
  roleKey: string | null;
  faction: FactionKey | null;
  status: PlayerStatus;
  connected: boolean;
  deathReason: string | null;
  /** Usos restantes de las habilidades limitadas (clave de habilidad → usos). */
  usesLeft: Record<string, number>;
  flags: Partial<Record<PlayerFlag, true>>;
}

/** Acción nocturna registrada para esta noche. */
export interface NightAction {
  ability: string;
  targetId: PlayerId | null;
  secondTargetId: PlayerId | null;
  choice: string | null;
}

/** Trampa colocada por un Trapper. Se activa a partir de `readyDay`. */
export interface TrapState {
  targetId: PlayerId;
  readyDay: number;
}

/** Estado completo de una partida. Se reconstruye desde eventos (+ snapshot). */
export interface GameState {
  matchId: string;
  engineVersion: string;
  phase: Phase;
  dayNumber: number;
  /** Último número de secuencia de evento aplicado. */
  seq: number;
  winner: FactionKey | null;
  players: PlayerState[];
  /** Juicios ya celebrados en el día actual (máximo 3). */
  trialsToday: number;
  /** Votos del día: votante → objetivo (null = abstención). */
  votes: Record<PlayerId, PlayerId | null>;
  /** Veredictos del juicio en curso. */
  verdicts: Record<PlayerId, "guilty" | "innocent">;
  defendantId: PlayerId | null;
  /** Acciones nocturnas de esta noche: actor → acción. */
  nightActions: Record<PlayerId, NightAction>;
  /** Trampas activas: trampero → trampa. */
  traps: Record<PlayerId, TrapState>;
  /** Último día en que cada jugador usó una habilidad de día (una vez por día). */
  dayActionDay: Record<PlayerId, number>;
  /** Últimas voluntades escritas por jugadores vivos. Se revelan al morir. */
  wills: Record<PlayerId, string>;
  /** Encarcelados de esta noche: prisionero → Jailor. Se vacía al final de la noche. */
  jailedBy: Record<PlayerId, PlayerId>;
  /** Rol falsificado de cada jugador esta noche (Forger). Se muestra si muere esta misma noche; se vacía al final de la noche. */
  forgeries: Record<PlayerId, string>;
}
