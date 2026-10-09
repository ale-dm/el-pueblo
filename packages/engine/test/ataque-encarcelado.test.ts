import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/wiki/Messages_ToS.md:1731): "You could not attack your target because they were in jail." Se muestra a
// "a killing role that attacks a jailed target" (:1733). Quien hace la muerte lo recibe (Godfather.md:233; Mafioso.md:235).
// Distinto de Messages_ToS.md:1727 (general, para cualquier visitante), que sigue como "target_jailed".
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

describe("ataque a un encarcelado: aviso al que mata (wiki: Messages_ToS.md:1731, 1733)", () => {
  it("el Godfather que mata él mismo a un encarcelado recibe \"You could not attack your target because they were in jail.\" (Godfather.md:233)", () => {
    // p1 Godfather, p2 Jailor encarcela a p3 Investigator. Sin Mafioso.
    const s = game(["godfather", "jailor", "investigator"], { dayNumber: 2, jailedBy: { p3: "p2" } });
    const { events } = resolve(s, [night("p1", "kill", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "attack_jailed"]);
    expect(notices(events)).toContainEqual(["p3", "attack_attempt"]);
  });

  it("si el Mafioso ejecuta la orden, lo recibe el Mafioso y no el Godfather que ordena (Godfather.md:233)", () => {
    // p1 Godfather ordena a p4 (encarcelado por p3). p2 Mafioso ejecuta. p5 Sheriff visita al encarcelado.
    const s = game(["godfather", "mafioso", "jailor", "investigator", "sheriff"], { dayNumber: 2, jailedBy: { p4: "p3" } });
    const { events } = resolve(s, [night("p1", "kill", "p4"), night("p5", "interrogate", "p4")]);
    expect(notices(events)).toContainEqual(["p2", "attack_jailed"]);
    expect(notices(events)).not.toContainEqual(["p1", "attack_jailed"]);
  });

  it("el visitante genérico recibe solo \"Your ability failed because your target was in jail.\" (Messages_ToS.md:1727), no el de atacar", () => {
    const s = game(["godfather", "mafioso", "jailor", "investigator", "sheriff"], { dayNumber: 2, jailedBy: { p4: "p3" } });
    const { events } = resolve(s, [night("p1", "kill", "p4"), night("p5", "interrogate", "p4")]);
    expect(notices(events)).toContainEqual(["p5", "target_jailed"]);
    expect(notices(events).filter(([who, n]) => who === "p5" && n === "attack_jailed")).toEqual([]);
  });

  it("si el Mafioso está bloqueado, el Godfather ataca él mismo y lo recibe (Godfather.md:225, 233)", () => {
    // p5 Tavern Keeper bloquea al Mafioso p2, que tiene su propia acción (sobre p3); p1 Godfather ordena a p4 (encarcelado por p3).
    // Nota: un Mafioso bloqueado sin acción no entra en `acts`, y el motor no lo cuenta como bloqueado (ver ROLES_STATUS).
    const s = game(["godfather", "mafioso", "jailor", "investigator", "tavern_keeper"], { dayNumber: 2, jailedBy: { p4: "p3" } });
    const { events } = resolve(s, [night("p1", "kill", "p4"), night("p2", "kill", "p3"), night("p5", "distract", "p2")]);
    expect(notices(events)).toContainEqual(["p1", "attack_jailed"]);
    expect(notices(events).filter(([who, n]) => who === "p2" && n === "attack_jailed")).toEqual([]);
  });

  it("sin Godfather, el Mafioso que mata a un encarcelado lo recibe (Mafioso.md:235)", () => {
    const s = game(["mafioso", "jailor", "investigator"], { dayNumber: 2, jailedBy: { p3: "p2" } });
    const { events } = resolve(s, [night("p1", "kill", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "attack_jailed"]);
  });

  it("el Vigilante que dispara a un encarcelado lo recibe; el objetivo recibe \"attack_attempt\" (Vigilante.md:194)", () => {
    const s = game(["vigilante", "jailor", "investigator"], { dayNumber: 2, jailedBy: { p3: "p2" } });
    const { events } = resolve(s, [night("p1", "shoot", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "attack_jailed"]);
    expect(notices(events)).toContainEqual(["p3", "attack_attempt"]);
  });

  it("sin encarcelado, el ataque no produce el aviso", () => {
    const { events, state } = resolve(game(["godfather", "investigator"]), [night("p1", "kill", "p2")]);
    expect(state.players[1]!.status).toBe("dead");
    expect(notices(events).filter(([, n]) => n === "attack_jailed")).toEqual([]);
  });
});
