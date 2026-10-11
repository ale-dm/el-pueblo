import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

/**
 * Regresión: si todos los vivos están desconectados durante la votación, nadie puede votar. Antes el motor lanzaba
 * un error (votesRequired con 0 vivos) y la partida se quedaba sin avanzar. Ahora no hay juicio y empieza la noche.
 */
describe("votación sin votantes conectados", () => {
  it("no lanza error, no hay juicio y empieza la noche", () => {
    const base = game(["godfather", "sheriff", "investigator", "doctor"], { dayNumber: 2 });
    const s = { ...base, phase: "voting" as const, players: base.players.map((p) => ({ ...p, connected: false })) };
    const { state, events } = step(s, timer());
    expect(ofType(events, "trial.started")).toHaveLength(0);
    expect(state.phase).toBe("night");
  });
});
