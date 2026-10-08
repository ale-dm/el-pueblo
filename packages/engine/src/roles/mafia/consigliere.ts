import type { RoleHandler } from "../types.js";

// Consigliere · mafia · fuente: docs/roles/Consigliere.md
// BORRADOR (M1): habilidades e interacciones pendientes. Checklist en docs/CHECKLIST.md §2.
export const handler: RoleHandler = {
  key: "consigliere",
  name: "Consigliere",
  faction: "mafia",
  nightAbilities: [],
  interactions: [],
};
