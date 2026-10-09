import { describe, expect, it } from "vitest";
import { loadCatalog } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { CATALOG_DIR } from "../helpers/testApp.js";

describe("loadCatalog (data/catalog)", () => {
  const catalog = loadCatalog(CATALOG_DIR);

  it("carga los 50 roles con su bando y prioridad", () => {
    expect(catalog.roles.size).toBe(50);
    expect(catalog.roles.get("godfather")).toMatchObject({ faction: "mafia", mvp: true });
    expect(catalog.roles.get("sheriff")?.faction).toBe("town");
  });

  it("carga los umbrales de votación de la wiki", () => {
    expect(catalog.votingThresholds.get(15)).toBe(8);
    expect(catalog.votingThresholds.get(3)).toBe(2);
  });

  it("carga las fases de los modos de la fase 1 (estándar y Rapid ToS1, 7 fases cada uno)", () => {
    expect(catalog.phaseTimings).toHaveLength(14);
    expect(catalog.phaseTimings.find((p) => p.mode === "standard" && p.phase === "night")?.seconds).toBe(37);
    expect(catalog.phaseTimings.find((p) => p.mode === "rapid_tos1" && p.phase === "night")?.seconds).toBe(10);
  });
});
