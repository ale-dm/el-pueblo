import { describe, expect, it } from "vitest";
import type { GameEventEnvelope } from "@el-pueblo/engine";
import { phaseDelayFor, votingSpentMs } from "../../src/application/timing.js";
import { JsonCatalogSource } from "../../src/adapters/outbound/catalog-json/loadCatalog.js";
import { CATALOG_DIR } from "../helpers/testApp.js";

const T0 = new Date("2026-10-08T12:00:00Z").getTime();
const at = (sec: number) => new Date(T0 + sec * 1000);
const started = (phase: string, day: number, sec: number) => ({
  at: at(sec),
  event: { seq: 1, type: "phase.started", payload: { phase, dayNumber: day }, visibility: "public", audiencePlayerId: null } as unknown as GameEventEnvelope,
});

describe("tiempo de la votación tras un juicio", () => {
  it("una votación sin juicio gasta su tiempo completo", () => {
    const timed = [started("discussion", 2, 0), started("voting", 2, 45), started("night", 2, 75)];
    expect(votingSpentMs(timed, 2)).toBe(30_000);
  });

  it("tras un juicio sin condena, la votación reanuda con lo que quedaba", async () => {
    // Votación de 0 a 10 s, juicio de 10 a 30 s (defensa y juicio), y vuelve a votación a los 30 s.
    const timed = [
      started("discussion", 2, 0),
      started("voting", 2, 0),
      started("defense", 2, 10),
      started("judgement", 2, 30),
    ];
    // Al volver a votación, quedaban 20 s de los 30 s.
    const catalog = await new JsonCatalogSource(CATALOG_DIR).load();
    expect(phaseDelayFor(catalog, "standard", "voting", 2, timed)).toBe(20_000);
  });

  it("el tiempo de un día no cuenta en el siguiente", async () => {
    const timed = [started("voting", 1, 0), started("night", 1, 30), started("discussion", 2, 60)];
    const catalog = await new JsonCatalogSource(CATALOG_DIR).load();
    expect(phaseDelayFor(catalog, "standard", "voting", 2, timed)).toBe(30_000);
  });

  it("al recuperar tras un reinicio cuenta el tramo abierto hasta ahora", async () => {
    const timed = [started("voting", 2, 0)];
    const catalog = await new JsonCatalogSource(CATALOG_DIR).load();
    expect(phaseDelayFor(catalog, "standard", "voting", 2, timed, at(12))).toBe(18_000);
  });

  it("nunca programa menos de un segundo", async () => {
    const timed = [started("voting", 2, 0), started("defense", 2, 29.9)];
    const catalog = await new JsonCatalogSource(CATALOG_DIR).load();
    expect(phaseDelayFor(catalog, "standard", "voting", 2, timed)).toBe(1000);
  });

  it("las demás fases no cambian", async () => {
    const catalog = await new JsonCatalogSource(CATALOG_DIR).load();
    expect(phaseDelayFor(catalog, "standard", "defense", 2, [started("voting", 2, 0)])).toBe(20_000);
  });
});
