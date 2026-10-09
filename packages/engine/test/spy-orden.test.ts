import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Spy: orden aleatorio de las visitas de la Mafia (wiki: docs/roles/Spy.md:179): "You will receive the amount of Mafia
// and/or Coven who visit certain people each Night. The order is randomized."

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice: null }) as const;

/** p1 Godfather visita a p5; p2 Janitor visita a p4 (dos visitas de la Mafia); p3 Spy espía a p6. */
function mafiaVisitsResult(seed: number): string | undefined {
  let s = game(["godfather", "janitor", "spy", "investigator", "investigator", "investigator"]);
  for (const a of [night("p1", "kill", "p5"), night("p2", "clean", "p4"), night("p3", "bug", "p6")]) s = step(s, a).state;
  const { events } = step(s, timer(), seed);
  return ofType(events, "investigation.result").find((e) => e.payload.investigatorId === "p3" && e.payload.check === "mafiaVisits")?.payload.result;
}

describe("Spy: el orden de las visitas de la Mafia es aleatorio (wiki: Spy.md:179)", () => {
  it("con dos visitas, ambos órdenes aparecen según la semilla", () => {
    const seen = new Set<string | undefined>();
    for (let seed = 1; seed <= 30; seed++) seen.add(mafiaVisitsResult(seed));
    expect(seen).toEqual(new Set(["P4, P5", "P5, P4"]));
  });

  it("el orden depende solo de la semilla: la misma semilla da el mismo resultado", () => {
    for (let seed = 1; seed <= 5; seed++) expect(mafiaVisitsResult(seed)).toBe(mafiaVisitsResult(seed));
  });
});
