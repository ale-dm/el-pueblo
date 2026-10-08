import { describe, expect, it } from "vitest";
import { checkVictory } from "../src/rules/victory.js";
import type { PlayerState } from "../src/types/state.js";

const p = (id: string, faction: "town" | "mafia", status: PlayerState["status"] = "alive"): PlayerState => ({
  id, seat: 1, nick: id, roleKey: null, faction, status, connected: true, deathReason: null,
});

describe("checkVictory (MVP: Town y Mafia)", () => {
  it("gana el pueblo cuando no queda mafia viva", () => {
    expect(checkVictory([p("t1", "town"), p("t2", "town"), p("m1", "mafia", "dead")])).toBe("town");
  });

  it("gana la mafia cuando no queda pueblo vivo", () => {
    expect(checkVictory([p("m1", "mafia"), p("m2", "mafia"), p("t1", "town", "dead")])).toBe("mafia");
  });

  it("la partida sigue mientras ambos bandos tengan vivos", () => {
    expect(checkVictory([p("t1", "town"), p("m1", "mafia")])).toBeNull();
  });

  it("un jugador desconectado no cuenta como vivo", () => {
    expect(checkVictory([p("t1", "town"), { ...p("m1", "mafia"), status: "disconnected" }])).toBe("town");
  });
});
