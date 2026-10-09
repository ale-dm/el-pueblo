import { describe, expect, it } from "vitest";
import { decide } from "../src/core/decide.js";
import { ctx, game } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

/** Jailor (p1) con un prisionero (p2) y un Mafioso (p3). */
function jailedGame(dayNumber: number): GameState {
  const s = game(["jailor", "mafioso", "investigator"], { phase: "night", dayNumber });
  s.players[1]!.flags = { jailed: true };
  return s;
}

describe("Jailor: ejecución", () => {
  it("no puede ejecutar en la primera noche, aunque el prisionero esté encarcelado", () => {
    const r = decide(jailedGame(1), { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }, ctx());
    expect(r.ok).toBe(false);
  });

  it("sí puede ejecutar desde la segunda noche", () => {
    const r = decide(jailedGame(2), { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }, ctx());
    expect(r.ok).toBe(true);
  });
});
