import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Medium · Town · prioridad 1 · ficha: docs/roles/Medium.md
export const handler: RoleHandler = {
  key: "medium",
  name: "Medium",
  faction: "town",
  priority: 1,
  nightAbilities: [], // pendiente: su habilidad aún no tiene efecto (ver gaps); no se ofrece para no engañar al jugador
  dayAbilities: [],
  gaps: "Comunicación con los muertos de noche: no implementado en el MVP.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
