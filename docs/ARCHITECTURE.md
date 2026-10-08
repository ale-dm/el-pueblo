# Arquitectura de la aplicación

## Decisión

- **Servidor: arquitectura hexagonal (puertos y adaptadores).** El motor (`packages/engine`) es el núcleo de dominio. Alrededor, una capa de aplicación con casos de uso y puertos, y adaptadores para cada tecnología externa.
- **Web: carpetas por funcionalidad y un único canal de tiempo real.** La UI solo muestra lo que el servidor le proyecta.
- **Una cola por partida.** Todos los comandos y temporizadores de una partida se procesan en serie.

## Capas del servidor

```
apps/server/src/
  composition.ts              Ensambla casos de uso con sus adaptadores (único sitio que los conoce)
  application/                Casos de uso y puertos. No importa nada de infraestructura.
    ports.ts                  Interfaces: MatchStore, PlayerStore, EventLog, Broadcaster, CatalogSource, Clock, IdGenerator, Security
    errors.ts                 AppError con código estable
    limits.ts                 Límites de sala (15 jugadores máximo, nick de 24 caracteres...)
    concurrency/keyedQueue.ts Serializa tareas por clave (una partida = una clave)
    state/initialState.ts     Estado inicial del motor a partir del registro de la partida
    use-cases/                createRoom, joinRoom, submitCommand, reconnect
  adapters/
    outbound/memory/          Implementaciones en memoria de todos los puertos (tests y desarrollo)
    outbound/catalog-json/    CatalogSource que lee data/catalog/*.json
    outbound/postgres/        (M2) Repositorios y EventLog sobre PostgreSQL. Ya existen schema, seed y migrate
    outbound/socket-io/       (M2) Broadcaster y entrada de comandos por Socket.IO
    outbound/gemini/          (M4) Narrador con respaldo a plantillas
    outbound/web-push/        (M5) Notificaciones
    outbound/crypto/          (M2) IdGenerator y Security con node:crypto
```

**Regla de dependencia:** `application/` puede importar `@el-pueblo/engine` y sus propios puertos. Nunca importa de `adapters/`, de `node:` para E/S, ni de librerías de base de datos, red o IA. Los adaptadores dependen de los puertos, no al revés.

## Puertos

| Puerto | Responsabilidad | Adaptador actual |
|---|---|---|
| `MatchStore` | Partidas: insertar, buscar por id o por código de sala activo, actualizar | memory (postgres en M2) |
| `PlayerStore` | Jugadores de una partida y búsqueda por hash de token | memory (postgres en M2) |
| `EventLog` | Leer eventos y añadirlos con control de concurrencia (último `seq` esperado) | memory (postgres en M2) |
| `Broadcaster` | Entregar eventos a los clientes, proyectados por jugador | memory (socket-io en M2) |
| `CatalogSource` | Cargar el catálogo de juego | catalog-json |
| `Clock` | Tiempo actual | memory (fijo en tests) |
| `IdGenerator` | UUID y códigos de sala | memory (crypto en M2) |
| `Security` | Tokens, hash de tokens y semillas de partida | memory (crypto en M2) |

Pendientes: `Scheduler` (temporizadores de fase, M2) y `Narrator` (M4).

## Flujos de los casos de uso

- **createRoom:** crea la partida en `lobby` con semilla propia, y añade al host en el asiento 1. Devuelve el token de reconexión una sola vez.
- **joinRoom:** solo en `lobby`, con nick único (sin distinguir mayúsculas), y hasta 15 jugadores. Asigna el primer asiento libre.
- **submitCommand:** dentro de la cola de la partida:
  1. Autentica al jugador por el hash de su token, dentro de esa partida.
  2. Reconstruye el estado con `replay` desde el registro de eventos.
  3. Llama a `decide` con el catálogo y un `Rng` determinista (semilla de la partida + último `seq`). Así la misma secuencia de comandos da siempre el mismo resultado.
  4. Añade los eventos con `EventLog.append`, que falla si alguien escribió antes (control optimista).
  5. Publica los eventos con `Broadcaster`, que los proyecta por jugador.
- **reconnect:** valida el token, marca al jugador como conectado y devuelve solo los eventos que puede ver (`projectFor`).

## Errores

`AppError` con código estable: `not_found`, `forbidden`, `invalid_input`, `invalid_state`, `conflict` y `engine_rejected`. El servidor traduce el código a la respuesta de Socket.IO o HTTP. Las reglas del juego nunca lanzan excepciones: el motor devuelve `Result`, y el caso de uso lo convierte en `engine_rejected`.

## Por qué hexagonal aquí

- Los casos de uso se testean sin base de datos ni red, con los adaptadores en memoria.
- Cambiar PostgreSQL por otra base, o Socket.IO por otro transporte, toca un solo adaptador.
- Gemini queda aislado: si falla o cambia su API, el resto no se entera.

**Lo que no se usa:** repositorios genéricos, DTO por cada capa, o un bus de eventos de dominio. Con 15 jugadores por partida, una llamada directa basta.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Monolito sin puertos | Acopla el juego a Socket.IO y a PostgreSQL. Los tests dependen de la base de datos |
| Microservicios | Overhead de red y despliegue sin ninguna necesidad en un servidor de un NAS |
| Durable Objects como única arquitectura | Buena para una sala = un objeto, pero ata el código al runtime de Cloudflare. Con hexagonal sigue siendo una opción de adaptador |

## Web

```
apps/web/src/
  app/              Rutas, providers y PWA
  features/         lobby/, night/, day/, vote/, chat/, role-card/
  shared/           Componentes de dibujo (cartas, botones, animaciones)
  realtime/         El único módulo que habla con Socket.IO. Alimenta el store
  state/            Store (Zustand) alimentado solo por realtime/
```

La UI no decide reglas. Solo renderiza los eventos proyectados que llegan del servidor.

## Pendiente

- Build del servidor: hoy importa el motor desde su código fuente TypeScript. Antes del despliegue hay que compilar o ejecutar con `tsx`. Decidir en M2.
- Temporizadores de fase: `Scheduler` con cancelación, sobre la misma cola de la partida.
- Snapshots: `EventLog.read` devuelve todo el historial. Se sustituye por lectura desde el último snapshot cuando las partidas sean largas.

## Estado

| Hito | Estado | Verificado |
|---|---|---|
| M1 motor Mafia (30 roles, noche, juicio, victoria) | Hecho | 85 tests, 300 partidas simuladas |
| M2 servidor (PostgreSQL, Socket.IO, temporizadores) | Hecho | Contra PostgreSQL 16 real: 10 jugadores, roles privados, chat, temporizador real, reconexión, recuperación tras reinicio |
| M3 web (PWA, pantallas, juego) | Hecho | 10 navegadores reales en una partida; build de PWA con service worker |
| M4 narración (Gemini con respaldo) | Hecho, Gemini **sin probar contra la API** | Tests con modelo simulado; sin clave real en este entorno |
| M5 avisos Web Push | Hecho, **sin entrega real** | Tests con envío simulado; falta probar con navegadores reales y VAPID |

**Pendiente en fase 1:** probar Gemini y los avisos con claves reales; probar la instalación en un iPhone (iOS 16.4 o superior, PWA en pantalla de inicio); decidir la política de retención de partidas; el límite diario de Gemini (`ai_usage`) aún no se aplica.

**Movido:** el código de base de datos vive en `adapters/outbound/postgres/`. El contenedor ejecuta TypeScript con `tsx` y compila la web en la imagen.

