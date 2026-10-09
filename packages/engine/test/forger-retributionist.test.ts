import { describe, expect, it } from "vitest";
import { game, rejected, step, timer } from "./helpers/game.js";

// Retributionist y cadáver falsificado (wiki: docs/roles/Forger.md:232; Retributionist.md:376).
// p1 Forger, p2 víctima (Investigator real), p3 Retributionist, p4 Godfather, p5 Sheriff, p6 Doctor.
const forge = (role: string) =>
  ({ type: "night.action", actorId: "p1", ability: "forge", targetId: "p2", secondTargetId: null, choice: role, forgedWill: null }) as const;
const kill = { type: "night.action", actorId: "p4", ability: "kill", targetId: "p2", secondTargetId: null, choice: null } as const;
const raise = { type: "night.action", actorId: "p3", ability: "raise", targetId: "p2", secondTargetId: "p6", choice: null } as const;

/** Noche 1: p1 falsifica a p2 con `role` y p4 lo mata. Devuelve la partida de la noche 2, de noche. */
function nightTwo(role: string | null) {
  let s = game(["forger", "investigator", "retributionist", "godfather", "sheriff", "doctor"]);
  if (role !== null) s = step(s, forge(role)).state;
  s = step(s, kill).state;
  s = step(s, timer()).state;
  return { ...s, phase: "night" as const, dayNumber: 2 };
}

describe("Retributionist y cadáver falsificado (wiki: Forger.md:232)", () => {
  it("sin falsificación, el Retributionist usa el cadáver Town de rol real (Retributionist.md:376)", () => {
    expect(rejected(nightTwo(null), raise)).toBeNull();
  });

  it("falsificado como Town visitante (Doctor), sí se puede usar (Forger.md:232)", () => {
    expect(rejected(nightTwo("doctor"), raise)).toBeNull();
  });

  it("falsificado como Town no visitante (Medium), aunque el rol real visite, no se puede usar (Forger.md:232)", () => {
    expect(rejected(nightTwo("medium"), raise)).toMatch(/resucitar/);
  });

  it("falsificado como Town no visitante (Mayor), no se puede usar (Forger.md:232)", () => {
    expect(rejected(nightTwo("mayor"), raise)).toMatch(/resucitar/);
  });

  it("falsificado como rol que no es Town (Ambusher), no se puede usar (Forger.md:232)", () => {
    expect(rejected(nightTwo("ambusher"), raise)).toMatch(/resucitar/);
  });
});
