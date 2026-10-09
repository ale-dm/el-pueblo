import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Godfather.md:233): "Receive a message if the target has defense or was Jailed. Note that if the Mafioso
// does the attacking, the Godfather will not receive said message for ordering an attack on the target in question."
// Texto del aviso de defensa: docs/wiki/Messages_ToS.md:383 ("Your target's defense was too strong to kill.").
const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

/** Avisos privados de la noche: [a quién, qué aviso]. */
const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

/** Cierra la noche tras las acciones dadas. */
function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Godfather: aviso al ordenar un ataque (wiki: Godfather.md:233)", () => {
  it("el Godfather que ataca sin Mafioso recibe aviso si el objetivo estaba curado", () => {
    // p1 Godfather, p2 Investigator, p3 Doctor cura a p2.
    const { events } = resolve(game(["godfather", "investigator", "doctor"]), [night("p1", "kill", "p2"), night("p3", "heal", "p2")]);
    expect(notices(events)).toContainEqual(["p1", "godfather_target_defense"]);
    expect(notices(events)).toContainEqual(["p2", "healed"]);
  });

  it("el Godfather que ataca sin Mafioso recibe aviso si el objetivo estaba en alerta (Veteran)", () => {
    // p1 Godfather, p2 Veteran en alerta (defensa Basic).
    const { events } = resolve(game(["godfather", "veteran"]), [night("p1", "kill", "p2"), night("p2", "alert", null)]);
    expect(notices(events)).toContainEqual(["p1", "godfather_target_defense"]);
  });

  it("el Mafioso ejecuta la orden del Godfather: el Godfather no recibe el aviso de defensa", () => {
    // p1 Godfather ordena, p2 Mafioso mata, p3 Investigator (curado por p4 Doctor).
    const { events } = resolve(game(["godfather", "mafioso", "investigator", "doctor"]), [night("p1", "kill", "p3"), night("p4", "heal", "p3")]);
    expect(notices(events)).toContainEqual(["p3", "healed"]);
    expect(notices(events).filter(([, n]) => n === "godfather_target_defense")).toEqual([]);
  });

  it("el Godfather que ataca a un objetivo encarcelado recibe el aviso de la cárcel (Messages_ToS.md:1727)", () => {
    // p1 Godfather, p2 Jailor encarcela a p3 Investigator.
    const s = game(["godfather", "jailor", "investigator"], { dayNumber: 2, jailedBy: { p3: "p2" } });
    const { events } = resolve(s, [night("p1", "kill", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "target_jailed"]);
    expect(notices(events).filter(([, n]) => n === "godfather_target_defense")).toEqual([]);
  });

  it("sin defensa, el ataque del Godfather mata y no hay aviso", () => {
    const { events, state } = resolve(game(["godfather", "investigator"]), [night("p1", "kill", "p2")]);
    expect(state.players[1]!.status).toBe("dead");
    expect(notices(events).filter(([, n]) => n === "godfather_target_defense")).toEqual([]);
  });
});
