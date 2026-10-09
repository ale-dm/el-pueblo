# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1 y 2 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | vest (autoprotección) no implementado |
| Crusader | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | mensajes de "curado" |
| Investigator | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✗ | ◐ | Texto de ayuda y narración (f, h) |
| Jailor | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Death Note; avisos al prisionero y al equipo |
| Lookout | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Restricción de susurros con Mayor revelado (sin implementar) |
| Medium | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Varios Mediums (SKIPPED: fuentes contradictorias); fase de la sesión (wiki dice Día) |
| Psychic | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Mensajes de "pocos vivos" y "sin Town" |
| Retributionist | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Zombi limitado a una habilidad de un objetivo; exclusiones de roles |
| Sheriff | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador hecho; Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Bug simplificado (5 etiquetas, no la lista completa de Spy.md) |
| Tavern Keeper | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Bloqueo de roles de solo día (SKIPPED, contradicción wiki) |
| Tracker | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Sin fila en la tabla Classic (solo Coven): Investigador SKIPPED. Elegir un visitante (SKIPPED); fase de construcción (SKIPPED, wiki exige noche de construcción) |
| Veteran | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Mensaje de atacante bloqueado por la alerta |
| Vigilante | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Mensajes de disparo y de vuelta de la noche |
| Ambusher | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Ascenso a Mafioso (SKIPPED: wiki contradictoria con su categoría) |
| Blackmailer | ✓ | ◐ | ✓ | ✗ | ◐ | ◐ | ✗ | ◐ | Susurros que el Blackmailer oye (no implementado); aviso de bloqueo en cárcel |
| Bootlegger | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ◐ | Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ✓ | Lookout y Spy (hecho en lote 2) |
| Forger | ✓ | ◐ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ? | ? | ? | ✗ | ◐ | ? | ✗ | ? | Auditoría no terminada; persistencia del encuadre (SKIPPED) |
| Godfather | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Death Note; aviso de la orden |
| Hypnotist | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ✓ | el Janitor ve rol y testamento (no implementado) |
| Mafioso | ✓ | ✓ | ✓ | ✗ | ✓ | ◐ | ✗ | ◐ | Death Note; aviso de la orden |

Notas:
- **Vampire Hunter** sale del MVP (sin Vampiros no tiene acción). Ver `17067aa`.
- **Investigador por grupos (lote 3, D1):** el resultado es el grupo de la tabla "Classic Investigator Results" de `docs/wiki/Investigator.md` (`packages/engine/src/rules/investigation.ts`). Framed da el grupo de Framer; disfrazado, el del rol aparente. Crusader, Psychic, Tracker y Trapper no tienen fila en esa tabla: SKIPPED, columna c en ◐.
- **Victoria (d):** ningún rol tiene test específico de victoria o derrota; solo hay tests genéricos de `checkVictory`.
- **Icono y arte (g):** los iconos son arte de la wiki. No hay ilustración propia.
- **Narración (h):** textos del registro por causa y por rol en `apps/web/src/lib/log.ts`; faltan los mensajes exactos de la wiki donde no se han añadido.
- **Contradicciones de la wiki** (no implementadas, se decide con el equipo): Framer (encuadre), Tavern Keeper (bloqueo de solo día), Ambusher (ascenso), Medium (varios Mediums y fase de la sesión), Vigilante (culpa por cualquier Town o solo por muerte).
