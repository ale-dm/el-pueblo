# Changelog — El Pueblo (fase 1: Mafia)

Seguimiento de los commits posteriores a `11b1e13`, el último commit que llegó a `main`. Fuente: `git log --oneline 11b1e13..HEAD`. El lote más reciente va arriba. Cada línea tiene el hash, una descripción corta y la decisión tomada, con la cita de la wiki cuando el commit la tiene. Las líneas sin decisión registrada van sin ella.

Agrupación: desde el lote 3, el mensaje del commit trae la letra del lote (D, E, F, G, H, I, K, L, N, M, P) y cada lote cierra con un commit `Docs: estado de los roles ... tras el lote N`. Los lotes 1 y 2 no están etiquetados en los mensajes: su agrupación es un supuesto por posición en el historial (lote 1 = primeros 20 commits; lote 2 = del 21 al 33, con el docs de fa4fecc). Ver `docs/ROLES_STATUS.md` para el detalle por ítem.


## Chat con avisos, Forger sin compañeros, plaza del primer día

- Chat: los avisos del sistema (votos, juicios, muertes) van en el mismo flujo que los mensajes en cualquier canal, en orden. El registro completo sigue en su pestaña para leerlo con calma.
- Forger: no puede elegir a un compañero de Mafia como objetivo (Forger.md:204). Si su única habilidad es falsificar, los compañeros no se pueden elegir.
- Mesa: un jugador muerto muestra su rol revelado, apagado. ✝ solo si no se sabe.
- Plaza del primer día y de la discusión: juicios posibles hoy y los votos que hacen falta para uno. Ya no queda vacía.
- Comprobado: `pnpm check` (engine 592, web 139, server 114); prueba de móvil 11 de 11; captura de chat y del primer día.
- Pendiente: el filtro del Forger no tiene prueba automática (la lógica está en la pantalla, no en el motor); se comprobó leyendo el código.
- Verificado a continuación: el voto en escritorio (1366×768) y la ficha de rol en horizontal (844×390). El voto en horizontal no se pudo capturar: el script llegó tarde a la votación; el voto está cubierto en vertical por la prueba de móvil.

## Personajes por defecto en las cartas de los jugadores

- Qué: los personajes por defecto de la wiki (Avatars (ToS), "Default Skins") no son roles; son el aspecto de cada jugador. Cada asiento tiene el suyo (`lib/avatars.ts`, estable entre recargas). Se usan en la mesa del móvil (el centro de la casilla) y en la lista de escritorio (sustituye al círculo del asiento).
- El icono del rol, si se conoce, va en la esquina de la casilla. Los muertos van apagados con ✝.
- Imágenes: siete copias en `apps/web/public/avatars/`, tal cual están en la wiki. John Hathorne y Random Townie no estaban en el índice de imágenes; se sacaron de la ruta de MediaWiki.
- Pendiente: la licencia de este arte. La de la wiki es CC-BY-SA según `data/README.md`, y hay que confirmarla antes de publicar.
- Comprobado: `pnpm check` (engine 592, web 141, server 114); prueba de móvil 11 de 11; capturas de móvil y escritorio.

## Partida atascada, chat y registro, roles al alcance

- Motor: el fin del encuadre (`effect.cleared`) salía como privado sin destinatario. La base de datos lo rechaza (`events_private_needs_audience`), así que la noche no cerraba y la partida se quedaba en "0 s". Ahora lo recibe el jugador encuadrado (`events/emit.ts`). Test de regresión en `packages/engine/test/night.test.ts`.
- La partida que se quedó atascada (sala LWP4FL) debe reanudar al desplegar; si no lo hace, no tiene arreglo y hay que empezar otra sala.
- Móvil: chat y registro, en su hoja, ocupan toda la altura (antes quedaba un hueco debajo).
- Votos solo durante la votación: la mesa y la lista no muestran "Tu voto" ni recuentos en la noche ni en el día siguiente.
- Pestaña Roles: todos los roles del MVP por grupo, sin marcar cuáles están en la partida. Tocar uno abre su ficha (grupo, descripción, ataque y defensa). El catálogo envía ataque y defensa en `rolePool`.
- Icono del rol en la cabecera: `.cartoon-btn` ganaba a `px-0` (está fuera de las capas de Tailwind) y el icono quedaba con 0 px de ancho. Ahora `!p-0`. Aviso: en esta app, las utilidades de relleno no se aplican sobre `cartoon-btn`.
- Comprobado: `pnpm check` (engine 592, web 139, server 114); prueba de móvil 11 de 11; capturas de móvil (chat, registro, ficha) y de escritorio.
- Pendiente: la ficha de rol en horizontal no está revisada; el catálogo solo incluye los roles del MVP.

## Despliegue: la PWA muestra la versión nueva sin dos recargas

- Síntoma: tras redesplegar, el móvil seguía con la versión anterior hasta la segunda recarga. Causa: el service worker
  nuevo se activaba sin tomar la página abierta (`clients.claim`), y nada recargaba la página.
- Arreglo: `sw.ts` toma las pestañas al activarse; `main.tsx` recarga una vez al cambiar el service worker que controla la página (solo si ya había uno al cargar).
- Probado en Chromium con dos builds: la versión anterior pasa a la corregida con una recarga automática (`controllerchange`). La versión anterior, que no tiene el arreglo, necesita dos recargas una sola vez.

## Diseño: móvil como la mesa de Wolvesville (referencia: juego principal)

- Referencia: las capturas oficiales de Wolvesville en la App Store (no Classic, que es de pasar el móvil). Lo que se toma: una cuadrícula de jugadores como mesa, una línea de estado, la acción abajo y el resto fuera de la pantalla. No se copia arte ni colores: se usan los iconos de rol que ya tenemos.
- Móvil (vertical y horizontal, `PHONE_QUERY` en `lib/useMediaQuery.ts`): cabecera con fase, temporizador y dos botones (tu rol, chat y registro). En medio, la mesa (`game/Table.tsx`): una casilla por jugador con número, nombre, rol si se conoce, Mafia, acusado, tu voto, objetivo y votos. Abajo, la línea de estado y la acción (`ActionDock` en línea). Rol y chat van en hojas (`game/Sheet.tsx`).
- Horizontal en móvil: mesa a la izquierda (5 columnas), estado y acción a la derecha.
- Escritorio: sin cambios de distribución. Se quitan las clases `short-*`, los `order-*` y la hoja de estilos de horizontal, que ya no hacían falta: el móvil tiene su propia disposición.
- Prueba de móvil: el chat se abre desde su botón y la votación dice "Toca a alguien para votarle".
- Más contenido en móvil: la plaza (frase de la fase, recuento de votos con el umbral, acusado, muertos y juicio) va debajo de la mesa, en panel fijo; en horizontal, a la derecha, con la acción abajo. Las casillas de la mesa reparten la altura que queda, así no hay hueco vacío.
- Las pistas de habilidad dicen "Elige a alguien" (sin "en la lista"), que en móvil la lista es la mesa.
- Pendiente: la hoja de rol en horizontal muestra poco texto; la mesa no separa vivos y muertos (los muertos van apagados y con ✝); el registro de sucesos sigue solo en la hoja de chat.
- Comprobado: `pnpm check` (engine 591, web 139, server 114); prueba de móvil 11 de 11; capturas de móvil 390×844, horizontal 844×390 y escritorio 1366×768 con un jugador de la Mafia, sin desbordes ni errores de consola.

## Diseño: séptima vuelta, Mafia ve a sus compañeros y votar en la lista

- Mafia: en la lista, cada compañero vivo muestra su rol y una etiqueta "Mafia". Lo ve solo otra Mafia: `getView` manda `allyRoleKey` solo al compañero de Mafia que mira (`apps/server/test/application/getView.test.ts`, prueba nueva). El muerto ya se veía con `revealedRoleKey`. También se ve en horizontal.
- Votación: se vota tocando a alguien en la lista; tocar al que ya tienes votado retira el voto (`vote` con `targetId: null`, que el motor ya registraba). Se quitan los botones "Votar" y "Abstenerse" (`voteCommand` en `apps/web/src/lib/quickAction.ts`). Abstenerse es no votar.
- Error corregido: lo elegido para un día (el Jailor encarcela en la discusión) se arrastraba a la votación y a la noche. Ahora lo elegido se limpia en cada fase.
- Roles: la pestaña "Roles" muestra todos los roles del MVP de cada grupo que hay en la partida (`rolePool` en la vista, público y fijo). Los que están en la partida van rellenos, con cuántos; los demás, apagados. Antes solo salían los de la partida.
- Carta del rol: se quita la ilustración grande del rol. Queda el icono pequeño.
- Horizontal: la descripción del rol se oculta (las habilidades dicen lo mismo) y el panel izquierdo tiene algo más de altura que el chat.
- Pendiente: en horizontal, el registro del chat se queda en una línea a 390 px de alto. Hace falta decidir si el chat se pliega en horizontal.
- Comprobado: `pnpm check` (engine 591, web 139, server 114); prueba de móvil 11 de 11 con los votos, el retirar y el juicio; capturas de escritorio 1366×768 y horizontal 844×390 con un jugador de la Mafia, sin desbordes ni errores de consola.

## Diseño: elegir desde la lista, acción abajo a la derecha, iconos de la wiki

- Los objetivos se eligen en la lista lateral (vivos), no en el tablero. El óvalo y las casas solo muestran; más pequeño, con el nombre de la fase en el centro (salvo de noche, donde ya dice "Cae la noche").
- La acción está en un botón redondo abajo a la derecha. Solo aparece en la fase en que se puede usar: noche (habilidad de noche), día (habilidad de día), votación y juicio. Al pulsarlo abre el panel de la acción con los objetivos ya elegidos.
- Cada acción lleva el icono de la wiki de su rol (`data/wiki/img/RoleIcon_*`). La wiki no tiene iconos por habilidad: todas las habilidades de un jugador son de su rol. Votar y juzgar siguen con emoji (no son habilidades de rol).
- La vista ya filtra las habilidades según vivo o muerto, así que el botón no necesita reglas propias por estado.
- Móvil: el botón va entre la lista y el chat, para no tapar el botón de enviar.
- Arreglos de la revisión: el círculo de la ruleta cabe dentro del borde; los botones desactivados se leen; las pestañas laterales no desbordan; la insignia "Mafia" ya no choca con el texto de la casa de al lado; la barra de abajo tiene etiquetas legibles y "Salir" aparte.
- Pruebas: web 128, `pnpm check` en verde; la prueba de móvil (11/11) recorre ahora la selección desde la lista y el botón de acción.
- Sin panel de acción: cada habilidad es un botón con el icono de su rol. Una habilidad con elección (mensaje del Hypnotist, rol del Forger) muestra las opciones junto al botón: botones, o una lista si son muchas. Votar y juzgar siguen con sus botones abajo a la derecha.
- Lo que se pierde al quitar el panel: escribir la nota de muerte al matar (la nota queda vacía; el autor la escribe en la mañana con la tarjeta de la Death Note) y el testamento falsificado (va vacío).
- Pendiente: los avatares siguen siendo letras (decisión de arte pendiente en la GDD); con diez jugadores, dos casas del óvalo se pisan.

## Diseño: distribución de pantalla como Town of Salem (escritorio)

- Proporciones tomadas de las capturas de referencia: izquierda 34 %, centro 43 %, derecha 23 % del ancho. Solo la distribución; el estilo, los iconos y las ilustraciones son los nuestros.
- Izquierda: cementerio y lista de roles lado a lado (44 % de la altura), y el chat a todo el ancho debajo. Cementerio nuevo (`game/Graveyard.tsx`).
- Centro: el óvalo ocupa el espacio disponible; sin tope de tamaño en escritorio.
- Derecha: carta del rol arriba (58 %), lista de vivos debajo (42 %). Los seis botones de la lista van en una fila de iconos.
- Cabecera de la fase más pequeña en escritorio.
- Móvil: el orden de siempre (`order-*`), comprobado con la prueba de móvil (11/11).
- Segunda vuelta: los jugadores son tarjetas (número, inicial, nombre y píldoras), no casas. En escritorio, el centro son las tarjetas y el óvalo queda solo en la sala de espera. El chat llega hasta abajo; la carta del rol y la lista de vivos suben hasta arriba.
- Tercera vuelta: aviso a pantalla completa cuando alguien va a juicio (tono rojo); avisos del sistema en la plaza con color (votos, juicios y muertes); barra de votos en cada tarjeta, en rojo al llegar al umbral, con quién ha votado en el tooltip; cabecera de fase más fina en escritorio; carta del rol al 36 % de la columna.
- Cuarta vuelta: panel de roles con píldoras pequeñas y todos a la vista; carta del rol compacta en escritorio (sin imagen, texto de 11 px) para que quepan alineamiento, objetivo, habilidades y atributos. Etiquetas de estado de las tarjetas: el fondo de color ya no se pierde.
- Quinta vuelta, móvil en horizontal (844×390): pestañas de rol arriba a la izquierda, carta del rol y chat debajo (con campo de escribir visible); pueblo al centro con nombres completos (dos columnas); lista de vivos a la derecha con pestañas y barra de iconos. El cementerio y los roles quedan en sus pestañas. Botones redondos y textos más pequeños en horizontal. Estilo propio, sin ilustraciones ni iconos de referencia.
- Sexta vuelta, sin duplicados: la lista de jugadores es la única superficie de selección y de estado (votos, acusado, tu voto y objetivo en cada fila). El centro es la plaza (fase, recuento de votos con el umbral, acusado en juicio, muertes de la mañana y vivos). Se quitan las tarjetas del centro, el cementerio fijo, el panel de roles fijo y la barra de iconos: sus datos están en las pestañas de rol y en la lista (Vivos/Muertos). El botón de salir pasa a la cabecera. Horizontal: texto base de 13 px.
- Pendiente: el mapa de fondo. No se copian las ilustraciones ni los iconos de ToS.

## Diseño: columna izquierda en escritorio

- El chat tiene una parte fija de la altura (36 % del viewport, tercera fila de la rejilla) y la carta del rol se queda con el resto. Antes, el chat quedaba en unas pocas líneas.
- Texto y espacios de la carta del rol más pequeños en escritorio; cabecera más compacta y botón de avisos en una línea. Se ve nombre, bando, alineamiento y objetivo sin desplazar.
- Revisado en 1280×720 y 1366×768. La carta sigue con desplazamiento para la descripción larga.

## Prueba de móvil (M3): una partida completa en un perfil de iPhone

- Qué: `apps/web/e2e/mobile-smoke.mjs`. Diez navegadores con el perfil de iPhone 13 (390 px, táctil) contra el servidor en marcha. Recorre sala, primer día (con la revelación del rol), chat público, discusión, los diez votos, el juicio y la noche.
- Resultado: 11 de 11 comprobaciones. Ninguna pantalla se sale por la derecha (0 px en las siete pantallas medidas) y no hay errores de consola.
- Lo que no cubre: un teléfono real, la Mafia y las acciones de noche de los roles, y las notificaciones push. La partida llega a la noche, no se juega más allá.
- Dos fallos del propio script corregidos en el camino: el diálogo "Tu rol" tapaba la pantalla hasta pulsar "Entrar al pueblo", y la espera del juicio empezaba tarde (la defensa y el juicio duran 20 s cada uno). Ninguno era de la aplicación.

## Exploración con criterio: 300 partidas de 10 humanos (azar, criterio y comunicado)

- Qué cambia: la exploración puede decidir votos, juicios, acciones de noche y de día con criterio (`EXPLORE_POLICY=criterio` o `comunicado`) en lugar de al azar. La política está en `apps/server/test/helpers/criterio.ts`. Solo ve lo que vería un jugador real: su rol y compañeros de Mafia, los votos y muertes públicos, sus propios resultados de investigación, a quién encarceló y el estado de su propia trampa. Chat, testamentos, Death Note y los comandos ilegales siguen al azar en todas las políticas, para la cobertura.
- Política `comunicado`: además, los investigadores declaran su resultado en el chat público (`Resultado: P3 es sospechoso`) y el Pueblo cree esas declaraciones. La Mafia no declara nada.
- Mismas 300 semillas (1001 a 1300) en las tres políticas. Sin bots en la mezcla.
- Comandos: `EXPLORE_POLICY=<azar|criterio|comunicado> EXPLORE_GAMES=300 EXPLORE_MIX=humanos EXPLORE_REPORT=<ruta>`. `EXPLORE_TRACE=<ruta>` vuelca el registro de la primera partida para leerla.

| | Azar | Criterio | Comunicado |
|---|---|---|---|
| Ganan Mafia | 184 (61 %) | 285 (95 %) | 280 (93 %) |
| Ganan Pueblo | 116 | 15 | 20 |
| Días (media / mediana) | 16,0 / 15 | 6,6 / 6 | 6,8 / 6 |
| Pasos (media) | 54 | 28 | 28 |
| Muertes (media) | 8,3 | 7,7 | 7,8 |
| Ejecuciones (media) | 0,7 | 2,4 | 2,2 |
| Votos del Pueblo (media) | 33,8 | 7,4 | 8,2 |
| Votos de la Mafia (media) | 17,0 | 10,8 | 10,1 |
| Abstenciones (media) | 12,8 | 8,8 | 9,0 |
| Anomalías | 0 | 0 | 0 |

- Lectura: con criterio las partidas son más cortas y hay más ejecuciones, pero la Mafia gana casi siempre. No es un efecto del motor sino de la política: la Mafia vota de forma coordinada (ve a sus compañeros) y mata a quien votó contra un compañero. El Pueblo se abstiene sin indicios y vota la mitad que la Mafia.
- Hipótesis descartada: pensaba que la causa era que el Pueblo no comparte información. Con declaraciones públicas (`comunicado`) el resultado apenas cambia (280 frente a 285 victorias de la Mafia). La causa está en otro sitio: no lo he medido todavía. Lo siguiente sería medir a quién ejecuta el Pueblo (cuántas ejecuciones son de la Mafia).
- Pendiente de la política, ya corregido: el Trapper ponía trampa con una ya puesta (494 rechazos con criterio). Ahora solo pone cuando su registro privado dice "ready"; con criterio ya no hay rechazos de trampa.
- Sin anomalías del motor en ninguna de las 900 partidas. Los rechazos que quedan con criterio vienen de la escritura al azar (testamentos y Death Note de muertos, fuera de ventana).

## Exploración de partidas completas (servidor)

- `apps/server/test/application/exploracion-partidas.test.ts`: partidas de diez jugadores con acciones aleatorias legales de todos los tipos (votos, juicios, chat en todos los canales, habilidades de noche y de día, cancelaciones, testamentos, Death Note) y una parte ilegal a propósito, que debe rechazarse con error de comando. Invariantes tras cada paso: secuencia de eventos contigua, los muertos no actúan (salvo la sesión de Médium), y el ganador coincide con los vivos (incluido el detector de empate de dos jugadores).
- Barrido de 600 partidas (300 con diez humanos, 300 con cinco humanos y cinco bots): 31.089 pasos, 0 anomalías. Ganan la Mafia en 343 y el pueblo en 257.
- Control: quitar la regla "los muertos no escriben su testamento" en el motor hace fallar el test (detecta el fallo).
- Hallazgos, sin cambiar código:
  - La tabla de jugadores no actualizaba `status` al morir. **Corregido** en la sección siguiente.
  - Un autor muerto podía cambiar su Death Note durante la mañana. **Prohibido** por decisión del usuario, en la sección siguiente.

## Tabla de jugadores y Death Note de un asesino muerto

- Commits: este lote (ver `git log`).
- Tests nuevos: `apps/server/test/application/roster-muertes.test.ts`
- Citas de la wiki: Death_Note_ToS.md:13, :17 (ambiguo sobre el autor muerto; decisión del usuario); Death_Note_ToS.md:5, 15.
- **Corrección 1: la tabla de jugadores registra las muertes.** `recordDeaths` (`apps/server/src/application/state/recordDeaths.ts`) pone `status: "dead"` y la causa a cada `player.killed` / `player.hanged`, tras cada lote que se añade al registro, en `submitCommand` y `advanceOnTimeout`. `initialState` empieza a todos vivos y sin causa: la reconstrucción ya no hereda el estado de la tabla, así que la recuperación tras reinicio no cambia. Invariante nueva en la exploración: la tabla y el registro tienen los mismos muertos en cada paso. Pruebas: `roster-muertes.test.ts` (2). Control: quitar la llamada en el temporizador hace fallar las dos; copiar el estado de la tabla en `initialState` hace fallar la de reinicio.
- **Corrección 2 (decisión del usuario: prohibido): un asesino muerto no cambia su Death Note.** `writeDeathNote` rechaza con "Un asesino muerto no puede cambiar su nota de muerte" (`packages/engine/src/phases/night/collect.ts`). La tarjeta de la web no se muestra a un muerto (`apps/web/src/game/DeathNoteCard.tsx`). En la exploración, un `death.note.write` de un muerto deja de ser observación: si el motor lo aceptara sería anomalía; el motor lo rechaza como error esperado. Pruebas: `death-note-edicion.test.ts` (+1, "un asesino muerto no cambia su nota").

## M2 (servidor): reinicio y recuperación de partidas

- Criterio del GDD §9: "la partida se recupera tras reiniciar el servidor". Verificado con dos tests: `apps/server/test/application/reinicio.test.ts` (almacenes en memoria) y `apps/server/test/adapters/postgres-reinicio.test.ts` (almacenes PostgreSQL sobre PGlite, con procesos nuevos encima de la misma base). En ambos, la vista del jugador tras el reinicio es idéntica a la de antes, el temporizador de fase se vuelve a programar y el avance de fase funciona.
- Mutación comprobada: quitar la reprogramación de `recoverTimers` hace fallar los dos tests.
- "Dos clientes juegan una partida completa" verificado con `apps/server/test/adapters/partida-dos-clientes.test.ts`: dos clientes humanos por Socket.IO real (anfitrión e invitado) y ocho bots en el servidor. Los humanos votan, juzgan, hablan y usan su habilidad de noche por socket (6 votos, 1 juicio, 7 acciones de noche y 2 mensajes aceptados, 0 rechazos). La partida termina, ambos clientes reciben `game.ended` con el mismo ganador, y cada cliente recibe solo su propio rol.
- Límite de esta prueba: los humanos no hacen todas las acciones posibles (por ejemplo, no usan habilidades de dos objetivos ni la Death Note), y la partida es determinista por los IDs secuenciales. No es una prueba de navegador.

## Posterior al lote 13: checklist y Médium en solo lectura

- `32cc34f` Checklist: marca lo verificado con tests y enlaza el estado por rol — **Decisión:** Sección 2 sin marcar (arte, iconos y narración pendientes); estado por rol en `docs/ROLES_STATUS.md`.
- `b7c2ce6` Medium: ve en solo lectura los canales de su sesión (Medium.md:201, 217-223) — **Decisión:** Medium.md:201 (encarcelado: oye a los muertos, solo lectura); Medium.md:217-219 (canal de la Mafia o de cárcel de su objetivo, solo lectura); Medium.md:223 (Ultratumba solo lectura durante la sesión).

## Promotion/Mafia

- `1e6d93c` ROLES_REVIEW: el Ambusher asciende según el grupo Mafia Killing — **Decisión:** El Ambusher asciende cuando no quedan Godfather ni Mafioso (Ambusher.md:228; grupo Mafia Killing de Mafia_Killing.md).
- `8056046` Ascenso de la Mafia según el grupo Mafia Killing (Mafia_Killing.md, Mafia_Support.md) — **Decisión:** Orden de ascenso: 1) Godfather muerto, asciende el Mafioso; 2) sin Godfather ni Mafioso, con Ambusher vivo, asciende el Ambusher; 3) mientras quede un Mafia Killing vivo, nadie más asciende (Mafia_Support.md); 4) si no queda ninguno, el Bootlegger ("the highest priority", Mafia_Killing.md) y, si no hay, el primero del lobby (Mafia_Support.md). Decisión de la wiki, revisable por el usuario.

## Lote 13 (P1 a P9)

- `3a2d688` Docs: estado de los roles tras el lote 13 (P1 a P9) *(docs)*
- `26c5a70` Spy: orden aleatorio de las visitas de la Mafia (P9) — **Decisión:** Spy.md:179 ("The order is randomized."): las casas visitadas por la Mafia salen en orden aleatorio, determinista por semilla.
- `69c2b67` Retributionist: el Vigilante zombi dispara con sus balas (P8) — **Decisión:** Retributionist.md:294-308 y :155: el zombi Vigilante dispara con sus balas; sin balas no hace nada; la culpa no le afecta.
- `751456c` Médium con cárcel, equipo y muertos: canales de sesión (P7) — **Decisión:** Medium.md:201, 217-219, 223; Jailor.md:266, 268: canales de sesión en el motor. Un Médium con un Mafioso como objetivo ve todo el canal de la Mafia. La web aún no lo mostraba (cerrado en b7c2ce6).
- `bbe8e60` Lookout: ve al Mafioso disfrazado como el disfraz (P6) — **Decisión:** Disguiser.md:207 y :161: el Lookout ve al Mafioso disfrazado como su disfraz. Excepción del propio Disguiser (Disguiser.md:215).
- `f3daf00` Ambusher: la visita pasiva no hiere con la trampa (P5) — **Decisión:** Ambusher.md:232 y :290; Trapper.md:256: la visita pasiva activa la trampa sin morir y no recibe el Poderoso. Desviación del plan (que decía lo contrario): se sigue la wiki.
- `b1bd6cd` Trapper: la trampa hiere al atacante solo si el objetivo es atacado (P4) — **Decisión:** Trapper.md:223; Keyword_System.md:349: el Poderoso y la defensa solo si el objetivo es atacado (decisión (b) abierta).
- `91513d4` Doctor: la autocuración no se redirige con el transporte (P3) — **Decisión:** Transporter.md:234: la autocuración del Doctor no se redirige al transportarlo; la curación a otro sí.
- `f8dda35` Transporter: no transporta a quien abandonó la partida (P2) — **Decisión:** Transporter.md:228: no transporta a quien abandonó la partida, sin aviso. Con encarcelado, gana el aviso de cárcel (Transporter.md:202; supuesto).
- `caccf1c` Transporter: dos transportes sobre el mismo objetivo (P1) — **Decisión:** Transporter.md:266-278 y :198: "izquierda" es el primer objetivo elegido (decisión (a) abierta).

## Lote 12 (M1 a M16)

- `1fb4a86` Docs: estado de los roles tras el lote 12 (M1 a M16) *(docs)*
- `ab5963c` Retributionist: icono de cuerpo usado junto al muerto (M16) — **Decisión:** Retributionist.md:204: icono de cuerpo usado junto al muerto (solo lo ve él).
- `058ca07` Medium: no se copian los mensajes de la sesión ni los propios del Ultratumba (M15) — **Decisión:** Medium.md:215, 197: no se copian mensajes de la sesión ni los propios del Ultratumba.
- `446565f` Medium: "A medium is talking to you!" se lee al empezar la noche (M14) — **Decisión:** Medium.md:209: "A medium is talking to you!" al empezar la noche.
- `73e10ee` Chat: silencio y susurro a un Mayor como mensajes de la wiki, no como errores (M13) — **Decisión:** Mayor.md:397, 401; Blackmailer.md:209, 211: silencio y susurro a un Mayor como mensajes de la wiki, no como errores.
- `2ce9d21` Spy: "Your target's target was attacked last night!" para Doctor y Crusader (M12) — **Decisión:** Spy.md:251, 481: "Your target's target was attacked last night!" para Doctor y Crusader.
- `3a34b38` Hypnotist: opciones de mensaje del MVP que faltaban (M11) — **Decisión:** Hypnotist.md:232, 238, 254, 256, 258: cinco opciones del MVP. SKIPPED: Hypnotist.md:224 (decisión (c) abierta).
- `3c698a6` Medium muerto: "You have opened a communication with the living!" al empezar la noche (M10) — **Decisión:** Medium.md:483: "You have opened a communication with the living!" al Médium muerto al empezar la noche.
- `098f8d6` Ambusher: nombre revelado a los visitantes y avisos de emboscada (M9) — **Decisión:** Ambusher.md:222; Messages_ToS.md:2109, 2117: nombre del Ambusher a los visitantes no Mafia y aviso de emboscada.
- `fb5970c` Mafioso: aviso de defensa cuando ejecuta la orden del Godfather (M8) — **Decisión:** Mafioso.md:235; Godfather.md:233: aviso de defensa al Mafioso que ejecuta la orden. Supuesto: la defensa del Bodyguard no da este aviso.
- `e7c490c` Corrige la prueba del Doctor tras el aviso de superviviente de la Mafia (M7) — **Decisión:** Corrige la prueba del Doctor (`mensajes-por-rol.test.ts`) tras el aviso de superviviente.
- `65c0d1b` Mafia: el superviviente de un ataque de la Mafia recibe su aviso (M7) — **Decisión:** Godfather.md:487; Mafioso.md:475; Mafia_Killing.md:13, 15: el superviviente de un ataque de la Mafia recibe su aviso. Se publicó con una prueba en rojo, corregida en e7c490c.
- `a8f1f3a` Jailor: el prisionero ejecutado recibe "You were executed by the Jailor!" (M6) — **Decisión:** Jailor.md:590: el prisionero ejecutado recibe "You were executed by the Jailor!".
- `a26e785` Contadores "te quedan N" para todas las habilidades con usos (M5) — **Decisión:** Contadores "te quedan N": Doctor.md:399, Janitor.md:390, Forger.md:488, Jailor.md:546. Medium no tiene contador (Medium.md sin "(#) left").
- `d058770` Doctor: aviso de atacado también en un ataque letal (M4) — **Decisión:** Doctor.md:249: el aviso de atacado también en un ataque letal.
- `1597b8a` Doctor: su defensa cuenta como "defense too strong" para cualquier atacante (M3) — **Decisión:** Doctor.md:269: la defensa de la curación cuenta como "defense too strong" para cualquier atacante.
- `fd46290` Crusader: avisos a los visitantes de su objetivo (M2) — **Decisión:** Crusader.md:330, 336: avisos a los visitantes de su objetivo.
- `c78436d` Crusader: avisos de objetivo atacado y de protección (M1) — **Decisión:** Crusader.md:216; Messages_ToS.md:1865, 1873: aviso de objetivo atacado y de protegido. Supuesto: una vez por noche (Doctor.md:251).

## Lote 11 (N1 a N5)

- `06d2463` Docs: estado de los roles MVP tras el lote 11 (N1 a N5); corrige la cita Doctor.md:221 a :217 *(docs)* — **Decisión:** Corrige la cita Doctor.md:221 a :217.
- `965dcd2` Spy: el atacante curado tras el contraataque del Bodyguard (Spy.md:255) — **Decisión:** Spy.md:255: el atacante curado tras el contraataque del Bodyguard. Spy.md:257 SKIPPED.
- `b00413a` Doctor que cura a un protegido por el Bodyguard recibe el aviso de atacado (Doctor.md:259) — **Decisión:** Doctor.md:259: el Doctor que cura a un protegido del Bodyguard recibe el aviso de atacado. Doctor.md:263 es errata, no replicada.
- `7fd3735` Órdenes de la Mafia: un Mafioso bloqueado o encarcelado sin acción no ejecuta la orden — **Decisión:** Godfather.md:225, 227: un Mafioso bloqueado o encarcelado sin acción no ejecuta la orden.
- `49c1d4d` Contraataque del Bodyguard: Doctor y Crusader impiden la muerte del Bodyguard o del atacante — **Decisión:** Bodyguard.md:260, 304; Doctor.md:217: Doctor y Crusader impiden la muerte del Bodyguard o del atacante en el contraataque.

## Lote 10 (L1 a L5)

- `bb1bf12` Docs: estado de los roles MVP tras el lote 10 (L1 a L5) *(docs)*
- `2bf6ae8` Selector de Alzar: no ofrece a los que el Retributionist no puede resucitar (Retributionist.md:236) — **Decisión:** Retributionist.md:236: el selector de Alzar no ofrece a quienes el Retributionist no puede resucitar.
- `376c7c8` Aviso de cárcel para quien ataca: "You could not attack your target because they were in jail." (Messages_ToS.md:1731) — **Decisión:** Messages_ToS.md:1731, 1733: aviso de cárcel a quien ataca a un encarcelado ("You could not attack your target because they were in jail.").
- `795078f` Jailor que ya mató a un Town: aviso al encarcelar (Jailor.md:294; Messages_ToS.md:1687-1689) — **Decisión:** Jailor.md:294; Messages_ToS.md:1687-1689: aviso al Jailor que ya mató a un Town cada vez que encarcela.

## Lote 9 (K1 a K7)

- `512d3a3` Docs: estado de los roles MVP tras el lote 9 *(docs)*
- `0ecae03` ENGINE.md: el Jailor que ejecuta a un Town sí pierde sus ejecuciones (Jailor.md:45, 184, 294) — **Decisión:** Jailor.md:45, 184, 294: el Jailor que ejecuta a un Town sí pierde sus ejecuciones (corrige ENGINE.md).
- `ccad384` Causas de muerte con dos asesinos: "también" (Messages_ToS.md:151, 154; Vigilante.md:374, 378; Bodyguard.md:446, 450) — **Decisión:** Messages_ToS.md:151, 154; Vigilante.md:374, 378; Bodyguard.md:446, 450: forma "también" para dos asesinos. Limitación: el motor guarda la segunda causa.
- `d85962b` Nota de muerte: el asesino la cambia en la mañana del anuncio y el registro la muestra (Death_Note_ToS.md:13, 17) — **Decisión:** Death_Note_ToS.md:13, 17: tarjeta de la nota para el autor en la mañana del anuncio (web).
- `f1e50e9` Spy: ve el mensaje falso de la Hypnotist que recibe su objetivo (Hypnotist.md:226; Spy.md:191) — **Decisión:** Hypnotist.md:226; Spy.md:191: el Spy ve el mensaje falso que recibe su objetivo.
- `22709a1` Spy: mensajes del espionaje según la tabla de Spy.md (Spy.md:225, 227, 229, 235, 237, 239, 243, 247, 249, 259, 261, 263, 271, 273, 275) — **Decisión:** Spy.md:225-275: mensajes del espionaje según la tabla. SKIPPED: Spy.md:255, 257 y los demás de la tabla con cita en ROLES_STATUS.
- `1c4f2de` Godfather: aviso a quien ordena un ataque si el objetivo tiene defensa (Godfather.md:233; Messages_ToS.md:383) — **Decisión:** Godfather.md:233; Messages_ToS.md:383: aviso a quien ordena un ataque si el objetivo tiene defensa.
- `3f1cddc` Retributionist: no resucita a Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter ni Retributionist (Retributionist.md:236) — **Decisión:** Retributionist.md:236: no resucita a Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter ni Retributionist.

## Lote 8 (I1 a I4)

- `16848bd` Docs: estado de los roles MVP tras el lote 8 *(docs)*
- `71f5bb4` Nota de muerte: el asesino la cambia durante el anuncio de la mañana (Death_Note_ToS.md:17) — **Decisión:** Death_Note_ToS.md:17: la nota se cambia durante el anuncio de la mañana. Ventana: `day_1` o `discussion` de esa mañana (desviación documentada).
- `73a5bfe` Causas de muerte: forma "también" para una segunda causa (Messages_ToS.md:151, 154; Jailor.md:602) — **Decisión:** Messages_ToS.md:151, 154: forma "también" para la segunda causa de muerte. PARTIAL (ver ROLES_STATUS, lote 8).
- `25ec776` Retributionist: no usa un cadáver falsificado con rol no Town visitante (Forger.md:232) — **Decisión:** Forger.md:232; Retributionist.md:376: no resucita un cadáver falsificado con rol no Town o no visitante.
- `9d63106` Testamento: límite de 400 caracteres según la wiki — **Decisión:** Last_Will_ToS.md:7: el testamento tiene un límite de 400 caracteres.

## Lote 7 (H1 a H5)

- `f413957` Docs: estado de los roles MVP tras el lote 7 *(docs)*
- `4020911` Forger: testamento falsificado, objetivo no Mafia, Ambusher por defecto y primer Forger (Forger.md) — **Decisión:** Forger.md:34, 156, 204, 218, 242: testamento falsificado; sin rol elegido guarda Ambusher (Forger.md:242, I1 SKIPPED con Forger por defecto); objetivo no Mafia.
- `c0038ac` Jailor: "You were hauled off to jail!" llega al empezar la noche (Jailor.md:558, 560) — **Decisión:** Jailor.md:558, 560: "You were hauled off to jail!" llega al empezar la noche.
- `2acc8ab` Textos de causa de muerte según la wiki (Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602) — **Decisión:** Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602: textos de causa de muerte.
- `53dafbd` Bodyguard: transportado a sí mismo no gasta el chaleco (Bodyguard.md:248) — **Decisión:** Bodyguard.md:248: transportado a sí mismo no gasta el chaleco.
- `ff223b8` Godfather y Mafioso: nota de muerte del asesino (Death_Note_ToS.md:5, 15, 17) — **Decisión:** Death_Note_ToS.md:5, 15, 17; Godfather.md:235: nota de muerte del asesino, hasta 400 caracteres.

## Lote 6 (G1 a G9)

- `a86e59c` Docs: estado de los roles MVP tras el lote 6 *(docs)*
- `b8dd50c` Trampa: el Framer no muere a la trampa (consecuencia de G1, Framer.md:252) — **Decisión:** Framer.md:252: el Framer no muere a la trampa (consecuencia de G1).
- `fbb51eb` Jailor: nota con varios motivos marcados (G9) — **Decisión:** Jailor.md:322; Death_Note_ToS.md:76-92: nota con varios motivos marcados.
- `ec7ac48` Jailor: avisos de encarcelado y de primera noche (G8, Jailor) — **Decisión:** Jailor.md:550, 562, 566: avisos de encarcelado y de primera noche.
- `875d037` Vigilante: aviso de la primera noche y del disparo (G8, Vigilante) — **Decisión:** Vigilante.md:358, 366: aviso de la primera noche ("wait a day") y del disparo.
- `6d8470a` Bodyguard: avisos de duelo, de chaleco y su conteo (G8, Bodyguard) — **Decisión:** Bodyguard.md:426, 430, 434, 438: avisos de duelo, de chaleco y su conteo.
- `4d3a121` Veteran: avisos de disparo de la alerta (G8, Veteran) — **Decisión:** Veteran.md:478, 482: avisos de disparo de la alerta.
- `5b9a2df` Trapper: ignora la inmunidad a la detección (G7) — **Decisión:** Trapper.md:39, 101: el Trapper ignora la inmunidad a la detección (Godfather.md:245 solo ante el Sheriff).
- `72ce59a` Doctor: no quita el encuadre (G6) — **Decisión:** Doctor.md:245: "You cannot"; el Doctor no quita el encuadre al curar.
- `ba76eda` Tavern Keeper: avisos de bloqueo, inmune y encarcelado (G5) — **Decisión:** Tavern_Keeper.md:347-357: avisos de bloqueo, de inmune y de encarcelado.
- `cefb41d` Tavern Keeper: puede bloquear a quien abandonó la partida (G4) — **Decisión:** Tavern_Keeper.md:183: puede bloquear a quien abandonó la partida.
- `f31e9cf` Trampa: mensajes del Trapper y de quien la activa (G3) — **Decisión:** Trapper.md:340-366: mensajes del Trapper y de quien activa la trampa.
- `67c5144` Trampa: el Trapper recibe el rol de cada visitante (G2) — **Decisión:** Trapper.md:219, 221, 260, 362: el Trapper recibe el rol de cada visitante.
- `6f3f0b3` Trampa: solo daña a atacantes (G1) — **Decisión:** Keyword_System.md:349: la trampa solo daña a atacantes, a uno al azar (la wiki no dice cómo elegir).

## Lote 5 (F1 a F6)

- `c3c18b3` Re-auditoría de Framer, Tavern Keeper y Trapper: reglas verificadas y pendientes *(docs)*
- `f589a96` Victoria 1 contra 1 de roles MVP: Transporter, Godfather, Mafia — **Decisión:** Victory_ToS.md:33, 39, 1030: 1 contra 1 de roles MVP; el resto de casos 1 contra 1 queda fuera del MVP.
- `d80c00f` Detector de empate: seis celdas MVP de la tabla de Stalemate — **Decisión:** Victory_ToS.md:395, 397-1030: detector de empate con seis celdas MVP. Supuesto: una celda vacía entre dos roles MVP significa que la partida sigue.
- `422e5e0` Trapper: la trampa se construye una noche antes de colocarse — **Decisión:** Trapper.md:159, 213, 215, 217, 229, 252: la trampa se construye una noche antes de colocarse.
- `e2d57c3` Tavern Keeper: no se bloquea a roles con habilidad de día — **Decisión:** Tavern_Keeper.md:181: no se bloquea a roles con habilidad de día (gana sobre Tavern_Keeper.md:277).
- `f283494` Framer: el encuadre dura hasta que un rol investigativo lo investiga — **Decisión:** Framer.md:344 (v3.3.0): el encuadre dura hasta que un rol investigativo lo investiga (gana sobre Sheriff.md:275).

## Lote 4 (E1 a E11)

- `0ff9b6f` Blackmailer: el acusado silenciado dice "I am blackmailed." una vez por juicio — **Decisión:** Blackmailer.md:213: "I am blackmailed." una vez por juicio.
- `3ae16b3` Janitor: lee el testamento original de quien limpió, solo él — **Decisión:** Janitor.md:222-228: el Janitor lee el testamento original de quien limpió, solo él.
- `0411cb4` Blackmailer: no silencia a un encarcelado, y ambos lo saben — **Decisión:** Blackmailer.md:221, 395: no silencia a un encarcelado, y ambos lo saben.
- `662fcdf` Blackmailer oye los susurros del día, vivo o muerto — **Decisión:** Blackmailer.md:207, 375: el Blackmailer oye los susurros del día, vivo o muerto.
- `fc28f4d` Bodyguard: chaleco antibalas sobre sí mismo, una vez por partida — **Decisión:** Bodyguard.md:240-250: chaleco antibalas sobre sí mismo, una vez por partida.
- `4932ee8` Veteran: la alerta que detiene a un atacante Basic avisa al Veteran — **Decisión:** Veteran.md:486: la alerta que detiene a un atacante Basic avisa al Veteran.
- `e2c0820` Vigilante: mensajes de la culpa al matar a un Town y al quitarse la vida — **Decisión:** Vigilante.md:362, 370: mensajes de la culpa al matar a un Town y al quitarse la vida.
- `ca49083` Doctor: aviso de atacado al Doctor que cura con éxito, una vez por noche — **Decisión:** Doctor.md:223, 251: aviso de atacado al Doctor que cura con éxito, una vez por noche.
- `4b38d8c` Medium: la sesión se elige de día y dura esa noche — **Decisión:** Medium.md:203: la sesión se elige de día y dura esa noche.
- `66f5271` Varios Médiums: se oyen entre sí y el vivo recibe un aviso por cada uno — **Decisión:** Medium.md:207, 211: los Médiums se oyen entre sí y el vivo recibe un aviso por cada uno.
- `3d853f1` Mayor revelado: no susurra ni recibe susurros, con los mensajes de la wiki — **Decisión:** Mayor.md:203: el Mayor revelado no susurra ni recibe susurros.

## Lote 3 (D1 a D5)

- `9b7efb1` Ambusher asciende cuando mueren los demás asesinos; no bloquea el ascenso — **Decisión:** Ambusher.md:228: el Ambusher asciende cuando mueren los demás asesinos; no bloquea el ascenso.
- `f3338f1` Corrige la ruta de la tabla Classic del Investigador — **Decisión:** Corrige la ruta de la tabla Classic del Investigador (corrección de D1).
- `48b48cc` Trapper: la trampa ataca a un visitante al azar, no a todos — **Decisión:** Keyword_System.md:349: la trampa ataca a un visitante al azar, no a todos.
- `b293b1b` Mensajes por rol que la wiki da y el motor no emitía — **Decisión:** Mensajes que la wiki da y el motor no emitía (ROLES_STATUS, lote 3, D5).
- `2837d29` Death Note del Jailor y del Godfather: SKIPPED con cita — **Decisión:** Death Note del Jailor y del Godfather: SKIPPED con cita (ver ROLES_STATUS, lote 3).
- `a51ac95` Iconos e ilustraciones de los roles: arte de la wiki con permiso — **Decisión:** Icono e ilustración de la wiki, con permiso. Arte propio pendiente (decisión del usuario).
- `c43bb45` Tests de victoria y derrota por rol del MVP — **Decisión:** Pruebas de victoria y derrota por rol del MVP (checklist d).
- `1cc4ac9` Investigador: resultado por grupos de roles de la tabla Classic — **Decisión:** Resultado del Investigador por grupos de la tabla Classic (Investigator.md). Crusader, Psychic, Tracker y Trapper sin fila: SKIPPED.

## Lote 2

- `fa4fecc` Añade el estado honesto de los roles MVP frente al checklist *(docs)*
- `243d3f3` Textos del registro según la wiki: Lookout, Tracker, Janitor y Godfather
- `15aa085` Ambusher: el ascenso a Mafioso queda pendiente (SKIPPED) — **Decisión:** Ascenso de la Mafia pendiente (SKIPPED); resuelto en 9b7efb1.
- `d6fbb11` Tavern Keeper: la wiki se contradice sobre el bloqueo al Mayor — **Decisión:** La wiki se contradice sobre el bloqueo al Mayor; resuelto en e2d57c3 (Tavern_Keeper.md:181 gana).
- `bbcae16` Framer: la wiki se contradice sobre la duración del encuadre — **Decisión:** La wiki se contradice sobre la duración del encuadre; resuelto en f283494 (Framer.md:344).
- `219e9ab` Trapper: la trampa defiende a su objetivo de un ataque directo — **Decisión:** Trapper.md:223, 225: la trampa defiende a su objetivo de un ataque directo.
- `8c6dce7` Transporter: encarcelados, avisos y bloqueos tras el cambio — **Decisión:** Transporter.md:202, 226: encarcelados, avisos y bloqueos.
- `9877e06` Retributionist: los resultados y avisos del zombi son suyos — **Decisión:** Retributionist.md:203, 206, 220: resultados y avisos del zombi son suyos.
- `b7b2997` Hypnotist: textos de la wiki y mensaje de inmunidad al bloqueo — **Decisión:** Hypnotist.md:262: mensaje de inmunidad al bloqueo; textos de la wiki.
- `5579b33` Médium: habla con los muertos de noche y avisa a su objetivo — **Decisión:** Medium.md:186, 189: habla con los muertos de noche y avisa a su objetivo.
- `c775cc7` Spy: el espionaje dice lo que recibió su objetivo — **Decisión:** Spy.md:193, 205: el espionaje dice lo que recibió su objetivo.
- `0b04d87` Visitas de quien tiene dos objetivos: Transporter, Disguiser y Retributionist — **Decisión:** Transporter.md, Disguiser.md y Retributionist.md: visitas de quien tiene dos objetivos.
- `1224161` Encarcelados: el visitante falla pero su visita cuenta

## Lote 1 (supuesto de agrupación, ver nota)

- `7290f0c` Catálogo: no regenera la unicidad mal ni saca al Vampire Hunter
- `5214c54` Renombra una variable que sombreaba al jugador en el pipeline de la noche
- `8f54011` Tests de los bots: reglas de noche del Vigilante, Ambusher y Trapper
- `61daede` Trapper: una trampa a la vez, se desmonta eligiéndose, fuerza Poderosa
- `1c51caa` Crusader y Ambusher atacan a un visitante al azar; el Ambusher no ataca a la Mafia — **Decisión:** Crusader y Ambusher atacan a un visitante al azar; el Ambusher no ataca a la Mafia.
- `5980ece` Lookout: identifica a tres visitantes al azar y avisa si hubo más — **Decisión:** Lookout.md:178-182: identifica a tres visitantes al azar y avisa si hubo más.
- `9eb9910` Bodyguard: solo contraataca a la Mafia y al Vigilante — **Decisión:** Bodyguard.md:214, 228: solo contraataca a la Mafia y al Vigilante.
- `fbd509f` Tracker: sin visitas no hay notificación; el Godfather no se ve si ordena
- `3a4cfa0` Psychic: la visión dice de qué bando hay al menos uno
- `474721a` Janitor y Retributionist: limpiar a un encarcelado no gasta; no se resucita a un limpiado
- `c4b157e` Bootlegger y Transporter: inmunes al bloqueo
- `2877999` Mayor: el voto revelado cuenta tres también en el juicio
- `dea30dd` Vigilante: no dispara la noche 1; la culpa se paga la noche siguiente
- `ab89b37` Ascensos de la Mafia: Mafioso a Godfather, Bootlegger primero, Ambusher mata — **Decisión:** Orden de ascenso de la Mafia: Mafioso a Godfather, Bootlegger primero, Ambusher mata. Revisado en 8056046.
- `736b4bb` Mafia: con orden del Godfather, el Mafioso ejecuta y recibe la visita
- `78011a7` Godfather: Basic Defense permanente; un ataque Basic no le mata
- `1aedf99` Consigliere: ve el rol real aunque su objetivo esté disfrazado
- `e8c29e5` Forger: la falsificación solo cuenta si la víctima muere esa noche
- `17067aa` Quita al Vampire Hunter del MVP (sin Vampiros no tiene acción) — **Decisión:** Vampire Hunter fuera del MVP: sin Vampiros no tiene acción.
- `be369a9` Corrige la unicidad de 23 roles según la wiki

## Decisiones abiertas

Estas decisiones no están cerradas. Cada una tiene un supuesto documentado y un test o una marca `SKIPPED` en `docs/ROLES_STATUS.md`.

- **(a) Trapper P1: "izquierda" y "derecha" (`caccf1c`).** Transporter.md:206 dice que el orden de elección no importa, pero no dice cuál de los dos objetivos es la izquierda. Supuesto: el primero elegido. Si la regla real es otra, cambia el sentido del ciclo de tres. Pruebas: `packages/engine/test/transporter-dos.test.ts`.
- **(b) P4: qué es "atacado" (`b1bd6cd`).** Supuesto: cuenta todo ataque directo de otro jugador a la casa del objetivo, aunque lo prevenga un Doctor, un Bodyguard o un Crusader (Doctor.md:249 avisa de cualquier ataque). No cuenta el ataque propio del Vigilante. La wiki no define el término. Pruebas: `packages/engine/test/trapper-objetivo-atacado.test.ts`.
- **(c) Hypnotist.md:224 (`3a34b38`, SKIPPED).** "If you don't choose a message, you cannot be controlled into visiting anyone." presupone una acción válida sin opción. El motor exige opción y la wiki no dice qué pasa sin ella.
- **(d) Forger.md:240 (sin borrador; SKIPPED en el lote 8, ver `docs/ROLES_STATUS.md`).** "If the Night ends without you saving your forgery, their role will default to Forger." El motor no tiene borrador, así que una falsificación no guardada no existe y no se puede modelar sin inventar un estado.
- **(e) Doctor: aviso con dos Doctores.** Doctor.md:253 dice que el objetivo curado por varios Doctores no recibe mensajes adicionales, y Doctor.md:249-251 fija un solo aviso de atacado por noche. Ninguno dice qué recibe cada Doctor cuando hay dos sobre el mismo objetivo. El motor da un solo aviso de curado al objetivo (`packages/engine/test/mensajes-por-rol.test.ts`, "dos Doctors que curan al mismo objetivo dan un solo aviso"). Sin verificar el aviso de cada Doctor.
- **(f) Bodyguard: orden de entrada frente a asiento (lote 11, N1, `49c1d4d`).** Bodyguard.md:232 dice que contraataca el Bodyguard "who joined the lobby first". El motor ordena por asiento (`packages/engine/src/phases/night/pipeline.ts:158, 601`), y el asiento se reparte al azar al empezar la partida (`packages/engine/src/setup/startGame.ts:26-28`). Desviación de la wiki: no es el orden de entrada. Sin decidir.

## Cómo mantener este changelog

- Una entrada por lote o grupo, en orden de llegada: el lote nuevo va arriba. Cada entrada lista los commits (hash), los archivos de test nuevos y las citas de la wiki de ese lote.
- Cada commit nuevo añade su línea al lote en curso, con su hash corto, la descripción y la decisión con la cita de la wiki. Al cerrar un lote, se añade su commit `Docs: estado ... tras el lote N` y se actualiza su entrada.
- Una decisión abierta pasa a esta sección y se cierra aquí cuando el usuario la resuelve. Un `SKIPPED` nuevo se anota en `docs/ROLES_STATUS.md` y en la línea de su commit.
- Las entradas de abajo se generaron desde `git log` y los mensajes de los commits. Los archivos de test son los que el lote añade como nuevos; los tests añadidos en archivos existentes no aparecen aquí.

### Posterior al lote 13: Medium en solo lectura y checklist
- Commits: `b7c2ce6`, `32cc34f`
- Tests nuevos: `seanceTarget.test.ts`
- Citas de la wiki: Medium.md:201; Medium.md:201, 217-223; Medium.md:217-219; Medium.md:223

### Promotion/Mafia
- Commits: `8056046`, `1e6d93c`
- Tests nuevos: ninguno nuevo (los tests se añadieron en archivos existentes)
- Citas de la wiki: Ambusher.md:228

### Lote 13 (P1 a P9)
- Commits: `caccf1c`, `f8dda35`, `91513d4`, `b1bd6cd`, `f3daf00`, `bbe8e60`, `751456c`, `69c2b67`, `26c5a70`, `3a2d688`
- Tests nuevos: `ambusher-visita-pasiva.test.ts`, `doctor-autocuracion-transporte.test.ts`, `lookout-disfraz.test.ts`, `medium-carcel-equipo.test.ts`, `spy-orden.test.ts`, `transporter-abandono.test.ts`, `transporter-dos.test.ts`, `trapper-objetivo-atacado.test.ts`, `zombi-vigilante.test.ts`
- Citas de la wiki: Ambusher.md:232; Ambusher.md:290; Bodyguard.md:228; Bodyguard.md:246; Disguiser.md:161; Disguiser.md:207; Disguiser.md:215; Doctor.md:249; Jailor.md:266; Jailor.md:266, 268; Jailor.md:268; Keyword_System.md:349; Medium.md:201; Medium.md:217; Medium.md:217-219; Medium.md:223; Retributionist.md:155; Retributionist.md:294-308; Spy.md:179; Transporter.md:198; Transporter.md:202; Transporter.md:206; Transporter.md:226; Transporter.md:228; Transporter.md:234; Transporter.md:266-278; Transporter.md:272; Trapper.md:219; Trapper.md:223; Trapper.md:256

### Lote 12 (M1 a M16)
- Commits: `c78436d`, `fd46290`, `1597b8a`, `d058770`, `a26e785`, `a8f1f3a`, `65c0d1b`, `e7c490c`, `fb5970c`, `098f8d6`, `3c698a6`, `3a34b38`, `2ce9d21`, `73e10ee`, `446565f`, `058ca07`, `ab5963c`, `1fb4a86`
- Tests nuevos: `usedBodies.test.ts`, `copyRights.test.ts`, `corpses.test.ts`, `ambusher-avisos.test.ts`, `crusader-avisos.test.ts`, `doctor-defensa.test.ts`, `hypnotist-opciones.test.ts`, `jailor-ejecutado.test.ts`, `mafia-superviviente.test.ts`, `mafioso-aviso-defensa.test.ts`, `medium-comunicacion.test.ts`, `spy-objetivo-objetivo.test.ts`, `usos-contador.test.ts`
- Citas de la wiki: Ambusher.md:222; Blackmailer.md:209; Blackmailer.md:211; Crusader.md:216; Crusader.md:330, 336; Doctor.md:223; Doctor.md:229; Doctor.md:249; Doctor.md:251; Doctor.md:263; Doctor.md:269; Doctor.md:399; Forger.md:488; Godfather.md:233; Godfather.md:487; Hypnotist.md:224; Hypnotist.md:226; Jailor.md:546; Jailor.md:590; Janitor.md:390; Mafia_Killing.md:13, 15; Mafioso.md:235; Mafioso.md:475; Mayor.md:397; Mayor.md:401; Medium.md:197; Medium.md:209; Medium.md:213; Medium.md:215; Medium.md:483; Messages_ToS.md:1585; Messages_ToS.md:1723; Messages_ToS.md:1861, 1869; Messages_ToS.md:1865, 1873; Messages_ToS.md:1953; Messages_ToS.md:1957; Messages_ToS.md:2109; Messages_ToS.md:2117; Messages_ToS.md:383; Retributionist.md:204; Spy.md:213; Spy.md:251; Spy.md:257; Spy.md:257, 295, 297, 301, 307; Spy.md:295, 297, 301, 307; Spy.md:481; Vigilante.md:370

### Lote 11 (N1 a N5)
- Commits: `49c1d4d`, `7fd3735`, `b00413a`, `965dcd2`, `06d2463`
- Tests nuevos: `bodyguard-contraataque.test.ts`, `mafia-ordenes-bloqueo.test.ts`
- Citas de la wiki: Bodyguard.md:230; Bodyguard.md:260; Bodyguard.md:304; Bodyguard.md:306; Crusader.md:216; Crusader.md:224; Doctor.md:217; Doctor.md:221; Doctor.md:223; Doctor.md:251; Doctor.md:257, 263, 265, 267, 333; Doctor.md:259; Doctor.md:263; Godfather.md:221, 223, 225, 227; Godfather.md:225; Godfather.md:227; Jailor.md:252; Jailor.md:288, 302, 304, 624; Jailor.md:362; Janitor.md:218; Lookout.md:228; Messages_ToS.md:1875; Messages_ToS.md:1893; Psychic.md:324; Retributionist.md:228; Spy.md:211, 467; Spy.md:255; Spy.md:257; Tavern_Keeper.md:349; Transporter.md:236, 252; Trapper.md:237

### Lote 10 (L1 a L5; L3 sin commit)
- Commits: `795078f`, `376c7c8`, `2bf6ae8`, `bb1bf12`
- Tests nuevos: `resurrect.test.ts`, `ataque-encarcelado.test.ts`
- Citas de la wiki: Bodyguard.md:260; Death_Note_ToS.md:17; Framer.md:344; Godfather.md:225, 233; Godfather.md:233; Jailor.md:294; Mafioso.md:235; Messages_ToS.md:1687-1689; Messages_ToS.md:1697; Messages_ToS.md:1727; Messages_ToS.md:1731; Messages_ToS.md:1731, 1733; Retributionist.md:236; Spy.md:255, 257; Trapper.md:239, 241, 243, 372; Vigilante.md:194

### Lote 9 (K1 a K7)
- Commits: `3f1cddc`, `1c4f2de`, `22709a1`, `f1e50e9`, `d85962b`, `ccad384`, `0ecae03`, `512d3a3`
- Tests nuevos: `deathNote.test.ts`, `godfather-aviso-defensa.test.ts`, `hypnotist-espia.test.ts`, `muerte-dos-causas.test.ts`, `retributionist-no-resucitables.test.ts`, `spy-mensajes.test.ts`
- Citas de la wiki: Bodyguard.md:446, 450; Death_Note_ToS.md:13, 17; Death_Note_ToS.md:17; Godfather.md:233; Hypnotist.md:226; Hypnotist.md:262; Jailor.md:45, 184, 294; Messages_ToS.md:151; Messages_ToS.md:151, 154; Messages_ToS.md:1727; Messages_ToS.md:383; Retributionist.md:236; Spy.md:191; Spy.md:205; Spy.md:221-309; Spy.md:225, 227, 229, 235, 237, 239, 243, 247, 249, 259, 261, 263, 271, 273, 275; Spy.md:255, 257; Vigilante.md:374, 378

### Lote 8 (I1 a I4)
- Commits: `9d63106`, `25ec776`, `73a5bfe`, `71f5bb4`, `16848bd`
- Tests nuevos: `death-note-edicion.test.ts`, `forger-retributionist.test.ts`
- Citas de la wiki: Bodyguard.md:446, 450; Death_Note_ToS.md:15: 400; Death_Note_ToS.md:17; Forger.md:230; Forger.md:232; Forger.md:234; Forger.md:240; Forger.md:242; Godfather.md:235; Godfather.md:36; Jailor.md:602; Mafioso.md:23; Mafioso.md:279; Messages_ToS.md:151; Messages_ToS.md:151, 154; Messages_ToS.md:154; Retributionist.md:376; Retributionist.md:378; Veteran.md:490; Vigilante.md:374, 378

### Lote 7 (H1 a H5)
- Commits: `ff223b8`, `53dafbd`, `2acc8ab`, `c0038ac`, `4020911`, `f413957`
- Tests nuevos: `nightAbilityFlags.test.ts`, `bodyguard-chaleco-transporte.test.ts`, `death-note.test.ts`, `forger-testamento.test.ts`
- Citas de la wiki: Bodyguard.md:11; Bodyguard.md:248; Bodyguard.md:446; Bodyguard.md:446, 450; Bodyguard.md:450; Death_Note_ToS.md:15; Death_Note_ToS.md:17; Death_Note_ToS.md:5, 15, 17; Forger.md:204; Forger.md:208; Forger.md:218; Forger.md:226; Forger.md:232, 234; Forger.md:232, 234, 240; Forger.md:240; Forger.md:242; Forger.md:288; Forger.md:312; Forger.md:34, 156, 204; Godfather.md:26, 36; Godfather.md:36; Jailor.md:282; Jailor.md:282, 572; Jailor.md:558; Jailor.md:558, 560; Jailor.md:562; Jailor.md:602; Mafioso.md:23; Mafioso.md:279; Transporter.md:212; Veteran.md:490; Vigilante.md:374; Vigilante.md:374, 378; Vigilante.md:378

### Lote 6 (G1 a G9)
- Commits: `6f3f0b3`, `67c5144`, `f31e9cf`, `cefb41d`, `ba76eda`, `72ce59a`, `5b9a2df`, `4d3a121`, `6d8470a`, `875d037`, `ec7ac48`, `fbb51eb`, `b8dd50c`, `a86e59c`
- Tests nuevos: `doctor-prohibiciones.test.ts`, `jailor-motivos.test.ts`, `tavern-keeper-avisos.test.ts`, `trapper-inmunidad.test.ts`, `trapper-mensajes.test.ts`, `trapper-revelacion.test.ts`
- Citas de la wiki: Bootlegger.md:340-350; Death_Note_ToS.md:11; Death_Note_ToS.md:15; Death_Note_ToS.md:17; Death_Note_ToS.md:74; Death_Note_ToS.md:76-88; Death_Note_ToS.md:90; Death_Note_ToS.md:92; Doctor.md:245; Framer.md:252; Framer.md:344; Godfather.md:245; Godfather.md:319; Jailor.md:322; Keyword_System.md:349; Tavern_Keeper.md:183; Trapper.md:219; Trapper.md:221; Trapper.md:260; Trapper.md:262; Trapper.md:340-346; Trapper.md:348; Trapper.md:352; Trapper.md:356; Trapper.md:360-362; Trapper.md:362; Trapper.md:364; Trapper.md:39; Trapper.md:396; Veteran.md:402; Veteran.md:470-494; Veteran.md:478; Veteran.md:482

### Lote 5 (F1 a F6)
- Commits: `f283494`, `e2d57c3`, `422e5e0`, `d80c00f`, `f589a96`, `c3c18b3`
- Tests nuevos: `stalemate.test.ts`
- Citas de la wiki: Doctor.md:245; Framer.md:196; Framer.md:202; Framer.md:344; Jailor.md:286; Keyword_System.md:349; Psychic.md:188; Sheriff.md:275; Tavern_Keeper.md:181; Tavern_Keeper.md:183; Tavern_Keeper.md:277; Tavern_Keeper.md:351-357; Trapper.md:215; Trapper.md:219, 221, 262, 360; Trapper.md:223; Trapper.md:229; Trapper.md:340-366; Victory_ToS.md:1030; Victory_ToS.md:393; Victory_ToS.md:395; Victory_ToS.md:49; Victory_ToS.md:9-11

### Lote 4 (E1 a E11)
- Commits: `3d853f1`, `66f5271`, `4b38d8c`, `ca49083`, `e2c0820`, `4932ee8`, `fc28f4d`, `662fcdf`, `0411cb4`, `3ae16b3`, `0ff9b6f`
- Tests nuevos: ninguno nuevo (los tests se añadieron en archivos existentes)
- Citas de la wiki: Blackmailer.md:207; Blackmailer.md:213; Blackmailer.md:221; Blackmailer.md:227; Blackmailer.md:375-377; Blackmailer.md:395; Blackmailer.md:409; Bodyguard.md:119-121; Bodyguard.md:240; Bodyguard.md:242, 244, 246; Bodyguard.md:248; Bodyguard.md:250; Bodyguard.md:426; Doctor.md:223; Doctor.md:249; Doctor.md:251; Janitor.md:222; Janitor.md:224; Janitor.md:228; Mayor.md:203; Medium.md:203; Medium.md:207; Medium.md:209; Medium.md:211; Veteran.md:402; Veteran.md:486; Vigilante.md:358; Vigilante.md:362; Vigilante.md:370

### Lote 3 (D1 a D5)
- Commits: `1cc4ac9`, `c43bb45`, `a51ac95`, `2837d29`, `b293b1b`, `48b48cc`, `f3338f1`, `9b7efb1`
- Tests nuevos: `roleImages.test.ts`, `investigator-grupos.test.ts`, `mensajes-por-rol.test.ts`, `trapper-un-visitante.test.ts`, `victoria-por-rol.test.ts`
- Citas de la wiki: Ambusher.md:216; Ambusher.md:228; Crusader.md:214; Death_Note_ToS.md:11,74; Death_Note_ToS.md:15; Jailor.md:322; Trapper.md:223

### Lote 2 (commits 21 a 32; docs 33)
- Commits: `1224161`, `0b04d87`, `c775cc7`, `5579b33`, `b7b2997`, `9877e06`, `8c6dce7`, `219e9ab`, `bbcae16`, `d6fbb11`, `15aa085`, `243d3f3`, `fa4fecc`
- Tests nuevos: ninguno nuevo (los tests se añadieron en archivos existentes)
- Citas de la wiki: Ambusher.md:43, 49, 114, 168; Disguiser.md:217; Disguiser.md:279; Hypnotist.md:232-256; Hypnotist.md:262, 408; Janitor.md:212; Lookout.md:298; Lookout.md:358; Mafioso.md:225, 479; Medium.md:186; Medium.md:201; Medium.md:209, 213; Retributionist.md:203; Retributionist.md:206, 220; Retributionist.md:388; Sheriff.md:275; Spy.md:193; Spy.md:205; Tavern_Keeper.md:181; Tavern_Keeper.md:275; Tavern_Keeper.md:277; Tracker.md:208; Tracker.md:322; Transporter.md:202, 226; Transporter.md:208; Trapper.md:213-215; Trapper.md:223, 225

### Lote 1 (supuesto: commits 1 a 20, sin etiqueta en los mensajes)
- Commits: `be369a9`, `17067aa`, `e8c29e5`, `1aedf99`, `78011a7`, `736b4bb`, `ab89b37`, `dea30dd`, `2877999`, `c4b157e`, `474721a`, `3a4cfa0`, `fbd509f`, `9eb9910`, `5980ece`, `1c51caa`, `61daede`, `8f54011`, `5214c54`, `7290f0c`
- Tests nuevos: `botBrain.test.ts`
- Citas de la wiki: Ambusher.md:216; Ambusher.md:218; Ambusher.md:228; Ambusher.md:230; Bodyguard.md:214; Bodyguard.md:228; Bootlegger.md:202; Bootlegger.md:214; Crusader.md:214; Godfather.md:279; Janitor.md:250; Lookout.md:178-182; Mayor.md:199; Psychic.md:43-44; Retributionist.md:216; Tracker.md:194; Tracker.md:234; Transporter.md:194; Vigilante.md:188, 190, 208
