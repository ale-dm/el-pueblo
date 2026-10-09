# Motor del juego (`packages/engine`)

Arquitectura, estructura de carpetas y reglas de dependencia del motor. La arquitectura de la aplicación (servidor y web) está en `docs/ARCHITECTURE.md`. La checklist de implementación está en `docs/CHECKLIST.md` §1.

## Arquitectura elegida

**Núcleo funcional con reducer por eventos, un manejador por rol y una máquina de fases explícita.**

```
          comando ──► decide(estado, comando, ctx) ──► eventos ──► apply(estado, evento) ──► estado nuevo
                          │                                              │
                 catálogo (parámetro)                          replay(snapshot + eventos)
                 rng inyectado (semilla)
                 reloj inyectado (now)
```

Principios, que el código ya cumple:

1. **Funciones puras.** Ninguna función del motor hace I/O, lee el reloj ni usa `Math.random`. El azar entra con `Rng` (semilla), el tiempo con `now`.
2. **El catálogo es un parámetro.** El motor no consulta la base de datos. El servidor lo carga al arrancar (ver `docs/DATABASE.md`).
3. **Los eventos son la verdad.** El estado se deriva con `apply`. Un snapshot es solo una optimización de `replay`.
4. **La visibilidad viaja en el evento.** Cada evento lleva `visibility` y `audiencePlayerId`, igual que la tabla `events`. La proyección por jugador (`projection/`) solo filtra.
5. **Un rol = un fichero.** Su habilidad, prioridades e interacciones viven en `roles/<bando>/<rol>.ts`. Cada interacción se cubre con un test.
6. **Resultados, no excepciones, para reglas.** Un comando inválido devuelve `Result` con código de error. Las excepciones quedan para bugs del propio motor.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Clase por rol con herencia y estado mutable | Difícil de testear por separado y de serializar. Las interacciones acaban en `if` cruzados |
| ECS (entidades, componentes, sistemas) | Pensado para simulaciones con muchas entidades. Aquí hay 15 jugadores y reglas de texto |
| Motor de reglas genérico (JSON-logic, reglas declarativas) | Las interacciones de ToS tienen excepciones que cuestan más de expresar que escribir en código |
| Máquina de estados con XState (actores) | Encaja bien con las fases. Lo dejo como opción para `phases/machine.ts` si la máquina crece; hoy es pequeña |
| CQRS con modelos de lectura separados | El proyector de visibilidad ya cubre la lectura por jugador. No hace falta una segunda base |

## Estructura de carpetas

```
packages/engine/
├── src/
│   ├── index.ts                 API pública (lo único que importa el servidor)
│   ├── types/                   Tipos puros: estado, eventos, comandos, catálogo
│   │   ├── ids.ts  factions.ts  phases.ts  state.ts
│   │   ├── events.ts            Catálogo de eventos y su payload (fuente de la tabla events)
│   │   ├── commands.ts          Intenciones de los jugadores
│   │   └── catalog.ts           Forma del catálogo cargado desde la BD
│   ├── core/                    Núcleo: decidir, aplicar, reproducir, azar
│   │   ├── decide.ts            (estado, comando) → eventos
│   │   ├── apply.ts             (estado, evento) → estado
│   │   ├── replay.ts            Reconstrucción desde snapshot + eventos
│   │   ├── rng.ts               Azar con semilla (mulberry32)
│   │   └── result.ts            Resultado y errores de reglas
│   ├── phases/                  Máquina de fases y lo que pasa en cada una
│   │   ├── machine.ts           Transiciones entre fases
│   │   ├── timers.ts            Plazos según el modo
│   │   ├── day/trial.ts         Defensa, juicio y últimas palabras
│   │   └── night/resolve.ts     Resolución nocturna por prioridad
│   ├── setup/                   Preparar la partida
│   │   ├── validateConfig.ts    Reglas del host (Custom)
│   │   ├── roleList.ts          Lista de roles (Classic, Custom, All Any)
│   │   └── assignRoles.ts       Reparto aleatorio con rng
│   ├── rules/                   Reglas transversales (sin conocer roles concretos)
│   │   ├── voting.ts            Votos necesarios y juicio  ✅ con tests
│   │   ├── victory.ts           Condiciones de victoria    ✅ con tests
│   │   ├── priority.ts          Orden de acciones           ✅ con tests
│   │   ├── death.ts             Muerte y última voluntad   (pendiente)
│   │   ├── attributes.ts        Inmunidades                (pendiente)
│   │   └── chat.ts              Canales de chat            (pendiente)
│   ├── projection/
│   │   └── visibility.ts        Qué ve cada jugador        ✅ con tests
│   ├── roles/                   Un fichero por rol del MVP
│   │   ├── types.ts             RoleHandler: habilidades, prioridades, interacciones
│   │   ├── registry.ts          Mapa clave → manejador
│   │   ├── mafia/               11 roles
│   │   └── town/                19 roles
│   └── narration/               Hechos para Gemini y plantillas de respaldo
│       ├── facts.ts
│       └── templates.ts
└── test/                        Un fichero por regla; ver "Tests" abajo
```

**Pendiente (fase posterior, no MVP):** `roles/neutral/` y `roles/coven/` con sus 19 roles de referencia, y los modificadores como `rules/modifiers/`.

## Reglas de dependencia

- `types/` no importa nada del motor.
- `core/` puede importar `types/`.
- `rules/` puede importar `types/` y `core/`. No conoce roles concretos.
- `roles/` puede importar `rules/` y `types/`.
- `phases/` y `setup/` pueden importar todo lo anterior.
- `projection/` y `narration/` no modifican el estado.
- **El motor nunca importa nada de `apps/`, de la base de datos, de red ni de Gemini.** El servidor es quien llama al motor.

Estas reglas se cumplen por convención hoy. Cuando haya código de M2, se pueden forzar con una regla de ESLint de límites entre módulos.

## Resolución de la noche (propuesta, pendiente de verificar)

Orden de resolución, por prioridad de `roles.priority` (menor primero), y desempate por asiento:

1. Bloqueos (Roleblock): anulan las acciones del bloqueado.
2. Protecciones y ataques: una protección anula el ataque sobre el mismo objetivo.
3. Información (Sheriff, Investigator, Consigliere...): se calcula sobre el estado resultante.

Lo confirmaré en `Abilities (ToS)` y en las páginas de cada rol antes de cerrar `phases/night/resolve.ts`.

## Transiciones de fase

Las transiciones las decide `phases/machine.ts` cuando vence el temporizador de la fase (`timer.expired`). Los tiempos vienen de `phase_timings` (ver `docs/GDD.md` §5.3).

| Fase actual | Siguiente | Notas |
|---|---|---|
| `day_1` | `night` (día 1) | Solo charla. No hay votación ni juicios el día 1 (wiki: Phases, "Day (Only on D1)") |
| `discussion` | `voting` | |
| `voting` | `defense` si hay candidato a juicio y quedan juicios; si no, `night` | Máximo 3 juicios por día. Al tercero, el día termina |
| `defense` | `judgement` | Solo habla el acusado |
| `judgement` | `last_words` si es condena; si no, `voting` (si quedan juicios) o `night` | Condena = más votos de culpable que de inocente. Empate = inocente |
| `last_words` | `night` | |
| `night` | `discussion` del día siguiente, o `ended` | Se resuelve la noche y después se comprueba la victoria |

Tras cada transición se comprueba la victoria (`rules/victory.ts`). Si la partida termina, no se programa ningún temporizador.

## Tests

| Fichero | Qué cubre |
|---|---|
| `rng.test.ts` | Semilla reproducible, límites, barajado sin mutar |
| `voting.test.ts` | Tabla de votos de la wiki, abstenciones, empate |
| `victory.test.ts` | Victoria de pueblo y mafia, jugadores desconectados |
| `visibility.test.ts` | Público, mafia viva, muertos, privado y orden de proyección |
| `replay.test.ts` | Snapshot sin repetir eventos |
| `roles-registry.test.ts` | Roles del MVP registrados, con su bando del catálogo |
| `setup.test.ts` | Reparto de roles, límites de jugadores y arranque en día 1 |
| `day.test.ts` | Votación, veredictos y habilidades de día |
| `night.test.ts` | Acciones nocturnas, bloqueos, protecciones e información |
| `phaseFlow.test.ts` | Transiciones de fase, incluido el día 1 sin votación |
| `simulation.test.ts` | Partidas con decisiones aleatorias legales hasta el final |
| `helpers/catalogSmoke.test.ts` | El catálogo carga y tiene todos los roles |

Estado actual: **12 ficheros, 89 tests en verde**, con TypeScript 7.0.2 y Vitest 5.0.3.

## Supuestos pendientes de verificar

- Desempate en la votación de juicio: el motor lo trata como "nadie va a juicio". La wiki solo lo menciona para el veredicto de inocente (`Hanging (ToS)`).
- Orden de resolución nocturna y desempate por asiento (ver arriba).
- Victoria 1 contra 1 (fuera del MVP).
