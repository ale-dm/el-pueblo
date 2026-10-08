import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { ConcurrencyError } from "../../src/application/errors.js";
import { seedCatalog } from "../../src/adapters/outbound/postgres/seed.js";
import { PgEventLog, PgMatchStore, PgPlayerStore, type Db } from "../../src/adapters/outbound/postgres/repositories.js";
import type { GameEventEnvelope } from "@el-pueblo/engine";

const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));
const CATALOG = fileURLToPath(new URL("../../../../data/catalog", import.meta.url));
const WIKI = fileURLToPath(new URL("../../../../data/wiki", import.meta.url));

let db: Db;

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
  await seedCatalog(db, { catalogDir: CATALOG, wikiDir: WIKI });
}, 120_000);

const matchRow = (id: string, code: string) => ({
  id, roomCode: code, status: "lobby" as const, seed: 42, config: {}, engineVersion: "test", createdAt: new Date(),
});

const publicEvent = (seq: number): GameEventEnvelope => ({
  seq, type: "phase.started", payload: { phase: "discussion", dayNumber: 1 }, visibility: "public", audiencePlayerId: null,
});

describe("adaptadores PostgreSQL (sobre PGlite)", () => {
  it("guarda y busca partidas; el código activo es único", async () => {
    const matches = new PgMatchStore(db);
    await matches.insert(matchRow("11111111-1111-1111-1111-111111111111", "ABC123"));
    expect((await matches.findById("11111111-1111-1111-1111-111111111111"))?.seed).toBe(42);
    expect((await matches.findActiveByRoomCode("ABC123"))?.id).toBe("11111111-1111-1111-1111-111111111111");
    await expect(matches.insert(matchRow("22222222-2222-2222-2222-222222222222", "ABC123"))).rejects.toThrow();
  });

  it("guarda jugadores: el token solo se guarda como hash y se busca por él", async () => {
    const players = new PgPlayerStore(db);
    const matchId = "11111111-1111-1111-1111-111111111111";
    await players.insert({
      id: "33333333-3333-3333-3333-333333333333", matchId, seat: 1, nick: "Ana", roleKey: null, faction: null,
      status: "alive", connected: true, deathReason: null, usesLeft: {}, flags: {}, tokenHash: "h(tok-1)",
    });
    expect((await players.findByTokenHash(matchId, "h(tok-1)"))?.nick).toBe("Ana");
    expect(await players.findByTokenHash(matchId, "otro")).toBeNull();
    await players.update({
      id: "33333333-3333-3333-3333-333333333333", matchId, seat: 1, nick: "Ana", roleKey: "godfather", faction: "mafia",
      status: "alive", connected: false, deathReason: null, usesLeft: {}, flags: {}, tokenHash: "h(tok-1)",
    });
    const [p] = await players.listByMatch(matchId);
    expect(p).toMatchObject({ roleKey: "godfather", faction: "mafia", connected: false });
  });

  it("el log de eventos se lee en orden y rechaza escrituras con secuencia desactualizada", async () => {
    const log = new PgEventLog(db);
    const matchId = "11111111-1111-1111-1111-111111111111";
    expect(await log.lastSeq(matchId)).toBe(0);
    await log.append(matchId, 0, [publicEvent(1), publicEvent(2)]);
    expect(await log.lastSeq(matchId)).toBe(2);
    await expect(log.append(matchId, 0, [publicEvent(3)])).rejects.toBeInstanceOf(ConcurrencyError);
    await log.append(matchId, 2, [publicEvent(3)]);
    expect((await log.read(matchId)).map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it("un evento privado conserva su destinatario", async () => {
    const log = new PgEventLog(db);
    const matchId = "11111111-1111-1111-1111-111111111111";
    await log.append(matchId, 3, [
      {
        seq: 4, type: "investigation.result",
        payload: { investigatorId: "a", targetId: "b", result: "innocent" },
        visibility: "private", audiencePlayerId: "33333333-3333-3333-3333-333333333333",
      },
    ]);
    const [last] = (await log.read(matchId)).slice(-1);
    expect(last?.visibility).toBe("private");
    expect(last?.audiencePlayerId).toBe("33333333-3333-3333-3333-333333333333");
  });
});
