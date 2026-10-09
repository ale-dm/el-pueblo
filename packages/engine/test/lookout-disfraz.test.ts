import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Lookout y disfraces (wiki: docs/roles/Disguiser.md:207, 161, 215).
// :207 "This will cause Sheriffs, Investigators, Lookouts, and Spies to receive incorrect results."
// :161 "Your Disguised Mafia member will appear to be the other person to a Lookout."

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

const visitorsSeen = (events: ReturnType<typeof step>["events"], lookoutId: string) =>
  ofType(events, "investigation.result").filter((e) => e.payload.investigatorId === lookoutId).map((e) => e.payload.result);

describe("Lookout: el Mafioso disfrazado aparece como el otro (wiki: Disguiser.md:161)", () => {
  it("el Lookout ve al disfraz (p5) visitar a su objetivo, no al Mafioso real (p2)", () => {
    // p1 Lookout vigila a p4. p2 Mafioso ataca a p4. p3 Disguiser disfraza a p2 de p5.
    const s = game(["lookout", "mafioso", "disguiser", "investigator", "investigator"]);
    const { events } = step(
      [night("p1", "watch", "p4"), night("p2", "kill", "p4"), night("p3", "disguise", "p2", "p5")].reduce((st, a) => step(st, a).state, s),
      timer(),
    );
    expect(visitorsSeen(events, "p1")).toEqual(["P5"]);
  });

  it("control: sin disfraz, el Lookout ve al Mafioso real", () => {
    const s = game(["lookout", "mafioso", "disguiser", "investigator", "investigator"]);
    const { events } = step([night("p1", "watch", "p4"), night("p2", "kill", "p4")].reduce((st, a) => step(st, a).state, s), timer());
    expect(visitorsSeen(events, "p1")).toEqual(["P2"]);
  });

  it("el Disguiser que se disfraza a sí mismo: el Lookout que lo vigila ve a su disfraz visitarle; el que vigila al disfraz ve su nombre (Disguiser.md:215)", () => {
    // p2 Disguiser se disfraza de p4 (él mismo visita p2 y p4). p1 vigila a p2; p3 vigila a p4.
    const s = game(["lookout", "disguiser", "lookout", "investigator"]);
    const { events } = step(
      [night("p1", "watch", "p2"), night("p3", "watch", "p4"), night("p2", "disguise", "p2", "p4")].reduce((st, a) => step(st, a).state, s),
      timer(),
    );
    expect(visitorsSeen(events, "p1")).toEqual(["P4"]);
    expect(visitorsSeen(events, "p3")).toEqual(["P2"]);
  });
});
