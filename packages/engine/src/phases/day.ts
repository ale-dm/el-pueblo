import type { Catalog } from "../types/catalog.js";
import type { EventInput } from "../types/events.js";
import type { GameState } from "../types/state.js";
import { err, ok, type Result } from "../core/result.js";
import { handlerOf, isAlive, playerOf, votingPlayers } from "./context.js";

export function castVote(s: GameState, voterId: string, targetId: string | null): Result<EventInput[]> {
  if (s.phase !== "voting") return err("wrong_phase", "Solo se vota en la fase de votación");
  if (!votingPlayers(s).some((p) => p.id === voterId)) return err("invalid_command", "No puedes votar");
  if (targetId !== null && !isAlive(playerOf(s, targetId))) return err("invalid_command", "Objetivo no válido");
  return ok([{ type: "vote.cast", payload: { voterId, targetId } }]);
}

export function judgementVote(
  s: GameState,
  voterId: string,
  verdict: "guilty" | "innocent",
): Result<EventInput[]> {
  if (s.phase !== "judgement") return err("wrong_phase", "Solo se vota en el juicio");
  if (voterId === s.defendantId) return err("invalid_command", "El acusado no vota su propio juicio");
  if (!votingPlayers(s).some((p) => p.id === voterId)) return err("invalid_command", "No puedes votar");
  return ok([{ type: "judgement.cast", payload: { voterId, verdict } }]);
}

/**
 * Habilidades de día: Jailor (encarcelar, una vez al día) y Mayor (revelarse, una vez por partida).
 * Solo se puede usar la habilidad que el rol tenga en su ficha.
 */
export function dayAction(
  s: GameState,
  catalog: Catalog,
  actorId: string,
  ability: string,
  targetId: string | null,
): Result<EventInput[]> {
  if (!["day_1", "discussion", "voting"].includes(s.phase)) {
    return err("wrong_phase", "Esta acción solo se usa de día");
  }
  const actor = playerOf(s, actorId);
  const handler = actor && handlerOf(actor);
  const def = handler?.dayAbilities.find((a) => a.key === ability);
  // Los muertos solo usan habilidades de día de muerto (Medium, wiki: Medium.md:203).
  if (!def?.deadOnly && !isAlive(actor)) return err("invalid_command", "Solo los vivos pueden actuar");
  if (!actor || !handler || !def) return err("invalid_command", "Tu rol no tiene esa habilidad de día");
  if (def.deadOnly && isAlive(actor)) return err("invalid_command", "Solo los muertos pueden usar esa habilidad");
  if (def.usesLimit !== null && (actor.usesLeft[ability] ?? 0) <= 0) {
    return err("invalid_command", "Ya no te quedan usos de esa habilidad");
  }
  if (def.oncePerDay && s.dayActionDay[actorId] === s.dayNumber) {
    return err("invalid_command", "Ya has usado esta habilidad hoy");
  }

  if (def.target === "none") {
    if (targetId !== null) return err("invalid_command", "Esta habilidad no lleva objetivo");
  } else {
    const target = playerOf(s, targetId ?? "");
    if (!isAlive(target) || target.id === actorId) return err("invalid_command", "Objetivo no válido");
  }

  const events: EventInput[] = [{ type: "ability.used", payload: { playerId: actorId, ability } }];
  if (ability === "jail" && targetId) {
    if (playerOf(s, targetId)?.flags.jailed) return err("invalid_command", "Ese jugador ya está encarcelado");
    events.push({ type: "player.jailed", payload: { jailorId: actorId, playerId: targetId } });
  } else if (ability === "reveal") {
    events.push({ type: "mayor.revealed", payload: { playerId: actorId } });
  } else if (ability === "seance") {
    // Wiki (Medium.md:203): la sesión es para la noche siguiente. Se guarda como acción de esa noche; la
    // noche la conserva y el registro la cierra al resolverla.
    events.push({
      type: "night.action.submitted",
      payload: { actorId, ability, targetId: targetId!, secondTargetId: null, choice: null, mafiaTeam: false, roleKey: actor.roleKey },
    });
  } else {
    return err("not_implemented", `Habilidad de día "${ability}" pendiente`);
  }
  void catalog;
  return ok(events);
}
