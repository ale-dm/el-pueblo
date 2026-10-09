# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1, 2 y 3 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Chaleco antibalas (lote 4, E7: Bodyguard.md:240-250). Lote 6 (G8): contador del chaleco (Bodyguard.md:426) y avisos del duelo (:430, :434, :438), con test en `mensajes-por-rol.test.ts`. Pendiente: el caso "transported into yourself" (Bodyguard.md:248); causas de muerte de :446 y :450 (el motor usa su propio texto) |
| Crusader | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Your target was attacked last night!": hecho (lote 4, E4, Doctor.md:223, 251); Doctor.md:249 dice "attacked in any way", no fija el caso letal: se sigue :223. Lote 6 (G6): Doctor.md:245 es una prohibición ("You cannot"): verificado, no se quita el encuadre |
| Investigator | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | Texto de ayuda y narración (f, h) |
| Jailor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Lote 6 (G9): nota con varios motivos (Jailor.md:322, selección múltiple; Death_Note_ToS.md:76-92). Lote 6 (G8): avisos de la Mafia y del Coven encarcelados, del arrastre y de la primera noche (Jailor.md:550, 562, 566). Pendiente: el aviso al prisionero sale al encarcelar, no al empezar la noche (Jailor.md:558); causas de muerte (Jailor.md:602); la nota de los asesinos (Godfather, Mafioso) sigue SKIPPED |
| Lookout | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Susurros con Mayor revelado: hecho (lote 4, E1, Mayor.md:203). Vampiro convertido que recupera susurros (Mayor.md:211): sin Vampiros en el MVP |
| Medium | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Varios Mediums que se oyen entre sí y aviso por cada uno: hecho (lote 4, E2, Medium.md:207, 211). Sesión elegida de Día para la noche siguiente: hecha (lote 4, E3, Medium.md:203) |
| Psychic | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED |
| Retributionist | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Zombi limitado a una habilidad de un objetivo; exclusiones de roles |
| Sheriff | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Investigador hecho; Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Bug simplificado (5 etiquetas, no la lista completa de Spy.md) |
| Tavern Keeper | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Auditoría completa (lote 5, F6). Lote 6: TK.md:183 verificado (G4, abandonó la partida); avisos de bloqueo, inmune y encarcelado (G5, TK.md:347-357). Ningún pendiente del MVP |
| Tracker | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente al Mafioso (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Lote 6: daño solo a atacantes (G1, Keyword_System.md:349); revelación de roles de todos los visitantes, también con el Trapper muerto (G2, Trapper.md:219, 221, 260, 362); estado y avisos de la tabla de mensajes (G3, Trapper.md:340-366); inmunidad a la detección (G7, Trapper.md:39, 101). Pendiente del MVP: ninguno. Los errores que la wiki documenta (Trapper.md:239, 241, 243, 372) no se replican |
| Veteran | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Someone tried to attack you but your defense while on alert was too strong!" al Veteran, lote 4 E6 (Veteran.md:486). Lote 6 (G8): "You were shot by the Veteran you visited!" (Veteran.md:478) y "You shot someone who visited you last night!" (:482). Pendiente: causa de muerte de :490 (texto del motor). El aviso al atacante no está en la tabla de mensajes: Veteran.md:402 es una línea de estrategia, así que no se implementa |
| Vigilante | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensajes de culpa (lote 4, E5: Vigilante.md:362, 370) y balas (lote 3). Lote 6 (G8): "wait a day" en la primera noche (Vigilante.md:358) y "You were shot by a Vigilante!" (:366). Pendiente: causas de muerte de :374 y :378 (el motor usa su propio texto) |
| Ambusher | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); ascenso a Mafioso cuando mueren los demás asesinos (Ambusher.md:228, hecho en la revisión) |
| Blackmailer | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Susurros que el Blackmailer oye: hecho (lote 4, E8, Blackmailer.md:207, 375; vivo y muerto); no silencia a un encarcelado, con los dos avisos de la wiki: hecho (lote 4, E9, Blackmailer.md:221, 395); "I am blackmailed." en juicio, una vez: hecho (lote 4, E11, Blackmailer.md:213) |
| Bootlegger | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Auditoría completa (lote 5, F6). Verificado: Framer.md:42, 148, 196, 198, 200, 202, 254, 280, 344 (test en `night.test.ts`), promoción Framer.md:43, 150 (test). Lote 6: Framer.md:252 (los Framer no mueren a Trampas) verificado con test en `trapper-un-visitante.test.ts`. Pendiente: Framer.md:196 (prioridad sobre el Douse del Arsonist: fuera de MVP) |
| Godfather | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Transporter (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030) y frente a Tavern Keeper o Jailor; Death Note (SKIPPED en lote 6, G9: Death_Note_ToS.md:15 fija 400 caracteres, pero :17 fija el momento solo como "while the victims are being announced in the morning", una ventana de interfaz sin fase en el motor); aviso de la orden |
| Hypnotist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | Testamento del limpiado: hecho (lote 4, E10, Janitor.md:222-228), solo para el Janitor |
| Mafioso | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Death Note (SKIPPED, ver Godfather) |

Notas:
- **Icono y arte (g, lote 3, D3):** los 29 roles del MVP muestran el icono de la wiki en la carta y la revelación, y la ilustración (skin) donde existe. Es arte de la wiki reutilizado con permiso del equipo, no arte propio: por eso g queda en ◐. Ambusher, Blackmailer y Framer no tienen skin en la wiki (SKIPPED: solo icono). Ver `apps/web/src/lib/roleImages.ts` y `data/README.md`.
- **Vampire Hunter** sale del MVP (sin Vampiros no tiene acción). Ver `17067aa`.
- **Investigador por grupos (lote 3, D1):** el resultado es el grupo de la tabla "Classic Investigator Results" de `docs/roles/Investigator.md` (`packages/engine/src/rules/investigation.ts`). Framed da el grupo de Framer; disfrazado, el del rol aparente. Crusader, Psychic, Tracker y Trapper no tienen fila en esa tabla: SKIPPED, columna c en ◐.
- **Victoria (d, lote 3, D2):** `packages/engine/test/victoria-por-rol.test.ts` prueba ganar y perder con la facción de cada rol del MVP. Lote 5 (F4, F5): las condiciones 1 contra 1 de roles MVP (Victory_ToS.md:33, 39, 1030) están en `rules/stalemate.ts`, con tests en `stalemate.test.ts` y `victoria-por-rol.test.ts`. SKIPPED por no ser MVP o ser de Coven/Neutral: Victory_ToS.md:49 (Coven), :59 (Vampire), :65 (Serial Killer), :71 (Arsonist), :81 (Werewolf), :41 y :51 (modo Town Traitor), :33 en lo que toca a Witch. Survivor y Witch no están en el MVP.
- **Icono y arte (g):** los iconos son arte de la wiki. No hay ilustración propia.
- **Mensajes (h, lote 3, D5):** hechos los avisos de curado (Doctor), balas y alertas que quedan (Vigilante, Veteran), rol del limpiado (Janitor), prisionero (Jailor) y los dos de la Psíquica (pocos vivos y sin Town/Neutral Benign). Cada uno tiene test en `packages/engine/test/mensajes-por-rol.test.ts` o `apps/web/src/lib/log.test.ts`. Timing elegido: los avisos de usos y de rol salen al amanecer (la wiki no fija la hora de "You have (#) bullet(s) left").
- **Narración (h):** textos del registro por causa y por rol en `apps/web/src/lib/log.ts`; faltan los mensajes exactos de la wiki donde no se han añadido.
- **Revisión de las contradicciones de la wiki** (ver `docs/roles/`):
  - *Ambusher (resuelto):* Ambusher.md:228 dice que asciende cuando mueren los demás asesinos. El código lo contaba como asesino y no ascendía; corregido.
  - *Vigilante (resuelto):* la ficha (Especial, Vigilante.md:44 y :98) y el texto completo (:190) dicen "matar a un Town"; el "shoot" de las líneas 39 y 144 es el resumen. Se queda como está (muerte).
  - *Framer (resuelto, lote 5 F1):* Framer.md:344 (versión 3.3.0): "Frames will now last until an investigative role targets the Framed player instead of only the Night the player is Framed." Gana 3.3.0 sobre Sheriff.md:275 (consejo anterior). Roles investigativos: categoría "Investigation" del catálogo (Sheriff, Investigator, Consigliere, Lookout, Tracker, Spy); Psychic ("Information") no apunta a nadie. Código: `INVESTIGATIVE_ROLE_KEYS` en `rules/investigation.ts`.
  - *Tavern Keeper (resuelto, lote 5 F2):* Tavern_Keeper.md:181 ("You cannot Roleblock roles with Day abilties, because you have a Night ability.") gana sobre el consejo de :277 (bloquear al Mayor la noche 1 en Ranked), que es estrategia. Se aplica también al Bootlegger, que usa el mismo bloqueo (Bootlegger.md:198).
  - *Medium (lote 4, E2 y E3):* Medium.md:207 dice que varios Mediums se oyen entre sí; hecho. Medium.md:277 es consejo de estrategia, no regla. La sesión se elige de día (:203) y el objetivo recibe el aviso al empezar la noche (:209), no al amanecer: hecho.
  - *Trapper (lote 6, G1):* daña a uno de los atacantes que la visitan, elegido al azar (Keyword_System.md:349, "only one is harmed"). La wiki no dice cómo elegir.
  - *Detector de empate (lote 5, F4):* la tabla de `docs/wiki/Victory_ToS.md` (:397-1030) llega con celdas vacías, pero las filas tienen bloques de 36 líneas y se reconstruye sin ambigüedad: la matriz es simétrica salvo Necromancer (no MVP). Para roles MVP hay seis celdas con ganador: Godfather–Jailor (:542), Godfather–Tavern Keeper (:540), Godfather–Transporter (:538), Mafioso–Transporter (:574, "Town"), Mafioso–Tavern Keeper (:576), Mafioso–Jailor (:578); las mismas en la fila del otro rol. Supuesto: una celda vacía entre dos roles MVP significa que la partida sigue (la leyenda de :1038-1042 describe las cajas azules; la extracción no conserva colores). Código: `rules/stalemate.ts`; tests: `test/stalemate.test.ts`. Reglas aplicadas: :395 (una trampa puesta impide el detector) y :1030 (Jailor con ejecuciones). Celdas fuera de MVP (Arsonist, Werewolf, Serial Killer, Vampire, Coven, Juggernaut...): SKIPPED.
  - *Trapper (lote 5, F3):* la trampa se construye al final de la noche si no hay ninguna puesta ni lista (Trapper.md:213), queda lista la noche siguiente (Trapper.md:159, 252), y se coloca desde entonces (Trapper.md:217). Bloqueado esa noche, no se construye (Trapper.md:215). Desmontar la deja lista al instante (Trapper.md:229). Modelo: `TrapState.targetId: null` = construida; efecto `build` del rol pasivo.
- **Re-auditoría de Framer, Tavern Keeper y Trapper (lote 5, F6):** cada regla de la ficha y del texto completo, con su estado.
  - *Framer, verificado:* Framer.md:42, 148 (sospechoso para quien investiga, `night.test.ts`), :43, 150 (asciende cuando no quedan roles que maten: test nuevo), :196, :198, :200 (Investigator, `investigator-grupos.test.ts`), :202 (los encuadres siguen tras ascender: test nuevo), :254 (siguen tras morir el Framer: test nuevo), :344 (3.3.0, F1).
  - *Framer, no implementado:* :252 "Since Framers don't die to Traps" (depende de la víctima de la trampa, ver abajo); :196 "Your Frames take priority over an Arsonist Douse" (Arsonist fuera de MVP).
  - *Tavern Keeper, verificado:* :177 (bloqueo impide la habilidad de noche), :179 (Bootlegger inmune), :181 (F2), :205 (inmunes del MVP: Veteran, Transporter, Retributionist, Bootlegger, Tavern Keeper), :207 y :209 (tabla de empate), :257 (el Godfather mata si el Mafioso está bloqueado: test existente), :275 (el Transporter va antes).
  - *Tavern Keeper (resuelto, lote 6):* :183 verificado (G4); :347-357 hechos (G5). Ver la sección Lote 6.
  - *Trapper, verificado:* :46 (desmontar, test), :47 y :227 (una a la vez), :159, :213, :215, :217, :229, :252 (F3), :223 (poder Powerful y defensa de un ataque, tests de trampa existentes).
  - *Trapper (resuelto, lote 6):* los cuatro puntos de F6 están hechos: daño solo a atacantes (G1), revelación de roles (G2), mensajes (G3), inmunidad a la detección (G7). Ver la sección Lote 6.
  - *Doctor (corregido en lote 6, G6):* la nota de F6 decía que el Doctor debía quitar el encuadre. Es un error: Doctor.md:245 está bajo "You cannot:" (Doctor.md:233). El motor no quita el encuadre al curar, y eso queda verificado con test (`doctor-prohibiciones.test.ts`).

## Lote 6: reglas MVP de Trapper, Tavern Keeper, Doctor, Bodyguard, Vigilante, Veteran, Jailor

Cada ítem tiene un commit (en español, ver `git log`). Estado por ítem, con la cita de la regla y el test:

- **G1, DONE** (commit `6f3f0b3`): la trampa daña solo a un visitante que ataca (catálogo: ataque distinto de "None") y su defensa Poderosa vale solo contra ese atacante. Cita: Keyword_System.md:349; Trapper.md:219, 223, 225. Pruebas corregidas (la wiki las contradecía): `trapper-un-visitante.test.ts` y dos casos de `night.test.ts`.
- **G2, DONE** (`67c5144`): el Trapper recibe el rol real de todos los visitantes, sin nombres, en privado. Un Trapper muerto también dispara su trampa puesta. Cita: Keyword_System.md:349; Trapper.md:219, 221, 260, 362; nota 3.2.3 en Trapper.md:396. Pruebas: `trapper-revelacion.test.ts`.
- **G3, DONE** (`f31e9cf`): estado de la trampa al empezar la noche (Trapper.md:340-346), activación (:360-362), "Your trap attacked someone!" (:356), avisos "You triggered a trap!" (:348) y "You were attacked but a trap saved you!" (:352), causa de muerte "killed by a Trapper" (:364). Pruebas: `trapper-mensajes.test.ts` y `log.test.ts`.
- **G4, DONE, sin cambio de motor** (`cefb41d`): Tavern_Keeper.md:183. El motor marca al que abandona con `connected = false` y su `status` sigue "alive"; la validación solo exige vivo. Prueba: `tavern-keeper-avisos.test.ts`.
- **G5, DONE** (`ba76eda`): Tavern_Keeper.md:347-357 (y Bootlegger.md:340-350). Los avisos de inmune y de encarcelado van al jugador al que se intentó bloquear, como dice la wiki, no al Tavern Keeper. Cambio de motor: un encarcelado ya no queda bloqueado por el Tavern Keeper. Prueba: `tavern-keeper-avisos.test.ts`.
- **G6, DONE, verificado** (`72ce59a`): Doctor.md:245 es una prohibición. Prueba: `doctor-prohibiciones.test.ts`.
- **G7, DONE, verificado** (`5b9a2df`): Trapper.md:39, 101; Godfather.md:245. La trampa muestra el rol real del Godfather y puede colocarse sobre él. Prueba: `trapper-inmunidad.test.ts`.
- **G8, DONE** (`4d3a121`, `6d8470a`, `875d037`, `ec7ac48`), un commit por rol:
  - Veteran: Veteran.md:478, 482 (la línea 402 que citaba el plan es estrategia).
  - Bodyguard: Bodyguard.md:426, 430, 434, 438.
  - Vigilante: Vigilante.md:358, 366.
  - Jailor: Jailor.md:550, 552, 562, 566; y el texto del prisionero (:558), sin cambiar la hora.
  - Pruebas: `mensajes-por-rol.test.ts` y `log.test.ts`.
- **G9, PARTIAL** (`fbb51eb`):
  - Jailor, DONE: selección múltiple (Jailor.md:322; Death_Note_ToS.md:11 y :76-92). Death_Note_ToS.md:74 ("choose between") se descarta por contradecir Jailor.md:322 y :11; la página del rol gana. Prueba: `jailor-motivos.test.ts`.
  - Godfather y Mafioso, SKIPPED: Death_Note_ToS.md:15 fija 400 caracteres, pero :17 fija el momento solo como "while the victims are being announced in the morning". Es una ventana de interfaz que el motor no tiene como fase, así que no se puede implementar sin inventar la hora.

Verificación: `pnpm check` en verde tras cada commit de ítem. Pruebas del motor: `packages/engine/test` (cada archivo citado arriba); de la web: `apps/web/src/lib/log.test.ts`.

### Reglas MVP de la wiki que siguen sin implementar

- Death Note de Godfather y Mafioso: Death_Note_ToS.md:5, 15, 17 (SKIPPED, ver G9).
- Bodyguard: "transported into yourself" no consume el chaleco: Bodyguard.md:248.
- Textos de causa de muerte que no son los de la wiki (el motor usa `CAUSE_ES` de `apps/web/src/lib/log.ts`): Bodyguard.md:446 y :450; Vigilante.md:374 y :378; Veteran.md:490; Jailor.md:602. (El de la trampa sí se cambió en G3.)
- Jailor: el aviso del prisionero se emite al encarcelar y no al empezar la noche (Jailor.md:558).
- Errores que la wiki documenta y que no se replican: Trapper.md:239, 241, 243, 372 (son "bugs" de la wiki, no reglas).
- Filas de la tabla de arriba con pendientes anteriores a este lote que no son del alcance de G1-G9: Forger (testamento falsificado) y Mayor/Vampire (fuera de MVP).
