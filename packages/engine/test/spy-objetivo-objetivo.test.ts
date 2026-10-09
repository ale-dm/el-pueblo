import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Spy.md:251): "Your target's target was attacked last night!"
// Wiki (docs/roles/Spy.md:481): "The "Your target's target was attacked last night!" message is unique to the Doctor and
// Crusader specifically. Receiving this result means your target is either one of these roles or a Witch/ Coven Leader..."
// Spy.md:257 ("A Bodyguard attacked your target but someone fought them off!") queda SKIPPED: la página no dice qué defensa
// produce "fought them off" (ver docs/ROLES_STATUS.md). Spy.md:295, 297, 301, 307 ("This confirms your target as ...") no
// dicen qué acción del objetivo lo revela: SKIPPED.

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice: null }) as const;

const spyResults = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "investigation.result")
    .filter((e) => e.payload.check === "bug")
    .map((e) => [e.payload.investigatorId, e.payload.targetId, e.payload.result]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Spy: 'Your target's target was attacked last night!' (wiki: Spy.md:251, 481)", () => {
  it("el Spy que espía a un Doctor recibe el mensaje si el Doctor curaba a alguien atacado", () => {
    // p1 Doctor cura a p3; p4 Godfather ataca a p3; p2 Spy espía a p1.
    const { events } = resolve(game(["doctor", "spy", "investigator", "godfather"]), [night("p1", "heal", "p3"), night("p2", "bug", "p1"), night("p4", "kill", "p3")]);
    expect(spyResults(events)).toContainEqual(["p2", "p1", "target_target_attacked"]);
  });

  it("el Spy que espía a un Crusader recibe el mensaje si el Crusader protegía a alguien atacado", () => {
    // p1 Crusader protege a p3; p4 Godfather ataca a p3; p2 Spy espía a p1.
    const { events } = resolve(game(["crusader", "spy", "investigator", "godfather"]), [night("p1", "protect", "p3"), night("p2", "bug", "p1"), night("p4", "kill", "p3")]);
    expect(spyResults(events)).toContainEqual(["p2", "p1", "target_target_attacked"]);
  });

  it("el Doctor que cura a alguien no atacado no da el mensaje", () => {
    const { events } = resolve(game(["doctor", "spy", "investigator", "godfather"]), [night("p1", "heal", "p3"), night("p2", "bug", "p1")]);
    expect(spyResults(events)).toEqual([["p2", "p1", "nada"]]);
  });

  it("un objetivo que no es Doctor ni Crusader no recibe el mensaje, aunque alguien a quien protegió un Doctor sea atacado", () => {
    // p1 Investigator es el objetivo del Spy; el Doctor p3 cura a p4, que es atacado.
    const { events } = resolve(game(["investigator", "spy", "doctor", "investigator", "godfather"]), [night("p3", "heal", "p4"), night("p2", "bug", "p1"), night("p5", "kill", "p4")]);
    expect(spyResults(events)).toEqual([["p2", "p1", "nada"]]);
  });
});
