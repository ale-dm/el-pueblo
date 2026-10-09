import { fileURLToPath } from "node:url";
import { createServices } from "../../src/composition.js";
import { JsonCatalogSource } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { InMemoryEventLog, InMemoryMatchStore, InMemoryNarrationStore, InMemoryPlayerStore } from "../../src/adapters/outbound/memory/stores.js";
import { TemplateNarrator } from "../../src/adapters/outbound/narrator/template.js";
import { InMemoryPushStore } from "../../src/adapters/outbound/memory/stores.js";
import { FakePushSender } from "./fakePush.js";
import { FixedClock, RecordingBroadcaster, SequentialIds, SequentialSecurity } from "../../src/adapters/outbound/memory/services.js";
import { ManualScheduler } from "../../src/adapters/outbound/memory/scheduler.js";

export const CATALOG_DIR = fileURLToPath(new URL("../../../../data/catalog", import.meta.url));

/** Lo que sobrevive a un reinicio del servidor: en producción, PostgreSQL. */
export interface DurableState {
  clock: FixedClock;
  matches: InMemoryMatchStore;
  players: InMemoryPlayerStore;
  events: InMemoryEventLog;
  narrations: InMemoryNarrationStore;
  push: InMemoryPushStore;
}

/**
 * Aplicación completa con adaptadores en memoria. Ningún test necesita base de datos ni red.
 * Con `durable` de una instancia anterior, simula un reinicio: los datos son los mismos y
 * el planificador de temporizadores empieza vacío (como en un proceso nuevo).
 */
export function createTestApp(durable?: DurableState) {
  const clock = durable?.clock ?? new FixedClock();
  const matches = durable?.matches ?? new InMemoryMatchStore();
  const players = durable?.players ?? new InMemoryPlayerStore();
  const events = durable?.events ?? new InMemoryEventLog(clock);
  const broadcaster = new RecordingBroadcaster();
  const ids = new SequentialIds();
  const security = new SequentialSecurity();
  const scheduler = new ManualScheduler();
  const narrations = durable?.narrations ?? new InMemoryNarrationStore();
  const push = durable?.push ?? new InMemoryPushStore();
  const pushSender = new FakePushSender();
  const services = createServices({
    matches,
    players,
    events,
    broadcaster,
    catalog: new JsonCatalogSource(CATALOG_DIR),
    clock,
    ids,
    security,
    scheduler,
    narrations,
    narrator: new TemplateNarrator(),
    push,
    pushSender,
    engineVersion: "0.1.0",
    retention: { lobbyTtlHours: 24, finishedRetentionDays: 30 },
  });
  const durableState: DurableState = { clock, matches, players, events, narrations, push };
  return { services, matches, players, events, broadcaster, clock, ids, security, scheduler, narrations, push, pushSender, durableState };
}
