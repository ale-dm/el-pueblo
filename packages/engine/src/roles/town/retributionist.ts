import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";
import { ROLE_HANDLERS } from "../registry.js";
import { handlerOf } from "../../phases/context.js";

// Retributionist · Town · prioridad 1 · ficha: docs/roles/Retributionist.md
export const handler: RoleHandler = {
  key: "retributionist",
  name: "Retributionist",
  faction: "town",
  priority: 1,
  roleblockImmune: true,
  // Resucita a un Town muerto (zombi) y usa su habilidad sobre un segundo objetivo.
  nightAbilities: [{ key: "raise", target: "two", usesLimit: null }],
  dayAbilities: [],
  gaps: "Solo se usa la primera habilidad de objetivo único del zombi; el zombi usa su efecto una vez.",
  resolveNight: (ctx): Effect[] => {
    const { ability, actor, targetId, secondTargetId, state } = ctx;
    if (ability !== "raise" || !targetId || !secondTargetId) return [];
    const zombie = state.players.find((p) => p.id === targetId);
    const zombieHandler = zombie ? handlerOf(zombie) : undefined;
    const zombieAbility = zombieHandler?.nightAbilities.find((a) => a.target === "player" && a.usesLimit === null);
    if (!zombie || !zombieHandler || !zombieAbility) return [];
    // El zombi actúa con su propio efecto, dirigido al segundo objetivo; después se marca como usado.
    const effects = zombieHandler.resolveNight({ ...ctx, actor: zombie, ability: zombieAbility.key, targetId: secondTargetId, secondTargetId: null, choice: null });
    return [...effects, { kind: "mark", actorId: actor.id, targetId: zombie.id, flag: "zombied" }];
  },
};
