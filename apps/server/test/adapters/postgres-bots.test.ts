import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { PgEventLog, PgMatchStore, PgPlayerStore, PgPushSubscriptionStore, type Db } from "../../src/adapters/outbound/postgres/repositories.js";
import type { GameEventEnvelope } from "@el-pueblo/engine";

const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));

describe("adaptador PostgreSQL: marca de bot", () => {
  it("un bot se guarda con is_bot y vuelve con isBot; un humano vuelve sin marca", async () => {
    const client = new PGlite();
    const db = drizzle(client) as unknown as Db;
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });

    const matchId = "33333333-3333-3333-3333-333333333333";
    await new PgMatchStore(db).insert({
      id: matchId, roomCode: "BOT123", status: "lobby", seed: 7, config: {}, engineVersion: "test", createdAt: new Date(),
    });
    const base = {
      matchId, roleKey: null, faction: null, status: "alive" as const, connected: true, deathReason: null, usesLeft: {}, flags: {},
    };
    const players = new PgPlayerStore(db);
    await players.insert({ ...base, id: "44444444-4444-4444-4444-444444444444", seat: 1, nick: "Ana", tokenHash: "h1" });
    await players.insert({ ...base, id: "55555555-5555-5555-5555-555555555555", seat: 2, nick: "Bot 1", tokenHash: "h2", isBot: true });

    const roster = await players.listByMatch(matchId);
    expect(roster.find((p) => p.id === "55555555-5555-5555-5555-555555555555")?.isBot).toBe(true);
    expect(roster.find((p) => p.id === "44444444-4444-4444-4444-444444444444")?.isBot).toBe(false);
  }, 120_000);

  it("los eventos guardan su hora, y borrar la partida borra jugadores, eventos y suscripciones", async () => {
    const client = new PGlite();
    const db = drizzle(client) as unknown as Db;
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });

    const matchId = "66666666-6666-6666-6666-666666666666";
    const playerId = "77777777-7777-7777-7777-777777777777";
    await new PgMatchStore(db).insert({
      id: matchId, roomCode: "DEL123", status: "finished", seed: 9, config: {}, engineVersion: "test", createdAt: new Date(),
    });
    await new PgPlayerStore(db).insert({
      id: playerId, matchId, seat: 1, nick: "Ana", roleKey: null, faction: null, status: "alive", connected: true,
      deathReason: null, usesLeft: {}, flags: {}, tokenHash: "h",
    });
    await new PgPushSubscriptionStore(db).upsert({
      matchPlayerId: playerId, matchId, endpoint: "https://push.example/a", p256dh: "p", auth: "a",
    });
    const event = {
      seq: 1, type: "phase.started", payload: { phase: "day_1", dayNumber: 1 }, visibility: "public", audiencePlayerId: null,
    } as unknown as GameEventEnvelope;
    const events = new PgEventLog(db);
    await events.append(matchId, 0, [event]);

    const timed = await events.readTimed(matchId);
    expect(timed).toHaveLength(1);
    expect(timed[0]!.at).toBeInstanceOf(Date);

    // Al terminar, sin suscripciones; al borrar la partida, todo lo demás desaparece en cascada.
    await new PgPushSubscriptionStore(db).removeByMatch(matchId);
    expect(await new PgPushSubscriptionStore(db).listByMatch(matchId)).toHaveLength(0);
    await new PgMatchStore(db).delete(matchId);
    expect(await new PgMatchStore(db).findById(matchId)).toBeNull();
    expect(await new PgPlayerStore(db).listByMatch(matchId)).toHaveLength(0);
    expect(await events.read(matchId)).toHaveLength(0);
  }, 120_000);
});
