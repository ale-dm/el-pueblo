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

## Supuestos

Estado de cada supuesto según la wiki de Town of Salem (ToS 1).

**Verificados**
- Empate en el veredicto de juicio = inocente, el día sigue (`Hanging (ToS)`).
- Tras un veredicto de inocente, la votación continúa con el tiempo que le quedaba (`Hanging (ToS)`). El servidor lo calcula en `application/timing.ts`; el motor no conoce el tiempo.
- Día 1: solo charla, sin votación ni juicios; después, noche 1 (`Phases`).
- El Jailor puede encarcelar el día 1 (ficha del Jailor).
- El Mayor puede revelarse el día 1 (logro "Reveal yourself as Mayor on day 1").
- El Jailor no puede ejecutar en la primera noche (ficha del Jailor). Corregido: el motor lo rechaza.

**Sin verificar (abiertos)**
- Empate en la votación de juicio = nadie va a juicio (`rules/voting.ts`).
- Quien no emite veredicto cuenta como inocente (`phases/machine.ts`).
- Desempate por asiento en el orden de las acciones nocturnas (`rules/priority.ts`).
- Chat público abierto para todos durante el juicio (`rules/chat.ts`).

**Pendiente de implementar**
- El Jailor que ejecuta a un Town pierde sus ejecuciones restantes (ficha del Jailor). `roles/town/jailor.ts` no lo implementa.
- Victoria 1 contra 1 (fuera del MVP).

## Comandos y eventos de la fase de la vista de juego

- `night.action.cancel`: cancela la acción de esta noche. Evento `night.action.cancelled`, visible para la Mafia si quien cancela es de la Mafia y privado en otro caso.
- `will.write`: escribe o cambia la última voluntad (máximo 300 caracteres, vacío la borra), solo mientras se vive. Evento `will.written`, privado. Al morir o ser ahorcado, `player.killed` y `player.hanged` llevan el testamento (`will`), salvo que el jugador haya sido limpiado.
- `night.action.submitted` lleva `mafiaTeam`: si quien actúa es de la Mafia, la decisión la ven los miembros vivos de la Mafia.
- Roles pasivos (`passive: true` en el handler): reciben su efecto cada noche sin elegir nada. Hoy solo la Psíquica.
- `night.action` admite `choice`: la elección de la habilidad (mensaje del Hypnotist, rol del Forger). Si la habilidad define `choices` y no llega una opción válida, se rechaza. `night.action.submitted` la guarda.
- `chat.send` canal `seance`: la sesión de Médium. Solo de noche, entre el Médium muerto y el vivo que eligió (dos eventos, con audiencia cada uno; el vivo ve al Médium como "Médium").
- Habilidades `deadOnly` (Medium): solo las usa un jugador muerto, y los vivos no las ven ni pueden elegirlas. No crean visitas.
- Evento `hypnosis.message` (privado al objetivo, al terminar la noche), `will.forged` (privado al Forger; el rol falso aparece en `player.killed` y `player.hanged`) y `role.promoted` (visible a la Mafia viva).
- Ascenso: `phases/promotion.ts`. Si no queda ningún Godfather ni Mafioso vivo, el Mafioso de apoyo vivo con menor asiento pasa a Mafioso. Se comprueba al final de la noche (`night.resolved`) y al ahorcar a alguien.
- Retributionist: la resurrección es la marca `zombied` del zombi; el zombi no puede volver a usarse.
