import type { RoleHandler } from "../types.js";

// Investigator · town · fuente: docs/roles/Investigator.md
// BORRADOR (M1): habilidades e interacciones pendientes. Checklist en docs/CHECKLIST.md §2.
export const handler: RoleHandler = {
  key: "investigator",
  name: "Investigator",
  faction: "town",
  nightAbilities: [],
  interactions: [],
};
