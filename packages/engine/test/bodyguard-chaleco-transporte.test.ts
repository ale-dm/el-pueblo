import { describe, expect, it } from "vitest";
import { game, step, timer } from "./helpers/game.js";

// Chaleco del Bodyguard y transportes (wiki: Bodyguard.md:248; Bodyguard.md:11; Transporter.md:212, 234).
const bodyguard = (ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId: "p1", ability, targetId, secondTargetId: null, choice: null }) as const;
const transport = (a: string, b: string) =>
  ({ type: "night.action", actorId: "p2", ability: "transport", targetId: a, secondTargetId: b, choice: null }) as const;

/** Usos del chaleco que le quedan al Bodyguard p1 tras resolver la noche. */
const vestLeft = (s: ReturnType<typeof step>["state"]) => s.players.find((p) => p.id === "p1")!.usesLeft.vest;

describe("Bodyguard: transportado a sí mismo no gasta el chaleco (wiki: Bodyguard.md:248)", () => {
  it("si el Transporter lleva la visita del Bodyguard a su propia casa, el chaleco no se gasta (Bodyguard.md:248; Transporter.md:212)", () => {
    // p1 Bodyguard protege a p3; el Transporter intercambia p3 con p1: la visita del Bodyguard acaba en su propia casa.
    const s = game(["bodyguard", "transporter", "investigator"], { dayNumber: 2 });
    const resolved = step(step(step(s, bodyguard("protect", "p3")).state, transport("p3", "p1")).state, timer()).state;
    expect(vestLeft(resolved)).toBe(1);
  });

  it("el chaleco que el Bodyguard eligió se gasta igual aunque lo transporten (Bodyguard.md:11; Transporter.md:234)", () => {
    const s = game(["bodyguard", "transporter", "investigator"], { dayNumber: 2 });
    const resolved = step(step(step(s, bodyguard("vest", null)).state, transport("p1", "p3")).state, timer()).state;
    expect(vestLeft(resolved)).toBe(0);
  });

  it("sin transporte, elegir el chaleco lo gasta (Bodyguard.md:240)", () => {
    const s = game(["bodyguard", "transporter", "investigator"], { dayNumber: 2 });
    const resolved = step(step(s, bodyguard("vest", null)).state, timer()).state;
    expect(vestLeft(resolved)).toBe(0);
  });
});
