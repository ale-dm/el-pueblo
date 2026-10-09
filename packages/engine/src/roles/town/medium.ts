import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Medium · Town · ficha: docs/roles/Medium.md
export const handler: RoleHandler = {
  key: "medium",
  name: "Medium",
  faction: "town",
  priority: 1,
  // Muerto, habla una vez en toda la partida con un vivo durante la noche (wiki: Medium).
  // La conversación la gestiona el canal "seance" del chat; la habilidad no tiene efecto en la resolución.
  nightAbilities: [{ key: "seance", target: "player", usesLimit: 1, deadOnly: true }],
  dayAbilities: [],
  resolveNight: (): Effect[] => [],
};
