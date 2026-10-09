# Checklist — El Pueblo (fase 1: Mafia)

Marca cada casilla al terminar. Las casillas de roles y de páginas de la wiki se completan en orden: primero el motor, luego los roles.

Leyenda: **[roles]** cada archivo tiene su propia lista de implementación. **[motor]** lo que el motor debe cubrir. **[wiki]** lectura y reflejo de cada página.

## 1. Motor (`packages/engine`)

### 1.1 Estado y fases
- [x] Modelo de partida: jugadores, roles, fase actual, día/noche, registro de eventos — [Phases](wiki/Phases.md) · test: `packages/engine/test/replay.test.ts`
- [x] Fases en orden: Día 1 (charla, sin votación) → Noche 1; después Discusión, Votación, Defensa, Juicio, Últimas palabras, Noche — [Phases](wiki/Phases.md) · test: `packages/engine/test/phaseFlow.test.ts`, `packages/engine/test/day.test.ts`
- [x] Tiempos por fase configurables (estándar y Rapid ToS1) — `data/game_config.json` · test: `apps/server/test/adapters/catalog-json.test.ts` (carga los dos modos), `apps/server/test/application/votingTime.test.ts`
- [x] Transiciones que saltan Defensa/Juicio/Últimas palabras si nadie va a juicio · test: `packages/engine/test/day.test.ts` ("sin mayoría no hay juicio")
- [x] Fin del Día al tercer juicio, aunque queden segundos — `data/game_config.json` · test: `packages/engine/test/day.test.ts` ("tras tres juicios el día termina")
- [ ] Tribunal del Marshal (fuera de MVP si no hay Marshal) — [Trial_System](wiki/Trial_System.md) · pendiente: no hay Marshal en el código ni en el MVP

### 1.2 Votación y juicio
- [x] Umbral de votos `ceil(vivos / 2)` — [Trial_System](wiki/Trial_System.md) · test: `packages/engine/test/voting.test.ts` (tabla de la wiki)
- [ ] Votos de desconectados cuentan como muertos en la votación — [Trial_System](wiki/Trial_System.md) · pendiente: `packages/engine/test/day.test.ts` prueba que no votan, pero ningún test fija que el umbral los excluya
- [ ] Votación nominal y anónima (modifier Anon) — [Trial_System](wiki/Trial_System.md) · pendiente: el modificador Anon no está implementado
- [x] Ejecución (Hanging) y Últimas palabras — [Hanging_ToS](wiki/Hanging_ToS.md) · test: `packages/engine/test/day.test.ts` ("culpable por mayoría")

### 1.3 Orden de acciones nocturnas
- [x] Prioridades de acción por rol (campo `priority` en `roles.json`) — [Abilities_ToS](wiki/Abilities_ToS.md) · test: `packages/engine/test/helpers/catalogSmoke.test.ts` (prioridad del handler = catálogo), `packages/engine/test/night.test.ts` (el Bootlegger, prioridad 2, actúa antes que el Doctor, prioridad 3)
- [x] Bloqueo (Roleblock) antes de cualquier acción — [Attributes_ToS](wiki/Attributes_ToS.md) · test: `packages/engine/test/night.test.ts` ("el Bootlegger bloquea al Doctor y su protección no cuenta")
- [x] Protección vs ataque: el Doctor salva del Mafioso — [Abilities_ToS](wiki/Abilities_ToS.md) · test: `packages/engine/test/night.test.ts` ("el Doctor salva a su objetivo del ataque de la Mafia")
- [ ] Inmunidades: Control, Roleblock, Detection — [Attributes_ToS](wiki/Attributes_ToS.md) · pendiente: solo la inmunidad al bloqueo existe (`packages/engine/test/tavern-keeper-avisos.test.ts`); Control y Detection no están (`packages/engine/src/rules/attributes.ts` es un borrador)
- [x] Acción de la Mafia: el Godfather da la orden, el Mafioso ejecuta si no hay orden · test: `packages/engine/test/night.test.ts` ("el Godfather da la orden", "el Mafioso mata a su objetivo si no hay Godfather")
- [ ] Acción sin objetivo válido = sin efecto y sin error · pendiente: ningún test fija este caso

### 1.4 Muerte y estado
- [x] Estados de muerte: vivo, muerto, desconectado — [Death_state](wiki/Death_state.md) · test: `packages/engine/test/victory.test.ts` ("un jugador desconectado no cuenta como vivo"); tipo en `packages/engine/src/types/state.ts`
- [x] Última voluntad (Last Will) y su revelación al morir — [Last_Will_ToS](wiki/Last_Will_ToS.md) · test: `packages/engine/test/wills.test.ts` ("se revela al morir", "un ahorcado revela su testamento")
- [ ] Muertos pasan a chat de muertos y no pueden votar — [Death_state](wiki/Death_state.md) · pendiente: el chat de muertos está probado (`packages/engine/test/day.test.ts`), pero ningún test fija que un muerto no pueda votar
- [ ] Muerte por ataque, ejecución y desconexión registradas en el log · pendiente: la desconexión no emite evento (`apps/server/src/application/use-cases/setConnection.ts` solo cambia el jugador); ataque y ejecución sí, en `packages/engine/test/night.test.ts` y `day.test.ts`

### 1.5 Victoria
- [x] Town gana cuando no quedan miembros vivos de Mafia — [Victory_ToS](wiki/Victory_ToS.md) · test: `packages/engine/test/victory.test.ts` ("gana el pueblo cuando no queda mafia viva")
- [x] Mafia gana cuando no queda ningún Town vivo — [Victory_ToS](wiki/Victory_ToS.md) · test: `packages/engine/test/victory.test.ts` ("gana la mafia cuando no queda pueblo vivo")
- [ ] Empate definido (pendiente en GDD §5.5) · pendiente: GDD §5.5 lo deja sin definir
- [ ] Reglas 1 contra 1 (fase posterior, no MVP) — [Victory_ToS](wiki/Victory_ToS.md) · fase posterior según GDD §5.5, sin marcar

### 1.6 Chat y visibilidad
- [x] Canales público, Mafia, muertos — [Chat_ToS](wiki/Chat_ToS.md) · test: `packages/engine/test/visibility.test.ts` (público, Mafia y muertos), `packages/engine/test/day.test.ts` ("los muertos hablan en su canal")
- [x] Filtrado de mensajes por canal en el servidor — [Messages_ToS](wiki/Messages_ToS.md) · test: `packages/engine/test/visibility.test.ts` ("filtra la lista de eventos según el espectador"); el servidor usa `projectFor` en `apps/server/src/adapters/outbound/socket-io/broadcaster.ts`
- [x] Silencio de jugadores bloqueados en el Día (Blackmailer, fase posterior) · test: `packages/engine/test/day.test.ts` ("un jugador silenciado por el Blackmailer no habla de día"), `packages/engine/test/whisper.test.ts`. El Blackmailer ya está en el MVP (ver sección 2)

### 1.7 Configuración de sala
- [ ] Reglas del host (Custom): al menos un rol opuesto, máximo 4 Mafia, máximo 6 de un rol, etc. — [Game_Modes_ToS](wiki/Game_Modes_ToS.md) · pendiente: `packages/engine/src/setup/validateConfig.ts` es un borrador
- [ ] Validación de roles activos al crear sala — [Settings_ToS](wiki/Settings_ToS.md) · pendiente: `packages/engine/src/setup/validateConfig.ts` es un borrador
- [ ] Modo Classic (15 jugadores, roles fijos) y All Any (aleatorio) — [Game_Modes_ToS](wiki/Game_Modes_ToS.md) · pendiente: Classic solo está en `data/catalog/game_modes.json`; el reparto aleatorio sí existe (`packages/engine/src/setup/roleList.ts`)
- [ ] Reparto de facciones por número de jugadores (GDD §5.1, pendiente de confirmar) · pendiente de confirmar: `packages/engine/src/setup/limits.ts` lo marca como propuesta

### 1.8 Pruebas del motor
- [x] Test: partida de 10 jugadores completa hasta victoria · `packages/engine/test/simulation.test.ts` (partidas de 10 jugadores terminan con ganador)
- [ ] Test: partida de 15 jugadores con todos los roles MVP · pendiente: `apps/server/test/application/bots.test.ts` llega al final con 15 jugadores, pero no con todos los roles MVP
- [x] Test: votación con umbrales en distintos tamaños · `packages/engine/test/voting.test.ts` (tabla de la wiki)
- [x] Test: orden de acciones con bloqueo, protección y ataque · `packages/engine/test/night.test.ts`
- [x] Test: victoria de Town y de Mafia en casos límite · `packages/engine/test/victory.test.ts`, `packages/engine/test/victoria-por-rol.test.ts`
- [ ] Test: simulación de 1000 partidas aleatorias sin errores · pendiente: `packages/engine/test/simulation.test.ts` ejecuta 300 partidas, no 1000

## 2. Roles MVP (Mafia y Town)
Cada archivo tiene su ficha completa, texto de la wiki y lista de implementación. Total: 29 (Vampire Hunter sale del MVP, ver ROLES_STATUS.md).
Ninguna casilla se marca todavía: el icono y la ilustración (columna g de ROLES_STATUS.md) y la narración (columna h) siguen pendientes en todos los roles.

- [ ] [Ambusher](roles/Ambusher.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Blackmailer](roles/Blackmailer.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Bodyguard](roles/Bodyguard.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Bootlegger](roles/Bootlegger.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Consigliere](roles/Consigliere.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Crusader](roles/Crusader.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Disguiser](roles/Disguiser.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Doctor](roles/Doctor.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Forger](roles/Forger.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Framer](roles/Framer.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Godfather](roles/Godfather.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Hypnotist](roles/Hypnotist.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Investigator](roles/Investigator.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Jailor](roles/Jailor.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Janitor](roles/Janitor.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Lookout](roles/Lookout.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Mafioso](roles/Mafioso.md) · Mafia · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Mayor](roles/Mayor.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Medium](roles/Medium.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Psychic](roles/Psychic.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Retributionist](roles/Retributionist.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Sheriff](roles/Sheriff.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Spy](roles/Spy.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Tavern Keeper](roles/Tavern_Keeper.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Tracker](roles/Tracker.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Transporter](roles/Transporter.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Trapper](roles/Trapper.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Vampire Hunter](roles/Vampire_Hunter.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md) (fuera del MVP: sin Vampiros, ver ROLES_STATUS.md)
- [ ] [Veteran](roles/Veteran.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)
- [ ] [Vigilante](roles/Vigilante.md) · Town · Estado: [ROLES_STATUS.md](ROLES_STATUS.md)

## 3. Roles de fase posterior (Neutral y Coven, solo referencia)

- [ ] [Amnesiac](roles/Amnesiac.md) · Neutral
- [ ] [Arsonist](roles/Arsonist.md) · Neutral
- [ ] [Coven Leader](roles/Coven_Leader.md) · Coven
- [ ] [Executioner](roles/Executioner.md) · Neutral
- [ ] [Guardian Angel](roles/Guardian_Angel.md) · Neutral
- [ ] [Hex Master](roles/Hex_Master.md) · Coven
- [ ] [Jester](roles/Jester.md) · Neutral
- [ ] [Juggernaut](roles/Juggernaut.md) · Neutral
- [ ] [Medusa](roles/Medusa.md) · Coven
- [ ] [Necromancer](roles/Necromancer.md) · Coven
- [ ] [Pestilence](roles/Pestilence.md) · Neutral
- [ ] [Pirate](roles/Pirate.md) · Neutral
- [ ] [Plaguebearer](roles/Plaguebearer.md) · Neutral
- [ ] [Poisoner](roles/Poisoner.md) · Coven
- [ ] [Potion Master](roles/Potion_Master.md) · Coven
- [ ] [Serial Killer](roles/Serial_Killer.md) · Neutral
- [ ] [Survivor](roles/Survivor.md) · Neutral
- [ ] [Vampire](roles/Vampire.md) · Neutral
- [ ] [Witch](roles/Witch.md) · Neutral
- [ ] [Werewolf](roles/Werewolf.md) · Sin clasificar

## 4. Lectura y reflejo de las páginas de la wiki
Cada página tiene su texto completo en `docs/wiki/`. Marca cuando el motor, los tests o la app reflejan lo que dice.

- [ ] [Abilities (ToS)](wiki/Abilities_ToS.md)
- [ ] [Achievements](wiki/Achievements.md)
- [ ] [Achievements Guide](wiki/Achievements_Guide.md)
- [ ] [Achievements Guide (ToS)](wiki/Achievements_Guide_ToS.md)
- [ ] [Achievements (ToS)](wiki/Achievements_ToS.md)
- [ ] [Abilities](wiki/Abilities.md)
- [ ] [Alignments](wiki/Alignments.md)
- [ ] [Amnesiac](wiki/Amnesiac.md)
- [ ] [Alignments (ToS)](wiki/Alignments_ToS.md)
- [ ] [Avatars (ToS)](wiki/Avatars_ToS.md)
- [ ] [Attributes (ToS)](wiki/Attributes_ToS.md)
- [ ] [Arsonist](wiki/Arsonist.md)
- [ ] [Auditor](wiki/Auditor.md)
- [ ] [Attributes](wiki/Attributes.md)
- [ ] [Avatars](wiki/Avatars.md)
- [ ] [BlankMediaGames](wiki/BlankMediaGames.md)
- [ ] [Bodyguard](wiki/Bodyguard.md)
- [ ] [Bundles (ToS)](wiki/Bundles_ToS.md)
- [ ] [Bundles](wiki/Bundles.md)
- [ ] [Common Player Behaviors](wiki/Common_Player_Behaviors.md)
- [ ] [Chat (ToS)](wiki/Chat_ToS.md)
- [ ] [Coroner](wiki/Coroner.md)
- [ ] [Chat](wiki/Chat.md)
- [ ] [Coven (ToS)](wiki/Coven_ToS.md)
- [ ] [Coven](wiki/Coven.md)
- [ ] [Custom Stories](wiki/Custom_Stories.md)
- [ ] [Custom Stories - Coven](wiki/Custom_Stories_Coven.md)
- [ ] [Crusader](wiki/Crusader.md)
- [ ] [Cultist](wiki/Cultist.md)
- [ ] [Custom](wiki/Custom.md)
- [ ] [Custom Non-Role Stories](wiki/Custom_Non_Role_Stories.md)
- [ ] [Dead: What Now? (ToS)](wiki/Dead_What_Now_ToS.md)
- [ ] [Daily Brew (ToS)](wiki/Daily_Brew_ToS.md)
- [ ] [Death](wiki/Death.md)
- [ ] [Daily Brew](wiki/Daily_Brew.md)
- [ ] [Dead: What Now?](wiki/Dead_What_Now.md)
- [ ] [Death Note](wiki/Death_Note.md)
- [ ] [Death Animations (ToS)](wiki/Death_Animations_ToS.md)
- [ ] [Death (state)](wiki/Death_state.md)
- [ ] [Disguiser](wiki/Disguiser.md)
- [ ] [Death Animation](wiki/Death_Animation.md)
- [ ] [Death Note (ToS)](wiki/Death_Note_ToS.md)
- [ ] [Elo](wiki/Elo.md)
- [ ] [Dracula's Palace](wiki/Dracula_s_Palace.md)
- [ ] [Executioner](wiki/Executioner.md)
- [ ] [Friends (ToS)](wiki/Friends_ToS.md)
- [ ] [Factions (ToS)](wiki/Factions_ToS.md)
- [ ] [Factions](wiki/Factions.md)
- [ ] [Friends](wiki/Friends.md)
- [ ] [Game Modes (ToS)](wiki/Game_Modes_ToS.md)
- [ ] [Future Updates](wiki/Future_Updates.md)
- [ ] [Getting Started](wiki/Getting_Started.md)
- [ ] [Game Modes](wiki/Game_Modes.md)
- [ ] [Hanging (ToS)](wiki/Hanging_ToS.md)
- [ ] [Glossary of Abbreviations](wiki/Glossary_of_Abbreviations.md)
- [ ] [Graveyard](wiki/Graveyard.md)
- [ ] [Hanging](wiki/Hanging.md)
- [ ] [Glossary of Abbreviations (ToS)](wiki/Glossary_of_Abbreviations_ToS.md)
- [ ] [Houses (ToS)](wiki/Houses_ToS.md)
- [ ] [Host](wiki/Host.md)
- [ ] [Hex Master](wiki/Hex_Master.md)
- [ ] [Houses](wiki/Houses.md)
- [ ] [Icon](wiki/Icon.md)
- [ ] [Investigator](wiki/Investigator.md)
- [ ] [Illusionist](wiki/Illusionist.md)
- [ ] [Jailor](wiki/Jailor.md)
- [ ] [Jackal](wiki/Jackal.md)
- [ ] [Judge](wiki/Judge.md)
- [ ] [Jester](wiki/Jester.md)
- [ ] [Last Will (ToS)](wiki/Last_Will_ToS.md)
- [ ] [Keyword System](wiki/Keyword_System.md)
- [ ] [Last Will](wiki/Last_Will.md)
- [ ] [Lookout](wiki/Lookout.md)
- [ ] [Mafia](wiki/Mafia.md)
- [ ] [Mafia Killing](wiki/Mafia_Killing.md)
- [ ] [Mafia Support](wiki/Mafia_Support.md)
- [ ] [Mafia Deception](wiki/Mafia_Deception.md)
- [ ] [Maps (ToS)](wiki/Maps_ToS.md)
- [ ] [Maps](wiki/Maps.md)
- [ ] [Mayor](wiki/Mayor.md)
- [ ] [Metagaming](wiki/Metagaming.md)
- [ ] [Messages (ToS)](wiki/Messages_ToS.md)
- [ ] [Medium](wiki/Medium.md)
- [ ] [Medusa](wiki/Medusa.md)
- [ ] [Messages](wiki/Messages.md)
- [ ] [Neutral (ToS)](wiki/Neutral_ToS.md)
- [ ] [Neutral Benign](wiki/Neutral_Benign.md)
- [ ] [Neutral Killing (ToS)](wiki/Neutral_Killing_ToS.md)
- [ ] [Neutral Evil (ToS)](wiki/Neutral_Evil_ToS.md)
- [ ] [Name](wiki/Name.md)
- [ ] [Neutral Chaos](wiki/Neutral_Chaos.md)
- [ ] [Necronomicon (ToS)](wiki/Necronomicon_ToS.md)
- [ ] [Necromancer](wiki/Necromancer.md)
- [ ] [Necronomicon](wiki/Necronomicon.md)
- [ ] [Neutral Killing](wiki/Neutral_Killing.md)
- [ ] [Neutral Evil](wiki/Neutral_Evil.md)
- [ ] [Neutral](wiki/Neutral.md)
- [ ] [Notes (ToS)](wiki/Notes_ToS.md)
- [ ] [Official Town of Salem Stories](wiki/Official_Town_of_Salem_Stories.md)
- [ ] [Notes](wiki/Notes.md)
- [ ] [Pets (ToS)](wiki/Pets_ToS.md)
- [ ] [Phases](wiki/Phases.md)
- [ ] [Pirate](wiki/Pirate.md)
- [ ] [Plaguebearer](wiki/Plaguebearer.md)
- [ ] [Pestilence](wiki/Pestilence.md)
- [ ] [Pets](wiki/Pets.md)
- [ ] [Points (ToS)](wiki/Points_ToS.md)
- [ ] [Poisoner](wiki/Poisoner.md)
- [ ] [Potion Master](wiki/Potion_Master.md)
- [ ] [Points](wiki/Points.md)
- [ ] [Ranked](wiki/Ranked.md)
- [ ] [Public Test Realm](wiki/Public_Test_Realm.md)
- [ ] [Prosecutor](wiki/Prosecutor.md)
- [ ] [Psychic](wiki/Psychic.md)
- [ ] [Ranked Practice](wiki/Ranked_Practice.md)
- [ ] [Retributionist](wiki/Retributionist.md)
- [ ] [Roles (ToS)](wiki/Roles_ToS.md)
- [ ] [Scrolls (ToS)](wiki/Scrolls_ToS.md)
- [ ] [Scum Reading and the Numbers Game](wiki/Scum_Reading_and_the_Numbers_Game.md)
- [ ] [Sandbox](wiki/Sandbox.md)
- [ ] [Roles](wiki/Roles.md)
- [ ] [Scrolls](wiki/Scrolls.md)
- [ ] [Settings (ToS)](wiki/Settings_ToS.md)
- [ ] [Seer](wiki/Seer.md)
- [ ] [Sheriff](wiki/Sheriff.md)
- [ ] [Serial Killer](wiki/Serial_Killer.md)
- [ ] [Settings](wiki/Settings.md)
- [ ] [Statistics](wiki/Statistics.md)
- [ ] [So You Think You Can Write](wiki/So_You_Think_You_Can_Write.md)
- [ ] [Spy](wiki/Spy.md)
- [ ] [Strategies](wiki/Strategies.md)
- [ ] [String Table Localization](wiki/String_Table_Localization.md)
- [ ] [Summer Solstice Writing Event](wiki/Summer_Solstice_Writing_Event.md)
- [ ] [Taunts](wiki/Taunts.md)
- [ ] [Tavern Keeper](wiki/Tavern_Keeper.md)
- [ ] [Town (ToS)](wiki/Town_ToS.md)
- [ ] [Town Killing (ToS)](wiki/Town_Killing_ToS.md)
- [ ] [Town Investigative (ToS)](wiki/Town_Investigative_ToS.md)
- [ ] [Tips and Tricks](wiki/Tips_and_Tricks.md)
- [ ] [Town](wiki/Town.md)
- [ ] [Town Investigative](wiki/Town_Investigative.md)
- [ ] [Town Killing](wiki/Town_Killing.md)
- [ ] [Town of Salem Wiki](wiki/Town_of_Salem_Wiki.md)
- [ ] [Town Support (ToS)](wiki/Town_Support_ToS.md)
- [ ] [Town Protective (ToS)](wiki/Town_Protective_ToS.md)
- [ ] [Town of Salem Rules](wiki/Town_of_Salem_Rules.md)
- [ ] [Town of Salem](wiki/Town_of_Salem.md)
- [ ] [Town of Salem Card Game](wiki/Town_of_Salem_Card_Game.md)
- [ ] [Town of Salem – The Savior of Salem](wiki/Town_of_Salem_The_Savior_of_Salem.md)
- [ ] [Town Traitor](wiki/Town_Traitor.md)
- [ ] [Tracker](wiki/Tracker.md)
- [ ] [Town Protective](wiki/Town_Protective.md)
- [ ] [Town Support](wiki/Town_Support.md)
- [ ] [Tutorial](wiki/Tutorial.md)
- [ ] [Trial System](wiki/Trial_System.md)
- [ ] [Transporter](wiki/Transporter.md)
- [ ] [Trapper](wiki/Trapper.md)
- [ ] [Version History](wiki/Version_History.md)
- [ ] [VIP](wiki/VIP.md)
- [ ] [Veteran](wiki/Veteran.md)
- [ ] [Vampire](wiki/Vampire.md)
- [ ] [Version History (ToS)](wiki/Version_History_ToS.md)
- [ ] [Victory (ToS)](wiki/Victory_ToS.md)
- [ ] [Web Premium](wiki/Web_Premium.md)
- [ ] [Vigilante](wiki/Vigilante.md)
- [ ] [Werewolf](wiki/Werewolf.md)
- [ ] [Victory](wiki/Victory.md)
- [ ] [Werewolf (ToS)](wiki/Werewolf_ToS.md)
- [ ] [Wildling](wiki/Wildling.md)
- [ ] [Witch](wiki/Witch.md)
