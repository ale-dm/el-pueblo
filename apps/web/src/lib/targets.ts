import type { MatchView, PublicPlayer } from "../types.js";
import { canBeResurrected } from "./resurrect.js";

/** Cuántos objetivos pide la fase actual: votación y noche con dos objetivos. `raise`: el primero es un muerto. */
export function targetsNeeded(view: MatchView): { selectable: boolean; max: number; raise: boolean } {
  const me = view.me;
  if (view.phase === "voting" && me.status === "alive") return { selectable: true, max: 1, raise: false };
  if (view.phase === "night") {
    const usable = me.nightAbilities.filter((a) => a.target !== "none" && a.usesLeft !== 0);
    return {
      selectable: usable.length > 0,
      max: usable.some((a) => a.target === "two") ? 2 : 1,
      raise: usable.some((a) => a.key === "raise"),
    };
  }
  // Vivos y Médiums muertos eligen objetivo de día (las habilidades de día ya salen filtradas por vida).
  if (["day_1", "discussion"].includes(view.phase) && me.dayAbilities.some((a) => a.target === "player")) {
    return { selectable: true, max: 1, raise: false };
  }
  return { selectable: false, max: 0, raise: false };
}

/**
 * ¿Se puede elegir a este jugador ahora? Con Retributionist, el primer objetivo es un Town muerto (zombi) y el segundo un vivo.
 * Forger: su falsificación es para alguien que no es de la Mafia (wiki: Forger.md:204); si solo tiene esa habilidad, sus
 * compañeros de Mafia no se pueden elegir.
 */
export function isPickableTarget(view: MatchView, targets: readonly string[], p: PublicPlayer): boolean {
  const need = targetsNeeded(view);
  if (!need.selectable || p.id === view.me.id) return false;
  const onlyForges = view.phase === "night" && view.me.nightAbilities.length > 0 && view.me.nightAbilities.every((a) => a.key === "forge");
  if (onlyForges && p.ally) return false;
  const voting = view.phase === "voting" && view.me.status === "alive";
  if (voting) return p.status === "alive";
  if (!need.raise) return p.status === "alive";
  if (p.status === "alive") return targets.length > 0;
  // Wiki (Retributionist.md:236): no se ofrecen los roles que no se pueden resucitar (lib/resurrect.ts).
  return targets.length === 0 && canBeResurrected(p);
}
