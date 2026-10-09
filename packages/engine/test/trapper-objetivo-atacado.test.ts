import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Trampa solo cuando el objetivo es atacado (wiki: docs/roles/Trapper.md:223):
// "If your target is attacked, your Trap will additionally deal a Powerful Attack to one attacker visiting them
//  (including Vigilantes and Vampire Hunters), and will defend against one direct attack."

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

const trapOn = (targetId: string) => ({ p1: { targetId, readyDay: 2 } });

const run = (roles: string[], traps: ReturnType<typeof trapOn>, actions: ReturnType<typeof night>[]) => {
  let s = game(roles, { dayNumber: 2, traps });
  for (const a of actions) s = step(s, a).state;
  return step(s, timer()).events;
};

describe("Trapper: la trampa hiere al atacante solo si el objetivo es atacado (wiki: Trapper.md:223)", () => {
  it("si nadie ataca al objetivo, el visitante atacante no recibe el Poderoso ni la trampa lo defiende", () => {
    // p4 Crusader protege a p3 (trampa de p1) y, al visitarle, ataca a un visitante de p3 (p2), no a p3.
    // Wiki (Trapper.md:223): el objetivo no es atacado, así que el Crusader no es herido por la trampa.
    const events = run(
      ["trapper", "investigator", "investigator", "crusader", "godfather"],
      trapOn("p3"),
      [night("p2", "investigate", "p3"), night("p4", "protect", "p3")],
    );
    expect(ofType(events, "trap.triggered")[0]?.payload).toMatchObject({ trapperId: "p1", attacked: false });
    expect(ofType(events, "player.killed").filter((e) => e.payload.cause === "trap")).toEqual([]);
    expect(ofType(events, "night.notice").some((e) => e.payload.playerId === "p4" && e.payload.notice === "trap_triggered")).toBe(false);
  });

  it("si la Mafia ataca al objetivo, la trampa hiere a su atacante y el objetivo sobrevive", () => {
    // Wiki (Trapper.md:223): el objetivo p2 es atacado por el Godfather (p3); la trampa le da Poderoso a p3.
    const events = run(
      ["trapper", "investigator", "godfather", "investigator"],
      trapOn("p2"),
      [night("p3", "kill", "p2")],
    );
    expect(ofType(events, "trap.triggered")[0]?.payload).toMatchObject({ trapperId: "p1", attacked: true });
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p3", "trap"]]);
    expect(ofType(events, "night.notice").some((e) => e.payload.playerId === "p3" && e.payload.notice === "trap_triggered")).toBe(true);
  });

  it("un ataque prevenido cuenta como ataque al objetivo: la trampa igual hiere al atacante (decisión, ver ROLES_STATUS)", () => {
    // p2 Doctor cura a p3 (objetivo); el Godfather (p4) lo ataca. El ataque se previene, pero el objetivo fue atacado.
    const events = run(
      ["trapper", "doctor", "investigator", "godfather"],
      trapOn("p3"),
      [night("p2", "heal", "p3"), night("p4", "kill", "p3")],
    );
    expect(ofType(events, "trap.triggered")[0]?.payload).toMatchObject({ trapperId: "p1", attacked: true });
    expect(ofType(events, "night.notice").some((e) => e.payload.playerId === "p4" && e.payload.notice === "trap_triggered")).toBe(true);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).not.toContain("p3");
  });
});
