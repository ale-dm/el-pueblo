# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1, 2 y 3 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Chaleco antibalas (lote 4, E7: Bodyguard.md:240-250): hecho, sin contraataque, una vez, sigue al transporte. Pendiente: contador "You have (#) bulletproof vest(s) left." (Bodyguard.md:426) y el caso "transported into yourself" (Bodyguard.md:248) |
| Crusader | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Your target was attacked last night!": hecho (lote 4, E4, Doctor.md:223, 251); Doctor.md:249 dice "attacked in any way", no fija el caso letal: se sigue :223 |
| Investigator | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | Texto de ayuda y narración (f, h) |
| Jailor | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | Death Note (SKIPPED: la wiki contradictoria, ver lote 3 D4); aviso al equipo de Mafia encarcelada (pendiente; el aviso al prisionero está hecho) |
| Lookout | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Susurros con Mayor revelado: hecho (lote 4, E1, Mayor.md:203). Vampiro convertido que recupera susurros (Mayor.md:211): sin Vampiros en el MVP |
| Medium | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Varios Mediums que se oyen entre sí y aviso por cada uno: hecho (lote 4, E2, Medium.md:207, 211). Sesión elegida de Día para la noche siguiente: hecha (lote 4, E3, Medium.md:203) |
| Psychic | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED |
| Retributionist | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Zombi limitado a una habilidad de un objetivo; exclusiones de roles |
| Sheriff | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Investigador hecho; Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Bug simplificado (5 etiquetas, no la lista completa de Spy.md) |
| Tavern Keeper | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a la Mafia (Victory ToS, SKIPPED); bloqueo de roles con habilidad de día: hecho (lote 5, F2, Tavern_Keeper.md:181; el Mayor no se bloquea, el Jailor y el Psychic sí, ver `rules/roleblock.ts`) |
| Tracker | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente al Mafioso (Victory ToS, SKIPPED); mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitante al azar (lote 3, D6; la wiki dice "one attacker" pero no cómo se elige). Fase de construcción: hecha (lote 5, F3: Trapper.md:159, 213, 215, 227, 229). Pendiente: mensajes de estado de la trampa (Trapper.md:340-346) |
| Veteran | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Someone tried to attack you but your defense while on alert was too strong!" al Veteran, lote 4 E6 (Veteran.md:486; el plan decía el atacante, la wiki dice "you" = Veteran). Mensaje de "defense too strong" al atacante (generic, Veteran.md:402): no implementado |
| Vigilante | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensajes de culpa (lote 4, E5: Vigilante.md:362, 370) y balas (lote 3) hechos. Pendiente: mensaje de la primera noche "You decide to wait a day before using your gun." (Vigilante.md:358, no está en el alcance de E5) |
| Ambusher | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); ascenso a Mafioso cuando mueren los demás asesinos (Ambusher.md:228, hecho en la revisión) |
| Blackmailer | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Susurros que el Blackmailer oye: hecho (lote 4, E8, Blackmailer.md:207, 375; vivo y muerto); no silencia a un encarcelado, con los dos avisos de la wiki: hecho (lote 4, E9, Blackmailer.md:221, 395); "I am blackmailed." en juicio, una vez: hecho (lote 4, E11, Blackmailer.md:213) |
| Bootlegger | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); encuadre hasta que un rol investigativo lo investiga (lote 5, F1, Framer.md:344, 196): hecho, con test en `night.test.ts`. Auditoría de Framer completa en F6 |
| Godfather | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Transporter (Victory ToS, SKIPPED) y frente a Tavern Keeper o Jailor; Death Note (SKIPPED: texto libre de la Death Note común a los roles asesinos, `docs/wiki/Death_Note_ToS.md:15`); aviso de la orden |
| Hypnotist | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | Testamento del limpiado: hecho (lote 4, E10, Janitor.md:222-228), solo para el Janitor |
| Mafioso | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Death Note (SKIPPED, ver Godfather) |

Notas:
- **Icono y arte (g, lote 3, D3):** los 29 roles del MVP muestran el icono de la wiki en la carta y la revelación, y la ilustración (skin) donde existe. Es arte de la wiki reutilizado con permiso del equipo, no arte propio: por eso g queda en ◐. Ambusher, Blackmailer y Framer no tienen skin en la wiki (SKIPPED: solo icono). Ver `apps/web/src/lib/roleImages.ts` y `data/README.md`.
- **Vampire Hunter** sale del MVP (sin Vampiros no tiene acción). Ver `17067aa`.
- **Investigador por grupos (lote 3, D1):** el resultado es el grupo de la tabla "Classic Investigator Results" de `docs/roles/Investigator.md` (`packages/engine/src/rules/investigation.ts`). Framed da el grupo de Framer; disfrazado, el del rol aparente. Crusader, Psychic, Tracker y Trapper no tienen fila en esa tabla: SKIPPED, columna c en ◐.
- **Victoria (d, lote 3, D2):** `packages/engine/test/victoria-por-rol.test.ts` prueba ganar y perder con la facción de cada rol del MVP. ◐ en los roles con una condición 1 contra 1 de `docs/wiki/Victory_ToS.md` que el motor no modela (Transporter, Jailor, Tavern Keeper y la Mafia en general; el Godfather además gana contra un Transporter). Survivor y Witch, que también aparecen en "Gana con", no están en el MVP.
- **Icono y arte (g):** los iconos son arte de la wiki. No hay ilustración propia.
- **Mensajes (h, lote 3, D5):** hechos los avisos de curado (Doctor), balas y alertas que quedan (Vigilante, Veteran), rol del limpiado (Janitor), prisionero (Jailor) y los dos de la Psíquica (pocos vivos y sin Town/Neutral Benign). Cada uno tiene test en `packages/engine/test/mensajes-por-rol.test.ts` o `apps/web/src/lib/log.test.ts`. Timing elegido: los avisos de usos y de rol salen al amanecer (la wiki no fija la hora de "You have (#) bullet(s) left").
- **Narración (h):** textos del registro por causa y por rol en `apps/web/src/lib/log.ts`; faltan los mensajes exactos de la wiki donde no se han añadido.
- **Revisión de las contradicciones de la wiki** (ver `docs/roles/`):
  - *Ambusher (resuelto):* Ambusher.md:228 dice que asciende cuando mueren los demás asesinos. El código lo contaba como asesino y no ascendía; corregido.
  - *Vigilante (resuelto):* la ficha (Especial, Vigilante.md:44 y :98) y el texto completo (:190) dicen "matar a un Town"; el "shoot" de las líneas 39 y 144 es el resumen. Se queda como está (muerte).
  - *Framer (resuelto, lote 5 F1):* Framer.md:344 (versión 3.3.0): "Frames will now last until an investigative role targets the Framed player instead of only the Night the player is Framed." Gana 3.3.0 sobre Sheriff.md:275 (consejo anterior). Roles investigativos: categoría "Investigation" del catálogo (Sheriff, Investigator, Consigliere, Lookout, Tracker, Spy); Psychic ("Information") no apunta a nadie. Código: `INVESTIGATIVE_ROLE_KEYS` en `rules/investigation.ts`.
  - *Tavern Keeper (resuelto, lote 5 F2):* Tavern_Keeper.md:181 ("You cannot Roleblock roles with Day abilties, because you have a Night ability.") gana sobre el consejo de :277 (bloquear al Mayor la noche 1 en Ranked), que es estrategia. Se aplica también al Bootlegger, que usa el mismo bloqueo (Bootlegger.md:198).
  - *Medium (lote 4, E2 y E3):* Medium.md:207 dice que varios Mediums se oyen entre sí; hecho. Medium.md:277 es consejo de estrategia, no regla. La sesión se elige de día (:203) y el objetivo recibe el aviso al empezar la noche (:209), no al amanecer: hecho.
  - *Trapper (decisión tomada):* elige al visitante al azar, porque la wiki no dice cómo elegir.
  - *Detector de empate (lote 5, F4):* la tabla de `docs/wiki/Victory_ToS.md` (:397-1030) llega con celdas vacías, pero las filas tienen bloques de 36 líneas y se reconstruye sin ambigüedad: la matriz es simétrica salvo Necromancer (no MVP). Para roles MVP hay seis celdas con ganador: Godfather–Jailor (:542), Godfather–Tavern Keeper (:540), Godfather–Transporter (:538), Mafioso–Transporter (:574, "Town"), Mafioso–Tavern Keeper (:576), Mafioso–Jailor (:578); las mismas en la fila del otro rol. Supuesto: una celda vacía entre dos roles MVP significa que la partida sigue (la leyenda de :1038-1042 describe las cajas azules; la extracción no conserva colores). Código: `rules/stalemate.ts`; tests: `test/stalemate.test.ts`. Reglas aplicadas: :395 (una trampa puesta impide el detector) y :1030 (Jailor con ejecuciones). Celdas fuera de MVP (Arsonist, Werewolf, Serial Killer, Vampire, Coven, Juggernaut...): SKIPPED.
  - *Trapper (lote 5, F3):* la trampa se construye al final de la noche si no hay ninguna puesta ni lista (Trapper.md:213), queda lista la noche siguiente (Trapper.md:159, 252), y se coloca desde entonces (Trapper.md:217). Bloqueado esa noche, no se construye (Trapper.md:215). Desmontar la deja lista al instante (Trapper.md:229). Modelo: `TrapState.targetId: null` = construida; efecto `build` del rol pasivo.
