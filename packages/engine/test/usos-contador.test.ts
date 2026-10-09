import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Doctor.md:399): "You have (#) self heal(s) left."
// Wiki (docs/roles/Jailor.md:546): "You have (#) execution(s) left."
// Wiki (docs/roles/Forger.md:488): "You have (#) forger(y / ies) left."
// Wiki (docs/roles/Janitor.md:390): "You have (#) cleaning(s) left."

const night = (actorId: string, ability: string, targetId: string | null, choice: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice }) as const;

const usesLeft = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "uses.left").map((e) => [e.audiencePlayerId, e.payload.ability, e.payload.left]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Contadores de usos de cada habilidad (wiki: Doctor, Jailor, Forger, Janitor)", () => {
  it("el Doctor que se autocura ve sus autocuraciones restantes (Doctor.md:399)", () => {
    const { events } = resolve(game(["doctor", "godfather"]), [night("p1", "selfHeal", null)]);
    expect(usesLeft(events)).toEqual([["p1", "selfHeal", 0]]);
    expect(ofType(events, "uses.left")[0]!.visibility).toBe("private");
  });

  it("el Jailor que ejecuta ve sus ejecuciones restantes (Jailor.md:546)", () => {
    // p1 Jailor encarcela a p3 y lo ejecuta esta noche (dayNumber 2: ya puede ejecutar).
    const s = game(["jailor", "godfather", "investigator"], { dayNumber: 2, jailedBy: { p3: "p1" } });
    s.players[2] = { ...s.players[2]!, flags: { jailed: true } };
    const { events } = resolve(s, [night("p1", "execute", "p3")]);
    expect(usesLeft(events)).toEqual([["p1", "execute", 2]]);
  });

  it("el Forger que falsifica un testamento ve sus falsificaciones restantes (Forger.md:488)", () => {
    const { events } = resolve(game(["forger", "investigator", "godfather"]), [night("p1", "forge", "p2", "ambusher")]);
    expect(usesLeft(events)).toEqual([["p1", "forge", 1]]);
  });

  it("el Janitor que limpia ve sus limpiezas restantes (Janitor.md:390)", () => {
    const { events } = resolve(game(["janitor", "investigator", "godfather"]), [night("p1", "clean", "p2")]);
    expect(usesLeft(events)).toEqual([["p1", "clean", 2]]);
  });

  it("quien no gasta un uso no recibe el contador (el Doctor que cura a otro)", () => {
    const { events } = resolve(game(["doctor", "investigator", "godfather"]), [night("p1", "heal", "p2")]);
    expect(usesLeft(events)).toEqual([]);
  });
});
