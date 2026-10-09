import { describe, expect, it } from "vitest";
import type { GameState } from "@el-pueblo/engine";
import { seanceTargetOf } from "../../src/application/use-cases/getView.js";

/** Estado mínimo: solo lo que mira seanceTargetOf (jugadores, bando, cárcel y acciones de noche). */
function state(over: { targetFaction?: string; targetId?: string; jailedBy?: Record<string, string>; ability?: string | null }): GameState {
  const players = [
    { id: "medium", faction: "town", status: "dead" },
    { id: "target", faction: over.targetFaction ?? "town", status: "alive" },
    { id: "jailor", faction: "town", status: "alive" },
  ];
  return {
    players,
    jailedBy: over.jailedBy ?? {},
    nightActions: over.ability === null ? {} : { medium: { ability: over.ability ?? "seance", targetId: over.targetId ?? "target" } },
  } as unknown as GameState;
}

describe("vista del Médium: su objetivo de sesión (wiki: Medium.md:217-219)", () => {
  it("sin sesión abierta no hay objetivo", () => {
    expect(seanceTargetOf(state({ ability: null }), "medium")).toBeNull();
  });

  it("objetivo de la Mafia: ve el canal de la Mafia", () => {
    expect(seanceTargetOf(state({ targetFaction: "mafia" }), "medium")).toEqual({ mafia: true, jail: false });
  });

  it("objetivo encarcelado: ve el canal de cárcel", () => {
    expect(seanceTargetOf(state({ jailedBy: { target: "jailor" } }), "medium")).toEqual({ mafia: false, jail: true });
  });

  it("objetivo Jailor: ve el canal de cárcel con su prisionero", () => {
    expect(seanceTargetOf(state({ jailedBy: { prisoner: "target" } }), "medium")).toEqual({ mafia: false, jail: true });
  });

  it("objetivo de otro bando y sin cárcel: no ve ningún canal extra", () => {
    expect(seanceTargetOf(state({}), "medium")).toEqual({ mafia: false, jail: false });
  });
});
