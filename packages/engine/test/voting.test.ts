import { describe, expect, it } from "vitest";
import { trialCandidate, tallyVotes, votesRequired } from "../src/rules/voting.js";

// Tabla de la wiki (Trial System): vivos → votos necesarios.
const WIKI_TABLE: Array<[number, number]> = [
  [15, 8], [14, 7], [13, 7], [12, 6], [11, 6], [10, 5], [9, 5], [8, 4], [7, 4], [6, 3], [5, 3], [4, 2], [3, 2],
];

describe("votesRequired", () => {
  it.each(WIKI_TABLE)("con %i vivos se necesitan %i votos (tabla de la wiki)", (alive, expected) => {
    expect(votesRequired(alive)).toBe(expected);
  });

  it("rechaza vivos no válidos", () => {
    expect(() => votesRequired(0)).toThrow(RangeError);
    expect(() => votesRequired(2.5)).toThrow(RangeError);
  });
});

describe("tallyVotes", () => {
  it("cuenta votos y descarta abstenciones", () => {
    const votes = new Map<string, string | null>([
      ["a", "x"], ["b", "x"], ["c", null], ["d", "y"],
    ]);
    expect(tallyVotes(votes)).toEqual(new Map([["x", 2], ["y", 1]]));
  });
});

describe("trialCandidate", () => {
  it("devuelve al acusado que alcanza el mínimo", () => {
    // 6 vivos → 3 votos. "x" recibe 3.
    const votes = new Map<string, string | null>([["a", "x"], ["b", "x"], ["c", "x"], ["d", "y"]]);
    expect(trialCandidate(votes, 6)).toBe("x");
  });

  it("no hay juicio si nadie llega al mínimo", () => {
    const votes = new Map<string, string | null>([["a", "x"], ["b", "x"]]);
    expect(trialCandidate(votes, 6)).toBeNull();
  });

  it("empate en el máximo = no hay juicio (supuesto, ver rules/voting.ts)", () => {
    const votes = new Map<string, string | null>([
      ["a", "x"], ["b", "x"], ["c", "y"], ["d", "y"],
    ]);
    expect(trialCandidate(votes, 4)).toBeNull();
  });

  it("sin votos no hay juicio", () => {
    expect(trialCandidate(new Map(), 5)).toBeNull();
  });
});
