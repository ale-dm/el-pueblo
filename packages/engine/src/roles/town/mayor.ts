import type { RoleHandler } from "../types.js";

// Mayor · town · fuente: docs/roles/Mayor.md
// BORRADOR (M1): habilidades e interacciones pendientes. Checklist en docs/CHECKLIST.md §2.
export const handler: RoleHandler = {
  key: "mayor",
  name: "Mayor",
  faction: "town",
  nightAbilities: [],
  interactions: [],
};
