import type { MatchView } from "../types.js";

/** Una habilidad que el jugador puede usar ahora: un botón en el dock. */
export interface DockAbility {
  key: string;
  target: "none" | "player" | "two";
  /** Opciones que la habilidad pide sin valor por defecto (mensaje del Hypnotist, rol del Forger). */
  choices: readonly string[] | null;
  night: boolean;
}

/**
 * Qué pasa al pulsar una habilidad con lo elegido en la lista:
 * - `command`: se envía.
 * - `needs`: faltan objetivos en la lista.
 * - `choose`: hay que elegir una opción (mensaje, rol) antes de enviar.
 */
export type Plan =
  | { kind: "command"; command: Record<string, unknown> }
  | { kind: "needs"; hint: string }
  | { kind: "choose"; options: readonly string[] }
  | { kind: "none" };

const DAY_PHASES = ["day_1", "discussion"];

/** Habilidades usables ahora. La vista ya filtra las de vivo o de muerto. Las que tienen valor por defecto no piden elección. */
export function dockAbilities(view: MatchView): DockAbility[] {
  const me = view.me;
  if (view.phase === "night") {
    return me.nightAbilities
      .filter((a) => a.usesLeft !== 0)
      .map((a) => ({ key: a.key, target: a.target, choices: a.choices !== null && a.defaultChoice === null ? a.choices : null, night: true }));
  }
  if (DAY_PHASES.includes(view.phase)) {
    return me.dayAbilities.filter((a) => a.usesLeft !== 0).map((a) => ({ key: a.key, target: a.target, choices: null, night: false }));
  }
  return [];
}

/** Plan de una habilidad con los objetivos de la lista y la opción elegida (si la pide). */
export function abilityPlan(view: MatchView, ability: DockAbility, targets: readonly string[], choice: string | null): Plan {
  const [first, second] = targets;
  if (ability.target === "player" && !first) return { kind: "needs", hint: "Elige a alguien en la lista" };
  if (ability.target === "two" && !(first && second)) return { kind: "needs", hint: "Elige dos en la lista" };
  if (ability.choices && choice === null) return { kind: "choose", options: ability.choices };
  const base = { actorId: view.me.id, ability: ability.key, targetId: ability.target === "none" ? null : first! };
  const extra = choice === null ? {} : { choice };
  if (!ability.night) return { kind: "command", command: { type: "day.action", ...base, ...extra } };
  return {
    kind: "command",
    command: { type: "night.action", ...base, secondTargetId: ability.target === "two" ? second! : null, ...extra },
  };
}

/** Votar: el voto va al jugador elegido en la lista. */
export function votePlan(view: MatchView, targets: readonly string[]): Plan {
  const first = targets[0];
  if (!first) return { kind: "needs", hint: "Elige en la lista" };
  return { kind: "command", command: { type: "vote", voterId: view.me.id, targetId: first } };
}
