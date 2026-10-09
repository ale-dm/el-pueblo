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
| Tavern Keeper | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a la Mafia (Victory ToS, SKIPPED); Bloqueo de roles de solo día (SKIPPED, contradicción wiki) |
| Tracker | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente al Mafioso (Victory ToS, SKIPPED); mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitante al azar (lote 3, D6; la wiki dice "one attacker" pero no cómo se elige); fase de construcción (SKIPPED, wiki exige noche de construcción) |
| Veteran | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Aviso "Someone tried to attack you but your defense while on alert was too strong!" al Veteran, lote 4 E6 (Veteran.md:486; el plan decía el atacante, la wiki dice "you" = Veteran). Mensaje de "defense too strong" al atacante (generic, Veteran.md:402): no implementado |
| Vigilante | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensajes de culpa (lote 4, E5: Vigilante.md:362, 370) y balas (lote 3) hechos. Pendiente: mensaje de la primera noche "You decide to wait a day before using your gun." (Vigilante.md:358, no está en el alcance de E5) |
| Ambusher | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); ascenso a Mafioso cuando mueren los demás asesinos (Ambusher.md:228, hecho en la revisión) |
| Blackmailer | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Susurros que el Blackmailer oye: hecho (lote 4, E8, Blackmailer.md:207, 375; vivo y muerto); aviso de bloqueo en cárcel (pendiente, E9) |
| Bootlegger | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ? | ? | ? | ◐ | ◐ | ? | ◐ | ? | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Auditoría no terminada; persistencia del encuadre (SKIPPED) |
| Godfather | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Transporter (Victory ToS, SKIPPED) y frente a Tavern Keeper o Jailor; Death Note (SKIPPED: texto libre de la Death Note común a los roles asesinos, `docs/wiki/Death_Note_ToS.md:15`); aviso de la orden |
| Hypnotist | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | testamento del limpiado (pendiente; el rol está hecho) |
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
  - *Framer (decisión pendiente):* Framer.md:344 (versión 3.3.0) dice que el encuadre dura hasta que un rol investigador apunta al objetivo; Sheriff.md:275 es consejo antiguo. Implementar la versión 3.3.0 requiere decidir qué roles cuentan como "investigativos".
  - *Tavern Keeper (decisión pendiente):* Tavern_Keeper.md:181 dice que no se pueden bloquear roles con habilidad de día; :277 aconseja bloquear al Mayor la noche 1 en Ranked. La regla es 181; el consejo de :277 contradice la regla.
  - *Medium (lote 4, E2 y E3):* Medium.md:207 dice que varios Mediums se oyen entre sí; hecho. Medium.md:277 es consejo de estrategia, no regla. La sesión se elige de día (:203) y el objetivo recibe el aviso al empezar la noche (:209), no al amanecer: hecho.
  - *Trapper (decisión tomada):* elige al visitante al azar, porque la wiki no dice cómo elegir.
