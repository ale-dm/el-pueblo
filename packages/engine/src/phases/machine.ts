import type { Phase } from "../types/phases.js";

// BORRADOR (M1): transiciones de fase. Ver docs/CHECKLIST.md §1.1 y docs/wiki/Phases.md.
// Pendiente de verificar: qué pasa tras Last Words de un juicio con condena (¿Noche o Día?).
export function nextPhase(_from: Phase): Phase {
  throw new Error("nextPhase: pendiente (M1)");
}
