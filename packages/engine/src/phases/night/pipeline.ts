import type { Catalog } from "../../types/catalog.js";
import type { EventInput } from "../../types/events.js";
import type { GameState, PlayerState } from "../../types/state.js";
import type { Rng } from "../../core/rng.js";
import type { Effect } from "../../roles/effects.js";
import type { RoleHandler } from "../../roles/types.js";
import { handlerOf, isAlive, playerOf } from "../context.js";
import { promotionEvents } from "../promotion.js";
import { zombieAbilityOf } from "../../roles/town/retributionist.js";
import { INVESTIGATIVE_ROLE_KEYS, investigatorGroupOf } from "../../rules/investigation.js";

/**
 * Resolución de la noche, en este orden fijo:
 * 1. Bloqueos (Bootlegger, Tavern Keeper) y encarcelamiento. Una acción bloqueada no produce efectos.
 * 2. Transportes: cambian los objetivos de las visitas.
 * 3. Visitas: quién visita a quién (después de transportes).
 * 4. Protecciones y alerta del Veteran.
 * 5. Ataques (Mafia, Vigilante, Ambusher, Crusader, Veteran, Trapper, Jailor) contra protecciones.
 * 6. Marcas, trampas e investigaciones (con el estado de la noche).
 * Todo se calcula sobre el estado al empezar la noche: los muertos de esta noche no cambian los resultados.
 */

interface Visit {
  visitorId: string;
  houseId: string;
}

interface Protection {
  protectorId: string;
  power: 1 | 2;
  source: "doctor" | "bodyguard" | "crusader" | "jail" | "trap" | "vest";
  /** Solo vale contra este atacante. Wiki (Keyword_System.md:349): la defensa de la trampa es solo para el atacante herido. */
  onlyAgainst?: string;
}

interface Attack {
  attackerId: string;
  victimId: string;
  power: 1 | 2;
  cause: string;
  /** Ataque imparable: ignora protecciones y guardaespaldas (ejecución del Jailor). */
  unstoppable?: boolean;
  /** Razones de la nota del Jailor en su ejecución (wiki: Death_Note_ToS.md:92). */
  reasons?: string[];
  /** Nota de muerte del asesino de la Mafia que mata (wiki: Death_Note_ToS.md:5, Godfather.md:235). */
  note?: string;
  /** Autor de la nota de muerte: quien hace la muerte (wiki: Godfather.md:36, Mafioso.md:23). Solo el ataque de la Mafia lo lleva. */
  noteAuthorId?: string;
  /** El Godfather ataca él mismo, no por medio del Mafioso: recibe el aviso de defensa (wiki: Godfather.md:233). */
  godfatherDirect?: boolean;
}

interface Act {
  actor: PlayerState;
  handler: RoleHandler;
  ability: string;
  targetId: string | null;
  secondTargetId: string | null;
  choice: string | null;
  /** Testamento falsificado del Forger, si lo escribió (wiki: Forger.md:204). */
  forgedWill: string | null;
  effects: Effect[];
  blocked: boolean;
  /** Visitó a un encarcelado: su habilidad falla, pero la visita cuenta (wiki: Jailor.md:252). */
  jailFailed: boolean;
}

/** Casas que visita la acción, sin transportes. El zombi (Retributionist) visita solo su segundo objetivo. */
const visitedHouses = (act: Act): string[] => {
  if (act.ability === "raise") return act.secondTargetId ? [act.secondTargetId] : [];
  const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
  if (def?.target === "player") return act.targetId ? [act.targetId] : [];
  if (def?.target === "two") return [act.targetId, act.secondTargetId].filter((x): x is string => x !== null);
  return [];
};

const remapEffect = (e: Effect, remap: (id: string) => string): Effect => {
  switch (e.kind) {
    case "block":
      return { ...e, targetId: remap(e.targetId) };
    case "transport":
      return e;
    case "protect":
      // El chaleco protege a quien lo lleva, esté donde esté: no se redirige con el transporte (wiki: Bodyguard.md:246).
      // La autocuración tampoco: "they will continue to do so" (wiki: Transporter.md:234).
      if (e.source === "vest" || e.self) return e;
      return { ...e, targetId: remap(e.targetId) };
    case "attack":
    case "mark":
    case "trap":
    case "hypnosis":
    case "forge":
      return { ...e, targetId: remap(e.targetId) };
    case "disguise":
      return { ...e, targetId: remap(e.targetId), asId: remap(e.asId) };
    case "attackVisitors":
      return { ...e, houseId: remap(e.houseId) };
    case "mafiaKill":
      return { ...e, targetId: remap(e.targetId) };
    case "investigate":
      return { ...e, targetId: e.targetId === null ? null : remap(e.targetId) };
    default:
      return e;
  }
};

/** Habilidades con usos cuyo mensaje "You have (#) ... left." existe en la wiki (ver el bloque de usos al final de la noche). */
const USES_WITH_COUNTER = new Set(["shoot", "alert", "vest", "selfHeal", "execute", "forge", "clean"]);

/** Mensaje del espionaje por causa de muerte de un ataque directo (wiki: Spy.md:239, 243, 247, 275). */
const SPY_KILL_TAG: Record<string, string> = {
  mafia: "attack_mafia",
  shot: "attack_shot",
  veteran: "attack_veteran",
  guilt: "killed_guilt",
};

export function resolveNight(s: GameState, catalog: Catalog, rng: Rng): EventInput[] {
  const out: EventInput[] = [];

  // 0. Acciones válidas, por prioridad y asiento. Los muertos solo actúan con habilidades de muerto (Medium).
  const acts: Act[] = [];
  for (const [actorId, action] of Object.entries(s.nightActions)) {
    const actor = playerOf(s, actorId);
    const handler = actor && handlerOf(actor);
    const def = handler?.nightAbilities.find((a) => a.key === action.ability);
    if (!actor || !handler || !def || isAlive(actor) === !!def.deadOnly) continue;
    acts.push({
      actor,
      handler,
      ability: action.ability,
      targetId: action.targetId,
      secondTargetId: action.secondTargetId,
      choice: action.choice,
      forgedWill: action.forgedWill ?? null,
      effects: [],
      blocked: actor.flags.jailed === true,
      jailFailed: false,
    });
  }
  // Roles pasivos: actúan cada noche aunque no elijan nada.
  for (const actor of s.players) {
    const handler = handlerOf(actor);
    if (!handler?.passive || !isAlive(actor) || s.nightActions[actor.id]) continue;
    acts.push({
      actor,
      handler,
      ability: "passive",
      targetId: null,
      secondTargetId: null,
      choice: null,
      forgedWill: null,
      effects: [],
      blocked: actor.flags.jailed === true,
      jailFailed: false,
    });
  }
  acts.sort((a, b) => (a.handler.priority ?? 99) - (b.handler.priority ?? 99) || a.actor.seat - b.actor.seat);

  for (const act of acts) {
    act.effects = act.handler.resolveNight({
      state: s,
      ability: act.ability,
      actor: act.actor,
      targetId: act.targetId,
      secondTargetId: act.secondTargetId,
      choice: act.choice,
      forgedWill: act.forgedWill,
      catalog,
      rng,
    });
  }

  // 1. Transportes primero: intercambian los objetivos de dos jugadores. Wiki (Tavern_Keeper.md:275): el Transporter
  // (prioridad 1) va antes que los bloqueadores (prioridad 2). Un Transporter encarcelado no transporta.
  // `remap` dice quién está en cada casa tras los transportes anteriores (función de nombre a nombre).
  // Wiki (Transporter.md:266-278, "Interaction between two Transporters"): cada intercambio mueve a quien está en la
  // casa izquierda (paso 5) y al marcado (paso 1 y 3 para el primero; pasos 2 y 4 para el resto), no solo a los
  // nombres elegidos. Con objetivos sin repetir, da lo mismo que intercambiar los nombres.
  // Decisión: "izquierda" = primer objetivo elegido (`firstId`), "derecha" = segundo (`secondId`); la wiki no define
  // izquierda y derecha (Transporter.md:206 dice que el orden de elección no importa), ver docs/ROLES_STATUS.md.
  let remap = (id: string) => id;
  const swaps: Array<[string, string]> = [];
  /** Derechas de los transportes anteriores (paso 2, Transporter.md:272). */
  const earlierRightTargets: string[] = [];
  for (const act of acts) {
    if (act.blocked) continue;
    for (const e of act.effects) {
      if (e.kind !== "transport") continue;
      // Wiki (Transporter.md:202, 226): si un objetivo está encarcelado, el intercambio falla y ambos lo saben.
      const jailed = [e.firstId, e.secondId].find((id) => s.jailedBy[id] !== undefined);
      if (jailed !== undefined) {
        out.push({ type: "night.notice", payload: { playerId: act.actor.id, notice: "transport_jailed" } });
        out.push({ type: "night.notice", payload: { playerId: jailed, notice: "jailed_transport_attempt" } });
        continue;
      }
      // Wiki (Transporter.md:228): "You cannot Transport targets who left the game before the Night ends (You will receive
      // no Transport message)." Quien abandonó sigue vivo con connected=false (ver Tavern_Keeper.md:183 en tavern-keeper-avisos.test.ts).
      // El intercambio no se hace y no hay aviso.
      if ([e.firstId, e.secondId].some((id) => playerOf(s, id)?.connected === false)) continue;
      const { firstId, secondId } = e;
      swaps.push([firstId, secondId]);
      // Wiki (Transporter.md:272): si la derecha es la misma que la de un Transporter anterior, se marca el nombre elegido.
      // Wiki (Transporter.md:276): si no, se marca a quien está en su casa derecha.
      const marked = earlierRightTargets.includes(secondId) ? secondId : remap(secondId);
      // Wiki (Transporter.md:274, 278): se intercambia lo marcado con quien está en la casa izquierda.
      const holder = remap(firstId);
      const prev = remap;
      remap = (id) => {
        const x = prev(id);
        return x === holder ? marked : x === marked ? holder : x;
      };
      earlierRightTargets.push(secondId);
    }
  }

  /** Lo que el espionaje (Spy) ve de cada jugador esta noche, con las claves de `SPY_TAG` (wiki: Spy.md:221-309). */
  const spyTags = new Map<string, string[]>();
  const tagSpy = (playerId: string, tag: string) => spyTags.set(playerId, [...(spyTags.get(playerId) ?? []), tag]);

  // 2. Bloqueos: solo bloqueadores activos, en orden de prioridad. El bloqueo va a la casa del objetivo tras el
  // transporte: un bloqueador también cambia de sitio (wiki: Transporter.md:184, visitantes).
  /** Bloqueados que no enviaron acción: el bloqueo les llega igual (wiki: Tavern_Keeper.md:347-349). */
  const blockedWithoutAction = new Set<string>();
  for (const blocker of acts) {
    if (blocker.blocked) continue;
    for (const e of blocker.effects) {
      if (e.kind !== "block") continue;
      const victimId = remap(e.targetId);
      // Wiki (Tavern_Keeper.md:355-357, Bootlegger.md:348-350): encarcelado, el bloqueo no llega y él lo sabe.
      if (s.jailedBy[victimId] !== undefined) {
        out.push({ type: "night.notice", payload: { playerId: victimId, notice: "blocked_jailed" } });
        continue;
      }
      // Wiki (Tavern_Keeper.md:351-353, Bootlegger.md:344-346): inmune, el bloqueo no llega y él lo sabe.
      const victim = playerOf(s, victimId);
      if (victim && handlerOf(victim)?.roleblockImmune) {
        out.push({ type: "night.notice", payload: { playerId: victimId, notice: "blocked_immune" } });
        // Wiki (Spy.md:263): "Someone tried to role block your target but they were immune!"
        tagSpy(victimId, "block_immune");
        continue;
      }
      const target = acts.find((a) => a.actor.id === victimId);
      // Wiki (Tavern_Keeper.md:347-349): "Someone occupied your night. You were role blocked!" también si no tenía acción.
      // Wiki (Spy.md:227): el bloqueo se le ve al Spy aunque el bloqueado no tuviera acción.
      tagSpy(victimId, "block");
      if (!target) {
        out.push({ type: "night.notice", payload: { playerId: victimId, notice: "blocked_occupied" } });
        // Sin acción, el bloqueo también cuenta: la Mafia lo mira al decidir quién ataca (Godfather.md:225).
        blockedWithoutAction.add(victimId);
        continue;
      }
      target.blocked = true;
    }
  }
  for (const act of acts) {
    if (!act.blocked) continue;
    act.effects = [];
    out.push({ type: "night.action.blocked", payload: { actorId: act.actor.id, ability: act.ability, cause: act.actor.flags.jailed === true ? "jail" : "roleblock" } });
  }
  const active = acts.filter((a) => !a.blocked);

  // 2c. Encarcelados (wiki: Jailor.md:252): "outside visitors ... their ability will fail; however, they still visit".
  // El visitante no produce efectos (paso 3 sigue registrando su visita). El Jailor ejecuta sin visitar a su
  // prisionero (ataque imparable) y el Transporter falla según su propia regla (wiki: Transporter.md:202).
  const jailedHouse = (id: string) => s.jailedBy[remap(id)] !== undefined;
  // Órdenes de muerte de la Mafia sin filtrar: el filtro de abajo quita el ataque a un encarcelado, y el aviso de
  // "You could not attack your target because they were in jail." lo necesita (ver después de la Mafia).
  const mafiaOrdersBeforeJail = active.flatMap((a) => a.effects).filter((e): e is Extract<Effect, { kind: "mafiaKill" }> => e.kind === "mafiaKill");
  for (const act of active) {
    if (act.handler.key === "jailor" || act.handler.key === "transporter") continue;
    if (!visitedHouses(act).some(jailedHouse)) continue;
    act.jailFailed = true;
    // Wiki (Jailor.md:252): el encarcelado solo se entera de los atacantes (y de transportes o bloqueos).
    for (const e of act.effects) {
      if (e.kind !== "attack" && e.kind !== "mafiaKill") continue;
      const victim = remap(e.targetId);
      if (s.jailedBy[victim] !== undefined) out.push({ type: "night.notice", payload: { playerId: victim, notice: "attack_attempt" } });
      // Wiki (Messages_ToS.md:1733): el asesino que ataca a un encarcelado. Vigilante.md:194 solo dice que el objetivo
      // lo sabe; la línea 1733 es general ("a killing role"). La Mafia va abajo, con quien hace la muerte.
      if (e.kind === "attack" && s.jailedBy[victim] !== undefined) out.push({ type: "night.notice", payload: { playerId: act.actor.id, notice: "attack_jailed" } });
    }
    // Wiki (Blackmailer.md:221, 395): no se puede silenciar a quien estuvo encarcelado esa noche; él lo sabe.
    act.effects = act.effects.filter((e) => {
      if (e.kind !== "mark" || e.flag !== "blackmailed") return true;
      const victim = remap(e.targetId);
      if (s.jailedBy[victim] === undefined) return true;
      out.push({ type: "night.notice", payload: { playerId: victim, notice: "blackmail_jailed" } });
      return false;
    });
    // Wiki (Spy.md:205): el espionaje dice que el objetivo estaba encarcelado; y las visitas de la Mafia siguen.
    const reportsJail = act.effects.some((e) => e.kind === "investigate" && e.check === "bug");
    if (!reportsJail) out.push({ type: "night.notice", payload: { playerId: act.actor.id, notice: "target_jailed" } });
    act.effects = act.effects.filter((e) => e.kind === "investigate" && (e.check === "bug" || e.check === "mafiaVisits"));
  }
  // 2b. Mafia: quién mata. Wiki (Mafioso, Godfather): si el Godfather ordena y el Mafioso está vivo y no
  // bloqueado, el Mafioso ejecuta la orden; él recibe las visitas y las represalias, y el Godfather no visita.
  // Si el Mafioso no puede, el Godfather mata personalmente. Sin orden, mata el Mafioso con su propio objetivo.
  const mafiaEffects = active.flatMap((a) => a.effects.map((e) => remapEffect(e, remap)));
  const mafiaKill = (role: "godfather" | "mafioso") =>
    mafiaEffects.find((e): e is Extract<Effect, { kind: "mafiaKill" }> => e.kind === "mafiaKill" && e.role === role);
  const godOrder = mafiaKill("godfather");
  const ownKill = mafiaKill("mafioso");
  const mafiosoPlayer = s.players.find((p) => p.roleKey === "mafioso" && isAlive(p));
  // Quién no puede actuar esta noche, tenga o no acción: bloqueado (aunque no eligiera) o encarcelado.
  // Wiki (Godfather.md:225): "If your Mafioso is role blocked, dead, or does not exist, you will attack the target."
  // Antes solo contaban las acciones enviadas, y un Mafioso bloqueado o encarcelado sin acción seguía ejecutando la orden.
  const blockedIds = new Set([
    ...acts.filter((a) => a.blocked).map((a) => a.actor.id),
    ...blockedWithoutAction,
    ...s.players.filter((p) => p.flags.jailed === true).map((p) => p.id),
  ]);
  const mafiosoExecutes = !!godOrder && !!mafiosoPlayer && !blockedIds.has(mafiosoPlayer.id);
  let mafiaExecutor: { attackerId: string; victimId: string } | null = null;
  if (godOrder && mafiosoExecutes && mafiosoPlayer) mafiaExecutor = { attackerId: mafiosoPlayer.id, victimId: godOrder.targetId };
  else if (godOrder) mafiaExecutor = { attackerId: godOrder.actorId, victimId: godOrder.targetId };
  else if (ownKill) mafiaExecutor = { attackerId: ownKill.actorId, victimId: ownKill.targetId };
  // Wiki (Messages_ToS.md:1731, 1733; Godfather.md:233; Mafioso.md:235): quien hace la muerte y ataca a un encarcelado
  // recibe "You could not attack your target because they were in jail." Si el Mafioso ejecuta la orden, lo recibe él;
  // el Godfather no (Godfather.md:233). Sin Mafioso que ejecute, lo recibe el Godfather.
  const mafiaOrder = mafiaOrdersBeforeJail.find((e) => e.role === "godfather") ?? mafiaOrdersBeforeJail.find((e) => e.role === "mafioso");
  if (mafiaOrder && s.jailedBy[remap(mafiaOrder.targetId)] !== undefined) {
    const killerId = mafiaOrder.role === "godfather" && mafiosoPlayer && !blockedIds.has(mafiosoPlayer.id) ? mafiosoPlayer.id : mafiaOrder.actorId;
    out.push({ type: "night.notice", payload: { playerId: killerId, notice: "attack_jailed" } });
  }

  // Zombis de esta noche (Retributionist): zombi → Retributionist que lo alzó. Wiki (Retributionist.md:203): el
  // Retributionist recibe los resultados que daría el cadáver; y el zombi protege y contraataca (Retributionist.md:388).
  const raisedBy = new Map<string, string>();
  for (const act of active) {
    for (const e of act.effects) if (e.kind === "mark" && e.flag === "zombied") raisedBy.set(e.targetId, act.actor.id);
  }
  const routed = (id: string) => raisedBy.get(id) ?? id;

  // 3. Visitas: habilidades que apuntan a un jugador.
  const visits: Visit[] = [];
  for (const act of active) {
    // Un muerto (Medium) no visita casas: sus efectos no llegan a Lookout ni a Sheriff.
    if (!isAlive(act.actor)) continue;
    // Con orden del Godfather, la visita de la Mafia es la del Mafioso que mata (abajo).
    if (mafiosoExecutes && (act.handler.key === "godfather" || act.handler.key === "mafioso")) continue;
    if (act.ability === "raise") {
      // Wiki (Retributionist.md:206, 220): visita a su primer objetivo (el muerto, sin transporte); el zombi
      // visita a su segundo objetivo con su propia habilidad.
      if (act.targetId && act.secondTargetId) {
        visits.push({ visitorId: act.actor.id, houseId: act.targetId });
        const zombie = playerOf(s, act.targetId);
        if (zombie && zombieAbilityOf(zombie)) visits.push({ visitorId: zombie.id, houseId: remap(act.secondTargetId) });
      }
      continue;
    }
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    if (def?.target === "player" && act.targetId !== null) {
      visits.push({ visitorId: act.actor.id, houseId: remap(act.targetId) });
    }
    // Wiki (Tracker.md:208, Disguiser.md:279, Lookout.md:298): quien tiene dos objetivos visita a ambos, en bruto.
    if (def?.target === "two") {
      for (const id of [act.targetId, act.secondTargetId]) if (id !== null) visits.push({ visitorId: act.actor.id, houseId: id });
    }
  }
  if (godOrder && mafiosoExecutes && mafiosoPlayer) visits.push({ visitorId: mafiosoPlayer.id, houseId: godOrder.targetId });
  const visitsTo = (houseId: string, except?: string) =>
    visits.filter((v) => v.houseId === houseId && v.visitorId !== except);

  // 4. Protecciones y alerta.
  const protections = new Map<string, Protection[]>();
  // Wiki: el encarcelado tiene defensa poderosa esta noche.
  for (const [prisonerId, jailorId] of Object.entries(s.jailedBy)) {
    if (!isAlive(playerOf(s, prisonerId))) continue;
    protections.set(prisonerId, [{ protectorId: jailorId, power: 2, source: "jail" }]);
  }
  const alerted = new Set<string>();
  // Culpa del Vigilante: quien mató a un Town se quita la vida la noche siguiente, con un ataque imparable
  // (wiki: Vigilante). Va primero y ocurre aunque esté bloqueado, encarcelado o controlado.
  const attacks: Attack[] = s.players
    .filter((p) => isAlive(p) && p.flags.guilty)
    .map((p) => ({ attackerId: p.id, victimId: p.id, power: 2 as const, cause: "guilt", unstoppable: true }));
  const marks: Array<{ actorId: string; targetId: string; flag: "framed" | "cleaned" | "blackmailed" | "zombied" }> = [];
  const investigations: Array<{ actorId: string; targetId: string | null; check: string }> = [];
  const bugs: Array<{ actorId: string; targetId: string }> = [];
  /** Víctimas cuyo ataque esta noche no les alcanzó (protección o alerta). Lo ve el espionaje. */
  const prevented = new Set<string>();
  /** Guardaespaldas que ya contraatacaron esta noche. Aunque una curación les salve, cuentan uno solo:
   * wiki (Bodyguard.md:306): "Being healed while counterattacking does not allow you to counter more than one attack". */
  const countered = new Set<string>();
  // Doctor: un solo aviso de "atacado" por Doctor y noche (wiki: Doctor.md:251).
  const healersNotified = new Set<string>();
  // Chaleco: un solo aviso por Bodyguard y noche (supuesto: la wiki no dice cuántas veces).
  const vestNotified = new Set<string>();
  const traps: Array<{ trapperId: string; targetId: string }> = [];
  const dismantles: string[] = [];
  /** Tramperos que construyen esta noche (efecto "build": pasivo o al desmontar). */
  const builders: string[] = [];
  const usesSpent: Array<{ playerId: string; ability: string }> = [];
  const disguises = new Map<string, string>();
  const hypnoses: Array<{ targetId: string; message: "attacked" | "protected" | "roleblocked" | "transported" | "fought_off" | "trap_triggered" | "trap_saved" | "trap_healed" }> = [];
  const forges: Array<{ forgerId: string; targetId: string; role: string; will: string }> = [];

  for (const act of active) {
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    // Wiki: visitar a un encarcelado no gasta usos (Janitor.md:250, Vigilante.md:194).
    if (def?.usesLimit !== null && def?.usesLimit !== undefined && !act.jailFailed) {
      usesSpent.push({ playerId: act.actor.id, ability: act.ability });
    }
    for (const raw of act.effects) {
      const e = remapEffect(raw, remap);
      switch (e.kind) {
        case "protect": {
          // Wiki: el Mayor revelado no puede ser curado por el Doctor.
          if (e.source === "doctor" && s.players.find((p) => p.id === e.targetId)?.flags.mayorRevealed) break;
          const list = protections.get(e.targetId) ?? [];
          list.push({ protectorId: e.actorId, power: e.power, source: e.source });
          protections.set(e.targetId, list);
          break;
        }
        case "attack":
          attacks.push({ attackerId: e.actorId, victimId: e.targetId, power: e.power, cause: e.cause, unstoppable: e.unstoppable, reasons: e.reasons });
          break;
        case "attackVisitors": {
          // Wiki (Crusader.md:214, Ambusher.md:216): un visitante al azar; el Ambusher no ataca a la Mafia.
          let pool = visitsTo(e.houseId, e.actorId);
          if (e.spareMafia) pool = pool.filter((v) => playerOf(s, v.visitorId)?.faction !== "mafia");
          const chosen = e.single ? (pool.length > 0 ? [rng.shuffle(pool)[0]!] : []) : pool;
          for (const v of chosen) {
            attacks.push({ attackerId: e.actorId, victimId: v.visitorId, power: e.power, cause: e.cause });
          }
          // Wiki (Ambusher.md:222; Messages_ToS.md:2117): cada visitante que no es de la Mafia ve el nombre del Ambusher, aunque
          // no muera ni esté disfrazado: "You saw (Player) prepare an ambush while visiting your target."
          if (e.cause === "ambush") {
            for (const id of new Set(visitsTo(e.houseId, e.actorId).map((v) => v.visitorId))) {
              if (playerOf(s, id)?.faction === "mafia") continue;
              out.push({ type: "night.notice", payload: { playerId: id, subjectId: e.actorId, notice: "ambusher_seen" } });
            }
          }
          // Wiki (Ambusher.md:216; Messages_ToS.md:2109): "You ambushed someone who visited your target last night!" al Ambusher
          // que elige a un visitante.
          if (e.cause === "ambush" && chosen.length > 0) out.push({ type: "night.notice", payload: { playerId: routed(e.actorId), notice: "ambush_attacked_visitor" } });
          // Wiki (Crusader.md:336; Messages_ToS.md:1869): el Crusader que ataca a un visitante de su objetivo recibe
          // "You attacked someone visiting your target!". Solo el Crusader (cause "crusade"); el Ambusher no lo recibe.
          if (e.cause === "crusade" && chosen.length > 0) out.push({ type: "night.notice", payload: { playerId: routed(e.actorId), notice: "crusader_attacked_visitor" } });
          break;
        }
        case "mafiaKill":
          // Se resuelve abajo: el Godfather prevalece si actúa.
          break;
        case "investigate":
          if (e.check === "bug" && e.targetId !== null) bugs.push({ actorId: e.actorId, targetId: e.targetId });
          else investigations.push({ actorId: e.actorId, targetId: e.targetId, check: e.check });
          break;
        case "mark":
          marks.push({ actorId: e.actorId, targetId: e.targetId, flag: e.flag });
          break;
        case "trap":
          // Ponerse a sí mismo desmonta la trampa propia: no se activa esta noche (wiki: Trapper).
          if (e.targetId === e.actorId) dismantles.push(e.actorId);
          else traps.push({ trapperId: e.actorId, targetId: e.targetId });
          break;
        case "alert":
          alerted.add(e.actorId);
          break;
        case "disguise":
          disguises.set(e.targetId, e.asId);
          break;
        case "hypnosis":
          hypnoses.push({ targetId: e.targetId, message: e.message });
          break;
        case "forge":
          forges.push({ forgerId: e.actorId, targetId: e.targetId, role: e.role, will: e.will });
          break;
        case "build":
          builders.push(e.actorId);
          break;
        default:
          break;
      }
    }
  }

  // 5. Mafia: el ejecutor decidido arriba.
  if (mafiaExecutor) {
    // Wiki (Godfather.md:235, Mafioso.md:279): quien hace la muerte deja su nota, sea el Mafioso o el Godfather.
    const note = s.nightActions[mafiaExecutor.attackerId]?.note;
    // Wiki (Godfather.md:233): si el Mafioso ataca, el Godfather no recibe el aviso de defensa por su orden.
    const godfatherDirect = playerOf(s, mafiaExecutor.attackerId)?.roleKey === "godfather";
    attacks.push({ attackerId: mafiaExecutor.attackerId, victimId: mafiaExecutor.victimId, power: 1, cause: "mafia", ...(note ? { note } : {}), noteAuthorId: mafiaExecutor.attackerId, ...(godfatherDirect ? { godfatherDirect } : {}) });
  }

  // Alerta del Veteran: ataca a todos los que le visitan.
  for (const vetId of alerted) {
    for (const v of visitsTo(vetId, vetId)) {
      attacks.push({ attackerId: vetId, victimId: v.visitorId, power: 2, cause: "veteran" });
      // Wiki (Veteran.md:482): "You shot someone who visited you last night!" por cada visitante al que dispara.
      out.push({ type: "night.notice", payload: { playerId: vetId, notice: "veteran_shot_visitor" } });
    }
  }
  // Trampas activas (colocadas la noche anterior o antes).
  // Wiki (Trapper.md:223): la trampa es poderosa; se activa con una visita y entonces se retira (Trapper.md:227).
  /** Trampas que se activan esta noche. */
  const triggered = new Set<string>();
  /** Wiki (Keyword_System.md:349): solo cuentan como atacantes los visitantes cuyo rol ataca (ataque distinto de "None"). */
  const attacksOnVisit = (id: string): boolean => {
    const roleKey = playerOf(s, id)?.roleKey;
    const attack = roleKey ? catalog.roles.get(roleKey)?.attack : undefined;
    if (attack === undefined) return false;
    return attack !== "None" && !(attack?.startsWith("None (") ?? false);
  };
  for (const [trapperId, trap] of Object.entries(s.traps)) {
    // Una trampa construida y no colocada (targetId null) no se activa.
    if (trap.targetId === null) continue;
    // Wiki (Trapper.md:260, 362, y nota de la versión 3.2.3): la trampa de un Trapper muerto sigue activa hasta que se dispara.
    if (trap.readyDay > s.dayNumber || dismantles.includes(trapperId)) continue;
    const visitors = visitsTo(trap.targetId, trapperId);
    if (visitors.length === 0) continue;
    // Wiki (Trapper.md:219): cualquier visitante activa la trampa (y la gasta), aunque no ataque.
    // Wiki (Keyword_System.md:349): solo daña a los atacantes; si hay varios, a uno solo, elegido al azar, como el
    // visitante del Crusader y del Ambusher (Crusader.md:214, Ambusher.md:216). Trapper.md:223: ataque Powerful.
    const attackers = visitors.filter((v) => attacksOnVisit(v.visitorId));
    // Wiki (Trapper.md:221): el Trapper ve el rol real de cada visitante (sin nombres), también si está muerto (Trapper.md:362).
    const visitorIds = [...new Set(visitors.map((v) => v.visitorId))].sort((a, b) => (playerOf(s, a)?.seat ?? 0) - (playerOf(s, b)?.seat ?? 0));
    const roles = visitorIds.map((id) => playerOf(s, id)?.roleKey).filter((r): r is string => !!r);
    out.push({ type: "trap.triggered", payload: { trapperId, roles, attacked: attackers.length > 0 } });
    if (attackers.length > 0) {
      const attacker = attackers.length === 1 ? attackers[0]! : rng.shuffle(attackers)[0]!;
      attacks.push({ attackerId: trapperId, victimId: attacker.visitorId, power: 2, cause: "trap" });
      // Wiki (Trapper.md:348): "You triggered a trap!" al atacante que la trampa hiere, al final de la noche.
      out.push({ type: "night.notice", payload: { playerId: attacker.visitorId, notice: "trap_triggered" } });
      // Wiki (Keyword_System.md:349, Trapper.md:223, 225): la defensa Poderosa vale una vez y solo contra ese atacante.
      const list = protections.get(trap.targetId) ?? [];
      list.push({ protectorId: trapperId, power: 2, source: "trap", onlyAgainst: attacker.visitorId });
      protections.set(trap.targetId, list);
    }
    triggered.add(trapperId);
    out.push({ type: "trap.removed", payload: { trapperId, reason: "triggered" } });
  }

  // 6. Marcas y trampas (antes de muertes: la limpieza afecta al registro de la muerte).
  const cleaned = new Set<string>();
  const framed = new Set<string>();
  for (const m of marks) {
    if (m.flag === "cleaned") cleaned.add(m.targetId);
    if (m.flag === "framed") framed.add(m.targetId);
    if (m.flag === "blackmailed") {
      out.push({ type: "player.blackmailed", payload: { actorId: m.actorId, targetId: m.targetId } });
    } else {
      out.push({ type: "effect.applied", payload: { actorId: m.actorId, targetId: m.targetId, flag: m.flag } });
    }
  }
  for (const t of traps) {
    out.push({ type: "trap.placed", payload: { trapperId: t.trapperId, targetId: t.targetId, readyDay: s.dayNumber + 1 } });
  }
  for (const trapperId of dismantles) {
    out.push({ type: "trap.removed", payload: { trapperId, reason: "dismantled" } });
  }
  // Wiki (Trapper.md:213, 227, 229): al final de la noche, el Trapper vivo y no bloqueado sin trampa puesta ni lista
  // construye una (lista para colocar la noche siguiente). Con una trampa puesta o lista, no construye otra.
  const standing = new Map<string, { targetId: string | null; readyDay: number }>(Object.entries(s.traps));
  for (const id of triggered) standing.delete(id);
  for (const id of dismantles) standing.delete(id);
  for (const t of traps) standing.set(t.trapperId, { targetId: t.targetId, readyDay: s.dayNumber + 1 });
  for (const id of new Set(builders)) {
    if (!isAlive(playerOf(s, id)) || standing.has(id)) continue;
    standing.set(id, { targetId: null, readyDay: s.dayNumber + 1 });
    out.push({ type: "trap.built", payload: { trapperId: id, readyDay: s.dayNumber + 1 } });
  }
  // Wiki (Vigilante.md:358, 360): "You decide to wait a day before using your gun." en la primera noche.
  // Wiki (Jailor.md:550, 552): "You must wait a day before executing." en la primera noche.
  if (s.dayNumber === 1) {
    for (const p of s.players) {
      if (p.roleKey === "vigilante" && isAlive(p)) out.push({ type: "night.notice", payload: { playerId: p.id, notice: "vigilante_wait_day" } });
      if (p.roleKey === "jailor" && isAlive(p)) out.push({ type: "night.notice", payload: { playerId: p.id, notice: "jailor_wait_day" } });
    }
  }
  // Wiki (Transporter.md:208): los dos transportados reciben el aviso al terminar la noche.
  for (const [firstId, secondId] of swaps) {
    for (const id of [firstId, secondId]) {
      if (isAlive(playerOf(s, id))) out.push({ type: "night.notice", payload: { playerId: id, notice: "transported" } });
    }
  }
  // Mensajes falsos de la Hypnotist: llegan al terminar la noche, solo a quien sigue vivo.
  for (const h of hypnoses) {
    const target = playerOf(s, h.targetId);
    if (!isAlive(target)) continue;
    // Wiki (Hypnotist.md:262): a quien es inmune al bloqueo le llega el mensaje de inmunidad.
    const immune = h.message === "roleblocked" && handlerOf(target)?.roleblockImmune === true;
    out.push({ type: "hypnosis.message", payload: { playerId: h.targetId, message: immune ? "roleblock_immune" : h.message } });
  }
  for (const f of forges) {
    if (isAlive(playerOf(s, f.targetId))) out.push({ type: "will.forged", payload: { playerId: f.targetId, role: f.role, forgerId: f.forgerId } });
  }
  // Rol que se mostrará al morir: el último que falsificó el Forger (esta noche o antes).
  // Wiki (Forger.md:226): si varios Forger eligen a la misma víctima, manda el que eligió primero. "Primero" es el
  // orden en que enviaron su acción nocturna (s.nightActions); el orden de resolución es por asiento y no sirve.
  const selectionOrder = Object.keys(s.nightActions);
  const firstForge = new Map<string, (typeof forges)[number]>();
  for (const f of [...forges].sort((a, b) => selectionOrder.indexOf(a.forgerId) - selectionOrder.indexOf(b.forgerId))) {
    if (!firstForge.has(f.targetId)) firstForge.set(f.targetId, f);
  }
  const forged = new Map<string, string>([...firstForge].map(([id, f]) => [id, f.role]));
  const forgedWills = new Map<string, string>([...firstForge].map(([id, f]) => [id, f.will]));
  for (const vetId of alerted) {
    out.push({ type: "effect.applied", payload: { actorId: vetId, targetId: vetId, flag: "alert" } });
  }
  for (const u of usesSpent) {
    out.push({ type: "ability.used", payload: { playerId: u.playerId, ability: u.ability } });
    // Wiki (Vigilante, Veteran): cuántas balas o alertas quedan. Se gasta una por noche, así que queda uno menos.
    // Wiki (Bodyguard.md:426): "You have (#) bulletproof vest(s) left."
    // Wiki (Doctor.md:399): "You have (#) self heal(s) left."; (Jailor.md:546): "You have (#) execution(s) left.";
    // (Forger.md:488): "You have (#) forger(y / ies) left."; (Janitor.md:390): "You have (#) cleaning(s) left.".
    // Sin contador en la wiki: Mayor (reveal, Mayor.md) y Medium (sesión, Medium.md). Ver ROLES_STATUS.md.
    if (USES_WITH_COUNTER.has(u.ability)) {
      const left = (playerOf(s, u.playerId)?.usesLeft[u.ability] ?? 0) - 1;
      out.push({ type: "uses.left", payload: { playerId: u.playerId, ability: u.ability, left } });
    }
  }

  // 7. Investigaciones: calculadas con el estado de la noche. Un encuadre dura hasta que un rol investigativo
  // apunta al objetivo (wiki: Framer.md:344, versión 3.3.0); se quita después de calcular el resultado.
  /** Objetivos encuadrados que un rol investigativo ha investigado esta noche. */
  const unframed = new Set<string>();
  const roleName = (id: string) => {
    const p = playerOf(s, id);
    return p?.roleKey ? catalog.roles.get(p.roleKey)?.name ?? p.roleKey : "desconocido";
  };
  const nick = (id: string) => playerOf(s, id)?.nick ?? "?";
  for (const inv of investigations) {
    const target = inv.targetId ?? inv.actorId;
    // Disfraz: el Investigador y el Sheriff ven el rol de la persona por la que se hace pasar.
    const shownId = disguises.get(target) ?? target;
    const shown = playerOf(s, shownId);
    const isFramed = framed.has(target) || playerOf(s, target)?.flags.framed === true;
    // Solo las investigaciones con objetivo (Psychic y el espionaje de Mafia no apuntan a nadie).
    if (inv.targetId !== null && isFramed && INVESTIGATIVE_ROLE_KEYS.has(playerOf(s, inv.actorId)?.roleKey ?? "")) {
      unframed.add(target);
    }
    let result = "";
    let side: "mafia" | "town" | undefined;
    let more = false;
    switch (inv.check) {
      case "suspicious": {
        const sus = isFramed || (shown?.faction === "mafia" && shown.roleKey !== "godfather");
        result = sus ? "suspicious" : "innocent";
        break;
      }
      case "group": {
        // Wiki (Investigator.md, Mechanics): Frames > Douses > Disguises > resultado normal. Encuadrado: el grupo
        // "Framer, Vampire, or Jester". Si el rol no está en la tabla Classic, el resultado queda vacío.
        const groupRole = isFramed ? "framer" : shown?.roleKey ?? null;
        const group = groupRole ? investigatorGroupOf(groupRole) : null;
        result = group ? group.join(",") : "";
        break;
      }
      case "role":
        // Wiki (Consigliere): el disfraz no cambia el rol que ve; siempre es el real.
        result = roleName(target);
        break;
      case "visitors": {
        // Wiki (Lookout.md:178-182): solo identifica a tres visitantes, elegidos al azar; sabe que hubo más.
        const visitors = visitsTo(target, inv.actorId).map((v) => v.visitorId);
        more = visitors.length > 3;
        const listed = more ? rng.shuffle(visitors).slice(0, 3) : visitors;
        result = listed.map((id) => nick(id)).join(", ") || "nadie";
        break;
      }
      case "targets":
        // Wiki (Tracker.md:194): si el objetivo no visita a nadie, el Tracker no recibe nada (ver abajo).
        result = visits.filter((v) => v.visitorId === target).map((v) => nick(v.houseId)).join(", ");
        break;
      case "mafiaVisits": {
        // Wiki (Disguiser.md:217): el Spy no ve las visitas de un Mafioso disfrazado de no-Mafia. Cuenta cada visita.
        const houses = visits
          .filter((v) => {
            if (playerOf(s, v.visitorId)?.faction !== "mafia") return false;
            const asId = disguises.get(v.visitorId);
            return asId === undefined || playerOf(s, asId)?.faction === "mafia";
          })
          .map((v) => nick(v.houseId));
        result = houses.join(", ") || "nadie";
        break;
      }
      case "vision": {
        // Impares: 3 jugadores, al menos uno Mafia. Pares: 2 jugadores, al menos uno Town.
        const alive = s.players.filter((x) => x.status === "alive" && x.id !== inv.actorId);
        const wantMafia = s.dayNumber % 2 === 1;
        // Wiki (Psychic.md:318): entre los tres últimos vivos en noche impar, no hay visión: solo el aviso.
        if (wantMafia && alive.length + 1 <= 3) {
          out.push({ type: "night.notice", payload: { playerId: inv.actorId, notice: "psychic_small" } });
          continue;
        }
        // Wiki (Psychic.md:322): en noche par, si no quedan otros Townies ni Neutral Benign vivos, solo el aviso.
        const goodAlive = alive.some((x) => x.faction === "town" || (x.roleKey !== null && catalog.roles.get(x.roleKey)?.alignmentKey === "neutral_benign"));
        if (!wantMafia && !goodAlive) {
          out.push({ type: "night.notice", payload: { playerId: inv.actorId, notice: "psychic_evil" } });
          continue;
        }
        const sideKey = wantMafia ? "mafia" : "town";
        side = sideKey;
        const sideAlive = rng.shuffle(alive.filter((x) => x.faction === sideKey));
        const others = rng.shuffle(alive.filter((x) => x.id !== sideAlive[0]?.id));
        const picks = [...(sideAlive[0] ? [sideAlive[0]] : []), ...others].slice(0, wantMafia ? 3 : 2);
        result = rng.shuffle(picks).map((x) => x.nick).join(", ") || "nadie";
        break;
      }
      default:
        result = "";
    }
    if (inv.check === "targets" && result === "") continue;
    out.push({
      type: "investigation.result",
      payload: { investigatorId: routed(inv.actorId), targetId: target, result, check: inv.check, ...(side ? { side } : {}), ...(more ? { more } : {}) },
    });
  }

  // 8. Ataques contra protecciones. Un ataque que mata a alguien ya muerto no hace nada.
  const dead = new Set(s.players.filter((p) => p.status !== "alive").map((p) => p.id));
  /** Payload del `player.killed` de cada muerte de la noche, para añadirle las causas extra (wiki: Messages_ToS.md:151). */
  const killPayloadOf = new Map<string, { cause: string; causes?: string[] }>();
  const kill = (playerId: string, cause: string, reasons?: string[], note?: string): boolean => {
    if (dead.has(playerId)) return false;
    dead.add(playerId);
    // Wiki (Forger): la falsificación solo vale si la víctima muere esa misma noche.
    const roleKey = cleaned.has(playerId) ? null : forged.get(playerId) ?? playerOf(s, playerId)?.roleKey ?? null;
    // Un limpiado no deja testamento visible (wiki: Janitor).
    // Wiki (Forger.md:34, 156): el testamento falsificado reemplaza al real; en blanco, no queda testamento (Forger.md:218).
    const forgedWill = forgedWills.get(playerId);
    const will = cleaned.has(playerId) ? null : forgedWill !== undefined ? forgedWill || null : s.wills[playerId] ?? null;
    const killed = { playerId, cause, roleKey, will, ...(cleaned.has(playerId) ? { cleaned: true } : {}), ...(reasons ? { reasons } : {}), ...(note ? { note } : {}) };
    out.push({ type: "player.killed", payload: killed });
    killPayloadOf.set(playerId, killed);
    // Wiki (Janitor.md:214): el Janitor que lo limpió sabe su rol real al amanecer.
    const janitorId = marks.find((m) => m.flag === "cleaned" && m.targetId === playerId)?.actorId;
    if (cleaned.has(playerId) && janitorId !== undefined) {
      // Wiki (Janitor.md:222-228): el Janitor lee el testamento original; a los demás no les llega (will: null arriba).
      out.push({ type: "clean.revealed", payload: { janitorId, playerId, roleKey: playerOf(s, playerId)?.roleKey ?? null, will: s.wills[playerId] ?? null } });
    }
    return true;
  };
  /** Trampas ya gastadas esta noche: cada una defiende de un solo ataque. */
  const trapSpent = new Set<string>();
  /** Defensa que enfrenta un ataque, sin efectos: guardaespaldas, la mejor protección médica y la defensa Basic. */
  const defenseOf = (atk: Attack) => {
    const prots = protections.get(atk.victimId) ?? [];
    // Wiki (Bodyguard.md:214, 228): el guardaespaldas solo contraataca a la Mafia (Godfather, Mafioso) y al
    // Vigilante, y a otros roles que matan; no protege de Veteran, Ambusher ni de Town Protectives.
    const counters = atk.cause === "mafia" || atk.cause === "shot";
    // Un zombi está muerto, pero su guardaespaldas actúa esta noche (wiki: Retributionist.md:388).
    const bodyguard = counters ? prots.find((p) => p.source === "bodyguard" && !countered.has(p.protectorId) && (!dead.has(p.protectorId) || raisedBy.has(p.protectorId))) : undefined;
    // La defensa de la trampa solo cuenta contra su atacante (Keyword_System.md:349) y una vez por noche.
    const medical = prots.filter(
      (p) => p.source !== "bodyguard" && (p.onlyAgainst === undefined || p.onlyAgainst === atk.attackerId) && !(p.source === "trap" && trapSpent.has(atk.victimId)),
    );
    const strongest = medical.reduce<Protection | undefined>((best, p) => (!best || p.power > best.power ? p : best), undefined);
    // Wiki (Godfather): Basic Defense permanente; un ataque Basic no le mata.
    const baseDefense = playerOf(s, atk.victimId)?.roleKey === "godfather" ? 1 : 0;
    const defense = Math.max(strongest?.power ?? 0, alerted.has(atk.victimId) ? 1 : 0, baseDefense);
    return { bodyguard, strongest, baseDefense, defense };
  };
  /** Defensa que impide morir en un contraataque del Bodyguard: Doctor o Crusader con defensa Powerful (wiki:
   * Bodyguard.md:260, 304). La de la cárcel y la de la trampa no sirven (Bodyguard.md:230; Jailor.md:362). */
  const counterproofOf = (id: string): Protection | undefined => {
    if (dead.has(id)) return undefined;
    return (protections.get(id) ?? []).find((p) => (p.source === "doctor" || p.source === "crusader") && p.power === 2);
  };
  /** Doctor que cura con éxito a un atacado, o Crusader cuyo objetivo es atacado, recibe "Your target was attacked last night!",
   * una vez por noche (wiki: Doctor.md:223, 251; Crusader.md:216; Messages_ToS.md:1865). */
  const noteTargetAttacked = (protectorId: string) => {
    const healer = routed(protectorId);
    if (healersNotified.has(healer)) return;
    healersNotified.add(healer);
    out.push({ type: "night.notice", payload: { playerId: healer, notice: "target_attacked" } });
  };
  /** Avisos de quien sobrevive a un ataque (sin morir): la defensa lo ha parado. */
  const survivorNotices = (atk: Attack) => {
    // Wiki (Crusader.md:330; Messages_ToS.md:1861): "You were attacked by a Crusader!" al visitante que sobrevive.
    if (atk.cause === "crusade") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "crusader_attacked_you" } });
    // Wiki (Mafia_Killing.md:13, 15; Godfather.md:487; Mafioso.md:475; Ambusher.md:364): "You were attacked by a member
    // of the Mafia!" al superviviente de la Mafia o del Ambusher, al terminar la noche.
    if (atk.cause === "mafia" || atk.cause === "ambush") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "mafia_attacked_you" } });
  };
  for (let i = 0; i < attacks.length; i++) {
    const atk = attacks[i]!;
    // Wiki (Doctor.md:249; Crusader.md:216; Messages_ToS.md:1865): "Your target was attacked last night!" cuando alguien
    // intenta atacar a su objetivo, lo logre o no, también si el ataque es letal ("attacked in any way, shape, or form").
    // Va antes de las muertes: el intento cuenta aunque la víctima ya haya muerto.
    for (const p of protections.get(atk.victimId) ?? []) {
      if (p.source === "crusader" || p.source === "doctor") noteTargetAttacked(p.protectorId);
    }
    if (dead.has(atk.victimId)) {
      // Wiki (Messages_ToS.md:151, 154): un segundo asesino que también habría matado añade su causa; no cambia nada más
      // (la culpa, el chaleco y las protecciones se resuelven igual que antes).
      const payload = killPayloadOf.get(atk.victimId);
      if (payload && (atk.unstoppable || (!defenseOf(atk).bodyguard && atk.power > defenseOf(atk).defense))) {
        payload.causes = [...(payload.causes ?? [payload.cause]), atk.cause];
      }
      continue;
    }
    const victim = playerOf(s, atk.victimId);
    // Vigilante: si su disparo mata a un Town, la culpa le quitará la vida la noche siguiente (wiki: Vigilante).
    const killVictim = (cause: string) => {
      if (!kill(atk.victimId, cause, atk.reasons, atk.note)) return;
      // Wiki (Spy.md:239, 243, 247, 275): lo que ve el espionaje de quien muere por un ataque directo.
      const killTag = SPY_KILL_TAG[cause];
      if (killTag) tagSpy(atk.victimId, killTag);
      // Wiki (Death_Note_ToS.md:17): la nota del asesino se puede cambiar la mañana en que se anuncia la víctima.
      if (atk.noteAuthorId !== undefined) {
        out.push({ type: "death.note.authored", payload: { victimId: atk.victimId, authorId: atk.noteAuthorId, dayNumber: s.dayNumber + 1, note: atk.note ?? "" } });
      }
      if (atk.cause === "shot" && victim?.faction === "town" && !dead.has(atk.attackerId)) {
        out.push({ type: "effect.applied", payload: { actorId: atk.attackerId, targetId: atk.attackerId, flag: "guilty" } });
        // Wiki (Vigilante.md:362): "You have put away your gun for killing a town member." (al matar a un Town).
        out.push({ type: "night.notice", payload: { playerId: atk.attackerId, notice: "vigilante_put_away_gun" } });
      }
      // Wiki (Jailor.md:590; Messages_ToS.md:1723): "You were executed by the Jailor!" al prisionero ejecutado, al amanecer.
      if (cause === "execute") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "jailor_executed" } });
      // Wiki (Vigilante.md:370): "You could not get over the guilt of killing a town member. You shot yourself!"
      if (cause === "guilt") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "vigilante_guilt_suicide" } });
      // Wiki (Vigilante.md:366): "You were shot by a Vigilante!" al que mata un disparo del Vigilante.
      if (cause === "shot") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "vigilante_shot_you" } });
      // Wiki (Veteran.md:478): "You were shot by the Veteran you visited!" al visitante que mata la alerta.
      if (cause === "veteran") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "veteran_shot_you" } });
    };
    // Jailor: ejecutar a un Town le quita las siguientes ejecuciones.
    if (atk.cause === "execute" && victim?.faction === "town" && !dead.has(atk.attackerId)) {
      out.push({ type: "effect.applied", payload: { actorId: atk.attackerId, targetId: atk.attackerId, flag: "noExecute" } });
    }

    if (atk.unstoppable) {
      killVictim(atk.cause);
      continue;
    }
    const { bodyguard, strongest, baseDefense, defense } = defenseOf(atk);
    if (bodyguard) {
      countered.add(bodyguard.protectorId);
      prevented.add(atk.victimId);
      out.push({ type: "attack.prevented", payload: { victimId: atk.victimId, protectorId: routed(bodyguard.protectorId) } });
      // Wiki (Bodyguard.md:438): "You were attacked but someone fought off your attacker!" al protegido.
      out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "bodyguard_saved" } });
      // Wiki (Spy.md:235): "Your target was attacked but someone fought off their attacker!"
      tagSpy(atk.victimId, "attack_fought_off");
      // Wiki (Doctor.md:259): el Doctor que cura a un protegido por el Bodyguard recibe igualmente "Your target was
      // attacked last night!". El protegido no recibe "healed" (ver arriba). Doctor.md:263 dice lo contrario y se marca
      // como bug: errata no replicada (ROLES_STATUS.md).
      const victimDoctor = (protections.get(atk.victimId) ?? []).find((p) => p.source === "doctor");
      if (victimDoctor) noteTargetAttacked(victimDoctor.protectorId);
      // Wiki (Bodyguard.md:210): el contraataque es un ataque Powerful contra el atacante y contra el Bodyguard.
      // Wiki (Bodyguard.md:304; Doctor.md:217): Doctor, Crusader, Potion Master o Guardian Angel pueden impedir que
      // muera el atacante, o el Bodyguard, cada uno por su lado. Aquí solo Doctor y Crusader (MVP); la defensa de la
      // cárcel y la de la trampa no cuentan (Bodyguard.md:230; Jailor.md:362).
      const attackerCure = counterproofOf(atk.attackerId);
      if (attackerCure) {
        out.push({ type: "attack.prevented", payload: { victimId: atk.attackerId, protectorId: routed(attackerCure.protectorId) } });
        if (attackerCure.source === "doctor") {
          // Wiki (Messages_ToS.md:1893): "You were attacked but someone nursed you back to health!" al atacante curado.
          out.push({ type: "night.notice", payload: { playerId: atk.attackerId, notice: "healed" } });
          // Wiki (Spy.md:255): "A Bodyguard attacked your target but someone nursed them back to health!"
          tagSpy(atk.attackerId, "bodyguard_attack_healed");
          noteTargetAttacked(attackerCure.protectorId);
        }
      } else if (kill(atk.attackerId, "bodyguard")) {
        // Wiki (Bodyguard.md:434, 430): avisos de muerte del atacante y del Bodyguard, solo si de verdad mueren.
        out.push({ type: "night.notice", payload: { playerId: atk.attackerId, notice: "bodyguard_killed_you" } });
        // Wiki (Spy.md:259): "Your target was killed by a Bodyguard!"
        tagSpy(atk.attackerId, "killed_by_bodyguard");
      }
      // Causa distinta de la del atacante: el Bodyguard "died guarding someone" (wiki: Bodyguard.md:450).
      const guardCure = counterproofOf(bodyguard.protectorId);
      if (guardCure) {
        out.push({ type: "attack.prevented", payload: { victimId: bodyguard.protectorId, protectorId: routed(guardCure.protectorId) } });
        if (guardCure.source === "doctor") {
          out.push({ type: "night.notice", payload: { playerId: bodyguard.protectorId, notice: "healed" } });
          noteTargetAttacked(guardCure.protectorId);
        }
      } else if (kill(bodyguard.protectorId, "guarding")) {
        out.push({ type: "night.notice", payload: { playerId: bodyguard.protectorId, notice: "bodyguard_killed_protecting" } });
        // Wiki (Spy.md:249): "Your target was killed protecting someone!"
        tagSpy(bodyguard.protectorId, "killed_guarding");
      }
      survivorNotices(atk);
      continue;
    }
    if (atk.power > defense) {
      killVictim(atk.cause);
    } else {
      prevented.add(atk.victimId);
      if (strongest) out.push({ type: "attack.prevented", payload: { victimId: atk.victimId, protectorId: routed(strongest.protectorId) } });
      // Wiki (Godfather.md:233): el Godfather que ataca recibe aviso si el objetivo tiene defensa; el texto es el de
      // Messages_ToS.md:383 ("Your target's defense was too strong to kill."), también si el objetivo fue curado.
      if (atk.godfatherDirect) out.push({ type: "night.notice", payload: { playerId: atk.attackerId, notice: "godfather_target_defense" } });
      // Wiki (Doctor.md:229, 269): "their attacker will receive the message "Your target's defense was too strong to kill."",
      // cualquier atacante cuyo ataque frena un Doctor (no solo el Godfather que ataca él mismo; Godfather.md:233).
      // Wiki (Mafioso.md:235): quien hace la muerte "Receive a message if the target has defense". Si ejecuta el Mafioso,
      // lo recibe él y no el Godfather (Godfather.md:233). Cause "mafia" sin godfatherDirect = el Mafioso que ejecuta.
      else if (atk.cause === "mafia" || strongest?.source === "doctor") out.push({ type: "night.notice", payload: { playerId: atk.attackerId, notice: "target_defense" } });
      // Wiki (Messages_ToS.md:1873; Crusader.md:216): "You were attacked but someone protected you!" al protegido por un Crusader.
      if (strongest?.source === "crusader") out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "crusader_protected" } });
      survivorNotices(atk);
      if (strongest?.source === "trap") {
        trapSpent.add(atk.victimId);
        // Wiki (Trapper.md:352): "You were attacked but a trap saved you!" al objetivo que la trampa protegió.
        out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "trap_saved" } });
      }
      // Wiki (Bodyguard.md:250, 444): "You were attacked but your bulletproof vest saved you!" al Bodyguard que usó el chaleco.
      if (strongest?.source === "vest" && !vestNotified.has(atk.victimId)) {
        vestNotified.add(atk.victimId);
        out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "vest_saved" } });
      }
      // Wiki (Veteran.md:486): "Someone tried to attack you but your defense while on alert was too strong!" Lo recibe el
      // Veteran, cuando solo la alerta (Basic Defense) detuvo al atacante.
      if (alerted.has(atk.victimId) && !strongest) out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "alert_blocked" } });
      // Espionaje (wiki: Spy.md:237, 271, 273, 261): la defensa que detuvo el ataque. La tabla del Spy (Spy.md:221-309)
      // no tiene mensaje para la trampa: se usa la clave anterior "protect" para no decir que no pasó nada (SKIPPED).
      if (strongest?.source === "doctor") tagSpy(atk.victimId, "attack_healed");
      else if (strongest?.source === "vest") tagSpy(atk.victimId, "attack_vest");
      else if (strongest?.source === "trap") tagSpy(atk.victimId, "protect");
      else if (!strongest && alerted.has(atk.victimId)) tagSpy(atk.victimId, "attack_alert");
      else if (!strongest && baseDefense >= atk.power) tagSpy(atk.victimId, "attack_defense");
      // Wiki (Doctor.md:225, 253): el atacado recibe el aviso de curación, uno por ataque aunque haya varios Doctors.
      if (strongest?.source === "doctor") {
        out.push({ type: "night.notice", payload: { playerId: atk.victimId, notice: "healed" } });
        // Wiki (Doctor.md:223, 251): el Doctor que cura con éxito a un atacado recibe "Your target was attacked last night!",
        // una sola vez por noche aunque sean varios ataques. Si el ataque es letal y no se evita, no hay aviso.
        noteTargetAttacked(strongest.protectorId);
      }
    }
  }

  // 9. Espionaje (wiki: Spy.md:189-205): lo que recibió el objetivo esta noche, con el resultado de los ataques.
  for (const bug of bugs) {
    const target = bug.targetId;
    // El espionaje también investiga: si el objetivo está encuadrado, el encuadre termina (wiki: Framer.md:344).
    if ((framed.has(target) || playerOf(s, target)?.flags.framed === true) && INVESTIGATIVE_ROLE_KEYS.has(playerOf(s, bug.actorId)?.roleKey ?? "")) {
      unframed.add(target);
    }
    const tags: string[] = [];
    if (s.jailedBy[target] !== undefined) {
      tags.push("jail");
    } else {
      // Wiki (Spy.md:225, 229): transporte y chantaje; el bloqueo (Spy.md:227) y los ataques van por tagSpy.
      if (swaps.some(([a, b]) => a === target || b === target)) tags.push("transport");
      if (marks.some((m) => m.flag === "blackmailed" && m.targetId === target)) tags.push("blackmail");
      tags.push(...(spyTags.get(target) ?? []));
      // Wiki (Spy.md:251, 213, 481): "Your target's target was attacked last night!" solo lo da un Doctor o un Crusader
      // cuyo objetivo fue atacado esa noche ("unique to the Doctor and Crusader"). El Witch/Coven Leader queda fuera del MVP.
      const protects = (p: Protection) => p.protectorId === target && (p.source === "doctor" || p.source === "crusader");
      if ([...protections].some(([victimId, prots]) => prots.some(protects) && attacks.some((a) => a.victimId === victimId))) {
        tags.push("target_target_attacked");
      }
      // Wiki (Hypnotist.md:226; Spy.md:191): el Spy que espía a un objetivo ve el mensaje falso que le envió la Hypnotist.
      const planted = hypnoses.find((h) => h.targetId === target && isAlive(playerOf(s, target)));
      if (planted) {
        const immune = planted.message === "roleblocked" && handlerOf(playerOf(s, target)!)?.roleblockImmune === true;
        tags.push(`hypno_${immune ? "roleblock_immune" : planted.message}`);
      }
    }
    out.push({
      type: "investigation.result",
      payload: { investigatorId: routed(bug.actorId), targetId: target, result: tags.join(",") || "nada", check: "bug" },
    });
  }

  for (const targetId of unframed) out.push({ type: "effect.cleared", payload: { targetId, flag: "framed" } });

  out.push(...promotionEvents(s, dead));
  out.push({ type: "night.resolved", payload: { dayNumber: s.dayNumber } });
  return out;
}
