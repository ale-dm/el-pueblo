# Esquema de base de datos (PostgreSQL)

Fuente de verdad del esquema: `apps/server/src/adapters/outbound/postgres/schema.ts` (Drizzle).
Migraciones: `apps/server/drizzle/` — `0000` (partidas) y `0001` (catálogo y wiki).
Siembra del catálogo: `apps/server/src/adapters/outbound/postgres/seed.ts`, ejecutada al arrancar por `apps/server/src/adapters/outbound/postgres/migrate.ts`.

**Verificado:** esquema y seed compilan con TypeScript estricto, las migraciones se aplican sobre PGlite 0.5.8 (PostgreSQL en WebAssembly), la siembra es idempotente, y 5 restricciones rechazan datos inválidos. **No verificado todavía contra PostgreSQL 17 real.**

## Principio

- **Los datos de juego viven en `data/` (git) y se cargan en la BD al desplegar.** `data/` es la fuente de verdad: la BD es una copia de solo lectura para el runtime.
- **El motor no consulta la BD en cada acción.** El servidor carga el catálogo una vez al arrancar y lo pasa al motor como parámetro. El motor sigue siendo una función pura.
- **Partidas y estado sí viven en la BD**, como eventos (ver más abajo).

## Catálogo de juego (sembrado desde `data/`)

| Tabla | Origen | Contenido |
|---|---|---|
| `factions` | `data/catalog/factions.json` | Town, Mafia, Coven, Neutral, Werewolf. Condición de victoria |
| `alignments` | `data/catalog/alignments.json` | Las 12 categorías de rol de la wiki (Mafia Killing, Town Protective...) |
| `roles` | `data/catalog/roles.json` | 50 roles: prioridad, Attack/Defense, resumen, objetivo, habilidades, resultados de Sheriff/Investigator/Consigliere, iconos, registro completo (`raw`) |
| `role_attributes` | derivada de `roles` | Una fila por línea de atributos del rol (119 filas) |
| `role_interactions` | **a rellenar** | Interacciones entre roles, una por caso. Se rellena al implementar cada rol y sus tests |
| `phase_timings` | `data/catalog/phase_timings.json` | Duración de cada fase por modo (standard, rapid ToS 1, rapid ToS 2, fast mode) |
| `game_modes` | `data/catalog/game_modes.json` | Modos de Mafia: Classic, Ranked Practice, Ranked, Rapid, All Any, Custom |
| `host_rules` | `data/catalog/host_rules.json` | Reglas que el host debe cumplir en Custom (9) |
| `voting_thresholds` | `data/catalog/voting_thresholds.json` | Votos necesarios según vivos, de 3 a 15: `ceil(vivos / 2)` |
| `modifiers` | `data/catalog/modifiers.json` | 18 modificadores (página Modifiers de la wiki) |
| `wiki_images` | `data/catalog/wiki_images.json` | 2042 imágenes del alcance ToS 1, con URL, tamaño, páginas que las usan y fichero local si está en git |

Los campos `roles.implemented` y `role_interactions.status` los marca el desarrollo, no el seed. El seed nunca los sobrescribe.

## Wiki de referencia (volcado completo, solo lectura)

| Tabla | Contenido |
|---|---|
| `wiki_pages` | 1953 páginas del espacio principal: wikitext, categorías, fechas, redirección, etiqueta de versión y `in_scope` (216 páginas del alcance ToS 1) |

Las 1332 redirecciones quedan en la tabla con `is_redirect = true` y `redirect_target` rellenado.

## Partidas (runtime)

### `matches`
Una fila por partida. Código de sala único solo entre partidas activas (índice parcial). Guarda `engine_version`, necesario para reproducir eventos antiguos.

### `match_players`
Jugadores de una partida. Sin tabla de usuarios en la fase 1.
- `role_key` → `roles.key`, y `faction` → `factions.key`: claves foráneas.
- `reconnect_token_hash`: solo el hash SHA-256 del token.
- Asiento entre 1 y 15, único dentro de la partida.

### `events`
Registro en orden de todo lo que pasa. Es la fuente de verdad del estado.
- Clave primaria `(match_id, seq)`.
- `visibility`: `public`, `mafia`, `dead` o `private`. Si es `private`, `audience_player_id` es obligatorio (CHECK).
- Los mensajes de chat son eventos `chat.message`. No hay tabla de mensajes.
- **Pendiente:** `type` no tiene clave foránea todavía. El catálogo de tipos de evento se define en M1 y se añadirá entonces.

### `snapshots`
Estado serializado cada N eventos, para reconectar sin reproducir la partida entera.

### `narrations`
Texto generado por Gemini o plantilla, asociado a un evento.

## Uso e integraciones

| Tabla | Contenido |
|---|---|
| `ai_usage` | Consumo diario de Gemini: llamadas, tokens y errores |
| `push_subscriptions` | Suscripciones de Web Push por dispositivo (M5) |
| `catalog_meta` | SHA-256 de cada fuente sembrada (`catalog`, `wiki`). Evita resembrar si nada cambió |

## Siembra

1. `migrate.ts` aplica las migraciones pendientes.
2. `seedCatalog` calcula el SHA-256 de `data/catalog/*.json` y de `data/wiki/articles_all.ndjson.gz` + `text/index.json`.
3. Si coincide con `catalog_meta`, se salta. Si no, carga todo en una transacción con `upsert`.
4. Log: `[migrate] catálogo: sembrado catalog, wiki; sin cambios -` (o el equivalente al saltarse).

**Regenerar el catálogo:** `python3 data/catalog/scripts/build_catalog.py` desde la raíz del repo. Reproduce exactamente los mismos ficheros.

## Integridad (CHECK y claves)

- `events_private_needs_audience`: un evento privado siempre tiene destinatario.
- `match_players_seat_range`: asiento entre 1 y 15.
- `role_interactions_status_check`: estado válido.
- Índice único parcial: un código de sala solo puede estar en una partida activa.
- Claves foráneas de `roles` → `factions` y `alignments`, de `match_players` → `roles` y `factions`, y de `role_attributes` → `roles` con borrado en cascada.

## Lo que no está resuelto

- **Catálogo de eventos** (`events.type`): se define en M1 y se fija en `packages/shared`.
- **Versionado del snapshot**: hoy solo se guarda `engine_version` en la partida.
- **Retención** de partidas terminadas: pendiente de decidir antes de producción.
- **Cuentas**: no existen en la fase 1.
- **Interacciones entre roles**: la tabla existe, pero se rellena al implementar cada rol.
- **Modificadores**: la página Modifiers mezcla ToS 1 y ToS 2 en los iconos. Hay que revisar cuáles son de ToS 1 antes de activarlos.
- **Índices adicionales**: se añaden según las consultas reales de M2.
