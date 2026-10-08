import type { Catalog } from "../../types/catalog.js";
import type { EventInput } from "../../types/events.js";
import type { GameState, PlayerState } from "../../types/state.js";
import type { Rng } from "../../core/rng.js";
import type { Effect } from "../../roles/effects.js";
import type { RoleHandler } from "../../roles/types.js";
import { handlerOf, isAlive, playerOf } from "../context.js";

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
  source: "doctor" | "bodyguard" | "crusader";
}

interface Attack {
  attackerId: string;
  victimId: string;
  power: 1 | 2;
  cause: string;
}

interface Act {
  actor: PlayerState;
  handler: RoleHandler;
  ability: string;
  targetId: string | null;
  secondTargetId: string | null;
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
      return { ...e, targetId: remap(e.targetId) };
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

  // 0. Acciones válidas de jugadores vivos, por prioridad y asiento.
  const acts: Act[] = [];
  for (const [actorId, action] of Object.entries(s.nightActions)) {
    const actor = playerOf(s, actorId);
    const handler = actor && handlerOf(actor);
    if (!actor || !handler || !isAlive(actor)) continue;
    acts.push({
      actor,
      handler,
      ability: action.ability,
      targetId: action.targetId,
      secondTargetId: action.secondTargetId,
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

  // 3. Visitas: habilidades que apuntan a un jugador.
  const visits: Visit[] = [];
  for (const act of active) {
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    if (def?.target === "player" && act.targetId !== null) {
      visits.push({ visitorId: act.actor.id, houseId: remap(act.targetId) });
    }
  }
  const visitsTo = (houseId: string, except?: string) =>
    visits.filter((v) => v.houseId === houseId && v.visitorId !== except);

  // 4. Protecciones y alerta.
  const protections = new Map<string, Protection[]>();
  const alerted = new Set<string>();
  const attacks: Attack[] = [];
  const marks: Array<{ actorId: string; targetId: string; flag: "framed" | "cleaned" | "blackmailed" }> = [];
  const investigations: Array<{ actorId: string; targetId: string | null; check: string }> = [];
  const traps: Array<{ trapperId: string; targetId: string }> = [];
  const usesSpent: Array<{ playerId: string; ability: string }> = [];

  for (const act of active) {
    const def = act.handler.nightAbilities.find((a) => a.key === act.ability);
    if (def?.usesLimit !== null && def?.usesLimit !== undefined) {
      usesSpent.push({ playerId: act.actor.id, ability: act.ability });
    }
    for (const raw of act.effects) {
      const e = remapEffect(raw, remap);
      switch (e.kind) {
        case "protect": {
          const list = protections.get(e.targetId) ?? [];
          list.push({ protectorId: e.actorId, power: e.power, source: e.source });
          protections.set(e.targetId, list);
          break;
        }
        case "attack":
          attacks.push({ attackerId: e.actorId, victimId: e.targetId, power: e.power, cause: e.cause });
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
        default:
          break;
      }
    }
  }

  // 5. Mafia: si el Godfather actúa, su objetivo; si no, el del Mafioso.
  const mafiaEffects = active.flatMap((a) => a.effects.map((e) => remapEffect(e, remap)));
  const order = mafiaEffects.find((e) => e.kind === "mafiaKill" && e.role === "godfather") ??
    mafiaEffects.find((e) => e.kind === "mafiaKill" && e.role === "mafioso");
  if (order?.kind === "mafiaKill") {
    attacks.push({ attackerId: order.actorId, victimId: order.targetId, power: 1, cause: "mafia" });
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
    const p = playerOf(s, target);
    let result = "";
    switch (inv.check) {
      case "suspicious": {
        const sus = framed.has(target) || p?.flags.framed === true || (p?.faction === "mafia" && p.roleKey !== "godfather");
        result = sus ? "suspicious" : "innocent";
        break;
      }
      case "alignment": {
        const isFramed = framed.has(target) || p?.flags.framed === true;
        const key = p?.roleKey ? catalog.roles.get(p.roleKey)?.alignmentKey : null;
        result = isFramed ? "mafia_deception" : key ?? "unknown";
        break;
      }
      case "role":
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
      payload: { investigatorId: inv.actorId, targetId: target, result },
    });
  }

  // 8. Ataques contra protecciones. Un ataque que mata a alguien ya muerto no hace nada.
  const dead = new Set(s.players.filter((p) => p.status !== "alive").map((p) => p.id));
  const kill = (playerId: string, cause: string) => {
    if (dead.has(playerId)) return;
    dead.add(playerId);
    const roleKey = cleaned.has(playerId) ? null : playerOf(s, playerId)?.roleKey ?? null;
    out.push({ type: "player.killed", payload: { playerId, cause, roleKey } });
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
    const defense = Math.max(strongest?.power ?? 0, alerted.has(atk.victimId) ? 1 : 0);
    if (atk.power > defense) {
      kill(atk.victimId, atk.cause);
    } else if (strongest) {
      out.push({ type: "attack.prevented", payload: { victimId: atk.victimId, protectorId: strongest.protectorId } });
    }
  }

  out.push({ type: "night.resolved", payload: { dayNumber: s.dayNumber } });
  return out;
}
