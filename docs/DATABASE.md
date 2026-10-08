# Esquema de base de datos (PostgreSQL)

Fuente de verdad: `apps/server/src/db/schema.ts` (Drizzle). La migración inicial está en `apps/server/drizzle/0000_brave_vector.sql`.
Verificado: el esquema compila con TypeScript estricto y `drizzle-kit generate` genera la migración sin errores.

## Tablas

### `matches`
Una fila por partida.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `room_code` | varchar(8) | Código que comparten los jugadores. Único solo entre partidas activas |
| `status` | enum `match_status` | `lobby`, `playing`, `finished`, `abandoned` |
| `config` | jsonb | Roles activos, duración de fases, modo de facción, reglas extra |
| `engine_version` | text | Versión del motor con la que se jugó. Necesaria para reproducir eventos antiguos |
| `winner_faction` | text, nullable | `Town` o `Mafia` |
| `end_reason` | text, nullable | |
| `created_at`, `started_at`, `ended_at` | timestamptz | |

Índices: único parcial sobre `room_code` donde `status` es `lobby` o `playing`; y `status`.

### `match_players`
Jugadores de una partida. No hay tabla de usuarios: en la fase 1 los jugadores son nicks por partida.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `match_id` | uuid, FK → `matches` | Borrado en cascada |
| `seat` | integer | 1–15. Único dentro de la partida |
| `nick` | varchar(24) | Único dentro de la partida |
| `role_key` | text, nullable | Clave en `data/roles/roles.json`. Nula hasta empezar |
| `faction` | text, nullable | |
| `status` | enum `player_status` | `alive`, `dead`, `disconnected` |
| `death_reason` | text, nullable | |
| `died_at_seq` | integer, nullable | Secuencia del evento de muerte |
| `reconnect_token_hash` | text | Hash SHA-256 del token. El token nunca se guarda en claro |
| `connected` | boolean | |
| `joined_at`, `left_at` | timestamptz | |

### `events`
Registro de todo lo que pasa en la partida, en orden. Es la fuente de verdad del estado.

| Columna | Tipo | Notas |
|---|---|---|
| `match_id` | uuid, FK | |
| `seq` | integer | Número de secuencia dentro de la partida. Clave primaria junto con `match_id` |
| `type` | text | Tipo de evento (p. ej. `phase.started`, `vote.cast`, `chat.message`). Catálogo en `packages/engine` |
| `payload` | jsonb | Datos del evento. Esquema por tipo en `packages/shared` (Zod) |
| `visibility` | enum `visibility` | `public`, `mafia`, `dead`, `private` |
| `audience_player_id` | uuid, FK, nullable | Obligatorio si `visibility = 'private'` |
| `created_at` | timestamptz | |

Índice: `(match_id, visibility)`.

**Chat:** los mensajes son eventos de tipo `chat.message` con la visibilidad del canal. No hay tabla `messages` separada: así el filtrado por canal y el historial usan el mismo mecanismo que el resto de la partida.

### `snapshots`
Estado serializado cada N eventos, para reconectar sin reproducir la partida entera.

| Columna | Tipo | Notas |
|---|---|---|
| `match_id`, `seq` | PK compuesta | `seq` es el último evento incluido en el estado |
| `state` | jsonb | Estado del motor serializado |
| `created_at` | timestamptz | |

### `narrations`
Texto que se muestra en el registro de la partida, generado por Gemini o por plantilla.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint, PK identidad | |
| `match_id` | uuid, FK | |
| `event_seq` | integer, nullable | Evento al que se refiere |
| `text` | text | |
| `source` | enum `narration_source` | `gemini` o `template` |
| `model` | text, nullable | Modelo usado |
| `input_tokens`, `output_tokens` | integer, nullable | |
| `created_at` | timestamptz | |

### `ai_usage`
Consumo diario de Gemini, para limitar gasto y avisar a los admins.

| Columna | Tipo | Notas |
|---|---|---|
| `day` | date, PK | |
| `calls`, `errors` | integer | |
| `input_tokens`, `output_tokens` | bigint | |

### `push_subscriptions` (M5)
Una fila por dispositivo con la PWA instalada.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `match_player_id` | uuid, FK | Borrado en cascada |
| `endpoint` | text, único | |
| `p256dh`, `auth` | text | Claves de Web Push |
| `created_at`, `last_used_at` | timestamptz | |

## Relaciones

```
matches 1 ── * match_players
matches 1 ── * events 1 ── 0..1 match_players (audience, si es privado)
matches 1 ── * snapshots
matches 1 ── * narrations
match_players 1 ── * push_subscriptions
ai_usage: independiente (una fila por día)
```

## Reglas de integridad

- Un jugador solo existe dentro de una partida. Al borrar la partida, se borra todo lo asociado.
- Un evento privado siempre tiene destinatario (CHECK `events_private_needs_audience`).
- Solo puede haber una partida activa con el mismo código de sala.
- El asiento va de 1 a 15 (CHECK `match_players_seat_range`).

## Lo que no está resuelto todavía

- **Catálogo de eventos:** lista de tipos y su payload. Se define al implementar el motor (M1) y se fija en `packages/shared`.
- **Formato del snapshot:** versionado del estado para poder migrarlo si cambia el motor. Hoy solo se guarda `engine_version` en la partida.
- **Retención:** cuánto tiempo guardar partidas terminadas y cuándo borrarlas. Hay que decidirlo antes de producción.
- **Cuentas:** no existen en la fase 1. Cuando lleguen, `match_players` tendrá una referencia opcional a `users`.
- **Índices adicionales:** se añaden según las consultas reales que haga el servidor en M2.
- **Vistas de estadísticas:** fuera del MVP.
