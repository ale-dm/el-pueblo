import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

// p1 Trapper tiene la trampa en p3 (lista). Visitan a p3: p2 (Investigator), p4 (Lookout) y p5 (Doctor).
// p6 Godfather no actúa. Ninguno de los visitantes tiene defensa, así que cada ataque Powerful mata.
const setup = () => game(
  ["trapper", "investigator", "sheriff", "lookout", "doctor", "godfather"],
  { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } },
);
const actions = [night("p2", "investigate", "p3"), night("p4", "watch", "p3"), night("p5", "heal", "p3")];
const VISITORS = ["p2", "p4", "p5"];

/** Víctimas de la trampa en la partida con esa semilla. */
const trapVictims = (seed: number) => {
  let s = setup();
  for (const a of actions) s = step(s, a, seed).state;
  return ofType(step(s, timer(), seed).events, "player.killed").filter((e) => e.payload.cause === "trap").map((e) => e.payload.playerId);
};

describe("Trapper: la trampa ataca a un solo visitante (wiki: Trapper.md:223)", () => {
  it("con tres visitantes, la trampa mata a uno solo, y es uno de ellos", () => {
    const victims = trapVictims(1);
    expect(victims).toHaveLength(1);
    expect(VISITORS).toContain(victims[0]);
  });

  it("el visitante es elegido al azar: con semillas distintas no siempre es el mismo", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) for (const v of trapVictims(seed)) seen.add(v);
    expect(seen.size).toBeGreaterThan(1);
    for (const v of seen) expect(VISITORS).toContain(v);
  });
});
