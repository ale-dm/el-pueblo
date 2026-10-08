import { fileURLToPath } from "node:url";
import { createServices } from "../../src/composition.js";
import { JsonCatalogSource } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { InMemoryEventLog, InMemoryMatchStore, InMemoryPlayerStore } from "../../src/adapters/outbound/memory/stores.js";
import { FixedClock, RecordingBroadcaster, SequentialIds, SequentialSecurity } from "../../src/adapters/outbound/memory/services.js";
import { ManualScheduler } from "../../src/adapters/outbound/memory/scheduler.js";

export const CATALOG_DIR = fileURLToPath(new URL("../../../../data/catalog", import.meta.url));

/** Aplicación completa con adaptadores en memoria. Ningún test necesita base de datos ni red. */
export function createTestApp() {
  const matches = new InMemoryMatchStore();
  const players = new InMemoryPlayerStore();
  const events = new InMemoryEventLog();
  const broadcaster = new RecordingBroadcaster();
  const clock = new FixedClock();
  const ids = new SequentialIds();
  const security = new SequentialSecurity();
  const scheduler = new ManualScheduler();
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
    engineVersion: "0.1.0",
  });
  return { services, matches, players, events, broadcaster, clock, ids, security, scheduler };
}
