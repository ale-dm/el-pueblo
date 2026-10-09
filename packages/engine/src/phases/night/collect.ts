import type { EventInput } from "../../types/events.js";
import type { GameState } from "../../types/state.js";
import { err, ok, type Result } from "../../core/result.js";
import { handlerOf, isAlive, playerOf } from "../context.js";
import { ROLE_HANDLERS } from "../../roles/registry.js";
import { canBeRoleblocked } from "../../rules/roleblock.js";

/** Valida una acción nocturna y, si es correcta, la registra. Un jugador puede cambiarla hasta el final de la noche. */
export function nightAction(
  s: GameState,
  actorId: string,
  ability: string,
  targetId: string | null,
  secondTargetId: string | null,
  choice: string | null = null,
): Result<EventInput[]> {
  if (s.phase !== "night") return err("wrong_phase", "Las acciones nocturnas solo se hacen de noche");
  const actor = playerOf(s, actorId);
  const handler = actor ? handlerOf(actor) : undefined;
  const def = handler?.nightAbilities.find((a) => a.key === ability);
  if (!actor || !handler || !def) return err("invalid_command", "Tu rol no tiene esa habilidad");
  if (def.deadOnly ? isAlive(actor) : !isAlive(actor)) {
    return err("invalid_command", def.deadOnly ? "Solo los muertos usan esa habilidad" : "Solo los vivos actúan de noche");
  }
  if (def.usesLimit !== null && (actor.usesLeft[ability] ?? 0) <= 0) {
    return err("invalid_command", "Ya no te quedan usos de esa habilidad");
  }

  const check = (id: string | null, label: string): string | null => {
    if (id === null) return `Falta ${label}`;
    const target = playerOf(s, id);
    if (!isAlive(target)) return `${label}: el objetivo no está vivo`;
    if (id === actorId && !def.selfAllowed && def.target !== "two") return `${label}: no puedes elegirte`;
    return null;
  };

  // Resurrección del Retributionist: el primer objetivo es un Town muerto con su rol intacto.
  if (ability === "raise") {
    if (targetId === null) return err("invalid_command", "Falta el Town muerto a resucitar");
    const dead = playerOf(s, targetId);
    if (!dead || dead.status !== "dead" || dead.faction !== "town" || !dead.roleKey) {
      return err("invalid_command", "Solo puedes resucitar a un Town muerto cuyo rol se conozca");
    }
    // Wiki (Retributionist.md:216): no se resucita a quien limpió el Janitor.
    if (dead.flags.cleaned) return err("invalid_command", "Ese Town fue limpiado: no queda rol que resucitar");
    if (dead.flags.zombied) return err("invalid_command", "Ese zombi ya se ha usado");
    const second = check(secondTargetId, "Objetivo");
    if (second) return err("invalid_command", second);
  } else if (def.target === "none") {
    if (targetId !== null || secondTargetId !== null) return err("invalid_command", "Esta habilidad no lleva objetivo");
  } else if (def.target === "player") {
    const problem = check(targetId, "Objetivo");
    if (problem) return err("invalid_command", problem);
    // Wiki (Tavern_Keeper.md:181): no se bloquean roles con habilidad de día; el bloqueo no tiene a qué aplicarse.
    if (def.roleblock && targetId !== null && !canBeRoleblocked(handlerOf(playerOf(s, targetId)!))) {
      return err("invalid_command", "Objetivo: no se puede bloquear a un rol con habilidad de día");
    }
  } else {
    const first = check(targetId, "Primer objetivo");
    if (first) return err("invalid_command", first);
    const second = check(secondTargetId, "Segundo objetivo");
    if (second) return err("invalid_command", second);
    if (targetId === secondTargetId) return err("invalid_command", "Los dos objetivos deben ser distintos");
  }

  // Elección de la habilidad: mensaje del Hypnotist, rol del Forger.
  if (def.choices !== undefined) {
    if (!choice) return err("invalid_command", "Elige una opción");
    if (def.choices === "roles") {
      if (!ROLE_HANDLERS.has(choice)) return err("invalid_command", "Rol desconocido");
    } else if (!def.choices.includes(choice)) {
      return err("invalid_command", "Opción no válida");
    }
  }

  // Motivos del Jailor (wiki: Jailor.md:322): solo razones de la lista, sin repetir. Sin elegir, queda "No reason specified".
  if (def.multiChoices !== undefined && choice) {
    const picked = choice.split(",");
    if (picked.some((k) => !def.multiChoices!.includes(k)) || new Set(picked).size !== picked.length) {
      return err("invalid_command", "Motivo no válido");
    }
  }

  // Disfraz del Disguiser: un Mafioso vivo y no encarcelado, disfrazado de alguien que no es de la Mafia.
  if (ability === "disguise") {
    if (playerOf(s, targetId ?? "")?.faction !== "mafia") return err("invalid_command", "Solo puedes disfrazar a alguien de la Mafia");
    if (playerOf(s, targetId ?? "")?.flags.jailed) return err("invalid_command", "No puedes disfrazar a un encarcelado");
    if (playerOf(s, secondTargetId ?? "")?.faction === "mafia") return err("invalid_command", "El disfraz debe ser de alguien que no es de la Mafia");
  }

  // Trampero (wiki: Trapper.md:159, 213, 217, 227, 229): colocar exige una trampa construida y lista; una a la vez;
  // elegirse a sí mismo desmonta la puesta.
  if (ability === "trap") {
    const trap = s.traps[actorId];
    if (targetId === actorId) {
      if (!trap || trap.targetId === null) return err("invalid_command", "No tienes ninguna trampa puesta que desmontar");
    } else if (!trap) {
      return err("invalid_command", "Tu trampa aún se está construyendo: estará lista la noche siguiente");
    } else if (trap.targetId !== null) {
      return err("invalid_command", "Ya tienes una trampa puesta: desmóntala antes de poner otra");
    }
  }
  // Ambusher: no tiende emboscadas en la casa de un miembro de la Mafia (wiki: Ambusher, "Other Mafia roles cannot be attacked").
  if (ability === "ambush" && playerOf(s, targetId ?? "")?.faction === "mafia") {
    return err("invalid_command", "No puedes emboscar a un miembro de la Mafia");
  }
  // Jailor: solo puede ejecutar a un jugador encarcelado, y no en la primera noche (wiki: Jailor).
  if (ability === "execute" && s.dayNumber === 1) {
    return err("invalid_command", "No puedes ejecutar en la primera noche");
  }
  // Vigilante: no dispara la primera noche (wiki: Vigilante, "You cannot Shoot on the first Night").
  if (ability === "shoot" && s.dayNumber === 1) {
    return err("invalid_command", "No puedes disparar en la primera noche");
  }
  // Tras ejecutar a un Town, el Jailor pierde las ejecuciones que le quedan (wiki: Jailor).
  if (ability === "execute" && actor.flags.noExecute) {
    return err("invalid_command", "Ya no puedes ejecutar: mataste a un miembro del pueblo");
  }
  if (ability === "execute" && !playerOf(s, targetId ?? "")?.flags.jailed) {
    return err("invalid_command", "Solo puedes ejecutar a un jugador encarcelado");
  }

  const events: EventInput[] = [
    {
      type: "night.action.submitted",
      payload: { actorId, ability, targetId, secondTargetId, choice: choice ?? null, mafiaTeam: actor.faction === "mafia", roleKey: actor.roleKey },
    },
  ];
  // Wiki (Jailor.md:282): el prisionero recibe el aviso cuando el Jailor decide ejecutarle (una sola vez).
  const previous = s.nightActions[actorId];
  if (ability === "execute" && !(previous?.ability === "execute" && previous.targetId === targetId)) {
    events.push({ type: "night.notice", payload: { playerId: targetId!, notice: "jailor_execute" } });
  }
  return ok(events);
}

/** Cancela la acción de esta noche. Hasta el final de la noche, el jugador puede volver a elegir. */
export function cancelNightAction(s: GameState, actorId: string): Result<EventInput[]> {
  if (s.phase !== "night") return err("wrong_phase", "Las acciones nocturnas solo se hacen de noche");
  const actor = playerOf(s, actorId);
  if (!isAlive(actor)) return err("invalid_command", "Solo los vivos actúan de noche");
  const own = s.nightActions[actorId];
  if (!own) return err("invalid_command", "No tienes ninguna acción que cancelar");
  const events: EventInput[] = [{ type: "night.action.cancelled", payload: { actorId, mafiaTeam: actor.faction === "mafia" } }];
  // Wiki (Jailor.md:284): si el Jailor cancela la ejecución, el prisionero lo sabe.
  if (own.ability === "execute" && own.targetId) events.push({ type: "night.notice", payload: { playerId: own.targetId, notice: "jailor_changed_mind" } });
  return ok(events);
}

/** Escribe o cambia la última voluntad. Solo vivos; texto vacío la borra. */
export function writeWill(s: GameState, playerId: string, text: string): Result<EventInput[]> {
  const player = playerOf(s, playerId);
  if (!player) return err("invalid_command", "Jugador desconocido");
  if (!isAlive(player)) return err("invalid_command", "Los muertos ya no pueden escribir su testamento");
  const trimmed = text.trim();
  if (trimmed.length > MAX_WILL_LENGTH) return err("invalid_command", `El testamento tiene como máximo ${MAX_WILL_LENGTH} caracteres`);
  return ok([{ type: "will.written", payload: { playerId, text: trimmed } }]);
}

export const MAX_WILL_LENGTH = 300;
