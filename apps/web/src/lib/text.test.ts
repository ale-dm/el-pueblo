import { describe, expect, it } from "vitest";
import { abilityLabel, eventLine } from "./text.js";
import type { GameEvent } from "../types.js";

const nick = (id: string) => ({ a: "Ana", b: "Bea" })[id as "a" | "b"] ?? "?";
const ev = (type: string, payload: Record<string, unknown>): GameEvent => ({
  seq: 1, type, payload, visibility: "public", audiencePlayerId: null,
});

describe("textos del registro", () => {
  it("una muerte nombra a la persona y la causa", () => {
    expect(eventLine(ev("player.killed", { playerId: "b", cause: "mafia", roleKey: null }), nick)).toBe("Bea ha sido asesinado por la Mafia");
  });

  it("un voto con objetivo y una abstención", () => {
    expect(eventLine(ev("vote.cast", { voterId: "a", targetId: "b" }), nick)).toBe("Ana vota a Bea");
    expect(eventLine(ev("vote.cast", { voterId: "a", targetId: null }), nick)).toBe("Ana se abstiene");
  });

  it("el veredicto se traduce a culpable o inocente", () => {
    expect(eventLine(ev("trial.verdict", { defendantId: "b", verdict: "guilty" }), nick)).toContain("culpable");
  });

  it("los eventos internos no aparecen en el registro", () => {
    expect(eventLine(ev("judgement.cast", { voterId: "a", verdict: "guilty" }), nick)).toBeNull();
  });

  it("las habilidades tienen nombre en español y, si no, se muestra la clave", () => {
    expect(abilityLabel("heal")).toBe("Curar");
    expect(abilityLabel("desconocida")).toBe("desconocida");
  });
});

import { ROLE_BLURB } from "./roles.js";
describe("roles en español", () => {
  it("cada rol del MVP tiene su descripción", () => {
    expect(Object.keys(ROLE_BLURB)).toHaveLength(30);
    expect(Object.values(ROLE_BLURB).every((t) => t.length > 10)).toBe(true);
  });
});
