import type { GameEventEnvelope } from "@el-pueblo/engine";
import { ConcurrencyError } from "../../../application/errors.js";
import type { EventLog, MatchRecord, MatchStore, PlayerRecord, PlayerStore } from "../../../application/ports.js";

export class InMemoryMatchStore implements MatchStore {
  private readonly byId = new Map<string, MatchRecord>();

  async insert(match: MatchRecord) {
    this.byId.set(match.id, { ...match });
  }

  async findById(id: string) {
    const match = this.byId.get(id);
    return match ? { ...match } : null;
  }

  async findActiveByRoomCode(roomCode: string) {
    for (const match of this.byId.values()) {
      if (match.roomCode === roomCode && (match.status === "lobby" || match.status === "playing")) {
        return { ...match };
      }
    }
    return null;
  }

  async update(match: MatchRecord) {
    if (!this.byId.has(match.id)) throw new Error(`update: partida ${match.id} no existe`);
    this.byId.set(match.id, { ...match });
  }
}

export class InMemoryPlayerStore implements PlayerStore {
  private readonly players: PlayerRecord[] = [];

  async insert(player: PlayerRecord) {
    this.players.push({ ...player });
  }

  async listByMatch(matchId: string) {
    return this.players.filter((p) => p.matchId === matchId).map((p) => ({ ...p }));
  }

  async findByTokenHash(matchId: string, tokenHash: string) {
    const player = this.players.find((p) => p.matchId === matchId && p.tokenHash === tokenHash);
    return player ? { ...player } : null;
  }

  async update(player: PlayerRecord) {
    const index = this.players.findIndex((p) => p.id === player.id);
    if (index === -1) throw new Error(`update: jugador ${player.id} no existe`);
    this.players[index] = { ...player };
  }
}

export class InMemoryEventLog implements EventLog {
  private readonly logs = new Map<string, GameEventEnvelope[]>();

  async lastSeq(matchId: string) {
    const log = this.logs.get(matchId) ?? [];
    return log.at(-1)?.seq ?? 0;
  }

  async read(matchId: string) {
    return [...(this.logs.get(matchId) ?? [])];
  }

  async append(matchId: string, expectedLastSeq: number, events: GameEventEnvelope[]) {
    const log = this.logs.get(matchId) ?? [];
    const last = log.at(-1)?.seq ?? 0;
    if (last !== expectedLastSeq) throw new ConcurrencyError();
    this.logs.set(matchId, [...log, ...events]);
  }
}
