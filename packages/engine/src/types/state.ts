import type { FactionKey } from "./factions.js";
import type { Phase } from "./phases.js";
import type { PlayerId, Seat } from "./ids.js";

export type PlayerStatus = "alive" | "dead" | "disconnected";

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
}

/** Estado completo de una partida en memoria. Se reconstruye desde eventos + snapshot. */
export interface GameState {
  matchId: string;
  engineVersion: string;
  phase: Phase;
  dayNumber: number;
  /** Trials ya celebrados en el día actual (máximo 3). */
  trialsToday: number;
  players: PlayerState[];
  /** Último número de secuencia de evento aplicado. */
  seq: number;
  winner: FactionKey | null;
}
