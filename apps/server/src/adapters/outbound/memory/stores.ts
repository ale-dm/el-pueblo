import type { GameEventEnvelope } from "@el-pueblo/engine";
import { ConcurrencyError } from "../../../application/errors.js";
import type { Clock, EventLog, MatchRecord, MatchStore, NarrationRecord, NarrationStore, PlayerRecord, PlayerStore, PushSubscriptionRecord, PushSubscriptionStore, TimedEvent } from "../../../application/ports.js";

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

  async listByStatus(status: MatchRecord["status"]) {
    return [...this.byId.values()].filter((m) => m.status === status).map((m) => ({ ...m }));
  }

  async update(match: MatchRecord) {
    if (!this.byId.has(match.id)) throw new Error(`update: partida ${match.id} no existe`);
    this.byId.set(match.id, { ...match });
  }

  async delete(id: string) {
    this.byId.delete(id);
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
  private readonly times = new Map<string, Date[]>();

  constructor(private readonly clock: Clock = { now: () => new Date() }) {}

  async lastSeq(matchId: string) {
    const log = this.logs.get(matchId) ?? [];
    return log.at(-1)?.seq ?? 0;
  }

  async read(matchId: string) {
    return [...(this.logs.get(matchId) ?? [])];
  }

  async readTimed(matchId: string): Promise<TimedEvent[]> {
    const log = this.logs.get(matchId) ?? [];
    const at = this.times.get(matchId) ?? [];
    return log.map((event, i) => ({ event, at: at[i]! }));
  }

  async append(matchId: string, expectedLastSeq: number, events: GameEventEnvelope[]) {
    const log = this.logs.get(matchId) ?? [];
    const last = log.at(-1)?.seq ?? 0;
    if (last !== expectedLastSeq) throw new ConcurrencyError();
    this.logs.set(matchId, [...log, ...events]);
    const now = this.clock.now();
    this.times.set(matchId, [...(this.times.get(matchId) ?? []), ...events.map(() => now)]);
  }
}

export class InMemoryNarrationStore implements NarrationStore {
  private readonly records: NarrationRecord[] = [];

  async insert(record: NarrationRecord) {
    this.records.push({ ...record });
  }

  async listByMatch(matchId: string) {
    return this.records.filter((r) => r.matchId === matchId).map((r) => ({ ...r }));
  }
}

export class InMemoryPushStore implements PushSubscriptionStore {
  private readonly records = new Map<string, PushSubscriptionRecord>();

  async upsert(record: PushSubscriptionRecord) {
    this.records.set(record.endpoint, { ...record });
  }

  async remove(endpoint: string) {
    this.records.delete(endpoint);
  }

  async removeByMatch(matchId: string) {
    for (const [endpoint, record] of this.records) {
      if (record.matchId === matchId) this.records.delete(endpoint);
    }
  }

  async listByMatch(matchId: string) {
    return [...this.records.values()].filter((r) => r.matchId === matchId).map((r) => ({ ...r }));
  }
}
