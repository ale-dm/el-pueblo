# El Pueblo — Game Design Document (fase 1: Mafia)

Estado: **borrador de decisiones**. Lo marcado como *(propuesta)* necesita confirmación; lo marcado como *(verificado)* viene de la wiki de Town of Salem o de npm.

## 1. Visión y alcance

Juego social tipo Town of Salem para 10–15 jugadores, jugado con amigos desde el navegador, instalable como PWA en Android e iPhone.

**Dentro de la fase 1**
- Solo facción Mafia contra Town. Los roles Neutral y Coven existen en `data/` como referencia, sin implementar.
- Partida síncrona: todos conectados a la vez, fases de segundos o minutos.
- Entrada con nick y código de sala. Sin cuentas.
- Narración con Gemini; las reglas las decide el motor, no la IA.
- Configuración de sala: roles activos, duración de fases, modo de facción y reglas extra.
- Idioma: español.
- Distribución: solo amigos, por enlace a la PWA.

**Fuera de la fase 1**
- Coven, Vampires, Neutral, Lobos, Rainbow, Town Traitor, Dracula's Palace.
- Cuentas, progresión y tienda.
- Versión nativa en App Store o Google Play.

## 2. Stack (decisión)

| Capa | Elección | Versión verificada en npm |
|---|---|---|
| Lenguaje | TypeScript | typescript 7.0.2 *(verificar compatibilidad con tsx y vitest al instalar)* |
| Front | React + Vite + TypeScript | react 19.3.0, vite 8.3.4, @vitejs/plugin-react 6.1.2 |
| PWA | vite-plugin-pwa + workbox-window | vite-plugin-pwa 2.0.0 (peer `vite ^8`), workbox-window 7.4.1 |
| Estilos | Tailwind CSS v4 | tailwindcss 4.3.3, @tailwindcss/vite 4.3.3 |
| Animación | Motion | motion 14.0.0 |
| Servidor | Node + Fastify + Socket.IO | fastify 5.12.5, socket.io 4.8.4 |
| Monorepo | pnpm workspaces | pnpm 12.10.1 |
| Hosting front | NAS propio (`xelements.es`), servido por Nginx Proxy Manager en `pueblo.xelements.es` | — |
| Hosting servidor | NAS propio (Intel i3-13100), Docker vía Portainer, 24/7 | — |
| Base de datos | PostgreSQL con drizzle-orm y postgres.js | drizzle-orm 0.45.4, postgres 3.4.9, drizzle-kit 0.31.11 (dev) |
| Hosting base de datos | PostgreSQL en contenedor en el mismo NAS | — |

Estructura del monorepo:

```
apps/web       React + Vite + PWA
apps/server    Fastify + Socket.IO + Gemini + Web Push
packages/engine  Motor de reglas (TypeScript puro, sin I/O)
packages/shared  Tipos, esquemas Zod y nombres de eventos de Socket.IO
data/          Datos de la wiki (roles, imágenes, fases)
docs/          Este documento
```

## 3. Librerías

### Frontend (`apps/web`)

| Librería | Versión | Uso | Motivo |
|---|---|---|---|
| vite-plugin-pwa | 2.0.0 | Manifiesto, service worker, caché | Integra Workbox sin configurarlo a mano |
| workbox-window | 7.4.1 | Avisar de nueva versión | Requerido por el plugin |
| zustand | 5.0.15 | Estado de la sala en el cliente | Mínimo boilerplate; el servidor es la fuente de verdad |
| socket.io-client | 4.8.4 | Conexión en tiempo real | Mismo protocolo que el servidor |
| motion | 14.0.0 | Transiciones día/noche, cartas, votos | Animación declarativa en React |
| howler | 2.2.4 | Efectos de sonido | Soporte de audio en móvil |
| canvas-confetti | 1.9.4 | Celebración de victoria | Ligera, sin dependencias |
| lottie-react | 3.1.2 | Animaciones Lottie opcionales | Para iconos animados si los hay |
| sonner | 2.0.8 | Notificaciones | Bonitas por defecto |
| lucide-react | 1.53.0 | Iconos base | Consistentes; los de rol serán ilustraciones propias |
| react-router | 8.4.0 | Rutas: inicio, sala, partida | Standard de React |
| idb-keyval | 6.3.0 | Guardar el token de reconexión | Sobrevive a recargas y suspensiones del móvil |
| zod | 4.6.5 | Validar formularios de sala | Mismos esquemas que el servidor, vía `packages/shared` |

### Backend (`apps/server`)

| Librería | Versión | Uso | Motivo |
|---|---|---|---|
| fastify | 5.12.5 | HTTP y servidor | Rápido, tipado, con logs pino incluidos |
| socket.io | 4.8.4 | Tiempo real | Rooms, reconexión y fallback a polling |
| @fastify/cors | 11.3.1 | CORS para la PWA | Front y servidor en dominios distintos |
| @fastify/helmet | 13.1.2 | Cabeceras de seguridad | Configuración por defecto razonable |
| @fastify/rate-limit | 11.2.1 | Límite al crear salas y enviar chat | Evita abuso y gasto de Gemini |
| zod | 4.6.5 | Validar cada evento entrante | Un evento mal formado no llega al motor |
| drizzle-orm | 0.45.4 | Acceso a Postgres y tipos de tablas | Esquema tipado y migraciones con drizzle-kit |
| postgres (postgres.js) | 3.4.9 | Driver de Postgres | Driver que usa drizzle-orm en su adaptador |
| pino | 10.4.0 | Logs | Ya viene con Fastify |
| web-push | 3.6.7 | Notificaciones Web Push (VAPID) | Único camino para push en PWA |
| @google/genai | 2.28.0 | Narración con Gemini | Mismo SDK que `bot-discord`; el bot usa `^2.24.0`, conviene alinear |
| nanoid | 6.0.2 | Códigos de sala y tokens de jugador | Aleatorio y compacto |

### Motor y compartido (`packages/engine`, `packages/shared`)

| Librería | Versión | Uso |
|---|---|---|
| zod | 4.6.5 | Esquemas de eventos compartidos |
| vitest | 5.0.3 | Tests del motor: partidas simuladas, condiciones de victoria |

### Desarrollo y calidad

| Herramienta | Versión | Uso |
|---|---|---|
| tsx | 4.23.15 | Ejecutar TypeScript en el servidor en desarrollo |
| @types/node | 26.6.4 | Tipos de Node |
| eslint | 10.12.0 | Lint (igual que `bot-discord`) |
| prettier | 3.9.9 | Formato (igual que `bot-discord`) |
| @playwright/test | 1.64.0 | Pruebas end-to-end de la PWA. El entorno ya tiene Chromium |
| turbo | 2.11.7 | Opcional, para cachear builds y tests del monorepo |
| pino-pretty | 13.2.0 | Logs legibles en desarrollo |

### Descartadas

- **Colyseus:** su sincronización de estado compartido no encaja con roles ocultos.
- **Next.js:** SSR no aporta nada aquí, y los plugins PWA para Next están poco mantenidos.
- **Expo / React Native:** la PWA no lo necesita.
- **Phaser / PixiJS:** excesivo para cartas y chat. Solo se consideraría para una escena animada concreta.
- **Redux y React Query:** el estado llega por Socket.IO; no hace falta caché de peticiones.
- **react-hot-toast:** sirve, pero sonner da el mismo resultado con menos código.
- **Firebase / Supabase:** la lógica y los timers quedarían fuera del servidor controlado.
- **framer-motion:** el paquete se llama ahora `motion`.

## 4. Arquitectura

- **Servidor autoritativo.** El cliente envía intenciones (votar, actuar de noche, escribir en el chat). El servidor valida con el motor y emite eventos.
- **Información oculta.** Cada jugador recibe solo lo que puede ver. Los roles se envían por mensaje privado, no en un estado compartido.
- **Timers en el servidor.** Cada fase tiene un temporizador del servidor. Si un cliente se queda sin conexión, la fase sigue.
- **Reconexión.** Al entrar, el cliente guarda un token de jugador en IndexedDB. Al volver a la app, reconecta con el token y el servidor le envía el estado actual.
- **Motor puro.** `packages/engine` recibe `(estado, acción) → (nuevo estado, eventos)`. No accede a red ni a reloj: el tiempo entra como parámetro. Estructura y decisiones en `docs/ENGINE.md`; arquitectura de la aplicación en `docs/ARCHITECTURE.md`.
- **Narración asíncrona.** El motor produce eventos resueltos. Gemini los convierte en texto en segundo plano. Si la IA tarda o falla, la fase no se bloquea y se usa una plantilla fija.
- **Push.** El servidor envía Web Push a los jugadores cuando empieza la noche o el día, si la PWA está instalada.
- **Persistencia por eventos.** Cada evento del motor se guarda en `events` (solo escritura). El estado se reconstruye reproduciendo los eventos desde el último snapshot. Así una partida sobrevive a un reinicio del servidor y queda registro completo para estadísticas y depuración.
- **Snapshots.** Cada N eventos se guarda el estado serializado en `snapshots`, para no reproducir partidas enteras al reconectar.

### 4.1 Tablas de persistencia (fase 1)

| Tabla | Contenido |
|---|---|
| `matches` | Código de sala, configuración, fechas de inicio y fin, estado, facción ganadora |
| `match_players` | Jugador, nick, rol, facción, estado final, token de reconexión |
| `events` | Partida, secuencia, tipo, carga (JSON), visibilidad (público, Mafia, muertos, privado) |
| `snapshots` | Partida, secuencia, estado serializado |
| `messages` | Partida, canal, emisor, texto, fecha |
| `push_subscriptions` | Suscripción de Web Push por jugador (M5) |

Los datos de roles y configuración estática siguen en `data/`, no en la base de datos.

## 5. Reglas del modo Mafia

### 5.1 Jugadores y configuración

- Jugadores: 10–15. *(propuesta: mínimo 10; el modo Classic arranca automáticamente con 15 — confirmar)*
- Reparto de facciones *(propuesta)*:

| Jugadores | Mafia | Town |
|---|---|---|
| 10 | 3 | 7 |
| 12 | 3 | 9 |
| 15 | 4 | 11 |

- Límite de Mafia: 4 *(verificado: reglas del modo Custom)*.
- La sala se configura al crearla: roles activos, duración de fases, modo de facción y reglas extra.

### 5.2 Roles MVP *(propuesta, a confirmar)*

**Town:** Sheriff, Investigator, Lookout, Doctor, Jailor, Medium.
**Mafia:** Godfather, Mafioso, Consigliere.
Relleno de Town como *Random Town* cuando hay más huecos que roles.

Las prioridades, objetivos y habilidades de cada rol están en `data/roles/roles.json`.

### 5.3 Fases *(verificado: tabla de fases de la wiki, modo estándar)*

| Fase | Duración | Notas |
|---|---|---|
| Día 1 | 15 s | Solo en el primer día |
| Discusión | 45 s | Hablan los vivos |
| Votación | 30 s | Se vota a quién llevar a juicio |
| Defensa | 20 s | Solo si hay juicio |
| Juicio | 20 s | Votación de culpable o inocente |
| Últimas palabras | 7 s | Solo si el condenado es ahorcado |
| Noche | 37 s | Acciones de roles; la Mafia tiene chat privado |

Rapid y Fast Mode están en `data/game_config.json`.

### 5.4 Votación *(verificado)*

- Un juicio requiere mayoría simple: `ceil(vivos / 2)` votos. Con 15 vivos, 8 votos.
- Máximo 3 juicios por día. El tercero termina el día.
- Un Marshal puede convocar un Tribunal de 60 s, sin Defensa ni Juicio.
- Los jugadores desconectados cuentan como muertos en la votación.

### 5.5 Condiciones de victoria *(verificado: página Victory (ToS))*

- **Town gana** cuando no queda ningún miembro vivo de Mafia (ni de otras facciones que deban morir).
- **Mafia gana** cuando no queda ningún Town vivo.
- **Empate:** pendiente de definir. Con solo Town y Mafia no debería darse, pero conviene decidir qué pasa si el último Día y la última Noche terminan sin ganador.
- **Reglas 1 contra 1** (Tavern Keeper, Jailor sin ejecuciones, Godfather): pendientes para una iteración posterior. El MVP usa la regla general.

### 5.6 Chat

| Canal | Quién lo ve | Cuándo |
|---|---|---|
| Público | Vivos | Discusión, Juicio, Últimas palabras |
| Mafia | Mafia viva | Noche |
| Muertos | Muertos | Siempre |

El servidor filtra los mensajes por canal. Los susurros quedan para una iteración posterior.

## 6. Narrador (Gemini)

- Entrada: lista de eventos ya resueltos (muertes, protecciones, investigaciones, votos, juicios).
- Salida: texto breve en español, en el tono del juego.
- Gemini nunca decide reglas, muertes ni roles.
- Modelo y clave: en el servidor, variables de entorno.
- Cuota: si Gemini responde con error de cuota, la narración pasa a plantillas fijas. Se avisa al admin de la sala.
- Coste: la narración se genera en segundo plano y tiene límite de tokens por evento.

## 7. Estilo visual

- **Caricatura:** bordes gruesos, sombras desplazadas, colores saturados y animaciones con rebote.
- **Tipografía:** Google Fonts tipo cómic, por ejemplo Luckiest Guy o Fredoka.
- **Ilustraciones de roles:** generadas con la API de imágenes de Gemini, con un estilo propio y consistente. No se usa el arte de Town of Salem.
- **Escena:** cielo que cambia entre día y noche, con luna en la fase de noche.
- **Sonido:** efectos cortos con Howler; sin música en la primera versión.

## 8. Datos

- `data/catalog/` — catálogo de juego que se carga en PostgreSQL al desplegar (roles, facciones, alineamientos, fases, modos, modificadores, imágenes). Ver `docs/DATABASE.md`.
- `data/roles/roles.json` — 49 roles, con las clases de la wiki en `alignment`.
- `data/roles/img/` — iconos y skins de referencia. **No se usan en la app final** por copyright; sirven como guía de composición.
- `data/game_config.json` — fases, votos y modos.
- `data/reference/` — textos de la wiki para consulta.
- `data/source/wiki_raw.json` — snapshot crudo de la API.

Licencia: el contenido de Fandom suele ser CC-BY-SA; hay que confirmarla en la wiki. Nombres y arte de Town of Salem son propiedad de sus creadores. Para amigos en privado el riesgo es bajo; para publicar, sustituir nombres y arte.

## 9. Hoja de ruta

| Hito | Contenido | Criterio de salida |
|---|---|---|
| M0 | Este documento | Revisado y aprobado |
| M1 | `packages/engine`: fases, votos, roles MVP, victoria | Tests de partidas simuladas en verde |
| M2 | `apps/server`: salas por código, Socket.IO, reconexión, timers, Postgres (esquema, eventos y snapshots) | Dos clientes juegan una partida completa y la partida se recupera tras reiniciar el servidor |
| M3 | `apps/web`: lobby, noche, día, votación, chat, PWA instalable | Partida completa desde el móvil |
| M4 | Narración con Gemini y plantillas de respaldo | Narración en vivo sin bloquear fases |
| M5 | Web Push, más roles, ajustes de sala avanzados | Notificaciones recibidas con la PWA instalada |

## 10. Preguntas abiertas

1. ¿Confirmas el reparto de roles MVP de la sección 5.2?
2. ¿Confirmas el reparto de facciones por número de jugadores de la sección 5.1?
3. ¿El mínimo de jugadores es 10 o 8?
4. ¿Las reglas 1 contra 1 entran en el MVP o en una iteración posterior?
