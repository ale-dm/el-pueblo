import { describe, expect, it } from "vitest";
import { game, rejected } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Retributionist.md:236): "A Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter, or another
// Retributionist (if you were an Amnesiac) cannot be resurrected." Amnesiac no es MVP: sin excepción.
// p1 Retributionist vivo, p2 muerto (rol de la prueba), p3 Godfather vivo (segundo objetivo).
const raise = { type: "night.action", actorId: "p1", ability: "raise", targetId: "p2", secondTargetId: "p3", choice: null } as const;

function withDead(deadRole: string): GameState {
  const s = game(["retributionist", deadRole, "godfather", "investigator"]);
  s.players[1] = { ...s.players[1]!, status: "dead" };
  return s;
}

describe("Retributionist: roles que no se resucitan (wiki: Retributionist.md:236)", () => {
  it.each([
    ["psychic"],
    ["trapper"],
    ["jailor"],
    ["veteran"],
    ["mayor"],
    ["medium"],
    ["transporter"],
  ])("no resucita a un %s muerto", (role) => {
    expect(rejected(withDead(role), raise)).toMatch(/no puede ser resucitado/);
  });

  it("no resucita a otro Retributionist muerto (sin Amnesiac, que no es MVP)", () => {
    expect(rejected(withDead("retributionist"), raise)).toMatch(/no puede ser resucitado/);
  });

  it("sí resucita a un Town muerto que no está en la lista (Doctor)", () => {
    expect(rejected(withDead("doctor"), raise)).toBeNull();
  });
});
