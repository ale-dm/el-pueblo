# Estado de los roles MVP frente al checklist

Derivado de las auditorías de solo lectura (ficha, texto completo de la wiki, código y tests) y de los lotes de correcciones 1 y 2 (ver `git log`). No es una re-auditoría completa: Framer no tiene auditoría terminada.

Leyenda: ✓ hecho y cubierto por test · ◐ parcial · ✗ no hecho · — no aplica en el MVP

Columnas (checklist de cada `docs/roles/<Rol>.md`, sección "Implementación"):
a. definido en el motor con prioridad y facción · b. acción nocturna validada · c. resultado de investigación correcto · d. victoria/derrota comprobada en tests · e. tests unitarios del rol · f. carta y texto de ayuda · g. icono e ilustración propios · h. narración de sus eventos

| Rol | a | b | c | d | e | f | g | h | Pendiente principal |
|---|---|---|---|---|---|---|---|---|---|
| Bodyguard | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador por grupos; vest (autoprotección) no implementado |
| Crusader | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador por grupos; Crusader es solo Coven en la wiki (alcance MVP sin decidir) |
| Doctor | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador por grupos; mensajes de "curado" |
| Investigator | ✓ | ✓ | ✗ | ✗ | ◐ | ◐ | ✗ | ◐ | Resultados por grupos de rol de la wiki (no alineamiento) |
| Jailor | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador; Death Note; avisos al prisionero y al equipo |
| Lookout | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador; texto en inglés de la wiki |
| Mayor | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Restricción de susurros con Mayor revelado (sin implementar) |
| Medium | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Varios Mediums (SKIPPED: fuentes contradictorias); fase de la sesión (wiki dice Día) |
| Psychic | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Mensajes de "pocos vivos" y "sin Town" |
| Retributionist | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Zombi limitado a una habilidad de un objetivo; exclusiones de roles |
| Sheriff | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Framer: persistencia del encuadre (SKIPPED, contradicción wiki) |
| Spy | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Bug simplificado (5 etiquetas, no la lista completa de Spy.md) |
| Tavern Keeper | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Bloqueo de roles de solo día (SKIPPED, contradicción wiki) |
| Tracker | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador; visitas de roles de dos objetivos (hecho en lote 2) |
| Transporter | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador; mensaje de "transportado" (lote 2) |
| Trapper | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Elegir un visitante (SKIPPED); fase de construcción (SKIPPED, wiki exige noche de construcción) |
| Veteran | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Mensaje de atacante bloqueado por la alerta |
| Vigilante | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Mensajes de disparo y de vuelta de la noche |
| Ambusher | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Ascenso a Mafioso (SKIPPED: wiki contradictoria con su categoría) |
| Blackmailer | ✓ | ◐ | ◐ | ✗ | ◐ | ◐ | ✗ | ◐ | Susurros que el Blackmailer oye (no implementado); aviso de bloqueo en cárcel |
| Bootlegger | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Investigador; orden de ascenso aplicado |
| Consigliere | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ◐ | Rol real aun con disfraz (hecho) |
| Disguiser | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ✓ | Lookout y Spy (hecho en lote 2); Investigador |
| Forger | ✓ | ◐ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Texto de testamento falsificado (no implementado); validación de Mafia |
| Framer | ? | ? | ? | ✗ | ◐ | ? | ✗ | ? | Auditoría no terminada; persistencia del encuadre (SKIPPED) |
| Godfather | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Death Note; aviso de la orden |
| Hypnotist | ✓ | ✓ | ◐ | ✗ | ✓ | ✓ | ✗ | ✓ | Investigador; Spy (Bug no revela mensajes) |
| Janitor | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ✓ | Investigador; el Janitor ve rol y testamento (no implementado) |
| Mafioso | ✓ | ✓ | ◐ | ✗ | ✓ | ◐ | ✗ | ◐ | Death Note; aviso de la orden |

Notas:
- **Vampire Hunter** sale del MVP (sin Vampiros no tiene acción). Ver `17067aa`.
- **Investigador por grupos** afecta a casi todos los roles: hoy devuelve el alineamiento. Requiere una tabla por rol con revisión humana. Sin esto, la columna c queda en ◐.
- **Victoria (d):** ningún rol tiene test específico de victoria o derrota; solo hay tests genéricos de `checkVictory`.
- **Icono y arte (g):** los iconos son arte de la wiki. No hay ilustración propia.
- **Narración (h):** textos del registro por causa y por rol en `apps/web/src/lib/log.ts`; faltan los mensajes exactos de la wiki donde no se han añadido.
- **Contradicciones de la wiki** (no implementadas, se decide con el equipo): Framer (encuadre), Tavern Keeper (bloqueo de solo día), Ambusher (ascenso), Medium (varios Mediums y fase de la sesión), Vigilante (culpa por cualquier Town o solo por muerte).
