import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createServices } from "../../src/composition.js";
import { seedCatalog } from "../../src/adapters/outbound/postgres/seed.js";
import { PgEventLog, PgMatchStore, PgNarrationStore, PgPlayerStore, PgPushSubscriptionStore, type Db } from "../../src/adapters/outbound/postgres/repositories.js";
import { JsonCatalogSource } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { CryptoIds, CryptoSecurity } from "../../src/adapters/outbound/node/crypto.js";
import { FixedClock, RecordingBroadcaster } from "../../src/adapters/outbound/memory/services.js";
import { ManualScheduler } from "../../src/adapters/outbound/memory/scheduler.js";
import { TemplateNarrator } from "../../src/adapters/outbound/narrator/template.js";
import { NoPushSender } from "../../src/adapters/outbound/webpush/sender.js";

const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));
const CATALOG = fileURLToPath(new URL("../../../../data/catalog", import.meta.url));
const WIKI = fileURLToPath(new URL("../../../../data/wiki", import.meta.url));

/** Base de datos en proceso (PGlite): sobrevive a los "procesos" que se crean encima. */
let client: PGlite;
let db: Db;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
  await seedCatalog(db, { catalogDir: CATALOG, wikiDir: WIKI });
}, 120_000);

const settle = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Un proceso del servidor: servicios con los almacenes PostgreSQL de la base compartida.
 * Cada llamada crea un proceso nuevo; el planificador de temporizadores siempre empieza vacío.
 */
function processOnDb(clock: FixedClock) {
  const scheduler = new ManualScheduler();
  const services = createServices({
    matches: new PgMatchStore(db),
    players: new PgPlayerStore(db),
    events: new PgEventLog(db),
    broadcaster: new RecordingBroadcaster(),
    catalog: new JsonCatalogSource(CATALOG),
    clock,
    ids: new CryptoIds(),
    security: new CryptoSecurity("secreto-de-prueba"),
    scheduler,
    narrations: new PgNarrationStore(db),
    narrator: new TemplateNarrator(),
    push: new PgPushSubscriptionStore(db),
    pushSender: new NoPushSender(),
    engineVersion: "test",
    retention: { lobbyTtlHours: 24, finishedRetentionDays: 30 },
  });
  return { services, scheduler };
}

describe("reinicio del servidor sobre PostgreSQL (M2)", () => {
  it("una partida en la noche sigue igual tras reiniciar el proceso y su temporizador se recupera", async () => {
    const clock = new FixedClock();
    const first = processOnDb(clock);
    const host = await first.services.createRoom({ nick: "P1" });
    const players: Array<{ playerId: string; token: string }> = [host];
    for (let i = 2; i <= 10; i++) {
      players.push(await first.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
    }
    await first.services.startMatch({ matchId: host.matchId, token: host.token });
    expect(first.scheduler.fire(host.matchId)).toBe(true); // día 1 -> noche 1
    await settle();
    const before = await first.services.getView({ matchId: host.matchId, token: host.token });
    expect(before.phase).toBe("night");

    // Reinicio: un proceso nuevo sobre la misma base de datos.
    const second = processOnDb(clock);
    expect(second.scheduler.pending.has(host.matchId)).toBe(false);
    expect(await second.services.recoverTimers(second.services.advance)).toBe(1);
    expect(second.scheduler.pending.has(host.matchId)).toBe(true);

    const after = await second.services.getView({ matchId: host.matchId, token: host.token });
    expect(after).toEqual(before);

    expect(second.scheduler.fire(host.matchId)).toBe(true);
    await settle();
    const next = await second.services.getView({ matchId: host.matchId, token: host.token });
    expect(next.phase).toBe("discussion");
    expect(next.dayNumber).toBe(2);
  });
});
