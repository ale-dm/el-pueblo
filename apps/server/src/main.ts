import { fileURLToPath } from "node:url";
import { startServer } from "./server.js";

const env = process.env;
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const server = await startServer({
  databaseUrl,
  host: env.HOST ?? "0.0.0.0",
  port: Number(env.PORT ?? 3000),
  corsOrigins: (env.PUBLIC_URL ?? "http://localhost:5173").split(",").map((o) => o.trim()),
  catalogDir: fileURLToPath(new URL("../../../data/catalog", import.meta.url)),
  webDist: env.WEB_DIST ?? fileURLToPath(new URL("../../web/dist", import.meta.url)),
  googleApiKey: env.GOOGLE_API_KEY || undefined,
  geminiModel: env.GEMINI_MODEL ?? "gemini-2.5-flash",
  narratorTimeoutMs: Number(env.NARRATOR_TIMEOUT_MS ?? 8000),
  vapid: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
    ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT ?? "mailto:admin@example.com" }
    : undefined,
  engineVersion: env.ENGINE_VERSION ?? "0.1.0",
  chatMessagesPerTenSeconds: Number(env.CHAT_MESSAGES_PER_10S ?? 5),
});
console.log(`[server] escuchando en ${env.PORT ?? 3000}; partidas en curso reprogramadas: ${server.recovered}`);

const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
