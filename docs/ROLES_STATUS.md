# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1, 2 y 3 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Chaleco antibalas (lote 4, E7: Bodyguard.md:240-250). Lote 6 (G8): contador del chaleco (Bodyguard.md:426) y avisos del duelo (:430, :434, :438), con test en `mensajes-por-rol.test.ts`. Lote 7 (H2, H3): el caso "transported into yourself" queda verificado con test (Bodyguard.md:248); causas de muerte de :446 y :450 hechas. Lote 8 (I3): forma plural "also killed" de :446 y :450 en el registro, PARTIAL: el motor emite una causa por víctima (ver Lote 8). |
| Crusader | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Your target was attacked last night!": hecho (lote 4, E4, Doctor.md:223, 251); Doctor.md:249 dice "attacked in any way", no fija el caso letal: se sigue :223. Lote 6 (G6): Doctor.md:245 es una prohibición ("You cannot"): verificado, no se quita el encuadre |
| Investigator | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | Texto de ayuda y narración (f, h) |
| Jailor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Lote 6 (G9): nota con varios motivos (Jailor.md:322, selección múltiple; Death_Note_ToS.md:76-92). Lote 6 (G8): avisos de la Mafia y del Coven encarcelados, del arrastre y de la primera noche (Jailor.md:550, 562, 566). Lote 7 (H4): el aviso "You were hauled off to jail!" sale al empezar la noche (Jailor.md:558, 560). Lote 7 (H3): causa de muerte de :602. Lote 8 (I3): forma plural de :602, PARTIAL (ver Lote 8) |
| Lookout | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Susurros con Mayor revelado: hecho (lote 4, E1, Mayor.md:203). Vampiro convertido que recupera susurros (Mayor.md:211): sin Vampiros en el MVP |
| Medium | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Varios Mediums que se oyen entre sí y aviso por cada uno: hecho (lote 4, E2, Medium.md:207, 211). Sesión elegida de Día para la noche siguiente: hecha (lote 4, E3, Medium.md:203) |
| Psychic | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED |
| Retributionist | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Zombi limitado a una habilidad de un objetivo. Lote 9 (K1): no resucita a Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter ni Retributionist (Retributionist.md:236); la excepción de Amnesiac queda fuera del MVP (SKIPPED) |
| Sheriff | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Investigador hecho; Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Lote 9 (K3): mensajes de la tabla de Spy.md:221-309 para roles MVP, un mensaje por acción directa; SKIPPED: trampa sin mensaje en la tabla, contraataque del Bodyguard (Spy.md:255, 257), y los demás con cita en Lote 9. Lote 9 (K4): el mensaje falso de la Hypnotist (Hypnotist.md:226; Spy.md:191) |
| Tavern Keeper | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Auditoría completa (lote 5, F6). Lote 6: TK.md:183 verificado (G4, abandonó la partida); avisos de bloqueo, inmune y encarcelado (G5, TK.md:347-357). Ningún pendiente del MVP |
| Tracker | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente al Mafioso (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Lote 6: daño solo a atacantes (G1, Keyword_System.md:349); revelación de roles de todos los visitantes, también con el Trapper muerto (G2, Trapper.md:219, 221, 260, 362); estado y avisos de la tabla de mensajes (G3, Trapper.md:340-366); inmunidad a la detección (G7, Trapper.md:39, 101). Pendiente del MVP: ninguno. Los errores que la wiki documenta (Trapper.md:239, 241, 243, 372) no se replican |
| Veteran | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Someone tried to attack you but your defense while on alert was too strong!" al Veteran, lote 4 E6 (Veteran.md:486). Lote 6 (G8): "You were shot by the Veteran you visited!" (Veteran.md:478) y "You shot someone who visited you last night!" (:482). Lote 7 (H3): causa de muerte de :490, hecha. Lote 8 (I3): forma plural de :490, PARTIAL (ver Lote 8). El aviso al atacante no está en la tabla de mensajes: Veteran.md:402 es una línea de estrategia, así que no se implementa |
| Vigilante | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensajes de culpa (lote 4, E5: Vigilante.md:362, 370) y balas (lote 3). Lote 6 (G8): "wait a day" en la primera noche (Vigilante.md:358) y "You were shot by a Vigilante!" (:366). Lote 7 (H3): causas de muerte de :374 y :378, hechas. Lote 8 (I3): formas plurales, PARTIAL (ver Lote 8) |
| Ambusher | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); ascenso a Mafioso cuando mueren los demás asesinos (Ambusher.md:228, hecho en la revisión) |
| Blackmailer | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Susurros que el Blackmailer oye: hecho (lote 4, E8, Blackmailer.md:207, 375; vivo y muerto); no silencia a un encarcelado, con los dos avisos de la wiki: hecho (lote 4, E9, Blackmailer.md:221, 395); "I am blackmailed." en juicio, una vez: hecho (lote 4, E11, Blackmailer.md:213) |
| Bootlegger | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Lote 7 (H5): testamento falsificado, rol por defecto Ambusher y objetivo no Mafia (Forger.md:34, 156, 204, 218, 242); primer Forger que elige (:226); verificados :208, :210, :212, :220, :222. Lote 8 (I2): Retributionist sobre cadáver falsificado (Forger.md:232), hecho. Pendiente: Forger.md:234 (Necromancer, fuera de MVP). SKIPPED: Forger.md:240 (sin borrador y sin decir qué pasa con el testamento; ver Lote 8) |
| Framer | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Auditoría completa (lote 5, F6). Verificado: Framer.md:42, 148, 196, 198, 200, 202, 254, 280, 344 (test en `night.test.ts`), promoción Framer.md:43, 150 (test). Lote 6: Framer.md:252 (los Framer no mueren a Trampas) verificado con test en `trapper-un-visitante.test.ts`. Pendiente: Framer.md:196 (prioridad sobre el Douse del Arsonist: fuera de MVP) |
| Godfather | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Transporter (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030) y frente a Tavern Keeper o Jailor; Death Note, lote 7 (H1): texto de hasta 400 caracteres de quien mata, que sale al amanecer (Death_Note_ToS.md:5, 15; Godfather.md:235). Lote 8 (I4): editarla en la mañana del anuncio (Death_Note_ToS.md:17), en el motor. Lote 9: botón en la web (K5, Death_Note_ToS.md:13, 17); aviso de defensa al ordenar un ataque, hecho (K2, Godfather.md:233; Messages_ToS.md:383). Cárcel: aviso general (Messages_ToS.md:1727); el de :1731 no se usa (PARTIAL, ver Lote 9) |
| Hypnotist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); el Spy que espía al objetivo ve el mensaje falso que recibe (lote 9, K4, Hypnotist.md:226) |
| Janitor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | Testamento del limpiado: hecho (lote 4, E10, Janitor.md:222-228), solo para el Janitor |
| Mafioso | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, hecho en lote 5: F4/F5, Victory_ToS.md:33, 39, 1030); Death Note, lote 7 (H1), lote 8 (I4) y botón en la web en el lote 9 (K5), ver Godfather (Mafioso.md:237, 279) |

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

## Lote 7: cierre de los pendientes del lote 6 (H1 a H5)

Cada ítem tiene un commit en español, con las citas de la wiki en el mensaje y en el nombre de los tests. Estado por ítem:

- **H1, PARTIAL** (`ff223b8`): nota de muerte del Godfather y del Mafioso.
  - Hecho: texto libre de hasta 400 caracteres (Death_Note_ToS.md:15; Last_Will_ToS.md:7 da el mismo límite). Solo la habilidad que mata la lleva (Godfather.md:235, Mafioso.md:237). La deja quien hace la muerte: el Mafioso con orden del Godfather, o el Godfather si el Mafioso está muerto o bloqueado (Godfather.md:26, 36; Mafioso.md:279). Sale al amanecer junto a la víctima (Death_Note_ToS.md:5, 17), en el registro. Sin muerte no hay nota.
  - Pendiente: Death_Note_ToS.md:17 permite cambiarla "while the victims are being announced in the morning". El motor no tiene fase de anuncio (la noche pasa a `discussion`), así que la nota se fija al enviar la acción nocturna. Es la solución que prevé el plan del lote 7.
  - Tests: `packages/engine/test/death-note.test.ts` (11) y `apps/web/src/lib/log.test.ts` (1).
- **H2, DONE, sin cambio de motor** (`53dafbd`): Bodyguard.md:248 ("transported into yourself, you will not use your bulletproof vest"). El motor ya lo cumplía: el chaleco es una habilidad aparte y la visita redirigida a sí mismo es un protect sin usos. Tests de regresión: `packages/engine/test/bodyguard-chaleco-transporte.test.ts` (3). Contexto: Bodyguard.md:11 y Transporter.md:212, 234.
- **H3, DONE** (`2acc8ab`): textos de causa de muerte de Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602, con la frase inglesa citada en `CAUSE_ES`. Cambio de motor: el Bodyguard que muere protegiendo tiene la causa `guarding` (antes `bodyguard`, que es la del atacante). Se actualizan dos expectativas de `night.test.ts`. Tests: un caso por causa en `apps/web/src/lib/log.test.ts` (6). Limitación: las partidas guardadas con la causa `bodyguard` de un Bodyguard que murió protegiendo se leen con el texto del atacante.
- **H4, DONE** (`c0038ac`): Jailor.md:558 y 560 ("You were hauled off to jail!", "Displays for prisoner at the start of the night"). El prisionero lo recibe al empezar la noche (`night.notice` "jailed", en `jailNotices`), y el registro ya no lo escribe al encarcelar de día. Nota sobre el plan: el aviso "The jailor has decided to Execute you." no es de inicio de noche en la wiki (Jailor.md:282, 572: al pulsar Execute); ya se emitía así y no se cambió. Tests: `packages/engine/test/mensajes-por-rol.test.ts` (1) y `apps/web/src/lib/log.test.ts` (1).
- **H5, PARTIAL** (`4020911`): Forger, contra docs/roles/Forger.md.
  - Hecho: el testamento falsificado reemplaza al real si la víctima muere esa noche (Forger.md:34, 156, 204) y, en blanco o sin texto, la víctima no deja testamento (:218). Límite de 400 caracteres (Last_Will_ToS.md:7). Falsificar a un miembro de la Mafia se rechaza (:204). Sin rol elegido se guarda como Ambusher (:242). Si dos Forger eligen a la misma víctima, manda el que envió su acción primero (:226). Supuesto: "primero" es el orden de `s.nightActions`, porque el de resolución es por asiento.
  - Verificado con test, sin cambio de código: :208 (visitar a un encarcelado no gasta uso), :210 (si la víctima no muere, la falsificación gasta un uso), :212 (solo cuenta si muere esa noche), :220 y :222 (con Janitor, no aparece la falsificación y el Janitor ve el rol y el testamento reales).
  - SKIPPED, Forger.md:240 ("If the Night ends without you saving your forgery, their role will default to Forger."): el motor no tiene borrador. Una falsificación sin guardar no existe, así que no se puede modelar sin inventar un estado.
  - Pendiente: Forger.md:232 y :234 (Retributionist y Necromancer no usan un cadáver falsificado con rol no visitante o no Town). Requiere guardar el rol que se muestra tras la muerte.
  - Conflicto resuelto: Forger.md:288 ("You can only edit your forged Last Will during the Night") frente a Forger.md:312 ("at any time during of the Day or Night"). Gana la regla de Mechanics (:204, "each Night"); :312 es consejo de estrategia.
  - Tests: `packages/engine/test/forger-testamento.test.ts` (13; el mensaje del commit dice 17, error mío), `mafia-town-support.test.ts` (una expectativa, antes "Elige una opción") y `apps/server/test/application/nightAbilityFlags.test.ts` (3).

### Reglas MVP de la wiki que siguen sin implementar (tras el lote 7)

- Death_Note_ToS.md:17: editar la nota durante el anuncio de víctimas de la mañana (H1, sin fase de anuncio en el motor).
- Forger.md:240: si la noche acaba sin guardar, el rol por defecto es Forger (H5, sin borrador en el motor).
- Forger.md:232 y :234: Retributionist y Necromancer sobre cadáver falsificado (H5).
- Last_Will_ToS.md:7 y Death_Note_ToS.md:15: el testamento admite 400 caracteres; el motor (`MAX_WILL_LENGTH` en `packages/engine/src/phases/night/collect.ts`) y la web (`MAX_WILL` en `apps/web/src/game/WillCard.tsx`) fijan 300. No estaba en H1 a H5: queda sin tocar.
- Formas plurales de las causas de muerte ("[They were] also killed by…"): Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602. El registro usa solo la forma simple.

## Lote 8: cierre de lo que quedó del lote 7 (I1 a I4)

Cada ítem tiene su commit (en español, con la cita en el mensaje y en el nombre del test). Estado por ítem:

- **I1, SKIPPED** (sin commit). El plan pedía que "falsificar sin elegir rol guarde Forger". La wiki dice lo contrario: Forger.md:242, "If you save your forgery and do not select a role, their role will default to Ambusher." Gana la regla explícita, que el motor ya cumple (`roles/mafia/forger.ts`, `defaultChoice: "ambusher"`; prueba `forger-testamento.test.ts`, "guardar sin elegir rol deja Ambusher"). Forger.md:240, "If the Night ends without you saving your forgery, their role will default to Forger.": SKIPPED. La frase no dice si el testamento se falsifica igual ni si gasta un uso cuando no se guarda, y el motor no tiene borrador (en la web el objetivo se elige en local y solo se envía al guardar, `apps/web/src/game/ActionPanel.tsx`). Implementarla obligaría a inventar esos dos puntos.
- **I2, DONE** (`25ec776`): Forger.md:232, con Retributionist.md:376 ("they can deny you corpses to use if they forge someone as a non-Town or non-visiting role"). El Retributionist no resucita un cadáver cuyo rol mostrado es no Town o no visitante, aunque el real sea Town visitante. El estado guarda el rol que muestra la muerte (`shownRoleKey`). Supuesto: "visitante" es el criterio de las visitas del motor (una habilidad a un jugador o a dos). La wiki no da la lista de roles visitantes: Abilities_ToS.md:948 no basta, porque no nombra a Sheriff ni Investigator. Conflicto: Retributionist.md:378 dice que un rol no Town falsificado como Town investigativo "won't produce any results" (un intento sin resultado, no un rechazo). Forger.md:232 es la regla explícita y se aplica; el :378 es consejo de estrategia. Prueba: `packages/engine/test/forger-retributionist.test.ts` (5; 3 fallan sin el cambio). Necromancer (Forger.md:234) no es MVP: sin cambios.
- **I3, PARTIAL** (`73a5bfe`). Regla explícita: Messages_ToS.md:151 ("If you die from 2 causes, your cause of death message will change to the "also" version") y :154 (cada causa aparece por separado en el registro). Textos "also": Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602. Hecho: el registro escribe cada causa extra en su línea, "Bea también ha sido ...", a partir del campo opcional `causes` (`apps/web/src/lib/log.ts`). Prueba: `apps/web/src/lib/log.test.ts`, bloque "varias causas de muerte" (4: una, dos, tres causas y sin `causes`). Pendiente: el motor emite una sola causa por víctima. En `pipeline.ts`, un ataque contra una víctima ya muerta se salta (`if (dead.has(atk.victimId)) continue;`) y `kill()` no registra una segunda causa. Registrarla cambia efectos (culpa, chaleco, aviso al atacante) que la wiki no fija para víctimas ya muertas: decisión aparte.
- **I4, DONE** (`71f5bb4`). Death_Note_ToS.md:17 ("you can change your Death Note while the victims are being announced in the morning"), con Death_Note_ToS.md:15 (400 caracteres) y Godfather.md:235. Comando `death.note.write` (`actorId`, `victimId`, `note`). Ventana: fase `day_1` o `discussion` con el `dayNumber` de la mañana que anuncia la víctima (noche + 1). Solo escribe el autor de la nota. Eventos: `death.note.authored` (privado al asesino, con la mañana y la nota) y `death.note.written` (público). El servidor rechaza un `actorId` ajeno (`submitCommand.ts`). Desviación: la wiki dice "while being announced"; el motor no tiene fase de anuncio, así que la ventana es toda la charla de esa mañana. Documentado en `docs/ENGINE.md`. Pruebas: `packages/engine/test/death-note-edicion.test.ts` (9) y `apps/server/test/application/commandAuth.test.ts` (+1). Pendiente: el botón de la web y la actualización del registro de la mañana (el registro sigue mostrando la nota original).
- Corrección de citas de lotes anteriores: la autoría de la nota de la Mafia cita Godfather.md:235 y Mafioso.md:279 (antes Godfather.md:36 y Mafioso.md:23, que no tratan de la nota).

### Reglas MVP de la wiki que siguen sin implementar (tras el lote 8)

Esta lista es lo registrado en la tabla de arriba y en los lotes 6 a 8, más lo que el lote 8 encontró. No es una re-auditoría de las 29 páginas: las reglas que no aparecen aquí no se han verificado en este lote.

- Forger.md:240: si la noche acaba sin guardar, el rol es Forger (SKIPPED, I1: la frase no fija testamento ni usos).
- Forger.md:234: Necromancer sobre cadáver falsificado. Fuera de MVP.
- Death_Note_ToS.md:13 y :17: botón para editar la nota en la web, y actualización del registro de la mañana. El motor ya lo permite (I4).
- Messages_ToS.md:151, :154; Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602: forma "also" con dos o más causas. El registro la tiene; el motor emite una causa (I3).
- Godfather.md:233: aviso al Godfather al ordenar un ataque (defensa o encarcelado). Pendiente según la tabla; no re-verificado en el lote 8.
- Spy.md:189, :191, :203, :205 y Hypnotist.md:226: el bug del Spy muestra solo 5 etiquetas, no la lista completa, y no muestra los mensajes que planta el Hypnotist. Pendiente según la tabla.
- Retributionist: "exclusiones de roles" (tabla, Retributionist). La tabla no cita la línea; falta buscarla.
- Jailor: `docs/ENGINE.md` (sección Pendiente) dice que el Jailor que ejecuta a un Town pierde sus ejecuciones. El motor marca `noExecute` (`pipeline.ts`). No verificado en el lote 8 si `jailor.ts` lo aplica.
- Framer.md:196: prioridad sobre el Douse del Arsonist. Fuera de MVP.
- Mayor.md:211: Vampiro convertido. Fuera de MVP.
- Retributionist.md:378 frente a Forger.md:232: contradicción resuelta a favor de Forger.md:232 (I2). No pendiente.
- Trapper.md:239, :241, :243, :372: errores documentados en la wiki, no reglas. No se replican.

### Verificación del lote 8

`pnpm check` en verde tras cada ítem con cambios (I2, I3, I4). Línea base antes del lote 8: engine 32 archivos y 417 pruebas, web 8 y 77, server 22 y 98. Al final: engine 34 y 431, web 8 y 81, server 22 y 99 (ver el informe final del lote).

## Lote 9: cierre de K1 a K7

Cada ítem tiene su commit en español, con la cita en el mensaje y en el nombre del test. Estado por ítem:

- **K1, DONE** (`3f1cddc`): Retributionist.md:236. No resucita a Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter ni Retributionist, con el rol real del muerto (`NOT_RESURRECTABLE_KEYS` en `roles/town/retributionist.ts`; `phases/night/collect.ts`). La excepción "if you were an Amnesiac" queda fuera del MVP: Amnesiac tiene `mvp = false` en `data/catalog/roles.json`. Prueba: `packages/engine/test/retributionist-no-resucitables.test.ts` (9). Supuesto: el rechazo usa el mismo texto para un cadáver falsificado, así que no revela el rol real.
- **K2, DONE, con una mitad PARTIAL** (`1c4f2de`): Godfather.md:233. El Godfather que ataca él mismo recibe "La defensa de tu objetivo fue demasiado fuerte para matarle." (Messages_ToS.md:383) cuando la defensa (curación, alerta, chaleco, trampa, defensa Basic) impide el ataque. Si el Mafioso ejecuta la orden, no lo recibe (Godfather.md:233). Desviación: Godfather.md:233 dice "has defense" y Messages_ToS.md:383 dice "higher Defense than the attacker's Attack value"; se sigue la regla del rol (cualquier defensa). Cárcel: el Godfather recibe el aviso general de objetivo encarcelado (Messages_ToS.md:1727). La frase específica de un rol que ataca (Messages_ToS.md:1731) no se usa: PARTIAL. Pruebas: `packages/engine/test/godfather-aviso-defensa.test.ts` (5), `mensajes-por-rol.test.ts` (una expectativa actualizada), `apps/web/src/lib/log.test.ts` (1).
- **K3, DONE, con SKIPPED** (`22709a1`): la tabla de Spy.md:221-309, un mensaje por acción directa para roles MVP: transporte (:225), bloqueo, incluso sin acción (:227), chantaje (:229), bloqueo a inmune (:263), ataque de la Mafia (:239), disparo del Vigilante (:243), disparo del Veterano al visitante (:247), muerte del Bodyguard que protege (:249), muerte del atacante por el Bodyguard (:259), defensa Basic (:261), curación (:237), repelido (:235), chaleco (:271), alerta (:273), culpa del Vigilante (:275). Cárcel: solo el aviso de cárcel (Spy.md:205). Claves en `pipeline.ts` (`tagSpy`, `SPY_KILL_TAG`), frases en `apps/web/src/lib/log.ts` (`bugText`). SKIPPED: la trampa no tiene mensaje en la tabla (se conserva "protect", que dice que alguien le protegió; no es texto de la wiki); Spy.md:255 y :257 (contraataque del Bodyguard curado o repelido: el motor no mira la defensa del atacante); Spy.md:277 y :283 (sin rol MVP que ataque al ser bloqueado, y sin disparador); Spy.md:293-309 ("This confirms your target as ...": sin disparador en la página); los de Coven, Arsonist, Serial Killer, Vampire, Werewolf y Witch (fuera de MVP). Visitas: la tabla del Spy no tiene mensaje de visita (SKIPPED). Pruebas: `packages/engine/test/spy-mensajes.test.ts` (17), `apps/web/src/lib/log.test.ts` (bloque "un mensaje por acción directa").
- **K4, DONE** (`f1e50e9`): Hypnotist.md:226 ("A Spy who bugs your target will receive the message you planted.") y Spy.md:191. El espionaje muestra el mensaje falso que recibe el objetivo, también el de inmunidad (Hypnotist.md:262). Prueba: `packages/engine/test/hypnotist-espia.test.ts` (3), `apps/web/src/lib/log.test.ts` (1).
- **K5, DONE** (`d85962b`): Death_Note_ToS.md:13, 17. Tarjeta "Tu nota de muerte" (`apps/web/src/game/DeathNoteCard.tsx`) para el autor, en day_1 o discussion de la mañana que anuncia la víctima; la ventana está en `apps/web/src/lib/deathNote.ts`, espejo de `writeDeathNote` del motor. El registro muestra la nota cambiada. Prueba: `apps/web/src/lib/deathNote.test.ts` (5), `log.test.ts` (1). Sin prueba de componente: la tarjeta no tiene test propio. Limitación: la línea del amanecer sigue con la nota del momento de la muerte, y el cambio aparece como línea nueva.
- **K6, DONE, con limitación** (`ccad384`): Messages_ToS.md:151, 154. El motor guarda `player.killed.causes` (la primera es `cause`) cuando un segundo ataque también habría matado. La culpa, el chaleco y las protecciones no cambian; la defensa se calcula en `defenseOf`, sin efectos. El registro ya escribe la línea "también". Prueba: `packages/engine/test/muerte-dos-causas.test.ts` (2). Limitación: no hay prueba del segundo ataque bloqueado; no encontré un escenario sin efectos colaterales.
- **K7, DONE** (`0ecae03`): `docs/ENGINE.md` decía que el Jailor no pierde sus ejecuciones. Sí lo hace (Jailor.md:45, 184, 294; `noExecute` en `pipeline.ts`, `collect.ts`). Prueba: `packages/engine/test/jailor.test.ts`, "tras ejecutar a un Town, no puede volver a ejecutar".

Resuelto fuera de este lote: el límite del testamento de 300 a 400 caracteres (lote 7, pendiente) quedó en `9d63106`; `MAX_WILL_LENGTH` y `MAX_WILL` valen 400.

### Reglas MVP de la wiki que siguen sin implementar (tras el lote 9)

Lista de lo verificado en este lote y de lo arrastrado de los lotes 6 a 8. No es una re-auditoría completa de las 29 páginas: las reglas que no aparecen aquí no se han verificado en este lote.

- Jailor.md:294 y Messages_ToS.md:1687-1689: "You have slain a town member so you can't attack again." al encarcelar, tras ejecutar a un Town. No está en el código (búsqueda vacía). Pendiente.
- Godfather.md:233: el aviso de cárcel del Godfather usa el texto general, no el de Messages_ToS.md:1731 (PARTIAL, K2).
- Spy.md:255, :257: "A Bodyguard attacked your target but ..." (contraataque curado o repelido). El motor mata al atacante sin mirar su defensa (`pipeline.ts`, rama `bodyguard`).
- Spy.md:277, :283, :293-309: sin disparador en la página (SKIPPED, K3).
- Spy: la trampa no tiene mensaje en la tabla del Spy (SKIPPED, K3).
- Retributionist.md:236: excepción de Amnesiac (fuera de MVP, SKIPPED, K1).
- Forger.md:240: si la noche acaba sin guardar, el rol es Forger (SKIPPED, I1).
- Forger.md:234: Necromancer sobre cadáver falsificado (fuera de MVP).
- Death_Note_ToS.md:17: "while the victims are being announced in the morning": el motor no tiene fase de anuncio; se usa day_1 o discussion de esa mañana (desviación, I4 y K5).
- Framer.md:196 y Mayor.md:211: fuera de MVP.
- Trapper.md:239, :241, :243, :372: errores documentados en la wiki, no reglas. No se replican.
- Web: el selector de resurrección ofrece a cualquier muerto; el motor rechaza los excluidos (K1). No es regla de la wiki, pero la interfaz no filtra.

### Verificación del lote 9

`pnpm check` en verde tras cada ítem con cambios (K1 a K7). Línea base (fin del lote 8): engine 34 archivos y 431 pruebas, web 8 y 81, server 22 y 99. Al final: engine 39 archivos y 467 pruebas, web 9 y 91, server 22 y 99.
