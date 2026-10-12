import { describe, expect, it } from "vitest";
import { trackFor } from "./music.js";

describe("trackFor: qué pista suena en cada pantalla", () => {
  it("la sala suena mientras se espera; con elección de nombres, la de nombres", () => {
    expect(trackFor({ status: "lobby" })).toBe("cauldron");
    expect(trackFor({ status: "lobby", naming: true })).toBe("naming");
  });

  it("cada fase tiene su pista; juicio, defensa y últimas palabras comparten la de defensa", () => {
    expect(trackFor({ status: "playing", phase: "day_1" })).toBe("day");
    expect(trackFor({ status: "playing", phase: "discussion" })).toBe("discussion");
    expect(trackFor({ status: "playing", phase: "voting" })).toBe("voting");
    expect(trackFor({ status: "playing", phase: "defense" })).toBe("defense");
    expect(trackFor({ status: "playing", phase: "judgement" })).toBe("defense");
    expect(trackFor({ status: "playing", phase: "last_words" })).toBe("defense");
    expect(trackFor({ status: "playing", phase: "night" })).toBe("night");
  });

  it("partida terminada o abandonada: silencio", () => {
    expect(trackFor({ status: "finished", phase: "night" })).toBeNull();
    expect(trackFor({ status: "abandoned" })).toBeNull();
  });
});
