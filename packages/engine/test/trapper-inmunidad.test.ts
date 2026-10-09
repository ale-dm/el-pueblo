import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

describe("Trapper: ignora la inmunidad a la detección (wiki: Trapper.md:39, 101; Godfather.md:245)", () => {
  it("el Godfather visitante aparece con su rol real en la activación: el Trapper no se deja engañar por la inmunidad", () => {
    // Wiki (Trapper.md:221): la trampa muestra el rol real. Godfather.md:245: "Detection Immunity" (solo ante el Sheriff).
    const s = game(["trapper", "investigator", "godfather", "sheriff"], { dayNumber: 2, traps: { p1: { targetId: "p4", readyDay: 2 } } });
    const { events } = step(step(s, night("p3", "kill", "p4")).state, timer());
    expect(ofType(events, "trap.triggered").map((e) => e.payload.roles)).toEqual([["godfather"]]);
  });

  it("la trampa puede colocarse sobre un Godfather, que tiene inmunidad a la detección, y se activa al visitarle", () => {
    // Wiki (Trapper.md:39, 101): el Trapper ignora la inmunidad a la detección; no hay restricción sobre el objetivo.
    const s = game(["trapper", "godfather", "investigator", "sheriff"], { dayNumber: 2, traps: { p1: { targetId: null, readyDay: 2 } } });
    expect(rejected(s, night("p1", "trap", "p2"))).toBeNull();
    const placed = step(step(s, night("p1", "trap", "p2")).state, timer()).state;
    expect(placed.traps["p1"]).toEqual({ targetId: "p2", readyDay: 3 });
    const next = { ...placed, phase: "night" as const, dayNumber: 3 };
    const { events } = step(step(next, night("p3", "investigate", "p2")).state, timer());
    expect(ofType(events, "trap.triggered").map((e) => e.payload.roles)).toEqual([["investigator"]]);
  });
});
