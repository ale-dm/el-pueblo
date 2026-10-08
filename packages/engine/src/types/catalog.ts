/**
 * Forma del catálogo cargado desde la BD (tablas de data/catalog). Ver docs/DATABASE.md.
 * El motor recibe esto como parámetro; nunca consulta la base de datos.
 */
import type { FactionKey } from "./factions.js";

export interface RoleDefinition {
  key: string;
  name: string;
  faction: FactionKey;
  alignmentKey: string | null;
  priority: number | null;
  isUnique: boolean;
  mvp: boolean;
  attack: string | null;
  defense: string | null;
  attributeLines: string[];
}

export interface PhaseTiming {
  mode: string;
  phase: string;
  seconds: number | null;
  sortOrder: number;
}

export interface Catalog {
  roles: Map<string, RoleDefinition>;
  phaseTimings: PhaseTiming[];
  votingThresholds: Map<number, number>;
}
