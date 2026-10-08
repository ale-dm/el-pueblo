import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { FactionKey, GameEventEnvelope } from "@el-pueblo/engine";
import { ConcurrencyError } from "../../../application/errors.js";
import type { EventLog, MatchRecord, MatchStatus, MatchStore, NarrationRecord, NarrationStore, PlayerRecord, PlayerStore, PushSubscriptionRecord, PushSubscriptionStore } from "../../../application/ports.js";
import * as s from "./schema.js";

/** Cualquier driver de drizzle para PostgreSQL (postgres-js en producción, PGlite en tests). */
export type Db = PgDatabase<any, any, any>;

type MatchRow = typeof s.matches.$inferSelect;
type PlayerRow = typeof s.matchPlayers.$inferSelect;

const toMatch = (row: MatchRow): MatchRecord => ({
  id: row.id,
  roomCode: row.roomCode,
  status: row.status as MatchStatus,
  seed: row.seed,
  config: row.config as Record<string, unknown>,
  engineVersion: row.engineVersion,
  createdAt: row.createdAt,
});

/** Los jugadores no guardan usos ni marcas: se reconstruyen desde los eventos. */
const toPlayer = (row: PlayerRow): PlayerRecord => ({
  id: row.id,
  matchId: row.matchId,
  seat: row.seat,
  nick: row.nick,
  roleKey: row.roleKey,
  faction: row.faction as FactionKey | null,
  status: row.status,
  connected: row.connected,
  deathReason: row.deathReason,
  usesLeft: {},
  flags: {},
  tokenHash: row.reconnectTokenHash,
});

export class PgMatchStore implements MatchStore {
  constructor(private readonly db: Db) {}

  async insert(match: MatchRecord) {
    await this.db.insert(s.matches).values({
      id: match.id,
      roomCode: match.roomCode,
      status: match.status,
      seed: match.seed,
      config: match.config,
      engineVersion: match.engineVersion,
      createdAt: match.createdAt,
    });
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(s.matches).where(eq(s.matches.id, id)).limit(1);
    return row ? toMatch(row) : null;
  }

  async findActiveByRoomCode(roomCode: string) {
    const [row] = await this.db
      .select()
      .from(s.matches)
      .where(and(eq(s.matches.roomCode, roomCode), inArray(s.matches.status, ["lobby", "playing"])))
      .limit(1);
    return row ? toMatch(row) : null;
  }

  async listByStatus(status: MatchStatus) {
    const rows = await this.db.select().from(s.matches).where(eq(s.matches.status, status));
    return rows.map(toMatch);
  }

  async update(match: MatchRecord) {
    await this.db
      .update(s.matches)
      .set({ status: match.status, config: match.config, endedAt: match.status === "finished" ? new Date() : null })
      .where(eq(s.matches.id, match.id));
  }
}

export class PgPlayerStore implements PlayerStore {
  constructor(private readonly db: Db) {}

  async insert(player: PlayerRecord) {
    await this.db.insert(s.matchPlayers).values({
      id: player.id,
      matchId: player.matchId,
      seat: player.seat,
      nick: player.nick,
      roleKey: player.roleKey,
      faction: player.faction,
      status: player.status,
      deathReason: player.deathReason,
      reconnectTokenHash: player.tokenHash,
      connected: player.connected,
    });
  }

  async listByMatch(matchId: string) {
    const rows = await this.db
      .select()
      .from(s.matchPlayers)
      .where(eq(s.matchPlayers.matchId, matchId))
      .orderBy(asc(s.matchPlayers.seat));
    return rows.map(toPlayer);
  }

  async findByTokenHash(matchId: string, tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(s.matchPlayers)
      .where(and(eq(s.matchPlayers.matchId, matchId), eq(s.matchPlayers.reconnectTokenHash, tokenHash)))
      .limit(1);
    return row ? toPlayer(row) : null;
  }

  async update(player: PlayerRecord) {
    await this.db
      .update(s.matchPlayers)
      .set({
        roleKey: player.roleKey,
        faction: player.faction,
        status: player.status,
        deathReason: player.deathReason,
        connected: player.connected,
        leftAt: player.connected ? null : new Date(),
      })
      .where(eq(s.matchPlayers.id, player.id));
  }
}

const toEnvelope = (row: typeof s.events.$inferSelect): GameEventEnvelope =>
  ({
    seq: row.seq,
    type: row.type,
    payload: row.payload,
    visibility: row.visibility,
    audiencePlayerId: row.audiencePlayerId,
  }) as GameEventEnvelope;

export class PgEventLog implements EventLog {
  constructor(private readonly db: Db) {}

  async lastSeq(matchId: string) {
    const [row] = await this.db
      .select({ last: max(s.events.seq) })
      .from(s.events)
      .where(eq(s.events.matchId, matchId));
    return row?.last ?? 0;
  }

  async read(matchId: string) {
    const rows = await this.db
      .select()
      .from(s.events)
      .where(eq(s.events.matchId, matchId))
      .orderBy(asc(s.events.seq));
    return rows.map(toEnvelope);
  }

  async append(matchId: string, expectedLastSeq: number, events: GameEventEnvelope[]) {
    if (events.length === 0) return;
    await this.db.transaction(async (tx) => {
      // Bloquea la fila de la partida: las escrituras de una misma partida quedan en serie.
      await tx.select({ id: s.matches.id }).from(s.matches).where(eq(s.matches.id, matchId)).for("update");
      const [row] = await tx
        .select({ last: max(s.events.seq) })
        .from(s.events)
        .where(eq(s.events.matchId, matchId));
      if ((row?.last ?? 0) !== expectedLastSeq) throw new ConcurrencyError();
      await tx.insert(s.events).values(
        events.map((e) => ({
          matchId,
          seq: e.seq,
          type: e.type,
          payload: e.payload as Record<string, unknown>,
          visibility: e.visibility,
          audiencePlayerId: e.audiencePlayerId,
        })),
      );
    });
  }
}


export class PgNarrationStore implements NarrationStore {
  constructor(private readonly db: Db) {}

  async insert(r: NarrationRecord) {
    await this.db.insert(s.narrations).values({
      matchId: r.matchId,
      eventSeq: r.eventSeq,
      text: r.text,
      source: r.source,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      createdAt: r.createdAt,
    });
  }

  async listByMatch(matchId: string) {
    const rows = await this.db.select().from(s.narrations).where(eq(s.narrations.matchId, matchId)).orderBy(asc(s.narrations.id));
    return rows.map((row) => ({
      matchId: row.matchId,
      eventSeq: row.eventSeq ?? 0,
      text: row.text,
      source: row.source,
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      createdAt: row.createdAt,
    }));
  }
}

export class PgPushSubscriptionStore implements PushSubscriptionStore {
  constructor(private readonly db: Db) {}

  async upsert(r: PushSubscriptionRecord) {
    await this.db
      .insert(s.pushSubscriptions)
      .values({ matchPlayerId: r.matchPlayerId, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })
      .onConflictDoUpdate({
        target: s.pushSubscriptions.endpoint,
        set: { matchPlayerId: r.matchPlayerId, p256dh: r.p256dh, auth: r.auth, lastUsedAt: new Date() },
      });
  }

  async remove(endpoint: string) {
    await this.db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint));
  }

  async listByMatch(matchId: string) {
    const rows = await this.db
      .select({
        matchPlayerId: s.pushSubscriptions.matchPlayerId,
        endpoint: s.pushSubscriptions.endpoint,
        p256dh: s.pushSubscriptions.p256dh,
        auth: s.pushSubscriptions.auth,
      })
      .from(s.pushSubscriptions)
      .innerJoin(s.matchPlayers, eq(s.matchPlayers.id, s.pushSubscriptions.matchPlayerId))
      .where(eq(s.matchPlayers.matchId, matchId));
    return rows.map((row) => ({ ...row, matchId }));
  }
}
