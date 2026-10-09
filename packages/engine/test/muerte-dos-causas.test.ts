import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Wiki (docs/wiki/Messages_ToS.md:151, 154): "If you die from 2 causes, your cause of death message will change to the
// "also" version" y cada causa aparece por separado en el registro. El motor guarda todas las causas en `causes`
// (la primera es `cause`) y no cambia los efectos (Vigilante.md:362, 370).
const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

function resolve(state: ReturnType<typeof game>, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("muerte por dos asesinos: causas (wiki: Messages_ToS.md:151, 154)", () => {
  it("la Mafia y el Vigilante matan a la misma víctima: las dos causas, y la culpa del Vigilante no cambia", () => {
    // p1 Godfather y p2 Vigilante atacan a p3 Investigator (sin protección).
    const s = game(["godfather", "vigilante", "investigator"], { dayNumber: 2 });
    const { events, state } = resolve(s, [night("p1", "kill", "p3"), night("p2", "shoot", "p3")]);
    const killed = ofType(events, "player.killed").filter((e) => e.payload.playerId === "p3");
    expect(killed).toHaveLength(1);
    expect(killed[0]!.payload.causes).toHaveLength(2);
    expect(new Set(killed[0]!.payload.causes)).toEqual(new Set(["mafia", "shot"]));
    expect(killed[0]!.payload.cause).toBe(killed[0]!.payload.causes![0]);
    // Efectos sin cambio: el Vigilante queda culpable por matar a un Town (Vigilante.md:362).
    expect(state.players[2]!.status).toBe("dead");
    expect(state.players[1]!.flags.guilty).toBe(true);
  });

  it("una sola causa no lleva lista de causas", () => {
    const { events } = resolve(game(["godfather", "investigator"]), [night("p1", "kill", "p2")]);
    expect(ofType(events, "player.killed")[0]!.payload.causes).toBeUndefined();
  });
});
