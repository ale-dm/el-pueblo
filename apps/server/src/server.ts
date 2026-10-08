import { existsSync } from "node:fs";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Server } from "socket.io";
import { createServices } from "./composition.js";
import { attachGateway } from "./adapters/inbound/socket-io/gateway.js";
import { RateLimiter } from "./adapters/inbound/socket-io/rateLimit.js";
import { JsonCatalogSource } from "./adapters/outbound/catalog-json/loadCatalog.js";
import { PgEventLog, PgMatchStore, PgPlayerStore } from "./adapters/outbound/postgres/repositories.js";
import { SocketIoBroadcaster, ViewerRegistry } from "./adapters/outbound/socket-io/broadcaster.js";
import { CryptoIds, CryptoSecurity } from "./adapters/outbound/node/crypto.js";
import { NodeScheduler } from "./adapters/outbound/node/scheduler.js";
import { PgNarrationStore } from "./adapters/outbound/postgres/repositories.js";
import { GeminiNarrator } from "./adapters/outbound/narrator/gemini.js";
import { googleTextModel } from "./adapters/outbound/narrator/googleModel.js";
import { TemplateNarrator } from "./adapters/outbound/narrator/template.js";

export interface ServerConfig {
  databaseUrl: string;
  host: string;
  port: number;
  /** Orígenes permitidos para la PWA (CORS de Socket.IO). */
  corsOrigins: string[];
  catalogDir: string;
  /** Carpeta con la PWA compilada (apps/web/dist). Si existe, el servidor la sirve en el mismo origen. */
  webDist?: string;
  /** Clave de Gemini. Sin ella, la narración usa plantillas. */
  googleApiKey?: string;
  geminiModel: string;
  narratorTimeoutMs: number;
  engineVersion: string;
  chatMessagesPerTenSeconds: number;
}

/** Arranca HTTP (salud), Socket.IO y los casos de uso sobre PostgreSQL. Reprograma las partidas en curso. */
export async function startServer(config: ServerConfig) {
  const sql = postgres(config.databaseUrl, { max: 10 });
  const db = drizzle(sql);

  const app = Fastify({ logger: false });
  app.get("/health", async () => ({ ok: true, version: config.engineVersion }));
  if (config.webDist && existsSync(config.webDist)) {
    await app.register(fastifyStatic, { root: config.webDist, wildcard: false });
    // Rutas de la SPA: cualquier ruta que no sea API ni Socket.IO devuelve index.html.
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/socket.io") && !request.url.startsWith("/health")) {
        return reply.type("text/html").sendFile("index.html");
      }
      return reply.code(404).send({ error: "not_found" });
    });
  }
  await app.ready();

  const io = new Server(app.server, { cors: { origin: config.corsOrigins } });
  const players = new PgPlayerStore(db);
  const viewers = new ViewerRegistry();
  const scheduler = new NodeScheduler();
  const services = createServices({
    matches: new PgMatchStore(db),
    players,
    events: new PgEventLog(db),
    broadcaster: new SocketIoBroadcaster(io, players, viewers),
    catalog: new JsonCatalogSource(config.catalogDir),
    clock: { now: () => new Date() },
    ids: new CryptoIds(),
    security: new CryptoSecurity(),
    scheduler,
    narrations: new PgNarrationStore(db),
    narrator: config.googleApiKey
      ? new GeminiNarrator(googleTextModel(config.googleApiKey), config.geminiModel, config.narratorTimeoutMs, (m) => console.error(`[server] ${m}`))
      : new TemplateNarrator(),
    engineVersion: config.engineVersion,
  });

  attachGateway(io, {
    services,
    viewers,
    chatLimiter: new RateLimiter(config.chatMessagesPerTenSeconds, 10_000),
    createLimiter: new RateLimiter(5, 60_000),
    log: (message, detail) => console.error(`[server] ${message}`, detail),
  });

  const recovered = await services.recoverTimers(services.advance);
  await app.listen({ port: config.port, host: config.host });

  return {
    recovered,
    close: async () => {
      await services.drainNarrations();
      io.close();
      await app.close();
      await sql.end();
    },
  };
}
