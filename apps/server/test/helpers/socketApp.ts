import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connectClient, type Socket as ClientSocket } from "socket.io-client";
import { createServices } from "../../src/composition.js";
import { JsonCatalogSource } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { InMemoryEventLog, InMemoryMatchStore, InMemoryPlayerStore } from "../../src/adapters/outbound/memory/stores.js";
import { FixedClock, SequentialIds, SequentialSecurity } from "../../src/adapters/outbound/memory/services.js";
import { ManualScheduler } from "../../src/adapters/outbound/memory/scheduler.js";
import { InMemoryNarrationStore } from "../../src/adapters/outbound/memory/stores.js";
import { TemplateNarrator } from "../../src/adapters/outbound/narrator/template.js";
import { SocketIoBroadcaster, ViewerRegistry } from "../../src/adapters/outbound/socket-io/broadcaster.js";
import { attachGateway } from "../../src/adapters/inbound/socket-io/gateway.js";
import { RateLimiter } from "../../src/adapters/inbound/socket-io/rateLimit.js";
import { CATALOG_DIR } from "./testApp.js";

/** Servidor real (HTTP + Socket.IO) con adaptadores en memoria y temporizadores manuales. */
export async function startSocketApp(opts: { chatMax?: number } = {}) {
  const http = createServer();
  const io = new Server(http);
  const matches = new InMemoryMatchStore();
  const players = new InMemoryPlayerStore();
  const events = new InMemoryEventLog();
  const viewers = new ViewerRegistry();
  const scheduler = new ManualScheduler();
  const services = createServices({
    matches, players, events,
    broadcaster: new SocketIoBroadcaster(io, players, viewers),
    catalog: new JsonCatalogSource(CATALOG_DIR),
    clock: new FixedClock(),
    ids: new SequentialIds(),
    security: new SequentialSecurity(),
    scheduler,
    narrations: new InMemoryNarrationStore(),
    narrator: new TemplateNarrator(),
    engineVersion: "test",
  });
  attachGateway(io, {
    services,
    viewers,
    chatLimiter: new RateLimiter(opts.chatMax ?? 5, 10_000),
    createLimiter: new RateLimiter(10, 60_000),
    log: () => undefined,
  });
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const port = (http.address() as AddressInfo).port;
  const sockets: ClientSocket[] = [];

  const connect = () =>
    new Promise<ClientSocket>((resolve, reject) => {
      const s = connectClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
      sockets.push(s);
      s.once("connect", () => resolve(s));
      s.once("connect_error", reject);
    });

  const close = async () => {
    for (const s of sockets) s.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  };

  return { connect, close, scheduler, services, matches, events, players };
}

export type AckResponse = { ok: true; data?: any } | { ok: false; error: { code: string; message: string } };

export const emitAck = (s: ClientSocket, event: string, payload: unknown): Promise<AckResponse> =>
  new Promise((resolve) => s.emit(event, payload, resolve));

/** Espera a que se cumpla una condición, con tiempo límite. */
export async function waitFor(check: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor: tiempo agotado");
    await new Promise((r) => setTimeout(r, 10));
  }
}
