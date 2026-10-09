import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Visita pasiva del Ambusher (wiki: docs/roles/Ambusher.md:232): "Your visit is passive, meaning you will not be attacked
// by any Bodyguards or Traps protecting the player you attack."
// La wiki también dice que la visita activa la trampa sin matar al Ambusher (Trapper.md:256; Ambusher.md:290).

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** p1 Trapper con trampa en p3 (lista); p2 Ambusher; p4 Godfather; p3 objetivo; p5 Investigator. */
const setup = () => game(
  ["trapper", "ambusher", "investigator", "godfather", "investigator"],
  { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } },
);

const run = (actions: ReturnType<typeof night>[], seed: number) => {
  let s = setup();
  for (const a of actions) s = step(s, a, seed).state;
  return step(s, timer(), seed).events;
};

describe("Ambusher: la visita pasiva no le hace daño la trampa (wiki: Ambusher.md:232)", () => {
  it("con el Godfather atacando al objetivo, la trampa siempre hiere al Godfather y nunca al Ambusher", () => {
    // p2 Ambusher visita p3 (su objetivo) y p4 Godfather también. Con dos visitantes atacantes, la trampa elige al azar.
    for (let seed = 1; seed <= 20; seed++) {
      const events = run([night("p2", "ambush", "p3"), night("p4", "kill", "p3")], seed);
      const trapVictims = ofType(events, "player.killed").filter((e) => e.payload.cause === "trap").map((e) => e.payload.playerId);
      expect(trapVictims, `semilla ${seed}`).toEqual(["p4"]);
    }
  });

  it("el Ambusher solo visita: activa la trampa (queda gastada) y no muere (wiki: Trapper.md:256; Ambusher.md:290)", () => {
    const events = run([night("p2", "ambush", "p3")], 1);
    expect(ofType(events, "trap.triggered")[0]?.payload).toMatchObject({ trapperId: "p1", attacked: false });
    expect(ofType(events, "trap.removed").map((e) => e.payload.reason)).toEqual(["triggered"]);
    expect(ofType(events, "player.killed").filter((e) => e.payload.cause === "trap")).toEqual([]);
  });
});
