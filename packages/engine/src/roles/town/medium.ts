import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Medium · Town · ficha: docs/roles/Medium.md
export const handler: RoleHandler = {
  key: "medium",
  name: "Medium",
  faction: "town",
  priority: 1,
  // Muerto, elige un vivo de día para hablar con él solo esa noche (wiki: Medium.md:203, "during the Day ...
  // to talk to them for that Night only"), una vez en toda la partida (Medium.md:205). La conversación la
  // gestiona el canal "seance" del chat; la habilidad no tiene efecto en la resolución.
  nightAbilities: [],
  dayAbilities: [{ key: "seance", target: "player", oncePerDay: false, usesLimit: 1, deadOnly: true }],
  resolveNight: (): Effect[] => [],
};
