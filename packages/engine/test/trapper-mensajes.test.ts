import { describe, expect, it } from "vitest";
import { canSee } from "../src/projection/visibility.js";
import { game, ofType, step, timer } from "./helpers/game.js";

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

/** Empieza la noche desde la votación (sin juicios): el Trapper recibe el estado de su trampa (Trapper.md:346). */
const startNight = (s: ReturnType<typeof game>) => step(s, timer());

describe("Trapper: estado de la trampa al empezar la noche (wiki: Trapper.md:340-346)", () => {
  it("sin trampa, al empezar la noche se está construyendo: \"You are building your trap.\"", () => {
    const s = game(["trapper", "investigator"], { phase: "voting", dayNumber: 1 });
    const { events } = startNight(s);
    const status = ofType(events, "trap.status");
    expect(status.map((e) => e.payload)).toEqual([{ trapperId: "p1", status: "building" }]);
  });

  it("con la trampa construida la noche anterior: \"Your trap is ready to be placed.\"", () => {
    const s = game(["trapper", "investigator"], { phase: "voting", dayNumber: 2, traps: { p1: { targetId: null, readyDay: 2 } } });
    expect(ofType(startNight(s).events, "trap.status").map((e) => e.payload.status)).toEqual(["ready"]);
  });

  it("con la trampa puesta: \"Your trap is set.\"", () => {
    const s = game(["trapper", "investigator"], { phase: "voting", dayNumber: 2, traps: { p1: { targetId: "p2", readyDay: 2 } } });
    expect(ofType(startNight(s).events, "trap.status").map((e) => e.payload.status)).toEqual(["set"]);
  });

  it("el estado solo lo ve el Trapper (evento privado) y solo si está vivo", () => {
    const s = game(["trapper", "investigator"], { phase: "voting", dayNumber: 1 });
    const [ev] = ofType(startNight(s).events, "trap.status");
    expect(ev!.visibility).toBe("private");
    expect(ev!.audiencePlayerId).toBe("p1");
    expect(canSee(ev!, s.players[1]!)).toBe(false);

    const dead = game(["trapper", "investigator"], { phase: "voting", dayNumber: 1 });
    dead.players[0] = { ...dead.players[0]!, status: "dead", deathReason: "x" };
    expect(ofType(startNight(dead).events, "trap.status")).toEqual([]);
  });
});

describe("Trapper: avisos al atacante y al objetivo protegido (wiki: Trapper.md:348, 352)", () => {
  // p1 Trapper con trampa lista sobre p2. p3 Godfather ataca a p2 y la trampa lo hiere.
  const trapped = () => game(["trapper", "investigator", "godfather", "sheriff"], { dayNumber: 2, traps: { p1: { targetId: "p2", readyDay: 2 } } });

  it("el atacante herido recibe \"You triggered a trap!\" y el objetivo protegido \"You were attacked but a trap saved you!\"", () => {
    const resolved = step(step(trapped(), night("p3", "kill", "p2")).state, timer()).events;
    const notices = ofType(resolved, "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);
    expect(notices).toEqual(expect.arrayContaining([["p3", "trap_triggered"], ["p2", "trap_saved"]]));
  });

  it("sin ataque no hay avisos de trampa", () => {
    const resolved = step(step(trapped(), night("p4", "interrogate", "p2")).state, timer()).events;
    expect(ofType(resolved, "night.notice").filter((e) => e.payload.notice.startsWith("trap_"))).toEqual([]);
  });
});
