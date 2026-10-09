import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Wiki (docs/roles/Hypnotist.md:226): "A Spy who bugs your target will receive the message you planted."
// Wiki (docs/roles/Spy.md:191): "Spies who Bug a Hypnotist's target will see the false messages the Hypnotist sends to a player."
const night = (actorId: string, ability: string, targetId: string | null, choice: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice }) as const;

/** Resultados del espionaje: [quién espía, objetivo, claves]. */
const spyResults = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "investigation.result")
    .filter((e) => e.payload.check === "bug")
    .map((e) => [e.payload.investigatorId, e.payload.targetId, e.payload.result]);

function resolve(state: ReturnType<typeof game>, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Spy que espía a un objetivo de la Hypnotist (wiki: Hypnotist.md:226; Spy.md:191)", () => {
  it("ve el mensaje falso que recibe el objetivo: 'You were attacked but someone nursed you back to health!'", () => {
    // p1 Hypnotist, p2 Spy, p3 Investigator (objetivo de la Hypnotist y del Spy).
    const s = game(["hypnotist", "spy", "investigator"]);
    const { events } = resolve(s, [night("p1", "hypnotize", "p3", "attacked"), night("p2", "bug", "p3")]);
    expect(ofType(events, "hypnosis.message").map((e) => [e.payload.playerId, e.payload.message])).toEqual([["p3", "attacked"]]);
    expect(spyResults(events)).toEqual([["p2", "p3", "hypno_attacked"]]);
  });

  it("ve el mensaje de inmunidad si el objetivo es inmune al bloqueo (Hypnotist.md:262)", () => {
    // p3 Veteran es inmune al bloqueo: el Spy ve el mensaje de inmunidad, el que de verdad recibe.
    const s = game(["hypnotist", "spy", "veteran"]);
    const { events } = resolve(s, [night("p1", "hypnotize", "p3", "roleblocked"), night("p2", "bug", "p3")]);
    expect(spyResults(events)).toEqual([["p2", "p3", "hypno_roleblock_immune"]]);
  });

  it("sin mensaje de la Hypnotist, el Spy no ve nada extra", () => {
    const s = game(["hypnotist", "spy", "investigator"]);
    const { events } = resolve(s, [night("p2", "bug", "p3")]);
    expect(spyResults(events)).toEqual([["p2", "p3", "nada"]]);
  });
});
