import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enumerados ──────────────────────────────────────────────────────────────

export const matchStatus = pgEnum("match_status", ["lobby", "playing", "finished", "abandoned"]);
export const playerStatus = pgEnum("player_status", ["alive", "dead", "disconnected"]);
export const visibility = pgEnum("visibility", ["public", "mafia", "dead", "private"]);
export const narrationSource = pgEnum("narration_source", ["gemini", "template"]);

// ─── Partidas ────────────────────────────────────────────────────────────────

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomCode: varchar("room_code", { length: 8 }).notNull(),
    status: matchStatus("status").notNull().default("lobby"),
    // Configuración de la sala: roles activos, duración de fases, modo de facción, reglas extra.
    config: jsonb("config").notNull(),
    // Versión del motor con la que se jugó: necesaria para reproducir eventos antiguos.
    engineVersion: text("engine_version").notNull(),
    winnerFaction: text("winner_faction"),
    endReason: text("end_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    // Un código de sala solo puede estar en uso por una partida activa a la vez.
    uniqueIndex("matches_active_room_code_idx")
      .on(t.roomCode)
      .where(sql`${t.status} in ('lobby', 'playing')`),
    index("matches_status_idx").on(t.status),
  ],
);

export const matchPlayers = pgTable(
  "match_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    seat: integer("seat").notNull(),
    nick: varchar("nick", { length: 24 }).notNull(),
    // Clave del rol en data/roles/roles.json (p. ej. "godfather"). Null hasta que empieza la partida.
    roleKey: text("role_key"),
    faction: text("faction"),
    status: playerStatus("status").notNull().default("alive"),
    deathReason: text("death_reason"),
    diedAtSeq: integer("died_at_seq"),
    // Solo se guarda el hash SHA-256 del token de reconexión; el token nunca se persiste en claro.
    reconnectTokenHash: text("reconnect_token_hash").notNull(),
    connected: boolean("connected").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("match_players_seat_uidx").on(t.matchId, t.seat),
    uniqueIndex("match_players_nick_uidx").on(t.matchId, t.nick),
    check("match_players_seat_range", sql`${t.seat} between 1 and 15`),
  ],
);

// ─── Eventos y estado ────────────────────────────────────────────────────────

// Cada evento del motor, en orden. Es la fuente de verdad: el estado se reconstruye desde aquí.
export const events = pgTable(
  "events",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    visibility: visibility("visibility").notNull(),
    // Solo para visibility = 'private': el jugador que puede ver el evento.
    audiencePlayerId: uuid("audience_player_id").references(() => matchPlayers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.seq] }),
    index("events_match_visibility_idx").on(t.matchId, t.visibility),
    check(
      "events_private_needs_audience",
      sql`(${t.visibility} <> 'private') or (${t.audiencePlayerId} is not null)`,
    ),
  ],
);

// Estado serializado cada N eventos, para no reproducir la partida entera al reconectar.
export const snapshots = pgTable(
  "snapshots",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.seq] })],
);

// Narración de Gemini (o plantilla de respaldo) asociada a un evento.
export const narrations = pgTable(
  "narrations",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    eventSeq: integer("event_seq"),
    text: text("text").notNull(),
    source: narrationSource("source").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("narrations_match_seq_idx").on(t.matchId, t.eventSeq)],
);

// ─── Uso de IA y notificaciones ──────────────────────────────────────────────

// Consumo diario de Gemini, para limitar gasto y avisar a los admins.
export const aiUsage = pgTable("ai_usage", {
  day: date("day").primaryKey(),
  calls: integer("calls").notNull().default(0),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
  errors: integer("errors").notNull().default(0),
});

// Suscripciones de Web Push (M5). Una fila por dispositivo instalado.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchPlayerId: uuid("match_player_id")
      .notNull()
      .references(() => matchPlayers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_uidx").on(t.endpoint)],
);
