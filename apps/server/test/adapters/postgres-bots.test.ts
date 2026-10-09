import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { PgMatchStore, PgPlayerStore, type Db } from "../../src/adapters/outbound/postgres/repositories.js";

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
});
