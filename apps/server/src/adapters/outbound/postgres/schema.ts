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

// ─── Catálogo de juego (solo lectura en runtime, sembrado desde data/) ──────

// Bandos. Las condiciones de victoria vienen de la wiki (Factions, Victory).
export const factions = pgTable("factions", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  winCondition: text("win_condition"),
  wikiTitle: text("wiki_title"),
});

// Las 12 categorías de rol de la wiki (Mafia Killing, Town Protective...).
export const alignments = pgTable("alignments", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  factionKey: text("faction_key")
    .notNull()
    .references(() => factions.key),
  wikiTitle: text("wiki_title").notNull().unique(),
});

export const roles = pgTable(
  "roles",
  {
    key: text("key").primaryKey(),
    name: text("name").notNull(),
    wikiTitle: text("wiki_title").notNull().unique(),
    factionKey: text("faction_key")
      .notNull()
      .references(() => factions.key),
    alignmentKey: text("alignment_key").references(() => alignments.key),
    roleType: text("role_type"),
    isUnique: boolean("is_unique").notNull().default(false),
    priority: integer("priority"),
    attack: text("attack"),
    defense: text("defense"),
    summary: text("summary"),
    goal: text("goal"),
    abilities: text("abilities"),
    attributes: text("attributes"),
    special: text("special"),
    actionOther: text("action_other"),
    actionNone: text("action_none"),
    winWith: text("win_with"),
    mustKill: text("must_kill"),
    restrictions: text("restrictions"),
    uses: text("uses"),
    sheriffResult: text("sheriff_result"),
    investigatorResult: text("investigator_result"),
    consigliereResult: text("consigliere_result"),
    // Parte del MVP (Mafia y Town) o fase posterior.
    mvp: boolean("mvp").notNull().default(false),
    // Lo marca el desarrollo cuando el motor y sus tests cubren el rol. Nunca lo sobrescribe el seed.
    implemented: boolean("implemented").notNull().default(false),
    iconFile: text("icon_file"),
    skinFile: text("skin_file"),
    // Registro completo tal cual viene de data/roles/roles.json.
    raw: jsonb("raw").notNull(),
  },
  (t) => [index("roles_faction_idx").on(t.factionKey)],
);

// Una fila por línea de atributos del rol (inmunidades, Attack/Defense, etc.).
export const roleAttributes = pgTable(
  "role_attributes",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    attribute: text("attribute").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.position] })],
);

// Interacciones entre roles. Se rellenan al implementar cada rol y sus tests (status: pending → verified → implemented).
export const roleInteractions = pgTable(
  "role_interactions",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    sourceRoleKey: text("source_role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    targetRoleKey: text("target_role_key").references(() => roles.key, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    description: text("description").notNull(),
    sourcePage: text("source_page"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("role_interactions_source_idx").on(t.sourceRoleKey),
    check("role_interactions_status_check", sql`${t.status} in ('pending', 'verified', 'implemented')`),
  ],
);

// Duración de cada fase por modo (data/game_config.json). seconds null = no aplica (p. ej. Día 1 en Rapid ToS 2).
export const phaseTimings = pgTable(
  "phase_timings",
  {
    mode: text("mode").notNull(),
    phase: text("phase").notNull(),
    seconds: integer("seconds"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mode, t.phase] })],
);

// Modos de juego de Mafia (Classic, Ranked, Custom...).
export const gameModes = pgTable("game_modes", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  players: text("players"),
  roles: jsonb("roles"),
  notes: text("notes"),
  sourcePage: text("source_page"),
});

// Reglas que el host debe cumplir al crear una partida Custom.
export const hostRules = pgTable("host_rules", {
  position: integer("position").primaryKey(),
  rule: text("rule").notNull(),
});

// Votos necesarios para llevar a juicio, según los vivos.
export const votingThresholds = pgTable("voting_thresholds", {
  alive: integer("alive").primaryKey(),
  votesRequired: integer("votes_required").notNull(),
});

// Modificadores de partida (página Modifiers de la wiki).
export const modifiers = pgTable("modifiers", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  gameModes: jsonb("game_modes").notNull(),
  sourcePage: text("source_page"),
});

// ─── Wiki de referencia (volcado completo, solo lectura) ─────────────────────

export const wikiPages = pgTable(
  "wiki_pages",
  {
    title: text("title").primaryKey(),
    pageId: integer("page_id"),
    isRedirect: boolean("is_redirect").notNull().default(false),
    redirectTarget: text("redirect_target"),
    // ToS, ToS 2, TiS, BToS... o null si no lleva etiqueta de versión.
    versionTag: text("version_tag"),
    // true si la página está en el alcance ToS 1 (la que se usa para el juego).
    inScope: boolean("in_scope").notNull().default(false),
    categories: text("categories").array().notNull(),
    wikitext: text("wikitext").notNull(),
    touchedAt: timestamp("touched_at", { withTimezone: true }),
    lastEditAt: timestamp("last_edit_at", { withTimezone: true }),
  },
  (t) => [index("wiki_pages_scope_idx").on(t.inScope), index("wiki_pages_redirect_idx").on(t.isRedirect)],
);

// Imágenes referenciadas por el alcance ToS 1. Los binarios no van en la BD: ver localFile o url.
export const wikiImages = pgTable("wiki_images", {
  name: text("name").primaryKey(),
  url: text("url"),
  bytes: bigint("bytes", { mode: "number" }),
  mime: text("mime"),
  existsInWiki: boolean("exists_in_wiki").notNull(),
  localFile: text("local_file"),
  referencedBy: text("referenced_by").array().notNull(),
});

// Control de siembra: qué versión de cada fuente está cargada.
export const catalogMeta = pgTable("catalog_meta", {
  source: text("source").primaryKey(),
  sha256: text("sha256").notNull(),
  seededAt: timestamp("seeded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Partidas ────────────────────────────────────────────────────────────────

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomCode: varchar("room_code", { length: 8 }).notNull(),
    status: matchStatus("status").notNull().default("lobby"),
    // Semilla del azar de la partida: con ella y los comandos, el motor reproduce el mismo resultado.
    seed: bigint("seed", { mode: "number" }).notNull(),
    // Configuración de la sala: roles activos, duración de fases, modo de facción, reglas extra.
    config: jsonb("config").notNull(),
    // Versión del motor con la que se jugó: necesaria para reproducir eventos antiguos.
    engineVersion: text("engine_version").notNull(),
    winnerFaction: text("winner_faction").references(() => factions.key),
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
    // Clave de roles.key. Nula hasta que empieza la partida.
    roleKey: text("role_key").references(() => roles.key),
    faction: text("faction").references(() => factions.key),
    status: playerStatus("status").notNull().default("alive"),
    deathReason: text("death_reason"),
    diedAtSeq: integer("died_at_seq"),
    // Solo se guarda el hash SHA-256 del token de reconexión; el token nunca se persiste en claro.
    reconnectTokenHash: text("reconnect_token_hash").notNull(),
    connected: boolean("connected").notNull().default(true),
    // Jugadores controlados por el servidor. Su token no sale nunca del servidor.
    isBot: boolean("is_bot").notNull().default(false),
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
