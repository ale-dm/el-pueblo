# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1 y 2 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | vest (autoprotección) no implementado |
| Crusader | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | mensajes de "curado" |
| Investigator | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | Texto de ayuda y narración (f, h) |
| Jailor | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a la Mafia (Victory ToS, SKIPPED); Death Note (SKIPPED: la wiki dice elegir una opción y también marcar varias, `docs/wiki/Death_Note_ToS.md:11,74` y `docs/roles/Jailor.md:322`); avisos al prisionero y al equipo |
| Lookout | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Restricción de susurros con Mayor revelado (sin implementar) |
| Medium | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Varios Mediums (SKIPPED: fuentes contradictorias); fase de la sesión (wiki dice Día) |
| Psychic | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Mensajes de "pocos vivos" y "sin Town" |
| Retributionist | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Zombi limitado a una habilidad de un objetivo; exclusiones de roles |
| Sheriff | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Investigador hecho; Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Bug simplificado (5 etiquetas, no la lista completa de Spy.md) |
| Tavern Keeper | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a la Mafia (Victory ToS, SKIPPED); Bloqueo de roles de solo día (SKIPPED, contradicción wiki) |
| Tracker | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente al Mafioso (Victory ToS, SKIPPED); mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Elegir un visitante (SKIPPED); fase de construcción (SKIPPED, wiki exige noche de construcción) |
| Veteran | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensaje de atacante bloqueado por la alerta |
| Vigilante | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Mensajes de disparo y de vuelta de la noche |
| Ambusher | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Ascenso a Mafioso (SKIPPED: wiki contradictoria con su categoría) |
| Blackmailer | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Susurros que el Blackmailer oye (no implementado); aviso de bloqueo en cárcel |
| Bootlegger | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ? | ? | ? | ◐ | ◐ | ? | ◐ | ? | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Auditoría no terminada; persistencia del encuadre (SKIPPED) |
| Godfather | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Transporter (Victory ToS, SKIPPED) y frente a Tavern Keeper o Jailor; Death Note (SKIPPED: texto libre de la Death Note común a los roles asesinos, `docs/wiki/Death_Note_ToS.md:15`); aviso de la orden |
| Hypnotist | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); el Janitor ve rol y testamento (no implementado) |
| Mafioso | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ◐ | 1 contra 1 frente a Tavern Keeper o Jailor (Victory ToS, SKIPPED); Death Note; aviso de la orden |

Notas:
- **Icono y arte (g, lote 3, D3):** los 29 roles del MVP muestran el icono de la wiki en la carta y la revelación, y la ilustración (skin) donde existe. Es arte de la wiki reutilizado con permiso del equipo, no arte propio: por eso g queda en ◐. Ambusher, Blackmailer y Framer no tienen skin en la wiki (SKIPPED: solo icono). Ver `apps/web/src/lib/roleImages.ts` y `data/README.md`.
- **Vampire Hunter** sale del MVP (sin Vampiros no tiene acción). Ver `17067aa`.
- **Investigador por grupos (lote 3, D1):** el resultado es el grupo de la tabla "Classic Investigator Results" de `docs/wiki/Investigator.md` (`packages/engine/src/rules/investigation.ts`). Framed da el grupo de Framer; disfrazado, el del rol aparente. Crusader, Psychic, Tracker y Trapper no tienen fila en esa tabla: SKIPPED, columna c en ◐.
- **Victoria (d, lote 3, D2):** `packages/engine/test/victoria-por-rol.test.ts` prueba ganar y perder con la facción de cada rol del MVP. ◐ en los roles con una condición 1 contra 1 de `docs/wiki/Victory_ToS.md` que el motor no modela (Transporter, Jailor, Tavern Keeper y la Mafia en general; el Godfather además gana contra un Transporter). Survivor y Witch, que también aparecen en "Gana con", no están en el MVP.
- **Icono y arte (g):** los iconos son arte de la wiki. No hay ilustración propia.
- **Narración (h):** textos del registro por causa y por rol en `apps/web/src/lib/log.ts`; faltan los mensajes exactos de la wiki donde no se han añadido.
- **Contradicciones de la wiki** (no implementadas, se decide con el equipo): Framer (encuadre), Tavern Keeper (bloqueo de solo día), Ambusher (ascenso), Medium (varios Mediums y fase de la sesión), Vigilante (culpa por cualquier Town o solo por muerte).
