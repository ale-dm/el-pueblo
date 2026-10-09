import type { Catalog } from "../../types/catalog.js";
import type { EventInput } from "../../types/events.js";
import type { GameState, PlayerState } from "../../types/state.js";
import type { Rng } from "../../core/rng.js";
import type { Effect } from "../../roles/effects.js";
import type { RoleHandler } from "../../roles/types.js";
import { handlerOf, isAlive, playerOf } from "../context.js";
import { promotionEvents } from "../promotion.js";

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
  source: "doctor" | "bodyguard" | "crusader" | "jail";
}

interface Attack {
  attackerId: string;
  victimId: string;
  power: 1 | 2;
  cause: string;
  /** Ataque imparable: ignora protecciones y guardaespaldas (ejecución del Jailor). */
  unstoppable?: boolean;
}

interface Act {
  actor: PlayerState;
  handler: RoleHandler;
  ability: string;
  targetId: string | null;
  secondTargetId: string | null;
  choice: string | null;
  effects: Effect[];
  blocked: boolean;
}

const remapEffect = (e: Effect, remap: (id: string) => string): Effect => {
  switch (e.kind) {
    case "block":
      return { ...e, targetId: remap(e.targetId) };
    case "transport":
      return e;
    case "protect":
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
      effects: [],
      blocked: actor.flags.jailed === true,
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
      effects: [],
      blocked: actor.flags.jailed === true,
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
      catalog,
      rng,
    });
  }

  // 1. Bloqueos: solo bloqueadores activos, en orden de prioridad.
  for (const blocker of acts) {
    if (blocker.blocked) continue;
    for (const e of blocker.effects) {
      if (e.kind !== "block") continue;
      const target = acts.find((a) => a.actor.id === e.targetId);
      if (!target || target.handler.roleblockImmune) continue;
      target.blocked = true;
    }
  }
  for (const act of acts) {
    if (!act.blocked) continue;
    act.effects = [];
    out.push({ type: "night.action.blocked", payload: { actorId: act.actor.id, ability: act.ability } });
  }
  const active = acts.filter((a) => !a.blocked);

  // 2. Transportes: intercambian los objetivos de dos jugadores.
  let remap = (id: string) => id;
  for (const act of active) {
    for (const e of act.effects) {
      if (e.kind !== "transport") continue;
      const prev = remap;
      const { firstId, secondId } = e;
      remap = (id) => {
        const x = prev(id);
        return x === firstId ? secondId : x === secondId ? firstId : x;
      };
    }
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
  const blockedIds = new Set(acts.filter((a) => a.blocked).map((a) => a.actor.id));
  const mafiosoExecutes = !!godOrder && !!mafiosoPlayer && !blockedIds.has(mafiosoPlayer.id);
  let mafiaExecutor: { attackerId: string; victimId: string } | null = null;
  if (godOrder && mafiosoExecutes && mafiosoPlayer) mafiaExecutor = { attackerId: mafiosoPlayer.id, victimId: godOrder.targetId };
  else if (godOrder) mafiaExecutor = { attackerId: godOrder.actorId, victimId: godOrder.targetId };
  else if (ownKill) mafiaExecutor = { attackerId: ownKill.actorId, victimId: ownKill.targetId };

  // 3. Visitas: habilidades que apuntan a un jugador.
  const visits: Visit[] = [];
  for (const act of active) {
    // Un muerto (Medium) no visita casas: sus efectos no llegan a Lookout ni a Sheriff.
    if (!isAlive(act.actor)) continue;
    // Con orden del Godfather, la visita de la Mafia es la del Mafioso que mata (abajo).
    if (mafiosoExecutes && (act.handler.key === "godfather" || act.handler.key === "mafioso")) continue;
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    if (def?.target === "player" && act.targetId !== null) {
      visits.push({ visitorId: act.actor.id, houseId: remap(act.targetId) });
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
  const attacks: Attack[] = [];
  const marks: Array<{ actorId: string; targetId: string; flag: "framed" | "cleaned" | "blackmailed" | "zombied" }> = [];
  const investigations: Array<{ actorId: string; targetId: string | null; check: string }> = [];
  const traps: Array<{ trapperId: string; targetId: string }> = [];
  const usesSpent: Array<{ playerId: string; ability: string }> = [];
  const disguises = new Map<string, string>();
  const hypnoses: Array<{ targetId: string; message: "attacked" | "protected" | "roleblocked" }> = [];
  const forges: Array<{ forgerId: string; targetId: string; role: string }> = [];

  for (const act of active) {
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    if (def?.usesLimit !== null && def?.usesLimit !== undefined) {
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
          attacks.push({ attackerId: e.actorId, victimId: e.targetId, power: e.power, cause: e.cause, unstoppable: e.unstoppable });
          break;
        case "attackVisitors":
          for (const v of visitsTo(e.houseId, e.actorId)) {
            attacks.push({ attackerId: e.actorId, victimId: v.visitorId, power: e.power, cause: e.cause });
          }
          break;
        case "mafiaKill":
          // Se resuelve abajo: el Godfather prevalece si actúa.
          break;
        case "investigate":
          investigations.push({ actorId: e.actorId, targetId: e.targetId, check: e.check });
          break;
        case "mark":
          marks.push({ actorId: e.actorId, targetId: e.targetId, flag: e.flag });
          break;
        case "trap":
          traps.push({ trapperId: e.actorId, targetId: e.targetId });
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
          forges.push({ forgerId: e.actorId, targetId: e.targetId, role: e.role });
          break;
        default:
          break;
      }
    }
  }

  // 5. Mafia: el ejecutor decidido arriba.
  if (mafiaExecutor) {
    attacks.push({ attackerId: mafiaExecutor.attackerId, victimId: mafiaExecutor.victimId, power: 1, cause: "mafia" });
  }

  // Alerta del Veteran: ataca a todos los que le visitan.
  for (const vetId of alerted) {
    for (const v of visitsTo(vetId, vetId)) {
      attacks.push({ attackerId: vetId, victimId: v.visitorId, power: 2, cause: "veteran" });
    }
  }
  // Trampas activas (colocadas la noche anterior o antes).
  for (const [trapperId, trap] of Object.entries(s.traps)) {
    if (!isAlive(playerOf(s, trapperId)) || trap.readyDay > s.dayNumber) continue;
    for (const v of visitsTo(trap.targetId, trapperId)) {
      attacks.push({ attackerId: trapperId, victimId: v.visitorId, power: 1, cause: "trap" });
    }
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
  // Mensajes falsos de la Hypnotist: llegan al terminar la noche, solo a quien sigue vivo.
  for (const h of hypnoses) {
    if (isAlive(playerOf(s, h.targetId))) out.push({ type: "hypnosis.message", payload: { playerId: h.targetId, message: h.message } });
  }
  for (const f of forges) {
    if (isAlive(playerOf(s, f.targetId))) out.push({ type: "will.forged", payload: { playerId: f.targetId, role: f.role, forgerId: f.forgerId } });
  }
  // Rol que se mostrará al morir: el último que falsificó el Forger (esta noche o antes).
  const forged = new Map<string, string>(forges.map((f) => [f.targetId, f.role]));
  for (const vetId of alerted) {
    out.push({ type: "effect.applied", payload: { actorId: vetId, targetId: vetId, flag: "alert" } });
  }
  for (const u of usesSpent) {
    out.push({ type: "ability.used", payload: { playerId: u.playerId, ability: u.ability } });
  }

  // 7. Investigaciones: calculadas con el estado de la noche.
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
    let result = "";
    switch (inv.check) {
      case "suspicious": {
        const sus = isFramed || (shown?.faction === "mafia" && shown.roleKey !== "godfather");
        result = sus ? "suspicious" : "innocent";
        break;
      }
      case "alignment": {
        const key = shown?.roleKey ? catalog.roles.get(shown.roleKey)?.alignmentKey : null;
        result = isFramed ? "mafia_deception" : key ?? "unknown";
        break;
      }
      case "role":
        // Wiki (Consigliere): el disfraz no cambia el rol que ve; siempre es el real.
        result = roleName(target);
        break;
      case "visitors":
        result = visitsTo(target, inv.actorId).map((v) => nick(v.visitorId)).join(", ") || "nadie";
        break;
      case "targets":
        result = visits.filter((v) => v.visitorId === target).map((v) => nick(v.houseId)).join(", ") || "nadie";
        break;
      case "mafiaVisits": {
        const houses = visits
          .filter((v) => playerOf(s, v.visitorId)?.faction === "mafia")
          .map((v) => nick(v.houseId));
        result = [...new Set(houses)].join(", ") || "nadie";
        break;
      }
      case "vision": {
        // Impares: 3 jugadores, al menos uno Mafia. Pares: 2 jugadores, al menos uno Town.
        const alive = s.players.filter((x) => x.status === "alive" && x.id !== inv.actorId);
        const wantMafia = s.dayNumber % 2 === 1;
        const sideKey = wantMafia ? "mafia" : "town";
        const sideAlive = rng.shuffle(alive.filter((x) => x.faction === sideKey));
        const others = rng.shuffle(alive.filter((x) => x.id !== sideAlive[0]?.id));
        const picks = [...(sideAlive[0] ? [sideAlive[0]] : []), ...others].slice(0, wantMafia ? 3 : 2);
        result = rng.shuffle(picks).map((x) => x.nick).join(", ") || "nadie";
        break;
      }
      default:
        result = "";
    }
    out.push({
      type: "investigation.result",
      payload: { investigatorId: inv.actorId, targetId: target, result, check: inv.check },
    });
  }

  // 8. Ataques contra protecciones. Un ataque que mata a alguien ya muerto no hace nada.
  const dead = new Set(s.players.filter((p) => p.status !== "alive").map((p) => p.id));
  const kill = (playerId: string, cause: string) => {
    if (dead.has(playerId)) return;
    dead.add(playerId);
    // Wiki (Forger): la falsificación solo vale si la víctima muere esa misma noche.
    const roleKey = cleaned.has(playerId) ? null : forged.get(playerId) ?? playerOf(s, playerId)?.roleKey ?? null;
    // Un limpiado no deja testamento visible (wiki: Janitor).
    const will = cleaned.has(playerId) ? null : s.wills[playerId] ?? null;
    out.push({ type: "player.killed", payload: { playerId, cause, roleKey, will } });
  };
  for (let i = 0; i < attacks.length; i++) {
    const atk = attacks[i]!;
    if (dead.has(atk.victimId)) continue;
    const victim = playerOf(s, atk.victimId);

    // Vigilante: disparar a un Town le hace quitarse la vida por culpa.
    if (atk.cause === "shot" && victim?.faction === "town" && !dead.has(atk.attackerId)) {
      attacks.push({ attackerId: atk.attackerId, victimId: atk.attackerId, power: 2, cause: "guilt" });
    }
    // Jailor: ejecutar a un Town le quita las siguientes ejecuciones.
    if (atk.cause === "execute" && victim?.faction === "town" && !dead.has(atk.attackerId)) {
      out.push({ type: "effect.applied", payload: { actorId: atk.attackerId, targetId: atk.attackerId, flag: "noExecute" } });
    }

    if (atk.unstoppable) {
      kill(atk.victimId, atk.cause);
      continue;
    }
    const prots = protections.get(atk.victimId) ?? [];
    const bodyguard = prots.find((p) => p.source === "bodyguard" && !dead.has(p.protectorId));
    if (bodyguard) {
      out.push({ type: "attack.prevented", payload: { victimId: atk.victimId, protectorId: bodyguard.protectorId } });
      kill(atk.attackerId, "bodyguard");
      kill(bodyguard.protectorId, "bodyguard");
      continue;
    }
    const medical = prots.filter((p) => p.source !== "bodyguard");
    const strongest = medical.reduce<Protection | undefined>((best, p) => (!best || p.power > best.power ? p : best), undefined);
    // Wiki (Godfather): Basic Defense permanente; un ataque Basic no le mata.
    const baseDefense = victim?.roleKey === "godfather" ? 1 : 0;
    const defense = Math.max(strongest?.power ?? 0, alerted.has(atk.victimId) ? 1 : 0, baseDefense);
    if (atk.power > defense) {
      kill(atk.victimId, atk.cause);
    } else if (strongest) {
      out.push({ type: "attack.prevented", payload: { victimId: atk.victimId, protectorId: strongest.protectorId } });
    }
  }

  out.push(...promotionEvents(s, dead));
  out.push({ type: "night.resolved", payload: { dayNumber: s.dayNumber } });
  return out;
}
