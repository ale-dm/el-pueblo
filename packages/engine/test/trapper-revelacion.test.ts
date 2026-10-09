import { describe, expect, it } from "vitest";
import { canSee } from "../src/projection/visibility.js";
import { game, ofType, step, timer } from "./helpers/game.js";

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

// p1 Trapper con trampa lista sobre p3. Visitantes de p3: p2 Investigator, p4 Lookout (no atacan) y p5 Godfather (ataca).
const setup = (roles = ["trapper", "investigator", "sheriff", "lookout", "godfather"]) =>
  game(roles, { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } });

const resolve = (s: ReturnType<typeof setup>, actions: ReturnType<typeof night>[], seed = 1) => {
  let st = s;
  for (const a of actions) st = step(st, a, seed).state;
  return step(st, timer(), seed);
};

const triggered = (events: ReturnType<typeof resolve>["events"]) => ofType(events, "trap.triggered");

describe("Trapper: la activación revela el rol de cada visitante (wiki: Keyword_System.md:349, Trapper.md:219, 221)", () => {
  it("el Trapper recibe los roles de todos los visitantes, no solo de los atacantes, en orden de asiento", () => {
    const r = resolve(setup(), [night("p2", "investigate", "p3"), night("p4", "watch", "p3"), night("p5", "kill", "p3")]);
    const [ev] = triggered(r.events);
    expect(ev!.payload).toEqual({ trapperId: "p1", roles: ["investigator", "lookout", "godfather"], attacked: true });
  });

  it("el aviso es privado del Trapper: nadie más lo ve", () => {
    const r = resolve(setup(), [night("p2", "investigate", "p3"), night("p5", "kill", "p3")]);
    const [ev] = triggered(r.events);
    expect(ev!.visibility).toBe("private");
    expect(ev!.audiencePlayerId).toBe("p1");
    for (const viewer of r.state.players) expect(canSee(ev!, viewer)).toBe(viewer.id === "p1");
  });

  it("sin atacantes, la trampa se activa igualmente: revela los roles y no marca ataque (wiki: Trapper.md:219, 262)", () => {
    const r = resolve(setup(), [night("p2", "investigate", "p3"), night("p4", "watch", "p3")]);
    expect(triggered(r.events).map((e) => e.payload)).toEqual([{ trapperId: "p1", roles: ["investigator", "lookout"], attacked: false }]);
    expect(ofType(r.events, "player.killed")).toEqual([]);
  });

  it("el Trapper muerto sigue recibiendo los roles y su trampa se dispara (wiki: Trapper.md:260, 362)", () => {
    const s = setup();
    s.players[0] = { ...s.players[0]!, status: "dead", deathReason: "x" };
    const r = resolve(s, [night("p2", "investigate", "p3"), night("p5", "kill", "p3")]);
    const [ev] = triggered(r.events);
    expect(ev!.payload).toEqual({ trapperId: "p1", roles: ["investigator", "godfather"], attacked: true });
    expect(ev!.audiencePlayerId).toBe("p1");
    expect(ofType(r.events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p5", "trap"]]);
    expect(r.state.traps["p1"]).toBeUndefined();
  });
});
