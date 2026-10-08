import type { EventInput } from "../../types/events.js";
import type { GameState } from "../../types/state.js";
import { err, ok, type Result } from "../../core/result.js";
import { handlerOf, isAlive, playerOf } from "../context.js";

/** Valida una acción nocturna y, si es correcta, la registra. Un jugador puede cambiarla hasta el final de la noche. */
export function nightAction(
  s: GameState,
  actorId: string,
  ability: string,
  targetId: string | null,
  secondTargetId: string | null,
): Result<EventInput[]> {
  if (s.phase !== "night") return err("wrong_phase", "Las acciones nocturnas solo se hacen de noche");
  const actor = playerOf(s, actorId);
  if (!isAlive(actor)) return err("invalid_command", "Solo los vivos actúan de noche");
  const handler = handlerOf(actor);
  const def = handler?.nightAbilities.find((a) => a.key === ability);
  if (!handler || !def) return err("invalid_command", "Tu rol no tiene esa habilidad");
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

  if (def.target === "none") {
    if (targetId !== null || secondTargetId !== null) return err("invalid_command", "Esta habilidad no lleva objetivo");
  } else if (def.target === "player") {
    const problem = check(targetId, "Objetivo");
    if (problem) return err("invalid_command", problem);
  } else {
    const first = check(targetId, "Primer objetivo");
    if (first) return err("invalid_command", first);
    const second = check(secondTargetId, "Segundo objetivo");
    if (second) return err("invalid_command", second);
    if (targetId === secondTargetId) return err("invalid_command", "Los dos objetivos deben ser distintos");
  }

  // Jailor: solo puede ejecutar a un jugador encarcelado.
  if (ability === "execute" && !playerOf(s, targetId ?? "")?.flags.jailed) {
    return err("invalid_command", "Solo puedes ejecutar a un jugador encarcelado");
  }

  return ok([
    {
      type: "night.action.submitted",
      payload: { actorId, ability, targetId, secondTargetId },
    },
  ]);
}
