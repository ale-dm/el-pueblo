import type { Catalog, GameEventEnvelope, PlayerState } from "@el-pueblo/engine";

// Puertos: lo que la aplicación necesita del exterior. Sin dependencias de infraestructura.

export type MatchStatus = "lobby" | "playing" | "finished" | "abandoned";

export interface MatchRecord {
  id: string;
  roomCode: string;
  status: MatchStatus;
  /** Semilla de la partida. Con ella y los comandos, el motor reproduce el mismo resultado. */
  seed: number;
  config: Record<string, unknown>;
  engineVersion: string;
  createdAt: Date;
}

/** Estado del jugador en el motor, más lo que solo necesita la aplicación. */
export interface PlayerRecord extends PlayerState {
  matchId: string;
  /** Hash del token de reconexión. El token nunca se guarda. */
  tokenHash: string;
}

export interface MatchStore {
  insert(match: MatchRecord): Promise<void>;
  findById(id: string): Promise<MatchRecord | null>;
  findActiveByRoomCode(roomCode: string): Promise<MatchRecord | null>;
  listByStatus(status: MatchStatus): Promise<MatchRecord[]>;
  update(match: MatchRecord): Promise<void>;
}

export interface PlayerStore {
  insert(player: PlayerRecord): Promise<void>;
  listByMatch(matchId: string): Promise<PlayerRecord[]>;
  findByTokenHash(matchId: string, tokenHash: string): Promise<PlayerRecord | null>;
  update(player: PlayerRecord): Promise<void>;
}

export interface EventLog {
  /** Último seq escrito, o 0 si no hay eventos. */
  lastSeq(matchId: string): Promise<number>;
  read(matchId: string): Promise<GameEventEnvelope[]>;
  /**
   * Añade eventos solo si el último seq sigue siendo `expectedLastSeq`.
   * Si no, lanza ConcurrencyError.
   */
  append(matchId: string, expectedLastSeq: number, events: GameEventEnvelope[]): Promise<void>;
}

/** Entrega eventos a los clientes de una partida. El adaptador aplica la proyección por jugador. */
export interface Broadcaster {
  publish(matchId: string, events: GameEventEnvelope[]): Promise<void>;
  /** Narración pública: la reciben todos los jugadores de la partida. */
  publishNarration(matchId: string, narration: { seq: number; text: string; source: "gemini" | "template" }): Promise<void>;
}

/** Hechos públicos de la noche o del día, a partir de los que se narra. Nunca contienen información privada. */
export type NarrationFact =
  | { kind: "day"; dayNumber: number }
  | { kind: "night"; dayNumber: number; deaths: Array<{ nick: string; cause: string; role: string | null }> }
  | { kind: "trial"; defendant: string }
  | { kind: "verdict"; defendant: string; verdict: "guilty" | "innocent" }
  | { kind: "hanged"; nick: string; role: string | null }
  | { kind: "ended"; winner: "town" | "mafia" };

export interface Narration {
  text: string;
  source: "gemini" | "template";
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface Narrator {
  narrate(facts: NarrationFact[]): Promise<Narration>;
}

export interface NarrationRecord extends Narration {
  matchId: string;
  eventSeq: number;
  createdAt: Date;
}

export interface NarrationStore {
  insert(record: NarrationRecord): Promise<void>;
  listByMatch(matchId: string): Promise<NarrationRecord[]>;
}

export interface CatalogSource {
  load(): Promise<Catalog>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  uuid(): string;
  roomCode(): string;
}

export interface Security {
  /** Token de reconexión, aleatorio y no adivinable. */
  newToken(): string;
  hashToken(token: string): string;
  /** Semilla para una partida nueva. */
  newSeed(): number;
}

/** Temporizadores de fase: uno por partida. Programar otro cancela el anterior. */
export interface Scheduler {
  schedule(matchId: string, delayMs: number, onFire: () => void): void;
  cancel(matchId: string): void;
}
