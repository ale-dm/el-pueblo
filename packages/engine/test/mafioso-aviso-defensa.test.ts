import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Mafioso.md:235): "Receive a message if the target has defense or was jailed. Note that if the Mafioso
// does the attacking, the Godfather will not receive said message for ordering an attack on the target in question."
// Igual en docs/roles/Godfather.md:233. Texto: docs/wiki/Messages_ToS.md:383 ("Your target's defense was too strong to kill.").

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice: null }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Mafioso que ejecuta la orden: aviso de defensa (wiki: Mafioso.md:235; Godfather.md:233)", () => {
  it("el Mafioso que ejecuta la orden recibe el aviso si su objetivo está en alerta (defensa Basic)", () => {
    // p1 Godfather ordena a p3; p2 Mafioso ejecuta; p3 Veteran en alerta.
    const { events, state } = resolve(game(["godfather", "mafioso", "veteran"]), [night("p1", "kill", "p3"), night("p3", "alert", null)]);
    expect(state.players[2]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p2", "target_defense"]);
    expect(notices(events).some(([who, n]) => who === "p1" && (n === "target_defense" || n === "godfather_target_defense"))).toBe(false);
  });

  it("el Mafioso que ataca sin orden del Godfather también lo recibe", () => {
    // Sin Godfather: p1 Mafioso ataca a p3 con su propia decisión; p2 Doctor cura a p3 (defensa Powerful).
    const { events } = resolve(game(["mafioso", "doctor", "investigator"]), [night("p1", "kill", "p3"), night("p2", "heal", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "target_defense"]);
  });

  it("el Godfather que ataca él mismo sigue recibiendo su aviso propio, no el del Mafioso", () => {
    // p1 Godfather ataca a p2 (Veteran en alerta, defensa Basic).
    const { events } = resolve(game(["godfather", "veteran", "investigator"]), [night("p1", "kill", "p2"), night("p2", "alert", null)]);
    expect(notices(events)).toContainEqual(["p1", "godfather_target_defense"]);
    expect(notices(events).some(([, n]) => n === "target_defense")).toBe(false);
  });

  it("si el ataque mata, el Mafioso no recibe el aviso de defensa", () => {
    const { events, state } = resolve(game(["godfather", "mafioso", "investigator"]), [night("p1", "kill", "p3")]);
    expect(state.players[2]!.status).toBe("dead");
    expect(notices(events).some(([, n]) => n === "target_defense")).toBe(false);
  });

  it("el Godfather no lo recibe cuando el Mafioso ejecuta su orden (Godfather.md:233)", () => {
    const { events } = resolve(game(["godfather", "mafioso", "veteran"]), [night("p1", "kill", "p3"), night("p3", "alert", null)]);
    expect(notices(events).some(([who]) => who === "p1")).toBe(false);
  });
});
