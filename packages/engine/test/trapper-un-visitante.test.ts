import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

// p1 Trapper tiene la trampa en p3 (lista). p3 es el objetivo. Visitantes: p2 (Investigator), p4 (Lookout) y p5
// (Doctor), que no atacan. p6 Godfather y p7 Vigilante son atacantes; ambos pueden visitar a p3.
const setup = () => game(
  ["trapper", "investigator", "sheriff", "lookout", "doctor", "godfather", "vigilante"],
  { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } },
);
const NON_ATTACKERS = [night("p2", "investigate", "p3"), night("p4", "watch", "p3"), night("p5", "heal", "p3")];
const GODFATHER = night("p6", "kill", "p3");
const VIGILANTE = night("p7", "shoot", "p3");

/** Estado tras la noche con esas acciones, y los eventos del resolver de la noche. */
const resolve = (actions: ReturnType<typeof night>[], seed: number) => {
  let s = setup();
  for (const a of actions) s = step(s, a, seed).state;
  return step(s, timer(), seed);
};

/** Víctimas de la trampa en la partida con esa semilla. */
const trapVictims = (actions: ReturnType<typeof night>[], seed: number) =>
  ofType(resolve(actions, seed).events, "player.killed").filter((e) => e.payload.cause === "trap").map((e) => e.payload.playerId);

describe("Trapper: la trampa solo daña a atacantes (wiki: Keyword_System.md:349)", () => {
  it("con un solo atacante entre visitantes que no atacan, la trampa daña a ese atacante y a nadie más", () => {
    const r = resolve([...NON_ATTACKERS, GODFATHER], 1);
    const killed = ofType(r.events, "player.killed").map((e) => e.payload.playerId);
    expect(killed).toEqual(["p6"]);
    expect(ofType(r.events, "player.killed")[0]!.payload.cause).toBe("trap");
  });

  it("sin atacantes entre los visitantes, la trampa se activa y se gasta, pero no mata a nadie (wiki: Trapper.md:219, 262)", () => {
    const r = resolve(NON_ATTACKERS, 1);
    expect(ofType(r.events, "player.killed")).toEqual([]);
    expect(ofType(r.events, "trap.removed").map((e) => e.payload)).toEqual([{ trapperId: "p1", reason: "triggered" }]);
  });

  it("con dos atacantes, la trampa daña a uno solo, y es uno de ellos; el elegido es al azar", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const victims = trapVictims([...NON_ATTACKERS, GODFATHER, VIGILANTE], seed);
      expect(victims).toHaveLength(1);
      expect(["p6", "p7"]).toContain(victims[0]);
      seen.add(victims[0]!);
    }
    expect(seen.size).toBe(2);
  });

  it("la defensa Poderosa de la trampa vale solo contra el atacante herido: el otro atacante sí mata al objetivo (wiki: Keyword_System.md:349, Trapper.md:225)", () => {
    // Sin Doctor: su curación (poder 1) también frenaría al otro atacante y no probaría nada de la trampa.
    const actions = [night("p2", "investigate", "p3"), night("p4", "watch", "p3"), GODFATHER, VIGILANTE];
    for (let seed = 1; seed <= 20; seed++) {
      const r = resolve(actions, seed);
      const killed = ofType(r.events, "player.killed").map((e) => e.payload.playerId);
      expect(killed).toContain("p3");
    }
  });
});

describe("Trapper: el Framer no muere a la trampa (wiki: Framer.md:252)", () => {
  it("un Framer que visita al objetivo activa la trampa, pero no es atacante: no muere", () => {
    // Wiki (Framer.md:252): "Since Framers don't die to Traps". Framer tiene ataque "None" en el catálogo (Keyword_System.md:349).
    const s = game(["trapper", "framer", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } });
    const framed = step(s, { type: "night.action", actorId: "p2", ability: "frame", targetId: "p3", secondTargetId: null }).state;
    const { events } = step(framed, timer());
    expect(ofType(events, "trap.removed").map((e) => e.payload.reason)).toEqual(["triggered"]);
    expect(ofType(events, "player.killed").filter((e) => e.payload.cause === "trap")).toEqual([]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).not.toContain("p2");
  });
});
