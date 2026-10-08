import json
g=json.load(open("full/gen_index.json"))
R="/home/user/el-pueblo/docs/CHECKLIST.md"
mvp=[r for r in g["roles"] if r["mvp"]]; later=[r for r in g["roles"] if not r["mvp"]]
def role_lines(rs): return [f"- [ ] [{r['name']}](roles/{r['slug']}.md) · {r['faction']}" for r in rs]
def wiki(slug): return f"[{slug}](wiki/{slug}.md)"
out=["# Checklist — El Pueblo (fase 1: Mafia)","",
"Marca cada casilla al terminar. Las casillas de roles y de páginas de la wiki se completan en orden: primero el motor, luego los roles.","",
"Leyenda: **[roles]** cada archivo tiene su propia lista de implementación. **[motor]** lo que el motor debe cubrir. **[wiki]** lectura y reflejo de cada página.","",
"## 1. Motor (`packages/engine`)","",
"### 1.1 Estado y fases",
f"- [ ] Modelo de partida: jugadores, roles, fase actual, día/noche, registro de eventos — {wiki('Phases')}",
f"- [ ] Fases en orden: Día 1, Discusión, Votación, Defensa, Juicio, Últimas palabras, Noche — {wiki('Phases')}",
"- [ ] Tiempos por fase configurables (estándar, Rapid, Fast) — `data/game_config.json`",
"- [ ] Transiciones que saltan Defensa/Juicio/Últimas palabras si nadie va a juicio",
"- [ ] Fin del Día al tercer juicio, aunque queden segundos — `data/game_config.json`",
f"- [ ] Tribunal del Marshal (fuera de MVP si no hay Marshal) — {wiki('Trial_System')}",
"",
"### 1.2 Votación y juicio",
f"- [ ] Umbral de votos `ceil(vivos / 2)` — {wiki('Trial_System')}",
f"- [ ] Votos de desconectados cuentan como muertos en la votación — {wiki('Trial_System')}",
f"- [ ] Votación nominal y anónima (modifier Anon) — {wiki('Trial_System')}",
f"- [ ] Ejecución (Hanging) y Últimas palabras — {wiki('Hanging_ToS')}",
"",
"### 1.3 Orden de acciones nocturnas",
f"- [ ] Prioridades de acción por rol (campo `priority` en `roles.json`) — {wiki('Abilities_ToS')}",
f"- [ ] Bloqueo (Roleblock) antes de cualquier acción — {wiki('Attributes_ToS')}",
f"- [ ] Protección vs ataque: el Doctor salva del Mafioso — {wiki('Abilities_ToS')}",
f"- [ ] Inmunidades: Control, Roleblock, Detection — {wiki('Attributes_ToS')}",
"- [ ] Acción de la Mafia: el Godfather da la orden, el Mafioso ejecuta si no hay orden",
"- [ ] Acción sin objetivo válido = sin efecto y sin error",
"",
"### 1.4 Muerte y estado",
f"- [ ] Estados de muerte: vivo, muerto, desconectado — {wiki('Death_state')}",
f"- [ ] Última voluntad (Last Will) y su revelación al morir — {wiki('Last_Will_ToS')}",
f"- [ ] Muertos pasan a chat de muertos y no pueden votar — {wiki('Death_state')}",
"- [ ] Muerte por ataque, ejecución y desconexión registradas en el log",
"",
"### 1.5 Victoria",
f"- [ ] Town gana cuando no quedan miembros vivos de Mafia — {wiki('Victory_ToS')}",
f"- [ ] Mafia gana cuando no queda ningún Town vivo — {wiki('Victory_ToS')}",
"- [ ] Empate definido (pendiente en GDD §5.5)",
f"- [ ] Reglas 1 contra 1 (fase posterior, no MVP) — {wiki('Victory_ToS')}",
"",
"### 1.6 Chat y visibilidad",
f"- [ ] Canales público, Mafia, muertos — {wiki('Chat_ToS')}",
f"- [ ] Filtrado de mensajes por canal en el servidor — {wiki('Messages_ToS')}",
"- [ ] Silencio de jugadores bloqueados en el Día (Blackmailer, fase posterior)",
"",
"### 1.7 Configuración de sala",
f"- [ ] Reglas del host (Custom): al menos un rol opuesto, máximo 4 Mafia, máximo 6 de un rol, etc. — {wiki('Game_Modes_ToS')}",
f"- [ ] Validación de roles activos al crear sala — {wiki('Settings_ToS')}",
f"- [ ] Modo Classic (15 jugadores, roles fijos) y All Any (aleatorio) — {wiki('Game_Modes_ToS')}",
"- [ ] Reparto de facciones por número de jugadores (GDD §5.1, pendiente de confirmar)",
"",
"### 1.8 Pruebas del motor",
"- [ ] Test: partida de 10 jugadores completa hasta victoria",
"- [ ] Test: partida de 15 jugadores con todos los roles MVP",
"- [ ] Test: votación con umbrales en distintos tamaños",
"- [ ] Test: orden de acciones con bloqueo, protección y ataque",
"- [ ] Test: victoria de Town y de Mafia en casos límite",
"- [ ] Test: simulación de 1000 partidas aleatorias sin errores",
"",
"## 2. Roles MVP (Mafia y Town)",
f"Cada archivo tiene su ficha completa, texto de la wiki y lista de implementación. Total: {len(mvp)}.",
""]
out+=role_lines(mvp)
out+=["","## 3. Roles de fase posterior (Neutral y Coven, solo referencia)",""]
out+=role_lines(later)
out+=["","## 4. Lectura y reflejo de las páginas de la wiki",
"Cada página tiene su texto completo en `docs/wiki/`. Marca cuando el motor, los tests o la app reflejan lo que dice.",""]
for w in g["wiki"]:
    out.append(f"- [ ] [{w['title']}](wiki/{w['slug']}.md)")
out.append("")
open(R,"w").write("\n".join(out))
print("checklist lines:", len(out), "| roles MVP:", len(mvp), "| later:", len(later), "| wiki items:", len(g["wiki"]))
