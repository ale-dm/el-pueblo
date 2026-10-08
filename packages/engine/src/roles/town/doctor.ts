import type { RoleHandler } from "../types.js";

// Doctor · town · fuente: docs/roles/Doctor.md
// BORRADOR (M1): habilidades e interacciones pendientes. Checklist en docs/CHECKLIST.md §2.
export const handler: RoleHandler = {
  key: "doctor",
  name: "Doctor",
  faction: "town",
  nightAbilities: [],
  interactions: [],
};
