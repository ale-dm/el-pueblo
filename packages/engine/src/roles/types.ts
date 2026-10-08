import type { FactionKey } from "../types/factions.js";

/**
 * Un rol = un fichero. Su habilidad nocturna, reacciones y sus interacciones con otros roles
 * (ver role_interactions en la BD). Cada interacción se cubre con un test.
 */
export interface NightAbility {
  key: string;
  /** Prioridad de resolución (roles.priority): menor se resuelve antes. */
  priority: number;
  /** "player" si necesita objetivo, "none" si no. */
  target: "player" | "none";
}

export interface RoleHandler {
  key: string;
  name: string;
  faction: FactionKey;
  nightAbilities: readonly NightAbility[];
  /** Interacciones conocidas, en forma de texto hasta que se conviertan en tests. */
  interactions: readonly string[];
}
