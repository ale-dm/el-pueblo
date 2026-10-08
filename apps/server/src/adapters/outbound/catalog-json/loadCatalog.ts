import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Catalog, FactionKey, PhaseTiming, RoleDefinition } from "@el-pueblo/engine";
import type { CatalogSource } from "../../../application/ports.js";

interface RoleRow {
  key: string;
  name: string;
  faction_key: string;
  alignment_key: string | null;
  priority: number | null;
  is_unique: boolean;
  mvp: boolean;
  attack: string | null;
  defense: string | null;
  attribute_lines: string[];
}

interface PhaseRow {
  mode: string;
  phase: string;
  seconds: number | null;
  sort_order: number;
}

interface ThresholdRow {
  alive: number;
  votes_required: number;
}

const readRows = <T>(dir: string, name: string): T[] => JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as T[];

/** Lee data/catalog/*.json (las mismas filas que la tabla de la BD) y devuelve el Catalog del motor. */
export function loadCatalog(dir: string): Catalog {
  const roles = new Map<string, RoleDefinition>();
  for (const r of readRows<RoleRow>(dir, "roles")) {
    roles.set(r.key, {
      key: r.key,
      name: r.name,
      faction: r.faction_key as FactionKey,
      alignmentKey: r.alignment_key,
      priority: r.priority,
      isUnique: r.is_unique,
      mvp: r.mvp,
      attack: r.attack,
      defense: r.defense,
      attributeLines: r.attribute_lines,
    });
  }
  const phaseTimings: PhaseTiming[] = readRows<PhaseRow>(dir, "phase_timings").map((p) => ({
    mode: p.mode,
    phase: p.phase,
    seconds: p.seconds,
    sortOrder: p.sort_order,
  }));
  const votingThresholds = new Map<number, number>(
    readRows<ThresholdRow>(dir, "voting_thresholds").map((t) => [t.alive, t.votes_required]),
  );
  return { roles, phaseTimings, votingThresholds };
}

export class JsonCatalogSource implements CatalogSource {
  constructor(private readonly dir: string) {}

  async load() {
    return loadCatalog(this.dir);
  }
}
